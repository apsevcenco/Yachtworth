import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useMemo } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
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

interface BreakdownEntry {
  category: string;
  amount_eur: number;
  formula?: string | null;
}
interface CategorySummary {
  category: string;
  amount_eur: number;
  color_hint: string;
}
interface CostResult {
  total_annual_eur: number;
  cost_per_day_eur: number;
  cost_per_week_eur: number;
  crew_total_eur: number;
  operations_total_eur: number;
  maintenance_total_eur: number;
  financing_total_eur: number;
  crew_breakdown: BreakdownEntry[];
  operations_breakdown: BreakdownEntry[];
  maintenance_breakdown: BreakdownEntry[];
  financing_breakdown: BreakdownEntry[];
  category_summary: CategorySummary[];
  charter_break_even_weeks: number | null;
  currency: string;
  legal_disclaimer: string;
  yacht_name?: string | null;
  builder?: string | null;
  model?: string | null;
  yacht_class: string;
  length_meters: number;
  year_built: number;
}
interface CostEstimateEnvelope {
  id: string | null;
  created_at: string | null;
  result: CostResult;
}

const CLASS_LABEL: Record<string, string> = {
  motor_yacht: "Motor yacht",
  sailing_yacht: "Sailing yacht",
  catamaran: "Catamaran",
  superyacht: "Superyacht",
};

function fmtEur(n: number): string {
  return `€${Math.round(n).toLocaleString("en-US")}`;
}

export default function CostResultScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ data?: string }>();

  const envelope = useMemo<CostEstimateEnvelope | null>(() => {
    if (!params.data) return null;
    try {
      return JSON.parse(params.data) as CostEstimateEnvelope;
    } catch {
      return null;
    }
  }, [params.data]);

  if (!envelope) {
    return (
      <View style={[styles.root, { paddingTop: insets.top + 24 }]}>
        <TopBar onBack={() => router.back()} />
        <View style={styles.empty}>
          <Feather name="alert-circle" size={28} color={GOLD} />
          <Text style={styles.emptyTitle}>No estimate to show</Text>
          <Pressable
            onPress={() => router.replace("/cost/new")}
            style={({ pressed }) => [
              styles.primaryBtn,
              { opacity: pressed ? 0.85 : 1, marginTop: 18, paddingHorizontal: 36 },
            ]}
          >
            <Text style={styles.primaryBtnText}>Start over</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const r = envelope.result;
  const lenLabel = `${r.length_meters.toFixed(1)} m`;

  return (
    <View style={[styles.root, { paddingTop: insets.top + 16 }]}>
      <TopBar onBack={() => router.back()} />

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 24,
          paddingBottom: insets.bottom + 32,
        }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.kicker}>ANNUAL COST ESTIMATE</Text>
        {r.yacht_name ? <Text style={styles.yachtName}>{r.yacht_name}</Text> : null}
        {(r.builder || r.model) ? (
          <Text style={styles.yachtBuilder}>
            {[r.builder, r.model].filter(Boolean).join(" · ")}
          </Text>
        ) : null}
        <Text style={styles.yachtMeta}>
          {CLASS_LABEL[r.yacht_class] ?? r.yacht_class} · {lenLabel} · {r.year_built}
        </Text>

        <View style={styles.heroCard}>
          <Text style={styles.heroLabel}>TOTAL PER YEAR</Text>
          <Text style={styles.heroValue}>{fmtEur(r.total_annual_eur)}</Text>
          <View style={styles.heroRow}>
            <View style={styles.heroChip}>
              <Text style={styles.heroChipLabel}>PER DAY</Text>
              <Text style={styles.heroChipValue}>{fmtEur(r.cost_per_day_eur)}</Text>
            </View>
            <View style={styles.heroChip}>
              <Text style={styles.heroChipLabel}>PER WEEK</Text>
              <Text style={styles.heroChipValue}>{fmtEur(r.cost_per_week_eur)}</Text>
            </View>
          </View>
        </View>

        {r.charter_break_even_weeks != null ? (
          <View style={styles.charterCard}>
            <Feather name="trending-up" size={18} color={GOLD} />
            <View style={{ flex: 1 }}>
              <Text style={styles.charterTitle}>Charter break-even</Text>
              <Text style={styles.charterSub}>
                ≈ {r.charter_break_even_weeks} weeks of charter at typical regional rates
                would cover annual ownership costs (after broker commission).
              </Text>
            </View>
          </View>
        ) : null}

        <Text style={styles.sectionTitle}>By category</Text>
        <View style={styles.catRow}>
          {r.category_summary.map((c) => {
            const pct = r.total_annual_eur > 0 ? c.amount_eur / r.total_annual_eur : 0;
            return (
              <View key={c.category} style={styles.catCard}>
                <View style={[styles.catSwatch, { backgroundColor: c.color_hint }]} />
                <Text style={styles.catLabel}>{c.category}</Text>
                <Text style={styles.catValue}>{fmtEur(c.amount_eur)}</Text>
                <Text style={styles.catPct}>{Math.round(pct * 100)}%</Text>
              </View>
            );
          })}
        </View>

        {r.crew_breakdown.length > 0 && (
          <Section title="Crew" total={r.crew_total_eur} items={r.crew_breakdown} />
        )}
        {r.operations_breakdown.length > 0 && (
          <Section
            title="Mooring & Operations"
            total={r.operations_total_eur}
            items={r.operations_breakdown}
          />
        )}
        {r.maintenance_breakdown.length > 0 && (
          <Section
            title="Maintenance & Technical"
            total={r.maintenance_total_eur}
            items={r.maintenance_breakdown}
          />
        )}
        {r.financing_breakdown.length > 0 && (
          <Section
            title="Financing"
            total={r.financing_total_eur}
            items={r.financing_breakdown}
          />
        )}

        <Pressable
          onPress={() => router.replace("/cost/new")}
          style={({ pressed }) => [
            styles.primaryBtn,
            { opacity: pressed ? 0.85 : 1, marginTop: 24 },
          ]}
        >
          <Text style={styles.primaryBtnText}>New cost estimate</Text>
        </Pressable>

        <Text style={styles.disclaimer}>{r.legal_disclaimer}</Text>

        <View style={styles.poweredBy}>
          <Text style={styles.poweredByText}>POWERED BY PDYE</Text>
        </View>
      </ScrollView>
    </View>
  );
}

