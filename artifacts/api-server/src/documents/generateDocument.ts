import { buildProposalModel } from "./builders/proposal";
import { buildCharterModel, buildFleetCharterModel } from "./builders/charter";
import { buildCostModel } from "./builders/cost";
import { buildListingModel } from "./builders/listing";
import { buildRoiModel } from "./builders/roi";
import { buildSurveyModel } from "./builders/survey";
import { buildValuationModel } from "./builders/valuation";
import { renderPdf } from "./pdf/generatePdf";
import { renderModelToPdfHtml } from "./pdf/renderModelToPdfHtml";
import { photoList, validateImageUrls } from "./core/util";
import { logger } from "../lib/logger";
import {
  PDF_CONTENT_TYPE,
  normalizeTemplate,
  type GenerateDocumentRequest,
  type GeneratedDocument,
  type CharterReportData,
  type CostReportData,
  type FleetCharterReportData,
  type ListingReportData,
  type ProposalReportData,
  type RoiReportData,
  type SurveyReportData,
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

export async function generateDocument(
  req: GenerateDocumentRequest,
): Promise<GeneratedDocument> {
  if (
    req.documentType !== "proposal" &&
    req.documentType !== "valuation_report" &&
    req.documentType !== "roi_report" &&
    req.documentType !== "cost_report" &&
    req.documentType !== "listing_report" &&
    req.documentType !== "charter_report" &&
    req.documentType !== "fleet_charter_report" &&
    req.documentType !== "survey_report"
  ) {
    throw Object.assign(new Error(`Unsupported documentType: ${req.documentType}`), {
      statusCode: 501,
    });
  }

  const yacht = req.yachtProfile;
  const settings = req.exportSettings ?? {};
  const template = normalizeTemplate(req.template ?? settings.template);

  if (req.documentType === "cost_report") {
    const reportData = (req.reportData ?? {}) as CostReportData;
    const fileBase = safeFileBase(yacht?.name ?? "annual_cost", "annual_cost");
    let yachtForCost = yacht;
    if (yachtForCost) {
      const rawPhotos = photoList(yachtForCost);
      if (rawPhotos.length) {
        const { valid } = await validateImageUrls(rawPhotos);
        yachtForCost = { ...yachtForCost, cover_photo_url: valid[0] ?? null, photo_urls: valid };
      }
    }
    const html = renderModelToPdfHtml(
      buildCostModel({ yacht: yachtForCost, reportData, settings, template }),
    );
    const buffer = await renderPdf(html);
    return {
      buffer,
      contentType: PDF_CONTENT_TYPE,
      fileName: `${fileBase}_annual_cost.pdf`,
    };
  }

  if (req.documentType === "roi_report") {
    const reportData = (req.reportData ?? {}) as RoiReportData;
    const fileBase = safeFileBase(yacht?.name ?? "charter_roi", "charter_roi");
    let yachtForRoi = yacht;
    if (yachtForRoi) {
      const rawPhotos = photoList(yachtForRoi);
      if (rawPhotos.length) {
        const { valid } = await validateImageUrls(rawPhotos);
        yachtForRoi = { ...yachtForRoi, cover_photo_url: valid[0] ?? null, photo_urls: valid };
      }
    }
    const html = renderModelToPdfHtml(
      buildRoiModel({ yacht: yachtForRoi, reportData, settings, template }),
    );
    const buffer = await renderPdf(html);
    return {
      buffer,
      contentType: PDF_CONTENT_TYPE,
      fileName: `${fileBase}_charter_roi.pdf`,
    };
  }

  if (req.documentType === "valuation_report") {
    const reportData = (req.reportData ?? {}) as ValuationReportData;
    const fileBase = safeFileBase(yacht?.name ?? "valuation", "valuation");
    const html = renderModelToPdfHtml(
      buildValuationModel({ yacht, reportData, settings, template }),
    );
    const buffer = await renderPdf(html);
    return {
      buffer,
      contentType: PDF_CONTENT_TYPE,
      fileName: `${fileBase}_valuation.pdf`,
    };
  }

  if (req.documentType === "listing_report") {
    const reportData = (req.reportData ?? {}) as ListingReportData;
    const fileBase = safeFileBase(yacht?.name ?? "listing", "listing");
    let yachtForListing = yacht;
    if (yachtForListing) {
      const rawPhotos = photoList(yachtForListing);
      if (rawPhotos.length) {
        const { valid } = await validateImageUrls(rawPhotos);
        yachtForListing = {
          ...yachtForListing,
          cover_photo_url: valid[0] ?? null,
          photo_urls: valid,
        };
      }
    }
    const html = renderModelToPdfHtml(
      buildListingModel({ yacht: yachtForListing, reportData, settings, template }),
    );
    const buffer = await renderPdf(html);
    return {
      buffer,
      contentType: PDF_CONTENT_TYPE,
      fileName: `${fileBase}_listing.pdf`,
    };
  }

  if (req.documentType === "charter_report") {
    const reportData = (req.reportData ?? {}) as CharterReportData;
    const fileBase = safeFileBase(yacht?.name ?? "charter", "charter");
    let yachtForCharter = yacht;
    if (yachtForCharter) {
      const rawPhotos = photoList(yachtForCharter);
      if (rawPhotos.length) {
        const { valid } = await validateImageUrls(rawPhotos);
        yachtForCharter = {
          ...yachtForCharter,
          cover_photo_url: valid[0] ?? null,
          photo_urls: valid,
        };
      }
    }
    const html = renderModelToPdfHtml(
      buildCharterModel({ yacht: yachtForCharter, reportData, settings, template }),
    );
    const buffer = await renderPdf(html);
    return {
      buffer,
      contentType: PDF_CONTENT_TYPE,
      fileName: `${fileBase}_charter.pdf`,
    };
  }

  if (req.documentType === "fleet_charter_report") {
    const reportData = (req.reportData ?? {}) as FleetCharterReportData;
    const fileBase = safeFileBase(reportData.monthLabel ?? "fleet_charter", "fleet_charter");
    const html = renderModelToPdfHtml(
      buildFleetCharterModel({ yacht, reportData, settings, template }),
    );
    const buffer = await renderPdf(html);
    return {
      buffer,
      contentType: PDF_CONTENT_TYPE,
      fileName: `${fileBase}_fleet_charter.pdf`,
    };
  }

  if (req.documentType === "survey_report") {
    const reportData = (req.reportData ?? {}) as SurveyReportData;
    const fileBase = safeFileBase(yacht?.name ?? "survey", "survey");
    const html = renderModelToPdfHtml(
      buildSurveyModel({ yacht, reportData, settings, template }),
    );
    const buffer = await renderPdf(html);
    return {
      buffer,
      contentType: PDF_CONTENT_TYPE,
      fileName: `${fileBase}_survey.pdf`,
    };
  }

  const reportData = (req.reportData ?? {}) as ProposalReportData;
  const fileBase = safeFileBase(yacht?.name ?? "proposal", "proposal");
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
  const html = renderModelToPdfHtml(
    buildProposalModel({ yacht, reportData, settings, template, photos: valid }),
  );
  const buffer = await renderPdf(html);
  return {
    buffer,
    contentType: PDF_CONTENT_TYPE,
    fileName: `${fileBase}_proposal.pdf`,
  };
}
