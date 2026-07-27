begin;

insert into public.flag_import_runs (filename, file_hash, source_version, imported_by, status) values ('2026-07-27 Yachtworth_Flag_Registry_Base_v1.xlsx', '40349cba0b925aeb86a537cda824191739b07ee27bde887899e47176edbb0e62', 'Yachtworth_Flag_Registry_Base_v1', 'script', 'started') on conflict do nothing;

insert into public.flag_registries (code, slug, import_key, flag_name, country, country_or_territory, official_registry_name, registry_type, registry_family, is_eu_flag, private_available, commercial_available, private_registration_status, commercial_registration_status, private_minimum_loa, commercial_minimum_loa, maximum_loa_gt_notes, passenger_limit_notes, provisional_registration_status, provisional_validity, permanent_validity, owner_eligibility, foreign_company_ownership, local_agent_requirement, mortgage_registration_status, radio_licence_requirement, classification_requirement, survey_inspection_requirement, commercial_yacht_code, minimum_safe_manning, indicative_processing_time, vat_tax_note, crew_note, required_documents_summary, objective_advantages, limitations_and_risks, official_registry_url, primary_fee_url, official_website, vat_notes, crew_restrictions, advantages, disadvantages, confidence_level, coverage_status, missing_verification_notes, verification_notes, last_verified_at, last_updated, source_version, data_quality_score, data_quality_status, original_row, active) values ('cayman-islands', 'cayman-islands', 'flag:cayman-islands', 'Cayman Islands', 'Cayman Islands', 'Cayman Islands', 'Cayman Islands Shipping Registry (MACI)', 'category 1 red ensign', 'Category 1 Red Ensign', false, true, true, 'yes', 'yes', 'No universal minimum confirmed; simplified measurement route exists below 24 m', 'Generally 24 m+ under REG Yacht Code; confirm category for smaller commercial craft', 'No public yacht maximum identified', 'Code-dependent; typical commercial yacht framework up to 12 passengers', 'case_dependent', '21 days for cited interim ownership-transfer certificate', 'Registration continues subject to annual fees and certificate requirements', 'Individuals and entities from approved countries/territories', 'Yes, if established in an approved jurisdiction', 'Cayman Representative Person required where owner is not resident/incorporated in Cayman', 'yes', 'Yes – administered separately by OfReg', 'Case-dependent; stronger requirements for commercial/large yachts', 'Under 24 m private yachts may use simplified measurement; commercial/large yachts require code-based verification', 'REG Yacht Code / Cayman requirements', 'Commercial/code-dependent', 'Often within 24 hours when complete documents are received', 'Non-EU flag. Flag choice alone does not determine EU VAT treatment; analyse ownership, importation, use and charter pattern separately.', 'Commercial manning and certification depend on yacht size, operation and applicable code', 'Application, ownership/title evidence, tonnage/measurement data, deletion evidence where applicable, representative appointment, technical and radio documents', 'Global yacht focus; title and mortgage register; Category 1 Red Ensign; rapid document processing', 'Approved-owner rules; representative requirement; fees and technical requirements vary materially by yacht profile', 'https://www.cishipping.com/registration/', 'https://www.cishipping.com/fees/', 'https://www.cishipping.com/registration/', 'Non-EU flag. Flag choice alone does not determine EU VAT treatment; analyse ownership, importation, use and charter pattern separately.', 'Commercial manning and certification depend on yacht size, operation and applicable code', '["Global yacht focus", "title and mortgage register", "Category 1 Red Ensign", "rapid document processing"]'::jsonb, '["Approved-owner rules", "representative requirement", "fees and technical requirements vary materially by yacht profile"]'::jsonb, 'High', 'Verified with gaps', 'Extract complete current initial, annual, mortgage and technical fee matrix by GT/LOA', 'Extract complete current initial, annual, mortgage and technical fee matrix by GT/LOA', '2026-07-27', '2026-07-27', 'Yachtworth_Flag_Registry_Base_v1', 100, 'production_ready', '{"Annual / Renewal Fee": "Official schedule states minimum annual tonnage fee of US$600 up to 400 GT", "Classification Requirement": "Case-dependent; stronger requirements for commercial/large yachts", "Commercial Minimum LOA": "Generally 24 m+ under REG Yacht Code; confirm category for smaller commercial craft", "Commercial Registration": "Yes", "Commercial Yacht Code": "REG Yacht Code / Cayman requirements", "Confidence": "High", "Country / Territory": "Cayman Islands", "Coverage Status": "Verified with gaps", "Crew Note": "Commercial manning and certification depend on yacht size, operation and applicable code", "EU Flag": "No", "Fee Source": "https://www.cishipping.com/fees/", "Flag": "Cayman Islands", "Foreign Company Ownership": "Yes, if established in an approved jurisdiction", "Indicative Processing Time": "Often within 24 hours when complete documents are received", "Initial Registration Fee": "Use official fee matrix/calculator; depends on yacht category and tonnage", "Last Verified": "46230", "Limitations / Risks": "Approved-owner rules; representative requirement; fees and technical requirements vary materially by yacht profile", "Local / Resident Agent": "Cayman Representative Person required where owner is not resident/incorporated in Cayman", "Main Official Source": "https://www.cishipping.com/registration/", "Maximum LOA / GT": "No public yacht maximum identified", "Minimum Safe Manning": "Commercial/code-dependent", "Missing / Next Verification": "Extract complete current initial, annual, mortgage and technical fee matrix by GT/LOA", "Mortgage Registration": "Yes", "Objective Advantages": "Global yacht focus; title and mortgage register; Category 1 Red Ensign; rapid document processing", "Official Registry": "Cayman Islands Shipping Registry (MACI)", "Other Confirmed Fees": "Mortgage, radio and technical services charged separately", "Owner Eligibility": "Individuals and entities from approved countries/territories", "Passenger Limit": "Code-dependent; typical commercial yacht framework up to 12 passengers", "Permanent Validity / Renewal": "Registration continues subject to annual fees and certificate requirements", "Private Minimum LOA": "No universal minimum confirmed; simplified measurement route exists below 24 m", "Private Registration": "Yes", "Provisional / Interim": "Yes – interim certificate available in specified cases", "Provisional Validity": "21 days for cited interim ownership-transfer certificate", "Radio Licence": "Yes – administered separately by OfReg", "Registry Family": "Category 1 Red Ensign", "Required Documents Summary": "Application, ownership/title evidence, tonnage/measurement data, deletion evidence where applicable, representative appointment, technical and radio documents", "Survey / Inspection": "Under 24 m private yachts may use simplified measurement; commercial/large yachts require code-based verification", "VAT / Tax Note": "Non-EU flag. Flag choice alone does not determine EU VAT treatment; analyse ownership, importation, use and charter pattern separately."}'::jsonb, true) on conflict (import_key) do update set flag_name=excluded.flag_name, country=excluded.country, country_or_territory=excluded.country_or_territory, official_registry_name=excluded.official_registry_name, registry_type=excluded.registry_type, registry_family=excluded.registry_family, is_eu_flag=excluded.is_eu_flag, private_available=excluded.private_available, commercial_available=excluded.commercial_available, private_registration_status=excluded.private_registration_status, commercial_registration_status=excluded.commercial_registration_status, private_minimum_loa=excluded.private_minimum_loa, commercial_minimum_loa=excluded.commercial_minimum_loa, maximum_loa_gt_notes=excluded.maximum_loa_gt_notes, passenger_limit_notes=excluded.passenger_limit_notes, provisional_registration_status=excluded.provisional_registration_status, provisional_validity=excluded.provisional_validity, permanent_validity=excluded.permanent_validity, owner_eligibility=excluded.owner_eligibility, foreign_company_ownership=excluded.foreign_company_ownership, local_agent_requirement=excluded.local_agent_requirement, mortgage_registration_status=excluded.mortgage_registration_status, radio_licence_requirement=excluded.radio_licence_requirement, classification_requirement=excluded.classification_requirement, survey_inspection_requirement=excluded.survey_inspection_requirement, commercial_yacht_code=excluded.commercial_yacht_code, minimum_safe_manning=excluded.minimum_safe_manning, indicative_processing_time=excluded.indicative_processing_time, vat_tax_note=excluded.vat_tax_note, crew_note=excluded.crew_note, required_documents_summary=excluded.required_documents_summary, objective_advantages=excluded.objective_advantages, limitations_and_risks=excluded.limitations_and_risks, official_registry_url=excluded.official_registry_url, primary_fee_url=excluded.primary_fee_url, official_website=excluded.official_website, vat_notes=excluded.vat_notes, crew_restrictions=excluded.crew_restrictions, advantages=excluded.advantages, disadvantages=excluded.disadvantages, confidence_level=excluded.confidence_level, coverage_status=excluded.coverage_status, missing_verification_notes=excluded.missing_verification_notes, verification_notes=excluded.verification_notes, last_verified_at=excluded.last_verified_at, last_updated=excluded.last_updated, source_version=excluded.source_version, data_quality_score=excluded.data_quality_score, data_quality_status=excluded.data_quality_status, original_row=excluded.original_row, active=excluded.active, updated_at=now();

insert into public.flag_registries (code, slug, import_key, flag_name, country, country_or_territory, official_registry_name, registry_type, registry_family, is_eu_flag, private_available, commercial_available, private_registration_status, commercial_registration_status, private_minimum_loa, commercial_minimum_loa, maximum_loa_gt_notes, passenger_limit_notes, provisional_registration_status, provisional_validity, permanent_validity, owner_eligibility, foreign_company_ownership, local_agent_requirement, mortgage_registration_status, radio_licence_requirement, classification_requirement, survey_inspection_requirement, commercial_yacht_code, minimum_safe_manning, indicative_processing_time, vat_tax_note, crew_note, required_documents_summary, objective_advantages, limitations_and_risks, official_registry_url, primary_fee_url, official_website, vat_notes, crew_restrictions, advantages, disadvantages, confidence_level, coverage_status, missing_verification_notes, verification_notes, last_verified_at, last_updated, source_version, data_quality_score, data_quality_status, original_row, active) values ('malta', 'malta', 'flag:malta', 'Malta', 'Malta', 'Malta', 'Malta Ship Registry / Transport Malta', 'eu national registry', 'EU national registry', true, true, true, 'yes', 'yes', '6 m', '15 m', 'Commercial categories include 15–24 m, >24 m below 500 GT, and >24 m at/above 500 GT', 'Not more than 12 passengers for commercial yacht definition', 'yes', '6 months; extensions may total a further 6 months', 'Certificate renewed on registration anniversary', 'EU/EFTA nationals; legally constituted corporate bodies/entities irrespective of nationality', 'Yes', 'Required for non-resident owners', 'yes', 'Yes', 'Trading/commercial certification depends on size and code; recognised organisations may be used', 'Certificate of Survey and tonnage certificate; initial Commercial Yacht Code survey', 'Small Commercial Yacht Code below 24 m; Commercial Yacht Code 2025 above 24 m', 'Application required for commercial yachts over 24 m', 'Provisional registration can be arranged once core documents and fees are accepted', 'EU flag. VAT treatment remains transaction- and operation-specific; registration itself is not proof of VAT-paid status.', 'No general restriction on nationality of master, officers or crew; certification/endorsement rules still apply', 'Application, ownership qualification/incorporation, resident agent, ownership declaration, tonnage certificate, radio application, bill of sale/builder certificate, deletion certificate, survey and code documents', 'EU registry; private and commercial yacht regimes; mortgages; recognised commercial yacht code', 'Annual tax and technical cost depend on age/tonnage; commercial compliance and resident-agent costs must be modelled', 'https://www.transport.gov.mt/maritime/ship-and-yacht-registry/superyacht-registration-146', 'https://www.transport.gov.mt/maritime/ship-and-yacht-registry/ship-registration/fees-142', 'https://www.transport.gov.mt/maritime/ship-and-yacht-registry/superyacht-registration-146', 'EU flag. VAT treatment remains transaction- and operation-specific; registration itself is not proof of VAT-paid status.', 'No general restriction on nationality of master, officers or crew; certification/endorsement rules still apply', '["EU registry", "private and commercial yacht regimes", "mortgages", "recognised commercial yacht code"]'::jsonb, '["Annual tax and technical cost depend on age/tonnage", "commercial compliance and resident-agent costs must be modelled"]'::jsonb, 'High', 'Verified with gaps', 'Load current statutory fee tables into a formula engine by NT/GT, age and registration type', 'Load current statutory fee tables into a formula engine by NT/GT, age and registration type', '2026-07-27', '2026-07-27', 'Yachtworth_Flag_Registry_Base_v1', 100, 'production_ready', '{"Annual / Renewal Fee": "Annual tonnage tax; amount depends on tonnage, age and category", "Classification Requirement": "Trading/commercial certification depends on size and code; recognised organisations may be used", "Commercial Minimum LOA": "15 m", "Commercial Registration": "Yes", "Commercial Yacht Code": "Small Commercial Yacht Code below 24 m; Commercial Yacht Code 2025 above 24 m", "Confidence": "High", "Country / Territory": "Malta", "Coverage Status": "Verified with gaps", "Crew Note": "No general restriction on nationality of master, officers or crew; certification/endorsement rules still apply", "EU Flag": "Yes", "Fee Source": "https://www.transport.gov.mt/maritime/ship-and-yacht-registry/ship-registration/fees-142", "Flag": "Malta", "Foreign Company Ownership": "Yes", "Indicative Processing Time": "Provisional registration can be arranged once core documents and fees are accepted", "Initial Registration Fee": "Calculated under Merchant Shipping Fees Regulations; depends on vessel data", "Last Verified": "46230", "Limitations / Risks": "Annual tax and technical cost depend on age/tonnage; commercial compliance and resident-agent costs must be modelled", "Local / Resident Agent": "Required for non-resident owners", "Main Official Source": "https://www.transport.gov.mt/maritime/ship-and-yacht-registry/superyacht-registration-146", "Maximum LOA / GT": "Commercial categories include 15–24 m, >24 m below 500 GT, and >24 m at/above 500 GT", "Minimum Safe Manning": "Application required for commercial yachts over 24 m", "Missing / Next Verification": "Load current statutory fee tables into a formula engine by NT/GT, age and registration type", "Mortgage Registration": "Yes", "Objective Advantages": "EU registry; private and commercial yacht regimes; mortgages; recognised commercial yacht code", "Official Registry": "Malta Ship Registry / Transport Malta", "Other Confirmed Fees": "Radio, survey/class and corporate/resident-agent costs separate", "Owner Eligibility": "EU/EFTA nationals; legally constituted corporate bodies/entities irrespective of nationality", "Passenger Limit": "Not more than 12 passengers for commercial yacht definition", "Permanent Validity / Renewal": "Certificate renewed on registration anniversary", "Private Minimum LOA": "6 m", "Private Registration": "Yes", "Provisional / Interim": "Yes", "Provisional Validity": "6 months; extensions may total a further 6 months", "Radio Licence": "Yes", "Registry Family": "EU national registry", "Required Documents Summary": "Application, ownership qualification/incorporation, resident agent, ownership declaration, tonnage certificate, radio application, bill of sale/builder certificate, deletion certificate, survey and code documents", "Survey / Inspection": "Certificate of Survey and tonnage certificate; initial Commercial Yacht Code survey", "VAT / Tax Note": "EU flag. VAT treatment remains transaction- and operation-specific; registration itself is not proof of VAT-paid status."}'::jsonb, true) on conflict (import_key) do update set flag_name=excluded.flag_name, country=excluded.country, country_or_territory=excluded.country_or_territory, official_registry_name=excluded.official_registry_name, registry_type=excluded.registry_type, registry_family=excluded.registry_family, is_eu_flag=excluded.is_eu_flag, private_available=excluded.private_available, commercial_available=excluded.commercial_available, private_registration_status=excluded.private_registration_status, commercial_registration_status=excluded.commercial_registration_status, private_minimum_loa=excluded.private_minimum_loa, commercial_minimum_loa=excluded.commercial_minimum_loa, maximum_loa_gt_notes=excluded.maximum_loa_gt_notes, passenger_limit_notes=excluded.passenger_limit_notes, provisional_registration_status=excluded.provisional_registration_status, provisional_validity=excluded.provisional_validity, permanent_validity=excluded.permanent_validity, owner_eligibility=excluded.owner_eligibility, foreign_company_ownership=excluded.foreign_company_ownership, local_agent_requirement=excluded.local_agent_requirement, mortgage_registration_status=excluded.mortgage_registration_status, radio_licence_requirement=excluded.radio_licence_requirement, classification_requirement=excluded.classification_requirement, survey_inspection_requirement=excluded.survey_inspection_requirement, commercial_yacht_code=excluded.commercial_yacht_code, minimum_safe_manning=excluded.minimum_safe_manning, indicative_processing_time=excluded.indicative_processing_time, vat_tax_note=excluded.vat_tax_note, crew_note=excluded.crew_note, required_documents_summary=excluded.required_documents_summary, objective_advantages=excluded.objective_advantages, limitations_and_risks=excluded.limitations_and_risks, official_registry_url=excluded.official_registry_url, primary_fee_url=excluded.primary_fee_url, official_website=excluded.official_website, vat_notes=excluded.vat_notes, crew_restrictions=excluded.crew_restrictions, advantages=excluded.advantages, disadvantages=excluded.disadvantages, confidence_level=excluded.confidence_level, coverage_status=excluded.coverage_status, missing_verification_notes=excluded.missing_verification_notes, verification_notes=excluded.verification_notes, last_verified_at=excluded.last_verified_at, last_updated=excluded.last_updated, source_version=excluded.source_version, data_quality_score=excluded.data_quality_score, data_quality_status=excluded.data_quality_status, original_row=excluded.original_row, active=excluded.active, updated_at=now();

insert into public.flag_registries (code, slug, import_key, flag_name, country, country_or_territory, official_registry_name, registry_type, registry_family, is_eu_flag, private_available, commercial_available, private_registration_status, commercial_registration_status, private_minimum_loa, commercial_minimum_loa, maximum_loa_gt_notes, passenger_limit_notes, provisional_registration_status, provisional_validity, permanent_validity, owner_eligibility, foreign_company_ownership, local_agent_requirement, mortgage_registration_status, radio_licence_requirement, classification_requirement, survey_inspection_requirement, commercial_yacht_code, minimum_safe_manning, indicative_processing_time, vat_tax_note, crew_note, required_documents_summary, objective_advantages, limitations_and_risks, official_registry_url, primary_fee_url, official_website, vat_notes, crew_restrictions, advantages, disadvantages, confidence_level, coverage_status, missing_verification_notes, verification_notes, last_verified_at, last_updated, source_version, data_quality_score, data_quality_status, original_row, active) values ('marshall-islands', 'marshall-islands', 'flag:marshall-islands', 'Marshall Islands', 'Republic of the Marshall Islands', 'Republic of the Marshall Islands', 'RMI Maritime Registry / International Registries, Inc.', 'open international registry', 'Open international registry', false, true, true, 'yes', 'yes', '12 m', '24 m', 'No maximum size or tonnage stated for commercial yachts', 'Maximum 12 passengers for commercial yacht category', 'yes', 'Provisional registration issued subject to completion requirements; exact term per registry documentation', 'Normally 1 year; optional 3-year programme for eligible private/PYLC yachts', 'RMI entity or qualified foreign maritime entity / qualified owner', 'Yes, through qualified foreign maritime entity route', 'Registered agent/entity structure normally required', 'yes', 'Yes', 'Commercial yachts and larger vessels subject to Yacht Code/class requirements', 'Age, size, class and private/commercial status determine pre-registration inspection', 'RMI Yacht Code', 'Required for commercial yachts, PYLC, YET and PAXY; may be required for some private yachts', 'Fast global registration service; final timing depends on documents and technical review', 'Non-EU flag; EU VAT/customs treatment requires separate analysis', 'Safe manning and endorsements depend on service and yacht profile', 'Application, ownership/entity qualification, bill of sale/builder certificate, deletion evidence, tonnage and class/survey documentation, radio and manning applications', 'Major international yacht registry; private, commercial and limited-charter pathways; mortgage registration', 'Entity and technical requirements vary; older yachts may require additional inspection/waiver', 'https://www.register-iri.com/yacht/', 'https://www.register-iri.com/yacht/yacht-fees/', 'https://www.register-iri.com/yacht/', 'Non-EU flag; EU VAT/customs treatment requires separate analysis', 'Safe manning and endorsements depend on service and yacht profile', '["Major international yacht registry", "private, commercial and limited-charter pathways", "mortgage registration"]'::jsonb, '["Entity and technical requirements vary", "older yachts may require additional inspection/waiver"]'::jsonb, 'High', 'Verified with gaps', 'Transcribe current yacht fee schedule by category and term', 'Transcribe current yacht fee schedule by category and term', '2026-07-27', '2026-07-27', 'Yachtworth_Flag_Registry_Base_v1', 100, 'production_ready', '{"Annual / Renewal Fee": "Annual fees under official yacht fee schedule; 1- or 3-year option where eligible", "Classification Requirement": "Commercial yachts and larger vessels subject to Yacht Code/class requirements", "Commercial Minimum LOA": "24 m", "Commercial Registration": "Yes", "Commercial Yacht Code": "RMI Yacht Code", "Confidence": "High", "Country / Territory": "Republic of the Marshall Islands", "Coverage Status": "Verified with gaps", "Crew Note": "Safe manning and endorsements depend on service and yacht profile", "EU Flag": "No", "Fee Source": "https://www.register-iri.com/yacht/yacht-fees/", "Flag": "Marshall Islands", "Foreign Company Ownership": "Yes, through qualified foreign maritime entity route", "Indicative Processing Time": "Fast global registration service; final timing depends on documents and technical review", "Initial Registration Fee": "Official yacht fee schedule / registry quotation", "Last Verified": "46230", "Limitations / Risks": "Entity and technical requirements vary; older yachts may require additional inspection/waiver", "Local / Resident Agent": "Registered agent/entity structure normally required", "Main Official Source": "https://www.register-iri.com/yacht/", "Maximum LOA / GT": "No maximum size or tonnage stated for commercial yachts", "Minimum Safe Manning": "Required for commercial yachts, PYLC, YET and PAXY; may be required for some private yachts", "Missing / Next Verification": "Transcribe current yacht fee schedule by category and term", "Mortgage Registration": "Yes", "Objective Advantages": "Major international yacht registry; private, commercial and limited-charter pathways; mortgage registration", "Official Registry": "RMI Maritime Registry / International Registries, Inc.", "Other Confirmed Fees": "Radio, inspection, mortgage and corporate costs separate", "Owner Eligibility": "RMI entity or qualified foreign maritime entity / qualified owner", "Passenger Limit": "Maximum 12 passengers for commercial yacht category", "Permanent Validity / Renewal": "Normally 1 year; optional 3-year programme for eligible private/PYLC yachts", "Private Minimum LOA": "12 m", "Private Registration": "Yes", "Provisional / Interim": "Yes", "Provisional Validity": "Provisional registration issued subject to completion requirements; exact term per registry documentation", "Radio Licence": "Yes", "Registry Family": "Open international registry", "Required Documents Summary": "Application, ownership/entity qualification, bill of sale/builder certificate, deletion evidence, tonnage and class/survey documentation, radio and manning applications", "Survey / Inspection": "Age, size, class and private/commercial status determine pre-registration inspection", "VAT / Tax Note": "Non-EU flag; EU VAT/customs treatment requires separate analysis"}'::jsonb, true) on conflict (import_key) do update set flag_name=excluded.flag_name, country=excluded.country, country_or_territory=excluded.country_or_territory, official_registry_name=excluded.official_registry_name, registry_type=excluded.registry_type, registry_family=excluded.registry_family, is_eu_flag=excluded.is_eu_flag, private_available=excluded.private_available, commercial_available=excluded.commercial_available, private_registration_status=excluded.private_registration_status, commercial_registration_status=excluded.commercial_registration_status, private_minimum_loa=excluded.private_minimum_loa, commercial_minimum_loa=excluded.commercial_minimum_loa, maximum_loa_gt_notes=excluded.maximum_loa_gt_notes, passenger_limit_notes=excluded.passenger_limit_notes, provisional_registration_status=excluded.provisional_registration_status, provisional_validity=excluded.provisional_validity, permanent_validity=excluded.permanent_validity, owner_eligibility=excluded.owner_eligibility, foreign_company_ownership=excluded.foreign_company_ownership, local_agent_requirement=excluded.local_agent_requirement, mortgage_registration_status=excluded.mortgage_registration_status, radio_licence_requirement=excluded.radio_licence_requirement, classification_requirement=excluded.classification_requirement, survey_inspection_requirement=excluded.survey_inspection_requirement, commercial_yacht_code=excluded.commercial_yacht_code, minimum_safe_manning=excluded.minimum_safe_manning, indicative_processing_time=excluded.indicative_processing_time, vat_tax_note=excluded.vat_tax_note, crew_note=excluded.crew_note, required_documents_summary=excluded.required_documents_summary, objective_advantages=excluded.objective_advantages, limitations_and_risks=excluded.limitations_and_risks, official_registry_url=excluded.official_registry_url, primary_fee_url=excluded.primary_fee_url, official_website=excluded.official_website, vat_notes=excluded.vat_notes, crew_restrictions=excluded.crew_restrictions, advantages=excluded.advantages, disadvantages=excluded.disadvantages, confidence_level=excluded.confidence_level, coverage_status=excluded.coverage_status, missing_verification_notes=excluded.missing_verification_notes, verification_notes=excluded.verification_notes, last_verified_at=excluded.last_verified_at, last_updated=excluded.last_updated, source_version=excluded.source_version, data_quality_score=excluded.data_quality_score, data_quality_status=excluded.data_quality_status, original_row=excluded.original_row, active=excluded.active, updated_at=now();

