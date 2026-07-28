-- Yachtworth Flag Advisor: Malta comprehensive profile v1.
-- Keeps source URLs available for internal audit, but the public app card does
-- not display source links.

alter table public.flag_registries
  add column if not exists advisor_sections jsonb not null default '[]'::jsonb;

comment on column public.flag_registries.advisor_sections is
  'Structured public advisory sections for the Flag Advisor card. Intended for professional registry guidance, tables and lists.';

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
    'malta',
    'malta',
    'malta',
    'Malta',
    'Malta',
    'Malta',
    'eu',
    'EU / Malta flag',
    true,
    true,
    true,
    'yes',
    'yes',
    '6 m LOA minimum for private pleasure yachts.',
    '12 m LOA minimum for small commercial yachts below 24 m; commercial yacht rules apply by size and use.',
    'No practical maximum stated for private yachts. Commercial yacht requirements depend on LOA, GT, passenger limits, class and intended operation.',
    'Commercial yachts are generally limited to 12 passengers. Passenger vessels or broader trading profiles require separate merchant vessel analysis.',
    'yes',
    'Provisional registration is issued for 6 months and can be extended up to a cumulative 12 months. It is legally equivalent to permanent registration while in force.',
    'Permanent registration follows completion of ownership, survey, tonnage, deletion and marking requirements. Certificates are issued digitally under the modern Malta process.',
    'Maltese citizens and EU/EEA, Swiss and UK citizens may register personally. Non-EU individuals do not normally register directly in personal name. Non-EU legal entities may register subject to recognition by the Registrar-General. A Maltese limited company is the standard route for many non-EU yacht owners.',
    'Foreign legal entities can be accepted subject to registry recognition. Maltese company ownership remains the cleanest route for non-EU owners and commercial structures.',
    'A resident agent is mandatory for international owners and non-resident owners.',
    'Mortgage registration is available and Malta provides strong secured creditor protections, including priority by registration date/time, executive-title style enforcement, mortgagee notice protections on transfer/deletion and recognition of foreign mortgages. 2025 reforms support electronic mortgage registration and clearer multiple-mortgage priority.',
    'Radio licence / MMSI application is part of the registration workflow and is charged separately.',
    'Commercial and merchant yachts require recognised organisation / IACS class where applicable. Malta recognises ABS, BV, CCS, CRS, DNV, IRClass, KR, LR, ClassNK, PRS, RINA and TL. Small commercial yachts below 24 m should have CE/RCD documentation where applicable.',
    'Private pleasure yachts are normally lighter than commercial yachts. Age and pre-registration survey rules are risk based: under 10 years no survey; 10-15 years survey before or within one month of provisional registration; 15-20 years survey before provisional and dry docking may be required; 20-25 years survey before provisional; over 25 years requires written permission, class survey, condition report and continuity of class. Pleasure yachts and Commercial Yacht Code yachts can be assessed under their own regimes, with class/condition decisive.',
    'Small Commercial Yacht Code 2024 applies from 2024-04-01 for commercial yachts below 24 m. Commercial Yacht Code 2025 applies from 2025-07-01 for commercial yachts 24 m and above, replacing CYC 2020.',
    'Minimum Safe Manning Certificate is mandatory for commercial yachts 24 m and above. Commercial yachts 24 m and above also require a Certificate of Compliance to Trade, normally valid for 5 years with annual intermediate surveys.',
    'Provisional registration is usually processed in approximately 2-3 working days once complete documents and fees are received. Permanent timing depends on survey, tonnage, deletion, marking and commercial compliance documents.',
    'Malta standard VAT rate is 18%. From 2024-01-01 a 12% reduced rate can apply to qualifying short-term yacht hire handed over in Malta where the aggregate charter period with the same person within 12 months does not exceed 35 days / 5 weeks; excess days are taxed at 18%. Long-term leasing above 90 days follows use-and-enjoyment rules. Commercial yachts may access Article 148 VAT exemptions for commercial supplies, bunkers, equipment and repairs where conditions are met. Commercial yacht tonnage tax can apply through licensed shipping organisation structures.',
    'No general crew nationality restriction is stated. Valid STCW certificates and Transport Malta endorsements are required where applicable. MLC applies to commercial yachts.',
    'Provisional registration application; proof of owner qualification; resident agent appointment where required; ownership declaration; radio licence application; fee payment. Permanent registration normally requires Bill of Sale or Builder Certificate, Certificate of Survey, International Tonnage Certificate above 24 m, Marking Note, Deletion Certificate, commercial Certificate of Compliance and Minimum Safe Manning Certificate where applicable, and surrender of the provisional certificate.',
    'Strong EU flag; excellent commercial yacht framework; recognised by banks and insurers; robust mortgage regime; clear Malta company route for non-EU owners; established VAT and tonnage tax planning environment; English-language maritime administration; digital certificates.',
    'Non-EU individuals cannot usually register directly in personal name; commercial/VAT/tax structuring needs specialist advice; Malta does not replace local French, Italian or other coastal state charter requirements; commercial yachts require class, survey, manning and compliance work.',
    '["ABS","BV","CCS","CRS","DNV","IRClass","KR","LR","ClassNK","PRS","RINA","TL"]'::jsonb,
    140,
    140,
    true,
    true,
    true,
    true,
    2,
    3,
    true,
    true,
    'EU/EEA, Swiss and UK individuals may register personally. Non-EU individuals normally need a recognised legal entity or Maltese company structure.',
    'Foreign legal entity recognition is possible. Maltese company ownership is the usual route for non-EU owners.',
    'No nationality restrictions; STCW/endorsements and MLC/commercial manning apply where relevant.',
    'EU VAT and charter framework is strong but must be structured. Malta 18% VAT, qualifying 12% short-term hire, long-term use-and-enjoyment rules and commercial Article 148 exemptions may be relevant.',
    'Strong EU market recognition and bank/insurance acceptance, especially for commercial yachts and financed yachts.',
    '["EU flag","Strong commercial yacht code","Mortgage friendly","Bank and insurance friendly","Maltese company route for non-EU owners","VAT and tonnage-tax planning framework","Fast provisional registration"]'::jsonb,
    '["Non-EU personal ownership is not the direct route","Commercial use needs class, manning and survey compliance","VAT and charter treatment requires specialist advice","Local coastal state charter rules still apply"]'::jsonb,
    'https://www.transport.gov.mt/maritime',
    'Merchant Shipping Directorate / Transport Malta',
    'https://www.transport.gov.mt/maritime',
    'https://www.transport.gov.mt/maritime',
    'high',
    'comprehensive_2026_profile',
    'production_ready',
    92,
    'malta-guide-2026-v1',
    current_date,
    current_date,
    $$[
      {
        "title": "Registry overview",
        "body": "Malta operates one of the largest yacht registers in the world and the largest register in the EU. The registry is administered by the Merchant Shipping Directorate within Transport Malta and is open to private yachts, commercial yachts and vessels under construction."
      },
      {
        "title": "Owner eligibility",
        "rows": [
          {"owner_category":"Maltese citizen","eligible":"Yes","notes":"May register personally."},
          {"owner_category":"EU / EEA / Swiss / UK citizen","eligible":"Yes","notes":"May register personally."},
          {"owner_category":"Non-EU individual","eligible":"No direct personal route","notes":"Use recognised legal entity or Maltese company structure."},
          {"owner_category":"Non-EU legal entity","eligible":"Case dependent","notes":"Subject to recognition by the Registrar-General."},
          {"owner_category":"Maltese limited company","eligible":"Yes","notes":"Standard route for non-EU owners and commercial structures."}
        ]
      },
      {
        "title": "Registration categories",
        "rows": [
          {"category":"Private pleasure yacht","minimum":"6 m LOA","commercial_use":"No","code":"Yacht code not required."},
          {"category":"Small commercial yacht","minimum":"12 m LOA and below 24 m","commercial_use":"Yes, up to 12 passengers","code":"Small Commercial Yacht Code 2024 from 2024-04-01."},
          {"category":"Commercial yacht 24 m+","minimum":"24 m LOA","commercial_use":"Yes, up to 12 passengers","code":"Commercial Yacht Code 2025 from 2025-07-01."},
          {"category":"Commercial yacht 15 m+ outside yacht code","minimum":"15 m LOA","commercial_use":"Possible","code":"May be assessed under merchant vessel rules."}
        ]
      },
      {
        "title": "Registration process",
        "items": [
          "Provisional registration is normally issued for 6 months and can be extended up to a cumulative 12 months.",
          "Processing is usually around 2-3 working days once the file is complete.",
          "Provisional registration is legally equivalent to permanent registration while in force.",
          "Permanent registration requires completion of ownership, survey, tonnage, deletion, marking and commercial compliance documents.",
          "Malta certificates are issued digitally under the modern process."
        ]
      },
      {
        "title": "Indicative registry fees",
        "rows": [
          {"profile":"Private below 24 m and below 50 GT","initial":"EUR 140","annual":"EUR 140"},
          {"profile":"Private below 24 m and 50 GT or above","initial":"EUR 265","annual":"EUR 265"},
          {"profile":"Private 24 m and above","initial":"EUR 255 + EUR 0.25/NT, minimum EUR 187.50","annual":"Same formula"},
          {"profile":"Commercial below 24 m","initial":"EUR 265","annual":"EUR 265"},
          {"profile":"Commercial 24 m and above","initial":"EUR 625 first year","annual":"EUR 1,095 thereafter"},
          {"profile":"Mortgage registration","initial":"EUR 500","annual":"N/A"},
          {"profile":"Power of attorney / mandate","initial":"EUR 100","annual":"N/A"}
        ]
      },
      {
        "title": "Age and survey rules",
        "rows": [
          {"age":"Under 10 years","survey_position":"No pre-registration survey normally required."},
          {"age":"10-15 years","survey_position":"Survey before or within one month of provisional registration."},
          {"age":"15-20 years","survey_position":"Survey before provisional registration; dry docking may be required."},
          {"age":"20-25 years","survey_position":"Survey before provisional registration; merchant vessels 20+ may face acceptance limits."},
          {"age":"Over 25 years","survey_position":"Written permission, class survey, condition report and continuity of class required."}
        ]
      },
      {
        "title": "VAT and tax",
        "items": [
          "Standard Malta VAT rate is 18%.",
          "A 12% reduced rate can apply from 2024-01-01 to qualifying short-term yacht hire handed over in Malta where the aggregate hire with the same person within 12 months does not exceed 35 days / 5 weeks.",
          "Long-term leasing above 90 days follows use-and-enjoyment rules, taxing EU waters use and excluding non-EU waters use where conditions are met.",
          "Commercial yacht operations may access Article 148 VAT exemptions for qualifying supplies, bunkers, equipment, repairs and maintenance.",
          "Commercial yachts held in licensed shipping organisation structures may use Malta tonnage tax instead of ordinary corporate income tax where conditions are satisfied."
        ]
      },
      {
        "title": "Mortgage and finance",
        "items": [
          "Malta offers a robust mortgage register based on UK Merchant Shipping concepts.",
          "Mortgage priority is tied to registration date and time.",
          "Mortgagees can receive notice protections on transfer and deletion.",
          "Foreign mortgages can be recognised.",
          "2025 reforms support electronic mortgage registration and clearer multiple-mortgage priority."
        ]
      },
      {
        "title": "Crew, class and commercial compliance",
        "items": [
          "No general crew nationality restriction is stated.",
          "Valid STCW certification and Transport Malta endorsements are required where applicable.",
          "MLC applies to commercial yachts.",
          "Commercial yachts 24 m and above require Minimum Safe Manning and a Certificate of Compliance to Trade.",
          "Recognised class / RO involvement is required for commercial and merchant yacht workflows where applicable."
        ]
      },
      {
        "title": "Advisor interpretation",
        "body": "Malta is usually one of the strongest choices for EU-facing commercial charter yachts, financed yachts, and non-EU owners willing to use a Maltese company or recognised legal entity. It is not a shortcut around French, Italian or other coastal state charter rules, and non-EU individuals should not assume direct personal registration is available."
      }
    ]$$::jsonb,
    '{"source":"Malta Yacht Registration Comprehensive Guide 2026","profile_version":"malta-guide-2026-v1"}'::jsonb,
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
malta as (
  select id from upsert_registry
  union
  select id from public.flag_registries where code = 'malta'
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
    m.id,
    s.topic,
    s.source_type,
    s.source_title,
    s.official_url,
    current_date,
    s.effective_date,
    s.notes,
    s.is_official,
    true,
    'malta-guide-2026-v1',
    s.import_key
  from malta m
  cross join (
    values
      ('registry_overview','official','Transport Malta maritime registry','https://www.transport.gov.mt/maritime',null::date,'Internal audit source for Malta registry facts.',true,'malta-2026-source-registry'),
      ('commercial_codes','official','Malta commercial yacht code framework','https://www.transport.gov.mt/maritime',date '2025-07-01','Internal audit source for CYC 2025 and sCYC 2024 notes.',true,'malta-2026-source-codes'),
      ('fees','official','Malta registry fee schedule','https://www.transport.gov.mt/maritime',null::date,'Internal audit source for registry fee rules.',true,'malta-2026-source-fees')
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
  m.id,
  f.registration_type,
  f.fee_component,
  f.amount,
  f.currency,
  f.formula_text,
  f.minimum_amount,
  f.loa_min,
  f.loa_max,
  f.gt_min,
  f.gt_max,
  f.vessel_category,
  f.validity_period,
  f.effective_from,
  f.notes,
  su.id,
  'https://www.transport.gov.mt/maritime',
  'high',
  current_date,
  true,
  'malta-guide-2026-v1',
  f.import_key,
  jsonb_build_object('profile_version','malta-guide-2026-v1','component',f.fee_component)
from malta m
cross join (
  values
    ('private','Initial registration - private below 24 m below 50 GT',140::numeric,'EUR',null::text,null::numeric,null::numeric,23.999::numeric,null::numeric,49.999::numeric,'private pleasure yacht','initial',null::date,'Indicative official registry fee.', 'malta-2026-fee-private-u24-u50-initial'),
    ('private','Annual fee - private below 24 m below 50 GT',140,'EUR',null,null,null,23.999,null,49.999,'private pleasure yacht','annual',null,'Indicative annual registry fee.', 'malta-2026-fee-private-u24-u50-annual'),
    ('private','Initial registration - private below 24 m 50 GT or above',265,'EUR',null,null,null,23.999,50,null,'private pleasure yacht','initial',null,'Indicative official registry fee.', 'malta-2026-fee-private-u24-50plus-initial'),
    ('private','Annual fee - private below 24 m 50 GT or above',265,'EUR',null,null,null,23.999,50,null,'private pleasure yacht','annual',null,'Indicative annual registry fee.', 'malta-2026-fee-private-u24-50plus-annual'),
    ('private','Registration / annual fee - private 24 m and above',null,'EUR','EUR 255 + EUR 0.25 per NT, minimum EUR 187.50',187.50,24,null,null,null,'private pleasure yacht','initial_or_annual',null,'Formula requires net tonnage.', 'malta-2026-fee-private-24plus-formula'),
    ('commercial','Initial registration - commercial below 24 m',265,'EUR',null,null,12,23.999,null,null,'small commercial yacht','initial',date '2024-04-01','Small commercial yacht under sCYC profile.', 'malta-2026-fee-commercial-u24-initial'),
    ('commercial','Annual fee - commercial below 24 m',265,'EUR',null,null,12,23.999,null,null,'small commercial yacht','annual',date '2024-04-01','Small commercial yacht under sCYC profile.', 'malta-2026-fee-commercial-u24-annual'),
    ('commercial','Initial registration - commercial 24 m and above',625,'EUR',null,null,24,null,null,null,'commercial yacht','initial',date '2025-07-01','Commercial yacht 24 m+ under CYC profile.', 'malta-2026-fee-commercial-24plus-initial'),
    ('commercial','Annual fee - commercial 24 m and above',1095,'EUR',null,null,24,null,null,null,'commercial yacht','annual',date '2025-07-01','Commercial yacht 24 m+ under CYC profile.', 'malta-2026-fee-commercial-24plus-annual'),
    ('private','Mortgage registration',500,'EUR',null,null,null,null,null,null,'mortgage','one_off',null,'Applies when mortgage registration is required.', 'malta-2026-fee-mortgage-private'),
    ('commercial','Mortgage registration',500,'EUR',null,null,null,null,null,null,'mortgage','one_off',null,'Applies when mortgage registration is required.', 'malta-2026-fee-mortgage-commercial'),
    ('private','Power of attorney / mandate',100,'EUR',null,null,null,null,null,null,'mandate','one_off',null,'May apply to registration or mortgage documentation.', 'malta-2026-fee-poa-private'),
    ('commercial','Power of attorney / mandate',100,'EUR',null,null,null,null,null,null,'mandate','one_off',null,'May apply to registration or mortgage documentation.', 'malta-2026-fee-poa-commercial'),
    ('commercial','Pre-registration survey - below 24 m no cargo capacity',500,'EUR',null,null,null,23.999,null,null,'survey','one_off',null,'Applies where pre-registration survey is required.', 'malta-2026-fee-survey-u24'),
    ('commercial','Pre-registration survey - below 500 GT',1500,'EUR',null,null,null,null,null,499.999,'survey','one_off',null,'Applies where pre-registration survey is required.', 'malta-2026-fee-survey-u500gt'),
    ('commercial','Pre-registration survey - shipping company 5+ Malta vessels',3000,'EUR',null,null,null,null,null,null,'survey','one_off',null,'Specific shipping-company profile.', 'malta-2026-fee-survey-5plus-vessels'),
    ('commercial','Pre-registration survey - 500 GT and above',5000,'EUR',null,null,null,null,500,null,'survey','one_off',null,'Applies where pre-registration survey is required.', 'malta-2026-fee-survey-500plusgt'),
    ('commercial','Tonnage tax 0-2500 NT',null,'EUR','Base EUR 1,000, subject to age adjustments and eligibility.',null,null,null,null,null,'tonnage tax','annual',null,'Commercial yacht tonnage tax for licensed shipping organisation structures.', 'malta-2026-fee-tonnage-tax-0-2500'),
    ('commercial','Tonnage tax 2500-8000 NT',null,'EUR','EUR 1,000 + EUR 0.40 per NT over 2,500, subject to age adjustments.',null,null,null,null,null,'tonnage tax','annual',null,'Commercial yacht tonnage tax for licensed shipping organisation structures.', 'malta-2026-fee-tonnage-tax-2500-8000'),
    ('commercial','Tonnage tax 8000-10000 NT',null,'EUR','EUR 3,200 + EUR 0.19 per NT over 8,000, subject to age adjustments.',null,null,null,null,null,'tonnage tax','annual',null,'Commercial yacht tonnage tax for licensed shipping organisation structures.', 'malta-2026-fee-tonnage-tax-8000-10000')
) as f(registration_type, fee_component, amount, currency, formula_text, minimum_amount, loa_min, loa_max, gt_min, gt_max, vessel_category, validity_period, effective_from, notes, import_key)
left join source_upsert su on su.import_key = 'malta-2026-source-fees'
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
 where flag_registry_id = (select id from public.flag_registries where code = 'malta')
   and confidence_level = 'high'
   and document_category in ('provisional','permanent','commercial');

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
    ('private','Application for registration','provisional','Required for provisional registration.',10),
    ('private','Proof of owner qualification','provisional','Required to confirm eligibility.',20),
    ('private','Resident agent appointment','provisional','Required for international / non-resident owners.',30),
    ('private','Ownership declaration','provisional','Required for provisional registration.',40),
    ('private','Radio licence application','provisional','Required where radio / MMSI is needed.',50),
    ('private','Bill of Sale or Builder Certificate','permanent','Required for permanent registration.',60),
    ('private','Certificate of Survey','permanent','Required where applicable by vessel profile and age.',70),
    ('private','International Tonnage Certificate','permanent','Required for yachts above 24 m.',80),
    ('private','Marking Note','permanent','Required before permanent certificate issue.',90),
    ('private','Deletion Certificate','permanent','Required for reflag / previously registered yachts.',100),
    ('commercial','Application for registration','provisional','Required for provisional registration.',110),
    ('commercial','Proof of owner qualification','provisional','Required to confirm eligibility.',120),
    ('commercial','Resident agent appointment','provisional','Required for international / non-resident owners.',130),
    ('commercial','Commercial Yacht Code compliance file','commercial','Required according to LOA, GT and operating profile.',140),
    ('commercial','Certificate of Compliance to Trade','commercial','Required for commercial yachts 24 m and above.',150),
    ('commercial','Minimum Safe Manning Certificate','commercial','Required for commercial yachts 24 m and above.',160),
    ('commercial','International Tonnage Certificate','permanent','Required for yachts above 24 m.',170),
    ('commercial','Deletion Certificate','permanent','Required for reflag / previously registered yachts.',180)
) as d(registration_type, document_name, document_category, condition_text, sort_order)
where fr.code = 'malta';
