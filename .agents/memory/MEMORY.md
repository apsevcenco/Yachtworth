# Memory index

- [Adaptive Document Engine — page grouping](adaptive-document-engine.md) — opt-in adaptive PDF; greedy packer strands trailing blocks; use `breakBefore` on model nodes to declare page groups.
- [api-server dev = build-and-start, no watch](api-server-dev-restart.md) — backend edits don't hot-reload; restart the api-server workflow before testing via the route.
- [api-server doc-engine probe](api-server-doc-engine-probe.md) — render PDFs from generateDocument() offline: esbuild + esbuild-plugin-pino + ESM __dirname banner + externalize puppeteer-core; else pino/puppeteer worker MODULE_NOT_FOUND.
