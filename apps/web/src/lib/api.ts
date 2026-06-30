import { dashboardApi } from "../shared/api/features/dashboard/dashboard.api";
import { goalApi } from "../shared/api/features/goal/goal.api";
import { projectApi } from "../shared/api/features/project/project.api";
import { realtimeApi } from "../shared/api/features/realtime/realtime.api";
import { ticketApi } from "../shared/api/features/ticket/ticket.api";
import { legacyApi } from "../shared/api/core";

export const api = {
  projects: projectApi,
  goals: goalApi,
  dashboard: dashboardApi,
  tickets: ticketApi,
  realtime: realtimeApi,
  boardSteps: legacyApi.boardSteps,
  auditLogs: legacyApi.auditLogs,
};
