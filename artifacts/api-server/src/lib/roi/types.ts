/**
 * Shape of a row from public.yachts. Mirrors the columns we SELECT in
 * routes/yachts.ts (YACHT_COLUMNS). Numeric DB columns come back as
 * `string` in node-postgres-style adapters; supabase-js usually returns
 * `number`. We accept either at the type level to keep the engine
 * defensive — all callers go through Number(...).
 */
export interface YachtRow {
  id: string;
  clerk_user_id: string;
  created_at: string;
  updated_at: string;
  name?: string | null;
  brand?: string | null;
  model?: string | null;
  year_built?: number | null;
  yacht_type?: string | null;
  configuration?: string | null;
  length_meters?: number | string | null;
  beam_meters?: number | string | null;
  cabins?: number | null;
  guests?: number | null;
  crew?: number | null;
  engine_hours?: number | null;
  marina_location?: string | null;
  flag?: string | null;
  commercial_registration?: boolean | null;
  purchase_price_eur?: number | string | null;
  purchase_year?: number | null;
  financing_type?: string | null;
  loan_amount_eur?: number | string | null;
  loan_rate_pct?: number | null;
  loan_term_years?: number | null;
  monthly_crew_eur?: number | string | null;
  monthly_mooring_eur?: number | string | null;
  monthly_fuel_eur?: number | string | null;
  monthly_provisioning_eur?: number | string | null;
  monthly_communications_eur?: number | string | null;
  monthly_maintenance_eur?: number | string | null;
  monthly_management_fee_eur?: number | string | null;
  monthly_misc_eur?: number | string | null;
  annual_insurance_eur?: number | string | null;
  annual_registration_eur?: number | string | null;
  annual_classification_eur?: number | string | null;
  annual_antifouling_eur?: number | string | null;
  engine_service_eur?: number | string | null;
  generator_service_eur?: number | string | null;
  annual_refit_reserve_eur?: number | string | null;
  charter_commission_pct?: number | null;
}
