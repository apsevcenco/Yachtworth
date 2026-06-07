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

## Season is NOT a user input — full-year only, driven by occupancy posture
The ROI questionnaire has NO season picker and NO management-style picker (owner removed both, June 2026). The frontend never sends `season` or `management_style`; both are absent from `RoiCalculationInput` in openapi. Backend hard-codes `season: "mixed"` into `computeAiRevenue` (full year = blend of all sub-seasons). The user-facing knob that selects region numbers is the **occupancy posture** (`occupancy_target`: conservative/realistic/optimistic), NOT season.
**Why:** owner was emphatic — region tables are bound to occupancy posture; season must not participate in or be substituted into the calc.
**How to apply:** keep ROI full-year. Management fee now comes ONLY from the yacht's manual `monthly_management_fee_eur` (×12), then optional `management_fee_pct` override, else 0 ("Not applicable") — no style defaults. The manual-mode "AI Estimate" rate helper (`AIRateEstimator`) still needs a season for `/roi/ai-rate-estimate` (a separate market-lookup endpoint) and is passed a constant `"high"` — it does NOT feed the main calc.

## Charter weeks come from an owner-defined region→season→occupancy table, NOT from AI
`REGION_SEASON_WEEKS` in `revenue.ts` is authoritative for the number of charter weeks. When a (region, season, occupancy) entry exists, both the AI path and the heuristic fallback use that week count; the AI is told via the prompt to estimate ONLY the weekly rate (€/week). Priority: explicit `target_weeks` > table > legacy occupancy×season heuristic. Season is always `"mixed"` now (see above), so the `mixed` row is the one that matters.
**Why:** owner wants predictable, controllable booked-weeks numbers instead of model guesses.
**How to apply:** to onboard a new region, add it to `REGION_SEASON_WEEKS` only — regions absent from the table keep the legacy heuristic, so additions are non-breaking. Mediterranean low season = 0 weeks ("dead" winter). `mixed` = high + shoulder totals.

## Newer regions use REGION_MODELS (weekly OR daily basis), separate from the legacy week table
`REGION_MODELS` in `revenue.ts` is the second-generation, per-region config (Caribbean = weekly+daily; Middle East/Dubai = daily-only). It supersedes the legacy week table for regions listed in it; regions NOT in it keep `REGION_SEASON_WEEKS`/legacy untouched (Mediterranean stays legacy). Only `pricing_mode="ai"` consults it — manual modes never do. `charter_type` ("weekly"|"daily") flows openapi→zod→route→`AiArgs.charterType`; null/absent → region's primary basis.
**Why:** different markets charter by the day vs week; owner wants fixed booked units (weeks for weekly basis, DAYS for daily basis) per season/occupancy with the AI estimating only the rate.
**How to apply:** units are FIXED by the table; "mixed"/"all" season BLENDS sub-seasons each at its own multiplier (peak 1.0, shoulder/low <1.0); empty sub-season list = dead season = €0. **daily_rate = baseWeekly / dailyDivisor (6, NOT 7)** — this divisor is the whole point, so when deriving baseWeekly from a market_rates seed (which is a DAILY rate) in the heuristic fallback you must multiply by dailyDivisor, not the legacy ×7, or the day rate inflates ~16.7%. Frontend `REGION_CHARTER` in `roi/calculate.tsx` mirrors bases+seasons; a >1-base region shows the weekly/daily toggle, a single-base region shows a "Daily charters only" note; reconcile charterType/season on BOTH region and pricingMode change (manual→AI can expose an invalid season).
