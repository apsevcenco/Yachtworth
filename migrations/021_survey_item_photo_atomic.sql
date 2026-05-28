-- 021_survey_item_photo_atomic.sql
-- Atomic append/remove for survey_items.photo_urls.
-- Prevents lost-update races between concurrent photo uploads/deletes
-- (previous read-modify-write pattern could drop URLs and orphan storage objects).
-- Idempotent: CREATE OR REPLACE.

CREATE OR REPLACE FUNCTION survey_item_append_photo(
  p_item_id uuid,
  p_url     text,
  p_max     int DEFAULT 10
)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  current_photos jsonb;
  current_count  int;
  result         jsonb;
BEGIN
  -- Lock the row for the duration of the transaction so a concurrent
  -- append cannot read the same "current_count" and both succeed past
  -- the limit check.
  SELECT COALESCE(photo_urls, '[]'::jsonb)
    INTO current_photos
    FROM survey_items
    WHERE id = p_item_id
    FOR UPDATE;

  IF current_photos IS NULL THEN
    RAISE EXCEPTION 'survey item not found' USING ERRCODE = 'P0002';
  END IF;

  current_count := jsonb_array_length(current_photos);
  IF current_count >= p_max THEN
    RAISE EXCEPTION 'photo limit reached' USING ERRCODE = 'P0001';
  END IF;

  UPDATE survey_items
     SET photo_urls = current_photos || to_jsonb(p_url)
   WHERE id = p_item_id
   RETURNING photo_urls INTO result;

  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION survey_item_remove_photo(
  p_item_id uuid,
  p_url     text
)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  current_photos jsonb;
  next_photos    jsonb;
  result         jsonb;
BEGIN
  SELECT COALESCE(photo_urls, '[]'::jsonb)
    INTO current_photos
    FROM survey_items
    WHERE id = p_item_id
    FOR UPDATE;

  IF current_photos IS NULL THEN
    RAISE EXCEPTION 'survey item not found' USING ERRCODE = 'P0002';
  END IF;

  next_photos := COALESCE(
    (SELECT jsonb_agg(elem)
       FROM jsonb_array_elements(current_photos) elem
      WHERE elem <> to_jsonb(p_url)),
    '[]'::jsonb
  );

  UPDATE survey_items
     SET photo_urls = next_photos
   WHERE id = p_item_id
   RETURNING photo_urls INTO result;

  RETURN result;
END;
$$;
