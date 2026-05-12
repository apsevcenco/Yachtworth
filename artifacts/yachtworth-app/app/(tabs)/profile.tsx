import { Feather } from "@expo/vector-icons";
import { useAuth, useUser } from "@clerk/expo";
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

const NAVY = "#0B1E3F";
const NAVY_ELEV = "#142A52";
const GOLD = "#C9A961";
const IVORY = "#F7F3EC";

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const router = useRouter();
  const { isSignedIn, signOut } = useAuth();
  const { user } = useUser();

  const displayName =
    user?.fullName ||
    user?.firstName ||
    user?.primaryEmailAddress?.emailAddress?.split("@")[0] ||
    "Guest";
  const meta = isSignedIn
    ? user?.primaryEmailAddress?.emailAddress || "Free plan · 1 estimate / month"
    : "Sign in to save your estimates";

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: (isWeb ? 67 : insets.top) + 24,
          paddingBottom: insets.bottom + 120,
          paddingHorizontal: 24,
        }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.kicker}>ACCOUNT</Text>
        <Text style={styles.title}>Profile</Text>

        <View style={styles.userCard}>
          <View style={styles.avatar}>
            <Feather name="user" size={22} color={GOLD} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.userName}>{displayName}</Text>
            <Text style={styles.userMeta}>{meta}</Text>
          </View>
        </View>

        {!isSignedIn ? (
          <Pressable
            onPress={() => router.push("/sign-in")}
            style={({ pressed }) => [
              styles.primaryAuth,
              { opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <Text style={styles.primaryAuthText}>Sign in</Text>
            <Feather name="arrow-up-right" size={20} color={GOLD} />
          </Pressable>
        ) : (
          <Pressable
            style={({ pressed }) => [
              styles.upgrade,
              { opacity: pressed ? 0.9 : 1 },
            ]}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.upgradeTitle}>Upgrade to Pro</Text>
              <Text style={styles.upgradeSubtitle}>
                Unlimited estimates, history and PDF · €49.99/mo
              </Text>
            </View>
            <Feather name="arrow-up-right" size={20} color={NAVY} />
          </Pressable>
        )}

        <Text style={styles.sectionTitle}>Settings</Text>

        <Row icon="user" label="Account" />
        <Row icon="credit-card" label="Subscription" />
        <Row icon="bell" label="Notifications" />
        <Row icon="shield" label="Privacy" />
        <Row icon="help-circle" label="Support" />
        {isSignedIn && (
          <Row
            icon="log-out"
            label="Sign out"
            onPress={() => signOut()}
            danger
          />
        )}

        <View style={styles.poweredBlock}>
          <Text style={styles.poweredKicker}>POWERED BY</Text>
          <Text style={styles.poweredTitle}>PDYE</Text>
          <Text style={styles.poweredText}>
            Yachtworth is built by the team behind PDYE — a leading platform
            for superyacht market intelligence and brokerage.
          </Text>
        </View>

        <Text style={styles.version}>Yachtworth · v1.0.0</Text>
      </ScrollView>
    </View>
  );
}

function Row({
  icon,
  label,
  onPress,
  danger,
}: {
  icon: React.ComponentProps<typeof Feather>["name"];
  label: string;
  onPress?: () => void;
  danger?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        { opacity: pressed ? 0.7 : 1 },
      ]}
    >
      <Feather
        name={icon}
        size={18}
        color={danger ? "#E87B7B" : GOLD}
        style={{ width: 26 }}
      />
      <Text style={[styles.rowLabel, danger && { color: "#E87B7B" }]}>
        {label}
      </Text>
      <Feather
        name="chevron-right"
        size={18}
        color="rgba(247,243,236,0.4)"
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: NAVY },
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
    marginBottom: 28,
  },
  userCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: NAVY_ELEV,
    borderRadius: 14,
    padding: 18,
    marginBottom: 14,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(201,169,97,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  userName: {
    color: IVORY,
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
  },
  userMeta: {
    color: "rgba(247,243,236,0.6)",
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    marginTop: 2,
  },
  primaryAuth: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 14,
    paddingVertical: 18,
    paddingHorizontal: 22,
    borderWidth: 1,
    borderColor: GOLD,
    backgroundColor: "rgba(201,169,97,0.06)",
    marginBottom: 32,
  },
  primaryAuthText: {
    color: GOLD,
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
    letterSpacing: 0.2,
  },
  upgrade: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: GOLD,
    borderRadius: 14,
    padding: 18,
    marginBottom: 32,
  },
  upgradeTitle: {
    color: NAVY,
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
  },
  upgradeSubtitle: {
    color: "rgba(11,30,63,0.75)",
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    marginTop: 3,
  },
  sectionTitle: {
    color: IVORY,
    fontFamily: "Gilroy-Regular",
    fontSize: 18,
    marginBottom: 10,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(247,243,236,0.08)",
  },
  rowLabel: {
    flex: 1,
    color: IVORY,
    fontFamily: "Inter_500Medium",
    fontSize: 15,
  },
  poweredBlock: {
    marginTop: 36,
    backgroundColor: NAVY_ELEV,
    borderRadius: 14,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(201,169,97,0.2)",
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
    fontSize: 24,
    letterSpacing: 2,
    marginBottom: 8,
  },
  poweredText: {
    color: "rgba(247,243,236,0.65)",
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    lineHeight: 20,
  },
  version: {
    color: "rgba(247,243,236,0.35)",
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    textAlign: "center",
    marginTop: 28,
  },
});
