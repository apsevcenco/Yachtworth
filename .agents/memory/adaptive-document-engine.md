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

## Adding a new document type to V2 (pattern)
Write `builders/<type>.ts` exporting `build<Type>Model(input) → DocumentModel`, mirroring
`builders/valuation.ts`: import `getTheme`, `num`/`photoList`; **duplicate the 6-lang label dict
locally — do NOT import the legacy template** (legacy stays byte-identical). Reuse generic nodes:
`columns` (specs|accommodation), `metrics` (pricing/value cards), `keyValue` (meta + contact),
`paragraph` panel (notes), `table` (equipment — multi-col TableCell[] rows), `gallery` (photos).
Disclaimer/watermark/confidential go in `meta` (renderer appends them). Wire one ternary in
`generateDocument.ts`: `settings.engine === "adaptive" ? renderModelToPdfHtml(buildXModel(...)) :
buildXHtml(...)` — PDF branch only; DOCX + legacy untouched. Proposal (sale/charter/both, POA,
6-lang incl. russian) was done this way and packs cover+specs+pricing+equipment+gallery+contact
with no mid-doc empty pages (only the natural short contact tail page).

## Keeping sections together / two-column without engine changes
The packer (`core/paginateBlocks.ts`) is greedy per top-level block and has **no
keepWithNext**. To guarantee a set of sections never separate across pages (e.g. proposal
"Pricing + Notes + Broker Contact must stay together; contact never alone"), emit them as
the children of ONE single-column `columns` node → renders as a single non-splittable
`DocBlock`. **Tradeoff (intentional):** that block can overflow if a child is huge (e.g.
very long notes); Chromium *flows* the overflow to the next page (break-inside:avoid is a
hint, not a clip) so nothing is lost — grouping is prioritised over page-fit per owner ask.
For **two-column lists** (proposal equipment): a two-column `columns` node with a
single-cell `table` per column (cell = bold name + muted sub-line). **Gotcha:**
`measureTable` has no idea a table nested in `columns` renders at ~half width, so it
under-counts wrapped sub-lines; columns blocks are non-splittable, so **chunk the list**
(≤8 rows/column → ≈206mm worst case even at 3-line wraps) and emit multiple columns blocks
rather than relying on the engine to split. Do NOT add splittable-columns logic to the
engine for a layout-only task — that's new architecture.

## Hardening already in place
Untrusted/caller values are clamped at the sink: `clampMm`/`clampPct` + a `CALLOUT_TONES`
whitelist guard confidence.pct, widthPct, heightMm, spacer.mm, callout.tone. `moneyOf` escapes the
currency code. Every block is `break-inside:avoid` except `splittable` ones (class `block-flow`).
