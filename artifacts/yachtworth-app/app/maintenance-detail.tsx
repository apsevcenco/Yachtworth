import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  getDefects,
  getEquipmentAssets,
  getMaintenanceDocumentSignedUrl,
  getMaintenanceDocuments,
  getMaintenanceTasks,
  getServiceEvents,
  getSpareParts,
  getWorkOrders,
  getYachts,
  type Defect,
  type EquipmentAsset,
  type MaintenanceDocument,
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

type DetailType = "equipment" | "task" | "work" | "defect" | "service" | "part" | "document";

function param(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function yachtTitle(yacht: YachtOption | undefined): string {
  if (!yacht) return "Maintenance";
  return yacht.name ?? ([yacht.manufacturer, yacht.model].filter(Boolean).join(" ") || "Unnamed yacht");
}

function statusColor(value?: string | null): string {
  const status = (value ?? "").toLowerCase();
  if (status.includes("overdue") || status.includes("critical") || status.includes("expired")) return RED;
  if (status.includes("complete") || status.includes("closed") || status.includes("verified") || status.includes("ok")) return GREEN;
  return GOLD;
}

function formatDate(value?: string | null): string | null {
  return value ? value.slice(0, 10) : null;
}

function money(value?: number | null, currency = "EUR"): string | null {
  return value == null ? null : `${currency} ${Number(value).toLocaleString("en-US")}`;
}

function objectLines(value?: Record<string, unknown> | null): string {
  return Object.entries(value ?? {}).map(([key, val]) => `${key}: ${String(val)}`).join("\n");
}

function itemLines(items?: unknown[] | null): string {
  return (items ?? []).map((item) => {
    if (typeof item !== "object" || item == null) return String(item);
    const record = item as Record<string, unknown>;
    return [record.name, record.quantity, record.part_number, record.unit].filter(Boolean).join(" - ");
  }).join("\n");
}

function workOrderAssets(item: WorkOrder): string | null {
  const names = (item.work_order_assets ?? [])
    .map((link) => link.equipment_assets?.name)
    .filter(Boolean);
  return names.length ? names.join(", ") : null;
}

function attachmentOwner(item: MaintenanceDocument): string | null {
  if (item.equipment_assets?.name) return item.equipment_assets.name;
  if (item.work_orders) return [item.work_orders.work_order_number, item.work_orders.title].filter(Boolean).join(" - ");
  if (item.service_events) return [item.service_events.service_event_number, item.service_events.title].filter(Boolean).join(" - ");
  if (item.defects) return [item.defects.defect_number, item.defects.title].filter(Boolean).join(" - ");
  return null;
}

export default function MaintenanceDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const yachtId = param(params.yachtId);
  const type = param(params.type) as DetailType;
  const id = param(params.id);

  const yachtsQ = useQuery({ queryKey: ["maintenance-yachts"], queryFn: getYachts });
  const assetsQ = useQuery({ queryKey: ["maintenance-assets", yachtId], queryFn: () => getEquipmentAssets(yachtId), enabled: !!yachtId });
  const tasksQ = useQuery({ queryKey: ["maintenance-tasks", yachtId], queryFn: () => getMaintenanceTasks(yachtId), enabled: !!yachtId });
  const workQ = useQuery({ queryKey: ["maintenance-work-orders", yachtId], queryFn: () => getWorkOrders(yachtId), enabled: !!yachtId });
  const defectsQ = useQuery({ queryKey: ["maintenance-defects", yachtId], queryFn: () => getDefects(yachtId), enabled: !!yachtId });
  const serviceQ = useQuery({ queryKey: ["maintenance-service-events", yachtId], queryFn: () => getServiceEvents(yachtId), enabled: !!yachtId });
  const partsQ = useQuery({ queryKey: ["maintenance-parts", yachtId], queryFn: () => getSpareParts(yachtId), enabled: !!yachtId });
  const docsQ = useQuery({ queryKey: ["maintenance-documents", yachtId], queryFn: () => getMaintenanceDocuments(yachtId), enabled: !!yachtId });

  const yacht = yachtsQ.data?.find((item) => item.id === yachtId);
  const loading = [assetsQ, tasksQ, workQ, defectsQ, serviceQ, partsQ, docsQ].some((query) => query.isLoading);
  const title = detailTitle(type);

  const openDocument = async (documentId: string) => {
    try {
      const url = await getMaintenanceDocumentSignedUrl(yachtId, documentId);
      await Linking.openURL(url);
    } catch (err) {
      Alert.alert("Maintenance", err instanceof Error ? err.message : "Could not open attachment");
    }
  };

  const content = (() => {
    if (type === "equipment") return <EquipmentCard item={assetsQ.data?.find((item) => item.id === id)} />;
    if (type === "task") return <TaskCard item={tasksQ.data?.find((item) => item.id === id)} />;
    if (type === "work") return <WorkOrderCard item={workQ.data?.find((item) => item.id === id)} />;
    if (type === "defect") return <DefectCard item={defectsQ.data?.find((item) => item.id === id)} />;
    if (type === "service") return <ServiceCard item={serviceQ.data?.find((item) => item.id === id)} />;
    if (type === "part") return <PartCard item={partsQ.data?.find((item) => item.id === id)} />;
    if (type === "document") return <DocumentCard item={docsQ.data?.find((item) => item.id === id)} onOpen={() => openDocument(id)} />;
    return <EmptyCard text="Unknown maintenance card type." />;
  })();

  return (
    <View style={[styles.root, { paddingTop: Platform.OS === "web" ? 67 : insets.top + 56 }]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <Pressable style={styles.iconButton} onPress={() => router.replace("/maintenance" as never)}>
            <Feather name="arrow-left" size={24} color={IVORY} />
          </Pressable>
          <View style={styles.headerText}>
            <Text style={styles.eyebrow}>Maintenance</Text>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>{yachtTitle(yacht)}</Text>
          </View>
        </View>
        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={GOLD} />
            <Text style={styles.muted}>Loading card...</Text>
          </View>
        ) : content}
      </ScrollView>
    </View>
  );
}

