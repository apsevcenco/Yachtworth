import { Router, type IRouter } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";
import { softClerkAuth } from "../middlewares/clerkAuth";
import {
  COST_ESTIMATES_TABLE,
  ESTIMATES_TABLE,
  getSupabase,
  ROI_CALCULATIONS_TABLE,
  YACHTS_TABLE,
} from "../lib/supabase";

const router: IRouter = Router();

router.get("/healthz", (_req, res) => {
  const data = HealthCheckResponse.parse({ status: "ok" });
  res.json(data);
});

router.get("/debug/auth-status", softClerkAuth(), async (req, res) => {
  const sb = getSupabase();
  const counts: Record<string, number | null> = {};

  if (sb && req.userId) {
    for (const [key, table] of Object.entries({
      yachts: YACHTS_TABLE,
      estimates: ESTIMATES_TABLE,
      roi: ROI_CALCULATIONS_TABLE,
      cost: COST_ESTIMATES_TABLE,
    })) {
      const { count } = await sb
        .from(table)
        .select("id", { count: "exact", head: true })
        .eq("clerk_user_id", req.userId);
      counts[key] = count ?? null;
    }
  }

  res.json({
    status: "ok",
    auth: {
      hasAuthorizationHeader: Boolean(req.headers.authorization),
      userIdPresent: Boolean(req.userId),
      userId: req.userId ?? null,
    },
    config: {
      clerkSecretConfigured: Boolean(process.env["CLERK_SECRET_KEY"]),
      supabaseConfigured: Boolean(sb),
    },
    counts,
  });
});

export default router;
