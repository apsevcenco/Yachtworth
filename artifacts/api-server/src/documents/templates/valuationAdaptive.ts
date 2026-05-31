import type {
  ComparableYacht,
  DocumentTemplate,
  ExportSettings,
  ValuationFactor,
  ValuationReportData,
  YachtProfile,
} from "../documentTypes";
import { getTheme } from "../core/theme";
import { paginateBlocks } from "../core/paginateBlocks";
import { renderBlocksToHtml } from "../core/renderBlocksToHtml";
import type { DocBlock } from "../core/types";
import { chunk, esc, num, photoList } from "../core/util";
import { CoverBlock } from "../blocks/CoverBlock";
import { YachtSummaryBlock } from "../blocks/YachtSummaryBlock";
import { ValuationRangeBlock } from "../blocks/ValuationRangeBlock";
import {
  ComparableYachtsBlock,
  type ComparableRow,
} from "../blocks/ComparableYachtsBlock";
import { FactorsBlock, type FactorRow } from "../blocks/FactorsBlock";
import { NotesBlock } from "../blocks/NotesBlock";
import { ContactBlock } from "../blocks/ContactBlock";
import { DisclaimerBlock } from "../blocks/DisclaimerBlock";
import type { MetricCard } from "../blocks/MetricCardsBlock";

// ─── currency / confidence ─────────────────────────────────────────────────────

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
    // `code` is caller-supplied (reportData.currency / comparable.currency) — escape
    // it before interpolating to keep the HTML boundary sound. Symbols are from a
    // fixed internal map and are safe.
    return sym ? `${sym}${amount}` : `${amount} ${esc(code)}`;
  };
}

function confidencePct(v: number | null): number | null {
  if (v == null) return null;
  const pct = v <= 1 ? v * 100 : v;
  return Math.max(0, Math.min(100, Math.round(pct)));
}

function impactClass(impact: string | null | undefined): string {
  const v = (impact ?? "").toString().toLowerCase();
  if (/(^|[^a-z])(pos|positive|\+|up|good|strong)/.test(v)) return "imp-pos";
  if (/(^|[^a-z])(neg|negative|-|down|weak|poor)/.test(v)) return "imp-neg";
  return "imp-neu";
}

// ─── labels (multi-language, valuation subset) ─────────────────────────────────

