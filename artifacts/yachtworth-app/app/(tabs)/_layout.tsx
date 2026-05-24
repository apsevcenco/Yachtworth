import { BlurView } from "expo-blur";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Tabs } from "expo-router";
import { Icon, Label, NativeTabs } from "expo-router/unstable-native-tabs";
import { SymbolView } from "expo-symbols";
import { Feather } from "@expo/vector-icons";
import React from "react";
import { Image, Platform, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

const NAVY = "#0B1E3F";
const DIVIDER = "rgba(247,243,236,0.08)";

function BrandHeader() {
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const topPad = isWeb ? 12 : insets.top + 6;
  return (
    <View
      pointerEvents="box-none"
      style={[styles.header, { paddingTop: topPad, height: topPad + 44 }]}
    >
      <Image
        source={require("../../assets/images/logo-wordmark.png")}
        style={styles.logo}
        resizeMode="contain"
        accessibilityLabel="Yachtworth"
        accessible
      />
    </View>
  );
}

function NativeTabLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <Icon sf={{ default: "house", selected: "house.fill" }} />
        <Label>Home</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="tools">
        <Icon sf={{ default: "wrench.and.screwdriver", selected: "wrench.and.screwdriver.fill" }} />
        <Label>Tools</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="my-yacht">
        <Icon sf={{ default: "sailboat", selected: "sailboat.fill" }} />
        <Label>My Yacht</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="pdye">
        <Icon sf={{ default: "lock.shield", selected: "lock.shield.fill" }} />
        <Label>PDYE</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="profile">
        <Icon sf={{ default: "person", selected: "person.fill" }} />
        <Label>Profile</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

function ClassicTabLayout() {
  const colors = useColors();
  const isIOS = Platform.OS === "ios";
  const isWeb = Platform.OS === "web";

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        headerShown: false,
        tabBarLabelStyle: {
          fontFamily: "Inter_500Medium",
          fontSize: 10,
          letterSpacing: 0.3,
        },
        tabBarStyle: {
          position: "absolute",
          backgroundColor: isIOS ? "transparent" : colors.background,
          borderTopWidth: isWeb ? 1 : 0,
          borderTopColor: colors.border,
          elevation: 0,
          ...(isWeb ? { height: 84 } : {}),
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView
              intensity={80}
              tint="dark"
              style={StyleSheet.absoluteFill}
            />
          ) : (
            <View
              style={[
                StyleSheet.absoluteFill,
                { backgroundColor: colors.background },
              ]}
            />
          ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="house" tintColor={color} size={24} />
            ) : (
              <Feather name="home" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="tools"
        options={{
          title: "Tools",
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView
                name="wrench.and.screwdriver"
                tintColor={color}
                size={24}
              />
            ) : (
              <Feather name="tool" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="my-yacht"
        options={{
          title: "My Yacht",
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="sailboat" tintColor={color} size={24} />
            ) : (
              <Feather name="anchor" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="pdye"
        options={{
          title: "PDYE",
          tabBarIcon: ({ color, focused }) =>
            isIOS ? (
              <SymbolView
                name="lock.shield"
                tintColor={focused ? "#C9A961" : color}
                size={24}
              />
            ) : (
              <Feather
                name="shield"
                size={22}
                color={focused ? "#C9A961" : color}
              />
            ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="person" tintColor={color} size={24} />
            ) : (
              <Feather name="user" size={22} color={color} />
            ),
        }}
      />
    </Tabs>
  );
}

export default function TabLayout() {
  const inner = isLiquidGlassAvailable() ? (
    <NativeTabLayout />
  ) : (
    <ClassicTabLayout />
  );
  return (
    <View style={styles.root}>
      {inner}
      <BrandHeader />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: NAVY },
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    backgroundColor: NAVY,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: DIVIDER,
    justifyContent: "center",
    zIndex: 50,
  },
  logo: { width: 154, height: 30 },
});
