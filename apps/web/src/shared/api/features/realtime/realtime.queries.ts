import { useEffect, useRef } from "react";
import type { RealtimeEvent, Ticket } from "@goblins/shared-constants";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "../../../../components/ui/toaster";
import { queryKeys } from "../../query-keys";
import { realtimeApi } from "./realtime.api";

const REALTIME_REFRESH_DELAY_MS = 250;

export function useRealtimeTicketEvents() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const refreshTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || typeof EventSource === "undefined") {
      return;
    }

    const invalidateQueries = () => {
      if (refreshTimeoutRef.current) {
        window.clearTimeout(refreshTimeoutRef.current);
      }

      refreshTimeoutRef.current = window.setTimeout(() => {
        refreshTimeoutRef.current = null;
        void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
        void queryClient.invalidateQueries({ queryKey: queryKeys.auditLogs });
      }, REALTIME_REFRESH_DELAY_MS);
    };

    const source = new EventSource(realtimeApi.eventsUrl());
    const handleTicketEvent = (event: MessageEvent<string>) => {
      let data: RealtimeEvent<{ ticket?: Ticket; previousTicket?: Ticket }>;

      try {
        data = JSON.parse(event.data);
      } catch {
        toast.error("Realtime update failed", "The server sent an invalid event.");
        return;
      }

      const ticket = data.payload.ticket;
      if (data.type === "ticket.created") {
        toast.success("Ticket created", ticket?.title);
      }
      if (data.type === "ticket.deleted") {
        toast.info("Ticket deleted", ticket?.title);
      }
      if (data.type === "ticket.updated") {
        const previousStatus = data.payload.previousTicket?.status;
        const nextStatus = ticket?.status;
        const moved = previousStatus && nextStatus && previousStatus !== nextStatus;

        toast.info(
          moved ? "Ticket moved" : "Ticket updated",
          moved && ticket
            ? `${ticket.title} is now ${nextStatus.replaceAll("_", " ")}`
            : ticket?.title,
        );
      }

      invalidateQueries();
    };

    source.addEventListener("ticket.created", handleTicketEvent);
    source.addEventListener("ticket.updated", handleTicketEvent);
    source.addEventListener("ticket.deleted", handleTicketEvent);
    source.onerror = () => {
      toast.error("Realtime disconnected", "Ticket updates will retry automatically.");
    };

    return () => {
      source.removeEventListener("ticket.created", handleTicketEvent);
      source.removeEventListener("ticket.updated", handleTicketEvent);
      source.removeEventListener("ticket.deleted", handleTicketEvent);
      source.close();

      if (refreshTimeoutRef.current) {
        window.clearTimeout(refreshTimeoutRef.current);
        refreshTimeoutRef.current = null;
      }
    };
  }, [queryClient, toast]);
}
