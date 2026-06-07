import {
  aiResponses,
  extractJson,
  cleanReasoning,
} from "../valuation/openai";
import type { YachtRow } from "./types";
import { findMarketRate, lengthBand, type MarketRateRow } from "./rates";

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

/**
 * Owner-defined charter-week model, by region → season → occupancy posture.
 *
 * When a (region, season, occupancy) entry exists here it is AUTHORITATIVE:
 * the number of charter weeks is taken from this table for BOTH the AI and
 * the deterministic paths, and the AI is asked to estimate only the weekly
 * rate (€/week). This keeps the booked-weeks dimension predictable and under
 * the owner's control instead of letting the model guess it.
 *
 * Regions NOT listed here fall back to the legacy occupancy×season heuristic,
 * so adding a region is purely additive and never changes the others.
 */
const REGION_SEASON_WEEKS: Record<
  string,
  Record<string, Record<string, number>>
> = {
  // NOTE: Mediterranean is now modelled in REGION_MODELS below (weekly + daily).
  // This legacy entry is kept inert as documentation of the original week counts
  // — REGION_MODELS takes priority in every code path, so it is never read.
  mediterranean: {
    // High season (Jun–Aug): 13 weeks available
    high: { conservative: 4, realistic: 7, optimistic: 10 },
    // Shoulder season (May, Sep–Oct): 13 weeks available
    shoulder: { conservative: 2, realistic: 4, optimistic: 6 },
    // Full year (high + shoulder); low season excluded as effectively dead
    mixed: { conservative: 6, realistic: 11, optimistic: 16 },
    // Low season (Nov–Apr): no realistic charter demand in the Med
    low: { conservative: 0, realistic: 0, optimistic: 0 },
  },
};

/**
 * Look up the owner-defined charter weeks for this region/season/occupancy.
 * Returns null when the region (or combination) is not modelled, so callers
 * keep their existing behaviour. A null occupancy defaults to "realistic".
 */
function tableWeeks(
  region: string,
  season: string,
  occupancy: string | null,
): number | null {
  const byRegion = REGION_SEASON_WEEKS[region];
  if (!byRegion) return null;
  const bySeason = byRegion[season];
  if (!bySeason) return null;
  const w = bySeason[occupancy ?? "realistic"];
  return typeof w === "number" ? w : null;
}

// ─────────────────────────────────────────────────────────────────────
// Region charter models (NEW — additive). Where a region appears here it
// drives BOTH the AI and the deterministic path: the charter units (weeks
// for a weekly basis, days for a daily basis) per season/occupancy are
// FIXED by the owner, and the AI estimates only the base rate. Per-sub-
// season rate multipliers let shoulder/low seasons be discounted, and the
// "mixed"/"all" season BLENDS the sub-seasons each at its own rate.
//
// Regions NOT listed here keep the legacy REGION_SEASON_WEEKS / heuristic
// path completely unchanged. daily_rate is derived as base weekly rate /
// dailyDivisor (new regions use 6, not 7).
// ─────────────────────────────────────────────────────────────────────
type Basis = "weekly" | "daily";
type OccKey = "conservative" | "realistic" | "optimistic";

interface SubSeason {
  /** Physical charter units per occupancy posture — weeks for a weekly
   *  basis, days for a daily basis. */
  units: Record<OccKey, number>;
  /** Rate multiplier vs the base rate (peak = 1.0, shoulder/low < 1.0). */
  mult: number;
}

interface BasisModel {
  subSeasons: Record<string, SubSeason>;
  /** Questionnaire season → sub-seasons to combine. Empty list (or a season
   *  absent from the map) = dead season → 0 revenue. */
  seasonMap: Record<string, string[]>;
}

interface RegionModel {
  weekly?: BasisModel;
  daily?: BasisModel;
  /** base weekly rate / dailyDivisor = day rate. New regions use 6. */
  dailyDivisor: number;
  /** Charter bases the region offers, in priority order. A daily-only region
   *  lists only "daily" so any weekly request is coerced to daily. */
  bases: Basis[];
}

