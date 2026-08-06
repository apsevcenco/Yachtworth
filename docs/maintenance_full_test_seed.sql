-- Yachtworth Maintenance Log full demo seed.
-- Run manually in Supabase SQL editor.
-- Change v_user_id if you need to seed another Clerk user.
-- Important: paste this file exactly as-is. Do not add Supabase-generated
-- "ALTER TABLE ... ENABLE ROW LEVEL SECURITY" lines to the bottom of this block.

do $maintenance_seed$
declare
  v_user_id text := 'user_3FRlT9iITWlvXnHsMtLx15uzdAp';
  v_yacht_id uuid;
  v_engine_system uuid;
  v_electrical_system uuid;
  v_safety_system uuid;
  v_port_engine uuid;
  v_generator uuid;
  v_liferaft uuid;
  v_engine_counter uuid;
  v_generator_counter uuid;
  v_plan uuid;
  v_task_overdue uuid;
  v_task_due uuid;
  v_work_order uuid;
  v_closed_work_order uuid;
  v_service_event uuid;
  v_second_service_event uuid;
  v_defect uuid;
  v_verified_defect uuid;
  v_part_filter uuid;
  v_part_belt uuid;
  v_part_impeller uuid;
begin
  select id
    into v_yacht_id
    from public.yachts
   where clerk_user_id = v_user_id
   order by updated_at desc nulls last, created_at desc
   limit 1;

  if v_yacht_id is null then
    raise exception 'No yacht found for clerk_user_id %', v_user_id;
  end if;

  delete from public.maintenance_documents
   where yacht_id = v_yacht_id
     and title like 'TEST PMS - %';

  delete from public.inventory_movements
   where yacht_id = v_yacht_id
     and notes like 'TEST PMS - %';

  delete from public.service_events
   where yacht_id = v_yacht_id
     and service_event_number like 'TEST-PMS-%';

  delete from public.defects
   where yacht_id = v_yacht_id
     and defect_number like 'TEST-PMS-%';

  delete from public.work_order_assets
   where work_order_id in (
     select id from public.work_orders
      where yacht_id = v_yacht_id
        and work_order_number like 'TEST-PMS-%'
   );

  delete from public.work_orders
   where yacht_id = v_yacht_id
     and work_order_number like 'TEST-PMS-%';

  delete from public.maintenance_tasks
   where yacht_id = v_yacht_id
     and idempotency_key like 'test-pms-%';

  delete from public.maintenance_plans
   where yacht_id = v_yacht_id
     and name like 'TEST PMS - %';

  delete from public.spare_parts
   where yacht_id = v_yacht_id
     and name like 'TEST PMS - %';

  delete from public.equipment_assets
   where yacht_id = v_yacht_id
     and external_key like 'test-pms-%';

  delete from public.maintenance_systems
   where yacht_id = v_yacht_id
     and code in ('TEST_PROP', 'TEST_ELEC', 'TEST_SAFE');

  insert into public.maintenance_systems (yacht_id, code, name, description, sort_order, created_by)
  values
    (v_yacht_id, 'TEST_PROP', 'TEST PMS - Propulsion', 'Main engines, gearboxes, exhaust and fuel systems.', 10, v_user_id),
    (v_yacht_id, 'TEST_ELEC', 'TEST PMS - Electrical Power', 'Generators, batteries, chargers and distribution.', 20, v_user_id),
    (v_yacht_id, 'TEST_SAFE', 'TEST PMS - Safety Equipment', 'Life-saving, firefighting and statutory safety items.', 30, v_user_id);

  select id into v_engine_system from public.maintenance_systems where yacht_id = v_yacht_id and code = 'TEST_PROP' limit 1;
  select id into v_electrical_system from public.maintenance_systems where yacht_id = v_yacht_id and code = 'TEST_ELEC' limit 1;
  select id into v_safety_system from public.maintenance_systems where yacht_id = v_yacht_id and code = 'TEST_SAFE' limit 1;

  insert into public.equipment_assets (
    yacht_id, vessel_system_id, asset_type, name, display_name, asset_code,
    manufacturer, model, serial_number, part_number, installation_date,
    criticality, operational_status, condition_status, expected_life,
    replacement_cost, replacement_cost_currency, warranty_start, warranty_end,
    class_relevant, flag_relevant, safety_relevant, environmental_relevant,
    external_key, created_by
  )
  values
    (v_yacht_id, v_engine_system, 'main_engine', 'TEST PMS - Port main engine', 'Port MAN V12 engine', 'ME-P',
     'MAN', 'V12-1650', 'MANP-TEST-2026-001', 'MAN-V12-SERVICE-KIT', current_date - interval '5 years',
     'safety_critical', 'service_due', 'Service due within 30 days', '20 years',
     285000, 'EUR', current_date - interval '5 years', current_date + interval '1 year',
     true, true, true, true, 'test-pms-port-engine', v_user_id),
    (v_yacht_id, v_electrical_system, 'generator', 'TEST PMS - Starboard generator', 'Kohler 55 kW generator', 'GEN-S',
     'Kohler', '55EFOZD', 'KOH-TEST-2026-055', 'KOHLER-FILTER-KIT', current_date - interval '4 years',
     'critical', 'operational', 'Good', '15 years',
     62000, 'EUR', current_date - interval '4 years', current_date + interval '6 months',
     true, false, false, true, 'test-pms-generator', v_user_id),
    (v_yacht_id, v_safety_system, 'liferaft', 'TEST PMS - Liferaft 12 pax', 'SOLAS liferaft 12 persons', 'SAFE-LR',
     'Viking', 'RescYou Pro', 'VIK-TEST-2026-012', 'LR12', current_date - interval '2 years',
     'safety_critical', 'operational', 'Certificate expires soon', '12 years',
     8500, 'EUR', current_date - interval '2 years', current_date + interval '2 years',
     true, true, true, false, 'test-pms-liferaft', v_user_id);

  select id into v_port_engine from public.equipment_assets where yacht_id = v_yacht_id and external_key = 'test-pms-port-engine';
  select id into v_generator from public.equipment_assets where yacht_id = v_yacht_id and external_key = 'test-pms-generator';
  select id into v_liferaft from public.equipment_assets where yacht_id = v_yacht_id and external_key = 'test-pms-liferaft';

  insert into public.equipment_counters (equipment_asset_id, counter_type, unit, current_value, source, last_reading_at, is_primary)
  values
    (v_port_engine, 'engine_hours', 'hours', 1248, 'manual', now() - interval '2 days', true),
    (v_generator, 'running_hours', 'hours', 3187, 'manual', now() - interval '2 days', true);

  select id into v_engine_counter from public.equipment_counters where equipment_asset_id = v_port_engine and is_primary limit 1;
  select id into v_generator_counter from public.equipment_counters where equipment_asset_id = v_generator and is_primary limit 1;

  insert into public.counter_readings (counter_id, value, reading_at, reading_source, entered_by, notes)
  values
    (v_engine_counter, 1248, now() - interval '2 days', 'manual', v_user_id, 'TEST PMS - port engine reading'),
    (v_generator_counter, 3187, now() - interval '2 days', 'manual', v_user_id, 'TEST PMS - generator reading');

  insert into public.maintenance_plans (
    yacht_id, equipment_asset_id, name, description, plan_type, priority,
    criticality, start_date, assigned_to_role, verification_required, created_by
  )
  values (
    v_yacht_id, v_port_engine, 'TEST PMS - Main engine 250h service',
    'Annual or 250 engine-hour preventive service for the port main engine.',
    'preventive', 'high', 'safety_critical', current_date - interval '1 year',
    'engineer', true, v_user_id
  )
  returning id into v_plan;

  insert into public.maintenance_intervals (
    maintenance_plan_id, interval_type, calendar_value, calendar_unit,
    counter_id, counter_interval, due_rule, warning_threshold, warning_unit,
    next_due_at, next_due_counter_value
  )
  values (
    v_plan, 'combined', 12, 'months', v_engine_counter, 250,
    'whichever_occurs_first', 30, 'days', now() - interval '5 days', 1250
  );

  insert into public.maintenance_tasks (
    yacht_id, equipment_asset_id, maintenance_plan_id, title, description,
    due_at, due_counter_value, status, priority, assigned_to_role, idempotency_key
  )
  values
    (v_yacht_id, v_port_engine, v_plan, 'TEST PMS - Port engine 250h service overdue',
     'Replace oil, fuel filters, impellers; inspect belts, mounts, turbo and exhaust lagging.',
     now() - interval '5 days', 1250, 'overdue', 'high', 'engineer', 'test-pms-task-overdue'),
    (v_yacht_id, v_liferaft, null, 'TEST PMS - Liferaft certificate renewal due',
     'Renew liferaft annual service certificate before next charter departure.',
     now() + interval '18 days', null, 'due', 'high', 'captain', 'test-pms-task-due');

  select id into v_task_overdue from public.maintenance_tasks where yacht_id = v_yacht_id and idempotency_key = 'test-pms-task-overdue';
  select id into v_task_due from public.maintenance_tasks where yacht_id = v_yacht_id and idempotency_key = 'test-pms-task-due';

  insert into public.work_orders (
    yacht_id, work_order_number, title, description, work_order_type, status,
    priority, risk_level, safety_critical, requested_by, assigned_to_user_id,
    planned_start, planned_end, estimated_labour_hours, estimated_cost, currency,
    downtime_expected, permit_required, risk_assessment_required, lockout_tagout_required
  )
  values (
    v_yacht_id, 'TEST-PMS-WO-001', 'TEST PMS - Port engine service and belt replacement',
    'Carry out overdue 250h service and replace alternator belt showing visible cracking.',
    'preventive_maintenance', 'scheduled', 'high', 'medium', true, v_user_id, 'Chief Engineer',
    now() + interval '2 days', now() + interval '3 days', 8, 4200, 'EUR',
    true, false, true, true
  )
  returning id into v_work_order;

  insert into public.work_order_assets (work_order_id, equipment_asset_id, relationship, notes)
  values (v_work_order, v_port_engine, 'primary', 'TEST PMS - linked to port main engine');

  insert into public.work_orders (
    yacht_id, work_order_number, title, description, work_order_type, status,
    priority, risk_level, safety_critical, requested_by, approved_by, assigned_to_user_id,
    planned_start, planned_end, actual_start, actual_end,
    estimated_labour_hours, actual_labour_hours, estimated_cost, actual_cost, currency,
    downtime_expected, permit_required, risk_assessment_required, lockout_tagout_required,
    quotation_id, purchase_order_id, completion_summary, verification_notes, closed_by, closed_at
  )
  values (
    v_yacht_id, 'TEST-PMS-WO-002', 'TEST PMS - Generator service completed and closed',
    'Closed work order used to verify completed maintenance history and PDF output.',
    'preventive_maintenance', 'closed', 'normal', 'low', false, v_user_id, 'Captain', 'Chief Engineer',
    now() - interval '26 days', now() - interval '24 days', now() - interval '25 days', now() - interval '24 days',
    6, 5.5, 2100, 1850, 'EUR',
    false, false, false, false,
    'TEST-PMS-Q-002', 'TEST-PMS-PO-002',
    'Generator 3000h service completed; load test passed.',
    'Voltage, frequency and coolant readings verified after service.',
    'Captain', now() - interval '24 days'
  )
  returning id into v_closed_work_order;

  insert into public.work_order_assets (work_order_id, equipment_asset_id, relationship, notes)
  values (v_closed_work_order, v_generator, 'primary', 'TEST PMS - closed generator work order');

  update public.maintenance_tasks
     set work_order_id = v_work_order, status = 'assigned', updated_at = now()
   where id = v_task_overdue;

  insert into public.defects (
    yacht_id, equipment_asset_id, defect_number, title, description, severity,
    priority, status, operational_limitation, safety_impact, reported_by,
    counter_value_at_report, detected_during_type, temporary_repair,
    temporary_repair_expiry, work_order_id, photo_urls
  )
  values (
    v_yacht_id, v_port_engine, 'TEST-PMS-DEF-001', 'TEST PMS - Port engine alternator belt cracking',
    'Fine cracking observed on the port engine alternator belt during routine machinery space inspection.',
    'high', 'high', 'repair_scheduled',
    'Avoid extended high-load operation until belt is replaced.',
    'Potential loss of alternator output if belt fails.',
    v_user_id, 1248, 'inspection',
    'Belt tension checked and spare belt staged onboard.',
    now() + interval '14 days', v_work_order,
    '["https://images.unsplash.com/photo-1581091226825-a6a2a5aee158"]'::jsonb
  )
  returning id into v_defect;

  insert into public.defects (
    yacht_id, equipment_asset_id, defect_number, title, description, severity,
    priority, status, operational_limitation, safety_impact, environmental_impact,
    reported_by, reported_at, counter_value_at_report, detected_during_type,
    temporary_repair, temporary_repair_expiry, work_order_id,
    resolved_at, verified_by, verified_at, photo_urls
  )
  values (
    v_yacht_id, v_generator, 'TEST-PMS-DEF-002', 'TEST PMS - Generator seawater pump seal staining',
    'Minor salt staining was observed at the generator seawater pump seal before service.',
    'low', 'normal', 'verified',
    'No operational limitation after cleaning and retest.',
    'No safety impact after verification.',
    'Minor local salt residue only.',
    v_user_id, now() - interval '26 days', 3150, 'service_event',
    'Pump base cleaned and monitored during load test.',
    now() - interval '20 days', v_closed_work_order,
    now() - interval '24 days', 'Chief Engineer', now() - interval '24 days',
    '["https://images.unsplash.com/photo-1581092160562-40aa08e78837"]'::jsonb
  )
  returning id into v_verified_defect;

  insert into public.service_events (
    yacht_id, equipment_asset_id, work_order_id, maintenance_task_id,
    service_event_number, service_type, title, started_at, completed_at,
    counter_value_before, counter_value_after, work_performed, technician_id,
    authorised_dealer, labour_hours, downtime_hours, measurements_before,
    measurements_after, parts_used, fluids_used, test_result, cost, currency,
    next_due_at, next_due_counter_value, approved_by, approved_at, signed_off_by,
    signed_off_at, created_by
  )
  values (
    v_yacht_id, v_generator, null, null,
    'TEST-PMS-SE-001', 'generator_service', 'TEST PMS - Generator 3000h service completed',
    now() - interval '25 days', now() - interval '24 days',
    3150, 3187,
    'Oil and fuel filters replaced; coolant concentration checked; seawater pump inspected; generator run under load with stable voltage and frequency.',
    'Authorized Kohler technician', true, 5.5, 0,
    '{"coolant_pct": 38, "oil_pressure_bar": 4.1}'::jsonb,
    '{"coolant_pct": 42, "oil_pressure_bar": 4.3}'::jsonb,
    '[{"part":"Oil filter","qty":1},{"part":"Fuel filter","qty":2}]'::jsonb,
    '[{"fluid":"Engine oil 15W40","qty_l":9}]'::jsonb,
    'Pass', 1850, 'EUR',
    now() + interval '11 months', 3437,
    'Captain', now() - interval '24 days', 'Chief Engineer', now() - interval '24 days', v_user_id
  )
  returning id into v_service_event;

  insert into public.service_events (
    yacht_id, equipment_asset_id, work_order_id, maintenance_task_id,
    service_event_number, service_type, title, started_at, completed_at,
    counter_value_before, counter_value_after, cycle_value_before, cycle_value_after,
    defect_description, root_cause_summary, work_performed, technician_id,
    authorised_dealer, labour_hours, downtime_hours, measurements_before,
    measurements_after, parts_used, fluids_used, test_result, cost, currency,
    next_due_at, next_due_counter_value, approved_by, approved_at, signed_off_by,
    signed_off_at, created_by
  )
  values (
    v_yacht_id, v_port_engine, v_work_order, v_task_overdue,
    'TEST-PMS-SE-002', 'inspection', 'TEST PMS - Port engine pre-service inspection',
    now() - interval '3 days', now() - interval '3 days',
    1248, 1248, null, null,
    'Alternator belt cracking observed before service.',
    'Age-related belt cracking; no pulley damage observed.',
    'Visual inspection completed; belt replacement added to the open work order; oil and filter service remains pending.',
    'Chief Engineer', true, 1.2, 0,
    '{"belt_condition":"cracked","oil_level":"normal","coolant_leaks":"none"}'::jsonb,
    '{"belt_tension":"checked","spare_belt":"staged","leaks":"none"}'::jsonb,
    '[]'::jsonb,
    '[]'::jsonb,
    'Requires follow-up', 0, 'EUR',
    now() - interval '5 days', 1250,
    'Captain', now() - interval '3 days', 'Chief Engineer', now() - interval '3 days', v_user_id
  )
  returning id into v_second_service_event;

  insert into public.service_event_corrections (
    service_event_id, field_name, previous_value, corrected_value,
    correction_reason, requested_by, approved_by
  )
  values (
    v_service_event, 'cost', '2100'::jsonb, '1850'::jsonb,
    'TEST PMS - supplier invoice reconciled after initial estimate.',
    v_user_id, 'Captain'
  );

  insert into public.spare_parts (
    yacht_id, equipment_asset_id, part_number, name, manufacturer,
    compatible_asset_ids, quantity_on_hand, minimum_stock, reorder_level,
    unit, unit_cost, currency, expiry_date, notes
  )
  values
    (v_yacht_id, v_port_engine, 'MAN-OIL-FLT-001', 'TEST PMS - MAN oil filter',
     'MAN', array[v_port_engine], 2, 4, 6, 'pcs', 48, 'EUR', null,
     'Minimum stock alert demo: reorder before next engine service.'),
    (v_yacht_id, v_port_engine, 'MAN-BELT-ALT-001', 'TEST PMS - Alternator belt',
     'MAN', array[v_port_engine], 1, 1, 2, 'pcs', 126, 'EUR', current_date - interval '10 days',
     'Expired stock demo: replace onboard spare.'),
    (v_yacht_id, v_generator, 'KOH-IMP-055', 'TEST PMS - Generator raw water impeller',
     'Kohler', array[v_generator], 3, 2, 3, 'pcs', 92, 'EUR', current_date + interval '16 months',
     'Normal stock item linked to completed generator service.');

  select id into v_part_filter from public.spare_parts where yacht_id = v_yacht_id and part_number = 'MAN-OIL-FLT-001';
  select id into v_part_belt from public.spare_parts where yacht_id = v_yacht_id and part_number = 'MAN-BELT-ALT-001';
  select id into v_part_impeller from public.spare_parts where yacht_id = v_yacht_id and part_number = 'KOH-IMP-055';

  insert into public.inventory_movements (
    yacht_id, spare_part_id, work_order_id, service_event_id, movement_type,
    quantity, previous_quantity, next_quantity, notes, created_by
  )
  values
    (v_yacht_id, v_part_filter, v_work_order, null, 'reserve', 2, 4, 2, 'TEST PMS - reserved for port engine service', v_user_id),
    (v_yacht_id, v_part_belt, v_work_order, null, 'consume', 1, 1, 0, 'TEST PMS - belt allocated to scheduled repair', v_user_id),
    (v_yacht_id, v_part_impeller, v_closed_work_order, v_service_event, 'consume', 1, 4, 3, 'TEST PMS - impeller consumed during generator service', v_user_id);

  insert into public.maintenance_documents (
    yacht_id, equipment_asset_id, work_order_id, service_event_id, defect_id,
    category, title, file_url, mime_type, expires_at, is_private, version, uploaded_by
  )
  values
    (v_yacht_id, v_liferaft, null, null, null,
     'certificate', 'TEST PMS - Liferaft service certificate expiring',
     'https://example.com/test-liferaft-certificate.pdf', 'application/pdf',
     now() + interval '18 days', true, 1, v_user_id),
    (v_yacht_id, v_port_engine, v_work_order, null, v_defect,
     'photo', 'TEST PMS - Port engine belt defect photo',
     'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158', 'image/jpeg',
     null, true, 1, v_user_id),
    (v_yacht_id, v_generator, null, v_service_event, null,
     'invoice', 'TEST PMS - Generator service invoice',
     'https://example.com/test-generator-service-invoice.pdf', 'application/pdf',
     null, true, 1, v_user_id),
    (v_yacht_id, v_generator, v_closed_work_order, v_service_event, v_verified_defect,
     'service_report', 'TEST PMS - Generator load-bank service report',
     'https://example.com/test-generator-load-bank-report.pdf', 'application/pdf',
     null, true, 1, v_user_id),
    (v_yacht_id, v_port_engine, v_work_order, v_second_service_event, v_defect,
     'photo', 'TEST PMS - Port engine inspection photo',
     'https://images.unsplash.com/photo-1516937941344-00b4e0337589', 'image/jpeg',
     null, true, 1, v_user_id),
    (v_yacht_id, null, null, null, null,
     'radio_license', 'TEST PMS - Radio licence stored in bridge cabinet',
     'https://example.com/test-radio-license.pdf', 'application/pdf',
     now() + interval '10 months', true, 1, v_user_id);

  raise notice 'Maintenance full test seed completed for yacht % and user %', v_yacht_id, v_user_id;
end $maintenance_seed$;
