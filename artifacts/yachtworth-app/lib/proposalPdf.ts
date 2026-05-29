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
  hull_type?: string | null;
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

// ─── HELPERS ────────────────────────────────────────────────────────────────

function esc(s: string | number): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function fmt(n: number | null | undefined): string | null {
  if (n == null || !isFinite(n)) return null;
  if (!n && n !== 0) return null;
  return (
    "\u20AC\u2009" +
    Number(n).toLocaleString("en-GB", { maximumFractionDigits: 0 })
  );
}

function row(label: string, value: string | number | null | undefined): string {
  if (value == null || value === "") return "";
  if (value === 0 || value === "0") return "";
  return `<div class="spec-row"><span class="spec-label">${esc(label)}</span><span class="spec-value">${esc(value)}</span></div>`;
}

function accentRow(
  label: string,
  value: string | number | null | undefined,
): string {
  if (value == null || value === "") return "";
  return `<div class="spec-row"><span class="spec-label">${esc(label)}</span><span class="spec-value accent">${esc(value)}</span></div>`;
}

function getMonthYear(): string {
  return new Date()
    .toLocaleDateString("en-GB", { month: "long", year: "numeric" })
    .toUpperCase();
}

function getTypeLabel(t: ProposalType): string {
  if (t === "sale") return "FOR SALE";
  if (t === "charter") return "FOR CHARTER";
  return "FOR SALE &amp; CHARTER";
}

function getCoverPrice(s: ProposalSettings): string {
  if (s.proposal_type === "charter")
    return s.charter_on_application
      ? "Price on application"
      : (fmt(s.charter_high_eur_week) || "POA") + "\u2009/ week";
  return s.price_on_application
    ? "Price on application"
    : fmt(s.sale_price_eur) || "Price on application";
}

function getCoverPriceLabel(s: ProposalSettings): string {
  return s.proposal_type === "charter" ? "Charter from" : "Asking Price";
}

function engineStr(y: ProposalYachtSnapshot): string | null {
  if (!y.engine_maker) return null;
  const c = y.engine_count && y.engine_count > 0 ? y.engine_count + " \u00D7 " : "";
  const m = y.engine_model ? " " + y.engine_model : "";
  return c + y.engine_maker + m;
}

const NOTABLE = [
  "generator",
  "stabilizer",
  "starlink",
  "watermaker",
  "tender",
  "jetski",
  "gyro",
  "vsat",
  "air_conditioning_central",
];
function notable(type: string | null | undefined): boolean {
  return NOTABLE.some((n) => (type || "").toLowerCase().includes(n));
}

function equipLabel(item: ProposalEquipmentItem): string {
  let s = "";
  if (item.quantity && item.quantity > 1) s += item.quantity + " \u00D7 ";
  if (item.brand) s += item.brand + " ";
  if (item.model) s += item.model + " ";
  s += (item.equipment_type || "").replace(/_/g, " ");
  if (item.power_kw) s += " (" + item.power_kw + " kW)";
  if (item.capacity_liters) s += " (" + item.capacity_liters + " L/hr)";
  if (item.hours) s += " \u2014 " + item.hours + " hrs";
  return s.trim();
}

const CAT_LABELS: Record<string, string> = {
  power_electrical: "Power &amp; Electrical",
  navigation: "Navigation &amp; Communication",
  water_systems: "Water Systems",
  comfort_climate: "Comfort &amp; Climate",
  safety: "Safety",
  water_toys_tenders: "Tenders &amp; Water Toys",
  deck_anchoring: "Deck &amp; Anchoring",
  sailing: "Sailing Equipment",
};

// ─── CSS ────────────────────────────────────────────────────────────────────

