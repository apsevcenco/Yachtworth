import type {
  CostEstimateInput,
  CostEstimateResult,
  CrewPositionInput,
  CostBreakdownEntry,
} from "@workspace/api-zod";
import { annualLoanPayment } from "../roi/loan";

export const COST_DISCLAIMER =
  "This estimate is indicative and based on user-provided data. Actual costs may vary. Consult a licensed yacht management firm for certified advice.";

// ---------- Auto-estimate helpers (per spec autoEstimates.js) ----------

/**
 * Rough market value table (€) by LOA in metres. Interpolated linearly.
 * Anchors per owner spec: 15m=400K, 20m=900K, 24m=1.8M, 30m=3M, 40m=6M.
 */
const VALUE_ANCHORS: Array<[number, number]> = [
  [10, 150_000],
  [15, 400_000],
  [20, 900_000],
  [24, 1_800_000],
  [30, 3_000_000],
  [40, 6_000_000],
  [50, 11_000_000],
  [60, 18_000_000],
];

export function estimateYachtValue(lengthM: number, yearBuilt: number): number {
  let baseValue: number;
  if (lengthM <= VALUE_ANCHORS[0]![0]) {
    baseValue = VALUE_ANCHORS[0]![1] * (lengthM / VALUE_ANCHORS[0]![0]);
  } else if (lengthM >= VALUE_ANCHORS[VALUE_ANCHORS.length - 1]![0]) {
    baseValue = VALUE_ANCHORS[VALUE_ANCHORS.length - 1]![1];
  } else {
    for (let i = 0; i < VALUE_ANCHORS.length - 1; i++) {
      const [l1, v1] = VALUE_ANCHORS[i]!;
      const [l2, v2] = VALUE_ANCHORS[i + 1]!;
      if (lengthM >= l1 && lengthM <= l2) {
        const t = (lengthM - l1) / (l2 - l1);
        baseValue = v1 + t * (v2 - v1);
        break;
      }
    }
    baseValue = baseValue!;
  }
  // Age depreciation: -2.5%/year from build year, floor at 30% of new value.
  const age = Math.max(0, new Date().getFullYear() - yearBuilt);
  const ageMult = Math.max(0.3, 1 - age * 0.025);
  return Math.round(baseValue * ageMult);
}

export function estimateInsuranceAnnual(
  lengthM: number,
  yearBuilt: number,
): number {
  return Math.round(estimateYachtValue(lengthM, yearBuilt) * 0.01);
}

export function estimateMaintenanceMonthly(
  lengthM: number,
  yearBuilt: number,
): number {
  return Math.round((estimateYachtValue(lengthM, yearBuilt) * 0.06) / 12);
}

const MOORING_RATES: Record<string, { base: number; perMeter: number }> = {
  mediterranean: { base: 800, perMeter: 120 },
  caribbean: { base: 600, perMeter: 90 },
  northern_europe: { base: 500, perMeter: 70 },
  asia_pacific: { base: 550, perMeter: 80 },
  middle_east: { base: 700, perMeter: 100 },
  global: { base: 650, perMeter: 95 },
};

export function estimateMooringMonthly(
  lengthM: number,
  region: string,
): number {
  const r = MOORING_RATES[region] ?? MOORING_RATES["global"]!;
  return Math.round(r.base + r.perMeter * lengthM);
}

// ---------- Crew defaults ----------

export interface CrewPositionDefault {
  key: string;
  label: string;
  defaultSalary: number;
  allowQuantity: boolean;
  defaultEnabled: (lengthM: number) => boolean;
}

export const CREW_POSITIONS: CrewPositionDefault[] = [
  { key: "captain", label: "Captain", defaultSalary: 4000, allowQuantity: false, defaultEnabled: (l) => l >= 15 },
  { key: "first_officer", label: "First Officer / Mate", defaultSalary: 3000, allowQuantity: false, defaultEnabled: () => false },
  { key: "chief_engineer", label: "Chief Engineer", defaultSalary: 3500, allowQuantity: false, defaultEnabled: () => false },
  { key: "chef", label: "Chef / Cook", defaultSalary: 2500, allowQuantity: false, defaultEnabled: () => false },
  { key: "stewardess", label: "Stewardess", defaultSalary: 2000, allowQuantity: true, defaultEnabled: () => false },
  { key: "deckhand", label: "Deckhand", defaultSalary: 1800, allowQuantity: true, defaultEnabled: () => false },
  { key: "bosun", label: "Bosun", defaultSalary: 2200, allowQuantity: false, defaultEnabled: () => false },
  { key: "security", label: "Security", defaultSalary: 2500, allowQuantity: false, defaultEnabled: () => false },
];

const CREW_LABEL_BY_KEY: Record<string, string> = Object.fromEntries(
  CREW_POSITIONS.map((p) => [p.key, p.label]),
);

