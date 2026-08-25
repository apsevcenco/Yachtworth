import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  compareFlags,
  estimateFlagFees,
  getFlagRegistries,
  type FlagComparisonInput,
  type FlagComparisonResult,
  type FlagFeeEstimateResponse,
  type FlagRegistry,
} from "../lib/flagIntelligence";
import { RegistryFlag } from "../components/RegistryFlag";
import { useTheme } from "../hooks/useColors";

const NAVY = "#0B1E3F";
const NAVY_DEEP = "#081633";
const NAVY_ELEV = "#142A52";
const GOLD = "#C9A961";
const IVORY = "#F7F3EC";
const MUTED = "rgba(247,243,236,0.62)";
const DIVIDER = "rgba(247,243,236,0.1)";
const GREEN = "#7BD389";
const RED = "#E77777";

type Mode = "flags" | "advice" | "comparison";
type CompareCategory = "overview" | "cost" | "vat" | "eu" | "commercial" | "eligibility" | "survey" | "mortgage" | "crew" | "timing" | "risks" | "full";

type FormState = {
  loa_m: string;
  gt: string;
  year_built: string;
  builder: string;
  value_eur: string;
  use_type: "private" | "commercial";
  charter: boolean;
  navigation_area: string;
  owner_nationality: string;
  owner_residency: string;
  company_country: string;
  current_flag: string;
  crew_nationality: string;
  intended_cruising_area: string;
  registration_type: "new_registration" | "reflag";
  mortgage_needed: boolean;
  planned_charter_days: string;
};

const DEFAULT_FORM: FormState = {
  loa_m: "38",
  gt: "280",
  year_built: "2018",
  builder: "Azimut",
  value_eur: "7800000",
  use_type: "commercial",
  charter: true,
  navigation_area: "Mediterranean, France, Italy, Spain",
  owner_nationality: "EU",
  owner_residency: "Monaco",
  company_country: "Malta",
  current_flag: "",
  crew_nationality: "International",
  intended_cruising_area: "EU summer charter",
  registration_type: "new_registration",
  mortgage_needed: true,
  planned_charter_days: "80",
};

const MODES: Array<{ key: Mode; title: string; subtitle: string; icon: React.ComponentProps<typeof Feather>["name"] }> = [
  { key: "flags", title: "All Flags", subtitle: "Open a flag card and review registry terms", icon: "list" },
  { key: "advice", title: "Registration Advice", subtitle: "Profile the yacht and get a ranked recommendation", icon: "compass" },
  { key: "comparison", title: "Comparison", subtitle: "Compare selected registries side by side", icon: "columns" },
];

function toNumber(value: string): number | null {
  const cleaned = value.replace(/[,\s]/g, "");
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function asInput(form: FormState): FlagComparisonInput {
  return {
    loa_m: toNumber(form.loa_m),
    gt: toNumber(form.gt),
    year_built: toNumber(form.year_built),
    builder: form.builder.trim() || null,
    value_eur: toNumber(form.value_eur),
    use_type: form.use_type,
    charter: form.charter,
    navigation_area: form.navigation_area.trim() || null,
    owner_nationality: form.owner_nationality.trim() || null,
    owner_residency: form.owner_residency.trim() || null,
    company_country: form.company_country.trim() || null,
    current_flag: form.current_flag.trim() || null,
    crew_nationality: form.crew_nationality.trim() || null,
    intended_cruising_area: form.intended_cruising_area.trim() || null,
    registration_type: form.registration_type,
    mortgage_needed: form.mortgage_needed,
    planned_charter_days: toNumber(form.planned_charter_days),
  };
}

function scoreColor(score: number): string {
  if (score >= 88) return GREEN;
  if (score >= 74) return GOLD;
  if (score >= 55) return "#D8B26E";
  return RED;
}

function money(value: number | null): string {
  if (value == null) return "To verify";
  return `EUR ${value.toLocaleString("en-GB")}`;
}

function yesNo(value: boolean): string {
  return value ? "Yes" : "No";
}

function processing(flag: FlagRegistry): string {
  if (flag.processing_time_days_min == null && flag.processing_time_days_max == null) return "To verify";
  if (flag.processing_time_days_min === flag.processing_time_days_max) return `${flag.processing_time_days_min} days`;
  return `${flag.processing_time_days_min ?? "?"}-${flag.processing_time_days_max ?? "?"} days`;
}

function textOrVerify(value: string | null | undefined): string {
  return value?.trim() || "To verify";
}

function statusLabel(value: string | null | undefined): string {
  return textOrVerify(value).replace(/_/g, " ");
}

function Field({
  label,
  value,
  onChangeText,
  keyboardType,
  multiline,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  keyboardType?: "default" | "numeric";
  multiline?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <View style={[styles.field, multiline && styles.fieldWide]}>
      <Text style={[styles.label, { color: colors.mutedForeground }]}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        multiline={multiline}
        style={[
          styles.input,
          { backgroundColor: colors.secondary, borderColor: colors.border, color: colors.foreground },
          multiline && styles.textarea,
        ]}
        placeholderTextColor={colors.mutedForeground}
      />
    </View>
  );
}

function Toggle({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.toggle,
        { backgroundColor: colors.secondary, borderColor: colors.border },
        active && [styles.toggleActive, { backgroundColor: colors.glow ?? colors.card, borderColor: colors.primary }],
      ]}
    >
      <Text style={[styles.toggleText, { color: colors.mutedForeground }, active && [styles.toggleTextActive, { color: colors.primary }]]}>{label}</Text>
    </Pressable>
  );
}

