import { Router, type IRouter } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";
import { softClerkAuth } from "../middlewares/clerkAuth";
import { getSupabase } from "../lib/supabase";

const router: IRouter = Router();

router.get("/healthz", (_req, res) => {
  const data = HealthCheckResponse.parse({ status: "ok" });
  res.json(data);
});

router.get("/debug/auth-status", softClerkAuth(), (req, res) => {
  res.json({
    status: "ok",
    auth: {
      hasAuthorizationHeader: Boolean(req.headers.authorization),
      userIdPresent: Boolean(req.userId),
    },
    config: {
      clerkSecretConfigured: Boolean(process.env["CLERK_SECRET_KEY"]),
      supabaseConfigured: Boolean(getSupabase()),
    },
  });
});

export default router;
