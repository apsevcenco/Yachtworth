import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ComingSoonModal } from "../../components/ComingSoonModal";

const NAVY = "#0B1E3F";
const NAVY_DEEP = "#081633";
const GOLD = "#C9A961";
const IVORY = "#F7F3EC";
const MUTED = "rgba(247,243,236,0.6)";
const DIVIDER = "rgba(247,243,236,0.08)";
const LIVE_GREEN = "#7BD389";

type Role = "all" | "owner" | "broker" | "charter" | "surveyor";

const ROLES: { key: Role; label: string }[] = [
  { key: "all", label: "All" },
  { key: "owner", label: "Owner" },
  { key: "broker", label: "Broker" },
  { key: "charter", label: "Charter" },
  { key: "surveyor", label: "Surveyor" },
];

type Tool = {
  key: string;
  icon: React.ComponentProps<typeof Feather>["name"];
  title: string;
  subtitle: string;
  roles: Exclude<Role, "all">[];
  status: "live" | "soon";
  route?: string;
};

const TOOLS: Tool[] = [
  {
    key: "ai_valuation",
    icon: "trending-up",
    title: "AI Valuation",
    subtitle: "Market price in under 1 min",
    roles: ["owner", "broker", "charter", "surveyor"],
    status: "live",
    route: "/valuation/new",
  },
  {
    key: "annual_cost",
    icon: "bar-chart-2",
    title: "Annual Cost Estimator",
    subtitle: "Full ownership cost breakdown",
    roles: ["owner", "broker"],
    status: "live",
    route: "/cost/new",
  },
  {
    key: "charter_roi",
    icon: "activity",
    title: "Charter ROI",
    subtitle: "Revenue & break-even analysis",
    roles: ["charter", "owner"],
    status: "live",
    route: "/charter",
  },
  {
    key: "listing_generator",
    icon: "file-text",
    title: "Listing Generator",
    subtitle: "AI-powered listing copy",
    roles: ["broker", "owner"],
    status: "live",
    route: "/listing",
  },
  {
    key: "yacht_verification",
    icon: "shield",
    title: "Yacht Verification",
    subtitle: "IMO · AIS · Flag registry",
    roles: ["owner", "broker", "charter", "surveyor"],
    status: "soon",
  },
  {
    key: "digital_passport",
    icon: "credit-card",
    title: "Digital Passport",
    subtitle: "QR-linked verified yacht history",
    roles: ["owner", "broker", "charter", "surveyor"],
    status: "soon",
  },
  {
    key: "survey_builder",
    icon: "clipboard",
    title: "Survey Report Builder",
    subtitle: "Mobile inspection + auto PDF",
    roles: ["surveyor"],
    status: "soon",
  },
  {
    key: "maintenance_log",
    icon: "book-open",
    title: "Maintenance Log",
    subtitle: "Service history & reminders",
    roles: ["owner"],
    status: "soon",
  },
  {
    key: "broker_crm",
    icon: "users",
    title: "Broker CRM",
    subtitle: "Clients · Alerts · Co-brokerage",
    roles: ["broker"],
    status: "soon",
  },
  {
    key: "charter_planner",
    icon: "calendar",
    title: "Charter Planner",
    subtitle: "Trip planning · Per-trip P&L",
    roles: ["charter"],
    status: "live",
    route: "/charter-planner",
  },
  {
    key: "flag_calculator",
    icon: "flag",
    title: "Flag Calculator",
    subtitle: "Compare registrations & VAT",
    roles: ["owner", "broker"],
    status: "soon",
  },
  {
    key: "marina_database",
    icon: "map-pin",
    title: "Marina Database",
    subtitle: "Rates · Depths · Services",
    roles: ["owner", "charter"],
    status: "soon",
  },
];

export const TOOLS_ROLE_STORAGE_KEY = "yachtworth.tools.role";

function isRole(v: string | null | undefined): v is Role {
  return !!v && ROLES.some((r) => r.key === v);
}

