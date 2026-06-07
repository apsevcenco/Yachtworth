import { Router, type IRouter } from "express";
import { CalculateRoiBody, CalculateRoiResponse } from "@workspace/api-zod";
import {
  getSupabase,
  ROI_CALCULATIONS_TABLE,
  YACHTS_TABLE,
} from "../lib/supabase";
import { requireAuth, softClerkAuth } from "../middlewares/clerkAuth";
import { isUuid } from "../lib/validators";
import { calculateRoi } from "../lib/roi";
import type { YachtRow } from "../lib/roi/types";
import {
  estimateCharterRate,
  type AiRateEstimateRequest,
  type RateRegion,
  type RateSeason,
  type RatePeriod,
  type CharterType,
} from "../lib/roi/aiRateEstimate";

const VALID_REGIONS: ReadonlySet<RateRegion> = new Set([
  "mediterranean",
  "caribbean",
  "northern_europe",
  "asia_pacific_me",
  "middle_east",
]);
const VALID_SEASONS: ReadonlySet<RateSeason> = new Set(["high", "shoulder", "low"]);
const VALID_PERIODS: ReadonlySet<RatePeriod> = new Set(["day", "week"]);
const VALID_CHARTER_TYPES: ReadonlySet<CharterType> = new Set([
  "crewed",
  "bareboat",
]);

const router: IRouter = Router();

// Numeric yacht columns the ROI engine reads and that callers may override
// per-calculation. crew_breakdown / financing_type are handled separately.
const OVERRIDABLE_NUMERIC_KEYS = [
  "purchase_price_eur",
  "monthly_crew_eur",
  "monthly_mooring_eur",
  "monthly_fuel_eur",
  "monthly_provisioning_eur",
  "monthly_communications_eur",
  "monthly_maintenance_eur",
  "monthly_management_fee_eur",
  "monthly_misc_eur",
  "annual_insurance_eur",
  "annual_registration_eur",
  "annual_classification_eur",
  "annual_antifouling_eur",
  "annual_refit_reserve_eur",
  "charter_commission_pct",
  "loan_amount_eur",
  "loan_rate_pct",
  "loan_term_years",
] as const satisfies readonly (keyof YachtRow)[];

/**
 * Apply per-calculation overrides on top of the saved yacht WITHOUT mutating it.
 * Only fields explicitly provided (non-null) win; everything else keeps the
 * saved-yacht value (which then falls back to a regional baseline downstream).
 * Overrides are never persisted to the yacht profile — they live only in this
 * calculation and its ROI-history `input` snapshot.
 */
function applyRoiOverrides(
  yacht: YachtRow,
  overrides: Record<string, unknown> | null | undefined,
): YachtRow {
  if (!overrides) return yacht;
  const merged: YachtRow = { ...yacht };
  for (const key of OVERRIDABLE_NUMERIC_KEYS) {
    const v = overrides[key];
    if (typeof v === "number" && Number.isFinite(v)) {
      merged[key] = v as never;
    }
  }
  const ft = overrides["financing_type"];
  if (ft === "cash" || ft === "loan") {
    merged.financing_type = ft;
    // The engine derives loan repayment purely from the loan_* columns and
    // ignores financing_type. So when the user explicitly chooses CASH for this
    // calculation, clear any loan figures inherited from the saved yacht —
    // otherwise the ROI would still be charged the inherited annuity.
    if (ft === "cash") {
      merged.loan_amount_eur = null;
      merged.loan_rate_pct = null;
      merged.loan_term_years = null;
    }
  }
  return merged;
}

// Detect PostgREST/Postgres "undefined_column" (42703) so reads can fall back
// when migration 022's yacht_snapshot column is not applied yet.
function isUndefinedColumn(err: { code?: string; message?: string }): boolean {
  if (err.code === "42703") return true;
  const m = err.message?.toLowerCase() ?? "";
  return m.includes("yacht_snapshot") && m.includes("does not exist");
}

