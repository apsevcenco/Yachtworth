import { Router, type IRouter } from "express";
import multer from "multer";
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
  SURVEY_ITEM_PHOTOS_BUCKET,
} from "../lib/supabase";
import { isUuid } from "../lib/validators";

const router: IRouter = Router();

const MAX_PHOTOS_PER_ITEM = 10;
const PHOTO_UPLOAD_MAX_BYTES = 5 * 1024 * 1024;

const itemPhotoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: PHOTO_UPLOAD_MAX_BYTES, files: 1 },
});

const itemPhotoMw: import("express").RequestHandler = (req, res, next) => {
  itemPhotoUpload.single("file")(req, res, (err: unknown) => {
    if (!err) return next();
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        res.status(413).json({
          error: `File too large. Max ${PHOTO_UPLOAD_MAX_BYTES / 1024 / 1024} MB.`,
        });
        return;
      }
      res.status(400).json({ error: err.message });
      return;
    }
    next(err);
  });
};

function storagePathFromPublicUrl(publicUrl: string): string | null {
  const marker = `/storage/v1/object/public/${SURVEY_ITEM_PHOTOS_BUCKET}/`;
  const idx = publicUrl.indexOf(marker);
  if (idx < 0) return null;
  return publicUrl.slice(idx + marker.length);
}

/**
 * Loads a survey item AND verifies the parent report belongs to the user.
 * Returns the item row (with current photo_urls + report_id) or an error status.
 */
async function loadOwnedItem(
  itemId: string,
  userId: string,
): Promise<
  | { ok: true; item: { id: string; report_id: string; photo_urls: string[] } }
  | { status: 404 | 503; error: string }
> {
  const sb = getSupabase();
  if (!sb) return { status: 503, error: "Survey storage not configured" };
  const { data: item, error } = await sb
    .from(SURVEY_ITEMS_TABLE)
    .select("id, report_id, photo_urls")
    .eq("id", itemId)
    .maybeSingle();
  if (error) return { status: 503, error: error.message };
  if (!item) return { status: 404, error: "Not found" };
  const owned = await verifyOwnership(sb, item.report_id as string, userId);
  if (!owned) return { status: 404, error: "Not found" };
  const raw = (item as { photo_urls?: unknown }).photo_urls;
  const photo_urls = Array.isArray(raw)
    ? raw.filter((x): x is string => typeof x === "string")
    : [];
  return {
    ok: true,
    item: { id: item.id as string, report_id: item.report_id as string, photo_urls },
  };
}

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

