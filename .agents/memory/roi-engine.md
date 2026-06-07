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
`expenses.ts buildExpenses` only auto-estimates when blank: Routine maintenance (always), Management fee (style default), Charter broker commission (default 15%). Every other crew/monthly/annual line that is blank is dropped from the report (treated as €0), which inflates ROI if the user expected a baseline.
**How to apply:** UI copy must not promise "empty = regional average". Tell users a blank line is excluded except those three.

## Engine reads `monthly_crew_eur`, not `crew_breakdown`
The crew total fed to ROI is the single `monthly_crew_eur` column. `crew_breakdown` jsonb is for the editor/history only. Any crew override must compute and send `monthly_crew_eur`.
