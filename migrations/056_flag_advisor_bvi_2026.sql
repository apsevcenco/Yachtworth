-- Yachtworth Flag Advisor: British Virgin Islands comprehensive profile v1.

alter table public.flag_registries
  add column if not exists advisor_sections jsonb not null default '[]'::jsonb;

alter table public.flag_registries
  drop constraint if exists flag_registries_flag_code_check,
  add constraint flag_registries_flag_code_check
    check (
      flag_code is null
      or flag_code in ('ky','mt','mh','im','je','gg','gi','gb','fr','it','es','nl','pt','cy','pa','bz','jm','ck','sm','lu','vg','bs','pl','bm')
    );

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
  'british-virgin-islands','british-virgin-islands','british-virgin-islands','British Virgin Islands','British Virgin Islands','British Virgin Islands','commonwealth',
  'Red Ensign Group Category 1 / Virgin Islands Shipping Registry',false,true,true,'yes','yes',
  'No statutory minimum identified; practical private yacht use commonly starts around 10 m.',
  'Commercial route available; guide references 12 m BMA-style threshold and BVI coding requirements.',
  'Category 1 register authorised for vessels of all types and sizes; simplified private treatment may change above 400 GT.',
  'Standard 12-passenger commercial limit; Passenger Yacht Code route can allow up to 36 passengers.',
  'yes','Provisional certificate can be issued when documents are satisfactory.',
  'Certificate of British Registry after marking, document review and fee payment.',
  'BVI, UK, Crown Dependency, Overseas Territory, EU/EEA, CARICOM/OECS and qualifying owners accepted; other nationalities normally use a BVI Business Company.',
  'BVI Business Company is the standard route for privacy, asset protection and non-qualifying owners.',
  'BVI licensed registered agent strongly advised and practically required for corporate/non-resident structures.',
  'Full mortgage registration available; UK-based priority framework.',
  'Radio licensing / MMSI available through the registry process where equipment is fitted.',
  'Commercial yachts require MCA coding / LY3 where applicable; private yachts need tonnage and safety matrix.',
  'Tonnage survey required; commercial yachts require initial, intermediate and renewal survey cycle.',
  'MCA LY3 for large commercial yachts; Small Commercial Vessel Code below 24 m where applicable.',
  'VISR safe manning document for commercial operation; STCW/MLC for commercial yachts.',
  '2-6 weeks depending on documentation completeness.',
  'Zero BVI corporate tax, capital gains tax, VAT and withholding tax; non-EU flag requires EU VAT/Temporary Admission planning.',
  'No BVI-specific crew nationality restriction; commercial crew must meet STCW/MLC.',
  'Name reservation; application; Declaration of Eligibility; Bill of Sale/Builder Certificate; deletion certificate; tonnage certificate; marking evidence; corporate documents where applicable.',
  'Category 1 Red Ensign reputation; lower-cost alternative to Cayman/Bermuda; zero-tax jurisdiction; strong mortgage register; English process.',
  'Non-EU VAT/customs planning required; BVI agent/corporate structure often needed; commercial LY3 coding can be expensive; processing can take up to 6 weeks.',
  '["ABS","BV","DNV","Lloyd''s Register","RINA"]'::jsonb,
  700,300,true,true,true,true,14,42,true,true,
  'Broad eligibility; non-qualifying nationalities normally use a BVI Business Company.',
  'BVI company/registered agent route is common for foreign owners and privacy structures.',
  'Commercial yachts require STCW/MLC and VISR safe manning.',
  'Non-EU Red Ensign flag. No BVI VAT, but EU use/charter requires VAT/customs planning.',
  'Excellent Red Ensign / Lloyd''s market perception; generally bank and insurer friendly.',
  '["Category 1 Red Ensign register","Lower cost than some premium Red Ensign alternatives","Zero BVI tax environment","Mortgage registration available","Good for private and charter yachts"]'::jsonb,
  '["Non-EU VAT/customs planning required","BVI company or agent often needed","Commercial coding costs can be material","Exact commercial fees depend on size/GT"]'::jsonb,
  'https://bvi.gov.vg/services/application-register-shipvessel','Virgin Islands Shipping Registry','https://bvi.gov.vg/services/application-register-shipvessel','https://bvi.gov.vg/services/application-register-shipvessel',
  'high','verified','production_ready',88,'bvi-guide-2026-v1',current_date,current_date,
  $$[
    {"title":"Registry overview","body":"The British Virgin Islands is a UK Category 1 Red Ensign register administered by VISR. It is suited to mid-size private and charter yachts seeking Red Ensign recognition, zero-tax jurisdictional treatment and a lower cost point than Cayman or Bermuda."},
    {"title":"Eligibility","rows":[
      {"owner":"BVI / UK / Crown Dependencies / Overseas Territories","status":"Full eligibility"},
      {"owner":"EU / EEA owners","status":"Eligible"},
      {"owner":"CARICOM / OECS","status":"Eligible, with BVI company requirement in some cases"},
      {"owner":"Other nationalities","status":"Normally register through BVI Business Company"}
    ]},
    {"title":"Costs","rows":[
      {"item":"Private pleasure <24 m","amount":"USD 600 initial / USD 100 annual"},
      {"item":"Private pleasure >=24 m","amount":"USD 750 initial / USD 300 annual"},
      {"item":"Commercial 40-60 m","amount":"Indicative USD 1,500-2,500 initial plus annual/GT fees"},
      {"item":"45 m commercial all-in","amount":"Indicative USD 21,450-35,000+ including LY3 and professional costs"}
    ]},
    {"title":"Advisor interpretation","body":"BVI should score well for owners who want Red Ensign quality, offshore privacy and lower running cost than Cayman/Bermuda. It should not be treated as an EU VAT solution, and commercial yachts need proper LY3/coding budget."}
  ]$$::jsonb,
  '{"source":"British Virgin Islands Yacht Registration Guide 2026","profile_version":"bvi-guide-2026-v1"}'::jsonb,
  'vg','vg','/assets/flags/4x3/vg.svg','Flag of the British Virgin Islands','flag-icons@7.5.0','MIT',date '2026-07-29',true
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
 where flag_registry_id = (select id from public.flag_registries where code = 'british-virgin-islands')
   and confidence_level = 'high';

insert into public.flag_required_documents (flag_registry_id, registration_type, document_name, document_category, is_required, condition_text, confidence_level, sort_order)
select fr.id, d.registration_type, d.document_name, d.document_category, true, d.condition_text, 'high', d.sort_order
from public.flag_registries fr
cross join (
  values
    ('private','Application for Registration','registration','VISR Form SR101.',10),
    ('private','Declaration of Eligibility','eligibility','Required with every application.',20),
    ('private','Bill of Sale or Builder Certificate','ownership','Ownership/title evidence.',30),
    ('private','Deletion Certificate','registration','Required where previously registered.',40),
    ('private','Tonnage Certificate / Certificate of Survey','technical','ITC69 or accepted equivalent.',50),
    ('private','Carving and Marking Note evidence','technical','Returned after official number, name and port marking.',60),
    ('commercial','MCA coding / LY3 evidence','commercial','Required for commercial operation.',70)
) as d(registration_type, document_name, document_category, condition_text, sort_order)
where fr.code = 'british-virgin-islands';

update public.flag_registries
   set active = false,
       updated_at = now(),
       original_row = coalesce(original_row, '{}'::jsonb)
         || jsonb_build_object('deactivated_reason', 'duplicate BVI alias hidden by migration 056', 'canonical_code', 'british-virgin-islands')
 where code in ('bvi','virgin-islands','british-virgin-islands-bvi')
   and code <> 'british-virgin-islands';
