import { Feather } from "@expo/vector-icons";
import { useCalculateCostEstimate } from "@workspace/api-client-react";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useMemo, useRef, useState } from "react";
import {
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

type YachtClass = "motor_yacht" | "sailing_yacht" | "catamaran" | "superyacht";
type Region =
  | "mediterranean"
  | "northern_europe"
  | "caribbean"
  | "asia_pacific"
  | "middle_east"
  | "global";
type Usage = "private" | "mixed" | "charter_focused";
type FinType = "cash" | "loan";

const CLASS_OPTIONS: { value: YachtClass; label: string }[] = [
  { value: "motor_yacht", label: "Motor" },
  { value: "sailing_yacht", label: "Sailing" },
  { value: "catamaran", label: "Catamaran" },
  { value: "superyacht", label: "Superyacht" },
];

const REGION_OPTIONS: { value: Region; label: string }[] = [
  { value: "mediterranean", label: "Mediterranean" },
  { value: "northern_europe", label: "Northern Europe" },
  { value: "caribbean", label: "Caribbean" },
  { value: "asia_pacific", label: "Asia-Pacific" },
  { value: "middle_east", label: "Middle East" },
  { value: "global", label: "Global / Other" },
];

const USAGE_OPTIONS: { value: Usage; label: string; sub: string }[] = [
  { value: "private", label: "Private", sub: "Owner use only" },
  { value: "mixed", label: "Mixed", sub: "Some charter income" },
  { value: "charter_focused", label: "Charter", sub: "Primarily for charter" },
];

const STEP_TITLES = ["Basics", "Crew", "Expenses", "Financing"];

// Crew positions — only stewardess/deckhand can have quantity > 1
// (server enforces this; UI matches).
interface CrewDef {
  key: string;
  label: string;
  defaultSalary: number;
  allowQty: boolean;
  defaultEnabled: (lenM: number) => boolean;
}
const CREW: CrewDef[] = [
  { key: "captain", label: "Captain", defaultSalary: 4000, allowQty: false, defaultEnabled: (l) => l >= 15 },
  { key: "first_officer", label: "First Officer / Mate", defaultSalary: 3000, allowQty: false, defaultEnabled: () => false },
  { key: "chief_engineer", label: "Chief Engineer", defaultSalary: 3500, allowQty: false, defaultEnabled: () => false },
  { key: "chef", label: "Chef / Cook", defaultSalary: 2500, allowQty: false, defaultEnabled: () => false },
  { key: "stewardess", label: "Stewardess", defaultSalary: 2000, allowQty: true, defaultEnabled: () => false },
  { key: "deckhand", label: "Deckhand", defaultSalary: 1800, allowQty: true, defaultEnabled: () => false },
  { key: "bosun", label: "Bosun", defaultSalary: 2200, allowQty: false, defaultEnabled: () => false },
  { key: "security", label: "Security", defaultSalary: 2500, allowQty: false, defaultEnabled: () => false },
];

interface CrewRow {
  enabled: boolean;
  salary: string;
  qty: number;
  months: number; // only honored server-side for stewardess/deckhand
}

const MONTHLY_FIELDS = [
  { key: "mooring_eur", label: "Mooring / berth" },
  { key: "fuel_eur", label: "Fuel" },
  { key: "provisioning_eur", label: "Provisioning" },
  { key: "communications_eur", label: "Communications" },
  { key: "maintenance_eur", label: "Routine maintenance" },
] as const;

const ANNUAL_FIELDS = [
  { key: "insurance_eur", label: "Insurance (hull + P&I)" },
  { key: "registration_eur", label: "Registration / flag" },
  { key: "classification_eur", label: "Classification & survey" },
  { key: "antifouling_eur", label: "Antifouling & haul-out" },
  { key: "engine_service_eur", label: "Engine service" },
  { key: "generator_service_eur", label: "Generator service" },
  { key: "electronics_service_eur", label: "Electronics & navigation" },
  { key: "safety_equipment_eur", label: "Safety equipment certification" },
  { key: "tender_service_eur", label: "Tender & outboard service" },
  { key: "hull_paint_eur", label: "Hull paint / polish" },
  { key: "rigging_service_eur", label: "Rigging inspection" },
  { key: "watermaker_service_eur", label: "Watermaker service" },
  { key: "refit_reserve_eur", label: "Refit reserve" },
] as const;

type MonthlyKey = (typeof MONTHLY_FIELDS)[number]["key"];
type AnnualKey = (typeof ANNUAL_FIELDS)[number]["key"];

interface FormState {
  yacht_name: string;
  builder: string;
  model: string;
  yacht_class: YachtClass | null;
  length: string; // displayed in current units
  year_built: string;
  region: Region | null;
  usage_type: Usage | null;
  crew: Record<string, CrewRow>;
  monthly: Record<MonthlyKey, string>;
  annual: Record<AnnualKey, string>;
  broker_commission_pct: string;
  financing_type: FinType | null;
  loan_amount_eur: string;
  loan_rate_pct: string;
  loan_term_years: string;
}

const INITIAL_CREW: Record<string, CrewRow> = Object.fromEntries(
  CREW.map((c) => [c.key, { enabled: false, salary: "", qty: 1, months: 12 }]),
);

const INITIAL: FormState = {
  yacht_name: "",
  builder: "",
  model: "",
  yacht_class: null,
  length: "",
  year_built: "",
  region: null,
  usage_type: null,
  crew: INITIAL_CREW,
  monthly: {
    mooring_eur: "",
    fuel_eur: "",
    provisioning_eur: "",
    communications_eur: "",
    maintenance_eur: "",
  },
  annual: {
    engine_service_eur: "",
    generator_service_eur: "",
    electronics_service_eur: "",
    safety_equipment_eur: "",
    tender_service_eur: "",
    hull_paint_eur: "",
    rigging_service_eur: "",
    watermaker_service_eur: "",
    insurance_eur: "",
    registration_eur: "",
    classification_eur: "",
    antifouling_eur: "",
    refit_reserve_eur: "",
  },
  broker_commission_pct: "",
  financing_type: null,
  loan_amount_eur: "",
  loan_rate_pct: "",
  loan_term_years: "",
};

function parseNum(v: string): number | null {
  const n = parseFloat(v.replace(",", "."));
  return isFinite(n) ? n : null;
}

export default function CostNewScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { units, loaded: unitsLoaded } = useUnits();
  // Snapshot units once AsyncStorage has resolved so a persisted "imperial"
  // setting can't be missed (initial state is "metric"), and a mid-form
  // Settings toggle can't later re-interpret length as 3.28× the wrong unit.
  const formUnitsRef = useRef<"metric" | "imperial" | null>(null);
  if (formUnitsRef.current == null && unitsLoaded) {
    formUnitsRef.current = units;
  }
  const formUnits = formUnitsRef.current ?? "metric";
  const lengthUnitLabel = formUnits === "imperial" ? "ft" : "m";

  const [form, setForm] = useState<FormState>(INITIAL);
  const [step, setStep] = useState(0);
  const [showErrors, setShowErrors] = useState(false);

  const calcMut = useCalculateCostEstimate();

  // Auto-pre-fill crew defaults when length & class first picked.
  const preFilledRef = useRef(false);
  const lengthMeters = useMemo(() => {
    const n = parseNum(form.length);
    if (n == null) return null;
    return formUnits === "imperial" ? n / M_TO_FT : n;
  }, [form.length, formUnits]);

  React.useEffect(() => {
    if (preFilledRef.current) return;
    if (!form.yacht_class || lengthMeters == null) return;
    preFilledRef.current = true;
    setForm((f) => ({
      ...f,
      crew: Object.fromEntries(
        CREW.map((c) => {
          const cur = f.crew[c.key]!;
          // Only fill the captain on by default for boats ≥15m.
          const shouldEnable = c.defaultEnabled(lengthMeters);
          return [
            c.key,
            {
              enabled: cur.enabled || shouldEnable,
              salary: cur.salary || String(c.defaultSalary),
              qty: cur.qty,
              months: cur.months,
            },
          ];
        }),
      ),
    }));
  }, [form.yacht_class, lengthMeters]);

  const update = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  // ── Validation ────────────────────────────────────────────────────────
  const errors = useMemo(() => {
    const e: Record<string, string> = {};
    // Step 0 — Basics
    if (!form.yacht_class) e.yacht_class = "Pick a type";
    if (!form.region) e.region = "Pick a region";
    if (!form.usage_type) e.usage_type = "Pick usage";
    if (!form.length) e.length = "Required";
    else if (!DEC_RE.test(form.length)) e.length = "Invalid length";
    else {
      const n = parseNum(form.length)!;
      const maxM = 120;
      const minM = 5;
      const max = formUnits === "imperial" ? Math.round(maxM * M_TO_FT) : maxM;
      const min = formUnits === "imperial" ? Math.round(minM * M_TO_FT) : minM;
      if (n < min || n > max) e.length = `${min}–${max} ${lengthUnitLabel}`;
    }
    if (!form.year_built) e.year_built = "Required";
    else if (!INT_RE.test(form.year_built)) e.year_built = "Invalid year";
    else {
      const y = parseInt(form.year_built, 10);
      if (y < 1950 || y > 2026) e.year_built = "1950–2026";
    }
    // Step 1 — Crew: any enabled row needs a valid salary.
    for (const c of CREW) {
      const row = form.crew[c.key]!;
      if (!row.enabled) continue;
      if (!row.salary) e.crew = "Add salary for enabled positions";
      else if (!DEC_RE.test(row.salary)) e.crew = "Some crew salaries are invalid";
      else if (parseNum(row.salary)! <= 0) e.crew = "Salary must be > 0";
    }
    // Step 2 — Expenses (all optional, just sanity)
    for (const f of MONTHLY_FIELDS) {
      const v = form.monthly[f.key];
      if (v && !DEC_RE.test(v)) e[`m_${f.key}`] = "Invalid";
    }
    for (const f of ANNUAL_FIELDS) {
      const v = form.annual[f.key];
      if (v && !DEC_RE.test(v)) e[`a_${f.key}`] = "Invalid";
    }
    // Only validate broker commission when the field is actually visible,
    // i.e. for charter-relevant usage. Otherwise a stale invalid value left
    // over from a previous usage choice could silently block Continue on
    // Step 3 with no way for the user to see/fix it.
    const brokerVisible =
      form.usage_type === "mixed" || form.usage_type === "charter_focused";
    if (brokerVisible && form.broker_commission_pct) {
      if (!DEC_RE.test(form.broker_commission_pct)) e.broker = "Invalid";
      else {
        const n = parseNum(form.broker_commission_pct)!;
        if (n < 0 || n > 100) e.broker = "0–100 %";
      }
    }
    // Step 3 — Financing
    if (!form.financing_type) e.financing_type = "Pick one";
    if (form.financing_type === "loan") {
      if (!form.loan_amount_eur) e.loan_amount_eur = "Required";
      else if (!DEC_RE.test(form.loan_amount_eur)) e.loan_amount_eur = "Invalid";
      if (!form.loan_rate_pct) e.loan_rate_pct = "Required";
      else if (!DEC_RE.test(form.loan_rate_pct)) e.loan_rate_pct = "Invalid";
      else {
        const r = parseNum(form.loan_rate_pct)!;
        if (r < 0 || r > 30) e.loan_rate_pct = "0–30%";
      }
      if (!form.loan_term_years) e.loan_term_years = "Required";
      else if (!INT_RE.test(form.loan_term_years)) e.loan_term_years = "Whole number";
      else {
        const t = parseInt(form.loan_term_years, 10);
        if (t < 1 || t > 40) e.loan_term_years = "1–40";
      }
    }
    return e;
  }, [form, formUnits, lengthUnitLabel]);

  const stepHasError = useMemo(() => {
    return [
      ["yacht_class", "region", "usage_type", "length", "year_built"],
      ["crew"],
      [
        ...MONTHLY_FIELDS.map((f) => `m_${f.key}`),
        ...ANNUAL_FIELDS.map((f) => `a_${f.key}`),
        "broker",
      ],
      ["financing_type", "loan_amount_eur", "loan_rate_pct", "loan_term_years"],
    ].map((keys) => keys.some((k) => errors[k]));
  }, [errors]);

  const isLast = step === STEP_TITLES.length - 1;

  const goNext = () => {
    if (stepHasError[step]) {
      setShowErrors(true);
      return;
    }
    setShowErrors(false);
    if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
    if (isLast) submit();
    else setStep((s) => s + 1);
  };

  const goBack = () => {
    setShowErrors(false);
    if (step === 0) router.back();
    else setStep((s) => s - 1);
  };

  const submit = async () => {
    if (stepHasError.some(Boolean)) {
      setShowErrors(true);
      return;
    }
    if (lengthMeters == null) return;

    const num = (s: string): number | null => (s ? parseNum(s) : null);

    const payload = {
      yacht_name: form.yacht_name || null,
      builder: form.builder || null,
      model: form.model || null,
      yacht_class: form.yacht_class!,
      length_meters: lengthMeters,
      year_built: parseInt(form.year_built, 10),
      region: form.region!,
      usage_type: form.usage_type!,
      crew: CREW.map((c) => {
        const row = form.crew[c.key]!;
        return {
          position: c.key,
          enabled: row.enabled,
          monthly_salary_eur: row.enabled ? num(row.salary) : null,
          quantity: c.allowQty ? row.qty : 1,
          months_per_year: c.allowQty ? row.months : 12,
        };
      }),
      monthly_expenses: {
        mooring_eur: num(form.monthly.mooring_eur),
        fuel_eur: num(form.monthly.fuel_eur),
        provisioning_eur: num(form.monthly.provisioning_eur),
        communications_eur: num(form.monthly.communications_eur),
        maintenance_eur: num(form.monthly.maintenance_eur),
      },
      annual_expenses: {
        insurance_eur: num(form.annual.insurance_eur),
        registration_eur: num(form.annual.registration_eur),
        classification_eur: num(form.annual.classification_eur),
        antifouling_eur: num(form.annual.antifouling_eur),
        engine_service_eur: num(form.annual.engine_service_eur),
        generator_service_eur: num(form.annual.generator_service_eur),
        electronics_service_eur: num(form.annual.electronics_service_eur),
        safety_equipment_eur: num(form.annual.safety_equipment_eur),
        tender_service_eur: num(form.annual.tender_service_eur),
        hull_paint_eur: num(form.annual.hull_paint_eur),
        rigging_service_eur: num(form.annual.rigging_service_eur),
        watermaker_service_eur: num(form.annual.watermaker_service_eur),
        refit_reserve_eur: num(form.annual.refit_reserve_eur),
      },
      broker_commission_pct: num(form.broker_commission_pct),
      financing: {
        type: form.financing_type!,
        loan_amount_eur:
          form.financing_type === "loan" ? num(form.loan_amount_eur) : null,
        interest_rate_pct:
          form.financing_type === "loan" ? num(form.loan_rate_pct) : null,
        term_years:
          form.financing_type === "loan"
            ? parseInt(form.loan_term_years || "0", 10) || null
            : null,
      },
    };

    try {
      const resp = await calcMut.mutateAsync({ data: payload as never });
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      }
      router.replace({
        pathname: "/cost/result",
        params: { data: JSON.stringify(resp) },
      });
    } catch {
      // error surface below
    }
  };

  const mutationError =
    calcMut.error instanceof Error ? calcMut.error.message : null;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={{ flex: 1, backgroundColor: NAVY }}
    >
      <View style={[styles.root, { paddingTop: insets.top + 16 }]}>
        <TopBar onBack={goBack} title="Annual cost estimate" />

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
          contentContainerStyle={{
            paddingHorizontal: 24,
            paddingBottom: 24,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {step === 0 && (
            <Step1Basics
              form={form}
              update={update}
              errors={showErrors ? errors : {}}
              lengthUnitLabel={lengthUnitLabel}
            />
          )}
          {step === 1 && (
            <Step2Crew form={form} setForm={setForm} errors={showErrors ? errors : {}} />
          )}
          {step === 2 && (
            <Step3Expenses
              form={form}
              setForm={setForm}
              errors={showErrors ? errors : {}}
            />
          )}
          {step === 3 && (
            <Step4Financing form={form} update={update} errors={showErrors ? errors : {}} />
          )}

          {mutationError ? (
            <Text style={styles.errorBanner}>{mutationError}</Text>
          ) : null}
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
          <Pressable
            onPress={goNext}
            disabled={calcMut.isPending}
            style={({ pressed }) => [
              styles.primaryBtn,
              { opacity: pressed || calcMut.isPending ? 0.7 : 1 },
            ]}
          >
            <Text style={styles.primaryBtnText}>
              {calcMut.isPending
                ? "Calculating…"
                : isLast
                ? "Calculate"
                : "Continue"}
            </Text>
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Step 1 — Basics
// ──────────────────────────────────────────────────────────────────────────
function Step1Basics({
  form,
  update,
  errors,
  lengthUnitLabel,
}: {
  form: FormState;
  update: <K extends keyof FormState>(k: K, v: FormState[K]) => void;
  errors: Record<string, string>;
  lengthUnitLabel: string;
}) {
  return (
    <View>
      <Text style={styles.sectionLead}>
        Tell us about the yacht. We'll use this to size-check the estimate.
      </Text>

      <Field label="Name (optional)">
        <Input
          value={form.yacht_name}
          onChangeText={(v) => update("yacht_name", v)}
          placeholder="e.g. Aurora"
        />
      </Field>

      <Field label="Shipyard / builder (optional)">
        <Input
          value={form.builder}
          onChangeText={(v) => update("builder", v)}
          placeholder="e.g. Sunseeker, Ferretti, Lagoon"
        />
      </Field>

      <Field label="Model (optional)">
        <Input
          value={form.model}
          onChangeText={(v) => update("model", v)}
          placeholder="e.g. Predator 74, Navetta 33"
        />
      </Field>

      <Field label="Type" error={errors.yacht_class}>
        <View style={styles.pillRow}>
          {CLASS_OPTIONS.map((o) => {
            const active = form.yacht_class === o.value;
            return (
              <Pressable
                key={o.value}
                onPress={() => update("yacht_class", o.value)}
                style={[styles.pill, active && styles.pillActive]}
              >
                <Text style={[styles.pillText, active && styles.pillTextActive]}>
                  {o.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </Field>

      <Row>
        <Field label={`Length (${lengthUnitLabel})`} error={errors.length} flex>
          <Input
            value={form.length}
            onChangeText={(v) => update("length", v)}
            placeholder={lengthUnitLabel === "ft" ? "78" : "24"}
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

      <Field label="Operating region" error={errors.region}>
        <View style={styles.pillRow}>
          {REGION_OPTIONS.map((o) => {
            const active = form.region === o.value;
            return (
              <Pressable
                key={o.value}
                onPress={() => update("region", o.value)}
                style={[styles.pill, active && styles.pillActive]}
              >
                <Text style={[styles.pillText, active && styles.pillTextActive]}>
                  {o.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </Field>

      <Field label="Usage" error={errors.usage_type}>
        <View style={{ gap: 8 }}>
          {USAGE_OPTIONS.map((o) => {
            const active = form.usage_type === o.value;
            return (
              <Pressable
                key={o.value}
                onPress={() => update("usage_type", o.value)}
                style={[styles.usageCard, active && styles.usageCardActive]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.usageLabel, active && { color: GOLD }]}>
                    {o.label}
                  </Text>
                  <Text style={styles.usageSub}>{o.sub}</Text>
                </View>
                {active && <Feather name="check" size={18} color={GOLD} />}
              </Pressable>
            );
          })}
        </View>
      </Field>
    </View>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Step 2 — Crew
// ──────────────────────────────────────────────────────────────────────────
function Step2Crew({
  form,
  setForm,
  errors,
}: {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  errors: Record<string, string>;
}) {
  const updateCrew = (key: string, patch: Partial<CrewRow>) =>
    setForm((f) => ({
      ...f,
      crew: { ...f.crew, [key]: { ...f.crew[key]!, ...patch } },
    }));

  const total = useMemo(() => {
    let sum = 0;
    for (const c of CREW) {
      const r = form.crew[c.key]!;
      if (!r.enabled) continue;
      const s = parseNum(r.salary);
      if (s == null || s <= 0) continue;
      const qty = c.allowQty ? Math.max(1, r.qty) : 1;
      const months = c.allowQty ? Math.min(12, Math.max(1, r.months)) : 12;
      sum += s * months * qty;
    }
    return sum;
  }, [form.crew]);

  return (
    <View>
      <Text style={styles.sectionLead}>
        Toggle the positions you employ. Salaries are monthly — we multiply by 12 for the year.
      </Text>

      {CREW.map((c) => {
        const row = form.crew[c.key]!;
        return (
          <View
            key={c.key}
            style={[
              styles.crewCard,
              row.enabled && {
                borderColor: "rgba(201,169,97,0.35)",
                backgroundColor: "rgba(201,169,97,0.04)",
              },
            ]}
          >
            <Pressable
              onPress={() => {
                if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
                updateCrew(c.key, {
                  enabled: !row.enabled,
                  salary: !row.enabled && !row.salary ? String(c.defaultSalary) : row.salary,
                });
              }}
              style={styles.crewHeaderRow}
            >
              <View
                style={[
                  styles.checkbox,
                  row.enabled && { backgroundColor: GOLD, borderColor: GOLD },
                ]}
              >
                {row.enabled && <Feather name="check" size={14} color={NAVY} />}
              </View>
              <Text style={styles.crewLabel}>{c.label}</Text>
            </Pressable>

            {row.enabled && (
              <View style={styles.crewControlsRow}>
                <View style={styles.crewSalaryWrap}>
                  <TextInput
                    value={row.salary}
                    onChangeText={(v) => updateCrew(c.key, { salary: v })}
                    placeholder={String(c.defaultSalary)}
                    placeholderTextColor={MUTED}
                    keyboardType="decimal-pad"
                    style={styles.crewSalaryInput}
                  />
                  <Text style={styles.crewSalarySuffix}>€ / mo</Text>
                </View>
                {c.allowQty && (
                  <View style={styles.qtyStepper}>
                    <Pressable
                      onPress={() => updateCrew(c.key, { qty: Math.max(1, row.qty - 1) })}
                      hitSlop={6}
                      style={styles.qtyBtn}
                    >
                      <Feather name="minus" size={14} color={GOLD} />
                    </Pressable>
                    <View style={styles.qtyBox}>
                      <Text style={styles.qtyValue}>×{row.qty}</Text>
                    </View>
                    <Pressable
                      onPress={() => updateCrew(c.key, { qty: Math.min(4, row.qty + 1) })}
                      hitSlop={6}
                      style={styles.qtyBtn}
                    >
                      <Feather name="plus" size={14} color={GOLD} />
                    </Pressable>
                  </View>
                )}
              </View>
            )}
            {row.enabled && c.allowQty && (
              <View style={styles.crewControlsRow}>
                <Text style={styles.monthsLabel}>Months / year</Text>
                <View style={styles.qtyStepper}>
                  <Pressable
                    onPress={() => updateCrew(c.key, { months: Math.max(1, row.months - 1) })}
                    hitSlop={6}
                    style={styles.qtyBtn}
                  >
                    <Feather name="minus" size={14} color={GOLD} />
                  </Pressable>
                  <View style={styles.qtyBox}>
                    <Text style={styles.qtyValue}>{row.months}</Text>
                  </View>
                  <Pressable
                    onPress={() => updateCrew(c.key, { months: Math.min(12, row.months + 1) })}
                    hitSlop={6}
                    style={styles.qtyBtn}
                  >
                    <Feather name="plus" size={14} color={GOLD} />
                  </Pressable>
                </View>
              </View>
            )}
          </View>
        );
      })}

      {errors.crew ? <Text style={styles.fieldError}>{errors.crew}</Text> : null}

      <View style={styles.totalCard}>
        <Text style={styles.totalLabel}>ANNUAL CREW TOTAL</Text>
        <Text style={styles.totalValue}>
          €{Math.round(total).toLocaleString("en-US")}
        </Text>
      </View>
    </View>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Step 3 — Expenses
// ──────────────────────────────────────────────────────────────────────────
function Step3Expenses({
  form,
  setForm,
  errors,
}: {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  errors: Record<string, string>;
}) {
  const updateM = (k: MonthlyKey, v: string) =>
    setForm((f) => ({ ...f, monthly: { ...f.monthly, [k]: v } }));
  const updateA = (k: AnnualKey, v: string) =>
    setForm((f) => ({ ...f, annual: { ...f.annual, [k]: v } }));

  const showCommission = form.usage_type === "mixed" || form.usage_type === "charter_focused";

  return (
    <View>
      <Text style={styles.sectionLead}>
        Leave fields blank if you don't know — they won't be added to the total.
      </Text>

      <SectionLabel text="MONTHLY · € PER MONTH" />
      {MONTHLY_FIELDS.map((f) => (
        <Field key={f.key} label={f.label} error={errors[`m_${f.key}`]}>
          <MoneyInput
            value={form.monthly[f.key]}
            onChangeText={(v) => updateM(f.key, v)}
            suffix="€ / mo"
          />
        </Field>
      ))}

      <SectionLabel text="ANNUAL · € PER YEAR" />
      {ANNUAL_FIELDS.map((f) => (
        <Field key={f.key} label={f.label} error={errors[`a_${f.key}`]}>
          <MoneyInput
            value={form.annual[f.key]}
            onChangeText={(v) => updateA(f.key, v)}
            suffix="€ / yr"
          />
        </Field>
      ))}

      {showCommission && (
        <>
          <SectionLabel text="CHARTER" />
          <Field
            label="Broker commission"
            error={errors.broker}
            hint="Typical 15–25%. Used for charter break-even hint."
          >
            <MoneyInput
              value={form.broker_commission_pct}
              onChangeText={(v) => setForm((s) => ({ ...s, broker_commission_pct: v }))}
              suffix="%"
              placeholder="20"
            />
          </Field>
        </>
      )}
    </View>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Step 4 — Financing
// ──────────────────────────────────────────────────────────────────────────
function Step4Financing({
  form,
  update,
  errors,
}: {
  form: FormState;
  update: <K extends keyof FormState>(k: K, v: FormState[K]) => void;
  errors: Record<string, string>;
}) {
  return (
    <View>
      <Text style={styles.sectionLead}>
        Cash means no financing line in the estimate. Loan adds annual repayment based on principal, rate, and term.
      </Text>

      <Field label="How is the yacht financed?" error={errors.financing_type}>
        <View style={styles.pillRow}>
          {(["cash", "loan"] as FinType[]).map((v) => {
            const active = form.financing_type === v;
            return (
              <Pressable
                key={v}
                onPress={() => update("financing_type", v)}
                style={[styles.pill, active && styles.pillActive]}
              >
                <Text style={[styles.pillText, active && styles.pillTextActive]}>
                  {v === "cash" ? "Cash" : "Loan"}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </Field>

      {form.financing_type === "loan" ? (
        <>
          <Field label="Loan amount" error={errors.loan_amount_eur}>
            <MoneyInput
              value={form.loan_amount_eur}
              onChangeText={(v) => update("loan_amount_eur", v)}
              suffix="€"
              placeholder="1,000,000"
            />
          </Field>
          <Row>
            <Field label="Interest rate" error={errors.loan_rate_pct} flex>
              <MoneyInput
                value={form.loan_rate_pct}
                onChangeText={(v) => update("loan_rate_pct", v)}
                suffix="%"
                placeholder="6.5"
              />
            </Field>
            <Field label="Term (years)" error={errors.loan_term_years} flex>
              <Input
                value={form.loan_term_years}
                onChangeText={(v) => update("loan_term_years", v)}
                placeholder="10"
                keyboardType="number-pad"
                maxLength={2}
              />
            </Field>
          </Row>
        </>
      ) : form.financing_type === "cash" ? (
        <Text style={styles.hint}>
          No financing line will be added to the estimate.
        </Text>
      ) : null}
    </View>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Reusable
// ──────────────────────────────────────────────────────────────────────────
function TopBar({ onBack, title }: { onBack: () => void; title: string }) {
  return (
    <View style={styles.topBar}>
      <Pressable onPress={onBack} hitSlop={12}>
        <Feather name="chevron-left" size={26} color={GOLD} />
      </Pressable>
      <Text style={styles.topBarTitle}>{title}</Text>
      <View style={{ width: 26 }} />
    </View>
  );
}

function SectionLabel({ text }: { text: string }) {
  return <Text style={styles.sectionLabel}>{text}</Text>;
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
    marginBottom: 14,
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
    marginBottom: 22,
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
  stepDotText: { color: MUTED, fontFamily: "Inter_700Bold", fontSize: 12 },
  stepLabel: { color: MUTED, fontFamily: "Inter_500Medium", fontSize: 11, letterSpacing: 0.4 },
  stepLabelActive: { color: IVORY },
  sectionLead: {
    color: MUTED,
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    lineHeight: 19,
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
  usageCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: NAVY_DEEP,
    borderColor: DIVIDER,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  usageCardActive: {
    borderColor: GOLD,
    backgroundColor: "rgba(201,169,97,0.08)",
  },
  usageLabel: { color: IVORY, fontFamily: "Inter_600SemiBold", fontSize: 14 },
  usageSub: { color: MUTED, fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 2 },
  // Crew
  crewCard: {
    borderColor: DIVIDER,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    backgroundColor: NAVY_DEEP,
  },
  crewHeaderRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderColor: DIVIDER,
    borderWidth: 1.5,
    backgroundColor: NAVY,
    alignItems: "center",
    justifyContent: "center",
  },
  crewLabel: { color: IVORY, fontFamily: "Inter_600SemiBold", fontSize: 14, flex: 1 },
  crewControlsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 12,
  },
  crewSalaryWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: NAVY,
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
  qtyStepper: {
    flexDirection: "row",
    alignItems: "center",
    borderColor: DIVIDER,
    borderWidth: 1,
    borderRadius: 10,
    backgroundColor: NAVY,
    paddingHorizontal: 4,
  },
  qtyBtn: {
    width: 28,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  qtyBox: { paddingHorizontal: 8, minWidth: 30, alignItems: "center" },
  monthsLabel: {
    flex: 1,
    color: MUTED,
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    letterSpacing: 0.3,
  },
  qtyValue: { color: IVORY, fontFamily: "Inter_700Bold", fontSize: 14 },
  totalCard: {
    marginTop: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: "rgba(201,169,97,0.08)",
    borderColor: "rgba(201,169,97,0.3)",
    borderWidth: 1,
    borderRadius: 12,
  },
  totalLabel: {
    color: MUTED,
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    letterSpacing: 1.2,
  },
  totalValue: { color: GOLD, fontFamily: "Gilroy-ExtraBold", fontSize: 18 },
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
  errorBanner: {
    color: ERROR,
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    textAlign: "center",
    marginTop: 14,
    paddingHorizontal: 12,
  },
});
