-- Stage 2.6 — crew breakdown by position
-- Adds a JSONB column so the form can capture per-role monthly salary +
-- months of employment per year (e.g. captain 12mo permanent, deckhand 6mo
-- summer-only). monthly_crew_eur from migration 003 is kept and is now
-- automatically derived by the client as sum(salary * months/12) so the
-- existing ROI engine path (which reads monthly_crew_eur) keeps working
-- unchanged. Idempotent.

alter table public.yachts
  add column if not exists crew_breakdown jsonb;

comment on column public.yachts.crew_breakdown is
  'Array of { role: text, monthly_salary_eur: number, months_per_year: int 1..12 }. Derived monthly_crew_eur is also stored separately for ROI engine compatibility.';
