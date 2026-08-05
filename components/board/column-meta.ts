import type { ColumnId } from "@/lib/cards";

// Palette tokens wired into the Tailwind theme in app/globals.css — see
// docs/ARCHITECTURE.md for the source palette and contrast notes.
export const COLUMN_META: Record<ColumnId, { accent: string; bg: string }> = {
  went_well: { accent: "border-l-went-well-accent", bg: "bg-went-well-bg" },
  to_improve: { accent: "border-l-to-improve-accent", bg: "bg-to-improve-bg" },
  action_items: { accent: "border-l-action-items-accent", bg: "bg-action-items-bg" },
};

// Maps a column id to its key in the "columns" messages namespace.
export const COLUMN_TRANSLATION_KEYS: Record<ColumnId, "wentWell" | "toImprove" | "actionItems"> = {
  went_well: "wentWell",
  to_improve: "toImprove",
  action_items: "actionItems",
};
