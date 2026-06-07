/**
 * Pure charter P&L calculator — shared between charter-form (live preview)
 * and charterExports (PDF/CSV totals).
 *
 * Rules:
 *  • VAT is added ON TOP of base net rate (never subtracted).
 *  • APA is a pass-through fund — NOT revenue. Only shown in P&L if owner
 *    absorbs an APA overspend (negative balance treated as zero here; the
 *    UI surfaces the balance separately).
 *  • Income distribution applies to BASE NET revenue (excl. VAT).
 *  • Commissions: Central Agent (% net OR fixed €) + up to N sub-agents
 *    (% net, % of central agent's commission, OR fixed €). Boat Owner
 *    receives base_net minus all commissions and any extra custom
 *    participants (kept in `distribution` as freeform entries).
 *  • Charter rate type: 'fixed' | 'per_day' | 'per_week'.
 */

export type DistributionEntry = {
  name: string;
  type: "percent" | "fixed";
  value: number;
};

export type CentralAgentType = "percent_net" | "fixed";
export type SubAgentType = "percent_net" | "percent_central" | "fixed";

export type SubAgent = {
  name: string;
  type: SubAgentType;
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

  // Commission structure (FIX 1 + 2)
  central_agent_name: string;
  central_agent_type: CentralAgentType;
  central_agent_value: number;
  sub_agents: SubAgent[];

  // Custom additional participants (e.g. partners, referrers)
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

  // Commissions
  central_agent_amount: number;
  sub_agent_results: { name: string; amount: number; pct: number }[];
  sub_agent_total: number;
  total_commissions: number;

  // Back-compat alias (= central_agent_amount). PDF / CSV use this.
  agent_commission: number;

  // Custom distribution (on base_net) — does NOT include owner/agents/subs
  distribution_results: { name: string; amount: number; pct: number }[];
  distribution_total: number;
  distribution_difference: number; // base_net − (commissions + customs)
  distribution_balanced: boolean;

  // Owner residual
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

  // ── COMMISSIONS ──────────────────────────────────────────────────
  // Central Agent's GROSS commission — the full slice the owner allocates to
  // the central agency. Sub-agents are paid OUT OF this slice (not on top), so
  // it is also the total commission cost to the owner in the normal case.
  const central_agent_gross =
    input.central_agent_type === "fixed"
      ? round2(Math.max(0, input.central_agent_value))
      : round2(base_net * (Math.max(0, input.central_agent_value) / 100));

  const sub_agent_results = input.sub_agents.map((s) => {
    let amount = 0;
    const v = Math.max(0, s.value);
    if (s.type === "fixed") amount = round2(v);
    else if (s.type === "percent_central")
      amount = round2(central_agent_gross * (v / 100));
    else amount = round2(base_net * (v / 100)); // percent_net
    const pct = base_net > 0 ? (amount / base_net) * 100 : 0;
    return { name: s.name || "Sub-agent", amount, pct };
  });
  const sub_agent_total = round2(
    sub_agent_results.reduce((s, r) => s + r.amount, 0),
  );

  // Sub-agent commissions are DEDUCTED FROM the central agent's gross, not
  // added on top. The central agent keeps the remainder (never negative).
  const central_agent_amount = round2(
    Math.max(0, central_agent_gross - sub_agent_total),
  );

  // Total deducted from the owner = what everyone actually receives. Equals the
  // central agent's gross in the normal case (net + subs = gross); if sub-agents
  // are mis-configured above the gross, the clamp keeps central at 0 and the
  // owner pays exactly the sub-agent total (no money created or destroyed).
  const total_commissions = round2(central_agent_amount + sub_agent_total);

  // ── CUSTOM DISTRIBUTION (on base_net, after commissions) ─────────
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

  // ── BOAT OWNER (residual) ───────────────────────────────────────
  const boat_owner_receives = round2(
    base_net - total_commissions - distribution_total,
  );
  const distribution_difference = boat_owner_receives;
  const distribution_balanced = boat_owner_receives >= 0;

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
    total_commissions + total_crew + fuel_cost + damage_absorbed,
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
    central_agent_amount,
    sub_agent_results,
    sub_agent_total,
    total_commissions,
    agent_commission: central_agent_amount,
    distribution_results,
    distribution_total,
    distribution_difference,
    distribution_balanced,
    boat_owner_receives,
    gross_revenue,
    damage_absorbed,
    total_deductions,
    net_profit,
    margin,
  };
}

/** Default custom participants — empty. Boat owner is implicit (residual). */
export const DEFAULT_DISTRIBUTION: DistributionEntry[] = [];

/** Default central agent commission — 10% of net. */
export const DEFAULT_CENTRAL_AGENT_TYPE: CentralAgentType = "percent_net";
export const DEFAULT_CENTRAL_AGENT_VALUE = 10;
export const MAX_SUB_AGENTS = 3;
