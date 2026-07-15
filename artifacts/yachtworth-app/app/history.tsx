import { Feather } from "@expo/vector-icons";
import { useAuth } from "@clerk/expo";
import {
  getListCostEstimatesQueryKey,
  getListEstimatesQueryKey,
  getListChartersQueryKey,
  getListListingsQueryKey,
  getListProposalsQueryKey,
  getListRoiCalculationsQueryKey,
  getListSurveyReportsQueryKey,
  listCostEstimates,
  listEstimates,
  listCharters,
  listListings,
  listProposals,
  listRoiCalculations,
  listSurveyReports,
  useDeleteCharter,
  useDeleteCostEstimate,
  useDeleteEstimate,
  useDeleteListing,
  useDeleteProposal,
  useDeleteRoiCalculation,
  useDeleteSurveyReport,
  useListCharters,
  useListCostEstimates,
  useListEstimates,
  useListListings,
  useListProposals,
  useListRoiCalculations,
  useListSurveyReports,
  type Charter,
  type CostEstimateListItem,
  type EstimateListItem,
  type ListingListItem,
  type ProposalListItem,
  type RoiCalculationListItem,
  type SurveyReportListItem,
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

type Tab =
  | "estimates"
  | "cost"
  | "roi"
  | "listings"
  | "proposals"
  | "survey"
  | "charters";

type HistoryItemsByTab = {
  estimates: EstimateListItem[] | null;
  cost: CostEstimateListItem[] | null;
  roi: RoiCalculationListItem[] | null;
  listings: ListingListItem[] | null;
  proposals: ProposalListItem[] | null;
  survey: SurveyReportListItem[] | null;
  charters: Charter[] | null;
};

type HistoryErrorsByTab = Record<Tab, Error | null>;

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

function formatLength(
  m: number | null | undefined,
  units: "metric" | "imperial",
): string {
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
  const [directItems, setDirectItems] = useState<HistoryItemsByTab>({
    estimates: null,
    cost: null,
    roi: null,
    listings: null,
    proposals: null,
    survey: null,
    charters: null,
  });
  const [directErrors, setDirectErrors] = useState<HistoryErrorsByTab>({
    estimates: null,
    cost: null,
    roi: null,
    listings: null,
    proposals: null,
    survey: null,
    charters: null,
  });
  const [directLoading, setDirectLoading] = useState<Tab | null>(null);
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
  const listingsQ = useListListings({
    query: {
      queryKey: getListListingsQueryKey(),
      enabled: Boolean(isSignedIn) && tab === "listings",
      refetchOnMount: "always",
      staleTime: 30_000,
    },
  });
  const proposalsQ = useListProposals({
    query: {
      queryKey: getListProposalsQueryKey(),
      enabled: Boolean(isSignedIn) && tab === "proposals",
      refetchOnMount: "always",
      staleTime: 30_000,
    },
  });
  const surveyQ = useListSurveyReports({
    query: {
      queryKey: getListSurveyReportsQueryKey(),
      enabled: Boolean(isSignedIn) && tab === "survey",
      refetchOnMount: "always",
      staleTime: 30_000,
    },
  });
  const chartersQ = useListCharters(undefined, {
    query: {
      queryKey: getListChartersQueryKey(),
      enabled: Boolean(isSignedIn) && tab === "charters",
      refetchOnMount: "always",
      staleTime: 30_000,
    },
  });
  const refetchEstimates = estimatesQ.refetch;
  const refetchCost = costQ.refetch;
  const refetchRoi = roiQ.refetch;
  const refetchListings = listingsQ.refetch;
  const refetchProposals = proposalsQ.refetch;
  const refetchSurvey = surveyQ.refetch;
  const refetchCharters = chartersQ.refetch;

  const loadDirectTab = useCallback(async (target: Tab) => {
    setDirectLoading(target);
    setDirectErrors((prev) => ({ ...prev, [target]: null }));
    try {
      if (target === "estimates") {
        const data = await listEstimates();
        setDirectItems((prev) => ({ ...prev, estimates: data.items ?? [] }));
      } else if (target === "cost") {
        const data = await listCostEstimates();
        setDirectItems((prev) => ({ ...prev, cost: data.items ?? [] }));
      } else if (target === "roi") {
        const data = await listRoiCalculations();
        setDirectItems((prev) => ({ ...prev, roi: data.items ?? [] }));
      } else if (target === "listings") {
        const data = await listListings();
        setDirectItems((prev) => ({ ...prev, listings: data.items ?? [] }));
      } else if (target === "proposals") {
        const data = await listProposals();
        setDirectItems((prev) => ({ ...prev, proposals: data.items ?? [] }));
      } else if (target === "survey") {
        const data = await listSurveyReports();
        setDirectItems((prev) => ({ ...prev, survey: data.items ?? [] }));
      } else {
        const data = await listCharters();
        setDirectItems((prev) => ({ ...prev, charters: data.items ?? [] }));
      }
    } catch (err) {
      setDirectErrors((prev) => ({
        ...prev,
        [target]: err instanceof Error ? err : new Error(String(err)),
      }));
    } finally {
      setDirectLoading((prev) => (prev === target ? null : prev));
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (!isSignedIn) return;
      void queryClient.invalidateQueries({
        queryKey: getListEstimatesQueryKey(),
      });
      void queryClient.invalidateQueries({
        queryKey: getListCostEstimatesQueryKey(),
      });
      void queryClient.invalidateQueries({
        queryKey: getListRoiCalculationsQueryKey(),
      });
      void queryClient.invalidateQueries({
        queryKey: getListListingsQueryKey(),
      });
      void queryClient.invalidateQueries({
        queryKey: getListProposalsQueryKey(),
      });
      void queryClient.invalidateQueries({
        queryKey: getListSurveyReportsQueryKey(),
      });
      void queryClient.invalidateQueries({
        queryKey: getListChartersQueryKey(),
      });
      if (tab === "estimates") void refetchEstimates();
      if (tab === "cost") void refetchCost();
      if (tab === "roi") void refetchRoi();
      if (tab === "listings") void refetchListings();
      if (tab === "proposals") void refetchProposals();
      if (tab === "survey") void refetchSurvey();
      if (tab === "charters") void refetchCharters();
      void loadDirectTab(tab);
    }, [
      isSignedIn,
      loadDirectTab,
      queryClient,
      refetchCost,
      refetchEstimates,
      refetchListings,
      refetchProposals,
      refetchRoi,
      refetchSurvey,
      refetchCharters,
      tab,
    ]),
  );

  const deleteEstimate = useDeleteEstimate({
    mutation: {
      onSuccess: () => {
        setDirectItems((prev) => ({ ...prev, estimates: null }));
        queryClient.invalidateQueries({ queryKey: getListEstimatesQueryKey() });
      },
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
      onSuccess: () => {
        setDirectItems((prev) => ({ ...prev, cost: null }));
        queryClient.invalidateQueries({
          queryKey: getListCostEstimatesQueryKey(),
        });
      },
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
      onSuccess: () => {
        setDirectItems((prev) => ({ ...prev, roi: null }));
        queryClient.invalidateQueries({
          queryKey: getListRoiCalculationsQueryKey(),
        });
      },
      onError: (err) =>
        Alert.alert(
          "Couldn't delete",
          err instanceof Error ? err.message : "Please try again.",
        ),
      onSettled: (_d, _e, vars) => clearPending(vars.id),
    },
  });
  const deleteListing = useDeleteListing({
    mutation: {
      onSuccess: () => {
        setDirectItems((prev) => ({ ...prev, listings: null }));
        queryClient.invalidateQueries({ queryKey: getListListingsQueryKey() });
      },
      onError: (err) =>
        Alert.alert(
          "Couldn't delete",
          err instanceof Error ? err.message : "Please try again.",
        ),
      onSettled: (_d, _e, vars) => clearPending(vars.id),
    },
  });
  const deleteProposal = useDeleteProposal({
    mutation: {
      onSuccess: () => {
        setDirectItems((prev) => ({ ...prev, proposals: null }));
        queryClient.invalidateQueries({ queryKey: getListProposalsQueryKey() });
      },
      onError: (err) =>
        Alert.alert(
          "Couldn't delete",
          err instanceof Error ? err.message : "Please try again.",
        ),
      onSettled: (_d, _e, vars) => clearPending(vars.id),
    },
  });
  const deleteSurvey = useDeleteSurveyReport({
    mutation: {
      onSuccess: () => {
        setDirectItems((prev) => ({ ...prev, survey: null }));
        queryClient.invalidateQueries({
          queryKey: getListSurveyReportsQueryKey(),
        });
      },
      onError: (err) =>
        Alert.alert(
          "Couldn't delete",
          err instanceof Error ? err.message : "Please try again.",
        ),
      onSettled: (_d, _e, vars) => clearPending(vars.id),
    },
  });
  const deleteCharter = useDeleteCharter({
    mutation: {
      onSuccess: () => {
        setDirectItems((prev) => ({ ...prev, charters: null }));
        queryClient.invalidateQueries({ queryKey: getListChartersQueryKey() });
      },
      onError: (err) =>
        Alert.alert(
          "Couldn't delete",
          err instanceof Error ? err.message : "Please try again.",
        ),
      onSettled: (_d, _e, vars) => clearPending(vars.id),
    },
  });

  const activeQ =
    tab === "estimates"
      ? estimatesQ
      : tab === "cost"
        ? costQ
        : tab === "roi"
          ? roiQ
          : tab === "listings"
            ? listingsQ
            : tab === "proposals"
              ? proposalsQ
              : tab === "survey"
                ? surveyQ
                : chartersQ;
  const items = useMemo(() => {
    const direct = directItems[tab];
    if (direct) return direct;
    if (tab === "estimates") return estimatesQ.data?.items ?? [];
    if (tab === "cost") return costQ.data?.items ?? [];
    if (tab === "roi") return roiQ.data?.items ?? [];
    if (tab === "listings") return listingsQ.data?.items ?? [];
    if (tab === "proposals") return proposalsQ.data?.items ?? [];
    if (tab === "survey") return surveyQ.data?.items ?? [];
    return chartersQ.data?.items ?? [];
  }, [
    tab,
    directItems,
    estimatesQ.data,
    costQ.data,
    roiQ.data,
    listingsQ.data,
    proposalsQ.data,
    surveyQ.data,
    chartersQ.data,
  ]);
  const activeDirectError = directErrors[tab];
  const activeError =
    activeDirectError ?? (activeQ.isError ? activeQ.error : null);
  const activeLoading =
    directItems[tab] == null && (activeQ.isLoading || directLoading === tab);

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
    listings: {
      title: "No listings yet",
      text: "Saved yacht listings will appear here.",
      cta: "Open Listing Generator",
      ctaPath: "/listing",
    },
    proposals: {
      title: "No proposals yet",
      text: "Saved yacht proposals will appear here.",
      cta: "Open Proposal Builder",
      ctaPath: "/yacht-proposal",
    },
    survey: {
      title: "No survey reports yet",
      text: "Draft and completed survey reports will appear here.",
      cta: "New Survey",
      ctaPath: "/survey/new",
    },
    charters: {
      title: "No charters yet",
      text: "Saved charter bookings will appear here.",
      cta: "Open Charter Planner",
      ctaPath: "/charter-planner",
    },
  }[tab];

  return (
    <View
      style={[
        styles.root,
        {
          paddingTop: (isWeb ? 67 : insets.top) + 70,
          paddingBottom: insets.bottom + 100,
        },
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
            { key: "listings", label: "Listings" },
            { key: "proposals", label: "Proposals" },
            { key: "survey", label: "Survey" },
            { key: "charters", label: "Charters" },
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
              <Text
                style={[styles.segmentText, active && styles.segmentTextActive]}
              >
                {t.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {!isLoaded || (isSignedIn && activeLoading) ? (
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
            Your activity is saved to your account. Sign in or create one to
            access it across devices.
          </Text>
          <Pressable
            onPress={() => router.push("/(auth)/sign-in")}
            accessibilityRole="button"
            accessibilityLabel="Sign in"
            style={({ pressed }) => [
              styles.cta,
              { opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <Text style={styles.ctaText}>Sign in</Text>
          </Pressable>
        </View>
      ) : activeError && items.length === 0 ? (
        <View style={styles.empty}>
          <View style={styles.emptyIcon}>
            <Feather name="alert-circle" size={26} color={GOLD} />
          </View>
          <Text style={styles.emptyTitle}>Couldn't load history</Text>
          <Text style={styles.emptyText}>{activeError.message}</Text>
          <Pressable
            onPress={() => activeQ.refetch()}
            accessibilityRole="button"
            accessibilityLabel="Retry"
            style={({ pressed }) => [
              styles.cta,
              { opacity: pressed ? 0.85 : 1 },
            ]}
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
            style={({ pressed }) => [
              styles.cta,
              { opacity: pressed ? 0.85 : 1 },
            ]}
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
                    router.push({
                      pathname: "/valuation/result",
                      params: { id: item.id },
                    })
                  }
                  style={({ pressed }) => [
                    styles.card,
                    { opacity: pressed ? 0.85 : 1 },
                  ]}
                >
                  <View style={{ flex: 1, paddingRight: 12 }}>
                    <Text style={styles.cardTitle} numberOfLines={1}>
                      {title}
                    </Text>
                    <Text style={styles.cardMeta}>
                      {[
                        item.yacht_type
                          ? (TYPE_LABELS[item.yacht_type] ?? item.yacht_type)
                          : null,
                        formatLength(item.length_meters, units),
                        formatDate(item.created_at),
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </Text>
                  </View>
                  <View style={styles.priceWrap}>
                    <Text style={styles.cardPrice}>
                      {formatEur(item.estimated_price_eur)}
                    </Text>
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
                    router.push({
                      pathname: "/cost/result",
                      params: { id: item.id },
                    })
                  }
                  style={({ pressed }) => [
                    styles.card,
                    { opacity: pressed ? 0.85 : 1 },
                  ]}
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
      ) : tab === "roi" ? (
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
                    router.push({
                      pathname: "/roi/result",
                      params: { id: item.id },
                    })
                  }
                  style={({ pressed }) => [
                    styles.card,
                    { opacity: pressed ? 0.85 : 1 },
                  ]}
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
                      <Text
                        style={[
                          styles.cardPrice,
                          { color: positive ? POSITIVE : NEGATIVE },
                        ]}
                      >
                        {formatEurSigned(item.net_profit_eur)}
                      </Text>
                      <Text style={styles.roiSub}>
                        {item.roi_pct.toFixed(1)}% ROI
                      </Text>
                    </View>
                    <Feather name="chevron-right" size={18} color={MUTED} />
                  </View>
                </Pressable>
              </SwipeableCard>
            );
          }}
        />
      ) : tab === "listings" ? (
        <FlatList
          data={items as ListingListItem[]}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 60 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={listingsQ.isFetching && !listingsQ.isLoading}
              onRefresh={() => listingsQ.refetch()}
              tintColor={GOLD}
            />
          }
          renderItem={({ item }) => (
            <SwipeableCard
              onDelete={() => {
                markPending(item.id);
                deleteListing.mutate({ id: item.id });
              }}
              deletingLabel={`Delete ${item.yacht_name}`}
              confirmTitle="Delete listing?"
              confirmMessage={`${item.yacht_name} listing will be permanently removed.`}
              isDeleting={pendingIds.has(item.id)}
            >
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Open listing ${item.yacht_name}`}
                onPress={() => router.push("/listing/my-listings")}
                style={({ pressed }) => [
                  styles.card,
                  { opacity: pressed ? 0.85 : 1 },
                ]}
              >
                <View style={{ flex: 1, paddingRight: 12 }}>
                  <Text style={styles.cardTitle} numberOfLines={1}>
                    {item.yacht_name}
                  </Text>
                  <Text style={styles.cardMeta}>
                    {[
                      item.listing_type,
                      item.language,
                      formatDate(item.created_at),
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </Text>
                  {item.preview ? (
                    <Text style={styles.cardPreview} numberOfLines={2}>
                      {item.preview}
                    </Text>
                  ) : null}
                </View>
                <Feather name="chevron-right" size={18} color={MUTED} />
              </Pressable>
            </SwipeableCard>
          )}
        />
      ) : tab === "proposals" ? (
        <FlatList
          data={items as ProposalListItem[]}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 60 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={proposalsQ.isFetching && !proposalsQ.isLoading}
              onRefresh={() => proposalsQ.refetch()}
              tintColor={GOLD}
            />
          }
          renderItem={({ item }) => (
            <SwipeableCard
              onDelete={() => {
                markPending(item.id);
                deleteProposal.mutate({ id: item.id });
              }}
              deletingLabel={`Delete ${item.yacht_name}`}
              confirmTitle="Delete proposal?"
              confirmMessage={`${item.yacht_name} proposal will be permanently removed.`}
              isDeleting={pendingIds.has(item.id)}
            >
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Open proposal ${item.yacht_name}`}
                onPress={() => router.push("/yacht-proposal/my-proposals")}
                style={({ pressed }) => [
                  styles.card,
                  { opacity: pressed ? 0.85 : 1 },
                ]}
              >
                <View style={{ flex: 1, paddingRight: 12 }}>
                  <Text style={styles.cardTitle} numberOfLines={1}>
                    {item.yacht_name}
                  </Text>
                  <Text style={styles.cardMeta}>
                    {[
                      item.proposal_type,
                      item.language,
                      formatDate(item.created_at),
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </Text>
                </View>
                <Feather name="chevron-right" size={18} color={MUTED} />
              </Pressable>
            </SwipeableCard>
          )}
        />
      ) : tab === "survey" ? (
        <FlatList
          data={items as SurveyReportListItem[]}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 60 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={surveyQ.isFetching && !surveyQ.isLoading}
              onRefresh={() => surveyQ.refetch()}
              tintColor={GOLD}
            />
          }
          renderItem={({ item }) => (
            <SwipeableCard
              onDelete={() => {
                markPending(item.id);
                deleteSurvey.mutate({ id: item.id });
              }}
              deletingLabel={`Delete ${item.vessel_name}`}
              confirmTitle="Delete survey report?"
              confirmMessage={`${item.vessel_name} survey report will be permanently removed.`}
              isDeleting={pendingIds.has(item.id)}
            >
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Open survey report ${item.vessel_name}`}
                onPress={() => router.push(`/survey/${item.id}`)}
                style={({ pressed }) => [
                  styles.card,
                  { opacity: pressed ? 0.85 : 1 },
                ]}
              >
                <View style={{ flex: 1, paddingRight: 12 }}>
                  <Text style={styles.cardTitle} numberOfLines={1}>
                    {item.vessel_name}
                  </Text>
                  <Text style={styles.cardMeta}>
                    {[
                      item.status,
                      [item.manufacturer, item.model].filter(Boolean).join(" "),
                      item.survey_date
                        ? formatDate(item.survey_date)
                        : formatDate(item.created_at),
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </Text>
                  <Text style={styles.cardPreview} numberOfLines={1}>
                    {`Recommendations A/B/C/D: ${item.total_recommendations_a ?? 0}/${item.total_recommendations_b ?? 0}/${item.total_recommendations_c ?? 0}/${item.total_recommendations_d ?? 0}`}
                  </Text>
                </View>
                <Feather name="chevron-right" size={18} color={MUTED} />
              </Pressable>
            </SwipeableCard>
          )}
        />
      ) : (
        <FlatList
          data={items as Charter[]}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 60 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={chartersQ.isFetching && !chartersQ.isLoading}
              onRefresh={() => chartersQ.refetch()}
              tintColor={GOLD}
            />
          }
          renderItem={({ item }) => {
            const title = item.client_name || "Charter booking";
            return (
              <SwipeableCard
                onDelete={() => {
                  markPending(item.id);
                  deleteCharter.mutate({ id: item.id });
                }}
                deletingLabel={`Delete ${title}`}
                confirmTitle="Delete charter?"
                confirmMessage={`${title} will be permanently removed.`}
                isDeleting={pendingIds.has(item.id)}
              >
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Open charter ${title}`}
                  onPress={() =>
                    router.push({
                      pathname: "/charter-form",
                      params: { id: item.id },
                    })
                  }
                  style={({ pressed }) => [
                    styles.card,
                    { opacity: pressed ? 0.85 : 1 },
                  ]}
                >
                  <View style={{ flex: 1, paddingRight: 12 }}>
                    <Text style={styles.cardTitle} numberOfLines={1}>
                      {title}
                    </Text>
                    <Text style={styles.cardMeta}>
                      {[item.status, item.start_date, item.end_date]
                        .filter(Boolean)
                        .join(" · ")}
                    </Text>
                  </View>
                  <View style={styles.priceWrap}>
                    {item.charter_rate != null ? (
                      <Text style={styles.cardPrice}>
                        {formatEur(item.charter_rate)}
                      </Text>
                    ) : null}
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
    flexWrap: "wrap",
    gap: 4,
    backgroundColor: NAVY_DEEP,
    borderColor: DIVIDER,
    borderWidth: 1,
    borderRadius: 10,
    padding: 4,
    marginBottom: 18,
  },
  segmentBtn: {
    flexGrow: 1,
    flexBasis: "30%",
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
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
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
  cardPreview: {
    color: MUTED,
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    lineHeight: 16,
    marginTop: 6,
  },
  priceWrap: { flexDirection: "row", alignItems: "center", gap: 6 },
  cardPrice: { color: GOLD, fontFamily: "Inter_700Bold", fontSize: 14 },
  cardPriceSuffix: {
    color: MUTED,
    fontFamily: "Inter_500Medium",
    fontSize: 11,
  },
  roiSub: {
    color: MUTED,
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    marginTop: 2,
  },
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
