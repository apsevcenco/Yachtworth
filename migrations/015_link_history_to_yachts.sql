-- Yachtworth — link estimates + cost_estimates to a yacht profile (optional).
-- Allows the Yacht Detail → History tab to show all related rows for one yacht.
-- Idempotent: safe to re-run.

-- 1. estimates.yacht_id
alter table public.estimates
  add column if not exists yacht_id uuid references public.yachts(id) on delete set null;

create index if not exists estimates_yacht_id_idx
  on public.estimates (yacht_id) where yacht_id is not null;

-- 2. cost_estimates.yacht_id
alter table public.cost_estimates
  add column if not exists yacht_id uuid references public.yachts(id) on delete set null;

create index if not exists cost_estimates_yacht_id_idx
  on public.cost_estimates (yacht_id) where yacht_id is not null;
