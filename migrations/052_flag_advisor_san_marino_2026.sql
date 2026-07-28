-- Yachtworth Flag Advisor: San Marino comprehensive profile v1.

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
  source_version, last_updated, last_verified_at, advisor_sections, original_row,
  flag_code, flag_asset_key, flag_asset_path, flag_alt_text, flag_asset_source,
  flag_asset_license, flag_asset_updated_at, active
) values (
  'san-marino','san-marino','san-marino','San Marino','San Marino','San Marino','open',
  'International yacht registry / San Marino Yacht Code',false,true,true,'yes','yes',
  'Private routes include below 10 m and 10-24 m. Published 2026 tariff is strongest for private yachts 10-24 m.',
  'Commercial route exists under the Large Yacht Code; exact thresholds and fees require confirmation.',
  'No public maximum identified.',
  'Code-dependent; commercial/passenger use requires case-specific certification.',
  'yes','3 months plus up to three one-month extensions at EUR 150 each.',
  'Private 10-24 m can use 1-year or lifetime registration. Safety and radio certificates are 5-year items.',
  'Any nationality accepted. Foreign owners must use an authorised San Marino resident agent.',
  'Foreign companies are accepted through resident-agent route; local company/resident routes also exist.',
  'Authorised San Marino resident agent is mandatory for foreign owners.',
  'Mortgage registration available; published private 10-24 m tariff states EUR 500 per instrument.',
  'Radio licence EUR 200 / 5 years for private 10-24 m, including call sign and MMSI.',
  'Small Yacht Code below 24 m; Large Yacht Code for larger/commercial yachts.',
  'Private under 24 m flag inspection not normally applicable; larger/commercial yachts may require surveyor/class inspection.',
  'San Marino Small Yacht Code / Large Yacht Code.',
  'Safe Manning Document is required for commercial operation.',
  'Online/fast processing promoted; exact SLA depends on category and agent readiness.',
  'Non-EU flag with special customs relationship through Italy/EU. EU VAT/customs treatment requires separate analysis.',
  'No nationality restrictions for private yacht crew; commercial STCW/MLC and safe manning apply.',
  'Application; proof of ownership; resident-agent appointment; technical/safety documents; deletion evidence; radio declaration.',
  'Transparent published private 10-24 m tariff; lifetime registration option; no nationality restriction; online/fast process.',
  'Non-EU VAT planning required; Italian-language/agent dependence; commercial and >24 m fees not fully public; agent/surveyor costs excluded.',
  '["RINA","BV","DNV","Lloyd''s Register","ABS"]'::jsonb,
  990,0,true,true,true,true,7,21,true,true,
  'No nationality restriction, but foreign owners must appoint an authorised resident agent.',
  'Foreign companies are accepted through resident-agent route.',
  'Commercial yachts require STCW, MLC and safe manning compliance.',
  'Not in EU VAT area; special customs arrangement does not remove EU VAT/import analysis.',
  'Niche but increasingly credible yacht registry; transparent fees help private owners.',
  '["Lifetime registration option","Published private 10-24 m tariff","No annual registry fee under lifetime option","Mortgage EUR 500","Radio EUR 200 / 5 years","No nationality restrictions"]'::jsonb,
  '["Non-EU flag","Commercial and >24 m tariffs require direct confirmation","Resident agent fees excluded","Italian-language/local support likely","Moderate prestige versus major yacht flags"]'::jsonb,
  'https://www.smsr.sm/','San Marino Ship Register','https://www.smsr.sm/','https://www.smsr.sm/',
  'high','verified_with_gaps','production_ready',84,'san-marino-guide-2026-v1',current_date,current_date,
  $$[
    {"title":"Registry overview","body":"San Marino is a niche yacht-focused international registry with a San Marino Yacht Code, resident-agent route and unusually transparent private 10-24 m pricing."},
    {"title":"Published 2026 private 10-24 m fees","rows":[
      {"service":"Registration","fee":"EUR 990","validity":"1 year or lifetime option"},
      {"service":"Safety certificate","fee":"EUR 500","validity":"5 years"},
      {"service":"Radio licence","fee":"EUR 200","validity":"5 years"},
      {"service":"Mortgage","fee":"EUR 500","validity":"Per instrument"},
      {"service":"Name reservation","fee":"EUR 300","validity":"Per application"},
      {"service":"Provisional extension","fee":"EUR 150","validity":"Per one-month extension"}
    ]},
    {"title":"Key limitation","body":"The published tariff is strongest for private yachts 10-24 m. Below 10 m, above 24 m and commercial fee schedules still require direct registry confirmation."},
    {"title":"Advisor interpretation","body":"San Marino is attractive for private 10-24 m owners who value lifetime registration and fee clarity. It is weaker for commercial charter and EU VAT-driven Mediterranean use."}
  ]$$::jsonb,
  '{"source":"San Marino Yacht Registration Comprehensive Guide 2026","profile_version":"san-marino-guide-2026-v1"}'::jsonb,
  'sm','sm','/assets/flags/4x3/sm.svg','Flag of San Marino','flag-icons@7.5.0','MIT',date '2026-07-27',true
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
  primary_fee_url=excluded.primary_fee_url, confidence_level=excluded.confidence_level, coverage_status=excluded.coverage_status,
  data_quality_status=excluded.data_quality_status, data_quality_score=excluded.data_quality_score,
  source_version=excluded.source_version, last_updated=excluded.last_updated, last_verified_at=excluded.last_verified_at,
  advisor_sections=excluded.advisor_sections, original_row=excluded.original_row,
  flag_code=excluded.flag_code, flag_asset_key=excluded.flag_asset_key, flag_asset_path=excluded.flag_asset_path,
  flag_alt_text=excluded.flag_alt_text, flag_asset_source=excluded.flag_asset_source,
  flag_asset_license=excluded.flag_asset_license, flag_asset_updated_at=excluded.flag_asset_updated_at,
  active=true, updated_at=now();

delete from public.flag_required_documents
 where flag_registry_id = (select id from public.flag_registries where code = 'san-marino')
   and confidence_level = 'high';

insert into public.flag_required_documents (flag_registry_id, registration_type, document_name, document_category, is_required, condition_text, confidence_level, sort_order)
select fr.id, d.registration_type, d.document_name, d.document_category, true, d.condition_text, 'high', d.sort_order
from public.flag_registries fr
cross join (
  values
    ('private','Name reservation','registration','Required before final registration.',10),
    ('private','Proof of ownership','registration','Bill of Sale or Builder Certificate.',20),
    ('private','Resident agent appointment','representative','Mandatory for foreign owners.',30),
    ('private','Technical and safety documents','technical','According to yacht size/category.',40),
    ('private','Deletion evidence','registration','Required where previously registered.',50),
    ('private','Radio declaration','radio','For call sign and MMSI.',60),
    ('commercial','Large Yacht Code compliance evidence','commercial','Required for commercial/>24 m routes.',70)
) as d(registration_type, document_name, document_category, condition_text, sort_order)
where fr.code = 'san-marino';
