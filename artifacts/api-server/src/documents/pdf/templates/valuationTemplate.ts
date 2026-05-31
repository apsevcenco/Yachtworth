import type {
  ComparableYacht,
  DocumentTemplate,
  ExportSettings,
  ValuationFactor,
  ValuationReportData,
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

const CURRENCY_SYMBOLS: Record<string, string> = {
  EUR: "€",
  USD: "$",
  GBP: "£",
  CHF: "CHF ",
  AUD: "A$",
  CAD: "C$",
};

function moneyOf(currency: string | null | undefined): (v: unknown) => string {
  const code = (currency ?? "EUR").toString().toUpperCase().trim();
  const sym = CURRENCY_SYMBOLS[code];
  return (v: unknown) => {
    const n = num(v);
    if (n == null) return "";
    const amount = Math.round(n).toLocaleString("en-US");
    return sym ? `${sym}${amount}` : `${amount} ${code}`;
  };
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

function confidencePct(v: number | null): number | null {
  if (v == null) return null;
  const pct = v <= 1 ? v * 100 : v;
  return Math.max(0, Math.min(100, Math.round(pct)));
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
    report: "VALUATION REPORT",
    yachtSummary: "Yacht Summary",
    specifications: "Specifications",
    accommodation: "Accommodation",
    valuation: "Valuation Result",
    estimatedValue: "Estimated Market Value",
    low: "Low",
    mid: "Mid",
    high: "High",
    confidence: "Confidence",
    comparables: "Comparable Yachts",
    factors: "Valuation Factors",
    marketNotes: "Market Notes",
    contact: "Prepared By",
    impactPositive: "Positive",
    impactNegative: "Negative",
    impactNeutral: "Neutral",
    confidential: "CONFIDENTIAL",
    none: "—",
  },
  french: {
    report: "RAPPORT D'ÉVALUATION",
    yachtSummary: "Résumé du Navire",
    specifications: "Spécifications",
    accommodation: "Hébergement",
    valuation: "Résultat de l'Évaluation",
    estimatedValue: "Valeur Marchande Estimée",
    low: "Bas",
    mid: "Moyen",
    high: "Haut",
    confidence: "Confiance",
    comparables: "Navires Comparables",
    factors: "Facteurs d'Évaluation",
    marketNotes: "Notes de Marché",
    contact: "Préparé Par",
    impactPositive: "Positif",
    impactNegative: "Négatif",
    impactNeutral: "Neutre",
    confidential: "CONFIDENTIEL",
    none: "—",
  },
  italian: {
    report: "RAPPORTO DI VALUTAZIONE",
    yachtSummary: "Riepilogo Imbarcazione",
    specifications: "Specifiche",
    accommodation: "Sistemazione",
    valuation: "Risultato della Valutazione",
    estimatedValue: "Valore di Mercato Stimato",
    low: "Basso",
    mid: "Medio",
    high: "Alto",
    confidence: "Affidabilità",
    comparables: "Imbarcazioni Comparabili",
    factors: "Fattori di Valutazione",
    marketNotes: "Note di Mercato",
    contact: "Preparato Da",
    impactPositive: "Positivo",
    impactNegative: "Negativo",
    impactNeutral: "Neutro",
    confidential: "RISERVATO",
    none: "—",
  },
  spanish: {
    report: "INFORME DE VALORACIÓN",
    yachtSummary: "Resumen de la Embarcación",
    specifications: "Especificaciones",
    accommodation: "Alojamiento",
    valuation: "Resultado de la Valoración",
    estimatedValue: "Valor de Mercado Estimado",
    low: "Bajo",
    mid: "Medio",
    high: "Alto",
    confidence: "Confianza",
    comparables: "Embarcaciones Comparables",
    factors: "Factores de Valoración",
    marketNotes: "Notas de Mercado",
    contact: "Preparado Por",
    impactPositive: "Positivo",
    impactNegative: "Negativo",
    impactNeutral: "Neutro",
    confidential: "CONFIDENCIAL",
    none: "—",
  },
  german: {
    report: "BEWERTUNGSBERICHT",
    yachtSummary: "Schiffsübersicht",
    specifications: "Spezifikationen",
    accommodation: "Unterbringung",
    valuation: "Bewertungsergebnis",
    estimatedValue: "Geschätzter Marktwert",
    low: "Niedrig",
    mid: "Mittel",
    high: "Hoch",
    confidence: "Konfidenz",
    comparables: "Vergleichbare Yachten",
    factors: "Bewertungsfaktoren",
    marketNotes: "Marktnotizen",
    contact: "Erstellt Von",
    impactPositive: "Positiv",
    impactNegative: "Negativ",
    impactNeutral: "Neutral",
    confidential: "VERTRAULICH",
    none: "—",
  },
  russian: {
    report: "ОТЧЁТ ОБ ОЦЕНКЕ",
    yachtSummary: "Сводка по Яхте",
    specifications: "Характеристики",
    accommodation: "Размещение",
    valuation: "Результат Оценки",
    estimatedValue: "Оценочная Рыночная Стоимость",
    low: "Мин.",
    mid: "Средн.",
    high: "Макс.",
    confidence: "Достоверность",
    comparables: "Сравнимые Яхты",
    factors: "Факторы Оценки",
    marketNotes: "Заметки о Рынке",
    contact: "Подготовлено",
    impactPositive: "Положительный",
    impactNegative: "Отрицательный",
    impactNeutral: "Нейтральный",
    confidential: "КОНФИДЕНЦИАЛЬНО",
    none: "—",
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

// ─── valuation result ──────────────────────────────────────────────────────────

function valuationPage(
  r: ValuationReportData,
  d: Dict,
  money: (v: unknown) => string,
): string {
  const lo = num(r.estimatedValueLow);
  const mid = num(r.estimatedValueMid);
  const hi = num(r.estimatedValueHigh);
  const conf = confidencePct(num(r.confidenceScore));

  const cell = (label: string, value: number | null, emphasis = false) =>
    `<div class="val-box${emphasis ? " val-box-mid" : ""}">
      <div class="val-label">${esc(label)}</div>
      <div class="val-amount">${value != null ? money(value) : esc(d["none"])}</div>
    </div>`;

  const boxes = [
    cell(d["low"]!, lo),
    cell(d["mid"]!, mid, true),
    cell(d["high"]!, hi),
  ].join("");

  const confBlock =
    conf != null
      ? `<div class="conf">
          <div class="conf-head">${esc(d["confidence"])}</div>
          <div class="conf-bar"><div class="conf-fill" style="width:${conf}%"></div></div>
          <div class="conf-val">${conf}%</div>
        </div>`
      : "";

  return `
  <section class="page">
    <div class="eyebrow">${esc(d["valuation"])}</div>
    <div class="val-head">${esc(d["estimatedValue"])}</div>
    <div class="val-row">${boxes}</div>
    ${confBlock}
  </section>`;
}

// ─── comparables ───────────────────────────────────────────────────────────────

function comparablesPages(
  items: ComparableYacht[],
  d: Dict,
  fallbackMoney: (v: unknown) => string,
): string {
  if (!items.length) return "";
  const pages = chunk(items, 12);
  return pages
    .map((group, idx) => {
      const rows = group
        .map((c) => {
          const title = [c.name, c.builder, c.model]
            .filter((x) => x != null && x !== "")
            .map((x) => esc(x))
            .join(" · ");
          const meta: string[] = [];
          if (c.year != null) meta.push(esc(c.year));
          if (num(c.length_meters) != null) meta.push(`${num(c.length_meters)} m`);
          if (c.location) meta.push(esc(c.location));
          const priceMoney = c.currency ? moneyOf(c.currency) : fallbackMoney;
          const price = num(c.price) != null ? priceMoney(c.price) : esc(d["none"]);
          const sub = [meta.join(" · "), c.notes ? esc(c.notes) : ""]
            .filter((x) => x)
            .join(" — ");
          return `<tr>
            <td class="cmp-name">${title || esc(d["none"])}${
              sub ? `<div class="cmp-sub">${sub}</div>` : ""
            }${c.source ? `<div class="cmp-src">${esc(c.source)}</div>` : ""}</td>
            <td class="cmp-price">${price}</td>
          </tr>`;
        })
        .join("");
      return `
      <section class="page">
        <div class="eyebrow">${esc(d["comparables"])}${
          pages.length > 1 ? ` — ${idx + 1}/${pages.length}` : ""
        }</div>
        <table class="cmp">${rows}</table>
      </section>`;
    })
    .join("");
}

// ─── factors ───────────────────────────────────────────────────────────────────

function impactClass(impact: string | null | undefined): string {
  const v = (impact ?? "").toString().toLowerCase();
  if (/(^|[^a-z])(pos|positive|\+|up|good|strong)/.test(v)) return "imp-pos";
  if (/(^|[^a-z])(neg|negative|-|down|weak|poor)/.test(v)) return "imp-neg";
  return "imp-neu";
}

function factorsPages(items: ValuationFactor[], d: Dict): string {
  if (!items.length) return "";
  const pages = chunk(items, 14);
  return pages
    .map((group, idx) => {
      const rows = group
        .map((f) => {
          const chip = f.impact
            ? `<span class="chip ${impactClass(f.impact)}">${esc(f.impact)}</span>`
            : "";
          const weight = num(f.weight) != null ? `<span class="fw">${num(f.weight)}</span>` : "";
          return `<tr>
            <td class="fct-name">${esc(f.factor ?? d["none"])}${
              f.notes ? `<div class="fct-note">${esc(f.notes)}</div>` : ""
            }</td>
            <td class="fct-impact">${chip}${weight}</td>
          </tr>`;
        })
        .join("");
      return `
      <section class="page">
        <div class="eyebrow">${esc(d["factors"])}${
          pages.length > 1 ? ` — ${idx + 1}/${pages.length}` : ""
        }</div>
        <table class="fct">${rows}</table>
      </section>`;
    })
    .join("");
}

// ─── market notes + disclaimer ─────────────────────────────────────────────────

function notesPage(
  r: ValuationReportData,
  settings: ExportSettings,
  d: Dict,
): string {
  const broker = settings.brokerInfo ?? null;
  const contactRows: [string, string][] = [];
  if (broker?.name) contactRows.push(["Name", esc(broker.name)]);
  if (broker?.company) contactRows.push(["Company", esc(broker.company)]);
  if (broker?.phone) contactRows.push(["Phone", esc(broker.phone)]);
  if (broker?.email) contactRows.push(["Email", esc(broker.email)]);
  if (broker?.website) contactRows.push(["Website", esc(broker.website)]);

  return `
  <section class="page">
    <div class="eyebrow">${esc(d["marketNotes"])}</div>
    ${
      r.marketNotes
        ? `<div class="notes"><p>${esc(r.marketNotes).replace(/\n/g, "<br/>")}</p></div>`
        : `<p style="color:#6b6b6b">${esc(d["none"])}</p>`
    }
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
  /* valuation result */
  .val-head { font-size: 13px; font-weight: 700; margin-bottom: 14px; color: ${t.text}; }
  .val-row { display: flex; gap: 12px; margin-bottom: 22px; }
  .val-box { flex: 1; background: ${t.panelBg}; border-top: 3px solid ${t.line}; padding: 18px 14px; border-radius: 2px; text-align: center; }
  .val-box-mid { border-top: 3px solid ${t.accent}; }
  .val-label { color: ${t.accent}; font-size: 9px; letter-spacing: 1.5px; text-transform: uppercase; font-weight: 700; margin-bottom: 8px; }
  .val-amount { font-size: 20px; font-weight: 800; }
  .val-box-mid .val-amount { font-size: 24px; }
  .conf { margin-top: 6px; }
  .conf-head { color: ${t.accent}; font-size: 9px; letter-spacing: 1.5px; text-transform: uppercase; font-weight: 700; margin-bottom: 8px; }
  .conf-bar { background: ${t.panelBg}; border-radius: 10px; height: 12px; overflow: hidden; }
  .conf-fill { background: ${t.accent}; height: 100%; }
  .conf-val { margin-top: 6px; font-weight: 700; font-size: 13px; }
  /* comparables */
  table.cmp { width: 100%; border-collapse: collapse; }
  table.cmp td { padding: 9px 4px; border-bottom: 1px solid ${t.line}; vertical-align: top; }
  .cmp-name { font-weight: 600; }
  .cmp-sub { color: ${t.textMuted}; font-weight: 400; font-size: 10px; margin-top: 2px; }
  .cmp-src { color: ${t.accent}; font-weight: 600; font-size: 8.5px; letter-spacing: 0.5px; text-transform: uppercase; margin-top: 3px; }
  .cmp-price { text-align: right; font-weight: 800; white-space: nowrap; width: 28%; }
  /* factors */
  table.fct { width: 100%; border-collapse: collapse; }
  table.fct td { padding: 9px 4px; border-bottom: 1px solid ${t.line}; vertical-align: top; }
  .fct-name { font-weight: 600; }
  .fct-note { color: ${t.textMuted}; font-weight: 400; font-size: 10px; margin-top: 2px; }
  .fct-impact { text-align: right; white-space: nowrap; width: 30%; }
  .chip { display: inline-block; padding: 3px 9px; border-radius: 10px; font-size: 9px; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase; }
  .imp-pos { background: #e7f4ec; color: #1f7a44; }
  .imp-neg { background: #fbeaea; color: #b02a2a; }
  .imp-neu { background: ${t.panelBg}; color: ${t.textMuted}; }
  .fw { display: inline-block; margin-left: 8px; color: ${t.textMuted}; font-weight: 700; font-size: 10px; }
  /* notes */
  .notes { background: ${t.panelBg}; border-radius: 2px; padding: 12px 14px; margin-bottom: 14px; }
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

export function buildValuationHtml(input: {
  yacht: YachtProfile;
  reportData: ValuationReportData;
  settings: ExportSettings;
  template: DocumentTemplate;
}): string {
  const { yacht, reportData, settings, template } = input;
  const t = THEMES[template];
  const d = dict(settings.language);
  const confidential = settings.confidential === true;
  const money = moneyOf(reportData.currency);

  const photos = photoList(yacht);
  const cover = photos[0];
  const date = new Date().toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const brand = settings.branding ?? settings.brand_name ?? "Yachtworth";

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

  const coverPrice =
    num(reportData.estimatedValueMid) != null ? money(reportData.estimatedValueMid) : "";

  const coverHtml = `
  <div class="cover">
    ${cover ? `<img class="cover-photo" src="${esc(cover)}" />` : ""}
    ${cover ? `<div class="cover-overlay"></div>` : ""}
    <div class="cover-date">${esc(date)}</div>
    <div class="cover-inner">
      <div class="cover-eyebrow">${esc(brand)} · ${esc(d["report"])}</div>
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
  const summaryPage = `
  <section class="page">
    <div class="eyebrow">${esc(d["yachtSummary"])}</div>
    <div class="two-col">
      <div>${specs.length ? tableHtml(specs) : `<p style="color:${t.textMuted}">${esc(d["none"])}</p>`}</div>
      <div>
        <div class="sub-h">${esc(d["accommodation"])}</div>
        ${accom.length ? tableHtml(accom) : `<p style="color:${t.textMuted}">${esc(d["none"])}</p>`}
      </div>
    </div>
  </section>`;

  const comparables = Array.isArray(reportData.comparableYachts)
    ? reportData.comparableYachts
    : [];
  const factors = Array.isArray(reportData.valuationFactors)
    ? reportData.valuationFactors
    : [];

  return `<!doctype html>
<html><head><meta charset="utf-8" /><style>${css(t, confidential)}</style></head>
<body>
  ${confidential ? `<div class="watermark">${esc(d["confidential"])}</div>` : ""}
  ${coverHtml}
  ${summaryPage}
  ${valuationPage(reportData, d, money)}
  ${comparablesPages(comparables, d, money)}
  ${factorsPages(factors, d)}
  ${notesPage(reportData, settings, d)}
</body></html>`;
}
