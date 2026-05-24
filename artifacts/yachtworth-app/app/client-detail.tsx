import { Feather } from "@expo/vector-icons";
import { useAuth } from "@clerk/expo";
import {
  getGetClientQueryKey,
  useGetClient,
  type Charter,
} from "@workspace/api-client-react";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useMemo } from "react";
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

const NAVY = "#0B1E3F";
const NAVY_ELEV = "#142A52";
const NAVY_DEEP = "#081633";
const GOLD = "#C9A961";
const IVORY = "#F7F3EC";
const MUTED = "rgba(247,243,236,0.55)";
const DIVIDER = "rgba(247,243,236,0.08)";
const RED = "#E74C3C";

const STATUS_LABELS: Record<string, string> = {
  confirmed: "Confirmed",
  tentative: "Tentative",
  maintenance: "Maintenance",
  blocked: "Blocked",
  cancelled: "Cancelled",
};

const STATUS_COLORS: Record<string, string> = {
  confirmed: GOLD,
  tentative: "#3498DB",
  maintenance: "#95A5A6",
  blocked: RED,
  cancelled: "#7F8C8D",
};

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[1]![0]!).toUpperCase();
}

function fmtMoney(n: number | null | undefined): string {
  if (n == null) return "—";
  return `€${Math.round(n).toLocaleString("en-US")}`;
}

function fmtDate(s: string | null | undefined): string {
  if (!s) return "—";
  try {
    return new Date(s).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return s;
  }
}

function fmtRange(start: string, end: string): string {
  try {
    const s = new Date(start).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
    });
    const e = new Date(end).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
    return `${s} – ${e}`;
  } catch {
    return `${start} – ${end}`;
  }
}

function grossOf(c: Charter): number {
  if (c.charter_rate == null) return 0;
  if (c.charter_rate_type === "per_day") {
    const cs = new Date(c.start_date);
    const ce = new Date(c.end_date);
    const days =
      Math.max(0, Math.round((ce.getTime() - cs.getTime()) / 86400000)) + 1;
    return c.charter_rate * days;
  }
  return c.charter_rate;
}

