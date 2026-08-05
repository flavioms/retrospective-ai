"use client";

import { useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Plus, Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { ColumnId } from "@/lib/cards";
import { createCardAction, generateIdeaHelperAction } from "@/app/room/[roomId]/actions";

export function AddCardForm({ roomId, column }: { roomId: string; column: ColumnId }) {
  const t = useTranslations("addCard");
  const [isOpen, setIsOpen] = useState(false);
  const [text, setText] = useState("");
  const [isPending, startTransition] = useTransition();
  const [isRewriting, startRewriting] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  function reset() {
    setText("");
    setIsOpen(false);
  }

  if (!isOpen) {
    return (
      <Button
        type="button"
        variant="outline"
        className="w-full justify-start"
        onClick={() => setIsOpen(true)}
      >
        <Plus className="size-4" />
        {t("openButton")}
      </Button>
    );
  }

  function rewrite() {
    if (!text.trim()) return;
    startRewriting(async () => {
      const result = await generateIdeaHelperAction(text);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setText(result.text);
    });
  }

  return (
    <form
      ref={formRef}
      action={(formData) => {
        startTransition(async () => {
          await createCardAction(roomId, column, formData);
          formRef.current?.reset();
          reset();
        });
      }}
      className="flex flex-col gap-2"
    >
      <Textarea
        name="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={t("placeholder")}
        autoFocus
        rows={3}
        maxLength={2000}
        required
      />

      <button
        type="button"
        onClick={rewrite}
        disabled={isRewriting || !text.trim()}
        className="text-muted-foreground hover:text-foreground flex items-center gap-1 self-start rounded text-xs outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50"
      >
        {isRewriting ? (
          <Loader2 className="size-3 animate-spin" />
        ) : (
          <Sparkles className="size-3" />
        )}
        {isRewriting ? t("rewriting") : t("helpMePhrase")}
      </button>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={reset}>
          {t("cancel")}
        </Button>
        <Button type="submit" disabled={isPending}>
          {t("submit")}
        </Button>
      </div>
    </form>
  );
}
