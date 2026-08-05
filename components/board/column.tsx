"use client";

import { useTranslations } from "next-intl";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import type { Card as CardType, ColumnId } from "@/lib/cards";
import { CardItem } from "./card-item";
import { AddCardForm } from "./add-card-form";
import { AiGenerateButton } from "./ai-generate-button";
import { COLUMN_META, COLUMN_TRANSLATION_KEYS } from "./column-meta";

export function Column({
  roomId,
  columnId,
  cards,
  mergeTargetId,
}: {
  roomId: string;
  columnId: ColumnId;
  cards: CardType[];
  mergeTargetId: string | null;
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
          {cards.map((card) => (
            <CardItem
              key={card.id}
              card={card}
              roomId={roomId}
              isMergeTarget={mergeTargetId === card.id}
            />
          ))}
        </SortableContext>
      </div>

      <AddCardForm roomId={roomId} column={columnId} />
    </section>
  );
}
