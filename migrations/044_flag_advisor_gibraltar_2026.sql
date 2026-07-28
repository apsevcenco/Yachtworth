-- Yachtworth Flag Advisor: Gibraltar comprehensive profile v1.
-- Public cards do not display source links; sources remain stored for audit.

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
  'gibraltar','gibraltar','gibraltar','Gibraltar','Gibraltar','Gibraltar','commonwealth',
  'Category 1 Red Ensign / Gibraltar Maritime Administration',false,true,true,
  'yes','yes','No universal full-register minimum; SSR below 24 m for eligible Gibraltar residents.',
  'Commercial routes exist below 24 m under Small Commercial Vessel Code and 24 m+ under LY3/REG.',
  'Category 1 Red Ensign register; no public yacht maximum. Tariff bands include 1,600 GT+.',
  'Standard commercial yacht passenger limits are code-dependent; Passenger Yacht Code is available case by case.',
  'yes','Provisional registration, vessel under construction and bareboat/parallel registration routes are available.',
  'Certificate of British Registry issued after documents, marking and fees; renewal/annual fees apply.',
  'British and EU owners can hold personally. Non-EU citizens generally hold through UK Ltd or Gibraltar Ltd. Residence in Gibraltar/EU is not required.',
  'UK or Gibraltar company route is standard for non-EU owners. Gibraltar companies are accepted.',
  'Representative Person / Registered Agent is mandatory for non-resident owners and optional for resident owners.',
  'Mortgage registration is available under UK Merchant Shipping Act principles. Priority by registration date/time.',
  'Radio licensing via UK OFCOM; call sign and MMSI assigned.',
  'Commercial and large yachts require applicable LY3/REG, passenger yacht or SCV compliance; major IACS class accepted.',
  'Tonnage measurement is required; commercial coding/survey arranged separately. Vessels over 20 years face additional scrutiny.',
  'Small Commercial Vessel Code below 24 m; LY3/REG for 24 m+; Passenger Yacht Code where relevant.',
  'Safe Manning Document issued by GMA by tonnage, area and programme. STCW, MLC and ISM/ISPS apply by use/GT.',
  'Fast processing; 24-hour turnaround is advertised where requirements are met.',
  'Gibraltar has 0% VAT and 0% capital gains tax. It is outside the EU VAT area; EU VAT/customs treatment and Temporary Admission require separate advice.',
  'No nationality restrictions for private yacht crew. Commercial yachts require STCW/MLC/safe manning compliance.',
  'Application forms; proof of ownership; tonnage measurement; deletion certificate; representative appointment; category compliance evidence; Carving and Marking Note.',
  'Category 1 Red Ensign; Mediterranean location; duty-free fuel/provisioning; strong mortgage register; low initial fees; English-law framework.',
  'Non-EU VAT/customs planning required; Annual Tonnage Tax can be material; non-EU owners need UK/Gibraltar company; vessels over 20 years face scrutiny.',
  '["ABS","BV","DNV","Lloyd''s Register","RINA","ClassNK"]'::jsonb,
  599,2000,true,true,true,true,1,2,true,true,
  'British/EU personal ownership; non-EU owners normally use UK Ltd or Gibraltar Ltd.',
  'UK Ltd or Gibraltar Ltd is standard for non-EU owners; Representative Person is mandatory for non-residents.',
  'No private crew nationality restriction; commercial rules apply by yacht profile.',
  'Non-EU flag; 0% Gibraltar VAT, but EU VAT/customs and Temporary Admission remain separate.',
  'Excellent Category 1 Red Ensign and Mediterranean acceptance.',
  '["Category 1 Red Ensign","Mediterranean provisioning hub","0% Gibraltar VAT","Duty-free fuel and supplies","Mortgage register","Low initial registry fees","Bareboat and under-construction routes"]'::jsonb,
  '["Annual Tonnage Tax can dominate costs","Non-EU VAT/customs planning required","Non-EU owners need UK/Gibraltar company","Vessels over 20 years face extra scrutiny"]'::jsonb,
  'https://www.gibraltarship.com/','Gibraltar Maritime Administration','https://www.gibraltarship.com/','https://www.gibraltarship.com/',
  'high','verified','production_ready',91,'gibraltar-guide-2026-v1',current_date,current_date,
  $$[
    {"title":"Registry overview","body":"Gibraltar is a Category 1 Red Ensign registry at the entrance to the Mediterranean. It combines Red Ensign recognition, English-law principles and a duty-free provisioning/fuel environment."},
    {"title":"Owner eligibility","items":["British and EU owners can own personally.","Non-EU owners normally use a UK Ltd or Gibraltar Ltd.","Non-resident owners must appoint a Representative Person / Registered Agent."]},
    {"title":"Fees","rows":[
      {"category":"Under 24 m","initial":"GBP 247","annual":"GBP 28"},
      {"category":"Pleasure >24 m up to 1,599 GT","initial":"GBP 436","annual":"GBP 78"},
      {"category":"Commercial >24 m up to 1,599 GT","initial":"GBP 599","annual":"GBP 121"},
      {"category":"Annual Tonnage Tax up to 3,000 GT","initial":"-","annual":"GBP 2,000"},
      {"category":"Mortgage recording","initial":"GBP 84-219","annual":"-"}
    ]},
    {"title":"Advisor interpretation","body":"Gibraltar is a strong Mediterranean Red Ensign alternative to Cayman and Isle of Man. It is attractive for owners who value location, English administration and low initial fees, but ATT must be modelled for larger yachts."}
  ]$$::jsonb,
  '{"source":"Gibraltar Yacht Registration Comprehensive Guide 2026","profile_version":"gibraltar-guide-2026-v1"}'::jsonb,
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
 where flag_registry_id = (select id from public.flag_registries where code = 'gibraltar')
   and confidence_level = 'high';

insert into public.flag_required_documents (flag_registry_id, registration_type, document_name, document_category, is_required, condition_text, confidence_level, sort_order)
select fr.id, d.registration_type, d.document_name, d.document_category, true, d.condition_text, 'high', d.sort_order
from public.flag_registries fr
cross join (
  values
    ('private','Proof of ownership','registration','Bill of Sale or Builder Certificate.',10),
    ('private','Tonnage measurement data','technical','Required for registration.',20),
    ('private','Deletion certificate','registration','Required where previously registered.',30),
    ('private','Representative Person appointment','representative','Required for non-resident owners.',40),
    ('commercial','Commercial category compliance evidence','commercial','SCV, LY3/REG or Passenger Yacht Code as applicable.',50),
    ('private','Carving and Marking Note','marking','Must be completed and returned.',60),
    ('private','Mortgage instrument','mortgage','Required where mortgage is registered.',70)
) as d(registration_type, document_name, document_category, condition_text, sort_order)
where fr.code = 'gibraltar';
