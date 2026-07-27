import { Router, type IRouter } from "express";
import {
  compareFlagRegistries,
  FALLBACK_FLAG_REGISTRIES,
  type FlagComparisonInput,
  type FlagRegistry,
} from "../lib/flagIntelligenceCatalog";
import { FLAG_REGISTRIES_TABLE, getSupabase } from "../lib/supabase";

const router: IRouter = Router();

function toNumber(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function parseInput(body: Record<string, unknown>): FlagComparisonInput {
  return {
    loa_m: toNumber(body["loa_m"]),
    gt: toNumber(body["gt"]),
    year_built: toNumber(body["year_built"]),
    builder: typeof body["builder"] === "string" ? body["builder"] : null,
    value_eur: toNumber(body["value_eur"]),
    use_type: body["use_type"] === "commercial" ? "commercial" : body["use_type"] === "private" ? "private" : null,
    charter: typeof body["charter"] === "boolean" ? body["charter"] : null,
    navigation_area: typeof body["navigation_area"] === "string" ? body["navigation_area"] : null,
    owner_nationality: typeof body["owner_nationality"] === "string" ? body["owner_nationality"] : null,
    owner_residency: typeof body["owner_residency"] === "string" ? body["owner_residency"] : null,
    company_country: typeof body["company_country"] === "string" ? body["company_country"] : null,
    current_flag: typeof body["current_flag"] === "string" ? body["current_flag"] : null,
    crew_nationality: typeof body["crew_nationality"] === "string" ? body["crew_nationality"] : null,
    intended_cruising_area: typeof body["intended_cruising_area"] === "string" ? body["intended_cruising_area"] : null,
    registration_type:
      body["registration_type"] === "reflag"
        ? "reflag"
        : body["registration_type"] === "new_registration"
          ? "new_registration"
          : null,
    mortgage_needed: typeof body["mortgage_needed"] === "boolean" ? body["mortgage_needed"] : null,
  };
}

async function loadRegistries(): Promise<FlagRegistry[]> {
  const supabase = getSupabase();
  if (!supabase) return FALLBACK_FLAG_REGISTRIES;

  const { data, error } = await supabase
    .from(FLAG_REGISTRIES_TABLE)
    .select("*")
    .eq("active", true)
    .order("flag_name", { ascending: true });

  if (error || !data?.length) return FALLBACK_FLAG_REGISTRIES;
  return data.map((row) => ({
    code: String(row.code),
    flag_name: String(row.flag_name),
    country: String(row.country ?? row.flag_name),
    registry_type: String(row.registry_type ?? "open") as FlagRegistry["registry_type"],
    private_available: Boolean(row.private_available),
    commercial_available: Boolean(row.commercial_available),
    max_gt: row.max_gt == null ? null : Number(row.max_gt),
    accepted_class: Array.isArray(row.accepted_class) ? row.accepted_class.map(String) : [],
    registration_cost_eur: row.registration_cost_eur == null ? null : Number(row.registration_cost_eur),
    annual_fee_eur: row.annual_fee_eur == null ? null : Number(row.annual_fee_eur),
    mortgage_available: Boolean(row.mortgage_available),
    temporary_registration: Boolean(row.temporary_registration),
    permanent_registration: Boolean(row.permanent_registration),
    radio_license: Boolean(row.radio_license),
    processing_time_days_min: row.processing_time_days_min == null ? null : Number(row.processing_time_days_min),
    processing_time_days_max: row.processing_time_days_max == null ? null : Number(row.processing_time_days_max),
    survey_required: Boolean(row.survey_required),
    classification_required: Boolean(row.classification_required),
    owner_nationality_restrictions: row.owner_nationality_restrictions ?? null,
    company_restrictions: row.company_restrictions ?? null,
    crew_restrictions: row.crew_restrictions ?? null,
    vat_notes: row.vat_notes ?? null,
    insurance_notes: row.insurance_notes ?? null,
    advantages: Array.isArray(row.advantages) ? row.advantages.map(String) : [],
    disadvantages: Array.isArray(row.disadvantages) ? row.disadvantages.map(String) : [],
    official_website: row.official_website ?? null,
    legal_partners: Array.isArray(row.legal_partners) ? row.legal_partners : [],
    last_updated: String(row.last_updated ?? "2026-07-27"),
  }));
}

router.get("/flag-registries", async (_req, res) => {
  const registries = await loadRegistries();
  res.json({ registries });
});

router.post("/flag-intelligence/compare", async (req, res) => {
  const input = parseInput((req.body ?? {}) as Record<string, unknown>);
  const registries = await loadRegistries();
  res.json({
    input,
    results: compareFlagRegistries(input, registries),
    disclaimer:
      "Indicative registration intelligence only. Final flag, VAT, charter and crewing decisions require qualified legal and tax advice.",
  });
});

export default router;
