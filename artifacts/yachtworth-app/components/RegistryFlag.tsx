import React from "react";
import { Image, Platform, StyleSheet, Text, View, type ImageSourcePropType, type StyleProp, type ViewStyle } from "react-native";

import { FLAG_ASSETS, resolveFlagAsset, type FlagAssetSize } from "@/lib/flagAssets";

const SIZE: Record<FlagAssetSize, { width: number; height: number }> = {
  xs: { width: 20, height: 15 },
  sm: { width: 28, height: 21 },
  md: { width: 48, height: 36 },
  lg: { width: 96, height: 72 },
  hero: { width: 180, height: 135 },
};

export function RegistryFlag({
  registry,
  code,
  name,
  size = "sm",
  decorative = false,
  style,
}: {
  registry?: Parameters<typeof resolveFlagAsset>[0];
  code?: string | null;
  name?: string | null;
  size?: FlagAssetSize;
  variant?: "flat";
  badge?: string | null;
  decorative?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const resolved = resolveFlagAsset(registry ?? { flag_code: code, flag_name: name });
  const dimensions = SIZE[size];
  const source = resolved?.code ? (FLAG_ASSETS[resolved.code as keyof typeof FLAG_ASSETS] as ImageSourcePropType | undefined) : undefined;

  if (!source) {
    if (__DEV__ && resolved?.code) {
      console.warn(`Missing local flag asset: ${resolved.code}`);
    }
    return (
      <View
        accessible={!decorative}
        accessibilityLabel={decorative ? undefined : "Flag image unavailable"}
        style={[styles.flag, styles.fallback, dimensions, style]}
      >
        <Text style={styles.fallbackText}>--</Text>
      </View>
    );
  }
  const altText = resolved?.altText ?? "Flag image unavailable";

  return (
    <View style={[styles.flag, dimensions, style]}>
      <Image
        source={source}
        resizeMode="contain"
        accessibilityIgnoresInvertColors
        accessibilityLabel={decorative ? undefined : altText}
        accessible={!decorative}
        style={styles.image}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flag: {
    overflow: "hidden",
    borderRadius: 3,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(247,243,236,0.35)",
    backgroundColor: "#F7F3EC",
    alignItems: "center",
    justifyContent: "center",
  },
  image: {
    width: "100%",
    height: "100%",
    ...(Platform.OS === "web" ? ({ objectFit: "contain" } as Record<string, string>) : null),
  },
  fallback: {
    backgroundColor: "rgba(247,243,236,0.12)",
    borderStyle: "dashed",
  },
  fallbackText: {
    color: "rgba(247,243,236,0.58)",
    fontFamily: "Inter_800ExtraBold",
    fontSize: 9,
  },
});
