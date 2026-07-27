-- 025_survey_sea_trial_dynamic_table.sql
-- Editable sea-trial table columns and rows.
--
-- Safe to run on existing data: additive JSONB fields with defaults.

alter table public.survey_sea_trial
  add column if not exists rpm_table_columns jsonb not null default '[]'::jsonb,
  add column if not exists rpm_table_rows jsonb not null default '[]'::jsonb;
