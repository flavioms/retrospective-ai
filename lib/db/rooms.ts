import "server-only";
import { query, queryOne } from "./client";

export type Room = {
  id: string;
  name: string | null;
  cardsRevealed: boolean;
  createdAt: string;
  lastActivityAt: string;
};

type RoomRow = {
  id: string;
  name: string | null;
  cards_revealed: boolean;
  created_at: string;
  last_activity_at: string;
};

function mapRoom(row: RoomRow): Room {
  return {
    id: row.id,
    name: row.name,
    cardsRevealed: row.cards_revealed,
    createdAt: row.created_at,
    lastActivityAt: row.last_activity_at,
  };
}

export async function createRoom(name?: string): Promise<Room> {
  const row = await queryOne<RoomRow>(`insert into rooms (name) values ($1) returning *`, [
    name ?? null,
  ]);
  return mapRoom(row as RoomRow);
}

export async function getRoom(id: string): Promise<Room | null> {
  const row = await queryOne<RoomRow>(`select * from rooms where id = $1`, [id]);
  return row ? mapRoom(row) : null;
}

export async function touchRoom(id: string): Promise<void> {
  await query(`update rooms set last_activity_at = now() where id = $1`, [id]);
}

export async function revealRoom(id: string): Promise<void> {
  await query(`update rooms set cards_revealed = true, last_activity_at = now() where id = $1`, [
    id,
  ]);
}

/** Deletes rooms idle for 30+ days; cascades to participants/cards/reactions via FK. */
export async function deleteInactiveRooms(): Promise<number> {
  const rows = await query<{ id: string }>(
    `delete from rooms where last_activity_at < now() - interval '30 days' returning id`,
  );
  return rows.length;
}
