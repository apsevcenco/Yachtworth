import { Feather } from "@expo/vector-icons";
import * as WebBrowser from "expo-web-browser";
import React from "react";
import {
  Linking,
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
const MUTED = "rgba(247,243,236,0.62)";
const DIVIDER = "rgba(247,243,236,0.08)";

const PDYE_URL = "https://www.pdyegroup.com";
const PDYE_REGISTER_URL = "https://www.pdyegroup.com";

async function openExternal(url: string) {
  try {
    if (Platform.OS === "web") {
      Linking.openURL(url);
      return;
    }
    await WebBrowser.openBrowserAsync(url, {
      toolbarColor: NAVY,
      controlsColor: GOLD,
    });
  } catch {
    Linking.openURL(url).catch(() => {});
  }
}

export default function PdyeScreen() {
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";

  return (
    <View style={[styles.root, { paddingTop: (isWeb ? 67 : insets.top) + 24 }]}>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 24,
          paddingBottom: insets.bottom + 120,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerBlock}>
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.kicker}>OFF-MARKET</Text>
              <Text style={styles.title}>PDYE Platform</Text>
            </View>
            <View style={styles.lockChip}>
              <Feather name="lock" size={14} color={GOLD} />
            </View>
          </View>
        </View>

        {/* Hero card */}
        <View style={styles.hero}>
          <Text style={styles.heroKicker}>PRIVATE DEAL EXCHANGE</Text>
          <Text style={styles.heroTitle}>
            Off-market yacht transactions.
          </Text>
          <Text style={styles.heroText}>
            Broker-to-broker · NDA protected · Deal Room secured.
          </Text>
          <Pressable
            onPress={() => openExternal(PDYE_URL)}
            accessibilityRole="button"
            accessibilityLabel="Open PDYE Platform in browser"
            style={({ pressed }) => [styles.heroCta, { opacity: pressed ? 0.85 : 1 }]}
          >
            <Text style={styles.heroCtaText}>Open PDYE Platform</Text>
            <Feather name="arrow-up-right" size={18} color={NAVY} />
          </Pressable>
        </View>

        {/* Info cards */}
        <InfoCard
          icon="shield"
          title="NDA Protected"
          text="Dual NDA before any information is shared."
        />
        <InfoCard
          icon="lock"
          title="Deal Room"
          text="Secure environment · All activity logged."
        />
        <InfoCard
          icon="percent"
          title="Success Fee Only"
          text="1% buyer + 1% seller · No subscription."
        />

        {/* Bottom CTA */}
        <View style={styles.bottomCta}>
          <Text style={styles.bottomCtaText}>Not a broker yet?</Text>
          <Pressable
            onPress={() => openExternal(PDYE_REGISTER_URL)}
            accessibilityRole="button"
            accessibilityLabel="Register on PDYE"
            style={({ pressed }) => [styles.registerBtn, { opacity: pressed ? 0.85 : 1 }]}
          >
            <Text style={styles.registerBtnText}>Register on PDYE</Text>
            <Feather name="arrow-up-right" size={16} color={GOLD} />
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

function InfoCard({
  icon,
  title,
  text,
}: {
  icon: React.ComponentProps<typeof Feather>["name"];
  title: string;
  text: string;
}) {
  return (
    <View style={styles.infoCard}>
      <View style={styles.infoIcon}>
        <Feather name={icon} size={18} color={GOLD} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.infoTitle}>{title}</Text>
        <Text style={styles.infoText}>{text}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: NAVY },
  headerBlock: { marginBottom: 22 },
  headerRow: { flexDirection: "row", alignItems: "flex-end" },
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
  lockChip: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(201,169,97,0.14)",
    borderWidth: 1,
    borderColor: "rgba(201,169,97,0.4)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  hero: {
    backgroundColor: NAVY_DEEP,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: GOLD,
    padding: 24,
    marginBottom: 22,
  },
  heroKicker: {
    color: GOLD,
    fontFamily: "Inter_700Bold",
    fontSize: 11,
    letterSpacing: 2.4,
    marginBottom: 12,
  },
  heroTitle: {
    color: IVORY,
    fontFamily: "Gilroy-ExtraBold",
    fontSize: 22,
    lineHeight: 28,
    marginBottom: 8,
  },
  heroText: {
    color: MUTED,
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 20,
  },
  heroCta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: GOLD,
    borderRadius: 12,
    paddingVertical: 14,
  },
  heroCtaText: {
    color: NAVY,
    fontFamily: "Inter_700Bold",
    fontSize: 14,
    letterSpacing: 0.3,
  },
  infoCard: {
    flexDirection: "row",
    gap: 14,
    backgroundColor: NAVY_DEEP,
    borderColor: DIVIDER,
    borderWidth: 1,
    borderRadius: 14,
    padding: 18,
    marginBottom: 10,
  },
  infoIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(201,169,97,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  infoTitle: {
    color: IVORY,
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    marginBottom: 4,
  },
  infoText: { color: MUTED, fontFamily: "Inter_400Regular", fontSize: 13, lineHeight: 18 },
  bottomCta: {
    marginTop: 24,
    backgroundColor: NAVY_ELEV,
    borderRadius: 14,
    padding: 18,
    alignItems: "center",
  },
  bottomCtaText: {
    color: MUTED,
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    marginBottom: 12,
  },
  registerBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: GOLD,
    backgroundColor: "rgba(201,169,97,0.06)",
  },
  registerBtnText: { color: GOLD, fontFamily: "Inter_700Bold", fontSize: 13, letterSpacing: 0.3 },
});