// Caribbean: peak (Dec–Apr) + shoulder (Nov, May–Jun); summer hurricane
// season is dead (low → 0). Shoulder discounted 20% (mult 0.80).
const CARIB_SEASON_MAP: Record<string, string[]> = {
  high: ["peak"],
  shoulder: ["shoulder"],
  mixed: ["peak", "shoulder"],
  low: [],
};

// Northern Europe + Southeast Asia: peak + shoulder only; no low season.
// Season selector "high"|"shoulder"|"all" maps to high|shoulder|mixed here
// ("all"/"mixed" blends peak + shoulder). Both new regions share this shape.
const PEAK_SHOULDER_SEASON_MAP: Record<string, string[]> = {
  high: ["peak"],
  shoulder: ["shoulder"],
  mixed: ["peak", "shoulder"],
  low: [],
};

// Mediterranean: peak (Jun–Aug) + shoulder (May, Sep–Oct); winter (Nov–Apr) is
// effectively dead (low → 0). Weekly units mirror the original legacy week table
// 1:1 with a flat rate (mult 1.0 both sub-seasons) so existing weekly estimates
// stay numerically equivalent; daily adds a day-charter basis (shoulder -15%).
const MED_SEASON_MAP: Record<string, string[]> = {
  high: ["peak"],
  shoulder: ["shoulder"],
  mixed: ["peak", "shoulder"],
  low: [],
};

const REGION_MODELS: Record<string, RegionModel> = {
  mediterranean: {
    bases: ["weekly", "daily"],
    dailyDivisor: 6,
    weekly: {
      subSeasons: {
        peak: { units: { conservative: 4, realistic: 7, optimistic: 10 }, mult: 1.0 },
        shoulder: { units: { conservative: 2, realistic: 4, optimistic: 6 }, mult: 1.0 },
      },
      seasonMap: MED_SEASON_MAP,
    },
    daily: {
      subSeasons: {
        peak: { units: { conservative: 28, realistic: 50, optimistic: 75 }, mult: 1.0 },
        shoulder: { units: { conservative: 14, realistic: 28, optimistic: 45 }, mult: 0.85 },
      },
      seasonMap: MED_SEASON_MAP,
    },
  },
  caribbean: {
    bases: ["weekly", "daily"],
    dailyDivisor: 6,
    weekly: {
      subSeasons: {
        peak: { units: { conservative: 5, realistic: 10, optimistic: 14 }, mult: 1.0 },
        shoulder: { units: { conservative: 2, realistic: 3, optimistic: 5 }, mult: 0.8 },
      },
      seasonMap: CARIB_SEASON_MAP,
    },
    daily: {
      subSeasons: {
        peak: { units: { conservative: 30, realistic: 60, optimistic: 90 }, mult: 1.0 },
        shoulder: { units: { conservative: 5, realistic: 15, optimistic: 25 }, mult: 0.8 },
      },
      seasonMap: CARIB_SEASON_MAP,
    },
  },
  // Dubai / Middle East — DAILY only. High (Oct–Apr) + low (May–Sep); no
  // shoulder. Low season discounted 25% (mult 0.75). "mixed" = full-year all.
  middle_east: {
    bases: ["daily"],
    dailyDivisor: 6,
    daily: {
      subSeasons: {
        high: { units: { conservative: 56, realistic: 84, optimistic: 133 }, mult: 1.0 },
        low: { units: { conservative: 10, realistic: 25, optimistic: 50 }, mult: 0.75 },
      },
      seasonMap: {
        high: ["high"],
        low: ["low"],
        mixed: ["high", "low"],
        shoulder: [],
      },
    },
  },
  // Northern Europe (UK, Baltic, Norway) — weekly + daily. Short summer:
  // peak (Jul–Aug) + shoulder (May–Jun, Sep); no winter charter (low → 0).
  // Shoulder discounted 30% (mult 0.70). The booked units below already
  // reflect the -15% weather deduction applied to available days, so no
  // further deduction is applied here.
  northern_europe: {
    bases: ["weekly", "daily"],
    dailyDivisor: 6,
    weekly: {
      subSeasons: {
        peak: { units: { conservative: 3, realistic: 5, optimistic: 7 }, mult: 1.0 },
        shoulder: { units: { conservative: 1, realistic: 3, optimistic: 5 }, mult: 0.7 },
      },
      seasonMap: PEAK_SHOULDER_SEASON_MAP,
    },
    daily: {
      subSeasons: {
        peak: { units: { conservative: 15, realistic: 28, optimistic: 42 }, mult: 1.0 },
        shoulder: { units: { conservative: 5, realistic: 15, optimistic: 25 }, mult: 0.7 },
      },
      seasonMap: PEAK_SHOULDER_SEASON_MAP,
    },
  },
  // Southeast Asia (Phuket / Bali / Langkawi) — weekly + daily. Main window
  // Nov–Apr: peak (Dec–Mar) + shoulder (Nov, Apr); off-season monsoon is
  // dead (low → 0). Shoulder discounted 25% (mult 0.75). The booked units
  // below already reflect the -10% weather deduction applied to available
  // days, so no further deduction is applied here.
  asia_pacific_me: {
    bases: ["weekly", "daily"],
    dailyDivisor: 6,
    weekly: {
      subSeasons: {
        peak: { units: { conservative: 4, realistic: 8, optimistic: 12 }, mult: 1.0 },
        shoulder: { units: { conservative: 2, realistic: 3, optimistic: 5 }, mult: 0.75 },
      },
      seasonMap: PEAK_SHOULDER_SEASON_MAP,
    },
    daily: {
      subSeasons: {
        peak: { units: { conservative: 25, realistic: 55, optimistic: 85 }, mult: 1.0 },
        shoulder: { units: { conservative: 5, realistic: 12, optimistic: 20 }, mult: 0.75 },
      },
      seasonMap: PEAK_SHOULDER_SEASON_MAP,
    },
  },
};

