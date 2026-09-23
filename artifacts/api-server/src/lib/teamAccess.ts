import type { SupabaseClient } from "@supabase/supabase-js";
import { ORGANIZATION_MEMBERS_TABLE } from "./supabase";

export type OrganizationRole = "owner" | "member";

export type OrganizationMembership = {
  organization_id: string;
  role: OrganizationRole;
};

export async function listActiveMemberships(
  sb: SupabaseClient,
  userId: string,
): Promise<{ data: OrganizationMembership[]; error: { message: string } | null }> {
  const { data, error } = await sb
    .from(ORGANIZATION_MEMBERS_TABLE)
    .select("organization_id, role")
    .eq("clerk_user_id", userId)
    .eq("status", "active");

  return {
    data: ((data ?? []) as OrganizationMembership[]).filter((row) => Boolean(row.organization_id)),
    error: error ? { message: error.message } : null,
  };
}

export async function listActiveOrganizationIds(
  sb: SupabaseClient,
  userId: string,
): Promise<{ data: string[]; error: { message: string } | null }> {
  const memberships = await listActiveMemberships(sb, userId);
  return {
    data: memberships.data.map((row) => row.organization_id),
    error: memberships.error,
  };
}

export async function getDefaultOrganizationId(
  sb: SupabaseClient,
  userId: string,
): Promise<string | null> {
  const { data, error } = await listActiveOrganizationIds(sb, userId);
  if (error || data.length !== 1) return null;
  return data[0] ?? null;
}


export async function listActiveWorkspaceOwnerIds(
  sb: SupabaseClient,
  userId: string,
): Promise<{ data: string[]; error: { message: string } | null }> {
  const orgIds = await listActiveOrganizationIds(sb, userId);
  if (orgIds.error || orgIds.data.length === 0) {
    return { data: [], error: orgIds.error };
  }

  const { data, error } = await sb
    .from("organizations")
    .select("owner_clerk_user_id")
    .in("id", orgIds.data);

  if (error) return { data: [], error: { message: error.message } };

  return {
    data: Array.from(
      new Set(
        ((data ?? []) as Array<{ owner_clerk_user_id?: unknown }>)
          .map((row) => row.owner_clerk_user_id)
          .filter((value): value is string => typeof value === "string" && value.length > 0),
      ),
    ),
    error: null,
  };
}

export async function getOwnedOrganizationId(
  sb: SupabaseClient,
  userId: string,
): Promise<string | null> {
  const { data, error } = await sb
    .from("organizations")
    .select("id")
    .eq("owner_clerk_user_id", userId)
    .maybeSingle();

  if (error || !data) return null;
  const id = (data as { id?: unknown }).id;
  return typeof id === "string" ? id : null;
}
export async function hasOrganizationRole(
  sb: SupabaseClient,
  userId: string,
  organizationId: string,
  allowedRoles: OrganizationRole[] = ["owner", "member"],
): Promise<boolean> {
  const { data, error } = await sb
    .from(ORGANIZATION_MEMBERS_TABLE)
    .select("role")
    .eq("organization_id", organizationId)
    .eq("clerk_user_id", userId)
    .eq("status", "active")
    .maybeSingle();

  if (error || !data) return false;
  return allowedRoles.includes((data as { role: OrganizationRole }).role);
}

