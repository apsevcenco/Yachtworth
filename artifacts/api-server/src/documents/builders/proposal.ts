/**
 * Vessel proposal content builder: proposal inputs → DocumentModel.
 *
 * Renderer-independent half of the proposal document (mirrors builders/valuation).
 * Maps yacht specs + proposal data + export settings into the semantic model.
 * It does NOT escape (renderers do) and emits no HTML, so the same model can
 * drive both the PDF renderer and (P1) the DOCX renderer.
 *
 * Per the engine's "duplicate, don't refactor" rule, the label dict + helpers are
 * kept local instead of importing the legacy template — the legacy proposal
 * template stays byte-identical.
 */
import type {
  DocumentTemplate,
  ExportSettings,
  ProposalEquipmentItem,
  ProposalReportData,
  YachtProfile,
} from "../documentTypes";
import { getTheme } from "../core/theme";
import { chunk, num, photoList } from "../core/util";
import { measureNode } from "../model/measure";
import type { ContentNode, CoverSpec, DocumentModel, TableCell } from "../model/types";

// ─── money ──────────────────────────────────────────────────────────────────

function money(v: unknown): string {
  const n = num(v);
  if (n == null) return "";
  return "€ " + Math.round(n).toLocaleString("en-US");
}

// ─── labels (multi-language) ────────────────────────────────────────────────

type Dict = Record<string, string>;
const LABELS: Record<string, Dict> = {
  english: {
    proposal: "VESSEL PROPOSAL",
    specifications: "Specifications",
    accommodation: "Accommodation",
    equipment: "Equipment & Inventory",
    photography: "Photography",
    pricing: "Pricing",
    contact: "Broker Contact",
    forSale: "For Sale",
    forCharter: "For Charter",
    perWeek: "per week",
    poa: "Price on application",
    notes: "Notes",
    delivery: "Delivery",
    seaTrial: "Sea trial",
    contract: "Contract",
    mybaStandard: "MYBA standard",
    charterArea: "Cruising area",
    commercial: "Commercial Summary",
    vat: "VAT status",
    confidential: "CONFIDENTIAL",
    none: "—",
  },
  french: {
    proposal: "PROPOSITION DE NAVIRE",
    specifications: "Spécifications",
    accommodation: "Hébergement",
    equipment: "Équipement & Inventaire",
    photography: "Photographie",
    pricing: "Tarifs",
    contact: "Contact Courtier",
    forSale: "À Vendre",
    forCharter: "En Location",
    perWeek: "par semaine",
    poa: "Prix sur demande",
    notes: "Remarques",
    delivery: "Livraison",
    seaTrial: "Essai en mer",
    contract: "Contrat",
    mybaStandard: "MYBA standard",
    charterArea: "Zone de navigation",
    commercial: "Résumé Commercial",
    vat: "Statut TVA",
    confidential: "CONFIDENTIEL",
    none: "—",
  },
  italian: {
    proposal: "PROPOSTA IMBARCAZIONE",
    specifications: "Specifiche",
    accommodation: "Sistemazione",
    equipment: "Equipaggiamento",
    photography: "Fotografia",
    pricing: "Prezzi",
    contact: "Contatto Broker",
    forSale: "In Vendita",
    forCharter: "A Noleggio",
    perWeek: "a settimana",
    poa: "Prezzo su richiesta",
    notes: "Note",
    delivery: "Consegna",
    seaTrial: "Prova in mare",
    contract: "Contratto",
    mybaStandard: "MYBA standard",
    charterArea: "Area di navigazione",
    commercial: "Riepilogo Commerciale",
    vat: "Stato IVA",
    confidential: "RISERVATO",
    none: "—",
  },
  spanish: {
    proposal: "PROPUESTA DE EMBARCACIÓN",
    specifications: "Especificaciones",
    accommodation: "Alojamiento",
    equipment: "Equipamiento",
    photography: "Fotografía",
    pricing: "Precios",
    contact: "Contacto Bróker",
    forSale: "En Venta",
    forCharter: "En Alquiler",
    perWeek: "por semana",
    poa: "Precio a consultar",
    notes: "Notas",
    delivery: "Entrega",
    seaTrial: "Prueba de mar",
    contract: "Contrato",
    mybaStandard: "MYBA estándar",
    charterArea: "Zona de navegación",
    commercial: "Resumen Comercial",
    vat: "Estado IVA",
    confidential: "CONFIDENCIAL",
    none: "—",
  },
  german: {
    proposal: "SCHIFFSANGEBOT",
    specifications: "Spezifikationen",
    accommodation: "Unterbringung",
    equipment: "Ausrüstung",
    photography: "Fotografie",
    pricing: "Preise",
    contact: "Makler-Kontakt",
    forSale: "Zu Verkaufen",
    forCharter: "Zu Chartern",
    perWeek: "pro Woche",
    poa: "Preis auf Anfrage",
    notes: "Anmerkungen",
    delivery: "Lieferung",
    seaTrial: "Probefahrt",
    contract: "Vertrag",
    mybaStandard: "MYBA-Standard",
    charterArea: "Fahrtgebiet",
    commercial: "Kommerzielle Übersicht",
    vat: "MwSt.-Status",
    confidential: "VERTRAULICH",
    none: "—",
  },
  russian: {
    proposal: "ПРЕДЛОЖЕНИЕ ЯХТЫ",
    specifications: "Характеристики",
    accommodation: "Размещение",
    equipment: "Оборудование",
    photography: "Фотографии",
    pricing: "Цена",
    contact: "Контакт Брокера",
    forSale: "Продажа",
    forCharter: "Чартер",
    perWeek: "в неделю",
    poa: "Цена по запросу",
    notes: "Примечания",
    delivery: "Доставка",
    seaTrial: "Ходовые испытания",
    contract: "Контракт",
    mybaStandard: "Стандарт MYBA",
    charterArea: "Район плавания",
    commercial: "Коммерческая сводка",
    vat: "Статус НДС",
    confidential: "КОНФИДЕНЦИАЛЬНО",
    none: "—",
  },
};

