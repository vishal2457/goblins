type Schema = Record<string, unknown>;

const uuid = { type: "string", format: "uuid" };
const dateTime = { type: "string", format: "date-time", nullable: true };
const nullableString = { type: "string", nullable: true };
const ticketSubagentStatus = {
  type: "string",
  enum: ["analysing", "executing", "verifying", "done"],
  nullable: true,
};
const timestamps = {
  createdAt: { type: "string", format: "date-time" },
  updatedAt: { type: "string", format: "date-time" },
};
const pageParameters = [
  {
    name: "page",
    in: "query",
    description: "One-based page number",
    schema: { type: "integer", minimum: 1, default: 1 },
  },
  {
    name: "limit",
    in: "query",
    description: "Number of records per page",
    schema: { type: "integer", minimum: 1, maximum: 100, default: 25 },
  },
];
const idParameter = {
  name: "id",
  in: "path",
  required: true,
  schema: uuid,
};

const projectProperties = {
  name: { type: "string", minLength: 1, maxLength: 255 },
  location: { type: "string", minLength: 1 },
  description: nullableString,
};
const goalStatus = [
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
];
const goalProperties = {
  projectId: uuid,
  title: { type: "string", minLength: 1, maxLength: 255 },
  description: { type: "string", default: "" },
  status: { type: "string", enum: goalStatus, default: "draft" },
  technicalInstructions: nullableString,
  maxRetries: { type: "integer", minimum: 0, default: 3 },
  lastError: { type: "object", additionalProperties: true, nullable: true },
  startedAt: dateTime,
  completedAt: dateTime,
};
const stepProperties = {
  projectId: uuid,
  name: { type: "string", minLength: 1, maxLength: 255 },
  instructions: { type: "string", minLength: 1 },
  position: { type: "integer", minimum: 0 },
  isTerminal: { type: "boolean", default: false },
  color: {
    type: "string",
    enum: ["slate", "blue", "amber", "green", "red"],
    default: "slate",
  },
};
const ticketProperties = {
  goalId: uuid,
  moduleId: uuid,
  currentStepId: { ...uuid, nullable: true },
  title: { type: "string", minLength: 1, maxLength: 255 },
  shortDescription: { type: "string", maxLength: 1000, default: "" },
  description: { type: "string", default: "" },
  type: {
    type: "string",
    enum: [
      "research",
      "test",
      "implementation",
      "refactor",
      "integration",
      "verification",
      "documentation",
    ],
    default: "implementation",
  },
  status: {
    type: "string",
    enum: [
      "backlog",
      "ready",
      "blocked",
      "in_progress",
      "review",
      "failed",
      "completed",
      "cancelled",
    ],
    default: "backlog",
  },
  priority: {
    type: "string",
    enum: ["low", "medium", "high", "critical"],
    default: "medium",
  },
  retryCount: { type: "integer", minimum: 0, default: 0 },
  maximumRetries: { type: "integer", minimum: 0, default: 3 },
  assignedSubagentName: { ...nullableString, maxLength: 255 },
  subagentStatus: ticketSubagentStatus,
  subagentStatusUpdatedAt: dateTime,
  lastActivityAt: dateTime,
  lastActivityByAgentName: { ...nullableString, maxLength: 255 },
  worktreePath: nullableString,
  branchName: nullableString,
  startedAt: dateTime,
  completedAt: dateTime,
};
const ticketMutationProperties = {
  ...ticketProperties,
  activityAuthorName: { ...nullableString, maxLength: 255 },
};
const ticketCommentProperties = {
  ticketId: uuid,
  body: { type: "string", minLength: 1, maxLength: 10000 },
  authorName: { ...nullableString, maxLength: 255 },
  kind: {
    type: "string",
    enum: ["note", "question", "decision", "blocker"],
    default: "note",
  },
};

