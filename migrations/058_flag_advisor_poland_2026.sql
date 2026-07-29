-- Yachtworth Flag Advisor: Poland comprehensive profile v1.

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
  'poland','poland','poland','Poland','Poland','Poland','eu',
  'EU Member State / Reja24 watercraft register',true,true,true,'yes','yes',
  'No minimum LOA; simplified Reja24 route applies up to 24 m.',
  'Commercial registration available up to 24 m via Reja24; above 24 m requires Polish Shipping Register.',
  'Reja24 handles vessels up to 24 m; larger vessels require full Polish Shipping Register route.',
  'Passenger limits depend on design and survey; no simple public cap under 24 m.',
  'yes','Provisional registration certificate can be issued by email in 2-3 days, faster with express agent route.',
  'Lifetime registration card with no expiry under standard Reja24 route.',
  'Polish, EU/EEA and non-EU individuals can register directly under current guide; companies require EU/EEA or qualifying structure.',
  'EU/EEA companies eligible directly; non-EU companies may require EU subsidiary or Polish branch.',
  'Polish registration agent mandatory for non-residents to handle Reja24 filings.',
  'Mortgage registration available through Polish Shipping Register.',
  'MMSI/radio licence available via UKE; radio operator certificate required.',
  'No class for private yachts under 24 m; commercial and >24 m vessels require technical survey/class route.',
  'No registration survey for private yachts under 24 m; commercial vessels and >24 m route require survey.',
  'Polish commercial safety survey and applicable EU/IMO rules.',
  'No mandated safe manning for private yachts under 24 m; commercial requirements apply.',
  '2-3 days provisional, 2-4 weeks permanent.',
  'Full EU flag. No annual yacht tax; EU VAT applies for EU import/commercial operations where relevant.',
  'No restrictions for private yachts; STCW/commercial requirements apply for charter/commercial operations.',
  'Application via agent; Bill of Sale/Builder Certificate; passport; proof of address; vessel specification/CE where available; deletion certificate; power of attorney; translations where needed.',
  'EU flag; lifetime validity; no annual fee; very low official cost; no survey for private <24 m; strong choice for EU-based small/mid yachts.',
  '24 m threshold is critical; Polish agent required; commercial/French local charter licensing still needs review; not a prestige superyacht flag.',
  '["PRS","ABS","BV","DNV","Lloyd''s Register","RINA"]'::jsonb,
  450,0,true,true,true,true,2,28,false,false,
  'Current guide indicates non-EU individuals can register directly; policy should be rechecked before final advice.',
  'Non-EU companies may need EU subsidiary or Polish branch; non-resident agent required.',
  'Commercial crew must meet applicable STCW/survey requirements.',
  'EU flag. Useful where the yacht is EU VAT-paid or needs stable EU presence; not a Temporary Admission route.',
  'Good EU flag acceptance; less premium finance perception than Red Ensign/Cayman/Malta for large financed yachts.',
  '["Full EU flag","Lifetime registration","Zero annual renewal fee","Very low cost","No private survey under 24 m","Fast provisional certificate"]'::jsonb,
  '["24 m simplified-route ceiling","Agent required for non-residents","Commercial local permits still need country-by-country review","Lower superyacht prestige"]'::jsonb,
  'https://reja24.gov.pl/','Polish Watercraft Register / Polish Shipping Register','https://reja24.gov.pl/','https://reja24.gov.pl/',
  'high','verified','production_ready',90,'poland-guide-2026-v1',current_date,current_date,
  $$[
    {"title":"Registry overview","body":"Poland is a strong EU registration route for yachts up to 24 m, with lifetime validity, no annual fee and no registration survey for private yachts under the simplified Reja24 route."},
    {"title":"Eligibility","rows":[
      {"owner":"Polish / EU / EEA individuals","status":"Direct registration"},
      {"owner":"Non-EU individuals","status":"Direct personal registration reported in 2026 guide"},
      {"owner":"EU / EEA companies","status":"Eligible"},
      {"owner":"Non-residents","status":"Polish agent required"}
    ]},
    {"title":"Costs","rows":[
      {"item":"Official government cost","amount":"Approx. EUR 21 one-time"},
      {"item":"Standard agent package","amount":"Approx. EUR 360-395"},
      {"item":"Express / MMSI package","amount":"Approx. EUR 460-595"},
      {"item":"Annual renewal","amount":"EUR 0"}
    ]},
    {"title":"Advisor interpretation","body":"Poland should score very highly for EU-based private yachts under 24 m and budget-conscious owners. It should score lower for large commercial superyachts, where Malta, Madeira, Cayman, Marshall or Red Ensign alternatives are usually stronger."}
  ]$$::jsonb,
  '{"source":"Poland Yacht Registration Guide 2026","profile_version":"poland-guide-2026-v1"}'::jsonb,
  'pl','pl','/assets/flags/4x3/pl.svg','Flag of Poland','flag-icons@7.5.0','MIT',date '2026-07-29',true
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
 where flag_registry_id = (select id from public.flag_registries where code = 'poland')
   and confidence_level = 'high';

insert into public.flag_required_documents (flag_registry_id, registration_type, document_name, document_category, is_required, condition_text, confidence_level, sort_order)
select fr.id, d.registration_type, d.document_name, d.document_category, true, d.condition_text, 'high', d.sort_order
from public.flag_registries fr
cross join (
  values
    ('private','Reja24 application','registration','Submitted by Polish agent.',10),
    ('private','Bill of Sale or Builder Certificate','ownership','Notarized ownership/title evidence.',20),
    ('private','Owner passport and proof of address','identity','Notarized copies usually required.',30),
    ('private','Vessel technical specification','technical','CE certificate if available.',40),
    ('private','Deletion Certificate','registration','Required where previously registered.',50),
    ('private','Power of Attorney for Polish agent','representative','Required for non-resident filing.',60),
    ('commercial','Technical survey certificate','commercial','Required for commercial operation where applicable.',70)
) as d(registration_type, document_name, document_category, condition_text, sort_order)
where fr.code = 'poland';
