import { Feather } from "@expo/vector-icons";
import { useCreateValuation } from "@workspace/api-client-react";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import React, { useMemo, useState } from "react";
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

const NAVY = "#0B1E3F";
const NAVY_ELEV = "#142A52";
const NAVY_DEEP = "#081633";
const GOLD = "#C9A961";
const IVORY = "#F7F3EC";
const MUTED = "rgba(247,243,236,0.55)";
const DIVIDER = "rgba(247,243,236,0.08)";
const ERROR = "#FF8A8A";

type Mode = "builder" | "specs";
type Units = "metric" | "imperial";
type YachtType = "motor_yacht" | "sailing_yacht" | "catamaran" | "superyacht";
type Condition = "New" | "Excellent" | "Good" | "Fair" | "Needs Refit" | "Project";
type SaleRegion =
  | "mediterranean"
  | "northern_europe"
  | "north_america_caribbean"
  | "asia_pacific_me"
  | "global";
type VatStatus = "paid" | "not_paid";
type EngineConfig =
  | "single_diesel"
  | "twin_diesel"
  | "triple_diesel"
  | "quad_diesel"
  | "ips_drives"
  | "sail_auxiliary"
  | "electric_hybrid"
  | "waterjet";

const TYPE_OPTIONS: { value: YachtType; label: string }[] = [
  { value: "motor_yacht", label: "Motor Yacht" },
  { value: "sailing_yacht", label: "Sailing Yacht" },
  { value: "catamaran", label: "Catamaran" },
  { value: "superyacht", label: "Superyacht" },
];

const CONFIGURATIONS: Record<YachtType, string[]> = {
  motor_yacht: [
    "Flybridge",
    "Open / Express",
    "Hard Top",
    "Coupé",
    "Sport Yacht",
    "Sport Bridge",
    "Pilothouse",
    "Sedan",
    "Convertible (Sportfish)",
    "Trawler",
    "Long Range / Explorer",
    "Motor Gulet",
    "Classic Motor",
  ],
  sailing_yacht: [
    "Sloop",
    "Ketch",
    "Cutter",
    "Schooner",
    "Yawl",
    "Cruiser-Racer",
    "Performance Cruiser",
    "Bluewater Cruiser",
    "Classic Sailing",
    "Sailing Gulet",
  ],
  catamaran: [
    "Sail Catamaran (Cruising)",
    "Sail Catamaran (Performance)",
    "Power Catamaran",
    "Charter Catamaran",
  ],
  superyacht: [
    "Tri-deck Motor",
    "Quad-deck Motor",
    "Explorer / Expedition",
    "Sport Superyacht",
    "Classic Motor Superyacht",
    "Sailing Superyacht",
  ],
};

const CONDITION_OPTIONS: { value: Condition; hint: string }[] = [
  { value: "New", hint: "+5%" },
  { value: "Excellent", hint: "baseline" },
  { value: "Good", hint: "−7%" },
  { value: "Fair", hint: "−17%" },
  { value: "Needs Refit", hint: "−30%" },
  { value: "Project", hint: "−50%" },
];

const REGION_OPTIONS: { value: SaleRegion; label: string }[] = [
  { value: "mediterranean", label: "Mediterranean (FR · IT · ES · GR · HR · TR)" },
  { value: "northern_europe", label: "Northern Europe & UK" },
  { value: "north_america_caribbean", label: "North America & Caribbean" },
  { value: "asia_pacific_me", label: "Asia-Pacific & Middle East" },
  { value: "global", label: "Global — no restriction" },
];

const ENGINE_CONFIG_OPTIONS: { value: EngineConfig; label: string }[] = [
  { value: "single_diesel", label: "Single diesel" },
  { value: "twin_diesel", label: "Twin diesel" },
  { value: "triple_diesel", label: "Triple diesel" },
  { value: "quad_diesel", label: "Quad diesel" },
  { value: "ips_drives", label: "IPS drives" },
  { value: "sail_auxiliary", label: "Sail (auxiliary)" },
  { value: "electric_hybrid", label: "Electric / Hybrid" },
  { value: "waterjet", label: "Waterjet" },
];

const HULL_OPTIONS = [
  "GRP / Fiberglass",
  "Steel",
  "Aluminium",
  "Carbon Fibre",
  "Wood / Composite",
  "Ferro-Cement",
];

const REGIONS_REQUIRING_VAT: SaleRegion[] = [
  "mediterranean",
  "northern_europe",
  "global",
];

