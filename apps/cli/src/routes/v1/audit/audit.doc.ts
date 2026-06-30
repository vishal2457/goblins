export const auditPaths = {
  "/audit-logs": {
    get: {
      tags: ["Audit Logs"],
      summary: "Get all audit logs",
      description: "Retrieve audit logs with optional filtering and pagination",
      parameters: [
        { name: "module", in: "query", required: false, schema: { type: "string" } },
        { name: "action", in: "query", required: false, schema: { type: "string", enum: ["CREATE", "UPDATE", "DELETE", "LOGIN", "LOGOUT"] } },
        { name: "entityId", in: "query", required: false, schema: { type: "string" } },
        { name: "entityName", in: "query", required: false, schema: { type: "string" } },
        { name: "userId", in: "query", required: false, schema: { type: "string" } },
        { name: "startDate", in: "query", required: false, schema: { type: "string", format: "date-time" } },
        { name: "endDate", in: "query", required: false, schema: { type: "string", format: "date-time" } },
        { name: "page", in: "query", required: false, schema: { type: "integer", default: 1 } },
        { name: "limit", in: "query", required: false, schema: { type: "integer", default: 25 } },
        { name: "sortBy", in: "query", required: false, schema: { type: "string", enum: ["module", "action", "entityName", "userName", "createdAt"] } },
        { name: "sortDirection", in: "query", required: false, schema: { type: "string", enum: ["asc", "desc"], default: "desc" } },
      ],
      responses: { 200: { description: "Audit logs retrieved successfully" } },
    },
  },
  "/audit-logs/{id}": {
    get: {
      tags: ["Audit Logs"],
      summary: "Get audit log by ID",
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
      responses: { 200: { description: "Audit log entry retrieved" }, 404: { description: "Not found" } },
    },
  },
  "/audit-logs/entity/{entityName}/{entityId}": {
    get: {
      tags: ["Audit Logs"],
      summary: "Get audit logs for a specific entity",
      parameters: [
        { name: "entityName", in: "path", required: true, schema: { type: "string" } },
        { name: "entityId", in: "path", required: true, schema: { type: "string" } },
      ],
      responses: { 200: { description: "Entity audit logs retrieved" } },
    },
  },
  "/audit-logs/stats/modules": {
    get: {
      tags: ["Audit Logs"],
      summary: "Get audit stats grouped by module",
      responses: { 200: { description: "Module stats retrieved" } },
    },
  },
  "/audit-logs/stats/actions": {
    get: {
      tags: ["Audit Logs"],
      summary: "Get audit stats grouped by action",
      parameters: [{ name: "module", in: "query", required: false, schema: { type: "string" } }],
      responses: { 200: { description: "Action stats retrieved" } },
    },
  },
  "/audit-logs/purge": {
    delete: {
      tags: ["Audit Logs"],
      summary: "Purge audit logs older than N days",
      parameters: [{ name: "days", in: "query", required: false, schema: { type: "integer", default: 90 } }],
      responses: { 200: { description: "Audit logs purged" } },
    },
  },
};

export const auditComponents = {
  schemas: {
    AuditLog: {
      type: "object",
      properties: {
        id: { type: "string" },
        module: { type: "string" },
        action: { type: "string" },
        entityId: { type: "string" },
        entityName: { type: "string" },
        data: { type: "object" },
        userId: { type: "string" },
        userName: { type: "string" },
        userEmail: { type: "string" },
        ipAddress: { type: "string" },
        userAgent: { type: "string" },
        metadata: { type: "object" },
        createdAt: { type: "string", format: "date-time" },
      },
    },
  },
};
