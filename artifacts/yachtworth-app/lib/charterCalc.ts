/**
 * Pure charter P&L calculator — shared between charter-form (live preview)
 * and charterExports (PDF/CSV totals). Mirrors the spec in
 * attached_assets/2026-05-28_Replit_Prompt_CharterUpdate_Full.pdf.
 *
 * Rules:
 *  • VAT is added ON TOP of base net rate (never subtracted).
 *  • APA is a pass-through fund — NOT revenue. Only shown in P&L if owner
 *    absorbs an APA overspend (negative balance treated as zero here; the
 *    UI surfaces the balance separately).
 *  • Income distribution applies to BASE NET revenue (excl. VAT).
 *  • Charter rate type: 'fixed' | 'per_day' | 'per_week'.
 */

export type DistributionEntry = {
  name: string;
  type: "percent" | "fixed";
  value: number;
};

export type CharterCalcInput = {
  start_date: string | null;
  end_date: string | null;

  // Rate
  charter_rate_type: "fixed" | "per_day" | "per_week";
  charter_rate: number;

  // VAT
  vat_applicable: boolean;
  vat_percent: number;

  // APA
  apa_enabled: boolean;
  apa_percent: number;
  apa_fuel: number;
  apa_provisioning: number;
  apa_beverages: number;
  apa_marina_fees: number;
  apa_communications: number;
  apa_crew_gratuities: number;
  apa_activities: number;
  apa_other: number;

  // Crew
  captain_day_rate: number;
  first_officer_day_rate: number;
  stewardess_count: number;
  stewardess_day_rate: number;
  chef_included: boolean;
  chef_day_rate: number;
  deckhand_count: number;
  deckhand_day_rate: number;
  extra_crew_cost: number;

  // Engine + fuel (non-APA)
  engine_hours_before: number;
  engine_hours_after: number;
  fuel_liters: number;
  fuel_price_per_liter: number;

  // Other expenses (legacy, owner-side)
  port_fees: number;
  provisioning: number;
  cleaning: number;
  other_expenses: number;

  // Extras / damage / transfer
  transfer_fee: number;
  transfer_fee_paid_by: "client" | "owner" | "agent";
  extra_service_amount: number;
  damage_amount: number;
  damage_paid_by: "client" | "insurance" | "owner";

  // Distribution
  distribution: DistributionEntry[];
};

export type CharterCalcResult = {
  days: number;
  engine_hours_used: number;

  // Revenue (NET — excl. VAT)
  base_net: number;
  vat_amount: number;
  total_to_client: number;

  // APA pass-through
  apa_amount: number;
  apa_spent: number;
  apa_balance: number; // positive = refund to client, negative = client owes

  // Total invoice
  total_invoice_to_client: number;

  // Crew
  captain_total: number;
  first_officer_total: number;
  stewardess_total: number;
  chef_total: number;
  deckhand_total: number;
  total_crew: number;

  // Fuel (non-APA)
  fuel_cost: number;

  // Distribution
  distribution_results: { name: string; amount: number; pct: number }[];
  distribution_total: number;
  distribution_difference: number; // base_net − distributed
  distribution_balanced: boolean;
  agent_commission: number;
  aa_commission: number;
  boat_owner_receives: number;

  // P&L
  gross_revenue: number; // base_net + transfer (owner-paid) + extra services
  damage_absorbed: number;
  total_deductions: number;
  net_profit: number;
  margin: number;
};

const round2 = (n: number) => Math.round(n * 100) / 100;

function daysBetween(a: string | null, b: string | null): number {
  if (!a || !b) return 0;
  const mA = /^(\d{4})-(\d{2})-(\d{2})$/.exec(a);
  const mB = /^(\d{4})-(\d{2})-(\d{2})$/.exec(b);
  if (!mA || !mB) return 0;
  const ta = Date.UTC(+mA[1]!, +mA[2]! - 1, +mA[3]!);
  const tb = Date.UTC(+mB[1]!, +mB[2]! - 1, +mB[3]!);
  if (tb < ta) return 0;
  return Math.round((tb - ta) / 86400000) + 1;
}

