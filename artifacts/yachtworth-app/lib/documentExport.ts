import {
  getAuthToken,
  getBaseUrl,
  type Charter,
  type Comparable,
  type RoiCalculation,
  type Valuation,
  type Yacht,
} from "@workspace/api-client-react";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { Platform } from "react-native";
import type {
  ProposalEquipmentItem,
  ProposalSettings,
  ProposalYachtSnapshot,
} from "./proposalTypes";
import {
  calcCharter,
  DEFAULT_CENTRAL_AGENT_TYPE,
  DEFAULT_CENTRAL_AGENT_VALUE,
  type CentralAgentType,
  type CharterCalcInput,
  type DistributionEntry,
  type SubAgent,
  type SubAgentType,
} from "./charterCalc";

export type DocumentFormat = "pdf";

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
      engine: "adaptive" as const,
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

async function downloadDocument(
  body: unknown,
  format: DocumentFormat,
  fileName: string,
): Promise<void> {
  const base = getBaseUrl() ?? "";
  const url = `${base}/api/documents/generate`;
  const token = await getAuthToken();

  const mime = "application/pdf";

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
      UTI: "com.adobe.pdf",
    });
  }
}

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

// ─── valuation report ────────────────────────────────────────────────────────

export type ValuationHeader = {
  yachtType?: string | null;
  builder?: string | null;
  model?: string | null;
  yearBuilt?: number | null;
  lengthMeters?: number | null;
  cover_photo_url?: string | null;
  photo_url?: string | null;
  photo_urls?: string[] | null;
};

const M_PER_FT = 0.3048;
const CONFIDENCE_PCT: Record<string, number> = { high: 85, medium: 60, low: 30 };

function parseEuro(s: string | null | undefined): number | null {
  if (!s) return null;
  const str = String(s);
  if (/[a-z]/i.test(str.replace(/eur|usd|gbp|chf/gi, ""))) return null;
  const digits = str.replace(/[^\d]/g, "");
  if (!digits) return null;
  const n = parseInt(digits, 10);
  return Number.isFinite(n) ? n : null;
}

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
    const enriched = c as Comparable & {
      source_url?: string | null;
      location?: string | null;
      vat_status?: "paid" | "not_paid" | null;
    };
    const sourceUrl = enriched.source_url;
    const price = parseEuro(c.price);
    const notes = [
      c.condition ? String(c.condition) : null,
      enriched.vat_status === "paid"
        ? "VAT paid"
        : enriched.vat_status === "not_paid"
          ? "VAT not paid"
          : null,
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
      location: enriched.location ?? null,
      price,
      currency: "EUR",
      source: sourceUrl ?? null,
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
    "Yacht Market Estimate";

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
      cover_photo_url: header?.cover_photo_url ?? null,
      photo_url: header?.photo_url ?? null,
      photo_urls: header?.photo_urls ?? null,
    },
    reportData: {
      estimatedValueLow: result.range_low_eur,
      estimatedValueMid: result.estimated_price_eur,
      estimatedValueHigh: result.range_high_eur,
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
      engine: "adaptive" as const,
    },
  };
}

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

// ─── charter ROI report ──────────────────────────────────────────────────────

export type RoiHeader = {
  yachtName?: string | null;
  builder?: string | null;
  model?: string | null;
  regionLabel?: string | null;
  cover_photo_url?: string | null;
  photo_url?: string | null;
  photo_urls?: string[] | null;
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
      cover_photo_url: header?.cover_photo_url ?? null,
      photo_url: header?.photo_url ?? null,
      photo_urls: header?.photo_urls ?? null,
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
        model: c.model ?? null,
        location: c.location ?? null,
        weekly_rate_eur: c.weekly_rate_eur ?? null,
        year_built: c.year_built ?? null,
        source_url: c.source_url ?? null,
      })),
      exitScenario: result.exit_scenario ? {
        purchase_price_eur: result.exit_scenario.purchase_price_eur,
        charter_income_5y_eur: result.exit_scenario.charter_income_5y_eur,
        vessel_value_at_sale_eur: result.exit_scenario.vessel_value_at_sale_eur,
        total_return_eur: result.exit_scenario.total_return_eur,
        exit_result_eur: result.exit_scenario.exit_result_eur,
        exit_result_pct: result.exit_scenario.exit_result_pct,
        total_loan_paid_eur: result.exit_scenario.total_loan_paid_eur ?? null,
        exit_result_after_loan_eur: result.exit_scenario.exit_result_after_loan_eur ?? null,
      } : null,
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

