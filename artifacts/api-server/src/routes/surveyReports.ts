import { Router, type IRouter } from "express";
import {
  CreateSurveyReportBody,
  UpdateSurveyReportBody,
  ReplaceSurveyItemsBody,
  UpsertSurveySeaTrialBody,
} from "@workspace/api-zod";
import { requireAuth, softClerkAuth } from "../middlewares/clerkAuth";
import {
  getSupabase,
  SURVEY_REPORTS_TABLE,
  SURVEY_ITEMS_TABLE,
  SURVEY_SEA_TRIAL_TABLE,
} from "../lib/supabase";
import { isUuid } from "../lib/validators";

const router: IRouter = Router();

const REPORT_LIST_COLUMNS =
  "id,yacht_id,vessel_name,manufacturer,model,lying,survey_date,survey_purpose,status,total_recommendations_a,total_recommendations_b,total_recommendations_c,total_recommendations_d,created_at,updated_at";

async function verifyOwnership(
  sb: ReturnType<typeof getSupabase>,
  id: string,
  userId: string,
): Promise<boolean> {
  if (!sb) return false;
  const { data } = await sb
    .from(SURVEY_REPORTS_TABLE)
    .select("id")
    .eq("id", id)
    .eq("clerk_user_id", userId)
    .maybeSingle();
  return !!data;
}

// ── LIST ─────────────────────────────────────────────────────────
router.get(
  "/survey-reports",
  softClerkAuth(),
  requireAuth(),
  async (req, res): Promise<void> => {
    const sb = getSupabase();
    if (!sb) {
      res.json({ items: [] });
      return;
    }
    const { data, error } = await sb
      .from(SURVEY_REPORTS_TABLE)
      .select(REPORT_LIST_COLUMNS)
      .eq("clerk_user_id", req.userId!)
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) {
      req.log.warn({ err: error.message }, "list survey reports failed");
      res.json({ items: [] });
      return;
    }
    res.json({ items: data ?? [] });
  },
);

// ── CREATE ───────────────────────────────────────────────────────
router.post(
  "/survey-reports",
  softClerkAuth(),
  requireAuth(),
  async (req, res): Promise<void> => {
    const sb = getSupabase();
    if (!sb) {
      res.status(503).json({ error: "Storage not configured" });
      return;
    }
    const parsed = CreateSurveyReportBody.safeParse(req.body ?? {});
    if (!parsed.success) {
      res.status(400).json({
        error: "Invalid survey payload",
        issues: parsed.error.issues.slice(0, 5),
      });
      return;
    }
    const body = parsed.data;
    const vesselName = (body.vessel_name ?? "").trim();
    if (!vesselName) {
      res.status(400).json({ error: "vessel_name required" });
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
      vessel_name: vesselName.slice(0, 200),
      vessel_type: body.vessel_type ?? null,
      manufacturer: body.manufacturer ?? null,
      model: body.model ?? null,
      year_built: body.year_built ?? null,
      flag: body.flag ?? null,
      hin: body.hin ?? null,
      lying: body.lying ?? null,
      survey_date: body.survey_date ?? null,
      survey_purpose: body.survey_purpose ?? "Pre-purchase",
      weather_conditions: body.weather_conditions ?? null,
      sea_state: body.sea_state ?? null,
      client_name: body.client_name ?? null,
      client_email: body.client_email ?? null,
      client_phone: body.client_phone ?? null,
      surveyor_name: body.surveyor_name ?? null,
      surveyor_qualification: body.surveyor_qualification ?? null,
      surveyor_company: body.surveyor_company ?? null,
      surveyor_phone: body.surveyor_phone ?? null,
      surveyor_email: body.surveyor_email ?? null,
      surveyor_logo_url: body.surveyor_logo_url ?? null,
      surveyor_signature_url: body.surveyor_signature_url ?? null,
      overall_condition: body.overall_condition ?? null,
    };
    const { data, error } = await sb
      .from(SURVEY_REPORTS_TABLE)
      .insert(row)
      .select("*")
      .single();
    if (error || !data) {
      req.log.error({ err: error?.message }, "create survey report failed");
      res.status(503).json({ error: "Could not create survey report" });
      return;
    }
    res.status(201).json(data);
  },
);

