import type { YachtRow } from "./types";
import { buildExpenses, type ExpenseLine } from "./expenses";
import { annualLoanPayment } from "./loan";
import {
  depreciationCurve,
  roiProjection5y,
  monthlySeasonal,
} from "./projection";
import {
  computeManualRevenue,
  computeAiRevenue,
  type ComputedRevenue,
} from "./revenue";
import { loadRoiRates } from "./rates";

export const ROI_DISCLAIMER =
  "This Charter ROI projection is an indicative estimate for informational " +
  "purposes only — not a guarantee of future income, certified appraisal, " +
  "or financial advice. Charter revenue, expenses, and yacht value are " +
  "highly variable. Consult a licensed yacht-management firm and tax " +
  "advisor before making investment decisions. Projection valid for 30 days.";

export interface RoiInput {
  yacht_id: string;
  region: string;
  season?: string | null;
  management_style: string;
  occupancy_target?: string | null;
  pricing_mode: "manual_daily" | "manual_weekly" | "ai";
  charter_type?: string | null;
  manual_rate_eur?: number | null;
  manual_charter_units?: number | null;
  management_fee_pct?: number | null;
  target_weeks?: number | null;
}

export interface RoiResult {
  annual_revenue_eur: number;
  annual_expenses_eur: number;
  net_profit_eur: number;
  roi_pct: number;
  payback_years: number;
  occupancy_pct: number;
  expected_charter_weeks: number;
  avg_daily_rate_eur: number;
  daily_rate_low_season_eur: number | null;
  daily_rate_high_season_eur: number | null;
  market_rating: "A" | "B" | "C" | "D" | null;
  risk_score: number | null;
  currency: "EUR";
  expenses: ExpenseLine[];
  revenue_by_month: { month: number; value_eur: number }[];
  depreciation_curve: { year_offset: number; value_eur: number }[];
  roi_projection_5y: { year_offset: number; value_eur: number }[];
  comparables: ComputedRevenue["comparables"];
  reasoning: string;
  recommendations: string[];
  confidence: "high" | "medium" | "low";
  legal_disclaimer: string;
}

/**
 * Risk score 1 (lowest) – 10 (highest). Heuristic:
 * - high payback years → higher risk
 * - low occupancy → higher risk
 * - loan + low net → higher risk
 * - region weight (caribbean/middle_east a bit riskier due to season window)
 */
function riskScore(args: {
  paybackYears: number;
  occupancyPct: number;
  hasLoan: boolean;
  netEur: number;
}): number {
  let r = 4;
  if (args.paybackYears > 25 || args.netEur < 0) r += 4;
  else if (args.paybackYears > 15) r += 2;
  else if (args.paybackYears < 8) r -= 1;
  if (args.occupancyPct < 15) r += 2;
  else if (args.occupancyPct < 25) r += 1;
  else if (args.occupancyPct > 40) r -= 1;
  if (args.hasLoan && args.netEur < 0) r += 1;
  return Math.max(1, Math.min(10, r));
}

function recommendations(args: {
  netEur: number;
  paybackYears: number;
  occupancyPct: number;
  ownerHasExpenses: boolean;
  managementStyle: string;
}): string[] {
  const out: string[] = [];
  if (args.netEur < 0) {
    out.push(
      "Charter income alone does not cover annual costs — consider a higher occupancy target or reducing optional expense lines.",
    );
  }
  if (args.paybackYears > 25) {
    out.push(
      "Payback exceeds 25 years; treat charter primarily as cost-offset rather than investment return.",
    );
  }
  if (args.occupancyPct < 15) {
    out.push(
      "Projected occupancy is low. A management company can typically lift bookings by 30–50%.",
    );
  }
  if (!args.ownerHasExpenses) {
    out.push(
      "Expense estimates use regional averages. Add real numbers in the yacht profile for a sharper projection.",
    );
  }
  if (args.managementStyle === "owner_operated" && args.paybackYears > 20) {
    out.push(
      "Switching from owner-operated to a management company often improves charter weeks despite the 10% fee.",
    );
  }
  return out;
}

