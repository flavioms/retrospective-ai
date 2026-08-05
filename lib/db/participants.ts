import "server-only";
import { queryOne } from "./client";

export type Participant = {
  id: string;
  roomId: string;
  deviceId: string;
  displayName: string;
};

type ParticipantRow = {
  id: string;
  room_id: string;
  device_id: string;
  display_name: string;
};

function mapParticipant(row: ParticipantRow): Participant {
  return {
    id: row.id,
    roomId: row.room_id,
    deviceId: row.device_id,
    displayName: row.display_name,
  };
}

export async function getParticipant(
  roomId: string,
  deviceId: string,
): Promise<Participant | null> {
  const row = await queryOne<ParticipantRow>(
    `select * from participants where room_id = $1 and device_id = $2`,
    [roomId, deviceId],
  );
  return row ? mapParticipant(row) : null;
}

export async function upsertParticipant(
  roomId: string,
  deviceId: string,
  displayName: string,
): Promise<Participant> {
  const row = await queryOne<ParticipantRow>(
    `insert into participants (room_id, device_id, display_name)
     values ($1, $2, $3)
     on conflict (room_id, device_id) do update set display_name = excluded.display_name
     returning *`,
    [roomId, deviceId, displayName],
  );
  return mapParticipant(row as ParticipantRow);
}
