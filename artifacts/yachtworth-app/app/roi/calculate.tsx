import { Feather } from "@expo/vector-icons";
import { useCalculateRoi } from "@workspace/api-client-react";
import { useLocalSearchParams, useRouter } from "expo-router";
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
const NAVY_DEEP = "#081633";
const GOLD = "#C9A961";
const IVORY = "#F7F3EC";
const MUTED = "rgba(247,243,236,0.55)";
const DIVIDER = "rgba(247,243,236,0.08)";
const ERROR = "#FF8A8A";

const DEC_RE = /^\d+([.,]\d+)?$/;
const INT_RE = /^\d+$/;

const REGION_OPTS = [
  { v: "mediterranean", l: "Mediterranean" },
  { v: "caribbean", l: "Caribbean" },
  { v: "northern_europe", l: "Northern Europe" },
  { v: "asia_pacific_me", l: "Asia-Pacific" },
  { v: "middle_east", l: "Middle East" },
] as const;

const SEASON_OPTS = [
  { v: "mixed", l: "Full year (mixed)" },
  { v: "high", l: "High season" },
  { v: "shoulder", l: "Shoulder" },
  { v: "low", l: "Low season" },
] as const;

const MGMT_OPTS = [
  { v: "owner_operated", l: "Owner-operated" },
  { v: "management_company", l: "Management company" },
  { v: "brokerage", l: "Brokerage" },
] as const;

const OCC_OPTS = [
  { v: "conservative", l: "Conservative" },
  { v: "realistic", l: "Realistic" },
  { v: "optimistic", l: "Optimistic" },
] as const;

type Region = (typeof REGION_OPTS)[number]["v"];
type Season = (typeof SEASON_OPTS)[number]["v"];
type Mgmt = (typeof MGMT_OPTS)[number]["v"];
type Occ = (typeof OCC_OPTS)[number]["v"];
type PricingMode = "manual_daily" | "manual_weekly" | "ai";

function parseNum(v: string) {
  const n = parseFloat(v.replace(",", "."));
  return isFinite(n) ? n : null;
}
function parseInt10(v: string) {
  const n = parseInt(v.replace(/[^0-9]/g, ""), 10);
  return isFinite(n) ? n : null;
}

export default function RoiCalculateScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ yacht_id?: string }>();
  const yachtId = typeof params.yacht_id === "string" ? params.yacht_id : null;

  const [region, setRegion] = useState<Region>("mediterranean");
  const [season, setSeason] = useState<Season>("mixed");
  const [mgmt, setMgmt] = useState<Mgmt>("owner_operated");
  const [occ, setOcc] = useState<Occ>("realistic");
  const [pricingMode, setPricingMode] = useState<PricingMode>("ai");
  const [rate, setRate] = useState("");
  const [units, setUnits] = useState("");
  const [showErrors, setShowErrors] = useState(false);

  const mutation = useCalculateRoi();

  const isManual = pricingMode !== "ai";
  const unitLabel = pricingMode === "manual_daily" ? "days" : "weeks";
  const rateLabel = pricingMode === "manual_daily" ? "Rate per day (€)" : "Rate per week (€)";
  const unitsLabel = pricingMode === "manual_daily" ? "Charter days per year" : "Charter weeks per year";

  const errors = useMemo(() => {
    const e: Record<string, string> = {};
    if (isManual) {
      if (!rate) e.rate = "Required";
      else if (!DEC_RE.test(rate)) e.rate = "Invalid amount";
      else if (parseNum(rate)! <= 0) e.rate = "Must be > 0";
      if (!units) e.units = "Required";
      else if (!INT_RE.test(units)) e.units = "Whole number";
      else {
        const n = parseInt10(units)!;
        const max = pricingMode === "manual_daily" ? 366 : 52;
        if (n <= 0 || n > max) e.units = `1–${max}`;
      }
    }
    return e;
  }, [isManual, rate, units, pricingMode]);

  const onSubmit = async () => {
    if (!yachtId) return;
    if (Object.keys(errors).length) {
      setShowErrors(true);
      return;
    }
    setShowErrors(false);
    if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
    try {
      const result = await mutation.mutateAsync({
        data: {
          yacht_id: yachtId,
          region,
          season,
          management_style: mgmt,
          occupancy_target: pricingMode === "ai" ? occ : null,
          pricing_mode: pricingMode,
          manual_rate_eur: isManual ? parseNum(rate) : null,
          manual_charter_units: isManual ? parseInt10(units) : null,
        } as never,
      });
      router.replace({
        pathname: "/roi/result",
        params: { data: JSON.stringify(result) },
      });
    } catch {
      /* error banner below */
    }
  };

  const mutError =
    mutation.error instanceof Error ? mutation.error.message : null;

  if (!yachtId) {
    return (
      <View style={[styles.root, { paddingTop: insets.top + 72 }]}>
        <TopBar onBack={() => router.back()} title="Charter ROI" />
        <View style={styles.empty}>
          <Feather name="alert-circle" size={24} color={GOLD} />
          <Text style={styles.emptyTitle}>No yacht selected</Text>
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
        <TopBar onBack={() => router.back()} title="ROI scenario" />

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 160 }}
          keyboardShouldPersistTaps="handled"
        >
          <Section label="REGION">
            <PillGroup
              options={REGION_OPTS}
              value={region}
              onChange={(v) => setRegion(v as Region)}
            />
          </Section>

          <Section label="SEASON">
            <PillGroup
              options={SEASON_OPTS}
              value={season}
              onChange={(v) => setSeason(v as Season)}
            />
          </Section>

          <Section label="MANAGEMENT">
            <PillGroup
              options={MGMT_OPTS}
              value={mgmt}
              onChange={(v) => setMgmt(v as Mgmt)}
            />
          </Section>

          <Section
            label="CHARTER PRICING"
            sublabel="Pick how you want to set the charter rate and number of charters."
          >
            <PillGroup
              options={[
                { v: "ai", l: "AI market estimate" },
                { v: "manual_weekly", l: "Manual · per week" },
                { v: "manual_daily", l: "Manual · per day" },
              ]}
              value={pricingMode}
              onChange={(v) => setPricingMode(v as PricingMode)}
            />
          </Section>

          {isManual ? (
            <>
              <Field label={rateLabel} error={showErrors ? errors.rate : undefined}>
                <MoneyInput
                  value={rate}
                  onChangeText={setRate}
                  suffix={pricingMode === "manual_daily" ? "€ / day" : "€ / week"}
                  placeholder={pricingMode === "manual_daily" ? "5000" : "35000"}
                />
              </Field>
              <Field
                label={unitsLabel}
                error={showErrors ? errors.units : undefined}
                hint={`How many charter ${unitLabel} you expect to book this year.`}
              >
                <MoneyInput
                  value={units}
                  onChangeText={setUnits}
                  suffix={unitLabel}
                  placeholder={pricingMode === "manual_daily" ? "60" : "12"}
                />
              </Field>
            </>
          ) : (
            <Section label="AI OCCUPANCY POSTURE" sublabel="How busy should the AI assume the yacht will be?">
              <PillGroup
                options={OCC_OPTS}
                value={occ}
                onChange={(v) => setOcc(v as Occ)}
              />
            </Section>
          )}

          {mutError ? <Text style={styles.errorBanner}>{mutError}</Text> : null}
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
          <Pressable
            onPress={onSubmit}
            disabled={mutation.isPending}
            style={({ pressed }) => [
              styles.primaryBtn,
              { opacity: mutation.isPending ? 0.6 : pressed ? 0.85 : 1 },
            ]}
          >
            {mutation.isPending ? (
              <ActivityIndicator color={GOLD} />
            ) : (
              <Text style={styles.primaryBtnText}>
                {pricingMode === "ai" ? "Run AI estimate" : "Calculate ROI"}
              </Text>
            )}
          </Pressable>
          {pricingMode === "ai" ? (
            <Text style={styles.footHint}>
              AI mode searches the open web for comparable listings. Takes 10–30 s.
            </Text>
          ) : null}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

