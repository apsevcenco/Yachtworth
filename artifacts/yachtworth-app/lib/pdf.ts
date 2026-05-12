import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import type { Valuation } from "@workspace/api-client-react";
import { formatComparableLength, type UnitsSystem } from "./units";

const NAVY = "#0B1E3F";
const NAVY_DEEP = "#081633";
const NAVY_ELEV = "#142A52";
const GOLD = "#C9A961";
const IVORY = "#F7F3EC";
const MUTED = "rgba(247,243,236,0.6)";
const DIVIDER = "rgba(247,243,236,0.1)";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatEur(n: number): string {
  return "€ " + Math.round(n).toLocaleString("en-US");
}

function escapeAttr(s: string): string {
  return escapeHtml(s);
}

export interface PdfHeaderInput {
  yachtType?: string | null;
  builder?: string | null;
  model?: string | null;
  yearBuilt?: number | null;
  lengthMeters?: number | null;
}

export function buildEstimatePdfHtml(
  result: Valuation,
  units: UnitsSystem,
  header?: PdfHeaderInput,
): string {
  const tiers = [
    { label: "Open market", value: result.estimated_price_eur, accent: true },
    { label: "Discreet sale", value: result.distressed_price_eur, accent: false },
    { label: "Quick sale", value: result.quick_sale_price_eur, accent: false },
  ];
  const maxTier = Math.max(...tiers.map((t) => t.value));

  const titleParts = [
    header?.builder,
    header?.model,
    header?.yearBuilt ? String(header.yearBuilt) : null,
  ].filter(Boolean);
  const subtitleParts = [
    header?.yachtType,
    header?.lengthMeters
      ? units === "metric"
        ? `${header.lengthMeters.toFixed(1)} m`
        : `${Math.round(header.lengthMeters * 3.28084)} ft`
      : null,
  ].filter(Boolean) as string[];
  const docTitle = titleParts.length ? titleParts.join(" ") : "Yacht estimate";

  const compRows = result.comparables
    .map((c) => {
      const head = [c.builder, c.model].filter(Boolean).join(" ") || "Listing";
      const meta = [
        c.year ? String(c.year) : null,
        c.length ? formatComparableLength(c.length, units) : null,
        c.condition || null,
      ]
        .filter(Boolean)
        .join(" · ");
      return `
        <div class="comp">
          <div class="comp-main">
            <div class="comp-head">${escapeHtml(head)}</div>
            ${meta ? `<div class="comp-meta">${escapeHtml(meta)}</div>` : ""}
            ${c.note ? `<div class="comp-note">${escapeHtml(c.note)}</div>` : ""}
          </div>
          <div class="comp-price">${escapeHtml(c.price)}</div>
        </div>`;
    })
    .join("");

  const tiersHtml = tiers
    .map((t) => {
      const widthPct = (t.value / maxTier) * 100;
      return `
        <div class="tier">
          <div class="tier-head">
            <span class="tier-label">${escapeHtml(t.label)}</span>
            <span class="tier-value ${t.accent ? "accent" : ""}">${escapeHtml(formatEur(t.value))}</span>
          </div>
          <div class="bar-track"><div class="bar-fill ${t.accent ? "accent" : ""}" style="width:${widthPct}%"></div></div>
        </div>`;
    })
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
<title>${escapeAttr(docTitle)} — Market estimate</title>
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
  .hero-price { color: ${IVORY}; font-size: 36px; font-weight: 800; letter-spacing: -0.5px; line-height: 1; margin-bottom: 10px; }
  .hero-range { color: ${MUTED}; font-size: 13px; }
  .conf {
    display: inline-block; margin-top: 14px; padding: 6px 12px; border-radius: 999px;
    border: 1px solid ${GOLD}; color: ${GOLD}; font-size: 11px; font-weight: 600;
    background: rgba(201,169,97,0.1);
  }
  .meta-card {
    background: ${NAVY_ELEV}; border-radius: 12px; padding: 12px 16px;
    margin-bottom: 18px; border: 1px solid ${DIVIDER};
  }
  .meta-row { color: ${IVORY}; font-size: 12px; line-height: 1.7; }
  .meta-row .k { color: ${GOLD}; font-weight: 600; }
  h2 { color: ${IVORY}; font-size: 12px; letter-spacing: 2px; text-transform: uppercase;
       margin: 22px 0 12px; font-weight: 700; }
  .tiers { background: ${NAVY_ELEV}; border-radius: 12px; padding: 14px 16px; }
  .tier { margin: 8px 0; }
  .tier-head { display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 12px; }
  .tier-label { color: ${MUTED}; }
  .tier-value { color: ${IVORY}; font-weight: 600; }
  .tier-value.accent { color: ${GOLD}; }
  .bar-track { height: 6px; background: rgba(247,243,236,0.07); border-radius: 4px; overflow: hidden; }
  .bar-fill { height: 100%; background: rgba(201,169,97,0.45); border-radius: 4px; }
  .bar-fill.accent { background: ${GOLD}; }
  .reasoning {
    background: ${NAVY_ELEV}; border-radius: 12px; padding: 16px;
    color: ${IVORY}; font-size: 12px; line-height: 1.6; border: 1px solid ${DIVIDER};
  }
  .comp {
    background: ${NAVY_ELEV}; border-radius: 10px; padding: 12px 14px;
    margin-bottom: 8px; display: flex; justify-content: space-between; gap: 12px;
    border: 1px solid ${DIVIDER};
  }
  .comp-head { color: ${IVORY}; font-size: 12px; font-weight: 600; }
  .comp-meta { color: ${MUTED}; font-size: 11px; margin-top: 2px; }
  .comp-note { color: ${MUTED}; font-size: 11px; margin-top: 4px; font-style: italic; }
  .comp-price { color: ${GOLD}; font-size: 13px; font-weight: 700; white-space: nowrap; }
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
      <div class="hero-label">Indicative market estimate</div>
      <div class="hero-price">${escapeHtml(formatEur(result.estimated_price_eur))}</div>
      <div class="hero-range">Range ${escapeHtml(formatEur(result.range_low_eur))} — ${escapeHtml(formatEur(result.range_high_eur))}</div>
      <div class="conf">${escapeHtml(result.confidence)} confidence · ${result.completeness_score}% complete</div>
    </div>

    <div class="meta-card">
      ${result.sale_region_label ? `<div class="meta-row"><span class="k">Sale region</span> · ${escapeHtml(result.sale_region_label)}</div>` : ""}
      ${result.vat_status ? `<div class="meta-row"><span class="k">Tax status</span> · ${result.vat_status === "paid" ? "Tax paid (EU free circulation)" : "Tax not paid (offshore)"}</div>` : ""}
      ${result.condition_label ? `<div class="meta-row"><span class="k">Condition</span> · ${escapeHtml(result.condition_label)} (${result.condition_adjustment_pct >= 0 ? "+" : ""}${result.condition_adjustment_pct}%)</div>` : ""}
      ${result.completeness_filled != null && result.completeness_total != null ? `<div class="meta-row"><span class="k">Data quality</span> · ${result.completeness_filled}/${result.completeness_total} fields filled</div>` : ""}
    </div>

    ${result.sanity_adjusted ? `<div class="meta-card"><div class="meta-row"><span class="k">Note</span> · Estimate adjusted to match market band${result.sanity_band_label ? ` (${escapeHtml(result.sanity_band_label)})` : ""}.</div></div>` : ""}

    <h2>Pricing scenarios</h2>
    <div class="tiers">${tiersHtml}</div>

    ${result.reasoning ? `<h2>Analyst's note</h2><div class="reasoning">${escapeHtml(result.reasoning)}</div>` : ""}

    ${compRows ? `<h2>Comparable yachts</h2>${compRows}` : ""}

    <div class="pdye">
      Need broker support for this yacht?<br/>
      <span class="gold">Powered by PDYE</span>
    </div>

    <div class="footer">${escapeHtml(result.legal_disclaimer)}</div>
  </div>
</body>
</html>`;
}

export async function exportEstimatePdf(
  result: Valuation,
  units: UnitsSystem,
  header?: PdfHeaderInput,
): Promise<void> {
  const html = buildEstimatePdfHtml(result, units, header);
  const { uri } = await Print.printToFileAsync({ html, base64: false });
  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(uri, {
      mimeType: "application/pdf",
      dialogTitle: "Save Yachtworth estimate",
      UTI: "com.adobe.pdf",
    });
  }
}
