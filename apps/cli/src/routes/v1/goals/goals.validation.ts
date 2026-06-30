import { z } from "zod";

const goalPhaseSchema = z.object({
  id: z.enum(["planning", "execution", "retrospective"]),
  status: z.enum(["pending", "in_progress", "paused", "completed", "failed", "cancelled"]),
  position: z.number().int().min(0).max(2),
  startedAt: z.string().datetime().optional(),
  completedAt: z.string().datetime().optional(),
});

export const goalIdParamSchema = z.object({
  id: z.string().uuid(),
});

export const goalListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});

export const createGoalSchema = z.object({
  projectId: z.string().uuid(),
  title: z.string().trim().min(1).max(255),
  description: z.string().trim().optional(),
  status: z
    .enum([
      "draft",
      "planning",
      "ready",
      "running",
      "paused",
      "blocked",
      "verifying",
      "retrospective",
      "completed",
      "failed",
      "cancelled",
    ])
    .optional(),
  phases: z.array(goalPhaseSchema).min(2).max(3).optional(),
  technicalInstructions: z.string().trim().nullable().optional(),
  maxRetries: z.number().int().min(0).optional(),
  lastError: z.record(z.unknown()).nullable().optional(),
  startedAt: z.string().datetime().nullable().optional(),
  completedAt: z.string().datetime().nullable().optional(),
});

export const updateGoalSchema = createGoalSchema.partial().refine(
  (data) => Object.keys(data).length > 0,
  { message: "At least one field is required" },
);

export const startRetrospectiveSchema = z.object({
  userPoints: z.string().trim().max(4000).optional(),
});
