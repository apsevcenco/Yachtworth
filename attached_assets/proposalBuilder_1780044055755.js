// proposalBuilder.js
// Copy this entire file into your project as-is.
// Usage: import { buildProposalHTML, generateProposalPDF } from './proposalBuilder';

import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

// ─── HELPERS ───────────────────────────────────────────────────────────────

function fmt(n) {
  if (!n && n !== 0) return null;
  return '\u20AC\u2009' + Number(n).toLocaleString('en-GB', { maximumFractionDigits: 0 });
}

function row(label, value) {
  if (!value && value !== 0) return '';
  if (value === 0) return '';
  return `<div class="spec-row"><span class="spec-label">${label}</span><span class="spec-value">${value}</span></div>`;
}

function accentRow(label, value) {
  if (!value) return '';
  return `<div class="spec-row"><span class="spec-label">${label}</span><span class="spec-value accent">${value}</span></div>`;
}

function getMonthYear() {
  return new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
}

function getTypeLabel(proposalType) {
  if (proposalType === 'sale')    return 'For Sale';
  if (proposalType === 'charter') return 'For Charter';
  return 'For Sale &amp; Charter';
}

function getCoverPrice(settings) {
  if (settings.proposalType === 'charter') {
    return settings.charterOnApplication
      ? 'Price on application'
      : (fmt(settings.charterRateHigh) || 'Price on application') + ' / week';
  }
  if (settings.priceOnApplication) return 'Price on application';
  return fmt(settings.askingPrice) || 'Price on application';
}

function getCoverPriceLabel(settings) {
  if (settings.proposalType === 'charter') return 'Charter from';
  return 'Asking Price';
}

function getEngineStr(yacht) {
  if (!yacht.engine_maker) return null;
  const count = yacht.engine_count ? yacht.engine_count + ' \u00D7 ' : '';
  const model  = yacht.engine_model ? ' ' + yacht.engine_model : '';
  return count + yacht.engine_maker + model;
}

const NOTABLE_TYPES = [
  'generator','stabilizer','starlink','watermaker',
  'tender','jetski','gyro','vsat','air_conditioning_central'
];

function isNotable(type) {
  return NOTABLE_TYPES.some(n => (type || '').toLowerCase().includes(n));
}

function formatEquipLabel(item) {
  let s = '';
  if (item.quantity > 1) s += item.quantity + ' \u00D7 ';
  if (item.brand)  s += item.brand + ' ';
  if (item.model)  s += item.model + ' ';
  s += (item.equipment_type || '').replace(/_/g, ' ');
  if (item.power_kw)        s += ' (' + item.power_kw + ' kW)';
  if (item.capacity_liters) s += ' (' + item.capacity_liters + ' L/hr)';
  if (item.hours)           s += ' \u2014 ' + item.hours + ' hrs';
  return s.trim();
}

const CATEGORY_LABELS = {
  power_electrical:   'Power &amp; Electrical',
  navigation:         'Navigation &amp; Communication',
  water_systems:      'Water Systems',
  comfort_climate:    'Comfort &amp; Climate',
  safety:             'Safety',
  water_toys_tenders: 'Tenders &amp; Water Toys',
  deck_anchoring:     'Deck &amp; Anchoring',
  sailing:            'Sailing Equipment',
};

// ─── CSS ────────────────────────────────────────────────────────────────────

