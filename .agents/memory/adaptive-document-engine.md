---
name: Adaptive Document Engine — page grouping
description: How to control page-grouping/layout in the opt-in adaptive PDF engine (valuation + proposal), and the greedy-packer gotcha.
---

# Adaptive Document Engine — layout control

The adaptive PDF engine (`artifacts/api-server/src/documents/`) is opt-in via
`exportSettings.engine: "adaptive"` (default stays the legacy section-per-page
templates). Flow: builder → DocumentModel → `renderModelToBlocks` → `paginateBlocks` → HTML → Chromium.

## Greedy packer strands trailing small blocks
`paginateBlocks` is a pure greedy bin-packer (`PACK_BUDGET_MM`, conservative vs
the true ~265mm usable). It fills each page to the budget before starting a new
one. Consequence: a small block that is **auto-appended after the body** (e.g. the
disclaimer in `renderModelToBlocks`) gets stranded alone on a near-empty final
page whenever the preceding blocks happen to fill a page exactly.

## Declare semantic groups with `breakBefore`
To force layout groupings, set `breakBefore: true` on a model node. It propagates
to the first emitted DocBlock and makes the packer flush the current page first.
**Why:** the packer has no notion of "these belong together" — `breakBefore` is the
only lever to keep a group on its own page or pull a trailing block (disclaimer)
onto the same page as its siblings.
**How to apply:** set it on the *first* node of each group. It only flushes a page
that already has content, so it can never create an empty page. It lives on the
model node (`ParagraphNode`/`TableNode` carry it) and on `DocBlock`.

Valuation grouping (the canonical example): overview group (Yacht Summary +
Accommodation + Valuation Result) → evidence group (Comparables + Factors, share a
page when they fit) → closing group (Market Notes + Contact + Disclaimer). The
builder sets `breakBefore` on the first present of comparables/factors and on
market-notes.

## Edge case (accepted, not a bug)
A paragraph node becomes `splittable` at >180mm and gets its own page at
>budget. So market notes long enough to fill ~a page cannot be grouped with
Contact/Disclaimer on one final page — that is physics, not a regression.

## Verifying layout without the route
Probe directly: import `build<Type>Model` + `renderModelToBlocks` + `paginateBlocks`,
bundle with `npx esbuild <f>.ts --bundle --platform=node --format=cjs --packages=external`,
run with node, log each page's blocks + used/budget mm. For a real PDF, call
`generateDocument` with the **route shape** (`yachtProfile`, `exportSettings`,
`reportData`, `documentType`, `format`) — NOT flat `yacht`/`settings` — set
`PUPPETEER_EXECUTABLE_PATH=$REPLIT_PLAYWRIGHT_CHROMIUM_EXECUTABLE`, then
`pdfinfo`/`pdftoppm`. Keep changes additive: proposal never sets `breakBefore`, so
its output stays byte-identical.

**Cover context gotcha:** the ROI result payload (`RoiCalculation`) carries no
yacht identity or region — those live in the *input* (`yacht_snapshot`/`yacht_id` +
`region`), not the result. So a doc export that wants a real cover title must thread
yacht name/builder/model + region label through navigation params separately from the
result. Fresh path: calculate screen passes a `header` param built from the yacht
profile (yacht_id) or manual snapshot + selected region. History path: result screen
derives it from `RoiCalculationDetail.yacht_snapshot` + `input.region`. Without this
the cover falls back to a generic "Charter ROI Scenario".
