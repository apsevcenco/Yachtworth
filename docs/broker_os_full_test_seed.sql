-- Yachtworth Broker OS full test seed.
-- Safe to re-run. It deletes only records created by this seed marker.

do $$
declare
  v_user_id text := 'user_3FRlT9iITWlvXnHsMtLx15uzdAp';
  v_buyer_contact uuid;
  v_seller_contact uuid;
  v_charter_contact uuid;
  v_flag_contact uuid;
  v_survey_contact uuid;
  v_buyer_case uuid;
  v_seller_case uuid;
  v_charter_case uuid;
  v_flag_case uuid;
  v_survey_case uuid;
begin
  delete from public.broker_cases
   where clerk_user_id = v_user_id
     and notes like '[BROKER_OS_TEST_SEED]%';

  delete from public.broker_contacts
   where clerk_user_id = v_user_id
     and source = 'broker_os_seed';

  insert into public.broker_contacts (
    clerk_user_id, full_name, email, phone, whatsapp, country, citizenship, residency,
    languages, preferred_channel, relationship_owner, relationship_type, trust_level,
    source, notes
  )
  values (
    v_user_id, 'TEST Broker OS - James Harrington', 'james.harrington@example.com',
    '+44 7700 900101', '+44 7700 900101', 'United Kingdom', 'United Kingdom',
    'Monaco', '["English","French"]'::jsonb, 'whatsapp', 'Andrey',
    'buyer', 'warm', 'broker_os_seed',
    'Looking for a 30-35m Mediterranean family yacht with strong resale profile.'
  )
  returning id into v_buyer_contact;

  insert into public.broker_contacts (
    clerk_user_id, full_name, email, phone, whatsapp, country, citizenship, residency,
    languages, preferred_channel, relationship_owner, relationship_type, trust_level,
    source, notes
  )
  values (
    v_user_id, 'TEST Broker OS - Lucia Moretti', 'lucia.moretti@example.com',
    '+39 348 000 1200', '+39 348 000 1200', 'Italy', 'Italy',
    'Italy', '["Italian","English"]'::jsonb, 'email', 'Andrey',
    'seller', 'trusted', 'broker_os_seed',
    'Owner representative for a central agency sale mandate.'
  )
  returning id into v_seller_contact;

  insert into public.broker_contacts (
    clerk_user_id, full_name, email, phone, whatsapp, country, citizenship, residency,
    languages, preferred_channel, relationship_owner, relationship_type, trust_level,
    source, notes
  )
  values (
    v_user_id, 'TEST Broker OS - Charter Family Office', 'charter.office@example.com',
    '+33 6 00 00 00 31', '+33 6 00 00 00 31', 'France', 'France',
    'France', '["French","English"]'::jsonb, 'phone', 'Andrey',
    'charterer', 'vip', 'broker_os_seed',
    'Family office requests two-week West Med charter with strong crew and water toys.'
  )
  returning id into v_charter_contact;

  insert into public.broker_contacts (
    clerk_user_id, full_name, email, phone, whatsapp, country, citizenship, residency,
    languages, preferred_channel, relationship_owner, relationship_type, trust_level,
    source, notes
  )
  values (
    v_user_id, 'TEST Broker OS - Meridian Yacht Counsel', 'registry@meridian-counsel.example',
    '+356 2100 0000', '+356 2100 0000', 'Malta', 'Malta',
    'Malta', '["English"]'::jsonb, 'email', 'Andrey',
    'lawyer', 'trusted', 'broker_os_seed',
    'Registry counsel for Malta/Cayman comparison and commercial charter setup.'
  )
  returning id into v_flag_contact;

  insert into public.broker_contacts (
    clerk_user_id, full_name, email, phone, whatsapp, country, citizenship, residency,
    languages, preferred_channel, relationship_owner, relationship_type, trust_level,
    source, notes
  )
  values (
    v_user_id, 'TEST Broker OS - Captain Daniel Reed', 'captain.reed@example.com',
    '+34 600 000 500', '+34 600 000 500', 'Spain', 'United Kingdom',
    'Spain', '["English","Spanish"]'::jsonb, 'whatsapp', 'Andrey',
    'captain', 'warm', 'broker_os_seed',
    'Captain coordinating pre-purchase survey, sea trial and defect follow-up.'
  )
  returning id into v_survey_contact;

  insert into public.broker_cases (
    clerk_user_id, contact_id, title, case_type, stage, lead_score, status, owner_name,
    budget_min_eur, budget_max_eur, loa_min_m, loa_max_m, timeline,
    preferred_regions, mandatory_requirements, preferred_requirements,
    acceptable_compromises, rejected_characteristics, next_action, next_action_due,
    last_meaningful_contact_at, risk_level, risk_reason, expected_commission_eur,
    close_probability, forecast_close_date, notes
  )
  values (
    v_user_id, v_buyer_contact, 'TEST Broker OS - Buyer Search 30-35m West Med',
    'buyer_inquiry', 'qualified', 'A', 'active', 'James Harrington',
    8500000, 13500000, 30, 35, 'Purchase before Monaco Yacht Show',
    '["South of France","Italy","Balearics"]'::jsonb,
    '["EU VAT paid preferred","5 cabins","stabilizers at anchor","commercial compliance optional"]'::jsonb,
    '["recent refit","low engine hours","strong charter potential"]'::jsonb,
    '["older build if class and maintenance are excellent"]'::jsonb,
    '["high fuel burn","major paint work due","unclear title chain"]'::jsonb,
    'Send shortlist with three verified candidates', current_date - interval '1 day',
    now() - interval '9 days', 'high',
    'Client is motivated but shortlist is overdue and competitors are active.',
    275000, 65, current_date + interval '45 days',
    '[BROKER_OS_TEST_SEED] Buyer case for pipeline, overdue follow-up and high-risk dashboard.'
  )
  returning id into v_buyer_case;

  insert into public.broker_cases (
    clerk_user_id, contact_id, title, case_type, stage, lead_score, status, owner_name,
    budget_min_eur, budget_max_eur, loa_min_m, loa_max_m, timeline,
    preferred_regions, mandatory_requirements, preferred_requirements,
    acceptable_compromises, rejected_characteristics, next_action, next_action_due,
    last_meaningful_contact_at, risk_level, risk_reason, expected_commission_eur,
    close_probability, forecast_close_date, notes
  )
  values (
    v_user_id, v_seller_contact, 'TEST Broker OS - Seller Mandate 42m Tri-deck',
    'seller_mandate', 'proposal', 'B', 'active', 'Lucia Moretti',
    17500000, 19000000, 42, 42, 'Prepare mandate package this month',
    '["Monaco","Italy","Global brokerage network"]'::jsonb,
    '["valuation range","photo package","central agency terms","confidential owner handling"]'::jsonb,
    '["off-market teaser","qualified buyer list","VAT position summary"]'::jsonb,
    '["soft launch before full campaign"]'::jsonb,
    '["public listing before owner approval"]'::jsonb,
    'Review draft CA agreement with owner representative', current_date,
    now() - interval '2 days', 'medium',
    'Owner expects premium asking price; valuation evidence must be strong.',
    380000, 45, current_date + interval '75 days',
    '[BROKER_OS_TEST_SEED] Seller mandate case for proposal stage.'
  )
  returning id into v_seller_case;

  insert into public.broker_cases (
    clerk_user_id, contact_id, title, case_type, stage, lead_score, status, owner_name,
    budget_min_eur, budget_max_eur, loa_min_m, loa_max_m, timeline,
    preferred_regions, mandatory_requirements, preferred_requirements,
    acceptable_compromises, rejected_characteristics, next_action, next_action_due,
    last_meaningful_contact_at, risk_level, risk_reason, expected_commission_eur,
    close_probability, forecast_close_date, notes
  )
  values (
    v_user_id, v_charter_contact, 'TEST Broker OS - August West Med Charter',
    'charter_inquiry', 'negotiation', 'A', 'active', 'Charter Family Office',
    420000, 650000, 40, 55, 'Two weeks in August',
    '["Corsica","Sardinia","Amalfi Coast"]'::jsonb,
    '["excellent chef","strong water toys","child-friendly crew","zero smoking policy"]'::jsonb,
    '["beach club","newer interior","Jacuzzi"]'::jsonb,
    '["split itinerary if yacht availability requires"]'::jsonb,
    '["poor crew references","limited stabilisation"]'::jsonb,
    'Confirm APA and final preference list', current_date + interval '2 days',
    now() - interval '1 day', 'low',
    null, 72000, 80, current_date + interval '14 days',
    '[BROKER_OS_TEST_SEED] Charter inquiry case for negotiation stage.'
  )
  returning id into v_charter_case;

  insert into public.broker_cases (
    clerk_user_id, contact_id, title, case_type, stage, lead_score, status, owner_name,
    budget_min_eur, budget_max_eur, loa_min_m, loa_max_m, timeline,
    preferred_regions, mandatory_requirements, preferred_requirements,
    acceptable_compromises, rejected_characteristics, next_action, next_action_due,
    last_meaningful_contact_at, risk_level, risk_reason, expected_commission_eur,
    close_probability, forecast_close_date, notes
  )
  values (
    v_user_id, v_flag_contact, 'TEST Broker OS - Flag Registration Advisory 38m Commercial',
    'flag_registration', 'new_inquiry', 'B', 'active', 'Meridian Yacht Counsel',
    null, null, 38, 38, 'Decision before purchase completion',
    '["Malta","Cayman Islands","Madeira"]'::jsonb,
    '["commercial charter in France and Italy","mortgage registration","bank acceptance"]'::jsonb,
    '["EU operation friendly","fast provisional registration"]'::jsonb,
    '["temporary registration if permanent package takes longer"]'::jsonb,
    '["unclear VAT position","weak insurer acceptance"]'::jsonb,
    null, null, null, 'medium',
    'Waiting for owner nationality and company structure.',
    18000, 25, current_date + interval '30 days',
    '[BROKER_OS_TEST_SEED] Flag registration case with no next action to test filter.'
  )
  returning id into v_flag_case;

  insert into public.broker_cases (
    clerk_user_id, contact_id, title, case_type, stage, lead_score, status, owner_name,
    budget_min_eur, budget_max_eur, loa_min_m, loa_max_m, timeline,
    preferred_regions, mandatory_requirements, preferred_requirements,
    acceptable_compromises, rejected_characteristics, next_action, next_action_due,
    last_meaningful_contact_at, risk_level, risk_reason, expected_commission_eur,
    close_probability, forecast_close_date, notes
  )
  values (
    v_user_id, v_survey_contact, 'TEST Broker OS - Pre-purchase Survey Follow-up',
    'survey', 'closing', 'C', 'paused', 'Captain Daniel Reed',
    null, null, 27, 27, 'Survey report review this week',
    '["Spain","Balearics"]'::jsonb,
    '["defect list","engine hours verification","sea trial notes","insurance critical items"]'::jsonb,
    '["photo evidence","repair estimates"]'::jsonb,
    '["minor cosmetic findings accepted"]'::jsonb,
    '["unresolved shaft vibration","missing title documents"]'::jsonb,
    'Review class and engine service documents', current_date + interval '7 days',
    now() - interval '12 days', 'high',
    'Paused pending documents; stale contact and technical risk remain.',
    9500, 35, current_date + interval '21 days',
    '[BROKER_OS_TEST_SEED] Survey related case for paused/stale/high-risk testing.'
  )
  returning id into v_survey_case;

  insert into public.broker_tasks (clerk_user_id, case_id, contact_id, title, detail, due_date, priority, status)
  values
    (v_user_id, v_buyer_case, v_buyer_contact, 'Send buyer shortlist', 'Include three candidates with asking price, VAT status, comparable evidence and inspection notes.', current_date - interval '1 day', 'urgent', 'open'),
    (v_user_id, v_seller_case, v_seller_contact, 'Review CA agreement', 'Prepare commercial terms and exclusions for owner approval.', current_date, 'high', 'open'),
    (v_user_id, v_charter_case, v_charter_contact, 'Confirm APA and preference list', 'Check food, children, pets, smoking policy and embarkation time.', current_date + interval '2 days', 'normal', 'open'),
    (v_user_id, v_survey_case, v_survey_contact, 'Request engine service records', 'Ask captain for last service invoices, generator hours and oil analysis.', current_date + interval '7 days', 'high', 'open'),
    (v_user_id, v_flag_case, v_flag_contact, 'Collect owner structure details', 'Need owner nationality, company jurisdiction, mortgage bank and charter area.', null, 'normal', 'open');

  insert into public.broker_activity (clerk_user_id, case_id, contact_id, activity_type, channel, subject, body, happened_at)
  values
    (v_user_id, v_buyer_case, v_buyer_contact, 'call', 'phone', 'Buyer qualification call', 'Client confirmed preference for 30-35m, low-maintenance West Med yacht with family layout.', now() - interval '9 days'),
    (v_user_id, v_seller_case, v_seller_contact, 'email', 'email', 'Valuation evidence requested', 'Asked owner representative to approve valuation range and provide refit invoices.', now() - interval '2 days'),
    (v_user_id, v_charter_case, v_charter_contact, 'meeting', 'meeting', 'Charter preferences', 'Family office confirmed Corsica/Sardinia preference and strong chef requirement.', now() - interval '1 day'),
    (v_user_id, v_flag_case, v_flag_contact, 'note', 'note', 'Registry route', 'Initial analysis suggests Malta or Cayman depending on VAT and charter plan.', now() - interval '3 days'),
    (v_user_id, v_survey_case, v_survey_contact, 'whatsapp', 'whatsapp', 'Survey documents pending', 'Captain will send engine records and class documentation when received from management.', now() - interval '12 days');
end $$;
