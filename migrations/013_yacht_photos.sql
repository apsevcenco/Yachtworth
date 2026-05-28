-- Migration 013 — Yacht Photos
-- Adds multi-photo support to the yacht profile:
--   * photo_urls     — ordered array of public storage URLs
--   * cover_photo_url — single URL shown in fleet cards / hero
-- And provisions the storage bucket + read policy.
--
-- The existing `photo_url` column is kept for backward compatibility — it
-- mirrors `cover_photo_url` so older clients keep working. New writes go
-- to all three.
--
-- Owner-run in Supabase SQL editor (yachtworth-prod) AFTER migration 012.

BEGIN;

ALTER TABLE yachts
  ADD COLUMN IF NOT EXISTS photo_urls jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS cover_photo_url text;

-- Backfill cover_photo_url from existing single photo_url so the new
-- column is immediately useful on yachts that already have a photo.
UPDATE yachts
   SET cover_photo_url = photo_url
 WHERE cover_photo_url IS NULL AND photo_url IS NOT NULL;

COMMIT;

-- ────────────────────────────────────────────────────────────────────
-- Storage bucket: yacht-photos
-- Public bucket (read-only for anon). All writes go through the backend
-- service-role key, so no INSERT/UPDATE/DELETE policies are required
-- on storage.objects.
-- ────────────────────────────────────────────────────────────────────

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'yacht-photos',
  'yacht-photos',
  true,
  5242880, -- 5 MB raw upload ceiling (frontend already compresses to ~800 KB)
  ARRAY['image/jpeg','image/png','image/heic','image/webp']
)
ON CONFLICT (id) DO UPDATE
  SET public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Public SELECT policy so the public URLs work without auth.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename  = 'objects'
      AND policyname = 'public_read_yacht_photos'
  ) THEN
    CREATE POLICY public_read_yacht_photos ON storage.objects
      FOR SELECT
      USING (bucket_id = 'yacht-photos');
  END IF;
END $$;
