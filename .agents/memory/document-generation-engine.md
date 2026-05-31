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

## Photo handling (non-obvious — affects testing)

- **Both PDF templates accept only `https://` photo URLs** (Professional: strict `^https://`; Legacy: `^https?://`). Non-https sources (`data:` URIs, `http:`) are **silently dropped** — cover hero and gallery render empty. So local/offline tests with synthetic data-URI images show *no photos*; this is correct behavior, not a bug. Test with real https URLs (e.g. a reachable image host) to exercise the photo path.
- **DOCX embeds no images at all** (0 `<w:drawing>`), and has **no CONFIDENTIAL watermark**, even when https photos + confidential flag are supplied. PDF has both. DOCX still carries all text content incl. pricing/broker/disclaimer ("Indicative · not certified · valid 30 days"). This PDF↔DOCX divergence is current intended scope, not a regression.
- Professional photo gallery paginates 6 per page with a "PHOTOGRAPHY — n/N" header; equipment paginates with "EQUIPMENT & INVENTORY — n/N".

## Render deployment constraints (production)

- Render image must include a Chrome/Chromium binary and set `PUPPETEER_EXECUTABLE_PATH` to it, else the PDF path hard-fails at runtime (DOCX still works — pure JS).
- Ensure Render Node runtime ≥22.12.

## Second consumer — valuation_report (backend)

- Engine now dispatches on `documentType`: `"proposal"` | `"valuation_report"` (route allow-list + `generateDocument.ts` branch + `documentTypes.ts` union). Adding a new doc type = new template pair + one branch + allow-list entry; transport/route layer untouched.
- **Valuation helpers are duplicated, not shared.** `valuationTemplate.ts` / `valuationDocx.ts` re-declare `esc/num/money/specRows/accomRows/themes/labels` rather than importing from the proposal templates. Deliberate, to avoid refactoring the untouched proposal path. **Why:** owner hard rule "no refactor of unrelated code" + proposal regression risk > DRY benefit.
- Valuation is **multi-currency** (proposal is EUR-only): `moneyOf(currency)` maps EUR/USD/GBP/CHF/AUD/CAD→symbol else `"<amount> <CODE>"`. Each comparable can carry its own `currency` (falls back to the report currency).
- `confidenceScore` is auto-scaled: values ≤1 treated as a 0–1 fraction (×100), else 0–100; clamped before use as inline CSS bar width.
- `ExportSettings.branding` is an alias for `brand_name`; `ExportSettings.brokerInfo` (object) renders the "Prepared By" block. Valuation PDF = 6 pages max (Cover/Summary/Result/Comparables/Factors/Notes); empty comparables/factors pages are omitted (minimal payload → 4 pages). Same https-only-photos + DOCX-no-images/no-watermark divergence as proposal.
