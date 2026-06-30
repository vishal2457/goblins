import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useRealtimeDashboard } from "../../hooks/useRealtimeDashboard";
import { type AuditLog, type Ticket } from "@goblins/shared-constants";
import { TicketDetailsDialog } from "../../components/TicketDetailsDialog";
import { Badge } from "../../components/ui/badge";
import { ScrollArea } from "../../components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../../components/ui/dialog";
import { Button } from "../../components/ui/button";
import { Label } from "../../components/ui/label";
import { cn } from "../../lib/utils";
import { KanbanColumn } from "./components/KanbanColumn";
import {
  LayoutGrid,
  FolderOpen,
  Target,
  Play,
  Pause,
  RotateCcw,
  XCircle,
  CheckCircle2,
  XCircle as XCircleIcon,
  Loader2,
  Info,
  Lightbulb,
  ScrollText,
  X,
} from "lucide-react";

export function DashboardPage() {
  const navigate = useNavigate();
  const {
    projects,
    goals,
    tickets,
    auditLogs,
    auditLogsLoading,
    boardSteps,
    loading,
    error,
    selectedProjectId,
    setSelectedProjectId,
    selectedGoalId,
    setSelectedGoalId,
    executeGoal,
    pauseGoal,
    resumeGoal,
    cancelGoal,
    startRetrospective,
    completeRetrospective,
  } = useRealtimeDashboard();

  const [viewingTicketDetails, setViewingTicketDetails] =
    useState<Ticket | null>(null);
  const [isGoalSheetOpen, setIsGoalSheetOpen] = useState(false);
  const [isRetrospectiveDialogOpen, setIsRetrospectiveDialogOpen] =
    useState(false);
  const [retrospectiveUserPoints, setRetrospectiveUserPoints] = useState("");
  const [isStartingRetrospective, setIsStartingRetrospective] = useState(false);

  const handleProjectSelect = (pid: string) => {
    setSelectedProjectId(pid);
    const projGoals = goals.filter((g) => g.projectId === pid);
    if (projGoals.length > 0) {
      if (!projGoals.find((g) => g.id === selectedGoalId)) {
        setSelectedGoalId(projGoals[0].id);
      }
    } else {
      setSelectedGoalId("");
    }
  };

  const handleExecuteGoal = async () => {
    if (!selectedGoalId) return;
    await executeGoal(selectedGoalId);
  };

  const handlePauseGoal = async () => {
    if (!selectedGoalId) return;
    await pauseGoal(selectedGoalId);
  };

  const handleResumeGoal = async () => {
    if (!selectedGoalId) return;
    await resumeGoal(selectedGoalId);
  };

  const handleCancelGoal = async () => {
    if (!selectedGoalId) return;
    await cancelGoal(selectedGoalId);
  };

  const handleStartRetrospective = async () => {
    if (!selectedGoalId) return;
    setIsStartingRetrospective(true);
    const goal = await startRetrospective(
      selectedGoalId,
      retrospectiveUserPoints,
    );
    setIsStartingRetrospective(false);
    if (!goal) return;
    setRetrospectiveUserPoints("");
    setIsRetrospectiveDialogOpen(false);
  };

  const handleCompleteRetrospective = async () => {
    if (!selectedGoalId) return;
    await completeRetrospective(selectedGoalId);
  };

  const currentProjectGoals = goals.filter(
    (g) => g.projectId === selectedProjectId,
  );
  const selectedProject = projects.find((p) => p.id === selectedProjectId);
  const selectedGoal = goals.find((g) => g.id === selectedGoalId);
  const displayTickets = selectedGoalId
    ? tickets.filter((t) => t.goalId === selectedGoalId)
    : [];
  const projectItems = React.useMemo(
    () => projects.map((p) => ({ value: p.id, label: p.name })),
    [projects],
  );
  const goalItems = React.useMemo(
    () => currentProjectGoals.map((g) => ({ value: g.id, label: g.title })),
    [currentProjectGoals],
  );

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">
            Connecting to agent server...
          </span>
        </div>
      </div>
    );
  }

  if (error && projects.length === 0) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4 max-w-md text-center">
          <XCircleIcon className="h-8 w-8 text-red-500" />
          <span className="text-sm text-muted-foreground">{error}</span>
          <Button variant="outline" onClick={() => window.location.reload()}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-background p-6">
        <div className="flex max-w-md flex-col items-center gap-4 text-center">
          <FolderOpen className="h-9 w-9 text-muted-foreground" />
          <div>
            <h2 className="text-lg font-semibold">No projects configured</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Create a project in Settings to start tracking goals and tickets.
            </p>
          </div>
          <Button onClick={() => navigate("/settings/projects")}>
            Open Settings
          </Button>
        </div>
      </div>
    );
  }

  const isGoalRunning =
    selectedGoal?.status === "running" || selectedGoal?.status === "planning";
  const isGoalPaused = selectedGoal?.status === "paused";
  const isGoalCancelled = selectedGoal?.status === "cancelled";
  const isGoalRetrospective = selectedGoal?.status === "retrospective";
  const executionPhase = selectedGoal?.phases.find(
    (phase) => phase.id === "execution",
  );
  const canStartRetrospective =
    selectedGoal?.status === "completed" &&
    executionPhase?.status === "completed";
  const canRetryPlanning =
    (selectedGoal?.status === "failed" &&
      selectedGoal.ticketIds.length === 0) ||
    selectedGoal?.status === "planning";
  const canExecute =
    selectedGoal &&
    (selectedGoal.status === "draft" ||
      selectedGoal.status === "ready" ||
      canRetryPlanning);
  const executeGoalLabel = canRetryPlanning
    ? selectedGoal?.status === "planning"
      ? "Restart planning"
      : "Retry planning"
    : selectedGoal?.status === "ready"
      ? "Start execution"
      : "Start planning";
  const visibleGoalError =
    selectedGoal?.lastError ??
    (selectedGoal?.status === "failed"
      ? {
          phase: "execution" as const,
          message:
            "This failure was recorded before detailed diagnostics were available. Retry planning to capture the underlying error.",
          occurredAt: selectedGoal.updatedAt,
        }
      : null);

  return (
    <div className="flex h-full w-full flex-col overflow-y-auto overflow-x-hidden bg-background text-foreground">
      {/* Project & Goal Selectors */}
      <div className="flex items-center gap-3 border-b px-6 py-2 bg-muted/10 shrink-0 flex-wrap">
        <div className="flex items-center gap-3">
          <FolderOpen className="h-4 w-4 text-muted-foreground" />
          <Label className="text-muted-foreground text-xs">Project:</Label>
          <Select
            value={selectedProjectId || ""}
            onValueChange={handleProjectSelect}
            items={projectItems}
          >
            <SelectTrigger className="w-[180px] h-8 bg-background">
              <SelectValue placeholder="Select Project" />
            </SelectTrigger>
            <SelectContent>
              {projects.map((p) => (
                <SelectItem key={p.id} value={p.id} label={p.name}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-3">
          <Target className="h-4 w-4 text-muted-foreground" />
          <Label className="text-muted-foreground text-xs">Goal:</Label>
          <Select
            value={selectedGoalId || ""}
            onValueChange={setSelectedGoalId}
            disabled={!selectedProjectId || currentProjectGoals.length === 0}
            items={goalItems}
          >
            <SelectTrigger className="w-[220px] h-8 bg-background">
              <SelectValue placeholder="Select Goal" />
            </SelectTrigger>
            <SelectContent>
              {currentProjectGoals.map((g) => (
                <SelectItem key={g.id} value={g.id} label={g.title}>
                  <span className="flex items-center gap-2">
                    {g.title}
                    <Badge variant="secondary" className="text-[9px] px-1 py-0">
                      {g.status}
                    </Badge>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedGoal && (
          <div className="flex items-center gap-2 ml-auto shrink-0">
            <Badge
              variant="outline"
              className={`text-[11px] px-2 py-0.5 capitalize ${
                selectedGoal.status === "running"
                  ? "border-green-500/50 text-green-500"
                  : selectedGoal.status === "failed"
                    ? "border-red-500/50 text-red-500"
                    : selectedGoal.status === "completed"
                      ? "border-blue-500/50 text-blue-500"
                      : ""
              }`}
            >
              {selectedGoal.status}
            </Badge>
            <Button
              size="icon-sm"
              variant="ghost"
              title="View project and goal details"
              onClick={() => setIsGoalSheetOpen(true)}
            >
              <Info className="h-3.5 w-3.5" />
            </Button>
            {canExecute && (
              <Button
                size="sm"
                className="h-7 text-xs gap-1"
                onClick={handleExecuteGoal}
              >
                <Play className="h-3 w-3" />
                {executeGoalLabel}
              </Button>
            )}
            {isGoalRunning && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs gap-1"
                  onClick={handlePauseGoal}
                >
                  <Pause className="h-3 w-3" />
                  Pause
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs gap-1 text-red-500"
                  onClick={handleCancelGoal}
                >
                  <XCircle className="h-3 w-3" />
                  Cancel
                </Button>
              </>
            )}
            {isGoalPaused && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs gap-1"
                onClick={handleResumeGoal}
              >
                <RotateCcw className="h-3 w-3" />
                Resume
              </Button>
            )}
            {isGoalCancelled && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs gap-1"
                onClick={handleResumeGoal}
              >
                <RotateCcw className="h-3 w-3" />
                Resume
              </Button>
            )}
            {canStartRetrospective && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs gap-1"
                onClick={() => setIsRetrospectiveDialogOpen(true)}
              >
                <Lightbulb className="h-3 w-3" />
                Start retrospective
              </Button>
            )}
            {isGoalRetrospective && (
              <Button
                size="sm"
                className="h-7 text-xs gap-1"
                onClick={handleCompleteRetrospective}
              >
                <CheckCircle2 className="h-3 w-3" />
                Complete retrospective
              </Button>
            )}
          </div>
        )}
      </div>

      {visibleGoalError && (
        <div className="mx-6 mt-3 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 shrink-0">
          <div className="flex items-start gap-3">
            <XCircleIcon className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm text-red-600 capitalize">
                  {visibleGoalError.phase} failed
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {new Date(visibleGoalError.occurredAt).toLocaleString()}
                </span>
              </div>
              <p className="mt-1 text-sm text-red-600 whitespace-pre-wrap">
                {visibleGoalError.message}
              </p>
              {"details" in visibleGoalError && visibleGoalError.details && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-xs font-medium text-red-600">
                    Show diagnostic output
                  </summary>
                  <pre className="mt-2 max-h-40 overflow-auto rounded border border-red-500/20 bg-background/70 p-3 text-xs whitespace-pre-wrap text-foreground">
                    {visibleGoalError.details}
                  </pre>
                </details>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-6 p-6">
        <div className="flex min-w-0 flex-1 flex-col gap-6">
          <div className="flex flex-col rounded-xl border bg-card">
            <div className="flex items-center justify-between border-b px-4 py-3 shrink-0">
              <div className="flex items-center gap-2">
                <LayoutGrid className="h-5 w-5 text-muted-foreground" />
                <h2 className="text-lg font-semibold">Kanban Board</h2>
                <Badge variant="secondary" className="ml-2">
                  {displayTickets.length} Tickets
                </Badge>
              </div>
            </div>

            <div className="theme-scrollbar overflow-x-auto p-4">
              <div className="flex w-max min-w-full items-stretch gap-4 pb-2">
                {boardSteps.map((step) => (
                  <KanbanColumn
                    key={step.id}
                    title={step.name}
                    instructions={step.instructions}
                    color={step.color}
                    tickets={displayTickets}
                    stepId={step.id}
                    onTicketClick={setViewingTicketDetails}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <Dialog
        open={isRetrospectiveDialogOpen}
        onOpenChange={setIsRetrospectiveDialogOpen}
      >
        <DialogContent className="max-w-[95vw] sm:max-w-[560px] overflow-hidden p-0">
          <DialogHeader className="px-6 py-4 border-b shrink-0 bg-muted/10">
            <DialogTitle>Start retrospective</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 p-6">
            <Label
              htmlFor="retrospective-user-points"
              className="text-sm font-medium"
            >
              Points that would make the system better
            </Label>
            <textarea
              id="retrospective-user-points"
              value={retrospectiveUserPoints}
              onChange={(event) =>
                setRetrospectiveUserPoints(event.target.value)
              }
              className="min-h-[140px] w-full resize-none rounded-md border bg-background px-3 py-2 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              placeholder="Add anything the retrospective agent should consider, or leave this blank."
              maxLength={4000}
            />
          </div>
          <DialogFooter className="border-t shrink-0 px-6 py-4">
            <Button
              variant="outline"
              onClick={() => setIsRetrospectiveDialogOpen(false)}
              disabled={isStartingRetrospective}
            >
              Cancel
            </Button>
            <Button
              className="gap-1.5"
              onClick={handleStartRetrospective}
              disabled={isStartingRetrospective}
            >
              {isStartingRetrospective && (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              )}
              Start retrospective
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {isGoalSheetOpen && selectedGoal && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/25">
          <button
            type="button"
            aria-label="Close goal details"
            className="absolute inset-0 cursor-default"
            onClick={() => setIsGoalSheetOpen(false)}
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
              <Button
                size="icon-sm"
                variant="ghost"
                title="Close"
                onClick={() => setIsGoalSheetOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <ScrollArea className="min-h-0 flex-1">
              <div className="space-y-5 p-5">
                {selectedProject && (
                  <section className="space-y-3">
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
                  </section>
                )}

                <section className="space-y-3 border-t pt-5">
                  <div>
                    <Label className="text-xs text-muted-foreground">
                      Description
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
                  <AuditTimeline
                    logs={auditLogs}
                    loading={auditLogsLoading}
                  />
                </section>
              </div>
            </ScrollArea>
          </aside>
        </div>
      )}

      {/* Ticket Details Dialog */}
      <TicketDetailsDialog
        ticket={viewingTicketDetails}
        onClose={() => setViewingTicketDetails(null)}
        boardSteps={boardSteps}
      />
    </div>
  );
}

function AuditTimeline({
  logs,
  loading,
}: {
  logs: AuditLog[];
  loading: boolean;
}) {
  if (loading && logs.length === 0) {
    return (
      <div className="flex h-24 items-center justify-center text-xs text-muted-foreground">
        <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
        Loading audit log...
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
        No audit entries have been recorded for this goal yet.
      </div>
    );
  }

  return (
    <ol className="space-y-3">
      {logs.map((log) => (
        <li key={log.id} className="relative pl-5">
          <span className="absolute left-0 top-1.5 h-2 w-2 rounded-full bg-primary" />
          <div className="rounded-md border bg-muted/15 p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium">
                  {auditTitle(log)}
                </p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {new Date(log.createdAt).toLocaleString()}
                </p>
              </div>
              <Badge
                variant="outline"
                className={cn(
                  "shrink-0 text-[10px]",
                  log.module === "ticket" && "border-blue-500/40 text-blue-600",
                  log.module === "goal" && "border-green-500/40 text-green-600",
                )}
              >
                {log.module}
              </Badge>
            </div>
            <AuditDetails log={log} />
          </div>
        </li>
      ))}
    </ol>
  );
}

function AuditDetails({ log }: { log: AuditLog }) {
  const data = log.data ?? {};
  const details = [
    data.ticketTitle ? `Ticket: ${String(data.ticketTitle)}` : null,
    data.previousStatus || data.nextStatus
      ? `Status: ${String(data.previousStatus ?? "unknown")} -> ${String(
          data.nextStatus ?? data.status ?? "unknown",
        )}`
      : null,
    data.summary ? `Summary: ${String(data.summary)}` : null,
    data.path ? `File: ${String(data.path)}` : null,
  ].filter((detail): detail is string => Boolean(detail));

  if (details.length === 0) return null;

  return (
    <div className="mt-2 space-y-1 text-xs text-muted-foreground">
      {details.map((detail) => (
        <p key={detail}>{detail}</p>
      ))}
    </div>
  );
}

function auditTitle(log: AuditLog): string {
  const description = log.data?.description;
  if (typeof description === "string" && description.trim()) {
    return description;
  }
  return log.action
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/^\w/, (letter) => letter.toUpperCase());
}