// Build a transient YachtRow from a manual passport snapshot. The yacht is NEVER
// written to the yachts table — it exists only for this calculation and is
// persisted (as-is) in roi_calculations.yacht_snapshot for history/re-open.
// Financials (purchase price, crew, expenses, financing) are intentionally left
// null here; they arrive via `overrides`.
function snapshotToYacht(
  snap: Record<string, unknown>,
  userId: string,
): YachtRow {
  const str = (v: unknown): string | null =>
    typeof v === "string" && v.trim() !== "" ? v : null;
  const num = (v: unknown): number | null =>
    typeof v === "number" && Number.isFinite(v) ? v : null;
  const now = new Date().toISOString();
  return {
    id: "00000000-0000-0000-0000-000000000000",
    clerk_user_id: userId,
    created_at: now,
    updated_at: now,
    name: str(snap["name"]),
    brand: str(snap["brand"]),
    model: str(snap["model"]),
    year_built: num(snap["year_built"]),
    yacht_type: str(snap["yacht_type"]),
    length_meters: num(snap["length_meters"]),
    beam_meters: num(snap["beam_meters"]),
    cabins: num(snap["cabins"]),
    guests: num(snap["guests"]),
    crew: num(snap["crew"]),
    engine_hours: num(snap["engine_hours"]),
    marina_location: str(snap["marina_location"]),
    flag: str(snap["flag"]),
    commercial_registration:
      typeof snap["commercial_registration"] === "boolean"
        ? (snap["commercial_registration"] as boolean)
        : null,
  };
}

const YACHT_COLUMNS_FOR_ROI =
  "id, clerk_user_id, created_at, updated_at, name, brand, model, year_built, yacht_type, configuration, length_meters, beam_meters, cabins, guests, crew, engine_hours, marina_location, flag, commercial_registration, purchase_price_eur, purchase_year, financing_type, loan_amount_eur, loan_rate_pct, loan_term_years, monthly_crew_eur, monthly_mooring_eur, monthly_fuel_eur, monthly_provisioning_eur, monthly_communications_eur, monthly_maintenance_eur, monthly_management_fee_eur, monthly_misc_eur, annual_insurance_eur, annual_registration_eur, annual_classification_eur, annual_antifouling_eur, annual_refit_reserve_eur, charter_commission_pct, crew_breakdown";