function dict(lang: string | undefined): Dict {
  return LABELS[lang ?? "english"] ?? LABELS["english"]!;
}

// ─── spec / accommodation rows ──────────────────────────────────────────────

function specRows(y: YachtProfile): { label: string; value: string }[] {
  const rows: { label: string; value: string }[] = [];
  const push = (label: string, value: unknown, suffix = ""): void => {
    if (value != null && value !== "") rows.push({ label, value: `${value}${suffix}` });
  };
  push("Builder", y.builder);
  push("Model", y.model);
  push("Type", y.yacht_type ? humanize(String(y.yacht_type)) : null);
  push("Year built", y.year_built);
  push("Length", num(y.length_meters), num(y.length_meters) != null ? " m" : "");
  push("Beam", num(y.beam_meters), num(y.beam_meters) != null ? " m" : "");
  push("Draft", num(y.draft_meters), num(y.draft_meters) != null ? " m" : "");
  push("Hull material", y.hull_material);
  push("Hull type", y.hull_type);
  push("Flag", y.flag);
  push("Home port", y.home_port);
  push("Registration", y.registration_number);
  push("IMO", y.imo_number);
  push("Hull ID", y.hull_id);
  push("VAT status", y.vat_status ? vatLabel(y.vat_status) : null);
  push("Engine maker", y.engine_maker);
  push("Engine model", y.engine_model);
  push("Engines", y.engine_count);
  push("Total HP", y.total_hp);
  push("Engine hours", y.engine_hours);
  push("Max speed", num(y.max_speed_knots), num(y.max_speed_knots) != null ? " kn" : "");
  push(
    "Cruise speed",
    num(y.cruising_speed_knots),
    num(y.cruising_speed_knots) != null ? " kn" : "",
  );
  push("Range", num(y.range_nm), num(y.range_nm) != null ? " nm" : "");
  push("Fuel capacity", num(y.fuel_capacity_l), num(y.fuel_capacity_l) != null ? " L" : "");
  return rows;
}

