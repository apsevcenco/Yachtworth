import type { YachtRow } from "./types";

export interface ExpenseLine {
  category: string;
  amount_eur: number;
  formula: string | null;
}

const REGION_MULT: Record<string, number> = {
  mediterranean: 1.0,
  caribbean: 1.05,
  northern_europe: 0.95,
  asia_pacific_me: 1.1,
  middle_east: 1.15,
};

const MGMT_FEE_DEFAULT_PCT: Record<string, number> = {
  owner_operated: 0,
  management_company: 10,
  brokerage: 0, // brokerage handled by charter_commission; no separate mgmt fee
};

/**
 * Fallback heuristics when owner left a field blank.
 * Numbers are deliberately conservative & based on industry-standard
 * benchmarks for Med-region yachts; regional multiplier adjusts where it
 * actually moves (mooring, fuel, antifouling).
 */
interface FallbackInputs {
  lengthM: number;
  guests: number;
  purchasePriceEur: number;
  commercial: boolean;
  regionMult: number;
}

function fb(inp: FallbackInputs) {
  const { lengthM: L, guests, purchasePriceEur: P, commercial, regionMult: R } = inp;
  // Crew: based on size
  let crewMonthly = 0;
  if (L >= 40) crewMonthly = 60000;
  else if (L >= 24) crewMonthly = 25000;
  else if (L >= 15) crewMonthly = 8000;
  // Mooring: ~80 €/m/month Med-baseline
  const mooringMonthly = L * 80 * R;
  // Fuel: ~200 €/m/month average across season
  const fuelMonthly = L * 200 * R;
  // Provisioning: 800 €/guest/month
  const provisioningMonthly = guests > 0 ? guests * 800 : Math.round(L * 80);
  // Communications: ~600 €/mo across V-SAT + crew Wi-Fi
  const commsMonthly = 600;
  // Maintenance: 1.5% of value / yr, otherwise length-based
  const maintenanceMonthly = P > 0 ? (P * 0.015) / 12 : L * 250;
  // Misc: 1000 €/mo for unexpected
  const miscMonthly = 1000;
  // Insurance: 1.0% of value / yr (length fallback)
  const insuranceAnnual = P > 0 ? P * 0.01 : L * L * 50;
  // Registration / flag
  const registrationAnnual = commercial ? 3500 : 2000;
  // Classification / survey (commercial pays more)
  const classificationAnnual = commercial ? 8000 : 1500;
  // Antifouling / haul-out
  const antifoulingAnnual = L * 300 * R;
  // Refit reserve: 1% of value / yr
  const refitAnnual = P > 0 ? P * 0.01 : L * L * 100;
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
  managementStyle: string;
  /** Override pct (0–50) or null to use style default */
  managementFeeOverridePct: number | null;
  /** Annual gross charter revenue, used for % fees */
  annualGrossRevenueEur: number;
}

export function buildExpenses(args: BuildExpensesArgs): {
  lines: ExpenseLine[];
  annualTotalEur: number;
  charterCommissionPct: number;
  managementFeePct: number;
} {
  const { yacht, region, managementStyle, managementFeeOverridePct, annualGrossRevenueEur } = args;

  const L = Number(yacht.length_meters) || 18;
  const guests = Number(yacht.guests) || 0;
  const P = Number(yacht.purchase_price_eur) || 0;
  const commercial = Boolean(yacht.commercial_registration);
  const R = REGION_MULT[region] ?? 1.0;
  const defaults = fb({ lengthM: L, guests, purchasePriceEur: P, commercial, regionMult: R });

  const pickMonthly = (
    label: string,
    override: number | string | null | undefined,
    fallback: number,
  ): ExpenseLine => {
    const v = override == null ? null : Number(override);
    const used = v != null && isFinite(v) ? v : fallback;
    return {
      category: label,
      amount_eur: Math.round(used * 12),
      formula:
        v != null && isFinite(v)
          ? `Owner-provided: €${Math.round(used)}/mo × 12`
          : `Estimated €${Math.round(used)}/mo × 12 (region ${region})`,
    };
  };

  const pickAnnual = (
    label: string,
    override: number | string | null | undefined,
    fallback: number,
  ): ExpenseLine => {
    const v = override == null ? null : Number(override);
    const used = v != null && isFinite(v) ? v : fallback;
    return {
      category: label,
      amount_eur: Math.round(used),
      formula:
        v != null && isFinite(v)
          ? `Owner-provided: €${Math.round(used)}/yr`
          : `Estimated €${Math.round(used)}/yr`,
    };
  };

  const lines: ExpenseLine[] = [
    pickMonthly("Crew", yacht.monthly_crew_eur, defaults.crewMonthly),
    pickMonthly("Mooring / berth", yacht.monthly_mooring_eur, defaults.mooringMonthly),
    pickMonthly("Fuel", yacht.monthly_fuel_eur, defaults.fuelMonthly),
    pickMonthly("Provisioning", yacht.monthly_provisioning_eur, defaults.provisioningMonthly),
    pickMonthly("Communications", yacht.monthly_communications_eur, defaults.commsMonthly),
    pickMonthly("Routine maintenance", yacht.monthly_maintenance_eur, defaults.maintenanceMonthly),
    pickMonthly("Misc operating", yacht.monthly_misc_eur, defaults.miscMonthly),
    pickAnnual("Insurance", yacht.annual_insurance_eur, defaults.insuranceAnnual),
    pickAnnual("Registration / flag", yacht.annual_registration_eur, defaults.registrationAnnual),
    pickAnnual("Classification & survey", yacht.annual_classification_eur, defaults.classificationAnnual),
    pickAnnual("Antifouling & haul-out", yacht.annual_antifouling_eur, defaults.antifoulingAnnual),
    pickAnnual("Refit reserve", yacht.annual_refit_reserve_eur, defaults.refitAnnual),
  ];

  // Management fee — uses owner override on yacht, then RoiCalculationInput override, then style default
  const ownerOverride = yacht.monthly_management_fee_eur != null
    ? Number(yacht.monthly_management_fee_eur) * 12
    : null;
  const managementFeePct =
    managementFeeOverridePct != null
      ? managementFeeOverridePct
      : MGMT_FEE_DEFAULT_PCT[managementStyle] ?? 0;
  let mgmtAnnual = 0;
  let mgmtFormula = "";
  if (ownerOverride != null && isFinite(ownerOverride)) {
    mgmtAnnual = ownerOverride;
    mgmtFormula = `Owner-provided: €${Math.round(ownerOverride / 12)}/mo × 12`;
  } else if (managementFeePct > 0) {
    mgmtAnnual = annualGrossRevenueEur * (managementFeePct / 100);
    mgmtFormula = `${managementFeePct}% of gross charter revenue (${managementStyle})`;
  } else {
    mgmtFormula = `Not applicable (${managementStyle})`;
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
