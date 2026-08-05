-- Security hardening pass — see docs/SECURITY.md.

-- Per-device cooldown tracking for the AI Server Actions (Action Item
-- generation, idea-helper rewrite). Prevents a script bypassing the UI from
-- hammering the OpenRouter free-tier quota via unlimited calls.
alter table participants add column last_ai_call_at timestamptz;

-- Belt-and-suspenders on top of RLS: even if RLS policies or PostgREST's
-- exposed-schema config ever change, these two Supabase API-facing roles
-- (used by the anon/authenticated JWT, never by this app's own DATABASE_URL
-- connection) get zero baseline privilege on these tables. This app never
-- reads/writes through PostgREST or the Supabase client SDK — only through
-- a server-held Postgres connection — so anon/authenticated should never be
-- able to touch these tables under any configuration.
--
-- Wrapped in existence checks: our local dev Postgres (docker-compose.yml)
-- is a trimmed image without Supabase's Auth/PostgREST roles, so `anon`/
-- `authenticated` only exist on an actual Supabase project.
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    execute 'revoke all on rooms, participants, cards, reactions from anon';
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    execute 'revoke all on rooms, participants, cards, reactions from authenticated';
  end if;
end $$;