// ─── annual ownership cost report ────────────────────────────────────────────

type CostBreakdownEntry = {
  category: string;
  amount_eur: number;
  formula?: string | null;
};

type CostCategorySummary = {
  category: string;
  amount_eur: number;
  color_hint?: string | null;
};

export type CostDocumentResult = {
  total_annual_eur: number;
  cost_per_day_eur: number;
  cost_per_week_eur: number;
  crew_total_eur: number;
  operations_total_eur: number;
  maintenance_total_eur: number;
  financing_total_eur: number;
  crew_breakdown: CostBreakdownEntry[];
  operations_breakdown: CostBreakdownEntry[];
  maintenance_breakdown: CostBreakdownEntry[];
  financing_breakdown: CostBreakdownEntry[];
  category_summary: CostCategorySummary[];
  charter_break_even_weeks: number | null;
  currency: string;
  legal_disclaimer: string;
  yacht_name?: string | null;
  builder?: string | null;
  model?: string | null;
  yacht_class: string;
  length_meters: number;
  year_built: number;
};

export type CostHeader = {
  regionLabel?: string | null;
  usageType?: string | null;
  cover_photo_url?: string | null;
  photo_url?: string | null;
  photo_urls?: string[] | null;
};

function buildCostBody(result: CostDocumentResult, header: CostHeader | undefined) {
  const name =
    result.yacht_name?.trim() ||
    [result.builder, result.model].filter(Boolean).join(" ") ||
    "Annual Cost Estimate";

  return {
    documentType: "cost_report" as const,
    format: "pdf" as const,
    template: "premium" as const,
    yachtProfile: {
      name,
      builder: result.builder ?? null,
      model: result.model ?? null,
      yacht_type: result.yacht_class ?? null,
      year_built: result.year_built ?? null,
      length_meters: result.length_meters ?? null,
      cover_photo_url: header?.cover_photo_url ?? null,
      photo_url: header?.photo_url ?? null,
      photo_urls: header?.photo_urls ?? null,
    },
    reportData: {
      totalAnnualEur: result.total_annual_eur,
      costPerDayEur: result.cost_per_day_eur,
      costPerWeekEur: result.cost_per_week_eur,
      crewTotalEur: result.crew_total_eur,
      operationsTotalEur: result.operations_total_eur,
      maintenanceTotalEur: result.maintenance_total_eur,
      financingTotalEur: result.financing_total_eur,
      crewBreakdown: result.crew_breakdown ?? [],
      operationsBreakdown: result.operations_breakdown ?? [],
      maintenanceBreakdown: result.maintenance_breakdown ?? [],
      financingBreakdown: result.financing_breakdown ?? [],
      categorySummary: result.category_summary ?? [],
      charterBreakEvenWeeks: result.charter_break_even_weeks ?? null,
      currency: result.currency ?? "EUR",
      usageType: header?.usageType ?? null,
      regionLabel: header?.regionLabel ?? null,
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

export async function exportCostDocument(input: {
  result: CostDocumentResult;
  header?: CostHeader;
}): Promise<void> {
  const { result, header } = input;
  const base =
    (result.yacht_name?.trim() ||
      [result.builder, result.model].filter(Boolean).join("_") ||
      "annual_cost")
      .replace(/[^\w\s-]/g, "")
      .trim()
      .replace(/\s+/g, "_")
      .slice(0, 60) || "annual_cost";
  await downloadDocument(buildCostBody(result, header), "pdf", `${base}_annual_cost.pdf`);
}

// Listing report

export type ListingDocumentInput = {
  yachtName: string;
  builder?: string | null;
  model?: string | null;
  yearBuilt?: number | null;
  lengthMeters?: number | null;
  yachtType?: string | null;
  photoUrl?: string | null;
  photoUrls?: string[] | null;
  generatedText: string;
  listingType?: string | null;
  style?: string | null;
  language?: string | null;
  askingPriceEur?: number | null;
  charterRateEurWeek?: number | null;
  brokerageName?: string | null;
  contactEmail?: string | null;
};

function buildListingBody(input: ListingDocumentInput) {
  return {
    documentType: "listing_report" as const,
    format: "pdf" as const,
    template: "premium" as const,
    yachtProfile: {
      name: input.yachtName || "Yacht Listing",
      builder: input.builder ?? null,
      model: input.model ?? null,
      yacht_type: input.yachtType ?? null,
      year_built: input.yearBuilt ?? null,
      length_meters: input.lengthMeters ?? null,
      cover_photo_url: input.photoUrl ?? null,
      photo_url: input.photoUrl ?? null,
      photo_urls: input.photoUrls ?? (input.photoUrl ? [input.photoUrl] : null),
    },
    reportData: {
      generatedText: input.generatedText,
      listingType: input.listingType ?? null,
      style: input.style ?? null,
      language: input.language ?? "english",
      askingPriceEur: input.askingPriceEur ?? null,
      charterRateEurWeek: input.charterRateEurWeek ?? null,
      brokerageName: input.brokerageName ?? null,
      contactEmail: input.contactEmail ?? null,
    },
    exportSettings: {
      template: "premium" as const,
      language: (input.language ?? "english") as ProposalSettings["language"],
      branding: "Yachtworth",
      engine: "adaptive" as const,
    },
  };
}

export async function exportListingDocument(input: ListingDocumentInput): Promise<void> {
  const base =
    (input.yachtName || "listing")
      .replace(/[^\w\s-]/g, "")
      .trim()
      .replace(/\s+/g, "_")
      .slice(0, 60) || "listing";
  await downloadDocument(buildListingBody(input), "pdf", `${base}_listing.pdf`);
}

// Charter planner reports

function charterToCalcInput(c: Charter): CharterCalcInput {
  const dist: DistributionEntry[] = Array.isArray(c.distribution)
    ? c.distribution.map((d) => ({
        name: d.name,
        type: d.type,
        value: d.value,
      }))
    : [];
  return {
    start_date: c.start_date,
    end_date: c.end_date,
    charter_rate_type: c.charter_rate_type,
    charter_rate: c.charter_rate ?? 0,
    vat_applicable: c.vat_applicable ?? false,
    vat_percent: c.vat_percent ?? 0,
    apa_enabled: c.apa_enabled ?? false,
    apa_percent: c.apa_percent ?? 0,
    apa_fuel: c.apa_fuel ?? 0,
    apa_provisioning: c.apa_provisioning ?? 0,
    apa_beverages: c.apa_beverages ?? 0,
    apa_marina_fees: c.apa_marina_fees ?? 0,
    apa_communications: c.apa_communications ?? 0,
    apa_crew_gratuities: c.apa_crew_gratuities ?? 0,
    apa_activities: c.apa_activities ?? 0,
    apa_other: c.apa_other ?? 0,
    captain_day_rate: c.captain_day_rate ?? 0,
    first_officer_day_rate: c.first_officer_day_rate ?? 0,
    stewardess_count: c.stewardess_count ?? 0,
    stewardess_day_rate: c.stewardess_day_rate ?? 0,
    chef_included: c.chef_included ?? false,
    chef_day_rate: c.chef_day_rate ?? 0,
    deckhand_count: c.deckhand_count ?? 0,
    deckhand_day_rate: c.deckhand_day_rate ?? 0,
    extra_crew_cost: c.extra_crew_cost ?? 0,
    engine_hours_before: c.engine_hours_before ?? 0,
    engine_hours_after: c.engine_hours_after ?? 0,
    fuel_liters: c.fuel_liters ?? 0,
    fuel_price_per_liter: c.fuel_price_per_liter ?? 0,
    port_fees: c.port_fees ?? 0,
    provisioning: c.provisioning ?? 0,
    cleaning: c.cleaning ?? 0,
    other_expenses: c.other_expenses ?? 0,
    transfer_fee: c.transfer_fee ?? 0,
    transfer_fee_paid_by: c.transfer_fee_paid_by ?? "client",
    extra_service_amount: c.extra_service_amount ?? 0,
    damage_amount: c.damage_amount ?? 0,
    damage_paid_by: c.damage_paid_by ?? "client",
    central_agent_name: c.central_agent_name ?? "Central Agent",
    central_agent_type: (c.central_agent_type ?? DEFAULT_CENTRAL_AGENT_TYPE) as CentralAgentType,
    central_agent_value: c.central_agent_value ?? DEFAULT_CENTRAL_AGENT_VALUE,
    sub_agents: Array.isArray(c.sub_agents)
      ? c.sub_agents.map(
          (s): SubAgent => ({
            name: s.name,
            type: s.type as SubAgentType,
            value: s.value ?? 0,
          }),
        )
      : [],
    distribution: dist,
  };
}

function yachtProfileFromCharterYacht(yacht: Yacht | null | undefined, fallbackName: string) {
  const y = yacht as (Yacht & { type?: string | null; yacht_type?: string | null }) | null | undefined;
  return {
    name: y?.name || [y?.brand, y?.model].filter(Boolean).join(" ") || fallbackName,
    builder: y?.brand ?? null,
    model: y?.model ?? null,
    yacht_type: y?.yacht_type ?? y?.type ?? null,
    year_built: y?.year_built ?? null,
    length_meters: y?.length_meters ?? null,
    cover_photo_url: y?.cover_photo_url ?? y?.photo_url ?? null,
    photo_url: y?.photo_url ?? y?.cover_photo_url ?? null,
    photo_urls: y?.photo_urls ?? null,
  };
}

function fmtIsoDate(s: string | null | undefined): string | null {
  if (!s) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (!m) return s;
  return `${m[3]}/${m[2]}/${m[1]}`;
}

function charterRateLine(c: Charter, days: number): string {
  const rate = Math.round(c.charter_rate ?? 0).toLocaleString("en-US");
  if (c.charter_rate_type === "per_day") return `EUR ${rate} / day x ${days} days`;
  if (c.charter_rate_type === "per_week") return `EUR ${rate} / week x ${(days / 7).toFixed(1)} weeks`;
  return `Fixed price EUR ${rate}`;
}

function charterReportBody(charter: Charter, yacht: Yacht | null) {
  const p = calcCharter(charterToCalcInput(charter));
  const crew = [
    p.captain_total > 0 ? { label: "Captain", amount_eur: p.captain_total } : null,
    p.first_officer_total > 0 ? { label: "First officer", amount_eur: p.first_officer_total } : null,
    p.stewardess_total > 0 ? { label: "Stewardess", amount_eur: p.stewardess_total } : null,
    p.chef_total > 0 ? { label: "Chef", amount_eur: p.chef_total } : null,
    p.deckhand_total > 0 ? { label: "Deckhand", amount_eur: p.deckhand_total } : null,
    (charter.extra_crew_cost ?? 0) > 0 ? { label: "Extra crew", amount_eur: charter.extra_crew_cost ?? 0 } : null,
  ].filter(Boolean);
  const apaItems = [
    { label: "Fuel", amount_eur: charter.apa_fuel ?? 0 },
    { label: "Provisioning / Food", amount_eur: charter.apa_provisioning ?? 0 },
    { label: "Beverages / Alcohol", amount_eur: charter.apa_beverages ?? 0 },
    { label: "Marina / Port fees", amount_eur: charter.apa_marina_fees ?? 0 },
    { label: "Communications", amount_eur: charter.apa_communications ?? 0 },
    { label: "Crew gratuities", amount_eur: charter.apa_crew_gratuities ?? 0 },
    { label: "Activities", amount_eur: charter.apa_activities ?? 0 },
    { label: "Other", amount_eur: charter.apa_other ?? 0 },
  ].filter((item) => item.amount_eur > 0);
  const distribution = [
    { label: "Boat Owner", amount_eur: p.boat_owner_receives },
    p.central_agent_amount > 0
      ? { label: charter.central_agent_name || "Central Agent", amount_eur: p.central_agent_amount }
      : null,
    ...p.sub_agent_results.map((item) => ({ label: item.name, amount_eur: item.amount })),
    ...p.distribution_results.map((item) => ({ label: item.name, amount_eur: item.amount })),
  ].filter(Boolean);
  const ports = [charter.departure_port, charter.return_port].filter(Boolean).join(" -> ") || charter.mooring_port || null;
  const times = [charter.departure_time, charter.return_time].filter(Boolean).join(" - ") || null;

  return {
    documentType: "charter_report" as const,
    format: "pdf" as const,
    template: "premium" as const,
    yachtProfile: yachtProfileFromCharterYacht(yacht, "Charter Trip Report"),
    reportData: {
      startDate: fmtIsoDate(charter.start_date),
      endDate: fmtIsoDate(charter.end_date),
      days: p.days,
      status: charter.status,
      clientName: charter.client_name ?? null,
      clientEmail: charter.client_email ?? null,
      clientPhone: charter.client_phone ?? null,
      ports,
      times,
      contractStatus: charter.contract_status ?? null,
      baseNetEur: p.base_net,
      vatAmountEur: p.vat_amount,
      totalToClientEur: p.total_to_client,
      apaAmountEur: p.apa_amount,
      apaSpentEur: p.apa_spent,
      apaBalanceEur: p.apa_balance,
      totalInvoiceEur: p.total_invoice_to_client,
      netProfitEur: p.net_profit,
      marginPct: p.margin,
      ownerReceivesEur: p.boat_owner_receives,
      crewTotalEur: p.total_crew,
      fuelCostEur: p.fuel_cost,
      distributionBalanced: p.distribution_balanced,
      rateLine: charterRateLine(charter, p.days),
      crew,
      apaItems,
      distribution,
      notes: charter.notes ?? null,
    },
    exportSettings: {
      template: "premium" as const,
      language: "english" as const,
      branding: "Yachtworth",
      engine: "adaptive" as const,
      confidential: true,
    },
  };
}

export async function exportCharterDocument(charter: Charter, yacht: Yacht | null): Promise<void> {
  const profile = yachtProfileFromCharterYacht(yacht, "charter");
  const base =
    (profile.name || "charter")
      .replace(/[^\w\s-]/g, "")
      .trim()
      .replace(/\s+/g, "_")
      .slice(0, 60) || "charter";
  await downloadDocument(charterReportBody(charter, yacht), "pdf", `${base}_charter.pdf`);
}

function monthLabel(d: Date): string {
  return d.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
}

export async function exportFleetDocument(input: {
  monthStart: Date;
  yachts: Yacht[];
  charters: Charter[];
}): Promise<void> {
  const yachtById = new Map(input.yachts.map((y) => [y.id, y]));
  const rows = input.charters.map((charter) => {
    const yacht = yachtById.get(charter.yacht_id ?? "");
    const p = calcCharter(charterToCalcInput(charter));
    return {
      yacht: yachtProfileFromCharterYacht(yacht, "Yacht").name,
      client: charter.client_name ?? null,
      range: [fmtIsoDate(charter.start_date), fmtIsoDate(charter.end_date)].filter(Boolean).join(" - "),
      status: charter.status ?? null,
      port: [charter.departure_port, charter.return_port].filter(Boolean).join(" -> ") || charter.mooring_port || null,
      value_eur: p.total_invoice_to_client,
    };
  });
  const totalValueEur = rows.reduce((sum, row) => sum + (row.value_eur ?? 0), 0);
  const label = monthLabel(input.monthStart);
  await downloadDocument(
    {
      documentType: "fleet_charter_report" as const,
      format: "pdf" as const,
      template: "premium" as const,
      yachtProfile: { name: "Fleet Charter Planner" },
      reportData: {
        monthLabel: label,
        totalCharters: rows.length,
        totalValueEur,
        rows,
      },
      exportSettings: {
        template: "premium" as const,
        language: "english" as const,
        branding: "Yachtworth",
        engine: "adaptive" as const,
        confidential: true,
      },
    },
    "pdf",
    `${label.replace(/[^\w\s-]/g, "").replace(/\s+/g, "_")}_fleet_charter.pdf`,
  );
}

// Survey report

export type SurveyDocumentInput = {
  report: {
    vessel_name: string;
    vessel_type?: string | null;
    manufacturer?: string | null;
    model?: string | null;
    year_built?: number | null;
    flag?: string | null;
    hin?: string | null;
    lying?: string | null;
    survey_date?: string | null;
    survey_purpose?: string | null;
    weather_conditions?: string | null;
    sea_state?: string | null;
    client_name?: string | null;
    client_email?: string | null;
    client_phone?: string | null;
    surveyor_name?: string | null;
    surveyor_qualification?: string | null;
    surveyor_company?: string | null;
    surveyor_phone?: string | null;
    surveyor_email?: string | null;
    surveyor_signature_url?: string | null;
  };
  items: Array<{
    section_number?: number | null;
    section_name?: string | null;
    item_number?: string | null;
    description?: string | null;
    condition?: string | null;
    notes?: string | null;
    recommendation_level?: string | null;
    recommendation_text?: string | null;
    photo_urls?: string[] | null;
    moisture_reading?: number | null;
    moisture_level?: string | null;
    sort_order?: number | null;
  }>;
  seaTrial?: unknown | null;
};

function buildSurveyBody(input: SurveyDocumentInput) {
  const r = input.report;
  return {
    documentType: "survey_report" as const,
    format: "pdf" as const,
    template: "premium" as const,
    yachtProfile: {
      name: r.vessel_name || "Survey Report",
      builder: r.manufacturer ?? null,
      model: r.model ?? null,
      yacht_type: r.vessel_type ?? null,
      year_built: r.year_built ?? null,
      flag: r.flag ?? null,
      hull_id: r.hin ?? null,
    },
    reportData: {
      vesselType: r.vessel_type ?? null,
      manufacturer: r.manufacturer ?? null,
      model: r.model ?? null,
      yearBuilt: r.year_built ?? null,
      flag: r.flag ?? null,
      hin: r.hin ?? null,
      lying: r.lying ?? null,
      surveyDate: r.survey_date ?? null,
      surveyPurpose: r.survey_purpose ?? null,
      weatherConditions: r.weather_conditions ?? null,
      seaState: r.sea_state ?? null,
      clientName: r.client_name ?? null,
      clientEmail: r.client_email ?? null,
      clientPhone: r.client_phone ?? null,
      surveyorName: r.surveyor_name ?? null,
      surveyorQualification: r.surveyor_qualification ?? null,
      surveyorCompany: r.surveyor_company ?? null,
      surveyorPhone: r.surveyor_phone ?? null,
      surveyorEmail: r.surveyor_email ?? null,
      surveyorSignatureUrl: r.surveyor_signature_url ?? null,
      items: input.items,
      seaTrial: input.seaTrial ?? null,
    },
    exportSettings: {
      template: "premium" as const,
      language: "english" as const,
      branding: "Yachtworth",
      engine: "adaptive" as const,
      confidential: true,
    },
  };
}

export async function exportSurveyDocument(input: SurveyDocumentInput): Promise<void> {
  const base =
    (input.report.vessel_name || "survey")
      .replace(/[^\w\s-]/g, "")
      .trim()
      .replace(/\s+/g, "_")
      .slice(0, 60) || "survey";
  await downloadDocument(buildSurveyBody(input), "pdf", `${base}_survey.pdf`);
}
