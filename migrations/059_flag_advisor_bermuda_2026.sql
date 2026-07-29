-- Yachtworth Flag Advisor: Bermuda comprehensive profile v1.

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
  'bermuda','bermuda','bermuda','Bermuda','Bermuda','Bermuda','commonwealth',
  'Red Ensign Group Category 1 / Bermuda Ship Registry',false,true,true,'yes','yes',
  'No statutory minimum identified.',
  'Commercial yacht registration available for all yacht sizes subject to coding.',
  'No maximum LOA or GT; Category 1 register experienced with very large yachts, cruise ships and LNG vessels.',
  'Standard 12-passenger commercial limit; above 12 requires Passenger Yacht Code or LY3 route.',
  'yes','Provisional certificate available after document review.',
  'Certificate of British Registry after full Bermuda registry process.',
  'Bermudian, UK and Commonwealth owners may be eligible directly; foreign owners normally use a Bermuda exempt company.',
  'Bermuda exempt company is the standard foreign-owner route; trust structures are common for UHNW ownership.',
  'Bermuda registered agent required for exempt company structures.',
  'Full mortgage registration available with UK-style priority; 24/7 registry availability supports finance closings.',
  'Radio licensing / MMSI available where equipment is fitted.',
  'Commercial yachts require MCA LY3 or applicable coding; large commercial vessels require class.',
  'Private yachts require tonnage/condition survey as required; commercial yachts require initial/intermediate/renewal survey cycle.',
  'MCA LY3 / Large Yacht Code and Passenger Yacht Code where applicable.',
  'Safe manning determined by Bermuda Ship Registry; STCW/MLC for commercial yachts.',
  '2-4 weeks typical.',
  'Zero Bermuda income tax, capital gains tax and VAT; non-EU flag requires EU VAT/Temporary Admission planning.',
  'No Bermuda-specific nationality restrictions; commercial crew require STCW, medicals and endorsements where applicable.',
  'Application; Bill of Sale/Builder Certificate; deletion certificate; ITC69; survey/safety compliance; ownership/identity proof; Bermuda exempt company documents where applicable; marking evidence.',
  'Premier Red Ensign status; very strong lender/insurance perception; 24/7 registry; robust trust/company framework; onboard legal marriage feature.',
  'Higher professional/company cost; non-EU VAT/customs planning required; best suited to high-value yachts rather than budget registration.',
  '["ABS","BV","DNV","Lloyd''s Register","RINA","ClassNK"]'::jsonb,
  null,325,true,true,true,true,14,28,true,true,
  'Foreign owners normally require Bermuda exempt company or qualifying structure.',
  'Bermuda exempt company and registered agent commonly required for non-resident foreign owners.',
  'Commercial yachts require STCW/MLC and Bermuda endorsements where applicable.',
  'Non-EU Red Ensign flag. No local VAT, but EU VAT/customs and Temporary Admission planning remain separate.',
  'Premier finance and insurance market acceptance, particularly for high-value yachts.',
  '["Premier Category 1 Red Ensign register","Strong mortgage and lender acceptance","24/7 registry availability","Zero-tax jurisdiction","Experienced with high-value superyachts"]'::jsonb,
  '["Higher company/professional costs","Non-EU VAT/customs planning required","Less budget-oriented than BVI or Poland","Foreign owners commonly need exempt company"]'::jsonb,
  'https://www.maritimeauthority.bm/','Bermuda Ship Registry','https://www.maritimeauthority.bm/','https://www.maritimeauthority.bm/',
  'high','verified','production_ready',91,'bermuda-guide-2026-v1',current_date,current_date,
  $$[
    {"title":"Registry overview","body":"Bermuda is a UK Category 1 Red Ensign register with strong presence in large yachts, cruise ships and complex finance structures. It is a premium flag, not a low-cost basic registration route."},
    {"title":"Costs","rows":[
      {"item":"Annual service fee <=500 GRT and >24 m","amount":"USD 350"},
      {"item":"Annual service fee >500 GRT","amount":"USD 950"},
      {"item":"Mortgage/change fees <=24 m yacht","amount":"USD 160"},
      {"item":"45 m commercial all-in","amount":"Indicative USD 35,000-60,000+ including company and LY3 costs"}
    ]},
    {"title":"Commercial use","rows":[
      {"route":"Commercial yacht","note":"Available for all sizes subject to coding"},
      {"route":"LY3 / Large Yacht Code","note":"Required for >24 m commercial operation"},
      {"route":"Passenger yacht","note":"Above 12 passengers requires PYC or LY3"},
      {"route":"Bareboat charter","note":"Permitted with appropriate registration and coding"}
    ]},
    {"title":"Advisor interpretation","body":"Bermuda should rank highly for financed, high-value and institutionally owned yachts where prestige, mortgage recognition and robust legal framework matter. For smaller budget yachts, BVI, Poland, Malta or Bahamas may be more efficient."}
  ]$$::jsonb,
  '{"source":"Bermuda Yacht Registration Guide 2026","profile_version":"bermuda-guide-2026-v1"}'::jsonb,
  'bm','bm','/assets/flags/4x3/bm.svg','Flag of Bermuda','flag-icons@7.5.0','MIT',date '2026-07-29',true
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
 where flag_registry_id = (select id from public.flag_registries where code = 'bermuda')
   and confidence_level = 'high';

insert into public.flag_required_documents (flag_registry_id, registration_type, document_name, document_category, is_required, condition_text, confidence_level, sort_order)
select fr.id, d.registration_type, d.document_name, d.document_category, true, d.condition_text, 'high', d.sort_order
from public.flag_registries fr
cross join (
  values
    ('private','Application for Registration','registration','Bermuda Ship Registry application.',10),
    ('private','Bill of Sale or Builder Certificate','ownership','Notarized ownership/title evidence.',20),
    ('private','Deletion Certificate','registration','Required where previously registered.',30),
    ('private','Tonnage Certificate ITC69','technical','Tonnage measurement or accepted existing certificate.',40),
    ('private','Survey / safety compliance evidence','technical','Private or commercial evidence depending on use.',50),
    ('private','Bermuda exempt company documents','corporate','Required where foreign owner uses Bermuda company route.',60),
    ('commercial','LY3 / commercial coding certificates','commercial','Required for commercial yacht operation.',70)
) as d(registration_type, document_name, document_category, condition_text, sort_order)
where fr.code = 'bermuda';
