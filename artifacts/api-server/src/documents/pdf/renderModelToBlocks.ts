/**
 * PDF renderer: DocumentModel → DocBlock[].
 *
 * This is the PDF half of the "one model, two renderers" design. It turns the
 * semantic, raw-text model into themed, HTML-escaped page blocks that the
 * existing paginator + puppeteer pipeline consume.
 *
 * All HTML escaping happens HERE (the model is raw). Tables and galleries are
 * split greedily across pages with a repeated header / row-group so nothing
 * overflows and no image is cut — this is what makes a multi-page survey report
 * possible without per-type code.
 */
import type { DocBlock } from "../core/types";
import { PACK_BUDGET_MM } from "../core/types";
import { esc, isHttps } from "../core/util";
import {
  measureNode,
  measureTable,
  measureTableRow,
  HEADING_MM,
  ROW_BASE_MM,
  GALLERY_GAP_MM,
  GAL_IMG_MM,
  GAL_CAP_MM,
} from "../model/measure";
import type {
  CardNode,
  CellTone,
  ColumnsNode,
  ContentNode,
  CoverSpec,
  DocumentModel,
  GalleryNode,
  KeyValueGridNode,
  MetricsNode,
  ParagraphNode,
  SignatureNode,
  TableCell,
  TableColumn,
  TableNode,
} from "../model/types";

const TONE_CLASS: Record<CellTone, string> = {
  pos: "imp-pos",
  neg: "imp-neg",
  neu: "imp-neu",
  a: "tag-a",
  b: "tag-b",
  c: "tag-c",
  d: "tag-d",
};

const CALLOUT_TONES = new Set(["muted", "info", "legal"]);
const DEFAULT_TABLE_CHUNK_MM = 112;
const SURVEY_TABLE_CHUNK_MM = 86;
const MAINTENANCE_TABLE_CHUNK_MM = 124;

/** Clamp any caller-supplied number that lands in inline CSS to a safe range. */
function clampMm(v: unknown, fallback: number, min = 0, max = 265): number {
  const n = typeof v === "number" && Number.isFinite(v) ? v : fallback;
  return Math.max(min, Math.min(max, n));
}