export default function ToolsScreen() {
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const router = useRouter();
  const params = useLocalSearchParams<{ role?: string }>();
  const [role, setRole] = useState<Role>("all");
  const [modal, setModal] = useState<Tool | null>(null);

  useEffect(() => {
    // Param takes priority (deep-link from Home role card), then persisted value.
    if (isRole(params.role)) {
      setRole(params.role);
      AsyncStorage.setItem(TOOLS_ROLE_STORAGE_KEY, params.role).catch(() => {});
      return;
    }
    AsyncStorage.getItem(TOOLS_ROLE_STORAGE_KEY)
      .then((v) => {
        if (isRole(v)) setRole(v);
      })
      .catch(() => {});
  }, [params.role]);

  const onRole = (r: Role) => {
    setRole(r);
    AsyncStorage.setItem(TOOLS_ROLE_STORAGE_KEY, r).catch(() => {});
  };

  const filtered = useMemo(
    () => (role === "all" ? TOOLS : TOOLS.filter((t) => t.roles.includes(role))),
    [role],
  );

  return (
    <View style={[styles.root, { paddingTop: (isWeb ? 67 : insets.top) + 70 }]}>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 24,
          paddingBottom: insets.bottom + 120,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerBlock}>
          <Text style={styles.kicker}>WORKBENCH</Text>
          <Text style={styles.title}>Tools</Text>
          <Text style={styles.subtitle}>
            Everything in one place — for owners, brokers, surveyors and charter
            operators.
          </Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsRow}
          accessibilityRole="tablist"
        >
          {ROLES.map((r) => {
            const active = role === r.key;
            return (
              <Pressable
                key={r.key}
                onPress={() => onRole(r.key)}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                accessibilityLabel={`${r.label} filter`}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {r.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={{ marginTop: 14 }}>
          {filtered.map((t) => (
            <Pressable
              key={t.key}
              onPress={() => {
                if (t.status === "live" && t.route) {
                  router.push(t.route as never);
                } else {
                  setModal(t);
                }
              }}
              accessibilityRole="button"
              accessibilityLabel={`${t.title} — ${t.status === "live" ? "live, open" : "coming soon"}`}
              style={({ pressed }) => [styles.card, { opacity: pressed ? 0.85 : 1 }]}
            >
              <View style={styles.toolIcon}>
                <Feather name={t.icon} size={18} color={GOLD} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.titleRow}>
                  <Text style={styles.cardTitle} numberOfLines={1}>
                    {t.title}
                  </Text>
                  {t.status === "live" ? (
                    <View style={styles.liveBadge}>
                      <View style={styles.liveDot} />
                      <Text style={styles.liveText}>LIVE</Text>
                    </View>
                  ) : (
                    <View style={styles.soonBadge}>
                      <Text style={styles.soonText}>SOON</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.cardSub} numberOfLines={2}>
                  {t.subtitle}
                </Text>
              </View>
              <Feather name="chevron-right" size={18} color={MUTED} />
            </Pressable>
          ))}
          {filtered.length === 0 && (
            <Text style={styles.emptyText}>No tools for this role yet.</Text>
          )}
        </View>
      </ScrollView>

      {modal && (
        <ComingSoonModal
          visible
          toolKey={modal.key}
          toolName={modal.title}
          toolDescription={modal.subtitle}
          toolIcon={modal.icon}
          onClose={() => setModal(null)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: NAVY },
  headerBlock: { marginBottom: 16 },
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
  chipsRow: { paddingVertical: 4, paddingRight: 24 },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 99,
    borderWidth: 1,
    borderColor: DIVIDER,
    marginRight: 8,
    backgroundColor: NAVY_DEEP,
  },
  chipActive: { backgroundColor: "rgba(201,169,97,0.14)", borderColor: GOLD },
  chipText: {
    color: MUTED,
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    letterSpacing: 0.3,
  },
  chipTextActive: { color: GOLD, fontFamily: "Inter_700Bold" },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: NAVY_DEEP,
    borderColor: DIVIDER,
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
  },
  toolIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(201,169,97,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  cardTitle: { flex: 1, color: IVORY, fontFamily: "Inter_600SemiBold", fontSize: 15 },
  cardSub: {
    color: MUTED,
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    marginTop: 4,
    lineHeight: 17,
  },
  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: "rgba(123,211,137,0.16)",
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: LIVE_GREEN },
  liveText: {
    color: LIVE_GREEN,
    fontFamily: "Inter_700Bold",
    fontSize: 9,
    letterSpacing: 0.8,
  },
  soonBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: "rgba(247,243,236,0.08)",
  },
  soonText: { color: MUTED, fontFamily: "Inter_700Bold", fontSize: 9, letterSpacing: 0.8 },
  emptyText: {
    color: MUTED,
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    textAlign: "center",
    paddingVertical: 40,
  },
});
