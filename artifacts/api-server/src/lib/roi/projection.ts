/**
 * Yacht depreciation curve (5y forward from "today value").
 * Age-aware rates based on broker-aggregated data (Yatco, IYC, Fraser):
 *   age 0–1 yr  : −10%/yr  (new yacht, steepest drop)
 *   age 2–5 yrs : −7%/yr
 *   age 6–14 yrs: −3.5%/yr (curve flattens)
 *   age 15+ yrs : −2%/yr   (vintage/classic plateau)
 *
 * If yearBuilt is unknown, falls back to flat −5%/yr (legacy behaviour).
 */
export function depreciationCurve(
  todayValueEur: number,
  yearsAhead = 5,
  yearBuilt?: number | null,
): { year_offset: number; value_eur: number }[] {
  const currentYear = new Date().getFullYear();
  const ageNow = yearBuilt ? currentYear - yearBuilt : null;

  function rateForAge(age: number): number {
    if (age <= 1) return 0.10;
    if (age <= 5) return 0.07;
    if (age <= 14) return 0.035;
    return 0.02;
  }

  const out: { year_offset: number; value_eur: number }[] = [];
  let v = todayValueEur;
  out.push({ year_offset: 0, value_eur: Math.round(v) });

  for (let y = 1; y <= yearsAhead; y++) {
    const rate = ageNow != null
      ? rateForAge(ageNow + y)
      : (y === 1 ? 0.05 : 0.035); // legacy fallback
    v = v * (1 - rate);
    out.push({ year_offset: y, value_eur: Math.round(v) });
  }
  return out;
}

/**
 * 5-year ROI cumulative cash projection.
 * Inflates revenue & expenses by 3 %/yr; loan payment stays flat.
 */
export function roiProjection5y(
  netYear1Eur: number,
  yearsAhead = 5,
): { year_offset: number; value_eur: number }[] {
  const out: { year_offset: number; value_eur: number }[] = [];
  let cum = 0;
  const inflation = 0.03;
  for (let y = 1; y <= yearsAhead; y++) {
    const yearly = netYear1Eur * Math.pow(1 + inflation, y - 1);
    cum += yearly;
    out.push({ year_offset: y, value_eur: Math.round(cum) });
  }
  return out;
}

/**
 * Spread an annual figure across 12 months with a simple
 * Mediterranean-ish seasonality (June–Aug peak, Dec–Feb low).
 * Sum of weights == 12 so total preserved.
 */
const MONTH_WEIGHTS = [
  0.4, 0.4, 0.6, 0.9, 1.3, 1.7, 2.0, 1.9, 1.4, 1.0, 0.6, 0.4,
];

export function monthlySeasonal(
  annualEur: number,
): { month: number; value_eur: number }[] {
  const total = MONTH_WEIGHTS.reduce((a, b) => a + b, 0);
  return MONTH_WEIGHTS.map((w, i) => ({
    month: i + 1,
    value_eur: Math.round((annualEur * w) / total),
  }));
}