// ── subcomponents ──────────────────────────────────────────────────

function TopBar({ onBack, title }: { onBack: () => void; title: string }) {
  return (
    <View style={styles.topBar}>
      <Pressable onPress={onBack} hitSlop={12}>
        <Feather name="chevron-left" size={26} color={GOLD} />
      </Pressable>
      <Text style={styles.topBarTitle}>{title}</Text>
      <View style={{ width: 26 }} />
    </View>
  );
}

function Section({
  label,
  sublabel,
  children,
}: {
  label: string;
  sublabel?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={{ marginBottom: 20 }}>
      <Text style={styles.sectionLabel}>{label}</Text>
      {sublabel ? <Text style={styles.sectionSub}>{sublabel}</Text> : null}
      {children}
    </View>
  );
}

function PillGroup<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly { v: T; l: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <View style={styles.pillRow}>
      {options.map((o) => {
        const active = o.v === value;
        return (
          <Pressable
            key={o.v}
            onPress={() => onChange(o.v)}
            style={[styles.pill, active && styles.pillActive]}
          >
            <Text style={[styles.pillText, active && styles.pillTextActive]}>
              {o.l}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function Field({
  label,
  error,
  hint,
  children,
}: {
  label: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.field}>
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

function MoneyInput({
  value,
  onChangeText,
  suffix,
  placeholder,
}: {
  value: string;
  onChangeText: (v: string) => void;
  suffix: string;
  placeholder?: string;
}) {
  return (
    <View style={styles.moneyWrap}>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={MUTED}
        keyboardType="decimal-pad"
        style={styles.moneyInput}
      />
      <Text style={styles.moneySuffix}>{suffix}</Text>
    </View>
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
  },
  sectionLabel: {
    color: GOLD,
    fontFamily: "Inter_700Bold",
    fontSize: 11,
    letterSpacing: 1.6,
    marginBottom: 8,
  },
  sectionSub: {
    color: MUTED,
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 10,
  },
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
  field: { marginBottom: 18 },
  fieldLabel: {
    color: MUTED,
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  fieldError: { color: ERROR, fontFamily: "Inter_500Medium", fontSize: 11, marginTop: 6 },
  fieldHint: { color: MUTED, fontFamily: "Inter_400Regular", fontSize: 11, marginTop: 6 },
  moneyWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: NAVY_DEEP,
    borderColor: DIVIDER,
    borderWidth: 1,
    borderRadius: 10,
    paddingRight: 12,
  },
  moneyInput: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: IVORY,
    fontFamily: "Inter_500Medium",
    fontSize: 15,
  },
  moneySuffix: {
    color: MUTED,
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    letterSpacing: 0.5,
  },
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
  footHint: {
    color: MUTED,
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    textAlign: "center",
    marginTop: 8,
    fontStyle: "italic",
  },
  errorBanner: {
    color: ERROR,
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    textAlign: "center",
    marginTop: 14,
  },
  empty: { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyTitle: { color: IVORY, fontFamily: "Gilroy-Regular", fontSize: 20, marginTop: 14 },
});
