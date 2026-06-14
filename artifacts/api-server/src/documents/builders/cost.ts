/**
 * Annual ownership cost report content builder: result data → DocumentModel.
 */
import type {
  CostBreakdownLine,
  CostReportData,
  DocumentTemplate,
  ExportSettings,
  YachtProfile,
} from "../documentTypes";
import { getTheme } from "../core/theme";
import { num, photoList } from "../core/util";
import type { ContentNode, CoverSpec, DocumentModel, TableCell } from "../model/types";

const CURRENCY_SYMBOLS: Record<string, string> = {
  EUR: "€",
  USD: "$",
  GBP: "£",
  CHF: "CHF ",
  AUD: "A$",
  CAD: "C$",
};

function moneyOf(currency: string | null | undefined): (v: unknown) => string {
  const code = (currency ?? "EUR").toString().toUpperCase().trim();
  const sym = CURRENCY_SYMBOLS[code];
  return (v: unknown) => {
    const n = num(v);
    if (n == null) return "—";
    const neg = n < 0;
    const amount = Math.round(Math.abs(n)).toLocaleString("en-US");
    const body = sym ? `${sym}${amount}` : `${amount} ${code}`;
    return neg ? `−${body}` : body;
  };
}

function titleCase(s: string | null | undefined): string {
  return (s ?? "")
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function rows(items: CostBreakdownLine[] | null | undefined, money: (v: unknown) => string): TableCell[][] {
  return (items ?? []).map((item) => {
    const name: TableCell = { text: item.category ? String(item.category) : "—" };
    if (item.formula) name.sub = String(item.formula);
    return [
      name,
      {
        text: money(item.amount_eur),
        align: "right",
        bold: true,
      },
    ];
  });
}

function pushBreakdown(
  body: ContentNode[],
  heading: string,
  items: CostBreakdownLine[] | null | undefined,
  money: (v: unknown) => string,
): void {
  const tableRows = rows(items, money);
  if (!tableRows.length) return;
  body.push({
    kind: "table",
    heading,
    columns: [{ header: "Line item" }, { header: "Annual amount", align: "right", widthPct: 28 }],
    rows: tableRows,
  });
}

export function buildCostModel(input: {
  yacht: YachtProfile;
  reportData: CostReportData;
  settings: ExportSettings;
  template: DocumentTemplate;
}): DocumentModel {
  const { yacht, reportData, settings, template } = input;
  const theme = getTheme(template);
  const money = moneyOf(reportData.currency);
  const brand = settings.branding ?? settings.brand_name ?? "Yachtworth";
  const date = new Date().toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const total = num(reportData.totalAnnualEur);
  const perDay = num(reportData.costPerDayEur);
  const perWeek = num(reportData.costPerWeekEur);
  const crew = num(reportData.crewTotalEur);
  const operations = num(reportData.operationsTotalEur);
  const maintenance = num(reportData.maintenanceTotalEur);
  const financing = num(reportData.financingTotalEur);
  const breakEvenWeeks = num(reportData.charterBreakEvenWeeks);

  const subtitle = [yacht.builder, yacht.model, reportData.regionLabel]
    .filter((x) => x != null && x !== "")
    .join(" · ");
  const cells: { label: string; value: string }[] = [];
  if (perDay != null) cells.push({ label: "Per day", value: money(perDay) });
  if (perWeek != null) cells.push({ label: "Per week", value: money(perWeek) });
  if (reportData.usageType) cells.push({ label: "Usage", value: titleCase(reportData.usageType) });
  if (breakEvenWeeks != null) cells.push({ label: "Break-even", value: `${breakEvenWeeks} weeks` });

  const photos = photoList(yacht);
  const cover: CoverSpec = {
    eyebrow: `${brand} · ANNUAL COST REPORT`,
    name: yacht.name?.trim() ? yacht.name : "Annual Cost Estimate",
    date,
    cells,
  };
  if (subtitle) cover.subtitle = subtitle;
  if (total != null) cover.price = money(total);
  if (photos[0]) cover.photoUrl = photos[0];

  const body: ContentNode[] = [
    {
      kind: "metrics",
      heading: "Annual Ownership Cost",
      valueHeading: "Total Per Year",
      cards: [
        { label: "Total per year", value: total != null ? money(total) : "—", emphasis: true },
        { label: "Per day", value: perDay != null ? money(perDay) : "—" },
        { label: "Per week", value: perWeek != null ? money(perWeek) : "—" },
      ],
      caption: [
        reportData.regionLabel ? `Region: ${reportData.regionLabel}` : null,
        reportData.usageType ? `Usage: ${titleCase(reportData.usageType)}` : null,
      ].filter(Boolean).join("  ·  "),
    },
    {
      kind: "metrics",
      heading: "Cost Structure",
      cards: [
        { label: "Crew", value: crew != null ? money(crew) : "—" },
        { label: "Mooring & Operations", value: operations != null ? money(operations) : "—" },
        { label: "Maintenance & Technical", value: maintenance != null ? money(maintenance) : "—" },
        { label: "Financing", value: financing != null ? money(financing) : "—" },
      ],
    },
  ];

  if (breakEvenWeeks != null) {
    body.push({
      kind: "callout",
      tone: "info",
      text: `Charter break-even: approximately ${breakEvenWeeks} weeks of charter income would cover the annual ownership cost after broker commission.`,
    });
  }

  pushBreakdown(body, "Crew & Payroll", reportData.crewBreakdown, money);
  pushBreakdown(body, "Mooring & Operations", reportData.operationsBreakdown, money);
  pushBreakdown(body, "Maintenance & Technical", reportData.maintenanceBreakdown, money);
  pushBreakdown(body, "Financing", reportData.financingBreakdown, money);

  if (reportData.legalDisclaimer) {
    body.push({ kind: "callout", tone: "legal", text: reportData.legalDisclaimer });
  }

  return {
    meta: {
      type: "cost_report",
      brand,
      title: "ANNUAL COST REPORT",
      language: settings.language ?? "english",
      confidential: !!settings.confidential,
      watermarkText: "CONFIDENTIAL",
      generatedAt: date,
      disclaimer: reportData.legalDisclaimer ?? undefined,
    },
    theme,
    cover,
    body,
  };
}
