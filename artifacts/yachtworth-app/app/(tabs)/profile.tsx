import { Feather } from "@expo/vector-icons";
import { useAuth, useUser } from "@clerk/expo";
import { useRouter } from "expo-router";
import React from "react";
import {
  Image,
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
const DANGER = "#E87B7B";

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("") || "Y";
}

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
  const email = user?.primaryEmailAddress?.emailAddress;
  const planLabel = "Free plan · 1 estimate / month";

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: (isWeb ? 67 : insets.top) + 70,
          paddingBottom: insets.bottom + 120,
          paddingHorizontal: 24,
        }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.kicker}>ACCOUNT</Text>
        <Text style={styles.title}>Profile</Text>

        <View style={styles.userCard}>
          <View style={styles.avatar}>
            {isSignedIn && user?.imageUrl ? (
              <Image source={{ uri: user.imageUrl }} style={styles.avatarImg} />
            ) : isSignedIn ? (
              <Text style={styles.avatarInitials}>
                {getInitials(displayName)}
              </Text>
            ) : (
              <Feather name="user" size={22} color={GOLD} />
            )}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.userName}>{displayName}</Text>
            {isSignedIn && email ? (
              <Text style={styles.userMeta}>{email}</Text>
            ) : (
              <Text style={styles.userMeta}>
                Sign in to save your estimates
              </Text>
            )}
            {isSignedIn && (
              <View style={styles.planChip}>
                <Text style={styles.planChipText}>{planLabel}</Text>
              </View>
            )}
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
            <Feather name="arrow-up-right" size={20} color={GOLD} />
          </Pressable>
        )}

        <View style={styles.menuGroup}>
          {isSignedIn && (
            <Row
              icon="clock"
              label="My valuations history"
              onPress={() => router.push("/history")}
            />
          )}
          {isSignedIn && (
            <Row
              icon="file-text"
              label="My listings"
              onPress={() => router.push("/listing/my-listings")}
            />
          )}
          {isSignedIn && (
            <Row
              icon="file"
              label="My proposals"
              onPress={() => router.push("/yacht-proposal/my-proposals")}
            />
          )}
          <Row
            icon="settings"
            label="Settings"
            onPress={() => router.push("/settings")}
            last={!isSignedIn}
          />
          {isSignedIn && (
            <Row
              icon="log-out"
              label="Sign out"
              onPress={() => signOut()}
              danger
              last
            />
          )}
        </View>

        <Pressable
          onPress={() => router.push("/settings")}
          style={({ pressed }) => [
            styles.poweredBlock,
            { opacity: pressed ? 0.9 : 1 },
          ]}
        >
          <Text style={styles.poweredKicker}>POWERED BY</Text>
          <Text style={styles.poweredTitle}>PDYE</Text>
          <Text style={styles.poweredText}>
            Yachtworth is built by the team behind PDYE — yacht brokerage and
            superyacht market intelligence.
          </Text>
        </Pressable>

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
  last,
}: {
  icon: React.ComponentProps<typeof Feather>["name"];
  label: string;
  onPress?: () => void;
  danger?: boolean;
  last?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        last && styles.rowLast,
        { opacity: pressed ? 0.7 : 1 },
      ]}
    >
      <Feather
        name={icon}
        size={18}
        color={danger ? DANGER : GOLD}
        style={{ width: 26 }}
      />
      <Text style={[styles.rowLabel, danger && { color: DANGER }]}>
        {label}
      </Text>
      <Feather name="chevron-right" size={18} color={FAINT} />
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
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "rgba(201,169,97,0.12)",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImg: { width: "100%", height: "100%" },
  avatarInitials: {
    color: GOLD,
    fontFamily: "Gilroy-ExtraBold",
    fontSize: 18,
    letterSpacing: 0.5,
  },
  userName: {
    color: IVORY,
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
  },
  userMeta: {
    color: MUTED,
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    marginTop: 2,
  },
  planChip: {
    alignSelf: "flex-start",
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 99,
    backgroundColor: "rgba(201,169,97,0.14)",
    borderWidth: 1,
    borderColor: "rgba(201,169,97,0.3)",
  },
  planChipText: {
    color: GOLD,
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    letterSpacing: 0.4,
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
    marginBottom: 24,
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
    backgroundColor: "rgba(201,169,97,0.10)",
    borderWidth: 1.5,
    borderColor: GOLD,
    borderRadius: 14,
    padding: 18,
    marginBottom: 24,
  },
  upgradeTitle: {
    color: GOLD,
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
  },
  upgradeSubtitle: {
    color: "rgba(201,169,97,0.7)",
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    marginTop: 3,
  },
  menuGroup: {
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
  poweredBlock: {
    marginTop: 28,
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
    color: MUTED,
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    lineHeight: 20,
  },
  version: {
    color: FAINT,
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    textAlign: "center",
    marginTop: 28,
  },
});
