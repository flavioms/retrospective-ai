"use client";

import { useTranslations } from "next-intl";
import { FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";

export function ExportButton({ roomId, revealed }: { roomId: string; revealed: boolean }) {
  const t = useTranslations("board");

  if (!revealed) {
    return (
      <Tooltip>
        <TooltipTrigger render={<Button type="button" variant="outline" disabled />}>
          <FileDown className="size-4" />
          {t("exportPdf")}
        </TooltipTrigger>
        <TooltipContent>{t("exportDisabledHint")}</TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Button
      variant="outline"
      nativeButton={false}
      render={<a href={`/api/rooms/${roomId}/export`} download />}
    >
      <FileDown className="size-4" />
      {t("exportPdf")}
    </Button>
  );
}