// ── GET DETAIL ────────────────────────────────────────────────────
router.get(
  "/survey-reports/:id",
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
    const { data: report } = await sb
      .from(SURVEY_REPORTS_TABLE)
      .select("*")
      .eq("id", id)
      .eq("clerk_user_id", req.userId!)
      .maybeSingle();
    if (!report) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    const [{ data: items }, { data: seaTrial }] = await Promise.all([
      sb
        .from(SURVEY_ITEMS_TABLE)
        .select("*")
        .eq("report_id", id)
        .order("section_number", { ascending: true })
        .order("sort_order", { ascending: true }),
      sb
        .from(SURVEY_SEA_TRIAL_TABLE)
        .select("*")
        .eq("report_id", id)
        .maybeSingle(),
    ]);
    res.json({ report, items: items ?? [], sea_trial: seaTrial ?? null });
  },
);

// ── PATCH ─────────────────────────────────────────────────────────
router.patch(
  "/survey-reports/:id",
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
    const owned = await verifyOwnership(sb, id, req.userId!);
    if (!owned) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    const parsed = UpdateSurveyReportBody.safeParse(req.body ?? {});
    if (!parsed.success) {
      res.status(400).json({
        error: "Invalid patch payload",
        issues: parsed.error.issues.slice(0, 5),
      });
      return;
    }
    const patch: Record<string, unknown> = { ...parsed.data, updated_at: new Date().toISOString() };
    const { data, error } = await sb
      .from(SURVEY_REPORTS_TABLE)
      .update(patch)
      .eq("id", id)
      .eq("clerk_user_id", req.userId!)
      .select("*")
      .single();
    if (error || !data) {
      req.log.error({ err: error?.message }, "patch survey report failed");
      res.status(503).json({ error: "Could not update survey report" });
      return;
    }
    res.json(data);
  },
);

