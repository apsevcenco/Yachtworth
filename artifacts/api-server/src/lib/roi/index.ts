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
  describeRevenueMethod,
  dedupeRevenueComparables,
  charterBasis,
  type ComputedRevenue,
} from "./revenue";
import { loadRoiRates } from "./rates";

export const ROI_DISCLAIMER =
  "This Charter ROI projection is an indicative estimate for informational " +
  "purposes only — not a guarantee of future income, certified appraisal, " +
  "or financial advice. Charter revenue, expenses, and yacht value are " +
  "highly variable. Consult a licensed yacht-management firm and tax " +
  "advisor before making investment decisions. Projection valid for 30 days.";

/**
 * Default annual repositioning cost between two regions when the user leaves
 * the field blank. Keyed on a canonical pair: two region keys joined by "|",
 * sorted alphabetically so order doesn't matter.
 *
 * Round-trip estimates (outbound + return) for a ~20m motor yacht:
 * fuel + delivery crew + canal/port fees, both legs combined.
 */
const REPOSITION_DEFAULTS: Record<string, number> = {
  "caribbean|mediterranean":   25000,
  "mediterranean|middle_east": 14000,
  "mediterranean|northern_europe": 11000,
  "asia_pacific_me|mediterranean": 32000,
  "caribbean|middle_east":     42000,
  "caribbean|northern_europe": 23000,
  "asia_pacific_me|caribbean": 48000,
  "middle_east|northern_europe": 18000,
  "asia_pacific_me|northern_europe": 37000,
  "asia_pacific_me|middle_east": 16000,
};

function defaultRepositioningCost(r1: string, r2: string): number {
  const key = [r1, r2].sort().join("|");
  return REPOSITION_DEFAULTS[key] ?? 15000;
}

export interface RoiInput {
  yacht_id: string;
  region: string;
  occupancy_target?: string | null;
  pricing_mode: "manual_daily" | "manual_weekly" | "ai";
  charter_type?: string | null;
  manual_rate_eur?: number | null;
  manual_charter_units?: number | null;
  management_fee_pct?: number | null;
  target_weeks?: number | null;
  // Dual-region (AI mode only, additive). When region_2 is set the engine
  // computes a second region's charter income and sums it. All ignored unless
  // pricing_mode === "ai" AND region_2 is a non-empty region.
  region_2?: string | null;
  season_2?: string | null;
  charter_type_2?: string | null;
  occupancy_target_2?: string | null;
  repositioning_cost_eur?: number | null;
}

export interface RoiRegionIncome {
  region: string;
  season: string | null;
  charter_type: "weekly" | "daily";
  income_eur: number;
  expected_charter_weeks: number;
  expected_charter_days: number | null;
  occupancy_pct: number;
  avg_daily_rate_eur: number;
  weekly_rate_eur: number;
}

export interface RoiDualRegionBreakdown {
  region_1: RoiRegionIncome;
  region_2: RoiRegionIncome;
  total_gross_income_eur: number;
  repositioning_cost_eur: number;
  net_charter_income_eur: number;
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
  methodology: string;
  recommendations: string[];
  // Present ONLY when a second region was supplied. Omitted entirely otherwise
  // so single-region / manual responses stay byte-identical to the legacy shape.
  dual_region?: RoiDualRegionBreakdown;
  // Sale-after-5-years exit projection. Present ONLY when a purchase price was
  // entered; omitted entirely otherwise (so the frontend hides the block).
  // Built from already-computed 5-year values — no recalculation of depreciation
  // or charter income.
  exit_scenario?: RoiExitScenario;
  confidence: "high" | "medium" | "low";
  legal_disclaimer: string;
}

export interface RoiExitScenario {
  purchase_price_eur: number;
  charter_income_5y_eur: number;
  vessel_value_at_sale_eur: number;
  total_return_eur: number;
  exit_result_eur: number;
  exit_result_pct: number;
  total_loan_paid_eur: number | null;
  exit_result_after_loan_eur: number | null;
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
  return out;
}

