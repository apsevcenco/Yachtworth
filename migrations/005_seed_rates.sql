-- Yachtworth — Stage 4: seed market_rates + expense_rates with real industry data
-- plus a single-round-trip SQL function `get_roi_rates` consumed by the ROI engine.
-- Run once in Supabase SQL editor for the yachtworth-prod project.
-- Idempotent: clears seed rows by marker and uses ON CONFLICT DO UPDATE on
-- expense_rates so the unique index never blocks a re-run.
--
-- Sources: aggregated 2024-2025 averages from public broker listings
-- (YachtCharterFleet, Boatbookings, CharterWorld, Boatsetter) and
-- industry expense benchmarks. Numbers are MID-MARKET — luxury &
-- distressed segments will deviate; the engine still applies owner
-- overrides on top.

-- ──────────────────────────────────────────────────────────────────────
-- market_rates — daily charter rate bands (EUR)
-- Combinations: yacht_type × length_band × region × season
-- Seeded: motor_yacht / catamaran / sailing_yacht for the two main
-- charter markets (Mediterranean + Caribbean). Other regions/types fall
-- back to the engine's deterministic heuristic.
-- ──────────────────────────────────────────────────────────────────────
delete from public.market_rates where source = 'yachtworth_seed_v1';

insert into public.market_rates
  (yacht_type, length_band, region, season, daily_rate_low_eur, daily_rate_high_eur, source)
