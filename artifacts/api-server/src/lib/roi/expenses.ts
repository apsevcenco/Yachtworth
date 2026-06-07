import type { YachtRow } from "./types";
import { findExpense, lengthBand, type ExpenseRateRow } from "./rates";

export interface ExpenseLine {
  category: string;
  amount_eur: number;
  formula: string | null;
}

// Used only as a last-resort if neither owner override nor DB seed has a value.
const REGION_MULT: Record<string, number> = {
  mediterranean: 1.0,
  caribbean: 1.05,
  northern_europe: 0.95,
  asia_pacific_me: 1.1,
  middle_east: 1.15,
};

/**
 * Compute every default expense field. Each line prefers a value from
 * `expense_rates` (seeded data) and only falls back to the hard-coded
 * heuristic when no row matches — so once the seed is applied the
 * numbers below stop being used in practice.
 */
interface FallbackInputs {
  lengthM: number;
  guests: number;
  purchasePriceEur: number;
  commercial: boolean;
  region: string;
  regionMult: number;
  expenseRates: ExpenseRateRow[];
}

function fb(inp: FallbackInputs) {
  const { lengthM: L, guests, purchasePriceEur: P, commercial, region, regionMult: R, expenseRates } = inp;
  const band = lengthBand(L);
  const lookup = (cat: string, fallback: number, bandLabel: string | null = null) =>
    findExpense(expenseRates, cat, region, bandLabel) ?? fallback;

  // Crew: based on size (kept length-tier — owner usually fills the
  // 6-role crew breakdown so this is rarely the source of truth).
  let crewMonthly = 0;
  if (L >= 40) crewMonthly = 60000;
  else if (L >= 24) crewMonthly = 25000;
  else if (L >= 15) crewMonthly = 8000;

  // Mooring: €/m/month from seed → multiplied by length.
  const mooringPerMeter = lookup("mooring_per_meter_month", 80 * R);
  const mooringMonthly = L * mooringPerMeter;
  // Fuel: €/m/month from seed → multiplied by length.
  const fuelPerMeter = lookup("fuel_per_meter_month", 200 * R);
  const fuelMonthly = L * fuelPerMeter;
  // Provisioning: €/guest/month from seed.
  const provPerGuest = lookup("provisioning_per_guest_month", 800);
  const provisioningMonthly = guests > 0 ? guests * provPerGuest : Math.round(L * 80);
  // Communications: monthly flat from seed.
  const commsMonthly = lookup("comms_monthly", 600);
  // Maintenance: % of value / yr from seed, length-based if no purchase price.
  const maintPct = lookup("maintenance_pct_of_value_year", 1.5);
  const maintenanceMonthly = P > 0 ? (P * (maintPct / 100)) / 12 : L * 250;
  // Misc: monthly flat from seed.
  const miscMonthly = lookup("misc_monthly", 1000);
  // Insurance: % of value / yr from seed.
  const insPct = lookup("insurance_pct_of_value_year", 1.0);
  const insuranceAnnual = P > 0 ? P * (insPct / 100) : L * L * 50;
  // Registration / flag (commercial vs leisure variants both seeded).
  const registrationAnnual = commercial
    ? lookup("registration_commercial_year", 3500)
    : lookup("registration_leisure_year", 2000);
  // Classification / survey
  const classificationAnnual = commercial
    ? lookup("classification_commercial_year", 8000)
    : lookup("classification_leisure_year", 1500);
  // Antifouling / haul-out: €/m/year from seed.
  const antiPerMeter = lookup("antifouling_per_meter_year", 300 * R);
  const antifoulingAnnual = L * antiPerMeter;
  // Refit reserve: % of value / yr from seed.
  const refitPct = lookup("refit_reserve_pct_of_value_year", 1.0);
  const refitAnnual = P > 0 ? P * (refitPct / 100) : L * L * 100;

  void band; // length_band currently only used by market_rates lookup
  return {
    crewMonthly,
    mooringMonthly,
    fuelMonthly,
    provisioningMonthly,
    commsMonthly,
    maintenanceMonthly,
    miscMonthly,
    insuranceAnnual,
    registrationAnnual,
    classificationAnnual,
    antifoulingAnnual,
    refitAnnual,
  };
}

interface BuildExpensesArgs {
  yacht: YachtRow;
  region: string;
  /** Optional management-fee % override (0–50); null = owner manual fee or none */
  managementFeeOverridePct: number | null;
  /** Annual gross charter revenue, used for % fees */
  annualGrossRevenueEur: number;
  /** Pre-fetched expense_rates rows (Stage 4). Empty array = pure heuristic. */
  expenseRates?: ExpenseRateRow[];
}

