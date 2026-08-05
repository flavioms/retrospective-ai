"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { generateActionItemsAction } from "@/app/room/[roomId]/actions";

export function AiGenerateButton({ roomId }: { roomId: string }) {
  const t = useTranslations("board");
  const [isPending, startTransition] = useTransition();

  function generate() {
    startTransition(async () => {
      const result = await generateActionItemsAction(roomId);
      if (!result.ok) toast.error(result.error);
    });
  }

  return (
    <Tooltip>
      <TooltipTrigger
        render={<Button type="button" variant="outline" onClick={generate} disabled={isPending} />}
      >
        {isPending ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
        {t("aiGeneration")}
      </TooltipTrigger>
      <TooltipContent>{t("aiGenerationHint")}</TooltipContent>
    </Tooltip>
  );
}
