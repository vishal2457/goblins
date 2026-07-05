import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  BoardStepId,
  Ticket,
  TicketStatus,
} from "goblins-shared-constants";
import { useToast } from "../../../../components/ui/toaster";
import type { DashboardData } from "../../core";
import { queryKeys } from "../../query-keys";
import { ticketApi } from "./ticket.api";

const TODO_STATUSES: TicketStatus[] = ["backlog", "ready", "blocked", "review"];

function statusForBoardStep(ticket: Ticket, boardStepId: BoardStepId): TicketStatus {
  if (boardStepId === "inprogress") return "in_progress";
  if (boardStepId === "done") return "completed";
  if (boardStepId === "failed") return "failed";
  if (TODO_STATUSES.includes(ticket.status)) return ticket.status;
  return "ready";
}

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

function mergeDashboardTicket(existing: Ticket, updated: Ticket): Ticket {
  return {
    ...existing,
    ...updated,
    projectId: updated.projectId || existing.projectId,
  };
}

export function useSettleTicketMutation() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async ({
      ticket,
      boardStepId,
      comment,
    }: {
      ticket: Ticket;
      boardStepId: BoardStepId;
      comment?: string;
    }) => {
      const status = statusForBoardStep(ticket, boardStepId);
      const now = new Date().toISOString();
      const patch: {
        status: TicketStatus;
        startedAt?: string | null;
        completedAt?: string | null;
        activityAuthorName?: string;
      } = { status };

      if (status === "completed") {
        patch.completedAt = now;
      } else if (ticket.completedAt) {
        patch.completedAt = null;
      }
      if (status === "in_progress" && !ticket.startedAt) {
        patch.startedAt = now;
      }
      patch.activityAuthorName = "User";

      const updatedTicket = await ticketApi.update(ticket.id, patch);
      let commentFailed = false;
      const body = comment?.trim();

      if (body) {
        try {
          await ticketApi.comments.create(ticket.id, {
            body,
            authorName: "User",
            kind: "decision",
          });
        } catch {
          commentFailed = true;
        }
      }

      return { ticket: updatedTicket, commentFailed };
    },
    onSuccess: (result, variables) => {
      queryClient.setQueryData<DashboardData>(queryKeys.dashboard, (dashboard) => {
        if (!dashboard) return dashboard;

        return {
          ...dashboard,
          tickets: dashboard.tickets.map((ticket) =>
            ticket.id === result.ticket.id
              ? mergeDashboardTicket(ticket, result.ticket)
              : ticket,
          ),
        };
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.goalAuditLogs(variables.ticket.goalId),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.ticketComments(variables.ticket.id),
      });

      if (result.commentFailed) {
        toast.info(
          "Ticket status updated",
          "The optional comment could not be saved.",
        );
        return;
      }

      toast.success("Ticket settled", result.ticket.title);
    },
    onError: (error) => {
      toast.error(
        "Failed to settle ticket",
        error instanceof Error ? error.message : "Failed to settle ticket",
      );
    },
  });
}
