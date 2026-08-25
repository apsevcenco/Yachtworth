import { Feather } from "@expo/vector-icons";
import { useAuth } from "@clerk/expo";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../hooks/useColors";
import {
  createBrokerCase,
  getBrokerCases,
  getBrokerDashboard,
  getBrokerPipeline,
  importCharterClientsToBrokerOs,
  type BrokerCase,
  type BrokerDashboard,
} from "../lib/brokerOs";

type ViewMode = "overview" | "pipeline" | "cases";
type DueFilter = "all" | "overdue" | "today" | "no_action" | "stale";
type Draft = {
  title: string;
  contact_name: string;
  contact_email: string;
  case_type: string;
  lead_score: "A" | "B" | "C" | "D";
  budget_min_eur: string;
  budget_max_eur: string;
  loa_min_m: string;
  loa_max_m: string;
  timeline: string;
  preferred_regions: string;
  mandatory_requirements: string;
  next_action: string;
  next_action_due: string;
  expected_commission_eur: string;
  close_probability: string;
  risk_level: "low" | "medium" | "high";
  risk_reason: string;
};

const EMPTY_DRAFT: Draft = {
  title: "",
  contact_name: "",
  contact_email: "",
  case_type: "buyer_inquiry",
  lead_score: "B",
  budget_min_eur: "",
  budget_max_eur: "",
  loa_min_m: "",
  loa_max_m: "",
  timeline: "",
  preferred_regions: "",
  mandatory_requirements: "",
  next_action: "",
  next_action_due: "",
  expected_commission_eur: "",
  close_probability: "30",
  risk_level: "medium",
  risk_reason: "",
};

const CASE_TYPES = [
  ["buyer_inquiry", "Buyer"],
  ["seller_mandate", "Seller"],
  ["charter_inquiry", "Charter"],
  ["charter_central_agency", "Charter CA"],
  ["flag_registration", "Flag"],
  ["valuation", "Valuation"],
  ["survey", "Survey"],
  ["insurance", "Insurance"],
] as const;

const PIPELINE = [
  { key: "new_inquiry", label: "New inquiry" },
  { key: "qualified", label: "Qualified" },
  { key: "proposal", label: "Proposal" },
  { key: "negotiation", label: "Negotiation" },
  { key: "closing", label: "Closing" },
] as const;

const STAGE_FILTERS = ["all", "new_inquiry", "qualified", "proposal", "negotiation", "closing", "closed_won", "closed_lost"] as const;
const STATUS_FILTERS = ["all", "active", "paused", "won", "lost", "archived"] as const;
const LEAD_FILTERS = ["all", "A", "B", "C", "D"] as const;
const RISK_FILTERS = ["all", "low", "medium", "high"] as const;
const DUE_FILTERS: DueFilter[] = ["all", "overdue", "today", "no_action", "stale"];

function numberOrNull(v: string): number | null {
  if (!v.trim()) return null;
  const n = Number(v.replace(/[,\s]/g, ""));
  return Number.isFinite(n) ? n : null;
}

function money(n: number | null | undefined): string {
  if (n == null) return "-";
  return `EUR ${Math.round(n).toLocaleString("en-GB")}`;
}

function caseTypeLabel(type: string): string {
  return CASE_TYPES.find(([value]) => value === type)?.[1] ?? type.replace(/_/g, " ");
}

function daysLabel(v: string | null | undefined): string {
  if (!v) return "No due date";
  return v;
}

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function daysSince(v: string | null | undefined): number | null {
  if (!v) return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  return Math.max(0, Math.floor((Date.now() - d.getTime()) / 86400000));
}

