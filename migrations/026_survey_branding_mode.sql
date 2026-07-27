-- 026_survey_branding_mode.sql
-- Survey PDF branding mode.
--
-- Safe to run on existing data: additive nullable field with a conservative default.

alter table public.survey_reports
  add column if not exists branding_mode text not null default 'yachtworth';

do $$
begin
  if not exists (
    select 1
      from pg_constraint
     where conrelid = 'public.survey_reports'::regclass
       and conname = 'survey_reports_branding_mode_check'
  ) then
    alter table public.survey_reports
      add constraint survey_reports_branding_mode_check
      check (branding_mode in ('white_label', 'yachtworth', 'surveyor'));
  end if;
end $$;
