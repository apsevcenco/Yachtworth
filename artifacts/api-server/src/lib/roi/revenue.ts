import {
  aiChat,
  aiResponses,
  extractJson,
  cleanReasoning,
} from "../valuation/openai";
import type { YachtRow } from "./types";

export interface ComputedRevenue {
  annual_gross_eur: number;
  daily_rate_eur: number;
  weekly_rate_eur: number;
  expected_charter_weeks: number;
  daily_rate_low_eur: number | null;
  daily_rate_high_eur: number | null;
  occupancy_pct: number;
  market_rating: "A" | "B" | "C" | "D" | null;
  comparables: {
    name: string;
    location?: string | null;
    weekly_rate_eur?: number | null;
    source_url?: string | null;
  }[];
  reasoning: string;
  confidence: "high" | "medium" | "low";
  ai_used: boolean;
}

const REGION_LABEL: Record<string, string> = {
  mediterranean: "Mediterranean (France, Italy, Croatia, Greece, Spain)",
  caribbean: "Caribbean (BVI, St Martin, Bahamas)",
  northern_europe: "Northern Europe (UK, Baltic, Norway)",
  asia_pacific_me: "Asia-Pacific (Thailand, Indonesia, Australia)",
  middle_east: "Middle East (UAE, Oman, Red Sea)",
};

const SEASON_LABEL: Record<string, string> = {
  high: "high season only (Jun–Aug Med / Dec–Apr Caribbean)",
  shoulder: "shoulder season (May, Sep, Oct)",
  low: "low season (Nov–Apr Med)",
  mixed: "weighted across the full year",
};

const OCC_LABEL: Record<string, string> = {
  conservative: "conservative — fewer charter weeks than peers",
  realistic: "realistic — in line with comparable yachts in the region",
  optimistic: "optimistic — top of the range, near-fully booked in peak season",
};

interface ManualArgs {
  mode: "manual_daily" | "manual_weekly";
  rateEur: number;
  units: number;
}

export function computeManualRevenue({ mode, rateEur, units }: ManualArgs): ComputedRevenue {
  let dailyRate: number;
  let weeklyRate: number;
  let weeks: number;
  if (mode === "manual_daily") {
    dailyRate = rateEur;
    weeklyRate = rateEur * 7;
    weeks = units / 7;
  } else {
    weeklyRate = rateEur;
    dailyRate = rateEur / 7;
    weeks = units;
  }
  const gross = rateEur * units;
  const occupancyPct = Math.max(0, Math.min(100, Math.round((weeks / 52) * 100)));
  return {
    annual_gross_eur: Math.round(gross),
    daily_rate_eur: Math.round(dailyRate),
    weekly_rate_eur: Math.round(weeklyRate),
    expected_charter_weeks: Math.round(weeks * 10) / 10,
    daily_rate_low_eur: null,
    daily_rate_high_eur: null,
    occupancy_pct: occupancyPct,
    market_rating: null,
    comparables: [],
    reasoning:
      "User-supplied charter rate and bookings. No market analysis performed.",
    confidence: "medium",
    ai_used: false,
  };
}

interface AiArgs {
  yacht: YachtRow;
  region: string;
  season: string; // high|shoulder|low|mixed
  occupancyTarget: string | null;
  targetWeeksOverride: number | null;
}

