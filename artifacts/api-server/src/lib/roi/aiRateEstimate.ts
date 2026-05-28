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

Your task: research and return the current market charter rate for a specific yacht based on the user's specifications.

SEARCH STRATEGY:
Search these platforms for comparable listings:
- yachtcharterfleet.com
- boatbookings.com
- getmyboat.com
- burgessyachts.com
- fraseryachts.com
- moranyachts.com
- eyos.com
- clickandboat.com (for smaller yachts under 15m)

Search query format: "[yacht type] [length]m charter [region] [season] price"

COMPARISON CRITERIA:
Find yachts that match ALL of these within tolerance:
- Yacht type: exact match (motor/sailing/catamaran/superyacht)
- Length: within ±3 meters of specified length
- Year: within ±5 years of specified year (newer = higher rate)
- Region: exact match
- Season: match the requested season

RATE CALCULATION:
1. Collect minimum 3 comparable listings (aim for 5–10)
2. Note the rate for each (daily or weekly as requested)
3. Remove outliers (>2x or <0.5x the median)
4. Calculate: average of remaining rates
5. Round to nearest €100 for weekly, nearest €50 for daily

SEASON DEFINITIONS:
Mediterranean:    High Jun 15 – Sep 15 / Shoulder May 1 – Jun 14 and Sep 16 – Oct 31 / Low Nov 1 – Apr 30
Caribbean:        High Dec 15 – Apr 30 / Shoulder Nov 1 – Dec 14 and May 1 – Jun 15 / Low Jun 16 – Oct 31
Northern Europe:  High Jul 1 – Aug 31 / Shoulder May 15 – Jun 30 and Sep 1 – Sep 30 / Low Oct 1 – May 14
Asia-Pacific:     High Nov – Apr (varies by location) / Low May – Oct
Middle East:      High Oct – Apr / Low May – Sep

RATE TYPES:
- Crewed charter (with captain and crew): standard for 15m+ yachts
- Bareboat (without crew): standard for yachts under 15m, sailing yachts
- If user specifies: use what they specify
- Default: crewed for motor yachts 15m+, bareboat for sailing under 15m

OUTPUT FORMAT — CRITICAL:
You MUST respond ONLY with valid JSON. No text before or after. No markdown fences. No explanation outside the JSON.

{
  "rate": 4500,
  "currency": "EUR",
  "period": "day",
  "season": "high",
  "region": "Mediterranean",
  "confidence": "high",
  "comparables_found": 8,
  "range_min": 3800,
  "range_max": 5200,
  "charter_type": "crewed",
  "sources": ["yachtcharterfleet.com", "boatbookings.com", "burgessyachts.com"],
  "explanation": "Based on 8 comparable motor yachts 22-26m, built 2016-2022, in Mediterranean during high season.",
  "seasonal_rates": { "high": 4500, "shoulder": 3200, "low": 2400 },
  "weekly_equivalent": 31500
}

If you cannot find sufficient data (fewer than 3 comparables), set confidence to "low" and explain.
If the region has no active charter market for this yacht type, set rate to null and explain in 'explanation'.`;

export function buildUserPrompt(
  yacht: YachtRow,
  req: AiRateEstimateRequest,
): string {
  const yachtType = yacht.yacht_type || "yacht";
  const length = Number(yacht.length_meters) || 0;
  const year = yacht.year_built ?? "unknown";
  const lengthStr = length > 0 ? `${length.toFixed(1)} meters` : "unknown";
  const charterType =
    req.charter_type ??
    (yachtType === "sailing" && length < 15
      ? "bareboat"
      : length >= 15
        ? "crewed"
        : "bareboat");
  return `Find the current market charter rate for this yacht:

TYPE: ${yachtType}
LENGTH: ${lengthStr}
YEAR BUILT: ${year}
REGION: ${REGION_LABEL[req.region]}
SEASON: ${req.season} season
RATE PERIOD: per ${req.rate_period}
CHARTER TYPE: ${charterType}

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
