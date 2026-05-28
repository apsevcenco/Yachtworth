import { Feather } from "@expo/vector-icons";
import {
  getGetYachtQueryKey,
  getListYachtEquipmentQueryKey,
  getListYachtsQueryKey,
  useCreateYacht,
  useGetYacht,
  useListYachtEquipment,
  useReplaceYachtEquipment,
  useUpdateYacht,
  type EquipmentItem,
  type Yacht,
  type YachtInput,
} from "@workspace/api-client-react";
import EquipmentSection from "../../components/EquipmentSection";
import { PhotoSection } from "../../components/PhotoSection";
import { useQueryClient } from "@tanstack/react-query";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useUnits } from "../../hooks/useUnits";

const NAVY = "#0B1E3F";
const NAVY_ELEV = "#142A52";
const NAVY_DEEP = "#081633";
const GOLD = "#C9A961";
const IVORY = "#F7F3EC";
const MUTED = "rgba(247,243,236,0.6)";
const DIVIDER = "rgba(247,243,236,0.08)";

type YachtType = "motor_yacht" | "sailing_yacht" | "catamaran" | "superyacht";
type OwnerRole = "owner" | "broker" | "manager";
type VatStatus = "tax_paid_eu" | "tax_not_paid" | "unknown";

const TYPE_OPTIONS: { value: YachtType; label: string }[] = [
  { value: "motor_yacht", label: "Motor" },
  { value: "sailing_yacht", label: "Sailing" },
  { value: "catamaran", label: "Catamaran" },
  { value: "superyacht", label: "Superyacht" },
];

const ROLE_OPTIONS: { value: OwnerRole; label: string }[] = [
  { value: "owner", label: "Owner" },
  { value: "broker", label: "Broker" },
  { value: "manager", label: "Manager" },
];

const VAT_OPTIONS: { value: VatStatus; label: string }[] = [
  { value: "tax_paid_eu", label: "Tax Paid (EU)" },
  { value: "tax_not_paid", label: "Not Paid / Offshore" },
  { value: "unknown", label: "Unknown" },
];

type FormState = {
  // Basics
  name: string;
  yacht_type: YachtType | null;
  brand: string;
  model: string;
  year_built: string;
  owner_role: OwnerRole;
  // Dimensions (always stored as metric strings)
  length_m: string;
  beam_m: string;
  draft_m: string;
  // Registration
  flag: string;
  home_port: string;
  registration_number: string;
  imo_number: string;
  hull_id: string;
  vat_status: VatStatus | null;
  // Engine
  engine_maker: string;
  engine_model: string;
  engine_count: number;
  total_hp: string;
  engine_hours: string;
  // Accommodation
  cabins: number; // guest cabins
  crew_cabins: number;
  berths: number;
  heads: number;
  // Photo / Notes
  photo_url: string;
  photo_urls: string[];
  cover_photo_url: string | null;
  notes: string;
};

const EMPTY: FormState = {
  name: "",
  yacht_type: null,
  brand: "",
  model: "",
  year_built: "",
  owner_role: "owner",
  length_m: "",
  beam_m: "",
  draft_m: "",
  flag: "",
  home_port: "",
  registration_number: "",
  imo_number: "",
  hull_id: "",
  vat_status: null,
  engine_maker: "",
  engine_model: "",
  engine_count: 0,
  total_hp: "",
  engine_hours: "",
  cabins: 0,
  crew_cabins: 0,
  berths: 0,
  heads: 0,
  photo_url: "",
  photo_urls: [],
  cover_photo_url: null,
  notes: "",
};

const M_PER_FT = 0.3048;
const numOrNull = (s: string): number | null => {
  const n = Number(s.replace(",", "."));
  return Number.isFinite(n) && s.trim() !== "" ? n : null;
};
const intOrNull = (s: string): number | null => {
  const n = parseInt(s, 10);
  return Number.isFinite(n) && s.trim() !== "" ? n : null;
};
const strOrNull = (s: string): string | null => (s.trim() ? s.trim() : null);

