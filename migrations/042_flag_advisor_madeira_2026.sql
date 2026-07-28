-- Yachtworth Flag Advisor: Madeira (MAR) comprehensive profile v1.
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
    'portugal_madeira','portugal_madeira','portugal_madeira','Portugal (Madeira / MAR)','Portugal','Madeira',
    'eu','EU international registry / International Shipping Register of Madeira (MAR)',true,
    true,true,'yes','yes',
    'Private yacht fee bands start at 7 m to 24 m, then over 24 m with GT-based annual fee. No owner nationality restrictions.',
    'No universal commercial yacht minimum identified in the supplied 2026 profile. Commercial registration uses fixed + variable fee formula and full commercial compliance.',
    'No public yacht maximum identified. MAR supports private and commercial yachts under the EU/Portuguese international registry framework.',
    'Passenger vessel treatment is case-dependent; passenger vessels and tug/auxiliary vessels have increased fee multipliers.',
    'yes','Available subject to registry process; exact term should be confirmed case by case.','Permanent registration remains subject to annual fees and ongoing certification/compliance.',
    'Open to any nationality. Individuals and companies from any jurisdiction can register directly. EU/EEA and non-EU owners are accepted without nationality restriction.',
    'Foreign company ownership is accepted with no Portuguese/EU company requirement. Madeira IBC-owned entities can access fee incentives.',
    'Representative or local services are normally required for non-resident owners. The Technical Commission of MAR provides one-stop-shop support with IPTM.',
    'Mortgage registration is available. Mortgagor and mortgagee may choose the governing law of the mortgage by written agreement; otherwise Portuguese law applies.',
    'Radio licence and equipment documentation are required separately.',
    'MAR accepts class from major IACS societies and coordinates technical compliance through TC/IPTM.',
    'Tonnage measurement, technical/safety documentation and surveys are required. TC/IPTM surveys cover navigation safety, SOLAS, MARPOL and seafarer working conditions.',
    'Portuguese/EU/international convention framework. Commercial yachts require valid safety/navigability certificates, commercial crew certification and VAT registration for commercial activity.',
    'Safe Manning Document is issued based on tonnage, operating area and programme. STCW and MLC apply to commercial yachts.',
    'Processing is generally efficient through the MAR one-stop-shop structure, subject to technical documentation and survey coordination.',
    'EU flag. Madeira VAT rate is 22%; commercial yachts may receive full refund of VAT paid at registration and zero VAT on repairs, maintenance, fuel and oil supply in open sea where conditions are met.',
    'No nationality restrictions for crew. Portuguese/EU social security may apply for commercial operation depending on employment structure and base.',
    'Proof of ownership; tonnage certificate; deletion certificate where applicable; technical and safety documentation; radio equipment list; company documents where applicable; representative appointment where required.',
    'Full EU flag benefits; no owner nationality restrictions; direct individual or company ownership; transparent fees; commercial VAT refund / zero VAT operational advantages; flexible mortgage governing law; MIBC incentives.',
    'Representative/agent required for non-residents; Portuguese/EU social security and commercial compliance must be managed; mortgage/radio/survey ancillary fees require direct quote; EU VAT treatment remains transaction-specific.',
    '["ABS","BV","DNV","Lloyd''s Register","RINA","ClassNK"]'::jsonb,
    500,500,
    true,true,true,true,
    null,null,
    true,true,
    'No nationality restrictions. Individuals, EU/EEA owners and non-EU owners are eligible.',
    'Companies from any jurisdiction may own the yacht. Madeira IBC-owned entities may receive fee incentives.',
    'No crew nationality restrictions; STCW, MLC and safe manning apply for commercial yachts.',
    'EU flag. Commercial yachts can benefit from VAT refund at registration and zero VAT on qualifying repairs, maintenance, fuel and oil in open sea, subject to Portuguese VAT rules.',
    'Highly respected EU international registry; EU flag status is favourable for insurers and EU operations.',
    '["EU flag","No owner nationality restrictions","Direct personal ownership permitted","Commercial VAT refund potential","Zero VAT operating advantages in open sea","Transparent fee formulas","Flexible mortgage governing law","MIBC fee incentives"]'::jsonb,
    '["Representative/local services normally required","Commercial compliance and Portuguese/EU social security must be managed","Ancillary mortgage/radio/survey fees need direct confirmation","VAT benefits depend on qualifying commercial use"]'::jsonb,
    'https://www.ibc-madeira.com/',
    'International Shipping Register of Madeira (MAR)',
    'https://www.ibc-madeira.com/',
    'https://www.ibc-madeira.com/',
    'high','verified','production_ready',94,
    'madeira-guide-2026-v1',current_date,current_date,
    $$[
      {"title":"Registry overview","body":"The International Shipping Register of Madeira (MAR) is an EU international registry within Portugal's International Business Centre of Madeira. It combines EU flag benefits with unusually broad international-owner access."},
      {"title":"Owner eligibility","rows":[
        {"owner_category":"Any nationality","eligible":"Yes","notes":"No nationality restrictions."},
        {"owner_category":"Individuals","eligible":"Yes","notes":"Direct personal ownership permitted."},
        {"owner_category":"Companies","eligible":"Yes","notes":"Any jurisdiction; no Portuguese/EU company requirement."},
        {"owner_category":"MIBC-owned entities","eligible":"Yes","notes":"May benefit from initial fee exemption and 20% annual fee reduction."}
      ]},
      {"title":"Registration and fees","rows":[
        {"category":"Private 7-24 m","initial":"EUR 500","annual":"EUR 500"},
        {"category":"Private over 24 m","initial":"EUR 500","annual":"EUR 500 + EUR 2/GT"},
        {"category":"Commercial initial","initial":"EUR 1,250 + EUR 200 up to 250 GT + EUR 0.75/GT above 250","annual":"Not applicable"},
        {"category":"Commercial annual","initial":"Not applicable","annual":"EUR 1,000 + EUR 200 up to 250 GT + EUR 0.75/GT above 250"},
        {"category":"MIBC incentive","initial":"100% initial-fee exemption","annual":"20% annual-fee reduction"}
      ]},
      {"title":"VAT and commercial advantages","items":["EU flag and EU customs territory benefits.","Commercial yachts may receive full refund of VAT paid at registration.","Qualifying commercial yachts can receive zero VAT treatment on repairs, maintenance, fuel and oil supply in open sea.","Commercial use requires VAT registration and Portuguese/EU commercial compliance."]},
      {"title":"Mortgage and finance","items":["Mortgage registration is available.","Parties may choose the governing law of the mortgage by written agreement.","If no governing law is selected, Portuguese mortgage law applies.","This is useful for finance parties who prefer English law or another familiar framework."]},
      {"title":"Advisor interpretation","body":"Madeira MAR should sit beside Malta and Cyprus as a leading EU flag option. Its strongest advantage is rare: EU flag benefits without owner nationality restrictions. For commercial yachts, VAT refund and zero VAT operational treatment can make MAR particularly powerful."}
    ]$$::jsonb,
    '{"source":"Madeira MAR Yacht Registration Comprehensive Guide 2026","profile_version":"madeira-guide-2026-v1"}'::jsonb,
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
madeira as (
  select id from upsert_registry
  union
  select id from public.flag_registries where code = 'portugal_madeira'
),
source_upsert as (
  insert into public.flag_sources (
    flag_registry_id, topic, source_type, source_title, official_url,
    checked_at, effective_date, notes, is_official, is_active, source_version, import_key
  )
  select m.id, s.topic, s.source_type, s.source_title, s.official_url,
         current_date, s.effective_date, s.notes, s.is_official, true, 'madeira-guide-2026-v1', s.import_key
  from madeira m
  cross join (
    values
      ('registry_overview','official','International Shipping Register of Madeira (MAR)','https://www.ibc-madeira.com/',null::date,'Internal audit source for MAR registry facts.',true,'madeira-2026-source-registry'),
      ('fees','official','IBC Madeira MAR fee schedule','https://www.ibc-madeira.com/',date '2026-01-01','Internal audit source for MAR fee profile.',true,'madeira-2026-source-fees'),
      ('vat','official','Portuguese VAT / MAR commercial yacht incentives','https://www.ibc-madeira.com/',null::date,'Internal audit source for MAR VAT treatment summary.',true,'madeira-2026-source-vat')
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
select m.id, fee.registration_type, fee.fee_component, fee.amount, fee.currency, fee.formula_text,
       fee.minimum_amount, fee.loa_min, fee.loa_max, fee.gt_min, fee.gt_max, fee.vessel_category,
       fee.validity_period, fee.effective_from, fee.notes, su.id, 'https://www.ibc-madeira.com/',
       'high', current_date, true, 'madeira-guide-2026-v1', fee.import_key,
       jsonb_build_object('profile_version','madeira-guide-2026-v1','component',fee.fee_component)
from madeira m
cross join (
  values
    ('private','Private yacht 7-24 m initial registration',500::numeric,'EUR',null::text,null::numeric,7::numeric,24::numeric,null::numeric,null::numeric,'private yacht','initial',date '2026-01-01','Flat private yacht initial registration fee.', 'madeira-2026-fee-private-7-24-initial'),
    ('private','Private yacht 7-24 m annual fee',500,'EUR',null,null,7,24,null,null,'private yacht','annual',date '2026-01-01','Flat private yacht annual fee.', 'madeira-2026-fee-private-7-24-annual'),
    ('private','Private yacht over 24 m initial registration',500,'EUR',null,null,24,null,null,null,'private yacht','initial',date '2026-01-01','Flat initial registration fee.', 'madeira-2026-fee-private-24-plus-initial'),
    ('private','Private yacht over 24 m annual fee',500,'EUR','EUR 500 + EUR 2 per GT.',500,24,null,null,null,'private yacht','annual',date '2026-01-01','GT-based annual formula.', 'madeira-2026-fee-private-24-plus-annual'),
    ('commercial','Commercial initial fixed fee',1250,'EUR',null,null,null,null,null,null,'commercial yacht','initial',date '2026-01-01','Commercial base initial fee.', 'madeira-2026-fee-commercial-initial-fixed'),
    ('commercial','Commercial initial variable up to 250 GT',200,'EUR',null,null,null,null,null,250,'commercial yacht','initial',date '2026-01-01','Fixed component for first 250 GT.', 'madeira-2026-fee-commercial-initial-u250'),
    ('commercial','Commercial initial variable above 250 GT',0.75,'EUR','EUR 0.75 per GT above 250.',null,null,null,250,null,'commercial yacht','initial',date '2026-01-01','Per GT above 250.', 'madeira-2026-fee-commercial-initial-250-plus'),
    ('commercial','Commercial annual fixed fee',1000,'EUR',null,null,null,null,null,null,'commercial yacht','annual',date '2026-01-01','Commercial base annual fee.', 'madeira-2026-fee-commercial-annual-fixed'),
    ('commercial','Commercial annual variable up to 250 GT',200,'EUR',null,null,null,null,null,250,'commercial yacht','annual',date '2026-01-01','Fixed component for first 250 GT.', 'madeira-2026-fee-commercial-annual-u250'),
    ('commercial','Commercial annual variable above 250 GT',0.75,'EUR','EUR 0.75 per GT above 250.',null,null,null,250,null,'commercial yacht','annual',date '2026-01-01','Per GT above 250.', 'madeira-2026-fee-commercial-annual-250-plus'),
    ('private','IBC licence fee',1000,'EUR',null,null,null,null,null,null,'IBC company','annual',null,'IBC company licence fee benchmark.', 'madeira-2026-fee-ibc-licence'),
    ('private','IBC annual operating fee',1800,'EUR',null,null,null,null,null,null,'IBC company','annual',null,'IBC annual operating fee benchmark.', 'madeira-2026-fee-ibc-operating')
) as fee(registration_type, fee_component, amount, currency, formula_text, minimum_amount, loa_min, loa_max, gt_min, gt_max, vessel_category, validity_period, effective_from, notes, import_key)
left join source_upsert su on su.import_key = 'madeira-2026-source-fees'
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
 where flag_registry_id = (select id from public.flag_registries where code = 'portugal_madeira')
   and confidence_level = 'high'
   and document_category in ('registration','technical','representative','commercial','mortgage','radio','company');

insert into public.flag_required_documents (
  flag_registry_id, registration_type, document_name, document_category,
  is_required, condition_text, confidence_level, sort_order
)
select fr.id, d.registration_type, d.document_name, d.document_category,
       true, d.condition_text, 'high', d.sort_order
from public.flag_registries fr
cross join (
  values
    ('private','Proof of ownership','registration','Bill of Sale or Builder Certificate.',10),
    ('private','Tonnage certificate','technical','Required for registration and fee calculation.',20),
    ('private','Deletion certificate','registration','Required where previously registered.',30),
    ('private','Technical and safety documentation','technical','Required according to yacht profile.',40),
    ('private','Radio equipment list','radio','Required for radio licensing.',50),
    ('private','Company documents','company','Required if company-owned.',60),
    ('private','Representative appointment','representative','Required where applicable for non-resident owners.',70),
    ('commercial','Commercial safety / navigability certificates','commercial','Required for commercial operation.',80),
    ('commercial','Commercial crew certifications','commercial','Required for commercial operation.',90),
    ('commercial','VAT registration file','commercial','Required for commercial activity and VAT treatment.',100),
    ('commercial','Mortgage agreement / governing law election','mortgage','Required where mortgage is registered.',110)
) as d(registration_type, document_name, document_category, condition_text, sort_order)
where fr.code = 'portugal_madeira';
