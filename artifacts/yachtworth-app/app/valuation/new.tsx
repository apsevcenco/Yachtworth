import { Feather } from "@expo/vector-icons";
import { useCreateValuation } from "@workspace/api-client-react";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
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
const MUTED = "rgba(247,243,236,0.55)";
const DIVIDER = "rgba(247,243,236,0.08)";

type YachtType =
  | "motor_yacht"
  | "sailing_yacht"
  | "catamaran"
  | "superyacht";

type Condition =
  | "New"
  | "Excellent"
  | "Good"
  | "Fair"
  | "Needs Refit"
  | "Project";

const TYPE_OPTIONS: { value: YachtType; label: string }[] = [
  { value: "motor_yacht", label: "Motor" },
  { value: "sailing_yacht", label: "Sailing" },
  { value: "catamaran", label: "Catamaran" },
  { value: "superyacht", label: "Superyacht" },
];

const CONDITION_OPTIONS: Condition[] = [
  "New",
  "Excellent",
  "Good",
  "Fair",
  "Needs Refit",
  "Project",
];

export default function NewValuationScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const mutation = useCreateValuation();

  const [type, setType] = useState<YachtType>("motor_yacht");
  const [condition, setCondition] = useState<Condition>("Excellent");
  const [length, setLength] = useState("");
  const [year, setYear] = useState("");
  const [shipyard, setShipyard] = useState("");
  const [model, setModel] = useState("");
  const [configuration, setConfiguration] = useState("");
  const [enginesHp, setEnginesHp] = useState("");
  const [beam, setBeam] = useState("");
  const [hullMaterial, setHullMaterial] = useState("");
  const [notes, setNotes] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const lengthNum = useMemo(() => parseFloat(length.replace(",", ".")), [
    length,
  ]);
  const yearNum = useMemo(() => parseInt(year, 10), [year]);

  const lengthValid = !isNaN(lengthNum) && lengthNum > 0 && lengthNum <= 200;
  const yearValid = !isNaN(yearNum) && yearNum >= 1900 && yearNum <= 2100;
  const formValid = lengthValid && yearValid;

  const onSubmit = () => {
    setSubmitted(true);
    if (!formValid) {
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    mutation.mutate(
      {
        data: {
          type,
          condition,
          length_meters: lengthNum,
          year_built: yearNum,
          shipyard: shipyard.trim() || null,
          model: model.trim() || null,
          configuration: configuration.trim() || null,
          engines_hp: enginesHp ? parseInt(enginesHp, 10) || null : null,
          beam_meters: beam ? parseFloat(beam.replace(",", ".")) || null : null,
          hull_material: hullMaterial.trim() || null,
          notes: notes.trim() || null,
        },
      },
      {
        onSuccess: (result) => {
          if (Platform.OS !== "web")
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          router.replace({
            pathname: "/valuation/result",
            params: { data: JSON.stringify(result) },
          });
        },
        onError: () => {
          if (Platform.OS !== "web")
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        },
      },
    );
  };

  const isLoading = mutation.isPending;
  const errorMessage =
    (mutation.error as { data?: { error?: string }; message?: string } | null)
      ?.data?.error ??
    (mutation.error as Error | null)?.message ??
    null;

  return (
    <View style={[styles.root, { backgroundColor: NAVY }]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={0}
      >
        <View style={[styles.headerBar, { paddingTop: insets.top + 12 }]}>
          <Pressable onPress={() => router.back()} hitSlop={16}>
            <Feather name="chevron-left" size={24} color={IVORY} />
          </Pressable>
          <Text style={styles.headerTitle}>New valuation</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: 24,
            paddingBottom: insets.bottom + 140,
          }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.kicker}>Tell us about your yacht</Text>
          <Text style={styles.subhero}>
            The more accurate the inputs, the more reliable the valuation.
          </Text>

          {/* Type */}
          <Section label="Type">
            <View style={styles.pillsRow}>
              {TYPE_OPTIONS.map((opt) => (
                <Pill
                  key={opt.value}
                  label={opt.label}
                  active={type === opt.value}
                  onPress={() => setType(opt.value)}
                />
              ))}
            </View>
          </Section>

          {/* Length / Year */}
          <View style={styles.row2}>
            <Section label="Length (m) *" style={{ flex: 1 }}>
              <Field
                value={length}
                onChangeText={setLength}
                placeholder="e.g. 24"
                keyboardType="decimal-pad"
                error={submitted && !lengthValid}
              />
            </Section>
            <Section label="Year built *" style={{ flex: 1 }}>
              <Field
                value={year}
                onChangeText={setYear}
                placeholder="e.g. 2018"
                keyboardType="number-pad"
                maxLength={4}
                error={submitted && !yearValid}
              />
            </Section>
          </View>

          {/* Condition */}
          <Section label="Condition">
            <View style={styles.pillsRowWrap}>
              {CONDITION_OPTIONS.map((c) => (
                <Pill
                  key={c}
                  label={c}
                  active={condition === c}
                  onPress={() => setCondition(c)}
                />
              ))}
            </View>
          </Section>

          {/* Shipyard / Model */}
          <Section label="Shipyard">
            <Field
              value={shipyard}
              onChangeText={setShipyard}
              placeholder="e.g. Sunseeker, Azimut, Feadship"
              autoCapitalize="words"
            />
          </Section>
          <Section label="Model">
            <Field
              value={model}
              onChangeText={setModel}
              placeholder="e.g. Manhattan 66"
              autoCapitalize="words"
            />
          </Section>
          <Section label="Configuration">
            <Field
              value={configuration}
              onChangeText={setConfiguration}
              placeholder="e.g. flybridge, sport yacht, sloop"
              autoCapitalize="none"
            />
          </Section>

          {/* Optional specs */}
          <View style={styles.row2}>
            <Section label="Engines (total HP)" style={{ flex: 1 }}>
              <Field
                value={enginesHp}
                onChangeText={setEnginesHp}
                placeholder="e.g. 2200"
                keyboardType="number-pad"
              />
            </Section>
            <Section label="Beam (m)" style={{ flex: 1 }}>
              <Field
                value={beam}
                onChangeText={setBeam}
                placeholder="e.g. 5.6"
                keyboardType="decimal-pad"
              />
            </Section>
          </View>
          <Section label="Hull material">
            <Field
              value={hullMaterial}
              onChangeText={setHullMaterial}
              placeholder="e.g. GRP, aluminium, steel"
              autoCapitalize="none"
            />
          </Section>

          <Section label="Owner notes">
            <Field
              value={notes}
              onChangeText={setNotes}
              placeholder="Recent refit, custom equipment, etc."
              multiline
              style={{ minHeight: 84, paddingTop: 14 }}
            />
          </Section>

          {errorMessage && !isLoading ? (
            <View style={styles.errorBanner}>
              <Feather name="alert-circle" size={14} color="#FF8A8A" />
              <Text style={styles.errorBannerText}>
                {errorMessage.length > 240
                  ? errorMessage.slice(0, 240) + "…"
                  : errorMessage}
              </Text>
            </View>
          ) : null}
        </ScrollView>

        <View
          style={[
            styles.footer,
            { paddingBottom: insets.bottom + 18, backgroundColor: NAVY_DEEP },
          ]}
        >
          <Pressable
            onPress={onSubmit}
            disabled={isLoading}
            style={({ pressed }) => [
              styles.cta,
              {
                opacity: isLoading ? 0.7 : pressed ? 0.85 : 1,
                transform: [{ scale: pressed ? 0.99 : 1 }],
              },
            ]}
          >
            {isLoading ? (
              <ActivityIndicator color={NAVY} />
            ) : (
              <>
                <Text style={styles.ctaText}>Get valuation</Text>
                <Feather name="arrow-right" size={18} color={NAVY} />
              </>
            )}
          </Pressable>
          <Text style={styles.footerNote}>
            Powered by AI · Takes ~30 seconds
          </Text>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

function Section({
  label,
  children,
  style,
}: {
  label: string;
  children: React.ReactNode;
  style?: object;
}) {
  return (
    <View style={[styles.section, style]}>
      <Text style={styles.sectionLabel}>{label}</Text>
      {children}
    </View>
  );
}

function Pill({
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
      onPress={() => {
        if (Platform.OS !== "web") Haptics.selectionAsync();
        onPress();
      }}
      style={({ pressed }) => [
        styles.pill,
        active && styles.pillActive,
        { opacity: pressed && !active ? 0.7 : 1 },
      ]}
    >
      <Text style={[styles.pillText, active && styles.pillTextActive]}>
        {label}
      </Text>
    </Pressable>
  );
}

function Field({
  error,
  style,
  ...props
}: React.ComponentProps<typeof TextInput> & { error?: boolean }) {
  return (
    <TextInput
      placeholderTextColor="rgba(247,243,236,0.35)"
      style={[
        styles.field,
        error && { borderColor: "#FF8A8A" },
        style,
      ]}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  headerTitle: {
    color: IVORY,
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    letterSpacing: 0.3,
  },
  kicker: {
    color: GOLD,
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    letterSpacing: 2,
    textTransform: "uppercase",
    marginTop: 6,
    marginBottom: 8,
  },
  subhero: {
    color: MUTED,
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 24,
  },
  section: { marginBottom: 18 },
  sectionLabel: {
    color: "rgba(247,243,236,0.7)",
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  row2: { flexDirection: "row", gap: 12 },
  pillsRow: { flexDirection: "row", gap: 8 },
  pillsRowWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  pill: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: DIVIDER,
    backgroundColor: NAVY_ELEV,
  },
  pillActive: {
    borderColor: GOLD,
    backgroundColor: "rgba(201,169,97,0.14)",
  },
  pillText: {
    color: "rgba(247,243,236,0.7)",
    fontFamily: "Inter_500Medium",
    fontSize: 13,
  },
  pillTextActive: { color: GOLD },
  field: {
    backgroundColor: NAVY_ELEV,
    borderWidth: 1,
    borderColor: DIVIDER,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
    color: IVORY,
    fontFamily: "Inter_500Medium",
    fontSize: 15,
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "rgba(255,138,138,0.10)",
    borderColor: "rgba(255,138,138,0.35)",
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginTop: 4,
  },
  errorBannerText: {
    flex: 1,
    color: "#FF8A8A",
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    lineHeight: 17,
  },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: DIVIDER,
  },
  cta: {
    backgroundColor: GOLD,
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  ctaText: {
    color: NAVY,
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    letterSpacing: 0.3,
  },
  footerNote: {
    color: "rgba(247,243,236,0.4)",
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    textAlign: "center",
    marginTop: 10,
  },
});
