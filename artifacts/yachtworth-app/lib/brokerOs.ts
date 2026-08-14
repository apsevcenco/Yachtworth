import { getAuthToken, getBaseUrl } from "@workspace/api-client-react";

export type BrokerCase = {
  id: string;
  contact_id: string | null;
  company_id: string | null;
  title: string;
  case_type: string;
  stage: string;
  lead_score: "A" | "B" | "C" | "D";
  status: string;
  owner_name: string | null;
  budget_min_eur: number | null;
  budget_max_eur: number | null;
  loa_min_m: number | null;
  loa_max_m: number | null;
  timeline: string | null;
  preferred_regions: string[];
  mandatory_requirements: string[];
  preferred_requirements: string[];
  next_action: string | null;
  next_action_due: string | null;
  last_meaningful_contact_at: string | null;
  risk_level: "low" | "medium" | "high";
  risk_reason: string | null;
  expected_commission_eur: number | null;
  close_probability: number;
  forecast_close_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  priority_score?: number;
  days_since_contact?: number | null;
};

export type BrokerTask = {
  id: string;
  case_id: string | null;
  title: string;
  detail: string | null;
  due_date: string | null;
  priority: "low" | "normal" | "high" | "urgent";
  status: string;
  created_at: string;
};

export type BrokerDashboard = {
  today: {
    overdue_followups: number;
    due_today: number;
    stale_cases: number;
    active_cases: number;
    contacts: number;
  };
  priority_cases: BrokerCase[];
  tasks: BrokerTask[];
  forecast: {
    expected_commission_eur: number;
    weighted_commission_eur: number;
  };
  recent_contacts: Array<{
    id: string;
    full_name: string;
    email: string | null;
    phone: string | null;
    source: string | null;
  }>;
};

export type BrokerCasesResponse = {
  items: BrokerCase[];
};

export type BrokerContactCase = {
  id: string;
  contact_id: string | null;
  title: string;
  case_type: string;
  stage: string;
  status: string;
  updated_at: string;
};

export type BrokerContact = {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  linkedin: string | null;
  country: string | null;
  citizenship: string | null;
  residency: string | null;
  languages: string[] | null;
  preferred_channel: string | null;
  relationship_owner: string | null;
  relationship_type: string | null;
  trust_level: string | null;
  source: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  cases_count: number;
  active_cases_count: number;
  last_case_title: string | null;
  cases: BrokerContactCase[];
};

export type BrokerActivity = {
  id: string;
  case_id: string | null;
  contact_id: string | null;
  activity_type: string;
  channel: string | null;
  subject: string | null;
  body: string | null;
  happened_at: string;
  metadata: Record<string, unknown>;
};

export type BrokerContactTask = BrokerTask;

export type BrokerContactDetail = {
  item: BrokerContact;
  cases: BrokerContactCase[];
  tasks: BrokerContactTask[];
  activity: BrokerActivity[];
};

export type UpsertBrokerContactInput = {
  full_name: string;
  email?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  linkedin?: string | null;
  country?: string | null;
  citizenship?: string | null;
  residency?: string | null;
  languages?: string[] | string | null;
  preferred_channel?: string | null;
  relationship_owner?: string | null;
  relationship_type?: string | null;
  trust_level?: string | null;
  source?: string | null;
  notes?: string | null;
};

export type CreateContactTaskInput = {
  title: string;
  detail?: string | null;
  due_date?: string | null;
  priority?: "low" | "normal" | "high" | "urgent";
};

export type CreateContactActivityInput = {
  activity_type?: string | null;
  channel?: "phone" | "email" | "whatsapp" | "meeting" | "note" | "other" | null;
  subject?: string | null;
  body?: string | null;
};

export type BrokerContactsResponse = {
  items: BrokerContact[];
  total: number;
  filters: {
    sources: string[];
    relationship_types: string[];
  };
};

