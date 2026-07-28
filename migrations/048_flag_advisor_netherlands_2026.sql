-- Yachtworth Flag Advisor: Netherlands comprehensive profile v1.

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
  'netherlands','netherlands','netherlands','Netherlands','Netherlands','Netherlands','eu',
  'EU national registry / ILT and Kadaster',true,true,true,'yes','yes',
  'Seabrief is a non-commercial pleasure route; merchant register route is used where title/mortgage or commercial profile is required.',
  'Commercial yachts require the merchant register route and applicable ILT/class certification.',
  'No single maximum was identified; route depends on vessel size, use and certification.',
  'Passenger/commercial limits depend on certification and safety regime.',
  'limited','No broad provisional yacht registration route was identified; special cases should be checked with ILT/Kadaster.',
  'Registration is continuing, subject to ongoing documents and compliance.',
  'Dutch/EU eligibility and nationality test can apply. Non-EU owners may need a Dutch/EU structure with real connection.',
  'Foreign ownership is possible where the nationality test and Dutch/EU connection requirements are satisfied.',
  'Local legal/registry support is useful, especially for non-EU or commercial structures.',
  'Mortgage registration is available through the Kadaster merchant register route.',
  'Dutch radio licence and MMSI/call sign requirements apply.',
  'Class/ILT certification depends on vessel use, size and commercial operation.',
  'Measurement, safety and ILT/class inspections apply by route and use.',
  'No simple dedicated yacht code equivalent was identified; commercial operation follows Dutch/EU maritime rules.',
  'Commercial yachts require compliant manning, STCW/MLC and Dutch/EU labour rules.',
  'Often 2-6 weeks depending on nationality test, measurement, Kadaster and ILT processing.',
  'Dutch VAT is 21%. Dutch corporate tax can reach 25.8%. Tonnage tax exists, but yacht eligibility is limited and case-specific.',
  'Dutch/EU labour and social security costs can be material for Netherlands-based commercial operation.',
  'Ownership documents; deletion certificate; nationality test documents; Kadaster registration; measurement certificate; radio licence; commercial certificates where applicable.',
  'Respected EU flag; transparent official fees; strong Kadaster title/mortgage system; good for Dutch/EU ownership structures.',
  'Seabrief is strictly non-commercial; nationality test can block weak non-EU structures; not optimized for yacht charter; Dutch labour/tax exposure.',
  '["DNV","Lloyd''s Register","BV","RINA","ABS"]'::jsonb,
  1241,null,true,false,true,true,14,42,true,true,
  'Dutch/EU connection and nationality test can apply, especially for non-EU owners.',
  'Foreign company ownership depends on satisfying Dutch/EU connection and nationality rules.',
  'Commercial crewing must comply with Dutch/EU labour, STCW and MLC obligations.',
  '21% Dutch VAT; corporate tax up to 25.8%; tonnage tax is case-specific and not a generic yacht answer.',
  'Strong EU and legal/mortgage recognition, but less charter-optimised than Malta/Madeira.',
  '["EU flag","Transparent Kadaster and ILT process","Strong title/mortgage register","No universal annual registry fee identified","Good Dutch/EU owner fit"]'::jsonb,
  '["Seabrief is non-commercial only","Nationality test can restrict non-EU owners","No dedicated yacht code equivalent","Dutch labour/social security exposure","Less optimized for international charter"]'::jsonb,
  'https://www.ilent.nl/','ILT and Kadaster','https://www.ilent.nl/','https://www.kadaster.nl/',
  'high','verified','production_ready',88,'netherlands-guide-2026-v1',current_date,current_date,
  $$[
    {"title":"Registry overview","body":"The Netherlands is a respected EU flag administered through ILT and Kadaster. It is strongest where Dutch/EU ownership connection and legal title/mortgage certainty matter."},
    {"title":"Routes","rows":[
      {"route":"Seabrief","use":"Non-commercial pleasure yacht route only","note":"No commercial charter"},
      {"route":"Merchant register","use":"Commercial/large/title and mortgage route","note":"Kadaster and ILT requirements apply"}
    ]},
    {"title":"Fees","rows":[
      {"service":"Kadaster ship registration","fee":"EUR 630"},
      {"service":"Seabrief","fee":"EUR 221"},
      {"service":"Measurement under 24 m","fee":"EUR 201"},
      {"service":"Nationality test pleasure","fee":"EUR 248"},
      {"service":"Nationality test commercial","fee":"EUR 410"}
    ]},
    {"title":"Tax and commercial use","body":"Dutch VAT is 21% and commercial structures can face Dutch corporate tax and labour/social security exposure. Tonnage tax exists, but yacht eligibility is not a generic assumption."},
    {"title":"Advisor interpretation","body":"The Netherlands is a high-quality EU legal/title flag, but not usually the leading flag for international charter optimisation. Seabrief must never be treated as a commercial charter route."}
  ]$$::jsonb,
  '{"source":"Netherlands Yacht Registration Comprehensive Guide 2026","profile_version":"netherlands-guide-2026-v1"}'::jsonb,
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
 where flag_registry_id = (select id from public.flag_registries where code = 'netherlands')
   and confidence_level = 'high';

insert into public.flag_required_documents (flag_registry_id, registration_type, document_name, document_category, is_required, condition_text, confidence_level, sort_order)
select fr.id, d.registration_type, d.document_name, d.document_category, true, d.condition_text, 'high', d.sort_order
from public.flag_registries fr
cross join (
  values
    ('private','Proof of ownership','registration','Bill of Sale or Builder Certificate.',10),
    ('private','Deletion certificate','registration','Required where previously registered.',20),
    ('private','Nationality test documents','eligibility','Required depending on owner nationality and structure.',30),
    ('private','Kadaster registration documents','registration','Required for merchant register/title route.',40),
    ('private','Measurement certificate','technical','Required for applicable routes.',50),
    ('private','Radio licence documents','radio','Dutch radio/MMSI documentation.',60),
    ('commercial','ILT / commercial safety certificates','commercial','Required for commercial operation.',70),
    ('commercial','Class or inspection evidence','technical','Required where commercial size/use triggers it.',80)
) as d(registration_type, document_name, document_category, condition_text, sort_order)
where fr.code = 'netherlands';
