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
  roleSupportsCount,
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
  mediterranean: { bases: ["weekly", "daily"] },
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

// Season options for the second region (dual-region only). Region 1 always uses
// its full charter window; the second region can be narrowed to a season.
const SEASON_OPTS = [
  { v: "mixed", l: "All season" },
  { v: "high", l: "High" },
  { v: "shoulder", l: "Shoulder" },
  { v: "low", l: "Low" },
] as const;

// Charter-active months per region (1 = Jan). `all` = the full charter window
// used by region 1; the per-season subsets drive the dual-region overlap
// warning. Purely advisory — used only to flag a likely scheduling clash.
const REGION_MONTHS: Record<
  string,
  { high: number[]; shoulder: number[]; low: number[]; all: number[] }
> = {
  mediterranean: { high: [7, 8], shoulder: [5, 6, 9, 10], low: [4, 11], all: [4, 5, 6, 7, 8, 9, 10, 11] },
  caribbean: { high: [12, 1, 2, 3], shoulder: [4, 11], low: [5], all: [11, 12, 1, 2, 3, 4, 5] },
  northern_europe: { high: [7, 8], shoulder: [6, 9], low: [5], all: [5, 6, 7, 8, 9] },
  asia_pacific_me: { high: [12, 1, 2, 3], shoulder: [11, 4], low: [10], all: [10, 11, 12, 1, 2, 3, 4] },
  middle_east: { high: [12, 1, 2], shoulder: [11, 3], low: [10, 4], all: [10, 11, 12, 1, 2, 3, 4] },
};

