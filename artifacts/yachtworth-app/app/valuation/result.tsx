import { Feather } from "@expo/vector-icons";
import type { Valuation, Comparable } from "@workspace/api-client-react";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useMemo } from "react";
import { useUnits } from "../../hooks/useUnits";
import { formatComparableLength } from "../../lib/units";
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

const CONFIDENCE_META: Record<
  string,
  { label: string; color: string; bg: string }
> = {
  high: { label: "High confidence", color: "#9DE0B5", bg: "rgba(157,224,181,0.12)" },
  medium: { label: "Medium confidence", color: GOLD, bg: "rgba(201,169,97,0.14)" },
  low: { label: "Low confidence", color: "#FFB199", bg: "rgba(255,177,153,0.12)" },
};

function formatEur(n: number): string {
  return "€ " + Math.round(n).toLocaleString("en-US");
}

export default function ValuationResultScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { units } = useUnits();
  const params = useLocalSearchParams<{ data?: string }>();

  const result = useMemo<Valuation | null>(() => {
    if (!params.data) return null;
    try {
      return JSON.parse(params.data) as Valuation;
    } catch {
      return null;
    }
  }, [params.data]);

  if (!result) {
    return (
      <View style={[styles.root, { backgroundColor: NAVY, justifyContent: "center", alignItems: "center" }]}>
        <Text style={{ color: IVORY, fontFamily: "Inter_500Medium" }}>
          No estimate data
        </Text>
        <Pressable onPress={() => router.replace("/")} style={{ marginTop: 16 }}>
          <Text style={{ color: GOLD, fontFamily: "Inter_600SemiBold" }}>
            Back to home
          </Text>
        </Pressable>
      </View>
    );
  }

  const conf = CONFIDENCE_META[result.confidence] ?? CONFIDENCE_META.low;
  const tiers = [
    { key: "market", label: "Open market", value: result.estimated_price_eur, accent: true },
    { key: "discreet", label: "Discreet sale", value: result.distressed_price_eur, accent: false },
    { key: "quick", label: "Quick sale", value: result.quick_sale_price_eur, accent: false },
  ];
  const maxTier = Math.max(...tiers.map((t) => t.value));

  return (
    <View style={[styles.root, { backgroundColor: NAVY }]}>
      <View style={[styles.headerBar, { paddingTop: insets.top + 12 }]}>
        <Pressable onPress={() => router.replace("/")} hitSlop={16}>
          <Feather name="x" size={22} color={IVORY} />
        </Pressable>
        <Text style={styles.headerTitle}>Market estimate</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 24,
          paddingBottom: insets.bottom + 40,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero estimate */}
        <View style={styles.heroCard}>
          <Text style={styles.heroLabel}>Indicative market estimate</Text>
          <Text style={styles.heroPrice}>
            {formatEur(result.estimated_price_eur)}
          </Text>
          <Text style={styles.heroRange}>
            Range {formatEur(result.range_low_eur)} —{" "}
            {formatEur(result.range_high_eur)}
          </Text>

          <View
            style={[styles.confChip, { backgroundColor: conf.bg, borderColor: conf.color }]}
          >
            <View style={[styles.confDot, { backgroundColor: conf.color }]} />
            <Text style={[styles.confText, { color: conf.color }]}>
              {conf.label} · {result.completeness_score}% complete
            </Text>
          </View>
        </View>

        {/* Sale region + tax */}
        {result.sale_region_label ? (
          <View style={styles.metaCard}>
            <View style={styles.metaRow}>
              <Feather name="map-pin" size={13} color={GOLD} />
              <Text style={styles.metaText}>{result.sale_region_label}</Text>
            </View>
            {result.vat_status ? (
              <View style={styles.metaRow}>
                <Feather name="file-text" size={13} color={GOLD} />
                <Text style={styles.metaText}>
                  {result.vat_status === "paid"
                    ? "Tax paid (EU free circulation)"
                    : "Tax not paid (offshore)"}
                </Text>
              </View>
            ) : null}
            {result.completeness_filled != null &&
            result.completeness_total != null ? (
              <View style={styles.metaRow}>
                <Feather name="check-circle" size={13} color={GOLD} />
                <Text style={styles.metaText}>
                  {result.completeness_filled}/{result.completeness_total} fields
                  filled · {result.completeness_score}% data quality
                </Text>
              </View>
            ) : null}
          </View>
        ) : null}

        {/* Sanity adjusted notice */}
        {result.sanity_adjusted ? (
          <View style={styles.notice}>
            <Feather name="shield" size={14} color={GOLD} />
            <Text style={styles.noticeText}>
              Estimate adjusted to match market band
              {result.sanity_band_label ? ` (${result.sanity_band_label})` : ""}.
            </Text>
          </View>
        ) : null}

        {/* Condition adjustment */}
        {result.condition_adjustment_pct !== 0 ? (
          <View style={styles.conditionLine}>
            <Text style={styles.conditionText}>
              Condition adjustment{" "}
              <Text style={{ color: IVORY }}>
                {result.condition_adjustment_pct > 0 ? "+" : ""}
                {result.condition_adjustment_pct}%
              </Text>{" "}
              · baseline {formatEur(result.condition_baseline_eur)}
            </Text>
          </View>
        ) : null}

        {/* Tier chart */}
        <Text style={styles.sectionTitle}>Pricing scenarios</Text>
        <View style={styles.tiersWrap}>
          {tiers.map((t) => {
            const widthPct = (t.value / maxTier) * 100;
            return (
              <View key={t.key} style={styles.tierRow}>
                <View style={styles.tierHead}>
                  <Text style={styles.tierLabel}>{t.label}</Text>
                  <Text style={[styles.tierValue, t.accent && { color: GOLD }]}>
                    {formatEur(t.value)}
                  </Text>
                </View>
                <View style={styles.barTrack}>
                  <View
                    style={[
                      styles.barFill,
                      {
                        width: `${widthPct}%`,
                        backgroundColor: t.accent ? GOLD : "rgba(201,169,97,0.45)",
                      },
                    ]}
                  />
                </View>
              </View>
            );
          })}
        </View>

        {/* AI reasoning */}
        {result.reasoning ? (
          <>
            <Text style={styles.sectionTitle}>Analyst's note</Text>
            <View style={styles.reasoningCard}>
              <Text style={styles.reasoningText}>{result.reasoning}</Text>
            </View>
          </>
        ) : null}

        {/* Comparables */}
        {result.comparables.length > 0 ? (
          <>
            <Text style={styles.sectionTitle}>Comparable yachts</Text>
            {result.comparables.map((c, i) => (
              <ComparableCard key={i} c={c} units={units} />
            ))}
          </>
        ) : null}

        {/* PDYE block */}
        <View style={styles.poweredBy}>
          <Text style={styles.poweredByText}>
            Need broker support for this yacht?{"\n"}
            <Text style={{ color: GOLD }}>Powered by PDYE</Text>
          </Text>
        </View>

        {/* CTA new */}
        <Pressable
          onPress={() => router.replace("/valuation/new")}
          style={({ pressed }) => [
            styles.secondaryCta,
            { opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <Text style={styles.secondaryCtaText}>New estimate</Text>
          <Feather name="refresh-cw" size={16} color={GOLD} />
        </Pressable>

        {/* Legal disclaimer — server-injected, rendered verbatim. */}
        {result.legal_disclaimer ? (
          <Text style={styles.disclaimer}>{result.legal_disclaimer}</Text>
        ) : null}
      </ScrollView>
    </View>
  );
}

function ComparableCard({
  c,
  units,
}: {
  c: Comparable;
  units: "metric" | "imperial";
}) {
  const head = [c.builder, c.model].filter(Boolean).join(" ") || "Listing";
  const meta = [
    c.year ? String(c.year) : null,
    c.length ? formatComparableLength(c.length, units) : null,
    c.condition || null,
  ]
    .filter(Boolean)
    .join(" · ");
  return (
    <View style={styles.compCard}>
      <View style={{ flex: 1 }}>
        <Text style={styles.compHead}>{head}</Text>
        {meta ? <Text style={styles.compMeta}>{meta}</Text> : null}
        {c.note ? <Text style={styles.compNote}>{c.note}</Text> : null}
      </View>
      <Text style={styles.compPrice}>{c.price}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  headerTitle: {
    color: IVORY,
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    letterSpacing: 0.3,
  },
  heroCard: {
    backgroundColor: NAVY_DEEP,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(201,169,97,0.18)",
    padding: 22,
    marginTop: 4,
    marginBottom: 16,
  },
  heroLabel: {
    color: GOLD,
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    letterSpacing: 2,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  heroPrice: {
    color: IVORY,
    fontFamily: "Gilroy-ExtraBold",
    fontSize: 38,
    letterSpacing: -0.6,
  },
  heroRange: {
    color: MUTED,
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    marginTop: 6,
  },
  confChip: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginTop: 18,
  },
  confDot: { width: 6, height: 6, borderRadius: 3 },
  confText: { fontFamily: "Inter_500Medium", fontSize: 11, letterSpacing: 0.3 },
  notice: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "rgba(201,169,97,0.06)",
    borderColor: "rgba(201,169,97,0.25)",
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  noticeText: {
    flex: 1,
    color: "rgba(247,243,236,0.75)",
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    lineHeight: 17,
  },
  metaCard: {
    backgroundColor: NAVY_ELEV,
    borderRadius: 12,
    padding: 14,
    gap: 8,
    marginBottom: 14,
  },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  metaText: {
    flex: 1,
    color: "rgba(247,243,236,0.85)",
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    lineHeight: 17,
  },
  conditionLine: { paddingHorizontal: 4, marginBottom: 24 },
  conditionText: {
    color: MUTED,
    fontFamily: "Inter_400Regular",
    fontSize: 12,
  },
  sectionTitle: {
    color: IVORY,
    fontFamily: "Gilroy-Regular",
    fontSize: 19,
    marginTop: 20,
    marginBottom: 12,
  },
  tiersWrap: { gap: 14 },
  tierRow: {},
  tierHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginBottom: 6,
  },
  tierLabel: {
    color: "rgba(247,243,236,0.7)",
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  tierValue: {
    color: IVORY,
    fontFamily: "Gilroy-Regular",
    fontSize: 17,
  },
  barTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(247,243,236,0.06)",
    overflow: "hidden",
  },
  barFill: { height: "100%", borderRadius: 3 },
  reasoningCard: {
    backgroundColor: NAVY_ELEV,
    borderRadius: 14,
    padding: 16,
  },
  reasoningText: {
    color: "rgba(247,243,236,0.85)",
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    lineHeight: 21,
  },
  compCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    backgroundColor: NAVY_ELEV,
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
  },
  compHead: {
    color: IVORY,
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
  },
  compMeta: {
    color: MUTED,
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    marginTop: 2,
  },
  compNote: {
    color: "rgba(247,243,236,0.55)",
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    marginTop: 6,
    lineHeight: 17,
  },
  compPrice: {
    color: GOLD,
    fontFamily: "Gilroy-Regular",
    fontSize: 14,
  },
  poweredBy: {
    marginTop: 28,
    backgroundColor: NAVY_DEEP,
    borderRadius: 14,
    padding: 18,
    alignItems: "center",
  },
  poweredByText: {
    color: MUTED,
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    textAlign: "center",
    lineHeight: 19,
    letterSpacing: 0.3,
  },
  secondaryCta: {
    marginTop: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: GOLD,
  },
  disclaimer: {
    color: "rgba(247,243,236,0.4)",
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    lineHeight: 16,
    marginTop: 18,
    paddingHorizontal: 4,
    textAlign: "center",
  },
  secondaryCtaText: {
    color: GOLD,
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
  },
});
