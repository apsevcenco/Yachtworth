import { Feather } from "@expo/vector-icons";
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
        <Text style={styles.title}>Профиль</Text>

        <View style={styles.userCard}>
          <View style={styles.avatar}>
            <Feather name="user" size={22} color={GOLD} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.userName}>Гость</Text>
            <Text style={styles.userMeta}>Free план · 1 оценка / месяц</Text>
          </View>
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.upgrade,
            { opacity: pressed ? 0.9 : 1 },
          ]}
        >
          <View style={{ flex: 1 }}>
            <Text style={styles.upgradeTitle}>Перейти на Pro</Text>
            <Text style={styles.upgradeSubtitle}>
              Безлимит оценок, история и PDF · €49,99/мес
            </Text>
          </View>
          <Feather name="arrow-up-right" size={20} color={NAVY} />
        </Pressable>

        <Text style={styles.sectionTitle}>Настройки</Text>

        <Row icon="user" label="Аккаунт" />
        <Row icon="credit-card" label="Подписка" />
        <Row icon="bell" label="Уведомления" />
        <Row icon="shield" label="Приватность" />
        <Row icon="help-circle" label="Поддержка" />

        <View style={styles.poweredBlock}>
          <Text style={styles.poweredKicker}>POWERED BY</Text>
          <Text style={styles.poweredTitle}>PDYE</Text>
          <Text style={styles.poweredText}>
            Yachtworth создан командой PDYE — ведущей платформы оценки и
            брокерского сопровождения суперъяхт.
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
}: {
  icon: React.ComponentProps<typeof Feather>["name"];
  label: string;
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.row,
        { opacity: pressed ? 0.7 : 1 },
      ]}
    >
      <Feather name={icon} size={18} color={GOLD} style={{ width: 26 }} />
      <Text style={styles.rowLabel}>{label}</Text>
      <Feather name="chevron-right" size={18} color="rgba(247,243,236,0.4)" />
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
    fontFamily: "PlayfairDisplay_600SemiBold",
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
    fontFamily: "PlayfairDisplay_500Medium",
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
    fontFamily: "PlayfairDisplay_700Bold",
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
