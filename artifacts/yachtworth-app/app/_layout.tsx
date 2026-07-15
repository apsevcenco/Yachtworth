import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import { Feather } from "@expo/vector-icons";
import { ClerkProvider, ClerkLoaded, ClerkLoading, useAuth } from "@clerk/expo";
import { tokenCache } from "@clerk/expo/token-cache";
import { useFonts } from "expo-font";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { setAuthTokenGetter, setBaseUrl } from "@workspace/api-client-react";
import { Stack, usePathname, useRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useState } from "react";
import {
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { BrandHeader } from "@/components/BrandHeader";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { LaunchIntro } from "@/components/LaunchIntro";

if (Platform.OS !== "web") {
  SplashScreen.preventAutoHideAsync();
}

const queryClient = new QueryClient();
const DESKTOP_BREAKPOINT = 900;
const DESKTOP_SIDEBAR_WIDTH = 264;

const FALLBACK_CLERK_PUBLISHABLE_KEY =
  "pk_test_cmVzdGVkLXJhbS04MC5jbGVyay5hY2NvdW50cy5kZXYk";
const FALLBACK_API_DOMAIN = "https://yachtworth.onrender.com";

const publishableKey =
  process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ?? FALLBACK_CLERK_PUBLISHABLE_KEY;
const proxyUrl = process.env.EXPO_PUBLIC_CLERK_PROXY_URL || undefined;
const disableIntro = process.env.EXPO_PUBLIC_DISABLE_INTRO === "1";
const clerkTokenCache = Platform.OS === "web" ? undefined : tokenCache;

function getWebOrigin(): string | null {
  if (Platform.OS !== "web" || typeof window === "undefined") return null;
  return window.location.origin;
}

function decodeClerkDomain(key: string): string | null {
  const match = key.match(/^pk_(?:test|live)_(.+)$/);
  if (!match) return null;

  try {
    const encoded = match[1].replace(/_/g, "/").replace(/-/g, "+");
    const padded = encoded.padEnd(encoded.length + ((4 - (encoded.length % 4)) % 4), "=");
    const decoded =
      typeof atob === "function"
        ? atob(padded)
        : Buffer.from(padded, "base64").toString("utf8");
    return decoded.replace(/\$$/, "") || null;
  } catch {
    return null;
  }
}

const clerkDomain = decodeClerkDomain(publishableKey);
const clerkProviderDomain = Platform.OS === "web" ? clerkDomain ?? undefined : undefined;

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

function AppLoadingScreen() {
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
        Yachtworth
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
        Loading your workspace...
      </Text>
    </View>
  );
}

const CLERK_LOAD_TIMEOUT_MS = 10000;

/** Shown while Clerk's SDK is loading. If it never loads (network, CORS,
 * allowed-origins misconfig), surface a message instead of a blank screen. */
