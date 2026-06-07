import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import type { RoiCalculation } from "@workspace/api-client-react";

const NAVY = "#0B1E3F";
const NAVY_DEEP = "#081633";
const NAVY_ELEV = "#142A52";
const GOLD = "#C9A961";
const IVORY = "#F7F3EC";
const MUTED = "rgba(247,243,236,0.6)";
const DIVIDER = "rgba(247,243,236,0.1)";
const POSITIVE = "#7BD389";
const NEGATIVE = "#FF8A8A";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function eur(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  const abs = Math.abs(Math.round(n));
  return (n < 0 ? "−€ " : "€ ") + abs.toLocaleString("en-US");
}

export interface RoiPdfHeaderInput {
  yachtName?: string | null;
  yachtType?: string | null;
  yearBuilt?: number | null;
  regionLabel?: string | null;
}

export function buildRoiPdfHtml(
  result: RoiCalculation,
  header?: RoiPdfHeaderInput,
): string {
  const netPositive = result.net_profit_eur >= 0;
  const paybackDisplay =
    result.payback_years >= 999 ? "—" : `${result.payback_years.toFixed(1)} yr`;

  const docTitle = header?.yachtName?.trim()
    ? header.yachtName.trim()
    : "Charter ROI scenario";
  const subtitleParts = [
    header?.yachtType,
    header?.yearBuilt ? String(header.yearBuilt) : null,
    header?.regionLabel,
  ].filter(Boolean) as string[];

  const expenseRows = (result.expenses ?? [])
    .map(
      (e) => `
      <div class="row">
        <div class="row-main">
          <div class="row-head">${escapeHtml(e.category)}</div>
          ${e.formula ? `<div class="row-meta">${escapeHtml(e.formula)}</div>` : ""}
        </div>
        <div class="row-amount">${escapeHtml(eur(e.amount_eur))}</div>
      </div>`,
    )
    .join("");

  const projectionRows = (result.roi_projection_5y ?? [])
    .map(
      (p) => `
      <div class="row">
        <div class="row-head">Year ${p.year_offset}</div>
        <div class="row-amount" style="color:${p.value_eur >= 0 ? POSITIVE : NEGATIVE}">${escapeHtml(eur(p.value_eur))}</div>
      </div>`,
    )
    .join("");

  const depreciationRows = (result.depreciation_curve ?? [])
    .map(
      (d) => `
      <div class="row">
        <div class="row-head">${d.year_offset === 0 ? "Today" : `Year ${d.year_offset}`}</div>
        <div class="row-amount">${escapeHtml(eur(d.value_eur))}</div>
      </div>`,
    )
    .join("");

  const comparableRows = (result.comparables ?? [])
    .map(
      (c) => `
      <div class="row">
        <div class="row-main">
          <div class="row-head">${escapeHtml(c.name)}</div>
          ${c.location ? `<div class="row-meta">${escapeHtml(c.location)}</div>` : ""}
        </div>
        ${c.weekly_rate_eur != null ? `<div class="row-amount">${escapeHtml(eur(c.weekly_rate_eur))}/wk</div>` : ""}
      </div>`,
    )
    .join("");

  const recommendationRows = (result.recommendations ?? [])
    .map((r) => `<li>${escapeHtml(r)}</li>`)
    .join("");

  const today = new Date().toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>${escapeHtml(docTitle)} — Charter ROI</title>
<style>
  @page { size: A4; margin: 24mm 18mm; }
  * { box-sizing: border-box; }
  body {
    font-family: -apple-system, "Helvetica Neue", Helvetica, Arial, sans-serif;
    color: ${IVORY};
    background: ${NAVY};
    margin: 0;
    padding: 0;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .wrap { padding: 28px 32px 36px; }
  .brand-row {
    display: flex; align-items: center; justify-content: space-between;
    border-bottom: 1px solid ${DIVIDER}; padding-bottom: 14px; margin-bottom: 22px;
  }
  .brand { color: ${GOLD}; font-size: 11px; letter-spacing: 4px; text-transform: uppercase; font-weight: 600; }
  .date { color: ${MUTED}; font-size: 10px; letter-spacing: 1px; text-transform: uppercase; }
  h1 { color: ${IVORY}; font-size: 26px; line-height: 1.2; margin: 0 0 4px; font-weight: 800; letter-spacing: -0.4px; }
  .subtitle { color: ${MUTED}; font-size: 13px; margin-bottom: 22px; }
  .hero {
    background: ${NAVY_DEEP}; border: 1px solid rgba(201,169,97,0.22);
    border-radius: 14px; padding: 22px 22px 20px; margin-bottom: 18px;
  }
  .hero-label { color: ${GOLD}; font-size: 10px; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 8px; font-weight: 600; }
  .hero-price { font-size: 36px; font-weight: 800; letter-spacing: -0.5px; line-height: 1; margin-bottom: 12px; }
  .chips { display: flex; gap: 8px; flex-wrap: wrap; }
  .chip {
    padding: 6px 12px; border-radius: 999px; border: 1px solid ${GOLD};
    color: ${GOLD}; font-size: 11px; font-weight: 600; background: rgba(201,169,97,0.1);
  }
  .chip.muted { border-color: ${DIVIDER}; color: ${MUTED}; background: transparent; }
  .summary-grid { display: flex; gap: 12px; margin-bottom: 18px; }
  .summary-card {
    flex: 1; background: ${NAVY_ELEV}; border-radius: 12px; padding: 14px 16px;
    border: 1px solid ${DIVIDER};
  }
  .summary-label { color: ${MUTED}; font-size: 10px; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 6px; }
  .summary-value { color: ${IVORY}; font-size: 18px; font-weight: 800; margin-bottom: 4px; }
  .summary-sub { color: ${MUTED}; font-size: 11px; line-height: 1.4; }
  h2 { color: ${IVORY}; font-size: 12px; letter-spacing: 2px; text-transform: uppercase;
       margin: 22px 0 12px; font-weight: 700; }
  .card { background: ${NAVY_ELEV}; border-radius: 12px; padding: 8px 16px; border: 1px solid ${DIVIDER}; }
  .row {
    display: flex; justify-content: space-between; align-items: center; gap: 12px;
    padding: 9px 0; border-bottom: 1px solid ${DIVIDER};
  }
  .row:last-child { border-bottom: none; }
  .row-head { color: ${IVORY}; font-size: 12px; font-weight: 600; }
  .row-meta { color: ${MUTED}; font-size: 10px; margin-top: 2px; }
  .row-amount { color: ${IVORY}; font-size: 12px; font-weight: 600; white-space: nowrap; }
  .reasoning {
    background: ${NAVY_ELEV}; border-radius: 12px; padding: 16px;
    color: ${IVORY}; font-size: 12px; line-height: 1.6; border: 1px solid ${DIVIDER};
  }
  ul.recs { margin: 0; padding: 16px 16px 16px 32px; background: ${NAVY_ELEV};
    border-radius: 12px; border: 1px solid ${DIVIDER}; }
  ul.recs li { color: ${IVORY}; font-size: 12px; line-height: 1.7; margin-bottom: 4px; }
  .pdye {
    margin-top: 26px; background: ${NAVY_DEEP}; border: 1px solid rgba(201,169,97,0.22);
    border-radius: 12px; padding: 16px; text-align: center; color: ${MUTED}; font-size: 11px; line-height: 1.6;
  }
  .pdye .gold { color: ${GOLD}; font-weight: 600; }
  .footer {
    margin-top: 22px; padding-top: 14px; border-top: 1px solid ${DIVIDER};
    color: ${MUTED}; font-size: 9px; line-height: 1.5; text-align: center;
  }
</style>
</head>
<body>
  <div class="wrap">
    <div class="brand-row">
      <div class="brand">YACHTWORTH</div>
      <div class="date">${escapeHtml(today)}</div>
    </div>

    <h1>${escapeHtml(docTitle)}</h1>
    ${subtitleParts.length ? `<div class="subtitle">${escapeHtml(subtitleParts.join(" · "))}</div>` : ""}

    <div class="hero">
      <div class="hero-label">Annual net profit</div>
      <div class="hero-price" style="color:${netPositive ? POSITIVE : NEGATIVE}">${escapeHtml(eur(result.net_profit_eur))}</div>
      <div class="chips">
        <span class="chip">${result.roi_pct.toFixed(1)}% ROI</span>
        <span class="chip">Payback ${escapeHtml(paybackDisplay)}</span>
        <span class="chip muted">${escapeHtml(result.confidence)} confidence</span>
      </div>
    </div>

    <div class="summary-grid">
      <div class="summary-card">
        <div class="summary-label">Annual revenue</div>
        <div class="summary-value">${escapeHtml(eur(result.annual_revenue_eur))}</div>
        <div class="summary-sub">${result.expected_charter_weeks} weeks · €${Math.round(result.avg_daily_rate_eur).toLocaleString("en-US")}/day</div>
      </div>
      <div class="summary-card">
        <div class="summary-label">Annual expenses</div>
        <div class="summary-value">${escapeHtml(eur(result.annual_expenses_eur))}</div>
        <div class="summary-sub">${result.occupancy_pct}% occupancy</div>
      </div>
    </div>

    ${result.methodology ? `<h2>How this was calculated</h2><div class="reasoning">${escapeHtml(result.methodology)}</div>` : ""}

    ${expenseRows ? `<h2>Expense breakdown</h2><div class="card">${expenseRows}</div>` : ""}

    ${projectionRows ? `<h2>Cumulative cash · 5 years</h2><div class="card">${projectionRows}</div>` : ""}

    ${depreciationRows ? `<h2>Yacht value · 5-year depreciation</h2><div class="card">${depreciationRows}</div>` : ""}

    ${comparableRows ? `<h2>Comparable charter listings</h2><div class="card">${comparableRows}</div>` : ""}

    ${result.reasoning ? `<h2>Analysis</h2><div class="reasoning">${escapeHtml(result.reasoning)}</div>` : ""}

    ${recommendationRows ? `<h2>Recommendations</h2><ul class="recs">${recommendationRows}</ul>` : ""}

    <div class="pdye">
      Need broker support for this yacht?<br/>
      <span class="gold">Powered by PDYE</span>
    </div>

    <div class="footer">${escapeHtml(result.legal_disclaimer)}</div>
  </div>
</body>
</html>`;
}

export async function exportRoiPdf(
  result: RoiCalculation,
  header?: RoiPdfHeaderInput,
): Promise<void> {
  const html = buildRoiPdfHtml(result, header);
  const { uri } = await Print.printToFileAsync({ html, base64: false });
  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) {
    throw new Error("Sharing is not available on this device.");
  }
  await Sharing.shareAsync(uri, {
    mimeType: "application/pdf",
    dialogTitle: "Save Charter ROI report",
    UTI: "com.adobe.pdf",
  });
}
