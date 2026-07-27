import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
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
  type FlagComparisonInput,
  type FlagComparisonResult,
} from "../lib/flagIntelligence";

const NAVY = "#0B1E3F";
const NAVY_DEEP = "#081633";
const NAVY_ELEV = "#142A52";
const GOLD = "#C9A961";
const IVORY = "#F7F3EC";
const MUTED = "rgba(247,243,236,0.62)";
const DIVIDER = "rgba(247,243,236,0.1)";
const GREEN = "#7BD389";
const RED = "#E77777";

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

function processing(flag: FlagComparisonResult): string {
  if (flag.processing_time_days_min == null && flag.processing_time_days_max == null) return "To verify";
  if (flag.processing_time_days_min === flag.processing_time_days_max) return `${flag.processing_time_days_min} days`;
  return `${flag.processing_time_days_min ?? "?"}-${flag.processing_time_days_max ?? "?"} days`;
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

function Toggle({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
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
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [results, setResults] = useState<FlagComparisonResult[]>([]);
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selected = useMemo(
    () => results.find((r) => r.code === selectedCode) ?? results[0] ?? null,
    [results, selectedCode],
  );

  async function runCompare() {
    setLoading(true);
    setError(null);
    try {
      const response = await compareFlags(asInput(form));
      setResults(response.results);
      setSelectedCode(response.results[0]?.code ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={[styles.root, { paddingTop: (isWeb ? 62 : insets.top) + 64 }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: insets.bottom + 42 },
          isWeb && styles.webScroll,
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topbar}>
          <Pressable onPress={() => router.back()} style={styles.iconButton}>
            <Feather name="arrow-left" size={22} color={IVORY} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.kicker}>YACHTWORTH</Text>
            <Text style={styles.title}>Flag Intelligence</Text>
          </View>
        </View>

        <View style={[styles.layout, isWeb && styles.webLayout]}>
          <View style={[styles.panel, styles.formPanel]}>
            <Text style={styles.panelTitle}>Yacht & owner profile</Text>
            <View style={styles.segmentRow}>
              <Toggle
                label="Private"
                active={form.use_type === "private"}
                onPress={() => setForm((f) => ({ ...f, use_type: "private", charter: false }))}
              />
              <Toggle
                label="Commercial"
                active={form.use_type === "commercial"}
                onPress={() => setForm((f) => ({ ...f, use_type: "commercial", charter: true }))}
              />
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

            {error && <Text style={styles.errorText}>{error}</Text>}
            <Pressable onPress={runCompare} disabled={loading} style={[styles.primaryButton, loading && { opacity: 0.7 }]}>
              {loading ? <ActivityIndicator color={NAVY} /> : <Feather name="bar-chart-2" size={18} color={NAVY} />}
              <Text style={styles.primaryText}>Compare flags</Text>
            </Pressable>
          </View>

          <View style={[styles.panel, styles.resultPanel]}>
            <Text style={styles.panelTitle}>Ranking</Text>
            {results.length === 0 ? (
              <View style={styles.emptyState}>
                <Feather name="flag" size={28} color={GOLD} />
                <Text style={styles.emptyTitle}>Ready to compare</Text>
                <Text style={styles.emptyCopy}>Run the advisor to rank the strongest flag options for this yacht profile.</Text>
              </View>
            ) : (
              <>
                {results.slice(0, 6).map((flag, index) => {
                  const active = selected?.code === flag.code;
                  return (
                    <Pressable key={flag.code} onPress={() => setSelectedCode(flag.code)} style={[styles.rankCard, active && styles.rankCardActive]}>
                      <Text style={styles.rankNumber}>{index + 1}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.rankTitle}>{flag.flag_name}</Text>
                        <Text style={styles.rankSub}>{flag.fit_summary}</Text>
                      </View>
                      <Text style={[styles.score, { color: scoreColor(flag.score) }]}>{flag.score}</Text>
                    </Pressable>
                  );
                })}

                {selected && (
                  <View style={styles.detailCard}>
                    <View style={styles.detailHeader}>
                      <View>
                        <Text style={styles.detailTitle}>{selected.flag_name}</Text>
                        <Text style={styles.detailSub}>{selected.country} · {selected.registry_type}</Text>
                      </View>
                      <View style={styles.scoreBadge}>
                        <Text style={styles.scoreBadgeText}>{selected.score}/100</Text>
                      </View>
                    </View>

                    <View style={styles.factGrid}>
                      <Fact label="Registration" value={money(selected.registration_cost_eur)} />
                      <Fact label="Annual fees" value={money(selected.annual_fee_eur)} />
                      <Fact label="Processing" value={processing(selected)} />
                      <Fact label="Mortgage" value={selected.mortgage_available ? "Yes" : "Verify"} />
                      <Fact label="Commercial" value={selected.commercial_available ? "Yes" : "No"} />
                      <Fact label="Class" value={selected.classification_required ? "Required" : "Case by case"} />
                    </View>

                    <InfoList title="Advantages" items={selected.positives.length ? selected.positives : selected.advantages} />
                    <InfoList title="Risks to review" items={selected.risks.length ? selected.risks : selected.disadvantages} />

                    <Text style={styles.sectionHeading}>VAT / insurance / crew</Text>
                    <Text style={styles.bodyText}>{selected.vat_notes ?? "VAT notes to verify."}</Text>
                    <Text style={styles.bodyText}>{selected.insurance_notes ?? "Insurance acceptance to verify."}</Text>
                    <Text style={styles.bodyText}>{selected.crew_restrictions ?? "Crew restrictions to verify."}</Text>

                    <Text style={styles.sectionHeading}>Legal partners</Text>
                    {selected.legal_partners.length ? (
                      selected.legal_partners.map((partner) => (
                        <View key={partner.name} style={styles.partnerCard}>
                          <Text style={styles.partnerName}>{partner.name}</Text>
                          <Text style={styles.partnerText}>{partner.notes ?? partner.contact_url ?? partner.email ?? "Contact details to verify."}</Text>
                        </View>
                      ))
                    ) : (
                      <Text style={styles.bodyText}>No preferred legal partner has been assigned to this flag yet.</Text>
                    )}
                  </View>
                )}
              </>
            )}
          </View>
        </View>
      </ScrollView>
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

function InfoList({ title, items }: { title: string; items: string[] }) {
  return (
    <View style={{ marginTop: 16 }}>
      <Text style={styles.sectionHeading}>{title}</Text>
      {items.map((item) => (
        <View key={item} style={styles.listRow}>
          <Feather name="check" size={14} color={GOLD} />
          <Text style={styles.bodyText}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: NAVY },
  scroll: { paddingHorizontal: 22 },
  webScroll: { maxWidth: 1240, width: "100%", alignSelf: "center" },
  topbar: { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 18 },
  iconButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: NAVY_DEEP,
    alignItems: "center",
    justifyContent: "center",
  },
  kicker: {
    color: GOLD,
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    letterSpacing: 2.4,
  },
  title: {
    color: IVORY,
    fontFamily: "Gilroy-ExtraBold",
    fontSize: 32,
    marginTop: 4,
  },
  layout: { gap: 14 },
  webLayout: { flexDirection: "row", alignItems: "flex-start" },
  panel: {
    backgroundColor: NAVY_DEEP,
    borderWidth: 1,
    borderColor: DIVIDER,
    borderRadius: 16,
    padding: 18,
  },
  formPanel: { flex: 1.05 },
  resultPanel: { flex: 1 },
  panelTitle: {
    color: IVORY,
    fontFamily: "Inter_700Bold",
    fontSize: 18,
    marginBottom: 14,
  },
  segmentRow: { flexDirection: "row", gap: 8, marginBottom: 10, flexWrap: "wrap" },
  toggle: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: DIVIDER,
    backgroundColor: NAVY,
  },
  toggleActive: { borderColor: GOLD, backgroundColor: "rgba(201,169,97,0.13)" },
  toggleText: { color: MUTED, fontFamily: "Inter_600SemiBold", fontSize: 12 },
  toggleTextActive: { color: GOLD },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 6 },
  field: { width: Platform.OS === "web" ? "48%" : "100%" },
  fieldWide: { width: "100%" },
  label: {
    color: MUTED,
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    letterSpacing: 1.4,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  input: {
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(247,243,236,0.12)",
    backgroundColor: NAVY_ELEV,
    color: IVORY,
    fontFamily: "Inter_500Medium",
    fontSize: 15,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  textarea: { minHeight: 82, textAlignVertical: "top" },
  primaryButton: {
    marginTop: 16,
    minHeight: 54,
    borderRadius: 14,
    backgroundColor: GOLD,
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryText: { color: NAVY, fontFamily: "Inter_800ExtraBold", fontSize: 16 },
  errorText: { color: RED, fontFamily: "Inter_500Medium", fontSize: 12, marginTop: 12 },
  emptyState: { alignItems: "center", paddingVertical: 40, gap: 10 },
  emptyTitle: { color: IVORY, fontFamily: "Inter_700Bold", fontSize: 17 },
  emptyCopy: { color: MUTED, fontFamily: "Inter_400Regular", fontSize: 13, textAlign: "center", lineHeight: 19 },
  rankCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: DIVIDER,
    backgroundColor: NAVY,
    padding: 12,
    marginBottom: 10,
  },
  rankCardActive: { borderColor: GOLD, backgroundColor: "rgba(201,169,97,0.09)" },
  rankNumber: { color: GOLD, fontFamily: "Inter_800ExtraBold", fontSize: 17, width: 24 },
  rankTitle: { color: IVORY, fontFamily: "Inter_700Bold", fontSize: 15 },
  rankSub: { color: MUTED, fontFamily: "Inter_400Regular", fontSize: 12, lineHeight: 17, marginTop: 3 },
  score: { fontFamily: "Inter_800ExtraBold", fontSize: 24 },
  detailCard: { marginTop: 10, borderTopWidth: 1, borderTopColor: DIVIDER, paddingTop: 16 },
  detailHeader: { flexDirection: "row", justifyContent: "space-between", gap: 12, alignItems: "center" },
  detailTitle: { color: IVORY, fontFamily: "Inter_800ExtraBold", fontSize: 22 },
  detailSub: { color: MUTED, fontFamily: "Inter_500Medium", fontSize: 12, marginTop: 3 },
  scoreBadge: { borderRadius: 12, backgroundColor: "rgba(123,211,137,0.14)", paddingHorizontal: 10, paddingVertical: 8 },
  scoreBadgeText: { color: GREEN, fontFamily: "Inter_800ExtraBold", fontSize: 13 },
  factGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 16 },
  fact: { width: "48%", borderRadius: 10, backgroundColor: NAVY_ELEV, padding: 10 },
  factLabel: { color: MUTED, fontFamily: "Inter_600SemiBold", fontSize: 10, letterSpacing: 1 },
  factValue: { color: IVORY, fontFamily: "Inter_700Bold", fontSize: 13, marginTop: 5 },
  sectionHeading: { color: GOLD, fontFamily: "Inter_800ExtraBold", fontSize: 13, marginTop: 14, marginBottom: 8 },
  listRow: { flexDirection: "row", alignItems: "flex-start", gap: 8, marginBottom: 7 },
  bodyText: { color: MUTED, fontFamily: "Inter_400Regular", fontSize: 13, lineHeight: 19, flex: 1 },
  partnerCard: { borderRadius: 10, borderWidth: 1, borderColor: DIVIDER, padding: 10, marginBottom: 8 },
  partnerName: { color: IVORY, fontFamily: "Inter_700Bold", fontSize: 13 },
  partnerText: { color: MUTED, fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 4, lineHeight: 17 },
});
