import { Feather } from "@expo/vector-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
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
  createEquipmentCounter,
  createMaintenanceDocument,
  createMaintenancePlan,
  createServiceEvent,
  createSparePart,
  createWorkOrder,
  generateMaintenanceTask,
  getDefects,
  getEquipmentAssets,
  getMaintenanceDashboard,
  getMaintenanceDocumentSignedUrl,
  getMaintenanceDocuments,
  getMaintenanceSystems,
  getMaintenanceTasks,
  getServiceEvents,
  getSpareParts,
  getWorkOrders,
  getYachts,
  recordCounterReading,
  seedMaintenanceSystems,
  updateEquipmentAsset,
  updateDefect,
  updateSparePart,
  updateWorkOrder,
  createInventoryMovement,
  uploadMaintenanceDocumentFile,
  type Defect,
  type EquipmentCounter,
  type EquipmentAsset,
  type MaintenanceDashboard,
  type MaintenanceDocument,
  type UploadMaintenanceDocumentInput,
  type MaintenanceSystem,
  type MaintenanceTask,
  type ServiceEvent,
  type InventoryMovement,
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

type Tab = "overview" | "equipment" | "tasks" | "work" | "defects" | "history" | "parts" | "attachments";

const TABS: { key: Tab; label: string; icon: React.ComponentProps<typeof Feather>["name"] }[] = [
  { key: "overview", label: "Overview", icon: "grid" },
  { key: "equipment", label: "Equipment", icon: "cpu" },
  { key: "tasks", label: "Tasks", icon: "check-square" },
  { key: "work", label: "Work orders", icon: "tool" },
  { key: "defects", label: "Defects", icon: "alert-triangle" },
  { key: "history", label: "History", icon: "clock" },
  { key: "parts", label: "Parts", icon: "package" },
  { key: "attachments", label: "Attachments", icon: "paperclip" },
];

const SERVICE_TYPE_OPTIONS = [
  { id: "manual_service", label: "Manual service" },
  { id: "scheduled_service", label: "Scheduled service" },
  { id: "corrective_repair", label: "Corrective repair" },
  { id: "inspection", label: "Inspection" },
  { id: "warranty_work", label: "Warranty work" },
];

const PLAN_TYPE_OPTIONS = [
  { id: "calendar", label: "Calendar" },
  { id: "counter", label: "Counter" },
  { id: "combined", label: "Combined" },
  { id: "one_time", label: "One time" },
  { id: "condition", label: "Condition" },
];

const PRIORITY_OPTIONS = [
  { id: "low", label: "Low" },
  { id: "normal", label: "Normal" },
  { id: "high", label: "High" },
  { id: "critical", label: "Critical" },
];

const WORK_ORDER_TYPE_OPTIONS = [
  { id: "corrective_maintenance", label: "Corrective" },
  { id: "preventive_maintenance", label: "Preventive" },
  { id: "inspection", label: "Inspection" },
  { id: "repair", label: "Repair" },
  { id: "yard_work", label: "Yard work" },
];

const WORK_ORDER_STATUS_OPTIONS = [
  { id: "requested", label: "Requested" },
  { id: "approved", label: "Approved" },
  { id: "planned", label: "Planned" },
  { id: "scheduled", label: "Scheduled" },
  { id: "in_progress", label: "In progress" },
  { id: "waiting_for_parts", label: "Parts" },
  { id: "waiting_for_vendor", label: "Vendor" },
  { id: "completed", label: "Completed" },
  { id: "pending_verification", label: "Verify" },
  { id: "cancelled", label: "Cancelled" },
];

const DEFECT_SEVERITY_OPTIONS = [
  { id: "observation", label: "Observation" },
  { id: "low", label: "Low" },
  { id: "medium", label: "Medium" },
  { id: "high", label: "High" },
  { id: "critical", label: "Critical" },
];

const DEFECT_STATUS_OPTIONS = [
  { id: "reported", label: "Reported" },
  { id: "acknowledged", label: "Acknowledged" },
  { id: "diagnosing", label: "Diagnosing" },
  { id: "temporary_repair", label: "Temporary" },
  { id: "parts_ordered", label: "Parts" },
  { id: "repair_scheduled", label: "Scheduled" },
  { id: "under_repair", label: "Repair" },
  { id: "testing", label: "Testing" },
  { id: "resolved", label: "Resolved" },
  { id: "verified", label: "Verified" },
  { id: "closed", label: "Closed" },
  { id: "rejected", label: "Rejected" },
  { id: "duplicate", label: "Duplicate" },
];

const ATTACHMENT_CATEGORY_OPTIONS = [
  { id: "photo", label: "Photo" },
  { id: "document", label: "Document" },
  { id: "manual", label: "Manual" },
  { id: "invoice", label: "Invoice" },
  { id: "certificate", label: "Certificate" },
  { id: "warranty", label: "Warranty" },
  { id: "report", label: "Report" },
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
  const documentsQ = useQuery({
    queryKey: ["maintenance-documents", yachtId],
    queryFn: () => getMaintenanceDocuments(yachtId!),
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
      qc.invalidateQueries({ queryKey: ["maintenance-documents", yachtId] }),
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
                  onUpdate={(assetId, input) => run("Updating asset", () => updateEquipmentAsset(yachtId, assetId, input))}
                  onCreateCounter={(assetId, input) => run("Saving counter", () => createEquipmentCounter(yachtId, assetId, input))}
                  onRecordReading={(counterId, value) => run("Recording reading", () => recordCounterReading(yachtId, counterId, value))}
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
                  assets={assetsQ.data ?? []}
                  workOrders={workQ.data ?? []}
                  onCreate={(input) => run("Creating work order", () => createWorkOrder(yachtId, input))}
                  onUpdate={(workOrderId, input) => run("Updating work order", () => updateWorkOrder(yachtId, workOrderId, input))}
                />
              ) : null}
              {tab === "defects" ? (
                <Defects
                  assets={assetsQ.data ?? []}
                  defects={defectsQ.data ?? []}
                  onCreate={(input) => run("Creating defect", () => createDefect(yachtId, input))}
                  onUpdate={(defectId, input) => run("Updating defect", () => updateDefect(yachtId, defectId, input))}
                />
              ) : null}
              {tab === "history" ? (
                <ServiceHistory
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
                  onUpdate={(partId, input) => run("Updating part", () => updateSparePart(yachtId, partId, input))}
                  onMove={(partId, input) => run("Recording inventory movement", () => createInventoryMovement(yachtId, partId, input))}
                />
              ) : null}
              {tab === "attachments" ? (
                <Attachments
                  assets={assetsQ.data ?? []}
                  workOrders={workQ.data ?? []}
                  defects={defectsQ.data ?? []}
                  serviceEvents={historyQ.data ?? []}
                  documents={documentsQ.data ?? []}
                  onCreate={(input) => run("Saving attachment", () => createMaintenanceDocument(yachtId, input))}
                  onUpload={(input) => run("Uploading attachment", () => uploadMaintenanceDocumentFile(yachtId, input))}
                  onOpen={(documentId) => run("Opening attachment", async () => {
                    const url = await getMaintenanceDocumentSignedUrl(yachtId, documentId);
                    await Linking.openURL(url);
                  })}
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
    ["Overdue", counts.tasks_overdue ?? counts.overdueTasks ?? 0],
    ["Due 30d", counts.tasks_due ?? counts.dueSoonTasks ?? 0],
    ["Open W/O", counts.open_work_orders ?? counts.openWorkOrders ?? 0],
    ["Defects", counts.open_defects ?? counts.openDefects ?? 0],
  ];
  const overdueTasks = dashboard?.overdue_tasks ?? dashboard?.overdueTasks ?? [];
  const dueSoonTasks = dashboard?.due_soon_tasks ?? dashboard?.dueSoonTasks ?? [];
  const openDefects = dashboard?.open_defects ?? dashboard?.openDefects ?? [];
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
      <SectionList title="Overdue / due soon" items={[...overdueTasks, ...dueSoonTasks]} render={(item: MaintenanceTask) => (
        <Row title={item.title} meta={item.equipment_assets?.name ?? item.due_at ?? "No due date"} status={item.status} />
      )} />
      <SectionList title="Open defects" items={openDefects} render={(item: Defect) => (
        <Row title={item.title} meta={item.equipment_assets?.name ?? "Unassigned"} status={item.severity} />
      )} />
    </View>
  );
}

const CRITICALITY_OPTIONS = [
  { id: "low", label: "Low" },
  { id: "normal", label: "Normal" },
  { id: "important", label: "Important" },
  { id: "critical", label: "Critical" },
  { id: "safety_critical", label: "Safety critical" },
];

const OPERATIONAL_OPTIONS = [
  { id: "operational", label: "Operational" },
  { id: "operational_with_limitations", label: "Limited" },
  { id: "service_due", label: "Service due" },
  { id: "maintenance_in_progress", label: "In maintenance" },
  { id: "unavailable", label: "Unavailable" },
  { id: "laid_up", label: "Laid up" },
];

const COUNTER_OPTIONS = [
  { id: "running_hours", label: "Running hours" },
  { id: "engine_hours", label: "Engine hours" },
  { id: "operating_hours", label: "Operating hours" },
  { id: "starts", label: "Starts" },
  { id: "cycles", label: "Cycles" },
  { id: "custom", label: "Custom" },
];

