import { Feather } from "@expo/vector-icons";
import {
  getGetYachtQueryKey,
  useCalculateRoi,
  useGetYacht,
} from "@workspace/api-client-react";
import { useAuth } from "@clerk/expo";
import { AIRateEstimator } from "../../components/AIRateEstimator";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  LayoutAnimation,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  UIManager,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ANNUAL_FIELDS,
  buildRoiOverrides,
  computeCrewMonthlyTotal,
  EMPTY_FINANCIALS,
  hydrateFinancialsFromYacht,
  MONTHLY_FIELDS,
  type CrewRow,
  type FinancialsState,
  type FinancingType,
} from "../../lib/roiFinancials";

const NAVY = "#0B1E3F";
const NAVY_DEEP = "#081633";
const GOLD = "#C9A961";
const IVORY = "#F7F3EC";
const MUTED = "rgba(247,243,236,0.55)";
const DIVIDER = "rgba(247,243,236,0.08)";
const ERROR = "#FF8A8A";

const DEC_RE = /^\d+([.,]\d+)?$/;
const INT_RE = /^\d+$/;

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

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

const CHARTER_TYPE_OPTS = [
  { v: "weekly", l: "Weekly" },
  { v: "daily", l: "Daily" },
] as const;

type CharterType = (typeof CHARTER_TYPE_OPTS)[number]["v"];

// Per-region AI-mode charter config. `bases` = which charter bases the region
// supports in "По анкете"/AI mode (a region with >1 base shows the toggle; a
// single-base region shows a note instead). `seasons` = which season options
// apply. Regions absent here keep the default (all seasons, weekly basis, no
// toggle). Only affects pricing_mode="ai" — manual modes are unchanged.
const REGION_CHARTER: Record<
  string,
  { bases: CharterType[]; seasons: Season[] }
