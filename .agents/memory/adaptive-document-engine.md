---
name: Adaptive Document Engine (api-server)
description: Architecture + tuning rules for the server-side semantic-model document engine that renders adaptive PDFs (valuation pilot; survey is the stress target).
---

# Adaptive Document Engine — V2 (semantic model)

Server-side document generation in `artifacts/api-server/src/documents/`. Opt-in via
`exportSettings.engine === "adaptive"`; missing/unknown → `"legacy"` default. Legacy PDF
and ALL DOCX paths are left byte-identical — never touch them when changing adaptive.

## Layering (renderer-independent on purpose)
- `model/types.ts` — `DocumentModel` / `CoverSpec` / `ContentNode` union. **Model text is RAW
  (unescaped).** Renderers escape at the boundary. This keeps the model DOCX-ready (DOCX renderer
  is the P1 follow-up — it reflows natively and ignores the mm heuristics below).
- `model/measure.ts` — mm height heuristics (`measureNode` / `measureTableRow` / `measureTable`).
- `pdf/renderModelToBlocks.ts` — node → `DocBlock[]`; escapes via `esc()`; splits tables and
  galleries across pages. Oversized single table-row chunk gets `splittable=true`.
- `pdf/renderModelToPdfHtml.ts` — orchestrator → HTML for Chromium.
- `builders/valuation.ts` — maps valuation payload → semantic model (6-lang labels incl. russian).
- `core/{types,paginateBlocks,theme,renderBlocksToHtml}.ts` — shared packer + CSS reused by adaptive.

**Why this shape:** one renderer-independent content model so PDF and (future) DOCX share the
same builders; survey reports (multi-page findings tables, photo galleries, sea-trial, signature,
legal callouts) are the real stress test, so blocks are theme-agnostic and generic.

## Height heuristics — the load-bearing tuning lesson
Two layers of conservatism stack and cause **chronic under-fill** (a lone footer on an otherwise
empty page): (1) `PACK_BUDGET_MM=240` is already conservative vs true usable `A4_CONTENT_HEIGHT_MM=265`,
and (2) inflated per-node mm estimates. When BOTH over-estimate, content that truly fills ~170mm
gets packed as if it were ~240mm → the next small block spills to a near-empty page.

**Rule:** keep per-node estimates *slightly above* measured Chromium output, NOT inflated. Calibrate
against real `pdftoppm` renders. Table-row and gallery measures are the under-estimation guard
(they drive page-splitting of long content) — recalibrate metrics/heading/paragraph constants
freely, but change row/gallery measures only with a dense multi-page stress doc to confirm no overflow.

## Verification recipe (no permanent test harness)
Write a throwaway `artifacts/api-server/_harness.ts`, bundle with
`npx esbuild _harness.ts --bundle --platform=node --format=esm --packages=external --outfile=_harness.mjs`
(must output INSIDE the workspace so node_modules resolves), `node _harness.mjs`. Inspect with
`pdfinfo` (page count), `pdftotext - | awk 'BEGIN{RS="\f"}…'` (per-page char density — a near-zero
trailing page = under-fill bug), and `pdftoppm -png -r 80` + read the PNGs. **Delete the harness
after.** Chromium path comes from `REPLIT_PLAYWRIGHT_CHROMIUM_EXECUTABLE`.

## Hardening already in place
Untrusted/caller values are clamped at the sink: `clampMm`/`clampPct` + a `CALLOUT_TONES`
whitelist guard confidence.pct, widthPct, heightMm, spacer.mm, callout.tone. `moneyOf` escapes the
currency code. Every block is `break-inside:avoid` except `splittable` ones (class `block-flow`).
