-- Yachtworth — Survey item photos storage bucket (T-SurveyPhotos).
-- Creates the `survey-item-photos` public bucket so the api-server can
-- upload via the service-role key (mobile never sees storage creds).
-- The `photo_urls` jsonb column on `survey_items` already exists in
-- migration 018; this migration only provisions storage + read policy.
-- Idempotent.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'survey-item-photos',
  'survey-item-photos',
  true,
  5242880,           -- 5 MB cap per file
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Public read so the rendered PDF + in-app preview can fetch URLs
-- without auth. All writes go through the service role (server-side).
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'public_read_survey_item_photos'
  ) then
    create policy public_read_survey_item_photos on storage.objects
      for select
      using (bucket_id = 'survey-item-photos');
  end if;
end $$;