const money = (n: number): string => Math.round(n).toLocaleString("en-US");

const REGION_NAME: Record<string, string> = {
  mediterranean: "Mediterranean",
  caribbean: "Caribbean",
  northern_europe: "Northern Europe",
  asia_pacific_me: "Asia-Pacific",
  middle_east: "Middle East",
};
const regionName = (r: string): string => REGION_NAME[r] ?? r;

const SEASON_NAME: Record<string, string> = {
  high: "high season",
  shoulder: "shoulder season",
  low: "low season",
  mixed: "full charter window",
};
const seasonName = (s: string | null): string =>
  s ? SEASON_NAME[s] ?? s : "full charter window";

/** One human-readable charter-income line for a region in the dual breakdown. */
function regionIncomeLine(label: string, ri: RoiRegionIncome): string {
  const units =
    ri.charter_type === "daily"
      ? `${ri.expected_charter_days ?? Math.round(ri.expected_charter_weeks * 7)} charter days`
      : `${ri.expected_charter_weeks} charter weeks`;
  return (
    `${label} (${regionName(ri.region)}, ${seasonName(ri.season)}): ${units} ` +
    `at an AI base rate ≈ €${money(ri.weekly_rate_eur)}/week (€${money(ri.avg_daily_rate_eur)}/day) ` +
    `→ €${money(ri.income_eur)}/yr.`
  );
}

function depreciationRateForAge(age: number): number {
  if (age <= 1) return 0.10;
  if (age <= 5) return 0.07;
  if (age <= 14) return 0.035;
  return 0.02;
}

function depreciationAssumption(yearBuilt: number | null | undefined): string {
  if (!yearBuilt) {
    return "Yacht value uses the legacy depreciation fallback: 5% in year 1, then 3.5% per year when the build year is unknown.";
  }
  const currentYear = new Date().getFullYear();
  const age = Math.max(0, currentYear - yearBuilt + 1);
  const rate = depreciationRateForAge(age) * 100;
  return `Yacht value uses an age-aware depreciation curve. For a ${yearBuilt} yacht, the current forecast starts in the ${age}-year age band at ${rate.toFixed(1)}% per year.`;
}

/**
 * Compose the full, system-generated "how this was calculated" explanation
 * for THIS specific projection: charter-income algorithm + expense handling +
 * loan + P&L/ROI/payback formulas + projection basis. Deterministic, no AI.
 */