insert into public.flag_registries (code, slug, import_key, flag_name, country, country_or_territory, official_registry_name, registry_type, registry_family, is_eu_flag, private_available, commercial_available, private_registration_status, commercial_registration_status, private_minimum_loa, commercial_minimum_loa, maximum_loa_gt_notes, passenger_limit_notes, provisional_registration_status, provisional_validity, permanent_validity, owner_eligibility, foreign_company_ownership, local_agent_requirement, mortgage_registration_status, radio_licence_requirement, classification_requirement, survey_inspection_requirement, commercial_yacht_code, minimum_safe_manning, indicative_processing_time, vat_tax_note, crew_note, required_documents_summary, objective_advantages, limitations_and_risks, official_registry_url, primary_fee_url, official_website, vat_notes, crew_restrictions, advantages, disadvantages, confidence_level, coverage_status, missing_verification_notes, verification_notes, last_verified_at, last_updated, source_version, data_quality_score, data_quality_status, original_row, active) values ('isle-of-man', 'isle-of-man', 'flag:isle-of-man', 'Isle of Man', 'Isle of Man', 'Isle of Man', 'Isle of Man Ship Registry', 'category 1 red ensign', 'Category 1 Red Ensign', false, true, true, 'yes', 'yes', 'No universal minimum confirmed for Part 1', '24 m for commercial yacht scheme', 'Category 1 register; no yacht maximum identified in reviewed guidance', 'Up to 12 paying passengers under commercial yacht scheme', 'case_dependent', 'Case-dependent', 'Full registration / certification subject to registry and survey cycles', 'Qualified owners under Manx/Red Ensign rules', 'Yes subject to qualified ownership and representative requirements', 'Representative required for non-IOM entity where yacht is over 24 m', 'yes', 'Yes', 'Commercial/PYCR/YET yachts over 24 m must be commercially classed with recognised class', 'Pre-registration survey for commercial/PYCR/YET; subsequent survey/audit cycle', 'REG Yacht Code Part A', 'Required for commercial operation', 'Depends on ownership approval, class and survey completion', 'Non-EU flag; registration does not determine EU VAT treatment', 'Commercial crew certification and safe manning apply', 'Application, ownership/title evidence, tonnage and survey/class certificates, deletion evidence, insurance and radio documents, representative appointment where applicable', 'Category 1 Red Ensign; title and mortgage registry; established commercial yacht framework', 'Commercial yachts over 24 m require class and survey; local representation may be required', 'https://www.iomshipregistry.com/yachts/', 'https://www.iomshipregistry.com/fees/', 'https://www.iomshipregistry.com/yachts/', 'Non-EU flag; registration does not determine EU VAT treatment', 'Commercial crew certification and safe manning apply', '["Category 1 Red Ensign", "title and mortgage registry", "established commercial yacht framework"]'::jsonb, '["Commercial yachts over 24 m require class and survey", "local representation may be required"]'::jsonb, 'High', 'Verified with gaps', 'Replace historical fee values with final enacted 2026 fee schedule', 'Replace historical fee values with final enacted 2026 fee schedule', '2026-07-27', '2026-07-27', 'Yachtworth_Flag_Registry_Base_v1', 100, 'production_ready', '{"Annual / Renewal Fee": "Use current statutory fee schedule", "Classification Requirement": "Commercial/PYCR/YET yachts over 24 m must be commercially classed with recognised class", "Commercial Minimum LOA": "24 m for commercial yacht scheme", "Commercial Registration": "Yes", "Commercial Yacht Code": "REG Yacht Code Part A", "Confidence": "High", "Country / Territory": "Isle of Man", "Coverage Status": "Verified with gaps", "Crew Note": "Commercial crew certification and safe manning apply", "EU Flag": "No", "Fee Source": "https://www.iomshipregistry.com/fees/", "Flag": "Isle of Man", "Foreign Company Ownership": "Yes subject to qualified ownership and representative requirements", "Indicative Processing Time": "Depends on ownership approval, class and survey completion", "Initial Registration Fee": "Use current statutory fee schedule; 2026 schedule must be confirmed", "Last Verified": "46230", "Limitations / Risks": "Commercial yachts over 24 m require class and survey; local representation may be required", "Local / Resident Agent": "Representative required for non-IOM entity where yacht is over 24 m", "Main Official Source": "https://www.iomshipregistry.com/yachts/", "Maximum LOA / GT": "Category 1 register; no yacht maximum identified in reviewed guidance", "Minimum Safe Manning": "Required for commercial operation", "Missing / Next Verification": "Replace historical fee values with final enacted 2026 fee schedule", "Mortgage Registration": "Yes", "Objective Advantages": "Category 1 Red Ensign; title and mortgage registry; established commercial yacht framework", "Official Registry": "Isle of Man Ship Registry", "Other Confirmed Fees": "Mortgage, survey, certification and representative costs separate", "Owner Eligibility": "Qualified owners under Manx/Red Ensign rules", "Passenger Limit": "Up to 12 paying passengers under commercial yacht scheme", "Permanent Validity / Renewal": "Full registration / certification subject to registry and survey cycles", "Private Minimum LOA": "No universal minimum confirmed for Part 1", "Private Registration": "Yes", "Provisional / Interim": "Registry-specific provisional/bareboat options available; confirm by case", "Provisional Validity": "Case-dependent", "Radio Licence": "Yes", "Registry Family": "Category 1 Red Ensign", "Required Documents Summary": "Application, ownership/title evidence, tonnage and survey/class certificates, deletion evidence, insurance and radio documents, representative appointment where applicable", "Survey / Inspection": "Pre-registration survey for commercial/PYCR/YET; subsequent survey/audit cycle", "VAT / Tax Note": "Non-EU flag; registration does not determine EU VAT treatment"}'::jsonb, true) on conflict (import_key) do update set flag_name=excluded.flag_name, country=excluded.country, country_or_territory=excluded.country_or_territory, official_registry_name=excluded.official_registry_name, registry_type=excluded.registry_type, registry_family=excluded.registry_family, is_eu_flag=excluded.is_eu_flag, private_available=excluded.private_available, commercial_available=excluded.commercial_available, private_registration_status=excluded.private_registration_status, commercial_registration_status=excluded.commercial_registration_status, private_minimum_loa=excluded.private_minimum_loa, commercial_minimum_loa=excluded.commercial_minimum_loa, maximum_loa_gt_notes=excluded.maximum_loa_gt_notes, passenger_limit_notes=excluded.passenger_limit_notes, provisional_registration_status=excluded.provisional_registration_status, provisional_validity=excluded.provisional_validity, permanent_validity=excluded.permanent_validity, owner_eligibility=excluded.owner_eligibility, foreign_company_ownership=excluded.foreign_company_ownership, local_agent_requirement=excluded.local_agent_requirement, mortgage_registration_status=excluded.mortgage_registration_status, radio_licence_requirement=excluded.radio_licence_requirement, classification_requirement=excluded.classification_requirement, survey_inspection_requirement=excluded.survey_inspection_requirement, commercial_yacht_code=excluded.commercial_yacht_code, minimum_safe_manning=excluded.minimum_safe_manning, indicative_processing_time=excluded.indicative_processing_time, vat_tax_note=excluded.vat_tax_note, crew_note=excluded.crew_note, required_documents_summary=excluded.required_documents_summary, objective_advantages=excluded.objective_advantages, limitations_and_risks=excluded.limitations_and_risks, official_registry_url=excluded.official_registry_url, primary_fee_url=excluded.primary_fee_url, official_website=excluded.official_website, vat_notes=excluded.vat_notes, crew_restrictions=excluded.crew_restrictions, advantages=excluded.advantages, disadvantages=excluded.disadvantages, confidence_level=excluded.confidence_level, coverage_status=excluded.coverage_status, missing_verification_notes=excluded.missing_verification_notes, verification_notes=excluded.verification_notes, last_verified_at=excluded.last_verified_at, last_updated=excluded.last_updated, source_version=excluded.source_version, data_quality_score=excluded.data_quality_score, data_quality_status=excluded.data_quality_status, original_row=excluded.original_row, active=excluded.active, updated_at=now();

insert into public.flag_registries (code, slug, import_key, flag_name, country, country_or_territory, official_registry_name, registry_type, registry_family, is_eu_flag, private_available, commercial_available, private_registration_status, commercial_registration_status, private_minimum_loa, commercial_minimum_loa, maximum_loa_gt_notes, passenger_limit_notes, provisional_registration_status, provisional_validity, permanent_validity, owner_eligibility, foreign_company_ownership, local_agent_requirement, mortgage_registration_status, radio_licence_requirement, classification_requirement, survey_inspection_requirement, commercial_yacht_code, minimum_safe_manning, indicative_processing_time, vat_tax_note, crew_note, required_documents_summary, objective_advantages, limitations_and_risks, official_registry_url, primary_fee_url, official_website, vat_notes, crew_restrictions, advantages, disadvantages, confidence_level, coverage_status, missing_verification_notes, verification_notes, last_verified_at, last_updated, source_version, data_quality_score, data_quality_status, original_row, active) values ('jersey', 'jersey', 'flag:jersey', 'Jersey', 'Jersey', 'Jersey', 'British Ship Registry – Jersey / Ports of Jersey', 'red ensign registry', 'Red Ensign registry', false, true, false, 'yes', 'partial', 'SSR available below 24 m', 'Not confirmed in current reviewed material', 'Full register available; current commercial yacht ceiling requires confirmation', 'Not confirmed', 'not_confirmed', 'Not confirmed', 'SSR valid 5 years; full registration terms differ', 'Full registration subject to approved-country ownership rules; SSR restricted to Jersey-resident individuals', 'Full register may accept qualifying entities; SSR does not', 'Case-dependent; SSR requires Jersey residence', 'case_dependent', 'Separate radio licensing requirements apply', 'Commercial/large yacht requirements not fully verified', 'Depends on full/SSR and yacht profile', 'REG framework may apply; current Jersey implementation must be verified', 'Commercial case-dependent', 'SSR fast-track available', 'Non-EU flag; VAT/customs position requires separate analysis', 'Commercial rules require separate confirmation', 'SSR application, ownership, Jersey residence/individual ownership, local registration and insurance; full register requires broader title evidence', 'Red Ensign identity; full title registration and simple SSR route for local residents', 'SSR is narrow; current commercial superyacht scope and full-register fees need direct registry confirmation', 'https://www.ports.je/jerseymarinas/marinas/vesselregistration/', 'https://www.ports.je/jerseymarinas/marinas/vesselregistration/', 'https://www.ports.je/jerseymarinas/marinas/vesselregistration/', 'Non-EU flag; VAT/customs position requires separate analysis', 'Commercial rules require separate confirmation', '["Red Ensign identity", "full title registration and simple SSR route for local residents"]'::jsonb, '["SSR is narrow", "current commercial superyacht scope and full-register fees need direct registry confirmation"]'::jsonb, 'Medium', 'Partial', 'Obtain current full-register yacht guide, commercial scope, ownership schedule and full fee tariff', 'Obtain current full-register yacht guide, commercial scope, ownership schedule and full fee tariff', '2026-07-27', '2026-07-27', 'Yachtworth_Flag_Registry_Base_v1', 100, 'research_required', '{"Annual / Renewal Fee": "SSR renewal £70 every 5 years", "Classification Requirement": "Commercial/large yacht requirements not fully verified", "Commercial Minimum LOA": "Not confirmed in current reviewed material", "Commercial Registration": "Partial / verify current scope", "Commercial Yacht Code": "REG framework may apply; current Jersey implementation must be verified", "Confidence": "Medium", "Country / Territory": "Jersey", "Coverage Status": "Partial", "Crew Note": "Commercial rules require separate confirmation", "EU Flag": "No", "Fee Source": "https://www.ports.je/jerseymarinas/marinas/vesselregistration/", "Flag": "Jersey", "Foreign Company Ownership": "Full register may accept qualifying entities; SSR does not", "Indicative Processing Time": "SSR fast-track available", "Initial Registration Fee": "SSR £70; fast track £145; local vessel registration £20", "Last Verified": "46230", "Limitations / Risks": "SSR is narrow; current commercial superyacht scope and full-register fees need direct registry confirmation", "Local / Resident Agent": "Case-dependent; SSR requires Jersey residence", "Main Official Source": "https://www.ports.je/jerseymarinas/marinas/vesselregistration/", "Maximum LOA / GT": "Full register available; current commercial yacht ceiling requires confirmation", "Minimum Safe Manning": "Commercial case-dependent", "Missing / Next Verification": "Obtain current full-register yacht guide, commercial scope, ownership schedule and full fee tariff", "Mortgage Registration": "Full title register supports proprietary interests; current mortgage procedure to verify", "Objective Advantages": "Red Ensign identity; full title registration and simple SSR route for local residents", "Official Registry": "British Ship Registry – Jersey / Ports of Jersey", "Other Confirmed Fees": "SSR duplicate certificate £40; local duplicate £17.46", "Owner Eligibility": "Full registration subject to approved-country ownership rules; SSR restricted to Jersey-resident individuals", "Passenger Limit": "Not confirmed", "Permanent Validity / Renewal": "SSR valid 5 years; full registration terms differ", "Private Minimum LOA": "SSR available below 24 m", "Private Registration": "Yes", "Provisional / Interim": "Not confirmed", "Provisional Validity": "Not confirmed", "Radio Licence": "Separate radio licensing requirements apply", "Registry Family": "Red Ensign registry", "Required Documents Summary": "SSR application, ownership, Jersey residence/individual ownership, local registration and insurance; full register requires broader title evidence", "Survey / Inspection": "Depends on full/SSR and yacht profile", "VAT / Tax Note": "Non-EU flag; VAT/customs position requires separate analysis"}'::jsonb, true) on conflict (import_key) do update set flag_name=excluded.flag_name, country=excluded.country, country_or_territory=excluded.country_or_territory, official_registry_name=excluded.official_registry_name, registry_type=excluded.registry_type, registry_family=excluded.registry_family, is_eu_flag=excluded.is_eu_flag, private_available=excluded.private_available, commercial_available=excluded.commercial_available, private_registration_status=excluded.private_registration_status, commercial_registration_status=excluded.commercial_registration_status, private_minimum_loa=excluded.private_minimum_loa, commercial_minimum_loa=excluded.commercial_minimum_loa, maximum_loa_gt_notes=excluded.maximum_loa_gt_notes, passenger_limit_notes=excluded.passenger_limit_notes, provisional_registration_status=excluded.provisional_registration_status, provisional_validity=excluded.provisional_validity, permanent_validity=excluded.permanent_validity, owner_eligibility=excluded.owner_eligibility, foreign_company_ownership=excluded.foreign_company_ownership, local_agent_requirement=excluded.local_agent_requirement, mortgage_registration_status=excluded.mortgage_registration_status, radio_licence_requirement=excluded.radio_licence_requirement, classification_requirement=excluded.classification_requirement, survey_inspection_requirement=excluded.survey_inspection_requirement, commercial_yacht_code=excluded.commercial_yacht_code, minimum_safe_manning=excluded.minimum_safe_manning, indicative_processing_time=excluded.indicative_processing_time, vat_tax_note=excluded.vat_tax_note, crew_note=excluded.crew_note, required_documents_summary=excluded.required_documents_summary, objective_advantages=excluded.objective_advantages, limitations_and_risks=excluded.limitations_and_risks, official_registry_url=excluded.official_registry_url, primary_fee_url=excluded.primary_fee_url, official_website=excluded.official_website, vat_notes=excluded.vat_notes, crew_restrictions=excluded.crew_restrictions, advantages=excluded.advantages, disadvantages=excluded.disadvantages, confidence_level=excluded.confidence_level, coverage_status=excluded.coverage_status, missing_verification_notes=excluded.missing_verification_notes, verification_notes=excluded.verification_notes, last_verified_at=excluded.last_verified_at, last_updated=excluded.last_updated, source_version=excluded.source_version, data_quality_score=excluded.data_quality_score, data_quality_status=excluded.data_quality_status, original_row=excluded.original_row, active=excluded.active, updated_at=now();

insert into public.flag_registries (code, slug, import_key, flag_name, country, country_or_territory, official_registry_name, registry_type, registry_family, is_eu_flag, private_available, commercial_available, private_registration_status, commercial_registration_status, private_minimum_loa, commercial_minimum_loa, maximum_loa_gt_notes, passenger_limit_notes, provisional_registration_status, provisional_validity, permanent_validity, owner_eligibility, foreign_company_ownership, local_agent_requirement, mortgage_registration_status, radio_licence_requirement, classification_requirement, survey_inspection_requirement, commercial_yacht_code, minimum_safe_manning, indicative_processing_time, vat_tax_note, crew_note, required_documents_summary, objective_advantages, limitations_and_risks, official_registry_url, primary_fee_url, official_website, vat_notes, crew_restrictions, advantages, disadvantages, confidence_level, coverage_status, missing_verification_notes, verification_notes, last_verified_at, last_updated, source_version, data_quality_score, data_quality_status, original_row, active) values ('guernsey', 'guernsey', 'flag:guernsey', 'Guernsey', 'Guernsey', 'Guernsey', 'Guernsey Ships Registry', 'red ensign registry', 'Red Ensign registry', false, true, false, 'yes', 'partial', 'SSR/Part I routes exist; exact thresholds depend on register', 'Not confirmed', 'Not confirmed from current public material', 'Not confirmed', 'not_confirmed', 'Not confirmed', 'Depends on Part I / SSR route', 'British ship ownership rules and local register requirements', 'Requires confirmation', 'Requires confirmation', 'case_dependent', 'Separate radio requirements apply', 'Not confirmed', 'Not confirmed', 'REG framework may apply; implementation not verified', 'Commercial case-dependent', 'Not published in reviewed material', 'Non-EU flag; separate VAT/customs analysis required', 'Commercial rules require registry confirmation', 'Part I/SSR application and title/identity evidence; exact yacht checklist required from registry', 'British/Red Ensign register routes are available', 'Public online yacht detail is insufficient for production calculations', 'https://www.gov.gg/shipsregistry', 'https://www.gov.gg/shipsregistry', 'https://www.gov.gg/shipsregistry', 'Non-EU flag; separate VAT/customs analysis required', 'Commercial rules require registry confirmation', '["British/Red Ensign register routes are available"]'::jsonb, '["Public online yacht detail is insufficient for production calculations"]'::jsonb, 'Low', 'Partial', 'Direct registry enquiry required for yacht scope, ownership, survey, mortgage and fees', 'Direct registry enquiry required for yacht scope, ownership, survey, mortgage and fees', '2026-07-27', '2026-07-27', 'Yachtworth_Flag_Registry_Base_v1', 100, 'research_required', '{"Annual / Renewal Fee": "Official current schedule required", "Classification Requirement": "Not confirmed", "Commercial Minimum LOA": "Not confirmed", "Commercial Registration": "Partial / verify current scope", "Commercial Yacht Code": "REG framework may apply; implementation not verified", "Confidence": "Low", "Country / Territory": "Guernsey", "Coverage Status": "Partial", "Crew Note": "Commercial rules require registry confirmation", "EU Flag": "No", "Fee Source": "https://www.gov.gg/shipsregistry", "Flag": "Guernsey", "Foreign Company Ownership": "Requires confirmation", "Indicative Processing Time": "Not published in reviewed material", "Initial Registration Fee": "Official current yacht fee schedule not found; registry quotation required", "Last Verified": "46230", "Limitations / Risks": "Public online yacht detail is insufficient for production calculations", "Local / Resident Agent": "Requires confirmation", "Main Official Source": "https://www.gov.gg/shipsregistry", "Maximum LOA / GT": "Not confirmed from current public material", "Minimum Safe Manning": "Commercial case-dependent", "Missing / Next Verification": "Direct registry enquiry required for yacht scope, ownership, survey, mortgage and fees", "Mortgage Registration": "Likely through Part I title register; verify current procedure", "Objective Advantages": "British/Red Ensign register routes are available", "Official Registry": "Guernsey Ships Registry", "Other Confirmed Fees": "Not confirmed", "Owner Eligibility": "British ship ownership rules and local register requirements", "Passenger Limit": "Not confirmed", "Permanent Validity / Renewal": "Depends on Part I / SSR route", "Private Minimum LOA": "SSR/Part I routes exist; exact thresholds depend on register", "Private Registration": "Yes", "Provisional / Interim": "Not confirmed", "Provisional Validity": "Not confirmed", "Radio Licence": "Separate radio requirements apply", "Registry Family": "Red Ensign registry", "Required Documents Summary": "Part I/SSR application and title/identity evidence; exact yacht checklist required from registry", "Survey / Inspection": "Not confirmed", "VAT / Tax Note": "Non-EU flag; separate VAT/customs analysis required"}'::jsonb, true) on conflict (import_key) do update set flag_name=excluded.flag_name, country=excluded.country, country_or_territory=excluded.country_or_territory, official_registry_name=excluded.official_registry_name, registry_type=excluded.registry_type, registry_family=excluded.registry_family, is_eu_flag=excluded.is_eu_flag, private_available=excluded.private_available, commercial_available=excluded.commercial_available, private_registration_status=excluded.private_registration_status, commercial_registration_status=excluded.commercial_registration_status, private_minimum_loa=excluded.private_minimum_loa, commercial_minimum_loa=excluded.commercial_minimum_loa, maximum_loa_gt_notes=excluded.maximum_loa_gt_notes, passenger_limit_notes=excluded.passenger_limit_notes, provisional_registration_status=excluded.provisional_registration_status, provisional_validity=excluded.provisional_validity, permanent_validity=excluded.permanent_validity, owner_eligibility=excluded.owner_eligibility, foreign_company_ownership=excluded.foreign_company_ownership, local_agent_requirement=excluded.local_agent_requirement, mortgage_registration_status=excluded.mortgage_registration_status, radio_licence_requirement=excluded.radio_licence_requirement, classification_requirement=excluded.classification_requirement, survey_inspection_requirement=excluded.survey_inspection_requirement, commercial_yacht_code=excluded.commercial_yacht_code, minimum_safe_manning=excluded.minimum_safe_manning, indicative_processing_time=excluded.indicative_processing_time, vat_tax_note=excluded.vat_tax_note, crew_note=excluded.crew_note, required_documents_summary=excluded.required_documents_summary, objective_advantages=excluded.objective_advantages, limitations_and_risks=excluded.limitations_and_risks, official_registry_url=excluded.official_registry_url, primary_fee_url=excluded.primary_fee_url, official_website=excluded.official_website, vat_notes=excluded.vat_notes, crew_restrictions=excluded.crew_restrictions, advantages=excluded.advantages, disadvantages=excluded.disadvantages, confidence_level=excluded.confidence_level, coverage_status=excluded.coverage_status, missing_verification_notes=excluded.missing_verification_notes, verification_notes=excluded.verification_notes, last_verified_at=excluded.last_verified_at, last_updated=excluded.last_updated, source_version=excluded.source_version, data_quality_score=excluded.data_quality_score, data_quality_status=excluded.data_quality_status, original_row=excluded.original_row, active=excluded.active, updated_at=now();

insert into public.flag_registries (code, slug, import_key, flag_name, country, country_or_territory, official_registry_name, registry_type, registry_family, is_eu_flag, private_available, commercial_available, private_registration_status, commercial_registration_status, private_minimum_loa, commercial_minimum_loa, maximum_loa_gt_notes, passenger_limit_notes, provisional_registration_status, provisional_validity, permanent_validity, owner_eligibility, foreign_company_ownership, local_agent_requirement, mortgage_registration_status, radio_licence_requirement, classification_requirement, survey_inspection_requirement, commercial_yacht_code, minimum_safe_manning, indicative_processing_time, vat_tax_note, crew_note, required_documents_summary, objective_advantages, limitations_and_risks, official_registry_url, primary_fee_url, official_website, vat_notes, crew_restrictions, advantages, disadvantages, confidence_level, coverage_status, missing_verification_notes, verification_notes, last_verified_at, last_updated, source_version, data_quality_score, data_quality_status, original_row, active) values ('gibraltar', 'gibraltar', 'flag:gibraltar', 'Gibraltar', 'Gibraltar', 'Gibraltar', 'Gibraltar Maritime Administration', 'category 1 red ensign', 'Category 1 Red Ensign', false, true, true, 'yes', 'yes', 'SSR below 24 m for eligible residents; full yacht register also available', 'Commercial categories exist below and above 24 m', 'Fee schedule includes over 1,600 GT; no public yacht maximum identified', 'Code-dependent', 'yes', 'Extension mechanism available; exact base term per certificate', 'Full ship registration 5 years; yacht certificates have annual renewal fees in current tariff', 'Broad international eligibility subject to registry rules', 'Yes subject to qualifying ownership/foreign maritime entity procedures', 'Local representatives commonly used; exact obligation depends on owner structure', 'yes', 'Yes', 'Commercial/large yacht code-dependent', 'Registry surveyors support LY/REG and Passenger Yacht Code compliance', 'Applicable large/commercial yacht and passenger yacht standards', 'Commercial case-dependent', 'Official documents advertised with 24-hour turnaround where requirements are met', 'Non-EU flag; VAT/customs treatment requires separate analysis', 'Commercial certification and manning depend on yacht category', 'Registration forms, title/ownership evidence, deletion evidence, survey/tonnage and code documentation, fees and radio/certification items', 'Category 1 Red Ensign; title/mortgage registration; published fee schedule; rapid document service', 'Annual tonnage tax can dominate cost for larger yachts; local representation and survey costs are additional', 'https://www.gibraltarship.com/yachts/registration', 'https://www.gibraltarship.com/fees-and-information', 'https://www.gibraltarship.com/yachts/registration', 'Non-EU flag; VAT/customs treatment requires separate analysis', 'Commercial certification and manning depend on yacht category', '["Category 1 Red Ensign", "title/mortgage registration", "published fee schedule", "rapid document service"]'::jsonb, '["Annual tonnage tax can dominate cost for larger yachts", "local representation and survey costs are additional"]'::jsonb, 'High', 'Verified', 'Load 2026 tariff effective 1 August 2026 and all survey fee bands', 'Load 2026 tariff effective 1 August 2026 and all survey fee bands', '2026-07-27', '2026-07-27', 'Yachtworth_Flag_Registry_Base_v1', 100, 'production_ready', '{"Annual / Renewal Fee": "2025: under 24 m £28; pleasure >24 m £78; commercial >24 m £121; ATT applies by GT", "Classification Requirement": "Commercial/large yacht code-dependent", "Commercial Minimum LOA": "Commercial categories exist below and above 24 m", "Commercial Registration": "Yes", "Commercial Yacht Code": "Applicable large/commercial yacht and passenger yacht standards", "Confidence": "High", "Country / Territory": "Gibraltar", "Coverage Status": "Verified", "Crew Note": "Commercial certification and manning depend on yacht category", "EU Flag": "No", "Fee Source": "https://www.gibraltarship.com/fees-and-information", "Flag": "Gibraltar", "Foreign Company Ownership": "Yes subject to qualifying ownership/foreign maritime entity procedures", "Indicative Processing Time": "Official documents advertised with 24-hour turnaround where requirements are met", "Initial Registration Fee": "2025: under 24 m £247; pleasure >24 m up to 1,599 GT £436; commercial >24 m up to 1,599 GT £599", "Last Verified": "46230", "Limitations / Risks": "Annual tonnage tax can dominate cost for larger yachts; local representation and survey costs are additional", "Local / Resident Agent": "Local representatives commonly used; exact obligation depends on owner structure", "Main Official Source": "https://www.gibraltarship.com/yachts/registration", "Maximum LOA / GT": "Fee schedule includes over 1,600 GT; no public yacht maximum identified", "Minimum Safe Manning": "Commercial case-dependent", "Missing / Next Verification": "Load 2026 tariff effective 1 August 2026 and all survey fee bands", "Mortgage Registration": "Yes", "Objective Advantages": "Category 1 Red Ensign; title/mortgage registration; published fee schedule; rapid document service", "Official Registry": "Gibraltar Maritime Administration", "Other Confirmed Fees": "2025 mortgage recording: £84 under 24 m, £165 pleasure >24 m, £219 commercial >24 m; ATT up to 3,000 GT £2,000", "Owner Eligibility": "Broad international eligibility subject to registry rules", "Passenger Limit": "Code-dependent", "Permanent Validity / Renewal": "Full ship registration 5 years; yacht certificates have annual renewal fees in current tariff", "Private Minimum LOA": "SSR below 24 m for eligible residents; full yacht register also available", "Private Registration": "Yes", "Provisional / Interim": "Yes", "Provisional Validity": "Extension mechanism available; exact base term per certificate", "Radio Licence": "Yes", "Registry Family": "Category 1 Red Ensign", "Required Documents Summary": "Registration forms, title/ownership evidence, deletion evidence, survey/tonnage and code documentation, fees and radio/certification items", "Survey / Inspection": "Registry surveyors support LY/REG and Passenger Yacht Code compliance", "VAT / Tax Note": "Non-EU flag; VAT/customs treatment requires separate analysis"}'::jsonb, true) on conflict (import_key) do update set flag_name=excluded.flag_name, country=excluded.country, country_or_territory=excluded.country_or_territory, official_registry_name=excluded.official_registry_name, registry_type=excluded.registry_type, registry_family=excluded.registry_family, is_eu_flag=excluded.is_eu_flag, private_available=excluded.private_available, commercial_available=excluded.commercial_available, private_registration_status=excluded.private_registration_status, commercial_registration_status=excluded.commercial_registration_status, private_minimum_loa=excluded.private_minimum_loa, commercial_minimum_loa=excluded.commercial_minimum_loa, maximum_loa_gt_notes=excluded.maximum_loa_gt_notes, passenger_limit_notes=excluded.passenger_limit_notes, provisional_registration_status=excluded.provisional_registration_status, provisional_validity=excluded.provisional_validity, permanent_validity=excluded.permanent_validity, owner_eligibility=excluded.owner_eligibility, foreign_company_ownership=excluded.foreign_company_ownership, local_agent_requirement=excluded.local_agent_requirement, mortgage_registration_status=excluded.mortgage_registration_status, radio_licence_requirement=excluded.radio_licence_requirement, classification_requirement=excluded.classification_requirement, survey_inspection_requirement=excluded.survey_inspection_requirement, commercial_yacht_code=excluded.commercial_yacht_code, minimum_safe_manning=excluded.minimum_safe_manning, indicative_processing_time=excluded.indicative_processing_time, vat_tax_note=excluded.vat_tax_note, crew_note=excluded.crew_note, required_documents_summary=excluded.required_documents_summary, objective_advantages=excluded.objective_advantages, limitations_and_risks=excluded.limitations_and_risks, official_registry_url=excluded.official_registry_url, primary_fee_url=excluded.primary_fee_url, official_website=excluded.official_website, vat_notes=excluded.vat_notes, crew_restrictions=excluded.crew_restrictions, advantages=excluded.advantages, disadvantages=excluded.disadvantages, confidence_level=excluded.confidence_level, coverage_status=excluded.coverage_status, missing_verification_notes=excluded.missing_verification_notes, verification_notes=excluded.verification_notes, last_verified_at=excluded.last_verified_at, last_updated=excluded.last_updated, source_version=excluded.source_version, data_quality_score=excluded.data_quality_score, data_quality_status=excluded.data_quality_status, original_row=excluded.original_row, active=excluded.active, updated_at=now();

