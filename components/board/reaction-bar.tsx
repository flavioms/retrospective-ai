"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { REACTION_EMOJIS, type ReactionSummary } from "@/lib/cards";
import { toggleReactionAction } from "@/app/room/[roomId]/actions";
import { cn } from "@/lib/utils";

export function ReactionBar({
  roomId,
  cardId,
  reactions,
}: {
  roomId: string;
  cardId: string;
  reactions: ReactionSummary[];
}) {
  const t = useTranslations("card");
  const [isPending, startTransition] = useTransition();
  const byEmoji = new Map(reactions.map((r) => [r.emoji, r]));

  return (
    <div className="mt-2 flex flex-wrap gap-1">
      {REACTION_EMOJIS.map((emoji) => {
        const summary = byEmoji.get(emoji);
        const count = summary?.count ?? 0;
        const reactedByMe = summary?.reactedByMe ?? false;
        return (
          <button
            key={emoji}
            type="button"
            disabled={isPending}
            onClick={() => startTransition(() => toggleReactionAction(roomId, cardId, emoji))}
            aria-pressed={reactedByMe}
            aria-label={`${t("reactWith", { emoji })}${count > 0 ? ` (${count})` : ""}`}
            className={cn(
              "flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-xs transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
              reactedByMe
                ? "border-primary bg-primary/10"
                : "border-border bg-transparent opacity-60 hover:opacity-100",
            )}
          >
            <span>{emoji}</span>
            {count > 0 && <span className="tabular-nums">{count}</span>}
          </button>
        );
      })}
    </div>
  );
}
