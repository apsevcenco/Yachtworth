import { customFetch } from "@workspace/api-client-react";

export type TeamWorkspace = {
  id: string;
  name: string;
  plan: "team";
  seat_limit: number;
  owner_clerk_user_id: string;
  created_at: string;
  updated_at: string;
};

export type TeamMember = {
  id: string;
  organization_id: string;
  clerk_user_id: string;
  role: "owner" | "member";
  email?: string | null;
  display_name?: string | null;
  joined_at: string;
};

export type TeamInvitation = {
  id: string;
  organization_id: string;
  email: string;
  role: "member";
  status: "pending" | "accepted" | "revoked" | "expired";
  created_at: string;
  expires_at: string;
};

export type TeamSnapshot = {
  workspace: TeamWorkspace | null;
  memberships: Array<{
    organization_id: string;
    role: "owner" | "member";
    email?: string | null;
    display_name?: string | null;
    joined_at: string;
  }>;
  members: TeamMember[];
  invitations: TeamInvitation[];
};

export async function getTeamWorkspace(): Promise<TeamSnapshot> {
  return customFetch<TeamSnapshot>("/api/team/workspace", { responseType: "json" });
}

export async function createTeamWorkspace(name: string): Promise<TeamSnapshot> {
  return customFetch<TeamSnapshot>("/api/team/workspace", {
    method: "POST",
    body: JSON.stringify({ name }),
    responseType: "json",
  });
}

export async function createTeamInvitation(email: string): Promise<TeamInvitation> {
  return customFetch<TeamInvitation>("/api/team/invitations", {
    method: "POST",
    body: JSON.stringify({ email }),
    responseType: "json",
  });
}

export async function acceptTeamInvitation(inviteId: string): Promise<TeamSnapshot> {
  return customFetch<TeamSnapshot>(`/api/team/invitations/${encodeURIComponent(inviteId)}/accept`, {
    method: "POST",
    responseType: "json",
  });
}

export async function revokeTeamInvitation(inviteId: string): Promise<void> {
  await customFetch<void>(`/api/team/invitations/${encodeURIComponent(inviteId)}`, {
    method: "DELETE",
  });
}

