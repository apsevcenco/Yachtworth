import React from "react";
import { StyleSheet, Text, View } from "react-native";

const GOLD = "#C9A961";
const IVORY = "#F7F3EC";
const MUTED = "rgba(247,243,236,0.6)";
const TRACK = "rgba(247,243,236,0.10)";

export function CompletenessBar({
  pct,
  hint,
  compact,
}: {
  pct: number;
  hint?: string | null;
  compact?: boolean;
}) {
  const clamped = Math.max(0, Math.min(100, Math.round(pct)));
  return (
    <View style={styles.wrap}>
      <View style={styles.headerRow}>
        <Text style={styles.label}>PROFILE COMPLETENESS</Text>
        <Text style={styles.pct}>{clamped}%</Text>
      </View>
      <View style={styles.track}>
        <View
          style={[
            styles.fill,
            { width: `${clamped}%` },
            clamped >= 100 ? styles.fillFull : null,
          ]}
        />
      </View>
      {!compact && hint ? (
        <Text style={styles.hint} numberOfLines={2}>
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  label: {
    color: MUTED,
    fontFamily: "Inter_500Medium",
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  pct: {
    color: GOLD,
    fontFamily: "Inter_700Bold",
    fontSize: 13,
  },
  track: {
    height: 6,
    borderRadius: 3,
    backgroundColor: TRACK,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    backgroundColor: GOLD,
    borderRadius: 3,
  },
  fillFull: { backgroundColor: GOLD },
  hint: {
    color: IVORY,
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    fontStyle: "italic",
    opacity: 0.85,
  },
});
