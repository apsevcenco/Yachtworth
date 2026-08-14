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

const NAVY = "#07000B";
const NAVY_ELEV = "#2C003F";
const NAVY_DEEP = "#1D002B";
const GOLD = "#C8FF00";
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

type TrialColumn = {
  id: string;
  label: string;
};

type TrialTableRow = {
  id: string;
  cells: Record<string, string>;
};

const DEFAULT_COLUMNS: TrialColumn[] = [
  { id: "rpm", label: "RPM" },
  { id: "coolant_p", label: "Cool P" },
  { id: "coolant_s", label: "Cool S" },
  { id: "oil_p", label: "Oil P" },
  { id: "oil_s", label: "Oil S" },
  { id: "speed", label: "Speed" },
];

const LEGACY_KEYS = DEFAULT_COLUMNS.map((c) => c.id) as Array<keyof RpmRow>;

function makeId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

function emptyCells(columns: TrialColumn[]): Record<string, string> {
  return Object.fromEntries(columns.map((c) => [c.id, ""]));
}

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
  const [tableColumns, setTableColumns] = useState<TrialColumn[]>(DEFAULT_COLUMNS);
  const [tableRows, setTableRows] = useState<TrialTableRow[]>([
    { id: makeId("row"), cells: emptyCells(DEFAULT_COLUMNS) },
  ]);
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
    const savedColumns = Array.isArray(st.rpm_table_columns)
      ? st.rpm_table_columns
          .map((c, i) => ({
            id: typeof c.id === "string" && c.id.trim() ? c.id : `col_${i + 1}`,
            label:
              typeof c.label === "string" && c.label.trim()
                ? c.label
                : `Column ${i + 1}`,
          }))
          .filter((c) => c.id.trim())
      : [];
    const columns = savedColumns.length ? savedColumns : DEFAULT_COLUMNS;
    setTableColumns(columns);

    const savedRows = Array.isArray(st.rpm_table_rows) ? st.rpm_table_rows : [];
    if (savedRows.length > 0) {
      setTableRows(
        savedRows.map((r, i) => {
          const sourceCells =
            r && typeof r.cells === "object" && r.cells != null
              ? (r.cells as Record<string, unknown>)
              : {};
          return {
            id: typeof r.id === "string" && r.id.trim() ? r.id : `row_${i + 1}`,
            cells: Object.fromEntries(
              columns.map((c) => {
                const value = sourceCells[c.id];
                return [c.id, value == null ? "" : String(value)];
              }),
            ),
          };
        }),
      );
    } else {
      const rows = Array.isArray(st.rpm_table) ? st.rpm_table : [];
      setTableRows(
        rows.length > 0
          ? rows.map((r, i) => ({
              id: `row_${i + 1}`,
              cells: Object.fromEntries(
                columns.map((c) => {
                  const key = c.id as keyof RpmRow;
                  return [c.id, fromNum((r as Record<string, number | null | undefined>)[key])];
                }),
              ),
            }))
          : [{ id: makeId("row"), cells: emptyCells(columns) }],
      );
    }
    setHydrated(true);
  }, [detailQ.data, hydrated]);

  const setColumnLabel = (columnId: string, label: string) => {
    setTableColumns((prev) =>
      prev.map((c) => (c.id === columnId ? { ...c, label } : c)),
    );
  };

  const addColumn = () => {
    const column: TrialColumn = {
      id: makeId("col"),
      label: `Column ${tableColumns.length + 1}`,
    };
    setTableColumns((prev) => [...prev, column]);
    setTableRows((prev) =>
      prev.map((row) => ({ ...row, cells: { ...row.cells, [column.id]: "" } })),
    );
  };

  const removeColumn = (columnId: string) => {
    if (tableColumns.length <= 1) return;
    setTableColumns((prev) => prev.filter((c) => c.id !== columnId));
    setTableRows((prev) =>
      prev.map((row) => {
        const nextCells = { ...row.cells };
        delete nextCells[columnId];
        return { ...row, cells: nextCells };
      }),
    );
  };

  const setCell = (rowId: string, columnId: string, value: string) => {
    setTableRows((prev) =>
      prev.map((row) =>
        row.id === rowId
          ? { ...row, cells: { ...row.cells, [columnId]: value } }
          : row,
      ),
    );
  };

  const addRow = () =>
    setTableRows((prev) => [
      ...prev,
      { id: makeId("row"), cells: emptyCells(tableColumns) },
    ]);
  const removeRow = (rowId: string) =>
    setTableRows((prev) =>
      prev.length <= 1 ? prev : prev.filter((row) => row.id !== rowId),
    );

  const onSave = async () => {
    if (!reportId) return;
    setSaving(true);
    try {
      const cleanColumns = tableColumns.map((c, i) => ({
        id: c.id,
        label: c.label.trim() || `Column ${i + 1}`,
      }));
      const cleanRows = tableRows
        .map((row) => ({
          id: row.id,
          cells: Object.fromEntries(
            cleanColumns.map((c) => [c.id, (row.cells[c.id] ?? "").trim()]),
          ),
        }))
        .filter((row) => Object.values(row.cells).some((value) => value !== ""));
      const rpmTable = cleanRows
        .map((row) => ({
          rpm: toNum(row.cells.rpm ?? ""),
          coolant_p: toNum(row.cells.coolant_p ?? ""),
          coolant_s: toNum(row.cells.coolant_s ?? ""),
          oil_p: toNum(row.cells.oil_p ?? ""),
          oil_s: toNum(row.cells.oil_s ?? ""),
          speed: toNum(row.cells.speed ?? ""),
        }))
        .filter((row) => LEGACY_KEYS.some((key) => row[key] != null));
      await upsertM.mutateAsync({
        id: reportId,
        data: {
          trial_date: trialDate.trim() || null,
          location: location.trim() || null,
          weather: weather.trim() || null,
          sea_state: seaState.trim() || null,
          narrative: narrative.trim() || null,
          rpm_table_columns: cleanColumns,
          rpm_table_rows: cleanRows,
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

        <View style={styles.tableTitleRow}>
          <Text style={[styles.sectionHead, { marginTop: 8 }]}>SEA TRIAL TABLE</Text>
          <Pressable onPress={addColumn} style={styles.addColumnBtn}>
            <Feather name="columns" size={13} color={GOLD} />
            <Text style={styles.addRowText}>Add column</Text>
          </Pressable>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.dynamicTableContent}
        >
          <View>
            <View style={styles.dynamicHeader}>
              {tableColumns.map((column) => (
                <View key={column.id} style={styles.dynamicHeaderCell}>
                  <TextInput
                    value={column.label}
                    onChangeText={(v) => setColumnLabel(column.id, v)}
                    placeholder="Column"
                    placeholderTextColor={MUTED}
                    style={styles.columnNameInput}
                  />
                  <Pressable
                    onPress={() => removeColumn(column.id)}
                    hitSlop={8}
                    style={styles.columnDelete}
                    disabled={tableColumns.length <= 1}
                  >
                    <Feather
                      name="x"
                      size={13}
                      color={tableColumns.length <= 1 ? "rgba(232,123,123,0.35)" : DANGER}
                    />
                  </Pressable>
                </View>
              ))}
              <View style={styles.rowActionSpacer} />
            </View>
            {tableRows.map((row) => (
              <View key={row.id} style={styles.dynamicRow}>
                {tableColumns.map((column) => (
                  <TextInput
                    key={column.id}
                    value={row.cells[column.id] ?? ""}
                    onChangeText={(v) => setCell(row.id, column.id, v)}
                    style={styles.dynamicCell}
                    placeholderTextColor={MUTED}
                  />
                ))}
                <Pressable
                  onPress={() => removeRow(row.id)}
                  hitSlop={8}
                  style={styles.rowDel}
                  disabled={tableRows.length <= 1}
                >
                  <Feather
                    name="x"
                    size={14}
                    color={tableRows.length <= 1 ? "rgba(232,123,123,0.35)" : DANGER}
                  />
                </Pressable>
              </View>
            ))}
          </View>
        </ScrollView>
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
  tableTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  addColumnBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(201,169,97,0.4)",
  },
  dynamicTableContent: {
    paddingRight: 18,
    paddingBottom: 4,
  },
  dynamicHeader: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 6,
  },
  dynamicHeaderCell: {
    width: 96,
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: NAVY_DEEP,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(201,169,97,0.28)",
    paddingLeft: 8,
    paddingRight: 4,
  },
  columnNameInput: {
    flex: 1,
    color: GOLD,
    fontFamily: "Inter_700Bold",
    fontSize: 11,
    letterSpacing: 0.4,
    textTransform: "uppercase",
    paddingVertical: 8,
  },
  columnDelete: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  dynamicRow: {
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
    marginBottom: 6,
  },
  dynamicCell: {
    width: 96,
    minHeight: 42,
    backgroundColor: NAVY_ELEV,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 9,
    color: IVORY,
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    borderWidth: 1,
    borderColor: DIVIDER,
    textAlign: "center",
  },
  rowActionSpacer: {
    width: 28,
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