const CSS = `
* { margin:0; padding:0; box-sizing:border-box; }
@page { size: A4; margin: 0; }
@media print {
  body > div { background: none !important; padding: 0 !important; }
  .cover, .ipage { margin: 0 !important; box-shadow: none !important; }
}
body {
  font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
  background: #ffffff;
  color: #1a1a1a;
  font-size: 9.5pt;
  line-height: 1.6;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}
.cover {
  width: 210mm;
  background: #ffffff;
  page-break-after: always;
  margin: 0 auto 20px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.15);
}
.cover-photo {
  width: 100%; height: 170mm; object-fit: cover; display: block;
}
.cover-photo-placeholder {
  width: 100%; height: 170mm; background: #f0ede8;
  display: flex; align-items: center; justify-content: center;
  font-size: 8pt; color: #ccc; letter-spacing: 3px; text-transform: uppercase;
}
.cover-content { padding: 0 48px 44px; background: #ffffff; }
.cover-line { height: 1px; background: #1a1a1a; }
.cover-meta-row {
  display: flex; justify-content: space-between; align-items: flex-start;
  margin-bottom: 20px; padding-top: 16px;
}
.cover-doc-type { font-size: 7pt; letter-spacing: 3px; color: #999; text-transform: uppercase; }
.cover-doc-date { font-size: 7pt; letter-spacing: 1px; color: #999; text-transform: uppercase; }
.cover-yacht-name {
  font-size: 42pt; font-weight: 200; color: #1a1a1a;
  letter-spacing: -2px; line-height: 0.95; margin-bottom: 10px;
}
.cover-specs-row { display: flex; gap: 32px; margin-bottom: 18px; }
.csi-label { font-size: 6pt; letter-spacing: 2px; color: #999; text-transform: uppercase; margin-bottom: 3px; }
.csi-value { font-size: 9pt; font-weight: 500; color: #1a1a1a; }
.cover-price-row {
  display: flex; justify-content: space-between; align-items: flex-end;
  padding-top: 16px; border-top: 1px solid #e0e0e0;
}
.cover-price-label { font-size: 6pt; letter-spacing: 2px; color: #999; text-transform: uppercase; margin-bottom: 4px; }
.cover-price { font-size: 22pt; font-weight: 300; color: #1a1a1a; letter-spacing: -1px; }
.cover-brand { font-size: 7pt; letter-spacing: 3px; color: #C5973A; text-transform: uppercase; text-align: right; }
.ipage {
  width: 210mm; background: #ffffff;
  margin: 0 auto 20px; box-shadow: 0 2px 12px rgba(0,0,0,0.15);
}
.ih {
  padding: 22px 48px 14px; display: flex;
  justify-content: space-between; align-items: flex-end;
  border-bottom: 1px solid #1a1a1a;
}
.ih-brand { font-size: 6.5pt; letter-spacing: 3px; color: #C5973A; text-transform: uppercase; font-weight: 600; }
.ih-right { display: flex; gap: 24px; align-items: flex-end; }
.ih-yacht { font-size: 7pt; letter-spacing: 1.5px; color: #999; text-transform: uppercase; }
.ih-page { font-size: 7pt; color: #ccc; letter-spacing: 1px; }
.ib { padding: 20px 48px 44px; }
.sec { margin-bottom: 16px; }
.sec-title { font-size: 6.5pt; font-weight: 600; letter-spacing: 3px; color: #999; text-transform: uppercase; margin-bottom: 16px; }
.specs-two { display: grid; grid-template-columns: 1fr 1fr; gap: 0 32px; }
.spec-row { display: flex; justify-content: space-between; align-items: baseline; padding: 5px 0; border-bottom: 1px solid #f0f0f0; }
.spec-row:last-child { border-bottom: none; }
.spec-label { font-size: 8.5pt; color: #999; font-weight: 400; }
.spec-value { font-size: 9pt; font-weight: 500; color: #1a1a1a; }
.spec-value.accent { color: #C5973A; font-weight: 600; }
.cabin-row { padding: 7px 0; border-bottom: 1px solid #f0f0f0; display: flex; justify-content: space-between; align-items: flex-start; }
.cabin-row:last-child { border-bottom: none; }
.cabin-type { font-size: 6.5pt; letter-spacing: 2px; color: #C5973A; text-transform: uppercase; font-weight: 600; margin-bottom: 3px; }
.cabin-desc { font-size: 9pt; color: #1a1a1a; }
.cabin-detail { font-size: 8pt; color: #999; margin-top: 2px; }
.cabin-right { font-size: 8pt; color: #999; text-align: right; }
.eq-group { margin-bottom: 10px; }
.eq-title { font-size: 6.5pt; letter-spacing: 2px; color: #999; text-transform: uppercase; font-weight: 600; margin-bottom: 4px; }
.eq-items { display: flex; flex-direction: column; gap: 0; }
.eq-item { font-size: 8.5pt; color: #555; padding: 3px 0 3px 14px; border-bottom: 1px solid #f5f5f5; position: relative; }
.eq-item:last-child { border-bottom: none; }
.eq-item::before { content: '\u2014'; position: absolute; left: 0; color: #ddd; }
.eq-item.hi { color: #1a1a1a; font-weight: 600; }
.eq-item.hi::before { color: #C5973A; }
.photo-grid-2x2 { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.photo-grid-2x2 img { width: 100%; height: 62mm; object-fit: cover; display: block; }
.pricing-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
.price-main { margin-bottom: 10px; padding-bottom: 10px; border-bottom: 1px solid #e0e0e0; }
.price-main-label { font-size: 6.5pt; letter-spacing: 2px; color: #999; text-transform: uppercase; margin-bottom: 6px; }
.price-main-value { font-size: 22pt; font-weight: 200; color: #1a1a1a; letter-spacing: -1px; line-height: 1; }
.price-detail-row { display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid #f5f5f5; font-size: 8.5pt; }
.price-detail-row:last-child { border-bottom: none; }
.pdl { color: #999; }
.pdv { color: #1a1a1a; font-weight: 500; }
.notes { margin-top: 16px; padding-top: 14px; border-top: 1px solid #e0e0e0; }
.notes-label { font-size: 6.5pt; letter-spacing: 2px; color: #999; text-transform: uppercase; margin-bottom: 10px; }
.notes-text { font-size: 8.5pt; color: #555; line-height: 1.8; }
.contact { margin-top: 16px; padding-top: 14px; border-top: 1px solid #1a1a1a; display: flex; justify-content: space-between; align-items: flex-end; }
.broker-name { font-size: 14pt; font-weight: 300; color: #1a1a1a; letter-spacing: -0.5px; margin-bottom: 3px; }
.broker-co { font-size: 8pt; color: #999; letter-spacing: 1px; }
.contact-right { text-align: right; }
.contact-item { font-size: 8.5pt; color: #555; margin-bottom: 3px; }
.ci-label { font-size: 6pt; letter-spacing: 2px; color: #ccc; text-transform: uppercase; display: block; margin-bottom: 1px; }
.ifooter {
  display: flex; justify-content: space-between; align-items: flex-end;
  border-top: 1px solid #f0f0f0; padding-top: 10px;
  margin: 24px 48px 28px;
}
.footer-disclaimer { font-size: 6pt; color: #ccc; max-width: 60%; line-height: 1.5; }
.footer-brand { font-size: 6.5pt; letter-spacing: 2px; color: #C5973A; text-transform: uppercase; text-align: right; }
.footer-powered { font-size: 5.5pt; color: #ccc; text-align: right; margin-top: 2px; letter-spacing: 1px; }
`;

