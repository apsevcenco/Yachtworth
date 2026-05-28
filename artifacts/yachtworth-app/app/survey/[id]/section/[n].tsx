import { Feather } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import {
  getGetSurveyReportQueryKey,
  getListSurveyReportsQueryKey,
  useGetSurveyReport,
  useReplaceSurveyItems,
} from "@workspace/api-client-react";
import type { SurveyItem } from "@workspace/api-client-react";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  CONDITION_OPTIONS,
  REC_OPTIONS,
  SECTION_TEMPLATES,
  type ConditionLevel,
  type RecLevel,
} from "../../../../lib/surveyTemplates";

const NAVY = "#0B1E3F";
const NAVY_ELEV = "#142A52";
const NAVY_DEEP = "#081633";
const GOLD = "#C9A961";
const IVORY = "#F7F3EC";
const MUTED = "rgba(247,243,236,0.6)";
const FAINT = "rgba(247,243,236,0.4)";
const DIVIDER = "rgba(247,243,236,0.08)";
const RED_URGENT = "#E27D7D";
const AMBER = "#F4B860";
const GREEN = "#7BD389";

type Editable = {
  id?: string;
  section_number: number;
  section_name: string;
  item_number: string;
  description: string;
  condition: ConditionLevel | "";
  notes: string;
  recommendation_level: RecLevel | "";
  recommendation_text: string;
  photo_urls: string[];
  moisture_reading: string;
  moisture_level: "Low" | "Medium" | "High" | "";
  sort_order: number;
};

function toEditable(it: SurveyItem): Editable {
  return {
    id: it.id,
    section_number: it.section_number,
    section_name: it.section_name,
    item_number: it.item_number,
    description: it.description ?? "",
    condition: (it.condition as ConditionLevel) ?? "",
    notes: it.notes ?? "",
    recommendation_level: (it.recommendation_level as RecLevel) ?? "",
    recommendation_text: it.recommendation_text ?? "",
    photo_urls: Array.isArray(it.photo_urls) ? it.photo_urls : [],
    moisture_reading:
      typeof it.moisture_reading === "number" ? String(it.moisture_reading) : "",
    moisture_level:
      (it.moisture_level as "Low" | "Medium" | "High") ?? "",
    sort_order: it.sort_order ?? 0,
  };
}

