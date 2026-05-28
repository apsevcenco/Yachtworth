-- Yachtworth — Charter Planner Full Update (May 2026)
-- Run AFTER 008_charter_planner.sql. Safe to re-run.
-- Adds: VAT-on-top fields, APA fund + expense itemization, transfer fee,
--       contract status/date, time fields, extra services, damages, refunds,
--       expanded crew (first officer, chef, deckhand), per-week pricing,
--       charter rate-period enum extension, and a per-charter income
--       distribution table.
-- All RLS: deny_all (service-role bypass). Scoping via clerk_user_id.

-- ─────────────────────────────────────────────────────────────────────────────
-- charters: add all new columns (idempotent)
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.charters
  -- Booking metadata
  add column if not exists contact_name text,
  add column if not exists contract_status text not null default 'not_signed',
  add column if not exists contract_date date,

  -- Logistics
  add column if not exists mooring_port text,
  add column if not exists pickup_port text,
  add column if not exists dropoff_port text,
  add column if not exists transfer_fee numeric(12, 2) not null default 0,
  add column if not exists transfer_fee_note text,
  add column if not exists transfer_fee_paid_by text not null default 'client',
  add column if not exists departure_time text,
  add column if not exists return_time text,

  -- Pricing
  add column if not exists charter_rate_period text not null default 'fixed',

  -- APA
  add column if not exists apa_enabled boolean not null default false,
  add column if not exists apa_percent numeric(5, 2) not null default 30,
  add column if not exists apa_amount numeric(14, 2) not null default 0,
  add column if not exists apa_fuel numeric(12, 2) not null default 0,
  add column if not exists apa_provisioning numeric(12, 2) not null default 0,
  add column if not exists apa_beverages numeric(12, 2) not null default 0,
  add column if not exists apa_marina_fees numeric(12, 2) not null default 0,
  add column if not exists apa_communications numeric(12, 2) not null default 0,
  add column if not exists apa_crew_gratuities numeric(12, 2) not null default 0,
  add column if not exists apa_activities numeric(12, 2) not null default 0,
  add column if not exists apa_activities_note text,
  add column if not exists apa_other numeric(12, 2) not null default 0,
  add column if not exists apa_other_note text,

  -- Refund
  add column if not exists refund_amount numeric(12, 2) not null default 0,
  add column if not exists refund_reason text,

  -- Extra services + damage
  add column if not exists extra_service_amount numeric(12, 2) not null default 0,
  add column if not exists extra_service_note text,
  add column if not exists damage_amount numeric(12, 2) not null default 0,
  add column if not exists damage_note text,
  add column if not exists damage_paid_by text not null default 'client',

  -- Expanded crew
  add column if not exists first_officer_name text,
  add column if not exists first_officer_day_rate numeric(10, 2) not null default 0,
  add column if not exists chef_included boolean not null default false,
  add column if not exists chef_day_rate numeric(10, 2) not null default 0,
  add column if not exists deckhand_count integer not null default 0,
  add column if not exists deckhand_day_rate numeric(10, 2) not null default 0,

  -- Income distribution (jsonb — keeps API simple, no separate CRUD)
  -- shape: [{ name: string, type: 'percent'|'fixed', value: number }]
  add column if not exists distribution jsonb not null default '[]'::jsonb;

-- Allow new charter_rate_type 'per_week' in addition to existing 'fixed','per_day'.
-- Drop+recreate the check (no-op if same set already enforced).
alter table public.charters drop constraint if exists charters_rate_type_check;
alter table public.charters
  add constraint charters_rate_type_check
  check (charter_rate_type in ('fixed', 'per_day', 'per_week'));

-- Constraints on new fields
alter table public.charters drop constraint if exists charters_contract_status_check;
alter table public.charters
  add constraint charters_contract_status_check
  check (contract_status in ('not_signed', 'sent', 'signed'));

alter table public.charters drop constraint if exists charters_charter_rate_period_check;
alter table public.charters
  add constraint charters_charter_rate_period_check
  check (charter_rate_period in ('fixed', 'per_day', 'per_week'));

alter table public.charters drop constraint if exists charters_transfer_paid_by_check;
alter table public.charters
  add constraint charters_transfer_paid_by_check
  check (transfer_fee_paid_by in ('client', 'owner', 'agent'));

alter table public.charters drop constraint if exists charters_damage_paid_by_check;
alter table public.charters
  add constraint charters_damage_paid_by_check
  check (damage_paid_by in ('client', 'insurance', 'owner'));

alter table public.charters drop constraint if exists charters_apa_percent_check;
alter table public.charters
  add constraint charters_apa_percent_check
  check (apa_percent >= 0 and apa_percent <= 100);

alter table public.charters drop constraint if exists charters_deckhand_count_check;
alter table public.charters
  add constraint charters_deckhand_count_check
  check (deckhand_count >= 0);

-- ─────────────────────────────────────────────────────────────────────────────
-- Backfill: keep charter_rate_period in sync with legacy charter_rate_type
-- (run once; safe to re-run since update is idempotent for existing rows)
-- ─────────────────────────────────────────────────────────────────────────────
update public.charters
   set charter_rate_period = charter_rate_type
 where charter_rate_period is null
    or charter_rate_period <> charter_rate_type;
