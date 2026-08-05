import { z } from "zod";

// Schema is deliberately a little more permissive than the prompt's "at most
// 8, one to three sentences" instructions — free models occasionally
// overshoot slightly, and failing validation on a near-miss just wastes a
// repair-retry round trip. Length caps here are a sanity bound, not the
// primary defense; card text is also capped at persistence time.
export const actionItemsSchema = z.object({
  suggestions: z.array(z.string().min(1).max(500)).max(10),
});
export type ActionItemsResult = z.infer<typeof actionItemsSchema>;

export const ideaHelperSchema = z.object({
  text: z.string().min(1).max(1000),
});
export type IdeaHelperResult = z.infer<typeof ideaHelperSchema>;
