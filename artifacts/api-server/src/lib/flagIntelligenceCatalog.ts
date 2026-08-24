export type FlagRegistry = {
  code: string;
  flag_name: string;
  country: string;
  registry_type: "open" | "national" | "eu" | "commonwealth";
  private_available: boolean;
  commercial_available: boolean;
  max_gt: number | null;
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
  flag_code?: string | null;
  flag_asset_key?: string | null;
  flag_asset_path?: string | null;
  flag_alt_text?: string | null;
  registry_badge?: string | null;
  flag_note?: string | null;
  flag_asset_source?: string | null;
  flag_asset_license?: string | null;
  flag_asset_updated_at?: string | null;
  legal_partners: Array<{
    name: string;
    jurisdiction?: string;
    contact_url?: string;
    email?: string;
    phone?: string;
    notes?: string;
    sponsored?: boolean;
  }>;
  last_updated: string;
};

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

export type FlagComparisonResult = FlagRegistry & {
  score: number;
  recommendation: "recommended" | "suitable" | "possible" | "not_recommended";
  fit_summary: string;
  positives: string[];
  risks: string[];
  eligibility_summary?: string;
  tax_vat_summary?: string;
  charter_summary?: string;
  compliance_summary?: string;
  decision_drivers?: string[];
};

export const FALLBACK_FLAG_REGISTRIES: FlagRegistry[] = [
  {
    code: "cayman",
    flag_name: "Cayman Islands",
    country: "Cayman Islands",
    registry_type: "commonwealth",
    private_available: true,
    commercial_available: true,
    max_gt: null,
    accepted_class: ["ABS", "BV", "DNV", "Lloyd's Register", "RINA"],
    registration_cost_eur: null,
    annual_fee_eur: null,
    mortgage_available: true,
    temporary_registration: true,
    permanent_registration: true,
    radio_license: true,
    processing_time_days_min: 3,
    processing_time_days_max: 10,
    survey_required: true,
    classification_required: true,
    owner_nationality_restrictions: "Generally flexible through accepted ownership structures.",
    company_restrictions: "Commonly used through Cayman or qualifying corporate structures.",
    crew_restrictions: "Crew requirements depend on yacht size, use and operating area.",
    vat_notes: "Strong non-EU option; EU VAT and charter use must be reviewed separately.",
    insurance_notes: "Widely accepted by banks and insurers for large yachts.",
    advantages: ["High banking acceptance", "Strong mortgage register", "Recognised large-yacht flag"],
    disadvantages: ["EU VAT/charter structure requires separate advice", "Commercial use can require class/survey compliance"],
    official_website: "https://www.cishipping.com/",
    legal_partners: [],
    last_updated: "2026-07-27",
  },
  {
    code: "malta",
    flag_name: "Malta",
    country: "Malta",
    registry_type: "eu",
    private_available: true,
    commercial_available: true,
    max_gt: null,
    accepted_class: ["ABS", "BV", "DNV", "Lloyd's Register", "RINA"],
    registration_cost_eur: null,
    annual_fee_eur: null,
    mortgage_available: true,
    temporary_registration: true,
    permanent_registration: true,
    radio_license: true,
    processing_time_days_min: 7,
    processing_time_days_max: 20,
    survey_required: true,
    classification_required: true,
    owner_nationality_restrictions: "EU-friendly ownership and company structures are common.",
    company_restrictions: "Maltese company structures are often used for commercial yachts.",
    crew_restrictions: "Crew and manning requirements depend on commercial/private status.",
    vat_notes: "EU flag with established VAT and commercial yacht structures.",
    insurance_notes: "Strong market recognition in Europe.",
    advantages: ["EU flag", "Good commercial charter reputation", "Mortgage friendly"],
    disadvantages: ["More EU compliance work", "VAT treatment must be structured carefully"],
    official_website: "https://www.transport.gov.mt/maritime",
    legal_partners: [],
    last_updated: "2026-07-27",
  },
  {
    code: "marshall",
    flag_name: "Marshall Islands",
    country: "Republic of the Marshall Islands",
    registry_type: "open",
    private_available: true,
    commercial_available: true,
    max_gt: null,
    accepted_class: ["ABS", "BV", "DNV", "Lloyd's Register", "RINA"],
    registration_cost_eur: null,
    annual_fee_eur: null,
    mortgage_available: true,
    temporary_registration: true,
    permanent_registration: true,
    radio_license: true,
    processing_time_days_min: 2,
    processing_time_days_max: 7,
    survey_required: true,
    classification_required: true,
    owner_nationality_restrictions: "Flexible international ownership structures.",
    company_restrictions: "Often used through international business entities.",
    crew_restrictions: "Crew requirements depend on yacht size and operation.",
    vat_notes: "Non-EU flag; EU VAT and charter rules need separate review.",
    insurance_notes: "Widely used international registry with strong finance acceptance.",
    advantages: ["Fast registration", "Strong mortgage register", "Internationally recognised"],
    disadvantages: ["EU charter/VAT planning required", "Less EU perception than Malta for EU-only operation"],
    official_website: "https://www.register-iri.com/",
    legal_partners: [],
    last_updated: "2026-07-27",
  },
  {
    code: "iom",
    flag_name: "Isle of Man",
    country: "Isle of Man",
    registry_type: "commonwealth",
    private_available: true,
    commercial_available: true,
    max_gt: null,
    accepted_class: ["ABS", "BV", "DNV", "Lloyd's Register", "RINA"],
    registration_cost_eur: null,
    annual_fee_eur: null,
    mortgage_available: true,
    temporary_registration: true,
    permanent_registration: true,
    radio_license: true,
    processing_time_days_min: 5,
    processing_time_days_max: 15,
    survey_required: true,
    classification_required: true,
    owner_nationality_restrictions: "Commonwealth-linked eligibility and company structures apply.",
    company_restrictions: "Qualifying corporate ownership may be required.",
    crew_restrictions: "Depends on operation and coding.",
    vat_notes: "Strong private and commercial option; EU VAT position requires separate advice.",
    insurance_notes: "High acceptance with banks and insurers.",
    advantages: ["Strong reputation", "Mortgage friendly", "Good yacht focus"],
    disadvantages: ["Eligibility must be checked", "Commercial coding may add documentation work"],
    official_website: "https://www.iomshipregistry.com/",
    legal_partners: [],
    last_updated: "2026-07-27",
  },
  {
    code: "gibraltar",
    flag_name: "Gibraltar",
    country: "Gibraltar",
    registry_type: "commonwealth",
    private_available: true,
    commercial_available: true,
    max_gt: null,
    accepted_class: ["ABS", "BV", "DNV", "Lloyd's Register", "RINA"],
    registration_cost_eur: null,
    annual_fee_eur: null,
    mortgage_available: true,
    temporary_registration: true,
    permanent_registration: true,
    radio_license: true,
    processing_time_days_min: 5,
    processing_time_days_max: 15,
    survey_required: true,
    classification_required: true,
    owner_nationality_restrictions: "Eligibility and company structure should be checked case by case.",
    company_restrictions: "Gibraltar or qualifying structures may be used.",
    crew_restrictions: "Depends on vessel use and certification.",
    vat_notes: "Useful for some Mediterranean structures; VAT and charter advice required.",
    insurance_notes: "Recognised Red Ensign Group registry.",
    advantages: ["Mediterranean practical presence", "Mortgage available", "Red Ensign reputation"],
    disadvantages: ["Eligibility work", "EU charter/VAT issues need advice"],
    official_website: "https://www.gibraltarship.com/",
    legal_partners: [],
    last_updated: "2026-07-27",
  },
  {
    code: "france",
    flag_name: "France",
    country: "France",
    registry_type: "eu",
    private_available: true,
    commercial_available: true,
    max_gt: null,
    accepted_class: ["BV", "DNV", "Lloyd's Register", "RINA"],
    registration_cost_eur: null,
    annual_fee_eur: null,
    mortgage_available: true,
    temporary_registration: false,
    permanent_registration: true,
    radio_license: true,
    processing_time_days_min: 15,
    processing_time_days_max: 45,
    survey_required: true,
    classification_required: true,
    owner_nationality_restrictions: "EU/national eligibility and operating rules apply.",
    company_restrictions: "French/EU structures may be required depending on use.",
    crew_restrictions: "French/EU manning and labour rules can be material.",
    vat_notes: "EU flag; useful for France-focused operation but tax/labour impact can be significant.",
    insurance_notes: "Strong local acceptance.",
    advantages: ["Best perception for France-focused use", "EU flag", "Strong local recognition"],
    disadvantages: ["More administrative burden", "Labour/tax impact can be heavier"],
    official_website: "https://www.mer.gouv.fr/",
    legal_partners: [],
    last_updated: "2026-07-27",
  },
  {
    code: "italy",
    flag_name: "Italy",
    country: "Italy",
    registry_type: "eu",
    private_available: true,
    commercial_available: true,
    max_gt: null,
    accepted_class: ["RINA", "BV", "DNV", "Lloyd's Register"],
    registration_cost_eur: null,
    annual_fee_eur: null,
    mortgage_available: true,
    temporary_registration: false,
    permanent_registration: true,
    radio_license: true,
    processing_time_days_min: 20,
    processing_time_days_max: 60,
    survey_required: true,
    classification_required: true,
    owner_nationality_restrictions: "EU/national eligibility should be checked.",
    company_restrictions: "Italian/EU structures may be required depending on use.",
    crew_restrictions: "Italian/EU crewing and labour compliance can apply.",
    vat_notes: "EU flag; relevant for Italy-based operation.",
    insurance_notes: "Strong local acceptance.",
    advantages: ["EU flag", "Good for Italy-based operation", "Local credibility"],
    disadvantages: ["Administrative complexity", "Potential labour/tax burden"],
    official_website: "https://www.mit.gov.it/",
    legal_partners: [],
    last_updated: "2026-07-27",
  },
  {
    code: "spain",
    flag_name: "Spain",
    country: "Spain",
    registry_type: "eu",
    private_available: true,
    commercial_available: true,
    max_gt: null,
    accepted_class: ["BV", "DNV", "Lloyd's Register", "RINA"],
    registration_cost_eur: null,
    annual_fee_eur: null,
    mortgage_available: true,
    temporary_registration: false,
    permanent_registration: true,
    radio_license: true,
    processing_time_days_min: 20,
    processing_time_days_max: 60,
    survey_required: true,
    classification_required: true,
    owner_nationality_restrictions: "EU/national requirements should be checked.",
    company_restrictions: "Spanish/EU structures may be required depending on operation.",
    crew_restrictions: "Local manning rules can be important for commercial use.",
    vat_notes: "EU flag; local charter/tax rules require careful review.",
    insurance_notes: "Good local recognition.",
    advantages: ["EU flag", "Good for Spain/Balearics focus", "Local recognition"],
    disadvantages: ["Complex charter/tax compliance", "Potentially slower administration"],
    official_website: "https://www.mitma.gob.es/marina-mercante",
    legal_partners: [],
    last_updated: "2026-07-27",
  },
  {
    code: "portugal_madeira",
    flag_name: "Portugal (Madeira)",
    country: "Portugal",
    registry_type: "eu",
    private_available: true,
    commercial_available: true,
    max_gt: null,
    accepted_class: ["ABS", "BV", "DNV", "Lloyd's Register", "RINA"],
    registration_cost_eur: null,
    annual_fee_eur: null,
    mortgage_available: true,
    temporary_registration: true,
    permanent_registration: true,
    radio_license: true,
    processing_time_days_min: 10,
    processing_time_days_max: 30,
    survey_required: true,
    classification_required: true,
    owner_nationality_restrictions: "International ownership structures are commonly used.",
    company_restrictions: "Madeira structures may be relevant.",
    crew_restrictions: "EU/commercial manning rules depend on use.",
    vat_notes: "EU flag with Madeira register structures; VAT advice required.",
    insurance_notes: "Recognised EU option.",
    advantages: ["EU flag", "Commercial structures possible", "Mortgage available"],
    disadvantages: ["Less yacht brand recognition than Malta/Cayman", "Requires local advice"],
    official_website: "https://www.mar.madeira.gov.pt/",
    legal_partners: [],
    last_updated: "2026-07-27",
  },
  {
    code: "panama",
    flag_name: "Panama",
    country: "Panama",
    registry_type: "open",
    private_available: true,
    commercial_available: true,
    max_gt: null,
    accepted_class: ["ABS", "BV", "DNV", "Lloyd's Register", "RINA"],
    registration_cost_eur: null,
    annual_fee_eur: null,
    mortgage_available: true,
    temporary_registration: true,
    permanent_registration: true,
    radio_license: true,
    processing_time_days_min: 3,
    processing_time_days_max: 10,
    survey_required: true,
    classification_required: true,
    owner_nationality_restrictions: "Flexible international ownership.",
    company_restrictions: "Commonly used with international structures.",
    crew_restrictions: "Depends on operation and vessel category.",
    vat_notes: "Non-EU flag; EU VAT/charter must be structured separately.",
    insurance_notes: "Widely known registry, but yacht perception depends on size/use.",
    advantages: ["Fast and flexible", "Large global registry", "Mortgage available"],
    disadvantages: ["Lower premium-yacht perception than top yacht flags", "EU use needs advice"],
    official_website: "https://panamashipregistry.com/",
    legal_partners: [],
    last_updated: "2026-07-27",
  },
];