function ClerkLoadingGate() {
  const [timedOut, setTimedOut] = useState(false);
  const origin = getWebOrigin();

  useEffect(() => {
    const timer = setTimeout(() => setTimedOut(true), CLERK_LOAD_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, []);

  if (!timedOut) return <AppLoadingScreen />;

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
        Connection problem
      </Text>
      <Text
        style={{
          color: "rgba(247,243,236,0.78)",
          fontFamily: "Inter_400Regular",
          fontSize: 14,
          lineHeight: 21,
          textAlign: "center",
          marginBottom: Platform.OS === "web" ? 20 : 0,
        }}
      >
        Yachtworth couldn't reach the sign-in service. Check your connection
        and try again.
      </Text>
      {Platform.OS === "web" ? (
        <Text
          selectable
          style={{
            color: "rgba(247,243,236,0.58)",
            fontFamily: "Inter_400Regular",
            fontSize: 12,
            lineHeight: 18,
            textAlign: "center",
            marginBottom: 20,
          }}
        >
          {`Site origin: ${origin ?? "unknown"}\nClerk: ${clerkDomain ?? "unknown"}`}
        </Text>
      ) : null}
      {Platform.OS === "web" ? (
        <Pressable
          onPress={() => window.location.reload()}
          style={{
            backgroundColor: "#C9A961",
            paddingVertical: 10,
            paddingHorizontal: 24,
            borderRadius: 8,
          }}
        >
          <Text
            style={{
              color: "#0B1E3F",
              fontFamily: "Inter_600SemiBold",
              fontSize: 14,
            }}
          >
            Reload
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function AppKeyboardProvider({ children }: { children: React.ReactNode }) {
  if (Platform.OS === "web") {
    return <>{children}</>;
  }

  return <KeyboardProvider>{children}</KeyboardProvider>;
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

  return isReady ? <>{children}</> : <AppLoadingScreen />;
}

const DESKTOP_NAV_ITEMS: {
  label: string;
  href: string;
  icon: React.ComponentProps<typeof Feather>["name"];
  match: string[];
}[] = [
  { label: "Home", href: "/", icon: "home", match: ["/"] },
  { label: "Tools", href: "/(tabs)/tools", icon: "tool", match: ["/tools"] },
  {
    label: "My Yacht",
    href: "/(tabs)/my-yacht",
    icon: "anchor",
    match: ["/my-yacht"],
  },
  {
    label: "History",
    href: "/history",
    icon: "clock",
    match: ["/history"],
  },
  { label: "PDYE", href: "/(tabs)/pdye", icon: "shield", match: ["/pdye"] },
  {
    label: "Profile",
    href: "/(tabs)/profile",
    icon: "user",
    match: ["/profile", "/settings", "/surveyor-profile"],
  },
];

function isDesktopRouteActive(pathname: string, item: (typeof DESKTOP_NAV_ITEMS)[number]) {
  if (item.href === "/") {
    return pathname === "/" || pathname === "/(tabs)" || pathname === "/(tabs)/";
  }

  return item.match.some((segment) => pathname.includes(segment));
}

function DesktopSidebar({ pathname }: { pathname: string }) {
  const router = useRouter();

  return (
    <View style={styles.desktopSidebar}>
      <Image
        source={require("../assets/images/logo-wordmark.png")}
        style={styles.desktopLogo}
        resizeMode="contain"
      />
      <View style={styles.desktopNav}>
        {DESKTOP_NAV_ITEMS.map((item) => {
          const active = isDesktopRouteActive(pathname, item);
          return (
            <Pressable
              key={item.label}
              onPress={() => router.push(item.href as any)}
              accessibilityRole="button"
              accessibilityLabel={item.label}
              style={({ pressed }) => [
                styles.desktopNavItem,
                active ? styles.desktopNavItemActive : null,
                pressed ? styles.desktopNavItemPressed : null,
              ]}
            >
              <Feather
                name={item.icon}
                size={18}
                color={active ? "#C9A961" : "rgba(247,243,236,0.68)"}
              />
              <Text
                style={[
                  styles.desktopNavText,
                  active ? styles.desktopNavTextActive : null,
                ]}
              >
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <View style={styles.desktopSidebarFooter}>
        <Text style={styles.desktopFooterKicker}>Yacht intelligence</Text>
        <Text style={styles.desktopFooterText}>Render + Supabase + Clerk</Text>
      </View>
    </View>
  );
}

function RootLayoutNav() {
  const pathname = usePathname();
  const { width } = useWindowDimensions();
  const isDesktopWeb = Platform.OS === "web" && width >= DESKTOP_BREAKPOINT;
  const showBrandHeader = !isDesktopWeb && !pathname.startsWith("/sign-");
  return (
    <View style={[styles.appShell, isDesktopWeb ? styles.desktopShell : null]}>
      {isDesktopWeb ? <DesktopSidebar pathname={pathname} /> : null}
      <View style={isDesktopWeb ? styles.desktopMain : styles.mobileMain}>
        <View style={isDesktopWeb ? styles.desktopContent : styles.mobileMain}>
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
        </View>
        {showBrandHeader ? <BrandHeader /> : null}
      </View>
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
    if (Platform.OS !== "web" && (fontsLoaded || fontError)) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return <AppLoadingScreen />;

  if (!publishableKey) {
    return <MissingConfigScreen />;
  }

  return (
    <ClerkProvider
      publishableKey={publishableKey}
      tokenCache={clerkTokenCache}
      proxyUrl={proxyUrl}
      domain={clerkProviderDomain}
    >
      <ClerkLoading>
        <ClerkLoadingGate />
      </ClerkLoading>
      <ClerkLoaded>
        <AuthReadyGate>
          <SafeAreaProvider>
            <ErrorBoundary>
              <QueryClientProvider client={queryClient}>
                <GestureHandlerRootView style={{ flex: 1 }}>
                  <AppKeyboardProvider>
                    <StatusBar style="light" />
                    <RootLayoutNav />
                    {disableIntro ? null : <LaunchIntro />}
                  </AppKeyboardProvider>
                </GestureHandlerRootView>
              </QueryClientProvider>
            </ErrorBoundary>
          </SafeAreaProvider>
        </AuthReadyGate>
      </ClerkLoaded>
    </ClerkProvider>
  );
}

const styles = StyleSheet.create({
  appShell: {
    flex: 1,
    backgroundColor: "#0B1E3F",
  },
  mobileMain: {
    flex: 1,
  },
  desktopShell: {
    flexDirection: "row",
    backgroundColor: "#071735",
  },
  desktopSidebar: {
    width: DESKTOP_SIDEBAR_WIDTH,
    backgroundColor: "#081633",
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: "rgba(247,243,236,0.10)",
    paddingHorizontal: 18,
    paddingTop: 24,
    paddingBottom: 22,
  },
  desktopLogo: {
    width: 196,
    height: 34,
    marginBottom: 34,
  },
  desktopNav: {
    gap: 6,
  },
  desktopNavItem: {
    minHeight: 44,
    borderRadius: 8,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  desktopNavItemActive: {
    backgroundColor: "rgba(201,169,97,0.12)",
    borderWidth: 1,
    borderColor: "rgba(201,169,97,0.26)",
  },
  desktopNavItemPressed: {
    opacity: 0.82,
  },
  desktopNavText: {
    color: "rgba(247,243,236,0.72)",
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
  },
  desktopNavTextActive: {
    color: "#C9A961",
  },
  desktopSidebarFooter: {
    marginTop: "auto",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(247,243,236,0.10)",
    paddingTop: 18,
  },
  desktopFooterKicker: {
    color: "#C9A961",
    fontFamily: "Inter_700Bold",
    fontSize: 10,
    letterSpacing: 1.4,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  desktopFooterText: {
    color: "rgba(247,243,236,0.54)",
    fontFamily: "Inter_400Regular",
    fontSize: 12,
  },
  desktopMain: {
    flex: 1,
    alignItems: "center",
    backgroundColor: "#0B1E3F",
  },
  desktopContent: {
    flex: 1,
    width: "100%",
    maxWidth: 1280,
  },
});
