-- Yachtworth Flag Advisor V2 comparison/ranking layer.
--
-- This migration intentionally does not overwrite the verified guide profiles
-- in flag_registries. V2 comparison/ranking data is stored separately so draft
-- matrices, scenario-specific scores and future imports cannot pollute the
-- canonical flag facts shown in each flag card.

create table if not exists public.flag_comparison_facts (
  id uuid primary key default gen_random_uuid(),
  flag_registry_id uuid not null references public.flag_registries(id) on delete cascade,
  source_version text not null,
  source_label text,

  imo_member boolean,
  paris_mou_status text,
  tokyo_mou_status text,
  uscg_qualship21 boolean,
  detention_rate_pct numeric,

  processing_time_min_days integer,
  processing_time_max_days integer,

  individual_eligible boolean,
  corporate_eligible boolean,
  eu_citizens_eligible boolean,
  non_eu_eligible boolean,
  agent_required boolean,
  residency_required boolean,
  preferred_structure text,

  private_min_loa_m numeric,
  private_max_loa_m numeric,
  commercial_min_loa_m numeric,
  commercial_max_loa_m numeric,
  passenger_limit_commercial integer,
  passenger_limit_pyc integer,
  bareboat_permitted boolean,

  fee_currency text,
  initial_private_24m numeric,
  initial_commercial_24m numeric,
  annual_private_24m numeric,
  annual_commercial_24m numeric,
  mortgage_registration_fee numeric,

  corporate_tax_pct numeric,
  capital_gains_tax_pct numeric,
  vat_pct numeric,
  withholding_tax_pct numeric,
  eu_vat_exposure text,
  tonnage_tax_regime boolean,

  stcw_required boolean,
  mlc_required boolean,
  crew_nationality_restrictions boolean,
  safe_manning_document boolean,

  survey_private_under_24m_required boolean,
  survey_commercial_required boolean,
  enhanced_survey_age_years integer,
  recognized_organizations jsonb not null default '[]'::jsonb,
  coding_standard text,

  mortgage_available boolean,
  mortgage_priority_rule text,
  mortgage_legal_framework text,
  charter_permitted boolean,
  coding_required boolean,
  cabotage_rights boolean,
  eu_charter_license boolean,

  insurance_perception text,
  finance_market text,

  validation_status text not null default 'draft',
  verification_notes text,
  original_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (flag_registry_id, source_version)
);

create index if not exists flag_comparison_facts_registry_idx
  on public.flag_comparison_facts (flag_registry_id, validation_status);

create index if not exists flag_comparison_facts_lookup_idx
  on public.flag_comparison_facts (paris_mou_status, eu_vat_exposure, agent_required, survey_private_under_24m_required);

alter table public.flag_comparison_facts
  drop constraint if exists flag_comparison_facts_validation_status_check,
  add constraint flag_comparison_facts_validation_status_check
    check (validation_status in ('draft','needs_review','verified','rejected'));

alter table public.flag_comparison_facts
  drop constraint if exists flag_comparison_facts_fee_currency_check,
  add constraint flag_comparison_facts_fee_currency_check
    check (fee_currency is null or fee_currency ~ '^[A-Z]{3}$');

create table if not exists public.flag_advisor_scenarios (
  id uuid primary key default gen_random_uuid(),
  scenario_key text not null unique,
  scenario_name text not null,
  description text,
  profile jsonb not null default '{}'::jsonb,
  scoring_weights jsonb not null default '{}'::jsonb,
  source_version text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists flag_advisor_scenarios_active_idx
  on public.flag_advisor_scenarios (active, scenario_key);

create table if not exists public.flag_advisor_scenario_scores (
  id uuid primary key default gen_random_uuid(),
  scenario_id uuid not null references public.flag_advisor_scenarios(id) on delete cascade,
  flag_registry_id uuid not null references public.flag_registries(id) on delete cascade,
  rank integer,
  score numeric,
  first_year_cost_eur_est numeric,
  eu_vat_exposure_rating text,
  france_base_compatibility text,
  language_fit text,
  renovation_fit text,
  overall_label text,
  recommended boolean,
  recommendation_label text,
  rationale jsonb not null default '{}'::jsonb,
  validation_status text not null default 'draft',
  source_version text,
  original_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (scenario_id, flag_registry_id)
);

create index if not exists flag_advisor_scenario_scores_rank_idx
  on public.flag_advisor_scenario_scores (scenario_id, rank, score desc);

alter table public.flag_advisor_scenario_scores
  drop constraint if exists flag_advisor_scenario_scores_validation_status_check,
  add constraint flag_advisor_scenario_scores_validation_status_check
    check (validation_status in ('draft','needs_review','verified','rejected'));

insert into public.flag_advisor_scenarios (
  scenario_key,
  scenario_name,
  description,
  profile,
  scoring_weights,
  source_version,
  active
) values (
  'budget_300k_south_france_renovation_zero_french',
  'Budget 300k / South of France / Renovation / Zero French',
  'Scenario ranking layer for a budget-conscious owner based in South of France with a renovation project, talent entrepreneur visa context and no French language.',
  '{
    "budget_eur": 300000,
    "base": "South of France",
    "project": "Renovation project",
    "visa_context": "Talent entrepreneur visa",
    "language": "Zero French"
  }'::jsonb,
  '{
    "budget": 0.30,
    "eu_vat_exposure": 0.20,
    "france_base": 0.20,
    "language": 0.15,
    "renovation": 0.15
  }'::jsonb,
  'flag-registry-base-v2-2026-07-29',
  true
)
on conflict (scenario_key) do update set
  scenario_name = excluded.scenario_name,
  description = excluded.description,
  profile = excluded.profile,
  scoring_weights = excluded.scoring_weights,
  source_version = excluded.source_version,
  active = true,
  updated_at = now();

comment on table public.flag_comparison_facts is
  'V2 normalized comparison facts for Flag Advisor. Use for matrix/comparison UI after validation; do not treat draft rows as canonical registry guidance.';

comment on table public.flag_advisor_scenarios is
  'Named user-profile scenarios used by Flag Advisor ranking. Scenarios are separate from canonical flag facts.';

comment on table public.flag_advisor_scenario_scores is
  'Per-scenario flag ranking scores. These are subjective/advisory and must not overwrite flag_registries facts.';