function detailTitle(type: DetailType): string {
  if (type === "equipment") return "Equipment card";
  if (type === "task") return "Task card";
  if (type === "work") return "Work order card";
  if (type === "defect") return "Defect card";
  if (type === "service") return "Service event card";
  if (type === "part") return "Spare part card";
  if (type === "document") return "Attachment card";
  return "Maintenance card";
}

function StatusPill({ value }: { value?: string | null }) {
  const status = value ?? "unknown";
  const color = statusColor(status);
  return (
    <View style={[styles.pill, { borderColor: color }]}>
      <Text style={[styles.pillText, { color }]}>{status}</Text>
    </View>
  );
}

function Detail({ label, value }: { label: string; value?: string | number | null }) {
  if (value == null || value === "") return null;
  return (
    <View style={styles.detailItem}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{String(value)}</Text>
    </View>
  );
}

function DetailBlock({ title, body }: { title: string; body?: string | null }) {
  if (!body) return null;
  return (
    <View style={styles.block}>
      <Text style={styles.blockTitle}>{title}</Text>
      <Text style={styles.blockText}>{body}</Text>
    </View>
  );
}

function CardShell({ title, subtitle, status, children }: { title: string; subtitle?: string | null; status?: string | null; children: React.ReactNode }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleWrap}>
          <Text style={styles.cardTitle}>{title}</Text>
          {subtitle ? <Text style={styles.cardSubtitle}>{subtitle}</Text> : null}
        </View>
        <StatusPill value={status} />
      </View>
      {children}
    </View>
  );
}

function EmptyCard({ text }: { text: string }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{text}</Text>
      <Text style={styles.muted}>Return to Maintenance and refresh the list if this card was recently changed.</Text>
    </View>
  );
}