// ---------- Calculator ----------

// Spec rule: only stewardess and deckhand are seasonal — they may have
// quantity > 1 AND months_per_year < 12. All other positions are full-time
// year-round (12 months) and locked to quantity = 1, regardless of what
// the client sends.
const SEASONAL_ALLOWED = new Set(["stewardess", "deckhand"]);

function effectiveQuantity(p: CrewPositionInput): number {
  if (!SEASONAL_ALLOWED.has(p.position)) return 1;
  const raw = Math.floor(Number(p.quantity ?? 1));
  if (!isFinite(raw) || raw < 1) return 1;
  return Math.min(4, raw);
}

function effectiveMonths(p: CrewPositionInput): number {
  if (!SEASONAL_ALLOWED.has(p.position)) return 12;
  const raw = Math.floor(Number(p.months_per_year ?? 12));
  if (!isFinite(raw) || raw < 1) return 12;
  return Math.min(12, raw);
}

function crewAnnualForPosition(p: CrewPositionInput): number {
  if (!p.enabled) return 0;
  const salary = Number(p.monthly_salary_eur ?? 0);
  if (!isFinite(salary) || salary <= 0) return 0;
  return Math.round(salary * effectiveMonths(p) * effectiveQuantity(p));
}

const CATEGORY_COLORS = {
  crew: "#C9A961",
  operations: "#5A7A9C",
  maintenance: "#3FB8AF",
  financing: "#E08E5B",
} as const;

