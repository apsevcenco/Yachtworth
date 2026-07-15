import { Router, type IRouter } from "express";
import multer from "multer";
import { SaveProposalBody } from "@workspace/api-zod";
import { requireAuth, softClerkAuth } from "../middlewares/clerkAuth";
import {
  getSupabase,
  PROPOSALS_TABLE,
  YACHT_PHOTOS_BUCKET,
} from "../lib/supabase";
import { forClerkUser } from "../lib/clerkUserFilter";
import { isUuid } from "../lib/validators";

const router: IRouter = Router();

// ── Proposal photo upload ──────────────────────────────────────────────
// Manual proposals have no yacht row to attach photos to, so we accept the
// compressed JPEG here and upload it to the existing public `yacht-photos`
// bucket under a `proposals/<user>/…` prefix via the service-role key (the
// mobile app never sees storage credentials). We return the public URL; the
// frontend keeps the URL list + cover purely in the proposal snapshot jsonb.
// No DB row, no schema change — additive only.
const PHOTO_UPLOAD_MAX_BYTES = 5 * 1024 * 1024; // 5 MB raw
const ALLOWED_PHOTO_MIME: Record<string, "jpg" | "png" | "webp"> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

const photoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: PHOTO_UPLOAD_MAX_BYTES, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_PHOTO_MIME[file.mimetype]) {
      cb(null, true);
      return;
    }
    cb(new Error("UNSUPPORTED_MEDIA_TYPE"));
  },
});

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
    if (err instanceof Error && err.message === "UNSUPPORTED_MEDIA_TYPE") {
      res
        .status(415)
        .json({ error: "Only JPEG, PNG, or WebP images are allowed." });
      return;
    }
    next(err);
  });
};

router.post(
  "/proposals/photo",
  softClerkAuth(),
  requireAuth(),
  photoUploadMw,
  async (req, res): Promise<void> => {
    const file = req.file;
    if (!file || !file.buffer || file.buffer.length === 0) {
      res.status(400).json({ error: "Missing file" });
      return;
    }
    const sb = getSupabase();
    if (!sb) {
      res.status(503).json({ error: "Proposal storage not configured" });
      return;
    }
    const ext = ALLOWED_PHOTO_MIME[file.mimetype] ?? "jpg";
    const userKey = req.userId!.replace(/[^a-zA-Z0-9_-]/g, "_");
    const objectPath = `proposals/${userKey}/${Date.now()}_${Math.random()
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
        "Proposal photo storage upload failed",
      );
      res.status(502).json({ error: uploadRes.error.message });
      return;
    }
    const { data: pub } = sb.storage
      .from(YACHT_PHOTOS_BUCKET)
      .getPublicUrl(objectPath);
    res.json({ url: pub.publicUrl });
  },
);

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
    const { data, error } = await forClerkUser(
      sb.from(PROPOSALS_TABLE).select(PROPOSAL_LIST_COLUMNS),
      req.userId!,
    )
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
      const { data: ownedYacht } = await forClerkUser(
        sb.from("yachts").select("id"),
        req.userId!,
      )
        .eq("id", yachtId)
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
    const { data, error } = await forClerkUser(
      sb.from(PROPOSALS_TABLE).select("*"),
      req.userId!,
    )
      .eq("id", id)
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
    const { error, count } = await forClerkUser(
      sb.from(PROPOSALS_TABLE).delete({ count: "exact" }),
      req.userId!,
    ).eq("id", id);
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