function EquipmentCard({ item }: { item?: EquipmentAsset }) {
  if (!item) return <EmptyCard text="Equipment card not found." />;
  return (
    <CardShell title={item.display_name ?? item.name} subtitle={item.maintenance_systems?.name} status={item.criticality ?? item.operational_status ?? item.status}>
      <View style={styles.detailGrid}>
        <Detail label="Type" value={item.asset_type} />
        <Detail label="Code" value={item.asset_code} />
        <Detail label="Maker" value={item.manufacturer} />
        <Detail label="Model" value={item.model} />
        <Detail label="Serial" value={item.serial_number} />
        <Detail label="Part no." value={item.part_number} />
        <Detail label="Condition" value={item.condition_status} />
        <Detail label="Warranty end" value={formatDate(item.warranty_end ?? item.warranty_expires_at)} />
        <Detail label="Warranty hours" value={item.warranty_hours_limit} />
        <Detail label="Replacement" value={money(item.replacement_cost, item.replacement_cost_currency ?? "EUR")} />
      </View>
      {item.equipment_counters?.length ? <DetailBlock title="Counters" body={item.equipment_counters.map((counter) => `${counter.counter_type}: ${counter.current_value} ${counter.unit}`).join("\n")} /> : null}
      {item.photo_urls?.length ? <DetailBlock title="Photos" body={item.photo_urls.join("\n")} /> : null}
      {item.document_urls?.length ? <DetailBlock title="Documents" body={item.document_urls.join("\n")} /> : null}
    </CardShell>
  );
}

function TaskCard({ item }: { item?: MaintenanceTask }) {
  if (!item) return <EmptyCard text="Task card not found." />;
  return (
    <CardShell title={item.title} subtitle={item.equipment_assets?.name} status={item.status}>
      <View style={styles.detailGrid}>
        <Detail label="Priority" value={item.priority} />
        <Detail label="Due date" value={formatDate(item.due_at)} />
        <Detail label="Due counter" value={item.due_counter_value} />
        <Detail label="Estimated hours" value={item.estimated_hours} />
        <Detail label="Assigned role" value={item.assigned_to_role} />
      </View>
      <DetailBlock title="Scope" body={item.description} />
    </CardShell>
  );
}

function WorkOrderCard({ item }: { item?: WorkOrder }) {
  if (!item) return <EmptyCard text="Work order card not found." />;
  return (
    <CardShell title={`${item.work_order_number} - ${item.title}`} subtitle={workOrderAssets(item)} status={item.status}>
      <View style={styles.detailGrid}>
        <Detail label="Type" value={item.work_order_type} />
        <Detail label="Priority" value={item.priority} />
        <Detail label="Risk" value={item.risk_level} />
        <Detail label="Assigned to" value={item.assigned_to_user_id ?? item.assigned_to_name} />
        <Detail label="Planned start" value={formatDate(item.planned_start)} />
        <Detail label="Planned end" value={formatDate(item.planned_end)} />
        <Detail label="Actual start" value={formatDate(item.actual_start)} />
        <Detail label="Actual end" value={formatDate(item.actual_end)} />
        <Detail label="Estimated hours" value={item.estimated_labour_hours} />
        <Detail label="Actual hours" value={item.actual_labour_hours} />
        <Detail label="Estimated cost" value={money(item.estimated_cost, item.currency ?? "EUR")} />
        <Detail label="Actual cost" value={money(item.actual_cost, item.currency ?? "EUR")} />
      </View>
      <DetailBlock title="Scope" body={item.description} />
      <DetailBlock title="Completion summary" body={item.completion_summary} />
      <DetailBlock title="Verification notes" body={item.verification_notes} />
    </CardShell>
  );
}

