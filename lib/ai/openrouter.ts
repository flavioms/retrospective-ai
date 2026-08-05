import "server-only";

export type ChatMessage = { role: "system" | "user"; content: string };

function getModels(): string[] {
  const raw = process.env.OPENROUTER_MODELS ?? "";
  return raw
    .split(",")
    .map((m) => m.trim())
    .filter(Boolean);
}

/**
 * Calls OpenRouter's chat completions endpoint, trying each configured free
 * model in order until one responds — free-tier models are occasionally
 * rate-limited or temporarily unavailable, so a single hardcoded model would
 * make this feature flaky.
 */
export async function chatCompletion(messages: ChatMessage[]): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not configured");
  }
  const models = getModels();
  if (models.length === 0) {
    throw new Error("OPENROUTER_MODELS is not configured");
  }

  let lastError: unknown;
  for (const model of models) {
    try {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://github.com/",
          "X-Title": "AI Retrospective",
        },
        body: JSON.stringify({ model, messages }),
      });

      if (!response.ok) {
        lastError = new Error(`OpenRouter ${model} responded ${response.status}`);
        continue;
      }

      const data = await response.json();
      const content = data?.choices?.[0]?.message?.content;
      if (typeof content !== "string" || !content.trim()) {
        lastError = new Error(`OpenRouter ${model} returned an empty response`);
        continue;
      }
      return content;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error ? lastError : new Error("All OpenRouter models failed");
}
