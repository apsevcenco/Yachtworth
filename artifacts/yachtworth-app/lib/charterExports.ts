import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system/legacy";
import type { Charter, Yacht } from "@workspace/api-client-react";
import {
  calcCharter,
  DEFAULT_CENTRAL_AGENT_TYPE,
  DEFAULT_CENTRAL_AGENT_VALUE,
  type CharterCalcInput,
  type CharterCalcResult,
  type CentralAgentType,
  type DistributionEntry,
  type SubAgent,
  type SubAgentType,
} from "./charterCalc";

const NAVY = "#0B1E3F";
const NAVY_DEEP = "#081633";
const NAVY_ELEV = "#142A52";
const GOLD = "#C9A961";
const GOLD_DEEP = "#A8893E";
const IVORY = "#F7F3EC";
const MUTED = "rgba(247,243,236,0.6)";
const DIVIDER = "rgba(247,243,236,0.1)";
const GREEN = "#3FB68B";
const RED = "#E74C3C";

// v4 PDF palette (light-themed report)
const PAPER = "#FFFFFF";
const INK = "#0B1E3F";
const INK_MUTED = "#6B7280";
const INK_FAINT = "#9CA3AF";
const LIGHT_DIVIDER = "#E5E7EB";
const APA_BG = "#F0F7F1";
const APA_BORDER = "#CDE3D2";
const APA_INK = "#1F4D2C";
const APA_BALANCE_GREEN = "#1F8A4F";
const APA_BALANCE_RED = "#B43232";

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

/** Build CharterCalcInput from a persisted Charter. Mirrors form's toCalcInput. */
function charterToCalcInput(c: Charter): CharterCalcInput {
  const dist: DistributionEntry[] = Array.isArray(c.distribution)
    ? c.distribution.map((d) => ({
        name: d.name,
        type: d.type,
        value: d.value,
      }))
    : [];
  return {
    start_date: c.start_date,
    end_date: c.end_date,
    charter_rate_type: c.charter_rate_type,
    charter_rate: c.charter_rate ?? 0,
    vat_applicable: c.vat_applicable ?? false,
    vat_percent: c.vat_percent ?? 0,
    apa_enabled: c.apa_enabled ?? false,
    apa_percent: c.apa_percent ?? 0,
    apa_fuel: c.apa_fuel ?? 0,
    apa_provisioning: c.apa_provisioning ?? 0,
    apa_beverages: c.apa_beverages ?? 0,
    apa_marina_fees: c.apa_marina_fees ?? 0,
    apa_communications: c.apa_communications ?? 0,
    apa_crew_gratuities: c.apa_crew_gratuities ?? 0,
    apa_activities: c.apa_activities ?? 0,
    apa_other: c.apa_other ?? 0,
    captain_day_rate: c.captain_day_rate ?? 0,
    first_officer_day_rate: c.first_officer_day_rate ?? 0,
    stewardess_count: c.stewardess_count ?? 0,
    stewardess_day_rate: c.stewardess_day_rate ?? 0,
    chef_included: c.chef_included ?? false,
    chef_day_rate: c.chef_day_rate ?? 0,
    deckhand_count: c.deckhand_count ?? 0,
    deckhand_day_rate: c.deckhand_day_rate ?? 0,
    extra_crew_cost: c.extra_crew_cost ?? 0,
    engine_hours_before: c.engine_hours_before ?? 0,
    engine_hours_after: c.engine_hours_after ?? 0,
    fuel_liters: c.fuel_liters ?? 0,
    fuel_price_per_liter: c.fuel_price_per_liter ?? 0,
    port_fees: c.port_fees ?? 0,
    provisioning: c.provisioning ?? 0,
    cleaning: c.cleaning ?? 0,
    other_expenses: c.other_expenses ?? 0,
    transfer_fee: c.transfer_fee ?? 0,
    transfer_fee_paid_by: c.transfer_fee_paid_by ?? "client",
    extra_service_amount: c.extra_service_amount ?? 0,
    damage_amount: c.damage_amount ?? 0,
    damage_paid_by: c.damage_paid_by ?? "client",
    central_agent_name: c.central_agent_name ?? "Central Agent",
    central_agent_type: (c.central_agent_type ?? DEFAULT_CENTRAL_AGENT_TYPE) as CentralAgentType,
    central_agent_value: c.central_agent_value ?? DEFAULT_CENTRAL_AGENT_VALUE,
    sub_agents: Array.isArray(c.sub_agents)
      ? c.sub_agents.map(
          (s): SubAgent => ({
            name: s.name,
            type: s.type as SubAgentType,
            value: s.value ?? 0,
          }),
        )
      : [],
    distribution: dist,
  };
}

