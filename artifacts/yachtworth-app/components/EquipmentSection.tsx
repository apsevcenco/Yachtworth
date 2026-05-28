import { Feather } from "@expo/vector-icons";
import type { EquipmentItem } from "@workspace/api-client-react";
import React, { useState } from "react";
import {
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  EQUIPMENT_CATALOG,
  type EquipmentDef,
  type EquipmentField,
  type EquipmentGroup,
} from "../lib/equipmentConfig";

const NAVY_ELEV = "#142A52";
const NAVY_DEEP = "#081633";
const GOLD = "#C9A961";
const IVORY = "#F7F3EC";
const MUTED = "rgba(247,243,236,0.6)";
const DIVIDER = "rgba(247,243,236,0.08)";

type Props = {
  items: EquipmentItem[];
  onChange: (items: EquipmentItem[]) => void;
  /** Yacht type drives sailing-only group visibility. */
  yachtType: string | null;
};

function blankItem(def: EquipmentDef, category: EquipmentItem["category"]): EquipmentItem {
  return {
    category,
    equipment_type: def.key,
    quantity: 1,
    brand: null,
    model: null,
    serial_number: null,
    year_installed: null,
    power_kw: null,
    power_hp: null,
    hours: null,
    capacity_liters: null,
    capacity_persons: null,
    panels_count: null,
    total_watts: null,
    zones_count: null,
    type_detail: null,
    notes: null,
  };
}

