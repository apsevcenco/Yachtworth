-- Migration 010 — Central Agent + Sub-agents commission structure
-- Replaces the implicit "AA Commission" / "Agent Commission" distribution rows
-- with explicit Central Agent + up to N sub-agents (% net, % central, fixed €).
-- The remaining `distribution` jsonb continues to hold optional CUSTOM
-- participants only (e.g. partners, referrers). Boat owner is computed as
-- residual = base_net − all commissions − all custom participants.

BEGIN;

-- 1) Columns (idempotent)
ALTER TABLE charters
  ADD COLUMN IF NOT EXISTS central_agent_name text DEFAULT 'Central Agent',
  ADD COLUMN IF NOT EXISTS central_agent_type text NOT NULL DEFAULT 'percent_net',
  ADD COLUMN IF NOT EXISTS central_agent_value numeric(12,2) NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS sub_agents jsonb NOT NULL DEFAULT '[]'::jsonb;

-- 2) Type constraint for central_agent_type
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'charters_central_agent_type_chk'
  ) THEN
    ALTER TABLE charters
      ADD CONSTRAINT charters_central_agent_type_chk
      CHECK (central_agent_type IN ('percent_net', 'fixed'));
  END IF;
END $$;

-- 3) Backfill: extract central agent % from any existing "agent" row in
--    `distribution`, then strip out owner/agent/aa rows so `distribution`
--    keeps only true custom participants.
-- Only strip the three legacy preset rows seeded by the old DEFAULT_DISTRIBUTION
-- ("Boat Owner", "AA Commission", "Agent Commission"). Custom user-named rows
-- like "Agent Smith" or "Owner Jr" are preserved — exact match only.
WITH src AS (
  SELECT
    id,
    distribution,
    (
      SELECT (e->>'value')::numeric
      FROM jsonb_array_elements(distribution) e
      WHERE lower(trim(e->>'name')) = 'agent commission'
        AND (e->>'type') = 'percent'
      LIMIT 1
    ) AS extracted_pct
  FROM charters
  WHERE jsonb_typeof(distribution) = 'array'
)
UPDATE charters c
SET
  central_agent_value = COALESCE(src.extracted_pct, c.central_agent_value),
  distribution = COALESCE(
    (
      SELECT jsonb_agg(e)
      FROM jsonb_array_elements(c.distribution) e
      WHERE lower(trim(e->>'name')) NOT IN (
        'boat owner', 'aa commission', 'agent commission'
      )
    ),
    '[]'::jsonb
  )
FROM src
WHERE src.id = c.id;

COMMIT;
