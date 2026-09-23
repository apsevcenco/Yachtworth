import { Router, type IRouter } from "express";
import {
  getSupabase,
  ORGANIZATION_INVITATIONS_TABLE,
  ORGANIZATION_MEMBERS_TABLE,
  ORGANIZATIONS_TABLE,
  YACHTS_TABLE,
} from "../lib/supabase";
import { requireAuth, softClerkAuth } from "../middlewares/clerkAuth";
import { hasOrganizationRole } from "../lib/teamAccess";
import { isUuid } from "../lib/validators";

const router: IRouter = Router();

const TEAM_SEAT_LIMIT = 5;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function cleanName(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const name = value.trim().replace(/\s+/g, " ");
  return name.length >= 2 && name.length <= 120 ? name : null;
}

function cleanEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  return EMAIL_RE.test(email) && email.length <= 254 ? email : null;
}

async function loadOwnedOrganization(sb: ReturnType<typeof getSupabase> extends infer T ? NonNullable<T> : never, userId: string) {
  return sb
    .from(ORGANIZATIONS_TABLE)
    .select("id, name, plan, seat_limit, owner_clerk_user_id, created_at, updated_at")
    .eq("owner_clerk_user_id", userId)
    .maybeSingle();
}

async function attachOwnerYachtsToWorkspace(
  sb: ReturnType<typeof getSupabase> extends infer T ? NonNullable<T> : never,
  organizationId: string,
  ownerUserId: string,
): Promise<{ error: string | null }> {
  const { error } = await sb
    .from(YACHTS_TABLE)
    .update({ organization_id: organizationId })
    .eq("clerk_user_id", ownerUserId)
    .is("organization_id", null);

  return { error: error?.message ?? null };
}
async function loadTeamSnapshot(sb: ReturnType<typeof getSupabase> extends infer T ? NonNullable<T> : never, userId: string) {
  const { data: memberships, error: membershipError } = await sb
    .from(ORGANIZATION_MEMBERS_TABLE)
    .select("organization_id, role, email, display_name, joined_at")
    .eq("clerk_user_id", userId)
    .eq("status", "active")
    .order("joined_at", { ascending: true });

  if (membershipError) return { error: membershipError.message };

  const membershipRows = (memberships ?? []) as Array<{ organization_id: string; role: string }>;
  const orgIds = membershipRows.map((row) => row.organization_id).filter(Boolean);

  if (orgIds.length === 0) {
    return { workspace: null, memberships: [], members: [], invitations: [] };
  }

  const activeOrgId = orgIds[0]!;
  const currentMembership = membershipRows.find((row) => row.organization_id === activeOrgId);
  const orgOwnerRes = await sb
    .from(ORGANIZATIONS_TABLE)
    .select("owner_clerk_user_id")
    .eq("id", activeOrgId)
    .maybeSingle();

  if (orgOwnerRes.error) return { error: orgOwnerRes.error.message };
  const ownerUserId = (orgOwnerRes.data as { owner_clerk_user_id?: string } | null)?.owner_clerk_user_id;
  if (currentMembership?.role === "owner" && ownerUserId === userId) {
    const repair = await attachOwnerYachtsToWorkspace(sb, activeOrgId, userId);
    if (repair.error) return { error: repair.error };
  }

  const [orgRes, memberRes, invitationRes] = await Promise.all([
    sb
      .from(ORGANIZATIONS_TABLE)
      .select("id, name, plan, seat_limit, owner_clerk_user_id, created_at, updated_at")
      .eq("id", activeOrgId)
      .maybeSingle(),
    sb
      .from(ORGANIZATION_MEMBERS_TABLE)
      .select("id, organization_id, clerk_user_id, role, email, display_name, joined_at")
      .eq("organization_id", activeOrgId)
      .eq("status", "active")
      .order("joined_at", { ascending: true }),
    sb
      .from(ORGANIZATION_INVITATIONS_TABLE)
      .select("id, organization_id, email, role, status, created_at, expires_at")
      .eq("organization_id", activeOrgId)
      .eq("status", "pending")
      .order("created_at", { ascending: false }),
  ]);

  const firstError = orgRes.error ?? memberRes.error ?? invitationRes.error;
  if (firstError) return { error: firstError.message };

  return {
    workspace: orgRes.data,
    memberships,
    members: memberRes.data ?? [],
    invitations: invitationRes.data ?? [],
  };
}

