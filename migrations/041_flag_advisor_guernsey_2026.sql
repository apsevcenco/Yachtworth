-- Yachtworth Flag Advisor: Guernsey comprehensive profile v1.
-- Public cards do not display source links; sources remain stored for audit.

alter table public.flag_registries
  add column if not exists advisor_sections jsonb not null default '[]'::jsonb;

with upsert_registry as (
  insert into public.flag_registries (
    code, slug, import_key, flag_name, country, country_or_territory,
    registry_type, registry_family, is_eu_flag,
    private_available, commercial_available,
    private_registration_status, commercial_registration_status,
    private_minimum_loa, commercial_minimum_loa,
    maximum_loa_gt_notes, passenger_limit_notes,
    provisional_registration_status, provisional_validity, permanent_validity,
    owner_eligibility, foreign_company_ownership, local_agent_requirement,
    mortgage_registration_status, radio_licence_requirement,
    classification_requirement, survey_inspection_requirement,
    commercial_yacht_code, minimum_safe_manning, indicative_processing_time,
    vat_tax_note, crew_note, required_documents_summary,
    objective_advantages, limitations_and_risks, accepted_class,
    registration_cost_eur, annual_fee_eur, mortgage_available, temporary_registration,
    permanent_registration, radio_license, processing_time_days_min, processing_time_days_max,
    survey_required, classification_required,
    owner_nationality_restrictions, company_restrictions, crew_restrictions,
    vat_notes, insurance_notes, advantages, disadvantages,
    official_website, official_registry_name, official_registry_url, primary_fee_url,
    confidence_level, coverage_status, data_quality_status, data_quality_score,
    source_version, last_updated, last_verified_at, advisor_sections, original_row, active
  )
  values (
    'guernsey','guernsey','guernsey','Guernsey','Guernsey','Guernsey',
    'commonwealth','Category 2 Red Ensign / Guernsey Ships Registry',false,
    true,true,'yes','partial',
    'Part I has no LOA minimum but has a 150 GT ceiling. SSR is available to ordinarily resident Guernsey owners.',
    'Commercial vessels can be registered up to 24 m loadline length and up to 150 GT, with full Small Commercial Vessel coding.',
    'Hard 150 GT ceiling for all Guernsey registrations. Vessels above 150 GT cannot use this flag.',
    'Standard commercial use is limited to up to 12 passengers under the Small Commercial Vessel framework.',
    'yes','Provisional registration is available; guide benchmark GBP 35 official / 3-month industry route.','Part I registration is valid for 10 years; SSR is valid for 5 years.',
    'Part I requires majority qualified ownership: 33 of 64 shares must be owned by British subjects or qualifying Crown Dependency / Overseas Territory companies. Foreign nationals may own up to 31 shares.',
    'Foreign ownership is possible only within the qualified-share structure. Company ownership requires appropriate Guernsey / Crown Dependency / Overseas Territory qualification.',
    'Representative/authorised officer arrangements apply for company-owned vessels and non-resident structures.',
    'Mortgage registration is available through the Part I title register. Fee benchmark GBP 105 per instrument; notice of intent GBP 35.',
    'Radio licence, call sign and MMSI are handled via UK OFCOM.',
    'Guernsey recognises ABS, BV, DNV, Lloyd''s Register and RINA. Survey organisations for vessels up to 24 m include RYA, YBDSA, IIMS and MECAL.',
    'Tonnage measurement survey is mandatory for Part I registration. Marking instructions and photographic evidence / inspection are required before certificate issue.',
    'Commercial yachts must comply with the Code of Practice for Small Commercial Vessels. No YET or PYLC route is available.',
    'Safe manning and STCW/MLC apply to commercial yachts according to the Small Commercial Vessel framework.',
    'Full registration can be processed in 5-7 days once complete. Provisional registration benchmark is around 2 days.',
    'Guernsey has 0% standard corporate income tax, 0% capital gains tax, 0% VAT, 0% withholding tax and no insurance premium tax. There is no annual tonnage tax.',
    'No crew nationality restrictions. Commercial yachts must meet manning and certification requirements.',
    'Name proposal; application to register; appointment of authorised officers; declaration of ownership; incorporation certificate if company-owned; Builder Certificate or Bill of Sale; deletion evidence; tonnage survey; marking evidence.',
    'Very low ongoing cost; no annual tonnage tax; Red Ensign Category 2 credibility; mortgage register; tax-neutral Guernsey environment; useful for private yachts below 150 GT.',
    '150 GT hard ceiling; no YET/PYLC; commercial use limited to 24 m loadline and full SCV coding; strict qualified ownership share requirement; unsuitable for most superyachts or regular charter operations.',
    '["ABS","BV","DNV","Lloyd''s Register","RINA"]'::jsonb,
    350, 0,
    true,true,true,true,
    5,7,
    true,true,
    'Qualified ownership is required: 33/64 shares must be British/Crown Dependency/Overseas Territory qualified. SSR requires ordinary Guernsey residence.',
    'Company ownership must satisfy qualified ownership and authorised officer requirements.',
    'No nationality restrictions, but commercial manning and STCW/MLC compliance apply.',
    'Non-EU Crown Dependency. No Guernsey VAT and Temporary Admission may be relevant, but EU VAT/customs treatment needs separate analysis.',
    'Good Red Ensign credibility for small private yachts; limited superyacht acceptance due to 150 GT ceiling.',
    '["No annual tonnage tax","Low 10-year renewal cost","Red Ensign Category 2 credibility","Mortgage register","Tax-neutral Guernsey environment","Good for private yachts below 150 GT"]'::jsonb,
    '["Hard 150 GT ceiling","No YET or PYLC route","Commercial use limited to 24 m loadline and SCV coding","Qualified ownership share restrictions","Not suitable for most superyachts"]'::jsonb,
    'https://www.gov.gg/shipsregistry',
    'Guernsey Ships Registry',
    'https://www.gov.gg/shipsregistry',
    'https://www.gov.gg/shipsregistry',
    'high','verified_with_gaps','production_ready',82,
    'guernsey-guide-2026-v1',current_date,current_date,
    $$[
      {"title":"Registry overview","body":"Guernsey is a Category 2 Red Ensign registry with a hard 150 GT ceiling. It is a low-cost, tax-neutral option for smaller private yachts, not a superyacht or broad charter flag."},
      {"title":"Owner eligibility","items":["Part I requires 33 of 64 shares in qualified ownership.","Foreign nationals may own up to 31 shares where the remaining shares are qualified.","SSR is restricted to ordinary Guernsey residents, generally 185 days or more in a 12-month period."]},
      {"title":"Registration routes","rows":[
        {"route":"Part I Full Registration","eligibility":"Qualified ownership","limit":"Up to 150 GT","validity":"10 years"},
        {"route":"Part III SSR","eligibility":"Ordinarily resident in Guernsey","limit":"Small vessels","validity":"5 years"},
        {"route":"Commercial vessels","eligibility":"Same as Part I","limit":"Up to 24 m loadline and 150 GT","validity":"10 years"}
      ]},
      {"title":"Fees","rows":[
        {"service":"First registration / re-registration / transfer in","fee":"GBP 350"},
        {"service":"Transfer of ownership","fee":"GBP 105"},
        {"service":"Mortgage registration / transfer / discharge","fee":"GBP 105"},
        {"service":"Certificate of Provisional Registration","fee":"GBP 35"},
        {"service":"Renewal every 10 years","fee":"GBP 105"},
        {"service":"SSR registration / renewal","fee":"GBP 70"},
        {"service":"Annual tonnage tax","fee":"GBP 0"}
      ]},
      {"title":"Commercial use","items":["Commercial use is limited to vessels up to 24 m loadline and 150 GT.","Full Small Commercial Vessel coding is required for charter activity.","There is no YET or PYLC programme, so private limited charter without conversion is not available."]},
      {"title":"Advisor interpretation","body":"Guernsey is excellent for small private yachts below 150 GT where minimal ongoing cost is the priority. It is not viable for larger yachts, most superyachts or flexible charter operations."}
    ]$$::jsonb,
    '{"source":"Guernsey Yacht Registration Comprehensive Guide 2026","profile_version":"guernsey-guide-2026-v1"}'::jsonb,
    true
  )
  on conflict (code) do update set
    slug = excluded.slug,
    import_key = excluded.import_key,
    flag_name = excluded.flag_name,
    country = excluded.country,
    country_or_territory = excluded.country_or_territory,
    registry_type = excluded.registry_type,
    registry_family = excluded.registry_family,
    is_eu_flag = excluded.is_eu_flag,
    private_available = excluded.private_available,
    commercial_available = excluded.commercial_available,
    private_registration_status = excluded.private_registration_status,
    commercial_registration_status = excluded.commercial_registration_status,
    private_minimum_loa = excluded.private_minimum_loa,
    commercial_minimum_loa = excluded.commercial_minimum_loa,
    maximum_loa_gt_notes = excluded.maximum_loa_gt_notes,
    passenger_limit_notes = excluded.passenger_limit_notes,
    provisional_registration_status = excluded.provisional_registration_status,
    provisional_validity = excluded.provisional_validity,
    permanent_validity = excluded.permanent_validity,
    owner_eligibility = excluded.owner_eligibility,
    foreign_company_ownership = excluded.foreign_company_ownership,
    local_agent_requirement = excluded.local_agent_requirement,
    mortgage_registration_status = excluded.mortgage_registration_status,
    radio_licence_requirement = excluded.radio_licence_requirement,
    classification_requirement = excluded.classification_requirement,
    survey_inspection_requirement = excluded.survey_inspection_requirement,
    commercial_yacht_code = excluded.commercial_yacht_code,
    minimum_safe_manning = excluded.minimum_safe_manning,
    indicative_processing_time = excluded.indicative_processing_time,
    vat_tax_note = excluded.vat_tax_note,
    crew_note = excluded.crew_note,
    required_documents_summary = excluded.required_documents_summary,
    objective_advantages = excluded.objective_advantages,
    limitations_and_risks = excluded.limitations_and_risks,
    accepted_class = excluded.accepted_class,
    registration_cost_eur = excluded.registration_cost_eur,
    annual_fee_eur = excluded.annual_fee_eur,
    mortgage_available = excluded.mortgage_available,
    temporary_registration = excluded.temporary_registration,
    permanent_registration = excluded.permanent_registration,
    radio_license = excluded.radio_license,
    processing_time_days_min = excluded.processing_time_days_min,
    processing_time_days_max = excluded.processing_time_days_max,
    survey_required = excluded.survey_required,
    classification_required = excluded.classification_required,
    owner_nationality_restrictions = excluded.owner_nationality_restrictions,
    company_restrictions = excluded.company_restrictions,
    crew_restrictions = excluded.crew_restrictions,
    vat_notes = excluded.vat_notes,
    insurance_notes = excluded.insurance_notes,
    advantages = excluded.advantages,
    disadvantages = excluded.disadvantages,
    official_website = excluded.official_website,
    official_registry_name = excluded.official_registry_name,
    official_registry_url = excluded.official_registry_url,
    primary_fee_url = excluded.primary_fee_url,
    confidence_level = excluded.confidence_level,
    coverage_status = excluded.coverage_status,
    data_quality_status = excluded.data_quality_status,
    data_quality_score = excluded.data_quality_score,
    source_version = excluded.source_version,
    last_updated = excluded.last_updated,
    last_verified_at = excluded.last_verified_at,
    advisor_sections = excluded.advisor_sections,
    original_row = excluded.original_row,
    active = true,
    updated_at = now()
  returning id
),
guernsey as (
  select id from upsert_registry
  union
  select id from public.flag_registries where code = 'guernsey'
),
source_upsert as (
  insert into public.flag_sources (
    flag_registry_id, topic, source_type, source_title, official_url,
    checked_at, effective_date, notes, is_official, is_active, source_version, import_key
  )
  select g.id, s.topic, s.source_type, s.source_title, s.official_url,
         current_date, s.effective_date, s.notes, s.is_official, true, 'guernsey-guide-2026-v1', s.import_key
  from guernsey g
  cross join (
    values
      ('registry_overview','official','Guernsey Ships Registry','https://www.gov.gg/shipsregistry',null::date,'Internal audit source for Guernsey registry facts.',true,'guernsey-2026-source-registry'),
      ('fees','official','Guernsey Registry of British Ships Fees','https://www.gov.gg/shipsregistry',null::date,'Internal audit source for Guernsey fee profile.',true,'guernsey-2026-source-fees')
  ) as s(topic, source_type, source_title, official_url, effective_date, notes, is_official, import_key)
  on conflict (import_key) do update set
    flag_registry_id = excluded.flag_registry_id,
    topic = excluded.topic,
    source_type = excluded.source_type,
    source_title = excluded.source_title,
    official_url = excluded.official_url,
    checked_at = excluded.checked_at,
    effective_date = excluded.effective_date,
    notes = excluded.notes,
    is_official = excluded.is_official,
    is_active = true,
    source_version = excluded.source_version,
    updated_at = now()
  returning id, import_key
)
insert into public.flag_fee_rules (
  flag_registry_id, registration_type, fee_component, amount, currency, formula_text,
  minimum_amount, loa_min, loa_max, gt_min, gt_max, vessel_category, validity_period,
  effective_from, notes, official_source_id, official_source_url, confidence_level,
  last_verified_at, is_active, source_version, import_key, original_row
)
select g.id, fee.registration_type, fee.fee_component, fee.amount, fee.currency, fee.formula_text,
       fee.minimum_amount, fee.loa_min, fee.loa_max, fee.gt_min, fee.gt_max, fee.vessel_category,
       fee.validity_period, fee.effective_from, fee.notes, su.id, 'https://www.gov.gg/shipsregistry',
       'high', current_date, true, 'guernsey-guide-2026-v1', fee.import_key,
       jsonb_build_object('profile_version','guernsey-guide-2026-v1','component',fee.fee_component)
