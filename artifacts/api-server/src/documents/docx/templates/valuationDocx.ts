import {
  AlignmentType,
  BorderStyle,
  Document,
  HeadingLevel,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";
import type {
  ComparableYacht,
  ExportSettings,
  ValuationFactor,
  ValuationReportData,
  YachtProfile,
} from "../../documentTypes";

const NAVY = "0B1E3F";
const GOLD = "C5973A";
const MUTED = "6B6B6B";
const POS = "1F7A44";
const NEG = "B02A2A";

function n(v: unknown): number | null {
  if (v == null || v === "") return null;
  const x = Number(v);
  return Number.isFinite(x) ? x : null;
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
    const x = n(v);
    if (x == null) return "";
    const amount = Math.round(x).toLocaleString("en-US");
    return sym ? `${sym}${amount}` : `${amount} ${code}`;
  };
}

function confidencePct(v: number | null): number | null {
  if (v == null) return null;
  const pct = v <= 1 ? v * 100 : v;
  return Math.max(0, Math.min(100, Math.round(pct)));
}

function impactColor(impact: string | null | undefined): string {
  const v = (impact ?? "").toString().toLowerCase();
  if (/(^|[^a-z])(pos|positive|\+|up|good|strong)/.test(v)) return POS;
  if (/(^|[^a-z])(neg|negative|-|down|weak|poor)/.test(v)) return NEG;
  return MUTED;
}

function heading(text: string): Paragraph {
  return new Paragraph({
    spacing: { before: 280, after: 140 },
    border: { bottom: { color: GOLD, size: 6, style: BorderStyle.SINGLE, space: 4 } },
    children: [
      new TextRun({
        text: text.toUpperCase(),
        bold: true,
        color: GOLD,
        size: 22,
        font: "Calibri",
      }),
    ],
  });
}

function kvTable(rows: [string, string][]): Table {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 2, color: "E6E1D8" },
      insideVertical: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
    },
    rows: rows.map(
      ([k, v]) =>
        new TableRow({
          children: [
            new TableCell({
              width: { size: 38, type: WidthType.PERCENTAGE },
              children: [
                new Paragraph({
                  children: [
                    new TextRun({ text: k.toUpperCase(), color: GOLD, size: 16, bold: true }),
                  ],
                }),
              ],
            }),
            new TableCell({
              width: { size: 62, type: WidthType.PERCENTAGE },
              children: [
                new Paragraph({
                  children: [new TextRun({ text: v, color: "1A1A1A", size: 20 })],
                }),
              ],
            }),
          ],
        }),
    ),
  });
}

function specPairs(y: YachtProfile): [string, string][] {
  const rows: [string, string][] = [];
  const add = (k: string, v: unknown, suffix = "") => {
    if (v != null && v !== "") rows.push([k, `${v}${suffix}`]);
  };
  add("Builder", y.builder);
  add("Model", y.model);
  add("Type", y.yacht_type);
  add("Year built", y.year_built);
  add("Length", n(y.length_meters), n(y.length_meters) != null ? " m" : "");
  add("Beam", n(y.beam_meters), n(y.beam_meters) != null ? " m" : "");
  add("Draft", n(y.draft_meters), n(y.draft_meters) != null ? " m" : "");
  add("Hull material", y.hull_material);
  add("Flag", y.flag);
  add("Home port", y.home_port);
  add("Registration", y.registration_number);
  add("IMO", y.imo_number);
  add("VAT status", y.vat_status);
  add("Engine maker", y.engine_maker);
  add("Engine model", y.engine_model);
  add("Engines", y.engine_count);
  add("Total HP", y.total_hp);
  add("Engine hours", y.engine_hours);
  add("Max speed", n(y.max_speed_knots), n(y.max_speed_knots) != null ? " kn" : "");
  add(
    "Cruising speed",
    n(y.cruising_speed_knots),
    n(y.cruising_speed_knots) != null ? " kn" : "",
  );
  add("Range", n(y.range_nm), n(y.range_nm) != null ? " nm" : "");
  return rows;
}

function accomPairs(y: YachtProfile): [string, string][] {
  const rows: [string, string][] = [];
  const add = (k: string, v: unknown) => {
    if (v != null && v !== "") rows.push([k, String(v)]);
  };
  add("Guest cabins", y.cabins);
  add("Guests sleeping", y.guests);
  add("Berths", y.berths);
  add("Heads", y.heads);
  add("Crew", y.crew);
  add("Crew cabins", y.crew_cabins);
  return rows;
}

function comparableBlocks(
  items: ComparableYacht[],
  fallbackMoney: (v: unknown) => string,
): Paragraph[] {
  const out: Paragraph[] = [];
  for (const c of items) {
    const title =
      [c.name, c.builder, c.model].filter((x) => x != null && x !== "").join(" · ") ||
      "Comparable";
    const meta: string[] = [];
    if (c.year != null) meta.push(String(c.year));
    if (n(c.length_meters) != null) meta.push(`${n(c.length_meters)} m`);
    if (c.location) meta.push(String(c.location));
    const priceMoney = c.currency ? moneyOf(c.currency) : fallbackMoney;
    const price = n(c.price) != null ? priceMoney(c.price) : "—";
    out.push(
      new Paragraph({
        spacing: { before: 120, after: 20 },
        children: [
          new TextRun({ text: title, bold: true, color: NAVY, size: 20 }),
          new TextRun({ text: `   ${price}`, bold: true, color: GOLD, size: 20 }),
        ],
      }),
    );
    const subBits = [meta.join(" · "), c.notes ? String(c.notes) : "", c.source ? String(c.source) : ""]
      .filter((x) => x)
      .join("  —  ");
    if (subBits) {
      out.push(
        new Paragraph({
          spacing: { after: 40 },
          children: [new TextRun({ text: subBits, color: MUTED, size: 18 })],
        }),
      );
    }
  }
  return out;
}

