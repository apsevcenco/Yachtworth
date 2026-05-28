-- Migration 011 — My Yacht Foundation Layer
-- Extends the `yachts` table with profile fields used by the new My Yacht
-- module (registration, identification, engine specs, accommodation,
-- ownership role, archival). Existing fields are reused where they map
-- cleanly (`brand` = builder, `length_meters`, `beam_meters`, `cabins` =
-- guest cabins, `engine_hours` = current hours, `home_port`, `photo_url`,
-- `notes`). All new columns are nullable so existing rows remain valid.

BEGIN;

ALTER TABLE yachts
  -- Dimensions
  ADD COLUMN IF NOT EXISTS draft_meters numeric(6,2),
  -- Registration / identification
  ADD COLUMN IF NOT EXISTS registration_number text,
  ADD COLUMN IF NOT EXISTS imo_number text,
  ADD COLUMN IF NOT EXISTS hull_id text,
  ADD COLUMN IF NOT EXISTS vat_status text,
  -- Engine
  ADD COLUMN IF NOT EXISTS engine_maker text,
  ADD COLUMN IF NOT EXISTS engine_model text,
  ADD COLUMN IF NOT EXISTS engine_count integer,
  ADD COLUMN IF NOT EXISTS total_hp integer,
  -- Accommodation (separate from existing `cabins`/`crew` counts)
  ADD COLUMN IF NOT EXISTS crew_cabins integer,
  ADD COLUMN IF NOT EXISTS berths integer,
  ADD COLUMN IF NOT EXISTS heads integer,
  -- Ownership role for this yacht (per-yacht, distinct from user-wide role)
  ADD COLUMN IF NOT EXISTS owner_role text DEFAULT 'owner',
  -- Archival (soft-delete)
  ADD COLUMN IF NOT EXISTS is_archived boolean NOT NULL DEFAULT false;

-- CHECK constraints for the small enums
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'yachts_vat_status_chk'
  ) THEN
    ALTER TABLE yachts
      ADD CONSTRAINT yachts_vat_status_chk
      CHECK (vat_status IS NULL OR vat_status IN ('tax_paid_eu', 'tax_not_paid', 'unknown'));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'yachts_owner_role_chk'
  ) THEN
    ALTER TABLE yachts
      ADD CONSTRAINT yachts_owner_role_chk
      CHECK (owner_role IS NULL OR owner_role IN ('owner', 'broker', 'manager'));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'yachts_engine_count_chk'
  ) THEN
    ALTER TABLE yachts
      ADD CONSTRAINT yachts_engine_count_chk
      CHECK (engine_count IS NULL OR engine_count >= 0);
  END IF;
END $$;

-- Index for fleet list filtered to non-archived
CREATE INDEX IF NOT EXISTS yachts_active_idx
  ON yachts (clerk_user_id, is_archived);

COMMIT;
