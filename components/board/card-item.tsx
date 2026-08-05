"use client";

import { useState, useTransition, type CSSProperties } from "react";
import { useTranslations } from "next-intl";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { EyeOff, Pencil, Sparkles, Trash2, X, Check, User, Combine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Card as CardType } from "@/lib/cards";
import {
  deleteCardAction,
  updateCardAction,
  setCardOwnerAction,
} from "@/app/room/[roomId]/actions";
import { ReactionBar } from "./reaction-bar";

function OwnerField({ roomId, card }: { roomId: string; card: CardType }) {
  const t = useTranslations("card");
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(card.ownerName ?? "");
  const [isPending, startTransition] = useTransition();

  function save() {
    startTransition(async () => {
      await setCardOwnerAction(roomId, card.id, draft);
      setIsEditing(false);
    });
  }

  if (isEditing) {
    return (
      <div className="mt-2 flex items-center gap-1">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={t("ownerPlaceholder")}
          className="h-6 px-1.5 text-xs"
          autoFocus
          maxLength={60}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              save();
            }
            if (e.key === "Escape") setIsEditing(false);
          }}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          onClick={save}
          disabled={isPending}
          aria-label={t("saveOwner")}
        >
          <Check className="size-3" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          onClick={() => setIsEditing(false)}
          aria-label={t("cancelEdit")}
        >
          <X className="size-3" />
        </Button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        setDraft(card.ownerName ?? "");
        setIsEditing(true);
      }}
      className="text-muted-foreground hover:text-foreground mt-2 flex items-center gap-1 rounded text-xs outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <User className="size-3" aria-hidden />
      {card.ownerName ? t("ownerLabel", { name: card.ownerName }) : t("assignOwner")}
    </button>
  );
}

function CardItemContent({
  card,
  roomId,
  dragHandleProps,
}: {
  card: CardType;
  roomId: string;
  dragHandleProps?: Record<string, unknown>;
}) {
  const t = useTranslations("card");
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(card.text ?? "");
  const [isPending, startTransition] = useTransition();

  function save() {
    if (!draft.trim()) return;
    startTransition(async () => {
      await updateCardAction(roomId, card.id, draft);
      setIsEditing(false);
    });
  }

  function remove() {
    startTransition(async () => {
      await deleteCardAction(roomId, card.id);
    });
  }

  return (
    <div className="flex items-start gap-2">
      <button
        type="button"
        aria-label={t("dragHandle")}
        className="text-muted-foreground mt-0.5 cursor-grab touch-none rounded outline-none active:cursor-grabbing focus-visible:ring-3 focus-visible:ring-ring/50"
        {...dragHandleProps}
      >
        ⠿
      </button>

      <div className="min-w-0 flex-1">
        {card.text === null ? (
          <p className="text-muted-foreground flex items-center gap-1.5 text-sm italic">
            <EyeOff className="size-3.5" aria-hidden />
            {t("hidden")}
          </p>
        ) : isEditing ? (
          <div className="flex flex-col gap-2">
            <Textarea value={draft} onChange={(e) => setDraft(e.target.value)} autoFocus rows={3} />
            <div className="flex justify-end gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setIsEditing(false)}
                aria-label={t("cancelEdit")}
              >
                <X className="size-4" />
              </Button>
              <Button
                type="button"
                size="icon"
                onClick={save}
                disabled={isPending}
                aria-label={t("saveCard")}
              >
                <Check className="size-4" />
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-sm whitespace-pre-wrap">{card.text}</p>
        )}

        {card.aiGenerated && (
          <Badge variant="secondary" className="mt-2 gap-1">
            <Sparkles className="size-3" aria-hidden />
            {t("aiSuggested")}
          </Badge>
        )}
        {card.text !== null && (
          <p className="text-muted-foreground mt-2 text-xs">
            {card.isOwn ? t("you") : card.authorDisplayName}
          </p>
        )}
        {card.text !== null && card.column === "action_items" && (
          <OwnerField roomId={roomId} card={card} />
        )}
        {card.text !== null && (
          <ReactionBar roomId={roomId} cardId={card.id} reactions={card.reactions} />
        )}
      </div>

      {card.isOwn && !isEditing && card.text !== null && (
        <div className="flex shrink-0 gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => {
              setDraft(card.text ?? "");
              setIsEditing(true);
            }}
            aria-label={t("editCard")}
          >
            <Pencil className="size-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={remove}
            disabled={isPending}
            aria-label={t("deleteCard")}
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
}

/** The real, draggable card rendered in a column's sortable list. */
export function CardItem({
  card,
  roomId,
  isMergeTarget = false,
  isMergeCandidate = false,
}: {
  card: CardType;
  roomId: string;
  isMergeTarget?: boolean;
  /** A valid merge drop target for the card currently being dragged, but not the one under the pointer right now — shown as a lighter affordance than isMergeTarget. */
  isMergeCandidate?: boolean;
}) {
  const t = useTranslations("card");
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card.id,
  });

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition: transition ?? undefined,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "bg-card text-card-foreground rounded-md border p-3 shadow-sm transition-shadow",
        isMergeTarget && "ring-primary ring-2 ring-offset-2",
        !isMergeTarget && isMergeCandidate && "border-primary/50 border-dashed",
      )}
    >
      {isMergeTarget && (
        <p className="text-primary mb-2 flex items-center gap-1 text-xs font-medium">
          <Combine className="size-3.5" aria-hidden />
          {t("dropToMerge")}
        </p>
      )}
      <CardItemContent
        card={card}
        roomId={roomId}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </div>
  );
}

/** Static visual clone for DndContext's DragOverlay — no useSortable, no listeners. */
export function CardItemOverlay({ card, roomId }: { card: CardType; roomId: string }) {
  return (
    <div className="bg-card text-card-foreground rotate-1 rounded-md border p-3 shadow-lg">
      <CardItemContent card={card} roomId={roomId} />
    </div>
  );
}
