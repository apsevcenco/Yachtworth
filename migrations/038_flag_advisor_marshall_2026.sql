-- Yachtworth Flag Advisor: Marshall Islands comprehensive profile v1.
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
    'marshall',
    'marshall',
    'marshall',
    'Marshall Islands',
    'Republic of the Marshall Islands',
    'Republic of the Marshall Islands',
    'open',
    'Open international registry / RMI Maritime Registry administered by IRI',
    false,
    true,
    true,
    'yes',
    'yes',
    'Private yacht registration starts from 12 m. Private Yacht Limited Charter starts from 18 m and below 500 GT. YET and commercial yacht routes normally start from 24 m.',
    'Commercial yacht registration normally starts from 24 m. PYLC is available from 18 m below 500 GT for limited charter. Passenger yacht treatment is case-dependent.',
    'No public maximum size or tonnage stated for private or commercial yachts. Passenger yacht / PAXY cases require additional safety assessment.',
    'Standard yacht commercial / PYLC / YET profile is up to 12 passengers. PAXY route can address yachts carrying more than 12 passengers, subject to additional requirements.',
    'no',
    'No provisional registration is available in the 2026 profile. A permanent certificate is issued directly once documents are complete.',
    'Registration is valid for life while annual tonnage taxes and ongoing registry obligations are maintained. A 3-year programme can exist for eligible private yachts.',
    'A yacht must be owned by a legal entity. Eligible owners include RMI entities, Marshall Islands IBCs and foreign companies qualified as Foreign Maritime Entities. Personal individual registration is not permitted.',
    'Any foreign company can be qualified as a Foreign Maritime Entity. International owners commonly use an RMI IBC, UK Ltd, Delaware LLC or other corporate vehicle. No nationality restrictions apply to beneficial owners.',
    'Registration and entity services are handled through IRI and its global office / agent network. The yacht does not need to be physically present in the Marshall Islands.',
    'Mortgage registration is available through the RMI ship registry framework. The system is internationally recognised, supports electronic registration and priority is determined by registration date/time.',
    'Radio licence, MMSI and call sign are handled separately. Permanent radio licence validity is 4 years; temporary urgent licences can be issued for 90 days.',
    'RMI accepts class from major IACS societies. Private yachts over 24 m and commercial yachts follow the RMI Yacht Code 2026; ISM/ISPS apply above 500 GT for commercial yachts.',
    'Private yachts below 24 m, below 20 years old and classed may not require a registration survey. Private yachts above 24 m, commercial yachts and yachts above 20 years are subject to code, class and inspection requirements.',
    'RMI Yacht Code 2026 (MI-103), effective 1 January 2026. It replaces the 2021 code and updates construction, stability, machinery, alternative fuels, lithium battery/fire safety, survey and certification rules.',
    'Safe Manning Document is issued by RMI based on tonnage, operating area and programme. STCW applies to senior positions and commercial/larger private yacht operations. MLC applies to commercial yachts.',
    'Approval is commonly available within 48 hours once documents are complete. Registration can be completed remotely through IRI offices.',
    'Marshall Islands has 0% corporate income tax, capital gains tax, VAT and withholding tax at RMI level. Annual tonnage tax is a registry fee. EU VAT/customs treatment remains separate for EU waters and charters.',
    'No nationality restrictions for crew. STCW, MLC, safe manning, ISM and ISPS requirements depend on yacht size and operation. This provides high crew flexibility compared with EU social security-heavy regimes.',
    'Three preferred names; corporate authority or power of attorney; Builder Certificate or Bill of Sale; deletion certificate where applicable; GT/NT evidence; protocol of delivery and acceptance where available; third-party liability insurance; commercial certification where applicable; due diligence for beneficial owners; radio documents and mortgage documents where applicable.',
    'Cost-effective open registry; fast remote registration; White List Paris and Tokyo MoU; Qualship 21 status; strong mortgage system; no owner nationality restriction; flexible crew rules; PYLC/YET limited charter routes; easy US cruising permit profile.',
    'Entity-only ownership; no provisional registration; non-EU VAT/customs planning required; less premium Mediterranean yacht prestige than Cayman / Red Ensign; age over 20 years can trigger additional inspection; YET/PYLC limited to specific conditions and jurisdictions.',
    '["ABS","BV","DNV","Lloyd''s Register","RINA","ClassNK"]'::jsonb,
    550,
    750,
    true,
    false,
    true,
    true,
    2,
    2,
    true,
    true,
    'No nationality restrictions for beneficial owners, but ownership must be through a legal entity. Individual personal yacht registration is not permitted.',
    'RMI IBC, RMI entity or foreign company qualified as an FME. Existing foreign companies can be qualified; new RMI IBC formation is common.',
    'No crew nationality restrictions. STCW, safe manning, MLC, ISM and ISPS apply according to yacht profile.',
    'Non-EU flag. RMI has no VAT, but EU VAT/customs, Temporary Admission, importation and charter VAT must be structured separately.',
    'Widely accepted international registry with strong commercial shipping reputation, Paris/Tokyo MoU White List status and USCG Qualship 21. Slightly less premium in Mediterranean yachting than Cayman / Red Ensign for very large yachts.',
    '["Cost-effective open registry","Fast 48-hour approval when complete","Paris and Tokyo MoU White List","USCG Qualship 21 status","Strong mortgage register","No owner nationality restrictions","Flexible crew rules","PYLC and YET limited charter options","Easy US cruising permit profile"]'::jsonb,
    '["Entity-only ownership; no direct personal registration","No provisional registration route in the 2026 profile","Non-EU VAT and customs planning required","Less premium Mediterranean prestige than Cayman / Red Ensign","Additional inspection likely for yachts over 20 years","YET/PYLC limited to eligible yachts and jurisdictions"]'::jsonb,
    'https://www.register-iri.com/',
    'Republic of the Marshall Islands Maritime Registry / International Registries, Inc.',
    'https://www.register-iri.com/',
    'https://www.register-iri.com/',
    'high',
    'verified',
    'production_ready',
    91,
    'marshall-guide-2026-v1',
    current_date,
    current_date,
    $$[
      {
        "title": "Registry overview",
        "body": "The Republic of the Marshall Islands Maritime Registry is administered by International Registries, Inc. It is one of the largest international registries by gross tonnage and is included on both the Paris and Tokyo MoU White Lists, with US Coast Guard Qualship 21 status."
      },
      {
        "title": "Strategic position",
        "items": [
          "Open international registry administered globally by IRI.",
          "White List status under Paris and Tokyo MoU reduces port state control risk.",
          "Qualship 21 status supports US operations and risk perception.",
          "RMI-flagged vessels can obtain a US cruising permit, simplifying repeated US port calls.",
          "The flag is highly practical and cost-efficient, but is generally less premium in Mediterranean yacht perception than Cayman / Red Ensign."
        ]
      },
      {
        "title": "Owner eligibility",
        "rows": [
          {"owner_category":"RMI nationals / RMI entities","eligible":"Yes","notes":"Individuals and RMI-incorporated entities are eligible, but yacht ownership must be through an entity."},
          {"owner_category":"Foreign company qualified as FME","eligible":"Yes","notes":"Any foreign company can be registered as a Foreign Maritime Entity qualified in the RMI."},
          {"owner_category":"Marshall Islands IBC","eligible":"Yes","notes":"Common yacht-holding vehicle for international owners."},
          {"owner_category":"Individual personal ownership","eligible":"No","notes":"A yacht can only be registered under a legal entity, not directly under an individual."},
          {"owner_category":"Any nationality beneficial owner","eligible":"Yes","notes":"No nationality restrictions for beneficial owners."}
        ]
      },
      {
        "title": "Holding structure and due diligence",
        "items": [
          "The yacht may be held by an existing foreign company qualified as FME or by a newly incorporated Marshall Islands IBC.",
          "UK Ltd, Delaware LLC and similar corporate vehicles can be used if qualified through the registry process.",
          "The process can be completed remotely; the yacht does not need to be physically present in the Marshall Islands.",
          "Due diligence commonly includes notarised and apostilled ID/passport copies, proof of address, translations where needed and possible source-of-funds disclosure."
        ]
      },
      {
        "title": "Registration categories",
        "rows": [
          {"category":"Private Yacht","minimum":"12 m","gt_limit":"No maximum","framework":"RMI Yacht Code MI-103; Small Yacht Code below 24 m; Large Yacht Code at 24 m and above."},
          {"category":"Private Yacht Limited Charter (PYLC)","minimum":"18 m","gt_limit":"Below 500 GT","framework":"Up to 84 charter days/year; lighter limited-charter route where full commercial compliance is not required."},
          {"category":"Yacht Engaged in Trade (YET)","minimum":"24 m","gt_limit":"No maximum","framework":"Up to 84 charter days/year; YET Compliance Certificate; recognised in France, Monaco, Croatia, Greece and UAE."},
          {"category":"Commercial Yacht","minimum":"24 m","gt_limit":"No maximum","framework":"Full RMI Yacht Code 2026; ISM/ISPS above 500 GT; full STCW crew; DOC/SMC."},
          {"category":"Passenger Yacht (PAXY)","minimum":"Case-dependent","gt_limit":"No maximum","framework":"For yachts carrying more than 12 passengers, with additional safety requirements."},
          {"category":"Yacht under construction","minimum":"Available","gt_limit":"No maximum","framework":"Registration during build is available."}
        ]
      },
      {
        "title": "RMI Yacht Code 2026",
        "items": [
          "RMI Yacht Code 2026 came into force on 1 January 2026 and replaces the 2021 Code.",
          "New builds with contracts signed on or after 1 January 2026 must comply fully.",
          "Pre-2026 projects may continue under the 2021 Code at Administrator discretion if keel laying occurs within the accepted window.",
          "Existing yachts are not retroactively forced into the 2026 Code unless qualifying modifications are undertaken.",
          "Major conversions and refits are treated as new builds for the affected sections."
        ]
      },
      {
        "title": "2026 Code technical updates",
        "items": [
          "Revised hull construction, watertight integrity, subdivision and stability requirements.",
          "Mandatory lightweight survey every 5 years; re-inclining test where weight changes exceed thresholds.",
          "Clearer steering and propulsion redundancy expectations.",
          "References to the IMO IGF Code for hybrid, LNG and low-flashpoint fuel systems.",
          "Updated fire safety for 500 GT+ yachts, including lithium-ion battery storage / charging spaces.",
          "Expanded requirements for galleys, saunas and workshops.",
          "Clarified role of Recognised Organisations and approved independent yacht inspectors."
        ]
      },
      {
        "title": "Registration process",
        "items": [
          "Form entity or qualify an existing foreign company as FME if needed.",
          "Prepare three preferred vessel names, corporate authority / power of attorney and ownership documents.",
          "Provide Builder Certificate or Bill of Sale, deletion certificate if applicable, GT/NT evidence, third-party liability insurance and commercial certification where relevant.",
          "Submit through any IRI global office.",
          "Approval is typically available within 48 hours once documents are complete.",
          "No provisional registration route is used in this 2026 profile; permanent certificate is issued directly."
        ]
      },
      {
        "title": "Core registry fees",
        "rows": [
          {"fee_component":"Registration fee below 24 m","amount":"USD 550","notes":"Includes Permanent Certificate of Registry."},
          {"fee_component":"Annual tonnage tax below 24 m","amount":"USD 750","notes":"Annual registry fee."},
          {"fee_component":"Agent service fee","amount":"USD 350","notes":"Indicative one-time provider fee."},
          {"fee_component":"Company formation if needed","amount":"USD 300","notes":"Indicative setup cost for UK Ltd / Delaware LLC or similar route."},
          {"fee_component":"Existing company total below 24 m","amount":"Approx. USD 1,650","notes":"Registration + annual tonnage tax + agent fee."},
          {"fee_component":"New company total below 24 m","amount":"Approx. USD 1,950","notes":"Existing company route plus company formation."}
        ]
      },
      {
        "title": "Radio and optional fees",
        "rows": [
          {"service":"Temporary radio licence","amount":"USD 100","validity":"90 days"},
          {"service":"First temporary renewal","amount":"USD 125","validity":"90 days"},
          {"service":"Second/subsequent temporary renewal","amount":"USD 150","validity":"90 days"},
          {"service":"Permanent radio licence","amount":"USD 300","validity":"4 years"},
          {"service":"Permanent radio renewal","amount":"USD 200","validity":"4 years"},
          {"service":"Change of vessel name","amount":"USD 250","validity":"One-time"},
          {"service":"Duplicate Certificate of Registry","amount":"USD 300","validity":"One-time"},
          {"service":"Certificate of Permission for Sale and Re-registration","amount":"USD 250","validity":"One-time"},
          {"service":"Certificate of Cancellation","amount":"USD 200","validity":"One-time"},
          {"service":"Certified copy of registry document","amount":"USD 375","validity":"One-time"},
          {"service":"DHL courier delivery","amount":"USD 150","validity":"One-time"}
        ]
      },
      {
        "title": "Industry cost benchmarks",
        "rows": [
          {"vessel_profile":"Private below 24 m","initial_registration":"Approx. USD 2,000-4,000","annual_total":"Approx. USD 750-1,500"},
          {"vessel_profile":"Private above 24 m / Commercial","initial_registration":"Approx. USD 6,000-15,000","annual_total":"Approx. USD 1,500-3,500"},
          {"vessel_profile":"Typical annual all-in benchmark","initial_registration":"Variable","annual_total":"Approx. USD 5,000-10,000"}
        ]
      },
      {
        "title": "Tax environment",
        "items": [
          "RMI has 0% corporate income tax at RMI level.",
          "RMI has 0% capital gains tax, VAT and withholding tax.",
          "Annual tonnage tax is a registry fee, not corporate income tax.",
          "Beneficial owners must comply with their own tax residence rules and disclose the company and yacht where required.",
          "EU VAT exposure is separate because RMI is non-EU."
        ]
      },
      {
        "title": "Crew and manning",
        "items": [
          "No crew nationality restrictions.",
          "STCW is required for senior positions on commercial and larger private yachts.",
          "Safe Manning Document is issued by RMI based on tonnage, operating area and programme.",
          "MLC 2006 applies to commercial yachts.",
          "ISM/ISPS are mandatory for commercial yachts above 500 GT."
        ]
      },
      {
        "title": "Classification and survey",
        "items": [
          "RMI accepts class from all major IACS societies.",
          "Private yachts below 24 m and below 20 years old may not require a registration survey where classed.",
          "Private yachts above 24 m and commercial yachts follow RMI Yacht Code 2026 survey and class requirements.",
          "A lightweight survey is mandatory every 5 years under the 2026 Code.",
          "Yachts over 20 years old require additional Registry Administration evaluation / inspection."
        ]
      },
      {
        "title": "Mortgage and finance",
        "items": [
          "Mortgage registration is available through the RMI ship registry framework.",
          "The mortgage framework is internationally recognised.",
          "Priority is determined by registration date/time.",
          "Electronic registration is available through IRI systems.",
          "Larger yacht initial cost including mortgage can vary materially with GT."
        ]
      },
      {
        "title": "PYLC and YET programmes",
        "items": [
          "PYLC applies to private yachts from 18 m and below 500 GT.",
          "PYLC allows up to 84 charter days per calendar year and up to 12 passengers in commercial use.",
          "YET applies to private yachts from 24 m and requires a YET Compliance Certificate.",
          "YET is available in recognised jurisdictions including France, Monaco, Croatia, Greece and UAE.",
          "YET allows up to 84 charter days per year.",
          "During YET charter periods, the yacht is treated as commercial and full commercial standards apply at all times.",
          "YET does not extend to the Caribbean, so Mediterranean / Caribbean split-use requires operational planning."
        ]
      },
      {
        "title": "Advisor interpretation",
        "body": "Marshall Islands is a cost-effective and pragmatic alternative to Cayman. It is especially attractive where the owner prioritises cost, speed, flexible crew rules, US cruising practicality and limited charter via PYLC/YET. The main trade-offs are non-EU VAT planning, entity-only ownership, no provisional registration and slightly lower premium Mediterranean yacht perception than Red Ensign flags."
      }
    ]$$::jsonb,
    '{"source":"Marshall Islands Yacht Registration Comprehensive Guide 2026","profile_version":"marshall-guide-2026-v1"}'::jsonb,
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
marshall as (
  select id from upsert_registry
  union
  select id from public.flag_registries where code = 'marshall'
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
    'marshall-guide-2026-v1',
    s.import_key
  from marshall m
  cross join (
    values
      ('registry_overview','official','Republic of the Marshall Islands Maritime Registry / IRI','https://www.register-iri.com/',null::date,'Internal audit source for RMI registry facts.',true,'marshall-2026-source-registry'),
      ('yacht_code','official','RMI Yacht Code 2026 MI-103','https://www.register-iri.com/',date '2026-01-01','Internal audit source for RMI Yacht Code 2026 profile.',true,'marshall-2026-source-code'),
      ('fees','industry','Marshall Islands yacht registration fee benchmarks','https://www.register-iri.com/',null::date,'Internal audit source for fee benchmarks from supplied guide.',false,'marshall-2026-source-fees')
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
  'https://www.register-iri.com/',
  'high',
  current_date,
  true,
  'marshall-guide-2026-v1',
  fee.import_key,
  jsonb_build_object('profile_version','marshall-guide-2026-v1','component',fee.fee_component)
from marshall m
cross join (
  values
    ('private','Registration fee below 24 m',550::numeric,'USD',null::text,null::numeric,12::numeric,23.999::numeric,null::numeric,null::numeric,'private yacht below 24 m','initial',null::date,'Includes Permanent Certificate of Registry.', 'marshall-2026-fee-registration-u24-private'),
    ('private','Annual tonnage tax below 24 m',750,'USD',null,null,12,23.999,null,null,'private yacht below 24 m','annual',null,'Annual tonnage tax / registry fee.', 'marshall-2026-fee-tonnage-tax-u24-private'),
    ('private','Agent service fee',350,'USD',null,null,null,null,null,null,'agent service','one_off',null,'Indicative one-time provider fee; varies by provider.', 'marshall-2026-fee-agent-private'),
    ('private','Company formation if needed',300,'USD',null,null,null,null,null,null,'company setup','one_off',null,'Indicative setup cost from supplied guide.', 'marshall-2026-fee-company-private'),
    ('private','Existing company total below 24 m',1650,'USD','Registration + annual tonnage tax + agent fee.',null,12,23.999,null,null,'private yacht below 24 m','initial_plus_annual',null,'Indicative all-in route using existing company.', 'marshall-2026-fee-total-existing-u24-private'),
    ('private','New company total below 24 m',1950,'USD','Registration + annual tonnage tax + agent fee + company formation.',null,12,23.999,null,null,'private yacht below 24 m','initial_plus_annual',null,'Indicative all-in route with new company.', 'marshall-2026-fee-total-new-u24-private'),
    ('private','Temporary radio licence',100,'USD',null,null,null,null,null,null,'radio licence','90_days',null,'Urgent temporary radio licence.', 'marshall-2026-fee-radio-temp'),
    ('private','First temporary radio renewal',125,'USD',null,null,null,null,null,null,'radio licence','90_days',null,'First renewal of temporary licence.', 'marshall-2026-fee-radio-temp-renewal-first'),
    ('private','Second/subsequent temporary radio renewal',150,'USD',null,null,null,null,null,null,'radio licence','90_days',null,'Second or subsequent temporary renewal.', 'marshall-2026-fee-radio-temp-renewal-subsequent'),
    ('private','Permanent radio licence',300,'USD',null,null,null,null,null,null,'radio licence','4_years',null,'Permanent MMSI / call sign licence.', 'marshall-2026-fee-radio-permanent'),
    ('private','Permanent radio renewal',200,'USD',null,null,null,null,null,null,'radio licence','4_years',null,'Permanent radio licence renewal.', 'marshall-2026-fee-radio-permanent-renewal'),
    ('private','Change of vessel name',250,'USD',null,null,null,null,null,null,'optional service','one_off',null,'Optional registry service.', 'marshall-2026-fee-name-change'),
    ('private','Duplicate Certificate of Registry',300,'USD',null,null,null,null,null,null,'optional service','one_off',null,'Optional registry service.', 'marshall-2026-fee-duplicate-cor'),
    ('private','Certificate of Permission for Sale and Re-registration',250,'USD',null,null,null,null,null,null,'optional service','one_off',null,'Optional registry service.', 'marshall-2026-fee-permission-sale'),
    ('private','Certificate of Cancellation',200,'USD',null,null,null,null,null,null,'optional service','one_off',null,'Deletion / cancellation certificate.', 'marshall-2026-fee-cancellation'),
    ('private','Certified copy of registry document',375,'USD',null,null,null,null,null,null,'optional service','one_off',null,'Optional certified copy.', 'marshall-2026-fee-certified-copy'),
    ('private','DHL courier delivery',150,'USD',null,null,null,null,null,null,'optional service','one_off',null,'Courier delivery benchmark.', 'marshall-2026-fee-dhl'),
    ('commercial','Private above 24 m / commercial initial benchmark low',6000,'USD','Indicative initial registration benchmark; varies with GT and mortgage.',6000,24,null,null,null,'private above 24 m / commercial yacht','initial',null,'Industry benchmark from supplied guide.', 'marshall-2026-fee-commercial-initial-low'),
    ('commercial','Private above 24 m / commercial initial benchmark high',15000,'USD','Indicative initial registration benchmark; varies with GT and mortgage.',6000,24,null,null,null,'private above 24 m / commercial yacht','initial',null,'Industry benchmark from supplied guide.', 'marshall-2026-fee-commercial-initial-high'),
    ('commercial','Private above 24 m / commercial annual benchmark low',1500,'USD','Indicative annual total benchmark.',1500,24,null,null,null,'private above 24 m / commercial yacht','annual',null,'Industry benchmark from supplied guide.', 'marshall-2026-fee-commercial-annual-low'),
    ('commercial','Private above 24 m / commercial annual benchmark high',3500,'USD','Indicative annual total benchmark.',1500,24,null,null,null,'private above 24 m / commercial yacht','annual',null,'Industry benchmark from supplied guide.', 'marshall-2026-fee-commercial-annual-high')
) as fee(registration_type, fee_component, amount, currency, formula_text, minimum_amount, loa_min, loa_max, gt_min, gt_max, vessel_category, validity_period, effective_from, notes, import_key)
left join source_upsert su on su.import_key = 'marshall-2026-source-fees'
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
 where flag_registry_id = (select id from public.flag_registries where code = 'marshall')
   and confidence_level = 'high'
   and document_category in ('registration','entity','technical','due_diligence','pylc','yet','mortgage','radio');

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
    ('private','Three preferred vessel names','registration','Required for name reservation.',10),
    ('private','Corporate Resolution or Power of Attorney','entity','Required to authorise registration.',20),
    ('private','Builder Certificate or Bill of Sale','registration','Required as title evidence.',30),
    ('private','Deletion certificate','registration','Required where previously registered.',40),
    ('private','National Tonnage Certificate or GT/NT evidence','technical','Required for registration and tonnage tax.',50),
    ('private','Protocol of Delivery and Acceptance','registration','Required where available.',60),
    ('private','Third-party liability insurance','technical','Required in the registration file.',70),
    ('private','Due diligence for 25%+ beneficial owners','due_diligence','Passport/ID, proof of address, translations and source-of-funds where required.',80),
    ('private','Radio licence / MMSI documents','radio','Required for radio licensing.',90),
    ('commercial','Three preferred vessel names','registration','Required for name reservation.',100),
    ('commercial','Corporate Resolution or Power of Attorney','entity','Required to authorise registration.',110),
    ('commercial','Builder Certificate or Bill of Sale','registration','Required as title evidence.',120),
    ('commercial','Deletion certificate','registration','Required where previously registered.',130),
    ('commercial','National Tonnage Certificate or GT/NT evidence','technical','Required for registration and tonnage tax.',140),
    ('commercial','Commercial certification / RMI Yacht Code evidence','technical','Required for commercial yacht operation.',150),
    ('commercial','Safe Manning Document file','technical','Required according to tonnage, area and programme.',160),
    ('commercial','DOC / SMC / ISSC evidence where above 500 GT','technical','Required where ISM/ISPS applies.',170),
    ('commercial','Mortgage instrument','mortgage','Required where mortgage is registered.',180),
    ('private','PYLC eligibility and charter-day control records','pylc','Required where using Private Yacht Limited Charter route.',190),
    ('private','YET Compliance Certificate','yet','Required where using YET route.',200),
    ('private','Temporary commercial / local authority charter documents','yet','Required for YET charter periods in recognised jurisdictions.',210)
) as d(registration_type, document_name, document_category, condition_text, sort_order)
where fr.code = 'marshall';
