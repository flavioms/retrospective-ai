export const COLUMNS = ["went_well", "to_improve", "action_items"] as const;
export type ColumnId = (typeof COLUMNS)[number];

export const COLUMN_LABELS: Record<ColumnId, string> = {
  went_well: "Went Well",
  to_improve: "To Improve",
  action_items: "Action Items",
};

export const REACTION_EMOJIS = ["👍", "❤️", "🎉", "💡"] as const;
export type ReactionEmoji = (typeof REACTION_EMOJIS)[number];

export type ReactionSummary = {
  emoji: string;
  count: number;
  reactedByMe: boolean;
};

export type Card = {
  id: string;
  roomId: string;
  column: ColumnId;
  /** null when hidden from the current viewer (not the author, room not revealed) */
  text: string | null;
  authorDeviceId: string;
  authorDisplayName: string;
  position: number;
  aiGenerated: boolean;
  isOwn: boolean;
  createdAt: string;
  updatedAt: string;
  reactions: ReactionSummary[];
};
