import { Feather } from "@expo/vector-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  createDefect,
  createEquipmentAsset,
  createMaintenancePlan,
  createServiceEvent,
  createSparePart,
  createWorkOrder,
  generateMaintenanceTask,
  getDefects,
  getEquipmentAssets,
  getMaintenanceDashboard,
  getMaintenanceSystems,
  getMaintenanceTasks,
  getServiceEvents,
  getSpareParts,
  getWorkOrders,
  getYachts,
  seedMaintenanceSystems,
  type Defect,
  type EquipmentAsset,
  type MaintenanceDashboard,
  type MaintenanceSystem,
  type MaintenanceTask,
  type ServiceEvent,
  type SparePart,
  type WorkOrder,
  type YachtOption,
} from "@/lib/maintenance";

const NAVY = "#0B1E3F";
const NAVY_DEEP = "#081633";
const PANEL = "#112A56";
const GOLD = "#C9A961";
const IVORY = "#F7F3EC";
const MUTED = "rgba(247,243,236,0.68)";
const LINE = "rgba(247,243,236,0.1)";
const RED = "#F08A8A";
const GREEN = "#7BD389";

type Tab = "overview" | "equipment" | "tasks" | "work" | "defects" | "history" | "parts";

const TABS: { key: Tab; label: string; icon: React.ComponentProps<typeof Feather>["name"] }[] = [
  { key: "overview", label: "Overview", icon: "grid" },
  { key: "equipment", label: "Equipment", icon: "cpu" },
  { key: "tasks", label: "Tasks", icon: "check-square" },
  { key: "work", label: "Work orders", icon: "tool" },
  { key: "defects", label: "Defects", icon: "alert-triangle" },
  { key: "history", label: "History", icon: "clock" },
  { key: "parts", label: "Parts", icon: "package" },
];

function yachtTitle(yacht: YachtOption | undefined): string {
  if (!yacht) return "Select yacht";
  return yacht.name ?? ([yacht.manufacturer, yacht.model].filter(Boolean).join(" ") || "Unnamed yacht");
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  multiline,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  multiline?: boolean;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="rgba(247,243,236,0.35)"
        multiline={multiline}
        style={[styles.input, multiline && styles.inputTall]}
      />
    </View>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <View style={styles.card}>{children}</View>;
}

function Empty({ text }: { text: string }) {
  return <Text style={styles.empty}>{text}</Text>;
}

function StatusPill({ value }: { value?: string | null }) {
  const status = value ?? "unknown";
  const color = status.includes("overdue") || status.includes("critical") ? RED : status.includes("complete") ? GREEN : GOLD;
  return (
    <View style={[styles.pill, { borderColor: color }]}>
      <Text style={[styles.pillText, { color }]}>{status}</Text>
    </View>
  );
}

