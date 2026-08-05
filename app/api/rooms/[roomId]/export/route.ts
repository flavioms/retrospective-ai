import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { getRoom } from "@/lib/db/rooms";
import { listCardsMasked } from "@/lib/db/cards";
import { getOrCreateDeviceId } from "@/lib/identity/device";
import { buildRetroReport } from "@/lib/pdf/report";

export async function GET(_request: Request, { params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = await params;

  const room = await getRoom(roomId);
  if (!room) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }
  if (!room.cardsRevealed) {
    return NextResponse.json({ error: "Reveal all cards before exporting." }, { status: 409 });
  }

  const deviceId = await getOrCreateDeviceId();
  const cards = await listCardsMasked(roomId, deviceId, room.cardsRevealed);
  const buffer = await renderToBuffer(buildRetroReport(room.name, cards));

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="retrospective-${roomId}.pdf"`,
    },
  });
}
