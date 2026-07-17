import { Feather } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import {
  getGetSurveyReportQueryKey,
  getListSurveyReportsQueryKey,
  useGetSurveyReport,
  useReplaceSurveyItems,
} from "@workspace/api-client-react";
import type { SurveyItem } from "@workspace/api-client-react";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActionSheetIOS,
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
  getSectionSchema,
  type ConditionLevel,
  type RecLevel,
  type SectionField,
  type SectionSchema,
} from "../../../../lib/surveyTemplates";
import {
  deleteSurveyItemPhoto,
  uploadSurveyItemPhoto,
} from "../../../../lib/surveyItemPhotoUpload";

const MAX_ITEM_PHOTOS = 10;

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
  inspected_status: string;
  defect_description: string;
  test_method: string;
  regulatory_reference: string;
  safety_critical: boolean;
  insurance_critical: boolean;
  compliance_critical: boolean;
  estimated_cost_eur: string;
  due_date: string;
  section_data: Record<string, unknown>;
  sync_status: string;
};

function toRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function toStringValue(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return value ? "yes" : "no";
  return "";
}

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
    inspected_status: it.inspected_status ?? "",
    defect_description: it.defect_description ?? "",
    test_method: it.test_method ?? "",
    regulatory_reference: it.regulatory_reference ?? "",
    safety_critical: Boolean(it.safety_critical),
    insurance_critical: Boolean(it.insurance_critical),
    compliance_critical: Boolean(it.compliance_critical),
    estimated_cost_eur:
      typeof it.estimated_cost_eur === "number" ? String(it.estimated_cost_eur) : "",
    due_date: it.due_date ?? "",
    section_data: toRecord(it.section_data),
    sync_status: it.sync_status ?? "synced",
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
  const sectionSchema = getSectionSchema(sectionNumber);
  const allItems = detailQ.data?.items ?? [];

  const [editable, setEditable] = useState<Editable[]>([]);
  const [picker, setPicker] = useState<
    | { type: "condition"; idx: number }
    | { type: "rec"; idx: number }
    | { type: "moisture"; idx: number }
    | null
  >(null);
  const [saving, setSaving] = useState(false);
  // itemId of the item currently uploading; null = idle.
  const [uploadingItemId, setUploadingItemId] = useState<string | null>(null);
  // Full-screen photo preview overlay; null = closed.
  const [preview, setPreview] = useState<{ url: string } | null>(null);
  // Auto-save bookkeeping. dirtyRef flips on any edit; auto-save interval
  // saves silently every 30 s while the screen is mounted.
  const dirtyRef = useRef(false);
  const [autoSavedAt, setAutoSavedAt] = useState<number | null>(null);

  const pickAndUploadPhoto = async (idx: number, itemId: string) => {
    const editableItem = editable[idx];
    if (!editableItem) return;
    if (editableItem.photo_urls.length >= MAX_ITEM_PHOTOS) {
      Alert.alert("Limit reached", `Up to ${MAX_ITEM_PHOTOS} photos per item.`);
      return;
    }
    const doUpload = async (uri: string) => {
      setUploadingItemId(itemId);
      try {
        const r = await uploadSurveyItemPhoto(itemId, uri);
        // Update only the local row's photo_urls. We deliberately do NOT
        // invalidate the report query here — a refetch would re-run the
        // `setEditable(mine)` effect and silently discard any unsaved
        // notes/recommendation edits in this section.
        updateItem(idx, { photo_urls: r.photo_urls });
      } catch (e) {
        Alert.alert("Upload failed", (e as Error).message);
      } finally {
        setUploadingItemId(null);
      }
    };
    const fromCamera = async () => {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        Alert.alert("Camera access needed", "Enable camera in Settings.");
        return;
      }
      const r = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 1,
      });
      if (r.canceled || !r.assets?.[0]) return;
      await doUpload(r.assets[0].uri);
    };
    const fromLibrary = async () => {
      if (Platform.OS !== "web") {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) {
          Alert.alert("Photo access needed", "Enable photo library in Settings.");
          return;
        }
      }
      const remaining = MAX_ITEM_PHOTOS - editableItem.photo_urls.length;
      const r = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: remaining > 1,
        selectionLimit: Math.min(remaining, 5),
        quality: 1,
      });
      if (r.canceled || !r.assets?.length) return;
      // Sequential upload keeps order deterministic and respects the
      // server-side row lock added in migration 021.
      for (const a of r.assets.slice(0, remaining)) {
        await doUpload(a.uri);
      }
    };
    if (Platform.OS === "web") {
      void fromLibrary();
      return;
    }
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ["Cancel", "Take photo", "Choose from library"],
          cancelButtonIndex: 0,
        },
        (i) => {
          if (i === 1) void fromCamera();
          else if (i === 2) void fromLibrary();
        },
      );
    } else {
      Alert.alert("Add photo", undefined, [
        { text: "Cancel", style: "cancel" },
        { text: "Take photo", onPress: fromCamera },
        { text: "Choose from library", onPress: fromLibrary },
      ]);
    }
  };

  const removePhoto = (idx: number, itemId: string, url: string) => {
    Alert.alert("Remove photo?", undefined, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          setUploadingItemId(itemId);
          try {
            const r = await deleteSurveyItemPhoto(itemId, url);
            // Same reasoning as upload: avoid invalidate to preserve
            // unsaved edits in this section's other fields.
            updateItem(idx, { photo_urls: r.photo_urls });
          } catch (e) {
            Alert.alert("Delete failed", (e as Error).message);
          } finally {
            setUploadingItemId(null);
          }
        },
      },
    ]);
  };

  useEffect(() => {
    const mine = allItems
      .filter((it) => it.section_number === sectionNumber)
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      .map(toEditable);
    setEditable(mine);
  }, [detailQ.data, sectionNumber]); // eslint-disable-line react-hooks/exhaustive-deps

  const showMoisture = sectionNumber === 6; // Hull section has moisture readings

  const updateItem = (idx: number, patch: Partial<Editable>) => {
    dirtyRef.current = true;
    setEditable((cur) => cur.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  };

  const moveItem = (idx: number, dir: -1 | 1) => {
    setEditable((cur) => {
      const next = idx + dir;
      if (next < 0 || next >= cur.length) return cur;
      const copy = cur.slice();
      const tmp = copy[idx]!;
      copy[idx] = copy[next]!;
      copy[next] = tmp;
      dirtyRef.current = true;
      return copy;
    });
  };

  const addItem = () => {
    dirtyRef.current = true;
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
        inspected_status: "",
        defect_description: "",
        test_method: "",
        regulatory_reference: "",
        safety_critical: false,
        insurance_critical: false,
        compliance_critical: false,
        estimated_cost_eur: "",
        due_date: "",
        section_data: {},
        sync_status: "local",
      },
    ]);
  };

  const removeItem = (idx: number) => {
    dirtyRef.current = true;
    setEditable((cur) => cur.filter((_, i) => i !== idx));
  };

  const onSave = async (opts: { silent?: boolean } = {}) => {
    const { silent = false } = opts;
    setSaving(true);
    try {
      // Pull the freshest server state for this report and overlay any
      // photo_urls that changed since the editor was opened. Without this,
      // the section replace would send a stale `photo_urls` snapshot and
      // could roll back uploads/deletes performed elsewhere.
      let freshById = new Map<string, string[]>();
      try {
        const fresh = await detailQ.refetch();
        const items = fresh.data?.items ?? [];
        freshById = new Map(
          items
            .filter((i) => i.id)
            .map((i) => [i.id as string, Array.isArray(i.photo_urls) ? i.photo_urls : []]),
        );
      } catch {
        // Best-effort — if refetch fails, fall back to local snapshot.
      }
      // Server scopes replace to this section only (atomic via RPC), so other
      // sections are untouched and concurrent edits in other sections survive.
      const payloadItems = editable.map((it, i) => {
        const moistureNum = Number(it.moisture_reading);
        const costNum = Number(it.estimated_cost_eur);
        return {
          section_number: it.section_number,
          section_name: it.section_name,
          item_number: it.item_number,
          description: it.description || null,
          condition: it.condition || null,
          notes: it.notes || null,
          recommendation_level: it.recommendation_level || null,
          recommendation_text: it.recommendation_text || null,
          // Prefer the freshly-fetched photo_urls for existing items so a
          // concurrent upload between editor-open and save survives.
          photo_urls: (it.id && freshById.get(it.id)) || it.photo_urls,
          moisture_reading:
            Number.isFinite(moistureNum) && it.moisture_reading !== "" ? moistureNum : null,
          moisture_level: it.moisture_level || null,
          sort_order: i,
          inspected_status: it.inspected_status || null,
          defect_description: it.defect_description || null,
          test_method: it.test_method || null,
          regulatory_reference: it.regulatory_reference || null,
          safety_critical: it.safety_critical,
          insurance_critical: it.insurance_critical,
          compliance_critical: it.compliance_critical,
          estimated_cost_eur:
            Number.isFinite(costNum) && it.estimated_cost_eur !== "" ? costNum : null,
          due_date: it.due_date || null,
          section_data: it.section_data,
          sync_status: it.sync_status || "synced",
        };
      });
      await replaceM.mutateAsync({
        id: reportId,
        data: { section_number: sectionNumber, items: payloadItems },
      });
      dirtyRef.current = false;
      if (silent) {
        // Don't invalidate — that would refetch and the re-seed effect would
        // wipe any keystrokes the user has typed since this auto-save started.
        setAutoSavedAt(Date.now());
      } else {
        await qc.invalidateQueries({ queryKey: getGetSurveyReportQueryKey(reportId) });
        await qc.invalidateQueries({ queryKey: getListSurveyReportsQueryKey() });
        router.back();
      }
    } catch (e: unknown) {
      if (!silent) {
        const msg = e instanceof Error ? e.message : "Please try again.";
        Alert.alert("Save failed", msg);
      }
      // Silent saves swallow errors — the user can still hit Save manually
      // and will see a real alert if it still fails.
    } finally {
      setSaving(false);
    }
  };

  // Auto-save every 30 s, but only when there are unsaved edits, the editor
  // isn't already mid-save, and no picker/preview/upload is open (those would
  // be disorienting if data shifted under the user). Silent saves do NOT
  // invalidate React Query, so the re-seed effect won't wipe in-flight edits.
  useEffect(() => {
    if (!reportId || !template) return;
    const t = setInterval(() => {
      if (!dirtyRef.current) return;
      if (saving || uploadingItemId || picker || preview) return;
      void onSave({ silent: true });
    }, 30_000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportId, template, saving, uploadingItemId, picker, preview]);

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
                <View style={styles.reorderCol}>
                  <Pressable
                    onPress={() => moveItem(idx, -1)}
                    disabled={idx === 0}
                    hitSlop={6}
                    style={styles.reorderBtn}
                  >
                    <Feather name="chevron-up" size={14} color={idx === 0 ? FAINT : MUTED} />
                  </Pressable>
                  <Pressable
                    onPress={() => moveItem(idx, 1)}
                    disabled={idx === editable.length - 1}
                    hitSlop={6}
                    style={styles.reorderBtn}
                  >
                    <Feather
                      name="chevron-down"
                      size={14}
                      color={idx === editable.length - 1 ? FAINT : MUTED}
                    />
                  </Pressable>
                </View>
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

              {sectionSchema && (
                <SectionSpecificFields
                  schema={sectionSchema}
                  item={it}
                  onChange={(patch) => updateItem(idx, patch)}
                />
              )}

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

              {/* Photos — only after item has been saved (needs server id) */}
              <View style={{ marginTop: 12 }}>
                <Text style={styles.fieldLabel}>
                  Photos ({it.photo_urls.length}/{MAX_ITEM_PHOTOS})
                </Text>
                {!it.id ? (
                  <View style={styles.photoHint}>
                    <Feather name="info" size={12} color={MUTED} />
                    <Text style={styles.photoHintText}>
                      Save section once to attach photos to this item.
                    </Text>
                  </View>
                ) : (
                  <View style={styles.photoGrid}>
                    {it.photo_urls.map((url) => (
                      <View key={url} style={styles.photoThumbWrap}>
                        <Pressable onPress={() => setPreview({ url })}>
                          <Image
                            source={{ uri: url }}
                            style={styles.photoThumb}
                            contentFit="cover"
                          />
                        </Pressable>
                        <Pressable
                          onPress={() => removePhoto(idx, it.id!, url)}
                          hitSlop={8}
                          style={styles.photoRemove}
                        >
                          <Feather name="x" size={12} color={IVORY} />
                        </Pressable>
                      </View>
                    ))}
                    {it.photo_urls.length < MAX_ITEM_PHOTOS && (
                      <Pressable
                        onPress={() => pickAndUploadPhoto(idx, it.id!)}
                        disabled={uploadingItemId === it.id}
                        style={({ pressed }) => [
                          styles.photoAdd,
                          { opacity: pressed || uploadingItemId === it.id ? 0.6 : 1 },
                        ]}
                      >
                        {uploadingItemId === it.id ? (
                          <ActivityIndicator color={GOLD} size="small" />
                        ) : (
                          <Feather name="plus" size={20} color={GOLD} />
                        )}
                      </Pressable>
                    )}
                  </View>
                )}
              </View>

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
          {autoSavedAt && (
            <Text style={styles.autoSavedHint}>
              Auto-saved · {new Date(autoSavedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </Text>
          )}
          <Pressable
            onPress={() => onSave()}
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

      {preview && (
        <Modal
          transparent
          animationType="fade"
          onRequestClose={() => setPreview(null)}
        >
          <View style={styles.previewBg}>
            {/* ScrollView gives free pinch-to-zoom on iOS via maximumZoomScale.
                Android falls back to tap-to-dismiss (native ScrollView ignores
                maximumZoomScale on Android — true cross-platform pinch would
                need a gesture-handler wrapper, deferred). */}
            <ScrollView
              style={{ flex: 1, width: "100%" }}
              contentContainerStyle={styles.previewScrollContent}
              maximumZoomScale={3}
              minimumZoomScale={1}
              centerContent
              showsHorizontalScrollIndicator={false}
              showsVerticalScrollIndicator={false}
            >
              <Pressable onPress={() => setPreview(null)} style={{ flex: 1, width: "100%" }}>
                <Image
                  source={{ uri: preview.url }}
                  style={styles.previewImg}
                  contentFit="contain"
                />
              </Pressable>
            </ScrollView>
            <Pressable
              onPress={() => setPreview(null)}
              hitSlop={12}
              style={[styles.previewClose, { top: insets.top + 12 }]}
            >
              <Feather name="x" size={22} color={IVORY} />
            </Pressable>
          </View>
        </Modal>
      )}

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

function SectionSpecificFields({
  schema,
  item,
  onChange,
}: {
  schema: SectionSchema;
  item: Editable;
  onChange: (patch: Partial<Editable>) => void;
}) {
  const setField = (key: string, value: unknown) => {
    onChange({ section_data: { ...item.section_data, [key]: value } });
  };

  return (
    <View style={styles.professionalBox}>
      <Text style={styles.professionalTitle}>{schema.title}</Text>
      {schema.fields.map((field) => (
        <SectionFieldInput
          key={field.key}
          field={field}
          value={item.section_data[field.key]}
          onChange={(value) => setField(field.key, value)}
        />
      ))}
      <Text style={[styles.fieldLabel, { marginTop: 10 }]}>Inspection status</Text>
      <View style={styles.pillRowWrap}>
        {["Inspected", "Partly inspected", "Not inspected", "Not applicable"].map((status) => {
          const active = item.inspected_status === status;
          return (
            <Pressable
              key={status}
              onPress={() => onChange({ inspected_status: active ? "" : status })}
              style={[styles.pill, active && styles.pillActive]}
            >
              <Text style={[styles.pillText, active && styles.pillTextActive]}>{status}</Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={[styles.fieldLabel, { marginTop: 10 }]}>Critical flags</Text>
      <View style={styles.pillRowWrap}>
        {[
          { key: "safety_critical", label: "Safety" },
          { key: "insurance_critical", label: "Insurance" },
          { key: "compliance_critical", label: "Compliance" },
        ].map((flag) => {
          const key = flag.key as "safety_critical" | "insurance_critical" | "compliance_critical";
          const active = item[key];
          return (
            <Pressable
              key={flag.key}
              onPress={() => {
                const patch: Partial<Editable> = { [key]: !active };
                onChange(patch);
              }}
              style={[styles.pill, active && styles.pillUrgent]}
            >
              <Text style={[styles.pillText, active && styles.pillUrgentText]}>{flag.label}</Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={[styles.fieldLabel, { marginTop: 10 }]}>Defect / finding</Text>
      <TextInput
        value={item.defect_description}
        onChangeText={(v) => onChange({ defect_description: v })}
        placeholder="Specific defect, limitation, or notable finding..."
        placeholderTextColor={FAINT}
        multiline
        style={[styles.input, { minHeight: 60, textAlignVertical: "top" }]}
      />
      <View style={styles.professionalGrid}>
        <View style={styles.professionalGridCell}>
          <Text style={styles.fieldLabel}>Test method</Text>
          <TextInput
            value={item.test_method}
            onChangeText={(v) => onChange({ test_method: v })}
            placeholder="Visual / tested / observed"
            placeholderTextColor={FAINT}
            style={styles.input}
          />
        </View>
        <View style={styles.professionalGridCell}>
          <Text style={styles.fieldLabel}>Reference</Text>
          <TextInput
            value={item.regulatory_reference}
            onChangeText={(v) => onChange({ regulatory_reference: v })}
            placeholder="ISO / ABYC / MCA / RCD"
            placeholderTextColor={FAINT}
            style={styles.input}
          />
        </View>
      </View>
      <View style={styles.professionalGrid}>
        <View style={styles.professionalGridCell}>
          <Text style={styles.fieldLabel}>Est. cost EUR</Text>
          <TextInput
            value={item.estimated_cost_eur}
            onChangeText={(v) => onChange({ estimated_cost_eur: v })}
            keyboardType="decimal-pad"
            placeholder="0"
            placeholderTextColor={FAINT}
            style={styles.input}
          />
        </View>
        <View style={styles.professionalGridCell}>
          <Text style={styles.fieldLabel}>Due date</Text>
          <TextInput
            value={item.due_date}
            onChangeText={(v) => onChange({ due_date: v })}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={FAINT}
            style={styles.input}
          />
        </View>
      </View>
    </View>
  );
}

function SectionFieldInput({
  field,
  value,
  onChange,
}: {
  field: SectionField;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  if (field.type === "boolean") {
    return (
      <View style={styles.sectionField}>
        <Text style={styles.fieldLabel}>{field.label}</Text>
        <View style={styles.pillRow}>
          {[
            { label: "Yes", value: true },
            { label: "No", value: false },
          ].map((option) => {
            const active = value === option.value;
            return (
              <Pressable
                key={option.label}
                onPress={() => onChange(active ? null : option.value)}
                style={[styles.pill, active && styles.pillActive]}
              >
                <Text style={[styles.pillText, active && styles.pillTextActive]}>
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    );
  }

  if (field.type === "select") {
    return (
      <View style={styles.sectionField}>
        <Text style={styles.fieldLabel}>{field.label}</Text>
        <View style={styles.pillRowWrap}>
          {(field.options ?? []).map((option) => {
            const active = value === option;
            return (
              <Pressable
                key={option}
                onPress={() => onChange(active ? "" : option)}
                style={[styles.pill, active && styles.pillActive]}
              >
                <Text style={[styles.pillText, active && styles.pillTextActive]}>{option}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.sectionField}>
      <Text style={styles.fieldLabel}>{field.label}</Text>
      <TextInput
        value={toStringValue(value)}
        onChangeText={(text) => onChange(text)}
        keyboardType={field.type === "number" ? "decimal-pad" : "default"}
        placeholder={field.placeholder ?? field.unit ?? ""}
        placeholderTextColor={FAINT}
        multiline={field.type === "textarea"}
        style={[
          styles.input,
          field.type === "textarea" && { minHeight: 60, textAlignVertical: "top" },
        ]}
      />
    </View>
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
  pillRowWrap: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 99,
    borderWidth: 1,
    borderColor: DIVIDER,
    backgroundColor: NAVY_ELEV,
  },
  pillActive: { borderColor: GOLD, backgroundColor: "rgba(201,169,97,0.14)" },
  pillUrgent: { borderColor: RED_URGENT, backgroundColor: "rgba(226,125,125,0.14)" },
  pillText: { color: MUTED, fontFamily: "Inter_500Medium", fontSize: 11 },
  pillTextActive: { color: GOLD, fontFamily: "Inter_700Bold" },
  pillUrgentText: { color: RED_URGENT, fontFamily: "Inter_700Bold" },
  professionalBox: {
    backgroundColor: "rgba(247,243,236,0.035)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: DIVIDER,
    padding: 12,
    marginTop: 12,
  },
  professionalTitle: {
    color: GOLD,
    fontFamily: "Inter_700Bold",
    fontSize: 12,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 10,
  },
  sectionField: { marginBottom: 10 },
  professionalGrid: { flexDirection: "row", gap: 8, marginTop: 10 },
  professionalGridCell: { flex: 1 },
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
  photoGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 },
  photoThumbWrap: { position: "relative" },
  photoThumb: {
    width: 64,
    height: 64,
    borderRadius: 8,
    backgroundColor: NAVY_ELEV,
  },
  photoRemove: {
    position: "absolute",
    top: -6,
    right: -6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "rgba(0,0,0,0.7)",
    borderWidth: 1,
    borderColor: DIVIDER,
    alignItems: "center",
    justifyContent: "center",
  },
  photoAdd: {
    width: 64,
    height: 64,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: "rgba(201,169,97,0.4)",
    borderStyle: "dashed",
    backgroundColor: "rgba(201,169,97,0.06)",
    alignItems: "center",
    justifyContent: "center",
  },
  photoHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
  },
  photoHintText: { color: MUTED, fontFamily: "Inter_400Regular", fontSize: 11 },
  previewBg: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.92)",
    alignItems: "center",
    justifyContent: "center",
  },
  previewScrollContent: { flexGrow: 1, justifyContent: "center" },
  previewImg: { width: "100%", height: "100%", minHeight: 400 },
  reorderCol: { flexDirection: "column", alignItems: "center", gap: 2, marginRight: 4 },
  reorderBtn: { padding: 2 },
  autoSavedHint: {
    color: MUTED,
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    textAlign: "center",
    marginBottom: 6,
  },
  previewClose: {
    position: "absolute",
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
  },
});
