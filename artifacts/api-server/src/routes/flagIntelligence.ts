import { Router, type IRouter } from "express";
import {
  compareFlagRegistries,
  FALLBACK_FLAG_REGISTRIES,
  type FlagComparisonInput,
  type FlagRegistry,
} from "../lib/flagIntelligenceCatalog";
import {
  FLAG_CHANGE_LOG_TABLE,
  FLAG_ADVISOR_SCENARIOS_TABLE,
  FLAG_ADVISOR_SCENARIO_SCORES_TABLE,
  FLAG_COMPARISON_FACTS_TABLE,
  FLAG_FEE_RULES_TABLE,
  FLAG_IMPORT_RUNS_TABLE,
  FLAG_REGISTRIES_TABLE,
  FLAG_REQUIRED_DOCUMENTS_TABLE,
  FLAG_SOURCES_TABLE,
  getSupabase,
} from "../lib/supabase";

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
    planned_charter_days: toNumber(body["planned_charter_days"]),
  };
}

function asString(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

function normalizeUse(v: unknown): string | null {
  const value = asString(v)?.toLowerCase();
  if (!value) return null;
  if (value.includes("commercial")) return "commercial";
  if (value.includes("private")) return "private";
  return value;
}

function parseConfirmedAmount(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v !== "string") return null;
  const cleaned = v.replace(/[^0-9.-]/g, "");
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function rowArray(v: unknown): string[] {
  return Array.isArray(v) ? v.map(String).filter(Boolean) : [];
}

function qualityStatus(row: Record<string, unknown>): string {
  const existing = asString(row["data_quality_status"]);
  if (existing) return existing;
  const coverage = asString(row["coverage_status"])?.toLowerCase() ?? "";
  const confidence = asString(row["confidence_level"])?.toLowerCase() ?? "";
  if (coverage.includes("partial")) return "research_required";
  if (coverage.includes("verified") && confidence.includes("high")) return "usable_with_warnings";
  return "research_required";
}

function legacyCompatibleRegistry(row: Record<string, unknown>): FlagRegistry & Record<string, unknown> {
  const privateStatus = asString(row["private_registration_status"]);
  const commercialStatus = asString(row["commercial_registration_status"]);
  const officialWebsite = asString(row["official_website"]) ?? asString(row["official_registry_url"]);
  return {
    code: String(row["code"] ?? row["slug"] ?? row["flag_name"]),
    flag_name: String(row["flag_name"]),
    country: String(row["country"] ?? row["country_or_territory"] ?? row["flag_name"]),
    registry_type: String(row["registry_type"] ?? row["registry_family"] ?? "open") as FlagRegistry["registry_type"],
    private_available: row["private_available"] == null ? privateStatus === "yes" : Boolean(row["private_available"]),
    commercial_available: row["commercial_available"] == null ? commercialStatus === "yes" : Boolean(row["commercial_available"]),
    max_gt: row["max_gt"] == null ? null : Number(row["max_gt"]),
    accepted_class: rowArray(row["accepted_class"]),
    registration_cost_eur: row["registration_cost_eur"] == null ? null : Number(row["registration_cost_eur"]),
    annual_fee_eur: row["annual_fee_eur"] == null ? null : Number(row["annual_fee_eur"]),
    mortgage_available: row["mortgage_available"] == null ? privateStatus === "yes" : Boolean(row["mortgage_available"]),
    temporary_registration: Boolean(row["temporary_registration"]),
    permanent_registration: row["permanent_registration"] == null ? true : Boolean(row["permanent_registration"]),
    radio_license: row["radio_license"] == null ? true : Boolean(row["radio_license"]),
    processing_time_days_min: row["processing_time_days_min"] == null ? null : Number(row["processing_time_days_min"]),
    processing_time_days_max: row["processing_time_days_max"] == null ? null : Number(row["processing_time_days_max"]),
    survey_required: row["survey_required"] == null ? true : Boolean(row["survey_required"]),
    classification_required: Boolean(row["classification_required"]),
    owner_nationality_restrictions:
      asString(row["owner_nationality_restrictions"]) ?? asString(row["owner_eligibility"]),
    company_restrictions:
      asString(row["company_restrictions"]) ?? asString(row["foreign_company_ownership"]),
    crew_restrictions: asString(row["crew_restrictions"]) ?? asString(row["crew_note"]),
    vat_notes: asString(row["vat_notes"]) ?? asString(row["vat_tax_note"]),
    insurance_notes: asString(row["insurance_notes"]),
    advantages: rowArray(row["advantages"]).length ? rowArray(row["advantages"]) : rowArrayFromText(row["objective_advantages"]),
    disadvantages: rowArray(row["disadvantages"]).length ? rowArray(row["disadvantages"]) : rowArrayFromText(row["limitations_and_risks"]),
    official_website: officialWebsite,
    flag_code: asString(row["flag_code"]) ?? flagAssetFor(row)?.flag_code ?? null,
    flag_asset_key: asString(row["flag_asset_key"]) ?? flagAssetFor(row)?.flag_asset_key ?? null,
    flag_asset_path: asString(row["flag_asset_path"]) ?? flagAssetFor(row)?.flag_asset_path ?? null,
    flag_alt_text: asString(row["flag_alt_text"]) ?? flagAssetFor(row)?.flag_alt_text ?? null,
    registry_badge: asString(row["registry_badge"]) ?? flagAssetFor(row)?.registry_badge ?? null,
    flag_note: asString(row["flag_note"]) ?? flagAssetFor(row)?.flag_note ?? null,
    flag_asset_source: asString(row["flag_asset_source"]) ?? flagAssetFor(row)?.flag_asset_source ?? null,
    flag_asset_license: asString(row["flag_asset_license"]) ?? flagAssetFor(row)?.flag_asset_license ?? null,
    flag_asset_updated_at: asString(row["flag_asset_updated_at"]) ?? flagAssetFor(row)?.flag_asset_updated_at ?? null,
    legal_partners: Array.isArray(row["legal_partners"]) ? row["legal_partners"] : [],
    last_updated: String(row["last_updated"] ?? row["last_verified_at"] ?? "2026-07-27"),
    advisor: {
      slug: row["slug"] ?? row["code"],
      country_or_territory: row["country_or_territory"] ?? row["country"],
      official_registry_name: row["official_registry_name"],
      registry_family: row["registry_family"],
      is_eu_flag: row["is_eu_flag"],
      private_registration_status: row["private_registration_status"],
      commercial_registration_status: row["commercial_registration_status"],
      private_minimum_loa: row["private_minimum_loa"],
      commercial_minimum_loa: row["commercial_minimum_loa"],
      maximum_loa_gt_notes: row["maximum_loa_gt_notes"],
      passenger_limit_notes: row["passenger_limit_notes"],
      provisional_registration_status: row["provisional_registration_status"],
      provisional_validity: row["provisional_validity"],
      permanent_validity: row["permanent_validity"],
      owner_eligibility: row["owner_eligibility"],
      foreign_company_ownership: row["foreign_company_ownership"],
      local_agent_requirement: row["local_agent_requirement"],
      mortgage_registration_status: row["mortgage_registration_status"],
      radio_licence_requirement: row["radio_licence_requirement"],
      classification_requirement: row["classification_requirement"],
      survey_inspection_requirement: row["survey_inspection_requirement"],
      commercial_yacht_code: row["commercial_yacht_code"],
      minimum_safe_manning: row["minimum_safe_manning"],
      indicative_processing_time: row["indicative_processing_time"],
      vat_tax_note: row["vat_tax_note"],
      crew_note: row["crew_note"],
      required_documents_summary: row["required_documents_summary"],
      objective_advantages: row["objective_advantages"],
      limitations_and_risks: row["limitations_and_risks"],
      confidence_level: row["confidence_level"],
      coverage_status: row["coverage_status"],
      missing_verification_notes: row["missing_verification_notes"],
      official_registry_url: row["official_registry_url"],
      primary_fee_url: row["primary_fee_url"],
      last_verified_at: row["last_verified_at"],
      source_version: row["source_version"],
      advisor_sections: Array.isArray(row["advisor_sections"]) ? row["advisor_sections"] : [],
      data_quality_status: qualityStatus(row),
      data_quality_score: row["data_quality_score"],
    },
  };
}

function rowArrayFromText(v: unknown): string[] {
  const text = asString(v);
  return text ? text.split(/[;\n]/).map((x) => x.trim()).filter(Boolean) : [];
}

function flagAssetFor(row: Record<string, unknown>) {
  const key = slugify(String(row["slug"] ?? row["code"] ?? row["flag_name"] ?? ""));
  return FLAG_ASSET_MAPPING[key] ?? null;
}

function slugify(value: string): string {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

const FLAG_ASSET_MAPPING: Record<string, {
  flag_code: string;
  flag_asset_key: string;
  flag_asset_path: string;
  flag_alt_text: string;
  registry_badge?: string;
  flag_note?: string;
  flag_asset_source: string;
  flag_asset_license: string;
  flag_asset_updated_at: string;
}> = Object.fromEntries(
  [
    ["cayman-islands", "ky", "Flag of the Cayman Islands"],
    ["cayman", "ky", "Flag of the Cayman Islands"],
    ["malta", "mt", "Flag of Malta"],
    ["marshall-islands", "mh", "Flag of the Marshall Islands"],
    ["marshall", "mh", "Flag of the Marshall Islands"],
    ["isle-of-man", "im", "Flag of the Isle of Man"],
    ["jersey", "je", "Flag of Jersey"],
    ["guernsey", "gg", "Flag of Guernsey"],
    ["gibraltar", "gi", "Flag of Gibraltar"],
    ["united-kingdom", "gb", "Flag of the United Kingdom"],
    ["france", "fr", "Flag of France"],
    ["italy", "it", "Flag of Italy"],
    ["spain", "es", "Flag of Spain"],
    ["netherlands", "nl", "Flag of the Netherlands"],
    ["portugal", "pt", "Flag of Portugal"],
    ["portugal-madeira", "pt", "Portuguese flag - Madeira International Shipping Register", "MAR", "Yachts registered in MAR fly the Portuguese flag."],
    ["portugal_madeira", "pt", "Portuguese flag - Madeira International Shipping Register", "MAR", "Yachts registered in MAR fly the Portuguese flag."],
    ["madeira", "pt", "Portuguese flag - Madeira International Shipping Register", "MAR", "Yachts registered in MAR fly the Portuguese flag."],
    ["madeira-mar", "pt", "Portuguese flag - Madeira International Shipping Register", "MAR", "Yachts registered in MAR fly the Portuguese flag."],
    ["cyprus", "cy", "Flag of Cyprus"],
    ["panama", "pa", "Flag of Panama"],
    ["belize", "bz", "Flag of Belize"],
    ["jamaica", "jm", "Flag of Jamaica"],
    ["cook-islands", "ck", "Flag of the Cook Islands"],
    ["cook", "ck", "Flag of the Cook Islands"],
    ["san-marino", "sm", "Flag of San Marino"],
    ["luxembourg", "lu", "Flag of Luxembourg"],
    ["british-virgin-islands", "vg", "Flag of the British Virgin Islands"],
    ["bvi", "vg", "Flag of the British Virgin Islands"],
    ["bahamas", "bs", "Flag of The Bahamas"],
    ["the-bahamas", "bs", "Flag of The Bahamas"],
    ["poland", "pl", "Flag of Poland"],
    ["bermuda", "bm", "Flag of Bermuda"],
  ].map(([key, code, alt, badge, note]) => [
    key,
    {
      flag_code: code,
      flag_asset_key: code,
      flag_asset_path: `/assets/flags/4x3/${code}.svg`,
      flag_alt_text: alt,
      registry_badge: badge,
      flag_note: note,
      flag_asset_source: "flag-icons@7.5.0",
      flag_asset_license: "MIT",
      flag_asset_updated_at: "2026-07-27",
    },
  ]),
);

async function loadRegistries(): Promise<FlagRegistry[]> {
  const supabase = getSupabase();
  if (!supabase) return FALLBACK_FLAG_REGISTRIES;

  const { data, error } = await supabase
    .from(FLAG_REGISTRIES_TABLE)
    .select("*")
    .eq("active", true)
    .order("flag_name", { ascending: true });

  if (error || !data?.length) return FALLBACK_FLAG_REGISTRIES;
  return data.map((row) => legacyCompatibleRegistry(row as Record<string, unknown>));
}

router.get("/flag-registries", async (_req, res) => {
  const registries = await loadRegistries();
  res.json({ registries });
});

router.get("/flag-advisor/registries/:slug", async (req, res) => {
  const supabase = getSupabase();
  if (!supabase) {
    const registries = FALLBACK_FLAG_REGISTRIES;
    const item = registries.find((r) => r.code === req.params["slug"]);
    res.status(item ? 200 : 404).json(item ? { item, fee_rules: [], sources: [], documents: [] } : { error: "Not found" });
    return;
  }
  const slug = req.params["slug"];
  const { data: row, error } = await supabase
    .from(FLAG_REGISTRIES_TABLE)
    .select("*")
    .or(`slug.eq.${slug},code.eq.${slug}`)
    .maybeSingle();
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  if (!row) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const [{ data: feeRules }, { data: sources }, { data: documents }] = await Promise.all([
    supabase.from(FLAG_FEE_RULES_TABLE).select("*").eq("flag_registry_id", row.id).eq("is_active", true).order("fee_component"),
    supabase.from(FLAG_SOURCES_TABLE).select("*").eq("flag_registry_id", row.id).eq("is_active", true).order("topic"),
    supabase.from(FLAG_REQUIRED_DOCUMENTS_TABLE).select("*").eq("flag_registry_id", row.id).order("sort_order"),
  ]);
  res.json({ item: legacyCompatibleRegistry(row as Record<string, unknown>), fee_rules: feeRules ?? [], sources: sources ?? [], documents: documents ?? [] });
});

router.get("/flag-advisor/fee-rules", async (req, res) => {
  const supabase = getSupabase();
  if (!supabase) {
    res.json({ items: [] });
    return;
  }
  let query = supabase.from(FLAG_FEE_RULES_TABLE).select("*,flag_registries(flag_name,slug,code)").eq("is_active", true).limit(500);
  const flag = asString(req.query["flag"]);
  if (flag) {
    const { data: registry } = await supabase.from(FLAG_REGISTRIES_TABLE).select("id").or(`slug.eq.${flag},code.eq.${flag}`).maybeSingle();
    if (registry?.id) query = query.eq("flag_registry_id", registry.id);
  }
  const { data, error } = await query;
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  res.json({ items: data ?? [] });
});

router.get("/flag-advisor/sources", async (_req, res) => {
  const supabase = getSupabase();
  if (!supabase) {
    res.json({ items: [] });
    return;
  }
  const { data, error } = await supabase
    .from(FLAG_SOURCES_TABLE)
    .select("*,flag_registries(flag_name,slug,code)")
    .eq("is_active", true)
    .order("checked_at", { ascending: false, nullsFirst: false })
    .limit(500);
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  res.json({ items: data ?? [] });
});

router.get("/flag-advisor/import-history", async (_req, res) => {
  const supabase = getSupabase();
  if (!supabase) {
    res.json({ items: [] });
    return;
  }
  const { data, error } = await supabase.from(FLAG_IMPORT_RUNS_TABLE).select("*").order("started_at", { ascending: false }).limit(100);
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  res.json({ items: data ?? [] });
});

router.get("/flag-advisor/scenario-rankings", async (req, res) => {
  const supabase = getSupabase();
  if (!supabase) {
    res.json({ scenario: null, items: [] });
    return;
  }
  const scenarioKey =
    asString(req.query["scenario_key"]) ?? "budget_300k_south_france_renovation_zero_french";
  const { data: scenario, error: scenarioError } = await supabase
    .from(FLAG_ADVISOR_SCENARIOS_TABLE)
    .select("*")
    .eq("scenario_key", scenarioKey)
    .eq("active", true)
    .maybeSingle();

  if (scenarioError) {
    res.json({ scenario: null, items: [], warning: scenarioError.message });
    return;
  }
  if (!scenario) {
    res.json({ scenario: null, items: [] });
    return;
  }

  const { data: scores, error: scoresError } = await supabase
    .from(FLAG_ADVISOR_SCENARIO_SCORES_TABLE)
    .select("*,flag_registries(*)")
    .eq("scenario_id", scenario.id)
    .order("rank", { ascending: true, nullsFirst: false });

  if (scoresError) {
    res.json({ scenario, items: [], warning: scoresError.message });
    return;
  }

  const flagIds = (scores ?? [])
    .map((score) => String(score["flag_registry_id"] ?? ""))
    .filter(Boolean);
  const { data: facts } = flagIds.length
    ? await supabase
        .from(FLAG_COMPARISON_FACTS_TABLE)
        .select("*")
        .in("flag_registry_id", flagIds)
        .eq("source_version", "flag-registry-base-v2-2026-07-29")
    : { data: [] };
  const factsByFlagId = new Map(
    (facts ?? []).map((fact) => [String(fact["flag_registry_id"]), fact]),
  );

  const items = (scores ?? []).map((score) => {
    const registryRow = score["flag_registries"];
    return {
      ...score,
      registry: registryRow
        ? legacyCompatibleRegistry(registryRow as Record<string, unknown>)
        : null,
      comparison_facts: factsByFlagId.get(String(score["flag_registry_id"])) ?? null,
    };
  });

  res.json({ scenario, items });
});

router.get("/flag-advisor/change-history", async (req, res) => {
  const supabase = getSupabase();
  if (!supabase) {
    res.json({ items: [] });
    return;
  }
  let query = supabase.from(FLAG_CHANGE_LOG_TABLE).select("*").order("created_at", { ascending: false }).limit(200);
  const registryId = asString(req.query["flag_registry_id"]);
  if (registryId) query = query.eq("flag_registry_id", registryId);
  const { data, error } = await query;
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  res.json({ items: data ?? [] });
});

router.post("/flag-advisor/estimate-fees", async (req, res) => {
  const supabase = getSupabase();
  if (!supabase) {
    res.status(503).json({ error: "Flag Advisor storage not configured" });
    return;
  }
  const body = (req.body ?? {}) as Record<string, unknown>;
  const flag = asString(body["flag"]);
  if (!flag) {
    res.status(400).json({ error: "flag required" });
    return;
  }
  const useType = normalizeUse(body["registration_type"]);
  const mortgageRequired = Boolean(body["mortgage_required"]);
  const radioRequired = Boolean(body["radio_licence_required"]);
  const { data: registry, error: regError } = await supabase
    .from(FLAG_REGISTRIES_TABLE)
    .select("id,flag_name,slug,code,last_verified_at")
    .or(`slug.eq.${flag},code.eq.${flag}`)
    .maybeSingle();
  if (regError || !registry) {
    res.status(regError ? 500 : 404).json({ error: regError?.message ?? "Flag not found" });
    return;
  }
  const { data: rules, error } = await supabase
    .from(FLAG_FEE_RULES_TABLE)
    .select("*")
    .eq("flag_registry_id", registry.id)
    .eq("is_active", true);
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  const usable = (rules ?? []).filter((rule) => {
    const type = normalizeUse(rule.registration_type);
    if (useType && type && type !== useType && type !== "private/commercial") return false;
    const component = String(rule.fee_component ?? "").toLowerCase();
    if (!mortgageRequired && component.includes("mortgage")) return false;
    if (!radioRequired && component.includes("radio")) return false;
    return true;
  });
  const confirmed = usable.filter((rule) => rule.amount != null && rule.currency);
  const formulaBased = usable.filter((rule) => rule.amount == null && asString(rule.formula_text) && !String(rule.formula_text).toLowerCase().includes("quote"));
  const quoteRequired = usable.filter((rule) => String(rule.formula_text ?? rule.notes ?? "").toLowerCase().includes("quote"));
  const totalsByCurrency = confirmed.reduce<Record<string, number>>((acc, rule) => {
    const amount = parseConfirmedAmount(rule.amount);
    const currency = String(rule.currency);
    if (amount != null) acc[currency] = (acc[currency] ?? 0) + amount;
    return acc;
  }, {});
  res.json({
    label: "Preliminary registry-fee estimate - not a binding registry quotation.",
    registry,
    input: body,
    confirmed_registry_fees: confirmed,
    formula_based_fees: formulaBased,
    separately_quoted_fees: quoteRequired,
    totals_by_currency: totalsByCurrency,
    excluded_external_costs: [
      "legal fees",
      "company incorporation",
      "resident-agent fees",
      "class",
      "survey",
      "inspection",
      "travel",
      "VAT",
      "tax",
      "insurance",
      "crew",
      "courier costs",
    ],
    missing_data: usable.length ? [] : ["No active fee rules matched this input."],
  });
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