const CSS = `
* { margin:0; padding:0; box-sizing:border-box; }
@page { size: A4; margin: 0; }
@media print {
  body > div { background:none !important; padding:0 !important; }
  .cover, .ipage { margin:0 !important; box-shadow:none !important; }
}
body {
  font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
  background: #ffffff;
  color: #1a1a1a;
  font-size: 9.5pt;
  line-height: 1.5;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}

/* COVER */
.cover {
  width: 210mm;
  background: #ffffff;
  page-break-after: always;
  margin: 0 auto 20px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.12);
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
  background: #f0ede8;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 8pt;
  color: #ccc;
  letter-spacing: 3px;
  text-transform: uppercase;
}
.cover-content { padding: 0 48px 40px; }
.cover-line { height: 1px; background: #1a1a1a; }
.cover-meta-row {
  display: flex;
  justify-content: space-between;
  padding-top: 14px;
  margin-bottom: 16px;
}
.cover-doc-type { font-size: 7pt; letter-spacing: 3px; color: #999; text-transform: uppercase; }
.cover-doc-date { font-size: 7pt; letter-spacing: 1px; color: #999; text-transform: uppercase; }
.cover-yacht-name {
  font-size: 40pt;
  font-weight: 200;
  color: #1a1a1a;
  letter-spacing: -2px;
  line-height: 1;
  margin-bottom: 12px;
}
.cover-specs-row { display: flex; gap: 28px; margin-bottom: 16px; }
.csi-label { font-size: 6pt; letter-spacing: 2px; color: #999; text-transform: uppercase; margin-bottom: 3px; }
.csi-value { font-size: 9pt; font-weight: 500; color: #1a1a1a; }
.cover-price-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  padding-top: 14px;
  border-top: 1px solid #e0e0e0;
}
.cover-price-label { font-size: 6pt; letter-spacing: 2px; color: #999; text-transform: uppercase; margin-bottom: 4px; }
.cover-price { font-size: 20pt; font-weight: 300; color: #1a1a1a; letter-spacing: -0.5px; }
.cover-brand { font-size: 7pt; letter-spacing: 3px; color: #C5973A; text-transform: uppercase; }

/* INNER PAGES */
.ipage {
  width: 210mm;
  background: #ffffff;
  page-break-before: always;
  margin: 0 auto 20px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.12);
  display: flex;
  flex-direction: column;
}
.ih {
  padding: 20px 48px 14px;
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  border-bottom: 1px solid #1a1a1a;
  flex-shrink: 0;
}
.ih-brand { font-size: 6.5pt; letter-spacing: 3px; color: #C5973A; text-transform: uppercase; font-weight: 600; }
.ih-right { display: flex; gap: 20px; align-items: flex-end; }
.ih-yacht { font-size: 7pt; letter-spacing: 1.5px; color: #999; text-transform: uppercase; }
.ih-page { font-size: 7pt; color: #ccc; }

.ib { padding: 20px 48px 0; flex: 1; }

.sec { margin-bottom: 18px; }
.sec-title {
  font-size: 6.5pt;
  font-weight: 600;
  letter-spacing: 3px;
  color: #999;
  text-transform: uppercase;
  margin-bottom: 12px;
}

/* SPECS */
.specs-two { display: grid; grid-template-columns: 1fr 1fr; gap: 0 28px; }
.spec-row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  padding: 4px 0;
  border-bottom: 1px solid #f0f0f0;
}
.spec-row:last-child { border-bottom: none; }
.spec-label { font-size: 8.5pt; color: #999; }
.spec-value { font-size: 9pt; font-weight: 500; color: #1a1a1a; }
.spec-value.accent { color: #C5973A; font-weight: 600; }

/* ACCOMMODATION */
.cabin-row {
  padding: 6px 0;
  border-bottom: 1px solid #f0f0f0;
  display: flex;
  justify-content: space-between;
}
.cabin-row:last-child { border-bottom: none; }
.cabin-type { font-size: 6.5pt; letter-spacing: 2px; color: #C5973A; text-transform: uppercase; font-weight: 600; margin-bottom: 2px; }
.cabin-desc { font-size: 9pt; color: #1a1a1a; }
.cabin-detail { font-size: 8pt; color: #999; margin-top: 1px; }
.cabin-right { font-size: 8pt; color: #999; }

/* EQUIPMENT — two column, vertical list */
.eq-wrap { display: grid; grid-template-columns: 1fr 1fr; gap: 0 28px; }
.eq-group { margin-bottom: 12px; break-inside: avoid; }
.eq-title {
  font-size: 6pt;
  letter-spacing: 2px;
  color: #999;
  text-transform: uppercase;
  font-weight: 600;
  margin-bottom: 4px;
}
.eq-items { display: flex; flex-direction: column; }
.eq-item {
  font-size: 8.5pt;
  color: #555;
  padding: 2px 0 2px 12px;
  position: relative;
  border-bottom: 1px solid #f8f8f8;
}
.eq-item:last-child { border-bottom: none; }
.eq-item::before { content: '\u2014'; position: absolute; left: 0; color: #ddd; font-size: 7pt; top: 4px; }
.eq-item.hi { color: #1a1a1a; font-weight: 600; }
.eq-item.hi::before { color: #C5973A; }

/* PHOTOS — 2x2 grid, equal size */
.photo-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}
.photo-grid img {
  width: 100%;
  height: 62mm;
  object-fit: cover;
  display: block;
}

/* PRICING */
.pricing-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
.price-main { margin-bottom: 10px; padding-bottom: 10px; border-bottom: 1px solid #e0e0e0; }
.price-main-label { font-size: 6.5pt; letter-spacing: 2px; color: #999; text-transform: uppercase; margin-bottom: 5px; }
.price-main-value { font-size: 20pt; font-weight: 200; color: #1a1a1a; letter-spacing: -0.5px; line-height: 1; }
.price-row {
  display: flex;
  justify-content: space-between;
  padding: 4px 0;
  border-bottom: 1px solid #f5f5f5;
  font-size: 8.5pt;
}
.price-row:last-child { border-bottom: none; }
.pdl { color: #999; }
.pdv { color: #1a1a1a; font-weight: 500; }

/* NOTES */
.notes { margin-top: 16px; padding-top: 14px; border-top: 1px solid #e0e0e0; }
.notes-label { font-size: 6.5pt; letter-spacing: 2px; color: #999; text-transform: uppercase; margin-bottom: 8px; }
.notes-text { font-size: 8.5pt; color: #555; line-height: 1.7; }

/* CONTACT */
.contact { margin-top: 16px; padding-top: 14px; border-top: 1px solid #1a1a1a; display: flex; justify-content: space-between; align-items: flex-end; }
.broker-name { font-size: 13pt; font-weight: 300; color: #1a1a1a; margin-bottom: 2px; }
.broker-co { font-size: 8pt; color: #999; }
.contact-right { text-align: right; }
.contact-item { font-size: 8.5pt; color: #555; margin-bottom: 3px; }
.ci-label { font-size: 6pt; letter-spacing: 2px; color: #ccc; text-transform: uppercase; display: block; margin-bottom: 1px; }

/* FOOTER — always at bottom, normal flow */
.ifooter {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  border-top: 1px solid #f0f0f0;
  padding: 10px 48px 24px;
  margin-top: 20px;
  flex-shrink: 0;
}
.footer-disclaimer { font-size: 6pt; color: #ccc; max-width: 60%; line-height: 1.5; }
.footer-brand { font-size: 6.5pt; letter-spacing: 2px; color: #C5973A; text-transform: uppercase; text-align: right; }
.footer-powered { font-size: 5.5pt; color: #ccc; text-align: right; margin-top: 2px; }
`;

