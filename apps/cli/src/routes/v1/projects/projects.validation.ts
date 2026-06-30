import { z } from "zod";

export const projectIdParamSchema = z.object({
  id: z.string().uuid(),
});

export const projectListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});

export const createProjectSchema = z.object({
  name: z.string().trim().min(1).max(255),
  location: z.string().trim().min(1),
  description: z.string().trim().nullable().optional(),
  baseBranch: z.string().trim().min(1).optional(),
  executionMode: z.enum(["direct", "worktree"]).optional(),
  testCommand: z.string().trim().nullable().optional(),
  lintCommand: z.string().trim().nullable().optional(),
  typeCheckCommand: z.string().trim().nullable().optional(),
  buildCommand: z.string().trim().nullable().optional(),
});

export const updateProjectSchema = createProjectSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field is required",
  });

export const updateDiscoveredAgentInstructionsSchema = z.object({
  agentId: z.string().min(1),
  instructions: z.string().trim().min(1),
});
