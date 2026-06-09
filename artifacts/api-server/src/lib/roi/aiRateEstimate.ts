import {
  aiChat,
  aiResponses,
  extractJson,
  cleanReasoning,
} from "../valuation/openai";
import type { YachtRow } from "./types";

export type RatePeriod = "day" | "week";
export type CharterType = "crewed" | "bareboat";
export type RateSeason = "high" | "shoulder" | "low";
export type RateRegion =
  | "mediterranean"
  | "caribbean"
  | "northern_europe"
  | "asia_pacific_me"
  | "middle_east";

export interface AiRateEstimateRequest {
  yacht_id: string;
  region: RateRegion;
  season: RateSeason;
  rate_period: RatePeriod;
  charter_type?: CharterType | null;
}

export interface SeasonalRates {
  high: number | null;
  shoulder: number | null;
  low: number | null;
}

export interface AiRateEstimateResult {
  success: true;
  rate: number;
  currency: "EUR";
  period: RatePeriod;
  season: RateSeason;
  region: RateRegion;
  confidence: "high" | "medium" | "low";
  comparables_found: number;
  range_min: number | null;
  range_max: number | null;
  charter_type: CharterType;
  sources: string[];
  explanation: string;
  seasonal_rates: SeasonalRates;
  weekly_equivalent: number | null;
  ai_used: boolean;
}

export interface AiRateEstimateFailure {
  success: false;
  error: string;
}

export type AiRateEstimateResponse =
  | AiRateEstimateResult
  | AiRateEstimateFailure;

const REGION_LABEL: Record<RateRegion, string> = {
  mediterranean: "Mediterranean",
  caribbean: "Caribbean",
  northern_europe: "Northern Europe",
  asia_pacific_me: "Asia-Pacific",
  middle_east: "Middle East",
};

export const CHARTER_RATE_SYSTEM_PROMPT = `You are a professional yacht charter market analyst with deep expertise in Mediterranean, Caribbean, Northern Europe, Asia-Pacific and Middle East charter markets.

Your task: find REAL, CURRENTLY LISTED charter yachts that closely match the target vessel, and use their actual asking rates to determine the market charter rate.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 1 — SEARCH INSTRUCTIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Perform multiple targeted web searches on these platforms:
- yachtcharterfleet.com
- burgessyachts.com
- fraseryachts.com
- eyos.com
- boatbookings.com
- moranyachts.com

Use search queries in this priority order:
1. "[builder] [model] charter [region]" — STRONGEST query when builder+model known (e.g. "Azimut Grande 27M charter Mediterranean")
2. "[builder] charter [region] [length]m" (e.g. "Azimut charter Mediterranean 24m")
3. "[type] [length]m charter [region] [year range]"

CRITICAL: When builder + model are provided, search for that exact model first. "Azimut Grande" and "Azimut Fly" are completely different products with different charter rates. A Filippetti 24m is NOT a comparable for an Azimut Grande 24m — they are different market tiers.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 2 — STRICT MATCHING CRITERIA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Only include a yacht as a comparable if it meets ALL:
✓ Same builder tier (premium builders: Azimut Grande, Sunseeker, Pershing, Ferretti, Benetti, Sanlorenzo, Princess, MCY — never mix with budget brands)
✓ Length within ±3 meters
✓ Year built within ±5 years
✓ Same region
✓ Crewed charter (not bareboat)
✗ DO NOT use bareboat listings
✗ DO NOT mix builder tiers
✗ DO NOT fabricate rates — only use rates from actual listing pages you visited

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 3 — VISIT LISTING PAGES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
For each candidate found in search results, visit the actual listing page to verify:
- Exact weekly or daily rate
- Year built and length
- Region availability
If the listing page specs don't match criteria, discard and search for another.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 4 — RATE CALCULATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Collect 3–6 verified comparable listings
2. Remove outliers (>2x or <0.5x the median)
3. Calculate weighted average — closer builder/model match = higher weight
4. Round to nearest €100 for weekly, €50 for daily

SEASON DEFINITIONS:
Mediterranean:   High Jun 15–Sep 15 / Shoulder May 1–Jun 14 and Sep 16–Oct 31 / Low Nov 1–Apr 30
Caribbean:       High Dec 15–Apr 30 / Shoulder Nov 1–Dec 14 and May 1–Jun 15 / Low Jun 16–Oct 31
Northern Europe: High Jul 1–Aug 31 / Shoulder May 15–Jun 30 and Sep 1–Sep 30 / Low Oct 1–May 14
Asia-Pacific:    High Nov–Apr / Low May–Oct
Middle East:     High Oct–Apr / Low May–Sep

OUTPUT FORMAT — CRITICAL:
Respond ONLY with valid JSON. No text before or after. No markdown.

{
  "rate": 75000,
  "currency": "EUR",
  "period": "week",
  "season": "high",
  "region": "Mediterranean",
  "confidence": "high",
  "comparables_found": 5,
  "range_min": 65000,
  "range_max": 88000,
  "charter_type": "crewed",
  "sources": ["yachtcharterfleet.com", "burgessyachts.com"],
  "explanation": "Based on 5 Azimut Grande 27M listings (2019–2023) in Mediterranean high season.",
  "seasonal_rates": { "high": 75000, "shoulder": 55000, "low": 35000 },
  "weekly_equivalent": 75000
}

If fewer than 3 comparables found, set confidence to "low".`;

