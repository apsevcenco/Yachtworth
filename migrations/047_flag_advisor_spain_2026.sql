-- Yachtworth Flag Advisor: Spain comprehensive profile v1.

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
  source_version, last_updated, last_verified_at, advisor_sections, original_row, active
) values (
  'spain','spain','spain','Spain','Spain','Spain','eu',
  'EU national registry / DGMM Lista 6 and Lista 7',true,true,true,'yes','yes',
  'Lista 7 is the private pleasure route. No single LOA minimum was identified in the guide.',
  'Lista 6 is the commercial charter route and requires exclusive commercial use rules.',
  'No single maximum was identified; treatment depends on GT, coding, inspection and Capitania requirements.',
  'Passenger limits depend on certification and commercial authorisation.',
  'case_dependent','Temporary import route can apply for non-resident tourist yachts.',
  'Permanent registration is continuing, subject to taxes, inspections and documentation.',
  'Open to all nationalities in principle; no Spanish residency requirement was identified.',
  'Foreign company ownership is possible, but tax and local operational rules require careful review.',
  'Spanish documentation and local gestor/maritime support are strongly recommended in practice.',
  'Mortgage registration is available through Spanish registry/public documentation routes.',
  'Spanish radio licence and MMSI/call sign requirements apply.',
  'CE, ITB and technical certification requirements apply. Commercial vessels require additional inspections.',
  'Mandatory ITB inspection and Spanish maritime safety compliance apply by vessel type and use.',
  'Spain uses Lista 6 commercial yacht/charter rules rather than a single international yacht code.',
  'Commercial operation must comply with Spanish/EU labour, STCW, MLC and local charter rules.',
  'Often 3-8 weeks depending on Capitania, tax, inspection and translation/document readiness.',
  'Lista 7 private use can trigger 12% registration tax. Lista 6 commercial can qualify for 0% registration tax and VAT deduction but has strict use restrictions. VAT is generally 21%.',
  'Spanish labour and social security exposure can be significant for Spain-based commercial operations.',
  'Ownership documents; deletion certificate; CE/technical file; tax/VAT documents; ITB inspection; insurance; radio documents; Lista 6 commercial evidence where applicable.',
  'Full EU flag; strong local acceptance in Spain and the Balearics; Lista 6 can support legitimate commercial charter with tax advantages.',
  '12% registration tax for private Lista 7; Lista 6 owner-use restrictions for 4 years; Spanish-language administration; regional Capitania practice can vary.',
  '["RINA","BV","DNV","Lloyd''s Register","ABS"]'::jsonb,
  null,null,true,true,true,true,21,56,true,true,
  'No nationality barrier identified, but tax/residency facts can materially change the answer.',
  'Foreign companies can be used; Spanish tax/VAT review is essential.',
  'Commercial crewing must satisfy Spanish/EU labour, STCW and charter rules.',
  '21% VAT baseline; Lista 7 12% registration tax; Lista 6 0% registration tax and VAT deduction only if commercial restrictions are met.',
  'Good recognition for Spain/Balearic operation; less attractive if the yacht is not genuinely Spain-focused.',
  '["EU flag","Strong Spain/Balearic local acceptance","Lista 6 commercial route","Potential 0% registration tax for commercial use","VAT deduction route for qualifying commercial use"]'::jsonb,
  '["12% registration tax risk for Lista 7 private use","Lista 6 owner-use prohibition/restrictions for 4 years","Spanish-language administration","Capitania practice can vary","Labour/social security exposure"]'::jsonb,
  'https://www.transportes.gob.es/marina-mercante','Direccion General de la Marina Mercante / Spanish Capitania Maritima','https://www.transportes.gob.es/marina-mercante','https://www.transportes.gob.es/marina-mercante',
  'high','verified','production_ready',89,'spain-guide-2026-v1',current_date,current_date,
  $$[
    {"title":"Registry overview","body":"Spain is a full EU flag with two central yacht routes: Lista 7 for private pleasure yachts and Lista 6 for commercial charter yachts."},
    {"title":"Lista comparison","rows":[
      {"route":"Lista 7","use":"Private pleasure","tax":"12% registration tax can apply; VAT not deductible"},
      {"route":"Lista 6","use":"Commercial charter","tax":"0% registration tax and VAT deduction may apply if commercial-use restrictions are met"}
    ]},
    {"title":"Commercial restrictions","body":"Lista 6 is attractive for legitimate charter, but the yacht must remain in commercial use. Owner/private use is restricted for the initial 4-year period unless properly chartered or the tax position is corrected."},
    {"title":"Taxes","rows":[
      {"tax":"VAT","rate":"21% baseline"},
      {"tax":"Registration tax","rate":"12% for many Lista 7 private cases"},
      {"tax":"Corporate tax","rate":"25% baseline for Spanish company profits"}
    ]},
    {"title":"Advisor interpretation","body":"Spain is strong where the yacht will genuinely work in Spain or the Balearics. It is not usually the cleanest all-purpose international flag because tax and Capitania administration can be heavy."}
  ]$$::jsonb,
  '{"source":"Spain Yacht Registration Comprehensive Guide 2026","profile_version":"spain-guide-2026-v1"}'::jsonb,
  true
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
  primary_fee_url=excluded.primary_fee_url, confidence_level=excluded.confidence_level,
  coverage_status=excluded.coverage_status, data_quality_status=excluded.data_quality_status,
  data_quality_score=excluded.data_quality_score, source_version=excluded.source_version,
  last_updated=excluded.last_updated, last_verified_at=excluded.last_verified_at,
  advisor_sections=excluded.advisor_sections, original_row=excluded.original_row, active=true, updated_at=now();

delete from public.flag_required_documents
 where flag_registry_id = (select id from public.flag_registries where code = 'spain')
   and confidence_level = 'high';

insert into public.flag_required_documents (flag_registry_id, registration_type, document_name, document_category, is_required, condition_text, confidence_level, sort_order)
select fr.id, d.registration_type, d.document_name, d.document_category, true, d.condition_text, 'high', d.sort_order
from public.flag_registries fr
cross join (
  values
    ('private','Proof of ownership','registration','Bill of Sale or Builder Certificate.',10),
    ('private','Deletion certificate','registration','Required where previously registered.',20),
    ('private','CE / technical documentation','technical','Required for Spanish technical review.',30),
    ('private','Tax declaration / registration tax position','tax','Especially important for Lista 7 private use.',40),
    ('private','ITB inspection evidence','technical','Mandatory inspection route where applicable.',50),
    ('private','Radio licence documents','radio','Spanish radio/MMSI documentation.',60),
    ('commercial','Lista 6 commercial evidence','commercial','Charter/commercial operation documents.',70),
    ('commercial','VAT deductibility support','tax','Required for Lista 6 commercial tax treatment.',80)
) as d(registration_type, document_name, document_category, condition_text, sort_order)
where fr.code = 'spain';
