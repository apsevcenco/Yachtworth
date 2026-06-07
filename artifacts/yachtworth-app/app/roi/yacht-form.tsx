import { Feather } from "@expo/vector-icons";
import { useAuth } from "@clerk/expo";
import {
  getGetYachtQueryKey,
  getListYachtsQueryKey,
  useCreateYacht,
  useGetYacht,
  useUpdateYacht,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
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
import {
  ANNUAL_FIELDS,
  computeCrewMonthlyTotal,
  CREW_POSITIONS,
  hydrateCrew,
  INITIAL_CREW,
  MONTHLY_FIELDS,
  parseInt10,
  parseNum,
  toStr,
  type AnnualKey,
  type CrewRow,
  type MonthlyKey,
} from "../../lib/roiFinancials";

const NAVY = "#0B1E3F";
const NAVY_ELEV = "#142A52";
const NAVY_DEEP = "#081633";
const GOLD = "#C9A961";
const IVORY = "#F7F3EC";
const MUTED = "rgba(247,243,236,0.55)";
const DIVIDER = "rgba(247,243,236,0.08)";
const ERROR = "#FF8A8A";

const M_TO_FT = 3.28084;
const INT_RE = /^\d+$/;
const DEC_RE = /^\d+([.,]\d+)?$/;

type YachtType = "motor_yacht" | "sailing_yacht" | "catamaran" | "superyacht";
type FinancingType = "cash" | "loan";

const TYPE_OPTIONS: { value: YachtType; label: string }[] = [
  { value: "motor_yacht", label: "Motor" },
  { value: "sailing_yacht", label: "Sailing" },
  { value: "catamaran", label: "Catamaran" },
  { value: "superyacht", label: "Superyacht" },
];

const STEP_TITLES = ["Basics", "Operations", "Expenses", "Financing"];

// Crew positions, expense field lists, and the crew/parse helpers live in
// `lib/roiFinancials.ts` so this wizard and the ROI scenario screen (which
// sends them as per-calculation overrides) can never silently drift apart.
type ExpenseKey = MonthlyKey | AnnualKey | "charter_commission_pct";

interface FormState {
  // basics
  name: string;
  brand: string;
  model: string;
  year_built: string;
  yacht_type: YachtType | null;
  length: string; // displayed in current units
  cabins: string;
  guests: string;
  crew: string;
  // operations
  engine_hours: string;
  marina_location: string;
  flag: string;
  commercial_registration: boolean;
  purchase_price_eur: string;
  purchase_year: string;
  // crew (per-position breakdown, auto-totals to monthly_crew_eur on submit)
  crew_breakdown: CrewRow[];
  // expenses (monthly EUR)
  monthly_mooring_eur: string;
  monthly_fuel_eur: string;
  monthly_provisioning_eur: string;
  monthly_communications_eur: string;
  monthly_maintenance_eur: string;
  monthly_management_fee_eur: string;
  monthly_misc_eur: string;
  // expenses (annual EUR)
  annual_insurance_eur: string;
  annual_registration_eur: string;
  annual_classification_eur: string;
  annual_antifouling_eur: string;
  annual_refit_reserve_eur: string;
  // charter-specific
  charter_commission_pct: string;
  // financing
  financing_type: FinancingType | null;
  loan_amount_eur: string;
  loan_rate_pct: string;
  loan_term_years: string;
}

const INITIAL: FormState = {
  name: "",
  brand: "",
  model: "",
  year_built: "",
  yacht_type: null,
  length: "",
  cabins: "",
  guests: "",
  crew: "",
  engine_hours: "",
  marina_location: "",
  flag: "",
  commercial_registration: false,
  purchase_price_eur: "",
  purchase_year: "",
  crew_breakdown: INITIAL_CREW,
  monthly_mooring_eur: "",
  monthly_fuel_eur: "",
  monthly_provisioning_eur: "",
  monthly_communications_eur: "",
  monthly_maintenance_eur: "",
  monthly_management_fee_eur: "",
  monthly_misc_eur: "",
  annual_insurance_eur: "",
  annual_registration_eur: "",
  annual_classification_eur: "",
  annual_antifouling_eur: "",
  annual_refit_reserve_eur: "",
  charter_commission_pct: "",
  financing_type: null,
  loan_amount_eur: "",
  loan_rate_pct: "",
  loan_term_years: "",
};

export default function YachtFormScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const editId = typeof params.id === "string" ? params.id : null;
  const { isSignedIn, isLoaded } = useAuth();
  const { units } = useUnits();
  const qc = useQueryClient();

  const createMut = useCreateYacht();
  const updateMut = useUpdateYacht();
  const getYacht = useGetYacht(editId ?? "", {
    query: {
      queryKey: editId ? getGetYachtQueryKey(editId) : ["yacht-disabled"],
      enabled: Boolean(editId && isSignedIn),
    },
  });

  const [form, setForm] = useState<FormState>(INITIAL);
  const [step, setStep] = useState(0);
  const [showErrors, setShowErrors] = useState(false);
  const lastPrefilledIdRef = useRef<string | null>(null);
  // Lock units snapshot at mount — see Stage 2 review notes.
  const [formUnits, setFormUnits] = useState<"metric" | "imperial">(units);
  const formUnitsLockedRef = useRef(false);
  useEffect(() => {
    if (!formUnitsLockedRef.current) {
      formUnitsLockedRef.current = true;
      setFormUnits(units);
    }
  }, [units]);

  // Prefill on edit — re-prefills when editId changes.
  useEffect(() => {
    if (!editId) return;
    if (lastPrefilledIdRef.current === editId) return;
    const y = getYacht.data;
    if (!y) return;
    lastPrefilledIdRef.current = editId;
    const lengthMeters = y.length_meters ?? null;
    const lengthDisplay =
      lengthMeters == null
        ? ""
        : formUnits === "imperial"
        ? Math.round(lengthMeters * M_TO_FT).toString()
        : lengthMeters.toString();
    setForm({
      name: y.name ?? "",
      brand: y.brand ?? "",
      model: y.model ?? "",
      year_built: toStr(y.year_built),
      yacht_type: (y.yacht_type as YachtType | null) ?? null,
      length: lengthDisplay,
      cabins: toStr(y.cabins),
      guests: toStr(y.guests),
      crew: toStr(y.crew),
      engine_hours: toStr(y.engine_hours),
      marina_location: y.marina_location ?? "",
      flag: y.flag ?? "",
      commercial_registration: Boolean(y.commercial_registration),
      purchase_price_eur: toStr(y.purchase_price_eur),
      purchase_year: toStr(y.purchase_year),
      crew_breakdown: hydrateCrew(y.crew_breakdown, y.monthly_crew_eur),
      monthly_mooring_eur: toStr(y.monthly_mooring_eur),
      monthly_fuel_eur: toStr(y.monthly_fuel_eur),
      monthly_provisioning_eur: toStr(y.monthly_provisioning_eur),
      monthly_communications_eur: toStr(y.monthly_communications_eur),
      monthly_maintenance_eur: toStr(y.monthly_maintenance_eur),
      monthly_management_fee_eur: toStr(y.monthly_management_fee_eur),
      monthly_misc_eur: toStr(y.monthly_misc_eur),
      annual_insurance_eur: toStr(y.annual_insurance_eur),
      annual_registration_eur: toStr(y.annual_registration_eur),
      annual_classification_eur: toStr(y.annual_classification_eur),
      annual_antifouling_eur: toStr(y.annual_antifouling_eur),
      annual_refit_reserve_eur: toStr(y.annual_refit_reserve_eur),
      charter_commission_pct: toStr(y.charter_commission_pct),
      financing_type: (y.financing_type as FinancingType | null) ?? null,
      loan_amount_eur: toStr(y.loan_amount_eur),
      loan_rate_pct: toStr(y.loan_rate_pct),
      loan_term_years: toStr(y.loan_term_years),
    });
  }, [editId, getYacht.data, formUnits]);

  const update = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const lengthUnitLabel = formUnits === "imperial" ? "ft" : "m";

  // ── Validation ────────────────────────────────────────────────────────
  const errors = useMemo(() => {
    const e: Partial<Record<keyof FormState, string>> = {};
    // Step 0
    if (!form.yacht_type) e.yacht_type = "Pick a type";
    if (!form.name && !(form.brand && form.model)) {
      e.name = "Add a name or brand+model";
    }
    if (form.length) {
      if (!DEC_RE.test(form.length)) e.length = "Invalid length";
      else {
        const n = parseNum(form.length)!;
        const maxMeters = 200;
        const maxDisplay = formUnits === "imperial" ? maxMeters * M_TO_FT : maxMeters;
        if (n <= 0 || n > maxDisplay) e.length = `1–${Math.round(maxDisplay)} ${lengthUnitLabel}`;
      }
    } else {
      e.length = "Required";
    }
    if (form.year_built) {
      if (!INT_RE.test(form.year_built)) e.year_built = "Invalid year";
      else {
        const y = parseInt(form.year_built, 10);
        if (y < 1900 || y > 2100) e.year_built = "1900–2100";
      }
    }
    for (const k of ["cabins", "guests", "crew"] as const) {
      if (form[k] && !INT_RE.test(form[k])) e[k] = "Whole number";
    }
    // Step 1
    if (form.engine_hours && !INT_RE.test(form.engine_hours))
      e.engine_hours = "Whole number";
    if (form.purchase_year) {
      if (!INT_RE.test(form.purchase_year)) e.purchase_year = "Invalid year";
      else {
        const y = parseInt(form.purchase_year, 10);
        if (y < 1900 || y > 2100) e.purchase_year = "1900–2100";
      }
    }
    if (form.purchase_price_eur && !DEC_RE.test(form.purchase_price_eur))
      e.purchase_price_eur = "Invalid amount";
    // Step 2 — expenses (all optional, just numeric sanity)
    const expenseKeys: ExpenseKey[] = [
      ...MONTHLY_FIELDS.map((f) => f.key),
      ...ANNUAL_FIELDS.map((f) => f.key),
      "charter_commission_pct",
    ];
    for (const k of expenseKeys) {
      const v = form[k as keyof FormState] as string;
      if (v && !DEC_RE.test(v)) e[k as keyof FormState] = "Invalid amount";
    }
    // Crew rows: any populated salary must be a valid number
    for (const r of form.crew_breakdown) {
      if (r.monthly_salary_eur && !DEC_RE.test(r.monthly_salary_eur)) {
        e.crew_breakdown = "Some crew salaries are invalid";
        break;
      }
    }
    if (form.charter_commission_pct) {
      const n = parseNum(form.charter_commission_pct);
      if (n != null && (n < 0 || n > 100)) e.charter_commission_pct = "0–100 %";
    }
    // Step 3 — financing
    if (form.financing_type === "loan") {
      if (form.loan_amount_eur && !DEC_RE.test(form.loan_amount_eur))
        e.loan_amount_eur = "Invalid amount";
      if (form.loan_rate_pct && !DEC_RE.test(form.loan_rate_pct))
        e.loan_rate_pct = "Invalid rate";
      if (form.loan_term_years && !INT_RE.test(form.loan_term_years))
        e.loan_term_years = "Whole number";
    }
    return e;
  }, [form, formUnits, lengthUnitLabel]);

  const stepErrors = useMemo(() => {
    const step0Keys: (keyof FormState)[] = [
      "yacht_type",
      "name",
      "length",
      "year_built",
      "cabins",
      "guests",
      "crew",
    ];
    const step1Keys: (keyof FormState)[] = [
      "engine_hours",
      "purchase_year",
      "purchase_price_eur",
    ];
    const step2Keys: (keyof FormState)[] = [
      ...MONTHLY_FIELDS.map((f) => f.key),
      ...ANNUAL_FIELDS.map((f) => f.key),
      "charter_commission_pct",
      "crew_breakdown",
    ];
    const step3Keys: (keyof FormState)[] = [
      "loan_amount_eur",
      "loan_rate_pct",
      "loan_term_years",
    ];
    return [step0Keys, step1Keys, step2Keys, step3Keys].map((keys) =>
      keys.some((k) => errors[k]),
    );
  }, [errors]);

  const totalSteps = STEP_TITLES.length;
  const isLast = step === totalSteps - 1;

  const goNext = () => {
    if (stepErrors[step]) {
      setShowErrors(true);
      return;
    }
    setShowErrors(false);
    if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
    if (isLast) {
      submit();
    } else {
      setStep((s) => s + 1);
    }
  };

  const goBack = () => {
    setShowErrors(false);
    if (step === 0) {
      router.back();
    } else {
      setStep((s) => s - 1);
    }
  };

  const submit = async () => {
    if (stepErrors.some(Boolean)) {
      setShowErrors(true);
      return;
    }
    const lengthVal = parseNum(form.length);
    const lengthMeters =
      lengthVal != null
        ? formUnits === "imperial"
          ? lengthVal / M_TO_FT
          : lengthVal
        : null;

    const numOrNull = (v: string) => (v ? parseNum(v) : null);
    const intOrNull = (v: string) => (v ? parseInt10(v) : null);

    const payload = {
      name: form.name || null,
      brand: form.brand || null,
      model: form.model || null,
      year_built: form.year_built ? parseInt(form.year_built, 10) : null,
      yacht_type: form.yacht_type,
      length_meters: lengthMeters,
      cabins: intOrNull(form.cabins),
      guests: intOrNull(form.guests),
      crew: intOrNull(form.crew),
      engine_hours: intOrNull(form.engine_hours),
      marina_location: form.marina_location || null,
      flag: form.flag || null,
      commercial_registration: form.commercial_registration,
      purchase_price_eur: numOrNull(form.purchase_price_eur),
      purchase_year: form.purchase_year ? parseInt(form.purchase_year, 10) : null,
      // crew breakdown — strip empty rows, also derive monthly_crew_eur total
      crew_breakdown: (() => {
        const rows = form.crew_breakdown
          .map((r) => {
            const s = parseFloat(r.monthly_salary_eur.replace(",", "."));
            if (!isFinite(s) || s <= 0) return null;
            return {
              role: r.role,
              monthly_salary_eur: s,
              months_per_year: r.months_per_year,
            };
          })
          .filter((r) => r !== null);
        return rows.length > 0 ? rows : null;
      })(),
      // expenses
      monthly_crew_eur: (() => {
        const total = computeCrewMonthlyTotal(form.crew_breakdown);
        return total > 0 ? total : null;
      })(),
      monthly_mooring_eur: numOrNull(form.monthly_mooring_eur),
      monthly_fuel_eur: numOrNull(form.monthly_fuel_eur),
      monthly_provisioning_eur: numOrNull(form.monthly_provisioning_eur),
      monthly_communications_eur: numOrNull(form.monthly_communications_eur),
      monthly_maintenance_eur: numOrNull(form.monthly_maintenance_eur),
      monthly_management_fee_eur: numOrNull(form.monthly_management_fee_eur),
      monthly_misc_eur: numOrNull(form.monthly_misc_eur),
      annual_insurance_eur: numOrNull(form.annual_insurance_eur),
      annual_registration_eur: numOrNull(form.annual_registration_eur),
      annual_classification_eur: numOrNull(form.annual_classification_eur),
      annual_antifouling_eur: numOrNull(form.annual_antifouling_eur),
      annual_refit_reserve_eur: numOrNull(form.annual_refit_reserve_eur),
      charter_commission_pct: numOrNull(form.charter_commission_pct),
      // financing
      financing_type: form.financing_type,
      loan_amount_eur:
        form.financing_type === "loan" ? numOrNull(form.loan_amount_eur) : null,
      loan_rate_pct:
        form.financing_type === "loan" ? numOrNull(form.loan_rate_pct) : null,
      loan_term_years:
        form.financing_type === "loan" ? intOrNull(form.loan_term_years) : null,
    };

    try {
      if (editId) {
        await updateMut.mutateAsync({ id: editId, data: payload as never });
        qc.invalidateQueries({ queryKey: getGetYachtQueryKey(editId) });
      } else {
        await createMut.mutateAsync({ data: payload as never });
      }
      qc.invalidateQueries({ queryKey: getListYachtsQueryKey() });
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      router.back();
    } catch {
      // mutation error already surfaces below
    }
  };

  const mutationError =
    createMut.error instanceof Error
      ? createMut.error.message
      : updateMut.error instanceof Error
      ? updateMut.error.message
      : null;
  const isSubmitting = createMut.isPending || updateMut.isPending;

  if (isLoaded && !isSignedIn) {
    return (
      <View style={[styles.root, { paddingTop: insets.top + 72 }]}>
        <TopBar onBack={() => router.back()} title="Yacht profile" />
        <View style={styles.empty}>
          <Feather name="lock" size={26} color={GOLD} />
          <Text style={styles.emptyTitle}>Sign in required</Text>
          <Pressable
            onPress={() => router.replace("/(auth)/sign-in")}
            style={({ pressed }) => [styles.primaryBtn, { opacity: pressed ? 0.85 : 1, marginTop: 18 }]}
          >
            <Text style={styles.primaryBtnText}>Sign in</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (editId && getYacht.isLoading) {
    return (
      <View style={[styles.root, { paddingTop: insets.top + 72 }]}>
        <TopBar onBack={() => router.back()} title="Edit yacht" />
        <View style={styles.empty}>
          <ActivityIndicator color={GOLD} />
        </View>
      </View>
    );
  }

  if (editId && (getYacht.isError || (!getYacht.isLoading && !getYacht.data))) {
    return (
      <View style={[styles.root, { paddingTop: insets.top + 72 }]}>
        <TopBar onBack={() => router.back()} title="Edit yacht" />
        <View style={styles.empty}>
          <Feather name="alert-circle" size={26} color={GOLD} />
          <Text style={styles.emptyTitle}>Yacht not found</Text>
          <Text style={[styles.fieldHint, { textAlign: "center", marginTop: 6 }]}>
            This profile no longer exists or you don't have access to it.
          </Text>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [styles.primaryBtn, { opacity: pressed ? 0.85 : 1, marginTop: 20, paddingHorizontal: 32 }]}
          >
            <Text style={styles.primaryBtnText}>Back</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={{ flex: 1, backgroundColor: NAVY }}
    >
      <View style={[styles.root, { paddingTop: insets.top + 64 }]}>
        <TopBar
          onBack={goBack}
          title={editId ? "Edit yacht" : "New yacht profile"}
        />

        <View style={styles.stepRow}>
          {STEP_TITLES.map((t, i) => (
            <View key={t} style={styles.stepItem}>
              <View
                style={[
                  styles.stepDot,
                  i === step
                    ? styles.stepDotActive
                    : i < step
                    ? styles.stepDotDone
                    : null,
                ]}
              >
                <Text
                  style={[
                    styles.stepDotText,
                    (i === step || i < step) && { color: NAVY },
                  ]}
                >
                  {i + 1}
                </Text>
              </View>
              <Text
                style={[styles.stepLabel, i === step && styles.stepLabelActive]}
                numberOfLines={1}
              >
                {t}
              </Text>
            </View>
          ))}
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingHorizontal: 24,
            paddingBottom: 180,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {step === 0 ? (
            <BasicsStep
              form={form}
              update={update}
              errors={showErrors ? errors : {}}
              lengthUnitLabel={lengthUnitLabel}
            />
          ) : step === 1 ? (
            <OperationsStep
              form={form}
              update={update}
              errors={showErrors ? errors : {}}
            />
          ) : step === 2 ? (
            <ExpensesStep
              form={form}
              update={update}
              errors={showErrors ? errors : {}}
            />
          ) : (
            <FinancingStep
              form={form}
              update={update}
              errors={showErrors ? errors : {}}
            />
          )}

          {mutationError ? (
            <Text style={styles.errorBanner}>{mutationError}</Text>
          ) : null}
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
          <Pressable
            onPress={goNext}
            disabled={isSubmitting}
            style={({ pressed }) => [
              styles.primaryBtn,
              { opacity: isSubmitting ? 0.6 : pressed ? 0.85 : 1 },
            ]}
          >
            {isSubmitting ? (
              <ActivityIndicator color={GOLD} />
            ) : (
              <Text style={styles.primaryBtnText}>
                {isLast ? (editId ? "Save changes" : "Create profile") : "Continue"}
              </Text>
            )}
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

// ── Subcomponents ─────────────────────────────────────────────────────────

function TopBar({ onBack, title }: { onBack: () => void; title: string }) {
  return (
    <View style={styles.topBar}>
      <Pressable onPress={onBack} hitSlop={12} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
        <Feather name="chevron-left" size={26} color={GOLD} />
      </Pressable>
      <Text style={styles.topBarTitle}>{title}</Text>
      <View style={{ width: 26 }} />
    </View>
  );
}

interface StepProps {
  form: FormState;
  update: <K extends keyof FormState>(k: K, v: FormState[K]) => void;
  errors: Partial<Record<keyof FormState, string>>;
}

function BasicsStep({
  form,
  update,
  errors,
  lengthUnitLabel,
}: StepProps & { lengthUnitLabel: string }) {
  return (
    <View>
      <Field label="Yacht type" error={errors.yacht_type}>
        <View style={styles.pillRow}>
          {TYPE_OPTIONS.map((t) => {
            const active = form.yacht_type === t.value;
            return (
              <Pressable
                key={t.value}
                onPress={() => update("yacht_type", t.value)}
                style={[styles.pill, active && styles.pillActive]}
              >
                <Text style={[styles.pillText, active && styles.pillTextActive]}>
                  {t.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </Field>

      <Field label="Yacht name" error={errors.name} hint="Or fill brand + model below">
        <Input value={form.name} onChangeText={(v) => update("name", v)} placeholder="e.g. Sea Breeze" />
      </Field>

      <Row>
        <Field label="Brand" flex>
          <Input value={form.brand} onChangeText={(v) => update("brand", v)} placeholder="Ferretti" />
        </Field>
        <Field label="Model" flex>
          <Input value={form.model} onChangeText={(v) => update("model", v)} placeholder="920" />
        </Field>
      </Row>

      <Row>
        <Field label={`Length (${lengthUnitLabel})`} error={errors.length} flex>
          <Input
            value={form.length}
            onChangeText={(v) => update("length", v)}
            placeholder="22"
            keyboardType="decimal-pad"
          />
        </Field>
        <Field label="Year built" error={errors.year_built} flex>
          <Input
            value={form.year_built}
            onChangeText={(v) => update("year_built", v)}
            placeholder="2018"
            keyboardType="number-pad"
            maxLength={4}
          />
        </Field>
      </Row>

      <Row>
        <Field label="Cabins" error={errors.cabins} flex>
          <Input
            value={form.cabins}
            onChangeText={(v) => update("cabins", v)}
            placeholder="4"
            keyboardType="number-pad"
          />
        </Field>
        <Field label="Guests" error={errors.guests} flex>
          <Input
            value={form.guests}
            onChangeText={(v) => update("guests", v)}
            placeholder="8"
            keyboardType="number-pad"
          />
        </Field>
        <Field label="Crew" error={errors.crew} flex>
          <Input
            value={form.crew}
            onChangeText={(v) => update("crew", v)}
            placeholder="3"
            keyboardType="number-pad"
          />
        </Field>
      </Row>
    </View>
  );
}

function OperationsStep({ form, update, errors }: StepProps) {
  return (
    <View>
      <Field label="Marina / home port">
        <Input
          value={form.marina_location}
          onChangeText={(v) => update("marina_location", v)}
          placeholder="Antibes, France"
        />
      </Field>

      <Row>
        <Field label="Flag" flex>
          <Input
            value={form.flag}
            onChangeText={(v) => update("flag", v)}
            placeholder="Malta"
          />
        </Field>
        <Field label="Engine hours" error={errors.engine_hours} flex>
          <Input
            value={form.engine_hours}
            onChangeText={(v) => update("engine_hours", v)}
            placeholder="1200"
            keyboardType="number-pad"
          />
        </Field>
      </Row>

      <Field label="Commercial registration">
        <View style={styles.pillRow}>
          {[
            { v: true, l: "Yes" },
            { v: false, l: "No" },
          ].map((opt) => {
            const active = form.commercial_registration === opt.v;
            return (
              <Pressable
                key={String(opt.v)}
                onPress={() => update("commercial_registration", opt.v)}
                style={[styles.pill, active && styles.pillActive]}
              >
                <Text style={[styles.pillText, active && styles.pillTextActive]}>
                  {opt.l}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </Field>

      <Row>
        <Field label="Purchase price (€)" error={errors.purchase_price_eur} flex>
          <Input
            value={form.purchase_price_eur}
            onChangeText={(v) => update("purchase_price_eur", v)}
            placeholder="1200000"
            keyboardType="decimal-pad"
          />
        </Field>
        <Field label="Purchase year" error={errors.purchase_year} flex>
          <Input
            value={form.purchase_year}
            onChangeText={(v) => update("purchase_year", v)}
            placeholder="2020"
            keyboardType="number-pad"
            maxLength={4}
          />
        </Field>
      </Row>
    </View>
  );
}

function ExpensesStep({ form, update, errors }: StepProps) {
  const setCrew = (idx: number, patch: Partial<CrewRow>) => {
    const next = form.crew_breakdown.map((r, i) =>
      i === idx ? { ...r, ...patch } : r,
    );
    update("crew_breakdown", next);
  };

  const crewTotal = computeCrewMonthlyTotal(form.crew_breakdown);

  return (
    <View>
      <Text style={styles.sectionLead}>
        Fill in only what you know. Empty fields will fall back to regional averages.
      </Text>

      <SectionLabel text="CREW · BY POSITION" />
      {form.crew_breakdown.map((row, i) => (
        <CrewRowEditor
          key={`${row.role}-${i}`}
          row={row}
          onSalary={(v) => setCrew(i, { monthly_salary_eur: v })}
          onMonths={(m) => setCrew(i, { months_per_year: m })}
        />
      ))}
      {errors.crew_breakdown ? (
        <Text style={styles.fieldError}>{errors.crew_breakdown}</Text>
      ) : null}
      <View style={styles.crewTotalRow}>
        <Text style={styles.crewTotalLabel}>Total crew cost</Text>
        <Text style={styles.crewTotalValue}>
          {crewTotal > 0 ? `€ ${crewTotal.toLocaleString("en-US")} / mo` : "—"}
        </Text>
      </View>
      <Text style={styles.fieldHint}>
        Months/year covers seasonal crew (e.g. summer-only deckhand). Total feeds the ROI engine.
      </Text>

      <SectionLabel text="MONTHLY · € PER MONTH" />
      {MONTHLY_FIELDS.map((f) => (
        <Field
          key={f.key}
          label={f.label}
          hint={f.hint}
          error={errors[f.key as keyof FormState]}
        >
          <MoneyInput
            value={form[f.key] as string}
            onChangeText={(v) => update(f.key as keyof FormState, v as never)}
            suffix="€ / mo"
          />
        </Field>
      ))}

      <SectionLabel text="ANNUAL · € PER YEAR" />
      {ANNUAL_FIELDS.map((f) => (
        <Field
          key={f.key}
          label={f.label}
          hint={f.hint}
          error={errors[f.key as keyof FormState]}
        >
          <MoneyInput
            value={form[f.key] as string}
            onChangeText={(v) => update(f.key as keyof FormState, v as never)}
            suffix="€ / yr"
          />
        </Field>
      ))}

      <SectionLabel text="CHARTER" />
      <Field
        label="Broker commission"
        hint="% of gross charter revenue paid to your broker"
        error={errors.charter_commission_pct}
      >
        <MoneyInput
          value={form.charter_commission_pct}
          onChangeText={(v) => update("charter_commission_pct", v)}
          suffix="%"
          placeholder="15"
        />
      </Field>
    </View>
  );
}

function FinancingStep({ form, update, errors }: StepProps) {
  const isLoan = form.financing_type === "loan";
  return (
    <View>
      <Field label="Financing">
        <View style={styles.pillRow}>
          {[
            { v: "cash" as const, l: "Cash purchase" },
            { v: "loan" as const, l: "Loan / financing" },
          ].map((opt) => {
            const active = form.financing_type === opt.v;
            return (
              <Pressable
                key={opt.v}
                onPress={() => update("financing_type", opt.v)}
                style={[styles.pill, active && styles.pillActive]}
              >
                <Text style={[styles.pillText, active && styles.pillTextActive]}>
                  {opt.l}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </Field>

      {isLoan ? (
        <>
          <Field label="Loan amount (€)" error={errors.loan_amount_eur}>
            <Input
              value={form.loan_amount_eur}
              onChangeText={(v) => update("loan_amount_eur", v)}
              placeholder="800000"
              keyboardType="decimal-pad"
            />
          </Field>
          <Row>
            <Field label="Interest rate (%)" error={errors.loan_rate_pct} flex>
              <Input
                value={form.loan_rate_pct}
                onChangeText={(v) => update("loan_rate_pct", v)}
                placeholder="5.5"
                keyboardType="decimal-pad"
              />
            </Field>
            <Field label="Term (years)" error={errors.loan_term_years} flex>
              <Input
                value={form.loan_term_years}
                onChangeText={(v) => update("loan_term_years", v)}
                placeholder="10"
                keyboardType="number-pad"
              />
            </Field>
          </Row>
        </>
      ) : (
        <Text style={styles.hint}>
          Loan details only affect the ROI calculation; you can change financing later.
        </Text>
      )}
    </View>
  );
}

function SectionLabel({ text }: { text: string }) {
  return <Text style={styles.sectionLabel}>{text}</Text>;
}

function CrewRowEditor({
  row,
  onSalary,
  onMonths,
}: {
  row: CrewRow;
  onSalary: (v: string) => void;
  onMonths: (n: number) => void;
}) {
  const dec = () => {
    const next = Math.max(1, row.months_per_year - 1);
    if (next !== row.months_per_year) {
      onMonths(next);
      if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
    }
  };
  const inc = () => {
    const next = Math.min(12, row.months_per_year + 1);
    if (next !== row.months_per_year) {
      onMonths(next);
      if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
    }
  };
  return (
    <View style={styles.crewRow}>
      <Text style={styles.crewRole}>{row.role}</Text>
      <View style={styles.crewControls}>
        <View style={styles.crewSalaryWrap}>
          <TextInput
            value={row.monthly_salary_eur}
            onChangeText={onSalary}
            placeholder="0"
            placeholderTextColor={MUTED}
            keyboardType="decimal-pad"
            style={styles.crewSalaryInput}
          />
          <Text style={styles.crewSalarySuffix}>€ / mo</Text>
        </View>
        <View style={styles.crewStepper}>
          <Pressable
            onPress={dec}
            hitSlop={6}
            style={({ pressed }) => [
              styles.crewStepBtn,
              { opacity: pressed ? 0.6 : 1 },
            ]}
          >
            <Feather name="minus" size={14} color={GOLD} />
          </Pressable>
          <View style={styles.crewMonthsBox}>
            <Text style={styles.crewMonthsValue}>{row.months_per_year}</Text>
            <Text style={styles.crewMonthsLabel}>mo / yr</Text>
          </View>
          <Pressable
            onPress={inc}
            hitSlop={6}
            style={({ pressed }) => [
              styles.crewStepBtn,
              { opacity: pressed ? 0.6 : 1 },
            ]}
          >
            <Feather name="plus" size={14} color={GOLD} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function MoneyInput({
  value,
  onChangeText,
  suffix,
  placeholder,
}: {
  value: string;
  onChangeText: (v: string) => void;
  suffix: string;
  placeholder?: string;
}) {
  return (
    <View style={styles.moneyWrap}>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder ?? "0"}
        placeholderTextColor={MUTED}
        keyboardType="decimal-pad"
        style={styles.moneyInput}
      />
      <Text style={styles.moneySuffix}>{suffix}</Text>
    </View>
  );
}

function Field({
  label,
  error,
  hint,
  children,
  flex,
}: {
  label: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
  flex?: boolean;
}) {
  return (
    <View style={[styles.field, flex ? { flex: 1 } : null]}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
      {error ? <Text style={styles.fieldError}>{error}</Text> : hint ? (
        <Text style={styles.fieldHint}>{hint}</Text>
      ) : null}
    </View>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <View style={styles.row}>{children}</View>;
}

function Input(props: React.ComponentProps<typeof TextInput>) {
  return (
    <TextInput
      {...props}
      placeholderTextColor={MUTED}
      style={[styles.input, props.style]}
    />
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: NAVY },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    marginBottom: 18,
  },
  topBarTitle: {
    color: IVORY,
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
    letterSpacing: 0.2,
  },
  stepRow: {
    flexDirection: "row",
    paddingHorizontal: 24,
    marginBottom: 24,
    gap: 8,
  },
  stepItem: { flex: 1, alignItems: "center" },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: NAVY_ELEV,
    borderColor: DIVIDER,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  stepDotActive: { backgroundColor: GOLD, borderColor: GOLD },
  stepDotDone: { backgroundColor: GOLD, borderColor: GOLD },
  stepDotText: {
    color: MUTED,
    fontFamily: "Inter_700Bold",
    fontSize: 12,
  },
  stepLabel: {
    color: MUTED,
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    letterSpacing: 0.4,
  },
  stepLabelActive: { color: IVORY },
  field: { marginBottom: 18 },
  fieldLabel: {
    color: MUTED,
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  fieldError: { color: ERROR, fontFamily: "Inter_500Medium", fontSize: 11, marginTop: 6 },
  fieldHint: { color: MUTED, fontFamily: "Inter_400Regular", fontSize: 11, marginTop: 6 },
  input: {
    backgroundColor: NAVY_DEEP,
    borderColor: DIVIDER,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: IVORY,
    fontFamily: "Inter_500Medium",
    fontSize: 15,
  },
  row: { flexDirection: "row", gap: 10 },
  pillRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    borderColor: DIVIDER,
    borderWidth: 1,
    backgroundColor: NAVY_DEEP,
  },
  pillActive: {
    backgroundColor: "rgba(201,169,97,0.12)",
    borderColor: GOLD,
    borderWidth: 1.5,
  },
  pillText: { color: IVORY, fontFamily: "Inter_500Medium", fontSize: 13 },
  pillTextActive: { color: GOLD, fontFamily: "Inter_700Bold" },
  hint: { color: MUTED, fontFamily: "Inter_400Regular", fontSize: 12, lineHeight: 18 },
  // Crew breakdown
  crewRow: {
    paddingVertical: 12,
    borderBottomColor: DIVIDER,
    borderBottomWidth: 1,
  },
  crewRole: {
    color: IVORY,
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    marginBottom: 8,
  },
  crewControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  crewSalaryWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: NAVY_DEEP,
    borderColor: DIVIDER,
    borderWidth: 1,
    borderRadius: 10,
    paddingRight: 12,
  },
  crewSalaryInput: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: IVORY,
    fontFamily: "Inter_500Medium",
    fontSize: 14,
  },
  crewSalarySuffix: {
    color: MUTED,
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    letterSpacing: 0.4,
  },
  crewStepper: {
    flexDirection: "row",
    alignItems: "center",
    borderColor: DIVIDER,
    borderWidth: 1,
    borderRadius: 10,
    backgroundColor: NAVY_DEEP,
    paddingHorizontal: 4,
  },
  crewStepBtn: {
    width: 28,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  crewMonthsBox: {
    paddingHorizontal: 6,
    alignItems: "center",
    minWidth: 38,
  },
  crewMonthsValue: {
    color: IVORY,
    fontFamily: "Inter_700Bold",
    fontSize: 14,
    lineHeight: 16,
  },
  crewMonthsLabel: {
    color: MUTED,
    fontFamily: "Inter_500Medium",
    fontSize: 9,
    letterSpacing: 0.4,
    marginTop: 1,
  },
  crewTotalRow: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: "rgba(201,169,97,0.06)",
    borderColor: "rgba(201,169,97,0.25)",
    borderWidth: 1,
    borderRadius: 10,
  },
  crewTotalLabel: {
    color: MUTED,
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    letterSpacing: 1.1,
    textTransform: "uppercase",
  },
  crewTotalValue: {
    color: GOLD,
    fontFamily: "Inter_700Bold",
    fontSize: 14,
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 12,
    borderTopColor: DIVIDER,
    borderTopWidth: 1,
    backgroundColor: NAVY,
  },
  primaryBtn: {
    backgroundColor: "rgba(201,169,97,0.10)",
    borderWidth: 1.5,
    borderColor: GOLD,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  primaryBtnText: { color: GOLD, fontFamily: "Inter_700Bold", fontSize: 15 },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24 },
  emptyTitle: { color: IVORY, fontFamily: "Gilroy-Regular", fontSize: 20, marginTop: 14 },
  errorBanner: {
    color: ERROR,
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    textAlign: "center",
    marginTop: 14,
    paddingHorizontal: 12,
  },
  sectionLead: {
    color: MUTED,
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 18,
  },
  sectionLabel: {
    color: GOLD,
    fontFamily: "Inter_700Bold",
    fontSize: 11,
    letterSpacing: 1.6,
    marginTop: 6,
    marginBottom: 12,
  },
  moneyWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: NAVY_DEEP,
    borderColor: DIVIDER,
    borderWidth: 1,
    borderRadius: 10,
    paddingRight: 12,
  },
  moneyInput: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: IVORY,
    fontFamily: "Inter_500Medium",
    fontSize: 15,
  },
  moneySuffix: {
    color: MUTED,
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    letterSpacing: 0.5,
  },
});
