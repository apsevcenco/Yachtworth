-- 024_survey_specification_fields.sql
-- Full report-level technical specification fields for Survey reports.
--
-- Safe to run on existing data: all fields are nullable and additive.

alter table public.survey_reports
  add column if not exists loa_meters numeric,
  add column if not exists lwl_meters numeric,
  add column if not exists beam_meters numeric,
  add column if not exists draft_meters numeric,
  add column if not exists displacement_text text,
  add column if not exists hull_material text,
  add column if not exists deck_material text,
  add column if not exists keel_type text,
  add column if not exists engines_text text,
  add column if not exists transmissions_text text,
  add column if not exists fuel_capacity_l numeric,
  add column if not exists fresh_water_l numeric,
  add column if not exists black_water_l text,
  add column if not exists grey_water_l text,
  add column if not exists specification_source text;
