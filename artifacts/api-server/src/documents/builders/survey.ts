import type {
  DocumentTemplate,
  ExportSettings,
  SurveyItemData,
  SurveyReportData,
  YachtProfile,
} from "../documentTypes";
import { getTheme } from "../core/theme";
import type { ContentNode, CoverSpec, DocumentModel, TableCell } from "../model/types";

function fmtDate(s: string | null | undefined): string {
  if (!s) return "-";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  return s;
}

function clean(s: unknown): string {
  return s == null || s === "" ? "-" : String(s);
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

  const body: ContentNode[] = [
    {
      kind: "keyValue",
      heading: "Vessel Particulars",
      rows: [
        { label: "Vessel", value: yacht.name },
        { label: "Type", value: clean(reportData.vesselType ?? yacht.yacht_type) },
        { label: "Manufacturer", value: clean(reportData.manufacturer ?? yacht.builder) },
        { label: "Model", value: clean(reportData.model ?? yacht.model) },
        { label: "Year built", value: clean(reportData.yearBuilt ?? yacht.year_built) },
        { label: "HIN", value: clean(reportData.hin ?? yacht.hull_id) },
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
      kind: "keyValue",
      heading: "Scope & Standards",
      rows: scopeRows,
      layout: "pairs",
    });
  }
  const limitations = (reportData.limitations ?? []).filter(Boolean);
  if (limitations.length) {
    body.push({
      kind: "paragraph",
      heading: "Limitations",
      text: limitations.map((item) => `- ${item}`).join("\n"),
      panel: true,
    });
  }

  const items = [...(reportData.items ?? [])].sort(
    (a, b) =>
      (a.section_number ?? 0) - (b.section_number ?? 0) ||
      (a.sort_order ?? 0) - (b.sort_order ?? 0),
  );
  const recItems = items.filter((item) => item.recommendation_level || item.recommendation_text);
  if (recItems.length) {
    body.push({
      kind: "table",
      heading: "Recommendation Summary",
      columns: [{ header: "Item" }, { header: "Condition" }, { header: "Recommendation" }],
      rows: sectionRows(recItems),
    });
  }

  const sections = new Map<string, SurveyItemData[]>();
  for (const item of items) {
    const key = `${item.section_number ?? 0}. ${item.section_name ?? "Survey Section"}`;
    const rows = sections.get(key) ?? [];
    rows.push(item);
    sections.set(key, rows);
  }
  for (const [heading, rows] of sections) {
    body.push({
      kind: "table",
      heading,
      columns: [{ header: "Item" }, { header: "Condition" }, { header: "Recommendation" }],
      rows: sectionRows(rows),
    });
  }

  const sea = reportData.seaTrial;
  if (sea) {
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
      confidential: !!settings.confidential,
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
