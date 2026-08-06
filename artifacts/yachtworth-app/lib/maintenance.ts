import { getAuthToken, getBaseUrl } from "@workspace/api-client-react";

export type YachtOption = {
  id: string;
  name?: string | null;
  manufacturer?: string | null;
  model?: string | null;
};

export type MaintenanceDashboard = {
  yachtId: string;
  counts: Record<string, number>;
  overdueTasks?: MaintenanceTask[];
  dueSoonTasks?: MaintenanceTask[];
  openDefects?: Defect[];
  openWorkOrders?: WorkOrder[];
  recentServiceEvents?: ServiceEvent[];
  lowStockParts?: SparePart[];
  overdue_tasks?: MaintenanceTask[];
  due_soon_tasks?: MaintenanceTask[];
  open_defects?: Defect[];
  open_work_orders?: WorkOrder[];
  recent_service_events?: ServiceEvent[];
  low_stock_parts?: SparePart[];
};

export type MaintenanceSystemTemplate = {
  id: string;
  code: string;
  name: string;
  description?: string | null;
};

export type MaintenanceSystem = {
  id: string;
  yacht_id: string;
  code: string;
  name: string;
  sort_order?: number | null;
};

export type EquipmentAsset = {
  id: string;
  yacht_id: string;
  vessel_system_id?: string | null;
  maintenance_system_id?: string | null;
  parent_asset_id?: string | null;
  name: string;
  display_name?: string | null;
  asset_code?: string | null;
  asset_type?: string | null;
  manufacturer?: string | null;
  model?: string | null;
  serial_number?: string | null;
  part_number?: string | null;
  status?: string | null;
  criticality?: string | null;
  operational_status?: string | null;
  condition_status?: string | null;
  location_label?: string | null;
  warranty_start?: string | null;
  warranty_expires_at?: string | null;
  warranty_end?: string | null;
  warranty_hours_limit?: number | null;
  replacement_cost?: number | null;
  replacement_cost_currency?: string | null;
  class_relevant?: boolean | null;
  flag_relevant?: boolean | null;
  safety_relevant?: boolean | null;
  environmental_relevant?: boolean | null;
  photo_urls?: string[] | null;
  document_urls?: string[] | null;
  maintenance_systems?: { name?: string | null; code?: string | null } | null;
  equipment_locations?: { name?: string | null; compartment?: string | null } | null;
  equipment_counters?: EquipmentCounter[] | null;
};

export type EquipmentCounter = {
  id: string;
  equipment_asset_id: string;
  counter_type: string;
  unit: string;
  current_value: number;
  is_primary?: boolean | null;
  last_reading_at?: string | null;
};

export type MaintenanceTask = {
  id: string;
  yacht_id: string;
  equipment_asset_id?: string | null;
  maintenance_plan_id?: string | null;
  title: string;
  status: string;
  priority?: string | null;
  due_at?: string | null;
  due_counter_value?: number | null;
  estimated_hours?: number | null;
  assigned_to_role?: string | null;
  description?: string | null;
  equipment_assets?: EquipmentAsset | null;
};

export type WorkOrder = {
  id: string;
  yacht_id: string;
  work_order_number: string;
  title: string;
  description?: string | null;
  work_order_type?: string | null;
  status: string;
  priority?: string | null;
  risk_level?: string | null;
  safety_critical?: boolean | null;
  requested_by?: string | null;
  approved_by?: string | null;
  assigned_to_user_id?: string | null;
  assigned_to_name?: string | null;
  planned_start?: string | null;
  planned_end?: string | null;
  actual_start?: string | null;
  actual_end?: string | null;
  estimated_labour_hours?: number | null;
  actual_labour_hours?: number | null;
  estimated_cost?: number | null;
  actual_cost?: number | null;
  currency?: string | null;
  downtime_expected?: boolean | null;
  permit_required?: boolean | null;
  risk_assessment_required?: boolean | null;
  lockout_tagout_required?: boolean | null;
  quotation_id?: string | null;
  purchase_order_id?: string | null;
  completion_summary?: string | null;
  verification_notes?: string | null;
  closed_at?: string | null;
  asset_ids?: string[] | null;
  work_order_assets?: { equipment_asset_id?: string | null; equipment_assets?: { name?: string | null } | null }[] | null;
};

