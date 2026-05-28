import { Feather } from "@expo/vector-icons";
import type { Yacht } from "@workspace/api-client-react";
import { Image } from "expo-image";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import {
  calcCompleteness,
  nextSuggestedField,
} from "../lib/yachtCompleteness";
import { CompletenessBar } from "./CompletenessBar";

const NAVY_ELEV = "#142A52";
const NAVY_DEEP = "#081633";
const GOLD = "#C9A961";
const IVORY = "#F7F3EC";
const MUTED = "rgba(247,243,236,0.6)";
const DIVIDER = "rgba(247,243,236,0.08)";

const TYPE_LABELS: Record<string, string> = {
  motor_yacht: "Motor Yacht",
  sailing_yacht: "Sailing Yacht",
  catamaran: "Catamaran",
  superyacht: "Superyacht",
};

function yachtTitle(y: Yacht): string {
  return y.name || [y.brand, y.model].filter(Boolean).join(" ") || "Your yacht";
}

function yachtSubtitle(
  y: Yacht,
  units: "metric" | "imperial",
): string {
  const parts: string[] = [];
  if (y.brand) parts.push(y.brand);
  if (y.length_meters != null) {
    parts.push(
      units === "metric"
        ? `${y.length_meters.toFixed(0)}m`
        : `${Math.round(y.length_meters * 3.28084)}ft`,
    );
  }
  if (y.year_built) parts.push(String(y.year_built));
  return parts.join(" · ");
}

export type YachtCardAction = {
  key: "valuations" | "costs" | "roi" | "charters" | "passport";
  label: string;
  icon: React.ComponentProps<typeof Feather>["name"];
  soon?: boolean;
};

export function YachtCard({
  yacht,
  units,
  onPress,
  onEdit,
  onAction,
}: {
  yacht: Yacht;
  units: "metric" | "imperial";
  onPress: () => void;
  onEdit: () => void;
  onAction: (key: YachtCardAction["key"]) => void;
}) {
  const pct = calcCompleteness(yacht);
  const next = nextSuggestedField(yacht);
  const hint = next ? `Add ${next.label} to unlock more.` : "Profile complete.";

  const flag = yacht.flag || null;
  const port = yacht.home_port || yacht.marina_location || null;

  const actions: YachtCardAction[] = [
    { key: "valuations", label: "Valuations", icon: "trending-up" },
    { key: "costs", label: "Costs", icon: "bar-chart-2" },
    { key: "roi", label: "Charter ROI", icon: "dollar-sign" },
    { key: "charters", label: "Charters", icon: "calendar" },
  ];

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Open ${yachtTitle(yacht)} profile`}
      style={({ pressed }) => [styles.card, { opacity: pressed ? 0.92 : 1 }]}
    >
      {/* Photo / icon */}
      {yacht.cover_photo_url || yacht.photo_url ? (
        <Image
          source={{ uri: (yacht.cover_photo_url ?? yacht.photo_url)! }}
          style={styles.photo}
          contentFit="cover"
          transition={150}
        />
      ) : (
        <View style={styles.photoFallback}>
          <Feather name="anchor" size={36} color={GOLD} />
        </View>
      )}

      {/* Title row */}
      <View style={styles.titleRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.name} numberOfLines={1}>
            {yachtTitle(yacht)}
          </Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            {yachtSubtitle(yacht, units) || "—"}
          </Text>
        </View>
        <Pressable
          onPress={(e) => {
            e.stopPropagation();
            onEdit();
          }}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Edit yacht"
          style={({ pressed }) => [
            styles.editBtn,
            { opacity: pressed ? 0.6 : 1 },
          ]}
        >
          <Feather name="edit-2" size={14} color={GOLD} />
          <Text style={styles.editText}>Edit</Text>
        </Pressable>
      </View>

      {/* Flag · Port */}
      {flag || port ? (
        <View style={styles.locRow}>
          {flag ? (
            <View style={styles.locItem}>
              <Feather name="flag" size={12} color={GOLD} />
              <Text style={styles.locText}>{flag}</Text>
            </View>
          ) : null}
          {port ? (
            <View style={styles.locItem}>
              <Feather name="map-pin" size={12} color={GOLD} />
              <Text style={styles.locText}>{port}</Text>
            </View>
          ) : null}
        </View>
      ) : null}

      <View style={styles.divider} />

      {/* Completeness */}
      <CompletenessBar pct={pct} hint={hint} />

      <View style={styles.divider} />

      {/* Action grid 2×2 */}
      <View style={styles.actionGrid}>
        {actions.map((a) => (
          <Pressable
            key={a.key}
            onPress={(e) => {
              e.stopPropagation();
              onAction(a.key);
            }}
            accessibilityRole="button"
            accessibilityLabel={a.label}
            style={({ pressed }) => [
              styles.actionTile,
              a.soon && styles.actionTileSoon,
              { opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Feather
              name={a.icon}
              size={16}
              color={a.soon ? MUTED : GOLD}
            />
            <Text
              style={[
                styles.actionLabel,
                a.soon && { color: MUTED },
              ]}
            >
              {a.label}
            </Text>
            {a.soon ? (
              <View style={styles.soonChip}>
                <Text style={styles.soonChipText}>SOON</Text>
              </View>
            ) : null}
          </Pressable>
        ))}
      </View>

      {yacht.is_archived ? (
        <View style={styles.archivedBadge}>
          <Feather name="archive" size={11} color={MUTED} />
          <Text style={styles.archivedText}>Archived</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

export { yachtTitle, yachtSubtitle, TYPE_LABELS };

const styles = StyleSheet.create({
  card: {
    backgroundColor: NAVY_DEEP,
    borderColor: DIVIDER,
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    gap: 14,
  },
  photo: {
    width: "100%",
    height: 160,
    borderRadius: 12,
    backgroundColor: NAVY_ELEV,
  },
  photoFallback: {
    width: "100%",
    height: 100,
    borderRadius: 12,
    backgroundColor: NAVY_ELEV,
    alignItems: "center",
    justifyContent: "center",
  },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  name: {
    color: IVORY,
    fontFamily: "Gilroy-ExtraBold",
    fontSize: 22,
    letterSpacing: -0.3,
    marginBottom: 2,
  },
  subtitle: {
    color: MUTED,
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    letterSpacing: 0.3,
  },
  editBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 99,
    borderWidth: 1,
    borderColor: GOLD,
    backgroundColor: "rgba(201,169,97,0.08)",
  },
  editText: { color: GOLD, fontFamily: "Inter_600SemiBold", fontSize: 11 },
  locRow: { flexDirection: "row", gap: 14, flexWrap: "wrap" },
  locItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  locText: { color: IVORY, fontFamily: "Inter_500Medium", fontSize: 12 },
  divider: { height: 1, backgroundColor: DIVIDER },
  actionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  actionTile: {
    width: "48%",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: NAVY_ELEV,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: DIVIDER,
  },
  actionTileSoon: { opacity: 0.85 },
  actionLabel: {
    flex: 1,
    color: GOLD,
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
  },
  soonChip: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: "rgba(247,243,236,0.08)",
  },
  soonChipText: {
    color: MUTED,
    fontFamily: "Inter_700Bold",
    fontSize: 8,
    letterSpacing: 0.8,
  },
  archivedBadge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 99,
    backgroundColor: NAVY_ELEV,
    borderWidth: 1,
    borderColor: DIVIDER,
  },
  archivedText: {
    color: MUTED,
    fontFamily: "Inter_600SemiBold",
    fontSize: 10,
    letterSpacing: 0.6,
  },
});
