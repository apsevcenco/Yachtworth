-- Yachtworth — Yacht Proposal Builder persistence (T-YachtProposal).
-- Pure document builder (no AI). Stores settings snapshot + yacht snapshot so
-- a proposal can be re-opened and re-exported as PDF without server work.
-- Idempotent, safe to re-run.

create table if not exists public.proposals (
  id uuid primary key default gen_random_uuid(),
  clerk_user_id text not null,
  yacht_id uuid references public.yachts(id) on delete set null,
  yacht_name text not null,
  proposal_type text not null check (proposal_type in ('sale', 'charter', 'both')),
  language text not null,
  yacht_snapshot jsonb,
  settings_snapshot jsonb,
  equipment_snapshot jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists proposals_user_idx
  on public.proposals (clerk_user_id, created_at desc);

create index if not exists proposals_yacht_idx
  on public.proposals (yacht_id) where yacht_id is not null;

-- RLS deny_all; service-role bypasses (matches all other tables).
alter table public.proposals enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'proposals' and policyname = 'deny_all'
  ) then
    create policy deny_all on public.proposals for all using (false) with check (false);
  end if;
end $$;
