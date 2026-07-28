-- Yachtworth Flag Advisor: Bahamas comprehensive profile v1.

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
  'bahamas','bahamas','bahamas','The Bahamas','The Bahamas','The Bahamas','open',
  'Open Registry Category 1 / Bahamas Maritime Authority',false,true,true,'yes','yes',
  'Private yachts from 12 m LOA under BMA yacht framework.',
  'Charter yachts from 12 m LOA; small charter 12-24 m and large charter above 24 m.',
  'No public maximum. Category 1 register authorised for vessels of all types and sizes.',
  'Standard 12 passengers; Bahamas Passenger Yacht Code can allow 13-36 passengers.',
  'yes','Provisional certificate available for urgent cases.',
  'Certificate of Bahamas Registry after complete submission and BMA review.',
  'Open registry. Bahamian owners eligible directly; foreign owners can register through Bahamas company, foreign company or direct/agent route depending on structure.',
  'Bahamas IBC and foreign company ownership accepted; foreign structures may require local registered agent.',
  'Bahamas registered agent / maritime service provider required for non-resident owners.',
  'Mortgage registration available through BMA/BORIS framework.',
  'Radio station licence / MMSI process available where equipment is fitted.',
  'Commercial yachts require applicable BMA Small/Large Yacht Code or MCA LY3; PYC for 13-36 passengers.',
  'Private yachts require initial safety survey and tonnage; commercial survey cycle depends on code.',
  'BMA Small Charter Yacht Code, BMA Large Yacht Code, MCA LY3 and Passenger Yacht Code where applicable.',
  'BMA determines safe manning by vessel size, type and operation.',
  '4-6 weeks typical after complete documentation.',
  'No Bahamas income tax, capital gains tax or VAT; non-EU flag requires EU VAT/customs planning for EU use.',
  'No Bahamas crew nationality restrictions; STCW/MLC for commercial yachts.',
  'Application; Bill of Sale/Builder Certificate; deletion certificate; ITC69; survey/safety compliance; ownership/identity proof; insurance; radio application.',
  'Premier open registry; White List/Qualship 21; strong yacht framework; unique Passenger Yacht Code; competitive annual fees.',
  'Non-EU VAT/customs planning required; promotional initial-fee waiver must be rechecked; mortgage fees require direct confirmation.',
  '["ABS","BV","DNV","Lloyd''s Register","RINA","ClassNK"]'::jsonb,
  650,650,true,true,true,true,28,42,true,true,
  'Open registry for Bahamian and foreign owners subject to agent/structure requirements.',
  'Bahamas IBC or foreign company route available; local agent commonly required for non-residents.',
  'Commercial yachts require STCW/MLC and BMA safe manning.',
  'Non-EU flag. No local VAT, but EU VAT, charter VAT and Temporary Admission rules must be separately reviewed.',
  'Excellent open-registry reputation with strong insurer and underwriter acceptance.',
  '["Premier open registry","Passenger Yacht Code for up to 36 passengers","White List and Qualship 21","Good charter framework","Competitive fees"]'::jsonb,
  '["Non-EU VAT/customs planning required","Initial fee waiver may be temporary","Some fees require direct registry confirmation","Local agent required for non-residents"]'::jsonb,
  'https://www.bahamasmaritime.com/','Bahamas Maritime Authority','https://www.bahamasmaritime.com/','https://www.bahamasmaritime.com/',
  'high','verified','production_ready',89,'bahamas-guide-2026-v1',current_date,current_date,
  $$[
    {"title":"Registry overview","body":"The Bahamas Maritime Authority is a major Category 1 open registry with dedicated yacht frameworks, White List status and strong commercial yacht recognition."},
    {"title":"Registration types","rows":[
      {"type":"Private yacht","threshold":"12 m+ LOA"},
      {"type":"Small charter yacht","threshold":"12-24 m"},
      {"type":"Large charter yacht","threshold":">24 m"},
      {"type":"Passenger yacht","threshold":"13-36 passengers under Bahamas PYC"}
    ]},
    {"title":"Costs","rows":[
      {"item":"Private annual fee","amount":"USD 700"},
      {"item":"Charter annual fee","amount":"USD 1,000 + USD 0.20/ton"},
      {"item":"15 m private all-in","amount":"Indicative USD 2,500-4,500"},
      {"item":"35 m commercial all-in","amount":"Indicative USD 12,000-25,000"}
    ]},
    {"title":"Advisor interpretation","body":"Bahamas should rank strongly for charter yachts, especially if passenger-yacht flexibility is important. It is not an EU VAT-paid solution and should be checked against Malta/Madeira for EU-only charter."}
  ]$$::jsonb,
  '{"source":"Bahamas Yacht Registration Guide 2026","profile_version":"bahamas-guide-2026-v1"}'::jsonb,
  'bs','bs','/assets/flags/4x3/bs.svg','Flag of The Bahamas','flag-icons@7.5.0','MIT',date '2026-07-29',true
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
 where flag_registry_id = (select id from public.flag_registries where code = 'bahamas')
   and confidence_level = 'high';

insert into public.flag_required_documents (flag_registry_id, registration_type, document_name, document_category, is_required, condition_text, confidence_level, sort_order)
select fr.id, d.registration_type, d.document_name, d.document_category, true, d.condition_text, 'high', d.sort_order
from public.flag_registries fr
cross join (
  values
    ('private','Application for Registration','registration','BMA/BORIS registration application.',10),
    ('private','Bill of Sale or Builder Certificate','ownership','Ownership/title evidence.',20),
    ('private','Deletion Certificate','registration','Required where previously registered.',30),
    ('private','Tonnage Certificate ITC69','technical','Tonnage measurement or accepted existing certificate.',40),
    ('private','Safety compliance evidence','technical','Private safety verification or commercial yacht code survey.',50),
    ('private','Insurance evidence','insurance','Evidence of insurance required by BMA process.',60),
    ('commercial','Commercial / PYC certification','commercial','Required for charter or passenger-yacht operation.',70)
) as d(registration_type, document_name, document_category, condition_text, sort_order)
where fr.code = 'bahamas';

update public.flag_registries
   set active = false,
       updated_at = now(),
       original_row = coalesce(original_row, '{}'::jsonb)
         || jsonb_build_object('deactivated_reason', 'duplicate Bahamas alias hidden by migration 057', 'canonical_code', 'bahamas')
 where code in ('the-bahamas','bahama-islands')
   and code <> 'bahamas';
