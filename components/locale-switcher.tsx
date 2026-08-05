"use client";

import { useTransition } from "react";
import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { LOCALES, LOCALE_LABELS, type Locale } from "@/lib/i18n/locales";
import { setLocaleAction } from "@/lib/i18n/actions";
import { cn } from "@/lib/utils";

export function LocaleSwitcher() {
  const current = useLocale() as Locale;
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function change(locale: Locale) {
    if (locale === current) return;
    startTransition(async () => {
      await setLocaleAction(locale);
      router.refresh();
    });
  }

  return (
    <div className="border-border flex overflow-hidden rounded-lg border">
      {LOCALES.map((locale) => (
        <button
          key={locale}
          type="button"
          onClick={() => change(locale)}
          disabled={isPending}
          aria-pressed={locale === current}
          className={cn(
            "px-2 py-1 text-xs font-medium outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50",
            locale === current
              ? "bg-primary text-primary-foreground"
              : "bg-background text-muted-foreground hover:bg-muted",
          )}
        >
          {LOCALE_LABELS[locale]}
        </button>
      ))}
    </div>
  );
}
