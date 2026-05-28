import { Feather } from "@expo/vector-icons";
import {
  getGetSurveyReportQueryKey,
  useGetSurveyReport,
  useUpdateSurveyReport,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import React, { useCallback, useMemo } from "react";
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

import { SECTION_TEMPLATES, sectionStatus } from "../../../lib/surveyTemplates";

const NAVY = "#0B1E3F";
const NAVY_ELEV = "#142A52";
const NAVY_DEEP = "#081633";
const GOLD = "#C9A961";
const IVORY = "#F7F3EC";
const MUTED = "rgba(247,243,236,0.6)";
const FAINT = "rgba(247,243,236,0.4)";
const DIVIDER = "rgba(247,243,236,0.08)";
const GREEN = "#7BD389";
const AMBER = "#F4B860";
const RED_URGENT = "#E27D7D";

export default function SurveySectionsScreen() {
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const router = useRouter();
  const qc = useQueryClient();
  const { id } = useLocalSearchParams<{ id: string }>();
  const reportId = String(id ?? "");

  const detailQ = useGetSurveyReport(reportId, {
    query: {
      queryKey: getGetSurveyReportQueryKey(reportId),
      enabled: !!reportId,
      staleTime: 5_000,
    },
  });
  const updateM = useUpdateSurveyReport();

  useFocusEffect(
    useCallback(() => {
      if (reportId) qc.invalidateQueries({ queryKey: getGetSurveyReportQueryKey(reportId) });
    }, [qc, reportId]),
  );

  const data = detailQ.data;
  const items = data?.items ?? [];
  const report = data?.report;

  const sectionsWithStatus = useMemo(() => {
    return SECTION_TEMPLATES.map((s) => {
      const sectionItems = items.filter((it) => it.section_number === s.number);
      const totalItems = sectionItems.length;
      const filledItems = sectionItems.filter(
        (it) => !!it.condition || !!it.notes || !!it.recommendation_level,
      ).length;
      const hasRecA = sectionItems.some((it) => it.recommendation_level === "A");
      const hasAnyRec = sectionItems.some((it) => !!it.recommendation_level);
      const status =
        s.kind === "items"
          ? sectionStatus({ totalItems, filledItems, hasRecA, hasAnyRec })
          : "empty";
      return { sec: s, status, hasRecA, hasAnyRec, filledItems, totalItems };
    });
  }, [items]);

  const completedCount = sectionsWithStatus.filter(
    (s) => s.sec.kind === "items" && s.status === "complete",
  ).length;
  const totalItemSections = sectionsWithStatus.filter((s) => s.sec.kind === "items").length;

  const onToggleStatus = async () => {
    if (!report) return;
    const next = report.status === "complete" ? "draft" : "complete";
    try {
      await updateM.mutateAsync({ id: reportId, data: { status: next } });
      await qc.invalidateQueries({ queryKey: getGetSurveyReportQueryKey(reportId) });
    } catch {
      Alert.alert("Update failed", "Please try again.");
    }
  };

  const onGeneratePdf = () => {
    Alert.alert(
      "PDF export — coming soon",
      "The professional multi-page PDF builder will be in the next update. Continue filling in sections.",
    );
  };

  if (detailQ.isLoading || !report) {
    return (
      <View style={[styles.root, styles.center, { paddingTop: insets.top + 80 }]}>
        <ActivityIndicator color={GOLD} />
      </View>
    );
  }

  return (
    <View style={[styles.root, { paddingTop: (isWeb ? 67 : insets.top) + 56 }]}>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 22,
          paddingBottom: insets.bottom + 120,
        }}
        showsVerticalScrollIndicator={false}
      >
        <Pressable onPress={() => router.replace("/survey")} hitSlop={10} style={styles.backBtn}>
          <Feather name="arrow-left" size={20} color={IVORY} />
        </Pressable>

        <Text style={styles.kicker}>
          {report.status === "complete" ? "COMPLETE" : "DRAFT"} ·{" "}
          {report.survey_purpose ?? "Pre-purchase"}
        </Text>
        <Text style={styles.title} numberOfLines={2}>
          {report.vessel_name}
        </Text>
        <Text style={styles.subtitle}>
          {[report.manufacturer, report.model].filter(Boolean).join(" · ") || "—"}
          {report.lying ? ` · ${report.lying}` : ""}
        </Text>

        <View style={styles.metaRow}>
          <Pressable onPress={onToggleStatus} style={styles.metaBtn}>
            <Feather
              name={report.status === "complete" ? "rotate-ccw" : "check"}
              size={14}
              color={GOLD}
            />
            <Text style={styles.metaBtnText}>
              {report.status === "complete" ? "Mark as draft" : "Mark complete"}
            </Text>
          </Pressable>
        </View>

        <Text style={styles.progressText}>
          PROGRESS · {completedCount} of {totalItemSections} sections complete
        </Text>

        <View style={styles.list}>
          {sectionsWithStatus.map(({ sec, status, hasRecA, hasAnyRec }, i) => {
            const isLast = i === sectionsWithStatus.length - 1;
            const interactive = sec.kind === "items";
            return (
              <Pressable
                key={sec.number}
                onPress={() => {
                  if (sec.kind === "items") {
                    router.push(`/survey/${reportId}/section/${sec.number}`);
                  } else if (sec.kind === "auto_recs") {
                    Alert.alert(
                      "Auto-generated",
                      "Section 23 is auto-filled from items where you set a recommendation.",
                    );
                  } else if (sec.kind === "sea_trial") {
                    Alert.alert("Sea Trial — coming soon", "RPM table + narrative entry in next update.");
                  } else if (sec.kind === "pictures") {
                    Alert.alert("Pictures gallery", "All photos from all items will be collected here in the PDF.");
                  } else if (sec.kind === "declaration") {
                    Alert.alert("Declaration", "Standard declaration text + your signature appear here in the PDF.");
                  } else {
                    Alert.alert(sec.name, sec.staticContent ?? "Static section text.");
                  }
                }}
                style={({ pressed }) => [
                  styles.row,
                  isLast && { borderBottomWidth: 0 },
                  { opacity: pressed && interactive ? 0.85 : 1 },
                ]}
              >
                <StatusDot status={hasRecA ? "urgent" : hasAnyRec ? "warning" : status} />
                <Text style={styles.rowNum}>{sec.number}.</Text>
                <Text style={styles.rowName} numberOfLines={1}>
                  {sec.name}
                </Text>
                {hasRecA && <View style={[styles.recBadge, { backgroundColor: RED_URGENT }]}><Text style={styles.recBadgeText}>A</Text></View>}
                {!hasRecA && hasAnyRec && <View style={[styles.recBadge, { backgroundColor: AMBER }]}><Text style={[styles.recBadgeText, { color: NAVY }]}>!</Text></View>}
                <Feather name="chevron-right" size={16} color={FAINT} />
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      <View style={[styles.bar, { paddingBottom: insets.bottom + 12 }]}>
        <Pressable
          onPress={onGeneratePdf}
          style={({ pressed }) => [styles.pdfBtn, { opacity: pressed ? 0.85 : 1 }]}
        >
          <Feather name="file-text" size={16} color={NAVY} />
          <Text style={styles.pdfBtnText}>Generate PDF Report</Text>
        </Pressable>
      </View>
    </View>
  );
}

function StatusDot({ status }: { status: string }) {
  let color: string = FAINT;
  let icon: React.ComponentProps<typeof Feather>["name"] = "circle";
  if (status === "complete") {
    color = GREEN;
    icon = "check-circle";
  } else if (status === "warning") {
    color = AMBER;
    icon = "alert-triangle";
  } else if (status === "urgent") {
    color = RED_URGENT;
    icon = "alert-octagon";
  } else if (status === "partial") {
    color = GOLD;
    icon = "edit-3";
  }
  return <Feather name={icon} size={14} color={color} style={{ marginRight: 10 }} />;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: NAVY },
  center: { alignItems: "center", justifyContent: "center" },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: NAVY_ELEV,
    marginBottom: 14,
  },
  kicker: { color: GOLD, fontFamily: "Inter_500Medium", fontSize: 11, letterSpacing: 2, marginBottom: 6 },
  title: { color: IVORY, fontFamily: "Gilroy-ExtraBold", fontSize: 28, letterSpacing: -0.4, marginBottom: 6 },
  subtitle: { color: MUTED, fontFamily: "Inter_400Regular", fontSize: 13, marginBottom: 14 },
  metaRow: { flexDirection: "row", gap: 8, marginBottom: 18 },
  metaBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 99,
    borderWidth: 1,
    borderColor: "rgba(201,169,97,0.4)",
    backgroundColor: "rgba(201,169,97,0.08)",
  },
  metaBtnText: { color: GOLD, fontFamily: "Inter_600SemiBold", fontSize: 12 },
  progressText: {
    color: MUTED,
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    letterSpacing: 1.5,
    marginBottom: 10,
  },
  list: {
    backgroundColor: NAVY_DEEP,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: DIVIDER,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: DIVIDER,
    gap: 4,
  },
  rowNum: { color: FAINT, fontFamily: "Inter_500Medium", fontSize: 13, width: 32 },
  rowName: { flex: 1, color: IVORY, fontFamily: "Inter_500Medium", fontSize: 14 },
  recBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    minWidth: 22,
    alignItems: "center",
    marginRight: 6,
  },
  recBadgeText: { color: IVORY, fontFamily: "Inter_700Bold", fontSize: 10, letterSpacing: 0.5 },
  bar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 22,
    paddingTop: 12,
    backgroundColor: NAVY,
    borderTopWidth: 1,
    borderTopColor: DIVIDER,
  },
  pdfBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: GOLD,
    paddingVertical: 15,
    borderRadius: 14,
  },
  pdfBtnText: { color: NAVY, fontFamily: "Inter_700Bold", fontSize: 15 },
});
