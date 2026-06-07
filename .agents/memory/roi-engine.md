---
name: ROI engine financing + expense fallback quirks
description: Non-obvious behaviors of the api-server ROI engine that affect any per-calc override or new caller.
---

# ROI engine quirks (`artifacts/api-server/src/lib/roi/`)

## Loan repayment ignores `financing_type`
`index.ts` computes the annuity purely from `loan_amount_eur / loan_rate_pct / loan_term_years`. It never reads `financing_type`.
**Why:** so a "cash" choice does NOT stop a loan charge by itself.
**How to apply:** to express a cash purchase you must null the loan_* fields. The ROI overrides merge (`applyRoiOverrides` in `routes/roi.ts`) does this when `financing_type === "cash"`.

## Blank expense lines are mostly omitted, NOT regionally estimated
`expenses.ts buildExpenses` only auto-estimates when blank: Routine maintenance (always) and Charter broker commission (default 15%). Management fee is owner-manual-only now (no auto-estimate — see "Season is NOT a user input" below). Every other crew/monthly/annual line that is blank is dropped from the report (treated as €0), which inflates ROI if the user expected a baseline.
**How to apply:** UI copy must not promise "empty = regional average". Tell users a blank line is excluded except those three.

## Engine reads `monthly_crew_eur`, not `crew_breakdown`
The crew total fed to ROI is the single `monthly_crew_eur` column. `crew_breakdown` jsonb is for the editor/history only. Any crew override must compute and send `monthly_crew_eur`.
**Crew `count` (headcount) is a frontend-only multiplier:** each `CrewRow` has `count` (1..50, default 1) and salary is PER PERSON. `computeCrewMonthlyTotal` does `salary * count * months/12` and folds it into `monthly_crew_eur`; the engine never sees `count`. `count` is in the OpenAPI `CrewMember` schema (optional, default 1) only so it survives zod and round-trips in the stored `crew_breakdown` snapshot for re-open. Legacy rows without `count` hydrate to 1 → totals byte-identical.

## Season is NOT a user input — full-year only, driven by occupancy posture
The ROI questionnaire has NO season picker and NO management-style picker (owner removed both, June 2026). The frontend never sends `season` or `management_style`; both are absent from `RoiCalculationInput` in openapi. Backend hard-codes `season: "mixed"` into `computeAiRevenue` (full year = blend of all sub-seasons). The user-facing knob that selects region numbers is the **occupancy posture** (`occupancy_target`: conservative/realistic/optimistic), NOT season.
**Why:** owner was emphatic — region tables are bound to occupancy posture; season must not participate in or be substituted into the calc.
**How to apply:** keep ROI full-year. Management fee now comes ONLY from the yacht's manual `monthly_management_fee_eur` (×12), then optional `management_fee_pct` override, else 0 ("Not applicable") — no style defaults. The manual-mode "AI Estimate" rate helper (`AIRateEstimator`) still needs a season for `/roi/ai-rate-estimate` (a separate market-lookup endpoint) and is passed a constant `"high"` — it does NOT feed the main calc.

## Charter weeks come from an owner-defined region→season→occupancy table, NOT from AI
`REGION_SEASON_WEEKS` in `revenue.ts` is authoritative for the number of charter weeks. When a (region, season, occupancy) entry exists, both the AI path and the heuristic fallback use that week count; the AI is told via the prompt to estimate ONLY the weekly rate (€/week). Priority: explicit `target_weeks` > table > legacy occupancy×season heuristic. Season is always `"mixed"` now (see above), so the `mixed` row is the one that matters.
**Why:** owner wants predictable, controllable booked-weeks numbers instead of model guesses.
**How to apply:** to onboard a new region, add it to `REGION_SEASON_WEEKS` only — regions absent from the table keep the legacy heuristic, so additions are non-breaking. Mediterranean low season = 0 weeks ("dead" winter). `mixed` = high + shoulder totals.

