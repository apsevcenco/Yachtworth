import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import { ClerkProvider, ClerkLoaded, useAuth } from "@clerk/expo";
import { tokenCache } from "@clerk/expo/token-cache";
import { useFonts } from "expo-font";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { setAuthTokenGetter, setBaseUrl } from "@workspace/api-client-react";
import { Stack, usePathname } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useState } from "react";
import { Platform, Text, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { BrandHeader } from "@/components/BrandHeader";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { LaunchIntro } from "@/components/LaunchIntro";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

const FALLBACK_CLERK_PUBLISHABLE_KEY =
  "pk_test_cmVzdGVkLXJhbS04MC5jbGVyay5hY2NvdW50cy5kZXYk";
const FALLBACK_API_DOMAIN = "https://yachtworth.onrender.com";

const publishableKey =
  process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ?? FALLBACK_CLERK_PUBLISHABLE_KEY;
const proxyUrl = process.env.EXPO_PUBLIC_CLERK_PROXY_URL || undefined;
const disableIntro = process.env.EXPO_PUBLIC_DISABLE_INTRO === "1";
const clerkTokenCache = Platform.OS === "web" ? undefined : tokenCache;

function normalizeApiBaseUrl(value: string | undefined): string | null {
  const raw = value?.trim().replace(/\/+$/, "");
  if (!raw) return null;
  if (/^https?:\/\//i.test(raw)) return raw;
  return `https://${raw}`;
}

const apiDomain = process.env.EXPO_PUBLIC_DOMAIN ?? FALLBACK_API_DOMAIN;
setBaseUrl(normalizeApiBaseUrl(apiDomain));

function MissingConfigScreen() {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: "#0B1E3F",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <Text
        style={{
          color: "#C9A961",
          fontFamily: "Inter_700Bold",
          fontSize: 18,
          marginBottom: 10,
          textAlign: "center",
        }}
      >
        Yachtworth configuration missing
      </Text>
      <Text
        style={{
          color: "rgba(247,243,236,0.78)",
          fontFamily: "Inter_400Regular",
          fontSize: 14,
          lineHeight: 21,
          textAlign: "center",
        }}
      >
        Set EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY before starting Expo, then restart
        Metro with cache cleared.
      </Text>
    </View>
  );
}

function AuthReadyGate({ children }: { children: React.ReactNode }) {
  const { getToken, isLoaded } = useAuth();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!isLoaded) {
      setIsReady(false);
      return;
    }

    setAuthTokenGetter(async () => {
      try {
        return await getToken();
      } catch {
        return null;
      }
    });

    setIsReady(true);

    return () => {
      setIsReady(false);
      setAuthTokenGetter(null);
    };
  }, [getToken, isLoaded]);

  return isReady ? <>{children}</> : null;
}

function RootLayoutNav() {
  const pathname = usePathname();
  const showBrandHeader = !pathname.startsWith("/sign-");
  return (
    <View style={{ flex: 1 }}>
      <Stack screenOptions={{ headerBackTitle: "Back" }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="(auth)"
          options={{ headerShown: false, presentation: "modal" }}
        />
        <Stack.Screen
          name="valuation/new"
          options={{ headerShown: false, presentation: "card" }}
        />
        <Stack.Screen
          name="valuation/result"
          options={{ headerShown: false, presentation: "card" }}
        />
        <Stack.Screen
          name="roi/yacht-form"
          options={{ headerShown: false, presentation: "card" }}
        />
        <Stack.Screen
          name="roi/calculate"
          options={{ headerShown: false, presentation: "card" }}
        />
        <Stack.Screen
          name="roi/result"
          options={{ headerShown: false, presentation: "card" }}
        />
        <Stack.Screen
          name="cost/new"
          options={{ headerShown: false, presentation: "card" }}
        />
        <Stack.Screen
          name="cost/result"
          options={{ headerShown: false, presentation: "card" }}
        />
        <Stack.Screen
          name="charter"
          options={{ headerShown: false, presentation: "card" }}
        />
        <Stack.Screen
          name="charter-planner"
          options={{ headerShown: false, presentation: "card" }}
        />
        <Stack.Screen
          name="charter-form"
          options={{ headerShown: false, presentation: "card" }}
        />
        <Stack.Screen
          name="client-detail"
          options={{ headerShown: false, presentation: "card" }}
        />
        <Stack.Screen
          name="history"
          options={{ headerShown: false, presentation: "card" }}
        />
        <Stack.Screen
          name="settings"
          options={{ headerShown: false, presentation: "card" }}
        />
        <Stack.Screen
          name="my-yacht/edit"
          options={{ headerShown: false, presentation: "card" }}
        />
        <Stack.Screen
          name="my-yacht/[id]"
          options={{ headerShown: false, presentation: "card" }}
        />
        <Stack.Screen
          name="listing/index"
          options={{ headerShown: false, presentation: "card" }}
        />
        <Stack.Screen
          name="listing/form"
          options={{ headerShown: false, presentation: "card" }}
        />
        <Stack.Screen
          name="listing/result"
          options={{ headerShown: false, presentation: "card" }}
        />
        <Stack.Screen
          name="listing/my-listings"
          options={{ headerShown: false, presentation: "card" }}
        />
        <Stack.Screen
          name="yacht-proposal/index"
          options={{ headerShown: false, presentation: "card" }}
        />
        <Stack.Screen
          name="yacht-proposal/form"
          options={{ headerShown: false, presentation: "card" }}
        />
        <Stack.Screen
          name="yacht-proposal/preview"
          options={{ headerShown: false, presentation: "card" }}
        />
        <Stack.Screen
          name="yacht-proposal/my-proposals"
          options={{ headerShown: false, presentation: "card" }}
        />
        <Stack.Screen
          name="survey/index"
          options={{ headerShown: false, presentation: "card" }}
        />
        <Stack.Screen
          name="survey/new"
          options={{ headerShown: false, presentation: "card" }}
        />
        <Stack.Screen
          name="survey/[id]/index"
          options={{ headerShown: false, presentation: "card" }}
        />
        <Stack.Screen
          name="survey/[id]/section/[n]"
          options={{ headerShown: false, presentation: "card" }}
        />
      </Stack>
      {showBrandHeader ? <BrandHeader /> : null}
    </View>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    "Gilroy-Regular": require("../assets/fonts/Gilroy-Regular.otf"),
    "Gilroy-ExtraBold": require("../assets/fonts/Gilroy-ExtraBold.otf"),
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  if (!publishableKey) {
    return <MissingConfigScreen />;
  }

  return (
    <ClerkProvider
      publishableKey={publishableKey}
      tokenCache={clerkTokenCache}
      proxyUrl={proxyUrl}
    >
      <ClerkLoaded>
        <AuthReadyGate>
          <SafeAreaProvider>
            <ErrorBoundary>
              <QueryClientProvider client={queryClient}>
                <GestureHandlerRootView style={{ flex: 1 }}>
                  <KeyboardProvider>
                    <StatusBar style="light" />
                    <RootLayoutNav />
                    {disableIntro ? null : <LaunchIntro />}
                  </KeyboardProvider>
                </GestureHandlerRootView>
              </QueryClientProvider>
            </ErrorBoundary>
          </SafeAreaProvider>
        </AuthReadyGate>
      </ClerkLoaded>
    </ClerkProvider>
  );
}
