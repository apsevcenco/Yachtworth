create table if not exists public.flag_registries (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  flag_name text not null,
  country text,
  registry_type text not null default 'open',
  private_available boolean not null default true,
  commercial_available boolean not null default false,
  max_gt integer,
  min_gt integer,
  accepted_class jsonb not null default '[]'::jsonb,
  registration_cost_eur integer,
  annual_fee_eur integer,
  mortgage_available boolean not null default false,
  temporary_registration boolean not null default false,
  permanent_registration boolean not null default true,
  radio_license boolean not null default true,
  processing_time_days_min integer,
  processing_time_days_max integer,
  survey_required boolean not null default true,
  classification_required boolean not null default false,
  owner_nationality_restrictions text,
  company_restrictions text,
  crew_restrictions text,
  vat_notes text,
  insurance_notes text,
  advantages jsonb not null default '[]'::jsonb,
  disadvantages jsonb not null default '[]'::jsonb,
  official_website text,
  official_forms jsonb not null default '[]'::jsonb,
  legal_partners jsonb not null default '[]'::jsonb,
  verification_notes text,
  last_updated date,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists flag_registries_active_idx
  on public.flag_registries (active, flag_name);

comment on table public.flag_registries is
  'Flag Intelligence registry facts and future paid legal/registration provider placements.';

comment on column public.flag_registries.legal_partners is
  'Array of legal or registration providers attached to this flag. Intended for future sponsored/ad partner placements.';
