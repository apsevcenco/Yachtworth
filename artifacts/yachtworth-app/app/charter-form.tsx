import { Feather } from "@expo/vector-icons";
import { useAuth } from "@clerk/expo";
import {
  getGetCharterQueryKey,
  getListChartersQueryKey,
  getListYachtsQueryKey,
  useCreateCharter,
  useDeleteCharter,
  useGetCharter,
  useListCharters,
  useListYachts,
  useUpdateCharter,
  type Charter,
  type CharterInput,
  type CharterStatus,
  type CharterRateType,
  type ContractStatus,
  type TransferPaidBy,
  type DamagePaidBy,
  type CharterDistributionEntry,
  type Yacht,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import DateTimePicker, {
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { exportCharterDocument } from "../lib/documentExport";
import {
  calcCharter,
  DEFAULT_DISTRIBUTION,
  DEFAULT_CENTRAL_AGENT_TYPE,
  DEFAULT_CENTRAL_AGENT_VALUE,
  MAX_SUB_AGENTS,
  type CentralAgentType,
  type SubAgentType,
  type CharterCalcInput,
  type DistributionEntry,
} from "../lib/charterCalc";

const NAVY = "#0B1E3F";
const NAVY_ELEV = "#142A52";
const NAVY_DEEP = "#081633";
const GOLD = "#C9A961";
const IVORY = "#F7F3EC";
const MUTED = "rgba(247,243,236,0.55)";
const DIVIDER = "rgba(201,169,97,0.18)";
const RED = "#E74C3C";
const GREEN = "#2ECC71";
const BLUE = "#3498DB";
const GREY = "#95A5A6";
const DARK_GREY = "#7F8C8D";

const isWeb = Platform.OS === "web";

const STATUS_OPTIONS: { value: CharterStatus; label: string; color: string }[] =
  [
    { value: "confirmed", label: "Confirmed", color: GREEN },
    { value: "tentative", label: "Tentative", color: BLUE },
    { value: "maintenance", label: "Maintenance", color: GREY },
    { value: "blocked", label: "Blocked", color: RED },
    { value: "cancelled", label: "Cancelled", color: DARK_GREY },
  ];

const BLOCKING_STATUSES = new Set<CharterStatus>([
  "confirmed",
  "tentative",
  "maintenance",
  "blocked",
]);

function blocksCalendar(status: CharterStatus): boolean {
  return BLOCKING_STATUSES.has(status);
}

function statusLabel(status: CharterStatus): string {
  return STATUS_OPTIONS.find((s) => s.value === status)?.label ?? status;
}

const CONTRACT_OPTIONS: { value: ContractStatus; label: string }[] = [
  { value: "not_signed", label: "Not signed" },
  { value: "sent", label: "Sent" },
  { value: "signed", label: "Signed" },
];

const TRANSFER_PAID_OPTIONS: { value: TransferPaidBy; label: string }[] = [
  { value: "client", label: "Client" },
  { value: "owner", label: "Owner" },
  { value: "agent", label: "Agent" },
];

const DAMAGE_PAID_OPTIONS: { value: DamagePaidBy; label: string }[] = [
  { value: "client", label: "Client" },
  { value: "insurance", label: "Insurance" },
  { value: "owner", label: "Owner" },
];

type SectionId =
  | "basics"
  | "logistics"
  | "vessel"
  | "crew"
  | "revenue"
  | "apa"
  | "expenses"
  | "extras"
  | "distribution"
  | "pl"
  | "notes";

type FormState = {
  // Basics
  yacht_id: string;
  status: CharterStatus;
  client_name: string;
  contact_name: string;
  client_email: string;
  client_phone: string;
  start_date: string;
  end_date: string;
  departure_time: string;
  return_time: string;
  contract_status: ContractStatus;
  contract_date: string;
  // Logistics
  departure_port: string;
  return_port: string;
  mooring_port: string;
  pickup_port: string;
  dropoff_port: string;
  transfer_fee: string;
  transfer_fee_note: string;
  transfer_fee_paid_by: TransferPaidBy;
  // Vessel
  engine_hours_before: string;
  engine_hours_after: string;
  fuel_liters: string;
  fuel_price_per_liter: string;
  // Crew
  captain_name: string;
  captain_day_rate: string;
  first_officer_name: string;
  first_officer_day_rate: string;
  stewardess_count: number;
  stewardess_day_rate: string;
  chef_included: boolean;
  chef_day_rate: string;
  deckhand_count: number;
  deckhand_day_rate: string;
  extra_crew_cost: string;
  extra_crew_note: string;
  // Revenue
  charter_rate_type: CharterRateType;
  charter_rate: string;
  deposit_amount: string;
  deposit_date: string;
  deposit_received: boolean;
  final_payment_amount: string;
  final_payment_date: string;
  final_payment_received: boolean;
  vat_applicable: boolean;
  vat_percent: string;
  // APA
  apa_enabled: boolean;
  apa_percent: string;
  apa_fuel: string;
  apa_provisioning: string;
  apa_beverages: string;
  apa_marina_fees: string;
  apa_communications: string;
  apa_crew_gratuities: string;
  apa_activities: string;
  apa_activities_note: string;
  apa_other: string;
  apa_other_note: string;
  // Expenses (owner-side)
  port_fees: string;
  provisioning: string;
  cleaning: string;
  other_expenses: string;
  other_expenses_note: string;
  // Extras / damage / refund
  extra_service_amount: string;
  extra_service_note: string;
  damage_amount: string;
  damage_note: string;
  damage_paid_by: DamagePaidBy;
  refund_amount: string;
  refund_reason: string;
  // Commissions (Central Agent + up to MAX_SUB_AGENTS sub-agents)
  central_agent_name: string;
  central_agent_type: CentralAgentType;
  central_agent_value: string;
  sub_agents: { name: string; type: SubAgentType; value: string }[];
  // Custom participants (e.g. partner, referrer) — owner is implicit residual
  distribution: DistributionEntry[];
  // Notes
  notes: string;
};

const emptyForm = (yachtId = ""): FormState => ({
  yacht_id: yachtId,
  status: "confirmed",
  client_name: "",
  contact_name: "",
  client_email: "",
  client_phone: "",
  start_date: "",
  end_date: "",
  departure_time: "",
  return_time: "",
  contract_status: "not_signed",
  contract_date: "",
  departure_port: "",
  return_port: "",
  mooring_port: "",
  pickup_port: "",
  dropoff_port: "",
  transfer_fee: "",
  transfer_fee_note: "",
  transfer_fee_paid_by: "client",
  engine_hours_before: "",
  engine_hours_after: "",
  fuel_liters: "",
  fuel_price_per_liter: "",
  captain_name: "",
  captain_day_rate: "",
  first_officer_name: "",
  first_officer_day_rate: "",
  stewardess_count: 0,
  stewardess_day_rate: "",
  chef_included: false,
  chef_day_rate: "",
  deckhand_count: 0,
  deckhand_day_rate: "",
  extra_crew_cost: "",
  extra_crew_note: "",
  charter_rate_type: "fixed",
  charter_rate: "",
  deposit_amount: "",
  deposit_date: "",
  deposit_received: false,
  final_payment_amount: "",
  final_payment_date: "",
  final_payment_received: false,
  vat_applicable: false,
  vat_percent: "",
  apa_enabled: false,
  apa_percent: "30",
  apa_fuel: "",
  apa_provisioning: "",
  apa_beverages: "",
  apa_marina_fees: "",
  apa_communications: "",
  apa_crew_gratuities: "",
  apa_activities: "",
  apa_activities_note: "",
  apa_other: "",
  apa_other_note: "",
  port_fees: "",
  provisioning: "",
  cleaning: "",
  other_expenses: "",
  other_expenses_note: "",
  extra_service_amount: "",
  extra_service_note: "",
  damage_amount: "",
  damage_note: "",
  damage_paid_by: "client",
  refund_amount: "",
  refund_reason: "",
  central_agent_name: "Central Agent",
  central_agent_type: DEFAULT_CENTRAL_AGENT_TYPE,
  central_agent_value: String(DEFAULT_CENTRAL_AGENT_VALUE),
  sub_agents: [],
  distribution: DEFAULT_DISTRIBUTION.map((d) => ({ ...d })),
  notes: "",
});

function fromCharter(c: Charter): FormState {
  const dist = Array.isArray(c.distribution) ? c.distribution : [];
  return {
    yacht_id: c.yacht_id,
    status: c.status,
    client_name: c.client_name ?? "",
    contact_name: c.contact_name ?? "",
    client_email: c.client_email ?? "",
    client_phone: c.client_phone ?? "",
    start_date: c.start_date,
    end_date: c.end_date,
    departure_time: c.departure_time ?? "",
    return_time: c.return_time ?? "",
    contract_status: c.contract_status ?? "not_signed",
    contract_date: c.contract_date ?? "",
    departure_port: c.departure_port ?? "",
    return_port: c.return_port ?? "",
    mooring_port: c.mooring_port ?? "",
    pickup_port: c.pickup_port ?? "",
    dropoff_port: c.dropoff_port ?? "",
    transfer_fee: c.transfer_fee != null ? c.transfer_fee.toString() : "",
    transfer_fee_note: c.transfer_fee_note ?? "",
    transfer_fee_paid_by: c.transfer_fee_paid_by ?? "client",
    engine_hours_before: c.engine_hours_before?.toString() ?? "",
    engine_hours_after: c.engine_hours_after?.toString() ?? "",
    fuel_liters: c.fuel_liters?.toString() ?? "",
    fuel_price_per_liter: c.fuel_price_per_liter?.toString() ?? "",
    captain_name: c.captain_name ?? "",
    captain_day_rate: c.captain_day_rate?.toString() ?? "",
    first_officer_name: c.first_officer_name ?? "",
    first_officer_day_rate: c.first_officer_day_rate != null ? c.first_officer_day_rate.toString() : "",
    stewardess_count: c.stewardess_count ?? 0,
    stewardess_day_rate: c.stewardess_day_rate?.toString() ?? "",
    chef_included: c.chef_included ?? false,
    chef_day_rate: c.chef_day_rate != null ? c.chef_day_rate.toString() : "",
    deckhand_count: c.deckhand_count ?? 0,
    deckhand_day_rate: c.deckhand_day_rate != null ? c.deckhand_day_rate.toString() : "",
    extra_crew_cost: c.extra_crew_cost?.toString() ?? "",
    extra_crew_note: c.extra_crew_note ?? "",
    charter_rate_type: c.charter_rate_type,
    charter_rate: c.charter_rate?.toString() ?? "",
    deposit_amount: c.deposit_amount?.toString() ?? "",
    deposit_date: c.deposit_date ?? "",
    deposit_received: c.deposit_received ?? false,
    final_payment_amount: c.final_payment_amount?.toString() ?? "",
    final_payment_date: c.final_payment_date ?? "",
    final_payment_received: c.final_payment_received ?? false,
    vat_applicable: c.vat_applicable ?? false,
    vat_percent: c.vat_percent?.toString() ?? "",
    apa_enabled: c.apa_enabled ?? false,
    apa_percent: c.apa_percent != null ? c.apa_percent.toString() : "30",
    apa_fuel: c.apa_fuel != null ? c.apa_fuel.toString() : "",
    apa_provisioning: c.apa_provisioning != null ? c.apa_provisioning.toString() : "",
    apa_beverages: c.apa_beverages != null ? c.apa_beverages.toString() : "",
    apa_marina_fees: c.apa_marina_fees != null ? c.apa_marina_fees.toString() : "",
    apa_communications: c.apa_communications != null ? c.apa_communications.toString() : "",
    apa_crew_gratuities: c.apa_crew_gratuities != null ? c.apa_crew_gratuities.toString() : "",
    apa_activities: c.apa_activities != null ? c.apa_activities.toString() : "",
    apa_activities_note: c.apa_activities_note ?? "",
    apa_other: c.apa_other != null ? c.apa_other.toString() : "",
    apa_other_note: c.apa_other_note ?? "",
    port_fees: c.port_fees?.toString() ?? "",
    provisioning: c.provisioning?.toString() ?? "",
    cleaning: c.cleaning?.toString() ?? "",
    other_expenses: c.other_expenses?.toString() ?? "",
    other_expenses_note: c.other_expenses_note ?? "",
    extra_service_amount: c.extra_service_amount != null ? c.extra_service_amount.toString() : "",
    extra_service_note: c.extra_service_note ?? "",
    damage_amount: c.damage_amount != null ? c.damage_amount.toString() : "",
    damage_note: c.damage_note ?? "",
    damage_paid_by: c.damage_paid_by ?? "client",
    refund_amount: c.refund_amount != null ? c.refund_amount.toString() : "",
    refund_reason: c.refund_reason ?? "",
    central_agent_name: c.central_agent_name ?? "Central Agent",
    central_agent_type: (c.central_agent_type ?? DEFAULT_CENTRAL_AGENT_TYPE) as CentralAgentType,
    central_agent_value:
      c.central_agent_value != null
        ? c.central_agent_value.toString()
        : String(DEFAULT_CENTRAL_AGENT_VALUE),
    sub_agents: Array.isArray(c.sub_agents)
      ? c.sub_agents.slice(0, MAX_SUB_AGENTS).map((s) => ({
          name: s.name,
          type: s.type as SubAgentType,
          value: s.value != null ? s.value.toString() : "0",
        }))
      : [],
    distribution: dist.map((d) => ({
      name: d.name,
      type: d.type,
      value: d.value,
    })),
    notes: c.notes ?? "",
  };
}

const num = (s: string): number => {
  const v = s.trim().replace(",", ".");
  if (!v) return 0;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : 0;
};

const numOrNull = (s: string): number | null => {
  const v = s.trim().replace(",", ".");
  if (!v) return null;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : null;
};

const isValidNumeric = (s: string): boolean => {
  const v = s.trim();
  if (!v) return true;
  const n = Number(v.replace(",", "."));
  return Number.isFinite(n) && n >= 0;
};

const dateOrNull = (s: string): string | null => {
  const v = s.trim();
  if (!v) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v)!;
  const t = Date.UTC(+m[1]!, +m[2]! - 1, +m[3]!);
  if (!Number.isFinite(t)) return null;
  return v;
};

function dateRangeLabel(start: string, end: string): string {
  return start === end ? start : `${start} to ${end}`;
}

function toInput(f: FormState): CharterInput {
  const clientName = f.client_name.trim().replace(/\s+/g, " ");
  return {
    yacht_id: f.yacht_id,
    status: f.status,
    client_name: clientName || null,
    contact_name: f.contact_name.trim() || null,
    client_email: f.client_email.trim() || null,
    client_phone: f.client_phone.trim() || null,
    start_date: f.start_date,
    end_date: f.end_date,
    departure_time: f.departure_time.trim() || null,
    return_time: f.return_time.trim() || null,
    contract_status: f.contract_status,
    contract_date: dateOrNull(f.contract_date),
    departure_port: f.departure_port.trim() || null,
    return_port: f.return_port.trim() || null,
    mooring_port: f.mooring_port.trim() || null,
    pickup_port: f.pickup_port.trim() || null,
    dropoff_port: f.dropoff_port.trim() || null,
    transfer_fee: numOrNull(f.transfer_fee),
    transfer_fee_note: f.transfer_fee_note.trim() || null,
    transfer_fee_paid_by: f.transfer_fee_paid_by,
    engine_hours_before: numOrNull(f.engine_hours_before),
    engine_hours_after: numOrNull(f.engine_hours_after),
    fuel_liters: numOrNull(f.fuel_liters),
    fuel_price_per_liter: numOrNull(f.fuel_price_per_liter),
    captain_name: f.captain_name.trim() || null,
    captain_day_rate: numOrNull(f.captain_day_rate),
    first_officer_name: f.first_officer_name.trim() || null,
    first_officer_day_rate: numOrNull(f.first_officer_day_rate),
    stewardess_count: f.stewardess_count,
    stewardess_day_rate: numOrNull(f.stewardess_day_rate),
    chef_included: f.chef_included,
    chef_day_rate: numOrNull(f.chef_day_rate),
    deckhand_count: f.deckhand_count,
    deckhand_day_rate: numOrNull(f.deckhand_day_rate),
    extra_crew_cost: numOrNull(f.extra_crew_cost),
    extra_crew_note: f.extra_crew_note.trim() || null,
    charter_rate_type: f.charter_rate_type,
    charter_rate: numOrNull(f.charter_rate),
    deposit_amount: numOrNull(f.deposit_amount),
    deposit_date: dateOrNull(f.deposit_date),
    deposit_received: f.deposit_received,
    final_payment_amount: numOrNull(f.final_payment_amount),
    final_payment_date: dateOrNull(f.final_payment_date),
    final_payment_received: f.final_payment_received,
    vat_applicable: f.vat_applicable,
    vat_percent: numOrNull(f.vat_percent),
    apa_enabled: f.apa_enabled,
    apa_percent: numOrNull(f.apa_percent),
    apa_fuel: numOrNull(f.apa_fuel),
    apa_provisioning: numOrNull(f.apa_provisioning),
    apa_beverages: numOrNull(f.apa_beverages),
    apa_marina_fees: numOrNull(f.apa_marina_fees),
    apa_communications: numOrNull(f.apa_communications),
    apa_crew_gratuities: numOrNull(f.apa_crew_gratuities),
    apa_activities: numOrNull(f.apa_activities),
    apa_activities_note: f.apa_activities_note.trim() || null,
    apa_other: numOrNull(f.apa_other),
    apa_other_note: f.apa_other_note.trim() || null,
    port_fees: numOrNull(f.port_fees),
    provisioning: numOrNull(f.provisioning),
    cleaning: numOrNull(f.cleaning),
    other_expenses: numOrNull(f.other_expenses),
    other_expenses_note: f.other_expenses_note.trim() || null,
    extra_service_amount: numOrNull(f.extra_service_amount),
    extra_service_note: f.extra_service_note.trim() || null,
    damage_amount: numOrNull(f.damage_amount),
    damage_note: f.damage_note.trim() || null,
    damage_paid_by: f.damage_paid_by,
    refund_amount: numOrNull(f.refund_amount),
    refund_reason: f.refund_reason.trim() || null,
    distribution: f.distribution.map(
      (d) =>
        ({ name: d.name, type: d.type, value: d.value }) as CharterDistributionEntry,
    ),
    central_agent_name: f.central_agent_name.trim() || "Central Agent",
    central_agent_type: f.central_agent_type,
    central_agent_value: num(f.central_agent_value),
    sub_agents: f.sub_agents.map((s) => ({
      name: s.name.trim() || "Sub-agent",
      type: s.type,
      value: num(s.value),
    })),
    notes: f.notes.trim() || null,
  };
}

function toCalcInput(f: FormState): CharterCalcInput {
  return {
    start_date: f.start_date || null,
    end_date: f.end_date || null,
    charter_rate_type: f.charter_rate_type,
    charter_rate: num(f.charter_rate),
    vat_applicable: f.vat_applicable,
    vat_percent: num(f.vat_percent),
    apa_enabled: f.apa_enabled,
    apa_percent: num(f.apa_percent),
    apa_fuel: num(f.apa_fuel),
    apa_provisioning: num(f.apa_provisioning),
    apa_beverages: num(f.apa_beverages),
    apa_marina_fees: num(f.apa_marina_fees),
    apa_communications: num(f.apa_communications),
    apa_crew_gratuities: num(f.apa_crew_gratuities),
    apa_activities: num(f.apa_activities),
    apa_other: num(f.apa_other),
    captain_day_rate: num(f.captain_day_rate),
    first_officer_day_rate: num(f.first_officer_day_rate),
    stewardess_count: f.stewardess_count,
    stewardess_day_rate: num(f.stewardess_day_rate),
    chef_included: f.chef_included,
    chef_day_rate: num(f.chef_day_rate),
    deckhand_count: f.deckhand_count,
    deckhand_day_rate: num(f.deckhand_day_rate),
    extra_crew_cost: num(f.extra_crew_cost),
    engine_hours_before: num(f.engine_hours_before),
    engine_hours_after: num(f.engine_hours_after),
    fuel_liters: num(f.fuel_liters),
    fuel_price_per_liter: num(f.fuel_price_per_liter),
    port_fees: num(f.port_fees),
    provisioning: num(f.provisioning),
    cleaning: num(f.cleaning),
    other_expenses: num(f.other_expenses),
    transfer_fee: num(f.transfer_fee),
    transfer_fee_paid_by: f.transfer_fee_paid_by,
    extra_service_amount: num(f.extra_service_amount),
    damage_amount: num(f.damage_amount),
    damage_paid_by: f.damage_paid_by,
    central_agent_name: f.central_agent_name.trim() || "Central Agent",
    central_agent_type: f.central_agent_type,
    central_agent_value: num(f.central_agent_value),
    sub_agents: f.sub_agents.map((s) => ({
      name: s.name.trim() || "Sub-agent",
      type: s.type,
      value: num(s.value),
    })),
    distribution: f.distribution,
  };
}

const eur = (n: number) =>
  "€" +
  n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export default function CharterFormScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const { isSignedIn, isLoaded } = useAuth();
  const params = useLocalSearchParams<{
    id?: string;
    yacht_id?: string;
    start_date?: string;
  }>();

  const editId = typeof params.id === "string" ? params.id : null;
  const preselectYachtId =
    typeof params.yacht_id === "string" ? params.yacht_id : "";
  const preselectStart =
    typeof params.start_date === "string" ? params.start_date : "";

  const yachtsQ = useListYachts(undefined, {
    query: {
      queryKey: getListYachtsQueryKey(),
      enabled: Boolean(isSignedIn),
      staleTime: 30_000,
    },
  });
  const yachts: Yacht[] = yachtsQ.data?.items ?? [];

  const charterQ = useGetCharter(editId ?? "", {
    query: {
      queryKey: getGetCharterQueryKey(editId ?? ""),
      enabled: Boolean(isSignedIn) && Boolean(editId),
    },
  });

  const [form, setForm] = useState<FormState>(() => {
    const initial = emptyForm(preselectYachtId);
    if (preselectStart && /^\d{4}-\d{2}-\d{2}$/.test(preselectStart)) {
      initial.start_date = preselectStart;
    }
    return initial;
  });

  const conflictParams = useMemo(
    () => ({
      yacht_id: form.yacht_id,
      start: form.start_date,
      end: form.end_date,
    }),
    [form.yacht_id, form.start_date, form.end_date],
  );
  const conflictsQ = useListCharters(conflictParams, {
    query: {
      queryKey: getListChartersQueryKey(conflictParams),
      enabled:
        Boolean(isSignedIn) &&
        Boolean(form.yacht_id) &&
        Boolean(dateOrNull(form.start_date)) &&
        Boolean(dateOrNull(form.end_date)) &&
        blocksCalendar(form.status),
      staleTime: 10_000,
    },
  });

  const [hydrated, setHydrated] = useState(!editId);
  useEffect(() => {
    if (editId && charterQ.data && !hydrated) {
      setForm(fromCharter(charterQ.data));
      setHydrated(true);
    }
  }, [editId, charterQ.data, hydrated]);

  useEffect(() => {
    if (!editId && !form.yacht_id && yachts.length > 0) {
      setForm((f) => ({ ...f, yacht_id: yachts[0]!.id }));
    }
  }, [editId, form.yacht_id, yachts]);

  // Per UX rule: every time the user enters this screen (initial mount,
  // back-navigation, or post-save return), all sections collapse except
  // the first one ("basics").
  const ALL_COLLAPSED_EXCEPT_BASICS: SectionId[] = [
    "logistics",
    "vessel",
    "crew",
    "revenue",
    "apa",
    "expenses",
    "extras",
    "distribution",
    "pl",
    "notes",
  ];
  const [collapsed, setCollapsed] = useState<Set<SectionId>>(
    new Set(ALL_COLLAPSED_EXCEPT_BASICS),
  );
  useFocusEffect(
    React.useCallback(() => {
      setCollapsed(new Set(ALL_COLLAPSED_EXCEPT_BASICS));
    }, []),
  );
  const toggle = (s: SectionId) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s);
      else next.add(s);
      return next;
    });

  const [yachtPickerOpen, setYachtPickerOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [dateField, setDateField] = useState<
    null | keyof Pick<
      FormState,
      "start_date" | "end_date" | "deposit_date" | "final_payment_date" | "contract_date"
    >
  >(null);

  const calc = useMemo(() => calcCharter(toCalcInput(form)), [form]);
  const conflictingCharters = useMemo(() => {
    if (!blocksCalendar(form.status)) return [];
    if (!dateOrNull(form.start_date) || !dateOrNull(form.end_date)) return [];
    return (conflictsQ.data?.items ?? []).filter((c) => {
      if (editId && c.id === editId) return false;
      if (!blocksCalendar(c.status)) return false;
      return c.start_date <= form.end_date && c.end_date >= form.start_date;
    });
  }, [conflictsQ.data?.items, editId, form.end_date, form.start_date, form.status]);

  const createM = useCreateCharter();
  const updateM = useUpdateCharter();
  const deleteM = useDeleteCharter();
  const saving = createM.isPending || updateM.isPending;

  const selectedYacht = yachts.find((y) => y.id === form.yacht_id);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  // --- Distribution helpers ---
  const updateDist = (idx: number, patch: Partial<DistributionEntry>) =>
    setForm((f) => ({
      ...f,
      distribution: f.distribution.map((d, i) =>
        i === idx ? { ...d, ...patch } : d,
      ),
    }));
  const addDist = () =>
    setForm((f) => ({
      ...f,
      distribution: [
        ...f.distribution,
        { name: "Partner", type: "percent", value: 0 },
      ],
    }));
  const removeDist = (idx: number) =>
    setForm((f) => ({
      ...f,
      distribution: f.distribution.filter((_, i) => i !== idx),
    }));

  // --- Sub-agent helpers ---
  const addSubAgent = () =>
    setForm((f) =>
      f.sub_agents.length >= MAX_SUB_AGENTS
        ? f
        : {
            ...f,
            sub_agents: [
              ...f.sub_agents,
              { name: "Sub-agent", type: "percent_net" as SubAgentType, value: "0" },
            ],
          },
    );
  const updateSubAgent = (
    idx: number,
    patch: Partial<{ name: string; type: SubAgentType; value: string }>,
  ) =>
    setForm((f) => ({
      ...f,
      sub_agents: f.sub_agents.map((s, i) => (i === idx ? { ...s, ...patch } : s)),
    }));
  const removeSubAgent = (idx: number) =>
    setForm((f) => ({
      ...f,
      sub_agents: f.sub_agents.filter((_, i) => i !== idx),
    }));

  // ---- Save / Delete ----
  const handleSave = () => {
    if (!form.yacht_id) {
      Alert.alert("Yacht required", "Please select a yacht first.");
      return;
    }
    if (!dateOrNull(form.start_date) || !dateOrNull(form.end_date)) {
      Alert.alert("Dates required", "Please pick start and end dates.");
      return;
    }
    if (calc.days <= 0) {
      Alert.alert(
        "Invalid dates",
        "End date must be on or after the start date.",
      );
      return;
    }
    if (!form.client_name.trim()) {
      Alert.alert(
        "Client name required",
        "Please enter the client name to save this charter.",
      );
      return;
    }
    if (conflictingCharters.length > 0) {
      const first = conflictingCharters[0]!;
      Alert.alert(
        "Yacht already booked",
        `${statusLabel(first.status)} from ${dateRangeLabel(first.start_date, first.end_date)} conflicts with these dates. Choose another date range or edit the existing booking first.`,
      );
      return;
    }
    const numericFields: { key: keyof FormState; label: string }[] = [
      { key: "engine_hours_before", label: "Engine hours before" },
      { key: "engine_hours_after", label: "Engine hours after" },
      { key: "fuel_liters", label: "Fuel liters" },
      { key: "fuel_price_per_liter", label: "Fuel price per liter" },
      { key: "captain_day_rate", label: "Captain day rate" },
      { key: "first_officer_day_rate", label: "First officer day rate" },
      { key: "stewardess_day_rate", label: "Stewardess day rate" },
      { key: "chef_day_rate", label: "Chef day rate" },
      { key: "deckhand_day_rate", label: "Deckhand day rate" },
      { key: "extra_crew_cost", label: "Additional crew cost" },
      { key: "charter_rate", label: "Charter rate" },
      { key: "deposit_amount", label: "Deposit amount" },
      { key: "final_payment_amount", label: "Final payment amount" },
      { key: "vat_percent", label: "VAT %" },
      { key: "apa_percent", label: "APA %" },
      { key: "apa_fuel", label: "APA fuel" },
      { key: "apa_provisioning", label: "APA provisioning" },
      { key: "apa_beverages", label: "APA beverages" },
      { key: "apa_marina_fees", label: "APA marina fees" },
      { key: "apa_communications", label: "APA communications" },
      { key: "apa_crew_gratuities", label: "APA crew gratuities" },
      { key: "apa_activities", label: "APA activities" },
      { key: "apa_other", label: "APA other" },
      { key: "port_fees", label: "Port fees" },
      { key: "provisioning", label: "Provisioning" },
      { key: "cleaning", label: "Cleaning" },
      { key: "other_expenses", label: "Other expenses" },
      { key: "transfer_fee", label: "Transfer fee" },
      { key: "extra_service_amount", label: "Extra service amount" },
      { key: "damage_amount", label: "Damage amount" },
      { key: "refund_amount", label: "Refund amount" },
    ];
    for (const fld of numericFields) {
      const v = form[fld.key];
      if (typeof v === "string" && !isValidNumeric(v)) {
        Alert.alert(
          "Invalid number",
          `${fld.label} must be a positive number (use a dot for decimals, e.g. 1.5).`,
        );
        return;
      }
    }
    if (form.vat_applicable) {
      const pct = numOrNull(form.vat_percent);
      if (pct === null || pct <= 0) {
        Alert.alert(
          "VAT % required",
          "VAT toggle is on. Enter a VAT percentage greater than 0, or turn VAT off.",
        );
        return;
      }
    }
    // Normalize partial times (e.g. "9" → "09:00", "12:3" → "12:30") before save
    const normDep = normalizeTime(form.departure_time);
    const normRet = normalizeTime(form.return_time);
    if (normDep !== form.departure_time || normRet !== form.return_time) {
      setForm((f) => ({ ...f, departure_time: normDep, return_time: normRet }));
    }
    const formForSave: FormState = {
      ...form,
      departure_time: normDep,
      return_time: normRet,
    };
    // Over-distribution warning — non-blocking. Owner is the residual, so any
    // negative `boat_owner_receives` means commissions + custom parties exceed
    // base net.
    if (calc.base_net > 0 && calc.boat_owner_receives < 0) {
      const proceed = () => doSave(toInput(formForSave));
      Alert.alert(
        "Owner over-distributed",
        `Commissions and participants exceed base net by ${eur(Math.abs(calc.boat_owner_receives))}. Boat owner would receive a negative amount. Save anyway?`,
        [
          { text: "Cancel", style: "cancel" },
          { text: "Save anyway", onPress: proceed },
        ],
      );
      return;
    }
    doSave(toInput(formForSave));
  };

  const doSave = (body: CharterInput) => {
    const opts = {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: ["/api/charters"] });
        qc.invalidateQueries({ queryKey: ["/api/clients"] });
        if (editId) qc.invalidateQueries({ queryKey: [`/api/charters/${editId}`] });
        router.back();
      },
      onError: (err: unknown) => {
        Alert.alert(
          "Could not save",
          err instanceof Error ? err.message : "Unknown error",
        );
      },
    };
    if (editId) {
      updateM.mutate({ id: editId, data: body }, opts);
    } else {
      createM.mutate({ data: body }, opts);
    }
  };

  const handleDelete = () => {
    if (!editId) return;
    Alert.alert("Delete charter?", "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          deleteM.mutate(
            { id: editId },
            {
              onSuccess: () => {
                qc.invalidateQueries({ queryKey: ["/api/charters"] });
                qc.invalidateQueries({ queryKey: ["/api/clients"] });
                router.back();
              },
              onError: (err: unknown) => {
                Alert.alert(
                  "Could not delete",
                  err instanceof Error ? err.message : "Unknown error",
                );
              },
            },
          );
        },
      },
    ]);
  };

  // ---- Render guards ----
  if (!isLoaded) {
    return (
      <View style={[styles.root, styles.centerFull]}>
        <ActivityIndicator color={GOLD} />
      </View>
    );
  }
  if (!isSignedIn) {
    return (
      <View style={styles.root}>
        <View style={styles.centerFull}>
          <Feather name="lock" size={28} color={GOLD} />
          <Text style={styles.emptyTitle}>Sign in required</Text>
          <Pressable
            onPress={() => router.replace("/(auth)/sign-in")}
            style={styles.primaryBtn}
          >
            <Text style={styles.primaryBtnText}>Sign in</Text>
          </Pressable>
        </View>
      </View>
    );
  }
  if (editId && charterQ.isError) {
    return (
      <View style={styles.root}>
        <View style={styles.centerFull}>
          <Feather name="alert-circle" size={28} color={RED} />
          <Text style={styles.emptyTitle}>Could not load charter</Text>
          <Text style={styles.emptyText}>
            {charterQ.error instanceof Error
              ? charterQ.error.message
              : "This charter may have been deleted, or your session has expired."}
          </Text>
          <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
            <Pressable
              onPress={() => router.back()}
              style={[styles.primaryBtn, { backgroundColor: NAVY_ELEV }]}
            >
              <Text style={[styles.primaryBtnText, { color: IVORY }]}>
                Go back
              </Text>
            </Pressable>
            <Pressable
              onPress={() => charterQ.refetch()}
              style={styles.primaryBtn}
            >
              <Text style={styles.primaryBtnText}>Retry</Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  }
  if (editId && (!charterQ.data || !hydrated)) {
    return (
      <View style={styles.root}>
        <View style={styles.centerFull}>
          <ActivityIndicator color={GOLD} />
        </View>
      </View>
    );
  }

  const headerPad = (isWeb ? 67 : insets.top) + 60;

  const onPickDate = (event: DateTimePickerEvent, picked?: Date) => {
    const field = dateField;
    // Android dismisses synchronously; iOS keeps modal open until close button.
    if (Platform.OS !== "ios") setDateField(null);
    if (event.type === "dismissed" || !picked || !field) return;
    const y = picked.getFullYear();
    const m = String(picked.getMonth() + 1).padStart(2, "0");
    const d = String(picked.getDate()).padStart(2, "0");
    set(field, `${y}-${m}-${d}`);
  };

  const datePickerInitial = (): Date => {
    if (!dateField) return new Date();
    const v = form[dateField];
    const parsed = dateOrNull(v);
    if (!parsed) return new Date();
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(parsed)!;
    return new Date(+m[1]!, +m[2]! - 1, +m[3]!);
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={0}
    >
      <Pressable
        onPress={() => router.back()}
        style={[styles.backFab, { top: (isWeb ? 12 : insets.top) + 56 }]}
        accessibilityRole="button"
        accessibilityLabel="Go back"
      >
        <Feather name="chevron-left" size={22} color={IVORY} />
      </Pressable>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: headerPad,
          paddingHorizontal: 18,
          paddingBottom: 130,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.kicker}>CHARTER PLANNER</Text>
        <Text style={styles.title}>
          {editId ? "Edit Charter" : "New Charter"}
        </Text>

        {/* SECTION 1: BASICS */}
        <Section
          id="basics"
          title="Basics"
          icon="user"
          collapsed={collapsed.has("basics")}
          onToggle={() => toggle("basics")}
        >
          <Field
            label="Client name *"
            value={form.client_name}
            onChangeText={(v) => set("client_name", v)}
            autoCapitalize="words"
            placeholder="Full name"
          />
          <Field
            label="Contact (alternate)"
            value={form.contact_name}
            onChangeText={(v) => set("contact_name", v)}
            autoCapitalize="words"
            placeholder="Agent / broker / secondary contact"
          />
          <View style={styles.row2}>
            <View style={{ flex: 1 }}>
              <Field
                label="Email"
                value={form.client_email}
                onChangeText={(v) => set("client_email", v)}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholder="email@example.com"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Field
                label="Phone"
                value={form.client_phone}
                onChangeText={(v) => set("client_phone", v)}
                keyboardType="phone-pad"
                placeholder="+34 …"
              />
            </View>
          </View>

          <Text style={styles.fieldLabel}>Status</Text>
          <View style={styles.pillRow}>
            {STATUS_OPTIONS.map((opt) => {
              const active = form.status === opt.value;
              return (
                <Pressable
                  key={opt.value}
                  onPress={() => set("status", opt.value)}
                  style={[
                    styles.statusPill,
                    active && {
                      backgroundColor: opt.color + "22",
                      borderColor: opt.color,
                    },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`Set status ${opt.label}`}
                >
                  <View style={[styles.dot, { backgroundColor: opt.color }]} />
                  <Text
                    style={[
                      styles.statusPillText,
                      active && { color: IVORY },
                    ]}
                  >
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={[styles.fieldLabel, { marginTop: 10 }]}>Dates *</Text>
          <View style={styles.row2}>
            <View style={{ flex: 1 }}>
              <Text style={styles.subLabel}>Start</Text>
              <DateField
                value={form.start_date}
                onPress={() => setDateField("start_date")}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.subLabel}>End</Text>
              <DateField
                value={form.end_date}
                onPress={() => setDateField("end_date")}
              />
            </View>
          </View>
          {calc.days > 0 ? (
            <Text style={styles.computed}>
              Duration: <Text style={{ color: GOLD }}>{calc.days} days</Text>
            </Text>
          ) : (
            <Text style={[styles.computed, { color: MUTED }]}>
              Pick valid dates to see duration
            </Text>
          )}
          {conflictingCharters.length > 0 ? (
            <View style={styles.conflictBox}>
              <Feather name="alert-triangle" size={15} color={RED} />
              <Text style={styles.conflictText}>
                {statusLabel(conflictingCharters[0]!.status)} already exists from{" "}
                {dateRangeLabel(
                  conflictingCharters[0]!.start_date,
                  conflictingCharters[0]!.end_date,
                )}
                . Change dates or edit that booking.
              </Text>
            </View>
          ) : null}

          <View style={styles.row2}>
            <View style={{ flex: 1 }}>
              <TimeInput
                label="Departure time"
                value={form.departure_time}
                onChangeText={(v) => set("departure_time", v)}
              />
            </View>
            <View style={{ flex: 1 }}>
              <TimeInput
                label="Return time"
                value={form.return_time}
                onChangeText={(v) => set("return_time", v)}
              />
            </View>
          </View>

          <Text style={[styles.fieldLabel, { marginTop: 10 }]}>
            Contract status
          </Text>
          <View style={styles.pillRow}>
            {CONTRACT_OPTIONS.map((opt) => {
              const active = form.contract_status === opt.value;
              return (
                <Pressable
                  key={opt.value}
                  onPress={() => set("contract_status", opt.value)}
                  style={[styles.modePill, active && styles.modePillActive]}
                  accessibilityRole="button"
                  accessibilityLabel={`Contract ${opt.label}`}
                >
                  <Text
                    style={[
                      styles.modePillText,
                      active && { color: GOLD },
                    ]}
                  >
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={styles.subLabel}>Contract date</Text>
          <DateField
            value={form.contract_date}
            onPress={() => setDateField("contract_date")}
          />
        </Section>

        {/* SECTION 2: LOGISTICS */}
        <Section
          id="logistics"
          title="Logistics"
          icon="map-pin"
          collapsed={collapsed.has("logistics")}
          onToggle={() => toggle("logistics")}
        >
          <Field
            label="Mooring port (home base)"
            value={form.mooring_port}
            onChangeText={(v) => set("mooring_port", v)}
            placeholder="e.g. Palma de Mallorca"
          />
          <View style={styles.row2}>
            <View style={{ flex: 1 }}>
              <Field
                label="Departure port"
                value={form.departure_port}
                onChangeText={(v) => set("departure_port", v)}
                placeholder="Port name"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Field
                label="Return port"
                value={form.return_port}
                onChangeText={(v) => set("return_port", v)}
                placeholder="Port name"
              />
            </View>
          </View>
          <View style={styles.row2}>
            <View style={{ flex: 1 }}>
              <Field
                label="Client pickup port"
                value={form.pickup_port}
                onChangeText={(v) => set("pickup_port", v)}
                placeholder="Port name"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Field
                label="Client drop-off port"
                value={form.dropoff_port}
                onChangeText={(v) => set("dropoff_port", v)}
                placeholder="Port name"
              />
            </View>
          </View>

          <Field
            label="Transfer fee (€)"
            value={form.transfer_fee}
            onChangeText={(v) => set("transfer_fee", v)}
            keyboardType="decimal-pad"
            placeholder="0"
          />
          <Field
            label="Transfer fee note"
            value={form.transfer_fee_note}
            onChangeText={(v) => set("transfer_fee_note", v)}
            placeholder="e.g. delivery to charter base"
          />
          <Text style={styles.fieldLabel}>Transfer fee paid by</Text>
          <View style={styles.pillRow}>
            {TRANSFER_PAID_OPTIONS.map((opt) => {
              const active = form.transfer_fee_paid_by === opt.value;
              return (
                <Pressable
                  key={opt.value}
                  onPress={() => set("transfer_fee_paid_by", opt.value)}
                  style={[styles.modePill, active && styles.modePillActive]}
                  accessibilityRole="button"
                  accessibilityLabel={`Transfer paid by ${opt.label}`}
                >
                  <Text
                    style={[
                      styles.modePillText,
                      active && { color: GOLD },
                    ]}
                  >
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Section>

        {/* SECTION 3: VESSEL */}
        <Section
          id="vessel"
          title="Vessel"
          icon="anchor"
          collapsed={collapsed.has("vessel")}
          onToggle={() => toggle("vessel")}
        >
          <Text style={styles.fieldLabel}>Yacht</Text>
          <Pressable
            onPress={() => setYachtPickerOpen(true)}
            style={[styles.input, styles.yachtPicker]}
            accessibilityRole="button"
            accessibilityLabel="Select yacht"
          >
            <Text style={{ color: selectedYacht ? IVORY : MUTED }}>
              {selectedYacht
                ? `${selectedYacht.name}${
                    selectedYacht.brand ? " · " + selectedYacht.brand : ""
                  }${
                    selectedYacht.length_meters
                      ? " · " + selectedYacht.length_meters + "m"
                      : ""
                  }`
                : "Select yacht…"}
            </Text>
            <Feather name="chevron-down" size={18} color={MUTED} />
          </Pressable>

          <View style={styles.row2}>
            <View style={{ flex: 1 }}>
              <Field
                label="Engine hrs before"
                value={form.engine_hours_before}
                onChangeText={(v) => set("engine_hours_before", v)}
                keyboardType="decimal-pad"
                placeholder="0"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Field
                label="Engine hrs after"
                value={form.engine_hours_after}
                onChangeText={(v) => set("engine_hours_after", v)}
                keyboardType="decimal-pad"
                placeholder="0"
              />
            </View>
          </View>
          {calc.engine_hours_used > 0 && (
            <Text style={styles.computed}>
              Engine hours used:{" "}
              <Text style={{ color: GOLD }}>
                {calc.engine_hours_used.toFixed(1)} hrs
              </Text>
            </Text>
          )}

          <View style={styles.row2}>
            <View style={{ flex: 1 }}>
              <Field
                label="Fuel (liters)"
                value={form.fuel_liters}
                onChangeText={(v) => set("fuel_liters", v)}
                keyboardType="decimal-pad"
                placeholder="0"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Field
                label="Price / liter (€)"
                value={form.fuel_price_per_liter}
                onChangeText={(v) => set("fuel_price_per_liter", v)}
                keyboardType="decimal-pad"
                placeholder="0.00"
              />
            </View>
          </View>
          {calc.fuel_cost > 0 && (
            <Text style={styles.computed}>
              Fuel cost:{" "}
              <Text style={{ color: GOLD }}>{eur(calc.fuel_cost)}</Text>
            </Text>
          )}
        </Section>

        {/* SECTION 4: CREW */}
        <Section
          id="crew"
          title="Crew"
          icon="users"
          collapsed={collapsed.has("crew")}
          onToggle={() => toggle("crew")}
        >
          <Field
            label="Captain name"
            value={form.captain_name}
            onChangeText={(v) => set("captain_name", v)}
            autoCapitalize="words"
            placeholder="Full name"
          />
          <Field
            label="Captain day rate (€/day)"
            value={form.captain_day_rate}
            onChangeText={(v) => set("captain_day_rate", v)}
            keyboardType="decimal-pad"
            placeholder="0"
          />
          {calc.captain_total > 0 && (
            <Text style={styles.computed}>
              Captain total:{" "}
              <Text style={{ color: GOLD }}>{eur(calc.captain_total)}</Text>
            </Text>
          )}

          <Field
            label="First officer name"
            value={form.first_officer_name}
            onChangeText={(v) => set("first_officer_name", v)}
            autoCapitalize="words"
            placeholder="Full name (optional)"
          />
          <Field
            label="First officer day rate (€/day)"
            value={form.first_officer_day_rate}
            onChangeText={(v) => set("first_officer_day_rate", v)}
            keyboardType="decimal-pad"
            placeholder="0"
          />
          {calc.first_officer_total > 0 && (
            <Text style={styles.computed}>
              First officer total:{" "}
              <Text style={{ color: GOLD }}>
                {eur(calc.first_officer_total)}
              </Text>
            </Text>
          )}

          <Text style={[styles.fieldLabel, { marginTop: 12 }]}>
            Stewardess count
          </Text>
          <Stepper
            value={form.stewardess_count}
            onChange={(n) => set("stewardess_count", n)}
            min={0}
            max={20}
            label="stewardess"
          />
          <Field
            label="Stewardess day rate (€/day each)"
            value={form.stewardess_day_rate}
            onChangeText={(v) => set("stewardess_day_rate", v)}
            keyboardType="decimal-pad"
            placeholder="0"
          />
          {calc.stewardess_total > 0 && (
            <Text style={styles.computed}>
              Stewardess total:{" "}
              <Text style={{ color: GOLD }}>{eur(calc.stewardess_total)}</Text>
            </Text>
          )}

          <ToggleRow
            label="Chef included"
            value={form.chef_included}
            onValueChange={(v) => set("chef_included", v)}
          />
          {form.chef_included && (
            <>
              <Field
                label="Chef day rate (€/day)"
                value={form.chef_day_rate}
                onChangeText={(v) => set("chef_day_rate", v)}
                keyboardType="decimal-pad"
                placeholder="0"
              />
              {calc.chef_total > 0 && (
                <Text style={styles.computed}>
                  Chef total:{" "}
                  <Text style={{ color: GOLD }}>{eur(calc.chef_total)}</Text>
                </Text>
              )}
            </>
          )}

          <Text style={[styles.fieldLabel, { marginTop: 12 }]}>
            Deckhand count
          </Text>
          <Stepper
            value={form.deckhand_count}
            onChange={(n) => set("deckhand_count", n)}
            min={0}
            max={20}
            label="deckhand"
          />
          <Field
            label="Deckhand day rate (€/day each)"
            value={form.deckhand_day_rate}
            onChangeText={(v) => set("deckhand_day_rate", v)}
            keyboardType="decimal-pad"
            placeholder="0"
          />
          {calc.deckhand_total > 0 && (
            <Text style={styles.computed}>
              Deckhand total:{" "}
              <Text style={{ color: GOLD }}>{eur(calc.deckhand_total)}</Text>
            </Text>
          )}

          <Field
            label="Additional crew / extras (€)"
            value={form.extra_crew_cost}
            onChangeText={(v) => set("extra_crew_cost", v)}
            keyboardType="decimal-pad"
            placeholder="0"
          />
          <Field
            label="Extras description"
            value={form.extra_crew_note}
            onChangeText={(v) => set("extra_crew_note", v)}
            placeholder="e.g. masseuse, photographer"
          />

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>TOTAL CREW COST</Text>
            <Text style={styles.totalValue}>{eur(calc.total_crew)}</Text>
          </View>
        </Section>

        {/* SECTION 5: REVENUE */}
        <Section
          id="revenue"
          title="Revenue"
          icon="dollar-sign"
          collapsed={collapsed.has("revenue")}
          onToggle={() => toggle("revenue")}
        >
          <Text style={styles.fieldLabel}>Charter rate type</Text>
          <View style={styles.pillRow}>
            {(["fixed", "per_day", "per_week"] as CharterRateType[]).map((t) => {
              const active = form.charter_rate_type === t;
              return (
                <Pressable
                  key={t}
                  onPress={() => set("charter_rate_type", t)}
                  style={[styles.modePill, active && styles.modePillActive]}
                  accessibilityRole="button"
                  accessibilityLabel={`Rate type ${t}`}
                >
                  <Text
                    style={[
                      styles.modePillText,
                      active && { color: GOLD },
                    ]}
                  >
                    {t === "fixed"
                      ? "Fixed total"
                      : t === "per_day"
                        ? "Per day"
                        : "Per week"}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Field
            label={
              form.charter_rate_type === "per_day"
                ? "Charter rate (€/day, net)"
                : form.charter_rate_type === "per_week"
                  ? "Charter rate (€/week, net)"
                  : "Charter rate (€ net, total)"
            }
            value={form.charter_rate}
            onChangeText={(v) => set("charter_rate", v)}
            keyboardType="decimal-pad"
            placeholder="0"
          />
          {form.charter_rate_type !== "fixed" &&
            calc.days > 0 &&
            calc.base_net > 0 && (
              <Text style={styles.computed}>
                ={" "}
                <Text style={{ color: GOLD }}>{eur(calc.base_net)}</Text> base
                net over {calc.days} day{calc.days === 1 ? "" : "s"}
              </Text>
            )}

          <Text style={[styles.fieldLabel, { marginTop: 16 }]}>Deposit</Text>
          <View style={styles.row2}>
            <View style={{ flex: 1 }}>
              <Field
                label="Amount (€)"
                value={form.deposit_amount}
                onChangeText={(v) => set("deposit_amount", v)}
                keyboardType="decimal-pad"
                placeholder="0"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.fieldLabel}>Date</Text>
              <DateField
                value={form.deposit_date}
                onPress={() => setDateField("deposit_date")}
              />
            </View>
          </View>
          <ToggleRow
            label="Deposit received"
            value={form.deposit_received}
            onValueChange={(v) => set("deposit_received", v)}
          />

          <Text style={[styles.fieldLabel, { marginTop: 16 }]}>
            Final payment
          </Text>
          <View style={styles.row2}>
            <View style={{ flex: 1 }}>
              <Field
                label="Amount (€)"
                value={form.final_payment_amount}
                onChangeText={(v) => set("final_payment_amount", v)}
                keyboardType="decimal-pad"
                placeholder="0"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.fieldLabel}>Date</Text>
              <DateField
                value={form.final_payment_date}
                onPress={() => setDateField("final_payment_date")}
              />
            </View>
          </View>
          <ToggleRow
            label="Final payment received"
            value={form.final_payment_received}
            onValueChange={(v) => set("final_payment_received", v)}
          />

          <ToggleRow
            label="Apply VAT (added on top)"
            value={form.vat_applicable}
            onValueChange={(v) => set("vat_applicable", v)}
          />
          {form.vat_applicable && (
            <Field
              label="VAT %"
              value={form.vat_percent}
              onChangeText={(v) => set("vat_percent", v)}
              keyboardType="decimal-pad"
              placeholder="0"
            />
          )}

          <View style={styles.revenueBox}>
            <RevLine label="Base net rate" value={eur(calc.base_net)} />
            <RevLine
              label={`+ VAT (${form.vat_applicable ? num(form.vat_percent).toFixed(0) : 0}%)`}
              value={eur(calc.vat_amount)}
            />
            <View style={styles.revDivider} />
            <RevLine
              label="Total to client"
              value={eur(calc.total_to_client)}
              bold
              gold
            />
            {form.apa_enabled && (
              <>
                <RevLine
                  label={`+ APA (${num(form.apa_percent).toFixed(0)}%)`}
                  value={eur(calc.apa_amount)}
                />
                <View style={styles.revDivider} />
                <RevLine
                  label="Total invoice (incl. APA)"
                  value={eur(calc.total_invoice_to_client)}
                  bold
                  gold
                />
              </>
            )}
          </View>
        </Section>

        {/* SECTION 6: APA */}
        <Section
          id="apa"
          title="APA Fund (pass-through)"
          icon="briefcase"
          collapsed={collapsed.has("apa")}
          onToggle={() => toggle("apa")}
        >
          <ToggleRow
            label="Enable APA"
            value={form.apa_enabled}
            onValueChange={(v) => set("apa_enabled", v)}
          />
          {form.apa_enabled && (
            <>
              <Field
                label="APA % of base net"
                value={form.apa_percent}
                onChangeText={(v) => set("apa_percent", v)}
                keyboardType="decimal-pad"
                placeholder="30"
              />
              <Text style={[styles.computed, { color: MUTED }]}>
                APA fund collected:{" "}
                <Text style={{ color: GOLD }}>{eur(calc.apa_amount)}</Text>
              </Text>

              <Text style={[styles.fieldLabel, { marginTop: 14 }]}>
                APA spending (itemized)
              </Text>
              <EuroField
                label="Fuel"
                value={form.apa_fuel}
                onChangeText={(v) => set("apa_fuel", v)}
              />
              <EuroField
                label="Provisioning"
                value={form.apa_provisioning}
                onChangeText={(v) => set("apa_provisioning", v)}
              />
              <EuroField
                label="Beverages"
                value={form.apa_beverages}
                onChangeText={(v) => set("apa_beverages", v)}
              />
              <EuroField
                label="Marina fees"
                value={form.apa_marina_fees}
                onChangeText={(v) => set("apa_marina_fees", v)}
              />
              <EuroField
                label="Communications"
                value={form.apa_communications}
                onChangeText={(v) => set("apa_communications", v)}
              />
              <EuroField
                label="Crew gratuities"
                value={form.apa_crew_gratuities}
                onChangeText={(v) => set("apa_crew_gratuities", v)}
              />
              <EuroField
                label="Water activities"
                value={form.apa_activities}
                onChangeText={(v) => set("apa_activities", v)}
              />
              <Field
                label="Activities note"
                value={form.apa_activities_note}
                onChangeText={(v) => set("apa_activities_note", v)}
                placeholder="e.g. jet-ski rental, tours"
              />
              <EuroField
                label="Other"
                value={form.apa_other}
                onChangeText={(v) => set("apa_other", v)}
              />
              <Field
                label="Other note"
                value={form.apa_other_note}
                onChangeText={(v) => set("apa_other_note", v)}
                placeholder="What was it for?"
              />

              <View style={styles.revenueBox}>
                <RevLine label="APA collected" value={eur(calc.apa_amount)} />
                {num(form.apa_fuel) > 0 && (
                  <RevLine label="— Fuel" value={eur(num(form.apa_fuel))} />
                )}
                {num(form.apa_provisioning) > 0 && (
                  <RevLine
                    label="— Provisioning"
                    value={eur(num(form.apa_provisioning))}
                  />
                )}
                {num(form.apa_beverages) > 0 && (
                  <RevLine
                    label="— Beverages"
                    value={eur(num(form.apa_beverages))}
                  />
                )}
                {num(form.apa_marina_fees) > 0 && (
                  <RevLine
                    label="— Marina fees"
                    value={eur(num(form.apa_marina_fees))}
                  />
                )}
                {num(form.apa_communications) > 0 && (
                  <RevLine
                    label="— Communications"
                    value={eur(num(form.apa_communications))}
                  />
                )}
                {num(form.apa_crew_gratuities) > 0 && (
                  <RevLine
                    label="— Crew gratuities"
                    value={eur(num(form.apa_crew_gratuities))}
                  />
                )}
                {num(form.apa_activities) > 0 && (
                  <RevLine
                    label="— Water activities"
                    value={eur(num(form.apa_activities))}
                  />
                )}
                {num(form.apa_other) > 0 && (
                  <RevLine label="— Other" value={eur(num(form.apa_other))} />
                )}
                <View style={styles.revDivider} />
                <RevLine label="APA spent" value={eur(calc.apa_spent)} />
                <RevLine
                  label={
                    calc.apa_balance >= 0
                      ? "Balance (refund to client)"
                      : "Balance (client owes)"
                  }
                  value={eur(Math.abs(calc.apa_balance))}
                  bold
                  gold
                />
                <Text style={[styles.computed, { color: MUTED, marginTop: 8 }]}>
                  APA is pass-through — not counted as revenue or expense in
                  P&L.
                </Text>
              </View>
            </>
          )}
        </Section>

        {/* SECTION 7: OWNER EXPENSES */}
        <Section
          id="expenses"
          title="Owner expenses"
          icon="trending-down"
          collapsed={collapsed.has("expenses")}
          onToggle={() => toggle("expenses")}
        >
          <Field
            label="Port fees (€)"
            value={form.port_fees}
            onChangeText={(v) => set("port_fees", v)}
            keyboardType="decimal-pad"
            placeholder="0"
          />
          <Field
            label="Provisioning (€)"
            value={form.provisioning}
            onChangeText={(v) => set("provisioning", v)}
            keyboardType="decimal-pad"
            placeholder="0"
          />
          <Field
            label="Cleaning (€)"
            value={form.cleaning}
            onChangeText={(v) => set("cleaning", v)}
            keyboardType="decimal-pad"
            placeholder="0"
          />
          <Field
            label="Other expenses (€)"
            value={form.other_expenses}
            onChangeText={(v) => set("other_expenses", v)}
            keyboardType="decimal-pad"
            placeholder="0"
          />
          <Field
            label="Other expenses description"
            value={form.other_expenses_note}
            onChangeText={(v) => set("other_expenses_note", v)}
            placeholder="What was it for?"
          />
        </Section>

        {/* SECTION 8: EXTRAS / DAMAGE / REFUND */}
        <Section
          id="extras"
          title="Extras, damage & refund"
          icon="plus-circle"
          collapsed={collapsed.has("extras")}
          onToggle={() => toggle("extras")}
        >
          <Field
            label="Extra services charged to client (€)"
            value={form.extra_service_amount}
            onChangeText={(v) => set("extra_service_amount", v)}
            keyboardType="decimal-pad"
            placeholder="0"
          />
          <Field
            label="Extra services note"
            value={form.extra_service_note}
            onChangeText={(v) => set("extra_service_note", v)}
            placeholder="e.g. private chef night, spa"
          />

          <Field
            label="Damage / loss (€)"
            value={form.damage_amount}
            onChangeText={(v) => set("damage_amount", v)}
            keyboardType="decimal-pad"
            placeholder="0"
          />
          <Field
            label="Damage note"
            value={form.damage_note}
            onChangeText={(v) => set("damage_note", v)}
            placeholder="What happened?"
          />
          <Text style={styles.fieldLabel}>Damage paid by</Text>
          <View style={styles.pillRow}>
            {DAMAGE_PAID_OPTIONS.map((opt) => {
              const active = form.damage_paid_by === opt.value;
              return (
                <Pressable
                  key={opt.value}
                  onPress={() => set("damage_paid_by", opt.value)}
                  style={[styles.modePill, active && styles.modePillActive]}
                  accessibilityRole="button"
                  accessibilityLabel={`Damage paid by ${opt.label}`}
                >
                  <Text
                    style={[
                      styles.modePillText,
                      active && { color: GOLD },
                    ]}
                  >
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Field
            label="Refund issued (€)"
            value={form.refund_amount}
            onChangeText={(v) => set("refund_amount", v)}
            keyboardType="decimal-pad"
            placeholder="0"
          />
          <Field
            label="Refund reason"
            value={form.refund_reason}
            onChangeText={(v) => set("refund_reason", v)}
            placeholder="Why a refund?"
          />
        </Section>

        {/* SECTION 9: COMMISSIONS & DISTRIBUTION */}
        <Section
          id="distribution"
          title="Commissions & distribution"
          icon="pie-chart"
          collapsed={collapsed.has("distribution")}
          onToggle={() => toggle("distribution")}
        >
          <Text style={[styles.computed, { color: MUTED, marginTop: 0 }]}>
            Commissions and distribution are computed on the base net rate (€
            {calc.base_net.toFixed(2)}). Boat owner receives the remainder.
          </Text>

          {/* Central Agent */}
          <Text style={[styles.fieldLabel, { marginTop: 14 }]}>
            Central Agent
          </Text>
          <Field
            label="Name"
            value={form.central_agent_name}
            onChangeText={(v) => set("central_agent_name", v)}
            placeholder="Central Agent"
          />
          <Text style={styles.fieldLabel}>Type</Text>
          <View style={styles.pillRow}>
            {(
              [
                { v: "percent_net" as CentralAgentType, l: "% of net" },
                { v: "fixed" as CentralAgentType, l: "Fixed €" },
              ]
            ).map((opt) => {
              const active = form.central_agent_type === opt.v;
              return (
                <Pressable
                  key={opt.v}
                  onPress={() => set("central_agent_type", opt.v)}
                  style={[styles.modePill, active && styles.modePillActive]}
                  accessibilityRole="button"
                  accessibilityLabel={`Central agent ${opt.l}`}
                >
                  <Text
                    style={[
                      styles.modePillText,
                      active && { color: GOLD },
                    ]}
                  >
                    {opt.l}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Field
            label={
              form.central_agent_type === "fixed"
                ? "Amount (€)"
                : "Percent of net (%)"
            }
            value={form.central_agent_value}
            onChangeText={(v) => set("central_agent_value", v)}
            keyboardType="decimal-pad"
            placeholder={form.central_agent_type === "fixed" ? "0" : "10"}
          />
          <Text style={[styles.computed, { color: MUTED }]}>
            Central Agent receives:{" "}
            <Text style={{ color: GOLD }}>
              {eur(calc.central_agent_amount)}
            </Text>
          </Text>

          {/* Sub-agents */}
          <Text style={[styles.fieldLabel, { marginTop: 18 }]}>
            Sub-agents ({form.sub_agents.length}/{MAX_SUB_AGENTS})
          </Text>
          {form.sub_agents.map((s, idx) => {
            const res = calc.sub_agent_results[idx];
            return (
              <View
                key={idx}
                style={[
                  styles.revenueBox,
                  { marginTop: 8, marginBottom: 0 },
                ]}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    marginBottom: 6,
                  }}
                >
                  <TextInput
                    value={s.name}
                    onChangeText={(v) => updateSubAgent(idx, { name: v })}
                    placeholder="Sub-agent name"
                    placeholderTextColor={MUTED}
                    style={[styles.input, { flex: 1, marginRight: 8 }]}
                  />
                  <Pressable
                    onPress={() => removeSubAgent(idx)}
                    style={styles.distRemoveBtn}
                    accessibilityRole="button"
                    accessibilityLabel={`Remove ${s.name}`}
                  >
                    <Feather name="x" size={16} color={RED} />
                  </Pressable>
                </View>
                <View style={styles.pillRow}>
                  {(
                    [
                      { v: "percent_net" as SubAgentType, l: "% net" },
                      { v: "percent_central" as SubAgentType, l: "% central" },
                      { v: "fixed" as SubAgentType, l: "Fixed €" },
                    ]
                  ).map((opt) => {
                    const active = s.type === opt.v;
                    return (
                      <Pressable
                        key={opt.v}
                        onPress={() => updateSubAgent(idx, { type: opt.v })}
                        style={[
                          styles.modePill,
                          active && styles.modePillActive,
                        ]}
                        accessibilityRole="button"
                        accessibilityLabel={`Sub-agent type ${opt.l}`}
                      >
                        <Text
                          style={[
                            styles.modePillText,
                            active && { color: GOLD },
                          ]}
                        >
                          {opt.l}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
                <View style={{ marginTop: 6 }}>
                  <Field
                    label={s.type === "fixed" ? "Amount (€)" : "Value (%)"}
                    value={s.value}
                    onChangeText={(v) => updateSubAgent(idx, { value: v })}
                    keyboardType="decimal-pad"
                    placeholder="0"
                  />
                </View>
                {res && (
                  <Text style={[styles.computed, { color: MUTED }]}>
                    Receives:{" "}
                    <Text style={{ color: GOLD }}>{eur(res.amount)}</Text>
                  </Text>
                )}
              </View>
            );
          })}
          {form.sub_agents.length < MAX_SUB_AGENTS && (
            <Pressable
              onPress={addSubAgent}
              style={[styles.addDistBtn, { marginTop: 10 }]}
              accessibilityRole="button"
              accessibilityLabel="Add sub-agent"
            >
              <Feather name="plus" size={14} color={GOLD} />
              <Text style={styles.addDistBtnText}>Add sub-agent</Text>
            </Pressable>
          )}

          {/* Custom participants (optional) */}
          <Text style={[styles.fieldLabel, { marginTop: 18 }]}>
            Custom participants (optional)
          </Text>
          <Text style={[styles.computed, { color: MUTED, marginTop: 0 }]}>
            Add partners, referrers, or any other party that receives a share
            of base net. Boat owner gets whatever is left.
          </Text>
          {form.distribution.map((d, idx) => {
            const res = calc.distribution_results[idx];
            return (
              <View key={idx} style={styles.distRow}>
                <TextInput
                  value={d.name}
                  onChangeText={(v) => updateDist(idx, { name: v })}
                  placeholder="Party name"
                  placeholderTextColor={MUTED}
                  style={[styles.input, { flex: 1.4 }]}
                />
                <Pressable
                  onPress={() =>
                    updateDist(idx, {
                      type: d.type === "percent" ? "fixed" : "percent",
                    })
                  }
                  style={styles.distTypeBtn}
                  accessibilityRole="button"
                  accessibilityLabel={`Toggle type for ${d.name}`}
                >
                  <Text style={styles.distTypeBtnText}>
                    {d.type === "percent" ? "%" : "€"}
                  </Text>
                </Pressable>
                <TextInput
                  value={String(d.value)}
                  onChangeText={(v) =>
                    updateDist(idx, {
                      value: Number(v.replace(",", ".")) || 0,
                    })
                  }
                  keyboardType="decimal-pad"
                  placeholder="0"
                  placeholderTextColor={MUTED}
                  style={[styles.input, { width: 70 }]}
                />
                <Pressable
                  onPress={() => removeDist(idx)}
                  style={styles.distRemoveBtn}
                  accessibilityRole="button"
                  accessibilityLabel={`Remove ${d.name}`}
                >
                  <Feather name="x" size={16} color={RED} />
                </Pressable>
                {res && (
                  <Text style={styles.distAmount}>{eur(res.amount)}</Text>
                )}
              </View>
            );
          })}
          <Pressable
            onPress={addDist}
            style={styles.addDistBtn}
            accessibilityRole="button"
            accessibilityLabel="Add custom participant"
          >
            <Feather name="plus" size={14} color={GOLD} />
            <Text style={styles.addDistBtnText}>Add participant</Text>
          </Pressable>

          <View style={styles.revenueBox}>
            <RevLine label="Base net" value={eur(calc.base_net)} />
            <RevLine
              label={`− ${form.central_agent_name || "Central Agent"}`}
              value={eur(calc.central_agent_amount)}
            />
            {calc.sub_agent_results.map((r, i) => (
              <RevLine
                key={i}
                label={`− ${r.name}`}
                value={eur(r.amount)}
              />
            ))}
            {calc.distribution_results.map((r, i) => (
              <RevLine
                key={`d${i}`}
                label={`− ${r.name}`}
                value={eur(r.amount)}
              />
            ))}
            <View style={styles.revDivider} />
            <RevLine
              label={
                calc.distribution_balanced
                  ? "Boat Owner receives"
                  : "Over-distributed (owner short)"
              }
              value={eur(Math.abs(calc.boat_owner_receives))}
              bold
              gold
            />
          </View>
        </Section>

        {/* SECTION 10: P&L SUMMARY */}
        <Section
          id="pl"
          title="P&L Summary & Payout"
          icon="bar-chart-2"
          collapsed={collapsed.has("pl")}
          onToggle={() => toggle("pl")}
        >
          <View style={styles.plCard}>
            <Text style={styles.plTitle}>P&L THIS CHARTER</Text>
            <PLRow label="Base net revenue" value={eur(calc.base_net)} />
            {calc.gross_revenue !== calc.base_net && (
              <PLRow
                label="+ Transfer / extras to client"
                value={eur(calc.gross_revenue - calc.base_net)}
              />
            )}
            <PLRow
              label={`− ${form.central_agent_name || "Central Agent"} commission`}
              value={eur(calc.central_agent_amount)}
              negative
            />
            {calc.sub_agent_results.map((r, i) => (
              <PLRow
                key={i}
                label={`− ${r.name} commission`}
                value={eur(r.amount)}
                negative
              />
            ))}
            <PLRow
              label="− Crew costs"
              value={eur(calc.total_crew)}
              negative
            />
            <PLRow label="− Fuel" value={eur(calc.fuel_cost)} negative />
            {calc.damage_absorbed > 0 && (
              <PLRow
                label="− Damage absorbed"
                value={eur(calc.damage_absorbed)}
                negative
              />
            )}
            <View style={styles.plDivider} />
            <View style={styles.plProfitRow}>
              <Text style={styles.plProfitLabel}>NET PROFIT</Text>
              <Text
                style={[
                  styles.plProfitValue,
                  { color: calc.net_profit >= 0 ? GREEN : RED },
                ]}
              >
                {eur(calc.net_profit)}
              </Text>
            </View>
            <View style={styles.plMarginRow}>
              <Text style={styles.plMarginLabel}>MARGIN</Text>
              <Text
                style={[
                  styles.plMarginValue,
                  { color: calc.margin >= 0 ? GREEN : RED },
                ]}
              >
                {calc.margin.toFixed(1)}%
              </Text>
            </View>
          </View>

          <View style={[styles.plCard, { marginTop: 12 }]}>
            <Text style={styles.plTitle}>PAYOUT SUMMARY</Text>
            <PLRow
              label="Total invoiced to client"
              value={eur(calc.total_invoice_to_client)}
            />
            <PLRow label="− VAT (passed to tax)" value={eur(calc.vat_amount)} negative />
            <PLRow
              label="− APA fund (pass-through)"
              value={eur(calc.apa_amount)}
              negative
            />
            <View style={styles.plDivider} />
            <PLRow
              label={`− ${form.central_agent_name || "Central Agent"}`}
              value={eur(calc.central_agent_amount)}
              negative
            />
            {calc.sub_agent_results.map((r, i) => (
              <PLRow
                key={`sa${i}`}
                label={`− ${r.name}`}
                value={eur(r.amount)}
                negative
              />
            ))}
            {calc.distribution_results.map((p, i) => (
              <PLRow
                key={`cd${i}`}
                label={`− ${p.name}`}
                value={eur(p.amount)}
                negative
              />
            ))}
            <View style={styles.plDivider} />
            <View style={styles.plProfitRow}>
              <Text style={styles.plProfitLabel}>BOAT OWNER RECEIVES</Text>
              <Text
                style={[
                  styles.plProfitValue,
                  { color: calc.boat_owner_receives >= 0 ? GOLD : RED },
                ]}
              >
                {eur(calc.boat_owner_receives)}
              </Text>
            </View>
          </View>
        </Section>

        {/* SECTION 11: NOTES */}
        <Section
          id="notes"
          title="Notes"
          icon="file-text"
          collapsed={collapsed.has("notes")}
          onToggle={() => toggle("notes")}
        >
          <TextInput
            value={form.notes}
            onChangeText={(v) => set("notes", v)}
            placeholder="Free text — anything to remember about this charter"
            placeholderTextColor={MUTED}
            multiline
            style={[styles.input, { minHeight: 100, paddingTop: 10 }]}
          />
        </Section>
      </ScrollView>

      {/* Sticky bottom bar */}
      <View
        style={[
          styles.bottomBar,
          { paddingBottom: Math.max(insets.bottom, 10) + 8 },
        ]}
      >
        {editId && (
          <Pressable
            onPress={handleDelete}
            disabled={deleteM.isPending}
            style={[styles.deleteBtn, deleteM.isPending && { opacity: 0.5 }]}
            accessibilityRole="button"
            accessibilityLabel="Delete charter"
          >
            {deleteM.isPending ? (
              <ActivityIndicator color={RED} size="small" />
            ) : (
              <Feather name="trash-2" size={18} color={RED} />
            )}
          </Pressable>
        )}
        {editId && charterQ.data && (
          <Pressable
            onPress={async () => {
              if (!charterQ.data) return;
              try {
                setExporting(true);
                const y =
                  yachts.find((x) => x.id === charterQ.data!.yacht_id) ?? null;
                await exportCharterDocument(charterQ.data, y);
              } catch (err) {
                Alert.alert(
                  "Export failed",
                  err instanceof Error ? err.message : "Could not create PDF.",
                );
              } finally {
                setExporting(false);
              }
            }}
            disabled={exporting}
            style={[
              styles.deleteBtn,
              { marginLeft: 8, borderColor: GOLD },
              exporting && { opacity: 0.5 },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Export charter as PDF"
          >
            {exporting ? (
              <ActivityIndicator color={GOLD} size="small" />
            ) : (
              <Feather name="download" size={18} color={GOLD} />
            )}
          </Pressable>
        )}
        <View style={{ flex: 1 }} />
        <Pressable
          onPress={handleSave}
          disabled={saving}
          style={[styles.saveBtn, saving && { opacity: 0.6 }]}
          accessibilityRole="button"
          accessibilityLabel="Save charter"
        >
          {saving ? (
            <ActivityIndicator color={NAVY_DEEP} />
          ) : (
            <>
              <Feather name="check" size={16} color={NAVY_DEEP} />
              <Text style={styles.saveBtnText}>
                {editId ? "Save changes" : "Save charter"}
              </Text>
            </>
          )}
        </Pressable>
      </View>

      {/* Date picker */}
      {dateField !== null &&
        (Platform.OS === "ios" ? (
          <Modal
            visible
            transparent
            animationType="fade"
            onRequestClose={() => setDateField(null)}
          >
            <Pressable
              style={styles.modalBackdrop}
              onPress={() => setDateField(null)}
            />
            <View style={styles.iosDateSheet}>
              <DateTimePicker
                value={datePickerInitial()}
                mode="date"
                display="inline"
                themeVariant="dark"
                onChange={onPickDate}
              />
              <Pressable
                onPress={() => setDateField(null)}
                style={[styles.primaryBtn, { alignSelf: "center" }]}
              >
                <Text style={styles.primaryBtnText}>Done</Text>
              </Pressable>
            </View>
          </Modal>
        ) : (
          <DateTimePicker
            value={datePickerInitial()}
            mode="date"
            onChange={onPickDate}
          />
        ))}

      {/* Yacht picker modal */}
      <Modal
        visible={yachtPickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setYachtPickerOpen(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setYachtPickerOpen(false)}
        />
        <View style={styles.modalRoot} pointerEvents="box-none">
          <View
            style={[
              styles.sheet,
              { maxHeight: "75%", paddingBottom: Math.max(insets.bottom, 14) },
            ]}
          >
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Select yacht</Text>
            {yachts.length === 0 ? (
              <Text style={styles.emptyText}>No yachts. Add one first.</Text>
            ) : (
              <ScrollView style={{ maxHeight: 400 }}>
                {yachts.map((y) => {
                  const active = y.id === form.yacht_id;
                  return (
                    <Pressable
                      key={y.id}
                      onPress={() => {
                        set("yacht_id", y.id);
                        setYachtPickerOpen(false);
                      }}
                      style={[
                        styles.yachtRow,
                        active && { borderColor: GOLD },
                      ]}
                    >
                      <Feather name="anchor" size={20} color={GOLD} />
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={styles.yachtName}>{y.name}</Text>
                        <Text style={styles.yachtMeta}>
                          {[
                            y.brand,
                            y.length_meters && `${y.length_meters}m`,
                            y.year_built,
                          ]
                            .filter(Boolean)
                            .join(" · ") || "—"}
                        </Text>
                      </View>
                      {active && <Feather name="check" size={18} color={GOLD} />}
                    </Pressable>
                  );
                })}
              </ScrollView>
            )}
            <Pressable
              onPress={() => setYachtPickerOpen(false)}
              style={[styles.cancelBtn, { marginTop: 12, marginBottom: 16 }]}
            >
              <Text style={styles.cancelBtnText}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

// ---- Sub components ----

/** Auto-formatting HH:MM 24-hour time input. */
function formatTime(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 4);
  if (digits.length === 0) return "";
  let hh = digits.slice(0, 2);
  let mm = digits.slice(2, 4);
  // Clamp on the fly
  if (hh.length === 2) {
    const n = parseInt(hh, 10);
    if (n > 23) hh = "23";
  }
  if (mm.length === 2) {
    const n = parseInt(mm, 10);
    if (n > 59) mm = "59";
  }
  if (digits.length <= 2) return hh;
  return `${hh}:${mm}`;
}

/** Normalize a partial HH:MM to a valid one (zero-pad / fill MM with "00"). */
function normalizeTime(s: string): string {
  if (!s) return "";
  const digits = s.replace(/\D/g, "").slice(0, 4);
  if (digits.length === 0) return "";
  // 1–2 digits → hour-only ("9" → "09", "12" → "12"); 3–4 digits → HH+MM.
  let hhStr: string;
  let mmStr: string;
  if (digits.length <= 2) {
    hhStr = digits.padStart(2, "0");
    mmStr = "00";
  } else {
    hhStr = digits.slice(0, 2);
    mmStr = digits.slice(2).padEnd(2, "0");
  }
  let hh = parseInt(hhStr, 10);
  let mm = parseInt(mmStr, 10);
  if (!Number.isFinite(hh)) hh = 0;
  if (!Number.isFinite(mm)) mm = 0;
  if (hh > 23) hh = 23;
  if (mm > 59) mm = 59;
  return `${hh.toString().padStart(2, "0")}:${mm.toString().padStart(2, "0")}`;
}

function TimeInput({
  label,
  value,
  onChangeText,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
}): React.JSX.Element {
  return (
    <View style={{ marginBottom: 10 }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={(v) => onChangeText(formatTime(v))}
        placeholder="HH:MM"
        placeholderTextColor={MUTED}
        keyboardType="number-pad"
        maxLength={5}
        style={styles.input}
        accessibilityLabel={label}
      />
    </View>
  );
}

/** Numeric field with € suffix rendered inside the input on the right. */
function EuroField({
  label,
  value,
  onChangeText,
  placeholder = "0",
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
}): React.JSX.Element {
  return (
    <View style={{ marginBottom: 10 }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View
        style={[
          styles.input,
          {
            flexDirection: "row",
            alignItems: "center",
            paddingVertical: 0,
            paddingRight: 12,
          },
        ]}
      >
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={MUTED}
          keyboardType="decimal-pad"
          style={{
            flex: 1,
            color: IVORY,
            fontSize: 15,
            paddingVertical: 12,
          }}
          accessibilityLabel={label}
        />
        <Text style={{ color: GOLD, fontWeight: "600", marginLeft: 6 }}>€</Text>
      </View>
    </View>
  );
}

function Section({
  id,
  title,
  icon,
  collapsed,
  onToggle,
  children,
}: {
  id: SectionId;
  title: string;
  icon: keyof typeof Feather.glyphMap;
  collapsed: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Pressable
        onPress={onToggle}
        style={styles.sectionHeader}
        accessibilityRole="button"
        accessibilityLabel={`Toggle ${title} section`}
      >
        <View style={styles.sectionIcon}>
          <Feather name={icon} size={16} color={GOLD} />
        </View>
        <Text style={styles.sectionTitle}>{title}</Text>
        <Feather
          name={collapsed ? "chevron-down" : "chevron-up"}
          size={18}
          color={MUTED}
        />
      </Pressable>
      {!collapsed && (
        <View style={styles.sectionBody} testID={`section-${id}-body`}>
          {children}
        </View>
      )}
    </View>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  autoCapitalize,
  multiline,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  keyboardType?:
    | "default"
    | "decimal-pad"
    | "number-pad"
    | "email-address"
    | "phone-pad";
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  multiline?: boolean;
}) {
  return (
    <View style={{ marginBottom: 10 }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={MUTED}
        keyboardType={keyboardType ?? "default"}
        autoCapitalize={autoCapitalize ?? "sentences"}
        multiline={multiline}
        style={[styles.input, multiline && { minHeight: 70, paddingTop: 10 }]}
      />
    </View>
  );
}

function DateField({
  value,
  onPress,
}: {
  value: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.input, styles.dateFieldBtn]}
      accessibilityRole="button"
      accessibilityLabel="Pick date"
    >
      <Text style={{ color: value ? IVORY : MUTED }}>
        {value || "YYYY-MM-DD"}
      </Text>
      <Feather name="calendar" size={16} color={GOLD} />
    </Pressable>
  );
}

function Stepper({
  value,
  onChange,
  min,
  max,
  label,
}: {
  value: number;
  onChange: (n: number) => void;
  min: number;
  max: number;
  label: string;
}) {
  return (
    <View style={styles.stepperRow}>
      <Pressable
        onPress={() => onChange(Math.max(min, value - 1))}
        style={styles.stepBtn}
        accessibilityRole="button"
        accessibilityLabel={`Decrease ${label} count`}
      >
        <Feather name="minus" size={16} color={IVORY} />
      </Pressable>
      <Text style={styles.stepValue}>{value}</Text>
      <Pressable
        onPress={() => onChange(Math.min(max, value + 1))}
        style={styles.stepBtn}
        accessibilityRole="button"
        accessibilityLabel={`Increase ${label} count`}
      >
        <Feather name="plus" size={16} color={IVORY} />
      </Pressable>
    </View>
  );
}

function ToggleRow({
  label,
  value,
  onValueChange,
}: {
  label: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
}) {
  return (
    <View style={styles.toggleRow}>
      <Text style={styles.toggleLabel}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: NAVY_DEEP, true: GOLD + "66" }}
        thumbColor={value ? GOLD : "#888"}
      />
    </View>
  );
}

function RevLine({
  label,
  value,
  bold,
  gold,
}: {
  label: string;
  value: string;
  bold?: boolean;
  gold?: boolean;
}) {
  return (
    <View style={styles.revLineRow}>
      <Text
        style={[
          styles.revLineLabel,
          bold && { color: IVORY },
          gold && { color: GOLD },
        ]}
      >
        {label.toUpperCase()}
      </Text>
      <Text
        style={[
          styles.revLineValue,
          bold && { fontFamily: "Gilroy-Bold", fontSize: 18 },
          gold && { color: GOLD },
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

function PLRow({
  label,
  value,
  negative,
}: {
  label: string;
  value: string;
  negative?: boolean;
}) {
  return (
    <View style={styles.plRow}>
      <Text style={styles.plLabel}>{label}</Text>
      <Text style={[styles.plValue, negative && { color: MUTED }]}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: NAVY },
  centerFull: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    gap: 10,
  },
  backFab: {
    position: "absolute",
    left: 16,
    zIndex: 60,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: NAVY_ELEV,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(247,243,236,0.12)",
  },
  kicker: {
    color: GOLD,
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    letterSpacing: 2,
  },
  title: {
    color: IVORY,
    fontFamily: "Gilroy-Bold",
    fontSize: 26,
    marginTop: 4,
    marginBottom: 14,
  },
  section: {
    backgroundColor: NAVY_ELEV,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: DIVIDER,
    marginBottom: 12,
    overflow: "hidden",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 10,
  },
  sectionIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: NAVY_DEEP,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: {
    flex: 1,
    color: IVORY,
    fontFamily: "Gilroy-Bold",
    fontSize: 16,
  },
  sectionBody: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    paddingTop: 2,
    borderTopWidth: 1,
    borderTopColor: DIVIDER,
  },
  fieldLabel: {
    color: MUTED,
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    letterSpacing: 1.2,
    marginBottom: 6,
    marginTop: 8,
    textTransform: "uppercase",
  },
  subLabel: {
    color: MUTED,
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    marginBottom: 4,
  },
  input: {
    backgroundColor: NAVY_DEEP,
    borderWidth: 1,
    borderColor: DIVIDER,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    color: IVORY,
    fontFamily: "Inter_400Regular",
    fontSize: 14,
  },
  row2: { flexDirection: "row", gap: 10 },
  computed: {
    color: IVORY,
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    marginTop: -4,
    marginBottom: 8,
  },
  conflictBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    borderWidth: 1,
    borderColor: RED + "66",
    backgroundColor: RED + "14",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 9,
    marginBottom: 10,
  },
  conflictText: {
    flex: 1,
    color: IVORY,
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    lineHeight: 17,
  },
  pillRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 4 },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 18,
    backgroundColor: NAVY_DEEP,
    borderWidth: 1,
    borderColor: "transparent",
  },
  statusPillText: {
    color: MUTED,
    fontFamily: "Inter_500Medium",
    fontSize: 12,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  modePill: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: NAVY_DEEP,
    borderWidth: 1,
    borderColor: DIVIDER,
  },
  modePillActive: {
    borderColor: GOLD,
    backgroundColor: GOLD + "12",
  },
  modePillText: {
    color: MUTED,
    fontFamily: "Inter_500Medium",
    fontSize: 13,
  },
  yachtPicker: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dateFieldBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  stepperRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 6,
  },
  stepBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: NAVY_DEEP,
    borderWidth: 1,
    borderColor: DIVIDER,
    alignItems: "center",
    justifyContent: "center",
  },
  stepValue: {
    color: IVORY,
    fontFamily: "Gilroy-Bold",
    fontSize: 18,
    minWidth: 30,
    textAlign: "center",
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
    marginTop: 6,
  },
  toggleLabel: {
    color: IVORY,
    fontFamily: "Inter_500Medium",
    fontSize: 14,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: DIVIDER,
  },
  totalLabel: {
    color: MUTED,
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    letterSpacing: 1.2,
  },
  totalValue: {
    color: IVORY,
    fontFamily: "Gilroy-Bold",
    fontSize: 18,
  },
  revenueBox: {
    marginTop: 16,
    padding: 14,
    backgroundColor: NAVY_DEEP,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: DIVIDER,
  },
  revLineRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
  },
  revLineLabel: {
    color: MUTED,
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    letterSpacing: 1.2,
  },
  revLineValue: {
    color: IVORY,
    fontFamily: "Inter_500Medium",
    fontSize: 14,
  },
  revDivider: { height: 1, backgroundColor: DIVIDER, marginVertical: 8 },
  plCard: {
    padding: 16,
    backgroundColor: NAVY_DEEP,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: GOLD + "44",
  },
  plTitle: {
    color: GOLD,
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    letterSpacing: 2,
    marginBottom: 12,
  },
  plRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 5,
  },
  plLabel: { color: IVORY, fontFamily: "Inter_400Regular", fontSize: 14 },
  plValue: { color: IVORY, fontFamily: "Inter_500Medium", fontSize: 14 },
  plDivider: { height: 1, backgroundColor: DIVIDER, marginVertical: 10 },
  plProfitRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },
  plProfitLabel: {
    color: IVORY,
    fontFamily: "Gilroy-Bold",
    fontSize: 14,
    letterSpacing: 1.5,
  },
  plProfitValue: { fontFamily: "Gilroy-Bold", fontSize: 20 },
  plMarginRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6,
  },
  plMarginLabel: {
    color: MUTED,
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    letterSpacing: 1.2,
  },
  plMarginValue: { fontFamily: "Inter_500Medium", fontSize: 14 },
  distRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
    flexWrap: "wrap",
  },
  distTypeBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: NAVY_DEEP,
    borderWidth: 1,
    borderColor: GOLD + "55",
    alignItems: "center",
    justifyContent: "center",
  },
  distTypeBtnText: {
    color: GOLD,
    fontFamily: "Gilroy-Bold",
    fontSize: 16,
  },
  distRemoveBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(231,76,60,0.12)",
    borderWidth: 1,
    borderColor: RED + "55",
    alignItems: "center",
    justifyContent: "center",
  },
  distAmount: {
    color: GOLD,
    fontFamily: "Gilroy-Bold",
    fontSize: 13,
    marginLeft: "auto",
    minWidth: 80,
    textAlign: "right",
  },
  addDistBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: GOLD,
    alignSelf: "flex-start",
    marginTop: 6,
  },
  addDistBtnText: {
    color: GOLD,
    fontFamily: "Inter_500Medium",
    fontSize: 13,
  },
  bottomBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingTop: 10,
    backgroundColor: NAVY_DEEP,
    borderTopWidth: 1,
    borderTopColor: DIVIDER,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  deleteBtn: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: "rgba(231,76,60,0.12)",
    borderWidth: 1,
    borderColor: RED + "55",
    alignItems: "center",
    justifyContent: "center",
  },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: GOLD,
    paddingHorizontal: 22,
    paddingVertical: 13,
    borderRadius: 12,
    minWidth: 170,
  },
  saveBtnText: {
    color: NAVY_DEEP,
    fontFamily: "Gilroy-Bold",
    fontSize: 15,
  },
  primaryBtn: {
    backgroundColor: GOLD,
    paddingHorizontal: 22,
    paddingVertical: 13,
    borderRadius: 12,
    marginTop: 12,
  },
  primaryBtnText: {
    color: NAVY_DEEP,
    fontFamily: "Gilroy-Bold",
    fontSize: 15,
  },
  emptyTitle: {
    color: IVORY,
    fontFamily: "Gilroy-Bold",
    fontSize: 18,
    marginTop: 8,
  },
  emptyText: {
    color: MUTED,
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
  modalRoot: { flex: 1, justifyContent: "flex-end" },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  sheet: {
    backgroundColor: NAVY,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 20,
    paddingTop: 10,
    borderTopWidth: 1,
    borderColor: DIVIDER,
  },
  iosDateSheet: {
    backgroundColor: NAVY,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 24,
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 1,
    borderColor: DIVIDER,
  },
  sheetHandle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(247,243,236,0.2)",
    marginBottom: 12,
  },
  sheetTitle: {
    color: IVORY,
    fontFamily: "Gilroy-Bold",
    fontSize: 20,
    marginBottom: 12,
  },
  yachtRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: NAVY_ELEV,
    borderWidth: 1,
    borderColor: DIVIDER,
    marginBottom: 8,
  },
  yachtName: { color: IVORY, fontFamily: "Gilroy-Bold", fontSize: 15 },
  yachtMeta: {
    color: MUTED,
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    marginTop: 2,
  },
  cancelBtn: {
    paddingHorizontal: 22,
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: NAVY_ELEV,
    alignItems: "center",
  },
  cancelBtnText: {
    color: IVORY,
    fontFamily: "Inter_500Medium",
    fontSize: 14,
  },
});
