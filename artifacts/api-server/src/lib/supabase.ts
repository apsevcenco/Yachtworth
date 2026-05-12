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
  cached = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}

export const ESTIMATES_TABLE = "estimates";
