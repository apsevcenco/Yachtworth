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

const EU_CODES = new Set(["malta", "france", "italy", "spain", "portugal_madeira", "cyprus", "netherlands", "luxembourg"]);

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

export function compareFlagRegistries(
  input: FlagComparisonInput,
  registries = FALLBACK_FLAG_REGISTRIES,
): FlagComparisonResult[] {
  const wantsCommercial = input.use_type === "commercial" || Boolean(input.charter);
  const wantsEu = textIncludes(input, ["eu", "europe", "med", "france", "italy", "spain", "greece", "croatia", "malta"]);
  const highValue = (input.value_eur ?? 0) >= 1_000_000 || Boolean(input.mortgage_needed);
  const gt = input.gt ?? null;
  const ownerText = [input.owner_nationality, input.owner_residency].filter(Boolean).join(" ").toLowerCase();
  const companyCountry = (input.company_country ?? "").toLowerCase();
  const isLikelyNonEuOwner =
    Boolean(ownerText) &&
    !/(eu|eea|swiss|switzerland|uk|united kingdom|british|malta|maltese|france|french|italy|italian|spain|spanish|germany|german|netherlands|dutch|portugal|portuguese|cyprus|cypriot)/i.test(ownerText);

  return registries
    .map((flag) => {
      let score = 55;
      const positives: string[] = [];
      const risks: string[] = [];
      const text = flagText(flag as FlagRegistry & Record<string, unknown>);

      if (wantsCommercial) {
        if (flag.commercial_available) {
          score += 16;
          positives.push("Commercial registration is available.");
          if (text.includes("commercial yacht code") || text.includes("commercial yacht")) {
            score += 5;
            positives.push("Commercial yacht code / commercial yacht pathway is documented.");
          }
        } else {
          score -= 35;
          risks.push("Commercial registration is not supported for this profile.");
        }
      } else if (flag.private_available) {
        score += 8;
        positives.push("Private registration is available.");
      }

      if (highValue && flag.mortgage_available) {
        score += 10;
        positives.push("Mortgage registration is available.");
        if (text.includes("executive title") || text.includes("mortgagee")) {
          score += 3;
          positives.push("Mortgage protections are documented for finance discussions.");
        }
      } else if (highValue) {
        score -= 10;
        risks.push("Mortgage support should be confirmed before finance discussions.");
      }

      if (flag.processing_time_days_max != null && flag.processing_time_days_max <= 10) {
        score += 6;
        positives.push("Fast provisional registration is usually possible.");
      }

      if (flag.insurance_notes?.toLowerCase().includes("widely") || flag.insurance_notes?.toLowerCase().includes("strong")) {
        score += 5;
        positives.push("Good bank and insurance market acceptance.");
      }

      if (wantsEu) {
        if (EU_CODES.has(flag.code)) {
          score += 10;
          positives.push("EU flag profile fits the intended cruising/charter area.");
          if (text.includes("vat") && text.includes("charter")) {
            score += 4;
            positives.push("EU VAT / charter framework is documented.");
          }
        } else {
          score -= 3;
          risks.push("EU VAT, cabotage and charter rules require separate legal review.");
        }
      }

      if (flag.code === "malta" && companyCountry.includes("malta")) {
        score += 5;
        positives.push("Maltese company ownership is a standard route for non-EU owners.");
      }

      if (flag.code === "cayman" && highValue) {
        score += 6;
        positives.push("Cayman is a premium Category 1 Red Ensign option for high-value and financed yachts.");
      }

      if (flag.code === "cayman" && wantsCommercial && text.includes("yet")) {
        score += 4;
        positives.push("YET can support limited charter activity without full commercial conversion when eligible.");
      }

      if (flag.code === "cayman" && wantsEu) {
        score -= 4;
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
        score -= 3;
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

      if (isLikelyNonEuOwner && text.includes("non-eu individuals no")) {
        score -= 8;
        risks.push("Non-EU individual personal registration is not the direct route; a company or recognised legal entity structure is required.");
      }

      if (gt != null && flag.max_gt != null && gt > flag.max_gt) {
        score -= 45;
        risks.push(`GT exceeds the registry profile limit of ${flag.max_gt}.`);
      }

      if (flag.classification_required && (input.loa_m ?? 0) >= 24) {
        positives.push("Large-yacht class/survey workflow is supported.");
      }

      if (input.registration_type === "reflag" && flag.temporary_registration) {
        score += 4;
        positives.push("Temporary registration can support a reflag transition.");
      }

      const finalScore = Math.max(0, Math.min(100, Math.round(score)));
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
