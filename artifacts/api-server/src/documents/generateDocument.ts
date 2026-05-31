import { buildProposalModel } from "./builders/proposal";
import { buildValuationModel } from "./builders/valuation";
import { renderProposalDocx, renderValuationDocx } from "./docx/generateDocx";
import { renderPdf } from "./pdf/generatePdf";
import { renderModelToPdfHtml } from "./pdf/renderModelToPdfHtml";
import { buildProposalHtml } from "./pdf/templates/proposalTemplate";
import { buildValuationHtml } from "./pdf/templates/valuationTemplate";
import { photoList, validateImageUrls } from "./core/util";
import { logger } from "../lib/logger";
import {
  DOCX_CONTENT_TYPE,
  PDF_CONTENT_TYPE,
  normalizeTemplate,
  type GenerateDocumentRequest,
  type GeneratedDocument,
  type ProposalReportData,
  type ValuationReportData,
} from "./documentTypes";

function safeFileBase(name: string, fallback: string): string {
  const base = (name || fallback)
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "_")
    .slice(0, 60);
  return base || fallback;
}

/**
 * Universal document dispatcher. Supports `documentType: "proposal"` and
 * `documentType: "valuation_report"`, each in both `pdf` and `docx` formats.
 * Designed so future tools (ownership cost, charter ROI, charter planner,
 * survey reports) can plug in their own templates without touching the
 * transport/route layer.
 */
export async function generateDocument(
  req: GenerateDocumentRequest,
): Promise<GeneratedDocument> {
  if (req.documentType !== "proposal" && req.documentType !== "valuation_report") {
    throw Object.assign(new Error(`Unsupported documentType: ${req.documentType}`), {
      statusCode: 501,
    });
  }

  const yacht = req.yachtProfile;
  const settings = req.exportSettings ?? {};
  const template = normalizeTemplate(req.template ?? settings.template);

  if (req.documentType === "valuation_report") {
    const reportData = (req.reportData ?? {}) as ValuationReportData;
    const fileBase = safeFileBase(yacht?.name ?? "valuation", "valuation");

    if (req.format === "docx") {
      const buffer = await renderValuationDocx({ yacht, reportData, settings });
      return {
        buffer,
        contentType: DOCX_CONTENT_TYPE,
        fileName: `${fileBase}_valuation.docx`,
      };
    }

    // Opt-in adaptive engine (PDF only): semantic model → blocks → packed pages.
    // Default stays legacy.
    const html =
      settings.engine === "adaptive"
        ? renderModelToPdfHtml(buildValuationModel({ yacht, reportData, settings, template }))
        : buildValuationHtml({ yacht, reportData, settings, template });
    const buffer = await renderPdf(html);
    return {
      buffer,
      contentType: PDF_CONTENT_TYPE,
      fileName: `${fileBase}_valuation.pdf`,
    };
  }

  // documentType === "proposal"
  const reportData = (req.reportData ?? {}) as ProposalReportData;
  const fileBase = safeFileBase(yacht?.name ?? "proposal", "proposal");

  if (req.format === "docx") {
    const buffer = await renderProposalDocx({ yacht, reportData, settings });
    return {
      buffer,
      contentType: DOCX_CONTENT_TYPE,
      fileName: `${fileBase}_proposal.docx`,
    };
  }

  // Opt-in adaptive engine (PDF only): semantic model → blocks → packed pages.
  // Default stays legacy.
  let html: string;
  if (settings.engine === "adaptive") {
    // Probe photos up front so broken/unreachable URLs never reach the PDF as
    // broken-image icons; rejected URLs are excluded and logged.
    const candidatePhotos = yacht ? photoList(yacht) : [];
    const { valid, rejected } = candidatePhotos.length
      ? await validateImageUrls(candidatePhotos)
      : { valid: [], rejected: [] };
    if (rejected.length) {
      logger.warn(
        { documentType: "proposal", rejected, validCount: valid.length },
        "proposal adaptive export: excluded unreachable/non-image photos",
      );
    }
    html = renderModelToPdfHtml(
      buildProposalModel({ yacht, reportData, settings, template, photos: valid }),
    );
  } else {
    html = buildProposalHtml({ yacht, reportData, settings, template });
  }
  const buffer = await renderPdf(html);
  return {
    buffer,
    contentType: PDF_CONTENT_TYPE,
    fileName: `${fileBase}_proposal.pdf`,
  };
}
