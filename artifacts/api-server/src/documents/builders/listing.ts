import type {
  DocumentTemplate,
  ExportSettings,
  ListingReportData,
  YachtProfile,
} from "../documentTypes";
import { getTheme } from "../core/theme";
import { num, photoList } from "../core/util";
import type { ContentNode, CoverSpec, DocumentModel } from "../model/types";

function titleCase(s: string | null | undefined): string {
  return (s ?? "")
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function money(v: unknown): string {
  const n = num(v);
  if (n == null) return "";
  return `EUR ${Math.round(n).toLocaleString("en-US")}`;
}

function splitListingText(text: string): ContentNode[] {
  const nodes: ContentNode[] = [];
  const lines = text.split(/\r?\n/);
  let paragraph: string[] = [];
  let bullets: string[] = [];

  const flushParagraph = () => {
    const value = paragraph.join(" ").trim();
    if (value) nodes.push({ kind: "paragraph", text: value });
    paragraph = [];
  };
  const flushBullets = () => {
    if (bullets.length) {
      nodes.push({
        kind: "table",
        columns: [{ header: "Highlights" }],
        rows: bullets.map((item) => [{ text: item }]),
      });
      bullets = [];
    }
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      flushParagraph();
      flushBullets();
      continue;
    }
    const h2 = line.match(/^#{2,3}\s+(.+)$/);
    if (h2) {
      flushParagraph();
      flushBullets();
      nodes.push({ kind: "heading", level: 2, text: h2[1] ?? "" });
      continue;
    }
    const bullet = line.match(/^[-*]\s+(.+)$/);
    if (bullet) {
      flushParagraph();
      bullets.push(bullet[1] ?? "");
      continue;
    }
    paragraph.push(line.replace(/\*\*([^*]+)\*\*/g, "$1").replace(/\*([^*]+)\*/g, "$1"));
  }
  flushParagraph();
  flushBullets();
  return nodes;
}

export function buildListingModel(input: {
  yacht: YachtProfile;
  reportData: ListingReportData;
  settings: ExportSettings;
  template: DocumentTemplate;
}): DocumentModel {
  const { yacht, reportData, settings, template } = input;
  const theme = getTheme(template);
  const brand = settings.branding ?? settings.brand_name ?? "Yachtworth";
  const date = new Date().toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const photos = photoList(yacht);
  const subtitle = [yacht.builder, yacht.model, yacht.yacht_type ? titleCase(yacht.yacht_type) : null]
    .filter(Boolean)
    .join(" · ");

  const cells: CoverSpec["cells"] = [];
  if (yacht.year_built) cells.push({ label: "Year", value: String(yacht.year_built) });
  if (yacht.length_meters) cells.push({ label: "Length", value: `${yacht.length_meters} m` });
  if (reportData.listingType) cells.push({ label: "Listing", value: titleCase(reportData.listingType) });
  if (reportData.style) cells.push({ label: "Style", value: titleCase(reportData.style) });

  const price =
    reportData.askingPriceEur != null
      ? money(reportData.askingPriceEur)
      : reportData.charterRateEurWeek != null
        ? `${money(reportData.charterRateEurWeek)} / week`
        : undefined;

  const cover: CoverSpec = {
    eyebrow: `${brand} · LISTING REPORT`,
    name: yacht.name?.trim() || "Yacht Listing",
    date,
    cells,
  };
  if (subtitle) cover.subtitle = subtitle;
  if (photos[0]) cover.photoUrl = photos[0];
  if (price) cover.price = price;

  const body: ContentNode[] = [];
  const commercialRows = [
    reportData.askingPriceEur != null ? { label: "Asking price", value: money(reportData.askingPriceEur) } : null,
    reportData.charterRateEurWeek != null
      ? { label: "Charter rate", value: `${money(reportData.charterRateEurWeek)} / week` }
      : null,
    reportData.brokerageName ? { label: "Brokerage", value: reportData.brokerageName } : null,
    reportData.contactEmail ? { label: "Contact", value: reportData.contactEmail } : null,
  ].filter(Boolean) as { label: string; value: string }[];
  if (commercialRows.length) {
    body.push({ kind: "keyValue", heading: "Commercial Snapshot", rows: commercialRows, layout: "inline" });
  }

  const listingNodes = splitListingText(reportData.generatedText?.trim() || "");
  const fallbackNodes: ContentNode[] = [{ kind: "paragraph", text: "No listing text provided." }];
  body.push(...(listingNodes.length ? listingNodes : fallbackNodes));

  body.push({
    kind: "callout",
    tone: "legal",
    text: "This listing text is prepared for marketing and brokerage support. Vessel particulars, availability, pricing, and VAT status should be verified before publication.",
  });

  return {
    meta: {
      type: "listing_report",
      brand,
      title: "LISTING REPORT",
      language: settings.language ?? reportData.language ?? "english",
      confidential: !!settings.confidential,
      watermarkText: "CONFIDENTIAL",
      generatedAt: date,
    },
    theme,
    cover,
    body,
  };
}