export default function FlagIntelligenceScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const { colors, isAcid } = useTheme();
  const [mode, setMode] = useState<Mode>("flags");
  const [flags, setFlags] = useState<FlagRegistry[]>([]);
  const [flagsLoading, setFlagsLoading] = useState(true);
  const [flagsError, setFlagsError] = useState<string | null>(null);
  const [expandedCode, setExpandedCode] = useState<string | null>(null);
  const [comparisonCodes, setComparisonCodes] = useState<string[]>([]);
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [results, setResults] = useState<FlagComparisonResult[]>([]);
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feeFlag, setFeeFlag] = useState<string>("");
  const [feeResult, setFeeResult] = useState<FlagFeeEstimateResponse | null>(null);
  const [feeLoading, setFeeLoading] = useState(false);
  const [feeError, setFeeError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadFlags() {
      setFlagsLoading(true);
      setFlagsError(null);
      try {
        const response = await getFlagRegistries();
        if (cancelled) return;
        setFlags(response.registries);
        setExpandedCode(response.registries[0]?.code ?? null);
        setComparisonCodes(response.registries.slice(0, 2).map((f) => f.code));
        setFeeFlag(response.registries[0]?.code ?? "");
      } catch (err) {
        if (!cancelled) setFlagsError(err instanceof Error ? err.message : String(err));
      } finally {
        if (!cancelled) setFlagsLoading(false);
      }
    }
    loadFlags().catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const selected = useMemo(
    () => results.find((r) => r.code === selectedCode) ?? results[0] ?? null,
    [results, selectedCode],
  );

  const comparisonFlags = useMemo(() => {
    const codes = comparisonCodes.length ? comparisonCodes.slice(0, 2) : flags.slice(0, 2).map((f) => f.code);
    return codes.map((code) => flags.find((flag) => flag.code === code)).filter((flag): flag is FlagRegistry => Boolean(flag)).slice(0, 2);
  }, [comparisonCodes, flags]);

  async function runCompare() {
    setMode("advice");
    setLoading(true);
    setError(null);
    try {
      const response = await compareFlags(asInput(form));
      setResults(response.results);
      setSelectedCode(response.results[0]?.code ?? null);
      if (response.results.length >= 2) setComparisonCodes(response.results.slice(0, 2).map((f) => f.code));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  function selectComparison(code: string, slot: 0 | 1) {
    setComparisonCodes((current) => {
      const next = current.length ? current.slice(0, 2) : flags.slice(0, 2).map((f) => f.code);
      next[slot] = code;
      if (next[0] === next[1]) {
        const fallback = flags.find((flag) => flag.code !== code)?.code;
        next[slot === 0 ? 1 : 0] = fallback ?? code;
      }
      return next.filter(Boolean).slice(0, 2);
    });
  }

  async function runFeeEstimate() {
    if (!feeFlag) return;
    setFeeLoading(true);
    setFeeError(null);
    try {
      setFeeResult(
        await estimateFlagFees({
          flag: feeFlag,
          registration_type: form.use_type,
          loa_m: toNumber(form.loa_m),
          gt: toNumber(form.gt),
          mortgage_required: form.mortgage_needed,
          radio_licence_required: true,
          provisional_or_permanent: form.registration_type === "new_registration" ? "permanent" : "reflag",
        }),
      );
    } catch (err) {
      setFeeError(err instanceof Error ? err.message : String(err));
    } finally {
      setFeeLoading(false);
    }
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background, paddingTop: isWeb ? 67 : insets.top + 56 }]}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 42 }, isWeb && styles.webScroll]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.headerShell, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
          <View style={styles.topbar}>
            <Pressable onPress={() => router.back()} style={[styles.iconButton, { backgroundColor: colors.secondary }]}>
              <Feather name="arrow-left" size={22} color={colors.foreground} />
            </Pressable>
            <View style={{ flex: 1 }}>
              <Text style={[styles.kicker, { color: colors.primary }]}>REGISTRY ADVISOR</Text>
              <Text style={[styles.title, { color: colors.foreground }, isAcid ? styles.acidTitle : null]}>Flag Intelligence</Text>
              <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Registry cards, advisory ranking and side-by-side comparison.</Text>
            </View>
          </View>
        </View>

        <View style={styles.modeList}>
          {MODES.map((item) => (
            <Pressable
              key={item.key}
              onPress={() => setMode(item.key)}
              style={[
                styles.modeRow,
                { backgroundColor: colors.card, borderColor: colors.border },
                mode === item.key && [styles.modeRowActive, { backgroundColor: colors.glow ?? colors.secondary, borderColor: colors.primary }],
                isAcid ? styles.acidPanelGlow : null,
              ]}
            >
              <View style={[styles.modeIcon, { backgroundColor: colors.secondary }]}>
                <Feather name={item.icon} size={18} color={mode === item.key ? colors.primary : colors.mutedForeground} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.modeTitle, { color: colors.foreground }]}>{item.title}</Text>
                <Text style={[styles.modeSubtitle, { color: colors.mutedForeground }]}>{item.subtitle}</Text>
              </View>
              <Feather name={mode === item.key ? "chevron-down" : "chevron-right"} size={20} color={colors.mutedForeground} />
            </Pressable>
          ))}
        </View>

        {flagsLoading ? (
          <View style={[styles.centerPanel, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : flagsError ? (
          <View style={[styles.centerPanel, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="alert-circle" size={28} color={RED} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Could not load flags</Text>
            <Text style={[styles.emptyCopy, { color: colors.mutedForeground }]}>{flagsError}</Text>
          </View>
        ) : mode === "flags" ? (
          <AllFlags
            flags={flags}
            expandedCode={expandedCode}
            onToggle={(code) => setExpandedCode((current) => (current === code ? null : code))}
            feeFlag={feeFlag}
            onFeeFlagChange={setFeeFlag}
            feeResult={feeResult}
            feeLoading={feeLoading}
            feeError={feeError}
            onRunFeeEstimate={runFeeEstimate}
          />
        ) : mode === "advice" ? (
          <Advice
            form={form}
            setForm={setForm}
            results={results}
            selected={selected}
            selectedCode={selectedCode}
            setSelectedCode={setSelectedCode}
            loading={loading}
            error={error}
            runCompare={runCompare}
          />
        ) : (
          <Comparison
            flags={flags}
            comparisonFlags={comparisonFlags}
            comparisonCodes={comparisonCodes}
            onSelect={selectComparison}
          />
        )}
      </ScrollView>
    </View>
  );
}

function AllFlags({
  flags,
  expandedCode,
  onToggle,
  feeFlag,
  onFeeFlagChange,
  feeResult,
  feeLoading,
  feeError,
  onRunFeeEstimate,
}: {
  flags: FlagRegistry[];
  expandedCode: string | null;
  onToggle: (code: string) => void;
  feeFlag: string;
  onFeeFlagChange: (code: string) => void;
  feeResult: FlagFeeEstimateResponse | null;
  feeLoading: boolean;
  feeError: string | null;
  onRunFeeEstimate: () => void;
}) {
  const { colors, isAcid } = useTheme();
  return (
    <View style={[styles.panel, { backgroundColor: colors.card, borderColor: colors.border }, isAcid ? styles.acidPanelGlow : null]}>
      <Text style={[styles.panelTitle, { color: colors.foreground }]}>All Flags</Text>
      {flags.map((flag) => {
        const expanded = expandedCode === flag.code;
        return (
          <View key={flag.code} style={styles.flagRowWrap}>
            <Pressable
              onPress={() => onToggle(flag.code)}
              style={[
                styles.flagRow,
                { backgroundColor: colors.secondary, borderColor: colors.border },
                expanded && [styles.flagRowActive, { backgroundColor: colors.glow ?? colors.secondary, borderColor: colors.primary }],
              ]}
            >
              <RegistryFlag registry={flag} size="sm" decorative />
              <View style={{ flex: 1 }}>
                <View style={styles.nameLine}>
                  <Text style={[styles.flagTitle, { color: colors.foreground }]}>{flag.flag_name}</Text>
                  {flag.registry_badge ? <StatusBadge label={flag.registry_badge} tone="gold" /> : null}
                </View>
                <Text style={[styles.flagMeta, { color: colors.mutedForeground }]}>{flag.country} / {flag.registry_type} / {processing(flag)}</Text>
              </View>
              <Feather name={expanded ? "chevron-up" : "chevron-down"} size={20} color={colors.mutedForeground} />
            </Pressable>
            {expanded ? <FlagCard flag={flag} /> : null}
          </View>
        );
      })}
      <FeeEstimate
        flags={flags}
        selectedCode={feeFlag}
        onSelect={onFeeFlagChange}
        result={feeResult}
        loading={feeLoading}
        error={feeError}
        onRun={onRunFeeEstimate}
      />
    </View>
  );
}

function Advice({
  form,
  setForm,
  results,
  selected,
  selectedCode,
  setSelectedCode,
  loading,
  error,
  runCompare,
}: {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  results: FlagComparisonResult[];
  selected: FlagComparisonResult | null;
  selectedCode: string | null;
  setSelectedCode: (code: string) => void;
  loading: boolean;
  error: string | null;
  runCompare: () => void;
}) {
  const isWeb = Platform.OS === "web";
  const { colors, isAcid } = useTheme();
  return (
    <View style={[styles.layout, isWeb && styles.webLayout]}>
      <View style={[styles.panel, styles.formPanel, { backgroundColor: colors.card, borderColor: colors.border }, isAcid ? styles.acidPanelGlow : null]}>
        <Text style={[styles.panelTitle, { color: colors.foreground }]}>Registration Advice</Text>
        <View style={styles.segmentRow}>
          <Toggle label="Private" active={form.use_type === "private"} onPress={() => setForm((f) => ({ ...f, use_type: "private", charter: false }))} />
          <Toggle label="Commercial" active={form.use_type === "commercial"} onPress={() => setForm((f) => ({ ...f, use_type: "commercial", charter: true }))} />
        </View>
        <View style={styles.segmentRow}>
          <Toggle label="New registration" active={form.registration_type === "new_registration"} onPress={() => setForm((f) => ({ ...f, registration_type: "new_registration" }))} />
          <Toggle label="Reflag" active={form.registration_type === "reflag"} onPress={() => setForm((f) => ({ ...f, registration_type: "reflag" }))} />
        </View>
        <View style={styles.segmentRow}>
          <Toggle label="Charter" active={form.charter} onPress={() => setForm((f) => ({ ...f, charter: !f.charter }))} />
          <Toggle label="Mortgage needed" active={form.mortgage_needed} onPress={() => setForm((f) => ({ ...f, mortgage_needed: !f.mortgage_needed }))} />
        </View>

        <View style={styles.grid}>
          <Field label="LOA (m)" value={form.loa_m} keyboardType="numeric" onChangeText={(v) => setForm((f) => ({ ...f, loa_m: v }))} />
          <Field label="GT" value={form.gt} keyboardType="numeric" onChangeText={(v) => setForm((f) => ({ ...f, gt: v }))} />
          <Field label="Year" value={form.year_built} keyboardType="numeric" onChangeText={(v) => setForm((f) => ({ ...f, year_built: v }))} />
          <Field label="Value EUR" value={form.value_eur} keyboardType="numeric" onChangeText={(v) => setForm((f) => ({ ...f, value_eur: v }))} />
          <Field label="Builder" value={form.builder} onChangeText={(v) => setForm((f) => ({ ...f, builder: v }))} />
          <Field label="Current flag" value={form.current_flag} onChangeText={(v) => setForm((f) => ({ ...f, current_flag: v }))} />
          <Field label="Owner nationality" value={form.owner_nationality} onChangeText={(v) => setForm((f) => ({ ...f, owner_nationality: v }))} />
          <Field label="Owner residency" value={form.owner_residency} onChangeText={(v) => setForm((f) => ({ ...f, owner_residency: v }))} />
          <Field label="Company country" value={form.company_country} onChangeText={(v) => setForm((f) => ({ ...f, company_country: v }))} />
          <Field label="Crew nationality" value={form.crew_nationality} onChangeText={(v) => setForm((f) => ({ ...f, crew_nationality: v }))} />
          <Field label="Planned charter days / year" value={form.planned_charter_days} keyboardType="numeric" onChangeText={(v) => setForm((f) => ({ ...f, planned_charter_days: v }))} />
          <Field label="Navigation area" value={form.navigation_area} multiline onChangeText={(v) => setForm((f) => ({ ...f, navigation_area: v }))} />
          <Field label="Intended cruising area" value={form.intended_cruising_area} multiline onChangeText={(v) => setForm((f) => ({ ...f, intended_cruising_area: v }))} />
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        <Pressable onPress={runCompare} disabled={loading} style={[styles.primaryButton, { backgroundColor: colors.primary }, loading && { opacity: 0.7 }]}>
          {loading ? <ActivityIndicator color={colors.background} /> : <Feather name="compass" size={18} color={colors.background} />}
          <Text style={[styles.primaryText, { color: colors.background }]}>Get advice</Text>
        </Pressable>
      </View>

      <View style={[styles.panel, styles.resultPanel, { backgroundColor: colors.card, borderColor: colors.border }, isAcid ? styles.acidPanelGlow : null]}>
        <Text style={[styles.panelTitle, { color: colors.foreground }]}>Recommended Ranking</Text>
        {results.length === 0 ? (
          <View style={styles.emptyState}>
            <Feather name="flag" size={28} color={colors.primary} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Ready to advise</Text>
            <Text style={[styles.emptyCopy, { color: colors.mutedForeground }]}>Complete the yacht profile to rank the strongest registration options.</Text>
          </View>
        ) : (
          <>
            {results.slice(0, 6).map((flag, index) => {
              const active = selectedCode === flag.code;
              return (
                <Pressable key={flag.code} onPress={() => setSelectedCode(flag.code)} style={[styles.rankCard, { backgroundColor: colors.secondary, borderColor: colors.border }, active && [styles.rankCardActive, { backgroundColor: colors.glow ?? colors.secondary, borderColor: colors.primary }]]}>
                  <Text style={[styles.rankNumber, { color: colors.primary }]}>{index + 1}</Text>
                  <RegistryFlag registry={flag} size="sm" decorative />
                  <View style={{ flex: 1 }}>
                    <View style={styles.nameLine}>
                      <Text style={[styles.rankTitle, { color: colors.foreground }]}>{flag.flag_name}</Text>
                      {flag.registry_badge ? <StatusBadge label={flag.registry_badge} tone="gold" /> : null}
                    </View>
                    <Text style={[styles.rankSub, { color: colors.mutedForeground }]}>{flag.fit_summary}</Text>
                    <Text style={[styles.rankSub, { color: colors.mutedForeground }]}>
                      First-year registry cost: {money(flag.first_year_registry_cost_eur ?? null)} / registration {money(flag.registration_cost_eur)} / annual {money(flag.annual_fee_eur)}
                    </Text>
                  </View>
                  <Text style={[styles.score, { color: scoreColor(flag.score) }]}>{flag.score}</Text>
                </Pressable>
              );
            })}
            {selected ? (
              <View style={styles.detailCard}>
                <View style={styles.detailHeader}>
                  <RegistryFlag registry={selected} size="lg" />
                  <View>
                    <View style={styles.nameLine}>
                      <Text style={styles.detailTitle}>{selected.flag_name}</Text>
                      {selected.registry_badge ? <StatusBadge label={selected.registry_badge} tone="gold" /> : null}
                    </View>
                    <Text style={styles.detailSub}>{selected.country} / {selected.recommendation.replace(/_/g, " ")}</Text>
                  </View>
                  <View style={styles.scoreBadge}>
                    <Text style={styles.scoreBadgeText}>{selected.score}/100</Text>
                  </View>
                </View>
                <TextBlock title="Size Fit" text={textOrVerify(selected.size_summary)} />
                <TextBlock title="Registry Cost" text={textOrVerify(selected.cost_summary)} />
                <InfoList title="Registry Cost Breakdown" items={selected.registry_cost_breakdown?.length ? selected.registry_cost_breakdown : ["Fee components are not verified for this flag yet."]} icon="dollar-sign" />
                <TextBlock title="Eligibility" text={textOrVerify(selected.eligibility_summary)} />
                <TextBlock title="VAT / Tax" text={textOrVerify(selected.tax_vat_summary)} />
                <InfoList title="VAT Conditions" items={selected.vat_conditions?.length ? selected.vat_conditions : ["VAT conditions require specialist verification for this profile."]} icon="percent" />
                <TextBlock title="Charter Use" text={textOrVerify(selected.charter_summary)} />
                <TextBlock title="Charter Day Limit" text={textOrVerify(selected.charter_limit_summary)} />
                <TextBlock title="Compliance" text={textOrVerify(selected.compliance_summary)} />
                {selected.decision_drivers?.length ? (
                  <InfoList title="Decision Logic" items={selected.decision_drivers} icon="compass" />
                ) : null}
                <InfoList title="Why it fits" items={selected.positives.length ? selected.positives : selected.advantages} icon="check" />
                <InfoList title="Risks to review" items={selected.risks.length ? selected.risks : selected.disadvantages} icon="alert-triangle" />
              </View>
            ) : null}
          </>
        )}
      </View>
    </View>
  );
}

function Comparison({
  flags,
  comparisonFlags,
  comparisonCodes,
  onSelect,
}: {
  flags: FlagRegistry[];
  comparisonFlags: FlagRegistry[];
  comparisonCodes: string[];
  onSelect: (code: string, slot: 0 | 1) => void;
}) {
  const [activeSlot, setActiveSlot] = useState<0 | 1>(0);
  const [category, setCategory] = useState<CompareCategory>("overview");
  const left = comparisonFlags[0];
  const right = comparisonFlags[1];
  const categories: Array<{ key: CompareCategory; label: string; icon: React.ComponentProps<typeof Feather>["name"] }> = [
    { key: "overview", label: "Overview", icon: "grid" },
    { key: "cost", label: "Cost", icon: "dollar-sign" },
    { key: "vat", label: "VAT / Tax", icon: "percent" },
    { key: "eu", label: "EU Use", icon: "globe" },
    { key: "commercial", label: "Charter", icon: "briefcase" },
    { key: "eligibility", label: "Eligibility", icon: "user-check" },
    { key: "survey", label: "Survey / Class", icon: "check-square" },
    { key: "mortgage", label: "Mortgage", icon: "shield" },
    { key: "crew", label: "Crew", icon: "users" },
    { key: "timing", label: "Timing", icon: "clock" },
    { key: "risks", label: "Risks", icon: "alert-triangle" },
    { key: "full", label: "Full Text", icon: "book-open" },
  ];
  const rows = left && right ? comparisonRows(category, left, right) : [];
  return (
    <View style={[styles.panel, styles.feeEstimatePanel]}>
      <Text style={styles.panelTitle}>Comparison</Text>
      <Text style={styles.panelCopy}>Choose exactly two flags, then filter the comparison by cost, VAT, EU use, commercial charter, ownership, class, mortgage, crew, timing or full text.</Text>
      <View style={styles.compareSlotRow}>
        {[0, 1].map((slot) => {
          const flag = comparisonFlags[slot];
          return (
            <Pressable key={slot} onPress={() => setActiveSlot(slot as 0 | 1)} style={[styles.compareSlot, activeSlot === slot && styles.compareSlotActive]}>
              <Text style={[styles.compareSlotLabel, activeSlot === slot && styles.compareSlotLabelActive]}>Flag {slot === 0 ? "A" : "B"}</Text>
              <Text style={styles.compareSlotValue}>{flag?.flag_name ?? "Select flag"}</Text>
            </Pressable>
          );
        })}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.compareSelectRow}>
        {flags.map((flag) => (
          <Pressable key={flag.code} onPress={() => onSelect(flag.code, activeSlot)} style={[styles.compareChip, comparisonCodes.includes(flag.code) && styles.compareChipActive]}>
            <RegistryFlag registry={flag} size="xs" decorative />
            <Text style={[styles.compareChipText, comparisonCodes.includes(flag.code) && styles.compareChipTextActive]}>{flag.flag_name}</Text>
          </Pressable>
        ))}
      </ScrollView>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.compareFilterRow}>
        {categories.map((item) => (
          <Pressable key={item.key} onPress={() => setCategory(item.key)} style={[styles.compareFilter, category === item.key && styles.compareFilterActive]}>
            <Feather name={item.icon} size={14} color={category === item.key ? GOLD : MUTED} />
            <Text style={[styles.compareFilterText, category === item.key && styles.compareFilterTextActive]}>{item.label}</Text>
          </Pressable>
        ))}
      </ScrollView>
      {left && right ? (
        category === "full" ? (
          <View style={styles.fullCompareGrid}>
            <CompareArticle flag={left} />
            <CompareArticle flag={right} />
          </View>
        ) : (
          <View style={styles.compareTable}>
            <View style={styles.compareTableHeader}>
              <View style={styles.compareMetricCell}>
                <Text style={styles.compareMetricTitle}>{categories.find((item) => item.key === category)?.label}</Text>
              </View>
              <CompareFlagHeader flag={left} />
              <CompareFlagHeader flag={right} />
            </View>
            {rows.map((row) => (
              <View key={row.label} style={styles.compareRow}>
                <View style={styles.compareMetricCell}>
                  <Text style={styles.compareMetricLabel}>{row.label}</Text>
                </View>
                <View style={styles.compareValueCell}>
                  <Text style={styles.compareValueText}>{row.left}</Text>
                </View>
                <View style={styles.compareValueCell}>
                  <Text style={styles.compareValueText}>{row.right}</Text>
                </View>
              </View>
            ))}
          </View>
        )
      ) : (
        <Text style={styles.warningText}>Select two flags to compare.</Text>
      )}
    </View>
  );
}

type CompareRow = { label: string; left: string; right: string };

function compareRow(label: string, left: string | null | undefined, right: string | null | undefined): CompareRow {
  return { label, left: textOrVerify(left), right: textOrVerify(right) };
}

function firstYearRegistryCost(flag: FlagRegistry): string {
  const total = (flag.registration_cost_eur ?? 0) + (flag.annual_fee_eur ?? 0);
  if (flag.registration_cost_eur == null && flag.annual_fee_eur == null) return "To verify";
  return `${money(total)} (${money(flag.registration_cost_eur)} registration + ${money(flag.annual_fee_eur)} annual)`;
}

function listText(items: string[] | null | undefined): string {
  return items?.length ? items.join("; ") : "To verify";
}

function euUseSummary(flag: FlagRegistry): string {
  const advisor = flag.advisor;
  if (advisor?.is_eu_flag) {
    return "EU flag. Suitable for EU-based operation subject to the flag state's VAT, commercial and local charter rules.";
  }
  return "Non-EU flag. EU use normally depends on Temporary Admission, customs/VAT position, charter permits and local operating limits.";
}

function commercialVatSummary(flag: FlagRegistry): string {
  const note = flag.advisor?.vat_tax_note ?? flag.vat_notes;
  if (!note) return "To verify";
  return note;
}

function comparisonRows(category: CompareCategory, left: FlagRegistry, right: FlagRegistry): CompareRow[] {
  const leftAdvisor = left.advisor;
  const rightAdvisor = right.advisor;
  switch (category) {
    case "cost":
      return [
        compareRow("Initial registration", money(left.registration_cost_eur), money(right.registration_cost_eur)),
        compareRow("Annual registry fee", money(left.annual_fee_eur), money(right.annual_fee_eur)),
        compareRow("First-year registry cost", firstYearRegistryCost(left), firstYearRegistryCost(right)),
        compareRow("Mortgage registration", yesNo(left.mortgage_available), yesNo(right.mortgage_available)),
        compareRow("Radio licence", yesNo(left.radio_license), yesNo(right.radio_license)),
        compareRow("External costs", "Legal, company, class, survey, VAT/tax and crew costs excluded unless stored as confirmed registry fees.", "Legal, company, class, survey, VAT/tax and crew costs excluded unless stored as confirmed registry fees."),
      ];
    case "vat":
      return [
        compareRow("VAT / tax note", commercialVatSummary(left), commercialVatSummary(right)),
        compareRow("Commercial yacht VAT treatment", commercialVatSummary(left), commercialVatSummary(right)),
        compareRow("EU VAT exposure", euUseSummary(left), euUseSummary(right)),
        compareRow("Corporate / ownership note", leftAdvisor?.foreign_company_ownership ?? left.company_restrictions, rightAdvisor?.foreign_company_ownership ?? right.company_restrictions),
      ];
    case "eu":
      return [
        compareRow("EU flag", yesNo(Boolean(leftAdvisor?.is_eu_flag)), yesNo(Boolean(rightAdvisor?.is_eu_flag))),
        compareRow("EU / Mediterranean use", euUseSummary(left), euUseSummary(right)),
        compareRow("Owner eligibility", leftAdvisor?.owner_eligibility ?? left.owner_nationality_restrictions, rightAdvisor?.owner_eligibility ?? right.owner_nationality_restrictions),
        compareRow("Local agent / establishment", leftAdvisor?.local_agent_requirement, rightAdvisor?.local_agent_requirement),
        compareRow("Charter suitability", statusLabel(leftAdvisor?.commercial_registration_status), statusLabel(rightAdvisor?.commercial_registration_status)),
      ];
    case "commercial":
      return [
        compareRow("Commercial registration", statusLabel(leftAdvisor?.commercial_registration_status), statusLabel(rightAdvisor?.commercial_registration_status)),
        compareRow("Commercial minimum LOA", leftAdvisor?.commercial_minimum_loa, rightAdvisor?.commercial_minimum_loa),
        compareRow("Commercial yacht code", leftAdvisor?.commercial_yacht_code, rightAdvisor?.commercial_yacht_code),
        compareRow("Passenger limit", leftAdvisor?.passenger_limit_notes, rightAdvisor?.passenger_limit_notes),
        compareRow("Required documents", leftAdvisor?.required_documents_summary, rightAdvisor?.required_documents_summary),
      ];
    case "eligibility":
      return [
        compareRow("Owner eligibility", leftAdvisor?.owner_eligibility ?? left.owner_nationality_restrictions, rightAdvisor?.owner_eligibility ?? right.owner_nationality_restrictions),
        compareRow("Foreign company ownership", leftAdvisor?.foreign_company_ownership ?? left.company_restrictions, rightAdvisor?.foreign_company_ownership ?? right.company_restrictions),
        compareRow("Local / resident agent", leftAdvisor?.local_agent_requirement, rightAdvisor?.local_agent_requirement),
        compareRow("Private availability", yesNo(left.private_available), yesNo(right.private_available)),
        compareRow("Commercial availability", yesNo(left.commercial_available), yesNo(right.commercial_available)),
      ];
    case "survey":
      return [
        compareRow("Survey required", left.survey_required ? "Required" : "Case by case", right.survey_required ? "Required" : "Case by case"),
        compareRow("Survey / inspection", leftAdvisor?.survey_inspection_requirement, rightAdvisor?.survey_inspection_requirement),
        compareRow("Classification required", left.classification_required ? "Required" : "Case by case", right.classification_required ? "Required" : "Case by case"),
        compareRow("Classification detail", leftAdvisor?.classification_requirement, rightAdvisor?.classification_requirement),
        compareRow("Accepted class", listText(left.accepted_class), listText(right.accepted_class)),
      ];
    case "mortgage":
      return [
        compareRow("Mortgage available", yesNo(left.mortgage_available), yesNo(right.mortgage_available)),
        compareRow("Mortgage status", leftAdvisor?.mortgage_registration_status, rightAdvisor?.mortgage_registration_status),
        compareRow("Insurance acceptance", left.insurance_notes, right.insurance_notes),
        compareRow("Registry family", leftAdvisor?.registry_family ?? left.registry_type, rightAdvisor?.registry_family ?? right.registry_type),
      ];
    case "crew":
      return [
        compareRow("Crew note", leftAdvisor?.crew_note ?? left.crew_restrictions, rightAdvisor?.crew_note ?? right.crew_restrictions),
        compareRow("Minimum safe manning", leftAdvisor?.minimum_safe_manning, rightAdvisor?.minimum_safe_manning),
        compareRow("Commercial operations", statusLabel(leftAdvisor?.commercial_registration_status), statusLabel(rightAdvisor?.commercial_registration_status)),
      ];
    case "timing":
      return [
        compareRow("Processing time", leftAdvisor?.indicative_processing_time ?? processing(left), rightAdvisor?.indicative_processing_time ?? processing(right)),
        compareRow("Provisional registration", leftAdvisor?.provisional_registration_status, rightAdvisor?.provisional_registration_status),
        compareRow("Provisional validity", leftAdvisor?.provisional_validity, rightAdvisor?.provisional_validity),
        compareRow("Permanent validity", leftAdvisor?.permanent_validity, rightAdvisor?.permanent_validity),
      ];
    case "risks":
      return [
        compareRow("Advantages", leftAdvisor?.objective_advantages ?? listText(left.advantages), rightAdvisor?.objective_advantages ?? listText(right.advantages)),
        compareRow("Limitations / risks", leftAdvisor?.limitations_and_risks ?? listText(left.disadvantages), rightAdvisor?.limitations_and_risks ?? listText(right.disadvantages)),
        compareRow("Missing verification", leftAdvisor?.missing_verification_notes, rightAdvisor?.missing_verification_notes),
        compareRow("Data quality", statusLabel(leftAdvisor?.data_quality_status), statusLabel(rightAdvisor?.data_quality_status)),
      ];
    case "overview":
    default:
      return [
        compareRow("Registry family", leftAdvisor?.registry_family ?? left.registry_type, rightAdvisor?.registry_family ?? right.registry_type),
        compareRow("Country / territory", leftAdvisor?.country_or_territory ?? left.country, rightAdvisor?.country_or_territory ?? right.country),
        compareRow("EU flag", yesNo(Boolean(leftAdvisor?.is_eu_flag)), yesNo(Boolean(rightAdvisor?.is_eu_flag))),
        compareRow("Private registration", statusLabel(leftAdvisor?.private_registration_status), statusLabel(rightAdvisor?.private_registration_status)),
        compareRow("Commercial registration", statusLabel(leftAdvisor?.commercial_registration_status), statusLabel(rightAdvisor?.commercial_registration_status)),
        compareRow("Processing", leftAdvisor?.indicative_processing_time ?? processing(left), rightAdvisor?.indicative_processing_time ?? processing(right)),
        compareRow("Coverage", statusLabel(leftAdvisor?.coverage_status), statusLabel(rightAdvisor?.coverage_status)),
      ];
  }
}

function CompareFlagHeader({ flag }: { flag: FlagRegistry }) {
  return (
    <View style={styles.compareHeaderCell}>
      <RegistryFlag registry={flag} size="xs" decorative />
      <Text style={styles.compareHeaderTitle}>{flag.flag_name}</Text>
      <Text style={styles.compareHeaderSub}>{flag.registry_badge ?? flag.country}</Text>
    </View>
  );
}

function CompareArticle({ flag }: { flag: FlagRegistry }) {
  const advisor = flag.advisor;
  return (
    <View style={styles.fullCompareCard}>
      <View style={styles.compareHeader}>
        <RegistryFlag registry={flag} size="sm" />
        <View style={{ flex: 1 }}>
          <Text style={styles.compareTitle}>{flag.flag_name}</Text>
          <Text style={styles.detailSub}>{advisor?.registry_family ?? flag.registry_type}</Text>
        </View>
      </View>
      <TextBlock title="Registry" text={`${textOrVerify(advisor?.official_registry_name)}. ${textOrVerify(advisor?.country_or_territory ?? flag.country)}.`} />
      <TextBlock title="Eligibility" text={textOrVerify(advisor?.owner_eligibility ?? flag.owner_nationality_restrictions)} />
      <TextBlock title="Company / agent" text={textOrVerify(advisor?.foreign_company_ownership ?? advisor?.local_agent_requirement ?? flag.company_restrictions)} />
      <TextBlock title="Registration / use" text={`Private: ${statusLabel(advisor?.private_registration_status)}. Commercial: ${statusLabel(advisor?.commercial_registration_status)}. ${textOrVerify(advisor?.required_documents_summary)}`} />
      <TextBlock title="VAT / tax" text={commercialVatSummary(flag)} />
      <TextBlock title="Survey / class" text={`${textOrVerify(advisor?.survey_inspection_requirement)} ${textOrVerify(advisor?.classification_requirement)}`} />
      <TextBlock title="Crew" text={textOrVerify(advisor?.crew_note ?? flag.crew_restrictions)} />
      <TextBlock title="Mortgage / insurance" text={`${textOrVerify(advisor?.mortgage_registration_status)} ${textOrVerify(flag.insurance_notes)}`} />
      <InfoList title="Advantages" items={flag.advantages} icon="check" />
      <InfoList title="Risks" items={flag.disadvantages} icon="alert-triangle" />
      {advisor?.advisor_sections?.length ? <AdvisorSections sections={advisor.advisor_sections} /> : null}
    </View>
  );
}

function FeeEstimate({
  flags,
  selectedCode,
  onSelect,
  result,
  loading,
  error,
  onRun,
}: {
  flags: FlagRegistry[];
  selectedCode: string;
  onSelect: (code: string) => void;
  result: FlagFeeEstimateResponse | null;
  loading: boolean;
  error: string | null;
  onRun: () => void;
}) {
  return (
    <View style={styles.panel}>
      <Text style={styles.panelTitle}>Registration Cost Calculator</Text>
      <Text style={styles.panelCopy}>
        Quick confirmed registry-fee estimate for the selected flag. External legal, company, class, survey, tax, VAT, insurance and crew costs are excluded unless explicitly stored as official registry fees.
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.compareSelectRow}>
        {flags.map((flag) => (
          <Pressable key={flag.code} onPress={() => onSelect(flag.code)} style={[styles.compareChip, selectedCode === flag.code && styles.compareChipActive]}>
            <RegistryFlag registry={flag} size="xs" decorative />
            <Text style={[styles.compareChipText, selectedCode === flag.code && styles.compareChipTextActive]}>{flag.flag_name}</Text>
          </Pressable>
        ))}
      </ScrollView>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      <Pressable onPress={onRun} disabled={loading || !selectedCode} style={[styles.primaryButton, loading && { opacity: 0.7 }]}>
        {loading ? <ActivityIndicator color={NAVY} /> : <Feather name="dollar-sign" size={18} color={NAVY} />}
        <Text style={styles.primaryText}>Estimate registry cost</Text>
      </Pressable>
      {result ? (
        <View style={styles.feeResult}>
          <Text style={styles.warningText}>{result.label}</Text>
          <View style={styles.factGrid}>
            {Object.entries(result.totals_by_currency).map(([currency, amount]) => (
              <Fact key={currency} label={`Total ${currency}`} value={`${currency} ${amount.toLocaleString("en-GB")}`} />
            ))}
            <Fact label="Confirmed items" value={String(result.confirmed_registry_fees.length)} />
            <Fact label="Formula items" value={String(result.formula_based_fees.length)} />
            <Fact label="Quote required" value={String(result.separately_quoted_fees.length)} />
          </View>
          <TextBlock title="Excluded external costs" text={result.excluded_external_costs.join(", ")} />
          {result.missing_data.length ? <TextBlock title="Missing data" text={result.missing_data.join("; ")} /> : null}
        </View>
      ) : null}
    </View>
  );
}

