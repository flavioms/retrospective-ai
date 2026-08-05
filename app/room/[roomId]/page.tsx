import { notFound } from "next/navigation";
import { getRoom } from "@/lib/db/rooms";
import { getParticipant } from "@/lib/db/participants";
import { listCardsMasked } from "@/lib/db/cards";
import { getDeviceId } from "@/lib/identity/device";
import { JoinRoomForm } from "@/components/board/join-room-form";
import { Board } from "@/components/board/board";

export default async function RoomPage({ params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = await params;

  const room = await getRoom(roomId);
  if (!room) notFound();

  const deviceId = await getDeviceId();
  const participant = deviceId ? await getParticipant(roomId, deviceId) : null;

  if (!participant) {
    return <JoinRoomForm roomId={roomId} />;
  }

  const cards = await listCardsMasked(roomId, participant.deviceId, room.cardsRevealed);

  return (
    <Board
      roomId={roomId}
      revealed={room.cardsRevealed}
      displayName={participant.displayName}
      cards={cards}
    />
  );
}