function accomRows(y: YachtProfile): { label: string; value: string }[] {
  const rows: { label: string; value: string }[] = [];
  const push = (label: string, value: unknown): void => {
    if (value != null && value !== "") rows.push({ label, value: String(value) });
  };
  push("Guest cabins", y.cabins);
  push("Guests sleeping", y.guests);
  push("Berths", y.berths);
  push("Heads", y.heads);
  push("Crew", y.crew);
  push("Crew cabins", y.crew_cabins);
  return rows;
}

// ─── equipment ──────────────────────────────────────────────────────────────

/** "bow_thruster" → "Bow Thruster". Applied only to enum-ish fields (category,
 *  equipment_type) — never to brand/model which carry their own casing. */
function humanize(s: string): string {
  return s
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Human-readable VAT status. Enum values must map explicitly — humanize alone
 *  would yield "Tax Paid Eu" which reads poorly on a client-facing proposal. */
const VAT_LABELS: Record<string, string> = {
  tax_paid_eu: "VAT Paid / EU Free Circulation",
  paid: "VAT Paid / EU Free Circulation",
  tax_not_paid: "VAT Not Paid (offshore)",
  not_paid: "VAT Not Paid (offshore)",
  unknown: "VAT status not stated",
};
function vatLabel(s: unknown): string {
  const key = String(s).trim().toLowerCase();
  return VAT_LABELS[key] ?? humanize(String(s));
}

/**
 * Item metadata as a clean, de-duplicated " · " line. Quantities read as
 * "N units" (never "×N"; ×1 is dropped). Case-insensitive de-dup removes the
 * "27.5 kW · 27.5 kW" artefact when a model string repeats a power value.
 */
function equipmentMeta(it: ProposalEquipmentItem): string {
  const bits: string[] = [];
  if (it.brand) bits.push(String(it.brand).trim());
  if (it.model) bits.push(String(it.model).trim());
  if (it.power_kw != null) bits.push(`${it.power_kw} kW`);
  if (it.power_hp != null) bits.push(`${it.power_hp} HP`);
  if (it.total_watts != null) bits.push(`${it.total_watts} W`);
  if (it.capacity_liters != null) bits.push(`${it.capacity_liters} L`);
  if (it.capacity_persons != null) bits.push(`${it.capacity_persons} pax`);
  if (it.hours != null) bits.push(`${it.hours} h`);
  if (it.year_installed != null) bits.push(`${it.year_installed}`);
  const q = num(it.quantity);
  if (q != null && q > 1) bits.push(`${q} units`);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const b of bits) {
    if (!b) continue;
    const k = b.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(b);
  }
  return out.join(" · ");
}

/** One equipment item: bold item name + lighter metadata sub-line. */
function equipmentCell(it: ProposalEquipmentItem): TableCell {
  const cell: TableCell = { text: humanize(String(it.equipment_type ?? "")), bold: true };
  const meta = equipmentMeta(it);
  if (meta) cell.sub = meta;
  return cell;
}

/** Group items by category, preserving first-seen category order. */
function groupByCategory(
  items: ProposalEquipmentItem[],
): { label: string; items: ProposalEquipmentItem[] }[] {
  const order: string[] = [];
  const map = new Map<string, ProposalEquipmentItem[]>();
  for (const it of items) {
    const cat = (it.category && String(it.category).trim()) || "Other";
    if (!map.has(cat)) {
      map.set(cat, []);
      order.push(cat);
    }
    map.get(cat)!.push(it);
  }
  return order.map((c) => ({ label: humanize(c), items: map.get(c)! }));
}

/**
 * Equipment grouped BY CATEGORY, balanced across two columns and paginated.
 * Each category renders as a small uppercase heading (eyebrow) over its items;
 * categories are packed shortest-column-first so the two columns stay balanced.
 * Large categories are chunked (≤8 rows) so a single block never overflows a
 * half-width column even when every metadata line wraps.
 */
