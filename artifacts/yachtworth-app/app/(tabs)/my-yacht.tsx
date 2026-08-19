import { Feather } from "@expo/vector-icons";
import { useAuth } from "@clerk/expo";
import {
  getListYachtsQueryKey,
  useListYachts,
  type ListYachtsParams,
  type Yacht,
} from "@workspace/api-client-react";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { YachtCard, type YachtCardAction } from "../../components/YachtCard";
import { useTheme } from "../../hooks/useColors";
import { useUnits } from "../../hooks/useUnits";

const NAVY = "#0B1E3F";
const NAVY_ELEV = "#142A52";
const GOLD = "#C9A961";
const IVORY = "#F7F3EC";
const MUTED = "rgba(247,243,236,0.6)";
const DIVIDER = "rgba(247,243,236,0.08)";

export default function MyYachtScreen() {
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const router = useRouter();
  const { isSignedIn, isLoaded } = useAuth();
  const { colors } = useTheme();
  const { units } = useUnits();
  const [showArchived, setShowArchived] = useState(false);

  // Always fetch the full set (active + archived) so we can show the
  // "Show archived (N)" badge even when the active list is empty.
  const params: ListYachtsParams = { include_archived: true };

  const query = useListYachts(params, {
    query: {
      queryKey: getListYachtsQueryKey(params),
      enabled: Boolean(isSignedIn),
      refetchOnMount: "always",
      staleTime: 30_000,
    },
  });

  const allYachts: Yacht[] = query.data?.items ?? [];
  const activeYachts = allYachts.filter((y) => !y.is_archived);
  const archivedCount = allYachts.length - activeYachts.length;
  const yachts: Yacht[] = showArchived ? allYachts : activeYachts;

  const onAction = (yachtId: string, key: YachtCardAction["key"]) => {
    switch (key) {
      case "valuations":
        router.push({ pathname: "/valuation/new", params: { yacht_id: yachtId } });
        return;
      case "costs":
        router.push({ pathname: "/cost/new", params: { yacht_id: yachtId } });
        return;
      case "roi":
        router.push({ pathname: "/roi/calculate", params: { yacht_id: yachtId } });
        return;
      case "charters":
        router.push("/charter-planner");
        return;
      case "passport":
        router.push(`/my-yacht/passport/${yachtId}` as never);
        return;
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background, paddingTop: (isWeb ? 67 : insets.top) + 70 }]}>
      <Pressable
        onPress={() =>
          router.canGoBack() ? router.back() : router.replace("/(tabs)")
        }
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel="Go back"
        style={[styles.backFab, { top: (isWeb ? 12 : insets.top) + 56 }]}
      >
        <Feather name="chevron-left" size={24} color={colors.foreground} />
      </Pressable>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 24,
          paddingBottom: insets.bottom + 120,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerBlock}>
          <Text style={[styles.kicker, { color: colors.primary }]}>YOUR FLEET</Text>
          <Text style={[styles.title, { color: colors.foreground }]}>My Yacht</Text>
        </View>

        {!isLoaded || (isSignedIn && query.isLoading) ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : !isSignedIn ? (
          <EmptyBlock
            icon="lock"
            title="Sign in to add your yacht"
            text="Save your yacht profile to run estimates, costs and ROI scenarios across sessions."
            cta="Sign in"
            onPress={() => router.push("/(auth)/sign-in")}
          />
        ) : query.isError ? (
          <EmptyBlock
            icon="alert-circle"
            title="Couldn't load your fleet"
            text={
              query.error instanceof Error
                ? query.error.message
                : "Something went wrong."
            }
            cta="Retry"
            onPress={() => query.refetch()}
          />
        ) : (
          <View>
            {archivedCount > 0 ? (
              <Pressable
                onPress={() => setShowArchived((v) => !v)}
                accessibilityRole="button"
                accessibilityLabel={
                  showArchived ? "Hide archived yachts" : "Show archived yachts"
                }
                style={({ pressed }) => [
                  styles.archiveToggle,
                  { borderColor: colors.border, backgroundColor: colors.glow ?? colors.card },
                  { opacity: pressed ? 0.7 : 1 },
                ]}
              >
                <Feather
                  name={showArchived ? "eye-off" : "archive"}
                  size={13}
                  color={colors.primary}
                />
                <Text style={styles.archiveToggleText}>
                  {showArchived
                    ? "Hide archived"
                    : `Show archived (${archivedCount})`}
                </Text>
              </Pressable>
            ) : null}
            {yachts.length === 0 ? (
              <EmptyBlock
                icon="anchor"
                title="No yachts in your fleet yet"
                text="Add a yacht to unlock your digital profile and connect all tools."
                cta="+ Add my first yacht"
                onPress={() => router.push("/my-yacht/edit")}
              />
            ) : null}
            {yachts.map((y) => (
              <YachtCard
                key={y.id}
                yacht={y}
                units={units}
                onPress={() =>
                  router.push({
                    pathname: "/my-yacht/[id]",
                    params: { id: y.id },
                  })
                }
                onEdit={() =>
                  router.push({
                    pathname: "/my-yacht/edit",
                    params: { id: y.id },
                  })
                }
                onAction={(key) => onAction(y.id, key)}
              />
            ))}

            {activeYachts.length > 0 ? (
              <Pressable
                onPress={() => router.push("/my-yacht/edit")}
                accessibilityRole="button"
                accessibilityLabel="Add another yacht"
                style={({ pressed }) => [
                  styles.addAnother,
                  { borderColor: colors.border, backgroundColor: colors.glow ?? colors.card },
                  { opacity: pressed ? 0.85 : 1 },
                ]}
              >
                <Feather name="plus" size={16} color={colors.primary} />
                <Text style={[styles.addAnotherText, { color: colors.primary }]}>Add another yacht</Text>
              </Pressable>
            ) : null}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function EmptyBlock({
  icon,
  title,
  text,
  cta,
  onPress,
}: {
  icon: React.ComponentProps<typeof Feather>["name"];
  title: string;
  text: string;
  cta: string;
  onPress: () => void;
}) {
  const { colors } = useTheme();

  return (
    <View style={styles.empty}>
      <View style={[styles.emptyIcon, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Feather name={icon} size={42} color={colors.primary} />
      </View>
      <Text style={[styles.emptyTitle, { color: colors.foreground }]}>{title}</Text>
      <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>{text}</Text>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={cta}
        style={({ pressed }) => [styles.cta, { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 }]}
      >
        <Text style={[styles.ctaText, { color: colors.background }]}>{cta}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: NAVY },
  headerBlock: { marginBottom: 22 },
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
    fontSize: 32,
    letterSpacing: -0.3,
  },
  center: { paddingVertical: 60, alignItems: "center" },
  empty: { alignItems: "center", paddingVertical: 50, paddingHorizontal: 8 },
  emptyIcon: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: NAVY_ELEV,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "rgba(201,169,97,0.20)",
  },
  emptyTitle: {
    color: IVORY,
    fontFamily: "Gilroy-ExtraBold",
    fontSize: 20,
    marginBottom: 10,
    textAlign: "center",
    letterSpacing: -0.2,
  },
  emptyText: {
    color: MUTED,
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    textAlign: "center",
    lineHeight: 19,
    paddingHorizontal: 12,
  },
  cta: {
    marginTop: 24,
    backgroundColor: GOLD,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 10,
  },
  ctaText: { color: NAVY, fontFamily: "Inter_700Bold", fontSize: 14 },
  addAnother: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 4,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(201,169,97,0.35)",
    backgroundColor: "rgba(201,169,97,0.06)",
    borderStyle: "dashed",
  },
  addAnotherText: {
    color: GOLD,
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
  },
  archiveToggle: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 99,
    borderWidth: 1,
    borderColor: "rgba(201,169,97,0.30)",
    backgroundColor: "rgba(201,169,97,0.06)",
    marginBottom: 14,
  },
  archiveToggleText: {
    color: GOLD,
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  _divider: { backgroundColor: DIVIDER },
  backFab: {
    position: "absolute",
    left: 12,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(8,22,51,0.28)",
    alignItems: "center",
    justifyContent: "center",
  },
});
