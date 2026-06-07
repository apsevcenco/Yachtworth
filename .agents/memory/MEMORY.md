# Memory index

- [Photo uploader multi-select pitfall](photo-uploader-multiselect.md) — local-state RN uploaders must accumulate a batch then call onChange once; appending from a stale prop in a loop drops all but the last.

- [Adaptive Document Engine — page grouping](adaptive-document-engine.md) — opt-in adaptive PDF; greedy packer strands trailing blocks; use `breakBefore` on model nodes to declare page groups.
- [api-server dev = build-and-start, no watch](api-server-dev-restart.md) — backend edits don't hot-reload; restart the api-server workflow before testing via the route.
- [api-server doc-engine probe](api-server-doc-engine-probe.md) — render PDFs from generateDocument() offline: esbuild + esbuild-plugin-pino + ESM __dirname banner + externalize puppeteer-core; else pino/puppeteer worker MODULE_NOT_FOUND.
- [Adaptive doc pagination](adaptive-doc-pagination.md) — fit blocks to A4_CONTENT_HEIGHT_MM (265) not PACK_BUDGET (240); ordered-split for column balance; don't flush on category split.