function Section({
  title,
  total,
  items,
}: {
  title: string;
  total: number;
  items: BreakdownEntry[];
}) {
  return (
    <View style={styles.sectionCard}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionCardTitle}>{title}</Text>
        <Text style={styles.sectionCardTotal}>{fmtEur(total)}</Text>
      </View>
      {items.map((it, i) => (
        <View
          key={`${it.category}-${i}`}
          style={[
            styles.itemRow,
            i === items.length - 1 && { borderBottomWidth: 0 },
          ]}
        >
          <View style={{ flex: 1 }}>
            <Text style={styles.itemCategory}>{it.category}</Text>
            {it.formula ? <Text style={styles.itemFormula}>{it.formula}</Text> : null}
          </View>
          <Text style={styles.itemAmount}>{fmtEur(it.amount_eur)}</Text>
        </View>
      ))}
    </View>
  );
}

function TopBar({ onBack }: { onBack: () => void }) {
  return (
    <View style={styles.topBar}>
      <Pressable onPress={onBack} hitSlop={12}>
        <Feather name="chevron-left" size={26} color={GOLD} />
      </Pressable>
      <Text style={styles.topBarTitle}>Cost estimate</Text>
      <View style={{ width: 26 }} />
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
    marginBottom: 16,
  },
  topBarTitle: { color: IVORY, fontFamily: "Inter_600SemiBold", fontSize: 16 },
  kicker: {
    color: GOLD,
    fontFamily: "Inter_700Bold",
    fontSize: 11,
    letterSpacing: 1.8,
  },
  yachtName: {
    color: IVORY,
    fontFamily: "Gilroy-ExtraBold",
    fontSize: 26,
    marginTop: 6,
  },
  yachtBuilder: {
    color: GOLD,
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    marginTop: 4,
    letterSpacing: 0.2,
  },
  yachtMeta: {
    color: MUTED,
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    letterSpacing: 0.4,
    marginTop: 4,
  },
  heroCard: {
    marginTop: 22,
    backgroundColor: NAVY_ELEV,
    borderRadius: 18,
    padding: 22,
    borderColor: "rgba(201,169,97,0.25)",
    borderWidth: 1,
  },
  heroLabel: {
    color: MUTED,
    fontFamily: "Inter_700Bold",
    fontSize: 10,
    letterSpacing: 1.8,
  },
  heroValue: {
    color: GOLD,
    fontFamily: "Gilroy-ExtraBold",
    fontSize: 40,
    marginTop: 6,
    letterSpacing: -0.5,
  },
  heroRow: { flexDirection: "row", gap: 10, marginTop: 18 },
  heroChip: {
    flex: 1,
    backgroundColor: NAVY_DEEP,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  heroChipLabel: {
    color: MUTED,
    fontFamily: "Inter_600SemiBold",
    fontSize: 10,
    letterSpacing: 1.2,
  },
  heroChipValue: {
    color: IVORY,
    fontFamily: "Gilroy-ExtraBold",
    fontSize: 18,
    marginTop: 4,
  },
  charterCard: {
    marginTop: 14,
    backgroundColor: "rgba(201,169,97,0.06)",
    borderColor: "rgba(201,169,97,0.3)",
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
  },
  charterTitle: { color: GOLD, fontFamily: "Inter_700Bold", fontSize: 13 },
  charterSub: {
    color: "rgba(247,243,236,0.75)",
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
  sectionTitle: {
    color: IVORY,
    fontFamily: "Gilroy-Regular",
    fontSize: 18,
    marginTop: 28,
    marginBottom: 12,
  },
  catRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  catCard: {
    flexBasis: "47%",
    flexGrow: 1,
    backgroundColor: NAVY_ELEV,
    borderRadius: 12,
    padding: 14,
  },
  catSwatch: { width: 24, height: 4, borderRadius: 2, marginBottom: 8 },
  catLabel: {
    color: MUTED,
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    letterSpacing: 0.6,
  },
  catValue: {
    color: IVORY,
    fontFamily: "Gilroy-ExtraBold",
    fontSize: 18,
    marginTop: 4,
  },
  catPct: {
    color: GOLD,
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    marginTop: 2,
  },
  sectionCard: {
    marginTop: 14,
    backgroundColor: NAVY_ELEV,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 4,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  sectionCardTitle: {
    color: IVORY,
    fontFamily: "Inter_700Bold",
    fontSize: 14,
  },
  sectionCardTotal: {
    color: GOLD,
    fontFamily: "Inter_700Bold",
    fontSize: 14,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 11,
    borderBottomColor: DIVIDER,
    borderBottomWidth: 1,
  },
  itemCategory: { color: IVORY, fontFamily: "Inter_500Medium", fontSize: 13 },
  itemFormula: {
    color: MUTED,
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    marginTop: 2,
  },
  itemAmount: { color: IVORY, fontFamily: "Inter_600SemiBold", fontSize: 13 },
  primaryBtn: {
    backgroundColor: "rgba(201,169,97,0.10)",
    borderWidth: 1.5,
    borderColor: GOLD,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  primaryBtnText: { color: GOLD, fontFamily: "Inter_700Bold", fontSize: 15 },
  disclaimer: {
    color: MUTED,
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    lineHeight: 16,
    textAlign: "center",
    marginTop: 18,
    paddingHorizontal: 8,
  },
  poweredBy: { marginTop: 24, alignItems: "center" },
  poweredByText: {
    color: "rgba(201,169,97,0.7)",
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    letterSpacing: 1.5,
  },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24 },
  emptyTitle: { color: IVORY, fontFamily: "Gilroy-Regular", fontSize: 20, marginTop: 14 },
});
