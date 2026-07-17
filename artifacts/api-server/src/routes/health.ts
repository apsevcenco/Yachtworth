import { Router, type IRouter } from "express";
import { createHash } from "node:crypto";
import { HealthCheckResponse } from "@workspace/api-zod";
import { softClerkAuth } from "../middlewares/clerkAuth";
import {
  COST_ESTIMATES_TABLE,
  ESTIMATES_TABLE,
  getSupabase,
  ROI_CALCULATIONS_TABLE,
  SURVEY_REPORTS_TABLE,
  YACHTS_TABLE,
} from "../lib/supabase";
import { forClerkUser } from "../lib/clerkUserFilter";

const router: IRouter = Router();

function decodeJwtPayload(
  token: string | undefined,
): Record<string, unknown> | null {
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

function hashValue(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex").slice(0, 16);
}

router.get("/healthz", (_req, res) => {
  const data = HealthCheckResponse.parse({ status: "ok" });
  res.json(data);
});

router.get("/debug/auth-status", softClerkAuth(), async (req, res) => {
  const sb = getSupabase();
  const counts: Record<string, number | null> = {};
  const visibleItems: Record<string, number | null> = {};
  const serverFilteredCounts: Record<string, number | null> = {};
  const totalCounts: Record<string, number | null> = {};
  const ownerHashes: Record<string, string[]> = {};
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

  if (sb) {
    for (const [key, table] of Object.entries({
      yachts: YACHTS_TABLE,
      estimates: ESTIMATES_TABLE,
      roi: ROI_CALCULATIONS_TABLE,
      cost: COST_ESTIMATES_TABLE,
      survey: SURVEY_REPORTS_TABLE,
    })) {
      const { count: totalCount, error: totalError } = await sb
        .from(table)
        .select("id", { count: "exact", head: true });
      totalCounts[key] = totalCount ?? null;
      if (totalError) countErrors[`${key}Total`] = totalError.message;

      if (!req.userId) continue;

      const { count, error } = await forClerkUser(
        sb.from(table).select("id", { count: "exact", head: true }),
        req.userId,
      );
      counts[key] = count ?? null;
      if (error) countErrors[key] = error.message;

      const { data: rows, error: rowsError } = await sb
        .from(table)
        .select("id, clerk_user_id")
        .limit(100);
      serverFilteredCounts[key] = rows?.length ?? null;
      visibleItems[key] = serverFilteredCounts[key];
      ownerHashes[key] = Array.from(
        new Set(
          (rows ?? [])
            .map((row) => row.clerk_user_id)
            .filter((value): value is string => typeof value === "string")
            .map((value) => hashValue(value)),
        ),
      );
      if (rowsError) countErrors[`${key}Rows`] = rowsError.message;
    }
  }

  res.json({
    status: "ok",
    auth: {
      hasAuthorizationHeader: Boolean(req.headers.authorization),
      userIdPresent: Boolean(req.userId),
      userId: req.userId ?? null,
      userIdHex: req.userId
        ? Buffer.from(req.userId, "utf8").toString("hex")
        : null,
      userIdHash: req.userId ? hashValue(req.userId) : null,
    },
    config: {
      clerkSecretConfigured: Boolean(process.env["CLERK_SECRET_KEY"]),
      supabaseConfigured: Boolean(sb),
      supabaseHost,
      supabaseKeyKind: serviceKey?.startsWith("sb_")
        ? "supabase-secret"
        : "jwt",
      supabaseKeyRole:
        typeof serviceKeyPayload?.["role"] === "string"
          ? serviceKeyPayload["role"]
          : null,
    },
    counts,
    visibleItems,
    serverFilteredCounts,
    totalCounts,
    ownerHashes,
    countErrors,
  });
});

export default router;
