// Survey Report PDF builder — YDSA / IIMS / SCMS style.
// White A4 pages with navy/gold accents. Multi-page: Cover · Sections · Recs
// summary · Declaration · Pictures gallery · Sea trial (when filled).
// Recommendations rendered in BLUE ITALIC per industry convention.

import * as Print from "expo-print";
import * as Sharing from "expo-sharing";

import {
  DECLARATION_TEXT,
  GLOSSARY_TEXT,
  REC_OPTIONS,
  SECTION_TEMPLATES,
  type RecLevel,
} from "./surveyTemplates";

const NAVY = "#0B1E3F";
const GOLD = "#C9A961";
const INK = "#1A1F2E";
const MUTED = "#6B7280";
const RULE = "#E5E1D8";
const PAGE_BG = "#FFFFFF";
const REC_BLUE = "#1E4F8C";
const RED_URGENT = "#B33A3A";
const AMBER = "#B07A1E";

export interface SurveyItemForPdf {
  section_number: number;
  section_name: string;
  item_number: string;
  description?: string | null;
  condition?: string | null;
  notes?: string | null;
  recommendation_level?: string | null;
  recommendation_text?: string | null;
  photo_urls?: string[] | null;
  moisture_reading?: number | null;
  moisture_level?: string | null;
  sort_order?: number;
}

export interface SurveyReportForPdf {
  vessel_name: string;
  vessel_type?: string | null;
  manufacturer?: string | null;
  model?: string | null;
  year_built?: number | null;
  flag?: string | null;
  hin?: string | null;
  lying?: string | null;
  survey_date?: string | null;
  survey_purpose?: string | null;
  weather_conditions?: string | null;
  sea_state?: string | null;
  client_name?: string | null;
  client_email?: string | null;
  client_phone?: string | null;
  surveyor_name?: string | null;
  surveyor_qualification?: string | null;
  surveyor_company?: string | null;
  surveyor_phone?: string | null;
  surveyor_email?: string | null;
}

export interface SurveySeaTrialForPdf {
  test_date?: string | null;
  location?: string | null;
  duration_hours?: number | null;
  tickover_p?: number | null;
  tickover_s?: number | null;
  narrative?: string | null;
  rpm_rows?: Array<{
    rpm: number | null;
    coolant_p: number | null;
    coolant_s: number | null;
    oil_p: number | null;
    oil_s: number | null;
    speed: number | null;
  }> | null;
}

export interface SurveyPdfInput {
  report: SurveyReportForPdf;
  items: SurveyItemForPdf[];
  seaTrial?: SurveySeaTrialForPdf | null;
}

