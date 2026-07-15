import { BlurView } from "expo-blur";
import { Tabs } from "expo-router";
import { SymbolView } from "expo-symbols";
import { Feather } from "@expo/vector-icons";
import React from "react";
import { Platform, StyleSheet, useWindowDimensions, View } from "react-native";

import { useColors } from "@/hooks/useColors";

export default function TabLayout() {
  const colors = useColors();
  const { width } = useWindowDimensions();
  const isIOS = Platform.OS === "ios";
  const isWeb = Platform.OS === "web";
  const isDesktopWeb = isWeb && width >= 900;

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
          display: isDesktopWeb ? "none" : "flex",
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