// ─── PAGE 1: COVER ───────────────────────────────────────────────────────────

function buildCover(
  yacht: ProposalYachtSnapshot,
  settings: ProposalSettings,
  photoUrls: string[],
): string {
  const photoHTML =
    photoUrls.length > 0
      ? `<img class="cover-photo" src="${esc(photoUrls[0]!)}" alt="${esc(yacht.name)}">`
      : `<div class="cover-photo-placeholder">No photo available</div>`;

  const specs: { label: string; value: string }[] = [
    { label: "Builder", value: yacht.builder ?? "" },
    { label: "Year", value: yacht.year_built != null ? String(yacht.year_built) : "" },
    { label: "Length", value: yacht.length_meters ? yacht.length_meters + " m" : "" },
    { label: "Flag", value: yacht.flag ?? "" },
    { label: "Base", value: yacht.home_port ?? "" },
  ].filter((i) => i.value);

  return `
<div class="cover">
  ${photoHTML}
  <div class="cover-content">
    <div class="cover-line"></div>
    <div class="cover-meta-row">
      <div class="cover-doc-type">Vessel Proposal &nbsp;&middot;&nbsp; ${getTypeLabel(settings.proposal_type)}</div>
      <div class="cover-doc-date">${esc(getMonthYear())}</div>
    </div>
    <div class="cover-yacht-name">${esc(yacht.name)}</div>
    <div class="cover-specs-row">
      ${specs.map((i) => `<div><div class="csi-label">${esc(i.label)}</div><div class="csi-value">${esc(i.value)}</div></div>`).join("")}
    </div>
    <div class="cover-price-row">
      <div>
        <div class="cover-price-label">${getCoverPriceLabel(settings)}</div>
        <div class="cover-price">${esc(getCoverPrice(settings))}</div>
      </div>
      <div class="cover-brand">YachtWorth</div>
    </div>
  </div>
</div>`;
}

