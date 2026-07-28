-- Yachtworth Flag Advisor: Cyprus comprehensive profile v1.
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
    'cyprus','cyprus','cyprus','Cyprus','Cyprus','Cyprus',
    'eu','EU national/international registry / Cyprus Ship Registry',true,
    true,true,'yes','yes',
    'No universal private yacht minimum identified in the supplied 2026 profile.',
    'No universal commercial yacht minimum identified. Commercial route depends on ocean-going/non-ocean-going profile and statutory compliance.',
    'No single yacht maximum identified in the supplied 2026 profile.',
    'Passenger limits and commercial treatment are regime-dependent and must be confirmed by yacht category and certification.',
    'yes','Provisional registration is available: 6 months base plus possible 3-month extension, up to 9 months total.','Permanent certificate is valid indefinitely, subject to ongoing compliance and fees.',
    'EU/EEA nationals and companies are automatically eligible. Non-EU owners must satisfy more than 50% EU/EEA ownership or a qualifying corporate/control structure.',
    'Foreign company ownership is possible through a qualifying corporate structure meeting the EU/EEA ownership/control test.',
    'Authorised representative is required in specified non-resident cases. Local maritime advocate is commonly used for transactions and registry communication.',
    'Mortgage registration is available through the Cyprus ship registry. Mortgage registration fees are abolished for ocean-going commercial ships; fees apply for non-ocean-going vessels.',
    'Radio licence services are required and have separate fee lines.',
    'Pre-registration survey by recognised surveyor or RO is mandatory. SDM accepts major IACS societies.',
    'Certificate of Survey MS1 is required for provisional registration; Cyprus Tonnage Certificate MS12 is required for permanent registration. Periodic surveys maintain compliance.',
    'Cyprus/EU/international commercial ship requirements. No separate dedicated yacht code identified in the supplied profile.',
    'Safe Manning Document is required for commercial vessels. STCW, MLC and ISM/ISPS apply according to commercial status and GT.',
    'Provisional registration can be processed in 1-5 working days; typical purchase/reflag to permanent certificate takes 6-10 weeks.',
    'EU flag. Cyprus has 12.5% corporate tax, 0% CGT on qualifying shipping assets, 0% withholding tax to non-residents, tonnage tax for qualifying shipping and 19% standard VAT with shipping exemptions where applicable.',
    'No nationality restrictions for private yacht crew. Commercial crew certification, MLC and safe manning apply. Non-EU certificates may require endorsement.',
    'Advocate/KYC file; ownership/control structure evidence; MS1 application; certificate of survey; proof of ownership; company documents; shareholder declarations; provisional fee payment; MS12 tonnage certificate; deletion certificate; insurance/class/safety certificates.',
    'Full EU flag; English common law familiarity; strong commercial shipping registry; tonnage tax framework; low 12.5% CIT; 0% withholding tax; Qualship 21 / Paris MoU White List; CYSh1P digital portal and one-stop-shop reforms.',
    'Non-EU owners face ownership/control structuring complexity; surveys and permanent registration can take 6-10 weeks; professional, survey and legal fees can be material; pleasure-yacht fee schedule still needs direct confirmation.',
    '["ABS","BV","DNV","Lloyd''s Register","RINA","ClassNK"]'::jsonb,
    300,300,
    true,true,true,true,
    1,5,
    true,true,
    'EU/EEA owners are automatically eligible. Non-EU owners require more than 50% EU/EEA ownership or a qualifying control structure.',
    'Foreign companies can be used through a qualifying corporate/control structure. Cyprus company, EU holding company, trust or foundation routes may be used.',
    'No private crew nationality restrictions; commercial crew requires STCW/MLC/safe manning and possible endorsement for non-EU certificates.',
    'EU flag. 19% VAT standard rate; shipping exemptions may apply. Tonnage tax replaces corporate tax on qualifying shipping profits.',
    'Highly respected EU registry with Paris MoU White List, Qualship 21 and strong commercial shipping reputation.',
    '["Full EU flag","English common law familiarity","Tonnage tax framework","Zero registration/mortgage fees for ocean-going commercial ships","Low 12.5% CIT","0% withholding tax to non-residents","CYSh1P digital portal","Strong commercial registry reputation"]'::jsonb,
    '["EU/EEA ownership/control test for non-EU owners","6-10 week total permanent registration timeline","Survey/legal/advocate costs can be material","Pleasure yacht fee schedule requires direct confirmation","EU social security/VAT planning for commercial operations"]'::jsonb,
    'https://www.dms.gov.cy/',
    'Cyprus Ship Registry / Shipping Deputy Ministry',
    'https://www.dms.gov.cy/',
    'https://www.dms.gov.cy/',
    'high','verified','production_ready',92,
    'cyprus-guide-2026-v1',current_date,current_date,
    $$[
      {"title":"Registry overview","body":"The Cyprus Ship Registry is administered by the Shipping Deputy Ministry and is one of the leading EU shipping registries. Cyprus is a full EU member state and operates with English common law familiarity."},
      {"title":"Owner eligibility","rows":[
        {"owner_category":"EU/EEA nationals and companies","eligible":"Yes","notes":"Automatic eligibility."},
        {"owner_category":"Cyprus nationals and companies","eligible":"Yes","notes":"Automatic eligibility."},
        {"owner_category":"Non-EU individuals","eligible":"Via structure","notes":"Must satisfy EU/EEA ownership or qualifying control test."},
        {"owner_category":"Non-EU companies","eligible":"Via structure","notes":"More than 50% EU/EEA ownership or qualifying corporate/control structure required."}
      ]},
      {"title":"Registration timeline","items":["Engage Cyprus maritime advocate and complete KYC/AML review.","Pre-registration survey and Certificate of Survey MS1 required before provisional registration.","Provisional registration normally processes in 1-5 working days.","Permanent registration requires MS12 tonnage certificate, deletion certificate, title documents, insurance/class/safety certificates where applicable.","Typical purchase-and-reflag timeline is 6-10 weeks."]},
      {"title":"Fees","rows":[
        {"fee_component":"Annual registry maintenance fee","amount":"EUR 300"},
        {"fee_component":"Provisional registration fee","amount":"EUR 213.58 - EUR 5,125.80, banded by GT"},
        {"fee_component":"Certificate of registration","amount":"EUR 17.09"},
        {"fee_component":"Radio licence services","amount":"EUR 20 per service"},
        {"fee_component":"Continuous Synopsis Record","amount":"EUR 34.17"},
        {"fee_component":"Ocean-going commercial registration/mortgage fees","amount":"EUR 0 government fee, subject to annual maintenance and tonnage tax"}
      ]},
      {"title":"Tax and 2026 reforms","items":["Cyprus corporate income tax is 12.5%.","Tonnage tax is available for qualifying shipping activities.","0% withholding tax on dividends, interest and royalties to non-residents.","Stamp duty reform effective 1 January 2026 removes stamp duty from many commercial instruments, subject to document-specific confirmation.","CYSh1P digital portal launched in 2025 and shipping one-stop-shop reforms improve administration."]},
      {"title":"Advisor interpretation","body":"Cyprus is a premium EU flag for commercial and tax-structured yacht ownership, especially where English-law familiarity and tonnage tax matter. Its main weakness versus Madeira is the EU/EEA ownership/control requirement for non-EU owners."}
    ]$$::jsonb,
    '{"source":"Cyprus Yacht Registration Comprehensive Guide 2026","profile_version":"cyprus-guide-2026-v1"}'::jsonb,
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
cyprus as (
  select id from upsert_registry
  union
  select id from public.flag_registries where code = 'cyprus'
),
source_upsert as (
  insert into public.flag_sources (
    flag_registry_id, topic, source_type, source_title, official_url,
    checked_at, effective_date, notes, is_official, is_active, source_version, import_key
  )
  select c.id, s.topic, s.source_type, s.source_title, s.official_url,
         current_date, s.effective_date, s.notes, s.is_official, true, 'cyprus-guide-2026-v1', s.import_key
  from cyprus c
  cross join (
    values
      ('registry_overview','official','Cyprus Shipping Deputy Ministry','https://www.dms.gov.cy/',null::date,'Internal audit source for Cyprus registry facts.',true,'cyprus-2026-source-registry'),
      ('fees','official','Cyprus SDM fee schedule','https://www.dms.gov.cy/',date '2026-01-01','Internal audit source for Cyprus 2026 fee profile.',true,'cyprus-2026-source-fees'),
      ('tax','official','Cyprus tonnage tax and shipping reforms','https://www.dms.gov.cy/',date '2026-01-01','Internal audit source for Cyprus tax / 2026 reforms summary.',true,'cyprus-2026-source-tax')
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
select c.id, fee.registration_type, fee.fee_component, fee.amount, fee.currency, fee.formula_text,
       fee.minimum_amount, fee.loa_min, fee.loa_max, fee.gt_min, fee.gt_max, fee.vessel_category,
       fee.validity_period, fee.effective_from, fee.notes, su.id, 'https://www.dms.gov.cy/',
       'high', current_date, true, 'cyprus-guide-2026-v1', fee.import_key,
       jsonb_build_object('profile_version','cyprus-guide-2026-v1','component',fee.fee_component)
from cyprus c
cross join (
  values
    ('private','Annual registry maintenance fee',300::numeric,'EUR',null::text,null::numeric,null::numeric,null::numeric,null::numeric,null::numeric,'all vessels','annual',date '2026-01-01','Payable on registration and annually by 31 March.', 'cyprus-2026-fee-annual-maintenance'),
    ('private','Provisional registration fee low band',213.58,'EUR','Banded by gross tonnage.',213.58,null,null,null,null,'provisional registration','provisional',date '2026-01-01','Lower end of supplied fee range.', 'cyprus-2026-fee-provisional-low'),
    ('private','Provisional registration fee high band',5125.80,'EUR','Banded by gross tonnage.',213.58,null,null,null,null,'provisional registration','provisional',date '2026-01-01','Upper end of supplied fee range.', 'cyprus-2026-fee-provisional-high'),
    ('commercial','Ocean-going commercial registration fee',0,'EUR','Government registration fee abolished for ocean-going commercial Cyprus ships.',0,null,null,null,null,'ocean-going commercial','initial',date '2026-01-01','Annual maintenance and tonnage tax still apply.', 'cyprus-2026-fee-ocean-going-registration'),
    ('commercial','Ocean-going commercial mortgage registration fee',0,'EUR','Government mortgage registration fee abolished for ocean-going commercial Cyprus ships.',0,null,null,null,null,'ocean-going commercial mortgage','one_off',date '2026-01-01','Fees apply for non-ocean-going vessels.', 'cyprus-2026-fee-ocean-going-mortgage'),
    ('private','Certificate of registration',17.09,'EUR',null,null,null,null,null,null,'certificate','one_off',date '2026-01-01','Provisional/permanent/parallel certificate.', 'cyprus-2026-fee-certificate'),
    ('private','Radio licence service',20,'EUR',null,null,null,null,null,null,'radio licence','per_service',date '2026-01-01','Registration/installation/amendment/renewal fee per service.', 'cyprus-2026-fee-radio-service'),
    ('private','Continuous Synopsis Record',34.17,'EUR',null,null,null,null,null,null,'registry service','one_off',date '2026-01-01','CSR fee.', 'cyprus-2026-fee-csr')
) as fee(registration_type, fee_component, amount, currency, formula_text, minimum_amount, loa_min, loa_max, gt_min, gt_max, vessel_category, validity_period, effective_from, notes, import_key)
left join source_upsert su on su.import_key = 'cyprus-2026-source-fees'
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
 where flag_registry_id = (select id from public.flag_registries where code = 'cyprus')
   and confidence_level = 'high'
   and document_category in ('registration','ownership','technical','survey','representative','commercial','mortgage','radio','insurance');

insert into public.flag_required_documents (
  flag_registry_id, registration_type, document_name, document_category,
  is_required, condition_text, confidence_level, sort_order
)
select fr.id, d.registration_type, d.document_name, d.document_category,
       true, d.condition_text, 'high', d.sort_order
from public.flag_registries fr
cross join (
  values
    ('private','Advocate/KYC ownership file','representative','Local advocate normally coordinates registration and structure review.',10),
    ('private','EU/EEA ownership/control evidence','ownership','Required where non-EU owner uses qualifying structure.',20),
    ('private','Form MS1 application','registration','Required for provisional registration.',30),
    ('private','Certificate of Survey','survey','Required before provisional registration.',40),
    ('private','Proof of ownership','registration','Builder Certificate or original/notarized Bill of Sale.',50),
    ('private','Company documents and shareholder declarations','ownership','Required for corporate ownership and eligibility test.',60),
    ('private','MS12 Cyprus Tonnage Certificate','technical','Required for permanent registration.',70),
    ('private','Deletion certificate','registration','Critical-path document where reflagging.',80),
    ('private','P&I insurance certificate','insurance','Required in permanent file.',90),
    ('commercial','Class certificate','technical','Required where applicable.',100),
    ('commercial','ISM/ISPS/MLC certificates','commercial','Required where applicable, especially 500 GT+ trading internationally.',110),
    ('private','Radio licence documents','radio','Required for radio licensing.',120),
    ('commercial','Mortgage instrument','mortgage','Required where mortgage is registered.',130)
) as d(registration_type, document_name, document_category, condition_text, sort_order)
where fr.code = 'cyprus';
