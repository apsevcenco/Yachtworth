import { Router, type IRouter, type Request, type Response } from "express";
import { requireAuth, softClerkAuth } from "../middlewares/clerkAuth";
import { generateDocument } from "../documents/generateDocument";
import { getSupabase } from "../lib/supabase";
import {
  type DocumentFormat,
  type GenerateDocumentRequest,
} from "../documents/documentTypes";

const router: IRouter = Router();
const DOCUMENT_EXPORTS_BUCKET = process.env.DOCUMENT_EXPORTS_BUCKET || "document-exports";
const STORED_DOCUMENT_TTL_SECONDS = 60 * 60 * 24 * 7;

const SUPPORTED_DOCUMENT_TYPES = [
  "proposal",
  "valuation_report",
  "roi_report",
  "cost_report",
  "listing_report",
  "charter_report",
  "fleet_charter_report",
  "survey_report",
  "maintenance_report",
  "digital_passport",
] as const satisfies readonly GenerateDocumentRequest["documentType"][];

function isSupportedDocumentType(
  value: unknown,
): value is GenerateDocumentRequest["documentType"] {
  return typeof value === "string" && (SUPPORTED_DOCUMENT_TYPES as readonly string[]).includes(value);
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function buildGenerateRequest(
  body: Record<string, unknown>,
): { request?: GenerateDocumentRequest; error?: { status: number; body: Record<string, unknown> } } {
  const documentType = body["documentType"];
  if (!isSupportedDocumentType(documentType)) {
    return {
      error: {
        status: documentType ? 501 : 400,
        body: {
          error: "Unsupported or missing documentType.",
          documentType: typeof documentType === "string" ? documentType : null,
          supportedDocumentTypes: SUPPORTED_DOCUMENT_TYPES,
        },
      },
    };
  }

  const format = body["format"];
  if (format !== "pdf") {
    return { error: { status: 400, body: { error: "format must be 'pdf'." } } };
  }

  const yachtProfile = body["yachtProfile"];
  if (!isObject(yachtProfile) || typeof yachtProfile["name"] !== "string") {
    return { error: { status: 400, body: { error: "yachtProfile with a string 'name' is required." } } };
  }

  return {
    request: {
      documentType,
      format: format as DocumentFormat,
      template: body["template"] as GenerateDocumentRequest["template"],
      yachtProfile: yachtProfile as unknown as GenerateDocumentRequest["yachtProfile"],
      reportData: isObject(body["reportData"])
        ? (body["reportData"] as GenerateDocumentRequest["reportData"])
        : {},
      exportSettings: isObject(body["exportSettings"])
        ? (body["exportSettings"] as GenerateDocumentRequest["exportSettings"])
        : {},
    },
  };
}

function safeStorageKey(raw: unknown, fallback: string): string {
  const input = typeof raw === "string" && raw.trim() ? raw.trim() : fallback;
  const parts = input
    .split("/")
    .map((part) => part.replace(/[^a-zA-Z0-9_.-]/g, "_").replace(/^\.+$/, "_").slice(0, 80))
    .filter(Boolean);
  const key = parts.join("/") || fallback;
  return key.toLowerCase().endsWith(".pdf") ? key : `${key}.pdf`;
}

async function ensureDocumentExportsBucket(): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  const existing = await sb.storage.getBucket(DOCUMENT_EXPORTS_BUCKET);
  if (!existing.error) return;
  await sb.storage.createBucket(DOCUMENT_EXPORTS_BUCKET, {
    public: false,
    fileSizeLimit: 50 * 1024 * 1024,
  });
}

/**
 * POST /api/documents/generate
 *
 * Universal Document Generation Engine (additive — does NOT replace the existing
 * client-side "Legacy" proposal PDF). Returns a binary file directly.
 *
 * Body:
 *   { documentType, format, template?, yachtProfile, reportData?, exportSettings? }
 */
router.post(
  "/documents/generate",
  softClerkAuth(),
  requireAuth(),
  async (req: Request, res: Response): Promise<void> => {
    const body = isObject(req.body) ? req.body : {};
    const parsed = buildGenerateRequest(body);
    if (parsed.error || !parsed.request) {
      res.status(parsed.error?.status ?? 400).json(parsed.error?.body ?? { error: "Invalid document request." });
      return;
    }
    const request = parsed.request;

    try {
      const doc = await generateDocument(request);
      res.setHeader("Content-Type", doc.contentType);
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${doc.fileName}"`,
      );
      res.setHeader("Content-Length", String(doc.buffer.length));
      res.status(200).send(doc.buffer);
    } catch (err) {
      const statusCode =
        isObject(err) && typeof err["statusCode"] === "number"
          ? (err["statusCode"] as number)
          : 500;
      const message = err instanceof Error ? err.message : "Document generation failed";
      req.log?.error({ err: message, format: request.format }, "documents/generate failed");
      res.status(statusCode).json({ error: message });
    }
  },
);

router.post(
  "/documents/store",
  softClerkAuth(),
  requireAuth(),
  async (req: Request, res: Response): Promise<void> => {
    const sb = getSupabase();
    if (!sb) {
      res.status(503).json({ error: "Document storage not configured" });
      return;
    }

    const body = isObject(req.body) ? req.body : {};
    const parsed = buildGenerateRequest(body);
    if (parsed.error || !parsed.request) {
      res.status(parsed.error?.status ?? 400).json(parsed.error?.body ?? { error: "Invalid document request." });
      return;
    }

    const request = parsed.request;
    try {
      const doc = await generateDocument(request);
      await ensureDocumentExportsBucket();
      const storageKey = safeStorageKey(
        body["storageKey"],
        `${request.documentType}/${Date.now()}_${doc.fileName}`,
      );
      const objectPath = `${req.userId}/${storageKey}`;
      const upload = await sb.storage.from(DOCUMENT_EXPORTS_BUCKET).upload(objectPath, doc.buffer, {
        contentType: doc.contentType,
        upsert: true,
      });
      if (upload.error) {
        req.log?.error({ err: upload.error.message, objectPath }, "documents/store upload failed");
        res.status(500).json({ error: upload.error.message });
        return;
      }
      const signed = await sb.storage
        .from(DOCUMENT_EXPORTS_BUCKET)
        .createSignedUrl(objectPath, STORED_DOCUMENT_TTL_SECONDS);
      if (signed.error || !signed.data?.signedUrl) {
        req.log?.error({ err: signed.error?.message, objectPath }, "documents/store signed url failed");
        res.status(500).json({ error: signed.error?.message ?? "Failed to create signed URL" });
        return;
      }
      res.json({
        url: signed.data.signedUrl,
        path: objectPath,
        fileName: doc.fileName,
        expires_in_seconds: STORED_DOCUMENT_TTL_SECONDS,
      });
    } catch (err) {
      const statusCode =
        isObject(err) && typeof err["statusCode"] === "number"
          ? (err["statusCode"] as number)
          : 500;
      const message = err instanceof Error ? err.message : "Document storage failed";
      req.log?.error({ err: message, format: request.format }, "documents/store failed");
      res.status(statusCode).json({ error: message });
    }
  },
);

export default router;
