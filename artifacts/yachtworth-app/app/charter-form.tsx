import { Feather } from "@expo/vector-icons";
import { useAuth } from "@clerk/expo";
import {
  getGetCharterQueryKey,
  getListYachtsQueryKey,
  useCreateCharter,
  useDeleteCharter,
  useGetCharter,
  useListYachts,
  useUpdateCharter,
  type Charter,
  type CharterInput,
  type CharterStatus,
  type CharterRateType,
  type Yacht,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
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
import { useSafeAreaInsets } from "react-native-safe-area-context";

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

type SectionId =
  | "basics"
  | "vessel"
  | "crew"
  | "revenue"
  | "expenses"
  | "pl"
  | "notes";

type FormState = {
  yacht_id: string;
  status: CharterStatus;
  client_name: string;
  client_email: string;
  client_phone: string;
  start_date: string;
  end_date: string;
  departure_port: string;
  return_port: string;
  engine_hours_before: string;
  engine_hours_after: string;
  fuel_liters: string;
  fuel_price_per_liter: string;
  captain_name: string;
  captain_day_rate: string;
  stewardess_count: number;
  stewardess_day_rate: string;
  extra_crew_cost: string;
  extra_crew_note: string;
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
  port_fees: string;
  provisioning: string;
  cleaning: string;
  other_expenses: string;
  other_expenses_note: string;
  notes: string;
};

const emptyForm = (yachtId = ""): FormState => ({
  yacht_id: yachtId,
  status: "confirmed",
  client_name: "",
  client_email: "",
  client_phone: "",
  start_date: "",
  end_date: "",
  departure_port: "",
  return_port: "",
  engine_hours_before: "",
  engine_hours_after: "",
  fuel_liters: "",
  fuel_price_per_liter: "",
  captain_name: "",
  captain_day_rate: "",
  stewardess_count: 0,
  stewardess_day_rate: "",
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
  port_fees: "",
  provisioning: "",
  cleaning: "",
  other_expenses: "",
  other_expenses_note: "",
  notes: "",
});

function fromCharter(c: Charter): FormState {
  return {
    yacht_id: c.yacht_id,
    status: c.status,
    client_name: c.client_name ?? "",
    client_email: c.client_email ?? "",
    client_phone: c.client_phone ?? "",
    start_date: c.start_date,
    end_date: c.end_date,
    departure_port: c.departure_port ?? "",
    return_port: c.return_port ?? "",
    engine_hours_before: c.engine_hours_before?.toString() ?? "",
    engine_hours_after: c.engine_hours_after?.toString() ?? "",
    fuel_liters: c.fuel_liters?.toString() ?? "",
    fuel_price_per_liter: c.fuel_price_per_liter?.toString() ?? "",
    captain_name: c.captain_name ?? "",
    captain_day_rate: c.captain_day_rate?.toString() ?? "",
    stewardess_count: c.stewardess_count ?? 0,
    stewardess_day_rate: c.stewardess_day_rate?.toString() ?? "",
    extra_crew_cost: c.extra_crew_cost?.toString() ?? "",
    extra_crew_note: c.extra_crew_note ?? "",
    charter_rate_type: c.charter_rate_type,
    charter_rate: c.charter_rate?.toString() ?? "",
    deposit_amount: c.deposit_amount?.toString() ?? "",
    deposit_date: c.deposit_date ?? "",
    deposit_received: c.deposit_received,
    final_payment_amount: c.final_payment_amount?.toString() ?? "",
    final_payment_date: c.final_payment_date ?? "",
    final_payment_received: c.final_payment_received,
    vat_applicable: c.vat_applicable,
    vat_percent: c.vat_percent?.toString() ?? "",
    port_fees: c.port_fees?.toString() ?? "",
    provisioning: c.provisioning?.toString() ?? "",
    cleaning: c.cleaning?.toString() ?? "",
    other_expenses: c.other_expenses?.toString() ?? "",
    other_expenses_note: c.other_expenses_note ?? "",
    notes: c.notes ?? "",
  };
}

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
  const d = new Date(v + "T00:00:00Z");
  if (!Number.isFinite(d.getTime())) return null;
  return v;
};

