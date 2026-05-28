import { Router, type IRouter } from "express";
import { ESTIMATES_TABLE, getSupabase } from "../lib/supabase";
import { isUuid } from "../lib/validators";
import { requireAuth, softClerkAuth } from "../middlewares/clerkAuth";

const router: IRouter = Router();

router.get(
  "/estimates",
  softClerkAuth(),
  requireAuth(),
  async (req, res): Promise<void> => {
    const sb = getSupabase();
    if (!sb) {
      res.status(503).json({ error: "History storage not configured" });
      return;
    }
    let query = sb
      .from(ESTIMATES_TABLE)
      .select(
        "id, created_at, yacht_id, yacht_label, yacht_type, length_meters, estimated_price_eur, currency",
      )
      .eq("clerk_user_id", req.userId!);
    const yachtIdQ = req.query["yacht_id"];
    if (typeof yachtIdQ === "string" && yachtIdQ) {
      if (!isUuid(yachtIdQ)) {
        res.status(400).json({ error: "Invalid yacht_id" });
        return;
      }
      query = query.eq("yacht_id", yachtIdQ);
    }
    const { data, error } = await query
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) {
      req.log.error({ err: error.message }, "List estimates failed");
      res.status(500).json({ error: error.message });
      return;
    }
    res.json({ items: data ?? [] });
  },
);

router.get(
  "/estimates/:id",
  softClerkAuth(),
  requireAuth(),
  async (req, res): Promise<void> => {
    const sb = getSupabase();
    if (!sb) {
      res.status(503).json({ error: "History storage not configured" });
      return;
    }
    const { data, error } = await sb
      .from(ESTIMATES_TABLE)
      .select("id, created_at, request, result")
      .eq("clerk_user_id", req.userId!)
      .eq("id", req.params["id"])
      .maybeSingle();
    if (error) {
      req.log.error({ err: error.message }, "Get estimate failed");
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
  "/estimates/:id",
  softClerkAuth(),
  requireAuth(),
  async (req, res): Promise<void> => {
    if (!isUuid(req.params["id"])) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    const sb = getSupabase();
    if (!sb) {
      res.status(503).json({ error: "History storage not configured" });
      return;
    }
    const { error, count } = await sb
      .from(ESTIMATES_TABLE)
      .delete({ count: "exact" })
      .eq("clerk_user_id", req.userId!)
      .eq("id", req.params["id"]);
    if (error) {
      req.log.error({ err: error.message }, "Delete estimate failed");
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