export type Defect = {
  id: string;
  yacht_id: string;
  equipment_asset_id?: string | null;
  defect_number: string;
  title: string;
  description?: string | null;
  status: string;
  severity?: string | null;
  priority?: string | null;
  risk_level?: string | null;
  operational_limitation?: string | null;
  safety_impact?: string | null;
  environmental_impact?: string | null;
  reported_by?: string | null;
  reported_at?: string | null;
  counter_value_at_report?: number | null;
  detected_during_type?: string | null;
  detected_during_id?: string | null;
  temporary_repair?: string | null;
  temporary_repair_expiry?: string | null;
  work_order_id?: string | null;
  warranty_claim_id?: string | null;
  resolved_at?: string | null;
  verified_by?: string | null;
  verified_at?: string | null;
  closed_at?: string | null;
  photo_urls?: string[] | null;
  equipment_assets?: EquipmentAsset | null;
};

export type ServiceEvent = {
  id: string;
  yacht_id: string;
  equipment_asset_id?: string | null;
  work_order_id?: string | null;
  maintenance_task_id?: string | null;
  service_event_number: string;
  title: string;
  started_at?: string | null;
  completed_at?: string | null;
  performed_at?: string | null;
  performed_by_name?: string | null;
  technician_id?: string | null;
  service_type?: string | null;
  work_performed?: string | null;
  counter_value_before?: number | null;
  counter_value_after?: number | null;
  cycle_value_before?: number | null;
  cycle_value_after?: number | null;
  defect_description?: string | null;
  root_cause_summary?: string | null;
  labour_hours?: number | null;
  downtime_hours?: number | null;
  measurements_before?: Record<string, unknown> | null;
  measurements_after?: Record<string, unknown> | null;
  parts_used?: unknown[] | null;
  fluids_used?: unknown[] | null;
  cost?: number | null;
  currency?: string | null;
  test_result?: string | null;
  next_due_at?: string | null;
  next_due_counter_value?: number | null;
  authorised_dealer?: boolean | null;
  approved_by?: string | null;
  approved_at?: string | null;
  signed_off_by?: string | null;
  signed_off_at?: string | null;
  maintenance_vendors?: { name?: string | null } | null;
  equipment_assets?: EquipmentAsset | null;
};

export type SparePart = {
  id: string;
  yacht_id: string;
  equipment_asset_id?: string | null;
  name: string;
  part_number?: string | null;
  manufacturer?: string | null;
  compatible_asset_ids?: string[] | null;
  location_id?: string | null;
  quantity_on_hand: number;
  minimum_stock: number;
  reorder_level?: number | null;
  unit?: string | null;
  unit_cost?: number | null;
  currency?: string | null;
  expiry_date?: string | null;
  notes?: string | null;
};

export type InventoryMovement = {
  id: string;
  yacht_id: string;
  spare_part_id: string;
  movement_type: string;
  quantity: number;
  previous_quantity?: number | null;
  next_quantity?: number | null;
  notes?: string | null;
  created_at?: string | null;
};

export type MaintenanceDocument = {
  id: string;
  yacht_id: string;
  equipment_asset_id?: string | null;
  work_order_id?: string | null;
  service_event_id?: string | null;
  defect_id?: string | null;
  category: string;
  title: string;
  file_url?: string | null;
  file_path?: string | null;
  mime_type?: string | null;
  expires_at?: string | null;
  is_private?: boolean | null;
  version?: number | null;
  uploaded_by?: string | null;
  created_at?: string | null;
  equipment_assets?: { name?: string | null } | null;
  work_orders?: { work_order_number?: string | null; title?: string | null } | null;
  service_events?: { service_event_number?: string | null; title?: string | null } | null;
  defects?: { defect_number?: string | null; title?: string | null } | null;
};

export type UploadMaintenanceDocumentInput = {
  localUri: string;
  fileName?: string | null;
  mimeType?: string | null;
  title?: string | null;
  category?: string | null;
  expires_at?: string | null;
  is_private?: boolean | null;
  version?: number | null;
  equipment_asset_id?: string | null;
  work_order_id?: string | null;
  service_event_id?: string | null;
  defect_id?: string | null;
};