values
  -- Mediterranean — motor_yacht
  ('motor_yacht',  '12-15m', 'mediterranean', 'high',     1200,  1800, 'yachtworth_seed_v1'),
  ('motor_yacht',  '12-15m', 'mediterranean', 'shoulder',  900,  1300, 'yachtworth_seed_v1'),
  ('motor_yacht',  '12-15m', 'mediterranean', 'low',       600,   900, 'yachtworth_seed_v1'),
  ('motor_yacht',  '15-20m', 'mediterranean', 'high',     2500,  4500, 'yachtworth_seed_v1'),
  ('motor_yacht',  '15-20m', 'mediterranean', 'shoulder', 1800,  3200, 'yachtworth_seed_v1'),
  ('motor_yacht',  '15-20m', 'mediterranean', 'low',      1200,  2200, 'yachtworth_seed_v1'),
  ('motor_yacht',  '20-30m', 'mediterranean', 'high',     6000, 12000, 'yachtworth_seed_v1'),
  ('motor_yacht',  '20-30m', 'mediterranean', 'shoulder', 4500,  9000, 'yachtworth_seed_v1'),
  ('motor_yacht',  '20-30m', 'mediterranean', 'low',      3000,  6000, 'yachtworth_seed_v1'),
  ('motor_yacht',  '30m+',   'mediterranean', 'high',    15000, 35000, 'yachtworth_seed_v1'),
  ('motor_yacht',  '30m+',   'mediterranean', 'shoulder',11000, 25000, 'yachtworth_seed_v1'),
  ('motor_yacht',  '30m+',   'mediterranean', 'low',      8000, 18000, 'yachtworth_seed_v1'),
  -- Mediterranean — catamaran
  ('catamaran',    '12-15m', 'mediterranean', 'high',     1000,  1500, 'yachtworth_seed_v1'),
  ('catamaran',    '12-15m', 'mediterranean', 'shoulder',  700,  1100, 'yachtworth_seed_v1'),
  ('catamaran',    '12-15m', 'mediterranean', 'low',       500,   800, 'yachtworth_seed_v1'),
  ('catamaran',    '15-20m', 'mediterranean', 'high',     1800,  3200, 'yachtworth_seed_v1'),
  ('catamaran',    '15-20m', 'mediterranean', 'shoulder', 1300,  2300, 'yachtworth_seed_v1'),
  ('catamaran',    '15-20m', 'mediterranean', 'low',       900,  1600, 'yachtworth_seed_v1'),
  ('catamaran',    '20-30m', 'mediterranean', 'high',     4500,  9000, 'yachtworth_seed_v1'),
  ('catamaran',    '20-30m', 'mediterranean', 'shoulder', 3300,  6500, 'yachtworth_seed_v1'),
  ('catamaran',    '20-30m', 'mediterranean', 'low',      2200,  4500, 'yachtworth_seed_v1'),
  -- Mediterranean — sailing_yacht
  ('sailing_yacht','12-15m', 'mediterranean', 'high',      800,  1300, 'yachtworth_seed_v1'),
  ('sailing_yacht','12-15m', 'mediterranean', 'shoulder',  600,  1000, 'yachtworth_seed_v1'),
  ('sailing_yacht','12-15m', 'mediterranean', 'low',       400,   700, 'yachtworth_seed_v1'),
  ('sailing_yacht','15-20m', 'mediterranean', 'high',     1500,  2800, 'yachtworth_seed_v1'),
  ('sailing_yacht','15-20m', 'mediterranean', 'shoulder', 1100,  2000, 'yachtworth_seed_v1'),
  ('sailing_yacht','15-20m', 'mediterranean', 'low',       750,  1400, 'yachtworth_seed_v1'),
  ('sailing_yacht','20-30m', 'mediterranean', 'high',     3500,  7500, 'yachtworth_seed_v1'),
  ('sailing_yacht','20-30m', 'mediterranean', 'shoulder', 2500,  5500, 'yachtworth_seed_v1'),
  ('sailing_yacht','20-30m', 'mediterranean', 'low',      1700,  3700, 'yachtworth_seed_v1'),
  -- Caribbean — motor_yacht (peak season is Dec–Apr, opposite of Med)
  ('motor_yacht',  '12-15m', 'caribbean',     'high',     1400,  2000, 'yachtworth_seed_v1'),
  ('motor_yacht',  '12-15m', 'caribbean',     'shoulder', 1000,  1500, 'yachtworth_seed_v1'),
  ('motor_yacht',  '12-15m', 'caribbean',     'low',       700,  1100, 'yachtworth_seed_v1'),
  ('motor_yacht',  '15-20m', 'caribbean',     'high',     2800,  5000, 'yachtworth_seed_v1'),
  ('motor_yacht',  '15-20m', 'caribbean',     'shoulder', 2000,  3500, 'yachtworth_seed_v1'),
  ('motor_yacht',  '15-20m', 'caribbean',     'low',      1400,  2500, 'yachtworth_seed_v1'),
  ('motor_yacht',  '20-30m', 'caribbean',     'high',     6500, 13000, 'yachtworth_seed_v1'),
  ('motor_yacht',  '20-30m', 'caribbean',     'shoulder', 5000,  9500, 'yachtworth_seed_v1'),
  ('motor_yacht',  '20-30m', 'caribbean',     'low',      3300,  6500, 'yachtworth_seed_v1'),
  ('motor_yacht',  '30m+',   'caribbean',     'high',    16000, 38000, 'yachtworth_seed_v1'),
  ('motor_yacht',  '30m+',   'caribbean',     'shoulder',12000, 27000, 'yachtworth_seed_v1'),
  ('motor_yacht',  '30m+',   'caribbean',     'low',      8500, 19000, 'yachtworth_seed_v1'),
  -- Caribbean — catamaran (the dominant charter type here)
  ('catamaran',    '12-15m', 'caribbean',     'high',     1100,  1700, 'yachtworth_seed_v1'),
  ('catamaran',    '12-15m', 'caribbean',     'shoulder',  800,  1200, 'yachtworth_seed_v1'),
  ('catamaran',    '12-15m', 'caribbean',     'low',       550,   900, 'yachtworth_seed_v1'),
  ('catamaran',    '15-20m', 'caribbean',     'high',     2000,  3500, 'yachtworth_seed_v1'),
  ('catamaran',    '15-20m', 'caribbean',     'shoulder', 1400,  2500, 'yachtworth_seed_v1'),
  ('catamaran',    '15-20m', 'caribbean',     'low',      1000,  1800, 'yachtworth_seed_v1'),
  ('catamaran',    '20-30m', 'caribbean',     'high',     5000, 10000, 'yachtworth_seed_v1'),
  ('catamaran',    '20-30m', 'caribbean',     'shoulder', 3700,  7200, 'yachtworth_seed_v1'),
  ('catamaran',    '20-30m', 'caribbean',     'low',      2500,  5000, 'yachtworth_seed_v1'),
  -- Caribbean — sailing_yacht
  ('sailing_yacht','12-15m', 'caribbean',     'high',      900,  1500, 'yachtworth_seed_v1'),
  ('sailing_yacht','12-15m', 'caribbean',     'shoulder',  650,  1100, 'yachtworth_seed_v1'),
  ('sailing_yacht','12-15m', 'caribbean',     'low',       450,   800, 'yachtworth_seed_v1'),
  ('sailing_yacht','15-20m', 'caribbean',     'high',     1700,  3000, 'yachtworth_seed_v1'),
  ('sailing_yacht','15-20m', 'caribbean',     'shoulder', 1200,  2200, 'yachtworth_seed_v1'),
  ('sailing_yacht','15-20m', 'caribbean',     'low',       850,  1500, 'yachtworth_seed_v1');

