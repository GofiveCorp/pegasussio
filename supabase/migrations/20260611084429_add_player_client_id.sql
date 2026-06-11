-- Make joining a sprint-planio room idempotent.
--
-- Problem: a player's only identity was a server-generated `id` cached in
-- per-tab sessionStorage. Re-entering a room without that id resolving to a
-- live row (second tab, refresh racing the leave-delete, reconnect) caused an
-- unconditional INSERT, producing two rows with the same name -- the duplicate
-- user seen in the UI.
--
-- Fix: tie each player to a stable per-browser `client_id` and enforce one
-- player per (room, browser) so re-joins resolve to the SAME row.

alter table public.players
  add column if not exists client_id uuid;

-- One player per (room, browser-client). Postgres treats NULLs as distinct, so
-- pre-existing rows (client_id IS NULL) are unaffected and never collide.
create unique index if not exists players_room_client_unique
  on public.players (room_id, client_id);

-- Distinguish a leader's kick from an ordinary leave/refresh. kickPlayer sets
-- kicked_at before deleting the row; the kicked client reads it from the
-- DELETE's old row image to decide whether to show "you were kicked" and
-- redirect. A plain leave/refresh delete has kicked_at NULL, so the client
-- self-heals (re-joins) instead of falsely reporting a kick.
alter table public.players
  add column if not exists kicked_at timestamptz;

-- The above only works if DELETE events carry the full old row (so kicked_at /
-- client_id are present on deletion). players already has REPLICA IDENTITY FULL
-- (see the baseline migration); re-asserting it here is a harmless no-op.
alter table public.players replica identity full;
