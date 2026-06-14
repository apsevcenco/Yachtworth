import { Router, type IRouter } from "express";
import { getSupabase, CHARTERS_TABLE, CLIENTS_TABLE } from "../lib/supabase";
import { requireAuth, softClerkAuth } from "../middlewares/clerkAuth";
import { CreateCharterBody, UpdateCharterBody } from "@workspace/api-zod";
import { isUuid } from "../lib/validators";

const router: IRouter = Router();

const CHARTER_COLUMNS =
  "id, yacht_id, clerk_user_id, created_at, updated_at, status, client_name, client_email, client_phone, start_date, end_date, departure_port, return_port, engine_hours_before, engine_hours_after, fuel_liters, fuel_price_per_liter, captain_name, captain_day_rate, stewardess_count, stewardess_day_rate, extra_crew_cost, extra_crew_note, charter_rate_type, charter_rate, deposit_amount, deposit_date, deposit_received, final_payment_amount, final_payment_date, final_payment_received, vat_applicable, vat_percent, port_fees, provisioning, cleaning, other_expenses, other_expenses_note, notes, " +
  // Phase 3.1 (May 2026) — VAT-on-top + APA + distribution + extra fields
  "contact_name, contract_status, contract_date, mooring_port, pickup_port, dropoff_port, transfer_fee, transfer_fee_note, transfer_fee_paid_by, departure_time, return_time, apa_enabled, apa_percent, apa_amount, apa_fuel, apa_provisioning, apa_beverages, apa_marina_fees, apa_communications, apa_crew_gratuities, apa_activities, apa_activities_note, apa_other, apa_other_note, refund_amount, refund_reason, extra_service_amount, extra_service_note, damage_amount, damage_note, damage_paid_by, first_officer_name, first_officer_day_rate, chef_included, chef_day_rate, deckhand_count, deckhand_day_rate, distribution, " +
  // Migration 010 — Central Agent + Sub-agents commission structure
  "central_agent_name, central_agent_type, central_agent_value, sub_agents";

function isIsoDate(v: unknown): v is string {
  return typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);
}

function isValidDateRange(start: string, end: string): boolean {
  return isIsoDate(start) && isIsoDate(end) && start <= end;
}

function normalizeClientName(name: string | null | undefined): string | null {
  if (!name) return null;
  const trimmed = name.trim().replace(/\s+/g, " ");
  return trimmed.length > 0 ? trimmed : null;
}

const BLOCKING_CHARTER_STATUSES = [
  "confirmed",
  "tentative",
  "maintenance",
  "blocked",
] as const;

function charterBlocksCalendar(status: unknown): boolean {
  return (
    typeof status === "string" &&
    BLOCKING_CHARTER_STATUSES.includes(
      status as (typeof BLOCKING_CHARTER_STATUSES)[number],
    )
  );
}

async function findConflictingCharter(
  sb: NonNullable<ReturnType<typeof getSupabase>>,
  userId: string,
  payload: {
    yacht_id: string;
    status?: string | null;
    start_date: string;
    end_date: string;
  },
  ignoreId?: string,
): Promise<{ id: string; status: string; start_date: string; end_date: string } | null> {
  if (!charterBlocksCalendar(payload.status ?? "confirmed")) return null;
  let q = sb
    .from(CHARTERS_TABLE)
    .select("id, status, start_date, end_date")
    .eq("clerk_user_id", userId)
    .eq("yacht_id", payload.yacht_id)
    .in("status", [...BLOCKING_CHARTER_STATUSES])
    .lte("start_date", payload.end_date)
    .gte("end_date", payload.start_date)
    .limit(1);
  if (ignoreId) q = q.neq("id", ignoreId);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  const first = (data ?? [])[0] as
    | { id: string; status: string; start_date: string; end_date: string }
    | undefined;
  return first ?? null;
}

// Charter columns that are NOT NULL with a numeric DB default. Clients may
// legitimately send `null` for "empty" fields; coerce to the migration default
// so DB defaults are honored without round-tripping. Map = column → default.
// NB: apa_percent default is 30, not 0 (migration 009).
const NOT_NULL_NUMERIC_DEFAULTS: Record<string, number> = {
  transfer_fee: 0,
  // Owner expenses (migration 008: NOT NULL DEFAULT 0). These are optional in
  // the UI — an empty field arrives as `null`. Coerce to 0 so leaving them
  // blank never trips the NOT NULL constraint (i.e. never "required" on save).
  port_fees: 0,
  provisioning: 0,
  cleaning: 0,
  other_expenses: 0,
  apa_percent: 30,
  apa_amount: 0,
  apa_fuel: 0,
  apa_provisioning: 0,
  apa_beverages: 0,
  apa_marina_fees: 0,
  apa_communications: 0,
  apa_crew_gratuities: 0,
  apa_activities: 0,
  apa_other: 0,
  refund_amount: 0,
  extra_service_amount: 0,
  damage_amount: 0,
  first_officer_day_rate: 0,
  chef_day_rate: 0,
  deckhand_count: 0,
  deckhand_day_rate: 0,
  central_agent_value: 10,
};

