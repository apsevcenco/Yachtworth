/**
 * Stage 4 — data-driven baseline rates.
 *
 * Loads curated charter rates and expense benchmarks from Supabase
 * (`market_rates` + `expense_rates`, seeded by migrations/005_seed_rates.sql)
 * once per ROI calculation, then exposes synchronous lookup helpers that
 * the revenue and expense engines call instead of guessing.
 *
 * If Supabase is unreachable, the seed has not been applied yet, or no
 * row matches the lookup, callers gracefully fall back to their existing
 * length × region heuristics — no ROI calculation ever fails purely
 * because the rate tables are empty.
 */
import { getSupabase } from "../supabase";
import { logger } from "../logger";

export interface MarketRateRow {
  yacht_type: string;
  length_band: string;
  region: string;
  season: string;
  daily_rate_low_eur: number;
  daily_rate_high_eur: number;
}

export interface ExpenseRateRow {
  category: string;
  region: string;
  length_band: string | null;
  value: number;
  unit: string;
}

export interface RoiRates {
  market: MarketRateRow[];
  expense: ExpenseRateRow[];
  loaded: boolean;
}

const EMPTY_RATES: RoiRates = { market: [], expense: [], loaded: false };

/**
 * Map a metric length to one of the bands used by market_rates seed.
 * < 12m yachts are bucketed into the 12-15m band (closest comparable).
 */
export function lengthBand(meters: number): string {
  if (!isFinite(meters) || meters <= 0) return "15-20m";
  if (meters < 15) return "12-15m";
  if (meters < 20) return "15-20m";
  if (meters < 30) return "20-30m";
  return "30m+";
}

interface LoadArgs {
  yachtType: string | null;
  lengthMeters: number;
  region: string;
}

/**
 * Pre-fetch every rate row the engine could need for this ROI calculation
 * via a single Supabase RPC call to `get_roi_rates(yacht_type, region)`
 * (defined in migrations/005_seed_rates.sql). One network round-trip per
 * ROI run regardless of how many rate categories the engine consults.
 *
 * If Supabase is unconfigured, the RPC is missing (seed not applied), or
 * the call errors, we return EMPTY_RATES and callers degrade to their
 * built-in heuristics — no ROI run ever fails because of rate loading.
 */
export async function loadRoiRates({ yachtType, region }: LoadArgs): Promise<RoiRates> {
  const supabase = getSupabase();
  if (!supabase) return EMPTY_RATES;

  try {
    const { data, error } = await supabase.rpc("get_roi_rates", {
      p_yacht_type: yachtType,
      p_region: region,
    });
    if (error) {
      logger.warn(
        { err: error.message },
        "get_roi_rates RPC failed — falling back to heuristic.",
      );
      return EMPTY_RATES;
    }
    const obj = (data ?? {}) as { market?: unknown; expense?: unknown };
    const market = Array.isArray(obj.market) ? (obj.market as MarketRateRow[]) : [];
    const expense = Array.isArray(obj.expense) ? (obj.expense as ExpenseRateRow[]) : [];
    return { market, expense, loaded: true };
  } catch (err) {
    logger.warn(
      { err: err instanceof Error ? err.message : String(err) },
      "loadRoiRates threw — falling back to heuristic.",
    );
    return EMPTY_RATES;
  }
}

/**
 * Find the most specific market_rate band for this combination.
 * Mediterranean caters across all seasons; if no exact season match,
 * falls back to 'shoulder' as the safest midpoint.
 */
export function findMarketRate(
  rates: MarketRateRow[],
  bandLabel: string,
  season: string,
): MarketRateRow | null {
  const exact = rates.find((r) => r.length_band === bandLabel && r.season === season);
  if (exact) return exact;
  const shoulderFallback = rates.find(
    (r) => r.length_band === bandLabel && r.season === "shoulder",
  );
  return shoulderFallback ?? null;
}

/**
 * Lookup an expense rate, preferring regional row over global, and
 * length-band match over no-band match. Returns the value (numeric) or
 * null if not seeded.
 */
export function findExpense(
  rates: ExpenseRateRow[],
  category: string,
  region: string,
  band: string | null = null,
): number | null {
  // Best match: exact region + exact band
  if (band) {
    const exact = rates.find(
      (r) => r.category === category && r.region === region && r.length_band === band,
    );
    if (exact) return Number(exact.value);
  }
  // Regional, any band
  const regional = rates.find(
    (r) => r.category === category && r.region === region && r.length_band == null,
  );
  if (regional) return Number(regional.value);
  // Global, any band
  const global = rates.find(
    (r) => r.category === category && r.region === "global",
  );
  if (global) return Number(global.value);
  return null;
}
