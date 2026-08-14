import { Feather } from "@expo/vector-icons";
import {
  getGetSurveyReportQueryKey,
  useGetSurveyReport,
} from "@workspace/api-client-react";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useMemo } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { REC_OPTIONS, type RecLevel } from "../../../lib/surveyTemplates";

const NAVY = "#0B1E3F";
const NAVY_ELEV = "#142A52";
const GOLD = "#C9A961";
const IVORY = "#F7F3EC";
const MUTED = "rgba(247,243,236,0.6)";
const DIVIDER = "rgba(247,243,236,0.08)";
const RED = "#E27D7D";
const AMBER = "#F4B860";
const BLUE = "#7AA3D9";

function badgeColor(lvl: RecLevel): string {
  if (lvl === "A") return RED;
  if (lvl === "B") return AMBER;
  return BLUE;
}

export default function RecommendationsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const reportId = String(id ?? "");

  const detailQ = useGetSurveyReport(reportId, {
    query: {
      queryKey: getGetSurveyReportQueryKey(reportId),
      enabled: !!reportId,
      staleTime: 5_000,
    },
  });

  const grouped = useMemo(() => {
    const out: Record<RecLevel, typeof detailQ.data extends undefined ? never : NonNullable<typeof detailQ.data>["items"]> = {
      A: [],
      B: [],
      C: [],
      D: [],
    } as never;
    const items = detailQ.data?.items ?? [];
    for (const it of items) {
      const lvl = it.recommendation_level;
      if (lvl === "A" || lvl === "B" || lvl === "C" || lvl === "D") {
        (out[lvl] as unknown as typeof items).push(it);
      }
    }
    return out;
  }, [detailQ.data]);

  if (detailQ.isLoading || !detailQ.data) {
    return (
      <View style={[styles.root, styles.center, { paddingTop: insets.top + 80 }]}>
        <ActivityIndicator color={GOLD} />
      </View>
    );
  }

  const total = grouped.A.length + grouped.B.length + grouped.C.length + grouped.D.length;

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 70,
          paddingBottom: insets.bottom + 40,
          paddingHorizontal: 22,
        }}
        showsVerticalScrollIndicator={false}
      >
        <Pressable onPress={() => router.back()} hitSlop={10} style={styles.backBtn}>
          <Feather name="arrow-left" size={20} color={IVORY} />
        </Pressable>
        <Text style={styles.kicker}>SECTION 23</Text>
        <Text style={styles.title}>Recommendations Summary</Text>
        <Text style={styles.subtitle}>
          {total === 0
            ? "No recommendations recorded yet — set a level on items in any section."
            : `${total} recommendation${total === 1 ? "" : "s"}, auto-collected from all items.`}
        </Text>

        {(["A", "B", "C", "D"] as RecLevel[]).map((lvl) => {
          const list = grouped[lvl];
          if (list.length === 0) return null;
          const opt = REC_OPTIONS.find((o) => o.value === lvl);
          return (
            <View key={lvl} style={styles.group}>
              <View style={styles.groupHead}>
                <View style={[styles.badge, { backgroundColor: badgeColor(lvl) }]}>
                  <Text style={styles.badgeText}>{lvl}</Text>
                </View>
                <Text style={styles.groupTitle} numberOfLines={2}>
                  {opt?.short ?? ""} — {opt?.full ?? ""}
                </Text>
                <Text style={styles.groupCount}>{list.length}</Text>
              </View>
              {list.map((it) => (
                <View key={it.id} style={styles.itemRow}>
                  <Text style={styles.itemNum}>{it.item_number}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemSec} numberOfLines={1}>
                      {it.section_name}
                    </Text>
                    <Text style={styles.itemDesc}>
                      {it.recommendation_text?.trim() ||
                        opt?.full ||
                        "—"}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: NAVY },
  center: { alignItems: "center", justifyContent: "center" },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: NAVY_ELEV,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  kicker: {
    color: GOLD,
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    letterSpacing: 2,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  title: {
    color: IVORY,
    fontFamily: "Gilroy-ExtraBold",
    fontSize: 28,
    letterSpacing: -0.3,
  },
  subtitle: {
    color: MUTED,
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    marginTop: 6,
    marginBottom: 22,
  },
  group: {
    backgroundColor: NAVY_ELEV,
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
  },
  groupHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: DIVIDER,
  },
  badge: {
    minWidth: 28,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignItems: "center",
  },
  badgeText: {
    color: NAVY,
    fontFamily: "Inter_700Bold",
    fontSize: 12,
    letterSpacing: 0.5,
  },
  groupTitle: {
    flex: 1,
    color: IVORY,
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
  },
  groupCount: {
    color: GOLD,
    fontFamily: "Inter_700Bold",
    fontSize: 13,
  },
  itemRow: {
    flexDirection: "row",
    gap: 12,
    paddingVertical: 8,
  },
  itemNum: {
    color: GOLD,
    fontFamily: "Inter_700Bold",
    fontSize: 12,
    width: 40,
  },
  itemSec: {
    color: MUTED,
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  itemDesc: {
    color: IVORY,
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    fontStyle: "italic",
    lineHeight: 18,
  },
});
