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
export const CHARTERS_TABLE = "charters";
export const CLIENTS_TABLE = "clients";
export const YACHT_EQUIPMENT_TABLE = "yacht_equipment";
export const YACHT_PHOTOS_BUCKET = "yacht-photos";
export const LISTINGS_TABLE = "listings";
export const YACHT_NETWORK_LISTINGS_TABLE = "yacht_network_listings";
export const PROPOSALS_TABLE = "proposals";
export const SURVEY_REPORTS_TABLE = "survey_reports";
export const SURVEY_ITEMS_TABLE = "survey_items";
export const SURVEY_SEA_TRIAL_TABLE = "survey_sea_trial";
export const SURVEY_ITEM_PHOTOS_BUCKET = "survey-item-photos";
export const SURVEYOR_ASSETS_BUCKET = "surveyor-assets";
export const SURVEY_VOICE_NOTES_TABLE = "survey_voice_notes";
export const SURVEY_VOICE_NOTES_BUCKET = "survey-voice-notes";
export const FLAG_REGISTRIES_TABLE = "flag_registries";
export const FLAG_FEE_RULES_TABLE = "flag_fee_rules";
export const FLAG_SOURCES_TABLE = "flag_sources";
export const FLAG_REQUIRED_DOCUMENTS_TABLE = "flag_required_documents";
export const FLAG_CHANGE_LOG_TABLE = "flag_change_log";
export const FLAG_IMPORT_RUNS_TABLE = "flag_import_runs";
export const FLAG_COMPARISON_FACTS_TABLE = "flag_comparison_facts";
export const FLAG_ADVISOR_SCENARIOS_TABLE = "flag_advisor_scenarios";
export const FLAG_ADVISOR_SCENARIO_SCORES_TABLE = "flag_advisor_scenario_scores";
export const BROKER_CONTACTS_TABLE = "broker_contacts";
export const BROKER_COMPANIES_TABLE = "broker_companies";
export const BROKER_CASES_TABLE = "broker_cases";
export const BROKER_TASKS_TABLE = "broker_tasks";
export const BROKER_ACTIVITY_TABLE = "broker_activity";
export const MAINTENANCE_SYSTEM_TEMPLATES_TABLE = "maintenance_system_templates";
export const MAINTENANCE_SYSTEMS_TABLE = "maintenance_systems";
export const EQUIPMENT_LOCATIONS_TABLE = "equipment_locations";
export const MAINTENANCE_VENDORS_TABLE = "maintenance_vendors";
export const EQUIPMENT_ASSETS_TABLE = "equipment_assets";
export const EQUIPMENT_COUNTERS_TABLE = "equipment_counters";
export const COUNTER_READINGS_TABLE = "counter_readings";
export const MAINTENANCE_PLANS_TABLE = "maintenance_plans";
export const MAINTENANCE_INTERVALS_TABLE = "maintenance_intervals";
export const MAINTENANCE_TASKS_TABLE = "maintenance_tasks";
export const WORK_ORDERS_TABLE = "work_orders";
export const WORK_ORDER_ASSETS_TABLE = "work_order_assets";
export const SERVICE_EVENTS_TABLE = "service_events";
export const SERVICE_EVENT_CORRECTIONS_TABLE = "service_event_corrections";
export const DEFECTS_TABLE = "defects";
export const SPARE_PARTS_TABLE = "spare_parts";
export const INVENTORY_MOVEMENTS_TABLE = "inventory_movements";
export const MAINTENANCE_DOCUMENTS_TABLE = "maintenance_documents";
export const MAINTENANCE_AUDIT_EVENTS_TABLE = "maintenance_audit_events";
export const MAINTENANCE_NOTIFICATIONS_TABLE = "maintenance_notifications";
export const MAINTENANCE_DOCUMENTS_BUCKET = "maintenance-documents";
