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
  source_url?: string | null;
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
  legal_disclaimer: string;
  id?: string | null;
}

interface EvidenceQuality {
  total: number;
  withPrice: number;
  withSource: number;
  unique: number;
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
  const isBuilder = b.mode === "builder";
  const parts: unknown[] = [
    `Yacht type: ${TYPE_LABELS[b.type] ?? b.type}`,
    b.configuration && `Configuration / style: ${b.configuration}`,
    isBuilder && b.builder ? `Builder: ${b.builder}` : null,
    isBuilder && b.model ? `Model: ${b.model}` : null,
    `Build year: ${b.year_built}`,
    b.refit_year && `Refit year: ${b.refit_year}`,
    b.condition && `Condition: ${b.condition}`,
    `Length (LOA): ${b.length_meters} m`,
    b.beam_meters && `Beam: ${b.beam_meters} m`,
    b.draft_meters && `Draft: ${b.draft_meters} m`,
    b.displacement_tonnes && `Displacement: ${b.displacement_tonnes} tonnes`,
    b.gross_tonnage && `Gross tonnage: ${b.gross_tonnage} GT`,
    b.hull_material && `Hull material: ${b.hull_material}`,
    b.engine_config &&
      `Engine configuration: ${ENGINE_CONFIG_LABELS[b.engine_config]}`,
    b.engine_count != null && `Number of engines: ${b.engine_count}`,
    b.engine_maker && `Engine manufacturer: ${b.engine_maker}`,
    b.engine_model && `Engine model/series: ${b.engine_model}`,
    b.horse_power && `Total horsepower: ${b.horse_power} HP`,
    b.range_nm && `Range: ${b.range_nm} nm`,
    b.cabins != null && `Guest cabins: ${b.cabins}`,
    b.heads != null && `Heads (WC): ${b.heads}`,
    b.berths != null && `Total berths: ${b.berths}`,
    b.crew != null && `Crew capacity: ${b.crew}`,
    `Intended sale region: ${SALE_REGION_LABELS[b.sale_region]}`,
    b.vat_status &&
      `VAT / Tax status: ${b.vat_status === "paid" ? "VAT PAID (EU free circulation)" : "VAT NOT PAID (offshore / not in EU free circulation)"}`,
  ];
  return parts.filter(Boolean).join("\n");
}

function regionBlock(b: ValuationRequest): string {
  const label = SALE_REGION_LABELS[b.sale_region];
  const guidance = REGION_GUIDANCE[b.sale_region];
  return `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
REGIONAL COHORT FILTER — ${label.toUpperCase()}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
The user is valuing this vessel for sale in: ${label}.
${guidance}
This is NOT advisory — it is a HARD FILTER on which listings you may use as comparables. A vessel located in Florida is NOT a comparable for a Mediterranean valuation, even if its specs match perfectly. Search with region-specific queries (e.g. "[builder] [model] for sale Monaco|France|Italy|Spain" for Mediterranean; "[builder] [model] for sale Florida|California|Newport" for North America). In your reasoning, explicitly state the regional market your final price reflects.`;
}

