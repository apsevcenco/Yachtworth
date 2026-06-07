/**
 * Valuation report content builder: report inputs → DocumentModel.
 *
 * This is the renderer-independent half of the valuation report. It maps yacht
 * specs + valuation data + export settings into the semantic model. It does NOT
 * escape (the renderers do) and emits no HTML — so the same model can drive both
 * the PDF and (P1) the DOCX renderer.
 */
import type {
  ComparableYacht,
  DocumentTemplate,
  ExportSettings,
  ValuationFactor,
  ValuationReportData,
  YachtProfile,
} from "../documentTypes";
import { getTheme } from "../core/theme";
import { num, photoList } from "../core/util";
import type {
  CellTone,
  ContentNode,
  CoverSpec,
  DocumentModel,
  TableCell,
} from "../model/types";

// ─── currency / confidence / impact ─────────────────────────────────────────

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
    // `code` is raw here; the renderer escapes the cell text it lands in.
    return sym ? `${sym}${amount}` : `${amount} ${code}`;
  };
}

function confidencePct(v: number | null): number | null {
  if (v == null) return null;
  const pct = v <= 1 ? v * 100 : v;
  return Math.max(0, Math.min(100, Math.round(pct)));
}

function impactTone(impact: string | null | undefined): CellTone {
  const v = (impact ?? "").toString().toLowerCase();
  if (/(^|[^a-z])(pos|positive|\+|up|good|strong)/.test(v)) return "pos";
  if (/(^|[^a-z])(neg|negative|-|down|weak|poor)/.test(v)) return "neg";
  return "neu";
}

/**
 * Density control for PDF body copy: collapse whitespace into a single small
 * paragraph and hard-cap length on a word boundary (adds an ellipsis when cut).
 * Returns the text unchanged when it is already within `max` — so short market
 * notes / disclaimers keep their full wording, long ones are trimmed to fit.
 */
function truncateText(s: string, max: number): string {
  const t = s.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  const sp = cut.lastIndexOf(" ");
  return (sp > max * 0.6 ? cut.slice(0, sp) : cut).replace(/[\s,.;:–—-]+$/, "") + "…";
}

// ─── labels (multi-language, valuation subset) ──────────────────────────────