from guernsey g
cross join (
  values
    ('private','First registration / re-registration / transfer in',350::numeric,'GBP',null::text,null::numeric,null::numeric,null::numeric,null::numeric,150::numeric,'Part I','10_years',null::date,'Official fee schedule benchmark.', 'guernsey-2026-fee-first-registration'),
    ('private','Transfer of ownership',105,'GBP',null,null,null,null,null,150,'Part I','one_off',null,'Bill of sale / transmission benchmark.', 'guernsey-2026-fee-transfer-ownership'),
    ('private','Mortgage registration / transfer / discharge',105,'GBP',null,null,null,null,null,150,'mortgage','one_off',null,'Per instrument benchmark.', 'guernsey-2026-fee-mortgage'),
    ('private','Certificate of Provisional Registration',35,'GBP',null,null,null,null,null,150,'provisional registration','3_months',null,'Official provisional certificate fee.', 'guernsey-2026-fee-provisional'),
    ('private','Part I renewal every 10 years',105,'GBP',null,null,null,null,null,150,'renewal','10_years',null,'10-year renewal fee.', 'guernsey-2026-fee-renewal'),
    ('private','SSR registration / renewal',70,'GBP',null,null,null,null,null,null,'SSR','5_years',null,'Resident-only SSR fee.', 'guernsey-2026-fee-ssr'),
    ('private','Annual tonnage tax',0,'GBP','No annual tonnage tax.',0,null,null,null,150,'annual tonnage tax','annual',null,'Key cost advantage.', 'guernsey-2026-fee-annual-tonnage-tax')
) as fee(registration_type, fee_component, amount, currency, formula_text, minimum_amount, loa_min, loa_max, gt_min, gt_max, vessel_category, validity_period, effective_from, notes, import_key)
left join source_upsert su on su.import_key = 'guernsey-2026-source-fees'
on conflict (import_key) do update set
  flag_registry_id = excluded.flag_registry_id,
  registration_type = excluded.registration_type,
  fee_component = excluded.fee_component,
  amount = excluded.amount,
  currency = excluded.currency,
  formula_text = excluded.formula_text,
  minimum_amount = excluded.minimum_amount,
  loa_min = excluded.loa_min,
  loa_max = excluded.loa_max,
  gt_min = excluded.gt_min,
  gt_max = excluded.gt_max,
  vessel_category = excluded.vessel_category,
  validity_period = excluded.validity_period,
  effective_from = excluded.effective_from,
  notes = excluded.notes,
  official_source_id = excluded.official_source_id,
  official_source_url = excluded.official_source_url,
  confidence_level = excluded.confidence_level,
  last_verified_at = excluded.last_verified_at,
  is_active = true,
  source_version = excluded.source_version,
  original_row = excluded.original_row,
  updated_at = now();