export const apiComponents = {
  schemas: {
    ErrorResponse: {
      type: "object",
      required: ["success", "message", "statusCode"],
      properties: {
        success: { type: "boolean", enum: [false] },
        message: { type: "string" },
        code: { type: "string" },
        statusCode: { type: "integer" },
        details: {},
      },
    },
    Pagination: {
      type: "object",
      required: ["page", "limit", "total", "totalPages"],
      properties: {
        page: { type: "integer" },
        limit: { type: "integer" },
        total: { type: "integer" },
        totalPages: { type: "integer" },
      },
    },
    Project: entitySchema(projectProperties, [
      "name",
      "location",
    ]),
    CreateProject: requestSchema(projectProperties, ["name", "location"]),
    UpdateProject: requestSchema(projectProperties, [], 1),
    DiscoveredAgent: {
      type: "object",
      required: [
        "id",
        "provider",
        "name",
        "displayName",
        "mode",
        "scope",
        "sourceKind",
        "metadata",
        "validation",
        "precedenceRank",
      ],
      properties: {
        id: { type: "string" },
        provider: {
          type: "string",
          enum: ["codex", "claude", "cursor", "opencode"],
        },
        name: { type: "string" },
        displayName: { type: "string" },
        description: nullableString,
        instructions: nullableString,
        instructionsPreview: nullableString,
        model: nullableString,
        mode: {
          type: "string",
          enum: ["primary", "subagent", "all", "unknown"],
        },
        scope: { type: "string", enum: ["project", "user"] },
        sourcePath: nullableString,
        sourceKind: {
          type: "string",
          enum: ["toml", "markdown", "json", "builtin", "runtime"],
        },
        metadata: { type: "object", additionalProperties: true },
        validation: {
          type: "object",
          required: ["valid", "warnings", "errors"],
          properties: {
            valid: { type: "boolean" },
            warnings: { type: "array", items: { type: "string" } },
            errors: { type: "array", items: { type: "string" } },
          },
        },
        precedenceRank: { type: "integer" },
        shadowedBy: nullableString,
      },
    },
    DiscoveredAgentsResponse: {
      type: "object",
      required: ["agents", "scannedAt", "providers"],
      properties: {
        agents: arrayOf("DiscoveredAgent"),
        scannedAt: { type: "string", format: "date-time" },
        providers: { type: "object", additionalProperties: true },
      },
    },
    UpdateDiscoveredAgentInstructions: {
      type: "object",
      required: ["agentId", "instructions"],
      additionalProperties: false,
      properties: {
        agentId: { type: "string", minLength: 1 },
        instructions: { type: "string", minLength: 1 },
      },
    },
    Goal: entitySchema(goalProperties, [
      "projectId",
      "title",
      "description",
      "status",
      "maxRetries",
    ]),
    CreateGoal: requestSchema(goalProperties, ["projectId", "title"]),
    UpdateGoal: requestSchema(goalProperties, [], 1),
    Step: entitySchema(stepProperties, [
      "projectId",
      "name",
      "instructions",
      "position",
      "isTerminal",
      "color",
    ]),
    CreateStep: requestSchema(stepProperties, [
      "projectId",
      "name",
      "instructions",
      "position",
    ]),
    UpdateStep: requestSchema(stepProperties, [], 1),
    Ticket: entitySchema(ticketProperties, [
      "goalId",
      "moduleId",
      "title",
      "description",
      "type",
      "status",
      "priority",
      "retryCount",
      "maximumRetries",
      "assignedSubagentName",
    ], {
      activity: {
        type: "object",
        required: ["commentCount", "recentComments"],
        properties: {
          lastActivityAt: dateTime,
          lastActivityAgeMs: { type: "integer", nullable: true },
          lastActivityByAgentName: { ...nullableString, maxLength: 255 },
          commentCount: { type: "integer", minimum: 0 },
          recentComments: {
            type: "array",
            items: { $ref: "#/components/schemas/TicketComment" },
          },
        },
      },
    }),
    CreateTicket: requestSchema(ticketMutationProperties, [
      "goalId",
      "moduleId",
      "title",
    ]),
    UpdateTicket: requestSchema(ticketMutationProperties, [], 1),
    TicketComment: entitySchema(ticketCommentProperties, [
      "ticketId",
      "body",
      "kind",
    ]),
    CreateTicketComment: requestSchema(ticketCommentProperties, ["body"]),
    AppendTicketFile: {
      type: "object",
      required: ["path"],
      additionalProperties: false,
      properties: { path: { type: "string", minLength: 1, maxLength: 2000 } },
    },
    TicketReport: {
      type: "object",
      properties: {
        status: { type: "string", enum: ["completed", "failed", "blocked"] },
        summary: { type: "string" },
        evidence: { type: "array", items: { type: "string" } },
        activityAuthorName: { ...nullableString, maxLength: 255 },
      },
    },
    GoalTicketsSnapshot: {
      type: "object",
      required: ["goal", "tickets", "graph", "warnings"],
      properties: {
        goal: {
          type: "object",
          required: ["id", "projectId", "status", "title"],
          properties: {
            id: uuid,
            projectId: uuid,
            status: { type: "string", enum: goalStatus },
            title: { type: "string" },
          },
        },
        tickets: {
          type: "array",
          items: {
            type: "object",
            required: [
              "id",
              "title",
              "shortDescription",
              "status",
              "type",
              "priority",
              "dependsOn",
              "blockedBy",
            ],
            properties: {
              id: uuid,
              title: { type: "string" },
              shortDescription: { type: "string" },
              status: ticketProperties.status,
              type: ticketProperties.type,
              priority: ticketProperties.priority,
              dependsOn: { type: "array", items: uuid },
              blockedBy: { type: "array", items: uuid },
            },
          },
        },
        graph: {
          type: "object",
          required: [
            "nodes",
            "edges",
            "readyTicketIds",
            "inProgressTicketIds",
            "blockedTicketIds",
            "parallelBatches",
          ],
          properties: {
            nodes: { type: "array", items: uuid },
            edges: {
              type: "array",
              items: {
                type: "object",
                required: ["from", "to"],
                properties: { from: uuid, to: uuid },
              },
            },
            readyTicketIds: { type: "array", items: uuid },
            inProgressTicketIds: { type: "array", items: uuid },
            blockedTicketIds: { type: "array", items: uuid },
            parallelBatches: {
              type: "array",
              items: { type: "array", items: uuid },
            },
          },
        },
        warnings: { type: "array", items: { type: "string" } },
      },
    },
    Health: {
      type: "object",
      required: ["status", "timestamp", "uptime", "environment"],
      properties: {
        status: { type: "string", enum: ["ok"] },
        timestamp: { type: "string", format: "date-time" },
        uptime: { type: "number" },
        environment: { type: "string" },
      },
    },
    Readiness: {
      type: "object",
      required: ["status", "timestamp"],
      properties: {
        status: { type: "string", enum: ["ready", "not_ready"] },
        timestamp: { type: "string", format: "date-time" },
        error: { type: "string" },
      },
    },
  },
};