function factorBlocks(items: ValuationFactor[]): Paragraph[] {
  const out: Paragraph[] = [];
  for (const f of items) {
    const runs: TextRun[] = [
      new TextRun({ text: f.factor ?? "Factor", bold: true, color: "1A1A1A", size: 20 }),
    ];
    if (f.impact) {
      runs.push(
        new TextRun({
          text: `  [${f.impact}]`,
          bold: true,
          color: impactColor(f.impact),
          size: 18,
        }),
      );
    }
    if (n(f.weight) != null) {
      runs.push(new TextRun({ text: `  (${n(f.weight)})`, color: MUTED, size: 18 }));
    }
    out.push(new Paragraph({ bullet: { level: 0 }, children: runs }));
    if (f.notes) {
      out.push(
        new Paragraph({
          spacing: { after: 20 },
          indent: { left: 360 },
          children: [new TextRun({ text: String(f.notes), color: MUTED, size: 18 })],
        }),
      );
    }
  }
  return out;
}

export function buildValuationDocx(input: {
  yacht: YachtProfile;
  reportData: ValuationReportData;
  settings: ExportSettings;
}): Document {
  const { yacht, reportData, settings } = input;
  const brand = settings.branding ?? settings.brand_name ?? "Yachtworth";
  const money = moneyOf(reportData.currency);
  const subtitle = [yacht.builder, yacht.model, yacht.year_built]
    .filter((x) => x != null && x !== "")
    .join(" · ");

  const children: (Paragraph | Table)[] = [];

  // title block
  children.push(
    new Paragraph({
      spacing: { after: 20 },
      children: [
        new TextRun({
          text: `${brand.toUpperCase()} · VALUATION REPORT`,
          color: GOLD,
          bold: true,
          size: 18,
        }),
      ],
    }),
    new Paragraph({
      heading: HeadingLevel.TITLE,
      spacing: { after: 40 },
      children: [new TextRun({ text: yacht.name, bold: true, color: NAVY, size: 48 })],
    }),
  );
  if (subtitle) {
    children.push(
      new Paragraph({
        spacing: { after: 120 },
        children: [new TextRun({ text: subtitle, color: MUTED, size: 22 })],
      }),
    );
  }

  // yacht summary
  children.push(heading("Specifications"));
  const specs = specPairs(yacht);
  if (specs.length) children.push(kvTable(specs));
  const accom = accomPairs(yacht);
  if (accom.length) {
    children.push(heading("Accommodation"));
    children.push(kvTable(accom));
  }

  // valuation result
  children.push(heading("Valuation Result"));
  const valRows: [string, string][] = [];
  if (n(reportData.estimatedValueLow) != null)
    valRows.push(["Low estimate", money(reportData.estimatedValueLow)]);
  if (n(reportData.estimatedValueMid) != null)
    valRows.push(["Mid estimate", money(reportData.estimatedValueMid)]);
  if (n(reportData.estimatedValueHigh) != null)
    valRows.push(["High estimate", money(reportData.estimatedValueHigh)]);
  const conf = confidencePct(n(reportData.confidenceScore));
  if (conf != null) valRows.push(["Confidence", `${conf}%`]);
  if (valRows.length) children.push(kvTable(valRows));
  else
    children.push(
      new Paragraph({ children: [new TextRun({ text: "—", color: MUTED, size: 20 })] }),
    );

  // comparables
  const comparables = Array.isArray(reportData.comparableYachts)
    ? reportData.comparableYachts
    : [];
  if (comparables.length) {
    children.push(heading("Comparable Yachts"));
    children.push(...comparableBlocks(comparables, money));
  }

  // factors
  const factors = Array.isArray(reportData.valuationFactors)
    ? reportData.valuationFactors
    : [];
  if (factors.length) {
    children.push(heading("Valuation Factors"));
    children.push(...factorBlocks(factors));
  }

  // market notes
  if (reportData.marketNotes) {
    children.push(heading("Market Notes"));
    for (const line of String(reportData.marketNotes).split("\n")) {
      children.push(
        new Paragraph({ children: [new TextRun({ text: line, size: 20, color: "1A1A1A" })] }),
      );
    }
  }

  // prepared by
  const broker = settings.brokerInfo ?? null;
  const contact: [string, string][] = [];
  if (broker?.name) contact.push(["Name", broker.name]);
  if (broker?.company) contact.push(["Company", broker.company]);
  if (broker?.phone) contact.push(["Phone", broker.phone]);
  if (broker?.email) contact.push(["Email", broker.email]);
  if (broker?.website) contact.push(["Website", broker.website]);
  if (contact.length) {
    children.push(heading("Prepared By"));
    children.push(kvTable(contact));
  }

  // disclaimer
  children.push(
    new Paragraph({
      spacing: { before: 320 },
      alignment: AlignmentType.LEFT,
      children: [
        new TextRun({
          text: "Indicative · not certified · valid 30 days from issue.",
          italics: true,
          color: MUTED,
          size: 16,
        }),
      ],
    }),
  );

  return new Document({
    creator: brand,
    title: `${yacht.name} — Valuation Report`,
    sections: [
      {
        properties: {
          page: { margin: { top: 1000, bottom: 1000, left: 1000, right: 1000 } },
        },
        children,
      },
    ],
  });
}
