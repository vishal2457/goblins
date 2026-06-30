import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Goal } from "@goblins/shared-constants";
import { useToast } from "../../../../components/ui/toaster";
import { queryKeys } from "../../query-keys";
import { ticketApi } from "../ticket/ticket.api";
import { goalApi } from "./goal.api";

function invalidateGoalDependentQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  goalId?: string,
) {
  void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
  if (goalId) {
    void queryClient.invalidateQueries({
      queryKey: queryKeys.goalAuditLogs(goalId),
    });
  }
}

export function useCreateGoalMutation() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: goalApi.create,
    onSuccess: (goal) => {
      toast.success("Goal created", goal.title);
      invalidateGoalDependentQueries(queryClient);
    },
    onError: (error) => {
      toast.error(
        "Failed to create goal",
        error instanceof Error ? error.message : "Failed to create goal",
      );
    },
  });
}

export function useUpdateGoalMutation() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: Parameters<typeof goalApi.update>[1];
    }) => goalApi.update(id, data),
    onSuccess: (goal) => {
      toast.success("Goal updated", goal.title);
      invalidateGoalDependentQueries(queryClient, goal.id);
    },
    onError: (error) => {
      toast.error(
        "Failed to update goal",
        error instanceof Error ? error.message : "Failed to update goal",
      );
    },
  });
}

export function useResetGoalPlanningMutation() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async (goalId: string) => {
      const goalTickets = await goalApi.tickets.list(goalId);
      await Promise.all(goalTickets.map((ticket) => ticketApi.remove(ticket.id)));
      return goalApi.reset(goalId);
    },
    onSuccess: (goal) => {
      toast.success("Planning data reset");
      invalidateGoalDependentQueries(queryClient, goal.id);
    },
    onError: (error) => {
      toast.error(
        "Failed to reset planning data",
        error instanceof Error ? error.message : "Failed to reset planning data",
      );
    },
  });
}

export function useStartGoalWorkflowMutation() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async (goal: Goal) => {
      const canStartExecution =
        goal.status === "ready" ||
        goal.phases.some(
          (phase) => phase.id === "planning" && phase.status === "completed",
        );

      if (canStartExecution) {
        return goalApi.startExecution(goal.id);
      }

      return goalApi.startPlanning(goal.id);
    },
    onSuccess: (goal) => {
      toast.success("Goal workflow started");
      invalidateGoalDependentQueries(queryClient, goal.id);
    },
    onError: (error) => {
      toast.error(
        "Failed to update goal phase",
        error instanceof Error ? error.message : "Failed to update goal phase",
      );
    },
  });
}

export function usePauseGoalMutation() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: goalApi.pause,
    onSuccess: (goal) => {
      toast.success("Goal paused");
      invalidateGoalDependentQueries(queryClient, goal.id);
    },
    onError: (error) => {
      toast.error(
        "Failed to pause goal",
        error instanceof Error ? error.message : "Failed to pause goal",
      );
    },
  });
}

export function useResumeGoalMutation() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: goalApi.resume,
    onSuccess: (goal) => {
      toast.success("Goal resumed");
      invalidateGoalDependentQueries(queryClient, goal.id);
    },
    onError: (error) => {
      toast.error(
        "Failed to resume goal",
        error instanceof Error ? error.message : "Failed to resume goal",
      );
    },
  });
}

export function useCancelGoalMutation() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: goalApi.cancel,
    onSuccess: (goal) => {
      toast.success("Goal cancelled");
      invalidateGoalDependentQueries(queryClient, goal.id);
    },
    onError: (error) => {
      toast.error(
        "Failed to cancel goal",
        error instanceof Error ? error.message : "Failed to cancel goal",
      );
    },
  });
}

export function useStartRetrospectiveMutation() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: ({
      goalId,
      userPoints,
    }: {
      goalId: string;
      userPoints?: string;
    }) => goalApi.startRetrospective(goalId, userPoints),
    onSuccess: (goal) => {
      toast.success("Retrospective started");
      invalidateGoalDependentQueries(queryClient, goal.id);
    },
    onError: (error) => {
      toast.error(
        "Failed to start retrospective",
        error instanceof Error ? error.message : "Failed to start retrospective",
      );
    },
  });
}

export function useCompleteRetrospectiveMutation() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: goalApi.completeRetrospective,
    onSuccess: (goal) => {
      toast.success("Retrospective completed");
      invalidateGoalDependentQueries(queryClient, goal.id);
    },
    onError: (error) => {
      toast.error(
        "Failed to complete retrospective",
        error instanceof Error
          ? error.message
          : "Failed to complete retrospective",
      );
    },
  });
}
