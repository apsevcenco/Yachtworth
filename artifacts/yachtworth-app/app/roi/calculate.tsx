import { Feather } from "@expo/vector-icons";
import {
  getGetRoiCalculationQueryKey,
  getGetYachtQueryKey,
  getListRoiCalculationsQueryKey,
  useCalculateRoi,
  useDeleteRoiCalculation,
  useGetRoiCalculation,
  useGetYacht,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
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
import { useUnits } from "../../hooks/useUnits";
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

const CHARTER_TYPE_OPTS = [
  { v: "weekly", l: "Weekly" },
  { v: "daily", l: "Daily" },
] as const;

type CharterType = (typeof CHARTER_TYPE_OPTS)[number]["v"];

// Per-region AI-mode charter config. `bases` = which charter bases the region
// supports in AI mode (a region with >1 base shows the toggle; a single-base
// region shows a note instead). Regions absent here keep the default (weekly
// basis, no toggle). Only affects pricing_mode="ai" — manual modes unchanged.
const REGION_CHARTER: Record<string, { bases: CharterType[] }> = {
  caribbean: { bases: ["weekly", "daily"] },
  middle_east: { bases: ["daily"] },
  northern_europe: { bases: ["weekly", "daily"] },
  asia_pacific_me: { bases: ["weekly", "daily"] },
};

const OCC_OPTS = [
  { v: "conservative", l: "Conservative" },
  { v: "realistic", l: "Realistic" },
  { v: "optimistic", l: "Optimistic" },
] as const;

type Region = (typeof REGION_OPTS)[number]["v"];
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

const YACHT_TYPE_LABELS: Record<string, string> = {
  motor_yacht: "Motor Yacht",
  sailing_yacht: "Sailing Yacht",
  catamaran: "Catamaran",
  superyacht: "Superyacht",
};

function formatLength(
  meters: number | null,
  units: "metric" | "imperial",
): string {
  if (meters == null || !Number.isFinite(meters)) return "—";
  if (units === "imperial") {
    return `${Math.round(meters * 3.28084)} ft`;
  }
  return `${meters % 1 === 0 ? meters : meters.toFixed(1)} m`;
}

export default function RoiCalculateScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { isSignedIn } = useAuth();
  const { units: displayUnits } = useUnits();
  const queryClient = useQueryClient();
  const params = useLocalSearchParams<{
    yacht_id?: string;
    snapshot?: string;
    edit_id?: string;
  }>();
  const paramYachtId = typeof params.yacht_id === "string" ? params.yacht_id : null;

  // Editing an existing ROI request: load the saved calculation and prefill the
  // whole form from it. Editing replaces the old request (delete + re-create) so
  // history shows the updated run. The underlying My Yacht is never touched.
  const editId = typeof params.edit_id === "string" ? params.edit_id : null;
  const editQ = useGetRoiCalculation(editId ?? "", {
    query: {
      queryKey: editId ? getGetRoiCalculationQueryKey(editId) : ["roi-edit-disabled"],
      enabled: Boolean(editId && isSignedIn),
    },
  });

  // A manually-entered yacht arrives as a JSON passport snapshot. It is never a
  // My Yachts record — it is sent to the backend as `yacht_snapshot` and lives
  // only in ROI history. When editing, the yacht (id or snapshot) comes from the
  // saved calculation instead.
  const paramSnapshot = useMemo<Record<string, unknown> | null>(() => {
    if (typeof params.snapshot !== "string" || !params.snapshot) return null;
    try {
      const parsed = JSON.parse(params.snapshot);
      return parsed && typeof parsed === "object" ? parsed : null;
    } catch {
      return null;
    }
  }, [params.snapshot]);

  const yachtId =
    paramYachtId ?? (editId ? editQ.data?.yacht_id ?? null : null);
  const snapshot = useMemo<Record<string, unknown> | null>(() => {
    if (paramSnapshot) return paramSnapshot;
    const es = editId ? editQ.data?.yacht_snapshot : null;
    return es && typeof es === "object" ? (es as Record<string, unknown>) : null;
  }, [paramSnapshot, editId, editQ.data]);
  const isManualYacht = !yachtId && snapshot != null;

  const [region, setRegion] = useState<Region>("mediterranean");
  const [occ, setOcc] = useState<Occ>("realistic");
  const [pricingMode, setPricingMode] = useState<PricingMode>("ai");
  const [charterType, setCharterType] = useState<CharterType>("weekly");
  const [rate, setRate] = useState("");
  const [units, setUnits] = useState("");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [showErrors, setShowErrors] = useState(false);

  // Crew / expenses / financing — prefilled from the yacht where available,
  // editable here, and sent as per-calculation overrides (never saved back to
  // the yacht profile).
  const [fin, setFin] = useState<FinancialsState>(EMPTY_FINANCIALS);
  const hydratedRef = useRef<string | null>(null);
  const editHydratedRef = useRef<string | null>(null);
  const [expensesOpen, setExpensesOpen] = useState(true);
  const [financingOpen, setFinancingOpen] = useState(false);

  const yachtQ = useGetYacht(yachtId ?? "", {
    query: {
      queryKey: yachtId ? getGetYachtQueryKey(yachtId) : ["yacht-disabled"],
      enabled: Boolean(yachtId && isSignedIn),
    },
  });

  useEffect(() => {
    // When editing, the saved calculation's overrides own the form — skip the
    // yacht-profile hydrate so it can't overwrite the user's saved ROI inputs.
    if (editId) return;
    if (!yachtId) return;
    if (hydratedRef.current === yachtId) return;
    const y = yachtQ.data;
    if (!y) return;
    hydratedRef.current = yachtId;
    setFin(hydrateFinancialsFromYacht(y as unknown as Record<string, unknown>));
    // Prefill purchase price from a saved profile when it has one (legacy
    // profiles created before ROI was decoupled). Purchase price is otherwise
    // an ROI-only field, entered here.
    const pp = (y as { purchase_price_eur?: number | null }).purchase_price_eur;
    if (pp != null && Number.isFinite(pp)) setPurchasePrice(String(pp));
  }, [editId, yachtId, yachtQ.data]);

  // Prefill the whole form from a saved ROI request when editing. Runs once per
  // edit_id. The overrides object uses the same field names as the yacht
  // financials, so hydrateFinancialsFromYacht maps it directly.
  useEffect(() => {
    if (!editId) return;
    if (editHydratedRef.current === editId) return;
    const d = editQ.data;
    if (!d) return;
    editHydratedRef.current = editId;
    const inp = d.input;
    if (REGION_OPTS.some((o) => o.v === inp.region)) {
      setRegion(inp.region as Region);
    }
    setPricingMode(inp.pricing_mode as PricingMode);
    if (inp.occupancy_target && OCC_OPTS.some((o) => o.v === inp.occupancy_target)) {
      setOcc(inp.occupancy_target as Occ);
    }
    if (inp.charter_type === "weekly" || inp.charter_type === "daily") {
      setCharterType(inp.charter_type);
    }
    if (inp.manual_rate_eur != null) setRate(String(inp.manual_rate_eur));
    if (inp.manual_charter_units != null) setUnits(String(inp.manual_charter_units));
    const ov = (inp.overrides ?? {}) as Record<string, unknown>;
    setFin(hydrateFinancialsFromYacht(ov));
    const pp = ov.purchase_price_eur;
    if (typeof pp === "number" && Number.isFinite(pp)) setPurchasePrice(String(pp));
  }, [editId, editQ.data]);

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
  const deleteMutation = useDeleteRoiCalculation();

  const isManual = pricingMode !== "ai";
  const unitLabel = pricingMode === "manual_daily" ? "days" : "weeks";
  const rateLabel = pricingMode === "manual_daily" ? "Rate per day (€)" : "Rate per week (€)";
  const unitsLabel = pricingMode === "manual_daily" ? "Charter days per year" : "Charter weeks per year";

  // AI-mode charter config for the selected region (charter-basis toggle).
  const regionCharter = REGION_CHARTER[region];
  const availableBases: CharterType[] = regionCharter?.bases ?? ["weekly"];

  // Reconcile charterType whenever the region OR pricing mode changes (e.g.
  // switching manual→AI can expose a now-invalid basis) so we never hold a
  // value the selected region does not offer in AI mode.
  useEffect(() => {
    if (!availableBases.includes(charterType)) {
      setCharterType(availableBases[0]!);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [region, pricingMode]);

  const crewTotal = useMemo(
    () => computeCrewMonthlyTotal(fin.crew_breakdown),
    [fin.crew_breakdown],
  );

  // Unified passport for the read-only summary — from the saved My Yacht (when a
  // yacht_id was passed) or the manual snapshot. ROI never writes back to it.
  const passport = useMemo(() => {
    const src = (yachtId ? yachtQ.data : snapshot) as
      | Record<string, unknown>
      | null
      | undefined;
    if (!src) return null;
    const s = (k: string) =>
      typeof src[k] === "string" && (src[k] as string).trim() !== ""
        ? (src[k] as string)
        : null;
    const n = (k: string) =>
      typeof src[k] === "number" && Number.isFinite(src[k] as number)
        ? (src[k] as number)
        : null;
    const title =
      s("name") ||
      [s("brand"), s("model")].filter(Boolean).join(" ") ||
      "Your yacht";
    return {
      title,
      yacht_type: s("yacht_type"),
      year_built: n("year_built"),
      length_meters: n("length_meters"),
      cabins: n("cabins"),
      guests: n("guests"),
      crew: n("crew"),
      flag: s("flag"),
    };
  }, [yachtId, yachtQ.data, snapshot]);

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
    if (!yachtId && !snapshot) return;
    if (Object.keys(errors).length) {
      setShowErrors(true);
      return;
    }
    setShowErrors(false);
    if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
    try {
      // Purchase price is an ROI-only input — fold it into the overrides so the
      // engine uses it for payback / depreciation. Never saved to the yacht.
      const overrides = buildRoiOverrides(fin) ?? {};
      const pp = parseNum(purchasePrice);
      if (pp != null && pp >= 0) overrides.purchase_price_eur = pp;
      const hasOverrides = Object.keys(overrides).length > 0;
      const result = await mutation.mutateAsync({
        data: {
          yacht_id: yachtId ?? null,
          yacht_snapshot: yachtId ? null : snapshot,
          region,
          occupancy_target: pricingMode === "ai" ? occ : null,
          pricing_mode: pricingMode,
          charter_type:
            pricingMode === "ai" && regionCharter ? charterType : null,
          manual_rate_eur: isManual ? parseNum(rate) : null,
          manual_charter_units: isManual ? parseInt10(units) : null,
          overrides: hasOverrides ? overrides : null,
        } as never,
      });
      // Editing replaces the old request: now that the new run saved, remove the
      // one we opened so history shows a single updated entry. Best-effort —
      // never blocks navigation, and never touches the My Yacht.
      if (editId) {
        try {
          await deleteMutation.mutateAsync({ id: editId });
        } catch {
          /* leave the old one if delete fails; the new run still saved */
        }
        queryClient.invalidateQueries({
          queryKey: getListRoiCalculationsQueryKey(),
        });
      }
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

  // While an edit request is still loading, show a spinner instead of the
  // "no yacht selected" empty state (the yacht arrives with the saved calc).
  if (editId && !yachtId && !snapshot) {
    return (
      <View style={[styles.root, { paddingTop: insets.top + 72 }]}>
        <TopBar onBack={() => router.back()} title="ROI scenario" />
        <View style={styles.empty}>
          {editQ.isError ? (
            <>
              <Feather name="alert-circle" size={24} color={GOLD} />
              <Text style={styles.emptyTitle}>Couldn't load this ROI request</Text>
            </>
          ) : (
            <ActivityIndicator color={GOLD} />
          )}
        </View>
      </View>
    );
  }

  if (!yachtId && !snapshot) {
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
          {passport ? (
            <View style={styles.yachtSummary}>
              <Text style={styles.yachtSummaryName} numberOfLines={1}>
                {passport.title}
              </Text>
              {passport.yacht_type || passport.year_built ? (
                <Text style={styles.yachtSummaryType}>
                  {[
                    passport.yacht_type
                      ? YACHT_TYPE_LABELS[passport.yacht_type] ??
                        passport.yacht_type
                      : null,
                    passport.year_built ? String(passport.year_built) : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </Text>
              ) : null}
              <View style={styles.yachtSummaryRow}>
                <SummarySpec
                  label="Length"
                  value={formatLength(passport.length_meters, displayUnits)}
                />
                <SummarySpec
                  label="Cabins"
                  value={passport.cabins != null ? String(passport.cabins) : "—"}
                />
                <SummarySpec
                  label="Guests"
                  value={passport.guests != null ? String(passport.guests) : "—"}
                />
                <SummarySpec
                  label="Crew"
                  value={passport.crew != null ? String(passport.crew) : "—"}
                />
              </View>
              <Text style={styles.yachtSummaryHint}>
                {isManualYacht
                  ? "Manually entered for this ROI — not saved to My Yachts."
                  : "Specs from My Yachts (read-only). ROI inputs stay here."}
              </Text>
            </View>
          ) : null}

          <Section
            label="PURCHASE PRICE"
            sublabel="Used for payback and depreciation. Stored only with this ROI scenario."
          >
            <MoneyInput
              value={purchasePrice}
              onChangeText={setPurchasePrice}
              suffix="€"
              placeholder="1500000"
            />
          </Section>

          <Section label="REGION">
            <PillGroup
              options={REGION_OPTS}
              value={region}
              onChange={(v) => setRegion(v as Region)}
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
              {yachtId ? (
                <AIRateEstimator
                  yachtId={yachtId}
                  region={region}
                  season="high"
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
              ) : null}
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
                {editId
                  ? "Save changes"
                  : pricingMode === "ai"
                    ? "Run AI estimate"
                    : "Calculate ROI"}
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

function SummarySpec({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.summarySpec}>
      <Text style={styles.summarySpecValue}>{value}</Text>
      <Text style={styles.summarySpecLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: NAVY },
  yachtSummary: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: DIVIDER,
    backgroundColor: "rgba(247,243,236,0.04)",
    padding: 16,
    marginBottom: 24,
  },
  yachtSummaryName: {
    color: IVORY,
    fontFamily: "Gilroy-Regular",
    fontSize: 20,
  },
  yachtSummaryType: {
    color: GOLD,
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    letterSpacing: 0.4,
    marginTop: 3,
  },
  yachtSummaryRow: {
    flexDirection: "row",
    marginTop: 14,
    gap: 8,
  },
  yachtSummaryHint: {
    color: MUTED,
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    lineHeight: 16,
    marginTop: 14,
  },
  summarySpec: { flex: 1 },
  summarySpecValue: {
    color: IVORY,
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
  },
  summarySpecLabel: {
    color: MUTED,
    fontFamily: "Inter_500Medium",
    fontSize: 10,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginTop: 3,
  },
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