function FlagCard({ flag }: { flag: FlagRegistry }) {
  const { colors, isAcid } = useTheme();
  const advisor = flag.advisor;
  return (
    <View style={[styles.flagCard, { backgroundColor: colors.card, borderColor: colors.border }, isAcid ? styles.acidPanelGlow : null]}>
      <View style={styles.flagCardHeader}>
        <RegistryFlag registry={flag} size={Platform.OS === "web" ? "hero" : "lg"} />
        <View style={{ flex: 1 }}>
          <View style={styles.nameLine}>
            <Text style={[styles.detailTitle, { color: colors.foreground }]}>{flag.flag_name}</Text>
            {flag.registry_badge ? <StatusBadge label={flag.registry_badge} tone="gold" /> : null}
          </View>
          {flag.registry_badge === "MAR" ? <Text style={[styles.detailSub, { color: colors.mutedForeground }]}>Portuguese International Shipping Register</Text> : null}
          {flag.flag_note ? <Text style={[styles.flagNote, { color: colors.primary }]}>{flag.flag_note}</Text> : null}
        </View>
      </View>
      <DossierSection title="Snapshot">
        <View style={styles.statusRow}>
          <StatusBadge label={advisor?.is_eu_flag ? "EU flag" : "Non-EU flag"} tone={advisor?.is_eu_flag ? "green" : "gold"} />
          <StatusBadge label={statusLabel(advisor?.confidence_level)} tone="gold" />
          <StatusBadge label={statusLabel(advisor?.coverage_status)} tone={advisor?.data_quality_status === "research_required" ? "red" : "green"} />
          <StatusBadge label={statusLabel(advisor?.data_quality_status)} tone={advisor?.data_quality_status === "research_required" ? "red" : "green"} />
        </View>
        <View style={styles.factGrid}>
          <Fact label="Private" value={yesNo(flag.private_available)} />
          <Fact label="Commercial" value={yesNo(flag.commercial_available)} />
          <Fact label="Registration cost" value={money(flag.registration_cost_eur)} />
          <Fact label="Annual fees" value={money(flag.annual_fee_eur)} />
          <Fact label="Processing" value={processing(flag)} />
          <Fact label="Mortgage" value={yesNo(flag.mortgage_available)} />
        </View>
      </DossierSection>

      <DossierSection title="Registry / legal framework">
        <TextBlock title="Official registry" text={textOrVerify(advisor?.official_registry_name)} />
        <View style={styles.factGrid}>
          <Fact label="Country / territory" value={textOrVerify(advisor?.country_or_territory ?? flag.country)} />
          <Fact label="Registry family" value={textOrVerify(advisor?.registry_family ?? flag.registry_type)} />
          <Fact label="Max LOA / GT" value={textOrVerify(advisor?.maximum_loa_gt_notes)} />
          <Fact label="Last verified" value={textOrVerify(advisor?.last_verified_at ?? flag.last_updated)} />
        </View>
      </DossierSection>

      <DossierSection title="Eligibility">
        <TextBlock title="Owner eligibility" text={textOrVerify(advisor?.owner_eligibility ?? flag.owner_nationality_restrictions)} />
        <TextBlock title="Foreign company ownership" text={textOrVerify(advisor?.foreign_company_ownership ?? flag.company_restrictions)} />
        <TextBlock title="Local / resident agent" text={textOrVerify(advisor?.local_agent_requirement)} />
      </DossierSection>

      <DossierSection title="Registration / use">
        <View style={styles.factGrid}>
          <Fact label="Private status" value={statusLabel(advisor?.private_registration_status)} />
          <Fact label="Commercial status" value={statusLabel(advisor?.commercial_registration_status)} />
          <Fact label="Private minimum LOA" value={textOrVerify(advisor?.private_minimum_loa)} />
          <Fact label="Commercial minimum LOA" value={textOrVerify(advisor?.commercial_minimum_loa)} />
          <Fact label="Temporary registration" value={yesNo(flag.temporary_registration)} />
          <Fact label="Permanent registration" value={yesNo(flag.permanent_registration)} />
          <Fact label="Radio license" value={yesNo(flag.radio_license)} />
          <Fact label="Passenger limit" value={textOrVerify(advisor?.passenger_limit_notes)} />
        </View>
        <TextBlock title="Provisional registration" text={`${statusLabel(advisor?.provisional_registration_status)} / ${textOrVerify(advisor?.provisional_validity)}`} />
        <TextBlock title="Permanent validity" text={textOrVerify(advisor?.permanent_validity)} />
        <TextBlock title="Required documents" text={textOrVerify(advisor?.required_documents_summary)} />
      </DossierSection>

      <DossierSection title="Tax / VAT">
        <TextBlock title="VAT / tax note" text={textOrVerify(advisor?.vat_tax_note ?? flag.vat_notes)} />
      </DossierSection>

      <DossierSection title="Operations">
        <View style={styles.factGrid}>
          <Fact label="Survey" value={flag.survey_required ? "Required" : "Case by case"} />
          <Fact label="Classification" value={flag.classification_required ? "Required" : "Case by case"} />
          <Fact label="Accepted class" value={flag.accepted_class.length ? flag.accepted_class.join(", ") : "To verify"} />
          <Fact label="Safe manning" value={textOrVerify(advisor?.minimum_safe_manning)} />
        </View>
        <TextBlock title="Crew" text={textOrVerify(advisor?.crew_note ?? flag.crew_restrictions)} />
        <TextBlock title="Classification requirement" text={textOrVerify(advisor?.classification_requirement)} />
        <TextBlock title="Survey / inspection requirement" text={textOrVerify(advisor?.survey_inspection_requirement)} />
        <TextBlock title="Commercial yacht code" text={textOrVerify(advisor?.commercial_yacht_code)} />
      </DossierSection>

      <DossierSection title="Banking / insurance">
        <View style={styles.factGrid}>
          <Fact label="Mortgage" value={yesNo(flag.mortgage_available)} />
          <Fact label="Mortgage status" value={textOrVerify(advisor?.mortgage_registration_status)} />
        </View>
        <TextBlock title="Insurance" text={textOrVerify(flag.insurance_notes)} />
      </DossierSection>

      {advisor?.advisor_sections?.length ? (
        <DossierSection title="Detailed guide">
          <AdvisorSections sections={advisor.advisor_sections} />
        </DossierSection>
      ) : null}

      <DossierSection title="Advantages">
        <InfoList items={flag.advantages} icon="check" />
      </DossierSection>

      <DossierSection title="Risks">
        <InfoList items={flag.disadvantages} icon="alert-circle" />
      </DossierSection>

      {advisor?.missing_verification_notes ? (
        <DossierSection title="Verification">
          <TextBlock title="Missing / next verification" text={advisor.missing_verification_notes} />
        </DossierSection>
      ) : null}

      <DossierSection title="Legal / registration partners">
        {flag.legal_partners.length ? (
          flag.legal_partners.map((partner) => (
            <View key={partner.name} style={[styles.partnerCard, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
              <Text style={[styles.partnerName, { color: colors.foreground }]}>{partner.name}</Text>
              <Text style={[styles.partnerText, { color: colors.mutedForeground }]}>{partner.notes ?? partner.contact_url ?? partner.email ?? partner.phone ?? "Contact details to verify."}</Text>
            </View>
          ))
        ) : (
          <Text style={[styles.bodyText, { color: colors.mutedForeground }]}>No preferred legal partner has been assigned to this flag yet.</Text>
        )}
      </DossierSection>
    </View>
  );
}

function DossierSection({ title, children }: { title: string; children: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.dossierSection, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.dossierSectionHeader, { backgroundColor: colors.secondary, borderBottomColor: colors.border }]}>
        <Text style={[styles.dossierSectionTitle, { color: colors.primary }]}>{title}</Text>
      </View>
      <View style={styles.dossierSectionBody}>{children}</View>
    </View>
  );
}

