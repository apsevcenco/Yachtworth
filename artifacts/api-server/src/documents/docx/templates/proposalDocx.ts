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
  ExportSettings,
  ProposalEquipmentItem,
  ProposalReportData,
  YachtProfile,
} from "../../documentTypes";

const NAVY = "0B1E3F";
const GOLD = "C5973A";
const MUTED = "6B6B6B";

function n(v: unknown): number | null {
  if (v == null || v === "") return null;
  const x = Number(v);
  return Number.isFinite(x) ? x : null;
}

function money(v: number | null | undefined): string {
  if (v == null) return "";
  return "€ " + Math.round(v).toLocaleString("en-US");
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

function equipDetail(it: ProposalEquipmentItem): string {
  const bits: string[] = [];
  if (it.brand) bits.push(String(it.brand));
  if (it.model) bits.push(String(it.model));
  if (it.quantity != null) bits.push(`×${it.quantity}`);
  if (it.power_kw != null) bits.push(`${it.power_kw} kW`);
  if (it.power_hp != null) bits.push(`${it.power_hp} HP`);
  if (it.capacity_persons != null) bits.push(`${it.capacity_persons} pax`);
  if (it.year_installed != null) bits.push(`${it.year_installed}`);
  return bits.join(" · ");
}

function equipmentBlocks(items: ProposalEquipmentItem[]): Paragraph[] {
  if (!items.length) return [];
  const byCat = new Map<string, ProposalEquipmentItem[]>();
  for (const it of items) {
    const cat = (it.category ?? "Other").toString();
    const arr = byCat.get(cat) ?? [];
    arr.push(it);
    byCat.set(cat, arr);
  }
  const out: Paragraph[] = [];
  for (const [cat, list] of byCat) {
    out.push(
      new Paragraph({
        spacing: { before: 140, after: 40 },
        children: [new TextRun({ text: cat.toUpperCase(), bold: true, color: NAVY, size: 18 })],
      }),
    );
    for (const it of list) {
      const detail = equipDetail(it);
      out.push(
        new Paragraph({
          bullet: { level: 0 },
          children: [
            new TextRun({ text: it.equipment_type ?? "Item", size: 20, color: "1A1A1A" }),
            ...(detail
              ? [new TextRun({ text: `  —  ${detail}`, size: 18, color: MUTED })]
              : []),
          ],
        }),
      );
    }
  }
  return out;
}

export function buildProposalDocx(input: {
  yacht: YachtProfile;
  reportData: ProposalReportData;
  settings: ExportSettings;
}): Document {
  const { yacht, reportData, settings } = input;
  const ptype = reportData.proposal_type ?? "sale";
  const brand = settings.brand_name ?? "Yachtworth";
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
          text: `${brand.toUpperCase()} · VESSEL PROPOSAL`,
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

  // specifications
  children.push(heading("Specifications"));
  const specs = specPairs(yacht);
  if (specs.length) children.push(kvTable(specs));

  // accommodation
  const accom = accomPairs(yacht);
  if (accom.length) {
    children.push(heading("Accommodation"));
    children.push(kvTable(accom));
  }

  // equipment
  const equip = Array.isArray(reportData.equipment) ? reportData.equipment : [];
  if (equip.length) {
    children.push(heading("Equipment & Inventory"));
    children.push(...equipmentBlocks(equip));
  }

  // pricing
  const priceRows: [string, string][] = [];
  if (ptype === "sale" || ptype === "both") {
    priceRows.push([
      "For sale",
      reportData.price_on_application
        ? "Price on application"
        : reportData.sale_price_eur != null
          ? money(reportData.sale_price_eur)
          : "Price on application",
    ]);
  }
  if (ptype === "charter" || ptype === "both") {
    let v = "Price on application";
    if (!reportData.charter_on_application) {
      const lo = reportData.charter_low_eur_week;
      const hi = reportData.charter_high_eur_week;
      if (lo != null && hi != null && lo !== hi) v = `${money(lo)} – ${money(hi)} / week`;
      else if (hi != null) v = `${money(hi)} / week`;
      else if (lo != null) v = `${money(lo)} / week`;
    }
    priceRows.push(["For charter", v]);
    if (reportData.charter_apa_pct != null)
      priceRows.push(["APA", `${reportData.charter_apa_pct}%`]);
    if (reportData.charter_vat_pct != null)
      priceRows.push(["VAT", `${reportData.charter_vat_pct}%`]);
    if (reportData.charter_area) priceRows.push(["Charter area", reportData.charter_area]);
  }
  if (reportData.delivery) priceRows.push(["Delivery", reportData.delivery]);
  if (reportData.sea_trial) priceRows.push(["Sea trial", reportData.sea_trial]);
  if (priceRows.length) {
    children.push(heading("Pricing"));
    children.push(kvTable(priceRows));
  }

  if (reportData.notes) {
    children.push(heading("Notes"));
    children.push(
      new Paragraph({ children: [new TextRun({ text: reportData.notes, size: 20 })] }),
    );
  }

  // broker contact
  const contact: [string, string][] = [];
  if (reportData.broker_name) contact.push(["Broker", reportData.broker_name]);
  if (reportData.broker_company) contact.push(["Company", reportData.broker_company]);
  if (reportData.broker_phone) contact.push(["Phone", reportData.broker_phone]);
  if (reportData.broker_email) contact.push(["Email", reportData.broker_email]);
  if (reportData.broker_website) contact.push(["Website", reportData.broker_website]);
  if (contact.length) {
    children.push(heading("Broker Contact"));
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
    title: `${yacht.name} — Proposal`,
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
