# Runbook

Step-by-step for running AI Retrospective locally, and for deploying it. Written assuming no
prior context on this project.

> **Known limitation:** the `docker-compose.yml` in this repo was assembled by mirroring
> Supabase's own official self-hosting compose file (trimmed to just Postgres + Realtime,
> since this app doesn't use Supabase Auth/Storage), not by test-running it end to end — Docker
> wasn't available in the environment this project was scaffolded in. Treat your first
> `docker compose up` as the real verification step; if something's off, check the `realtime`
> container logs first (`docker compose logs realtime`) — most self-host Realtime issues are a
> mismatched `DB_USER`/`API_JWT_SECRET`/`DB_ENC_KEY` between the `db` and `realtime` services.

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

1. Create a Supabase project (free tier) for the production database. Run
   `supabase/migrations/0001_init.sql` against it (Supabase Studio SQL editor, or `psql`).
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
