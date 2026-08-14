import { Feather } from "@expo/vector-icons";
import { useAuth, useSignUp, useSSO } from "@clerk/expo";
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
import { useTheme } from "../../hooks/useColors";

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

export default function SignUpScreen() {
  useWarmUpBrowser();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors, isAcid } = useTheme();
  const { signUp, errors, fetchStatus } = useSignUp();
  const { isSignedIn } = useAuth();
  const { startSSOFlow } = useSSO();

  const [emailAddress, setEmailAddress] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [oauthLoading, setOauthLoading] = useState<string | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setGeneralError(null);
    const { error } = await signUp.password({ emailAddress, password });
    if (error) {
      const e = error as any;
      setGeneralError(
        e?.errors?.[0]?.longMessage ||
          e?.errors?.[0]?.message ||
          e?.message ||
          "Sign-up failed",
      );
      return;
    }
    await signUp.verifications.sendEmailCode();
  };

  const handleVerify = async () => {
    setGeneralError(null);
    try {
      await signUp.verifications.verifyEmailCode({ code });
      if (signUp.status === "complete") {
        await signUp.finalize({
          navigate: ({ session, decorateUrl }) => {
            if (session?.currentTask) return;
            router.replace(decorateUrl("/") as any);
          },
        });
      }
    } catch (err: any) {
      setGeneralError(err?.message || "Verification failed");
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
        setGeneralError(err?.message || "Sign-up cancelled");
      } finally {
        setOauthLoading(null);
      }
    },
    [router, startSSOFlow],
  );

  if (signUp.status === "complete" || isSignedIn) {
    return null;
  }

  const isWeb = Platform.OS === "web";

  const verifying =
    signUp.status === "missing_requirements" &&
    signUp.unverifiedFields.includes("email_address") &&
    signUp.missingFields.length === 0;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={{ flex: 1, backgroundColor: colors.background }}
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
            <Feather name="x" size={22} color={colors.foreground} />
          </Pressable>
          <View style={styles.brandRow}>
            <View style={[styles.dot, { backgroundColor: colors.primary }]} />
            <Text style={[styles.brandLabel, { color: colors.foreground }]}>YACHTWORTH</Text>
          </View>
          <View style={{ width: 22 }} />
        </View>

        {verifying ? (
          <>
            <Text style={[styles.kicker, { color: colors.primary }, isAcid && styles.acidKicker]}>VERIFY EMAIL</Text>
            <Text style={[styles.title, { color: colors.foreground }, isAcid && styles.acidTitle]}>Check your inbox.</Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
              We sent a 6-digit code to {emailAddress}.
            </Text>

            <Text style={[styles.label, { color: colors.primary }]}>Verification code</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
              keyboardType="number-pad"
              placeholder="123456"
              placeholderTextColor={colors.mutedForeground}
              value={code}
              onChangeText={setCode}
            />
            {errors.fields.code && (
              <Text style={styles.error}>{errors.fields.code.message}</Text>
            )}
            {generalError && <Text style={styles.error}>{generalError}</Text>}

            <Pressable
              onPress={handleVerify}
              disabled={!code || fetchStatus === "fetching"}
              style={({ pressed }) => [
                styles.primaryBtn,
                { backgroundColor: colors.glow ?? "transparent", borderColor: colors.primary },
                {
                  opacity:
                    !code || fetchStatus === "fetching"
                      ? 0.5
                      : pressed
                        ? 0.85
                        : 1,
                },
              ]}
            >
              {fetchStatus === "fetching" ? (
                <ActivityIndicator color={colors.primary} />
              ) : (
                <Text style={[styles.primaryText, { color: colors.primary }]}>Verify</Text>
              )}
            </Pressable>

            <Pressable
              onPress={() => signUp.verifications.sendEmailCode()}
              style={{ marginTop: 16, alignItems: "center" }}
            >
              <Text style={[styles.footerLink, { color: colors.primary }]}>Send a new code</Text>
            </Pressable>
          </>
        ) : (
          <>
            <Text style={[styles.kicker, { color: colors.primary }, isAcid && styles.acidKicker]}>JOIN YACHTWORTH</Text>
            <Text style={[styles.title, { color: colors.foreground }, isAcid && styles.acidTitle]}>Create account.</Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
              Start with one free yacht estimate. Upgrade anytime.
            </Text>

            <Pressable
              disabled={!!oauthLoading}
              onPress={() => handleOAuth("oauth_apple")}
              style={({ pressed }) => [
                styles.oauthBtn,
                { backgroundColor: colors.card, borderColor: colors.border },
                { opacity: pressed || oauthLoading ? 0.85 : 1 },
              ]}
            >
              {oauthLoading === "oauth_apple" ? (
                <ActivityIndicator color={colors.foreground} />
              ) : (
                <>
                  <Feather name="smartphone" size={18} color={colors.foreground} />
                  <Text style={[styles.oauthText, { color: colors.foreground }]}>Continue with Apple</Text>
                </>
              )}
            </Pressable>

            <Pressable
              disabled={!!oauthLoading}
              onPress={() => handleOAuth("oauth_google")}
              style={({ pressed }) => [
                styles.oauthBtn,
                { backgroundColor: colors.card, borderColor: colors.border },
                { opacity: pressed || oauthLoading ? 0.85 : 1 },
              ]}
            >
              {oauthLoading === "oauth_google" ? (
                <ActivityIndicator color={colors.foreground} />
              ) : (
                <>
                  <Feather name="globe" size={18} color={colors.foreground} />
                  <Text style={[styles.oauthText, { color: colors.foreground }]}>Continue with Google</Text>
                </>
              )}
            </Pressable>

            <View style={styles.dividerRow}>
              <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
              <Text style={[styles.dividerText, { color: colors.mutedForeground }]}>OR</Text>
              <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
            </View>

            <Text style={[styles.label, { color: colors.primary }]}>Email</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              placeholder="you@example.com"
              placeholderTextColor={colors.mutedForeground}
              value={emailAddress}
              onChangeText={setEmailAddress}
            />
            {errors.fields.emailAddress && (
              <Text style={styles.error}>
                {errors.fields.emailAddress.message}
              </Text>
            )}

            <Text style={[styles.label, { color: colors.primary }]}>Password</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
              secureTextEntry
              autoComplete="new-password"
              placeholder="At least 8 characters"
              placeholderTextColor={colors.mutedForeground}
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
                { backgroundColor: colors.glow ?? "transparent", borderColor: colors.primary },
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
                <ActivityIndicator color={colors.primary} />
              ) : (
                <Text style={[styles.primaryText, { color: colors.primary }]}>Create account</Text>
              )}
            </Pressable>

            {/* Required for Clerk's bot sign-up protection */}
            <View nativeID="clerk-captcha" />

            <View style={styles.footer}>
              <Text style={[styles.footerText, { color: colors.mutedForeground }]}>Already have an account? </Text>
              <Link href="/sign-in" replace>
                <Text style={[styles.footerLink, { color: colors.primary }]}>Sign in</Text>
              </Link>
            </View>
          </>
        )}
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
  acidTitle: {
    letterSpacing: 1,
    textTransform: "uppercase",
    textShadowColor: "rgba(255,56,232,0.6)",
    textShadowRadius: 12,
  },
  acidKicker: { letterSpacing: 3 },
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
    backgroundColor: "rgba(201,169,97,0.10)",
    borderWidth: 1.5,
    borderColor: GOLD,
    borderRadius: 14,
    paddingVertical: 17,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 24,
  },
  primaryText: {
    color: GOLD,
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
