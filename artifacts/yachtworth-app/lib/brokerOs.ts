import { getAuthToken, getBaseUrl } from "@workspace/api-client-react";

export type BrokerCase = {
  id: string;
  title: string;
  case_type: string;
  stage: string;
  lead_score: "A" | "B" | "C" | "D";
  status: string;
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

export type CreateBrokerCaseInput = {
  title: string;
  contact_name?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
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

export async function createBrokerCase(input: CreateBrokerCaseInput): Promise<{ item: BrokerCase }> {
  const base = getBaseUrl() ?? "";
  const res = await fetch(`${base}/api/broker-os/cases`, {
    method: "POST",
    headers: await headers(),
    body: JSON.stringify(input),
  });
  return readJson<{ item: BrokerCase }>(res);
}

export async function importCharterClientsToBrokerOs(): Promise<{ imported: number }> {
  const base = getBaseUrl() ?? "";
  const res = await fetch(`${base}/api/broker-os/import-charter-clients`, {
    headers: await headers(),
  });
  return readJson<{ imported: number }>(res);
}