function equipmentNodes(items: ProposalEquipmentItem[], d: Dict): ContentNode[] {
  if (!items.length) return [];
  const GAP_MM = 6; // breathing room BETWEEN categories (larger than row gap)
  // Per-column hard cap (mm). Blocks are MEASURED at their real half-width
  // (see below) so wrapped metadata is already counted; this leaves the cap as
  // a true physical limit. A4 usable height ≈267mm minus the section heading
  // (~14mm) and a safety margin → 244mm. Keeps a dense one-page list on one
  // page without risking clip/overflow.
  const PER_COL_MAX = 244;

  // Measure equipment rows at the REAL half-width (≈48% of content width) so
  // wrapped metadata is counted; measuring full-width would under-count tall
  // blocks and risk page overflow.
  const measureRows = (heading: string, rows: TableCell[][]): number =>
    measureNode({ kind: "table", heading, columns: [{ widthPct: 48 }], rows });

  type Blk = { node: ContentNode; h: number };
  const blocks: Blk[] = [];
  for (const g of groupByCategory(items)) {
    const allCells = g.items.map((it) => [equipmentCell(it)]);
    const wholeH = measureRows(g.label, allCells);
    // Keep every category as ONE atomic block so its items never split across
    // columns or interleave with other categories (the "Power (1/2)" … "Comfort"
    // … "Power (2/2)" bug). Each whole-category block is placed entirely in one
    // column by the packer below. Only split when a single category is itself
    // taller than a full column — then its consecutive chunks stay labelled.
    if (wholeH <= PER_COL_MAX) {
      blocks.push({
        node: { kind: "table", heading: g.label, columns: [{}], rows: allCells },
        h: wholeH,
      });
      continue;
    }
    const chunks: TableCell[][][] = [];
    let cur: TableCell[][] = [];
    for (const row of allCells) {
      if (cur.length && measureRows(g.label, [...cur, row]) > PER_COL_MAX) {
        chunks.push(cur);
        cur = [];
      }
      cur.push(row);
    }
    if (cur.length) chunks.push(cur);
    chunks.forEach((rows, i) => {
      const heading = `${g.label} (${i + 1}/${chunks.length})`;
      blocks.push({
        node: { kind: "table", heading, columns: [{}], rows },
        h: measureRows(heading, rows),
      });
    });
  }

  // Pick the page count from the TOTAL height first, then fill each column to a
  // soft per-column target (total / 2·pages). This keeps multi-page equipment
  // lists evenly balanced — no trailing page left near-empty — while a list
  // that fits one page stays on one page.
  const totalH = blocks.reduce((s, b) => s + b.h + GAP_MM, 0);
  const pagesCount = Math.max(1, Math.ceil(totalH / (2 * PER_COL_MAX)));
  const target = totalH / (2 * pagesCount);

  type Pg = { left: ContentNode[]; right: ContentNode[]; lh: number; rh: number };
  const pages: Pg[] = [{ left: [], right: [], lh: 0, rh: 0 }];
  for (const { node, h } of blocks) {
    let pg = pages[pages.length - 1]!;
    const place = (side: "L" | "R"): void => {
      if (side === "L") {
        pg.left.push(node);
        pg.lh += h + GAP_MM;
      } else {
        pg.right.push(node);
        pg.rh += h + GAP_MM;
      }
    };
    const shorter: "L" | "R" = pg.lh <= pg.rh ? "L" : "R";
    const other: "L" | "R" = shorter === "L" ? "R" : "L";
    const cur = shorter === "L" ? pg.lh : pg.rh;
    const oth = other === "L" ? pg.lh : pg.rh;
    // Move to a fresh page once BOTH columns have reached the balance target
    // (only while more pages are expected); otherwise pack onto this page up to
    // the hard physical cap.
    const bothFull = pages.length < pagesCount && Math.min(pg.lh, pg.rh) >= target;
    if (cur === 0) place(shorter);
    else if (!bothFull && cur + h <= PER_COL_MAX) place(shorter);
    else if (!bothFull && oth + h <= PER_COL_MAX) place(other);
    else {
      pages.push({ left: [], right: [], lh: 0, rh: 0 });
      pg = pages[pages.length - 1]!;
      place("L");
    }
  }

  const withGaps = (nodes: ContentNode[]): ContentNode[] => {
    const o: ContentNode[] = [];
    nodes.forEach((n, i) => {
      if (i) o.push({ kind: "spacer", mm: GAP_MM });
      o.push(n);
    });
    return o;
  };

  return pages.map((pg, idx) => {
    const columns: { subHeading?: string; nodes: ContentNode[] }[] = [
      { nodes: withGaps(pg.left) },
    ];
    if (pg.right.length) columns.push({ nodes: withGaps(pg.right) });
    const heading = idx === 0 ? d["equipment"]! : `${d["equipment"]} (${idx + 1})`;
    return { kind: "columns", heading, columns };
  });
}

