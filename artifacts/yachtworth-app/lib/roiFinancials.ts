/**
 * Shared ROI financials model — crew / operating expenses / financing /
 * purchase price.
 *
 * These values live ONLY in ROI. The ROI scenario screen (`roi/calculate.tsx`)
 * collects them and sends them as per-calculation overrides that are NEVER
 * written back to the yacht (My Yachts is read-only from ROI). When a saved
 * yacht is the starting point, `hydrateFinancialsFromYacht` prefills from any
 * legacy financials already on the profile; otherwise the user enters them.
 * Keeping the field lists + helpers in one place keeps hydration and override
 * building in lockstep — a missing field here would make the ROI quietly wrong.
 *
 * Pure data + helpers only: no React Native imports so it stays trivially
 * testable and importable from anywhere in the app.
 */

// ── Crew positions ──────────────────────────────────────────────────────
// `countable` roles get a headcount stepper (a yacht can carry several
// stewardesses / deckhands). Singular roles (captain, mate, engineer, chef)
// are always exactly one person — no counter, no clutter.
export const CREW_POSITIONS: { key: string; label: string; countable?: boolean }[] = [
  { key: "captain", label: "Captain" },
  { key: "first_officer", label: "First officer / Mate" },
  { key: "engineer", label: "Chief engineer" },
  { key: "chef", label: "Chef" },
  { key: "stewardess", label: "Stewardess", countable: true },
  { key: "deckhand", label: "Deckhand", countable: true },
];

const COUNTABLE_ROLES: ReadonlySet<string> = new Set(
  CREW_POSITIONS.filter((p) => p.countable).map((p) => p.label),
);

/** Only stewardess + deckhand may carry more than one person. */
export function roleSupportsCount(role: string): boolean {
  return COUNTABLE_ROLES.has(role);
}

export interface CrewRow {
  role: string;
  monthly_salary_eur: string; // string while editing — PER PERSON
  months_per_year: number; // 1..12
  count: number; // headcount in this role, 1..50 (e.g. 3 deckhands)
}

export const INITIAL_CREW: CrewRow[] = CREW_POSITIONS.map((p) => ({
  role: p.label,
  monthly_salary_eur: "",
  months_per_year: 12,
  count: 1,
}));

// ── Expense fields ──────────────────────────────────────────────────────
// Naming convention matches DB columns / OpenAPI exactly so payload mapping
// is a 1-to-1 copy.
export const MONTHLY_FIELDS = [
  { key: "monthly_mooring_eur", label: "Mooring / berth", hint: "Marina contract or rolling fees" },
  { key: "monthly_fuel_eur", label: "Fuel", hint: "Average across the season" },
  { key: "monthly_provisioning_eur", label: "Provisioning", hint: "Food, drink, consumables" },
  { key: "monthly_communications_eur", label: "Communications", hint: "Satellite, Wi-Fi, phone" },
  { key: "monthly_maintenance_eur", label: "Routine maintenance", hint: "Servicing, small repairs" },
  { key: "monthly_management_fee_eur", label: "Management fee", hint: "If yacht is professionally managed" },
  { key: "monthly_misc_eur", label: "Other monthly costs", hint: "Anything not listed above" },
] as const;

export const ANNUAL_FIELDS = [
  { key: "annual_insurance_eur", label: "Insurance", hint: "Hull + P&I, full annual premium" },
  { key: "annual_registration_eur", label: "Registration / flag", hint: "Annual flag-state fees" },
  { key: "annual_classification_eur", label: "Classification & survey", hint: "Class society, MCA, audits" },
  { key: "annual_antifouling_eur", label: "Antifouling & haul-out", hint: "Yearly bottom service" },
  { key: "engine_service_eur", label: "Engine service", hint: "Main engine(s) annual service" },
  { key: "generator_service_eur", label: "Generator service", hint: "Generator(s) annual service" },
  { key: "annual_refit_reserve_eur", label: "Refit reserve", hint: "Money set aside for major refit" },
] as const;

export type MonthlyKey = (typeof MONTHLY_FIELDS)[number]["key"];
export type AnnualKey = (typeof ANNUAL_FIELDS)[number]["key"];
export type FinancingType = "cash" | "loan";

// ── Small parsing helpers ───────────────────────────────────────────────
export function parseNum(v: string): number | null {
  const n = parseFloat(v.replace(",", "."));
  return isFinite(n) ? n : null;
}

export function parseInt10(v: string): number | null {
  const n = parseInt(v.replace(/[^0-9]/g, ""), 10);
  return isFinite(n) ? n : null;
}

export function toStr(n: number | null | undefined): string {
  return n != null ? String(n) : "";
}

/**
 * Build the crew_breakdown form state from a saved yacht. If the DB row has a
 * real crew_breakdown array, use it; otherwise fall back to the 6 default rows
 * and put any legacy monthly_crew_eur total into the Captain row so existing
 * data isn't silently dropped.
 */
