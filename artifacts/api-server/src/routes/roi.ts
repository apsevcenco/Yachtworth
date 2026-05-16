import { Router, type IRouter } from "express";
import { getSupabase, ROI_CALCULATIONS_TABLE } from "../lib/supabase";
import { requireAuth, softClerkAuth } from "../middlewares/clerkAuth";
import { isUuid } from "../lib/validators";

const router: IRouter = Router();

/**
 * Stage 1 contract stub. Real engine (deterministic Expense Engine + AI
 * Revenue/Forecast + Depreciation) lands in Stages 3–5. The endpoint is
 * locked in OpenAPI so the mobile client and codegen can build against it
 * already; calling it today returns 501.
 */
router.post(
  "/roi/calculate",
  softClerkAuth(),
  requireAuth(),
  async (_req, res): Promise<void> => {
    res
      .status(501)
      .json({ error: "Charter ROI engine not implemented yet (Stages 3–5)" });
  },
);

router.get(
  "/roi/calculations",
  softClerkAuth(),
  requireAuth(),
  async (req, res): Promise<void> => {
    const sb = getSupabase();
    if (!sb) {
      res.status(503).json({ error: "ROI storage not configured" });
      return;
    }
    let query = sb
      .from(ROI_CALCULATIONS_TABLE)
      .select(
        "id, yacht_id, created_at, region, annual_revenue_eur, annual_expenses_eur, net_profit_eur, roi_pct, payback_years",
      )
      .eq("clerk_user_id", req.userId!)
      .order("created_at", { ascending: false })
      .limit(50);
    const yachtId = req.query["yacht_id"];
    if (typeof yachtId === "string") {
      if (!isUuid(yachtId)) {
        res.status(400).json({ error: "Invalid yacht_id" });
        return;
      }
      query = query.eq("yacht_id", yachtId);
    }
    const { data, error } = await query;
    if (error) {
      req.log.error({ err: error.message }, "List ROI calculations failed");
      res.status(500).json({ error: error.message });
      return;
    }
    res.json({ items: data ?? [] });
  },
);

router.get(
  "/roi/calculations/:id",
  softClerkAuth(),
  requireAuth(),
  async (req, res): Promise<void> => {
    if (!isUuid(req.params["id"])) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    const sb = getSupabase();
    if (!sb) {
      res.status(503).json({ error: "ROI storage not configured" });
      return;
    }
    const { data, error } = await sb
      .from(ROI_CALCULATIONS_TABLE)
      .select("id, yacht_id, created_at, input, result")
      .eq("clerk_user_id", req.userId!)
      .eq("id", req.params["id"])
      .maybeSingle();
    if (error) {
      req.log.error({ err: error.message }, "Get ROI calculation failed");
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

export default router;