/** Backwards-compatible wrapper — returns full CharterCalcResult. */
export function computeCharterPnl(c: Charter): CharterCalcResult {
  return calcCharter(charterToCalcInput(c));
}

export type { CharterCalcResult as CharterPnl };

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

// Legacy dark-themed style — kept for the fleet monthly PDF (unchanged).
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

// v4 light-themed template. Used by buildCharterPdfHtml().
const PDF_V4_STYLE = `
  @page { size: A4; margin: 16mm 14mm; }
  * { box-sizing: border-box; }
  body {
    font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
    color: ${INK}; background: ${PAPER}; margin: 0; padding: 0;
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
    font-size: 11px; line-height: 1.45;
  }
  .wrap { padding: 4px 6px 20px; }
  .top {
    display: flex; align-items: center; justify-content: space-between;
    color: ${INK_MUTED}; font-size: 9.5px; letter-spacing: 2px;
    text-transform: uppercase; font-weight: 600;
  }
  .top .brand { color: ${GOLD_DEEP}; letter-spacing: 3px; }
  .top .conf { color: ${INK_FAINT}; }
  .title-row {
    display: flex; align-items: flex-end; justify-content: space-between;
    margin-top: 4px; padding-bottom: 10px;
  }
  .title {
    color: ${INK}; font-size: 22px; font-weight: 800; letter-spacing: -0.4px;
  }
  .title-date { color: ${INK_MUTED}; font-size: 10.5px; font-weight: 500; }
  .gold-line {
    height: 3px; border: 0;
    background: linear-gradient(90deg, ${GOLD_DEEP}, ${GOLD}, ${GOLD_DEEP});
    margin: 0 0 18px;
  }
  /* Hero */
  .hero {
    display: flex; justify-content: space-between; align-items: flex-start;
    gap: 24px; padding-bottom: 18px; border-bottom: 1px solid ${LIGHT_DIVIDER};
    margin-bottom: 16px;
  }
  .hero-left { flex: 1; }
  .hero-name { color: ${INK}; font-size: 26px; font-weight: 800; letter-spacing: -0.5px; line-height: 1.1; }
  .hero-meta { color: ${INK_MUTED}; font-size: 11px; margin-top: 6px; line-height: 1.5; }
  .pill {
    display: inline-block; margin-top: 10px; padding: 3px 12px;
    border-radius: 999px; font-size: 9px; font-weight: 700;
    letter-spacing: 1.5px; text-transform: uppercase;
  }
  .pill-confirmed { background: ${GOLD}; color: ${INK}; }
  .pill-tentative { background: #DBEAFE; color: #1E40AF; }
  .pill-cancelled { background: #FEE2E2; color: #991B1B; }
  .pill-option, .pill-other { background: #F3F4F6; color: ${INK_MUTED}; }
  .hero-right { text-align: right; min-width: 200px; }
  .hero-kicker { color: ${INK_MUTED}; font-size: 9px; letter-spacing: 2px;
                 text-transform: uppercase; font-weight: 600; }
  .hero-amt { color: ${INK}; font-size: 26px; font-weight: 800;
              letter-spacing: -0.5px; line-height: 1.1; margin-top: 2px; }
  .hero-amt.gold { color: ${GOLD_DEEP}; }
  .hero-amt.neg { color: ${APA_BALANCE_RED}; }
  .hero-sub { color: ${INK_MUTED}; font-size: 10.5px; margin-top: 4px; }
  .hero-divider { height: 1px; background: ${LIGHT_DIVIDER}; margin: 14px 0; }
  /* Section heading */
  h2 {
    color: ${INK}; font-size: 10px; letter-spacing: 2.5px;
    text-transform: uppercase; font-weight: 700;
    margin: 18px 0 8px; padding-bottom: 6px;
    border-bottom: 1px solid ${LIGHT_DIVIDER};
  }
  .cols { display: flex; gap: 32px; }
  .cols > div { flex: 1; }
  /* Generic row */
  .row {
    display: flex; justify-content: space-between; gap: 12px;
    padding: 4px 0; font-size: 11px; line-height: 1.5;
  }
  .row .k { color: ${INK_MUTED}; }
  .row .v { color: ${INK}; font-weight: 600; text-align: right; }
  .row .v.gold { color: ${GOLD_DEEP}; }
  .row.divider { border-top: 1px solid ${LIGHT_DIVIDER}; margin-top: 6px; padding-top: 8px; }
  .row.total { font-weight: 700; }
  .row.total .v { color: ${INK}; font-weight: 800; }
  .row.big { font-size: 13px; }
  .row .add { color: ${APA_BALANCE_GREEN}; font-weight: 700; }
  .row .sub { color: ${APA_BALANCE_RED}; font-weight: 700; }
  /* APA block (soft green) */
  .apa {
    background: ${APA_BG}; border: 1px solid ${APA_BORDER};
    border-radius: 8px; padding: 14px 16px; margin-top: 6px;
  }
  .apa-title {
    color: ${APA_INK}; font-size: 10px; letter-spacing: 2px;
    text-transform: uppercase; font-weight: 700; margin-bottom: 8px;
  }
  .apa .row .k { color: ${APA_INK}; opacity: 0.78; }
  .apa .row .v { color: ${APA_INK}; }
  .apa-balance.pos { color: ${APA_BALANCE_GREEN}; font-weight: 800; }
  .apa-balance.neg { color: ${APA_BALANCE_RED}; font-weight: 800; }
  /* Dark blocks (Income Distribution + P&L) */
  .dark {
    background: ${NAVY}; color: ${IVORY};
    border-radius: 8px; padding: 16px 18px; margin-top: 6px;
  }
  .dark-title {
    color: ${GOLD}; font-size: 10px; letter-spacing: 2.5px;
    text-transform: uppercase; font-weight: 700;
    padding-bottom: 8px; margin-bottom: 8px;
    border-bottom: 1px solid rgba(247,243,236,0.12);
  }
  .dark .row .k { color: rgba(247,243,236,0.65); }
  .dark .row .v { color: ${IVORY}; }
  .dark .row .v.gold { color: ${GOLD}; font-weight: 700; }
  .dark .row.divider { border-top-color: rgba(247,243,236,0.12); }
  .dark .row.total .v { color: ${IVORY}; font-weight: 800; }
  .balanced {
    display: flex; justify-content: space-between; align-items: center;
    margin-top: 10px; padding-top: 10px;
    border-top: 1px solid rgba(247,243,236,0.12);
    font-size: 11px; font-weight: 700; letter-spacing: 1px;
    text-transform: uppercase;
  }
  .balanced.ok { color: ${GREEN}; }
  .balanced.bad { color: ${RED}; }
  .pnl-net {
    margin-top: 12px; padding-top: 12px;
    border-top: 1px solid rgba(247,243,236,0.12);
    display: flex; justify-content: space-between; align-items: baseline;
  }
  .pnl-net .k { color: ${GOLD}; font-size: 11px; letter-spacing: 2px;
                text-transform: uppercase; font-weight: 700; }
  .pnl-net .v { color: ${IVORY}; font-size: 22px; font-weight: 800; letter-spacing: -0.4px; }
  .pnl-net .v.neg { color: #FF6B6B; }
  .note {
    margin-top: 10px; color: ${INK_MUTED}; font-size: 9.5px;
    line-height: 1.5; font-style: italic;
  }
  .footer {
    margin-top: 22px; padding-top: 12px; border-top: 1px solid ${LIGHT_DIVIDER};
    display: flex; justify-content: space-between; align-items: center;
    color: ${INK_MUTED}; font-size: 9px; line-height: 1.5;
  }
  .footer .right { color: ${GOLD_DEEP}; font-weight: 700;
                   letter-spacing: 2px; text-transform: uppercase; text-align: right; }
  .footer .right small { display: block; color: ${INK_FAINT};
                         font-weight: 400; letter-spacing: 1px; font-size: 8px; margin-top: 2px; }
`;