async function headers(): Promise<Record<string, string>> {
  const token = await getAuthToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function api(path: string): string {
  const base = getBaseUrl() ?? "";
  return `${base}${path}`;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(api(path), {
    ...init,
    headers: {
      ...(await headers()),
      ...(init.headers ?? {}),
    },
  });
  const text = await res.text();
  const json = text ? JSON.parse(text) : null;
  if (!res.ok) {
    throw new Error(json?.error ?? `HTTP ${res.status}`);
  }
  return json as T;
}

export async function getYachts(): Promise<YachtOption[]> {
  const data = await request<{ items?: YachtOption[] } | YachtOption[]>("/api/yachts");
  return Array.isArray(data) ? data : data.items ?? [];
}

export async function getMaintenanceDashboard(yachtId: string): Promise<MaintenanceDashboard> {
  return request(`/api/maintenance/yachts/${yachtId}/dashboard`);
}

export async function getMaintenanceSystemTemplates(): Promise<MaintenanceSystemTemplate[]> {
  const data = await request<{ items: MaintenanceSystemTemplate[] }>("/api/maintenance/system-templates");
  return data.items;
}

export async function getMaintenanceSystems(yachtId: string): Promise<MaintenanceSystem[]> {
  const data = await request<{ items: MaintenanceSystem[] }>(`/api/maintenance/yachts/${yachtId}/systems`);
  return data.items;
}

export async function seedMaintenanceSystems(yachtId: string): Promise<MaintenanceSystem[]> {
  const data = await request<{ items: MaintenanceSystem[] }>(`/api/maintenance/yachts/${yachtId}/systems/seed`, {
    method: "POST",
  });
  return data.items;
}

export async function createMaintenanceSystem(yachtId: string, input: Partial<MaintenanceSystem>): Promise<MaintenanceSystem> {
  return request(`/api/maintenance/yachts/${yachtId}/systems`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function getEquipmentAssets(yachtId: string): Promise<EquipmentAsset[]> {
  const data = await request<{ items: EquipmentAsset[] }>(`/api/maintenance/yachts/${yachtId}/assets`);
  return data.items;
}

export async function createEquipmentAsset(yachtId: string, input: Partial<EquipmentAsset>): Promise<EquipmentAsset> {
  return request(`/api/maintenance/yachts/${yachtId}/assets`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateEquipmentAsset(
  yachtId: string,
  assetId: string,
  input: Partial<EquipmentAsset>,
): Promise<EquipmentAsset> {
  return request(`/api/maintenance/yachts/${yachtId}/assets/${assetId}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export async function createEquipmentCounter(
  yachtId: string,
  assetId: string,
  input: Partial<EquipmentCounter>,
): Promise<EquipmentCounter> {
  return request(`/api/maintenance/yachts/${yachtId}/assets/${assetId}/counters`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function recordCounterReading(yachtId: string, counterId: string, value: number): Promise<unknown> {
  return request(`/api/maintenance/yachts/${yachtId}/counters/${counterId}/readings`, {
    method: "POST",
    body: JSON.stringify({ value }),
  });
}

export async function getMaintenanceTasks(yachtId: string): Promise<MaintenanceTask[]> {
  const data = await request<{ items: MaintenanceTask[] }>(`/api/maintenance/yachts/${yachtId}/tasks`);
  return data.items;
}

export async function createMaintenancePlan(
  yachtId: string,
  input: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const data = await request<{ item?: Record<string, unknown> } | Record<string, unknown>>(`/api/maintenance/yachts/${yachtId}/plans`, {
    method: "POST",
    body: JSON.stringify(input),
  });
  const maybeWrapped = data as { item?: Record<string, unknown> };
  return maybeWrapped.item ?? (data as Record<string, unknown>);
}

export async function generateMaintenanceTask(
  yachtId: string,
  planId: string,
): Promise<MaintenanceTask> {
  return request(`/api/maintenance/yachts/${yachtId}/plans/${planId}/generate-task`, {
    method: "POST",
  });
}

export async function getWorkOrders(yachtId: string): Promise<WorkOrder[]> {
  const data = await request<{ items: WorkOrder[] }>(`/api/maintenance/yachts/${yachtId}/work-orders`);
  return data.items;
}

export async function createWorkOrder(yachtId: string, input: Partial<WorkOrder>): Promise<WorkOrder> {
  return request(`/api/maintenance/yachts/${yachtId}/work-orders`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateWorkOrder(
  yachtId: string,
  workOrderId: string,
  input: Partial<WorkOrder>,
): Promise<WorkOrder> {
  return request(`/api/maintenance/yachts/${yachtId}/work-orders/${workOrderId}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export async function getDefects(yachtId: string): Promise<Defect[]> {
  const data = await request<{ items: Defect[] }>(`/api/maintenance/yachts/${yachtId}/defects`);
  return data.items;
}

export async function createDefect(yachtId: string, input: Partial<Defect>): Promise<Defect> {
  return request(`/api/maintenance/yachts/${yachtId}/defects`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateDefect(
  yachtId: string,
  defectId: string,
  input: Partial<Defect>,
): Promise<Defect> {
  return request(`/api/maintenance/yachts/${yachtId}/defects/${defectId}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export async function getServiceEvents(yachtId: string): Promise<ServiceEvent[]> {
  const data = await request<{ items: ServiceEvent[] }>(`/api/maintenance/yachts/${yachtId}/service-events`);
  return data.items;
}

export async function createServiceEvent(yachtId: string, input: Partial<ServiceEvent>): Promise<ServiceEvent> {
  return request(`/api/maintenance/yachts/${yachtId}/service-events`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function getSpareParts(yachtId: string): Promise<SparePart[]> {
  const data = await request<{ items: SparePart[] }>(`/api/maintenance/yachts/${yachtId}/parts`);
  return data.items;
}

export async function createSparePart(yachtId: string, input: Partial<SparePart>): Promise<SparePart> {
  return request(`/api/maintenance/yachts/${yachtId}/parts`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateSparePart(
  yachtId: string,
  partId: string,
  input: Partial<SparePart>,
): Promise<SparePart> {
  return request(`/api/maintenance/yachts/${yachtId}/parts/${partId}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export async function createInventoryMovement(
  yachtId: string,
  partId: string,
  input: Partial<InventoryMovement>,
): Promise<InventoryMovement> {
  return request(`/api/maintenance/yachts/${yachtId}/parts/${partId}/movements`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function getMaintenanceDocuments(yachtId: string): Promise<MaintenanceDocument[]> {
  const data = await request<{ items: MaintenanceDocument[] }>(`/api/maintenance/yachts/${yachtId}/documents`);
  return data.items;
}

export async function createMaintenanceDocument(yachtId: string, input: Partial<MaintenanceDocument>): Promise<MaintenanceDocument> {
  return request(`/api/maintenance/yachts/${yachtId}/documents`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

async function multipartHeaders(): Promise<Record<string, string>> {
  const token = await getAuthToken();
  return {
    Accept: "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function appendIfPresent(form: FormData, key: string, value: unknown): void {
  if (value == null || value === "") return;
  form.append(key, String(value));
}

export async function uploadMaintenanceDocumentFile(
  yachtId: string,
  input: UploadMaintenanceDocumentInput,
): Promise<MaintenanceDocument> {
  const form = new FormData();
  appendIfPresent(form, "title", input.title);
  appendIfPresent(form, "category", input.category);
  appendIfPresent(form, "mime_type", input.mimeType);
  appendIfPresent(form, "expires_at", input.expires_at);
  appendIfPresent(form, "is_private", input.is_private ?? true);
  appendIfPresent(form, "version", input.version ?? 1);
  appendIfPresent(form, "equipment_asset_id", input.equipment_asset_id);
  appendIfPresent(form, "work_order_id", input.work_order_id);
  appendIfPresent(form, "service_event_id", input.service_event_id);
  appendIfPresent(form, "defect_id", input.defect_id);
  form.append("file", {
    uri: input.localUri,
    name: input.fileName || `maintenance_attachment_${Date.now()}`,
    type: input.mimeType || "application/octet-stream",
  } as unknown as Blob);

  const res = await fetch(api(`/api/maintenance/yachts/${yachtId}/documents/upload`), {
    method: "POST",
    headers: await multipartHeaders(),
    body: form,
  });
  const text = await res.text();
  const json = text ? JSON.parse(text) : null;
  if (!res.ok) {
    throw new Error(json?.error ?? `Upload failed (HTTP ${res.status})`);
  }
  return json as MaintenanceDocument;
}

export async function getMaintenanceDocumentSignedUrl(yachtId: string, documentId: string): Promise<string> {
  const data = await request<{ url: string }>(`/api/maintenance/yachts/${yachtId}/documents/${documentId}/signed-url`);
  return data.url;
}