function AdvisorSections({ sections }: { sections: NonNullable<NonNullable<FlagRegistry["advisor"]>["advisor_sections"]> }) {
  const { colors } = useTheme();
  if (!sections.length) return null;
  return (
    <View style={styles.advisorSections}>
      {sections.map((section, index) => (
        <View key={`${section.title}-${index}`} style={styles.advisorSection}>
          <Text style={[styles.sectionHeading, { color: colors.primary }]}>{section.title}</Text>
          {section.body ? <Text style={[styles.bodyText, { color: colors.mutedForeground }]}>{section.body}</Text> : null}
          {section.items?.length ? (
            <View style={styles.advisorList}>
              {section.items.map((item) => (
                <View key={item} style={styles.listRow}>
                  <Feather name="chevron-right" size={14} color={colors.primary} />
                  <Text style={[styles.bodyText, { color: colors.mutedForeground }]}>{item}</Text>
                </View>
              ))}
            </View>
          ) : null}
          {section.rows?.length ? <AdvisorRows rows={section.rows} /> : null}
        </View>
      ))}
    </View>
  );
}

function AdvisorRows({ rows }: { rows: Array<Record<string, string | number | boolean | null>> }) {
  const { colors } = useTheme();
  return (
    <View style={styles.advisorRows}>
      {rows.map((row, rowIndex) => (
        <View key={rowIndex} style={[styles.advisorRow, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
          {Object.entries(row).map(([key, value]) => (
            <View key={key} style={styles.advisorCell}>
              <Text style={[styles.factLabel, { color: colors.mutedForeground }]}>{key.replace(/_/g, " ")}</Text>
              <Text style={[styles.factValue, { color: colors.foreground }]}>{value == null || value === "" ? "To verify" : String(value)}</Text>
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

function StatusBadge({ label, tone }: { label: string; tone: "green" | "gold" | "red" }) {
  const color = tone === "green" ? GREEN : tone === "red" ? RED : GOLD;
  return (
    <View style={[styles.statusBadge, { borderColor: color }]}>
      <Text style={[styles.statusBadgeText, { color }]}>{label}</Text>
    </View>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.fact, { backgroundColor: colors.secondary }]}>
      <Text style={[styles.factLabel, { color: colors.mutedForeground }]}>{label}</Text>
      <Text style={[styles.factValue, { color: colors.foreground }]}>{value}</Text>
    </View>
  );
}

function TextBlock({ title, text }: { title: string; text: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.textBlock}>
      <Text style={[styles.sectionHeading, { color: colors.primary }]}>{title}</Text>
      <Text style={[styles.bodyText, { color: colors.mutedForeground }]}>{text}</Text>
    </View>
  );
}

function InfoList({ title, items, icon }: { title?: string; items: string[]; icon: React.ComponentProps<typeof Feather>["name"] }) {
  const { colors } = useTheme();
  if (!items.length) return null;
  return (
    <View style={styles.textBlock}>
      {title ? <Text style={[styles.sectionHeading, { color: colors.primary }]}>{title}</Text> : null}
      {items.map((item) => (
        <View key={item} style={styles.listRow}>
          <Feather name={icon} size={14} color={colors.primary} />
          <Text style={[styles.bodyText, { color: colors.mutedForeground }]}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: NAVY },
  headerShell: { paddingBottom: 18, marginBottom: 16, borderBottomWidth: 1, borderBottomColor: DIVIDER, backgroundColor: NAVY },
  webShell: { maxWidth: 1240, width: "100%", alignSelf: "center" },
  scroll: { paddingHorizontal: 22 },
  webScroll: { maxWidth: 1240, width: "100%", alignSelf: "center" },
  topbar: { flexDirection: "row", alignItems: "center", gap: 14 },
  iconButton: { width: 46, height: 46, borderRadius: 23, backgroundColor: NAVY_DEEP, alignItems: "center", justifyContent: "center" },
  kicker: { color: GOLD, fontFamily: "Inter_600SemiBold", fontSize: 12, letterSpacing: 2.4 },
  title: { color: IVORY, fontFamily: "Gilroy-ExtraBold", fontSize: 30, lineHeight: 36, marginTop: 4 },
  acidTitle: {
    color: "#B6FF00",
    letterSpacing: 1.1,
    textTransform: "uppercase",
    textShadowColor: "rgba(255,79,216,0.58)",
    textShadowRadius: 12,
  },
  subtitle: { color: MUTED, fontFamily: "Inter_400Regular", fontSize: 13, lineHeight: 19, marginTop: 4 },
  acidPanelGlow: {
    shadowColor: "#FF4FD8",
    shadowOpacity: 0.16,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 0 },
  },
  modeList: { gap: 10, marginTop: 16, marginBottom: 14 },
  modeRow: { minHeight: 70, flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 14, borderWidth: 1, borderColor: DIVIDER, backgroundColor: NAVY_DEEP, padding: 14 },
  modeRowActive: { borderColor: "rgba(201,169,97,0.55)", backgroundColor: NAVY_ELEV },
  modeIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: NAVY, alignItems: "center", justifyContent: "center" },
  modeTitle: { color: IVORY, fontFamily: "Gilroy-Bold", fontSize: 16 , fontWeight: "700"},
  modeSubtitle: { color: MUTED, fontFamily: "Inter_400Regular", fontSize: 12, lineHeight: 17, marginTop: 3 },
  centerPanel: { minHeight: 260, alignItems: "center", justifyContent: "center", gap: 10, backgroundColor: NAVY_DEEP, borderRadius: 16, borderWidth: 1, borderColor: DIVIDER, padding: 24 },
  layout: { gap: 14 },
  webLayout: { flexDirection: "row", alignItems: "flex-start" },
  panel: { backgroundColor: NAVY_DEEP, borderWidth: 1, borderColor: DIVIDER, borderRadius: 16, padding: 18 },
  feeEstimatePanel: { marginTop: 14 },
  formPanel: { flex: 1.05 },
  resultPanel: { flex: 1 },
  panelTitle: { color: IVORY, fontFamily: "Gilroy-Bold", fontSize: 18, marginBottom: 14 , fontWeight: "700"},
  panelCopy: { color: MUTED, fontFamily: "Inter_400Regular", fontSize: 13, lineHeight: 19, marginTop: -5, marginBottom: 12 },
  segmentRow: { flexDirection: "row", gap: 8, marginBottom: 10, flexWrap: "wrap" },
  toggle: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 999, borderWidth: 1, borderColor: DIVIDER, backgroundColor: NAVY },
  toggleActive: { borderColor: GOLD, backgroundColor: "rgba(201,169,97,0.13)" },
  toggleText: { color: MUTED, fontFamily: "Inter_600SemiBold", fontSize: 12 },
  toggleTextActive: { color: GOLD },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 6 },
  field: { width: Platform.OS === "web" ? "48%" : "100%" },
  fieldWide: { width: "100%" },
  label: { color: MUTED, fontFamily: "Inter_600SemiBold", fontSize: 11, letterSpacing: 1.4, textTransform: "uppercase", marginBottom: 6 },
  input: { minHeight: 48, borderRadius: 12, borderWidth: 1, borderColor: "rgba(247,243,236,0.12)", backgroundColor: NAVY_ELEV, color: IVORY, fontFamily: "Inter_500Medium", fontSize: 15, paddingHorizontal: 14, paddingVertical: 12 },
  textarea: { minHeight: 82, textAlignVertical: "top" },
  primaryButton: { marginTop: 16, minHeight: 54, borderRadius: 14, backgroundColor: GOLD, flexDirection: "row", gap: 10, alignItems: "center", justifyContent: "center" },
  primaryText: { color: NAVY, fontFamily: "Inter_800ExtraBold", fontSize: 16 },
  errorText: { color: RED, fontFamily: "Inter_500Medium", fontSize: 12, marginTop: 12 },
  emptyState: { alignItems: "center", paddingVertical: 40, gap: 10 },
  emptyTitle: { color: IVORY, fontFamily: "Gilroy-Bold", fontSize: 17 , fontWeight: "700"},
  emptyCopy: { color: MUTED, fontFamily: "Inter_400Regular", fontSize: 13, textAlign: "center", lineHeight: 19 },
  flagRowWrap: { marginBottom: 10 },
  flagRow: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 12, borderWidth: 1, borderColor: DIVIDER, backgroundColor: NAVY, padding: 14 },
  flagRowActive: { borderColor: GOLD, backgroundColor: "rgba(201,169,97,0.09)" },
  flagTitle: { color: IVORY, fontFamily: "Gilroy-Bold", fontSize: 16 , fontWeight: "700"},
  nameLine: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  flagMeta: { color: MUTED, fontFamily: "Inter_500Medium", fontSize: 12, marginTop: 4, textTransform: "capitalize" },
  flagCard: { borderRadius: 12, borderWidth: 1, borderColor: DIVIDER, borderTopWidth: 0, backgroundColor: "rgba(8,22,51,0.7)", padding: 14, gap: 12 },
  flagCardHeader: { flexDirection: Platform.OS === "web" ? "row" : "column", gap: 14, alignItems: Platform.OS === "web" ? "center" : "flex-start", marginBottom: 14 },
  flagNote: { color: GOLD, fontFamily: "Inter_600SemiBold", fontSize: 12, lineHeight: 18, marginTop: 5 },
  statusRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
  statusBadge: { borderRadius: 999, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: "rgba(8,22,51,0.75)" },
  statusBadgeText: { fontFamily: "Inter_800ExtraBold", fontSize: 10, textTransform: "capitalize" },
  factGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  fact: { width: Platform.OS === "web" ? "31.5%" : "48%", borderRadius: 10, backgroundColor: NAVY_ELEV, padding: 10 },
  factLabel: { color: MUTED, fontFamily: "Inter_600SemiBold", fontSize: 10, letterSpacing: 1, textTransform: "uppercase" },
  factValue: { color: IVORY, fontFamily: "Inter_700Bold", fontSize: 13, lineHeight: 18, marginTop: 5 },
  dossierSection: { borderRadius: 12, borderWidth: 1, borderColor: DIVIDER, backgroundColor: "rgba(11,30,63,0.62)", overflow: "hidden" },
  dossierSectionHeader: { minHeight: 42, justifyContent: "center", borderBottomWidth: 1, borderBottomColor: DIVIDER, backgroundColor: "rgba(20,42,82,0.72)", paddingHorizontal: 12 },
  dossierSectionTitle: { color: GOLD, fontFamily: "Inter_800ExtraBold", fontSize: 12, letterSpacing: 1.2, textTransform: "uppercase" },
  dossierSectionBody: { padding: 12 },
  textBlock: { marginTop: 14 },
  sectionHeading: { color: GOLD, fontFamily: "Gilroy-Bold", fontSize: 13, marginBottom: 8 , fontWeight: "700"},
  bodyText: { color: MUTED, fontFamily: "Inter_400Regular", fontSize: 13, lineHeight: 19, flex: 1 },
  linkText: { color: IVORY, fontFamily: "Inter_600SemiBold", fontSize: 13, lineHeight: 19, marginBottom: 8 },
  sourceText: { color: MUTED, fontFamily: "Inter_600SemiBold", fontSize: 12, lineHeight: 17, marginBottom: 4 },
  warningText: { color: GOLD, fontFamily: "Inter_700Bold", fontSize: 13, lineHeight: 19, marginTop: 14, marginBottom: 10 },
  listRow: { flexDirection: "row", alignItems: "flex-start", gap: 8, marginBottom: 7 },
  advisorSections: { marginTop: 4 },
  advisorSection: { marginTop: 14 },
  advisorList: { marginTop: 4 },
  advisorRows: { gap: 8, marginTop: 4 },
  advisorRow: { borderRadius: 10, borderWidth: 1, borderColor: DIVIDER, backgroundColor: NAVY_ELEV, padding: 10, gap: 8 },
  advisorCell: { gap: 3 },
  partnerCard: { borderRadius: 10, borderWidth: 1, borderColor: DIVIDER, padding: 10, marginBottom: 8 },
  partnerName: { color: IVORY, fontFamily: "Inter_700Bold", fontSize: 13 },
  partnerText: { color: MUTED, fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 4, lineHeight: 17 },
  rankCard: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 12, borderWidth: 1, borderColor: DIVIDER, backgroundColor: NAVY, padding: 12, marginBottom: 10 },
  rankCardActive: { borderColor: GOLD, backgroundColor: "rgba(201,169,97,0.09)" },
  rankNumber: { color: GOLD, fontFamily: "Inter_800ExtraBold", fontSize: 17, width: 24 },
  rankTitle: { color: IVORY, fontFamily: "Gilroy-Bold", fontSize: 15 , fontWeight: "700"},
  rankSub: { color: MUTED, fontFamily: "Inter_400Regular", fontSize: 12, lineHeight: 17, marginTop: 3 },
  score: { fontFamily: "Inter_800ExtraBold", fontSize: 24 },
  detailCard: { marginTop: 10, borderTopWidth: 1, borderTopColor: DIVIDER, paddingTop: 16 },
  detailHeader: { flexDirection: "row", justifyContent: "space-between", gap: 12, alignItems: "center" },
  detailTitle: { color: IVORY, fontFamily: "Gilroy-Bold", fontSize: 22 , fontWeight: "700"},
  detailSub: { color: MUTED, fontFamily: "Inter_500Medium", fontSize: 12, marginTop: 3, textTransform: "capitalize" },
  scoreBadge: { borderRadius: 12, backgroundColor: "rgba(123,211,137,0.14)", paddingHorizontal: 10, paddingVertical: 8 },
  scoreBadgeText: { color: GREEN, fontFamily: "Inter_800ExtraBold", fontSize: 13 },
  compareSelectRow: { gap: 8, paddingBottom: 14 },
  compareChip: { borderRadius: 999, borderWidth: 1, borderColor: DIVIDER, backgroundColor: NAVY, paddingHorizontal: 12, paddingVertical: 9, flexDirection: "row", alignItems: "center", gap: 8 },
  compareChipActive: { borderColor: GOLD, backgroundColor: "rgba(201,169,97,0.14)" },
  compareChipText: { color: MUTED, fontFamily: "Inter_700Bold", fontSize: 12 },
  compareChipTextActive: { color: GOLD },
  compareSlotRow: { flexDirection: "row", gap: 10, marginBottom: 12 },
  compareSlot: { flex: 1, minHeight: 68, borderRadius: 12, borderWidth: 1, borderColor: DIVIDER, backgroundColor: NAVY, padding: 12, justifyContent: "center" },
  compareSlotActive: { borderColor: GOLD, backgroundColor: "rgba(201,169,97,0.12)" },
  compareSlotLabel: { color: MUTED, fontFamily: "Inter_700Bold", fontSize: 11, letterSpacing: 1.1, textTransform: "uppercase" },
  compareSlotLabelActive: { color: GOLD },
  compareSlotValue: { color: IVORY, fontFamily: "Inter_800ExtraBold", fontSize: 14, lineHeight: 19, marginTop: 5 },
  compareFilterRow: { gap: 8, paddingBottom: 14 },
  compareFilter: { minHeight: 38, borderRadius: 999, borderWidth: 1, borderColor: DIVIDER, backgroundColor: NAVY, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", gap: 7 },
  compareFilterActive: { borderColor: GOLD, backgroundColor: "rgba(201,169,97,0.13)" },
  compareFilterText: { color: MUTED, fontFamily: "Inter_700Bold", fontSize: 12 },
  compareFilterTextActive: { color: GOLD },
  compareTable: { borderWidth: 1, borderColor: DIVIDER, borderRadius: 14, overflow: "hidden", backgroundColor: NAVY },
  compareTableHeader: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: DIVIDER, backgroundColor: "rgba(20,42,82,0.86)" },
  compareRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: DIVIDER },
  compareMetricCell: { width: Platform.OS === "web" ? "24%" : 116, padding: 10, borderRightWidth: 1, borderRightColor: DIVIDER, justifyContent: "center" },
  compareMetricTitle: { color: GOLD, fontFamily: "Inter_800ExtraBold", fontSize: 12, letterSpacing: 1, textTransform: "uppercase" },
  compareMetricLabel: { color: IVORY, fontFamily: "Inter_800ExtraBold", fontSize: 12, lineHeight: 17 },
  compareHeaderCell: { flex: 1, minWidth: 126, padding: 10, borderRightWidth: 1, borderRightColor: DIVIDER, gap: 5 },
  compareHeaderTitle: { color: IVORY, fontFamily: "Inter_800ExtraBold", fontSize: 13, lineHeight: 18 },
  compareHeaderSub: { color: MUTED, fontFamily: "Inter_600SemiBold", fontSize: 10, lineHeight: 14, textTransform: "capitalize" },
  compareValueCell: { flex: 1, minWidth: 126, padding: 10, borderRightWidth: 1, borderRightColor: DIVIDER },
  compareValueText: { color: MUTED, fontFamily: "Inter_500Medium", fontSize: 12, lineHeight: 17 },
  fullCompareGrid: { flexDirection: Platform.OS === "web" ? "row" : "column", gap: 12, alignItems: "flex-start" },
  fullCompareCard: { flex: 1, width: Platform.OS === "web" ? undefined : "100%", borderRadius: 14, borderWidth: 1, borderColor: DIVIDER, backgroundColor: NAVY, padding: 12 },
  feeResult: { marginTop: 14, borderTopWidth: 1, borderTopColor: DIVIDER, paddingTop: 14 },
  scenarioPanel: { borderRadius: 14, borderWidth: 1, borderColor: "rgba(201,169,97,0.32)", backgroundColor: "rgba(201,169,97,0.07)", padding: 12, marginBottom: 14 },
  scenarioHeader: { flexDirection: "row", alignItems: "flex-start", gap: 10, marginBottom: 12 },
  scenarioGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  scenarioCard: { flexGrow: 1, flexBasis: Platform.OS === "web" ? "48%" : "100%", borderRadius: 12, borderWidth: 1, borderColor: DIVIDER, backgroundColor: NAVY, padding: 12, gap: 10 },
  scenarioRankLine: { flexDirection: "row", alignItems: "center", gap: 10 },
  scenarioFactRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  comparisonGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  comparisonCard: { flexGrow: 1, flexBasis: Platform.OS === "web" ? "31%" : "100%", borderRadius: 14, borderWidth: 1, borderColor: DIVIDER, backgroundColor: NAVY, padding: 12, gap: 8 },
  compareHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 4 },
  compareTitle: { color: IVORY, fontFamily: "Gilroy-Bold", fontSize: 17, marginBottom: 3 , fontWeight: "700"},
});