delete from public.flag_required_documents
 where flag_registry_id = (select id from public.flag_registries where code = 'guernsey')
   and confidence_level = 'high'
   and document_category in ('registration','ownership','technical','marking','commercial','mortgage','radio');

insert into public.flag_required_documents (
  flag_registry_id, registration_type, document_name, document_category,
  is_required, condition_text, confidence_level, sort_order
)
select fr.id, d.registration_type, d.document_name, d.document_category,
       true, d.condition_text, 'high', d.sort_order
from public.flag_registries fr
cross join (
  values
    ('private','Form GSR 342 Name Proposal','registration','Required for name approval.',10),
    ('private','Form GC190 Application to register','registration','Required for Part I registration.',20),
    ('private','Form GC193 Appointment of authorised officers','ownership','Required for company-owned vessels.',30),
    ('private','Form GC194 / GC195 Declaration of ownership','ownership','Required according to company or individual/joint ownership.',40),
    ('private','Certificate of incorporation','ownership','Required if corporately owned.',50),
    ('private','Builder Certificate or Bill of Sale','registration','Required as title evidence.',60),
    ('private','Deletion evidence','registration','Required where previously registered.',70),
    ('private','Tonnage measurement survey','technical','Mandatory for Part I registration.',80),
    ('private','Marking evidence / inspection','marking','Required before Certificate of British Registry issue.',90),
    ('commercial','Small Commercial Vessel coding evidence','commercial','Required for commercial charter use.',100),
    ('commercial','Safe manning / safety certificates','commercial','Required for commercial operation.',110),
    ('private','Mortgage instrument / notice of intent','mortgage','Required where mortgage is registered.',120),
    ('private','Radio licence / MMSI documents','radio','Required through UK OFCOM route.',130)
) as d(registration_type, document_name, document_category, condition_text, sort_order)
where fr.code = 'guernsey';
