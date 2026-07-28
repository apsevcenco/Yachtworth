-- Yachtworth Flag Advisor: Italy comprehensive profile v1.

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
  'italy','italy','italy','Italy','Italy','Italy','eu',
  'EU national registry / STED and ATCN',true,true,true,'yes','yes',
  'Pleasure craft route generally starts at 10 m LOA for Imbarcazione da Diporto; Nave da Diporto applies over 24 m.',
  'Commercial noleggio route is available, with inspections and commercial safety compliance.',
  'No single yacht maximum was identified; treatment depends on size, use and technical certification.',
  'Commercial passenger/cabin operations depend on Italian commercial safety rules and certification.',
  'case_dependent','Temporary/provisional arrangements should be checked with the Harbour Master/registry.',
  'Permanent registration is continuing, subject to inspection and documentation obligations.',
  'No strict nationality restriction for yacht ownership was identified; foreign owners can register subject to Italian documentation and formalities.',
  'Foreign companies can own Italian-flag yachts, but structure, VAT and tax position must be reviewed.',
  'Italian language documentation, translations and local professional support are usually required in practice.',
  'Mortgage registration is available through Italian public registers, subject to Italian formalities.',
  'Italian radio licence and MMSI/call sign requirements apply.',
  'RINA and recognised bodies are central to Italian technical certification and inspections.',
  'RINA inspection cycle and statutory equipment checks apply; commercial use increases inspection burden.',
  'Italian commercial yacht rules apply. Italy does not offer a simple dedicated large yacht code equivalent to Malta or Madeira.',
  'Commercial yachts require compliant manning, STCW and applicable Italian/EU labour rules.',
  'Often 2-6 weeks depending on documentation, translation, RINA and Harbour Master processing.',
  'Italy has 22% VAT, with limited reduced-rate cases. Italian-resident ownership can raise IVIE/deemed registry/tax questions.',
  'Italian and EU labour/social security exposure can be significant for commercial or Italy-based operation.',
  'Ownership documents; deletion certificate; CE/technical data; tonnage/measurement; STED/ATCN application; RINA inspection; radio documents; commercial certificates where applicable.',
  'Full EU flag; strong Italian market perception; good for Italy-based operation; respected technical framework and Paris MoU standing.',
  'Administrative language burden; RINA/inspection cycle; 22% VAT; no dedicated yacht code; Italian tax/labour exposure for resident or Italy-based structures.',
  '["RINA","ABS","BV","DNV","Lloyd''s Register"]'::jsonb,
  5055,null,true,true,true,true,14,42,true,true,
  'No strict nationality restriction identified, but Italian documentation and compliance apply.',
  'Foreign company ownership is possible, but VAT/tax and local representation should be reviewed.',
  'Commercial crewing must comply with Italian/EU labour, STCW and social security rules.',
  '22% VAT; reduced 10% cases are limited. IVIE and deemed Italian registry risk can apply to Italian residents using foreign flags.',
  'Strong EU/local acceptance, especially for Italy-based use.',
  '["EU flag","No strict owner nationality barrier identified","Good local credibility in Italy","RINA technical framework","High Paris MoU perception"]'::jsonb,
  '["Italian-language documentation","Administrative complexity","22% VAT baseline","Potential IVIE/deemed registry exposure","No simple dedicated yacht code for large commercial yachts"]'::jsonb,
  'https://www.mit.gov.it/','Italian Ministry of Infrastructure and Transport / Harbour Master offices','https://www.mit.gov.it/','https://www.mit.gov.it/',
  'high','verified','production_ready',88,'italy-guide-2026-v1',current_date,current_date,
  $$[
    {"title":"Registry overview","body":"Italy is a full EU national flag using the STED/ATCN framework and Italian Harbour Master administration. It is strongest for Italy-based ownership and operation, not for low-friction international charter structuring."},
    {"title":"Vessel categories","rows":[
      {"category":"Imbarcazione da Diporto","scope":"10-24 m pleasure craft"},
      {"category":"Nave da Diporto","scope":"Over 24 m pleasure yacht"},
      {"category":"Noleggio","scope":"Commercial charter route with additional safety and tax compliance"}
    ]},
    {"title":"Fees and inspections","rows":[
      {"item":"Registration duties","note":"Length-based government duties reported from about EUR 71 up to EUR 5,055"},
      {"item":"Agent / local support","note":"Common in practice because filings and documents are Italian-language"},
      {"item":"RINA cycle","note":"RINA inspection roughly every 4 years, with equipment checks at shorter intervals"}
    ]},
    {"title":"Tax and VAT","body":"Italian flagging does not remove Italian VAT or tax exposure. VAT is generally 22%; Italian-resident ownership may trigger IVIE or deemed registry issues; commercial use requires careful VAT and corporate tax planning."},
    {"title":"Advisor interpretation","body":"Italy can be the right answer for a yacht genuinely based and operated in Italy. It is usually weaker than Malta, Madeira, Cayman or Marshall for international commercial charter optimisation."}
  ]$$::jsonb,
  '{"source":"Italy Yacht Registration Comprehensive Guide 2026","profile_version":"italy-guide-2026-v1"}'::jsonb,
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
 where flag_registry_id = (select id from public.flag_registries where code = 'italy')
   and confidence_level = 'high';

insert into public.flag_required_documents (flag_registry_id, registration_type, document_name, document_category, is_required, condition_text, confidence_level, sort_order)
select fr.id, d.registration_type, d.document_name, d.document_category, true, d.condition_text, 'high', d.sort_order
from public.flag_registries fr
cross join (
  values
    ('private','Proof of ownership','registration','Bill of Sale or Builder Certificate.',10),
    ('private','Deletion certificate','registration','Required where previously registered.',20),
    ('private','CE / technical file','technical','Required technical documentation for yacht category.',30),
    ('private','STED / ATCN application','registration','Italian registration and navigation documents.',40),
    ('private','RINA inspection evidence','technical','Required according to size/use.',50),
    ('private','Radio licence documents','radio','Call sign, MMSI and radio station licensing.',60),
    ('commercial','Commercial noleggio documentation','commercial','Required for charter operation.',70),
    ('commercial','VAT and tax structure evidence','tax','Required for commercial/tax review.',80)
) as d(registration_type, document_name, document_category, condition_text, sort_order)
where fr.code = 'italy';