insert into public.flag_registries (code, slug, import_key, flag_name, country, country_or_territory, official_registry_name, registry_type, registry_family, is_eu_flag, private_available, commercial_available, private_registration_status, commercial_registration_status, private_minimum_loa, commercial_minimum_loa, maximum_loa_gt_notes, passenger_limit_notes, provisional_registration_status, provisional_validity, permanent_validity, owner_eligibility, foreign_company_ownership, local_agent_requirement, mortgage_registration_status, radio_licence_requirement, classification_requirement, survey_inspection_requirement, commercial_yacht_code, minimum_safe_manning, indicative_processing_time, vat_tax_note, crew_note, required_documents_summary, objective_advantages, limitations_and_risks, official_registry_url, primary_fee_url, official_website, vat_notes, crew_restrictions, advantages, disadvantages, confidence_level, coverage_status, missing_verification_notes, verification_notes, last_verified_at, last_updated, source_version, data_quality_score, data_quality_status, original_row, active) values ('united-kingdom', 'united-kingdom', 'flag:united-kingdom', 'United Kingdom', 'United Kingdom', 'United Kingdom', 'UK Ship Register / Maritime and Coastguard Agency', 'uk national red ensign registry', 'UK national Red Ensign registry', false, true, true, 'yes', 'yes', 'Part 3 SSR is for vessels below 24 m; Part 1 broader', 'No universal minimum; coding regimes vary by size/use', 'Part 1 supports large vessels', 'Code-dependent', 'case_dependent', 'Case-dependent', 'Part 1 registration valid 5 years; Part 3 valid 5 years', 'Part-specific UK/qualifying ownership and residence rules', 'Part 1 subject to qualified ownership rules', 'Depends on ownership and register part', 'case_dependent', 'Yes, separate Ofcom licensing', 'Commercial coding/class requirements depend on size and operation', 'Tonnage measurement and commercial coding/safety surveys as applicable', 'REG Yacht Code / UK small commercial vessel codes', 'Safe Manning Document mandatory for relevant UK-flag yachts over 24 m, excluding qualifying pleasure-only use', 'Depends on Part and document/measurement completeness', 'Non-EU flag after Brexit; VAT/customs status is independent of registration', 'Commercial coding, qualifications and safe manning apply by yacht size/service', 'Application, dimensions/tonnage, ownership/title, builder/bill of sale, prior registry deletion, radio and commercial safety documents where applicable', 'Established title/mortgage register; transparent Part 1 and SSR fees; broad regulatory framework', 'Different register parts have materially different eligibility and legal effect; commercial coding must be modelled separately', 'https://www.gov.uk/register-a-boat/the-uk-ship-register', 'https://www.gov.uk/register-a-boat/the-uk-ship-register', 'https://www.gov.uk/register-a-boat/the-uk-ship-register', 'Non-EU flag after Brexit; VAT/customs status is independent of registration', 'Commercial coding, qualifications and safe manning apply by yacht size/service', '["Established title/mortgage register", "transparent Part 1 and SSR fees", "broad regulatory framework"]'::jsonb, '["Different register parts have materially different eligibility and legal effect", "commercial coding must be modelled separately"]'::jsonb, 'High', 'Verified', 'Add detailed Part 1 ownership-country matrix and commercial survey/coding fees', 'Add detailed Part 1 ownership-country matrix and commercial survey/coding fees', '2026-07-27', '2026-07-27', 'Yachtworth_Flag_Registry_Base_v1', 100, 'production_ready', '{"Annual / Renewal Fee": "Part 1 renewal £72 for 5 years; SSR £35 for 5 years", "Classification Requirement": "Commercial coding/class requirements depend on size and operation", "Commercial Minimum LOA": "No universal minimum; coding regimes vary by size/use", "Commercial Registration": "Yes", "Commercial Yacht Code": "REG Yacht Code / UK small commercial vessel codes", "Confidence": "High", "Country / Territory": "United Kingdom", "Coverage Status": "Verified", "Crew Note": "Commercial coding, qualifications and safe manning apply by yacht size/service", "EU Flag": "No", "Fee Source": "https://www.gov.uk/register-a-boat/the-uk-ship-register", "Flag": "United Kingdom", "Foreign Company Ownership": "Part 1 subject to qualified ownership rules", "Indicative Processing Time": "Depends on Part and document/measurement completeness", "Initial Registration Fee": "Part 1 £153 for 5 years; Part 3 SSR £35 for 5 years; Part 4 £35–£196", "Last Verified": "46230", "Limitations / Risks": "Different register parts have materially different eligibility and legal effect; commercial coding must be modelled separately", "Local / Resident Agent": "Depends on ownership and register part", "Main Official Source": "https://www.gov.uk/register-a-boat/the-uk-ship-register", "Maximum LOA / GT": "Part 1 supports large vessels", "Minimum Safe Manning": "Safe Manning Document mandatory for relevant UK-flag yachts over 24 m, excluding qualifying pleasure-only use", "Missing / Next Verification": "Add detailed Part 1 ownership-country matrix and commercial survey/coding fees", "Mortgage Registration": "Yes under Part 1", "Objective Advantages": "Established title/mortgage register; transparent Part 1 and SSR fees; broad regulatory framework", "Official Registry": "UK Ship Register / Maritime and Coastguard Agency", "Other Confirmed Fees": "Safe Manning Document fee £199", "Owner Eligibility": "Part-specific UK/qualifying ownership and residence rules", "Passenger Limit": "Code-dependent", "Permanent Validity / Renewal": "Part 1 registration valid 5 years; Part 3 valid 5 years", "Private Minimum LOA": "Part 3 SSR is for vessels below 24 m; Part 1 broader", "Private Registration": "Yes", "Provisional / Interim": "Temporary and charter routes exist; case-specific", "Provisional Validity": "Case-dependent", "Radio Licence": "Yes, separate Ofcom licensing", "Registry Family": "UK national Red Ensign registry", "Required Documents Summary": "Application, dimensions/tonnage, ownership/title, builder/bill of sale, prior registry deletion, radio and commercial safety documents where applicable", "Survey / Inspection": "Tonnage measurement and commercial coding/safety surveys as applicable", "VAT / Tax Note": "Non-EU flag after Brexit; VAT/customs status is independent of registration"}'::jsonb, true) on conflict (import_key) do update set flag_name=excluded.flag_name, country=excluded.country, country_or_territory=excluded.country_or_territory, official_registry_name=excluded.official_registry_name, registry_type=excluded.registry_type, registry_family=excluded.registry_family, is_eu_flag=excluded.is_eu_flag, private_available=excluded.private_available, commercial_available=excluded.commercial_available, private_registration_status=excluded.private_registration_status, commercial_registration_status=excluded.commercial_registration_status, private_minimum_loa=excluded.private_minimum_loa, commercial_minimum_loa=excluded.commercial_minimum_loa, maximum_loa_gt_notes=excluded.maximum_loa_gt_notes, passenger_limit_notes=excluded.passenger_limit_notes, provisional_registration_status=excluded.provisional_registration_status, provisional_validity=excluded.provisional_validity, permanent_validity=excluded.permanent_validity, owner_eligibility=excluded.owner_eligibility, foreign_company_ownership=excluded.foreign_company_ownership, local_agent_requirement=excluded.local_agent_requirement, mortgage_registration_status=excluded.mortgage_registration_status, radio_licence_requirement=excluded.radio_licence_requirement, classification_requirement=excluded.classification_requirement, survey_inspection_requirement=excluded.survey_inspection_requirement, commercial_yacht_code=excluded.commercial_yacht_code, minimum_safe_manning=excluded.minimum_safe_manning, indicative_processing_time=excluded.indicative_processing_time, vat_tax_note=excluded.vat_tax_note, crew_note=excluded.crew_note, required_documents_summary=excluded.required_documents_summary, objective_advantages=excluded.objective_advantages, limitations_and_risks=excluded.limitations_and_risks, official_registry_url=excluded.official_registry_url, primary_fee_url=excluded.primary_fee_url, official_website=excluded.official_website, vat_notes=excluded.vat_notes, crew_restrictions=excluded.crew_restrictions, advantages=excluded.advantages, disadvantages=excluded.disadvantages, confidence_level=excluded.confidence_level, coverage_status=excluded.coverage_status, missing_verification_notes=excluded.missing_verification_notes, verification_notes=excluded.verification_notes, last_verified_at=excluded.last_verified_at, last_updated=excluded.last_updated, source_version=excluded.source_version, data_quality_score=excluded.data_quality_score, data_quality_status=excluded.data_quality_status, original_row=excluded.original_row, active=excluded.active, updated_at=now();

insert into public.flag_registries (code, slug, import_key, flag_name, country, country_or_territory, official_registry_name, registry_type, registry_family, is_eu_flag, private_available, commercial_available, private_registration_status, commercial_registration_status, private_minimum_loa, commercial_minimum_loa, maximum_loa_gt_notes, passenger_limit_notes, provisional_registration_status, provisional_validity, permanent_validity, owner_eligibility, foreign_company_ownership, local_agent_requirement, mortgage_registration_status, radio_licence_requirement, classification_requirement, survey_inspection_requirement, commercial_yacht_code, minimum_safe_manning, indicative_processing_time, vat_tax_note, crew_note, required_documents_summary, objective_advantages, limitations_and_risks, official_registry_url, primary_fee_url, official_website, vat_notes, crew_restrictions, advantages, disadvantages, confidence_level, coverage_status, missing_verification_notes, verification_notes, last_verified_at, last_updated, source_version, data_quality_score, data_quality_status, original_row, active) values ('france', 'france', 'flag:france', 'France', 'France', 'France', 'French Maritime Administration / RIF for qualifying commercial yachts', 'eu national registry', 'EU national registry', true, true, true, 'yes', 'yes', 'National registration rules vary by craft and navigation', 'RIF commercial yachts over 15 m; commercial yachts up to 24 m also subject to Division 241 pathways', 'No single public yacht maximum identified', 'Regime/code-dependent', 'not_confirmed', 'Not confirmed', 'Subject to French registration and safety certification', 'French/EU and qualifying ownership rules; corporate and operational conditions require case analysis', 'Possible subject to national/EU establishment and representative rules', 'Case-dependent', 'case_dependent', 'Yes', 'Commercial yacht requirements depend on size, service and applicable safety division', 'Commercial yachts require approval/safety certification; regional safety commission may apply', 'French regulatory divisions, including Division 241 for relevant commercial yachts', 'Commercial operation requires manning decision/certification', 'Authority- and dossier-dependent', 'EU flag. VAT, importation, charter and French tax exposure must be analysed separately; RIF commercial treatment has specific rules.', 'Commercial crewing is subject to French/EU maritime labour and certification rules', 'Ownership/title, identity/entity documents, technical and conformity certificates, deletion evidence, radio and commercial safety/manning documents', 'EU flag; dedicated RIF route for qualifying commercial yachts; direct alignment with French operations', 'More fragmented administrative pathways; tax, labour and commercial-operation rules are case-specific', 'https://www.mer.gouv.fr/immatriculation-et-enregistrement-des-navires', 'https://www.rif.mer.gouv.fr/', 'https://www.mer.gouv.fr/immatriculation-et-enregistrement-des-navires', 'EU flag. VAT, importation, charter and French tax exposure must be analysed separately; RIF commercial treatment has specific rules.', 'Commercial crewing is subject to French/EU maritime labour and certification rules', '["EU flag", "dedicated RIF route for qualifying commercial yachts", "direct alignment with French operations"]'::jsonb, '["More fragmented administrative pathways", "tax, labour and commercial-operation rules are case-specific"]'::jsonb, 'Medium', 'Verified with gaps', 'Map exact fees, owner eligibility and private/commercial procedures by yacht size and home port', 'Map exact fees, owner eligibility and private/commercial procedures by yacht size and home port', '2026-07-27', '2026-07-27', 'Yachtworth_Flag_Registry_Base_v1', 100, 'usable_with_warnings', '{"Annual / Renewal Fee": "Tax/annual charge depends on yacht and regime; RIF commercial yachts have specific exemptions", "Classification Requirement": "Commercial yacht requirements depend on size, service and applicable safety division", "Commercial Minimum LOA": "RIF commercial yachts over 15 m; commercial yachts up to 24 m also subject to Division 241 pathways", "Commercial Registration": "Yes", "Commercial Yacht Code": "French regulatory divisions, including Division 241 for relevant commercial yachts", "Confidence": "Medium", "Country / Territory": "France", "Coverage Status": "Verified with gaps", "Crew Note": "Commercial crewing is subject to French/EU maritime labour and certification rules", "EU Flag": "Yes", "Fee Source": "https://www.rif.mer.gouv.fr/", "Flag": "France", "Foreign Company Ownership": "Possible subject to national/EU establishment and representative rules", "Indicative Processing Time": "Authority- and dossier-dependent", "Initial Registration Fee": "No single national yacht fee found; administrative and technical costs depend on route", "Last Verified": "46230", "Limitations / Risks": "More fragmented administrative pathways; tax, labour and commercial-operation rules are case-specific", "Local / Resident Agent": "Case-dependent", "Main Official Source": "https://www.mer.gouv.fr/immatriculation-et-enregistrement-des-navires", "Maximum LOA / GT": "No single public yacht maximum identified", "Minimum Safe Manning": "Commercial operation requires manning decision/certification", "Missing / Next Verification": "Map exact fees, owner eligibility and private/commercial procedures by yacht size and home port", "Mortgage Registration": "French maritime mortgage framework exists; procedural verification required", "Objective Advantages": "EU flag; dedicated RIF route for qualifying commercial yachts; direct alignment with French operations", "Official Registry": "French Maritime Administration / RIF for qualifying commercial yachts", "Other Confirmed Fees": "Survey, safety approval, radio and professional-service costs may apply", "Owner Eligibility": "French/EU and qualifying ownership rules; corporate and operational conditions require case analysis", "Passenger Limit": "Regime/code-dependent", "Permanent Validity / Renewal": "Subject to French registration and safety certification", "Private Minimum LOA": "National registration rules vary by craft and navigation", "Private Registration": "Yes", "Provisional / Interim": "Not confirmed as a standard yacht product", "Provisional Validity": "Not confirmed", "Radio Licence": "Yes", "Registry Family": "EU national registry", "Required Documents Summary": "Ownership/title, identity/entity documents, technical and conformity certificates, deletion evidence, radio and commercial safety/manning documents", "Survey / Inspection": "Commercial yachts require approval/safety certification; regional safety commission may apply", "VAT / Tax Note": "EU flag. VAT, importation, charter and French tax exposure must be analysed separately; RIF commercial treatment has specific rules."}'::jsonb, true) on conflict (import_key) do update set flag_name=excluded.flag_name, country=excluded.country, country_or_territory=excluded.country_or_territory, official_registry_name=excluded.official_registry_name, registry_type=excluded.registry_type, registry_family=excluded.registry_family, is_eu_flag=excluded.is_eu_flag, private_available=excluded.private_available, commercial_available=excluded.commercial_available, private_registration_status=excluded.private_registration_status, commercial_registration_status=excluded.commercial_registration_status, private_minimum_loa=excluded.private_minimum_loa, commercial_minimum_loa=excluded.commercial_minimum_loa, maximum_loa_gt_notes=excluded.maximum_loa_gt_notes, passenger_limit_notes=excluded.passenger_limit_notes, provisional_registration_status=excluded.provisional_registration_status, provisional_validity=excluded.provisional_validity, permanent_validity=excluded.permanent_validity, owner_eligibility=excluded.owner_eligibility, foreign_company_ownership=excluded.foreign_company_ownership, local_agent_requirement=excluded.local_agent_requirement, mortgage_registration_status=excluded.mortgage_registration_status, radio_licence_requirement=excluded.radio_licence_requirement, classification_requirement=excluded.classification_requirement, survey_inspection_requirement=excluded.survey_inspection_requirement, commercial_yacht_code=excluded.commercial_yacht_code, minimum_safe_manning=excluded.minimum_safe_manning, indicative_processing_time=excluded.indicative_processing_time, vat_tax_note=excluded.vat_tax_note, crew_note=excluded.crew_note, required_documents_summary=excluded.required_documents_summary, objective_advantages=excluded.objective_advantages, limitations_and_risks=excluded.limitations_and_risks, official_registry_url=excluded.official_registry_url, primary_fee_url=excluded.primary_fee_url, official_website=excluded.official_website, vat_notes=excluded.vat_notes, crew_restrictions=excluded.crew_restrictions, advantages=excluded.advantages, disadvantages=excluded.disadvantages, confidence_level=excluded.confidence_level, coverage_status=excluded.coverage_status, missing_verification_notes=excluded.missing_verification_notes, verification_notes=excluded.verification_notes, last_verified_at=excluded.last_verified_at, last_updated=excluded.last_updated, source_version=excluded.source_version, data_quality_score=excluded.data_quality_score, data_quality_status=excluded.data_quality_status, original_row=excluded.original_row, active=excluded.active, updated_at=now();

insert into public.flag_registries (code, slug, import_key, flag_name, country, country_or_territory, official_registry_name, registry_type, registry_family, is_eu_flag, private_available, commercial_available, private_registration_status, commercial_registration_status, private_minimum_loa, commercial_minimum_loa, maximum_loa_gt_notes, passenger_limit_notes, provisional_registration_status, provisional_validity, permanent_validity, owner_eligibility, foreign_company_ownership, local_agent_requirement, mortgage_registration_status, radio_licence_requirement, classification_requirement, survey_inspection_requirement, commercial_yacht_code, minimum_safe_manning, indicative_processing_time, vat_tax_note, crew_note, required_documents_summary, objective_advantages, limitations_and_risks, official_registry_url, primary_fee_url, official_website, vat_notes, crew_restrictions, advantages, disadvantages, confidence_level, coverage_status, missing_verification_notes, verification_notes, last_verified_at, last_updated, source_version, data_quality_score, data_quality_status, original_row, active) values ('italy', 'italy', 'flag:italy', 'Italy', 'Italy', 'Italy', 'Italian Ministry of Infrastructure and Transport / ATCN', 'eu national registry', 'EU national registry', true, true, false, 'yes', 'case_dependent', 'Category-dependent under Italian recreational craft law', 'Not confirmed as one universal threshold', 'No single maximum identified', 'Regime-dependent', 'case_dependent', 'Not confirmed', 'Subject to ATCN/registry and safety documentation', 'Italian/EU and qualifying legal-person rules; exact route depends on register', 'Possible subject to establishment/representative requirements', 'Case-dependent', 'case_dependent', 'Yes', 'Commercial/large yacht technical rules apply', 'Conformity, safety and registry technical procedures apply', 'Italian national/EU commercial yacht rules', 'Commercial case-dependent', 'Office and dossier dependent; ATCN/STED digitises parts of procedure', 'EU flag; VAT-paid status and Italian tax/use exposure require separate review', 'Commercial manning and labour rules depend on service and yacht classification', 'Ownership/title, identity/company documents, technical conformity and tonnage, prior deletion, radio and commercial certificates', 'EU flag and direct fit for Italian home-port operations', 'Procedures and fees are dispersed among national systems; not suitable for automatic pricing until tariff mapping is complete', 'https://www.mit.gov.it/temi/trasporti/nautica-da-diporto', 'https://www.mit.gov.it/documentazione/pagamenti-pagopa-nautica-da-diporto', 'https://www.mit.gov.it/temi/trasporti/nautica-da-diporto', 'EU flag; VAT-paid status and Italian tax/use exposure require separate review', 'Commercial manning and labour rules depend on service and yacht classification', '["EU flag and direct fit for Italian home-port operations"]'::jsonb, '["Procedures and fees are dispersed among national systems", "not suitable for automatic pricing until tariff mapping is complete"]'::jsonb, 'Medium', 'Partial', 'Obtain current registration tariff, owner eligibility matrix and commercial yacht procedure', 'Obtain current registration tariff, owner eligibility matrix and commercial yacht procedure', '2026-07-27', '2026-07-27', 'Yachtworth_Flag_Registry_Base_v1', 100, 'research_required', '{"Annual / Renewal Fee": "No universal registry renewal figure identified", "Classification Requirement": "Commercial/large yacht technical rules apply", "Commercial Minimum LOA": "Not confirmed as one universal threshold", "Commercial Registration": "Yes – through distinct commercial/international procedures", "Commercial Yacht Code": "Italian national/EU commercial yacht rules", "Confidence": "Medium", "Country / Territory": "Italy", "Coverage Status": "Partial", "Crew Note": "Commercial manning and labour rules depend on service and yacht classification", "EU Flag": "Yes", "Fee Source": "https://www.mit.gov.it/documentazione/pagamenti-pagopa-nautica-da-diporto", "Flag": "Italy", "Foreign Company Ownership": "Possible subject to establishment/representative requirements", "Indicative Processing Time": "Office and dossier dependent; ATCN/STED digitises parts of procedure", "Initial Registration Fee": "PagoPA/statutory tariff; exact current fee depends on procedure", "Last Verified": "46230", "Limitations / Risks": "Procedures and fees are dispersed among national systems; not suitable for automatic pricing until tariff mapping is complete", "Local / Resident Agent": "Case-dependent", "Main Official Source": "https://www.mit.gov.it/temi/trasporti/nautica-da-diporto", "Maximum LOA / GT": "No single maximum identified", "Minimum Safe Manning": "Commercial case-dependent", "Missing / Next Verification": "Obtain current registration tariff, owner eligibility matrix and commercial yacht procedure", "Mortgage Registration": "Maritime mortgage registration available through relevant register", "Objective Advantages": "EU flag and direct fit for Italian home-port operations", "Official Registry": "Italian Ministry of Infrastructure and Transport / ATCN", "Other Confirmed Fees": "Technical, tax, radio, survey and professional costs may apply", "Owner Eligibility": "Italian/EU and qualifying legal-person rules; exact route depends on register", "Passenger Limit": "Regime-dependent", "Permanent Validity / Renewal": "Subject to ATCN/registry and safety documentation", "Private Minimum LOA": "Category-dependent under Italian recreational craft law", "Private Registration": "Yes", "Provisional / Interim": "Temporary/provisional documentation may exist by procedure; not fully mapped", "Provisional Validity": "Not confirmed", "Radio Licence": "Yes", "Registry Family": "EU national registry", "Required Documents Summary": "Ownership/title, identity/company documents, technical conformity and tonnage, prior deletion, radio and commercial certificates", "Survey / Inspection": "Conformity, safety and registry technical procedures apply", "VAT / Tax Note": "EU flag; VAT-paid status and Italian tax/use exposure require separate review"}'::jsonb, true) on conflict (import_key) do update set flag_name=excluded.flag_name, country=excluded.country, country_or_territory=excluded.country_or_territory, official_registry_name=excluded.official_registry_name, registry_type=excluded.registry_type, registry_family=excluded.registry_family, is_eu_flag=excluded.is_eu_flag, private_available=excluded.private_available, commercial_available=excluded.commercial_available, private_registration_status=excluded.private_registration_status, commercial_registration_status=excluded.commercial_registration_status, private_minimum_loa=excluded.private_minimum_loa, commercial_minimum_loa=excluded.commercial_minimum_loa, maximum_loa_gt_notes=excluded.maximum_loa_gt_notes, passenger_limit_notes=excluded.passenger_limit_notes, provisional_registration_status=excluded.provisional_registration_status, provisional_validity=excluded.provisional_validity, permanent_validity=excluded.permanent_validity, owner_eligibility=excluded.owner_eligibility, foreign_company_ownership=excluded.foreign_company_ownership, local_agent_requirement=excluded.local_agent_requirement, mortgage_registration_status=excluded.mortgage_registration_status, radio_licence_requirement=excluded.radio_licence_requirement, classification_requirement=excluded.classification_requirement, survey_inspection_requirement=excluded.survey_inspection_requirement, commercial_yacht_code=excluded.commercial_yacht_code, minimum_safe_manning=excluded.minimum_safe_manning, indicative_processing_time=excluded.indicative_processing_time, vat_tax_note=excluded.vat_tax_note, crew_note=excluded.crew_note, required_documents_summary=excluded.required_documents_summary, objective_advantages=excluded.objective_advantages, limitations_and_risks=excluded.limitations_and_risks, official_registry_url=excluded.official_registry_url, primary_fee_url=excluded.primary_fee_url, official_website=excluded.official_website, vat_notes=excluded.vat_notes, crew_restrictions=excluded.crew_restrictions, advantages=excluded.advantages, disadvantages=excluded.disadvantages, confidence_level=excluded.confidence_level, coverage_status=excluded.coverage_status, missing_verification_notes=excluded.missing_verification_notes, verification_notes=excluded.verification_notes, last_verified_at=excluded.last_verified_at, last_updated=excluded.last_updated, source_version=excluded.source_version, data_quality_score=excluded.data_quality_score, data_quality_status=excluded.data_quality_status, original_row=excluded.original_row, active=excluded.active, updated_at=now();

insert into public.flag_registries (code, slug, import_key, flag_name, country, country_or_territory, official_registry_name, registry_type, registry_family, is_eu_flag, private_available, commercial_available, private_registration_status, commercial_registration_status, private_minimum_loa, commercial_minimum_loa, maximum_loa_gt_notes, passenger_limit_notes, provisional_registration_status, provisional_validity, permanent_validity, owner_eligibility, foreign_company_ownership, local_agent_requirement, mortgage_registration_status, radio_licence_requirement, classification_requirement, survey_inspection_requirement, commercial_yacht_code, minimum_safe_manning, indicative_processing_time, vat_tax_note, crew_note, required_documents_summary, objective_advantages, limitations_and_risks, official_registry_url, primary_fee_url, official_website, vat_notes, crew_restrictions, advantages, disadvantages, confidence_level, coverage_status, missing_verification_notes, verification_notes, last_verified_at, last_updated, source_version, data_quality_score, data_quality_status, original_row, active) values ('spain', 'spain', 'flag:spain', 'Spain', 'Spain', 'Spain', 'Spanish Maritime Administration', 'eu national registry', 'EU national registry', true, false, false, 'case_dependent', 'case_dependent', 'Special simplified regime exists for qualifying CE craft up to 12 m', 'No single minimum confirmed', 'No single public maximum identified', 'Regime-dependent', 'case_dependent', 'Not confirmed', 'Registration certificate generally renewed every 5 years in reviewed procedure', 'Spanish/EU and qualifying ownership/establishment rules', 'Possible subject to legal establishment/representative conditions', 'Case-dependent', 'case_dependent', 'Yes', 'Commercial/large craft requirements depend on category', 'Navigability/safety certification and inspections apply by size/use', 'Spanish national recreational/commercial vessel rules', 'Commercial case-dependent', 'Authority/dossier dependent', 'EU flag; Spanish registration/use taxes and VAT must be separately assessed', 'Commercial manning and qualification requirements apply', 'Application, ownership, identity/entity documents, technical/conformity and tonnage data, deletion evidence, tax payment, radio and safety documents', 'EU flag with explicit private and commercial list categories', 'Tax and administrative impact can be material; exact amount requires yacht and owner profile', 'https://sede.transportes.gob.es/areas-actividad/marina-mercante/registro-buques-empresas-navieras', 'https://sede.transportes.gob.es/areas-actividad/marina-mercante/tasas', 'https://sede.transportes.gob.es/areas-actividad/marina-mercante/registro-buques-empresas-navieras', 'EU flag; Spanish registration/use taxes and VAT must be separately assessed', 'Commercial manning and qualification requirements apply', '["EU flag with explicit private and commercial list categories"]'::jsonb, '["Tax and administrative impact can be material", "exact amount requires yacht and owner profile"]'::jsonb, 'Medium', 'Verified with gaps', 'Build GT-based fee formula and owner/tax eligibility logic', 'Build GT-based fee formula and owner/tax eligibility logic', '2026-07-27', '2026-07-27', 'Yachtworth_Flag_Registry_Base_v1', 100, 'usable_with_warnings', '{"Annual / Renewal Fee": "No universal annual registry fee identified", "Classification Requirement": "Commercial/large craft requirements depend on category", "Commercial Minimum LOA": "No single minimum confirmed", "Commercial Registration": "Yes – Lista 6ª", "Commercial Yacht Code": "Spanish national recreational/commercial vessel rules", "Confidence": "Medium", "Country / Territory": "Spain", "Coverage Status": "Verified with gaps", "Crew Note": "Commercial manning and qualification requirements apply", "EU Flag": "Yes", "Fee Source": "https://sede.transportes.gob.es/areas-actividad/marina-mercante/tasas", "Flag": "Spain", "Foreign Company Ownership": "Possible subject to legal establishment/representative conditions", "Indicative Processing Time": "Authority/dossier dependent", "Initial Registration Fee": "Tax code 025; registration/deletion charge calculated using GT", "Last Verified": "46230", "Limitations / Risks": "Tax and administrative impact can be material; exact amount requires yacht and owner profile", "Local / Resident Agent": "Case-dependent", "Main Official Source": "https://sede.transportes.gob.es/areas-actividad/marina-mercante/registro-buques-empresas-navieras", "Maximum LOA / GT": "No single public maximum identified", "Minimum Safe Manning": "Commercial case-dependent", "Missing / Next Verification": "Build GT-based fee formula and owner/tax eligibility logic", "Mortgage Registration": "Maritime property/mortgage recording available; procedure to verify", "Objective Advantages": "EU flag with explicit private and commercial list categories", "Official Registry": "Spanish Maritime Administration", "Other Confirmed Fees": "Inspection, radio and professional costs additional", "Owner Eligibility": "Spanish/EU and qualifying ownership/establishment rules", "Passenger Limit": "Regime-dependent", "Permanent Validity / Renewal": "Registration certificate generally renewed every 5 years in reviewed procedure", "Private Minimum LOA": "Special simplified regime exists for qualifying CE craft up to 12 m", "Private Registration": "Yes – Lista 7ª", "Provisional / Interim": "Not mapped", "Provisional Validity": "Not confirmed", "Radio Licence": "Yes", "Registry Family": "EU national registry", "Required Documents Summary": "Application, ownership, identity/entity documents, technical/conformity and tonnage data, deletion evidence, tax payment, radio and safety documents", "Survey / Inspection": "Navigability/safety certification and inspections apply by size/use", "VAT / Tax Note": "EU flag; Spanish registration/use taxes and VAT must be separately assessed"}'::jsonb, true) on conflict (import_key) do update set flag_name=excluded.flag_name, country=excluded.country, country_or_territory=excluded.country_or_territory, official_registry_name=excluded.official_registry_name, registry_type=excluded.registry_type, registry_family=excluded.registry_family, is_eu_flag=excluded.is_eu_flag, private_available=excluded.private_available, commercial_available=excluded.commercial_available, private_registration_status=excluded.private_registration_status, commercial_registration_status=excluded.commercial_registration_status, private_minimum_loa=excluded.private_minimum_loa, commercial_minimum_loa=excluded.commercial_minimum_loa, maximum_loa_gt_notes=excluded.maximum_loa_gt_notes, passenger_limit_notes=excluded.passenger_limit_notes, provisional_registration_status=excluded.provisional_registration_status, provisional_validity=excluded.provisional_validity, permanent_validity=excluded.permanent_validity, owner_eligibility=excluded.owner_eligibility, foreign_company_ownership=excluded.foreign_company_ownership, local_agent_requirement=excluded.local_agent_requirement, mortgage_registration_status=excluded.mortgage_registration_status, radio_licence_requirement=excluded.radio_licence_requirement, classification_requirement=excluded.classification_requirement, survey_inspection_requirement=excluded.survey_inspection_requirement, commercial_yacht_code=excluded.commercial_yacht_code, minimum_safe_manning=excluded.minimum_safe_manning, indicative_processing_time=excluded.indicative_processing_time, vat_tax_note=excluded.vat_tax_note, crew_note=excluded.crew_note, required_documents_summary=excluded.required_documents_summary, objective_advantages=excluded.objective_advantages, limitations_and_risks=excluded.limitations_and_risks, official_registry_url=excluded.official_registry_url, primary_fee_url=excluded.primary_fee_url, official_website=excluded.official_website, vat_notes=excluded.vat_notes, crew_restrictions=excluded.crew_restrictions, advantages=excluded.advantages, disadvantages=excluded.disadvantages, confidence_level=excluded.confidence_level, coverage_status=excluded.coverage_status, missing_verification_notes=excluded.missing_verification_notes, verification_notes=excluded.verification_notes, last_verified_at=excluded.last_verified_at, last_updated=excluded.last_updated, source_version=excluded.source_version, data_quality_score=excluded.data_quality_score, data_quality_status=excluded.data_quality_status, original_row=excluded.original_row, active=excluded.active, updated_at=now();

