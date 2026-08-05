import "server-only";
import { cookies } from "next/headers";
import { randomUUID } from "node:crypto";

const DEVICE_COOKIE = "device_id";
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

/** Read-only — safe to call from Server Components. */
export async function getDeviceId(): Promise<string | null> {
  const store = await cookies();
  return store.get(DEVICE_COOKIE)?.value ?? null;
}

/** Mutates cookies — only callable from Server Actions or Route Handlers. */
export async function getOrCreateDeviceId(): Promise<string> {
  const store = await cookies();
  const existing = store.get(DEVICE_COOKIE)?.value;
  if (existing) return existing;

  const deviceId = randomUUID();
  store.set(DEVICE_COOKIE, deviceId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: ONE_YEAR_SECONDS,
    secure: process.env.NODE_ENV === "production",
  });
  return deviceId;
}