function esc(s: string | null | undefined): string {
  if (s == null) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function nl2br(s: string | null | undefined): string {
  if (!s) return "";
  return esc(s).replace(/\r?\n/g, "<br/>");
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function recFullText(level: string, custom: string | null | undefined): string {
  if (custom && custom.trim()) return custom.trim();
  const found = REC_OPTIONS.find((o) => o.value === level);
  return found?.full ?? "";
}

function recBadgeColor(level: string): string {
  if (level === "A") return RED_URGENT;
  if (level === "B") return AMBER;
  return REC_BLUE;
}

// ── Sub-builders ────────────────────────────────────────────────────────────

function buildCover(r: SurveyReportForPdf): string {
  const subtitle = [r.manufacturer, r.model].filter(Boolean).join(" · ");
  const specRows: Array<[string, string]> = [
    ["Vessel", r.vessel_name],
    ["Type", r.vessel_type ?? "—"],
    ["Year built", r.year_built ? String(r.year_built) : "—"],
    ["Flag", r.flag ?? "—"],
    ["HIN", r.hin ?? "—"],
    ["Lying", r.lying ?? "—"],
    ["Survey date", fmtDate(r.survey_date)],
    ["Purpose", r.survey_purpose ?? "Pre-purchase"],
  ];
  const specHtml = specRows
    .map(
      ([k, v]) =>
        `<tr><td class="k">${esc(k)}</td><td class="v">${esc(v)}</td></tr>`,
    )
    .join("");

  const surveyorRows: Array<[string, string]> = [];
  if (r.surveyor_name) surveyorRows.push(["Surveyor", r.surveyor_name]);
  if (r.surveyor_qualification)
    surveyorRows.push(["Qualification", r.surveyor_qualification]);
  if (r.surveyor_company) surveyorRows.push(["Company", r.surveyor_company]);
  if (r.surveyor_email) surveyorRows.push(["Email", r.surveyor_email]);
  if (r.surveyor_phone) surveyorRows.push(["Phone", r.surveyor_phone]);

  const clientRows: Array<[string, string]> = [];
  if (r.client_name) clientRows.push(["Client", r.client_name]);
  if (r.client_email) clientRows.push(["Email", r.client_email]);
  if (r.client_phone) clientRows.push(["Phone", r.client_phone]);

  const sideBlock = (title: string, rows: Array<[string, string]>): string => {
    if (rows.length === 0) return "";
    const body = rows
      .map(
        ([k, v]) =>
          `<div class="side-row"><span class="side-k">${esc(k)}</span><span class="side-v">${esc(v)}</span></div>`,
      )
      .join("");
    return `<div class="side-block"><div class="side-title">${esc(title)}</div>${body}</div>`;
  };

  return `<section class="page cover">
    <div class="cover-top">
      <div class="brand-eyebrow">YACHTWORTH · CONDITION SURVEY</div>
      <div class="brand-date">${esc(fmtDate(r.survey_date))}</div>
    </div>
    <div class="cover-rule"></div>
    <h1 class="cover-title">${esc(r.vessel_name)}</h1>
    ${subtitle ? `<div class="cover-subtitle">${esc(subtitle)}</div>` : ""}
    <div class="cover-purpose">${esc(r.survey_purpose ?? "Pre-purchase Condition Survey")}</div>

    <table class="spec-table">${specHtml}</table>

    <div class="side-grid">
      ${sideBlock("Surveyor", surveyorRows)}
      ${sideBlock("Client", clientRows)}
    </div>

    <div class="cover-footer">
      Report generated by <span class="gold">Yachtworth</span> — Powered by PDYE Group<br/>
      <span class="muted">This report is for the sole use of the named client and is not transferable.</span>
    </div>
  </section>`;
}

function buildItemRow(it: SurveyItemForPdf): string {
  const cond = it.condition ?? "";
  const notes = it.notes ?? "";
  const hasMoisture =
    it.moisture_reading != null ||
    (typeof it.moisture_level === "string" && it.moisture_level.length > 0);
  const moistureLine = hasMoisture
    ? `<div class="moisture"><strong>Moisture:</strong> ${
        it.moisture_reading != null ? esc(String(it.moisture_reading)) + "%" : "—"
      }${it.moisture_level ? ` (${esc(it.moisture_level)})` : ""}</div>`
    : "";

  const lvl = it.recommendation_level ?? "";
  let recBlock = "";
  if (lvl === "A" || lvl === "B" || lvl === "C" || lvl === "D") {
    const text = recFullText(lvl, it.recommendation_text);
    const color = recBadgeColor(lvl);
    recBlock = `<div class="rec-line">
      <span class="rec-badge" style="background:${color}">${esc(lvl)}</span>
      <em class="rec-text">${esc(text)}</em>
    </div>`;
  }

  return `<tr class="item-row">
    <td class="num">${esc(it.item_number)}</td>
    <td class="desc">
      <div class="desc-line">${esc(it.description ?? "—")}</div>
      ${notes ? `<div class="notes">${nl2br(notes)}</div>` : ""}
      ${moistureLine}
      ${recBlock}
    </td>
    <td class="cond">${esc(cond || "—")}</td>
  </tr>`;
}

function buildItemsSection(
  num: number,
  name: string,
  items: SurveyItemForPdf[],
): string {
  const rows =
    items.length === 0
      ? `<tr><td colspan="3" class="empty">No items recorded for this section.</td></tr>`
      : items
          .slice()
          .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
          .map(buildItemRow)
          .join("");
  return `<section class="page section-page">
    <div class="page-head">
      <div class="brand-eyebrow">YACHTWORTH · CONDITION SURVEY</div>
      <div class="sec-num">SECTION ${num}</div>
    </div>
    <div class="cover-rule"></div>
    <h2 class="sec-title">${esc(name)}</h2>
    <table class="items-table">
      <thead>
        <tr>
          <th class="num">#</th>
          <th class="desc">Description / Findings</th>
          <th class="cond">Condition</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  </section>`;
}

function buildStaticSection(num: number, name: string, text: string): string {
  return `<section class="page section-page">
    <div class="page-head">
      <div class="brand-eyebrow">YACHTWORTH · CONDITION SURVEY</div>
      <div class="sec-num">SECTION ${num}</div>
    </div>
    <div class="cover-rule"></div>
    <h2 class="sec-title">${esc(name)}</h2>
    <div class="static-text">${nl2br(text)}</div>
  </section>`;
}

function buildRecsSummary(
  items: SurveyItemForPdf[],
  sectionNumber: number,
): string {
  const grouped: Record<RecLevel, SurveyItemForPdf[]> = { A: [], B: [], C: [], D: [] };
  for (const it of items) {
    const lvl = it.recommendation_level;
    if (lvl === "A" || lvl === "B" || lvl === "C" || lvl === "D") {
      grouped[lvl].push(it);
    }
  }
  const total = grouped.A.length + grouped.B.length + grouped.C.length + grouped.D.length;
  const buildGroup = (lvl: RecLevel): string => {
    const list = grouped[lvl];
    if (list.length === 0) return "";
    const opt = REC_OPTIONS.find((o) => o.value === lvl);
    const color = recBadgeColor(lvl);
    const rows = list
      .map((it) => {
        const text = recFullText(lvl, it.recommendation_text);
        return `<tr>
          <td class="num">${esc(it.item_number)}</td>
          <td class="sec">${esc(it.section_name)}</td>
          <td class="rec"><em>${esc(text)}</em></td>
        </tr>`;
      })
      .join("");
    return `<div class="rec-group">
      <div class="rec-group-head">
        <span class="rec-badge" style="background:${color}">${lvl}</span>
        <span class="rec-group-title">${esc(opt?.short ?? "")} — ${esc(opt?.full ?? "")}</span>
        <span class="rec-group-count">${list.length}</span>
      </div>
      <table class="rec-table">
        <thead><tr><th class="num">Item</th><th class="sec">Section</th><th class="rec">Recommendation</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
  };

  const body = total === 0
    ? `<div class="empty">No recommendations were issued during this survey.</div>`
    : (["A", "B", "C", "D"] as RecLevel[]).map(buildGroup).join("");

  return `<section class="page section-page">
    <div class="page-head">
      <div class="brand-eyebrow">YACHTWORTH · CONDITION SURVEY</div>
      <div class="sec-num">SECTION ${sectionNumber}</div>
    </div>
    <div class="cover-rule"></div>
    <h2 class="sec-title">Recommendations Summary</h2>
    <div class="rec-intro">All recommendations from this survey, grouped by urgency.</div>
    ${body}
  </section>`;
}

function buildDeclarationSection(num: number, surveyor?: string | null): string {
  return `<section class="page section-page">
    <div class="page-head">
      <div class="brand-eyebrow">YACHTWORTH · CONDITION SURVEY</div>
      <div class="sec-num">SECTION ${num}</div>
    </div>
    <div class="cover-rule"></div>
    <h2 class="sec-title">Declaration</h2>
    <div class="static-text">${nl2br(DECLARATION_TEXT)}</div>
    <div class="sig-block">
      <div class="sig-line"></div>
      <div class="sig-label">Signature</div>
      <div class="sig-name">${esc(surveyor ?? "")}</div>
    </div>
  </section>`;
}

function buildPicturesSection(num: number, items: SurveyItemForPdf[]): string {
  const photoEntries: Array<{ url: string; label: string }> = [];
  for (const it of items) {
    const arr = Array.isArray(it.photo_urls) ? it.photo_urls : [];
    for (const u of arr) {
      if (
        typeof u === "string" &&
        u.trim().length > 0 &&
        /^https?:\/\//i.test(u)
      ) {
        // encodeURI prevents CSS-attribute breakout via stray quotes / parens
        // inside an otherwise-valid http(s) URL.
        photoEntries.push({
          url: encodeURI(u),
          label: `${it.item_number} — ${it.section_name}`,
        });
      }
    }
  }
  const body =
    photoEntries.length === 0
      ? `<div class="empty">No photographs were attached to this report.</div>`
      : `<div class="pic-grid">${photoEntries
          .map(
            (p) => `<div class="pic-cell">
            <div class="pic-img" style="background-image:url('${esc(p.url)}')"></div>
            <div class="pic-label">${esc(p.label)}</div>
          </div>`,
          )
          .join("")}</div>`;
  return `<section class="page section-page">
    <div class="page-head">
      <div class="brand-eyebrow">YACHTWORTH · CONDITION SURVEY</div>
      <div class="sec-num">SECTION ${num}</div>
    </div>
    <div class="cover-rule"></div>
    <h2 class="sec-title">Pictures</h2>
    ${body}
  </section>`;
}

function buildSeaTrialSection(
  num: number,
  st: SurveySeaTrialForPdf | null | undefined,
): string {
  if (!st) {
    return `<section class="page section-page">
      <div class="page-head">
        <div class="brand-eyebrow">YACHTWORTH · CONDITION SURVEY</div>
        <div class="sec-num">SECTION ${num}</div>
      </div>
      <div class="cover-rule"></div>
      <h2 class="sec-title">Sea Trial</h2>
      <div class="empty">Sea trial was not conducted as part of this survey.</div>
    </section>`;
  }

  const meta: Array<[string, string]> = [
    ["Date", fmtDate(st.test_date)],
    ["Location", st.location ?? "—"],
    ["Duration", st.duration_hours != null ? `${st.duration_hours} h` : "—"],
    ["Tickover (P)", st.tickover_p != null ? `${st.tickover_p} rpm` : "—"],
    ["Tickover (S)", st.tickover_s != null ? `${st.tickover_s} rpm` : "—"],
  ];
  const metaHtml = meta
    .map(
      ([k, v]) =>
        `<tr><td class="k">${esc(k)}</td><td class="v">${esc(v)}</td></tr>`,
    )
    .join("");

  const rows = (st.rpm_rows ?? [])
    .map(
      (r) => `<tr>
        <td>${esc(r.rpm != null ? String(r.rpm) : "—")}</td>
        <td>${esc(r.coolant_p != null ? String(r.coolant_p) : "—")}</td>
        <td>${esc(r.coolant_s != null ? String(r.coolant_s) : "—")}</td>
        <td>${esc(r.oil_p != null ? String(r.oil_p) : "—")}</td>
        <td>${esc(r.oil_s != null ? String(r.oil_s) : "—")}</td>
        <td>${esc(r.speed != null ? String(r.speed) : "—")}</td>
      </tr>`,
    )
    .join("");

  const rpmTable =
    (st.rpm_rows ?? []).length === 0
      ? ""
      : `<table class="rpm-table">
          <thead><tr>
            <th>RPM</th><th>Coolant P (°C)</th><th>Coolant S (°C)</th>
            <th>Oil P (bar)</th><th>Oil S (bar)</th><th>Speed (kts)</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>`;

  return `<section class="page section-page">
    <div class="page-head">
      <div class="brand-eyebrow">YACHTWORTH · CONDITION SURVEY</div>
      <div class="sec-num">SECTION ${num}</div>
    </div>
    <div class="cover-rule"></div>
    <h2 class="sec-title">Sea Trial</h2>
    <table class="spec-table compact">${metaHtml}</table>
    ${rpmTable}
    ${st.narrative ? `<div class="static-text" style="margin-top:14px">${nl2br(st.narrative)}</div>` : ""}
  </section>`;
}

// ── Top-level builder ───────────────────────────────────────────────────────

export function buildSurveyPdfHtml(input: SurveyPdfInput): string {
  const { report, items, seaTrial } = input;

  const itemsBySection = new Map<number, SurveyItemForPdf[]>();
  for (const it of items) {
    const arr = itemsBySection.get(it.section_number) ?? [];
    arr.push(it);
    itemsBySection.set(it.section_number, arr);
  }

  const pages: string[] = [buildCover(report)];

  for (const sec of SECTION_TEMPLATES) {
    if (sec.kind === "items") {
      pages.push(buildItemsSection(sec.number, sec.name, itemsBySection.get(sec.number) ?? []));
    } else if (sec.kind === "static") {
      pages.push(buildStaticSection(sec.number, sec.name, sec.staticContent ?? ""));
    } else if (sec.kind === "auto_recs") {
      pages.push(buildRecsSummary(items, sec.number));
    } else if (sec.kind === "declaration") {
      pages.push(buildDeclarationSection(sec.number, report.surveyor_name));
    } else if (sec.kind === "pictures") {
      pages.push(buildPicturesSection(sec.number, items));
    } else if (sec.kind === "sea_trial") {
      pages.push(buildSeaTrialSection(sec.number, seaTrial ?? null));
    }
  }

  // Static fallbacks if templates didn't declare specific kinds:
  const hasAutoRecs = SECTION_TEMPLATES.some((s) => s.kind === "auto_recs");
  if (!hasAutoRecs) pages.push(buildRecsSummary(items, 23));
  const hasDeclaration = SECTION_TEMPLATES.some((s) => s.kind === "declaration");
  if (!hasDeclaration) pages.push(buildDeclarationSection(26, report.surveyor_name));

  // Fallback Glossary text if not in template list
  const hasGlossary = SECTION_TEMPLATES.some(
    (s) => s.kind === "static" && (s.staticContent ?? "").includes("Recommendations:"),
  );
  if (!hasGlossary) pages.push(buildStaticSection(3, "Glossary of Terms", GLOSSARY_TEXT));

  return `<!doctype html>
<html><head><meta charset="utf-8" />
<title>${esc(report.vessel_name)} — Condition Survey</title>
<style>
  @page { size: A4; margin: 15mm 20mm; }
  * { box-sizing: border-box; }
  body {
    font-family: -apple-system, "Helvetica Neue", Helvetica, Arial, sans-serif;
    color: ${INK}; background: ${PAGE_BG}; margin: 0; padding: 0;
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
    font-size: 11px; line-height: 1.5;
  }
  .page { page-break-after: always; padding: 0; min-height: 0; }
  .page:last-child { page-break-after: auto; }
  /* Keep individual rows together when paginating long sections */
  table { page-break-inside: auto; }
  tr { page-break-inside: avoid; page-break-after: auto; }
  thead { display: table-header-group; }
  .pic-cell { page-break-inside: avoid; }
  .rec-group { page-break-inside: avoid; }

  /* Brand bar shared by every page */
  .cover-top, .page-head {
    display: flex; justify-content: space-between; align-items: baseline;
    padding-bottom: 6px;
  }
  .brand-eyebrow {
    color: ${GOLD}; font-size: 9px; letter-spacing: 3px; font-weight: 700; text-transform: uppercase;
  }
  .brand-date, .sec-num {
    color: ${NAVY}; font-size: 9px; letter-spacing: 2px; font-weight: 600; text-transform: uppercase;
  }
  .cover-rule { height: 1.5px; background: ${GOLD}; margin: 0 0 14px; }

  /* Cover */
  .cover { padding-top: 6mm; }
  .cover-title {
    color: ${NAVY}; font-size: 36px; letter-spacing: -0.5px;
    font-weight: 800; margin: 18mm 0 4px;
  }
  .cover-subtitle { color: ${MUTED}; font-size: 14px; margin-bottom: 4px; }
  .cover-purpose {
    color: ${GOLD}; font-size: 11px; letter-spacing: 2px;
    font-weight: 700; text-transform: uppercase; margin-bottom: 18mm;
  }
  .spec-table {
    width: 100%; border-collapse: collapse; margin-bottom: 12mm;
  }
  .spec-table td {
    padding: 7px 0; border-bottom: 1px solid ${RULE}; font-size: 11px; vertical-align: top;
  }
  .spec-table td.k {
    color: ${GOLD}; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px;
    font-size: 9px; width: 35%; padding-right: 12px;
  }
  .spec-table td.v { color: ${NAVY}; font-weight: 600; }
  .spec-table.compact td { padding: 5px 0; font-size: 10px; }

  .side-grid {
    display: flex; gap: 14px; margin-bottom: 18mm;
  }
  .side-block {
    flex: 1; border-left: 3px solid ${GOLD}; padding: 8px 12px;
    background: #FAF7F0;
  }
  .side-title {
    color: ${NAVY}; font-size: 9px; letter-spacing: 2px; text-transform: uppercase;
    font-weight: 800; margin-bottom: 6px;
  }
  .side-row { display: flex; justify-content: space-between; margin: 3px 0; font-size: 10px; }
  .side-k { color: ${MUTED}; }
  .side-v { color: ${NAVY}; font-weight: 600; text-align: right; }

  .cover-footer {
    margin-top: 10mm; padding-top: 8px; border-top: 1px solid ${RULE};
    color: ${MUTED}; font-size: 9px; text-align: center; line-height: 1.6;
  }
  .cover-footer .gold { color: ${GOLD}; font-weight: 700; }
  .cover-footer .muted { color: ${MUTED}; font-style: italic; }

  /* Section pages */
  .sec-title {
    color: ${NAVY}; font-size: 22px; font-weight: 800; letter-spacing: -0.3px;
    margin: 6px 0 14px;
  }
  .static-text {
    color: ${INK}; font-size: 11px; line-height: 1.7; white-space: normal;
  }

  /* Items table */
  .items-table {
    width: 100%; border-collapse: collapse; margin-top: 4px;
  }
  .items-table th {
    color: ${GOLD}; font-size: 9px; letter-spacing: 1.5px; text-transform: uppercase;
    font-weight: 700; text-align: left; padding: 6px 8px; border-bottom: 1.5px solid ${GOLD};
  }
  .items-table th.num { width: 10%; }
  .items-table th.cond { width: 22%; }
  .items-table td {
    padding: 8px 8px; border-bottom: 1px solid ${RULE}; vertical-align: top; font-size: 11px;
  }
  .items-table td.num { color: ${NAVY}; font-weight: 700; }
  .items-table td.cond { color: ${INK}; font-weight: 600; }
  .item-row .desc-line { color: ${NAVY}; font-weight: 600; }
  .item-row .notes { color: ${INK}; margin-top: 3px; line-height: 1.55; }
  .item-row .moisture { color: ${INK}; margin-top: 3px; font-size: 10px; }
  .empty { color: ${MUTED}; font-style: italic; padding: 12px 0; text-align: center; }

  /* Recommendation line (BLUE ITALIC) */
  .rec-line {
    margin-top: 6px; display: flex; align-items: flex-start; gap: 6px;
    color: ${REC_BLUE};
  }
  .rec-badge {
    color: white; font-size: 9px; font-weight: 800; padding: 2px 6px;
    border-radius: 3px; letter-spacing: 0.5px; margin-top: 1px; flex-shrink: 0;
  }
  .rec-text { color: ${REC_BLUE}; font-style: italic; font-size: 10.5px; line-height: 1.55; }

  /* Recommendations summary page */
  .rec-intro { color: ${MUTED}; font-size: 10px; margin-bottom: 12px; }
  .rec-group { margin-bottom: 16px; }
  .rec-group-head {
    display: flex; align-items: center; gap: 8px; padding: 6px 8px;
    background: #F4EFE3; border-left: 3px solid ${GOLD};
  }
  .rec-group-title { color: ${NAVY}; font-size: 10px; font-weight: 700; flex: 1; }
  .rec-group-count {
    color: ${NAVY}; font-size: 10px; font-weight: 800; background: white;
    padding: 1px 8px; border-radius: 99px; border: 1px solid ${RULE};
  }
  .rec-table {
    width: 100%; border-collapse: collapse; margin-top: 0;
  }
  .rec-table th {
    color: ${GOLD}; font-size: 9px; letter-spacing: 1.5px; text-transform: uppercase;
    font-weight: 700; text-align: left; padding: 6px 8px; border-bottom: 1px solid ${RULE};
  }
  .rec-table th.num { width: 10%; }
  .rec-table th.sec { width: 25%; }
  .rec-table td {
    padding: 7px 8px; border-bottom: 1px solid ${RULE}; font-size: 10.5px; vertical-align: top;
  }
  .rec-table td.num { color: ${NAVY}; font-weight: 700; }
  .rec-table td.sec { color: ${INK}; }
  .rec-table td.rec em { color: ${REC_BLUE}; font-style: italic; }

  /* Signature block */
  .sig-block { margin-top: 18mm; }
  .sig-line { border-bottom: 1px solid ${NAVY}; width: 60%; margin-bottom: 6px; height: 14mm; }
  .sig-label { color: ${MUTED}; font-size: 9px; text-transform: uppercase; letter-spacing: 1.5px; }
  .sig-name { color: ${NAVY}; font-size: 12px; font-weight: 700; margin-top: 4px; }

  /* Pictures */
  .pic-grid {
    display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 4px;
  }
  .pic-cell {
    border: 1px solid ${RULE}; border-radius: 6px; overflow: hidden; background: ${PAGE_BG};
  }
  .pic-img {
    width: 100%; height: 60mm; background-size: cover; background-position: center;
    background-color: #EFEAE0;
  }
  .pic-label {
    color: ${NAVY}; font-size: 9px; font-weight: 600; padding: 5px 8px;
    border-top: 1px solid ${RULE}; background: #FAF7F0;
  }

  /* Sea trial table */
  .rpm-table {
    width: 100%; border-collapse: collapse; margin-top: 10px;
  }
  .rpm-table th {
    color: ${GOLD}; font-size: 9px; letter-spacing: 1px; text-transform: uppercase;
    font-weight: 700; text-align: left; padding: 6px 6px; border-bottom: 1.5px solid ${GOLD};
  }
  .rpm-table td {
    padding: 6px 6px; border-bottom: 1px solid ${RULE}; font-size: 10.5px; color: ${INK};
  }
</style></head><body>
${pages.join("\n")}
</body></html>`;
}

export async function exportSurveyPdf(input: SurveyPdfInput): Promise<void> {
  const html = buildSurveyPdfHtml(input);
  const { uri } = await Print.printToFileAsync({
    html,
    base64: false,
    width: 595,
    height: 842,
  });
  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(uri, {
      mimeType: "application/pdf",
      dialogTitle: `${input.report.vessel_name} — Condition Survey`,
      UTI: "com.adobe.pdf",
    });
  }
}
