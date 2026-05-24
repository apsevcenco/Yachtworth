import { Feather } from "@expo/vector-icons";
import { useAuth } from "@clerk/expo";
import {
  getListYachtsQueryKey,
  useListYachts,
  type Yacht,
} from "@workspace/api-client-react";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
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
import { ComingSoonModal } from "../../components/ComingSoonModal";
import { useUnits } from "../../hooks/useUnits";

const NAVY = "#0B1E3F";
const NAVY_ELEV = "#142A52";
const NAVY_DEEP = "#081633";
const GOLD = "#C9A961";
const IVORY = "#F7F3EC";
const MUTED = "rgba(247,243,236,0.6)";
const DIVIDER = "rgba(247,243,236,0.08)";

const TYPE_LABELS: Record<string, string> = {
  motor_yacht: "Motor Yacht",
  sailing_yacht: "Sailing Yacht",
  catamaran: "Catamaran",
  superyacht: "Superyacht",
};

function formatLength(
  m: number | null | undefined,
  units: "metric" | "imperial",
): string {
  if (m == null) return "—";
  if (units === "metric") return `${m.toFixed(1)} m`;
  return `${Math.round(m * 3.28084)} ft`;
}

function yachtTitle(y: Yacht): string {
  return y.name || [y.brand, y.model].filter(Boolean).join(" ") || "Your yacht";
}

function pickActive(items: Yacht[]): Yacht | null {
  if (items.length === 0) return null;
  return [...items].sort((a, b) => {
    const at = new Date(a.updated_at ?? a.created_at ?? 0).getTime();
    const bt = new Date(b.updated_at ?? b.created_at ?? 0).getTime();
    return bt - at;
  })[0];
}

export default function MyYachtScreen() {
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const router = useRouter();
  const { isSignedIn, isLoaded } = useAuth();
  const { units } = useUnits();
  const [showPassportModal, setShowPassportModal] = useState(false);

  const query = useListYachts({
    query: {
      queryKey: getListYachtsQueryKey(),
      enabled: Boolean(isSignedIn),
      staleTime: 30_000,
    },
  });

  const yachts: Yacht[] = query.data?.items ?? [];
  const active = useMemo(() => pickActive(yachts), [yachts]);

  return (
    <View style={[styles.root, { paddingTop: (isWeb ? 67 : insets.top) + 24 }]}>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 24,
          paddingBottom: insets.bottom + 120,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerBlock}>
          <Text style={styles.kicker}>YOUR FLEET</Text>
          <Text style={styles.title}>My Yacht</Text>
        </View>

        {!isLoaded || (isSignedIn && query.isLoading) ? (
          <View style={styles.center}>
            <ActivityIndicator color={GOLD} />
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
            title="Couldn't load yacht"
            text={
              query.error instanceof Error
                ? query.error.message
                : "Something went wrong."
            }
            cta="Retry"
            onPress={() => query.refetch()}
          />
        ) : !active ? (
          <EmptyBlock
            icon="anchor"
            title="No yacht added yet"
            text="Add your yacht to unlock your digital passport and unified history."
            cta="+ Add my yacht"
            onPress={() => router.push("/roi/yacht-form")}
          />
        ) : (
          <View>
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.bigAnchor}>
                  <Feather name="anchor" size={22} color={GOLD} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.yachtName} numberOfLines={1}>
                    {yachtTitle(active)}
                  </Text>
                  {active.yacht_type ? (
                    <Text style={styles.yachtType}>
                      {TYPE_LABELS[active.yacht_type] ?? active.yacht_type}
                      {active.year_built ? ` · ${active.year_built}` : ""}
                    </Text>
                  ) : null}
                </View>
                <Pressable
                  onPress={() =>
                    router.push({
                      pathname: "/roi/yacht-form",
                      params: { id: active.id },
                    })
                  }
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel="Edit yacht"
                  style={({ pressed }) => [
                    styles.iconBtn,
                    { opacity: pressed ? 0.6 : 1 },
                  ]}
                >
                  <Feather name="edit-2" size={15} color={GOLD} />
                </Pressable>
              </View>
              <View style={styles.cardDivider} />
              <View style={styles.specGrid}>
                <Spec label="Length" value={formatLength(active.length_meters, units)} />
                <Spec
                  label="Cabins"
                  value={active.cabins != null ? String(active.cabins) : "—"}
                />
                <Spec
                  label="Guests"
                  value={active.guests != null ? String(active.guests) : "—"}
                />
                <Spec
                  label="Crew"
                  value={active.crew != null ? String(active.crew) : "—"}
                />
                <Spec label="Flag" value={active.flag || "—"} wide />
                <Spec
                  label="Marina"
                  value={active.marina_location || "—"}
                  wide
                />
              </View>

              <View style={styles.badgesRow}>
                <Badge ok label="Profile" />
                <Badge ok={false} label="Passport" lockedSoon />
              </View>
            </View>

            <Pressable
              onPress={() => router.push("/valuation/new")}
              accessibilityRole="button"
              accessibilityLabel="View Valuation"
              style={({ pressed }) => [styles.actionBtn, { opacity: pressed ? 0.85 : 1 }]}
            >
              <Feather name="trending-up" size={16} color={GOLD} />
              <Text style={styles.actionBtnText}>View Valuation</Text>
              <Feather name="chevron-right" size={18} color={MUTED} />
            </Pressable>
            <Pressable
              onPress={() => router.push("/cost/new")}
              accessibilityRole="button"
              accessibilityLabel="View Cost Estimate"
              style={({ pressed }) => [styles.actionBtn, { opacity: pressed ? 0.85 : 1 }]}
            >
              <Feather name="bar-chart-2" size={16} color={GOLD} />
              <Text style={styles.actionBtnText}>View Cost Estimate</Text>
              <Feather name="chevron-right" size={18} color={MUTED} />
            </Pressable>
            <Pressable
              onPress={() => setShowPassportModal(true)}
              accessibilityRole="button"
              accessibilityLabel="Digital Passport — coming soon"
              style={({ pressed }) => [
                styles.actionBtn,
                styles.actionBtnSoon,
                { opacity: pressed ? 0.85 : 1 },
              ]}
            >
              <Feather name="credit-card" size={16} color={MUTED} />
              <Text style={[styles.actionBtnText, { color: IVORY }]}>
                Digital Passport
              </Text>
              <View style={styles.soonBadge}>
                <Text style={styles.soonBadgeText}>SOON</Text>
              </View>
            </Pressable>

            {yachts.length > 1 ? (
              <Pressable
                onPress={() => router.push("/charter")}
                accessibilityRole="button"
                accessibilityLabel="Manage all yachts"
                style={({ pressed }) => [
                  styles.manageBtn,
                  { opacity: pressed ? 0.85 : 1 },
                ]}
              >
                <Text style={styles.manageBtnText}>
                  Manage all {yachts.length} yachts
                </Text>
                <Feather name="arrow-up-right" size={16} color={GOLD} />
              </Pressable>
            ) : null}
          </View>
        )}
      </ScrollView>

      <ComingSoonModal
        visible={showPassportModal}
        toolKey="digital_passport"
        toolName="Digital Passport"
        toolDescription="QR-linked verified yacht history — service log, ownership, surveys."
        toolIcon="credit-card"
        onClose={() => setShowPassportModal(false)}
      />
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
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>
        <Feather name={icon} size={28} color={GOLD} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyText}>{text}</Text>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={cta}
        style={({ pressed }) => [styles.cta, { opacity: pressed ? 0.85 : 1 }]}
      >
        <Text style={styles.ctaText}>{cta}</Text>
      </Pressable>
    </View>
  );
}

