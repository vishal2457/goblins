import { z } from "zod";

export const workflowPresetIdParamSchema = z.object({
  id: z.string().min(1),
});

export const updateWorkflowSchema = z.object({
  content: z.string().trim().min(1),
});
