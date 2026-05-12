import type { Logger } from "pino";
import { conditionMultiplierFor } from "./condition";
import { computeCompleteness } from "./completeness";
import {
  aiChat,
  aiResponses,
  cleanReasoning,
  extractJson,
} from "./openai";
import { parsePriceEur, sanityCheckPrice } from "./sanity";

export type ValuationMode = "builder" | "specs";
export type SaleRegion =
  | "mediterranean"
  | "northern_europe"
  | "north_america_caribbean"
  | "asia_pacific_me"
  | "global";
export type VatStatus = "paid" | "not_paid";
export type EngineConfig =
  | "single_diesel"
  | "twin_diesel"
  | "triple_diesel"
  | "quad_diesel"
  | "ips_drives"
  | "sail_auxiliary"
  | "electric_hybrid"
  | "waterjet";

export interface ValuationRequest {
  mode: ValuationMode;
  bypass_required: boolean;
  type: string;
  configuration?: string | null;
  builder?: string | null;
  model?: string | null;
  year_built: number;
  refit_year?: number | null;
  condition?: string | null;
  sale_region: SaleRegion;
  vat_status?: VatStatus | null;
  length_meters: number;
  beam_meters?: number | null;
  draft_meters?: number | null;
  hull_material?: string | null;
  displacement_tonnes?: number | null;
  gross_tonnage?: number | null;
  engine_maker?: string | null;
  engine_model?: string | null;
  engine_config?: EngineConfig | null;
  engine_count?: number | null;
  horse_power?: number | null;
  range_nm?: number | null;
  cabins?: number | null;
  heads?: number | null;
  berths?: number | null;
  crew?: number | null;
}

export interface ComparableItem {
  builder?: string | null;
  model?: string | null;
  year?: number | null;
  length?: string | null;
  condition?: string | null;
  price: string;
  note?: string | null;
}

export interface ValuationResult {
  estimated_price_eur: number;
  distressed_price_eur: number;
  quick_sale_price_eur: number;
  range_low_eur: number;
  range_high_eur: number;
  confidence: "high" | "medium" | "low";
  reasoning: string;
  comparables: ComparableItem[];
  condition_baseline_eur: number;
  condition_multiplier: number;
  condition_adjustment_pct: number;
  condition_label: string | null;
  completeness_score: number;
  completeness_filled: number;
  completeness_total: number;
  completeness_missing_critical: string[];
  sanity_adjusted: boolean;
  sanity_band_label: string | null;
  sanity_per_meter_eur: number | null;
  sale_region_label: string;
  vat_status: VatStatus | null;
  currency: "EUR";
}

const TYPE_LABELS: Record<string, string> = {
  motor_yacht: "Motor Yacht",
  sailing_yacht: "Sailing Yacht",
  catamaran: "Catamaran",
  superyacht: "Superyacht",
};

const ENGINE_CONFIG_LABELS: Record<EngineConfig, string> = {
  single_diesel: "Single diesel",
  twin_diesel: "Twin diesel",
  triple_diesel: "Triple diesel",
  quad_diesel: "Quad diesel",
  ips_drives: "IPS drives",
  sail_auxiliary: "Sail (auxiliary)",
  electric_hybrid: "Electric / Hybrid",
  waterjet: "Waterjet",
};

export const SALE_REGION_LABELS: Record<SaleRegion, string> = {
  mediterranean: "Mediterranean (FR · IT · ES · MC · GR · HR · TR · MT)",
  northern_europe:
    "Northern Europe incl. UK (UK · NL · DE · DK · NO · SE · FI · BE)",
  north_america_caribbean:
    "North America & Caribbean (US · CA · BS · KY · BVI · USVI)",
  asia_pacific_me:
    "Asia-Pacific & Middle East (AE · SG · HK · TH · AU · NZ · JP · CN)",
  global: "Global — no regional restriction",
};

const REGION_GUIDANCE: Record<SaleRegion, string> = {
  mediterranean:
    "Restrict comparables to FR/IT/ES/MC/GR/HR/TR/MT brokerage listings. Med asking prices typically run 5–15% above US for equivalent tonnage.",
  northern_europe:
    "Restrict to UK/NL/DE/DK/NO/SE/FI/BE listings. Sunseeker, Princess, Burgess, Camper & Nicholsons, De Valk are primary references.",
  north_america_caribbean:
    "Restrict to US/CA/BS/KY/BVI/USVI/ATG listings. USD pricing expected — convert to EUR at current spot rate.",
  asia_pacific_me:
    "Restrict to AE/SA/QA/SG/HK/TH/AU/NZ/JP/CN listings. Volume is thin — if fewer than 5 strong comparables found, you may include up to 2 Mediterranean comparables and drop confidence to low.",
  global:
    "No regional restriction — note in reasoning which markets the comparables came from.",
};

