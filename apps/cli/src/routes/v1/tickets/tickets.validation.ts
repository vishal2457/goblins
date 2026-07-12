import { z } from "zod";

export const ticketIdParamSchema = z.object({
  id: z.string().uuid(),
});

export const ticketListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});

export const createTicketSchema = z.object({
  goalId: z.string().uuid(),
  moduleId: z.string().trim().min(1).max(255),
  currentStepId: z.string().uuid().nullable().optional(),
  title: z.string().trim().min(1).max(255),
  shortDescription: z.string().trim().max(1000).optional(),
  description: z.string().trim().optional(),
  type: z
    .enum([
      "research",
      "test",
      "implementation",
      "refactor",
      "integration",
      "verification",
      "documentation",
    ])
    .optional(),
  status: z
    .enum([
      "backlog",
      "ready",
      "blocked",
      "in_progress",
      "review",
      "failed",
      "completed",
      "cancelled",
    ])
    .optional(),
  priority: z.enum(["low", "medium", "high", "critical"]).optional(),
  retryCount: z.number().int().min(0).optional(),
  maximumRetries: z.number().int().min(0).optional(),
  assignedSubagentName: z.string().trim().min(1).max(255).nullable().optional(),
  subagentStatus: z
    .enum(["analysing", "executing", "verifying", "done"])
    .nullable()
    .optional(),
  subagentStatusUpdatedAt: z.string().datetime().nullable().optional(),
  lastActivityAt: z.string().datetime().nullable().optional(),
  lastActivityByAgentName: z
    .string()
    .trim()
    .min(1)
    .max(255)
    .nullable()
    .optional(),
  activityAuthorName: z.string().trim().min(1).max(255).nullable().optional(),
  worktreePath: z.string().trim().nullable().optional(),
  branchName: z.string().trim().nullable().optional(),
  startedAt: z.string().datetime().nullable().optional(),
  completedAt: z.string().datetime().nullable().optional(),
  dependsOnTicketIds: z.array(z.string().uuid()).optional(),
  items: z
    .array(
      z.object({
        kind: z.enum([
          "acceptance_criterion",
          "technical_note",
          "relevant_file",
          "test_plan_item",
          "verification_command",
        ]),
        value: z.string().trim().min(1),
      }),
    )
    .optional(),
});

export const updateTicketSchema = createTicketSchema
  .omit({ dependsOnTicketIds: true, items: true })
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field is required",
  });

export const reportTicketSchema = z.object({
  status: z.enum(["completed", "failed", "blocked"]),
  summary: z.string().trim().optional(),
  evidence: z.array(z.string().trim().min(1)).optional(),
  activityAuthorName: z.string().trim().min(1).max(255).nullable().optional(),
});

export const appendTicketFileSchema = z.object({
  path: z.string().trim().min(1).max(2000),
});
