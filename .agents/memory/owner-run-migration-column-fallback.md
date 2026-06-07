---
name: Owner-run migration column-select fallback
description: Why reads that select a newly-added column must tolerate the column not existing yet
---

In Yachtworth, DB migrations are run **manually by the owner** in Supabase, so
new columns/tables can lag the deployed backend by an arbitrary amount of time.

**Rule:** when a backend read `select()`s a column added by a not-yet-applied
migration, it must fall back gracefully. PostgREST returns code `42703`
(undefined_column) — catch it and retry the select without the new column. A
plain select of a missing column returns a hard error → 500, which breaks
existing features (e.g. opening history items) before the owner runs the migration.

**Why:** the repo's stated contract is "until each migration is run the feature
degrades gracefully" (POST insert errors are caught/warn-logged, calc still
returns). A naive `GET …/:id` that always selects the new column violates this
and 500s pre-migration. Caught in the ROI/My-Yachts decoupling (yacht_snapshot).

**How to apply:** writes that insert the new column are usually already safe if
the insert error is caught/warn-logged. The dangerous case is **reads** that add
the new column to the select string — wrap with a 42703 fallback select.