function specsBlock(b: ValuationRequest): string {
  const parts: unknown[] = [
    `Type: ${TYPE_LABELS[b.type] ?? b.type}`,
    b.configuration && `Configuration: ${b.configuration}`,
    b.builder && `Builder: ${b.builder}`,
    b.model && `Model: ${b.model}`,
    `Build year: ${b.year_built}`,
    b.refit_year && `Last refit: ${b.refit_year}`,
    `Condition: ${b.condition ?? "(unknown — treat as Excellent)"}`,
    `Length (LOA): ${b.length_meters} m`,
    b.beam_meters && `Beam: ${b.beam_meters} m`,
    b.draft_meters && `Draft: ${b.draft_meters} m`,
    b.hull_material && `Hull material: ${b.hull_material}`,
    b.displacement_tonnes && `Displacement: ${b.displacement_tonnes} t`,
    b.gross_tonnage && `Gross tonnage: ${b.gross_tonnage} GT`,
    b.engine_maker && `Engine maker: ${b.engine_maker}`,
    b.engine_model && `Engine model: ${b.engine_model}`,
    b.engine_config &&
      `Engine configuration: ${ENGINE_CONFIG_LABELS[b.engine_config]}`,
    b.engine_count && `Engine count: ${b.engine_count}`,
    b.horse_power && `Total horsepower: ${b.horse_power} HP`,
    b.range_nm && `Range: ${b.range_nm} nm`,
    b.cabins != null && `Guest cabins: ${b.cabins}`,
    b.heads != null && `Heads: ${b.heads}`,
    b.berths != null && `Berths: ${b.berths}`,
    b.crew != null && `Crew: ${b.crew}`,
  ];
  return parts.filter(Boolean).join("\n");
}

function buildPrompt(b: ValuationRequest, completenessScore: number): string {
  const specs = specsBlock(b);
  const yearMin = b.year_built - 3;
  const yearMax = b.year_built + 3;
  const regionGuidance = REGION_GUIDANCE[b.sale_region];
  const vatLine =
    b.vat_status === "paid"
      ? "Tax status: EU VAT-paid (free circulation). Compare only against tax-paid listings where region applies."
      : b.vat_status === "not_paid"
        ? "Tax status: tax not paid / offshore. Compare against not-paid listings — these are a structurally different market."
        : null;

  return `You are a professional superyacht market appraiser with access to live yacht listing databases. Find REAL, currently listed or recently sold yachts that closely match the target vessel and use them to determine its fair market value. Use web search iteratively — refine queries as you learn more about this vessel's segment, and verify data on actual listing pages before using it.

TARGET VESSEL SPECIFICATIONS:
${specs}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SALE REGION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${regionGuidance}
${vatLine ?? ""}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DATA COMPLETENESS: ${completenessScore}%
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Calibrate your confidence honestly:
- < 30% → confidence MUST be "low"
- 30–49% → confidence at most "medium"
- 50–69% → confidence "medium"; "high" only if comparables cluster tightly
- ≥ 70% → "high" acceptable when comparables agree

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SEARCH INSTRUCTIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Search YachtWorld, Boat Trader, RightBoat, Boat24, Apollo Duck, broker websites (Fraser, Burgess, Camper & Nicholsons, Edmiston, De Valk).
Find 5 comparables matching: same type, year ${yearMin}–${yearMax}, length ±15%${b.builder ? `, builder priority: ${b.builder}` : ""}.

⚠ CRITICAL — DO NOT FACTOR CONDITION INTO YOUR PRICE:
The "Condition" field is informational only. The downstream system applies a separate, deterministic multiplier off your number. Therefore: PRICE THE TARGET AS IF IT WERE IN "EXCELLENT" CONDITION regardless of what the Condition field says. Do not discount or premium-adjust your number for condition. Do not mention a condition adjustment for the target in your reasoning.

The downstream system applies separate discounts to derive Discreet Sale (≈ −20%) and Quick Sale (≈ −30%) tiers, so your number is just the open-market Excellent-condition headline.

Return ONLY this JSON (no markdown, no text before or after):
{
  "estimated_price": "€ X,XXX,XXX",
  "confidence": "high|medium|low",
  "reasoning": "2 sentences citing the comparable listings found and explaining how the target's specs compare to them — but DO NOT mention condition adjustment for the target.",
  "comparables": [
    {
      "builder": "Exact builder",
      "model": "Exact model/series",
      "year": 2018,
      "length": "28.5m",
      "condition": "Good",
      "price": "€ 2,850,000",
      "note": "Specific spec differences vs target"
    }
  ]
}

RULES:
- Comparables array MUST contain EXACTLY 5 entries from real listings in the specified region
- DO NOT include vessel/owner names, flag, brokerage names
- "builder" must contain ONLY the shipyard name
- DO NOT invent pricing — every price comes from a real listing or confirmed sale`;
}

