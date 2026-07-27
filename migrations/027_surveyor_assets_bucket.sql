-- Yachtworth - Surveyor assets storage bucket.
-- Stores surveyor profile assets such as PDF logo files.
-- Public read is required because generated PDFs fetch the logo by URL.
-- Writes go through the api-server service role only.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'surveyor-assets',
  'surveyor-assets',
  true,
  3145728,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'public_read_surveyor_assets'
  ) then
    create policy public_read_surveyor_assets on storage.objects
      for select
      using (bucket_id = 'surveyor-assets');
  end if;
end $$;
