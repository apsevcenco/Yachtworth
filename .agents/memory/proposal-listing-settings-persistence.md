---
name: Proposal/Listing settings_snapshot persistence
description: Why new fields on ProposalSettings/ListingSettings silently fail to save unless the OpenAPI schema is updated.
---

# settings_snapshot only persists fields declared in OpenAPI

`POST /proposals` (and `/listings`) validate the request with the generated zod
schema (`SaveProposalBody` etc.) before writing `settings_snapshot` to the DB
jsonb column. zod `.object()` **strips unknown keys by default**, so any field
present on the app-side `ProposalSettings`/`ListingSettings` interface but NOT in
`lib/api-spec/openapi.yaml` is dropped on save — the in-session export still
works, but reopening a saved record loses the field.

**Why:** the local PDF-engine type (`lib/proposalPdf.ts`) and the generated API
type are two separate `ProposalSettings`. Adding a field to the local one is
enough for export but not for persistence.

**How to apply:** when adding any settings field that must survive save→reopen
(e.g. the `template` selector for the 3-template proposal system), add it to the
`ProposalSettings` schema in `openapi.yaml`, run
`pnpm --filter @workspace/api-spec run codegen`, then keep a runtime fallback
(engine uses `settings.template ?? "minimal"`) for old records saved before the
field existed.
