import { Feather } from "@expo/vector-icons";
import {
  useAiRateEstimate,
  type AiRateEstimateResult,
} from "@workspace/api-client-react";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

const NAVY_DEEP = "#081633";
const GOLD = "#C9A961";
const IVORY = "#F7F3EC";
const MUTED = "rgba(247,243,236,0.55)";
const DIVIDER = "rgba(247,243,236,0.10)";
const ERROR = "#FF8A8A";

type Region =
  | "mediterranean"
  | "caribbean"
  | "northern_europe"
  | "asia_pacific_me"
  | "middle_east";
type Season = "high" | "shoulder" | "low";
type RatePeriod = "day" | "week";
type CharterType = "crewed" | "bareboat";

export interface AIRateEstimatorProps {
  yachtId: string;
  region: Region;
  season: Season;
  ratePeriod: RatePeriod;
  charterType?: CharterType | null;
  /** Called with the recommended rate in EUR when user taps "Use" */
  onAccept: (
    rate: number,
    period: RatePeriod,
    seasonalRates: AiRateEstimateResult["seasonal_rates"],
  ) => void;
}

function formatEUR(n: number | null | undefined): string {
  if (n == null) return "—";
  return `€${Math.round(n).toLocaleString("en-US")}`;
}

const SOURCE_HOST = (s: string) =>
  s.replace(/^https?:\/\//, "").replace(/\/.*$/, "");

export function AIRateEstimator({
  yachtId,
  region,
  season,
  ratePeriod,
  charterType,
  onAccept,
}: AIRateEstimatorProps) {
  const mutation = useAiRateEstimate();
  const [result, setResult] = useState<AiRateEstimateResult | null>(null);

  const run = async () => {
    setResult(null);
    try {
      const data = await mutation.mutateAsync({
        data: {
          yacht_id: yachtId,
          region,
          season,
          rate_period: ratePeriod,
          charter_type: charterType ?? null,
        },
      });
      setResult(data);
    } catch {
      // network/transport — handled below via mutation.error
    }
  };

  const renderResult = (r: AiRateEstimateResult) => {
    if (!r.success || r.rate == null) {
      return (
        <View style={[styles.panel, styles.panelError]}>
          <View style={styles.headerRow}>
            <Feather name="alert-circle" size={16} color={ERROR} />
            <Text style={styles.headerLabel}>Could not retrieve rates</Text>
          </View>
          <Text style={styles.errorBody}>
            {r.error ||
              "No comparable listings found. Please enter the rate manually."}
          </Text>
          <View style={styles.actionRow}>
            <Pressable
              onPress={run}
              style={({ pressed }) => [
                styles.secondaryBtn,
                { opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <Feather name="refresh-cw" size={14} color={GOLD} />
              <Text style={styles.secondaryBtnText}>Try again</Text>
            </Pressable>
          </View>
        </View>
      );
    }

    const lowConfidence = r.confidence === "low";
    const period = r.period || ratePeriod;
    const perLabel = period === "day" ? "/ day" : "/ week";

    return (
      <View style={[styles.panel, lowConfidence && styles.panelWarn]}>
        <View style={styles.headerRow}>
          <Feather
            name={lowConfidence ? "alert-triangle" : "trending-up"}
            size={16}
            color={GOLD}
          />
          <Text style={styles.headerLabel}>
            {lowConfidence ? "Limited data" : "AI market estimate"}
          </Text>
          {r.ai_used ? <Text style={styles.aiBadge}>AI · web search</Text> : null}
        </View>

        <Text style={styles.recoLabel}>RECOMMENDED RATE</Text>
        <Text style={styles.recoRate}>
          {formatEUR(r.rate)}{" "}
          <Text style={styles.recoUnit}>{perLabel}</Text>
        </Text>

        {r.range_min != null && r.range_max != null ? (
          <Text style={styles.rangeText}>
            Range found: {formatEUR(r.range_min)} – {formatEUR(r.range_max)}
          </Text>
        ) : null}
        <Text style={styles.metaText}>
          Based on {r.comparables_found ?? 0} comparable listing
          {(r.comparables_found ?? 0) === 1 ? "" : "s"}
          {r.charter_type ? ` · ${r.charter_type}` : ""}
        </Text>
        {r.explanation ? (
          <Text style={styles.explainText}>{r.explanation}</Text>
        ) : null}

        {r.seasonal_rates &&
        (r.seasonal_rates.high != null ||
          r.seasonal_rates.shoulder != null ||
          r.seasonal_rates.low != null) ? (
          <View style={styles.seasonalBox}>
            <Text style={styles.seasonalTitle}>SEASONAL RATES</Text>
            <View style={styles.seasonalRow}>
              <Text style={styles.seasonalLabel}>High season</Text>
              <Text style={styles.seasonalValue}>
                {formatEUR(r.seasonal_rates.high)} {perLabel}
              </Text>
            </View>
            <View style={styles.seasonalRow}>
              <Text style={styles.seasonalLabel}>Shoulder</Text>
              <Text style={styles.seasonalValue}>
                {formatEUR(r.seasonal_rates.shoulder)} {perLabel}
              </Text>
            </View>
            <View style={styles.seasonalRow}>
              <Text style={styles.seasonalLabel}>Low season</Text>
              <Text style={styles.seasonalValue}>
                {formatEUR(r.seasonal_rates.low)} {perLabel}
              </Text>
            </View>
          </View>
        ) : null}

        {r.sources && r.sources.length > 0 ? (
          <View style={styles.sourcesBox}>
            <Text style={styles.sourcesLabel}>Sources</Text>
            <View style={styles.sourcesRow}>
              {r.sources.map((s, i) => (
                <Pressable
                  key={`${s}-${i}`}
                  onPress={() =>
                    Linking.openURL(
                      s.startsWith("http") ? s : `https://${SOURCE_HOST(s)}`,
                    ).catch(() => {})
                  }
                >
                  <Text style={styles.sourcePill}>{SOURCE_HOST(s)}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}

        <View style={styles.actionRow}>
          <Pressable
            onPress={() =>
              onAccept(r.rate as number, period, r.seasonal_rates ?? null)
            }
            style={({ pressed }) => [
              styles.primaryBtn,
              { opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <Feather name="check" size={14} color={NAVY_DEEP} />
            <Text style={styles.primaryBtnText}>
              Use {formatEUR(r.rate)} {perLabel}
            </Text>
          </Pressable>
          <Pressable
            onPress={run}
            style={({ pressed }) => [
              styles.secondaryBtn,
              { opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Feather name="refresh-cw" size={14} color={GOLD} />
            <Text style={styles.secondaryBtnText}>Search again</Text>
          </Pressable>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.wrap}>
      <Pressable
        onPress={run}
        disabled={mutation.isPending}
        style={({ pressed }) => [
          styles.triggerBtn,
          { opacity: mutation.isPending ? 0.6 : pressed ? 0.85 : 1 },
        ]}
      >
        {mutation.isPending ? (
          <>
            <ActivityIndicator color={GOLD} size="small" />
            <Text style={styles.triggerBtnText}>Searching market rates…</Text>
          </>
        ) : (
          <>
            <Feather name="search" size={14} color={GOLD} />
            <Text style={styles.triggerBtnText}>
              {result ? "Re-run AI estimate" : "AI Estimate"}
            </Text>
          </>
        )}
      </Pressable>

      {mutation.isPending ? (
        <Text style={styles.loadingHint}>
          Checking YachtCharterFleet · Boatbookings · Burgess… (10–30 s)
        </Text>
      ) : null}

      {mutation.error && !result ? (
        <Text style={styles.transportError}>
          Network error. Please try again or enter the rate manually.
        </Text>
      ) : null}

      {result ? renderResult(result) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 4, marginBottom: 8 },
  triggerBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: GOLD,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "rgba(201,169,97,0.08)",
  },
  triggerBtnText: {
    color: GOLD,
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: 0.4,
  },
  loadingHint: {
    color: MUTED,
    fontSize: 11,
    textAlign: "center",
    marginTop: 8,
    fontStyle: "italic",
  },
  transportError: { color: ERROR, fontSize: 12, marginTop: 8, textAlign: "center" },
  panel: {
    marginTop: 14,
    borderWidth: 1,
    borderColor: "rgba(201,169,97,0.45)",
    borderRadius: 14,
    padding: 16,
    backgroundColor: NAVY_DEEP,
  },
  panelWarn: { borderColor: "rgba(255,200,100,0.45)" },
  panelError: { borderColor: "rgba(255,138,138,0.45)" },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  headerLabel: {
    color: IVORY,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
    flex: 1,
  },
  aiBadge: {
    color: GOLD,
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 0.6,
  },
  recoLabel: {
    color: MUTED,
    fontSize: 10,
    letterSpacing: 1.2,
    marginTop: 4,
  },
  recoRate: {
    color: GOLD,
    fontSize: 30,
    fontWeight: "700",
    letterSpacing: 0.5,
    marginTop: 2,
  },
  recoUnit: { color: MUTED, fontSize: 14, fontWeight: "400" },
  rangeText: { color: IVORY, fontSize: 13, marginTop: 6 },
  metaText: { color: MUTED, fontSize: 12, marginTop: 2 },
  explainText: { color: IVORY, fontSize: 12, marginTop: 8, lineHeight: 16 },
  seasonalBox: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: DIVIDER,
  },
  seasonalTitle: {
    color: MUTED,
    fontSize: 10,
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  seasonalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  seasonalLabel: { color: IVORY, fontSize: 12 },
  seasonalValue: { color: IVORY, fontSize: 12, fontWeight: "600" },
  sourcesBox: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: DIVIDER,
  },
  sourcesLabel: { color: MUTED, fontSize: 10, letterSpacing: 1.2, marginBottom: 6 },
  sourcesRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  sourcePill: {
    color: GOLD,
    fontSize: 11,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: "rgba(201,169,97,0.35)",
    borderRadius: 6,
  },
  errorBody: { color: IVORY, fontSize: 13, lineHeight: 18 },
  actionRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 14,
    flexWrap: "wrap",
  },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: GOLD,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    flexGrow: 1,
    justifyContent: "center",
  },
  primaryBtnText: {
    color: NAVY_DEEP,
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  secondaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: GOLD,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    justifyContent: "center",
  },
  secondaryBtnText: {
    color: GOLD,
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
});
