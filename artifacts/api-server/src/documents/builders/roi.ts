/**
 * Charter ROI report content builder: report inputs → DocumentModel.
 */
import type {
  DocumentTemplate,
  ExportSettings,
  RoiComparableLine,
  RoiExpenseLine,
  RoiReportData,
  RoiYearlyPoint,
  YachtProfile,
} from "../documentTypes";
import { getTheme } from "../core/theme";
import { num, photoList } from "../core/util";
import type {
  ContentNode,
  CoverSpec,
  DocumentModel,
  TableCell,
} from "../model/types";

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
    if (n == null) return "";
    const neg = n < 0;
    const amount = Math.round(Math.abs(n)).toLocaleString("en-US");
    const body = sym ? `${sym}${amount}` : `${amount} ${code}`;
    return neg ? `−${body}` : body;
  };
}

function confidencePct(v: string | null | undefined): number | null {
  switch ((v ?? "").toString().toLowerCase()) {
    case "high": return 85;
    case "medium": return 60;
    case "low": return 30;
    default: return null;
  }
}


function titleCase(s: string): string {
  return s
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

const L = {
  report: "CHARTER ROI REPORT",
  scenario: "Charter ROI Scenario",
  result: "ROI Result",
  netProfit: "Annual Net Profit",
  revenue: "Annual Revenue",
  expenses: "Annual Expenses",
  roi: "ROI",
  payback: "Payback",
  confidence: "Confidence",
  keyFigures: "Key Figures",
  methodology: "How This Was Calculated",
  expenseBreakdown: "Expense Breakdown",
  projection: "Cumulative Cash · 5 Years",
  depreciation: "Yacht Value · 5-Year Depreciation",
  exitScenario: "5-Year Exit Scenario",
  comparables: "Comparable Charter Listings",
  analysis: "Analysis",
  recommendations: "Recommendations",
  none: "—",
  perWeek: "/wk",
};

function expenseRows(
  items: RoiExpenseLine[],
  money: (v: unknown) => string,
): TableCell[][] {
  return items.map((e) => {
    const nameCell: TableCell = { text: e.category ? String(e.category) : L.none };
    if (e.formula) nameCell.sub = String(e.formula);
    const amount = num(e.amount_eur);
    const amountCell: TableCell = {
      text: amount != null ? money(amount) : L.none,
      align: "right",
      bold: true,
    };
    return [nameCell, amountCell];
  });
}

function yearlyRows(
  items: RoiYearlyPoint[],
  money: (v: unknown) => string,
): TableCell[][] {
  return items.map((p) => {
    const offset = num(p.year_offset);
    const label = offset === 0 ? "Today" : `Year ${offset ?? "—"}`;
    const value = num(p.value_eur);
    return [
      { text: label } as TableCell,
      { text: value != null ? money(value) : L.none, align: "right", bold: true } as TableCell,
    ];
  });
}

function comparableRows(
  items: RoiComparableLine[],
  money: (v: unknown) => string,
): TableCell[][] {
  return items.map((c) => {
    const modelAndName = [c.model, c.name].filter(Boolean).join(" · ");
    const locationAndYear = [c.location, c.year_built ? String(c.year_built) : null]
      .filter(Boolean)
      .join(" · ");
    const nameCell: TableCell = {
      text: modelAndName || (c.name ? String(c.name) : L.none),
      sub: locationAndYear || undefined,
    };
    const rate = num(c.weekly_rate_eur);
    const rateCell: TableCell = {
      text: rate != null ? `${money(rate)}${L.perWeek}` : L.none,
      align: "right",
      bold: true,
    };
    return [nameCell, rateCell];
  });
}

export function buildRoiModel(input: {
  yacht: YachtProfile;
  reportData: RoiReportData;
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

  const net = num(reportData.netProfitEur);
  const revenue = num(reportData.annualRevenueEur);
  const expenses = num(reportData.annualExpensesEur);
  const roiPct = num(reportData.roiPct);
  const payback = num(reportData.paybackYears);
  const occupancy = num(reportData.occupancyPct);
  const weeks = num(reportData.expectedCharterWeeks);
  const avgDaily = num(reportData.avgDailyRateEur);
  const conf = (reportData.confidence ?? "").toString().toLowerCase();
  const confLabel = conf ? titleCase(conf) : "";

  const roiDisplay = roiPct != null ? `${roiPct.toFixed(1)}%` : L.none;
  const paybackDisplay =
    payback != null ? (payback >= 999 ? L.none : `${payback.toFixed(1)} yr`) : L.none;

  const photos = photoList(yacht);
  const subtitle = [yacht.builder, yacht.model, reportData.regionLabel]
    .filter((x) => x != null && x !== "")
    .join(" · ");
  const cells: { label: string; value: string }[] = [];
  cells.push({ label: L.roi, value: roiDisplay });
  cells.push({ label: L.payback, value: paybackDisplay });
  if (weeks != null) cells.push({ label: "Weeks", value: String(weeks) });
  if (occupancy != null) cells.push({ label: "Occupancy", value: `${Math.round(occupancy)}%` });
  if (confLabel) cells.push({ label: L.confidence, value: confLabel });

  const cover: CoverSpec = {
    eyebrow: `${brand} · ${L.report}`,
    name: yacht.name?.trim() ? yacht.name : L.scenario,
    date,
    cells,
  };
  if (photos[0]) cover.photoUrl = photos[0];
  if (subtitle) cover.subtitle = subtitle;
  if (net != null) cover.price = money(net);

  const body: ContentNode[] = [];

  const metrics: ContentNode = {
    kind: "metrics",
    heading: L.result,
    valueHeading: L.netProfit,
    cards: [
      { label: L.netProfit, value: net != null ? money(net) : L.none, emphasis: true },
      { label: L.revenue, value: revenue != null ? money(revenue) : L.none },
      { label: L.expenses, value: expenses != null ? money(expenses) : L.none },
    ],
  };
  const confPct = confidencePct(reportData.confidence);
  if (confPct != null) metrics.confidence = { label: L.confidence, pct: confPct };
  const capParts: string[] = [];
  if (weeks != null) capParts.push(`${weeks} charter weeks`);
  if (avgDaily != null) capParts.push(`${money(avgDaily)}/day average`);
  if (occupancy != null) capParts.push(`${Math.round(occupancy)}% occupancy`);
  if (capParts.length) metrics.caption = capParts.join("  ·  ");
  body.push(metrics);

  const figures: { label: string; value: string }[] = [];
  if (roiPct != null) figures.push({ label: L.roi, value: roiDisplay });
  if (payback != null) figures.push({ label: L.payback, value: paybackDisplay });
  if (avgDaily != null) figures.push({ label: "Avg daily rate", value: money(avgDaily) });
  if (weeks != null) figures.push({ label: "Charter weeks", value: String(weeks) });
  if (occupancy != null)
    figures.push({ label: "Occupancy", value: `${Math.round(occupancy)}%` });
  const lowRate = num(reportData.dailyRateLowSeasonEur);
  const highRate = num(reportData.dailyRateHighSeasonEur);
  if (lowRate != null) figures.push({ label: "Low-season rate", value: money(lowRate) });
  if (highRate != null) figures.push({ label: "High-season rate", value: money(highRate) });
  const risk = num(reportData.riskScore);
  if (risk != null) figures.push({ label: "Risk score", value: `${risk}/10` });
  if (reportData.marketRating)
    figures.push({ label: "Market rating", value: String(reportData.marketRating) });
  if (figures.length) {
    body.push({
      kind: "keyValue",
      heading: L.keyFigures,
      rows: figures,
      layout: "pairs",
      emptyText: L.none,
    });
  }

  if (reportData.methodology && reportData.methodology.trim()) {
    body.push({
      kind: "paragraph",
      heading: L.methodology,
      panel: true,
      text: reportData.methodology.trim(),
    });
  }

  let detailStarted = false;
  const expenseList = Array.isArray(reportData.expenses) ? reportData.expenses : [];
  if (expenseList.length) {
    body.push({
      kind: "table",
      heading: L.expenseBreakdown,
      breakBefore: true,
      columns: [{ widthPct: 70 }, { align: "right", widthPct: 30 }],
      rows: expenseRows(expenseList, money),
    });
    detailStarted = true;
  }

  const projection = Array.isArray(reportData.projection5y) ? reportData.projection5y : [];
  if (projection.length) {
    body.push({
      kind: "table",
      heading: L.projection,
      columns: [{ widthPct: 70 }, { align: "right", widthPct: 30 }],
      rows: yearlyRows(projection, money),
    });
    detailStarted = true;
  }

  const depreciation = Array.isArray(reportData.depreciationCurve)
    ? reportData.depreciationCurve
    : [];
  if (depreciation.length) {
    body.push({
      kind: "table",
      heading: L.depreciation,
      columns: [{ widthPct: 70 }, { align: "right", widthPct: 30 }],
      rows: yearlyRows(depreciation, money),
    });
    detailStarted = true;
  }

  // Exit scenario — sale after 5 years.
  const exit = reportData.exitScenario;
  if (exit) {
    const exitFigures: { label: string; value: string }[] = [];
    if (exit.purchase_price_eur != null)
      exitFigures.push({ label: "Purchase price", value: money(exit.purchase_price_eur) });
    if (exit.charter_income_5y_eur != null)
      exitFigures.push({ label: "Charter income (5yr)", value: money(exit.charter_income_5y_eur) });
    if (exit.vessel_value_at_sale_eur != null)
      exitFigures.push({ label: "Vessel value at sale", value: money(exit.vessel_value_at_sale_eur) });
    if (exit.total_return_eur != null)
      exitFigures.push({ label: "Total return", value: money(exit.total_return_eur) });
    if (exit.exit_result_eur != null)
      exitFigures.push({ label: "Exit result", value: money(exit.exit_result_eur) });
    if (exit.exit_result_pct != null)
      exitFigures.push({ label: "Exit ROI", value: `${exit.exit_result_pct.toFixed(1)}%` });
    if (exit.total_loan_paid_eur != null)
      exitFigures.push({ label: "Total loan paid", value: money(exit.total_loan_paid_eur) });
    if (exit.exit_result_after_loan_eur != null)
      exitFigures.push({ label: "Exit result after loan", value: money(exit.exit_result_after_loan_eur) });
    if (exitFigures.length) {
      body.push({
        kind: "keyValue",
        heading: L.exitScenario,
        rows: exitFigures,
        layout: "pairs",
        emptyText: L.none,
      });
      detailStarted = true;
    }
  }

  const comparables = Array.isArray(reportData.comparables) ? reportData.comparables : [];
  if (comparables.length) {
    body.push({
      kind: "table",
      heading: L.comparables,
      columns: [{ widthPct: 70 }, { align: "right", widthPct: 30 }],
      rows: comparableRows(comparables, money),
    });
    detailStarted = true;
  }

  if (reportData.reasoning && reportData.reasoning.trim()) {
    const analysis: ContentNode = {
      kind: "paragraph",
      heading: L.analysis,
      panel: true,
      text: reportData.reasoning.trim(),
    };
    body.push(analysis);
    detailStarted = true;
  }

  const recs = Array.isArray(reportData.recommendations)
    ? reportData.recommendations.filter((r) => r != null && String(r).trim())
    : [];
  if (recs.length) {
    body.push({
      kind: "paragraph",
      heading: L.recommendations,
      text: recs.map((r) => `• ${String(r).trim()}`).join("\n"),
    });
  }

  return {
    meta: {
      type: "roi_report",
      brand,
      title: L.report,
      language: settings.language ?? "english",
      confidential: settings.confidential === true,
      watermarkText: L.report,
      generatedAt: date,
      disclaimer:
        typeof reportData.legalDisclaimer === "string" && reportData.legalDisclaimer.trim()
          ? reportData.legalDisclaimer.trim()
          : "Indicative · not certified · valid 30 days from issue.",
    },
    theme,
    cover,
    body,
  };
}
