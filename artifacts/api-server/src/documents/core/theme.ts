import type { DocumentTemplate } from "../documentTypes";
import type { RenderTheme } from "./types";

export const NAVY = "#0B1E3F";
export const GOLD = "#C5973A";
export const IVORY = "#F7F3EC";

export const THEMES: Record<DocumentTemplate, RenderTheme> = {
  minimal: {
    pageBg: "#ffffff",
    text: "#1a1a1a",
    textMuted: "#6b6b6b",
    accent: GOLD,
    line: "#e6e1d8",
    coverBg: "#ffffff",
    coverText: "#1a1a1a",
    coverAccent: GOLD,
    tableHeadBg: "#faf7f1",
    panelBg: "#faf7f1",
  },
  classic: {
    pageBg: "#ffffff",
    text: "#13294b",
    textMuted: "#5a6a85",
    accent: "#1B3A6B",
    line: "#d3dceb",
    coverBg: "#1B3A6B",
    coverText: "#ffffff",
    coverAccent: GOLD,
    tableHeadBg: "#eef2f9",
    panelBg: "#eef2f9",
  },
  premium: {
    pageBg: "#ffffff",
    text: "#15151a",
    textMuted: "#6b6b73",
    accent: GOLD,
    line: "#e3ddd0",
    coverBg: NAVY,
    coverText: IVORY,
    coverAccent: GOLD,
    tableHeadBg: "#f5f1e8",
    panelBg: "#f5f1e8",
  },
};

export function getTheme(t: DocumentTemplate): RenderTheme {
  return THEMES[t];
}

/**
 * Shared CSS for the adaptive block layout. Mirrors the legacy valuation visual
 * language (navy/gold/white premium, A4) but adds block-flow rules:
 *  - `.page` is a packed page (forced break after each, except the last).
 *  - `.block` never splits across a page (`break-inside: avoid`) — this prevents
 *    orphan headings.
 *  - flex children get `min-width: 0` to prevent the vertical text-wrapping bug.
 */
