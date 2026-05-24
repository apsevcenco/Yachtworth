import { Router, type IRouter } from "express";
import { getSupabase, CHARTERS_TABLE, CLIENTS_TABLE } from "../lib/supabase";
import { requireAuth, softClerkAuth } from "../middlewares/clerkAuth";
import { isUuid } from "../lib/validators";

const router: IRouter = Router();

const CLIENT_COLUMNS =
  "id, clerk_user_id, created_at, updated_at, name, email, phone, notes";

type CharterAggRow = {
  client_name: string | null;
  start_date: string;
  charter_rate: number | null;
  charter_rate_type: string;
  vat_applicable: boolean;
  vat_percent: number;
  start_date_iso?: never;
  end_date: string;
};

function computeGrossRevenue(c: CharterAggRow): number {
  if (c.charter_rate == null) return 0;
  if (c.charter_rate_type === "per_day") {
    const start = new Date(c.start_date);
    const end = new Date(c.end_date);
    const days =
      Math.max(0, Math.round((end.getTime() - start.getTime()) / 86400000)) + 1;
    return c.charter_rate * days;
  }
  return c.charter_rate;
}

router.get(
  "/clients",
  softClerkAuth(),
  requireAuth(),
  async (req, res): Promise<void> => {
    const sb = getSupabase();
    if (!sb) {
      res.status(503).json({ error: "Client storage not configured" });
      return;
    }
    const [{ data: clients, error: cErr }, { data: charters, error: chErr }] =
      await Promise.all([
        sb
          .from(CLIENTS_TABLE)
          .select(CLIENT_COLUMNS)
          .eq("clerk_user_id", req.userId!)
          .order("updated_at", { ascending: false })
          .limit(500),
        sb
          .from(CHARTERS_TABLE)
          .select(
            "client_name, start_date, end_date, charter_rate, charter_rate_type, vat_applicable, vat_percent",
          )
          .eq("clerk_user_id", req.userId!)
          .not("client_name", "is", null)
          .limit(2000),
      ]);
    if (cErr || chErr) {
      const msg = cErr?.message ?? chErr?.message ?? "unknown";
      req.log.error({ err: msg }, "List clients failed");
      res.status(500).json({ error: msg });
      return;
    }
    type Agg = { count: number; revenue: number; last: string | null };
    const byName = new Map<string, Agg>();
    for (const ch of (charters ?? []) as CharterAggRow[]) {
      if (!ch.client_name) continue;
      const key = ch.client_name.trim();
      if (!key) continue;
      const agg = byName.get(key) ?? { count: 0, revenue: 0, last: null };
      agg.count += 1;
      agg.revenue += computeGrossRevenue(ch);
      if (!agg.last || ch.start_date > agg.last) agg.last = ch.start_date;
      byName.set(key, agg);
    }
    const items = (clients ?? []).map((c) => {
      const agg = byName.get(c.name) ?? { count: 0, revenue: 0, last: null };
      return {
        ...c,
        charters_count: agg.count,
        total_revenue_eur: Math.round(agg.revenue * 100) / 100,
        last_charter_date: agg.last,
      };
    });
    res.json({ items });
  },
);

router.get(
  "/clients/:id",
  softClerkAuth(),
  requireAuth(),
  async (req, res): Promise<void> => {
    if (!isUuid(req.params["id"])) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    const sb = getSupabase();
    if (!sb) {
      res.status(503).json({ error: "Client storage not configured" });
      return;
    }
    const { data: client, error: cErr } = await sb
      .from(CLIENTS_TABLE)
      .select(CLIENT_COLUMNS)
      .eq("clerk_user_id", req.userId!)
      .eq("id", req.params["id"])
      .maybeSingle();
    if (cErr) {
      req.log.error({ err: cErr.message }, "Get client failed");
      res.status(500).json({ error: cErr.message });
      return;
    }
    if (!client) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    const { data: charters, error: chErr } = await sb
      .from(CHARTERS_TABLE)
      .select(
        "id, yacht_id, clerk_user_id, created_at, updated_at, status, client_name, client_email, client_phone, start_date, end_date, departure_port, return_port, engine_hours_before, engine_hours_after, fuel_liters, fuel_price_per_liter, captain_name, captain_day_rate, stewardess_count, stewardess_day_rate, extra_crew_cost, extra_crew_note, charter_rate_type, charter_rate, deposit_amount, deposit_date, deposit_received, final_payment_amount, final_payment_date, final_payment_received, vat_applicable, vat_percent, port_fees, provisioning, cleaning, other_expenses, other_expenses_note, notes",
      )
      .eq("clerk_user_id", req.userId!)
      .eq("client_name", client.name)
      .order("start_date", { ascending: false })
      .limit(500);
    if (chErr) {
      req.log.error({ err: chErr.message }, "Charters for client failed");
      res.status(500).json({ error: chErr.message });
      return;
    }
    const list = (charters ?? []) as CharterAggRow[];
    let revenue = 0;
    let last: string | null = null;
    for (const ch of list) {
      revenue += computeGrossRevenue(ch);
      if (!last || ch.start_date > last) last = ch.start_date;
    }
    res.json({
      client: {
        ...client,
        charters_count: list.length,
        total_revenue_eur: Math.round(revenue * 100) / 100,
        last_charter_date: last,
      },
      charters: charters ?? [],
    });
  },
);

export default router;
