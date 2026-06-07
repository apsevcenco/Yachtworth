import { Feather } from "@expo/vector-icons";
import {
  getGetRoiCalculationQueryKey,
  useGetRoiCalculation,
  type RoiCalculation,
} from "@workspace/api-client-react";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { exportRoiPdf } from "../../lib/roiPdf";

const NAVY = "#0B1E3F";
const NAVY_DEEP = "#081633";
const GOLD = "#C9A961";
const IVORY = "#F7F3EC";
const MUTED = "rgba(247,243,236,0.55)";
const DIVIDER = "rgba(247,243,236,0.08)";
const POSITIVE = "#7BD389";
const NEGATIVE = "#FF8A8A";

function eur(n: number | null | undefined): string {
  if (n == null) return "—";
  const abs = Math.abs(Math.round(n));
  const formatted = abs.toLocaleString("en-US");
  return (n < 0 ? "−€ " : "€ ") + formatted;
}

export default function RoiResultScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ data?: string; id?: string }>();

  const inlineData: RoiCalculation | null = useMemo(() => {
    if (typeof params.data !== "string") return null;
    try {
      return JSON.parse(params.data) as RoiCalculation;
    } catch {
      return null;
    }
  }, [params.data]);

  const idParam = typeof params.id === "string" ? params.id : "";
  const detailQuery = useGetRoiCalculation(idParam, {
    query: {
      queryKey: getGetRoiCalculationQueryKey(idParam),
      enabled: Boolean(idParam && !inlineData),
      staleTime: 30_000,
    },
  });

  const data: RoiCalculation | null = useMemo(() => {
    if (inlineData) return inlineData;
    return (detailQuery.data?.result as unknown as RoiCalculation) ?? null;
  }, [inlineData, detailQuery.data]);

  const [exporting, setExporting] = useState(false);
  const onExport = async () => {
    if (!data || exporting) return;
    setExporting(true);
    try {
      await exportRoiPdf(data);
    } catch (err) {
      Alert.alert(
        "Couldn't export PDF",
        err instanceof Error ? err.message : "Please try again.",
      );
    } finally {
      setExporting(false);
    }
  };

  if (idParam && !inlineData && detailQuery.isLoading) {
    return (
      <View style={[styles.root, { paddingTop: insets.top + 72 }]}>
        <TopBar onBack={() => router.back()} title="ROI result" />
        <View style={styles.empty}>
          <ActivityIndicator color={GOLD} />
        </View>
      </View>
    );
  }

  if (!data) {
    return (
      <View style={[styles.root, { paddingTop: insets.top + 72 }]}>
        <TopBar onBack={() => router.back()} title="ROI result" />
        <View style={styles.empty}>
          <Feather name="alert-circle" size={26} color={GOLD} />
          <Text style={styles.emptyTitle}>Could not load result</Text>
        </View>
      </View>
    );
  }

  const netPositive = data.net_profit_eur >= 0;
  const paybackDisplay =
    data.payback_years >= 999 ? "—" : `${data.payback_years.toFixed(1)} yr`;

  return (
    <View style={[styles.root, { paddingTop: insets.top + 64 }]}>
      <TopBar onBack={() => router.back()} title="ROI result" />
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 24,
          paddingBottom: insets.bottom + 40,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* HERO */}
        <View style={styles.hero}>
          <Text style={styles.heroKicker}>ANNUAL NET</Text>
          <Text style={[styles.heroValue, { color: netPositive ? POSITIVE : NEGATIVE }]}>
            {eur(data.net_profit_eur)}
          </Text>
          <View style={styles.chipRow}>
            <Chip label={`${data.roi_pct.toFixed(1)}% ROI`} />
            <Chip label={`Payback ${paybackDisplay}`} />
            <Chip label={`${data.confidence} confidence`} muted />
          </View>
        </View>

        {/* REVENUE / EXPENSES SUMMARY */}
        <View style={styles.row2}>
          <SummaryCard
            label="Annual revenue"
            value={eur(data.annual_revenue_eur)}
            sub={`${data.expected_charter_weeks} weeks · €${data.avg_daily_rate_eur.toLocaleString("en-US")}/day`}
          />
          <SummaryCard
            label="Annual expenses"
            value={eur(data.annual_expenses_eur)}
            sub={`${data.occupancy_pct}% occupancy`}
          />
        </View>

        {/* CALCULATION METHOD */}
        {data.methodology ? (
          <Card title="How this was calculated">
            <Text style={styles.reasoning}>{data.methodology}</Text>
          </Card>
        ) : null}

        {/* EXPENSE BREAKDOWN */}
        <Card title="Expense breakdown">
          {data.expenses.map((e) => (
            <View key={e.category} style={styles.expRow}>
              <View style={{ flex: 1, paddingRight: 12 }}>
                <Text style={styles.expCat}>{e.category}</Text>
                {e.formula ? <Text style={styles.expFormula}>{e.formula}</Text> : null}
              </View>
              <Text style={styles.expAmount}>{eur(e.amount_eur)}</Text>
            </View>
          ))}
        </Card>

        {/* 5Y PROJECTION */}
        <Card title="Cumulative cash · 5 years">
          {data.roi_projection_5y.map((p) => (
            <View key={p.year_offset} style={styles.expRow}>
              <Text style={styles.expCat}>Year {p.year_offset}</Text>
              <Text style={[styles.expAmount, { color: p.value_eur >= 0 ? POSITIVE : NEGATIVE }]}>
                {eur(p.value_eur)}
              </Text>
            </View>
          ))}
        </Card>

        {/* DEPRECIATION */}
        <Card title="Yacht value · 5-year depreciation">
          {data.depreciation_curve.map((d) => (
            <View key={d.year_offset} style={styles.expRow}>
              <Text style={styles.expCat}>
                {d.year_offset === 0 ? "Today" : `Year ${d.year_offset}`}
              </Text>
              <Text style={styles.expAmount}>{eur(d.value_eur)}</Text>
            </View>
          ))}
        </Card>

        {/* COMPARABLES (AI only) */}
        {data.comparables && data.comparables.length > 0 ? (
          <Card title="Comparable charter listings">
            {data.comparables.map((c, i) => (
              <View key={i} style={styles.expRow}>
                <View style={{ flex: 1, paddingRight: 12 }}>
                  <Text style={styles.expCat}>{c.name}</Text>
                  {c.location ? <Text style={styles.expFormula}>{c.location}</Text> : null}
                </View>
                {c.weekly_rate_eur != null ? (
                  <Text style={styles.expAmount}>{eur(c.weekly_rate_eur)}/wk</Text>
                ) : null}
              </View>
            ))}
          </Card>
        ) : null}

        {/* REASONING */}
        {data.reasoning ? (
          <Card title="Analysis">
            <Text style={styles.reasoning}>{data.reasoning}</Text>
          </Card>
        ) : null}

        {/* RECOMMENDATIONS */}
        {data.recommendations && data.recommendations.length > 0 ? (
          <Card title="Recommendations">
            {data.recommendations.map((r, i) => (
              <View key={i} style={styles.recRow}>
                <Feather name="check" size={14} color={GOLD} style={{ marginTop: 3 }} />
                <Text style={styles.recText}>{r}</Text>
              </View>
            ))}
          </Card>
        ) : null}

        <Text style={styles.disclaimer}>{data.legal_disclaimer}</Text>

        <Pressable
          onPress={onExport}
          disabled={exporting}
          accessibilityRole="button"
          accessibilityLabel="Export PDF report"
          style={({ pressed }) => [
            styles.primaryBtn,
            { opacity: pressed || exporting ? 0.85 : 1 },
          ]}
        >
          {exporting ? (
            <ActivityIndicator color={NAVY} />
          ) : (
            <>
              <Feather name="download" size={16} color={NAVY} />
              <Text style={styles.primaryBtnText}>Export PDF report</Text>
            </>
          )}
        </Pressable>

        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [
            styles.secondaryBtn,
            { opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <Text style={styles.secondaryBtnText}>Run another scenario</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

// ── subcomponents ──────────────────────────────────────────────────

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

function Chip({ label, muted }: { label: string; muted?: boolean }) {
  return (
    <View style={[styles.chip, muted && { borderColor: DIVIDER }]}>
      <Text style={[styles.chipText, muted && { color: MUTED }]}>{label}</Text>
    </View>
  );
}

function SummaryCard({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <View style={styles.summaryCard}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
      <Text style={styles.summarySub}>{sub}</Text>
    </View>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      {children}
    </View>
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
  topBarTitle: { color: IVORY, fontFamily: "Inter_600SemiBold", fontSize: 16 },
  hero: { alignItems: "center", marginBottom: 28, marginTop: 8 },
  heroKicker: {
    color: GOLD,
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    letterSpacing: 2,
    marginBottom: 10,
  },
  heroValue: { fontFamily: "Gilroy-ExtraBold", fontSize: 40, letterSpacing: -0.5 },
  chipRow: { flexDirection: "row", gap: 8, marginTop: 14, flexWrap: "wrap", justifyContent: "center" },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderColor: GOLD,
    borderWidth: 1,
  },
  chipText: { color: GOLD, fontFamily: "Inter_500Medium", fontSize: 11, letterSpacing: 0.5 },
  row2: { flexDirection: "row", gap: 12, marginBottom: 20 },
  summaryCard: {
    flex: 1,
    backgroundColor: NAVY_DEEP,
    borderColor: DIVIDER,
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
  },
  summaryLabel: {
    color: MUTED,
    fontFamily: "Inter_500Medium",
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  summaryValue: { color: IVORY, fontFamily: "Gilroy-ExtraBold", fontSize: 20, marginBottom: 6 },
  summarySub: { color: MUTED, fontFamily: "Inter_400Regular", fontSize: 11, lineHeight: 15 },
  card: {
    backgroundColor: NAVY_DEEP,
    borderColor: DIVIDER,
    borderWidth: 1,
    borderRadius: 14,
    padding: 18,
    marginBottom: 16,
  },
  cardTitle: {
    color: GOLD,
    fontFamily: "Inter_700Bold",
    fontSize: 11,
    letterSpacing: 1.6,
    marginBottom: 14,
  },
  expRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomColor: DIVIDER,
    borderBottomWidth: 1,
  },
  expCat: { color: IVORY, fontFamily: "Inter_500Medium", fontSize: 13 },
  expFormula: { color: MUTED, fontFamily: "Inter_400Regular", fontSize: 10, marginTop: 2 },
  expAmount: { color: IVORY, fontFamily: "Inter_600SemiBold", fontSize: 13 },
  reasoning: { color: IVORY, fontFamily: "Inter_400Regular", fontSize: 13, lineHeight: 19 },
  recRow: { flexDirection: "row", gap: 10, marginBottom: 10 },
  recText: { flex: 1, color: IVORY, fontFamily: "Inter_400Regular", fontSize: 13, lineHeight: 19 },
  disclaimer: {
    color: MUTED,
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    textAlign: "center",
    marginTop: 20,
    marginBottom: 24,
    lineHeight: 16,
  },
  primaryBtn: {
    flexDirection: "row",
    gap: 8,
    backgroundColor: GOLD,
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    minHeight: 50,
  },
  primaryBtnText: { color: NAVY, fontFamily: "Inter_700Bold", fontSize: 14 },
  secondaryBtn: {
    borderColor: GOLD,
    borderWidth: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  secondaryBtnText: { color: GOLD, fontFamily: "Inter_700Bold", fontSize: 14 },
  empty: { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyTitle: { color: IVORY, fontFamily: "Gilroy-Regular", fontSize: 20, marginTop: 14 },
});
