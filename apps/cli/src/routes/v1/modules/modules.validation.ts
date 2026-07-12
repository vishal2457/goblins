import { z } from "zod";

export const moduleIdParamSchema = z.object({
  id: z.string().trim().min(1).max(255),
});
