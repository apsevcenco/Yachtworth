-- Yachtworth Flag Advisor: Belize comprehensive profile v1.

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
  'belize','belize','belize','Belize','Belize','Belize','open',
  'Open international registry / IMMARBE',false,true,true,'yes','yes',
  'Pleasure yacht below 24 m route available with simplified measurement; no class normally required.',
  'Commercial yacht route generally starts at 24 m with full commercial compliance.',
  'No maximum identified; 24-500 GT and 500 GT+ bands affect requirements.',
  'Passenger yacht treatment is case-dependent and requires additional safety requirements.',
  'yes','Provisional registration valid 6 months, extendable by up to two additional 3-month periods.',
  'Permanent registration valid 5 years; certificates/radio validity continue while annual taxes are paid.',
  'No nationality restrictions. Individuals and companies of any jurisdiction can register.',
  'Any-jurisdiction companies are accepted; Belize IBC structures are commonly used.',
  'Belize shipping agent is required for all registrations.',
  'Mortgage registration is available through the ship registry framework.',
  'Telecommunications/radio licence is included in published package references.',
  'No class for pleasure yachts below 24 m; RO/survey requirements apply for 24 m+ and commercial yachts.',
  'Survey by authorised RO or individual surveyor; additional inspection for vessels over 20 years unless exception applies.',
  'IMMARBE yacht/commercial requirements with IMO/SOLAS/MARPOL where applicable.',
  'Commercial manning and STCW endorsement requirements apply.',
  'Provisional certificates can be issued rapidly; document dispatch can be 1-2 working days after complete file.',
  'Non-EU flag. Belize IBCs can be tax neutral locally, but EU VAT/customs treatment requires separate planning.',
  'No crew nationality restrictions; STCW 2010 endorsement and medical fitness apply.',
  'Proof of ownership; agent appointment; deletion certificate or reliance letter; intended-use declaration; RO/surveyor details; payment.',
  'Very accessible open registry; no nationality restrictions; low published package indications; fast provisional route.',
  'Flag-of-convenience scrutiny; 20-year age cap/inspection risk; less prestige than top yacht flags; non-EU VAT planning required.',
  '["ABS","BV","DNV","Lloyd''s Register","RINA"]'::jsonb,
  null,null,true,true,true,true,2,10,true,true,
  'No nationality restrictions.',
  'Any-jurisdiction companies accepted; Belize IBC often used.',
  'No nationality restriction, but STCW/medical/endorsement requirements apply.',
  '0% local IBC tax and no VAT regime; non-EU flag means EU VAT/customs planning is separate.',
  'Cost-effective but moderate prestige; may face more scrutiny than premium yacht flags.',
  '["No nationality restrictions","Low agent package indications","Fast provisional registration","Mortgage registration available","No class for pleasure yachts below 24 m"]'::jsonb,
  '["Age cap around 20 years with exceptions/inspection","Open-registry scrutiny","Less premium yacht perception","Non-EU VAT/customs planning required"]'::jsonb,
  'https://www.immarbe.com/','International Merchant Marine Registry of Belize','https://www.immarbe.com/','https://www.immarbe.com/',
  'medium','verified_with_gaps','usable_with_warnings',78,'belize-guide-2026-v1',current_date,current_date,
  $$[
    {"title":"Registry overview","body":"Belize / IMMARBE is an accessible open international registry with no nationality restrictions and fast provisional registration."},
    {"title":"Published cost indicators","rows":[
      {"service":"Initial registration package","fee":"USD 1,230 registry indication / USD 3,030 agent package reference"},
      {"service":"Annual renewal","fee":"From USD 605 plus periodic radio renewal"},
      {"service":"Provisional registration","fee":"6 months; extensions possible"}
    ]},
    {"title":"Age and survey","body":"Most new registrations are capped around 20 years, but yachts may receive exceptions based on safety history and intended trade. Pleasure yachts below 24 m use a simplified route."},
    {"title":"Advisor interpretation","body":"Belize is low-cost and accessible, but should be positioned below premium yacht flags for Mediterranean use because of open-registry perception and non-EU VAT issues."}
  ]$$::jsonb,
  '{"source":"Belize Yacht Registration Comprehensive Guide 2026","profile_version":"belize-guide-2026-v1"}'::jsonb,
  'bz','bz','/assets/flags/4x3/bz.svg','Flag of Belize','flag-icons@7.5.0','MIT',date '2026-07-27',true
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
 where flag_registry_id = (select id from public.flag_registries where code = 'belize')
   and confidence_level = 'high';

insert into public.flag_required_documents (flag_registry_id, registration_type, document_name, document_category, is_required, condition_text, confidence_level, sort_order)
select fr.id, d.registration_type, d.document_name, d.document_category, true, d.condition_text, 'high', d.sort_order
from public.flag_registries fr
cross join (
  values
    ('private','Proof of ownership','registration','Bill of Sale, Builder Certificate, MOA/delivery protocol or equivalent.',10),
    ('private','Belize shipping agent appointment','representative','Required for all registrations.',20),
    ('private','Deletion certificate or reliance letter','registration','Reliance letter can support provisional route.',30),
    ('private','Intended-use declaration','registration','Commercial or pleasure use declaration.',40),
    ('private','RO or surveyor details','technical','Required according to category.',50),
    ('private','Payment confirmation','finance','Registry/agent fees.',60),
    ('commercial','Commercial safety documentation','commercial','Required for 24 m+ and commercial yachts.',70)
) as d(registration_type, document_name, document_category, condition_text, sort_order)
where fr.code = 'belize';