export function computeCostEstimate(
  input: CostEstimateInput,
): CostEstimateResult {
  const lengthM = Number(input.length_meters);
  // year_built is an integer in the contract; orval generates `number()` so clamp.
  const year = Math.floor(Number(input.year_built));

  // ---- Crew ----
  const crewLines: CostBreakdownEntry[] = [];
  let crewTotal = 0;
  for (const pos of input.crew ?? []) {
    const annual = crewAnnualForPosition(pos);
    if (annual <= 0) continue;
    const qty = effectiveQuantity(pos);
    const months = effectiveMonths(pos);
    const label = CREW_LABEL_BY_KEY[pos.position] ?? pos.position;
    const salary = Number(pos.monthly_salary_eur ?? 0);
    crewLines.push({
      category: qty > 1 ? `${label} × ${qty}` : label,
      amount_eur: annual,
      formula: `€${salary.toLocaleString("en-US")}/mo × ${months}${qty > 1 ? ` × ${qty}` : ""}`,
    });
    crewTotal += annual;
  }

  // ---- Monthly operating expenses ----
  const monthly = input.monthly_expenses;
  const monthlyLines: CostBreakdownEntry[] = [];
  let operationsTotal = 0;
  const pushMonthly = (label: string, monthlyAmount: number | null | undefined, formulaHint?: string) => {
    const v = Number(monthlyAmount ?? 0);
    if (!isFinite(v) || v <= 0) return;
    const annual = Math.round(v * 12);
    monthlyLines.push({
      category: label,
      amount_eur: annual,
      formula: formulaHint ?? `€${Math.round(v).toLocaleString("en-US")}/mo × 12`,
    });
    operationsTotal += annual;
  };
  pushMonthly("Mooring / berth", monthly.mooring_eur);
  pushMonthly("Fuel", monthly.fuel_eur);
  pushMonthly("Provisioning", monthly.provisioning_eur);
  pushMonthly("Communications", monthly.communications_eur);

  // ---- Annual maintenance & technical ----
  const annual = input.annual_expenses;
  const maintenanceLines: CostBreakdownEntry[] = [];
  let maintenanceTotal = 0;

  // Routine maintenance is owner-input monthly but conceptually belongs in
  // the maintenance bucket on the result screen.
  {
    const v = Number(monthly.maintenance_eur ?? 0);
    if (isFinite(v) && v > 0) {
      const yearly = Math.round(v * 12);
      maintenanceLines.push({
        category: "Routine maintenance",
        amount_eur: yearly,
        formula: `€${Math.round(v).toLocaleString("en-US")}/mo × 12`,
      });
      maintenanceTotal += yearly;
    }
  }
  const pushAnnual = (label: string, value: number | null | undefined) => {
    const v = Number(value ?? 0);
    if (!isFinite(v) || v <= 0) return;
    maintenanceLines.push({
      category: label,
      amount_eur: Math.round(v),
      formula: `€${Math.round(v).toLocaleString("en-US")}/yr`,
    });
    maintenanceTotal += Math.round(v);
  };
  pushAnnual("Insurance (hull + P&I)", annual.insurance_eur);
  pushAnnual("Registration / flag", annual.registration_eur);
  pushAnnual("Classification & survey", annual.classification_eur);
  pushAnnual("Antifouling & haul-out", annual.antifouling_eur);
  pushAnnual("Engine service", annual.engine_service_eur);
  pushAnnual("Generator service", annual.generator_service_eur);
  pushAnnual("Electronics & navigation", annual.electronics_service_eur);
  pushAnnual("Safety equipment certification", annual.safety_equipment_eur);
  pushAnnual("Tender & outboard service", annual.tender_service_eur);
  pushAnnual("Hull paint / polish", annual.hull_paint_eur);
  pushAnnual("Rigging inspection", annual.rigging_service_eur);
  pushAnnual("Watermaker service", annual.watermaker_service_eur);
  pushAnnual("Refit reserve", annual.refit_reserve_eur);

  // ---- Financing ----
  const financingLines: CostBreakdownEntry[] = [];
  let financingTotal = 0;
  if (input.financing.type === "loan") {
    const principal = Number(input.financing.loan_amount_eur ?? 0);
    const rate = Number(input.financing.interest_rate_pct ?? 0);
    // Spec contract: term_years is an integer. Clamp defensively because
    // orval currently generates `number()` (not `.int()`) for integer fields.
    const term = Math.max(0, Math.floor(Number(input.financing.term_years ?? 0)));
    if (principal > 0 && term > 0) {
      const annualPayment = annualLoanPayment(principal, rate, term);
      financingTotal = Math.round(annualPayment);
      financingLines.push({
        category: "Loan repayment",
        amount_eur: financingTotal,
        formula: `€${Math.round(principal).toLocaleString("en-US")} @ ${rate}% / ${term}y`,
      });
    }
  }

  // ---- Totals ----
  const totalAnnual = crewTotal + operationsTotal + maintenanceTotal + financingTotal;
  const costPerDay = Math.round(totalAnnual / 365);
  const costPerWeek = Math.round(totalAnnual / 52);

  // ---- Charter break-even (if Mixed / Charter usage) ----
  let charterBreakEvenWeeks: number | null = null;
  if (
    (input.usage_type === "mixed" || input.usage_type === "charter_focused") &&
    totalAnnual > 0
  ) {
    // Rough weekly charter rate guess: scale by length and region.
    const weeklyRate = estimateWeeklyCharterRate(lengthM, input.region);
    if (weeklyRate > 0) {
      const commissionPct = Number(input.broker_commission_pct ?? 20) / 100;
      const netPerWeek = weeklyRate * (1 - commissionPct);
      if (netPerWeek > 0) {
        charterBreakEvenWeeks = Math.ceil(totalAnnual / netPerWeek);
      }
    }
  }

  // ---- Category summary for donut chart ----
  const categorySummary = [
    { category: "Crew", amount_eur: crewTotal, color_hint: CATEGORY_COLORS.crew },
    { category: "Mooring & Operations", amount_eur: operationsTotal, color_hint: CATEGORY_COLORS.operations },
    { category: "Maintenance & Technical", amount_eur: maintenanceTotal, color_hint: CATEGORY_COLORS.maintenance },
    { category: "Financing", amount_eur: financingTotal, color_hint: CATEGORY_COLORS.financing },
  ].filter((c) => c.amount_eur > 0);

  return {
    total_annual_eur: Math.round(totalAnnual),
    cost_per_day_eur: costPerDay,
    cost_per_week_eur: costPerWeek,
    crew_total_eur: crewTotal,
    operations_total_eur: operationsTotal,
    maintenance_total_eur: maintenanceTotal,
    financing_total_eur: financingTotal,
    crew_breakdown: crewLines,
    operations_breakdown: monthlyLines,
    maintenance_breakdown: maintenanceLines,
    financing_breakdown: financingLines,
    category_summary: categorySummary,
    charter_break_even_weeks: charterBreakEvenWeeks,
    currency: "EUR",
    legal_disclaimer: COST_DISCLAIMER,
    // Echo length & year so result screen can show context.
    yacht_class: input.yacht_class,
    length_meters: lengthM,
    year_built: year,
    yacht_name: input.yacht_name ?? null,
  };
}

// Rough weekly charter rate by length / region for break-even hint only.
// Not a substitute for the ROI module's AI/manual rate search.
const WEEKLY_RATE_BASE: Record<string, number> = {
  mediterranean: 1800,
  caribbean: 1600,
  northern_europe: 1500,
  asia_pacific: 1400,
  middle_east: 1700,
  global: 1500,
};

function estimateWeeklyCharterRate(lengthM: number, region: string): number {
  const base = WEEKLY_RATE_BASE[region] ?? WEEKLY_RATE_BASE["global"]!;
  // Non-linear scaling: rates climb faster for superyachts.
  return Math.round(base * Math.pow(lengthM, 1.35));
}