export async function calculateRoi(
  yacht: YachtRow,
  input: RoiInput,
): Promise<RoiResult> {
  // ── 0. Data-driven baseline rates (Stage 4) ───────────────────────
  // One Supabase round-trip up front; empty result if Supabase unconfigured
  // or seed not applied — every downstream call degrades to its heuristic.
  const rates = await loadRoiRates({
    yachtType: yacht.yacht_type ?? null,
    lengthMeters: Number(yacht.length_meters) || 0,
    region: input.region,
  });

  // ── 1. Revenue ────────────────────────────────────────────────────
  let revenue: ComputedRevenue;
  if (input.pricing_mode === "ai") {
    revenue = await computeAiRevenue({
      yacht,
      region: input.region,
      season: input.season || "mixed",
      occupancyTarget: input.occupancy_target ?? null,
      targetWeeksOverride: input.target_weeks ?? null,
      charterType: input.charter_type ?? null,
      marketRates: rates.market,
    });
  } else {
    const rate = Number(input.manual_rate_eur);
    const units = Number(input.manual_charter_units);
    if (!isFinite(rate) || rate <= 0 || !isFinite(units) || units <= 0) {
      throw new Error(
        "manual_rate_eur and manual_charter_units are required for manual pricing modes",
      );
    }
    revenue = computeManualRevenue({
      mode: input.pricing_mode,
      rateEur: rate,
      units,
    });
  }

  // ── 2. Expenses ───────────────────────────────────────────────────
  const exp = buildExpenses({
    yacht,
    region: input.region,
    managementStyle: input.management_style,
    managementFeeOverridePct: input.management_fee_pct ?? null,
    annualGrossRevenueEur: revenue.annual_gross_eur,
    expenseRates: rates.expense,
  });

  // ── 3. Loan service ───────────────────────────────────────────────
  const loanAnnual = annualLoanPayment(
    yacht.loan_amount_eur != null ? Number(yacht.loan_amount_eur) : null,
    yacht.loan_rate_pct ?? null,
    yacht.loan_term_years ?? null,
  );
  const allLines: ExpenseLine[] = exp.lines.slice();
  if (loanAnnual > 0) {
    allLines.push({
      category: "Loan repayment",
      amount_eur: Math.round(loanAnnual),
      formula: `Annuity on €${Math.round(Number(yacht.loan_amount_eur) || 0)} at ${
        yacht.loan_rate_pct ?? 0
      }% for ${yacht.loan_term_years ?? 0}y`,
    });
  }
  const totalExpenses = allLines.reduce((s, l) => s + l.amount_eur, 0);

  // ── 4. P&L + ratios ───────────────────────────────────────────────
  const net = revenue.annual_gross_eur - totalExpenses;
  const purchase = Number(yacht.purchase_price_eur) || 0;
  // ROI: net income / capital outlay. Use loan_amount as proxy if no purchase price.
  const capital =
    purchase > 0
      ? purchase
      : (Number(yacht.loan_amount_eur) || 0) || revenue.annual_gross_eur * 5;
  const roiPct = capital > 0 ? (net / capital) * 100 : 0;
  const payback = net > 0 && capital > 0 ? capital / net : 999;

  // ── 5. Projections + breakdowns ───────────────────────────────────
  const todayValue = purchase > 0 ? purchase : capital;
  const depreciation = depreciationCurve(todayValue, 5);
  const projection = roiProjection5y(net, 5);
  const revByMonth = monthlySeasonal(revenue.annual_gross_eur);

  const ownerHasExpenses = [
    yacht.monthly_crew_eur,
    yacht.monthly_mooring_eur,
    yacht.monthly_fuel_eur,
    yacht.monthly_provisioning_eur,
    yacht.annual_insurance_eur,
    yacht.annual_refit_reserve_eur,
  ].some((v) => v != null);

  return {
    annual_revenue_eur: Math.round(revenue.annual_gross_eur),
    annual_expenses_eur: Math.round(totalExpenses),
    net_profit_eur: Math.round(net),
    roi_pct: Math.round(roiPct * 10) / 10,
    payback_years: payback >= 999 ? 999 : Math.round(payback * 10) / 10,
    occupancy_pct: revenue.occupancy_pct,
    expected_charter_weeks: Math.max(0, Math.round(revenue.expected_charter_weeks)),
    avg_daily_rate_eur: revenue.daily_rate_eur,
    daily_rate_low_season_eur: revenue.daily_rate_low_eur,
    daily_rate_high_season_eur: revenue.daily_rate_high_eur,
    market_rating: revenue.market_rating,
    risk_score: riskScore({
      paybackYears: payback,
      occupancyPct: revenue.occupancy_pct,
      hasLoan: loanAnnual > 0,
      netEur: net,
    }),
    currency: "EUR",
    expenses: allLines,
    revenue_by_month: revByMonth,
    depreciation_curve: depreciation,
    roi_projection_5y: projection,
    comparables: revenue.comparables,
    reasoning: revenue.reasoning,
    recommendations: recommendations({
      netEur: net,
      paybackYears: payback,
      occupancyPct: revenue.occupancy_pct,
      ownerHasExpenses,
      managementStyle: input.management_style,
    }),
    confidence: revenue.confidence,
    legal_disclaimer: ROI_DISCLAIMER,
  };
}
