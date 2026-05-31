import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import type {
  ProposalEquipmentItem,
  ProposalPdfInput,
  ProposalSettings,
  ProposalTemplate,
  ProposalType,
  ProposalYachtSnapshot,
} from "./proposalTypes";

// Shared proposal types now live in ./proposalTypes. Re-exported here so any
// existing `from "./proposalPdf"` type imports keep working unchanged.
export type {
  ProposalEquipmentItem,
  ProposalLanguage,
  ProposalPdfInput,
  ProposalSettings,
  ProposalTemplate,
  ProposalType,
  ProposalYachtSnapshot,
} from "./proposalTypes";

// ─── TEMPLATE THEMES ─────────────────────────────────────────────────────────

interface Theme {
  // cover
  coverBg: string;
  coverPhotoOverlay: string;
  // page bg
  pageBg: string;
  // text
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  // accents
  accent: string;       // gold / navy
  accentAlt: string;
  // lines
  lineStrong: string;
  lineLight: string;
  // header
  headerBorderWidth: string;
  // cover-specific
  coverNameColor: string;
  coverValueColor: string;
  coverLabelColor: string;
  coverPriceColor: string;
  coverLineBg: string;
  // classic split panel
  splitPanelBg?: string;
  splitPanelText?: string;
  splitPanelLabel?: string;
}

