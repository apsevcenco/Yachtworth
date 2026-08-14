import { Feather } from "@expo/vector-icons";
import { useAuth } from "@clerk/expo";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
  createBrokerCaseActivity,
  createBrokerCaseTask,
  getBrokerCase,
  updateBrokerCase,
  updateBrokerTask,
  type BrokerActivity,
  type BrokerCase,
  type BrokerCaseDetail,
  type BrokerTask,
} from "../lib/brokerOs";

type Draft = {
  title: string;
  owner_name: string;
  case_type: string;
  stage: string;
  status: string;
  lead_score: "A" | "B" | "C" | "D";
  risk_level: "low" | "medium" | "high";
  budget_min_eur: string;
  budget_max_eur: string;
  loa_min_m: string;
  loa_max_m: string;
  timeline: string;
  preferred_regions: string;
  mandatory_requirements: string;
  preferred_requirements: string;
  acceptable_compromises: string;
  rejected_characteristics: string;
  next_action: string;
  next_action_due: string;
  expected_commission_eur: string;
  close_probability: string;
  forecast_close_date: string;
  risk_reason: string;
  notes: string;
};

const STAGES = [
  "new_inquiry",
  "qualified",
  "proposal",
  "negotiation",
  "closing",
  "closed_won",
  "closed_lost",
] as const;

const STATUSES = ["active", "paused", "won", "lost", "archived"] as const;
const PRIORITIES = ["low", "normal", "high", "urgent"] as const;

type TaskDraft = {
  title: string;
  detail: string;
  due_date: string;
  priority: (typeof PRIORITIES)[number];
};

const EMPTY_TASK: TaskDraft = { title: "", detail: "", due_date: "", priority: "normal" };
const EMPTY_ACTIVITY = { subject: "", body: "", channel: "note" as const };

function asText(v: unknown): string {
  return v == null ? "" : String(v);
}

function numberOrNull(v: string): number | null {
  if (!v.trim()) return null;
  const n = Number(v.replace(/[,\s]/g, ""));
  return Number.isFinite(n) ? n : null;
}

function money(v: number | null | undefined): string {
  return v == null ? "-" : `EUR ${Math.round(v).toLocaleString("en-GB")}`;
}

function listText(v: unknown): string {
  return Array.isArray(v) ? v.filter(Boolean).join(", ") : "";
}

function draftFromCase(item: BrokerCase): Draft {
  return {
    title: item.title ?? "",
    owner_name: item.owner_name ?? "",
    case_type: item.case_type ?? "buyer_inquiry",
    stage: item.stage ?? "new_inquiry",
    status: item.status ?? "active",
    lead_score: item.lead_score ?? "B",
    risk_level: item.risk_level ?? "medium",
    budget_min_eur: asText(item.budget_min_eur),
    budget_max_eur: asText(item.budget_max_eur),
    loa_min_m: asText(item.loa_min_m),
    loa_max_m: asText(item.loa_max_m),
    timeline: item.timeline ?? "",
    preferred_regions: listText(item.preferred_regions),
    mandatory_requirements: listText(item.mandatory_requirements),
    preferred_requirements: listText(item.preferred_requirements),
    acceptable_compromises: listText((item as BrokerCase & { acceptable_compromises?: string[] }).acceptable_compromises),
    rejected_characteristics: listText((item as BrokerCase & { rejected_characteristics?: string[] }).rejected_characteristics),
    next_action: item.next_action ?? "",
    next_action_due: item.next_action_due ?? "",
    expected_commission_eur: asText(item.expected_commission_eur),
    close_probability: asText(item.close_probability ?? 30),
    forecast_close_date: item.forecast_close_date ?? "",
    risk_reason: item.risk_reason ?? "",
    notes: item.notes ?? "",
  };
}

