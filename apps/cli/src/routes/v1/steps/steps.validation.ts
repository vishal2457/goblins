import { z } from "zod";

export const stepIdParamSchema = z.object({
  id: z.enum(["todo", "inprogress", "done", "failed"]),
});

export const stepListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});

export const createStepSchema = z.object({
  projectId: z.string().uuid(),
  name: z.string().trim().min(1).max(255),
  instructions: z.string().trim().min(1),
  position: z.number().int().min(0),
  isTerminal: z.boolean().optional(),
  color: z.enum(["slate", "blue", "amber", "green", "red"]).optional(),
});

export const updateStepSchema = createStepSchema.partial().refine(
  (data) => Object.keys(data).length > 0,
  { message: "At least one field is required" },
);