function fromYacht(y: Yacht): FormState {
  return {
    name: y.name ?? "",
    yacht_type: (y.yacht_type as YachtType | null) ?? null,
    brand: y.brand ?? "",
    model: y.model ?? "",
    year_built: y.year_built != null ? String(y.year_built) : "",
    owner_role: (y.owner_role as OwnerRole | null) ?? "owner",
    length_m: y.length_meters != null ? String(y.length_meters) : "",
    beam_m: y.beam_meters != null ? String(y.beam_meters) : "",
    draft_m: y.draft_meters != null ? String(y.draft_meters) : "",
    flag: y.flag ?? "",
    home_port: y.home_port ?? "",
    registration_number: y.registration_number ?? "",
    imo_number: y.imo_number ?? "",
    hull_id: y.hull_id ?? "",
    vat_status: (y.vat_status as VatStatus | null) ?? null,
    engine_maker: y.engine_maker ?? "",
    engine_model: y.engine_model ?? "",
    engine_count: y.engine_count ?? 0,
    total_hp: y.total_hp != null ? String(y.total_hp) : "",
    engine_hours: y.engine_hours != null ? String(y.engine_hours) : "",
    cabins: y.cabins ?? 0,
    crew_cabins: y.crew_cabins ?? 0,
    berths: y.berths ?? 0,
    heads: y.heads ?? 0,
    photo_url: y.photo_url ?? "",
    photo_urls: Array.isArray(y.photo_urls) ? y.photo_urls : [],
    cover_photo_url: y.cover_photo_url ?? null,
    notes: y.notes ?? "",
  };
}

function toInput(s: FormState): YachtInput {
  return {
    name: strOrNull(s.name),
    yacht_type: s.yacht_type,
    brand: strOrNull(s.brand),
    model: strOrNull(s.model),
    year_built: intOrNull(s.year_built),
    owner_role: s.owner_role,
    length_meters: numOrNull(s.length_m),
    beam_meters: numOrNull(s.beam_m),
    draft_meters: numOrNull(s.draft_m),
    flag: strOrNull(s.flag),
    home_port: strOrNull(s.home_port),
    registration_number: strOrNull(s.registration_number),
    imo_number: strOrNull(s.imo_number),
    hull_id: strOrNull(s.hull_id),
    vat_status: s.vat_status,
    engine_maker: strOrNull(s.engine_maker),
    engine_model: strOrNull(s.engine_model),
    engine_count: s.engine_count,
    total_hp: intOrNull(s.total_hp),
    engine_hours: intOrNull(s.engine_hours),
    cabins: s.cabins,
    crew_cabins: s.crew_cabins,
    berths: s.berths,
    heads: s.heads,
    photo_url: strOrNull(s.photo_url),
    notes: strOrNull(s.notes),
  };
}