const isValidDateField = (s: string): boolean => {
  const v = s.trim();
  if (!v) return true;
  return dateOrNull(v) !== null;
};

function toInput(f: FormState): CharterInput {
  const clientName = f.client_name.trim().replace(/\s+/g, " ");
  return {
    yacht_id: f.yacht_id,
    status: f.status,
    client_name: clientName || null,
    client_email: f.client_email.trim() || null,
    client_phone: f.client_phone.trim() || null,
    start_date: f.start_date,
    end_date: f.end_date,
    departure_port: f.departure_port.trim() || null,
    return_port: f.return_port.trim() || null,
    engine_hours_before: numOrNull(f.engine_hours_before),
    engine_hours_after: numOrNull(f.engine_hours_after),
    fuel_liters: numOrNull(f.fuel_liters),
    fuel_price_per_liter: numOrNull(f.fuel_price_per_liter),
    captain_name: f.captain_name.trim() || null,
    captain_day_rate: numOrNull(f.captain_day_rate),
    stewardess_count: f.stewardess_count,
    stewardess_day_rate: numOrNull(f.stewardess_day_rate),
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
    port_fees: numOrNull(f.port_fees),
    provisioning: numOrNull(f.provisioning),
    cleaning: numOrNull(f.cleaning),
    other_expenses: numOrNull(f.other_expenses),
    other_expenses_note: f.other_expenses_note.trim() || null,
    notes: f.notes.trim() || null,
  };
}

function daysBetween(a: string, b: string): number {
  const sd = dateOrNull(a);
  const ed = dateOrNull(b);
  if (!sd || !ed) return 0;
  const start = new Date(sd + "T00:00:00Z").getTime();
  const end = new Date(ed + "T00:00:00Z").getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return 0;
  return Math.round((end - start) / 86400000) + 1;
}

