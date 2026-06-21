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
  const countErrors: Record<string, string> = {};
  const supabaseUrl = process.env["SUPABASE_URL"];
  let supabaseHost: string | null = null;

  if (supabaseUrl) {
    try {
      supabaseHost = new URL(supabaseUrl).host;
    } catch {
      supabaseHost = "invalid-url";
    }
  }

  if (sb && req.userId) {
    for (const [key, table] of Object.entries({
      yachts: YACHTS_TABLE,
      estimates: ESTIMATES_TABLE,
      roi: ROI_CALCULATIONS_TABLE,
      cost: COST_ESTIMATES_TABLE,
    })) {
      const { count, error } = await sb
        .from(table)
        .select("id", { count: "exact", head: true })
        .eq("clerk_user_id", req.userId);
      counts[key] = count ?? null;
      if (error) countErrors[key] = error.message;
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
      supabaseHost,
    },
    counts,
    countErrors,
  });
});

export default router;
