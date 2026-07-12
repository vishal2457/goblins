import { apiPaths } from "../../client/api-paths.js";
import type { RegisterTools } from "../../tools/register.js";
import { withApiErrors } from "../../tools/register.js";
import { paginationSchema, uuidSchema } from "../../tools/schemas.js";
import { z } from "zod";

export const registerProjectTools: RegisterTools = (server, client) => {
  server.registerTool(
    "projects_list",
    {
      title: "List projects",
      description: "List Goblins projects with pagination.",
      inputSchema: paginationSchema,
    },
    withApiErrors((args) =>
      client.request(apiPaths.projects, {
        query: args,
      }),
    ),
  );

  server.registerTool(
    "projects_get",
    {
      title: "Get project",
      description: "Get one Goblins project by ID.",
      inputSchema: {
        id: uuidSchema,
      },
    },
    withApiErrors((args) => client.request(apiPaths.projectById(args.id))),
  );

  server.registerTool(
    "projects_add",
    {
      title: "Add project",
      description: "Register the agent's current project with Goblins. Use the absolute project directory as location when it is not returned by projects_list.",
      inputSchema: {
        name: z.string().trim().min(1).max(255),
        location: z.string().trim().min(1),
        description: z.string().trim().nullable().optional(),
      },
    },
    withApiErrors((args) =>
      client.request(apiPaths.projects, {
        method: "POST",
        body: args,
      }),
    ),
  );

  server.registerTool(
    "projects_update",
    {
      title: "Update project",
      description: "Update a Goblins project by ID.",
      inputSchema: {
        id: uuidSchema,
        name: z.string().trim().min(1).max(255).optional(),
        description: z.string().trim().nullable().optional(),
      },
    },
    withApiErrors(({ id, ...body }) =>
      client.request(apiPaths.projectById(id), {
        method: "PATCH",
        body,
      }),
    ),
  );

  server.registerTool(
    "projects_delete",
    {
      title: "Delete project",
      description: "Delete a Goblins project by ID.",
      inputSchema: {
        id: uuidSchema,
      },
    },
    withApiErrors((args) =>
      client.request(apiPaths.projectById(args.id), {
        method: "DELETE",
      }),
    ),
  );

  server.registerTool(
    "project_modules_list",
    {
      title: "List project modules",
      description: "List modules for a project.",
      inputSchema: {
        projectId: uuidSchema,
      },
    },
    withApiErrors((args) =>
      client.request(apiPaths.projectModules(args.projectId)),
    ),
  );

  server.registerTool(
    "project_agents_discover",
    {
      title: "Discover project agents",
      description: "Discover configured coding agents for a project.",
      inputSchema: {
        projectId: uuidSchema,
      },
    },
    withApiErrors((args) =>
      client.request(apiPaths.projectAgents(args.projectId)),
    ),
  );

  server.registerTool(
    "project_agent_instructions_update",
    {
      title: "Update project agent instructions",
      description: "Update instructions for a discovered project agent.",
      inputSchema: {
        projectId: uuidSchema,
        agentId: z.string().min(1),
        instructions: z.string().trim().min(1),
      },
    },
    withApiErrors(({ projectId, ...body }) =>
      client.request(apiPaths.projectAgentInstructions(projectId), {
        method: "PUT",
        body,
      }),
    ),
  );
};
