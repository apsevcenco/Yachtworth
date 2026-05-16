import { Feather } from "@expo/vector-icons";
import { useAuth } from "@clerk/expo";
import {
  getListYachtsQueryKey,
  useListYachts,
  type Yacht,
} from "@workspace/api-client-react";
import { useRouter } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
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

function formatLength(m: number | null | undefined, units: "metric" | "imperial"): string {
  if (m == null) return "—";
  if (units === "metric") return `${m.toFixed(1)} m`;
  return `${Math.round(m * 3.28084)} ft`;
}

function formatEur(n: number | null | undefined): string {
  if (n == null) return "—";
  return "€ " + Math.round(n).toLocaleString("en-US");
}

function yachtTitle(y: Yacht): string {
  return (
    y.name ||
    [y.brand, y.model].filter(Boolean).join(" ") ||
    "Your yacht"
  );
}

export default function CharterScreen() {
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const router = useRouter();
  const { isSignedIn, isLoaded } = useAuth();
  const { units } = useUnits();

  const query = useListYachts({
    query: {
      queryKey: getListYachtsQueryKey(),
      enabled: Boolean(isSignedIn),
      staleTime: 30_000,
    },
  });

  // V1: one active yacht — pick the most recent one (list is ordered by updated_at desc).
  const yacht: Yacht | undefined = query.data?.items?.[0];

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: (isWeb ? 67 : insets.top) + 24,
          paddingBottom: insets.bottom + 120,
        },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.headerBlock}>
        <Text style={styles.kicker}>CHARTER ROI</Text>
        <Text style={styles.title}>Investment intelligence</Text>
        <Text style={styles.subtitle}>
          See expected revenue, expenses, ROI and payback for your yacht in charter.
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
            Save your yacht profile and run unlimited charter ROI scenarios across regions and seasons.
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
          <Text style={styles.emptyTitle}>Couldn't load profile</Text>
          <Text style={styles.emptyText}>
            {query.error instanceof Error ? query.error.message : "Something went wrong."}
          </Text>
          <Pressable
            onPress={() => query.refetch()}
            style={({ pressed }) => [styles.cta, { opacity: pressed ? 0.85 : 1 }]}
          >
            <Text style={styles.ctaText}>Retry</Text>
          </Pressable>
        </View>
      ) : !yacht ? (
        <View style={styles.empty}>
          <View style={styles.emptyIcon}>
            <Feather name="anchor" size={26} color={GOLD} />
          </View>
          <Text style={styles.emptyTitle}>Create your yacht profile</Text>
          <Text style={styles.emptyText}>
            Tell us about your yacht once. We'll use it for every ROI scenario.
          </Text>
          <Pressable
            onPress={() => router.push("/roi/yacht-form")}
            style={({ pressed }) => [styles.cta, { opacity: pressed ? 0.85 : 1 }]}
          >
            <Text style={styles.ctaText}>Create yacht profile</Text>
          </Pressable>
        </View>
      ) : (
        <View>
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.yachtName} numberOfLines={1}>
                  {yachtTitle(yacht)}
                </Text>
                {yacht.yacht_type ? (
                  <Text style={styles.yachtType}>
                    {TYPE_LABELS[yacht.yacht_type] ?? yacht.yacht_type}
                    {yacht.year_built ? ` · ${yacht.year_built}` : ""}
                  </Text>
                ) : null}
              </View>
              <Pressable
                onPress={() =>
                  router.push({
                    pathname: "/roi/yacht-form",
                    params: { id: yacht.id },
                  })
                }
                hitSlop={8}
                style={({ pressed }) => [styles.editBtn, { opacity: pressed ? 0.7 : 1 }]}
              >
                <Feather name="edit-2" size={16} color={GOLD} />
              </Pressable>
            </View>
            <View style={styles.cardDivider} />
            <View style={styles.specGrid}>
              <Spec label="Length" value={formatLength(yacht.length_meters, units)} />
              <Spec label="Cabins" value={yacht.cabins != null ? String(yacht.cabins) : "—"} />
              <Spec label="Guests" value={yacht.guests != null ? String(yacht.guests) : "—"} />
              <Spec label="Crew" value={yacht.crew != null ? String(yacht.crew) : "—"} />
              <Spec label="Marina" value={yacht.marina_location || "—"} wide />
              <Spec label="Purchase" value={formatEur(yacht.purchase_price_eur)} wide />
            </View>
          </View>

          <Pressable
            onPress={() =>
              router.push({
                pathname: "/roi/calculate",
                params: { yacht_id: yacht.id },
              })
            }
            style={({ pressed }) => [
              styles.calcBtn,
              { opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <Feather name="trending-up" size={18} color={NAVY} />
            <Text style={styles.calcBtnText}>Calculate ROI</Text>
          </Pressable>
          <Text style={styles.comingSoon}>
            Set your scenario — manual day/week pricing or AI market estimate.
          </Text>
        </View>
      )}
    </ScrollView>
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
    marginBottom: 8,
  },
  subtitle: {
    color: MUTED,
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    lineHeight: 19,
  },
  center: { paddingVertical: 60, alignItems: "center" },
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
    backgroundColor: GOLD,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 10,
  },
  ctaText: { color: NAVY, fontFamily: "Inter_700Bold", fontSize: 14 },
  card: {
    backgroundColor: NAVY_DEEP,
    borderColor: DIVIDER,
    borderWidth: 1,
    borderRadius: 16,
    padding: 20,
    marginBottom: 18,
  },
  cardHeader: { flexDirection: "row", alignItems: "flex-start" },
  yachtName: {
    color: IVORY,
    fontFamily: "Gilroy-ExtraBold",
    fontSize: 22,
    marginBottom: 4,
  },
  yachtType: { color: GOLD, fontFamily: "Inter_500Medium", fontSize: 12, letterSpacing: 0.4 },
  editBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderColor: GOLD,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  cardDivider: { height: 1, backgroundColor: DIVIDER, marginVertical: 18 },
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
    backgroundColor: GOLD,
    paddingVertical: 16,
    borderRadius: 12,
  },
  calcBtnText: { color: NAVY, fontFamily: "Inter_700Bold", fontSize: 15 },
  comingSoon: {
    color: MUTED,
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    textAlign: "center",
    marginTop: 10,
    fontStyle: "italic",
  },
});
