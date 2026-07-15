import { Router, type IRouter } from "express";
import { getSupabase, CHARTERS_TABLE, CLIENTS_TABLE } from "../lib/supabase";
import { requireAuth, softClerkAuth } from "../middlewares/clerkAuth";
import { forClerkUser } from "../lib/clerkUserFilter";
import { isUuid } from "../lib/validators";

const router: IRouter = Router();

const CLIENT_COLUMNS =
  "id, clerk_user_id, created_at, updated_at, name, email, phone, notes";

type CharterAggRow = {
  client_name: string | null;
  status?: string | null;
  start_date: string;
  end_date: string;
  charter_rate: number | null;
  charter_rate_type: string;
  vat_applicable: boolean;
  vat_percent: number;
};

function daysInclusive(start: string, end: string): number {
  const mS = /^(\d{4})-(\d{2})-(\d{2})/.exec(start);
  const mE = /^(\d{4})-(\d{2})-(\d{2})/.exec(end);
  if (!mS || !mE) return 0;
  const s = Date.UTC(+mS[1]!, +mS[2]! - 1, +mS[3]!);
  const e = Date.UTC(+mE[1]!, +mE[2]! - 1, +mE[3]!);
  if (e < s) return 0;
  return Math.round((e - s) / 86400000) + 1;
}

function countsAsRevenue(c: CharterAggRow): boolean {
  return (
    c.status !== "cancelled" &&
    c.status !== "blocked" &&
    c.status !== "maintenance"
  );
}

function computeGrossRevenue(c: CharterAggRow): number {
  if (c.charter_rate == null) return 0;
  const days = daysInclusive(c.start_date, c.end_date);
  if (c.charter_rate_type === "per_day") {
    return c.charter_rate * days;
  }
  if (c.charter_rate_type === "per_week") {
    return c.charter_rate * (days / 7);
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
        forClerkUser(sb.from(CLIENTS_TABLE).select(CLIENT_COLUMNS), req.userId!)
          .order("updated_at", { ascending: false })
          .limit(500),
        forClerkUser(
          sb
            .from(CHARTERS_TABLE)
            .select(
              "client_name, status, start_date, end_date, charter_rate, charter_rate_type, vat_applicable, vat_percent",
            ),
          req.userId!,
        )
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
      if (countsAsRevenue(ch)) agg.revenue += computeGrossRevenue(ch);
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
    const { data: client, error: cErr } = await forClerkUser(
      sb.from(CLIENTS_TABLE).select(CLIENT_COLUMNS),
      req.userId!,
    )
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
    const { data: charters, error: chErr } = await forClerkUser(
      sb.from(CHARTERS_TABLE).select("*"),
      req.userId!,
    )
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
      if (countsAsRevenue(ch)) revenue += computeGrossRevenue(ch);
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
