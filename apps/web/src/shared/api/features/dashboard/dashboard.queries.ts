import { useQuery } from "@tanstack/react-query";
import { dashboardApi } from "./dashboard.api";
import { queryKeys } from "../../query-keys";

export function useDashboardQuery() {
  return useQuery({
    queryKey: queryKeys.dashboard,
    queryFn: dashboardApi.load,
  });
}

export function useGoalAuditLogsQuery(goalId: string | null, limit = 100) {
  return useQuery({
    queryKey: queryKeys.goalAuditLogs(goalId || "", limit),
    queryFn: () => dashboardApi.auditLogs.listByGoal(goalId!, limit),
    enabled: Boolean(goalId),
  });
}