type Dict = Record<string, string>;
const LABELS: Record<string, Dict> = {
  english: {
    report: "VALUATION REPORT",
    yachtSummary: "Yacht Summary",
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
    confidential: "CONFIDENTIAL",
    none: "—",
  },
  french: {
    report: "RAPPORT D'ÉVALUATION",
    yachtSummary: "Résumé du Navire",
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
    confidential: "CONFIDENTIEL",
    none: "—",
  },
  italian: {
    report: "RAPPORTO DI VALUTAZIONE",
    yachtSummary: "Riepilogo Imbarcazione",
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
    confidential: "RISERVATO",
    none: "—",
  },
  spanish: {
    report: "INFORME DE VALORACIÓN",
    yachtSummary: "Resumen de la Embarcación",
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
    confidential: "CONFIDENCIAL",
    none: "—",
  },
  german: {
    report: "BEWERTUNGSBERICHT",
    yachtSummary: "Schiffsübersicht",
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
    confidential: "VERTRAULICH",
    none: "—",
  },
  russian: {
    report: "ОТЧЁТ ОБ ОЦЕНКЕ",
    yachtSummary: "Сводка по Яхте",
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
  const push = (label: string, value: unknown, suffix = ""): void => {
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
  const push = (label: string, value: unknown): void => {
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

// ─── builders ──────────────────────────────────────────────────────────────────

function buildComparableBlocks(
  items: ComparableYacht[],
  d: Dict,
  fallbackMoney: (v: unknown) => string,
): DocBlock[] {
  if (!items.length) return [];
  const pages = chunk(items, 10);
  return pages.map((group, idx) => {
    const rows: ComparableRow[] = group.map((c) => {
      const title =
        [c.name, c.builder, c.model]
          .filter((x) => x != null && x !== "")
          .map((x) => esc(x))
          .join(" · ") || esc(d["none"]);
      const meta: string[] = [];
      if (c.year != null) meta.push(esc(c.year));
      if (num(c.length_meters) != null) meta.push(`${num(c.length_meters)} m`);
      if (c.location) meta.push(esc(c.location));
      const sub = [meta.join(" · "), c.notes ? esc(c.notes) : ""]
        .filter((x) => x)
        .join(" — ");
      const priceMoney = c.currency ? moneyOf(c.currency) : fallbackMoney;
      const price = num(c.price) != null ? priceMoney(c.price) : esc(d["none"]);
      const row: ComparableRow = { title, price };
      if (sub) row.sub = sub;
      if (c.source) row.source = esc(c.source);
      return row;
    });
    const heading = `${esc(d["comparables"])}${
      pages.length > 1 ? ` — ${idx + 1}/${pages.length}` : ""
    }`;
    return ComparableYachtsBlock({ id: `comparables-${idx}`, heading, rows });
  });
}

function buildFactorBlocks(items: ValuationFactor[], d: Dict): DocBlock[] {
  if (!items.length) return [];
  const pages = chunk(items, 12);
  return pages.map((group, idx) => {
    const rows: FactorRow[] = group.map((f) => {
      const row: FactorRow = { name: esc(f.factor ?? d["none"]) };
      if (f.notes) row.note = esc(f.notes);
      if (f.impact) row.chip = { text: esc(f.impact), cls: impactClass(f.impact) };
      if (num(f.weight) != null) row.weight = String(num(f.weight));
      return row;
    });
    const heading = `${esc(d["factors"])}${
      pages.length > 1 ? ` — ${idx + 1}/${pages.length}` : ""
    }`;
    return FactorsBlock({ id: `factors-${idx}`, heading, rows });
  });
}

// ─── main ──────────────────────────────────────────────────────────────────────

/**
 * Adaptive (block-based) valuation report — PDF HTML.
 *
 * Opt-in via `exportSettings.engine: "adaptive"`. Produces the same content as
 * the legacy valuation template but packs blocks onto pages to avoid the
 * "one section per page" empty-space problem.
 */
export function buildValuationAdaptiveHtml(input: {
  yacht: YachtProfile;
  reportData: ValuationReportData;
  settings: ExportSettings;
  template: DocumentTemplate;
}): string {
  const { yacht, reportData, settings, template } = input;
  const theme = getTheme(template);
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

  // ── cover ──
  const subtitleBits = [yacht.builder, yacht.model, yacht.year_built]
    .filter((x) => x != null && x !== "")
    .map((x) => esc(x))
    .join(" · ");

  const coverCells: { label: string; value: string }[] = [];
  if (yacht.year_built != null)
    coverCells.push({ label: "Year", value: esc(yacht.year_built) });
  if (num(yacht.length_meters) != null)
    coverCells.push({ label: "Length", value: `${num(yacht.length_meters)} m` });
  if (yacht.guests != null)
    coverCells.push({ label: "Guests", value: esc(yacht.guests) });
  if (yacht.cabins != null)
    coverCells.push({ label: "Cabins", value: esc(yacht.cabins) });
  if (yacht.flag) coverCells.push({ label: "Flag", value: esc(yacht.flag) });

  const coverPrice =
    num(reportData.estimatedValueMid) != null ? money(reportData.estimatedValueMid) : "";

  const coverInput: Parameters<typeof CoverBlock>[0] = {
    eyebrow: `${esc(brand)} · ${esc(d["report"])}`,
    name: esc(yacht.name),
    date: esc(date),
    cells: coverCells,
  };
  if (cover) coverInput.coverPhoto = esc(cover);
  if (subtitleBits) coverInput.subtitle = subtitleBits;
  if (coverPrice) coverInput.price = coverPrice;

  // ── valuation result ──
  const lo = num(reportData.estimatedValueLow);
  const mid = num(reportData.estimatedValueMid);
  const hi = num(reportData.estimatedValueHigh);
  const conf = confidencePct(num(reportData.confidenceScore));
  const cards: MetricCard[] = [
    { label: esc(d["low"]), value: lo != null ? money(lo) : esc(d["none"]) },
    { label: esc(d["mid"]), value: mid != null ? money(mid) : esc(d["none"]), emphasis: true },
    { label: esc(d["high"]), value: hi != null ? money(hi) : esc(d["none"]) },
  ];
  const valuationInput: Parameters<typeof ValuationRangeBlock>[0] = {
    heading: esc(d["valuation"]),
    valueHeading: esc(d["estimatedValue"]),
    cards,
  };
  if (conf != null) valuationInput.confidence = { label: esc(d["confidence"]), pct: conf };

  // ── notes + contact ──
  const notesInput: Parameters<typeof NotesBlock>[0] = {
    heading: esc(d["marketNotes"]),
    emptyText: esc(d["none"]),
  };
  if (reportData.marketNotes) {
    notesInput.bodyHtml = esc(reportData.marketNotes).replace(/\n/g, "<br/>");
  }

  const broker = settings.brokerInfo ?? null;
  const contactRows: [string, string][] = [];
  if (broker?.name) contactRows.push(["Name", esc(broker.name)]);
  if (broker?.company) contactRows.push(["Company", esc(broker.company)]);
  if (broker?.phone) contactRows.push(["Phone", esc(broker.phone)]);
  if (broker?.email) contactRows.push(["Email", esc(broker.email)]);
  if (broker?.website) contactRows.push(["Website", esc(broker.website)]);

  const comparables = Array.isArray(reportData.comparableYachts)
    ? reportData.comparableYachts
    : [];
  const factors = Array.isArray(reportData.valuationFactors)
    ? reportData.valuationFactors
    : [];

  // ── assemble ordered block list ──
  const contactBlock = ContactBlock({ heading: esc(d["contact"]), rows: contactRows });
  const blocks: DocBlock[] = [
    CoverBlock(coverInput),
    YachtSummaryBlock({
      heading: esc(d["yachtSummary"]),
      accommodationHeading: esc(d["accommodation"]),
      specRows: specRows(yacht),
      accommodationRows: accomRows(yacht),
      emptyText: esc(d["none"]),
    }),
    ValuationRangeBlock(valuationInput),
    ...buildComparableBlocks(comparables, d, money),
    ...buildFactorBlocks(factors, d),
    NotesBlock(notesInput),
    ...(contactBlock ? [contactBlock] : []),
    DisclaimerBlock({ text: "Indicative · not certified · valid 30 days from issue." }),
  ];

  const pages = paginateBlocks(blocks);

  return renderBlocksToHtml({
    pages,
    theme,
    confidential,
    watermarkText: esc(d["confidential"]),
  });
}
