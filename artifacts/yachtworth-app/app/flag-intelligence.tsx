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
  getFlagScenarioRanking,
  type FlagComparisonInput,
  type FlagComparisonResult,
  type FlagFeeEstimateResponse,
  type FlagRegistry,
  type FlagScenarioRankingResponse,
} from "../lib/flagIntelligence";
import { RegistryFlag } from "../components/RegistryFlag";

const NAVY = "#0B1E3F";
const NAVY_DEEP = "#081633";
const NAVY_ELEV = "#142A52";
const GOLD = "#C9A961";
const IVORY = "#F7F3EC";
const MUTED = "rgba(247,243,236,0.62)";
const DIVIDER = "rgba(247,243,236,0.1)";
const GREEN = "#7BD389";
const RED = "#E77777";

type Mode = "flags" | "advice" | "comparison" | "fees";

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
};

const MODES: Array<{ key: Mode; title: string; subtitle: string; icon: React.ComponentProps<typeof Feather>["name"] }> = [
  { key: "flags", title: "All Flags", subtitle: "Open a flag card and review registry terms", icon: "list" },
  { key: "advice", title: "Registration Advice", subtitle: "Profile the yacht and get a ranked recommendation", icon: "compass" },
  { key: "comparison", title: "Comparison", subtitle: "Compare selected registries side by side", icon: "columns" },
  { key: "fees", title: "Fee Estimate", subtitle: "Preliminary confirmed registry-fee estimate", icon: "dollar-sign" },
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
  return (
    <View style={[styles.field, multiline && styles.fieldWide]}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        multiline={multiline}
        style={[styles.input, multiline && styles.textarea]}
        placeholderTextColor="rgba(247,243,236,0.3)"
      />
    </View>
  );
}

function Toggle({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.toggle, active && styles.toggleActive]}>
      <Text style={[styles.toggleText, active && styles.toggleTextActive]}>{label}</Text>
    </Pressable>
  );
}

export default function FlagIntelligenceScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
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
  const [scenarioRanking, setScenarioRanking] = useState<FlagScenarioRankingResponse | null>(null);
  const [scenarioRankingError, setScenarioRankingError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadFlags() {
      setFlagsLoading(true);
      setFlagsError(null);
      try {
        const [response, ranking] = await Promise.all([
          getFlagRegistries(),
          getFlagScenarioRanking().catch((err) => {
            setScenarioRankingError(err instanceof Error ? err.message : String(err));
            return null;
          }),
        ]);
        if (cancelled) return;
        setFlags(response.registries);
        setExpandedCode(response.registries[0]?.code ?? null);
        setComparisonCodes(response.registries.slice(0, 3).map((f) => f.code));
        setFeeFlag(response.registries[0]?.code ?? "");
        setScenarioRanking(ranking);
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
    const codes = comparisonCodes.length ? comparisonCodes : flags.slice(0, 3).map((f) => f.code);
    return codes.map((code) => flags.find((flag) => flag.code === code)).filter((flag): flag is FlagRegistry => Boolean(flag));
  }, [comparisonCodes, flags]);

  async function runCompare() {
    setMode("advice");
    setLoading(true);
    setError(null);
    try {
      const response = await compareFlags(asInput(form));
      setResults(response.results);
      setSelectedCode(response.results[0]?.code ?? null);
      if (response.results.length) setComparisonCodes(response.results.slice(0, 3).map((f) => f.code));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  function toggleComparison(code: string) {
    setComparisonCodes((current) => {
      if (current.includes(code)) return current.filter((c) => c !== code);
      return [...current, code].slice(-4);
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
    <View style={[styles.root, { paddingTop: (isWeb ? 62 : insets.top) + 64 }]}>
      <View style={[styles.headerShell, isWeb && styles.webShell]}>
        <View style={styles.topbar}>
          <Pressable onPress={() => router.back()} style={styles.iconButton}>
            <Feather name="arrow-left" size={22} color={IVORY} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.kicker}>YACHTWORTH</Text>
            <Text style={styles.title}>Flag Intelligence</Text>
            <Text style={styles.subtitle}>Registry cards, advisory ranking and side-by-side comparison.</Text>
          </View>
        </View>
      </View>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 42 }, isWeb && styles.webScroll]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.modeList}>
          {MODES.map((item) => (
            <Pressable key={item.key} onPress={() => setMode(item.key)} style={[styles.modeRow, mode === item.key && styles.modeRowActive]}>
              <View style={styles.modeIcon}>
                <Feather name={item.icon} size={18} color={mode === item.key ? GOLD : MUTED} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.modeTitle}>{item.title}</Text>
                <Text style={styles.modeSubtitle}>{item.subtitle}</Text>
              </View>
              <Feather name={mode === item.key ? "chevron-down" : "chevron-right"} size={20} color={MUTED} />
            </Pressable>
          ))}
        </View>

        {flagsLoading ? (
          <View style={styles.centerPanel}>
            <ActivityIndicator color={GOLD} />
          </View>
        ) : flagsError ? (
          <View style={styles.centerPanel}>
            <Feather name="alert-circle" size={28} color={RED} />
            <Text style={styles.emptyTitle}>Could not load flags</Text>
            <Text style={styles.emptyCopy}>{flagsError}</Text>
          </View>
        ) : mode === "flags" ? (
          <AllFlags flags={flags} expandedCode={expandedCode} onToggle={(code) => setExpandedCode((current) => (current === code ? null : code))} />
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
          mode === "comparison" ? (
          <Comparison
            flags={flags}
            comparisonFlags={comparisonFlags}
            comparisonCodes={comparisonCodes}
            scenarioRanking={scenarioRanking}
            scenarioRankingError={scenarioRankingError}
            onToggle={toggleComparison}
          />
          ) : (
            <FeeEstimate
              flags={flags}
              selectedCode={feeFlag}
              onSelect={setFeeFlag}
              result={feeResult}
              loading={feeLoading}
              error={feeError}
              onRun={runFeeEstimate}
            />
          )
        )}
      </ScrollView>
    </View>
  );
}

