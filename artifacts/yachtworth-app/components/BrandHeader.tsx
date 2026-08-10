import { BlurView } from "expo-blur";
import React from "react";
import { Image, Platform, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors, useTheme } from "@/hooks/useColors";

export function BrandHeader() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { isAcid } = useTheme();
  const isWeb = Platform.OS === "web";
  const isIOS = Platform.OS === "ios";
  const topPad = isWeb ? 12 : insets.top + 6;
  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.header,
        {
          paddingTop: topPad,
          height: topPad + 44,
          backgroundColor: colors.background,
          borderBottomColor: isAcid ? colors.accent : colors.border,
        },
        isAcid ? styles.acidHeader : null,
      ]}
    >
      {isIOS ? (
        <BlurView
          intensity={80}
          tint="dark"
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
      ) : null}
      <Image
        source={require("../assets/images/logo-wordmark.png")}
        style={[styles.logo, isAcid ? styles.acidLogo : null]}
        resizeMode="contain"
        accessibilityLabel="Yachtworth"
        accessible
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    borderBottomWidth: StyleSheet.hairlineWidth,
    justifyContent: "center",
    zIndex: 50,
  },
  logo: { width: 194, height: 30 },
  acidHeader: {
    borderBottomWidth: 1,
    shadowColor: "#00F5FF",
    shadowOpacity: 0.45,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
  },
  acidLogo: {
    tintColor: "#F6FFF4",
  },
});