export function buildUserPrompt(
  yacht: YachtRow,
  req: AiRateEstimateRequest,
): string {
  const yachtType = yacht.yacht_type || "yacht";
  const length = Number(yacht.length_meters) || 0;
  const year = yacht.year_built ?? "unknown";
  const brand = (yacht.brand as string | null) ?? null;
  const model = (yacht.model as string | null) ?? null;
  const lengthStr = length > 0 ? `${length.toFixed(1)} meters` : "unknown";
  const charterType =
    req.charter_type ??
    (yachtType === "sailing" && length < 15
      ? "bareboat"
      : length >= 15
        ? "crewed"
        : "bareboat");

  // Build brand/model line only when available — AI uses it to find
  // brand-specific comparables instead of generic size-only matches.
  const brandLine =
    brand || model
      ? `BRAND / MODEL: ${[brand, model].filter(Boolean).join(" ")}\n`
      : "";

  // Year-based recency note helps AI weight newer comparables correctly.
  const yearNote =
    typeof year === "number" && year >= 2015
      ? `This is a relatively modern yacht (${year}); prioritise comparables built ${year - 4}–${year + 4}.`
      : typeof year === "number"
        ? `Built ${year}; comparables within ±5 years preferred.`
        : "";

  return `Find the current market charter rate for this yacht:

TYPE: ${yachtType}
${brandLine}LENGTH: ${lengthStr}
YEAR BUILT: ${year}
REGION: ${REGION_LABEL[req.region]}
SEASON: ${req.season} season
RATE PERIOD: per ${req.rate_period}
CHARTER TYPE: ${charterType}

${yearNote}

IMPORTANT: Search specifically for "${[brand, model].filter(Boolean).join(" ") || `${yachtType} ${lengthStr}`}" charter listings first. Brand matters — premium builders (Azimut Grande, Sunseeker, Pershing, Ferretti, Benetti, Princess, Sanlorenzo) command significantly higher rates than generic comparables of the same length. Do NOT average in bareboat or budget listings.

Search for comparable yachts currently listed for charter in ${REGION_LABEL[req.region]}.
Return the average market rate as a single number in EUR per ${req.rate_period} for ${req.season} season.
Also provide the full seasonal rate breakdown (high/shoulder/low).

Respond ONLY with the JSON format specified. No other text.`;
}

function num(v: unknown): number | null {
  if (typeof v === "number" && isFinite(v)) return v;
  if (typeof v === "string") {
    const n = parseFloat(v.replace(/[^\d.\-]/g, ""));
    return isFinite(n) ? n : null;
  }
  return null;
}

function roundTo(n: number, step: number): number {
  return Math.round(n / step) * step;
}

function parseSeasonalRates(raw: unknown, period: RatePeriod): SeasonalRates {
  const o = (raw ?? {}) as Record<string, unknown>;
  const step = period === "day" ? 50 : 100;
  const norm = (v: unknown): number | null => {
    const n = num(v);
    return n != null && n > 0 ? roundTo(n, step) : null;
  };
  return {
    high: norm(o["high"]),
    shoulder: norm(o["shoulder"]),
    low: norm(o["low"]),
  };
}

