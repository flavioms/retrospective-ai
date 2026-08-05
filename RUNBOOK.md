# Runbook

Step-by-step for running AI Retrospective locally, and for deploying it. Written assuming no
prior context on this project.

> **Known limitation:** Docker wasn't available in the environment this project was scaffolded
> in, so the app's core flow (create/join a room, add/edit/delete/move cards, hidden-until-
> revealed masking, reveal-all) was verified end-to-end against a real local Postgres instead —
> confirmed working, including drag-and-drop persisting correctly. What's _not_ yet verified by
> execution is the `docker-compose.yml` file itself and the Realtime broadcast path specifically
> (the "another tab updates live" behavior) — the compose file was assembled by mirroring
> Supabase's own official self-hosting compose (trimmed to just Postgres + Realtime, since this
> app doesn't use Supabase Auth/Storage), but never run. The app degrades gracefully without it
> (a failed broadcast is caught and logged, not thrown — see `lib/supabase/broadcast.ts`), so
> this only affects live cross-tab updates, not core functionality. Treat your first
> `docker compose up` as the real verification step for that piece; if something's off, check
> the `realtime` container logs first (`docker compose logs realtime`) — most self-host Realtime
> issues are a mismatched `DB_USER`/`API_JWT_SECRET`/`DB_ENC_KEY` between the `db` and `realtime`
> services.
>
> Reactions and the AI features (Action Items generation, idea helper) were also verified
> end-to-end against the real Postgres instance, including their error paths (no
> `OPENROUTER_API_KEY` configured, no "To Improve" cards yet) — confirmed they fail gracefully
> with a toast rather than crashing. The actual AI happy path (a real OpenRouter response) was
> **not** verified, since no API key was available in that environment — the JSON-prompt
> building, response parsing, and one-retry repair logic in `lib/ai/generate.ts` are code-reviewed
> but unexercised against a live model. Set `OPENROUTER_API_KEY` and try both features as your
> first real check.

## Prerequisites

- Node.js 20+ and npm
- Docker Desktop (or another Docker Engine + Compose v2)

## 1. Install dependencies

```bash
npm install
```

## 2. Configure environment

```bash
cp .env.local.example .env.local
```

The example file's defaults already match `docker-compose.yml` — no edits needed for local
dev. Set `OPENROUTER_API_KEY` (free at https://openrouter.ai) if you want to exercise the AI
features locally; everything else works without it.

## 3. Start the local database + realtime service

```bash
docker compose up -d
```

This starts:

- `db` — Postgres on `localhost:54322`, seeded on first boot from
  `supabase/local-init/01-realtime-schema.sql` and `supabase/migrations/0001_init.sql`.
- `realtime` — Supabase's Realtime server on `localhost:4000`, used only for the app's
  broadcast "something changed, refetch" signal (see `docs/ARCHITECTURE.md`).

Check both are healthy:

```bash
docker compose ps
```

If you change `supabase/migrations/0001_init.sql` after the first boot, Postgres won't re-run
init scripts on an existing volume — reset with `docker compose down -v && docker compose up -d`.

## 4. Run the app

```bash
npm run dev
```

Open http://localhost:3000, create a room, and open the room URL in a second browser (or
incognito window) to see the two-participant flow (hidden cards, reveal, live updates).

## 5. Production build locally (optional sanity check)

```bash
npm run build
npm start
```

## Deploying

1. Create a Supabase project (free tier) for the production database. Run every file in
   `supabase/migrations/` against it, in filename order (Supabase Studio SQL editor, or `psql`).
2. Create a Vercel project from this repo.
3. Set environment variables in Vercel (Project Settings → Environment Variables), mirroring
   `.env.local.example` but pointed at the Supabase project instead of Docker:
   - `DATABASE_URL` — from Supabase project settings → Database → Connection string.
   - `NEXT_PUBLIC_SUPABASE_REALTIME_URL` — `wss://<project-ref>.supabase.co/realtime/v1`.
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` — from Supabase project settings → API (**not** the local
     demo key from `.env.local.example`).
   - `OPENROUTER_API_KEY`, `OPENROUTER_MODELS`.
   - `CRON_SECRET` — any random string; must match what's configured for the Vercel Cron job.
4. Add a Vercel Cron entry (`vercel.json`, added in Phase 5) pointing at
   `/api/cron/cleanup-rooms`, and set its secret to match `CRON_SECRET`.
5. Deploy.
