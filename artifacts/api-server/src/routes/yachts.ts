import { Router, type IRouter } from "express";
import { getSupabase, YACHTS_TABLE } from "../lib/supabase";
import { requireAuth, softClerkAuth } from "../middlewares/clerkAuth";
import { CreateYachtBody, UpdateYachtBody } from "@workspace/api-zod";
import { isUuid } from "../lib/validators";

const router: IRouter = Router();

const YACHT_COLUMNS =
  "id, clerk_user_id, created_at, updated_at, name, brand, model, year_built, yacht_type, configuration, length_meters, beam_meters, cabins, guests, crew, engine_hours, marina_location, flag, commercial_registration, purchase_price_eur, purchase_year, financing_type, loan_amount_eur, loan_rate_pct, loan_term_years";

router.get(
  "/yachts",
  softClerkAuth(),
  requireAuth(),
  async (req, res): Promise<void> => {
    const sb = getSupabase();
    if (!sb) {
      res.status(503).json({ error: "Yacht storage not configured" });
      return;
    }
    const { data, error } = await sb
      .from(YACHTS_TABLE)
      .select(YACHT_COLUMNS)
      .eq("clerk_user_id", req.userId!)
      .order("updated_at", { ascending: false })
      .limit(50);
    if (error) {
      req.log.error({ err: error.message }, "List yachts failed");
      res.status(500).json({ error: error.message });
      return;
    }
    res.json({ items: data ?? [] });
  },
);

router.post(
  "/yachts",
  softClerkAuth(),
  requireAuth(),
  async (req, res): Promise<void> => {
    const parsed = CreateYachtBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const sb = getSupabase();
    if (!sb) {
      res.status(503).json({ error: "Yacht storage not configured" });
      return;
    }
    const { data, error } = await sb
      .from(YACHTS_TABLE)
      .insert({ ...parsed.data, clerk_user_id: req.userId! })
      .select(YACHT_COLUMNS)
      .single();
    if (error) {
      req.log.error({ err: error.message }, "Create yacht failed");
      res.status(500).json({ error: error.message });
      return;
    }
    res.status(201).json(data);
  },
);

router.get(
  "/yachts/:id",
  softClerkAuth(),
  requireAuth(),
  async (req, res): Promise<void> => {
    if (!isUuid(req.params["id"])) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    const sb = getSupabase();
    if (!sb) {
      res.status(503).json({ error: "Yacht storage not configured" });
      return;
    }
    const { data, error } = await sb
      .from(YACHTS_TABLE)
      .select(YACHT_COLUMNS)
      .eq("clerk_user_id", req.userId!)
      .eq("id", req.params["id"])
      .maybeSingle();
    if (error) {
      req.log.error({ err: error.message }, "Get yacht failed");
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
  "/yachts/:id",
  softClerkAuth(),
  requireAuth(),
  async (req, res): Promise<void> => {
    if (!isUuid(req.params["id"])) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    const parsed = UpdateYachtBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const sb = getSupabase();
    if (!sb) {
      res.status(503).json({ error: "Yacht storage not configured" });
      return;
    }
    const { data, error } = await sb
      .from(YACHTS_TABLE)
      .update({ ...parsed.data, updated_at: new Date().toISOString() })
      .eq("clerk_user_id", req.userId!)
      .eq("id", req.params["id"])
      .select(YACHT_COLUMNS)
      .maybeSingle();
    if (error) {
      req.log.error({ err: error.message }, "Update yacht failed");
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
  "/yachts/:id",
  softClerkAuth(),
  requireAuth(),
  async (req, res): Promise<void> => {
    if (!isUuid(req.params["id"])) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    const sb = getSupabase();
    if (!sb) {
      res.status(503).json({ error: "Yacht storage not configured" });
      return;
    }
    const { error, count } = await sb
      .from(YACHTS_TABLE)
      .delete({ count: "exact" })
      .eq("clerk_user_id", req.userId!)
      .eq("id", req.params["id"]);
    if (error) {
      req.log.error({ err: error.message }, "Delete yacht failed");
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
