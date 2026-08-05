"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { revealRoomAction } from "@/app/room/[roomId]/actions";

export function RevealButton({ roomId }: { roomId: string }) {
  const t = useTranslations("board");
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="default"
      disabled={isPending}
      onClick={() => startTransition(() => revealRoomAction(roomId))}
    >
      <Eye className="size-4" />
      {t("reveal")}
    </Button>
  );
}
