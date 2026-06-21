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

function decodeJwtPayload(token: string | undefined): Record<string, unknown> | null {
  if (!token || token.startsWith("sb_")) return null;
  const [, payload] = token.split(".");
  if (!payload) return null;
  try {
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(
      normalized.length + ((4 - (normalized.length % 4)) % 4),
      "=",
    );
    return JSON.parse(Buffer.from(padded, "base64").toString("utf8")) as Record<
      string,
      unknown
    >;
  } catch {
    return null;
  }
}

router.get("/healthz", (_req, res) => {
  const data = HealthCheckResponse.parse({ status: "ok" });
  res.json(data);
});

router.get("/debug/auth-status", softClerkAuth(), async (req, res) => {
  const sb = getSupabase();
  const counts: Record<string, number | null> = {};
  const countErrors: Record<string, string> = {};
  const supabaseUrl = process.env["SUPABASE_URL"];
  const serviceKey = process.env["SUPABASE_SERVICE_ROLE_KEY"];
  const serviceKeyPayload = decodeJwtPayload(serviceKey);
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
      supabaseKeyKind: serviceKey?.startsWith("sb_") ? "supabase-secret" : "jwt",
      supabaseKeyRole:
        typeof serviceKeyPayload?.["role"] === "string"
          ? serviceKeyPayload["role"]
          : null,
    },
    counts,
    countErrors,
  });
});

export default router;
