import "server-only";
import { RealtimeClient } from "@supabase/realtime-js";

/**
 * Sends a "something changed, refetch" signal for a room over Supabase
 * Realtime's REST broadcast endpoint — no row data is included, so this
 * never risks leaking a hidden card's text (see docs/ARCHITECTURE.md).
 * Uses httpSend() (no persistent socket), which fits a serverless Server
 * Action better than holding a websocket open. Requires Realtime server
 * v2.97.0+ (docker-compose.yml pins v2.102.3 locally).
 */
export async function broadcastRoomChanged(roomId: string): Promise<void> {
  const endpoint = process.env.NEXT_PUBLIC_SUPABASE_REALTIME_URL;
  const apikey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!endpoint || !apikey) return;

  const client = new RealtimeClient(endpoint, { params: { apikey } });
  const channel = client.channel(`room:${roomId}`);
  try {
    await channel.httpSend("changed", { roomId });
  } catch (error) {
    // Best-effort: a missed live-update signal just means other tabs pick up
    // the change on their next manual refresh instead of instantly.
    console.error(`broadcastRoomChanged(${roomId}) failed`, error);
  }
}