export const apiPaths = {
  ...crudPaths("projects", "Projects", "Project"),
  "/projects/{id}/agents": {
    get: operation(
      "Projects",
      "discoverProjectAgents",
      "Discover file-based subagents for a project",
      {
        parameters: [idParameter],
        responses: standardResponses(
          "DiscoveredAgentsResponse",
          "Project agents discovered",
          200,
          [404],
        ),
      },
    ),
  },
  "/projects/{id}/agents/instructions": {
    put: operation(
      "Projects",
      "updateDiscoveredAgentInstructions",
      "Update a file-backed discovered subagent's instructions",
      {
        parameters: [idParameter],
        requestBody: body("UpdateDiscoveredAgentInstructions"),
        responses: standardResponses(
          "DiscoveredAgent",
          "Discovered agent instructions updated",
          200,
          [404],
        ),
      },
    ),
  },
  ...crudPaths("goals", "Goals", "Goal"),
  "/goals/{id}/goal-tickets-snapshot": {
    get: operation(
      "Goals",
      "getGoalTicketsSnapshot",
      "Get a token-efficient ticket snapshot for a goal",
      {
        parameters: [idParameter],
        responses: standardResponses(
          "GoalTicketsSnapshot",
          "Goal tickets snapshot retrieved",
          200,
          [404],
        ),
      },
    ),
  },
  ...phasePath("planning", "start"),
  ...phasePath("planning", "complete"),
  ...phasePath("execution", "start"),
  ...phasePath("retrospective", "start"),
  ...phasePath("retrospective", "complete"),
  ...crudPaths("steps", "Steps", "Step"),
  ...crudPaths("tickets", "Tickets", "Ticket"),
  "/tickets/{id}/files": {
    post: operation(
      "Tickets",
      "appendTicketFile",
      "Append a relevant file to a ticket",
      {
        parameters: [idParameter],
        requestBody: body("AppendTicketFile"),
        responses: standardResponses(
          {
            type: "object",
            required: ["path"],
            properties: { path: { type: "string" } },
          },
          "Ticket file appended",
          201,
          [404],
        ),
      },
    ),
  },
  "/tickets/{id}/report": {
    post: operation("Tickets", "reportTicket", "Report ticket progress", {
      parameters: [idParameter],
      requestBody: body("TicketReport"),
      responses: standardResponses("Ticket", "Ticket report accepted", 200, [
        404,
      ]),
    }),
  },
  "/tickets/{id}/comments": {
    get: operation(
      "Ticket Comments",
      "listTicketComments",
      "List comments for a ticket",
      {
        parameters: [idParameter, ...pageParameters],
        responses: standardResponses(
          paginated("TicketComment"),
          "Ticket comments retrieved",
          200,
          [404],
        ),
      },
    ),
    post: operation(
      "Ticket Comments",
      "createTicketComment",
      "Add a comment to a ticket",
      {
        parameters: [idParameter],
        requestBody: body("CreateTicketComment"),
        responses: standardResponses(
          "TicketComment",
          "Ticket comment created",
          201,
          [400, 404],
        ),
      },
    ),
  },
  "/tickets/{id}/comments/{commentId}": {
    get: operation(
      "Ticket Comments",
      "getTicketComment",
      "Get a ticket comment",
      {
        parameters: [
          idParameter,
          {
            name: "commentId",
            in: "path",
            required: true,
            schema: uuid,
          },
        ],
        responses: standardResponses(
          "TicketComment",
          "Ticket comment retrieved",
          200,
          [404],
        ),
      },
    ),
  },
  "/live": healthPath("getLiveness", "Get process liveness", {
    type: "object",
    properties: { status: { type: "string", enum: ["ok"] } },
  }),
  "/health": healthPath("getHealth", "Get service health", ref("Health")),
  "/ready": healthPath(
    "getReadiness",
    "Get database readiness",
    ref("Readiness"),
    true,
  ),
};

