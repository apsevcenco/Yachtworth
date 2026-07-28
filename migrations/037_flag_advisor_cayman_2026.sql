-- Yachtworth Flag Advisor: Cayman Islands comprehensive profile v1.
-- Public cards do not display source links; sources remain stored for audit.

alter table public.flag_registries
  add column if not exists advisor_sections jsonb not null default '[]'::jsonb;

with upsert_registry as (
  insert into public.flag_registries (
    code,
    slug,
    import_key,
    flag_name,
    country,
    country_or_territory,
    registry_type,
    registry_family,
    is_eu_flag,
    private_available,
    commercial_available,
    private_registration_status,
    commercial_registration_status,
    private_minimum_loa,
    commercial_minimum_loa,
    maximum_loa_gt_notes,
    passenger_limit_notes,
    provisional_registration_status,
    provisional_validity,
    permanent_validity,
    owner_eligibility,
    foreign_company_ownership,
    local_agent_requirement,
    mortgage_registration_status,
    radio_licence_requirement,
    classification_requirement,
    survey_inspection_requirement,
    commercial_yacht_code,
    minimum_safe_manning,
    indicative_processing_time,
    vat_tax_note,
    crew_note,
    required_documents_summary,
    objective_advantages,
    limitations_and_risks,
    accepted_class,
    registration_cost_eur,
    annual_fee_eur,
    mortgage_available,
    temporary_registration,
    permanent_registration,
    radio_license,
    processing_time_days_min,
    processing_time_days_max,
    survey_required,
    classification_required,
    owner_nationality_restrictions,
    company_restrictions,
    crew_restrictions,
    vat_notes,
    insurance_notes,
    advantages,
    disadvantages,
    official_website,
    official_registry_name,
    official_registry_url,
    primary_fee_url,
    confidence_level,
    coverage_status,
    data_quality_status,
    data_quality_score,
    source_version,
    last_updated,
    last_verified_at,
    advisor_sections,
    original_row,
    active
  )
  values (
    'cayman',
    'cayman',
    'cayman',
    'Cayman Islands',
    'Cayman Islands',
    'Cayman Islands',
    'commonwealth',
    'Category 1 Red Ensign / Cayman Islands Shipping Registry',
    false,
    true,
    true,
    'yes',
    'yes',
    'No universal public minimum identified for pleasure yachts. Simplified measurement route exists below 24 m.',
    'Commercial yacht route is generally 24 m+ under the REG / MCA large yacht framework; smaller commercial craft require category confirmation.',
    'No public yacht maximum identified. Category 1 status supports any type of vessel without tonnage or length limit, including large commercial superyachts.',
    'Commercial yacht passenger limits are code-dependent; the typical large yacht framework is up to 12 passengers.',
    'yes',
    'Interim certificates and temporary certificates can be available in specified cases. YET uses temporary certificates during permitted charter periods.',
    'Annual renewal and tonnage / representative person fees are due annually. Certificate of British Registry must be kept on board.',
    'Eligible owners include British/Commonwealth citizens, Cayman Islands companies and qualifying foreign companies from approved jurisdictions with a Cayman or UK representative person. Non-Commonwealth / non-EU owners commonly use a Cayman exempted company.',
    'Qualifying foreign companies may register where incorporated in acceptable jurisdictions and where a representative person resident in Cayman or the UK is appointed. Cayman exempted company ownership is the standard yacht-holding route for many international owners.',
    'A representative person is mandatory. It must be an individual resident in the Cayman Islands or a Cayman body corporate with a place of business there. Failure to maintain or update the representative can trigger penalties.',
    'Mortgage registration is available through the CISR framework. It follows UK Merchant Shipping Act principles, priority by registration date/time and internationally recognised enforcement. Fee profile includes USD 1,100 per mortgage instrument or combined registration/mortgage filing.',
    'Radio licensing and technical radio documents are required separately as part of the registration workflow.',
    'CISR accepts major IACS class societies such as LR, DNV, ABS, BV, RINA and ClassNK. Large commercial yachts follow MCA / REG large yacht code expectations; ISM/ISPS applies above 500 GT for commercial yachts.',
    'Tonnage measurement is required for all vessels. Survey regime depends on pleasure/commercial category and GT. Commercial coding survey under LY3 / REG Yacht Code is required for commercial operation.',
    'Cayman commercial yachts align with MCA / REG large yacht standards, including LY3 / REG Yacht Code concepts. YET is available for qualifying private yachts that want limited trade.',
    'Safe Manning Document is set by CISR according to tonnage, operating area and programme. STCW applies to senior positions. MLC applies fully to commercial yachts and by alignment to many private yachts above 24 m.',
    'Processing can often be completed within 24 hours when documents are complete.',
    'Cayman has 0% corporate income tax, capital gains tax, VAT and withholding tax at Cayman level. Annual tonnage fees are registry fees, not corporate tax. Cayman is non-EU, so EU VAT/customs treatment, Temporary Admission, importation and charter VAT must be structured separately.',
    'MLC 2006, STCW, safe manning and ISM/ISPS requirements apply by yacht category and GT. Cayman offers flexible global crew structuring, but commercial yachts carry full compliance obligations.',
    'Name reservation; application; Bill of Sale or Builder Certificate; tonnage measurement data; deletion certificate where applicable; representative person appointment; technical and radio documents; category compliance evidence; fee payment; mortgage documents where applicable.',
    'Premium Category 1 Red Ensign flag; strong bank and insurance acceptance; no maximum yacht size; tax-neutral Cayman layer; robust mortgage register; fast processing; English-language administration; strong superyacht reputation; YET route for limited charter.',
    'Non-EU status means EU VAT/customs and Temporary Admission planning are separate; Cayman representative and company costs can be material; commercial yachts can face high regulatory burden under LY3/REG, ISM/ISPS and audit requirements; YET has an 84-day cap and no VAT exemption on fuel/consumables.',
    '["ABS","BV","DNV","Lloyd''s Register","RINA","ClassNK"]'::jsonb,
    5500,
    600,
    true,
    true,
    true,
    true,
    1,
    1,
    true,
    true,
    'British/Commonwealth citizens, Cayman companies and qualifying foreign companies are eligible. International owners often use a Cayman exempted company.',
    'Qualifying foreign companies can register with a Cayman or UK representative person; Cayman exempted company is the usual international holding route.',
    'No EU social security mandate from the flag itself. MLC, STCW, safe manning, ISM and ISPS apply by yacht profile.',
    'Cayman is tax-neutral at flag jurisdiction level but does not determine EU VAT-paid status. EU VAT, customs, Temporary Admission and charter VAT must be reviewed separately.',
    'Excellent Red Ensign reputation, strong superyacht acceptance and often favourable bank/insurance perception.',
    '["Category 1 Red Ensign","Premium superyacht reputation","Strong mortgage register","Bank and insurance friendly","Tax-neutral Cayman layer","No public LOA / GT maximum","YET limited charter route","Fast processing"]'::jsonb,
    '["Non-EU VAT and customs planning required","Temporary Admission management may be needed in EU waters","Representative person and company costs can be material","Commercial LY3 / REG compliance burden can be high","YET limited to 84 charter days and recognised jurisdictions"]'::jsonb,
    'https://www.cishipping.com/',
    'Cayman Islands Shipping Registry / Maritime Authority of the Cayman Islands',
    'https://www.cishipping.com/',
    'https://www.cishipping.com/',
    'high',
    'verified',
    'production_ready',
    92,
    'cayman-guide-2026-v1',
    current_date,
    current_date,
    $$[
      {
        "title": "Registry overview",
        "body": "The Cayman Islands Shipping Registry is the official maritime registry of the Cayman Islands and forms part of the Red Ensign Group. It has Category 1 status, allowing registration of vessels without tonnage or length limits, including large commercial superyachts."
      },
      {
        "title": "Red Ensign / technical position",
        "items": [
          "Cayman is technically aligned with the UK MCA and REG large yacht framework.",
          "The flag is recognised by the IMO and is a signatory to SOLAS, MARPOL, STCW, MLC 2006 and COLREG.",
          "Cayman is one of the key premium Red Ensign yacht flags alongside the UK, Isle of Man and Gibraltar.",
          "Large commercial yachts follow LY3 / REG Yacht Code-style requirements."
        ]
      },
      {
        "title": "Owner eligibility",
        "rows": [
          {"owner_category":"British / Commonwealth citizens","eligible":"Yes","notes":"Includes British citizens, Crown Dependencies, British Overseas Territories and several Commonwealth states."},
          {"owner_category":"Cayman Islands company","eligible":"Yes","notes":"Usually a dedicated Cayman exempted company holding one yacht."},
          {"owner_category":"Qualifying foreign company","eligible":"Yes","notes":"Accepted jurisdictions include EU member states, Commonwealth states, Red Ensign jurisdictions and approved third countries with representative person."},
          {"owner_category":"Non-Commonwealth / non-EU owner","eligible":"Structured route","notes":"Common route is a Cayman exempted company, possibly below a trust, foundation or European holding company."}
        ]
      },
      {
        "title": "Representative person",
        "items": [
          "A representative person is mandatory under the Merchant Shipping Law.",
          "The representative can be an individual resident in Cayman or a Cayman body corporate with a place of business there.",
          "Failure to maintain or update the representative person can trigger a fine of up to USD 3,000.",
          "Beneficial ownership is disclosed to the internal Cayman register, not public, but accessible to competent authorities."
        ]
      },
      {
        "title": "Registration categories",
        "rows": [
          {"category":"Pleasure yacht below 24 m","minimum":"No universal public minimum","framework":"Small Vessel Code / simplified measurement route below 24 m."},
          {"category":"Pleasure yacht 24-300 GT","minimum":"24 m","framework":"Pleasure Yacht Code; STCW crew; annual safety surveys."},
          {"category":"Pleasure yacht above 300 GT","minimum":"24 m","framework":"SOLAS, STCW, MARPOL, MLC and LY3 / REG reference framework."},
          {"category":"Commercial yacht","minimum":"Generally 24 m+","framework":"Full LY3 / REG framework; ISM/ISPS above 500 GT."},
          {"category":"YET","minimum":"24 m","framework":"Private yacht may charter up to 84 days/year under temporary commercial certificates."}
        ]
      },
      {
        "title": "YET limited charter regime",
        "items": [
          "YET allows a private Cayman yacht to undertake limited charter without full commercial conversion.",
          "The cap is 84 charter days per calendar year.",
          "The yacht remains primarily private and is temporarily reclassified during charter periods.",
          "Owner private use is not allowed while the temporary YET certificate is in force.",
          "YET is available only in jurisdictions that recognise the framework, primarily EU waters.",
          "YET yachts cannot benefit from VAT exemptions on fuel or operating consumables.",
          "The 18-month Temporary Admission period is paused during YET/TACA operation."
        ]
      },
      {
        "title": "Registration process",
        "items": [
          "Reserve the name by providing three alternatives.",
          "Submit application, Bill of Sale or Builder Certificate, tonnage data, deletion certificate if applicable, representative person appointment and technical/radio documents.",
          "Pay registration, representative person and survey/tonnage fees where applicable.",
          "Certificate of British Registry is issued and sent by courier; the original must be kept on board.",
          "Annual tonnage and representative person fees are due by 28 February."
        ]
      },
      {
        "title": "Registry fees",
        "rows": [
          {"fee_component":"Initial registration","amount":"USD 5,500","notes":"Base yacht registration / agent pricing; official matrix depends on GT and category."},
          {"fee_component":"Tonnage survey below 24 m","amount":"USD 570","notes":"Under 24 m length."},
          {"fee_component":"Mortgage registration","amount":"USD 1,100","notes":"Per mortgage instrument."},
          {"fee_component":"Transfer / transmission / deletion","amount":"USD 700","notes":"Standard filing fee."},
          {"fee_component":"Registration + mortgage combined","amount":"USD 1,100","notes":"If both are filed simultaneously."},
          {"fee_component":"Annual tonnage fee up to 400 GT","amount":"USD 600","notes":"Minimum annual fee."},
          {"fee_component":"Annual tonnage fee 400 GT+","amount":"USD 800 + USD 0.30/GT above 400","notes":"Yacht annual tonnage fee profile."}
        ]
      },
      {
        "title": "Representative and company costs",
        "rows": [
          {"service":"Authorised representative","indicative_fee":"USD 3,025/year"},
          {"service":"Company incorporation first year","indicative_fee":"USD 7,200"},
          {"service":"Company maintenance from year 2","indicative_fee":"USD 6,525/year"},
          {"service":"Beneficial ownership register maintenance","indicative_fee":"USD 650/year"},
          {"service":"Economic substance notification filing","indicative_fee":"USD 825/year"}
        ]
      },
      {
        "title": "Tax environment",
        "items": [
          "Cayman has 0% corporate income tax, capital gains tax, VAT and withholding tax.",
          "Annual tonnage fee is a registry fee, not corporate tax.",
          "EU VAT exposure remains separate because Cayman is a non-EU flag.",
          "EU VAT/customs treatment depends on ownership, importation, use and charter pattern, not simply flag registration."
        ]
      },
      {
        "title": "Crew, class and compliance",
        "items": [
          "MLC 2006 applies fully to commercial yachts and by alignment to many private yachts above 24 m.",
          "Safe Manning Document is set by CISR according to tonnage, operating area and programme.",
          "Senior positions require STCW certificates at the required level.",
          "ISM/ISPS is mandatory above 500 GT for commercial yachts.",
          "Recognised Organisations include major IACS societies such as LR, DNV, ABS, BV, RINA and ClassNK."
        ]
      },
      {
        "title": "Mortgage and finance",
        "items": [
          "Mortgage registration is available through CISR.",
          "The framework follows UK Merchant Shipping Act principles.",
          "Priority is determined by date and time of registration.",
          "Registered mortgages are internationally recognised and support premium yacht finance."
        ]
      },
      {
        "title": "Advisor interpretation",
        "body": "Cayman is a premium choice for large, financed and institutionally owned yachts, and for owners who value Red Ensign reputation, tax neutrality and English-language administration. For South of France or EU operations it must be paired with proper VAT/customs and Temporary Admission planning. YET is attractive for occasional charter income up to 84 days/year."
      }
    ]$$::jsonb,
    '{"source":"Cayman Islands Yacht Registration Comprehensive Guide 2026","profile_version":"cayman-guide-2026-v1"}'::jsonb,
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
cayman as (
  select id from upsert_registry
  union
  select id from public.flag_registries where code = 'cayman'
),
source_upsert as (
  insert into public.flag_sources (
    flag_registry_id,
    topic,
    source_type,
    source_title,
    official_url,
    checked_at,
    effective_date,
    notes,
    is_official,
    is_active,
    source_version,
    import_key
  )
  select
    c.id,
    s.topic,
    s.source_type,
    s.source_title,
    s.official_url,
    current_date,
    s.effective_date,
    s.notes,
    s.is_official,
    true,
    'cayman-guide-2026-v1',
    s.import_key
  from cayman c
  cross join (
    values
      ('registry_overview','official','Cayman Islands Shipping Registry','https://www.cishipping.com/',null::date,'Internal audit source for Cayman registry facts.',true,'cayman-2026-source-registry'),
      ('yet','official','Cayman Yacht Engaged in Trade profile','https://www.cishipping.com/',null::date,'Internal audit source for YET profile and temporary certificates.',true,'cayman-2026-source-yet'),
      ('fees','official','Cayman registry fee schedule','https://www.cishipping.com/',null::date,'Internal audit source for registry fee rules.',true,'cayman-2026-source-fees')
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
  flag_registry_id,
  registration_type,
  fee_component,
  amount,
  currency,
  formula_text,
  minimum_amount,
  loa_min,
  loa_max,
  gt_min,
  gt_max,
  vessel_category,
  validity_period,
  effective_from,
  notes,
  official_source_id,
  official_source_url,
  confidence_level,
  last_verified_at,
  is_active,
  source_version,
  import_key,
  original_row
)
select
  c.id,
  fee.registration_type,
  fee.fee_component,
  fee.amount,
  fee.currency,
  fee.formula_text,
  fee.minimum_amount,
  fee.loa_min,
  fee.loa_max,
  fee.gt_min,
  fee.gt_max,
  fee.vessel_category,
  fee.validity_period,
  fee.effective_from,
  fee.notes,
  su.id,
  'https://www.cishipping.com/',
  'high',
  current_date,
  true,
  'cayman-guide-2026-v1',
  fee.import_key,
  jsonb_build_object('profile_version','cayman-guide-2026-v1','component',fee.fee_component)
from cayman c
cross join (
  values
    ('private','Initial yacht registration',5500::numeric,'USD',null::text,null::numeric,null::numeric,null::numeric,null::numeric,null::numeric,'pleasure yacht','initial',null::date,'Base yacht registration / agent pricing; official matrix depends on GT and category.', 'cayman-2026-fee-initial-private'),
    ('commercial','Initial yacht registration',5500,'USD',null,null,24,null,null,null,'commercial yacht','initial',null,'Base yacht registration / agent pricing; official matrix depends on GT and category.', 'cayman-2026-fee-initial-commercial'),
    ('private','Tonnage survey below 24 m',570,'USD',null,null,null,23.999,null,null,'pleasure yacht','survey',null,'Under 24 metres in length.', 'cayman-2026-fee-tonnage-survey-u24'),
    ('private','Mortgage registration',1100,'USD',null,null,null,null,null,null,'mortgage','one_off',null,'Per mortgage instrument.', 'cayman-2026-fee-mortgage-private'),
    ('commercial','Mortgage registration',1100,'USD',null,null,null,null,null,null,'mortgage','one_off',null,'Per mortgage instrument.', 'cayman-2026-fee-mortgage-commercial'),
    ('private','Transfer / transmission / deletion',700,'USD',null,null,null,null,null,null,'registry filing','one_off',null,'Standard filing fee.', 'cayman-2026-fee-transfer-private'),
    ('commercial','Transfer / transmission / deletion',700,'USD',null,null,null,null,null,null,'registry filing','one_off',null,'Standard filing fee.', 'cayman-2026-fee-transfer-commercial'),
    ('private','Registration + mortgage combined',1100,'USD',null,null,null,null,null,null,'combined filing','one_off',null,'If registration and mortgage are filed simultaneously.', 'cayman-2026-fee-combined-private'),
    ('commercial','Registration + mortgage combined',1100,'USD',null,null,null,null,null,null,'combined filing','one_off',null,'If registration and mortgage are filed simultaneously.', 'cayman-2026-fee-combined-commercial'),
    ('private','Annual tonnage fee up to 400 GT',600,'USD',null,null,null,null,null,399.999,'annual tonnage fee','annual',null,'Minimum annual fee for vessels up to 400 GT.', 'cayman-2026-fee-annual-u400-private'),
    ('commercial','Annual tonnage fee up to 400 GT',600,'USD',null,null,null,null,null,399.999,'annual tonnage fee','annual',null,'Minimum annual fee for vessels up to 400 GT.', 'cayman-2026-fee-annual-u400-commercial'),
    ('private','Annual tonnage fee 400 GT and above',800,'USD','USD 800 + USD 0.30 per GT above 400.',null,null,null,400,null,'annual tonnage fee','annual',null,'Formula requires GT above 400.', 'cayman-2026-fee-annual-400plus-private'),
    ('commercial','Annual tonnage fee 400 GT and above',800,'USD','USD 800 + USD 0.30 per GT above 400.',null,null,null,400,null,'annual tonnage fee','annual',null,'Formula requires GT above 400.', 'cayman-2026-fee-annual-400plus-commercial'),
    ('private','Authorised representative annual fee',3025,'USD',null,null,null,null,null,null,'representative person','annual',null,'Agent pricing benchmark.', 'cayman-2026-fee-representative-private'),
    ('commercial','Authorised representative annual fee',3025,'USD',null,null,null,null,null,null,'representative person','annual',null,'Agent pricing benchmark.', 'cayman-2026-fee-representative-commercial'),
    ('private','Cayman company incorporation first year',7200,'USD',null,null,null,null,null,null,'company setup','one_off',null,'Agent pricing benchmark where Cayman exempted company is needed.', 'cayman-2026-fee-company-setup-private'),
    ('commercial','Cayman company incorporation first year',7200,'USD',null,null,null,null,null,null,'company setup','one_off',null,'Agent pricing benchmark where Cayman exempted company is needed.', 'cayman-2026-fee-company-setup-commercial'),
    ('private','Cayman company annual maintenance from year 2',6525,'USD',null,null,null,null,null,null,'company maintenance','annual',null,'Agent pricing benchmark.', 'cayman-2026-fee-company-maintenance-private'),
    ('commercial','Cayman company annual maintenance from year 2',6525,'USD',null,null,null,null,null,null,'company maintenance','annual',null,'Agent pricing benchmark.', 'cayman-2026-fee-company-maintenance-commercial')
) as fee(registration_type, fee_component, amount, currency, formula_text, minimum_amount, loa_min, loa_max, gt_min, gt_max, vessel_category, validity_period, effective_from, notes, import_key)
left join source_upsert su on su.import_key = 'cayman-2026-source-fees'
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
 where flag_registry_id = (select id from public.flag_registries where code = 'cayman')
   and confidence_level = 'high'
   and document_category in ('registration','representative','technical','yet','mortgage');

insert into public.flag_required_documents (
  flag_registry_id,
  registration_type,
  document_name,
  document_category,
  is_required,
  condition_text,
  confidence_level,
  sort_order
)
select
  fr.id,
  d.registration_type,
  d.document_name,
  d.document_category,
  true,
  d.condition_text,
  'high',
  d.sort_order
from public.flag_registries fr
cross join (
  values
    ('private','Name reservation alternatives','registration','Provide three alternative names.',10),
    ('private','Bill of Sale or Builder Certificate','registration','Required as proof of ownership.',20),
    ('private','Tonnage measurement data','technical','Required for all vessels.',30),
    ('private','Deletion certificate','registration','Required where previously registered.',40),
    ('private','Representative person appointment','representative','Mandatory for non-resident / qualifying owners.',50),
    ('private','Technical and radio documents','technical','Required according to yacht category.',60),
    ('commercial','Name reservation alternatives','registration','Provide three alternative names.',70),
    ('commercial','Bill of Sale or Builder Certificate','registration','Required as proof of ownership.',80),
    ('commercial','Tonnage measurement data','technical','Required for all vessels.',90),
    ('commercial','Class / LY3 / REG compliance evidence','technical','Required for commercial yacht operation.',100),
    ('commercial','DOC / SMC / ISSC evidence where above 500 GT','technical','Required where ISM/ISPS applies.',110),
    ('commercial','Safe Manning Document file','technical','Required according to tonnage, area and programme.',120),
    ('commercial','Representative person appointment','representative','Mandatory for non-resident / qualifying owners.',130),
    ('commercial','Mortgage instrument','mortgage','Required where mortgage is registered.',140),
    ('private','YET Certificate of Compliance','yet','Required where private yacht enters YET trade period.',150),
    ('private','Temporary Certificate of British Registry YET','yet','Required during YET charter period.',160),
    ('private','Charter agreement / TACA customs documents','yet','Required during YET charter period.',170),
    ('private','Master limited trade declaration','yet','Required during YET charter period.',180)
) as d(registration_type, document_name, document_category, condition_text, sort_order)
where fr.code = 'cayman';
