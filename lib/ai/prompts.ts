import type { ChatMessage } from "./openrouter";

const SYSTEM_MESSAGE: ChatMessage = {
  role: "system",
  content: "You output only valid JSON. Never wrap output in markdown code fences.",
};

const COMMON_INSTRUCTIONS = [
  "Respond in the same language the input text is written in — never translate into another language, regardless of what language these instructions are in.",
  "Respond with ONLY a JSON object matching output_schema — no markdown, no commentary, no code fences.",
];

export function buildActionItemsPrompt(toImproveTexts: string[]): ChatMessage[] {
  const prompt = {
    role: "agile retrospective facilitator assistant",
    task: "Convert 'To Improve' retrospective notes into concrete, actionable Action Items.",
    instructions: [
      "Each suggestion must be a single, concrete, actionable step a team could realistically commit to.",
      "Prefer specific, verifiable actions over vague intentions — e.g. 'Add a pre-deploy checklist covering DB migrations' rather than 'Improve deployment process'.",
      "Merge duplicate or closely related notes into one suggestion instead of repeating them.",
      "Produce at most 8 suggestions.",
      ...COMMON_INSTRUCTIONS,
    ],
    input: { to_improve_notes: toImproveTexts },
    output_schema: { suggestions: [{ text: "string" }] },
  };
  return [SYSTEM_MESSAGE, { role: "user", content: JSON.stringify(prompt) }];
}

export function buildIdeaHelperPrompt(roughNote: string): ChatMessage[] {
  const prompt = {
    role: "supportive writing assistant for a team retrospective",
    task: "Rewrite a rough, informal note into a clear, constructive, well-formatted retrospective card.",
    instructions: [
      "Preserve the original meaning and substance, including legitimate criticism — phrase it constructively and professionally, don't soften it into vagueness.",
      "Keep it concise: one to three sentences.",
      ...COMMON_INSTRUCTIONS,
    ],
    input: { rough_note: roughNote },
    output_schema: { text: "string" },
  };
  return [SYSTEM_MESSAGE, { role: "user", content: JSON.stringify(prompt) }];
}