export function hydrateCrew(
  raw: unknown,
  legacyTotal: number | null | undefined,
): CrewRow[] {
  if (Array.isArray(raw) && raw.length > 0) {
    const incoming = raw
      .map((r) => {
        if (!r || typeof r !== "object") return null;
        const o = r as Record<string, unknown>;
        const role = typeof o.role === "string" ? o.role : "";
        const salary =
          typeof o.monthly_salary_eur === "number"
            ? String(o.monthly_salary_eur)
            : typeof o.monthly_salary_eur === "string"
            ? o.monthly_salary_eur
            : "";
        const monthsRaw = Number(o.months_per_year);
        const months =
          Number.isFinite(monthsRaw) && monthsRaw >= 1 && monthsRaw <= 12
            ? Math.round(monthsRaw)
            : 12;
        const countRaw = Number(o.count);
        const count =
          Number.isFinite(countRaw) && countRaw >= 1 && countRaw <= 50
            ? Math.round(countRaw)
            : 1;
        return role
          ? { role, monthly_salary_eur: salary, months_per_year: months, count }
          : null;
      })
      .filter((r): r is CrewRow => r !== null);
    const merged = INITIAL_CREW.map((def) => {
      const match = incoming.find((r) => r.role === def.role);
      return match ?? def;
    });
    const extras = incoming.filter(
      (r) => !INITIAL_CREW.some((def) => def.role === r.role),
    );
    return [...merged, ...extras];
  }
  if (legacyTotal != null && legacyTotal > 0) {
    return INITIAL_CREW.map((p, i) =>
      i === 0 ? { ...p, monthly_salary_eur: String(legacyTotal) } : p,
    );
  }
  return INITIAL_CREW;
}

function crewCount(c: number): number {
  return c > 0 && c <= 50 ? Math.round(c) : 1;
}

export function computeCrewMonthlyTotal(rows: CrewRow[]): number {
  let total = 0;
  for (const r of rows) {
    const s = parseFloat(r.monthly_salary_eur.replace(",", "."));
    if (isFinite(s) && s > 0) {
      const m = r.months_per_year > 0 && r.months_per_year <= 12 ? r.months_per_year : 12;
      const c = roleSupportsCount(r.role) ? crewCount(r.count) : 1;
      total += s * c * (m / 12);
    }
  }
  return Math.round(total);
}

// Strip empty crew rows and coerce to the API CrewMember shape.
export function crewBreakdownToApi(
  rows: CrewRow[],
): { role: string; monthly_salary_eur: number; months_per_year: number; count: number }[] {
  const out: {
    role: string;
    monthly_salary_eur: number;
    months_per_year: number;
    count: number;
  }[] = [];
  for (const r of rows) {
    const salary = parseNum(r.monthly_salary_eur);
    if (salary == null || salary <= 0) continue;
    const months =
      r.months_per_year > 0 && r.months_per_year <= 12 ? r.months_per_year : 12;
    out.push({
      role: r.role,
      monthly_salary_eur: salary,
      months_per_year: months,
      count: roleSupportsCount(r.role) ? crewCount(r.count) : 1,
    });
  }
  return out;
}

// ── Financials state used by the ROI scenario screen ────────────────────
export interface FinancialsState {
  crew_breakdown: CrewRow[];
  monthly_mooring_eur: string;
  monthly_fuel_eur: string;
  monthly_provisioning_eur: string;
  monthly_communications_eur: string;
  monthly_maintenance_eur: string;
  monthly_management_fee_eur: string;
  monthly_misc_eur: string;
  annual_insurance_eur: string;
  annual_registration_eur: string;
  annual_classification_eur: string;
  annual_antifouling_eur: string;
  engine_service_eur: string;
  generator_service_eur: string;
  annual_refit_reserve_eur: string;
  charter_commission_pct: string;
  financing_type: FinancingType | null;
  loan_amount_eur: string;
  loan_rate_pct: string;
  loan_term_years: string;
}

export const EMPTY_FINANCIALS: FinancialsState = {
  crew_breakdown: INITIAL_CREW,
  monthly_mooring_eur: "",
  monthly_fuel_eur: "",
  monthly_provisioning_eur: "",
  monthly_communications_eur: "",
  monthly_maintenance_eur: "",
  monthly_management_fee_eur: "",
  monthly_misc_eur: "",
  annual_insurance_eur: "",
  annual_registration_eur: "",
  annual_classification_eur: "",
  annual_antifouling_eur: "",
  engine_service_eur: "",
  generator_service_eur: "",
  annual_refit_reserve_eur: "",
  charter_commission_pct: "",
  financing_type: null,
  loan_amount_eur: "",
  loan_rate_pct: "",
  loan_term_years: "",
};

type YachtLike = Record<string, unknown> & {
  crew_breakdown?: unknown;
  monthly_crew_eur?: number | string | null;
};

