import { Router, type IRouter } from "express";
import { SaveProposalBody } from "@workspace/api-zod";
import { requireAuth, softClerkAuth } from "../middlewares/clerkAuth";
import { getSupabase, PROPOSALS_TABLE } from "../lib/supabase";
import { isUuid } from "../lib/validators";

const router: IRouter = Router();

const PROPOSAL_LIST_COLUMNS =
  "id,yacht_id,yacht_name,proposal_type,language,created_at";

router.get(
  "/proposals",
  softClerkAuth(),
  requireAuth(),
  async (req, res): Promise<void> => {
    const sb = getSupabase();
    if (!sb) {
      res.json({ items: [] });
      return;
    }
    const { data, error } = await sb
      .from(PROPOSALS_TABLE)
      .select(PROPOSAL_LIST_COLUMNS)
      .eq("clerk_user_id", req.userId!)
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) {
      req.log.warn({ err: error.message }, "list proposals failed");
      res.json({ items: [] });
      return;
    }
    res.json({ items: data ?? [] });
  },
);

router.post(
  "/proposals",
  softClerkAuth(),
  requireAuth(),
  async (req, res): Promise<void> => {
    const sb = getSupabase();
    if (!sb) {
      res.status(503).json({ error: "Storage not configured" });
      return;
    }
    const parsed = SaveProposalBody.safeParse(req.body ?? {});
    if (!parsed.success) {
      res.status(400).json({
        error: "Invalid proposal payload",
        issues: parsed.error.issues.slice(0, 5),
      });
      return;
    }
    const body = parsed.data;
    const yachtName = body.yacht_name.trim();
    if (!yachtName) {
      res.status(400).json({ error: "yacht_name required" });
      return;
    }
    let yachtId: string | null =
      typeof body.yacht_id === "string" && isUuid(body.yacht_id)
        ? body.yacht_id
        : null;
    if (yachtId) {
      const { data: ownedYacht } = await sb
        .from("yachts")
        .select("id")
        .eq("id", yachtId)
        .eq("clerk_user_id", req.userId!)
        .maybeSingle();
      if (!ownedYacht) yachtId = null;
    }
    const row = {
      clerk_user_id: req.userId!,
      yacht_id: yachtId,
      yacht_name: yachtName.slice(0, 120),
      proposal_type: body.proposal_type,
      language: body.language,
      yacht_snapshot: body.yacht_snapshot ?? null,
      settings_snapshot: body.settings_snapshot ?? null,
      equipment_snapshot: body.equipment_snapshot ?? null,
    };
    const { data, error } = await sb
      .from(PROPOSALS_TABLE)
      .insert(row)
      .select("*")
      .single();
    if (error || !data) {
      req.log.error({ err: error?.message }, "save proposal failed");
      res.status(503).json({ error: "Could not save proposal" });
      return;
    }
    res.status(201).json(data);
  },
);

router.get(
  "/proposals/:id",
  softClerkAuth(),
  requireAuth(),
  async (req, res): Promise<void> => {
    const id = req.params["id"] ?? "";
    if (!isUuid(id)) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    const sb = getSupabase();
    if (!sb) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    const { data, error } = await sb
      .from(PROPOSALS_TABLE)
      .select("*")
      .eq("id", id)
      .eq("clerk_user_id", req.userId!)
      .maybeSingle();
    if (error || !data) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json(data);
  },
);

router.delete(
  "/proposals/:id",
  softClerkAuth(),
  requireAuth(),
  async (req, res): Promise<void> => {
    const id = req.params["id"] ?? "";
    if (!isUuid(id)) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    const sb = getSupabase();
    if (!sb) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    const { error, count } = await sb
      .from(PROPOSALS_TABLE)
      .delete({ count: "exact" })
      .eq("id", id)
      .eq("clerk_user_id", req.userId!);
    if (error) {
      req.log.error({ err: error.message }, "delete proposal failed");
      res.status(503).json({ error: "Delete failed" });
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
