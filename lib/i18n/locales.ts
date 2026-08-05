export const LOCALES = ["en-US", "pt-BR"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en-US";

export const LOCALE_LABELS: Record<Locale, string> = {
  "en-US": "English",
  "pt-BR": "Português",
};