/** Resolve the effective charter basis for a region + requested type. Returns
 *  null when the region is not in the new model (caller keeps legacy path). */
function resolveBasis(region: string, requested: string | null): Basis | null {
  const m = REGION_MODELS[region];
  if (!m) return null;
  if (requested === "daily" && m.bases.includes("daily")) return "daily";
  if (requested === "weekly" && m.bases.includes("weekly")) return "weekly";
  return m.bases[0] ?? null;
}

/**
 * Effective charter basis (weekly | daily) actually used for a region, with the
 * legacy fallback resolved: regions not in REGION_MODELS (e.g. Mediterranean)
 * are weekly. Exported for the dual-region breakdown so the result can report
 * per-region weeks vs days. Pure lookup — no behaviour change for callers.
 */
export function charterBasis(region: string, requested: string | null): Basis {
  return resolveBasis(region, requested) ?? "weekly";
}

/** Fixed physical charter units for a region/basis/season/occupancy — weeks
 *  for a weekly basis, days for a daily basis. */
function regionModelUnits(
  region: string,
  basis: Basis,
  season: string,
  occupancy: string | null,
): number | null {
  const m = REGION_MODELS[region];
  if (!m) return null;
  const bm = basis === "daily" ? m.daily : m.weekly;
  if (!bm) return null;
  const occ = (occupancy ?? "realistic") as OccKey;
  const keys = bm.seasonMap[season] ?? [];
  let total = 0;
  for (const k of keys) {
    const ss = bm.subSeasons[k];
    if (ss) total += ss.units[occ] ?? 0;
  }
  return total;
}

interface RegionRevenue {
  grossEur: number;
  /** Weeks-equivalent of the booked units (for display + occupancy). */
  physicalWeeks: number;
  dailyRate: number;
  weeklyRate: number;
  dailyLow: number;
  dailyHigh: number;
  occupancyPct: number;
}

