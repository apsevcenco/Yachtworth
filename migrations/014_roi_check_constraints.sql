-- Migration 014 — DB-level CHECK constraints (architect-deferred hardening)
-- Defense-in-depth for ROI / Charter / Cost numerics. App layer already
-- validates, but DB-level guards catch direct SQL writes and migration bugs.

-- yachts: financial + percent fields
do $$
begin
  if not exists (select 1 from information_schema.check_constraints where constraint_name = 'yachts_commission_pct_range') then
    alter table public.yachts
      add constraint yachts_commission_pct_range
      check (charter_commission_pct is null or (charter_commission_pct >= 0 and charter_commission_pct <= 100));
  end if;

  if not exists (select 1 from information_schema.check_constraints where constraint_name = 'yachts_loan_rate_pct_range') then
    alter table public.yachts
      add constraint yachts_loan_rate_pct_range
      check (loan_rate_pct is null or (loan_rate_pct >= 0 and loan_rate_pct <= 50));
  end if;

  if not exists (select 1 from information_schema.check_constraints where constraint_name = 'yachts_purchase_price_nonneg') then
    alter table public.yachts
      add constraint yachts_purchase_price_nonneg
      check (purchase_price_eur is null or purchase_price_eur >= 0);
  end if;

  if not exists (select 1 from information_schema.check_constraints where constraint_name = 'yachts_loan_amount_nonneg') then
    alter table public.yachts
      add constraint yachts_loan_amount_nonneg
      check (loan_amount_eur is null or loan_amount_eur >= 0);
  end if;
end $$;

-- roi_calculations: required numeric outputs must be sane
do $$
begin
  if not exists (select 1 from information_schema.check_constraints where constraint_name = 'roi_calc_revenue_nonneg') then
    alter table public.roi_calculations
      add constraint roi_calc_revenue_nonneg
      check (annual_revenue_eur >= 0);
  end if;

  if not exists (select 1 from information_schema.check_constraints where constraint_name = 'roi_calc_expenses_nonneg') then
    alter table public.roi_calculations
      add constraint roi_calc_expenses_nonneg
      check (annual_expenses_eur >= 0);
  end if;
end $$;

-- cost_estimates: total must be non-negative
do $$
begin
  if not exists (select 1 from information_schema.check_constraints where constraint_name = 'cost_estimates_total_nonneg') then
    alter table public.cost_estimates
      add constraint cost_estimates_total_nonneg
      check (total_annual_eur >= 0);
  end if;
end $$;

-- charters: net financial values can be negative (loss); just guard rates
do $$
begin
  if not exists (select 1 from information_schema.check_constraints where constraint_name = 'charters_vat_pct_range') then
    alter table public.charters
      add constraint charters_vat_pct_range
      check (vat_percent is null or (vat_percent >= 0 and vat_percent <= 100));
  end if;

  if not exists (select 1 from information_schema.check_constraints where constraint_name = 'charters_apa_pct_range') then
    alter table public.charters
      add constraint charters_apa_pct_range
      check (apa_percent is null or (apa_percent >= 0 and apa_percent <= 100));
  end if;
end $$;
