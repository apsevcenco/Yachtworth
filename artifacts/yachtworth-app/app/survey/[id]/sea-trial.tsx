import { Feather } from "@expo/vector-icons";
import {
  getGetSurveyReportQueryKey,
  useGetSurveyReport,
  useUpsertSurveySeaTrial,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
const NAVY_DEEP = "#081633";
const GOLD = "#C9A961";
const IVORY = "#F7F3EC";
const MUTED = "rgba(247,243,236,0.6)";
const DIVIDER = "rgba(247,243,236,0.08)";
const DANGER = "#E87B7B";

type RpmRow = {
  rpm: string;
  coolant_p: string;
  coolant_s: string;
  oil_p: string;
  oil_s: string;
  speed: string;
};

const EMPTY_ROW: RpmRow = {
  rpm: "",
  coolant_p: "",
  coolant_s: "",
  oil_p: "",
  oil_s: "",
  speed: "",
};

function toNum(s: string): number | null {
  const t = s.trim();
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

function fromNum(n: number | null | undefined): string {
  if (n == null) return "";
  return String(n);
}

export default function SeaTrialScreen() {
  const insets = useSafeAreaInsets();
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
  const upsertM = useUpsertSurveySeaTrial();

  const [trialDate, setTrialDate] = useState("");
  const [location, setLocation] = useState("");
  const [weather, setWeather] = useState("");
  const [seaState, setSeaState] = useState("");
  const [tickoverRpm, setTickoverRpm] = useState("");
  const [tickoverSpeed, setTickoverSpeed] = useState("");
  const [maxRpm, setMaxRpm] = useState("");
  const [maxSpeed, setMaxSpeed] = useState("");
  const [narrative, setNarrative] = useState("");
  const [observations, setObservations] = useState("");
  const [rpmRows, setRpmRows] = useState<RpmRow[]>([{ ...EMPTY_ROW }]);
  const [hydrated, setHydrated] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (hydrated) return;
    const st = detailQ.data?.sea_trial;
    if (!st) {
      if (detailQ.data) setHydrated(true);
      return;
    }
    setTrialDate(st.trial_date ?? "");
    setLocation(st.location ?? "");
    setWeather(st.weather ?? "");
    setSeaState(st.sea_state ?? "");
    setTickoverRpm(fromNum(st.tickover_rpm));
    setTickoverSpeed(fromNum(st.tickover_speed));
    setMaxRpm(fromNum(st.max_rpm));
    setMaxSpeed(fromNum(st.max_speed));
    setNarrative(st.narrative ?? "");
    setObservations(st.additional_observations ?? "");
    const rows = Array.isArray(st.rpm_table) ? st.rpm_table : [];
    if (rows.length > 0) {
      setRpmRows(
        rows.map((r) => ({
          rpm: fromNum(r.rpm),
          coolant_p: fromNum(r.coolant_p),
          coolant_s: fromNum(r.coolant_s),
          oil_p: fromNum(r.oil_p),
          oil_s: fromNum(r.oil_s),
          speed: fromNum(r.speed),
        })),
      );
    }
    setHydrated(true);
  }, [detailQ.data, hydrated]);

  const setRowField = (idx: number, k: keyof RpmRow, v: string) => {
    setRpmRows((prev) =>
      prev.map((row, i) => (i === idx ? { ...row, [k]: v } : row)),
    );
  };

  const addRow = () => setRpmRows((prev) => [...prev, { ...EMPTY_ROW }]);
  const removeRow = (idx: number) =>
    setRpmRows((prev) =>
      prev.length <= 1 ? prev : prev.filter((_, i) => i !== idx),
    );

  const onSave = async () => {
    if (!reportId) return;
    setSaving(true);
    try {
      const rpmTable = rpmRows
        .map((r) => ({
          rpm: toNum(r.rpm),
          coolant_p: toNum(r.coolant_p),
          coolant_s: toNum(r.coolant_s),
          oil_p: toNum(r.oil_p),
          oil_s: toNum(r.oil_s),
          speed: toNum(r.speed),
        }))
        .filter(
          (r) =>
            r.rpm != null ||
            r.coolant_p != null ||
            r.coolant_s != null ||
            r.oil_p != null ||
            r.oil_s != null ||
            r.speed != null,
        );
      await upsertM.mutateAsync({
        id: reportId,
        data: {
          trial_date: trialDate.trim() || null,
          location: location.trim() || null,
          weather: weather.trim() || null,
          sea_state: seaState.trim() || null,
          narrative: narrative.trim() || null,
          rpm_table: rpmTable,
          tickover_rpm: toNum(tickoverRpm) as number | null,
          tickover_speed: toNum(tickoverSpeed),
          max_rpm: toNum(maxRpm) as number | null,
          max_speed: toNum(maxSpeed),
          additional_observations: observations.trim() || null,
        },
      });
      await qc.invalidateQueries({
        queryKey: getGetSurveyReportQueryKey(reportId),
      });
      router.back();
    } catch {
      Alert.alert("Save failed", "Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (detailQ.isLoading || !detailQ.data) {
    return (
      <View style={[styles.root, styles.center, { paddingTop: insets.top + 80 }]}>
        <ActivityIndicator color={GOLD} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? insets.top + 56 : 0}
    >
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 70,
          paddingBottom: insets.bottom + 120,
          paddingHorizontal: 18,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Pressable onPress={() => router.back()} hitSlop={10} style={styles.backBtn}>
          <Feather name="arrow-left" size={20} color={IVORY} />
        </Pressable>

        <Text style={styles.kicker}>SECTION 24</Text>
        <Text style={styles.title}>Sea Trial</Text>
        <Text style={styles.subtitle}>
          RPM table, tickover and observations under way.
        </Text>

        <View style={styles.fieldRow2}>
          <Field
            label="Date"
            value={trialDate}
            onChange={setTrialDate}
            placeholder="YYYY-MM-DD"
            flex={1}
          />
          <Field label="Location" value={location} onChange={setLocation} flex={1} />
        </View>
        <View style={styles.fieldRow2}>
          <Field label="Weather" value={weather} onChange={setWeather} flex={1} />
          <Field label="Sea state" value={seaState} onChange={setSeaState} flex={1} />
        </View>
        <View style={styles.fieldRow2}>
          <Field
            label="Tickover (rpm)"
            value={tickoverRpm}
            onChange={setTickoverRpm}
            keyboardType="numeric"
            flex={1}
          />
          <Field
            label="Tickover speed (kts)"
            value={tickoverSpeed}
            onChange={setTickoverSpeed}
            keyboardType="numeric"
            flex={1}
          />
        </View>
        <View style={styles.fieldRow2}>
          <Field
            label="Max rpm"
            value={maxRpm}
            onChange={setMaxRpm}
            keyboardType="numeric"
            flex={1}
          />
          <Field
            label="Max speed (kts)"
            value={maxSpeed}
            onChange={setMaxSpeed}
            keyboardType="numeric"
            flex={1}
          />
        </View>

        <Text style={[styles.sectionHead, { marginTop: 8 }]}>RPM TABLE</Text>
        <View style={styles.rpmHeader}>
          <Text style={[styles.rpmHeadCell, { flex: 1.2 }]}>RPM</Text>
          <Text style={styles.rpmHeadCell}>Cool P</Text>
          <Text style={styles.rpmHeadCell}>Cool S</Text>
          <Text style={styles.rpmHeadCell}>Oil P</Text>
          <Text style={styles.rpmHeadCell}>Oil S</Text>
          <Text style={styles.rpmHeadCell}>Speed</Text>
          <View style={{ width: 28 }} />
        </View>
        {rpmRows.map((row, i) => (
          <View key={i} style={styles.rpmRow}>
            <RpmInput
              value={row.rpm}
              onChange={(v) => setRowField(i, "rpm", v)}
              flex={1.2}
            />
            <RpmInput
              value={row.coolant_p}
              onChange={(v) => setRowField(i, "coolant_p", v)}
            />
            <RpmInput
              value={row.coolant_s}
              onChange={(v) => setRowField(i, "coolant_s", v)}
            />
            <RpmInput
              value={row.oil_p}
              onChange={(v) => setRowField(i, "oil_p", v)}
            />
            <RpmInput
              value={row.oil_s}
              onChange={(v) => setRowField(i, "oil_s", v)}
            />
            <RpmInput
              value={row.speed}
              onChange={(v) => setRowField(i, "speed", v)}
            />
            <Pressable
              onPress={() => removeRow(i)}
              hitSlop={8}
              style={styles.rowDel}
              disabled={rpmRows.length <= 1}
            >
              <Feather
                name="x"
                size={14}
                color={rpmRows.length <= 1 ? "rgba(232,123,123,0.35)" : DANGER}
              />
            </Pressable>
          </View>
        ))}
        <Pressable onPress={addRow} style={styles.addRowBtn}>
          <Feather name="plus" size={14} color={GOLD} />
          <Text style={styles.addRowText}>Add row</Text>
        </Pressable>

        <View style={{ marginTop: 18 }}>
          <Text style={styles.label}>Narrative</Text>
          <TextInput
            value={narrative}
            onChangeText={setNarrative}
            placeholder="How the vessel handled, vibration, steering response, etc."
            placeholderTextColor={MUTED}
            multiline
            style={[styles.input, styles.textarea]}
          />
        </View>

        <View style={{ marginTop: 14 }}>
          <Text style={styles.label}>Additional observations</Text>
          <TextInput
            value={observations}
            onChangeText={setObservations}
            placeholder="Anything else the client should know."
            placeholderTextColor={MUTED}
            multiline
            style={[styles.input, styles.textarea]}
          />
        </View>
      </ScrollView>

      <View style={[styles.bar, { paddingBottom: insets.bottom + 12 }]}>
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
            <Text style={styles.saveBtnText}>Save sea trial</Text>
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  keyboardType,
  flex,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  keyboardType?: "default" | "numeric";
  flex?: number;
}) {
  return (
    <View style={[{ marginBottom: 12 }, flex != null && { flex }]}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={MUTED}
        keyboardType={keyboardType ?? "default"}
        style={styles.input}
      />
    </View>
  );
}

function RpmInput({
  value,
  onChange,
  flex,
}: {
  value: string;
  onChange: (v: string) => void;
  flex?: number;
}) {
  return (
    <TextInput
      value={value}
      onChangeText={onChange}
      keyboardType="numeric"
      style={[styles.rpmCell, flex ? { flex } : { flex: 1 }]}
      placeholderTextColor={MUTED}
    />
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
  fieldRow2: { flexDirection: "row", gap: 12 },
  label: {
    color: MUTED,
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  input: {
    backgroundColor: NAVY_ELEV,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    color: IVORY,
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    borderWidth: 1,
    borderColor: DIVIDER,
  },
  textarea: { minHeight: 90, textAlignVertical: "top" },
  sectionHead: {
    color: GOLD,
    fontFamily: "Inter_700Bold",
    fontSize: 11,
    letterSpacing: 2,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  rpmHeader: {
    flexDirection: "row",
    gap: 4,
    paddingHorizontal: 4,
    marginBottom: 4,
  },
  rpmHeadCell: {
    flex: 1,
    color: MUTED,
    fontFamily: "Inter_500Medium",
    fontSize: 10,
    letterSpacing: 0.5,
    textTransform: "uppercase",
    textAlign: "center",
  },
  rpmRow: {
    flexDirection: "row",
    gap: 4,
    alignItems: "center",
    marginBottom: 4,
  },
  rpmCell: {
    backgroundColor: NAVY_ELEV,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 8,
    color: IVORY,
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    textAlign: "center",
    borderWidth: 1,
    borderColor: DIVIDER,
  },
  rowDel: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  addRowBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 8,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "rgba(201,169,97,0.4)",
  },
  addRowText: {
    color: GOLD,
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
  },
  bar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: NAVY_DEEP,
    borderTopWidth: 1,
    borderTopColor: DIVIDER,
    paddingHorizontal: 22,
    paddingTop: 12,
  },
  saveBtn: {
    backgroundColor: GOLD,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  saveBtnText: {
    color: NAVY,
    fontFamily: "Inter_700Bold",
    fontSize: 15,
    letterSpacing: 0.5,
  },
});
