-- Yachtworth — Charter Planner module
-- Run AFTER 007_cost_estimates.sql. Safe to re-run.
-- Adds:
--   • photo_url + notes + home_port to yachts (reuse existing fleet)
--   • charters (bookings with full P&L fields)
--   • clients (auto-populated from charter saves)
-- RLS: deny_all (service-role bypass). Scoping via clerk_user_id.

-- ─────────────────────────────────────────────────────────────────────────────
-- yachts: add fleet-display fields (other fields stay from 002/003/004)
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.yachts
  add column if not exists photo_url text,
  add column if not exists notes text,
  add column if not exists home_port text;

-- ─────────────────────────────────────────────────────────────────────────────
-- charters: bookings / trips per yacht with full P&L data
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.charters (
  id uuid primary key default gen_random_uuid(),
  yacht_id uuid not null references public.yachts(id) on delete cascade,
  clerk_user_id text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  status text not null default 'confirmed',
    -- confirmed | tentative | maintenance | blocked | cancelled

  -- Client
  client_name text,
  client_email text,
  client_phone text,

  -- Dates / ports
  start_date date not null,
  end_date date not null,
  departure_port text,
  return_port text,

  -- Vessel usage
  engine_hours_before numeric(10, 1),
  engine_hours_after numeric(10, 1),
  fuel_liters numeric(12, 2),
  fuel_price_per_liter numeric(10, 4),

  -- Crew
  captain_name text,
  captain_day_rate numeric(10, 2),
  stewardess_count integer not null default 0,
  stewardess_day_rate numeric(10, 2),
  extra_crew_cost numeric(12, 2),
  extra_crew_note text,

  -- Revenue
  charter_rate_type text not null default 'fixed',  -- 'fixed' | 'per_day'
  charter_rate numeric(14, 2),
  deposit_amount numeric(14, 2),
  deposit_date date,
  deposit_received boolean not null default false,
  final_payment_amount numeric(14, 2),
  final_payment_date date,
  final_payment_received boolean not null default false,
  vat_applicable boolean not null default false,
  vat_percent numeric(5, 2) not null default 0,

  -- Expenses
  port_fees numeric(12, 2) not null default 0,
  provisioning numeric(12, 2) not null default 0,
  cleaning numeric(12, 2) not null default 0,
  other_expenses numeric(12, 2) not null default 0,
  other_expenses_note text,

  notes text,

  constraint charters_dates_check check (end_date >= start_date),
  constraint charters_status_check check (
    status in ('confirmed', 'tentative', 'maintenance', 'blocked', 'cancelled')
  ),
  constraint charters_rate_type_check check (
    charter_rate_type in ('fixed', 'per_day')
  ),
  constraint charters_stewardess_count_check check (stewardess_count >= 0)
);

create index if not exists charters_yacht_dates_idx
  on public.charters (yacht_id, start_date, end_date);

create index if not exists charters_user_updated_idx
  on public.charters (clerk_user_id, updated_at desc);

create index if not exists charters_user_dates_idx
  on public.charters (clerk_user_id, start_date, end_date);

-- updated_at touch trigger
create or replace function public.charters_touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end$$;

drop trigger if exists charters_touch_updated_at_trg on public.charters;
create trigger charters_touch_updated_at_trg
  before update on public.charters
  for each row execute function public.charters_touch_updated_at();

alter table public.charters enable row level security;
drop policy if exists charters_deny_all on public.charters;
create policy charters_deny_all on public.charters for all using (false) with check (false);

-- ─────────────────────────────────────────────────────────────────────────────
-- clients: auto-populated from charters (one row per (user, name))
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  clerk_user_id text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  name text not null,
  email text,
  phone text,
  notes text,
  constraint clients_user_name_unique unique (clerk_user_id, name)
);

create index if not exists clients_user_updated_idx
  on public.clients (clerk_user_id, updated_at desc);

alter table public.clients enable row level security;
drop policy if exists clients_deny_all on public.clients;
create policy clients_deny_all on public.clients for all using (false) with check (false);
