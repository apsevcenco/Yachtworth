import type {
  DocumentTemplate,
  ExportSettings,
  MaintenanceReportData,
  YachtProfile,
} from "../documentTypes";
import { getTheme } from "../core/theme";
import { num, photoList } from "../core/util";
import type { ContentNode, CoverSpec, DocumentModel, TableCell } from "../model/types";

function text(v: unknown): string {
  if (v == null || v === "") return "-";
  return String(v);
}

function date(v: unknown): string {
  const raw = text(v);
  if (raw === "-") return raw;
  return raw.slice(0, 10);
}

function money(v: unknown): string {
  const n = num(v);
  if (n == null) return "-";
  return `EUR ${Math.round(n).toLocaleString("en-US")}`;
}

function rows(items: Record<string, unknown>[] | null | undefined, map: (item: Record<string, unknown>) => TableCell[]): TableCell[][] {
  return (items ?? []).map(map).filter((row) => row.some((cell) => cell.text && cell.text !== "-"));
}

function titleCase(v: unknown): string {
  return text(v).replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function addTable(
  body: ContentNode[],
  heading: string,
  columns: { header: string; widthPct?: number; align?: "left" | "right" | "center" }[],
  tableRows: TableCell[][],
): void {
  if (!tableRows.length) return;
  body.push({ kind: "table", heading, columns, rows: tableRows });
}

export function buildMaintenanceModel(input: {
  yacht: YachtProfile;
  reportData: MaintenanceReportData;
  settings: ExportSettings;
  template: DocumentTemplate;
}): DocumentModel {
  const { yacht, reportData, settings, template } = input;
  const theme = getTheme(template);
  const brand = settings.branding ?? settings.brand_name ?? "Yachtworth";
  const generatedAt = reportData.generatedLabel ?? new Date().toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const counts = reportData.counts ?? {};
  const photos = photoList(yacht);
  const cover: CoverSpec = {
    eyebrow: `${brand} - MAINTENANCE REPORT`,
    name: yacht.name?.trim() || "Maintenance Report",
    subtitle: [yacht.builder, yacht.model, yacht.flag].filter(Boolean).join(" - "),
    date: generatedAt,
    photoUrl: photos[0],
    cells: [
      { label: "Assets", value: text(counts.assets ?? reportData.assets?.length ?? 0) },
      { label: "Open tasks", value: text(counts.tasks ?? reportData.tasks?.length ?? 0) },
      { label: "Open defects", value: text(counts.defects ?? reportData.defects?.length ?? 0) },
      { label: "Parts", value: text(counts.parts ?? reportData.parts?.length ?? 0) },
    ],
  };

  const body: ContentNode[] = [
    {
      kind: "metrics",
      heading: "Maintenance Snapshot",
      cards: [
        { label: "Equipment assets", value: text(reportData.assets?.length ?? counts.assets ?? 0), emphasis: true },
        { label: "Scheduled tasks", value: text(reportData.tasks?.length ?? counts.tasks ?? 0) },
        { label: "Work orders", value: text(reportData.workOrders?.length ?? counts.work_orders ?? 0) },
        { label: "Open defects", value: text(reportData.defects?.length ?? counts.defects ?? 0) },
      ],
      caption: "This report summarizes the current maintenance register, service history, defects, parts inventory and attachments.",
    },
  ];

  addTable(
    body,
    "Equipment Register",
    [
      { header: "Asset", widthPct: 28 },
      { header: "System", widthPct: 20 },
      { header: "Serial / Model" },
      { header: "Status", widthPct: 16 },
    ],
    rows(reportData.assets, (item) => [
      { text: text(item.name), sub: [item.asset_code, item.display_name].filter(Boolean).join(" - ") },
      { text: text((item.maintenance_systems as { name?: unknown } | null)?.name ?? item.system_name) },
      { text: [item.manufacturer, item.model, item.serial_number].filter(Boolean).join(" - ") || "-" },
      { text: titleCase(item.status) },
    ]),
  );

  addTable(
    body,
    "Scheduled Maintenance",
    [
      { header: "Task", widthPct: 34 },
      { header: "Due", widthPct: 18 },
      { header: "Priority", widthPct: 16 },
      { header: "Asset" },
    ],
    rows(reportData.tasks, (item) => [
      { text: text(item.title), sub: text(item.task_type) },
      { text: date(item.due_date) },
      { text: titleCase(item.priority ?? item.criticality) },
      { text: text((item.equipment_assets as { name?: unknown } | null)?.name ?? item.asset_name) },
    ]),
  );

  addTable(
    body,
    "Open Work Orders",
    [
      { header: "Work order", widthPct: 35 },
      { header: "Status", widthPct: 15 },
      { header: "Risk", widthPct: 15 },
      { header: "Cost", align: "right", widthPct: 18 },
    ],
    rows(reportData.workOrders, (item) => [
      { text: text(item.title), sub: text(item.work_order_number) },
      { text: titleCase(item.status) },
      { text: titleCase(item.risk_level ?? item.priority) },
      { text: money(item.estimated_cost_eur ?? item.actual_cost_eur), align: "right" },
    ]),
  );

  addTable(
    body,
    "Defects",
    [
      { header: "Defect", widthPct: 36 },
      { header: "Severity", widthPct: 16 },
      { header: "Status", widthPct: 16 },
      { header: "Reported", widthPct: 18 },
    ],
    rows(reportData.defects, (item) => [
      { text: text(item.title), sub: text(item.defect_number) },
      { text: titleCase(item.severity) },
      { text: titleCase(item.status) },
      { text: date(item.reported_at) },
    ]),
  );

  addTable(
    body,
    "Service History",
    [
      { header: "Service", widthPct: 36 },
      { header: "Completed", widthPct: 18 },
      { header: "Technician", widthPct: 22 },
      { header: "Cost", align: "right", widthPct: 16 },
    ],
    rows(reportData.serviceEvents, (item) => [
      { text: text(item.title), sub: text(item.service_event_number) },
      { text: date(item.completed_at ?? item.performed_at) },
      { text: text(item.technician_id ?? item.performed_by_name) },
      { text: money(item.cost_eur), align: "right" },
    ]),
  );

  addTable(
    body,
    "Parts Inventory",
    [
      { header: "Part", widthPct: 34 },
      { header: "Stock", widthPct: 16, align: "right" },
      { header: "Location", widthPct: 22 },
      { header: "Unit cost", align: "right", widthPct: 18 },
    ],
    rows(reportData.parts, (item) => [
      { text: text(item.name), sub: text(item.part_number) },
      { text: text(item.quantity_on_hand), align: "right" },
      { text: text(item.storage_location) },
      { text: money(item.unit_cost_eur), align: "right" },
    ]),
  );

  addTable(
    body,
    "Attachments Register",
    [
      { header: "Attachment", widthPct: 40 },
      { header: "Category", widthPct: 18 },
      { header: "Expiry", widthPct: 18 },
      { header: "Storage", widthPct: 18 },
    ],
    rows(reportData.documents, (item) => [
      { text: text(item.title) },
      { text: titleCase(item.category) },
      { text: date(item.expires_at) },
      { text: item.file_path ? "Private file" : item.file_url ? "External URL" : "-" },
    ]),
  );

  return {
    meta: {
      type: "maintenance_report",
      brand,
      title: "MAINTENANCE REPORT",
      language: settings.language ?? "english",
      confidential: !!settings.confidential,
      watermarkText: "CONFIDENTIAL",
      generatedAt,
    },
    theme,
    cover,
    body,
  };
}