const STEP_TITLES = [
  "General",
  "Market",
  "Hull",
  "Engines",
  "Capacity",
];

const M_TO_FT = 3.28084;
const T_TO_LT = 0.984207;

// Keep 4 decimals on conversion so repeated metric↔imperial toggles don't
// silently drift (display still looks clean since trailing zeros are stripped).
function convertUnitField(value: string, factor: number): string {
  const n = parseFloat(value.replace(",", "."));
  if (!isFinite(n) || n <= 0) return value;
  return parseFloat((n * factor).toFixed(4)).toString();
}

const INT_RE = /^\d+$/;
const DEC_RE = /^\d+([.,]\d+)?$/;

interface FormState {
  mode: Mode;
  units: Units;
  // step 1
  type: YachtType | null;
  configuration: string;
  builder: string;
  model: string;
  year: string;
  refit: string;
  condition: Condition | null;
  // step 2
  sale_region: SaleRegion | null;
  vat_status: VatStatus | null;
  // step 3
  length: string;
  beam: string;
  draft: string;
  hull_material: string;
  displacement: string;
  gross_tonnage: string;
  // step 4
  engine_maker: string;
  engine_model: string;
  engine_config: EngineConfig | null;
  engine_count: string;
  horse_power: string;
  // step 5
  range_nm: string;
  cabins: string;
  heads: string;
  berths: string;
  crew: string;
  bypass_required: boolean;
}

const INITIAL: FormState = {
  mode: "builder",
  units: "metric",
  type: null,
  configuration: "",
  builder: "",
  model: "",
  year: "",
  refit: "",
  condition: null,
  sale_region: null,
  vat_status: null,
  length: "",
  beam: "",
  draft: "",
  hull_material: "",
  displacement: "",
  gross_tonnage: "",
  engine_maker: "",
  engine_model: "",
  engine_config: null,
  engine_count: "",
  horse_power: "",
  range_nm: "",
  cabins: "",
  heads: "",
  berths: "",
  crew: "",
  bypass_required: false,
};

