import { Feather } from "@expo/vector-icons";
import { useAuth } from "@clerk/expo";
import {
  getListYachtsQueryKey,
  useDeleteYacht,
  useListYachts,
  type Yacht,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import React from "react";
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
import { useUnits } from "../../hooks/useUnits";

const NAVY = "#0B1E3F";
const NAVY_ELEV = "#142A52";
const NAVY_DEEP = "#081633";
const GOLD = "#C9A961";
const IVORY = "#F7F3EC";
const MUTED = "rgba(247,243,236,0.55)";
const DIVIDER = "rgba(247,243,236,0.08)";
const DANGER = "#E07A6B";

const MAX_YACHTS = 5;

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
  const queryClient = useQueryClient();

  const query = useListYachts({
    query: {
      queryKey: getListYachtsQueryKey(),
      enabled: Boolean(isSignedIn),
      staleTime: 30_000,
    },
  });

  const deleteMut = useDeleteYacht({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListYachtsQueryKey() });
      },
    },
  });

  const yachts: Yacht[] = query.data?.items ?? [];
  const atLimit = yachts.length >= MAX_YACHTS;

  const handleDelete = (y: Yacht) => {
    const title = yachtTitle(y);
    Alert.alert(
      `Delete ${title}?`,
      "This will also delete all ROI calculations saved for this yacht. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            deleteMut.mutate(
              { id: y.id! },
              {
                onError: (err) => {
                  Alert.alert(
                    "Couldn't delete yacht",
                    err instanceof Error ? err.message : "Please try again.",
                  );
                },
              },
            );
          },
        },
      ],
    );
  };

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
            Save up to {MAX_YACHTS} yacht profiles and run unlimited charter ROI scenarios.
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
          <Text style={styles.emptyTitle}>Couldn't load yachts</Text>
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
      ) : yachts.length === 0 ? (
        <View style={styles.empty}>
          <View style={styles.emptyIcon}>
            <Feather name="anchor" size={26} color={GOLD} />
          </View>
          <Text style={styles.emptyTitle}>Create your first yacht profile</Text>
          <Text style={styles.emptyText}>
            Tell us about your yacht once. You can save up to {MAX_YACHTS} profiles and run ROI scenarios across regions and seasons.
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
          <View style={styles.listHeader}>
            <Text style={styles.listHeaderText}>
              {yachts.length} of {MAX_YACHTS} yacht profile{yachts.length === 1 ? "" : "s"}
            </Text>
          </View>

          {yachts.map((yacht) => {
            const hasId = Boolean(yacht.id);
            const deleting =
              deleteMut.isPending && deleteMut.variables?.id === yacht.id;
            const disabled = deleting || !hasId;
            const title = yachtTitle(yacht);
            return (
              <View key={yacht.id ?? title} style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={{ flex: 1, marginRight: 8 }}>
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
                    disabled={disabled}
                    accessibilityRole="button"
                    accessibilityLabel={`Edit yacht ${title}`}
                    style={({ pressed }) => [
                      styles.iconBtn,
                      { opacity: pressed || disabled ? 0.5 : 1 },
                    ]}
                  >
                    <Feather name="edit-2" size={15} color={GOLD} />
                  </Pressable>
                  <Pressable
                    onPress={() => handleDelete(yacht)}
                    hitSlop={8}
                    disabled={disabled}
                    accessibilityRole="button"
                    accessibilityLabel={`Delete yacht ${title}`}
                    style={({ pressed }) => [
                      styles.iconBtn,
                      styles.iconBtnDanger,
                      { opacity: pressed || disabled ? 0.5 : 1, marginLeft: 8 },
                    ]}
                  >
                    {deleting ? (
                      <ActivityIndicator size="small" color={DANGER} />
                    ) : (
                      <Feather name="trash-2" size={15} color={DANGER} />
                    )}
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
                <Pressable
                  onPress={() =>
                    router.push({
                      pathname: "/roi/calculate",
                      params: { yacht_id: yacht.id },
                    })
                  }
                  disabled={disabled}
                  accessibilityRole="button"
                  accessibilityLabel={`Calculate ROI for ${title}`}
                  style={({ pressed }) => [
                    styles.calcBtn,
                    { opacity: pressed || disabled ? 0.85 : 1 },
                  ]}
                >
                  <Feather name="trending-up" size={16} color={GOLD} />
                  <Text style={styles.calcBtnText}>Calculate ROI</Text>
                </Pressable>
              </View>
            );
          })}

          <Pressable
            onPress={() => {
              if (atLimit) return;
              router.push("/roi/yacht-form");
            }}
            disabled={atLimit}
            accessibilityRole="button"
            accessibilityLabel={atLimit ? `Yacht limit reached, ${MAX_YACHTS} maximum` : "Add yacht profile"}
            style={({ pressed }) => [
              styles.addBtn,
              atLimit ? styles.addBtnDisabled : null,
              { opacity: pressed && !atLimit ? 0.85 : 1 },
            ]}
          >
            <Feather name="plus" size={18} color={atLimit ? MUTED : GOLD} />
            <Text
              style={[
                styles.addBtnText,
                atLimit ? { color: MUTED } : null,
              ]}
            >
              {atLimit ? `Limit reached (${MAX_YACHTS} max)` : "Add yacht"}
            </Text>
          </Pressable>
          {atLimit ? (
            <Text style={styles.limitHint}>
              Delete a profile to add a new one.
            </Text>
          ) : null}
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
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderColor: GOLD,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  iconBtnDanger: { borderColor: DANGER },
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
  addBtnDisabled: { borderColor: DIVIDER, borderStyle: "solid" },
  addBtnText: { color: GOLD, fontFamily: "Inter_700Bold", fontSize: 14 },
  limitHint: {
    color: MUTED,
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    textAlign: "center",
    marginTop: 8,
    fontStyle: "italic",
  },
});