function textHaystack(item: BrokerCase): string {
  return [
    item.title,
    item.owner_name,
    item.case_type,
    item.stage,
    item.status,
    item.timeline,
    item.next_action,
    item.risk_reason,
    item.notes,
    ...(item.preferred_regions ?? []),
    ...(item.mandatory_requirements ?? []),
    ...(item.preferred_requirements ?? []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export default function BrokerOsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const { colors, isAcid } = useTheme();
  const { isLoaded, isSignedIn } = useAuth();
  const [dashboard, setDashboard] = useState<BrokerDashboard | null>(null);
  const [pipeline, setPipeline] = useState<BrokerCase[]>([]);
  const [cases, setCases] = useState<BrokerCase[]>([]);
  const [mode, setMode] = useState<ViewMode>("overview");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [caseSearch, setCaseSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [stageFilter, setStageFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [leadFilter, setLeadFilter] = useState("all");
  const [riskFilter, setRiskFilter] = useState("all");
  const [dueFilter, setDueFilter] = useState<DueFilter>("all");

  const metrics = useMemo(() => {
    const t = dashboard?.today;
    return [
      { label: "Overdue", value: t?.overdue_followups ?? 0, icon: "clock" as const },
      { label: "Due today", value: t?.due_today ?? 0, icon: "bell" as const },
      { label: "Stale cases", value: t?.stale_cases ?? 0, icon: "alert-triangle" as const },
      { label: "Active cases", value: t?.active_cases ?? 0, icon: "briefcase" as const },
    ];
  }, [dashboard?.today]);

  const filterCase = useMemo(() => {
    const q = caseSearch.trim().toLowerCase();
    const today = todayIso();
    return (item: BrokerCase) => {
      if (q && !textHaystack(item).includes(q)) return false;
      if (typeFilter !== "all" && item.case_type !== typeFilter) return false;
      if (stageFilter !== "all" && item.stage !== stageFilter) return false;
      if (statusFilter !== "all" && item.status !== statusFilter) return false;
      if (leadFilter !== "all" && item.lead_score !== leadFilter) return false;
      if (riskFilter !== "all" && item.risk_level !== riskFilter) return false;
      if (dueFilter === "overdue" && !(item.next_action_due && item.next_action_due < today)) return false;
      if (dueFilter === "today" && item.next_action_due !== today) return false;
      if (dueFilter === "no_action" && item.next_action) return false;
      if (dueFilter === "stale" && !((daysSince(item.last_meaningful_contact_at) ?? 0) >= 7)) return false;
      return true;
    };
  }, [caseSearch, dueFilter, leadFilter, riskFilter, stageFilter, statusFilter, typeFilter]);

  const filteredPipeline = useMemo(() => pipeline.filter(filterCase), [filterCase, pipeline]);
  const filteredCases = useMemo(() => cases.filter(filterCase), [cases, filterCase]);

  async function load() {
    if (!isSignedIn) return;
    setLoading(true);
    setError(null);
    try {
      const [dash, pipe, allCases] = await Promise.all([
        getBrokerDashboard(),
        getBrokerPipeline(),
        getBrokerCases(),
      ]);
      setDashboard(dash);
      setPipeline(pipe.items);
      setCases(allCases.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      setLoading(false);
      return;
    }
    load().catch(() => {});
  }, [isLoaded, isSignedIn]);

  function openCase(id: string) {
    router.push({ pathname: "/broker-case-detail", params: { id } } as never);
  }

  async function saveCase() {
    if (!draft.title.trim()) {
      Alert.alert("Case title required", "Add a short title for this commercial situation.");
      return;
    }
    setSaving(true);
    try {
      const result = await createBrokerCase({
        title: draft.title.trim(),
        contact_name: draft.contact_name.trim() || null,
        contact_email: draft.contact_email.trim() || null,
        case_type: draft.case_type,
        lead_score: draft.lead_score,
        budget_min_eur: numberOrNull(draft.budget_min_eur),
        budget_max_eur: numberOrNull(draft.budget_max_eur),
        loa_min_m: numberOrNull(draft.loa_min_m),
        loa_max_m: numberOrNull(draft.loa_max_m),
        timeline: draft.timeline.trim() || null,
        preferred_regions: draft.preferred_regions,
        mandatory_requirements: draft.mandatory_requirements,
        next_action: draft.next_action.trim() || null,
        next_action_due: draft.next_action_due.trim() || null,
        expected_commission_eur: numberOrNull(draft.expected_commission_eur),
        close_probability: numberOrNull(draft.close_probability),
        risk_level: draft.risk_level,
        risk_reason: draft.risk_reason.trim() || null,
      });
      setDraft(EMPTY_DRAFT);
      setModalOpen(false);
      await load();
      openCase(result.item.id);
    } catch (err) {
      Alert.alert("Could not save case", err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  async function importClients() {
    try {
      const result = await importCharterClientsToBrokerOs();
      Alert.alert("Imported", `${result.imported} charter client${result.imported === 1 ? "" : "s"} linked to Broker OS.`);
      await load();
    } catch (err) {
      Alert.alert("Import failed", err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <View style={[styles.root, { paddingTop: (isWeb ? 62 : insets.top) + 64, backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 44 }, isWeb && styles.webScroll]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topbar}>
          <Pressable onPress={() => router.back()} style={[styles.iconButton, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
            <Feather name="arrow-left" size={22} color={colors.foreground} />
          </Pressable>
          <View style={styles.titleBlock}>
            <Text style={[styles.kicker, { color: colors.primary }, isAcid && styles.acidKicker]}>YACHTWORTH</Text>
            <Text style={[styles.title, { color: colors.foreground }, isAcid && styles.acidTitle]}>Broker OS</Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>First enquiry to closing, commission and follow-up control.</Text>
          </View>
        </View>

        {!isLoaded || loading ? (
          <CenterPanel title="Loading Broker OS" icon="loader" />
        ) : !isSignedIn ? (
          <CenterPanel title="Sign in required" icon="lock" />
        ) : error ? (
          <CenterPanel title="Could not load Broker OS" copy={error} icon="alert-circle" danger />
        ) : (
          <>
            <View style={styles.actions}>
              <Pressable onPress={() => setModalOpen(true)} style={[styles.primaryButton, { backgroundColor: colors.primary }]}>
                <Feather name="plus" size={18} color={colors.background} />
                <Text style={[styles.primaryText, { color: colors.background }]}>New Case</Text>
              </Pressable>
              <Pressable onPress={() => router.push("/crm" as never)} style={[styles.secondaryButton, { borderColor: colors.primary, backgroundColor: colors.glow ?? "transparent" }]}>
                <Feather name="users" size={16} color={colors.primary} />
                <Text style={[styles.secondaryText, { color: colors.primary }]}>Open CRM</Text>
              </Pressable>
              <Pressable onPress={importClients} style={[styles.secondaryButton, { borderColor: colors.primary, backgroundColor: colors.glow ?? "transparent" }]}>
                <Feather name="download" size={16} color={colors.primary} />
                <Text style={[styles.secondaryText, { color: colors.primary }]}>Import charter clients</Text>
              </Pressable>
            </View>

            <View style={styles.metricsGrid}>
              {metrics.map((m) => <Metric key={m.label} {...m} />)}
            </View>

            <View style={styles.tabs}>
              {(["overview", "pipeline", "cases"] as const).map((tab) => (
                <Pressable
                  key={tab}
                  onPress={() => setMode(tab)}
                  style={[
                    styles.tab,
                    { backgroundColor: colors.secondary, borderColor: mode === tab ? colors.primary : colors.border },
                    mode === tab && { backgroundColor: colors.glow ?? colors.secondary },
                  ]}
                >
                  <Text style={[styles.tabText, { color: mode === tab ? colors.primary : colors.mutedForeground }]}>{tab}</Text>
                </Pressable>
              ))}
            </View>

            <BrokerFilters
              search={caseSearch}
              setSearch={setCaseSearch}
              typeFilter={typeFilter}
              setTypeFilter={setTypeFilter}
              stageFilter={stageFilter}
              setStageFilter={setStageFilter}
              statusFilter={statusFilter}
              setStatusFilter={setStatusFilter}
              leadFilter={leadFilter}
              setLeadFilter={setLeadFilter}
              riskFilter={riskFilter}
              setRiskFilter={setRiskFilter}
              dueFilter={dueFilter}
              setDueFilter={setDueFilter}
              filteredCount={mode === "pipeline" ? filteredPipeline.length : filteredCases.length}
              totalCount={mode === "pipeline" ? pipeline.length : cases.length}
            />

            {mode === "overview" ? (
              <Overview dashboard={dashboard} openCase={openCase} />
            ) : mode === "pipeline" ? (
              <Pipeline cases={filteredPipeline} openCase={openCase} />
            ) : (
              <CaseList cases={filteredCases} openCase={openCase} />
            )}
          </>
        )}
      </ScrollView>
      <CaseModal
        visible={modalOpen}
        draft={draft}
        setDraft={setDraft}
        saving={saving}
        onClose={() => setModalOpen(false)}
        onSave={saveCase}
      />
    </View>
  );
}

function BrokerFilters(props: {
  search: string;
  setSearch: (v: string) => void;
  typeFilter: string;
  setTypeFilter: (v: string) => void;
  stageFilter: string;
  setStageFilter: (v: string) => void;
  statusFilter: string;
  setStatusFilter: (v: string) => void;
  leadFilter: string;
  setLeadFilter: (v: string) => void;
  riskFilter: string;
  setRiskFilter: (v: string) => void;
  dueFilter: DueFilter;
  setDueFilter: (v: DueFilter) => void;
  filteredCount: number;
  totalCount: number;
}) {
  const { colors } = useTheme();
  return (
    <View style={[styles.filterPanel, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.filterHeader}>
        <View style={[styles.searchBox, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
          <Feather name="search" size={17} color={colors.mutedForeground} />
          <TextInput
            value={props.search}
            onChangeText={props.setSearch}
            placeholder="Search cases, client, region, notes or next action"
            placeholderTextColor={colors.mutedForeground}
            style={[styles.searchInput, { color: colors.foreground }]}
          />
        </View>
        <Text style={[styles.filterCount, { color: colors.primary, backgroundColor: colors.glow ?? colors.secondary }]}>
          {props.filteredCount}/{props.totalCount}
        </Text>
      </View>
      <FilterLine label="Type">
        <ChipRow
          items={["all", ...CASE_TYPES.map(([value]) => value)]}
          active={props.typeFilter}
          onChange={props.setTypeFilter}
        />
      </FilterLine>
      <FilterLine label="Stage">
        <ChipRow items={STAGE_FILTERS} active={props.stageFilter} onChange={props.setStageFilter} />
      </FilterLine>
      <FilterLine label="Status">
        <ChipRow items={STATUS_FILTERS} active={props.statusFilter} onChange={props.setStatusFilter} />
      </FilterLine>
      <FilterLine label="Lead">
        <ChipRow items={LEAD_FILTERS} active={props.leadFilter} onChange={props.setLeadFilter} />
      </FilterLine>
      <FilterLine label="Risk">
        <ChipRow items={RISK_FILTERS} active={props.riskFilter} onChange={props.setRiskFilter} />
      </FilterLine>
      <FilterLine label="Follow-up">
        <ChipRow items={DUE_FILTERS} active={props.dueFilter} onChange={props.setDueFilter} />
      </FilterLine>
    </View>
  );
}

function FilterLine({ label, children }: { label: string; children: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={styles.filterLine}>
      <Text style={[styles.filterLabel, { color: colors.mutedForeground }]}>{label}</Text>
      <View style={{ flex: 1 }}>{children}</View>
    </View>
  );
}

function Overview({ dashboard, openCase }: { dashboard: BrokerDashboard | null; openCase: (id: string) => void }) {
  const { colors } = useTheme();
  const highRisk = (dashboard?.priority_cases ?? []).filter((item) => item.risk_level === "high").slice(0, 4);
  const stale = (dashboard?.priority_cases ?? []).filter((item) => (item.days_since_contact ?? 0) >= 7).slice(0, 4);
  return (
    <View style={styles.overviewGrid}>
      <View style={[styles.panel, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.panelTitle, { color: colors.foreground }]}>Priority Cases</Text>
        {dashboard?.priority_cases.length ? dashboard.priority_cases.map((item) => <CaseCard key={item.id} item={item} onPress={() => openCase(item.id)} />) : <EmptyBlock title="No active cases yet" copy="Create the first buyer, seller or charter case to start the broker workflow." />}
      </View>
      <View style={styles.sideColumn}>
        <View style={[styles.panel, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.panelTitle, { color: colors.foreground }]}>Revenue Forecast</Text>
          <View style={styles.forecastRow}>
            <Fact label="Expected" value={money(dashboard?.forecast.expected_commission_eur)} />
            <Fact label="Weighted" value={money(dashboard?.forecast.weighted_commission_eur)} />
          </View>
        </View>
        <View style={[styles.panel, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.panelTitle, { color: colors.foreground }]}>Today</Text>
          {dashboard?.tasks.length ? dashboard.tasks.map((task) => (
            <Pressable
              key={task.id}
              onPress={() => task.case_id && openCase(task.case_id)}
              disabled={!task.case_id}
              style={[styles.taskRow, { borderBottomColor: colors.border }]}
            >
              <Feather name="check-circle" size={15} color={colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.taskTitle, { color: colors.foreground }]}>{task.title}</Text>
                <Text style={[styles.taskMeta, { color: colors.mutedForeground }]}>{daysLabel(task.due_date)} / {task.priority}</Text>
              </View>
              {task.case_id ? <Feather name="arrow-up-right" size={15} color={colors.primary} /> : null}
            </Pressable>
          )) : <EmptyBlock title="No urgent follow-ups" copy="Tasks appear here when a case has a next action due." />}
        </View>
        <View style={[styles.panel, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.panelTitle, { color: colors.foreground }]}>Risk Watch</Text>
          {highRisk.length ? highRisk.map((item) => <CaseMini key={item.id} item={item} onPress={() => openCase(item.id)} />) : <EmptyBlock title="No high-risk cases" copy="High-risk opportunities appear here for quick control." />}
        </View>
        <View style={[styles.panel, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.panelTitle, { color: colors.foreground }]}>Stale Cases</Text>
          {stale.length ? stale.map((item) => <CaseMini key={item.id} item={item} onPress={() => openCase(item.id)} />) : <EmptyBlock title="No stale cases" copy="Cases without meaningful contact for 7+ days appear here." />}
        </View>
      </View>
    </View>
  );
}

function CaseMini({ item, onPress }: { item: BrokerCase; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable onPress={onPress} style={[styles.miniCase, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
      <View style={{ flex: 1 }}>
        <Text style={[styles.taskTitle, { color: colors.foreground }]} numberOfLines={1}>{item.title}</Text>
        <Text style={[styles.taskMeta, { color: colors.mutedForeground }]}>
          {caseTypeLabel(item.case_type)} / {item.stage.replace(/_/g, " ")} / {item.days_since_contact ?? "-"}d
        </Text>
      </View>
      <Text style={[styles.riskText, { color: riskColor(item.risk_level) }]}>{item.risk_level}</Text>
    </Pressable>
  );
}

function Pipeline({ cases, openCase }: { cases: BrokerCase[]; openCase: (id: string) => void }) {
  const { colors } = useTheme();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pipeline}>
      {PIPELINE.map((stage) => {
        const items = cases.filter((item) => item.stage === stage.key);
        return (
          <View key={stage.key} style={[styles.pipelineColumn, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.pipelineHeader}>
              <Text style={[styles.panelTitle, { color: colors.foreground, marginBottom: 0 }]}>{stage.label}</Text>
              <Text style={[styles.countBadge, { color: colors.primary, backgroundColor: colors.glow ?? colors.secondary }]}>{items.length}</Text>
            </View>
            {items.length ? items.map((item) => <CaseCard key={item.id} compact item={item} onPress={() => openCase(item.id)} />) : <Text style={[styles.emptySmall, { color: colors.mutedForeground }]}>No cases</Text>}
          </View>
        );
      })}
    </ScrollView>
  );
}

function CaseList({ cases, openCase }: { cases: BrokerCase[]; openCase: (id: string) => void }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.panel, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[styles.panelTitle, { color: colors.foreground }]}>All Cases</Text>
      {cases.length ? cases.map((item) => <CaseCard key={item.id} item={item} onPress={() => openCase(item.id)} />) : <EmptyBlock title="No cases yet" copy="New commercial cases appear here." />}
    </View>
  );
}

function Metric({ label, value, icon }: { label: string; value: number; icon: keyof typeof Feather.glyphMap }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.metricCard, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
      <Feather name={icon} size={17} color={colors.primary} />
      <Text style={[styles.metricValue, { color: colors.foreground }]}>{value}</Text>
      <Text style={[styles.metricLabel, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}

function CaseCard({ item, onPress, compact }: { item: BrokerCase; onPress: () => void; compact?: boolean }) {
  const { colors } = useTheme();
  return (
    <Pressable onPress={onPress} style={[styles.caseCard, { backgroundColor: colors.secondary, borderColor: colors.border }, compact && styles.caseCardCompact]}>
      <View style={styles.caseTop}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.caseTitle, { color: colors.foreground }]} numberOfLines={2}>{item.title}</Text>
          <Text style={[styles.caseMeta, { color: colors.mutedForeground }]}>{caseTypeLabel(item.case_type)} / {item.stage.replace(/_/g, " ")} / Lead {item.lead_score}</Text>
        </View>
        <View style={[styles.riskBadge, { borderColor: riskColor(item.risk_level) }]}>
          <Text style={[styles.riskText, { color: riskColor(item.risk_level) }]}>{item.risk_level}</Text>
        </View>
      </View>
      <View style={styles.caseFacts}>
        <Text style={[styles.factPill, { color: colors.primary, backgroundColor: colors.glow ?? colors.card }]}>{item.loa_min_m ?? "?"}-{item.loa_max_m ?? "?"} m</Text>
        <Text style={[styles.factPill, { color: colors.primary, backgroundColor: colors.glow ?? colors.card }]}>{money(item.budget_min_eur)}-{money(item.budget_max_eur)}</Text>
        <Text style={[styles.factPill, { color: colors.primary, backgroundColor: colors.glow ?? colors.card }]}>{item.close_probability}% close</Text>
      </View>
      {item.next_action ? <Text style={[styles.nextAction, { color: colors.foreground }]}>Next: {item.next_action}</Text> : null}
    </Pressable>
  );
}

function CaseModal(props: { visible: boolean; draft: Draft; setDraft: React.Dispatch<React.SetStateAction<Draft>>; saving: boolean; onClose: () => void; onSave: () => void }) {
  const { colors } = useTheme();
  const isWeb = Platform.OS === "web";
  return (
    <Modal visible={props.visible} animationType="slide" transparent onRequestClose={props.onClose}>
      <View style={styles.modalBackdrop}>
        <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }, isWeb && styles.modalWeb]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>New commercial case</Text>
            <Pressable onPress={props.onClose} style={[styles.smallIcon, { backgroundColor: colors.secondary }]}>
              <Feather name="x" size={20} color={colors.foreground} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.modalScroll}>
            <Field label="Case title" value={props.draft.title} onChangeText={(v) => props.setDraft((d) => ({ ...d, title: v }))} placeholder="James Harrington - Buyer Search" />
            <ChipRow items={CASE_TYPES.map(([, label]) => label)} active={caseTypeLabel(props.draft.case_type)} onChange={(label) => {
              const found = CASE_TYPES.find(([, l]) => l === label);
              if (found) props.setDraft((d) => ({ ...d, case_type: found[0] }));
            }} />
            <View style={styles.twoCol}>
              <Field label="Contact name" value={props.draft.contact_name} onChangeText={(v) => props.setDraft((d) => ({ ...d, contact_name: v }))} />
              <Field label="Contact email" value={props.draft.contact_email} onChangeText={(v) => props.setDraft((d) => ({ ...d, contact_email: v }))} />
            </View>
            <ChipRow items={["A", "B", "C", "D"] as const} active={props.draft.lead_score} onChange={(lead_score) => props.setDraft((d) => ({ ...d, lead_score }))} />
            <View style={styles.twoCol}>
              <Field label="Budget min" value={props.draft.budget_min_eur} keyboardType="numeric" onChangeText={(v) => props.setDraft((d) => ({ ...d, budget_min_eur: v }))} />
              <Field label="Budget max" value={props.draft.budget_max_eur} keyboardType="numeric" onChangeText={(v) => props.setDraft((d) => ({ ...d, budget_max_eur: v }))} />
              <Field label="LOA min" value={props.draft.loa_min_m} keyboardType="numeric" onChangeText={(v) => props.setDraft((d) => ({ ...d, loa_min_m: v }))} />
              <Field label="LOA max" value={props.draft.loa_max_m} keyboardType="numeric" onChangeText={(v) => props.setDraft((d) => ({ ...d, loa_max_m: v }))} />
            </View>
            <Field label="Timeline" value={props.draft.timeline} onChangeText={(v) => props.setDraft((d) => ({ ...d, timeline: v }))} placeholder="Q4 2026" />
            <Field label="Preferred regions" value={props.draft.preferred_regions} onChangeText={(v) => props.setDraft((d) => ({ ...d, preferred_regions: v }))} placeholder="Mediterranean, South of France" />
            <Field label="Mandatory requirements" value={props.draft.mandatory_requirements} multiline onChangeText={(v) => props.setDraft((d) => ({ ...d, mandatory_requirements: v }))} />
            <View style={styles.twoCol}>
              <Field label="Next action" value={props.draft.next_action} onChangeText={(v) => props.setDraft((d) => ({ ...d, next_action: v }))} />
              <Field label="Next action due" value={props.draft.next_action_due} onChangeText={(v) => props.setDraft((d) => ({ ...d, next_action_due: v }))} placeholder="YYYY-MM-DD" />
              <Field label="Expected commission" value={props.draft.expected_commission_eur} keyboardType="numeric" onChangeText={(v) => props.setDraft((d) => ({ ...d, expected_commission_eur: v }))} />
              <Field label="Probability %" value={props.draft.close_probability} keyboardType="numeric" onChangeText={(v) => props.setDraft((d) => ({ ...d, close_probability: v }))} />
            </View>
            <ChipRow items={["low", "medium", "high"] as const} active={props.draft.risk_level} onChange={(risk_level) => props.setDraft((d) => ({ ...d, risk_level }))} />
            <Field label="Risk reason" value={props.draft.risk_reason} onChangeText={(v) => props.setDraft((d) => ({ ...d, risk_reason: v }))} />
            <Pressable onPress={props.onSave} disabled={props.saving} style={[styles.primaryButton, { backgroundColor: colors.primary }, props.saving && { opacity: 0.7 }]}>
              {props.saving ? <ActivityIndicator color={colors.background} /> : <Feather name="save" size={18} color={colors.background} />}
              <Text style={[styles.primaryText, { color: colors.background }]}>Save Case</Text>
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function Field(props: { label: string; value: string; onChangeText: (v: string) => void; placeholder?: string; keyboardType?: "default" | "numeric"; multiline?: boolean }) {
  const { colors } = useTheme();
  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: colors.mutedForeground }]}>{props.label}</Text>
      <TextInput
        value={props.value}
        onChangeText={props.onChangeText}
        placeholder={props.placeholder}
        placeholderTextColor={colors.mutedForeground}
        keyboardType={props.keyboardType}
        multiline={props.multiline}
        style={[styles.input, { backgroundColor: colors.secondary, borderColor: colors.border, color: colors.foreground }, props.multiline && styles.textarea]}
      />
    </View>
  );
}

function ChipRow<T extends string>({ items, active, onChange }: { items: readonly T[]; active: string; onChange: (v: T) => void }) {
  const { colors } = useTheme();
  return (
    <View style={styles.chipRow}>
      {items.map((item) => {
        const selected = item === active;
        return (
          <Pressable key={item} onPress={() => onChange(item)} style={[styles.chip, { backgroundColor: colors.secondary, borderColor: selected ? colors.primary : colors.border }, selected && { backgroundColor: colors.glow ?? colors.secondary }]}>
            <Text style={[styles.chipText, { color: selected ? colors.primary : colors.mutedForeground }]}>{item.replace(/_/g, " ")}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1 }}>
      <Text style={[styles.forecastLabel, { color: colors.mutedForeground }]}>{label}</Text>
      <Text style={[styles.forecastValue, { color: colors.primary }]}>{value}</Text>
    </View>
  );
}

function EmptyBlock({ title, copy }: { title: string; copy: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.emptyBlock}>
      <Text style={[styles.emptyTitle, { color: colors.foreground }]}>{title}</Text>
      <Text style={[styles.emptyCopy, { color: colors.mutedForeground }]}>{copy}</Text>
    </View>
  );
}

function CenterPanel({ icon, title, copy, danger }: { icon: keyof typeof Feather.glyphMap; title: string; copy?: string; danger?: boolean }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.centerPanel, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {icon === "loader" ? <ActivityIndicator color={colors.primary} /> : <Feather name={icon} size={28} color={danger ? "#E77777" : colors.primary} />}
      <Text style={[styles.emptyTitle, { color: colors.foreground }]}>{title}</Text>
      {copy ? <Text style={[styles.emptyCopy, { color: colors.mutedForeground }]}>{copy}</Text> : null}
    </View>
  );
}

function riskColor(risk: string): string {
  if (risk === "high") return "#E77777";
  if (risk === "low") return "#7BD389";
  return "#C9A961";
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: 22 },
  webScroll: { maxWidth: 1280, width: "100%", alignSelf: "center" },
  topbar: { flexDirection: "row", alignItems: "flex-start", gap: 12, marginBottom: 18 },
  iconButton: { width: 46, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  titleBlock: { flex: 1, minWidth: 0, paddingTop: 1 },
  kicker: { fontFamily: "Inter_700Bold", fontSize: 12, letterSpacing: 2.2 },
  acidKicker: { letterSpacing: 3.2 },
  title: { fontFamily: "Gilroy-ExtraBold", fontSize: Platform.OS === "web" ? 36 : 31, lineHeight: Platform.OS === "web" ? 42 : 36, marginTop: 4 },
  acidTitle: { letterSpacing: 0.8, textTransform: "uppercase" },
  subtitle: { fontFamily: "Inter_400Regular", fontSize: 13, marginTop: 4, lineHeight: 19 },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 14 },
  primaryButton: { minHeight: 52, borderRadius: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9, paddingHorizontal: 18, flexGrow: 1 },
  primaryText: { fontFamily: "Inter_800ExtraBold", fontSize: 15 },
  secondaryButton: { minHeight: 52, borderRadius: 14, borderWidth: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9, paddingHorizontal: 16, flexGrow: 1 },
  secondaryText: { fontFamily: "Inter_800ExtraBold", fontSize: 13, textAlign: "center", flexShrink: 1 },
  metricsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 14 },
  metricCard: { flexGrow: 1, flexBasis: Platform.OS === "web" ? 180 : "47%", borderRadius: 14, borderWidth: 1, padding: 14 },
  metricValue: { fontFamily: "Inter_800ExtraBold", fontSize: 27, marginTop: 8 },
  metricLabel: { fontFamily: "Inter_600SemiBold", fontSize: 12, marginTop: 2 },
  tabs: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 14 },
  tab: { borderRadius: 999, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10 },
  tabText: { fontFamily: "Inter_800ExtraBold", fontSize: 12, textTransform: "capitalize" },
  filterPanel: { borderRadius: 16, borderWidth: 1, padding: 14, gap: 10, marginBottom: 14 },
  filterHeader: { flexDirection: "row", gap: 10, alignItems: "center" },
  searchBox: { flex: 1, minHeight: 48, borderRadius: 12, borderWidth: 1, paddingHorizontal: 13, flexDirection: "row", alignItems: "center", gap: 10 },
  searchInput: { flex: 1, fontFamily: "Inter_500Medium", fontSize: 14, minHeight: 44 },
  filterCount: { overflow: "hidden", borderRadius: 999, paddingHorizontal: 11, paddingVertical: 8, fontFamily: "Inter_800ExtraBold", fontSize: 12 },
  filterLine: { flexDirection: Platform.OS === "web" ? "row" : "column", gap: 8, alignItems: Platform.OS === "web" ? "center" : "stretch" },
  filterLabel: { width: Platform.OS === "web" ? 88 : "100%", fontFamily: "Inter_700Bold", fontSize: 11, letterSpacing: 1.1, textTransform: "uppercase" },
  overviewGrid: { gap: 14, flexDirection: Platform.OS === "web" ? "row" : "column", alignItems: "flex-start" },
  panel: { flex: 1, borderRadius: 16, borderWidth: 1, padding: 16, width: "100%" },
  sideColumn: { flex: 0.75, gap: 14, width: "100%" },
  panelTitle: { fontFamily: "Gilroy-Bold", fontSize: 18, lineHeight: 23, marginBottom: 12 , fontWeight: "700"},
  forecastRow: { flexDirection: "row", justifyContent: "space-between", gap: 12 },
  forecastLabel: { fontFamily: "Inter_700Bold", fontSize: 11, letterSpacing: 1.2, textTransform: "uppercase" },
  forecastValue: { fontFamily: "Inter_800ExtraBold", fontSize: 20, marginTop: 6 },
  taskRow: { flexDirection: "row", gap: 10, paddingVertical: 10, borderBottomWidth: 1 },
  taskTitle: { fontFamily: "Gilroy-Bold", fontSize: 13 , fontWeight: "700"},
  taskMeta: { fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 3 },
  miniCase: { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderRadius: 12, padding: 11, marginBottom: 8 },
  pipeline: { gap: 12, paddingBottom: 8 },
  pipelineColumn: { width: Platform.OS === "web" ? 280 : 270, borderRadius: 16, borderWidth: 1, padding: 12 },
  pipelineHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  countBadge: { overflow: "hidden", borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4, fontFamily: "Inter_800ExtraBold", fontSize: 12 },
  caseCard: { borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 10 },
  caseCardCompact: { padding: 12 },
  caseTop: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  caseTitle: { fontFamily: "Gilroy-Bold", fontSize: 16, lineHeight: 21 , fontWeight: "700"},
  caseMeta: { fontFamily: "Inter_500Medium", fontSize: 12, marginTop: 4, textTransform: "capitalize" },
  riskBadge: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 5 },
  riskText: { fontFamily: "Inter_800ExtraBold", fontSize: 11, textTransform: "uppercase" },
  caseFacts: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
  factPill: { fontFamily: "Inter_800ExtraBold", fontSize: 12, lineHeight: 16, paddingHorizontal: 9, paddingVertical: 6, borderRadius: 999, overflow: "hidden" },
  nextAction: { fontFamily: "Inter_600SemiBold", fontSize: 13, marginTop: 12, lineHeight: 18 },
  emptySmall: { fontFamily: "Inter_500Medium", fontSize: 13, paddingVertical: 20, textAlign: "center" },
  emptyBlock: { paddingVertical: 20, gap: 5, alignItems: "center" },
  emptyTitle: { fontFamily: "Gilroy-Bold", fontSize: 16, textAlign: "center" , fontWeight: "700"},
  emptyCopy: { fontFamily: "Inter_400Regular", fontSize: 13, textAlign: "center", lineHeight: 19 },
  centerPanel: { minHeight: 260, alignItems: "center", justifyContent: "center", gap: 10, borderRadius: 16, borderWidth: 1, padding: 24 },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.58)", justifyContent: "flex-end" },
  modalCard: { maxHeight: "92%", borderTopLeftRadius: 22, borderTopRightRadius: 22, borderWidth: 1 },
  modalWeb: { width: 820, alignSelf: "center", borderRadius: 22, marginBottom: 30 },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 18, borderBottomWidth: 1 },
  modalTitle: { fontFamily: "Gilroy-Bold", fontSize: 20 , fontWeight: "700"},
  smallIcon: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  modalScroll: { padding: 18, gap: 12 },
  field: { flex: 1, minWidth: Platform.OS === "web" ? 240 : "100%" },
  twoCol: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  label: { fontFamily: "Inter_700Bold", fontSize: 11, letterSpacing: 1.1, textTransform: "uppercase", marginBottom: 6 },
  input: { minHeight: 48, borderRadius: 12, borderWidth: 1, fontFamily: "Inter_500Medium", fontSize: 15, paddingHorizontal: 13, paddingVertical: 11 },
  textarea: { minHeight: 84, textAlignVertical: "top" },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { borderRadius: 999, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 9 },
  chipText: { fontFamily: "Inter_800ExtraBold", fontSize: 12, textTransform: "capitalize" },
});