function csvToList(value: string): string[] {
  return value
    .split(/[\n,]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function Equipment({
  systems,
  assets,
  onCreate,
  onUpdate,
  onCreateCounter,
  onRecordReading,
}: {
  systems: MaintenanceSystem[];
  assets: EquipmentAsset[];
  onCreate: (input: Partial<EquipmentAsset>) => void;
  onUpdate: (assetId: string, input: Partial<EquipmentAsset>) => void;
  onCreateCounter: (assetId: string, input: Partial<EquipmentCounter>) => void;
  onRecordReading: (counterId: string, value: number) => void;
}) {
  const [name, setName] = useState("");
  const [assetType, setAssetType] = useState("");
  const [assetCode, setAssetCode] = useState("");
  const [manufacturer, setManufacturer] = useState("");
  const [model, setModel] = useState("");
  const [serial, setSerial] = useState("");
  const [partNumber, setPartNumber] = useState("");
  const [criticality, setCriticality] = useState("normal");
  const [operational, setOperational] = useState("operational");
  const [condition, setCondition] = useState("");
  const [warrantyEnd, setWarrantyEnd] = useState("");
  const [warrantyHours, setWarrantyHours] = useState("");
  const [replacementCost, setReplacementCost] = useState("");
  const [photoUrls, setPhotoUrls] = useState("");
  const [documentUrls, setDocumentUrls] = useState("");
  const [classRelevant, setClassRelevant] = useState(false);
  const [flagRelevant, setFlagRelevant] = useState(false);
  const [safetyRelevant, setSafetyRelevant] = useState(false);
  const [environmentalRelevant, setEnvironmentalRelevant] = useState(false);
  const [systemId, setSystemId] = useState<string | null>(systems[0]?.id ?? null);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(assets[0]?.id ?? null);
  const currentSystemId = systemId ?? systems[0]?.id ?? null;
  const selectedAsset = assets.find((asset) => asset.id === selectedAssetId) ?? assets[0];
  const selectedCounter = selectedAsset?.equipment_counters?.[0];

  const reset = () => {
    setName("");
    setAssetType("");
    setAssetCode("");
    setManufacturer("");
    setModel("");
    setSerial("");
    setPartNumber("");
    setCriticality("normal");
    setOperational("operational");
    setCondition("");
    setWarrantyEnd("");
    setWarrantyHours("");
    setReplacementCost("");
    setPhotoUrls("");
    setDocumentUrls("");
    setClassRelevant(false);
    setFlagRelevant(false);
    setSafetyRelevant(false);
    setEnvironmentalRelevant(false);
  };

  return (
    <View>
      <Form title="Add equipment asset">
        <Field label="Name" value={name} onChangeText={setName} placeholder="e.g. Port main engine" />
        <Field label="Asset type" value={assetType} onChangeText={setAssetType} placeholder="Engine, generator, pump, charger..." />
        <Field label="Asset code" value={assetCode} onChangeText={setAssetCode} placeholder="ME-P, GEN-S, AC-01..." />
        <Field label="Manufacturer" value={manufacturer} onChangeText={setManufacturer} placeholder="MAN, Kohler, Atlas..." />
        <Field label="Model" value={model} onChangeText={setModel} />
        <Field label="Serial number" value={serial} onChangeText={setSerial} />
        <Field label="Part number" value={partNumber} onChangeText={setPartNumber} />
        <Field label="Condition status" value={condition} onChangeText={setCondition} placeholder="Good, service due, monitor..." />
        <Field label="Warranty end" value={warrantyEnd} onChangeText={setWarrantyEnd} placeholder="YYYY-MM-DD" />
        <Field label="Warranty hours limit" value={warrantyHours} onChangeText={setWarrantyHours} />
        <Field label="Replacement cost EUR" value={replacementCost} onChangeText={setReplacementCost} />
        <Field label="Photo URLs" value={photoUrls} onChangeText={setPhotoUrls} placeholder="One or more URLs, comma or new line separated" multiline />
        <Field label="Document URLs" value={documentUrls} onChangeText={setDocumentUrls} placeholder="Manuals, invoices, certificates" multiline />
        <Text style={styles.label}>System</Text>
        <ChipSelect items={systems.map((s) => ({ id: s.id, label: s.name }))} selected={currentSystemId} onSelect={setSystemId} />
        <Text style={styles.label}>Criticality</Text>
        <ChipSelect items={CRITICALITY_OPTIONS} selected={criticality} onSelect={setCriticality} />
        <Text style={styles.label}>Operational status</Text>
        <ChipSelect items={OPERATIONAL_OPTIONS} selected={operational} onSelect={setOperational} />
        <View style={styles.toggleGrid}>
          <FlagToggle label="Class relevant" value={classRelevant} onPress={() => setClassRelevant((v) => !v)} />
          <FlagToggle label="Flag relevant" value={flagRelevant} onPress={() => setFlagRelevant((v) => !v)} />
          <FlagToggle label="Safety" value={safetyRelevant} onPress={() => setSafetyRelevant((v) => !v)} />
          <FlagToggle label="Environmental" value={environmentalRelevant} onPress={() => setEnvironmentalRelevant((v) => !v)} />
        </View>
        <Button label="Save asset" icon="save" onPress={() => {
          onCreate({
            name,
            asset_type: assetType,
            asset_code: assetCode,
            manufacturer,
            model,
            serial_number: serial,
            part_number: partNumber,
            vessel_system_id: currentSystemId,
            criticality,
            operational_status: operational,
            condition_status: condition,
            warranty_end: warrantyEnd || undefined,
            warranty_hours_limit: warrantyHours ? Number(warrantyHours) : undefined,
            replacement_cost: replacementCost ? Number(replacementCost) : undefined,
            replacement_cost_currency: "EUR",
            class_relevant: classRelevant,
            flag_relevant: flagRelevant,
            safety_relevant: safetyRelevant,
            environmental_relevant: environmentalRelevant,
            photo_urls: csvToList(photoUrls),
            document_urls: csvToList(documentUrls),
          });
          reset();
        }} disabled={!name || !currentSystemId} />
      </Form>
      <SectionList title="Equipment register" items={assets} empty="No equipment assets yet." render={(item: EquipmentAsset) => (
        <Pressable onPress={() => setSelectedAssetId(item.id)}>
          <Row
            title={item.display_name ?? item.name}
            meta={[item.maintenance_systems?.name, item.manufacturer, item.model, item.serial_number].filter(Boolean).join(" - ")}
            status={item.criticality ?? item.operational_status ?? item.status}
          />
        </Pressable>
      )} />
      {selectedAsset ? (
        <EquipmentDetail
          asset={selectedAsset}
          systems={systems}
          counter={selectedCounter}
          onUpdate={(input) => onUpdate(selectedAsset.id, input)}
          onCreateCounter={(input) => onCreateCounter(selectedAsset.id, input)}
          onRecordReading={(value) => selectedCounter ? onRecordReading(selectedCounter.id, value) : undefined}
        />
      ) : null}
    </View>
  );
}

function EquipmentDetail({
  asset,
  systems,
  counter,
  onUpdate,
  onCreateCounter,
  onRecordReading,
}: {
  asset: EquipmentAsset;
  systems: MaintenanceSystem[];
  counter?: EquipmentCounter | null;
  onUpdate: (input: Partial<EquipmentAsset>) => void;
  onCreateCounter: (input: Partial<EquipmentCounter>) => void;
  onRecordReading: (value: number) => void | undefined;
}) {
  const [criticality, setCriticality] = useState(asset.criticality ?? "normal");
  const [operational, setOperational] = useState(asset.operational_status ?? "operational");
  const [condition, setCondition] = useState(asset.condition_status ?? "");
  const [systemId, setSystemId] = useState(asset.vessel_system_id ?? systems[0]?.id ?? null);
  const [counterType, setCounterType] = useState("running_hours");
  const [counterValue, setCounterValue] = useState("");
  const [readingValue, setReadingValue] = useState("");
  useEffect(() => {
    setCriticality(asset.criticality ?? "normal");
    setOperational(asset.operational_status ?? "operational");
    setCondition(asset.condition_status ?? "");
    setSystemId(asset.vessel_system_id ?? systems[0]?.id ?? null);
    setReadingValue("");
    setCounterValue("");
  }, [asset.id, asset.criticality, asset.operational_status, asset.condition_status, asset.vessel_system_id, systems]);
  return (
    <Form title="Equipment card">
      <View style={styles.detailGrid}>
        <Detail label="Name" value={asset.display_name ?? asset.name} />
        <Detail label="System" value={asset.maintenance_systems?.name} />
        <Detail label="Type" value={asset.asset_type} />
        <Detail label="Code" value={asset.asset_code} />
        <Detail label="Maker" value={asset.manufacturer} />
        <Detail label="Model" value={asset.model} />
        <Detail label="Serial" value={asset.serial_number} />
        <Detail label="Part no." value={asset.part_number} />
        <Detail label="Warranty" value={asset.warranty_end ?? asset.warranty_expires_at} />
        <Detail label="Replacement" value={asset.replacement_cost != null ? `€${Number(asset.replacement_cost).toLocaleString("en-US")}` : undefined} />
      </View>
      <Text style={styles.label}>System</Text>
      <ChipSelect items={systems.map((s) => ({ id: s.id, label: s.name }))} selected={systemId} onSelect={setSystemId} />
      <Text style={styles.label}>Criticality</Text>
      <ChipSelect items={CRITICALITY_OPTIONS} selected={criticality} onSelect={setCriticality} />
      <Text style={styles.label}>Operational status</Text>
      <ChipSelect items={OPERATIONAL_OPTIONS} selected={operational} onSelect={setOperational} />
      <Field label="Condition status" value={condition} onChangeText={setCondition} />
      <Button
        label="Update equipment card"
        icon="edit-3"
        onPress={() => onUpdate({
          vessel_system_id: systemId,
          criticality,
          operational_status: operational,
          condition_status: condition,
        })}
      />

      <View style={styles.subPanel}>
        <Text style={styles.sectionTitle}>Counters</Text>
        {counter ? (
          <>
            <Row title={`${counter.counter_type} · ${Number(counter.current_value ?? 0).toLocaleString("en-US")} ${counter.unit}`} meta={counter.last_reading_at?.slice(0, 10)} status={counter.is_primary ? "primary" : "counter"} />
            <Field label="New reading" value={readingValue} onChangeText={setReadingValue} placeholder="Current hours / cycles" />
            <Button label="Record reading" icon="activity" onPress={() => {
              const value = Number(readingValue);
              if (Number.isFinite(value)) {
                onRecordReading(value);
                setReadingValue("");
              }
            }} disabled={!readingValue} />
          </>
        ) : (
          <>
            <Text style={styles.muted}>No counter on this asset yet.</Text>
            <Text style={styles.label}>Counter type</Text>
            <ChipSelect items={COUNTER_OPTIONS} selected={counterType} onSelect={setCounterType} />
            <Field label="Initial value" value={counterValue} onChangeText={setCounterValue} placeholder="0" />
            <Button label="Create counter" icon="plus-circle" onPress={() => {
              onCreateCounter({
                counter_type: counterType,
                unit: counterType.includes("hour") ? "hours" : "count",
                current_value: Number(counterValue) || 0,
                is_primary: true,
              });
              setCounterValue("");
            }} />
          </>
        )}
      </View>
    </Form>
  );
}

function Detail({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <View style={styles.detailItem}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value == null || value === "" ? "—" : String(value)}</Text>
    </View>
  );
}

function FlagToggle({ label, value, onPress }: { label: string; value: boolean; onPress: () => void }) {
  return (
    <Pressable style={[styles.toggle, value && styles.toggleActive]} onPress={onPress}>
      <Feather name={value ? "check-square" : "square"} size={16} color={value ? NAVY : GOLD} />
      <Text style={[styles.toggleText, value && styles.toggleTextActive]}>{label}</Text>
    </Pressable>
  );
}

function Tasks({ assets, tasks, onCreatePlan }: { assets: EquipmentAsset[]; tasks: MaintenanceTask[]; onCreatePlan: (input: Record<string, unknown>) => void }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assetId, setAssetId] = useState<string | null>(assets[0]?.id ?? null);
  const [planType, setPlanType] = useState("calendar");
  const [priority, setPriority] = useState("normal");
  const [criticality, setCriticality] = useState("normal");
  const [assignedRole, setAssignedRole] = useState("");
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [calendarValue, setCalendarValue] = useState("365");
  const [calendarUnit, setCalendarUnit] = useState("days");
  const [counterInterval, setCounterInterval] = useState("");
  const [nextDueAt, setNextDueAt] = useState("");
  const [nextDueCounter, setNextDueCounter] = useState("");
  const [warningThreshold, setWarningThreshold] = useState("30");
  const [warningUnit, setWarningUnit] = useState("days");
  const [verificationRequired, setVerificationRequired] = useState(true);
  const selectedAsset = assetId ?? assets[0]?.id;
  const selectedAssetItem = assets.find((asset) => asset.id === selectedAsset);
  const primaryCounter = selectedAssetItem?.equipment_counters?.find((counter) => counter.is_primary) ?? selectedAssetItem?.equipment_counters?.[0];
  const showCalendar = planType === "calendar" || planType === "combined" || planType === "one_time";
  const showCounter = planType === "counter" || planType === "combined";

  const reset = () => {
    setTitle("");
    setDescription("");
    setPlanType("calendar");
    setPriority("normal");
    setCriticality("normal");
    setAssignedRole("");
    setStartDate(new Date().toISOString().slice(0, 10));
    setCalendarValue("365");
    setCalendarUnit("days");
    setCounterInterval("");
    setNextDueAt("");
    setNextDueCounter("");
    setWarningThreshold("30");
    setWarningUnit("days");
    setVerificationRequired(true);
  };

  return (
    <View>
      <Form title="Create plan and first task">
        <Field label="Plan title" value={title} onChangeText={setTitle} placeholder="Annual service" />
        <Field label="Description / scope" value={description} onChangeText={setDescription} multiline />
        <Text style={styles.label}>Plan type</Text>
        <ChipSelect items={PLAN_TYPE_OPTIONS} selected={planType} onSelect={setPlanType} />
        <Text style={styles.label}>Priority</Text>
        <ChipSelect items={PRIORITY_OPTIONS} selected={priority} onSelect={setPriority} />
        <Text style={styles.label}>Criticality</Text>
        <ChipSelect items={CRITICALITY_OPTIONS} selected={criticality} onSelect={setCriticality} />
        <Field label="Assigned role" value={assignedRole} onChangeText={setAssignedRole} placeholder="Engineer / captain / yard" />
        <Field label="Start date" value={startDate} onChangeText={setStartDate} placeholder="YYYY-MM-DD" />
        {showCalendar ? (
          <>
            <Field label="Calendar interval" value={calendarValue} onChangeText={setCalendarValue} placeholder="365" />
            <Field label="Calendar unit" value={calendarUnit} onChangeText={setCalendarUnit} placeholder="days / months / years" />
            <Field label="Next due date" value={nextDueAt} onChangeText={setNextDueAt} placeholder="YYYY-MM-DD, optional" />
          </>
        ) : null}
        {showCounter ? (
          <>
            <Field label="Counter interval" value={counterInterval} onChangeText={setCounterInterval} placeholder="250" />
            <Field label="Next due counter" value={nextDueCounter} onChangeText={setNextDueCounter} placeholder="1250" />
            <Text style={styles.muted}>
              {primaryCounter ? `Primary counter: ${primaryCounter.counter_type}, current ${primaryCounter.current_value} ${primaryCounter.unit}` : "Create an equipment counter first for counter-based plans."}
            </Text>
          </>
        ) : null}
        <Field label="Warning threshold" value={warningThreshold} onChangeText={setWarningThreshold} placeholder="30" />
        <Field label="Warning unit" value={warningUnit} onChangeText={setWarningUnit} placeholder="days / hours" />
        <View style={styles.toggleGrid}>
          <FlagToggle label="Verification required" value={verificationRequired} onPress={() => setVerificationRequired((value) => !value)} />
        </View>
        <ChipSelect items={assets.map((a) => ({ id: a.id, label: a.name }))} selected={selectedAsset ?? null} onSelect={setAssetId} />
        <Button
          label="Create plan"
          icon="repeat"
          onPress={() => {
            const interval = {
              interval_type: planType,
              calendar_value: showCalendar ? Number(calendarValue) || null : null,
              calendar_unit: showCalendar ? calendarUnit : null,
              counter_id: showCounter ? primaryCounter?.id : null,
              counter_interval: showCounter ? Number(counterInterval) || null : null,
              due_rule: planType === "combined" ? "whichever_occurs_first" : "manual_review",
              warning_threshold: Number(warningThreshold) || null,
              warning_unit: warningUnit,
              next_due_at: nextDueAt ? new Date(`${nextDueAt}T12:00:00.000Z`).toISOString() : undefined,
              next_due_counter_value: showCounter && nextDueCounter ? Number(nextDueCounter) : undefined,
            };
            onCreatePlan({
              name: title,
              description,
              equipment_asset_id: selectedAsset,
              plan_type: planType,
              priority,
              criticality,
              start_date: startDate,
              assigned_to_role: assignedRole,
              verification_required: verificationRequired,
              intervals: [interval],
            });
            reset();
          }}
          disabled={!title || !selectedAsset || (showCounter && !primaryCounter)}
        />
      </Form>
      <SectionList title="Maintenance tasks" items={tasks} empty="No generated tasks yet." render={(item: MaintenanceTask) => (
        <Row
          title={item.title}
          meta={[
            item.equipment_assets?.name,
            item.due_at ? `Due ${item.due_at.slice(0, 10)}` : null,
            item.due_counter_value != null ? `Due at ${item.due_counter_value}` : null,
            item.assigned_to_role,
          ].filter(Boolean).join(" - ") || "No due trigger"}
          status={item.status}
        />
      )} />
    </View>
  );
}