export async function runValuation(
  b: ValuationRequest,
  log: Logger,
): Promise<ValuationResult> {
  const completeness = computeCompleteness(
    b as unknown as Record<string, unknown>,
    b.mode,
  );
  const prompt = buildPrompt(b, completeness.score);

  let result: Record<string, unknown>;
  try {
    const raw = await aiResponses(prompt, "gpt-5-mini", [
      { type: "web_search_preview" },
    ]);
    if (!raw) throw new Error("Empty response");
    result = extractJson(raw);
  } catch (primaryErr) {
    log.warn(
      { err: primaryErr instanceof Error ? primaryErr.message : primaryErr },
      "Responses API failed, falling back to chat completions",
    );
    const fallback = await aiChat([
      {
        role: "system",
        content:
          "You are an expert superyacht market appraiser. Reply ONLY with valid JSON, no markdown.",
      },
      { role: "user", content: prompt },
    ]);
    result = extractJson(fallback);
  }

  const reasoning = cleanReasoning(result.reasoning);
  const rawComparables = Array.isArray(result.comparables)
    ? (result.comparables as Record<string, unknown>[])
    : [];
  const comparables: ComparableItem[] = rawComparables.slice(0, 8).map((c) => ({
    builder: typeof c.builder === "string" ? c.builder : null,
    model: typeof c.model === "string" ? c.model : null,
    year: typeof c.year === "number" ? c.year : null,
    length: typeof c.length === "string" ? c.length : null,
    condition: typeof c.condition === "string" ? c.condition : null,
    price: typeof c.price === "string" ? c.price : "",
    note: typeof c.note === "string" ? cleanReasoning(c.note) : null,
  }));

  // Sanity check + clamp
  let aiPriceEur = parsePriceEur(result.estimated_price);
  let sanityAdjusted = false;
  let sanityBandLabel: string | null = null;
  let sanityPerMeter: number | null = null;
  let confidence: "high" | "medium" | "low" =
    (result.confidence as "high" | "medium" | "low" | undefined) ?? "low";
  if (!["high", "medium", "low"].includes(confidence)) confidence = "low";

  if (aiPriceEur) {
    const check = sanityCheckPrice(
      aiPriceEur,
      b.length_meters,
      b.type,
      b.configuration ?? null,
    );
    sanityBandLabel = check.rangeKey;
    sanityPerMeter = Math.round(check.clampedEur / b.length_meters);
    if (!check.ok) {
      sanityAdjusted = true;
      aiPriceEur = check.clampedEur;
      confidence = "low";
    }
  } else {
    // AI returned unparseable price — fall back to the band midpoint for this
    // type+configuration. Band selection is by type/configuration, not by the
    // input price, so any positive number triggers the right band.
    const check = sanityCheckPrice(
      1,
      b.length_meters,
      b.type,
      b.configuration ?? null,
    );
    const midPerMeter = (check.range[0] + check.range[1]) / 2;
    aiPriceEur = midPerMeter * b.length_meters;
    sanityAdjusted = true;
    sanityBandLabel = check.rangeKey;
    sanityPerMeter = Math.round(midPerMeter);
    confidence = "low";
  }

  // Confidence floor based on completeness
  const rank = { low: 0, medium: 1, high: 2 } as const;
  const cap = (max: "low" | "medium" | "high") => {
    if (rank[confidence] > rank[max]) confidence = max;
  };
  if (completeness.score < 30) cap("low");
  else if (completeness.score < 70) cap("medium");

  // Bypass also caps confidence at medium per spec
  if (b.bypass_required) cap("medium");

  // Condition multiplier (deterministic, server-authoritative).
  // When condition is missing (typical bypass), use Excellent (1.00).
  const conditionMultiplier = conditionMultiplierFor(b.condition ?? null);
  const conditionAdjustmentPct = Math.round((conditionMultiplier - 1) * 100);
  const baselineEur = Math.round(aiPriceEur);
  const adjustedEur = aiPriceEur * conditionMultiplier;

  return {
    estimated_price_eur: Math.round(adjustedEur),
    distressed_price_eur: Math.round(adjustedEur * 0.8),
    quick_sale_price_eur: Math.round(adjustedEur * 0.7),
    range_low_eur: Math.round(adjustedEur * 0.9),
    range_high_eur: Math.round(adjustedEur * 1.1),
    confidence,
    reasoning,
    comparables,
    condition_baseline_eur: baselineEur,
    condition_multiplier: conditionMultiplier,
    condition_adjustment_pct: conditionAdjustmentPct,
    condition_label: b.condition ?? null,
    completeness_score: completeness.score,
    completeness_filled: completeness.filled,
    completeness_total: completeness.total,
    completeness_missing_critical: completeness.missing_critical,
    sanity_adjusted: sanityAdjusted,
    sanity_band_label: sanityBandLabel,
    sanity_per_meter_eur: sanityPerMeter,
    sale_region_label: SALE_REGION_LABELS[b.sale_region],
    vat_status: b.vat_status ?? null,
    currency: "EUR",
  };
}
