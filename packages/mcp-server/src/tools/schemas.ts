import { z } from "zod";

export const uuidSchema = z.string().uuid();

export const paginationSchema = {
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(25),
};

export const emptyInputSchema = {};

export const nullableStringSchema = z.string().nullable();

export const goalPhaseSchema = z.object({
  id: z.enum(["planning", "execution", "retrospective"]),
  status: z.enum([
    "pending",
    "in_progress",
    "paused",
    "completed",
    "failed",
    "cancelled",
  ]),
  position: z.number().int().min(0).max(2),
  startedAt: z.string().datetime().optional(),
  completedAt: z.string().datetime().optional(),
});

export const goalStatusSchema = z.enum([
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
]);

export const ticketTypeSchema = z.enum([
  "research",
  "test",
  "implementation",
  "refactor",
  "integration",
  "verification",
  "documentation",
]);

export const ticketStatusSchema = z.enum([
  "backlog",
  "ready",
  "blocked",
  "in_progress",
  "review",
  "failed",
  "completed",
  "cancelled",
]);

export const ticketPrioritySchema = z.enum([
  "low",
  "medium",
  "high",
  "critical",
]);
