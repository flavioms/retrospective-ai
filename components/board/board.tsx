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
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
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

// Dropping in the middle ~60% of a card merges; dropping near its top/bottom
// edges reorders as usual. Matches the common "drop on center to combine,
// drop near edge to insert" convention (file managers, kanban tools). Any
// two visible cards can merge regardless of column.
function isMergeZone(activeRect: ClientRect | null, overRect: ClientRect): boolean {
  if (!activeRect) return false;
  const activeCenterY = activeRect.top + activeRect.height / 2;
  const relativeY = (activeCenterY - overRect.top) / overRect.height;
  return relativeY > 0.2 && relativeY < 0.8;
}

// Where a dropped card would land if released right now: at the top of a
// column (columnId as-is), before another card, or at the end of a column
// (beforeId null). Purely a rendering hint — the DOM order isn't touched
// until drop, so cards don't shift under the pointer mid-drag.
type DropIndicator = { column: ColumnId; beforeId: string | null };

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
  const [dropIndicator, setDropIndicator] = useState<DropIndicator | null>(null);
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

  // Deliberately does NOT reorder `items` live while dragging — an earlier
  // version did, and shifting the target's position under the pointer every
  // frame made it nearly impossible to hold still in a card's merge zone.
  // Instead this only updates lightweight highlight state; the actual
  // column/index change is computed once, at drop, in handleDragEnd.
  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) {
      setMergeTargetId(null);
      setDropIndicator(null);
      return;
    }
    const activeId = String(active.id);
    const overId = String(over.id);
    if (activeId === overId) {
      setMergeTargetId(null);
      setDropIndicator(null);
      return;
    }

    if (cardsById.has(overId)) {
      const activeCard = cardsById.get(activeId);
      const overCard = cardsById.get(overId)!;

      // Merge zone: hovering the center of a different, mergeable card. Any
      // two visible cards can merge, regardless of column — visibility is
      // re-checked server-side regardless of what the client claims here.
      const merge = isMergeZone(active.rect.current.translated, over.rect);
      if (merge && activeCard?.text !== null && overCard.text !== null) {
        setMergeTargetId(overId);
        setDropIndicator(null);
        return;
      }
      setMergeTargetId(null);

      const activeRect = active.rect.current.translated;
      const overCenterY = over.rect.top + over.rect.height / 2;
      const isBefore = activeRect ? activeRect.top + activeRect.height / 2 < overCenterY : true;
      const columnIds = items[overCard.column].filter((id) => id !== activeId);
      if (isBefore) {
        setDropIndicator({ column: overCard.column, beforeId: overId });
      } else {
        const idx = columnIds.indexOf(overId);
        const beforeId = idx >= 0 && idx + 1 < columnIds.length ? columnIds[idx + 1] : null;
        setDropIndicator({ column: overCard.column, beforeId });
      }
      return;
    }

    setMergeTargetId(null);
    if ((COLUMNS as readonly string[]).includes(overId)) {
      setDropIndicator({ column: overId as ColumnId, beforeId: null });
    } else {
      setDropIndicator(null);
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);
    const mergeTarget = mergeTargetId;
    const indicator = dropIndicator;
    setMergeTargetId(null);
    setDropIndicator(null);
    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);
    if (activeId === overId) return;

    if (mergeTarget && mergeTarget === overId) {
      startTransition(() => {
        mergeCardsAction(roomId, activeId, overId);
      });
      return;
    }

    if (!indicator) return;
    const activeColumn = findColumn(activeId, items);
    if (!activeColumn) return;

    const { column: targetColumn, beforeId } = indicator;
    const columnIds = items[targetColumn].filter((id) => id !== activeId);
    const insertIndex = beforeId ? columnIds.indexOf(beforeId) : columnIds.length;
    const prevCardId = insertIndex > 0 ? columnIds[insertIndex - 1] : null;
    const nextCardId = beforeId;

    const newColumnIds = [...columnIds];
    newColumnIds.splice(insertIndex, 0, activeId);
    setItems((prev) => ({
      ...prev,
      [activeColumn]:
        activeColumn === targetColumn
          ? newColumnIds
          : prev[activeColumn].filter((id) => id !== activeId),
      [targetColumn]: newColumnIds,
    }));

    startTransition(() => {
      moveCardAction(roomId, activeId, targetColumn, prevCardId, nextCardId);
    });
  }

  const activeCard = activeId ? cardsById.get(activeId) : null;
  // As soon as a mergeable card starts being dragged, every other mergeable
  // card gets a subtle "you can drop here" affordance — otherwise the only
  // way to discover the merge zone is by accidentally landing in it.
  const mergeCandidatesActive = activeCard?.text != null;

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
              activeId={activeId}
              mergeTargetId={mergeTargetId}
              mergeCandidatesActive={mergeCandidatesActive}
              dropIndicatorBeforeId={dropIndicator?.column === columnId ? dropIndicator.beforeId : undefined}
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