export default function EquipmentSection({ items, onChange, yachtType }: Props) {
  const [openGroup, setOpenGroup] = useState<Record<string, boolean>>({});

  const visibleGroups = EQUIPMENT_CATALOG.filter((g) =>
    g.yachtTypes ? (yachtType ? g.yachtTypes.includes(yachtType) : false) : true,
  );

  const itemsOf = (type: string): EquipmentItem[] =>
    items.filter((i) => i.equipment_type === type);

  const indexOf = (it: EquipmentItem): number => items.indexOf(it);

  const setOne = (next: EquipmentItem, idx: number) => {
    const arr = items.slice();
    arr[idx] = next;
    onChange(arr);
  };

  const addItem = (def: EquipmentDef, category: EquipmentItem["category"]) => {
    onChange([...items, blankItem(def, category)]);
  };

  const removeAt = (idx: number) => {
    const arr = items.slice();
    arr.splice(idx, 1);
    onChange(arr);
  };

  return (
    <View>
      {visibleGroups.map((g) => {
        const isOpen = openGroup[g.category] ?? false;
        const enabledCount = g.items.reduce(
          (s, def) => s + (itemsOf(def.key).length > 0 ? 1 : 0),
          0,
        );
        return (
          <View key={g.category} style={styles.group}>
            <Pressable
              onPress={() =>
                setOpenGroup((o) => ({ ...o, [g.category]: !isOpen }))
              }
              accessibilityRole="button"
              accessibilityLabel={`${isOpen ? "Collapse" : "Expand"} ${g.label}`}
              style={styles.groupHeader}
            >
              <Text style={styles.groupTitle}>{g.label}</Text>
              <View style={styles.groupRight}>
                {enabledCount > 0 ? (
                  <Text style={styles.groupCount}>{enabledCount}</Text>
                ) : null}
                <Feather
                  name={isOpen ? "chevron-up" : "chevron-down"}
                  size={16}
                  color={MUTED}
                />
              </View>
            </Pressable>
            {isOpen ? (
              <View style={styles.groupBody}>
                {g.items.map((def) =>
                  def.kind === "toggle" ? (
                    <ToggleRow
                      key={def.key}
                      def={def}
                      category={g.category}
                      item={itemsOf(def.key)[0] ?? null}
                      onAdd={() => addItem(def, g.category)}
                      onRemove={(it) => removeAt(indexOf(it))}
                      onUpdate={(it, next) => setOne(next, indexOf(it))}
                    />
                  ) : (
                    <MultiRow
                      key={def.key}
                      def={def}
                      category={g.category}
                      list={itemsOf(def.key)}
                      onAdd={() => addItem(def, g.category)}
                      onRemove={(it) => removeAt(indexOf(it))}
                      onUpdate={(it, next) => setOne(next, indexOf(it))}
                    />
                  ),
                )}
              </View>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

/* ── ToggleRow ─────────────────────────────────────────────────────── */

function ToggleRow({
  def,
  item,
  onAdd,
  onRemove,
  onUpdate,
}: {
  def: EquipmentDef;
  category: EquipmentItem["category"];
  item: EquipmentItem | null;
  onAdd: () => void;
  onRemove: (it: EquipmentItem) => void;
  onUpdate: (it: EquipmentItem, next: EquipmentItem) => void;
}) {
  const enabled = item != null;
  return (
    <View style={styles.row}>
      <View style={styles.rowHead}>
        <Text style={styles.rowLabel}>{def.label}</Text>
        <Switch
          value={enabled}
          onValueChange={(v) => {
            if (v) onAdd();
            else if (item) onRemove(item);
          }}
          trackColor={{ false: "rgba(247,243,236,0.15)", true: GOLD }}
          thumbColor={enabled ? IVORY : "rgba(247,243,236,0.55)"}
        />
      </View>
      {enabled && item ? (
        <View style={styles.rowBody}>
          {def.fields.map((f) => (
            <FieldInput
              key={`${def.key}.${String(f.key)}`}
              field={f}
              value={item[f.key]}
              onChange={(v) => onUpdate(item, { ...item, [f.key]: v })}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

/* ── MultiRow (generators / tenders / jet skis) ────────────────────── */

function MultiRow({
  def,
  list,
  onAdd,
  onRemove,
  onUpdate,
}: {
  def: EquipmentDef;
  category: EquipmentItem["category"];
  list: EquipmentItem[];
  onAdd: () => void;
  onRemove: (it: EquipmentItem) => void;
  onUpdate: (it: EquipmentItem, next: EquipmentItem) => void;
}) {
  const atLimit = def.maxUnits != null && list.length >= def.maxUnits;
  return (
    <View style={styles.row}>
      <View style={styles.rowHead}>
        <Text style={styles.rowLabel}>{def.label}</Text>
        <Pressable
          onPress={onAdd}
          disabled={atLimit}
          accessibilityRole="button"
          accessibilityLabel={`Add ${def.label}`}
          style={({ pressed }) => [
            styles.addBtn,
            { opacity: pressed ? 0.7 : atLimit ? 0.35 : 1 },
          ]}
        >
          <Feather name="plus" size={14} color={GOLD} />
          <Text style={styles.addBtnText}>Add</Text>
        </Pressable>
      </View>
      {list.map((entry, idx) => (
        <View key={`${def.key}.${idx}`} style={styles.entry}>
          <View style={styles.entryHead}>
            <Text style={styles.entryTitle}>
              {def.label.replace(/s$/, "")} #{idx + 1}
            </Text>
            <Pressable
              onPress={() => onRemove(entry)}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Remove entry"
              style={({ pressed }) => [
                styles.removeBtn,
                { opacity: pressed ? 0.6 : 1 },
              ]}
            >
              <Feather name="trash-2" size={14} color={MUTED} />
              <Text style={styles.removeBtnText}>Remove</Text>
            </Pressable>
          </View>
          {def.fields.map((f) => (
            <FieldInput
              key={`${def.key}.${idx}.${String(f.key)}`}
              field={f}
              value={entry[f.key]}
              onChange={(v) => onUpdate(entry, { ...entry, [f.key]: v })}
            />
          ))}
        </View>
      ))}
    </View>
  );
}

/* ── FieldInput (renders one schema field) ─────────────────────────── */

function FieldInput({
  field,
  value,
  onChange,
}: {
  field: EquipmentField;
  value: unknown;
  onChange: (v: string | number | null) => void;
}) {
  const label =
    field.label + (field.suffix ? ` (${field.suffix})` : "");
  if (field.kind === "select" && field.options) {
    return (
      <View style={styles.field}>
        <Text style={styles.fieldLabel}>{label}</Text>
        <View style={styles.pillRow}>
          {field.options.map((opt) => {
            const active = value === opt;
            return (
              <Pressable
                key={opt}
                onPress={() => onChange(active ? null : opt)}
                style={({ pressed }) => [
                  styles.pill,
                  active && styles.pillActive,
                  { opacity: pressed ? 0.8 : 1 },
                ]}
                accessibilityRole="button"
                accessibilityLabel={`${label}: ${opt}${active ? ", selected" : ""}`}
              >
                <Text style={[styles.pillText, active && styles.pillTextActive]}>
                  {opt}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    );
  }
  if (field.kind === "stepper") {
    const n = typeof value === "number" ? value : 0;
    const min = field.min ?? 0;
    const max = field.max ?? 99;
    return (
      <View style={styles.field}>
        <Text style={styles.fieldLabel}>{label}</Text>
        <View style={styles.stepperRow}>
          <Pressable
            onPress={() => onChange(Math.max(min, n - 1))}
            disabled={n <= min}
            style={({ pressed }) => [
              styles.stepperBtn,
              { opacity: pressed ? 0.7 : n <= min ? 0.35 : 1 },
            ]}
            accessibilityRole="button"
            accessibilityLabel={`Decrease ${field.label}`}
          >
            <Feather name="minus" size={14} color={IVORY} />
          </Pressable>
          <Text style={styles.stepperValue}>{n}</Text>
          <Pressable
            onPress={() => onChange(Math.min(max, n + 1))}
            disabled={n >= max}
            style={({ pressed }) => [
              styles.stepperBtn,
              { opacity: pressed ? 0.7 : n >= max ? 0.35 : 1 },
            ]}
            accessibilityRole="button"
            accessibilityLabel={`Increase ${field.label}`}
          >
            <Feather name="plus" size={14} color={IVORY} />
          </Pressable>
        </View>
      </View>
    );
  }
  // text / number / integer → TextInput
  const isNumeric = field.kind === "number" || field.kind === "integer";
  const display = value == null ? "" : String(value);
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        value={display}
        onChangeText={(t) => {
          if (!isNumeric) {
            onChange(t === "" ? null : t);
            return;
          }
          if (t === "") return onChange(null);
          if (field.kind === "integer") {
            const digits = t.replace(/[^\d-]/g, "");
            const n = parseInt(digits, 10);
            onChange(Number.isFinite(n) ? n : null);
          } else {
            const cleaned = t.replace(",", ".").replace(/[^0-9.\-]/g, "");
            const n = Number(cleaned);
            onChange(Number.isFinite(n) ? n : null);
          }
        }}
        placeholder={field.placeholder ?? (isNumeric ? "0" : "")}
        placeholderTextColor={MUTED}
        keyboardType={
          field.kind === "integer"
            ? "number-pad"
            : isNumeric
              ? "decimal-pad"
              : "default"
        }
        multiline={field.multiline}
        style={[styles.input, field.multiline && styles.textarea]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  group: {
    backgroundColor: NAVY_ELEV,
    borderRadius: 12,
    marginBottom: 10,
    overflow: "hidden",
  },
  groupHeader: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  groupTitle: {
    color: IVORY,
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  groupRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  groupCount: {
    color: GOLD,
    fontSize: 12,
    fontWeight: "600",
    backgroundColor: "rgba(201,169,97,0.12)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  groupBody: {
    paddingHorizontal: 12,
    paddingBottom: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: DIVIDER,
  },
  row: { paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: DIVIDER },
  rowHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  rowLabel: { color: IVORY, fontSize: 13, flex: 1, marginRight: 8 },
  rowBody: { paddingTop: 8, paddingBottom: 4, gap: 10 },
  entry: {
    marginTop: 10,
    padding: 10,
    backgroundColor: NAVY_DEEP,
    borderRadius: 10,
    gap: 10,
  },
  entryHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  entryTitle: { color: GOLD, fontSize: 12, fontWeight: "600", letterSpacing: 0.4 },
  removeBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
  removeBtnText: { color: MUTED, fontSize: 11 },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: GOLD,
  },
  addBtnText: { color: GOLD, fontSize: 12, fontWeight: "600" },
  field: { gap: 6 },
  fieldLabel: { color: MUTED, fontSize: 11, letterSpacing: 0.3 },
  input: {
    backgroundColor: NAVY_DEEP,
    color: IVORY,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    fontSize: 13,
  },
  textarea: { minHeight: 60, textAlignVertical: "top" },
  pillRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: DIVIDER,
    backgroundColor: NAVY_DEEP,
  },
  pillActive: { borderColor: GOLD, backgroundColor: "rgba(201,169,97,0.14)" },
  pillText: { color: MUTED, fontSize: 12 },
  pillTextActive: { color: GOLD, fontWeight: "600" },
  stepperRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  stepperBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: NAVY_DEEP,
    alignItems: "center",
    justifyContent: "center",
  },
  stepperValue: {
    color: IVORY,
    fontSize: 14,
    fontWeight: "600",
    minWidth: 28,
    textAlign: "center",
  },
});

// keep ESLint happy on unused `EquipmentGroup` import
export type { EquipmentGroup };
