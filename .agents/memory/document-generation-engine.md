---
name: Adaptive document engine
description: Block-based PDF layout engine in api-server (valuation pilot) — opt-in flag, pagination model, escaping boundary, and the "duplicate not refactor" decision.
---

# Adaptive document engine (api-server `src/documents/`)

Block-based PDF renderer that packs content onto A4 pages to kill the legacy
"one section = one page" empty-space problem. Pilot consumer = valuation_report
PDF.

## Opt-in contract — never break legacy by default
- Selected by `exportSettings.engine`: `"adaptive"` opt-in, anything else
  (missing/unknown) → `"legacy"`. Default MUST stay legacy.
- Dispatcher branches only for `documentType==="valuation_report" && format==="pdf"`.
  Proposal paths and all DOCX paths stay legacy untouched.
- The route passes `exportSettings` through wholesale, so adding a field to
  `ExportSettings` is enough for it to flow — no route change needed.

## Pagination model
- Each block reports a heuristic `estimatedHeight` in **mm**. `paginateBlocks`
  greedily fills a page until the next block would exceed `PACK_BUDGET_MM`.
- **Budget is deliberately conservative (240mm vs ~265mm true A4 usable).**
  **Why:** heuristic heights + inter-block margins are approximate; under-budgeting
  guarantees assigned blocks never overflow a forced-break page into a near-empty
  extra page. Don't raise it toward 265 without re-testing real payloads.
- Every block is wrapped with `break-inside: avoid` → a heading can never be
  orphaned from its content. **Trade-off:** an unbounded-length block (long market
  notes) could overflow. Fix in place: `DocBlock.splittable` — when set + oversized,
  the paginator gives it its own page and it renders WITHOUT break-inside so it
  flows across as many physical pages as needed (verified: 60-paragraph notes flow
  clean, no empty middle page).

## Escaping boundary
- Blocks receive **pre-escaped** strings and just interpolate them; the template
  (`templates/valuationAdaptive.ts`) does all escaping via `core/util.ts#esc`.
- Gotcha caught in review: `moneyOf` interpolates the **caller-supplied currency
  code** for unknown currencies — it MUST be escaped (`reportData.currency` /
  `comparable.currency` are attacker-controllable on `/documents/generate`).
  The legacy valuation template has the same unescaped-currency bug but was left
  untouched on purpose (see below).

## Key decision: duplicate, don't refactor
- The adaptive template re-implements the 6-language label dict + money/confidence/
  impact/specRows/accomRows helpers locally instead of importing from the legacy
  template. **Why:** hard rule for this work was "do not modify or remove the
  legacy valuation/proposal templates." Duplication keeps legacy byte-identical.
  Matches the codebase's established duplicate-over-refactor stance.
- App is a leaf package and does not import api-server, so app typecheck is
  unaffected by these server-only additions.

## Verifying PDF output (harness pattern)
- In `artifacts/api-server`: bundle a throwaway `__doctest.ts` with
  `node_modules/esbuild/bin/esbuild ... --bundle --platform=node --format=esm
  --packages=external`, run with
  `PUPPETEER_EXECUTABLE_PATH="${REPLIT_PLAYWRIGHT_CHROMIUM_EXECUTABLE}" node`,
  inspect with `pdfinfo` (page count) + per-page `pdftotext -f N -l N` (char count
  to spot empty pages). Delete the harness after. Test images:
  `https://dummyimage.com/1600x1000/0b1e3f/c9a961.png&text=LABEL`.
- Baseline result: legacy Serenity full payload = 6 pages, adaptive = 4.