> = {
  caribbean: {
    bases: ["weekly", "daily"],
    seasons: ["mixed", "high", "shoulder"],
  },
  middle_east: {
    bases: ["daily"],
    seasons: ["mixed", "high", "low"],
  },
};

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
  const { isSignedIn } = useAuth();
  const params = useLocalSearchParams<{ yacht_id?: string }>();
  const yachtId = typeof params.yacht_id === "string" ? params.yacht_id : null;

  const [region, setRegion] = useState<Region>("mediterranean");
  const [season, setSeason] = useState<Season>("mixed");
  const [mgmt, setMgmt] = useState<Mgmt>("owner_operated");
  const [occ, setOcc] = useState<Occ>("realistic");
  const [pricingMode, setPricingMode] = useState<PricingMode>("ai");
  const [charterType, setCharterType] = useState<CharterType>("weekly");
  const [rate, setRate] = useState("");
  const [units, setUnits] = useState("");
  const [showErrors, setShowErrors] = useState(false);

  // Crew / expenses / financing — prefilled from the yacht where available,
  // editable here, and sent as per-calculation overrides (never saved back to
  // the yacht profile).
  const [fin, setFin] = useState<FinancialsState>(EMPTY_FINANCIALS);
  const hydratedRef = useRef<string | null>(null);
  const [expensesOpen, setExpensesOpen] = useState(true);
  const [financingOpen, setFinancingOpen] = useState(false);

  const yachtQ = useGetYacht(yachtId ?? "", {
    query: {
      queryKey: yachtId ? getGetYachtQueryKey(yachtId) : ["yacht-disabled"],
      enabled: Boolean(yachtId && isSignedIn),
    },
  });

  useEffect(() => {
    if (!yachtId) return;
    if (hydratedRef.current === yachtId) return;
    const y = yachtQ.data;
    if (!y) return;
    hydratedRef.current = yachtId;
    setFin(hydrateFinancialsFromYacht(y as unknown as Record<string, unknown>));
  }, [yachtId, yachtQ.data]);

  const updateFin = useCallback(
    <K extends keyof FinancialsState>(k: K, v: FinancialsState[K]) => {
      setFin((p) => ({ ...p, [k]: v }));
    },
    [],
  );

  const setCrew = useCallback((idx: number, patch: Partial<CrewRow>) => {
    setFin((p) => ({
      ...p,
      crew_breakdown: p.crew_breakdown.map((r, i) =>
        i === idx ? { ...r, ...patch } : r,
      ),
    }));
  }, []);

  const mutation = useCalculateRoi();

  const isManual = pricingMode !== "ai";
  const unitLabel = pricingMode === "manual_daily" ? "days" : "weeks";
  const rateLabel = pricingMode === "manual_daily" ? "Rate per day (€)" : "Rate per week (€)";
  const unitsLabel = pricingMode === "manual_daily" ? "Charter days per year" : "Charter weeks per year";

  // AI-mode charter config for the selected region (toggle + season options).
  const regionCharter = REGION_CHARTER[region];
  const availableBases: CharterType[] = regionCharter?.bases ?? ["weekly"];
  const seasonOptions = useMemo(() => {
    if (pricingMode === "ai" && regionCharter) {
      return SEASON_OPTS.filter((s) => regionCharter.seasons.includes(s.v));
    }
    return SEASON_OPTS;
  }, [pricingMode, regionCharter]);

  // Reconcile charterType + season whenever the region OR pricing mode changes
  // (e.g. switching manual→AI can expose a now-invalid season/basis) so we
  // never hold a value the selected region does not offer in AI mode.
  useEffect(() => {
    if (!availableBases.includes(charterType)) {
      setCharterType(availableBases[0]!);
    }
    if (!seasonOptions.some((s) => s.v === season)) {
      setSeason(seasonOptions[0]!.v);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [region, pricingMode]);

  const crewTotal = useMemo(
    () => computeCrewMonthlyTotal(fin.crew_breakdown),
    [fin.crew_breakdown],
  );

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
      const overrides = buildRoiOverrides(fin);
      const result = await mutation.mutateAsync({
        data: {
          yacht_id: yachtId,
          region,
          season,
          management_style: mgmt,
          occupancy_target: pricingMode === "ai" ? occ : null,
          pricing_mode: pricingMode,
          charter_type:
            pricingMode === "ai" && regionCharter ? charterType : null,
          manual_rate_eur: isManual ? parseNum(rate) : null,
          manual_charter_units: isManual ? parseInt10(units) : null,
          overrides: overrides ?? null,
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

  const toggleExpenses = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpensesOpen((v) => !v);
  };
  const toggleFinancing = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setFinancingOpen((v) => !v);
  };

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

  const isLoan = fin.financing_type === "loan";

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
              options={seasonOptions}
              value={season}
              onChange={(v) => setSeason(v as Season)}
            />
          </Section>

          {pricingMode === "ai" && regionCharter ? (
            <Section
              label="CHARTER BASIS"
              sublabel={
                availableBases.length > 1
                  ? "Charter this yacht by the week or by the day in this region."
                  : "This region is chartered by the day."
              }
            >
              {availableBases.length > 1 ? (
                <PillGroup
                  options={CHARTER_TYPE_OPTS.filter((o) =>
                    availableBases.includes(o.v),
                  )}
                  value={charterType}
                  onChange={(v) => setCharterType(v as CharterType)}
                />
              ) : (
                <View style={styles.basisNote}>
                  <Text style={styles.basisNoteText}>Daily charters only</Text>
                </View>
              )}
            </Section>
          ) : null}

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
              <AIRateEstimator
                yachtId={yachtId}
                region={region}
                season={season === "mixed" ? "high" : season}
                ratePeriod={pricingMode === "manual_daily" ? "day" : "week"}
                onAccept={(acceptedRate, period) => {
                  const wantsDaily = pricingMode === "manual_daily";
                  const rateInWanted =
                    wantsDaily && period === "week"
                      ? Math.round(acceptedRate / 7)
                      : !wantsDaily && period === "day"
                        ? Math.round(acceptedRate * 7)
                        : Math.round(acceptedRate);
                  setRate(String(rateInWanted));
                  setShowErrors(false);
                }}
              />
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

          {/* ── Crew & operating expenses ─────────────────────────── */}
          <CollapsibleHeader
            title="CREW & EXPENSES"
            open={expensesOpen}
            onToggle={toggleExpenses}
          />
          {expensesOpen ? (
            <View style={styles.collapseBody}>
              <Text style={styles.lead}>
                Specs come from your yacht. Fill in the running costs below for an
                accurate ROI. A blank line is left out of the calculation —
                except maintenance, management and broker commission, which
                always use a sensible default.
              </Text>

              <Text style={styles.subLabel}>CREW · BY POSITION</Text>
              {fin.crew_breakdown.map((row, i) => (
                <CrewRowEditor
                  key={`${row.role}-${i}`}
                  row={row}
                  onSalary={(v) => setCrew(i, { monthly_salary_eur: v })}
                  onMonths={(m) => setCrew(i, { months_per_year: m })}
                />
              ))}
              <View style={styles.crewTotalRow}>
                <Text style={styles.crewTotalLabel}>Total crew cost</Text>
                <Text style={styles.crewTotalValue}>
                  {crewTotal > 0 ? `€ ${crewTotal.toLocaleString("en-US")} / mo` : "—"}
                </Text>
              </View>
              <Text style={styles.fieldHint}>
                Months/year covers seasonal crew. The total feeds the ROI engine.
              </Text>

              <Text style={styles.subLabel}>MONTHLY · € PER MONTH</Text>
              {MONTHLY_FIELDS.map((f) => (
                <Field key={f.key} label={f.label} hint={f.hint}>
                  <MoneyInput
                    value={fin[f.key]}
                    onChangeText={(v) => updateFin(f.key, v)}
                    suffix="€ / mo"
                  />
                </Field>
              ))}

              <Text style={styles.subLabel}>ANNUAL · € PER YEAR</Text>
              {ANNUAL_FIELDS.map((f) => (
                <Field key={f.key} label={f.label} hint={f.hint}>
                  <MoneyInput
                    value={fin[f.key]}
                    onChangeText={(v) => updateFin(f.key, v)}
                    suffix="€ / yr"
                  />
                </Field>
              ))}

              <Text style={styles.subLabel}>CHARTER</Text>
              <Field
                label="Broker commission"
                hint="% of gross charter revenue paid to your broker"
              >
                <MoneyInput
                  value={fin.charter_commission_pct}
                  onChangeText={(v) => updateFin("charter_commission_pct", v)}
                  suffix="%"
                  placeholder="15"
                />
              </Field>
            </View>
          ) : null}

          {/* ── Financing ─────────────────────────────────────────── */}
          <CollapsibleHeader
            title="FINANCING"
            open={financingOpen}
            onToggle={toggleFinancing}
          />
          {financingOpen ? (
            <View style={styles.collapseBody}>
              <Field label="Financing">
                <View style={styles.pillRow}>
                  {[
                    { v: "cash" as const, l: "Cash purchase" },
                    { v: "loan" as const, l: "Loan / financing" },
                  ].map((opt) => {
                    const active = fin.financing_type === opt.v;
                    return (
                      <Pressable
                        key={opt.v}
                        onPress={() =>
                          updateFin("financing_type", opt.v as FinancingType)
                        }
                        style={[styles.pill, active && styles.pillActive]}
                      >
                        <Text
                          style={[styles.pillText, active && styles.pillTextActive]}
                        >
                          {opt.l}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </Field>

              {isLoan ? (
                <>
                  <Field label="Loan amount (€)">
                    <MoneyInput
                      value={fin.loan_amount_eur}
                      onChangeText={(v) => updateFin("loan_amount_eur", v)}
                      suffix="€"
                      placeholder="800000"
                    />
                  </Field>
                  <Field label="Interest rate (%)">
                    <MoneyInput
                      value={fin.loan_rate_pct}
                      onChangeText={(v) => updateFin("loan_rate_pct", v)}
                      suffix="%"
                      placeholder="5.5"
                    />
                  </Field>
                  <Field label="Term (years)">
                    <MoneyInput
                      value={fin.loan_term_years}
                      onChangeText={(v) => updateFin("loan_term_years", v)}
                      suffix="yr"
                      placeholder="10"
                    />
                  </Field>
                </>
              ) : (
                <Text style={styles.fieldHint}>
                  Loan details only affect this ROI calculation; they are not saved
                  to the yacht.
                </Text>
              )}
            </View>
          ) : null}

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

function CollapsibleHeader({
  title,
  open,
  onToggle,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <Pressable
      onPress={onToggle}
      style={({ pressed }) => [
        styles.collapseHeader,
        { opacity: pressed ? 0.7 : 1 },
      ]}
    >
      <Text style={styles.sectionLabel}>{title}</Text>
      <Feather
        name={open ? "chevron-up" : "chevron-down"}
        size={20}
        color={GOLD}
      />
    </Pressable>
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

function CrewRowEditor({
  row,
  onSalary,
  onMonths,
}: {
  row: CrewRow;
  onSalary: (v: string) => void;
  onMonths: (n: number) => void;
}) {
  const dec = () => {
    const next = Math.max(1, row.months_per_year - 1);
    if (next !== row.months_per_year) {
      onMonths(next);
      if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
    }
  };
  const inc = () => {
    const next = Math.min(12, row.months_per_year + 1);
    if (next !== row.months_per_year) {
      onMonths(next);
      if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
    }
  };
  return (
    <View style={styles.crewRow}>
      <Text style={styles.crewRole}>{row.role}</Text>
      <View style={styles.crewControls}>
        <View style={styles.crewSalaryWrap}>
          <TextInput
            value={row.monthly_salary_eur}
            onChangeText={onSalary}
            placeholder="0"
            placeholderTextColor={MUTED}
            keyboardType="decimal-pad"
            style={styles.crewSalaryInput}
          />
          <Text style={styles.crewSalarySuffix}>€ / mo</Text>
        </View>
        <View style={styles.crewStepper}>
          <Pressable
            onPress={dec}
            hitSlop={6}
            style={({ pressed }) => [styles.crewStepBtn, { opacity: pressed ? 0.6 : 1 }]}
          >
            <Feather name="minus" size={14} color={GOLD} />
          </Pressable>
          <View style={styles.crewMonthsBox}>
            <Text style={styles.crewMonthsValue}>{row.months_per_year}</Text>
            <Text style={styles.crewMonthsLabel}>mo / yr</Text>
          </View>
          <Pressable
            onPress={inc}
            hitSlop={6}
            style={({ pressed }) => [styles.crewStepBtn, { opacity: pressed ? 0.6 : 1 }]}
          >
            <Feather name="plus" size={14} color={GOLD} />
          </Pressable>
        </View>
      </View>
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
  basisNote: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(201,169,97,0.35)",
    backgroundColor: "rgba(201,169,97,0.08)",
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  basisNoteText: {
    color: GOLD,
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
  },
  sectionSub: {
    color: MUTED,
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 10,
  },
  lead: {
    color: MUTED,
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 14,
  },
  subLabel: {
    color: GOLD,
    fontFamily: "Inter_700Bold",
    fontSize: 10,
    letterSpacing: 1.4,
    marginTop: 14,
    marginBottom: 8,
  },
  collapseHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    borderTopColor: DIVIDER,
    borderTopWidth: 1,
    marginTop: 6,
  },
  collapseBody: { marginBottom: 8 },
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
  // Crew breakdown
  crewRow: {
    paddingVertical: 12,
    borderBottomColor: DIVIDER,
    borderBottomWidth: 1,
  },
  crewRole: {
    color: IVORY,
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    marginBottom: 8,
  },
  crewControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  crewSalaryWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: NAVY_DEEP,
    borderColor: DIVIDER,
    borderWidth: 1,
    borderRadius: 10,
    paddingRight: 12,
  },
  crewSalaryInput: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: IVORY,
    fontFamily: "Inter_500Medium",
    fontSize: 15,
  },
  crewSalarySuffix: {
    color: MUTED,
    fontFamily: "Inter_500Medium",
    fontSize: 11,
  },
  crewStepper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  crewStepBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderColor: DIVIDER,
    borderWidth: 1,
    backgroundColor: NAVY_DEEP,
    alignItems: "center",
    justifyContent: "center",
  },
  crewMonthsBox: { alignItems: "center", minWidth: 42 },
  crewMonthsValue: { color: IVORY, fontFamily: "Inter_700Bold", fontSize: 15 },
  crewMonthsLabel: { color: MUTED, fontFamily: "Inter_400Regular", fontSize: 9 },
  crewTotalRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    marginTop: 4,
  },
  crewTotalLabel: {
    color: IVORY,
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
  },
  crewTotalValue: {
    color: GOLD,
    fontFamily: "Inter_700Bold",
    fontSize: 15,
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