router.get(
  "/team/workspace",
  softClerkAuth(),
  requireAuth(),
  async (req, res): Promise<void> => {
    const sb = getSupabase();
    if (!sb) {
      res.status(503).json({ error: "Team workspace storage not configured" });
      return;
    }

    const snapshot = await loadTeamSnapshot(sb, req.userId!);
    if ("error" in snapshot) {
      req.log.error({ err: snapshot.error }, "Load team workspace failed");
      res.status(500).json({ error: snapshot.error });
      return;
    }

    res.json(snapshot);
  },
);

router.post(
  "/team/workspace",
  softClerkAuth(),
  requireAuth(),
  async (req, res): Promise<void> => {
    const name = cleanName((req.body ?? {}).name);
    if (!name) {
      res.status(400).json({ error: "Workspace name must be 2–120 characters." });
      return;
    }

    const sb = getSupabase();
    if (!sb) {
      res.status(503).json({ error: "Team workspace storage not configured" });
      return;
    }

    const existing = await loadOwnedOrganization(sb, req.userId!);
    if (existing.error) {
      req.log.error({ err: existing.error.message }, "Check existing workspace failed");
      res.status(500).json({ error: existing.error.message });
      return;
    }
    if (existing.data) {
      res.status(409).json({ error: "You already own a Team workspace." });
      return;
    }

    const { data: org, error: orgError } = await sb
      .from(ORGANIZATIONS_TABLE)
      .insert({ name, owner_clerk_user_id: req.userId!, seat_limit: TEAM_SEAT_LIMIT })
      .select("id, name, plan, seat_limit, owner_clerk_user_id, created_at, updated_at")
      .single();

    if (orgError || !org) {
      req.log.error({ err: orgError?.message }, "Create team workspace failed");
      res.status(500).json({ error: orgError?.message ?? "Create team workspace failed" });
      return;
    }

    const organizationId = (org as { id: string }).id;
    const { error: memberError } = await sb.from(ORGANIZATION_MEMBERS_TABLE).insert({
      organization_id: organizationId,
      clerk_user_id: req.userId!,
      role: "owner",
      status: "active",
    });

    if (memberError) {
      req.log.error({ err: memberError.message }, "Create owner membership failed");
      res.status(500).json({ error: memberError.message });
      return;
    }

    // Safe migration for the owner: their existing personal yachts become visible
    // to the workspace, while clerk_user_id remains unchanged for compatibility.
    const repair = await attachOwnerYachtsToWorkspace(sb, organizationId, req.userId!);
    if (repair.error) {
      req.log.error({ err: repair.error }, "Attach owner yachts to workspace failed");
      res.status(500).json({ error: repair.error });
      return;
    }

    const snapshot = await loadTeamSnapshot(sb, req.userId!);
    if ("error" in snapshot) {
      req.log.error({ err: snapshot.error }, "Load team workspace after create failed");
      res.status(500).json({ error: snapshot.error });
      return;
    }
    res.status(201).json(snapshot);
  },
);

router.post(
  "/team/invitations",
  softClerkAuth(),
  requireAuth(),
  async (req, res): Promise<void> => {
    const email = cleanEmail((req.body ?? {}).email);
    if (!email) {
      res.status(400).json({ error: "Enter a valid email address." });
      return;
    }

    const sb = getSupabase();
    if (!sb) {
      res.status(503).json({ error: "Team workspace storage not configured" });
      return;
    }

    const owned = await loadOwnedOrganization(sb, req.userId!);
    if (owned.error) {
      res.status(500).json({ error: owned.error.message });
      return;
    }
    if (!owned.data) {
      res.status(403).json({ error: "Only the workspace owner can invite team members." });
      return;
    }

    const organizationId = (owned.data as { id: string }).id;
    const [members, pending] = await Promise.all([
      sb
        .from(ORGANIZATION_MEMBERS_TABLE)
        .select("id", { count: "exact", head: true })
        .eq("organization_id", organizationId)
        .eq("status", "active"),
      sb
        .from(ORGANIZATION_INVITATIONS_TABLE)
        .select("id", { count: "exact", head: true })
        .eq("organization_id", organizationId)
        .eq("status", "pending"),
    ]);

    const firstError = members.error ?? pending.error;
    if (firstError) {
      res.status(500).json({ error: firstError.message });
      return;
    }

    if ((members.count ?? 0) + (pending.count ?? 0) >= TEAM_SEAT_LIMIT) {
      res.status(403).json({ error: `Team plan includes up to ${TEAM_SEAT_LIMIT} seats.` });
      return;
    }

    const { data, error } = await sb
      .from(ORGANIZATION_INVITATIONS_TABLE)
      .insert({
        organization_id: organizationId,
        email,
        role: "member",
        invited_by_clerk_user_id: req.userId!,
      })
      .select("id, organization_id, email, role, status, created_at, expires_at")
      .single();

    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }

    res.status(201).json(data);
  },
);