insert into public.flag_registries (code, slug, import_key, flag_name, country, country_or_territory, official_registry_name, registry_type, registry_family, is_eu_flag, private_available, commercial_available, private_registration_status, commercial_registration_status, private_minimum_loa, commercial_minimum_loa, maximum_loa_gt_notes, passenger_limit_notes, provisional_registration_status, provisional_validity, permanent_validity, owner_eligibility, foreign_company_ownership, local_agent_requirement, mortgage_registration_status, radio_licence_requirement, classification_requirement, survey_inspection_requirement, commercial_yacht_code, minimum_safe_manning, indicative_processing_time, vat_tax_note, crew_note, required_documents_summary, objective_advantages, limitations_and_risks, official_registry_url, primary_fee_url, official_website, vat_notes, crew_restrictions, advantages, disadvantages, confidence_level, coverage_status, missing_verification_notes, verification_notes, last_verified_at, last_updated, source_version, data_quality_score, data_quality_status, original_row, active) values ('netherlands', 'netherlands', 'flag:netherlands', 'Netherlands', 'Netherlands', 'Netherlands', 'ILT / Kadaster', 'eu national registry', 'EU national registry', true, true, false, 'yes', 'case_dependent', 'No universal minimum identified; seabrief is non-commercial', 'No universal yacht minimum identified', 'No single maximum identified', 'Regime-dependent', 'not_confirmed', 'Not confirmed', 'Kadaster/title and nationality document requirements apply', 'Dutch/EU ownership and establishment/nationality-test rules', 'Possible subject to nationality test and establishment conditions', 'Case-dependent', 'case_dependent', 'Yes', 'Commercial vessel requirements apply', 'Measurement certificate and commercial certification where applicable', 'Dutch/EU commercial vessel rules', 'Commercial case-dependent', 'Depends on Kadaster registration, measurement and nationality test', 'EU flag; VAT status is separate from registration', 'Commercial manning rules depend on service', 'Kadaster/title documents, ownership/entity evidence, measurement, nationality test, radio and commercial certificates as applicable', 'EU title/mortgage route; public fee components; clear separation of pleasure seabrief and merchant registration', 'Pleasure seabrief cannot be used for commercial operation; total cost requires several agencies', 'https://english.ilent.nl/topics/registration-of-seagoing-vessels', 'https://english.ilent.nl/topics/registration-of-seagoing-vessels/costs', 'https://english.ilent.nl/topics/registration-of-seagoing-vessels', 'EU flag; VAT status is separate from registration', 'Commercial manning rules depend on service', '["EU title/mortgage route", "public fee components", "clear separation of pleasure seabrief and merchant registration"]'::jsonb, '["Pleasure seabrief cannot be used for commercial operation", "total cost requires several agencies"]'::jsonb, 'High', 'Verified with gaps', 'Confirm complete 2026 fee bundle and commercial yacht certification by LOA/GT', 'Confirm complete 2026 fee bundle and commercial yacht certification by LOA/GT', '2026-07-27', '2026-07-27', 'Yachtworth_Flag_Registry_Base_v1', 100, 'production_ready', '{"Annual / Renewal Fee": "No universal annual registry fee identified", "Classification Requirement": "Commercial vessel requirements apply", "Commercial Minimum LOA": "No universal yacht minimum identified", "Commercial Registration": "Yes – merchant register route", "Commercial Yacht Code": "Dutch/EU commercial vessel rules", "Confidence": "High", "Country / Territory": "Netherlands", "Coverage Status": "Verified with gaps", "Crew Note": "Commercial manning rules depend on service", "EU Flag": "Yes", "Fee Source": "https://english.ilent.nl/topics/registration-of-seagoing-vessels/costs", "Flag": "Netherlands", "Foreign Company Ownership": "Possible subject to nationality test and establishment conditions", "Indicative Processing Time": "Depends on Kadaster registration, measurement and nationality test", "Initial Registration Fee": "2026 examples: Kadaster registration €630; seabrief €221; measurement <24 m €201", "Last Verified": "46230", "Limitations / Risks": "Pleasure seabrief cannot be used for commercial operation; total cost requires several agencies", "Local / Resident Agent": "Case-dependent", "Main Official Source": "https://english.ilent.nl/topics/registration-of-seagoing-vessels", "Maximum LOA / GT": "No single maximum identified", "Minimum Safe Manning": "Commercial case-dependent", "Missing / Next Verification": "Confirm complete 2026 fee bundle and commercial yacht certification by LOA/GT", "Mortgage Registration": "Yes after Kadaster registration", "Objective Advantages": "EU title/mortgage route; public fee components; clear separation of pleasure seabrief and merchant registration", "Official Registry": "ILT / Kadaster", "Other Confirmed Fees": "2026 nationality test: pleasure €248; commercial €410", "Owner Eligibility": "Dutch/EU ownership and establishment/nationality-test rules", "Passenger Limit": "Regime-dependent", "Permanent Validity / Renewal": "Kadaster/title and nationality document requirements apply", "Private Minimum LOA": "No universal minimum identified; seabrief is non-commercial", "Private Registration": "Yes", "Provisional / Interim": "Not confirmed", "Provisional Validity": "Not confirmed", "Radio Licence": "Yes", "Registry Family": "EU national registry", "Required Documents Summary": "Kadaster/title documents, ownership/entity evidence, measurement, nationality test, radio and commercial certificates as applicable", "Survey / Inspection": "Measurement certificate and commercial certification where applicable", "VAT / Tax Note": "EU flag; VAT status is separate from registration"}'::jsonb, true) on conflict (import_key) do update set flag_name=excluded.flag_name, country=excluded.country, country_or_territory=excluded.country_or_territory, official_registry_name=excluded.official_registry_name, registry_type=excluded.registry_type, registry_family=excluded.registry_family, is_eu_flag=excluded.is_eu_flag, private_available=excluded.private_available, commercial_available=excluded.commercial_available, private_registration_status=excluded.private_registration_status, commercial_registration_status=excluded.commercial_registration_status, private_minimum_loa=excluded.private_minimum_loa, commercial_minimum_loa=excluded.commercial_minimum_loa, maximum_loa_gt_notes=excluded.maximum_loa_gt_notes, passenger_limit_notes=excluded.passenger_limit_notes, provisional_registration_status=excluded.provisional_registration_status, provisional_validity=excluded.provisional_validity, permanent_validity=excluded.permanent_validity, owner_eligibility=excluded.owner_eligibility, foreign_company_ownership=excluded.foreign_company_ownership, local_agent_requirement=excluded.local_agent_requirement, mortgage_registration_status=excluded.mortgage_registration_status, radio_licence_requirement=excluded.radio_licence_requirement, classification_requirement=excluded.classification_requirement, survey_inspection_requirement=excluded.survey_inspection_requirement, commercial_yacht_code=excluded.commercial_yacht_code, minimum_safe_manning=excluded.minimum_safe_manning, indicative_processing_time=excluded.indicative_processing_time, vat_tax_note=excluded.vat_tax_note, crew_note=excluded.crew_note, required_documents_summary=excluded.required_documents_summary, objective_advantages=excluded.objective_advantages, limitations_and_risks=excluded.limitations_and_risks, official_registry_url=excluded.official_registry_url, primary_fee_url=excluded.primary_fee_url, official_website=excluded.official_website, vat_notes=excluded.vat_notes, crew_restrictions=excluded.crew_restrictions, advantages=excluded.advantages, disadvantages=excluded.disadvantages, confidence_level=excluded.confidence_level, coverage_status=excluded.coverage_status, missing_verification_notes=excluded.missing_verification_notes, verification_notes=excluded.verification_notes, last_verified_at=excluded.last_verified_at, last_updated=excluded.last_updated, source_version=excluded.source_version, data_quality_score=excluded.data_quality_score, data_quality_status=excluded.data_quality_status, original_row=excluded.original_row, active=excluded.active, updated_at=now();

insert into public.flag_registries (code, slug, import_key, flag_name, country, country_or_territory, official_registry_name, registry_type, registry_family, is_eu_flag, private_available, commercial_available, private_registration_status, commercial_registration_status, private_minimum_loa, commercial_minimum_loa, maximum_loa_gt_notes, passenger_limit_notes, provisional_registration_status, provisional_validity, permanent_validity, owner_eligibility, foreign_company_ownership, local_agent_requirement, mortgage_registration_status, radio_licence_requirement, classification_requirement, survey_inspection_requirement, commercial_yacht_code, minimum_safe_manning, indicative_processing_time, vat_tax_note, crew_note, required_documents_summary, objective_advantages, limitations_and_risks, official_registry_url, primary_fee_url, official_website, vat_notes, crew_restrictions, advantages, disadvantages, confidence_level, coverage_status, missing_verification_notes, verification_notes, last_verified_at, last_updated, source_version, data_quality_score, data_quality_status, original_row, active) values ('portugal', 'portugal', 'flag:portugal', 'Portugal', 'Portugal', 'Portugal', 'DGRM / Portuguese Maritime Authorities', 'eu national recreational registry', 'EU national recreational registry', true, true, false, 'yes', 'case_dependent', 'No universal minimum identified', 'Regime-dependent', 'No single maximum identified', 'Regime-dependent', 'not_confirmed', 'Not confirmed', 'Subject to registration and safety/navigability documentation', 'Portuguese/EU and qualifying owner/entity rules', 'Possible subject to establishment/representative rules', 'Case-dependent', 'case_dependent', 'Yes', 'Commercial/large yacht case-dependent', 'Safety/navigability inspections and technical documentation apply', 'Portuguese national/EU rules', 'Commercial case-dependent', 'Authority and inspection dependent', 'EU flag; VAT and Portuguese use/tax exposure require separate analysis', 'Commercial operation triggers Portuguese/EU crewing requirements', 'Application, ownership, identity/entity, technical/conformity, inspection/safety, radio and prior registry documents', 'EU national flag with public DGRM procedures and tariff components', 'Commercial and private pathways are administratively distinct; fee bundle is service-specific', 'https://www.dgrm.pt/en/embarcacoes-de-recreio', 'https://www.dgrm.pt/taxas', 'https://www.dgrm.pt/en/embarcacoes-de-recreio', 'EU flag; VAT and Portuguese use/tax exposure require separate analysis', 'Commercial operation triggers Portuguese/EU crewing requirements', '["EU national flag with public DGRM procedures and tariff components"]'::jsonb, '["Commercial and private pathways are administratively distinct", "fee bundle is service-specific"]'::jsonb, 'Medium', 'Verified with gaps', 'Map all 2026 fee items and commercial yacht/maritime-tourism requirements', 'Map all 2026 fee items and commercial yacht/maritime-tourism requirements', '2026-07-27', '2026-07-27', 'Yachtworth_Flag_Registry_Base_v1', 100, 'usable_with_warnings', '{"Annual / Renewal Fee": "No single universal annual registry fee identified", "Classification Requirement": "Commercial/large yacht case-dependent", "Commercial Minimum LOA": "Regime-dependent", "Commercial Registration": "Yes, but commercial operation follows separate maritime-tourism/commercial rules", "Commercial Yacht Code": "Portuguese national/EU rules", "Confidence": "Medium", "Country / Territory": "Portugal", "Coverage Status": "Verified with gaps", "Crew Note": "Commercial operation triggers Portuguese/EU crewing requirements", "EU Flag": "Yes", "Fee Source": "https://www.dgrm.pt/taxas", "Flag": "Portugal", "Foreign Company Ownership": "Possible subject to establishment/representative rules", "Indicative Processing Time": "Authority and inspection dependent", "Initial Registration Fee": "Official fee tables vary by service; 2025 recreational registration examples approximately €110.70–€138.30 by category", "Last Verified": "46230", "Limitations / Risks": "Commercial and private pathways are administratively distinct; fee bundle is service-specific", "Local / Resident Agent": "Case-dependent", "Main Official Source": "https://www.dgrm.pt/en/embarcacoes-de-recreio", "Maximum LOA / GT": "No single maximum identified", "Minimum Safe Manning": "Commercial case-dependent", "Missing / Next Verification": "Map all 2026 fee items and commercial yacht/maritime-tourism requirements", "Mortgage Registration": "Maritime property procedures available; yacht-specific workflow to verify", "Objective Advantages": "EU national flag with public DGRM procedures and tariff components", "Official Registry": "DGRM / Portuguese Maritime Authorities", "Other Confirmed Fees": "Radio, name, technical data, survey and inspection fees listed separately", "Owner Eligibility": "Portuguese/EU and qualifying owner/entity rules", "Passenger Limit": "Regime-dependent", "Permanent Validity / Renewal": "Subject to registration and safety/navigability documentation", "Private Minimum LOA": "No universal minimum identified", "Private Registration": "Yes", "Provisional / Interim": "Not confirmed", "Provisional Validity": "Not confirmed", "Radio Licence": "Yes", "Registry Family": "EU national recreational registry", "Required Documents Summary": "Application, ownership, identity/entity, technical/conformity, inspection/safety, radio and prior registry documents", "Survey / Inspection": "Safety/navigability inspections and technical documentation apply", "VAT / Tax Note": "EU flag; VAT and Portuguese use/tax exposure require separate analysis"}'::jsonb, true) on conflict (import_key) do update set flag_name=excluded.flag_name, country=excluded.country, country_or_territory=excluded.country_or_territory, official_registry_name=excluded.official_registry_name, registry_type=excluded.registry_type, registry_family=excluded.registry_family, is_eu_flag=excluded.is_eu_flag, private_available=excluded.private_available, commercial_available=excluded.commercial_available, private_registration_status=excluded.private_registration_status, commercial_registration_status=excluded.commercial_registration_status, private_minimum_loa=excluded.private_minimum_loa, commercial_minimum_loa=excluded.commercial_minimum_loa, maximum_loa_gt_notes=excluded.maximum_loa_gt_notes, passenger_limit_notes=excluded.passenger_limit_notes, provisional_registration_status=excluded.provisional_registration_status, provisional_validity=excluded.provisional_validity, permanent_validity=excluded.permanent_validity, owner_eligibility=excluded.owner_eligibility, foreign_company_ownership=excluded.foreign_company_ownership, local_agent_requirement=excluded.local_agent_requirement, mortgage_registration_status=excluded.mortgage_registration_status, radio_licence_requirement=excluded.radio_licence_requirement, classification_requirement=excluded.classification_requirement, survey_inspection_requirement=excluded.survey_inspection_requirement, commercial_yacht_code=excluded.commercial_yacht_code, minimum_safe_manning=excluded.minimum_safe_manning, indicative_processing_time=excluded.indicative_processing_time, vat_tax_note=excluded.vat_tax_note, crew_note=excluded.crew_note, required_documents_summary=excluded.required_documents_summary, objective_advantages=excluded.objective_advantages, limitations_and_risks=excluded.limitations_and_risks, official_registry_url=excluded.official_registry_url, primary_fee_url=excluded.primary_fee_url, official_website=excluded.official_website, vat_notes=excluded.vat_notes, crew_restrictions=excluded.crew_restrictions, advantages=excluded.advantages, disadvantages=excluded.disadvantages, confidence_level=excluded.confidence_level, coverage_status=excluded.coverage_status, missing_verification_notes=excluded.missing_verification_notes, verification_notes=excluded.verification_notes, last_verified_at=excluded.last_verified_at, last_updated=excluded.last_updated, source_version=excluded.source_version, data_quality_score=excluded.data_quality_score, data_quality_status=excluded.data_quality_status, original_row=excluded.original_row, active=excluded.active, updated_at=now();

insert into public.flag_registries (code, slug, import_key, flag_name, country, country_or_territory, official_registry_name, registry_type, registry_family, is_eu_flag, private_available, commercial_available, private_registration_status, commercial_registration_status, private_minimum_loa, commercial_minimum_loa, maximum_loa_gt_notes, passenger_limit_notes, provisional_registration_status, provisional_validity, permanent_validity, owner_eligibility, foreign_company_ownership, local_agent_requirement, mortgage_registration_status, radio_licence_requirement, classification_requirement, survey_inspection_requirement, commercial_yacht_code, minimum_safe_manning, indicative_processing_time, vat_tax_note, crew_note, required_documents_summary, objective_advantages, limitations_and_risks, official_registry_url, primary_fee_url, official_website, vat_notes, crew_restrictions, advantages, disadvantages, confidence_level, coverage_status, missing_verification_notes, verification_notes, last_verified_at, last_updated, source_version, data_quality_score, data_quality_status, original_row, active) values ('madeira-mar', 'madeira-mar', 'flag:madeira-mar', 'Madeira (MAR)', 'Portugal – Autonomous Region of Madeira', 'Portugal – Autonomous Region of Madeira', 'International Shipping Register of Madeira (MAR)', 'eu international registry', 'EU international registry', true, true, true, 'yes', 'yes', 'Fee bands distinguish 7–24 m and over 24 m', 'No universal minimum identified in reviewed fee information', 'No public yacht maximum identified', 'Code/service-dependent', 'case_dependent', 'Registry-specific', 'Subject to annual fees and certification', 'Portuguese/EU/international ownership structures subject to MAR eligibility', 'Yes, subject to MAR legal requirements', 'Representative/local services normally required', 'yes', 'Yes', 'Commercial/large yacht requirements apply', 'Technical and statutory certification required by service', 'Portuguese/EU/international convention framework', 'Commercial case-dependent', 'Registry and technical-document dependent', 'EU flag; MAR incentives do not replace transaction-specific VAT/tax analysis', 'Commercial crew and convention requirements apply', 'Ownership/entity, title, deletion, tonnage/class/statutory certificates, radio and manning documents', 'EU international register; transparent yacht fee formulas; private and commercial registration', 'Corporate/representative and technical costs are additional; incentive eligibility must be confirmed', 'https://www.ibc-madeira.com/en/ship-registration-mar.html', 'https://www.ibc-madeira.com/en/ship-registration-mar/yacht-registration.html', 'https://www.ibc-madeira.com/en/ship-registration-mar.html', 'EU flag; MAR incentives do not replace transaction-specific VAT/tax analysis', 'Commercial crew and convention requirements apply', '["EU international register", "transparent yacht fee formulas", "private and commercial registration"]'::jsonb, '["Corporate/representative and technical costs are additional", "incentive eligibility must be confirmed"]'::jsonb, 'High', 'Verified', 'Confirm 2026 fee notice and all mortgage, radio and survey charges', 'Confirm 2026 fee notice and all mortgage, radio and survey charges', '2026-07-27', '2026-07-27', 'Yachtworth_Flag_Registry_Base_v1', 100, 'production_ready', '{"Annual / Renewal Fee": "Private €500 for 7–24 m; over 24 m €500 + €2/GT. Commercial €1,000 fixed + same variable component", "Classification Requirement": "Commercial/large yacht requirements apply", "Commercial Minimum LOA": "No universal minimum identified in reviewed fee information", "Commercial Registration": "Yes", "Commercial Yacht Code": "Portuguese/EU/international convention framework", "Confidence": "High", "Country / Territory": "Portugal – Autonomous Region of Madeira", "Coverage Status": "Verified", "Crew Note": "Commercial crew and convention requirements apply", "EU Flag": "Yes", "Fee Source": "https://www.ibc-madeira.com/en/ship-registration-mar/yacht-registration.html", "Flag": "Madeira (MAR)", "Foreign Company Ownership": "Yes, subject to MAR legal requirements", "Indicative Processing Time": "Registry and technical-document dependent", "Initial Registration Fee": "Private €500. Commercial: €1,250 fixed + €200 up to 250 GT + €0.75 per GT above 250", "Last Verified": "46230", "Limitations / Risks": "Corporate/representative and technical costs are additional; incentive eligibility must be confirmed", "Local / Resident Agent": "Representative/local services normally required", "Main Official Source": "https://www.ibc-madeira.com/en/ship-registration-mar.html", "Maximum LOA / GT": "No public yacht maximum identified", "Minimum Safe Manning": "Commercial case-dependent", "Missing / Next Verification": "Confirm 2026 fee notice and all mortgage, radio and survey charges", "Mortgage Registration": "Yes", "Objective Advantages": "EU international register; transparent yacht fee formulas; private and commercial registration", "Official Registry": "International Shipping Register of Madeira (MAR)", "Other Confirmed Fees": "Eligible MIBC-owned entities may receive initial-fee exemption and 20% annual reduction", "Owner Eligibility": "Portuguese/EU/international ownership structures subject to MAR eligibility", "Passenger Limit": "Code/service-dependent", "Permanent Validity / Renewal": "Subject to annual fees and certification", "Private Minimum LOA": "Fee bands distinguish 7–24 m and over 24 m", "Private Registration": "Yes", "Provisional / Interim": "Available subject to registry process; exact term to verify", "Provisional Validity": "Registry-specific", "Radio Licence": "Yes", "Registry Family": "EU international registry", "Required Documents Summary": "Ownership/entity, title, deletion, tonnage/class/statutory certificates, radio and manning documents", "Survey / Inspection": "Technical and statutory certification required by service", "VAT / Tax Note": "EU flag; MAR incentives do not replace transaction-specific VAT/tax analysis"}'::jsonb, true) on conflict (import_key) do update set flag_name=excluded.flag_name, country=excluded.country, country_or_territory=excluded.country_or_territory, official_registry_name=excluded.official_registry_name, registry_type=excluded.registry_type, registry_family=excluded.registry_family, is_eu_flag=excluded.is_eu_flag, private_available=excluded.private_available, commercial_available=excluded.commercial_available, private_registration_status=excluded.private_registration_status, commercial_registration_status=excluded.commercial_registration_status, private_minimum_loa=excluded.private_minimum_loa, commercial_minimum_loa=excluded.commercial_minimum_loa, maximum_loa_gt_notes=excluded.maximum_loa_gt_notes, passenger_limit_notes=excluded.passenger_limit_notes, provisional_registration_status=excluded.provisional_registration_status, provisional_validity=excluded.provisional_validity, permanent_validity=excluded.permanent_validity, owner_eligibility=excluded.owner_eligibility, foreign_company_ownership=excluded.foreign_company_ownership, local_agent_requirement=excluded.local_agent_requirement, mortgage_registration_status=excluded.mortgage_registration_status, radio_licence_requirement=excluded.radio_licence_requirement, classification_requirement=excluded.classification_requirement, survey_inspection_requirement=excluded.survey_inspection_requirement, commercial_yacht_code=excluded.commercial_yacht_code, minimum_safe_manning=excluded.minimum_safe_manning, indicative_processing_time=excluded.indicative_processing_time, vat_tax_note=excluded.vat_tax_note, crew_note=excluded.crew_note, required_documents_summary=excluded.required_documents_summary, objective_advantages=excluded.objective_advantages, limitations_and_risks=excluded.limitations_and_risks, official_registry_url=excluded.official_registry_url, primary_fee_url=excluded.primary_fee_url, official_website=excluded.official_website, vat_notes=excluded.vat_notes, crew_restrictions=excluded.crew_restrictions, advantages=excluded.advantages, disadvantages=excluded.disadvantages, confidence_level=excluded.confidence_level, coverage_status=excluded.coverage_status, missing_verification_notes=excluded.missing_verification_notes, verification_notes=excluded.verification_notes, last_verified_at=excluded.last_verified_at, last_updated=excluded.last_updated, source_version=excluded.source_version, data_quality_score=excluded.data_quality_score, data_quality_status=excluded.data_quality_status, original_row=excluded.original_row, active=excluded.active, updated_at=now();

insert into public.flag_registries (code, slug, import_key, flag_name, country, country_or_territory, official_registry_name, registry_type, registry_family, is_eu_flag, private_available, commercial_available, private_registration_status, commercial_registration_status, private_minimum_loa, commercial_minimum_loa, maximum_loa_gt_notes, passenger_limit_notes, provisional_registration_status, provisional_validity, permanent_validity, owner_eligibility, foreign_company_ownership, local_agent_requirement, mortgage_registration_status, radio_licence_requirement, classification_requirement, survey_inspection_requirement, commercial_yacht_code, minimum_safe_manning, indicative_processing_time, vat_tax_note, crew_note, required_documents_summary, objective_advantages, limitations_and_risks, official_registry_url, primary_fee_url, official_website, vat_notes, crew_restrictions, advantages, disadvantages, confidence_level, coverage_status, missing_verification_notes, verification_notes, last_verified_at, last_updated, source_version, data_quality_score, data_quality_status, original_row, active) values ('cyprus', 'cyprus', 'flag:cyprus', 'Cyprus', 'Cyprus', 'Cyprus', 'Shipping Deputy Ministry of Cyprus', 'eu national/international registry', 'EU national/international registry', true, true, true, 'yes', 'yes', 'No universal minimum identified', 'No universal yacht minimum identified', 'No single maximum identified', 'Regime-dependent', 'yes', 'Up to 9 months including a 3-month extension', 'Permanent certificate valid indefinitely, subject to ongoing compliance', 'More than 50% EU/EEA ownership or qualifying corporate/control structure', 'Yes through qualifying corporate structure', 'Authorised representative required in specified non-resident cases; local advocate used for transactions', 'yes', 'Yes', 'Survey/tonnage via recognised class or Ministry as applicable', 'Survey and tonnage certificate required', 'Cyprus/EU/international commercial ship requirements', 'Commercial case-dependent', 'Provisional registration used while permanent documents are completed', 'EU flag; tonnage-tax/VAT eligibility requires separate legal and tax review', 'Commercial manning and endorsements apply', 'Ownership/entity qualification, advocate/representative documents, title/deletion, survey and tonnage, radio and statutory certificates', 'EU flag; provisional and permanent routes; mortgage framework; transparent commercial maintenance fee', 'Ownership/control test is structural; pleasure-yacht fee schedule and tax eligibility require confirmation', 'https://www.gov.cy/dms/en/ship-registration/', 'https://www.gov.cy/dms/en/fees-and-charges/', 'https://www.gov.cy/dms/en/ship-registration/', 'EU flag; tonnage-tax/VAT eligibility requires separate legal and tax review', 'Commercial manning and endorsements apply', '["EU flag", "provisional and permanent routes", "mortgage framework", "transparent commercial maintenance fee"]'::jsonb, '["Ownership/control test is structural", "pleasure-yacht fee schedule and tax eligibility require confirmation"]'::jsonb, 'High', 'Verified with gaps', 'Extract pleasure-yacht and technical fee schedule; define ownership tests as machine rules', 'Extract pleasure-yacht and technical fee schedule; define ownership tests as machine rules', '2026-07-27', '2026-07-27', 'Yachtworth_Flag_Registry_Base_v1', 100, 'production_ready', '{"Annual / Renewal Fee": "Commercial registry maintenance fee €300 annually; tonnage tax separate", "Classification Requirement": "Survey/tonnage via recognised class or Ministry as applicable", "Commercial Minimum LOA": "No universal yacht minimum identified", "Commercial Registration": "Yes", "Commercial Yacht Code": "Cyprus/EU/international commercial ship requirements", "Confidence": "High", "Country / Territory": "Cyprus", "Coverage Status": "Verified with gaps", "Crew Note": "Commercial manning and endorsements apply", "EU Flag": "Yes", "Fee Source": "https://www.gov.cy/dms/en/fees-and-charges/", "Flag": "Cyprus", "Foreign Company Ownership": "Yes through qualifying corporate structure", "Indicative Processing Time": "Provisional registration used while permanent documents are completed", "Initial Registration Fee": "Ocean-going commercial ships: official source states no registration or mortgage fee; pleasure yacht fees require schedule", "Last Verified": "46230", "Limitations / Risks": "Ownership/control test is structural; pleasure-yacht fee schedule and tax eligibility require confirmation", "Local / Resident Agent": "Authorised representative required in specified non-resident cases; local advocate used for transactions", "Main Official Source": "https://www.gov.cy/dms/en/ship-registration/", "Maximum LOA / GT": "No single maximum identified", "Minimum Safe Manning": "Commercial case-dependent", "Missing / Next Verification": "Extract pleasure-yacht and technical fee schedule; define ownership tests as machine rules", "Mortgage Registration": "Yes", "Objective Advantages": "EU flag; provisional and permanent routes; mortgage framework; transparent commercial maintenance fee", "Official Registry": "Shipping Deputy Ministry of Cyprus", "Other Confirmed Fees": "Legal, survey, radio and company/representative costs additional", "Owner Eligibility": "More than 50% EU/EEA ownership or qualifying corporate/control structure", "Passenger Limit": "Regime-dependent", "Permanent Validity / Renewal": "Permanent certificate valid indefinitely, subject to ongoing compliance", "Private Minimum LOA": "No universal minimum identified", "Private Registration": "Yes", "Provisional / Interim": "Yes", "Provisional Validity": "Up to 9 months including a 3-month extension", "Radio Licence": "Yes", "Registry Family": "EU national/international registry", "Required Documents Summary": "Ownership/entity qualification, advocate/representative documents, title/deletion, survey and tonnage, radio and statutory certificates", "Survey / Inspection": "Survey and tonnage certificate required", "VAT / Tax Note": "EU flag; tonnage-tax/VAT eligibility requires separate legal and tax review"}'::jsonb, true) on conflict (import_key) do update set flag_name=excluded.flag_name, country=excluded.country, country_or_territory=excluded.country_or_territory, official_registry_name=excluded.official_registry_name, registry_type=excluded.registry_type, registry_family=excluded.registry_family, is_eu_flag=excluded.is_eu_flag, private_available=excluded.private_available, commercial_available=excluded.commercial_available, private_registration_status=excluded.private_registration_status, commercial_registration_status=excluded.commercial_registration_status, private_minimum_loa=excluded.private_minimum_loa, commercial_minimum_loa=excluded.commercial_minimum_loa, maximum_loa_gt_notes=excluded.maximum_loa_gt_notes, passenger_limit_notes=excluded.passenger_limit_notes, provisional_registration_status=excluded.provisional_registration_status, provisional_validity=excluded.provisional_validity, permanent_validity=excluded.permanent_validity, owner_eligibility=excluded.owner_eligibility, foreign_company_ownership=excluded.foreign_company_ownership, local_agent_requirement=excluded.local_agent_requirement, mortgage_registration_status=excluded.mortgage_registration_status, radio_licence_requirement=excluded.radio_licence_requirement, classification_requirement=excluded.classification_requirement, survey_inspection_requirement=excluded.survey_inspection_requirement, commercial_yacht_code=excluded.commercial_yacht_code, minimum_safe_manning=excluded.minimum_safe_manning, indicative_processing_time=excluded.indicative_processing_time, vat_tax_note=excluded.vat_tax_note, crew_note=excluded.crew_note, required_documents_summary=excluded.required_documents_summary, objective_advantages=excluded.objective_advantages, limitations_and_risks=excluded.limitations_and_risks, official_registry_url=excluded.official_registry_url, primary_fee_url=excluded.primary_fee_url, official_website=excluded.official_website, vat_notes=excluded.vat_notes, crew_restrictions=excluded.crew_restrictions, advantages=excluded.advantages, disadvantages=excluded.disadvantages, confidence_level=excluded.confidence_level, coverage_status=excluded.coverage_status, missing_verification_notes=excluded.missing_verification_notes, verification_notes=excluded.verification_notes, last_verified_at=excluded.last_verified_at, last_updated=excluded.last_updated, source_version=excluded.source_version, data_quality_score=excluded.data_quality_score, data_quality_status=excluded.data_quality_status, original_row=excluded.original_row, active=excluded.active, updated_at=now();

