import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { type Ticket } from "@goblins/shared-constants";
import { TicketDetailsDialog } from "../../components/TicketDetailsDialog";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { useDashboardSelection } from "../../hooks/useDashboardSelection";
import {
  useCancelGoalMutation,
  useCompleteRetrospectiveMutation,
  usePauseGoalMutation,
  useResumeGoalMutation,
  useStartGoalWorkflowMutation,
  useStartRetrospectiveMutation,
} from "../../shared/api/features/goal/goal.queries";
import {
  useDashboardQuery,
  useGoalAuditLogsQuery,
} from "../../shared/api/features/dashboard/dashboard.queries";
import { DashboardToolbar } from "./components/DashboardToolbar";
import { GoalDetailsSheet } from "./components/GoalDetailsSheet";
import { GoalErrorBanner } from "./components/GoalErrorBanner";
import { KanbanColumn } from "./components/KanbanColumn";
import { RetrospectiveDialog } from "./components/RetrospectiveDialog";
import {
  LayoutGrid,
  FolderOpen,
  XCircle as XCircleIcon,
  Loader2,
} from "lucide-react";

export function DashboardPage() {
  const navigate = useNavigate();
  const dashboardQuery = useDashboardQuery();
  const projects = dashboardQuery.data?.projects || [];
  const goals = dashboardQuery.data?.goals || [];
  const tickets = dashboardQuery.data?.tickets || [];
  const boardSteps = dashboardQuery.data?.boardSteps || [];
  const {
    selectedProjectId,
    setSelectedProjectId,
    selectedGoalId,
    setSelectedGoalId,
  } = useDashboardSelection(projects, goals);
  const auditLogsQuery = useGoalAuditLogsQuery(selectedGoalId);
  const startGoalWorkflowMutation = useStartGoalWorkflowMutation();
  const pauseGoalMutation = usePauseGoalMutation();
  const resumeGoalMutation = useResumeGoalMutation();
  const cancelGoalMutation = useCancelGoalMutation();
  const startRetrospectiveMutation = useStartRetrospectiveMutation();
  const completeRetrospectiveMutation = useCompleteRetrospectiveMutation();

  const [viewingTicketDetails, setViewingTicketDetails] =
    useState<Ticket | null>(null);
  const [isGoalSheetOpen, setIsGoalSheetOpen] = useState(false);
  const [isRetrospectiveDialogOpen, setIsRetrospectiveDialogOpen] =
    useState(false);
  const [retrospectiveUserPoints, setRetrospectiveUserPoints] = useState("");

  const handleProjectSelect = (projectId: string) => {
    setSelectedProjectId(projectId);
    const projectGoals = goals.filter((goal) => goal.projectId === projectId);
    setSelectedGoalId(projectGoals[0]?.id || null);
  };

  const handleExecuteGoal = async () => {
    const selectedGoal = goals.find((goal) => goal.id === selectedGoalId);
    if (!selectedGoal) return;
    await startGoalWorkflowMutation.mutateAsync(selectedGoal);
  };

  const handlePauseGoal = async () => {
    if (!selectedGoalId) return;
    await pauseGoalMutation.mutateAsync(selectedGoalId);
  };

  const handleResumeGoal = async () => {
    if (!selectedGoalId) return;
    await resumeGoalMutation.mutateAsync(selectedGoalId);
  };

  const handleCancelGoal = async () => {
    if (!selectedGoalId) return;
    await cancelGoalMutation.mutateAsync(selectedGoalId);
  };

  const handleStartRetrospective = async () => {
    if (!selectedGoalId) return;
    const goal = await startRetrospectiveMutation.mutateAsync({
      goalId: selectedGoalId,
      userPoints: retrospectiveUserPoints,
    });
    if (!goal) return;
    setRetrospectiveUserPoints("");
    setIsRetrospectiveDialogOpen(false);
  };

  const handleCompleteRetrospective = async () => {
    if (!selectedGoalId) return;
    await completeRetrospectiveMutation.mutateAsync(selectedGoalId);
  };

  const currentProjectGoals = goals.filter(
    (goal) => goal.projectId === selectedProjectId,
  );
  const selectedProject = projects.find((project) => project.id === selectedProjectId);
  const selectedGoal = goals.find((goal) => goal.id === selectedGoalId);
  const displayTickets = selectedGoalId
    ? tickets.filter((ticket) => ticket.goalId === selectedGoalId)
    : [];
  const errorMessage =
    dashboardQuery.error instanceof Error
      ? dashboardQuery.error.message
      : dashboardQuery.error
        ? "Failed to fetch data"
        : null;

  if (dashboardQuery.isLoading) {
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

  if (errorMessage && projects.length === 0) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4 max-w-md text-center">
          <XCircleIcon className="h-8 w-8 text-red-500" />
          <span className="text-sm text-muted-foreground">{errorMessage}</span>
          <Button variant="outline" onClick={() => void dashboardQuery.refetch()}>
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
    (selectedGoal?.status === "failed" && selectedGoal.ticketIds.length === 0) ||
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
      <DashboardToolbar
        projects={projects}
        currentProjectGoals={currentProjectGoals}
        selectedProjectId={selectedProjectId || ""}
        selectedGoalId={selectedGoalId || ""}
        selectedGoal={selectedGoal}
        canExecute={Boolean(canExecute)}
        executeGoalLabel={executeGoalLabel}
        isGoalRunning={isGoalRunning}
        isGoalPaused={isGoalPaused}
        isGoalCancelled={isGoalCancelled}
        canStartRetrospective={canStartRetrospective}
        isGoalRetrospective={isGoalRetrospective}
        onProjectSelect={handleProjectSelect}
        onGoalSelect={(goalId) => setSelectedGoalId(goalId)}
        onOpenGoalDetails={() => setIsGoalSheetOpen(true)}
        onExecuteGoal={() => void handleExecuteGoal()}
        onPauseGoal={() => void handlePauseGoal()}
        onResumeGoal={() => void handleResumeGoal()}
        onCancelGoal={() => void handleCancelGoal()}
        onOpenRetrospective={() => setIsRetrospectiveDialogOpen(true)}
        onCompleteRetrospective={() => void handleCompleteRetrospective()}
      />

      <GoalErrorBanner error={visibleGoalError} />

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

      <RetrospectiveDialog
        open={isRetrospectiveDialogOpen}
        userPoints={retrospectiveUserPoints}
        isStarting={startRetrospectiveMutation.isPending}
        onOpenChange={setIsRetrospectiveDialogOpen}
        onUserPointsChange={setRetrospectiveUserPoints}
        onStart={() => void handleStartRetrospective()}
      />

      <GoalDetailsSheet
        open={isGoalSheetOpen}
        onClose={() => setIsGoalSheetOpen(false)}
        selectedProject={selectedProject}
        selectedGoal={selectedGoal}
        auditLogs={auditLogsQuery.data || []}
        auditLogsLoading={auditLogsQuery.isLoading || auditLogsQuery.isFetching}
      />

      <TicketDetailsDialog
        ticket={viewingTicketDetails}
        onClose={() => setViewingTicketDetails(null)}
        boardSteps={boardSteps}
      />
    </div>
  );
}