router.post(
  "/team/invitations/:id/accept",
  softClerkAuth(),
  requireAuth(),
  async (req, res): Promise<void> => {
    const invitationId = req.params["id"];
    if (!invitationId || !isUuid(invitationId)) {
      res.status(404).json({ error: "Invite not found" });
      return;
    }

    const sb = getSupabase();
    if (!sb) {
      res.status(503).json({ error: "Team workspace storage not configured" });
      return;
    }

    const { data: invite, error: inviteError } = await sb
      .from(ORGANIZATION_INVITATIONS_TABLE)
      .select("id, organization_id, status, expires_at")
      .eq("id", invitationId)
      .eq("status", "pending")
      .maybeSingle();

    if (inviteError) {
      res.status(500).json({ error: inviteError.message });
      return;
    }
    if (!invite) {
      res.status(404).json({ error: "Invite not found or already used." });
      return;
    }

    const row = invite as { organization_id: string; expires_at: string };
    if (Date.parse(row.expires_at) < Date.now()) {
      await sb
        .from(ORGANIZATION_INVITATIONS_TABLE)
        .update({ status: "expired" })
        .eq("id", invitationId);
      res.status(410).json({ error: "Invite expired." });
      return;
    }

    const [members, pending] = await Promise.all([
      sb
        .from(ORGANIZATION_MEMBERS_TABLE)
        .select("id", { count: "exact", head: true })
        .eq("organization_id", row.organization_id)
        .eq("status", "active"),
      sb
        .from(ORGANIZATION_INVITATIONS_TABLE)
        .select("id", { count: "exact", head: true })
        .eq("organization_id", row.organization_id)
        .eq("status", "pending"),
    ]);

    const firstError = members.error ?? pending.error;
    if (firstError) {
      res.status(500).json({ error: firstError.message });
      return;
    }

    if ((members.count ?? 0) >= TEAM_SEAT_LIMIT) {
      res.status(403).json({ error: `Team plan includes up to ${TEAM_SEAT_LIMIT} seats.` });
      return;
    }

    const { error: memberError } = await sb.from(ORGANIZATION_MEMBERS_TABLE).upsert(
      {
        organization_id: row.organization_id,
        clerk_user_id: req.userId!,
        role: "member",
        status: "active",
      },
      { onConflict: "organization_id,clerk_user_id" },
    );

    if (memberError) {
      res.status(500).json({ error: memberError.message });
      return;
    }

    await sb
      .from(ORGANIZATION_INVITATIONS_TABLE)
      .update({
        status: "accepted",
        accepted_by_clerk_user_id: req.userId!,
        accepted_at: new Date().toISOString(),
      })
      .eq("id", invitationId);

    const snapshot = await loadTeamSnapshot(sb, req.userId!);
    res.json(snapshot);
  },
);

router.delete(
  "/team/invitations/:id",
  softClerkAuth(),
  requireAuth(),
  async (req, res): Promise<void> => {
    const invitationId = req.params["id"];
    if (!invitationId || !isUuid(invitationId)) {
      res.status(404).json({ error: "Invite not found" });
      return;
    }

    const sb = getSupabase();
    if (!sb) {
      res.status(503).json({ error: "Team workspace storage not configured" });
      return;
    }

    const { data: invite, error: inviteError } = await sb
      .from(ORGANIZATION_INVITATIONS_TABLE)
      .select("organization_id")
      .eq("id", invitationId)
      .eq("status", "pending")
      .maybeSingle();

    if (inviteError) {
      res.status(500).json({ error: inviteError.message });
      return;
    }
    if (!invite) {
      res.status(404).json({ error: "Invite not found" });
      return;
    }

    const organizationId = (invite as { organization_id: string }).organization_id;
    const canManage = await hasOrganizationRole(sb, req.userId!, organizationId, ["owner"]);
    if (!canManage) {
      res.status(403).json({ error: "Only the workspace owner can revoke invites." });
      return;
    }

    const { error } = await sb
      .from(ORGANIZATION_INVITATIONS_TABLE)
      .update({ status: "revoked" })
      .eq("id", invitationId);

    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }

    res.status(204).send();
  },
);

export default router;


