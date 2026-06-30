import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "../../../../components/ui/toaster";
import { queryKeys } from "../../query-keys";
import { projectApi } from "./project.api";

export function useProjectAgentsQuery(
  projectId: string | null,
  enabled = true,
) {
  return useQuery({
    queryKey: queryKeys.projectAgents(projectId || ""),
    queryFn: () => projectApi.agents.discover(projectId!),
    enabled: enabled && Boolean(projectId),
  });
}

export function useCreateProjectMutation() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: projectApi.create,
    onSuccess: (project) => {
      toast.success("Project created", project.name);
      void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
    },
    onError: (error) => {
      toast.error(
        "Failed to create project",
        error instanceof Error ? error.message : "Failed to create project",
      );
    },
  });
}

export function useUpdateProjectMutation() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: Parameters<typeof projectApi.update>[1];
    }) => projectApi.update(id, data),
    onSuccess: (project) => {
      toast.success("Project updated", project.name);
      void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
    },
    onError: (error) => {
      toast.error(
        "Failed to update project",
        error instanceof Error ? error.message : "Failed to update project",
      );
    },
  });
}

export function useUpdateProjectAgentInstructionsMutation(projectId: string | null) {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: ({
      agentId,
      instructions,
    }: {
      agentId: string;
      instructions: string;
    }) => {
      if (!projectId) {
        throw new Error("Project is not selected");
      }

      return projectApi.agents.updateInstructions(projectId, {
        agentId,
        instructions,
      });
    },
    onSuccess: (agent) => {
      toast.success("Subagent updated", agent.displayName);
      if (projectId) {
        void queryClient.invalidateQueries({
          queryKey: queryKeys.projectAgents(projectId),
        });
      }
    },
    onError: (error) => {
      toast.error(
        "Failed to update subagent",
        error instanceof Error ? error.message : "Failed to update subagent",
      );
    },
  });
}
