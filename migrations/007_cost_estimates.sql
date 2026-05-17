-- Annual Cost Estimator — separate module per owner spec.
-- Stores user-saved cost-only calculations (independent of ROI history).

create table if not exists cost_estimates (
  id uuid primary key default gen_random_uuid(),
  clerk_user_id text not null,
  created_at timestamptz not null default now(),
  -- Optional user-given name for history list. If null, UI derives one from yacht_name + total.
  name text,
  -- Denormalized header fields for cheap list rendering.
  yacht_name text,
  yacht_class text not null,
  length_meters numeric(6,2) not null,
  year_built integer not null,
  region text not null,
  usage_type text not null,
  total_annual_eur numeric(14,2) not null,
  currency text not null default 'EUR',
  -- Full payload for re-opening + edit.
  input jsonb not null,
  result jsonb not null
);

create index if not exists idx_cost_estimates_user_created
  on cost_estimates(clerk_user_id, created_at desc);

alter table cost_estimates enable row level security;
drop policy if exists cost_estimates_deny_all on cost_estimates;
create policy cost_estimates_deny_all on cost_estimates for all using (false);
-- Service role bypasses RLS; backend is the only writer/reader.
