import {
  getAuthToken,
  getBaseUrl,
  type Comparable,
  type RoiCalculation,
  type Valuation,
} from "@workspace/api-client-react";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { Platform } from "react-native";
import type {
  ProposalEquipmentItem,
  ProposalSettings,
  ProposalYachtSnapshot,
} from "./proposalTypes";

/**
 * Backend Document Generation Engine client (additive — independent from the
 * client-side "Legacy" `exportProposalPdf`). Calls `POST /api/documents/generate`
 * and downloads the returned PDF/DOCX file.
 */

export type DocumentFormat = "pdf" | "docx";

type BackendTemplate = "minimal" | "classic" | "premium";

function mapTemplate(t: ProposalSettings["template"]): BackendTemplate {
  if (t === "classic") return "classic";
  if (t === "dark") return "premium";
  return "minimal";
}

function arrayBufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  let out = "";
  let i = 0;
  for (; i + 2 < bytes.length; i += 3) {
    const n = (bytes[i]! << 16) | (bytes[i + 1]! << 8) | bytes[i + 2]!;
    out +=
      chars[(n >> 18) & 63] +
      chars[(n >> 12) & 63] +
      chars[(n >> 6) & 63] +
      chars[n & 63];
  }
  const rem = bytes.length - i;
  if (rem === 1) {
    const n = bytes[i]! << 16;
    out += chars[(n >> 18) & 63] + chars[(n >> 12) & 63] + "==";
  } else if (rem === 2) {
    const n = (bytes[i]! << 16) | (bytes[i + 1]! << 8);
    out += chars[(n >> 18) & 63] + chars[(n >> 12) & 63] + chars[(n >> 6) & 63] + "=";
  }
  return out;
}

function buildRequestBody(
  yacht: ProposalYachtSnapshot,
  equipment: ProposalEquipmentItem[],
  settings: ProposalSettings,
  format: DocumentFormat,
) {
  return {
    documentType: "proposal" as const,
    format,
    template: mapTemplate(settings.template),
    yachtProfile: yacht,
    reportData: {
      equipment,
      proposal_type: settings.proposal_type,
      sale_price_eur: settings.sale_price_eur ?? null,
      charter_low_eur_week: settings.charter_low_eur_week ?? null,
      charter_high_eur_week: settings.charter_high_eur_week ?? null,
      charter_apa_pct: settings.charter_apa_pct ?? null,
      charter_vat_pct: settings.charter_vat_pct ?? null,
      price_on_application: settings.price_on_application ?? null,
      charter_on_application: settings.charter_on_application ?? null,
      delivery: settings.delivery ?? null,
      sea_trial: settings.sea_trial ?? null,
      charter_area: settings.charter_area ?? null,
      myba_contract: settings.myba_contract ?? null,
      notes: settings.notes ?? null,
      broker_name: settings.broker_name ?? null,
      broker_company: settings.broker_company ?? null,
      broker_email: settings.broker_email ?? null,
      broker_phone: settings.broker_phone ?? null,
      broker_website: settings.broker_website ?? null,
    },
    exportSettings: {
      template: mapTemplate(settings.template),
      language: settings.language,
      sections: settings.sections,
      confidential: Array.isArray(settings.sections)
        ? settings.sections.includes("watermark_confidential")
        : false,
      // Proposal V2 (adaptive PDF engine) is opt-in. Enable it ONLY for the
      // Professional PDF export. DOCX must stay on the legacy backend path.
      ...(format === "pdf" ? { engine: "adaptive" as const } : {}),
    },
  };
}

function fileNameFor(yacht: ProposalYachtSnapshot, format: DocumentFormat): string {
  const base =
    (yacht.name || "proposal")
      .replace(/[^\w\s-]/g, "")
      .trim()
      .replace(/\s+/g, "_")
      .slice(0, 60) || "proposal";
  return `${base}_proposal.${format}`;
}

/**
 * Shared transport: POST a request body to the backend document engine and
 * present the returned binary (share sheet on native, download on web).
 * Identical behaviour for every document type — only the request body differs.
 */
async function downloadDocument(
  body: unknown,
  format: DocumentFormat,
  fileName: string,
): Promise<void> {
  const base = getBaseUrl() ?? "";
  const url = `${base}/api/documents/generate`;
  const token = await getAuthToken();

  const mime =
    format === "pdf"
      ? "application/pdf"
      : "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: mime,
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    let detail = "";
    try {
      const j = (await res.json()) as { error?: string };
      detail = j?.error ?? "";
    } catch {
      detail = await res.text().catch(() => "");
    }
    throw new Error(
      `Export failed (HTTP ${res.status})${detail ? `: ${detail.slice(0, 200)}` : ""}`,
    );
  }

  if (Platform.OS === "web") {
    const blob = await res.blob();
    const href = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = href;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(href);
    return;
  }

  const buf = await res.arrayBuffer();
  const base64 = arrayBufferToBase64(buf);
  const fileUri = `${FileSystem.cacheDirectory ?? ""}${fileName}`;
  await FileSystem.writeAsStringAsync(fileUri, base64, {
    encoding: FileSystem.EncodingType.Base64,
  });

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(fileUri, {
      mimeType: mime,
      dialogTitle: fileName,
      UTI: format === "pdf" ? "com.adobe.pdf" : "org.openxmlformats.wordprocessingml.document",
    });
  }
}

