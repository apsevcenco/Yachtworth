import { Feather } from "@expo/vector-icons";
import { useAuth } from "@clerk/expo";
import { useQueryClient } from "@tanstack/react-query";
import {
  getListSurveyReportsQueryKey,
  useDeleteSurveyReport,
  useListSurveyReports,
} from "@workspace/api-client-react";
import { useRouter, useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
const MUTED = "rgba(247,243,236,0.6)";
const FAINT = "rgba(247,243,236,0.4)";
const DIVIDER = "rgba(247,243,236,0.08)";
const AMBER = "#F4B860";
const RED_URGENT = "#E27D7D";
const GREEN = "#7BD389";

function fmt(iso: string | null | undefined): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

type Segment = "draft" | "complete";

export default function SurveyListScreen() {
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const router = useRouter();
  const qc = useQueryClient();
  const { isLoaded, isSignedIn } = useAuth();
  const [segment, setSegment] = useState<Segment>("draft");
  const [pendingId, setPendingId] = useState<string | null>(null);

  const listQ = useListSurveyReports({
    query: {
      queryKey: getListSurveyReportsQueryKey(),
      enabled: Boolean(isSignedIn),
      staleTime: 10_000,
    },
  });
  const deleteM = useDeleteSurveyReport();

  useFocusEffect(
    useCallback(() => {
      if (!isSignedIn) return;
      qc.invalidateQueries({ queryKey: getListSurveyReportsQueryKey() });
    }, [isSignedIn, qc]),
  );

  const items = (listQ.data?.items ?? []).filter((r) => r.status === segment);
  const draftCount = (listQ.data?.items ?? []).filter(
    (r) => r.status === "draft",
  ).length;
  const completeCount = (listQ.data?.items ?? []).filter(
    (r) => r.status === "complete",
  ).length;

  const onDelete = (id: string, name: string) => {
    Alert.alert("Delete survey?", `"${name}" will be removed permanently.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          setPendingId(id);
          try {
            await deleteM.mutateAsync({ id });
            await qc.invalidateQueries({
              queryKey: getListSurveyReportsQueryKey(),
            });
          } catch {
            Alert.alert("Delete failed", "Please try again.");
          } finally {
            setPendingId(null);
          }
        },
      },
    ]);
  };

  return (
    <View style={[styles.root, { paddingTop: (isWeb ? 67 : insets.top) + 56 }]}>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 22,
          paddingBottom: insets.bottom + 80,
        }}
        showsVerticalScrollIndicator={false}
      >
        <Pressable
          onPress={() => router.back()}
          hitSlop={10}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <Feather name="arrow-left" size={20} color={IVORY} />
        </Pressable>

        <Text style={styles.kicker}>SURVEYOR</Text>
        <Text style={styles.title}>Survey Reports</Text>
        <Text style={styles.subtitle}>
          Professional pre-purchase reports — YDSA / IIMS format.
        </Text>

        <Pressable
          onPress={() =>
            isSignedIn
              ? router.push("/survey/new")
              : router.push("/(auth)/sign-in")
          }
          style={({ pressed }) => [
            styles.newBtn,
            { opacity: pressed ? 0.85 : 1 },
          ]}
          accessibilityRole="button"
          accessibilityLabel="New survey"
        >
          <Feather name="plus-circle" size={18} color={NAVY} />
          <Text style={styles.newBtnText}>New Survey</Text>
        </Pressable>

        <View style={styles.segWrap}>
          <SegBtn
            label={`Draft  ·  ${draftCount}`}
            active={segment === "draft"}
            onPress={() => setSegment("draft")}
          />
          <SegBtn
            label={`Complete  ·  ${completeCount}`}
            active={segment === "complete"}
            onPress={() => setSegment("complete")}
          />
        </View>

        {!isLoaded ? (
          <View style={{ paddingTop: 40, alignItems: "center" }}>
            <ActivityIndicator color={GOLD} />
          </View>
        ) : !isSignedIn ? (
          <View style={styles.emptyBlock}>
            <Feather name="lock" size={28} color={GOLD} />
            <Text style={styles.emptyTitle}>Sign in required</Text>
            <Text style={styles.emptyText}>
              Sign in to create and manage survey reports.
            </Text>
            <Pressable
              onPress={() => router.push("/(auth)/sign-in")}
              style={({ pressed }) => [
                styles.newBtn,
                {
                  alignSelf: "center",
                  marginBottom: 0,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <Text style={styles.newBtnText}>Sign in</Text>
            </Pressable>
          </View>
        ) : listQ.isLoading ? (
          <View style={{ paddingTop: 40, alignItems: "center" }}>
            <ActivityIndicator color={GOLD} />
          </View>
        ) : items.length === 0 ? (
          <View style={styles.emptyBlock}>
            <Feather name="clipboard" size={28} color={GOLD} />
            <Text style={styles.emptyTitle}>
              {segment === "draft"
                ? "No draft reports"
                : "No completed reports yet"}
            </Text>
            <Text style={styles.emptyText}>
              Tap “New Survey” to start a pre-purchase inspection.
            </Text>
          </View>
        ) : (
          <View style={styles.list}>
            {items.map((it, i) => {
              const urgent = (it.total_recommendations_a ?? 0) > 0;
              const warn = (it.total_recommendations_b ?? 0) > 0;
              return (
                <View
                  key={it.id}
                  style={[
                    styles.itemWrap,
                    i === items.length - 1 && { borderBottomWidth: 0 },
                  ]}
                >
                  <Pressable
                    onPress={() => router.push(`/survey/${it.id}`)}
                    style={({ pressed }) => [
                      styles.item,
                      { opacity: pressed ? 0.85 : 1 },
                    ]}
                  >
                    <View style={{ flex: 1 }}>
                      <View style={styles.itemHead}>
                        <Text style={styles.itemTitle} numberOfLines={1}>
                          {it.vessel_name}
                        </Text>
                        <Text style={styles.itemDate}>
                          {fmt(it.survey_date ?? it.created_at)}
                        </Text>
                      </View>
                      <Text style={styles.itemSub} numberOfLines={1}>
                        {[it.manufacturer, it.model]
                          .filter(Boolean)
                          .join(" · ") || "—"}
                        {it.lying ? ` · ${it.lying}` : ""}
                      </Text>
                      <View style={styles.itemChips}>
                        <Chip
                          text={it.survey_purpose ?? "Pre-purchase"}
                          color={GOLD}
                        />
                        {urgent && (
                          <Chip
                            text={`A·${it.total_recommendations_a}`}
                            color={RED_URGENT}
                          />
                        )}
                        {warn && (
                          <Chip
                            text={`B·${it.total_recommendations_b}`}
                            color={AMBER}
                          />
                        )}
                        {!urgent && !warn && it.status === "complete" && (
                          <Chip text="Clean" color={GREEN} />
                        )}
                      </View>
                    </View>
                    <Feather
                      name="chevron-right"
                      size={18}
                      color={FAINT}
                      style={{ marginLeft: 6 }}
                    />
                  </Pressable>
                  <Pressable
                    onPress={() => onDelete(it.id, it.vessel_name)}
                    disabled={pendingId === it.id}
                    hitSlop={6}
                    accessibilityRole="button"
                    accessibilityLabel={`Delete ${it.vessel_name}`}
                    style={({ pressed }) => [
                      styles.deleteBtn,
                      { opacity: pressed || pendingId === it.id ? 0.6 : 1 },
                    ]}
                  >
                    <Feather name="trash-2" size={15} color={MUTED} />
                  </Pressable>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function SegBtn({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.segBtn,
        active && styles.segBtnActive,
        { opacity: pressed ? 0.85 : 1 },
      ]}
    >
      <Text style={[styles.segText, active && styles.segTextActive]}>
        {label}
      </Text>
    </Pressable>
  );
}

function Chip({ text, color }: { text: string; color: string }) {
  return (
    <View
      style={[
        styles.chip,
        { borderColor: `${color}55`, backgroundColor: `${color}15` },
      ]}
    >
      <Text style={[styles.chipText, { color }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: NAVY },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: NAVY_ELEV,
    marginBottom: 14,
  },
  kicker: {
    color: GOLD,
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    letterSpacing: 2,
    marginBottom: 6,
  },
  title: {
    color: IVORY,
    fontFamily: "Gilroy-ExtraBold",
    fontSize: 30,
    letterSpacing: -0.4,
    marginBottom: 8,
  },
  subtitle: {
    color: MUTED,
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    marginBottom: 18,
  },
  newBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: GOLD,
    paddingHorizontal: 18,
    paddingVertical: 13,
    borderRadius: 99,
    alignSelf: "flex-start",
    marginBottom: 18,
  },
  newBtnText: { color: NAVY, fontFamily: "Inter_700Bold", fontSize: 14 },
  segWrap: {
    flexDirection: "row",
    backgroundColor: NAVY_DEEP,
    borderRadius: 99,
    padding: 4,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: DIVIDER,
  },
  segBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 9,
    borderRadius: 99,
  },
  segBtnActive: { backgroundColor: "rgba(201,169,97,0.18)" },
  segText: { color: MUTED, fontFamily: "Inter_500Medium", fontSize: 12 },
  segTextActive: { color: GOLD, fontFamily: "Inter_700Bold" },
  emptyBlock: {
    alignItems: "center",
    backgroundColor: NAVY_DEEP,
    borderRadius: 14,
    padding: 30,
    borderWidth: 1,
    borderColor: DIVIDER,
    marginTop: 14,
    gap: 10,
  },
  emptyTitle: { color: IVORY, fontFamily: "Gilroy-ExtraBold", fontSize: 17 },
  emptyText: {
    color: MUTED,
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    textAlign: "center",
    lineHeight: 19,
  },
  list: {
    backgroundColor: NAVY_DEEP,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: DIVIDER,
    overflow: "hidden",
  },
  itemWrap: {
    flexDirection: "row",
    alignItems: "stretch",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: DIVIDER,
  },
  item: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    gap: 8,
  },
  itemHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  itemTitle: {
    flex: 1,
    color: IVORY,
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
  },
  itemDate: {
    color: FAINT,
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    marginLeft: 8,
  },
  itemSub: {
    color: MUTED,
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    marginTop: 3,
  },
  itemChips: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 },
  chip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 99,
    borderWidth: 1,
  },
  chipText: { fontFamily: "Inter_500Medium", fontSize: 10, letterSpacing: 0.4 },
  deleteBtn: {
    width: 46,
    alignItems: "center",
    justifyContent: "center",
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderLeftColor: DIVIDER,
  },
});