// ─── PAGE BUILDERS ──────────────────────────────────────────────────────────

function buildCover(yacht, settings) {
  const photos = yacht.photo_urls || [];
  const photoHTML = photos.length > 0
    ? `<img class="cover-photo" src="${photos[0]}" alt="${yacht.name}">`
    : `<div class="cover-photo-placeholder">No photo available</div>`;

  const specItems = [
    { label: 'Builder', value: yacht.builder },
    { label: 'Year',    value: yacht.year_built },
    { label: 'Length',  value: yacht.length_m ? yacht.length_m + ' m' : null },
    { label: 'Flag',    value: yacht.flag },
    { label: 'Base',    value: yacht.home_port },
  ].filter(i => i.value);

  return `
<div class="cover">
  ${photoHTML}
  <div class="cover-content">
    <div class="cover-line"></div>
    <div class="cover-meta-row">
      <div class="cover-doc-type">Vessel Proposal &nbsp;&middot;&nbsp; ${getTypeLabel(settings.proposalType)}</div>
      <div class="cover-doc-date">${getMonthYear()}</div>
    </div>
    <div class="cover-yacht-name">${yacht.name}</div>
    <div class="cover-specs-row">
      ${specItems.map(i => `
        <div>
          <div class="csi-label">${i.label}</div>
          <div class="csi-value">${i.value}</div>
        </div>`).join('')}
    </div>
    <div class="cover-price-row">
      <div>
        <div class="cover-price-label">${getCoverPriceLabel(settings)}</div>
        <div class="cover-price">${getCoverPrice(settings)}</div>
      </div>
      <div class="cover-brand">YachtWorth</div>
    </div>
  </div>
</div>`;
}

