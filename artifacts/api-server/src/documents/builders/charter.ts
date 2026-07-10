import type {
  CharterReportData,
  DocumentTemplate,
  ExportSettings,
  FleetCharterReportData,
  YachtProfile,
} from "../documentTypes";
import { getTheme } from "../core/theme";
import { num, photoList } from "../core/util";
import type { ContentNode, CoverSpec, DocumentModel, TableCell } from "../model/types";

function money(v: unknown): string {
  const n = num(v);
  if (n == null) return "-";
  const sign = n < 0 ? "-" : "";
  return `${sign}EUR ${Math.round(Math.abs(n)).toLocaleString("en-US")}`;
}

function pct(v: unknown): string {
  const n = num(v);
  return n == null ? "-" : `${n.toFixed(1)}%`;
}

function titleCase(s: string | null | undefined): string {
  return (s ?? "")
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function dateLabel(): string {
  return new Date().toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function lineRows(items: CharterReportData["crew"]): TableCell[][] {
  return (items ?? []).map((item) => [
    { text: item.label ?? "-", sub: item.note ?? undefined },
    { text: item.value ?? money(item.amount_eur), align: "right", bold: true },
  ]);
}

export function buildCharterModel(input: {
  yacht: YachtProfile;
  reportData: CharterReportData;
  settings: ExportSettings;
  template: DocumentTemplate;
}): DocumentModel {
  const { yacht, reportData, settings, template } = input;
  const theme = getTheme(template);
  const brand = settings.branding ?? settings.brand_name ?? "Yachtworth";
  const date = dateLabel();
  const photos = photoList(yacht);
  const range = [reportData.startDate, reportData.endDate].filter(Boolean).join(" - ");

  const cells: CoverSpec["cells"] = [];
  if (range) cells.push({ label: "Dates", value: range });
  if (reportData.days != null) cells.push({ label: "Duration", value: `${reportData.days} days` });
  if (reportData.status) cells.push({ label: "Status", value: titleCase(reportData.status) });
  if (reportData.clientName) cells.push({ label: "Client", value: reportData.clientName });

  const cover: CoverSpec = {
    eyebrow: `${brand} · CHARTER REPORT`,
    name: yacht.name?.trim() || "Charter Trip Report",
    date,
    cells,
  };
  const subtitle = [yacht.builder, yacht.model, reportData.ports].filter(Boolean).join(" · ");
  if (subtitle) cover.subtitle = subtitle;
  if (photos[0]) cover.photoUrl = photos[0];
  if (reportData.netProfitEur != null) cover.price = money(reportData.netProfitEur);

  const body: ContentNode[] = [
    {
      kind: "metrics",
      heading: "Financial Summary",
      valueHeading: "Net Profit",
      cards: [
        { label: "Net profit", value: money(reportData.netProfitEur), emphasis: true },
        { label: "Owner receives", value: money(reportData.ownerReceivesEur) },
        { label: "Margin", value: pct(reportData.marginPct) },
        { label: "Invoice to client", value: money(reportData.totalInvoiceEur) },
      ],
      caption: reportData.rateLine ?? undefined,
    },
    {
      kind: "keyValue",
      heading: "Trip & Client",
      rows: [
        reportData.clientName ? { label: "Client", value: reportData.clientName } : null,
        reportData.clientEmail ? { label: "Email", value: reportData.clientEmail } : null,
        reportData.clientPhone ? { label: "Phone", value: reportData.clientPhone } : null,
        reportData.ports ? { label: "Ports", value: reportData.ports } : null,
        reportData.times ? { label: "Times", value: reportData.times } : null,
        reportData.contractStatus ? { label: "Contract", value: titleCase(reportData.contractStatus) } : null,
      ].filter(Boolean) as { label: string; value: string }[],
      boxed: true,
    },
    {
      kind: "table",
      heading: "Revenue & APA",
      columns: [{ header: "Line" }, { header: "Amount", align: "right", widthPct: 30 }],
      rows: [
        [{ text: "Base net revenue" }, { text: money(reportData.baseNetEur), align: "right", bold: true }],
        [{ text: "VAT" }, { text: money(reportData.vatAmountEur), align: "right" }],
        [{ text: "Total to client" }, { text: money(reportData.totalToClientEur), align: "right", bold: true }],
        [{ text: "APA budget" }, { text: money(reportData.apaAmountEur), align: "right" }],
        [{ text: "APA spent" }, { text: money(reportData.apaSpentEur), align: "right" }],
        [{ text: "APA balance" }, { text: money(reportData.apaBalanceEur), align: "right", bold: true }],
      ],
    },
  ];

  const crewRows = lineRows(reportData.crew);
  if (crewRows.length) {
    body.push({
      kind: "table",
      heading: "Crew Costs",
      columns: [{ header: "Crew" }, { header: "Amount", align: "right", widthPct: 30 }],
      rows: crewRows,
    });
  }

  const apaRows = lineRows(reportData.apaItems);
  if (apaRows.length) {
    body.push({
      kind: "table",
      heading: "APA Detail",
      columns: [{ header: "Item" }, { header: "Amount", align: "right", widthPct: 30 }],
      rows: apaRows,
    });
  }

  const distRows = lineRows(reportData.distribution);
  if (distRows.length) {
    body.push({
      kind: "table",
      heading: "Income Distribution",
      columns: [{ header: "Recipient" }, { header: "Amount", align: "right", widthPct: 30 }],
      rows: distRows,
    });
  }

  if (reportData.notes) body.push({ kind: "paragraph", heading: "Notes", text: reportData.notes, panel: true });
  body.push({
    kind: "callout",
    tone: "legal",
    text: "Indicative charter P&L based on entered data. Not a certified accounting statement.",
  });

  return {
    meta: {
      type: "charter_report",
      brand,
      title: "CHARTER REPORT",
      language: settings.language ?? "english",
      confidential: !!settings.confidential,
      watermarkText: "CONFIDENTIAL",
      generatedAt: date,
    },
    theme,
    cover,
    body,
  };
}

export function buildFleetCharterModel(input: {
  yacht: YachtProfile;
  reportData: FleetCharterReportData;
  settings: ExportSettings;
  template: DocumentTemplate;
}): DocumentModel {
  const { yacht, reportData, settings, template } = input;
  const theme = getTheme(template);
  const brand = settings.branding ?? settings.brand_name ?? "Yachtworth";
  const date = dateLabel();
  const rows = reportData.rows ?? [];

  return {
    meta: {
      type: "fleet_charter_report",
      brand,
      title: "FLEET CHARTER REPORT",
      language: settings.language ?? "english",
      confidential: !!settings.confidential,
      watermarkText: "CONFIDENTIAL",
      generatedAt: date,
    },
    theme,
    cover: {
      eyebrow: `${brand} · FLEET CHARTER REPORT`,
      name: reportData.monthLabel || "Fleet Charter Planner",
      subtitle: "Monthly charter activity",
      date,
      cells: [
        { label: "Charters", value: String(reportData.totalCharters ?? rows.length) },
        { label: "Total value", value: money(reportData.totalValueEur) },
      ],
    },
    body: [
      {
        kind: "table",
        heading: "Monthly Schedule",
        columns: [
          { header: "Yacht" },
          { header: "Client" },
          { header: "Dates" },
          { header: "Status" },
          { header: "Value", align: "right", widthPct: 20 },
        ],
        rows: rows.map((row) => [
          { text: row.yacht ?? yacht.name ?? "-" },
          { text: row.client ?? "-" },
          { text: row.range ?? "-" },
          { text: titleCase(row.status) || "-" },
          { text: money(row.value_eur), align: "right", bold: true },
        ]),
        emptyText: "No charters for this month.",
      },
      {
        kind: "callout",
        tone: "legal",
        text: "Fleet schedule is based on saved charter entries and should be reconciled with signed agreements before operational use.",
      },
    ],
  };
}
