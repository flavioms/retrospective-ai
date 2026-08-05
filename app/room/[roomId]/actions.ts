"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { getOrCreateDeviceId } from "@/lib/identity/device";
import { getParticipant, upsertParticipant } from "@/lib/db/participants";
import { touchRoom, revealRoom } from "@/lib/db/rooms";
import {
  createCard,
  updateCardText,
  deleteCard,
  moveCard,
  listCardTexts,
  type ColumnId,
} from "@/lib/db/cards";
import { toggleReaction } from "@/lib/db/reactions";
import { REACTION_EMOJIS } from "@/lib/cards";
import { broadcastRoomChanged } from "@/lib/supabase/broadcast";
import { generateJson } from "@/lib/ai/generate";
import { buildActionItemsPrompt, buildIdeaHelperPrompt } from "@/lib/ai/prompts";
import { actionItemsSchema, ideaHelperSchema } from "@/lib/ai/schemas";

async function afterMutation(roomId: string) {
  await touchRoom(roomId);
  await broadcastRoomChanged(roomId);
  revalidatePath(`/room/${roomId}`);
}

export async function joinRoomAction(roomId: string, formData: FormData): Promise<void> {
  const displayName = String(formData.get("displayName") ?? "").trim();
  if (!displayName) return;

  const deviceId = await getOrCreateDeviceId();
  await upsertParticipant(roomId, deviceId, displayName.slice(0, 60));
  revalidatePath(`/room/${roomId}`);
}

export async function createCardAction(
  roomId: string,
  column: ColumnId,
  formData: FormData,
): Promise<void> {
  const text = String(formData.get("text") ?? "").trim();
  if (!text) return;

  const deviceId = await getOrCreateDeviceId();
  const participant = await getParticipant(roomId, deviceId);
  if (!participant) return;

  await createCard(roomId, column, text.slice(0, 2000), deviceId, participant.displayName);
  await afterMutation(roomId);
}

export async function updateCardAction(
  roomId: string,
  cardId: string,
  text: string,
): Promise<void> {
  const trimmed = text.trim();
  if (!trimmed) return;

  const deviceId = await getOrCreateDeviceId();
  await updateCardText(cardId, deviceId, trimmed.slice(0, 2000));
  await afterMutation(roomId);
}

export async function deleteCardAction(roomId: string, cardId: string): Promise<void> {
  const deviceId = await getOrCreateDeviceId();
  await deleteCard(cardId, deviceId);
  await afterMutation(roomId);
}

export async function moveCardAction(
  roomId: string,
  cardId: string,
  toColumn: ColumnId,
  prevCardId: string | null,
  nextCardId: string | null,
): Promise<void> {
  await moveCard(cardId, toColumn, prevCardId, nextCardId);
  await afterMutation(roomId);
}

export async function toggleReactionAction(
  roomId: string,
  cardId: string,
  emoji: string,
): Promise<void> {
  if (!(REACTION_EMOJIS as readonly string[]).includes(emoji)) return;

  const deviceId = await getOrCreateDeviceId();
  await toggleReaction(cardId, deviceId, emoji);
  await afterMutation(roomId);
}

export async function revealRoomAction(roomId: string): Promise<void> {
  await revealRoom(roomId);
  await broadcastRoomChanged(roomId);
  revalidatePath(`/room/${roomId}`);
}

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function generateActionItemsAction(roomId: string): Promise<ActionResult> {
  const t = await getTranslations("errors");
  const deviceId = await getOrCreateDeviceId();
  const participant = await getParticipant(roomId, deviceId);
  if (!participant) return { ok: false, error: t("joinFirst") };

  const notes = await listCardTexts(roomId, "to_improve");
  if (notes.length === 0) {
    return { ok: false, error: t("noToImproveCards") };
  }

  try {
    const { suggestions } = await generateJson(actionItemsSchema, buildActionItemsPrompt(notes));
    for (const suggestion of suggestions) {
      await createCard(
        roomId,
        "action_items",
        suggestion.text.slice(0, 2000),
        deviceId,
        participant.displayName,
        true,
      );
    }
    await afterMutation(roomId);
    return { ok: true };
  } catch (error) {
    console.error("generateActionItemsAction failed", error);
    return { ok: false, error: t("aiGenerationFailed") };
  }
}

export async function generateIdeaHelperAction(
  roughNote: string,
): Promise<{ ok: true; text: string } | { ok: false; error: string }> {
  const t = await getTranslations("errors");
  const trimmed = roughNote.trim();
  if (!trimmed) return { ok: false, error: t("writeRoughNoteFirst") };

  try {
    const result = await generateJson(ideaHelperSchema, buildIdeaHelperPrompt(trimmed));
    return { ok: true, text: result.text };
  } catch (error) {
    console.error("generateIdeaHelperAction failed", error);
    return { ok: false, error: t("aiRewriteFailed") };
  }
}
