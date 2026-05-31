---
name: Document Generation Engine (backend)
description: Backend universal document engine (PDF via puppeteer-core, DOCX via docx) — conventions, gotchas, deploy constraints
---

# Backend Document Generation Engine

Universal server-side document engine. First consumer = Yacht Proposal export (PDF + Word). Lives under `artifacts/api-server/src/documents/` (dispatcher `generateDocument.ts` → `pdf/` and `docx/` generators + templates). Route: `POST /api/documents/generate` returns a **binary** (Content-Type + Content-Disposition), NOT JSON.

## Durable rules / decisions

- **Additive, never destructive.** The client-side Expo proposal PDF (`lib/proposalPdf.ts`) must stay as the "Legacy PDF Export". The backend engine is a parallel path, not a replacement. Owner hard rule.
- **Expensive generators must be `requireAuth()`-gated**, not just `softClerkAuth()`. Match the listings/proposals pattern. An anonymous Puppeteer endpoint is a real cost/DoS vector — architect flagged it.
  **Why:** Puppeteer launch + render is heavy; guests already have the on-device Legacy export, so gating the server path costs nothing in capability.
- **Binary endpoints are NOT in OpenAPI** (same as photo-upload). Frontend calls directly via `getBaseUrl()` + `getAuthToken()` from `@workspace/api-client-react`. The frontend helper is `lib/documentExport.ts`.
- **Expo SDK 54 file writes use `expo-file-system/legacy`** (`cacheDirectory`, `writeAsStringAsync`, `EncodingType`). The non-legacy `expo-file-system` import dropped those — `charterExports.ts` already uses the legacy import; follow it.

## Puppeteer gotchas

- esbuild `build.mjs` **externalizes** `puppeteer`/`puppeteer-core` (resolved at runtime from node_modules). `docx` bundles fine.
- Chromium executable is resolved from env, in order: `PUPPETEER_EXECUTABLE_PATH` → `REPLIT_PLAYWRIGHT_CHROMIUM_EXECUTABLE` (set in this dev env) → `CHROME_BIN`/`GOOGLE_CHROME_BIN`; throws if none. No bundled browser.
- `page.setContent(...)` `waitUntil` only accepts `"load"`/`"domcontentloaded"` in puppeteer-core's types — `"networkidle0"` is a TS error there (it's valid for `goto`, not `setContent`). Use `"load"`.
- Always `try/finally { browser.close() }` (catch-suppressed) so Chromium is cleaned up on render errors.
- `puppeteer-core@25` requires **Node ≥22.12** — pinned via `engines` in api-server package.json.

## Render deployment constraints (production)

- Render image must include a Chrome/Chromium binary and set `PUPPETEER_EXECUTABLE_PATH` to it, else the PDF path hard-fails at runtime (DOCX still works — pure JS).
- Ensure Render Node runtime ≥22.12.