/**
 * Generate a professional proposal document on the backend and present it
 * (share sheet on native, download on web).
 */
export async function exportProposalDocument(input: {
  yacht: ProposalYachtSnapshot;
  equipment: ProposalEquipmentItem[];
  settings: ProposalSettings;
  format: DocumentFormat;
}): Promise<void> {
  const { yacht, equipment, settings, format } = input;
  await downloadDocument(
    buildRequestBody(yacht, equipment, settings, format),
    format,
    fileNameFor(yacht, format),
  );
}

// ─── valuation report (backend adaptive engine) ──────────────────────────────

/** Cover/spec header carried from the valuation wizard (already humanized). */
export type ValuationHeader = {
  yachtType?: string | null;
  builder?: string | null;
  model?: string | null;
  yearBuilt?: number | null;
  lengthMeters?: number | null;
};

const M_PER_FT = 0.3048;
const CONFIDENCE_PCT: Record<string, number> = { high: 85, medium: 60, low: 30 };

/**
 * Parse an AI comparable price string into a plain EUR number. Abbreviated
 * ("€1.2M") or non-numeric ("POA") prices can't be digit-stripped safely, so we
 * return null and let the caller keep the original string as a note instead.
 */
function parseEuro(s: string | null | undefined): number | null {
  if (!s) return null;
  const str = String(s);
  if (/[a-z]/i.test(str.replace(/eur|usd|gbp|chf/gi, ""))) return null;
  const digits = str.replace(/[^\d]/g, "");
  if (!digits) return null;
  const n = parseInt(digits, 10);
  return Number.isFinite(n) ? n : null;
}

/** Parse a comparable length string to metres (mirrors `formatComparableLength`). */
function parseLengthMeters(s: string | null | undefined): number | null {
  if (!s) return null;
  const raw = String(s).trim();
  const n = parseFloat(raw.replace(",", ".").replace(/[^\d.]/g, ""));
  if (!Number.isFinite(n) || n <= 0) return null;
  const meters = /ft|'/i.test(raw) ? n * M_PER_FT : n;
  return Math.round(meters * 10) / 10;
}

function mapComparables(list: Comparable[]) {
  return (list ?? []).map((c) => {
    const price = parseEuro(c.price);
    const notes = [
      c.condition ? String(c.condition) : null,
      c.note ? String(c.note) : null,
      price == null && c.price ? `Asking: ${c.price}` : null,
    ]
      .filter(Boolean)
      .join(" · ");
    return {
      builder: c.builder ?? null,
      model: c.model ?? null,
      year: c.year ?? null,
      length_meters: parseLengthMeters(c.length),
      price,
      currency: "EUR",
      notes: notes || null,
    };
  });
}

function buildValuationBody(
  result: Valuation,
  header: ValuationHeader | undefined,
  format: DocumentFormat,
) {
  const name =
    [header?.builder, header?.model].filter(Boolean).join(" ") ||
    header?.yachtType ||
    "Yacht Valuation";

  const vat =
    result.vat_status === "paid"
      ? "VAT Paid / EU Free Circulation"
      : result.vat_status === "not_paid"
        ? "VAT Not Paid (offshore)"
        : null;

  const factors: {
    factor: string;
    impact?: string;
    weight?: number | null;
    notes?: string | null;
  }[] = [];
  if (result.sale_region_label)
    factors.push({ factor: "Sale region", impact: "neutral", notes: result.sale_region_label });
  if (result.condition_label)
    factors.push({ factor: "Condition", impact: "neutral", notes: result.condition_label });
  if (
    typeof result.condition_adjustment_pct === "number" &&
    result.condition_adjustment_pct !== 0
  )
    factors.push({
      factor: "Condition adjustment",
      impact: result.condition_adjustment_pct > 0 ? "positive" : "negative",
      weight: result.condition_adjustment_pct,
      notes:
        typeof result.condition_baseline_eur === "number"
          ? `Baseline € ${Math.round(result.condition_baseline_eur).toLocaleString("en-US")}`
          : null,
    });
  if (result.sanity_adjusted)
    factors.push({
      factor: "Market band adjustment",
      impact: "neutral",
      notes: result.sanity_band_label ?? "Adjusted to regional market band",
    });

  return {
    documentType: "valuation_report" as const,
    format,
    template: "premium" as const,
    yachtProfile: {
      name,
      builder: header?.builder ?? null,
      model: header?.model ?? null,
      yacht_type: header?.yachtType ?? null,
      year_built: header?.yearBuilt ?? null,
      length_meters: header?.lengthMeters ?? null,
      vat_status: vat,
    },
    reportData: {
      estimatedValueLow: result.range_low_eur,
      estimatedValueMid: result.estimated_price_eur,
      estimatedValueHigh: result.range_high_eur,
      // Pricing scenarios — mirror the Market Estimate screen exactly.
      openMarketValue: result.estimated_price_eur,
      discreetSaleValue: result.distressed_price_eur ?? null,
      quickSaleValue: result.quick_sale_price_eur ?? null,
      currency: result.currency ?? "EUR",
      confidenceScore: CONFIDENCE_PCT[result.confidence] ?? null,
      completenessScore: result.completeness_score ?? null,
      completenessFilled: result.completeness_filled ?? null,
      completenessTotal: result.completeness_total ?? null,
      comparableYachts: mapComparables(result.comparables ?? []),
      valuationFactors: factors,
      marketNotes: result.reasoning ?? null,
      legalDisclaimer: result.legal_disclaimer ?? null,
    },
    exportSettings: {
      template: "premium" as const,
      language: "english" as const,
      branding: "Yachtworth",
      ...(format === "pdf" ? { engine: "adaptive" as const } : {}),
    },
  };
}