// ── DELETE (cascades items + sea trial) ───────────────────────────
router.delete(
  "/survey-reports/:id",
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
      .from(SURVEY_REPORTS_TABLE)
      .delete({ count: "exact" })
      .eq("id", id)
      .eq("clerk_user_id", req.userId!);
    if (error) {
      req.log.error({ err: error.message }, "delete survey report failed");
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

// ── REPLACE ITEMS (atomic; recomputes recommendation counters) ────
router.put(
  "/survey-reports/:id/items",
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
    const owned = await verifyOwnership(sb, id, req.userId!);
    if (!owned) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    const parsed = ReplaceSurveyItemsBody.safeParse(req.body ?? {});
    if (!parsed.success) {
      res.status(400).json({
        error: "Invalid items payload",
        issues: parsed.error.issues.slice(0, 5),
      });
      return;
    }
    const { items, section_number: scopedSection } = parsed.data;

    if (typeof scopedSection === "number") {
      // Safe per-section replace via atomic PL/pgSQL function (migration 019).
      // Prevents cross-section overwrite when concurrent edits happen on
      // different sections, and is atomic for delete+insert+counter recompute.
      const itemsJson = items.map((it: (typeof items)[number], idx: number) => ({
        section_number: scopedSection,
        section_name: it.section_name,
        item_number: it.item_number,
        description: it.description ?? null,
        condition: it.condition ?? null,
        notes: it.notes ?? null,
        recommendation_level: it.recommendation_level ?? null,
        recommendation_text: it.recommendation_text ?? null,
        photo_urls: it.photo_urls ?? [],
        moisture_reading: it.moisture_reading ?? null,
        moisture_level: it.moisture_level ?? null,
        sort_order: typeof it.sort_order === "number" ? it.sort_order : idx,
      }));
      const { error: rpcErr } = await sb.rpc("replace_survey_section_items", {
        p_report_id: id,
        p_section_number: scopedSection,
        p_items: itemsJson,
      });
      if (rpcErr) {
        req.log.error(
          { err: rpcErr.message },
          "replace_survey_section_items rpc failed (run migration 019?)",
        );
        res.status(503).json({ error: "Could not replace items" });
        return;
      }
    } else {
      // Full-replace (used only during initial seeding of a brand-new report).
      // Non-atomic delete+insert; acceptable here because the report has no
      // prior items. For all subsequent edits the client MUST pass
      // section_number to use the safe per-section path.
      const { error: delErr } = await sb
        .from(SURVEY_ITEMS_TABLE)
        .delete()
        .eq("report_id", id);
      if (delErr) {
        req.log.error({ err: delErr.message }, "delete old survey items failed");
        res.status(503).json({ error: "Could not replace items" });
        return;
      }
      const rows = items.map((it: (typeof items)[number], idx: number) => ({
        report_id: id,
        section_number: it.section_number,
        section_name: it.section_name,
        item_number: it.item_number,
        description: it.description ?? null,
        condition: it.condition ?? null,
        notes: it.notes ?? null,
        recommendation_level: it.recommendation_level ?? null,
        recommendation_text: it.recommendation_text ?? null,
        photo_urls: it.photo_urls ?? [],
        moisture_reading: it.moisture_reading ?? null,
        moisture_level: it.moisture_level ?? null,
        sort_order: typeof it.sort_order === "number" ? it.sort_order : idx,
      }));
      if (rows.length > 0) {
        const { error: insErr } = await sb.from(SURVEY_ITEMS_TABLE).insert(rows);
        if (insErr) {
          req.log.error({ err: insErr.message }, "insert survey items failed");
          res.status(503).json({ error: "Could not save items" });
          return;
        }
      }
      const counts: { A: number; B: number; C: number; D: number } = { A: 0, B: 0, C: 0, D: 0 };
      for (const it of rows) {
        const lvl = it.recommendation_level;
        if (lvl === "A" || lvl === "B" || lvl === "C" || lvl === "D") {
          counts[lvl] += 1;
        }
      }
      await sb
        .from(SURVEY_REPORTS_TABLE)
        .update({
          total_recommendations_a: counts.A,
          total_recommendations_b: counts.B,
          total_recommendations_c: counts.C,
          total_recommendations_d: counts.D,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);
    }
    const { data: fresh } = await sb
      .from(SURVEY_ITEMS_TABLE)
      .select("*")
      .eq("report_id", id)
      .order("section_number", { ascending: true })
      .order("sort_order", { ascending: true });
    res.json({ items: fresh ?? [] });
  },
);

// ── UPSERT SEA TRIAL ──────────────────────────────────────────────
router.put(
  "/survey-reports/:id/sea-trial",
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
    const owned = await verifyOwnership(sb, id, req.userId!);
    if (!owned) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    const parsed = UpsertSurveySeaTrialBody.safeParse(req.body ?? {});
    if (!parsed.success) {
      res.status(400).json({
        error: "Invalid sea trial payload",
        issues: parsed.error.issues.slice(0, 5),
      });
      return;
    }
    const body = parsed.data;
    const row = {
      report_id: id,
      trial_date: body.trial_date ?? null,
      location: body.location ?? null,
      weather: body.weather ?? null,
      sea_state: body.sea_state ?? null,
      narrative: body.narrative ?? null,
      rpm_table: body.rpm_table ?? [],
      tickover_rpm: body.tickover_rpm ?? null,
      tickover_speed: body.tickover_speed ?? null,
      max_rpm: body.max_rpm ?? null,
      max_speed: body.max_speed ?? null,
      additional_observations: body.additional_observations ?? null,
      updated_at: new Date().toISOString(),
    };
    const { data, error } = await sb
      .from(SURVEY_SEA_TRIAL_TABLE)
      .upsert(row, { onConflict: "report_id" })
      .select("*")
      .single();
    if (error || !data) {
      req.log.error({ err: error?.message }, "upsert sea trial failed");
      res.status(503).json({ error: "Could not save sea trial" });
      return;
    }
    res.json(data);
  },
);

export default router;
