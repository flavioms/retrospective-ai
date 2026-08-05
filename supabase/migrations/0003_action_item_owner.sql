-- Action Item ownership: who's responsible for executing it. Free text
-- rather than an FK to participants — participants are per-device and
-- ephemeral (no durable "person" identity), and an owner should be
-- assignable even to someone not currently in the room.
alter table cards add column owner_name text;
alter table cards add constraint cards_owner_only_on_action_items
  check (owner_name is null or "column" = 'action_items');
