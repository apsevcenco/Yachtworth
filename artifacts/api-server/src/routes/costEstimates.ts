import { Router, type IRouter } from "express";
import { CalculateCostEstimateBody } from "@workspace/api-zod";
import { computeCostEstimate } from "../lib/cost-estimate";
import { getSupabase, COST_ESTIMATES_TABLE } from "../lib/supabase";
import { requireAuth, softClerkAuth } from "../middlewares/clerkAuth";
import { isUuid } from "../lib/validators";

const router: IRouter = Router();

const LIST_COLUMNS =
  "id, created_at, name, yacht_name, yacht_class, length_meters, year_built, region, usage_type, total_annual_eur, currency";

const DETAIL_COLUMNS = `${LIST_COLUMNS}, input, result`;

router.post(
  "/cost-estimates",
  softClerkAuth(),
  async (req, res): Promise<void> => {
    const parsed = CalculateCostEstimateBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    let result;
    try {
      result = computeCostEstimate(parsed.data);
    } catch (err) {
      req.log.error(
        { err: err instanceof Error ? err.message : String(err) },
        "Cost estimate computation failed",
      );
      res.status(500).json({ error: "Could not compute estimate" });
      return;
    }

    // Guests: return result without persisting.
    if (!req.userId) {
      res.json({ id: null, created_at: null, result });
      return;
    }

    const sb = getSupabase();
    if (!sb) {
      req.log.warn("Supabase not configured — cost estimate not persisted");
      res.json({ id: null, created_at: null, result });
      return;
    }

    const insertRow = {
      clerk_user_id: req.userId,
      name: null as string | null,
      yacht_name: parsed.data.yacht_name ?? null,
      yacht_class: parsed.data.yacht_class,
      length_meters: parsed.data.length_meters,
      year_built: parsed.data.year_built,
      region: parsed.data.region,
      usage_type: parsed.data.usage_type,
      total_annual_eur: result.total_annual_eur,
      currency: result.currency,
      input: parsed.data,
      result,
    };
    const { data, error } = await sb
      .from(COST_ESTIMATES_TABLE)
      .insert(insertRow)
      .select("id, created_at")
      .single();
    if (error) {
      req.log.error({ err: error.message }, "Persist cost estimate failed");
      // Still return result; persistence is best-effort.
      res.json({ id: null, created_at: null, result });
      return;
    }
    res.json({ id: data.id, created_at: data.created_at, result });
  },
);

router.get(
  "/cost-estimates",
  softClerkAuth(),
  requireAuth(),
  async (req, res): Promise<void> => {
    const sb = getSupabase();
    if (!sb) {
      res.status(503).json({ error: "Storage not configured" });
      return;
    }
    const { data, error } = await sb
      .from(COST_ESTIMATES_TABLE)
      .select(LIST_COLUMNS)
      .eq("clerk_user_id", req.userId!)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) {
      req.log.error({ err: error.message }, "List cost estimates failed");
      res.status(500).json({ error: error.message });
      return;
    }
    res.json({ items: data ?? [] });
  },
);

router.get(
  "/cost-estimates/:id",
  softClerkAuth(),
  requireAuth(),
  async (req, res): Promise<void> => {
    if (!isUuid(req.params["id"])) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    const sb = getSupabase();
    if (!sb) {
      res.status(503).json({ error: "Storage not configured" });
      return;
    }
    const { data, error } = await sb
      .from(COST_ESTIMATES_TABLE)
      .select(DETAIL_COLUMNS)
      .eq("clerk_user_id", req.userId!)
      .eq("id", req.params["id"])
      .maybeSingle();
    if (error) {
      req.log.error({ err: error.message }, "Get cost estimate failed");
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

router.delete(
  "/cost-estimates/:id",
  softClerkAuth(),
  requireAuth(),
  async (req, res): Promise<void> => {
    if (!isUuid(req.params["id"])) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    const sb = getSupabase();
    if (!sb) {
      res.status(503).json({ error: "Storage not configured" });
      return;
    }
    const { error, count } = await sb
      .from(COST_ESTIMATES_TABLE)
      .delete({ count: "exact" })
      .eq("clerk_user_id", req.userId!)
      .eq("id", req.params["id"]);
    if (error) {
      req.log.error({ err: error.message }, "Delete cost estimate failed");
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