function calcPL(f: FormState) {
  const days = daysBetween(f.start_date, f.end_date);
  const before = numOrNull(f.engine_hours_before) ?? 0;
  const after = numOrNull(f.engine_hours_after) ?? 0;
  const engine_hours_used = Math.max(0, after - before);
  const liters = numOrNull(f.fuel_liters) ?? 0;
  const price = numOrNull(f.fuel_price_per_liter) ?? 0;
  const fuel_cost = liters * price;
  const captain_rate = numOrNull(f.captain_day_rate) ?? 0;
  const captain_total = captain_rate * days;
  const stew_rate = numOrNull(f.stewardess_day_rate) ?? 0;
  const stew_total = f.stewardess_count * stew_rate * days;
  const extra_crew = numOrNull(f.extra_crew_cost) ?? 0;
  const total_crew = captain_total + stew_total + extra_crew;
  const rate = numOrNull(f.charter_rate) ?? 0;
  const gross_revenue =
    f.charter_rate_type === "per_day" ? rate * days : rate;
  const vat_pct = numOrNull(f.vat_percent) ?? 0;
  const vat_amount =
    f.vat_applicable && vat_pct > 0
      ? (gross_revenue * vat_pct) / (100 + vat_pct)
      : 0;
  const net_revenue = gross_revenue - vat_amount;
  const port_fees = numOrNull(f.port_fees) ?? 0;
  const provisioning = numOrNull(f.provisioning) ?? 0;
  const cleaning = numOrNull(f.cleaning) ?? 0;
  const other = numOrNull(f.other_expenses) ?? 0;
  const total_expenses = port_fees + provisioning + cleaning + other;
  const net_profit = net_revenue - total_crew - fuel_cost - total_expenses;
  const margin = net_revenue > 0 ? (net_profit / net_revenue) * 100 : 0;
  return {
    days,
    engine_hours_used,
    fuel_cost,
    captain_total,
    stew_total,
    total_crew,
    gross_revenue,
    vat_amount,
    net_revenue,
    total_expenses,
    net_profit,
    margin,
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

  const yachtsQ = useListYachts({
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

  const [hydrated, setHydrated] = useState(!editId);
  useEffect(() => {
    if (editId && charterQ.data && !hydrated) {
      setForm(fromCharter(charterQ.data));
      setHydrated(true);
    }
  }, [editId, charterQ.data, hydrated]);

  // Auto-select first yacht for new charter if none preselected
  useEffect(() => {
    if (!editId && !form.yacht_id && yachts.length > 0) {
      setForm((f) => ({ ...f, yacht_id: yachts[0]!.id }));
    }
  }, [editId, form.yacht_id, yachts]);

  const [collapsed, setCollapsed] = useState<Set<SectionId>>(new Set());
  const toggle = (s: SectionId) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s);
      else next.add(s);
      return next;
    });

  const [yachtPickerOpen, setYachtPickerOpen] = useState(false);

  const pl = useMemo(() => calcPL(form), [form]);

  const createM = useCreateCharter();
  const updateM = useUpdateCharter();
  const deleteM = useDeleteCharter();
  const saving = createM.isPending || updateM.isPending;

  const selectedYacht = yachts.find((y) => y.id === form.yacht_id);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  // ---- Save / Delete ----
  const handleSave = () => {
    if (!form.yacht_id) {
      Alert.alert("Yacht required", "Please select a yacht first.");
      return;
    }
    if (!dateOrNull(form.start_date) || !dateOrNull(form.end_date)) {
      Alert.alert(
        "Dates required",
        "Please enter start and end dates in YYYY-MM-DD format.",
      );
      return;
    }
    if (pl.days <= 0) {
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
    // Numeric fields — surface invalid entries instead of silently nulling
    const numericFields: { key: keyof FormState; label: string }[] = [
      { key: "engine_hours_before", label: "Engine hours before" },
      { key: "engine_hours_after", label: "Engine hours after" },
      { key: "fuel_liters", label: "Fuel liters" },
      { key: "fuel_price_per_liter", label: "Fuel price per liter" },
      { key: "captain_day_rate", label: "Captain day rate" },
      { key: "stewardess_day_rate", label: "Stewardess day rate" },
      { key: "extra_crew_cost", label: "Additional crew cost" },
      { key: "charter_rate", label: "Charter rate" },
      { key: "deposit_amount", label: "Deposit amount" },
      { key: "final_payment_amount", label: "Final payment amount" },
      { key: "vat_percent", label: "VAT %" },
      { key: "port_fees", label: "Port fees" },
      { key: "provisioning", label: "Provisioning" },
      { key: "cleaning", label: "Cleaning" },
      { key: "other_expenses", label: "Other expenses" },
    ];
    for (const f of numericFields) {
      const v = form[f.key];
      if (typeof v === "string" && !isValidNumeric(v)) {
        Alert.alert(
          "Invalid number",
          `${f.label} must be a positive number (use a dot for decimals, e.g. 1.5).`,
        );
        return;
      }
    }
    // Optional date fields — block if filled but malformed
    if (!isValidDateField(form.deposit_date)) {
      Alert.alert("Invalid date", "Deposit date must be YYYY-MM-DD or empty.");
      return;
    }
    if (!isValidDateField(form.final_payment_date)) {
      Alert.alert(
        "Invalid date",
        "Final payment date must be YYYY-MM-DD or empty.",
      );
      return;
    }
    // VAT toggle requires a percent value
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
    const body = toInput(form);
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
                  <View
                    style={[styles.dot, { backgroundColor: opt.color }]}
                  />
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
              <TextInput
                value={form.start_date}
                onChangeText={(v) => set("start_date", v)}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={MUTED}
                style={styles.input}
                autoCapitalize="none"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.subLabel}>End</Text>
              <TextInput
                value={form.end_date}
                onChangeText={(v) => set("end_date", v)}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={MUTED}
                style={styles.input}
                autoCapitalize="none"
              />
            </View>
          </View>
          {pl.days > 0 ? (
            <Text style={styles.computed}>
              Duration: <Text style={{ color: GOLD }}>{pl.days} days</Text>
            </Text>
          ) : (
            <Text style={[styles.computed, { color: MUTED }]}>
              Enter valid dates to see duration
            </Text>
          )}

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
        </Section>

        {/* SECTION 2: VESSEL */}
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
          {pl.engine_hours_used > 0 && (
            <Text style={styles.computed}>
              Engine hours used:{" "}
              <Text style={{ color: GOLD }}>
                {pl.engine_hours_used.toFixed(1)} hrs
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
          {pl.fuel_cost > 0 && (
            <Text style={styles.computed}>
              Fuel cost:{" "}
              <Text style={{ color: GOLD }}>{eur(pl.fuel_cost)}</Text>
            </Text>
          )}
        </Section>

        {/* SECTION 3: CREW */}
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
          {pl.captain_total > 0 && (
            <Text style={styles.computed}>
              Captain total:{" "}
              <Text style={{ color: GOLD }}>{eur(pl.captain_total)}</Text>
            </Text>
          )}

          <Text style={[styles.fieldLabel, { marginTop: 12 }]}>
            Stewardess count
          </Text>
          <View style={styles.stepperRow}>
            <Pressable
              onPress={() =>
                set("stewardess_count", Math.max(0, form.stewardess_count - 1))
              }
              style={styles.stepBtn}
              accessibilityRole="button"
              accessibilityLabel="Decrease stewardess count"
            >
              <Feather name="minus" size={16} color={IVORY} />
            </Pressable>
            <Text style={styles.stepValue}>{form.stewardess_count}</Text>
            <Pressable
              onPress={() =>
                set(
                  "stewardess_count",
                  Math.min(20, form.stewardess_count + 1),
                )
              }
              style={styles.stepBtn}
              accessibilityRole="button"
              accessibilityLabel="Increase stewardess count"
            >
              <Feather name="plus" size={16} color={IVORY} />
            </Pressable>
          </View>
          <Field
            label="Stewardess day rate (€/day each)"
            value={form.stewardess_day_rate}
            onChangeText={(v) => set("stewardess_day_rate", v)}
            keyboardType="decimal-pad"
            placeholder="0"
          />
          {pl.stew_total > 0 && (
            <Text style={styles.computed}>
              Stewardess total:{" "}
              <Text style={{ color: GOLD }}>{eur(pl.stew_total)}</Text>
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
            placeholder="e.g. chef, deckhand"
          />

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>TOTAL CREW COST</Text>
            <Text style={styles.totalValue}>{eur(pl.total_crew)}</Text>
          </View>
        </Section>

        {/* SECTION 4: REVENUE */}
        <Section
          id="revenue"
          title="Revenue"
          icon="dollar-sign"
          collapsed={collapsed.has("revenue")}
          onToggle={() => toggle("revenue")}
        >
          <Text style={styles.fieldLabel}>Charter rate type</Text>
          <View style={styles.pillRow}>
            {(["fixed", "per_day"] as CharterRateType[]).map((t) => {
              const active = form.charter_rate_type === t;
              return (
                <Pressable
                  key={t}
                  onPress={() => set("charter_rate_type", t)}
                  style={[
                    styles.modePill,
                    active && styles.modePillActive,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`Rate type ${t}`}
                >
                  <Text
                    style={[
                      styles.modePillText,
                      active && { color: GOLD },
                    ]}
                  >
                    {t === "fixed" ? "Fixed total" : "Per day"}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Field
            label={
              form.charter_rate_type === "per_day"
                ? "Charter rate (€/day)"
                : "Charter rate (€ total)"
            }
            value={form.charter_rate}
            onChangeText={(v) => set("charter_rate", v)}
            keyboardType="decimal-pad"
            placeholder="0"
          />
          {form.charter_rate_type === "per_day" && pl.days > 0 && pl.gross_revenue > 0 && (
            <Text style={styles.computed}>
              × {pl.days} days ={" "}
              <Text style={{ color: GOLD }}>{eur(pl.gross_revenue)}</Text>
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
              <Field
                label="Date"
                value={form.deposit_date}
                onChangeText={(v) => set("deposit_date", v)}
                placeholder="YYYY-MM-DD"
                autoCapitalize="none"
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
              <Field
                label="Date"
                value={form.final_payment_date}
                onChangeText={(v) => set("final_payment_date", v)}
                placeholder="YYYY-MM-DD"
                autoCapitalize="none"
              />
            </View>
          </View>
          <ToggleRow
            label="Final payment received"
            value={form.final_payment_received}
            onValueChange={(v) => set("final_payment_received", v)}
          />

          <ToggleRow
            label="Apply VAT"
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
            <RevLine label="Gross revenue" value={eur(pl.gross_revenue)} />
            <RevLine label="VAT amount" value={eur(pl.vat_amount)} />
            <View style={styles.revDivider} />
            <RevLine
              label="Net revenue"
              value={eur(pl.net_revenue)}
              bold
              gold
            />
          </View>
        </Section>

        {/* SECTION 5: EXPENSES */}
        <Section
          id="expenses"
          title="Expenses"
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
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>TOTAL EXPENSES</Text>
            <Text style={styles.totalValue}>{eur(pl.total_expenses)}</Text>
          </View>
        </Section>

        {/* SECTION 6: P&L SUMMARY */}
        <Section
          id="pl"
          title="P&L Summary"
          icon="bar-chart-2"
          collapsed={collapsed.has("pl")}
          onToggle={() => toggle("pl")}
        >
          <View style={styles.plCard}>
            <Text style={styles.plTitle}>P&L THIS CHARTER</Text>
            <PLRow label="Net revenue" value={eur(pl.net_revenue)} />
            <PLRow
              label="− Crew costs"
              value={eur(pl.total_crew)}
              negative
            />
            <PLRow
              label="− Fuel"
              value={eur(pl.fuel_cost)}
              negative
            />
            <PLRow
              label="− Expenses"
              value={eur(pl.total_expenses)}
              negative
            />
            <View style={styles.plDivider} />
            <View style={styles.plProfitRow}>
              <Text style={styles.plProfitLabel}>NET PROFIT</Text>
              <Text
                style={[
                  styles.plProfitValue,
                  { color: pl.net_profit >= 0 ? GREEN : RED },
                ]}
              >
                {eur(pl.net_profit)}
              </Text>
            </View>
            <View style={styles.plMarginRow}>
              <Text style={styles.plMarginLabel}>MARGIN</Text>
              <Text
                style={[
                  styles.plMarginValue,
                  { color: pl.margin >= 0 ? GREEN : RED },
                ]}
              >
                {pl.margin.toFixed(1)}%
              </Text>
            </View>
          </View>
        </Section>

        {/* SECTION 7: NOTES */}
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
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Select yacht</Text>
            {yachts.length === 0 ? (
              <Text style={styles.emptyText}>
                You don&apos;t have any yachts yet. Add one from the Fleet
                view first.
              </Text>
            ) : (
              <ScrollView style={{ maxHeight: 360 }}>
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
                      accessibilityRole="button"
                      accessibilityLabel={`Select ${y.name}`}
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
                      {active && (
                        <Feather name="check" size={18} color={GOLD} />
                      )}
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
  keyboardType?: "default" | "decimal-pad" | "number-pad" | "email-address" | "phone-pad";
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

  // Section
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

  // Fields
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

  // Pills
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
    paddingHorizontal: 16,
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

  // Yacht picker trigger
  yachtPicker: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  // Stepper
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

  // Toggle
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

  // Total
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

  // Revenue box
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
  revDivider: {
    height: 1,
    backgroundColor: DIVIDER,
    marginVertical: 8,
  },

  // P&L card
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

  // Bottom bar
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

  // Primary btn (for sign-in fallback)
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

  // Modal
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