const EU_CODES = new Set(["malta", "france", "italy", "spain", "portugal_madeira", "cyprus", "netherlands", "luxembourg", "poland"]);

function textIncludes(input: FlagComparisonInput, words: string[]): boolean {
  const haystack = [
    input.navigation_area,
    input.intended_cruising_area,
    input.owner_residency,
    input.company_country,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return words.some((w) => haystack.includes(w));
}

function flagText(flag: FlagRegistry & Record<string, unknown>): string {
  const advisor = typeof flag["advisor"] === "object" && flag["advisor"] ? flag["advisor"] as Record<string, unknown> : {};
  return [
    flag.flag_name,
    flag.country,
    flag.owner_nationality_restrictions,
    flag.company_restrictions,
    flag.crew_restrictions,
    flag.vat_notes,
    flag.insurance_notes,
    ...flag.advantages,
    ...flag.disadvantages,
    advisor["registry_family"],
    advisor["commercial_yacht_code"],
    advisor["owner_eligibility"],
    advisor["foreign_company_ownership"],
    advisor["local_agent_requirement"],
    advisor["mortgage_registration_status"],
    advisor["vat_tax_note"],
    advisor["minimum_safe_manning"],
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function inputText(input: FlagComparisonInput): string {
  return [
    input.navigation_area,
    input.intended_cruising_area,
    input.owner_nationality,
    input.owner_residency,
    input.company_country,
    input.crew_nationality,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function hasAny(text: string, words: string[]): boolean {
  return words.some((word) => text.includes(word));
}

function isEuFlag(flag: FlagRegistry & Record<string, unknown>): boolean {
  const advisor = typeof flag["advisor"] === "object" && flag["advisor"] ? flag["advisor"] as Record<string, unknown> : {};
  return EU_CODES.has(flag.code) || advisor["is_eu_flag"] === true || flag.registry_type === "eu";
}

function isLikelyNonEuOwner(input: FlagComparisonInput): boolean {
  const text = [input.owner_nationality, input.owner_residency].filter(Boolean).join(" ").toLowerCase();
  if (!text) return false;
  if (/\b(non[-\s]?eu|not\s+(an?\s+)?eu|not\s+european|outside\s+the\s+eu|third[-\s]?country)\b/i.test(text)) {
    return true;
  }
  if (/\b(russia|russian|ukraine|ukrainian|turkey|turkish|usa|american|canada|canadian|uae|emirates|dubai|saudi|qatar|china|chinese|india|indian|israel|israeli|monaco)\b/i.test(text)) {
    return true;
  }
  return !/\b(eu|eea|european|swiss|switzerland|uk|united kingdom|british|malta|maltese|france|french|italy|italian|spain|spanish|germany|german|netherlands|dutch|portugal|portuguese|cyprus|cypriot|poland|polish|luxembourg)\b/i.test(text);
}

function isEuOperatingArea(input: FlagComparisonInput): boolean {
  const text = inputText(input);
  return hasAny(text, ["eu", "europe", "med", "mediterranean", "france", "italy", "spain", "greece", "croatia", "malta", "cote d'azur", "côte d'azur", "riviera", "corsica", "sardinia", "balearic"]);
}

function isEuCharterProfile(input: FlagComparisonInput): boolean {
  return (input.use_type === "commercial" || Boolean(input.charter)) && isEuOperatingArea(input);
}

function vatExposureLevel(flag: FlagRegistry & Record<string, unknown>): "low" | "medium" | "high" | "unknown" {
  const text = flagText(flag);
  if (hasAny(text, ["high", "20% vat", "21% vat", "22% vat", "23% vat", "25%", "vat due", "import vat", "registration tax"])) return "high";
  if (hasAny(text, ["low", "vat refund", "zero vat", "0% vat", "temporary admission", "ta rules", "tonnage tax", "proper structuring"])) return "low";
  if (hasAny(text, ["medium", "non-eu", "customs", "vat", "ta"])) return "medium";
  return "unknown";
}

function isRedEnsignOrOpen(flag: FlagRegistry & Record<string, unknown>): boolean {
  const text = flagText(flag);
  return flag.registry_type === "open" || flag.registry_type === "commonwealth" || hasAny(text, ["red ensign", "open registry", "category 1"]);
}

export function compareFlagRegistries(
  input: FlagComparisonInput,
  registries = FALLBACK_FLAG_REGISTRIES,
): FlagComparisonResult[] {
  const wantsCommercial = input.use_type === "commercial" || Boolean(input.charter);
  const wantsEu = isEuOperatingArea(input);
  const wantsEuCharter = isEuCharterProfile(input);
  const highValue = (input.value_eur ?? 0) >= 1_000_000 || Boolean(input.mortgage_needed);
  const gt = input.gt ?? null;
  const loa = input.loa_m ?? null;
  const estimatedFirstYearCost = (flag: FlagRegistry): number | null => {
    if (flag.registration_cost_eur == null && flag.annual_fee_eur == null) return null;
    return (flag.registration_cost_eur ?? 0) + (flag.annual_fee_eur ?? 0);
  };
  const companyCountry = (input.company_country ?? "").toLowerCase();
  const nonEuOwner = isLikelyNonEuOwner(input);

  return registries
    .map((flag) => {
      let score = 40;
      const positives: string[] = [];
      const risks: string[] = [];
      const decisionDrivers: string[] = [];
      const text = flagText(flag as FlagRegistry & Record<string, unknown>);
      const firstYearCost = estimatedFirstYearCost(flag);
      const euFlag = isEuFlag(flag as FlagRegistry & Record<string, unknown>);
      const vatLevel = vatExposureLevel(flag as FlagRegistry & Record<string, unknown>);
      const redEnsignOrOpen = isRedEnsignOrOpen(flag as FlagRegistry & Record<string, unknown>);
      const hasLimitedCharterRoute = hasAny(text, ["yet", "pylc", "pycr", "limited charter"]);
      const hasEuEligibilityBarrier =
        nonEuOwner &&
        euFlag &&
        hasAny(text, ["50%", "eu/eea", "eu owner", "nationality test", "residence", "resident", "permanent establishment", "substance"]);

      if (nonEuOwner) {
        decisionDrivers.push("Owner profile is treated as non-EU / third-country unless a qualifying EU structure is entered.");
      }
      if (wantsEuCharter) {
        decisionDrivers.push("EU charter profile: flag choice is separated from VAT, customs, cabotage and local charter-permit exposure.");
      }

      if (wantsCommercial) {
        if (flag.commercial_available) {
          score += 12;
          positives.push("Commercial registration is available.");
          if (text.includes("commercial yacht code") || text.includes("commercial yacht")) {
            score += 4;
            positives.push("Commercial yacht code / commercial yacht pathway is documented.");
          }
        } else {
          score -= 40;
          risks.push("Commercial registration is not supported for this profile.");
        }
      } else if (flag.private_available) {
        score += 8;
        positives.push("Private registration is available.");
      }

      if (highValue && flag.mortgage_available) {
        score += 6;
        positives.push("Mortgage registration is available.");
        if (text.includes("executive title") || text.includes("mortgagee")) {
          score += 2;
          positives.push("Mortgage protections are documented for finance discussions.");
        }
      } else if (highValue) {
        score -= 12;
        risks.push("Mortgage support should be confirmed before finance discussions.");
      }

      if (flag.processing_time_days_max != null && flag.processing_time_days_max <= 10) {
        score += 4;
        positives.push("Fast provisional registration is usually possible.");
      }

      if (flag.insurance_notes?.toLowerCase().includes("widely") || flag.insurance_notes?.toLowerCase().includes("strong")) {
        score += 3;
        positives.push("Good bank and insurance market acceptance.");
      }

      if (wantsEu) {
        if (euFlag) {
          const euBonus = wantsEuCharter && nonEuOwner ? 2 : 8;
          score += euBonus;
          positives.push(
            wantsEuCharter && nonEuOwner
              ? "EU flag can simplify some EU-area operations, but it is not automatically the best answer for a non-EU charter owner."
              : "EU flag profile fits the intended cruising/charter area.",
          );
          if (text.includes("vat") && text.includes("charter")) {
            score += wantsEuCharter && nonEuOwner ? 1 : 3;
            positives.push("EU VAT / charter framework is documented.");
          }
        } else {
          score -= wantsEuCharter ? 4 : 7;
          risks.push("Non-EU flag: EU VAT, customs, cabotage and local charter permissions must be structured separately.");
          if (wantsEuCharter && redEnsignOrOpen) {
            score += 8;
            positives.push("Offshore / Red Ensign structure can be appropriate for non-EU ownership if EU charter VAT and local permits are handled separately.");
          }
          if (wantsEuCharter && hasLimitedCharterRoute) {
            score += 5;
            positives.push("Limited-charter/YET/PYLC-type pathway is relevant for occasional EU charter use when eligibility and local rules are satisfied.");
          }
        }
      }

      if (wantsEuCharter && vatLevel === "high") {
        score -= euFlag ? 8 : 4;
        risks.push("VAT/tax exposure is high for this profile and should materially reduce the recommendation.");
      } else if (wantsEuCharter && vatLevel === "low") {
        score += 5;
        positives.push("VAT/tax profile appears comparatively favourable in the stored flag intelligence.");
      }

      if (hasEuEligibilityBarrier) {
        score -= 12;
        risks.push("Non-EU owner may need an EU/EEA company, representative, manager or qualifying control structure before this flag is legally workable.");
      }

      if (firstYearCost != null) {
        if (firstYearCost <= 700) {
          score += 5;
          positives.push("Low first-year registry cost for the profile.");
        } else if (firstYearCost <= 1_500) {
          score += 2;
        } else if (firstYearCost >= 3_000) {
          score -= 8;
          risks.push("First-year registry cost is relatively high versus lower-cost alternatives.");
        } else if (firstYearCost >= 2_000) {
          score -= 4;
          risks.push("Registry cost should be compared against lower-cost alternatives.");
        }
      }

      if (flag.code === "malta" && companyCountry.includes("malta")) {
        score += 4;
        positives.push("Maltese company ownership is a standard route for non-EU owners.");
      }

      if (flag.code === "cayman" && highValue) {
        score += 5;
        positives.push("Cayman is a premium Category 1 Red Ensign option for high-value and financed yachts.");
      }

      if (flag.code === "cayman" && wantsCommercial && text.includes("yet")) {
        score += 3;
        positives.push("YET can support limited charter activity without full commercial conversion when eligible.");
      }

      if (flag.code === "cayman" && wantsEu) {
        score -= 8;
        risks.push("Cayman is non-EU; EU VAT, customs and Temporary Admission planning must be handled separately.");
      }

      if (flag.code === "marshall" && (text.includes("pylc") || text.includes("yet"))) {
        score += 5;
        positives.push("Marshall Islands supports limited charter routes through PYLC/YET when eligibility is met.");
      }

      if (flag.code === "marshall" && text.includes("cost-effective")) {
        score += 4;
        positives.push("Marshall Islands can be a cost-effective alternative to premium Red Ensign structures.");
      }

      if (flag.code === "marshall" && text.includes("entity")) {
        risks.push("Marshall Islands yacht registration is entity-only; personal ownership is not the direct route.");
      }

      if (flag.code === "marshall" && wantsEu) {
        score -= 8;
        risks.push("Marshall Islands is non-EU; EU VAT, customs and Temporary Admission planning remain separate.");
      }

      if (flag.code === "iom" && text.includes("flat annual")) {
        score += 6;
        positives.push("Isle of Man has a predictable flat annual yacht fee structure, useful for larger yachts.");
      }

      if (flag.code === "iom" && (text.includes("yet") || text.includes("pycr"))) {
        score += 5;
        positives.push("Isle of Man supports YET/PYCR routes for eligible 24 m+ yachts with commercial compliance.");
      }

      if (flag.code === "iom" && highValue) {
        score += 5;
        positives.push("Isle of Man combines Red Ensign prestige with strong mortgage and insurance acceptance.");
      }

      if (flag.code === "jersey" && gt != null && gt > 399) {
        score -= 45;
        risks.push("Jersey is a Category 2 Red Ensign register with a hard 399 GT ceiling.");
      }

      if (flag.code === "jersey" && wantsCommercial && !text.includes("yet")) {
        score -= 5;
        risks.push("Jersey does not provide a YET-style limited charter route; full commercial coding is required.");
      }

      if (flag.code === "jersey" && gt != null && gt <= 399) {
        score += 4;
        positives.push("Jersey is viable for sub-399 GT yachts that want Red Ensign credibility.");
      }

      if (flag.code === "guernsey" && gt != null && gt > 150) {
        score -= 50;
        risks.push("Guernsey has a hard 150 GT ceiling and is not viable above that threshold.");
      }

      if (flag.code === "guernsey" && wantsCommercial) {
        score -= 8;
        risks.push("Guernsey has no YET/PYLC route; charter requires full commercial coding and is limited in scope.");
      }

      if (flag.code === "guernsey" && gt != null && gt <= 150 && !wantsCommercial) {
        score += 6;
        positives.push("Guernsey can be a low-maintenance Red Ensign option for private yachts below 150 GT.");
      }

      if (flag.code === "portugal_madeira" && wantsEu) {
        score += 6;
        positives.push("Madeira MAR combines EU flag status with international-registry flexibility.");
      }

      if (flag.code === "portugal_madeira" && wantsCommercial && (text.includes("vat refund") || text.includes("zero vat"))) {
        score += 5;
        positives.push("Madeira MAR can be strong for commercial yachts because VAT refund / zero VAT operating advantages are documented.");
      }

      if (flag.code === "portugal_madeira" && nonEuOwner && text.includes("no nationality restrictions")) {
        score += 6;
        positives.push("Madeira MAR has no owner nationality restrictions, which helps non-EU owners seeking an EU flag.");
      }

      if (flag.code === "cyprus" && wantsEu) {
        score += 5;
        positives.push("Cyprus is a full EU flag with strong Mediterranean and international registry acceptance.");
      }

      if (flag.code === "cyprus" && wantsCommercial && text.includes("tonnage tax")) {
        score += 5;
        positives.push("Cyprus provides a mature tonnage tax framework for qualifying commercial shipping activities.");
      }

      if (flag.code === "cyprus" && nonEuOwner && (text.includes("50%") || text.includes("eu/eea"))) {
        score -= 7;
        risks.push("Cyprus requires an EU/EEA ownership or qualifying control structure for non-EU owners.");
      }

      if (flag.code === "gibraltar" && highValue) {
        score += 5;
        positives.push("Gibraltar is a Category 1 Red Ensign flag with strong mortgage and Mediterranean positioning.");
      }

      if (flag.code === "gibraltar" && text.includes("annual tonnage tax")) {
        risks.push("Gibraltar annual tonnage tax can dominate cost for larger yachts and should be modelled.");
      }

      if (flag.code === "united-kingdom" && highValue) {
        score += 4;
        positives.push("The UK Part 1 register is a prestige Red Ensign route with strong legal title and mortgage recognition.");
      }

      if (flag.code === "united-kingdom" && wantsEu) {
        score -= 10;
        risks.push("The UK is non-EU after Brexit; EU VAT/customs and Temporary Admission planning remain separate.");
      }

      if (flag.code === "italy" && wantsEu) {
        score += 4;
        positives.push("Italy is a strong EU flag with full EU waters access and high Paris MoU standing.");
      }

      if (flag.code === "italy" && wantsCommercial) {
        score -= 6;
        risks.push("Italian commercial yacht operation is administratively heavy and does not have a dedicated yacht code equivalent to Malta/Madeira.");
      }

      if (flag.code === "spain" && wantsCommercial && text.includes("lista 6")) {
        score += 4;
        positives.push("Spain Lista 6 provides a clear charter route with registration-tax exemption and VAT deduction.");
      }

      if (flag.code === "spain" && !wantsCommercial && text.includes("12%")) {
        score -= 8;
        risks.push("Spain Lista 7 private use can trigger 12% registration tax on vessel value.");
      }

      if (flag.code === "spain" && wantsCommercial && text.includes("4 years")) {
        risks.push("Spain Lista 6 requires dedicated commercial use and owner-use restrictions for the first 4 years.");
      }

      if (flag.code === "netherlands" && wantsEu) {
        score += 4;
        positives.push("The Netherlands is a highly respected EU flag with transparent Kadaster/ILT registration.");
      }

      if (flag.code === "netherlands" && wantsCommercial && text.includes("seabrief")) {
        score -= 6;
        risks.push("Dutch Seabrief is strictly non-commercial; charter requires the full merchant register route.");
      }

      if (flag.code === "netherlands" && nonEuOwner && text.includes("nationality test")) {
        score -= 5;
        risks.push("Dutch registration can require a nationality test and Dutch/EU connection for non-EU owners.");
      }

      if (flag.code === "panama" && !wantsEu) {
        score += 5;
        positives.push("Panama is one of the most accessible open registries with no nationality or local-company requirement.");
      }

      if (flag.code === "panama" && (input.year_built ?? 0) >= new Date().getFullYear() - 20) {
        score += 4;
        positives.push("Panama is attractive for private yachts under 20 years old because the guide indicates no survey is required.");
      }

      if (flag.code === "panama" && wantsEu) {
        score -= 10;
        risks.push("Panama is non-EU; EU VAT/customs and Temporary Admission planning remain separate.");
      }

      if (flag.code === "british-virgin-islands" && highValue) {
        score += 5;
        positives.push("BVI is a Category 1 Red Ensign option with strong mortgage and insurance perception at a lower cost point than some premium alternatives.");
      }

      if (flag.code === "british-virgin-islands" && wantsCommercial) {
        score += 3;
        positives.push("BVI supports commercial yacht registration with MCA/LY3 coding routes where applicable.");
      }

      if (flag.code === "british-virgin-islands" && wantsEu) {
        score -= 8;
        risks.push("BVI is non-EU; EU VAT, customs and Temporary Admission planning remain separate.");
      }

      if (flag.code === "bahamas" && wantsCommercial) {
        score += 6;
        positives.push("Bahamas has a strong charter framework and Passenger Yacht Code route for eligible yachts carrying more than 12 passengers.");
      }

      if (flag.code === "bahamas" && textIncludes(input, ["caribbean", "bahamas"])) {
        score += 5;
        positives.push("Bahamas is especially strong for Caribbean-oriented operation and Bahamas cruising/charter planning.");
      }

      if (flag.code === "bahamas" && wantsEu) {
        score -= 8;
        risks.push("Bahamas is non-EU; EU VAT/customs and Temporary Admission planning remain separate.");
      }

      if (flag.code === "poland" && wantsEu && (input.loa_m ?? 999) <= 24) {
        score += 8;
        positives.push("Poland is a full EU flag with lifetime registration, no annual renewal fee and a simplified route for yachts up to 24 m.");
      }

      if (flag.code === "poland" && !wantsCommercial && (input.loa_m ?? 999) <= 24) {
        score += 5;
        positives.push("Poland is highly cost-efficient for private yachts under 24 m because no registration survey is required under the simplified route.");
      }

      if (flag.code === "poland" && (input.loa_m ?? 0) > 24) {
        score -= wantsCommercial ? 18 : 12;
        risks.push("Poland's simplified Reja24 route ends at 24 m; larger yachts require the full Polish Shipping Register/class route.");
      }

      if (flag.code === "bermuda" && highValue) {
        score += 7;
        positives.push("Bermuda is a premium Category 1 Red Ensign register with very strong lender, mortgage and insurance acceptance.");
      }

      if (flag.code === "bermuda" && !highValue && (input.loa_m ?? 0) < 24) {
        score -= 4;
        risks.push("Bermuda is usually a premium/high-value route; smaller budget yachts may find BVI, Poland or Bahamas more efficient.");
      }

      if (flag.code === "bermuda" && wantsEu) {
        score -= 8;
        risks.push("Bermuda is non-EU; EU VAT/customs and Temporary Admission planning remain separate.");
      }

      if (flag.code === "belize" && !wantsEu) {
        score += 3;
        positives.push("Belize is a low-barrier open registry with no nationality restrictions and fast provisional registration.");
      }

      if (flag.code === "belize" && (input.year_built ?? new Date().getFullYear()) < new Date().getFullYear() - 20) {
        score -= 4;
        risks.push("Belize has a 20-year age policy with exceptions; older yachts need pre-clearance and inspection review.");
      }

      if (flag.code === "san-marino" && (input.loa_m ?? 0) >= 10 && (input.loa_m ?? 100) <= 24 && !wantsCommercial) {
        score += 6;
        positives.push("San Marino has a transparent private 10-24 m tariff and lifetime-registration option.");
      }

      if (flag.code === "san-marino" && wantsCommercial) {
        score -= 4;
        risks.push("San Marino commercial and >24 m fee schedules still require direct confirmation.");
      }

      if (flag.code === "cook-islands" && text.includes("dual")) {
        score += 5;
        positives.push("Cook Islands is useful where dual registration or Pacific flexibility is specifically needed.");
      }

      if (flag.code === "cook-islands" && wantsEu) {
        score -= 10;
        risks.push("Cook Islands is non-EU and Pacific-focused; Mediterranean EU VAT/customs planning remains separate.");
      }

      if (flag.code === "jamaica" && textIncludes(input, ["caribbean", "jamaica"])) {
        score += 5;
        positives.push("Jamaica fits better for Caribbean-oriented operations and English-language administration.");
      }

      if (flag.code === "jamaica" && wantsEu) {
        score -= 5;
        risks.push("Jamaica is a niche Caribbean registry and is usually weaker for Mediterranean/EU operation.");
      }

      if (flag.code === "luxembourg" && wantsEu) {
        score += 2;
        positives.push("Luxembourg is a full EU flag with strong legal and commercial-shipping reputation.");
      }

      if (flag.code === "luxembourg" && nonEuOwner) {
        score -= 10;
        risks.push("Luxembourg has major residence/substance eligibility barriers for non-EU or non-resident owners.");
      }

      if (flag.code === "luxembourg" && wantsCommercial) {
        score -= 6;
        risks.push("Luxembourg is not yacht-focused and has high tax/substance costs for commercial operation.");
      }

      if (flag.code === "france" && textIncludes(input, ["france", "french riviera", "cote d'azur", "côte d'azur", "monaco", "corsica"])) {
        score += 6;
        positives.push("French flag profile is strong for France-focused local market access and reputation.");
      }

      if (flag.code === "france" && wantsCommercial && (text.includes("25%") || text.includes("no tonnage tax"))) {
        score -= 8;
        risks.push("French RIF is not a tax-optimisation route for commercial yacht charter compared with Malta or Madeira.");
      }

      if (flag.code === "france" && wantsCommercial && (text.includes("181 days") || text.includes("social security"))) {
        score -= 4;
        risks.push("Crew social security exposure can be material if the yacht is based in France for extended periods.");
      }

      if (nonEuOwner && text.includes("non-eu individuals no")) {
        score -= 8;
        risks.push("Non-EU individual personal registration is not the direct route; a company or recognised legal entity structure is required.");
      }

      if (gt != null && flag.max_gt != null && gt > flag.max_gt) {
        score -= 45;
        risks.push(`GT exceeds the registry profile limit of ${flag.max_gt}.`);
      }

      if (wantsCommercial && loa != null && loa >= 24 && !flag.classification_required) {
        score -= 4;
        risks.push("Large commercial yacht class requirements should be confirmed for this registry.");
      }

      if (flag.classification_required && (input.loa_m ?? 0) >= 24) {
        positives.push("Large-yacht class/survey workflow is supported.");
      }

      if (input.registration_type === "reflag" && flag.temporary_registration) {
        score += 4;
        positives.push("Temporary registration can support a reflag transition.");
      }

      let finalScore = Math.max(0, Math.min(100, Math.round(score - risks.length)));
      if (wantsCommercial && !flag.commercial_available) finalScore = Math.min(finalScore, 45);
      if (gt != null && flag.max_gt != null && gt > flag.max_gt) finalScore = Math.min(finalScore, 35);
      if (hasEuEligibilityBarrier) finalScore = Math.min(finalScore, 72);
      if (wantsEuCharter && euFlag && nonEuOwner && vatLevel === "high") {
        finalScore = Math.min(finalScore, 78);
      }
      if (wantsCommercial && euFlag && /high|20%|21%|22%|23%|25%/.test(flag.vat_notes?.toLowerCase() ?? "")) {
        finalScore = Math.min(finalScore, nonEuOwner ? 78 : 86);
      }
      if (wantsEuCharter && !euFlag && !hasLimitedCharterRoute && !redEnsignOrOpen) finalScore = Math.min(finalScore, 78);
      if (wantsCommercial && risks.length >= 3) finalScore = Math.min(finalScore, 82);
      if (risks.length >= 5) finalScore = Math.min(finalScore, 74);
      const recommendation: FlagComparisonResult["recommendation"] =
        finalScore >= 88
          ? "recommended"
          : finalScore >= 74
            ? "suitable"
            : finalScore >= 55
              ? "possible"
              : "not_recommended";

      return {
        ...flag,
        score: finalScore,
        recommendation,
        fit_summary: buildFitSummary(flag, input, finalScore),
        positives: positives.slice(0, 5),
        risks: risks.slice(0, 5),
        eligibility_summary: hasEuEligibilityBarrier
          ? "Conditional: this profile appears to need an EU/EEA ownership, resident representative, manager, permanent establishment or equivalent qualifying structure."
          : nonEuOwner && !euFlag
            ? "Generally compatible with non-EU ownership, subject to the registry's company/agent route and KYC."
            : nonEuOwner
              ? "Possible for a non-EU owner only if the flag's qualifying ownership/company route is satisfied."
              : "No major owner-eligibility blocker detected from the stored flag intelligence.",
        tax_vat_summary: wantsEuCharter
          ? euFlag
            ? `EU charter profile: this flag may simplify EU operation, but VAT/tax exposure is assessed as ${vatLevel}. Confirm VAT, charter licensing, corporate tax and crew/social charges before relying on it.`
            : `EU charter profile under a non-EU flag: VAT, customs, Temporary Admission, cabotage and local charter permits remain separate from the flag registration. Exposure is assessed as ${vatLevel}.`
          : vatLevel === "unknown"
            ? "No specific VAT/tax conclusion can be made from the stored data."
            : `VAT/tax exposure from stored data is assessed as ${vatLevel}.`,
        charter_summary: wantsCommercial
          ? flag.commercial_available
            ? hasLimitedCharterRoute
              ? "Commercial registration is available, and the stored data references a limited-charter/YET/PYLC-type route that may matter for occasional charter use."
              : "Commercial registration is available; local charter permits and operating-area rules still need to be checked."
            : "Commercial registration is not supported for this profile."
          : "Private registration profile; charter rules are not the primary driver unless charter is enabled.",
        compliance_summary: [
          flag.classification_required || (loa != null && loa >= 24)
            ? "Class/survey workflow should be expected or confirmed for a large yacht."
            : "Class/survey burden appears lighter for this profile.",
          flag.mortgage_available ? "Mortgage registration available." : "Mortgage support must be confirmed.",
          flag.radio_license ? "Radio licence / MMSI route available or normally supported." : "Radio licence route to verify.",
        ].join(" "),
        decision_drivers: decisionDrivers.slice(0, 4),
      };
    })
    .sort((a, b) => b.score - a.score || a.flag_name.localeCompare(b.flag_name));
}

function buildFitSummary(flag: FlagRegistry, input: FlagComparisonInput, score: number): string {
  const use = input.use_type === "commercial" || input.charter ? "commercial/charter" : "private";
  if (score >= 88) return `${flag.flag_name} is a strong fit for this ${use} profile.`;
  if (score >= 74) return `${flag.flag_name} is suitable, subject to tax and registration advice.`;
  if (score >= 55) return `${flag.flag_name} is possible but should be compared against stronger alternatives.`;
  return `${flag.flag_name} is not recommended for this profile without specialist advice.`;
}