// ─── photography ─────────────────────────────────────────────────────────────

/**
 * Editorial photo pages that always FILL: one large hero image, with the rest
 * in a balanced two-column grid beneath it. Heights are sized so the worst case
 * (portrait images, which cap at the requested mm) still fits one physical page,
 * while landscape images render to their natural aspect within those caps.
 *  - 1 photo  → single full-width hero.
 *  - 2 photos → two stacked full-width images.
 *  - 3+       → hero + ≤4 grid images per page, split into balanced pages.
 * Only pre-validated (reachable) URLs are passed in, so no broken thumbnails.
 */
function photographyNodes(valid: string[], d: Dict): ContentNode[] {
  if (!valid.length) return [];

  if (valid.length <= 2) {
    const inner: ContentNode[] = [];
    valid.forEach((u, i) => {
      if (i) inner.push({ kind: "spacer", mm: 6 });
      inner.push({ kind: "image", url: u, heightMm: valid.length === 1 ? 150 : 115 });
    });
    return [{ kind: "columns", heading: d["photography"]!, columns: [{ nodes: inner }] }];
  }

  const makePage = (imgs: string[], heading?: string): ContentNode => {
    const [hero, ...rest] = imgs;
    const gridRows = Math.ceil(rest.length / 2);
    const heroMm = gridRows === 1 ? 140 : 105;
    const gridMm = gridRows === 1 ? 75 : 56;
    const inner: ContentNode[] = [{ kind: "image", url: hero!, heightMm: heroMm }];
    if (rest.length) {
      inner.push({ kind: "spacer", mm: 4 });
      const mid = Math.ceil(rest.length / 2);
      const colNodes = (us: string[]): ContentNode[] => {
        const o: ContentNode[] = [];
        us.forEach((u, i) => {
          if (i) o.push({ kind: "spacer", mm: 4 });
          o.push({ kind: "image", url: u, heightMm: gridMm });
        });
        return o;
      };
      const gcols = [{ nodes: colNodes(rest.slice(0, mid)) }];
      const right = rest.slice(mid);
      if (right.length) gcols.push({ nodes: colNodes(right) });
      inner.push({ kind: "columns", columns: gcols });
    }
    return { kind: "columns", heading, columns: [{ nodes: inner }] };
  };

  const pagesCount = Math.ceil(valid.length / 5);
  const per = Math.ceil(valid.length / pagesCount);
  return chunk(valid, per).map((g, i) =>
    makePage(g, i === 0 ? d["photography"]! : `${d["photography"]} (${i + 1})`),
  );
}

/** Full-width paired specification grid (the ONE shared spec style). */
function specPairsTable(y: YachtProfile, d: Dict): ContentNode {
  return {
    kind: "keyValue",
    heading: d["specifications"]!,
    rows: specRows(y),
    layout: "pairs",
    emptyText: d["none"]!,
  };
}

// ─── pricing ────────────────────────────────────────────────────────────────

