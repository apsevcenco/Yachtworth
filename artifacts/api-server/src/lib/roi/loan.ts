/**
 * Standard annuity (amortising loan) — annual payment for principal P
 * at annual rate r over n years.
 *   payment = P × r / (1 − (1+r)^−n)
 * Handles zero-rate (returns P/n) and degenerate inputs gracefully.
 */
export function annualLoanPayment(
  principalEur: number | null,
  annualRatePct: number | null,
  termYears: number | null,
): number {
  if (!principalEur || principalEur <= 0) return 0;
  if (!termYears || termYears <= 0) return 0;
  const r = annualRatePct != null ? annualRatePct / 100 : 0;
  if (r === 0) return principalEur / termYears;
  const pow = Math.pow(1 + r, -termYears);
  return (principalEur * r) / (1 - pow);
}
