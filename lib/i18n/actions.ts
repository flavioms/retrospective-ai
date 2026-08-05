"use server";

import { cookies } from "next/headers";
import { LOCALES } from "./locales";

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

export async function setLocaleAction(locale: string): Promise<void> {
  if (!(LOCALES as readonly string[]).includes(locale)) return;
  const store = await cookies();
  store.set("locale", locale, { path: "/", maxAge: ONE_YEAR_SECONDS });
}
