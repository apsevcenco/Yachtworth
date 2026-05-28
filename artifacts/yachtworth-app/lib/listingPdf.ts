import * as Print from "expo-print";
import * as Sharing from "expo-sharing";

const NAVY = "#0B1E3F";
const NAVY_DEEP = "#081633";
const NAVY_ELEV = "#142A52";
const GOLD = "#C9A961";
const IVORY = "#F7F3EC";
const MUTED = "rgba(247,243,236,0.6)";
const DIVIDER = "rgba(247,243,236,0.1)";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttr(s: string): string {
  return escapeHtml(s);
}

// Lightweight markdown → safe HTML.
// Supports: ## headings, **bold**, bullet lists (- ), and paragraphs.
function markdownToHtml(md: string): string {
  const lines = md.split(/\r?\n/);
  const out: string[] = [];
  let inList = false;
  let paragraph: string[] = [];
  const flushParagraph = () => {
    if (paragraph.length) {
      out.push(`<p>${inlineMd(paragraph.join(" "))}</p>`);
      paragraph = [];
    }
  };
  const closeList = () => {
    if (inList) {
      out.push("</ul>");
      inList = false;
    }
  };
  for (const raw of lines) {
    const line = raw.trimEnd();
    if (!line.trim()) {
      flushParagraph();
      closeList();
      continue;
    }
    const h2 = line.match(/^##\s+(.+)$/);
    if (h2) {
      flushParagraph();
      closeList();
      out.push(`<h2>${inlineMd(h2[1]!)}</h2>`);
      continue;
    }
    const h3 = line.match(/^###\s+(.+)$/);
    if (h3) {
      flushParagraph();
      closeList();
      out.push(`<h3>${inlineMd(h3[1]!)}</h3>`);
      continue;
    }
    const bullet = line.match(/^[-*]\s+(.+)$/);
    if (bullet) {
      flushParagraph();
      if (!inList) {
        out.push("<ul>");
        inList = true;
      }
      out.push(`<li>${inlineMd(bullet[1]!)}</li>`);
      continue;
    }
    closeList();
    paragraph.push(line);
  }
  flushParagraph();
  closeList();
  return out.join("\n");
}

function inlineMd(s: string): string {
  // Escape first, then apply formatting.
  let out = escapeHtml(s);
  out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  out = out.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, "<em>$1</em>");
  return out;
}

export interface ListingPdfInput {
  yachtName: string;
  builder?: string | null;
  model?: string | null;
  yearBuilt?: number | null;
  lengthMeters?: number | null;
  yachtType?: string | null;
  photoUrl?: string | null;
  generatedText: string;
  askingPriceEur?: number | null;
  charterRateEurWeek?: number | null;
  brokerageName?: string | null;
  contactEmail?: string | null;
}

function formatEur(n: number): string {
  return "€ " + Math.round(n).toLocaleString("en-US");
}

function humanizeType(t: string): string {
  return t.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function buildListingPdfHtml(input: ListingPdfInput): string {
  const subtitleParts = [
    input.builder,
    input.model,
    input.yachtType ? humanizeType(input.yachtType) : null,
    input.yearBuilt ? String(input.yearBuilt) : null,
    input.lengthMeters ? `${input.lengthMeters.toFixed(1)} m` : null,
  ].filter(Boolean) as string[];
  const today = new Date().toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  const bodyHtml = markdownToHtml(input.generatedText);
  const priceLines: string[] = [];
  if (input.askingPriceEur != null) {
    priceLines.push(
      `<div class="price-row"><span class="k">Asking price</span><span class="v">${escapeHtml(formatEur(input.askingPriceEur))}</span></div>`,
    );
  }
  if (input.charterRateEurWeek != null) {
    priceLines.push(
      `<div class="price-row"><span class="k">Charter rate</span><span class="v">${escapeHtml(formatEur(input.charterRateEurWeek))} / week</span></div>`,
    );
  }
  const heroPhoto = input.photoUrl
    ? `<div class="hero-photo" style="background-image:url('${escapeAttr(input.photoUrl)}')"></div>`
    : `<div class="hero-photo placeholder"><span>⚓</span></div>`;

  return `<!doctype html>
<html><head><meta charset="utf-8" />
<title>${escapeAttr(input.yachtName)} — Listing</title>
<style>
  @page { size: A4; margin: 22mm 18mm; }
  * { box-sizing: border-box; }
  body {
    font-family: -apple-system, "Helvetica Neue", Helvetica, Arial, sans-serif;
    color: ${IVORY}; background: ${NAVY}; margin: 0; padding: 0;
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }
  .wrap { padding: 26px 28px 32px; }
  .brand-row {
    display: flex; justify-content: space-between; align-items: center;
    border-bottom: 1px solid ${DIVIDER}; padding-bottom: 12px; margin-bottom: 20px;
  }
  .brand { color: ${GOLD}; font-size: 11px; letter-spacing: 4px; text-transform: uppercase; font-weight: 600; }
  .date { color: ${MUTED}; font-size: 10px; letter-spacing: 1px; text-transform: uppercase; }
  .gold-line { height: 2px; background: ${GOLD}; margin: 4px 0 18px; }
  h1 { color: ${IVORY}; font-size: 30px; line-height: 1.15; margin: 0 0 4px; font-weight: 800; letter-spacing: -0.4px; }
  .subtitle { color: ${MUTED}; font-size: 13px; margin-bottom: 18px; }
  .hero-photo {
    width: 100%; height: 220px; border-radius: 14px; background-size: cover;
    background-position: center; background-color: ${NAVY_ELEV};
    border: 1px solid ${DIVIDER}; margin-bottom: 22px;
    display: flex; align-items: center; justify-content: center;
  }
  .hero-photo.placeholder span { color: ${GOLD}; font-size: 48px; }
  .body {
    background: ${NAVY_DEEP}; border-radius: 14px; padding: 22px 24px;
    border: 1px solid ${DIVIDER}; color: ${IVORY}; font-size: 13px; line-height: 1.65;
  }
  .body h2 {
    color: ${GOLD}; font-size: 12px; letter-spacing: 2px; text-transform: uppercase;
    margin: 18px 0 8px; font-weight: 700;
  }
  .body h2:first-child { margin-top: 0; }
  .body h3 { color: ${IVORY}; font-size: 14px; margin: 14px 0 6px; font-weight: 700; }
  .body p { margin: 0 0 10px; }
  .body ul { margin: 0 0 12px; padding-left: 18px; }
  .body li { margin-bottom: 4px; }
  .body strong { color: ${IVORY}; }
  .prices {
    margin-top: 18px; background: ${NAVY_ELEV}; border-radius: 12px;
    padding: 14px 18px; border: 1px solid rgba(201,169,97,0.22);
  }
  .price-row { display: flex; justify-content: space-between; margin: 4px 0; font-size: 13px; }
  .price-row .k { color: ${GOLD}; font-weight: 600; }
  .price-row .v { color: ${IVORY}; font-weight: 700; }
  .footer {
    margin-top: 24px; padding-top: 14px; border-top: 1px solid ${DIVIDER};
    color: ${MUTED}; font-size: 10px; line-height: 1.5; text-align: center;
  }
  .footer .gold { color: ${GOLD}; font-weight: 600; }
</style></head><body><div class="wrap">
  <div class="brand-row">
    <div class="brand">YACHTWORTH · LISTING GENERATOR</div>
    <div class="date">${escapeHtml(today)}</div>
  </div>
  <div class="gold-line"></div>
  <h1>${escapeHtml(input.yachtName)}</h1>
  ${subtitleParts.length ? `<div class="subtitle">${escapeHtml(subtitleParts.join(" · "))}</div>` : ""}
  ${heroPhoto}
  <div class="body">${bodyHtml}</div>
  ${priceLines.length ? `<div class="prices">${priceLines.join("")}</div>` : ""}
  <div class="footer">
    Generated by <span class="gold">Yachtworth</span> · Powered by PDYE Group
    ${input.brokerageName ? `<br/>${escapeHtml(input.brokerageName)}${input.contactEmail ? ` · ${escapeHtml(input.contactEmail)}` : ""}` : ""}
  </div>
</div></body></html>`;
}

export async function exportListingPdf(input: ListingPdfInput): Promise<void> {
  const html = buildListingPdfHtml(input);
  const { uri } = await Print.printToFileAsync({ html, base64: false });
  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(uri, {
      mimeType: "application/pdf",
      dialogTitle: `Save ${input.yachtName} listing`,
      UTI: "com.adobe.pdf",
    });
  }
}
