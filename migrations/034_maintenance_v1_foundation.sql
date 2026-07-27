-- Yachtworth Maintenance V1 foundation.
-- PMS / CMMS data model linked to existing public.yachts records.

create table if not exists public.maintenance_system_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text not null unique,
  category text not null default 'technical',
  parent_code text,
  description text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.maintenance_systems (
  id uuid primary key default gen_random_uuid(),
  yacht_id uuid not null references public.yachts(id) on delete cascade,
  parent_system_id uuid references public.maintenance_systems(id) on delete set null,
  name text not null,
  code text,
  description text,
  category text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (yacht_id, code)
);

create index if not exists maintenance_systems_yacht_idx
  on public.maintenance_systems (yacht_id, is_active, sort_order);

create table if not exists public.equipment_locations (
  id uuid primary key default gen_random_uuid(),
  yacht_id uuid not null references public.yachts(id) on delete cascade,
  parent_location_id uuid references public.equipment_locations(id) on delete set null,
  name text not null,
  deck text,
  compartment text,
  zone text,
  shelf text,
  notes text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists equipment_locations_yacht_idx
  on public.equipment_locations (yacht_id, sort_order);

create table if not exists public.maintenance_vendors (
  id uuid primary key default gen_random_uuid(),
  yacht_id uuid references public.yachts(id) on delete cascade,
  name text not null,
  vendor_type text,
  contact_name text,
  email text,
  phone text,
  website text,
  authorised_brands text[] not null default '{}',
  service_categories text[] not null default '{}',
  notes text,
  rating integer,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists maintenance_vendors_yacht_idx
  on public.maintenance_vendors (yacht_id, is_active, name);

create table if not exists public.equipment_assets (
  id uuid primary key default gen_random_uuid(),
  yacht_id uuid not null references public.yachts(id) on delete cascade,
  vessel_system_id uuid references public.maintenance_systems(id) on delete set null,
  parent_asset_id uuid references public.equipment_assets(id) on delete set null,
  asset_type text,
  name text not null,
  display_name text,
  asset_code text,
  manufacturer text,
  model text,
  serial_number text,
  part_number text,
  build_date date,
  installation_date date,
  commissioning_date date,
  location_id uuid references public.equipment_locations(id) on delete set null,
  criticality text not null default 'normal',
  operational_status text not null default 'operational',
  condition_status text,
  ownership_status text,
  expected_life text,
  replacement_cost numeric,
  replacement_cost_currency text,
  supplier_id uuid references public.maintenance_vendors(id) on delete set null,
  service_dealer_id uuid references public.maintenance_vendors(id) on delete set null,
  warranty_start date,
  warranty_end date,
  warranty_hours_limit numeric,
  class_relevant boolean not null default false,
  flag_relevant boolean not null default false,
  safety_relevant boolean not null default false,
  environmental_relevant boolean not null default false,
  photo_urls jsonb not null default '[]'::jsonb,
  document_urls jsonb not null default '[]'::jsonb,
  sync_status text not null default 'synced',
  external_key text,
  is_active boolean not null default true,
  retired_at timestamptz,
  retirement_reason text,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint equipment_assets_criticality_check check (criticality in ('low','normal','important','critical','safety_critical')),
  constraint equipment_assets_operational_status_check check (operational_status in ('operational','operational_with_limitations','service_due','maintenance_in_progress','unavailable','laid_up','decommissioned','replaced')),
  constraint equipment_assets_sync_status_check check (sync_status in ('local_draft','pending_upload','syncing','synced','conflict','failed'))
);

create index if not exists equipment_assets_yacht_idx
  on public.equipment_assets (yacht_id, is_active, operational_status, criticality);
create index if not exists equipment_assets_system_idx
  on public.equipment_assets (vessel_system_id, parent_asset_id);
create unique index if not exists equipment_assets_external_key_uidx
  on public.equipment_assets (yacht_id, external_key)
  where external_key is not null;
create index if not exists equipment_assets_serial_warning_idx
  on public.equipment_assets (yacht_id, lower(manufacturer), lower(serial_number))
  where serial_number is not null and is_active = true;

create table if not exists public.equipment_counters (
  id uuid primary key default gen_random_uuid(),
  equipment_asset_id uuid not null references public.equipment_assets(id) on delete cascade,
  counter_type text not null,
  unit text not null default 'hours',
  current_value numeric not null default 0,
  source text not null default 'manual',
  source_device_id text,
  last_reading_at timestamptz,
  is_primary boolean not null default false,
  reset_policy text not null default 'correction_required',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint equipment_counters_type_check check (counter_type in ('running_hours','engine_hours','operating_hours','starts','cycles','launches','charge_cycles','distance','custom'))
);

create index if not exists equipment_counters_asset_idx
  on public.equipment_counters (equipment_asset_id, counter_type, is_primary);

create table if not exists public.counter_readings (
  id uuid primary key default gen_random_uuid(),
  counter_id uuid not null references public.equipment_counters(id) on delete cascade,
  value numeric not null,
  reading_at timestamptz not null default now(),
  reading_source text not null default 'manual',
  entered_by text,
  work_order_id uuid,
  service_event_id uuid,
  correction_of_reading_id uuid references public.counter_readings(id) on delete set null,
  correction_reason text,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists counter_readings_counter_idx
  on public.counter_readings (counter_id, reading_at desc);

create table if not exists public.asset_relationships (
  source_asset_id uuid not null references public.equipment_assets(id) on delete cascade,
  target_asset_id uuid not null references public.equipment_assets(id) on delete cascade,
  relationship_type text not null,
  notes text,
  created_at timestamptz not null default now(),
  primary key (source_asset_id, target_asset_id, relationship_type)
);

create table if not exists public.maintenance_templates (
  id uuid primary key default gen_random_uuid(),
  manufacturer text,
  equipment_model text,
  asset_type text,
  title text not null,
  description text,
  source_type text,
  source_document_id uuid,
  source_manual_name text,
  source_manual_revision text,
  source_page text,
  effective_date date,
  verification_status text not null default 'draft',
  approved_by text,
  approved_at timestamptz,
  version text not null default '1',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint maintenance_templates_verification_check check (verification_status in ('draft','AI_proposed','technician_reviewed','manufacturer_verified','admin_approved','superseded'))
);

create table if not exists public.maintenance_template_tasks (
  id uuid primary key default gen_random_uuid(),
  maintenance_template_id uuid not null references public.maintenance_templates(id) on delete cascade,
  title text not null,
  instructions text,
  task_type text,
  estimated_duration numeric,
  estimated_crew integer,
  required_skills text[] not null default '{}',
  safety_notes text,
  permit_required boolean not null default false,
  shutdown_required boolean not null default false,
  test_required boolean not null default false,
  measurement_required boolean not null default false,
  source_reference text,
  sort_order integer not null default 0
);

create table if not exists public.maintenance_plans (
  id uuid primary key default gen_random_uuid(),
  yacht_id uuid not null references public.yachts(id) on delete cascade,
  equipment_asset_id uuid not null references public.equipment_assets(id) on delete cascade,
  maintenance_template_id uuid references public.maintenance_templates(id) on delete set null,
  name text not null,
  description text,
  plan_type text not null default 'custom',
  priority text not null default 'normal',
  criticality text not null default 'normal',
  start_date date not null default current_date,
  effective_from_counter_value numeric,
  assigned_to_role text,
  verification_required boolean not null default true,
  active boolean not null default true,
  suspended_at timestamptz,
  suspended_reason text,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists maintenance_plans_asset_idx
  on public.maintenance_plans (equipment_asset_id, active, priority);

create table if not exists public.maintenance_intervals (
  id uuid primary key default gen_random_uuid(),
  maintenance_plan_id uuid not null references public.maintenance_plans(id) on delete cascade,
  interval_type text not null,
  calendar_value integer,
  calendar_unit text,
  counter_id uuid references public.equipment_counters(id) on delete set null,
  counter_interval numeric,
  cycle_interval numeric,
  due_rule text not null default 'whichever_occurs_first',
  warning_threshold numeric,
  warning_unit text,
  grace_threshold numeric,
  grace_unit text,
  last_completed_at timestamptz,
  last_completed_counter_value numeric,
  next_due_at timestamptz,
  next_due_counter_value numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint maintenance_intervals_type_check check (interval_type in ('calendar','counter','cycle','combined','condition','one_time','event_based')),
  constraint maintenance_intervals_due_rule_check check (due_rule in ('any_trigger','all_triggers','whichever_occurs_first','whichever_occurs_last','manual_review'))
);

create table if not exists public.maintenance_tasks (
  id uuid primary key default gen_random_uuid(),
  yacht_id uuid not null references public.yachts(id) on delete cascade,
  equipment_asset_id uuid not null references public.equipment_assets(id) on delete cascade,
  maintenance_plan_id uuid references public.maintenance_plans(id) on delete set null,
  work_order_id uuid,
  title text not null,
  description text,
  due_at timestamptz,
  due_counter_value numeric,
  status text not null default 'upcoming',
  priority text not null default 'normal',
  assigned_to_user_id text,
  assigned_to_role text,
  generated_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  verified_at timestamptz,
  deferred_until timestamptz,
  defer_reason text,
  cancelled_at timestamptz,
  cancellation_reason text,
  idempotency_key text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint maintenance_tasks_status_check check (status in ('upcoming','due','overdue','assigned','in_progress','paused','waiting_for_parts','waiting_for_vendor','completed','pending_verification','verified','deferred','cancelled'))
);

create index if not exists maintenance_tasks_yacht_idx
  on public.maintenance_tasks (yacht_id, status, due_at);
create unique index if not exists maintenance_tasks_idempotency_uidx
  on public.maintenance_tasks (idempotency_key)
  where idempotency_key is not null;

create table if not exists public.work_orders (
  id uuid primary key default gen_random_uuid(),
  yacht_id uuid not null references public.yachts(id) on delete cascade,
  work_order_number text not null,
  title text not null,
  description text,
  work_order_type text not null default 'corrective_maintenance',
  status text not null default 'draft',
  priority text not null default 'normal',
  risk_level text,
  safety_critical boolean not null default false,
  requested_by text,
  approved_by text,
  assigned_to_user_id text,
  assigned_vendor_id uuid references public.maintenance_vendors(id) on delete set null,
  planned_start timestamptz,
  planned_end timestamptz,
  actual_start timestamptz,
  actual_end timestamptz,
  estimated_labour_hours numeric,
  actual_labour_hours numeric,
  estimated_cost numeric,
  actual_cost numeric,
  currency text default 'EUR',
  downtime_expected boolean not null default false,
  permit_required boolean not null default false,
  risk_assessment_required boolean not null default false,
  lockout_tagout_required boolean not null default false,
  quotation_id text,
  purchase_order_id text,
  completion_summary text,
  verification_notes text,
  closed_by text,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (yacht_id, work_order_number),
  constraint work_orders_status_check check (status in ('draft','requested','pending_approval','approved','planned','waiting_for_parts','waiting_for_vendor','scheduled','in_progress','paused','completed','pending_verification','closed','cancelled'))
);

create index if not exists work_orders_yacht_idx
  on public.work_orders (yacht_id, status, priority, planned_start);

create table if not exists public.work_order_assets (
  work_order_id uuid not null references public.work_orders(id) on delete cascade,
  equipment_asset_id uuid not null references public.equipment_assets(id) on delete restrict,
  relationship text not null default 'primary',
  notes text,
  created_at timestamptz not null default now(),
  primary key (work_order_id, equipment_asset_id)
);

create table if not exists public.work_order_tasks (
  id uuid primary key default gen_random_uuid(),
  work_order_id uuid not null references public.work_orders(id) on delete cascade,
  maintenance_task_id uuid references public.maintenance_tasks(id) on delete set null,
  title text not null,
  description text,
  status text not null default 'open',
  assigned_to text,
  sort_order integer not null default 0,
  completed_at timestamptz,
  verification_required boolean not null default false
);

create table if not exists public.service_events (
  id uuid primary key default gen_random_uuid(),
  yacht_id uuid not null references public.yachts(id) on delete cascade,
  equipment_asset_id uuid not null references public.equipment_assets(id) on delete restrict,
  work_order_id uuid references public.work_orders(id) on delete set null,
  maintenance_task_id uuid references public.maintenance_tasks(id) on delete set null,
  service_event_number text not null,
  service_type text not null default 'manual_service',
  title text not null,
  started_at timestamptz,
  completed_at timestamptz not null default now(),
  counter_value_before numeric,
  counter_value_after numeric,
  cycle_value_before numeric,
  cycle_value_after numeric,
  defect_description text,
  root_cause_summary text,
  work_performed text not null,
  technician_id text,
  crew_member_id text,
  vendor_id uuid references public.maintenance_vendors(id) on delete set null,
  authorised_dealer boolean not null default false,
  labour_hours numeric,
  downtime_hours numeric,
  measurements_before jsonb not null default '{}'::jsonb,
  measurements_after jsonb not null default '{}'::jsonb,
  parts_used jsonb not null default '[]'::jsonb,
  fluids_used jsonb not null default '[]'::jsonb,
  test_result text,
  cost numeric,
  currency text default 'EUR',
  warranty_claim_id uuid,
  next_due_at timestamptz,
  next_due_counter_value numeric,
  approved_by text,
  approved_at timestamptz,
  signed_off_by text,
  signed_off_at timestamptz,
  source text not null default 'manual',
  is_closed boolean not null default true,
  created_by text,
  created_at timestamptz not null default now(),
  unique (yacht_id, service_event_number)
);

create index if not exists service_events_asset_idx
  on public.service_events (equipment_asset_id, completed_at desc);

create table if not exists public.service_event_corrections (
  id uuid primary key default gen_random_uuid(),
  service_event_id uuid not null references public.service_events(id) on delete restrict,
  field_name text not null,
  previous_value jsonb,
  corrected_value jsonb,
  correction_reason text not null,
  requested_by text,
  approved_by text,
  created_at timestamptz not null default now()
);

create table if not exists public.defects (
  id uuid primary key default gen_random_uuid(),
  yacht_id uuid not null references public.yachts(id) on delete cascade,
  equipment_asset_id uuid references public.equipment_assets(id) on delete set null,
  defect_number text not null,
  title text not null,
  description text,
  severity text not null default 'medium',
  priority text not null default 'normal',
  status text not null default 'reported',
  operational_limitation text,
  safety_impact text,
  environmental_impact text,
  reported_by text,
  reported_at timestamptz not null default now(),
  counter_value_at_report numeric,
  detected_during_type text,
  detected_during_id uuid,
  temporary_repair text,
  temporary_repair_expiry timestamptz,
  work_order_id uuid references public.work_orders(id) on delete set null,
  warranty_claim_id uuid,
  resolved_at timestamptz,
  verified_by text,
  verified_at timestamptz,
  closed_at timestamptz,
  photo_urls jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (yacht_id, defect_number),
  constraint defects_severity_check check (severity in ('observation','low','medium','high','critical')),
  constraint defects_status_check check (status in ('reported','acknowledged','diagnosing','temporary_repair','parts_ordered','repair_scheduled','under_repair','testing','resolved','verified','closed','rejected','duplicate'))
);

create index if not exists defects_yacht_idx
  on public.defects (yacht_id, status, severity, reported_at desc);

create table if not exists public.spare_parts (
  id uuid primary key default gen_random_uuid(),
  yacht_id uuid not null references public.yachts(id) on delete cascade,
  equipment_asset_id uuid references public.equipment_assets(id) on delete set null,
  part_number text,
  name text not null,
  manufacturer text,
  compatible_asset_ids uuid[] not null default '{}',
  location_id uuid references public.equipment_locations(id) on delete set null,
  quantity_on_hand numeric not null default 0,
  minimum_stock numeric not null default 0,
  reorder_level numeric not null default 0,
  unit text not null default 'pcs',
  unit_cost numeric,
  currency text default 'EUR',
  expiry_date date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists spare_parts_yacht_idx
  on public.spare_parts (yacht_id, name, quantity_on_hand);

create table if not exists public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  yacht_id uuid not null references public.yachts(id) on delete cascade,
  spare_part_id uuid not null references public.spare_parts(id) on delete restrict,
  work_order_id uuid references public.work_orders(id) on delete set null,
  service_event_id uuid references public.service_events(id) on delete set null,
  movement_type text not null,
  quantity numeric not null,
  previous_quantity numeric,
  next_quantity numeric,
  notes text,
  created_by text,
  created_at timestamptz not null default now(),
  constraint inventory_movements_type_check check (movement_type in ('receive','consume','reserve','release','adjust','return','scrap','transfer'))
);

create table if not exists public.maintenance_documents (
  id uuid primary key default gen_random_uuid(),
  yacht_id uuid not null references public.yachts(id) on delete cascade,
  equipment_asset_id uuid references public.equipment_assets(id) on delete set null,
  work_order_id uuid references public.work_orders(id) on delete set null,
  service_event_id uuid references public.service_events(id) on delete set null,
  defect_id uuid references public.defects(id) on delete set null,
  category text not null,
  title text not null,
  file_url text,
  file_path text,
  mime_type text,
  expires_at timestamptz,
  is_private boolean not null default true,
  version integer not null default 1,
  uploaded_by text,
  created_at timestamptz not null default now()
);

create index if not exists maintenance_documents_yacht_idx
  on public.maintenance_documents (yacht_id, category, expires_at);

create table if not exists public.maintenance_audit_events (
  id uuid primary key default gen_random_uuid(),
  yacht_id uuid not null references public.yachts(id) on delete cascade,
  actor_user_id text,
  event_type text not null,
  entity_type text not null,
  entity_id uuid,
  previous_value jsonb,
  new_value jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists maintenance_audit_events_yacht_idx
  on public.maintenance_audit_events (yacht_id, created_at desc, entity_type);

create table if not exists public.maintenance_notifications (
  id uuid primary key default gen_random_uuid(),
  yacht_id uuid not null references public.yachts(id) on delete cascade,
  user_id text,
  notification_type text not null,
  entity_type text,
  entity_id uuid,
  title text not null,
  body text,
  due_at timestamptz,
  sent_at timestamptz,
  read_at timestamptz,
  idempotency_key text,
  created_at timestamptz not null default now()
);

create unique index if not exists maintenance_notifications_idempotency_uidx
  on public.maintenance_notifications (idempotency_key)
  where idempotency_key is not null;

create or replace function public.maintenance_next_work_order_number(p_yacht_id uuid)
returns text
language plpgsql
as $$
declare
  n integer;
begin
  select coalesce(max(nullif(regexp_replace(work_order_number, '\D', '', 'g'), '')::integer), 0) + 1
    into n
    from public.work_orders
   where yacht_id = p_yacht_id;
  return 'WO-' || lpad(n::text, 5, '0');
end;
$$;

create or replace function public.maintenance_next_service_event_number(p_yacht_id uuid)
returns text
language plpgsql
as $$
declare
  n integer;
begin
  select coalesce(max(nullif(regexp_replace(service_event_number, '\D', '', 'g'), '')::integer), 0) + 1
    into n
    from public.service_events
   where yacht_id = p_yacht_id;
  return 'SE-' || lpad(n::text, 5, '0');
end;
$$;

create or replace function public.maintenance_next_defect_number(p_yacht_id uuid)
returns text
language plpgsql
as $$
declare
  n integer;
begin
  select coalesce(max(nullif(regexp_replace(defect_number, '\D', '', 'g'), '')::integer), 0) + 1
    into n
    from public.defects
   where yacht_id = p_yacht_id;
  return 'DEF-' || lpad(n::text, 5, '0');
end;
$$;

insert into public.maintenance_system_templates (name, code, category, sort_order)
values
  ('Propulsion','propulsion','engineering',10),
  ('Generators and Electrical Power','generators-electrical','engineering',20),
  ('Fuel Systems','fuel-systems','engineering',30),
  ('Cooling and Seawater','cooling-seawater','engineering',40),
  ('HVAC and Refrigeration','hvac-refrigeration','hotel',50),
  ('Hydraulics and Pneumatics','hydraulics-pneumatics','engineering',60),
  ('Steering, Thrusters and Stabilisers','steering-thrusters-stabilisers','engineering',70),
  ('Freshwater','freshwater','hotel',80),
  ('Waste, Bilge and Environmental Systems','waste-bilge-environmental','environmental',90),
  ('Fire and Safety','fire-safety','safety',100),
  ('Life-Saving Appliances','life-saving-appliances','safety',110),
  ('Navigation and Communications','navigation-communications','bridge',120),
  ('Hull and Underwater Body','hull-underwater','structure',130),
  ('Deck Machinery','deck-machinery','deck',140),
  ('Interior and Hotel Systems','interior-hotel','hotel',150),
  ('Tenders and Toys','tenders-toys','operations',160),
  ('Sailing-Yacht Systems','sailing-yacht-systems','sailing',170)
on conflict (code) do update set
  name = excluded.name,
  category = excluded.category,
  sort_order = excluded.sort_order,
  updated_at = now();

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'maintenance-documents',
  'maintenance-documents',
  false,
  52428800,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf',
    'text/plain',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