function AllFlags({ flags, expandedCode, onToggle }: { flags: FlagRegistry[]; expandedCode: string | null; onToggle: (code: string) => void }) {
  return (
    <View style={styles.panel}>
      <Text style={styles.panelTitle}>All Flags</Text>
      {flags.map((flag) => {
        const expanded = expandedCode === flag.code;
        return (
          <View key={flag.code} style={styles.flagRowWrap}>
            <Pressable onPress={() => onToggle(flag.code)} style={[styles.flagRow, expanded && styles.flagRowActive]}>
              <RegistryFlag registry={flag} size="sm" decorative />
              <View style={{ flex: 1 }}>
                <View style={styles.nameLine}>
                  <Text style={styles.flagTitle}>{flag.flag_name}</Text>
                  {flag.registry_badge ? <StatusBadge label={flag.registry_badge} tone="gold" /> : null}
                </View>
                <Text style={styles.flagMeta}>{flag.country} / {flag.registry_type} / {processing(flag)}</Text>
              </View>
              <Feather name={expanded ? "chevron-up" : "chevron-down"} size={20} color={MUTED} />
            </Pressable>
            {expanded ? <FlagCard flag={flag} /> : null}
          </View>
        );
      })}
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
  return (
    <View style={[styles.layout, isWeb && styles.webLayout]}>
      <View style={[styles.panel, styles.formPanel]}>
        <Text style={styles.panelTitle}>Registration Advice</Text>
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
          <Field label="Navigation area" value={form.navigation_area} multiline onChangeText={(v) => setForm((f) => ({ ...f, navigation_area: v }))} />
          <Field label="Intended cruising area" value={form.intended_cruising_area} multiline onChangeText={(v) => setForm((f) => ({ ...f, intended_cruising_area: v }))} />
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        <Pressable onPress={runCompare} disabled={loading} style={[styles.primaryButton, loading && { opacity: 0.7 }]}>
          {loading ? <ActivityIndicator color={NAVY} /> : <Feather name="compass" size={18} color={NAVY} />}
          <Text style={styles.primaryText}>Get advice</Text>
        </Pressable>
      </View>

      <View style={[styles.panel, styles.resultPanel]}>
        <Text style={styles.panelTitle}>Recommended Ranking</Text>
        {results.length === 0 ? (
          <View style={styles.emptyState}>
            <Feather name="flag" size={28} color={GOLD} />
            <Text style={styles.emptyTitle}>Ready to advise</Text>
            <Text style={styles.emptyCopy}>Complete the yacht profile to rank the strongest registration options.</Text>
          </View>
        ) : (
          <>
            {results.slice(0, 6).map((flag, index) => {
              const active = selectedCode === flag.code;
              return (
                <Pressable key={flag.code} onPress={() => setSelectedCode(flag.code)} style={[styles.rankCard, active && styles.rankCardActive]}>
                  <Text style={styles.rankNumber}>{index + 1}</Text>
                  <RegistryFlag registry={flag} size="sm" decorative />
                  <View style={{ flex: 1 }}>
                    <View style={styles.nameLine}>
                      <Text style={styles.rankTitle}>{flag.flag_name}</Text>
                      {flag.registry_badge ? <StatusBadge label={flag.registry_badge} tone="gold" /> : null}
                    </View>
                    <Text style={styles.rankSub}>{flag.fit_summary}</Text>
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
  scenarioRanking,
  scenarioRankingError,
  onToggle,
}: {
  flags: FlagRegistry[];
  comparisonFlags: FlagRegistry[];
  comparisonCodes: string[];
  scenarioRanking: FlagScenarioRankingResponse | null;
  scenarioRankingError: string | null;
  onToggle: (code: string) => void;
}) {
  const rankingItems = scenarioRanking?.items ?? [];
  return (
    <View style={styles.panel}>
      <Text style={styles.panelTitle}>Comparison</Text>
      <Text style={styles.panelCopy}>Select up to four flags to compare the core commercial and ownership criteria.</Text>
      {scenarioRankingError ? <Text style={styles.warningText}>Scenario ranking is not loaded yet: {scenarioRankingError}</Text> : null}
      {rankingItems.length ? (
        <View style={styles.scenarioPanel}>
          <View style={styles.scenarioHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionHeading}>Scenario ranking</Text>
              <Text style={styles.bodyText}>{scenarioRanking?.scenario?.scenario_name ?? "Budget profile ranking"}</Text>
            </View>
            <StatusBadge label="needs review" tone="gold" />
          </View>
          <View style={styles.scenarioGrid}>
            {rankingItems.slice(0, 8).map((item) => {
              const registry = item.registry;
              return (
                <View key={item.id} style={styles.scenarioCard}>
                  <View style={styles.scenarioRankLine}>
                    <Text style={styles.rankNumber}>{item.rank ?? "-"}</Text>
                    {registry ? <RegistryFlag registry={registry} size="sm" decorative /> : null}
                    <View style={{ flex: 1 }}>
                      <Text style={styles.rankTitle}>{registry?.flag_name ?? "Unknown flag"}</Text>
                      <Text style={styles.rankSub}>{item.overall_label ?? item.recommendation_label ?? "Scenario fit to review"}</Text>
                    </View>
                    <Text style={[styles.score, { color: scoreColor(item.score ?? 0) }]}>{item.score ?? "-"}</Text>
                  </View>
                  <View style={styles.scenarioFactRow}>
                    <Fact label="1st year" value={money(item.first_year_cost_eur_est)} />
                    <Fact label="EU VAT" value={textOrVerify(item.eu_vat_exposure_rating)} />
                    <Fact label="France base" value={textOrVerify(item.france_base_compatibility)} />
                    <Fact label="Language" value={textOrVerify(item.language_fit)} />
                  </View>
                  <View style={styles.statusRow}>
                    <StatusBadge label={item.recommended ? "recommended" : "not preferred"} tone={item.recommended ? "green" : "red"} />
                    <StatusBadge label={statusLabel(item.validation_status)} tone="gold" />
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      ) : null}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.compareSelectRow}>
        {flags.map((flag) => (
          <Pressable key={flag.code} onPress={() => onToggle(flag.code)} style={[styles.compareChip, comparisonCodes.includes(flag.code) && styles.compareChipActive]}>
            <RegistryFlag registry={flag} size="xs" decorative />
            <Text style={[styles.compareChipText, comparisonCodes.includes(flag.code) && styles.compareChipTextActive]}>{flag.flag_name}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <View style={styles.comparisonGrid}>
        {comparisonFlags.map((flag) => (
          <View key={flag.code} style={styles.comparisonCard}>
            <View style={styles.compareHeader}>
              <RegistryFlag registry={flag} size="md" />
              <View style={{ flex: 1 }}>
                <View style={styles.nameLine}>
                  <Text style={styles.compareTitle}>{flag.flag_name}</Text>
                  {flag.registry_badge ? <StatusBadge label={flag.registry_badge} tone="gold" /> : null}
                </View>
                {flag.flag_note ? <Text style={styles.flagNote}>{flag.flag_note}</Text> : null}
              </View>
            </View>
            <Fact label="Registration" value={money(flag.registration_cost_eur)} />
            <Fact label="Annual fee" value={money(flag.annual_fee_eur)} />
            <Fact label="Commercial use" value={yesNo(flag.commercial_available)} />
            <Fact label="Private use" value={yesNo(flag.private_available)} />
            <Fact label="Mortgage" value={yesNo(flag.mortgage_available)} />
            <Fact label="Temporary registration" value={yesNo(flag.temporary_registration)} />
            <Fact label="Permanent registration" value={yesNo(flag.permanent_registration)} />
            <Fact label="Radio license" value={yesNo(flag.radio_license)} />
            <Fact label="Survey" value={flag.survey_required ? "Required" : "Case by case"} />
            <Fact label="Class" value={flag.classification_required ? "Required" : "Case by case"} />
            <Fact label="Processing" value={processing(flag)} />
            <Fact label="Accepted class" value={flag.accepted_class.length ? flag.accepted_class.join(", ") : "To verify"} />
          </View>
        ))}
      </View>
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
      <Text style={styles.panelTitle}>Preliminary Fee Estimate</Text>
      <Text style={styles.panelCopy}>
        Uses confirmed registry fee rules only. External legal, company, class, survey, tax, VAT, insurance and crew costs are excluded unless explicitly stored as official registry fees.
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
        <Text style={styles.primaryText}>Calculate confirmed fees</Text>
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
  const advisor = flag.advisor;
  return (
    <View style={styles.flagCard}>
      <View style={styles.flagCardHeader}>
        <RegistryFlag registry={flag} size={Platform.OS === "web" ? "hero" : "lg"} />
        <View style={{ flex: 1 }}>
          <View style={styles.nameLine}>
            <Text style={styles.detailTitle}>{flag.flag_name}</Text>
            {flag.registry_badge ? <StatusBadge label={flag.registry_badge} tone="gold" /> : null}
          </View>
          {flag.registry_badge === "MAR" ? <Text style={styles.detailSub}>Portuguese International Shipping Register</Text> : null}
          {flag.flag_note ? <Text style={styles.flagNote}>{flag.flag_note}</Text> : null}
        </View>
      </View>
      <View style={styles.statusRow}>
        <StatusBadge label={advisor?.is_eu_flag ? "EU flag" : "Non-EU flag"} tone={advisor?.is_eu_flag ? "green" : "gold"} />
        <StatusBadge label={statusLabel(advisor?.confidence_level)} tone="gold" />
        <StatusBadge label={statusLabel(advisor?.coverage_status)} tone={advisor?.data_quality_status === "research_required" ? "red" : "green"} />
        <StatusBadge label={statusLabel(advisor?.data_quality_status)} tone={advisor?.data_quality_status === "research_required" ? "red" : "green"} />
      </View>
      <View style={styles.factGrid}>
        <Fact label="Private" value={yesNo(flag.private_available)} />
        <Fact label="Commercial" value={yesNo(flag.commercial_available)} />
        <Fact label="Private status" value={statusLabel(advisor?.private_registration_status)} />
        <Fact label="Commercial status" value={statusLabel(advisor?.commercial_registration_status)} />
        <Fact label="Registration cost" value={money(flag.registration_cost_eur)} />
        <Fact label="Annual fees" value={money(flag.annual_fee_eur)} />
        <Fact label="Processing" value={processing(flag)} />
        <Fact label="Mortgage" value={yesNo(flag.mortgage_available)} />
        <Fact label="Temporary registration" value={yesNo(flag.temporary_registration)} />
        <Fact label="Permanent registration" value={yesNo(flag.permanent_registration)} />
        <Fact label="Radio license" value={yesNo(flag.radio_license)} />
        <Fact label="Survey" value={flag.survey_required ? "Required" : "Case by case"} />
        <Fact label="Classification" value={flag.classification_required ? "Required" : "Case by case"} />
        <Fact label="Accepted class" value={flag.accepted_class.length ? flag.accepted_class.join(", ") : "To verify"} />
      </View>

      <TextBlock title="Official registry" text={textOrVerify(advisor?.official_registry_name)} />
      <TextBlock title="Eligibility" text={textOrVerify(advisor?.owner_eligibility ?? flag.owner_nationality_restrictions)} />
      <TextBlock title="Foreign company ownership" text={textOrVerify(advisor?.foreign_company_ownership ?? flag.company_restrictions)} />
      <TextBlock title="Local / resident agent" text={textOrVerify(advisor?.local_agent_requirement)} />
      <TextBlock title="Provisional registration" text={`${statusLabel(advisor?.provisional_registration_status)} / ${textOrVerify(advisor?.provisional_validity)}`} />
      <TextBlock title="Permanent validity" text={textOrVerify(advisor?.permanent_validity)} />
      <TextBlock title="Crew / safe manning" text={`${textOrVerify(advisor?.crew_note ?? flag.crew_restrictions)} / ${textOrVerify(advisor?.minimum_safe_manning)}`} />
      <TextBlock title="Required documents" text={textOrVerify(advisor?.required_documents_summary)} />
      <TextBlock title="VAT / tax" text={textOrVerify(advisor?.vat_tax_note ?? flag.vat_notes)} />
      <TextBlock title="Insurance" text={textOrVerify(flag.insurance_notes)} />
      <AdvisorSections sections={advisor?.advisor_sections ?? []} />
      <InfoList title="Advantages" items={flag.advantages} icon="check" />
      <InfoList title="Disadvantages" items={flag.disadvantages} icon="alert-circle" />
      {advisor?.missing_verification_notes ? <TextBlock title="Missing / next verification" text={advisor.missing_verification_notes} /> : null}

      <Text style={styles.sectionHeading}>Legal / registration partners</Text>
      {flag.legal_partners.length ? (
        flag.legal_partners.map((partner) => (
          <View key={partner.name} style={styles.partnerCard}>
            <Text style={styles.partnerName}>{partner.name}</Text>
            <Text style={styles.partnerText}>{partner.notes ?? partner.contact_url ?? partner.email ?? partner.phone ?? "Contact details to verify."}</Text>
          </View>
        ))
      ) : (
        <Text style={styles.bodyText}>No preferred legal partner has been assigned to this flag yet.</Text>
      )}
    </View>
  );
}

function AdvisorSections({ sections }: { sections: NonNullable<NonNullable<FlagRegistry["advisor"]>["advisor_sections"]> }) {
  if (!sections.length) return null;
  return (
    <View style={styles.advisorSections}>
      {sections.map((section, index) => (
        <View key={`${section.title}-${index}`} style={styles.advisorSection}>
          <Text style={styles.sectionHeading}>{section.title}</Text>
          {section.body ? <Text style={styles.bodyText}>{section.body}</Text> : null}
          {section.items?.length ? (
            <View style={styles.advisorList}>
              {section.items.map((item) => (
                <View key={item} style={styles.listRow}>
                  <Feather name="chevron-right" size={14} color={GOLD} />
                  <Text style={styles.bodyText}>{item}</Text>
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
  return (
    <View style={styles.advisorRows}>
      {rows.map((row, rowIndex) => (
        <View key={rowIndex} style={styles.advisorRow}>
          {Object.entries(row).map(([key, value]) => (
            <View key={key} style={styles.advisorCell}>
              <Text style={styles.factLabel}>{key.replace(/_/g, " ")}</Text>
              <Text style={styles.factValue}>{value == null || value === "" ? "To verify" : String(value)}</Text>
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
  return (
    <View style={styles.fact}>
      <Text style={styles.factLabel}>{label}</Text>
      <Text style={styles.factValue}>{value}</Text>
    </View>
  );
}

function TextBlock({ title, text }: { title: string; text: string }) {
  return (
    <View style={styles.textBlock}>
      <Text style={styles.sectionHeading}>{title}</Text>
      <Text style={styles.bodyText}>{text}</Text>
    </View>
  );
}

function InfoList({ title, items, icon }: { title: string; items: string[]; icon: React.ComponentProps<typeof Feather>["name"] }) {
  if (!items.length) return null;
  return (
    <View style={styles.textBlock}>
      <Text style={styles.sectionHeading}>{title}</Text>
      {items.map((item) => (
        <View key={item} style={styles.listRow}>
          <Feather name={icon} size={14} color={GOLD} />
          <Text style={styles.bodyText}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: NAVY },
  headerShell: { paddingHorizontal: 22, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: DIVIDER, backgroundColor: NAVY },
  webShell: { maxWidth: 1240, width: "100%", alignSelf: "center" },
  scroll: { paddingHorizontal: 22 },
  webScroll: { maxWidth: 1240, width: "100%", alignSelf: "center" },
  topbar: { flexDirection: "row", alignItems: "center", gap: 14 },
  iconButton: { width: 46, height: 46, borderRadius: 23, backgroundColor: NAVY_DEEP, alignItems: "center", justifyContent: "center" },
  kicker: { color: GOLD, fontFamily: "Inter_600SemiBold", fontSize: 12, letterSpacing: 2.4 },
  title: { color: IVORY, fontFamily: "Gilroy-ExtraBold", fontSize: 32, marginTop: 4 },
  subtitle: { color: MUTED, fontFamily: "Inter_400Regular", fontSize: 13, lineHeight: 19, marginTop: 4 },
  modeList: { gap: 10, marginTop: 16, marginBottom: 14 },
  modeRow: { minHeight: 70, flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 14, borderWidth: 1, borderColor: DIVIDER, backgroundColor: NAVY_DEEP, padding: 14 },
  modeRowActive: { borderColor: "rgba(201,169,97,0.55)", backgroundColor: NAVY_ELEV },
  modeIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: NAVY, alignItems: "center", justifyContent: "center" },
  modeTitle: { color: IVORY, fontFamily: "Inter_800ExtraBold", fontSize: 16 },
  modeSubtitle: { color: MUTED, fontFamily: "Inter_400Regular", fontSize: 12, lineHeight: 17, marginTop: 3 },
  centerPanel: { minHeight: 260, alignItems: "center", justifyContent: "center", gap: 10, backgroundColor: NAVY_DEEP, borderRadius: 16, borderWidth: 1, borderColor: DIVIDER, padding: 24 },
  layout: { gap: 14 },
  webLayout: { flexDirection: "row", alignItems: "flex-start" },
  panel: { backgroundColor: NAVY_DEEP, borderWidth: 1, borderColor: DIVIDER, borderRadius: 16, padding: 18 },
  formPanel: { flex: 1.05 },
  resultPanel: { flex: 1 },
  panelTitle: { color: IVORY, fontFamily: "Inter_700Bold", fontSize: 18, marginBottom: 14 },
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
  emptyTitle: { color: IVORY, fontFamily: "Inter_700Bold", fontSize: 17 },
  emptyCopy: { color: MUTED, fontFamily: "Inter_400Regular", fontSize: 13, textAlign: "center", lineHeight: 19 },
  flagRowWrap: { marginBottom: 10 },
  flagRow: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 12, borderWidth: 1, borderColor: DIVIDER, backgroundColor: NAVY, padding: 14 },
  flagRowActive: { borderColor: GOLD, backgroundColor: "rgba(201,169,97,0.09)" },
  flagTitle: { color: IVORY, fontFamily: "Inter_800ExtraBold", fontSize: 16 },
  nameLine: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  flagMeta: { color: MUTED, fontFamily: "Inter_500Medium", fontSize: 12, marginTop: 4, textTransform: "capitalize" },
  flagCard: { borderRadius: 12, borderWidth: 1, borderColor: DIVIDER, borderTopWidth: 0, backgroundColor: "rgba(8,22,51,0.7)", padding: 14 },
  flagCardHeader: { flexDirection: Platform.OS === "web" ? "row" : "column", gap: 14, alignItems: Platform.OS === "web" ? "center" : "flex-start", marginBottom: 14 },
  flagNote: { color: GOLD, fontFamily: "Inter_600SemiBold", fontSize: 12, lineHeight: 18, marginTop: 5 },
  statusRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
  statusBadge: { borderRadius: 999, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: "rgba(8,22,51,0.75)" },
  statusBadgeText: { fontFamily: "Inter_800ExtraBold", fontSize: 10, textTransform: "capitalize" },
  factGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  fact: { width: Platform.OS === "web" ? "31.5%" : "48%", borderRadius: 10, backgroundColor: NAVY_ELEV, padding: 10 },
  factLabel: { color: MUTED, fontFamily: "Inter_600SemiBold", fontSize: 10, letterSpacing: 1, textTransform: "uppercase" },
  factValue: { color: IVORY, fontFamily: "Inter_700Bold", fontSize: 13, lineHeight: 18, marginTop: 5 },
  textBlock: { marginTop: 14 },
  sectionHeading: { color: GOLD, fontFamily: "Inter_800ExtraBold", fontSize: 13, marginBottom: 8 },
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
  rankTitle: { color: IVORY, fontFamily: "Inter_700Bold", fontSize: 15 },
  rankSub: { color: MUTED, fontFamily: "Inter_400Regular", fontSize: 12, lineHeight: 17, marginTop: 3 },
  score: { fontFamily: "Inter_800ExtraBold", fontSize: 24 },
  detailCard: { marginTop: 10, borderTopWidth: 1, borderTopColor: DIVIDER, paddingTop: 16 },
  detailHeader: { flexDirection: "row", justifyContent: "space-between", gap: 12, alignItems: "center" },
  detailTitle: { color: IVORY, fontFamily: "Inter_800ExtraBold", fontSize: 22 },
  detailSub: { color: MUTED, fontFamily: "Inter_500Medium", fontSize: 12, marginTop: 3, textTransform: "capitalize" },
  scoreBadge: { borderRadius: 12, backgroundColor: "rgba(123,211,137,0.14)", paddingHorizontal: 10, paddingVertical: 8 },
  scoreBadgeText: { color: GREEN, fontFamily: "Inter_800ExtraBold", fontSize: 13 },
  compareSelectRow: { gap: 8, paddingBottom: 14 },
  compareChip: { borderRadius: 999, borderWidth: 1, borderColor: DIVIDER, backgroundColor: NAVY, paddingHorizontal: 12, paddingVertical: 9, flexDirection: "row", alignItems: "center", gap: 8 },
  compareChipActive: { borderColor: GOLD, backgroundColor: "rgba(201,169,97,0.14)" },
  compareChipText: { color: MUTED, fontFamily: "Inter_700Bold", fontSize: 12 },
  compareChipTextActive: { color: GOLD },
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
  compareTitle: { color: IVORY, fontFamily: "Inter_800ExtraBold", fontSize: 17, marginBottom: 3 },
});
