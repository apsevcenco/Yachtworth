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

const router: IRouter = Router();

const YACHT_COLUMNS_FOR_ROI =
  "id, clerk_user_id, created_at, updated_at, name, brand, model, year_built, yacht_type, configuration, length_meters, beam_meters, cabins, guests, crew, engine_hours, marina_location, flag, commercial_registration, purchase_price_eur, purchase_year, financing_type, loan_amount_eur, loan_rate_pct, loan_term_years, monthly_crew_eur, monthly_mooring_eur, monthly_fuel_eur, monthly_provisioning_eur, monthly_communications_eur, monthly_maintenance_eur, monthly_management_fee_eur, monthly_misc_eur, annual_insurance_eur, annual_registration_eur, annual_classification_eur, annual_antifouling_eur, annual_refit_reserve_eur, charter_commission_pct";

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

    if (!isUuid(input.yacht_id)) {
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

    // Load yacht (also enforces ownership)
    const { data: yacht, error: yErr } = await sb
      .from(YACHTS_TABLE)
      .select(YACHT_COLUMNS_FOR_ROI)
      .eq("clerk_user_id", req.userId!)
      .eq("id", input.yacht_id)
      .maybeSingle<YachtRow>();
    if (yErr) {
      req.log.error({ err: yErr.message }, "ROI: load yacht failed");
      res.status(500).json({ error: yErr.message });
      return;
    }
    if (!yacht) {
      res.status(404).json({ error: "Yacht not found" });
      return;
    }

    try {
      const result = await calculateRoi(yacht, {
        yacht_id: input.yacht_id,
        region: input.region,
        season: input.season ?? null,
        management_style: input.management_style,
        occupancy_target: input.occupancy_target ?? null,
        pricing_mode: input.pricing_mode,
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
          yacht_id: input.yacht_id,
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
    const { data, error } = await sb
      .from(ROI_CALCULATIONS_TABLE)
      .select("id, yacht_id, created_at, input, result")
      .eq("clerk_user_id", req.userId!)
      .eq("id", req.params["id"])
      .maybeSingle();
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

export default router;
