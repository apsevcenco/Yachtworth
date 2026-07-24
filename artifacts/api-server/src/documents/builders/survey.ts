import type {
  DocumentTemplate,
  ExportSettings,
  SurveyItemData,
  SurveyReportData,
  YachtProfile,
} from "../documentTypes";
import { getTheme } from "../core/theme";
import type { ContentNode, CoverSpec, DocumentModel, TableCell } from "../model/types";

const GLOSSARY_TEXT = `Excellent condition - The item described is in as-new or near as-new condition.
Serviceable / Functioning - The item described is serviceable and fit for purpose at the time of survey.
Fair condition - The item described is serviceable but showing age, wear or maintenance requirement.
Poor condition - The item described requires repair, replacement or specialist attention.
Not inspected / N/A - The item was not inspected, was inaccessible, or was not applicable to this vessel.

Recommendations:
A - Urgent. Required to ensure safe operation of the vessel.
B - Soonest opportunity. Required for continued successful operation.
C - Expert or specialist required to investigate further.
D - Cosmetic or leisure equipment.`;

function fmtDate(s: string | null | undefined): string {
  if (!s) return "-";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  return s;
}

function clean(s: unknown): string {
  return s == null || s === "" ? "-" : String(s);
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function labelize(key: string): string {
  return key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatBool(v: boolean): string {
  return v ? "Yes" : "No";
}

function formatMoney(v: number | null | undefined): string | null {
  if (v == null || !Number.isFinite(v)) return null;
  return `EUR ${Math.round(v).toLocaleString("en-US")}`;
}

function itemNumberParts(value: string | null | undefined): number[] {
  return String(value ?? "")
    .split(".")
    .map((part) => Number.parseInt(part.replace(/\D/g, ""), 10))
    .map((n) => (Number.isFinite(n) ? n : -1));
}

function compareItemNumber(a: string | null | undefined, b: string | null | undefined): number {
  const aa = itemNumberParts(a);
  const bb = itemNumberParts(b);
  const len = Math.max(aa.length, bb.length);
  for (let i = 0; i < len; i += 1) {
    const diff = (aa[i] ?? -1) - (bb[i] ?? -1);
    if (diff !== 0) return diff;
  }
  return String(a ?? "").localeCompare(String(b ?? ""), "en", { numeric: true });
}

function compareSurveyItems(a: SurveyItemData, b: SurveyItemData): number {
  return (
    (a.section_number ?? 0) - (b.section_number ?? 0) ||
    compareItemNumber(a.item_number, b.item_number) ||
    (a.sort_order ?? 0) - (b.sort_order ?? 0)
  );
}

function sectionDataLines(item: SurveyItemData): string[] {
  if (!isRecord(item.section_data)) return [];
  return Object.entries(item.section_data)
    .filter(([, value]) => value !== null && value !== undefined && value !== "")
    .map(([key, value]) => {
      const formatted = typeof value === "boolean" ? formatBool(value) : String(value);
      return `${labelize(key)}: ${formatted}`;
    });
}

function photoUrls(item: SurveyItemData): string[] {
  return (item.photo_urls ?? [])
    .filter((url) => typeof url === "string" && url.trim().length > 0)
    .map((url) => url.trim());
}

function professionalLines(item: SurveyItemData): string[] {
  const flags = [
    item.safety_critical ? "Safety critical" : null,
    item.insurance_critical ? "Insurance critical" : null,
    item.compliance_critical ? "Compliance critical" : null,
  ].filter(Boolean);
  return [
    item.inspected_status ? `Status: ${item.inspected_status}` : null,
    flags.length ? `Flags: ${flags.join(", ")}` : null,
    item.defect_description ? `Finding: ${item.defect_description}` : null,
    item.test_method ? `Test method: ${item.test_method}` : null,
    item.regulatory_reference ? `Reference: ${item.regulatory_reference}` : null,
    item.estimated_cost_eur != null ? `Estimated cost: ${formatMoney(item.estimated_cost_eur)}` : null,
    item.due_date ? `Due date: ${fmtDate(item.due_date)}` : null,
    ...sectionDataLines(item),
  ].filter((line): line is string => Boolean(line));
}

function recText(item: SurveyItemData): string {
  const level = item.recommendation_level ? `Rec ${item.recommendation_level}` : "";
  const text = item.recommendation_text ?? "";
  return [level, text].filter(Boolean).join(" - ") || "-";
}

function sectionRows(items: SurveyItemData[]): TableCell[][] {
  return items.map((item) => {
    const desc: TableCell = {
      text: [item.item_number, item.description].filter(Boolean).join(" - ") || "-",
    };
    const sub = [
      item.notes ? `Notes: ${item.notes}` : null,
      item.moisture_reading != null ? `Moisture: ${item.moisture_reading}${item.moisture_level ? ` (${item.moisture_level})` : ""}` : null,
      ...professionalLines(item),
    ].filter(Boolean).join(" · ");
    if (sub) desc.sub = sub;
    return [
      desc,
      { text: clean(item.condition) },
      {
        text: recText(item),
        tag: item.recommendation_level
          ? {
              text: item.recommendation_level,
              tone: item.recommendation_level === "A" ? "a" : item.recommendation_level === "B" ? "b" : "c",
            }
          : undefined,
      },
    ];
  });
}

function titleCaseWords(text: string): string {
  return text
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function sectionTitle(sectionNumber: number, name: string): string {
  return `${sectionNumber}. ${titleCaseWords(name)}`;
}

function shouldSkipNarrativeItem(item: SurveyItemData): boolean {
  const name = `${item.section_name ?? ""} ${item.description ?? ""}`.toLowerCase();
  return item.section_number === 25 || /\bpictures?\b|\bphotos?\b/.test(name);
}

function recommendationLine(item: SurveyItemData): string | null {
  if (!item.recommendation_level && !item.recommendation_text) return null;
  const level = item.recommendation_level ? `Recommendation '${item.recommendation_level}'` : "Recommendation";
  return `${level}: ${item.recommendation_text ?? "See surveyor comments."}`;
}

function itemNarrativeText(item: SurveyItemData, pictureRefs: string[]): string {
  const lines: string[] = [];
  if (item.description) lines.push(item.description);
  if (item.notes) lines.push(item.notes);
  if (item.defect_description) lines.push(`Finding: ${item.defect_description}`);
  if (item.condition && item.condition !== "-") {
    lines.push(`Condition was recorded as ${item.condition}.`);
  }
  if (item.moisture_reading != null) {
    lines.push(
      `Moisture reading: ${item.moisture_reading}${item.moisture_level ? ` (${item.moisture_level})` : ""}.`,
    );
  }

  const details = professionalLines(item).filter((line) => {
    return !line.startsWith("Finding:") && !line.startsWith("Estimated cost:") && !line.startsWith("Due date:");
  });
  if (details.length) lines.push(`Inspection details: ${details.join("; ")}.`);

  const rec = recommendationLine(item);
  if (rec) lines.push(rec);
  if (item.estimated_cost_eur != null || item.due_date) {
    lines.push(
      [
        item.estimated_cost_eur != null ? `Estimated cost: ${formatMoney(item.estimated_cost_eur)}` : null,
        item.due_date ? `Due date: ${fmtDate(item.due_date)}` : null,
      ]
        .filter(Boolean)
        .join("; ") + ".",
    );
  }
  if (pictureRefs.length) lines.push(`Photographs: ${pictureRefs.join(", ")}.`);
  return lines.filter(Boolean).join("\n\n");
}

export function buildSurveyModel(input: {
  yacht: YachtProfile;
  reportData: SurveyReportData;
  settings: ExportSettings;
  template: DocumentTemplate;
}): DocumentModel {
  const { yacht, reportData, settings, template } = input;
  const theme = getTheme(template);
  const brand = settings.branding ?? settings.brand_name ?? "Yachtworth";
  const date = new Date().toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const cells: CoverSpec["cells"] = [
    { label: "Survey date", value: fmtDate(reportData.surveyDate) },
    { label: "Purpose", value: clean(reportData.surveyPurpose) },
    { label: "Lying", value: clean(reportData.lying) },
    { label: "Flag", value: clean(reportData.flag) },
  ];

  const items = [...(reportData.items ?? [])].sort(compareSurveyItems);
  const sections = new Map<number, { name: string; rows: SurveyItemData[] }>();
  for (const item of items) {
    const n = item.section_number ?? 0;
    const entry = sections.get(n) ?? { name: item.section_name ?? "Survey Section", rows: [] };
    entry.rows.push(item);
    sections.set(n, entry);
  }
  const displayNumberByItem = new Map<SurveyItemData, string>();
  for (const [sectionNumber, section] of sections) {
    [...section.rows].sort(compareSurveyItems).forEach((item, idx) => {
      displayNumberByItem.set(item, `${sectionNumber}.${idx + 1}`);
    });
  }

  const pictureRefs = new Map<SurveyItemData, string[]>();
  const pictureImages: { url: string; caption: string }[] = [];
  let pictureNo = 1;
  for (const item of items) {
    const urls = photoUrls(item);
    const refs: string[] = [];
    for (const url of urls) {
      const ref = `pic ${String(pictureNo).padStart(3, "0")}`;
      refs.push(ref);
      pictureImages.push({
        url,
        caption: `${ref} - ${displayNumberByItem.get(item) ?? item.item_number ?? ""} ${
          item.description ?? item.section_name ?? "Survey photograph"
        }`.trim(),
      });
      pictureNo += 1;
    }
    if (refs.length) pictureRefs.set(item, refs);
  }

  const contentsEntries = [
    { n: 1, title: "Introduction" },
    { n: 2, title: "Specification" },
    { n: 3, title: "Glossary of Terms" },
    { n: 4, title: "Limitations of Survey" },
    ...[...sections.entries()]
      .filter(([n]) => n > 4 && n !== 25)
      .map(([n, section]) => ({ n, title: titleCaseWords(section.name) })),
  ];
  if (pictureImages.length) contentsEntries.push({ n: 25, title: "Pictures" });
  if (reportData.seaTrial && !sections.has(26)) contentsEntries.push({ n: 26, title: "Sea Trial" });
  const contentsRows: TableCell[][] = contentsEntries
    .sort((a, b) => a.n - b.n)
    .map((entry) => [{ text: String(entry.n) }, { text: entry.title }]);

  const body: ContentNode[] = [
    {
      kind: "table",
      heading: "Contents",
      columns: [{ header: "Section", widthPct: 18 }, { header: "Title", widthPct: 82 }],
      rows: contentsRows,
    },
    {
      kind: "heading",
      level: 1,
      text: "1. Introduction",
    },
    {
      kind: "paragraph",
      text: [
        `This report records the condition of ${yacht.name || "the vessel"} as far as accessible at the time of survey.`,
        reportData.surveyPurpose ? `The stated purpose of the survey was ${reportData.surveyPurpose}.` : null,
        reportData.intendedUse ? `The intended use was recorded as ${reportData.intendedUse}.` : null,
        reportData.lying ? `The vessel was lying at ${reportData.lying}.` : null,
        reportData.surveyDate ? `The survey date was ${fmtDate(reportData.surveyDate)}.` : null,
      ]
        .filter(Boolean)
        .join(" "),
    },
    {
      kind: "heading",
      level: 1,
      text: "2. Specification",
    },
    {
      kind: "keyValue",
      rows: [
        { label: "Vessel", value: yacht.name },
        { label: "Type", value: clean(reportData.vesselType ?? yacht.yacht_type) },
        { label: "Manufacturer", value: clean(reportData.manufacturer ?? yacht.builder) },
        { label: "Model", value: clean(reportData.model ?? yacht.model) },
        { label: "Year built", value: clean(reportData.yearBuilt ?? yacht.year_built) },
        { label: "HIN", value: clean(reportData.hin ?? yacht.hull_id) },
        { label: "Flag", value: clean(reportData.flag) },
        { label: "Lying", value: clean(reportData.lying) },
      ],
      layout: "pairs",
    },
    {
      kind: "columns",
      heading: "Client & Surveyor",
      columns: [
        {
          subHeading: "Client",
          nodes: [
            {
              kind: "keyValue",
              rows: [
                { label: "Name", value: clean(reportData.clientName) },
                { label: "Email", value: clean(reportData.clientEmail) },
                { label: "Phone", value: clean(reportData.clientPhone) },
              ],
            },
          ],
        },
        {
          subHeading: "Surveyor",
          nodes: [
            {
              kind: "keyValue",
              rows: [
                { label: "Name", value: clean(reportData.surveyorName) },
                { label: "Qualification", value: clean(reportData.surveyorQualification) },
                { label: "Company", value: clean(reportData.surveyorCompany) },
                { label: "Email", value: clean(reportData.surveyorEmail) },
              ],
            },
          ],
        },
      ],
    },
  ];

  const scopeRows = [
    { label: "Report type", value: clean(reportData.reportType) },
    { label: "Intended use", value: clean(reportData.intendedUse) },
    { label: "Scope", value: clean(reportData.surveyScope) },
    {
      label: "Standards referenced",
      value: (reportData.standardsReferenced ?? []).filter(Boolean).join(", ") || "-",
    },
  ];
  if (scopeRows.some((row) => row.value !== "-")) {
    body.push({
      kind: "paragraph",
      heading: "Scope & Standards",
      text: scopeRows
        .filter((row) => row.value !== "-")
        .map((row) => `${row.label}: ${row.value}.`)
        .join("\n"),
    });
  }
  body.push({
    kind: "heading",
    level: 1,
    text: "3. Glossary of Terms",
  });
  body.push({
    kind: "paragraph",
    text: GLOSSARY_TEXT,
  });
  body.push({
    kind: "heading",
    level: 1,
    text: "4. Limitations of Survey",
  });
  const limitations = (reportData.limitations ?? []).filter(Boolean);
  body.push({
    kind: "paragraph",
    text: limitations.length
      ? limitations.map((item) => `- ${item}`).join("\n")
      : "The survey was limited to accessible areas only. No destructive testing was carried out unless specifically stated. Equipment was inspected visually and, where practicable, functionally checked.",
  });

  const recItems = items.filter((item) => item.recommendation_level || item.recommendation_text);

  for (const [sectionNumber, section] of [...sections.entries()].sort(([a], [b]) => a - b)) {
    if (sectionNumber <= 4 || sectionNumber === 25) continue;
    const sortedRows = [...section.rows].sort(compareSurveyItems);
    body.push({
      kind: "heading",
      level: 1,
      text: sectionTitle(sectionNumber, section.name),
    });

    for (const [idx, item] of sortedRows.entries()) {
      if (shouldSkipNarrativeItem(item)) continue;
      const displayNumber = displayNumberByItem.get(item) ?? `${sectionNumber}.${idx + 1}`;
      const title = [displayNumber, item.description].filter(Boolean).join(" ");
      body.push({
        kind: "paragraph",
        heading: title,
        text: itemNarrativeText(item, pictureRefs.get(item) ?? []),
      });
    }
  }

  if (recItems.length) {
    body.push({
      kind: "table",
      heading: "Summary of Recommendations",
      columns: [{ header: "Item" }, { header: "Condition" }, { header: "Recommendation" }],
      rows: sectionRows(
        recItems.map((item) => ({
          ...item,
          item_number: displayNumberByItem.get(item) ?? item.item_number,
        })),
      ),
    });
  }

  if (pictureImages.length) {
    body.push({
      kind: "gallery",
      heading: "25. Pictures",
      images: pictureImages,
      columns: 2,
      imageHeightMm: 78,
    });
  }

  const sea = reportData.seaTrial;
  if (sea && !sections.has(26)) {
    body.push({
      kind: "keyValue",
      heading: "Sea Trial",
      rows: [
        { label: "Trial date", value: fmtDate(sea.trial_date) },
        { label: "Location", value: clean(sea.location) },
        { label: "Weather", value: clean(sea.weather) },
        { label: "Sea state", value: clean(sea.sea_state) },
        { label: "Max RPM", value: clean(sea.max_rpm) },
        { label: "Max speed", value: sea.max_speed != null ? `${sea.max_speed} kn` : "-" },
      ],
      layout: "pairs",
    });
    if (sea.narrative) body.push({ kind: "paragraph", heading: "Sea Trial Narrative", text: sea.narrative, panel: true });
    const rpmRows = (sea.rpm_table ?? []).map((row) => [
      { text: clean(row.rpm) },
      { text: clean(row.coolant_p), align: "right" as const },
      { text: clean(row.coolant_s), align: "right" as const },
      { text: clean(row.oil_p), align: "right" as const },
      { text: clean(row.oil_s), align: "right" as const },
      { text: row.speed != null ? `${row.speed} kn` : "-", align: "right" as const },
    ]);
    if (rpmRows.length) {
      body.push({
        kind: "table",
        heading: "RPM Table",
        columns: [
          { header: "RPM" },
          { header: "Coolant P", align: "right" },
          { header: "Coolant S", align: "right" },
          { header: "Oil P", align: "right" },
          { header: "Oil S", align: "right" },
          { header: "Speed", align: "right" },
        ],
        rows: rpmRows,
      });
    }
  }

  body.push({
    kind: "callout",
    tone: "legal",
    text: "This report is an independent condition record based on accessible areas and information available at the time of survey. It is not a warranty of future condition.",
  });
  body.push({
    kind: "signature",
    heading: "Declaration",
    signatureUrl: reportData.surveyorSignatureUrl ?? undefined,
    name: reportData.surveyorName ?? undefined,
    line: reportData.surveyorQualification ?? "Marine surveyor",
  });

  return {
    meta: {
      type: "survey_report",
      brand,
      title: "SURVEY REPORT",
      language: settings.language ?? "english",
      confidential: false,
      watermarkText: "CONFIDENTIAL",
      generatedAt: date,
    },
    theme,
    cover: {
      eyebrow: `${brand} · SURVEY REPORT`,
      name: yacht.name || "Survey Report",
      subtitle: [reportData.manufacturer, reportData.model].filter(Boolean).join(" · "),
      date,
      cells,
    },
    body,
  };
}