function DefectCard({ item }: { item?: Defect }) {
  if (!item) return <EmptyCard text="Defect card not found." />;
  return (
    <CardShell title={`${item.defect_number} - ${item.title}`} subtitle={item.equipment_assets?.name} status={item.severity ?? item.status}>
      <View style={styles.detailGrid}>
        <Detail label="Status" value={item.status} />
        <Detail label="Priority" value={item.priority} />
        <Detail label="Risk" value={item.risk_level} />
        <Detail label="Reported" value={formatDate(item.reported_at)} />
        <Detail label="Counter" value={item.counter_value_at_report} />
        <Detail label="Warranty claim" value={item.warranty_claim_id} />
        <Detail label="Resolved" value={formatDate(item.resolved_at)} />
        <Detail label="Verified" value={formatDate(item.verified_at)} />
      </View>
      <DetailBlock title="Description" body={item.description} />
      <DetailBlock title="Operational limitation" body={item.operational_limitation} />
      <DetailBlock title="Safety impact" body={item.safety_impact} />
      <DetailBlock title="Environmental impact" body={item.environmental_impact} />
      <DetailBlock title="Temporary repair" body={item.temporary_repair} />
      {item.photo_urls?.length ? <DetailBlock title="Photos" body={item.photo_urls.join("\n")} /> : null}
    </CardShell>
  );
}

function ServiceCard({ item }: { item?: ServiceEvent }) {
  if (!item) return <EmptyCard text="Service event card not found." />;
  return (
    <CardShell title={`${item.service_event_number} - ${item.title}`} subtitle={item.equipment_assets?.name} status={item.service_type}>
      <View style={styles.detailGrid}>
        <Detail label="Started" value={formatDate(item.started_at)} />
        <Detail label="Completed" value={formatDate(item.completed_at ?? item.performed_at)} />
        <Detail label="Technician" value={item.technician_id ?? item.performed_by_name} />
        <Detail label="Counter" value={[item.counter_value_before, item.counter_value_after].filter((value) => value != null).join(" -> ")} />
        <Detail label="Labour" value={item.labour_hours != null ? `${item.labour_hours} h` : null} />
        <Detail label="Downtime" value={item.downtime_hours != null ? `${item.downtime_hours} h` : null} />
        <Detail label="Cost" value={money(item.cost, item.currency ?? "EUR")} />
        <Detail label="Next due" value={[formatDate(item.next_due_at), item.next_due_counter_value].filter(Boolean).join(" / ")} />
        <Detail label="Approved by" value={item.approved_by} />
      </View>
      <DetailBlock title="Work performed" body={item.work_performed} />
      <DetailBlock title="Defect / reason" body={item.defect_description} />
      <DetailBlock title="Root cause" body={item.root_cause_summary} />
      <DetailBlock title="Test result" body={item.test_result} />
      <DetailBlock title="Measurements before" body={objectLines(item.measurements_before)} />
      <DetailBlock title="Measurements after" body={objectLines(item.measurements_after)} />
      <DetailBlock title="Parts used" body={itemLines(item.parts_used)} />
      <DetailBlock title="Fluids used" body={itemLines(item.fluids_used)} />
    </CardShell>
  );
}

function PartCard({ item }: { item?: SparePart }) {
  if (!item) return <EmptyCard text="Spare part card not found." />;
  const quantity = Number(item.quantity_on_hand ?? 0);
  const minimum = Number(item.minimum_stock ?? 0);
  const reorder = Number(item.reorder_level ?? 0);
  const status = quantity <= minimum ? "low stock" : reorder && quantity <= reorder ? "reorder" : "stock ok";
  return (
    <CardShell title={item.name} subtitle={item.part_number} status={status}>
      <View style={styles.detailGrid}>
        <Detail label="Manufacturer" value={item.manufacturer} />
        <Detail label="Stock" value={`${item.quantity_on_hand} ${item.unit ?? "pcs"}`} />
        <Detail label="Minimum" value={item.minimum_stock} />
        <Detail label="Reorder" value={item.reorder_level} />
        <Detail label="Unit cost" value={money(item.unit_cost, item.currency ?? "EUR")} />
        <Detail label="Expiry" value={formatDate(item.expiry_date)} />
      </View>
      <DetailBlock title="Notes" body={item.notes} />
    </CardShell>
  );
}

