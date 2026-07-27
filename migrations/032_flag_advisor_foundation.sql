-- Yachtworth Flag Advisor V1 foundation.
-- Extends the earlier lightweight flag_registries table without breaking the
-- existing Flag Intelligence screen/API.

alter table public.flag_registries
  add column if not exists slug text,
  add column if not exists country_or_territory text,
  add column if not exists official_registry_name text,
  add column if not exists registry_family text,
  add column if not exists is_eu_flag boolean,
  add column if not exists private_registration_status text,
  add column if not exists commercial_registration_status text,
  add column if not exists private_minimum_loa text,
  add column if not exists commercial_minimum_loa text,
  add column if not exists maximum_loa_gt_notes text,
  add column if not exists passenger_limit_notes text,
  add column if not exists provisional_registration_status text,
  add column if not exists provisional_validity text,
  add column if not exists permanent_validity text,
  add column if not exists owner_eligibility text,
  add column if not exists foreign_company_ownership text,
  add column if not exists local_agent_requirement text,
  add column if not exists mortgage_registration_status text,
  add column if not exists radio_licence_requirement text,
  add column if not exists classification_requirement text,
  add column if not exists survey_inspection_requirement text,
  add column if not exists commercial_yacht_code text,
  add column if not exists minimum_safe_manning text,
  add column if not exists indicative_processing_time text,
  add column if not exists vat_tax_note text,
  add column if not exists crew_note text,
  add column if not exists required_documents_summary text,
  add column if not exists objective_advantages text,
  add column if not exists limitations_and_risks text,
  add column if not exists confidence_level text,
  add column if not exists coverage_status text,
  add column if not exists missing_verification_notes text,
  add column if not exists official_registry_url text,
  add column if not exists primary_fee_url text,
  add column if not exists last_verified_at date,
  add column if not exists source_version text,
  add column if not exists import_key text,
  add column if not exists data_quality_status text,
  add column if not exists data_quality_score integer,
  add column if not exists original_row jsonb not null default '{}'::jsonb;

update public.flag_registries
   set slug = coalesce(slug, code),
       country_or_territory = coalesce(country_or_territory, country),
       official_registry_url = coalesce(official_registry_url, official_website),
       last_verified_at = coalesce(last_verified_at, last_updated),
       source_version = coalesce(source_version, 'legacy-v0'),
       import_key = coalesce(import_key, code)
 where slug is null
    or country_or_territory is null
    or official_registry_url is null
    or source_version is null
    or import_key is null;

create unique index if not exists flag_registries_slug_uidx
  on public.flag_registries (slug);

create unique index if not exists flag_registries_import_key_uidx
  on public.flag_registries (import_key);

create index if not exists flag_registries_quality_idx
  on public.flag_registries (is_eu_flag, confidence_level, coverage_status, data_quality_status);

alter table public.flag_registries
  drop constraint if exists flag_registries_private_registration_status_check,
  add constraint flag_registries_private_registration_status_check
    check (private_registration_status is null or private_registration_status in ('yes','no','partial','case_dependent','not_confirmed','not_applicable','quote_required')),
  drop constraint if exists flag_registries_commercial_registration_status_check,
  add constraint flag_registries_commercial_registration_status_check
    check (commercial_registration_status is null or commercial_registration_status in ('yes','no','partial','case_dependent','not_confirmed','not_applicable','quote_required')),
  drop constraint if exists flag_registries_data_quality_status_check,
  add constraint flag_registries_data_quality_status_check
    check (data_quality_status is null or data_quality_status in ('production_ready','usable_with_warnings','research_required'));

create table if not exists public.flag_sources (
  id uuid primary key default gen_random_uuid(),
  flag_registry_id uuid references public.flag_registries(id) on delete cascade,
  topic text not null,
  source_type text,
  source_title text,
  official_url text not null,
  checked_at date,
  effective_date date,
  notes text,
  is_official boolean not null default true,
  is_active boolean not null default true,
  source_version text,
  import_key text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (import_key)
);

create index if not exists flag_sources_registry_idx
  on public.flag_sources (flag_registry_id, is_active, topic);

create table if not exists public.flag_fee_rules (
  id uuid primary key default gen_random_uuid(),
  flag_registry_id uuid not null references public.flag_registries(id) on delete cascade,
  registration_type text,
  fee_component text not null,
  amount numeric,
  currency text,
  formula_text text,
  minimum_amount numeric,
  maximum_amount numeric,
  loa_min numeric,
  loa_max numeric,
  gt_min numeric,
  gt_max numeric,
  vessel_category text,
  validity_period text,
  effective_from date,
  effective_to date,
  notes text,
  official_source_id uuid references public.flag_sources(id) on delete set null,
  official_source_url text,
  confidence_level text,
  last_verified_at date,
  is_active boolean not null default true,
  source_version text,
  import_key text not null,
  original_row jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (import_key)
);

create index if not exists flag_fee_rules_registry_idx
  on public.flag_fee_rules (flag_registry_id, registration_type, is_active);

create index if not exists flag_fee_rules_lookup_idx
  on public.flag_fee_rules (currency, fee_component, last_verified_at);

alter table public.flag_fee_rules
  drop constraint if exists flag_fee_rules_currency_check,
  add constraint flag_fee_rules_currency_check
    check (currency is null or currency ~ '^[A-Z]{3}$');

create table if not exists public.flag_required_documents (
  id uuid primary key default gen_random_uuid(),
  flag_registry_id uuid not null references public.flag_registries(id) on delete cascade,
  registration_type text,
  document_name text not null,
  document_category text,
  is_required boolean not null default true,
  condition_text text,
  source_id uuid references public.flag_sources(id) on delete set null,
  confidence_level text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists flag_required_documents_registry_idx
  on public.flag_required_documents (flag_registry_id, registration_type, sort_order);

create table if not exists public.flag_change_log (
  id uuid primary key default gen_random_uuid(),
  flag_registry_id uuid references public.flag_registries(id) on delete set null,
  entity_type text not null,
  entity_id uuid,
  change_type text not null,
  previous_value jsonb,
  new_value jsonb,
  changed_by text,
  change_reason text,
  source_id uuid references public.flag_sources(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists flag_change_log_registry_idx
  on public.flag_change_log (flag_registry_id, created_at desc);

create table if not exists public.flag_import_runs (
  id uuid primary key default gen_random_uuid(),
  filename text not null,
  file_hash text not null,
  source_version text not null,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  imported_rows integer not null default 0,
  updated_rows integer not null default 0,
  skipped_rows integer not null default 0,
  failed_rows integer not null default 0,
  errors jsonb not null default '[]'::jsonb,
  imported_by text,
  status text not null default 'started',
  report jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists flag_import_runs_started_idx
  on public.flag_import_runs (started_at desc);

comment on table public.flag_fee_rules is
  'Auditable official registry fee records. Keep original formulas and quote-required notes; do not replace with private agent package prices.';

comment on table public.flag_sources is
  'Official and supporting source index for yacht flag registry facts.';

comment on table public.flag_import_runs is
  'Every Flag Advisor workbook import run, including workbook hash and validation report.';