insert into public.flag_registries (code, slug, import_key, flag_name, country, country_or_territory, official_registry_name, registry_type, registry_family, is_eu_flag, private_available, commercial_available, private_registration_status, commercial_registration_status, private_minimum_loa, commercial_minimum_loa, maximum_loa_gt_notes, passenger_limit_notes, provisional_registration_status, provisional_validity, permanent_validity, owner_eligibility, foreign_company_ownership, local_agent_requirement, mortgage_registration_status, radio_licence_requirement, classification_requirement, survey_inspection_requirement, commercial_yacht_code, minimum_safe_manning, indicative_processing_time, vat_tax_note, crew_note, required_documents_summary, objective_advantages, limitations_and_risks, official_registry_url, primary_fee_url, official_website, vat_notes, crew_restrictions, advantages, disadvantages, confidence_level, coverage_status, missing_verification_notes, verification_notes, last_verified_at, last_updated, source_version, data_quality_score, data_quality_status, original_row, active) values ('panama', 'panama', 'flag:panama', 'Panama', 'Panama', 'Panama', 'Panama Maritime Authority', 'open international registry', 'Open international registry', false, true, true, 'yes', 'yes', 'No universal yacht minimum identified', 'No universal yacht minimum identified', 'No public maximum identified', 'Regime-dependent', 'yes', 'Provisional registration available via legal representative/consulates; exact term depends on procedure', 'Definitive registration after title documents are recorded; annual taxes/fees apply', 'International ownership accepted subject to Panamanian registry/legal representative process', 'Yes', 'Panamanian legal representative required', 'yes', 'Yes', 'Commercial/large yacht case-dependent', 'Technical and safety certification depends on service and size', 'Panama maritime regulations and international conventions', 'Commercial case-dependent', 'Provisional route designed for rapid entry; definitive timing depends on title recording', 'Non-EU flag; EU VAT/customs position requires separate analysis', 'Commercial manning and endorsements depend on service', 'Application through representative, ownership/title, builder/bill of sale, deletion, corporate documents, tonnage/technical, radio and manning documents', 'Large international registry; provisional registration and mortgage recording', 'Public yacht fee presentation is fragmented; legal representative and annual charge bundle must be quoted', 'https://www.amp.gob.pa/servicios/registro-de-naves/', 'https://www.amp.gob.pa/servicios/registro-publico-de-propiedad-de-naves/', 'https://www.amp.gob.pa/servicios/registro-de-naves/', 'Non-EU flag; EU VAT/customs position requires separate analysis', 'Commercial manning and endorsements depend on service', '["Large international registry", "provisional registration and mortgage recording"]'::jsonb, '["Public yacht fee presentation is fragmented", "legal representative and annual charge bundle must be quoted"]'::jsonb, 'Medium', 'Verified with gaps', 'Obtain current yacht registration/annual tax calculator and exact provisional validity', 'Obtain current yacht registration/annual tax calculator and exact provisional validity', '2026-07-27', '2026-07-27', 'Yachtworth_Flag_Registry_Base_v1', 100, 'usable_with_warnings', '{"Annual / Renewal Fee": "Annual taxes and consular/registry charges require yacht data", "Classification Requirement": "Commercial/large yacht case-dependent", "Commercial Minimum LOA": "No universal yacht minimum identified", "Commercial Registration": "Yes", "Commercial Yacht Code": "Panama maritime regulations and international conventions", "Confidence": "Medium", "Country / Territory": "Panama", "Coverage Status": "Verified with gaps", "Crew Note": "Commercial manning and endorsements depend on service", "EU Flag": "No", "Fee Source": "https://www.amp.gob.pa/servicios/registro-publico-de-propiedad-de-naves/", "Flag": "Panama", "Foreign Company Ownership": "Yes", "Indicative Processing Time": "Provisional route designed for rapid entry; definitive timing depends on title recording", "Initial Registration Fee": "International yacht flag fee requires official quotation/calculator", "Last Verified": "46230", "Limitations / Risks": "Public yacht fee presentation is fragmented; legal representative and annual charge bundle must be quoted", "Local / Resident Agent": "Panamanian legal representative required", "Main Official Source": "https://www.amp.gob.pa/servicios/registro-de-naves/", "Maximum LOA / GT": "No public maximum identified", "Minimum Safe Manning": "Commercial case-dependent", "Missing / Next Verification": "Obtain current yacht registration/annual tax calculator and exact provisional validity", "Mortgage Registration": "Yes", "Objective Advantages": "Large international registry; provisional registration and mortgage recording", "Official Registry": "Panama Maritime Authority", "Other Confirmed Fees": "Public property registry: preliminary/definitive title and mortgage recording charges are separately prescribed", "Owner Eligibility": "International ownership accepted subject to Panamanian registry/legal representative process", "Passenger Limit": "Regime-dependent", "Permanent Validity / Renewal": "Definitive registration after title documents are recorded; annual taxes/fees apply", "Private Minimum LOA": "No universal yacht minimum identified", "Private Registration": "Yes", "Provisional / Interim": "Yes", "Provisional Validity": "Provisional registration available via legal representative/consulates; exact term depends on procedure", "Radio Licence": "Yes", "Registry Family": "Open international registry", "Required Documents Summary": "Application through representative, ownership/title, builder/bill of sale, deletion, corporate documents, tonnage/technical, radio and manning documents", "Survey / Inspection": "Technical and safety certification depends on service and size", "VAT / Tax Note": "Non-EU flag; EU VAT/customs position requires separate analysis"}'::jsonb, true) on conflict (import_key) do update set flag_name=excluded.flag_name, country=excluded.country, country_or_territory=excluded.country_or_territory, official_registry_name=excluded.official_registry_name, registry_type=excluded.registry_type, registry_family=excluded.registry_family, is_eu_flag=excluded.is_eu_flag, private_available=excluded.private_available, commercial_available=excluded.commercial_available, private_registration_status=excluded.private_registration_status, commercial_registration_status=excluded.commercial_registration_status, private_minimum_loa=excluded.private_minimum_loa, commercial_minimum_loa=excluded.commercial_minimum_loa, maximum_loa_gt_notes=excluded.maximum_loa_gt_notes, passenger_limit_notes=excluded.passenger_limit_notes, provisional_registration_status=excluded.provisional_registration_status, provisional_validity=excluded.provisional_validity, permanent_validity=excluded.permanent_validity, owner_eligibility=excluded.owner_eligibility, foreign_company_ownership=excluded.foreign_company_ownership, local_agent_requirement=excluded.local_agent_requirement, mortgage_registration_status=excluded.mortgage_registration_status, radio_licence_requirement=excluded.radio_licence_requirement, classification_requirement=excluded.classification_requirement, survey_inspection_requirement=excluded.survey_inspection_requirement, commercial_yacht_code=excluded.commercial_yacht_code, minimum_safe_manning=excluded.minimum_safe_manning, indicative_processing_time=excluded.indicative_processing_time, vat_tax_note=excluded.vat_tax_note, crew_note=excluded.crew_note, required_documents_summary=excluded.required_documents_summary, objective_advantages=excluded.objective_advantages, limitations_and_risks=excluded.limitations_and_risks, official_registry_url=excluded.official_registry_url, primary_fee_url=excluded.primary_fee_url, official_website=excluded.official_website, vat_notes=excluded.vat_notes, crew_restrictions=excluded.crew_restrictions, advantages=excluded.advantages, disadvantages=excluded.disadvantages, confidence_level=excluded.confidence_level, coverage_status=excluded.coverage_status, missing_verification_notes=excluded.missing_verification_notes, verification_notes=excluded.verification_notes, last_verified_at=excluded.last_verified_at, last_updated=excluded.last_updated, source_version=excluded.source_version, data_quality_score=excluded.data_quality_score, data_quality_status=excluded.data_quality_status, original_row=excluded.original_row, active=excluded.active, updated_at=now();

insert into public.flag_registries (code, slug, import_key, flag_name, country, country_or_territory, official_registry_name, registry_type, registry_family, is_eu_flag, private_available, commercial_available, private_registration_status, commercial_registration_status, private_minimum_loa, commercial_minimum_loa, maximum_loa_gt_notes, passenger_limit_notes, provisional_registration_status, provisional_validity, permanent_validity, owner_eligibility, foreign_company_ownership, local_agent_requirement, mortgage_registration_status, radio_licence_requirement, classification_requirement, survey_inspection_requirement, commercial_yacht_code, minimum_safe_manning, indicative_processing_time, vat_tax_note, crew_note, required_documents_summary, objective_advantages, limitations_and_risks, official_registry_url, primary_fee_url, official_website, vat_notes, crew_restrictions, advantages, disadvantages, confidence_level, coverage_status, missing_verification_notes, verification_notes, last_verified_at, last_updated, source_version, data_quality_score, data_quality_status, original_row, active) values ('belize', 'belize', 'flag:belize', 'Belize', 'Belize', 'Belize', 'IMMARBE', 'open international registry', 'Open international registry', false, true, true, 'yes', 'yes', 'Published yacht procedures include below 24 m', 'Codes cover below 24 m, 24 m–500 GT and 500 GT+', 'Codes extend to 500 GT+', 'Code-dependent', 'yes', '6 months plus two possible 3-month extensions', 'Subject to permanent documentation and annual registry requirements', 'International ownership through accepted owner/entity and shipping-agent structure', 'Yes', 'Belize shipping agent required', 'yes', 'Yes', 'Depends on yacht size, GT and commercial status', 'Code-based surveys and technical verification apply', 'Belize yacht codes by length/GT category', 'Commercial case-dependent', 'Provisional registration after application acceptance', 'Non-EU flag; EU VAT/customs analysis required for Mediterranean use', 'Commercial manning depends on code and area of operation', 'Application, title/ownership, agent appointment, deletion/previous registry, use declaration, technical/tonnage, radio and commercial documents', 'Private and commercial routes; provisional certificate; yacht codes across size bands', 'Fee transparency is limited; production calculator requires direct registry price tables', 'https://immarbe.com/yacht-registration/', 'https://immarbe.com/fees/', 'https://immarbe.com/yacht-registration/', 'Non-EU flag; EU VAT/customs analysis required for Mediterranean use', 'Commercial manning depends on code and area of operation', '["Private and commercial routes", "provisional certificate", "yacht codes across size bands"]'::jsonb, '["Fee transparency is limited", "production calculator requires direct registry price tables"]'::jsonb, 'Medium', 'Verified with gaps', 'Obtain current private/commercial fee quotation tables and accepted-class list', 'Obtain current private/commercial fee quotation tables and accepted-class list', '2026-07-27', '2026-07-27', 'Yachtworth_Flag_Registry_Base_v1', 100, 'usable_with_warnings', '{"Annual / Renewal Fee": "Official quotation / fee schedule", "Classification Requirement": "Depends on yacht size, GT and commercial status", "Commercial Minimum LOA": "Codes cover below 24 m, 24 m–500 GT and 500 GT+", "Commercial Registration": "Yes", "Commercial Yacht Code": "Belize yacht codes by length/GT category", "Confidence": "Medium", "Country / Territory": "Belize", "Coverage Status": "Verified with gaps", "Crew Note": "Commercial manning depends on code and area of operation", "EU Flag": "No", "Fee Source": "https://immarbe.com/fees/", "Flag": "Belize", "Foreign Company Ownership": "Yes", "Indicative Processing Time": "Provisional registration after application acceptance", "Initial Registration Fee": "Official quotation after vessel acceptance", "Last Verified": "46230", "Limitations / Risks": "Fee transparency is limited; production calculator requires direct registry price tables", "Local / Resident Agent": "Belize shipping agent required", "Main Official Source": "https://immarbe.com/yacht-registration/", "Maximum LOA / GT": "Codes extend to 500 GT+", "Minimum Safe Manning": "Commercial case-dependent", "Missing / Next Verification": "Obtain current private/commercial fee quotation tables and accepted-class list", "Mortgage Registration": "Yes", "Objective Advantages": "Private and commercial routes; provisional certificate; yacht codes across size bands", "Official Registry": "IMMARBE", "Other Confirmed Fees": "Agent, technical, radio and mortgage costs additional", "Owner Eligibility": "International ownership through accepted owner/entity and shipping-agent structure", "Passenger Limit": "Code-dependent", "Permanent Validity / Renewal": "Subject to permanent documentation and annual registry requirements", "Private Minimum LOA": "Published yacht procedures include below 24 m", "Private Registration": "Yes", "Provisional / Interim": "Yes", "Provisional Validity": "6 months plus two possible 3-month extensions", "Radio Licence": "Yes", "Registry Family": "Open international registry", "Required Documents Summary": "Application, title/ownership, agent appointment, deletion/previous registry, use declaration, technical/tonnage, radio and commercial documents", "Survey / Inspection": "Code-based surveys and technical verification apply", "VAT / Tax Note": "Non-EU flag; EU VAT/customs analysis required for Mediterranean use"}'::jsonb, true) on conflict (import_key) do update set flag_name=excluded.flag_name, country=excluded.country, country_or_territory=excluded.country_or_territory, official_registry_name=excluded.official_registry_name, registry_type=excluded.registry_type, registry_family=excluded.registry_family, is_eu_flag=excluded.is_eu_flag, private_available=excluded.private_available, commercial_available=excluded.commercial_available, private_registration_status=excluded.private_registration_status, commercial_registration_status=excluded.commercial_registration_status, private_minimum_loa=excluded.private_minimum_loa, commercial_minimum_loa=excluded.commercial_minimum_loa, maximum_loa_gt_notes=excluded.maximum_loa_gt_notes, passenger_limit_notes=excluded.passenger_limit_notes, provisional_registration_status=excluded.provisional_registration_status, provisional_validity=excluded.provisional_validity, permanent_validity=excluded.permanent_validity, owner_eligibility=excluded.owner_eligibility, foreign_company_ownership=excluded.foreign_company_ownership, local_agent_requirement=excluded.local_agent_requirement, mortgage_registration_status=excluded.mortgage_registration_status, radio_licence_requirement=excluded.radio_licence_requirement, classification_requirement=excluded.classification_requirement, survey_inspection_requirement=excluded.survey_inspection_requirement, commercial_yacht_code=excluded.commercial_yacht_code, minimum_safe_manning=excluded.minimum_safe_manning, indicative_processing_time=excluded.indicative_processing_time, vat_tax_note=excluded.vat_tax_note, crew_note=excluded.crew_note, required_documents_summary=excluded.required_documents_summary, objective_advantages=excluded.objective_advantages, limitations_and_risks=excluded.limitations_and_risks, official_registry_url=excluded.official_registry_url, primary_fee_url=excluded.primary_fee_url, official_website=excluded.official_website, vat_notes=excluded.vat_notes, crew_restrictions=excluded.crew_restrictions, advantages=excluded.advantages, disadvantages=excluded.disadvantages, confidence_level=excluded.confidence_level, coverage_status=excluded.coverage_status, missing_verification_notes=excluded.missing_verification_notes, verification_notes=excluded.verification_notes, last_verified_at=excluded.last_verified_at, last_updated=excluded.last_updated, source_version=excluded.source_version, data_quality_score=excluded.data_quality_score, data_quality_status=excluded.data_quality_status, original_row=excluded.original_row, active=excluded.active, updated_at=now();

insert into public.flag_registries (code, slug, import_key, flag_name, country, country_or_territory, official_registry_name, registry_type, registry_family, is_eu_flag, private_available, commercial_available, private_registration_status, commercial_registration_status, private_minimum_loa, commercial_minimum_loa, maximum_loa_gt_notes, passenger_limit_notes, provisional_registration_status, provisional_validity, permanent_validity, owner_eligibility, foreign_company_ownership, local_agent_requirement, mortgage_registration_status, radio_licence_requirement, classification_requirement, survey_inspection_requirement, commercial_yacht_code, minimum_safe_manning, indicative_processing_time, vat_tax_note, crew_note, required_documents_summary, objective_advantages, limitations_and_risks, official_registry_url, primary_fee_url, official_website, vat_notes, crew_restrictions, advantages, disadvantages, confidence_level, coverage_status, missing_verification_notes, verification_notes, last_verified_at, last_updated, source_version, data_quality_score, data_quality_status, original_row, active) values ('jamaica', 'jamaica', 'flag:jamaica', 'Jamaica', 'Jamaica', 'Jamaica', 'Maritime Authority of Jamaica', 'open/international-capable national registry', 'Open/international-capable national registry', false, true, true, 'yes', 'yes', 'No universal minimum identified', 'No universal minimum identified', 'No public maximum identified', 'Regime-dependent', 'not_confirmed', 'Not confirmed', 'Subject to registry and safety certification', 'International owner/entity eligibility subject to Jamaican registry law', 'Yes subject to qualification/representative requirements', 'Case-dependent', 'case_dependent', 'Yes', 'Commercial/large yacht case-dependent', 'Pre-registration survey required; periodic safety inspection depends on use/size', 'Jamaican maritime/yacht safety requirements', 'Commercial case-dependent', 'Not published in reviewed material', 'Non-EU flag; separate VAT/customs analysis required', 'Commercial manning and certification apply', 'Application, title/ownership, prior deletion, survey/technical and tonnage documents, radio and commercial certificates', 'Private, private-charter and commercial yacht categories; pre-registration survey framework', 'Current public fee and ownership details are insufficient for automatic pricing', 'https://maritimejamaica.com/ship-registration/', 'https://maritimejamaica.com/fees/', 'https://maritimejamaica.com/ship-registration/', 'Non-EU flag; separate VAT/customs analysis required', 'Commercial manning and certification apply', '["Private, private-charter and commercial yacht categories", "pre-registration survey framework"]'::jsonb, '["Current public fee and ownership details are insufficient for automatic pricing"]'::jsonb, 'Medium', 'Partial', 'Direct registry confirmation of ownership, provisional term, yacht fee schedule and charter privilege', 'Direct registry confirmation of ownership, provisional term, yacht fee schedule and charter privilege', '2026-07-27', '2026-07-27', 'Yachtworth_Flag_Registry_Base_v1', 100, 'research_required', '{"Annual / Renewal Fee": "Official fee schedule/quotation required", "Classification Requirement": "Commercial/large yacht case-dependent", "Commercial Minimum LOA": "No universal minimum identified", "Commercial Registration": "Yes", "Commercial Yacht Code": "Jamaican maritime/yacht safety requirements", "Confidence": "Medium", "Country / Territory": "Jamaica", "Coverage Status": "Partial", "Crew Note": "Commercial manning and certification apply", "EU Flag": "No", "Fee Source": "https://maritimejamaica.com/fees/", "Flag": "Jamaica", "Foreign Company Ownership": "Yes subject to qualification/representative requirements", "Indicative Processing Time": "Not published in reviewed material", "Initial Registration Fee": "Official fee schedule/quotation required", "Last Verified": "46230", "Limitations / Risks": "Current public fee and ownership details are insufficient for automatic pricing", "Local / Resident Agent": "Case-dependent", "Main Official Source": "https://maritimejamaica.com/ship-registration/", "Maximum LOA / GT": "No public maximum identified", "Minimum Safe Manning": "Commercial case-dependent", "Missing / Next Verification": "Direct registry confirmation of ownership, provisional term, yacht fee schedule and charter privilege", "Mortgage Registration": "Available through ship registry framework; exact yacht procedure to verify", "Objective Advantages": "Private, private-charter and commercial yacht categories; pre-registration survey framework", "Official Registry": "Maritime Authority of Jamaica", "Other Confirmed Fees": "Survey, radio, mortgage and professional costs additional", "Owner Eligibility": "International owner/entity eligibility subject to Jamaican registry law", "Passenger Limit": "Regime-dependent", "Permanent Validity / Renewal": "Subject to registry and safety certification", "Private Minimum LOA": "No universal minimum identified", "Private Registration": "Yes", "Provisional / Interim": "Available forms/procedures; exact term not confirmed", "Provisional Validity": "Not confirmed", "Radio Licence": "Yes", "Registry Family": "Open/international-capable national registry", "Required Documents Summary": "Application, title/ownership, prior deletion, survey/technical and tonnage documents, radio and commercial certificates", "Survey / Inspection": "Pre-registration survey required; periodic safety inspection depends on use/size", "VAT / Tax Note": "Non-EU flag; separate VAT/customs analysis required"}'::jsonb, true) on conflict (import_key) do update set flag_name=excluded.flag_name, country=excluded.country, country_or_territory=excluded.country_or_territory, official_registry_name=excluded.official_registry_name, registry_type=excluded.registry_type, registry_family=excluded.registry_family, is_eu_flag=excluded.is_eu_flag, private_available=excluded.private_available, commercial_available=excluded.commercial_available, private_registration_status=excluded.private_registration_status, commercial_registration_status=excluded.commercial_registration_status, private_minimum_loa=excluded.private_minimum_loa, commercial_minimum_loa=excluded.commercial_minimum_loa, maximum_loa_gt_notes=excluded.maximum_loa_gt_notes, passenger_limit_notes=excluded.passenger_limit_notes, provisional_registration_status=excluded.provisional_registration_status, provisional_validity=excluded.provisional_validity, permanent_validity=excluded.permanent_validity, owner_eligibility=excluded.owner_eligibility, foreign_company_ownership=excluded.foreign_company_ownership, local_agent_requirement=excluded.local_agent_requirement, mortgage_registration_status=excluded.mortgage_registration_status, radio_licence_requirement=excluded.radio_licence_requirement, classification_requirement=excluded.classification_requirement, survey_inspection_requirement=excluded.survey_inspection_requirement, commercial_yacht_code=excluded.commercial_yacht_code, minimum_safe_manning=excluded.minimum_safe_manning, indicative_processing_time=excluded.indicative_processing_time, vat_tax_note=excluded.vat_tax_note, crew_note=excluded.crew_note, required_documents_summary=excluded.required_documents_summary, objective_advantages=excluded.objective_advantages, limitations_and_risks=excluded.limitations_and_risks, official_registry_url=excluded.official_registry_url, primary_fee_url=excluded.primary_fee_url, official_website=excluded.official_website, vat_notes=excluded.vat_notes, crew_restrictions=excluded.crew_restrictions, advantages=excluded.advantages, disadvantages=excluded.disadvantages, confidence_level=excluded.confidence_level, coverage_status=excluded.coverage_status, missing_verification_notes=excluded.missing_verification_notes, verification_notes=excluded.verification_notes, last_verified_at=excluded.last_verified_at, last_updated=excluded.last_updated, source_version=excluded.source_version, data_quality_score=excluded.data_quality_score, data_quality_status=excluded.data_quality_status, original_row=excluded.original_row, active=excluded.active, updated_at=now();

insert into public.flag_registries (code, slug, import_key, flag_name, country, country_or_territory, official_registry_name, registry_type, registry_family, is_eu_flag, private_available, commercial_available, private_registration_status, commercial_registration_status, private_minimum_loa, commercial_minimum_loa, maximum_loa_gt_notes, passenger_limit_notes, provisional_registration_status, provisional_validity, permanent_validity, owner_eligibility, foreign_company_ownership, local_agent_requirement, mortgage_registration_status, radio_licence_requirement, classification_requirement, survey_inspection_requirement, commercial_yacht_code, minimum_safe_manning, indicative_processing_time, vat_tax_note, crew_note, required_documents_summary, objective_advantages, limitations_and_risks, official_registry_url, primary_fee_url, official_website, vat_notes, crew_restrictions, advantages, disadvantages, confidence_level, coverage_status, missing_verification_notes, verification_notes, last_verified_at, last_updated, source_version, data_quality_score, data_quality_status, original_row, active) values ('cook-islands', 'cook-islands', 'flag:cook-islands', 'Cook Islands', 'Cook Islands', 'Cook Islands', 'Maritime Cook Islands', 'open international registry', 'Open international registry', false, true, true, 'yes', 'yes', 'Small Yacht Code below 24 m; Large Yacht Code above 24 m', 'Commercial yacht regime available; code varies at 24 m', 'No public maximum identified', 'Code-dependent', 'yes', 'Issued after approval/payment; exact term to confirm', 'Subject to completion and annual compliance/fees', 'Qualified person/qualified ownership structure', 'Yes subject to qualified-person rules', 'Registry/qualified ownership structure required', 'case_dependent', 'Yes', 'Commercial/large yacht code-dependent', 'Small/Large Yacht Code compliance and surveys apply', 'Cook Islands Small Yacht Code / Large Yacht Code; LY3 references for commercial yachts', 'Minimum safe manning proposal required for commercial yachts', 'Provisional certificate after approval/payment', 'Non-EU flag; separate VAT/customs analysis required', 'Commercial safe manning and qualifications apply', 'Application, qualified owner/entity, ownership/title, deletion, code/survey and tonnage, radio and manning documents', 'Private, commercial and dual-registration options; dedicated yacht codes', 'Public fee transparency is limited; technical acceptance and owner qualification require review', 'https://maritimecookislands.com/yacht-registration/', 'https://maritimecookislands.com/fees/', 'https://maritimecookislands.com/yacht-registration/', 'Non-EU flag; separate VAT/customs analysis required', 'Commercial safe manning and qualifications apply', '["Private, commercial and dual-registration options", "dedicated yacht codes"]'::jsonb, '["Public fee transparency is limited", "technical acceptance and owner qualification require review"]'::jsonb, 'Medium', 'Verified with gaps', 'Obtain current fee tables, provisional certificate term and mortgage tariff', 'Obtain current fee tables, provisional certificate term and mortgage tariff', '2026-07-27', '2026-07-27', 'Yachtworth_Flag_Registry_Base_v1', 100, 'usable_with_warnings', '{"Annual / Renewal Fee": "Registry quotation / fee schedule required", "Classification Requirement": "Commercial/large yacht code-dependent", "Commercial Minimum LOA": "Commercial yacht regime available; code varies at 24 m", "Commercial Registration": "Yes", "Commercial Yacht Code": "Cook Islands Small Yacht Code / Large Yacht Code; LY3 references for commercial yachts", "Confidence": "Medium", "Country / Territory": "Cook Islands", "Coverage Status": "Verified with gaps", "Crew Note": "Commercial safe manning and qualifications apply", "EU Flag": "No", "Fee Source": "https://maritimecookislands.com/fees/", "Flag": "Cook Islands", "Foreign Company Ownership": "Yes subject to qualified-person rules", "Indicative Processing Time": "Provisional certificate after approval/payment", "Initial Registration Fee": "Registry quotation / fee schedule required", "Last Verified": "46230", "Limitations / Risks": "Public fee transparency is limited; technical acceptance and owner qualification require review", "Local / Resident Agent": "Registry/qualified ownership structure required", "Main Official Source": "https://maritimecookislands.com/yacht-registration/", "Maximum LOA / GT": "No public maximum identified", "Minimum Safe Manning": "Minimum safe manning proposal required for commercial yachts", "Missing / Next Verification": "Obtain current fee tables, provisional certificate term and mortgage tariff", "Mortgage Registration": "Available through ship registry framework; verify tariff", "Objective Advantages": "Private, commercial and dual-registration options; dedicated yacht codes", "Official Registry": "Maritime Cook Islands", "Other Confirmed Fees": "Survey, radio, agent and mortgage charges additional", "Owner Eligibility": "Qualified person/qualified ownership structure", "Passenger Limit": "Code-dependent", "Permanent Validity / Renewal": "Subject to completion and annual compliance/fees", "Private Minimum LOA": "Small Yacht Code below 24 m; Large Yacht Code above 24 m", "Private Registration": "Yes", "Provisional / Interim": "Yes", "Provisional Validity": "Issued after approval/payment; exact term to confirm", "Radio Licence": "Yes", "Registry Family": "Open international registry", "Required Documents Summary": "Application, qualified owner/entity, ownership/title, deletion, code/survey and tonnage, radio and manning documents", "Survey / Inspection": "Small/Large Yacht Code compliance and surveys apply", "VAT / Tax Note": "Non-EU flag; separate VAT/customs analysis required"}'::jsonb, true) on conflict (import_key) do update set flag_name=excluded.flag_name, country=excluded.country, country_or_territory=excluded.country_or_territory, official_registry_name=excluded.official_registry_name, registry_type=excluded.registry_type, registry_family=excluded.registry_family, is_eu_flag=excluded.is_eu_flag, private_available=excluded.private_available, commercial_available=excluded.commercial_available, private_registration_status=excluded.private_registration_status, commercial_registration_status=excluded.commercial_registration_status, private_minimum_loa=excluded.private_minimum_loa, commercial_minimum_loa=excluded.commercial_minimum_loa, maximum_loa_gt_notes=excluded.maximum_loa_gt_notes, passenger_limit_notes=excluded.passenger_limit_notes, provisional_registration_status=excluded.provisional_registration_status, provisional_validity=excluded.provisional_validity, permanent_validity=excluded.permanent_validity, owner_eligibility=excluded.owner_eligibility, foreign_company_ownership=excluded.foreign_company_ownership, local_agent_requirement=excluded.local_agent_requirement, mortgage_registration_status=excluded.mortgage_registration_status, radio_licence_requirement=excluded.radio_licence_requirement, classification_requirement=excluded.classification_requirement, survey_inspection_requirement=excluded.survey_inspection_requirement, commercial_yacht_code=excluded.commercial_yacht_code, minimum_safe_manning=excluded.minimum_safe_manning, indicative_processing_time=excluded.indicative_processing_time, vat_tax_note=excluded.vat_tax_note, crew_note=excluded.crew_note, required_documents_summary=excluded.required_documents_summary, objective_advantages=excluded.objective_advantages, limitations_and_risks=excluded.limitations_and_risks, official_registry_url=excluded.official_registry_url, primary_fee_url=excluded.primary_fee_url, official_website=excluded.official_website, vat_notes=excluded.vat_notes, crew_restrictions=excluded.crew_restrictions, advantages=excluded.advantages, disadvantages=excluded.disadvantages, confidence_level=excluded.confidence_level, coverage_status=excluded.coverage_status, missing_verification_notes=excluded.missing_verification_notes, verification_notes=excluded.verification_notes, last_verified_at=excluded.last_verified_at, last_updated=excluded.last_updated, source_version=excluded.source_version, data_quality_score=excluded.data_quality_score, data_quality_status=excluded.data_quality_status, original_row=excluded.original_row, active=excluded.active, updated_at=now();