export type CreateBrokerCaseInput = {
  title: string;
  contact_id?: string | null;
  contact_name?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  owner_name?: string | null;
  case_type?: string | null;
  lead_score?: "A" | "B" | "C" | "D";
  budget_min_eur?: number | null;
  budget_max_eur?: number | null;
  loa_min_m?: number | null;
  loa_max_m?: number | null;
  timeline?: string | null;
  preferred_regions?: string[] | string;
  mandatory_requirements?: string[] | string;
  preferred_requirements?: string[] | string;
  next_action?: string | null;
  next_action_due?: string | null;
  risk_level?: "low" | "medium" | "high";
  risk_reason?: string | null;
  expected_commission_eur?: number | null;
  close_probability?: number | null;
  forecast_close_date?: string | null;
  notes?: string | null;
};

export type BrokerCaseDetail = {
  item: BrokerCase;
  tasks: BrokerTask[];
  activity: BrokerActivity[];
};

export type UpdateBrokerCaseInput = CreateBrokerCaseInput & {
  stage?: string | null;
  status?: "active" | "paused" | "won" | "lost" | "archived" | string;
  acceptable_compromises?: string[] | string;
  rejected_characteristics?: string[] | string;
};

async function headers(): Promise<HeadersInit> {
  const h: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };
  const token = await getAuthToken();
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

async function readJson<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Broker OS request failed (HTTP ${res.status}): ${text.slice(0, 240) || "no body"}`);
  }
  return (await res.json()) as T;
}

export async function getBrokerDashboard(): Promise<BrokerDashboard> {
  const base = getBaseUrl() ?? "";
  const res = await fetch(`${base}/api/broker-os/dashboard`, {
    headers: await headers(),
  });
  return readJson<BrokerDashboard>(res);
}

export async function getBrokerCases(): Promise<BrokerCasesResponse> {
  const base = getBaseUrl() ?? "";
  const res = await fetch(`${base}/api/broker-os/cases`, {
    headers: await headers(),
  });
  return readJson<BrokerCasesResponse>(res);
}

export async function getBrokerPipeline(): Promise<BrokerCasesResponse> {
  const base = getBaseUrl() ?? "";
  const res = await fetch(`${base}/api/broker-os/pipeline`, {
    headers: await headers(),
  });
  return readJson<BrokerCasesResponse>(res);
}

export async function getBrokerContacts(params?: { q?: string; source?: string }): Promise<BrokerContactsResponse> {
  const base = getBaseUrl() ?? "";
  const qs = new URLSearchParams();
  if (params?.q?.trim()) qs.set("q", params.q.trim());
  if (params?.source && params.source !== "all") qs.set("source", params.source);
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  const res = await fetch(`${base}/api/broker-os/contacts${suffix}`, {
    headers: await headers(),
  });
  return readJson<BrokerContactsResponse>(res);
}

export async function getBrokerContact(id: string): Promise<BrokerContactDetail> {
  const base = getBaseUrl() ?? "";
  const res = await fetch(`${base}/api/broker-os/contacts/${id}`, {
    headers: await headers(),
  });
  return readJson<BrokerContactDetail>(res);
}

export async function createBrokerContact(input: UpsertBrokerContactInput): Promise<{ item: BrokerContact }> {
  const base = getBaseUrl() ?? "";
  const res = await fetch(`${base}/api/broker-os/contacts`, {
    method: "POST",
    headers: await headers(),
    body: JSON.stringify(input),
  });
  return readJson<{ item: BrokerContact }>(res);
}

export async function updateBrokerContact(id: string, input: UpsertBrokerContactInput): Promise<{ item: BrokerContact }> {
  const base = getBaseUrl() ?? "";
  const res = await fetch(`${base}/api/broker-os/contacts/${id}`, {
    method: "PATCH",
    headers: await headers(),
    body: JSON.stringify(input),
  });
  return readJson<{ item: BrokerContact }>(res);
}

export async function deleteBrokerContact(id: string): Promise<void> {
  const base = getBaseUrl() ?? "";
  const res = await fetch(`${base}/api/broker-os/contacts/${id}`, {
    method: "DELETE",
    headers: await headers(),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Broker OS request failed (HTTP ${res.status}): ${text.slice(0, 240) || "no body"}`);
  }
}