/**
 * Generate a professional valuation report on the backend (adaptive PDF engine)
 * and present it. Replaces the on-device `exportEstimatePdf` as the primary
 * "Export PDF report" action on the valuation result screen.
 */
export async function exportValuationDocument(input: {
  result: Valuation;
  header?: ValuationHeader;
}): Promise<void> {
  const { result, header } = input;
  const base =
    ([header?.builder, header?.model].filter(Boolean).join("_") ||
      header?.yachtType ||
      "valuation")
      .replace(/[^\w\s-]/g, "")
      .trim()
      .replace(/\s+/g, "_")
      .slice(0, 60) || "valuation";
  await downloadDocument(buildValuationBody(result, header, "pdf"), "pdf", `${base}_valuation.pdf`);
}

// ─── charter ROI report (backend adaptive engine) ────────────────────────────

/** Cover/spec header carried from the ROI flow (already humanized). */
export type RoiHeader = {
  yachtName?: string | null;
  builder?: string | null;
  model?: string | null;
  regionLabel?: string | null;
};

function buildRoiBody(result: RoiCalculation, header: RoiHeader | undefined) {
  const name =
    header?.yachtName?.trim() ||
    [header?.builder, header?.model].filter(Boolean).join(" ") ||
    "Charter ROI Scenario";

  return {
    documentType: "roi_report" as const,
    format: "pdf" as const,
    template: "premium" as const,
    yachtProfile: {
      name,
      builder: header?.builder ?? null,
      model: header?.model ?? null,
    },
    reportData: {
      annualRevenueEur: result.annual_revenue_eur,
      annualExpensesEur: result.annual_expenses_eur,
      netProfitEur: result.net_profit_eur,
      roiPct: result.roi_pct,
      paybackYears: result.payback_years,
      occupancyPct: result.occupancy_pct,
      expectedCharterWeeks: result.expected_charter_weeks,
      avgDailyRateEur: result.avg_daily_rate_eur,
      dailyRateLowSeasonEur: result.daily_rate_low_season_eur ?? null,
      dailyRateHighSeasonEur: result.daily_rate_high_season_eur ?? null,
      marketRating: result.market_rating ?? null,
      riskScore: result.risk_score ?? null,
      currency: result.currency ?? "EUR",
      confidence: result.confidence,
      regionLabel: header?.regionLabel ?? null,
      methodology: result.methodology ?? null,
      reasoning: result.reasoning ?? null,
      recommendations: result.recommendations ?? null,
      expenses: (result.expenses ?? []).map((e) => ({
        category: e.category,
        amount_eur: e.amount_eur,
        formula: e.formula ?? null,
      })),
      projection5y: (result.roi_projection_5y ?? []).map((p) => ({
        year_offset: p.year_offset,
        value_eur: p.value_eur,
      })),
      depreciationCurve: (result.depreciation_curve ?? []).map((p) => ({
        year_offset: p.year_offset,
        value_eur: p.value_eur,
      })),
      comparables: (result.comparables ?? []).map((c) => ({
        name: c.name,
        location: c.location ?? null,
        weekly_rate_eur: c.weekly_rate_eur ?? null,
      })),
      legalDisclaimer: result.legal_disclaimer ?? null,
    },
    exportSettings: {
      template: "premium" as const,
      language: "english" as const,
      branding: "Yachtworth",
      engine: "adaptive" as const,
    },
  };
}

/**
 * Generate a professional Charter ROI report on the backend (adaptive PDF
 * engine) and present it. Primary "Export PDF report" action on the ROI result
 * screen.
 */
export async function exportRoiDocument(input: {
  result: RoiCalculation;
  header?: RoiHeader;
}): Promise<void> {
  const { result, header } = input;
  const base =
    (header?.yachtName?.trim() ||
      [header?.builder, header?.model].filter(Boolean).join("_") ||
      "charter_roi")
      .replace(/[^\w\s-]/g, "")
      .trim()
      .replace(/\s+/g, "_")
      .slice(0, 60) || "charter_roi";
  await downloadDocument(buildRoiBody(result, header), "pdf", `${base}_charter_roi.pdf`);
}
