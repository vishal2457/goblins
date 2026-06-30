import {
  listBoardSteps,
  listGoalAuditLogs,
  loadDashboardData,
} from "../../core";

export const dashboardApi = {
  load: loadDashboardData,
  boardSteps: {
    list: listBoardSteps,
  },
  auditLogs: {
    listByGoal: listGoalAuditLogs,
  },
};
