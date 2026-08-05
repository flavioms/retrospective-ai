import { NextResponse } from "next/server";
import { deleteInactiveRooms } from "@/lib/db/rooms";

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

  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const deletedCount = await deleteInactiveRooms();
  return NextResponse.json({ deletedCount });
}
