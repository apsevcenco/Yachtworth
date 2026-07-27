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
import {
  createBrokerCase,
  getBrokerDashboard,
  importCharterClientsToBrokerOs,
  type BrokerCase,
  type BrokerDashboard,
} from "../lib/brokerOs";

const NAVY = "#0B1E3F";
const NAVY_DEEP = "#081633";
const NAVY_ELEV = "#142A52";
const GOLD = "#C9A961";
const IVORY = "#F7F3EC";
const MUTED = "rgba(247,243,236,0.62)";
const DIVIDER = "rgba(247,243,236,0.1)";
const GREEN = "#7BD389";
const RED = "#E77777";

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
  ["flag_registration", "Flag"],
  ["valuation", "Valuation"],
  ["survey", "Survey"],
] as const;

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

function riskColor(risk: string): string {
  if (risk === "high") return RED;
  if (risk === "low") return GREEN;
  return GOLD;
}

function Field(props: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  keyboardType?: "default" | "numeric";
  multiline?: boolean;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{props.label}</Text>
      <TextInput
        value={props.value}
        onChangeText={props.onChangeText}
        placeholder={props.placeholder}
        placeholderTextColor="rgba(247,243,236,0.28)"
        keyboardType={props.keyboardType}
        multiline={props.multiline}
        style={[styles.input, props.multiline && styles.textarea]}
      />
    </View>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

export default function BrokerOsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const { isLoaded, isSignedIn } = useAuth();
  const [dashboard, setDashboard] = useState<BrokerDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);

  const metrics = useMemo(() => {
    const t = dashboard?.today;
    return [
      { label: "Overdue", value: t?.overdue_followups ?? 0, icon: "clock" as const },
      { label: "Due today", value: t?.due_today ?? 0, icon: "bell" as const },
      { label: "Stale cases", value: t?.stale_cases ?? 0, icon: "alert-triangle" as const },
      { label: "Active cases", value: t?.active_cases ?? 0, icon: "briefcase" as const },
    ];
  }, [dashboard?.today]);

  async function load() {
    if (!isSignedIn) return;
    setLoading(true);
    setError(null);
    try {
      setDashboard(await getBrokerDashboard());
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

  async function saveCase() {
    if (!draft.title.trim()) {
      Alert.alert("Case title required", "Add a short title for this commercial situation.");
      return;
    }
    setSaving(true);
    try {
      await createBrokerCase({
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
    <View style={[styles.root, { paddingTop: (isWeb ? 62 : insets.top) + 64 }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: insets.bottom + 44 },
          isWeb && styles.webScroll,
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topbar}>
          <Pressable onPress={() => router.back()} style={styles.iconButton}>
            <Feather name="arrow-left" size={22} color={IVORY} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.kicker}>YACHTWORTH</Text>
            <Text style={styles.title}>Broker OS</Text>
            <Text style={styles.subtitle}>First enquiry to closing and commission.</Text>
          </View>
        </View>

        {!isLoaded || loading ? (
          <View style={styles.centerPanel}>
            <ActivityIndicator color={GOLD} />
          </View>
        ) : !isSignedIn ? (
          <View style={styles.centerPanel}>
            <Feather name="lock" size={28} color={GOLD} />
            <Text style={styles.emptyTitle}>Sign in required</Text>
          </View>
        ) : error ? (
          <View style={styles.centerPanel}>
            <Feather name="alert-circle" size={28} color={RED} />
            <Text style={styles.emptyTitle}>Could not load Broker OS</Text>
            <Text style={styles.emptyCopy}>{error}</Text>
          </View>
        ) : (
          <>
            <View style={styles.actions}>
              <Pressable onPress={() => setModalOpen(true)} style={styles.primaryButton}>
                <Feather name="plus" size={18} color={NAVY} />
                <Text style={styles.primaryText}>New Case</Text>
              </Pressable>
              <Pressable onPress={importClients} style={styles.secondaryButton}>
                <Feather name="download" size={16} color={GOLD} />
                <Text style={styles.secondaryText}>Import charter clients</Text>
              </Pressable>
            </View>

            <View style={styles.metricsGrid}>
              {metrics.map((m) => (
                <View key={m.label} style={styles.metricCard}>
                  <Feather name={m.icon} size={17} color={GOLD} />
                  <Text style={styles.metricValue}>{m.value}</Text>
                  <Text style={styles.metricLabel}>{m.label}</Text>
                </View>
              ))}
            </View>

            <View style={[styles.layout, isWeb && styles.webLayout]}>
              <View style={styles.panel}>
                <Text style={styles.panelTitle}>Priority Cases</Text>
                {dashboard?.priority_cases.length ? (
                  dashboard.priority_cases.map((item) => <CaseCard key={item.id} item={item} />)
                ) : (
                  <EmptyBlock title="No active cases yet" copy="Create the first buyer, seller or charter case to start the broker workflow." />
                )}
              </View>

              <View style={styles.sideColumn}>
                <View style={styles.panel}>
                  <Text style={styles.panelTitle}>Revenue Forecast</Text>
                  <View style={styles.forecastRow}>
                    <View>
                      <Text style={styles.forecastLabel}>Expected</Text>
                      <Text style={styles.forecastValue}>{money(dashboard?.forecast.expected_commission_eur)}</Text>
                    </View>
                    <View>
                      <Text style={styles.forecastLabel}>Weighted</Text>
                      <Text style={styles.forecastValue}>{money(dashboard?.forecast.weighted_commission_eur)}</Text>
                    </View>
                  </View>
                </View>
                <View style={styles.panel}>
                  <Text style={styles.panelTitle}>Today</Text>
                  {dashboard?.tasks.length ? (
                    dashboard.tasks.map((task) => (
                      <View key={task.id} style={styles.taskRow}>
                        <Feather name="check-circle" size={15} color={GOLD} />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.taskTitle}>{task.title}</Text>
                          <Text style={styles.taskMeta}>{task.due_date ?? "No due date"} · {task.priority}</Text>
                        </View>
                      </View>
                    ))
                  ) : (
                    <EmptyBlock title="No urgent follow-ups" copy="Tasks appear here when a case has a next action due." />
                  )}
                </View>
              </View>
            </View>
          </>
        )}
      </ScrollView>

      <Modal visible={modalOpen} animationType="slide" transparent onRequestClose={() => setModalOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, isWeb && styles.modalWeb]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New commercial case</Text>
              <Pressable onPress={() => setModalOpen(false)} style={styles.smallIcon}>
                <Feather name="x" size={20} color={IVORY} />
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={styles.modalScroll}>
              <Field label="Case title" value={draft.title} onChangeText={(v) => setDraft((d) => ({ ...d, title: v }))} placeholder="James Harrington - Buyer Search" />
              <View style={styles.chipRow}>
                {CASE_TYPES.map(([value, label]) => (
                  <Chip key={value} label={label} active={draft.case_type === value} onPress={() => setDraft((d) => ({ ...d, case_type: value }))} />
                ))}
              </View>
              <Field label="Contact name" value={draft.contact_name} onChangeText={(v) => setDraft((d) => ({ ...d, contact_name: v }))} />
              <Field label="Contact email" value={draft.contact_email} onChangeText={(v) => setDraft((d) => ({ ...d, contact_email: v }))} />
              <View style={styles.chipRow}>
                {(["A", "B", "C", "D"] as const).map((score) => (
                  <Chip key={score} label={`Lead ${score}`} active={draft.lead_score === score} onPress={() => setDraft((d) => ({ ...d, lead_score: score }))} />
                ))}
              </View>
              <View style={styles.twoCol}>
                <Field label="Budget min" value={draft.budget_min_eur} keyboardType="numeric" onChangeText={(v) => setDraft((d) => ({ ...d, budget_min_eur: v }))} />
                <Field label="Budget max" value={draft.budget_max_eur} keyboardType="numeric" onChangeText={(v) => setDraft((d) => ({ ...d, budget_max_eur: v }))} />
                <Field label="LOA min" value={draft.loa_min_m} keyboardType="numeric" onChangeText={(v) => setDraft((d) => ({ ...d, loa_min_m: v }))} />
                <Field label="LOA max" value={draft.loa_max_m} keyboardType="numeric" onChangeText={(v) => setDraft((d) => ({ ...d, loa_max_m: v }))} />
              </View>
              <Field label="Timeline" value={draft.timeline} onChangeText={(v) => setDraft((d) => ({ ...d, timeline: v }))} placeholder="Q4 2026" />
              <Field label="Preferred regions" value={draft.preferred_regions} onChangeText={(v) => setDraft((d) => ({ ...d, preferred_regions: v }))} placeholder="Mediterranean, South of France" />
              <Field label="Mandatory requirements" value={draft.mandatory_requirements} multiline onChangeText={(v) => setDraft((d) => ({ ...d, mandatory_requirements: v }))} />
              <Field label="Next action" value={draft.next_action} onChangeText={(v) => setDraft((d) => ({ ...d, next_action: v }))} placeholder="Send 3 off-market yachts" />
              <Field label="Next action due YYYY-MM-DD" value={draft.next_action_due} onChangeText={(v) => setDraft((d) => ({ ...d, next_action_due: v }))} />
              <View style={styles.twoCol}>
                <Field label="Expected commission" value={draft.expected_commission_eur} keyboardType="numeric" onChangeText={(v) => setDraft((d) => ({ ...d, expected_commission_eur: v }))} />
                <Field label="Probability %" value={draft.close_probability} keyboardType="numeric" onChangeText={(v) => setDraft((d) => ({ ...d, close_probability: v }))} />
              </View>
              <View style={styles.chipRow}>
                {(["low", "medium", "high"] as const).map((risk) => (
                  <Chip key={risk} label={`Risk ${risk}`} active={draft.risk_level === risk} onPress={() => setDraft((d) => ({ ...d, risk_level: risk }))} />
                ))}
              </View>
              <Field label="Risk reason" value={draft.risk_reason} onChangeText={(v) => setDraft((d) => ({ ...d, risk_reason: v }))} />
              <Pressable onPress={saveCase} disabled={saving} style={[styles.primaryButton, saving && { opacity: 0.7 }]}>
                {saving ? <ActivityIndicator color={NAVY} /> : <Feather name="save" size={18} color={NAVY} />}
                <Text style={styles.primaryText}>Save Case</Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function CaseCard({ item }: { item: BrokerCase }) {
  return (
    <View style={styles.caseCard}>
      <View style={styles.caseTop}>
        <View style={{ flex: 1 }}>
          <Text style={styles.caseTitle}>{item.title}</Text>
          <Text style={styles.caseMeta}>{caseTypeLabel(item.case_type)} · {item.stage.replace(/_/g, " ")} · Lead {item.lead_score}</Text>
        </View>
        <View style={[styles.riskBadge, { borderColor: riskColor(item.risk_level) }]}>
          <Text style={[styles.riskText, { color: riskColor(item.risk_level) }]}>{item.risk_level}</Text>
        </View>
      </View>
      <View style={styles.caseFacts}>
        <Text style={styles.factText}>{item.loa_min_m ?? "?"}-{item.loa_max_m ?? "?"} m</Text>
        <Text style={styles.factText}>{money(item.budget_min_eur)}-{money(item.budget_max_eur)}</Text>
        <Text style={styles.factText}>{item.close_probability}% close</Text>
      </View>
      {item.next_action ? <Text style={styles.nextAction}>Next: {item.next_action}</Text> : null}
      {item.risk_reason ? <Text style={styles.riskReason}>Risk: {item.risk_reason}</Text> : null}
    </View>
  );
}

function EmptyBlock({ title, copy }: { title: string; copy: string }) {
  return (
    <View style={styles.emptyBlock}>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyCopy}>{copy}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: NAVY },
  scroll: { paddingHorizontal: 22 },
  webScroll: { maxWidth: 1240, width: "100%", alignSelf: "center" },
  topbar: { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 18 },
  iconButton: { width: 46, height: 46, borderRadius: 23, backgroundColor: NAVY_DEEP, alignItems: "center", justifyContent: "center" },
  kicker: { color: GOLD, fontFamily: "Inter_600SemiBold", fontSize: 12, letterSpacing: 2.2 },
  title: { color: IVORY, fontFamily: "Gilroy-ExtraBold", fontSize: 34, marginTop: 4 },
  subtitle: { color: MUTED, fontFamily: "Inter_400Regular", fontSize: 13, marginTop: 4 },
  centerPanel: { minHeight: 260, alignItems: "center", justifyContent: "center", gap: 10, backgroundColor: NAVY_DEEP, borderRadius: 16, borderWidth: 1, borderColor: DIVIDER, padding: 24 },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 14 },
  primaryButton: { minHeight: 52, borderRadius: 14, backgroundColor: GOLD, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9, paddingHorizontal: 18 },
  primaryText: { color: NAVY, fontFamily: "Inter_800ExtraBold", fontSize: 15 },
  secondaryButton: { minHeight: 52, borderRadius: 14, borderWidth: 1, borderColor: GOLD, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9, paddingHorizontal: 16 },
  secondaryText: { color: GOLD, fontFamily: "Inter_700Bold", fontSize: 13 },
  metricsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 14 },
  metricCard: { flexGrow: 1, flexBasis: Platform.OS === "web" ? 180 : "47%", backgroundColor: NAVY_DEEP, borderRadius: 14, borderWidth: 1, borderColor: DIVIDER, padding: 14 },
  metricValue: { color: IVORY, fontFamily: "Inter_800ExtraBold", fontSize: 27, marginTop: 8 },
  metricLabel: { color: MUTED, fontFamily: "Inter_600SemiBold", fontSize: 12, marginTop: 2 },
  layout: { gap: 14 },
  webLayout: { flexDirection: "row", alignItems: "flex-start" },
  panel: { flex: 1, backgroundColor: NAVY_DEEP, borderRadius: 16, borderWidth: 1, borderColor: DIVIDER, padding: 16 },
  sideColumn: { flex: 0.75, gap: 14 },
  panelTitle: { color: IVORY, fontFamily: "Inter_800ExtraBold", fontSize: 18, marginBottom: 12 },
  caseCard: { backgroundColor: NAVY, borderRadius: 14, borderWidth: 1, borderColor: DIVIDER, padding: 14, marginBottom: 10 },
  caseTop: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  caseTitle: { color: IVORY, fontFamily: "Inter_800ExtraBold", fontSize: 16 },
  caseMeta: { color: MUTED, fontFamily: "Inter_500Medium", fontSize: 12, marginTop: 4 },
  riskBadge: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 5 },
  riskText: { fontFamily: "Inter_800ExtraBold", fontSize: 11, textTransform: "uppercase" },
  caseFacts: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
  factText: { color: GOLD, fontFamily: "Inter_700Bold", fontSize: 12, backgroundColor: "rgba(201,169,97,0.11)", paddingHorizontal: 9, paddingVertical: 6, borderRadius: 999 },
  nextAction: { color: IVORY, fontFamily: "Inter_600SemiBold", fontSize: 13, marginTop: 12, lineHeight: 18 },
  riskReason: { color: MUTED, fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 7, lineHeight: 17 },
  forecastRow: { flexDirection: "row", justifyContent: "space-between", gap: 12 },
  forecastLabel: { color: MUTED, fontFamily: "Inter_600SemiBold", fontSize: 11, letterSpacing: 1.2 },
  forecastValue: { color: GOLD, fontFamily: "Inter_800ExtraBold", fontSize: 20, marginTop: 6 },
  taskRow: { flexDirection: "row", gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: DIVIDER },
  taskTitle: { color: IVORY, fontFamily: "Inter_700Bold", fontSize: 13 },
  taskMeta: { color: MUTED, fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 3 },
  emptyBlock: { paddingVertical: 20, gap: 5 },
  emptyTitle: { color: IVORY, fontFamily: "Inter_800ExtraBold", fontSize: 16, textAlign: "center" },
  emptyCopy: { color: MUTED, fontFamily: "Inter_400Regular", fontSize: 13, textAlign: "center", lineHeight: 19 },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.58)", justifyContent: "flex-end" },
  modalCard: { maxHeight: "92%", backgroundColor: NAVY_DEEP, borderTopLeftRadius: 22, borderTopRightRadius: 22, borderWidth: 1, borderColor: DIVIDER },
  modalWeb: { width: 760, alignSelf: "center", borderRadius: 22, marginBottom: 30 },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 18, borderBottomWidth: 1, borderBottomColor: DIVIDER },
  modalTitle: { color: IVORY, fontFamily: "Inter_800ExtraBold", fontSize: 20 },
  smallIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: NAVY, alignItems: "center", justifyContent: "center" },
  modalScroll: { padding: 18, gap: 12 },
  field: { width: "100%" },
  twoCol: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  label: { color: MUTED, fontFamily: "Inter_600SemiBold", fontSize: 11, letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 6 },
  input: { minHeight: 48, borderRadius: 12, borderWidth: 1, borderColor: "rgba(247,243,236,0.12)", backgroundColor: NAVY_ELEV, color: IVORY, fontFamily: "Inter_500Medium", fontSize: 15, paddingHorizontal: 13, paddingVertical: 11 },
  textarea: { minHeight: 84, textAlignVertical: "top" },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { borderRadius: 999, borderWidth: 1, borderColor: DIVIDER, paddingHorizontal: 12, paddingVertical: 9, backgroundColor: NAVY },
  chipActive: { borderColor: GOLD, backgroundColor: "rgba(201,169,97,0.14)" },
  chipText: { color: MUTED, fontFamily: "Inter_700Bold", fontSize: 12 },
  chipTextActive: { color: GOLD },
});