export function buildExpenses(args: BuildExpensesArgs): {
  lines: ExpenseLine[];
  annualTotalEur: number;
  charterCommissionPct: number;
  managementFeePct: number;
} {
  const { yacht, region, managementFeeOverridePct, annualGrossRevenueEur } = args;
  const expenseRates = args.expenseRates ?? [];

  const L = Number(yacht.length_meters) || 18;
  const guests = Number(yacht.guests) || 0;
  const P = Number(yacht.purchase_price_eur) || 0;
  const commercial = Boolean(yacht.commercial_registration);
  const R = REGION_MULT[region] ?? 1.0;
  const defaults = fb({
    lengthM: L,
    guests,
    purchasePriceEur: P,
    commercial,
    region,
    regionMult: R,
    expenseRates,
  });

  // Owner rule: an expense line appears in the report ONLY when the owner
  // filled it in. The single exception is Routine maintenance — it ALWAYS
  // appears with a regional estimate even if blank, because no boat in
  // operation has truly zero maintenance and skipping it would inflate ROI.
  const pickMonthly = (
    label: string,
    override: number | string | null | undefined,
    fallback: number,
    alwaysEstimate = false,
  ): ExpenseLine | null => {
    const v = override == null ? null : Number(override);
    if (v != null && isFinite(v)) {
      return {
        category: label,
        amount_eur: Math.round(v * 12),
        formula: `Owner-provided: €${Math.round(v)}/mo × 12`,
      };
    }
    if (!alwaysEstimate) return null;
    return {
      category: label,
      amount_eur: Math.round(fallback * 12),
      formula: `Estimated €${Math.round(fallback)}/mo × 12 (region ${region})`,
    };
  };

  const pickAnnual = (
    label: string,
    override: number | string | null | undefined,
    fallback: number,
    alwaysEstimate = false,
  ): ExpenseLine | null => {
    const v = override == null ? null : Number(override);
    if (v != null && isFinite(v)) {
      return {
        category: label,
        amount_eur: Math.round(v),
        formula: `Owner-provided: €${Math.round(v)}/yr`,
      };
    }
    if (!alwaysEstimate) return null;
    return {
      category: label,
      amount_eur: Math.round(fallback),
      formula: `Estimated €${Math.round(fallback)}/yr`,
    };
  };

  const lines: ExpenseLine[] = (
    [
      pickMonthly("Crew", yacht.monthly_crew_eur, defaults.crewMonthly),
      pickMonthly("Mooring / berth", yacht.monthly_mooring_eur, defaults.mooringMonthly),
      pickMonthly("Fuel", yacht.monthly_fuel_eur, defaults.fuelMonthly),
      pickMonthly("Provisioning", yacht.monthly_provisioning_eur, defaults.provisioningMonthly),
      pickMonthly("Communications", yacht.monthly_communications_eur, defaults.commsMonthly),
      // Exception — maintenance always shown with regional estimate.
      pickMonthly("Routine maintenance", yacht.monthly_maintenance_eur, defaults.maintenanceMonthly, true),
      pickMonthly("Misc operating", yacht.monthly_misc_eur, defaults.miscMonthly),
      pickAnnual("Insurance", yacht.annual_insurance_eur, defaults.insuranceAnnual),
      pickAnnual("Registration / flag", yacht.annual_registration_eur, defaults.registrationAnnual),
      pickAnnual("Classification & survey", yacht.annual_classification_eur, defaults.classificationAnnual),
      pickAnnual("Antifouling & haul-out", yacht.annual_antifouling_eur, defaults.antifoulingAnnual),
      pickAnnual("Refit reserve", yacht.annual_refit_reserve_eur, defaults.refitAnnual),
    ] as (ExpenseLine | null)[]
  ).filter((l): l is ExpenseLine => l !== null);

  // Management fee — owner's manual monthly fee on the yacht, then an optional
  // per-calculation % override. No fee if neither is provided.
  const ownerOverride = yacht.monthly_management_fee_eur != null
    ? Number(yacht.monthly_management_fee_eur) * 12
    : null;
  const managementFeePct =
    managementFeeOverridePct != null ? managementFeeOverridePct : 0;
  let mgmtAnnual = 0;
  let mgmtFormula = "";
  if (ownerOverride != null && isFinite(ownerOverride)) {
    mgmtAnnual = ownerOverride;
    mgmtFormula = `Owner-provided: €${Math.round(ownerOverride / 12)}/mo × 12`;
  } else if (managementFeePct > 0) {
    mgmtAnnual = annualGrossRevenueEur * (managementFeePct / 100);
    mgmtFormula = `${managementFeePct}% of gross charter revenue`;
  } else {
    mgmtFormula = "Not applicable";
  }
  lines.push({
    category: "Management fee",
    amount_eur: Math.round(mgmtAnnual),
    formula: mgmtFormula,
  });

  // Charter broker commission
  const ccPct = yacht.charter_commission_pct != null
    ? Number(yacht.charter_commission_pct)
    : 15;
  const charterCommission = annualGrossRevenueEur * (ccPct / 100);
  lines.push({
    category: "Charter broker commission",
    amount_eur: Math.round(charterCommission),
    formula: `${ccPct}% of gross charter revenue${
      yacht.charter_commission_pct != null ? "" : " (default 15%)"
    }`,
  });

  const annualTotalEur = lines.reduce((sum, l) => sum + l.amount_eur, 0);
  return { lines, annualTotalEur, charterCommissionPct: ccPct, managementFeePct };
}
