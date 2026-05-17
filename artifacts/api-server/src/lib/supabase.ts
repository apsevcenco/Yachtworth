import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { logger } from "./logger";

let cached: SupabaseClient | null | undefined;

export function getSupabase(): SupabaseClient | null {
  if (cached !== undefined) return cached;
  const url = process.env["SUPABASE_URL"];
  const serviceKey = process.env["SUPABASE_SERVICE_ROLE_KEY"];
  if (!url || !serviceKey) {
    logger.warn(
      "Supabase not configured — estimate history persistence disabled.",
    );
    cached = null;
    return cached;
  }
  if (!/^https?:\/\//i.test(url)) {
    logger.error(
      { urlPrefix: url.slice(0, 12) },
      "SUPABASE_URL is not an HTTPS project URL (looks like a Postgres connection string). " +
        "Set SUPABASE_URL to the project URL from Supabase dashboard → Project Settings → API → Project URL " +
        "(format: https://<ref>.supabase.co). History persistence disabled until fixed.",
    );
    cached = null;
    return cached;
  }
  try {
    cached = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  } catch (err) {
    logger.error(
      { err: err instanceof Error ? err.message : String(err) },
      "Failed to construct Supabase client — history persistence disabled.",
    );
    cached = null;
  }
  return cached;
}

export const ESTIMATES_TABLE = "estimates";
export const YACHTS_TABLE = "yachts";
export const ROI_CALCULATIONS_TABLE = "roi_calculations";
export const MARKET_RATES_TABLE = "market_rates";
export const EXPENSE_RATES_TABLE = "expense_rates";
export const COST_ESTIMATES_TABLE = "cost_estimates";
