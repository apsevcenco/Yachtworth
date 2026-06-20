import type { NextFunction, Request, RequestHandler, Response } from "express";
import { clerkMiddleware, getAuth } from "@clerk/express";
import { logger } from "../lib/logger";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      userId?: string | null;
    }
  }
}

const clerkSecretKey = process.env["CLERK_SECRET_KEY"];
const clerkPublishableKey =
  process.env["CLERK_PUBLISHABLE_KEY"] ??
  process.env["EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY"] ??
  "pk_test_Y2hlZXJmdWwtaGVyb24tNzYuY2xlcmsuYWNjb3VudHMuZGV2JA";

const hasClerkKeys = Boolean(clerkSecretKey && clerkPublishableKey);

if (!hasClerkKeys) {
  logger.warn(
    "CLERK_SECRET_KEY missing — auth middleware will run as no-op (req.userId always null).",
  );
}

const inner: RequestHandler = hasClerkKeys
  ? clerkMiddleware({
      publishableKey: clerkPublishableKey,
      secretKey: clerkSecretKey,
    })
  : (_req, _res, next) => next();

/**
 * Soft Clerk auth: attaches req.userId when a valid bearer token is sent;
 * otherwise leaves it null. Never blocks the request — route handlers decide
 * whether to gate (require auth) or persist conditionally.
 */
export function softClerkAuth(): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    inner(req, res, (err?: unknown) => {
      if (err) {
        req.log?.warn(
          { err: err instanceof Error ? err.message : String(err) },
          "Clerk middleware error — treating as anonymous",
        );
        req.userId = null;
        next();
        return;
      }
      try {
        const auth = getAuth(req);
        req.userId = auth.userId ?? null;
      } catch {
        req.userId = null;
      }
      next();
    });
  };
}

/**
 * Hard gate: 401 unless authenticated. Place AFTER softClerkAuth.
 */
export function requireAuth(): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.userId) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }
    next();
  };
}
