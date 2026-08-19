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
import { useTheme } from "../../hooks/useColors";
import { TOOLS_ROLE_STORAGE_KEY } from "./tools";

const GOLD = "#C9A961";
const IVORY = "#F7F3EC";
const MUTED = "rgba(247,243,236,0.62)";
const DIVIDER = "rgba(247,243,236,0.08)";

type Role = "owner" | "broker" | "charter" | "surveyor";
type IconName = React.ComponentProps<typeof Feather>["name"];

const SCENARIOS: {
  title: string;
  copy: string;
  icon: IconName;
  href: string;
  role?: Role;
}[] = [
  {
    title: "Build Digital Passport",
    copy: "Create one verified yacht profile that powers every Yachtworth tool.",
    icon: "shield",
    href: "/(tabs)/my-yacht",
    role: "owner",
  },
  {
    title: "Value a yacht",
    copy: "AI valuation, market logic, comparables and professional PDF output.",
    icon: "trending-up",
    href: "/valuation/new",
    role: "broker",
  },
  {
    title: "Plan charter ROI",
    copy: "Regions, seasonality, marinas, crew, repositioning and owner net result.",
    icon: "bar-chart-2",
    href: "/roi/calculate",
    role: "charter",
  },
  {
    title: "Manage maintenance",
    copy: "Equipment, tasks, defects, work orders, calendar and service history.",
    icon: "tool",
    href: "/maintenance",
    role: "owner",
  },
  {
    title: "Prepare survey report",
    copy: "Field notes, photos, voice transcription, findings and final report.",
    icon: "clipboard",
    href: "/survey",
    role: "surveyor",
  },
  {
    title: "Run brokerage work",
    copy: "CRM, cases, listings, proposals and client follow-up in one workflow.",
    icon: "briefcase",
    href: "/crm",
    role: "broker",
  },
  {
    title: "Compare flags",
    copy: "Registration intelligence, jurisdiction comparison and advisor logic.",
    icon: "flag",
    href: "/flag-intelligence",
  },
  {
    title: "Publish to network",
    copy: "Share sale or charter listings inside the closed Yachtworth marketplace.",
    icon: "send",
    href: "/yacht-network",
    role: "broker",
  },
];