export function adaptiveCss(t: RenderTheme, confidential: boolean): string {
  return `
  @page { size: A4; margin: 16mm 15mm; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body {
    font-family: -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    color: ${t.text};
    background: ${t.pageBg};
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
    font-size: 11px;
    line-height: 1.5;
  }
  .page { page-break-after: always; position: relative; padding-top: 4mm; }
  .page:last-child { page-break-after: auto; }
  .cover-page { padding-top: 0; }
  .block { break-inside: avoid; page-break-inside: avoid; }
  .block + .block { margin-top: 16px; }
  .muted { color: ${t.textMuted}; }
  .eyebrow {
    color: ${t.accent};
    font-size: 10px;
    letter-spacing: 2.5px;
    font-weight: 700;
    text-transform: uppercase;
    border-bottom: 1px solid ${t.line};
    padding-bottom: 6px;
    margin-bottom: 14px;
  }
  /* cover */
  .cover {
    page-break-after: always;
    height: 257mm;
    background: ${t.coverBg};
    color: ${t.coverText};
    position: relative;
    overflow: hidden;
    border-radius: 2px;
  }
  .cover-photo { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
  .cover-overlay {
    position: absolute; inset: 0;
    background: linear-gradient(to bottom, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.05) 30%, rgba(0,0,0,0.72) 78%, rgba(0,0,0,0.9) 100%);
  }
  .cover-inner { position: absolute; left: 0; right: 0; bottom: 0; padding: 16mm; }
  .cover-eyebrow {
    color: ${t.coverAccent}; letter-spacing: 4px; font-size: 11px; font-weight: 700;
    text-transform: uppercase; margin-bottom: 10px;
    text-shadow: 0 1px 4px rgba(0,0,0,0.6);
  }
  .cover-name { font-size: 34px; font-weight: 800; letter-spacing: -0.5px; margin: 0 0 4px; text-shadow: 0 2px 8px rgba(0,0,0,0.7); }
  .cover-sub { font-size: 13px; opacity: 0.9; margin-bottom: 16px; text-shadow: 0 1px 5px rgba(0,0,0,0.65); }
  .cover-grid { display: flex; flex-wrap: wrap; gap: 0; border-top: 1px solid rgba(255,255,255,0.35); }
  .cover-cell { flex: 1 1 20%; padding: 10px 6px 0; min-width: 80px; }
  .cover-cell .cl { font-size: 8.5px; letter-spacing: 1.5px; text-transform: uppercase; color: ${t.coverAccent}; text-shadow: 0 1px 4px rgba(0,0,0,0.6); }
  .cover-cell .cv { font-size: 13px; font-weight: 600; text-shadow: 0 1px 5px rgba(0,0,0,0.65); }
  .cover-price { margin-top: 14px; font-size: 22px; font-weight: 800; color: ${t.coverAccent}; text-shadow: 0 2px 8px rgba(0,0,0,0.7); }
  .cover-date { position: absolute; top: 16mm; right: 16mm; font-size: 10px; letter-spacing: 1px; opacity: 0.7; }
  /* tables */
  table.spec { width: 100%; border-collapse: collapse; }
  table.spec td { padding: 7px 4px; border-bottom: 1px solid ${t.line}; vertical-align: top; }
  .spec-l { color: ${t.accent}; font-size: 9px; letter-spacing: 1px; text-transform: uppercase; width: 40%; font-weight: 700; }
  .spec-v { font-weight: 600; }
  .two-col { display: flex; gap: 18px; }
  .two-col > div { flex: 1; min-width: 0; }
  .sub-h { font-size: 12px; font-weight: 700; margin: 0 0 8px; color: ${t.text}; }
  /* valuation result */
  .val-head { font-size: 13px; font-weight: 700; margin-bottom: 14px; color: ${t.text}; }
  .val-row { display: flex; gap: 12px; margin-bottom: 22px; }
  .val-box { flex: 1; min-width: 0; background: ${t.panelBg}; border-top: 3px solid ${t.line}; padding: 18px 14px; border-radius: 2px; text-align: center; }
  .val-box-mid { border-top: 3px solid ${t.accent}; }
  .val-label { color: ${t.accent}; font-size: 9px; letter-spacing: 1.5px; text-transform: uppercase; font-weight: 700; margin-bottom: 8px; }
  .val-amount { font-size: 20px; font-weight: 800; }
  .val-box-mid .val-amount { font-size: 24px; }
  .conf { margin-top: 6px; }
  .conf-head { color: ${t.accent}; font-size: 9px; letter-spacing: 1.5px; text-transform: uppercase; font-weight: 700; margin-bottom: 8px; }
  .conf-bar { background: ${t.panelBg}; border-radius: 10px; height: 12px; overflow: hidden; }
  .conf-fill { background: ${t.accent}; height: 100%; }
  .conf-val { margin-top: 6px; font-weight: 700; font-size: 13px; }
  /* comparables */
  table.cmp { width: 100%; border-collapse: collapse; }
  table.cmp td { padding: 9px 4px; border-bottom: 1px solid ${t.line}; vertical-align: top; }
  .cmp-name { font-weight: 600; }
  .cmp-sub { color: ${t.textMuted}; font-weight: 400; font-size: 10px; margin-top: 2px; }
  .cmp-src { color: ${t.accent}; font-weight: 600; font-size: 8.5px; letter-spacing: 0.5px; text-transform: uppercase; margin-top: 3px; }
  .cmp-price { text-align: right; font-weight: 800; white-space: nowrap; width: 28%; }
  /* factors */
  table.fct { width: 100%; border-collapse: collapse; }
  table.fct td { padding: 9px 4px; border-bottom: 1px solid ${t.line}; vertical-align: top; }
  .fct-name { font-weight: 600; }
  .fct-note { color: ${t.textMuted}; font-weight: 400; font-size: 10px; margin-top: 2px; }
  .fct-impact { text-align: right; white-space: nowrap; width: 30%; }
  .chip { display: inline-block; padding: 3px 9px; border-radius: 10px; font-size: 9px; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase; }
  .imp-pos { background: #e7f4ec; color: #1f7a44; }
  .imp-neg { background: #fbeaea; color: #b02a2a; }
  .imp-neu { background: ${t.panelBg}; color: ${t.textMuted}; }
  .fw { display: inline-block; margin-left: 8px; color: ${t.textMuted}; font-weight: 700; font-size: 10px; }
  /* notes + contact + disclaimer */
  .notes { background: ${t.panelBg}; border-radius: 2px; padding: 12px 14px; }
  .notes p { margin: 0; }
  .contact { margin-top: 4px; }
  .disclaimer { color: ${t.textMuted}; font-size: 9px; font-style: italic; }
  /* generic adaptive-engine nodes (shared by all document types) */
  .sec-h { font-weight: 800; color: ${t.text}; margin: 0 0 10px; border-bottom: 2px solid ${t.accent}; padding-bottom: 6px; }
  .sec-h.h1 { font-size: 16px; }
  .sec-h.h2 { font-size: 14px; }
  .sec-h.h3 { font-size: 12px; }
  table.tbl { width: 100%; border-collapse: collapse; }
  table.tbl th { text-align: left; color: ${t.accent}; font-size: 9px; letter-spacing: 1px; text-transform: uppercase; font-weight: 700; padding: 0 4px 6px; border-bottom: 1px solid ${t.line}; }
  table.tbl td { padding: 9px 4px; border-bottom: 1px solid ${t.line}; vertical-align: top; }
  .tbl-sub { color: ${t.textMuted}; font-weight: 400; font-size: 10px; margin-top: 2px; }
  .tbl-src { color: ${t.accent}; font-weight: 600; font-size: 8.5px; letter-spacing: 0.5px; text-transform: uppercase; margin-top: 3px; }
  .tbl-accent { color: ${t.accent}; }
  .ta-r { text-align: right; }
  .ta-c { text-align: center; }
  .b { font-weight: 700; }
  .i { font-style: italic; }
  td.b, td.i, td.tbl-accent, td.muted { /* ensure cell-level utility classes apply */ }
  .tag-a { background: #fbeaea; color: #b02a2a; }
  .tag-b { background: #fdf1e3; color: #b5701a; }
  .tag-c { background: #e8eef9; color: #26508f; }
  .tag-d { background: ${t.panelBg}; color: ${t.textMuted}; }
  /* gallery */
  .gallery { display: flex; flex-wrap: wrap; gap: ${"2mm"}; }
  .gal-cell { overflow: hidden; }
  .gal-img { width: 100%; height: 36mm; object-fit: cover; border-radius: 2px; display: block; }
  .gal-cap { font-size: 9px; color: ${t.textMuted}; margin-top: 3px; }
  .single-img { width: 100%; object-fit: contain; display: block; border-radius: 2px; }
  /* callout */
  .callout { background: ${t.panelBg}; border-left: 3px solid ${t.accent}; padding: 10px 14px; border-radius: 2px; font-size: 10.5px; }
  .callout.legal { font-style: italic; color: ${t.textMuted}; }
  /* signature */
  .sig-img { max-width: 60%; max-height: 30mm; object-fit: contain; display: block; }
  .sig-line { border-top: 1px solid ${t.text}; width: 60%; margin-top: 22px; }
  .sig-name { font-weight: 600; margin-top: 6px; }
  .sig-role { font-size: 10px; margin-top: 2px; }
  .divider { border-top: 1px solid ${t.line}; }
  ${
    confidential
      ? `.watermark { position: fixed; top: 45%; left: 0; right: 0; text-align: center;
           font-size: 60px; font-weight: 800; color: ${t.accent}; opacity: 0.08;
           transform: rotate(-28deg); letter-spacing: 8px; z-index: 0; }`
      : ".watermark { display: none; }"
  }
  `;
}
