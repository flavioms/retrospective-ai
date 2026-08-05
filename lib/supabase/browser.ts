"use client";

import { useEffect } from "react";
import { RealtimeClient } from "@supabase/realtime-js";

let sharedClient: RealtimeClient | null = null;

function getClient(): RealtimeClient {
  if (!sharedClient) {
    sharedClient = new RealtimeClient(process.env.NEXT_PUBLIC_SUPABASE_REALTIME_URL!, {
      params: { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! },
    });
  }
  return sharedClient;
}

/**
 * Subscribes to the room's broadcast "changed" signal (see
 * lib/supabase/broadcast.ts) and calls `onChange` whenever it fires — the
 * caller is expected to refetch (e.g. `router.refresh()`), since broadcast
 * payloads intentionally carry no row data.
 */
export function useRoomBroadcast(roomId: string, onChange: () => void): void {
  useEffect(() => {
    const client = getClient();
    const channel = client.channel(`room:${roomId}`);
    channel.on("broadcast", { event: "changed" }, () => onChange()).subscribe();
    return () => {
      client.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);
}