function DocumentCard({ item, onOpen }: { item?: MaintenanceDocument; onOpen: () => void }) {
  if (!item) return <EmptyCard text="Attachment card not found." />;
  return (
    <CardShell title={item.title} subtitle={attachmentOwner(item)} status={item.category}>
      <View style={styles.detailGrid}>
        <Detail label="Category" value={item.category} />
        <Detail label="MIME type" value={item.mime_type} />
        <Detail label="Version" value={item.version} />
        <Detail label="Expires" value={formatDate(item.expires_at)} />
        <Detail label="Private" value={item.is_private === false ? "No" : "Yes"} />
        <Detail label="Created" value={formatDate(item.created_at)} />
      </View>
      <DetailBlock title="Stored file" body={item.file_path ?? item.file_url} />
      <Pressable style={styles.primaryButton} onPress={onOpen}>
        <Feather name="external-link" size={18} color={NAVY} />
        <Text style={styles.primaryButtonText}>Open attachment</Text>
      </Pressable>
    </CardShell>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: NAVY },
  header: { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 20 },
  iconButton: { width: 46, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(247,243,236,0.08)" },
  headerText: { flex: 1 },
  eyebrow: { color: GOLD, fontFamily: "Inter_600SemiBold", fontSize: 12, letterSpacing: 3, textTransform: "uppercase" },
  title: { color: IVORY, fontFamily: "Gilroy-ExtraBold", fontSize: 30, marginTop: 6 },
  subtitle: { color: MUTED, fontFamily: "Inter_400Regular", fontSize: 14, marginTop: 4 },
  scroll: { padding: 22, paddingBottom: 48 },
  loading: { alignItems: "center", justifyContent: "center", gap: 12, padding: 28 },
  muted: { color: MUTED, fontFamily: "Inter_400Regular", fontSize: 14, lineHeight: 20 },
  card: { borderWidth: 1, borderColor: LINE, backgroundColor: NAVY_DEEP, borderRadius: 8, padding: 16 },
  cardHeader: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 16 },
  cardTitleWrap: { flex: 1 },
  cardTitle: { color: IVORY, fontFamily: "Gilroy-Bold", fontSize: 22, lineHeight: 28 , fontWeight: "700"},
  cardSubtitle: { color: MUTED, fontFamily: "Inter_500Medium", fontSize: 14, lineHeight: 20, marginTop: 4 },
  detailGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 8 },
  detailItem: { minWidth: 150, flexGrow: 1, flexBasis: "30%", borderWidth: 1, borderColor: LINE, borderRadius: 8, backgroundColor: PANEL, padding: 12 },
  detailLabel: { color: GOLD, fontFamily: "Inter_600SemiBold", fontSize: 10, letterSpacing: 1.6, textTransform: "uppercase", marginBottom: 5 },
  detailValue: { color: IVORY, fontFamily: "Inter_600SemiBold", fontSize: 14, lineHeight: 19 },
  block: { borderTopWidth: 1, borderTopColor: LINE, paddingTop: 12, marginTop: 12 },
  blockTitle: { color: GOLD, fontFamily: "Gilroy-Bold", fontSize: 11, letterSpacing: 1.6, textTransform: "uppercase", marginBottom: 6 , fontWeight: "700"},
  blockText: { color: IVORY, fontFamily: "Inter_400Regular", fontSize: 14, lineHeight: 20 },
  pill: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  pillText: { fontFamily: "Inter_700Bold", fontSize: 11, textTransform: "uppercase" },
  primaryButton: { minHeight: 52, borderRadius: 8, backgroundColor: GOLD, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingHorizontal: 16, marginTop: 16 },
  primaryButtonText: { color: NAVY, fontFamily: "Inter_700Bold", fontSize: 15 },
});