const STATUS_LABEL: Record<string, string> = {
  confirmed: "Confirmed",
  tentative: "Tentative",
  maintenance: "Maintenance",
  blocked: "Blocked",
  cancelled: "Cancelled",
};

const CONTRACT_LABEL: Record<string, string> = {
  not_signed: "Not signed",
  sent: "Sent",
  signed: "Signed",
};

// Currency with thin space after €, integer rounded. Unsigned (caller adds + / −).
function eurThin(n: number): string {
  const abs = Math.abs(Math.round(n));
  return "€\u2009" + abs.toLocaleString("en-GB");
}

// Signed currency for headline figures (net profit, owner residual) — uses
// real minus sign so losses are visually unambiguous.
function eurSigned(n: number): string {
  const rounded = Math.round(n);
  const sign = rounded < 0 ? "−\u2009" : "";
  return sign + "€\u2009" + Math.abs(rounded).toLocaleString("en-GB");
}

// Pretty DD MMM YYYY (uses fmtDate which is already timezone-safe).
function pillClass(status: string): string {
  switch (status) {
    case "confirmed":
      return "pill pill-confirmed";
    case "tentative":
      return "pill pill-tentative";
    case "cancelled":
      return "pill pill-cancelled";
    default:
      return "pill pill-other";
  }
}

