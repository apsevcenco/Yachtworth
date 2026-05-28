import * as Print from "expo-print";
import * as Sharing from "expo-sharing";

export type ProposalLanguage =
  | "english"
  | "french"
  | "italian"
  | "spanish"
  | "german"
  | "russian";
export type ProposalType = "sale" | "charter" | "both";

export interface ProposalYachtSnapshot {
  name: string;
  builder?: string | null;
  model?: string | null;
  yacht_type?: string | null;
  year_built?: number | null;
  length_meters?: number | null;
  beam_meters?: number | null;
  draft_meters?: number | null;
  flag?: string | null;
  home_port?: string | null;
  cabins?: number | null;
  guests?: number | null;
  crew?: number | null;
  berths?: number | null;
  heads?: number | null;
  crew_cabins?: number | null;
  engine_maker?: string | null;
  engine_model?: string | null;
  engine_count?: number | null;
  total_hp?: number | null;
  engine_hours?: number | null;
  max_speed_knots?: number | null;
  cruising_speed_knots?: number | null;
  range_nm?: number | null;
  fuel_capacity_l?: number | null;
  hull_material?: string | null;
  registration_number?: string | null;
  imo_number?: string | null;
  hull_id?: string | null;
  vat_status?: string | null;
  photo_url?: string | null;
  photo_urls?: string[] | null;
  cover_photo_url?: string | null;
}

export interface ProposalEquipmentItem {
  category: string;
  equipment_type: string;
  brand?: string | null;
  model?: string | null;
  quantity?: number | null;
  power_kw?: number | null;
  power_hp?: number | null;
  capacity_liters?: number | null;
  capacity_persons?: number | null;
  total_watts?: number | null;
  year_installed?: number | null;
  hours?: number | null;
  notes?: string | null;
}

export interface ProposalSettings {
  proposal_type: ProposalType;
  language: ProposalLanguage;
  sections: string[];
  sale_price_eur?: number | null;
  charter_low_eur_week?: number | null;
  charter_high_eur_week?: number | null;
  charter_apa_pct?: number | null;
  charter_vat_pct?: number | null;
  price_on_application?: boolean | null;
  charter_on_application?: boolean | null;
  delivery?: string | null;
  sea_trial?: string | null;
  charter_area?: string | null;
  myba_contract?: boolean | null;
  notes?: string | null;
  broker_name?: string | null;
  broker_company?: string | null;
  broker_email?: string | null;
  broker_phone?: string | null;
  broker_website?: string | null;
}

export interface ProposalPdfInput {
  yacht: ProposalYachtSnapshot;
  equipment: ProposalEquipmentItem[];
  settings: ProposalSettings;
}

// ── HELPERS ──────────────────────────────────────────────────────────────

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function fmtEur(n: number | null | undefined): string | null {
  if (n == null || !isFinite(n) || n <= 0) return null;
  return (
    "€\u2009" +
    Number(n).toLocaleString("en-GB", { maximumFractionDigits: 0 })
  );
}

function fmtNum(n: number | null | undefined): string | null {
  if (n == null || !isFinite(n)) return null;
  return Number(n).toLocaleString("en-GB", { maximumFractionDigits: 0 });
}

function row(label: string, value: string | null | undefined): string {
  if (value == null || value === "" || value === "0") return "";
  return `<div class="spec-row"><span class="spec-label">${esc(label)}</span><span class="spec-value">${esc(String(value))}</span></div>`;
}

function accentRow(label: string, value: string | null | undefined): string {
  if (value == null || value === "") return "";
  return `<div class="spec-row"><span class="spec-label">${esc(label)}</span><span class="spec-value accent">${esc(String(value))}</span></div>`;
}

function humanizeType(t: string | null | undefined): string | null {
  if (!t) return null;
  return t
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function humanizeEquipmentType(t: string): string {
  return t.replace(/_/g, " ");
}

// ── CONSTANTS ────────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<string, string> = {
  power_electrical: "Power &amp; Electrical",
  navigation: "Navigation &amp; Communication",
  water_systems: "Water Systems",
  comfort_climate: "Comfort &amp; Climate",
  safety: "Safety",
  water_toys_tenders: "Tenders &amp; Water Toys",
  deck_anchoring: "Deck &amp; Anchoring",
  sailing: "Sailing Equipment",
};

