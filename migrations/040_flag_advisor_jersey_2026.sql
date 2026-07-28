-- Yachtworth Flag Advisor: Jersey comprehensive profile v1.
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
    'jersey','jersey','jersey','Jersey','Jersey','Jersey',
    'commonwealth','Category 2 Red Ensign / Jersey Ships Registry',false,
    true,true,'yes','yes',
    'SSR is available below 24 m only to Jersey residents. Full registration is preferred above 24 m but vessels below 24 m may be accepted depending on route.',
    'Commercial operation is available under SCV below 24 m and LY2/LY3 at 24 m and above, subject to the 399 GT ceiling.',
    'Category 2 Red Ensign register: hard ceiling of 399 GT for pleasure and commercial vessels.',
    'Standard commercial route supports up to 12 passengers; Passenger Yacht Code can support up to 36 passengers subject to class/coding.',
    'yes','3-month provisional registration can be obtained using scanned copies once tonnage survey is complete.','Full registration is valid for 10 years.',
    'Open to British, EU/EEA, Commonwealth, British Overseas Territories and approved-country owners. Non-approved owners may register through an entitled-country company or structure.',
    'Foreign company ownership is available through a qualifying entity in an approved country. SSR is resident-only and not for company ownership.',
    'Resident representative person is mandatory for non-resident owners or owners without an established Jersey business.',
    'Mortgage registration is available through the full register using UK MCA mortgage forms. Priority is based on registration date.',
    'Radio licence, call sign and MMSI are issued through UK OFCOM for Jersey-registered yachts.',
    'Class is required for 24 m+ commercial and passenger yachts. Jersey accepts approved IACS societies.',
    'Tonnage survey is mandatory for all full registrations and required before provisional/full certificate issue. Age/PSC scrutiny applies.',
    'SCV Code below 24 m; LY2/LY3 for 24 m+ commercial yachts; Passenger Yacht Code for up to 36 passengers. No YET route.',
    'Safe Manning Document is issued based on tonnage, operating area and programme. STCW and MLC apply to commercial yachts.',
    'Full registration typically takes 5-6 weeks if documentation and approvals are complete.',
    'Jersey has 0% standard corporate tax for most companies, 0% capital gains tax, 0% VAT and 0% withholding tax. It is non-EU, so EU VAT/customs treatment remains separate.',
    'No nationality restrictions for private yacht crew. STCW/MLC and safe manning apply to commercial operation.',
    'Name choices; title documents; tonnage survey; deletion certificate where applicable; sanctions letter; commercial certification where applicable; owner due diligence; originals for full registration.',
    'Low-cost Red Ensign option below 399 GT; strong finance-centre infrastructure; 10-year full registration; provisional registration; mortgage register; tax-neutral Jersey environment.',
    '399 GT hard ceiling; no YET programme; full commercial conversion required for charter; full registration can take 5-6 weeks; strict age/PSC scrutiny; non-EU VAT/customs planning required.',
    '["ABS","BV","DNV","Lloyd''s Register","RINA"]'::jsonb,
    3000, 500,
    true,true,true,true,
    35,42,
    true,true,
    'Approved-country ownership applies. Non-approved owners need an appropriate entity in an entitled country.',
    'Qualifying entity in an approved country can hold title. Representative person is required for non-resident owners.',
    'No private crew nationality restrictions; commercial yachts require STCW/MLC/safe manning compliance.',
    'Non-EU Crown Dependency. Jersey is VAT-free but EU VAT/customs and Temporary Admission require separate analysis.',
    'Good Red Ensign credibility and insurer acceptance for sub-399 GT yachts, but Category 2 status limits superyacht appeal.',
    '["Red Ensign Category 2","Tax-neutral Jersey environment","Mortgage register","3-month provisional registration","10-year full registration","Good for sub-399 GT yachts"]'::jsonb,
    '["399 GT hard ceiling","No YET limited charter route","Full commercial coding required for charter","5-6 week full registration timeline","Strict age and PSC scrutiny","Non-EU VAT/customs planning required"]'::jsonb,
    'https://www.ports.je/shipsregistry/',
    'Jersey Ships Registry',
    'https://www.ports.je/shipsregistry/',
    'https://www.ports.je/shipsregistry/',
    'high','verified_with_gaps','production_ready',86,
    'jersey-guide-2026-v1',current_date,current_date,
    $$[
      {"title":"Registry overview","body":"Jersey is a Category 2 Red Ensign registry and can register pleasure and commercial vessels up to 399 GT. It is a strong finance-centre jurisdiction but is not suitable for yachts above the GT ceiling."},
      {"title":"Owner eligibility","items":["Open to British, EU/EEA, Commonwealth, British Overseas Territories and approved-country owners.","Non-approved owners can use an entitled-country company or structure.","Resident representative person is mandatory for non-resident owners."]},
      {"title":"Size and use limits","rows":[
        {"route":"SSR","eligibility":"Jersey residents only","limit":"Below 24 m","validity":"5 years"},
        {"route":"Full registration","eligibility":"International approved owners","limit":"Up to 399 GT","validity":"10 years"},
        {"route":"Commercial SCV","eligibility":"Commercial coding required","limit":"Below 24 m / up to 399 GT","validity":"10 years"},
        {"route":"Commercial LY2/LY3","eligibility":"Class/coding required","limit":"24 m+ / up to 399 GT","validity":"10 years"}
      ]},
      {"title":"Commercial use","items":["Commercial yachts must be coded as SCV below 24 m or LY2/LY3 at 24 m and above.","Passenger Yacht Code can support up to 36 passengers where classed and coded.","Jersey does not currently offer a YET programme, so private limited charter without full conversion is not available."]},
      {"title":"Fees","rows":[
        {"service":"SSR registration / renewal","fee":"GBP 70"},
        {"service":"SSR fast track","fee":"GBP 145"},
        {"service":"Full registration package benchmark","fee":"From GBP 3,000"},
        {"service":"Representative person individual/joint","fee":"GBP 250/year"},
        {"service":"Representative person company","fee":"GBP 500/year"}
      ]},
      {"title":"Advisor interpretation","body":"Jersey is credible and cost-effective for smaller yachts below 399 GT where Red Ensign credibility and Jersey finance infrastructure matter. It is not suitable above 399 GT and is less flexible for charter than Isle of Man, Cayman or Marshall because there is no YET route."}
    ]$$::jsonb,
    '{"source":"Jersey Yacht Registration Comprehensive Guide 2026","profile_version":"jersey-guide-2026-v1"}'::jsonb,
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
jersey as (
  select id from upsert_registry
  union
  select id from public.flag_registries where code = 'jersey'
),
source_upsert as (
  insert into public.flag_sources (
    flag_registry_id, topic, source_type, source_title, official_url,
    checked_at, effective_date, notes, is_official, is_active, source_version, import_key
  )
  select j.id, s.topic, s.source_type, s.source_title, s.official_url,
         current_date, s.effective_date, s.notes, s.is_official, true, 'jersey-guide-2026-v1', s.import_key
  from jersey j
  cross join (
    values
      ('registry_overview','official','Jersey Ships Registry','https://www.ports.je/shipsregistry/',null::date,'Internal audit source for Jersey registry facts.',true,'jersey-2026-source-registry'),
      ('fees','industry','Jersey registration fee benchmarks','https://www.ports.je/shipsregistry/',null::date,'Internal audit source for Jersey fee benchmarks from supplied guide.',false,'jersey-2026-source-fees')
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
select j.id, fee.registration_type, fee.fee_component, fee.amount, fee.currency, fee.formula_text,
       fee.minimum_amount, fee.loa_min, fee.loa_max, fee.gt_min, fee.gt_max, fee.vessel_category,
       fee.validity_period, fee.effective_from, fee.notes, su.id, 'https://www.ports.je/shipsregistry/',
       'high', current_date, true, 'jersey-guide-2026-v1', fee.import_key,
       jsonb_build_object('profile_version','jersey-guide-2026-v1','component',fee.fee_component)
from jersey j
cross join (
  values
    ('private','SSR registration / renewal',70::numeric,'GBP',null::text,null::numeric,null::numeric,23.999::numeric,null::numeric,null::numeric,'SSR','5_years',null::date,'Jersey residents only.', 'jersey-2026-fee-ssr'),
    ('private','SSR fast track',145,'GBP',null,null,null,23.999,null,null,'SSR','expedited',null,'Expedited SSR processing.', 'jersey-2026-fee-ssr-fast-track'),
    ('private','Full registration package benchmark',3000,'GBP','From GBP 3,000.',null,24,null,null,399,'full registration','10_years',null,'Industry benchmark from supplied guide.', 'jersey-2026-fee-full-package'),
    ('private','Representative person individual/joint',250,'GBP',null,null,null,null,null,399,'representative person','annual',null,'Industry benchmark.', 'jersey-2026-fee-representative-individual'),
    ('private','Representative person company',500,'GBP',null,null,null,null,null,399,'representative person','annual',null,'Industry benchmark.', 'jersey-2026-fee-representative-company')
) as fee(registration_type, fee_component, amount, currency, formula_text, minimum_amount, loa_min, loa_max, gt_min, gt_max, vessel_category, validity_period, effective_from, notes, import_key)
left join source_upsert su on su.import_key = 'jersey-2026-source-fees'
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
 where flag_registry_id = (select id from public.flag_registries where code = 'jersey')
   and confidence_level = 'high'
   and document_category in ('registration','technical','due_diligence','representative','commercial','mortgage','sanctions');

insert into public.flag_required_documents (
  flag_registry_id, registration_type, document_name, document_category,
  is_required, condition_text, confidence_level, sort_order
)
select fr.id, d.registration_type, d.document_name, d.document_category,
       true, d.condition_text, 'high', d.sort_order
from public.flag_registries fr
cross join (
  values
    ('private','Three preferred vessel names','registration','Required for name reservation.',10),
    ('private','Builder Certificate or Bill of Sale','registration','Required as title evidence.',20),
    ('private','Tonnage survey certificate','technical','Required before provisional or full certificate.',30),
    ('private','Deletion certificate','registration','Required where previously registered.',40),
    ('private','Sanctions Letter','sanctions','2023 requirement.',50),
    ('private','Owner due diligence','due_diligence','Required before approval.',60),
    ('private','Representative person appointment','representative','Required for non-resident owners.',70),
    ('commercial','SCV / LY2 / LY3 coding evidence','commercial','Required for commercial operation.',80),
    ('commercial','Class evidence for 24 m+ / passenger yacht','technical','Required where applicable.',90),
    ('commercial','Mortgage instrument / notice of intent','mortgage','Required where mortgage is registered.',100)
) as d(registration_type, document_name, document_category, condition_text, sort_order)
where fr.code = 'jersey';
