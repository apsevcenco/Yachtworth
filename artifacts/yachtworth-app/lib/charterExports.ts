import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import type { Charter, Yacht } from "@workspace/api-client-react";
import {
  calcCharter,
  DEFAULT_CENTRAL_AGENT_TYPE,
  DEFAULT_CENTRAL_AGENT_VALUE,
  type CentralAgentType,
  type CharterCalcInput,
  type CharterCalcResult,
  type DistributionEntry,
  type SubAgent,
  type SubAgentType,
} from "./charterCalc";

const STATUS_LABEL: Record<string, string> = {
  confirmed: "Confirmed",
  tentative: "Tentative",
  maintenance: "Maintenance",
  blocked: "Blocked",
  cancelled: "Cancelled",
};

const CONTRACT_LABEL: Record<string, string> = {
  draft: "Draft",
  sent: "Sent",
  signed: "Signed",
  cancelled: "Cancelled",
};

function fmtDateIso(s: string | null | undefined): string {
  if (!s) return "";
  const m = /^(\d{4}-\d{2}-\d{2})/.exec(s);
  return m ? m[1]! : "";
}

function yachtTitle(y: Yacht | null | undefined): string {
  if (!y) return "Yacht";
  if (y.name && y.name.trim()) return y.name.trim();
  const parts = [y.brand, y.model].filter(
    (s): s is string => Boolean(s) && s!.trim().length > 0,
  );
  return parts.length ? parts.join(" ") : "Yacht";
}

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

export function computeCharterPnl(c: Charter): CharterCalcResult {
  return calcCharter(charterToCalcInput(c));
}

export type { CharterCalcResult as CharterPnl };

export interface FleetMonthInput {
  monthStart: Date;
  yachts: Yacht[];
  charters: Charter[];
}

function csvCell(v: string | number | null | undefined): string {
  if (v == null) return "";
  let s = String(v);
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
  const sorted = [...charters].sort((a, b) => a.start_date.localeCompare(b.start_date));
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
