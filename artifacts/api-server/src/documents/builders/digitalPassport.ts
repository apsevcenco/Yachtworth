import type {
  DigitalPassportReportData,
  DocumentTemplate,
  ExportSettings,
  YachtProfile,
} from "../documentTypes";
import { getTheme } from "../core/theme";
import { num, photoList } from "../core/util";
import type { ContentNode, CoverSpec, DocumentModel, TableCell } from "../model/types";

function clean(v: unknown): string {
  if (v == null || v === "") return "-";
  const s = String(v).trim();
  return s || "-";
}

function has(v: unknown): boolean {
  return clean(v) !== "-";
}

function date(v: unknown): string {
  const raw = clean(v);
  if (raw === "-") return raw;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw.slice(0, 10);
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function money(v: unknown, currency: unknown = "EUR"): string {
  const n = num(v);
  if (n == null) return "-";
  return `${typeof currency === "string" ? currency : "EUR"} ${Math.round(n).toLocaleString("en-US")}`;
}

function titleCase(v: unknown): string {
  return clean(v).replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function rows(items: Record<string, unknown>[] | null | undefined, map: (item: Record<string, unknown>) => TableCell[]): TableCell[][] {
  return (items ?? []).map(map).filter((row) => row.some((cell) => has(cell.text) || has(cell.sub)));
}

function addKeyValues(body: ContentNode[], heading: string, pairs: [string, unknown][]): void {
  const visible = pairs
    .map(([label, value]) => ({ label, value: clean(value) }))
    .filter((row) => row.value !== "-");
  if (visible.length) body.push({ kind: "keyValue", heading, rows: visible, layout: "pairs" });
}

function addTable(
  body: ContentNode[],
  heading: string,
  columns: { header: string; widthPct?: number; align?: "left" | "right" | "center" }[],
  tableRows: TableCell[][],
): void {
  if (tableRows.length) body.push({ kind: "table", heading, columns, rows: tableRows });
}

function moduleRows(modules: DigitalPassportReportData["modules"], key: string): Record<string, unknown>[] {
  const rowsForKey = modules?.[key];
  return Array.isArray(rowsForKey) ? rowsForKey : [];
}

function buildTimeline(modules: DigitalPassportReportData["modules"]): TableCell[][] {
  const out: { date: string; rawDate: string; type: string; detail: string }[] = [];
  for (const row of moduleRows(modules, "valuations")) {
    const rawDate = clean(row.created_at ?? row.updated_at);
    out.push({ rawDate, date: date(rawDate), type: "Valuation", detail: money(row.estimated_price_eur, row.currency) });
  }
  for (const row of moduleRows(modules, "roi")) {
    const rawDate = clean(row.created_at ?? row.updated_at);
    out.push({ rawDate, date: date(rawDate), type: "Charter ROI", detail: `${clean(row.region)} - ROI ${clean(row.roi_pct)}%` });
  }
  for (const row of moduleRows(modules, "costs")) {
    const rawDate = clean(row.created_at ?? row.updated_at);
    out.push({ rawDate, date: date(rawDate), type: "Annual costs", detail: money(row.total_annual_eur, row.currency) });
  }
  for (const row of moduleRows(modules, "surveys")) {
    const rawDate = clean(row.updated_at ?? row.survey_date ?? row.created_at);
    out.push({ rawDate, date: date(rawDate), type: "Survey", detail: `${titleCase(row.report_type)} - ${titleCase(row.status)}` });
  }
  for (const row of moduleRows(modules, "service_events")) {
    const rawDate = clean(row.completed_at ?? row.updated_at ?? row.created_at);
    out.push({ rawDate, date: date(rawDate), type: "Service", detail: clean(row.title ?? row.service_event_number) });
  }
  for (const row of moduleRows(modules, "work_orders")) {
    const rawDate = clean(row.updated_at ?? row.created_at);
    out.push({ rawDate, date: date(rawDate), type: "Work order", detail: `${clean(row.work_order_number)} - ${clean(row.title)}` });
  }
  out.sort((a, b) => Date.parse(b.rawDate) - Date.parse(a.rawDate));
  return out.slice(0, 24).map((row) => [
    { text: row.date },
    { text: row.type, bold: true },
    { text: row.detail },
  ]);
}

export function buildDigitalPassportModel(input: {
  yacht: YachtProfile;
  reportData: DigitalPassportReportData;
  settings: ExportSettings;
  template: DocumentTemplate;
}): DocumentModel {
  const { yacht, reportData, settings, template } = input;
  const theme = getTheme(template);
  const brand = settings.branding ?? settings.brand_name ?? "Yachtworth";
  const passport = reportData.passport ?? {};
  const modules = reportData.modules ?? {};
  const counts = reportData.counts ?? {};
  const generatedAt = reportData.generatedLabel ?? new Date().toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const photos = photoList(yacht);
  const id = clean(passport.yachtworth_id);

  const cover: CoverSpec = {
    eyebrow: `${brand} - DIGITAL PASSPORT`,
    name: clean(passport.title ?? yacht.name),
    subtitle: [yacht.builder, yacht.model, yacht.flag].filter(Boolean).join(" - "),
    date: generatedAt,
    photoUrl: photos[0],
    cells: [
      { label: "Yachtworth ID", value: id },
      { label: "Last activity", value: date(passport.last_activity_at) },
      { label: "Services", value: clean((counts.service_events ?? 0) + (counts.work_orders ?? 0)) },
      { label: "Documents", value: clean(counts.documents ?? 0) },
    ],
  };

  const body: ContentNode[] = [
    {
      kind: "metrics",
      heading: "Passport Snapshot",
      cards: [
        { label: "Yachtworth ID", value: id, emphasis: true },
        { label: "Reports", value: clean((counts.valuations ?? 0) + (counts.roi ?? 0) + (counts.costs ?? 0) + (counts.surveys ?? 0)) },
        { label: "Maintenance records", value: clean((counts.maintenance_assets ?? 0) + (counts.work_orders ?? 0) + (counts.service_events ?? 0)) },
        { label: "Network listings", value: clean(counts.network_listings ?? 0) },
      ],
      caption: "The Digital Passport consolidates yacht identity, specifications, registration, reports, service history and connected Yachtworth modules.",
    },
  ];

  if (has(passport.access_url)) {
    body.push({
      kind: "columns",
      heading: "QR Access",
      columns: [
        {
          subHeading: "Passport code",
          nodes: [{ kind: "paragraph", text: id, panel: true }],
        },
        {
          subHeading: "Access link",
          nodes: [{ kind: "paragraph", text: clean(passport.access_url), panel: true }],
        },
      ],
    });
  }

  addKeyValues(body, "Identification", [
    ["Name", yacht.name],
    ["Builder", yacht.builder],
    ["Model", yacht.model],
    ["Year", yacht.year_built],
    ["Type", yacht.yacht_type],
    ["HIN / Hull ID", yacht.hull_id],
    ["IMO", yacht.imo_number],
  ]);

  addKeyValues(body, "Registration & Flag", [
    ["Flag", yacht.flag],
    ["Home port", yacht.home_port],
    ["Registration number", yacht.registration_number],
    ["VAT status", yacht.vat_status],
  ]);

  addKeyValues(body, "Technical Specification", [
    ["LOA", yacht.length_meters ? `${yacht.length_meters} m` : null],
    ["Beam", yacht.beam_meters ? `${yacht.beam_meters} m` : null],
    ["Draft", yacht.draft_meters ? `${yacht.draft_meters} m` : null],
    ["Cabins", yacht.cabins],
    ["Guests", yacht.guests],
    ["Crew", yacht.crew],
    ["Berths", yacht.berths],
    ["Heads", yacht.heads],
    ["Engine maker", yacht.engine_maker],
    ["Engine model", yacht.engine_model],
    ["Engines", yacht.engine_count],
    ["Total HP", yacht.total_hp],
    ["Engine hours", yacht.engine_hours],
    ["Max speed", yacht.max_speed_knots ? `${yacht.max_speed_knots} kn` : null],
    ["Cruising speed", yacht.cruising_speed_knots ? `${yacht.cruising_speed_knots} kn` : null],
    ["Range", yacht.range_nm ? `${yacht.range_nm} nm` : null],
    ["Fuel capacity", yacht.fuel_capacity_l ? `${yacht.fuel_capacity_l} l` : null],
    ["Water capacity", yacht.water_capacity_l ? `${yacht.water_capacity_l} l` : null],
  ]);

  addTable(
    body,
    "Connected Module Register",
    [
      { header: "Module", widthPct: 45 },
      { header: "Records", widthPct: 18, align: "right" },
      { header: "Purpose", widthPct: 37 },
    ],
    [
      [{ text: "Valuation" }, { text: clean(counts.valuations ?? 0), align: "right" }, { text: "Market value and comparable evidence" }],
      [{ text: "Charter ROI" }, { text: clean(counts.roi ?? 0), align: "right" }, { text: "Revenue, costs and investment return" }],
      [{ text: "Annual costs" }, { text: clean(counts.costs ?? 0), align: "right" }, { text: "Ownership cost profile" }],
      [{ text: "Survey" }, { text: clean(counts.surveys ?? 0), align: "right" }, { text: "Condition, findings and recommendations" }],
      [{ text: "Maintenance" }, { text: clean((counts.maintenance_assets ?? 0) + (counts.work_orders ?? 0) + (counts.service_events ?? 0)), align: "right" }, { text: "Assets, work orders, parts and service events" }],
      [{ text: "Documents" }, { text: clean(counts.documents ?? 0), align: "right" }, { text: "Certificates, invoices, manuals and attachments" }],
      [{ text: "Network" }, { text: clean(counts.network_listings ?? 0), align: "right" }, { text: "Marketplace visibility and broker network records" }],
    ],
  );

  addTable(
    body,
    "Latest Activity",
    [
      { header: "Date", widthPct: 20 },
      { header: "Type", widthPct: 25 },
      { header: "Details", widthPct: 55 },
    ],
    buildTimeline(modules),
  );

  addTable(
    body,
    "Maintenance Assets",
    [
      { header: "Asset", widthPct: 45 },
      { header: "Status", widthPct: 24 },
      { header: "Condition", widthPct: 31 },
    ],
    rows(moduleRows(modules, "maintenance_assets"), (row) => [
      { text: clean(row.name) },
      { text: titleCase(row.operational_status ?? row.status) },
      { text: titleCase(row.condition_status) },
    ]),
  );

  addTable(
    body,
    "Open Work Orders",
    [
      { header: "Order", widthPct: 52 },
      { header: "Status", widthPct: 20 },
      { header: "Updated", widthPct: 28 },
    ],
    rows(moduleRows(modules, "work_orders"), (row) => [
      { text: clean(row.title), sub: clean(row.work_order_number) },
      { text: titleCase(row.status ?? row.priority) },
      { text: date(row.updated_at ?? row.created_at) },
    ]),
  );

  addTable(
    body,
    "Service History",
    [
      { header: "Service", widthPct: 50 },
      { header: "Completed", widthPct: 24 },
      { header: "Cost", widthPct: 26, align: "right" },
    ],
    rows(moduleRows(modules, "service_events"), (row) => [
      { text: clean(row.title), sub: clean(row.service_event_number) },
      { text: date(row.completed_at ?? row.updated_at ?? row.created_at) },
      { text: money(row.total_cost, row.currency), align: "right" },
    ]),
  );

  addTable(
    body,
    "Document Register",
    [
      { header: "Document", widthPct: 55 },
      { header: "Type", widthPct: 22 },
      { header: "Expiry", widthPct: 23 },
    ],
    rows(moduleRows(modules, "documents"), (row) => [
      { text: clean(row.title) },
      { text: titleCase(row.document_type) },
      { text: date(row.expires_at) },
    ]),
  );

  if (photos.length > 1) {
    body.push({
      kind: "gallery",
      heading: "Yacht Photos",
      images: photos.slice(0, 8).map((url, index) => ({ url, caption: `Photo ${index + 1}` })),
      columns: 2,
      imageHeightMm: 58,
    });
  }

  body.push({
    kind: "callout",
    tone: "legal",
    text: "This Digital Passport is generated from Yachtworth workspace data. It is an operational record and should be reviewed against original certificates, invoices and registry documents before legal, finance or insurance reliance.",
  });

  return {
    meta: {
      type: "digital_passport",
      brand,
      title: "DIGITAL PASSPORT",
      language: settings.language ?? "english",
      confidential: !!settings.confidential,
      watermarkText: "YACHTWORTH",
      generatedAt,
    },
    theme,
    cover,
    body,
  };
}