function buildMethodology(args: {
  input: RoiInput;
  yacht: YachtRow;
  revenue: ComputedRevenue;
  totalExpenses: number;
  net: number;
  roiPct: number;
  payback: number;
  hasLoan: boolean;
  hasPurchasePrice: boolean;
  charterCommissionPct: number;
  managementFeePct: number;
  ownerManagementFee: boolean;
  dual: RoiDualRegionBreakdown | null;
  repositioningWasEstimated: boolean;
}): string {
  const lines: string[] = [];

  if (args.dual) {
    const d = args.dual;
    lines.push("1. Charter income (dual-region)");
    lines.push(
      "• This scenario charters the yacht in two regions across the year. Each region is priced independently and the incomes are summed.",
    );
    lines.push(`• ${regionIncomeLine("Region 1", d.region_1)}`);
    lines.push(`• ${regionIncomeLine("Region 2", d.region_2)}`);
    lines.push(
      `• Total gross charter income = €${money(d.region_1.income_eur)} + €${money(d.region_2.income_eur)} = €${money(d.total_gross_income_eur)}.`,
    );
    if (d.repositioning_cost_eur > 0) {
      const basis = args.repositioningWasEstimated
        ? "Yachtworth regional estimate because no custom repositioning cost was entered"
        : "owner-provided repositioning cost";
      lines.push(
        `• Repositioning between the two regions (both ways) = €${money(d.repositioning_cost_eur)}/yr, included in operating expenses below (${basis}).`,
      );
    }
  } else {
    lines.push("1. Charter income");
    for (const b of describeRevenueMethod(
      {
        pricingMode: args.input.pricing_mode,
        region: args.input.region,
        occupancyTarget: args.input.occupancy_target ?? null,
        charterType: args.input.charter_type ?? null,
        targetWeeksOverride: args.input.target_weeks ?? null,
      },
      args.revenue,
    )) {
      lines.push(`• ${b}`);
    }
  }

  lines.push("");
  lines.push("2. Operating expenses");
  lines.push(
    "• Expense lines come from your yacht profile. Any line left blank is excluded (treated as €0) — except routine maintenance, which is always estimated from a regional baseline because no operating yacht has zero maintenance.",
  );
  if (args.ownerManagementFee) {
    lines.push("• Management fee uses your yacht's monthly management fee (× 12).");
  } else if (args.managementFeePct > 0) {
    lines.push(
      `• Management fee = ${args.managementFeePct}% of gross charter income.`,
    );
  } else {
    lines.push("• No management fee was applied (none set on the yacht).");
  }
  lines.push(
    `• Charter broker commission = ${args.charterCommissionPct}% of gross charter income.`,
  );
  if (args.hasLoan) {
    lines.push(
      "• Loan repayment is an annuity computed from your loan amount, interest rate and term.",
    );
  }
  lines.push(
    `• Total annual expenses = sum of all lines above = €${money(args.totalExpenses)}.`,
  );

  lines.push("");
  lines.push("3. Profit, ROI & payback");
  lines.push(
    `• Net result = charter income (€${money(args.revenue.annual_gross_eur)}) − total expenses (€${money(args.totalExpenses)}) = €${money(args.net)} per year.`,
  );
  lines.push(
    `• ROI = annual net ÷ capital base (${args.hasPurchasePrice ? "your purchase price" : "your loan amount, used as a proxy"}) = ${args.roiPct.toFixed(1)}%.`,
  );
  if (args.payback >= 999 || args.net <= 0) {
    lines.push(
      "• Payback period: not reached — charter income does not exceed annual costs at this scenario.",
    );
  } else {
    lines.push(
      `• Payback period = capital base ÷ annual net = ${args.payback.toFixed(1)} years.`,
    );
  }

  lines.push("");
  lines.push("4. Depreciation & 5-year outlook");
  lines.push(
    "• Cumulative cash flow projects the year-1 net result forward at 3.0% annual growth.",
  );
  lines.push(
    `• ${depreciationAssumption(args.yacht.year_built)}`,
  );

  return lines.join("\n");
}

function comparableRateRange(
  comparables: ComputedRevenue["comparables"],
): { low: number; high: number } | null {
  const rates = comparables
    .map((c) => c.weekly_rate_eur)
    .filter((v): v is number => typeof v === "number" && Number.isFinite(v) && v > 0);
  if (!rates.length) return null;
  return { low: Math.min(...rates), high: Math.max(...rates) };
}

