"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  closestCenter,
  useSensor,
  useSensors,
  type ClientRect,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { COLUMNS, type Card as CardType, type ColumnId } from "@/lib/cards";
import { useRoomBroadcast } from "@/lib/supabase/browser";
import { moveCardAction, mergeCardsAction } from "@/app/room/[roomId]/actions";
import { Column } from "./column";
import { CardItemOverlay } from "./card-item";
import { RevealButton } from "./reveal-button";
import { CopyRoomLink } from "./copy-room-link";
import { ExportButton } from "./export-button";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { ThemeToggle } from "@/components/theme-toggle";

type ColumnOrder = Record<ColumnId, string[]>;

function groupByColumn(cards: CardType[]): ColumnOrder {
  const grouped: ColumnOrder = { went_well: [], to_improve: [], action_items: [] };
  for (const card of cards) {
    grouped[card.column].push(card.id);
  }
  return grouped;
}

function findColumn(id: string, items: ColumnOrder): ColumnId | null {
  if ((COLUMNS as readonly string[]).includes(id)) return id as ColumnId;
  for (const column of COLUMNS) {
    if (items[column].includes(id)) return column;
  }
  return null;
}

// Dropping in the middle ~50% of a card merges; dropping near its top/bottom
// edges reorders as usual. Matches the common "drop on center to combine,
// drop near edge to insert" convention (file managers, kanban tools).
function isMergeZone(activeRect: ClientRect | null, overRect: ClientRect): boolean {
  if (!activeRect) return false;
  const activeCenterY = activeRect.top + activeRect.height / 2;
  const relativeY = (activeCenterY - overRect.top) / overRect.height;
  return relativeY > 0.25 && relativeY < 0.75;
}

export function Board({
  roomId,
  revealed,
  displayName,
  cards,
}: {
  roomId: string;
  revealed: boolean;
  displayName: string;
  cards: CardType[];
}) {
  const router = useRouter();
  const t = useTranslations("board");
  const [items, setItems] = useState<ColumnOrder>(() => groupByColumn(cards));
  const [activeId, setActiveId] = useState<string | null>(null);
  const [mergeTargetId, setMergeTargetId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  // Reset local drag-ordering state when fresh server data arrives (own
  // mutation's revalidatePath, or another client's broadcast -> refresh).
  // Computed during render, not an effect — see
  // https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes
  const [prevCards, setPrevCards] = useState(cards);
  if (cards !== prevCards) {
    setPrevCards(cards);
    setItems(groupByColumn(cards));
  }

  const cardsById = useMemo(() => {
    const map = new Map<string, CardType>();
    for (const card of cards) map.set(card.id, card);
    return map;
  }, [cards]);

  useRoomBroadcast(roomId, () => router.refresh());

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) {
      setMergeTargetId(null);
      return;
    }
    const activeId = String(active.id);
    const overId = String(over.id);

    // Merge zone: hovering the center of a different, mergeable card. Both
    // must be visible to this viewer — merging text you can't read isn't
    // meaningful (also re-checked server-side). Skip the reorder preview
    // below while in this zone, so the target card's position doesn't shift
    // out from under the merge-highlight.
    if (activeId !== overId && cardsById.has(overId)) {
      const activeCard = cardsById.get(activeId);
      const overCard = cardsById.get(overId);
      const merge = isMergeZone(active.rect.current.translated, over.rect);
      if (merge && activeCard?.text !== null && overCard?.text !== null) {
        setMergeTargetId(overId);
        return;
      }
    }
    setMergeTargetId(null);

    const activeColumn = findColumn(activeId, items);
    const overColumn = findColumn(overId, items);
    if (!activeColumn || !overColumn || activeColumn === overColumn) return;

    setItems((prev) => {
      const activeItems = prev[activeColumn];
      const overItems = prev[overColumn];
      const overIndex = overItems.indexOf(overId);
      const newIndex = overIndex >= 0 ? overIndex : overItems.length;
      return {
        ...prev,
        [activeColumn]: activeItems.filter((id) => id !== activeId),
        [overColumn]: [...overItems.slice(0, newIndex), activeId, ...overItems.slice(newIndex)],
      };
    });
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);
    const mergeTarget = mergeTargetId;
    setMergeTargetId(null);
    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    if (mergeTarget && mergeTarget === overId && activeId !== overId) {
      startTransition(() => {
        mergeCardsAction(roomId, activeId, overId);
      });
      return;
    }

    const activeColumn = findColumn(activeId, items);
    if (!activeColumn) return;
    const overColumn = findColumn(overId, items) ?? activeColumn;

    let finalItems = items;
    const activeIndex = items[activeColumn].indexOf(activeId);
    const overIndex = items[overColumn].indexOf(overId);
    if (activeColumn === overColumn && overIndex !== -1 && activeIndex !== overIndex) {
      finalItems = {
        ...items,
        [activeColumn]: arrayMove(items[activeColumn], activeIndex, overIndex),
      };
      setItems(finalItems);
    }

    const finalIds = finalItems[overColumn];
    const finalIndex = finalIds.indexOf(activeId);
    const prevCardId = finalIndex > 0 ? finalIds[finalIndex - 1] : null;
    const nextCardId = finalIndex < finalIds.length - 1 ? finalIds[finalIndex + 1] : null;

    startTransition(() => {
      moveCardAction(roomId, activeId, overColumn, prevCardId, nextCardId);
    });
  }

  const activeCard = activeId ? cardsById.get(activeId) : null;

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">{t("title")}</h1>
          <p className="text-muted-foreground text-sm">{t("youAreIn", { name: displayName })}</p>
        </div>
        <div className="flex gap-2">
          <LocaleSwitcher />
          <ThemeToggle />
          <CopyRoomLink />
          <ExportButton roomId={roomId} revealed={revealed} />
          {!revealed && <RevealButton roomId={roomId} />}
        </div>
      </header>

      <DndContext
        id={`board-${roomId}`}
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex flex-1 flex-col gap-4 md:flex-row">
          {COLUMNS.map((columnId) => (
            <Column
              key={columnId}
              roomId={roomId}
              columnId={columnId}
              cards={items[columnId].map((id) => cardsById.get(id)).filter((c) => c !== undefined)}
              mergeTargetId={mergeTargetId}
            />
          ))}
        </div>

        <DragOverlay>
          {activeCard ? <CardItemOverlay card={activeCard} roomId={roomId} /> : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