export function calcCharter(input: CharterCalcInput): CharterCalcResult {
  const days = daysBetween(input.start_date, input.end_date);

  // ── BASE NET (no VAT) ────────────────────────────────────────────
  const rate = Math.max(0, input.charter_rate);
  let base_net = 0;
  if (input.charter_rate_type === "per_day") base_net = rate * days;
  else if (input.charter_rate_type === "per_week") base_net = rate * (days / 7);
  else base_net = rate;
  base_net = round2(base_net);

  // ── VAT ON TOP ───────────────────────────────────────────────────
  const vat_pct = input.vat_applicable ? Math.max(0, input.vat_percent) : 0;
  const vat_amount = round2(base_net * (vat_pct / 100));
  const total_to_client = round2(base_net + vat_amount);

  // ── APA (pass-through) ───────────────────────────────────────────
  const apa_amount = input.apa_enabled
    ? round2(base_net * (Math.max(0, input.apa_percent) / 100))
    : 0;
  const apa_spent = round2(
    input.apa_fuel +
      input.apa_provisioning +
      input.apa_beverages +
      input.apa_marina_fees +
      input.apa_communications +
      input.apa_crew_gratuities +
      input.apa_activities +
      input.apa_other,
  );
  const apa_balance = round2(apa_amount - apa_spent);

  const total_invoice_to_client = round2(total_to_client + apa_amount);

  // ── CREW ─────────────────────────────────────────────────────────
  const captain_total = round2(input.captain_day_rate * days);
  const first_officer_total = round2(input.first_officer_day_rate * days);
  const stewardess_total = round2(
    input.stewardess_count * input.stewardess_day_rate * days,
  );
  const chef_total = input.chef_included
    ? round2(input.chef_day_rate * days)
    : 0;
  const deckhand_total = round2(
    input.deckhand_count * input.deckhand_day_rate * days,
  );
  const total_crew = round2(
    captain_total +
      first_officer_total +
      stewardess_total +
      chef_total +
      deckhand_total +
      Math.max(0, input.extra_crew_cost),
  );

  // ── ENGINE + FUEL (non-APA) ──────────────────────────────────────
  const engine_hours_used = Math.max(
    0,
    input.engine_hours_after - input.engine_hours_before,
  );
  const fuel_cost = round2(input.fuel_liters * input.fuel_price_per_liter);

  // ── DISTRIBUTION (on base_net) ───────────────────────────────────
  const distribution_results = input.distribution.map((p) => {
    const amount =
      p.type === "percent"
        ? round2(base_net * (p.value / 100))
        : round2(p.value);
    const pct = base_net > 0 ? (amount / base_net) * 100 : 0;
    return { name: p.name, amount, pct };
  });
  const distribution_total = round2(
    distribution_results.reduce((s, p) => s + p.amount, 0),
  );
  const distribution_difference = round2(base_net - distribution_total);
  const distribution_balanced = Math.abs(distribution_difference) < 0.01;

  // Pull out known commissions by name (case-insensitive)
  const findByName = (needle: RegExp): number =>
    distribution_results.find((p) => needle.test(p.name))?.amount ?? 0;
  const agent_commission = findByName(/agent/i);
  const aa_commission = findByName(/^aa\b|management|aa\s*commission/i);
  const boat_owner_receives = findByName(/owner|boat\s*owner/i);

  // ── P&L (NET only, APA excluded) ─────────────────────────────────
  const owner_pays_transfer = input.transfer_fee_paid_by === "owner";
  const transfer_in_revenue = owner_pays_transfer
    ? 0
    : Math.max(0, input.transfer_fee);
  const extras = Math.max(0, input.extra_service_amount);
  const gross_revenue = round2(base_net + transfer_in_revenue + extras);
  const damage_absorbed =
    input.damage_paid_by === "owner" ? Math.max(0, input.damage_amount) : 0;
  const total_deductions = round2(
    aa_commission +
      agent_commission +
      total_crew +
      fuel_cost +
      damage_absorbed,
  );
  const net_profit = round2(gross_revenue - total_deductions);
  const margin = gross_revenue > 0 ? (net_profit / gross_revenue) * 100 : 0;

  return {
    days,
    engine_hours_used,
    base_net,
    vat_amount,
    total_to_client,
    apa_amount,
    apa_spent,
    apa_balance,
    total_invoice_to_client,
    captain_total,
    first_officer_total,
    stewardess_total,
    chef_total,
    deckhand_total,
    total_crew,
    fuel_cost,
    distribution_results,
    distribution_total,
    distribution_difference,
    distribution_balanced,
    agent_commission,
    aa_commission,
    boat_owner_receives,
    gross_revenue,
    damage_absorbed,
    total_deductions,
    net_profit,
    margin,
  };
}

/** Default distribution: 80% owner, 10% AA, 10% agent. */
export const DEFAULT_DISTRIBUTION: DistributionEntry[] = [
  { name: "Boat Owner", type: "percent", value: 80 },
  { name: "AA Commission", type: "percent", value: 10 },
  { name: "Agent Commission", type: "percent", value: 10 },
];