function Spec({
  label,
  value,
  wide,
}: {
  label: string;
  value: string;
  wide?: boolean;
}) {
  return (
    <View style={[styles.spec, wide ? styles.specWide : null]}>
      <Text style={styles.specLabel}>{label}</Text>
      <Text style={styles.specValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

function Badge({
  label,
  ok,
  lockedSoon,
}: {
  label: string;
  ok: boolean;
  lockedSoon?: boolean;
}) {
  return (
    <View
      style={[
        styles.badge,
        ok ? styles.badgeOk : styles.badgeLocked,
      ]}
    >
      <Feather
        name={ok ? "check" : "lock"}
        size={11}
        color={ok ? GOLD : MUTED}
      />
      <Text style={[styles.badgeText, { color: ok ? GOLD : MUTED }]}>
        {label}
        {lockedSoon ? " · soon" : ""}
      </Text>
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
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: NAVY_ELEV,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  emptyTitle: {
    color: IVORY,
    fontFamily: "Gilroy-Regular",
    fontSize: 20,
    marginBottom: 8,
    textAlign: "center",
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
    marginTop: 22,
    backgroundColor: "rgba(201,169,97,0.10)",
    borderWidth: 1.5,
    borderColor: GOLD,
    paddingHorizontal: 24,
    paddingVertical: 13,
    borderRadius: 10,
  },
  ctaText: { color: GOLD, fontFamily: "Inter_700Bold", fontSize: 14 },
  card: {
    backgroundColor: NAVY_DEEP,
    borderColor: DIVIDER,
    borderWidth: 1,
    borderRadius: 16,
    padding: 20,
    marginBottom: 14,
  },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 14 },
  bigAnchor: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "rgba(201,169,97,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  yachtName: {
    color: IVORY,
    fontFamily: "Gilroy-ExtraBold",
    fontSize: 20,
    marginBottom: 2,
  },
  yachtType: {
    color: GOLD,
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    letterSpacing: 0.4,
  },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderColor: GOLD,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  cardDivider: { height: 1, backgroundColor: DIVIDER, marginVertical: 16 },
  specGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  spec: { width: "47%" },
  specWide: { width: "100%" },
  specLabel: {
    color: MUTED,
    fontFamily: "Inter_500Medium",
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  specValue: { color: IVORY, fontFamily: "Inter_600SemiBold", fontSize: 15 },
  badgesRow: { flexDirection: "row", gap: 8, marginTop: 16, flexWrap: "wrap" },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 99,
    borderWidth: 1,
  },
  badgeOk: { borderColor: "rgba(201,169,97,0.4)", backgroundColor: "rgba(201,169,97,0.10)" },
  badgeLocked: { borderColor: DIVIDER, backgroundColor: NAVY_ELEV },
  badgeText: { fontFamily: "Inter_600SemiBold", fontSize: 11, letterSpacing: 0.3 },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: NAVY_DEEP,
    borderColor: DIVIDER,
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
  },
  actionBtnSoon: { backgroundColor: NAVY_ELEV },
  actionBtnText: {
    flex: 1,
    color: GOLD,
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
  },
  soonBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: "rgba(247,243,236,0.08)",
  },
  soonBadgeText: { color: MUTED, fontFamily: "Inter_700Bold", fontSize: 9, letterSpacing: 0.8 },
  manageBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(201,169,97,0.35)",
    backgroundColor: "rgba(201,169,97,0.06)",
  },
  manageBtnText: { color: GOLD, fontFamily: "Inter_600SemiBold", fontSize: 13 },
});
