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
import { A4_CONTENT_HEIGHT_MM } from "../core/types";
import { chunk, num, photoList } from "../core/util";
import { CARD_HEAD_MM, CARD_PAD_MM, HEADING_MM, measureNode } from "../model/measure";
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

type SpecRow = { label: string; value: string };

/**
 * Specification fields, ORDERED & GROUPED into logical clusters (the order the
 * owner specified). Each inner array is one visual group; groups are kept
 * together on the page rather than packed across boundaries. Fields not in the
 * owner's explicit list are retained and slotted into their natural group:
 * hull material/type join dimensions; speed/range/fuel join propulsion.
 * Empty fields are skipped; a fully-empty group is dropped.
 */
function specGroups(y: YachtProfile): SpecRow[][] {
  const groups: SpecRow[][] = [];
  const group = (
    build: (push: (label: string, value: unknown, suffix?: string) => void) => void,
  ): void => {
    const rows: SpecRow[] = [];
    const push = (label: string, value: unknown, suffix = ""): void => {
      if (value != null && value !== "") rows.push({ label, value: `${value}${suffix}` });
    };
    build(push);
    if (rows.length) groups.push(rows);
  };

  // 1) Identity
  group((push) => {
    push("Builder", y.builder);
    push("Model", y.model);
    push("Year built", y.year_built);
    push("Type", y.yacht_type ? humanize(String(y.yacht_type)) : null);
  });
  // 2) Dimensions & hull
  group((push) => {
    push("Length", num(y.length_meters), num(y.length_meters) != null ? " m" : "");
    push("Beam", num(y.beam_meters), num(y.beam_meters) != null ? " m" : "");
    push("Draft", num(y.draft_meters), num(y.draft_meters) != null ? " m" : "");
    push("Hull material", y.hull_material);
    push("Hull type", y.hull_type);
  });
  // 3) Flag & home port
  group((push) => {
    push("Flag", y.flag);
    push("Home port", y.home_port);
  });
  // 4) Propulsion & performance
  group((push) => {
    push("Engines", y.engine_count);
    push("Engine maker", y.engine_maker);
    push("Engine model", y.engine_model);
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
    push("Water capacity", num(y.water_capacity_l), num(y.water_capacity_l) != null ? " L" : "");
  });
  // 5) Registration & identifiers
  group((push) => {
    push("Registration", y.registration_number);
    push("IMO", y.imo_number);
    push("Hull ID", y.hull_id);
  });
  // 6) Tax
  group((push) => {
    push("VAT status", y.vat_status ? vatLabel(y.vat_status) : null);
  });

  return groups;
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

/** Equipment items as card rows: bold name + lighter metadata. */
function equipmentItems(items: ProposalEquipmentItem[]): { name: string; meta?: string }[] {
  return items.map((it) => {
    const o: { name: string; meta?: string } = {
      name: humanize(String(it.equipment_type ?? "")),
    };
    const meta = equipmentMeta(it);
    if (meta) o.meta = meta;
    return o;
  });
}

// Fixed display priority for equipment categories. A category is ranked by the
// FIRST keyword in this list that appears (case-insensitive) in its name, so
// loose source labels like "Water Toys" or "Deck Equipment" still slot in. Any
// category that matches nothing sorts last ("Other").
const CATEGORY_PRIORITY = [
  "power",
  "navigation",
  "safety",
  "comfort",
  "water",
  "deck",
  "toys",
  "tenders",
] as const;

function categoryRank(label: string): number {
  const l = label.toLowerCase();
  for (let i = 0; i < CATEGORY_PRIORITY.length; i++) {
    if (l.includes(CATEGORY_PRIORITY[i]!)) return i;
  }
  return CATEGORY_PRIORITY.length; // "Other" — always last
}

/**
 * Group items by category, then order the groups by the fixed display priority
 * (Power → Navigation → Safety → Comfort → Water → Deck → Toys → Tenders →
 * Other). Categories sharing a rank keep their first-seen order (stable).
 */
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
  return order
    .map((c, i) => ({ cat: c, seen: i }))
    .sort((a, b) => categoryRank(a.cat) - categoryRank(b.cat) || a.seen - b.seen)
    .map(({ cat }) => ({ label: humanize(cat), items: map.get(cat)! }));
}

