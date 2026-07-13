export const API_V1_PREFIX = "/api/v1";

export const API_PATHS = {
  projects: `${API_V1_PREFIX}/projects`,
  projectById: (id: string) => `${API_V1_PREFIX}/projects/${id}`,
  projectModules: (id: string) => `${API_V1_PREFIX}/projects/${id}/modules`,
  projectAgents: (id: string) => `${API_V1_PREFIX}/projects/${id}/agents`,
  projectAgentInstructions: (id: string) =>
    `${API_V1_PREFIX}/projects/${id}/agents/instructions`,

  workflow: `${API_V1_PREFIX}/workflow`,

  moduleTickets: (id: string) => `${API_V1_PREFIX}/modules/${id}/tickets`,

  goals: `${API_V1_PREFIX}/goals`,
  goalById: (id: string) => `${API_V1_PREFIX}/goals/${id}`,
  goalTicketsSnapshot: (id: string) =>
    `${API_V1_PREFIX}/goals/${id}/goal-tickets-snapshot`,
  goalOverview: (id: string) => `${API_V1_PREFIX}/goals/${id}/overview`,
  goalImprovements: (id: string) => `${API_V1_PREFIX}/goals/${id}/improvements`,
  goalRetrospectiveAnalyse: (id: string) =>
    `${API_V1_PREFIX}/goals/${id}/retrospective/analyse`,
  goalImprovementApprove: (id: string, proposalId: string) =>
    `${API_V1_PREFIX}/goals/${id}/improvements/${proposalId}/approve`,
  goalImprovementReject: (id: string, proposalId: string) =>
    `${API_V1_PREFIX}/goals/${id}/improvements/${proposalId}/reject`,
  goalImprovementApply: (id: string, proposalId: string) =>
    `${API_V1_PREFIX}/goals/${id}/improvements/${proposalId}/apply`,
  goalPlanningStart: (id: string) =>
    `${API_V1_PREFIX}/goals/${id}/planning/start`,
  goalPlanningComplete: (id: string) =>
    `${API_V1_PREFIX}/goals/${id}/planning/complete`,
  goalExecutionStart: (id: string) =>
    `${API_V1_PREFIX}/goals/${id}/execution/start`,
  goalRetrospectiveStart: (id: string) =>
    `${API_V1_PREFIX}/goals/${id}/retrospective/start`,
  goalRetrospectiveComplete: (id: string) =>
    `${API_V1_PREFIX}/goals/${id}/retrospective/complete`,

  tickets: `${API_V1_PREFIX}/tickets`,
  ticketById: (id: string) => `${API_V1_PREFIX}/tickets/${id}`,
  ticketReport: (id: string) => `${API_V1_PREFIX}/tickets/${id}/report`,
  ticketFiles: (id: string) => `${API_V1_PREFIX}/tickets/${id}/files`,
  ticketComments: (id: string) => `${API_V1_PREFIX}/tickets/${id}/comments`,
  ticketCommentById: (id: string, commentId: string) =>
    `${API_V1_PREFIX}/tickets/${id}/comments/${commentId}`,

  events: `${API_V1_PREFIX}/events`,

  boardSteps: `${API_V1_PREFIX}/steps`,
  boardStepById: (id: string) => `${API_V1_PREFIX}/steps/${id}`,

  auditLogs: `${API_V1_PREFIX}/audit-logs`,
  auditLogById: (id: string) => `${API_V1_PREFIX}/audit-logs/${id}`,
  auditLogsByEntity: (entityName: string, entityId: string) =>
    `${API_V1_PREFIX}/audit-logs/entity/${entityName}/${entityId}`,
  auditLogModuleStats: `${API_V1_PREFIX}/audit-logs/stats/modules`,
  auditLogActionStats: `${API_V1_PREFIX}/audit-logs/stats/actions`,
  auditLogPurge: `${API_V1_PREFIX}/audit-logs/purge`,
} as const;
