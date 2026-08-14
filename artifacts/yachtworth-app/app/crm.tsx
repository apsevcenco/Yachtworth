import { Feather } from "@expo/vector-icons";
import { useAuth } from "@clerk/expo";
import { useLocalSearchParams, useRouter } from "expo-router";
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
  createBrokerContact,
  createBrokerContactActivity,
  createBrokerContactTask,
  createBrokerCase,
  deleteBrokerContact,
  getBrokerContact,
  getBrokerContacts,
  importCharterClientsToBrokerOs,
  updateBrokerContact,
  type BrokerActivity,
  type BrokerContact,
  type BrokerContactDetail,
  type BrokerContactsResponse,
  type BrokerContactTask,
  type UpsertBrokerContactInput,
} from "../lib/brokerOs";

type ContactDraft = {
  full_name: string;
  email: string;
  phone: string;
  whatsapp: string;
  linkedin: string;
  country: string;
  citizenship: string;
  residency: string;
  languages: string;
  preferred_channel: string;
  relationship_owner: string;
  relationship_type: string;
  trust_level: string;
  source: string;
  notes: string;
};

type TaskDraft = {
  title: string;
  detail: string;
  due_date: string;
  priority: "low" | "normal" | "high" | "urgent";
};

type ActivityDraft = {
  channel: "phone" | "email" | "whatsapp" | "meeting" | "note" | "other";
  subject: string;
  body: string;
};

const EMPTY_CONTACT: ContactDraft = {
  full_name: "",
  email: "",
  phone: "",
  whatsapp: "",
  linkedin: "",
  country: "",
  citizenship: "",
  residency: "",
  languages: "",
  preferred_channel: "whatsapp",
  relationship_owner: "",
  relationship_type: "client",
  trust_level: "new",
  source: "manual",
  notes: "",
};

const EMPTY_TASK: TaskDraft = {
  title: "",
  detail: "",
  due_date: "",
  priority: "normal",
};

const EMPTY_ACTIVITY: ActivityDraft = {
  channel: "note",
  subject: "",
  body: "",
};

const RELATIONSHIP_TYPES = ["client", "owner", "buyer", "seller", "charterer", "broker", "lawyer", "captain", "partner"];
const TRUST_LEVELS = ["new", "warm", "trusted", "vip", "watch"];
const CHANNELS: ActivityDraft["channel"][] = ["note", "phone", "email", "whatsapp", "meeting", "other"];
const PRIORITIES: TaskDraft["priority"][] = ["low", "normal", "high", "urgent"];

function sourceLabel(source: string | null | undefined): string {
  if (!source) return "manual";
  return source.replace(/_/g, " ");
}

function display(v: string | null | undefined): string {
  return v?.trim() || "-";
}

function fmtDate(v: string | null | undefined): string {
  if (!v) return "-";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("en-GB");
}