type Region = (typeof REGION_OPTS)[number]["v"];
type Occ = (typeof OCC_OPTS)[number]["v"];
type Season = (typeof SEASON_OPTS)[number]["v"];
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

  // Dual-region (AI mode only, additive). Off by default — when off the request
  // is byte-identical to the single-region path.
  const [dualRegion, setDualRegion] = useState(false);
  const [region2, setRegion2] = useState<Region>("caribbean");
  const [season2, setSeason2] = useState<Season>("mixed");
  const [charterType2, setCharterType2] = useState<CharterType>("weekly");
  const [occ2, setOcc2] = useState<Occ>("realistic");
  const [reposition, setReposition] = useState("");
  const [marinaRegion1Monthly, setMarinaRegion1Monthly] = useState("");
  const [marinaRegion1Months, setMarinaRegion1Months] = useState(6);
  const [marinaRegion2Monthly, setMarinaRegion2Monthly] = useState("");
  const [marinaRegion2Months, setMarinaRegion2Months] = useState(6);
  const [rate, setRate] = useState("");
  const [units, setUnits] = useState("");
  const [highRate, setHighRate] = useState("");
  const [highUnits, setHighUnits] = useState("");
  const [lowRate, setLowRate] = useState("");
  const [lowUnits, setLowUnits] = useState("");
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
    const inp = d.input as typeof d.input & {
      manual_high_rate_eur?: number | null;
      manual_high_charter_units?: number | null;
      manual_low_rate_eur?: number | null;
      manual_low_charter_units?: number | null;
      marina_region_1_monthly_eur?: number | null;
      marina_region_1_months?: number | null;
      marina_region_2_monthly_eur?: number | null;
      marina_region_2_months?: number | null;
    };
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
    if (inp.manual_high_rate_eur != null) {
      setHighRate(String(inp.manual_high_rate_eur));
    } else if (inp.manual_rate_eur != null) {
      setHighRate(String(inp.manual_rate_eur));
      setRate(String(inp.manual_rate_eur));
    }
    if (inp.manual_high_charter_units != null) {
      setHighUnits(String(inp.manual_high_charter_units));
    } else if (inp.manual_charter_units != null) {
      setHighUnits(String(inp.manual_charter_units));
      setUnits(String(inp.manual_charter_units));
    }
    if (inp.manual_low_rate_eur != null) setLowRate(String(inp.manual_low_rate_eur));
    if (inp.manual_low_charter_units != null) {
      setLowUnits(String(inp.manual_low_charter_units));
    }
    // Restore dual-region inputs when the saved request used a second region.
    if (inp.region_2 && REGION_OPTS.some((o) => o.v === inp.region_2)) {
      setDualRegion(true);
      setRegion2(inp.region_2 as Region);
      if (inp.season_2 && SEASON_OPTS.some((o) => o.v === inp.season_2)) {
        setSeason2(inp.season_2 as Season);
      }
      if (inp.charter_type_2 === "weekly" || inp.charter_type_2 === "daily") {
        setCharterType2(inp.charter_type_2);
      }
      if (
        inp.occupancy_target_2 &&
        OCC_OPTS.some((o) => o.v === inp.occupancy_target_2)
      ) {
        setOcc2(inp.occupancy_target_2 as Occ);
      }
      if (inp.repositioning_cost_eur != null) {
        setReposition(String(inp.repositioning_cost_eur));
      }
      if (inp.marina_region_1_monthly_eur != null) {
        setMarinaRegion1Monthly(String(inp.marina_region_1_monthly_eur));
      }
      if (inp.marina_region_1_months != null) {
        setMarinaRegion1Months(Math.max(1, Math.min(12, Math.round(inp.marina_region_1_months))));
      }
      if (inp.marina_region_2_monthly_eur != null) {
        setMarinaRegion2Monthly(String(inp.marina_region_2_monthly_eur));
      }
      if (inp.marina_region_2_months != null) {
        setMarinaRegion2Months(Math.max(1, Math.min(12, Math.round(inp.marina_region_2_months))));
      }
    }
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
  const rateSuffix = pricingMode === "manual_daily" ? "€ / day" : "€ / week";
  const ratePlaceholder = pricingMode === "manual_daily" ? "5000" : "35000";
  const unitPlaceholder = pricingMode === "manual_daily" ? "30" : "6";

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

  // Second-region charter config (dual-region). Mirrors region 1: daily-only
  // regions (e.g. Middle East) force daily and hide the weekly toggle.
  const regionCharter2 = REGION_CHARTER[region2];
  const availableBases2: CharterType[] = regionCharter2?.bases ?? ["weekly"];
  useEffect(() => {
    if (!availableBases2.includes(charterType2)) {
      setCharterType2(availableBases2[0]!);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [region2]);

  // Non-blocking season-overlap warning: region 1 charters across its full
  // window; if the second region's selected season shares any active month with
  // it, the two charter periods likely clash. Advisory only — never blocks.
  const seasonOverlap = useMemo(() => {
    if (!dualRegion || pricingMode !== "ai") return false;
    const m1 = REGION_MONTHS[region]?.all ?? [];
    const r2 = REGION_MONTHS[region2];
    if (!r2 || m1.length === 0) return false;
    const m2 = season2 === "mixed" ? r2.all : r2[season2];
    return m1.some((m) => m2.includes(m));
  }, [dualRegion, pricingMode, region, region2, season2]);

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
      // Saved My Yachts store crew headcount in `crew_cabins` and passenger
      // capacity in `berths`; manually-entered passports use `crew`/`guests`.
      // Read both so every source fills the summary instead of showing "—".
      guests: n("guests") ?? n("berths"),
      crew: n("crew") ?? n("crew_cabins"),
      flag: s("flag"),
    };
  }, [yachtId, yachtQ.data, snapshot]);

  const legacyErrors = useMemo(() => {
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
  void legacyErrors;

  const errors = useMemo(() => {
    const e: Record<string, string> = {};
    if (isManual) {
      const max = pricingMode === "manual_daily" ? 366 : 52;
      const rows = [
        { season: "high", rate: highRate, units: highUnits },
        { season: "low", rate: lowRate, units: lowUnits },
      ];
      let completed = 0;
      let totalUnits = 0;
      for (const row of rows) {
        const rateKey = `${row.season}Rate`;
        const unitsKey = `${row.season}Units`;
        const hasRate = row.rate.trim() !== "";
        const hasUnits = row.units.trim() !== "";
        if (!hasRate && !hasUnits) continue;
        if (!hasRate) e[rateKey] = "Required";
        else if (!DEC_RE.test(row.rate)) e[rateKey] = "Invalid amount";
        else if (parseNum(row.rate)! <= 0) e[rateKey] = "Must be > 0";
        if (!hasUnits) e[unitsKey] = "Required";
        else if (!INT_RE.test(row.units)) e[unitsKey] = "Whole number";
        else {
          const n = parseInt10(row.units)!;
          if (n <= 0) e[unitsKey] = "Must be > 0";
          else {
            totalUnits += n;
            if (hasRate && DEC_RE.test(row.rate) && parseNum(row.rate)! > 0) {
              completed += 1;
            }
          }
        }
      }
      if (completed === 0) {
        e.highRate = "Enter at least one season";
      } else if (totalUnits > max) {
        e.lowUnits = `Total max ${max} ${unitLabel}`;
      }
    }
    if (dualRegion && pricingMode === "ai") {
      const rows = [
        {
          key: "marinaRegion1",
          rate: marinaRegion1Monthly,
          months: marinaRegion1Months,
        },
        {
          key: "marinaRegion2",
          rate: marinaRegion2Monthly,
          months: marinaRegion2Months,
        },
      ];
      let marinaMonths = 0;
      for (const row of rows) {
        const hasRate = row.rate.trim() !== "";
        if (!hasRate) continue;
        if (!DEC_RE.test(row.rate)) e[`${row.key}Monthly`] = "Invalid amount";
        else if (parseNum(row.rate)! < 0) e[`${row.key}Monthly`] = "Must be >= 0";
        if (row.months < 1 || row.months > 12) e[`${row.key}Months`] = "1-12";
        marinaMonths += row.months;
      }
      if (marinaMonths > 12) {
        e.marinaRegion2Months = "Total max 12 months";
      }
    }
    return e;
  }, [
    dualRegion,
    highRate,
    highUnits,
    isManual,
    lowRate,
    lowUnits,
    marinaRegion1Monthly,
    marinaRegion1Months,
    marinaRegion2Monthly,
    marinaRegion2Months,
    pricingMode,
    unitLabel,
  ]);

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
      const manualRows = [
        {
          rate: parseNum(highRate),
          units: parseInt10(highUnits),
        },
        {
          rate: parseNum(lowRate),
          units: parseInt10(lowUnits),
        },
      ].filter(
        (row): row is { rate: number; units: number } =>
          row.rate != null && row.rate > 0 && row.units != null && row.units > 0,
      );
      const manualUnits = manualRows.reduce((sum, row) => sum + row.units, 0);
      const manualGross = manualRows.reduce(
        (sum, row) => sum + row.rate * row.units,
        0,
      );
      const manualAvgRate =
        manualUnits > 0 ? Math.round(manualGross / manualUnits) : null;
      // Dual-region is additive and AI-only. When off (or in manual mode) these
      // keys are omitted entirely so the request stays byte-identical.
      const useDual = dualRegion && pricingMode === "ai";
      const dualFields = useDual
        ? {
            region_2: region2,
            season_2: season2,
            charter_type_2: regionCharter2 ? charterType2 : null,
            occupancy_target_2: occ2,
            repositioning_cost_eur: parseNum(reposition),
            marina_region_1_monthly_eur: parseNum(marinaRegion1Monthly),
            marina_region_1_months: marinaRegion1Monthly.trim() ? marinaRegion1Months : null,
            marina_region_2_monthly_eur: parseNum(marinaRegion2Monthly),
            marina_region_2_months: marinaRegion2Monthly.trim() ? marinaRegion2Months : null,
          }
        : {};
      const result = await mutation.mutateAsync({
        data: {
          yacht_id: yachtId ?? null,
          yacht_snapshot: yachtId ? null : snapshot,
          region,
          occupancy_target: pricingMode === "ai" ? occ : null,
          pricing_mode: pricingMode,
          charter_type:
            pricingMode === "ai" && regionCharter ? charterType : null,
          manual_rate_eur: isManual ? manualAvgRate : null,
          manual_charter_units: isManual ? manualUnits || null : null,
          manual_high_rate_eur: isManual ? parseNum(highRate) : null,
          manual_high_charter_units: isManual ? parseInt10(highUnits) : null,
          manual_low_rate_eur: isManual ? parseNum(lowRate) : null,
          manual_low_charter_units: isManual ? parseInt10(lowUnits) : null,
          overrides: hasOverrides ? overrides : null,
          ...dualFields,
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
      // Carry yacht + region context so the exported report cover isn't generic.
      // Pull identity from the saved-yacht profile (yacht_id) or the manual
      // snapshot; the region label comes from the form's selected region.
      const headerSnap = (yachtId ? yachtQ.data : snapshot) as
        | Record<string, unknown>
        | null
        | undefined;
      const headerStr = (k: string): string | null => {
        const v = headerSnap?.[k];
        return typeof v === "string" && v.trim() ? v : null;
      };
      const headerStrArr = (k: string): string[] | null => {
        const v = headerSnap?.[k];
        if (!Array.isArray(v)) return null;
        const arr = v.filter((x): x is string => typeof x === "string" && x.trim().length > 0);
        return arr.length ? arr : null;
      };
      const header = {
        yachtName: headerStr("name"),
        builder: headerStr("brand") ?? headerStr("builder"),
        model: headerStr("model"),
        regionLabel:
          REGION_OPTS.find((r) => r.v === region)?.l ?? null,
        cover_photo_url: headerStr("cover_photo_url"),
        photo_url: headerStr("photo_url"),
        photo_urls: headerStrArr("photo_urls"),
      };
      router.replace({
        pathname: "/roi/result",
        params: {
          data: JSON.stringify(result),
          header: JSON.stringify(header),
        },
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
                    setHighRate(String(rateInWanted));
                    setShowErrors(false);
                  }}
                />
              ) : null}
              <Text style={styles.subLabel}>HIGH SEASON</Text>
              <Field
                label={pricingMode === "manual_daily" ? "High-season rate per day (€)" : "High-season rate per week (€)"}
                error={showErrors ? errors.highRate : undefined}
              >
                <MoneyInput
                  value={highRate}
                  onChangeText={setHighRate}
                  suffix={pricingMode === "manual_daily" ? "€ / day" : "€ / week"}
                  placeholder={pricingMode === "manual_daily" ? "5000" : "35000"}
                />
              </Field>
              <Field
                label={`High-season charter ${unitLabel}`}
                error={showErrors ? errors.highUnits : undefined}
                hint={`How many high-season charter ${unitLabel} you expect to book this year.`}
              >
                <MoneyInput
                  value={highUnits}
                  onChangeText={setHighUnits}
                  suffix={unitLabel}
                  placeholder={unitPlaceholder}
                />
              </Field>
              <Text style={styles.subLabel}>LOW SEASON</Text>
              <Field
                label={pricingMode === "manual_daily" ? "Low-season rate per day (€)" : "Low-season rate per week (€)"}
                error={showErrors ? errors.lowRate : undefined}
              >
                <MoneyInput
                  value={lowRate}
                  onChangeText={setLowRate}
                  suffix={rateSuffix}
                  placeholder={ratePlaceholder}
                />
              </Field>
              <Field
                label={`Low-season charter ${unitLabel}`}
                error={showErrors ? errors.lowUnits : undefined}
                hint={`How many low-season charter ${unitLabel} you expect to book this year.`}
              >
                <MoneyInput
                  value={lowUnits}
                  onChangeText={setLowUnits}
                  suffix={unitLabel}
                  placeholder={unitPlaceholder}
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

          {/* ── Dual-region (AI mode only) ─────────────────────────── */}
          {pricingMode === "ai" ? (
            <>
              <View style={styles.dualToggleRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.dualToggleTitle}>Add second region</Text>
                  <Text style={styles.dualToggleSub}>
                    Charter in two regions across the year. Income from both is
                    added together.
                  </Text>
                </View>
                <Pressable
                  onPress={() => {
                    LayoutAnimation.configureNext(
                      LayoutAnimation.Presets.easeInEaseOut,
                    );
                    setDualRegion((v) => !v);
                  }}
                  style={[styles.switch, dualRegion && styles.switchOn]}
                >
                  <View
                    style={[styles.knob, dualRegion && styles.knobOn]}
                  />
                </Pressable>
              </View>

              {dualRegion ? (
                <>
                  <Section label="SECOND REGION">
                    <PillGroup
                      options={REGION_OPTS}
                      value={region2}
                      onChange={(v) => setRegion2(v as Region)}
                    />
                  </Section>

                  <Section
                    label="SECOND REGION · SEASON"
                    sublabel="Which part of the second region's charter window to model. Region 1 always uses its full window."
                  >
                    <PillGroup
                      options={SEASON_OPTS}
                      value={season2}
                      onChange={(v) => setSeason2(v as Season)}
                    />
                  </Section>

                  <Section
                    label="SECOND REGION · CHARTER BASIS"
                    sublabel={
                      availableBases2.length > 1
                        ? "Charter the second region by the week or by the day."
                        : "This region is chartered by the day."
                    }
                  >
                    {availableBases2.length > 1 ? (
                      <PillGroup
                        options={CHARTER_TYPE_OPTS.filter((o) =>
                          availableBases2.includes(o.v),
                        )}
                        value={charterType2}
                        onChange={(v) => setCharterType2(v as CharterType)}
                      />
                    ) : (
                      <View style={styles.basisNote}>
                        <Text style={styles.basisNoteText}>
                          Daily charters only
                        </Text>
                      </View>
                    )}
                  </Section>

                  <Section
                    label="SECOND REGION · OCCUPANCY POSTURE"
                    sublabel="How busy should the AI assume the yacht will be in the second region?"
                  >
                    <PillGroup
                      options={OCC_OPTS}
                      value={occ2}
                      onChange={(v) => setOcc2(v as Occ)}
                    />
                  </Section>

                  <Section
                    label="DUAL-REGION MARINA COSTS"
                    sublabel="Use separate mooring rates when the yacht stays in different marinas across the year. These replace the single Mooring / berth line when filled."
                  >
                    <MarinaRegionEditor
                      title="Region 1 marina"
                      regionLabel={REGION_OPTS.find((o) => o.v === region)?.l ?? region}
                      monthly={marinaRegion1Monthly}
                      months={marinaRegion1Months}
                      onMonthly={setMarinaRegion1Monthly}
                      onMonths={setMarinaRegion1Months}
                      error={
                        showErrors
                          ? errors.marinaRegion1Monthly ?? errors.marinaRegion1Months
                          : undefined
                      }
                    />
                    <MarinaRegionEditor
                      title="Region 2 marina"
                      regionLabel={REGION_OPTS.find((o) => o.v === region2)?.l ?? region2}
                      monthly={marinaRegion2Monthly}
                      months={marinaRegion2Months}
                      onMonthly={setMarinaRegion2Monthly}
                      onMonths={setMarinaRegion2Months}
                      error={
                        showErrors
                          ? errors.marinaRegion2Monthly ?? errors.marinaRegion2Months
                          : undefined
                      }
                    />
                  </Section>

                  <Section
                    label="ANNUAL REPOSITIONING COST"
                    sublabel="Total cost of moving the yacht between the two regions (both ways combined). Added as an annual expense line."
                  >
                    <MoneyInput
                      value={reposition}
                      onChangeText={setReposition}
                      suffix="€ / yr"
                      placeholder="80000"
                    />
                  </Section>

                  {seasonOverlap ? (
                    <View style={styles.overlapWarn}>
                      <Feather name="alert-triangle" size={15} color={GOLD} />
                      <Text style={styles.overlapWarnText}>
                        These two regions' charter seasons overlap, so the yacht
                        likely can't be fully booked in both at once. The estimate
                        still adds both — adjust the second region's season if this
                        isn't realistic.
                      </Text>
                    </View>
                  ) : null}
                </>
              ) : null}
            </>
          ) : null}

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
                  onCount={(c) => setCrew(i, { count: c })}
                />
              ))}
              <View style={styles.crewTotalRow}>
                <Text style={styles.crewTotalLabel}>Total crew cost</Text>
                <Text style={styles.crewTotalValue}>
                  {crewTotal > 0 ? `€ ${crewTotal.toLocaleString("en-US")} / mo` : "—"}
                </Text>
              </View>
              <Text style={styles.fieldHint}>
                Deckhand & stewardess salaries are per person — use the crew
                counter for multiple. Months/year covers seasonal crew. The total
                feeds the ROI engine.
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

