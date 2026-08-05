import "server-only";
import { query } from "./client";
import type { ReactionSummary } from "../cards";

export async function toggleReaction(
  cardId: string,
  deviceId: string,
  emoji: string,
): Promise<void> {
  const existing = await query(
    `select 1 from reactions where card_id = $1 and device_id = $2 and emoji = $3`,
    [cardId, deviceId, emoji],
  );
  if (existing.length > 0) {
    await query(`delete from reactions where card_id = $1 and device_id = $2 and emoji = $3`, [
      cardId,
      deviceId,
      emoji,
    ]);
  } else {
    await query(`insert into reactions (card_id, device_id, emoji) values ($1, $2, $3)`, [
      cardId,
      deviceId,
      emoji,
    ]);
  }
}

type ReactionRow = {
  card_id: string;
  emoji: string;
  count: number;
  reacted_by_me: boolean;
};

export async function getReactionsForCards(
  cardIds: string[],
  viewerDeviceId: string,
): Promise<Map<string, ReactionSummary[]>> {
  const map = new Map<string, ReactionSummary[]>();
  if (cardIds.length === 0) return map;

  const rows = await query<ReactionRow>(
    `select card_id, emoji, count(*)::int as count, bool_or(device_id = $2) as reacted_by_me
     from reactions
     where card_id = any($1)
     group by card_id, emoji`,
    [cardIds, viewerDeviceId],
  );

  for (const row of rows) {
    const list = map.get(row.card_id) ?? [];
    list.push({ emoji: row.emoji, count: row.count, reactedByMe: row.reacted_by_me });
    map.set(row.card_id, list);
  }
  return map;
}
