import { z } from "zod";

export const moduleIdParamSchema = z.object({
  id: z.string().uuid(),
});

export const createModuleSchema = z.object({
  name: z.string().trim().min(1).max(255),
  shortDescription: z.string().trim().max(1000).optional(),
});
