-- Yachtworth — estimates history
-- Run once in Supabase SQL editor (Project → SQL Editor → New query → paste → Run).
-- Safe to re-run: uses IF NOT EXISTS / IF NOT EXISTS DO NOTHING patterns.

create extension if not exists "pgcrypto";

create table if not exists public.estimates (
  id uuid primary key default gen_random_uuid(),
  clerk_user_id text not null,
  created_at timestamptz not null default now(),

  -- Denormalised for listing (avoid jsonb traversal in list view)
  yacht_label text,
  yacht_type text,
  length_meters real,
  estimated_price_eur numeric(14, 2) not null,
  currency text not null default 'EUR',

  -- Full payloads for replay
  request jsonb not null,
  result jsonb not null
);

create index if not exists estimates_user_created_idx
  on public.estimates (clerk_user_id, created_at desc);

-- Service role bypasses RLS, but enable + lock down anon/authenticated reads
-- so nobody can read or write via REST without going through the API server.
alter table public.estimates enable row level security;
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'estimates' and policyname = 'deny_all'
  ) then
    create policy deny_all on public.estimates for all using (false) with check (false);
  end if;
end $$;
