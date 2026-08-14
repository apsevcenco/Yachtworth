import { Feather } from "@expo/vector-icons";
import {
  getListYachtsQueryKey,
  useListYachts,
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

const NAVY = "#0B1E3F";
const NAVY_ELEV = "#142A52";
const NAVY_DEEP = "#081633";
const GOLD = "#C9A961";
const IVORY = "#F7F3EC";
const MUTED = "rgba(247,243,236,0.6)";
const FAINT = "rgba(247,243,236,0.4)";
const DIVIDER = "rgba(247,243,236,0.08)";

export default function ProposalEntryScreen() {
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const router = useRouter();
  const yachtsQ = useListYachts(undefined, {
    query: {
      queryKey: getListYachtsQueryKey(),
      staleTime: 30_000,
    },
  });
  const yachts = (yachtsQ.data?.items ?? []).filter((y) => !y.is_archived);
  const loading = yachtsQ.isLoading;

  return (
    <View style={[styles.root, { paddingTop: (isWeb ? 67 : insets.top) + 56 }]}>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 24,
          paddingBottom: insets.bottom + 60,
        }}
        showsVerticalScrollIndicator={false}
      >
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Back"
          hitSlop={10}
          style={styles.backBtn}
        >
          <Feather name="arrow-left" size={20} color={IVORY} />
        </Pressable>

        <Text style={styles.kicker}>DOCUMENT BUILDER</Text>
        <Text style={styles.title}>Yacht Proposal</Text>
        <Text style={styles.subtitle}>
          Branded PDF specification sheet for sale, charter — or both.
        </Text>

        {loading ? (
          <View style={styles.loadingBlock}>
            <ActivityIndicator color={GOLD} />
          </View>
        ) : yachts.length === 0 ? (
          <View style={styles.emptyBlock}>
            <Feather name="info" size={16} color={GOLD} />
            <Text style={styles.emptyText}>
              Add a yacht to My Yacht to auto-fill all details, or enter
              everything manually below.
            </Text>
          </View>
        ) : (
          <>
            <Text style={styles.sectionKicker}>WHICH YACHT?</Text>
            <View style={styles.yachtList}>
              {yachts.map((y, i) => (
                <Pressable
                  key={y.id}
                  onPress={() =>
                    router.push({
                      pathname: "/yacht-proposal/form",
                      params: { yacht_id: y.id },
                    })
                  }
                  style={({ pressed }) => [
                    styles.yachtRow,
                    i === yachts.length - 1 && styles.yachtRowLast,
                    { opacity: pressed ? 0.8 : 1 },
                  ]}
                >
                  <View style={styles.yachtIcon}>
                    <Feather name="anchor" size={16} color={GOLD} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.yachtName} numberOfLines={1}>
                      {y.name || "Untitled yacht"}
                    </Text>
                    <Text style={styles.yachtMeta} numberOfLines={1}>
                      {[
                        y.brand,
                        y.length_meters
                          ? `${y.length_meters.toFixed(1)}m`
                          : null,
                        y.year_built ? String(y.year_built) : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </Text>
                  </View>
                  <Feather name="chevron-right" size={18} color={FAINT} />
                </Pressable>
              ))}
            </View>
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OR</Text>
              <View style={styles.dividerLine} />
            </View>
          </>
        )}

        <Pressable
          onPress={() => router.push("/yacht-proposal/form")}
          style={({ pressed }) => [
            styles.manualBtn,
            { opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <Feather name="edit-3" size={18} color={GOLD} />
          <Text style={styles.manualBtnText}>Enter yacht details manually</Text>
        </Pressable>

        <Pressable
          onPress={() => router.push("/yacht-proposal/my-proposals")}
          style={({ pressed }) => [
            styles.savedLink,
            { opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <Feather name="folder" size={14} color={MUTED} />
          <Text style={styles.savedLinkText}>My saved proposals</Text>
          <Feather name="chevron-right" size={14} color={MUTED} />
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: NAVY },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: NAVY_ELEV,
    marginBottom: 20,
  },
  kicker: {
    color: GOLD,
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    letterSpacing: 2,
    marginBottom: 8,
  },
  title: {
    color: IVORY,
    fontFamily: "Gilroy-ExtraBold",
    fontSize: 30,
    letterSpacing: -0.4,
    marginBottom: 8,
  },
  subtitle: {
    color: MUTED,
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 26,
  },
  loadingBlock: { alignItems: "center", padding: 30 },
  sectionKicker: {
    color: GOLD,
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    letterSpacing: 2,
    marginBottom: 10,
  },
  yachtList: {
    backgroundColor: NAVY_DEEP,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: DIVIDER,
    overflow: "hidden",
    marginBottom: 20,
  },
  yachtRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: DIVIDER,
  },
  yachtRowLast: { borderBottomWidth: 0 },
  yachtIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(201,169,97,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  yachtName: { color: IVORY, fontFamily: "Inter_600SemiBold", fontSize: 15 },
  yachtMeta: {
    color: MUTED,
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    marginTop: 2,
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginVertical: 8,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: DIVIDER },
  dividerText: {
    color: FAINT,
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    letterSpacing: 2,
  },
  emptyBlock: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
    backgroundColor: NAVY_ELEV,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: DIVIDER,
    marginBottom: 20,
  },
  emptyText: {
    flex: 1,
    color: MUTED,
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    lineHeight: 19,
  },
  manualBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 18,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: GOLD,
    backgroundColor: "rgba(201,169,97,0.08)",
    marginTop: 8,
    marginBottom: 28,
  },
  manualBtnText: { color: GOLD, fontFamily: "Inter_600SemiBold", fontSize: 15 },
  savedLink: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  savedLinkText: { color: MUTED, fontFamily: "Inter_500Medium", fontSize: 13 },
});
