import "server-only";
import { query, queryOne } from "./client";
import { positionBetween } from "./position";
import { getReactionsForCards } from "./reactions";
import { type Card, type ColumnId, type ReactionSummary } from "../cards";

export { COLUMNS, type Card, type ColumnId } from "../cards";

type CardRow = {
  id: string;
  room_id: string;
  column: ColumnId;
  text: string;
  author_device_id: string;
  author_display_name: string;
  position: number;
  ai_generated: boolean;
  created_at: string;
  updated_at: string;
};

function mapCard(
  row: CardRow,
  viewerDeviceId: string,
  revealed: boolean,
  reactions: ReactionSummary[],
): Card {
  const isOwn = row.author_device_id === viewerDeviceId;
  return {
    id: row.id,
    roomId: row.room_id,
    column: row.column,
    text: isOwn || revealed ? row.text : null,
    authorDeviceId: row.author_device_id,
    authorDisplayName: row.author_display_name,
    position: row.position,
    aiGenerated: row.ai_generated,
    isOwn,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    reactions,
  };
}

export async function listCardsMasked(
  roomId: string,
  viewerDeviceId: string,
  revealed: boolean,
): Promise<Card[]> {
  const rows = await query<CardRow>(
    `select * from cards where room_id = $1 order by "column", position asc`,
    [roomId],
  );
  const reactionsByCard = await getReactionsForCards(
    rows.map((row) => row.id),
    viewerDeviceId,
  );
  return rows.map((row) =>
    mapCard(row, viewerDeviceId, revealed, reactionsByCard.get(row.id) ?? []),
  );
}

export async function createCard(
  roomId: string,
  column: ColumnId,
  text: string,
  authorDeviceId: string,
  authorDisplayName: string,
  aiGenerated = false,
): Promise<void> {
  const last = await queryOne<{ position: number }>(
    `select position from cards where room_id = $1 and "column" = $2 order by position desc limit 1`,
    [roomId, column],
  );
  const position = positionBetween(last?.position ?? null, null);
  await query(
    `insert into cards (room_id, "column", text, author_device_id, author_display_name, position, ai_generated)
     values ($1, $2, $3, $4, $5, $6, $7)`,
    [roomId, column, text, authorDeviceId, authorDisplayName, position, aiGenerated],
  );
}

/** Unmasked — for server-only aggregate reads like AI generation, never sent to the client. */
export async function listCardTexts(roomId: string, column: ColumnId): Promise<string[]> {
  const rows = await query<{ text: string }>(
    `select text from cards where room_id = $1 and "column" = $2 order by position asc`,
    [roomId, column],
  );
  return rows.map((row) => row.text);
}

export async function updateCardText(
  cardId: string,
  authorDeviceId: string,
  text: string,
): Promise<void> {
  await query(
    `update cards set text = $1, updated_at = now()
     where id = $2 and author_device_id = $3`,
    [text, cardId, authorDeviceId],
  );
}

export async function deleteCard(cardId: string, authorDeviceId: string): Promise<void> {
  await query(`delete from cards where id = $1 and author_device_id = $2`, [
    cardId,
    authorDeviceId,
  ]);
}

/**
 * Moves a card to a column at a position between the given neighbors' ids
 * (either may be omitted at a boundary). Any participant may move any card —
 * board organization is treated as a shared, collaborative action, not
 * restricted to the card's author (unlike editing/deleting its text).
 */
export async function moveCard(
  cardId: string,
  toColumn: ColumnId,
  prevCardId: string | null,
  nextCardId: string | null,
): Promise<void> {
  const [prev, next] = await Promise.all([
    prevCardId
      ? queryOne<{ position: number }>(`select position from cards where id = $1`, [prevCardId])
      : null,
    nextCardId
      ? queryOne<{ position: number }>(`select position from cards where id = $1`, [nextCardId])
      : null,
  ]);
  const position = positionBetween(prev?.position ?? null, next?.position ?? null);
  await query(`update cards set "column" = $1, position = $2, updated_at = now() where id = $3`, [
    toColumn,
    position,
    cardId,
  ]);
}