function MonthStepper({
  value,
  onChange,
}: {
  value: number;
  onChange: (n: number) => void;
}) {
  const dec = () => {
    const next = Math.max(1, value - 1);
    if (next !== value) {
      onChange(next);
      if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
    }
  };
  const inc = () => {
    const next = Math.min(12, value + 1);
    if (next !== value) {
      onChange(next);
      if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
    }
  };
  return (
    <View style={styles.crewStepper}>
      <Pressable
        onPress={dec}
        hitSlop={6}
        style={({ pressed }) => [styles.crewStepBtn, { opacity: pressed ? 0.6 : 1 }]}
      >
        <Feather name="minus" size={14} color={GOLD} />
      </Pressable>
      <View style={styles.crewMonthsBox}>
        <Text style={styles.crewMonthsValue}>{value}</Text>
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
  );
}

function MarinaRegionEditor({
  title,
  regionLabel,
  monthly,
  months,
  onMonthly,
  onMonths,
  error,
}: {
  title: string;
  regionLabel: string;
  monthly: string;
  months: number;
  onMonthly: (v: string) => void;
  onMonths: (n: number) => void;
  error?: string;
}) {
  return (
    <View style={styles.marinaRow}>
      <View style={styles.marinaHead}>
        <View style={{ flex: 1 }}>
          <Text style={styles.marinaTitle}>{title}</Text>
          <Text style={styles.marinaRegion}>{regionLabel}</Text>
        </View>
        <MonthStepper value={months} onChange={onMonths} />
      </View>
      <MoneyInput
        value={monthly}
        onChangeText={onMonthly}
        suffix="€ / mo"
        placeholder="12000"
      />
      {error ? <Text style={styles.fieldError}>{error}</Text> : null}
    </View>
  );
}

