import {
  type AuditLog,
  type Goal,
  type Project,
  type Ticket,
} from "@goblins/shared-constants";
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  Clock3,
  ScrollText,
  Target,
  X,
} from "lucide-react";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { Label } from "../../../components/ui/label";
import { ScrollArea } from "../../../components/ui/scroll-area";
import { AuditTimeline } from "./AuditTimeline";

export function GoalDetailsSheet({
  open,
  selectedGoal,
  selectedProject,
  tickets,
  auditLogs,
  auditLogsLoading,
  onClose,
}: {
  open: boolean;
  selectedGoal?: Goal;
  selectedProject?: Project;
  tickets: Ticket[];
  auditLogs: AuditLog[];
  auditLogsLoading: boolean;
  onClose: () => void;
}) {
  if (!open || !selectedGoal) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/25">
      <button
        type="button"
        aria-label="Close goal details"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
      />
      <aside className="relative flex h-full w-full max-w-[560px] flex-col border-l bg-background shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b bg-muted/10 px-5 py-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Target className="h-4 w-4 text-muted-foreground" />
              <span className="truncate">{selectedGoal.title}</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Goal audit trail and execution context
            </p>
          </div>
          <Button size="icon-sm" variant="ghost" title="Close" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <ScrollArea className="min-h-0 flex-1">
          <div className="space-y-5 p-5">
            <GoalMetrics
              goal={selectedGoal}
              tickets={tickets}
              auditLogCount={auditLogs.length}
            />

            <details className="group rounded-md border bg-muted/10">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2 text-sm font-medium [&::-webkit-details-marker]:hidden">
                <span>Project and goal context</span>
                <span className="text-xs text-muted-foreground group-open:hidden">
                  Show
                </span>
                <span className="hidden text-xs text-muted-foreground group-open:inline">
                  Hide
                </span>
              </summary>
              <section className="space-y-4 border-t px-3 py-3">
                {selectedProject && (
                  <div className="space-y-3">
                    <div>
                      <Label className="text-xs text-muted-foreground">
                        Project
                      </Label>
                      <p className="mt-1 text-sm font-medium">
                        {selectedProject.name}
                      </p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">
                        Project path
                      </Label>
                      <code className="mt-1 block rounded-md border bg-muted/20 px-2 py-1.5 text-xs font-mono break-all">
                        {selectedProject.location}
                      </code>
                    </div>
                    {selectedProject.description && (
                      <div>
                        <Label className="text-xs text-muted-foreground">
                          Project description
                        </Label>
                        <p className="mt-1 whitespace-pre-wrap text-sm">
                          {selectedProject.description}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                <div>
                  <Label className="text-xs text-muted-foreground">
                    Goal description
                  </Label>
                  <p className="mt-1 whitespace-pre-wrap text-sm">
                    {selectedGoal.description || "No description provided."}
                  </p>
                </div>
                {selectedGoal.technicalInstructions && (
                  <div>
                    <Label className="text-xs text-muted-foreground">
                      Technical instructions
                    </Label>
                    <pre className="mt-1 max-h-48 overflow-auto rounded-md border bg-muted/20 p-3 text-xs whitespace-pre-wrap">
                      {selectedGoal.technicalInstructions}
                    </pre>
                  </div>
                )}
              </section>
            </details>

            <section className="space-y-3 border-t pt-5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <ScrollText className="h-4 w-4 text-muted-foreground" />
                  <h3 className="text-sm font-semibold">Audit log</h3>
                </div>
                <Badge variant="secondary" className="text-[10px]">
                  {auditLogs.length}
                </Badge>
              </div>
              <AuditTimeline logs={auditLogs} loading={auditLogsLoading} />
            </section>
          </div>
        </ScrollArea>
      </aside>
    </div>
  );
}

function GoalMetrics({
  goal,
  tickets,
  auditLogCount,
}: {
  goal: Goal;
  tickets: Ticket[];
  auditLogCount: number;
}) {
  const completedTickets = tickets.filter(
    (ticket) => ticket.status === "completed",
  );
  const activeTickets = tickets.filter((ticket) =>
    ["in_progress", "review", "blocked"].includes(ticket.status),
  );
  const blockedTickets = tickets.filter((ticket) => ticket.status === "blocked");
  const averageTicketCompletionMs = average(
    completedTickets
      .map((ticket) =>
        durationBetween(ticket.startedAt ?? ticket.createdAt, ticket.completedAt),
      )
      .filter((duration): duration is number => duration !== null),
  );
  const longestTicketMs = Math.max(
    0,
    ...completedTickets
      .map((ticket) =>
        durationBetween(ticket.startedAt ?? ticket.createdAt, ticket.completedAt),
      )
      .filter((duration): duration is number => duration !== null),
  );

  const metrics = [
    {
      label: "Goal completion time",
      value: formatDuration(
        durationBetween(goal.startedAt ?? goal.createdAt, goal.completedAt),
      ),
      icon: Clock3,
    },
    {
      label: "Avg ticket completion",
      value: formatDuration(averageTicketCompletionMs),
      icon: CheckCircle2,
    },
    {
      label: "Ticket progress",
      value: `${completedTickets.length}/${tickets.length || 0}`,
      detail: `${activeTickets.length} active`,
      icon: Activity,
    },
    {
      label: "Blocked tickets",
      value: String(blockedTickets.length),
      detail: `${auditLogCount} audit events`,
      icon: AlertCircle,
    },
    {
      label: "Longest ticket",
      value: formatDuration(longestTicketMs || null),
      icon: Clock3,
    },
  ];

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold">Metrics</h3>
        <Badge variant="outline" className="text-[10px]">
          {goal.status}
        </Badge>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <div key={metric.label} className="rounded-md border bg-muted/10 p-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Icon className="h-3.5 w-3.5" />
                <span>{metric.label}</span>
              </div>
              <p className="mt-2 text-lg font-semibold leading-none">
                {metric.value}
              </p>
              {metric.detail && (
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {metric.detail}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function durationBetween(start?: string | null, end?: string | null) {
  if (!start || !end) return null;

  const startMs = new Date(start).getTime();
  const endMs = new Date(end).getTime();
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs < startMs) {
    return null;
  }

  return endMs - startMs;
}

function average(values: number[]) {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function formatDuration(durationMs: number | null) {
  if (durationMs === null) return "N/A";

  const totalMinutes = Math.max(1, Math.round(durationMs / 60000));
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) {
    return `${days}d ${hours}h`;
  }

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  return `${minutes}m`;
}
