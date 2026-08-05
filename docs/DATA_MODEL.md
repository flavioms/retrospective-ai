# Data Model

Source of truth: [`supabase/migrations/`](../supabase/migrations/) (apply in filename order —
`0001_init.sql`, then `0002_security_hardening.sql`, then `0003_action_item_owner.sql`).

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
  last_ai_call_at  timestamptz null                       -- 0002: per-device AI rate-limit cooldown
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
  owner_name           text null                          -- 0003: who's responsible; only set-able on action_items
  created_at, updated_at timestamptz not null default now()

  -- 0003: check (owner_name is null or "column" = 'action_items')

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
- RLS is enabled on every table with zero policies (default-deny), and `0002_security_hardening.sql`
  additionally revokes all privileges from Supabase's `anon`/`authenticated` roles explicitly —
  neither is relied on for the hidden-card rule, which is enforced entirely in the Server Action
  read path; see [SECURITY.md](SECURITY.md#database-access--supabase-rls) for what RLS here
  actually protects against.
- `author_device_id` / `device_id` columns never leave the database as-is — the client-facing
  `Card`/`ReactionSummary` types only ever carry derived booleans (`isOwn`, `reactedByMe`),
  never the raw value. See [SECURITY.md](SECURITY.md#identity--impersonation).
- Cascading deletes on `room_id`/`card_id` foreign keys mean the 30-day cleanup job only needs
  to delete from `rooms`; participants, cards, and reactions follow automatically.
- Drag-to-merge (dropping one card onto another) combines two cards' `text` into the drop
  target — target's text first, then the dragged card's, separated by a newline — and deletes
  the dragged card. The target keeps its `column`, `position`, `author_device_id`, and
  `ai_generated` flag; the merged card's own authorship is not preserved. Both cards must be
  visible to the requester (own card, or room revealed) — re-checked server-side, not trusted
  from the client. Runs in a transaction (`withTransaction` in `lib/db/client.ts`) so a failure
  between the update and delete can't leave a duplicated card behind.
- `owner_name` marks who's responsible for executing an Action Item. Any participant may set it
  (not just the card's author), matching how `moveCard` already treats board organization as a
  shared action. Enforced action-items-only at two layers: the `setCardOwner` query's `where`
  clause no-ops on other columns, and the `cards_owner_only_on_action_items` check constraint
  rejects it at the schema level as defense-in-depth.