function phasePath(phase: string, action: string) {
  const key = `/goals/{id}/${phase}/${action}`;
  return {
    [key]: {
      post: operation(
        "Goals",
        `${action}${capitalize(phase)}Phase`,
        `${capitalize(action)} goal ${phase}`,
        {
          parameters: [idParameter],
          responses: standardResponses("Goal", `Goal ${phase} ${action}ed`, 200, [
            404,
          ]),
        },
      ),
    },
  };
}

function crudPaths(resource: string, tag: string, schema: string) {
  const singular = schema.toLowerCase();
  return {
    [`/${resource}`]: {
      get: operation(tag, `list${schema}s`, `List ${resource}`, {
        parameters: pageParameters,
        responses: standardResponses(paginated(schema), `${schema}s retrieved`),
      }),
      post: operation(tag, `create${schema}`, `Create a ${singular}`, {
        requestBody: body(`Create${schema}`),
        responses: standardResponses(schema, `${schema} created`, 201),
      }),
    },
    [`/${resource}/{id}`]: {
      get: operation(tag, `get${schema}`, `Get a ${singular}`, {
        parameters: [idParameter],
        responses: standardResponses(schema, `${schema} retrieved`, 200, [404]),
      }),
      put: operation(tag, `replace${schema}`, `Update a ${singular}`, {
        parameters: [idParameter],
        requestBody: body(`Update${schema}`),
        responses: standardResponses(schema, `${schema} updated`, 200, [404]),
      }),
      patch: operation(
        tag,
        `update${schema}`,
        `Partially update a ${singular}`,
        {
          parameters: [idParameter],
          requestBody: body(`Update${schema}`),
          responses: standardResponses(schema, `${schema} updated`, 200, [404]),
        },
      ),
      delete: operation(tag, `delete${schema}`, `Delete a ${singular}`, {
        parameters: [idParameter],
        responses: standardResponses(schema, `${schema} deleted`, 200, [404]),
      }),
    },
  };
}