function buildAnalysis(args: {
  input: RoiInput;
  yacht: YachtRow;
  revenue: ComputedRevenue;
  totalExpenses: number;
  net: number;
  roiPct: number;
  payback: number;
  dual: RoiDualRegionBreakdown | null;
}): string {
  if (args.input.pricing_mode !== "ai") {
    return (
      `This scenario uses the owner-entered charter rate and booking volume, producing annual charter revenue of €${money(args.revenue.annual_gross_eur)}. ` +
      `After annual expenses of €${money(args.totalExpenses)}, the projected net result is €${money(args.net)} and ROI is ${args.roiPct.toFixed(1)}%.`
    );
  }

  const range = comparableRateRange(args.revenue.comparables);
  const compText = range
    ? `Comparable weekly charter rates in this cohort range from €${money(range.low)} to €${money(range.high)}. `
    : "Comparable charter listings were used to estimate the market rate. ";
  const registrationText = args.yacht.commercial_registration
    ? "The yacht is marked as commercially registered, so no leisure-registration discount is applied. "
    : "Because the yacht is not marked as commercially registered, the market rate is treated conservatively versus fully commercial charter comparables. ";

  if (args.dual) {
    const d = args.dual;
    const repositioningText =
      d.repositioning_cost_eur > 0
        ? `, including €${money(d.repositioning_cost_eur)} repositioning,`
        : ",";
    return (
      compText +
      registrationText +
      `The dual-region scenario combines ${regionName(d.region_1.region)} income of €${money(d.region_1.income_eur)} with ${regionName(d.region_2.region)} income of €${money(d.region_2.income_eur)}, for total charter revenue of €${money(args.revenue.annual_gross_eur)}. ` +
      `After annual expenses of €${money(args.totalExpenses)}${repositioningText} projected net profit is €${money(args.net)}, ROI is ${args.roiPct.toFixed(1)}%, and payback is ${args.payback >= 999 || args.net <= 0 ? "not reached" : `${args.payback.toFixed(1)} years`}.`
    );
  }

  return (
    compText +
    registrationText +
    `The fixed regional booking model gives ${Math.round(args.revenue.expected_charter_weeks * 10) / 10} charter weeks and total charter revenue of €${money(args.revenue.annual_gross_eur)}. ` +
    `After annual expenses of €${money(args.totalExpenses)}, projected net profit is €${money(args.net)}, ROI is ${args.roiPct.toFixed(1)}%, and payback is ${args.payback >= 999 || args.net <= 0 ? "not reached" : `${args.payback.toFixed(1)} years`}.`
  );
}

const CONFIDENCE_RANK: Record<"high" | "medium" | "low", number> = {
  high: 3,
  medium: 2,
  low: 1,
};

/** Lower (more conservative) of two confidences. */
function worseConfidence(
  a: "high" | "medium" | "low",
  b: "high" | "medium" | "low",
): "high" | "medium" | "low" {
  return CONFIDENCE_RANK[a] <= CONFIDENCE_RANK[b] ? a : b;
}

/**
 * Merge two single-region revenue computations into one combined ComputedRevenue
 * for the dual-region scenario. Gross income and charter weeks add; rates are
 * weighted by each region's weeks; occupancy adds (capped at 100); confidence
 * takes the more conservative of the two. Used only when region_2 is set — the
 * single-region path never calls this, so it stays byte-identical.
 */
function combineRevenue(a: ComputedRevenue, b: ComputedRevenue): ComputedRevenue {
  const weeks = a.expected_charter_weeks + b.expected_charter_weeks;
  const wAvg = (xa: number, xb: number): number =>
    weeks > 0
      ? (xa * a.expected_charter_weeks + xb * b.expected_charter_weeks) / weeks
      : (xa + xb) / 2;
  const lows = [a.daily_rate_low_eur, b.daily_rate_low_eur].filter(
    (v): v is number => v != null,
  );
  const highs = [a.daily_rate_high_eur, b.daily_rate_high_eur].filter(
    (v): v is number => v != null,
  );
  return {
    annual_gross_eur: a.annual_gross_eur + b.annual_gross_eur,
    daily_rate_eur: Math.round(wAvg(a.daily_rate_eur, b.daily_rate_eur)),
    weekly_rate_eur: Math.round(wAvg(a.weekly_rate_eur, b.weekly_rate_eur)),
    expected_charter_weeks: weeks,
    daily_rate_low_eur: lows.length ? Math.min(...lows) : null,
    daily_rate_high_eur: highs.length ? Math.max(...highs) : null,
    occupancy_pct: Math.min(100, a.occupancy_pct + b.occupancy_pct),
    market_rating: a.market_rating ?? b.market_rating,
    comparables: dedupeRevenueComparables([...a.comparables, ...b.comparables]).slice(0, 10),
    reasoning: `Region 1 — ${a.reasoning} Region 2 — ${b.reasoning}`,
    confidence: worseConfidence(a.confidence, b.confidence),
    ai_used: a.ai_used || b.ai_used,
  };
}

