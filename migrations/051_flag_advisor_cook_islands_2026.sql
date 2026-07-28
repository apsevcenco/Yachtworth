-- Yachtworth Flag Advisor: Cook Islands comprehensive profile v1.

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
  'cook-islands','cook-islands','cook-islands','Cook Islands','Cook Islands','Cook Islands','open',
  'Open international registry / Maritime Cook Islands',false,true,true,'yes','yes',
  'Small Yacht Code applies below 24 m; Large Yacht Code applies from 24 m.',
  'Commercial yacht route generally uses the Large Yacht Code from 24 m with LY3 references.',
  'No public maximum identified.',
  'Code-dependent; standard commercial yacht framework generally up to 12 passengers unless certified otherwise.',
  'yes','Provisional certificate issued after approval/payment; exact term requires direct registry confirmation.',
  'Permanent registration commonly treated as 5-year validity subject to annual compliance and fees.',
  'No nationality restrictions. A qualified person/qualified ownership structure and KYC/AML review are required.',
  'Foreign companies, trusts and foundations are accepted subject to qualified ownership and due diligence.',
  'Registry-qualified ownership structure or authorised agent is required.',
  'Mortgage registration is available; tariff and workflow require confirmation.',
  'Radio licence required where radio equipment is fitted.',
  'Small Yacht Code below 24 m; Large Yacht Code/class or RO survey for 24 m+ and commercial yachts.',
  'Survey/technical verification depends on Small Yacht Code, Large Yacht Code and commercial status.',
  'Cook Islands Small Yacht Code / Large Yacht Code, with LY3 references for commercial yachts.',
  'Minimum safe manning proposal required for commercial yachts.',
  'Rapid provisional issuance after approval/payment; permanent registration depends on survey and document completion.',
  'Tax-neutral local environment for international structures, but non-EU flag means EU VAT/customs planning remains separate.',
  'No nationality restrictions for private yacht crew. Commercial crew require STCW, MLC and approved safe manning.',
  'Application; ownership documents; KYC/AML; deletion certificate; qualified ownership/agent appointment; technical specs; survey/class documents.',
  'No nationality restrictions; dedicated small and large yacht codes; dual-registration possibility; tax-neutral environment.',
  'No public fee schedule; moderate flag prestige; Pacific-focused market perception; commercial manning proposal adds administration.',
  '["ABS","BV","DNV","Lloyd''s Register","RINA"]'::jsonb,
  null,null,true,true,true,true,7,35,true,true,
  'No nationality restriction; qualified ownership and KYC/AML required.',
  'Any jurisdiction can be used subject to due diligence and qualified ownership requirements.',
  'Commercial yachts require STCW, MLC and approved minimum safe manning.',
  '0% local tax environment for international structures, but non-EU flag and EU VAT/customs must be planned separately.',
  'Moderate niche registry; useful for Pacific/dual-registration strategies.',
  '["Dedicated Small Yacht Code and Large Yacht Code","Dual-registration option","No nationality restrictions","Tax-neutral local environment","Mortgage registration available"]'::jsonb,
  '["No detailed public yacht fee schedule","Moderate prestige compared with top yacht flags","Pacific focus may be mismatched for Mediterranean use","Commercial manning proposal required"]'::jsonb,
  'https://www.maritimecookislands.com/','Maritime Cook Islands','https://www.maritimecookislands.com/','https://www.maritimecookislands.com/',
  'medium','verified_with_gaps','usable_with_warnings',76,'cook-islands-guide-2026-v1',current_date,current_date,
  $$[
    {"title":"Registry overview","body":"Maritime Cook Islands is an open international registry with no nationality restrictions, dedicated yacht codes and a notable dual-registration option."},
    {"title":"Yacht codes","rows":[
      {"code":"Small Yacht Code","scope":"Private yachts below 24 m"},
      {"code":"Large Yacht Code","scope":"Yachts 24 m and above"},
      {"code":"Commercial / LY3 references","scope":"Commercial yachts, safe manning and MLC/STCW compliance"}
    ]},
    {"title":"Fees","body":"Detailed public yacht fee schedules are not available in the reviewed material. Registry quotation or authorised agent pricing is required for reliable cost modelling."},
    {"title":"Advisor interpretation","body":"Cook Islands is flexible and tax-neutral, with dual registration as the standout feature. For a single Mediterranean charter flag it is usually less compelling than Madeira, Malta, Marshall or Cayman."}
  ]$$::jsonb,
  '{"source":"Cook Islands Yacht Registration Comprehensive Guide 2026","profile_version":"cook-islands-guide-2026-v1"}'::jsonb,
  'ck','ck','/assets/flags/4x3/ck.svg','Flag of the Cook Islands','flag-icons@7.5.0','MIT',date '2026-07-27',true
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
 where flag_registry_id = (select id from public.flag_registries where code = 'cook-islands')
   and confidence_level = 'high';

insert into public.flag_required_documents (flag_registry_id, registration_type, document_name, document_category, is_required, condition_text, confidence_level, sort_order)
select fr.id, d.registration_type, d.document_name, d.document_category, true, d.condition_text, 'high', d.sort_order
from public.flag_registries fr
cross join (
  values
    ('private','Application form','registration','MCI application form.',10),
    ('private','Proof of ownership','registration','Bill of Sale or Builder Certificate.',20),
    ('private','KYC / AML documents','eligibility','Beneficial-owner due diligence and source-of-funds support.',30),
    ('private','Deletion certificate','registration','Required where previously registered.',40),
    ('private','Qualified ownership / agent appointment','representative','Required for registration.',50),
    ('private','Technical specifications','technical','Yacht particulars and intended use declaration.',60),
    ('commercial','Small/Large Yacht Code compliance evidence','technical','Required according to size and use.',70)
) as d(registration_type, document_name, document_category, condition_text, sort_order)
where fr.code = 'cook-islands';
