import type {
  DocumentTemplate,
  ExportSettings,
  ProposalEquipmentItem,
  ProposalReportData,
  YachtProfile,
} from "../../documentTypes";

// ─── helpers ─────────────────────────────────────────────────────────────────

function esc(v: unknown): string {
  if (v == null) return "";
  return String(v)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function num(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function money(v: number | null | undefined): string {
  if (v == null) return "";
  return "€ " + Math.round(v).toLocaleString("en-US");
}

function isHttps(u: unknown): u is string {
  return typeof u === "string" && /^https:\/\//i.test(u);
}

function photoList(y: YachtProfile): string[] {
  const out: string[] = [];
  if (isHttps(y.cover_photo_url)) out.push(y.cover_photo_url);
  if (Array.isArray(y.photo_urls)) {
    for (const p of y.photo_urls) if (isHttps(p) && !out.includes(p)) out.push(p);
  }
  if (isHttps(y.photo_url) && !out.includes(y.photo_url)) out.push(y.photo_url);
  return out;
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

// ─── theme ───────────────────────────────────────────────────────────────────

interface Theme {
  pageBg: string;
  text: string;
  textMuted: string;
  accent: string;
  line: string;
  coverBg: string;
  coverText: string;
  coverAccent: string;
  tableHeadBg: string;
  panelBg: string;
}

const NAVY = "#0B1E3F";
const GOLD = "#C5973A";
const IVORY = "#F7F3EC";

const THEMES: Record<DocumentTemplate, Theme> = {
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

// ─── labels (multi-language, minimal subset) ───────────────────────────────────

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
    confidential: "CONFIDENTIAL",
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
    confidential: "CONFIDENTIEL",
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
    confidential: "RISERVATO",
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
    confidential: "CONFIDENCIAL",
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
    confidential: "VERTRAULICH",
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
    confidential: "КОНФИДЕНЦИАЛЬНО",
  },
};

function dict(lang: string | undefined): Dict {
  return LABELS[lang ?? "english"] ?? LABELS["english"]!;
}

// ─── spec / accommodation rows ─────────────────────────────────────────────────

function specRows(y: YachtProfile): [string, string][] {
  const rows: [string, string][] = [];
  const push = (label: string, value: unknown, suffix = "") => {
    if (value != null && value !== "") rows.push([label, `${esc(value)}${suffix}`]);
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
  push("Port engine hours", y.engine_hours_port);
  push("Starboard engine hours", y.engine_hours_starboard);
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

function accomRows(y: YachtProfile): [string, string][] {
  const rows: [string, string][] = [];
  const push = (label: string, value: unknown) => {
    if (value != null && value !== "") rows.push([label, esc(value)]);
  };
  push("Guest cabins", y.cabins);
  push("Guests sleeping", y.guests);
  push("Berths", y.berths);
  push("Heads", y.heads);
  push("Crew", y.crew);
  push("Crew cabins", y.crew_cabins);
  return rows;
}

function tableHtml(rows: [string, string][]): string {
  return `<table class="spec">${rows
    .map(
      ([l, v]) =>
        `<tr><td class="spec-l">${esc(l)}</td><td class="spec-v">${v}</td></tr>`,
    )
    .join("")}</table>`;
}

// ─── equipment ─────────────────────────────────────────────────────────────────

function equipmentDetail(it: ProposalEquipmentItem): string {
  const bits: string[] = [];
  if (it.brand) bits.push(esc(it.brand));
  if (it.model) bits.push(esc(it.model));
  if (it.quantity != null) bits.push(`×${esc(it.quantity)}`);
  if (it.power_kw != null) bits.push(`${esc(it.power_kw)} kW`);
  if (it.power_hp != null) bits.push(`${esc(it.power_hp)} HP`);
  if (it.capacity_liters != null) bits.push(`${esc(it.capacity_liters)} L`);
  if (it.capacity_persons != null) bits.push(`${esc(it.capacity_persons)} pax`);
  if (it.year_installed != null) bits.push(`${esc(it.year_installed)}`);
  return bits.join(" · ");
}

function equipmentPages(items: ProposalEquipmentItem[], d: Dict): string {
  if (!items.length) return "";
  const pages = chunk(items, 22);
  return pages
    .map(
      (group, idx) => `
    <section class="page">
      <div class="eyebrow">${esc(d["equipment"])}${
        pages.length > 1 ? ` — ${idx + 1}/${pages.length}` : ""
      }</div>
      <table class="equip">
        ${group
          .map(
            (it) => `<tr>
              <td class="eq-cat">${esc(it.category ?? "")}</td>
              <td class="eq-name">${esc(it.equipment_type ?? "")}</td>
              <td class="eq-detail">${equipmentDetail(it)}</td>
            </tr>`,
          )
          .join("")}
      </table>
    </section>`,
    )
    .join("");
}

function photoPages(photos: string[], d: Dict): string {
  if (!photos.length) return "";
  const pages = chunk(photos, 6);
  return pages
    .map(
      (group, idx) => `
    <section class="page">
      <div class="eyebrow">${esc(d["photography"])}${
        pages.length > 1 ? ` — ${idx + 1}/${pages.length}` : ""
      }</div>
      <div class="photo-grid">
        ${group
          .map((p) => `<div class="photo-cell"><img src="${esc(p)}" /></div>`)
          .join("")}
      </div>
    </section>`,
    )
    .join("");
}

// ─── pricing ───────────────────────────────────────────────────────────────────

function pricingPage(
  r: ProposalReportData,
  d: Dict,
  ptype: string,
): string {
  const showSale = ptype === "sale" || ptype === "both";
  const showCharter = ptype === "charter" || ptype === "both";
  const boxes: string[] = [];

  if (showSale) {
    const val = r.price_on_application
      ? esc(d["poa"])
      : r.sale_price_eur != null
        ? money(r.sale_price_eur)
        : esc(d["poa"]);
    boxes.push(
      `<div class="price-box"><div class="price-label">${esc(
        d["forSale"],
      )}</div><div class="price-val">${val}</div></div>`,
    );
  }
  if (showCharter) {
    let val: string;
    if (r.charter_on_application) {
      val = esc(d["poa"]);
    } else {
      const lo = r.charter_low_eur_week;
      const hi = r.charter_high_eur_week;
      if (lo != null && hi != null && lo !== hi) {
        val = `${money(lo)} – ${money(hi)}`;
      } else if (hi != null) {
        val = money(hi);
      } else if (lo != null) {
        val = money(lo);
      } else {
        val = esc(d["poa"]);
      }
      val += ` <span class="per">${esc(d["perWeek"])}</span>`;
    }
    const extras: string[] = [];
    if (r.charter_apa_pct != null) extras.push(`APA ${esc(r.charter_apa_pct)}%`);
    if (r.charter_vat_pct != null) extras.push(`VAT ${esc(r.charter_vat_pct)}%`);
    if (r.charter_area) extras.push(esc(r.charter_area));
    boxes.push(
      `<div class="price-box"><div class="price-label">${esc(
        d["forCharter"],
      )}</div><div class="price-val">${val}</div>${
        extras.length ? `<div class="price-extra">${extras.join(" · ")}</div>` : ""
      }</div>`,
    );
  }

  const extraMeta: [string, string][] = [];
  if (r.delivery) extraMeta.push(["Delivery", esc(r.delivery)]);
  if (r.sea_trial) extraMeta.push(["Sea trial", esc(r.sea_trial)]);
  if (r.myba_contract) extraMeta.push(["Contract", "MYBA standard"]);

  const contactRows: [string, string][] = [];
  if (r.broker_name) contactRows.push(["Broker", esc(r.broker_name)]);
  if (r.broker_company) contactRows.push(["Company", esc(r.broker_company)]);
  if (r.broker_phone) contactRows.push(["Phone", esc(r.broker_phone)]);
  if (r.broker_email) contactRows.push(["Email", esc(r.broker_email)]);
  if (r.broker_website) contactRows.push(["Website", esc(r.broker_website)]);

  return `
  <section class="page">
    <div class="eyebrow">${esc(d["pricing"])}</div>
    <div class="price-row">${boxes.join("")}</div>
    ${extraMeta.length ? `<div class="meta-block">${tableHtml(extraMeta)}</div>` : ""}
    ${r.notes ? `<div class="notes"><div class="notes-h">Notes</div><p>${esc(r.notes)}</p></div>` : ""}
    ${
      contactRows.length
        ? `<div class="contact"><div class="eyebrow">${esc(
            d["contact"],
          )}</div>${tableHtml(contactRows)}</div>`
        : ""
    }
    <div class="disclaimer">Indicative · not certified · valid 30 days from issue.</div>
  </section>`;
}

// ─── css ───────────────────────────────────────────────────────────────────────

function css(t: Theme, confidential: boolean): string {
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
    background: linear-gradient(to bottom, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.0) 35%, rgba(0,0,0,0.65) 100%);
  }
  .cover-inner { position: absolute; left: 0; right: 0; bottom: 0; padding: 16mm; }
  .cover-eyebrow {
    color: ${t.coverAccent}; letter-spacing: 4px; font-size: 11px; font-weight: 700;
    text-transform: uppercase; margin-bottom: 10px;
  }
  .cover-name { font-size: 34px; font-weight: 800; letter-spacing: -0.5px; margin: 0 0 4px; }
  .cover-sub { font-size: 13px; opacity: 0.85; margin-bottom: 16px; }
  .cover-grid { display: flex; flex-wrap: wrap; gap: 0; border-top: 1px solid rgba(255,255,255,0.25); }
  .cover-cell { flex: 1 1 20%; padding: 10px 6px 0; min-width: 80px; }
  .cover-cell .cl { font-size: 8.5px; letter-spacing: 1.5px; text-transform: uppercase; color: ${t.coverAccent}; }
  .cover-cell .cv { font-size: 13px; font-weight: 600; }
  .cover-price { margin-top: 14px; font-size: 22px; font-weight: 800; color: ${t.coverAccent}; }
  .cover-date { position: absolute; top: 16mm; right: 16mm; font-size: 10px; letter-spacing: 1px; opacity: 0.7; }
  /* tables */
  table.spec { width: 100%; border-collapse: collapse; }
  table.spec td { padding: 7px 4px; border-bottom: 1px solid ${t.line}; vertical-align: top; }
  .spec-l { color: ${t.accent}; font-size: 9px; letter-spacing: 1px; text-transform: uppercase; width: 40%; font-weight: 700; }
  .spec-v { font-weight: 600; }
  .two-col { display: flex; gap: 18px; }
  .two-col > div { flex: 1; }
  .sub-h { font-size: 12px; font-weight: 700; margin: 0 0 8px; color: ${t.text}; }
  table.equip { width: 100%; border-collapse: collapse; }
  table.equip td { padding: 6px 4px; border-bottom: 1px solid ${t.line}; vertical-align: top; }
  .eq-cat { color: ${t.accent}; font-size: 8.5px; letter-spacing: 0.8px; text-transform: uppercase; width: 24%; font-weight: 700; }
  .eq-name { font-weight: 600; width: 34%; }
  .eq-detail { color: ${t.textMuted}; }
  /* photos */
  .photo-grid { display: flex; flex-wrap: wrap; gap: 5mm; }
  .photo-cell { width: calc(50% - 2.5mm); height: 70mm; overflow: hidden; border-radius: 2px; background: ${t.panelBg}; }
  .photo-cell img { width: 100%; height: 100%; object-fit: cover; }
  /* pricing */
  .price-row { display: flex; gap: 12px; margin-bottom: 16px; }
  .price-box { flex: 1; background: ${t.panelBg}; border-left: 4px solid ${t.accent}; padding: 16px; border-radius: 2px; }
  .price-label { color: ${t.accent}; font-size: 9px; letter-spacing: 1.5px; text-transform: uppercase; font-weight: 700; margin-bottom: 6px; }
  .price-val { font-size: 20px; font-weight: 800; }
  .price-val .per { font-size: 11px; font-weight: 500; color: ${t.textMuted}; }
  .price-extra { color: ${t.textMuted}; font-size: 10px; margin-top: 6px; }
  .meta-block { margin-bottom: 14px; }
  .notes { background: ${t.panelBg}; border-radius: 2px; padding: 12px 14px; margin-bottom: 14px; }
  .notes-h { color: ${t.accent}; font-size: 9px; letter-spacing: 1.5px; text-transform: uppercase; font-weight: 700; margin-bottom: 4px; }
  .notes p { margin: 0; }
  .contact { margin-top: 4px; }
  .disclaimer { margin-top: 18px; color: ${t.textMuted}; font-size: 9px; font-style: italic; }
  ${
    confidential
      ? `.watermark { position: fixed; top: 45%; left: 0; right: 0; text-align: center;
           font-size: 60px; font-weight: 800; color: ${t.accent}; opacity: 0.08;
           transform: rotate(-28deg); letter-spacing: 8px; z-index: 0; }`
      : ".watermark { display: none; }"
  }
  `;
}

// ─── main ──────────────────────────────────────────────────────────────────────

export function buildProposalHtml(input: {
  yacht: YachtProfile;
  reportData: ProposalReportData;
  settings: ExportSettings;
  template: DocumentTemplate;
}): string {
  const { yacht, reportData, settings, template } = input;
  const t = THEMES[template];
  const d = dict(settings.language);
  const confidential = settings.confidential === true;
  const ptype: string = reportData.proposal_type ?? "sale";

  const photos = photoList(yacht);
  const cover = photos[0];
  const date = new Date().toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const subtitleBits = [yacht.builder, yacht.model, yacht.year_built]
    .filter((x) => x != null && x !== "")
    .map((x) => esc(x))
    .join(" · ");

  const coverCells: [string, string][] = [];
  if (yacht.year_built != null) coverCells.push(["Year", String(yacht.year_built)]);
  if (num(yacht.length_meters) != null)
    coverCells.push(["Length", `${num(yacht.length_meters)} m`]);
  if (yacht.guests != null) coverCells.push(["Guests", String(yacht.guests)]);
  if (yacht.cabins != null) coverCells.push(["Cabins", String(yacht.cabins)]);
  if (yacht.flag) coverCells.push(["Flag", esc(yacht.flag)]);

  let coverPrice = "";
  if ((ptype === "sale" || ptype === "both") && reportData.sale_price_eur != null) {
    coverPrice = money(reportData.sale_price_eur);
  } else if (
    (ptype === "charter" || ptype === "both") &&
    reportData.charter_high_eur_week != null
  ) {
    coverPrice = `${money(reportData.charter_high_eur_week)} / wk`;
  }

  const coverHtml = `
  <div class="cover">
    ${cover ? `<img class="cover-photo" src="${esc(cover)}" />` : ""}
    ${cover ? `<div class="cover-overlay"></div>` : ""}
    <div class="cover-date">${esc(date)}</div>
    <div class="cover-inner">
      <div class="cover-eyebrow">${esc(settings.brand_name ?? "Yachtworth")} · ${esc(d["proposal"])}</div>
      <h1 class="cover-name">${esc(yacht.name)}</h1>
      ${subtitleBits ? `<div class="cover-sub">${subtitleBits}</div>` : ""}
      ${
        coverCells.length
          ? `<div class="cover-grid">${coverCells
              .map(
                ([l, v]) =>
                  `<div class="cover-cell"><div class="cl">${esc(l)}</div><div class="cv">${v}</div></div>`,
              )
              .join("")}</div>`
          : ""
      }
      ${coverPrice ? `<div class="cover-price">${coverPrice}</div>` : ""}
    </div>
  </div>`;

  const specs = specRows(yacht);
  const accom = accomRows(yacht);
  const specsPage = `
  <section class="page">
    <div class="eyebrow">${esc(d["specifications"])}</div>
    <div class="two-col">
      <div>${tableHtml(specs)}</div>
      <div>
        <div class="sub-h">${esc(d["accommodation"])}</div>
        ${accom.length ? tableHtml(accom) : `<p style="color:${t.textMuted}">—</p>`}
      </div>
    </div>
  </section>`;

  const equip = Array.isArray(reportData.equipment) ? reportData.equipment : [];

  return `<!doctype html>
<html><head><meta charset="utf-8" /><style>${css(t, confidential)}</style></head>
<body>
  ${confidential ? `<div class="watermark">${esc(d["confidential"])}</div>` : ""}
  ${coverHtml}
  ${specsPage}
  ${equipmentPages(equip, d)}
  ${photoPages(photos, d)}
  ${pricingPage(reportData, d, ptype)}
</body></html>`;
}