export async function createBrokerContactTask(
  contactId: string,
  input: CreateContactTaskInput,
): Promise<{ item: BrokerContactTask }> {
  const base = getBaseUrl() ?? "";
  const res = await fetch(`${base}/api/broker-os/contacts/${contactId}/tasks`, {
    method: "POST",
    headers: await headers(),
    body: JSON.stringify(input),
  });
  return readJson<{ item: BrokerContactTask }>(res);
}

export async function createBrokerContactActivity(
  contactId: string,
  input: CreateContactActivityInput,
): Promise<{ item: BrokerActivity }> {
  const base = getBaseUrl() ?? "";
  const res = await fetch(`${base}/api/broker-os/contacts/${contactId}/activity`, {
    method: "POST",
    headers: await headers(),
    body: JSON.stringify(input),
  });
  return readJson<{ item: BrokerActivity }>(res);
}

export async function createBrokerCase(input: CreateBrokerCaseInput): Promise<{ item: BrokerCase }> {
  const base = getBaseUrl() ?? "";
  const res = await fetch(`${base}/api/broker-os/cases`, {
    method: "POST",
    headers: await headers(),
    body: JSON.stringify(input),
  });
  return readJson<{ item: BrokerCase }>(res);
}

export async function getBrokerCase(id: string): Promise<BrokerCaseDetail> {
  const base = getBaseUrl() ?? "";
  const res = await fetch(`${base}/api/broker-os/cases/${id}`, {
    headers: await headers(),
  });
  return readJson<BrokerCaseDetail>(res);
}

export async function updateBrokerCase(id: string, input: UpdateBrokerCaseInput): Promise<{ item: BrokerCase }> {
  const base = getBaseUrl() ?? "";
  const res = await fetch(`${base}/api/broker-os/cases/${id}`, {
    method: "PATCH",
    headers: await headers(),
    body: JSON.stringify(input),
  });
  return readJson<{ item: BrokerCase }>(res);
}

export async function createBrokerCaseTask(
  caseId: string,
  input: CreateContactTaskInput,
): Promise<{ item: BrokerTask }> {
  const base = getBaseUrl() ?? "";
  const res = await fetch(`${base}/api/broker-os/cases/${caseId}/tasks`, {
    method: "POST",
    headers: await headers(),
    body: JSON.stringify(input),
  });
  return readJson<{ item: BrokerTask }>(res);
}

export async function updateBrokerTask(id: string, input: { status: "open" | "done" | "cancelled" }): Promise<{ item: BrokerTask }> {
  const base = getBaseUrl() ?? "";
  const res = await fetch(`${base}/api/broker-os/tasks/${id}`, {
    method: "PATCH",
    headers: await headers(),
    body: JSON.stringify(input),
  });
  return readJson<{ item: BrokerTask }>(res);
}

export async function createBrokerCaseActivity(
  caseId: string,
  input: CreateContactActivityInput,
): Promise<{ item: BrokerActivity }> {
  const base = getBaseUrl() ?? "";
  const res = await fetch(`${base}/api/broker-os/cases/${caseId}/activity`, {
    method: "POST",
    headers: await headers(),
    body: JSON.stringify(input),
  });
  return readJson<{ item: BrokerActivity }>(res);
}

export async function importCharterClientsToBrokerOs(): Promise<{ imported: number }> {
  const base = getBaseUrl() ?? "";
  const res = await fetch(`${base}/api/broker-os/import-charter-clients`, {
    headers: await headers(),
  });
  return readJson<{ imported: number }>(res);
}
