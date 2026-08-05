# Data Model

Source of truth: [`supabase/migrations/0001_init.sql`](../supabase/migrations/0001_init.sql).

```
rooms
  id               uuid pk (default gen_random_uuid()) -- also the shareable room id
  name             text null
  cards_revealed   boolean not null default false
  created_at       timestamptz not null default now()
  last_activity_at timestamptz not null default now()   -- bumped by every mutation; drives 30-day expiry

participants
  id               uuid pk
  room_id          uuid fk -> rooms.id on delete cascade
  device_id        uuid not null                         -- from the httpOnly cookie, not a verified identity
  display_name     text not null
  created_at       timestamptz not null default now()
  unique (room_id, device_id)

cards
  id                   uuid pk
  room_id              uuid fk -> rooms.id on delete cascade
  column               text not null check in ('went_well', 'to_improve', 'action_items')
  text                 text not null
  author_device_id     uuid not null
  author_display_name  text not null                     -- denormalized for display-after-reveal and PDF export
  position             double precision not null          -- fractional index, drag-and-drop ordering within a column
  ai_generated         boolean not null default false
  created_at, updated_at timestamptz not null default now()

reactions
  id         uuid pk
  card_id    uuid fk -> cards.id on delete cascade
  device_id  uuid not null
  emoji      text not null                                -- small fixed set (e.g. 👍 ❤️ 🎉 💡)
  created_at timestamptz not null default now()
  unique (card_id, device_id, emoji)
```

## Notes

- `text` is stored unmasked in the database always — masking (`text` → `null` for non-authors
  before reveal) happens in the Server Action read path, never at the schema/RLS level. See
  [ARCHITECTURE.md](ARCHITECTURE.md#data-flow--the-hidden-card-rule).
- `position` uses fractional indexing (e.g. insert at `(prev + next) / 2`) so reordering a card
  only touches the one row being moved, not every row in the column.
- RLS is enabled on every table as defense in depth, but no policies grant client access — all
  reads/writes go through the server-held `DATABASE_URL` connection.
- Cascading deletes on `room_id`/`card_id` foreign keys mean the 30-day cleanup job only needs
  to delete from `rooms`; participants, cards, and reactions follow automatically.
