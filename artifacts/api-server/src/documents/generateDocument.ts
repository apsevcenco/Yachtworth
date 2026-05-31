import { renderProposalDocx } from "./docx/generateDocx";
import { renderPdf } from "./pdf/generatePdf";
import { buildProposalHtml } from "./pdf/templates/proposalTemplate";
import {
  DOCX_CONTENT_TYPE,
  PDF_CONTENT_TYPE,
  normalizeTemplate,
  type GenerateDocumentRequest,
  type GeneratedDocument,
} from "./documentTypes";

function safeFileBase(name: string): string {
  const base = (name || "proposal")
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "_")
    .slice(0, 60);
  return base || "proposal";
}

/**
 * Universal document dispatcher. Currently supports `documentType: "proposal"`
 * in both `pdf` and `docx` formats. Designed so future tools (valuation,
 * ownership cost, charter ROI, charter planner, survey reports) can plug in
 * their own templates without touching the transport/route layer.
 */
export async function generateDocument(
  req: GenerateDocumentRequest,
): Promise<GeneratedDocument> {
  if (req.documentType !== "proposal") {
    throw Object.assign(new Error(`Unsupported documentType: ${req.documentType}`), {
      statusCode: 501,
    });
  }

  const yacht = req.yachtProfile;
  const reportData = req.reportData ?? {};
  const settings = req.exportSettings ?? {};
  const template = normalizeTemplate(req.template ?? settings.template);
  const fileBase = safeFileBase(yacht?.name ?? "proposal");

  if (req.format === "docx") {
    const buffer = await renderProposalDocx({ yacht, reportData, settings });
    return {
      buffer,
      contentType: DOCX_CONTENT_TYPE,
      fileName: `${fileBase}_proposal.docx`,
    };
  }

  // default: pdf
  const html = buildProposalHtml({ yacht, reportData, settings, template });
  const buffer = await renderPdf(html);
  return {
    buffer,
    contentType: PDF_CONTENT_TYPE,
    fileName: `${fileBase}_proposal.pdf`,
  };
}
