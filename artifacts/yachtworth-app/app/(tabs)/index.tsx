import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { TOOLS_ROLE_STORAGE_KEY } from "./tools";

const NAVY = "#0B1E3F";
const NAVY_ELEV = "#142A52";
const NAVY_DEEP = "#081633";
const GOLD = "#C9A961";
const IVORY = "#F7F3EC";
const MUTED = "rgba(247,243,236,0.62)";
const DIVIDER = "rgba(247,243,236,0.08)";

type Role = "owner" | "broker" | "charter" | "surveyor";

const ROLES: {
  key: Role;
  label: string;
  subtitle: string;
  icon: React.ComponentProps<typeof Feather>["name"];
}[] = [
  {
    key: "owner",
    label: "Owner",
    subtitle: "Valuation · Costs · Passport",
    icon: "anchor",
  },
  {
    key: "broker",
    label: "Broker",
    subtitle: "Valuation · Listings · Co-brokerage",
    icon: "briefcase",
  },
  {
    key: "charter",
    label: "Charter",
    subtitle: "ROI · Planning · Reports",
    icon: "calendar",
  },
  {
    key: "surveyor",
    label: "Surveyor",
    subtitle: "Inspection · Reports · Valuation",
    icon: "clipboard",
  },
];

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const isWeb = Platform.OS === "web";

  const haptic = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const goRole = async (role: Role) => {
    haptic();
    try {
      await AsyncStorage.setItem(TOOLS_ROLE_STORAGE_KEY, role);
    } catch {}
    router.push({ pathname: "/(tabs)/tools", params: { role } });
  };

  return (
    <View style={[styles.root, { backgroundColor: NAVY }]}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: (isWeb ? 67 : insets.top) + 70,
          paddingBottom: insets.bottom + 120,
          paddingHorizontal: 24,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <Text style={styles.kicker}>AI tools for the yachting industry</Text>
        <Text style={styles.hero}>
          Your yacht.{"\n"}Fully understood.
        </Text>
        <Text style={styles.subhero}>
          AI-powered tools for owners, brokers and surveyors.
        </Text>

        {/* Role grid 2x2 */}
        <View style={styles.grid}>
          {ROLES.map((r) => (
            <Pressable
              key={r.key}
              onPress={() => goRole(r.key)}
              accessibilityRole="button"
              accessibilityLabel={`${r.label} role — opens tools filtered for ${r.label}`}
              style={({ pressed }) => [
                styles.roleCard,
                { opacity: pressed ? 0.88 : 1, transform: [{ scale: pressed ? 0.99 : 1 }] },
              ]}
            >
              <View style={styles.roleIcon}>
                <Feather name={r.icon} size={20} color={GOLD} />
              </View>
              <Text style={styles.roleLabel}>{r.label}</Text>
              <Text style={styles.roleSub} numberOfLines={2}>
                {r.subtitle}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Quick actions */}
        <View style={styles.quickRow}>
          <Pressable
            onPress={() => {
              haptic();
              router.push("/valuation/new");
            }}
            accessibilityRole="button"
            accessibilityLabel="New valuation"
            style={({ pressed }) => [styles.quickBtn, { opacity: pressed ? 0.85 : 1 }]}
          >
            <Text style={styles.quickBtnText}>New Valuation</Text>
            <Feather name="arrow-up-right" size={16} color={GOLD} />
          </Pressable>
          <Pressable
            onPress={() => {
              haptic();
              router.push("/(tabs)/my-yacht");
            }}
            accessibilityRole="button"
            accessibilityLabel="My yacht"
            style={({ pressed }) => [styles.quickBtn, { opacity: pressed ? 0.85 : 1 }]}
          >
            <Text style={styles.quickBtnText}>My Yacht</Text>
            <Feather name="arrow-up-right" size={16} color={GOLD} />
          </Pressable>
        </View>

        {/* Featured tool */}
        <Pressable
          onPress={() => {
            haptic();
            router.push("/valuation/new");
          }}
          accessibilityRole="button"
          accessibilityLabel="Featured: Start free AI valuation"
          style={({ pressed }) => [styles.featured, { opacity: pressed ? 0.92 : 1 }]}
        >
          <View style={styles.featuredAccent} />
          <View style={{ flex: 1, paddingLeft: 16 }}>
            <Text style={styles.featuredKicker}>FEATURED TOOL</Text>
            <Text style={styles.featuredTitle}>Know your yacht's worth</Text>
            <Text style={styles.featuredText}>
              AI valuation in under 1 min.
            </Text>
            <View style={styles.featuredCta}>
              <Text style={styles.featuredCtaText}>Start free</Text>
              <Feather name="arrow-right" size={14} color={GOLD} />
            </View>
          </View>
        </Pressable>

        <View style={styles.footerNote}>
          <Text style={styles.footerNoteText}>by the team behind PDYE</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  kicker: {
    color: GOLD,
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    letterSpacing: 2,
    textTransform: "uppercase",
    marginBottom: 12,
  },
  hero: {
    color: IVORY,
    fontFamily: "Gilroy-ExtraBold",
    fontSize: 38,
    lineHeight: 44,
    letterSpacing: -0.5,
  },
  subhero: {
    color: MUTED,
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    lineHeight: 21,
    marginTop: 12,
    marginBottom: 28,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 14,
  },
  roleCard: {
    width: "48.5%",
    backgroundColor: NAVY_DEEP,
    borderColor: DIVIDER,
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    minHeight: 116,
  },
  roleIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(201,169,97,0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  roleLabel: {
    color: IVORY,
    fontFamily: "Gilroy-ExtraBold",
    fontSize: 17,
    marginBottom: 4,
  },
  roleSub: {
    color: MUTED,
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    lineHeight: 15,
  },
  quickRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 8,
    marginBottom: 18,
  },
  quickBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: GOLD,
    backgroundColor: "rgba(201,169,97,0.06)",
  },
  quickBtnText: {
    color: GOLD,
    fontFamily: "Inter_700Bold",
    fontSize: 13,
    letterSpacing: 0.3,
  },
  featured: {
    flexDirection: "row",
    backgroundColor: NAVY_ELEV,
    borderRadius: 16,
    overflow: "hidden",
    padding: 18,
    minHeight: 124,
  },
  featuredAccent: {
    width: 3,
    borderRadius: 2,
    backgroundColor: GOLD,
  },
  featuredKicker: {
    color: GOLD,
    fontFamily: "Inter_700Bold",
    fontSize: 10,
    letterSpacing: 1.8,
    marginBottom: 8,
  },
  featuredTitle: {
    color: IVORY,
    fontFamily: "Gilroy-ExtraBold",
    fontSize: 18,
    marginBottom: 4,
  },
  featuredText: {
    color: MUTED,
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    marginBottom: 12,
  },
  featuredCta: { flexDirection: "row", alignItems: "center", gap: 6 },
  featuredCtaText: {
    color: GOLD,
    fontFamily: "Inter_700Bold",
    fontSize: 13,
    letterSpacing: 0.3,
  },
  footerNote: { marginTop: 32, alignItems: "center" },
  footerNoteText: {
    color: "rgba(201,169,97,0.7)",
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
});
