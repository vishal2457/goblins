import { AnimatePresence, motion } from "motion/react";
import type React from "react";
import {
  AlertCircle,
  Bot,
  CheckCircle2,
  CircleDot,
  Clock3,
  FileCode,
  Loader2,
  PauseCircle,
  XCircle,
} from "lucide-react";
import {
  PRIORITY_COLORS,
  STATUS_COLORS,
  STATUS_LABELS,
  SUBAGENT_STATUS_LABELS,
  boardStepIdForTicketStatus,
  type BoardStep,
  type BoardStepId,
  type Ticket,
  type TicketStatus,
} from "@goblins/shared-constants";
import { Badge } from "../../../components/ui/badge";
import { Card } from "../../../components/ui/card";

const STATUS_ICON: Record<TicketStatus, React.ComponentType<{ className?: string }>> = {
  backlog: Clock3,
  ready: CircleDot,
  blocked: PauseCircle,
  in_progress: Loader2,
  review: AlertCircle,
  failed: XCircle,
  completed: CheckCircle2,
  cancelled: XCircle,
};

export function KanbanColumn({
  title,
  tickets,
  stepId,
  instructions,
  onTicketClick,
}: {
  title: string;
  instructions?: string;
  tickets: Ticket[];
  stepId: BoardStepId;
  color?: BoardStep["color"];
  onTicketClick?: (ticket: Ticket) => void;
}) {
  const columnTickets = tickets.filter(
    (ticket) => boardStepIdForTicketStatus(ticket.status) === stepId,
  );

  return (
    <div className="flex min-w-[230px] flex-1 flex-col gap-3 rounded-lg bg-muted/30 p-3">
      <div className="flex items-start justify-between gap-2 px-1">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold">{title}</h3>
          {instructions && (
            <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-muted-foreground">
              {instructions}
            </p>
          )}
        </div>
        <Badge
          variant="secondary"
          className="flex min-w-5 items-center justify-center text-xs"
        >
          {columnTickets.length}
        </Badge>
      </div>
      <div className="-mx-3 px-3">
        <div className="flex flex-col gap-3">
          <AnimatePresence initial={false}>
            {columnTickets.map((ticket) => (
              <TicketCard
                key={ticket.id}
                ticket={ticket}
                onClick={() => onTicketClick?.(ticket)}
              />
            ))}
          </AnimatePresence>
          {columnTickets.length === 0 && (
            <div className="flex h-20 items-center justify-center rounded-md border border-dashed bg-background/50 text-xs italic text-muted-foreground">
              Empty
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TicketCard({ ticket, onClick }: { ticket: Ticket; onClick: () => void }) {
  const StatusIcon = STATUS_ICON[ticket.status] ?? CircleDot;
  const isInProgress = ticket.status === "in_progress";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.98 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
    >
      <Card
        onClick={onClick}
        className="relative flex cursor-pointer flex-col gap-3 overflow-hidden p-3 shadow-sm transition-shadow hover:shadow-md"
      >
        {isInProgress && (
          <div className="absolute inset-x-0 top-0 h-0.5 overflow-hidden bg-blue-500/15">
            <div className="h-full w-1/2 animate-pulse bg-blue-500" />
          </div>
        )}
        <div className="flex items-start justify-between gap-2">
          <span className="line-clamp-2 text-sm font-medium leading-tight">
            {ticket.title}
          </span>
          <Badge
            variant="outline"
            className={`px-1.5 py-0 text-[10px] ${PRIORITY_COLORS[ticket.priority] || ""}`}
          >
            {ticket.priority}
          </Badge>
        </div>

        {ticket.type && (
          <Badge variant="secondary" className="w-fit text-[10px]">
            {ticket.type}
          </Badge>
        )}
        {ticket.assignedSubagentName && (
          <span className="flex min-w-0 items-center gap-1 text-[10px] text-muted-foreground">
            <Bot className="h-3 w-3 shrink-0" />
            <span className="truncate">{ticket.assignedSubagentName}</span>
          </span>
        )}
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge
            variant="outline"
            className={`w-fit text-[10px] ${STATUS_COLORS[ticket.status] || ""}`}
          >
            <StatusIcon
              className={`mr-1 h-3 w-3 ${isInProgress ? "animate-spin" : ""}`}
            />
            {STATUS_LABELS[ticket.status] || ticket.status}
          </Badge>
          {ticket.subagentStatus && (
            <Badge variant="secondary" className="w-fit text-[10px]">
              {SUBAGENT_STATUS_LABELS[ticket.subagentStatus]}
            </Badge>
          )}
        </div>

        {ticket.relevantFiles.length > 0 && (
          <div className="flex flex-col gap-1">
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <FileCode className="h-3 w-3" />
              Files
            </span>
            {ticket.relevantFiles.slice(0, 2).map((file) => (
              <code
                key={file}
                className="truncate rounded bg-muted px-1.5 py-0.5 font-mono text-[10px]"
              >
                {file}
              </code>
            ))}
            {ticket.relevantFiles.length > 2 && (
              <span className="text-[10px] text-muted-foreground">
                +{ticket.relevantFiles.length - 2} more
              </span>
            )}
          </div>
        )}

        <div className="mt-1 flex items-center justify-between">
          <span className="font-mono text-[10px] text-muted-foreground">
            {ticket.id}
          </span>
          {isInProgress && (
            <span className="inline-flex items-center gap-1 text-[10px] text-blue-600">
              <Loader2 className="h-3 w-3 animate-spin" />
              Running
            </span>
          )}
        </div>
      </Card>
    </motion.div>
  );
}