-- ──────────────────────────────────────────────────────────────────────
-- expense_rates — operational cost benchmarks (EUR / unit)
-- Categories with `region = 'global'` apply when no regional override exists.
-- Per-meter and per-guest values come from broker management reports.
-- The expense engine uses these via lookupExpense() → falls back to its
-- hard-coded heuristic if no row matches.
-- ──────────────────────────────────────────────────────────────────────
-- Note: expense_rates has a unique index on (category, region, coalesce(length_band,'')).
-- Using ON CONFLICT DO UPDATE so re-runs refresh values and never error on existing keys.

insert into public.expense_rates
  (category, region, length_band, value, unit, notes)
values
  -- Mooring (€ / m / month)
  ('mooring_per_meter_month',         'mediterranean',  null,  80,   'eur', 'yachtworth_seed_v1'),
  ('mooring_per_meter_month',         'caribbean',      null,  90,   'eur', 'yachtworth_seed_v1'),
  ('mooring_per_meter_month',         'northern_europe',null,  65,   'eur', 'yachtworth_seed_v1'),
  ('mooring_per_meter_month',         'asia_pacific_me',null,  70,   'eur', 'yachtworth_seed_v1'),
  ('mooring_per_meter_month',         'middle_east',    null, 110,   'eur', 'yachtworth_seed_v1'),
  -- Fuel (€ / m / month — averaged across season + idle)
  ('fuel_per_meter_month',            'mediterranean',  null, 200,   'eur', 'yachtworth_seed_v1'),
  ('fuel_per_meter_month',            'caribbean',      null, 220,   'eur', 'yachtworth_seed_v1'),
  ('fuel_per_meter_month',            'northern_europe',null, 180,   'eur', 'yachtworth_seed_v1'),
  ('fuel_per_meter_month',            'asia_pacific_me',null, 200,   'eur', 'yachtworth_seed_v1'),
  ('fuel_per_meter_month',            'middle_east',    null, 250,   'eur', 'yachtworth_seed_v1'),
  -- Antifouling / haul-out (€ / m / year)
  ('antifouling_per_meter_year',      'mediterranean',  null, 300,   'eur', 'yachtworth_seed_v1'),
  ('antifouling_per_meter_year',      'caribbean',      null, 320,   'eur', 'yachtworth_seed_v1'),
  ('antifouling_per_meter_year',      'northern_europe',null, 280,   'eur', 'yachtworth_seed_v1'),
  ('antifouling_per_meter_year',      'asia_pacific_me',null, 310,   'eur', 'yachtworth_seed_v1'),
  ('antifouling_per_meter_year',      'middle_east',    null, 380,   'eur', 'yachtworth_seed_v1'),
  -- Registration / flag — leisure (€ / year)
  ('registration_leisure_year',       'mediterranean',  null, 2000,  'eur', 'yachtworth_seed_v1'),
  ('registration_leisure_year',       'caribbean',      null, 2500,  'eur', 'yachtworth_seed_v1'),
  ('registration_leisure_year',       'northern_europe',null, 1800,  'eur', 'yachtworth_seed_v1'),
  ('registration_leisure_year',       'asia_pacific_me',null, 2200,  'eur', 'yachtworth_seed_v1'),
  ('registration_leisure_year',       'middle_east',    null, 3000,  'eur', 'yachtworth_seed_v1'),
  -- Registration / flag — commercial (€ / year)
  ('registration_commercial_year',    'mediterranean',  null, 3500,  'eur', 'yachtworth_seed_v1'),
  ('registration_commercial_year',    'caribbean',      null, 4500,  'eur', 'yachtworth_seed_v1'),
  ('registration_commercial_year',    'northern_europe',null, 3000,  'eur', 'yachtworth_seed_v1'),
  ('registration_commercial_year',    'asia_pacific_me',null, 4000,  'eur', 'yachtworth_seed_v1'),
  ('registration_commercial_year',    'middle_east',    null, 5500,  'eur', 'yachtworth_seed_v1'),
  -- Global benchmarks (region 'global' as sentinel)
  ('insurance_pct_of_value_year',     'global',         null, 1.0,   'pct', 'yachtworth_seed_v1'),
  ('maintenance_pct_of_value_year',   'global',         null, 1.5,   'pct', 'yachtworth_seed_v1'),
  ('refit_reserve_pct_of_value_year', 'global',         null, 1.0,   'pct', 'yachtworth_seed_v1'),
  ('provisioning_per_guest_month',    'global',         null, 800,   'eur', 'yachtworth_seed_v1'),
  ('comms_monthly',                   'global',         null, 600,   'eur', 'yachtworth_seed_v1'),
  ('classification_leisure_year',     'global',         null, 1500,  'eur', 'yachtworth_seed_v1'),
  ('classification_commercial_year',  'global',         null, 8000,  'eur', 'yachtworth_seed_v1'),
  ('misc_monthly',                    'global',         null, 1000,  'eur', 'yachtworth_seed_v1')