export default function ClientDetailScreen() {
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const router = useRouter();
  const params = useLocalSearchParams();
  const { isSignedIn, isLoaded } = useAuth();
  const id = typeof params.id === "string" ? params.id : "";

  const clientQ = useGetClient(id, {
    query: {
      queryKey: getGetClientQueryKey(id),
      enabled: Boolean(isSignedIn) && Boolean(id),
    },
  });

  const client = clientQ.data?.client;
  const charters = useMemo(
    () => clientQ.data?.charters ?? [],
    [clientQ.data?.charters],
  );

  const headerPad = (isWeb ? 67 : insets.top) + 70;

  if (!isLoaded || (isSignedIn && id && clientQ.isLoading)) {
    return (
      <View style={styles.root}>
        <View style={styles.centerFull}>
          <ActivityIndicator color={GOLD} />
        </View>
      </View>
    );
  }

  if (!isSignedIn) {
    return (
      <View style={styles.root}>
        <View style={styles.centerFull}>
          <Feather name="lock" size={26} color={GOLD} />
          <Text style={styles.emptyTitle}>Sign in required</Text>
          <Pressable
            onPress={() => router.replace("/(auth)/sign-in")}
            style={[styles.primaryBtn, { marginTop: 14 }]}
            accessibilityRole="button"
            accessibilityLabel="Sign in"
          >
            <Text style={styles.primaryBtnText}>Sign in</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (clientQ.isError || !client) {
    return (
      <View style={styles.root}>
        <Pressable
          onPress={() => router.back()}
          style={[styles.backFab, { top: (isWeb ? 12 : insets.top) + 56 }]}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Feather name="chevron-left" size={22} color={IVORY} />
        </Pressable>
        <View style={[styles.centerFull, { paddingTop: headerPad }]}>
          <Feather name="alert-circle" size={28} color={RED} />
          <Text style={styles.emptyTitle}>Client not found</Text>
          <Text style={styles.emptyText}>
            This client may have been removed, or your session has expired.
          </Text>
          <Pressable
            onPress={() => router.back()}
            style={[styles.primaryBtn, { marginTop: 14 }]}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Text style={styles.primaryBtnText}>Go back</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <Pressable
        onPress={() => router.back()}
        style={[styles.backFab, { top: (isWeb ? 12 : insets.top) + 56 }]}
        accessibilityRole="button"
        accessibilityLabel="Go back"
      >
        <Feather name="chevron-left" size={22} color={IVORY} />
      </Pressable>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: headerPad,
          paddingHorizontal: 22,
          paddingBottom: insets.bottom + 60,
        }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.kicker}>CLIENT</Text>

        {/* Hero card */}
        <View style={styles.heroCard}>
          <View style={styles.avatarLg}>
            <Text style={styles.avatarLgText}>{initialsOf(client.name)}</Text>
          </View>
          <Text style={styles.heroName}>{client.name}</Text>
          {client.last_charter_date ? (
            <Text style={styles.heroSub}>
              Last charter · {fmtDate(client.last_charter_date)}
            </Text>
          ) : null}
          <View style={styles.statsRow}>
            <View style={styles.statBlock}>
              <Text style={styles.statValue}>{client.charters_count}</Text>
              <Text style={styles.statLabel}>
                Charter{client.charters_count === 1 ? "" : "s"}
              </Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBlock}>
              <Text style={styles.statValue}>
                {fmtMoney(client.total_revenue_eur)}
              </Text>
              <Text style={styles.statLabel}>Total revenue</Text>
            </View>
          </View>
        </View>

        {/* Contact info */}
        {client.email || client.phone ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Contact</Text>
            {client.email ? (
              <View style={styles.contactRow}>
                <Feather name="mail" size={15} color={GOLD} />
                <Text style={styles.contactText}>{client.email}</Text>
              </View>
            ) : null}
            {client.phone ? (
              <View style={styles.contactRow}>
                <Feather name="phone" size={15} color={GOLD} />
                <Text style={styles.contactText}>{client.phone}</Text>
              </View>
            ) : null}
          </View>
        ) : null}

        {/* Notes */}
        {client.notes ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Notes</Text>
            <Text style={styles.notesText}>{client.notes}</Text>
          </View>
        ) : null}

        {/* Charters */}
        <Text style={styles.sectionLabel}>Charter history</Text>
        {charters.length === 0 ? (
          <View style={styles.emptyCard}>
            <Feather name="anchor" size={22} color={MUTED} />
            <Text style={styles.emptyCardText}>
              No charters linked to this client yet.
            </Text>
          </View>
        ) : (
          charters.map((c) => {
            const color = STATUS_COLORS[c.status] ?? MUTED;
            const label = STATUS_LABELS[c.status] ?? c.status;
            const gross = grossOf(c);
            return (
              <Pressable
                key={c.id}
                onPress={() =>
                  router.push({
                    pathname: "/charter-form",
                    params: { id: c.id },
                  })
                }
                accessibilityRole="button"
                accessibilityLabel={`Open charter ${fmtRange(c.start_date, c.end_date)}`}
                style={({ pressed }) => [
                  styles.charterCard,
                  pressed && { opacity: 0.85 },
                ]}
              >
                <View style={styles.charterTopRow}>
                  <Text style={styles.charterDates}>
                    {fmtRange(c.start_date, c.end_date)}
                  </Text>
                  <View style={[styles.statusPill, { borderColor: color }]}>
                    <View
                      style={[styles.statusDot, { backgroundColor: color }]}
                    />
                    <Text style={[styles.statusPillText, { color }]}>
                      {label}
                    </Text>
                  </View>
                </View>
                <View style={styles.charterMetaRow}>
                  <Text style={styles.charterMeta}>
                    {c.charter_rate_type === "per_day"
                      ? "Per day"
                      : "Fixed price"}
                  </Text>
                  <Text style={styles.charterGross}>{fmtMoney(gross)}</Text>
                </View>
                {c.departure_port || c.return_port ? (
                  <Text style={styles.charterRoute} numberOfLines={1}>
                    {[c.departure_port, c.return_port]
                      .filter(Boolean)
                      .join(" → ") || ""}
                  </Text>
                ) : null}
              </Pressable>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: NAVY },
  centerFull: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    gap: 6,
  },
  backFab: {
    position: "absolute",
    left: 16,
    zIndex: 60,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: NAVY_ELEV,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(247,243,236,0.12)",
  },
  kicker: {
    color: GOLD,
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  heroCard: {
    backgroundColor: NAVY_ELEV,
    borderRadius: 18,
    padding: 22,
    alignItems: "center",
    borderWidth: 1,
    borderColor: DIVIDER,
    marginBottom: 16,
  },
  avatarLg: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: NAVY_DEEP,
    borderWidth: 2,
    borderColor: GOLD,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  avatarLgText: {
    color: GOLD,
    fontFamily: "Gilroy-ExtraBold",
    fontSize: 22,
  },
  heroName: {
    color: IVORY,
    fontFamily: "Gilroy-ExtraBold",
    fontSize: 22,
    textAlign: "center",
  },
  heroSub: {
    color: MUTED,
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    marginTop: 4,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 18,
    width: "100%",
  },
  statBlock: { flex: 1, alignItems: "center" },
  statDivider: {
    width: 1,
    height: 36,
    backgroundColor: DIVIDER,
  },
  statValue: {
    color: GOLD,
    fontFamily: "Gilroy-ExtraBold",
    fontSize: 20,
  },
  statLabel: {
    color: MUTED,
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    letterSpacing: 0.8,
    marginTop: 2,
    textTransform: "uppercase",
  },
  card: {
    backgroundColor: NAVY_ELEV,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: DIVIDER,
    marginBottom: 14,
  },
  cardTitle: {
    color: MUTED,
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    letterSpacing: 1.2,
    marginBottom: 10,
    textTransform: "uppercase",
  },
  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 6,
  },
  contactText: {
    color: IVORY,
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    flex: 1,
  },
  notesText: {
    color: IVORY,
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    lineHeight: 20,
  },
  sectionLabel: {
    color: MUTED,
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    letterSpacing: 1.2,
    marginTop: 6,
    marginBottom: 10,
    textTransform: "uppercase",
  },
  charterCard: {
    backgroundColor: NAVY_ELEV,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: DIVIDER,
    marginBottom: 10,
  },
  charterTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  charterDates: {
    color: IVORY,
    fontFamily: "Gilroy-ExtraBold",
    fontSize: 15,
    flex: 1,
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusPillText: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    letterSpacing: 0.4,
  },
  charterMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
  },
  charterMeta: {
    color: MUTED,
    fontFamily: "Inter_400Regular",
    fontSize: 12,
  },
  charterGross: {
    color: GOLD,
    fontFamily: "Gilroy-ExtraBold",
    fontSize: 16,
  },
  charterRoute: {
    color: MUTED,
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    marginTop: 6,
  },
  emptyCard: {
    backgroundColor: NAVY_ELEV,
    borderRadius: 14,
    padding: 22,
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: DIVIDER,
  },
  emptyCardText: {
    color: MUTED,
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    textAlign: "center",
  },
  emptyTitle: {
    color: IVORY,
    fontFamily: "Gilroy-ExtraBold",
    fontSize: 18,
    textAlign: "center",
    marginTop: 8,
  },
  emptyText: {
    color: MUTED,
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    textAlign: "center",
    lineHeight: 19,
    maxWidth: 300,
    marginTop: 4,
  },
  primaryBtn: {
    backgroundColor: GOLD,
    paddingHorizontal: 22,
    paddingVertical: 13,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnText: {
    color: NAVY_DEEP,
    fontFamily: "Gilroy-ExtraBold",
    fontSize: 14,
  },
});