insert into public.flag_registries (code, slug, import_key, flag_name, country, country_or_territory, official_registry_name, registry_type, registry_family, is_eu_flag, private_available, commercial_available, private_registration_status, commercial_registration_status, private_minimum_loa, commercial_minimum_loa, maximum_loa_gt_notes, passenger_limit_notes, provisional_registration_status, provisional_validity, permanent_validity, owner_eligibility, foreign_company_ownership, local_agent_requirement, mortgage_registration_status, radio_licence_requirement, classification_requirement, survey_inspection_requirement, commercial_yacht_code, minimum_safe_manning, indicative_processing_time, vat_tax_note, crew_note, required_documents_summary, objective_advantages, limitations_and_risks, official_registry_url, primary_fee_url, official_website, vat_notes, crew_restrictions, advantages, disadvantages, confidence_level, coverage_status, missing_verification_notes, verification_notes, last_verified_at, last_updated, source_version, data_quality_score, data_quality_status, original_row, active) values ('san-marino', 'san-marino', 'flag:san-marino', 'San Marino', 'San Marino', 'San Marino', 'San Marino Ship Register / Maritime Authority', 'international yacht registry', 'International yacht registry', false, true, true, 'yes', 'yes', 'Published categories below 10 m and 10–24 m; large-yacht route also exists', 'Small and Large Yacht Codes available; exact commercial threshold by code', 'No public maximum identified', 'Code-dependent', 'yes', '3 months plus three one-month renewals in the 2026 private <24 m tariff', 'Private registration option valid for life; safety and radio certificates in cited tariff valid 5 years', 'Foreign ownership permitted through authorised San Marino resident agent; local company/resident routes also exist', 'Yes', 'Yes for foreign ownership route', 'yes', 'Included in cited private <24 m package; 5-year validity under lifetime option', 'Code-dependent; surveyor/class may be required for larger/commercial yachts', 'Private <24 m cited tariff says flag-state inspection not normally applicable but can be arranged; other categories differ', 'San Marino Small Yacht Code / Large Yacht Code', 'Commercial case-dependent', 'Registry promotes online/fast processing; exact SLA depends on category', 'Non-EU flag; separate VAT/customs analysis required', 'Commercial manning and code requirements apply', 'Application, ownership/title, resident-agent/owner documents, technical and safety documents, radio and prior-registry evidence', 'Published private-yacht package; online process; lifetime registration option; mortgage and radio services', 'Agent and surveyor costs are excluded; exact large/commercial tariff must be added separately', 'https://www.smsr.sm/yacht-registration/', 'https://www.smsr.sm/private-yacht-price-list/', 'https://www.smsr.sm/yacht-registration/', 'Non-EU flag; separate VAT/customs analysis required', 'Commercial manning and code requirements apply', '["Published private-yacht package", "online process", "lifetime registration option", "mortgage and radio services"]'::jsonb, '["Agent and surveyor costs are excluded", "exact large/commercial tariff must be added separately"]'::jsonb, 'High', 'Verified with gaps', 'Load below-10 m, above-24 m and commercial 2026 fee schedules', 'Load below-10 m, above-24 m and commercial 2026 fee schedules', '2026-07-27', '2026-07-27', 'Yachtworth_Flag_Registry_Base_v1', 100, 'production_ready', '{"Annual / Renewal Fee": "Lifetime option has no annual registration fee stated; safety certificate €500/5 years and radio €200/5 years", "Classification Requirement": "Code-dependent; surveyor/class may be required for larger/commercial yachts", "Commercial Minimum LOA": "Small and Large Yacht Codes available; exact commercial threshold by code", "Commercial Registration": "Yes", "Commercial Yacht Code": "San Marino Small Yacht Code / Large Yacht Code", "Confidence": "High", "Country / Territory": "San Marino", "Coverage Status": "Verified with gaps", "Crew Note": "Commercial manning and code requirements apply", "EU Flag": "No", "Fee Source": "https://www.smsr.sm/private-yacht-price-list/", "Flag": "San Marino", "Foreign Company Ownership": "Yes", "Indicative Processing Time": "Registry promotes online/fast processing; exact SLA depends on category", "Initial Registration Fee": "2026 private 10–24 m: €990 for one-year or lifetime registration", "Last Verified": "46230", "Limitations / Risks": "Agent and surveyor costs are excluded; exact large/commercial tariff must be added separately", "Local / Resident Agent": "Yes for foreign ownership route", "Main Official Source": "https://www.smsr.sm/yacht-registration/", "Maximum LOA / GT": "No public maximum identified", "Minimum Safe Manning": "Commercial case-dependent", "Missing / Next Verification": "Load below-10 m, above-24 m and commercial 2026 fee schedules", "Mortgage Registration": "Yes", "Objective Advantages": "Published private-yacht package; online process; lifetime registration option; mortgage and radio services", "Official Registry": "San Marino Ship Register / Maritime Authority", "Other Confirmed Fees": "Mortgage €500; name reservation €300; provisional extension €150; deletion €500", "Owner Eligibility": "Foreign ownership permitted through authorised San Marino resident agent; local company/resident routes also exist", "Passenger Limit": "Code-dependent", "Permanent Validity / Renewal": "Private registration option valid for life; safety and radio certificates in cited tariff valid 5 years", "Private Minimum LOA": "Published categories below 10 m and 10–24 m; large-yacht route also exists", "Private Registration": "Yes", "Provisional / Interim": "Yes", "Provisional Validity": "3 months plus three one-month renewals in the 2026 private <24 m tariff", "Radio Licence": "Included in cited private <24 m package; 5-year validity under lifetime option", "Registry Family": "International yacht registry", "Required Documents Summary": "Application, ownership/title, resident-agent/owner documents, technical and safety documents, radio and prior-registry evidence", "Survey / Inspection": "Private <24 m cited tariff says flag-state inspection not normally applicable but can be arranged; other categories differ", "VAT / Tax Note": "Non-EU flag; separate VAT/customs analysis required"}'::jsonb, true) on conflict (import_key) do update set flag_name=excluded.flag_name, country=excluded.country, country_or_territory=excluded.country_or_territory, official_registry_name=excluded.official_registry_name, registry_type=excluded.registry_type, registry_family=excluded.registry_family, is_eu_flag=excluded.is_eu_flag, private_available=excluded.private_available, commercial_available=excluded.commercial_available, private_registration_status=excluded.private_registration_status, commercial_registration_status=excluded.commercial_registration_status, private_minimum_loa=excluded.private_minimum_loa, commercial_minimum_loa=excluded.commercial_minimum_loa, maximum_loa_gt_notes=excluded.maximum_loa_gt_notes, passenger_limit_notes=excluded.passenger_limit_notes, provisional_registration_status=excluded.provisional_registration_status, provisional_validity=excluded.provisional_validity, permanent_validity=excluded.permanent_validity, owner_eligibility=excluded.owner_eligibility, foreign_company_ownership=excluded.foreign_company_ownership, local_agent_requirement=excluded.local_agent_requirement, mortgage_registration_status=excluded.mortgage_registration_status, radio_licence_requirement=excluded.radio_licence_requirement, classification_requirement=excluded.classification_requirement, survey_inspection_requirement=excluded.survey_inspection_requirement, commercial_yacht_code=excluded.commercial_yacht_code, minimum_safe_manning=excluded.minimum_safe_manning, indicative_processing_time=excluded.indicative_processing_time, vat_tax_note=excluded.vat_tax_note, crew_note=excluded.crew_note, required_documents_summary=excluded.required_documents_summary, objective_advantages=excluded.objective_advantages, limitations_and_risks=excluded.limitations_and_risks, official_registry_url=excluded.official_registry_url, primary_fee_url=excluded.primary_fee_url, official_website=excluded.official_website, vat_notes=excluded.vat_notes, crew_restrictions=excluded.crew_restrictions, advantages=excluded.advantages, disadvantages=excluded.disadvantages, confidence_level=excluded.confidence_level, coverage_status=excluded.coverage_status, missing_verification_notes=excluded.missing_verification_notes, verification_notes=excluded.verification_notes, last_verified_at=excluded.last_verified_at, last_updated=excluded.last_updated, source_version=excluded.source_version, data_quality_score=excluded.data_quality_score, data_quality_status=excluded.data_quality_status, original_row=excluded.original_row, active=excluded.active, updated_at=now();

insert into public.flag_registries (code, slug, import_key, flag_name, country, country_or_territory, official_registry_name, registry_type, registry_family, is_eu_flag, private_available, commercial_available, private_registration_status, commercial_registration_status, private_minimum_loa, commercial_minimum_loa, maximum_loa_gt_notes, passenger_limit_notes, provisional_registration_status, provisional_validity, permanent_validity, owner_eligibility, foreign_company_ownership, local_agent_requirement, mortgage_registration_status, radio_licence_requirement, classification_requirement, survey_inspection_requirement, commercial_yacht_code, minimum_safe_manning, indicative_processing_time, vat_tax_note, crew_note, required_documents_summary, objective_advantages, limitations_and_risks, official_registry_url, primary_fee_url, official_website, vat_notes, crew_restrictions, advantages, disadvantages, confidence_level, coverage_status, missing_verification_notes, verification_notes, last_verified_at, last_updated, source_version, data_quality_score, data_quality_status, original_row, active) values ('luxembourg', 'luxembourg', 'flag:luxembourg', 'Luxembourg', 'Luxembourg', 'Luxembourg', 'Luxembourg Maritime Administration', 'eu national maritime registry', 'EU national maritime registry', true, true, true, 'yes', 'yes', 'No universal minimum identified', 'No universal yacht minimum identified', 'No public yacht maximum identified', 'Regime-dependent', 'not_confirmed', 'Not confirmed', 'Subject to registration and inspections/fees', 'Pleasure craft register reserved to Luxembourg residents (natural or legal persons)', 'Commercial register subject to EU ownership and significant management in Luxembourg', 'Luxembourg residence/management substance required depending on register', 'case_dependent', 'Yes', 'Commercial vessel rules apply', 'Commercial ships subject to annual inspection fee/oversight; pleasure requirements differ', 'Luxembourg/EU/international maritime rules', 'Commercial case-dependent', 'Authority and establishment dependent', 'EU flag; VAT and establishment/tax treatment require separate analysis', 'Commercial EU/international manning rules apply', 'Residence/entity and management evidence, ownership/title, deletion, tonnage/class/survey, radio and commercial certificates', 'EU flag; commercial register includes yachts; established maritime administration', 'Residence/substance rules reduce accessibility; public yacht fee detail is limited', 'https://maritime.public.lu/en/registration.html', 'https://maritime.public.lu/en/administrative-fees.html', 'https://maritime.public.lu/en/registration.html', 'EU flag; VAT and establishment/tax treatment require separate analysis', 'Commercial EU/international manning rules apply', '["EU flag", "commercial register includes yachts", "established maritime administration"]'::jsonb, '["Residence/substance rules reduce accessibility", "public yacht fee detail is limited"]'::jsonb, 'Medium', 'Verified with gaps', 'Extract current yacht fees, mortgage procedure and pleasure certificate terms', 'Extract current yacht fees, mortgage procedure and pleasure certificate terms', '2026-07-27', '2026-07-27', 'Yachtworth_Flag_Registry_Base_v1', 100, 'usable_with_warnings', '{"Annual / Renewal Fee": "Annual inspection/administrative charges apply to commercial register; exact yacht amount to extract", "Classification Requirement": "Commercial vessel rules apply", "Commercial Minimum LOA": "No universal yacht minimum identified", "Commercial Registration": "Yes", "Commercial Yacht Code": "Luxembourg/EU/international maritime rules", "Confidence": "Medium", "Country / Territory": "Luxembourg", "Coverage Status": "Verified with gaps", "Crew Note": "Commercial EU/international manning rules apply", "EU Flag": "Yes", "Fee Source": "https://maritime.public.lu/en/administrative-fees.html", "Flag": "Luxembourg", "Foreign Company Ownership": "Commercial register subject to EU ownership and significant management in Luxembourg", "Indicative Processing Time": "Authority and establishment dependent", "Initial Registration Fee": "Official administrative fee schedule required", "Last Verified": "46230", "Limitations / Risks": "Residence/substance rules reduce accessibility; public yacht fee detail is limited", "Local / Resident Agent": "Luxembourg residence/management substance required depending on register", "Main Official Source": "https://maritime.public.lu/en/registration.html", "Maximum LOA / GT": "No public yacht maximum identified", "Minimum Safe Manning": "Commercial case-dependent", "Missing / Next Verification": "Extract current yacht fees, mortgage procedure and pleasure certificate terms", "Mortgage Registration": "Maritime registration framework supports proprietary interests; yacht-specific procedure to verify", "Objective Advantages": "EU flag; commercial register includes yachts; established maritime administration", "Official Registry": "Luxembourg Maritime Administration", "Other Confirmed Fees": "Radio, inspection and corporate/substance costs additional", "Owner Eligibility": "Pleasure craft register reserved to Luxembourg residents (natural or legal persons)", "Passenger Limit": "Regime-dependent", "Permanent Validity / Renewal": "Subject to registration and inspections/fees", "Private Minimum LOA": "No universal minimum identified", "Private Registration": "Yes", "Provisional / Interim": "Not confirmed", "Provisional Validity": "Not confirmed", "Radio Licence": "Yes", "Registry Family": "EU national maritime registry", "Required Documents Summary": "Residence/entity and management evidence, ownership/title, deletion, tonnage/class/survey, radio and commercial certificates", "Survey / Inspection": "Commercial ships subject to annual inspection fee/oversight; pleasure requirements differ", "VAT / Tax Note": "EU flag; VAT and establishment/tax treatment require separate analysis"}'::jsonb, true) on conflict (import_key) do update set flag_name=excluded.flag_name, country=excluded.country, country_or_territory=excluded.country_or_territory, official_registry_name=excluded.official_registry_name, registry_type=excluded.registry_type, registry_family=excluded.registry_family, is_eu_flag=excluded.is_eu_flag, private_available=excluded.private_available, commercial_available=excluded.commercial_available, private_registration_status=excluded.private_registration_status, commercial_registration_status=excluded.commercial_registration_status, private_minimum_loa=excluded.private_minimum_loa, commercial_minimum_loa=excluded.commercial_minimum_loa, maximum_loa_gt_notes=excluded.maximum_loa_gt_notes, passenger_limit_notes=excluded.passenger_limit_notes, provisional_registration_status=excluded.provisional_registration_status, provisional_validity=excluded.provisional_validity, permanent_validity=excluded.permanent_validity, owner_eligibility=excluded.owner_eligibility, foreign_company_ownership=excluded.foreign_company_ownership, local_agent_requirement=excluded.local_agent_requirement, mortgage_registration_status=excluded.mortgage_registration_status, radio_licence_requirement=excluded.radio_licence_requirement, classification_requirement=excluded.classification_requirement, survey_inspection_requirement=excluded.survey_inspection_requirement, commercial_yacht_code=excluded.commercial_yacht_code, minimum_safe_manning=excluded.minimum_safe_manning, indicative_processing_time=excluded.indicative_processing_time, vat_tax_note=excluded.vat_tax_note, crew_note=excluded.crew_note, required_documents_summary=excluded.required_documents_summary, objective_advantages=excluded.objective_advantages, limitations_and_risks=excluded.limitations_and_risks, official_registry_url=excluded.official_registry_url, primary_fee_url=excluded.primary_fee_url, official_website=excluded.official_website, vat_notes=excluded.vat_notes, crew_restrictions=excluded.crew_restrictions, advantages=excluded.advantages, disadvantages=excluded.disadvantages, confidence_level=excluded.confidence_level, coverage_status=excluded.coverage_status, missing_verification_notes=excluded.missing_verification_notes, verification_notes=excluded.verification_notes, last_verified_at=excluded.last_verified_at, last_updated=excluded.last_updated, source_version=excluded.source_version, data_quality_score=excluded.data_quality_score, data_quality_status=excluded.data_quality_status, original_row=excluded.original_row, active=excluded.active, updated_at=now();

insert into public.flag_sources (
  flag_registry_id, topic, source_type, source_title, official_url, checked_at,
  is_official, is_active, source_version, import_key
)
select fr.id, 'Registration / ownership / yacht categories', 'Official registry', 'Registration / ownership / yacht categories', 'https://www.cishipping.com/registration/', '2026-07-27',
       true, true, 'Yachtworth_Flag_Registry_Base_v1', 'source:cayman-islands:registration-ownership-yacht-categories:6cef02387b'
  from public.flag_registries fr
 where fr.import_key = 'flag:cayman-islands'
on conflict (import_key) do update set
  topic=excluded.topic,
  source_type=excluded.source_type,
  source_title=excluded.source_title,
  official_url=excluded.official_url,
  checked_at=excluded.checked_at,
  source_version=excluded.source_version,
  updated_at=now();

insert into public.flag_sources (
  flag_registry_id, topic, source_type, source_title, official_url, checked_at,
  is_official, is_active, source_version, import_key
)
select fr.id, 'Fees', 'Official registry', 'Fees', 'https://www.cishipping.com/fees/', '2026-07-27',
       true, true, 'Yachtworth_Flag_Registry_Base_v1', 'source:cayman-islands:fees:ffb4976106'
  from public.flag_registries fr
 where fr.import_key = 'flag:cayman-islands'
on conflict (import_key) do update set
  topic=excluded.topic,
  source_type=excluded.source_type,
  source_title=excluded.source_title,
  official_url=excluded.official_url,
  checked_at=excluded.checked_at,
  source_version=excluded.source_version,
  updated_at=now();

insert into public.flag_sources (
  flag_registry_id, topic, source_type, source_title, official_url, checked_at,
  is_official, is_active, source_version, import_key
)
select fr.id, 'Superyacht registration and thresholds', 'Government authority', 'Superyacht registration and thresholds', 'https://www.transport.gov.mt/maritime/ship-and-yacht-registry/superyacht-registration-146', '2026-07-27',
       true, true, 'Yachtworth_Flag_Registry_Base_v1', 'source:malta:superyacht-registration-and-thresholds:1c1b26df5a'
  from public.flag_registries fr
 where fr.import_key = 'flag:malta'
on conflict (import_key) do update set
  topic=excluded.topic,
  source_type=excluded.source_type,
  source_title=excluded.source_title,
  official_url=excluded.official_url,
  checked_at=excluded.checked_at,
  source_version=excluded.source_version,
  updated_at=now();

insert into public.flag_sources (
  flag_registry_id, topic, source_type, source_title, official_url, checked_at,
  is_official, is_active, source_version, import_key
)
select fr.id, 'Registration procedure', 'Government authority', 'Registration procedure', 'https://www.transport.gov.mt/maritime/ship-and-yacht-registry/superyacht-registration/registration-procedure-148', '2026-07-27',
       true, true, 'Yachtworth_Flag_Registry_Base_v1', 'source:malta:registration-procedure:e3c85927e7'
  from public.flag_registries fr
 where fr.import_key = 'flag:malta'
on conflict (import_key) do update set
  topic=excluded.topic,
  source_type=excluded.source_type,
  source_title=excluded.source_title,
  official_url=excluded.official_url,
  checked_at=excluded.checked_at,
  source_version=excluded.source_version,
  updated_at=now();

insert into public.flag_sources (
  flag_registry_id, topic, source_type, source_title, official_url, checked_at,
  is_official, is_active, source_version, import_key
)
select fr.id, 'Commercial Yacht Code', 'Government authority', 'Commercial Yacht Code', 'https://www.transport.gov.mt/maritime/ship-and-yacht-registry/superyacht-registration/commercial-yacht-code-2325', '2026-07-27',
       true, true, 'Yachtworth_Flag_Registry_Base_v1', 'source:malta:commercial-yacht-code:e5f8968d44'
  from public.flag_registries fr
 where fr.import_key = 'flag:malta'
on conflict (import_key) do update set
  topic=excluded.topic,
  source_type=excluded.source_type,
  source_title=excluded.source_title,
  official_url=excluded.official_url,
  checked_at=excluded.checked_at,
  source_version=excluded.source_version,
  updated_at=now();

insert into public.flag_sources (
  flag_registry_id, topic, source_type, source_title, official_url, checked_at,
  is_official, is_active, source_version, import_key
)
select fr.id, 'Private/commercial yacht registration', 'Official registry administrator', 'Private/commercial yacht registration', 'https://www.register-iri.com/yacht/', '2026-07-27',
       true, true, 'Yachtworth_Flag_Registry_Base_v1', 'source:marshall-islands:private-commercial-yacht-registration:d151b0cb4d'
  from public.flag_registries fr
 where fr.import_key = 'flag:marshall-islands'
on conflict (import_key) do update set
  topic=excluded.topic,
  source_type=excluded.source_type,
  source_title=excluded.source_title,
  official_url=excluded.official_url,
  checked_at=excluded.checked_at,
  source_version=excluded.source_version,
  updated_at=now();

insert into public.flag_sources (
  flag_registry_id, topic, source_type, source_title, official_url, checked_at,
  is_official, is_active, source_version, import_key
)
select fr.id, 'Fees', 'Official registry administrator', 'Fees', 'https://www.register-iri.com/yacht/yacht-fees/', '2026-07-27',
       true, true, 'Yachtworth_Flag_Registry_Base_v1', 'source:marshall-islands:fees:73f2d99983'
  from public.flag_registries fr
 where fr.import_key = 'flag:marshall-islands'
on conflict (import_key) do update set
  topic=excluded.topic,
  source_type=excluded.source_type,
  source_title=excluded.source_title,
  official_url=excluded.official_url,
  checked_at=excluded.checked_at,
  source_version=excluded.source_version,
  updated_at=now();

insert into public.flag_sources (
  flag_registry_id, topic, source_type, source_title, official_url, checked_at,
  is_official, is_active, source_version, import_key
)
select fr.id, 'Yacht registration', 'Official registry', 'Yacht registration', 'https://www.iomshipregistry.com/yachts/', '2026-07-27',
       true, true, 'Yachtworth_Flag_Registry_Base_v1', 'source:isle-of-man:yacht-registration:5f492537ac'
  from public.flag_registries fr
 where fr.import_key = 'flag:isle-of-man'
on conflict (import_key) do update set
  topic=excluded.topic,
  source_type=excluded.source_type,
  source_title=excluded.source_title,
  official_url=excluded.official_url,
  checked_at=excluded.checked_at,
  source_version=excluded.source_version,
  updated_at=now();

insert into public.flag_sources (
  flag_registry_id, topic, source_type, source_title, official_url, checked_at,
  is_official, is_active, source_version, import_key
)
select fr.id, 'SSR and local registration', 'Ports of Jersey', 'SSR and local registration', 'https://www.ports.je/jerseymarinas/marinas/vesselregistration/', '2026-07-27',
       true, true, 'Yachtworth_Flag_Registry_Base_v1', 'source:jersey:ssr-and-local-registration:41d010acb9'
  from public.flag_registries fr
 where fr.import_key = 'flag:jersey'
on conflict (import_key) do update set
  topic=excluded.topic,
  source_type=excluded.source_type,
  source_title=excluded.source_title,
  official_url=excluded.official_url,
  checked_at=excluded.checked_at,
  source_version=excluded.source_version,
  updated_at=now();

insert into public.flag_sources (
  flag_registry_id, topic, source_type, source_title, official_url, checked_at,
  is_official, is_active, source_version, import_key
)
select fr.id, 'Ships Registry entry point', 'Government', 'Ships Registry entry point', 'https://www.gov.gg/shipsregistry', '2026-07-27',
       true, true, 'Yachtworth_Flag_Registry_Base_v1', 'source:guernsey:ships-registry-entry-point:0d999c21c5'
  from public.flag_registries fr
 where fr.import_key = 'flag:guernsey'
on conflict (import_key) do update set
  topic=excluded.topic,
  source_type=excluded.source_type,
  source_title=excluded.source_title,
  official_url=excluded.official_url,
  checked_at=excluded.checked_at,
  source_version=excluded.source_version,
  updated_at=now();

insert into public.flag_sources (
  flag_registry_id, topic, source_type, source_title, official_url, checked_at,
  is_official, is_active, source_version, import_key
)
select fr.id, 'Yacht registration', 'Maritime Administration', 'Yacht registration', 'https://www.gibraltarship.com/yachts/registration', '2026-07-27',
       true, true, 'Yachtworth_Flag_Registry_Base_v1', 'source:gibraltar:yacht-registration:b3ffd5fec6'
  from public.flag_registries fr
 where fr.import_key = 'flag:gibraltar'
on conflict (import_key) do update set
  topic=excluded.topic,
  source_type=excluded.source_type,
  source_title=excluded.source_title,
  official_url=excluded.official_url,
  checked_at=excluded.checked_at,
  source_version=excluded.source_version,
  updated_at=now();

insert into public.flag_sources (
  flag_registry_id, topic, source_type, source_title, official_url, checked_at,
  is_official, is_active, source_version, import_key
)
select fr.id, '2025/2026 fees', 'Maritime Administration', '2025/2026 fees', 'https://www.gibraltarship.com/fees-and-information', '2026-07-27',
       true, true, 'Yachtworth_Flag_Registry_Base_v1', 'source:gibraltar:2025-2026-fees:07a0a04300'
  from public.flag_registries fr
 where fr.import_key = 'flag:gibraltar'
on conflict (import_key) do update set
  topic=excluded.topic,
  source_type=excluded.source_type,
  source_title=excluded.source_title,
  official_url=excluded.official_url,
  checked_at=excluded.checked_at,
  source_version=excluded.source_version,
  updated_at=now();

insert into public.flag_sources (
  flag_registry_id, topic, source_type, source_title, official_url, checked_at,
  is_official, is_active, source_version, import_key
)
select fr.id, 'UK Ship Register and fees', 'GOV.UK', 'UK Ship Register and fees', 'https://www.gov.uk/register-a-boat/the-uk-ship-register', '2026-07-27',
       true, true, 'Yachtworth_Flag_Registry_Base_v1', 'source:united-kingdom:uk-ship-register-and-fees:7a7a63ef6a'
  from public.flag_registries fr
 where fr.import_key = 'flag:united-kingdom'
on conflict (import_key) do update set
  topic=excluded.topic,
  source_type=excluded.source_type,
  source_title=excluded.source_title,
  official_url=excluded.official_url,
  checked_at=excluded.checked_at,
  source_version=excluded.source_version,
  updated_at=now();