type Dict = Record<string, string>;
const LABELS: Record<string, Dict> = {
  english: {
    report: "VALUATION REPORT",
    yachtSummary: "Yacht Summary",
    accommodation: "Accommodation",
    valuation: "Valuation Result",
    estimatedValue: "Estimated Market Value",
    openMarket: "Open Market",
    discreetSale: "Discreet Sale",
    quickSale: "Quick Sale",
    range: "Range",
    dataCompleteness: "Data completeness",
    fieldsFilled: "fields filled",
    confidence: "Confidence",
    comparables: "Comparable Yachts",
    factors: "Valuation Factors",
    marketNotes: "Market Notes",
    contact: "Prepared By",
    confidential: "CONFIDENTIAL",
    none: "—",
  },
  french: {
    report: "RAPPORT D'ÉVALUATION",
    yachtSummary: "Résumé du Navire",
    accommodation: "Hébergement",
    valuation: "Résultat de l'Évaluation",
    estimatedValue: "Valeur Marchande Estimée",
    openMarket: "Marché Libre",
    discreetSale: "Vente Discrète",
    quickSale: "Vente Rapide",
    range: "Fourchette",
    dataCompleteness: "Exhaustivité des données",
    fieldsFilled: "champs remplis",
    confidence: "Confiance",
    comparables: "Navires Comparables",
    factors: "Facteurs d'Évaluation",
    marketNotes: "Notes de Marché",
    contact: "Préparé Par",
    confidential: "CONFIDENTIEL",
    none: "—",
  },
  italian: {
    report: "RAPPORTO DI VALUTAZIONE",
    yachtSummary: "Riepilogo Imbarcazione",
    accommodation: "Sistemazione",
    valuation: "Risultato della Valutazione",
    estimatedValue: "Valore di Mercato Stimato",
    openMarket: "Mercato Aperto",
    discreetSale: "Vendita Discreta",
    quickSale: "Vendita Rapida",
    range: "Intervallo",
    dataCompleteness: "Completezza dei dati",
    fieldsFilled: "campi compilati",
    confidence: "Affidabilità",
    comparables: "Imbarcazioni Comparabili",
    factors: "Fattori di Valutazione",
    marketNotes: "Note di Mercato",
    contact: "Preparato Da",
    confidential: "RISERVATO",
    none: "—",
  },
  spanish: {
    report: "INFORME DE VALORACIÓN",
    yachtSummary: "Resumen de la Embarcación",
    accommodation: "Alojamiento",
    valuation: "Resultado de la Valoración",
    estimatedValue: "Valor de Mercado Estimado",
    openMarket: "Mercado Abierto",
    discreetSale: "Venta Discreta",
    quickSale: "Venta Rápida",
    range: "Rango",
    dataCompleteness: "Integridad de los datos",
    fieldsFilled: "campos completados",
    confidence: "Confianza",
    comparables: "Embarcaciones Comparables",
    factors: "Factores de Valoración",
    marketNotes: "Notas de Mercado",
    contact: "Preparado Por",
    confidential: "CONFIDENCIAL",
    none: "—",
  },
  german: {
    report: "BEWERTUNGSBERICHT",
    yachtSummary: "Schiffsübersicht",
    accommodation: "Unterbringung",
    valuation: "Bewertungsergebnis",
    estimatedValue: "Geschätzter Marktwert",
    openMarket: "Freier Markt",
    discreetSale: "Diskreter Verkauf",
    quickSale: "Schnellverkauf",
    range: "Spanne",
    dataCompleteness: "Datenvollständigkeit",
    fieldsFilled: "Felder ausgefüllt",
    confidence: "Konfidenz",
    comparables: "Vergleichbare Yachten",
    factors: "Bewertungsfaktoren",
    marketNotes: "Marktnotizen",
    contact: "Erstellt Von",
    confidential: "VERTRAULICH",
    none: "—",
  },
  russian: {
    report: "ОТЧЁТ ОБ ОЦЕНКЕ",
    yachtSummary: "Сводка по Яхте",
    accommodation: "Размещение",
    valuation: "Результат Оценки",
    estimatedValue: "Оценочная Рыночная Стоимость",
    openMarket: "Открытый Рынок",
    discreetSale: "Закрытая Продажа",
    quickSale: "Быстрая Продажа",
    range: "Диапазон",
    dataCompleteness: "Полнота данных",
    fieldsFilled: "полей заполнено",
    confidence: "Достоверность",
    comparables: "Сравнимые Яхты",
    factors: "Факторы Оценки",
    marketNotes: "Заметки о Рынке",
    contact: "Подготовлено",
    confidential: "КОНФИДЕНЦИАЛЬНО",
    none: "—",
  },
};

function dict(lang: string | undefined): Dict {
  return LABELS[lang ?? "english"] ?? LABELS["english"]!;
}

// ─── enum → human-readable labels ───────────────────────────────────────────
// Same logic as the proposal builder (kept local — builders don't import each
// other; valuation must stay independently renderable).

