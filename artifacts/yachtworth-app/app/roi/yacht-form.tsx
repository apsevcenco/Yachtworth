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

const STEP_TITLES = ["Basics", "Operations", "Financing"];

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
  financing_type: null,
  loan_amount_eur: "",
  loan_rate_pct: "",
  loan_term_years: "",
};

function parseNum(v: string): number | null {
  const n = parseFloat(v.replace(",", "."));
  return isFinite(n) ? n : null;
}

function parseInt10(v: string): number | null {
  const n = parseInt(v.replace(/[^0-9]/g, ""), 10);
  return isFinite(n) ? n : null;
}

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
  // Lock units to whatever they were when the form mounted / prefilled, so
  // a mid-edit global units toggle can NEVER reinterpret a typed value.
  // The header pill / Settings still flip the GLOBAL units; the form just
  // keeps its own snapshot for the lifetime of this screen.
  const [formUnits, setFormUnits] = useState<"metric" | "imperial">(units);
  const formUnitsLockedRef = useRef(false);
  useEffect(() => {
    if (!formUnitsLockedRef.current) {
      formUnitsLockedRef.current = true;
      setFormUnits(units);
    }
  }, [units]);

  // Prefill on edit — re-prefills when editId changes, not a one-shot.
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
      year_built: y.year_built != null ? String(y.year_built) : "",
      yacht_type: (y.yacht_type as YachtType | null) ?? null,
      length: lengthDisplay,
      cabins: y.cabins != null ? String(y.cabins) : "",
      guests: y.guests != null ? String(y.guests) : "",
      crew: y.crew != null ? String(y.crew) : "",
      engine_hours: y.engine_hours != null ? String(y.engine_hours) : "",
      marina_location: y.marina_location ?? "",
      flag: y.flag ?? "",
      commercial_registration: Boolean(y.commercial_registration),
      purchase_price_eur:
        y.purchase_price_eur != null ? String(y.purchase_price_eur) : "",
      purchase_year: y.purchase_year != null ? String(y.purchase_year) : "",
      financing_type: (y.financing_type as FinancingType | null) ?? null,
      loan_amount_eur:
        y.loan_amount_eur != null ? String(y.loan_amount_eur) : "",
      loan_rate_pct: y.loan_rate_pct != null ? String(y.loan_rate_pct) : "",
      loan_term_years:
        y.loan_term_years != null ? String(y.loan_term_years) : "",
    });
  }, [editId, getYacht.data, formUnits]);

  const update = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const lengthUnitLabel = formUnits === "imperial" ? "ft" : "m";

  // ── Per-step validation ────────────────────────────────────────────────
  const errors = useMemo(() => {
    const e: Partial<Record<keyof FormState, string>> = {};
    // Step 0
    if (!form.yacht_type) e.yacht_type = "Pick a type";
    if (!form.name && !(form.brand && form.model)) {
      // require either a custom name OR brand+model
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
    // Step 2
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
      "loan_amount_eur",
      "loan_rate_pct",
      "loan_term_years",
    ];
    return [step0Keys, step1Keys, step2Keys].map((keys) =>
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
    // Final guard
    if (stepErrors.some(Boolean)) {
      setShowErrors(true);
      return;
    }
    // Build payload — always send metric to API
    const lengthVal = parseNum(form.length);
    const lengthMeters =
      lengthVal != null
        ? formUnits === "imperial"
          ? lengthVal / M_TO_FT
          : lengthVal
        : null;

    const payload = {
      name: form.name || null,
      brand: form.brand || null,
      model: form.model || null,
      year_built: form.year_built ? parseInt(form.year_built, 10) : null,
      yacht_type: form.yacht_type,
      length_meters: lengthMeters,
      cabins: form.cabins ? parseInt10(form.cabins) : null,
      guests: form.guests ? parseInt10(form.guests) : null,
      crew: form.crew ? parseInt10(form.crew) : null,
      engine_hours: form.engine_hours ? parseInt10(form.engine_hours) : null,
      marina_location: form.marina_location || null,
      flag: form.flag || null,
      commercial_registration: form.commercial_registration,
      purchase_price_eur: form.purchase_price_eur
        ? parseNum(form.purchase_price_eur)
        : null,
      purchase_year: form.purchase_year
        ? parseInt(form.purchase_year, 10)
        : null,
      financing_type: form.financing_type,
      loan_amount_eur:
        form.financing_type === "loan" && form.loan_amount_eur
          ? parseNum(form.loan_amount_eur)
          : null,
      loan_rate_pct:
        form.financing_type === "loan" && form.loan_rate_pct
          ? parseNum(form.loan_rate_pct)
          : null,
      loan_term_years:
        form.financing_type === "loan" && form.loan_term_years
          ? parseInt10(form.loan_term_years)
          : null,
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

  // Auth gate — redirect to sign-in if not logged in
  if (isLoaded && !isSignedIn) {
    return (
      <View style={[styles.root, { paddingTop: insets.top + 24 }]}>
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
      <View style={[styles.root, { paddingTop: insets.top + 24 }]}>
        <TopBar onBack={() => router.back()} title="Edit yacht" />
        <View style={styles.empty}>
          <ActivityIndicator color={GOLD} />
        </View>
      </View>
    );
  }

  if (editId && (getYacht.isError || (!getYacht.isLoading && !getYacht.data))) {
    return (
      <View style={[styles.root, { paddingTop: insets.top + 24 }]}>
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
      <View style={[styles.root, { paddingTop: insets.top + 16 }]}>
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
              units={units}
              lengthUnitLabel={lengthUnitLabel}
            />
          ) : step === 1 ? (
            <OperationsStep
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
              <ActivityIndicator color={NAVY} />
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
  units: _units,
  lengthUnitLabel,
}: StepProps & { units: "metric" | "imperial"; lengthUnitLabel: string }) {
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
  pillActive: { backgroundColor: GOLD, borderColor: GOLD },
  pillText: { color: IVORY, fontFamily: "Inter_500Medium", fontSize: 13 },
  pillTextActive: { color: NAVY, fontFamily: "Inter_700Bold" },
  hint: { color: MUTED, fontFamily: "Inter_400Regular", fontSize: 12, lineHeight: 18 },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 12,
    borderTopColor: DIVIDER,
    borderTopWidth: 1,
    backgroundColor: NAVY,
  },
  primaryBtn: {
    backgroundColor: GOLD,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  primaryBtnText: { color: NAVY, fontFamily: "Inter_700Bold", fontSize: 15 },
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
});