/** Build a per-region income line for the dual-region breakdown. */
function toRegionIncome(
  region: string,
  season: string | null,
  basis: "weekly" | "daily",
  rev: ComputedRevenue,
): RoiRegionIncome {
  const weeks = Math.round(rev.expected_charter_weeks * 10) / 10;
  return {
    region,
    season,
    charter_type: basis,
    income_eur: Math.round(rev.annual_gross_eur),
    expected_charter_weeks: weeks,
    expected_charter_days: basis === "daily" ? Math.round(weeks * 7) : null,
    occupancy_pct: rev.occupancy_pct,
    avg_daily_rate_eur: rev.daily_rate_eur,
    weekly_rate_eur: rev.weekly_rate_eur,
  };
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
  let dualBreakdown: RoiDualRegionBreakdown | null = null;
  let repositioningWasEstimated = false;
  if (input.pricing_mode === "ai") {
    // Region 1 — identical to the single-region path (season "mixed" = its own
    // charter window). NEVER changed by the dual-region feature.
    const rev1Promise = computeAiRevenue({
      yacht,
      region: input.region,
      season: "mixed",
      occupancyTarget: input.occupancy_target ?? null,
      targetWeeksOverride: input.target_weeks ?? null,
      charterType: input.charter_type ?? null,
      marketRates: rates.market,
    });

    // Dual-region (additive). Only when a non-empty second region is supplied.
    const region2 =
      typeof input.region_2 === "string" && input.region_2.trim()
        ? input.region_2
        : null;
    if (region2) {
      const season2 = input.season_2 ?? "mixed";
      // Run both regions' AI lookups concurrently. Each computeAiRevenue can take
      // up to one full timeout window (≈70s incl. fallbacks); awaiting them in
      // sequence would risk 2×70s > the 120s proxy cutoff → 502. Promise.all
      // keeps worst-case latency to a single window. Results are independent.
      const [rev1, rev2] = await Promise.all([
        rev1Promise,
        (async () => {
          const rates2 = await loadRoiRates({
            yachtType: yacht.yacht_type ?? null,
            lengthMeters: Number(yacht.length_meters) || 0,
            region: region2,
          });
          return computeAiRevenue({
            yacht,
            region: region2,
            season: season2,
            occupancyTarget: input.occupancy_target_2 ?? null,
            targetWeeksOverride: null,
            charterType: input.charter_type_2 ?? null,
            marketRates: rates2.market,
          });
        })(),
      ]);
      revenue = combineRevenue(rev1, rev2);
      let reposition: number;
      if (
        input.repositioning_cost_eur != null &&
        input.repositioning_cost_eur > 0
      ) {
        reposition = Math.round(input.repositioning_cost_eur);
      } else {
        reposition = defaultRepositioningCost(input.region, region2);
        repositioningWasEstimated = true;
      }
      const income1 = Math.round(rev1.annual_gross_eur);
      const income2 = Math.round(rev2.annual_gross_eur);
      dualBreakdown = {
        region_1: toRegionIncome(
          input.region,
          "mixed",
          charterBasis(input.region, input.charter_type ?? null),
          rev1,
        ),
        region_2: toRegionIncome(
          region2,
          season2,
          charterBasis(region2, input.charter_type_2 ?? null),
          rev2,
        ),
        total_gross_income_eur: income1 + income2,
        repositioning_cost_eur: reposition,
        net_charter_income_eur: income1 + income2 - reposition,
      };
    } else {
      revenue = await rev1Promise;
    }
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
  // Dual-region repositioning is an additional annual operating cost.
  if (dualBreakdown && dualBreakdown.repositioning_cost_eur > 0) {
    allLines.push({
      category: "Repositioning (annual, both ways)",
      amount_eur: dualBreakdown.repositioning_cost_eur,
      formula: `Dual-region transit between the two charter areas${repositioningWasEstimated ? " (regional estimate — enter actual cost to override)" : ""}`,
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
  const depreciation = depreciationCurve(todayValue, 5, yacht.year_built ?? null);
  const projection = roiProjection5y(net, 5);
  const revByMonth = monthlySeasonal(revenue.annual_gross_eur);

  // Exit scenario — sale after 5 years. Additive output only; reuses the already
  // computed depreciation + 5-year cumulative projection (no recalculation). Built
  // ONLY when a real purchase price was entered, so the frontend hides the block
  // otherwise. Single scenario — the one this calculation was run for.
  let exitScenario: RoiExitScenario | undefined;
  if (purchase > 0) {
    const charterIncome5y = projection.length
      ? projection[projection.length - 1].value_eur
      : 0;
    const vesselValueAtSale = depreciation.length
      ? depreciation[depreciation.length - 1].value_eur
      : 0;
    const totalReturn = charterIncome5y + vesselValueAtSale;
    const exitResult = totalReturn - purchase;
    const exitResultPct = (exitResult / purchase) * 100;
    const hasLoan = loanAnnual > 0;
    // monthly_payment × 60 === annual annuity × 5; round once at the end.
    const totalLoanPaid = hasLoan ? Math.round(loanAnnual * 5) : null;
    const exitResultAfterLoan =
      totalLoanPaid != null ? exitResult - totalLoanPaid : null;
    exitScenario = {
      purchase_price_eur: Math.round(purchase),
      charter_income_5y_eur: Math.round(charterIncome5y),
      vessel_value_at_sale_eur: Math.round(vesselValueAtSale),
      total_return_eur: Math.round(totalReturn),
      exit_result_eur: Math.round(exitResult),
      exit_result_pct: Math.round(exitResultPct * 10) / 10,
      total_loan_paid_eur: totalLoanPaid,
      exit_result_after_loan_eur:
        exitResultAfterLoan != null ? Math.round(exitResultAfterLoan) : null,
    };
  }

  const ownerHasExpenses = [
    yacht.monthly_crew_eur,
    yacht.monthly_mooring_eur,
    yacht.monthly_fuel_eur,
    yacht.monthly_provisioning_eur,
    yacht.annual_insurance_eur,
    yacht.annual_refit_reserve_eur,
  ].some((v) => v != null);

  const methodology = buildMethodology({
    input,
    yacht,
    revenue,
    totalExpenses,
    net,
    roiPct,
    payback,
    hasLoan: loanAnnual > 0,
    hasPurchasePrice: purchase > 0,
    charterCommissionPct: exp.charterCommissionPct,
    managementFeePct: exp.managementFeePct,
    ownerManagementFee: yacht.monthly_management_fee_eur != null,
    dual: dualBreakdown,
    repositioningWasEstimated,
  });

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
    reasoning: buildAnalysis({
      input,
      yacht,
      revenue,
      totalExpenses,
      net,
      roiPct,
      payback,
      dual: dualBreakdown,
    }),
    methodology,
    recommendations: recommendations({
      netEur: net,
      paybackYears: payback,
      occupancyPct: revenue.occupancy_pct,
      ownerHasExpenses,
    }),
    // Spread only in the dual-region case — legacy responses omit the key.
    ...(dualBreakdown ? { dual_region: dualBreakdown } : {}),
    // Spread only when a purchase price was entered — omitted otherwise.
    ...(exitScenario ? { exit_scenario: exitScenario } : {}),
    confidence: revenue.confidence,
    legal_disclaimer: ROI_DISCLAIMER,
  };
}