router.post(
  "/roi/calculate",
  softClerkAuth(),
  requireAuth(),
  async (req, res): Promise<void> => {
    const parsed = CalculateRoiBody.safeParse(req.body);
    if (!parsed.success) {
      req.log.warn({ errors: parsed.error.message }, "Invalid ROI input");
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const input = parsed.data;

    const hasYachtId = input.yacht_id != null && input.yacht_id !== "";
    const snapshot =
      input.yacht_snapshot && typeof input.yacht_snapshot === "object"
        ? (input.yacht_snapshot as Record<string, unknown>)
        : null;
    if (!hasYachtId && !snapshot) {
      res.status(400).json({ error: "yacht_id or yacht_snapshot is required" });
      return;
    }
    if (hasYachtId && !isUuid(input.yacht_id as string)) {
      res.status(400).json({ error: "Invalid yacht_id" });
      return;
    }
    if (
      input.pricing_mode === "manual_daily" ||
      input.pricing_mode === "manual_weekly"
    ) {
      const rate = input.manual_rate_eur;
      const units = input.manual_charter_units;
      if (rate == null || units == null) {
        res.status(400).json({
          error:
            "manual_rate_eur and manual_charter_units are required for manual pricing modes",
        });
        return;
      }
      if (!(rate > 0)) {
        res.status(400).json({ error: "manual_rate_eur must be > 0" });
        return;
      }
      const maxUnits = input.pricing_mode === "manual_daily" ? 366 : 52;
      if (!(units > 0) || units > maxUnits) {
        res.status(400).json({
          error: `manual_charter_units must be between 1 and ${maxUnits} for ${input.pricing_mode}`,
        });
        return;
      }
    }

    const sb = getSupabase();
    if (!sb) {
      res.status(503).json({ error: "ROI storage not configured" });
      return;
    }

    // Resolve the yacht: either a saved My-Yacht profile (read-only here, also
    // enforces ownership) OR a transient passport snapshot for a manually
    // entered yacht. Manual yachts are NEVER written to the yachts table.
    let yacht: YachtRow | null = null;
    if (hasYachtId) {
      const { data, error: yErr } = await sb
        .from(YACHTS_TABLE)
        .select(YACHT_COLUMNS_FOR_ROI)
        .eq("clerk_user_id", req.userId!)
        .eq("id", input.yacht_id as string)
        .maybeSingle<YachtRow>();
      if (yErr) {
        req.log.error({ err: yErr.message }, "ROI: load yacht failed");
        res.status(500).json({ error: yErr.message });
        return;
      }
      if (!data) {
        res.status(404).json({ error: "Yacht not found" });
        return;
      }
      yacht = data;
    } else {
      yacht = snapshotToYacht(snapshot!, req.userId!);
    }

    const yachtForCalc = applyRoiOverrides(
      yacht,
      input.overrides as Record<string, unknown> | null | undefined,
    );

    try {
      const result = await calculateRoi(yachtForCalc, {
        yacht_id: (input.yacht_id as string) ?? "",
        region: input.region,
        occupancy_target: input.occupancy_target ?? null,
        pricing_mode: input.pricing_mode,
        charter_type: input.charter_type ?? null,
        manual_rate_eur: input.manual_rate_eur ?? null,
        manual_charter_units: input.manual_charter_units ?? null,
        management_fee_pct: input.management_fee_pct ?? null,
        target_weeks: input.target_weeks ?? null,
      });

      // Persist
      let savedId: string | null = null;
      const { data: saved, error: sErr } = await sb
        .from(ROI_CALCULATIONS_TABLE)
        .insert({
          yacht_id: hasYachtId ? (input.yacht_id as string) : null,
          yacht_snapshot: snapshot ?? null,
          clerk_user_id: req.userId!,
          region: input.region,
          annual_revenue_eur: result.annual_revenue_eur,
          annual_expenses_eur: result.annual_expenses_eur,
          net_profit_eur: result.net_profit_eur,
          roi_pct: result.roi_pct,
          payback_years: result.payback_years >= 999 ? null : result.payback_years,
          input,
          result,
        })
        .select("id")
        .single();
      if (sErr) {
        req.log.warn(
          { err: sErr.message },
          "Persist ROI failed — returning result anyway",
        );
      } else {
        savedId = saved.id as string;
      }

      res.json(CalculateRoiResponse.parse({ ...result, id: savedId }));
    } catch (err) {
      req.log.error(
        { err: err instanceof Error ? err.message : String(err) },
        "ROI calculation failed",
      );
      res.status(500).json({
        error: err instanceof Error ? err.message : "ROI calculation failed",
      });
    }
  },
);

router.get(
  "/roi/calculations",
  softClerkAuth(),
  requireAuth(),
  async (req, res): Promise<void> => {
    const sb = getSupabase();
    if (!sb) {
      res.status(503).json({ error: "ROI storage not configured" });
      return;
    }
    let query = sb
      .from(ROI_CALCULATIONS_TABLE)
      .select(
        "id, yacht_id, created_at, region, annual_revenue_eur, annual_expenses_eur, net_profit_eur, roi_pct, payback_years",
      )
      .eq("clerk_user_id", req.userId!)
      .order("created_at", { ascending: false })
      .limit(50);
    const yachtId = req.query["yacht_id"];
    if (typeof yachtId === "string") {
      if (!isUuid(yachtId)) {
        res.status(400).json({ error: "Invalid yacht_id" });
        return;
      }
      query = query.eq("yacht_id", yachtId);
    }
    const { data, error } = await query;
    if (error) {
      req.log.error({ err: error.message }, "List ROI calculations failed");
      res.status(500).json({ error: error.message });
      return;
    }
    res.json({ items: data ?? [] });
  },
);

router.get(
  "/roi/calculations/:id",
  softClerkAuth(),
  requireAuth(),
  async (req, res): Promise<void> => {
    if (!isUuid(req.params["id"])) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    const sb = getSupabase();
    if (!sb) {
      res.status(503).json({ error: "ROI storage not configured" });
      return;
    }
    let { data, error } = await sb
      .from(ROI_CALCULATIONS_TABLE)
      .select("id, yacht_id, yacht_snapshot, created_at, input, result")
      .eq("clerk_user_id", req.userId!)
      .eq("id", req.params["id"])
      .maybeSingle();
    // Graceful degradation: migration 022 (yacht_snapshot column) may not be
    // applied yet. PostgREST returns 42703 (undefined_column) — retry without
    // the column so existing history items still open.
    if (error && isUndefinedColumn(error)) {
      ({ data, error } = await sb
        .from(ROI_CALCULATIONS_TABLE)
        .select("id, yacht_id, created_at, input, result")
        .eq("clerk_user_id", req.userId!)
        .eq("id", req.params["id"])
        .maybeSingle());
    }
    if (error) {
      req.log.error({ err: error.message }, "Get ROI calculation failed");
      res.status(500).json({ error: error.message });
      return;
    }
    if (!data) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json(data);
  },
);

router.delete(
  "/roi/calculations/:id",
  softClerkAuth(),
  requireAuth(),
  async (req, res): Promise<void> => {
    if (!isUuid(req.params["id"])) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    const sb = getSupabase();
    if (!sb) {
      res.status(503).json({ error: "ROI storage not configured" });
      return;
    }
    const { error, count } = await sb
      .from(ROI_CALCULATIONS_TABLE)
      .delete({ count: "exact" })
      .eq("clerk_user_id", req.userId!)
      .eq("id", req.params["id"]);
    if (error) {
      req.log.error({ err: error.message }, "Delete ROI calculation failed");
      res.status(500).json({ error: error.message });
      return;
    }
    if (!count) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.status(204).send();
  },
);

router.post(
  "/roi/ai-rate-estimate",
  softClerkAuth(),
  requireAuth(),
  async (req, res): Promise<void> => {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const yachtId = typeof body["yacht_id"] === "string" ? body["yacht_id"] : "";
    if (!isUuid(yachtId)) {
      res.status(400).json({ error: "Invalid yacht_id" });
      return;
    }
    const region = body["region"] as RateRegion;
    const season = body["season"] as RateSeason;
    const ratePeriod = body["rate_period"] as RatePeriod;
    const charterTypeRaw = body["charter_type"];
    if (!VALID_REGIONS.has(region)) {
      res.status(400).json({ error: "Invalid region" });
      return;
    }
    if (!VALID_SEASONS.has(season)) {
      res.status(400).json({ error: "Invalid season (high|shoulder|low)" });
      return;
    }
    if (!VALID_PERIODS.has(ratePeriod)) {
      res.status(400).json({ error: "Invalid rate_period (day|week)" });
      return;
    }
    let charterType: CharterType | null = null;
    if (charterTypeRaw != null) {
      if (
        typeof charterTypeRaw !== "string" ||
        !VALID_CHARTER_TYPES.has(charterTypeRaw as CharterType)
      ) {
        res.status(400).json({ error: "Invalid charter_type" });
        return;
      }
      charterType = charterTypeRaw as CharterType;
    }

    const sb = getSupabase();
    if (!sb) {
      res.status(503).json({ error: "Storage not configured" });
      return;
    }

    const { data: yacht, error: yErr } = await sb
      .from(YACHTS_TABLE)
      .select(YACHT_COLUMNS_FOR_ROI)
      .eq("clerk_user_id", req.userId!)
      .eq("id", yachtId)
      .maybeSingle<YachtRow>();
    if (yErr) {
      req.log.error({ err: yErr.message }, "AI rate: load yacht failed");
      res.status(503).json({ error: "Could not load yacht. Please try again." });
      return;
    }
    if (!yacht) {
      res.status(404).json({ error: "Yacht not found" });
      return;
    }

    const request: AiRateEstimateRequest = {
      yacht_id: yachtId,
      region,
      season,
      rate_period: ratePeriod,
      charter_type: charterType,
    };

    try {
      const result = await estimateCharterRate(yacht, request);
      res.json(result);
    } catch (err) {
      // Defensive: should never reach here because the helper never throws.
      req.log.error(
        { err: err instanceof Error ? err.message : String(err) },
        "AI rate estimate unexpected throw",
      );
      res.json({
        success: false,
        error: "Could not retrieve market rates. Please enter manually.",
      });
    }
  },
);

export default router;
