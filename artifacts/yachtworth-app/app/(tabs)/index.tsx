import { Feather } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
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

import { useColors } from "@/hooks/useColors";

const NAVY = "#0B1E3F";
const NAVY_ELEV = "#142A52";
const GOLD = "#C9A961";
const IVORY = "#F7F3EC";

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const isWeb = Platform.OS === "web";

  const onPressNew = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    router.push("/valuation/new");
  };

  const onPressCost = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    router.push("/cost/new");
  };

  return (
    <View style={[styles.root, { backgroundColor: NAVY }]}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: (isWeb ? 67 : insets.top) + 24,
          paddingBottom: insets.bottom + 120,
          paddingHorizontal: 24,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.brandRow}>
            <View style={styles.dot} />
            <Text style={styles.brandLabel}>YACHTWORTH</Text>
          </View>
          <Pressable
            hitSlop={12}
            onPress={() => {
              if (Platform.OS !== "web") {
                Haptics.selectionAsync();
              }
            }}
          >
            <Feather name="bell" size={20} color={IVORY} />
          </Pressable>
        </View>

        <Text style={styles.kicker}>AI market estimate, the discreet way</Text>
        <Text style={styles.hero}>
          Know your{"\n"}yacht's worth.
        </Text>
        <Text style={styles.subhero}>
          A professional AI market estimate in under a minute — built for owners,
          brokers and surveyors.
        </Text>

        <Pressable
          onPress={onPressNew}
          style={({ pressed }) => [
            styles.ctaWrap,
            { opacity: pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.99 : 1 }] },
          ]}
        >
          <BlurView
            intensity={40}
            tint="dark"
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.ctaInner}>
            <Text style={styles.ctaText}>New estimate</Text>
            <Feather name="arrow-up-right" size={20} color={GOLD} />
          </View>
        </Pressable>

        <Pressable
          onPress={onPressCost}
          style={({ pressed }) => [
            styles.ctaSecondary,
            { opacity: pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.99 : 1 }] },
          ]}
        >
          <View style={styles.ctaInner}>
            <View>
              <Text style={styles.ctaSecondaryKicker}>NEW</Text>
              <Text style={styles.ctaSecondaryText}>Annual cost calculator</Text>
            </View>
            <Feather name="bar-chart-2" size={20} color={GOLD} />
          </View>
        </Pressable>

        <View style={styles.statsRow}>
          <StatCard label="Estimates" value="—" />
          <StatCard label="Plan" value="Free" />
          <StatCard label="Remaining" value="1" />
        </View>

        <Text style={styles.sectionTitle}>What you get</Text>

        <FeatureCard
          icon="trending-up"
          title="Market price range"
          subtitle="Base, optimistic and quick-sale estimates."
        />
        <FeatureCard
          icon="file-text"
          title="PDF report"
          subtitle="Ready to share with a broker or buyer."
        />
        <FeatureCard
          icon="archive"
          title="Estimate history"
          subtitle="All your yachts in one place, on the Pro plan."
        />

        <View style={styles.footerNote}>
          <Text style={styles.footerNoteText}>by the team behind PDYE</Text>
        </View>
      </ScrollView>
    </View>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function FeatureCard({
  icon,
  title,
  subtitle,
}: {
  icon: React.ComponentProps<typeof Feather>["name"];
  title: string;
  subtitle: string;
}) {
  return (
    <View style={styles.featureCard}>
      <View style={styles.featureIcon}>
        <Feather name={icon} size={18} color={GOLD} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.featureTitle}>{title}</Text>
        <Text style={styles.featureSubtitle}>{subtitle}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 36,
  },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: GOLD,
  },
  brandLabel: {
    color: IVORY,
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    letterSpacing: 3,
  },
  kicker: {
    color: GOLD,
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    letterSpacing: 2,
    textTransform: "uppercase",
    marginBottom: 14,
  },
  hero: {
    color: IVORY,
    fontFamily: "Gilroy-ExtraBold",
    fontSize: 40,
    lineHeight: 46,
    letterSpacing: -0.5,
  },
  subhero: {
    color: "rgba(247,243,236,0.7)",
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    lineHeight: 22,
    marginTop: 14,
    marginBottom: 28,
  },
  ctaWrap: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: GOLD,
    backgroundColor: "rgba(201,169,97,0.06)",
    overflow: "hidden",
  },
  ctaInner: {
    paddingVertical: 18,
    paddingHorizontal: 22,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  ctaText: {
    color: GOLD,
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
    letterSpacing: 0.2,
  },
  ctaSecondary: {
    marginTop: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(201,169,97,0.35)",
    backgroundColor: NAVY_ELEV,
    overflow: "hidden",
  },
  ctaSecondaryText: {
    color: IVORY,
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    letterSpacing: 0.1,
    marginTop: 2,
  },
  ctaSecondaryKicker: {
    color: GOLD,
    fontFamily: "Inter_700Bold",
    fontSize: 10,
    letterSpacing: 1.8,
  },
  statsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 32,
  },
  statCard: {
    flex: 1,
    backgroundColor: NAVY_ELEV,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 14,
  },
  statValue: {
    color: IVORY,
    fontFamily: "Gilroy-ExtraBold",
    fontSize: 22,
  },
  statLabel: {
    color: "rgba(247,243,236,0.55)",
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    marginTop: 4,
  },
  sectionTitle: {
    color: IVORY,
    fontFamily: "Gilroy-Regular",
    fontSize: 20,
    marginTop: 40,
    marginBottom: 14,
  },
  featureCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: NAVY_ELEV,
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
  },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(201,169,97,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  featureTitle: {
    color: IVORY,
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
  },
  featureSubtitle: {
    color: "rgba(247,243,236,0.6)",
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    marginTop: 2,
  },
  footerNote: {
    marginTop: 32,
    alignItems: "center",
  },
  footerNoteText: {
    color: "rgba(201,169,97,0.7)",
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
});
