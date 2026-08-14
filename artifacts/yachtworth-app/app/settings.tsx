import { Feather } from "@expo/vector-icons";
import { useAuth } from "@clerk/expo";
import Constants from "expo-constants";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import React from "react";
import {
  Alert,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useUnits } from "../hooks/useUnits";
import { APP_THEMES, useTheme } from "../hooks/useColors";

const NAVY = "#0B1E3F";
const NAVY_ELEV = "#142A52";
const NAVY_DEEP = "#081633";
const GOLD = "#C9A961";
const IVORY = "#C8FF00";
const MUTED = "rgba(247,243,236,0.6)";
const FAINT = "rgba(247,243,236,0.4)";
const DIVIDER = "rgba(247,243,236,0.08)";
const DANGER = "#E87B7B";

const PDYE_URL = "https://www.pdyegroup.com";

const APP_VERSION =
  (Constants.expoConfig?.version as string | undefined) ?? "1.0.0";

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

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const router = useRouter();
  const { isSignedIn, signOut } = useAuth();
  const { units, setUnits, loaded: unitsLoaded } = useUnits();
  const { colors, themeId, setThemeId, isAcid, isMediterranean } = useTheme();

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.headerBar,
          { paddingTop: (isWeb ? 12 : insets.top) + 56 },
          { borderBottomColor: colors.border },
        ]}
      >
        <Pressable
          onPress={() => {
            if (router.canGoBack()) router.back();
            else router.replace("/profile");
          }}
          hitSlop={12}
          style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
        >
          <Feather name="chevron-left" size={26} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }, isAcid && styles.acidDisplayText]}>Settings</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingBottom: insets.bottom + 60,
          paddingHorizontal: 24,
          paddingTop: 12,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* UNITS */}
        <Text style={[styles.sectionTitle, { color: colors.primary }]}>Units</Text>
        <View style={[styles.card, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.rowLabel, { color: colors.foreground }]}>Measurement system</Text>
            <Text style={[styles.rowSub, { color: colors.mutedForeground }]}>
              Used everywhere — form inputs, history, comparables, PDF.
            </Text>
          </View>
        </View>
        <View style={[styles.segment, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
          <Pressable
            disabled={!unitsLoaded}
            onPress={() => setUnits("metric")}
            style={[
              styles.segmentItem,
              units === "metric" && { backgroundColor: colors.glow ?? colors.muted, borderColor: colors.primary },
            ]}
          >
            <Text
              style={[
                styles.segmentText,
                { color: colors.mutedForeground },
                units === "metric" && { color: colors.primary },
              ]}
            >
              Metric  ·  m, t
            </Text>
          </Pressable>
          <Pressable
            disabled={!unitsLoaded}
            onPress={() => setUnits("imperial")}
            style={[
              styles.segmentItem,
              units === "imperial" && { backgroundColor: colors.glow ?? colors.muted, borderColor: colors.primary },
            ]}
          >
            <Text
              style={[
                styles.segmentText,
                { color: colors.mutedForeground },
                units === "imperial" && { color: colors.primary },
              ]}
            >
              Imperial  ·  ft, lt
            </Text>
          </Pressable>
        </View>

        {/* APPEARANCE */}
        <Text style={[styles.sectionTitle, { color: colors.primary }]}>Appearance</Text>
        <View style={[styles.card, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
          <Feather name={isAcid ? "zap" : isMediterranean ? "sun" : "moon"} size={18} color={colors.primary} style={{ width: 26 }} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.rowLabel, { color: colors.foreground }]}>Theme</Text>
            <Text style={[styles.rowSub, { color: colors.mutedForeground }]}>
              Choose the visual character of Yachtworth. PDF styling stays professional.
            </Text>
          </View>
        </View>
        <View style={styles.themeList}>
          {APP_THEMES.map((theme) => {
            const active = theme.id === themeId;
            return (
              <Pressable
                key={theme.id}
                onPress={() => setThemeId(theme.id)}
                style={({ pressed }) => [
                  styles.themeOption,
                  { backgroundColor: colors.secondary, borderColor: active ? colors.primary : colors.border },
                  active && { backgroundColor: colors.glow ?? (isAcid ? "rgba(182,255,0,0.16)" : "rgba(201,169,97,0.12)") },
                  pressed && { opacity: 0.82 },
                ]}
              >
                <View
                  style={[
                    styles.themeSwatch,
                    theme.id === "acid" ? styles.acidSwatch : theme.id === "mediterranean" ? styles.mediterraneanSwatch : styles.classicSwatch,
                  ]}
                />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.rowLabel, { color: active ? colors.primary : colors.foreground }, isAcid && active && styles.acidOptionTitle]}>
                    {theme.label}
                  </Text>
                  <Text style={[styles.rowSub, { color: colors.mutedForeground }]}>{theme.description}</Text>
                </View>
                {active ? <Feather name="check" size={18} color={colors.primary} /> : null}
              </Pressable>
            );
          })}
        </View>

        {/* ABOUT */}
        <Text style={[styles.sectionTitle, { color: colors.primary }]}>About</Text>
        <View style={[styles.cardGroup, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
          <View style={[styles.row, { borderBottomColor: colors.border }]}>
            <Feather name="info" size={18} color={colors.primary} style={{ width: 26 }} />
            <Text style={[styles.rowLabel, { color: colors.foreground }]}>App version</Text>
            <Text style={[styles.rowValue, { color: colors.mutedForeground }]}>{APP_VERSION}</Text>
          </View>
          <Pressable
            onPress={() =>
              Alert.alert(
                "Privacy Policy",
                "The full Privacy Policy will be published before the App Store launch.",
              )
            }
            style={({ pressed }) => [styles.row, { borderBottomColor: colors.border, opacity: pressed ? 0.7 : 1 }]}
          >
            <Feather name="shield" size={18} color={colors.primary} style={{ width: 26 }} />
            <Text style={[styles.rowLabel, { color: colors.foreground }]}>Privacy Policy</Text>
            <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
          </Pressable>
          <Pressable
            onPress={() =>
              Alert.alert(
                "Terms of Service",
                "Estimates produced by Yachtworth are indicative market figures, not certified appraisals. Full Terms will be published before launch.",
              )
            }
            style={({ pressed }) => [
              styles.row,
              styles.rowLast,
              { opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Feather
              name="file-text"
              size={18}
              color={colors.primary}
              style={{ width: 26 }}
            />
            <Text style={[styles.rowLabel, { color: colors.foreground }]}>Terms of Service</Text>
            <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
          </Pressable>
        </View>

        {/* POWERED BY PDYE */}
        <Pressable
          onPress={() => openExternal(PDYE_URL)}
          style={({ pressed }) => [
            styles.poweredBlock,
            { backgroundColor: colors.card, borderColor: colors.border },
            { opacity: pressed ? 0.9 : 1 },
          ]}
        >
          <Text style={[styles.poweredKicker, { color: colors.primary }]}>POWERED BY</Text>
          <Text style={[styles.poweredTitle, { color: colors.foreground }, isAcid && styles.acidDisplayText]}>PDYE</Text>
          <Text style={[styles.poweredText, { color: colors.mutedForeground }]}>
            Built by the team behind PDYE — yacht brokerage and superyacht
            market intelligence. Tap to visit pdyegroup.com.
          </Text>
          <View style={styles.poweredCta}>
            <Text style={[styles.poweredCtaText, { color: colors.primary }]}>Visit PDYE</Text>
            <Feather name="arrow-up-right" size={16} color={colors.primary} />
          </View>
        </Pressable>

        {/* SIGN OUT */}
        {isSignedIn && (
          <Pressable
            onPress={() => signOut()}
            style={({ pressed }) => [
              styles.signOut,
              { borderColor: colors.destructive, backgroundColor: "rgba(255,56,108,0.10)" },
              { opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <Feather name="log-out" size={18} color={DANGER} />
            <Text style={styles.signOutText}>Sign out</Text>
          </Pressable>
        )}

        <Text style={styles.footer}>Yachtworth · v{APP_VERSION}</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: NAVY },
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: DIVIDER,
  },
  headerTitle: {
    color: IVORY,
    fontFamily: "Gilroy-ExtraBold",
    fontSize: 18,
    letterSpacing: 0.2,
  },
  sectionTitle: {
    color: GOLD,
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    letterSpacing: 2,
    textTransform: "uppercase",
    marginTop: 24,
    marginBottom: 10,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: NAVY_DEEP,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: DIVIDER,
    padding: 16,
  },
  cardGroup: {
    backgroundColor: NAVY_DEEP,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: DIVIDER,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: DIVIDER,
  },
  rowLast: { borderBottomWidth: 0 },
  rowLabel: {
    flex: 1,
    color: IVORY,
    fontFamily: "Inter_500Medium",
    fontSize: 15,
  },
  rowSub: {
    color: MUTED,
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    marginTop: 4,
    lineHeight: 17,
  },
  rowValue: {
    color: MUTED,
    fontFamily: "Inter_400Regular",
    fontSize: 14,
  },
  segment: {
    flexDirection: "row",
    backgroundColor: NAVY_DEEP,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: DIVIDER,
    padding: 4,
    marginTop: 10,
  },
  segmentItem: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 9,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  segmentItemActive: {
    backgroundColor: "rgba(201,169,97,0.12)",
    borderWidth: 1.5,
    borderColor: GOLD,
  },
  segmentText: {
    color: MUTED,
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    letterSpacing: 0.3,
  },
  segmentTextActive: { color: GOLD, fontFamily: "Inter_700Bold" },
  themeList: {
    gap: 10,
    marginTop: 10,
  },
  themeOption: {
    minHeight: 74,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  themeSwatch: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: "rgba(247,243,236,0.28)",
  },
  classicSwatch: {
    backgroundColor: GOLD,
  },
  acidSwatch: {
    backgroundColor: "#B6FF00",
    borderColor: "#FF4FD8",
    shadowColor: "#FF4FD8",
    shadowOpacity: 0.8,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
  },
  mediterraneanSwatch: {
    backgroundColor: "#F4FBFA",
    borderColor: "#0B8F9C",
    shadowColor: "#0B8F9C",
    shadowOpacity: 0.26,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
  acidOptionTitle: {
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  acidDisplayText: {
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  poweredBlock: {
    marginTop: 32,
    backgroundColor: NAVY_ELEV,
    borderRadius: 14,
    padding: 22,
    borderWidth: 1,
    borderColor: "rgba(201,169,97,0.25)",
  },
  poweredKicker: {
    color: GOLD,
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    letterSpacing: 2,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  poweredTitle: {
    color: IVORY,
    fontFamily: "Gilroy-ExtraBold",
    fontSize: 26,
    letterSpacing: 2,
    marginBottom: 10,
  },
  poweredText: {
    color: MUTED,
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 14,
  },
  poweredCta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  poweredCtaText: {
    color: GOLD,
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    letterSpacing: 0.3,
  },
  signOut: {
    marginTop: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(232,123,123,0.35)",
    backgroundColor: "rgba(232,123,123,0.06)",
  },
  signOutText: {
    color: DANGER,
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
  },
  footer: {
    marginTop: 28,
    color: FAINT,
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    textAlign: "center",
  },
});