function WorkOrders({
  assets,
  workOrders,
  onCreate,
  onUpdate,
}: {
  assets: EquipmentAsset[];
  workOrders: WorkOrder[];
  onCreate: (input: Partial<WorkOrder>) => void;
  onUpdate: (workOrderId: string, input: Partial<WorkOrder>) => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [workOrderType, setWorkOrderType] = useState("corrective_maintenance");
  const [priority, setPriority] = useState("normal");
  const [riskLevel, setRiskLevel] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [plannedStart, setPlannedStart] = useState("");
  const [plannedEnd, setPlannedEnd] = useState("");
  const [estimatedHours, setEstimatedHours] = useState("");
  const [estimatedCost, setEstimatedCost] = useState("");
  const [quotationId, setQuotationId] = useState("");
  const [purchaseOrderId, setPurchaseOrderId] = useState("");
  const [safetyCritical, setSafetyCritical] = useState(false);
  const [downtimeExpected, setDowntimeExpected] = useState(false);
  const [permitRequired, setPermitRequired] = useState(false);
  const [riskAssessmentRequired, setRiskAssessmentRequired] = useState(false);
  const [lockoutRequired, setLockoutRequired] = useState(false);
  const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>(assets[0]?.id ? [assets[0].id] : []);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleAsset = (id: string) => {
    setSelectedAssetIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  };

  const reset = () => {
    setTitle("");
    setDescription("");
    setWorkOrderType("corrective_maintenance");
    setPriority("normal");
    setRiskLevel("");
    setAssignedTo("");
    setPlannedStart("");
    setPlannedEnd("");
    setEstimatedHours("");
    setEstimatedCost("");
    setQuotationId("");
    setPurchaseOrderId("");
    setSafetyCritical(false);
    setDowntimeExpected(false);
    setPermitRequired(false);
    setRiskAssessmentRequired(false);
    setLockoutRequired(false);
    setSelectedAssetIds(assets[0]?.id ? [assets[0].id] : []);
  };

  return (
    <View>
      <Form title="New work order">
        <Field label="Title" value={title} onChangeText={setTitle} placeholder="Replace starboard generator impeller" />
        <Field label="Description / scope" value={description} onChangeText={setDescription} multiline />
        <Text style={styles.label}>Work order type</Text>
        <ChipSelect items={WORK_ORDER_TYPE_OPTIONS} selected={workOrderType} onSelect={setWorkOrderType} />
        <Text style={styles.label}>Priority</Text>
        <ChipSelect items={PRIORITY_OPTIONS} selected={priority} onSelect={setPriority} />
        <Field label="Risk level" value={riskLevel} onChangeText={setRiskLevel} placeholder="low / medium / high" />
        <Field label="Assigned to" value={assignedTo} onChangeText={setAssignedTo} placeholder="Engineer / yard / contractor" />
        <Field label="Planned start" value={plannedStart} onChangeText={setPlannedStart} placeholder="YYYY-MM-DD" />
        <Field label="Planned end" value={plannedEnd} onChangeText={setPlannedEnd} placeholder="YYYY-MM-DD" />
        <Field label="Estimated labour hours" value={estimatedHours} onChangeText={setEstimatedHours} />
        <Field label="Estimated cost EUR" value={estimatedCost} onChangeText={setEstimatedCost} />
        <Field label="Quotation ID" value={quotationId} onChangeText={setQuotationId} />
        <Field label="Purchase order ID" value={purchaseOrderId} onChangeText={setPurchaseOrderId} />
        <View style={styles.toggleGrid}>
          <FlagToggle label="Safety critical" value={safetyCritical} onPress={() => setSafetyCritical((value) => !value)} />
          <FlagToggle label="Downtime expected" value={downtimeExpected} onPress={() => setDowntimeExpected((value) => !value)} />
          <FlagToggle label="Permit required" value={permitRequired} onPress={() => setPermitRequired((value) => !value)} />
          <FlagToggle label="Risk assessment" value={riskAssessmentRequired} onPress={() => setRiskAssessmentRequired((value) => !value)} />
          <FlagToggle label="Lockout/tagout" value={lockoutRequired} onPress={() => setLockoutRequired((value) => !value)} />
        </View>
        <Text style={styles.label}>Linked equipment</Text>
        <View style={styles.toggleGrid}>
          {assets.map((asset) => (
            <FlagToggle key={asset.id} label={asset.name} value={selectedAssetIds.includes(asset.id)} onPress={() => toggleAsset(asset.id)} />
          ))}
        </View>
        {!assets.length ? <Text style={styles.muted}>Add equipment before creating work orders.</Text> : null}
        <Button
          label="Create work order"
          icon="tool"
          onPress={() => {
            onCreate({
              title,
              description,
              work_order_type: workOrderType,
              priority,
              risk_level: riskLevel,
              assigned_to_user_id: assignedTo,
              planned_start: plannedStart ? new Date(`${plannedStart}T09:00:00.000Z`).toISOString() : undefined,
              planned_end: plannedEnd ? new Date(`${plannedEnd}T17:00:00.000Z`).toISOString() : undefined,
              estimated_labour_hours: estimatedHours ? Number(estimatedHours) : undefined,
              estimated_cost: estimatedCost ? Number(estimatedCost) : undefined,
              currency: "EUR",
              quotation_id: quotationId,
              purchase_order_id: purchaseOrderId,
              safety_critical: safetyCritical,
              downtime_expected: downtimeExpected,
              permit_required: permitRequired,
              risk_assessment_required: riskAssessmentRequired,
              lockout_tagout_required: lockoutRequired,
              asset_ids: selectedAssetIds,
            });
            reset();
          }}
          disabled={!title || !selectedAssetIds.length}
        />
      </Form>
      <SectionList title="Work orders" items={workOrders} empty="No work orders yet." render={(item: WorkOrder) => (
        <Pressable onPress={() => setExpandedId((current) => current === item.id ? null : item.id)}>
          <Row
            title={`${item.work_order_number} - ${item.title}`}
            meta={[
              workOrderAssets(item),
              item.assigned_to_user_id ?? item.assigned_to_name,
              item.planned_start ? `Start ${item.planned_start.slice(0, 10)}` : null,
              item.estimated_cost != null ? `EUR ${Number(item.estimated_cost).toLocaleString("en-US")}` : null,
            ].filter(Boolean).join(" - ") || "Unassigned"}
            status={item.status}
          />
          {expandedId === item.id ? <WorkOrderDetail item={item} onUpdate={(input) => onUpdate(item.id, input)} /> : null}
        </Pressable>
      )} />
    </View>
  );
}

function WorkOrderDetail({ item, onUpdate }: { item: WorkOrder; onUpdate: (input: Partial<WorkOrder>) => void }) {
  const [actualHours, setActualHours] = useState(item.actual_labour_hours != null ? String(item.actual_labour_hours) : "");
  const [actualCost, setActualCost] = useState(item.actual_cost != null ? String(item.actual_cost) : "");
  const [completionSummary, setCompletionSummary] = useState(item.completion_summary ?? "");
  const [verificationNotes, setVerificationNotes] = useState(item.verification_notes ?? "");
  return (
    <View style={styles.subPanel}>
      <View style={styles.detailGrid}>
        <Detail label="Type" value={item.work_order_type} />
        <Detail label="Priority" value={item.priority} />
        <Detail label="Risk" value={item.risk_level} />
        <Detail label="Equipment" value={workOrderAssets(item)} />
        <Detail label="Planned start" value={item.planned_start?.slice(0, 10)} />
        <Detail label="Planned end" value={item.planned_end?.slice(0, 10)} />
        <Detail label="Estimate" value={item.estimated_cost != null ? `EUR ${Number(item.estimated_cost).toLocaleString("en-US")}` : null} />
        <Detail label="Estimated hours" value={item.estimated_labour_hours} />
      </View>
      {item.description ? <DetailBlock title="Scope" body={item.description} /> : null}
      <Text style={styles.label}>Move status</Text>
      <ChipSelect items={WORK_ORDER_STATUS_OPTIONS} selected={item.status} onSelect={(status) => onUpdate({ status })} />
      <Field label="Actual labour hours" value={actualHours} onChangeText={setActualHours} />
      <Field label="Actual cost EUR" value={actualCost} onChangeText={setActualCost} />
      <Field label="Completion summary" value={completionSummary} onChangeText={setCompletionSummary} multiline />
      <Field label="Verification notes" value={verificationNotes} onChangeText={setVerificationNotes} multiline />
      <Button
        label="Save work order update"
        icon="save"
        onPress={() => onUpdate({
          actual_labour_hours: actualHours ? Number(actualHours) : undefined,
          actual_cost: actualCost ? Number(actualCost) : undefined,
          completion_summary: completionSummary,
          verification_notes: verificationNotes,
        })}
      />
    </View>
  );
}

function workOrderAssets(item: WorkOrder): string | null {
  const names = (item.work_order_assets ?? [])
    .map((link) => link.equipment_assets?.name)
    .filter(Boolean);
  return names.length ? names.join(", ") : null;
}

function Defects({
  assets,
  defects,
  onCreate,
  onUpdate,
}: {
  assets: EquipmentAsset[];
  defects: Defect[];
  onCreate: (input: Partial<Defect>) => void;
  onUpdate: (defectId: string, input: Partial<Defect>) => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [severity, setSeverity] = useState("medium");
  const [priority, setPriority] = useState("normal");
  const [operationalLimitation, setOperationalLimitation] = useState("");
  const [safetyImpact, setSafetyImpact] = useState("");
  const [environmentalImpact, setEnvironmentalImpact] = useState("");
  const [counterAtReport, setCounterAtReport] = useState("");
  const [temporaryRepair, setTemporaryRepair] = useState("");
  const [temporaryRepairExpiry, setTemporaryRepairExpiry] = useState("");
  const [warrantyClaimId, setWarrantyClaimId] = useState("");
  const [photoUrls, setPhotoUrls] = useState("");
  const [assetId, setAssetId] = useState<string | null>(assets[0]?.id ?? null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const selectedAsset = assetId ?? assets[0]?.id;

  const reset = () => {
    setTitle("");
    setDescription("");
    setSeverity("medium");
    setPriority("normal");
    setOperationalLimitation("");
    setSafetyImpact("");
    setEnvironmentalImpact("");
    setCounterAtReport("");
    setTemporaryRepair("");
    setTemporaryRepairExpiry("");
    setWarrantyClaimId("");
    setPhotoUrls("");
  };

  return (
    <View>
      <Form title="Report defect">
        <Field label="Title" value={title} onChangeText={setTitle} placeholder="Bilge pump intermittent alarm" />
        <Field label="Description" value={description} onChangeText={setDescription} multiline />
        <Text style={styles.label}>Severity</Text>
        <ChipSelect items={DEFECT_SEVERITY_OPTIONS} selected={severity} onSelect={setSeverity} />
        <Text style={styles.label}>Priority</Text>
        <ChipSelect items={PRIORITY_OPTIONS} selected={priority} onSelect={setPriority} />
        <Field label="Operational limitation" value={operationalLimitation} onChangeText={setOperationalLimitation} multiline />
        <Field label="Safety impact" value={safetyImpact} onChangeText={setSafetyImpact} multiline />
        <Field label="Environmental impact" value={environmentalImpact} onChangeText={setEnvironmentalImpact} multiline />
        <Field label="Counter at report" value={counterAtReport} onChangeText={setCounterAtReport} placeholder="Hours/cycles, optional" />
        <Field label="Temporary repair" value={temporaryRepair} onChangeText={setTemporaryRepair} multiline />
        <Field label="Temporary repair expiry" value={temporaryRepairExpiry} onChangeText={setTemporaryRepairExpiry} placeholder="YYYY-MM-DD, optional" />
        <Field label="Warranty claim ID" value={warrantyClaimId} onChangeText={setWarrantyClaimId} />
        <Field label="Photo URLs" value={photoUrls} onChangeText={setPhotoUrls} placeholder="One URL per line" multiline />
        <ChipSelect items={assets.map((a) => ({ id: a.id, label: a.name }))} selected={selectedAsset ?? null} onSelect={setAssetId} />
        <Button
          label="Create defect"
          icon="alert-triangle"
          onPress={() => {
            onCreate({
              title,
              description,
              equipment_asset_id: selectedAsset,
              severity,
              priority,
              operational_limitation: operationalLimitation,
              safety_impact: safetyImpact,
              environmental_impact: environmentalImpact,
              counter_value_at_report: counterAtReport ? Number(counterAtReport) : undefined,
              temporary_repair: temporaryRepair,
              temporary_repair_expiry: temporaryRepairExpiry ? new Date(`${temporaryRepairExpiry}T12:00:00.000Z`).toISOString() : undefined,
              warranty_claim_id: warrantyClaimId,
              photo_urls: csvToList(photoUrls),
            });
            reset();
          }}
          disabled={!title}
        />
      </Form>
      <SectionList title="Open defects" items={defects} empty="No defects recorded." render={(item: Defect) => (
        <Pressable onPress={() => setExpandedId((current) => current === item.id ? null : item.id)}>
          <Row
            title={`${item.defect_number} - ${item.title}`}
            meta={[
              item.equipment_assets?.name,
              item.reported_at?.slice(0, 10),
              item.priority,
              item.counter_value_at_report != null ? `At ${item.counter_value_at_report}` : null,
            ].filter(Boolean).join(" - ") || "Unassigned"}
            status={item.severity ?? item.status}
          />
          {expandedId === item.id ? <DefectDetail defect={item} onUpdate={(input) => onUpdate(item.id, input)} /> : null}
        </Pressable>
      )} />
    </View>
  );
}

function DefectDetail({ defect, onUpdate }: { defect: Defect; onUpdate: (input: Partial<Defect>) => void }) {
  const [description, setDescription] = useState(defect.description ?? "");
  const [operationalLimitation, setOperationalLimitation] = useState(defect.operational_limitation ?? "");
  const [safetyImpact, setSafetyImpact] = useState(defect.safety_impact ?? "");
  const [environmentalImpact, setEnvironmentalImpact] = useState(defect.environmental_impact ?? "");
  const [temporaryRepair, setTemporaryRepair] = useState(defect.temporary_repair ?? "");
  const [temporaryRepairExpiry, setTemporaryRepairExpiry] = useState(defect.temporary_repair_expiry?.slice(0, 10) ?? "");
  const [photoUrls, setPhotoUrls] = useState((defect.photo_urls ?? []).join("\n"));
  return (
    <View style={styles.subPanel}>
      <View style={styles.detailGrid}>
        <Detail label="Status" value={defect.status} />
        <Detail label="Severity" value={defect.severity} />
        <Detail label="Priority" value={defect.priority} />
        <Detail label="Equipment" value={defect.equipment_assets?.name} />
        <Detail label="Reported" value={defect.reported_at?.slice(0, 10)} />
        <Detail label="Warranty claim" value={defect.warranty_claim_id} />
        <Detail label="Resolved" value={defect.resolved_at?.slice(0, 10)} />
        <Detail label="Verified" value={defect.verified_at?.slice(0, 10)} />
      </View>
      <Text style={styles.label}>Move status</Text>
      <ChipSelect items={DEFECT_STATUS_OPTIONS} selected={defect.status} onSelect={(status) => onUpdate({ status })} />
      <Text style={styles.label}>Severity</Text>
      <ChipSelect items={DEFECT_SEVERITY_OPTIONS} selected={defect.severity ?? "medium"} onSelect={(severity) => onUpdate({ severity })} />
      <Text style={styles.label}>Priority</Text>
      <ChipSelect items={PRIORITY_OPTIONS} selected={defect.priority ?? "normal"} onSelect={(priority) => onUpdate({ priority })} />
      <Field label="Description" value={description} onChangeText={setDescription} multiline />
      <Field label="Operational limitation" value={operationalLimitation} onChangeText={setOperationalLimitation} multiline />
      <Field label="Safety impact" value={safetyImpact} onChangeText={setSafetyImpact} multiline />
      <Field label="Environmental impact" value={environmentalImpact} onChangeText={setEnvironmentalImpact} multiline />
      <Field label="Temporary repair" value={temporaryRepair} onChangeText={setTemporaryRepair} multiline />
      <Field label="Temporary repair expiry" value={temporaryRepairExpiry} onChangeText={setTemporaryRepairExpiry} placeholder="YYYY-MM-DD" />
      <Field label="Photo URLs" value={photoUrls} onChangeText={setPhotoUrls} multiline />
      <Button
        label="Save defect update"
        icon="save"
        onPress={() => onUpdate({
          description,
          operational_limitation: operationalLimitation,
          safety_impact: safetyImpact,
          environmental_impact: environmentalImpact,
          temporary_repair: temporaryRepair,
          temporary_repair_expiry: temporaryRepairExpiry ? new Date(`${temporaryRepairExpiry}T12:00:00.000Z`).toISOString() : undefined,
          photo_urls: csvToList(photoUrls),
        })}
      />
    </View>
  );
}

function ServiceHistory({ assets, events, onCreate }: { assets: EquipmentAsset[]; events: ServiceEvent[]; onCreate: (input: Partial<ServiceEvent>) => void }) {
  const [title, setTitle] = useState("");
  const [performedBy, setPerformedBy] = useState("");
  const [completedAt, setCompletedAt] = useState(new Date().toISOString().slice(0, 10));
  const [startedAt, setStartedAt] = useState("");
  const [serviceType, setServiceType] = useState("manual_service");
  const [workPerformed, setWorkPerformed] = useState("");
  const [defectDescription, setDefectDescription] = useState("");
  const [rootCause, setRootCause] = useState("");
  const [counterBefore, setCounterBefore] = useState("");
  const [counterAfter, setCounterAfter] = useState("");
  const [labourHours, setLabourHours] = useState("");
  const [downtimeHours, setDowntimeHours] = useState("");
  const [cost, setCost] = useState("");
  const [measurementsBefore, setMeasurementsBefore] = useState("");
  const [measurementsAfter, setMeasurementsAfter] = useState("");
  const [partsUsed, setPartsUsed] = useState("");
  const [fluidsUsed, setFluidsUsed] = useState("");
  const [testResult, setTestResult] = useState("");
  const [nextDueAt, setNextDueAt] = useState("");
  const [nextDueCounter, setNextDueCounter] = useState("");
  const [approvedBy, setApprovedBy] = useState("");
  const [authorisedDealer, setAuthorisedDealer] = useState(false);
  const [assetId, setAssetId] = useState<string | null>(assets[0]?.id ?? null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const selectedAsset = assetId ?? assets[0]?.id;

  const reset = () => {
    setTitle("");
    setPerformedBy("");
    setCompletedAt(new Date().toISOString().slice(0, 10));
    setStartedAt("");
    setServiceType("manual_service");
    setWorkPerformed("");
    setDefectDescription("");
    setRootCause("");
    setCounterBefore("");
    setCounterAfter("");
    setLabourHours("");
    setDowntimeHours("");
    setCost("");
    setMeasurementsBefore("");
    setMeasurementsAfter("");
    setPartsUsed("");
    setFluidsUsed("");
    setTestResult("");
    setNextDueAt("");
    setNextDueCounter("");
    setApprovedBy("");
    setAuthorisedDealer(false);
  };

  return (
    <View>
      <Form title="Complete service event">
        <Field label="Title" value={title} onChangeText={setTitle} placeholder="Port engine annual service" />
        <ChipSelect items={SERVICE_TYPE_OPTIONS} selected={serviceType} onSelect={setServiceType} />
        <Field label="Started date" value={startedAt} onChangeText={setStartedAt} placeholder="YYYY-MM-DD, optional" />
        <Field label="Completed date" value={completedAt} onChangeText={setCompletedAt} placeholder="YYYY-MM-DD" />
        <Field label="Performed by" value={performedBy} onChangeText={setPerformedBy} />
        <Field label="Work performed" value={workPerformed} onChangeText={setWorkPerformed} multiline />
        <Field label="Defect / reason for work" value={defectDescription} onChangeText={setDefectDescription} multiline />
        <Field label="Root cause summary" value={rootCause} onChangeText={setRootCause} multiline />
        <Field label="Counter before" value={counterBefore} onChangeText={setCounterBefore} placeholder="Engine/generator hours before" />
        <Field label="Counter after" value={counterAfter} onChangeText={setCounterAfter} placeholder="Engine/generator hours after" />
        <Field label="Labour hours" value={labourHours} onChangeText={setLabourHours} />
        <Field label="Downtime hours" value={downtimeHours} onChangeText={setDowntimeHours} />
        <Field label="Cost EUR" value={cost} onChangeText={setCost} />
        <Field label="Measurements before" value={measurementsBefore} onChangeText={setMeasurementsBefore} placeholder={"Oil pressure: 4.2 bar\nCoolant temp: 82 C"} multiline />
        <Field label="Measurements after" value={measurementsAfter} onChangeText={setMeasurementsAfter} placeholder={"Oil pressure: 4.4 bar\nCoolant temp: 80 C"} multiline />
        <Field label="Parts used" value={partsUsed} onChangeText={setPartsUsed} placeholder={"Oil filter | 2 | MAN 51.05501-0009\nImpeller | 1"} multiline />
        <Field label="Fluids used" value={fluidsUsed} onChangeText={setFluidsUsed} placeholder={"Engine oil | 38 | L\nCoolant | 5 | L"} multiline />
        <Field label="Test result" value={testResult} onChangeText={setTestResult} multiline />
        <Field label="Next due date" value={nextDueAt} onChangeText={setNextDueAt} placeholder="YYYY-MM-DD, optional" />
        <Field label="Next due counter" value={nextDueCounter} onChangeText={setNextDueCounter} placeholder="Hours/cycles, optional" />
        <Field label="Approved by" value={approvedBy} onChangeText={setApprovedBy} />
        <View style={styles.toggleGrid}>
          <FlagToggle label="Authorised dealer" value={authorisedDealer} onPress={() => setAuthorisedDealer((value) => !value)} />
        </View>
        <ChipSelect items={assets.map((a) => ({ id: a.id, label: a.name }))} selected={selectedAsset ?? null} onSelect={setAssetId} />
        <Button
          label="Save service event"
          icon="check-circle"
          onPress={() => {
            onCreate({
              title,
              service_type: serviceType,
              technician_id: performedBy,
              equipment_asset_id: selectedAsset,
              started_at: startedAt ? new Date(`${startedAt}T09:00:00.000Z`).toISOString() : undefined,
              completed_at: completedAt ? new Date(`${completedAt}T12:00:00.000Z`).toISOString() : undefined,
              work_performed: workPerformed,
              defect_description: defectDescription,
              root_cause_summary: rootCause,
              counter_value_before: counterBefore ? Number(counterBefore) : undefined,
              counter_value_after: counterAfter ? Number(counterAfter) : undefined,
              labour_hours: labourHours ? Number(labourHours) : undefined,
              downtime_hours: downtimeHours ? Number(downtimeHours) : undefined,
              measurements_before: textToObject(measurementsBefore),
              measurements_after: textToObject(measurementsAfter),
              parts_used: partsOrFluids(partsUsed, "part"),
              fluids_used: partsOrFluids(fluidsUsed, "fluid"),
              cost: cost ? Number(cost) : undefined,
              currency: "EUR",
              test_result: testResult,
              next_due_at: nextDueAt ? new Date(`${nextDueAt}T12:00:00.000Z`).toISOString() : undefined,
              next_due_counter_value: nextDueCounter ? Number(nextDueCounter) : undefined,
              approved_by: approvedBy,
              authorised_dealer: authorisedDealer,
            });
            reset();
          }}
          disabled={!title || !workPerformed || !selectedAsset}
        />
      </Form>
      <SectionList title="Immutable service history" items={events} empty="No service events yet." render={(item: ServiceEvent) => (
        <Pressable onPress={() => setExpandedId((current) => current === item.id ? null : item.id)}>
          <Row
            title={`${item.service_event_number} - ${item.title}`}
            meta={[
              (item.completed_at ?? item.performed_at)?.slice(0, 10),
              item.equipment_assets?.name,
              item.technician_id ?? item.performed_by_name,
              item.cost != null ? `EUR ${Number(item.cost).toLocaleString("en-US")}` : null,
            ].filter(Boolean).join(" - ")}
            status={item.service_type}
          />
          {expandedId === item.id ? <ServiceEventDetail event={item} /> : null}
        </Pressable>
      )} />
    </View>
  );
}

function textToObject(text: string): Record<string, string> {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .reduce<Record<string, string>>((acc, line, index) => {
      const parts = line.split(":");
      if (parts.length > 1) {
        const key = parts.shift()!.trim();
        acc[key || `measurement_${index + 1}`] = parts.join(":").trim();
      } else {
        acc[`measurement_${index + 1}`] = line;
      }
      return acc;
    }, {});
}

function partsOrFluids(text: string, kind: "part" | "fluid"): Record<string, string | number | null>[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [name, quantity, unitOrPartNumber] = line.split("|").map((part) => part.trim());
      return {
        name,
        quantity: quantity ? Number(quantity) || quantity : null,
        [kind === "part" ? "part_number" : "unit"]: unitOrPartNumber || null,
      };
    });
}

function ServiceEventDetail({ event }: { event: ServiceEvent }) {
  const parts = event.parts_used ?? [];
  const fluids = event.fluids_used ?? [];
  return (
    <View style={styles.subPanel}>
      <View style={styles.detailGrid}>
        <Detail label="Equipment" value={event.equipment_assets?.name} />
        <Detail label="Technician" value={event.technician_id ?? event.performed_by_name} />
        <Detail label="Counter" value={[event.counter_value_before, event.counter_value_after].filter((v) => v != null).join(" -> ")} />
        <Detail label="Labour" value={event.labour_hours != null ? `${event.labour_hours} h` : null} />
        <Detail label="Downtime" value={event.downtime_hours != null ? `${event.downtime_hours} h` : null} />
        <Detail label="Next due" value={[event.next_due_at?.slice(0, 10), event.next_due_counter_value != null ? `${event.next_due_counter_value}` : null].filter(Boolean).join(" / ")} />
        <Detail label="Dealer" value={event.authorised_dealer ? "Authorised" : "Not marked"} />
        <Detail label="Approved by" value={event.approved_by} />
      </View>
      {event.defect_description ? <DetailBlock title="Defect / reason" body={event.defect_description} /> : null}
      {event.root_cause_summary ? <DetailBlock title="Root cause" body={event.root_cause_summary} /> : null}
      {event.work_performed ? <DetailBlock title="Work performed" body={event.work_performed} /> : null}
      {event.test_result ? <DetailBlock title="Test result" body={event.test_result} /> : null}
      {Object.keys(event.measurements_before ?? {}).length ? <DetailBlock title="Measurements before" body={objectLines(event.measurements_before)} /> : null}
      {Object.keys(event.measurements_after ?? {}).length ? <DetailBlock title="Measurements after" body={objectLines(event.measurements_after)} /> : null}
      {parts.length ? <DetailBlock title="Parts used" body={itemLines(parts)} /> : null}
      {fluids.length ? <DetailBlock title="Fluids used" body={itemLines(fluids)} /> : null}
    </View>
  );
}

function DetailBlock({ title, body }: { title: string; body?: string | null }) {
  if (!body) return null;
  return (
    <View style={styles.historyBlock}>
      <Text style={styles.detailLabel}>{title}</Text>
      <Text style={styles.historyText}>{body}</Text>
    </View>
  );
}

function objectLines(value?: Record<string, unknown> | null): string {
  return Object.entries(value ?? {}).map(([key, val]) => `${key}: ${String(val)}`).join("\n");
}

function itemLines(items: unknown[]): string {
  return items.map((item) => {
    if (typeof item !== "object" || item == null) return String(item);
    const record = item as Record<string, unknown>;
    return [record.name, record.quantity, record.part_number, record.unit].filter(Boolean).join(" - ");
  }).join("\n");
}

function History({ assets, events, onCreate }: { assets: EquipmentAsset[]; events: ServiceEvent[]; onCreate: (input: Partial<ServiceEvent>) => void }) {
  const [title, setTitle] = useState("");
  const [performedBy, setPerformedBy] = useState("");
  const [completedAt, setCompletedAt] = useState(new Date().toISOString().slice(0, 10));
  const [workPerformed, setWorkPerformed] = useState("");
  const [counterBefore, setCounterBefore] = useState("");
  const [counterAfter, setCounterAfter] = useState("");
  const [labourHours, setLabourHours] = useState("");
  const [downtimeHours, setDowntimeHours] = useState("");
  const [cost, setCost] = useState("");
  const [testResult, setTestResult] = useState("");
  const [assetId, setAssetId] = useState<string | null>(assets[0]?.id ?? null);
  const reset = () => {
    setTitle("");
    setPerformedBy("");
    setCompletedAt(new Date().toISOString().slice(0, 10));
    setWorkPerformed("");
    setCounterBefore("");
    setCounterAfter("");
    setLabourHours("");
    setDowntimeHours("");
    setCost("");
    setTestResult("");
  };
  return (
    <View>
      <Form title="Complete service event">
        <Field label="Title" value={title} onChangeText={setTitle} placeholder="Port engine annual service" />
        <Field label="Completed date" value={completedAt} onChangeText={setCompletedAt} placeholder="YYYY-MM-DD" />
        <Field label="Performed by" value={performedBy} onChangeText={setPerformedBy} />
        <Field label="Work performed" value={workPerformed} onChangeText={setWorkPerformed} multiline />
        <Field label="Counter before" value={counterBefore} onChangeText={setCounterBefore} placeholder="Engine/generator hours before" />
        <Field label="Counter after" value={counterAfter} onChangeText={setCounterAfter} placeholder="Engine/generator hours after" />
        <Field label="Labour hours" value={labourHours} onChangeText={setLabourHours} />
        <Field label="Downtime hours" value={downtimeHours} onChangeText={setDowntimeHours} />
        <Field label="Cost EUR" value={cost} onChangeText={setCost} />
        <Field label="Test result" value={testResult} onChangeText={setTestResult} multiline />
        <ChipSelect items={assets.map((a) => ({ id: a.id, label: a.name }))} selected={assetId ?? assets[0]?.id ?? null} onSelect={setAssetId} />
        <Button
          label="Save service event"
          icon="check-circle"
          onPress={() => {
            onCreate({
              title,
              technician_id: performedBy,
              equipment_asset_id: assetId ?? assets[0]?.id,
              completed_at: completedAt ? new Date(`${completedAt}T12:00:00.000Z`).toISOString() : undefined,
              work_performed: workPerformed,
              counter_value_before: counterBefore ? Number(counterBefore) : undefined,
              counter_value_after: counterAfter ? Number(counterAfter) : undefined,
              labour_hours: labourHours ? Number(labourHours) : undefined,
              downtime_hours: downtimeHours ? Number(downtimeHours) : undefined,
              cost: cost ? Number(cost) : undefined,
              currency: "EUR",
              test_result: testResult,
            });
            reset();
          }}
          disabled={!title || !workPerformed || !(assetId ?? assets[0]?.id)}
        />
      </Form>
      <SectionList title="Immutable service history" items={events} empty="No service events yet." render={(item: ServiceEvent) => (
        <Row
          title={`${item.service_event_number} - ${item.title}`}
          meta={[
            (item.completed_at ?? item.performed_at)?.slice(0, 10),
            item.equipment_assets?.name,
            item.technician_id ?? item.performed_by_name,
            item.cost != null ? `€${Number(item.cost).toLocaleString("en-US")}` : null,
          ].filter(Boolean).join(" - ")}
          status={item.service_type}
        />
      )} />
    </View>
  );
}

function Parts({
  assets,
  parts,
  onCreate,
  onUpdate,
  onMove,
}: {
  assets: EquipmentAsset[];
  parts: SparePart[];
  onCreate: (input: Partial<SparePart>) => void;
  onUpdate: (partId: string, input: Partial<SparePart>) => void;
  onMove: (partId: string, input: Partial<InventoryMovement>) => void;
}) {
  const [name, setName] = useState("");
  const [partNumber, setPartNumber] = useState("");
  const [manufacturer, setManufacturer] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [minimumStock, setMinimumStock] = useState("1");
  const [reorderLevel, setReorderLevel] = useState("1");
  const [unit, setUnit] = useState("pcs");
  const [unitCost, setUnitCost] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [notes, setNotes] = useState("");
  const [assetId, setAssetId] = useState<string | null>(assets[0]?.id ?? null);
  const [compatibleAssetIds, setCompatibleAssetIds] = useState<string[]>(assets[0]?.id ? [assets[0].id] : []);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleCompatible = (id: string) => {
    setCompatibleAssetIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  };

  const reset = () => {
    setName("");
    setPartNumber("");
    setManufacturer("");
    setQuantity("1");
    setMinimumStock("1");
    setReorderLevel("1");
    setUnit("pcs");
    setUnitCost("");
    setExpiryDate("");
    setNotes("");
  };

  return (
    <View>
      <Form title="Add spare part">
        <Field label="Name" value={name} onChangeText={setName} />
        <Field label="Part number" value={partNumber} onChangeText={setPartNumber} />
        <Field label="Manufacturer" value={manufacturer} onChangeText={setManufacturer} />
        <Field label="Quantity on hand" value={quantity} onChangeText={setQuantity} />
        <Field label="Minimum stock" value={minimumStock} onChangeText={setMinimumStock} />
        <Field label="Reorder level" value={reorderLevel} onChangeText={setReorderLevel} />
        <Field label="Unit" value={unit} onChangeText={setUnit} placeholder="pcs / L / set" />
        <Field label="Unit cost EUR" value={unitCost} onChangeText={setUnitCost} />
        <Field label="Expiry date" value={expiryDate} onChangeText={setExpiryDate} placeholder="YYYY-MM-DD, optional" />
        <Field label="Notes" value={notes} onChangeText={setNotes} multiline />
        <Text style={styles.label}>Primary equipment</Text>
        <ChipSelect items={assets.map((a) => ({ id: a.id, label: a.name }))} selected={assetId ?? assets[0]?.id ?? null} onSelect={setAssetId} />
        <Text style={styles.label}>Compatible equipment</Text>
        <View style={styles.toggleGrid}>
          {assets.map((asset) => (
            <FlagToggle key={asset.id} label={asset.name} value={compatibleAssetIds.includes(asset.id)} onPress={() => toggleCompatible(asset.id)} />
          ))}
        </View>
        <Button
          label="Save part"
          icon="package"
          onPress={() => {
            onCreate({
              name,
              part_number: partNumber,
              manufacturer,
              quantity_on_hand: Number(quantity) || 0,
              minimum_stock: Number(minimumStock) || 0,
              reorder_level: Number(reorderLevel) || 0,
              unit,
              unit_cost: unitCost ? Number(unitCost) : undefined,
              currency: "EUR",
              expiry_date: expiryDate || undefined,
              notes,
              equipment_asset_id: assetId ?? assets[0]?.id,
              compatible_asset_ids: compatibleAssetIds,
            });
            reset();
          }}
          disabled={!name}
        />
      </Form>
      <SectionList title="Inventory" items={parts} empty="No spare parts yet." render={(item: SparePart) => (
        <Pressable onPress={() => setExpandedId((current) => current === item.id ? null : item.id)}>
          <Row
            title={item.name}
            meta={[
              item.part_number,
              item.manufacturer,
              `${item.quantity_on_hand} ${item.unit ?? "pcs"}`,
              item.unit_cost != null ? `EUR ${Number(item.unit_cost).toLocaleString("en-US")}` : null,
            ].filter(Boolean).join(" - ")}
            status={partStockStatus(item)}
          />
          {expandedId === item.id ? <PartDetail part={item} onUpdate={(input) => onUpdate(item.id, input)} onMove={(input) => onMove(item.id, input)} /> : null}
        </Pressable>
      )} />
    </View>
  );
}

function PartDetail({ part, onUpdate, onMove }: { part: SparePart; onUpdate: (input: Partial<SparePart>) => void; onMove: (input: Partial<InventoryMovement>) => void }) {
  const [minimumStock, setMinimumStock] = useState(String(part.minimum_stock ?? 0));
  const [reorderLevel, setReorderLevel] = useState(String(part.reorder_level ?? 0));
  const [unitCost, setUnitCost] = useState(part.unit_cost != null ? String(part.unit_cost) : "");
  const [notes, setNotes] = useState(part.notes ?? "");
  const [moveType, setMoveType] = useState("receive");
  const [moveQuantity, setMoveQuantity] = useState("1");
  const [moveNotes, setMoveNotes] = useState("");
  return (
    <View style={styles.subPanel}>
      <View style={styles.detailGrid}>
        <Detail label="Part number" value={part.part_number} />
        <Detail label="Manufacturer" value={part.manufacturer} />
        <Detail label="Stock" value={`${part.quantity_on_hand} ${part.unit ?? "pcs"}`} />
        <Detail label="Minimum" value={part.minimum_stock} />
        <Detail label="Reorder" value={part.reorder_level} />
        <Detail label="Expiry" value={part.expiry_date} />
      </View>
      <Field label="Minimum stock" value={minimumStock} onChangeText={setMinimumStock} />
      <Field label="Reorder level" value={reorderLevel} onChangeText={setReorderLevel} />
      <Field label="Unit cost EUR" value={unitCost} onChangeText={setUnitCost} />
      <Field label="Notes" value={notes} onChangeText={setNotes} multiline />
      <Button
        label="Save inventory settings"
        icon="save"
        onPress={() => onUpdate({
          minimum_stock: Number(minimumStock) || 0,
          reorder_level: Number(reorderLevel) || 0,
          unit_cost: unitCost ? Number(unitCost) : undefined,
          notes,
        })}
      />
      <View style={styles.historyBlock}>
        <Text style={styles.label}>Stock movement</Text>
        <ChipSelect
          items={[
            { id: "receive", label: "Receive" },
            { id: "consume", label: "Consume" },
            { id: "reserve", label: "Reserve" },
            { id: "adjust", label: "Adjust +" },
            { id: "scrap", label: "Scrap" },
            { id: "return", label: "Return" },
          ]}
          selected={moveType}
          onSelect={setMoveType}
        />
        <Field label="Quantity" value={moveQuantity} onChangeText={setMoveQuantity} />
        <Field label="Movement notes" value={moveNotes} onChangeText={setMoveNotes} />
        <Button
          label="Record movement"
          icon="shuffle"
          onPress={() => {
            onMove({ movement_type: moveType, quantity: Number(moveQuantity) || 0, notes: moveNotes });
            setMoveQuantity("1");
            setMoveNotes("");
          }}
          disabled={!moveQuantity || Number(moveQuantity) <= 0}
        />
      </View>
    </View>
  );
}

function partStockStatus(part: SparePart): string {
  const quantity = Number(part.quantity_on_hand ?? 0);
  const minimum = Number(part.minimum_stock ?? 0);
  const reorder = Number(part.reorder_level ?? 0);
  if (quantity <= minimum) return "low stock";
  if (reorder && quantity <= reorder) return "reorder";
  return "stock ok";
}

function Attachments({
  assets,
  workOrders,
  defects,
  serviceEvents,
  documents,
  onCreate,
  onUpload,
  onOpen,
}: {
  assets: EquipmentAsset[];
  workOrders: WorkOrder[];
  defects: Defect[];
  serviceEvents: ServiceEvent[];
  documents: MaintenanceDocument[];
  onCreate: (input: Partial<MaintenanceDocument>) => void;
  onUpload: (input: UploadMaintenanceDocumentInput) => void;
  onOpen: (documentId: string) => void;
}) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("photo");
  const [fileUrl, setFileUrl] = useState("");
  const [mimeType, setMimeType] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [version, setVersion] = useState("1");
  const [isPrivate, setIsPrivate] = useState(true);
  const [linkType, setLinkType] = useState<"equipment" | "work_order" | "service_event" | "defect" | "none">("equipment");
  const [linkedId, setLinkedId] = useState<string | null>(assets[0]?.id ?? null);

  const linkOptions =
    linkType === "equipment" ? assets.map((item) => ({ id: item.id, label: item.name })) :
    linkType === "work_order" ? workOrders.map((item) => ({ id: item.id, label: `${item.work_order_number} - ${item.title}` })) :
    linkType === "service_event" ? serviceEvents.map((item) => ({ id: item.id, label: `${item.service_event_number} - ${item.title}` })) :
    linkType === "defect" ? defects.map((item) => ({ id: item.id, label: `${item.defect_number} - ${item.title}` })) :
    [];

  useEffect(() => {
    setLinkedId(linkOptions[0]?.id ?? null);
  }, [linkType]);

  const reset = () => {
    setTitle("");
    setCategory("photo");
    setFileUrl("");
    setMimeType("");
    setExpiresAt("");
    setVersion("1");
    setIsPrivate(true);
  };

  const linkPayload = () => ({
    equipment_asset_id: linkType === "equipment" ? linkedId : undefined,
    work_order_id: linkType === "work_order" ? linkedId : undefined,
    service_event_id: linkType === "service_event" ? linkedId : undefined,
    defect_id: linkType === "defect" ? linkedId : undefined,
  });

  const uploadPickedFile = (file: {
    uri: string;
    name?: string | null;
    mimeType?: string | null;
    category?: string | null;
  }) => {
    const pickedTitle = title || file.name?.replace(/\.[^.]+$/, "") || "Maintenance attachment";
    onUpload({
      localUri: file.uri,
      fileName: file.name,
      mimeType: file.mimeType,
      title: pickedTitle,
      category: file.category ?? category,
      expires_at: expiresAt ? new Date(`${expiresAt}T12:00:00.000Z`).toISOString() : undefined,
      version: Number(version) || 1,
      is_private: isPrivate,
      ...linkPayload(),
    });
    reset();
  };

  const pickPhoto = async () => {
    if (Platform.OS !== "web") {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert("Photo library access needed", "Enable photo library access in Settings.");
        return;
      }
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    uploadPickedFile({
      uri: asset.uri,
      name: asset.fileName ?? `maintenance_photo_${Date.now()}.jpg`,
      mimeType: asset.mimeType ?? "image/jpeg",
      category: "photo",
    });
  };

  const takePhoto = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Camera access needed", "Enable camera access in Settings.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    uploadPickedFile({
      uri: asset.uri,
      name: asset.fileName ?? `maintenance_photo_${Date.now()}.jpg`,
      mimeType: asset.mimeType ?? "image/jpeg",
      category: "photo",
    });
  };

  const pickDocument = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      copyToCacheDirectory: true,
      multiple: false,
      type: "*/*",
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    uploadPickedFile({
      uri: asset.uri,
      name: asset.name,
      mimeType: asset.mimeType ?? "application/octet-stream",
      category: category === "photo" ? "document" : category,
    });
  };

  return (
    <View>
      <Form title="Add photo or document">
        <Field label="Title" value={title} onChangeText={setTitle} placeholder="Main engine service invoice" />
        <Text style={styles.label}>Category</Text>
        <ChipSelect items={ATTACHMENT_CATEGORY_OPTIONS} selected={category} onSelect={setCategory} />
        <View style={styles.toggleGrid}>
          <Button label="Choose photo" icon="image" onPress={() => void pickPhoto()} />
          <Button label="Take photo" icon="camera" onPress={() => void takePhoto()} />
          <Button label="Choose document" icon="file-plus" onPress={() => void pickDocument()} />
        </View>
        <Field label="File / photo URL" value={fileUrl} onChangeText={setFileUrl} placeholder="https://..." />
        <Field label="MIME type" value={mimeType} onChangeText={setMimeType} placeholder="image/jpeg / application/pdf" />
        <Field label="Expiry date" value={expiresAt} onChangeText={setExpiresAt} placeholder="YYYY-MM-DD, optional" />
        <Field label="Version" value={version} onChangeText={setVersion} />
        <View style={styles.toggleGrid}>
          <FlagToggle label="Private" value={isPrivate} onPress={() => setIsPrivate((value) => !value)} />
        </View>
        <Text style={styles.label}>Attach to</Text>
        <ChipSelect
          items={[
            { id: "equipment", label: "Equipment" },
            { id: "work_order", label: "Work order" },
            { id: "service_event", label: "Service event" },
            { id: "defect", label: "Defect" },
            { id: "none", label: "General" },
          ]}
          selected={linkType}
          onSelect={(id) => setLinkType(id as typeof linkType)}
        />
        {linkOptions.length ? <ChipSelect items={linkOptions} selected={linkedId} onSelect={setLinkedId} /> : null}
        <Button
          label="Save attachment"
          icon="paperclip"
          onPress={() => {
            onCreate({
              title,
              category,
              file_url: fileUrl,
              mime_type: mimeType,
              expires_at: expiresAt ? new Date(`${expiresAt}T12:00:00.000Z`).toISOString() : undefined,
              version: Number(version) || 1,
              is_private: isPrivate,
              equipment_asset_id: linkType === "equipment" ? linkedId : undefined,
              work_order_id: linkType === "work_order" ? linkedId : undefined,
              service_event_id: linkType === "service_event" ? linkedId : undefined,
              defect_id: linkType === "defect" ? linkedId : undefined,
            });
            reset();
          }}
          disabled={!title || !fileUrl}
        />
      </Form>
      <SectionList title="Attachment register" items={documents} empty="No attachments yet." render={(item: MaintenanceDocument) => (
        <Pressable onPress={() => onOpen(item.id)}>
          <Row
            title={item.title}
            meta={[
              item.category,
              attachmentOwner(item),
              item.expires_at ? `Expires ${item.expires_at.slice(0, 10)}` : null,
              item.file_path ? "stored privately" : item.file_url,
            ].filter(Boolean).join(" - ")}
            status={item.category === "photo" ? "photo" : "document"}
          />
        </Pressable>
      )} />
    </View>
  );
}