export default function NewValuationScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const mutation = useCreateValuation();
  const [form, setForm] = useState<FormState>(INITIAL);
  const [step, setStep] = useState(0);
  const [showErrors, setShowErrors] = useState(false);

  const update = <K extends keyof FormState>(k: K, v: FormState[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
  };

  const toggleUnits = () => {
    setForm((f) => {
      if (f.units === "metric") {
        return {
          ...f,
          units: "imperial",
          length: convertUnitField(f.length, M_TO_FT),
          beam: convertUnitField(f.beam, M_TO_FT),
          draft: convertUnitField(f.draft, M_TO_FT),
          displacement: convertUnitField(f.displacement, T_TO_LT),
        };
      }
      return {
        ...f,
        units: "metric",
        length: convertUnitField(f.length, 1 / M_TO_FT),
        beam: convertUnitField(f.beam, 1 / M_TO_FT),
        draft: convertUnitField(f.draft, 1 / M_TO_FT),
        displacement: convertUnitField(f.displacement, 1 / T_TO_LT),
      };
    });
  };

  const lengthUnit = form.units === "metric" ? "m" : "ft";
  const massUnit = form.units === "metric" ? "t" : "lt";

  // ── Validation per step ───────────────────────────────────────────
  const stepErrors = useMemo<Record<number, Record<string, string>>>(() => {
    const e1: Record<string, string> = {};
    const e2: Record<string, string> = {};
    const e3: Record<string, string> = {};
    const e4: Record<string, string> = {};
    const e5: Record<string, string> = {};

    // Step 1
    if (!form.type) e1.type = "Select a yacht class";
    const thisYear = new Date().getFullYear();
    const yearN = parseInt(form.year, 10);
    if (
      !form.year ||
      !INT_RE.test(form.year) ||
      yearN < 1940 ||
      yearN > thisYear
    )
      e1.year = `Year between 1940 and ${thisYear}`;
    if (form.refit) {
      const r = parseInt(form.refit, 10);
      if (!INT_RE.test(form.refit) || r < 1940 || r > thisYear)
        e1.refit = `Refit year between 1940 and ${thisYear}`;
    }
    if (!form.bypass_required) {
      if (!form.configuration) e1.configuration = "Pick a configuration";
      if (form.mode === "builder") {
        if (!form.builder.trim()) e1.builder = "Builder is required";
        if (!form.model.trim()) e1.model = "Model is required";
      }
      if (!form.condition) e1.condition = "Select condition";
    }

    // Step 2
    if (!form.sale_region) e2.sale_region = "Select a sale region";
    if (
      form.sale_region &&
      REGIONS_REQUIRING_VAT.includes(form.sale_region) &&
      !form.vat_status
    )
      e2.vat_status = "Select tax status";

    // Step 3 — validate length in metric to avoid imperial-rounding edge cases
    const lenN = parseFloat(form.length.replace(",", "."));
    const lenMeters = form.units === "metric" ? lenN : lenN / M_TO_FT;
    const lenMaxDisplay = form.units === "metric" ? 200 : 657;
    const lenMinDisplay = form.units === "metric" ? 1 : 3;
    if (
      !form.length ||
      !DEC_RE.test(form.length.replace(",", ".")) ||
      !isFinite(lenMeters) ||
      lenMeters < 1 ||
      lenMeters > 200
    )
      e3.length = `Length between ${lenMinDisplay}–${lenMaxDisplay} ${lengthUnit}`;
    if (!form.bypass_required) {
      const beamN = parseFloat(form.beam.replace(",", "."));
      if (
        !form.beam ||
        !DEC_RE.test(form.beam.replace(",", ".")) ||
        !isFinite(beamN) ||
        beamN <= 0
      )
        e3.beam = `Beam in ${lengthUnit}`;
      const draftN = parseFloat(form.draft.replace(",", "."));
      if (
        !form.draft ||
        !DEC_RE.test(form.draft.replace(",", ".")) ||
        !isFinite(draftN) ||
        draftN <= 0
      )
        e3.draft = `Draft in ${lengthUnit}`;
    }

    // Step 4
    if (!form.bypass_required) {
      if (!form.engine_maker.trim()) e4.engine_maker = "Engine maker";
      if (!form.engine_config) e4.engine_config = "Engine configuration";
      const ec = parseInt(form.engine_count, 10);
      if (!INT_RE.test(form.engine_count) || ec < 1 || ec > 4)
        e4.engine_count = "1–4";
      const hp = parseInt(form.horse_power, 10);
      if (!INT_RE.test(form.horse_power) || hp <= 0)
        e4.horse_power = "Total HP";
    }

    // Step 5
    if (!form.bypass_required) {
      if (!INT_RE.test(form.cabins)) e5.cabins = "Number of cabins";
      if (!INT_RE.test(form.heads)) e5.heads = "Number of heads";
      if (!INT_RE.test(form.crew)) e5.crew = "Number of crew";
    }

    return { 0: e1, 1: e2, 2: e3, 3: e4, 4: e5 };
  }, [form, lengthUnit]);

  const stepValid = (i: number) =>
    Object.keys(stepErrors[i] ?? {}).length === 0;

  const allValid = [0, 1, 2, 3, 4].every(stepValid);

  const onContinue = () => {
    if (!stepValid(step)) {
      setShowErrors(true);
      if (Platform.OS !== "web")
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }
    setShowErrors(false);
    if (Platform.OS !== "web") Haptics.selectionAsync();
    if (step < 4) setStep(step + 1);
    else onSubmit();
  };

  const onBack = () => {
    if (step === 0) router.back();
    else {
      setShowErrors(false);
      setStep(step - 1);
    }
  };

  const onSubmit = () => {
    if (!allValid) {
      setShowErrors(true);
      // jump to first invalid step
      const firstInvalid = [0, 1, 2, 3, 4].find((i) => !stepValid(i));
      if (firstInvalid !== undefined) setStep(firstInvalid);
      return;
    }
    if (Platform.OS !== "web")
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const toMeters = (v: string): number | null => {
      const n = parseFloat(v.replace(",", "."));
      if (!isFinite(n) || n <= 0) return null;
      return form.units === "metric" ? n : n / M_TO_FT;
    };
    const toTonnes = (v: string): number | null => {
      const n = parseFloat(v.replace(",", "."));
      if (!isFinite(n) || n <= 0) return null;
      return form.units === "metric" ? n : n / T_TO_LT;
    };
    const toIntOrNull = (v: string): number | null => {
      const n = parseInt(v, 10);
      return isFinite(n) ? n : null;
    };

    mutation.mutate(
      {
        data: {
          mode: form.mode,
          bypass_required: form.bypass_required,
          type: form.type!,
          configuration: form.configuration || null,
          builder: form.builder.trim() || null,
          model: form.model.trim() || null,
          year_built: parseInt(form.year, 10),
          refit_year: form.refit ? parseInt(form.refit, 10) || null : null,
          condition: form.condition,
          sale_region: form.sale_region!,
          vat_status: form.vat_status,
          length_meters: toMeters(form.length)!,
          beam_meters: toMeters(form.beam),
          draft_meters: toMeters(form.draft),
          hull_material: form.hull_material || null,
          displacement_tonnes: toTonnes(form.displacement),
          gross_tonnage: form.gross_tonnage
            ? parseFloat(form.gross_tonnage.replace(",", ".")) || null
            : null,
          engine_maker: form.engine_maker.trim() || null,
          engine_model: form.engine_model.trim() || null,
          engine_config: form.engine_config,
          engine_count: toIntOrNull(form.engine_count),
          horse_power: toIntOrNull(form.horse_power),
          range_nm: toIntOrNull(form.range_nm),
          cabins: toIntOrNull(form.cabins),
          heads: toIntOrNull(form.heads),
          berths: toIntOrNull(form.berths),
          crew: toIntOrNull(form.crew),
        },
      },
      {
        onSuccess: (result) => {
          if (Platform.OS !== "web")
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          router.replace({
            pathname: "/valuation/result",
            params: { data: JSON.stringify(result) },
          });
        },
        onError: () => {
          if (Platform.OS !== "web")
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        },
      },
    );
  };

  const isLoading = mutation.isPending;
  const errorMessage =
    (mutation.error as { data?: { error?: string }; message?: string } | null)
      ?.data?.error ??
    (mutation.error as Error | null)?.message ??
    null;

  const errs = (showErrors ? stepErrors[step] : {}) as Record<string, string>;

  return (
    <View style={[styles.root, { backgroundColor: NAVY }]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={[styles.headerBar, { paddingTop: insets.top + 12 }]}>
          <Pressable onPress={onBack} hitSlop={16}>
            <Feather name="chevron-left" size={24} color={IVORY} />
          </Pressable>
          <Text style={styles.headerTitle}>
            {STEP_TITLES[step]}{" "}
            <Text style={{ color: MUTED }}>· {step + 1}/5</Text>
          </Text>
          <Pressable onPress={toggleUnits} hitSlop={12} style={styles.unitsBadge}>
            <Text style={styles.unitsText}>{lengthUnit}</Text>
          </Pressable>
        </View>

        {/* Progress bar */}
        <View style={styles.progressTrack}>
          <View
            style={[styles.progressFill, { width: `${((step + 1) / 5) * 100}%` }]}
          />
        </View>

        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: 24,
            paddingBottom: insets.bottom + 140,
          }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {step === 0 && (
            <Step1General form={form} update={update} errs={errs} />
          )}
          {step === 1 && (
            <Step2Market form={form} update={update} errs={errs} />
          )}
          {step === 2 && (
            <Step3Hull
              form={form}
              update={update}
              errs={errs}
              lengthUnit={lengthUnit}
              massUnit={massUnit}
            />
          )}
          {step === 3 && (
            <Step4Engines form={form} update={update} errs={errs} />
          )}
          {step === 4 && (
            <Step5Capacity form={form} update={update} errs={errs} />
          )}

          {errorMessage && !isLoading ? (
            <View style={styles.errorBanner}>
              <Feather name="alert-circle" size={14} color={ERROR} />
              <Text style={styles.errorBannerText}>
                {errorMessage.length > 240
                  ? errorMessage.slice(0, 240) + "…"
                  : errorMessage}
              </Text>
            </View>
          ) : null}
        </ScrollView>

        <View
          style={[
            styles.footer,
            { paddingBottom: insets.bottom + 18, backgroundColor: NAVY_DEEP },
          ]}
        >
          <Pressable
            onPress={onContinue}
            disabled={isLoading}
            style={({ pressed }) => [
              styles.cta,
              {
                opacity: isLoading ? 0.7 : pressed ? 0.85 : 1,
                transform: [{ scale: pressed ? 0.99 : 1 }],
              },
            ]}
          >
            {isLoading ? (
              <ActivityIndicator color={NAVY} />
            ) : (
              <>
                <Text style={styles.ctaText}>
                  {step < 4 ? "Continue" : "Get valuation"}
                </Text>
                <Feather
                  name={step < 4 ? "arrow-right" : "check"}
                  size={18}
                  color={NAVY}
                />
              </>
            )}
          </Pressable>
          <Text style={styles.footerNote}>
            {step < 4
              ? `Step ${step + 1} of 5`
              : "Powered by AI · Takes ~30 seconds"}
          </Text>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

// ────────────────────────────────────────────────────────────────────
// STEPS
// ────────────────────────────────────────────────────────────────────

interface StepProps {
  form: FormState;
  update: <K extends keyof FormState>(k: K, v: FormState[K]) => void;
  errs: Record<string, string>;
}

function Step1General({ form, update, errs }: StepProps) {
  const configs = form.type ? CONFIGURATIONS[form.type] : [];
  return (
    <>
      <Hero title="Tell us about your yacht" sub="The more accurate the inputs, the more reliable the valuation." />

      {/* Mode */}
      <Section label="How do you know your yacht?">
        <View style={styles.modeRow}>
          <ModeCard
            active={form.mode === "builder"}
            label="By Manufacturer"
            sub="I know the builder + model"
            onPress={() => update("mode", "builder")}
          />
          <ModeCard
            active={form.mode === "specs"}
            label="Specs Only"
            sub="Custom build / unknown brand"
            onPress={() => update("mode", "specs")}
          />
        </View>
      </Section>

      {/* Type */}
      <Section label="Yacht class *" error={errs.type}>
        <View style={styles.pillsRowWrap}>
          {TYPE_OPTIONS.map((opt) => (
            <Pill
              key={opt.value}
              label={opt.label}
              active={form.type === opt.value}
              onPress={() => {
                update("type", opt.value);
                update("configuration", "");
              }}
            />
          ))}
        </View>
      </Section>

      {/* Year / Refit */}
      <View style={styles.row2}>
        <Section label="Build year *" error={errs.year} style={{ flex: 1 }}>
          <Field
            value={form.year}
            onChangeText={(v) => update("year", v)}
            placeholder="e.g. 2018"
            keyboardType="number-pad"
            maxLength={4}
            error={!!errs.year}
          />
        </Section>
        <Section label="Refit year" error={errs.refit} style={{ flex: 1 }}>
          <Field
            value={form.refit}
            onChangeText={(v) => update("refit", v)}
            placeholder="e.g. 2022"
            keyboardType="number-pad"
            maxLength={4}
            error={!!errs.refit}
          />
        </Section>
      </View>

      {/* Configuration */}
      {form.type ? (
        <Section label="Configuration / Style *" error={errs.configuration}>
          <View style={styles.pillsRowWrap}>
            {configs.map((c) => (
              <Pill
                key={c}
                label={c}
                active={form.configuration === c}
                onPress={() => update("configuration", c)}
              />
            ))}
          </View>
        </Section>
      ) : (
        <Section label="Configuration / Style *">
          <Text style={styles.hint}>Pick a yacht class first.</Text>
        </Section>
      )}

      {/* Builder / Model — builder mode only */}
      {form.mode === "builder" ? (
        <>
          <Section label="Builder *" error={errs.builder}>
            <Field
              value={form.builder}
              onChangeText={(v) => update("builder", v)}
              placeholder="e.g. Sunseeker, Azimut, Feadship"
              autoCapitalize="words"
              error={!!errs.builder}
            />
          </Section>
          <Section label="Model / Range *" error={errs.model}>
            <Field
              value={form.model}
              onChangeText={(v) => update("model", v)}
              placeholder="e.g. Manhattan 66"
              autoCapitalize="words"
              error={!!errs.model}
            />
          </Section>
        </>
      ) : null}

      {/* Condition */}
      <Section label="Condition *" error={errs.condition}>
        <View style={styles.pillsRowWrap}>
          {CONDITION_OPTIONS.map((c) => (
            <Pill
              key={c.value}
              label={`${c.value} · ${c.hint}`}
              active={form.condition === c.value}
              onPress={() => update("condition", c.value)}
            />
          ))}
        </View>
      </Section>
    </>
  );
}

function Step2Market({ form, update, errs }: StepProps) {
  const showVat = form.sale_region
    ? REGIONS_REQUIRING_VAT.includes(form.sale_region)
    : false;
  return (
    <>
      <Hero
        title="Market context"
        sub="Where will the yacht be sold? This drives the brokerage market the AI samples."
      />
      <Section label="Sale region *" error={errs.sale_region}>
        <View style={{ gap: 8 }}>
          {REGION_OPTIONS.map((r) => (
            <ChoiceRow
              key={r.value}
              label={r.label}
              active={form.sale_region === r.value}
              onPress={() => update("sale_region", r.value)}
            />
          ))}
        </View>
      </Section>

      {showVat ? (
        <Section label="Tax status *" error={errs.vat_status}>
          <View style={{ gap: 8 }}>
            <ChoiceRow
              label="Tax Paid (EU free circulation)"
              active={form.vat_status === "paid"}
              onPress={() => update("vat_status", "paid")}
            />
            <ChoiceRow
              label="Tax Not Paid (offshore / not in EU)"
              active={form.vat_status === "not_paid"}
              onPress={() => update("vat_status", "not_paid")}
            />
          </View>
        </Section>
      ) : null}
    </>
  );
}

function Step3Hull({
  form,
  update,
  errs,
  lengthUnit,
  massUnit,
}: StepProps & { lengthUnit: string; massUnit: string }) {
  return (
    <>
      <Hero
        title="Hull & dimensions"
        sub={`Switch units (${lengthUnit}) anytime — values convert automatically.`}
      />
      <Section
        label={`Length (LOA) * (${lengthUnit})`}
        error={errs.length}
      >
        <Field
          value={form.length}
          onChangeText={(v) => update("length", v)}
          placeholder={lengthUnit === "m" ? "e.g. 24.5" : "e.g. 80.4"}
          keyboardType="decimal-pad"
          error={!!errs.length}
        />
      </Section>
      <View style={styles.row2}>
        <Section
          label={`Beam * (${lengthUnit})`}
          error={errs.beam}
          style={{ flex: 1 }}
        >
          <Field
            value={form.beam}
            onChangeText={(v) => update("beam", v)}
            placeholder={lengthUnit === "m" ? "e.g. 5.6" : "e.g. 18.4"}
            keyboardType="decimal-pad"
            error={!!errs.beam}
          />
        </Section>
        <Section
          label={`Draft * (${lengthUnit})`}
          error={errs.draft}
          style={{ flex: 1 }}
        >
          <Field
            value={form.draft}
            onChangeText={(v) => update("draft", v)}
            placeholder={lengthUnit === "m" ? "e.g. 1.8" : "e.g. 5.9"}
            keyboardType="decimal-pad"
            error={!!errs.draft}
          />
        </Section>
      </View>
      <Section label="Hull material">
        <View style={styles.pillsRowWrap}>
          {HULL_OPTIONS.map((h) => (
            <Pill
              key={h}
              label={h}
              active={form.hull_material === h}
              onPress={() =>
                update("hull_material", form.hull_material === h ? "" : h)
              }
            />
          ))}
        </View>
      </Section>
      <View style={styles.row2}>
        <Section label={`Displacement (${massUnit})`} style={{ flex: 1 }}>
          <Field
            value={form.displacement}
            onChangeText={(v) => update("displacement", v)}
            placeholder="optional"
            keyboardType="decimal-pad"
          />
        </Section>
        <Section label="Gross tonnage (GT)" style={{ flex: 1 }}>
          <Field
            value={form.gross_tonnage}
            onChangeText={(v) => update("gross_tonnage", v)}
            placeholder="optional"
            keyboardType="decimal-pad"
          />
        </Section>
      </View>
    </>
  );
}

function Step4Engines({ form, update, errs }: StepProps) {
  return (
    <>
      <Hero title="Engines" sub="Engine specs are a strong price signal." />
      <Section label="Engine maker *" error={errs.engine_maker}>
        <Field
          value={form.engine_maker}
          onChangeText={(v) => update("engine_maker", v)}
          placeholder="e.g. MAN, Caterpillar, Volvo Penta, MTU"
          autoCapitalize="words"
          error={!!errs.engine_maker}
        />
      </Section>
      <Section label="Engine model">
        <Field
          value={form.engine_model}
          onChangeText={(v) => update("engine_model", v)}
          placeholder="e.g. V12-1800, C32 ACERT"
        />
      </Section>
      <Section label="Engine configuration *" error={errs.engine_config}>
        <View style={styles.pillsRowWrap}>
          {ENGINE_CONFIG_OPTIONS.map((opt) => (
            <Pill
              key={opt.value}
              label={opt.label}
              active={form.engine_config === opt.value}
              onPress={() => update("engine_config", opt.value)}
            />
          ))}
        </View>
      </Section>
      <View style={styles.row2}>
        <Section
          label="Engine count *"
          error={errs.engine_count}
          style={{ flex: 1 }}
        >
          <Field
            value={form.engine_count}
            onChangeText={(v) => update("engine_count", v)}
            placeholder="1–4"
            keyboardType="number-pad"
            maxLength={1}
            error={!!errs.engine_count}
          />
        </Section>
        <Section
          label="Total horsepower *"
          error={errs.horse_power}
          style={{ flex: 1 }}
        >
          <Field
            value={form.horse_power}
            onChangeText={(v) => update("horse_power", v)}
            placeholder="e.g. 2700"
            keyboardType="number-pad"
            error={!!errs.horse_power}
          />
        </Section>
      </View>
    </>
  );
}

function Step5Capacity({ form, update, errs }: StepProps) {
  return (
    <>
      <Hero title="Capacity & range" sub="Last step — almost done." />
      <Section label="Range (nm)">
        <Field
          value={form.range_nm}
          onChangeText={(v) => update("range_nm", v)}
          placeholder="e.g. 3500"
          keyboardType="number-pad"
        />
      </Section>
      <View style={styles.row2}>
        <Section label="Guest cabins *" error={errs.cabins} style={{ flex: 1 }}>
          <Field
            value={form.cabins}
            onChangeText={(v) => update("cabins", v)}
            placeholder="e.g. 4"
            keyboardType="number-pad"
            error={!!errs.cabins}
          />
        </Section>
        <Section label="Heads (WC) *" error={errs.heads} style={{ flex: 1 }}>
          <Field
            value={form.heads}
            onChangeText={(v) => update("heads", v)}
            placeholder="e.g. 5"
            keyboardType="number-pad"
            error={!!errs.heads}
          />
        </Section>
      </View>
      <View style={styles.row2}>
        <Section label="Berths" style={{ flex: 1 }}>
          <Field
            value={form.berths}
            onChangeText={(v) => update("berths", v)}
            placeholder="e.g. 8"
            keyboardType="number-pad"
          />
        </Section>
        <Section label="Crew *" error={errs.crew} style={{ flex: 1 }}>
          <Field
            value={form.crew}
            onChangeText={(v) => update("crew", v)}
            placeholder="e.g. 4"
            keyboardType="number-pad"
            error={!!errs.crew}
          />
        </Section>
      </View>

      <Pressable
        onPress={() => update("bypass_required", !form.bypass_required)}
        style={styles.bypassRow}
      >
        <View
          style={[
            styles.checkbox,
            form.bypass_required && styles.checkboxChecked,
          ]}
        >
          {form.bypass_required ? (
            <Feather name="check" size={14} color={NAVY} />
          ) : null}
        </View>
        <Text style={styles.bypassText}>
          I don't have all the data — give me an indicative estimate
        </Text>
      </Pressable>
    </>
  );
}

// ────────────────────────────────────────────────────────────────────
// PRIMITIVES
// ────────────────────────────────────────────────────────────────────

function Hero({ title, sub }: { title: string; sub: string }) {
  return (
    <>
      <Text style={styles.kicker}>YACHTWORTH</Text>
      <Text style={styles.heroTitle}>{title}</Text>
      <Text style={styles.subhero}>{sub}</Text>
    </>
  );
}

function Section({
  label,
  children,
  style,
  error,
}: {
  label: string;
  children: React.ReactNode;
  style?: object;
  error?: string;
}) {
  return (
    <View style={[styles.section, style]}>
      <Text style={styles.sectionLabel}>{label}</Text>
      {children}
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

function Pill({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={() => {
        if (Platform.OS !== "web") Haptics.selectionAsync();
        onPress();
      }}
      style={({ pressed }) => [
        styles.pill,
        active && styles.pillActive,
        { opacity: pressed && !active ? 0.7 : 1 },
      ]}
    >
      <Text style={[styles.pillText, active && styles.pillTextActive]}>
        {label}
      </Text>
    </Pressable>
  );
}

function ChoiceRow({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={() => {
        if (Platform.OS !== "web") Haptics.selectionAsync();
        onPress();
      }}
      style={({ pressed }) => [
        styles.choiceRow,
        active && styles.choiceRowActive,
        { opacity: pressed && !active ? 0.7 : 1 },
      ]}
    >
      <View
        style={[
          styles.radioOuter,
          active && { borderColor: GOLD },
        ]}
      >
        {active ? <View style={styles.radioInner} /> : null}
      </View>
      <Text style={[styles.choiceText, active && { color: IVORY }]}>
        {label}
      </Text>
    </Pressable>
  );
}

function ModeCard({
  active,
  label,
  sub,
  onPress,
}: {
  active: boolean;
  label: string;
  sub: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={() => {
        if (Platform.OS !== "web") Haptics.selectionAsync();
        onPress();
      }}
      style={({ pressed }) => [
        styles.modeCard,
        active && styles.modeCardActive,
        { opacity: pressed && !active ? 0.8 : 1 },
      ]}
    >
      <Text style={[styles.modeCardLabel, active && { color: GOLD }]}>
        {label}
      </Text>
      <Text style={styles.modeCardSub}>{sub}</Text>
    </Pressable>
  );
}

function Field({
  error,
  style,
  ...props
}: React.ComponentProps<typeof TextInput> & { error?: boolean }) {
  return (
    <TextInput
      placeholderTextColor="rgba(247,243,236,0.35)"
      style={[styles.field, error && { borderColor: ERROR }, style]}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  headerTitle: {
    color: IVORY,
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    letterSpacing: 0.3,
  },
  unitsBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: GOLD,
  },
  unitsText: {
    color: GOLD,
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    letterSpacing: 0.5,
  },
  progressTrack: {
    height: 2,
    backgroundColor: "rgba(247,243,236,0.06)",
    marginHorizontal: 24,
    marginBottom: 16,
    borderRadius: 1,
  },
  progressFill: { height: 2, backgroundColor: GOLD, borderRadius: 1 },
  kicker: {
    color: GOLD,
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    letterSpacing: 2,
    textTransform: "uppercase",
    marginTop: 6,
    marginBottom: 8,
  },
  heroTitle: {
    color: IVORY,
    fontFamily: "Gilroy-ExtraBold",
    fontSize: 28,
    letterSpacing: -0.4,
    lineHeight: 34,
    marginBottom: 8,
  },
  subhero: {
    color: MUTED,
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
  },
  hint: {
    color: MUTED,
    fontFamily: "Inter_400Regular",
    fontSize: 13,
  },
  section: { marginBottom: 18 },
  sectionLabel: {
    color: "rgba(247,243,236,0.7)",
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  row2: { flexDirection: "row", gap: 12 },
  pillsRowWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  pill: {
    paddingVertical: 9,
    paddingHorizontal: 13,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: DIVIDER,
    backgroundColor: NAVY_ELEV,
  },
  pillActive: {
    borderColor: GOLD,
    backgroundColor: "rgba(201,169,97,0.14)",
  },
  pillText: {
    color: "rgba(247,243,236,0.7)",
    fontFamily: "Inter_500Medium",
    fontSize: 13,
  },
  pillTextActive: { color: GOLD },
  field: {
    backgroundColor: NAVY_ELEV,
    borderWidth: 1,
    borderColor: DIVIDER,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
    color: IVORY,
    fontFamily: "Inter_500Medium",
    fontSize: 15,
  },
  errorText: {
    color: ERROR,
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    marginTop: 6,
  },
  modeRow: { flexDirection: "row", gap: 12 },
  modeCard: {
    flex: 1,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: DIVIDER,
    backgroundColor: NAVY_ELEV,
  },
  modeCardActive: {
    borderColor: GOLD,
    backgroundColor: "rgba(201,169,97,0.10)",
  },
  modeCardLabel: {
    color: IVORY,
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    marginBottom: 4,
  },
  modeCardSub: {
    color: MUTED,
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    lineHeight: 15,
  },
  choiceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: DIVIDER,
    backgroundColor: NAVY_ELEV,
  },
  choiceRowActive: {
    borderColor: GOLD,
    backgroundColor: "rgba(201,169,97,0.08)",
  },
  radioOuter: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: "rgba(247,243,236,0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  radioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: GOLD,
  },
  choiceText: {
    flex: 1,
    color: "rgba(247,243,236,0.85)",
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    lineHeight: 18,
  },
  bypassRow: {
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: DIVIDER,
    backgroundColor: NAVY_ELEV,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: "rgba(247,243,236,0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: {
    backgroundColor: GOLD,
    borderColor: GOLD,
  },
  bypassText: {
    flex: 1,
    color: IVORY,
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    lineHeight: 18,
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "rgba(255,138,138,0.10)",
    borderColor: "rgba(255,138,138,0.35)",
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginTop: 4,
  },
  errorBannerText: {
    flex: 1,
    color: ERROR,
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    lineHeight: 17,
  },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: DIVIDER,
  },
  cta: {
    backgroundColor: GOLD,
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  ctaText: {
    color: NAVY,
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    letterSpacing: 0.3,
  },
  footerNote: {
    color: "rgba(247,243,236,0.4)",
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    textAlign: "center",
    marginTop: 10,
  },
});
