import { Router, type IRouter } from "express";
import { getSupabase, CHARTERS_TABLE, CLIENTS_TABLE } from "../lib/supabase";
import { requireAuth, softClerkAuth } from "../middlewares/clerkAuth";
import { CreateCharterBody, UpdateCharterBody } from "@workspace/api-zod";
import { isUuid } from "../lib/validators";

const router: IRouter = Router();

const CHARTER_COLUMNS =
  "id, yacht_id, clerk_user_id, created_at, updated_at, status, client_name, client_email, client_phone, start_date, end_date, departure_port, return_port, engine_hours_before, engine_hours_after, fuel_liters, fuel_price_per_liter, captain_name, captain_day_rate, stewardess_count, stewardess_day_rate, extra_crew_cost, extra_crew_note, charter_rate_type, charter_rate, deposit_amount, deposit_date, deposit_received, final_payment_amount, final_payment_date, final_payment_received, vat_applicable, vat_percent, port_fees, provisioning, cleaning, other_expenses, other_expenses_note, notes";

function isIsoDate(v: unknown): v is string {
  return typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);
}

function normalizeClientName(name: string | null | undefined): string | null {
  if (!name) return null;
  const trimmed = name.trim().replace(/\s+/g, " ");
  return trimmed.length > 0 ? trimmed : null;
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
    // Verify yacht ownership (no IDOR)
    if (!(await assertYachtOwned(sb, req.userId!, parsed.data.yacht_id))) {
      res.status(404).json({ error: "Yacht not found" });
      return;
    }
    const insertPayload = {
      ...parsed.data,
      client_name: normalizeClientName(parsed.data.client_name),
      clerk_user_id: req.userId!,
    };
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
    await upsertClientFromCharter(
      sb,
      req.userId!,
      data.client_name,
      data.client_email,
      data.client_phone,
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
    const updatePayload = {
      ...parsed.data,
      client_name: normalizeClientName(parsed.data.client_name),
    };
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
    await upsertClientFromCharter(
      sb,
      req.userId!,
      data.client_name,
      data.client_email,
      data.client_phone,
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
