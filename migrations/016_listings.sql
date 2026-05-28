-- Yachtworth — Listing Generator persistence (T-ListingGenerator).
-- Stores AI-generated broker listings (Claude). Idempotent, safe to re-run.

create table if not exists public.listings (
  id uuid primary key default gen_random_uuid(),
  clerk_user_id text not null,
  yacht_id uuid references public.yachts(id) on delete set null,
  yacht_name text not null,
  listing_type text not null check (listing_type in ('sale', 'charter', 'both')),
  style text not null,
  language text not null,
  word_length text not null,
  generated_text text not null,
  yacht_snapshot jsonb,
  settings_snapshot jsonb,
  ai_used boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists listings_user_idx
  on public.listings (clerk_user_id, created_at desc);

create index if not exists listings_yacht_idx
  on public.listings (yacht_id) where yacht_id is not null;

-- RLS deny_all; service-role bypasses (matches all other tables).
alter table public.listings enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'listings' and policyname = 'deny_all'
  ) then
    create policy deny_all on public.listings for all using (false) with check (false);
  end if;
end $$;