/**
 * Continuous-flow paginator for the vessel body: Specifications → Accommodation
 * → Equipment, pre-fit into page-blocks that each measure ≤ PACK_BUDGET_MM so
 * the greedy packer gives every block its own A4 page. (Pages are fixed-height
 * with `overflow:hidden`, so content MUST be pre-fit here — CSS cannot reflow
 * or split it across pages.)
 *
 * Nothing is kept together:
 *  - Specification GROUPS and Accommodation are full-width units that break
 *    across pages.
 *  - Equipment category cards flow down the LEFT column, then the RIGHT column,
 *    then onto the next page. A category that does not fully fit the remaining
 *    column space is SPLIT at the item boundary: the items that fit are rendered
 *    now (original heading), and the remainder continues as a "(cont.)" card on
 *    the next column/page. No space is reserved for an entire category.
 *
 * The result fills every page top-to-bottom with no large white gaps, while
 * preserving the existing styling (paired key/value spec grids, two-column
 * equipment cards) and the existing order (spec groups, then accommodation,
 * then equipment in priority order).
 */
function flowVesselBody(
  yacht: YachtProfile,
  accom: SpecRow[],
  equip: ProposalEquipmentItem[],
  d: Dict,
): ContentNode[] {
  // Fill target = true usable page height. `measureNode` is conservative and
  // over-estimates real rendered height, so fitting to this budget fills pages
  // top-to-bottom while the over-estimation headroom keeps content within the
  // fixed-height (261mm, overflow:hidden) physical page — no clipping. The greedy
  // packer never bumps the block that is first on an otherwise-empty page, so
  // each pre-fit page-block still renders alone on its own page.
  const BUDGET = A4_CONTENT_HEIGHT_MM;
  const GAP_GROUP = 4; // between logical spec groups
  const GAP_SECTION = 6; // around accommodation / the equipment region
  const GAP_CARD = 6; // between cards stacked in a column
  const CARD_BASE = CARD_HEAD_MM + CARD_PAD_MM;

  // Height (mm) of one equipment item inside a half-width card (the card body
  // contribution alone, i.e. measureNode minus the card's head + padding).
  const itemH = (it: { name: string; meta?: string }): number =>
    measureNode({ kind: "card", heading: "", items: [it] }) - CARD_BASE;
  const cardHeight = (its: { name: string; meta?: string }[]): number =>
    CARD_BASE + its.reduce((s, it) => s + itemH(it), 0);
  // ── full-width preamble units: spec groups, then accommodation ──
  type FullUnit = { node: ContentNode; h: number; gap: number };
  const fulls: FullUnit[] = [];
  const groups = specGroups(yacht);
  if (groups.length) {
    groups.forEach((rows, i) => {
      const node: ContentNode = {
        kind: "keyValue",
        ...(i === 0 ? { heading: d["specifications"]! } : {}),
        rows,
        layout: "pairs",
        emptyText: d["none"]!,
      };
      fulls.push({ node, h: measureNode(node), gap: i === 0 ? 0 : GAP_GROUP });
    });
  } else {
    const node: ContentNode = {
      kind: "keyValue",
      heading: d["specifications"]!,
      rows: [],
      layout: "pairs",
      emptyText: d["none"]!,
    };
    fulls.push({ node, h: measureNode(node), gap: 0 });
  }
  // Accommodation is ALWAYS emitted (empty rows fall back to `emptyText`), matching
  // the prior builder which never omitted the section.
  {
    const node: ContentNode = {
      kind: "keyValue",
      heading: d["accommodation"]!,
      rows: accom,
      layout: "pairs",
      emptyText: d["none"]!,
    };
    fulls.push({ node, h: measureNode(node), gap: fulls.length ? GAP_SECTION : 0 });
  }

  // ── equipment category cards (priority order; split on demand) ──
  type QCard = { base: string; items: { name: string; meta?: string }[]; emitted: boolean };
  const queue: QCard[] = groupByCategory(equip).map((g) => ({
    base: g.label,
    items: equipmentItems(g.items),
    emitted: false,
  }));

  // ── per-page state ──
  const pages: ContentNode[] = [];
  let preamble: { node: ContentNode; gap: number }[] = [];
  let floor = 0; // height consumed by full-width preamble + reserved eyebrow on this page
  // Equipment cards already committed to the CURRENT page, in priority order.
  // They are distributed left→right at flush time by the balanced split below.
  type PageCard = { base: string; cont: boolean; items: { name: string; meta?: string }[]; h: number };
  let pageCards: PageCard[] = [];
  let started = false; // any content on the current page?
  let headingReserved = false; // equipment eyebrow reserved on THIS page
  let headingUsed = false; // equipment eyebrow already emitted (document-wide)

  const reset = (): void => {
    preamble = [];
    floor = 0;
    pageCards = [];
    started = false;
    headingReserved = false;
  };

  // Height (incl. the shared `floor`) of a column holding `cards` stacked with
  // GAP_CARD between them. An empty column is just the floor.
  const colHeight = (cards: PageCard[]): number =>
    cards.length === 0
      ? floor
      : floor + cards.reduce((s, c) => s + c.h, 0) + (cards.length - 1) * GAP_CARD;

  // Best ordered split of `cards` into [0..p) | [p..n): the split point p that
  // minimises the taller column. Order is preserved (left = earlier categories,
  // right = later), so priority/reading order is never reshuffled — the columns
  // simply fill evenly instead of left-to-the-brim then right.
  const bestSplit = (cards: PageCard[]): { p: number; max: number } => {
    let best = { p: cards.length, max: Number.POSITIVE_INFINITY };
    for (let p = 1; p <= cards.length; p += 1) {
      const lh = colHeight(cards.slice(0, p));
      const rh = p === cards.length ? floor : colHeight(cards.slice(p));
      const m = Math.max(lh, rh);
      if (m < best.max) best = { p, max: m };
    }
    return best;
  };
  // Does `cards` fit one physical page under some ordered split?
  const fitsPage = (cards: PageCard[]): boolean =>
    cards.length === 0 || bestSplit(cards).max <= BUDGET;

  const flush = (): void => {
    if (!started) return;
    const nodes: ContentNode[] = [];
    preamble.forEach((p, i) => {
      if (i) nodes.push({ kind: "spacer", mm: p.gap });
      nodes.push(p.node);
    });
    if (pageCards.length) {
      if (preamble.length) nodes.push({ kind: "spacer", mm: GAP_SECTION });
      const { p } = bestSplit(pageCards);
      const toCol = (cards: PageCard[]): { nodes: ContentNode[] } => {
        const out: ContentNode[] = [];
        cards.forEach((c, i) => {
          if (i) out.push({ kind: "spacer", mm: GAP_CARD });
          out.push({
            kind: "card",
            heading: c.cont ? `${c.base} (cont.)` : c.base,
            items: c.items,
          });
        });
        return { nodes: out };
      };
      const leftCards = pageCards.slice(0, p);
      const rightCards = pageCards.slice(p);
      const cols = rightCards.length ? [toCol(leftCards), toCol(rightCards)] : [toCol(leftCards)];
      nodes.push(
        headingReserved
          ? { kind: "columns", heading: d["equipment"]!, columns: cols }
          : { kind: "columns", columns: cols },
      );
    }
    pages.push(nodes.length === 1 ? nodes[0]! : { kind: "columns", columns: [{ nodes }] });
    reset();
  };

  // 1) Place the full-width preamble (spec groups + accommodation), breaking
  //    across pages whenever the next unit would overflow.
  for (const fu of fulls) {
    const gap = started && preamble.length ? fu.gap : 0;
    if (started && floor + gap + fu.h > BUDGET) flush();
    const g = started && preamble.length ? fu.gap : 0;
    if (g) floor += g;
    preamble.push({ node: fu.node, gap: g });
    floor += fu.h;
    started = true;
  }

  // 2) Flow the equipment cards. Greedily commit whole categories to the current
  //    page while they still fit under a balanced split; when one no longer fits,
  //    render the part that fits and carry the remainder to the next page.
  while (queue.length) {
    const c = queue[0]!;

    // Reserve the equipment eyebrow on the first page that will carry cards
    // (it sits above both columns, so it lowers the card start by HEADING_MM).
    if (!headingUsed && !headingReserved) {
      headingReserved = true;
      floor += (preamble.length ? GAP_SECTION : 0) + HEADING_MM;
    }

    // Try to add the whole (remaining) category as one card.
    const whole: PageCard = { base: c.base, cont: c.emitted, items: c.items, h: cardHeight(c.items) };
    if (fitsPage([...pageCards, whole])) {
      pageCards.push(whole);
      c.emitted = true;
      started = true;
      if (headingReserved) headingUsed = true;
      queue.shift();
      continue;
    }

    // Whole category won't fit. Find the largest leading slice of its items that
    // still fits the page; render that part, carry the rest to the next page.
    let k = 0;
    for (let n = 1; n <= c.items.length; n += 1) {
      const part: PageCard = {
        base: c.base,
        cont: c.emitted,
        items: c.items.slice(0, n),
        h: cardHeight(c.items.slice(0, n)),
      };
      if (fitsPage([...pageCards, part])) k = n;
      else break;
    }
    if (k >= 1) {
      const taken = c.items.slice(0, k);
      pageCards.push({ base: c.base, cont: c.emitted, items: taken, h: cardHeight(taken) });
      c.items = c.items.slice(k);
      c.emitted = true;
      started = true;
      if (headingReserved) headingUsed = true;
      // Do NOT flush here: the remainder stays at the head of the queue, so the
      // loop keeps filling THIS page (remainder first, preserving order) until it
      // is genuinely full — only then does the "no item fits" branch flush.
      continue;
    }

    // Not even one item fits alongside what's already here. If the page already
    // has content, move on to a fresh page; otherwise force a single over-tall
    // item so we always make progress.
    if (pageCards.length || preamble.length) {
      flush();
      continue;
    }
    const one = c.items.slice(0, 1);
    pageCards.push({ base: c.base, cont: c.emitted, items: one, h: cardHeight(one) });
    c.items = c.items.slice(1);
    c.emitted = true;
    started = true;
    if (headingReserved) headingUsed = true;
    flush();
  }
  flush();

  return pages;
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

  // Pricing cards (For Sale / For Charter) — used ONLY on the final P5 pricing
  // block. Commercial content never appears mid-document (page 2).
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

  // P2+ — Vessel body: Specifications → Accommodation → Equipment flow
  // continuously across pages, filling each one top-to-bottom. Nothing is kept
  // together: spec groups and accommodation break across pages, and equipment
  // categories split at the item boundary when only part fits the remaining
  // column space (see `flowVesselBody`).
  const equip = Array.isArray(r.equipment) ? r.equipment : [];
  body.push(...flowVesselBody(yacht, accomRows(yacht), equip, d));

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
    pricingChildren.push({ kind: "keyValue", heading: d["contact"]!, rows: contactRows, boxed: true });
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
      confidential: false,
      watermarkText: d["confidential"]!,
      generatedAt: date,
      disclaimer: "Indicative · not certified · valid 30 days from issue.",
    },
    theme,
    cover,
    body,
  };
}