export default function SurveySectionScreen() {
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const router = useRouter();
  const qc = useQueryClient();
  const params = useLocalSearchParams<{ id: string; n: string }>();
  const reportId = String(params.id ?? "");
  const sectionNumber = Number(params.n);

  const detailQ = useGetSurveyReport(reportId, {
    query: {
      queryKey: getGetSurveyReportQueryKey(reportId),
      enabled: !!reportId,
    },
  });
  const replaceM = useReplaceSurveyItems();

  const template = SECTION_TEMPLATES.find((s) => s.number === sectionNumber);
  const allItems = detailQ.data?.items ?? [];

  const [editable, setEditable] = useState<Editable[]>([]);
  const [picker, setPicker] = useState<
    | { type: "condition"; idx: number }
    | { type: "rec"; idx: number }
    | { type: "moisture"; idx: number }
    | null
  >(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const mine = allItems
      .filter((it) => it.section_number === sectionNumber)
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      .map(toEditable);
    setEditable(mine);
  }, [detailQ.data, sectionNumber]); // eslint-disable-line react-hooks/exhaustive-deps

  const showMoisture = sectionNumber === 6; // Hull section has moisture readings

  const updateItem = (idx: number, patch: Partial<Editable>) => {
    setEditable((cur) => cur.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  };

  const addItem = () => {
    const nextNum = `${sectionNumber}.${editable.length}`;
    setEditable((cur) => [
      ...cur,
      {
        section_number: sectionNumber,
        section_name: template?.name ?? `Section ${sectionNumber}`,
        item_number: nextNum,
        description: "",
        condition: "",
        notes: "",
        recommendation_level: "",
        recommendation_text: "",
        photo_urls: [],
        moisture_reading: "",
        moisture_level: "",
        sort_order: cur.length,
      },
    ]);
  };

  const removeItem = (idx: number) => {
    setEditable((cur) => cur.filter((_, i) => i !== idx));
  };

  const onSave = async () => {
    setSaving(true);
    try {
      // Server scopes replace to this section only (atomic via RPC), so other
      // sections are untouched and concurrent edits in other sections survive.
      const payloadItems = editable.map((it, i) => {
        const moistureNum = Number(it.moisture_reading);
        return {
          section_number: it.section_number,
          section_name: it.section_name,
          item_number: it.item_number,
          description: it.description || null,
          condition: it.condition || null,
          notes: it.notes || null,
          recommendation_level: it.recommendation_level || null,
          recommendation_text: it.recommendation_text || null,
          photo_urls: it.photo_urls,
          moisture_reading:
            Number.isFinite(moistureNum) && it.moisture_reading !== "" ? moistureNum : null,
          moisture_level: it.moisture_level || null,
          sort_order: i,
        };
      });
      await replaceM.mutateAsync({
        id: reportId,
        data: { section_number: sectionNumber, items: payloadItems },
      });
      await qc.invalidateQueries({ queryKey: getGetSurveyReportQueryKey(reportId) });
      await qc.invalidateQueries({ queryKey: getListSurveyReportsQueryKey() });
      router.back();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Please try again.";
      Alert.alert("Save failed", msg);
    } finally {
      setSaving(false);
    }
  };

  if (detailQ.isLoading || !template) {
    return (
      <View style={[styles.root, styles.center, { paddingTop: insets.top + 80 }]}>
        <ActivityIndicator color={GOLD} />
      </View>
    );
  }

  return (
    <View style={[styles.root, { paddingTop: (isWeb ? 67 : insets.top) + 56 }]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: 22,
            paddingBottom: insets.bottom + 120,
          }}
          keyboardShouldPersistTaps="handled"
        >
          <Pressable onPress={() => router.back()} hitSlop={10} style={styles.backBtn}>
            <Feather name="arrow-left" size={20} color={IVORY} />
          </Pressable>

          <Text style={styles.kicker}>SECTION {sectionNumber}</Text>
          <Text style={styles.title}>{template.name}</Text>

          {editable.map((it, idx) => (
            <View key={`${it.item_number}_${idx}`} style={styles.itemCard}>
              <View style={styles.itemHead}>
                <Text style={styles.itemNum}>{it.item_number}</Text>
                <TextInput
                  value={it.description}
                  onChangeText={(v) => updateItem(idx, { description: v })}
                  placeholder="What was inspected"
                  placeholderTextColor={FAINT}
                  style={styles.itemDesc}
                  multiline
                />
                <Pressable onPress={() => removeItem(idx)} hitSlop={8}>
                  <Feather name="trash-2" size={14} color={FAINT} />
                </Pressable>
              </View>

              <View style={styles.row}>
                <Text style={styles.fieldLabel}>Condition</Text>
                <Pressable
                  onPress={() => setPicker({ type: "condition", idx })}
                  style={styles.selectBtn}
                >
                  <Text style={[styles.selectText, !it.condition && { color: FAINT }]}>
                    {it.condition || "Select…"}
                  </Text>
                  <Feather name="chevron-down" size={14} color={MUTED} />
                </Pressable>
              </View>

              <Text style={styles.fieldLabel}>Notes</Text>
              <TextInput
                value={it.notes}
                onChangeText={(v) => updateItem(idx, { notes: v })}
                placeholder="Surveyor observations…"
                placeholderTextColor={FAINT}
                multiline
                style={[styles.input, { minHeight: 70, textAlignVertical: "top" }]}
              />

              <View style={[styles.row, { marginTop: 10 }]}>
                <Text style={styles.fieldLabel}>Recommendation</Text>
                <Pressable
                  onPress={() => setPicker({ type: "rec", idx })}
                  style={styles.selectBtn}
                >
                  <Text style={[styles.selectText, !it.recommendation_level && { color: FAINT }]}>
                    {it.recommendation_level
                      ? REC_OPTIONS.find((o) => o.value === it.recommendation_level)?.short ?? it.recommendation_level
                      : "None"}
                  </Text>
                  <Feather name="chevron-down" size={14} color={MUTED} />
                </Pressable>
              </View>
              {it.recommendation_level !== "" && (
                <TextInput
                  value={it.recommendation_text}
                  onChangeText={(v) => updateItem(idx, { recommendation_text: v })}
                  placeholder="Full recommendation text…"
                  placeholderTextColor={FAINT}
                  multiline
                  style={[styles.input, { minHeight: 60, marginTop: 6, textAlignVertical: "top" }]}
                />
              )}

              {showMoisture && (
                <View style={{ marginTop: 10, flexDirection: "row", gap: 8 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.fieldLabel}>Moisture %</Text>
                    <TextInput
                      value={it.moisture_reading}
                      onChangeText={(v) => updateItem(idx, { moisture_reading: v })}
                      keyboardType="decimal-pad"
                      placeholder="0–100"
                      placeholderTextColor={FAINT}
                      style={styles.input}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.fieldLabel}>Level</Text>
                    <View style={styles.pillRow}>
                      {(["Low", "Medium", "High"] as const).map((lvl) => {
                        const active = it.moisture_level === lvl;
                        return (
                          <Pressable
                            key={lvl}
                            onPress={() => updateItem(idx, { moisture_level: active ? "" : lvl })}
                            style={[styles.pill, active && styles.pillActive]}
                          >
                            <Text style={[styles.pillText, active && styles.pillTextActive]}>
                              {lvl}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                </View>
              )}
            </View>
          ))}

          <Pressable onPress={addItem} style={({ pressed }) => [styles.addBtn, { opacity: pressed ? 0.85 : 1 }]}>
            <Feather name="plus" size={16} color={GOLD} />
            <Text style={styles.addBtnText}>Add item to this section</Text>
          </Pressable>
        </ScrollView>

        <View style={[styles.saveBar, { paddingBottom: insets.bottom + 12 }]}>
          <Pressable
            onPress={onSave}
            disabled={saving}
            style={({ pressed }) => [
              styles.saveBtn,
              { opacity: pressed || saving ? 0.85 : 1 },
            ]}
          >
            {saving ? (
              <ActivityIndicator color={NAVY} />
            ) : (
              <Text style={styles.saveBtnText}>Save Section</Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      {picker && (
        <PickerSheet
          title={
            picker.type === "condition"
              ? "Select condition"
              : picker.type === "rec"
                ? "Recommendation level"
                : "Moisture level"
          }
          options={
            picker.type === "condition"
              ? CONDITION_OPTIONS.map((o) => ({ value: o.value, label: o.label }))
              : picker.type === "rec"
                ? [{ value: "", label: "None" }, ...REC_OPTIONS.map((o) => ({ value: o.value, label: `${o.short} — ${o.full}` }))]
                : [
                    { value: "Low", label: "Low" },
                    { value: "Medium", label: "Medium" },
                    { value: "High", label: "High" },
                  ]
          }
          onPick={(v) => {
            if (picker.type === "condition") {
              updateItem(picker.idx, { condition: v as ConditionLevel });
            } else if (picker.type === "rec") {
              const lvl = v as RecLevel | "";
              updateItem(picker.idx, {
                recommendation_level: lvl,
                recommendation_text:
                  lvl === ""
                    ? ""
                    : editable[picker.idx]?.recommendation_text ||
                      REC_OPTIONS.find((o) => o.value === lvl)?.full ||
                      "",
              });
            } else {
              updateItem(picker.idx, { moisture_level: v as "Low" | "Medium" | "High" });
            }
            setPicker(null);
          }}
          onClose={() => setPicker(null)}
        />
      )}
    </View>
  );
}

function PickerSheet({
  title,
  options,
  onPick,
  onClose,
}: {
  title: string;
  options: { value: string; label: string }[];
  onPick: (v: string) => void;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.sheetBg} onPress={onClose}>
        <Pressable
          style={[styles.sheet, { paddingBottom: insets.bottom + 12 }]}
          onPress={(e) => e.stopPropagation()}
        >
          <Text style={styles.sheetTitle}>{title}</Text>
          {options.map((o) => (
            <Pressable
              key={`${o.value}_${o.label}`}
              onPress={() => onPick(o.value)}
              style={({ pressed }) => [styles.sheetRow, { opacity: pressed ? 0.85 : 1 }]}
            >
              <Text style={styles.sheetRowText}>{o.label}</Text>
            </Pressable>
          ))}
        </Pressable>
      </Pressable>
    </Modal>
  );
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
  title: { color: IVORY, fontFamily: "Gilroy-ExtraBold", fontSize: 28, letterSpacing: -0.4, marginBottom: 18 },
  itemCard: {
    backgroundColor: NAVY_DEEP,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: DIVIDER,
    padding: 14,
    marginBottom: 12,
  },
  itemHead: { flexDirection: "row", alignItems: "flex-start", gap: 10, marginBottom: 10 },
  itemNum: { color: GOLD, fontFamily: "Inter_700Bold", fontSize: 13, minWidth: 38, marginTop: 4 },
  itemDesc: {
    flex: 1,
    color: IVORY,
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    paddingTop: 2,
  },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  fieldLabel: {
    color: MUTED,
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  selectBtn: {
    flex: 1,
    marginLeft: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: NAVY_ELEV,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: DIVIDER,
  },
  selectText: { color: IVORY, fontFamily: "Inter_500Medium", fontSize: 13 },
  input: {
    color: IVORY,
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    backgroundColor: NAVY_ELEV,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === "ios" ? 10 : 8,
    borderWidth: 1,
    borderColor: DIVIDER,
  },
  pillRow: { flexDirection: "row", gap: 6 },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 99,
    borderWidth: 1,
    borderColor: DIVIDER,
    backgroundColor: NAVY_ELEV,
  },
  pillActive: { borderColor: GOLD, backgroundColor: "rgba(201,169,97,0.14)" },
  pillText: { color: MUTED, fontFamily: "Inter_500Medium", fontSize: 11 },
  pillTextActive: { color: GOLD, fontFamily: "Inter_700Bold" },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "rgba(201,169,97,0.4)",
    borderStyle: "dashed",
    backgroundColor: "rgba(201,169,97,0.06)",
    marginTop: 4,
  },
  addBtnText: { color: GOLD, fontFamily: "Inter_600SemiBold", fontSize: 13 },
  saveBar: {
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
  saveBtn: {
    backgroundColor: GOLD,
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: "center",
  },
  saveBtnText: { color: NAVY, fontFamily: "Inter_700Bold", fontSize: 15 },
  sheetBg: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  sheet: { backgroundColor: NAVY_DEEP, borderTopLeftRadius: 18, borderTopRightRadius: 18, padding: 18 },
  sheetTitle: {
    color: GOLD,
    fontFamily: "Inter_700Bold",
    fontSize: 12,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: 12,
  },
  sheetRow: {
    paddingVertical: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: DIVIDER,
  },
  sheetRowText: { color: IVORY, fontFamily: "Inter_500Medium", fontSize: 14 },
});