const THEMES: Record<ProposalTemplate, Theme> = {
  minimal: {
    coverBg: "#ffffff",
    coverPhotoOverlay: "none",
    pageBg: "#ffffff",
    textPrimary: "#1a1a1a",
    textSecondary: "#444444",
    textMuted: "#888888",
    accent: "#C5973A",
    accentAlt: "#1a1a1a",
    lineStrong: "#1a1a1a",
    lineLight: "#eeeeee",
    headerBorderWidth: "1px",
    coverNameColor: "#1a1a1a",
    coverValueColor: "#1a1a1a",
    coverLabelColor: "#888888",
    coverPriceColor: "#1a1a1a",
    coverLineBg: "#dddddd",
  },
  dark: {
    coverBg: "#0D0D0D",
    coverPhotoOverlay: "linear-gradient(to bottom, transparent 40%, #0D0D0D 100%)",
    pageBg: "#0D0D0D",
    textPrimary: "#E8E0D0",
    textSecondary: "#999999",
    textMuted: "#555555",
    accent: "#C5973A",
    accentAlt: "#C5973A",
    lineStrong: "#2a2a2a",
    lineLight: "#1e1e1e",
    headerBorderWidth: "1px",
    coverNameColor: "#E8E0D0",
    coverValueColor: "#E8E0D0",
    coverLabelColor: "#555555",
    coverPriceColor: "#C5973A",
    coverLineBg: "#2a2a2a",
  },
  classic: {
    coverBg: "#ffffff",
    coverPhotoOverlay: "none",
    pageBg: "#ffffff",
    textPrimary: "#1a1a1a",
    textSecondary: "#444444",
    textMuted: "#888888",
    accent: "#1B3A6B",
    accentAlt: "#1B3A6B",
    lineStrong: "#1B3A6B",
    lineLight: "#EEF0F4",
    headerBorderWidth: "2px",
    coverNameColor: "#ffffff",
    coverValueColor: "#ffffff",
    coverLabelColor: "#4A6A9A",
    coverPriceColor: "#ffffff",
    coverLineBg: "#2E5491",
    splitPanelBg: "#1B3A6B",
    splitPanelText: "#ffffff",
    splitPanelLabel: "#4A6A9A",
  },
};

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function esc(s: string | number): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function fmt(n: number | null | undefined): string | null {
  if (n == null || !isFinite(n) || n === 0) return null;
  return "€\u2009" + Number(n).toLocaleString("en-GB", { maximumFractionDigits: 0 });
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

function engineStr(y: ProposalYachtSnapshot): string | null {
  if (!y.engine_maker) return null;
  const c = y.engine_count && y.engine_count > 0 ? `${y.engine_count} × ` : "";
  const m = y.engine_model ? ` ${y.engine_model}` : "";
  const hp = y.total_hp ? ` (${y.total_hp} HP)` : "";
  return `${c}${y.engine_maker}${m}${hp}`;
}

function specRow(label: string, value: string | number | null | undefined, t: Theme): string {
  if (value == null || value === "" || value === 0) return "";
  return `
    <div class="spec-row">
      <span class="spec-label">${esc(label)}</span>
      <span class="spec-value">${esc(value)}</span>
    </div>`;
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

function equipLabel(item: ProposalEquipmentItem): string {
  let s = "";
  if (item.quantity && item.quantity > 1) s += `${item.quantity} × `;
  if (item.brand) s += `${item.brand} `;
  if (item.model) s += `${item.model} `;
  s += (item.equipment_type || "").replace(/_/g, " ");
  if (item.power_kw) s += ` (${item.power_kw} kW)`;
  if (item.capacity_liters) s += ` (${item.capacity_liters} L/hr)`;
  if (item.hours) s += ` — ${item.hours} hrs`;
  return s.trim();
}

function photoArray(yacht: ProposalYachtSnapshot): string[] {
  const raw =
    yacht.photo_urls && yacht.photo_urls.length > 0
      ? yacht.photo_urls
      : yacht.cover_photo_url
      ? [yacht.cover_photo_url]
      : yacht.photo_url
      ? [yacht.photo_url]
      : [];
  return raw.filter(
    (u): u is string =>
      typeof u === "string" && u.trim().length > 0 && /^https?:\/\//i.test(u)
  );
}

// ─── CSS FACTORY ──────────────────────────────────────────────────────────────

function buildCss(t: Theme, template: ProposalTemplate): string {
  return `
* { margin:0; padding:0; box-sizing:border-box; }
@page { size: A4; margin: 0; }
@media print {
  .cover, .ipage { margin:0 !important; box-shadow:none !important; page-break-inside: avoid; }
}
body {
  font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
  background: ${t.pageBg};
  color: ${t.textPrimary};
  font-size: 9.5pt;
  line-height: 1.5;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}

/* ── COVER ── */
.cover {
  width: 210mm;
  min-height: 297mm;
  background: ${t.coverBg};
  page-break-after: always;
  position: relative;
  overflow: hidden;
}

/* Minimal & Dark: full-width photo top */
.cover-photo-wrap {
  width: 100%;
  height: 175mm;
  position: relative;
  overflow: hidden;
}
.cover-photo-wrap img {
  width: 100%; height: 100%; object-fit: cover; display: block;
}
.cover-photo-overlay {
  position: absolute; inset: 0;
  background: ${t.coverPhotoOverlay};
}
.cover-photo-placeholder {
  width: 100%; height: 175mm;
  background: #e8e4de;
  display: flex; align-items: center; justify-content: center;
  font-size: 7pt; color: #bbb; letter-spacing: 3px; text-transform: uppercase;
}

/* Classic: split cover */
.cover-split {
  display: flex;
  min-height: 297mm;
}
.cover-split-left {
  width: 42%;
  background: ${t.splitPanelBg ?? "#1B3A6B"};
  padding: 20mm 10mm 12mm 12mm;
  display: flex;
  flex-direction: column;
  gap: 0;
}
.cover-split-right {
  flex: 1;
  position: relative;
  overflow: hidden;
}
.cover-split-right img {
  width: 100%; height: 100%; object-fit: cover; display: block;
}
.cover-split-right-placeholder {
  width: 100%; height: 100%;
  background: linear-gradient(180deg, #7aaace 0%, #5a8fbe 40%, #1B3A6B 100%);
}
.split-logo {
  font-size: 6.5pt; letter-spacing: 3px; color: ${t.splitPanelLabel ?? "#4A6A9A"};
  text-transform: uppercase; margin-bottom: 8mm;
}
.split-type {
  font-size: 5pt; letter-spacing: 2px; color: ${t.splitPanelLabel ?? "#4A6A9A"};
  text-transform: uppercase; margin-bottom: 2mm;
}
.split-name {
  font-size: 26pt; font-weight: 300; color: ${t.coverNameColor};
  line-height: 1.05; margin-bottom: 8mm;
}
.split-divider {
  height: 1px; background: ${t.coverLineBg}; margin-bottom: 7mm;
}
.split-spec-label {
  font-size: 5pt; letter-spacing: 2px; color: ${t.splitPanelLabel ?? "#4A6A9A"};
  text-transform: uppercase; margin-bottom: 2mm;
}
.split-spec-value {
  font-size: 8pt; font-weight: 600; color: ${t.coverValueColor};
  margin-bottom: 6mm;
}
.split-price-label {
  font-size: 5pt; letter-spacing: 2px; color: ${t.splitPanelLabel ?? "#4A6A9A"};
  text-transform: uppercase; margin-bottom: 2mm;
}
.split-price-value {
  font-size: 20pt; font-weight: 300; color: ${t.coverPriceColor};
  line-height: 1; margin-bottom: 6mm;
}
.split-charter-label {
  font-size: 5pt; letter-spacing: 2px; color: ${t.splitPanelLabel ?? "#4A6A9A"};
  text-transform: uppercase; margin-bottom: 2mm;
}
.split-charter-value {
  font-size: 9pt; font-weight: 600; color: ${t.coverValueColor};
}
.split-footer {
  margin-top: auto;
  font-size: 5pt; letter-spacing: 2px;
  color: ${t.splitPanelLabel ?? "#4A6A9A"};
  text-transform: uppercase;
}

/* Minimal/Dark cover content below photo */
.cover-content { padding: 0 14mm 12mm; }
.cover-meta-row {
  display: flex; justify-content: space-between;
  padding: 5mm 0 4mm;
}
.cover-doc-type {
  font-size: 6.5pt; letter-spacing: 2px; color: ${t.coverLabelColor};
  text-transform: uppercase;
}
.cover-doc-date {
  font-size: 6.5pt; letter-spacing: 1px; color: ${t.coverLabelColor};
  text-transform: uppercase;
}
.cover-name {
  font-size: 36pt; font-weight: 200; color: ${t.coverNameColor};
  letter-spacing: -1px; line-height: 1; margin-bottom: 5mm;
}
.cover-specs-row {
  display: flex; gap: 0; margin-bottom: 5mm;
}
.cover-spec-item {
  flex: 1;
}
.csi-label {
  font-size: 5.5pt; letter-spacing: 2px; color: ${t.coverLabelColor};
  text-transform: uppercase; margin-bottom: 2px;
}
.csi-value {
  font-size: 8.5pt; font-weight: 500; color: ${t.coverValueColor};
}
.cover-divider {
  height: 1px; background: ${t.coverLineBg}; margin-bottom: 5mm;
}
.cover-price-label {
  font-size: 5.5pt; letter-spacing: 2px; color: ${t.coverLabelColor};
  text-transform: uppercase; margin-bottom: 3px;
}
.cover-price-row {
  display: flex; justify-content: space-between; align-items: flex-end;
}
.cover-price {
  font-size: 28pt; font-weight: 200; color: ${t.coverPriceColor};
  letter-spacing: -1px; line-height: 1;
}
.cover-brand {
  font-size: 6.5pt; letter-spacing: 3px; color: ${t.accent};
  text-transform: uppercase;
}

/* ── INNER PAGES ── */
.ipage {
  width: 210mm;
  min-height: 297mm;
  background: ${t.pageBg};
  page-break-before: always;
  display: flex;
  flex-direction: column;
}
.ih {
  padding: 10mm 14mm 5mm;
  display: flex; justify-content: space-between; align-items: flex-end;
  border-bottom: ${t.headerBorderWidth} solid ${t.lineStrong};
  flex-shrink: 0;
}
.ih-brand {
  font-size: 6.5pt; letter-spacing: 3px; color: ${t.accent};
  text-transform: uppercase; font-weight: 600;
}
.ih-right { display: flex; gap: 16px; align-items: center; }
.ih-yacht {
  font-size: 6.5pt; letter-spacing: 1.5px; color: ${t.textMuted};
  text-transform: uppercase;
}
.ih-page { font-size: 6.5pt; color: ${t.textMuted}; }
.ib { padding: 7mm 14mm 0; flex: 1; }

/* ── SECTIONS ── */
.sec { margin-bottom: 7mm; }
.sec-title {
  font-size: 6pt; font-weight: 600; letter-spacing: 3px;
  color: ${t.textMuted}; text-transform: uppercase; margin-bottom: 4mm;
}

/* ── SPECS ── */
.specs-two {
  display: grid; grid-template-columns: 1fr 1fr; gap: 0 7mm;
}
.spec-row {
  display: flex; justify-content: space-between; align-items: baseline;
  padding: 3.5px 0;
}
.spec-label { font-size: 8pt; color: ${t.textMuted}; }
.spec-value { font-size: 8.5pt; font-weight: 500; color: ${t.textPrimary}; }

/* ── ACCOMMODATION ── */
.accom-two {
  display: grid; grid-template-columns: 1fr 1fr; gap: 0 7mm;
}
.cabin-block { padding: 3mm 0; }
.cabin-name {
  font-size: 8.5pt; font-weight: 600; color: ${t.textPrimary};
  margin-bottom: 2px;
}
.cabin-desc { font-size: 8pt; color: ${t.textSecondary}; margin-bottom: 1px; }
.cabin-loc { font-size: 7.5pt; color: ${t.textMuted}; }

/* ── EQUIPMENT ── */
.eq-two {
  display: grid; grid-template-columns: 1fr 1fr; gap: 0 7mm;
}
.eq-group { margin-bottom: 4mm; break-inside: avoid; }
.eq-title {
  font-size: 6pt; letter-spacing: 2px; color: ${t.textMuted};
  text-transform: uppercase; font-weight: 600; margin-bottom: 2mm;
}
.eq-item {
  font-size: 8pt; color: ${t.textSecondary};
  padding: 1.5px 0 1.5px 10px; position: relative;
}
.eq-item::before {
  content: '—'; position: absolute; left: 0;
  color: ${t.textMuted}; font-size: 7pt;
}

/* ── PHOTOS ── */
.photo-grid {
  display: grid; grid-template-columns: 1fr 1fr; gap: 2.5mm;
}
.photo-grid img {
  width: 100%; height: 62mm; object-fit: cover; display: block;
}
.photo-placeholder {
  width: 100%; height: 62mm;
  background: ${template === "dark" ? "#1e1e1e" : "#f0ede8"};
  display: flex; align-items: center; justify-content: center;
  font-size: 6pt; color: ${t.textMuted}; letter-spacing: 2px;
}

/* ── PRICING ── */
.pricing-two {
  display: grid; grid-template-columns: 1fr 1fr; gap: 7mm;
}
.price-block {}
.price-label {
  font-size: 5.5pt; letter-spacing: 2px; color: ${t.textMuted};
  text-transform: uppercase; margin-bottom: 2mm;
}
.price-main {
  font-size: 22pt; font-weight: 200; color: ${t.coverPriceColor};
  letter-spacing: -0.5px; line-height: 1; margin-bottom: 4mm;
}
.price-row {
  display: flex; justify-content: space-between;
  padding: 4px 0;
  font-size: 8pt;
}
.pdl { color: ${t.textMuted}; }
.pdv { color: ${t.textPrimary}; font-weight: 500; }

/* ── NOTES ── */
.notes { margin-top: 5mm; padding-top: 5mm; border-top: 1px solid ${t.lineLight}; }
.notes-text { font-size: 8.5pt; color: ${t.textSecondary}; line-height: 1.7; }

/* ── CONTACT ── */
.contact {
  margin-top: 5mm; padding-top: 5mm;
  border-top: 1px solid ${t.lineStrong};
  display: flex; justify-content: space-between; align-items: flex-end;
}
.broker-name { font-size: 12pt; font-weight: 300; color: ${t.textPrimary}; margin-bottom: 1mm; }
.broker-co { font-size: 8pt; color: ${t.textMuted}; }
.contact-right { text-align: right; }
.ci-label {
  font-size: 5.5pt; letter-spacing: 2px; color: ${t.textMuted};
  text-transform: uppercase; display: block; margin-bottom: 1px;
}
.ci-value { font-size: 8.5pt; color: ${t.textSecondary}; margin-bottom: 3px; }

/* ── FOOTER ── */
.ifooter {
  display: flex; justify-content: space-between; align-items: flex-end;
  border-top: 1px solid ${t.lineLight};
  padding: 4mm 14mm 10mm;
  margin-top: 7mm; flex-shrink: 0;
}
.footer-disclaimer { font-size: 5.5pt; color: ${t.textMuted}; max-width: 60%; line-height: 1.5; }
.footer-brand { font-size: 6pt; letter-spacing: 2px; color: ${t.accent}; text-transform: uppercase; text-align: right; }
.footer-powered { font-size: 5pt; color: ${t.textMuted}; text-align: right; margin-top: 1px; }
  `;
}

// ─── COVER BUILDERS ───────────────────────────────────────────────────────────

function coverMinimalDark(
  yacht: ProposalYachtSnapshot,
  settings: ProposalSettings,
  photos: string[],
  t: Theme
): string {
  const photoHtml = photos.length > 0
    ? `<img src="${esc(photos[0]!)}" alt="${esc(yacht.name)}">`
    : `<div style="width:100%;height:175mm;background:${t.pageBg === "#0D0D0D" ? "#0e2235" : "#e8e4de"};"></div>`;

  const specs = [
    { label: "Builder", value: yacht.builder },
    { label: "Year",    value: yacht.year_built },
    { label: "Length",  value: yacht.length_meters ? `${yacht.length_meters} m` : null },
    { label: "Flag",    value: yacht.flag },
    { label: "Base",    value: yacht.home_port },
  ].filter(i => i.value);

  return `
<div class="cover">
  <div class="cover-photo-wrap">
    ${photoHtml}
    <div class="cover-photo-overlay"></div>
  </div>
  <div class="cover-content">
    <div class="cover-meta-row">
      <div class="cover-doc-type">Vessel Proposal &middot; ${getTypeLabel(settings.proposal_type)}</div>
      <div class="cover-doc-date">${getMonthYear()}</div>
    </div>
    <div class="cover-name">${esc(yacht.name)}</div>
    <div class="cover-specs-row">
      ${specs.map(i => `
        <div class="cover-spec-item">
          <div class="csi-label">${esc(i.label)}</div>
          <div class="csi-value">${esc(i.value!)}</div>
        </div>`).join("")}
    </div>
    <div class="cover-divider"></div>
    <div class="cover-price-label">
      ${settings.proposal_type === "charter" ? "Charter from" : "Asking Price"}
    </div>
    <div class="cover-price-row">
      <div class="cover-price">${esc(getCoverPrice(settings))}</div>
      <div class="cover-brand">YachtWorth</div>
    </div>
  </div>
</div>`;
}

function coverClassic(
  yacht: ProposalYachtSnapshot,
  settings: ProposalSettings,
  photos: string[],
  t: Theme
): string {
  const rightHtml = photos.length > 0
    ? `<img src="${esc(photos[0]!)}" alt="${esc(yacht.name)}">`
    : `<div class="cover-split-right-placeholder"></div>`;

  const specs = [
    { label: "Builder", value: yacht.builder },
    { label: "Year",    value: yacht.year_built },
    { label: "Length",  value: yacht.length_meters ? `${yacht.length_meters} m` : null },
    { label: "Flag",    value: yacht.flag },
    { label: "Base",    value: yacht.home_port },
  ].filter(i => i.value);

  const showCharter =
    (settings.proposal_type === "charter" || settings.proposal_type === "both") &&
    !settings.charter_on_application &&
    settings.charter_high_eur_week;

  return `
<div class="cover">
  <div class="cover-split">
    <div class="cover-split-left">
      <div class="split-logo">YachtWorth</div>
      <div class="split-type">Vessel Proposal &middot; ${getTypeLabel(settings.proposal_type)}</div>
      <div class="split-name">${esc(yacht.name)}</div>
      <div class="split-divider"></div>
      ${specs.map(i => `
        <div class="split-spec-label">${esc(i.label)}</div>
        <div class="split-spec-value">${esc(i.value!)}</div>
      `).join("")}
      <div class="split-divider"></div>
      <div class="split-price-label">Asking Price</div>
      <div class="split-price-value">${esc(getCoverPrice(settings))}</div>
      ${showCharter ? `
        <div class="split-divider"></div>
        <div class="split-charter-label">Charter from</div>
        <div class="split-charter-value">${esc(fmt(settings.charter_high_eur_week) || "")} / week</div>
      ` : ""}
      <div class="split-footer">${getMonthYear()}</div>
    </div>
    <div class="cover-split-right">${rightHtml}</div>
  </div>
</div>`;
}

// ─── INNER PAGE BUILDERS ──────────────────────────────────────────────────────

function buildHeader(yacht: ProposalYachtSnapshot, pageNum: string, t: Theme): string {
  return `
<div class="ih">
  <div class="ih-brand">YachtWorth</div>
  <div class="ih-right">
    <div class="ih-yacht">${esc(yacht.name.toUpperCase())}</div>
    <div class="ih-page">${pageNum}</div>
  </div>
</div>`;
}

function buildFooter(disclaimer: string, t: Theme): string {
  return `
<div class="ifooter">
  <div class="footer-disclaimer">${disclaimer}</div>
  <div>
    <div class="footer-brand">YachtWorth</div>
    <div class="footer-powered">Powered by PDYE Group</div>
  </div>
</div>`;
}

function buildSpecsPage(
  yacht: ProposalYachtSnapshot,
  equipment: ProposalEquipmentItem[],
  pageNum: string,
  t: Theme
): string {
  const eng = engineStr(yacht);

  // Specs: split into two equal halves
  const allSpecs: [string, string | number | null | undefined][] = [
    ["Builder",       yacht.builder],
    ["Model",         yacht.model],
    ["Year built",    yacht.year_built],
    ["Type",          yacht.yacht_type],
    ["LOA",           yacht.length_meters ? `${yacht.length_meters} m` : null],
    ["Beam",          yacht.beam_meters   ? `${yacht.beam_meters} m`   : null],
    ["Draft",         yacht.draft_meters  ? `${yacht.draft_meters} m`  : null],
    ["Hull material", yacht.hull_material],
    ["Hull type",     yacht.hull_type],
    ["Engines",       eng],
    ["Total power",   yacht.total_hp    ? `${yacht.total_hp} HP`         : null],
    ["Engine hours",  yacht.engine_hours ? `${yacht.engine_hours} hrs`   : null],
    ["Max speed",     yacht.max_speed_knots      ? `${yacht.max_speed_knots} kn`      : null],
    ["Cruise speed",  yacht.cruising_speed_knots ? `${yacht.cruising_speed_knots} kn` : null],
    ["Range",         yacht.range_nm        ? `${yacht.range_nm} nm`       : null],
    ["Fuel capacity", yacht.fuel_capacity_l ? `${yacht.fuel_capacity_l.toLocaleString()} L` : null],
    ["Flag",          yacht.flag],
    ["VAT status",    yacht.vat_status],
  ].filter(([, v]) => v != null && v !== "" && v !== 0) as [string, string | number][];

  const mid = Math.ceil(allSpecs.length / 2);
  const leftSpecs  = allSpecs.slice(0, mid).map(([l, v]) => specRow(l, v, t)).join("");
  const rightSpecs = allSpecs.slice(mid).map(([l, v])  => specRow(l, v, t)).join("");

  // Accommodation: one cabin per column
  const cabinCount = yacht.cabins ?? 0;
  const guestCount = yacht.guests ?? yacht.berths ?? 0;
  const headsCount = yacht.heads ?? 0;
  const crewCount  = yacht.crew_cabins ?? 0;
  const accomSummary = [
    guestCount ? `${guestCount} guests` : null,
    cabinCount ? `${cabinCount} cabins` : null,
    headsCount ? `${headsCount} heads`  : null,
    crewCount  ? `${crewCount} crew`    : null,
  ].filter(Boolean).join(" · ");

  // Equipment: group by category, split into two columns
  const groups: Record<string, ProposalEquipmentItem[]> = {};
  for (const item of equipment) {
    if (!item.equipment_type) continue;
    const cat = item.category || "other";
    if (!groups[cat]) groups[cat] = [];
    groups[cat]!.push(item);
  }
  const groupEntries = Object.entries(groups);
  const eqMid = Math.ceil(groupEntries.length / 2);
  const eqLeft  = groupEntries.slice(0, eqMid);
  const eqRight = groupEntries.slice(eqMid);

  function renderEqGroups(entries: [string, ProposalEquipmentItem[]][]): string {
    return entries.map(([cat, items]) => {
      const catLabel = CAT_LABELS[cat] || cat.replace(/_/g, " ");
      const itemsHtml = items.map(item =>
        `<div class="eq-item">${esc(equipLabel(item))}</div>`
      ).join("");
      return `
        <div class="eq-group">
          <div class="eq-title">${catLabel}</div>
          ${itemsHtml}
        </div>`;
    }).join("");
  }

  return `
<div class="ipage">
  ${buildHeader(yacht, pageNum, t)}
  <div class="ib">
    <div class="sec">
      <div class="sec-title">Specifications</div>
      <div class="specs-two">
        <div>${leftSpecs}</div>
        <div>${rightSpecs}</div>
      </div>
    </div>
    ${accomSummary ? `
    <div class="sec">
      <div class="sec-title">Accommodation</div>
      <div style="font-size:8.5pt;color:${t.textSecondary};">${accomSummary}</div>
    </div>` : ""}
    ${groupEntries.length > 0 ? `
    <div class="sec">
      <div class="sec-title">Equipment &amp; Systems</div>
      <div class="eq-two">
        <div>${renderEqGroups(eqLeft)}</div>
        <div>${renderEqGroups(eqRight)}</div>
      </div>
    </div>` : ""}
  </div>
  ${buildFooter("All specifications believed correct. Buyer must verify independently prior to purchase.", t)}
</div>`;
}

function buildPhotosPage(
  yacht: ProposalYachtSnapshot,
  photos: string[],
  pageLabel: string,
  pageNum: string,
  t: Theme
): string {
  // Up to 6 per page in 2×3 grid
  const cells = photos.slice(0, 6);
  // Pad to even number so grid looks clean
  if (cells.length % 2 !== 0) cells.push("");

  const cellsHtml = cells.map(url =>
    url
      ? `<img src="${esc(url)}" alt="">`
      : `<div class="photo-placeholder">No photo</div>`
  ).join("");

  return `
<div class="ipage">
  ${buildHeader(yacht, pageNum, t)}
  <div class="ib">
    <div class="sec">
      <div class="sec-title">${esc(pageLabel)}</div>
      <div class="photo-grid">${cellsHtml}</div>
    </div>
  </div>
  ${buildFooter("Photos representative of vessel condition at time of documentation.", t)}
</div>`;
}

function buildPricingPage(
  yacht: ProposalYachtSnapshot,
  settings: ProposalSettings,
  pageNum: string,
  t: Theme
): string {
  const showSale    = settings.proposal_type === "sale"    || settings.proposal_type === "both";
  const showCharter = settings.proposal_type === "charter" || settings.proposal_type === "both";

  const salePrice = settings.price_on_application
    ? "Price on application"
    : fmt(settings.sale_price_eur) || "Price on application";

  const charterPrice = settings.charter_on_application
    ? "Price on application"
    : fmt(settings.charter_high_eur_week)
      ? `${fmt(settings.charter_high_eur_week)} / week`
      : "Price on application";

  const saleHtml = showSale ? `
    <div class="price-block">
      <div class="price-label">For Sale</div>
      <div class="price-main">${esc(salePrice)}</div>
      ${yacht.vat_status ? `<div class="price-row"><span class="pdl">VAT status</span><span class="pdv">${esc(yacht.vat_status)}</span></div>` : ""}
      ${settings.delivery  ? `<div class="price-row"><span class="pdl">Delivery</span><span class="pdv">${esc(settings.delivery)}</span></div>` : ""}
      ${settings.sea_trial ? `<div class="price-row"><span class="pdl">Sea trial</span><span class="pdv">${esc(settings.sea_trial)}</span></div>` : ""}
      <div class="price-row"><span class="pdl">Survey</span><span class="pdv">Available on request</span></div>
    </div>` : "";

  const charterHtml = showCharter ? `
    <div class="price-block">
      <div class="price-label">For Charter</div>
      <div class="price-main">${esc(charterPrice)}</div>
      ${settings.charter_low_eur_week ? `<div class="price-row"><span class="pdl">Low season</span><span class="pdv">${esc(fmt(settings.charter_low_eur_week) || "")} / week</span></div>` : ""}
      ${settings.charter_apa_pct      ? `<div class="price-row"><span class="pdl">APA</span><span class="pdv">${esc(settings.charter_apa_pct)}% of base rate</span></div>` : ""}
      ${settings.charter_area         ? `<div class="price-row"><span class="pdl">Charter area</span><span class="pdv">${esc(settings.charter_area)}</span></div>` : ""}
      ${settings.myba_contract        ? `<div class="price-row"><span class="pdl">Contract</span><span class="pdv">MYBA standard</span></div>` : ""}
    </div>` : "";

  const notesHtml = settings.notes ? `
    <div class="notes">
      <div class="notes-text">${esc(settings.notes)}</div>
    </div>` : "";

  const hasContact = settings.broker_name || settings.broker_email || settings.broker_phone;
  const contactHtml = hasContact ? `
    <div class="contact">
      <div>
        <div class="broker-name">${esc(settings.broker_name || "")}</div>
        ${settings.broker_company ? `<div class="broker-co">${esc(settings.broker_company)}</div>` : ""}
      </div>
      <div class="contact-right">
        ${settings.broker_email   ? `<div class="ci-value"><span class="ci-label">Email</span>${esc(settings.broker_email)}</div>`   : ""}
        ${settings.broker_phone   ? `<div class="ci-value"><span class="ci-label">Phone</span>${esc(settings.broker_phone)}</div>`   : ""}
        ${settings.broker_website ? `<div class="ci-value"><span class="ci-label">Web</span>${esc(settings.broker_website)}</div>`   : ""}
      </div>
    </div>` : "";

  return `
<div class="ipage">
  ${buildHeader(yacht, pageNum, t)}
  <div class="ib">
    <div class="sec">
      <div class="sec-title">Pricing</div>
      <div class="pricing-two">
        ${saleHtml}
        ${charterHtml}
      </div>
    </div>
    ${notesHtml}
    ${contactHtml}
  </div>
  ${buildFooter("All details believed correct but not guaranteed. Subject to prior sale or withdrawal without notice. Not a binding offer.", t)}
</div>`;
}

// ─── MAIN HTML BUILDER ────────────────────────────────────────────────────────

export function buildProposalPdfHtml(input: ProposalPdfInput): string {
  const { yacht, equipment, settings } = input;
  const template = settings.template ?? "minimal";
  const t = THEMES[template];

  const photos = photoArray(yacht);

  // Cover
  const coverHtml = template === "classic"
    ? coverClassic(yacht, settings, photos, t)
    : coverMinimalDark(yacht, settings, photos, t);

  // Photo pages: max 6 per page, dynamic count
  const PER_PAGE = 6;
  const photoPages: string[] = [];
  const totalPhotoPages = photos.length > 0 ? Math.ceil(photos.length / PER_PAGE) : 0;
  for (let i = 0; i < totalPhotoPages; i++) {
    const chunk = photos.slice(i * PER_PAGE, (i + 1) * PER_PAGE);
    const label = totalPhotoPages > 1
      ? `Photography  ${i + 1} / ${totalPhotoPages}`
      : "Photography";
    const pageNum = String(3 + i).padStart(2, "0");
    photoPages.push(buildPhotosPage(yacht, chunk, label, pageNum, t));
  }

  const pricingPageNum = String(3 + totalPhotoPages).padStart(2, "0");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>${buildCss(t, template)}</style>
</head>
<body>
${coverHtml}
${buildSpecsPage(yacht, equipment, "02", t)}
${photoPages.join("\n")}
${buildPricingPage(yacht, settings, pricingPageNum, t)}
</body>
</html>`;
}

// ─── EXPORT ───────────────────────────────────────────────────────────────────

export async function exportProposalPdf(input: ProposalPdfInput): Promise<void> {
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
