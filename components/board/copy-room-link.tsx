"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Check, Link as LinkIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CopyRoomLink() {
  const t = useTranslations("board");
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Button type="button" variant="outline" onClick={copy}>
      {copied ? <Check className="size-4" /> : <LinkIcon className="size-4" />}
      {copied ? t("linkCopied") : t("copyLink")}
    </Button>
  );
}