function parseSources(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((s): s is string => typeof s === "string" && s.length > 0)
    .slice(0, 6)
    .map((s) => s.replace(/^https?:\/\//, "").replace(/\/.*$/, ""));
}

function parseConfidence(raw: unknown): "high" | "medium" | "low" {
  return raw === "high" || raw === "medium" || raw === "low" ? raw : "medium";
}

function parseCharterType(raw: unknown, fallback: CharterType): CharterType {
  return raw === "crewed" || raw === "bareboat" ? raw : fallback;
}

/**
 * Charter Rate AI Estimator. Calls OpenAI Responses API with
 * web_search_preview tool; falls back to /chat/completions if Responses fails;
 * returns a structured failure (not 500) if both fail or JSON is unparseable.
 *
 * Per project rule: AI must NEVER cause a 500. The caller wraps in try/catch
 * but this function returns AiRateEstimateFailure as a normal value path.
 */
export async function estimateCharterRate(
  yacht: YachtRow,
  req: AiRateEstimateRequest,
): Promise<AiRateEstimateResponse> {
  const userPrompt = buildUserPrompt(yacht, req);
  const fullInput = `${CHARTER_RATE_SYSTEM_PROMPT}\n\n${userPrompt}`;

  let raw = "";
  try {
    raw = await aiResponses(fullInput, "gpt-5-mini", [
      { type: "web_search_preview" },
    ]);
  } catch {
    try {
      raw = await aiChat(
        [
          { role: "system", content: CHARTER_RATE_SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        "gpt-5-mini",
      );
    } catch {
      return {
        success: false,
        error: "Could not retrieve market rates. Please enter manually.",
      };
    }
  }

  let parsed: Record<string, unknown>;
  try {
    parsed = extractJson(raw);
  } catch {
    return {
      success: false,
      error: "AI response could not be parsed. Please enter manually.",
    };
  }

  const rateRaw = num(parsed["rate"]);
  const period: RatePeriod = parsed["period"] === "day" ? "day" : req.rate_period;
  const step = period === "day" ? 50 : 100;

  if (rateRaw == null || rateRaw <= 0) {
    const explanation =
      cleanReasoning(parsed["explanation"]) ||
      "No active charter market found for this combination.";
    return {
      success: false,
      error: explanation,
    };
  }

  const length = Number(yacht.length_meters) || 0;
  const yachtType = yacht.yacht_type || "yacht";
  const defaultCharterType: CharterType =
    yachtType === "sailing" && length < 15
      ? "bareboat"
      : length >= 15
        ? "crewed"
        : "bareboat";

  const rate = roundTo(rateRaw, step);
  const rangeMin = num(parsed["range_min"]);
  const rangeMax = num(parsed["range_max"]);
  const compsFound = num(parsed["comparables_found"]);
  const weeklyEq = num(parsed["weekly_equivalent"]);

  const confidenceRaw = parseConfidence(parsed["confidence"]);
  // Auto-downgrade if comparables_found is missing/invalid OR < 3.
  // Missing/invalid is treated as low because we cannot trust a "high"
  // verdict without evidence of how many comparables were used.
  const confidence: "high" | "medium" | "low" =
    compsFound == null || compsFound < 3 ? "low" : confidenceRaw;

  return {
    success: true,
    rate,
    currency: "EUR",
    period,
    season: req.season,
    region: req.region,
    confidence,
    comparables_found: compsFound != null ? Math.max(0, Math.round(compsFound)) : 0,
    range_min: rangeMin != null && rangeMin > 0 ? roundTo(rangeMin, step) : null,
    range_max: rangeMax != null && rangeMax > 0 ? roundTo(rangeMax, step) : null,
    charter_type: parseCharterType(parsed["charter_type"], defaultCharterType),
    sources: parseSources(parsed["sources"]),
    explanation:
      cleanReasoning(parsed["explanation"]) ||
      "Estimated from comparable listings in the region.",
    seasonal_rates: parseSeasonalRates(parsed["seasonal_rates"], period),
    weekly_equivalent:
      weeklyEq != null && weeklyEq > 0
        ? roundTo(weeklyEq, 100)
        : period === "day"
          ? rate * 7
          : rate,
    ai_used: true,
  };
}