function vatBlock(b: ValuationRequest): string {
  if (!b.vat_status) return "";
  const isPaid = b.vat_status === "paid";
  const label = isPaid ? "VAT PAID" : "VAT NOT PAID";
  const targetDescription = isPaid
    ? "VAT PAID — i.e. it has cleared EU import VAT and trades in free circulation inside the EU customs union"
    : "NOT VAT PAID — i.e. it is offshore-flagged or otherwise not in EU free circulation, so an EU buyer would owe import VAT (typically ~17–22% depending on jurisdiction) on top of the asking price";
  const cohortRule = isPaid
    ? "USE ONLY listings explicitly tagged 'VAT paid' / 'EU VAT paid'. Listings with no VAT info or tagged 'VAT not paid' must NOT be used as comparables — their asking prices reflect a structurally different market and would distort the estimate."
    : "USE ONLY listings explicitly tagged 'VAT not paid' / 'offshore' / 'ex-VAT'. Listings tagged 'VAT paid' must NOT be used — their asking prices already include the ~20% VAT and would inflate your estimate.";
  return `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
VAT / TAX STATUS COHORT FILTER — ${label}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
The target vessel is ${targetDescription}.
These are STRUCTURALLY DIFFERENT markets — not a percentage discount. Match comparables to the target's VAT status:
- Listings on EU brokerages (yachtworld.it, yachtall.com, de Valk NL, Berthon UK, Camper & Nicholsons EU) almost always state "VAT paid" or "VAT not paid" in the spec sheet — read it.
- Common indicators of VAT NOT PAID: vessel currently in non-EU waters (Caribbean, US, Turkey non-EU territory, UAE, Singapore), flagged Cayman / Marshall Islands / BVI / Jersey / Isle of Man with no "EU VAT paid" line.
- Common indicators of VAT PAID: vessel currently in EU waters with EU flag (FR, IT, ES, NL, DE, MT) AND listing explicitly states "VAT paid" or "EU VAT paid".
When selecting comparables, ${cohortRule}
This is a HARD COHORT FILTER, not a percentage adjustment. Do NOT take an opposite-VAT-status listing and "adjust it" by ±VAT — those are different markets with different liquidity, different buyer pools, and different ask-to-sale spreads.
If after 2 search refinements you cannot find at least 3 same-VAT-status comparables, you must:
  1. Set overall confidence to "low",
  2. State explicitly in the "reasoning" field that the cohort was thin, and
  3. Use whatever same-VAT-status comparables you did find — do NOT pad the cohort with opposite-VAT-status listings.
Mention the VAT status of your cohort explicitly in the "reasoning" field.`;
}

function completenessBlock(score: number, filled: number, total: number): string {
  return `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DATA COMPLETENESS: ${score}% (${filled}/${total} fields)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
The user filled ${filled} of ${total} possible specification fields (${score}% completeness).
Use this to calibrate your confidence honestly:
- < 30% → confidence MUST be "low" and reasoning MUST acknowledge the data is too thin for a precise estimate
- 30–49% → confidence at most "medium"; reasoning should mention which specs are missing
- 50–69% → confidence "medium"; "high" is acceptable only if comparable listings cluster tightly
- ≥ 70% → "high" is acceptable when comparables agree
ALWAYS mention completeness explicitly in your reasoning, e.g. "Based on ${score}% data completeness…".`;
}

function modeNote(mode: ValuationMode): string {
  return mode === "builder"
    ? "Factor in this builder's specific brand premium and reputation in the current market."
    : "Assess purely on technical specifications — do not infer or assume any brand.";
}

function cleanSourceUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const raw = value.trim();
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
}

function comparableKey(c: ComparableItem): string {
  return [
    c.source_url ? c.source_url.toLowerCase() : "",
    (c.builder ?? "").trim().toLowerCase(),
    (c.model ?? "").trim().toLowerCase(),
    c.year != null ? String(c.year) : "",
    (c.length ?? "").trim().toLowerCase(),
    c.price.trim().toLowerCase(),
  ].join("|");
}

