import { BlurView } from "expo-blur";
import React from "react";
import { Image, Platform, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const NAVY = "#0B1E3F";
const DIVIDER = "rgba(247,243,236,0.08)";

export function BrandHeader() {
  const insets = useSafeAreaInsets();
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
          backgroundColor: isIOS ? "transparent" : NAVY,
        },
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
        style={styles.logo}
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
    borderBottomColor: DIVIDER,
    justifyContent: "center",
    zIndex: 50,
  },
  logo: { width: 194, height: 30 },
});
