-- Yachtworth — Charter ROI module (Phase 2, Stage 2.5)
-- Adds expense fields to the yachts profile so ROI engine can use real
-- owner-known numbers instead of falling back to regional averages.
-- Run AFTER 002_charter_roi.sql. Safe to re-run.

alter table public.yachts
  -- ── Monthly operating expenses (EUR / month) ─────────────────────────
  add column if not exists monthly_crew_eur numeric(12, 2),
  add column if not exists monthly_mooring_eur numeric(12, 2),
  add column if not exists monthly_fuel_eur numeric(12, 2),
  add column if not exists monthly_provisioning_eur numeric(12, 2),
  add column if not exists monthly_communications_eur numeric(12, 2),
  add column if not exists monthly_maintenance_eur numeric(12, 2),
  add column if not exists monthly_management_fee_eur numeric(12, 2),
  add column if not exists monthly_misc_eur numeric(12, 2),

  -- ── Annual / one-off fixed expenses (EUR / year) ────────────────────
  add column if not exists annual_insurance_eur numeric(12, 2),
  add column if not exists annual_registration_eur numeric(12, 2),
  add column if not exists annual_classification_eur numeric(12, 2),
  add column if not exists annual_antifouling_eur numeric(12, 2),
  add column if not exists annual_refit_reserve_eur numeric(12, 2),

  -- ── Charter-specific ────────────────────────────────────────────────
  -- Broker commission, expressed as % of gross charter revenue (e.g. 15.0)
  add column if not exists charter_commission_pct real;
