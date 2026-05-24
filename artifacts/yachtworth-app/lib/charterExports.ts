import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system/legacy";
import type { Charter, Yacht } from "@workspace/api-client-react";

const NAVY = "#0B1E3F";
const NAVY_DEEP = "#081633";
const NAVY_ELEV = "#142A52";
const GOLD = "#C9A961";
const IVORY = "#F7F3EC";
const MUTED = "rgba(247,243,236,0.6)";
const DIVIDER = "rgba(247,243,236,0.1)";
const GREEN = "#3FB68B";
const RED = "#E74C3C";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function eur(n: number): string {
  return (
    "€ " +
    n.toLocaleString("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })
  );
}

function eur2(n: number): string {
  return (
    "€ " +
    n.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

const SHORT_MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

// Parse YYYY-MM-DD as plain date — no Date() / timezone shift.
function fmtDate(s: string | null | undefined): string {
  if (!s) return "—";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (!m) return s;
  const yyyy = m[1]!;
  const mm = parseInt(m[2]!, 10);
  const dd = m[3]!;
  const month = SHORT_MONTHS[mm - 1] ?? "";
  return `${dd} ${month} ${yyyy}`;
}

function fmtDateIso(s: string | null | undefined): string {
  if (!s) return "";
  const m = /^(\d{4}-\d{2}-\d{2})/.exec(s);
  return m ? m[1]! : "";
}

function daysBetween(a: string, b: string): number {
  const start = new Date(a + "T00:00:00Z").getTime();
  const end = new Date(b + "T00:00:00Z").getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return 0;
  return Math.round((end - start) / 86400000) + 1;
}

export interface CharterPnl {
  days: number;
  gross_revenue: number;
  vat_amount: number;
  net_revenue: number;
  fuel_cost: number;
  captain_total: number;
  stew_total: number;
  extra_crew: number;
  total_crew: number;
  port_fees: number;
  provisioning: number;
  cleaning: number;
  other_expenses: number;
  total_expenses: number;
  net_profit: number;
  margin: number;
}

export function computeCharterPnl(c: Charter): CharterPnl {
  const days = daysBetween(c.start_date, c.end_date);
  const rate = c.charter_rate ?? 0;
  const gross_revenue = c.charter_rate_type === "per_day" ? rate * days : rate;
  const vat_pct = c.vat_percent ?? 0;
  const vat_amount =
    c.vat_applicable && vat_pct > 0
      ? (gross_revenue * vat_pct) / (100 + vat_pct)
      : 0;
  const net_revenue = gross_revenue - vat_amount;
  const fuel_cost = (c.fuel_liters ?? 0) * (c.fuel_price_per_liter ?? 0);
  const captain_total = (c.captain_day_rate ?? 0) * days;
  const stew_total = c.stewardess_count * (c.stewardess_day_rate ?? 0) * days;
  const extra_crew = c.extra_crew_cost ?? 0;
  const total_crew = captain_total + stew_total + extra_crew;
  const port_fees = c.port_fees ?? 0;
  const provisioning = c.provisioning ?? 0;
  const cleaning = c.cleaning ?? 0;
  const other_expenses = c.other_expenses ?? 0;
  const total_expenses = port_fees + provisioning + cleaning + other_expenses;
  const net_profit = net_revenue - total_crew - fuel_cost - total_expenses;
  const margin = net_revenue > 0 ? (net_profit / net_revenue) * 100 : 0;
  return {
    days,
    gross_revenue,
    vat_amount,
    net_revenue,
    fuel_cost,
    captain_total,
    stew_total,
    extra_crew,
    total_crew,
    port_fees,
    provisioning,
    cleaning,
    other_expenses,
    total_expenses,
    net_profit,
    margin,
  };
}

function yachtTitle(y: Yacht | null | undefined): string {
  if (!y) return "Yacht";
  if (y.name && y.name.trim()) return y.name.trim();
  const parts = [y.brand, y.model].filter(
    (s): s is string => Boolean(s) && s!.trim().length > 0,
  );
  if (parts.length === 0) return "Yacht";
  return parts.join(" ");
}

// ───────────────────────────────────────────────────────────────────────────
// PER-CHARTER PDF
// ───────────────────────────────────────────────────────────────────────────

const PDF_BASE_STYLE = `
  @page { size: A4; margin: 22mm 16mm; }
  * { box-sizing: border-box; }
  body {
    font-family: -apple-system, "Helvetica Neue", Helvetica, Arial, sans-serif;
    color: ${IVORY}; background: ${NAVY}; margin: 0; padding: 0;
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }
  .wrap { padding: 24px 28px 32px; }
  .brand-row {
    display: flex; align-items: center; justify-content: space-between;
    border-bottom: 1px solid ${DIVIDER}; padding-bottom: 12px; margin-bottom: 20px;
  }
  .brand { color: ${GOLD}; font-size: 11px; letter-spacing: 4px; text-transform: uppercase; font-weight: 700; }
  .date { color: ${MUTED}; font-size: 10px; letter-spacing: 1px; text-transform: uppercase; }
  h1 { color: ${IVORY}; font-size: 24px; line-height: 1.2; margin: 0 0 6px; font-weight: 800; letter-spacing: -0.4px; }
  .subtitle { color: ${MUTED}; font-size: 13px; margin-bottom: 18px; }
  h2 { color: ${IVORY}; font-size: 11px; letter-spacing: 2px; text-transform: uppercase;
       margin: 20px 0 10px; font-weight: 700; }
  .card {
    background: ${NAVY_ELEV}; border: 1px solid ${DIVIDER};
    border-radius: 10px; padding: 14px 16px; margin-bottom: 12px;
  }
  .row { display: flex; justify-content: space-between; color: ${IVORY}; font-size: 12px;
         line-height: 1.7; padding: 2px 0; }
  .row .k { color: ${MUTED}; }
  .row .v { color: ${IVORY}; font-weight: 600; }
  .row .v.gold { color: ${GOLD}; }
  .row.divider { border-top: 1px solid ${DIVIDER}; margin-top: 6px; padding-top: 8px; }
  .footer {
    margin-top: 24px; padding-top: 12px; border-top: 1px solid ${DIVIDER};
    color: ${MUTED}; font-size: 9px; line-height: 1.5; text-align: center;
  }
`;

const STATUS_LABEL: Record<string, string> = {
  confirmed: "Confirmed",
  tentative: "Tentative",
  maintenance: "Maintenance",
  blocked: "Blocked",
  cancelled: "Cancelled",
};

export function buildCharterPdfHtml(
  charter: Charter,
  yacht: Yacht | null,
): string {
  const p = computeCharterPnl(charter);
  const today = new Date().toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  const yTitle = yachtTitle(yacht);
  const range = `${fmtDate(charter.start_date)} — ${fmtDate(charter.end_date)} · ${p.days} day${p.days === 1 ? "" : "s"}`;
  const statusLbl = STATUS_LABEL[charter.status] ?? charter.status;
  const rateLine =
    charter.charter_rate_type === "per_day"
      ? `${eur(charter.charter_rate ?? 0)} / day × ${p.days} days`
      : `Fixed price ${eur(charter.charter_rate ?? 0)}`;

  const profitColor = p.net_profit >= 0 ? GREEN : RED;

  return `<!doctype html>
<html><head><meta charset="utf-8" />
<title>Charter — ${escapeHtml(yTitle)}</title>
<style>${PDF_BASE_STYLE}
  .hero { background: ${NAVY_DEEP}; border: 1px solid rgba(201,169,97,0.22);
          border-radius: 12px; padding: 20px; margin-bottom: 16px; }
  .hero-label { color: ${GOLD}; font-size: 10px; letter-spacing: 2px;
                text-transform: uppercase; font-weight: 700; margin-bottom: 6px; }
  .hero-profit { color: ${profitColor}; font-size: 30px; font-weight: 800;
                 letter-spacing: -0.5px; line-height: 1; margin-bottom: 8px; }
  .hero-margin { color: ${MUTED}; font-size: 12px; }
  .status-pill { display: inline-block; margin-top: 12px; padding: 4px 12px;
                 border-radius: 999px; border: 1px solid ${GOLD};
                 color: ${GOLD}; font-size: 10px; font-weight: 600;
                 letter-spacing: 1px; text-transform: uppercase; }
</style>
</head><body>
  <div class="wrap">
    <div class="brand-row">
      <div class="brand">YACHTWORTH · CHARTER</div>
      <div class="date">${escapeHtml(today)}</div>
    </div>

    <h1>${escapeHtml(yTitle)}</h1>
    <div class="subtitle">${escapeHtml(range)}</div>

    <div class="hero">
      <div class="hero-label">Net profit</div>
      <div class="hero-profit">${escapeHtml(eur2(p.net_profit))}</div>
      <div class="hero-margin">Margin ${p.margin.toFixed(1)}% on net revenue ${escapeHtml(eur(p.net_revenue))}</div>
      <div class="status-pill">${escapeHtml(statusLbl)}</div>
    </div>

    <h2>Client</h2>
    <div class="card">
      <div class="row"><span class="k">Name</span><span class="v">${escapeHtml(charter.client_name ?? "—")}</span></div>
      ${charter.client_email ? `<div class="row"><span class="k">Email</span><span class="v">${escapeHtml(charter.client_email)}</span></div>` : ""}
      ${charter.client_phone ? `<div class="row"><span class="k">Phone</span><span class="v">${escapeHtml(charter.client_phone)}</span></div>` : ""}
      ${charter.departure_port ? `<div class="row"><span class="k">Departure port</span><span class="v">${escapeHtml(charter.departure_port)}</span></div>` : ""}
      ${charter.return_port ? `<div class="row"><span class="k">Return port</span><span class="v">${escapeHtml(charter.return_port)}</span></div>` : ""}
    </div>

    <h2>Revenue</h2>
    <div class="card">
      <div class="row"><span class="k">${escapeHtml(rateLine)}</span><span class="v">${escapeHtml(eur(p.gross_revenue))}</span></div>
      ${charter.vat_applicable && p.vat_amount > 0 ? `<div class="row"><span class="k">VAT (${charter.vat_percent}% incl.)</span><span class="v">− ${escapeHtml(eur(p.vat_amount))}</span></div>` : ""}
      <div class="row divider"><span class="k">Net revenue</span><span class="v gold">${escapeHtml(eur(p.net_revenue))}</span></div>
      ${charter.deposit_amount != null ? `<div class="row"><span class="k">Deposit ${charter.deposit_received ? "(received)" : "(due)"}${charter.deposit_date ? " · " + escapeHtml(fmtDate(charter.deposit_date)) : ""}</span><span class="v">${escapeHtml(eur(charter.deposit_amount))}</span></div>` : ""}
      ${charter.final_payment_amount != null ? `<div class="row"><span class="k">Final payment ${charter.final_payment_received ? "(received)" : "(due)"}${charter.final_payment_date ? " · " + escapeHtml(fmtDate(charter.final_payment_date)) : ""}</span><span class="v">${escapeHtml(eur(charter.final_payment_amount))}</span></div>` : ""}
    </div>

    <h2>Crew</h2>
    <div class="card">
      ${p.captain_total > 0 ? `<div class="row"><span class="k">Captain · ${eur(charter.captain_day_rate ?? 0)} × ${p.days}d</span><span class="v">${escapeHtml(eur(p.captain_total))}</span></div>` : ""}
      ${p.stew_total > 0 ? `<div class="row"><span class="k">Stewardess × ${charter.stewardess_count} · ${eur(charter.stewardess_day_rate ?? 0)} × ${p.days}d</span><span class="v">${escapeHtml(eur(p.stew_total))}</span></div>` : ""}
      ${p.extra_crew > 0 ? `<div class="row"><span class="k">Extra crew${charter.extra_crew_note ? " · " + escapeHtml(charter.extra_crew_note) : ""}</span><span class="v">${escapeHtml(eur(p.extra_crew))}</span></div>` : ""}
      ${p.total_crew === 0 ? `<div class="row"><span class="k">No crew costs entered</span><span class="v">—</span></div>` : `<div class="row divider"><span class="k">Total crew</span><span class="v">${escapeHtml(eur(p.total_crew))}</span></div>`}
    </div>

    <h2>Fuel</h2>
    <div class="card">
      ${charter.engine_hours_before != null || charter.engine_hours_after != null ? `<div class="row"><span class="k">Engine hours</span><span class="v">${charter.engine_hours_before ?? "—"} → ${charter.engine_hours_after ?? "—"}</span></div>` : ""}
      ${(charter.fuel_liters ?? 0) > 0 ? `<div class="row"><span class="k">${charter.fuel_liters} L × ${eur2(charter.fuel_price_per_liter ?? 0)}/L</span><span class="v">${escapeHtml(eur(p.fuel_cost))}</span></div>` : `<div class="row"><span class="k">No fuel data entered</span><span class="v">—</span></div>`}
    </div>

    <h2>Other expenses</h2>
    <div class="card">
      ${p.port_fees > 0 ? `<div class="row"><span class="k">Port fees</span><span class="v">${escapeHtml(eur(p.port_fees))}</span></div>` : ""}
      ${p.provisioning > 0 ? `<div class="row"><span class="k">Provisioning</span><span class="v">${escapeHtml(eur(p.provisioning))}</span></div>` : ""}
      ${p.cleaning > 0 ? `<div class="row"><span class="k">Cleaning</span><span class="v">${escapeHtml(eur(p.cleaning))}</span></div>` : ""}
      ${p.other_expenses > 0 ? `<div class="row"><span class="k">Other${charter.other_expenses_note ? " · " + escapeHtml(charter.other_expenses_note) : ""}</span><span class="v">${escapeHtml(eur(p.other_expenses))}</span></div>` : ""}
      ${p.total_expenses === 0 ? `<div class="row"><span class="k">No expenses entered</span><span class="v">—</span></div>` : `<div class="row divider"><span class="k">Total expenses</span><span class="v">${escapeHtml(eur(p.total_expenses))}</span></div>`}
    </div>

    <h2>Profit & loss</h2>
    <div class="card">
      <div class="row"><span class="k">Net revenue</span><span class="v">${escapeHtml(eur(p.net_revenue))}</span></div>
      <div class="row"><span class="k">Crew</span><span class="v">− ${escapeHtml(eur(p.total_crew))}</span></div>
      <div class="row"><span class="k">Fuel</span><span class="v">− ${escapeHtml(eur(p.fuel_cost))}</span></div>
      <div class="row"><span class="k">Other expenses</span><span class="v">− ${escapeHtml(eur(p.total_expenses))}</span></div>
      <div class="row divider"><span class="k">Net profit</span><span class="v" style="color:${profitColor}">${escapeHtml(eur2(p.net_profit))}</span></div>
    </div>

    ${charter.notes ? `<h2>Notes</h2><div class="card"><div class="row"><span class="k" style="color:${IVORY}">${escapeHtml(charter.notes)}</span></div></div>` : ""}

    <div class="footer">
      Indicative P&amp;L based on entered data · Not a certified accounting statement · Yachtworth
    </div>
  </div>
</body></html>`;
}

export async function exportCharterPdf(
  charter: Charter,
  yacht: Yacht | null,
): Promise<void> {
  const html = buildCharterPdfHtml(charter, yacht);
  const { uri } = await Print.printToFileAsync({ html, base64: false });
  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) {
    throw new Error(
      "Sharing is not available on this device. Open the app on iOS or Android to export.",
    );
  }
  await Sharing.shareAsync(uri, {
    mimeType: "application/pdf",
    dialogTitle: "Save charter PDF",
    UTI: "com.adobe.pdf",
  });
}

// ───────────────────────────────────────────────────────────────────────────
// FLEET MONTHLY PDF
// ───────────────────────────────────────────────────────────────────────────

export interface FleetMonthInput {
  monthStart: Date; // first day of month
  yachts: Yacht[];
  charters: Charter[]; // pre-filtered to this month (any overlap)
}

function monthLabel(d: Date): string {
  return d.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
}

export function buildFleetPdfHtml(input: FleetMonthInput): string {
  const { monthStart, yachts, charters } = input;
  const yachtById = new Map(yachts.map((y) => [y.id, y]));

  // Group charters by yacht
  const byYacht = new Map<string, Charter[]>();
  for (const c of charters) {
    const arr = byYacht.get(c.yacht_id) ?? [];
    arr.push(c);
    byYacht.set(c.yacht_id, arr);
  }

  // Fleet totals
  let totGross = 0;
  let totNet = 0;
  let totProfit = 0;
  let totDays = 0;
  let countCharters = 0;
  for (const c of charters) {
    if (c.status === "cancelled" || c.status === "blocked") continue;
    const p = computeCharterPnl(c);
    totGross += p.gross_revenue;
    totNet += p.net_revenue;
    totProfit += p.net_profit;
    totDays += p.days;
    countCharters += 1;
  }

  const today = new Date().toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const yachtSections = [...byYacht.entries()]
    .map(([yid, list]) => {
      const y = yachtById.get(yid);
      const yTitle = yachtTitle(y);
      list.sort((a, b) => a.start_date.localeCompare(b.start_date));
      const rows = list
        .map((c) => {
          const p = computeCharterPnl(c);
          const statusLbl = STATUS_LABEL[c.status] ?? c.status;
          const profitColor = p.net_profit >= 0 ? GREEN : RED;
          return `<tr>
          <td>${escapeHtml(fmtDate(c.start_date))} → ${escapeHtml(fmtDate(c.end_date))}</td>
          <td>${escapeHtml(c.client_name ?? "—")}</td>
          <td class="num">${p.days}</td>
          <td class="num">${escapeHtml(eur(p.gross_revenue))}</td>
          <td class="num">${escapeHtml(eur(p.net_revenue))}</td>
          <td class="num" style="color:${profitColor}">${escapeHtml(eur(p.net_profit))}</td>
          <td>${escapeHtml(statusLbl)}</td>
        </tr>`;
        })
        .join("");
      let yGross = 0,
        yNet = 0,
        yProfit = 0,
        yDays = 0;
      for (const c of list) {
        if (c.status === "cancelled" || c.status === "blocked") continue;
        const p = computeCharterPnl(c);
        yGross += p.gross_revenue;
        yNet += p.net_revenue;
        yProfit += p.net_profit;
        yDays += p.days;
      }
      return `
      <h2>${escapeHtml(yTitle)}</h2>
      <table>
        <thead><tr>
          <th>Dates</th><th>Client</th>
          <th class="num">Days</th><th class="num">Gross</th>
          <th class="num">Net</th><th class="num">Profit</th>
          <th>Status</th>
        </tr></thead>
        <tbody>${rows}</tbody>
        <tfoot><tr>
          <td colspan="2"><strong>Subtotal</strong></td>
          <td class="num"><strong>${yDays}</strong></td>
          <td class="num"><strong>${escapeHtml(eur(yGross))}</strong></td>
          <td class="num"><strong>${escapeHtml(eur(yNet))}</strong></td>
          <td class="num"><strong style="color:${yProfit >= 0 ? GREEN : RED}">${escapeHtml(eur(yProfit))}</strong></td>
          <td></td>
        </tr></tfoot>
      </table>`;
    })
    .join("");

  const totProfitColor = totProfit >= 0 ? GREEN : RED;

  return `<!doctype html>
<html><head><meta charset="utf-8" />
<title>Fleet report — ${escapeHtml(monthLabel(monthStart))}</title>
<style>${PDF_BASE_STYLE}
  .hero { background: ${NAVY_DEEP}; border: 1px solid rgba(201,169,97,0.22);
          border-radius: 12px; padding: 18px; margin-bottom: 18px;
          display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 14px; }
  .kpi-label { color: ${MUTED}; font-size: 10px; letter-spacing: 1.5px;
               text-transform: uppercase; font-weight: 600; }
  .kpi-value { color: ${IVORY}; font-size: 18px; font-weight: 800;
               margin-top: 4px; letter-spacing: -0.3px; }
  .kpi-value.gold { color: ${GOLD}; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 14px;
          background: ${NAVY_ELEV}; border-radius: 8px; overflow: hidden; }
  th, td { padding: 8px 10px; font-size: 11px; color: ${IVORY};
           border-bottom: 1px solid ${DIVIDER}; text-align: left; }
  th { color: ${GOLD}; font-size: 9px; letter-spacing: 1px;
       text-transform: uppercase; font-weight: 700; background: ${NAVY_DEEP}; }
  td.num, th.num { text-align: right; }
  tfoot td { background: ${NAVY_DEEP}; border-top: 1px solid ${GOLD}; }
  .empty { color: ${MUTED}; font-size: 12px; padding: 24px; text-align: center;
           background: ${NAVY_ELEV}; border-radius: 10px; }
</style>
</head><body>
  <div class="wrap">
    <div class="brand-row">
      <div class="brand">YACHTWORTH · FLEET REPORT</div>
      <div class="date">${escapeHtml(today)}</div>
    </div>

    <h1>${escapeHtml(monthLabel(monthStart))}</h1>
    <div class="subtitle">${countCharters} active charter${countCharters === 1 ? "" : "s"} across ${byYacht.size} yacht${byYacht.size === 1 ? "" : "s"}</div>

    <div class="hero">
      <div><div class="kpi-label">Days booked</div><div class="kpi-value">${totDays}</div></div>
      <div><div class="kpi-label">Gross revenue</div><div class="kpi-value">${escapeHtml(eur(totGross))}</div></div>
      <div><div class="kpi-label">Net revenue</div><div class="kpi-value gold">${escapeHtml(eur(totNet))}</div></div>
      <div><div class="kpi-label">Net profit</div><div class="kpi-value" style="color:${totProfitColor}">${escapeHtml(eur(totProfit))}</div></div>
    </div>

    ${yachtSections || `<div class="empty">No charters this month.</div>`}

    <div class="footer">
      Excludes cancelled and blocked entries from totals · Indicative figures · Yachtworth
    </div>
  </div>
</body></html>`;
}

export async function exportFleetPdf(input: FleetMonthInput): Promise<void> {
  const html = buildFleetPdfHtml(input);
  const { uri } = await Print.printToFileAsync({ html, base64: false });
  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) {
    throw new Error(
      "Sharing is not available on this device. Open the app on iOS or Android to export.",
    );
  }
  await Sharing.shareAsync(uri, {
    mimeType: "application/pdf",
    dialogTitle: "Save fleet report",
    UTI: "com.adobe.pdf",
  });
}

// ───────────────────────────────────────────────────────────────────────────
// FLEET CSV (Excel-compatible)
// ───────────────────────────────────────────────────────────────────────────

function csvCell(v: string | number | null | undefined): string {
  if (v == null) return "";
  let s = String(v);
  // CSV formula injection guard — prefix-escape leading =, +, -, @, tab, CR
  // so Excel/Sheets do not evaluate untrusted input as a formula.
  if (s.length > 0 && /^[=+\-@\t\r]/.test(s)) {
    s = "'" + s;
  }
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function buildFleetCsv(input: FleetMonthInput): string {
  const { yachts, charters } = input;
  const yachtById = new Map(yachts.map((y) => [y.id, y]));
  const header = [
    "Yacht",
    "Status",
    "Start date",
    "End date",
    "Days",
    "Client",
    "Email",
    "Phone",
    "Departure port",
    "Return port",
    "Rate type",
    "Rate (EUR)",
    "Gross revenue",
    "VAT amount",
    "Net revenue",
    "Fuel cost",
    "Crew cost",
    "Port fees",
    "Provisioning",
    "Cleaning",
    "Other",
    "Total expenses",
    "Net profit",
    "Margin %",
  ];
  const sorted = [...charters].sort((a, b) =>
    a.start_date.localeCompare(b.start_date),
  );
  const lines = [header.map(csvCell).join(",")];
  for (const c of sorted) {
    const y = yachtById.get(c.yacht_id);
    const p = computeCharterPnl(c);
    const row: (string | number | null)[] = [
      yachtTitle(y),
      STATUS_LABEL[c.status] ?? c.status,
      fmtDateIso(c.start_date),
      fmtDateIso(c.end_date),
      p.days,
      c.client_name ?? null,
      c.client_email ?? null,
      c.client_phone ?? null,
      c.departure_port ?? null,
      c.return_port ?? null,
      c.charter_rate_type === "per_day" ? "Per day" : "Fixed",
      c.charter_rate ?? null,
      p.gross_revenue.toFixed(2),
      p.vat_amount.toFixed(2),
      p.net_revenue.toFixed(2),
      p.fuel_cost.toFixed(2),
      p.total_crew.toFixed(2),
      p.port_fees.toFixed(2),
      p.provisioning.toFixed(2),
      p.cleaning.toFixed(2),
      p.other_expenses.toFixed(2),
      p.total_expenses.toFixed(2),
      p.net_profit.toFixed(2),
      p.margin.toFixed(1),
    ];
    lines.push(row.map(csvCell).join(","));
  }
  return lines.join("\n");
}

export async function exportFleetCsv(input: FleetMonthInput): Promise<void> {
  const csv = buildFleetCsv(input);
  const ts = `${input.monthStart.getFullYear()}-${String(input.monthStart.getMonth() + 1).padStart(2, "0")}`;
  const filename = `yachtworth-fleet-${ts}.csv`;
  const dir = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;
  if (!dir) throw new Error("No writable directory available");
  const uri = `${dir}${filename}`;
  await FileSystem.writeAsStringAsync(uri, csv, {
    encoding: FileSystem.EncodingType.UTF8,
  });
  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) {
    throw new Error(
      "Sharing is not available on this device. Open the app on iOS or Android to export.",
    );
  }
  await Sharing.shareAsync(uri, {
    mimeType: "text/csv",
    dialogTitle: "Save fleet CSV",
    UTI: "public.comma-separated-values-text",
  });
}