on conflict (category, region, coalesce(length_band, '')) do update
  set value = excluded.value,
      unit = excluded.unit,
      notes = excluded.notes,
      updated_at = now();

-- ──────────────────────────────────────────────────────────────────────
-- get_roi_rates(yacht_type, region) → single-round-trip lookup for the
-- ROI engine. Returns one JSON object with both rate arrays so the API
-- server does ONE Supabase request per ROI calculation, not two.
-- ──────────────────────────────────────────────────────────────────────
create or replace function public.get_roi_rates(
  p_yacht_type text,
  p_region text
) returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'market', coalesce(
      (select jsonb_agg(jsonb_build_object(
        'yacht_type', m.yacht_type,
        'length_band', m.length_band,
        'region', m.region,
        'season', m.season,
        'daily_rate_low_eur', m.daily_rate_low_eur,
        'daily_rate_high_eur', m.daily_rate_high_eur
      ))
      from public.market_rates m
      where (p_yacht_type is null or m.yacht_type = p_yacht_type)
        and m.region = p_region),
      '[]'::jsonb
    ),
    'expense', coalesce(
      (select jsonb_agg(jsonb_build_object(
        'category', e.category,
        'region', e.region,
        'length_band', e.length_band,
        'value', e.value,
        'unit', e.unit
      ))
      from public.expense_rates e
      where e.region = p_region or e.region = 'global'),
      '[]'::jsonb
    )
  );
$$;
