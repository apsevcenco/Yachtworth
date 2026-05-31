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
import { num, photoList } from "../core/util";
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
  push("Type", y.yacht_type);
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
  push("VAT status", y.vat_status);
  push("Engine maker", y.engine_maker);
  push("Engine model", y.engine_model);
  push("Engines", y.engine_count);
  push("Total HP", y.total_hp);
  push("Engine hours", y.engine_hours);
  push("Max speed", num(y.max_speed_knots), num(y.max_speed_knots) != null ? " kn" : "");
  push(
    "Cruising speed",
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

function equipmentDetail(it: ProposalEquipmentItem): string {
  const bits: string[] = [];
  if (it.brand) bits.push(String(it.brand));
  if (it.model) bits.push(String(it.model));
  // ×1 carries no information — only show multiples.
  if (it.quantity != null && num(it.quantity) !== 1) bits.push(`×${it.quantity}`);
  if (it.power_kw != null) bits.push(`${it.power_kw} kW`);
  if (it.power_hp != null) bits.push(`${it.power_hp} HP`);
  if (it.capacity_liters != null) bits.push(`${it.capacity_liters} L`);
  if (it.capacity_persons != null) bits.push(`${it.capacity_persons} pax`);
  if (it.year_installed != null) bits.push(`${it.year_installed}`);
  return bits.join(" · ");
}

/** One equipment item as a single bold name + muted "category · detail" sub-line. */
function equipmentCell(it: ProposalEquipmentItem): TableCell {
  const detail = equipmentDetail(it);
  const sub = [it.category, detail].filter((x) => x != null && x !== "").join(" · ");
  const cell: TableCell = { text: it.equipment_type ?? "", bold: true };
  if (sub) cell.sub = sub;
  return cell;
}

/**
 * Equipment as a two-column layout. Chunked conservatively (≤8 items per
 * column) so each `columns` block always fits one page — the columns node is a
 * single non-splittable block, so we must never let one exceed the page budget.
 */
function equipmentNodes(items: ProposalEquipmentItem[], d: Dict): ContentNode[] {
  if (!items.length) return [];
  // ≤8 per column. measureTable can't know a nested table renders at ~half the
  // page width, so it under-counts wrapped sub-lines; 8 rows stays safely under
  // the page budget even if every sub-line wraps to 3 lines (≈206mm < 240mm).
  const PER_CHUNK = 16;
  const chunks: ProposalEquipmentItem[][] = [];
  for (let i = 0; i < items.length; i += PER_CHUNK) chunks.push(items.slice(i, i + PER_CHUNK));
  const colNodes = (rows: ProposalEquipmentItem[]): ContentNode[] =>
    rows.length ? [{ kind: "table", columns: [{}], rows: rows.map((it) => [equipmentCell(it)]) }] : [];
  return chunks.map((chunk, idx) => {
    const mid = Math.ceil(chunk.length / 2);
    const left = chunk.slice(0, mid);
    const right = chunk.slice(mid);
    const heading =
      chunks.length > 1 ? `${d["equipment"]} — ${idx + 1}/${chunks.length}` : d["equipment"]!;
    const columns: { subHeading?: string; nodes: ContentNode[] }[] = [{ nodes: colNodes(left) }];
    if (right.length) columns.push({ nodes: colNodes(right) });
    return { kind: "columns", heading, columns };
  });
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
  const photos = photoList(yacht);
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

  // ── body ──
  const body: ContentNode[] = [];

  // 2. Specifications | Accommodation
  body.push({
    kind: "columns",
    heading: d["specifications"]!,
    columns: [
      { nodes: [{ kind: "keyValue", rows: specRows(yacht), emptyText: d["none"]! }] },
      {
        subHeading: d["accommodation"]!,
        nodes: [{ kind: "keyValue", rows: accomRows(yacht), emptyText: d["none"]! }],
      },
    ],
  });

  // 3. Equipment (two columns)
  const equip = Array.isArray(r.equipment) ? r.equipment : [];
  body.push(...equipmentNodes(equip, d));

  // 4. Photography (all available photos)
  if (photos.length) {
    body.push({
      kind: "gallery",
      heading: d["photography"]!,
      columns: 3,
      images: photos.map((url) => ({ url })),
    });
  }

  // 5. Pricing + Notes + Broker Contact — ONE atomic block so the packer can
  // never strand the broker contact (or notes) on a separate page.
  const pricingChildren: ContentNode[] = [];

  const cards: { label: string; value: string; emphasis?: boolean }[] = [];
  if (showSale) {
    const saleVal =
      r.price_on_application || num(r.sale_price_eur) == null ? d["poa"]! : money(r.sale_price_eur);
    cards.push({ label: d["forSale"]!, value: saleVal, emphasis: true });
  }
  if (showCharter) {
    cards.push({ label: d["forCharter"]!, value: charterValue(r, d) });
  }
  if (cards.length) {
    pricingChildren.push({ kind: "metrics", heading: d["pricing"]!, cards });
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