// Only coerce keys that are explicitly present and `null`. Missing/undefined
// keys (PATCH semantics) are left untouched so partial updates don't clobber
// existing column values with defaults.
function normalizeCharterPayload<T extends Record<string, unknown>>(p: T): T {
  const out: Record<string, unknown> = { ...p };
  for (const [k, def] of Object.entries(NOT_NULL_NUMERIC_DEFAULTS)) {
    if (k in out && out[k] === null) out[k] = def;
  }
  // Non-numeric NOT NULL columns from migration 010 — coerce explicit null
  // to safe defaults so a client-sent `null` (allowed by OpenAPI) never trips
  // a NOT NULL constraint.
  if ("central_agent_type" in out && out["central_agent_type"] === null) {
    out["central_agent_type"] = "percent_net";
  }
  if ("sub_agents" in out && out["sub_agents"] === null) {
    out["sub_agents"] = [];
  }
  return out as T;
}

async function assertYachtOwned(
  sb: NonNullable<ReturnType<typeof getSupabase>>,
  userId: string,
  yachtId: string,
): Promise<boolean> {
  const { data } = await sb
    .from("yachts")
    .select("id")
    .eq("clerk_user_id", userId)
    .eq("id", yachtId)
    .maybeSingle();
  return !!data;
}

async function upsertClientFromCharter(
  sb: ReturnType<typeof getSupabase>,
  userId: string,
  name: string | null | undefined,
  email: string | null | undefined,
  phone: string | null | undefined,
): Promise<void> {
  const normalized = normalizeClientName(name);
  if (!sb || !normalized) return;
  const payload: Record<string, unknown> = {
    clerk_user_id: userId,
    name: normalized,
    updated_at: new Date().toISOString(),
  };
  if (email) payload["email"] = email;
  if (phone) payload["phone"] = phone;
  await sb
    .from(CLIENTS_TABLE)
    .upsert(payload, { onConflict: "clerk_user_id,name" });
}

router.get(
  "/charters",
  softClerkAuth(),
  requireAuth(),
  async (req, res): Promise<void> => {
    const sb = getSupabase();
    if (!sb) {
      res.status(503).json({ error: "Charter storage not configured" });
      return;
    }
    const { yacht_id, start, end } = req.query as Record<
      string,
      string | undefined
    >;
    let q = sb
      .from(CHARTERS_TABLE)
      .select(CHARTER_COLUMNS)
      .eq("clerk_user_id", req.userId!)
      .order("start_date", { ascending: true })
      .limit(500);
    if (yacht_id && isUuid(yacht_id)) q = q.eq("yacht_id", yacht_id);
    if (start && isIsoDate(start)) q = q.gte("end_date", start);
    if (end && isIsoDate(end)) q = q.lte("start_date", end);
    const { data, error } = await q;
    if (error) {
      req.log.error({ err: error.message }, "List charters failed");
      res.status(500).json({ error: error.message });
      return;
    }
    res.json({ items: data ?? [] });
  },
);

router.post(
  "/charters",
  softClerkAuth(),
  requireAuth(),
  async (req, res): Promise<void> => {
    const parsed = CreateCharterBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const sb = getSupabase();
    if (!sb) {
      res.status(503).json({ error: "Charter storage not configured" });
      return;
    }
    if (!isUuid(parsed.data.yacht_id)) {
      res.status(400).json({ error: "Invalid yacht_id" });
      return;
    }
    if (!isValidDateRange(parsed.data.start_date, parsed.data.end_date)) {
      res.status(400).json({ error: "Invalid charter date range" });
      return;
    }
    // Verify yacht ownership (no IDOR)
    if (!(await assertYachtOwned(sb, req.userId!, parsed.data.yacht_id))) {
      res.status(404).json({ error: "Yacht not found" });
      return;
    }
    try {
      const conflict = await findConflictingCharter(sb, req.userId!, {
        yacht_id: parsed.data.yacht_id,
        status: parsed.data.status,
        start_date: parsed.data.start_date,
        end_date: parsed.data.end_date,
      });
      if (conflict) {
        res.status(409).json({
          error: `Date conflict with ${conflict.status} charter from ${conflict.start_date} to ${conflict.end_date}`,
          conflict,
        });
        return;
      }
    } catch (err) {
      req.log.error(
        { err: err instanceof Error ? err.message : String(err) },
        "Charter conflict check failed",
      );
      res.status(500).json({ error: "Could not check charter availability" });
      return;
    }
    const insertPayload = normalizeCharterPayload({
      ...parsed.data,
      client_name: normalizeClientName(parsed.data.client_name),
      clerk_user_id: req.userId!,
    });
    const { data, error } = await sb
      .from(CHARTERS_TABLE)
      .insert(insertPayload)
      .select(CHARTER_COLUMNS)
      .single();
    if (error) {
      req.log.error({ err: error.message }, "Create charter failed");
      res.status(500).json({ error: error.message });
      return;
    }
    const row = data as unknown as Record<string, unknown>;
    await upsertClientFromCharter(
      sb,
      req.userId!,
      (row["client_name"] as string | null) ?? null,
      (row["client_email"] as string | null) ?? null,
      (row["client_phone"] as string | null) ?? null,
    ).catch((err: unknown) => {
      req.log.warn(
        { err: err instanceof Error ? err.message : String(err) },
        "Client upsert failed (non-fatal)",
      );
    });
    res.status(201).json(data);
  },
);

