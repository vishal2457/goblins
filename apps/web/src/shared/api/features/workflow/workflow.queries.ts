import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "../../../../components/ui/toaster";
import { queryKeys } from "../../query-keys";
import { workflowApi } from "./workflow.api";

export function useWorkflowQuery() {
  return useQuery({
    queryKey: queryKeys.workflow,
    queryFn: workflowApi.get,
  });
}

export function useUpdateWorkflowMutation() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: workflowApi.update,
    onSuccess: (workflow) => {
      toast.success("Workflow saved");
      queryClient.setQueryData(queryKeys.workflow, workflow);
    },
    onError: (error) => {
      toast.error(
        "Failed to save workflow",
        error instanceof Error ? error.message : "Failed to save workflow",
      );
    },
  });
}

export function useResetWorkflowMutation() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: workflowApi.reset,
    onSuccess: (workflow) => {
      toast.success("Workflow reset");
      queryClient.setQueryData(queryKeys.workflow, workflow);
    },
    onError: (error) => {
      toast.error(
        "Failed to reset workflow",
        error instanceof Error ? error.message : "Failed to reset workflow",
      );
    },
  });
}

export function useApplyWorkflowPresetMutation() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: workflowApi.applyPreset,
    onSuccess: (workflow) => {
      toast.success("Workflow preset applied");
      queryClient.setQueryData(queryKeys.workflow, workflow);
    },
    onError: (error) => {
      toast.error(
        "Failed to apply workflow preset",
        error instanceof Error
          ? error.message
          : "Failed to apply workflow preset",
      );
    },
  });
}
