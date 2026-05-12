import { Feather } from "@expo/vector-icons";
import React from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const NAVY = "#0B1E3F";
const NAVY_ELEV = "#142A52";
const GOLD = "#C9A961";
const IVORY = "#F7F3EC";

export default function HistoryScreen() {
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";

  return (
    <View
      style={[
        styles.root,
        { paddingTop: (isWeb ? 67 : insets.top) + 24, paddingBottom: insets.bottom + 100 },
      ]}
    >
      <View style={styles.headerBlock}>
        <Text style={styles.kicker}>HISTORY</Text>
        <Text style={styles.title}>История оценок</Text>
      </View>

      <View style={styles.empty}>
        <View style={styles.emptyIcon}>
          <Feather name="archive" size={26} color={GOLD} />
        </View>
        <Text style={styles.emptyTitle}>Пока пусто</Text>
        <Text style={styles.emptyText}>
          Здесь появятся ваши оценки яхт. История доступна на тарифе Pro.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: NAVY,
    paddingHorizontal: 24,
  },
  headerBlock: { marginBottom: 40 },
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
  },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: NAVY_ELEV,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },
  emptyTitle: {
    color: IVORY,
    fontFamily: "PlayfairDisplay_500Medium",
    fontSize: 20,
    marginBottom: 8,
  },
  emptyText: {
    color: "rgba(247,243,236,0.6)",
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    maxWidth: 280,
  },
});