function fmtDateTime(v: string | null | undefined): string {
  if (!v) return "-";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

function draftFromContact(item: BrokerContact): ContactDraft {
  return {
    full_name: item.full_name ?? "",
    email: item.email ?? "",
    phone: item.phone ?? "",
    whatsapp: item.whatsapp ?? "",
    linkedin: item.linkedin ?? "",
    country: item.country ?? "",
    citizenship: item.citizenship ?? "",
    residency: item.residency ?? "",
    languages: item.languages?.join(", ") ?? "",
    preferred_channel: item.preferred_channel ?? "whatsapp",
    relationship_owner: item.relationship_owner ?? "",
    relationship_type: item.relationship_type ?? "client",
    trust_level: item.trust_level ?? "new",
    source: item.source ?? "manual",
    notes: item.notes ?? "",
  };
}

function draftPayload(draft: ContactDraft): UpsertBrokerContactInput {
  return {
    full_name: draft.full_name.trim(),
    email: draft.email.trim() || null,
    phone: draft.phone.trim() || null,
    whatsapp: draft.whatsapp.trim() || null,
    linkedin: draft.linkedin.trim() || null,
    country: draft.country.trim() || null,
    citizenship: draft.citizenship.trim() || null,
    residency: draft.residency.trim() || null,
    languages: draft.languages
      .split(/[,\n]/)
      .map((v) => v.trim())
      .filter(Boolean),
    preferred_channel: draft.preferred_channel.trim() || null,
    relationship_owner: draft.relationship_owner.trim() || null,
    relationship_type: draft.relationship_type.trim() || null,
    trust_level: draft.trust_level.trim() || null,
    source: draft.source.trim() || "manual",
    notes: draft.notes.trim() || null,
  };
}

export default function CrmScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ contactId?: string }>();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const { colors, isAcid } = useTheme();
  const { isLoaded, isSignedIn } = useAuth();

  const [data, setData] = useState<BrokerContactsResponse | null>(null);
  const [detail, setDetail] = useState<BrokerContactDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [source, setSource] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<ContactDraft>(EMPTY_CONTACT);
  const [taskDraft, setTaskDraft] = useState<TaskDraft>(EMPTY_TASK);
  const [activityDraft, setActivityDraft] = useState<ActivityDraft>(EMPTY_ACTIVITY);

  async function loadContacts(keepSelection = true) {
    if (!isSignedIn) return;
    setLoading(true);
    setError(null);
    try {
      const result = await getBrokerContacts({ q: search, source });
      setData(result);
      setSelectedId((prev) => {
        const contactId = Array.isArray(params.contactId) ? params.contactId[0] : params.contactId;
        if (contactId && result.items.some((item) => item.id === contactId)) return contactId;
        if (keepSelection && prev && result.items.some((item) => item.id === prev)) return prev;
        return result.items[0]?.id ?? null;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  async function loadDetail(contactId: string | null) {
    if (!contactId || !isSignedIn) {
      setDetail(null);
      return;
    }
    setDetailLoading(true);
    try {
      setDetail(await getBrokerContact(contactId));
    } catch (err) {
      Alert.alert("Could not load client", err instanceof Error ? err.message : String(err));
    } finally {
      setDetailLoading(false);
    }
  }

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      setLoading(false);
      return;
    }
    const timer = setTimeout(() => {
      loadContacts().catch(() => {});
    }, 220);
    return () => clearTimeout(timer);
  }, [isLoaded, isSignedIn, search, source, params.contactId]);

  useEffect(() => {
    loadDetail(selectedId).catch(() => {});
  }, [selectedId, isSignedIn]);

  const sources = useMemo(() => ["all", ...(data?.filters.sources ?? [])], [data?.filters.sources]);
  const selected = detail?.item ?? data?.items.find((item) => item.id === selectedId) ?? null;
  const activeCases = detail?.cases.filter((item) => item.status === "active").length ?? selected?.active_cases_count ?? 0;
  const openTasks = detail?.tasks.filter((task) => task.status === "open").length ?? 0;
  const showInitialLoading = !isLoaded || (loading && !data);

  function openCreateForm() {
    setEditingId(null);
    setDraft(EMPTY_CONTACT);
    setFormOpen(true);
  }

  function openEditForm() {
    if (!selected) return;
    setEditingId(selected.id);
    setDraft(draftFromContact(selected));
    setFormOpen(true);
  }

  async function saveContact() {
    const payload = draftPayload(draft);
    if (!payload.full_name) {
      Alert.alert("Name required", "Add client or company contact name.");
      return;
    }
    setSaving(true);
    try {
      const result = editingId
        ? await updateBrokerContact(editingId, payload)
        : await createBrokerContact(payload);
      setFormOpen(false);
      setEditingId(null);
      setSelectedId(result.item.id);
      await loadContacts(true);
      await loadDetail(result.item.id);
    } catch (err) {
      Alert.alert("Could not save client", err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  async function removeContact() {
    if (!selected) return;
    Alert.alert("Remove client", `Remove ${selected.full_name} from CRM? Broker OS cases stay in the system.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteBrokerContact(selected.id);
            setDetail(null);
            setSelectedId(null);
            await loadContacts(false);
          } catch (err) {
            Alert.alert("Could not remove client", err instanceof Error ? err.message : String(err));
          }
        },
      },
    ]);
  }

  async function importClients() {
    setImporting(true);
    try {
      const result = await importCharterClientsToBrokerOs();
      Alert.alert("Imported", `${result.imported} charter client${result.imported === 1 ? "" : "s"} linked to CRM.`);
      await loadContacts();
    } catch (err) {
      Alert.alert("Import failed", err instanceof Error ? err.message : String(err));
    } finally {
      setImporting(false);
    }
  }

  async function addTask() {
    if (!selected) return;
    if (!taskDraft.title.trim()) {
      Alert.alert("Task title required", "Add a short follow-up title.");
      return;
    }
    try {
      await createBrokerContactTask(selected.id, {
        title: taskDraft.title.trim(),
        detail: taskDraft.detail.trim() || null,
        due_date: taskDraft.due_date.trim() || null,
        priority: taskDraft.priority,
      });
      setTaskDraft(EMPTY_TASK);
      await loadDetail(selected.id);
    } catch (err) {
      Alert.alert("Could not add task", err instanceof Error ? err.message : String(err));
    }
  }

  async function addActivity() {
    if (!selected) return;
    if (!activityDraft.body.trim() && !activityDraft.subject.trim()) {
      Alert.alert("Note required", "Add a note or subject.");
      return;
    }
    try {
      await createBrokerContactActivity(selected.id, {
        channel: activityDraft.channel,
        subject: activityDraft.subject.trim() || "CRM note",
        body: activityDraft.body.trim() || null,
      });
      setActivityDraft(EMPTY_ACTIVITY);
      await loadDetail(selected.id);
    } catch (err) {
      Alert.alert("Could not add note", err instanceof Error ? err.message : String(err));
    }
  }

  function openCase(caseId: string) {
    router.push({ pathname: "/broker-case-detail", params: { id: caseId } } as never);
  }

  async function createCaseFromSelected() {
    if (!selected) return;
    try {
      const result = await createBrokerCase({
        contact_id: selected.id,
        title: `${selected.full_name} - New brokerage case`,
        owner_name: selected.full_name,
        case_type: "buyer_inquiry",
        stage: "new_inquiry",
        status: "active",
        lead_score: "B",
        risk_level: "medium",
        close_probability: 30,
        notes: selected.notes,
      });
      router.push({ pathname: "/broker-case-detail", params: { id: result.item.id } } as never);
    } catch (err) {
      Alert.alert("Could not create case", err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <View style={[styles.root, { paddingTop: (isWeb ? 62 : insets.top) + 64, backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[styles.scroll, isWeb && styles.webScroll, { paddingBottom: insets.bottom + 44 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topbar}>
          <Pressable onPress={() => router.back()} style={[styles.iconButton, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
            <Feather name="arrow-left" size={22} color={colors.foreground} />
          </Pressable>
          <View style={styles.titleBlock}>
            <Text style={[styles.kicker, { color: colors.primary }, isAcid && styles.acidText]}>YACHTWORTH</Text>
            <Text style={[styles.title, { color: colors.foreground }, isAcid && styles.acidTitle]}>CRM</Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Clients, companies, follow-ups and linked Broker OS cases.</Text>
          </View>
        </View>

        {showInitialLoading ? (
          <CenterPanel icon="loader" title="Loading CRM" colors={colors} />
        ) : !isSignedIn ? (
          <CenterPanel icon="lock" title="Sign in required" colors={colors} />
        ) : error ? (
          <CenterPanel icon="alert-circle" title="Could not load CRM" copy={error} colors={colors} danger />
        ) : (
          <>
            <View style={styles.actions}>
              <View style={[styles.searchBox, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
                <Feather name="search" size={17} color={colors.mutedForeground} />
                <TextInput
                  value={search}
                  onChangeText={setSearch}
                  placeholder="Search name, email, phone, country or notes"
                  placeholderTextColor={colors.mutedForeground}
                  style={[styles.searchInput, { color: colors.foreground }]}
                />
              </View>
              <Pressable onPress={openCreateForm} style={[styles.primaryButton, { backgroundColor: colors.primary }]}>
                <Feather name="user-plus" size={17} color={colors.background} />
                <Text style={[styles.primaryText, { color: colors.background }]}>New client</Text>
              </Pressable>
              <Pressable onPress={importClients} disabled={importing} style={[styles.secondaryButton, { borderColor: colors.primary, backgroundColor: colors.glow ?? "transparent" }]}>
                {importing ? <ActivityIndicator color={colors.primary} /> : <Feather name="download" size={16} color={colors.primary} />}
                <Text style={[styles.secondaryText, { color: colors.primary }]}>Import charter clients</Text>
              </Pressable>
              {loading ? <ActivityIndicator color={colors.primary} style={styles.inlineLoader} /> : null}
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
              {sources.map((s) => {
                const active = source === s;
                return (
                  <Pressable
                    key={s}
                    onPress={() => setSource(s)}
                    style={[
                      styles.filterChip,
                      { backgroundColor: colors.secondary, borderColor: active ? colors.primary : colors.border },
                      active && { backgroundColor: colors.glow ?? colors.secondary },
                    ]}
                  >
                    <Text style={[styles.filterText, { color: active ? colors.primary : colors.mutedForeground }]}>{sourceLabel(s)}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <View style={styles.summaryRow}>
              <Metric label="Visible clients" value={data?.total ?? 0} icon="users" />
              <Metric label="Active cases" value={data?.items.reduce((sum, item) => sum + item.active_cases_count, 0) ?? 0} icon="briefcase" />
              <Metric label="Open tasks" value={openTasks} icon="check-square" />
              <Metric label="Selected cases" value={activeCases} icon="target" />
            </View>

            <View style={[styles.layout, isWeb && styles.webLayout]}>
              <View style={[styles.panel, styles.listPanel, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.panelTitle, { color: colors.foreground }]}>Clients</Text>
                {data?.items.length ? (
                  data.items.map((item) => (
                    <ContactRow key={item.id} item={item} active={selected?.id === item.id} onPress={() => setSelectedId(item.id)} />
                  ))
                ) : (
                  <EmptyBlock title="No clients found" copy="Create a client or import Charter Planner clients." />
                )}
              </View>

              <View style={[styles.panel, styles.detailPanel, { backgroundColor: colors.card, borderColor: colors.border }]}>
                {detailLoading ? (
                  <View style={styles.detailLoader}>
                    <ActivityIndicator color={colors.primary} />
                  </View>
                ) : selected ? (
                  <ContactDetail
                    contact={selected}
                    cases={detail?.cases ?? selected.cases}
                    tasks={detail?.tasks ?? []}
                    activity={detail?.activity ?? []}
                    onEdit={openEditForm}
                    onDelete={removeContact}
                    taskDraft={taskDraft}
                    setTaskDraft={setTaskDraft}
                    addTask={addTask}
                    activityDraft={activityDraft}
                    setActivityDraft={setActivityDraft}
                    addActivity={addActivity}
                    onOpenCase={openCase}
                    onCreateCase={createCaseFromSelected}
                  />
                ) : (
                  <EmptyBlock title="Select a client" copy="Client details, communication history and follow-ups appear here." />
                )}
              </View>
            </View>
          </>
        )}
      </ScrollView>

      <ContactFormModal
        visible={formOpen}
        draft={draft}
        setDraft={setDraft}
        saving={saving}
        editing={Boolean(editingId)}
        onClose={() => setFormOpen(false)}
        onSave={saveContact}
      />
    </View>
  );
}

function Metric({ label, value, icon }: { label: string; value: number; icon: keyof typeof Feather.glyphMap }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.summaryCard, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
      <Feather name={icon} size={17} color={colors.primary} />
      <Text style={[styles.summaryValue, { color: colors.foreground }]}>{value}</Text>
      <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}

function ContactRow({ item, active, onPress }: { item: BrokerContact; active: boolean; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.contactRow,
        { backgroundColor: colors.secondary, borderColor: active ? colors.primary : colors.border },
        active && { backgroundColor: colors.glow ?? colors.secondary },
      ]}
    >
      <View style={[styles.avatar, { backgroundColor: colors.glow ?? colors.card, borderColor: colors.border }]}>
        <Text style={[styles.avatarText, { color: colors.primary }]}>{(item.full_name || "?").slice(0, 1).toUpperCase()}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.contactName, { color: colors.foreground }]} numberOfLines={1}>{item.full_name}</Text>
        <Text style={[styles.contactMeta, { color: colors.mutedForeground }]} numberOfLines={1}>{display(item.email)} / {display(item.phone)}</Text>
        <View style={styles.badgeRow}>
          <Text style={[styles.badge, { color: colors.primary, backgroundColor: colors.glow ?? colors.card }]}>{sourceLabel(item.source)}</Text>
          <Text style={[styles.badge, { color: colors.primary, backgroundColor: colors.glow ?? colors.card }]}>{item.active_cases_count} active</Text>
        </View>
      </View>
      <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
    </Pressable>
  );
}

function ContactDetail(props: {
  contact: BrokerContact;
  cases: BrokerContact["cases"];
  tasks: BrokerContactTask[];
  activity: BrokerActivity[];
  onEdit: () => void;
  onDelete: () => void;
  onOpenCase: (caseId: string) => void;
  onCreateCase: () => void;
  taskDraft: TaskDraft;
  setTaskDraft: React.Dispatch<React.SetStateAction<TaskDraft>>;
  addTask: () => void;
  activityDraft: ActivityDraft;
  setActivityDraft: React.Dispatch<React.SetStateAction<ActivityDraft>>;
  addActivity: () => void;
}) {
  const { colors } = useTheme();
  const c = props.contact;
  return (
    <View style={styles.detail}>
      <View style={styles.detailHeader}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.panelTitle, { color: colors.foreground }]}>Client Card</Text>
          <Text style={[styles.detailName, { color: colors.foreground }]}>{c.full_name}</Text>
          <Text style={[styles.detailMeta, { color: colors.mutedForeground }]}>{sourceLabel(c.source)} / updated {fmtDate(c.updated_at)}</Text>
        </View>
        <View style={styles.detailActions}>
          <Pressable onPress={props.onCreateCase} style={[styles.smallButton, { borderColor: colors.primary, backgroundColor: colors.glow ?? "transparent" }]}>
            <Feather name="briefcase" size={15} color={colors.primary} />
            <Text style={[styles.smallButtonText, { color: colors.primary }]}>Create case</Text>
          </Pressable>
          <Pressable onPress={props.onEdit} style={[styles.smallButton, { borderColor: colors.primary, backgroundColor: colors.glow ?? "transparent" }]}>
            <Feather name="edit-2" size={15} color={colors.primary} />
            <Text style={[styles.smallButtonText, { color: colors.primary }]}>Edit</Text>
          </Pressable>
          <Pressable onPress={props.onDelete} style={[styles.iconDanger, { borderColor: colors.border }]}>
            <Feather name="trash-2" size={16} color="#E77777" />
          </Pressable>
        </View>
      </View>

      <View style={styles.grid}>
        <Fact label="Email" text={display(c.email)} />
        <Fact label="Phone" text={display(c.phone)} />
        <Fact label="WhatsApp" text={display(c.whatsapp)} />
        <Fact label="LinkedIn" text={display(c.linkedin)} />
        <Fact label="Country" text={display(c.country)} />
        <Fact label="Citizenship" text={display(c.citizenship)} />
        <Fact label="Residency" text={display(c.residency)} />
        <Fact label="Languages" text={c.languages?.length ? c.languages.join(", ") : "-"} />
        <Fact label="Preferred channel" text={display(c.preferred_channel)} />
        <Fact label="Relationship" text={display(c.relationship_type)} />
        <Fact label="Trust level" text={display(c.trust_level)} />
        <Fact label="Owner" text={display(c.relationship_owner)} />
      </View>

      {c.notes ? <TextPanel title="Notes" text={c.notes} /> : null}

      <View style={styles.split}>
        <View style={styles.subPanel}>
          <SectionTitle title="Follow-up task" />
          <Input label="Task" value={props.taskDraft.title} onChangeText={(v) => props.setTaskDraft((d) => ({ ...d, title: v }))} placeholder="Call before Monaco Yacht Show" />
          <Input label="Due date" value={props.taskDraft.due_date} onChangeText={(v) => props.setTaskDraft((d) => ({ ...d, due_date: v }))} placeholder="YYYY-MM-DD" />
          <ChipRow
            items={PRIORITIES}
            active={props.taskDraft.priority}
            onChange={(priority) => props.setTaskDraft((d) => ({ ...d, priority }))}
          />
          <Input label="Detail" value={props.taskDraft.detail} onChangeText={(v) => props.setTaskDraft((d) => ({ ...d, detail: v }))} multiline />
          <Pressable onPress={props.addTask} style={[styles.primaryButton, { backgroundColor: colors.primary }]}>
            <Feather name="plus" size={16} color={colors.background} />
            <Text style={[styles.primaryText, { color: colors.background }]}>Add task</Text>
          </Pressable>
        </View>

        <View style={styles.subPanel}>
          <SectionTitle title="Activity note" />
          <ChipRow
            items={CHANNELS}
            active={props.activityDraft.channel}
            onChange={(channel) => props.setActivityDraft((d) => ({ ...d, channel }))}
          />
          <Input label="Subject" value={props.activityDraft.subject} onChangeText={(v) => props.setActivityDraft((d) => ({ ...d, subject: v }))} placeholder="Intro call" />
          <Input label="Note" value={props.activityDraft.body} onChangeText={(v) => props.setActivityDraft((d) => ({ ...d, body: v }))} multiline />
          <Pressable onPress={props.addActivity} style={[styles.secondaryButton, { borderColor: colors.primary, backgroundColor: colors.glow ?? "transparent" }]}>
            <Feather name="message-square" size={16} color={colors.primary} />
            <Text style={[styles.secondaryText, { color: colors.primary }]}>Save note</Text>
          </Pressable>
        </View>
      </View>

      <SectionTitle title="Linked Broker OS cases" />
      {props.cases.length ? props.cases.map((item) => <CaseRow key={item.id} item={item} onPress={() => props.onOpenCase(item.id)} />) : <EmptyBlock title="No linked cases" copy="Create Broker OS cases from this client when they become an active opportunity." />}

      <SectionTitle title="Open tasks" />
      {props.tasks.length ? props.tasks.map((task) => <TaskRow key={task.id} task={task} />) : <EmptyInline text="No tasks for this client." />}

      <SectionTitle title="Activity timeline" />
      {props.activity.length ? props.activity.map((item) => <ActivityRow key={item.id} item={item} />) : <EmptyInline text="No activity recorded yet." />}
    </View>
  );
}

function ContactFormModal(props: {
  visible: boolean;
  draft: ContactDraft;
  setDraft: React.Dispatch<React.SetStateAction<ContactDraft>>;
  saving: boolean;
  editing: boolean;
  onClose: () => void;
  onSave: () => void;
}) {
  const { colors } = useTheme();
  const isWeb = Platform.OS === "web";
  return (
    <Modal visible={props.visible} animationType="slide" transparent onRequestClose={props.onClose}>
      <View style={styles.modalBackdrop}>
        <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }, isWeb && styles.modalWeb]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>{props.editing ? "Edit client" : "New client"}</Text>
            <Pressable onPress={props.onClose} style={[styles.roundIcon, { backgroundColor: colors.secondary }]}>
              <Feather name="x" size={20} color={colors.foreground} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.modalScroll}>
            <Input label="Full name / company" value={props.draft.full_name} onChangeText={(v) => props.setDraft((d) => ({ ...d, full_name: v }))} />
            <View style={styles.twoCol}>
              <Input label="Email" value={props.draft.email} onChangeText={(v) => props.setDraft((d) => ({ ...d, email: v }))} />
              <Input label="Phone" value={props.draft.phone} onChangeText={(v) => props.setDraft((d) => ({ ...d, phone: v }))} />
              <Input label="WhatsApp" value={props.draft.whatsapp} onChangeText={(v) => props.setDraft((d) => ({ ...d, whatsapp: v }))} />
              <Input label="LinkedIn" value={props.draft.linkedin} onChangeText={(v) => props.setDraft((d) => ({ ...d, linkedin: v }))} />
              <Input label="Country" value={props.draft.country} onChangeText={(v) => props.setDraft((d) => ({ ...d, country: v }))} />
              <Input label="Citizenship" value={props.draft.citizenship} onChangeText={(v) => props.setDraft((d) => ({ ...d, citizenship: v }))} />
              <Input label="Residency" value={props.draft.residency} onChangeText={(v) => props.setDraft((d) => ({ ...d, residency: v }))} />
              <Input label="Languages" value={props.draft.languages} onChangeText={(v) => props.setDraft((d) => ({ ...d, languages: v }))} placeholder="English, French" />
            </View>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>Relationship type</Text>
            <ChipRow items={RELATIONSHIP_TYPES} active={props.draft.relationship_type} onChange={(relationship_type) => props.setDraft((d) => ({ ...d, relationship_type }))} />
            <Text style={[styles.label, { color: colors.mutedForeground }]}>Trust level</Text>
            <ChipRow items={TRUST_LEVELS} active={props.draft.trust_level} onChange={(trust_level) => props.setDraft((d) => ({ ...d, trust_level }))} />
            <View style={styles.twoCol}>
              <Input label="Preferred channel" value={props.draft.preferred_channel} onChangeText={(v) => props.setDraft((d) => ({ ...d, preferred_channel: v }))} />
              <Input label="Relationship owner" value={props.draft.relationship_owner} onChangeText={(v) => props.setDraft((d) => ({ ...d, relationship_owner: v }))} />
              <Input label="Source" value={props.draft.source} onChangeText={(v) => props.setDraft((d) => ({ ...d, source: v }))} />
            </View>
            <Input label="Notes" value={props.draft.notes} onChangeText={(v) => props.setDraft((d) => ({ ...d, notes: v }))} multiline />
            <Pressable onPress={props.onSave} disabled={props.saving} style={[styles.primaryButton, { backgroundColor: colors.primary }, props.saving && { opacity: 0.7 }]}>
              {props.saving ? <ActivityIndicator color={colors.background} /> : <Feather name="save" size={17} color={colors.background} />}
              <Text style={[styles.primaryText, { color: colors.background }]}>{props.editing ? "Save changes" : "Create client"}</Text>
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function Input(props: { label: string; value: string; onChangeText: (v: string) => void; placeholder?: string; multiline?: boolean }) {
  const { colors } = useTheme();
  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: colors.mutedForeground }]}>{props.label}</Text>
      <TextInput
        value={props.value}
        onChangeText={props.onChangeText}
        placeholder={props.placeholder}
        placeholderTextColor={colors.mutedForeground}
        multiline={props.multiline}
        style={[
          styles.input,
          { backgroundColor: colors.secondary, borderColor: colors.border, color: colors.foreground },
          props.multiline && styles.textarea,
        ]}
      />
    </View>
  );
}

function ChipRow<T extends string>({ items, active, onChange }: { items: readonly T[]; active: T | string; onChange: (v: T) => void }) {
  const { colors } = useTheme();
  return (
    <View style={styles.chipRow}>
      {items.map((item) => {
        const selected = item === active;
        return (
          <Pressable
            key={item}
            onPress={() => onChange(item)}
            style={[
              styles.chip,
              { backgroundColor: colors.secondary, borderColor: selected ? colors.primary : colors.border },
              selected && { backgroundColor: colors.glow ?? colors.secondary },
            ]}
          >
            <Text style={[styles.chipText, { color: selected ? colors.primary : colors.mutedForeground }]}>{item.replace(/_/g, " ")}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function Fact({ label, text }: { label: string; text: string }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.fact, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
      <Text style={[styles.factLabel, { color: colors.mutedForeground }]}>{label}</Text>
      <Text style={[styles.factText, { color: colors.foreground }]}>{text}</Text>
    </View>
  );
}

function TextPanel({ title, text }: { title: string; text: string }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.textPanel, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
      <Text style={[styles.factLabel, { color: colors.mutedForeground }]}>{title}</Text>
      <Text style={[styles.notes, { color: colors.foreground }]}>{text}</Text>
    </View>
  );
}

function SectionTitle({ title }: { title: string }) {
  const { colors } = useTheme();
  return <Text style={[styles.sectionTitle, { color: colors.primary }]}>{title}</Text>;
}

function CaseRow({ item, onPress }: { item: BrokerContact["cases"][number]; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable onPress={onPress} style={[styles.rowCard, styles.openableRow, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
      <View style={{ flex: 1 }}>
        <Text style={[styles.rowTitle, { color: colors.foreground }]}>{item.title}</Text>
        <Text style={[styles.rowMeta, { color: colors.mutedForeground }]}>{item.case_type.replace(/_/g, " ")} / {item.stage.replace(/_/g, " ")} / {item.status}</Text>
      </View>
      <Feather name="arrow-up-right" size={17} color={colors.primary} />
    </Pressable>
  );
}

function TaskRow({ task }: { task: BrokerContactTask }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.rowCard, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
      <Text style={[styles.rowTitle, { color: colors.foreground }]}>{task.title}</Text>
      <Text style={[styles.rowMeta, { color: colors.mutedForeground }]}>{task.due_date ? `Due ${task.due_date}` : "No due date"} / {task.priority} / {task.status}</Text>
      {task.detail ? <Text style={[styles.rowBody, { color: colors.foreground }]}>{task.detail}</Text> : null}
    </View>
  );
}

function ActivityRow({ item }: { item: BrokerActivity }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.rowCard, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
      <Text style={[styles.rowTitle, { color: colors.foreground }]}>{item.subject || item.activity_type}</Text>
      <Text style={[styles.rowMeta, { color: colors.mutedForeground }]}>{sourceLabel(item.channel)} / {fmtDateTime(item.happened_at)}</Text>
      {item.body ? <Text style={[styles.rowBody, { color: colors.foreground }]}>{item.body}</Text> : null}
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

function EmptyInline({ text }: { text: string }) {
  const { colors } = useTheme();
  return <Text style={[styles.emptyInline, { color: colors.mutedForeground, borderColor: colors.border }]}>{text}</Text>;
}

function CenterPanel({ icon, title, copy, colors, danger }: { icon: keyof typeof Feather.glyphMap; title: string; copy?: string; colors: ReturnType<typeof useTheme>["colors"]; danger?: boolean }) {
  return (
    <View style={[styles.centerPanel, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {icon === "loader" ? <ActivityIndicator color={colors.primary} /> : <Feather name={icon} size={28} color={danger ? "#E77777" : colors.primary} />}
      <Text style={[styles.emptyTitle, { color: colors.foreground }]}>{title}</Text>
      {copy ? <Text style={[styles.emptyCopy, { color: colors.mutedForeground }]}>{copy}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: 22 },
  webScroll: { maxWidth: 1280, width: "100%", alignSelf: "center" },
  topbar: { flexDirection: "row", alignItems: "flex-start", gap: 12, marginBottom: 18 },
  iconButton: { width: 46, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  titleBlock: { flex: 1, minWidth: 0, paddingTop: 1 },
  kicker: { fontFamily: "Inter_700Bold", fontSize: 12, letterSpacing: 2.2 },
  title: { fontFamily: "Gilroy-ExtraBold", fontSize: Platform.OS === "web" ? 36 : 31, lineHeight: Platform.OS === "web" ? 42 : 36, marginTop: 4 },
  acidTitle: { letterSpacing: 0.8, textTransform: "uppercase" },
  acidText: { letterSpacing: 3.2 },
  subtitle: { fontFamily: "Inter_400Regular", fontSize: 13, marginTop: 4, lineHeight: 19 },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 12 },
  searchBox: { flex: 1, minWidth: Platform.OS === "web" ? 260 : "100%", minHeight: 52, borderRadius: 14, borderWidth: 1, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", gap: 10 },
  searchInput: { flex: 1, fontFamily: "Inter_500Medium", fontSize: 14, minHeight: 46 },
  primaryButton: { minHeight: 52, borderRadius: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9, paddingHorizontal: 18, flexGrow: 1 },
  primaryText: { fontFamily: "Inter_800ExtraBold", fontSize: 15, textAlign: "center", flexShrink: 1 },
  secondaryButton: { minHeight: 52, borderRadius: 14, borderWidth: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9, paddingHorizontal: 16, flexGrow: 1 },
  secondaryText: { fontFamily: "Inter_800ExtraBold", fontSize: 13, textAlign: "center", flexShrink: 1 },
  inlineLoader: { alignSelf: "center", marginHorizontal: 4 },
  filterRow: { gap: 8, paddingBottom: 12 },
  filterChip: { borderRadius: 999, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 9 },
  filterText: { fontFamily: "Inter_800ExtraBold", fontSize: 12, textTransform: "capitalize" },
  summaryRow: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 14 },
  summaryCard: { flexGrow: 1, flexBasis: Platform.OS === "web" ? 180 : "47%", borderRadius: 14, borderWidth: 1, padding: 14 },
  summaryValue: { fontFamily: "Inter_800ExtraBold", fontSize: 26, marginTop: 8 },
  summaryLabel: { fontFamily: "Inter_600SemiBold", fontSize: 12, marginTop: 2 },
  layout: { gap: 14 },
  webLayout: { flexDirection: "row", alignItems: "flex-start" },
  panel: { borderRadius: 16, borderWidth: 1, padding: 16 },
  listPanel: { flex: Platform.OS === "web" ? 0.85 : 1 },
  detailPanel: { flex: Platform.OS === "web" ? 1.35 : 1 },
  panelTitle: { fontFamily: "Inter_800ExtraBold", fontSize: 18, lineHeight: 23, marginBottom: 12 },
  contactRow: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 14, borderWidth: 1, padding: 12, marginBottom: 10 },
  avatar: { width: 42, height: 42, borderRadius: 21, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  avatarText: { fontFamily: "Inter_800ExtraBold", fontSize: 18 },
  contactName: { fontFamily: "Inter_800ExtraBold", fontSize: 15, lineHeight: 20 },
  contactMeta: { fontFamily: "Inter_500Medium", fontSize: 12, marginTop: 3 },
  badgeRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 },
  badge: { fontFamily: "Inter_800ExtraBold", fontSize: 11, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 999, textTransform: "capitalize" },
  detail: { gap: 14 },
  detailLoader: { minHeight: 320, alignItems: "center", justifyContent: "center" },
  detailHeader: { flexDirection: Platform.OS === "web" ? "row" : "column", gap: 12, alignItems: "flex-start" },
  detailName: { fontFamily: "Gilroy-ExtraBold", fontSize: Platform.OS === "web" ? 27 : 24, lineHeight: Platform.OS === "web" ? 33 : 30 },
  detailMeta: { fontFamily: "Inter_500Medium", fontSize: 12, marginTop: 4, textTransform: "capitalize" },
  detailActions: { flexDirection: "row", flexWrap: "wrap", gap: 8, alignItems: "center" },
  smallButton: { minHeight: 38, borderRadius: 12, borderWidth: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, paddingHorizontal: 12 },
  smallButtonText: { fontFamily: "Inter_800ExtraBold", fontSize: 12, textAlign: "center", flexShrink: 1 },
  iconDanger: { width: 38, height: 38, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  fact: { flexGrow: 1, flexBasis: Platform.OS === "web" ? "30%" : "45%", borderRadius: 12, borderWidth: 1, padding: 12 },
  factLabel: { fontFamily: "Inter_700Bold", fontSize: 10, letterSpacing: 1.1, textTransform: "uppercase", marginBottom: 5 },
  factText: { fontFamily: "Inter_600SemiBold", fontSize: 13, lineHeight: 18 },
  textPanel: { borderRadius: 12, borderWidth: 1, padding: 12 },
  notes: { fontFamily: "Inter_400Regular", fontSize: 13, lineHeight: 20 },
  split: { flexDirection: Platform.OS === "web" ? "row" : "column", gap: 12 },
  subPanel: { flex: 1, gap: 10 },
  sectionTitle: { fontFamily: "Inter_800ExtraBold", fontSize: 14, marginTop: 4, textTransform: "uppercase", letterSpacing: 1.1 },
  rowCard: { borderRadius: 12, borderWidth: 1, padding: 12, gap: 4 },
  openableRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  rowTitle: { fontFamily: "Inter_800ExtraBold", fontSize: 14, lineHeight: 19 },
  rowMeta: { fontFamily: "Inter_500Medium", fontSize: 12, textTransform: "capitalize" },
  rowBody: { fontFamily: "Inter_400Regular", fontSize: 13, lineHeight: 19, marginTop: 4 },
  emptyBlock: { paddingVertical: 24, gap: 6, alignItems: "center" },
  emptyTitle: { fontFamily: "Inter_800ExtraBold", fontSize: 16, textAlign: "center" },
  emptyCopy: { fontFamily: "Inter_400Regular", fontSize: 13, textAlign: "center", lineHeight: 19 },
  emptyInline: { borderWidth: 1, borderRadius: 12, padding: 12, fontFamily: "Inter_500Medium", fontSize: 13 },
  centerPanel: { minHeight: 260, alignItems: "center", justifyContent: "center", gap: 10, borderRadius: 16, borderWidth: 1, padding: 24 },
  field: { flex: 1, minWidth: Platform.OS === "web" ? 240 : "100%" },
  label: { fontFamily: "Inter_700Bold", fontSize: 11, letterSpacing: 1.1, textTransform: "uppercase", marginBottom: 6 },
  input: { minHeight: 48, borderRadius: 12, borderWidth: 1, fontFamily: "Inter_500Medium", fontSize: 15, paddingHorizontal: 13, paddingVertical: 11 },
  textarea: { minHeight: 86, textAlignVertical: "top" },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { borderRadius: 999, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 9 },
  chipText: { fontFamily: "Inter_800ExtraBold", fontSize: 12, textTransform: "capitalize" },
  twoCol: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.58)", justifyContent: "flex-end" },
  modalCard: { maxHeight: "92%", borderTopLeftRadius: 22, borderTopRightRadius: 22, borderWidth: 1 },
  modalWeb: { width: 820, alignSelf: "center", borderRadius: 22, marginBottom: 30 },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 18, borderBottomWidth: 1 },
  modalTitle: { fontFamily: "Inter_800ExtraBold", fontSize: 20 },
  roundIcon: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  modalScroll: { padding: 18, gap: 12 },
});