/**
 * Compute revenue for a region in the NEW model. `baseWeekly` is the weekly
 * base rate (from the AI or the heuristic). Units are fixed by the table; the
 * rate is the only estimated input. Returns null when the region is not in the
 * new model so callers keep their existing behaviour.
 */
function regionModelRevenue(
  region: string,
  basis: Basis,
  season: string,
  occupancy: string | null,
  baseWeekly: number,
): RegionRevenue | null {
  const m = REGION_MODELS[region];
  if (!m) return null;
  const bm = basis === "daily" ? m.daily : m.weekly;
  if (!bm) return null;
  const occ = (occupancy ?? "realistic") as OccKey;
  const keys = bm.seasonMap[season] ?? [];
  const dailyRate = baseWeekly / m.dailyDivisor;

  let physical = 0; // weeks or days, depending on basis
  let rateWeighted = 0; // physical units × per-sub-season multiplier
  let maxMult = 0;
  let minMult = Number.POSITIVE_INFINITY;
  for (const k of keys) {
    const ss = bm.subSeasons[k];
    if (!ss) continue;
    const u = ss.units[occ] ?? 0;
    physical += u;
    rateWeighted += u * ss.mult;
    if (ss.mult > maxMult) maxMult = ss.mult;
    if (ss.mult < minMult) minMult = ss.mult;
  }
  if (!isFinite(minMult)) minMult = 1;
  if (maxMult === 0) maxMult = 1;

  let grossEur: number;
  let physicalWeeks: number;
  if (basis === "daily") {
    grossEur = dailyRate * rateWeighted;
    physicalWeeks = physical / 7; // weeks-equivalent of booked days
  } else {
    grossEur = baseWeekly * rateWeighted;
    physicalWeeks = physical;
  }
  const occupancyPct = Math.max(
    0,
    Math.min(100, Math.round((physicalWeeks / 52) * 100)),
  );
  return {
    grossEur: Math.round(grossEur),
    physicalWeeks: Math.round(physicalWeeks * 10) / 10,
    dailyRate: Math.round(dailyRate),
    weeklyRate: Math.round(baseWeekly),
    dailyLow: Math.round(dailyRate * minMult),
    dailyHigh: Math.round(dailyRate * maxMult),
    occupancyPct,
  };
}

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
  /** AI mode charter basis (weekly|daily). Only consulted for regions in the
   *  new REGION_MODELS table; null = use the region's primary basis. */
  charterType?: string | null;
  /** Pre-fetched market_rates rows (Stage 4). Used by the deterministic
   *  fallback only — the AI path is unchanged. */
  marketRates?: MarketRateRow[];
}