function attachmentOwner(item: MaintenanceDocument): string | null {
  if (item.equipment_assets?.name) return item.equipment_assets.name;
  if (item.work_orders) return [item.work_orders.work_order_number, item.work_orders.title].filter(Boolean).join(" - ");
  if (item.service_events) return [item.service_events.service_event_number, item.service_events.title].filter(Boolean).join(" - ");
  if (item.defects) return [item.defects.defect_number, item.defects.title].filter(Boolean).join(" - ");
  return null;
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
  toggleGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 8 },
  toggle: { flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1, borderColor: LINE, borderRadius: 8, backgroundColor: PANEL, paddingHorizontal: 12, paddingVertical: 10 },
  toggleActive: { backgroundColor: GOLD, borderColor: GOLD },
  toggleText: { color: MUTED, fontFamily: "Inter_600SemiBold", fontSize: 12 },
  toggleTextActive: { color: NAVY },
  detailGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 14 },
  detailItem: { minWidth: 150, flexGrow: 1, flexBasis: "30%", borderWidth: 1, borderColor: LINE, borderRadius: 8, backgroundColor: PANEL, padding: 12 },
  detailLabel: { color: GOLD, fontFamily: "Inter_600SemiBold", fontSize: 10, letterSpacing: 1.6, textTransform: "uppercase", marginBottom: 5 },
  detailValue: { color: IVORY, fontFamily: "Inter_600SemiBold", fontSize: 14, lineHeight: 19 },
  subPanel: { borderWidth: 1, borderColor: LINE, borderRadius: 8, padding: 14, marginTop: 12, backgroundColor: "rgba(247,243,236,0.035)" },
  historyBlock: { borderTopWidth: 1, borderTopColor: LINE, paddingTop: 12, marginTop: 12 },
  historyText: { color: IVORY, fontFamily: "Inter_400Regular", fontSize: 14, lineHeight: 20 },
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