export default function MyYachtEditScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const qc = useQueryClient();
  const params = useLocalSearchParams<{ id?: string }>();
  const id = typeof params.id === "string" ? params.id : null;
  const isEdit = Boolean(id);

  const { units: globalUnits } = useUnits();
  // Snapshot units at mount so toggling Settings mid-form can't corrupt values.
  const [formUnits] = useState<"metric" | "imperial">(globalUnits);

  const [state, setState] = useState<FormState>(EMPTY);
  const [equipment, setEquipment] = useState<EquipmentItem[]>([]);
  // Tracks an id returned by a successful create when the subsequent
  // equipment PUT failed; ensures the retry updates rather than dupes.
  const [createdId, setCreatedId] = useState<string | null>(null);
  const INITIAL_OPEN: Record<string, boolean> = {
    basics: true,
    dimensions: false,
    registration: false,
    engine: false,
    accommodation: false,
    photo: false,
    notes: false,
    equipment: false,
  };
  const [open, setOpen] = useState<Record<string, boolean>>(INITIAL_OPEN);

  // Per UX rule: every time the user enters this screen (initial mount,
  // back-navigation from a child route, or right after save+return),
  // collapsible sections reset so only the first is open.
  useFocusEffect(
    React.useCallback(() => {
      setOpen(INITIAL_OPEN);
    }, []),
  );

  const getQ = useGetYacht(id ?? "", {
    query: {
      queryKey: getGetYachtQueryKey(id ?? ""),
      enabled: isEdit,
      staleTime: 0,
    },
  });

  useEffect(() => {
    if (isEdit && getQ.data) setState(fromYacht(getQ.data));
  }, [isEdit, getQ.data]);

  // Equipment is loaded separately (different table) and saved separately.
  const eqQ = useListYachtEquipment(id ?? "", {
    query: {
      queryKey: getListYachtEquipmentQueryKey(id ?? ""),
      enabled: isEdit && Boolean(id),
      staleTime: 0,
    },
  });
  useEffect(() => {
    if (isEdit && eqQ.data) setEquipment(eqQ.data.items);
  }, [isEdit, eqQ.data]);

  const createM = useCreateYacht();
  const updateM = useUpdateYacht();
  const replaceEqM = useReplaceYachtEquipment();
  const saving = createM.isPending || updateM.isPending || replaceEqM.isPending;

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setState((s) => ({ ...s, [k]: v }));

  const toggle = (k: string) => setOpen((o) => ({ ...o, [k]: !o[k] }));

  const lengthLabel = formUnits === "metric" ? "m" : "ft";
  // Convert displayed string ↔ stored metric
  const dispLength = useMemo(() => {
    if (formUnits === "metric") return state.length_m;
    const n = numOrNull(state.length_m);
    return n == null ? "" : (n / M_PER_FT).toFixed(1);
  }, [state.length_m, formUnits]);

  const onChangeLength = (txt: string) => {
    if (formUnits === "metric") return set("length_m", txt);
    const n = numOrNull(txt);
    set("length_m", n == null ? "" : (n * M_PER_FT).toFixed(2));
  };

  const validate = (): string | null => {
    if (!state.name.trim()) return "Yacht name is required.";
    if (!state.yacht_type) return "Yacht type is required.";
    const y = intOrNull(state.year_built);
    if (y == null || y < 1900 || y > 2100) return "Year built is required (1900–2100).";
    const l = numOrNull(state.length_m);
    if (l == null || l <= 0) return "Length is required.";
    return null;
  };

  const onSave = async () => {
    const err = validate();
    if (err) {
      Alert.alert("Missing required fields", err);
      return;
    }
    const payload = toInput(state);
    try {
      // Save yacht first to ensure we have an id, then replace equipment.
      // `createdId` (set after a successful create on a previous attempt)
      // makes retries idempotent: if equipment PUT failed last time, we
      // do NOT create a duplicate yacht — we PATCH the existing one.
      let yachtId = id ?? createdId;
      if (yachtId) {
        await updateM.mutateAsync({ id: yachtId, data: payload });
      } else {
        const created = await createM.mutateAsync({ data: payload });
        yachtId = created.id;
        setCreatedId(yachtId);
      }
      // Equipment replace — only when we have an id (always now). Strip
      // the server-assigned `id` field; PUT regenerates rows.
      if (yachtId) {
        await replaceEqM.mutateAsync({
          id: yachtId,
          data: {
            items: equipment.map(({ id: _drop, ...rest }) => {
              void _drop;
              return rest;
            }),
          },
        });
        await qc.invalidateQueries({
          queryKey: getListYachtEquipmentQueryKey(yachtId),
        });
      }
      await qc.invalidateQueries({ queryKey: getListYachtsQueryKey() });
      await qc.invalidateQueries({ queryKey: ["/api/yachts"] });
      if (yachtId) {
        await qc.invalidateQueries({ queryKey: getGetYachtQueryKey(yachtId) });
      }
      Alert.alert(
        "Saved",
        isEdit ? "Your changes have been saved." : "Yacht added to My Yacht.",
        [{ text: "OK", onPress: () => router.back() }],
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to save yacht.";
      Alert.alert("Couldn't save", msg);
    }
  };

  const loading = isEdit && getQ.isLoading;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: NAVY }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 56 }]}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Back"
          style={({ pressed }) => [
            styles.backBtn,
            { opacity: pressed ? 0.6 : 1 },
          ]}
        >
          <Feather name="chevron-left" size={22} color={IVORY} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {isEdit ? "Edit Yacht" : "Add Yacht"}
        </Text>
        <View style={{ width: 36 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={GOLD} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingTop: 12,
            paddingBottom: insets.bottom + 120,
          }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Section 1: BASICS */}
          <Section title="Basics" required open={open.basics} onToggle={() => toggle("basics")}>
            <Field label="Yacht name *" hint="Required">
              <TextInput
                value={state.name}
                onChangeText={(t) => set("name", t)}
                placeholder="e.g. Aurelia"
                placeholderTextColor={MUTED}
                style={styles.input}
              />
            </Field>
            <Field label="Type *">
              <PillRow
                options={TYPE_OPTIONS}
                value={state.yacht_type}
                onChange={(v) => set("yacht_type", v)}
              />
            </Field>
            <Field label="Builder / Yard">
              <TextInput
                value={state.brand}
                onChangeText={(t) => set("brand", t)}
                placeholder="e.g. Azimut, Sunseeker"
                placeholderTextColor={MUTED}
                style={styles.input}
              />
            </Field>
            <Field label="Model">
              <TextInput
                value={state.model}
                onChangeText={(t) => set("model", t)}
                placeholder="e.g. Grande 24M"
                placeholderTextColor={MUTED}
                style={styles.input}
              />
            </Field>
            <Field label="Year built *">
              <TextInput
                value={state.year_built}
                onChangeText={(t) => set("year_built", t.replace(/\D/g, "").slice(0, 4))}
                placeholder="2019"
                placeholderTextColor={MUTED}
                keyboardType="number-pad"
                style={styles.input}
              />
            </Field>
            <Field label="Your role">
              <PillRow
                options={ROLE_OPTIONS}
                value={state.owner_role}
                onChange={(v) => set("owner_role", v)}
              />
            </Field>
          </Section>

          {/* Section 2: DIMENSIONS */}
          <Section
            title="Dimensions"
            required
            open={open.dimensions}
            onToggle={() => toggle("dimensions")}
          >
            <View style={styles.unitsRow}>
              <Text style={styles.unitsHint}>
                Units: {formUnits === "metric" ? "Meters" : "Feet"}. Change in
                Settings.
              </Text>
            </View>
            <Field label={`Length (LOA) * — ${lengthLabel}`}>
              <TextInput
                value={dispLength}
                onChangeText={onChangeLength}
                placeholder={formUnits === "metric" ? "24.0" : "79.0"}
                placeholderTextColor={MUTED}
                keyboardType="decimal-pad"
                style={styles.input}
              />
            </Field>
            <Field label={`Beam — ${lengthLabel}`}>
              <DimInput
                metricValue={state.beam_m}
                onChange={(m) => set("beam_m", m)}
                units={formUnits}
              />
            </Field>
            <Field label={`Draft — ${lengthLabel}`}>
              <DimInput
                metricValue={state.draft_m}
                onChange={(m) => set("draft_m", m)}
                units={formUnits}
              />
            </Field>
          </Section>

          {/* Section 3: REGISTRATION */}
          <Section
            title="Registration"
            open={open.registration}
            onToggle={() => toggle("registration")}
          >
            <Field label="Flag / Country">
              <TextInput
                value={state.flag}
                onChangeText={(t) => set("flag", t)}
                placeholder="e.g. Malta"
                placeholderTextColor={MUTED}
                style={styles.input}
              />
            </Field>
            <Field label="Home port">
              <TextInput
                value={state.home_port}
                onChangeText={(t) => set("home_port", t)}
                placeholder="e.g. Antibes"
                placeholderTextColor={MUTED}
                style={styles.input}
              />
            </Field>
            <Field label="Registration number">
              <TextInput
                value={state.registration_number}
                onChangeText={(t) => set("registration_number", t)}
                placeholderTextColor={MUTED}
                style={styles.input}
                autoCapitalize="characters"
              />
            </Field>
            <Field
              label="IMO number"
              hint="Needed for verification and Digital Passport"
            >
              <TextInput
                value={state.imo_number}
                onChangeText={(t) => set("imo_number", t.replace(/[^0-9]/g, "").slice(0, 7))}
                placeholder="7-digit IMO"
                placeholderTextColor={MUTED}
                keyboardType="number-pad"
                style={styles.input}
              />
            </Field>
            <Field label="Hull ID (HIN)">
              <TextInput
                value={state.hull_id}
                onChangeText={(t) => set("hull_id", t)}
                placeholderTextColor={MUTED}
                style={styles.input}
                autoCapitalize="characters"
              />
            </Field>
            <Field label="VAT status">
              <PillRow
                options={VAT_OPTIONS}
                value={state.vat_status}
                onChange={(v) => set("vat_status", v)}
              />
            </Field>
          </Section>

          {/* Section 4: ENGINE */}
          <Section title="Engine" open={open.engine} onToggle={() => toggle("engine")}>
            <Field label="Engine maker">
              <TextInput
                value={state.engine_maker}
                onChangeText={(t) => set("engine_maker", t)}
                placeholder="e.g. MAN, MTU, Volvo Penta"
                placeholderTextColor={MUTED}
                style={styles.input}
              />
            </Field>
            <Field label="Engine model">
              <TextInput
                value={state.engine_model}
                onChangeText={(t) => set("engine_model", t)}
                placeholder="e.g. V12-1800"
                placeholderTextColor={MUTED}
                style={styles.input}
              />
            </Field>
            <Field label="Number of engines">
              <Stepper
                value={state.engine_count}
                onChange={(v) => set("engine_count", v)}
                min={0}
                max={8}
              />
            </Field>
            <Field label="Total horsepower (HP)">
              <TextInput
                value={state.total_hp}
                onChangeText={(t) => set("total_hp", t.replace(/\D/g, ""))}
                placeholder="e.g. 3600"
                placeholderTextColor={MUTED}
                keyboardType="number-pad"
                style={styles.input}
              />
            </Field>
            <Field
              label="Current engine hours"
              hint="Used in Charter Planner to track hours per trip"
            >
              <TextInput
                value={state.engine_hours}
                onChangeText={(t) => set("engine_hours", t.replace(/\D/g, ""))}
                placeholder="e.g. 1200"
                placeholderTextColor={MUTED}
                keyboardType="number-pad"
                style={styles.input}
              />
            </Field>
          </Section>

          {/* Section 5: ACCOMMODATION */}
          <Section
            title="Accommodation"
            open={open.accommodation}
            onToggle={() => toggle("accommodation")}
          >
            <Field label="Guest cabins">
              <Stepper
                value={state.cabins}
                onChange={(v) => set("cabins", v)}
                min={0}
                max={20}
              />
            </Field>
            <Field label="Crew cabins">
              <Stepper
                value={state.crew_cabins}
                onChange={(v) => set("crew_cabins", v)}
                min={0}
                max={20}
              />
            </Field>
            <Field label="Berths">
              <Stepper
                value={state.berths}
                onChange={(v) => set("berths", v)}
                min={0}
                max={40}
              />
            </Field>
            <Field label="Heads / WC">
              <Stepper
                value={state.heads}
                onChange={(v) => set("heads", v)}
                min={0}
                max={20}
              />
            </Field>
          </Section>

          {/* Section 6: PHOTOS */}
          <Section title="Photos" open={open.photo} onToggle={() => toggle("photo")}>
            <PhotoSection
              yachtId={id ?? createdId}
              photos={state.photo_urls}
              coverUrl={state.cover_photo_url}
              onChange={(photos, cover) => {
                setState((s) => ({
                  ...s,
                  photo_urls: photos,
                  cover_photo_url: cover,
                  photo_url: cover ?? "",
                }));
                // Refresh server cache so My Yacht list + detail reflect changes.
                void qc.invalidateQueries({ queryKey: ["/api/yachts"] });
                const yid = id ?? createdId;
                if (yid) {
                  void qc.invalidateQueries({
                    queryKey: getGetYachtQueryKey(yid),
                  });
                }
              }}
            />
          </Section>

          {/* Section 8: EQUIPMENT & SYSTEMS */}
          <Section
            title="Equipment & Systems"
            open={open.equipment}
            onToggle={() => toggle("equipment")}
          >
            <Text style={styles.unitsHint}>
              Toggle items you have. All fields are optional — fill what's
              relevant. Equipment data powers your Yacht Passport and is never
              shown to charter clients without your permission.
            </Text>
            <View style={{ marginTop: 8 }}>
              <EquipmentSection
                items={equipment}
                onChange={setEquipment}
                yachtType={state.yacht_type}
              />
            </View>
          </Section>

          {/* Section 7: NOTES */}
          <Section title="Notes" open={open.notes} onToggle={() => toggle("notes")}>
            <Field label="Notes">
              <TextInput
                value={state.notes}
                onChangeText={(t) => set("notes", t)}
                placeholder="Anything else worth remembering…"
                placeholderTextColor={MUTED}
                multiline
                style={[styles.input, styles.textarea]}
              />
            </Field>
          </Section>
        </ScrollView>
      )}

      {/* Sticky save bar */}
      <View
        style={[
          styles.saveBar,
          { paddingBottom: insets.bottom > 0 ? insets.bottom : 12 },
        ]}
      >
        <Pressable
          onPress={() => router.back()}
          disabled={saving}
          accessibilityRole="button"
          accessibilityLabel="Cancel"
          style={({ pressed }) => [
            styles.cancelBtn,
            { opacity: pressed ? 0.7 : saving ? 0.5 : 1 },
          ]}
        >
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>
        <Pressable
          onPress={onSave}
          disabled={saving}
          accessibilityRole="button"
          accessibilityLabel={isEdit ? "Save changes" : "Save yacht"}
          style={({ pressed }) => [
            styles.saveBtn,
            { opacity: pressed ? 0.85 : saving ? 0.6 : 1 },
          ]}
        >
          {saving ? (
            <ActivityIndicator color={NAVY} />
          ) : (
            <>
              <Text style={styles.saveText}>
                {isEdit ? "Save changes" : "Save Yacht"}
              </Text>
              <Feather name="check" size={16} color={NAVY} />
            </>
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

/* ─── Subcomponents ─────────────────────────────────────────────────── */

function Section({
  title,
  required,
  open,
  onToggle,
  children,
}: {
  title: string;
  required?: boolean;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Pressable
        onPress={onToggle}
        accessibilityRole="button"
        accessibilityLabel={`${open ? "Collapse" : "Expand"} ${title} section`}
        style={styles.sectionHeader}
      >
        <Text style={styles.sectionTitle}>
          {title}
          {required ? <Text style={{ color: GOLD }}> *</Text> : null}
        </Text>
        <Feather
          name={open ? "chevron-up" : "chevron-down"}
          size={18}
          color={MUTED}
        />
      </Pressable>
      {open ? <View style={styles.sectionBody}>{children}</View> : null}
    </View>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {children}
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

function PillRow<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T | null;
  onChange: (v: T) => void;
}) {
  return (
    <View style={styles.pillRow}>
      {options.map((opt) => {
        const sel = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            accessibilityRole="button"
            accessibilityLabel={opt.label}
            style={({ pressed }) => [
              styles.pill,
              sel && styles.pillSel,
              { opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Text style={[styles.pillText, sel && styles.pillTextSel]}>
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function Stepper({
  value,
  onChange,
  min = 0,
  max = 99,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
}) {
  const dec = () => onChange(Math.max(min, value - 1));
  const inc = () => onChange(Math.min(max, value + 1));
  return (
    <View style={styles.stepper}>
      <Pressable
        onPress={dec}
        disabled={value <= min}
        accessibilityRole="button"
        accessibilityLabel="Decrease"
        style={({ pressed }) => [
          styles.stepBtn,
          { opacity: value <= min ? 0.3 : pressed ? 0.6 : 1 },
        ]}
      >
        <Feather name="minus" size={16} color={GOLD} />
      </Pressable>
      <Text style={styles.stepValue}>{value}</Text>
      <Pressable
        onPress={inc}
        disabled={value >= max}
        accessibilityRole="button"
        accessibilityLabel="Increase"
        style={({ pressed }) => [
          styles.stepBtn,
          { opacity: value >= max ? 0.3 : pressed ? 0.6 : 1 },
        ]}
      >
        <Feather name="plus" size={16} color={GOLD} />
      </Pressable>
    </View>
  );
}

function DimInput({
  metricValue,
  onChange,
  units,
}: {
  metricValue: string;
  onChange: (metric: string) => void;
  units: "metric" | "imperial";
}) {
  const disp = useMemo(() => {
    if (units === "metric") return metricValue;
    const n = numOrNull(metricValue);
    return n == null ? "" : (n / M_PER_FT).toFixed(1);
  }, [metricValue, units]);

  return (
    <TextInput
      value={disp}
      onChangeText={(t) => {
        if (units === "metric") return onChange(t);
        const n = numOrNull(t);
        onChange(n == null ? "" : (n * M_PER_FT).toFixed(2));
      }}
      placeholder="—"
      placeholderTextColor={MUTED}
      keyboardType="decimal-pad"
      style={styles.input}
    />
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: NAVY,
    borderBottomWidth: 1,
    borderBottomColor: DIVIDER,
    gap: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(247,243,236,0.06)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    color: IVORY,
    fontFamily: "Gilroy-ExtraBold",
    fontSize: 18,
    letterSpacing: -0.2,
  },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  section: {
    backgroundColor: NAVY_DEEP,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: DIVIDER,
    marginBottom: 12,
    overflow: "hidden",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  sectionTitle: {
    color: IVORY,
    fontFamily: "Gilroy-ExtraBold",
    fontSize: 15,
    letterSpacing: -0.1,
    textTransform: "uppercase",
  },
  sectionBody: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 4,
    gap: 14,
    borderTopWidth: 1,
    borderTopColor: DIVIDER,
  },
  field: { gap: 8 },
  label: {
    color: MUTED,
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    letterSpacing: 1.1,
    textTransform: "uppercase",
  },
  hint: {
    color: MUTED,
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    fontStyle: "italic",
    marginTop: 2,
  },
  input: {
    color: IVORY,
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    backgroundColor: NAVY_ELEV,
    borderColor: DIVIDER,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  textarea: { minHeight: 90, textAlignVertical: "top" },
  pillRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 99,
    borderWidth: 1,
    borderColor: DIVIDER,
    backgroundColor: NAVY_ELEV,
  },
  pillSel: {
    borderColor: GOLD,
    backgroundColor: "rgba(201,169,97,0.14)",
  },
  pillText: {
    color: MUTED,
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    letterSpacing: 0.3,
  },
  pillTextSel: { color: GOLD },
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 18,
    alignSelf: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: NAVY_ELEV,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: DIVIDER,
  },
  stepBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: GOLD,
    alignItems: "center",
    justifyContent: "center",
  },
  stepValue: {
    minWidth: 28,
    textAlign: "center",
    color: IVORY,
    fontFamily: "Inter_700Bold",
    fontSize: 16,
  },
  unitsRow: { marginBottom: 4 },
  unitsHint: {
    color: MUTED,
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    fontStyle: "italic",
  },
  saveBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: NAVY_DEEP,
    borderTopWidth: 1,
    borderTopColor: DIVIDER,
  },
  cancelBtn: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: DIVIDER,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelText: {
    color: IVORY,
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
  },
  saveBtn: {
    flex: 1,
    flexDirection: "row",
    gap: 8,
    backgroundColor: GOLD,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  saveText: {
    color: NAVY,
    fontFamily: "Inter_700Bold",
    fontSize: 14,
    letterSpacing: 0.3,
  },
});