router.get(
  "/charters/:id",
  softClerkAuth(),
  requireAuth(),
  async (req, res): Promise<void> => {
    if (!isUuid(req.params["id"])) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    const sb = getSupabase();
    if (!sb) {
      res.status(503).json({ error: "Charter storage not configured" });
      return;
    }
    const { data, error } = await sb
      .from(CHARTERS_TABLE)
      .select(CHARTER_COLUMNS)
      .eq("clerk_user_id", req.userId!)
      .eq("id", req.params["id"])
      .maybeSingle();
    if (error) {
      req.log.error({ err: error.message }, "Get charter failed");
      res.status(500).json({ error: error.message });
      return;
    }
    if (!data) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json(data);
  },
);

router.patch(
  "/charters/:id",
  softClerkAuth(),
  requireAuth(),
  async (req, res): Promise<void> => {
    if (!isUuid(req.params["id"])) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    const parsed = UpdateCharterBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const sb = getSupabase();
    if (!sb) {
      res.status(503).json({ error: "Charter storage not configured" });
      return;
    }
    // Re-check yacht ownership on every PATCH (no IDOR via yacht_id swap)
    if (
      !isUuid(parsed.data.yacht_id) ||
      !(await assertYachtOwned(sb, req.userId!, parsed.data.yacht_id))
    ) {
      res.status(404).json({ error: "Yacht not found" });
      return;
    }
    if (!isValidDateRange(parsed.data.start_date, parsed.data.end_date)) {
      res.status(400).json({ error: "Invalid charter date range" });
      return;
    }
    try {
      const conflict = await findConflictingCharter(
        sb,
        req.userId!,
        {
          yacht_id: parsed.data.yacht_id,
          status: parsed.data.status,
          start_date: parsed.data.start_date,
          end_date: parsed.data.end_date,
        },
        req.params["id"],
      );
      if (conflict) {
        res.status(409).json({
          error: `Date conflict with ${conflict.status} charter from ${conflict.start_date} to ${conflict.end_date}`,
          conflict,
        });
        return;
      }
    } catch (err) {
      req.log.error(
        { err: err instanceof Error ? err.message : String(err) },
        "Charter conflict check failed",
      );
      res.status(500).json({ error: "Could not check charter availability" });
      return;
    }
    const updatePayload = normalizeCharterPayload({
      ...parsed.data,
      client_name: normalizeClientName(parsed.data.client_name),
    });
    const { data, error } = await sb
      .from(CHARTERS_TABLE)
      .update(updatePayload)
      .eq("clerk_user_id", req.userId!)
      .eq("id", req.params["id"])
      .select(CHARTER_COLUMNS)
      .maybeSingle();
    if (error) {
      req.log.error({ err: error.message }, "Update charter failed");
      res.status(500).json({ error: error.message });
      return;
    }
    if (!data) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    const row = data as unknown as Record<string, unknown>;
    await upsertClientFromCharter(
      sb,
      req.userId!,
      (row["client_name"] as string | null) ?? null,
      (row["client_email"] as string | null) ?? null,
      (row["client_phone"] as string | null) ?? null,
    ).catch((err: unknown) => {
      req.log.warn(
        { err: err instanceof Error ? err.message : String(err) },
        "Client upsert failed (non-fatal)",
      );
    });
    res.json(data);
  },
);

router.delete(
  "/charters/:id",
  softClerkAuth(),
  requireAuth(),
  async (req, res): Promise<void> => {
    if (!isUuid(req.params["id"])) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    const sb = getSupabase();
    if (!sb) {
      res.status(503).json({ error: "Charter storage not configured" });
      return;
    }
    const { error, count } = await sb
      .from(CHARTERS_TABLE)
      .delete({ count: "exact" })
      .eq("clerk_user_id", req.userId!)
      .eq("id", req.params["id"]);
    if (error) {
      req.log.error({ err: error.message }, "Delete charter failed");
      res.status(500).json({ error: error.message });
      return;
    }
    if (!count) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.status(204).send();
  },
);

export default router;