function clampPct(v: unknown): number {
  const n = typeof v === "number" && Number.isFinite(v) ? v : 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

/** Accept https URLs and inline base64 raster images (used by signatures). */
function isImageSrc(u: unknown): u is string {
  return (
    isHttps(u) ||
    (typeof u === "string" && /^data:image\/(png|jpe?g|webp);base64,/i.test(u))
  );
}

function alignClass(a: TableCell["align"] | TableColumn["align"]): string {
  if (a === "right") return "ta-r";
  if (a === "center") return "ta-c";
  return "";
}

// ─── cover ──────────────────────────────────────────────────────────────────

function coverBlock(c: CoverSpec): DocBlock {
  const photo = isHttps(c.photoUrl) ? c.photoUrl : undefined;
  const logo = isHttps(c.logoUrl) ? c.logoUrl : undefined;
  const cells = c.cells
    .map(
      (cell) =>
        `<div class="cover-cell"><div class="cl">${esc(cell.label)}</div><div class="cv">${esc(
          cell.value,
        )}</div></div>`,
    )
    .join("");
  const html = `<div class="cover">
    ${photo ? `<img class="cover-photo" src="${esc(photo)}" />` : ""}
    ${photo ? `<div class="cover-overlay"></div>` : `<div class="cover-frame"></div>`}
    ${logo ? `<img class="cover-logo" src="${esc(logo)}" />` : ""}
    <div class="cover-date">${esc(c.date)}</div>
    <div class="cover-inner">
      <div class="cover-eyebrow">${esc(c.eyebrow)}</div>
      <h1 class="cover-name">${esc(c.name)}</h1>
      ${c.subtitle ? `<div class="cover-sub">${esc(c.subtitle)}</div>` : ""}
      ${cells ? `<div class="cover-grid">${cells}</div>` : ""}
      ${c.price ? `<div class="cover-price">${esc(c.price)}</div>` : ""}
    </div>
  </div>`;
  return {
    id: "cover",
    type: "cover",
    estimatedHeight: 261,
    standalone: true,
    fillExempt: true,
    html,
  };
}

// ─── leaf html (no page-splitting; used inline, e.g. inside columns) ──────────

function eyebrow(text: string | undefined): string {
  return text ? `<div class="eyebrow">${esc(text)}</div>` : "";
}

function kvTableHtml(rows: { label: string; value: string }[]): string {
  return `<table class="spec">${rows
    .map(
      (r) =>
        `<tr><td class="spec-l">${esc(r.label)}</td><td class="spec-v">${esc(
          r.value,
        )}</td></tr>`,
    )
    .join("")}</table>`;
}

/** Paired spec grid: two label/value pairs per row (label | value | label | value). */
function kvPairsHtml(rows: { label: string; value: string }[]): string {
  const cells: string[] = [];
  for (let i = 0; i < rows.length; i += 2) {
    const a = rows[i]!;
    const b = rows[i + 1];
    cells.push(
      `<tr><td class="kvg-l">${esc(a.label)}</td><td class="kvg-v">${esc(
        a.value,
      )}</td><td class="kvg-l">${b ? esc(b.label) : ""}</td><td class="kvg-v">${
        b ? esc(b.value) : ""
      }</td></tr>`,
    );
  }
  return `<table class="kv-grid">${cells.join("")}</table>`;
}

/** Compact horizontal commercial strip: `Label value · Label value · …`. */
function kvInlineHtml(rows: { label: string; value: string }[]): string {
  const segs = rows
    .map(
      (r) =>
        `<span class="kvi-item"><span class="kvi-l">${esc(
          r.label,
        )}</span><span class="kvi-v">${esc(r.value)}</span></span>`,
    )
    .join(`<span class="kvi-sep">·</span>`);
  return `<div class="kv-inline">${segs}</div>`;
}

/** Bordered key/value card: heading bar over label/value rows. */
function kvCardHtml(node: KeyValueGridNode): string {
  const body = node.rows.length
    ? `<table class="kvc-tbl">${node.rows
        .map(
          (r) =>
            `<tr><td class="kvc-l">${esc(r.label)}</td><td class="kvc-v">${esc(
              r.value,
            )}</td></tr>`,
        )
        .join("")}</table>`
    : `<p class="muted">${esc(node.emptyText ?? "—")}</p>`;
  return `<div class="kv-card"><div class="eq-card-h">${esc(
    node.heading ?? "",
  )}</div><div class="kv-card-body">${body}</div></div>`;
}

function keyValueHtml(node: KeyValueGridNode): string {
  if (node.layout === "inline") {
    return `${eyebrow(node.heading)}${kvInlineHtml(node.rows)}`;
  }
  if (node.boxed && node.layout !== "pairs") {
    return kvCardHtml(node);
  }
  const body = node.rows.length
    ? node.layout === "pairs"
      ? kvPairsHtml(node.rows)
      : kvTableHtml(node.rows)
    : `<p class="muted">${esc(node.emptyText ?? "—")}</p>`;
  return `${eyebrow(node.heading)}${body}`;
}

/** Bordered category card: title bar over name (+ optional meta) rows. */
function cardHtml(node: CardNode): string {
  const rows = node.items
    .map(
      (it) =>
        `<div class="eq-row"><span class="eq-name">${esc(it.name)}</span>${
          it.meta ? `<span class="eq-meta">${esc(it.meta)}</span>` : ""
        }</div>`,
    )
    .join("");
  return `<div class="eq-card"><div class="eq-card-h">${esc(
    node.heading,
  )}</div><div class="eq-card-body">${rows}</div></div>`;
}

function paragraphHtml(node: ParagraphNode): string {
  const raw = node.text ?? "";
  const body = raw
    ? node.panel
      ? `<div class="notes"><p>${esc(raw).replace(/\n/g, "<br/>")}</p></div>`
      : `<p class="${node.muted ? "muted" : ""}">${esc(raw).replace(/\n/g, "<br/>")}</p>`
    : `<p class="muted">${esc(node.emptyText ?? "—")}</p>`;
  return `${eyebrow(node.heading)}${body}`;
}

function surveyLineHeight(text: string): number {
  return Math.max(4.2, Math.ceil(text.length / 108) * 4.2);
}

function flowLineHeight(text: string): number {
  return Math.max(4.6, Math.ceil(text.length / 112) * 4.6);
}

function flowParagraphLines(raw: string): string[] {
  const lines = raw.split(/\n/).map((line) => line.trim()).filter(Boolean);
  const out: string[] = [];
  for (const line of lines) {
    if (line.length <= 520) {
      out.push(line);
      continue;
    }
    let buffer = "";
    for (const part of line.split(/(?<=[.!?])\s+/)) {
      const next = buffer ? `${buffer} ${part}` : part;
      if (next.length > 520 && buffer) {
        out.push(buffer);
        buffer = part;
      } else {
        buffer = next;
      }
    }
    if (buffer) out.push(buffer);
  }
  return out;
}

function roiMethodologyBlocks(node: ParagraphNode): DocBlock[] {
  const lines = flowParagraphLines(node.text ?? "");
  if (!lines.length) {
    return [
      {
        id: nextId("para"),
        type: "paragraph",
        estimatedHeight: measureNode(node),
        html: leafHtml(node),
      },
    ];
  }

  const groups: string[][] = [];
  let current: string[] = [];
  for (const line of lines) {
    if (/^\d+\.\s+/.test(line) && current.length) {
      groups.push(current);
      current = [];
    }
    current.push(line);
  }
  if (current.length) groups.push(current);

  const cls = node.muted ? ` class="muted"` : "";
  return groups.map((group, idx) => ({
    id: nextId("roi-method"),
    type: idx === 0 && node.heading ? "roi-item" : "roi-line",
    estimatedHeight:
      (idx === 0 && node.heading ? 9.5 : 0) +
      group.reduce((sum, line) => sum + flowLineHeight(line), 0),
    html: `${idx === 0 ? eyebrow(node.heading) : ""}${group
      .map((line) => `<p${cls}>${esc(line)}</p>`)
      .join("")}`,
  }));
}

function panelParagraphBlocks(
  node: ParagraphNode,
  typePrefix: string,
  lineHeight: (text: string) => number,
): DocBlock[] {
  const h = measureNode(node);
  if (h <= 70) {
    return [
      {
        id: nextId("para"),
        type: "paragraph",
        estimatedHeight: h,
        html: leafHtml(node),
      },
    ];
  }

  const lines = flowParagraphLines(node.text ?? "");
  if (!lines.length) {
    return [
      {
        id: nextId("para"),
        type: "paragraph",
        estimatedHeight: h,
        html: leafHtml(node),
      },
    ];
  }

  return lines.map((line, idx) => ({
    id: nextId(`${typePrefix}-note`),
    type: idx === 0 && node.heading ? `${typePrefix}-item` : `${typePrefix}-line`,
    estimatedHeight: (idx === 0 && node.heading ? 9.5 : 0) + 13 + lineHeight(line),
    html: `${idx === 0 ? eyebrow(node.heading) : ""}<div class="notes"><p>${esc(line)}</p></div>`,
  }));
}

function flowParagraphBlocks(node: ParagraphNode, typePrefix: string): DocBlock[] {
  if (node.panel) {
    return panelParagraphBlocks(node, typePrefix, flowLineHeight);
  }
  if (typePrefix === "roi" && node.heading === "How This Was Calculated") {
    return roiMethodologyBlocks(node);
  }
  const lines = flowParagraphLines(node.text ?? "");
  if (!lines.length) {
    return [
      {
        id: nextId("para"),
        type: "paragraph",
        estimatedHeight: measureNode(node),
        html: leafHtml(node),
      },
    ];
  }

  const cls = node.muted ? ` class="muted"` : "";
  return lines.map((line, idx) => ({
    id: nextId(`${typePrefix}-line`),
    type: idx === 0 && node.heading ? `${typePrefix}-item` : `${typePrefix}-line`,
    estimatedHeight: (idx === 0 && node.heading ? 9.5 : 0) + flowLineHeight(line),
    html: `${idx === 0 ? eyebrow(node.heading) : ""}<p${cls}>${esc(line)}</p>`,
  }));
}

function surveyTableLineCount(text: string | undefined, widthPct: number): number {
  const len = (text ?? "").length;
  if (!len) return 0;
  const chars = Math.max(16, Math.floor((108 * widthPct) / 100));
  return Math.ceil(len / chars);
}

function surveyMeasureTableRow(cells: TableCell[], columns: TableColumn[]): number {
  let extra = 0;
  cells.forEach((cell, i) => {
    const widthPct = columns[i]?.widthPct ?? 100 / Math.max(1, cells.length);
    const main = Math.max(1, surveyTableLineCount(cell.text, widthPct));
    const sub = cell.sub ? Math.max(1, surveyTableLineCount(cell.sub, widthPct)) : 0;
    const source = cell.source ? Math.max(1, surveyTableLineCount(cell.source, widthPct)) : 0;
    extra = Math.max(extra, (main - 1) * 4.2 + sub * 3.5 + source * 3.2);
  });
  return 7.4 + extra;
}

function surveyMeasureTable(
  heading: string | undefined,
  columns: TableColumn[],
  rows: TableCell[][],
): number {
  const headingH = heading ? 9.5 : 0;
  const headerH = columns.some((c) => c.header != null && c.header !== "") ? 8 : 0;
  const body = rows.length
    ? rows.reduce((sum, row) => sum + surveyMeasureTableRow(row, columns), 0)
    : 4;
  return headingH + headerH + body;
}

function surveyParagraphBlocks(node: ParagraphNode): DocBlock[] {
  if (node.panel) {
    return panelParagraphBlocks(node, "survey", surveyLineHeight);
  }
  const raw = node.text ?? "";
  const lines = raw.split(/\n/).map((line) => line.trim()).filter(Boolean);
  if (!lines.length) {
    return [
      {
        id: nextId("para"),
        type: "paragraph",
        estimatedHeight: measureNode(node),
        html: leafHtml(node),
      },
    ];
  }

  const cls = node.muted ? ` class="muted"` : "";
  const first = lines[0]!;
  const blocks: DocBlock[] = [
    {
      id: nextId("survey-item"),
      type: node.heading ? "survey-item" : "survey-line",
      estimatedHeight: (node.heading ? 9.5 : 0) + surveyLineHeight(first),
      html: `${eyebrow(node.heading)}<p${cls}>${esc(first)}</p>`,
    },
  ];
  for (const line of lines.slice(1)) {
    blocks.push({
      id: nextId("survey-line"),
      type: "survey-line",
      estimatedHeight: surveyLineHeight(line),
      html: `<p${cls}>${esc(line)}</p>`,
    });
  }
  return blocks;
}

function metricsHtml(node: MetricsNode): string {
  const cards = `<div class="val-row">${node.cards
    .map(
      (c) =>
        `<div class="val-box${c.emphasis ? " val-box-mid" : ""}"><div class="val-label">${esc(
          c.label,
        )}</div><div class="val-amount">${esc(c.value)}</div></div>`,
    )
    .join("")}</div>`;
  const conf = node.confidence
    ? `<div class="conf"><div class="conf-head">${esc(
        node.confidence.label,
      )}</div><div class="conf-bar"><div class="conf-fill" style="width:${clampPct(
        node.confidence.pct,
      )}%"></div></div><div class="conf-val">${clampPct(node.confidence.pct)}%</div></div>`
    : "";
  const cap = node.caption
    ? `<div class="val-cap">${esc(node.caption)}</div>`
    : "";
  return `${eyebrow(node.heading)}${
    node.valueHeading ? `<div class="val-head">${esc(node.valueHeading)}</div>` : ""
  }${cards}${conf}${cap}`;
}

function cellHtml(cell: TableCell, col: TableColumn | undefined): string {
  const align = cell.align ?? col?.align;
  const cls = [
    alignClass(align),
    cell.bold ? "b" : "",
    cell.italic ? "i" : "",
    cell.accent ? "tbl-accent" : "",
    cell.muted ? "muted" : "",
  ]
    .filter(Boolean)
    .join(" ");
  const width = col?.widthPct ? ` style="width:${clampPct(col.widthPct)}%"` : "";
  let inner = "";
  if (cell.tag) inner += `<span class="chip ${TONE_CLASS[cell.tag.tone]}">${esc(cell.tag.text)}</span>`;
  if (cell.text) inner += `${cell.tag ? " " : ""}${esc(cell.text)}`;
  if (cell.sub) inner += `<div class="tbl-sub">${esc(cell.sub)}</div>`;
  if (cell.source) inner += `<div class="tbl-src">${esc(cell.source)}</div>`;
  return `<td class="${cls}"${width}>${inner}</td>`;
}

function tableHtml(columns: TableColumn[], rows: TableCell[][]): string {
  const hasHeader = columns.some((c) => c.header != null && c.header !== "");
  const head = hasHeader
    ? `<tr>${columns
        .map(
          (c) =>
            `<th class="${alignClass(c.align)}"${
              c.widthPct ? ` style="width:${clampPct(c.widthPct)}%"` : ""
            }>${esc(c.header ?? "")}</th>`,
        )
        .join("")}</tr>`
    : "";
  const body = rows
    .map((r) => `<tr>${r.map((cell, i) => cellHtml(cell, columns[i])).join("")}</tr>`)
    .join("");
  return `<table class="tbl">${head}${body}</table>`;
}

function columnsHtml(node: ColumnsNode): string {
  const cols = node.columns
    .map(
      (col) =>
        `<div>${col.subHeading ? `<div class="sub-h">${esc(col.subHeading)}</div>` : ""}${col.nodes
          .map((n) => leafHtml(n))
          .join("")}</div>`,
    )
    .join("");
  return `${eyebrow(node.heading)}<div class="two-col">${cols}</div>`;
}

function galleryHtml(node: GalleryNode, images: GalleryNode["images"]): string {
  const cols = node.columns ?? 3;
  const widthCalc = `calc((100% - ${(cols - 1) * GALLERY_GAP_MM}mm) / ${cols})`;
  const imgHeight = clampMm(node.imageHeightMm, GAL_IMG_MM, 24, 120);
  const cells = images
    .map(
      (im) =>
        `<div class="gal-cell" style="flex:0 0 ${widthCalc};max-width:${widthCalc}"><img class="gal-img" style="height:${imgHeight}mm" src="${esc(
          im.url,
        )}" />${im.caption ? `<div class="gal-cap">${esc(im.caption)}</div>` : ""}</div>`,
    )
    .join("");
  return `${eyebrow(node.heading)}<div class="gallery">${cells}</div>`;
}

function signatureHtml(node: SignatureNode): string {
  const sig = isImageSrc(node.signatureUrl)
    ? `<img class="sig-img" src="${esc(node.signatureUrl)}" />`
    : `<div class="sig-line"></div>`;
  return `${eyebrow(node.heading)}${sig}${
    node.name ? `<div class="sig-name">${esc(node.name)}</div>` : ""
  }${node.line ? `<div class="sig-role muted">${esc(node.line)}</div>` : ""}`;
}

/** HTML for a node with no page-splitting concern (also used inside columns). */
function leafHtml(node: ContentNode): string {
  switch (node.kind) {
    case "heading":
      return `<div class="sec-h h${node.level ?? 2}">${esc(node.text)}</div>`;
    case "keyValue":
      return keyValueHtml(node);
    case "card":
      return cardHtml(node);
    case "columns":
      return columnsHtml(node);
    case "paragraph":
      return paragraphHtml(node);
    case "table":
      return `${eyebrow(node.heading)}${
        node.rows.length
          ? tableHtml(node.columns, node.rows)
          : `<p class="muted">${esc(node.emptyText ?? "—")}</p>`
      }`;
    case "metrics":
      return metricsHtml(node);
    case "gallery":
      return galleryHtml(node, node.images);
    case "image":
      return `${
        isImageSrc(node.url)
          ? `<img class="single-img" src="${esc(node.url)}" style="max-height:${clampMm(
              node.heightMm,
              60,
              5,
            )}mm" />`
          : ""
      }${node.caption ? `<div class="gal-cap">${esc(node.caption)}</div>` : ""}`;
    case "callout": {
      const tone = CALLOUT_TONES.has(node.tone ?? "") ? node.tone : "info";
      return `<div class="callout ${tone}">${esc(node.text).replace(/\n/g, "<br/>")}</div>`;
    }
    case "signature":
      return signatureHtml(node);
    case "divider":
      return `<div class="divider"></div>`;
    case "spacer":
      return `<div style="height:${clampMm(node.mm, 6, 0, 100)}mm"></div>`;
    default: {
      const _exhaustive: never = node;
      return _exhaustive;
    }
  }
}

// ─── top-level blocks (with splitting) ───────────────────────────────────────

let seq = 0;
function nextId(prefix: string): string {
  seq += 1;
  return `${prefix}-${seq}`;
}

/** Split a table's rows greedily into page-sized chunks, header repeated. */
function tableBlocks(node: TableNode, docType?: string): DocBlock[] {
  const isSurvey = docType === "survey_report";
  const isMaintenance = docType === "maintenance_report";
  const measureCurrentTable = isSurvey ? surveyMeasureTable : measureTable;
  const measureCurrentRow = isSurvey ? surveyMeasureTableRow : measureTableRow;
  const pageBudgetMm = isSurvey ? 251 : PACK_BUDGET_MM;
  const headingMm = isSurvey ? 9.5 : HEADING_MM;
  const rowBaseMm = isSurvey ? 8 : ROW_BASE_MM;

  if (!node.rows.length) {
    return [
      {
        id: nextId("table"),
        type: "table",
        estimatedHeight: measureCurrentTable(node.heading, node.columns, node.rows),
        html: leafHtml(node),
      },
    ];
  }
  const full = measureCurrentTable(node.heading, node.columns, node.rows);
  const targetBudget = isSurvey
    ? SURVEY_TABLE_CHUNK_MM
    : isMaintenance
      ? MAINTENANCE_TABLE_CHUNK_MM
      : DEFAULT_TABLE_CHUNK_MM;
  const wholeTableLimit = targetBudget;
  if (full <= wholeTableLimit) {
    return [{ id: nextId("table"), type: "table", estimatedHeight: full, html: leafHtml(node) }];
  }
  const headingH = node.heading ? headingMm : 0;
  const hasHeader = node.columns.some((c) => c.header != null && c.header !== "");
  const headerH = hasHeader ? rowBaseMm : 0;
  const rowBudget = pageBudgetMm - headingH - headerH;
  const budget = Math.max(rowBaseMm * 2, Math.min(rowBudget, targetBudget - headingH - headerH));
  const preferredMinFill = isMaintenance
    ? Math.min(rowBudget, 155 - headingH - headerH)
    : budget;

  const chunks: TableCell[][][] = [];
  let current: TableCell[][] = [];
  let used = 0;
  for (const row of node.rows) {
    const h = measureCurrentRow(row, node.columns);
    const wouldExceedTarget = used + h > budget;
    const canStillImproveFill = used < preferredMinFill && used + h <= rowBudget;
    if (current.length && wouldExceedTarget && !canStillImproveFill) {
      chunks.push(current);
      current = [];
      used = 0;
    }
    current.push(row);
    used += h;
  }
  if (current.length) chunks.push(current);

  return chunks.map((rows, idx) => {
    const heading =
      node.heading && chunks.length > 1
        ? `${node.heading} — ${idx + 1}/${chunks.length}`
        : node.heading;
    const html = `${eyebrow(heading)}${tableHtml(node.columns, rows)}`;
    const estimatedHeight =
      headingH + headerH + rows.reduce((s, r) => s + measureCurrentRow(r, node.columns), 0);
    const block: DocBlock = { id: nextId("table"), type: "table", estimatedHeight, html };
    // A single row taller than a whole page (huge notes cell) cannot be packed
    // whole; let it flow across pages instead of overflowing into a near-empty one.
    if (estimatedHeight > pageBudgetMm) block.splittable = true;
    return block;
  });
}

/** Split a gallery into row-groups that each fit a page. */
function galleryBlocks(node: GalleryNode): DocBlock[] {
  const valid = node.images.filter((im) => isImageSrc(im.url));
  if (!valid.length) return [];
  const cols = node.columns ?? 3;
  const hasCaption = valid.some((im) => im.caption);
  const imgH = clampMm(node.imageHeightMm, GAL_IMG_MM, 24, 120);
  const rowH = imgH + (hasCaption ? GAL_CAP_MM : 0) + GALLERY_GAP_MM;
  const headingH = node.heading ? HEADING_MM : 0;
  const rowsPerPage = Math.max(1, Math.floor((PACK_BUDGET_MM - headingH) / rowH));
  const imgsPerPage = rowsPerPage * cols;

  const groups: GalleryNode["images"][] = [];
  for (let i = 0; i < valid.length; i += imgsPerPage) groups.push(valid.slice(i, i + imgsPerPage));

  return groups.map((images, idx) => {
    const heading =
      node.heading && groups.length > 1
        ? `${node.heading} — ${idx + 1}/${groups.length}`
        : node.heading;
    const galleryRows = Math.ceil(images.length / cols);
    const estimatedHeight = (heading ? HEADING_MM : 0) + galleryRows * rowH;
    return {
      id: nextId("gallery"),
      type: "gallery",
      estimatedHeight,
      html: galleryHtml({ ...node, heading: heading ?? "" }, images),
    };
  });
}

function renderNode(node: ContentNode, docType?: string): DocBlock[] {
  switch (node.kind) {
    case "table":
      return tableBlocks(node, docType);
    case "gallery":
      return galleryBlocks(node);
    case "paragraph": {
      if (docType === "survey_report") return surveyParagraphBlocks(node);
      return flowParagraphBlocks(node, docType === "roi_report" ? "roi" : "doc");
    }
    case "signature": {
      const h = docType === "survey_report" ? 18 : measureNode(node);
      const html = leafHtml(node);
      if (!html) return [];
      return [{ id: nextId(node.kind), type: node.kind, estimatedHeight: h, html }];
    }
    default: {
      const h = measureNode(node);
      const html = leafHtml(node);
      if (!html) return [];
      return [{ id: nextId(node.kind), type: node.kind, estimatedHeight: h, html }];
    }
  }
}

/** Compile a document model into ordered PDF page blocks. */
export function renderModelToBlocks(model: DocumentModel): DocBlock[] {
  seq = 0;
  const blocks: DocBlock[] = [];
  if (model.cover) blocks.push(coverBlock(model.cover));
  for (const node of model.body) {
    const produced = renderNode(node, model.meta.type);
    // Propagate a semantic group boundary onto the first block this node emits.
    const wantsBreak = (node as { breakBefore?: boolean }).breakBefore === true;
    if (wantsBreak && produced[0]) produced[0].breakBefore = true;
    blocks.push(...produced);
  }
  if (model.meta.disclaimer) {
    blocks.push({
      id: "disclaimer",
      type: "disclaimer",
      estimatedHeight: 12,
      html: `<div class="disclaimer">${esc(model.meta.disclaimer)}</div>`,
    });
  }
  return blocks;
}
