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
  description?: string | null;
  equipment_assets?: EquipmentAsset | null;
};

export type WorkOrder = {
  id: string;
  yacht_id: string;
  work_order_number: string;
  title: string;
  status: string;
  priority?: string | null;
  assigned_to_name?: string | null;
  due_at?: string | null;
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
  risk_level?: string | null;
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
  labour_hours?: number | null;
  downtime_hours?: number | null;
  cost?: number | null;
  currency?: string | null;
  test_result?: string | null;
  next_due_at?: string | null;
  equipment_assets?: EquipmentAsset | null;
};

export type SparePart = {
  id: string;
  yacht_id: string;
  equipment_asset_id?: string | null;
  name: string;
  part_number?: string | null;
  manufacturer?: string | null;
  quantity_on_hand: number;
  minimum_stock: number;
  unit?: string | null;
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
