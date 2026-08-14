import { Feather } from "@expo/vector-icons";
import { useAuth } from "@clerk/expo";
import { useQueryClient } from "@tanstack/react-query";
import {
  getListRoiCalculationsQueryKey,
  getListYachtsQueryKey,
  useDeleteRoiCalculation,
  useListRoiCalculations,
  useListYachts,
  type RoiCalculationListItem,
  type Yacht,
} from "@workspace/api-client-react";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
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

function formatLength(m: number | null | undefined, units: "metric" | "imperial"): string {
  if (m == null) return "—";
  if (units === "metric") return `${m.toFixed(1)} m`;
  return `${Math.round(m * 3.28084)} ft`;
}

function formatEur(n: number): string {
  return "€ " + Math.round(n).toLocaleString("en-US");
}

function formatEurSigned(n: number): string {
  const abs = Math.abs(Math.round(n));
  return (n < 0 ? "−€ " : "€ ") + abs.toLocaleString("en-US");
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function yachtTitle(y: Yacht): string {
  return y.name || [y.brand, y.model].filter(Boolean).join(" ") || "Your yacht";
}

export default function CharterScreen() {
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isSignedIn, isLoaded } = useAuth();
  const { units } = useUnits();

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

  // Read-only consumer of My Yachts. Charter ROI never creates, edits or
  // deletes a yacht record — it only reads saved yachts as a starting point and
  // also lets the user enter any yacht manually (kept in ROI history only).
  const query = useListYachts(undefined, {
    query: {
      queryKey: getListYachtsQueryKey(),
      enabled: Boolean(isSignedIn),
      staleTime: 30_000,
    },
  });

  // Saved ROI requests (history). These belong to ROI only — deleting one here
  // removes the calculation, never the underlying My Yacht.
  const roiQ = useListRoiCalculations(undefined, {
    query: {
      queryKey: getListRoiCalculationsQueryKey(),
      enabled: Boolean(isSignedIn),
      staleTime: 30_000,
    },
  });

  const deleteRoi = useDeleteRoiCalculation({
    mutation: {
      onSuccess: () =>
        queryClient.invalidateQueries({ queryKey: getListRoiCalculationsQueryKey() }),
      onError: (err) =>
        Alert.alert(
          "Couldn't delete",
          err instanceof Error ? err.message : "Please try again.",
        ),
      onSettled: (_d, _e, vars) => clearPending(vars.id),
    },
  });

  const yachts: Yacht[] = query.data?.items ?? [];
  const roiItems: RoiCalculationListItem[] = roiQ.data?.items ?? [];

  return (
    <View style={{ flex: 1, backgroundColor: NAVY }}>
      <Pressable
        onPress={() =>
          router.canGoBack() ? router.back() : router.replace("/(tabs)/tools")
        }
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel="Go back"
        style={[styles.backFab, { top: (isWeb ? 12 : insets.top) + 56 }]}
      >
        <Feather name="chevron-left" size={24} color={IVORY} />
      </Pressable>
      <ScrollView
        style={styles.root}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: (isWeb ? 67 : insets.top) + 70,
            paddingBottom: insets.bottom + 120,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerBlock}>
          <Text style={styles.kicker}>CHARTER ROI</Text>
          <Text style={styles.title}>Investment intelligence</Text>
          <Text style={styles.subtitle}>
            See expected revenue, expenses, ROI and payback for any yacht in charter.
          </Text>
        </View>

        {!isLoaded || (isSignedIn && query.isLoading) ? (
          <View style={styles.center}>
            <ActivityIndicator color={GOLD} />
          </View>
        ) : !isSignedIn ? (
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Feather name="lock" size={26} color={GOLD} />
            </View>
            <Text style={styles.emptyTitle}>Sign in to use Charter ROI</Text>
            <Text style={styles.emptyText}>
              Run unlimited charter ROI scenarios on your saved yachts or any
              yacht you enter manually.
            </Text>
            <Pressable
              onPress={() => router.push("/(auth)/sign-in")}
              style={({ pressed }) => [styles.cta, { opacity: pressed ? 0.85 : 1 }]}
            >
              <Text style={styles.ctaText}>Sign in</Text>
            </Pressable>
          </View>
        ) : (
          <>
            {/* ── Start a new ROI ───────────────────────────────────── */}
            <View style={styles.listHeader}>
              <Text style={styles.listHeaderText}>NEW ROI · FROM MY YACHTS</Text>
            </View>

            {query.isError ? (
              <Text style={styles.sectionHint}>
                Couldn't load your yachts.{" "}
                <Text style={styles.linkText} onPress={() => query.refetch()}>
                  Retry
                </Text>
                {"  "}You can still enter a yacht manually below.
              </Text>
            ) : yachts.length === 0 ? (
              <Text style={styles.sectionHint}>
                You have no saved yachts yet. Enter any yacht manually below — it
                stays with this ROI only and is never saved to My Yachts.
              </Text>
            ) : (
              yachts.map((yacht) => {
                const hasId = Boolean(yacht.id);
                const title = yachtTitle(yacht);
                // Saved yachts store crew in `crew_cabins` and passenger
                // capacity in `berths`; fall back to those so the card shows
                // real data instead of "—".
                const yx = yacht as unknown as Record<string, unknown>;
                const num = (...keys: string[]): number | null => {
                  for (const k of keys) {
                    const v = yx[k];
                    if (typeof v === "number" && Number.isFinite(v)) return v;
                  }
                  return null;
                };
                const guestVal = num("guests", "berths");
                const crewVal = num("crew", "crew_cabins");
                return (
                  <View key={yacht.id ?? title} style={styles.card}>
                    <View style={styles.cardHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.yachtName} numberOfLines={1}>
                          {title}
                        </Text>
                        {yacht.yacht_type ? (
                          <Text style={styles.yachtType}>
                            {TYPE_LABELS[yacht.yacht_type] ?? yacht.yacht_type}
                            {yacht.year_built ? ` · ${yacht.year_built}` : ""}
                          </Text>
                        ) : null}
                      </View>
                    </View>
                    <View style={styles.cardDivider} />
                    <View style={styles.specGrid}>
                      <Spec label="Length" value={formatLength(yacht.length_meters, units)} />
                      <Spec label="Cabins" value={yacht.cabins != null ? String(yacht.cabins) : "—"} />
                      <Spec label="Guests" value={guestVal != null ? String(guestVal) : "—"} />
                      <Spec label="Crew" value={crewVal != null ? String(crewVal) : "—"} />
                    </View>
                    <Pressable
                      onPress={() =>
                        router.push({
                          pathname: "/roi/calculate",
                          params: { yacht_id: yacht.id },
                        })
                      }
                      disabled={!hasId}
                      accessibilityRole="button"
                      accessibilityLabel={`Calculate ROI for ${title}`}
                      style={({ pressed }) => [
                        styles.calcBtn,
                        { opacity: pressed || !hasId ? 0.85 : 1 },
                      ]}
                    >
                      <Feather name="trending-up" size={16} color={GOLD} />
                      <Text style={styles.calcBtnText}>Calculate ROI</Text>
                    </Pressable>
                  </View>
                );
              })
            )}

            <Pressable
              onPress={() => router.push("/roi/yacht-form")}
              accessibilityRole="button"
              accessibilityLabel="Enter a yacht manually"
              style={({ pressed }) => [styles.addBtn, { opacity: pressed ? 0.85 : 1 }]}
            >
              <Feather name="plus" size={18} color={GOLD} />
              <Text style={styles.addBtnText}>Enter a yacht manually</Text>
            </Pressable>
            <Text style={styles.limitHint}>
              Manual yachts are used for this ROI only — not saved to My Yachts.
            </Text>

            {/* ── Saved ROI requests ────────────────────────────────── */}
            <View style={[styles.listHeader, { marginTop: 32 }]}>
              <Text style={styles.listHeaderText}>MY ROI REQUESTS</Text>
            </View>

            {roiQ.isLoading ? (
              <View style={styles.center}>
                <ActivityIndicator color={GOLD} />
              </View>
            ) : roiQ.isError ? (
              <Text style={styles.sectionHint}>
                Couldn't load your ROI requests.{" "}
                <Text style={styles.linkText} onPress={() => roiQ.refetch()}>
                  Retry
                </Text>
              </Text>
            ) : roiItems.length === 0 ? (
              <Text style={styles.sectionHint}>
                No ROI requests yet. Run a scenario above and it will be saved
                here — delete it any time without touching My Yachts.
              </Text>
            ) : (
              roiItems.map((item) => {
                const positive = item.net_profit_eur >= 0;
                const title = `Charter ROI · ${REGION_LABELS[item.region] ?? item.region}`;
                return (
                  <SwipeableCard
                    key={item.id}
                    onDelete={() => {
                      markPending(item.id);
                      deleteRoi.mutate({ id: item.id });
                    }}
                    deletingLabel="Delete ROI request"
                    confirmTitle="Delete ROI request?"
                    confirmMessage="This calculation will be removed. Your yacht in My Yachts is not affected."
                    isDeleting={pendingIds.has(item.id)}
                  >
                    <View style={styles.roiCard}>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Open ROI request, ${item.roi_pct.toFixed(1)} percent`}
                        onPress={() =>
                          router.push({ pathname: "/roi/result", params: { id: item.id } })
                        }
                        style={({ pressed }) => [
                          styles.roiCardMain,
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
                        <View style={{ alignItems: "flex-end" }}>
                          <Text style={[styles.cardPrice, { color: positive ? POSITIVE : NEGATIVE }]}>
                            {formatEurSigned(item.net_profit_eur)}
                          </Text>
                          <Text style={styles.roiSub}>{item.roi_pct.toFixed(1)}% ROI</Text>
                        </View>
                      </Pressable>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Edit ROI request"
                        onPress={() =>
                          router.push({
                            pathname: "/roi/calculate",
                            params: { edit_id: item.id },
                          })
                        }
                        hitSlop={8}
                        style={({ pressed }) => [
                          styles.editBtn,
                          { opacity: pressed ? 0.7 : 1 },
                        ]}
                      >
                        <Feather name="edit-2" size={15} color={GOLD} />
                        <Text style={styles.editBtnText}>Edit</Text>
                      </Pressable>
                    </View>
                  </SwipeableCard>
                );
              })
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

function Spec({
  label,
  value,
  wide,
}: {
  label: string;
  value: string;
  wide?: boolean;
}) {
  return (
    <View style={[styles.spec, wide ? styles.specWide : null]}>
      <Text style={styles.specLabel}>{label}</Text>
      <Text style={styles.specValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: NAVY },
  content: { paddingHorizontal: 24 },
  headerBlock: { marginBottom: 22 },
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
    marginBottom: 8,
  },
  subtitle: {
    color: MUTED,
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    lineHeight: 19,
  },
  center: { paddingVertical: 40, alignItems: "center" },
  empty: { alignItems: "center", paddingVertical: 40, paddingHorizontal: 8 },
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
    textAlign: "center",
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
  listHeader: { marginBottom: 12 },
  listHeaderText: {
    color: MUTED,
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    letterSpacing: 1.4,
    textTransform: "uppercase",
  },
  sectionHint: {
    color: MUTED,
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 6,
  },
  linkText: { color: GOLD, fontFamily: "Inter_700Bold" },
  card: {
    backgroundColor: NAVY_DEEP,
    borderColor: DIVIDER,
    borderWidth: 1,
    borderRadius: 16,
    padding: 20,
    marginBottom: 14,
  },
  cardHeader: { flexDirection: "row", alignItems: "flex-start" },
  yachtName: {
    color: IVORY,
    fontFamily: "Gilroy-ExtraBold",
    fontSize: 20,
    marginBottom: 4,
  },
  yachtType: {
    color: GOLD,
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    letterSpacing: 0.4,
  },
  cardDivider: { height: 1, backgroundColor: DIVIDER, marginVertical: 16 },
  specGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  spec: { width: "47%" },
  specWide: { width: "100%" },
  specLabel: {
    color: MUTED,
    fontFamily: "Inter_500Medium",
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  specValue: { color: IVORY, fontFamily: "Inter_600SemiBold", fontSize: 15 },
  calcBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "rgba(201,169,97,0.10)",
    borderWidth: 1.5,
    borderColor: GOLD,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 18,
  },
  calcBtnText: { color: GOLD, fontFamily: "Inter_700Bold", fontSize: 14 },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "transparent",
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: GOLD,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 8,
  },
  addBtnText: { color: GOLD, fontFamily: "Inter_700Bold", fontSize: 14 },
  limitHint: {
    color: MUTED,
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    textAlign: "center",
    marginTop: 8,
    fontStyle: "italic",
  },
  roiCard: {
    backgroundColor: NAVY_DEEP,
    borderColor: DIVIDER,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 16,
    marginBottom: 10,
  },
  roiCardMain: { flexDirection: "row", alignItems: "center" },
  cardTitle: {
    color: IVORY,
    fontFamily: "Gilroy-Regular",
    fontSize: 16,
    marginBottom: 4,
  },
  cardMeta: { color: MUTED, fontFamily: "Inter_400Regular", fontSize: 12 },
  cardPrice: { fontFamily: "Inter_700Bold", fontSize: 15 },
  roiSub: { color: MUTED, fontFamily: "Inter_500Medium", fontSize: 11, marginTop: 2 },
  editBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    alignSelf: "flex-start",
    marginTop: 14,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(201,169,97,0.45)",
  },
  editBtnText: { color: GOLD, fontFamily: "Inter_700Bold", fontSize: 13 },
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