function dedupeComparables(items: ComparableItem[]): ComparableItem[] {
  const seen = new Set<string>();
  const out: ComparableItem[] = [];
  for (const item of items) {
    const key = comparableKey(item);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

function evidenceQuality(items: ComparableItem[]): EvidenceQuality {
  return {
    total: items.length,
    withPrice: items.filter((c) => parsePriceEur(c.price) != null).length,
    withSource: items.filter((c) => Boolean(c.source_url)).length,
    unique: dedupeComparables(items).length,
  };
}

function formatMoney(n: number): string {
  return `€${Math.round(n).toLocaleString("en-US")}`;
}

function buildSystemReasoning(args: {
  b: ValuationRequest;
  finalEur: number;
  baselineEur: number;
  confidence: "high" | "medium" | "low";
  completeness: { score: number; filled: number; total: number };
  quality: EvidenceQuality;
  conditionAdjustmentPct: number;
  sanityAdjusted: boolean;
  sanityBandLabel: string | null;
  usedFallback: boolean;
}): string {
  const subject = [
    args.b.builder,
    args.b.model,
    args.b.year_built ? String(args.b.year_built) : null,
    `${args.b.length_meters}m`,
  ]
    .filter(Boolean)
    .join(" ");
  const evidence =
    args.quality.total > 0
      ? `${args.quality.withSource}/${args.quality.total} comparable listings include source URLs and ${args.quality.withPrice}/${args.quality.total} have parseable EUR asking prices`
      : "no usable comparable listings were returned";
  const notes: string[] = [];
  if (args.conditionAdjustmentPct !== 0) {
    notes.push(
      `the system applied a ${args.conditionAdjustmentPct > 0 ? "+" : ""}${args.conditionAdjustmentPct}% condition adjustment from the Excellent-condition baseline ${formatMoney(args.baselineEur)}`,
    );
  }
  if (args.sanityAdjusted) {
    notes.push(
      `the estimate was constrained to the market sanity band${args.sanityBandLabel ? ` (${args.sanityBandLabel})` : ""}`,
    );
  }
  if (args.usedFallback) notes.push("live web search was unavailable, so confidence is capped low");
  if (args.quality.withSource < 3) notes.push("source coverage is thin, so confidence is capped");
  const second =
    notes.length > 0
      ? `${notes.join("; ")}.`
      : "No additional system adjustment was required beyond the comparable-based open-market estimate.";
  return `Based on ${args.completeness.score}% data completeness (${args.completeness.filled}/${args.completeness.total} fields), ${subject || "the target yacht"} is estimated at ${formatMoney(args.finalEur)} for an open-market listing equivalent in ${SALE_REGION_LABELS[args.b.sale_region]}; ${evidence}. ${second} Confidence: ${args.confidence}.`;
}

function buildPrompt(
  b: ValuationRequest,
  completenessScore: number,
  completenessFilled: number,
  completenessTotal: number,
): string {
  const specs = specsBlock(b);
  const yearRange = `${b.year_built - 3}–${b.year_built + 3}`;
  const region = regionBlock(b);
  const vat = vatBlock(b);
  const completeness = completenessBlock(
    completenessScore,
    completenessFilled,
    completenessTotal,
  );
  const note = modeNote(b.mode);

  return `You are a professional yacht market analyst with access to live yacht listing databases. Your task is to find REAL, CURRENTLY LISTED OR RECENTLY SOLD yachts that closely match the target vessel, and use them to produce an INDICATIVE MARKET ESTIMATE. This is NOT a certified appraisal or valuation. Use web search iteratively — refine your queries as you learn more about this vessel's segment, and verify data on actual listing pages before using it.

TARGET VESSEL SPECIFICATIONS:
${specs}
${completeness}${region}${vat}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 1 — SEARCH INSTRUCTIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Perform multiple targeted web searches on the following platforms. Search each one:
- YachtWorld (yachtworld.com)
- Boat Trader / boats.com
- RightBoat (rightboat.com)
- Boat24 (boat24.com)
- YachtBroker (yachtbroker.com)
- Apollo Duck (apolloduck.com)
- YachtCharterFleet / YachtSales
Use search queries like:
- "[builder] [model] for sale [year]" — this is the STRONGEST query when both are known
- "[builder] [model] [configuration] for sale" (e.g. "Sunseeker Manhattan flybridge for sale")
- "[type] [configuration] for sale [year range] [length]" (e.g. "motor yacht flybridge 22m 2018")
- "[length]m [type] [year] for sale EUR"
- "[engine maker] [engine model] yacht for sale"
CRITICAL: when builder + model are provided, those define the vessel uniquely. A "Sunseeker Predator 60" and a "Sunseeker Manhattan 60" are different products with different prices (Sport vs Flybridge). Configuration / style (Flybridge / Open / Coupé / Sloop / etc.) is similarly price-defining — never substitute one configuration for another in your comparables.
If your initial searches don't return strong matches, refine your queries (try different builders in the same tier, adjust length range, switch language, search broker websites directly).

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 2 — STRICT MATCHING CRITERIA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Only include a vessel as a comparable if it meets ALL of these criteria:
✓ Same vessel type (or closely related category)
✓ Build year within ${yearRange} (±3 years maximum)
✓ Length within ±15% of the target vessel's length
✓ Similar engine configuration, power range, or fuel type (if specified)
✓ Similar accommodation layout (cabins ±1–2) — if specified
✓ Price is confirmed: listed asking price OR confirmed recent sale price
✗ DO NOT include vessels that don't match on year AND length simultaneously
✗ DO NOT fabricate or estimate vessel data — only use what you actually found on the listing page

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 3 — VISIT LISTING PAGES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
For each candidate you find in search results, visit the actual listing page to verify:
- Exact year, length, engine specs and condition
- Confirmed asking price (or sold price)
- Any recent refit or known issues that affect value
If a listing page's specs don't match the target criteria strictly, discard it and search for another.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 4 — MARKET ESTIMATE & OUTPUT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${note}
Based on the 5 verified comparable listings, produce an indicative market estimate for the target vessel. Use the words "estimate" / "market estimate" / "price indication" — NEVER use "valuation", "appraisal", or "fair market value" in your reasoning text.

⚠ CRITICAL — OPEN MARKET LISTING EQUIVALENT:
Your "estimated_price" represents the OPEN-MARKET LISTING EQUIVALENT — i.e. the price this vessel would be listed at on YachtWorld / RightBoat / TheYachtMarket today, alongside the comparables you found. This is the ASKING-price equivalent, NOT the discounted sold price. Do NOT subtract a generic asking→sold haircut. Compute it as a weighted average of the comparable asking prices, biased toward the closest matches (same builder/model = highest weight, then same year, then same length/engine layout). Adjust up or down for the target vessel's specific spec advantages or disadvantages vs the cohort (newer/older, more/fewer engines, refit history, hull material, etc.).

⚠ CRITICAL — DO NOT FACTOR CONDITION INTO YOUR PRICE:
The "Condition" field (New / Excellent / Good / Fair / Needs Refit / Project) in the target specs is informational ONLY. The downstream system applies a separate, deterministic multiplier off your number to handle condition. Therefore: PRICE THE TARGET AS IF IT WERE IN "EXCELLENT" CONDITION regardless of what the Condition field says. Do not discount or premium-adjust your number for condition. Do not mention a condition adjustment in your "reasoning" — it will be added by the system. (You may still mention condition of the comparables, e.g. "comp #2 was a Fair-condition listing at €X, so I weighted it lower" — that is comp normalisation, not target adjustment.)

The downstream system applies separate, well-documented discounts off this number to derive Discreet Sale (≈ −20%) and Quick Sale (≈ −30%) tiers, so your job is just the open-market Excellent-condition headline.
The price must reflect actual market evidence — not a theoretical estimate.

For each comparable, include "source_url" with the direct listing page URL used to verify specs and asking price. Missing source_url lowers confidence.

Return ONLY this JSON (absolutely no markdown, no text before or after):
{
  "estimated_price": "€ X,XXX,XXX",
  "confidence": "high|medium|low",
  "reasoning": "2 sentences max: cite the comparable listings found, explain how the target vessel's specs compare to them — but DO NOT mention condition adjustment for the target (system handles that) — and justify the final Excellent-baseline price.",
  "comparables": [
    {
      "builder": "Exact builder name from listing",
      "model": "Exact model/series from listing",
      "year": 2018,
      "length": "28.5m",
      "condition": "Good",
      "price": "€ 2,850,000",
      "note": "Specific spec differences vs target vessel — e.g. twin MTU 1800HP, recent 2022 refit, 5 cabins"
    }
  ]
}
RULES:
- The comparables array must have EXACTLY 5 entries from real listings you visited
- If you cannot find 5 real matches within the strict criteria, widen year range by ±1 year and search again
- Set confidence to "low" if you had to widen search criteria significantly
- All prices (estimated_price and each comparable's price) MUST be returned in canonical EUR format: "€ X,XXX,XXX" (e.g. "€ 5,200,000"). Do NOT use shorthand like "€ 5.2M", "5200K", or currency codes like "EUR 5200000".
- DO NOT include vessel names, owner names, flag, or registration country
- DO NOT include brokerage / broker / listing-agent / dealer names anywhere in the output (not in "builder", not in "model", not in "note", not in "reasoning"). The "builder" field MUST contain ONLY the shipyard name (e.g. "Sunseeker", "Azimut", "Princess") — NEVER prefixes/suffixes like "(listed by …)", "via …", "broker …", or names of platforms (YachtWorld, RightBoat, boats.com, TheYachtMarket, etc.). The "note" may reference geography only at country level (e.g. "US market", "Mediterranean") if relevant.
- DO NOT invent pricing — every price must come from a real listing or confirmed sale`;
}

function buildFallbackPrompt(b: ValuationRequest): string {
  const specs = specsBlock(b);
  const region = regionBlock(b);
  const vat = vatBlock(b);
  const note = modeNote(b.mode);
  return `You are an expert yacht market analyst with deep knowledge of the global brokerage market. Produce an INDICATIVE MARKET ESTIMATE — not a certified appraisal or valuation. Use the words "estimate" / "market estimate" only; never "valuation", "appraisal", or "fair market value" in your reasoning.
TARGET VESSEL:
${specs}
${region}${vat}
${note}
Based on your knowledge of comparable vessels sold or listed on YachtWorld, RightBoat, Boat24 and similar platforms, provide 5 real comparable examples that closely match the target vessel (same type, ±3 years, ±15% length, similar engines if specified).

⚠ CRITICAL — OPEN MARKET LISTING EQUIVALENT:
Your "estimated_price" represents the OPEN-MARKET LISTING EQUIVALENT — i.e. the price this vessel would currently be listed at on YachtWorld / RightBoat / TheYachtMarket alongside the comparables. This is the ASKING-price equivalent, NOT the discounted sold price. Do NOT subtract a generic asking→sold haircut. The downstream system applies separate discounts to derive Discreet Sale (≈ −20%) and Quick Sale (≈ −30%) tiers, so do NOT bake those into your number.

⚠ CRITICAL — DO NOT FACTOR CONDITION INTO YOUR PRICE: price the target as if it were "Excellent" condition; the system applies the condition multiplier separately.

All prices (estimated_price and each comparable's price) MUST be returned in canonical EUR format: "€ X,XXX,XXX" (e.g. "€ 5,200,000"). Do NOT use shorthand like "€ 5.2M", "5200K", or currency codes like "EUR 5200000".
Return ONLY valid JSON, no markdown:
{
  "estimated_price": "€ X,XXX,XXX",
  "confidence": "low",
  "reasoning": "2 sentences max citing comparable vessels and explaining how the target's specs affect its value relative to them.",
  "comparables": [
    {
      "builder": "Builder name",
      "model": "Model/Series",
      "year": 2018,
      "length": "28m",
      "condition": "Good",
      "price": "€ 2,800,000",
      "note": "Key spec differences vs target vessel"
    }
  ]
}
Comparables array must have EXACTLY 5 entries. DO NOT include vessel names, owner names or flag. DO NOT include brokerage / broker / listing-agent / dealer / platform names anywhere — "builder" must contain ONLY the shipyard name (e.g. "Sunseeker"), never "(listed by …)" or similar.`;
}

export async function runValuation(
  b: ValuationRequest,
  log: Logger,
): Promise<ValuationResult> {
  const completeness = computeCompleteness(
    b as unknown as Record<string, unknown>,
    b.mode,
  );
  const prompt = buildPrompt(
    b,
    completeness.score,
    completeness.filled,
    completeness.total,
  );

  let result: Record<string, unknown>;
  let usedFallback = false;
  try {
    const raw = await aiResponses(prompt, "gpt-4o-mini", [
      { type: "web_search_preview" },
    ]);
    if (!raw) throw new Error("Empty response");
    result = extractJson(raw);
  } catch (primaryErr) {
    log.warn(
      { err: primaryErr instanceof Error ? primaryErr.message : primaryErr },
      "Responses API failed, falling back to chat completions",
    );
    usedFallback = true;
    const fallbackPrompt = buildFallbackPrompt(b);
    const fallback = await aiChat([
      {
        role: "system",
        content:
          "You are an expert yacht market analyst producing an indicative market estimate (not a certified appraisal). Reply ONLY with valid JSON, no markdown.",
      },
      { role: "user", content: fallbackPrompt },
    ]);
    result = extractJson(fallback);
  }

  const rawComparables = Array.isArray(result.comparables)
    ? (result.comparables as Record<string, unknown>[])
    : [];
  const comparables: ComparableItem[] = dedupeComparables(
    rawComparables.map((c) => ({
      builder: typeof c.builder === "string" ? c.builder : null,
      model: typeof c.model === "string" ? c.model : null,
      year: typeof c.year === "number" ? c.year : null,
      length: typeof c.length === "string" ? c.length : null,
      condition: typeof c.condition === "string" ? c.condition : null,
      price: typeof c.price === "string" ? c.price : "",
      source_url: cleanSourceUrl(c.source_url ?? c.sourceUrl ?? c.url ?? c.source),
      note: typeof c.note === "string" ? cleanReasoning(c.note) : null,
    })),
  ).slice(0, 5);
  const quality = evidenceQuality(comparables);

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

  // If we had to fall back to chat completions (no web search), the cohort
  // is built from training data only — drop confidence to "low" per spec.
  if (usedFallback) cap("low");

  // Evidence quality gates: high confidence requires source-backed, parseable,
  // non-duplicate comparables. Thin evidence still returns a useful estimate,
  // but the confidence label must tell the truth.
  if (quality.total < 3 || quality.withPrice < 3 || quality.withSource < 2) cap("low");
  else if (quality.withSource < 3 || quality.unique < 3) cap("medium");

  // Condition multiplier (deterministic, server-authoritative).
  // When condition is missing (typical bypass), use Excellent (1.00).
  const conditionMultiplier = conditionMultiplierFor(b.condition ?? null);
  const conditionAdjustmentPct = Math.round((conditionMultiplier - 1) * 100);
  const baselineEur = Math.round(aiPriceEur);
  const adjustedEur = aiPriceEur * conditionMultiplier;
  const adjustedRounded = Math.round(adjustedEur);
  const reasoning = buildSystemReasoning({
    b,
    finalEur: adjustedRounded,
    baselineEur,
    confidence,
    completeness,
    quality,
    conditionAdjustmentPct,
    sanityAdjusted,
    sanityBandLabel,
    usedFallback,
  });

  return {
    estimated_price_eur: adjustedRounded,
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
    legal_disclaimer: LEGAL_DISCLAIMER,
  };
}

export const LEGAL_DISCLAIMER =
  "This is an indicative market estimate for informational purposes only — not a certified appraisal or valuation. Not suitable for financing, insurance, or legal proceedings. For a certified appraisal, consult a licensed marine surveyor. Estimate valid for 30 days.";