function buildAiPrompt({ yacht, region, season, occupancyTarget, targetWeeksOverride }: AiArgs): string {
  const L = Number(yacht.length_meters) || 0;
  const lengthFt = L > 0 ? Math.round(L * 3.28084) : null;
  const yachtLabel =
    yacht.name || [yacht.brand, yacht.model].filter(Boolean).join(" ") || "(unnamed)";
  const type = yacht.yacht_type || "yacht";
  const year = yacht.year_built ? `built ${yacht.year_built}` : "year unknown";
  const cabins = yacht.cabins ? `${yacht.cabins} cabins` : "cabins unknown";
  const guests = yacht.guests ? `${yacht.guests} guests` : "guest capacity unknown";
  const crew = yacht.crew ? `${yacht.crew} crew` : "crew unknown";
  const lengthStr = L > 0 ? `${L.toFixed(1)}m (${lengthFt}ft)` : "length unknown";
  const occHint =
    targetWeeksOverride != null
      ? `OVERRIDE: expected_charter_weeks MUST equal ${targetWeeksOverride}.`
      : occupancyTarget
      ? `Occupancy posture: ${OCC_LABEL[occupancyTarget]}.`
      : `Use a realistic occupancy posture.`;

  return `You are a charter market analyst. Estimate the realistic gross
charter revenue for the yacht below over one full year.

YACHT
- ${yachtLabel}, ${type}, ${year}
- ${lengthStr}, ${cabins}, ${guests}, ${crew}
- Home port: ${yacht.marina_location || "not specified"}
- Configuration: ${yacht.configuration || "not specified"}
- Commercial registration: ${yacht.commercial_registration ? "YES" : "NO"}

CHARTER SCENARIO
- Region: ${REGION_LABEL[region] || region}
- Season basis: ${SEASON_LABEL[season] || season}
- ${occHint}

INSTRUCTIONS
1. Search the open web for current charter listings of comparable yachts
   in the specified region (Boatbookings, CharterWorld, YachtCharterFleet,
   Boatsetter, broker sites). Aim for 3 truly comparable yachts.
2. Determine a realistic weekly rate range (low–high) in EUR. If listings
   are in USD/GBP, convert at current FX.
3. Decide a realistic number of charter weeks per year for this yacht in
   this region with the requested occupancy posture. Typical industry
   range: 8–18 weeks for owner-operated, 14–24 for commercially managed.
4. Compute average daily rate (midpoint weekly / 7).
5. Output STRICT JSON, no prose around it:

{
  "daily_rate_eur": <integer>,
  "weekly_rate_eur": <integer>,
  "daily_rate_low_eur": <integer>,
  "daily_rate_high_eur": <integer>,
  "expected_charter_weeks": <number, may be fractional, 0–52>,
  "occupancy_pct": <integer, 0–100>,
  "market_rating": "A" | "B" | "C" | "D",
  "comparables": [
    { "name": "...", "location": "...", "weekly_rate_eur": <int>, "source_url": "..." }
  ],
  "reasoning": "2 sentences max — what drove the rate and weeks."
}

Use realistic numbers backed by your search. Do NOT invent listings.`;
}

const REGION_RATE_MULT: Record<string, number> = {
  mediterranean: 1.0,
  caribbean: 1.1,
  northern_europe: 0.85,
  asia_pacific_me: 0.95,
  middle_east: 1.05,
};

/**
 * Deterministic, length-based fallback when AI is unreachable or returns
 * unparseable output. Conservative numbers so user is never misled into
 * thinking the AI worked.
 */
function heuristicAiFallback(args: AiArgs): ComputedRevenue {
  const L = Number(args.yacht.length_meters) || 18;
  const R = REGION_RATE_MULT[args.region] ?? 1.0;
  let perMeter: number;
  if (L < 15) perMeter = 800;
  else if (L < 25) perMeter = 1500;
  else if (L < 40) perMeter = 2200;
  else perMeter = 3500;
  const weekly = Math.round(L * perMeter * R);
  const daily = Math.round(weekly / 7);
  // Default weeks by occupancy hint, then season modifier
  const weeksByOcc: Record<string, number> = {
    conservative: 8,
    realistic: 12,
    optimistic: 18,
  };
  let weeks = args.occupancyTarget
    ? weeksByOcc[args.occupancyTarget] ?? 12
    : 12;
  if (args.season === "high") weeks = Math.min(weeks, 10);
  else if (args.season === "low") weeks = Math.max(2, Math.round(weeks * 0.3));
  if (args.targetWeeksOverride != null) weeks = args.targetWeeksOverride;
  const occupancyPct = Math.round((weeks / 52) * 100);
  return {
    annual_gross_eur: weekly * weeks,
    daily_rate_eur: daily,
    weekly_rate_eur: weekly,
    expected_charter_weeks: weeks,
    daily_rate_low_eur: Math.round(daily * 0.7),
    daily_rate_high_eur: Math.round(daily * 1.3),
    occupancy_pct: occupancyPct,
    market_rating: null,
    comparables: [],
    reasoning:
      "AI market lookup was unavailable. Used a deterministic length-and-region heuristic. Add a real charter rate (manual mode) for sharper numbers.",
    confidence: "low",
    ai_used: false,
  };
}

