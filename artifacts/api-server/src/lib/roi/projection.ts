/**
 * Yacht depreciation curve (5y forward from "today value").
 * Empirical luxury-yacht pattern: year 1 ~−5%, then ~−3.5%/yr.
 * Reference value = purchase_price_eur scaled to today (rough).
 */
export function depreciationCurve(
  todayValueEur: number,
  yearsAhead = 5,
): { year_offset: number; value_eur: number }[] {
  const out: { year_offset: number; value_eur: number }[] = [];
  let v = todayValueEur;
  for (let y = 0; y <= yearsAhead; y++) {
    if (y === 0) {
      out.push({ year_offset: 0, value_eur: Math.round(v) });
    } else {
      const rate = y === 1 ? 0.05 : 0.035;
      v = v * (1 - rate);
      out.push({ year_offset: y, value_eur: Math.round(v) });
    }
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