function operation(
  tag: string,
  operationId: string,
  summary: string,
  details: Record<string, unknown>,
) {
  return {
    tags: [tag],
    operationId,
    summary,
    security: [{ BearerAuth: [] }],
    ...details,
  };
}

function body(schema: string) {
  return {
    required: true,
    content: { "application/json": { schema: ref(schema) } },
  };
}

function standardResponses(
  schema: string | Schema,
  description: string,
  status = 200,
  additionalErrors: number[] = [],
) {
  return {
    [status]: {
      description,
      content: { "application/json": { schema: success(schema) } },
    },
    ...errorResponses([400, 401, ...additionalErrors]),
  };
}

function errorResponses(statuses: number[]) {
  return Object.fromEntries(
    [...new Set(statuses)].map((status) => [
      status,
      {
        description: errorDescription(status),
        content: { "application/json": { schema: ref("ErrorResponse") } },
      },
    ]),
  );
}

function errorDescription(status: number): string {
  return (
    (
      {
        400: "Invalid request",
        401: "Authentication required",
        404: "Resource not found",
        409: "Resource state conflict",
        503: "Service unavailable",
      } as Record<number, string>
    )[status] ?? "Error"
  );
}

function success(schema: string | Schema) {
  return {
    type: "object",
    required: ["success", "message", "data"],
    properties: {
      success: { type: "boolean", enum: [true] },
      message: { type: "string" },
      data: typeof schema === "string" ? ref(schema) : schema,
    },
  };
}

function paginated(schema: string) {
  return {
    type: "object",
    required: ["items", "pagination"],
    properties: {
      items: arrayOf(schema),
      pagination: ref("Pagination"),
    },
  };
}

function arrayOf(schema: string) {
  return { type: "array", items: ref(schema) };
}

function entitySchema(
  properties: Schema,
  required: string[],
  extraProperties: Schema = {},
) {
  return {
    type: "object",
    required: ["id", ...required, "createdAt", "updatedAt"],
    properties: { id: uuid, ...properties, ...extraProperties, ...timestamps },
  };
}

function requestSchema(
  properties: Schema,
  required: string[],
  minProperties?: number,
) {
  return {
    type: "object",
    required,
    minProperties,
    additionalProperties: false,
    properties,
  };
}

function ref(schema: string): Schema {
  return { $ref: `#/components/schemas/${schema}` };
}

function healthPath(
  operationId: string,
  summary: string,
  schema: Schema,
  allow503 = false,
) {
  return {
    get: {
      tags: ["Health"],
      operationId,
      summary,
      responses: {
        200: {
          description: summary,
          content: { "application/json": { schema } },
        },
        ...(allow503 ? errorResponses([503]) : {}),
      },
    },
  };
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
