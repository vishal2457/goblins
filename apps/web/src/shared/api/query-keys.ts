export const queryKeys = {
  dashboard: ["dashboard"] as const,
  auditLogs: ["audit-logs"] as const,
  goalAuditLogs: (goalId: string, limit = 100) =>
    [...queryKeys.auditLogs, "goal", goalId, limit] as const,
  projectAgents: (projectId: string) => ["projects", projectId, "agents"] as const,
  ticketComments: (ticketId: string, page = 1, limit = 100) =>
    ["tickets", ticketId, "comments", page, limit] as const,
} as const;
