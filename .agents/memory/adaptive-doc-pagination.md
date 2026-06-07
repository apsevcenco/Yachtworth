---
name: Adaptive document engine pagination (api-server)
description: How to pack/pre-paginate content blocks into PDF pages in the adaptive document engine without clipping or leaving large empty areas.
---

# Adaptive document engine — page-fill model

Applies to `artifacts/api-server/src/documents` (adaptive PDF path; opt-in via `exportSettings.engine:"adaptive"`).

- **Fill target = `A4_CONTENT_HEIGHT_MM` (265mm), NOT `PACK_BUDGET_MM` (240mm).**
  `measureNode` (model/measure.ts, READ-ONLY) is deliberately *conservative* and over-estimates real
  rendered height. Packing your own page-blocks against 240 is double-conservative → pages render
  ~25% empty. Use 265 as the pre-fit budget; the over-estimation headroom keeps the real render inside
  the fixed-height `.page` (261mm, `overflow:hidden` in theme.ts) so nothing clips.
  **Why:** proven by the legacy equipment packer which always packed to `A4_CONTENT_HEIGHT_MM`.
  **How to apply:** any builder that pre-paginates blocks into per-page units should fit to 265, not 240.

- **`paginateBlocks` (core, READ-ONLY) never bumps the first block on an otherwise-empty page.**
  So a per-page block you measured at ≤265 (over-estimate) is safe even though the packer's own budget
  is 240 — it sits alone on its page. Rely on this instead of forcing every block ≤240.

- **Two-column balance: use an ORDERED split point, never fill-left-then-right.**
  Filling the left column to the brim then the right leaves a lopsided final page (full left / near-empty
  right = a "large empty area"). Instead accumulate the page's cards in priority order, then choose the
  split index p minimising the taller column (left = cards[0..p), right = cards[p..]). This keeps
  column-major reading order == priority order AND fills both columns evenly.

- **When a category must split across a page, do NOT flush immediately.**
  Keep the remainder at the head of the queue and continue filling the SAME page (remainder first), so
  the rest of the current page (e.g. the other column) still fills. Only flush from the "no item fits"
  branch. Flushing right after a split strands an empty column.

- Residual whitespace on the LAST content page is the document tail (not enough content), not a bug —
  distribute it evenly across both columns rather than dumping it all in one.