function charterValue(r: ProposalReportData, d: Dict): string {
  if (r.charter_on_application) return d["poa"]!;
  const lo = num(r.charter_low_eur_week);
  const hi = num(r.charter_high_eur_week);
  let v: string;
  if (lo != null && hi != null && lo !== hi) v = `${money(lo)} – ${money(hi)}`;
  else if (hi != null) v = money(hi);
  else if (lo != null) v = money(lo);
  else return d["poa"]!;
  return `${v} ${d["perWeek"]}`;
}

// ─── main ───────────────────────────────────────────────────────────────────

export function buildProposalModel(input: {
  yacht: YachtProfile;
  reportData: ProposalReportData;
  settings: ExportSettings;
  template: DocumentTemplate;
  /** Pre-validated (reachable) photo URLs. Falls back to raw photoList. */
  photos?: string[];
}): DocumentModel {
  const { yacht, reportData: r, settings, template } = input;
  const theme = getTheme(template);
  const d = dict(settings.language);
  const brand = settings.branding ?? settings.brand_name ?? "Yachtworth";
  const ptype = r.proposal_type ?? "sale";
  const showSale = ptype === "sale" || ptype === "both";
  const showCharter = ptype === "charter" || ptype === "both";
  const date = new Date().toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  // ── cover ──
  const photos = input.photos ?? photoList(yacht);
  const subtitle = [yacht.builder, yacht.model, yacht.year_built]
    .filter((x) => x != null && x !== "")
    .join(" · ");
  const cells: { label: string; value: string }[] = [];
  if (yacht.year_built != null) cells.push({ label: "Year", value: String(yacht.year_built) });
  if (num(yacht.length_meters) != null)
    cells.push({ label: "Length", value: `${num(yacht.length_meters)} m` });
  if (yacht.guests != null) cells.push({ label: "Guests", value: String(yacht.guests) });
  if (yacht.cabins != null) cells.push({ label: "Cabins", value: String(yacht.cabins) });
  if (yacht.flag) cells.push({ label: "Flag", value: String(yacht.flag) });

  let coverPrice = "";
  if (showSale && num(r.sale_price_eur) != null && !r.price_on_application) {
    coverPrice = money(r.sale_price_eur);
  } else if (showCharter && num(r.charter_high_eur_week) != null && !r.charter_on_application) {
    coverPrice = `${money(r.charter_high_eur_week)} / wk`;
  }

  const cover: CoverSpec = {
    eyebrow: `${brand} · ${d["proposal"]}`,
    name: yacht.name ?? "",
    date,
    cells,
  };
  if (photos[0]) cover.photoUrl = photos[0];
  if (subtitle) cover.subtitle = subtitle;
  if (coverPrice) cover.price = coverPrice;

  // Shared pricing cards (For Sale / For Charter) — used on P2 commercial
  // summary AND on the P5 full pricing block so they read consistently.
  const cards: { label: string; value: string; emphasis?: boolean }[] = [];
  if (showSale) {
    const saleVal =
      r.price_on_application || num(r.sale_price_eur) == null ? d["poa"]! : money(r.sale_price_eur);
    cards.push({ label: d["forSale"]!, value: saleVal, emphasis: true });
  }
  if (showCharter) {
    cards.push({ label: d["forCharter"]!, value: charterValue(r, d) });
  }

  // ── body ──
  const body: ContentNode[] = [];

  // P2 — Vessel Overview: compact paired specs (full width), then a balanced
  // two-column row of Accommodation (left) + Commercial Summary (right).
  body.push(specPairsTable(yacht, d));

  // Sale-only proposals omit this mid-document commercial summary entirely: the
  // sale price already appears on the cover + final pricing page, VAT is in the
  // spec table, and delivery/sea-trial repeat on the final page. Keeping it here
  // for sale-only only duplicated the price and left an unbalanced half-column.
  const commercial: ContentNode[] = [];
  if (showCharter) {
    if (cards.length) {
      commercial.push({ kind: "metrics", heading: d["commercial"]!, cards: cards.slice() });
    }
    const commercialRows: { label: string; value: string }[] = [];
    if (yacht.vat_status) commercialRows.push({ label: d["vat"]!, value: vatLabel(yacht.vat_status) });
    if (r.delivery) commercialRows.push({ label: d["delivery"]!, value: String(r.delivery) });
    if (r.sea_trial) commercialRows.push({ label: d["seaTrial"]!, value: String(r.sea_trial) });
    if (commercialRows.length) commercial.push({ kind: "keyValue", rows: commercialRows });
  }

  const accomNode: ContentNode = {
    kind: "keyValue",
    heading: d["accommodation"]!,
    rows: accomRows(yacht),
    layout: "pairs",
    emptyText: d["none"]!,
  };
  if (commercial.length) {
    body.push({
      kind: "columns",
      columns: [{ nodes: [accomNode] }, { nodes: commercial }],
    });
  } else {
    body.push(accomNode);
  }

  // P3 — Equipment grouped by category, balanced across two columns.
  const equip = Array.isArray(r.equipment) ? r.equipment : [];
  body.push(...equipmentNodes(equip, d));

  // P4 — Photography (validated photos only; editorial hero + grid that fills).
  body.push(...photographyNodes(photos, d));

  // P5 — Pricing + Notes + Broker Contact — ONE atomic block so the packer can
  // never strand the broker contact (or notes) on a separate page.
  const pricingChildren: ContentNode[] = [];

  if (cards.length) {
    pricingChildren.push({ kind: "metrics", heading: d["pricing"]!, cards: cards.slice() });
  }

  const metaRows: { label: string; value: string }[] = [];
  if (showCharter) {
    const terms: string[] = [];
    if (num(r.charter_apa_pct) != null) terms.push(`APA ${num(r.charter_apa_pct)}%`);
    if (num(r.charter_vat_pct) != null) terms.push(`VAT ${num(r.charter_vat_pct)}%`);
    if (terms.length) metaRows.push({ label: d["forCharter"]!, value: terms.join(" · ") });
    if (r.charter_area) metaRows.push({ label: d["charterArea"]!, value: String(r.charter_area) });
  }
  if (r.delivery) metaRows.push({ label: d["delivery"]!, value: String(r.delivery) });
  if (r.sea_trial) metaRows.push({ label: d["seaTrial"]!, value: String(r.sea_trial) });
  if (r.myba_contract) metaRows.push({ label: d["contract"]!, value: d["mybaStandard"]! });
  if (metaRows.length) {
    pricingChildren.push({ kind: "keyValue", rows: metaRows });
  }

  if (r.notes) {
    pricingChildren.push({ kind: "paragraph", heading: d["notes"]!, panel: true, text: String(r.notes) });
  }

  const contactRows: { label: string; value: string }[] = [];
  if (r.broker_name) contactRows.push({ label: "Broker", value: String(r.broker_name) });
  if (r.broker_company) contactRows.push({ label: "Company", value: String(r.broker_company) });
  if (r.broker_phone) contactRows.push({ label: "Phone", value: String(r.broker_phone) });
  if (r.broker_email) contactRows.push({ label: "Email", value: String(r.broker_email) });
  if (r.broker_website) contactRows.push({ label: "Website", value: String(r.broker_website) });
  if (contactRows.length) {
    pricingChildren.push({ kind: "keyValue", heading: d["contact"]!, rows: contactRows });
  }

  if (pricingChildren.length) {
    body.push({ kind: "columns", columns: [{ nodes: pricingChildren }] });
  }

  return {
    meta: {
      type: "proposal",
      brand,
      title: d["proposal"]!,
      language: settings.language ?? "english",
      confidential: settings.confidential === true,
      watermarkText: d["confidential"]!,
      generatedAt: date,
      disclaimer: "Indicative · not certified · valid 30 days from issue.",
    },
    theme,
    cover,
    body,
  };
}
