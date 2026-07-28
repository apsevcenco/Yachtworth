-- Yachtworth Flag Advisor: Isle of Man comprehensive profile v1.
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
    registration_cost_eur, annual_fee_eur,
    mortgage_available, temporary_registration, permanent_registration, radio_license,
    processing_time_days_min, processing_time_days_max,
    survey_required, classification_required,
    owner_nationality_restrictions, company_restrictions, crew_restrictions,
    vat_notes, insurance_notes, advantages, disadvantages,
    official_website, official_registry_name, official_registry_url, primary_fee_url,
    confidence_level, coverage_status, data_quality_status, data_quality_score,
    source_version, last_updated, last_verified_at, advisor_sections, original_row, active
  )
  values (
    'iom', 'iom', 'iom', 'Isle of Man', 'Isle of Man', 'Isle of Man',
    'commonwealth', 'Category 1 Red Ensign / Isle of Man Ship Registry', false,
    true, true,
    'yes', 'yes',
    'No universal Part 1 minimum confirmed. SSR is available only to Isle of Man residents. Fee bands apply at 12 m and 24 m.',
    '24 m for the commercial yacht scheme, YET and PYCR. REG Yacht Code Part A applies to large commercial yachts.',
    'Category 1 Red Ensign register: no yacht maximum size or tonnage limit identified.',
    'Standard commercial yacht scheme supports up to 12 paying passengers; REG Yacht Code Part B can support up to 36 passengers for larger vessels.',
    'yes',
    'Registry-specific provisional and bareboat options are available. YET/PYCR provide dual-use operational routes for eligible yachts.',
    'Full registration is valid indefinitely provided annual fees are paid each year. Digital Certificate of British Registry is issued.',
    'Open to British citizens and companies, EU/EEA citizens and companies, Commonwealth and British Overseas Territories, and citizens/companies from 77 approved countries. Non-approved owners may need a local company structure.',
    'Foreign company ownership is available subject to qualified ownership rules. Representative person is required for non-IOM entity owners where the yacht is over 24 m.',
    'Representative person is required for non-IOM entity owners over 24 m and acts as local liaison with the registry.',
    'Mortgage registration is available through the Part 1 title register under English law principles. Priority is determined by registration date/time.',
    'Radio licensing is required separately according to yacht equipment and operating profile.',
    'Commercial, YET and PYCR yachts over 24 m must meet REG Yacht Code / Large Yacht Code and recognised class requirements. IOM accepts major IACS societies.',
    'Four survey regimes apply under MSN 075: full commercial, YET, PYCR and traditional pleasure. Commercial/YET/PYCR yachts remain under continuous survey.',
    'REG Yacht Code Part A. 2025 updates introduced YET and PYCR regimes and clarified continuous survey requirements.',
    'Safe Manning Document is required for commercial operation and issued according to tonnage, operating area and programme. STCW, MLC, ISM and ISPS apply according to yacht use and GT.',
    'Applications are commonly processed within 48 hours once complete documentation is submitted.',
    'Isle of Man has 0% standard corporate income tax, 0% capital gains tax and 0% withholding tax. It is in the UK VAT area but yacht registration/services are not VAT-charged. EU VAT/customs treatment remains separate because it is not an EU flag.',
    'No nationality restrictions for private yacht crew. STCW endorsements are available through a rapid online process. No EU social security mandate unless crew are EU-resident.',
    'Name reservation; title documents; tonnage certification; deletion certificate where applicable; commercial certification where applicable; due diligence; signed engagement; survey coordination; mortgage documents where applicable.',
    'Category 1 Red Ensign prestige; no GT/LOA maximum; strong Paris MoU / Qualship 21 reputation; flat non-tonnage annual fees; YET and PYCR charter flexibility; English-law mortgage framework; strong technical registry support.',
    'Non-EU VAT/customs planning required; YET/PYCR require full commercial compliance year-round; representative person cost applies for non-IOM owners over 24 m; survey/compliance burden can be material for charter yachts.',
    '["ABS","BV","DNV","Lloyd''s Register","RINA","ClassNK"]'::jsonb,
    1260, 1260,
    true, true, true, true,
    2, 2,
    true, true,
    'British, EU/EEA, Commonwealth, British Overseas Territories and approved-country owners are accepted; non-approved owners may require a qualifying structure.',
    'Foreign company ownership is available subject to qualified ownership rules and representative person requirements for non-IOM entity owners over 24 m.',
    'Flexible crew nationality rules; STCW, MLC, ISM/ISPS and safe manning apply by yacht profile.',
    'Non-EU flag; EU VAT/customs, Temporary Admission, importation and charter VAT require separate advice.',
    'Excellent Red Ensign reputation, strong insurer/bank acceptance, Paris MoU White List and Qualship 21 profile.',
    '["Category 1 Red Ensign","No yacht GT or LOA maximum","Flat annual yacht fees","Strong mortgage register","YET and PYCR routes","Fast 48-hour processing when complete","Digital Certificate of British Registry","Strong technical registry support"]'::jsonb,
    '["Non-EU VAT/customs planning required","YET/PYCR require year-round commercial compliance","Representative person may be required","Commercial survey/class burden can be material"]'::jsonb,
    'https://www.iomshipregistry.com/',
    'Isle of Man Ship Registry',
    'https://www.iomshipregistry.com/',
    'https://www.iomshipregistry.com/',
    'high', 'verified', 'production_ready', 93,
    'iom-guide-2026-v1', current_date, current_date,
    $$[
      {"title":"Registry overview","body":"The Isle of Man Ship Registry is a Category 1 Red Ensign Group registry administered from Douglas. It can register vessels of any size or type without tonnage or length limits and has a strong Paris MoU / Qualship 21 reputation."},
      {"title":"Owner eligibility","items":["Open to British, EU/EEA, Commonwealth, British Overseas Territories and 77 approved-country owners.","Non-approved country owners may need a local or approved-country structure.","Representative person is required for non-IOM entity owners where the yacht is over 24 m."]},
      {"title":"Registration categories","rows":[
        {"category":"Pleasure yacht 12 m and under","annual_fee":"GBP 312","framework":"Part 1 / pleasure route."},
        {"category":"Pleasure yacht over 12 m to under 24 m","annual_fee":"GBP 635","framework":"Pleasure route."},
        {"category":"Pleasure yacht 24 m and over","annual_fee":"GBP 1,260","framework":"Large Yacht Code where applicable."},
        {"category":"Commercial yacht","annual_fee":"GBP 2,570 if not technically managed from IOM; GBP 1,290 if managed from IOM","framework":"REG Yacht Code Part A."},
        {"category":"YET","annual_fee":"Commercial compliance cost applies","framework":"Up to 84 charter days/year; full commercial compliance year-round."},
        {"category":"PYCR","annual_fee":"Commercial compliance cost applies","framework":"Short-notice charter capability with full commercial compliance."}
      ]},
      {"title":"2025 REG updates","items":["MSN 054 Rev.4 introduced YET and PYCR operational regimes.","MSN 075 outlines four survey regimes: full commercial, YET, PYCR and traditional pleasure.","Commercial, YET and PYCR yachts must remain under continuous survey even when not chartering."]},
      {"title":"Fees","rows":[
        {"service":"Pleasure yacht 12 m and under","fee":"GBP 312/year"},
        {"service":"Pleasure yacht over 12 m to under 24 m","fee":"GBP 635/year"},
        {"service":"Pleasure yacht 24 m and over","fee":"GBP 1,260/year"},
        {"service":"Commercial yacht not technically managed from IOM","fee":"GBP 2,570/year"},
        {"service":"Commercial yacht technically managed from IOM","fee":"GBP 1,290/year"},
        {"service":"Mortgage registration Part 1","fee":"GBP 270"},
        {"service":"Representative person industry benchmark","fee":"From GBP 695/year"}
      ]},
      {"title":"Tax and VAT","items":["0% standard corporate tax, 0% capital gains tax and 0% withholding tax at IOM level.","IOM is not an EU flag; EU VAT/customs treatment must be analysed separately.","Flat annual fees are not tonnage-based, making IOM attractive for larger yachts."]},
      {"title":"Advisor interpretation","body":"Isle of Man is one of the strongest cost-to-prestige options for large yachts: Red Ensign Category 1, no GT ceiling, flat annual fees and YET/PYCR options. It is especially attractive when an owner wants Cayman-level credibility with more predictable annual cost."}
    ]$$::jsonb,
    '{"source":"Isle of Man Yacht Registration Comprehensive Guide 2026","profile_version":"iom-guide-2026-v1"}'::jsonb,
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
iom as (
  select id from upsert_registry
  union
  select id from public.flag_registries where code = 'iom'
),
source_upsert as (
  insert into public.flag_sources (
    flag_registry_id, topic, source_type, source_title, official_url,
    checked_at, effective_date, notes, is_official, is_active, source_version, import_key
  )
  select i.id, s.topic, s.source_type, s.source_title, s.official_url,
         current_date, s.effective_date, s.notes, s.is_official, true, 'iom-guide-2026-v1', s.import_key
  from iom i
  cross join (
    values
      ('registry_overview','official','Isle of Man Ship Registry','https://www.iomshipregistry.com/',null::date,'Internal audit source for IOM registry facts.',true,'iom-2026-source-registry'),
      ('fees','official','Isle of Man Ship Registry Fees 2026','https://www.iomshipregistry.com/',date '2026-01-01','Internal audit source for IOM 2026 fee profile.',true,'iom-2026-source-fees'),
      ('yet_pycr','official','IOM MSN 054 Rev.4 / MSN 075 profile','https://www.iomshipregistry.com/',date '2025-08-01','Internal audit source for YET/PYCR and survey regimes.',true,'iom-2026-source-yet-pycr')
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
select i.id, fee.registration_type, fee.fee_component, fee.amount, fee.currency, fee.formula_text,
       fee.minimum_amount, fee.loa_min, fee.loa_max, fee.gt_min, fee.gt_max, fee.vessel_category,
       fee.validity_period, fee.effective_from, fee.notes, su.id, 'https://www.iomshipregistry.com/',
       'high', current_date, true, 'iom-guide-2026-v1', fee.import_key,
       jsonb_build_object('profile_version','iom-guide-2026-v1','component',fee.fee_component)
from iom i
cross join (
  values
    ('private','Pleasure yacht 12 m and under annual fee',312::numeric,'GBP',null::text,null::numeric,null::numeric,12::numeric,null::numeric,null::numeric,'pleasure yacht','annual',date '2026-01-01','Annual registration fee.', 'iom-2026-fee-pleasure-u12'),
    ('private','Pleasure yacht over 12 m to under 24 m annual fee',635,'GBP',null,null,12,23.999,null,null,'pleasure yacht','annual',date '2026-01-01','Annual registration fee.', 'iom-2026-fee-pleasure-12-24'),
    ('private','Pleasure yacht 24 m and over annual fee',1260,'GBP',null,null,24,null,null,null,'pleasure yacht','annual',date '2026-01-01','Flat annual fee for 24 m+ pleasure yachts.', 'iom-2026-fee-pleasure-24-plus'),
    ('commercial','Commercial yacht annual fee not IOM managed',2570,'GBP',null,null,24,null,null,null,'commercial yacht','annual',date '2026-01-01','Commercial yacht not technically managed from the Island.', 'iom-2026-fee-commercial-not-managed'),
    ('commercial','Commercial yacht annual fee IOM managed',1290,'GBP',null,null,24,null,null,null,'commercial yacht','annual',date '2026-01-01','Commercial yacht technically managed from the Island.', 'iom-2026-fee-commercial-managed'),
    ('private','Mortgage registration Part 1',270,'GBP',null,null,null,null,null,null,'mortgage','one_off',date '2026-01-01','Register of mortgage Part 1.', 'iom-2026-fee-mortgage-part1'),
    ('private','Representative person annual benchmark',695,'GBP','From GBP 695/year.',null,24,null,null,null,'representative person','annual',null,'Industry benchmark from supplied guide.', 'iom-2026-fee-representative')
) as fee(registration_type, fee_component, amount, currency, formula_text, minimum_amount, loa_min, loa_max, gt_min, gt_max, vessel_category, validity_period, effective_from, notes, import_key)
left join source_upsert su on su.import_key = 'iom-2026-source-fees'
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
 where flag_registry_id = (select id from public.flag_registries where code = 'iom')
   and confidence_level = 'high'
   and document_category in ('registration','technical','due_diligence','yet','pycr','mortgage','representative');

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
    ('private','Tonnage certification','technical','Registry assists with survey coordination.',30),
    ('private','Deletion certificate','registration','Required where previously registered.',40),
    ('private','Due diligence verification on all owners','due_diligence','Required before approval.',50),
    ('private','Representative person appointment','representative','Required for non-IOM entity owners where yacht is over 24 m.',60),
    ('commercial','Commercial certification / REG Yacht Code evidence','technical','Required for commercial yacht operation.',70),
    ('commercial','Safe Manning Document file','technical','Required for commercial operation.',80),
    ('commercial','Mortgage instrument','mortgage','Required where mortgage is registered.',90),
    ('private','YET compliance file','yet','Required where using YET route.',100),
    ('private','PYCR compliance file','pycr','Required where using PYCR route.',110)
) as d(registration_type, document_name, document_category, condition_text, sort_order)
where fr.code = 'iom';
