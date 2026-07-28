-- Yachtworth Flag Advisor: United Kingdom comprehensive profile v1.

alter table public.flag_registries
  add column if not exists advisor_sections jsonb not null default '[]'::jsonb;

insert into public.flag_registries (
  code, slug, import_key, flag_name, country, country_or_territory, registry_type,
  registry_family, is_eu_flag, private_available, commercial_available,
  private_registration_status, commercial_registration_status, private_minimum_loa,
  commercial_minimum_loa, maximum_loa_gt_notes, passenger_limit_notes,
  provisional_registration_status, provisional_validity, permanent_validity,
  owner_eligibility, foreign_company_ownership, local_agent_requirement,
  mortgage_registration_status, radio_licence_requirement, classification_requirement,
  survey_inspection_requirement, commercial_yacht_code, minimum_safe_manning,
  indicative_processing_time, vat_tax_note, crew_note, required_documents_summary,
  objective_advantages, limitations_and_risks, accepted_class, registration_cost_eur,
  annual_fee_eur, mortgage_available, temporary_registration, permanent_registration,
  radio_license, processing_time_days_min, processing_time_days_max, survey_required,
  classification_required, owner_nationality_restrictions, company_restrictions,
  crew_restrictions, vat_notes, insurance_notes, advantages, disadvantages,
  official_website, official_registry_name, official_registry_url, primary_fee_url,
  confidence_level, coverage_status, data_quality_status, data_quality_score,
  source_version, last_updated, last_verified_at, advisor_sections, original_row, active
) values (
  'united-kingdom','united-kingdom','united-kingdom','United Kingdom','United Kingdom','United Kingdom','commonwealth',
  'Category 1 Red Ensign / UK Ship Register',false,true,true,'yes','yes',
  'Part 1 has no minimum. Part 3 SSR is for UK-resident private owners with vessels under 24 m.',
  'No universal commercial minimum; commercial coding and ITC69/certification apply by size/use.',
  'Category 1 register with no tonnage or length limits.',
  'Passenger limits are code-dependent; standard yacht commercial use is generally up to 12 unless certified otherwise.',
  'yes','Temporary/provisional and Part 4 bareboat charter routes exist case by case.',
  'Part 1 and Part 3 registrations are valid for 5 years.',
  'Part 1 accepts British, Commonwealth, EEA and approved-country owners. Non-approved owners may need a UK Ltd or EEA company. SSR requires UK ordinary residence and individual ownership.',
  'Foreign company ownership is possible under Part 1 via qualifying entities.',
  'UK-resident representative is required for non-resident Part 1 owners.',
  'Mortgage registration is available only under Part 1. Part 3 SSR and Part 4 do not provide mortgage capability.',
  'Radio licensing via UK OFCOM.',
  'MCA accepts major IACS societies. Commercial vessels require applicable coding/class.',
  'Part 1 requires tonnage survey by MCA-authorised surveyor. Commercial vessels require safety/coding surveys.',
  'UK/MCA commercial vessel codes and REG Yacht Code framework as applicable.',
  'Safe Manning Document is mandatory for relevant UK-flag yachts over 24 m, excluding qualifying pleasure-only use.',
  'Standard Part 1 processing is about 2 weeks; express service can be 5-7 days.',
  'UK is non-EU after Brexit. UK VAT/customs status is independent from yacht registration; EU VAT/customs require separate analysis.',
  'No private crew nationality restrictions. Commercial vessels must comply with UK/EU maritime labour rules, STCW, MLC and ISM/ISPS where applicable.',
  'Online application; Bill of Sale; Builder Certificate; tonnage survey; radio details; previous registry details; safety certificates where commercial; UK representative if non-resident.',
  'Gold-standard Red Ensign; very low official fees; strong legal title; mortgage register; global recognition and British consular protection.',
  'Non-EU after Brexit; UK tax/VAT exposure can be high for UK-resident structures; SSR gives nationality proof only and no mortgage; EU VAT/Temporary Admission planning required.',
  '["ABS","BV","DNV","Lloyd''s Register","RINA","ClassNK"]'::jsonb,
  153,72,true,true,true,true,7,14,true,true,
  'Part 1 has wide eligibility; SSR requires UK ordinary residence. Non-approved owners may need a UK/EEA company.',
  'Part 1 accepts qualifying companies; UK representative required for non-resident owners.',
  'Commercial rules apply by yacht profile; private yachts have flexible crew nationality.',
  'Non-EU after Brexit; no automatic EU VAT-paid status.',
  'Highest Red Ensign prestige and very strong mortgage/legal title perception.',
  '["Gold-standard Red Ensign","Very low official fees","Part 1 proof of ownership","Mortgage register","Part 4 bareboat charter route","Global recognition","British consular protection"]'::jsonb,
  '["Non-EU after Brexit","UK tax/VAT exposure can be high for UK-resident structures","SSR has no mortgage or ownership proof","EU VAT/customs planning required"]'::jsonb,
  'https://www.gov.uk/government/organisations/maritime-and-coastguard-agency','UK Ship Register / Maritime and Coastguard Agency','https://www.gov.uk/register-a-boat','https://www.gov.uk/register-a-boat',
  'high','verified','production_ready',90,'uk-guide-2026-v1',current_date,current_date,
  $$[
    {"title":"Registry overview","body":"The UK Ship Register is the origin Red Ensign register and is widely regarded as the gold standard for yacht registration, title and mortgage recognition."},
    {"title":"Register parts","rows":[
      {"part":"Part 1","use":"Pleasure/commercial, proof of title and mortgage","validity":"5 years"},
      {"part":"Part 3 SSR","use":"UK-resident private pleasure under 24 m; nationality proof only","validity":"5 years"},
      {"part":"Part 4","use":"Bareboat charter vessels","validity":"Charter period / route dependent"}
    ]},
    {"title":"Fees","rows":[
      {"service":"Part 1 initial registration","fee":"GBP 153 / 5 years"},
      {"service":"Part 1 renewal","fee":"GBP 72 / 5 years"},
      {"service":"Part 3 SSR","fee":"GBP 35 / 5 years"},
      {"service":"Safe Manning Document","fee":"GBP 199"}
    ]},
    {"title":"Advisor interpretation","body":"The UK flag is best viewed as prestige/legal certainty, not tax optimisation. It is excellent for title and mortgage, but post-Brexit it does not solve EU VAT/customs planning."}
  ]$$::jsonb,
  '{"source":"United Kingdom Yacht Registration Comprehensive Guide 2026","profile_version":"uk-guide-2026-v1"}'::jsonb,
  true
)
on conflict (code) do update set
  slug=excluded.slug, import_key=excluded.import_key, flag_name=excluded.flag_name, country=excluded.country,
  country_or_territory=excluded.country_or_territory, registry_type=excluded.registry_type,
  registry_family=excluded.registry_family, is_eu_flag=excluded.is_eu_flag,
  private_available=excluded.private_available, commercial_available=excluded.commercial_available,
  private_registration_status=excluded.private_registration_status, commercial_registration_status=excluded.commercial_registration_status,
  private_minimum_loa=excluded.private_minimum_loa, commercial_minimum_loa=excluded.commercial_minimum_loa,
  maximum_loa_gt_notes=excluded.maximum_loa_gt_notes, passenger_limit_notes=excluded.passenger_limit_notes,
  provisional_registration_status=excluded.provisional_registration_status, provisional_validity=excluded.provisional_validity,
  permanent_validity=excluded.permanent_validity, owner_eligibility=excluded.owner_eligibility,
  foreign_company_ownership=excluded.foreign_company_ownership, local_agent_requirement=excluded.local_agent_requirement,
  mortgage_registration_status=excluded.mortgage_registration_status, radio_licence_requirement=excluded.radio_licence_requirement,
  classification_requirement=excluded.classification_requirement, survey_inspection_requirement=excluded.survey_inspection_requirement,
  commercial_yacht_code=excluded.commercial_yacht_code, minimum_safe_manning=excluded.minimum_safe_manning,
  indicative_processing_time=excluded.indicative_processing_time, vat_tax_note=excluded.vat_tax_note,
  crew_note=excluded.crew_note, required_documents_summary=excluded.required_documents_summary,
  objective_advantages=excluded.objective_advantages, limitations_and_risks=excluded.limitations_and_risks,
  accepted_class=excluded.accepted_class, registration_cost_eur=excluded.registration_cost_eur, annual_fee_eur=excluded.annual_fee_eur,
  mortgage_available=excluded.mortgage_available, temporary_registration=excluded.temporary_registration,
  permanent_registration=excluded.permanent_registration, radio_license=excluded.radio_license,
  processing_time_days_min=excluded.processing_time_days_min, processing_time_days_max=excluded.processing_time_days_max,
  survey_required=excluded.survey_required, classification_required=excluded.classification_required,
  owner_nationality_restrictions=excluded.owner_nationality_restrictions, company_restrictions=excluded.company_restrictions,
  crew_restrictions=excluded.crew_restrictions, vat_notes=excluded.vat_notes, insurance_notes=excluded.insurance_notes,
  advantages=excluded.advantages, disadvantages=excluded.disadvantages, official_website=excluded.official_website,
  official_registry_name=excluded.official_registry_name, official_registry_url=excluded.official_registry_url,
  primary_fee_url=excluded.primary_fee_url, confidence_level=excluded.confidence_level,
  coverage_status=excluded.coverage_status, data_quality_status=excluded.data_quality_status,
  data_quality_score=excluded.data_quality_score, source_version=excluded.source_version,
  last_updated=excluded.last_updated, last_verified_at=excluded.last_verified_at,
  advisor_sections=excluded.advisor_sections, original_row=excluded.original_row, active=true, updated_at=now();

delete from public.flag_required_documents
 where flag_registry_id = (select id from public.flag_registries where code = 'united-kingdom')
   and confidence_level = 'high';

insert into public.flag_required_documents (flag_registry_id, registration_type, document_name, document_category, is_required, condition_text, confidence_level, sort_order)
select fr.id, d.registration_type, d.document_name, d.document_category, true, d.condition_text, 'high', d.sort_order
from public.flag_registries fr
cross join (
  values
    ('private','Bill of Sale','registration','Required for Part 1 title evidence.',10),
    ('private','Builder Certificate','registration','Required where applicable.',20),
    ('private','Tonnage survey certificate','technical','Required for Part 1.',30),
    ('private','Radio details','radio','Call sign, MMSI and related details where applicable.',40),
    ('private','UK representative appointment','representative','Required for non-resident Part 1 owners.',50),
    ('commercial','Safety/coding certificates','commercial','Required for commercial vessels.',60),
    ('private','Mortgage instrument','mortgage','Part 1 only where mortgage registered.',70)
) as d(registration_type, document_name, document_category, condition_text, sort_order)
where fr.code = 'united-kingdom';