function humanize(s: string): string {
  return s
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Human-readable VAT status. Enum values must map explicitly — humanize alone
 *  would yield "Tax Paid Eu" which reads poorly on a client-facing report. */
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

// ─── comparable / factor rows ───────────────────────────────────────────────

function comparableRows(
  items: ComparableYacht[],
  d: Dict,
  fallbackMoney: (v: unknown) => string,
): TableCell[][] {
  return items.map((c) => {
    const title =
      [c.name, c.builder, c.model].filter((x) => x != null && x !== "").join(" · ") || d["none"]!;
    const meta: string[] = [];
    if (c.year != null) meta.push(String(c.year));
    if (num(c.length_meters) != null) meta.push(`${num(c.length_meters)} m`);
    if (c.location) meta.push(c.location);
    const sub = [meta.join(" · "), c.notes ?? ""].filter((x) => x).join(" — ");
    const priceMoney = c.currency ? moneyOf(c.currency) : fallbackMoney;
    const price = num(c.price) != null ? priceMoney(c.price) : d["none"]!;
    const nameCell: TableCell = { text: title };
    if (sub) nameCell.sub = sub;
    if (c.source) nameCell.source = c.source;
    const priceCell: TableCell = { text: price, align: "right", bold: true };
    return [nameCell, priceCell];
  });
}

function factorRows(items: ValuationFactor[], d: Dict): TableCell[][] {
  return items.map((f) => {
    const nameCell: TableCell = { text: f.factor ?? d["none"]! };
    if (f.notes) nameCell.sub = f.notes;
    const impactCell: TableCell = { text: "", align: "right" };
    if (f.impact) impactCell.tag = { text: f.impact, tone: impactTone(f.impact) };
    if (num(f.weight) != null) impactCell.text = String(num(f.weight));
    if (impactCell.text) impactCell.muted = true;
    return [nameCell, impactCell];
  });
}

// ─── main ───────────────────────────────────────────────────────────────────

export function buildValuationModel(input: {
  yacht: YachtProfile;
  reportData: ValuationReportData;
  settings: ExportSettings;
  template: DocumentTemplate;
}): DocumentModel {
  const { yacht, reportData, settings, template } = input;
  const theme = getTheme(template);
  const d = dict(settings.language);
  const money = moneyOf(reportData.currency);
  const brand = settings.branding ?? settings.brand_name ?? "Yachtworth";
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
  const coverPrice = num(reportData.estimatedValueMid) != null ? money(reportData.estimatedValueMid) : "";

  const cover: CoverSpec = {
    eyebrow: `${brand} · ${d["report"]}`,
    name: yacht.name ?? "",
    date,
    cells,
  };
  if (photos[0]) cover.photoUrl = photos[0];
  if (subtitle) cover.subtitle = subtitle;
  if (coverPrice) cover.price = coverPrice;

  // ── body ──
  const body: ContentNode[] = [];

  // Yacht summary: full-width paired specification grid, then accommodation
  // (the ONE shared paired-spec style; no near-empty side column).
  // Only render summary sections that actually carry data — never an empty
  // section with placeholder "—" rows (e.g. accommodation in the estimate flow).
  const specs = specRows(yacht);
  if (specs.length) {
    body.push({
      kind: "keyValue",
      heading: d["yachtSummary"]!,
      rows: specs,
      layout: "pairs",
      emptyText: d["none"]!,
    });
  }
  const accom = accomRows(yacht);
  if (accom.length) {
    body.push({
      kind: "keyValue",
      heading: d["accommodation"]!,
      rows: accom,
      layout: "pairs",
      emptyText: d["none"]!,
    });
  }

  // Valuation result — three pricing scenarios (mirror the Market Estimate screen):
  // Open Market (estimated) · Discreet Sale (distressed) · Quick Sale.
  const openMarket = num(reportData.openMarketValue);
  const discreet = num(reportData.discreetSaleValue);
  const quick = num(reportData.quickSaleValue);
  const lo = num(reportData.estimatedValueLow);
  const hi = num(reportData.estimatedValueHigh);
  const conf = confidencePct(num(reportData.confidenceScore));
  const metrics: ContentNode = {
    kind: "metrics",
    heading: d["valuation"]!,
    valueHeading: d["estimatedValue"]!,
    cards: [
      {
        label: d["openMarket"]!,
        value: openMarket != null ? money(openMarket) : d["none"]!,
        emphasis: true,
      },
      { label: d["discreetSale"]!, value: discreet != null ? money(discreet) : d["none"]! },
      { label: d["quickSale"]!, value: quick != null ? money(quick) : d["none"]! },
    ],
  };
  if (conf != null) metrics.confidence = { label: d["confidence"]!, pct: conf };

  // Caption under the cards: estimated range + data-completeness — each part is
  // emitted only when the underlying field is present (no empty/irrelevant text).
  const capParts: string[] = [];
  if (lo != null && hi != null) capParts.push(`${d["range"]!} ${money(lo)} – ${money(hi)}`);
  const compScore = num(reportData.completenessScore);
  const compFilled = num(reportData.completenessFilled);
  const compTotal = num(reportData.completenessTotal);
  const compBits: string[] = [];
  if (compFilled != null && compTotal != null)
    compBits.push(`${compFilled}/${compTotal} ${d["fieldsFilled"]!}`);
  if (compScore != null)
    compBits.push(`${Math.round(compScore)}% ${d["dataCompleteness"]!.toLowerCase()}`);
  if (compBits.length) capParts.push(compBits.join(" · "));
  if (capParts.length) metrics.caption = capParts.join("  ·  ");
  body.push(metrics);

  // ── Evidence group → page 2 ──
  // ONE intentional break starts the evidence group on a fresh page, so the
  // layout is deterministic: page 1 = Yacht Summary + Valuation Result, page 2 =
  // Comparables + Factors + Market Notes + Disclaimer. Page-2 density is kept in
  // budget by truncating the notes (≤450 chars) and disclaimer below.
  const comparables = Array.isArray(reportData.comparableYachts) ? reportData.comparableYachts : [];
  const factors = Array.isArray(reportData.valuationFactors) ? reportData.valuationFactors : [];
  let evidenceStarted = false;
  if (comparables.length) {
    body.push({
      kind: "table",
      heading: d["comparables"]!,
      breakBefore: true,
      columns: [{}, { align: "right", widthPct: 28 }],
      rows: comparableRows(comparables, d, money),
    });
    evidenceStarted = true;
  }
  if (factors.length) {
    body.push({
      kind: "table",
      heading: d["factors"]!,
      ...(evidenceStarted ? {} : { breakBefore: true }),
      columns: [{}, { align: "right", widthPct: 30 }],
      rows: factorRows(factors, d),
    });
    evidenceStarted = true;
  }

  // ── Closing group (Market Notes + Contact + Disclaimer) on page 2 ──
  // Market Notes capped at ~450 chars / 4 lines for density (full value stays in
  // the data — this only limits what the PDF prints).
  const notes: ContentNode = {
    kind: "paragraph",
    heading: d["marketNotes"]!,
    panel: true,
    text: reportData.marketNotes ? truncateText(reportData.marketNotes, 450) : "",
    emptyText: d["none"]!,
  };
  if (!evidenceStarted) notes.breakBefore = true;
  body.push(notes);

  // Contact
  const broker = settings.brokerInfo ?? null;
  const contactRows: { label: string; value: string }[] = [];
  if (broker?.name) contactRows.push({ label: "Name", value: broker.name });
  if (broker?.company) contactRows.push({ label: "Company", value: broker.company });
  if (broker?.phone) contactRows.push({ label: "Phone", value: broker.phone });
  if (broker?.email) contactRows.push({ label: "Email", value: broker.email });
  if (broker?.website) contactRows.push({ label: "Website", value: broker.website });
  if (contactRows.length) {
    body.push({ kind: "keyValue", heading: d["contact"]!, rows: contactRows });
  }

  return {
    meta: {
      type: "valuation_report",
      brand,
      title: d["report"]!,
      language: settings.language ?? "english",
      confidential: settings.confidential === true,
      watermarkText: d["confidential"]!,
      generatedAt: date,
      disclaimer:
        typeof reportData.legalDisclaimer === "string" && reportData.legalDisclaimer.trim()
          ? truncateText(reportData.legalDisclaimer, 300)
          : "Indicative · not certified · valid 30 days from issue.",
    },
    theme,
    cover,
    body,
  };
}
