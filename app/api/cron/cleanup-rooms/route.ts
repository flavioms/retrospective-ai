import { NextResponse } from "next/server";
import { createHash, timingSafeEqual } from "node:crypto";
import { deleteInactiveRooms } from "@/lib/db/rooms";

// Hash both sides to fixed-length digests before comparing: a direct
// string/Buffer compare (or even timingSafeEqual on the raw values) leaks
// the secret's length and, for a naive `===`, leaks a byte-position signal
// too — low-severity here, but free to close.
function safeEqual(a: string, b: string): boolean {
  const hashA = createHash("sha256").update(a).digest();
  const hashB = createHash("sha256").update(b).digest();
  return timingSafeEqual(hashA, hashB);
}

/**
 * Triggered daily by Vercel Cron (see vercel.json). Vercel sends
 * `Authorization: Bearer $CRON_SECRET` on cron-triggered requests when the
 * project has a CRON_SECRET env var configured — we verify it matches so
 * this endpoint can't be used to mass-delete rooms by anyone who finds the URL.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  }

  const authHeader = request.headers.get("authorization") ?? "";
  if (!safeEqual(authHeader, `Bearer ${secret}`)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const deletedCount = await deleteInactiveRooms();
  return NextResponse.json({ deletedCount });
}