export default function BrokerCaseDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const insets = useSafeAreaInsets();
  const { isLoaded, isSignedIn } = useAuth();
  const { colors, isAcid } = useTheme();
  const isWeb = Platform.OS === "web";
  const caseId = Array.isArray(params.id) ? params.id[0] : params.id;
  const [detail, setDetail] = useState<BrokerCaseDetail | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [taskDraft, setTaskDraft] = useState(EMPTY_TASK);
  const [activityDraft, setActivityDraft] = useState(EMPTY_ACTIVITY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const item = detail?.item ?? null;
  const openTasks = useMemo(() => (detail?.tasks ?? []).filter((task) => task.status !== "done"), [detail?.tasks]);

  async function load() {
    if (!caseId || !isSignedIn) return;
    setLoading(true);
    setError(null);
    try {
      const next = await getBrokerCase(caseId);
      setDetail(next);
      setDraft(draftFromCase(next.item));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!isLoaded) return;
    if (!caseId || !isSignedIn) {
      setLoading(false);
      return;
    }
    load().catch(() => {});
  }, [caseId, isLoaded, isSignedIn]);

  async function save() {
    if (!caseId || !draft) return;
    if (!draft.title.trim()) {
      Alert.alert("Case title required", "The case needs a title.");
      return;
    }
    setSaving(true);
    try {
      const result = await updateBrokerCase(caseId, {
        contact_id: item?.contact_id ?? null,
        title: draft.title.trim(),
        owner_name: draft.owner_name.trim() || null,
        case_type: draft.case_type,
        stage: draft.stage,
        status: draft.status,
        lead_score: draft.lead_score,
        risk_level: draft.risk_level,
        budget_min_eur: numberOrNull(draft.budget_min_eur),
        budget_max_eur: numberOrNull(draft.budget_max_eur),
        loa_min_m: numberOrNull(draft.loa_min_m),
        loa_max_m: numberOrNull(draft.loa_max_m),
        timeline: draft.timeline.trim() || null,
        preferred_regions: draft.preferred_regions,
        mandatory_requirements: draft.mandatory_requirements,
        preferred_requirements: draft.preferred_requirements,
        acceptable_compromises: draft.acceptable_compromises,
        rejected_characteristics: draft.rejected_characteristics,
        next_action: draft.next_action.trim() || null,
        next_action_due: draft.next_action_due.trim() || null,
        expected_commission_eur: numberOrNull(draft.expected_commission_eur),
        close_probability: numberOrNull(draft.close_probability),
        forecast_close_date: draft.forecast_close_date.trim() || null,
        risk_reason: draft.risk_reason.trim() || null,
        notes: draft.notes.trim() || null,
      });
      setDetail((prev) => (prev ? { ...prev, item: result.item } : prev));
      setDraft(draftFromCase(result.item));
      Alert.alert("Saved", "Broker case updated.");
    } catch (err) {
      Alert.alert("Could not save", err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  async function addTask() {
    if (!caseId || !taskDraft.title.trim()) return;
    try {
      await createBrokerCaseTask(caseId, {
        title: taskDraft.title.trim(),
        detail: taskDraft.detail.trim() || null,
        due_date: taskDraft.due_date.trim() || null,
        priority: taskDraft.priority,
      });
      setTaskDraft(EMPTY_TASK);
      await load();
    } catch (err) {
      Alert.alert("Could not add task", err instanceof Error ? err.message : String(err));
    }
  }

  async function addActivity() {
    if (!caseId || (!activityDraft.subject.trim() && !activityDraft.body.trim())) return;
    try {
      await createBrokerCaseActivity(caseId, {
        subject: activityDraft.subject.trim() || "Case note",
        body: activityDraft.body.trim() || null,
        channel: activityDraft.channel,
      });
      setActivityDraft(EMPTY_ACTIVITY);
      await load();
    } catch (err) {
      Alert.alert("Could not add note", err instanceof Error ? err.message : String(err));
    }
  }

  async function markTask(task: BrokerTask, status: "done" | "open" | "cancelled") {
    try {
      await updateBrokerTask(task.id, { status });
      await load();
    } catch (err) {
      Alert.alert("Could not update task", err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <View style={[styles.root, { paddingTop: (isWeb ? 62 : insets.top) + 64, backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 44 }, isWeb && styles.webScroll]} showsVerticalScrollIndicator={false}>
        <View style={styles.topbar}>
          <Pressable onPress={() => router.back()} style={[styles.iconButton, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
            <Feather name="arrow-left" size={22} color={colors.foreground} />
          </Pressable>
          <View style={styles.titleBlock}>
            <Text style={[styles.kicker, { color: colors.primary }, isAcid && styles.acidKicker]}>BROKER CASE</Text>
            <Text style={[styles.title, { color: colors.foreground }]} numberOfLines={3}>{draft?.title || "Case detail"}</Text>
            {item ? <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>{item.case_type.replace(/_/g, " ")} / {item.stage.replace(/_/g, " ")} / updated {item.updated_at?.slice(0, 10)}</Text> : null}
          </View>
        </View>

        {!isLoaded || loading ? (
          <CenterPanel title="Loading case" />
        ) : !isSignedIn ? (
          <CenterPanel title="Sign in required" />
        ) : error || !draft || !item ? (
          <CenterPanel title="Could not open case" copy={error ?? "Case not found"} danger />
        ) : (
          <>
            <View style={styles.actionRow}>
              <Pressable onPress={save} disabled={saving} style={[styles.primaryButton, { backgroundColor: colors.primary }, saving && { opacity: 0.7 }]}>
                {saving ? <ActivityIndicator color={colors.background} /> : <Feather name="save" size={18} color={colors.background} />}
                <Text style={[styles.primaryText, { color: colors.background }]}>Save changes</Text>
              </Pressable>
              <Pressable onPress={() => router.push("/crm" as never)} style={[styles.secondaryButton, { borderColor: colors.primary, backgroundColor: colors.glow ?? "transparent" }]}>
                <Feather name="users" size={17} color={colors.primary} />
                <Text style={[styles.secondaryText, { color: colors.primary }]}>CRM</Text>
              </Pressable>
              {item.contact_id ? (
                <Pressable
                  onPress={() => router.push({ pathname: "/crm", params: { contactId: item.contact_id } } as never)}
                  style={[styles.secondaryButton, { borderColor: colors.primary, backgroundColor: colors.glow ?? "transparent" }]}
                >
                  <Feather name="user-check" size={17} color={colors.primary} />
                  <Text style={[styles.secondaryText, { color: colors.primary }]}>Open linked contact</Text>
                </Pressable>
              ) : null}
            </View>

            <View style={styles.metricsGrid}>
              <Metric label="Budget" value={`${money(item.budget_min_eur)}-${money(item.budget_max_eur)}`} />
              <Metric label="Expected commission" value={money(item.expected_commission_eur)} />
              <Metric label="Probability" value={`${item.close_probability}%`} />
              <Metric label="Open tasks" value={String(openTasks.length)} />
            </View>

            <View style={styles.layoutGrid}>
              <View style={[styles.panel, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.panelTitle, { color: colors.foreground }]}>Commercial Situation</Text>
                <Field label="Title" value={draft.title} onChangeText={(v) => setDraft((d) => d && { ...d, title: v })} />
                <View style={styles.twoCol}>
                  <Field label="Owner / Client" value={draft.owner_name} onChangeText={(v) => setDraft((d) => d && { ...d, owner_name: v })} />
                  <Field label="Case type" value={draft.case_type} onChangeText={(v) => setDraft((d) => d && { ...d, case_type: v })} />
                </View>
                <Text style={[styles.label, { color: colors.mutedForeground }]}>Stage</Text>
                <ChipRow items={STAGES} active={draft.stage} onChange={(stage) => setDraft((d) => d && { ...d, stage })} />
                <Text style={[styles.label, { color: colors.mutedForeground }]}>Status</Text>
                <ChipRow items={STATUSES} active={draft.status} onChange={(status) => setDraft((d) => d && { ...d, status })} />
                <Text style={[styles.label, { color: colors.mutedForeground }]}>Lead score</Text>
                <ChipRow items={["A", "B", "C", "D"] as const} active={draft.lead_score} onChange={(lead_score) => setDraft((d) => d && { ...d, lead_score })} />
                <View style={styles.twoCol}>
                  <Field label="Budget min EUR" value={draft.budget_min_eur} keyboardType="numeric" onChangeText={(v) => setDraft((d) => d && { ...d, budget_min_eur: v })} />
                  <Field label="Budget max EUR" value={draft.budget_max_eur} keyboardType="numeric" onChangeText={(v) => setDraft((d) => d && { ...d, budget_max_eur: v })} />
                  <Field label="LOA min m" value={draft.loa_min_m} keyboardType="numeric" onChangeText={(v) => setDraft((d) => d && { ...d, loa_min_m: v })} />
                  <Field label="LOA max m" value={draft.loa_max_m} keyboardType="numeric" onChangeText={(v) => setDraft((d) => d && { ...d, loa_max_m: v })} />
                </View>
                <Field label="Timeline" value={draft.timeline} onChangeText={(v) => setDraft((d) => d && { ...d, timeline: v })} />
                <Field label="Preferred regions" value={draft.preferred_regions} onChangeText={(v) => setDraft((d) => d && { ...d, preferred_regions: v })} placeholder="Mediterranean, South of France" />
                <Field label="Mandatory requirements" value={draft.mandatory_requirements} multiline onChangeText={(v) => setDraft((d) => d && { ...d, mandatory_requirements: v })} />
                <Field label="Preferred requirements" value={draft.preferred_requirements} multiline onChangeText={(v) => setDraft((d) => d && { ...d, preferred_requirements: v })} />
                <Field label="Acceptable compromises" value={draft.acceptable_compromises} multiline onChangeText={(v) => setDraft((d) => d && { ...d, acceptable_compromises: v })} />
                <Field label="Rejected characteristics" value={draft.rejected_characteristics} multiline onChangeText={(v) => setDraft((d) => d && { ...d, rejected_characteristics: v })} />
              </View>

              <View style={styles.sideColumn}>
                <View style={[styles.panel, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Text style={[styles.panelTitle, { color: colors.foreground }]}>Follow-up Control</Text>
                  <Field label="Next action" value={draft.next_action} onChangeText={(v) => setDraft((d) => d && { ...d, next_action: v })} />
                  <View style={styles.twoCol}>
                    <Field label="Due date" value={draft.next_action_due} onChangeText={(v) => setDraft((d) => d && { ...d, next_action_due: v })} placeholder="YYYY-MM-DD" />
                    <Field label="Forecast close date" value={draft.forecast_close_date} onChangeText={(v) => setDraft((d) => d && { ...d, forecast_close_date: v })} placeholder="YYYY-MM-DD" />
                    <Field label="Expected commission" value={draft.expected_commission_eur} keyboardType="numeric" onChangeText={(v) => setDraft((d) => d && { ...d, expected_commission_eur: v })} />
                    <Field label="Close probability %" value={draft.close_probability} keyboardType="numeric" onChangeText={(v) => setDraft((d) => d && { ...d, close_probability: v })} />
                  </View>
                  <Text style={[styles.label, { color: colors.mutedForeground }]}>Risk level</Text>
                  <ChipRow items={["low", "medium", "high"] as const} active={draft.risk_level} onChange={(risk_level) => setDraft((d) => d && { ...d, risk_level })} />
                  <Field label="Risk reason" value={draft.risk_reason} onChangeText={(v) => setDraft((d) => d && { ...d, risk_reason: v })} />
                  <Field label="Internal notes" value={draft.notes} multiline onChangeText={(v) => setDraft((d) => d && { ...d, notes: v })} />
                </View>

                <AddTaskPanel value={taskDraft} setValue={setTaskDraft} onSave={addTask} />
                <AddActivityPanel value={activityDraft} setValue={setActivityDraft} onSave={addActivity} />
              </View>
            </View>

            <View style={styles.layoutGrid}>
              <TasksPanel tasks={detail?.tasks ?? []} onStatus={markTask} />
              <ActivityPanel items={detail?.activity ?? []} />
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

function AddTaskPanel({ value, setValue, onSave }: { value: TaskDraft; setValue: React.Dispatch<React.SetStateAction<TaskDraft>>; onSave: () => void }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.panel, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[styles.panelTitle, { color: colors.foreground }]}>Add Task</Text>
      <Field label="Task" value={value.title} onChangeText={(title) => setValue((v) => ({ ...v, title }))} />
      <Field label="Details" value={value.detail} multiline onChangeText={(detail) => setValue((v) => ({ ...v, detail }))} />
      <Field label="Due date" value={value.due_date} onChangeText={(due_date) => setValue((v) => ({ ...v, due_date }))} placeholder="YYYY-MM-DD" />
      <ChipRow items={PRIORITIES} active={value.priority} onChange={(priority) => setValue((v) => ({ ...v, priority }))} />
      <Pressable onPress={onSave} style={[styles.secondaryButton, { borderColor: colors.primary, backgroundColor: colors.glow ?? "transparent" }]}>
        <Feather name="plus" size={17} color={colors.primary} />
        <Text style={[styles.secondaryText, { color: colors.primary }]}>Add task</Text>
      </Pressable>
    </View>
  );
}

function AddActivityPanel({ value, setValue, onSave }: { value: typeof EMPTY_ACTIVITY; setValue: React.Dispatch<React.SetStateAction<typeof EMPTY_ACTIVITY>>; onSave: () => void }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.panel, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[styles.panelTitle, { color: colors.foreground }]}>Add Activity</Text>
      <Field label="Subject" value={value.subject} onChangeText={(subject) => setValue((v) => ({ ...v, subject }))} />
      <Field label="Note" value={value.body} multiline onChangeText={(body) => setValue((v) => ({ ...v, body }))} />
      <Pressable onPress={onSave} style={[styles.secondaryButton, { borderColor: colors.primary, backgroundColor: colors.glow ?? "transparent" }]}>
        <Feather name="message-square" size={17} color={colors.primary} />
        <Text style={[styles.secondaryText, { color: colors.primary }]}>Add note</Text>
      </Pressable>
    </View>
  );
}

function TasksPanel({ tasks, onStatus }: { tasks: BrokerTask[]; onStatus: (task: BrokerTask, status: "done" | "open" | "cancelled") => void }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.panel, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[styles.panelTitle, { color: colors.foreground }]}>Tasks</Text>
      {tasks.length ? tasks.map((task) => (
        <View key={task.id} style={[styles.listRow, { borderBottomColor: colors.border }]}>
          <Feather name={task.status === "done" ? "check-circle" : "circle"} size={18} color={task.status === "done" ? "#7BD389" : colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.rowTitle, { color: colors.foreground }]}>{task.title}</Text>
            <Text style={[styles.rowMeta, { color: colors.mutedForeground }]}>{task.due_date || "No due date"} / {task.priority} / {task.status}</Text>
            {task.detail ? <Text style={[styles.rowBody, { color: colors.mutedForeground }]}>{task.detail}</Text> : null}
          </View>
          <Pressable onPress={() => onStatus(task, task.status === "done" ? "open" : "done")} style={[styles.smallButton, { borderColor: colors.primary }]}>
            <Text style={[styles.smallButtonText, { color: colors.primary }]}>{task.status === "done" ? "Reopen" : "Done"}</Text>
          </Pressable>
        </View>
      )) : <EmptyText text="No tasks yet." />}
    </View>
  );
}

function ActivityPanel({ items }: { items: BrokerActivity[] }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.panel, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[styles.panelTitle, { color: colors.foreground }]}>Activity Timeline</Text>
      {items.length ? items.map((item) => (
        <View key={item.id} style={[styles.listRow, { borderBottomColor: colors.border }]}>
          <Feather name="message-circle" size={18} color={colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.rowTitle, { color: colors.foreground }]}>{item.subject || item.activity_type}</Text>
            <Text style={[styles.rowMeta, { color: colors.mutedForeground }]}>{item.happened_at?.slice(0, 16).replace("T", " ")} / {item.channel || "note"}</Text>
            {item.body ? <Text style={[styles.rowBody, { color: colors.mutedForeground }]}>{item.body}</Text> : null}
          </View>
        </View>
      )) : <EmptyText text="No activity yet." />}
    </View>
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

function Metric({ label, value }: { label: string; value: string }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.metricCard, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
      <Text style={[styles.metricValue, { color: colors.foreground }]}>{value}</Text>
      <Text style={[styles.metricLabel, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}

function CenterPanel({ title, copy, danger }: { title: string; copy?: string; danger?: boolean }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.centerPanel, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {danger ? <Feather name="alert-circle" size={28} color="#E77777" /> : <ActivityIndicator color={colors.primary} />}
      <Text style={[styles.emptyTitle, { color: colors.foreground }]}>{title}</Text>
      {copy ? <Text style={[styles.emptyCopy, { color: colors.mutedForeground }]}>{copy}</Text> : null}
    </View>
  );
}

function EmptyText({ text }: { text: string }) {
  const { colors } = useTheme();
  return <Text style={[styles.emptyCopy, { color: colors.mutedForeground, textAlign: "left" }]}>{text}</Text>;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: 22 },
  webScroll: { maxWidth: 1280, width: "100%", alignSelf: "center" },
  topbar: { flexDirection: "row", alignItems: "flex-start", gap: 12, marginBottom: 16 },
  iconButton: { width: 46, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  titleBlock: { flex: 1, minWidth: 0, paddingTop: 1 },
  kicker: { fontFamily: "Inter_700Bold", fontSize: 12, letterSpacing: 2.2 },
  acidKicker: { letterSpacing: 3.2 },
  title: { fontFamily: "Gilroy-ExtraBold", fontSize: Platform.OS === "web" ? 32 : 27, lineHeight: Platform.OS === "web" ? 38 : 32, marginTop: 4 },
  subtitle: { fontFamily: "Inter_400Regular", fontSize: 13, marginTop: 4, lineHeight: 19, textTransform: "capitalize" },
  actionRow: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 14 },
  primaryButton: { minHeight: 52, borderRadius: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9, paddingHorizontal: 18, flexGrow: 1 },
  primaryText: { fontFamily: "Inter_700Bold", fontSize: 15, textAlign: "center", flexShrink: 1 },
  secondaryButton: { minHeight: 48, borderRadius: 14, borderWidth: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9, paddingHorizontal: 16, flexGrow: 1 },
  secondaryText: { fontFamily: "Inter_700Bold", fontSize: 13, textAlign: "center", flexShrink: 1 },
  metricsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 14 },
  metricCard: { flexGrow: 1, flexBasis: Platform.OS === "web" ? 220 : "47%", borderRadius: 14, borderWidth: 1, padding: 14 },
  metricValue: { fontFamily: "Inter_700Bold", fontSize: Platform.OS === "web" ? 20 : 17, lineHeight: Platform.OS === "web" ? 25 : 22 },
  metricLabel: { fontFamily: "Inter_600SemiBold", fontSize: 12, marginTop: 5 },
  layoutGrid: { gap: 14, flexDirection: Platform.OS === "web" ? "row" : "column", alignItems: "flex-start", marginBottom: 14 },
  panel: { flex: 1, width: "100%", borderRadius: 16, borderWidth: 1, padding: 16, gap: 10 },
  sideColumn: { flex: 0.78, width: "100%", gap: 14 },
  panelTitle: { fontFamily: "Inter_700Bold", fontSize: 18, lineHeight: 23, marginBottom: 2 },
  twoCol: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  field: { flex: 1, minWidth: Platform.OS === "web" ? 240 : "100%" },
  label: { fontFamily: "Inter_700Bold", fontSize: 11, letterSpacing: 1.1, textTransform: "uppercase", marginBottom: 6, marginTop: 2 },
  input: { minHeight: 48, borderRadius: 12, borderWidth: 1, fontFamily: "Inter_500Medium", fontSize: 15, paddingHorizontal: 13, paddingVertical: 11 },
  textarea: { minHeight: 96, textAlignVertical: "top" },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 4 },
  chip: { borderRadius: 999, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 9 },
  chipText: { fontFamily: "Inter_700Bold", fontSize: 12, textTransform: "capitalize" },
  listRow: { flexDirection: "row", gap: 11, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, alignItems: "flex-start" },
  rowTitle: { fontFamily: "Inter_700Bold", fontSize: 15, lineHeight: 20 },
  rowMeta: { fontFamily: "Inter_500Medium", fontSize: 12, marginTop: 4, textTransform: "capitalize" },
  rowBody: { fontFamily: "Inter_400Regular", fontSize: 13, lineHeight: 18, marginTop: 7 },
  smallButton: { borderWidth: 1, borderRadius: 999, alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 7, flexShrink: 0 },
  smallButtonText: { fontFamily: "Inter_700Bold", fontSize: 12 },
  centerPanel: { minHeight: 260, alignItems: "center", justifyContent: "center", gap: 10, borderRadius: 16, borderWidth: 1, padding: 24 },
  emptyTitle: { fontFamily: "Inter_700Bold", fontSize: 16, textAlign: "center" },
  emptyCopy: { fontFamily: "Inter_400Regular", fontSize: 13, textAlign: "center", lineHeight: 19 },
});