## Newer regions use REGION_MODELS (weekly OR daily basis), separate from the legacy week table
`REGION_MODELS` in `revenue.ts` is the second-generation, per-region config (Caribbean = weekly+daily; Middle East/Dubai = daily-only; Northern Europe `northern_europe` = weekly+daily; Southeast Asia `asia_pacific_me` = weekly+daily, key reused for the Phuket/Bali/Langkawi market). It supersedes the legacy week table for regions listed in it; regions NOT in it keep `REGION_SEASON_WEEKS`/legacy untouched. As of June 2026 ALL 5 regions (incl. **Mediterranean**) live in `REGION_MODELS`, so the `REGION_SEASON_WEEKS` Med entry is now inert documentation only (model wins in every path). Med weekly units mirror the old legacy week table 1:1 with flat mult 1.0 so weekly estimates stay numerically equivalent; Med daily was added (shoulder mult 0.85, divisor 6). Only `pricing_mode="ai"` consults it — manual modes never do. `charter_type` ("weekly"|"daily") flows openapi→zod→route→`AiArgs.charterType`; null/absent → region's primary basis. Adding a region = add a `REGION_MODELS` entry + mirror `bases` in frontend `REGION_CHARTER`; the region key must already exist in openapi/VALID_REGIONS/REGION_OPTS. Season selector "high"/"shoulder"/"all" → engine seasons high/shoulder/mixed (calc always sends `mixed`; no literal "all" key exists). Weather-deduction %s quoted in specs are pre-baked into the booked conservative/realistic/optimistic units — do NOT re-apply them in code.
**Why:** different markets charter by the day vs week; owner wants fixed booked units (weeks for weekly basis, DAYS for daily basis) per season/occupancy with the AI estimating only the rate.
**How to apply:** units are FIXED by the table; "mixed"/"all" season BLENDS sub-seasons each at its own multiplier (peak 1.0, shoulder/low <1.0); empty sub-season list = dead season = €0. **daily_rate = baseWeekly / dailyDivisor (6, NOT 7)** — this divisor is the whole point, so when deriving baseWeekly from a market_rates seed (which is a DAILY rate) in the heuristic fallback you must multiply by dailyDivisor, not the legacy ×7, or the day rate inflates ~16.7%. Frontend `REGION_CHARTER` in `roi/calculate.tsx` mirrors bases+seasons; a >1-base region shows the weekly/daily toggle, a single-base region shows a "Daily charters only" note; reconcile charterType/season on BOTH region and pricingMode change (manual→AI can expose an invalid season).

## `target_weeks` override is SILENTLY IGNORED on REGION_MODELS regions
`target_weeks` only changes booked units on the **legacy** path (`tableWeeks`/heuristic in `revenue.ts`). On regions in `REGION_MODELS`, `regionModelRevenue()` is called WITHOUT the override on both the AI-success and heuristic-fallback branches, so the model's fixed units win and the user's `target_weeks` has no effect.
**Why:** owner wants region-model booked volume to be immovable.
**How to apply:** any per-calc explanation/UI that surfaces `target_weeks` provenance must branch on whether the region is in REGION_MODELS — only claim "your target weeks" on the legacy path. The result-screen methodology text (`describeRevenueMethod`) already does this.

## ROI result screen has NO chart and NO PDF export
The "report" = `app/roi/result.tsx` only (no ROI PDF generator exists). The old "Monthly revenue" bar chart was removed (June 2026) and replaced by a server-generated "How this was calculated" card fed by `RoiResult.methodology` (composed by `buildMethodology` in `index.ts` + `describeRevenueMethod` in `revenue.ts`; deterministic, no AI). `methodology` is OPTIONAL in openapi `RoiCalculation` so rows persisted before it existed still validate; frontend guards `data.methodology ?`. `revenue_by_month` is still computed/returned, just unused by the UI.

## Dual-region charter income is additive and AI-only
Optional `region_2`/`season_2`/`charter_type_2`/`occupancy_target_2`/`repositioning_cost_eur` on `RoiCalculationInput` trigger a second `computeAiRevenue` run that is summed into the result via `combineRevenue` (weeks add, rates weeks-weighted, occupancy capped 100, confidence = worse of the two). Region 1 stays byte-identical: it still runs with season `"mixed"`. Repositioning is pushed as one expense line ("Repositioning (annual, both ways)") so net/roi formulas are untouched. Result carries `dual_region` breakdown.
**Why:** owner wants two-region income without disturbing the single-region/manual paths at all.
**How to apply:** to keep legacy responses byte-identical, `dual_region` is OMITTED (conditional spread), never `null` — same trick applies to any future additive response field. Dual fields are ignored unless `pricing_mode==="ai"` AND `region_2` non-empty. Frontend `REGION_MONTHS` table drives only an advisory, non-blocking season-overlap warning (region 1 = full window, region 2 = selected season).