// ─── PAGE 2: SPECS + ACCOMMODATION + EQUIPMENT ───────────────────────────────

function buildSpecsPage(
  yacht: ProposalYachtSnapshot,
  equipment: ProposalEquipmentItem[],
): string {
  const eng = engineStr(yacht);

  const leftSpecs = [
    row("Builder", yacht.builder),
    row("Model", yacht.model),
    row("Year built", yacht.year_built),
    row("Type", yacht.yacht_type),
    row("LOA", yacht.length_meters ? yacht.length_meters.toFixed(2) + " m" : null),
    row("Beam", yacht.beam_meters ? yacht.beam_meters + " m" : null),
    row("Draft", yacht.draft_meters ? yacht.draft_meters + " m" : null),
    row("Hull material", yacht.hull_material),
    row("Hull type", yacht.hull_type),
  ].join("");

  const rightSpecs = [
    row("Engines", eng),
    row("Total power", yacht.total_hp ? yacht.total_hp + " HP" : null),
    row("Engine hours", yacht.engine_hours ? yacht.engine_hours + " hrs" : null),
    row("Max speed", yacht.max_speed_knots ? yacht.max_speed_knots + " knots" : null),
    row("Cruise speed", yacht.cruising_speed_knots ? yacht.cruising_speed_knots + " knots" : null),
    row("Range", yacht.range_nm ? yacht.range_nm + " nm" : null),
    row("Fuel capacity", yacht.fuel_capacity_l ? yacht.fuel_capacity_l.toLocaleString("en") + " L" : null),
    row("Flag", yacht.flag),
    row("Home base", yacht.home_port),
    row("IMO number", yacht.imo_number),
    accentRow("VAT status", yacht.vat_status),
  ].join("");

  const accomParts = [
    yacht.berths ? yacht.berths + " guests" : null,
    yacht.cabins ? yacht.cabins + " cabins" : null,
    yacht.heads ? yacht.heads + " heads" : null,
    yacht.crew_cabins ? yacht.crew_cabins + " crew" : null,
  ].filter(Boolean);
  const accomSummary = accomParts.length ? accomParts.join(" &middot; ") : null;

  let equipHTML = "";
  if (equipment && equipment.length > 0) {
    const groups: Record<string, ProposalEquipmentItem[]> = {};
    for (const item of equipment) {
      if (!item.equipment_type) continue;
      const cat = item.category || "other";
      if (!groups[cat]) groups[cat] = [];
      groups[cat]!.push(item);
    }
    if (Object.keys(groups).length > 0) {
      const groupsHTML = Object.entries(groups)
        .map(([cat, items]) => {
          const catLabel = CAT_LABELS[cat] || cat.replace(/_/g, " ");
          const itemsHTML = items
            .map((item) => {
              const lbl = equipLabel(item);
              const hi = notable(item.equipment_type) ? " hi" : "";
              return `<span class="eq-item${hi}">${esc(lbl)}</span>`;
            })
            .join("");
          return `<div class="eq-group"><div class="eq-title">${catLabel}</div><div class="eq-items">${itemsHTML}</div></div>`;
        })
        .join("");

      equipHTML = `
        <div class="sec">
          <div class="sec-title">Equipment &amp; Systems</div>
          <div class="eq-wrap">${groupsHTML}</div>
        </div>`;
    }
  }

  return `
<div class="ipage">
  <div class="ih">
    <div class="ih-brand">YachtWorth</div>
    <div class="ih-right">
      <div class="ih-yacht">${esc(yacht.name.toUpperCase())}</div>
      <div class="ih-page">02</div>
    </div>
  </div>
  <div class="ib">
    <div class="sec">
      <div class="sec-title">Specifications</div>
      <div class="specs-two">
        <div>${leftSpecs}</div>
        <div>${rightSpecs}</div>
      </div>
    </div>
    ${
      accomSummary
        ? `
    <div class="sec">
      <div class="sec-title">Accommodation</div>
      <div class="cabin-row">
        <div><div class="cabin-type">Summary</div><div class="cabin-desc">${accomSummary}</div></div>
      </div>
    </div>`
        : ""
    }
    ${equipHTML}
  </div>
  <div class="ifooter">
    <div class="footer-disclaimer">All specifications believed correct. Buyer must verify independently prior to purchase.</div>
    <div><div class="footer-brand">YachtWorth</div><div class="footer-powered">Powered by PDYE Group</div></div>
  </div>
</div>`;
}

