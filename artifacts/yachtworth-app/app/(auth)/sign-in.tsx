import { Feather } from "@expo/vector-icons";
import { useSignIn, useSSO } from "@clerk/expo";
import * as AuthSession from "expo-auth-session";
import { Link, useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const NAVY = "#0B1E3F";
const NAVY_ELEV = "#142A52";
const GOLD = "#C9A961";
const IVORY = "#F7F3EC";

WebBrowser.maybeCompleteAuthSession();

function useWarmUpBrowser() {
  useEffect(() => {
    if (Platform.OS !== "android") return;
    void WebBrowser.warmUpAsync();
    return () => {
      void WebBrowser.coolDownAsync();
    };
  }, []);
}

export default function SignInScreen() {
  useWarmUpBrowser();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { signIn, errors, fetchStatus } = useSignIn();
  const { startSSOFlow } = useSSO();

  const [emailAddress, setEmailAddress] = useState("");
  const [password, setPassword] = useState("");
  const [oauthLoading, setOauthLoading] = useState<string | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setGeneralError(null);
    const { error } = await signIn.password({ emailAddress, password });
    if (error) {
      const e = error as any;
      setGeneralError(
        e?.errors?.[0]?.longMessage ||
          e?.errors?.[0]?.message ||
          e?.message ||
          "Sign-in failed",
      );
      return;
    }
    if (signIn.status === "complete") {
      await signIn.finalize({
        navigate: ({ session, decorateUrl }) => {
          if (session?.currentTask) return;
          router.replace(decorateUrl("/") as any);
        },
      });
    }
  };

  const handleOAuth = useCallback(
    async (strategy: "oauth_google" | "oauth_apple") => {
      setGeneralError(null);
      setOauthLoading(strategy);
      try {
        const { createdSessionId, setActive } = await startSSOFlow({
          strategy,
          redirectUrl: AuthSession.makeRedirectUri(),
        });
        if (createdSessionId && setActive) {
          await setActive({
            session: createdSessionId,
            navigate: async ({ session, decorateUrl }) => {
              if (session?.currentTask) return;
              router.replace(decorateUrl("/") as any);
            },
          });
        }
      } catch (err: any) {
        setGeneralError(err?.message || "Sign-in cancelled");
      } finally {
        setOauthLoading(null);
      }
    },
    [router, startSSOFlow],
  );

  const isWeb = Platform.OS === "web";

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={{ flex: 1, backgroundColor: NAVY }}
    >
      <ScrollView
        contentContainerStyle={{
          paddingTop: (isWeb ? 32 : insets.top) + 16,
          paddingBottom: insets.bottom + 32,
          paddingHorizontal: 24,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.headerRow}>
          <Pressable hitSlop={12} onPress={() => router.back()}>
            <Feather name="x" size={22} color={IVORY} />
          </Pressable>
          <View style={styles.brandRow}>
            <View style={styles.dot} />
            <Text style={styles.brandLabel}>YACHTWORTH</Text>
          </View>
          <View style={{ width: 22 }} />
        </View>

        <Text style={styles.kicker}>WELCOME BACK</Text>
        <Text style={styles.title}>Sign in.</Text>
        <Text style={styles.subtitle}>
          Access your estimates and continue where you left off.
        </Text>

        <Pressable
          disabled={!!oauthLoading}
          onPress={() => handleOAuth("oauth_apple")}
          style={({ pressed }) => [
            styles.oauthBtn,
            { opacity: pressed || oauthLoading ? 0.85 : 1 },
          ]}
        >
          {oauthLoading === "oauth_apple" ? (
            <ActivityIndicator color={IVORY} />
          ) : (
            <>
              <Feather name="smartphone" size={18} color={IVORY} />
              <Text style={styles.oauthText}>Continue with Apple</Text>
            </>
          )}
        </Pressable>

        <Pressable
          disabled={!!oauthLoading}
          onPress={() => handleOAuth("oauth_google")}
          style={({ pressed }) => [
            styles.oauthBtn,
            { opacity: pressed || oauthLoading ? 0.85 : 1 },
          ]}
        >
          {oauthLoading === "oauth_google" ? (
            <ActivityIndicator color={IVORY} />
          ) : (
            <>
              <Feather name="globe" size={18} color={IVORY} />
              <Text style={styles.oauthText}>Continue with Google</Text>
            </>
          )}
        </Pressable>

        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>OR</Text>
          <View style={styles.dividerLine} />
        </View>

        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          placeholder="you@example.com"
          placeholderTextColor="rgba(247,243,236,0.35)"
          value={emailAddress}
          onChangeText={setEmailAddress}
        />
        {errors.fields.identifier && (
          <Text style={styles.error}>{errors.fields.identifier.message}</Text>
        )}

        <Text style={styles.label}>Password</Text>
        <TextInput
          style={styles.input}
          secureTextEntry
          autoComplete="current-password"
          placeholder="••••••••"
          placeholderTextColor="rgba(247,243,236,0.35)"
          value={password}
          onChangeText={setPassword}
        />
        {errors.fields.password && (
          <Text style={styles.error}>{errors.fields.password.message}</Text>
        )}
        {generalError && <Text style={styles.error}>{generalError}</Text>}

        <Pressable
          onPress={handleSubmit}
          disabled={!emailAddress || !password || fetchStatus === "fetching"}
          style={({ pressed }) => [
            styles.primaryBtn,
            {
              opacity:
                !emailAddress || !password || fetchStatus === "fetching"
                  ? 0.5
                  : pressed
                    ? 0.85
                    : 1,
            },
          ]}
        >
          {fetchStatus === "fetching" ? (
            <ActivityIndicator color={NAVY} />
          ) : (
            <Text style={styles.primaryText}>Sign in</Text>
          )}
        </Pressable>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Don't have an account? </Text>
          <Link href="/sign-up" replace>
            <Text style={styles.footerLink}>Sign up</Text>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 36,
  },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: GOLD },
  brandLabel: {
    color: IVORY,
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    letterSpacing: 3,
  },
  kicker: {
    color: GOLD,
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    letterSpacing: 2,
    textTransform: "uppercase",
    marginBottom: 10,
  },
  title: {
    color: IVORY,
    fontFamily: "Gilroy-ExtraBold",
    fontSize: 36,
    letterSpacing: -0.3,
  },
  subtitle: {
    color: "rgba(247,243,236,0.6)",
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    marginTop: 8,
    marginBottom: 28,
  },
  oauthBtn: {
    backgroundColor: NAVY_ELEV,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "rgba(201,169,97,0.18)",
  },
  oauthText: {
    color: IVORY,
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(247,243,236,0.18)",
  },
  dividerText: {
    color: "rgba(247,243,236,0.45)",
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    letterSpacing: 2,
  },
  label: {
    color: GOLD,
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginTop: 12,
    marginBottom: 6,
  },
  input: {
    backgroundColor: NAVY_ELEV,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    color: IVORY,
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    borderWidth: 1,
    borderColor: "rgba(201,169,97,0.15)",
  },
  error: {
    color: "#E87B7B",
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    marginTop: 6,
  },
  primaryBtn: {
    backgroundColor: GOLD,
    borderRadius: 14,
    paddingVertical: 17,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 24,
  },
  primaryText: {
    color: NAVY,
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
    letterSpacing: 0.2,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 24,
  },
  footerText: {
    color: "rgba(247,243,236,0.6)",
    fontFamily: "Inter_400Regular",
    fontSize: 14,
  },
  footerLink: {
    color: GOLD,
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
  },
});
