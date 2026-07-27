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
