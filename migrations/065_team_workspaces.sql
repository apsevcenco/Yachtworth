-- Migration 065 — Team workspaces for small companies
-- Adds a lightweight organization layer for Yachtworth Team subscriptions.
-- Existing individual accounts keep working because all columns are nullable
-- and current clerk_user_id ownership remains the fallback access path.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (length(trim(name)) BETWEEN 2 AND 120),
  plan text NOT NULL DEFAULT 'team' CHECK (plan IN ('team')),
  seat_limit integer NOT NULL DEFAULT 5 CHECK (seat_limit BETWEEN 1 AND 5),
  owner_clerk_user_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS organizations_owner_idx
  ON organizations (owner_clerk_user_id);

CREATE TABLE IF NOT EXISTS organization_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  clerk_user_id text NOT NULL,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'member')),
  email text,
  display_name text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active')),
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, clerk_user_id)
);

CREATE INDEX IF NOT EXISTS organization_members_user_idx
  ON organization_members (clerk_user_id, status);

CREATE TABLE IF NOT EXISTS organization_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('member')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'revoked', 'expired')),
  invited_by_clerk_user_id text NOT NULL,
  accepted_by_clerk_user_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  accepted_at timestamptz,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '14 days')
);

CREATE INDEX IF NOT EXISTS organization_invitations_org_status_idx
  ON organization_invitations (organization_id, status);

ALTER TABLE yachts
  ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES organizations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS created_by_clerk_user_id text;

UPDATE yachts
SET created_by_clerk_user_id = clerk_user_id
WHERE created_by_clerk_user_id IS NULL;

CREATE INDEX IF NOT EXISTS yachts_organization_idx
  ON yachts (organization_id, is_archived, updated_at DESC);

COMMIT;
