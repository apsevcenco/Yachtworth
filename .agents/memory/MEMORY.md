# Memory index

- [Photo uploader multi-select pitfall](photo-uploader-multiselect.md) — local-state RN uploaders must accumulate a batch then call onChange once; appending from a stale prop in a loop drops all but the last.

- [RN numeric input decimals](rn-numeric-input-decimals.md) — a number field rendered from a parsed value strips "3." on re-render; give it local raw-text state, commit parsed number via onChange, re-sync only on divergence.

- [Adaptive Document Engine — page grouping](adaptive-document-engine.md) — opt-in adaptive PDF; greedy packer strands trailing blocks; use `breakBefore` on model nodes to declare page groups.
- [api-server dev = build-and-start, no watch](api-server-dev-restart.md) — backend edits don't hot-reload; restart the api-server workflow before testing via the route.
- [api-server doc-engine probe](api-server-doc-engine-probe.md) — render PDFs from generateDocument() offline: esbuild + esbuild-plugin-pino + ESM __dirname banner + externalize puppeteer-core; else pino/puppeteer worker MODULE_NOT_FOUND.
- [Adaptive doc pagination](adaptive-doc-pagination.md) — fit blocks to A4_CONTENT_HEIGHT_MM (265) not PACK_BUDGET (240); ordered-split for column balance; don't flush on category split.
- [ROI engine quirks](roi-engine.md) — loan repayment ignores financing_type (null loan_* for cash); blank expense lines omitted not estimated; engine reads monthly_crew_eur not crew_breakdown.
- [Owner-run migration column fallback](owner-run-migration-column-fallback.md) — reads selecting a newly-added column must catch PostgREST 42703 and retry without it; migrations lag the deploy.
- [OpenAI helper timeouts](ai-call-timeouts.md) — bare fetch in aiResponses/aiChat has no timeout; a hung web_search blocks until the 120s proxy cutoff → HTTP 502. AbortController + fall back to heuristic.
- [Expo dev workflow won't start](expo-dev-workflow.md) — use EXPO_OFFLINE=1 (not CI=1, which kills hot reload) to skip the blocking Expo login prompt; CI=true pnpm install to fix missing deps + no-TTY abort.
