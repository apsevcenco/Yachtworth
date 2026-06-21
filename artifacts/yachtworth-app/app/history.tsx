import { Feather } from "@expo/vector-icons";
import { useAuth } from "@clerk/expo";
import {
  getListCostEstimatesQueryKey,
  getListEstimatesQueryKey,
  getListRoiCalculationsQueryKey,
  useDeleteCostEstimate,
  useDeleteEstimate,
  useDeleteRoiCalculation,
  useListCostEstimates,
  useListEstimates,
  useListRoiCalculations,
  type CostEstimateListItem,
  type EstimateListItem,
  type RoiCalculationListItem,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SwipeableCard } from "../components/SwipeableCard";
import { useUnits } from "../hooks/useUnits";

const NAVY = "#0B1E3F";
const NAVY_ELEV = "#142A52";
const NAVY_DEEP = "#081633";
const GOLD = "#C9A961";
const IVORY = "#F7F3EC";
const MUTED = "rgba(247,243,236,0.55)";
const DIVIDER = "rgba(247,243,236,0.08)";
const POSITIVE = "#7BD389";
const NEGATIVE = "#FF8A8A";

type Tab = "estimates" | "cost" | "roi";

const TYPE_LABELS: Record<string, string> = {
  motor_yacht: "Motor Yacht",
  sailing_yacht: "Sailing Yacht",
  catamaran: "Catamaran",
  superyacht: "Superyacht",
};

const REGION_LABELS: Record<string, string> = {
  mediterranean: "Mediterranean",
  caribbean: "Caribbean",
  northern_europe: "N. Europe",
  asia_pacific: "Asia-Pacific",
  asia_pacific_me: "Asia-Pacific / ME",
  middle_east: "Middle East",
  global: "Global",
};

function formatEur(n: number): string {
  return "€ " + Math.round(n).toLocaleString("en-US");
}

