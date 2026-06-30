import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "../../../../components/ui/toaster";
import { queryKeys } from "../../query-keys";
import { ticketApi } from "./ticket.api";

export function useTicketCommentsQuery(
  ticketId: string,
  page = 1,
  limit = 100,
) {
  return useQuery({
    queryKey: queryKeys.ticketComments(ticketId, page, limit),
    queryFn: () => ticketApi.comments.list(ticketId, page, limit),
    enabled: Boolean(ticketId),
  });
}

export function useDeleteTicketMutation() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: ticketApi.remove,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
    },
    onError: (error) => {
      toast.error(
        "Failed to delete ticket",
        error instanceof Error ? error.message : "Failed to delete ticket",
      );
    },
  });
}
