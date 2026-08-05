import "server-only";
import type { z } from "zod";
import { chatCompletion, type ChatMessage } from "./openrouter";

function extractJson(raw: string): string {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  return fenced ? fenced[1] : raw;
}

function tryParse(raw: string): unknown {
  try {
    return JSON.parse(extractJson(raw));
  } catch {
    return null;
  }
}

/**
 * Runs a JSON-prompt chat completion and validates the result against
 * `schema`, with one retry that shows the model its own malformed output and
 * asks it to correct it — free models are less reliable than GPT-4-class
 * models at strictly following a "JSON only" instruction on the first try.
 */
export async function generateJson<T>(schema: z.ZodType<T>, messages: ChatMessage[]): Promise<T> {
  const first = await chatCompletion(messages);
  const firstParsed = tryParse(first);
  if (firstParsed !== null) {
    const result = schema.safeParse(firstParsed);
    if (result.success) return result.data;
  }

  const repairMessages: ChatMessage[] = [
    ...messages,
    {
      role: "user",
      content: `Your previous response was not valid JSON matching output_schema. Previous response:\n${first}\n\nRespond again with ONLY valid JSON matching output_schema.`,
    },
  ];
  const second = await chatCompletion(repairMessages);
  return schema.parse(tryParse(second));
}
