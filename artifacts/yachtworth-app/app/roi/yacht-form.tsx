import { Feather } from "@expo/vector-icons";
import { useAuth } from "@clerk/expo";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import React, { useMemo, useState } from "react";
import {
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
import { useUnits } from "../../hooks/useUnits";
import { parseInt10, parseNum } from "../../lib/roiFinancials";

const NAVY = "#0B1E3F";
const NAVY_DEEP = "#081633";
const GOLD = "#C9A961";
const IVORY = "#F7F3EC";
const MUTED = "rgba(247,243,236,0.55)";
const DIVIDER = "rgba(247,243,236,0.08)";
const ERROR = "#FF8A8A";

const M_TO_FT = 3.28084;
const INT_RE = /^\d+$/;
const DEC_RE = /^\d+([.,]\d+)?$/;

type YachtType = "motor_yacht" | "sailing_yacht" | "catamaran" | "superyacht";

const TYPE_OPTIONS: { value: YachtType; label: string }[] = [
  { value: "motor_yacht", label: "Motor" },
  { value: "sailing_yacht", label: "Sailing" },
  { value: "catamaran", label: "Catamaran" },
  { value: "superyacht", label: "Superyacht" },
];

// This screen captures ONLY a yacht "passport" (identity + dimensions) for a
// manually-entered yacht. It NEVER creates or edits a My Yachts record — the
// snapshot is handed to the ROI scenario screen and persisted only in ROI
// history. Purchase price, crew and operating expenses are entered later on
// the ROI scenario screen, not here.
interface PassportState {
  name: string;
  brand: string;
  model: string;
  year_built: string;
  yacht_type: YachtType | null;
  length: string; // displayed in current units
  cabins: string;
  guests: string;
  crew: string;
  engine_hours: string;
  marina_location: string;
  flag: string;
  commercial_registration: boolean;
}

const INITIAL: PassportState = {
  name: "",
  brand: "",
  model: "",
  year_built: "",
  yacht_type: null,
  length: "",
  cabins: "",
  guests: "",
  crew: "",
  engine_hours: "",
  marina_location: "",
  flag: "",
  commercial_registration: false,
};

export default function RoiManualYachtScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { isSignedIn, isLoaded } = useAuth();
  const { units } = useUnits();

  const [form, setForm] = useState<PassportState>(INITIAL);
  const [showErrors, setShowErrors] = useState(false);

  // Capture the units snapshot at mount so a mid-edit units toggle can't
  // reinterpret a length the user already typed (matches My Yacht edit).
  const [formUnits] = useState<"metric" | "imperial">(units);

  const update = <K extends keyof PassportState>(k: K, v: PassportState[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const lengthUnitLabel = formUnits === "imperial" ? "ft" : "m";

  const errors = useMemo(() => {
    const e: Partial<Record<keyof PassportState, string>> = {};
    if (!form.yacht_type) e.yacht_type = "Pick a type";
    if (!form.name && !(form.brand && form.model)) {
      e.name = "Add a name or brand+model";
    }
    if (form.length) {
      if (!DEC_RE.test(form.length)) e.length = "Invalid length";
      else {
        const n = parseNum(form.length)!;
        const maxMeters = 200;
        const maxDisplay =
          formUnits === "imperial" ? maxMeters * M_TO_FT : maxMeters;
        if (n <= 0 || n > maxDisplay)
          e.length = `1–${Math.round(maxDisplay)} ${lengthUnitLabel}`;
      }
    } else {
      e.length = "Required";
    }
    if (form.year_built) {
      if (!INT_RE.test(form.year_built)) e.year_built = "Invalid year";
      else {
        const y = parseInt(form.year_built, 10);
        if (y < 1900 || y > 2100) e.year_built = "1900–2100";
      }
    }
    for (const k of ["cabins", "guests", "crew", "engine_hours"] as const) {
      if (form[k] && !INT_RE.test(form[k])) e[k] = "Whole number";
    }
    return e;
  }, [form, formUnits, lengthUnitLabel]);

  const submit = () => {
    if (Object.keys(errors).length) {
      setShowErrors(true);
      return;
    }
    setShowErrors(false);
    if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});

    const lengthVal = parseNum(form.length);
    const lengthMeters =
      lengthVal != null
        ? formUnits === "imperial"
          ? lengthVal / M_TO_FT
          : lengthVal
        : null;

    // Passport snapshot only — no financials. The ROI scenario screen collects
    // purchase price / crew / expenses and sends them as overrides.
    const snapshot = {
      name: form.name || null,
      brand: form.brand || null,
      model: form.model || null,
      year_built: form.year_built ? parseInt(form.year_built, 10) : null,
      yacht_type: form.yacht_type,
      length_meters: lengthMeters,
      cabins: parseInt10(form.cabins),
      guests: parseInt10(form.guests),
      crew: parseInt10(form.crew),
      engine_hours: parseInt10(form.engine_hours),
      marina_location: form.marina_location || null,
      flag: form.flag || null,
      commercial_registration: form.commercial_registration,
    };

    router.push({
      pathname: "/roi/calculate",
      params: { snapshot: JSON.stringify(snapshot) },
    });
  };

  if (isLoaded && !isSignedIn) {
    return (
      <View style={[styles.root, { paddingTop: insets.top + 72 }]}>
        <TopBar onBack={() => router.back()} title="Enter a yacht" />
        <View style={styles.empty}>
          <Feather name="lock" size={26} color={GOLD} />
          <Text style={styles.emptyTitle}>Sign in required</Text>
          <Pressable
            onPress={() => router.replace("/(auth)/sign-in")}
            style={({ pressed }) => [
              styles.primaryBtn,
              { opacity: pressed ? 0.85 : 1, marginTop: 18, paddingHorizontal: 32 },
            ]}
          >
            <Text style={styles.primaryBtnText}>Sign in</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={{ flex: 1, backgroundColor: NAVY }}
    >
      <View style={[styles.root, { paddingTop: insets.top + 64 }]}>
        <TopBar onBack={() => router.back()} title="Enter a yacht" />

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 180 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.lead}>
            Enter any yacht to run an ROI scenario. This is just for the
            calculation — it is not saved to My Yachts. You'll add the purchase
            price and running costs on the next screen.
          </Text>

          <Field label="Yacht type" error={showErrors ? errors.yacht_type : undefined}>
            <View style={styles.pillRow}>
              {TYPE_OPTIONS.map((t) => {
                const active = form.yacht_type === t.value;
                return (
                  <Pressable
                    key={t.value}
                    onPress={() => update("yacht_type", t.value)}
                    style={[styles.pill, active && styles.pillActive]}
                  >
                    <Text style={[styles.pillText, active && styles.pillTextActive]}>
                      {t.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </Field>

          <Field
            label="Yacht name"
            error={showErrors ? errors.name : undefined}
            hint="A name, or fill in builder + model below."
          >
            <Input
              value={form.name}
              onChangeText={(v) => update("name", v)}
              placeholder="e.g. Serenity"
              autoCapitalize="words"
            />
          </Field>

          <Row>
            <Field label="Builder" flex>
              <Input
                value={form.brand}
                onChangeText={(v) => update("brand", v)}
                placeholder="e.g. Sunseeker"
                autoCapitalize="words"
              />
            </Field>
            <Field label="Model" flex>
              <Input
                value={form.model}
                onChangeText={(v) => update("model", v)}
                placeholder="e.g. 88 Yacht"
                autoCapitalize="words"
              />
            </Field>
          </Row>

          <Row>
            <Field
              label={`Length (${lengthUnitLabel})`}
              error={showErrors ? errors.length : undefined}
              flex
            >
              <Input
                value={form.length}
                onChangeText={(v) => update("length", v)}
                placeholder={formUnits === "imperial" ? "88" : "26.8"}
                keyboardType="decimal-pad"
              />
            </Field>
            <Field label="Year built" error={showErrors ? errors.year_built : undefined} flex>
              <Input
                value={form.year_built}
                onChangeText={(v) => update("year_built", v)}
                placeholder="2018"
                keyboardType="number-pad"
                maxLength={4}
              />
            </Field>
          </Row>

          <Row>
            <Field label="Cabins" error={showErrors ? errors.cabins : undefined} flex>
              <Input
                value={form.cabins}
                onChangeText={(v) => update("cabins", v)}
                placeholder="4"
                keyboardType="number-pad"
              />
            </Field>
            <Field label="Guests" error={showErrors ? errors.guests : undefined} flex>
              <Input
                value={form.guests}
                onChangeText={(v) => update("guests", v)}
                placeholder="8"
                keyboardType="number-pad"
              />
            </Field>
            <Field label="Crew" error={showErrors ? errors.crew : undefined} flex>
              <Input
                value={form.crew}
                onChangeText={(v) => update("crew", v)}
                placeholder="3"
                keyboardType="number-pad"
              />
            </Field>
          </Row>

          <Field label="Engine hours" error={showErrors ? errors.engine_hours : undefined}>
            <Input
              value={form.engine_hours}
              onChangeText={(v) => update("engine_hours", v)}
              placeholder="1200"
              keyboardType="number-pad"
            />
          </Field>

          <Row>
            <Field label="Home marina" flex>
              <Input
                value={form.marina_location}
                onChangeText={(v) => update("marina_location", v)}
                placeholder="e.g. Monaco"
                autoCapitalize="words"
              />
            </Field>
            <Field label="Flag" flex>
              <Input
                value={form.flag}
                onChangeText={(v) => update("flag", v)}
                placeholder="e.g. Malta"
                autoCapitalize="words"
              />
            </Field>
          </Row>

          <Pressable
            onPress={() =>
              update("commercial_registration", !form.commercial_registration)
            }
            style={styles.checkRow}
          >
            <View
              style={[
                styles.checkbox,
                form.commercial_registration && styles.checkboxOn,
              ]}
            >
              {form.commercial_registration ? (
                <Feather name="check" size={14} color={NAVY} />
              ) : null}
            </View>
            <Text style={styles.checkLabel}>
              Commercially registered (charter-ready)
            </Text>
          </Pressable>
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
          <Pressable
            onPress={submit}
            style={({ pressed }) => [
              styles.primaryBtn,
              { opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <Text style={styles.primaryBtnText}>Continue to ROI</Text>
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

// ── subcomponents ──────────────────────────────────────────────────────────

function TopBar({ onBack, title }: { onBack: () => void; title: string }) {
  return (
    <View style={styles.topBar}>
      <Pressable
        onPress={onBack}
        hitSlop={12}
        style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
      >
        <Feather name="chevron-left" size={26} color={GOLD} />
      </Pressable>
      <Text style={styles.topBarTitle}>{title}</Text>
      <View style={{ width: 26 }} />
    </View>
  );
}

function Field({
  label,
  error,
  hint,
  children,
  flex,
}: {
  label: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
  flex?: boolean;
}) {
  return (
    <View style={[styles.field, flex ? { flex: 1 } : null]}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
      {error ? (
        <Text style={styles.fieldError}>{error}</Text>
      ) : hint ? (
        <Text style={styles.fieldHint}>{hint}</Text>
      ) : null}
    </View>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <View style={styles.row}>{children}</View>;
}

function Input(props: React.ComponentProps<typeof TextInput>) {
  return (
    <TextInput
      {...props}
      placeholderTextColor={MUTED}
      style={[styles.input, props.style]}
    />
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: NAVY },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    marginBottom: 18,
  },
  topBarTitle: {
    color: IVORY,
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
    letterSpacing: 0.2,
  },
  lead: {
    color: MUTED,
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 22,
  },
  field: { marginBottom: 18 },
  fieldLabel: {
    color: MUTED,
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  fieldError: {
    color: ERROR,
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    marginTop: 6,
  },
  fieldHint: {
    color: MUTED,
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    marginTop: 6,
  },
  input: {
    backgroundColor: NAVY_DEEP,
    borderColor: DIVIDER,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: IVORY,
    fontFamily: "Inter_500Medium",
    fontSize: 15,
  },
  row: { flexDirection: "row", gap: 10 },
  pillRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    borderColor: DIVIDER,
    borderWidth: 1,
    backgroundColor: NAVY_DEEP,
  },
  pillActive: {
    backgroundColor: "rgba(201,169,97,0.12)",
    borderColor: GOLD,
    borderWidth: 1.5,
  },
  pillText: { color: IVORY, fontFamily: "Inter_500Medium", fontSize: 13 },
  pillTextActive: { color: GOLD, fontFamily: "Inter_700Bold" },
  checkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 4,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderColor: GOLD,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxOn: { backgroundColor: GOLD },
  checkLabel: { color: IVORY, fontFamily: "Inter_500Medium", fontSize: 14, flex: 1 },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 12,
    borderTopColor: DIVIDER,
    borderTopWidth: 1,
    backgroundColor: NAVY,
  },
  primaryBtn: {
    backgroundColor: "rgba(201,169,97,0.10)",
    borderWidth: 1.5,
    borderColor: GOLD,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  primaryBtnText: { color: GOLD, fontFamily: "Inter_700Bold", fontSize: 15 },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  emptyTitle: {
    color: IVORY,
    fontFamily: "Gilroy-Regular",
    fontSize: 20,
    marginTop: 14,
  },
});
