-- Required by the supabase/realtime image: it manages its own tenant/config
-- tables in this schema. Copied from Supabase's official self-host compose
-- (docker/volumes/db/realtime.sql in supabase/supabase).
\set pguser `echo "$POSTGRES_USER"`

create schema if not exists _realtime;
alter schema _realtime owner to :pguser;
