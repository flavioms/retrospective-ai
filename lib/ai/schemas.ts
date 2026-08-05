import { z } from "zod";

export const actionItemsSchema = z.object({
  suggestions: z.array(z.object({ text: z.string().min(1) })).max(10),
});
export type ActionItemsResult = z.infer<typeof actionItemsSchema>;

export const ideaHelperSchema = z.object({
  text: z.string().min(1),
});
export type IdeaHelperResult = z.infer<typeof ideaHelperSchema>;
