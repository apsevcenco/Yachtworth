---
name: api-server dev = build-and-start, no watch
description: Backend edits to artifacts/api-server do not hot-reload — you must restart the workflow.
---

# api-server has no watch — restart after backend edits

The `artifacts/api-server` dev script bundles with esbuild to `dist/index.mjs`
and starts it — there is **no file watcher**. Source edits are NOT picked up
until you restart the workflow `artifacts/api-server: API Server`.

**Why:** symptom is "I changed the backend but nothing changed" — the running
process is still serving the previous bundle.

**How to apply:** after any edit under `artifacts/api-server/src/`, call
`restart_workflow "artifacts/api-server: API Server"` before testing via the
route/proxy. (Direct esbuild+node probes of the source don't need a restart —
they rebundle each run.)