export async function computeAiRevenue(args: AiArgs): Promise<ComputedRevenue> {
  const prompt = buildAiPrompt(args);
  let raw = "";
  let webSearchUsed = false;
  try {
    raw = await aiResponses(prompt, "gpt-5-mini", [{ type: "web_search_preview" }]);
    webSearchUsed = true;
  } catch {
    try {
      raw = await aiChat(
        [
          {
            role: "system",
            content:
              "You are a charter market analyst. Return STRICT JSON only, no commentary.",
          },
          { role: "user", content: prompt },
        ],
        "gpt-5-mini",
      );
    } catch {
      return heuristicAiFallback(args);
    }
  }
  let parsed: Record<string, unknown>;
  try {
    parsed = extractJson(raw) as Record<string, unknown>;
  } catch {
    return heuristicAiFallback(args);
  }

  const num = (k: string, fb = 0): number => {
    const v = parsed[k];
    const n = typeof v === "number" ? v : typeof v === "string" ? parseFloat(v) : NaN;
    return isFinite(n) ? n : fb;
  };
  let daily = num("daily_rate_eur");
  let weekly = num("weekly_rate_eur");
  if (!weekly && daily) weekly = daily * 7;
  if (!daily && weekly) daily = weekly / 7;
  const dailyLow = num("daily_rate_low_eur") || null;
  const dailyHigh = num("daily_rate_high_eur") || null;
  let weeks = num("expected_charter_weeks");
  if (args.targetWeeksOverride != null) weeks = args.targetWeeksOverride;
  weeks = Math.max(0, Math.min(52, weeks));
  const occupancyPct = Math.round(num("occupancy_pct") || (weeks / 52) * 100);
  const mr = parsed["market_rating"];
  const marketRating =
    mr === "A" || mr === "B" || mr === "C" || mr === "D" ? mr : null;
  const compsRaw = Array.isArray(parsed["comparables"]) ? parsed["comparables"] : [];
  const comparables = compsRaw.slice(0, 3).map((c) => {
    const o = (c ?? {}) as Record<string, unknown>;
    return {
      name: typeof o["name"] === "string" ? (o["name"] as string) : "Comparable",
      location: typeof o["location"] === "string" ? (o["location"] as string) : null,
      weekly_rate_eur:
        typeof o["weekly_rate_eur"] === "number" ? (o["weekly_rate_eur"] as number) : null,
      source_url:
        typeof o["source_url"] === "string" ? (o["source_url"] as string) : null,
    };
  });
  const reasoning = cleanReasoning(parsed["reasoning"] || "");
  return {
    annual_gross_eur: Math.round(weekly * weeks),
    daily_rate_eur: Math.round(daily),
    weekly_rate_eur: Math.round(weekly),
    expected_charter_weeks: Math.round(weeks * 10) / 10,
    daily_rate_low_eur: dailyLow != null ? Math.round(dailyLow) : null,
    daily_rate_high_eur: dailyHigh != null ? Math.round(dailyHigh) : null,
    occupancy_pct: occupancyPct,
    market_rating: marketRating,
    comparables,
    reasoning: reasoning || "Estimated from comparable listings in the region.",
    confidence: webSearchUsed ? "high" : "medium",
    ai_used: true,
  };
}
