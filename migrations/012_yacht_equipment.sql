-- Migration 012 — Yacht Equipment & Systems
-- New table `yacht_equipment` stores per-yacht inventory of equipment items
-- (generators, navigation, safety, water toys, etc). One row per logical unit
-- (so 2 generators = 2 rows, both with equipment_type='generator'). All
-- spec fields are nullable — user fills only what's relevant.
--
-- Owner-run in Supabase SQL editor (yachtworth-prod) AFTER migration 011.

BEGIN;

CREATE TABLE IF NOT EXISTS yacht_equipment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  yacht_id uuid NOT NULL REFERENCES yachts(id) ON DELETE CASCADE,
  clerk_user_id text NOT NULL,
  category text NOT NULL,
  equipment_type text NOT NULL,
  quantity integer DEFAULT 1,
  brand text,
  model text,
  serial_number text,
  year_installed integer,
  -- Numeric specifics
  power_kw numeric(10,2),
  power_hp numeric(10,2),
  hours numeric(10,1),
  capacity_liters numeric(10,2),
  capacity_persons integer,
  panels_count integer,
  total_watts numeric(10,2),
  zones_count integer,
  -- Free text specifics (stabilizer type, rigging type, AC type, etc.)
  type_detail text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- CHECK constraints
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'yacht_equipment_category_chk'
  ) THEN
    ALTER TABLE yacht_equipment
      ADD CONSTRAINT yacht_equipment_category_chk
      CHECK (category IN ('power', 'water', 'navigation', 'safety',
                          'comfort', 'toys', 'deck', 'sailing'));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'yacht_equipment_quantity_chk'
  ) THEN
    ALTER TABLE yacht_equipment
      ADD CONSTRAINT yacht_equipment_quantity_chk
      CHECK (quantity IS NULL OR quantity >= 0);
  END IF;
END $$;

-- Index for fast lookup by yacht
CREATE INDEX IF NOT EXISTS yacht_equipment_yacht_idx
  ON yacht_equipment (yacht_id);

CREATE INDEX IF NOT EXISTS yacht_equipment_user_idx
  ON yacht_equipment (clerk_user_id);

-- RLS deny-all (service role bypasses). Mirrors other tables.
ALTER TABLE yacht_equipment ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'yacht_equipment' AND policyname = 'deny_all'
  ) THEN
    CREATE POLICY deny_all ON yacht_equipment FOR ALL USING (false);
  END IF;
END $$;

-- Atomic replace-all RPC. Used by backend PUT /yachts/:id/equipment so
-- delete+insert happen inside a single transaction (function body =
-- one txn). Prevents the "delete succeeded, insert failed → user loses
-- all equipment" failure mode that a two-statement client-side approach
-- would have. Ownership re-checked here as defence in depth.
CREATE OR REPLACE FUNCTION replace_yacht_equipment(
  p_yacht_id uuid,
  p_user_id text,
  p_items jsonb
) RETURNS SETOF yacht_equipment
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Ownership check
  IF NOT EXISTS (
    SELECT 1 FROM yachts
    WHERE id = p_yacht_id AND clerk_user_id = p_user_id
  ) THEN
    RAISE EXCEPTION 'yacht_not_found_or_not_owned'
      USING ERRCODE = '42501';
  END IF;

  -- Replace
  DELETE FROM yacht_equipment
    WHERE yacht_id = p_yacht_id AND clerk_user_id = p_user_id;

  RETURN QUERY
  INSERT INTO yacht_equipment (
    yacht_id, clerk_user_id, category, equipment_type, quantity,
    brand, model, serial_number, year_installed,
    power_kw, power_hp, hours, capacity_liters, capacity_persons,
    panels_count, total_watts, zones_count, type_detail, notes
  )
  SELECT
    p_yacht_id,
    p_user_id,
    (it->>'category')::text,
    (it->>'equipment_type')::text,
    NULLIF(it->>'quantity','')::integer,
    NULLIF(it->>'brand',''),
    NULLIF(it->>'model',''),
    NULLIF(it->>'serial_number',''),
    NULLIF(it->>'year_installed','')::integer,
    NULLIF(it->>'power_kw','')::numeric,
    NULLIF(it->>'power_hp','')::numeric,
    NULLIF(it->>'hours','')::numeric,
    NULLIF(it->>'capacity_liters','')::numeric,
    NULLIF(it->>'capacity_persons','')::integer,
    NULLIF(it->>'panels_count','')::integer,
    NULLIF(it->>'total_watts','')::numeric,
    NULLIF(it->>'zones_count','')::integer,
    NULLIF(it->>'type_detail',''),
    NULLIF(it->>'notes','')
  FROM jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) AS it
  RETURNING *;
END;
$$;

-- SECURITY: this RPC trusts the caller-supplied `p_user_id` for authorization,
-- so execution MUST be locked to the service role (backend) only. Anon /
-- authenticated JWT callers could otherwise spoof p_user_id and modify
-- another user's equipment via PostgREST's auto-exposed RPC endpoint.
REVOKE ALL ON FUNCTION replace_yacht_equipment(uuid, text, jsonb)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION replace_yacht_equipment(uuid, text, jsonb)
  TO service_role;

COMMIT;
