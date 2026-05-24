import { Feather } from "@expo/vector-icons";
import { useAuth } from "@clerk/expo";
import {
  getListChartersQueryKey,
  getListYachtsQueryKey,
  useCreateYacht,
  useListCharters,
  useListYachts,
  type Charter,
  type Yacht,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
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

const NAVY = "#0B1E3F";
const NAVY_ELEV = "#142A52";
const NAVY_DEEP = "#081633";
const GOLD = "#C9A961";
const IVORY = "#F7F3EC";
const MUTED = "rgba(247,243,236,0.55)";
const DIVIDER = "rgba(247,243,236,0.08)";

// Status colors per spec (used on card today-status + future calendar)
const STATUS_COLORS = {
  available: "#7BD389",
  chartered: GOLD,
  option: "#3498DB",
  maintenance: "#95A5A6",
  blocked: "#E74C3C",
} as const;

const TYPE_LABELS: Record<string, string> = {
  motor_yacht: "Motor Yacht",
  sailing_yacht: "Sailing Yacht",
  catamaran: "Catamaran",
  superyacht: "Superyacht",
};

type Tab = "fleet" | "calendar" | "clients";

const MAX_YACHTS = 5;

function yachtTitle(y: Yacht): string {
  return y.name || [y.brand, y.model].filter(Boolean).join(" ") || "Your yacht";
}

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function fmtRange(start: string, end: string): string {
  const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" };
  try {
    const s = new Date(start).toLocaleDateString("en-GB", opts);
    const e = new Date(end).toLocaleDateString("en-GB", opts);
    return `${s} – ${e}`;
  } catch {
    return `${start} – ${end}`;
  }
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function bookedDaysThisMonth(charters: Charter[]): number {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const monthStart = new Date(y, m, 1);
  const monthEnd = new Date(y, m + 1, 0);
  let booked = 0;
  for (const c of charters) {
    if (c.status === "cancelled" || c.status === "blocked") continue;
    const cs = new Date(c.start_date);
    const ce = new Date(c.end_date);
    if (ce < monthStart || cs > monthEnd) continue;
    const a = cs < monthStart ? monthStart : cs;
    const b = ce > monthEnd ? monthEnd : ce;
    booked += Math.round((b.getTime() - a.getTime()) / 86400000) + 1;
  }
  return Math.min(booked, daysInMonth(y, m));
}

type TodayStatus = {
  label: string;
  color: string;
};

function computeTodayStatus(charters: Charter[]): TodayStatus {
  const t = todayIso();
  for (const c of charters) {
    if (t >= c.start_date && t <= c.end_date) {
      if (c.status === "confirmed")
        return { label: "Chartered", color: STATUS_COLORS.chartered };
      if (c.status === "tentative")
        return { label: "Option", color: STATUS_COLORS.option };
      if (c.status === "maintenance")
        return { label: "Maintenance", color: STATUS_COLORS.maintenance };
      if (c.status === "blocked")
        return { label: "Blocked", color: STATUS_COLORS.blocked };
    }
  }
  return { label: "Available", color: STATUS_COLORS.available };
}

function nextCharterFor(charters: Charter[]): Charter | null {
  const t = todayIso();
  const future = charters
    .filter(
      (c) =>
        c.status !== "cancelled" &&
        c.status !== "blocked" &&
        c.end_date >= t,
    )
    .sort((a, b) => a.start_date.localeCompare(b.start_date));
  return future[0] ?? null;
}

function chartersThisMonthCount(charters: Charter[]): number {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const mStart = `${y}-${String(m + 1).padStart(2, "0")}-01`;
  const mEnd = `${y}-${String(m + 1).padStart(2, "0")}-${String(daysInMonth(y, m)).padStart(2, "0")}`;
  return charters.filter(
    (c) =>
      c.status !== "cancelled" &&
      c.status !== "blocked" &&
      c.end_date >= mStart &&
      c.start_date <= mEnd,
  ).length;
}

export default function CharterPlannerScreen() {
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const router = useRouter();
  const { isSignedIn, isLoaded } = useAuth();
  const queryClient = useQueryClient();

  const [tab, setTab] = useState<Tab>("fleet");
  const [addOpen, setAddOpen] = useState(false);

  const yachtsQuery = useListYachts({
    query: {
      queryKey: getListYachtsQueryKey(),
      enabled: Boolean(isSignedIn),
      staleTime: 30_000,
    },
  });
  const chartersQuery = useListCharters(undefined, {
    query: {
      queryKey: getListChartersQueryKey(),
      enabled: Boolean(isSignedIn),
      staleTime: 30_000,
    },
  });

  const yachts: Yacht[] = yachtsQuery.data?.items ?? [];
  const allCharters: Charter[] = chartersQuery.data?.items ?? [];

  const chartersByYacht = useMemo(() => {
    const m = new Map<string, Charter[]>();
    for (const c of allCharters) {
      const arr = m.get(c.yacht_id) ?? [];
      arr.push(c);
      m.set(c.yacht_id, arr);
    }
    return m;
  }, [allCharters]);

  const loading = !isLoaded || (isSignedIn && yachtsQuery.isLoading);

  return (
    <View style={{ flex: 1, backgroundColor: NAVY }}>
      <Pressable
        onPress={() =>
          router.canGoBack() ? router.back() : router.replace("/(tabs)/tools")
        }
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel="Go back"
        style={[styles.backFab, { top: (isWeb ? 12 : insets.top) + 56 }]}
      >
        <Feather name="chevron-left" size={24} color={IVORY} />
      </Pressable>

      <View
        style={{
          paddingTop: (isWeb ? 67 : insets.top) + 70,
          paddingHorizontal: 24,
          paddingBottom: 8,
        }}
      >
        <Text style={styles.kicker}>CHARTER PLANNER</Text>
        <Text style={styles.title}>My Fleet</Text>

        <View
          style={styles.tabsRow}
          accessibilityRole="tablist"
        >
          {(
            [
              { k: "fleet", l: "Fleet" },
              { k: "calendar", l: "Calendar" },
              { k: "clients", l: "Clients" },
            ] as { k: Tab; l: string }[]
          ).map((t) => {
            const active = tab === t.k;
            return (
              <Pressable
                key={t.k}
                onPress={() => setTab(t.k)}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                accessibilityLabel={`${t.l} tab`}
                style={[styles.tabBtn, active && styles.tabBtnActive]}
              >
                <Text style={[styles.tabText, active && styles.tabTextActive]}>
                  {t.l}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: 24,
          paddingBottom: insets.bottom + 140,
          paddingTop: 6,
        }}
        showsVerticalScrollIndicator={false}
      >
        {!isSignedIn && isLoaded ? (
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Feather name="lock" size={26} color={GOLD} />
            </View>
            <Text style={styles.emptyTitle}>Sign in to use Charter Planner</Text>
            <Text style={styles.emptyText}>
              Manage your fleet, plan trips and track per-charter P&L.
            </Text>
            <Pressable
              onPress={() => router.push("/(auth)/sign-in")}
              accessibilityRole="button"
              accessibilityLabel="Sign in"
              style={({ pressed }) => [
                styles.primaryBtn,
                { opacity: pressed ? 0.85 : 1, marginTop: 18 },
              ]}
            >
              <Text style={styles.primaryBtnText}>Sign in</Text>
            </Pressable>
          </View>
        ) : loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={GOLD} />
          </View>
        ) : tab === "fleet" ? (
          <FleetTab
            yachts={yachts}
            chartersByYacht={chartersByYacht}
            onAdd={() => setAddOpen(true)}
            onTapYacht={(y) =>
              router.push({
                pathname: "/roi/yacht-form",
                params: { id: y.id },
              })
            }
          />
        ) : tab === "calendar" ? (
          <PlaceholderTab
            icon="calendar"
            title="Calendar coming next"
            text="Master Gantt + per-yacht month view ship in the next update. Backend is ready — your charters will appear here as soon as the UI lands."
          />
        ) : (
          <PlaceholderTab
            icon="users"
            title="Clients coming next"
            text="Clients are already being saved when you create a charter. The list + history UI ships in the next update."
          />
        )}
      </ScrollView>

      <AddYachtModal
        visible={addOpen}
        onClose={() => setAddOpen(false)}
        onSaved={() => {
          setAddOpen(false);
          queryClient.invalidateQueries({ queryKey: getListYachtsQueryKey() });
        }}
        atLimit={yachts.length >= MAX_YACHTS}
      />
    </View>
  );
}

function FleetTab({
  yachts,
  chartersByYacht,
  onAdd,
  onTapYacht,
}: {
  yachts: Yacht[];
  chartersByYacht: Map<string, Charter[]>;
  onAdd: () => void;
  onTapYacht: (y: Yacht) => void;
}) {
  if (yachts.length === 0) {
    return (
      <View style={styles.empty}>
        <View style={styles.emptyIcon}>
          <Feather name="anchor" size={28} color={GOLD} />
        </View>
        <Text style={styles.emptyTitle}>No yachts in your fleet yet.</Text>
        <Text style={styles.emptyText}>
          Add your first yacht to start planning.
        </Text>
        <Pressable
          onPress={onAdd}
          accessibilityRole="button"
          accessibilityLabel="Add my first yacht"
          style={({ pressed }) => [
            styles.primaryBtn,
            { opacity: pressed ? 0.85 : 1, marginTop: 18 },
          ]}
        >
          <Feather name="plus" size={16} color={NAVY_DEEP} />
          <Text style={styles.primaryBtnText}>Add my first yacht</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View>
      <View style={styles.fleetHeaderRow}>
        <Text style={styles.fleetCount}>
          {yachts.length} of {MAX_YACHTS} yacht{yachts.length === 1 ? "" : "s"}
        </Text>
        <Pressable
          onPress={onAdd}
          disabled={yachts.length >= MAX_YACHTS}
          accessibilityRole="button"
          accessibilityLabel={
            yachts.length >= MAX_YACHTS
              ? "Fleet limit reached"
              : "Add yacht"
          }
          style={({ pressed }) => [
            styles.addPill,
            yachts.length >= MAX_YACHTS && { opacity: 0.4 },
            pressed && { opacity: 0.8 },
          ]}
        >
          <Feather name="plus" size={14} color={GOLD} />
          <Text style={styles.addPillText}>Add Yacht</Text>
        </Pressable>
      </View>
      {yachts.map((y) => {
        const list = chartersByYacht.get(y.id) ?? [];
        const today = computeTodayStatus(list);
        const next = nextCharterFor(list);
        const thisMonth = chartersThisMonthCount(list);
        const booked = bookedDaysThisMonth(list);
        const now = new Date();
        const totalDays = daysInMonth(now.getFullYear(), now.getMonth());
        const pct = Math.round((booked / totalDays) * 100);
        return (
          <Pressable
            key={y.id}
            onPress={() => onTapYacht(y)}
            accessibilityRole="button"
            accessibilityLabel={`${yachtTitle(y)}, ${today.label}`}
            style={({ pressed }) => [styles.card, { opacity: pressed ? 0.9 : 1 }]}
          >
            <View style={styles.cardHeader}>
              <View style={styles.cardIcon}>
                <Feather name="anchor" size={22} color={GOLD} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.yachtName} numberOfLines={1}>
                  {yachtTitle(y)}
                </Text>
                <Text style={styles.yachtSub} numberOfLines={1}>
                  {[
                    y.brand || (y.yacht_type && TYPE_LABELS[y.yacht_type]) || null,
                    y.length_meters ? `${y.length_meters.toFixed(0)}m` : null,
                    y.year_built ? String(y.year_built) : null,
                  ]
                    .filter(Boolean)
                    .join(" · ") || "—"}
                </Text>
                {y.flag ? (
                  <Text style={styles.yachtFlag}>{y.flag} flag</Text>
                ) : null}
              </View>
            </View>
            <View style={styles.cardDivider} />
            <Row
              label="Status today"
              value={
                <View style={styles.statusRow}>
                  <View
                    style={[styles.statusDot, { backgroundColor: today.color }]}
                  />
                  <Text style={[styles.rowValue, { color: today.color }]}>
                    {today.label}
                  </Text>
                </View>
              }
            />
            <Row
              label="Next charter"
              value={
                <Text style={styles.rowValue}>
                  {next ? fmtRange(next.start_date, next.end_date) : "None scheduled"}
                </Text>
              }
            />
            <Row
              label="This month"
              value={
                <Text style={styles.rowValue}>
                  {thisMonth} charter{thisMonth === 1 ? "" : "s"} · {pct}% booked
                </Text>
              }
            />
          </Pressable>
        );
      })}
    </View>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      {value}
    </View>
  );
}

function PlaceholderTab({
  icon,
  title,
  text,
}: {
  icon: React.ComponentProps<typeof Feather>["name"];
  title: string;
  text: string;
}) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>
        <Feather name={icon} size={26} color={GOLD} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Add Yacht bottom-sheet modal
// ────────────────────────────────────────────────────────────────────────────

type YachtTypeKey = "motor_yacht" | "sailing_yacht" | "catamaran" | "superyacht";

const TYPE_OPTIONS: { key: YachtTypeKey; label: string }[] = [
  { key: "motor_yacht", label: "Motor" },
  { key: "sailing_yacht", label: "Sailing" },
  { key: "catamaran", label: "Catamaran" },
  { key: "superyacht", label: "Superyacht" },
];

function AddYachtModal({
  visible,
  onClose,
  onSaved,
  atLimit,
}: {
  visible: boolean;
  onClose: () => void;
  onSaved: () => void;
  atLimit: boolean;
}) {
  const insets = useSafeAreaInsets();
  const [name, setName] = useState("");
  const [type, setType] = useState<YachtTypeKey | null>(null);
  const [length, setLength] = useState("");
  const [year, setYear] = useState("");
  const [flag, setFlag] = useState("");
  const [homePort, setHomePort] = useState("");
  const [notes, setNotes] = useState("");

  const createMut = useCreateYacht();

  const reset = () => {
    setName("");
    setType(null);
    setLength("");
    setYear("");
    setFlag("");
    setHomePort("");
    setNotes("");
  };

  const handleClose = () => {
    if (createMut.isPending) return;
    reset();
    onClose();
  };

  const handleSave = () => {
    if (!name.trim()) {
      Alert.alert("Name required", "Please enter the yacht name.");
      return;
    }
    const lengthNum = length.trim() ? parseFloat(length.replace(",", ".")) : null;
    const yearNum = year.trim() ? parseInt(year.trim(), 10) : null;
    if (lengthNum != null && (Number.isNaN(lengthNum) || lengthNum <= 0)) {
      Alert.alert("Invalid length", "Length must be a positive number in meters.");
      return;
    }
    if (
      yearNum != null &&
      (Number.isNaN(yearNum) || yearNum < 1900 || yearNum > 2100)
    ) {
      Alert.alert("Invalid year", "Year must be between 1900 and 2100.");
      return;
    }
    createMut.mutate(
      {
        data: {
          name: name.trim(),
          yacht_type: type,
          length_meters: lengthNum,
          year_built: yearNum,
          flag: flag.trim() || null,
          marina_location: homePort.trim() || null,
          notes: notes.trim() || null,
        },
      },
      {
        onSuccess: () => {
          reset();
          onSaved();
        },
        onError: (err) => {
          Alert.alert(
            "Couldn't save yacht",
            err instanceof Error ? err.message : "Please try again.",
          );
        },
      },
    );
  };

  return (
    <Modal
      visible={visible}
      onRequestClose={handleClose}
      transparent
      animationType="slide"
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.modalRoot}
      >
        <Pressable style={styles.modalBackdrop} onPress={handleClose} />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>Add Yacht</Text>
          {atLimit ? (
            <Text style={styles.sheetWarn}>
              Fleet limit reached ({MAX_YACHTS}). Delete a yacht to add another.
            </Text>
          ) : null}
          <ScrollView
            style={{ maxHeight: 460 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Field
              label="Name *"
              value={name}
              onChangeText={setName}
              placeholder="e.g. Aurelia"
              autoCapitalize="words"
            />
            <Text style={styles.fieldLabel}>Type</Text>
            <View style={styles.typeRow}>
              {TYPE_OPTIONS.map((t) => {
                const active = type === t.key;
                return (
                  <Pressable
                    key={t.key}
                    onPress={() => setType(active ? null : t.key)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    accessibilityLabel={`Type ${t.label}`}
                    style={[styles.typePill, active && styles.typePillActive]}
                  >
                    <Text
                      style={[
                        styles.typePillText,
                        active && styles.typePillTextActive,
                      ]}
                    >
                      {t.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <View style={styles.fieldRow2}>
              <View style={{ flex: 1 }}>
                <Field
                  label="Length (m)"
                  value={length}
                  onChangeText={setLength}
                  keyboardType="decimal-pad"
                  placeholder="24"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Field
                  label="Year built"
                  value={year}
                  onChangeText={setYear}
                  keyboardType="number-pad"
                  placeholder="2019"
                />
              </View>
            </View>
            <Field
              label="Flag / registration"
              value={flag}
              onChangeText={setFlag}
              placeholder="e.g. Malta"
            />
            <Field
              label="Home port"
              value={homePort}
              onChangeText={setHomePort}
              placeholder="e.g. Valletta"
            />
            <Field
              label="Notes"
              value={notes}
              onChangeText={setNotes}
              placeholder="Any private notes…"
              multiline
            />
          </ScrollView>
          <Pressable
            onPress={handleSave}
            disabled={createMut.isPending || atLimit}
            accessibilityRole="button"
            accessibilityLabel="Save yacht"
            style={({ pressed }) => [
              styles.primaryBtn,
              {
                marginTop: 14,
                opacity: createMut.isPending || atLimit ? 0.5 : pressed ? 0.85 : 1,
              },
            ]}
          >
            {createMut.isPending ? (
              <ActivityIndicator color={NAVY_DEEP} />
            ) : (
              <Text style={styles.primaryBtnText}>Save yacht</Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  autoCapitalize,
  multiline,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  keyboardType?: "default" | "decimal-pad" | "number-pad";
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  multiline?: boolean;
}) {
  return (
    <View style={{ marginBottom: 10 }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={MUTED}
        keyboardType={keyboardType ?? "default"}
        autoCapitalize={autoCapitalize ?? "sentences"}
        multiline={multiline}
        style={[styles.input, multiline && { height: 70, paddingTop: 10 }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  backFab: {
    position: "absolute",
    left: 16,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: NAVY_ELEV,
    alignItems: "center",
    justifyContent: "center",
  },
  kicker: {
    color: GOLD,
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    letterSpacing: 2,
  },
  title: {
    color: IVORY,
    fontFamily: "Gilroy-Bold",
    fontSize: 28,
    marginTop: 4,
    marginBottom: 14,
  },
  tabsRow: {
    flexDirection: "row",
    backgroundColor: NAVY_DEEP,
    borderRadius: 12,
    padding: 4,
    marginTop: 4,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 8,
    alignItems: "center",
  },
  tabBtnActive: { backgroundColor: NAVY_ELEV },
  tabText: {
    color: MUTED,
    fontFamily: "Inter_500Medium",
    fontSize: 13,
  },
  tabTextActive: { color: GOLD },

  center: { paddingVertical: 60, alignItems: "center" },

  empty: {
    alignItems: "center",
    paddingVertical: 50,
    paddingHorizontal: 14,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: NAVY_ELEV,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyTitle: {
    color: IVORY,
    fontFamily: "Gilroy-Bold",
    fontSize: 18,
    textAlign: "center",
    marginBottom: 6,
  },
  emptyText: {
    color: MUTED,
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    maxWidth: 320,
  },

  fleetHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    marginTop: 4,
  },
  fleetCount: {
    color: MUTED,
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    letterSpacing: 1,
  },
  addPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: GOLD,
    backgroundColor: "transparent",
  },
  addPillText: {
    color: GOLD,
    fontFamily: "Inter_500Medium",
    fontSize: 13,
  },

  card: {
    backgroundColor: NAVY_ELEV,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: DIVIDER,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  cardIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: NAVY_DEEP,
    alignItems: "center",
    justifyContent: "center",
  },
  yachtName: {
    color: IVORY,
    fontFamily: "Gilroy-Bold",
    fontSize: 18,
  },
  yachtSub: {
    color: MUTED,
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    marginTop: 2,
  },
  yachtFlag: {
    color: MUTED,
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    marginTop: 2,
  },
  cardDivider: {
    height: 1,
    backgroundColor: DIVIDER,
    marginVertical: 12,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 5,
  },
  rowLabel: {
    color: MUTED,
    fontFamily: "Inter_400Regular",
    fontSize: 13,
  },
  rowValue: {
    color: IVORY,
    fontFamily: "Inter_500Medium",
    fontSize: 13,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  primaryBtn: {
    backgroundColor: GOLD,
    paddingHorizontal: 22,
    paddingVertical: 14,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  primaryBtnText: {
    color: NAVY_DEEP,
    fontFamily: "Gilroy-Bold",
    fontSize: 15,
  },

  // Modal
  modalRoot: { flex: 1, justifyContent: "flex-end" },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  sheet: {
    backgroundColor: NAVY,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 20,
    paddingTop: 10,
    borderTopWidth: 1,
    borderColor: DIVIDER,
  },
  sheetHandle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(247,243,236,0.2)",
    marginBottom: 12,
  },
  sheetTitle: {
    color: IVORY,
    fontFamily: "Gilroy-Bold",
    fontSize: 20,
    marginBottom: 12,
  },
  sheetWarn: {
    color: "#FF8A8A",
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    marginBottom: 10,
  },

  fieldLabel: {
    color: MUTED,
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    letterSpacing: 1.2,
    marginBottom: 6,
    textTransform: "uppercase",
  },
  input: {
    backgroundColor: NAVY_ELEV,
    borderWidth: 1,
    borderColor: DIVIDER,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    color: IVORY,
    fontFamily: "Inter_400Regular",
    fontSize: 14,
  },
  fieldRow2: {
    flexDirection: "row",
    gap: 10,
  },
  typeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  typePill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: DIVIDER,
    backgroundColor: NAVY_ELEV,
  },
  typePillActive: {
    borderColor: GOLD,
    backgroundColor: "rgba(201,169,97,0.12)",
  },
  typePillText: {
    color: MUTED,
    fontFamily: "Inter_500Medium",
    fontSize: 13,
  },
  typePillTextActive: { color: GOLD },
});
