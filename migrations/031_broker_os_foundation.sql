-- Yachtworth Broker OS foundation.
-- Case-first CRM for brokerage operations. Safe to re-run.

create table if not exists public.broker_companies (
  id uuid primary key default gen_random_uuid(),
  clerk_user_id text not null,
  name text not null,
  company_type text,
  country text,
  website text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.broker_contacts (
  id uuid primary key default gen_random_uuid(),
  clerk_user_id text not null,
  company_id uuid references public.broker_companies(id) on delete set null,
  source_client_id uuid references public.clients(id) on delete set null,
  full_name text not null,
  email text,
  phone text,
  whatsapp text,
  linkedin text,
  country text,
  citizenship text,
  residency text,
  languages jsonb not null default '[]'::jsonb,
  preferred_channel text,
  relationship_owner text,
  relationship_type text,
  trust_level text,
  source text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.broker_cases (
  id uuid primary key default gen_random_uuid(),
  clerk_user_id text not null,
  contact_id uuid references public.broker_contacts(id) on delete set null,
  company_id uuid references public.broker_companies(id) on delete set null,
  title text not null,
  case_type text not null,
  stage text not null default 'new_inquiry',
  lead_score text not null default 'B',
  status text not null default 'active',
  owner_name text,
  budget_min_eur numeric(14, 2),
  budget_max_eur numeric(14, 2),
  loa_min_m numeric(8, 2),
  loa_max_m numeric(8, 2),
  timeline text,
  preferred_regions jsonb not null default '[]'::jsonb,
  mandatory_requirements jsonb not null default '[]'::jsonb,
  preferred_requirements jsonb not null default '[]'::jsonb,
  acceptable_compromises jsonb not null default '[]'::jsonb,
  rejected_characteristics jsonb not null default '[]'::jsonb,
  next_action text,
  next_action_due date,
  last_meaningful_contact_at timestamptz,
  risk_level text not null default 'medium',
  risk_reason text,
  expected_commission_eur numeric(14, 2),
  close_probability integer not null default 30,
  forecast_close_date date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint broker_cases_case_type_check check (
    case_type in (
      'buyer_inquiry','seller_mandate','charter_inquiry','charter_central_agency',
      'yacht_management','new_build','refit','valuation','survey','financing',
      'insurance','flag_registration','transport','crew','off_market_introduction'
    )
  ),
  constraint broker_cases_status_check check (status in ('active','paused','won','lost','archived')),
  constraint broker_cases_score_check check (lead_score in ('A','B','C','D')),
  constraint broker_cases_risk_check check (risk_level in ('low','medium','high')),
  constraint broker_cases_probability_check check (close_probability >= 0 and close_probability <= 100)
);

create table if not exists public.broker_tasks (
  id uuid primary key default gen_random_uuid(),
  clerk_user_id text not null,
  case_id uuid references public.broker_cases(id) on delete cascade,
  contact_id uuid references public.broker_contacts(id) on delete set null,
  title text not null,
  detail text,
  due_date date,
  priority text not null default 'normal',
  status text not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint broker_tasks_priority_check check (priority in ('low','normal','high','urgent')),
  constraint broker_tasks_status_check check (status in ('open','done','cancelled'))
);

create table if not exists public.broker_activity (
  id uuid primary key default gen_random_uuid(),
  clerk_user_id text not null,
  case_id uuid references public.broker_cases(id) on delete cascade,
  contact_id uuid references public.broker_contacts(id) on delete set null,
  activity_type text not null,
  channel text,
  subject text,
  body text,
  happened_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists broker_contacts_user_updated_idx
  on public.broker_contacts (clerk_user_id, updated_at desc);

create unique index if not exists broker_contacts_user_source_client_unique
  on public.broker_contacts (clerk_user_id, source_client_id);

create index if not exists broker_cases_user_status_due_idx
  on public.broker_cases (clerk_user_id, status, next_action_due);

create index if not exists broker_tasks_user_status_due_idx
  on public.broker_tasks (clerk_user_id, status, due_date);

create index if not exists broker_activity_case_time_idx
  on public.broker_activity (case_id, happened_at desc);

alter table public.broker_companies enable row level security;
alter table public.broker_contacts enable row level security;
alter table public.broker_cases enable row level security;
alter table public.broker_tasks enable row level security;
alter table public.broker_activity enable row level security;

drop policy if exists broker_companies_deny_all on public.broker_companies;
drop policy if exists broker_contacts_deny_all on public.broker_contacts;
drop policy if exists broker_cases_deny_all on public.broker_cases;
drop policy if exists broker_tasks_deny_all on public.broker_tasks;
drop policy if exists broker_activity_deny_all on public.broker_activity;

create policy broker_companies_deny_all on public.broker_companies for all using (false) with check (false);
create policy broker_contacts_deny_all on public.broker_contacts for all using (false) with check (false);
create policy broker_cases_deny_all on public.broker_cases for all using (false) with check (false);
create policy broker_tasks_deny_all on public.broker_tasks for all using (false) with check (false);
create policy broker_activity_deny_all on public.broker_activity for all using (false) with check (false);
