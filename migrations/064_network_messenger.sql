create table if not exists public.network_conversations (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.yacht_network_listings(id) on delete cascade,
  listing_owner_user_id text not null,
  starter_user_id text not null,
  status text not null default 'active' check (status in ('active', 'archived')),
  last_message_text text,
  last_message_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint network_conversations_no_self_chat check (listing_owner_user_id <> starter_user_id),
  constraint network_conversations_unique_pair unique (listing_id, listing_owner_user_id, starter_user_id)
);

create table if not exists public.network_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.network_conversations(id) on delete cascade,
  sender_user_id text not null,
  body text not null check (length(trim(body)) > 0),
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists network_conversations_owner_idx
  on public.network_conversations (listing_owner_user_id, updated_at desc);

create index if not exists network_conversations_starter_idx
  on public.network_conversations (starter_user_id, updated_at desc);

create index if not exists network_conversations_listing_idx
  on public.network_conversations (listing_id, updated_at desc);

create index if not exists network_messages_conversation_created_idx
  on public.network_messages (conversation_id, created_at);

alter table public.network_conversations enable row level security;
alter table public.network_messages enable row level security;