function buildSpecsPage(yacht, equipment) {
  // Specs
  const engineStr = getEngineStr(yacht);
  const leftSpecs = `
    ${row('Builder', yacht.builder)}
    ${row('Model', yacht.model)}
    ${row('Year built', yacht.year_built)}
    ${row('Type', yacht.yacht_type)}
    ${row('LOA', yacht.length_m ? yacht.length_m.toFixed(2) + ' m' : null)}
    ${row('Beam', yacht.beam_m ? yacht.beam_m + ' m' : null)}
    ${row('Draft', yacht.draft_m ? yacht.draft_m + ' m' : null)}
    ${row('Hull material', yacht.hull_material)}
    ${row('Hull type', yacht.hull_type)}`;

  const rightSpecs = `
    ${row('Engines', engineStr)}
    ${row('Total power', yacht.total_hp ? yacht.total_hp + ' HP' : null)}
    ${row('Engine hours', yacht.engine_hours_current ? yacht.engine_hours_current + ' hrs' : null)}
    ${row('Max speed', yacht.max_speed ? yacht.max_speed + ' knots' : null)}
    ${row('Cruise speed', yacht.cruise_speed ? yacht.cruise_speed + ' knots' : null)}
    ${row('Range', yacht.range_nm ? yacht.range_nm + ' nm' : null)}
    ${row('Fuel capacity', yacht.fuel_capacity_l ? yacht.fuel_capacity_l.toLocaleString('en') + ' L' : null)}
    ${row('Flag', yacht.flag)}
    ${row('Home base', yacht.home_port)}
    ${row('IMO number', yacht.imo_number)}
    ${accentRow('VAT status', yacht.vat_status)}`;

  // Accommodation
  const summary = [
    yacht.berths ? yacht.berths + ' guests' : null,
    yacht.guest_cabins ? yacht.guest_cabins + ' cabins' : null,
    yacht.heads ? yacht.heads + ' heads' : null,
    yacht.crew_cabins ? yacht.crew_cabins + ' crew' : null,
  ].filter(Boolean).join(' &middot; ');

  // Equipment
  let equipHTML = '';
  if (equipment && equipment.length > 0) {
    const groups = {};
    for (const item of equipment) {
      const cat = item.category || 'other';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(item);
    }
    const groupsHTML = Object.entries(groups).map(([cat, items]) => {
      const label = CATEGORY_LABELS[cat] || cat.replace(/_/g, ' ');
      const itemsHTML = items.map(item => {
        const lbl = formatEquipLabel(item);
        const hi  = isNotable(item.equipment_type) ? ' hi' : '';
        return `<span class="eq-item${hi}">${lbl}</span>`;
      }).join('');
      return `
        <div class="eq-group">
          <div class="eq-title">${label}</div>
          <div class="eq-items">${itemsHTML}</div>
        </div>`;
    }).join('');

    equipHTML = `
      <div class="sec" style="padding:0 0;">
        <div class="sec-title">Equipment &amp; Systems</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:0 32px;">
          ${groupsHTML}
        </div>
      </div>`;
  }

  return `
<div class="ipage" style="page-break-before:always;">
  <div class="ih">
    <div class="ih-brand">YachtWorth</div>
    <div class="ih-right">
      <div class="ih-yacht">${yacht.name.toUpperCase()}</div>
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
    <div class="sec">
      <div class="sec-title">Accommodation</div>
      <div class="cabin-row">
        <div class="cabin-left">
          <div class="cabin-type">Summary</div>
          <div class="cabin-desc">${summary || 'See vessel documentation'}</div>
        </div>
      </div>
    </div>
    ${equipHTML}
  </div>
  <div class="ifooter">
    <div class="footer-disclaimer">All specifications believed correct. Buyer must verify independently prior to purchase.</div>
    <div>
      <div class="footer-brand">YachtWorth</div>
      <div class="footer-powered">Powered by PDYE Group</div>
    </div>
  </div>
</div>`;
}

function buildPhotosPage(yacht) {
  const photos = (yacht.photo_urls || []).slice(0, 4);
  if (photos.length === 0) return '';

  // Pad to 4 photos
  while (photos.length < 4) photos.push(photos[photos.length - 1]);

  return `
<div class="ipage" style="page-break-before:always;">
  <div class="ih">
    <div class="ih-brand">YachtWorth</div>
    <div class="ih-right">
      <div class="ih-yacht">${yacht.name.toUpperCase()}</div>
      <div class="ih-page">03</div>
    </div>
  </div>
  <div class="ib">
    <div class="sec">
      <div class="sec-title">Photography</div>
      <div class="photo-grid-2x2">
        ${photos.map(url => `<img src="${url}" alt="">`).join('')}
      </div>
    </div>
  </div>
  <div class="ifooter">
    <div class="footer-disclaimer">Photos representative of vessel condition at time of documentation.</div>
    <div>
      <div class="footer-brand">YachtWorth</div>
      <div class="footer-powered">Powered by PDYE Group</div>
    </div>
  </div>
</div>`;
}

