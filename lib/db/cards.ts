import "server-only";
import { query, queryOne, withTransaction } from "./client";
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
  owner_name: string | null;
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
    authorDisplayName: row.author_display_name,
    position: row.position,
    aiGenerated: row.ai_generated,
    isOwn,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    reactions,
    ownerName: row.owner_name,
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

// Soft anti-abuse cap, not a hard security boundary: bounds a room's worst-
// case growth (and, transitively, AI prompt size and PDF export size) from
// someone spamming card creation. A small TOCTOU race under concurrent
// requests is acceptable here.
const MAX_CARDS_PER_ROOM = 500;

export async function createCard(
  roomId: string,
  column: ColumnId,
  text: string,
  authorDeviceId: string,
  authorDisplayName: string,
  aiGenerated = false,
): Promise<void> {
  const countRow = await queryOne<{ count: number }>(
    `select count(*)::int as count from cards where room_id = $1`,
    [roomId],
  );
  if ((countRow?.count ?? 0) >= MAX_CARDS_PER_ROOM) return;

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
 * Sets (or clears, with `null`) an Action Item's owner. Open to any
 * participant, not just the card's author — deciding who's responsible for
 * an action is a team/facilitator call, not the original writer's alone,
 * matching how `moveCard` already treats board organization as shared.
 * No-ops silently on non-Action-Items cards (matches the DB check constraint).
 */
export async function setCardOwner(cardId: string, ownerName: string | null): Promise<void> {
  await query(
    `update cards set owner_name = $1, updated_at = now()
     where id = $2 and "column" = 'action_items'`,
    [ownerName, cardId],
  );
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

// Generous cap on merged text — bigger than the normal 2000-char per-card
// limit (merging two full-length cards can exceed it), but still bounded so
// repeated merges can't grow a card without limit.
const MAX_MERGED_TEXT_LENGTH = 4000;

/**
 * Drag-to-merge: combines `sourceCardId`'s text into `targetCardId`
 * (target's text first, then source's, separated by a line break) and
 * deletes the source. Keeps the target's column, position, author, and
 * AI-generated flag — the source's authorship is not preserved, matching
 * the simple "one card absorbs another" mental model rather than tracking
 * multiple authors per card.
 *
 * Both cards must be visible to `viewerDeviceId` (own card, or room
 * revealed) — merging text you can't read isn't a sensible action, and
 * this is re-derived server-side rather than trusted from the client.
 * Runs in a transaction so a failure between the two writes can't leave a
 * duplicated card behind.
 */
export async function mergeCards(
  sourceCardId: string,
  targetCardId: string,
  viewerDeviceId: string,
): Promise<void> {
  if (sourceCardId === targetCardId) return;

  await withTransaction(async (tx) => {
    type Row = CardRow & { cards_revealed: boolean };
    const [source, target] = await Promise.all([
      tx.queryOne<Row>(
        `select c.*, r.cards_revealed
         from cards c join rooms r on r.id = c.room_id
         where c.id = $1`,
        [sourceCardId],
      ),
      tx.queryOne<Row>(
        `select c.*, r.cards_revealed
         from cards c join rooms r on r.id = c.room_id
         where c.id = $1`,
        [targetCardId],
      ),
    ]);
    if (!source || !target || source.room_id !== target.room_id) return;

    const sourceVisible = source.author_device_id === viewerDeviceId || source.cards_revealed;
    const targetVisible = target.author_device_id === viewerDeviceId || target.cards_revealed;
    if (!sourceVisible || !targetVisible) return;

    const mergedText = `${target.text}\n${source.text}`.slice(0, MAX_MERGED_TEXT_LENGTH);
    await tx.query(`update cards set text = $1, updated_at = now() where id = $2`, [
      mergedText,
      targetCardId,
    ]);
    await tx.query(`delete from cards where id = $1`, [sourceCardId]);
  });
}
