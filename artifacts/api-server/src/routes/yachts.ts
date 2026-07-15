import { Router, type IRouter } from "express";
import multer from "multer";
import {
  getSupabase,
  YACHTS_TABLE,
  YACHT_EQUIPMENT_TABLE,
  YACHT_PHOTOS_BUCKET,
} from "../lib/supabase";
import { requireAuth, softClerkAuth } from "../middlewares/clerkAuth";
import {
  CreateYachtBody,
  ReplaceYachtEquipmentBody,
  UpdateYachtBody,
} from "@workspace/api-zod";
import { forClerkUser } from "../lib/clerkUserFilter";
import { isUuid } from "../lib/validators";

const MAX_PHOTOS_PER_YACHT = 10;
const PHOTO_UPLOAD_MAX_BYTES = 5 * 1024 * 1024; // 5 MB raw

const photoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: PHOTO_UPLOAD_MAX_BYTES, files: 1 },
});

/**
 * Wraps `photoUpload.single('file')` so multer errors are converted to
 * clean JSON 4xx responses instead of falling through to Express'
 * default HTML error handler.
 */
const photoUploadMw: import("express").RequestHandler = (req, res, next) => {
  photoUpload.single("file")(req, res, (err: unknown) => {
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

/** Strip the public storage URL down to the object path inside the bucket. */
function storagePathFromPublicUrl(publicUrl: string): string | null {
  const marker = `/storage/v1/object/public/${YACHT_PHOTOS_BUCKET}/`;
  const idx = publicUrl.indexOf(marker);
  if (idx < 0) return null;
  return publicUrl.slice(idx + marker.length);
}

const EQUIPMENT_COLUMNS =
  "id, yacht_id, category, equipment_type, quantity, brand, model, serial_number, year_installed, power_kw, power_hp, hours, capacity_liters, capacity_persons, panels_count, total_watts, zones_count, type_detail, notes";

const router: IRouter = Router();

const MAX_YACHTS_PER_USER = 5;

const YACHT_COLUMNS =
  "id, clerk_user_id, created_at, updated_at, name, brand, model, year_built, yacht_type, configuration, length_meters, beam_meters, cabins, guests, crew, engine_hours, marina_location, flag, home_port, photo_url, photo_urls, cover_photo_url, notes, commercial_registration, purchase_price_eur, purchase_year, financing_type, loan_amount_eur, loan_rate_pct, loan_term_years, monthly_crew_eur, monthly_mooring_eur, monthly_fuel_eur, monthly_provisioning_eur, monthly_communications_eur, monthly_maintenance_eur, monthly_management_fee_eur, monthly_misc_eur, annual_insurance_eur, annual_registration_eur, annual_classification_eur, annual_antifouling_eur, annual_refit_reserve_eur, charter_commission_pct, crew_breakdown, draft_meters, registration_number, imo_number, hull_id, vat_status, engine_maker, engine_model, engine_count, total_hp, crew_cabins, berths, heads, owner_role, is_archived";

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
    // Default list hides archived yachts. Pass `?include_archived=1` to see all.
    const ia = req.query["include_archived"];
    const includeArchived = ia === "1" || ia === "true";
    const { data, error } = await forClerkUser(
      sb.from(YACHTS_TABLE).select(YACHT_COLUMNS),
      req.userId!,
    )
      .order("updated_at", { ascending: false })
      .limit(50);
    if (error) {
      req.log.error({ err: error.message }, "List yachts failed");
      res.status(500).json({ error: error.message });
      return;
    }
    const items = (data ?? [])
      .filter((row) => includeArchived || !row.is_archived)
      .slice(0, 50);
    res.json({ items });
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
    const { count: existingCount, error: countErr } = await forClerkUser(
      sb.from(YACHTS_TABLE).select("id", { count: "exact", head: true }),
      req.userId!,
    );
    if (countErr) {
      req.log.error({ err: countErr.message }, "Count yachts failed");
      res.status(500).json({ error: countErr.message });
      return;
    }
    if ((existingCount ?? 0) >= MAX_YACHTS_PER_USER) {
      res.status(403).json({
        error: `Yacht profile limit reached (max ${MAX_YACHTS_PER_USER}). Delete one to add a new yacht.`,
      });
      return;
    }
    const { data, error } = await sb
      .from(YACHTS_TABLE)
      .insert({ ...parsed.data, clerk_user_id: req.userId! })
      .select(YACHT_COLUMNS)
      .single();
    if (error) {
      // DB-level trigger is the source of truth for the 5-yacht limit;
      // it raises 'yacht_limit_reached' if a concurrent insert slips past
      // the soft pre-check above.
      if (error.message?.includes("yacht_limit_reached")) {
        res.status(403).json({
          error: `Yacht profile limit reached (max ${MAX_YACHTS_PER_USER}). Delete one to add a new yacht.`,
        });
        return;
      }
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
    const { data, error } = await forClerkUser(
      sb.from(YACHTS_TABLE).select(YACHT_COLUMNS),
      req.userId!,
    )
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
    // Photo fields are owned by /yachts/:id/photos endpoints. Strip them from
    // any general yacht update so a stale form snapshot cannot wipe uploads.
    const safeUpdate: Record<string, unknown> = { ...parsed.data };
    delete safeUpdate["photo_url"];
    delete safeUpdate["photo_urls"];
    delete safeUpdate["cover_photo_url"];
    const { data, error } = await forClerkUser(
      sb
        .from(YACHTS_TABLE)
        .update({ ...safeUpdate, updated_at: new Date().toISOString() }),
      req.userId!,
    )
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
    const yachtId = req.params["id"]!;
    // Snapshot photo folder so we can clean up storage after DB delete.
    // We never block delete on storage cleanup; orphans are non-fatal.
    const { error, count } = await forClerkUser(
      sb.from(YACHTS_TABLE).delete({ count: "exact" }),
      req.userId!,
    ).eq("id", yachtId);
    if (error) {
      req.log.error({ err: error.message }, "Delete yacht failed");
      res.status(500).json({ error: error.message });
      return;
    }
    if (!count) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    // Best-effort storage cleanup: list & remove this yacht's photo folder.
    try {
      const ls = await sb.storage
        .from(YACHT_PHOTOS_BUCKET)
        .list(yachtId, { limit: 100 });
      if (ls.data && ls.data.length > 0) {
        const paths = ls.data.map((o) => `${yachtId}/${o.name}`);
        await sb.storage.from(YACHT_PHOTOS_BUCKET).remove(paths);
      }
    } catch (e) {
      req.log.warn(
        { err: (e as Error).message, yachtId },
        "Storage cleanup after yacht delete failed",
      );
    }
    res.status(204).send();
  },
);

// ── Equipment & Systems (T-Equipment) ──────────────────────────────────
// One row per logical unit. PUT replaces all rows for the yacht atomically
// (delete-then-insert). All fields besides category + equipment_type are
// optional; user fills only what they have.

router.get(
  "/yachts/:id/equipment",
  softClerkAuth(),
  requireAuth(),
  async (req, res): Promise<void> => {
    if (!isUuid(req.params["id"])) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    const sb = getSupabase();
    if (!sb) {
      res.status(503).json({ error: "Equipment storage not configured" });
      return;
    }
    // Verify yacht ownership before returning anything.
    const { data: yacht, error: yErr } = await forClerkUser(
      sb.from(YACHTS_TABLE).select("id"),
      req.userId!,
    )
      .eq("id", req.params["id"])
      .maybeSingle();
    if (yErr) {
      req.log.error({ err: yErr.message }, "Equipment yacht check failed");
      res.status(500).json({ error: yErr.message });
      return;
    }
    if (!yacht) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    const { data, error } = await forClerkUser(
      sb.from(YACHT_EQUIPMENT_TABLE).select(EQUIPMENT_COLUMNS),
      req.userId!,
    )
      .eq("yacht_id", req.params["id"])
      .order("created_at", { ascending: true });
    if (error) {
      req.log.error({ err: error.message }, "List equipment failed");
      res.status(500).json({ error: error.message });
      return;
    }
    res.json({ items: data ?? [] });
  },
);

router.put(
  "/yachts/:id/equipment",
  softClerkAuth(),
  requireAuth(),
  async (req, res): Promise<void> => {
    if (!isUuid(req.params["id"])) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    const parsed = ReplaceYachtEquipmentBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const sb = getSupabase();
    if (!sb) {
      res.status(503).json({ error: "Equipment storage not configured" });
      return;
    }
    // Ownership check
    const { data: yacht, error: yErr } = await forClerkUser(
      sb.from(YACHTS_TABLE).select("id"),
      req.userId!,
    )
      .eq("id", req.params["id"])
      .maybeSingle();
    if (yErr) {
      req.log.error({ err: yErr.message }, "Equipment yacht check failed");
      res.status(500).json({ error: yErr.message });
      return;
    }
    if (!yacht) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    // Strip client-supplied id (server assigns fresh UUIDs) before
    // handing the payload to the atomic RPC. The RPC runs delete+insert
    // inside a single transaction so the user can never end up with a
    // partially-replaced equipment set.
    const items = parsed.data.items.map((it) => {
      const { id: _drop, ...rest } = it;
      void _drop;
      return rest;
    });
    const { data, error } = await sb.rpc("replace_yacht_equipment", {
      p_yacht_id: req.params["id"],
      p_user_id: req.userId!,
      p_items: items,
    });
    if (error) {
      // ERRCODE 42501 is raised by the RPC when ownership fails — but the
      // pre-check above already returns 404, so this branch is defensive.
      req.log.error(
        { err: error.message, code: error.code },
        "Equipment replace RPC failed",
      );
      res.status(500).json({ error: error.message });
      return;
    }
    // RPC returns SETOF yacht_equipment → array of row objects.
    res.json({ items: Array.isArray(data) ? data : [] });
  },
);

// ── Photos (T-PhotoUpload) ─────────────────────────────────────────────
// Multi-photo support. The mobile app compresses to ≤800 KB then posts the
// JPEG here; the server uploads to Supabase Storage with the service-role
// key (so the mobile app never sees storage credentials) and updates the
// yacht's `photo_urls` array + `cover_photo_url`. The legacy `photo_url`
// column is kept in sync with the cover so older clients keep working.

async function loadYachtForPhotoOps(
  yachtId: string,
  userId: string,
): Promise<
  | { ok: true; photo_urls: string[]; cover_photo_url: string | null }
  | { status: 404 | 503; error: string }
> {
  const sb = getSupabase();
  if (!sb) return { status: 503, error: "Yacht storage not configured" };
  const { data, error } = await forClerkUser(
    sb.from(YACHTS_TABLE).select("photo_urls, cover_photo_url"),
    userId,
  )
    .eq("id", yachtId)
    .maybeSingle();
  if (error) return { status: 503, error: error.message };
  if (!data) return { status: 404, error: "Not found" };
  const raw = (data as { photo_urls?: unknown }).photo_urls;
  const photo_urls = Array.isArray(raw)
    ? raw.filter((x): x is string => typeof x === "string")
    : [];
  const cover_photo_url =
    typeof (data as { cover_photo_url?: unknown }).cover_photo_url === "string"
      ? (data as { cover_photo_url: string }).cover_photo_url
      : null;
  return { ok: true, photo_urls, cover_photo_url };
}

function photoPayload(
  photo_urls: string[],
  cover_photo_url: string | null,
  url?: string,
): { url: string; photo_urls: string[]; cover_photo_url: string | null } {
  return { url: url ?? cover_photo_url ?? "", photo_urls, cover_photo_url };
}

router.post(
  "/yachts/:id/photos",
  softClerkAuth(),
  requireAuth(),
  photoUploadMw,
  async (req, res): Promise<void> => {
    if (!isUuid(req.params["id"])) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    const file = req.file;
    if (!file || !file.buffer || file.buffer.length === 0) {
      res.status(400).json({ error: "Missing file" });
      return;
    }
    const sb = getSupabase();
    if (!sb) {
      res.status(503).json({ error: "Yacht storage not configured" });
      return;
    }
    const yachtId = req.params["id"]!;
    const loaded = await loadYachtForPhotoOps(yachtId, req.userId!);
    if ("status" in loaded) {
      res.status(loaded.status).json({ error: loaded.error });
      return;
    }
    if (loaded.photo_urls.length >= MAX_PHOTOS_PER_YACHT) {
      res.status(400).json({
        error: `Photo limit reached (${MAX_PHOTOS_PER_YACHT} per yacht).`,
      });
      return;
    }

    const ext =
      file.mimetype === "image/png"
        ? "png"
        : file.mimetype === "image/webp"
          ? "webp"
          : "jpg";
    const objectPath = `${yachtId}/${Date.now()}_${Math.random()
      .toString(36)
      .slice(2, 8)}.${ext}`;

    const uploadRes = await sb.storage
      .from(YACHT_PHOTOS_BUCKET)
      .upload(objectPath, file.buffer, {
        contentType: file.mimetype || "image/jpeg",
        cacheControl: "31536000",
        upsert: false,
      });
    if (uploadRes.error) {
      req.log.error(
        { err: uploadRes.error.message },
        "Yacht photo storage upload failed",
      );
      res.status(502).json({ error: uploadRes.error.message });
      return;
    }
    const { data: pub } = sb.storage
      .from(YACHT_PHOTOS_BUCKET)
      .getPublicUrl(objectPath);
    const publicUrl = pub.publicUrl;

    const nextPhotos = [...loaded.photo_urls, publicUrl];
    const nextCover = loaded.cover_photo_url ?? publicUrl;

    const { error: upErr } = await forClerkUser(
      sb.from(YACHTS_TABLE).update({
        photo_urls: nextPhotos,
        cover_photo_url: nextCover,
        photo_url: nextCover, // legacy column kept in sync
      }),
      req.userId!,
    ).eq("id", yachtId);
    if (upErr) {
      // Roll back the storage upload so we don't leak orphans.
      await sb.storage.from(YACHT_PHOTOS_BUCKET).remove([objectPath]);
      req.log.error(
        { err: upErr.message },
        "Yacht photo DB update failed (rolled back storage)",
      );
      res.status(500).json({ error: upErr.message });
      return;
    }

    res.json(photoPayload(nextPhotos, nextCover, publicUrl));
  },
);

router.delete(
  "/yachts/:id/photos",
  softClerkAuth(),
  requireAuth(),
  async (req, res): Promise<void> => {
    if (!isUuid(req.params["id"])) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    const body = (req.body ?? {}) as { url?: unknown };
    const url = typeof body.url === "string" ? body.url : "";
    if (!url) {
      res.status(400).json({ error: "Missing url" });
      return;
    }
    const sb = getSupabase();
    if (!sb) {
      res.status(503).json({ error: "Yacht storage not configured" });
      return;
    }
    const yachtId = req.params["id"]!;
    const loaded = await loadYachtForPhotoOps(yachtId, req.userId!);
    if ("status" in loaded) {
      res.status(loaded.status).json({ error: loaded.error });
      return;
    }
    // IDOR guard: the URL must already belong to THIS yacht. Without this
    // check, an authenticated user could pass another yacht's public URL
    // and the service-role storage.remove would happily delete the object.
    if (!loaded.photo_urls.includes(url)) {
      res.status(400).json({ error: "URL is not in this yacht's photos" });
      return;
    }
    const path = storagePathFromPublicUrl(url);
    // Defence-in-depth: even if the URL is in the array, ensure the parsed
    // storage path is scoped to this yacht's folder before we touch storage.
    if (!path || !path.startsWith(`${yachtId}/`)) {
      res
        .status(400)
        .json({ error: "URL is not in this yacht's storage folder" });
      return;
    }

    const nextPhotos = loaded.photo_urls.filter((p) => p !== url);
    let nextCover = loaded.cover_photo_url;
    if (nextCover === url) nextCover = nextPhotos[0] ?? null;

    const { error: upErr } = await forClerkUser(
      sb.from(YACHTS_TABLE).update({
        photo_urls: nextPhotos,
        cover_photo_url: nextCover,
        photo_url: nextCover,
      }),
      req.userId!,
    ).eq("id", yachtId);
    if (upErr) {
      req.log.error({ err: upErr.message }, "Yacht photo DB delete failed");
      res.status(500).json({ error: upErr.message });
      return;
    }
    {
      const rm = await sb.storage.from(YACHT_PHOTOS_BUCKET).remove([path]);
      if (rm.error) {
        // Non-fatal — DB is the source of truth, log and continue.
        req.log.warn(
          { err: rm.error.message, path },
          "Yacht photo storage delete failed (DB already updated)",
        );
      }
    }
    res.json(photoPayload(nextPhotos, nextCover));
  },
);

router.patch(
  "/yachts/:id/photos/cover",
  softClerkAuth(),
  requireAuth(),
  async (req, res): Promise<void> => {
    if (!isUuid(req.params["id"])) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    const body = (req.body ?? {}) as { url?: unknown };
    const url = typeof body.url === "string" ? body.url : "";
    if (!url) {
      res.status(400).json({ error: "Missing url" });
      return;
    }
    const sb = getSupabase();
    if (!sb) {
      res.status(503).json({ error: "Yacht storage not configured" });
      return;
    }
    const yachtId = req.params["id"]!;
    const loaded = await loadYachtForPhotoOps(yachtId, req.userId!);
    if ("status" in loaded) {
      res.status(loaded.status).json({ error: loaded.error });
      return;
    }
    if (!loaded.photo_urls.includes(url)) {
      res.status(400).json({ error: "URL is not in this yacht's photos" });
      return;
    }
    const { error: upErr } = await forClerkUser(
      sb.from(YACHTS_TABLE).update({ cover_photo_url: url, photo_url: url }),
      req.userId!,
    ).eq("id", yachtId);
    if (upErr) {
      req.log.error({ err: upErr.message }, "Yacht cover update failed");
      res.status(500).json({ error: upErr.message });
      return;
    }
    res.json(photoPayload(loaded.photo_urls, url));
  },
);

export default router;
