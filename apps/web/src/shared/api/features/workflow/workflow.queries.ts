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
