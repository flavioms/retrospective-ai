# Architecture

> Security posture, threat model, and mitigations (prompt injection, RLS, secrets, rate
> limiting) live in [SECURITY.md](SECURITY.md) — read it alongside this doc, not instead of it.

## Stack

| Concern     | Choice                                                                      |
| ----------- | --------------------------------------------------------------------------- |
| Framework   | Next.js (App Router, Server Components, Server Actions), TypeScript strict  |
| Hosting     | Vercel                                                                      |
| Database    | Postgres (Supabase-hosted in production; `supabase/postgres` image locally) |
| Live sync   | Supabase Realtime **Broadcast** — signal-only, not Postgres Changes CDC     |
| UI kit      | shadcn/ui (Radix) + Tailwind                                                |
| Drag & drop | `@dnd-kit/core` + `@dnd-kit/sortable`                                       |
| AI          | OpenRouter, free-tier chat models, JSON prompt pattern                      |
| PDF export  | `@react-pdf/renderer`, generated server-side                                |
| i18n        | `next-intl` (`en-US`, `pt-BR`) — platform UI text only, never card content  |

## Why Vercel only, not GitHub Pages

GitHub Pages serves static files only — no Server Actions, no dynamic Server Components, no
server-side database access. This app needs all three (rooms, live cards, AI generation, PDF
export), so it deploys to Vercel exclusively.

## Identity

No accounts. On joining a room, the browser gets an httpOnly cookie `device_id` (uuid) and the
user picks a display name, stored in the `participants` table keyed on `(room_id, device_id)`.
This is the anonymous per-device model EasyRetro-style tools use. `device_id` is _not_ a
verified identity — it's just a client-held cookie — which is why authorization for the
hidden-card rule happens server-side (see below), not via database row-level security keyed on
a trusted principal.

Because `device_id` is a bearer-token-like value (whoever holds it acts as that participant,
in every room that browser has joined), it's never sent to the client for anyone other than the
request's own cookie owner — the `Card` type shared with the browser carries only the
server-computed `isOwn` boolean, never a raw `authorDeviceId`. See
[SECURITY.md](SECURITY.md#identity--impersonation) for why this matters and what was fixed.

## Data flow & the hidden-card rule

**All reads and writes go through Next.js Server Actions**, which hold the only database
credential (`DATABASE_URL`, a direct Postgres connection via `pg`). The browser never talks to
Postgres directly. Row Level Security is enabled on every table as defense in depth, but the
actual authorization boundary is the Server Action layer:

- `getRoomCards(roomId)` reads `device_id` from the cookie server-side and masks `text` to
  `null` for any card the caller doesn't own, unless `rooms.cards_revealed` is true.
- Every mutating Server Action bumps `rooms.last_activity_at` (drives the 30-day expiry) and
  broadcasts a `changed` event on the Realtime channel `room:{roomId}` — carrying **no row
  data**, just a signal.
- Clients subscribe to that broadcast channel and re-invoke the masked Server Action fetch
  whenever a signal arrives. This is what gives near-realtime UX without ever putting
  unmasked card text on the wire to the wrong participant — the alternative (subscribing
  directly to Postgres Changes with the anon key) would require trusting the client-supplied
  `device_id` inside an RLS policy, which is spoofable.

## Board interactions: move, merge, owner assignment

Drag-and-drop (`@dnd-kit`) drives three distinct outcomes from the same gesture, disambiguated
by where within the target card the pointer is released:

- **Reorder / move column**: dropping near a card's top or bottom edge (outside the middle
  25%–75% band of its height) inserts the dragged card before/after it, calling `moveCardAction`.
- **Merge**: dropping on the middle 25%–75% band of a *different* card (`isMergeZone` in
  `components/board/board.tsx`) combines the two, calling `mergeCardsAction`. Both cards must
  currently show text (not hidden pre-reveal) — the client hides the merge-highlight otherwise,
  and `mergeCards` (`lib/db/cards.ts`) re-derives visibility server-side rather than trusting the
  client. The merge runs in a Postgres transaction (`withTransaction`, `lib/db/client.ts`) so a
  crash between updating the target and deleting the source can't leave a duplicate behind.
- **Owner assignment**: unrelated to drag-and-drop — an inline-editable field shown only on
  Action Items cards (`OwnerField` in `components/board/card-item.tsx`), calling
  `setCardOwnerAction` → `setCardOwner`. Open to any participant, not just the card's author,
  since deciding who executes an action is a team call. Gated to the `action_items` column at
  two independent layers: the update query's `where` clause, and a database check constraint
  (`cards_owner_only_on_action_items`) as defense-in-depth against a bug in the first.

## Realtime transport detail (local vs prod)

`@supabase/supabase-js`'s `createClient()` derives the realtime websocket path as
`{url}/realtime/v1`, which only resolves correctly behind Supabase's Kong gateway (which
rewrites `/realtime/v1/*` → the realtime server's `/socket/*`). Locally we run the realtime
container without Kong, so the app uses `RealtimeClient` from `@supabase/realtime-js` directly
with an explicit endpoint, configured via `NEXT_PUBLIC_SUPABASE_REALTIME_URL`:

- Local: `ws://localhost:4000/socket`
- Production: `wss://<project-ref>.supabase.co/realtime/v1`

See `lib/supabase/browser.ts`.

## AI integration

`lib/ai/` is shared by both AI features:

- `openrouter.ts` — chat completions client. Model comes from `OPENROUTER_MODELS`, a
  comma-separated fallback list (env var) — free-tier model availability on OpenRouter shifts
  over time, so nothing is hardcoded to a single model name. Requests are sent with a low
  `temperature` (0.3) — these are structured-extraction tasks, not creative writing, and lower
  sampling variance measurably improved instruction-following consistency (e.g. matching the
  input's language) in live testing against free-tier models.
- `prompts.ts` — builds requests using the JSON prompt pattern (structured object: role, retro
  ceremony context, agile-facilitation instructions, input items, strict output schema) and
  instructs the model to answer **in the same language as the input cards**, independent of UI
  locale. Includes layered prompt-injection defenses — see
  [SECURITY.md](SECURITY.md#prompt-injection-ai-features).
- `schemas.ts` — `zod` schemas validating the model's JSON response, with one
  retry-with-repair-instructions pass on parse failure.

Two call sites: the Action Items "AI Generation" button (reads all `to_improve` cards
server-side, inserts suggestions as normal editable `action_items` cards with
`ai_generated = true`), and the idea-helper compose assist (rewrites a rough note into a
clear card-text suggestion). Both are rate-limited and validate room membership server-side —
see [SECURITY.md](SECURITY.md#prompt-injection-ai-features) for the prompt-injection defenses
and abuse guardrails.

## PDF export

A Route Handler renders a `@react-pdf/renderer` document — title/date, then one section per
column, each card as author + text + vote count. Gated on `rooms.cards_revealed = true`.

## Room expiry

A Vercel Cron job hits `/api/cron/cleanup-rooms` daily; it deletes rooms where
`last_activity_at < now() - interval '30 days'` (cascades to participants/cards/reactions).

## Scope note: Kudos column

The color palette defines tokens for a 4th "Kudos" column (purple), but MVP ships with only 3
columns (Went Well, To Improve, Action Items) per [PRD.md](PRD.md). The `kudos.*` Tailwind
tokens exist in the theme now but are unused, reserved for a later phase.
