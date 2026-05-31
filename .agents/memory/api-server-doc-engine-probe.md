---
name: api-server document engine one-off probe
description: How to render a PDF/DOCX from the api-server document engine in a throwaway script without the HTTP server (auth-gated endpoint)
---

The `POST /api/documents/generate` endpoint is `requireAuth`-gated (Clerk token), so you cannot easily curl it to verify a PDF render. To exercise `generateDocument()` directly in a one-off script:

**Rule:** the document engine pulls in `pino` (logging) and `puppeteer-core`. A naive `esbuild --bundle` or `tsx`/`node` run fails with `MODULE_NOT_FOUND` for `dist/lib/worker.js` (pino's transport worker) and/or a puppeteer worker path.

**Working recipe** (mirror the server's own `build.mjs`):
- esbuild: `platform:node, bundle:true, format:"esm"`, `outdir:"dist"` with `outExtension {".js":".mjs"}`.
- `external: ["*.node","puppeteer-core","puppeteer","playwright"]` (keep native/Chrome deps external).
- `plugins:[esbuildPluginPino({transports:["pino-pretty"]})]` — REQUIRED, else pino worker not emitted.
- ESM banner that sets `globalThis.require`, `__filename`, `__dirname` via `createRequire(import.meta.url)` (puppeteer + cjs deps need __dirname).
- At runtime: `export PUPPETEER_EXECUTABLE_PATH=$REPLIT_PLAYWRIGHT_CHROMIUM_EXECUTABLE` before `node dist/<probe>.mjs`.

**Why:** without the pino plugin the bundle references a worker file that was never written; without the banner puppeteer resolves its worker relative to a wrong __dirname.

`generateDocument()` returns `{ buffer, contentType }` (not a raw Buffer) — write `result.buffer`.

Proposal/cover photos come from `photoList(yacht)` (reads `cover_photo_url`, `photo_urls[]`, `photo_url`), NOT from `reportData`. Adaptive engine pre-validates reachability via `validateImageUrls` and drops unreachable URLs — so a probe yacht with no photo fields renders a text-fallback cover and omits the photography page. Unsplash URLs are reachable from the sandbox.

`tsx` is not installed in this repo — use the esbuild recipe, not `npx tsx`.