export default function MaintenanceScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const { width } = useWindowDimensions();
  const isWide = Platform.OS === "web" && width >= 1000;
  const [tab, setTab] = useState<Tab>("overview");
  const [selectedYachtId, setSelectedYachtId] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const yachtsQ = useQuery({ queryKey: ["maintenance-yachts"], queryFn: getYachts });
  const yachts = yachtsQ.data ?? [];
  const yachtId = selectedYachtId ?? yachts[0]?.id ?? null;
  const yacht = yachts.find((item) => item.id === yachtId) ?? yachts[0];

  const dashboardQ = useQuery({
    queryKey: ["maintenance-dashboard", yachtId],
    queryFn: () => getMaintenanceDashboard(yachtId!),
    enabled: !!yachtId,
  });
  const systemsQ = useQuery({
    queryKey: ["maintenance-systems", yachtId],
    queryFn: () => getMaintenanceSystems(yachtId!),
    enabled: !!yachtId,
  });
  const assetsQ = useQuery({
    queryKey: ["maintenance-assets", yachtId],
    queryFn: () => getEquipmentAssets(yachtId!),
    enabled: !!yachtId,
  });
  const tasksQ = useQuery({
    queryKey: ["maintenance-tasks", yachtId],
    queryFn: () => getMaintenanceTasks(yachtId!),
    enabled: !!yachtId,
  });
  const workQ = useQuery({
    queryKey: ["maintenance-work-orders", yachtId],
    queryFn: () => getWorkOrders(yachtId!),
    enabled: !!yachtId,
  });
  const defectsQ = useQuery({
    queryKey: ["maintenance-defects", yachtId],
    queryFn: () => getDefects(yachtId!),
    enabled: !!yachtId,
  });
  const historyQ = useQuery({
    queryKey: ["maintenance-service-events", yachtId],
    queryFn: () => getServiceEvents(yachtId!),
    enabled: !!yachtId,
  });
  const partsQ = useQuery({
    queryKey: ["maintenance-parts", yachtId],
    queryFn: () => getSpareParts(yachtId!),
    enabled: !!yachtId,
  });

  const invalidate = async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ["maintenance-dashboard", yachtId] }),
      qc.invalidateQueries({ queryKey: ["maintenance-systems", yachtId] }),
      qc.invalidateQueries({ queryKey: ["maintenance-assets", yachtId] }),
      qc.invalidateQueries({ queryKey: ["maintenance-tasks", yachtId] }),
      qc.invalidateQueries({ queryKey: ["maintenance-work-orders", yachtId] }),
      qc.invalidateQueries({ queryKey: ["maintenance-defects", yachtId] }),
      qc.invalidateQueries({ queryKey: ["maintenance-service-events", yachtId] }),
      qc.invalidateQueries({ queryKey: ["maintenance-parts", yachtId] }),
    ]);
  };

  const run = async (label: string, fn: () => Promise<unknown>) => {
    if (!yachtId) return;
    try {
      setBusy(label);
      await fn();
      await invalidate();
    } catch (err) {
      Alert.alert("Maintenance", err instanceof Error ? err.message : "Action failed");
    } finally {
      setBusy(null);
    }
  };

  const loading = yachtsQ.isLoading || (!!yachtId && dashboardQ.isLoading);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable style={styles.iconButton} onPress={() => router.back()}>
          <Feather name="arrow-left" size={24} color={IVORY} />
        </Pressable>
        <View style={styles.headerText}>
          <Text style={styles.eyebrow}>Yachtworth</Text>
          <Text style={styles.title}>Maintenance</Text>
          <Text style={styles.subtitle}>PMS / CMMS equipment, work orders and service history</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={GOLD} />
          <Text style={styles.muted}>Loading maintenance workspace...</Text>
        </View>
      ) : !yachtId ? (
        <View style={styles.loading}>
          <Text style={styles.titleSmall}>No yacht found</Text>
          <Text style={styles.muted}>Create a yacht in My Yacht first, then open Maintenance.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.yachtRow}>
            {yachts.map((item) => (
              <Pressable
                key={item.id}
                onPress={() => setSelectedYachtId(item.id)}
                style={[styles.yachtChip, item.id === yachtId && styles.yachtChipActive]}
              >
                <Text style={[styles.yachtChipText, item.id === yachtId && styles.yachtChipTextActive]}>
                  {yachtTitle(item)}
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={isWide ? styles.layoutWide : undefined}>
            <View style={isWide ? styles.sidebar : undefined}>
              <View style={styles.tabs}>
                {TABS.map((item) => (
                  <Pressable
                    key={item.key}
                    onPress={() => setTab(item.key)}
                    style={[styles.tab, tab === item.key && styles.tabActive]}
                  >
                    <Feather name={item.icon} size={17} color={tab === item.key ? NAVY : GOLD} />
                    <Text style={[styles.tabText, tab === item.key && styles.tabTextActive]}>{item.label}</Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={styles.content}>
              <Text style={styles.yachtName}>{yachtTitle(yacht)}</Text>
              {busy ? <Text style={styles.busy}>{busy}...</Text> : null}
              {tab === "overview" ? (
                <Overview
                  dashboard={dashboardQ.data}
                  onSeed={() => run("Seeding systems", () => seedMaintenanceSystems(yachtId))}
                />
              ) : null}
              {tab === "equipment" ? (
                <Equipment
                  systems={systemsQ.data ?? []}
                  assets={assetsQ.data ?? []}
                  onCreate={(input) => run("Saving asset", () => createEquipmentAsset(yachtId, input))}
                />
              ) : null}
              {tab === "tasks" ? (
                <Tasks
                  assets={assetsQ.data ?? []}
                  tasks={tasksQ.data ?? []}
                  onCreatePlan={(input) => run("Creating plan", async () => {
                    const plan = await createMaintenancePlan(yachtId, input);
                    if (typeof plan.id === "string") await generateMaintenanceTask(yachtId, plan.id);
                  })}
                />
              ) : null}
              {tab === "work" ? (
                <WorkOrders
                  workOrders={workQ.data ?? []}
                  onCreate={(input) => run("Creating work order", () => createWorkOrder(yachtId, input))}
                />
              ) : null}
              {tab === "defects" ? (
                <Defects
                  assets={assetsQ.data ?? []}
                  defects={defectsQ.data ?? []}
                  onCreate={(input) => run("Creating defect", () => createDefect(yachtId, input))}
                />
              ) : null}
              {tab === "history" ? (
                <History
                  assets={assetsQ.data ?? []}
                  events={historyQ.data ?? []}
                  onCreate={(input) => run("Saving service event", () => createServiceEvent(yachtId, input))}
                />
              ) : null}
              {tab === "parts" ? (
                <Parts
                  assets={assetsQ.data ?? []}
                  parts={partsQ.data ?? []}
                  onCreate={(input) => run("Saving part", () => createSparePart(yachtId, input))}
                />
              ) : null}
            </View>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

function Overview({ dashboard, onSeed }: { dashboard?: MaintenanceDashboard; onSeed: () => void }) {
  const counts = dashboard?.counts ?? {};
  const metrics = [
    ["Systems", counts.systems ?? 0],
    ["Assets", counts.assets ?? 0],
    ["Overdue", counts.overdueTasks ?? 0],
    ["Due 30d", counts.dueSoonTasks ?? 0],
    ["Open W/O", counts.openWorkOrders ?? 0],
    ["Defects", counts.openDefects ?? 0],
  ];
  return (
    <View>
      <View style={styles.metrics}>
        {metrics.map(([label, value]) => (
          <Card key={String(label)}>
            <Text style={styles.metricValue}>{value}</Text>
            <Text style={styles.metricLabel}>{label}</Text>
          </Card>
        ))}
      </View>
      <Pressable style={styles.primaryButton} onPress={onSeed}>
        <Feather name="layers" size={18} color={NAVY} />
        <Text style={styles.primaryButtonText}>Seed professional system taxonomy</Text>
      </Pressable>
      <SectionList title="Overdue / due soon" items={[...(dashboard?.overdueTasks ?? []), ...(dashboard?.dueSoonTasks ?? [])]} render={(item: MaintenanceTask) => (
        <Row title={item.title} meta={item.equipment_assets?.name ?? item.due_at ?? "No due date"} status={item.status} />
      )} />
      <SectionList title="Open defects" items={dashboard?.openDefects ?? []} render={(item: Defect) => (
        <Row title={item.title} meta={item.equipment_assets?.name ?? "Unassigned"} status={item.severity} />
      )} />
    </View>
  );
}

function Equipment({ systems, assets, onCreate }: { systems: MaintenanceSystem[]; assets: EquipmentAsset[]; onCreate: (input: Partial<EquipmentAsset>) => void }) {
  const [name, setName] = useState("");
  const [manufacturer, setManufacturer] = useState("");
  const [model, setModel] = useState("");
  const [serial, setSerial] = useState("");
  const [systemId, setSystemId] = useState<string | null>(systems[0]?.id ?? null);
  const currentSystemId = systemId ?? systems[0]?.id ?? null;
  return (
    <View>
      <Form title="Add equipment asset">
        <Field label="Name" value={name} onChangeText={setName} placeholder="e.g. Port main engine" />
        <Field label="Manufacturer" value={manufacturer} onChangeText={setManufacturer} placeholder="MAN, Kohler, Atlas..." />
        <Field label="Model" value={model} onChangeText={setModel} />
        <Field label="Serial number" value={serial} onChangeText={setSerial} />
        <ChipSelect items={systems.map((s) => ({ id: s.id, label: s.name }))} selected={currentSystemId} onSelect={setSystemId} />
        <Button label="Save asset" icon="save" onPress={() => {
          onCreate({ name, manufacturer, model, serial_number: serial, maintenance_system_id: currentSystemId });
          setName(""); setManufacturer(""); setModel(""); setSerial("");
        }} disabled={!name || !currentSystemId} />
      </Form>
      <SectionList title="Equipment register" items={assets} empty="No equipment assets yet." render={(item: EquipmentAsset) => (
        <Row title={item.name} meta={[item.manufacturer, item.model, item.serial_number].filter(Boolean).join(" - ")} status={item.criticality ?? item.status} />
      )} />
    </View>
  );
}

function Tasks({ assets, tasks, onCreatePlan }: { assets: EquipmentAsset[]; tasks: MaintenanceTask[]; onCreatePlan: (input: Record<string, unknown>) => void }) {
  const [title, setTitle] = useState("");
  const [assetId, setAssetId] = useState<string | null>(assets[0]?.id ?? null);
  const [days, setDays] = useState("365");
  return (
    <View>
      <Form title="Create plan and first task">
        <Field label="Plan title" value={title} onChangeText={setTitle} placeholder="Annual service" />
        <Field label="Interval days" value={days} onChangeText={setDays} placeholder="365" />
        <ChipSelect items={assets.map((a) => ({ id: a.id, label: a.name }))} selected={assetId ?? assets[0]?.id ?? null} onSelect={setAssetId} />
        <Button label="Create plan" icon="repeat" onPress={() => onCreatePlan({
          title,
          equipment_asset_id: assetId ?? assets[0]?.id,
          intervals: [{ interval_type: "calendar", every_days: Number(days) || 365 }],
        })} disabled={!title || !(assetId ?? assets[0]?.id)} />
      </Form>
      <SectionList title="Maintenance tasks" items={tasks} empty="No generated tasks yet." render={(item: MaintenanceTask) => (
        <Row title={item.title} meta={item.equipment_assets?.name ?? item.due_at ?? "No due date"} status={item.status} />
      )} />
    </View>
  );
}

function WorkOrders({ workOrders, onCreate }: { workOrders: WorkOrder[]; onCreate: (input: Partial<WorkOrder>) => void }) {
  const [title, setTitle] = useState("");
  const [assigned, setAssigned] = useState("");
  return (
    <View>
      <Form title="New work order">
        <Field label="Title" value={title} onChangeText={setTitle} />
        <Field label="Assigned to" value={assigned} onChangeText={setAssigned} />
        <Button label="Create work order" icon="tool" onPress={() => { onCreate({ title, assigned_to_name: assigned }); setTitle(""); setAssigned(""); }} disabled={!title} />
      </Form>
      <SectionList title="Work orders" items={workOrders} empty="No work orders yet." render={(item: WorkOrder) => (
        <Row title={`${item.work_order_number} - ${item.title}`} meta={item.assigned_to_name ?? "Unassigned"} status={item.status} />
      )} />
    </View>
  );
}

function Defects({ assets, defects, onCreate }: { assets: EquipmentAsset[]; defects: Defect[]; onCreate: (input: Partial<Defect>) => void }) {
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [assetId, setAssetId] = useState<string | null>(assets[0]?.id ?? null);
  return (
    <View>
      <Form title="Report defect">
        <Field label="Title" value={title} onChangeText={setTitle} />
        <Field label="Description" value={notes} onChangeText={setNotes} multiline />
        <ChipSelect items={assets.map((a) => ({ id: a.id, label: a.name }))} selected={assetId ?? assets[0]?.id ?? null} onSelect={setAssetId} />
        <Button label="Create defect" icon="alert-triangle" onPress={() => { onCreate({ title, description: notes, equipment_asset_id: assetId ?? assets[0]?.id }); setTitle(""); setNotes(""); }} disabled={!title} />
      </Form>
      <SectionList title="Open defects" items={defects} empty="No defects recorded." render={(item: Defect) => (
        <Row title={`${item.defect_number} - ${item.title}`} meta={item.equipment_assets?.name ?? "Unassigned"} status={item.severity ?? item.status} />
      )} />
    </View>
  );
}

function History({ assets, events, onCreate }: { assets: EquipmentAsset[]; events: ServiceEvent[]; onCreate: (input: Partial<ServiceEvent>) => void }) {
  const [title, setTitle] = useState("");
  const [performedBy, setPerformedBy] = useState("");
  const [assetId, setAssetId] = useState<string | null>(assets[0]?.id ?? null);
  return (
    <View>
      <Form title="Complete service event">
        <Field label="Title" value={title} onChangeText={setTitle} placeholder="Port engine annual service" />
        <Field label="Performed by" value={performedBy} onChangeText={setPerformedBy} />
        <ChipSelect items={assets.map((a) => ({ id: a.id, label: a.name }))} selected={assetId ?? assets[0]?.id ?? null} onSelect={setAssetId} />
        <Button label="Save service event" icon="check-circle" onPress={() => { onCreate({ title, performed_by_name: performedBy, equipment_asset_id: assetId ?? assets[0]?.id }); setTitle(""); setPerformedBy(""); }} disabled={!title} />
      </Form>
      <SectionList title="Immutable service history" items={events} empty="No service events yet." render={(item: ServiceEvent) => (
        <Row title={`${item.service_event_number} - ${item.title}`} meta={[item.performed_at?.slice(0, 10), item.performed_by_name].filter(Boolean).join(" - ")} status={item.service_type} />
      )} />
    </View>
  );
}

function Parts({ assets, parts, onCreate }: { assets: EquipmentAsset[]; parts: SparePart[]; onCreate: (input: Partial<SparePart>) => void }) {
  const [name, setName] = useState("");
  const [partNumber, setPartNumber] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [assetId, setAssetId] = useState<string | null>(assets[0]?.id ?? null);
  return (
    <View>
      <Form title="Add spare part">
        <Field label="Name" value={name} onChangeText={setName} />
        <Field label="Part number" value={partNumber} onChangeText={setPartNumber} />
        <Field label="Quantity" value={quantity} onChangeText={setQuantity} />
        <ChipSelect items={assets.map((a) => ({ id: a.id, label: a.name }))} selected={assetId ?? assets[0]?.id ?? null} onSelect={setAssetId} />
        <Button label="Save part" icon="package" onPress={() => { onCreate({ name, part_number: partNumber, quantity_on_hand: Number(quantity) || 0, equipment_asset_id: assetId ?? assets[0]?.id }); setName(""); setPartNumber(""); setQuantity("1"); }} disabled={!name} />
      </Form>
      <SectionList title="Inventory" items={parts} empty="No spare parts yet." render={(item: SparePart) => (
        <Row title={item.name} meta={[item.part_number, `${item.quantity_on_hand} ${item.unit ?? "pcs"}`].filter(Boolean).join(" - ")} status={item.quantity_on_hand <= item.minimum_stock ? "low stock" : "stock ok"} />
      )} />
    </View>
  );
}

function Form({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.form}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Button({ label, icon, onPress, disabled }: { label: string; icon: React.ComponentProps<typeof Feather>["name"]; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable style={[styles.primaryButton, disabled && styles.disabled]} onPress={onPress} disabled={disabled}>
      <Feather name={icon} size={18} color={NAVY} />
      <Text style={styles.primaryButtonText}>{label}</Text>
    </Pressable>
  );
}

function ChipSelect({ items, selected, onSelect }: { items: { id: string; label: string }[]; selected: string | null; onSelect: (id: string) => void }) {
  if (!items.length) return <Text style={styles.muted}>Seed systems or add equipment first.</Text>;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
      {items.map((item) => (
        <Pressable key={item.id} onPress={() => onSelect(item.id)} style={[styles.smallChip, selected === item.id && styles.smallChipActive]}>
          <Text style={[styles.smallChipText, selected === item.id && styles.smallChipTextActive]}>{item.label}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

function SectionList<T>({ title, items, render, empty }: { title: string; items: T[]; render: (item: T) => React.ReactNode; empty?: string }) {
  return (
    <View style={styles.list}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {items.length ? items.map((item, idx) => <View key={idx}>{render(item)}</View>) : <Empty text={empty ?? "Nothing to show yet."} />}
    </View>
  );
}

function Row({ title, meta, status }: { title: string; meta?: string | null; status?: string | null }) {
  return (
    <View style={styles.row}>
      <View style={styles.rowText}>
        <Text style={styles.rowTitle}>{title}</Text>
        {meta ? <Text style={styles.rowMeta}>{meta}</Text> : null}
      </View>
      <StatusPill value={status} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: NAVY },
  header: { flexDirection: "row", alignItems: "center", gap: 16, paddingHorizontal: 22, paddingVertical: 18, borderBottomWidth: 1, borderBottomColor: LINE },
  iconButton: { width: 46, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(247,243,236,0.08)" },
  headerText: { flex: 1 },
  eyebrow: { color: GOLD, fontFamily: "Inter_600SemiBold", fontSize: 12, letterSpacing: 3, textTransform: "uppercase" },
  title: { color: IVORY, fontFamily: "Inter_700Bold", fontSize: 34, marginTop: 6 },
  subtitle: { color: MUTED, fontFamily: "Inter_400Regular", fontSize: 14, marginTop: 4 },
  scroll: { padding: 22, paddingBottom: 48 },
  loading: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 28 },
  muted: { color: MUTED, fontFamily: "Inter_400Regular", fontSize: 14, lineHeight: 20 },
  titleSmall: { color: IVORY, fontFamily: "Inter_700Bold", fontSize: 22 },
  yachtRow: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 18 },
  yachtChip: { borderWidth: 1, borderColor: LINE, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 10, backgroundColor: NAVY_DEEP },
  yachtChipActive: { borderColor: GOLD, backgroundColor: PANEL },
  yachtChipText: { color: MUTED, fontFamily: "Inter_600SemiBold", fontSize: 13 },
  yachtChipTextActive: { color: IVORY },
  layoutWide: { flexDirection: "row", gap: 22, alignItems: "flex-start" },
  sidebar: { width: 250 },
  content: { flex: 1, maxWidth: 1100 },
  tabs: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 20 },
  tab: { flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1, borderColor: LINE, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: NAVY_DEEP },
  tabActive: { backgroundColor: GOLD, borderColor: GOLD },
  tabText: { color: MUTED, fontFamily: "Inter_600SemiBold", fontSize: 13 },
  tabTextActive: { color: NAVY },
  yachtName: { color: IVORY, fontFamily: "Inter_700Bold", fontSize: 22, marginBottom: 10 },
  busy: { color: GOLD, fontFamily: "Inter_600SemiBold", marginBottom: 10 },
  metrics: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 14 },
  card: { minWidth: 130, flexGrow: 1, borderRadius: 8, borderWidth: 1, borderColor: LINE, backgroundColor: PANEL, padding: 14 },
  metricValue: { color: IVORY, fontFamily: "Inter_700Bold", fontSize: 28 },
  metricLabel: { color: MUTED, fontFamily: "Inter_500Medium", fontSize: 12, marginTop: 4 },
  primaryButton: { minHeight: 52, borderRadius: 8, backgroundColor: GOLD, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingHorizontal: 16, marginVertical: 10 },
  primaryButtonText: { color: NAVY, fontFamily: "Inter_700Bold", fontSize: 15 },
  disabled: { opacity: 0.45 },
  form: { borderWidth: 1, borderColor: LINE, backgroundColor: NAVY_DEEP, borderRadius: 8, padding: 16, marginBottom: 18 },
  list: { marginTop: 8, marginBottom: 18 },
  sectionTitle: { color: IVORY, fontFamily: "Inter_700Bold", fontSize: 18, marginBottom: 12 },
  field: { marginBottom: 12 },
  label: { color: GOLD, fontFamily: "Inter_600SemiBold", fontSize: 12, letterSpacing: 2, textTransform: "uppercase", marginBottom: 7 },
  input: { borderWidth: 1, borderColor: "rgba(247,243,236,0.14)", borderRadius: 8, backgroundColor: PANEL, color: IVORY, fontFamily: "Inter_500Medium", fontSize: 15, minHeight: 48, paddingHorizontal: 14, paddingVertical: 10 },
  inputTall: { minHeight: 94, textAlignVertical: "top" },
  chips: { gap: 8, paddingBottom: 4, marginBottom: 8 },
  smallChip: { borderRadius: 8, borderWidth: 1, borderColor: LINE, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: PANEL },
  smallChipActive: { borderColor: GOLD },
  smallChipText: { color: MUTED, fontFamily: "Inter_600SemiBold", fontSize: 12 },
  smallChipTextActive: { color: IVORY },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, borderWidth: 1, borderColor: LINE, borderRadius: 8, backgroundColor: NAVY_DEEP, padding: 14, marginBottom: 10 },
  rowText: { flex: 1 },
  rowTitle: { color: IVORY, fontFamily: "Inter_700Bold", fontSize: 15 },
  rowMeta: { color: MUTED, fontFamily: "Inter_400Regular", fontSize: 13, marginTop: 4, lineHeight: 18 },
  pill: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  pillText: { fontFamily: "Inter_700Bold", fontSize: 11, textTransform: "uppercase" },
  empty: { color: MUTED, fontFamily: "Inter_400Regular", fontSize: 14, borderWidth: 1, borderColor: LINE, borderRadius: 8, padding: 14 },
});
