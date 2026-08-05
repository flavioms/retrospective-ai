-- AI Retrospective schema.
-- All access goes through server-side code using this database's owner role
-- (Server Actions / Route Handlers) — see docs/ARCHITECTURE.md for why RLS is
-- deny-all-by-default rather than relied on for the hidden-card rule.

create extension if not exists "pgcrypto";

create table rooms (
  id uuid primary key default gen_random_uuid(),
  name text,
  cards_revealed boolean not null default false,
  created_at timestamptz not null default now(),
  last_activity_at timestamptz not null default now()
);

create table participants (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms (id) on delete cascade,
  device_id uuid not null,
  display_name text not null,
  created_at timestamptz not null default now(),
  unique (room_id, device_id)
);

create table cards (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms (id) on delete cascade,
  "column" text not null check ("column" in ('went_well', 'to_improve', 'action_items')),
  text text not null,
  author_device_id uuid not null,
  author_display_name text not null,
  position double precision not null,
  ai_generated boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index cards_room_id_column_idx on cards (room_id, "column", position);

create table reactions (
  id uuid primary key default gen_random_uuid(),
  card_id uuid not null references cards (id) on delete cascade,
  device_id uuid not null,
  emoji text not null,
  created_at timestamptz not null default now(),
  unique (card_id, device_id, emoji)
);

create index reactions_card_id_idx on reactions (card_id);

-- Defense in depth: deny all direct client access. The app never queries
-- through the Supabase client library with the anon key — only through a
-- server-held connection string (Server Actions / Route Handlers).
alter table rooms enable row level security;
alter table participants enable row level security;
alter table cards enable row level security;
alter table reactions enable row level security;