function CrewRowEditor({
  row,
  onSalary,
  onMonths,
  onCount,
}: {
  row: CrewRow;
  onSalary: (v: string) => void;
  onMonths: (n: number) => void;
  onCount: (n: number) => void;
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
  const decCount = () => {
    const next = Math.max(1, row.count - 1);
    if (next !== row.count) {
      onCount(next);
      if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
    }
  };
  const incCount = () => {
    const next = Math.min(50, row.count + 1);
    if (next !== row.count) {
      onCount(next);
      if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
    }
  };
  const countable = roleSupportsCount(row.role);
  return (
    <View style={styles.crewRow}>
      <View style={styles.crewHeadRow}>
        <Text style={styles.crewRole}>{row.role}</Text>
        {countable ? (
          <View style={styles.crewStepper}>
            <Pressable
              onPress={decCount}
              hitSlop={6}
              style={({ pressed }) => [styles.crewStepBtn, { opacity: pressed ? 0.6 : 1 }]}
            >
              <Feather name="minus" size={14} color={GOLD} />
            </Pressable>
            <View style={styles.crewMonthsBox}>
              <Text style={styles.crewMonthsValue}>{row.count}</Text>
              <Text style={styles.crewMonthsLabel}>crew</Text>
            </View>
            <Pressable
              onPress={incCount}
              hitSlop={6}
              style={({ pressed }) => [styles.crewStepBtn, { opacity: pressed ? 0.6 : 1 }]}
            >
              <Feather name="plus" size={14} color={GOLD} />
            </Pressable>
          </View>
        ) : null}
      </View>
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
  dualToggleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginTop: 26,
    paddingTop: 22,
    borderTopWidth: 1,
    borderTopColor: DIVIDER,
  },
  dualToggleTitle: {
    color: IVORY,
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    marginBottom: 4,
  },
  dualToggleSub: {
    color: MUTED,
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    lineHeight: 17,
  },
  switch: {
    width: 50,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(247,243,236,0.14)",
    padding: 3,
    justifyContent: "center",
  },
  switchOn: {
    backgroundColor: GOLD,
  },
  knob: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: IVORY,
    alignSelf: "flex-start",
  },
  knobOn: {
    alignSelf: "flex-end",
    backgroundColor: NAVY,
  },
  overlapWarn: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(201,169,97,0.35)",
    backgroundColor: "rgba(201,169,97,0.08)",
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginTop: 4,
  },
  overlapWarnText: {
    flex: 1,
    color: GOLD,
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    lineHeight: 17,
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
  marinaRow: {
    paddingVertical: 12,
    borderBottomColor: DIVIDER,
    borderBottomWidth: 1,
    gap: 10,
  },
  marinaHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  marinaTitle: {
    color: IVORY,
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
  },
  marinaRegion: {
    color: MUTED,
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    marginTop: 2,
  },
  // Crew breakdown
  crewRow: {
    paddingVertical: 12,
    borderBottomColor: DIVIDER,
    borderBottomWidth: 1,
  },
  crewHeadRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  crewRole: {
    flex: 1,
    color: IVORY,
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
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
