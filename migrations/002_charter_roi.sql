-- Yachtworth — Charter ROI module (Phase 2, Stage 1)
-- Run once in Supabase SQL editor.
-- Safe to re-run: uses IF NOT EXISTS patterns.

create extension if not exists "pgcrypto";

-- ─────────────────────────────────────────────────────────────────────────────
-- yachts: persistent yacht profiles owned by users.
-- A user may have multiple yacht profiles. Used as the input subject for ROI
-- calculations, depreciation forecasts, and (later) digital passport.
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.yachts (
  id uuid primary key default gen_random_uuid(),
  clerk_user_id text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Identity
  name text,
  brand text,
  model text,
  year_built integer,
  yacht_type text,                    -- motor_yacht / sailing_yacht / catamaran / superyacht
  configuration text,                 -- Flybridge / Open / Sloop / etc.

  -- Capacity
  length_meters real,
  beam_meters real,
  cabins integer,
  guests integer,
  crew integer,

  -- Operational state
  engine_hours integer,
  marina_location text,
  flag text,
  commercial_registration boolean,

  -- Acquisition
  purchase_price_eur numeric(14, 2),
  purchase_year integer,
  financing_type text,                -- 'cash' | 'loan'
  loan_amount_eur numeric(14, 2),
  loan_rate_pct real,
  loan_term_years integer
);

create index if not exists yachts_user_updated_idx
  on public.yachts (clerk_user_id, updated_at desc);

alter table public.yachts enable row level security;
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'yachts' and policyname = 'deny_all'
  ) then
    create policy deny_all on public.yachts for all using (false) with check (false);
  end if;
end $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- roi_calculations: saved Charter ROI runs for a given yacht.
-- Stores both inputs (region, mgmt style, target occupancy) and AI result.
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.roi_calculations (
  id uuid primary key default gen_random_uuid(),
  yacht_id uuid not null references public.yachts(id) on delete cascade,
  clerk_user_id text not null,
  created_at timestamptz not null default now(),

  -- Denormalised for listing
  region text,
  annual_revenue_eur numeric(14, 2),
  annual_expenses_eur numeric(14, 2),
  net_profit_eur numeric(14, 2),
  roi_pct real,
  payback_years real,

  -- Full payloads for replay
  input jsonb not null,
  result jsonb not null
);

create index if not exists roi_calculations_user_created_idx
  on public.roi_calculations (clerk_user_id, created_at desc);
create index if not exists roi_calculations_yacht_idx
  on public.roi_calculations (yacht_id, created_at desc);

alter table public.roi_calculations enable row level security;
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'roi_calculations' and policyname = 'deny_all'
  ) then
    create policy deny_all on public.roi_calculations for all using (false) with check (false);
  end if;
end $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- market_rates: internal seed table of charter day-rates by segment.
-- Populated progressively in Stage 4. Used as the deterministic baseline
-- before AI web-search adjustment.
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.market_rates (
  id bigserial primary key,
  yacht_type text not null,
  length_band text not null,          -- e.g. '12-15m', '15-20m', '20-30m', '30m+'
  region text not null,               -- mediterranean / caribbean / northern_europe / asia_pacific_me
  season text not null,               -- 'high' | 'shoulder' | 'low'
  daily_rate_low_eur numeric(10, 2) not null,
  daily_rate_high_eur numeric(10, 2) not null,
  source text,
  updated_at timestamptz not null default now()
);

create index if not exists market_rates_lookup_idx
  on public.market_rates (yacht_type, length_band, region, season);

alter table public.market_rates enable row level security;
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'market_rates' and policyname = 'deny_all'
  ) then
    create policy deny_all on public.market_rates for all using (false) with check (false);
  end if;
end $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- expense_rates: regional cost coefficients used by Expense Engine (Stage 3).
-- One row per (category, region [, length_band]) → numeric value + unit.
-- Examples:
--   ('marina_per_meter_year', 'mediterranean', '15-20m', 2400, 'eur')
--   ('insurance_pct_of_value', 'global',       NULL,     0.95, 'pct')
--   ('captain_monthly',       'mediterranean', '20-30m', 9000, 'eur')
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.expense_rates (
  id bigserial primary key,
  category text not null,
  region text not null,
  length_band text,
  value numeric(14, 4) not null,
  unit text not null,
  notes text,
  updated_at timestamptz not null default now()
);

create unique index if not exists expense_rates_uq
  on public.expense_rates (category, region, coalesce(length_band, ''));

alter table public.expense_rates enable row level security;
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'expense_rates' and policyname = 'deny_all'
  ) then
    create policy deny_all on public.expense_rates for all using (false) with check (false);
  end if;
end $$;
