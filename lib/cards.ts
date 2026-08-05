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
  // Deliberately no authorDeviceId here: device_id is a bearer-token-like
  // cookie value, not scoped to a single room. Leaking another
  // participant's device_id to the client would let anyone who inspects
  // the page payload set their own cookie to that value and fully
  // impersonate them, in this room and any other room that browser has
  // joined. `isOwn` (computed server-side) is the only thing the client
  // ever needs. See docs/SECURITY.md.
  authorDisplayName: string;
  position: number;
  aiGenerated: boolean;
  isOwn: boolean;
  createdAt: string;
  updatedAt: string;
  reactions: ReactionSummary[];
  /** Action Items only — who's responsible for executing it. Free text, not a participant FK. */
  ownerName: string | null;
};
