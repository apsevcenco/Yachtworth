import { getAuthToken, getBaseUrl } from "@workspace/api-client-react";

export type PassportYacht = Record<string, unknown> & {
  id: string;
  name?: string | null;
  brand?: string | null;
  model?: string | null;
  year_built?: number | null;
  yacht_type?: string | null;
  length_meters?: number | null;
  beam_meters?: number | null;
  draft_meters?: number | null;
  flag?: string | null;
  home_port?: string | null;
  registration_number?: string | null;
  imo_number?: string | null;
  hull_id?: string | null;
  vat_status?: string | null;
  engine_maker?: string | null;
  engine_model?: string | null;
  engine_count?: number | null;
  total_hp?: number | null;
  engine_hours?: number | null;
  cover_photo_url?: string | null;
  photo_url?: string | null;
};

export type PassportMeta = {
  yachtworth_id: string;
  title: string;
  access_url: string;
  last_activity_at?: string | null;
};

export type PassportCounts = {
  equipment: number;
  valuations: number;
  roi: number;
  costs: number;
  surveys: number;
  network_listings: number;
  maintenance_assets: number;
  work_orders: number;
  service_events: number;
  documents: number;
};

export type PassportModules = {
  equipment: Record<string, unknown>[];
  valuations: Record<string, unknown>[];
  roi: Record<string, unknown>[];
  costs: Record<string, unknown>[];
  surveys: Record<string, unknown>[];
  network_listings: Record<string, unknown>[];
  maintenance_assets: Record<string, unknown>[];
  work_orders: Record<string, unknown>[];
  service_events: Record<string, unknown>[];
  documents: Record<string, unknown>[];
};

export type DigitalPassport = {
  passport: PassportMeta;
  yacht: PassportYacht;
  counts: PassportCounts;
  modules: PassportModules;
  errors?: string[];
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

export async function getDigitalPassport(yachtId: string): Promise<DigitalPassport> {
  const res = await fetch(api(`/api/yachts/${yachtId}/passport`), {
    headers: await headers(),
  });
  const text = await res.text();
  const json = text ? JSON.parse(text) : null;
  if (!res.ok) {
    throw new Error(json?.error ?? `HTTP ${res.status}`);
  }
  return json as DigitalPassport;
}
