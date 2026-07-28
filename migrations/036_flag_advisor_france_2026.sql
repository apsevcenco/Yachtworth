-- Yachtworth Flag Advisor: France comprehensive profile v1.
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
    'france',
    'france',
    'france',
    'France',
    'France',
    'France',
    'eu',
    'French flag / RIF',
    true,
    true,
    true,
    'yes',
    'yes',
    'Private pleasure craft registration under the Premier registre is mandatory from 2.5 m. Division 240 applies to pleasure craft up to 24 m in French waters where applicable.',
    'RIF commercial yacht registration starts at 15 m LOA. Division 241 applies to commercial yachts up to 24 m; Division 242 applies to commercial yachts above 24 m and below 3,000 GT.',
    'Commercial RIF yacht route is focused on yachts from 15 m. Division 242 covers commercial pleasure yachts above 24 m and below 3,000 GT; other commercial vessels follow applicable merchant vessel divisions.',
    'Commercial yacht passenger and operating limits must be confirmed under the applicable French division and international certificates.',
    'case_dependent',
    'Interim certificates may be available for existing yachts with valid safety certificates, allowing immediate operation under the French flag while full review continues.',
    'Commercial safety certificates / compliance certificates are generally subject to periodic validity and intermediate surveys. Commercial certificates are commonly treated around a 5-year cycle depending on certificate type.',
    'At least 50% of the vessel must be owned by EU/EEA nationals or legal entities. The vessel must be EU-built or have import duties and VAT paid on importation into the EU.',
    'Foreign ownership can be compatible with RIF if the manager or bareboat charterer is established in France under the post-2016 reform and is responsible for international safety management.',
    'The vessel use and operation must be managed and controlled from a permanent establishment in France, or through a French-established manager or bareboat charterer where the 2016 reform route is used.',
    'Mortgage registration is available under the RIF with reduced fees compared with standard registers. The framework is robust and internationally recognised, with streamlined electronic processes.',
    'Radio licensing and maritime communications requirements apply under the French flag and operational profile.',
    'Division 242 yachts with reference length 24 m or above must hold first class notation from an authorised IACS classification society. Division 241 and 240 requirements apply by size and use.',
    'RIF safety inspectors can perform an evaluation survey for existing yachts to identify technical gaps before full registration. CRS reviews apply up to 24 m; CCS reviews apply above 24 m.',
    'Division 240 covers pleasure craft safety up to 24 m. Division 241 covers commercial pleasure craft up to 24 m. Division 242 covers commercial pleasure yachts above 24 m and below 3,000 GT and is inspired by the British Large Yacht Code.',
    'Minimum safe manning is issued relative to vessel size and type. At least 35% of crew must be EU/EEA nationals based on the workforce sheet. MLC and French maritime labour requirements apply where relevant.',
    'Approval speed depends on the quality of the technical file. The RIF office in Marseille can audit eligibility and technical gaps before full registration.',
    'France is not a tax-optimisation flag for commercial yacht charter. Commercial yacht charter profits are generally subject to 25% CIT; French VAT on charter is generally 20% in EU waters, with proportional exemption possible for documented non-EU portions. Commercial yachts are excluded from RIF tonnage tax incentives. Transport-contract structures can have different VAT outcomes but require careful specialist planning.',
    'Minimum 35% EU/EEA crew applies under RIF. RIF crew resident in France may benefit from reduced employer social charges and income tax relief after qualifying sea time, but yachts based in France for more than 181 days per year can trigger mandatory French social security exposure; combined charges can approach 50% of salary.',
    'RIF initial contact / audit file; proof of 50% EU/EEA ownership; proof of EU build or EU import duty/VAT payment; permanent establishment or French manager/charterer evidence; technical file; safety commission review documents; class certificates where applicable; minimum safe manning file; mortgage documents where applicable.',
    'Excellent French local market credibility; full EU flag; strong Paris MoU White List reputation; RIF registration and annual flag duties are free; strong IMO/ILO compliance; French diplomatic support; robust mortgage register; useful for owners prioritising South of France market access and regulatory prestige.',
    'Not tax efficient for commercial yacht charter; no yacht tonnage tax benefit; 25% CIT on charter profits; 20% VAT on charters; French social security exposure can be high; 70% fuel navigation rule is operationally restrictive; French-language administration and technical compliance burden can be heavy.',
    '["BV","DNV","Lloyd''s Register","RINA","ABS"]'::jsonb,
    0,
    0,
    true,
    true,
    true,
    true,
    null,
    null,
    true,
    true,
    'At least 50% EU/EEA ownership is required for the RIF route. Private Premier registre rules differ by craft and owner profile.',
    'Foreign owner route is possible where a French-established manager or bareboat charterer manages and controls the vessel after the 2016 reform.',
    'Minimum 35% EU/EEA crew under RIF; French social security exposure can apply if based in France more than 181 days/year.',
    '20% French VAT generally applies to charter in EU waters. No Malta-style 12% short-term yacht hire rate. Commercial yachts do not benefit from French RIF tonnage tax incentives.',
    'Excellent French local recognition and strong compliance reputation. Bank/insurance acceptance is robust, but fiscal and labour exposure must be analysed.',
    '["EU flag","Excellent France local market credibility","RIF registration fees are zero","Strong flag reputation","Paris MoU White List","Robust mortgage framework","Strong crew social protection"]'::jsonb,
    '["Not tax efficient for commercial charter","No tonnage tax for commercial yachts","25% CIT on charter profits","20% VAT on charters","Potentially high French social charges","70% fuel exemption rule is restrictive","French-language administration burden"]'::jsonb,
    'https://www.rif.mer.gouv.fr/',
    'Direction des Affaires Maritimes / Registre International Francais (RIF)',
    'https://www.rif.mer.gouv.fr/',
    'https://www.rif.mer.gouv.fr/',
    'high',
    'verified',
    'production_ready',
    90,
    'france-guide-2026-v1',
    current_date,
    current_date,
    $$[
      {
        "title": "Registry overview",
        "body": "The French flag has six registers. For commercial yachts the relevant route is the Registre International Francais (RIF), administered through the French maritime administration and the Guichet Unique in Marseille. Private pleasure craft normally sit under the Premier registre."
      },
      {
        "title": "French registers",
        "rows": [
          {"register":"Premier registre (Metropole)","purpose":"Private pleasure craft and domestic commercial vessels"},
          {"register":"Registre International Francais (RIF)","purpose":"Commercial shipping and commercial yachts from 15 m LOA"},
          {"register":"Wallis-et-Futuna","purpose":"Regional register, including cruise ship profiles"},
          {"register":"Terres Australes et Antarctiques Francaises","purpose":"Regional register"},
          {"register":"Polynesie Francaise","purpose":"Regional register"},
          {"register":"Nouvelle-Caledonie","purpose":"Regional register"}
        ]
      },
      {
        "title": "Owner and structure requirements",
        "items": [
          "At least 50% of the vessel must be owned by EU/EEA nationals or legal entities.",
          "The vessel must be EU-built or import duties and VAT must have been paid on importation into the EU.",
          "Use and operation must be managed and controlled from a permanent establishment in France.",
          "Since the 2016 reform, a foreign owner can use the RIF route where a manager or bareboat charterer is established in France and responsible for international safety management.",
          "At least 35% of crew must be EU/EEA nationals based on the workforce sheet."
        ]
      },
      {
        "title": "Technical divisions",
        "rows": [
          {"division":"Division 240","scope":"Pleasure craft up to 24 m","notes":"Safety equipment by navigation zone; relevant in French waters where applicable."},
          {"division":"Division 241","scope":"Commercial pleasure craft up to 24 m","notes":"Based largely on CE marking for construction with adapted commercial equipment requirements."},
          {"division":"Division 242","scope":"Commercial pleasure yachts above 24 m and below 3,000 GT","notes":"Inspired by the British Large Yacht Code; SOLAS/load-line equivalent provisions; international certificates possible."},
          {"division":"Other merchant divisions","scope":"Commercial vessels from 15 m outside yacht-code profiles","notes":"Applied case by case."}
        ]
      },
      {
        "title": "Division 240 navigation zones",
        "rows": [
          {"zone":"Basic","distance":"Up to 2 nm from shelter","equipment":"Lifejackets, light, fire extinguisher, manual bailer, anchor, flag."},
          {"zone":"Coastal","distance":"2-6 nm","equipment":"Adds man overboard device, red hand flares, compass, charts and COLREGs."},
          {"zone":"Semi-offshore","distance":"6-60 nm","equipment":"Adds life raft, logbook, weather receiver, harnesses, first aid kit and fixed VHF."},
          {"zone":"Offshore","distance":"Above 60 nm","equipment":"Adds EPIRB, portable VHF and satellite communications recommended."}
        ]
      },
      {
        "title": "Registration procedure",
        "items": [
          "Initial contact is made through the RIF Guichet Unique in Marseille.",
          "The owner or manager can request an audit to confirm eligibility and identify technical gaps.",
          "Existing yachts may undergo an RIF safety inspector evaluation survey before full registration commitment.",
          "For new builds, the Declaration de Mise en Construction indicates future use and triggers technical oversight.",
          "Yachts up to 24 m are reviewed by the Regional Safety Commission (CRS); yachts above 24 m are reviewed by the Central Safety Commission (CCS).",
          "Minimum safe manning is issued relative to vessel size and type."
        ]
      },
      {
        "title": "RIF fees",
        "rows": [
          {"fee_component":"Initial RIF registration","amount":"EUR 0","notes":"No fee for ship registration under RIF."},
          {"fee_component":"Annual renewal / flag duties","amount":"EUR 0","notes":"No annual flag or sailing duties under RIF."},
          {"fee_component":"Statutory certificates","amount":"EUR 0","notes":"Issued free of charge by the administration."},
          {"fee_component":"Safety commission reviews","amount":"EUR 0","notes":"CRS/CCS plan reviews and evaluations are free."},
          {"fee_component":"Mortgage registration","amount":"Reduced fees","notes":"Drastically reduced compared with standard French registers."},
          {"fee_component":"Evaluation survey","amount":"Variable","notes":"Charged where a full onboard technical verification is requested."}
        ]
      },
      {
        "title": "Tax position",
        "items": [
          "RIF is not a tax-optimisation route for commercial yacht charter.",
          "French law excludes commercial yachts from RIF tonnage tax incentives.",
          "Commercial yacht charter profits are generally subject to 25% French corporate income tax.",
          "French VAT on charters is generally 20% for the EU waters portion.",
          "No Malta-style reduced 12% short-term yacht hire rate applies."
        ]
      },
      {
        "title": "VAT and transport-contract planning",
        "items": [
          "A proportional VAT exemption may be possible for documented time outside EU waters, but proof such as AIS and detailed logs is required.",
          "A transport-contract structure may produce different VAT results, such as 10% within French waters or 0% on truly international legs, but this requires specialist planning.",
          "The proposed 33% VAT rate for luxury yachts was part of the 2025 legislative debate; as of mid-2026 the standard 20% position remains the working assumption."
        ]
      },
      {
        "title": "Crew and social security",
        "items": [
          "RIF requires at least 35% EU/EEA crew.",
          "French-resident crew on RIF vessels can benefit from reduced employer social charges and income tax relief after qualifying sea time.",
          "Yachts based in France for more than 181 days/year can trigger mandatory French social security contributions.",
          "Combined employer and employee charges can approach 50% of salary, making crew cost exposure materially higher than Malta or Monaco in many cases.",
          "MLC 2006 compliance is directly managed and checked by the French flag."
        ]
      },
      {
        "title": "Fuel and TICPE",
        "items": [
          "Commercial yachts may claim TICPE fuel excise exemption only under strict conditions.",
          "The 70% rule requires proof that 70% of navigation in the previous year occurred outside French territorial waters.",
          "Fuel must be used exclusively for commercial charter contracts.",
          "Authorities increasingly compare arrival declarations, fuel delivery notes and guest manifests."
        ]
      },
      {
        "title": "Advisor interpretation",
        "body": "France/RIF is strongest where the owner values French local market access, Riviera credibility, EU flag reputation, crew social protection and regulatory prestige. It is not the preferred choice where the main objective is tax efficiency, low crew-cost exposure or low compliance burden for commercial charter."
      }
    ]$$::jsonb,
    '{"source":"France Yacht Registration Comprehensive Guide 2026","profile_version":"france-guide-2026-v1"}'::jsonb,
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
france as (
  select id from upsert_registry
  union
  select id from public.flag_registries where code = 'france'
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
    f.id,
    s.topic,
    s.source_type,
    s.source_title,
    s.official_url,
    current_date,
    s.effective_date,
    s.notes,
    s.is_official,
    true,
    'france-guide-2026-v1',
    s.import_key
  from france f
  cross join (
    values
      ('registry_overview','official','Registre International Francais','https://www.rif.mer.gouv.fr/',null::date,'Internal audit source for RIF commercial framework.',true,'france-2026-source-rif'),
      ('technical_divisions','official','French maritime technical divisions','https://www.mer.gouv.fr/',null::date,'Internal audit source for Divisions 240, 241 and 242 profile.',true,'france-2026-source-divisions'),
      ('tax_social_fuel','supporting','France yacht tax, social security and TICPE profile','https://www.rif.mer.gouv.fr/',null::date,'Internal audit source for tax/social/fuel notes from supplied guide.',false,'france-2026-source-tax-social')
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
  f.id,
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
  'https://www.rif.mer.gouv.fr/',
  'high',
  current_date,
  true,
  'france-guide-2026-v1',
  fee.import_key,
  jsonb_build_object('profile_version','france-guide-2026-v1','component',fee.fee_component)
from france f
cross join (
  values
    ('commercial','RIF initial registration',0::numeric,'EUR',null::text,null::numeric,15::numeric,null::numeric,null::numeric,null::numeric,'commercial yacht','initial',null::date,'No fee for ship registration under RIF.', 'france-2026-fee-rif-initial'),
    ('commercial','RIF annual renewal / flag duties',0,'EUR',null,null,15,null,null,null,'commercial yacht','annual',null,'No annual flag or sailing duties under RIF.', 'france-2026-fee-rif-annual'),
    ('commercial','RIF statutory certificates',0,'EUR',null,null,15,null,null,null,'commercial yacht','certificate',null,'Issued free of charge by the administration.', 'france-2026-fee-rif-certificates'),
    ('commercial','Safety commission reviews',0,'EUR',null,null,15,null,null,null,'commercial yacht','review',null,'CRS/CCS reviews are free of charge.', 'france-2026-fee-rif-safety-review'),
    ('commercial','Mortgage registration',null,'EUR','Reduced fees compared with standard French registers.',null,15,null,null,null,'mortgage','one_off',null,'Exact mortgage fee depends on mortgage profile and should be quoted.', 'france-2026-fee-rif-mortgage'),
    ('commercial','Evaluation survey',null,'EUR','Variable fee if a full on-board technical verification is requested.',null,15,null,null,null,'survey','one_off',null,'Charged where a complete onboard verification is requested.', 'france-2026-fee-rif-evaluation-survey'),
    ('private','Premier registre private registration',null,'EUR','Length-based private registration / agent service pricing; official route and home port must be checked.',null,2.5,null,null,null,'private pleasure craft','initial',null,'Private fee engine remains route-specific and should not be treated as a confirmed RIF tariff.', 'france-2026-fee-private-premier-register')
) as fee(registration_type, fee_component, amount, currency, formula_text, minimum_amount, loa_min, loa_max, gt_min, gt_max, vessel_category, validity_period, effective_from, notes, import_key)
left join source_upsert su on su.import_key = 'france-2026-source-rif'
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
 where flag_registry_id = (select id from public.flag_registries where code = 'france')
   and confidence_level = 'high'
   and document_category in ('rif_eligibility','technical','commercial','tax_social');

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
    ('commercial','Proof of 50% EU/EEA ownership','rif_eligibility','Required for RIF eligibility.',10),
    ('commercial','Proof of EU build or EU import duty / VAT payment','rif_eligibility','Required for RIF eligibility.',20),
    ('commercial','Permanent establishment or French manager / bareboat charterer evidence','rif_eligibility','Required to evidence management and control from France or the post-2016 manager route.',30),
    ('commercial','Crew workforce sheet showing 35% EU/EEA crew','commercial','Required for RIF crew nationality compliance.',40),
    ('commercial','Preliminary vessel data and intended use file','technical','Required for RIF audit and technical assessment.',50),
    ('commercial','Evaluation survey report where applicable','technical','Used to identify technical gaps for existing yachts.',60),
    ('commercial','CRS review file for Division 241 yachts','technical','Applies to commercial yachts up to 24 m.',70),
    ('commercial','CCS review file for Division 242 yachts','technical','Applies to commercial yachts above 24 m and below 3,000 GT.',80),
    ('commercial','Class certificate / first class notation where applicable','technical','Required for Division 242 yachts with reference length 24 m or above.',90),
    ('commercial','Minimum Safe Manning file','commercial','Required according to vessel size and type.',100),
    ('commercial','VAT / navigation evidence file','tax_social','Needed for proportional VAT exemption and fuel/TICPE claims where relevant.',110)
) as d(registration_type, document_name, document_category, condition_text, sort_order)
where fr.code = 'france';
