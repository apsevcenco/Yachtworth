-- Yachtworth — Survey Report Builder persistence (T-SurveyBuilder).
-- 3 tables: survey_reports (header), survey_items (per-item checklist),
-- survey_sea_trial (1:1 with report). Idempotent, safe to re-run.

create table if not exists public.survey_reports (
  id uuid primary key default gen_random_uuid(),
  clerk_user_id text not null,
  yacht_id uuid references public.yachts(id) on delete set null,

  -- Cover / vessel
  vessel_name text not null,
  vessel_type text,
  manufacturer text,
  model text,
  year_built integer,
  flag text,
  hin text,
  lying text,
  survey_date date,
  survey_purpose text default 'Pre-purchase',
  weather_conditions text,
  sea_state text,

  -- Client
  client_name text,
  client_email text,
  client_phone text,

  -- Surveyor
  surveyor_name text,
  surveyor_qualification text,
  surveyor_company text,
  surveyor_phone text,
  surveyor_email text,
  surveyor_logo_url text,
  surveyor_signature_url text,

  -- Status
  status text not null default 'draft' check (status in ('draft', 'complete')),
  overall_condition text,

  -- Counters (auto-recalculated on item save)
  total_recommendations_a integer not null default 0,
  total_recommendations_b integer not null default 0,
  total_recommendations_c integer not null default 0,
  total_recommendations_d integer not null default 0,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists survey_reports_user_idx
  on public.survey_reports (clerk_user_id, created_at desc);
create index if not exists survey_reports_yacht_idx
  on public.survey_reports (yacht_id) where yacht_id is not null;

create table if not exists public.survey_items (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.survey_reports(id) on delete cascade,
  section_number integer not null,
  section_name text not null,
  item_number text not null,
  description text,
  condition text,
  notes text,
  recommendation_level text check (recommendation_level in ('A','B','C','D')),
  recommendation_text text,
  photo_urls jsonb not null default '[]'::jsonb,
  moisture_reading numeric,
  moisture_level text check (moisture_level in ('Low','Medium','High')),
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists survey_items_report_idx
  on public.survey_items (report_id, section_number, sort_order);

create table if not exists public.survey_sea_trial (
  report_id uuid primary key references public.survey_reports(id) on delete cascade,
  trial_date date,
  location text,
  weather text,
  sea_state text,
  narrative text,
  rpm_table jsonb not null default '[]'::jsonb,
  tickover_rpm integer,
  tickover_speed numeric,
  max_rpm integer,
  max_speed numeric,
  additional_observations text,
  updated_at timestamptz not null default now()
);

-- RLS deny_all; service-role bypasses (matches all other tables).
alter table public.survey_reports enable row level security;
alter table public.survey_items enable row level security;
alter table public.survey_sea_trial enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='survey_reports' and policyname='deny_all') then
    create policy deny_all on public.survey_reports for all using (false) with check (false);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='survey_items' and policyname='deny_all') then
    create policy deny_all on public.survey_items for all using (false) with check (false);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='survey_sea_trial' and policyname='deny_all') then
    create policy deny_all on public.survey_sea_trial for all using (false) with check (false);
  end if;
end $$;