insert into public.flag_sources (
  flag_registry_id, topic, source_type, source_title, official_url, checked_at,
  is_official, is_active, source_version, import_key
)
select fr.id, 'Vessel registration', 'French government', 'Vessel registration', 'https://www.mer.gouv.fr/immatriculation-et-enregistrement-des-navires', '2026-07-27',
       true, true, 'Yachtworth_Flag_Registry_Base_v1', 'source:france:vessel-registration:b5a55e9262'
  from public.flag_registries fr
 where fr.import_key = 'flag:france'
on conflict (import_key) do update set
  topic=excluded.topic,
  source_type=excluded.source_type,
  source_title=excluded.source_title,
  official_url=excluded.official_url,
  checked_at=excluded.checked_at,
  source_version=excluded.source_version,
  updated_at=now();

insert into public.flag_sources (
  flag_registry_id, topic, source_type, source_title, official_url, checked_at,
  is_official, is_active, source_version, import_key
)
select fr.id, 'RIF commercial registry', 'French government', 'RIF commercial registry', 'https://www.rif.mer.gouv.fr/', '2026-07-27',
       true, true, 'Yachtworth_Flag_Registry_Base_v1', 'source:france:rif-commercial-registry:e2252ae2fe'
  from public.flag_registries fr
 where fr.import_key = 'flag:france'
on conflict (import_key) do update set
  topic=excluded.topic,
  source_type=excluded.source_type,
  source_title=excluded.source_title,
  official_url=excluded.official_url,
  checked_at=excluded.checked_at,
  source_version=excluded.source_version,
  updated_at=now();

insert into public.flag_sources (
  flag_registry_id, topic, source_type, source_title, official_url, checked_at,
  is_official, is_active, source_version, import_key
)
select fr.id, 'Recreational boating administration', 'Italian ministry', 'Recreational boating administration', 'https://www.mit.gov.it/temi/trasporti/nautica-da-diporto', '2026-07-27',
       true, true, 'Yachtworth_Flag_Registry_Base_v1', 'source:italy:recreational-boating-administration:bab7a857a5'
  from public.flag_registries fr
 where fr.import_key = 'flag:italy'
on conflict (import_key) do update set
  topic=excluded.topic,
  source_type=excluded.source_type,
  source_title=excluded.source_title,
  official_url=excluded.official_url,
  checked_at=excluded.checked_at,
  source_version=excluded.source_version,
  updated_at=now();

insert into public.flag_sources (
  flag_registry_id, topic, source_type, source_title, official_url, checked_at,
  is_official, is_active, source_version, import_key
)
select fr.id, 'Ship/company registry procedures', 'Spanish government', 'Ship/company registry procedures', 'https://sede.transportes.gob.es/areas-actividad/marina-mercante/registro-buques-empresas-navieras', '2026-07-27',
       true, true, 'Yachtworth_Flag_Registry_Base_v1', 'source:spain:ship-company-registry-procedures:4d8e822798'
  from public.flag_registries fr
 where fr.import_key = 'flag:spain'
on conflict (import_key) do update set
  topic=excluded.topic,
  source_type=excluded.source_type,
  source_title=excluded.source_title,
  official_url=excluded.official_url,
  checked_at=excluded.checked_at,
  source_version=excluded.source_version,
  updated_at=now();

insert into public.flag_sources (
  flag_registry_id, topic, source_type, source_title, official_url, checked_at,
  is_official, is_active, source_version, import_key
)
select fr.id, 'Registration of seagoing vessels', 'ILT', 'Registration of seagoing vessels', 'https://english.ilent.nl/topics/registration-of-seagoing-vessels', '2026-07-27',
       true, true, 'Yachtworth_Flag_Registry_Base_v1', 'source:netherlands:registration-of-seagoing-vessels:ccaa4d0cba'
  from public.flag_registries fr
 where fr.import_key = 'flag:netherlands'
on conflict (import_key) do update set
  topic=excluded.topic,
  source_type=excluded.source_type,
  source_title=excluded.source_title,
  official_url=excluded.official_url,
  checked_at=excluded.checked_at,
  source_version=excluded.source_version,
  updated_at=now();

insert into public.flag_sources (
  flag_registry_id, topic, source_type, source_title, official_url, checked_at,
  is_official, is_active, source_version, import_key
)
select fr.id, 'Recreational vessels', 'DGRM', 'Recreational vessels', 'https://www.dgrm.pt/en/embarcacoes-de-recreio', '2026-07-27',
       true, true, 'Yachtworth_Flag_Registry_Base_v1', 'source:portugal:recreational-vessels:775afe2ba3'
  from public.flag_registries fr
 where fr.import_key = 'flag:portugal'
on conflict (import_key) do update set
  topic=excluded.topic,
  source_type=excluded.source_type,
  source_title=excluded.source_title,
  official_url=excluded.official_url,
  checked_at=excluded.checked_at,
  source_version=excluded.source_version,
  updated_at=now();

insert into public.flag_sources (
  flag_registry_id, topic, source_type, source_title, official_url, checked_at,
  is_official, is_active, source_version, import_key
)
select fr.id, 'Yacht registration and fees', 'Madeira IBC / MAR information', 'Yacht registration and fees', 'https://www.ibc-madeira.com/en/ship-registration-mar/yacht-registration.html', '2026-07-27',
       true, true, 'Yachtworth_Flag_Registry_Base_v1', 'source:madeira-mar:yacht-registration-and-fees:fe8061f2f7'
  from public.flag_registries fr
 where fr.import_key = 'flag:madeira-mar'
on conflict (import_key) do update set
  topic=excluded.topic,
  source_type=excluded.source_type,
  source_title=excluded.source_title,
  official_url=excluded.official_url,
  checked_at=excluded.checked_at,
  source_version=excluded.source_version,
  updated_at=now();

insert into public.flag_sources (
  flag_registry_id, topic, source_type, source_title, official_url, checked_at,
  is_official, is_active, source_version, import_key
)
select fr.id, 'Ship registration', 'Shipping Deputy Ministry', 'Ship registration', 'https://www.gov.cy/dms/en/ship-registration/', '2026-07-27',
       true, true, 'Yachtworth_Flag_Registry_Base_v1', 'source:cyprus:ship-registration:b9f038ae3b'
  from public.flag_registries fr
 where fr.import_key = 'flag:cyprus'
on conflict (import_key) do update set
  topic=excluded.topic,
  source_type=excluded.source_type,
  source_title=excluded.source_title,
  official_url=excluded.official_url,
  checked_at=excluded.checked_at,
  source_version=excluded.source_version,
  updated_at=now();

insert into public.flag_sources (
  flag_registry_id, topic, source_type, source_title, official_url, checked_at,
  is_official, is_active, source_version, import_key
)
select fr.id, 'Vessel registration', 'Panama Maritime Authority', 'Vessel registration', 'https://www.amp.gob.pa/servicios/registro-de-naves/', '2026-07-27',
       true, true, 'Yachtworth_Flag_Registry_Base_v1', 'source:panama:vessel-registration:29e3574951'
  from public.flag_registries fr
 where fr.import_key = 'flag:panama'
on conflict (import_key) do update set
  topic=excluded.topic,
  source_type=excluded.source_type,
  source_title=excluded.source_title,
  official_url=excluded.official_url,
  checked_at=excluded.checked_at,
  source_version=excluded.source_version,
  updated_at=now();

insert into public.flag_sources (
  flag_registry_id, topic, source_type, source_title, official_url, checked_at,
  is_official, is_active, source_version, import_key
)
select fr.id, 'Yacht registration', 'IMMARBE', 'Yacht registration', 'https://immarbe.com/yacht-registration/', '2026-07-27',
       true, true, 'Yachtworth_Flag_Registry_Base_v1', 'source:belize:yacht-registration:32bf4a7638'
  from public.flag_registries fr
 where fr.import_key = 'flag:belize'
on conflict (import_key) do update set
  topic=excluded.topic,
  source_type=excluded.source_type,
  source_title=excluded.source_title,
  official_url=excluded.official_url,
  checked_at=excluded.checked_at,
  source_version=excluded.source_version,
  updated_at=now();

insert into public.flag_sources (
  flag_registry_id, topic, source_type, source_title, official_url, checked_at,
  is_official, is_active, source_version, import_key
)
select fr.id, 'Ship/yacht registration', 'Maritime Authority', 'Ship/yacht registration', 'https://maritimejamaica.com/ship-registration/', '2026-07-27',
       true, true, 'Yachtworth_Flag_Registry_Base_v1', 'source:jamaica:ship-yacht-registration:7975deb4b9'
  from public.flag_registries fr
 where fr.import_key = 'flag:jamaica'
on conflict (import_key) do update set
  topic=excluded.topic,
  source_type=excluded.source_type,
  source_title=excluded.source_title,
  official_url=excluded.official_url,
  checked_at=excluded.checked_at,
  source_version=excluded.source_version,
  updated_at=now();

insert into public.flag_sources (
  flag_registry_id, topic, source_type, source_title, official_url, checked_at,
  is_official, is_active, source_version, import_key
)
select fr.id, 'Yacht registration', 'Maritime Cook Islands', 'Yacht registration', 'https://maritimecookislands.com/yacht-registration/', '2026-07-27',
       true, true, 'Yachtworth_Flag_Registry_Base_v1', 'source:cook-islands:yacht-registration:07e5663641'
  from public.flag_registries fr
 where fr.import_key = 'flag:cook-islands'
on conflict (import_key) do update set
  topic=excluded.topic,
  source_type=excluded.source_type,
  source_title=excluded.source_title,
  official_url=excluded.official_url,
  checked_at=excluded.checked_at,
  source_version=excluded.source_version,
  updated_at=now();

insert into public.flag_sources (
  flag_registry_id, topic, source_type, source_title, official_url, checked_at,
  is_official, is_active, source_version, import_key
)
select fr.id, 'Yacht registration', 'Ship Register / Maritime Authority support', 'Yacht registration', 'https://www.smsr.sm/yacht-registration/', '2026-07-27',
       true, true, 'Yachtworth_Flag_Registry_Base_v1', 'source:san-marino:yacht-registration:3ffeb02e91'
  from public.flag_registries fr
 where fr.import_key = 'flag:san-marino'
on conflict (import_key) do update set
  topic=excluded.topic,
  source_type=excluded.source_type,
  source_title=excluded.source_title,
  official_url=excluded.official_url,
  checked_at=excluded.checked_at,
  source_version=excluded.source_version,
  updated_at=now();

insert into public.flag_sources (
  flag_registry_id, topic, source_type, source_title, official_url, checked_at,
  is_official, is_active, source_version, import_key
)
select fr.id, '2026 private yacht fees', 'Maritime Authority price list', '2026 private yacht fees', 'https://www.smsr.sm/private-yacht-price-list/', '2026-07-27',
       true, true, 'Yachtworth_Flag_Registry_Base_v1', 'source:san-marino:2026-private-yacht-fees:34f55a332c'
  from public.flag_registries fr
 where fr.import_key = 'flag:san-marino'
on conflict (import_key) do update set
  topic=excluded.topic,
  source_type=excluded.source_type,
  source_title=excluded.source_title,
  official_url=excluded.official_url,
  checked_at=excluded.checked_at,
  source_version=excluded.source_version,
  updated_at=now();

insert into public.flag_sources (
  flag_registry_id, topic, source_type, source_title, official_url, checked_at,
  is_official, is_active, source_version, import_key
)
select fr.id, 'Registration', 'Maritime Administration', 'Registration', 'https://maritime.public.lu/en/registration.html', '2026-07-27',
       true, true, 'Yachtworth_Flag_Registry_Base_v1', 'source:luxembourg:registration:dac7c5a683'
  from public.flag_registries fr
 where fr.import_key = 'flag:luxembourg'
on conflict (import_key) do update set
  topic=excluded.topic,
  source_type=excluded.source_type,
  source_title=excluded.source_title,
  official_url=excluded.official_url,
  checked_at=excluded.checked_at,
  source_version=excluded.source_version,
  updated_at=now();

insert into public.flag_fee_rules (
  flag_registry_id, registration_type, fee_component, amount, currency,
  formula_text, notes, official_source_url, confidence_level, last_verified_at,
  is_active, source_version, import_key, original_row
)
select fr.id, 'Private/Commercial', 'Minimum annual tonnage fee', 600.0, 'USD',
       'Up to 400 GT', 'Current official fee page; complete matrix still required', 'https://www.cishipping.com/fees/', null,
       '2026-07-27', true, 'Yachtworth_Flag_Registry_Base_v1',
       'fee:522c61593f4a641e6b9fd0b75851638d477ee7d9', '{"Amount": "600", "Basis / Formula": "Up to 400 GT", "Currency": "USD", "Fee Component": "Minimum annual tonnage fee", "Flag": "Cayman Islands", "Last Verified": "46230", "Notes": "Current official fee page; complete matrix still required", "Official Source": "https://www.cishipping.com/fees/", "Registration Type": "Private/Commercial"}'::jsonb
  from public.flag_registries fr
 where fr.import_key = 'flag:cayman-islands'
on conflict (import_key) do update set
  registration_type=excluded.registration_type,
  fee_component=excluded.fee_component,
  amount=excluded.amount,
  currency=excluded.currency,
  formula_text=excluded.formula_text,
  notes=excluded.notes,
  official_source_url=excluded.official_source_url,
  last_verified_at=excluded.last_verified_at,
  source_version=excluded.source_version,
  original_row=excluded.original_row,
  updated_at=now();

insert into public.flag_fee_rules (
  flag_registry_id, registration_type, fee_component, amount, currency,
  formula_text, notes, official_source_url, confidence_level, last_verified_at,
  is_active, source_version, import_key, original_row
)
select fr.id, 'Under 24 m', 'Initial yacht registration', 247.0, 'GBP',
       '2025 tariff', 'Effective 2025-08-01', 'https://www.gibraltarship.com/fees-and-information', null,
       '2026-07-27', true, 'Yachtworth_Flag_Registry_Base_v1',
       'fee:3f90a52d267f81eccb1a363316051f4816f4aa37', '{"Amount": "247", "Basis / Formula": "2025 tariff", "Currency": "GBP", "Fee Component": "Initial yacht registration", "Flag": "Gibraltar", "Last Verified": "46230", "Notes": "Effective 2025-08-01", "Official Source": "https://www.gibraltarship.com/fees-and-information", "Registration Type": "Under 24 m"}'::jsonb
  from public.flag_registries fr
 where fr.import_key = 'flag:gibraltar'
on conflict (import_key) do update set
  registration_type=excluded.registration_type,
  fee_component=excluded.fee_component,
  amount=excluded.amount,
  currency=excluded.currency,
  formula_text=excluded.formula_text,
  notes=excluded.notes,
  official_source_url=excluded.official_source_url,
  last_verified_at=excluded.last_verified_at,
  source_version=excluded.source_version,
  original_row=excluded.original_row,
  updated_at=now();

insert into public.flag_fee_rules (
  flag_registry_id, registration_type, fee_component, amount, currency,
  formula_text, notes, official_source_url, confidence_level, last_verified_at,
  is_active, source_version, import_key, original_row
)
select fr.id, 'Under 24 m', 'Annual renewal', 28.0, 'GBP',
       '2025 tariff', 'Annual Certificate of Registry renewal', 'https://www.gibraltarship.com/fees-and-information', null,
       '2026-07-27', true, 'Yachtworth_Flag_Registry_Base_v1',
       'fee:ae500fa222ca26eca050c4d866de69832e2bdcc3', '{"Amount": "28", "Basis / Formula": "2025 tariff", "Currency": "GBP", "Fee Component": "Annual renewal", "Flag": "Gibraltar", "Last Verified": "46230", "Notes": "Annual Certificate of Registry renewal", "Official Source": "https://www.gibraltarship.com/fees-and-information", "Registration Type": "Under 24 m"}'::jsonb
  from public.flag_registries fr
 where fr.import_key = 'flag:gibraltar'
on conflict (import_key) do update set
  registration_type=excluded.registration_type,
  fee_component=excluded.fee_component,
  amount=excluded.amount,
  currency=excluded.currency,
  formula_text=excluded.formula_text,
  notes=excluded.notes,
  official_source_url=excluded.official_source_url,
  last_verified_at=excluded.last_verified_at,
  source_version=excluded.source_version,
  original_row=excluded.original_row,
  updated_at=now();

insert into public.flag_fee_rules (
  flag_registry_id, registration_type, fee_component, amount, currency,
  formula_text, notes, official_source_url, confidence_level, last_verified_at,
  is_active, source_version, import_key, original_row
)
select fr.id, 'Pleasure >24 m', 'Initial registration', 436.0, 'GBP',
       'Up to 1,599 GT', '2025 tariff', 'https://www.gibraltarship.com/fees-and-information', null,
       '2026-07-27', true, 'Yachtworth_Flag_Registry_Base_v1',
       'fee:011a0b81ad3a9be2fd434893bec9e5c131df6b2c', '{"Amount": "436", "Basis / Formula": "Up to 1,599 GT", "Currency": "GBP", "Fee Component": "Initial registration", "Flag": "Gibraltar", "Last Verified": "46230", "Notes": "2025 tariff", "Official Source": "https://www.gibraltarship.com/fees-and-information", "Registration Type": "Pleasure >24 m"}'::jsonb
  from public.flag_registries fr
 where fr.import_key = 'flag:gibraltar'
on conflict (import_key) do update set
  registration_type=excluded.registration_type,
  fee_component=excluded.fee_component,
  amount=excluded.amount,
  currency=excluded.currency,
  formula_text=excluded.formula_text,
  notes=excluded.notes,
  official_source_url=excluded.official_source_url,
  last_verified_at=excluded.last_verified_at,
  source_version=excluded.source_version,
  original_row=excluded.original_row,
  updated_at=now();

insert into public.flag_fee_rules (
  flag_registry_id, registration_type, fee_component, amount, currency,
  formula_text, notes, official_source_url, confidence_level, last_verified_at,
  is_active, source_version, import_key, original_row
)
select fr.id, 'Pleasure >24 m', 'Annual renewal', 78.0, 'GBP',
       '2025 tariff', '2025 tariff', 'https://www.gibraltarship.com/fees-and-information', null,
       '2026-07-27', true, 'Yachtworth_Flag_Registry_Base_v1',
       'fee:88fbe659e851f920800518977fb91a39bc0ebb78', '{"Amount": "78", "Basis / Formula": "2025 tariff", "Currency": "GBP", "Fee Component": "Annual renewal", "Flag": "Gibraltar", "Last Verified": "46230", "Notes": "2025 tariff", "Official Source": "https://www.gibraltarship.com/fees-and-information", "Registration Type": "Pleasure >24 m"}'::jsonb
  from public.flag_registries fr
 where fr.import_key = 'flag:gibraltar'
on conflict (import_key) do update set
  registration_type=excluded.registration_type,
  fee_component=excluded.fee_component,
  amount=excluded.amount,
  currency=excluded.currency,
  formula_text=excluded.formula_text,
  notes=excluded.notes,
  official_source_url=excluded.official_source_url,
  last_verified_at=excluded.last_verified_at,
  source_version=excluded.source_version,
  original_row=excluded.original_row,
  updated_at=now();

insert into public.flag_fee_rules (
  flag_registry_id, registration_type, fee_component, amount, currency,
  formula_text, notes, official_source_url, confidence_level, last_verified_at,
  is_active, source_version, import_key, original_row
)
select fr.id, 'Commercial >24 m', 'Initial registration', 599.0, 'GBP',
       'Up to 1,599 GT', '2025 tariff', 'https://www.gibraltarship.com/fees-and-information', null,
       '2026-07-27', true, 'Yachtworth_Flag_Registry_Base_v1',
       'fee:e880178f1256ac37f7dc88907c8d72176c39b90a', '{"Amount": "599", "Basis / Formula": "Up to 1,599 GT", "Currency": "GBP", "Fee Component": "Initial registration", "Flag": "Gibraltar", "Last Verified": "46230", "Notes": "2025 tariff", "Official Source": "https://www.gibraltarship.com/fees-and-information", "Registration Type": "Commercial >24 m"}'::jsonb
  from public.flag_registries fr
 where fr.import_key = 'flag:gibraltar'
on conflict (import_key) do update set
  registration_type=excluded.registration_type,
  fee_component=excluded.fee_component,
  amount=excluded.amount,
  currency=excluded.currency,
  formula_text=excluded.formula_text,
  notes=excluded.notes,
  official_source_url=excluded.official_source_url,
  last_verified_at=excluded.last_verified_at,
  source_version=excluded.source_version,
  original_row=excluded.original_row,
  updated_at=now();

insert into public.flag_fee_rules (
  flag_registry_id, registration_type, fee_component, amount, currency,
  formula_text, notes, official_source_url, confidence_level, last_verified_at,
  is_active, source_version, import_key, original_row
)
select fr.id, 'Commercial >24 m', 'Annual renewal', 121.0, 'GBP',
       '2025 tariff', '2025 tariff', 'https://www.gibraltarship.com/fees-and-information', null,
       '2026-07-27', true, 'Yachtworth_Flag_Registry_Base_v1',
       'fee:aa0f208c8ea9d00ed222346ca922c90c451b8539', '{"Amount": "121", "Basis / Formula": "2025 tariff", "Currency": "GBP", "Fee Component": "Annual renewal", "Flag": "Gibraltar", "Last Verified": "46230", "Notes": "2025 tariff", "Official Source": "https://www.gibraltarship.com/fees-and-information", "Registration Type": "Commercial >24 m"}'::jsonb
  from public.flag_registries fr
 where fr.import_key = 'flag:gibraltar'
on conflict (import_key) do update set
  registration_type=excluded.registration_type,
  fee_component=excluded.fee_component,
  amount=excluded.amount,
  currency=excluded.currency,
  formula_text=excluded.formula_text,
  notes=excluded.notes,
  official_source_url=excluded.official_source_url,
  last_verified_at=excluded.last_verified_at,
  source_version=excluded.source_version,
  original_row=excluded.original_row,
  updated_at=now();

insert into public.flag_fee_rules (
  flag_registry_id, registration_type, fee_component, amount, currency,
  formula_text, notes, official_source_url, confidence_level, last_verified_at,
  is_active, source_version, import_key, original_row
)
select fr.id, 'All >24 m', 'Annual tonnage tax', 2000.0, 'GBP',
       'Up to 3,000 GT', 'Higher bands apply', 'https://www.gibraltarship.com/fees-and-information', null,
       '2026-07-27', true, 'Yachtworth_Flag_Registry_Base_v1',
       'fee:d715632a6e4c6a6e850d24dc12a7887e05669697', '{"Amount": "2000", "Basis / Formula": "Up to 3,000 GT", "Currency": "GBP", "Fee Component": "Annual tonnage tax", "Flag": "Gibraltar", "Last Verified": "46230", "Notes": "Higher bands apply", "Official Source": "https://www.gibraltarship.com/fees-and-information", "Registration Type": "All >24 m"}'::jsonb
  from public.flag_registries fr
 where fr.import_key = 'flag:gibraltar'
on conflict (import_key) do update set
  registration_type=excluded.registration_type,
  fee_component=excluded.fee_component,
  amount=excluded.amount,
  currency=excluded.currency,
  formula_text=excluded.formula_text,
  notes=excluded.notes,
  official_source_url=excluded.official_source_url,
  last_verified_at=excluded.last_verified_at,
  source_version=excluded.source_version,
  original_row=excluded.original_row,
  updated_at=now();

insert into public.flag_fee_rules (
  flag_registry_id, registration_type, fee_component, amount, currency,
  formula_text, notes, official_source_url, confidence_level, last_verified_at,
  is_active, source_version, import_key, original_row
)
select fr.id, 'Part 1', 'Initial registration', 153.0, 'GBP',
       '5-year term', 'Official GOV.UK fee', 'https://www.gov.uk/register-a-boat/the-uk-ship-register', null,
       '2026-07-27', true, 'Yachtworth_Flag_Registry_Base_v1',
       'fee:34931a2633f281c97f9cc432072b19d4d6dc1f19', '{"Amount": "153", "Basis / Formula": "5-year term", "Currency": "GBP", "Fee Component": "Initial registration", "Flag": "United Kingdom", "Last Verified": "46230", "Notes": "Official GOV.UK fee", "Official Source": "https://www.gov.uk/register-a-boat/the-uk-ship-register", "Registration Type": "Part 1"}'::jsonb
  from public.flag_registries fr
 where fr.import_key = 'flag:united-kingdom'
on conflict (import_key) do update set
  registration_type=excluded.registration_type,
  fee_component=excluded.fee_component,
  amount=excluded.amount,
  currency=excluded.currency,
  formula_text=excluded.formula_text,
  notes=excluded.notes,
  official_source_url=excluded.official_source_url,
  last_verified_at=excluded.last_verified_at,
  source_version=excluded.source_version,
  original_row=excluded.original_row,
  updated_at=now();

insert into public.flag_fee_rules (
  flag_registry_id, registration_type, fee_component, amount, currency,
  formula_text, notes, official_source_url, confidence_level, last_verified_at,
  is_active, source_version, import_key, original_row
)
select fr.id, 'Part 1', 'Renewal', 72.0, 'GBP',
       '5-year term', 'Official GOV.UK fee', 'https://www.gov.uk/register-a-boat/the-uk-ship-register', null,
       '2026-07-27', true, 'Yachtworth_Flag_Registry_Base_v1',
       'fee:4081c9feb01d1f07da0e359189ae0eec91bddffa', '{"Amount": "72", "Basis / Formula": "5-year term", "Currency": "GBP", "Fee Component": "Renewal", "Flag": "United Kingdom", "Last Verified": "46230", "Notes": "Official GOV.UK fee", "Official Source": "https://www.gov.uk/register-a-boat/the-uk-ship-register", "Registration Type": "Part 1"}'::jsonb
  from public.flag_registries fr
 where fr.import_key = 'flag:united-kingdom'
on conflict (import_key) do update set
  registration_type=excluded.registration_type,
  fee_component=excluded.fee_component,
  amount=excluded.amount,
  currency=excluded.currency,
  formula_text=excluded.formula_text,
  notes=excluded.notes,
  official_source_url=excluded.official_source_url,
  last_verified_at=excluded.last_verified_at,
  source_version=excluded.source_version,
  original_row=excluded.original_row,
  updated_at=now();

insert into public.flag_fee_rules (
  flag_registry_id, registration_type, fee_component, amount, currency,
  formula_text, notes, official_source_url, confidence_level, last_verified_at,
  is_active, source_version, import_key, original_row
)
select fr.id, 'Part 3 SSR', 'Registration / renewal', 35.0, 'GBP',
       '5-year term', 'Pleasure vessel below 24 m, eligibility applies', 'https://www.gov.uk/register-a-boat/the-uk-ship-register', null,
       '2026-07-27', true, 'Yachtworth_Flag_Registry_Base_v1',
       'fee:8fe053794523035f0047a3047e3e4a088db564ed', '{"Amount": "35", "Basis / Formula": "5-year term", "Currency": "GBP", "Fee Component": "Registration / renewal", "Flag": "United Kingdom", "Last Verified": "46230", "Notes": "Pleasure vessel below 24 m, eligibility applies", "Official Source": "https://www.gov.uk/register-a-boat/the-uk-ship-register", "Registration Type": "Part 3 SSR"}'::jsonb
  from public.flag_registries fr
 where fr.import_key = 'flag:united-kingdom'
on conflict (import_key) do update set
  registration_type=excluded.registration_type,
  fee_component=excluded.fee_component,
  amount=excluded.amount,
  currency=excluded.currency,
  formula_text=excluded.formula_text,
  notes=excluded.notes,
  official_source_url=excluded.official_source_url,
  last_verified_at=excluded.last_verified_at,
  source_version=excluded.source_version,
  original_row=excluded.original_row,
  updated_at=now();

insert into public.flag_fee_rules (
  flag_registry_id, registration_type, fee_component, amount, currency,
  formula_text, notes, official_source_url, confidence_level, last_verified_at,
  is_active, source_version, import_key, original_row
)
select fr.id, 'Commercial relevant yachts', 'Safe Manning Document', 199.0, 'GBP',
       'Per application', 'Applicability rules apply', 'https://www.gov.uk/guidance/safe-manning-requirements', null,
       '2026-07-27', true, 'Yachtworth_Flag_Registry_Base_v1',
       'fee:03be0fd165cc7894efc751303d549c992708bb22', '{"Amount": "199", "Basis / Formula": "Per application", "Currency": "GBP", "Fee Component": "Safe Manning Document", "Flag": "United Kingdom", "Last Verified": "46230", "Notes": "Applicability rules apply", "Official Source": "https://www.gov.uk/guidance/safe-manning-requirements", "Registration Type": "Commercial relevant yachts"}'::jsonb
  from public.flag_registries fr
 where fr.import_key = 'flag:united-kingdom'
on conflict (import_key) do update set
  registration_type=excluded.registration_type,
  fee_component=excluded.fee_component,
  amount=excluded.amount,
  currency=excluded.currency,
  formula_text=excluded.formula_text,
  notes=excluded.notes,
  official_source_url=excluded.official_source_url,
  last_verified_at=excluded.last_verified_at,
  source_version=excluded.source_version,
  original_row=excluded.original_row,
  updated_at=now();

insert into public.flag_fee_rules (
  flag_registry_id, registration_type, fee_component, amount, currency,
  formula_text, notes, official_source_url, confidence_level, last_verified_at,
  is_active, source_version, import_key, original_row
)
select fr.id, 'SSR', 'Registration / renewal', 70.0, 'GBP',
       '5-year term', 'Jersey residents; individual ownership; below 24 m', 'https://www.ports.je/jerseymarinas/marinas/vesselregistration/', null,
       '2026-07-27', true, 'Yachtworth_Flag_Registry_Base_v1',
       'fee:8b30b44614b181b7fbc6e2539b74244b427aa1d1', '{"Amount": "70", "Basis / Formula": "5-year term", "Currency": "GBP", "Fee Component": "Registration / renewal", "Flag": "Jersey", "Last Verified": "46230", "Notes": "Jersey residents; individual ownership; below 24 m", "Official Source": "https://www.ports.je/jerseymarinas/marinas/vesselregistration/", "Registration Type": "SSR"}'::jsonb
  from public.flag_registries fr
 where fr.import_key = 'flag:jersey'
