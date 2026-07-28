-- Yachtworth Flag Advisor: Panama comprehensive profile v1.

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
  'panama','panama','panama','Panama','Panama','Panama','open',
  'Open registry / Panama Maritime Authority',false,true,true,'yes','yes',
  'No universal minimum identified for private pleasure yachts.',
  'No universal minimum identified; commercial yachts require commercial certification.',
  'No public maximum identified. Panama is the world''s largest ship registry.',
  'Passenger yachts are case-dependent and require additional safety requirements.',
  'yes','Provisional and new-construction routes are available; terms depend on vessel category.',
  'Private pleasure yacht registration commonly uses 2-year tax cycle; commercial yacht registration commonly uses 5-year cycle.',
  'Any nationality, individual or company can register. No local company formation required.',
  'Any-jurisdiction companies can register; Panamanian owners may receive lower government fees.',
  'Panamanian legal representative / resident agent is mandatory for all registrations.',
  'Mortgage registration is available and globally recognised.',
  'Radio licence required where radio equipment is fitted.',
  'Commercial and passenger yachts require certification. Private yachts under 20 years old do not require survey under the guide.',
  'Only vessels 20 years old or more require inspection by an authorised Panama inspector for private route.',
  'Panama maritime/commercial certification requirements; commercial/passenger routes are case-dependent.',
  'Commercial yachts require applicable safe manning and certification.',
  'Fast open-registry process when documents and resident agent are ready.',
  'Non-EU flag. Panama registration does not create EU VAT-paid status; Temporary Admission/import planning required for EU use.',
  'No nationality restrictions highlighted; commercial crew must meet international certification requirements.',
  'Application; ownership evidence; technical particulars; deletion certificate where applicable; radio details; legal representative appointment; fee payment.',
  'Most open registry globally; no nationality/local company requirement; low barriers; major IMO/Paris/Tokyo MoU standing; private yachts under 20 years avoid survey.',
  'Non-EU VAT/customs planning required; open-registry perception; legal representative required; commercial/passenger details case-dependent.',
  '["ABS","BV","DNV","Lloyd''s Register","RINA"]'::jsonb,
  null,null,true,true,true,true,3,14,false,true,
  'No nationality restrictions whatsoever.',
  'No Panamanian company required; any-jurisdiction company can register.',
  'Commercial certification requirements apply by category.',
  'Non-EU flag; EU VAT/customs treatment requires separate advice.',
  'Very large global registry with strong accessibility; yacht prestige below premium Red Ensign/open yacht flags.',
  '["No nationality restrictions","No local company requirement","Private yachts under 20 years do not require survey","Largest ship registry globally","Mortgage registration available","Fast and accessible"]'::jsonb,
  '["Non-EU VAT/customs planning required","Panamanian legal representative mandatory","Open-registry perception","Commercial/passenger requirements need case review"]'::jsonb,
  'https://panamashipregistry.com/','Panama Maritime Authority','https://panamashipregistry.com/','https://panamashipregistry.com/',
  'high','verified','production_ready',84,'panama-guide-2026-v1',current_date,current_date,
  $$[
    {"title":"Registry overview","body":"Panama is the largest open ship registry in the world and one of the most accessible yacht registration routes, with no nationality or local-company requirement."},
    {"title":"Eligibility","rows":[
      {"owner":"Any nationality","status":"Accepted"},
      {"owner":"Individuals","status":"Direct personal ownership permitted"},
      {"owner":"Companies","status":"Any jurisdiction accepted"},
      {"requirement":"Panamanian legal representative","status":"Mandatory"}
    ]},
    {"title":"Registration types","rows":[
      {"type":"Private pleasure yacht","validity":"2-year tax cycle","note":"No survey required up to 20 years old under the guide"},
      {"type":"Commercial yacht","validity":"5 years","note":"Commercial certification required"},
      {"type":"New construction","validity":"5 years","note":"50% reduction on registration, annual taxes and inspection fees for first 3 years"},
      {"type":"Fleet registration","validity":"Standard","note":"Bulk discounts reported at 20%, 35% and 60% tiers"}
    ]},
    {"title":"Advisor interpretation","body":"Panama is excellent for fast, simple, low-barrier non-EU registration, especially private yachts under 20 years old. It is not an EU VAT solution and should be ranked below premium yacht flags when banking/prestige is the primary goal."}
  ]$$::jsonb,
  '{"source":"Panama Yacht Registration Comprehensive Guide 2026","profile_version":"panama-guide-2026-v1"}'::jsonb,
  'pa','pa','/assets/flags/4x3/pa.svg','Flag of Panama','flag-icons@7.5.0','MIT',date '2026-07-27',true
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
 where flag_registry_id = (select id from public.flag_registries where code = 'panama')
   and confidence_level = 'high';

insert into public.flag_required_documents (flag_registry_id, registration_type, document_name, document_category, is_required, condition_text, confidence_level, sort_order)
select fr.id, d.registration_type, d.document_name, d.document_category, true, d.condition_text, 'high', d.sort_order
from public.flag_registries fr
cross join (
  values
    ('private','Application form','registration','Panama registration application.',10),
    ('private','Proof of ownership','registration','Bill of Sale or Builder Certificate.',20),
    ('private','Technical particulars','technical','Vessel particulars and tonnage data.',30),
    ('private','Deletion certificate','registration','Required where previously registered.',40),
    ('private','Radio details','radio','Call sign/MMSI and equipment details.',50),
    ('private','Panamanian legal representative appointment','representative','Mandatory for all registrations.',60),
    ('commercial','Commercial certification evidence','commercial','Required for commercial/passenger yacht routes.',70)
) as d(registration_type, document_name, document_category, condition_text, sort_order)
where fr.code = 'panama';
