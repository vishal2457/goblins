import { z } from "zod";

export const updateWorkflowSchema = z.object({
  content: z.string().trim().min(1),
});
