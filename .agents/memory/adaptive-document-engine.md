---
name: Adaptive document engine (PDF) — packing & measurement
description: Non-obvious height/packing constraints for the api-server adaptive PDF engine (documents/), learned tuning the proposal layout.
---

# Adaptive PDF engine — packing & measurement gotchas

The block-based adaptive engine lives in `artifacts/api-server/src/documents/`
(`core/`, `blocks/`/builder helpers, `model/measure.ts`, `pdf/renderModelToBlocks.ts`).
It is OPT-IN per document via `exportSettings.engine === "adaptive"`; anything
else falls back to the legacy one-section-per-page templates. Per the engine's
hard rule, builders **duplicate** label dicts/helpers instead of importing the
legacy template, and shared `core/theme.ts` CSS is treated read-only.

## Two different height numbers — don't conflate them
- `PACK_BUDGET_MM` (~240) is the bin-packer's *placement* budget — deliberately
  ~10% under the true page. It decides when a block starts a new page.
- True physical usable A4 height is ~**267mm** (297 − 2×15mm margins).
- A single non-splittable block (e.g. a `columns` node) larger than
  `PACK_BUDGET_MM` is still placed alone on a fresh page and will render fine as
  long as it stays under ~267mm. So a dense one-page section can legitimately
  measure ~256mm and still be correct.

## measureNode measures at the column width you give it
`measureTableRow` wraps text using `columns[i].widthPct`. A table built with
`columns: [{}]` measures at ~100% width. **But** if you then render that table
inside a 2-column (`.two-col`) layout, it actually renders at ~half width, so
long secondary/`sub` text wraps to more lines than measured → silent page
overflow. **Fix pattern:** render with `columns: [{}]` but MEASURE a clone with
`columns: [{ widthPct: 48 }]` so wrapping is counted. Used by the proposal
equipment packer.

## Even-balance multi-column packing (avoid near-empty trailing pages)
Greedy "place on shorter column up to a fixed budget" leaves a near-empty last
page when the budget is too low (a single small block spills alone). Instead:
1. measure all blocks, sum total height,
2. `pagesCount = ceil(total / (2 · PER_COL_MAX))`,
3. soft `target = total / (2 · pagesCount)`; only roll to a new page once BOTH
   columns reach `target` *and* more pages are expected; otherwise pack up to a
   realistic `PER_COL_MAX` (~244mm = 267 − heading − safety).
This keeps a list that fits on one page on one page, and splits larger lists
into evenly-filled pages.

**Why:** the proposal equipment section was producing a 6th page that was ~30%
full; the cause was an over-cautious `COL_BUDGET=175` that forced a real
~242mm-per-column list to spill. Raising the cap to the true physical limit +
measuring at half width gave a balanced single equipment page (5pp total).

## Image validation before embedding
`core/util.ts` `validateImageUrls()` probes each URL with a ranged GET
(`Range: bytes=0-0`, AbortController timeout), accepting `ok || 206` + an
`image/*` content-type; everything else is rejected with a short reason.
Collect results **per index** (not via `array.push` inside `Promise.all`) so
both `valid` and `rejected` stay in input order — order matters because the
proposal uses `valid[0]` as the cover/hero. Only the adaptive proposal export
wires this in (`generateDocument.ts`), logging rejected URLs via the singleton
`logger` (no `req` available there).
