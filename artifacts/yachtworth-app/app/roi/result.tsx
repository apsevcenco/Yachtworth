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
import { exportRoiDocument, type RoiHeader } from "../../lib/documentExport";
import { exportRoiPdf } from "../../lib/roiPdf";

const REGION_LABELS: Record<string, string> = {
  mediterranean: "Mediterranean",
  caribbean: "Caribbean",
  northern_europe: "Northern Europe",
  asia_pacific_me: "Asia-Pacific",
  middle_east: "Middle East",
};

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

// Always shows an explicit + / − sign (used in the exit-scenario block).
function signedEur(n: number): string {
  const abs = Math.abs(Math.round(n));
  return (n < 0 ? "− € " : "+ € ") + abs.toLocaleString("en-US");
}

function comparableTitle(c: NonNullable<RoiCalculation["comparables"]>[number]): string {
  return [c.model, c.name].filter(Boolean).join(" · ") || c.name;
}

function comparableMeta(c: NonNullable<RoiCalculation["comparables"]>[number]): string {
  return [c.location, c.year_built ? String(c.year_built) : null]
    .filter(Boolean)
    .join(" · ");
}

export default function RoiResultScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{
    data?: string;
    id?: string;
    header?: string;
  }>();

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

  // Yacht / region context for the exported report cover. Fresh path: passed
  // inline by the calculate screen. History path: derived from the saved
  // calculation's yacht_snapshot + input.region.
  const header: RoiHeader | undefined = useMemo(() => {
    if (typeof params.header === "string" && params.header) {
      try {
        const h = JSON.parse(params.header) as RoiHeader;
        if (h && typeof h === "object") return h;
      } catch {
        /* fall through to detail-derived header */
      }
    }
    const detail = detailQuery.data;
    if (detail) {
      const snap = detail.yacht_snapshot ?? null;
      const regionKey = detail.input?.region;
      return {
        yachtName: snap?.name ?? null,
        builder: snap?.brand ?? null,
        model: snap?.model ?? null,
        regionLabel: regionKey ? REGION_LABELS[regionKey] ?? null : null,
      };
    }
    return undefined;
  }, [params.header, detailQuery.data]);

  const [exporting, setExporting] = useState(false);
  const [exportingLegacy, setExportingLegacy] = useState(false);

  // Primary export: backend adaptive document engine (V2). Produces the
  // professionally laid-out, page-packed PDF.
  const onExport = async () => {
    if (!data || exporting) return;
    setExporting(true);
    try {
      await exportRoiDocument({ result: data, header });
    } catch (err) {
      Alert.alert(
        "Couldn't export PDF",
        err instanceof Error ? err.message : "Please try again.",
      );
    } finally {
      setExporting(false);
    }
  };

  // Secondary export: on-device generator (works offline / no backend).
  const onExportLegacy = async () => {
    if (!data || exportingLegacy) return;
    setExportingLegacy(true);
    try {
      await exportRoiPdf(data);
    } catch (err) {
      Alert.alert(
        "Couldn't export PDF",
        err instanceof Error ? err.message : "Please try again.",
      );
    } finally {
      setExportingLegacy(false);
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

        {/* DUAL-REGION INCOME BREAKDOWN */}
        {data.dual_region ? (
          <Card title="Dual-region charter income">
            <RegionIncomeBlock label="Region 1" income={data.dual_region.region_1} />
            <View style={styles.dualDivider} />
            <RegionIncomeBlock label="Region 2" income={data.dual_region.region_2} />
            <View style={styles.dualDivider} />
            <View style={styles.dualTotalRow}>
              <Text style={styles.dualTotalLabel}>Total gross charter income</Text>
              <Text style={styles.dualTotalValue}>
                {eur(data.dual_region.total_gross_income_eur)}
              </Text>
            </View>
            {data.dual_region.repositioning_cost_eur > 0 ? (
              <View style={styles.dualSubRow}>
                <Text style={styles.dualSubLabel}>Repositioning (both ways)</Text>
                <Text style={[styles.dualSubValue, { color: NEGATIVE }]}>
                  − {eur(data.dual_region.repositioning_cost_eur)}
                </Text>
              </View>
            ) : null}
            <View style={styles.dualTotalRow}>
              <Text style={styles.dualTotalLabel}>Net charter income</Text>
              <Text style={[styles.dualTotalValue, { color: GOLD }]}>
                {eur(data.dual_region.net_charter_income_eur)}
              </Text>
            </View>
          </Card>
        ) : null}

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

        {/* EXIT SCENARIO — sale after 5 years (only when purchase price entered) */}
        {data.exit_scenario ? (
          <Card title="Exit scenario · Sale after 5 years">
            <View style={styles.expRow}>
              <Text style={styles.expCat}>Purchase price</Text>
              <Text style={styles.expAmount}>
                {signedEur(-data.exit_scenario.purchase_price_eur)}
              </Text>
            </View>
            <View style={styles.expRow}>
              <Text style={styles.expCat}>Charter income (5 years)</Text>
              <Text style={styles.expAmount}>
                {signedEur(data.exit_scenario.charter_income_5y_eur)}
              </Text>
            </View>
            <View style={styles.expRow}>
              <Text style={styles.expCat}>Vessel value at sale</Text>
              <Text style={styles.expAmount}>
                {signedEur(data.exit_scenario.vessel_value_at_sale_eur)}
              </Text>
            </View>

            <View style={styles.exitDivider} />

            <View style={styles.expRow}>
              <Text style={styles.exitTotalLabel}>Total return</Text>
              <Text
                style={[
                  styles.exitTotalAmount,
                  {
                    color:
                      data.exit_scenario.exit_result_eur >= 0 ? POSITIVE : NEGATIVE,
                  },
                ]}
              >
                {signedEur(data.exit_scenario.exit_result_eur)}
              </Text>
            </View>
            <View style={styles.expRow}>
              <Text style={styles.expCat}>Return on investment</Text>
              <Text
                style={[
                  styles.expAmount,
                  {
                    color:
                      data.exit_scenario.exit_result_eur >= 0 ? POSITIVE : NEGATIVE,
                  },
                ]}
              >
                {data.exit_scenario.exit_result_pct >= 0 ? "+" : "−"}
                {Math.abs(data.exit_scenario.exit_result_pct).toFixed(1)}%
              </Text>
            </View>

            {data.exit_scenario.total_loan_paid_eur != null ? (
              <>
                <View style={styles.exitDivider} />
                <View style={styles.expRow}>
                  <Text style={styles.expCat}>Total loan paid</Text>
                  <Text style={styles.expAmount}>
                    {signedEur(-data.exit_scenario.total_loan_paid_eur)}
                  </Text>
                </View>
                <View style={styles.expRow}>
                  <Text style={styles.exitTotalLabel}>Net result after loan</Text>
                  <Text
                    style={[
                      styles.exitTotalAmount,
                      {
                        color:
                          (data.exit_scenario.exit_result_after_loan_eur ?? 0) >= 0
                            ? POSITIVE
                            : NEGATIVE,
                      },
                    ]}
                  >
                    {signedEur(data.exit_scenario.exit_result_after_loan_eur ?? 0)}
                  </Text>
                </View>
              </>
            ) : null}

            <Text style={styles.exitNote}>
              Based on 5% year-1 then 3.5%/yr depreciation. Actual sale price may
              vary with market conditions.
            </Text>
          </Card>
        ) : null}

        {/* COMPARABLES (AI only) */}
        {data.comparables && data.comparables.length > 0 ? (
          <Card title="Comparable charter listings">
            {data.comparables.map((c, i) => (
              <View key={i} style={styles.expRow}>
                <View style={{ flex: 1, paddingRight: 12 }}>
                  <Text style={styles.expCat}>{comparableTitle(c)}</Text>
                  {comparableMeta(c) ? (
                    <Text style={styles.expFormula}>{comparableMeta(c)}</Text>
                  ) : null}
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
          onPress={onExportLegacy}
          disabled={exportingLegacy}
          accessibilityRole="button"
          accessibilityLabel="Export legacy PDF"
          style={({ pressed }) => [
            styles.legacyBtn,
            { opacity: pressed || exportingLegacy ? 0.6 : 1 },
          ]}
        >
          {exportingLegacy ? (
            <ActivityIndicator color={MUTED} />
          ) : (
            <Text style={styles.legacyBtnText}>Export legacy PDF</Text>
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

const SEASON_LABELS: Record<string, string> = {
  high: "High season",
  shoulder: "Shoulder season",
  low: "Low season",
  mixed: "Full charter window",
};

function RegionIncomeBlock({
  label,
  income,
}: {
  label: string;
  income: NonNullable<RoiCalculation["dual_region"]>["region_1"];
}) {
  const regionName = REGION_LABELS[income.region] ?? income.region;
  const seasonName = income.season ? SEASON_LABELS[income.season] ?? income.season : null;
  const units =
    income.charter_type === "daily"
      ? `${income.expected_charter_days ?? Math.round(income.expected_charter_weeks * 7)} charter days`
      : `${income.expected_charter_weeks} charter weeks`;
  const rate =
    income.charter_type === "daily"
      ? `€${income.avg_daily_rate_eur.toLocaleString("en-US")}/day`
      : `€${income.weekly_rate_eur.toLocaleString("en-US")}/wk`;
  return (
    <View style={styles.dualRegionBlock}>
      <View style={styles.dualRegionHead}>
        <Text style={styles.dualRegionLabel}>
          {label} · {regionName}
        </Text>
        <Text style={styles.dualRegionIncome}>{eur(income.income_eur)}</Text>
      </View>
      <Text style={styles.dualRegionMeta}>
        {[seasonName, units, rate, `${income.occupancy_pct}% occupancy`]
          .filter(Boolean)
          .join(" · ")}
      </Text>
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
  dualRegionBlock: { marginBottom: 2 },
  dualRegionHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  dualRegionLabel: {
    flex: 1,
    color: IVORY,
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
  },
  dualRegionIncome: {
    color: IVORY,
    fontFamily: "Inter_700Bold",
    fontSize: 15,
  },
  dualRegionMeta: {
    color: MUTED,
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    lineHeight: 16,
    marginTop: 4,
  },
  dualDivider: {
    height: 1,
    backgroundColor: DIVIDER,
    marginVertical: 14,
  },
  dualTotalRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  dualTotalLabel: {
    flex: 1,
    color: IVORY,
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
  },
  dualTotalValue: {
    color: IVORY,
    fontFamily: "Inter_700Bold",
    fontSize: 15,
  },
  dualSubRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginTop: 8,
  },
  dualSubLabel: {
    flex: 1,
    color: MUTED,
    fontFamily: "Inter_400Regular",
    fontSize: 12,
  },
  dualSubValue: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
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
  exitDivider: {
    borderBottomColor: "rgba(247,243,236,0.18)",
    borderBottomWidth: 1,
    marginVertical: 4,
  },
  exitTotalLabel: { color: IVORY, fontFamily: "Inter_600SemiBold", fontSize: 14 },
  exitTotalAmount: { fontFamily: "Inter_700Bold", fontSize: 15 },
  exitNote: {
    color: MUTED,
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    lineHeight: 16,
    marginTop: 12,
  },
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
  legacyBtn: {
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    minHeight: 44,
  },
  legacyBtnText: {
    color: MUTED,
    fontFamily: "Inter_700Bold",
    fontSize: 13,
    textDecorationLine: "underline",
  },
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
