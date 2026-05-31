---
name: Adaptive PDF cover clipping
description: Why the adaptive document engine's cover page must stay clamped to the printable .page height, not height:auto.
---

# Adaptive PDF cover page height

In the backend adaptive document engine (`artifacts/api-server/src/documents`,
valuation_report + proposal only), the cover's content (eyebrow / yacht name /
spec grid / **price**) is **bottom-anchored** inside the `.cover` box. `.cover`
is intentionally taller (~265mm) than the printable `.page` (~261mm, set by
`height: …mm; overflow: hidden` in `core/theme.ts` `adaptiveCss`).

**Rule:** keep `.cover-page` clamped to the same fixed printable height as
`.page` (inherit it; do **not** override with `height: auto; overflow: visible`).

**Why:** clamping at the printable height makes the bottom-anchored content land
exactly at the page bottom and render. If you "fix" the ~4mm cover bleed by
letting `.cover-page` grow (`height:auto; overflow:visible`), the 265mm `.cover`
now extends past the A4 printable area and the bottom-anchored **price line gets
pushed off the page and clipped**. The ~4mm that gets trimmed under clamping is
only background gradient, not content — cosmetic, acceptable.

**How to apply:** if asked to remove cover edge bleed, adjust `.cover` height to
match the printable page (e.g. set both to the same mm) rather than unclamping
`.cover-page`. Always re-render a cover that has a `sale_price_eur` and confirm
the gold price still shows at the bottom.

**Probe gotcha:** proposal request bodies nest fields under `reportData`
(e.g. `reportData.sale_price_eur`, `reportData.equipment`), NOT `settings`. The
cover price reads `r.sale_price_eur`. A probe using `settings.sale_price` renders
a cover with no price — a test-data bug, not a CSS regression. Mirror
`yachtworth-app/lib/documentExport.ts` `buildRequestBody` when writing probes.
