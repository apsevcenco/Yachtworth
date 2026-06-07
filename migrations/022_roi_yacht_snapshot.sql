-- ─────────────────────────────────────────────────────────────────────────────
-- 022_roi_yacht_snapshot.sql
--
-- ROI is decoupled from My Yachts. An ROI calculation may now be run against:
--   (a) a saved My-Yacht profile  → yacht_id set, yacht_snapshot null, OR
--   (b) a manually-entered yacht  → yacht_id null, yacht_snapshot holds the
--       passport (identity + dimensions). A manual ROI yacht is persisted ONLY
--       here and NEVER creates a row in public.yachts.
--
-- Idempotent. Run in the Supabase SQL editor of yachtworth-prod.
-- ─────────────────────────────────────────────────────────────────────────────

-- Allow ROI rows that are not tied to a saved My-Yacht profile.
alter table public.roi_calculations
  alter column yacht_id drop not null;

-- Passport snapshot for manually-entered ROI yachts (null for My-Yacht runs).
alter table public.roi_calculations
  add column if not exists yacht_snapshot jsonb;
