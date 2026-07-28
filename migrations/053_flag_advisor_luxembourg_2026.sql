-- Yachtworth Flag Advisor: Luxembourg comprehensive profile v1.

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
  'luxembourg','luxembourg','luxembourg','Luxembourg','Luxembourg','Luxembourg','eu',
  'EU national maritime registry / Luxembourg Maritime Administration',true,true,true,'yes','yes',
  'Pleasure craft register is reserved to Luxembourg residents, natural or legal persons.',
  'Commercial register requires EU ownership and significant management substance in Luxembourg.',
  'No public yacht maximum identified.',
  'Regime-dependent; commercial operations follow EU/international maritime rules.',
  'case_dependent','No standard yacht provisional route confirmed; case-by-case with the Maritime Administration.',
  'Subject to registration, inspections and administrative obligations.',
  'Pleasure craft require Luxembourg residence. Commercial registration requires EU ownership and Luxembourg management substance.',
  'Non-EU owners must use a qualifying Luxembourg/EU structure and satisfy substance/management requirements.',
  'Luxembourg residence or management substance is a core eligibility requirement, not just an agent formality.',
  'Mortgage registration is available through the maritime registration framework; yacht-specific workflow requires confirmation.',
  'Radio licence required where radio equipment is fitted.',
  'Commercial vessels require class/technical certification. Pleasure requirements require direct verification.',
  'Commercial ships are subject to annual inspection/oversight; yacht-specific pleasure inspection terms require confirmation.',
  'Luxembourg/EU/international maritime rules. No dedicated yacht code was identified.',
  'Safe Manning Document required for commercial operation.',
  'Authority and establishment dependent; not publicly specified.',
  'Full EU flag. Luxembourg VAT is 17%; corporate tax around 24.94%; wealth/substance costs may apply.',
  'Commercial operation triggers EU/Luxembourg labour and social security exposure.',
  'Ownership documents; residence/entity evidence; management substance evidence; tonnage/class/survey documents; deletion certificate; radio/commercial certificates.',
  'Full EU flag; respected legal framework; mortgage framework; strong commercial shipping reputation.',
  'Major residence/substance barrier; high tax environment; no yacht-focused code; opaque yacht fees; not cost-competitive.',
  '["DNV","Lloyd''s Register","BV","RINA","ABS"]'::jsonb,
  null,null,true,false,true,true,30,90,true,true,
  'Pleasure craft are reserved to Luxembourg residents; commercial registration requires EU ownership and Luxembourg management substance.',
  'Non-EU/company ownership requires qualifying EU/Luxembourg structure and substance.',
  'Commercial vessels must comply with EU/Luxembourg labour, STCW and MLC obligations.',
  '17% VAT and high corporate tax environment; not a tax optimisation flag.',
  'Strong EU legal reputation but little yacht-specific advantage.',
  '["Full EU flag","Strong legal framework","Mortgage framework","Good commercial shipping reputation"]'::jsonb,
  '["Pleasure craft reserved to Luxembourg residents","Commercial requires Luxembourg management substance","High tax burden","No dedicated yacht code","Opaque yacht fee schedule"]'::jsonb,
  'https://ma.gouvernement.lu/','Luxembourg Maritime Administration','https://ma.gouvernement.lu/','https://ma.gouvernement.lu/',
  'medium','verified_with_gaps','research_required',62,'luxembourg-guide-2026-v1',current_date,current_date,
  $$[
    {"title":"Registry overview","body":"Luxembourg is a full EU flag with a strong commercial-shipping legal framework, but it is not a yacht-focused open registry."},
    {"title":"Eligibility barrier","rows":[
      {"route":"Pleasure craft","requirement":"Luxembourg resident natural or legal person"},
      {"route":"Commercial register","requirement":"EU ownership plus significant management substance in Luxembourg"},
      {"route":"Non-EU owners","requirement":"Qualifying Luxembourg/EU structure and substance"}
    ]},
    {"title":"Tax and cost profile","body":"Luxembourg has 17% VAT and a high corporate tax environment. Public yacht-specific fee detail is limited, and substance requirements add cost."},
    {"title":"Advisor interpretation","body":"Luxembourg should usually be filtered out unless the owner already has Luxembourg residence/substance and specifically wants a Luxembourg/EU legal framework."}
  ]$$::jsonb,
  '{"source":"Luxembourg Yacht Registration Comprehensive Guide 2026","profile_version":"luxembourg-guide-2026-v1"}'::jsonb,
  'lu','lu','/assets/flags/4x3/lu.svg','Flag of Luxembourg','flag-icons@7.5.0','MIT',date '2026-07-27',true
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
 where flag_registry_id = (select id from public.flag_registries where code = 'luxembourg')
   and confidence_level = 'high';

insert into public.flag_required_documents (flag_registry_id, registration_type, document_name, document_category, is_required, condition_text, confidence_level, sort_order)
select fr.id, d.registration_type, d.document_name, d.document_category, true, d.condition_text, 'high', d.sort_order
from public.flag_registries fr
cross join (
  values
    ('private','Proof of ownership','registration','Bill of Sale or Builder Certificate.',10),
    ('private','Luxembourg residence/entity evidence','eligibility','Core requirement for pleasure craft.',20),
    ('commercial','EU ownership and Luxembourg management evidence','eligibility','Core requirement for commercial register.',30),
    ('private','Tonnage/class/survey documents','technical','Required according to route.',40),
    ('private','Deletion certificate','registration','Required where previously registered.',50),
    ('private','Radio documents','radio','Required where radio equipment is fitted.',60),
    ('commercial','Commercial certificates','commercial','Required for commercial operation.',70)
) as d(registration_type, document_name, document_category, condition_text, sort_order)
where fr.code = 'luxembourg';