on conflict (import_key) do update set
  registration_type=excluded.registration_type,
  fee_component=excluded.fee_component,
  amount=excluded.amount,
  currency=excluded.currency,
  formula_text=excluded.formula_text,
  notes=excluded.notes,
  official_source_url=excluded.official_source_url,
  last_verified_at=excluded.last_verified_at,
  source_version=excluded.source_version,
  original_row=excluded.original_row,
  updated_at=now();

insert into public.flag_fee_rules (
  flag_registry_id, registration_type, fee_component, amount, currency,
  formula_text, notes, official_source_url, confidence_level, last_verified_at,
  is_active, source_version, import_key, original_row
)
select fr.id, 'SSR', 'Fast track', 145.0, 'GBP',
       'Per application', 'Current published tariff', 'https://www.ports.je/jerseymarinas/marinas/vesselregistration/', null,
       '2026-07-27', true, 'Yachtworth_Flag_Registry_Base_v1',
       'fee:ca797d757b266d14946cb9edc661d99cde69ec06', '{"Amount": "145", "Basis / Formula": "Per application", "Currency": "GBP", "Fee Component": "Fast track", "Flag": "Jersey", "Last Verified": "46230", "Notes": "Current published tariff", "Official Source": "https://www.ports.je/jerseymarinas/marinas/vesselregistration/", "Registration Type": "SSR"}'::jsonb
  from public.flag_registries fr
 where fr.import_key = 'flag:jersey'
on conflict (import_key) do update set
  registration_type=excluded.registration_type,
  fee_component=excluded.fee_component,
  amount=excluded.amount,
  currency=excluded.currency,
  formula_text=excluded.formula_text,
  notes=excluded.notes,
  official_source_url=excluded.official_source_url,
  last_verified_at=excluded.last_verified_at,
  source_version=excluded.source_version,
  original_row=excluded.original_row,
  updated_at=now();

insert into public.flag_fee_rules (
  flag_registry_id, registration_type, fee_component, amount, currency,
  formula_text, notes, official_source_url, confidence_level, last_verified_at,
  is_active, source_version, import_key, original_row
)
select fr.id, 'All', 'Kadaster ship registration', 630.0, 'EUR',
       '2026 fee', 'Title registration component', 'https://english.ilent.nl/topics/registration-of-seagoing-vessels/costs', null,
       '2026-07-27', true, 'Yachtworth_Flag_Registry_Base_v1',
       'fee:8965627b4958323793e3d52d2843ad75ab1630b0', '{"Amount": "630", "Basis / Formula": "2026 fee", "Currency": "EUR", "Fee Component": "Kadaster ship registration", "Flag": "Netherlands", "Last Verified": "46230", "Notes": "Title registration component", "Official Source": "https://english.ilent.nl/topics/registration-of-seagoing-vessels/costs", "Registration Type": "All"}'::jsonb
  from public.flag_registries fr
 where fr.import_key = 'flag:netherlands'
on conflict (import_key) do update set
  registration_type=excluded.registration_type,
  fee_component=excluded.fee_component,
  amount=excluded.amount,
  currency=excluded.currency,
  formula_text=excluded.formula_text,
  notes=excluded.notes,
  official_source_url=excluded.official_source_url,
  last_verified_at=excluded.last_verified_at,
  source_version=excluded.source_version,
  original_row=excluded.original_row,
  updated_at=now();

insert into public.flag_fee_rules (
  flag_registry_id, registration_type, fee_component, amount, currency,
  formula_text, notes, official_source_url, confidence_level, last_verified_at,
  is_active, source_version, import_key, original_row
)
select fr.id, 'Pleasure', 'Seabrief', 221.0, 'EUR',
       '2026 fee', 'Non-commercial use', 'https://english.ilent.nl/topics/registration-of-seagoing-vessels/costs', null,
       '2026-07-27', true, 'Yachtworth_Flag_Registry_Base_v1',
       'fee:0d702b9c3bfb21839fc2ef6f65078db1a8f51b92', '{"Amount": "221", "Basis / Formula": "2026 fee", "Currency": "EUR", "Fee Component": "Seabrief", "Flag": "Netherlands", "Last Verified": "46230", "Notes": "Non-commercial use", "Official Source": "https://english.ilent.nl/topics/registration-of-seagoing-vessels/costs", "Registration Type": "Pleasure"}'::jsonb
  from public.flag_registries fr
 where fr.import_key = 'flag:netherlands'
on conflict (import_key) do update set
  registration_type=excluded.registration_type,
  fee_component=excluded.fee_component,
  amount=excluded.amount,
  currency=excluded.currency,
  formula_text=excluded.formula_text,
  notes=excluded.notes,
  official_source_url=excluded.official_source_url,
  last_verified_at=excluded.last_verified_at,
  source_version=excluded.source_version,
  original_row=excluded.original_row,
  updated_at=now();

insert into public.flag_fee_rules (
  flag_registry_id, registration_type, fee_component, amount, currency,
  formula_text, notes, official_source_url, confidence_level, last_verified_at,
  is_active, source_version, import_key, original_row
)
select fr.id, 'Below 24 m', 'Measurement certificate', 201.0, 'EUR',
       '2026 fee', 'Separate technical component', 'https://english.ilent.nl/topics/registration-of-seagoing-vessels/costs', null,
       '2026-07-27', true, 'Yachtworth_Flag_Registry_Base_v1',
       'fee:85709f3220e64609d7ea1be274e092900670e857', '{"Amount": "201", "Basis / Formula": "2026 fee", "Currency": "EUR", "Fee Component": "Measurement certificate", "Flag": "Netherlands", "Last Verified": "46230", "Notes": "Separate technical component", "Official Source": "https://english.ilent.nl/topics/registration-of-seagoing-vessels/costs", "Registration Type": "Below 24 m"}'::jsonb
  from public.flag_registries fr
 where fr.import_key = 'flag:netherlands'
on conflict (import_key) do update set
  registration_type=excluded.registration_type,
  fee_component=excluded.fee_component,
  amount=excluded.amount,
  currency=excluded.currency,
  formula_text=excluded.formula_text,
  notes=excluded.notes,
  official_source_url=excluded.official_source_url,
  last_verified_at=excluded.last_verified_at,
  source_version=excluded.source_version,
  original_row=excluded.original_row,
  updated_at=now();

insert into public.flag_fee_rules (
  flag_registry_id, registration_type, fee_component, amount, currency,
  formula_text, notes, official_source_url, confidence_level, last_verified_at,
  is_active, source_version, import_key, original_row
)
select fr.id, 'Pleasure', 'Nationality test', 248.0, 'EUR',
       '2026 fee', 'Kadaster/ILT process', 'https://english.ilent.nl/topics/registration-of-seagoing-vessels/costs', null,
       '2026-07-27', true, 'Yachtworth_Flag_Registry_Base_v1',
       'fee:3eff081f74ae67ce2117af2b9eff6abeb88cc620', '{"Amount": "248", "Basis / Formula": "2026 fee", "Currency": "EUR", "Fee Component": "Nationality test", "Flag": "Netherlands", "Last Verified": "46230", "Notes": "Kadaster/ILT process", "Official Source": "https://english.ilent.nl/topics/registration-of-seagoing-vessels/costs", "Registration Type": "Pleasure"}'::jsonb
  from public.flag_registries fr
 where fr.import_key = 'flag:netherlands'
on conflict (import_key) do update set
  registration_type=excluded.registration_type,
  fee_component=excluded.fee_component,
  amount=excluded.amount,
  currency=excluded.currency,
  formula_text=excluded.formula_text,
  notes=excluded.notes,
  official_source_url=excluded.official_source_url,
  last_verified_at=excluded.last_verified_at,
  source_version=excluded.source_version,
  original_row=excluded.original_row,
  updated_at=now();

insert into public.flag_fee_rules (
  flag_registry_id, registration_type, fee_component, amount, currency,
  formula_text, notes, official_source_url, confidence_level, last_verified_at,
  is_active, source_version, import_key, original_row
)
select fr.id, 'Commercial', 'Nationality test', 410.0, 'EUR',
       '2026 fee', 'Kadaster/ILT process', 'https://english.ilent.nl/topics/registration-of-seagoing-vessels/costs', null,
       '2026-07-27', true, 'Yachtworth_Flag_Registry_Base_v1',
       'fee:a7cbda09c2ab25144f14405e0cddcc270e14f8d3', '{"Amount": "410", "Basis / Formula": "2026 fee", "Currency": "EUR", "Fee Component": "Nationality test", "Flag": "Netherlands", "Last Verified": "46230", "Notes": "Kadaster/ILT process", "Official Source": "https://english.ilent.nl/topics/registration-of-seagoing-vessels/costs", "Registration Type": "Commercial"}'::jsonb
  from public.flag_registries fr
 where fr.import_key = 'flag:netherlands'
on conflict (import_key) do update set
  registration_type=excluded.registration_type,
  fee_component=excluded.fee_component,
  amount=excluded.amount,
  currency=excluded.currency,
  formula_text=excluded.formula_text,
  notes=excluded.notes,
  official_source_url=excluded.official_source_url,
  last_verified_at=excluded.last_verified_at,
  source_version=excluded.source_version,
  original_row=excluded.original_row,
  updated_at=now();

insert into public.flag_fee_rules (
  flag_registry_id, registration_type, fee_component, amount, currency,
  formula_text, notes, official_source_url, confidence_level, last_verified_at,
  is_active, source_version, import_key, original_row
)
select fr.id, 'Recreational', 'Registration fee example', 110.7, 'EUR',
       '2025 lower category', 'Exact category must be selected', 'https://www.dgrm.pt/taxas', null,
       '2026-07-27', true, 'Yachtworth_Flag_Registry_Base_v1',
       'fee:135db14b76e74069540aedb1f028d9822781f06d', '{"Amount": "110.7", "Basis / Formula": "2025 lower category", "Currency": "EUR", "Fee Component": "Registration fee example", "Flag": "Portugal", "Last Verified": "46230", "Notes": "Exact category must be selected", "Official Source": "https://www.dgrm.pt/taxas", "Registration Type": "Recreational"}'::jsonb
  from public.flag_registries fr
 where fr.import_key = 'flag:portugal'
on conflict (import_key) do update set
  registration_type=excluded.registration_type,
  fee_component=excluded.fee_component,
  amount=excluded.amount,
  currency=excluded.currency,
  formula_text=excluded.formula_text,
  notes=excluded.notes,
  official_source_url=excluded.official_source_url,
  last_verified_at=excluded.last_verified_at,
  source_version=excluded.source_version,
  original_row=excluded.original_row,
  updated_at=now();

insert into public.flag_fee_rules (
  flag_registry_id, registration_type, fee_component, amount, currency,
  formula_text, notes, official_source_url, confidence_level, last_verified_at,
  is_active, source_version, import_key, original_row
)
select fr.id, 'Recreational', 'Registration fee example', 138.3, 'EUR',
       '2025 ocean/offshore category', 'Exact category must be selected', 'https://www.dgrm.pt/taxas', null,
       '2026-07-27', true, 'Yachtworth_Flag_Registry_Base_v1',
       'fee:3355c0ff130c02665b083e4c1b9ebb4dd544d98a', '{"Amount": "138.30000000000001", "Basis / Formula": "2025 ocean/offshore category", "Currency": "EUR", "Fee Component": "Registration fee example", "Flag": "Portugal", "Last Verified": "46230", "Notes": "Exact category must be selected", "Official Source": "https://www.dgrm.pt/taxas", "Registration Type": "Recreational"}'::jsonb
  from public.flag_registries fr
 where fr.import_key = 'flag:portugal'
on conflict (import_key) do update set
  registration_type=excluded.registration_type,
  fee_component=excluded.fee_component,
  amount=excluded.amount,
  currency=excluded.currency,
  formula_text=excluded.formula_text,
  notes=excluded.notes,
  official_source_url=excluded.official_source_url,
  last_verified_at=excluded.last_verified_at,
  source_version=excluded.source_version,
  original_row=excluded.original_row,
  updated_at=now();

insert into public.flag_fee_rules (
  flag_registry_id, registration_type, fee_component, amount, currency,
  formula_text, notes, official_source_url, confidence_level, last_verified_at,
  is_active, source_version, import_key, original_row
)
select fr.id, 'Private 7–24 m', 'Initial registration', 500.0, 'EUR',
       'Flat', 'MAR published fee', 'https://www.ibc-madeira.com/en/ship-registration-mar/yacht-registration.html', null,
       '2026-07-27', true, 'Yachtworth_Flag_Registry_Base_v1',
       'fee:4b327c3b0cb4da25f5754a8faad2f005ecbc8e22', '{"Amount": "500", "Basis / Formula": "Flat", "Currency": "EUR", "Fee Component": "Initial registration", "Flag": "Madeira (MAR)", "Last Verified": "46230", "Notes": "MAR published fee", "Official Source": "https://www.ibc-madeira.com/en/ship-registration-mar/yacht-registration.html", "Registration Type": "Private 7–24 m"}'::jsonb
  from public.flag_registries fr
 where fr.import_key = 'flag:madeira-mar'
on conflict (import_key) do update set
  registration_type=excluded.registration_type,
  fee_component=excluded.fee_component,
  amount=excluded.amount,
  currency=excluded.currency,
  formula_text=excluded.formula_text,
  notes=excluded.notes,
  official_source_url=excluded.official_source_url,
  last_verified_at=excluded.last_verified_at,
  source_version=excluded.source_version,
  original_row=excluded.original_row,
  updated_at=now();

insert into public.flag_fee_rules (
  flag_registry_id, registration_type, fee_component, amount, currency,
  formula_text, notes, official_source_url, confidence_level, last_verified_at,
  is_active, source_version, import_key, original_row
)
select fr.id, 'Private 7–24 m', 'Annual fee', 500.0, 'EUR',
       'Flat', 'MAR published fee', 'https://www.ibc-madeira.com/en/ship-registration-mar/yacht-registration.html', null,
       '2026-07-27', true, 'Yachtworth_Flag_Registry_Base_v1',
       'fee:fd2cc51e8d2e732a1f359567ba649a94b8154364', '{"Amount": "500", "Basis / Formula": "Flat", "Currency": "EUR", "Fee Component": "Annual fee", "Flag": "Madeira (MAR)", "Last Verified": "46230", "Notes": "MAR published fee", "Official Source": "https://www.ibc-madeira.com/en/ship-registration-mar/yacht-registration.html", "Registration Type": "Private 7–24 m"}'::jsonb
  from public.flag_registries fr
 where fr.import_key = 'flag:madeira-mar'
on conflict (import_key) do update set
  registration_type=excluded.registration_type,
  fee_component=excluded.fee_component,
  amount=excluded.amount,
  currency=excluded.currency,
  formula_text=excluded.formula_text,
  notes=excluded.notes,
  official_source_url=excluded.official_source_url,
  last_verified_at=excluded.last_verified_at,
  source_version=excluded.source_version,
  original_row=excluded.original_row,
  updated_at=now();

insert into public.flag_fee_rules (
  flag_registry_id, registration_type, fee_component, amount, currency,
  formula_text, notes, official_source_url, confidence_level, last_verified_at,
  is_active, source_version, import_key, original_row
)
select fr.id, 'Private >24 m', 'Annual fee', null, 'EUR',
       '€500 + €2 per GT', 'Formula', 'https://www.ibc-madeira.com/en/ship-registration-mar/yacht-registration.html', null,
       '2026-07-27', true, 'Yachtworth_Flag_Registry_Base_v1',
       'fee:7106ccf17f8302795516e845ba2e32d153768a16', '{"Amount": "", "Basis / Formula": "€500 + €2 per GT", "Currency": "EUR", "Fee Component": "Annual fee", "Flag": "Madeira (MAR)", "Last Verified": "46230", "Notes": "Formula", "Official Source": "https://www.ibc-madeira.com/en/ship-registration-mar/yacht-registration.html", "Registration Type": "Private >24 m"}'::jsonb
  from public.flag_registries fr
 where fr.import_key = 'flag:madeira-mar'
on conflict (import_key) do update set
  registration_type=excluded.registration_type,
  fee_component=excluded.fee_component,
  amount=excluded.amount,
  currency=excluded.currency,
  formula_text=excluded.formula_text,
  notes=excluded.notes,
  official_source_url=excluded.official_source_url,
  last_verified_at=excluded.last_verified_at,
  source_version=excluded.source_version,
  original_row=excluded.original_row,
  updated_at=now();

insert into public.flag_fee_rules (
  flag_registry_id, registration_type, fee_component, amount, currency,
  formula_text, notes, official_source_url, confidence_level, last_verified_at,
  is_active, source_version, import_key, original_row
)
select fr.id, 'Commercial', 'Initial registration', null, 'EUR',
       '€1,250 fixed + €200 up to 250 GT + €0.75/GT above 250', 'Formula', 'https://www.ibc-madeira.com/en/ship-registration-mar/yacht-registration.html', null,
       '2026-07-27', true, 'Yachtworth_Flag_Registry_Base_v1',
       'fee:daacff0731d86a1a81b137cf3bf0479038dc057e', '{"Amount": "", "Basis / Formula": "€1,250 fixed + €200 up to 250 GT + €0.75/GT above 250", "Currency": "EUR", "Fee Component": "Initial registration", "Flag": "Madeira (MAR)", "Last Verified": "46230", "Notes": "Formula", "Official Source": "https://www.ibc-madeira.com/en/ship-registration-mar/yacht-registration.html", "Registration Type": "Commercial"}'::jsonb
  from public.flag_registries fr
 where fr.import_key = 'flag:madeira-mar'
on conflict (import_key) do update set
  registration_type=excluded.registration_type,
  fee_component=excluded.fee_component,
  amount=excluded.amount,
  currency=excluded.currency,
  formula_text=excluded.formula_text,
  notes=excluded.notes,
  official_source_url=excluded.official_source_url,
  last_verified_at=excluded.last_verified_at,
  source_version=excluded.source_version,
  original_row=excluded.original_row,
  updated_at=now();

insert into public.flag_fee_rules (
  flag_registry_id, registration_type, fee_component, amount, currency,
  formula_text, notes, official_source_url, confidence_level, last_verified_at,
  is_active, source_version, import_key, original_row
)
select fr.id, 'Commercial', 'Annual fee', null, 'EUR',
       '€1,000 fixed + €200 up to 250 GT + €0.75/GT above 250', 'Formula', 'https://www.ibc-madeira.com/en/ship-registration-mar/yacht-registration.html', null,
       '2026-07-27', true, 'Yachtworth_Flag_Registry_Base_v1',
       'fee:c861e5cab356cb6585a52addd96b241f4cbec521', '{"Amount": "", "Basis / Formula": "€1,000 fixed + €200 up to 250 GT + €0.75/GT above 250", "Currency": "EUR", "Fee Component": "Annual fee", "Flag": "Madeira (MAR)", "Last Verified": "46230", "Notes": "Formula", "Official Source": "https://www.ibc-madeira.com/en/ship-registration-mar/yacht-registration.html", "Registration Type": "Commercial"}'::jsonb
  from public.flag_registries fr
 where fr.import_key = 'flag:madeira-mar'
on conflict (import_key) do update set
  registration_type=excluded.registration_type,
  fee_component=excluded.fee_component,
  amount=excluded.amount,
  currency=excluded.currency,
  formula_text=excluded.formula_text,
  notes=excluded.notes,
  official_source_url=excluded.official_source_url,
  last_verified_at=excluded.last_verified_at,
  source_version=excluded.source_version,
  original_row=excluded.original_row,
  updated_at=now();

insert into public.flag_fee_rules (
  flag_registry_id, registration_type, fee_component, amount, currency,
  formula_text, notes, official_source_url, confidence_level, last_verified_at,
  is_active, source_version, import_key, original_row
)
select fr.id, 'Ocean-going commercial', 'Registry maintenance', 300.0, 'EUR',
       'Annual', 'Tonnage tax separate', 'https://www.gov.cy/dms/en/fees-and-charges/', null,
       '2026-07-27', true, 'Yachtworth_Flag_Registry_Base_v1',
       'fee:35f1b4cec019f893047cf6c58508f4aea7827f4a', '{"Amount": "300", "Basis / Formula": "Annual", "Currency": "EUR", "Fee Component": "Registry maintenance", "Flag": "Cyprus", "Last Verified": "46230", "Notes": "Tonnage tax separate", "Official Source": "https://www.gov.cy/dms/en/fees-and-charges/", "Registration Type": "Ocean-going commercial"}'::jsonb
  from public.flag_registries fr
 where fr.import_key = 'flag:cyprus'
on conflict (import_key) do update set
  registration_type=excluded.registration_type,
  fee_component=excluded.fee_component,
  amount=excluded.amount,
  currency=excluded.currency,
  formula_text=excluded.formula_text,
  notes=excluded.notes,
  official_source_url=excluded.official_source_url,
  last_verified_at=excluded.last_verified_at,
  source_version=excluded.source_version,
  original_row=excluded.original_row,
  updated_at=now();

insert into public.flag_fee_rules (
  flag_registry_id, registration_type, fee_component, amount, currency,
  formula_text, notes, official_source_url, confidence_level, last_verified_at,
  is_active, source_version, import_key, original_row
)
select fr.id, 'Private 10–24 m', 'Registration', 990.0, 'EUR',
       'One-year or lifetime option', '2026 private yacht tariff', 'https://www.smsr.sm/private-yacht-price-list/', null,
       '2026-07-27', true, 'Yachtworth_Flag_Registry_Base_v1',
       'fee:40cb3b95864bbc959be025de74f7791aadca7837', '{"Amount": "990", "Basis / Formula": "One-year or lifetime option", "Currency": "EUR", "Fee Component": "Registration", "Flag": "San Marino", "Last Verified": "46230", "Notes": "2026 private yacht tariff", "Official Source": "https://www.smsr.sm/private-yacht-price-list/", "Registration Type": "Private 10–24 m"}'::jsonb
  from public.flag_registries fr
 where fr.import_key = 'flag:san-marino'
on conflict (import_key) do update set
  registration_type=excluded.registration_type,
  fee_component=excluded.fee_component,
  amount=excluded.amount,
  currency=excluded.currency,
  formula_text=excluded.formula_text,
  notes=excluded.notes,
  official_source_url=excluded.official_source_url,
  last_verified_at=excluded.last_verified_at,
  source_version=excluded.source_version,
  original_row=excluded.original_row,
  updated_at=now();

insert into public.flag_fee_rules (
  flag_registry_id, registration_type, fee_component, amount, currency,
  formula_text, notes, official_source_url, confidence_level, last_verified_at,
  is_active, source_version, import_key, original_row
)
select fr.id, 'Private 10–24 m', 'Safety Certificate', 500.0, 'EUR',
       '5 years', 'Lifetime registration option', 'https://www.smsr.sm/private-yacht-price-list/', null,
       '2026-07-27', true, 'Yachtworth_Flag_Registry_Base_v1',
       'fee:d23bfb0d752a2c4411747d6dcd0c511b9019ccb8', '{"Amount": "500", "Basis / Formula": "5 years", "Currency": "EUR", "Fee Component": "Safety Certificate", "Flag": "San Marino", "Last Verified": "46230", "Notes": "Lifetime registration option", "Official Source": "https://www.smsr.sm/private-yacht-price-list/", "Registration Type": "Private 10–24 m"}'::jsonb
  from public.flag_registries fr
 where fr.import_key = 'flag:san-marino'
on conflict (import_key) do update set
  registration_type=excluded.registration_type,
  fee_component=excluded.fee_component,
  amount=excluded.amount,
  currency=excluded.currency,
  formula_text=excluded.formula_text,
  notes=excluded.notes,
  official_source_url=excluded.official_source_url,
  last_verified_at=excluded.last_verified_at,
  source_version=excluded.source_version,
  original_row=excluded.original_row,
  updated_at=now();

insert into public.flag_fee_rules (
  flag_registry_id, registration_type, fee_component, amount, currency,
  formula_text, notes, official_source_url, confidence_level, last_verified_at,
  is_active, source_version, import_key, original_row
)
select fr.id, 'Private 10–24 m', 'Radio licence', 200.0, 'EUR',
       '5 years', 'Call sign and MMSI included', 'https://www.smsr.sm/private-yacht-price-list/', null,
       '2026-07-27', true, 'Yachtworth_Flag_Registry_Base_v1',
       'fee:e03b32db114f4635341ce7affcec5fc4919bbd9e', '{"Amount": "200", "Basis / Formula": "5 years", "Currency": "EUR", "Fee Component": "Radio licence", "Flag": "San Marino", "Last Verified": "46230", "Notes": "Call sign and MMSI included", "Official Source": "https://www.smsr.sm/private-yacht-price-list/", "Registration Type": "Private 10–24 m"}'::jsonb
  from public.flag_registries fr
 where fr.import_key = 'flag:san-marino'
on conflict (import_key) do update set
  registration_type=excluded.registration_type,
  fee_component=excluded.fee_component,
  amount=excluded.amount,
  currency=excluded.currency,
  formula_text=excluded.formula_text,
  notes=excluded.notes,
  official_source_url=excluded.official_source_url,
  last_verified_at=excluded.last_verified_at,
  source_version=excluded.source_version,
  original_row=excluded.original_row,
  updated_at=now();

insert into public.flag_fee_rules (
  flag_registry_id, registration_type, fee_component, amount, currency,
  formula_text, notes, official_source_url, confidence_level, last_verified_at,
  is_active, source_version, import_key, original_row
)
select fr.id, 'Private 10–24 m', 'Mortgage registration', 500.0, 'EUR',
       'Per instrument', '2026 tariff', 'https://www.smsr.sm/private-yacht-price-list/', null,
       '2026-07-27', true, 'Yachtworth_Flag_Registry_Base_v1',
       'fee:f28271d95afc9623d51d4a36d74e07af4d923fbb', '{"Amount": "500", "Basis / Formula": "Per instrument", "Currency": "EUR", "Fee Component": "Mortgage registration", "Flag": "San Marino", "Last Verified": "46230", "Notes": "2026 tariff", "Official Source": "https://www.smsr.sm/private-yacht-price-list/", "Registration Type": "Private 10–24 m"}'::jsonb
  from public.flag_registries fr
 where fr.import_key = 'flag:san-marino'
on conflict (import_key) do update set
  registration_type=excluded.registration_type,
  fee_component=excluded.fee_component,
  amount=excluded.amount,
  currency=excluded.currency,
  formula_text=excluded.formula_text,
  notes=excluded.notes,
  official_source_url=excluded.official_source_url,
  last_verified_at=excluded.last_verified_at,
  source_version=excluded.source_version,
  original_row=excluded.original_row,
  updated_at=now();

insert into public.flag_fee_rules (
  flag_registry_id, registration_type, fee_component, amount, currency,
  formula_text, notes, official_source_url, confidence_level, last_verified_at,
  is_active, source_version, import_key, original_row
)
select fr.id, 'Private 10–24 m', 'Provisional extension', 150.0, 'EUR',
       'Per one-month extension', 'Up to three extensions in cited tariff', 'https://www.smsr.sm/private-yacht-price-list/', null,
       '2026-07-27', true, 'Yachtworth_Flag_Registry_Base_v1',
       'fee:c91621556eebdef783cc4dcda7f39e5a23fce584', '{"Amount": "150", "Basis / Formula": "Per one-month extension", "Currency": "EUR", "Fee Component": "Provisional extension", "Flag": "San Marino", "Last Verified": "46230", "Notes": "Up to three extensions in cited tariff", "Official Source": "https://www.smsr.sm/private-yacht-price-list/", "Registration Type": "Private 10–24 m"}'::jsonb
  from public.flag_registries fr
 where fr.import_key = 'flag:san-marino'
on conflict (import_key) do update set
  registration_type=excluded.registration_type,
  fee_component=excluded.fee_component,
  amount=excluded.amount,
  currency=excluded.currency,
  formula_text=excluded.formula_text,
  notes=excluded.notes,
  official_source_url=excluded.official_source_url,
  last_verified_at=excluded.last_verified_at,
  source_version=excluded.source_version,
  original_row=excluded.original_row,
  updated_at=now();

insert into public.flag_import_runs (filename, file_hash, source_version, completed_at, imported_rows, updated_rows, skipped_rows, failed_rows, errors, imported_by, status, report) values ('2026-07-27 Yachtworth_Flag_Registry_Base_v1.xlsx', '40349cba0b925aeb86a537cda824191739b07ee27bde887899e47176edbb0e62', 'Yachtworth_Flag_Registry_Base_v1', now(), 81, 0, 0, 0, '[]'::jsonb, 'script', 'completed', '{"fees": 32, "file_hash": "40349cba0b925aeb86a537cda824191739b07ee27bde887899e47176edbb0e62", "filename": "2026-07-27 Yachtworth_Flag_Registry_Base_v1.xlsx", "flags": 21, "generated_at": "2026-07-27T18:04:06Z", "source_version": "Yachtworth_Flag_Registry_Base_v1", "sources": 28, "sql_file": "C:\\Users\\Andrey\\Yachtworth\\exports\\flag_advisor\\flag_advisor_import.sql"}'::jsonb);

commit;
