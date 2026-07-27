import { getAuthToken, getBaseUrl } from "@workspace/api-client-react";

export type FlagComparisonInput = {
  loa_m?: number | null;
  gt?: number | null;
  year_built?: number | null;
  builder?: string | null;
  value_eur?: number | null;
  use_type?: "private" | "commercial" | null;
  charter?: boolean | null;
  navigation_area?: string | null;
  owner_nationality?: string | null;
  owner_residency?: string | null;
  company_country?: string | null;
  current_flag?: string | null;
  crew_nationality?: string | null;
  intended_cruising_area?: string | null;
  registration_type?: "new_registration" | "reflag" | null;
  mortgage_needed?: boolean | null;
};

export type LegalPartner = {
  name: string;
  jurisdiction?: string;
  contact_url?: string;
  email?: string;
  phone?: string;
  notes?: string;
  sponsored?: boolean;
};

export type FlagRegistry = {
  code: string;
  flag_name: string;
  country: string;
  registry_type: string;
  private_available: boolean;
  commercial_available: boolean;
  accepted_class: string[];
  registration_cost_eur: number | null;
  annual_fee_eur: number | null;
  mortgage_available: boolean;
  temporary_registration: boolean;
  permanent_registration: boolean;
  radio_license: boolean;
  processing_time_days_min: number | null;
  processing_time_days_max: number | null;
  survey_required: boolean;
  classification_required: boolean;
  owner_nationality_restrictions: string | null;
  company_restrictions: string | null;
  crew_restrictions: string | null;
  vat_notes: string | null;
  insurance_notes: string | null;
  advantages: string[];
  disadvantages: string[];
  official_website: string | null;
  legal_partners: LegalPartner[];
  last_updated: string;
  advisor?: {
    slug?: string;
    country_or_territory?: string | null;
    official_registry_name?: string | null;
    registry_family?: string | null;
    is_eu_flag?: boolean | null;
    private_registration_status?: string | null;
    commercial_registration_status?: string | null;
    private_minimum_loa?: string | null;
    commercial_minimum_loa?: string | null;
    maximum_loa_gt_notes?: string | null;
    passenger_limit_notes?: string | null;
    provisional_registration_status?: string | null;
    provisional_validity?: string | null;
    permanent_validity?: string | null;
    owner_eligibility?: string | null;
    foreign_company_ownership?: string | null;
    local_agent_requirement?: string | null;
    mortgage_registration_status?: string | null;
    radio_licence_requirement?: string | null;
    classification_requirement?: string | null;
    survey_inspection_requirement?: string | null;
    commercial_yacht_code?: string | null;
    minimum_safe_manning?: string | null;
    indicative_processing_time?: string | null;
    vat_tax_note?: string | null;
    crew_note?: string | null;
    required_documents_summary?: string | null;
    objective_advantages?: string | null;
    limitations_and_risks?: string | null;
    confidence_level?: string | null;
    coverage_status?: string | null;
    missing_verification_notes?: string | null;
    official_registry_url?: string | null;
    primary_fee_url?: string | null;
    last_verified_at?: string | null;
    source_version?: string | null;
    data_quality_status?: string | null;
    data_quality_score?: number | null;
  };
};

export type FlagComparisonResult = FlagRegistry & {
  score: number;
  recommendation: "recommended" | "suitable" | "possible" | "not_recommended";
  fit_summary: string;
  positives: string[];
  risks: string[];
};

export type FlagComparisonResponse = {
  input: FlagComparisonInput;
  results: FlagComparisonResult[];
  disclaimer: string;
};

export type FlagRegistriesResponse = {
  registries: FlagRegistry[];
};

export type FlagFeeEstimateInput = {
  flag: string;
  registration_type?: "private" | "commercial" | string;
  loa_m?: number | null;
  gt?: number | null;
  vessel_age?: number | null;
  provisional_or_permanent?: string | null;
  mortgage_required?: boolean;
  radio_licence_required?: boolean;
  registration_duration?: string | null;
};

export type FlagFeeEstimateResponse = {
  label: string;
  registry: unknown;
  input: FlagFeeEstimateInput;
  confirmed_registry_fees: unknown[];
  formula_based_fees: unknown[];
  separately_quoted_fees: unknown[];
  totals_by_currency: Record<string, number>;
  excluded_external_costs: string[];
  missing_data: string[];
};

async function buildHeaders(): Promise<HeadersInit> {
  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };
  const token = await getAuthToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

export async function compareFlags(input: FlagComparisonInput): Promise<FlagComparisonResponse> {
  const base = getBaseUrl() ?? "";
  const res = await fetch(`${base}/api/flag-intelligence/compare`, {
    method: "POST",
    headers: await buildHeaders(),
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Flag comparison failed (HTTP ${res.status}): ${text.slice(0, 240) || "no body"}`);
  }
  return (await res.json()) as FlagComparisonResponse;
}

export async function getFlagRegistries(): Promise<FlagRegistriesResponse> {
  const base = getBaseUrl() ?? "";
  const res = await fetch(`${base}/api/flag-registries`, {
    headers: await buildHeaders(),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Flag registries failed (HTTP ${res.status}): ${text.slice(0, 240) || "no body"}`);
  }
  return (await res.json()) as FlagRegistriesResponse;
}

export async function estimateFlagFees(input: FlagFeeEstimateInput): Promise<FlagFeeEstimateResponse> {
  const base = getBaseUrl() ?? "";
  const res = await fetch(`${base}/api/flag-advisor/estimate-fees`, {
    method: "POST",
    headers: await buildHeaders(),
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Flag fee estimate failed (HTTP ${res.status}): ${text.slice(0, 240) || "no body"}`);
  }
  return (await res.json()) as FlagFeeEstimateResponse;
}
