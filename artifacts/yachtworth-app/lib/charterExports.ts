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

const CONTRACT_LABEL: Record<string, string> = {
  not_signed: "Not signed",
  sent: "Sent",
  signed: "Signed",
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
      : charter.charter_rate_type === "per_week"
        ? `${eur(charter.charter_rate ?? 0)} / week × ${(p.days / 7).toFixed(1)} weeks`
        : `Fixed price ${eur(charter.charter_rate ?? 0)}`;

  const profitColor = p.net_profit >= 0 ? GREEN : RED;
  const vatPct = charter.vat_applicable ? (charter.vat_percent ?? 0) : 0;

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
      <div class="hero-margin">Margin ${p.margin.toFixed(1)}% on revenue ${escapeHtml(eur(p.gross_revenue))}</div>
      <div class="status-pill">${escapeHtml(statusLbl)}</div>
    </div>

    <h2>Client & contract</h2>
    <div class="card">
      <div class="row"><span class="k">Name</span><span class="v">${escapeHtml(charter.client_name ?? "—")}</span></div>
      ${charter.contact_name ? `<div class="row"><span class="k">Contact</span><span class="v">${escapeHtml(charter.contact_name)}</span></div>` : ""}
      ${charter.client_email ? `<div class="row"><span class="k">Email</span><span class="v">${escapeHtml(charter.client_email)}</span></div>` : ""}
      ${charter.client_phone ? `<div class="row"><span class="k">Phone</span><span class="v">${escapeHtml(charter.client_phone)}</span></div>` : ""}
      <div class="row"><span class="k">Contract</span><span class="v">${escapeHtml(CONTRACT_LABEL[charter.contract_status ?? ""] ?? (charter.contract_status ?? "—"))}${charter.contract_date ? " · " + escapeHtml(fmtDate(charter.contract_date)) : ""}</span></div>
    </div>

    <h2>Logistics</h2>
    <div class="card">
      ${charter.mooring_port ? `<div class="row"><span class="k">Mooring (home base)</span><span class="v">${escapeHtml(charter.mooring_port)}</span></div>` : ""}
      ${charter.departure_port ? `<div class="row"><span class="k">Departure port${charter.departure_time ? " · " + escapeHtml(charter.departure_time) : ""}</span><span class="v">${escapeHtml(charter.departure_port)}</span></div>` : ""}
      ${charter.return_port ? `<div class="row"><span class="k">Return port${charter.return_time ? " · " + escapeHtml(charter.return_time) : ""}</span><span class="v">${escapeHtml(charter.return_port)}</span></div>` : ""}
      ${charter.pickup_port ? `<div class="row"><span class="k">Client pickup</span><span class="v">${escapeHtml(charter.pickup_port)}</span></div>` : ""}
      ${charter.dropoff_port ? `<div class="row"><span class="k">Client drop-off</span><span class="v">${escapeHtml(charter.dropoff_port)}</span></div>` : ""}
      ${(charter.transfer_fee ?? 0) > 0 ? `<div class="row"><span class="k">Transfer fee · paid by ${escapeHtml(charter.transfer_fee_paid_by ?? "client")}${charter.transfer_fee_note ? " · " + escapeHtml(charter.transfer_fee_note) : ""}</span><span class="v">${escapeHtml(eur(charter.transfer_fee ?? 0))}</span></div>` : ""}
    </div>

    <h2>Revenue (VAT added on top)</h2>
    <div class="card">
      <div class="row"><span class="k">${escapeHtml(rateLine)}</span><span class="v">${escapeHtml(eur(p.base_net))}</span></div>
      ${charter.vat_applicable && vatPct > 0 ? `<div class="row"><span class="k">+ VAT (${vatPct}%)</span><span class="v">${escapeHtml(eur(p.vat_amount))}</span></div>` : ""}
      <div class="row divider"><span class="k">Total to client (excl. APA)</span><span class="v gold">${escapeHtml(eur(p.total_to_client))}</span></div>
      ${charter.apa_enabled ? `<div class="row"><span class="k">+ APA fund (${charter.apa_percent ?? 0}%)</span><span class="v">${escapeHtml(eur(p.apa_amount))}</span></div><div class="row divider"><span class="k">Total invoice (incl. APA)</span><span class="v gold">${escapeHtml(eur(p.total_invoice_to_client))}</span></div>` : ""}
      ${charter.deposit_amount != null ? `<div class="row"><span class="k">Deposit ${charter.deposit_received ? "(received)" : "(due)"}${charter.deposit_date ? " · " + escapeHtml(fmtDate(charter.deposit_date)) : ""}</span><span class="v">${escapeHtml(eur(charter.deposit_amount))}</span></div>` : ""}
      ${charter.final_payment_amount != null ? `<div class="row"><span class="k">Final payment ${charter.final_payment_received ? "(received)" : "(due)"}${charter.final_payment_date ? " · " + escapeHtml(fmtDate(charter.final_payment_date)) : ""}</span><span class="v">${escapeHtml(eur(charter.final_payment_amount))}</span></div>` : ""}
    </div>

    ${
      charter.apa_enabled
        ? `<h2>APA fund (pass-through)</h2>
    <div class="card">
      <div class="row"><span class="k">Collected</span><span class="v">${escapeHtml(eur(p.apa_amount))}</span></div>
      ${(charter.apa_fuel ?? 0) > 0 ? `<div class="row"><span class="k">— Fuel</span><span class="v">${escapeHtml(eur(charter.apa_fuel ?? 0))}</span></div>` : ""}
      ${(charter.apa_provisioning ?? 0) > 0 ? `<div class="row"><span class="k">— Provisioning</span><span class="v">${escapeHtml(eur(charter.apa_provisioning ?? 0))}</span></div>` : ""}
      ${(charter.apa_beverages ?? 0) > 0 ? `<div class="row"><span class="k">— Beverages</span><span class="v">${escapeHtml(eur(charter.apa_beverages ?? 0))}</span></div>` : ""}
      ${(charter.apa_marina_fees ?? 0) > 0 ? `<div class="row"><span class="k">— Marina fees</span><span class="v">${escapeHtml(eur(charter.apa_marina_fees ?? 0))}</span></div>` : ""}
      ${(charter.apa_communications ?? 0) > 0 ? `<div class="row"><span class="k">— Communications</span><span class="v">${escapeHtml(eur(charter.apa_communications ?? 0))}</span></div>` : ""}
      ${(charter.apa_crew_gratuities ?? 0) > 0 ? `<div class="row"><span class="k">— Crew gratuities</span><span class="v">${escapeHtml(eur(charter.apa_crew_gratuities ?? 0))}</span></div>` : ""}
      ${(charter.apa_activities ?? 0) > 0 ? `<div class="row"><span class="k">— Activities${charter.apa_activities_note ? " · " + escapeHtml(charter.apa_activities_note) : ""}</span><span class="v">${escapeHtml(eur(charter.apa_activities ?? 0))}</span></div>` : ""}
      ${(charter.apa_other ?? 0) > 0 ? `<div class="row"><span class="k">— Other${charter.apa_other_note ? " · " + escapeHtml(charter.apa_other_note) : ""}</span><span class="v">${escapeHtml(eur(charter.apa_other ?? 0))}</span></div>` : ""}
      <div class="row divider"><span class="k">Total APA spent</span><span class="v">${escapeHtml(eur(p.apa_spent))}</span></div>
      <div class="row"><span class="k">${p.apa_balance >= 0 ? "Refund to client" : "Client owes"}</span><span class="v gold">${escapeHtml(eur(Math.abs(p.apa_balance)))}</span></div>
    </div>`
        : ""
    }

    <h2>Crew</h2>
    <div class="card">
      ${p.captain_total > 0 ? `<div class="row"><span class="k">Captain · ${eur(charter.captain_day_rate ?? 0)} × ${p.days}d</span><span class="v">${escapeHtml(eur(p.captain_total))}</span></div>` : ""}
      ${p.first_officer_total > 0 ? `<div class="row"><span class="k">First officer · ${eur(charter.first_officer_day_rate ?? 0)} × ${p.days}d</span><span class="v">${escapeHtml(eur(p.first_officer_total))}</span></div>` : ""}
      ${p.stewardess_total > 0 ? `<div class="row"><span class="k">Stewardess × ${charter.stewardess_count} · ${eur(charter.stewardess_day_rate ?? 0)} × ${p.days}d</span><span class="v">${escapeHtml(eur(p.stewardess_total))}</span></div>` : ""}
      ${p.chef_total > 0 ? `<div class="row"><span class="k">Chef · ${eur(charter.chef_day_rate ?? 0)} × ${p.days}d</span><span class="v">${escapeHtml(eur(p.chef_total))}</span></div>` : ""}
      ${p.deckhand_total > 0 ? `<div class="row"><span class="k">Deckhand × ${charter.deckhand_count} · ${eur(charter.deckhand_day_rate ?? 0)} × ${p.days}d</span><span class="v">${escapeHtml(eur(p.deckhand_total))}</span></div>` : ""}
      ${(charter.extra_crew_cost ?? 0) > 0 ? `<div class="row"><span class="k">Extra crew${charter.extra_crew_note ? " · " + escapeHtml(charter.extra_crew_note) : ""}</span><span class="v">${escapeHtml(eur(charter.extra_crew_cost ?? 0))}</span></div>` : ""}
      ${p.total_crew === 0 ? `<div class="row"><span class="k">No crew costs entered</span><span class="v">—</span></div>` : `<div class="row divider"><span class="k">Total crew</span><span class="v">${escapeHtml(eur(p.total_crew))}</span></div>`}
    </div>

    <h2>Fuel & engine</h2>
    <div class="card">
      ${charter.engine_hours_before != null || charter.engine_hours_after != null ? `<div class="row"><span class="k">Engine hours</span><span class="v">${charter.engine_hours_before ?? "—"} → ${charter.engine_hours_after ?? "—"} (${p.engine_hours_used.toFixed(1)} used)</span></div>` : ""}
      ${(charter.fuel_liters ?? 0) > 0 ? `<div class="row"><span class="k">${charter.fuel_liters} L × ${eur2(charter.fuel_price_per_liter ?? 0)}/L</span><span class="v">${escapeHtml(eur(p.fuel_cost))}</span></div>` : `<div class="row"><span class="k">No fuel data entered</span><span class="v">—</span></div>`}
    </div>

    <h2>Owner expenses</h2>
    <div class="card">
      ${(charter.port_fees ?? 0) > 0 ? `<div class="row"><span class="k">Port fees</span><span class="v">${escapeHtml(eur(charter.port_fees ?? 0))}</span></div>` : ""}
      ${(charter.provisioning ?? 0) > 0 ? `<div class="row"><span class="k">Provisioning</span><span class="v">${escapeHtml(eur(charter.provisioning ?? 0))}</span></div>` : ""}
      ${(charter.cleaning ?? 0) > 0 ? `<div class="row"><span class="k">Cleaning</span><span class="v">${escapeHtml(eur(charter.cleaning ?? 0))}</span></div>` : ""}
      ${(charter.other_expenses ?? 0) > 0 ? `<div class="row"><span class="k">Other${charter.other_expenses_note ? " · " + escapeHtml(charter.other_expenses_note) : ""}</span><span class="v">${escapeHtml(eur(charter.other_expenses ?? 0))}</span></div>` : ""}
      ${(charter.port_fees ?? 0) + (charter.provisioning ?? 0) + (charter.cleaning ?? 0) + (charter.other_expenses ?? 0) === 0 ? `<div class="row"><span class="k">No owner expenses entered</span><span class="v">—</span></div>` : ""}
    </div>

    ${
      (charter.extra_service_amount ?? 0) > 0 ||
      (charter.damage_amount ?? 0) > 0 ||
      (charter.refund_amount ?? 0) > 0
        ? `<h2>Extras, damage & refund</h2>
    <div class="card">
      ${(charter.extra_service_amount ?? 0) > 0 ? `<div class="row"><span class="k">Extra services${charter.extra_service_note ? " · " + escapeHtml(charter.extra_service_note) : ""}</span><span class="v">+ ${escapeHtml(eur(charter.extra_service_amount ?? 0))}</span></div>` : ""}
      ${(charter.damage_amount ?? 0) > 0 ? `<div class="row"><span class="k">Damage · paid by ${escapeHtml(charter.damage_paid_by ?? "client")}${charter.damage_note ? " · " + escapeHtml(charter.damage_note) : ""}</span><span class="v">${escapeHtml(eur(charter.damage_amount ?? 0))}</span></div>` : ""}
      ${(charter.refund_amount ?? 0) > 0 ? `<div class="row"><span class="k">Refund${charter.refund_reason ? " · " + escapeHtml(charter.refund_reason) : ""}</span><span class="v">− ${escapeHtml(eur(charter.refund_amount ?? 0))}</span></div>` : ""}
    </div>`
        : ""
    }

    <h2>Profit & loss</h2>
    <div class="card">
      <div class="row"><span class="k">Base net revenue</span><span class="v">${escapeHtml(eur(p.base_net))}</span></div>
      ${p.gross_revenue !== p.base_net ? `<div class="row"><span class="k">+ Transfer / extras</span><span class="v">${escapeHtml(eur(p.gross_revenue - p.base_net))}</span></div>` : ""}
      ${p.central_agent_amount > 0 ? `<div class="row"><span class="k">${escapeHtml(charter.central_agent_name ?? "Central Agent")} commission</span><span class="v">− ${escapeHtml(eur(p.central_agent_amount))}</span></div>` : ""}
      ${p.sub_agent_results.map((r) => `<div class="row"><span class="k">${escapeHtml(r.name)} commission</span><span class="v">− ${escapeHtml(eur(r.amount))}</span></div>`).join("")}
      <div class="row"><span class="k">Crew</span><span class="v">− ${escapeHtml(eur(p.total_crew))}</span></div>
      <div class="row"><span class="k">Fuel</span><span class="v">− ${escapeHtml(eur(p.fuel_cost))}</span></div>
      ${p.damage_absorbed > 0 ? `<div class="row"><span class="k">Damage absorbed</span><span class="v">− ${escapeHtml(eur(p.damage_absorbed))}</span></div>` : ""}
      <div class="row divider"><span class="k">Net profit · margin ${p.margin.toFixed(1)}%</span><span class="v" style="color:${profitColor}">${escapeHtml(eur2(p.net_profit))}</span></div>
    </div>

    <h2>Income distribution (on base net)</h2>
    <div class="card">
      <div class="row"><span class="k">Base net</span><span class="v">${escapeHtml(eur(p.base_net))}</span></div>
      ${p.central_agent_amount > 0 ? `<div class="row"><span class="k">− ${escapeHtml(charter.central_agent_name ?? "Central Agent")}</span><span class="v">${escapeHtml(eur(p.central_agent_amount))}</span></div>` : ""}
      ${p.sub_agent_results.map((r) => `<div class="row"><span class="k">− ${escapeHtml(r.name)}</span><span class="v">${escapeHtml(eur(r.amount))}</span></div>`).join("")}
      ${p.distribution_results.map((r) => `<div class="row"><span class="k">− ${escapeHtml(r.name)}</span><span class="v">${escapeHtml(eur(r.amount))}</span></div>`).join("")}
      <div class="row divider"><span class="k">${p.distribution_balanced ? "Boat Owner receives" : "Over-distributed (owner short)"}</span><span class="v gold">${escapeHtml(eur(Math.abs(p.boat_owner_receives)))}</span></div>
    </div>

    ${charter.notes ? `<h2>Notes</h2><div class="card"><div class="row"><span class="k" style="color:${IVORY}">${escapeHtml(charter.notes)}</span></div></div>` : ""}

    <div class="footer">
      Indicative P&amp;L based on entered data · APA is pass-through, not P&amp;L · Not a certified accounting statement · Yachtworth
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
