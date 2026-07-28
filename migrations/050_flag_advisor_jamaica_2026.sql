-- Yachtworth Flag Advisor: Jamaica comprehensive profile v1.

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
  'jamaica','jamaica','jamaica','Jamaica','Jamaica','Jamaica','open',
  'Open/international-capable national registry / Maritime Authority of Jamaica',false,true,true,'yes','yes',
  'No universal minimum identified for private yachts.',
  'No universal minimum identified; commercial compliance applies by size and service.',
  'No public maximum identified. Passenger yacht treatment is case-dependent.',
  'Standard yacht limits apply; passenger yachts and vessels carrying more than 12 passengers require case-specific review.',
  'yes','Provisional route is available but exact term requires direct MAJ confirmation.',
  'Certificate of Registry commonly treated as 5-year validity subject to annual compliance.',
  'International owners and entities are accepted subject to Jamaican registry law, due diligence and representation where required.',
  'Foreign companies are accepted subject to qualification and representative requirements.',
  'Resident/local representative is case-dependent and should be confirmed for each ownership structure.',
  'Mortgage registration is available through the ship registry framework; yacht-specific workflow requires registry confirmation.',
  'Radio licence is mandatory for vessels with radio equipment.',
  'Commercial and larger yachts use recognised organisations and applicable safety codes.',
  'Pre-registration survey is mandatory for all vessels; periodic inspection depends on use and size.',
  'Jamaican maritime/yacht safety requirements plus SOLAS, MARPOL, STCW and MLC 2006 where applicable.',
  'Safe Manning Document is required for commercial operation.',
  'Not publicly specified; agent-assisted registrations are commonly expected around 2-4 weeks after complete documents.',
  'Non-EU flag. Jamaica has no VAT regime, but EU VAT/customs treatment requires separate analysis.',
  'No nationality restrictions for private yacht crew. Commercial crew must meet STCW/MLC and Jamaican safe manning requirements.',
  'Application form; Bill of Sale or Builder Certificate; tonnage/technical documentation; deletion certificate; radio list; safety declaration; pre-registration survey.',
  'English-language registry; flexible private/private-charter/commercial categories; no strict nationality barrier; Caribbean operational relevance.',
  'Opaque public fees; mandatory pre-registration survey; moderate flag prestige; private-charter scope not fully public; weaker Mediterranean fit.',
  '["ABS","BV","DNV","Lloyd''s Register","RINA"]'::jsonb,
  null,null,true,true,true,true,14,28,true,true,
  'No strict nationality barrier, but legitimate interest, KYC and representative requirements may apply.',
  'Foreign company ownership is accepted subject to qualification/representative requirements.',
  'Commercial yachts require STCW, MLC 2006 and safe manning compliance.',
  '0% local VAT, but non-EU flag means EU VAT/customs and Temporary Admission planning are separate.',
  'Moderate niche registry; accepted internationally but less prestigious than Red Ensign/top open registries.',
  '["English-language process","Flexible private-charter category","No strict nationality barrier","Mortgage registration available","Caribbean-focused operations"]'::jsonb,
  '["No public yacht fee schedule","Pre-registration survey mandatory for all vessels","Moderate flag prestige","Private-charter limitations require confirmation","Geographic mismatch for Mediterranean-only use"]'::jsonb,
  'https://www.maritimejamaica.com/','Maritime Authority of Jamaica','https://www.maritimejamaica.com/','https://www.maritimejamaica.com/',
  'medium','partial','usable_with_warnings',72,'jamaica-guide-2026-v1',current_date,current_date,
  $$[
    {"title":"Registry overview","body":"Jamaica is an English-language open/international-capable national registry administered by the Maritime Authority of Jamaica. It supports private, private-charter and commercial yacht categories."},
    {"title":"Operational categories","rows":[
      {"category":"Private","use":"Personal use only"},
      {"category":"Private-charter","use":"Limited charter category; exact scope requires MAJ confirmation"},
      {"category":"Commercial","use":"Full commercial compliance, safe manning and MLC/STCW where applicable"}
    ]},
    {"title":"Fees","body":"No detailed public yacht fee schedule is available. Official MAJ quotation or agent pricing is required before cost modelling. Industry package indications are around USD 3,000-6,000 with annual maintenance around USD 500-1,500."},
    {"title":"Advisor interpretation","body":"Jamaica can work for Caribbean-oriented owners who want English-language administration and flexibility. It is usually weaker for Mediterranean charter than Malta, Madeira, Cayman or Marshall because costs are opaque and survey is mandatory."}
  ]$$::jsonb,
  '{"source":"Jamaica Yacht Registration Comprehensive Guide 2026","profile_version":"jamaica-guide-2026-v1"}'::jsonb,
  'jm','jm','/assets/flags/4x3/jm.svg','Flag of Jamaica','flag-icons@7.5.0','MIT',date '2026-07-27',true
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
 where flag_registry_id = (select id from public.flag_registries where code = 'jamaica')
   and confidence_level = 'high';

insert into public.flag_required_documents (flag_registry_id, registration_type, document_name, document_category, is_required, condition_text, confidence_level, sort_order)
select fr.id, d.registration_type, d.document_name, d.document_category, true, d.condition_text, 'high', d.sort_order
from public.flag_registries fr
cross join (
  values
    ('private','Application form','registration','MAJ application form.',10),
    ('private','Proof of ownership','registration','Bill of Sale or Builder Certificate.',20),
    ('private','Deletion certificate','registration','Required where previously registered.',30),
    ('private','Technical and tonnage documents','technical','Tonnage and technical particulars.',40),
    ('private','Radio equipment list','radio','Required where radio equipment is fitted.',50),
    ('private','Pre-registration survey','technical','Mandatory for all vessels.',60),
    ('commercial','Commercial safety certificates','commercial','Required for commercial/private-charter use as applicable.',70)
) as d(registration_type, document_name, document_category, condition_text, sort_order)
where fr.code = 'jamaica';