const BENEFITS: { label: string; icon: IconName }[] = [
  { label: "One yacht profile across all tools", icon: "database" },
  { label: "Professional PDF reports", icon: "file-text" },
  { label: "Mobile and desktop workspace", icon: "monitor" },
  { label: "AI-assisted analysis and writing", icon: "zap" },
  { label: "Maintenance and document history", icon: "clock" },
  { label: "Brokerage, CRM and network workflows", icon: "users" },
];

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const isWeb = Platform.OS === "web";
  const { colors, isAcid } = useTheme();

  const haptic = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const openScenario = async (href: string, role?: Role) => {
    haptic();
    if (role) {
      try {
        await AsyncStorage.setItem(TOOLS_ROLE_STORAGE_KEY, role);
      } catch {}
    }
    router.push(href as never);
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          {
            paddingTop: (isWeb ? 67 : insets.top) + 70,
            paddingBottom: insets.bottom + 120,
          },
          isWeb && styles.webScroll,
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroBlock}>
          <Text style={[styles.kicker, { color: colors.primary }, isAcid && styles.acidKicker]}>YACHTWORTH ECOSYSTEM</Text>
          <Text style={[styles.hero, { color: colors.foreground }, isAcid && styles.acidHero]}>
            The operating system for yacht ownership, brokerage and fleet intelligence.
          </Text>
          <Text style={[styles.subhero, { color: colors.mutedForeground }]}>
            A single workspace for valuation, charter ROI, surveys, maintenance, CRM, flag advice, listings and professional documents.
          </Text>
        </View>

        <Pressable
          onPress={() => openScenario("/(tabs)/my-yacht", "owner")}
          accessibilityRole="button"
          accessibilityLabel="Open Digital Yacht Passport"
          style={({ pressed }) => [
            styles.passport,
            {
              backgroundColor: colors.card,
              borderColor: isAcid ? colors.accent : DIVIDER,
              opacity: pressed ? 0.92 : 1,
            },
            isAcid && styles.acidGlow,
          ]}
        >
          <View style={[styles.passportIcon, { backgroundColor: colors.primary }]}>
            <Feather name="shield" size={24} color={colors.background} />
          </View>
          <View style={styles.passportBody}>
            <Text style={[styles.passportKicker, { color: colors.primary }, isAcid && styles.acidKicker]}>DIGITAL YACHT PASSPORT</Text>
            <Text style={[styles.passportTitle, { color: colors.foreground }, isAcid && styles.acidTitle]}>
              One verified yacht identity.
            </Text>
            <Text style={[styles.passportText, { color: colors.mutedForeground }]}>
              Store the yacht's core data once, then reuse it across valuation, ROI, survey, maintenance, proposal, listing, CRM and PDF reports.
            </Text>
          </View>
          <Feather name="arrow-up-right" size={19} color={colors.primary} />
        </Pressable>

        <View style={styles.sectionHead}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }, isAcid && styles.acidTitle]}>What do you need to do?</Text>
          <Text style={[styles.sectionCopy, { color: colors.mutedForeground }]}>Choose a workflow and Yachtworth opens the right part of the system.</Text>
        </View>

        <View style={styles.grid}>
          {SCENARIOS.map((item) => (
            <Pressable
              key={item.title}
              onPress={() => openScenario(item.href, item.role)}
              accessibilityRole="button"
              accessibilityLabel={item.title}
              style={({ pressed }) => [
                styles.scenarioCard,
                {
                  backgroundColor: colors.secondary,
                  borderColor: isAcid ? colors.border : DIVIDER,
                  opacity: pressed ? 0.88 : 1,
                  transform: [{ scale: pressed ? 0.99 : 1 }],
                },
                isAcid && styles.acidCard,
              ]}
            >
              <View style={[styles.scenarioIcon, { backgroundColor: colors.glow ?? "rgba(201,169,97,0.12)" }]}>
                <Feather name={item.icon} size={19} color={colors.primary} />
              </View>
              <Text style={[styles.scenarioTitle, { color: colors.foreground }, isAcid && styles.acidTitle]}>{item.title}</Text>
              <Text style={[styles.scenarioCopy, { color: colors.mutedForeground }]}>{item.copy}</Text>
            </Pressable>
          ))}
        </View>

        <View style={[styles.benefits, { backgroundColor: colors.card, borderColor: isAcid ? colors.border : DIVIDER }]}>
          <Text style={[styles.benefitsTitle, { color: colors.foreground }, isAcid && styles.acidTitle]}>What the client gets</Text>
          <View style={styles.benefitGrid}>
            {BENEFITS.map((item) => (
              <View key={item.label} style={styles.benefitItem}>
                <Feather name={item.icon} size={15} color={colors.primary} />
                <Text style={[styles.benefitText, { color: colors.mutedForeground }]}>{item.label}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.quickRow}>
          <Pressable
            onPress={() => openScenario("/(tabs)/tools")}
            accessibilityRole="button"
            accessibilityLabel="Open all tools"
            style={({ pressed }) => [
              styles.quickBtn,
              {
                borderColor: colors.primary,
                backgroundColor: colors.glow ?? "rgba(201,169,97,0.06)",
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            <Text style={[styles.quickBtnText, { color: colors.primary }]}>All tools</Text>
            <Feather name="grid" size={16} color={colors.primary} />
          </Pressable>
          <Pressable
            onPress={() => openScenario("/marketplace")}
            accessibilityRole="button"
            accessibilityLabel="Open Yachtworth marketplace"
            style={({ pressed }) => [
              styles.quickBtn,
              {
                borderColor: colors.primary,
                backgroundColor: colors.glow ?? "rgba(201,169,97,0.06)",
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            <Text style={[styles.quickBtnText, { color: colors.primary }]}>Marketplace</Text>
            <Feather name="arrow-up-right" size={16} color={colors.primary} />
          </Pressable>
        </View>

        <View style={styles.footerNote}>
          <Text style={[styles.footerNoteText, { color: colors.primary }]}>by the team behind PDYE</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: {
    paddingHorizontal: 24,
  },
  webScroll: {
    width: "100%",
    maxWidth: 1180,
    alignSelf: "center",
  },
  heroBlock: {
    maxWidth: 860,
  },
  kicker: {
    color: GOLD,
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    letterSpacing: 2.4,
    textTransform: "uppercase",
    marginBottom: 12,
  },
  acidKicker: {
    letterSpacing: 3,
  },
  hero: {
    color: IVORY,
    fontFamily: "Gilroy-ExtraBold",
    fontSize: Platform.OS === "web" ? 46 : 34,
    lineHeight: Platform.OS === "web" ? 54 : 40,
  },
  acidHero: {
    letterSpacing: 0.9,
    textTransform: "uppercase",
  },
  subhero: {
    color: MUTED,
    fontFamily: "Inter_400Regular",
    fontSize: Platform.OS === "web" ? 16 : 14,
    lineHeight: Platform.OS === "web" ? 24 : 21,
    marginTop: 14,
    marginBottom: 22,
    maxWidth: 760,
  },
  passport: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
    borderWidth: 1,
    borderRadius: 8,
    padding: Platform.OS === "web" ? 22 : 18,
    marginBottom: 24,
  },
  acidGlow: {
    shadowColor: "#FF4FD8",
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 0 },
  },
  passportIcon: {
    width: 48,
    height: 48,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  passportBody: {
    flex: 1,
    minWidth: 0,
  },
  passportKicker: {
    fontFamily: "Inter_700Bold",
    fontSize: 10,
    letterSpacing: 2,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  passportTitle: {
    fontFamily: "Gilroy-ExtraBold",
    fontSize: 22,
    lineHeight: 27,
    marginBottom: 6,
  },
  acidTitle: {
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  passportText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    lineHeight: 20,
  },
  sectionHead: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontFamily: "Gilroy-ExtraBold",
    fontSize: 23,
    lineHeight: 28,
  },
  sectionCopy: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 18,
  },
  scenarioCard: {
    width: Platform.OS === "web" ? "24%" : "48.5%",
    minWidth: Platform.OS === "web" ? 230 : undefined,
    flexGrow: 1,
    borderWidth: 1,
    borderRadius: 8,
    padding: 15,
    minHeight: 148,
  },
  acidCard: {
    shadowColor: "#FF4FD8",
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
  },
  scenarioIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 11,
  },
  scenarioTitle: {
    fontFamily: "Gilroy-ExtraBold",
    fontSize: 16,
    lineHeight: 20,
    marginBottom: 6,
  },
  scenarioCopy: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    lineHeight: 17,
  },
  benefits: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 18,
    marginBottom: 18,
  },
  benefitsTitle: {
    fontFamily: "Gilroy-ExtraBold",
    fontSize: 20,
    marginBottom: 12,
  },
  benefitGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  benefitItem: {
    width: Platform.OS === "web" ? "31%" : "100%",
    minWidth: Platform.OS === "web" ? 260 : undefined,
    flexGrow: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  benefitText: {
    flex: 1,
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    lineHeight: 18,
  },
  quickRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 18,
  },
  quickBtn: {
    flex: 1,
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    paddingVertical: 13,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  quickBtnText: {
    color: GOLD,
    fontFamily: "Inter_700Bold",
    fontSize: 13,
    letterSpacing: 0.3,
  },
  footerNote: { marginTop: 22, alignItems: "center" },
  footerNoteText: {
    color: "rgba(201,169,97,0.7)",
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
});