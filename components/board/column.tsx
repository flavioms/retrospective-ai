"use client";

import { useTranslations } from "next-intl";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import type { Card as CardType, ColumnId } from "@/lib/cards";
import { CardItem } from "./card-item";
import { AddCardForm } from "./add-card-form";
import { AiGenerateButton } from "./ai-generate-button";
import { COLUMN_META, COLUMN_TRANSLATION_KEYS } from "./column-meta";

// A thin bar showing where a dragged card would land — deliberately not a
// live DOM reorder (see board.tsx), just a rendering hint at the drop point.
// Absolutely positioned so toggling it on/off never changes any sibling
// card's layout position: an in-flow version briefly pushed cards below it
// up and down during vertical drags, recreating the exact shifting-under-
// the-cursor problem this whole redesign was meant to fix.
function DropLine({ side }: { side: "before" | "after" }) {
  return (
    <div
      className={`bg-primary absolute inset-x-0 h-0.5 rounded-full ${side === "before" ? "-top-[5px]" : "-bottom-[5px]"}`}
      aria-hidden
    />
  );
}

export function Column({
  roomId,
  columnId,
  cards,
  activeId,
  mergeTargetId,
  mergeCandidatesActive,
  dropIndicatorBeforeId,
}: {
  roomId: string;
  columnId: ColumnId;
  cards: CardType[];
  activeId: string | null;
  mergeTargetId: string | null;
  /** True while dragging a mergeable card — every other mergeable card gets a subtle affordance. */
  mergeCandidatesActive: boolean;
  /** undefined: no indicator in this column. null: indicator at the end. string: before that card id. */
  dropIndicatorBeforeId?: string | null;
}) {
  const t = useTranslations("columns");
  const meta = COLUMN_META[columnId];
  const label = t(COLUMN_TRANSLATION_KEYS[columnId]);
  const { setNodeRef } = useDroppable({ id: columnId });

  return (
    <section
      aria-label={label}
      className={`flex min-h-[16rem] flex-1 flex-col gap-3 rounded-lg border-l-4 ${meta.accent} ${meta.bg} p-3`}
    >
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-foreground text-sm font-semibold tracking-wide uppercase">
          {label} <span className="text-muted-foreground font-normal">({cards.length})</span>
        </h2>
        {columnId === "action_items" && <AiGenerateButton roomId={roomId} />}
      </div>

      <div ref={setNodeRef} className="flex min-h-[4rem] flex-1 flex-col gap-2">
        <SortableContext items={cards.map((c) => c.id)} strategy={verticalListSortingStrategy}>
          {cards.map((card, index) => (
            <div key={card.id} className="relative">
              {dropIndicatorBeforeId === card.id && <DropLine side="before" />}
              <CardItem
                card={card}
                roomId={roomId}
                isMergeTarget={mergeTargetId === card.id}
                isMergeCandidate={
                  mergeCandidatesActive && card.id !== activeId && card.text !== null
                }
              />
              {dropIndicatorBeforeId === null && index === cards.length - 1 && (
                <DropLine side="after" />
              )}
            </div>
          ))}
        </SortableContext>
      </div>

      <AddCardForm roomId={roomId} column={columnId} />
    </section>
  );
}
