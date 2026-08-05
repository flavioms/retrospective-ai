import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";
import { LOCALES, DEFAULT_LOCALE, type Locale } from "./locales";

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get("locale")?.value;
  const locale: Locale = (LOCALES as readonly string[]).includes(cookieLocale ?? "")
    ? (cookieLocale as Locale)
    : DEFAULT_LOCALE;

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