function buildAiPrompt({ yacht, region, season, occupancyTarget, targetWeeksOverride, charterType }: AiArgs): string {
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

  // New-model regions (Caribbean, Middle East): units (weeks or days) are
  // fixed by the owner table; AI estimates only the rate. Legacy regions keep
  // the Mediterranean fixed-weeks / free-estimate behaviour.
  const basis = resolveBasis(region, charterType ?? null);
  const modelUnits =
    basis != null
      ? regionModelUnits(region, basis, season, occupancyTarget ?? null)
      : null;
  const legacyFixed =
    modelUnits == null
      ? targetWeeksOverride != null
        ? targetWeeksOverride
        : tableWeeks(region, season, occupancyTarget)
      : null;

  const occPosture = occupancyTarget
    ? `Occupancy posture: ${OCC_LABEL[occupancyTarget]}.`
    : "Use a realistic occupancy posture.";

  let occHint: string;
  let weeksInstruction: string;
  let rateLine = "4. Compute average daily rate (midpoint weekly / 7).";
  if (modelUnits != null && basis === "daily") {
    const weeksEq = Math.round((modelUnits / 7) * 10) / 10;
    occHint = occPosture;
    weeksInstruction = `This region charters BY THE DAY. The number of charter DAYS per year is FIXED at ${modelUnits} — do NOT estimate or change it. Your only job is the rate: give the typical full-day charter rate in EUR as daily_rate_eur, and its weekly-equivalent (daily_rate_eur × 6) as weekly_rate_eur. Set expected_charter_weeks to ${weeksEq}.`;
    rateLine =
      "4. The day rate is the primary figure for this region; weekly_rate_eur = daily_rate_eur × 6.";
  } else if (modelUnits != null) {
    occHint = occPosture;
    weeksInstruction = `The number of charter WEEKS per year is FIXED at ${modelUnits} — do NOT estimate or change it. Set expected_charter_weeks to exactly ${modelUnits}. Your only job is the realistic weekly rate. The daily rate is weekly_rate_eur / 6.`;
  } else {
    occHint =
      legacyFixed != null
        ? `OVERRIDE: expected_charter_weeks MUST equal ${legacyFixed}. Do NOT change this number — estimate only the realistic weekly rate.`
        : occPosture;
    weeksInstruction =
      legacyFixed != null
        ? `The number of charter weeks per year is FIXED at ${legacyFixed}. Set expected_charter_weeks to exactly ${legacyFixed} — do NOT estimate or change it. Your only job is the weekly rate.`
        : `Decide a realistic number of charter weeks per year for this yacht in
   this region with the requested occupancy posture. Typical industry
   range: 8–18 weeks for owner-operated, 14–24 for commercially managed.`;
  }

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
3. ${weeksInstruction}
${rateLine}
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
function heuristicAiFallback(args: AiArgs, reasonOverride?: string): ComputedRevenue {
  const L = Number(args.yacht.length_meters) || 18;
  const R = REGION_RATE_MULT[args.region] ?? 1.0;

  // ── Stage 4: try market_rates seed first ─────────────────────────
  const marketRates = args.marketRates ?? [];
  const band = lengthBand(L);
  const seasonForLookup = args.season === "mixed" ? "shoulder" : args.season;
  const hit = findMarketRate(marketRates, band, seasonForLookup);

  let daily: number;
  let weekly: number;
  let dailyLow: number;
  let dailyHigh: number;
  if (hit) {
    dailyLow = Math.round(Number(hit.daily_rate_low_eur));
    dailyHigh = Math.round(Number(hit.daily_rate_high_eur));
    daily = Math.round((dailyLow + dailyHigh) / 2);
    weekly = daily * 7;
  } else {
    // Preserve pre-Stage-4 rounding: weekly is rounded from raw, daily
    // is derived from weekly. Do NOT recompute weekly = daily*7 (drift).
    let perMeter: number;
    if (L < 15) perMeter = 800;
    else if (L < 25) perMeter = 1500;
    else if (L < 40) perMeter = 2200;
    else perMeter = 3500;
    weekly = Math.round(L * perMeter * R);
    daily = Math.round(weekly / 7);
    dailyLow = Math.round(daily * 0.7);
    dailyHigh = Math.round(daily * 1.3);
  }

  // Model regions: units + multipliers come from the owner table; only the base
  // rate is heuristic. baseWeekly meaning depends on basis:
  //   • weekly basis → gross = baseWeekly × weeks, so baseWeekly IS the weekly
  //     rate (daily×7, which `weekly` already holds on a hit). This keeps
  //     Mediterranean weekly equivalent to the legacy path.
  //   • daily basis → dayRate = baseWeekly / dailyDivisor, and the market_rates
  //     seed is a DAILY rate, so on a hit baseWeekly = daily × dailyDivisor (6),
  //     NOT ×7, else the day rate inflates ~16.7%.
  const hBasis = resolveBasis(args.region, args.charterType ?? null);
  if (hBasis) {
    const hm = REGION_MODELS[args.region]!;
    const baseWeekly = hit
      ? hBasis === "weekly"
        ? weekly
        : daily * hm.dailyDivisor
      : weekly;
    const rm = regionModelRevenue(
      args.region,
      hBasis,
      args.season,
      args.occupancyTarget ?? null,
      baseWeekly,
    );
    if (rm) {
      return {
        annual_gross_eur: rm.grossEur,
        daily_rate_eur: rm.dailyRate,
        weekly_rate_eur: rm.weeklyRate,
        expected_charter_weeks: rm.physicalWeeks,
        daily_rate_low_eur: rm.dailyLow,
        daily_rate_high_eur: rm.dailyHigh,
        occupancy_pct: rm.occupancyPct,
        market_rating: null,
        comparables: [],
        reasoning:
          reasonOverride ??
          (hit
            ? `AI market lookup was unavailable. Used internal market_rates baseline (${args.yacht.yacht_type ?? "yacht"} · ${band} · ${args.region} · ${hit.season}). Add a real charter rate (manual mode) for sharper numbers.`
            : "AI market lookup was unavailable. Used a deterministic length-and-region heuristic. Add a real charter rate (manual mode) for sharper numbers."),
        confidence: "low",
        ai_used: false,
      };
    }
  }

  // Default weeks by occupancy hint, then season modifier
  const weeksByOcc: Record<string, number> = {
    conservative: 8,
    realistic: 12,
    optimistic: 18,
  };
  // Owner-defined week model is authoritative where it exists; otherwise fall
  // back to the legacy occupancy×season heuristic. Explicit target wins.
  const tw = tableWeeks(args.region, args.season, args.occupancyTarget);
  let weeks: number;
  if (tw != null) {
    weeks = tw;
  } else {
    weeks = args.occupancyTarget ? weeksByOcc[args.occupancyTarget] ?? 12 : 12;
    if (args.season === "high") weeks = Math.min(weeks, 10);
    else if (args.season === "low") weeks = Math.max(2, Math.round(weeks * 0.3));
  }
  if (args.targetWeeksOverride != null) weeks = args.targetWeeksOverride;
  weeks = Math.max(0, Math.min(52, weeks));
  const occupancyPct = Math.round((weeks / 52) * 100);
  return {
    annual_gross_eur: weekly * weeks,
    daily_rate_eur: daily,
    weekly_rate_eur: weekly,
    expected_charter_weeks: weeks,
    daily_rate_low_eur: dailyLow,
    daily_rate_high_eur: dailyHigh,
    occupancy_pct: occupancyPct,
    market_rating: null,
    comparables: [],
    reasoning:
      reasonOverride ??
      (hit
        ? `AI market lookup was unavailable. Used internal market_rates baseline (${args.yacht.yacht_type ?? "yacht"} · ${band} · ${args.region} · ${hit.season}). Add a real charter rate (manual mode) for sharper numbers.`
        : "AI market lookup was unavailable. Used a deterministic length-and-region heuristic. Add a real charter rate (manual mode) for sharper numbers."),
    confidence: "low",
    ai_used: false,
  };
}

export async function computeAiRevenue(args: AiArgs): Promise<ComputedRevenue> {
  const prompt = buildAiPrompt(args);
  let raw = "";
  let webSearchUsed = false;
  try {
    // Bound the web-search workload: "low" context + a tool-call cap keeps the
    // call comfortably inside AI_RESPONSES_TIMEOUT_MS instead of running ~9
    // search rounds. Web search must succeed here — there is NO tool-less chat
    // fallback, because a no-browse chat answer hallucinates "I cannot perform
    // live web searches" and returns €0 rates. On any failure we go straight to
    // the deterministic heuristic.
    raw = await aiResponses(
      prompt,
      "gpt-5-mini",
      [{ type: "web_search_preview", search_context_size: "low" }],
      undefined,
      5,
    );
    webSearchUsed = true;
  } catch {
    return heuristicAiFallback(args, "Live market search unavailable; heuristic fallback used.");
  }
  let parsed: Record<string, unknown>;
  try {
    parsed = extractJson(raw) as Record<string, unknown>;
  } catch {
    return heuristicAiFallback(args, "Live market search unavailable; heuristic fallback used.");
  }

  const num = (k: string, fb = 0): number => {
    const v = parsed[k];
    const n = typeof v === "number" ? v : typeof v === "string" ? parseFloat(v) : NaN;
    return isFinite(n) ? n : fb;
  };
  const rawDaily = num("daily_rate_eur");
  const rawWeekly = num("weekly_rate_eur");
  let daily = rawDaily;
  let weekly = rawWeekly;
  if (!weekly && daily) weekly = daily * 7;
  if (!daily && weekly) daily = weekly / 7;
  const dailyLow = num("daily_rate_low_eur") || null;
  const dailyHigh = num("daily_rate_high_eur") || null;
  let weeks = num("expected_charter_weeks");
  // Owner-defined week model (or explicit target) is authoritative — the AI
  // only supplies the rate. Explicit target_weeks wins over the table.
  // REGION_MODELS regions override weeks entirely in the branch below, so the
  // legacy week table is consulted ONLY for non-model regions — this keeps the
  // now-inert Mediterranean legacy entry genuinely unread.
  const aiBasis = resolveBasis(args.region, args.charterType ?? null);
  const fixedWeeks =
    args.targetWeeksOverride != null
      ? args.targetWeeksOverride
      : aiBasis != null
        ? null
        : tableWeeks(args.region, args.season, args.occupancyTarget);
  if (fixedWeeks != null) weeks = fixedWeeks;
  weeks = Math.max(0, Math.min(52, weeks));
  const occupancyPct =
    fixedWeeks != null
      ? Math.round((weeks / 52) * 100)
      : Math.round(num("occupancy_pct") || (weeks / 52) * 100);
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

  // Zero-rate guard: a valid market result must have a positive rate AND at least
  // one comparable. A non-positive rate or empty comparable list means the model
  // had no real data — reject it and use the heuristic so €0 never enters the ROI
  // calc (which would otherwise multiply fixed table weeks by €0 → €0 income).
  if (daily <= 0 || weekly <= 0 || comparables.length === 0) {
    return heuristicAiFallback(
      args,
      "Live market search unavailable; heuristic fallback used.",
    );
  }

  // Model regions: units (weeks/days) are fixed by the owner table; the AI only
  // supplied the rate. Override gross/weeks/occupancy/daily-range with the model
  // so the AI cannot drift the volume. (`aiBasis` resolved above.)
  if (aiBasis) {
    const m = REGION_MODELS[args.region]!;
    const baseWeekly = rawWeekly || rawDaily * m.dailyDivisor || weekly;
    const rm = regionModelRevenue(
      args.region,
      aiBasis,
      args.season,
      args.occupancyTarget ?? null,
      baseWeekly,
    );
    if (rm) {
      return {
        annual_gross_eur: rm.grossEur,
        daily_rate_eur: rm.dailyRate,
        weekly_rate_eur: rm.weeklyRate,
        expected_charter_weeks: rm.physicalWeeks,
        daily_rate_low_eur: rm.dailyLow,
        daily_rate_high_eur: rm.dailyHigh,
        occupancy_pct: rm.occupancyPct,
        market_rating: marketRating,
        comparables,
        reasoning: reasoning || "Estimated from comparable listings in the region.",
        confidence: webSearchUsed ? "high" : "medium",
        ai_used: true,
      };
    }
  }

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

const OCC_TEXT: Record<string, string> = {
  conservative: "conservative",
  realistic: "realistic",
  optimistic: "optimistic",
};

const SUBSEASON_LABEL: Record<string, string> = {
  peak: "Peak",
  shoulder: "Shoulder",
  high: "High",
  low: "Low",
};

const fmt = (n: number): string => Math.round(n).toLocaleString("en-US");

/**
 * Human-readable explanation of the charter-income algorithm used for THIS
 * calculation. Returns one bullet per sentence. Mirrors the branch logic of
 * computeManualRevenue / computeAiRevenue so the wording always matches the
 * path that actually produced the numbers (manual, AI region-model, or AI
 * legacy / heuristic fallback). Region-model knowledge stays in this file.
 */
export function describeRevenueMethod(
  args: {
    pricingMode: "manual_daily" | "manual_weekly" | "ai";
    region: string;
    occupancyTarget: string | null;
    charterType: string | null;
    targetWeeksOverride: number | null;
  },
  revenue: ComputedRevenue,
): string[] {
  const regionLabel = REGION_LABEL[args.region] || args.region;
  const out: string[] = [];

  if (args.pricingMode !== "ai") {
    const basisWord = args.pricingMode === "manual_daily" ? "day" : "week";
    out.push(
      `Pricing mode: manual. Your own charter rate of €${fmt(revenue.weekly_rate_eur)}/week (€${fmt(revenue.daily_rate_eur)}/day) was used directly — no market analysis was performed.`,
    );
    out.push(
      `Annual charter income = your rate × the number of booked ${basisWord}s you entered = €${fmt(revenue.annual_gross_eur)}.`,
    );
    return out;
  }

  const occ = args.occupancyTarget ?? "realistic";
  const occWord = OCC_TEXT[occ] ?? "realistic";
  const rateSource = revenue.ai_used
    ? "live comparable charter listings found by the AI market search"
    : "an internal length-and-region baseline (the live AI market lookup was unavailable, so this figure is a deterministic estimate)";

  const basis = resolveBasis(args.region, args.charterType ?? null);
  if (basis) {
    const m = REGION_MODELS[args.region]!;
    const bm = basis === "daily" ? m.daily : m.weekly;
    if (bm) {
      const unitWord = basis === "daily" ? "days" : "weeks";
      const occKey = occ as OccKey;
      const keys = bm.seasonMap["mixed"] ?? [];
      const parts: string[] = [];
      let totalUnits = 0;
      for (const k of keys) {
        const ss = bm.subSeasons[k];
        if (!ss) continue;
        const u = ss.units[occKey] ?? 0;
        totalUnits += u;
        parts.push(
          `${u} ${(SUBSEASON_LABEL[k] ?? k).toLowerCase()}-season ${unitWord} at ${Math.round(ss.mult * 100)}% of the base rate`,
        );
      }
      out.push(
        `Pricing mode: AI market rate with a fixed regional booking model. For ${regionLabel}, the number of charter ${unitWord} is fixed by Yachtworth's regional model at a ${occWord} occupancy posture across the full year — the AI does not change this volume.`,
      );
      out.push(
        `Booked ${unitWord} (full year): ${parts.join(" + ")} = ${totalUnits} ${unitWord}.`,
      );
      out.push(
        `The AI estimated only the base rate, from ${rateSource}: €${fmt(revenue.weekly_rate_eur)}/week, giving a daily rate of €${fmt(revenue.daily_rate_eur)} (weekly ÷ ${m.dailyDivisor}).`,
      );
      out.push(
        `Annual charter income = each season's booked ${unitWord} × the base rate × that season's rate multiplier = €${fmt(revenue.annual_gross_eur)}.`,
      );
      return out;
    }
  }

  const tw = tableWeeks(args.region, "mixed", args.occupancyTarget ?? null);
  out.push(
    `Pricing mode: AI market rate. For ${regionLabel}, the AI estimated the weekly charter rate from ${rateSource}.`,
  );
  if (args.targetWeeksOverride != null) {
    out.push(
      `The number of charter weeks (${revenue.expected_charter_weeks}) is the target you set for this scenario — the AI estimated only the rate.`,
    );
  } else if (tw != null) {
    out.push(
      `The number of charter weeks (${revenue.expected_charter_weeks}) is fixed by Yachtworth's regional season table at a ${occWord} occupancy posture across the full year — the AI estimated only the rate.`,
    );
  } else {
    out.push(
      `Charter weeks (${revenue.expected_charter_weeks}) reflect a ${occWord} occupancy posture for the region.`,
    );
  }
  out.push(
    `Annual charter income = €${fmt(revenue.weekly_rate_eur)}/week × ${revenue.expected_charter_weeks} weeks = €${fmt(revenue.annual_gross_eur)}.`,
  );
  return out;
}
