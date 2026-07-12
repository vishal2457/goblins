import { z } from "zod";
import { apiPaths } from "../../client/api-paths.js";
import type { RegisterTools } from "../../tools/register.js";
import { withApiErrors } from "../../tools/register.js";
import {
  paginationSchema,
  ticketPrioritySchema,
  ticketSubagentStatusSchema,
  ticketStatusSchema,
  ticketTypeSchema,
  uuidSchema,
} from "../../tools/schemas.js";

export const registerTicketTools: RegisterTools = (server, client) => {
  server.registerTool(
    "tickets_list",
    {
      title: "List tickets",
      description: "List Goblins tickets with pagination.",
      inputSchema: paginationSchema,
    },
    withApiErrors((args) =>
      client.request(apiPaths.tickets, {
        query: args,
      }),
    ),
  );

  server.registerTool(
    "tickets_get",
    {
      title: "Get ticket",
      description: "Get one Goblins ticket by ID.",
      inputSchema: {
        id: uuidSchema,
      },
    },
    withApiErrors((args) => client.request(apiPaths.ticketById(args.id))),
  );

  server.registerTool(
    "tickets_create",
    {
      title: "Create ticket",
      description: "Create a Goblins ticket.",
      inputSchema: {
        goalId: uuidSchema,
        moduleId: z.string().trim().min(1).max(255),
        currentStepId: uuidSchema.nullable().optional(),
        title: z.string().trim().min(1).max(255),
        shortDescription: z.string().trim().max(1000).optional(),
        description: z.string().trim().optional(),
        type: ticketTypeSchema.optional(),
        status: ticketStatusSchema.optional(),
        priority: ticketPrioritySchema.optional(),
        retryCount: z.number().int().min(0).optional(),
        maximumRetries: z.number().int().min(0).optional(),
        assignedSubagentName: z
          .string()
          .trim()
          .min(1)
          .max(255)
          .nullable()
          .optional(),
        subagentStatus: ticketSubagentStatusSchema.nullable().optional(),
        subagentStatusUpdatedAt: z.string().datetime().nullable().optional(),
        lastActivityAt: z.string().datetime().nullable().optional(),
        lastActivityByAgentName: z
          .string()
          .trim()
          .min(1)
          .max(255)
          .nullable()
          .optional(),
        activityAuthorName: z
          .string()
          .trim()
          .min(1)
          .max(255)
          .nullable()
          .optional(),
        worktreePath: z.string().trim().nullable().optional(),
        branchName: z.string().trim().nullable().optional(),
        startedAt: z.string().datetime().nullable().optional(),
        completedAt: z.string().datetime().nullable().optional(),
        dependsOnTicketIds: z.array(uuidSchema).optional(),
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
      },
    },
    withApiErrors((args) =>
      client.request(apiPaths.tickets, {
        method: "POST",
        body: args,
      }),
    ),
  );

  server.registerTool(
    "tickets_update",
    {
      title: "Update ticket",
      description: "Update a Goblins ticket by ID.",
      inputSchema: {
        id: uuidSchema,
        goalId: uuidSchema.optional(),
        moduleId: z.string().trim().min(1).max(255).optional(),
        currentStepId: uuidSchema.nullable().optional(),
        title: z.string().trim().min(1).max(255).optional(),
        shortDescription: z.string().trim().max(1000).optional(),
        description: z.string().trim().optional(),
        type: ticketTypeSchema.optional(),
        status: ticketStatusSchema.optional(),
        priority: ticketPrioritySchema.optional(),
        retryCount: z.number().int().min(0).optional(),
        maximumRetries: z.number().int().min(0).optional(),
        assignedSubagentName: z
          .string()
          .trim()
          .min(1)
          .max(255)
          .nullable()
          .optional(),
        subagentStatus: ticketSubagentStatusSchema.nullable().optional(),
        subagentStatusUpdatedAt: z.string().datetime().nullable().optional(),
        lastActivityAt: z.string().datetime().nullable().optional(),
        lastActivityByAgentName: z
          .string()
          .trim()
          .min(1)
          .max(255)
          .nullable()
          .optional(),
        activityAuthorName: z
          .string()
          .trim()
          .min(1)
          .max(255)
          .nullable()
          .optional(),
        worktreePath: z.string().trim().nullable().optional(),
        branchName: z.string().trim().nullable().optional(),
        startedAt: z.string().datetime().nullable().optional(),
        completedAt: z.string().datetime().nullable().optional(),
      },
    },
    withApiErrors(({ id, ...body }) =>
      client.request(apiPaths.ticketById(id), {
        method: "PATCH",
        body,
      }),
    ),
  );

  server.registerTool(
    "tickets_delete",
    {
      title: "Delete ticket",
      description: "Delete a Goblins ticket by ID.",
      inputSchema: {
        id: uuidSchema,
      },
    },
    withApiErrors((args) =>
      client.request(apiPaths.ticketById(args.id), {
        method: "DELETE",
      }),
    ),
  );

  server.registerTool(
    "tickets_append_file",
    {
      title: "Append ticket file",
      description: "Append a relevant file path to a ticket.",
      inputSchema: {
        id: uuidSchema,
        path: z.string().trim().min(1).max(2000),
      },
    },
    withApiErrors(({ id, ...body }) =>
      client.request(apiPaths.ticketFiles(id), {
        method: "POST",
        body,
      }),
    ),
  );

  server.registerTool(
    "tickets_report",
    {
      title: "Report ticket result",
      description: "Report ticket completion, failure, or blockage.",
      inputSchema: {
        id: uuidSchema,
        status: z.enum(["completed", "failed", "blocked"]),
        summary: z.string().trim().optional(),
        evidence: z.array(z.string().trim().min(1)).optional(),
        activityAuthorName: z
          .string()
          .trim()
          .min(1)
          .max(255)
          .nullable()
          .optional(),
      },
    },
    withApiErrors(({ id, ...body }) =>
      client.request(apiPaths.ticketReport(id), {
        method: "POST",
        body,
      }),
    ),
  );

  server.registerTool(
    "module_tickets_list",
    {
      title: "List module tickets",
      description: "List tickets for a module.",
      inputSchema: {
        moduleId: z.string().trim().min(1).max(255),
      },
    },
    withApiErrors((args) =>
      client.request(apiPaths.moduleTickets(args.moduleId)),
    ),
  );

  server.registerTool(
    "ticket_comments_list",
    {
      title: "List ticket comments",
      description: "List comments for a ticket with pagination.",
      inputSchema: {
        ticketId: uuidSchema,
        page: paginationSchema.page,
        limit: z.number().int().min(1).max(100).default(50),
      },
    },
    withApiErrors(({ ticketId, page, limit }) =>
      client.request(apiPaths.ticketComments(ticketId), {
        query: { page, limit },
      }),
    ),
  );

  server.registerTool(
    "ticket_comments_create",
    {
      title: "Create ticket comment",
      description: "Create a comment for a ticket.",
      inputSchema: {
        ticketId: uuidSchema,
        body: z.string().trim().min(1).max(10_000),
        authorName: z.string().trim().min(1).max(255).nullable().optional(),
        kind: z.enum(["note", "question", "decision", "blocker"]).optional(),
      },
    },
    withApiErrors(({ ticketId, ...body }) =>
      client.request(apiPaths.ticketComments(ticketId), {
        method: "POST",
        body,
      }),
    ),
  );

  server.registerTool(
    "ticket_comments_get",
    {
      title: "Get ticket comment",
      description: "Get one ticket comment by ID.",
      inputSchema: {
        ticketId: uuidSchema,
        commentId: uuidSchema,
      },
    },
    withApiErrors((args) =>
      client.request(apiPaths.ticketCommentById(args.ticketId, args.commentId)),
    ),
  );
};