function numStr(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "number") return Number.isFinite(v) ? String(v) : "";
  if (typeof v === "string") return v;
  return "";
}

/**
 * Prefill the financials form from a saved yacht. A My Yacht profile usually has
 * no expense data, so most fields come back empty — that's expected, the user
 * fills them in for the ROI run.
 */
export function hydrateFinancialsFromYacht(
  y: YachtLike | null | undefined,
): FinancialsState {
  if (!y) return EMPTY_FINANCIALS;
  return {
    crew_breakdown: hydrateCrew(
      y.crew_breakdown,
      y.monthly_crew_eur != null ? Number(y.monthly_crew_eur) : null,
    ),
    monthly_mooring_eur: numStr(y.monthly_mooring_eur),
    monthly_fuel_eur: numStr(y.monthly_fuel_eur),
    monthly_provisioning_eur: numStr(y.monthly_provisioning_eur),
    monthly_communications_eur: numStr(y.monthly_communications_eur),
    monthly_maintenance_eur: numStr(y.monthly_maintenance_eur),
    monthly_management_fee_eur: numStr(y.monthly_management_fee_eur),
    monthly_misc_eur: numStr(y.monthly_misc_eur),
    annual_insurance_eur: numStr(y.annual_insurance_eur),
    annual_registration_eur: numStr(y.annual_registration_eur),
    annual_classification_eur: numStr(y.annual_classification_eur),
    annual_antifouling_eur: numStr(y.annual_antifouling_eur),
    engine_service_eur: numStr(y.engine_service_eur),
    generator_service_eur: numStr(y.generator_service_eur),
    annual_refit_reserve_eur: numStr(y.annual_refit_reserve_eur),
    charter_commission_pct: numStr(y.charter_commission_pct),
    financing_type:
      y.financing_type === "loan" || y.financing_type === "cash"
        ? y.financing_type
        : null,
    loan_amount_eur: numStr(y.loan_amount_eur),
    loan_rate_pct: numStr(y.loan_rate_pct),
    loan_term_years: numStr(y.loan_term_years),
  };
}

export interface RoiOverrides {
  crew_breakdown?: { role: string; monthly_salary_eur: number; months_per_year: number; count: number }[];
  purchase_price_eur?: number;
  monthly_crew_eur?: number;
  monthly_mooring_eur?: number;
  monthly_fuel_eur?: number;
  monthly_provisioning_eur?: number;
  monthly_communications_eur?: number;
  monthly_maintenance_eur?: number;
  monthly_management_fee_eur?: number;
  monthly_misc_eur?: number;
  annual_insurance_eur?: number;
  annual_registration_eur?: number;
  annual_classification_eur?: number;
  annual_antifouling_eur?: number;
  engine_service_eur?: number;
  generator_service_eur?: number;
  annual_refit_reserve_eur?: number;
  charter_commission_pct?: number;
  financing_type?: FinancingType;
  loan_amount_eur?: number;
  loan_rate_pct?: number;
  loan_term_years?: number;
}

/**
 * Turn the financials form into the ROI `overrides` payload. Only fields the
 * user actually filled are included; everything else is omitted so the backend
 * falls back to the saved yacht value (or a regional baseline). Returns null
 * when nothing was entered, so an untouched form sends no overrides at all.
 */
export function buildRoiOverrides(state: FinancialsState): RoiOverrides | null {
  const o: RoiOverrides = {};

  const crewApi = crewBreakdownToApi(state.crew_breakdown);
  if (crewApi.length > 0) {
    o.crew_breakdown = crewApi;
    o.monthly_crew_eur = computeCrewMonthlyTotal(state.crew_breakdown);
  }

  const numericKeys: (keyof FinancialsState & keyof RoiOverrides)[] = [
    "monthly_mooring_eur",
    "monthly_fuel_eur",
    "monthly_provisioning_eur",
    "monthly_communications_eur",
    "monthly_maintenance_eur",
    "monthly_management_fee_eur",
    "monthly_misc_eur",
    "annual_insurance_eur",
    "annual_registration_eur",
    "annual_classification_eur",
    "annual_antifouling_eur",
    "engine_service_eur",
    "generator_service_eur",
    "annual_refit_reserve_eur",
    "charter_commission_pct",
  ];
  for (const k of numericKeys) {
    const n = parseNum(state[k] as string);
    if (n != null && n >= 0) o[k] = n as never;
  }

  if (state.financing_type) {
    o.financing_type = state.financing_type;
    if (state.financing_type === "loan") {
      const amt = parseNum(state.loan_amount_eur);
      const rate = parseNum(state.loan_rate_pct);
      const term = parseInt10(state.loan_term_years);
      if (amt != null && amt >= 0) o.loan_amount_eur = amt;
      if (rate != null && rate >= 0) o.loan_rate_pct = rate;
      if (term != null && term >= 0) o.loan_term_years = term;
    }
  }

  return Object.keys(o).length > 0 ? o : null;
}
