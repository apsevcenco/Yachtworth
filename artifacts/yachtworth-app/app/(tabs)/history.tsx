import { Feather } from "@expo/vector-icons";
import { useAuth } from "@clerk/expo";
import {
  getListEstimatesQueryKey,
  useListEstimates,
  type EstimateListItem,
} from "@workspace/api-client-react";
import { useRouter } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useUnits } from "../../hooks/useUnits";

const NAVY = "#0B1E3F";
const NAVY_ELEV = "#142A52";
const NAVY_DEEP = "#081633";
const GOLD = "#C9A961";
const IVORY = "#F7F3EC";
const MUTED = "rgba(247,243,236,0.55)";
const DIVIDER = "rgba(247,243,236,0.08)";

const TYPE_LABELS: Record<string, string> = {
  motor_yacht: "Motor Yacht",
  sailing_yacht: "Sailing Yacht",
  catamaran: "Catamaran",
  superyacht: "Superyacht",
};

function formatEur(n: number): string {
  return "€ " + Math.round(n).toLocaleString("en-US");
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
  const { isSignedIn, isLoaded } = useAuth();
  const { units } = useUnits();

  const query = useListEstimates({
    query: {
      queryKey: getListEstimatesQueryKey(),
      enabled: Boolean(isSignedIn),
      staleTime: 30_000,
    },
  });

  const items: EstimateListItem[] = query.data?.items ?? [];

  return (
    <View
      style={[
        styles.root,
        { paddingTop: (isWeb ? 67 : insets.top) + 24, paddingBottom: insets.bottom + 100 },
      ]}
    >
      <View style={styles.headerBlock}>
        <Text style={styles.kicker}>HISTORY</Text>
        <Text style={styles.title}>Your estimates</Text>
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
          <Text style={styles.emptyTitle}>Sign in to see history</Text>
          <Text style={styles.emptyText}>
            Your estimates are saved to your account. Sign in or create one to access them across devices.
          </Text>
          <Pressable
            onPress={() => router.push("/(auth)/sign-in")}
            style={({ pressed }) => [styles.cta, { opacity: pressed ? 0.85 : 1 }]}
          >
            <Text style={styles.ctaText}>Sign in</Text>
          </Pressable>
        </View>
      ) : query.isError ? (
        <View style={styles.empty}>
          <View style={styles.emptyIcon}>
            <Feather name="alert-circle" size={26} color={GOLD} />
          </View>
          <Text style={styles.emptyTitle}>Couldn't load history</Text>
          <Text style={styles.emptyText}>
            {query.error instanceof Error
              ? query.error.message
              : "Something went wrong."}
          </Text>
          <Pressable
            onPress={() => query.refetch()}
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
          <Text style={styles.emptyTitle}>Nothing here yet</Text>
          <Text style={styles.emptyText}>
            Your yacht estimates will appear here.
          </Text>
          <Pressable
            onPress={() => router.push("/valuation/new")}
            style={({ pressed }) => [styles.cta, { opacity: pressed ? 0.85 : 1 }]}
          >
            <Text style={styles.ctaText}>New estimate</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 60 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={query.isFetching && !query.isLoading}
              onRefresh={() => query.refetch()}
              tintColor={GOLD}
            />
          }
          renderItem={({ item }) => (
            <Pressable
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
                  {item.yacht_label || "Estimate"}
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
                <Text style={styles.cardPrice}>
                  {formatEur(item.estimated_price_eur)}
                </Text>
                <Feather name="chevron-right" size={18} color={MUTED} />
              </View>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: NAVY, paddingHorizontal: 24 },
  headerBlock: { marginBottom: 26 },
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
    backgroundColor: GOLD,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 10,
  },
  ctaText: { color: NAVY, fontFamily: "Inter_700Bold", fontSize: 14 },
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
  cardPrice: {
    color: GOLD,
    fontFamily: "Inter_700Bold",
    fontSize: 14,
  },
});