function formatEurSigned(n: number): string {
  const abs = Math.abs(Math.round(n));
  return (n < 0 ? "−€ " : "€ ") + abs.toLocaleString("en-US");
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function formatLength(m: number | null | undefined, units: "metric" | "imperial"): string {
  if (m == null) return "";
  if (units === "metric") return `${m.toFixed(1)} m`;
  return `${Math.round(m * 3.28084)} ft`;
}

export default function HistoryScreen() {
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isSignedIn, isLoaded } = useAuth();
  const { units } = useUnits();
  const [tab, setTab] = useState<Tab>("estimates");
  const [pendingIds, setPendingIds] = useState<Set<string>>(() => new Set());
  const markPending = (id: string) =>
    setPendingIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  const clearPending = (id: string) =>
    setPendingIds((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });

  const estimatesQ = useListEstimates(undefined, {
    query: {
      queryKey: getListEstimatesQueryKey(),
      enabled: Boolean(isSignedIn) && tab === "estimates",
      refetchOnMount: "always",
      staleTime: 30_000,
    },
  });
  const costQ = useListCostEstimates(undefined, {
    query: {
      queryKey: getListCostEstimatesQueryKey(),
      enabled: Boolean(isSignedIn) && tab === "cost",
      refetchOnMount: "always",
      staleTime: 30_000,
    },
  });
  const roiQ = useListRoiCalculations(undefined, {
    query: {
      queryKey: getListRoiCalculationsQueryKey(),
      enabled: Boolean(isSignedIn) && tab === "roi",
      refetchOnMount: "always",
      staleTime: 30_000,
    },
  });
  const refetchEstimates = estimatesQ.refetch;
  const refetchCost = costQ.refetch;
  const refetchRoi = roiQ.refetch;

  useFocusEffect(
    useCallback(() => {
      if (!isSignedIn) return;
      void queryClient.invalidateQueries({ queryKey: getListEstimatesQueryKey() });
      void queryClient.invalidateQueries({ queryKey: getListCostEstimatesQueryKey() });
      void queryClient.invalidateQueries({
        queryKey: getListRoiCalculationsQueryKey(),
      });
      if (tab === "estimates") void refetchEstimates();
      if (tab === "cost") void refetchCost();
      if (tab === "roi") void refetchRoi();
    }, [isSignedIn, queryClient, refetchCost, refetchEstimates, refetchRoi, tab]),
  );

  const deleteEstimate = useDeleteEstimate({
    mutation: {
      onSuccess: () =>
        queryClient.invalidateQueries({ queryKey: getListEstimatesQueryKey() }),
      onError: (err) =>
        Alert.alert(
          "Couldn't delete",
          err instanceof Error ? err.message : "Please try again.",
        ),
      onSettled: (_d, _e, vars) => clearPending(vars.id),
    },
  });
  const deleteCost = useDeleteCostEstimate({
    mutation: {
      onSuccess: () =>
        queryClient.invalidateQueries({ queryKey: getListCostEstimatesQueryKey() }),
      onError: (err) =>
        Alert.alert(
          "Couldn't delete",
          err instanceof Error ? err.message : "Please try again.",
        ),
      onSettled: (_d, _e, vars) => clearPending(vars.id),
    },
  });
  const deleteRoi = useDeleteRoiCalculation({
    mutation: {
      onSuccess: () =>
        queryClient.invalidateQueries({
          queryKey: getListRoiCalculationsQueryKey(),
        }),
      onError: (err) =>
        Alert.alert(
          "Couldn't delete",
          err instanceof Error ? err.message : "Please try again.",
        ),
      onSettled: (_d, _e, vars) => clearPending(vars.id),
    },
  });

  const activeQ = tab === "estimates" ? estimatesQ : tab === "cost" ? costQ : roiQ;
  const items = useMemo(() => {
    if (tab === "estimates") return estimatesQ.data?.items ?? [];
    if (tab === "cost") return costQ.data?.items ?? [];
    return roiQ.data?.items ?? [];
  }, [tab, estimatesQ.data, costQ.data, roiQ.data]);

  const emptyConfig = {
    estimates: {
      title: "No estimates yet",
      text: "Your yacht estimates will appear here.",
      cta: "New estimate",
      ctaPath: "/valuation/new",
    },
    cost: {
      title: "No cost estimates yet",
      text: "Your annual cost estimates will appear here.",
      cta: "New cost estimate",
      ctaPath: "/cost/new",
    },
    roi: {
      title: "No ROI runs yet",
      text: "Your charter ROI calculations will appear here.",
      cta: "Open Charter ROI",
      ctaPath: "/(tabs)/charter",
    },
  }[tab];

  return (
    <View
      style={[
        styles.root,
        { paddingTop: (isWeb ? 67 : insets.top) + 70, paddingBottom: insets.bottom + 100 },
      ]}
    >
      <Pressable
        onPress={() =>
          router.canGoBack() ? router.back() : router.replace("/(tabs)/profile")
        }
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel="Go back"
        style={[styles.backFab, { top: (isWeb ? 12 : insets.top) + 56 }]}
      >
        <Feather name="chevron-left" size={24} color={IVORY} />
      </Pressable>
      <View style={styles.headerBlock}>
        <Text style={styles.kicker}>HISTORY</Text>
        <Text style={styles.title}>Your activity</Text>
      </View>

      {/* Segmented tabs */}
      <View style={styles.segment} accessibilityRole="tablist">
        {(
          [
            { key: "estimates", label: "Estimates" },
            { key: "cost", label: "Cost" },
            { key: "roi", label: "ROI" },
          ] as { key: Tab; label: string }[]
        ).map((t) => {
          const active = tab === t.key;
          return (
            <Pressable
              key={t.key}
              onPress={() => setTab(t.key)}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              accessibilityLabel={`${t.label} tab`}
              style={[styles.segmentBtn, active && styles.segmentBtnActive]}
            >
              <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
                {t.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {!isLoaded || (isSignedIn && activeQ.isLoading) ? (
        <View style={styles.center}>
          <ActivityIndicator color={GOLD} />
        </View>
      ) : !isSignedIn ? (
        <View style={styles.empty}>
          <View style={styles.emptyIcon}>
            <Feather name="lock" size={26} color={GOLD} />
          </View>
          <Text style={styles.emptyTitle}>Sign in to see history</Text>
          <Text style={styles.emptyText}>
            Your activity is saved to your account. Sign in or create one to access it across devices.
          </Text>
          <Pressable
            onPress={() => router.push("/(auth)/sign-in")}
            accessibilityRole="button"
            accessibilityLabel="Sign in"
            style={({ pressed }) => [styles.cta, { opacity: pressed ? 0.85 : 1 }]}
          >
            <Text style={styles.ctaText}>Sign in</Text>
          </Pressable>
        </View>
      ) : activeQ.isError ? (
        <View style={styles.empty}>
          <View style={styles.emptyIcon}>
            <Feather name="alert-circle" size={26} color={GOLD} />
          </View>
          <Text style={styles.emptyTitle}>Couldn't load history</Text>
          <Text style={styles.emptyText}>
            {activeQ.error instanceof Error ? activeQ.error.message : "Something went wrong."}
          </Text>
          <Pressable
            onPress={() => activeQ.refetch()}
            accessibilityRole="button"
            accessibilityLabel="Retry"
            style={({ pressed }) => [styles.cta, { opacity: pressed ? 0.85 : 1 }]}
          >
            <Text style={styles.ctaText}>Retry</Text>
          </Pressable>
        </View>
      ) : items.length === 0 ? (
        <View style={styles.empty}>
          <View style={styles.emptyIcon}>
            <Feather name="archive" size={26} color={GOLD} />
          </View>
          <Text style={styles.emptyTitle}>{emptyConfig.title}</Text>
          <Text style={styles.emptyText}>{emptyConfig.text}</Text>
          <Pressable
            onPress={() => router.push(emptyConfig.ctaPath as never)}
            accessibilityRole="button"
            accessibilityLabel={emptyConfig.cta}
            style={({ pressed }) => [styles.cta, { opacity: pressed ? 0.85 : 1 }]}
          >
            <Text style={styles.ctaText}>{emptyConfig.cta}</Text>
          </Pressable>
        </View>
      ) : tab === "estimates" ? (
        <FlatList
          data={items as EstimateListItem[]}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 60 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={estimatesQ.isFetching && !estimatesQ.isLoading}
              onRefresh={() => estimatesQ.refetch()}
              tintColor={GOLD}
            />
          }
          renderItem={({ item }) => {
            const title = item.yacht_label || "Estimate";
            return (
              <SwipeableCard
                onDelete={() => {
                  markPending(item.id);
                  deleteEstimate.mutate({ id: item.id });
                }}
                deletingLabel={`Delete ${title}`}
                confirmTitle="Delete estimate?"
                confirmMessage={`${title} will be permanently removed.`}
                isDeleting={pendingIds.has(item.id)}
              >
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Open estimate ${title}`}
                  onPress={() =>
                    router.push({ pathname: "/valuation/result", params: { id: item.id } })
                  }
                  style={({ pressed }) => [styles.card, { opacity: pressed ? 0.85 : 1 }]}
                >
                  <View style={{ flex: 1, paddingRight: 12 }}>
                    <Text style={styles.cardTitle} numberOfLines={1}>
                      {title}
                    </Text>
                    <Text style={styles.cardMeta}>
                      {[
                        item.yacht_type ? TYPE_LABELS[item.yacht_type] ?? item.yacht_type : null,
                        formatLength(item.length_meters, units),
                        formatDate(item.created_at),
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </Text>
                  </View>
                  <View style={styles.priceWrap}>
                    <Text style={styles.cardPrice}>{formatEur(item.estimated_price_eur)}</Text>
                    <Feather name="chevron-right" size={18} color={MUTED} />
                  </View>
                </Pressable>
              </SwipeableCard>
            );
          }}
        />
      ) : tab === "cost" ? (
        <FlatList
          data={items as CostEstimateListItem[]}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 60 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={costQ.isFetching && !costQ.isLoading}
              onRefresh={() => costQ.refetch()}
              tintColor={GOLD}
            />
          }
          renderItem={({ item }) => {
            const title = item.yacht_name || item.name || "Cost estimate";
            return (
              <SwipeableCard
                onDelete={() => {
                  markPending(item.id);
                  deleteCost.mutate({ id: item.id });
                }}
                deletingLabel={`Delete ${title}`}
                confirmTitle="Delete cost estimate?"
                confirmMessage={`${title} will be permanently removed.`}
                isDeleting={pendingIds.has(item.id)}
              >
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Open cost estimate ${title}`}
                  onPress={() =>
                    router.push({ pathname: "/cost/result", params: { id: item.id } })
                  }
                  style={({ pressed }) => [styles.card, { opacity: pressed ? 0.85 : 1 }]}
                >
                  <View style={{ flex: 1, paddingRight: 12 }}>
                    <Text style={styles.cardTitle} numberOfLines={1}>
                      {title}
                    </Text>
                    <Text style={styles.cardMeta}>
                      {[
                        TYPE_LABELS[item.yacht_class] ?? item.yacht_class,
                        formatLength(item.length_meters, units),
                        formatDate(item.created_at),
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </Text>
                  </View>
                  <View style={styles.priceWrap}>
                    <Text style={styles.cardPrice}>
                      {formatEur(item.total_annual_eur)}
                      <Text style={styles.cardPriceSuffix}> /yr</Text>
                    </Text>
                    <Feather name="chevron-right" size={18} color={MUTED} />
                  </View>
                </Pressable>
              </SwipeableCard>
            );
          }}
        />
      ) : (
        <FlatList
          data={items as RoiCalculationListItem[]}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 60 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={roiQ.isFetching && !roiQ.isLoading}
              onRefresh={() => roiQ.refetch()}
              tintColor={GOLD}
            />
          }
          renderItem={({ item }) => {
            const positive = item.net_profit_eur >= 0;
            const title = `Charter ROI · ${REGION_LABELS[item.region] ?? item.region}`;
            return (
              <SwipeableCard
                onDelete={() => {
                  markPending(item.id);
                  deleteRoi.mutate({ id: item.id });
                }}
                deletingLabel="Delete ROI calculation"
                confirmTitle="Delete ROI calculation?"
                confirmMessage="This scenario will be permanently removed."
                isDeleting={pendingIds.has(item.id)}
              >
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Open ROI calculation, ${item.roi_pct.toFixed(1)} percent`}
                  onPress={() =>
                    router.push({ pathname: "/roi/result", params: { id: item.id } })
                  }
                  style={({ pressed }) => [styles.card, { opacity: pressed ? 0.85 : 1 }]}
                >
                  <View style={{ flex: 1, paddingRight: 12 }}>
                    <Text style={styles.cardTitle} numberOfLines={1}>
                      {title}
                    </Text>
                    <Text style={styles.cardMeta}>
                      {`Revenue ${formatEur(item.annual_revenue_eur)} · ${formatDate(item.created_at)}`}
                    </Text>
                  </View>
                  <View style={styles.priceWrap}>
                    <View style={{ alignItems: "flex-end" }}>
                      <Text style={[styles.cardPrice, { color: positive ? POSITIVE : NEGATIVE }]}>
                        {formatEurSigned(item.net_profit_eur)}
                      </Text>
                      <Text style={styles.roiSub}>{item.roi_pct.toFixed(1)}% ROI</Text>
                    </View>
                    <Feather name="chevron-right" size={18} color={MUTED} />
                  </View>
                </Pressable>
              </SwipeableCard>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: NAVY, paddingHorizontal: 24 },
  headerBlock: { marginBottom: 18 },
  kicker: {
    color: GOLD,
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    letterSpacing: 2,
    textTransform: "uppercase",
    marginBottom: 10,
  },
  title: {
    color: IVORY,
    fontFamily: "Gilroy-ExtraBold",
    fontSize: 32,
    letterSpacing: -0.3,
  },
  segment: {
    flexDirection: "row",
    backgroundColor: NAVY_DEEP,
    borderColor: DIVIDER,
    borderWidth: 1,
    borderRadius: 10,
    padding: 4,
    marginBottom: 18,
  },
  segmentBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 9,
    borderRadius: 7,
  },
  segmentBtnActive: {
    backgroundColor: "rgba(201,169,97,0.16)",
  },
  segmentText: {
    color: MUTED,
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    letterSpacing: 0.3,
  },
  segmentTextActive: { color: GOLD },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24 },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: NAVY_ELEV,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },
  emptyTitle: {
    color: IVORY,
    fontFamily: "Gilroy-Regular",
    fontSize: 20,
    marginBottom: 8,
  },
  emptyText: {
    color: MUTED,
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    textAlign: "center",
    lineHeight: 19,
  },
  cta: {
    marginTop: 20,
    backgroundColor: "rgba(201,169,97,0.10)",
    borderWidth: 1.5,
    borderColor: GOLD,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 10,
  },
  ctaText: { color: GOLD, fontFamily: "Inter_700Bold", fontSize: 14 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: NAVY_DEEP,
    borderColor: DIVIDER,
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
  },
  cardTitle: {
    color: IVORY,
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    marginBottom: 4,
  },
  cardMeta: { color: MUTED, fontFamily: "Inter_400Regular", fontSize: 12 },
  priceWrap: { flexDirection: "row", alignItems: "center", gap: 6 },
  cardPrice: { color: GOLD, fontFamily: "Inter_700Bold", fontSize: 14 },
  cardPriceSuffix: { color: MUTED, fontFamily: "Inter_500Medium", fontSize: 11 },
  roiSub: { color: MUTED, fontFamily: "Inter_500Medium", fontSize: 11, marginTop: 2 },
  backFab: {
    position: "absolute",
    left: 12,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(8,22,51,0.7)",
    alignItems: "center",
    justifyContent: "center",
  },
});