function row(label: string, value: string, extraClass = ""): string {
  return `<div class="row${extraClass ? " " + extraClass : ""}"><span class="k">${label}</span><span class="v">${value}</span></div>`;
}

export function buildCharterPdfHtml(
  charter: Charter,
  yacht: Yacht | null,
): string {
  const p = computeCharterPnl(charter);
  const today = new Date().toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const yTitle = yachtTitle(yacht);

  const range = `${fmtDate(charter.start_date)} — ${fmtDate(charter.end_date)} · ${p.days} day${p.days === 1 ? "" : "s"}`;
  const ports =
    charter.departure_port || charter.return_port
      ? `${escapeHtml(charter.departure_port ?? "")}${charter.return_port ? " → " + escapeHtml(charter.return_port) : ""}`
      : charter.mooring_port
        ? escapeHtml(charter.mooring_port)
        : "";
  const times =
    charter.departure_time || charter.return_time
      ? `${escapeHtml(charter.departure_time ?? "")}${charter.return_time ? " — " + escapeHtml(charter.return_time) : ""}`
      : "";

  const statusLbl = STATUS_LABEL[charter.status] ?? charter.status;
  const rateLine =
    charter.charter_rate_type === "per_day"
      ? `${eurThin(charter.charter_rate ?? 0)} / day × ${p.days} days`
      : charter.charter_rate_type === "per_week"
        ? `${eurThin(charter.charter_rate ?? 0)} / week × ${(p.days / 7).toFixed(1)} weeks`
        : `Fixed price ${eurThin(charter.charter_rate ?? 0)}`;

  const vatPct = charter.vat_applicable ? (charter.vat_percent ?? 0) : 0;

  // ── APA rows (non-zero only) ───────────────────────────────────────
  const apaItems: { label: string; value: number }[] = [
    { label: "Fuel", value: charter.apa_fuel ?? 0 },
    { label: "Provisioning / Food", value: charter.apa_provisioning ?? 0 },
    { label: "Beverages / Alcohol", value: charter.apa_beverages ?? 0 },
    { label: "Marina / Port fees", value: charter.apa_marina_fees ?? 0 },
    { label: "Communications", value: charter.apa_communications ?? 0 },
    { label: "Crew gratuities", value: charter.apa_crew_gratuities ?? 0 },
    {
      label: `Activities${charter.apa_activities_note ? ": " + charter.apa_activities_note : ""}`,
      value: charter.apa_activities ?? 0,
    },
    {
      label: `Other${charter.apa_other_note ? ": " + charter.apa_other_note : ""}`,
      value: charter.apa_other ?? 0,
    },
  ].filter((r) => r.value > 0);

  // ── Crew rows (included only) ──────────────────────────────────────
  type CrewRow = { label: string; total: number };
  const crewRows: CrewRow[] = [];
  if (p.captain_total > 0)
    crewRows.push({
      label: `Captain<br/><span class="muted">${eurThin(charter.captain_day_rate ?? 0)} / day · ${p.days} days</span>`,
      total: p.captain_total,
    });
  if (p.first_officer_total > 0)
    crewRows.push({
      label: `First Officer<br/><span class="muted">${eurThin(charter.first_officer_day_rate ?? 0)} / day · ${p.days} days</span>`,
      total: p.first_officer_total,
    });
  if (p.stewardess_total > 0)
    crewRows.push({
      label: `Stewardess ×${charter.stewardess_count ?? 0}<br/><span class="muted">${eurThin(charter.stewardess_day_rate ?? 0)} / day · ${p.days} days</span>`,
      total: p.stewardess_total,
    });
  if (p.chef_total > 0)
    crewRows.push({
      label: `Chef<br/><span class="muted">${eurThin(charter.chef_day_rate ?? 0)} / day · ${p.days} days</span>`,
      total: p.chef_total,
    });
  if (p.deckhand_total > 0)
    crewRows.push({
      label: `Deckhand ×${charter.deckhand_count ?? 0}<br/><span class="muted">${eurThin(charter.deckhand_day_rate ?? 0)} / day · ${p.days} days</span>`,
      total: p.deckhand_total,
    });
  if ((charter.extra_crew_cost ?? 0) > 0)
    crewRows.push({
      label: `Extra crew${charter.extra_crew_note ? `<br/><span class="muted">${escapeHtml(charter.extra_crew_note)}</span>` : ""}`,
      total: charter.extra_crew_cost ?? 0,
    });

  // ── Vessel info ────────────────────────────────────────────────────
  const showEngine =
    charter.engine_hours_before != null && charter.engine_hours_after != null;
  const fuelLiters = charter.fuel_liters ?? 0;
  const fuelPrice = charter.fuel_price_per_liter ?? 0;

  // ── Distribution rows (for dark block) ─────────────────────────────
  type DistRow = { name: string; amount: number; pct: number; gold?: boolean };
  const distRows: DistRow[] = [];
  if (p.central_agent_amount > 0) {
    const pct = p.base_net > 0 ? (p.central_agent_amount / p.base_net) * 100 : 0;
    distRows.push({
      name: charter.central_agent_name || "Central Agent",
      amount: p.central_agent_amount,
      pct,
    });
  }
  for (const s of p.sub_agent_results) {
    if (s.amount > 0)
      distRows.push({ name: s.name, amount: s.amount, pct: s.pct });
  }
  for (const d of p.distribution_results) {
    if (d.amount > 0) distRows.push({ name: d.name, amount: d.amount, pct: d.pct });
  }
  const ownerPct =
    p.base_net > 0 ? (p.boat_owner_receives / p.base_net) * 100 : 0;
  distRows.unshift({
    name: "Boat Owner",
    amount: p.boat_owner_receives,
    pct: ownerPct,
    gold: true,
  });
  const totalDistributed = distRows.reduce((s, r) => s + r.amount, 0);
  // Balance semantics come from calcCharter: owner residual >= 0 means the
  // base_net fully covers all commissions/custom shares. If negative, the
  // owner is shorted (over-distributed). totalDistributed always equals
  // base_net by construction, so display diff against the over-distribution.
  const distDiff = p.base_net - totalDistributed; // structurally 0
  const balanced = p.distribution_balanced;
  const overDistAmount = balanced ? 0 : Math.abs(p.boat_owner_receives);

  // ── Payment statuses ───────────────────────────────────────────────
  const depAmount = charter.deposit_amount ?? 0;
  const finAmount = charter.final_payment_amount ?? 0;
  const depLine =
    depAmount > 0
      ? `${eurThin(depAmount)} ${charter.deposit_received ? "✓ Received" : "Pending"}`
      : "—";
  const finLine =
    finAmount > 0
      ? `${eurThin(finAmount)} ${charter.final_payment_received ? "✓ Received" : "Pending"}`
      : "—";

  const profitNeg = p.net_profit < 0;
  const ownerNeg = p.boat_owner_receives < 0;

  return `<!doctype html>
<html><head><meta charset="utf-8" />
<title>Charter — ${escapeHtml(yTitle)}</title>
<style>${PDF_V4_STYLE}
  .muted { color: ${INK_FAINT}; font-weight: 500; font-size: 9.5px; }
  .dark .muted { color: rgba(247,243,236,0.45); }
</style>
</head><body>
  <div class="wrap">
    <!-- 1. HEADER -->
    <div class="top">
      <span class="brand">YachtWorth · Charter</span>
      <span class="conf">Confidential</span>
    </div>
    <div class="title-row">
      <div class="title">Trip Report</div>
      <div class="title-date">${escapeHtml(today)}</div>
    </div>
    <hr class="gold-line" />

    <!-- 3. HERO -->
    <div class="hero">
      <div class="hero-left">
        <div class="hero-name">${escapeHtml(yTitle)}</div>
        <div class="hero-meta">
          ${escapeHtml(range)}
          ${ports ? `<br/>${ports}` : ""}
          ${times ? ` · ${times}` : ""}
        </div>
        <span class="${pillClass(charter.status)}">${escapeHtml(statusLbl)}</span>
      </div>
      <div class="hero-right">
        <div class="hero-kicker">Net Profit</div>
        <div class="hero-amt${profitNeg ? " neg" : ""}">${eurSigned(p.net_profit)}</div>
        <div class="hero-sub">${p.margin.toFixed(1)}% margin · ${eurThin(p.base_net)} net revenue</div>
        <div class="hero-divider"></div>
        <div class="hero-kicker">Boat Owner Receives</div>
        <div class="hero-amt gold${ownerNeg ? " neg" : ""}">${eurSigned(p.boat_owner_receives)}</div>
      </div>
    </div>

    <!-- 4. CLIENT + LOGISTICS -->
    <div class="cols">
      <div>
        <h2>Client</h2>
        ${row("Name", escapeHtml(charter.client_name ?? "—"))}
        ${charter.client_email ? row("Email", escapeHtml(charter.client_email)) : ""}
        ${charter.client_phone ? row("Phone", escapeHtml(charter.client_phone)) : ""}
      </div>
      <div>
        <h2>Logistics</h2>
        ${charter.contact_name ? row("Contact / Agent", escapeHtml(charter.contact_name)) : ""}
        ${charter.mooring_port ? row("Mooring port", escapeHtml(charter.mooring_port)) : ""}
        ${charter.pickup_port ? row("Pick up", escapeHtml(charter.pickup_port)) : ""}
        ${charter.dropoff_port ? row("Drop off", escapeHtml(charter.dropoff_port)) : ""}
        ${row("Transfer fee", eurThin(charter.transfer_fee ?? 0))}
        ${row("Contract", escapeHtml(CONTRACT_LABEL[charter.contract_status ?? ""] ?? (charter.contract_status ?? "—")))}
      </div>
    </div>

    <!-- 5. REVENUE & PAYMENTS -->
    <h2>Revenue &amp; Payments</h2>
    ${row("Charter rate", escapeHtml(rateLine))}
    ${row("Base price (net, excl. VAT)", eurThin(p.base_net))}
    ${charter.vat_applicable && vatPct > 0 ? row(`VAT (${vatPct}%)`, `+ ${eurThin(p.vat_amount)}`) : ""}
    ${row("Total to client (incl. VAT)", eurThin(p.total_to_client), "total divider")}
    ${charter.apa_enabled ? row(`APA (${charter.apa_percent ?? 0}% of net)`, `+ ${eurThin(p.apa_amount)}`) : ""}
    ${charter.apa_enabled ? row("Total invoice to client", eurThin(p.total_invoice_to_client), "total") : ""}
    ${row("Deposit received", depLine, "divider")}
    ${row("Final payment (due)", finLine)}

    <!-- 6. CREW + VESSEL -->
    <div class="cols">
      <div>
        <h2>Crew</h2>
        ${
          crewRows.length === 0
            ? `<div class="row"><span class="k">No crew costs entered</span><span class="v">—</span></div>`
            : crewRows
                .map(
                  (r) =>
                    `<div class="row"><span class="k">${r.label}</span><span class="v">${eurThin(r.total)}</span></div>`,
                )
                .join("") +
              row("Total crew", eurThin(p.total_crew), "total divider")
        }
      </div>
      <div>
        <h2>Vessel</h2>
        ${showEngine ? row("Engine hours", `${charter.engine_hours_before} → ${charter.engine_hours_after}`) : ""}
        ${showEngine ? row("Hours used", `${p.engine_hours_used.toFixed(0)} hrs`) : ""}
        ${fuelLiters > 0 ? row("Fuel (non-APA)", `${fuelLiters} L × ${eurThin(fuelPrice)}`) : ""}
        ${fuelLiters > 0 ? row("Fuel cost", eurThin(p.fuel_cost), "total") : ""}
        ${(charter.extra_service_amount ?? 0) > 0 ? row(`Extra service${charter.extra_service_note ? " · " + escapeHtml(charter.extra_service_note) : ""}`, eurThin(charter.extra_service_amount ?? 0)) : ""}
        ${(charter.damage_amount ?? 0) > 0 ? row(`Damage · paid by ${escapeHtml(charter.damage_paid_by ?? "client")}`, eurThin(charter.damage_amount ?? 0)) : ""}
      </div>
    </div>

    <!-- 7. APA ACCOUNT (only if enabled) -->
    ${
      charter.apa_enabled
        ? `<div class="apa">
      <div class="apa-title">APA Account — Advance Provisioning Allowance</div>
      <div class="row total"><span class="k">APA budget received (${charter.apa_percent ?? 0}% of ${eurThin(p.base_net)})</span><span class="v">${eurThin(p.apa_amount)}</span></div>
      ${apaItems.length > 0 ? `<div style="height:6px"></div>` : ""}
      ${apaItems.map((r) => `<div class="row"><span class="k">${escapeHtml(r.label)}</span><span class="v">− ${eurThin(r.value)}</span></div>`).join("")}
      ${apaItems.length > 0 ? `<div class="row divider total"><span class="k">Total APA spent</span><span class="v">${eurThin(p.apa_spent)}</span></div>` : ""}
      <div class="row total"><span class="k">Balance — ${p.apa_balance >= 0 ? "Refund to client" : "Additional payment required"}</span><span class="v apa-balance ${p.apa_balance >= 0 ? "pos" : "neg"}">${p.apa_balance >= 0 ? "+ " : "− "}${eurThin(p.apa_balance)}</span></div>
    </div>`
        : ""
    }

    <!-- 8. INCOME DISTRIBUTION -->
    <h2>Income Distribution</h2>
    <div class="dark">
      <div class="dark-title">Payout Summary — Net Revenue ${eurThin(p.base_net)}</div>
      ${distRows
        .map(
          (r) =>
            `<div class="row"><span class="k">${escapeHtml(r.name)}${r.pct > 0 ? ` <span class="muted">(${r.pct.toFixed(1)}%)</span>` : ""}</span><span class="v${r.gold ? " gold" : ""}">${eurThin(r.amount)}</span></div>`,
        )
        .join("")}
      <div class="row divider total"><span class="k">Base net revenue</span><span class="v">${eurThin(p.base_net)}</span></div>
      <div class="row total"><span class="k">Total distributed</span><span class="v">${eurThin(totalDistributed)}</span></div>
      <div class="balanced ${balanced ? "ok" : "bad"}">
        <span>${balanced ? "✓ Balanced" : "⚠ Over-distributed"}</span>
        <span>${balanced ? "€\u20090 difference" : "owner short " + eurThin(overDistAmount)}</span>
      </div>
    </div>

    <!-- 9. P&L SUMMARY -->
    <div class="dark" style="margin-top:14px">
      <div class="dark-title">Profit &amp; Loss Summary</div>
      <div class="row"><span class="k">Base net revenue</span><span class="v">${eurThin(p.base_net)}</span></div>
      ${(charter.transfer_fee ?? 0) > 0 && charter.transfer_fee_paid_by !== "owner" ? `<div class="row"><span class="k">Transfer fee</span><span class="v">${eurThin(charter.transfer_fee ?? 0)}</span></div>` : ""}
      ${(charter.extra_service_amount ?? 0) > 0 ? `<div class="row"><span class="k">Extra services</span><span class="v">${eurThin(charter.extra_service_amount ?? 0)}</span></div>` : ""}
      <div style="height:6px"></div>
      ${p.central_agent_amount > 0 ? `<div class="row"><span class="k">${escapeHtml(charter.central_agent_name || "Central Agent")} commission</span><span class="v">− ${eurThin(p.central_agent_amount)}</span></div>` : ""}
      ${p.sub_agent_total > 0 ? `<div class="row"><span class="k">Sub-agent commissions</span><span class="v">− ${eurThin(p.sub_agent_total)}</span></div>` : ""}
      ${p.total_crew > 0 ? `<div class="row"><span class="k">Total crew</span><span class="v">− ${eurThin(p.total_crew)}</span></div>` : ""}
      ${p.fuel_cost > 0 ? `<div class="row"><span class="k">Fuel (non-APA)</span><span class="v">− ${eurThin(p.fuel_cost)}</span></div>` : ""}
      ${p.damage_absorbed > 0 ? `<div class="row"><span class="k">Damage absorbed</span><span class="v">− ${eurThin(p.damage_absorbed)}</span></div>` : ""}
      <div class="pnl-net">
        <span class="k">Net profit</span>
        <span class="v${profitNeg ? " neg" : ""}">${eurSigned(p.net_profit)}</span>
      </div>
    </div>

    <!-- 10. APA/VAT note -->
    <div class="note">
      APA is excluded from P&amp;L (pass-through fund managed by captain).${vatPct > 0 ? ` VAT (${eurThin(p.vat_amount)}) is collected on behalf of tax authority and excluded from profit calculation.` : ""} Boat owner receives ${eurThin(p.boat_owner_receives)} per income distribution agreement.
    </div>

    ${charter.notes ? `<h2>Notes</h2><div class="row"><span class="k" style="color:${INK}">${escapeHtml(charter.notes)}</span></div>` : ""}

    <!-- 11. FOOTER -->
    <div class="footer">
      <div>Indicative P&amp;L based on entered data. Not a certified accounting statement. For professional advice consult a licensed accountant.</div>
      <div class="right">Yachtworth<small>Powered by PDYE Group</small></div>
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
  let totBaseNet = 0;
  let totVat = 0;
  let totInvoice = 0;
  let totProfit = 0;
  let totDays = 0;
  let countCharters = 0;
  for (const c of charters) {
    if (c.status === "cancelled" || c.status === "blocked") continue;
    const p = computeCharterPnl(c);
    totBaseNet += p.base_net;
    totVat += p.vat_amount;
    totInvoice += p.total_invoice_to_client;
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
          <td class="num">${escapeHtml(eur(p.base_net))}</td>
          <td class="num">${escapeHtml(eur(p.vat_amount))}</td>
          <td class="num" style="color:${profitColor}">${escapeHtml(eur(p.net_profit))}</td>
          <td>${escapeHtml(statusLbl)}</td>
        </tr>`;
        })
        .join("");
      let yBase = 0,
        yVat = 0,
        yProfit = 0,
        yDays = 0;
      for (const c of list) {
        if (c.status === "cancelled" || c.status === "blocked") continue;
        const p = computeCharterPnl(c);
        yBase += p.base_net;
        yVat += p.vat_amount;
        yProfit += p.net_profit;
        yDays += p.days;
      }
      return `
      <h2>${escapeHtml(yTitle)}</h2>
      <table>
        <thead><tr>
          <th>Dates</th><th>Client</th>
          <th class="num">Days</th><th class="num">Base net</th>
          <th class="num">VAT</th><th class="num">Profit</th>
          <th>Status</th>
        </tr></thead>
        <tbody>${rows}</tbody>
        <tfoot><tr>
          <td colspan="2"><strong>Subtotal</strong></td>
          <td class="num"><strong>${yDays}</strong></td>
          <td class="num"><strong>${escapeHtml(eur(yBase))}</strong></td>
          <td class="num"><strong>${escapeHtml(eur(yVat))}</strong></td>
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
      <div><div class="kpi-label">Base net</div><div class="kpi-value gold">${escapeHtml(eur(totBaseNet))}</div></div>
      <div><div class="kpi-label">Invoice incl. APA</div><div class="kpi-value">${escapeHtml(eur(totInvoice))}</div></div>
      <div><div class="kpi-label">Net profit</div><div class="kpi-value" style="color:${totProfitColor}">${escapeHtml(eur(totProfit))}</div></div>
    </div>

    ${yachtSections || `<div class="empty">No charters this month.</div>`}

    <div class="footer">
      Excludes cancelled and blocked entries from totals · VAT shown separately (added on top) · APA is pass-through · Yachtworth
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
    "Contract",
    "Start date",
    "End date",
    "Days",
    "Client",
    "Contact",
    "Email",
    "Phone",
    "Mooring",
    "Departure port",
    "Return port",
    "Rate type",
    "Rate (EUR)",
    "Base net",
    "VAT amount",
    "Total to client",
    "APA collected",
    "Total invoice",
    "Fuel cost",
    "Crew cost",
    "Port fees",
    "Provisioning",
    "Cleaning",
    "Other",
    "Transfer fee",
    "Extra services",
    "Damage",
    "Refund",
    "Central Agent",
    "Central Agent name",
    "Sub-agents total",
    "Boat Owner receives",
    "Net profit",
    "Margin %",
  ];
  const rateTypeLabel = (t: string) =>
    t === "per_day" ? "Per day" : t === "per_week" ? "Per week" : "Fixed";
  const sorted = [...charters].sort((a, b) =>
    a.start_date.localeCompare(b.start_date),
  );
  const lines = [header.map(csvCell).join(",")];
  for (const c of sorted) {
    const y = yachtById.get(c.yacht_id);
    const p = computeCharterPnl(c);
    const row: (string | number | null)[] = [
      yachtTitle(y),
      STATUS_LABEL[c.status ?? ""] ?? (c.status ?? ""),
      CONTRACT_LABEL[c.contract_status ?? ""] ?? (c.contract_status ?? ""),
      fmtDateIso(c.start_date),
      fmtDateIso(c.end_date),
      p.days,
      c.client_name ?? null,
      c.contact_name ?? null,
      c.client_email ?? null,
      c.client_phone ?? null,
      c.mooring_port ?? null,
      c.departure_port ?? null,
      c.return_port ?? null,
      rateTypeLabel(c.charter_rate_type),
      c.charter_rate ?? null,
      p.base_net.toFixed(2),
      p.vat_amount.toFixed(2),
      p.total_to_client.toFixed(2),
      p.apa_amount.toFixed(2),
      p.total_invoice_to_client.toFixed(2),
      p.fuel_cost.toFixed(2),
      p.total_crew.toFixed(2),
      (c.port_fees ?? 0).toFixed(2),
      (c.provisioning ?? 0).toFixed(2),
      (c.cleaning ?? 0).toFixed(2),
      (c.other_expenses ?? 0).toFixed(2),
      (c.transfer_fee ?? 0).toFixed(2),
      (c.extra_service_amount ?? 0).toFixed(2),
      (c.damage_amount ?? 0).toFixed(2),
      (c.refund_amount ?? 0).toFixed(2),
      p.central_agent_amount.toFixed(2),
      c.central_agent_name ?? "Central Agent",
      p.sub_agent_total.toFixed(2),
      p.boat_owner_receives.toFixed(2),
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