const NOTABLE_EQUIPMENT = [
  "generator",
  "stabilizer",
  "starlink",
  "watermaker",
  "tender",
  "jetski",
  "gyro_stabilizer",
  "seakeeper",
];

function formatEquipmentItem(item: ProposalEquipmentItem): string {
  const parts: string[] = [];
  if (item.quantity != null && item.quantity > 1) {
    parts.push(`${item.quantity} ×`);
  }
  if (item.brand) parts.push(item.brand);
  if (item.model) parts.push(item.model);
  parts.push(humanizeEquipmentType(item.equipment_type));
  let label = parts.join(" ").trim();
  if (item.power_kw != null && item.power_kw > 0) {
    label += ` (${item.power_kw} kW)`;
  }
  if (item.capacity_liters != null && item.capacity_liters > 0) {
    label += ` (${item.capacity_liters} L/hr)`;
  }
  if (item.hours != null && item.hours > 0) {
    label += ` — ${item.hours} hrs`;
  }
  return label;
}

// ── HTML BUILDER ─────────────────────────────────────────────────────────

interface BuildFlags {
  hasPhotos: boolean;
  hasEquipment: boolean;
  hasContact: boolean;
}

function buildProposalHTML(
  yacht: ProposalYachtSnapshot,
  equipment: ProposalEquipmentItem[],
  settings: ProposalSettings,
  flags: BuildFlags,
): string {
  // ── COVER PHOTO ──
  const rawPhotos = (yacht.photo_urls && yacht.photo_urls.length > 0
    ? yacht.photo_urls
    : yacht.cover_photo_url
      ? [yacht.cover_photo_url]
      : yacht.photo_url
        ? [yacht.photo_url]
        : []) as string[];
  const photoUrls = rawPhotos.filter(
    (u): u is string => typeof u === "string" && u.trim().length > 0 && /^https?:\/\//i.test(u),
  );

  const coverPhotoHTML =
    photoUrls.length > 0
      ? `<img class="cover-photo" src="${esc(photoUrls[0]!)}" alt="${esc(yacht.name)}"/>`
      : `<div class="cover-photo-placeholder">No photo available</div>`;

  // ── COVER PRICE ──
  const coverPriceHTML =
    settings.proposal_type === "charter"
      ? `<div><div class="cover-price-label">Charter from</div><div class="cover-price">${
          settings.charter_high_eur_week && !settings.charter_on_application
            ? esc(fmtEur(settings.charter_high_eur_week) ?? "") + " / week"
            : "Price on application"
        }</div></div>`
      : `<div><div class="cover-price-label">Asking Price</div><div class="cover-price">${
          settings.sale_price_eur && !settings.price_on_application
            ? esc(fmtEur(settings.sale_price_eur) ?? "")
            : "Price on application"
        }</div></div>`;

  // ── PROPOSAL TYPE LABEL ──
  const typeLabel =
    settings.proposal_type === "sale"
      ? "For Sale"
      : settings.proposal_type === "charter"
        ? "For Charter"
        : "For Sale &amp; Charter";

  // ── SPECS (two columns) ──
  const enginesValue =
    yacht.engine_count != null && yacht.engine_count > 0 && yacht.engine_maker
      ? `${yacht.engine_count} × ${yacht.engine_maker}${yacht.engine_model ? " " + yacht.engine_model : ""}`
      : null;

  const specsHTML = `<div class="specs-two">
    <div class="specs-list">
      ${row("Builder", yacht.builder)}
      ${row("Model", yacht.model)}
      ${row("Year built", yacht.year_built != null ? String(yacht.year_built) : null)}
      ${row("Type", humanizeType(yacht.yacht_type))}
      ${row("LOA", yacht.length_meters ? yacht.length_meters.toFixed(2) + " m" : null)}
      ${row("Beam", yacht.beam_meters ? yacht.beam_meters.toFixed(2) + " m" : null)}
      ${row("Draft", yacht.draft_meters ? yacht.draft_meters.toFixed(2) + " m" : null)}
      ${row("Hull material", yacht.hull_material)}
    </div>
    <div class="specs-list">
      ${row("Engines", enginesValue)}
      ${row("Total power", yacht.total_hp ? yacht.total_hp + " HP" : null)}
      ${row("Engine hours", yacht.engine_hours ? fmtNum(yacht.engine_hours) + " hrs" : null)}
      ${row("Max speed", yacht.max_speed_knots ? yacht.max_speed_knots + " knots" : null)}
      ${row("Cruise speed", yacht.cruising_speed_knots ? yacht.cruising_speed_knots + " knots" : null)}
      ${row("Range", yacht.range_nm ? fmtNum(yacht.range_nm) + " nm" : null)}
      ${row("Fuel capacity", yacht.fuel_capacity_l ? fmtNum(yacht.fuel_capacity_l) + " L" : null)}
      ${row("Flag", yacht.flag)}
      ${row("Home base", yacht.home_port)}
      ${row("Reg. number", yacht.registration_number)}
      ${row("IMO number", yacht.imo_number)}
      ${accentRow("VAT status", yacht.vat_status)}
    </div>
  </div>`;

  // ── ACCOMMODATION (only rows > 0) ──
  const accomRows: { label: string; value: number | null | undefined }[] = [
    { label: "Max guests", value: yacht.berths ?? yacht.guests },
    { label: "Guest cabins", value: yacht.cabins },
    { label: "Heads / WC", value: yacht.heads },
    { label: "Crew cabins", value: yacht.crew_cabins },
    { label: "Crew", value: yacht.crew },
  ].filter((r) => r.value != null && r.value > 0);

  const accomHTML =
    accomRows.length > 0
      ? accomRows.map((r) => row(r.label, String(r.value))).join("")
      : "";

  // ── EQUIPMENT ──
  let equipmentHTML = "";
  if (flags.hasEquipment) {
    const groups: Record<string, ProposalEquipmentItem[]> = {};
    for (const item of equipment) {
      const cat = item.category || "other";
      if (!groups[cat]) groups[cat] = [];
      groups[cat]!.push(item);
    }
    const groupsHTML = Object.entries(groups)
      .map(([cat, items]) => {
        const itemsHTML = items
          .map((item) => {
            const label = formatEquipmentItem(item);
            const isNotable = NOTABLE_EQUIPMENT.some((n) =>
              item.equipment_type.includes(n),
            );
            return `<span class="eq-item${isNotable ? " hi" : ""}">${esc(label)}</span>`;
          })
          .join("");
        return `<div class="eq-group"><div class="eq-title">${CATEGORY_LABELS[cat] ?? esc(cat)}</div><div class="eq-items">${itemsHTML}</div></div>`;
      })
      .join("");
    equipmentHTML = `<div class="ipage" style="page-break-before:always;">
      <div class="ih">
        <div class="ih-brand">YachtWorth</div>
        <div class="ih-right">
          <div class="ih-yacht">${esc(yacht.name)}</div>
          <div class="ih-page">EQ</div>
        </div>
      </div>
      <div class="ib">
        <div class="sec"><div class="sec-title">Equipment &amp; Systems</div><div class="eq-grid">${groupsHTML}</div></div>
      </div>
      <div class="ifooter">
        <div class="footer-disclaimer">Equipment list as declared by owner. Items subject to verification at survey.</div>
        <div><div class="footer-brand">YachtWorth</div><div class="footer-powered">Powered by PDYE Group</div></div>
      </div>
    </div>`;
  }

  // ── PHOTOS PAGE ──
  const photosPageHTML = flags.hasPhotos
    ? `<div class="ipage" style="page-break-before:always;">
        <div class="ih">
          <div class="ih-brand">YachtWorth</div>
          <div class="ih-right">
            <div class="ih-yacht">${esc(yacht.name)}</div>
            <div class="ih-page">03</div>
          </div>
        </div>
        <div class="ib">
          <div class="sec">
            <div class="sec-title">Photography</div>
            <img class="photo-cover" src="${esc(photoUrls[0]!)}" alt=""/>
            ${
              photoUrls.length > 1
                ? `<div class="photo-grid">${photoUrls
                    .slice(1, 7)
                    .map((u) => `<img src="${esc(u)}" alt=""/>`)
                    .join("")}</div>`
                : ""
            }
          </div>
        </div>
        <div class="ifooter">
          <div class="footer-disclaimer">Photos representative of vessel condition at time of documentation.</div>
          <div><div class="footer-brand">YachtWorth</div><div class="footer-powered">Powered by PDYE Group</div></div>
        </div>
      </div>`
    : "";

  // ── PRICING ──
  const wantSale =
    settings.proposal_type === "sale" || settings.proposal_type === "both";
  const wantCharter =
    settings.proposal_type === "charter" || settings.proposal_type === "both";

  const saleHTML = wantSale
    ? `<div class="price-group">
        <div class="price-main">
          <div class="price-main-label">For Sale</div>
          <div class="price-main-value">${
            settings.price_on_application || !settings.sale_price_eur
              ? "Price on application"
              : esc(fmtEur(settings.sale_price_eur) ?? "")
          }</div>
        </div>
        ${row("VAT status", yacht.vat_status)}
        ${row("Delivery", settings.delivery || "Immediate")}
        ${row("Sea trial", settings.sea_trial || "On request")}
        ${row("Survey", "Available on request")}
      </div>`
    : "";

  const charterHTML = wantCharter
    ? `<div class="price-group">
        <div class="price-main">
          <div class="price-main-label">For Charter</div>
          <div class="price-main-value">${
            settings.charter_on_application || !settings.charter_high_eur_week
              ? "Price on application"
              : esc(fmtEur(settings.charter_high_eur_week) ?? "") +
                ' <span class="price-unit">/ week</span>'
          }</div>
        </div>
        ${
          settings.charter_low_eur_week
            ? row(
                "Low season",
                (fmtEur(settings.charter_low_eur_week) ?? "") + " / week",
              )
            : ""
        }
        ${
          settings.charter_apa_pct
            ? row("APA", settings.charter_apa_pct + "% of base rate")
            : ""
        }
        ${row("Charter area", settings.charter_area)}
        ${settings.myba_contract ? row("Contract", "MYBA standard") : ""}
      </div>`
    : "";

  // ── CONTACT ──
  const contactHTML = flags.hasContact
    ? `<div class="contact">
        <div class="contact-left">
          ${settings.broker_name ? `<div class="broker-name">${esc(settings.broker_name)}</div>` : ""}
          ${settings.broker_company ? `<div class="broker-co">${esc(settings.broker_company)}</div>` : ""}
        </div>
        <div class="contact-right">
          ${settings.broker_email ? `<div class="contact-item"><span class="ci-label">Email</span>${esc(settings.broker_email)}</div>` : ""}
          ${settings.broker_phone ? `<div class="contact-item"><span class="ci-label">Phone</span>${esc(settings.broker_phone)}</div>` : ""}
          ${settings.broker_website ? `<div class="contact-item"><span class="ci-label">Web</span>${esc(settings.broker_website)}</div>` : ""}
        </div>
      </div>`
    : "";

  // ── NOTES ──
  const notesHTML = settings.notes
    ? `<div class="notes">
        <div class="notes-label">Notes</div>
        <div class="notes-text">${esc(settings.notes)}</div>
      </div>`
    : "";

  const pricingPageNum = flags.hasPhotos ? "04" : "03";

  // ── ASSEMBLE FULL HTML ──
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
@page { size: A4; margin: 0; }
@media print {
  body > div { background: none !important; padding: 0 !important; }
  .cover, .ipage { margin: 0 !important; box-shadow: none !important; }
}
* { box-sizing: border-box; }
body {
  margin: 0;
  font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
  color: #1a1a1a;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}

/* COVER — no fixed full-page height. Only the photo has a fixed height. */
.cover {
  width: 210mm;
  background: #ffffff;
  page-break-after: always;
}
.cover-photo {
  width: 100%;
  height: 170mm;
  object-fit: cover;
  display: block;
}
.cover-photo-placeholder {
  width: 100%;
  height: 170mm;
  background: #f0eee9;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #888;
  font-size: 13px;
  letter-spacing: 1px;
}
.cover-content {
  padding: 18mm 18mm 22mm;
}
.cover-line {
  width: 36px;
  height: 2px;
  background: #C9A961;
  margin-bottom: 18px;
}
.cover-meta-row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  text-transform: uppercase;
  letter-spacing: 2.5px;
  font-size: 9.5px;
  color: #888;
  margin-bottom: 12px;
}
.cover-doc-type { color: #1a1a1a; font-weight: 600; }
.cover-doc-date { color: #888; }
.cover-yacht-name {
  font-size: 42px;
  font-weight: 700;
  letter-spacing: -0.5px;
  color: #0B1E3F;
  margin-bottom: 22px;
}
.cover-specs-row {
  display: flex;
  gap: 28px;
  flex-wrap: wrap;
  margin-bottom: 28px;
  padding-bottom: 22px;
  border-bottom: 1px solid #e8e4d8;
}
.csi-label {
  font-size: 9px;
  text-transform: uppercase;
  letter-spacing: 1.5px;
  color: #999;
  margin-bottom: 4px;
}
.csi-value {
  font-size: 13px;
  font-weight: 600;
  color: #1a1a1a;
}
.cover-price-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
}
.cover-price-label {
  font-size: 9.5px;
  text-transform: uppercase;
  letter-spacing: 2px;
  color: #999;
  margin-bottom: 6px;
}
.cover-price {
  font-size: 28px;
  font-weight: 300;
  color: #0B1E3F;
  letter-spacing: -0.3px;
}
.cover-brand {
  font-size: 11px;
  letter-spacing: 4px;
  font-weight: 700;
  color: #C9A961;
  text-transform: uppercase;
}

/* INNER PAGES — no min-height */
.ipage {
  width: 210mm;
  background: #ffffff;
}
.ih {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  padding: 10mm 16mm 5mm;
  border-bottom: 1px solid #e8e4d8;
}
.ih-brand {
  font-size: 10px;
  letter-spacing: 3px;
  font-weight: 700;
  color: #C9A961;
  text-transform: uppercase;
}
.ih-right {
  display: flex;
  align-items: baseline;
  gap: 18px;
}
.ih-yacht {
  font-size: 11px;
  font-weight: 600;
  color: #0B1E3F;
  letter-spacing: 1.5px;
  text-transform: uppercase;
}
.ih-page {
  font-size: 10px;
  color: #999;
  letter-spacing: 1px;
}
.ib {
  padding: 6mm 16mm 4mm;
}

/* Sections */
.sec { margin-bottom: 7mm; }
.sec-title {
  font-size: 11px;
  letter-spacing: 3.5px;
  font-weight: 700;
  color: #C9A961;
  text-transform: uppercase;
  margin-bottom: 12px;
  padding-bottom: 6px;
  border-bottom: 1px solid #e8e4d8;
}

/* Spec rows */
.specs-two {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0 32px;
}
.specs-list {
  display: flex;
  flex-direction: column;
}
.spec-row {
  display: flex;
  justify-content: space-between;
  padding: 7px 0;
  border-bottom: 1px solid #f3f0e8;
  font-size: 10.5px;
}
.spec-label { color: #888; }
.spec-value { color: #1a1a1a; font-weight: 500; text-align: right; }
.spec-value.accent { color: #C9A961; font-weight: 600; }

/* Equipment */
.eq-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 3mm 20px;
}
.eq-group {
  break-inside: avoid;
  margin-bottom: 3mm;
}
.eq-title {
  font-size: 8.5px;
  letter-spacing: 1.5px;
  font-weight: 700;
  color: #0B1E3F;
  text-transform: uppercase;
  margin-bottom: 5px;
}
.eq-items {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.eq-item {
  font-size: 9px;
  color: #2a2a2a;
  line-height: 1.4;
  padding-left: 9px;
  position: relative;
}
.eq-item::before {
  content: "—";
  position: absolute;
  left: 0;
  color: #C9A961;
}
.eq-item.hi { color: #0B1E3F; font-weight: 600; }

/* Photos page */
.photo-cover {
  width: 100%;
  height: 90mm;
  object-fit: cover;
  display: block;
  margin-bottom: 3mm;
}
.photo-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 3mm;
}
.photo-grid img {
  width: 100%;
  height: 42mm;
  object-fit: cover;
  display: block;
}

/* Pricing */
.pricing-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 28px;
}
.price-group {
  border-left: 3px solid #C9A961;
  padding-left: 18px;
}
.price-main { margin-bottom: 14px; padding-bottom: 14px; border-bottom: 1px solid #f3f0e8; }
.price-main-label {
  font-size: 10px;
  letter-spacing: 2px;
  font-weight: 700;
  color: #0B1E3F;
  text-transform: uppercase;
  margin-bottom: 4px;
}
.price-main-value {
  font-size: 22px;
  font-weight: 300;
  color: #0B1E3F;
  letter-spacing: -0.2px;
}
.price-unit {
  font-size: 12px;
  font-weight: 300;
  color: #999;
  letter-spacing: 0;
}

/* Notes */
.notes {
  margin-top: 6mm;
  padding: 14px 18px;
  background: #faf8f1;
  border-left: 3px solid #C9A961;
}
.notes-label {
  font-size: 9px;
  letter-spacing: 2px;
  font-weight: 700;
  color: #C9A961;
  text-transform: uppercase;
  margin-bottom: 6px;
}
.notes-text {
  font-size: 10.5px;
  line-height: 1.55;
  color: #2a2a2a;
}

/* Contact */
.contact {
  margin-top: 8mm;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 28px;
  padding: 16px 20px;
  background: #faf8f1;
  border-left: 3px solid #C9A961;
}
.broker-name {
  font-size: 14px;
  font-weight: 600;
  color: #0B1E3F;
  margin-bottom: 4px;
}
.broker-co {
  font-size: 10.5px;
  color: #666;
}
.contact-right {
  text-align: right;
}
.contact-item {
  font-size: 10.5px;
  color: #1a1a1a;
  margin-bottom: 6px;
}
.ci-label {
  display: block;
  font-size: 8.5px;
  letter-spacing: 1.5px;
  color: #999;
  text-transform: uppercase;
  margin-bottom: 1px;
}

/* Footer — normal flow, NOT absolute */
.ifooter {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  border-top: 1px solid #f0f0f0;
  padding-top: 8px;
  margin: 4mm 16mm 8mm;
}
.footer-disclaimer {
  font-size: 8px;
  color: #999;
  font-style: italic;
  max-width: 62%;
  line-height: 1.4;
}
.footer-brand {
  font-size: 9px;
  letter-spacing: 3px;
  font-weight: 700;
  color: #C9A961;
  text-transform: uppercase;
  text-align: right;
}
.footer-powered {
  font-size: 7.5px;
  color: #999;
  letter-spacing: 1px;
  text-align: right;
  margin-top: 2px;
}
</style>
</head>
<body>
<div style="background:#e0e0e0;padding:0;">

<!-- PAGE 1: COVER -->
<div class="cover">
  ${coverPhotoHTML}
  <div class="cover-content">
    <div class="cover-line"></div>
    <div class="cover-meta-row">
      <div class="cover-doc-type">Vessel Proposal &nbsp;·&nbsp; ${typeLabel}</div>
      <div class="cover-doc-date">${esc(new Date().toLocaleDateString("en-GB", { month: "long", year: "numeric" }).toUpperCase())}</div>
    </div>
    <div class="cover-yacht-name">${esc(yacht.name)}</div>
    <div class="cover-specs-row">
      ${yacht.builder ? `<div><div class="csi-label">Builder</div><div class="csi-value">${esc(yacht.builder)}</div></div>` : ""}
      ${yacht.year_built ? `<div><div class="csi-label">Year</div><div class="csi-value">${yacht.year_built}</div></div>` : ""}
      ${yacht.length_meters ? `<div><div class="csi-label">Length</div><div class="csi-value">${yacht.length_meters.toFixed(1)} m</div></div>` : ""}
      ${yacht.flag ? `<div><div class="csi-label">Flag</div><div class="csi-value">${esc(yacht.flag)}</div></div>` : ""}
      ${yacht.home_port ? `<div><div class="csi-label">Base</div><div class="csi-value">${esc(yacht.home_port)}</div></div>` : ""}
    </div>
    <div class="cover-price-row">
      ${coverPriceHTML}
      <div class="cover-brand">YachtWorth</div>
    </div>
  </div>
</div>

<!-- PAGE 2: SPECS + ACCOMMODATION + EQUIPMENT -->
<div class="ipage" style="page-break-before:always;">
  <div class="ih">
    <div class="ih-brand">YachtWorth</div>
    <div class="ih-right">
      <div class="ih-yacht">${esc(yacht.name)}</div>
      <div class="ih-page">02</div>
    </div>
  </div>
  <div class="ib">
    <div class="sec">
      <div class="sec-title">Specifications</div>
      ${specsHTML}
    </div>
    ${
      accomHTML
        ? `<div class="sec"><div class="sec-title">Accommodation</div><div class="specs-list">${accomHTML}</div></div>`
        : ""
    }
  </div>
  <div class="ifooter">
    <div class="footer-disclaimer">All specifications believed correct. Buyer must verify independently prior to purchase.</div>
    <div><div class="footer-brand">YachtWorth</div><div class="footer-powered">Powered by PDYE Group</div></div>
  </div>
</div>

<!-- EQUIPMENT (own page if any) -->
${equipmentHTML}

<!-- PHOTOS (only if photos exist) -->
${photosPageHTML}

<!-- PAGE 4 (or 3): PRICING + NOTES + CONTACT -->
<div class="ipage" style="page-break-before:always;">
  <div class="ih">
    <div class="ih-brand">YachtWorth</div>
    <div class="ih-right">
      <div class="ih-yacht">${esc(yacht.name)}</div>
      <div class="ih-page">${pricingPageNum}</div>
    </div>
  </div>
  <div class="ib">
    <div class="sec">
      <div class="sec-title">Pricing</div>
      <div class="pricing-grid">
        ${saleHTML}
        ${charterHTML}
      </div>
    </div>
    ${notesHTML}
    ${contactHTML}
  </div>
  <div class="ifooter">
    <div class="footer-disclaimer">All details believed correct but not guaranteed. Subject to prior sale, withdrawal or price change without notice. Not a binding offer.</div>
    <div><div class="footer-brand">YachtWorth</div><div class="footer-powered">Powered by PDYE Group</div></div>
  </div>
</div>

</div>
</body>
</html>`;
}

// ── PUBLIC API ───────────────────────────────────────────────────────────

export function buildProposalPdfHtml(input: ProposalPdfInput): string {
  const { yacht, equipment, settings } = input;
  const rawPhotos =
    yacht.photo_urls && yacht.photo_urls.length > 0
      ? yacht.photo_urls
      : yacht.cover_photo_url
        ? [yacht.cover_photo_url]
        : yacht.photo_url
          ? [yacht.photo_url]
          : [];
  const photoUrls = rawPhotos.filter(
    (u): u is string =>
      typeof u === "string" && u.trim().length > 0 && /^https?:\/\//i.test(u),
  );
  const flags: BuildFlags = {
    hasPhotos: photoUrls.length >= 1,
    hasEquipment: Array.isArray(equipment) && equipment.length > 0,
    hasContact: Boolean(
      settings.broker_name || settings.broker_email || settings.broker_phone,
    ),
  };
  return buildProposalHTML(yacht, equipment, settings, flags);
}

export async function exportProposalPdf(
  input: ProposalPdfInput,
): Promise<void> {
  const html = buildProposalPdfHtml(input);
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
      dialogTitle: `${input.yacht.name} — Vessel Proposal`,
      UTI: "com.adobe.pdf",
    });
  }
}
