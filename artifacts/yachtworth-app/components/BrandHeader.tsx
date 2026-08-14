import { BlurView } from "expo-blur";
import React from "react";
import { Image, Platform, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors, useTheme } from "@/hooks/useColors";

export function BrandHeader() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { isAcid, isMediterranean } = useTheme();
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
          borderBottomColor: isAcid || isMediterranean ? colors.accent : colors.border,
        },
        isAcid ? styles.acidHeader : null,
        isMediterranean ? styles.mediterraneanHeader : null,
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
        style={[styles.logo, isAcid ? styles.acidLogo : null, isMediterranean ? styles.mediterraneanLogo : null]}
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
    shadowColor: "#FF4FD8",
    shadowOpacity: 0.45,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
  },
  mediterraneanHeader: {
    borderBottomWidth: 1,
    shadowColor: "#0B8F9C",
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
  },
  acidLogo: {
    tintColor: "#F6FFF4",
  },
  mediterraneanLogo: {
    tintColor: "#12323A",
  },
});