function buildPricingPage(yacht, settings, pageNum) {
  const showSale    = settings.proposalType === 'sale'    || settings.proposalType === 'both';
  const showCharter = settings.proposalType === 'charter' || settings.proposalType === 'both';

  const saleHTML = showSale ? `
    <div class="price-group">
      <div class="price-main">
        <div class="price-main-label">For Sale</div>
        <div class="price-main-value">${settings.priceOnApplication ? 'Price on application' : (fmt(settings.askingPrice) || 'Price on application')}</div>
      </div>
      ${settings.askingPrice && !settings.priceOnApplication ? `<div class="price-detail-row"><span class="pdl">VAT status</span><span class="pdv">${yacht.vat_status || ''}</span></div>` : ''}
      ${settings.delivery ? `<div class="price-detail-row"><span class="pdl">Delivery</span><span class="pdv">${settings.delivery}</span></div>` : ''}
      ${settings.seaTrial ? `<div class="price-detail-row"><span class="pdl">Sea trial</span><span class="pdv">${settings.seaTrial}</span></div>` : ''}
      <div class="price-detail-row"><span class="pdl">Survey</span><span class="pdv">Available on request</span></div>
    </div>` : '';

  const charterHTML = showCharter ? `
    <div class="price-group">
      <div class="price-main">
        <div class="price-main-label">For Charter</div>
        <div class="price-main-value">${settings.charterOnApplication ? 'Price on application' : ((fmt(settings.charterRateHigh) || '') + ' <span style="font-size:12pt;font-weight:300;color:#999;">/ week</span>')}</div>
      </div>
      ${settings.charterRateLow ? `<div class="price-detail-row"><span class="pdl">Low season</span><span class="pdv">${fmt(settings.charterRateLow)} / week</span></div>` : ''}
      ${settings.apaPercent ? `<div class="price-detail-row"><span class="pdl">APA</span><span class="pdv">${settings.apaPercent}% of base rate</span></div>` : ''}
      ${settings.charterArea ? `<div class="price-detail-row"><span class="pdl">Charter area</span><span class="pdv">${settings.charterArea}</span></div>` : ''}
      ${settings.mybaContract ? `<div class="price-detail-row"><span class="pdl">Contract</span><span class="pdv">MYBA standard</span></div>` : ''}
    </div>` : '';

  const notesHTML = settings.notes ? `
    <div class="notes">
      <div class="notes-label">Notes</div>
      <div class="notes-text">${settings.notes}</div>
    </div>` : '';

  const hasContact = settings.brokerName || settings.email || settings.phone;
  const contactHTML = hasContact ? `
    <div class="contact">
      <div class="contact-left">
        <div class="broker-name">${settings.brokerName || ''}</div>
        ${settings.brokerageName ? `<div class="broker-co">${settings.brokerageName}</div>` : ''}
      </div>
      <div class="contact-right">
        ${settings.email ? `<div class="contact-item"><span class="ci-label">Email</span>${settings.email}</div>` : ''}
        ${settings.phone ? `<div class="contact-item"><span class="ci-label">Phone</span>${settings.phone}</div>` : ''}
        ${settings.website ? `<div class="contact-item"><span class="ci-label">Web</span>${settings.website}</div>` : ''}
      </div>
    </div>` : '';

  return `
<div class="ipage" style="page-break-before:always;">
  <div class="ih">
    <div class="ih-brand">YachtWorth</div>
    <div class="ih-right">
      <div class="ih-yacht">${yacht.name.toUpperCase()}</div>
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
    <div>
      <div class="footer-brand">YachtWorth</div>
      <div class="footer-powered">Powered by PDYE Group</div>
    </div>
  </div>
</div>`;
}

// ─── MAIN BUILDER ────────────────────────────────────────────────────────────

export function buildProposalHTML(yacht, equipment, settings) {
  const photos      = yacht.photo_urls || [];
  const hasPhotos   = photos.length >= 1;
  const pricingNum  = hasPhotos ? '04' : '03';

  const pages = [
    buildCover(yacht, settings),
    buildSpecsPage(yacht, equipment),
    hasPhotos ? buildPhotosPage(yacht) : '',
    buildPricingPage(yacht, settings, pricingNum),
  ].join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>${CSS}</style>
</head>
<body>
<div style="background:#e0e0e0;padding:20px 0;">
${pages}
</div>
</body>
</html>`;
}

// ─── PDF EXPORT ──────────────────────────────────────────────────────────────

export async function generateProposalPDF(yacht, equipment, settings) {
  const html = buildProposalHTML(yacht, equipment, settings);

  const { uri } = await Print.printToFileAsync({
    html,
    base64: false,
    width: 595,
    height: 842,
  });

  const name = (yacht.name || 'Proposal').replace(/\s+/g, '_');
  const date = new Date().toISOString().split('T')[0];

  await Sharing.shareAsync(uri, {
    mimeType: 'application/pdf',
    dialogTitle: `${yacht.name} — Vessel Proposal`,
    UTI: 'com.adobe.pdf',
  });

  return uri;
}
