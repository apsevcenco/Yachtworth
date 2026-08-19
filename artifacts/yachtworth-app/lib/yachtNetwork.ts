import { getAuthToken, getBaseUrl } from "@workspace/api-client-react";

export type NetworkListingType = "sale" | "charter" | "both";
export type NetworkVisibility = "internal" | "broker_network" | "private_link";
export type NetworkStatus = "draft" | "active" | "paused" | "archived";

export type YachtNetworkListing = {
  id: string;
  clerk_user_id?: string | null;
  yacht_id?: string | null;
  listing_type: NetworkListingType;
  status: NetworkStatus;
  visibility: NetworkVisibility;
  title: string;
  description?: string | null;
  asking_price_eur?: number | null;
  charter_rate_eur_week?: number | null;
  currency?: string | null;
  location?: string | null;
  availability?: string | null;
  broker_name?: string | null;
  broker_company?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  cover_photo_url?: string | null;
  photo_urls?: string[] | null;
  yacht_snapshot?: Record<string, unknown> | null;
  published_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  is_owner?: boolean | null;
};

export type NetworkConversation = {
  id: string;
  listing_id: string;
  listing_owner_user_id: string;
  starter_user_id: string;
  status: "active" | "archived";
  last_message_text?: string | null;
  last_message_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  listing?: YachtNetworkListing | null;
  other_participant_user_id?: string | null;
  is_listing_owner?: boolean | null;
};

export type NetworkMessage = {
  id: string;
  conversation_id: string;
  sender_user_id: string;
  body: string;
  read_at?: string | null;
  created_at?: string | null;
};

export type NetworkConversationDetail = {
  conversation: NetworkConversation;
  items: NetworkMessage[];
};

export type PublishNetworkListingInput = {
  yacht_id: string;
  listing_type: NetworkListingType;
  visibility?: NetworkVisibility;
  status?: NetworkStatus;
  title?: string | null;
  description?: string | null;
  asking_price_eur?: number | null;
  charter_rate_eur_week?: number | null;
  currency?: string | null;
  location?: string | null;
  availability?: string | null;
  broker_name?: string | null;
  broker_company?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  cover_photo_url?: string | null;
  photo_urls?: string[] | null;
};

export type NetworkListingFilters = {
  mine?: boolean;
  q?: string;
  listing_type?: NetworkListingType | "all";
  min_length_m?: string;
  max_length_m?: string;
  max_price_eur?: string;
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

function query(filters: NetworkListingFilters = {}): string {
  const params = new URLSearchParams();
  if (filters.mine) params.set("mine", "1");
  if (filters.q?.trim()) params.set("q", filters.q.trim());
  if (filters.listing_type && filters.listing_type !== "all") params.set("listing_type", filters.listing_type);
  if (filters.min_length_m?.trim()) params.set("min_length_m", filters.min_length_m.trim());
  if (filters.max_length_m?.trim()) params.set("max_length_m", filters.max_length_m.trim());
  if (filters.max_price_eur?.trim()) params.set("max_price_eur", filters.max_price_eur.trim());
  const suffix = params.toString();
  return suffix ? `?${suffix}` : "";
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

export async function listNetworkListings(filters: NetworkListingFilters = {}): Promise<YachtNetworkListing[]> {
  const data = await request<{ items: YachtNetworkListing[] }>(`/api/network/listings${query(filters)}`);
  return data.items;
}

export async function getNetworkListing(id: string): Promise<YachtNetworkListing> {
  return request(`/api/network/listings/${id}`);
}

export async function publishNetworkListing(input: PublishNetworkListingInput): Promise<YachtNetworkListing> {
  return request("/api/network/listings/publish", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateNetworkListing(id: string, input: Partial<PublishNetworkListingInput>): Promise<YachtNetworkListing> {
  return request(`/api/network/listings/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export async function archiveNetworkListing(id: string): Promise<void> {
  await request(`/api/network/listings/${id}`, { method: "DELETE" });
}

export async function listNetworkConversations(): Promise<NetworkConversation[]> {
  const data = await request<{ items: NetworkConversation[] }>("/api/network/conversations");
  return data.items;
}

export async function startNetworkConversation(listingId: string): Promise<NetworkConversation> {
  return request(`/api/network/listings/${listingId}/conversations`, { method: "POST" });
}

export async function getNetworkConversationMessages(conversationId: string): Promise<NetworkConversationDetail> {
  return request(`/api/network/conversations/${conversationId}/messages`);
}

export async function sendNetworkMessage(conversationId: string, body: string): Promise<NetworkMessage> {
  return request(`/api/network/conversations/${conversationId}/messages`, {
    method: "POST",
    body: JSON.stringify({ body }),
  });
}