// ─── PAGE 3: PHOTOS ───────────────────────────────────────────────────────────

function buildPhotosPage(
  yacht: ProposalYachtSnapshot,
  photoUrls: string[],
  pageNum: string,
): string {
  const photos = photoUrls.slice(0, 4);
  if (photos.length === 0) return "";

  while (photos.length < 4) photos.push(photos[photos.length - 1]!);

  return `
<div class="ipage">
  <div class="ih">
    <div class="ih-brand">YachtWorth</div>
    <div class="ih-right">
      <div class="ih-yacht">${esc(yacht.name.toUpperCase())}</div>
      <div class="ih-page">${pageNum}</div>
    </div>
  </div>
  <div class="ib">
    <div class="sec">
      <div class="sec-title">Photography</div>
      <div class="photo-grid">
        ${photos.map((url) => `<img src="${esc(url)}" alt="">`).join("")}
      </div>
    </div>
  </div>
  <div class="ifooter">
    <div class="footer-disclaimer">Photos representative of vessel condition at time of documentation.</div>
    <div><div class="footer-brand">YachtWorth</div><div class="footer-powered">Powered by PDYE Group</div></div>
  </div>
</div>`;
}

// ─── PAGE 4: PRICING + CONTACT ────────────────────────────────────────────────

function buildPricingPage(
  yacht: ProposalYachtSnapshot,
  settings: ProposalSettings,
  pageNum: string,
): string {
  const showSale =
    settings.proposal_type === "sale" || settings.proposal_type === "both";
  const showCharter =
    settings.proposal_type === "charter" || settings.proposal_type === "both";

  const priceVal = settings.price_on_application
    ? "Price on application"
    : fmt(settings.sale_price_eur) || "Price on application";

  const charterVal = settings.charter_on_application
    ? "Price on application"
    : `${esc(fmt(settings.charter_high_eur_week) || "")} <span style="font-size:11pt;font-weight:300;color:#999;">/ week</span>`;

  const saleHTML = showSale
    ? `
    <div>
      <div class="price-main">
        <div class="price-main-label">For Sale</div>
        <div class="price-main-value">${esc(priceVal)}</div>
      </div>
      ${yacht.vat_status ? `<div class="price-row"><span class="pdl">VAT status</span><span class="pdv">${esc(yacht.vat_status)}</span></div>` : ""}
      ${settings.delivery ? `<div class="price-row"><span class="pdl">Delivery</span><span class="pdv">${esc(settings.delivery)}</span></div>` : ""}
      ${settings.sea_trial ? `<div class="price-row"><span class="pdl">Sea trial</span><span class="pdv">${esc(settings.sea_trial)}</span></div>` : ""}
      <div class="price-row"><span class="pdl">Survey</span><span class="pdv">Available on request</span></div>
    </div>`
    : "";

  const charterHTML = showCharter
    ? `
    <div>
      <div class="price-main">
        <div class="price-main-label">For Charter</div>
        <div class="price-main-value">${charterVal}</div>
      </div>
      ${settings.charter_low_eur_week ? `<div class="price-row"><span class="pdl">Low season</span><span class="pdv">${esc(fmt(settings.charter_low_eur_week) || "")} / week</span></div>` : ""}
      ${settings.charter_apa_pct ? `<div class="price-row"><span class="pdl">APA</span><span class="pdv">${esc(settings.charter_apa_pct)}% of base rate</span></div>` : ""}
      ${settings.charter_area ? `<div class="price-row"><span class="pdl">Charter area</span><span class="pdv">${esc(settings.charter_area)}</span></div>` : ""}
      ${settings.myba_contract ? `<div class="price-row"><span class="pdl">Contract</span><span class="pdv">MYBA standard</span></div>` : ""}
    </div>`
    : "";

  const notesHTML = settings.notes
    ? `
    <div class="notes">
      <div class="notes-label">Notes</div>
      <div class="notes-text">${esc(settings.notes)}</div>
    </div>`
    : "";

  const hasContact =
    settings.broker_name || settings.broker_email || settings.broker_phone;
  const contactHTML = hasContact
    ? `
    <div class="contact">
      <div>
        <div class="broker-name">${esc(settings.broker_name || "")}</div>
        ${settings.broker_company ? `<div class="broker-co">${esc(settings.broker_company)}</div>` : ""}
      </div>
      <div class="contact-right">
        ${settings.broker_email ? `<div class="contact-item"><span class="ci-label">Email</span>${esc(settings.broker_email)}</div>` : ""}
        ${settings.broker_phone ? `<div class="contact-item"><span class="ci-label">Phone</span>${esc(settings.broker_phone)}</div>` : ""}
        ${settings.broker_website ? `<div class="contact-item"><span class="ci-label">Web</span>${esc(settings.broker_website)}</div>` : ""}
      </div>
    </div>`
    : "";

  return `
<div class="ipage">
  <div class="ih">
    <div class="ih-brand">YachtWorth</div>
    <div class="ih-right">
      <div class="ih-yacht">${esc(yacht.name.toUpperCase())}</div>
      <div class="ih-page">${pageNum}</div>
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
</div>`;
}

// ─── PUBLIC API ───────────────────────────────────────────────────────────────

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

  const hasPhotos = photoUrls.length >= 1;
  const pricePage = hasPhotos ? "04" : "03";

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>${CSS}</style>
</head>
<body>
<div style="background:#e0e0e0;padding:20px 0;">
${buildCover(yacht, settings, photoUrls)}
${buildSpecsPage(yacht, equipment)}
${hasPhotos ? buildPhotosPage(yacht, photoUrls, "03") : ""}
${buildPricingPage(yacht, settings, pricePage)}
</div>
</body>
</html>`;
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
