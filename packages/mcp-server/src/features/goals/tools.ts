import { z } from "zod";
import { apiPaths } from "../../client/api-paths.js";
import type { RegisterTools } from "../../tools/register.js";
import { withApiErrors } from "../../tools/register.js";
import {
  goalPhaseSchema,
  goalStatusSchema,
  paginationSchema,
  uuidSchema,
} from "../../tools/schemas.js";

export const registerGoalTools: RegisterTools = (server, client) => {
  server.registerTool(
    "goals_list",
    {
      title: "List goals",
      description: "List Goblins goals with pagination.",
      inputSchema: paginationSchema,
    },
    withApiErrors((args) =>
      client.request(apiPaths.goals, {
        query: args,
      }),
    ),
  );

  server.registerTool(
    "goals_get",
    {
      title: "Get goal",
      description: "Get one Goblins goal by ID.",
      inputSchema: {
        id: uuidSchema,
      },
    },
    withApiErrors((args) => client.request(apiPaths.goalById(args.id))),
  );

  server.registerTool(
    "goals_create",
    {
      title: "Create goal",
      description: "Create a Goblins goal.",
      inputSchema: {
        projectId: uuidSchema,
        title: z.string().trim().min(1).max(255),
        description: z.string().trim().optional(),
        status: goalStatusSchema.optional(),
        phases: z.array(goalPhaseSchema).min(2).max(3).optional(),
        technicalInstructions: z.string().trim().nullable().optional(),
        maxRetries: z.number().int().min(0).optional(),
        lastError: z.record(z.unknown()).nullable().optional(),
        startedAt: z.string().datetime().nullable().optional(),
        completedAt: z.string().datetime().nullable().optional(),
      },
    },
    withApiErrors((args) =>
      client.request(apiPaths.goals, {
        method: "POST",
        body: args,
      }),
    ),
  );

  server.registerTool(
    "goals_update",
    {
      title: "Update goal",
      description: "Update a Goblins goal by ID.",
      inputSchema: {
        id: uuidSchema,
        projectId: uuidSchema.optional(),
        title: z.string().trim().min(1).max(255).optional(),
        description: z.string().trim().optional(),
        status: goalStatusSchema.optional(),
        phases: z.array(goalPhaseSchema).min(2).max(3).optional(),
        technicalInstructions: z.string().trim().nullable().optional(),
        maxRetries: z.number().int().min(0).optional(),
        lastError: z.record(z.unknown()).nullable().optional(),
        startedAt: z.string().datetime().nullable().optional(),
        completedAt: z.string().datetime().nullable().optional(),
      },
    },
    withApiErrors(({ id, ...body }) =>
      client.request(apiPaths.goalById(id), {
        method: "PATCH",
        body,
      }),
    ),
  );

  server.registerTool(
    "goals_delete",
    {
      title: "Delete goal",
      description: "Delete a Goblins goal by ID.",
      inputSchema: {
        id: uuidSchema,
      },
    },
    withApiErrors((args) =>
      client.request(apiPaths.goalById(args.id), {
        method: "DELETE",
      }),
    ),
  );

  server.registerTool(
    "goal_tickets_snapshot",
    {
      title: "Get goal tickets snapshot",
      description: "Get a goal-level snapshot of associated tickets.",
      inputSchema: {
        id: uuidSchema,
      },
    },
    withApiErrors((args) =>
      client.request(apiPaths.goalTicketsSnapshot(args.id)),
    ),
  );

  server.registerTool(
    "goal_overview_get",
    {
      title: "Get goal overview",
      description:
        "Get compact retrospective analysis context for a Goblins goal.",
      inputSchema: {
        id: uuidSchema,
      },
    },
    withApiErrors((args) => client.request(apiPaths.goalOverview(args.id))),
  );

  server.registerTool(
    "goal_retrospective_analyse",
    {
      title: "Analyse goal retrospective",
      description:
        "Create instruction-only workflow/subagent improvement proposals for a goal.",
      inputSchema: {
        id: uuidSchema,
        userPoints: z.string().trim().max(4000).optional(),
      },
    },
    withApiErrors(({ id, ...body }) =>
      client.request(apiPaths.goalRetrospectiveAnalyse(id), {
        method: "POST",
        body,
      }),
    ),
  );

  server.registerTool(
    "goal_improvements_list",
    {
      title: "List goal improvements",
      description:
        "List retrospective observations and instruction improvement proposals for a goal.",
      inputSchema: {
        id: uuidSchema,
      },
    },
    withApiErrors((args) => client.request(apiPaths.goalImprovements(args.id))),
  );

  server.registerTool(
    "goal_improvement_approve",
    {
      title: "Approve goal improvement",
      description:
        "Approve an instruction improvement proposal, optionally replacing the proposed instruction text.",
      inputSchema: {
        id: uuidSchema,
        proposalId: uuidSchema,
        proposedInstructions: z.string().trim().min(1).max(100_000).optional(),
      },
    },
    withApiErrors(({ id, proposalId, ...body }) =>
      client.request(apiPaths.goalImprovementApprove(id, proposalId), {
        method: "POST",
        body,
      }),
    ),
  );

  server.registerTool(
    "goal_improvement_reject",
    {
      title: "Reject goal improvement",
      description: "Reject an instruction improvement proposal.",
      inputSchema: {
        id: uuidSchema,
        proposalId: uuidSchema,
        reason: z.string().trim().max(4000).optional(),
      },
    },
    withApiErrors(({ id, proposalId, ...body }) =>
      client.request(apiPaths.goalImprovementReject(id, proposalId), {
        method: "POST",
        body,
      }),
    ),
  );

  server.registerTool(
    "goal_improvement_apply",
    {
      title: "Apply goal improvement",
      description:
        "Apply an approved workflow or subagent instruction improvement through the existing edit path.",
      inputSchema: {
        id: uuidSchema,
        proposalId: uuidSchema,
      },
    },
    withApiErrors(({ id, proposalId }) =>
      client.request(apiPaths.goalImprovementApply(id, proposalId), {
        method: "POST",
      }),
    ),
  );

  server.registerTool(
    "goal_planning_start",
    {
      title: "Start goal planning",
      description: "Transition a goal into planning.",
      inputSchema: {
        id: uuidSchema,
      },
    },
    withApiErrors((args) =>
      client.request(apiPaths.goalPlanningStart(args.id), {
        method: "POST",
      }),
    ),
  );

  server.registerTool(
    "goal_planning_complete",
    {
      title: "Complete goal planning",
      description: "Mark goal planning as complete.",
      inputSchema: {
        id: uuidSchema,
      },
    },
    withApiErrors((args) =>
      client.request(apiPaths.goalPlanningComplete(args.id), {
        method: "POST",
      }),
    ),
  );

  server.registerTool(
    "goal_execution_start",
    {
      title: "Start goal execution",
      description: "Transition a goal into execution.",
      inputSchema: {
        id: uuidSchema,
      },
    },
    withApiErrors((args) =>
      client.request(apiPaths.goalExecutionStart(args.id), {
        method: "POST",
      }),
    ),
  );

  server.registerTool(
    "goal_retrospective_start",
    {
      title: "Start goal retrospective",
      description: "Transition a goal into retrospective.",
      inputSchema: {
        id: uuidSchema,
        userPoints: z.string().trim().max(4000).optional(),
      },
    },
    withApiErrors(({ id, ...body }) =>
      client.request(apiPaths.goalRetrospectiveStart(id), {
        method: "POST",
        body,
      }),
    ),
  );

  server.registerTool(
    "goal_retrospective_complete",
    {
      title: "Complete goal retrospective",
      description: "Mark goal retrospective as complete.",
      inputSchema: {
        id: uuidSchema,
      },
    },
    withApiErrors((args) =>
      client.request(apiPaths.goalRetrospectiveComplete(args.id), {
        method: "POST",
      }),
    ),
  );
};