// ── ITEM PHOTOS — UPLOAD ──────────────────────────────────────────
router.post(
  "/survey-items/:itemId/photos",
  softClerkAuth(),
  requireAuth(),
  itemPhotoMw,
  async (req, res): Promise<void> => {
    const itemId = req.params["itemId"] ?? "";
    if (!isUuid(itemId)) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    const file = req.file;
    if (!file || !file.buffer || file.buffer.length === 0) {
      res.status(400).json({ error: "Missing file" });
      return;
    }
    const loaded = await loadOwnedItem(itemId, req.userId!);
    if ("status" in loaded) {
      res.status(loaded.status).json({ error: loaded.error });
      return;
    }
    // Pre-flight check is best-effort; the RPC re-checks under row lock
    // so two concurrent uploads cannot both squeak past the limit.
    if (loaded.item.photo_urls.length >= MAX_PHOTOS_PER_ITEM) {
      res.status(400).json({
        error: `Photo limit reached (${MAX_PHOTOS_PER_ITEM} per item).`,
      });
      return;
    }
    const sb = getSupabase()!;
    const ext =
      file.mimetype === "image/png"
        ? "png"
        : file.mimetype === "image/webp"
          ? "webp"
          : "jpg";
    const objectPath = `${loaded.item.report_id}/${itemId}/${Date.now()}_${Math.random()
      .toString(36)
      .slice(2, 8)}.${ext}`;

    const up = await sb.storage
      .from(SURVEY_ITEM_PHOTOS_BUCKET)
      .upload(objectPath, file.buffer, {
        contentType: file.mimetype || "image/jpeg",
        cacheControl: "31536000",
        upsert: false,
      });
    if (up.error) {
      req.log.error({ err: up.error.message }, "survey item photo upload failed");
      res.status(502).json({ error: up.error.message });
      return;
    }
    const { data: pub } = sb.storage
      .from(SURVEY_ITEM_PHOTOS_BUCKET)
      .getPublicUrl(objectPath);
    const publicUrl = pub.publicUrl;

    // Atomic append via RPC (migration 021). Avoids the lost-update race
    // that read-modify-write `.update({ photo_urls })` had under concurrency.
    const { data: appended, error: rpcErr } = await sb.rpc(
      "survey_item_append_photo",
      { p_item_id: itemId, p_url: publicUrl, p_max: MAX_PHOTOS_PER_ITEM },
    );
    if (rpcErr || !appended) {
      // Roll back the storage object so we don't accumulate orphans.
      await sb.storage.from(SURVEY_ITEM_PHOTOS_BUCKET).remove([objectPath]);
      const msg = rpcErr?.message ?? "Could not append photo";
      if (rpcErr?.code === "P0001") {
        res.status(400).json({ error: `Photo limit reached (${MAX_PHOTOS_PER_ITEM} per item).` });
        return;
      }
      if (rpcErr?.code === "P0002") {
        res.status(404).json({ error: "Not found" });
        return;
      }
      req.log.error(
        { err: msg },
        "survey_item_append_photo RPC failed (rolled back storage)",
      );
      res.status(500).json({ error: msg });
      return;
    }
    const nextPhotos = Array.isArray(appended)
      ? (appended as unknown[]).filter((x): x is string => typeof x === "string")
      : loaded.item.photo_urls.concat(publicUrl);
    res.json({ url: publicUrl, photo_urls: nextPhotos });
  },
);

// ── ITEM PHOTOS — DELETE ──────────────────────────────────────────
router.delete(
  "/survey-items/:itemId/photos",
  softClerkAuth(),
  requireAuth(),
  async (req, res): Promise<void> => {
    const itemId = req.params["itemId"] ?? "";
    if (!isUuid(itemId)) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    const body = (req.body ?? {}) as { url?: unknown };
    const url = typeof body.url === "string" ? body.url : "";
    if (!url) {
      res.status(400).json({ error: "Missing url" });
      return;
    }
    const loaded = await loadOwnedItem(itemId, req.userId!);
    if ("status" in loaded) {
      res.status(loaded.status).json({ error: loaded.error });
      return;
    }
    if (!loaded.item.photo_urls.includes(url)) {
      res.status(400).json({ error: "URL is not in this item's photos" });
      return;
    }
    const path = storagePathFromPublicUrl(url);
    if (!path || !path.startsWith(`${loaded.item.report_id}/${itemId}/`)) {
      res.status(400).json({ error: "URL is not in this item's storage folder" });
      return;
    }
    const sb = getSupabase()!;
    // Atomic remove via RPC (migration 021) — avoids lost-update races
    // where a concurrent append could resurrect the URL we just removed.
    const { data: removed, error: rpcErr } = await sb.rpc(
      "survey_item_remove_photo",
      { p_item_id: itemId, p_url: url },
    );
    if (rpcErr) {
      if (rpcErr.code === "P0002") {
        res.status(404).json({ error: "Not found" });
        return;
      }
      req.log.error({ err: rpcErr.message }, "survey_item_remove_photo RPC failed");
      res.status(500).json({ error: rpcErr.message });
      return;
    }
    const nextPhotos = Array.isArray(removed)
      ? (removed as unknown[]).filter((x): x is string => typeof x === "string")
      : loaded.item.photo_urls.filter((p) => p !== url);
    const rm = await sb.storage.from(SURVEY_ITEM_PHOTOS_BUCKET).remove([path]);
    if (rm.error) {
      req.log.warn(
        { err: rm.error.message, path },
        "survey item photo storage delete failed (DB already updated)",
      );
    }
    res.json({ photo_urls: nextPhotos });
  },
);

export default router;
