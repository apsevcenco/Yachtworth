import { Router, type IRouter, type Request, type Response } from "express";
import { requireAuth, softClerkAuth } from "../middlewares/clerkAuth";
import { generateDocument } from "../documents/generateDocument";
import {
  type DocumentFormat,
  type GenerateDocumentRequest,
} from "../documents/documentTypes";

const router: IRouter = Router();

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
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

    const documentType = body["documentType"];
    if (
      documentType !== "proposal" &&
      documentType !== "valuation_report" &&
      documentType !== "roi_report" &&
      documentType !== "cost_report"
    ) {
      res
        .status(documentType ? 501 : 400)
        .json({
          error:
            "Unsupported or missing documentType (only 'proposal', 'valuation_report', 'roi_report' or 'cost_report').",
        });
      return;
    }

    const format = body["format"];
    if (format !== "pdf" && format !== "docx") {
      res.status(400).json({ error: "format must be 'pdf' or 'docx'." });
      return;
    }

    const yachtProfile = body["yachtProfile"];
    if (!isObject(yachtProfile) || typeof yachtProfile["name"] !== "string") {
      res.status(400).json({ error: "yachtProfile with a string 'name' is required." });
      return;
    }

    const request: GenerateDocumentRequest = {
      documentType: documentType as GenerateDocumentRequest["documentType"],
      format: format as DocumentFormat,
      template: body["template"] as GenerateDocumentRequest["template"],
      yachtProfile: yachtProfile as unknown as GenerateDocumentRequest["yachtProfile"],
      reportData: isObject(body["reportData"])
        ? (body["reportData"] as GenerateDocumentRequest["reportData"])
        : {},
      exportSettings: isObject(body["exportSettings"])
        ? (body["exportSettings"] as GenerateDocumentRequest["exportSettings"])
        : {},
    };

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

export default router;
