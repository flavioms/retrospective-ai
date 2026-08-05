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

  const failures: string[] = [];
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
        const body = await response.text();
        failures.push(`${model}: HTTP ${response.status} — ${body.slice(0, 300)}`);
        continue;
      }

      const data = await response.json();
      const content = data?.choices?.[0]?.message?.content;
      if (typeof content !== "string" || !content.trim()) {
        failures.push(`${model}: empty response`);
        continue;
      }
      return content;
    } catch (error) {
      failures.push(`${model}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  throw new Error(`All OpenRouter models failed:\n${failures.join("\n")}`);
}
