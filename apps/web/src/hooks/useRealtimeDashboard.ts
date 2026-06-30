import { useState, useEffect, useCallback, useRef } from "react";
import { api } from "../lib/api";
import { useToast } from "../components/ui/toaster";
import type {
  AuditLog,
  BoardStep,
  DiscoveredAgent,
  DiscoveredAgentsResponse,
  Goal,
  Project,
  RealtimeEvent,
  Ticket,
} from "@goblins/shared-constants";

type RefreshOptions = {
  force?: boolean;
};

const REALTIME_REFRESH_DELAY_MS = 250;

export function useRealtimeDashboard() {
  const toast = useToast();
  const [projects, setProjects] = useState<Project[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [auditLogsLoading, setAuditLogsLoading] = useState(false);
  const [boardSteps, setBoardSteps] = useState<BoardStep[]>([]);
  const [discoveredAgents, setDiscoveredAgents] =
    useState<DiscoveredAgentsResponse | null>(null);
  const [discoveredAgentsLoading, setDiscoveredAgentsLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    () => {
      if (typeof window === "undefined") return null;
      return new URLSearchParams(window.location.search).get("projectId");
    },
  );
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return new URLSearchParams(window.location.search).get("goalId");
  });
  const selectedProjectIdRef = useRef<string | null>(selectedProjectId);
  const selectedGoalIdRef = useRef<string | null>(selectedGoalId);
  const refreshTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    selectedProjectIdRef.current = selectedProjectId;
    selectedGoalIdRef.current = selectedGoalId;
  }, [selectedGoalId, selectedProjectId]);

  const refresh = useCallback(async (options: RefreshOptions = {}) => {
    try {
      const data = await api.dashboard.load(options);
      setProjects(data.projects);
      setGoals(data.goals);
      setTickets(data.tickets);
      setBoardSteps(data.boardSteps);
      reconcileSelection(
        data.projects,
        data.goals,
        selectedProjectIdRef.current,
        selectedGoalIdRef.current,
        setSelectedProjectId,
        setSelectedGoalId,
      );
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch data");
      toast.error(
        "Failed to refresh dashboard",
        e instanceof Error ? e.message : "Failed to fetch data",
      );
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const refreshAuditLogs = useCallback(
    async (goalId = selectedGoalIdRef.current) => {
      if (!goalId) {
        setAuditLogs([]);
        return;
      }

      setAuditLogsLoading(true);
      try {
        setAuditLogs(await api.auditLogs.listByGoal(goalId));
      } catch (e) {
        toast.error(
          "Failed to load audit logs",
          e instanceof Error ? e.message : "Failed to fetch audit logs",
        );
      } finally {
        setAuditLogsLoading(false);
      }
    },
    [toast],
  );

  const scheduleRealtimeRefresh = useCallback(() => {
    if (refreshTimeoutRef.current) {
      window.clearTimeout(refreshTimeoutRef.current);
    }
    refreshTimeoutRef.current = window.setTimeout(() => {
      refreshTimeoutRef.current = null;
      void refresh({ force: true });
      void refreshAuditLogs();
    }, REALTIME_REFRESH_DELAY_MS);
  }, [refresh, refreshAuditLogs]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    void refreshAuditLogs(selectedGoalId);
  }, [refreshAuditLogs, selectedGoalId]);

  useEffect(() => {
    if (typeof window === "undefined" || typeof EventSource === "undefined")
      return;

    const source = new EventSource(api.realtime.eventsUrl());
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
      scheduleRealtimeRefresh();
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
  }, [scheduleRealtimeRefresh, toast]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const currentProject = params.get("projectId");
    const currentGoal = params.get("goalId");
    if (selectedProjectId) params.set("projectId", selectedProjectId);
    else params.delete("projectId");
    if (selectedGoalId) params.set("goalId", selectedGoalId);
    else params.delete("goalId");
    if (
      params.get("projectId") === currentProject &&
      params.get("goalId") === currentGoal
    )
      return;
    const nextSearch = params.toString();
    const nextUrl = `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ""}${window.location.hash}`;
    window.history.replaceState(null, "", nextUrl);
  }, [selectedGoalId, selectedProjectId]);

  const addProject = useCallback(
    async (
      name: string,
      location: string,
      executionMode: "direct" | "worktree" = "direct",
    ): Promise<Project | null> => {
      try {
        const project = await api.projects.create({
          name,
          location,
          executionMode,
        });
        setProjects((prev) => [...prev, project]);
        if (!selectedProjectId) setSelectedProjectId(project.id);
        toast.success("Project created", project.name);
        return project;
      } catch (e) {
        const message = e instanceof Error ? e.message : "Failed to create project";
        setError(message);
        toast.error("Failed to create project", message);
        return null;
      }
    },
    [selectedProjectId, toast],
  );

  const updateProject = useCallback(
    async (
      id: string,
      data: Partial<
        Pick<Project, "name" | "location" | "baseBranch" | "executionMode">
      > & {
        description?: string | null;
        testCommand?: string | null;
        lintCommand?: string | null;
        typeCheckCommand?: string | null;
        buildCommand?: string | null;
      },
    ): Promise<Project | null> => {
      try {
        const project = await api.projects.update(id, data);
        setProjects((previous) =>
          previous.map((item) => (item.id === id ? project : item)),
        );
        setError(null);
        toast.success("Project updated", project.name);
        return project;
      } catch (e) {
        const message = e instanceof Error ? e.message : "Failed to update project";
        setError(message);
        toast.error("Failed to update project", message);
        return null;
      }
    },
    [toast],
  );

  const addGoal = useCallback(
    async (
      projectId: string,
      title: string,
      description: string,
    ): Promise<Goal | null> => {
      try {
        const goal = await api.goals.create({ projectId, title, description });
        setGoals((prev) => [...prev, goal]);
        toast.success("Goal created", goal.title);
        return goal;
      } catch (e) {
        const message = e instanceof Error ? e.message : "Failed to create goal";
        setError(message);
        toast.error("Failed to create goal", message);
        return null;
      }
    },
    [toast],
  );

  const updateGoal = useCallback(
    async (
      id: string,
      data: Partial<
        Pick<
          Goal,
          | "title"
          | "description"
          | "technicalInstructions"
          | "maxRetries"
        >
      >,
    ) => {
      try {
        const updated = await api.goals.update(id, data);
        setGoals((previous) =>
          previous.map((goal) =>
            goal.id === id ? { ...goal, ...updated } : goal,
          ),
        );
        setError(null);
        toast.success("Goal updated", updated.title);
        return updated;
      } catch (e) {
        const message = e instanceof Error ? e.message : "Failed to update goal";
        setError(message);
        toast.error("Failed to update goal", message);
        return null;
      }
    },
    [toast],
  );

  const resetGoalPlanning = useCallback(
    async (goalId: string) => {
      try {
        const goalTickets = await api.goals.tickets.list(goalId);
        const responses = await Promise.all(
          goalTickets.map((ticket) => api.tickets.remove(ticket.id)),
        );
        const failed = responses.find((response) => !response.ok);
        if (failed)
          throw new Error(
            `Failed to delete planning ticket (${failed.status})`,
          );

        const updated = await api.goals.reset(goalId);
        setGoals((previous) =>
          previous.map((goal) =>
            goal.id === goalId ? { ...goal, ...updated, ticketIds: [] } : goal,
          ),
        );
        setTickets((previous) =>
          previous.filter((ticket) => ticket.goalId !== goalId),
        );
        setError(null);
        toast.success("Planning data reset");
        await refresh({ force: true });
        return updated;
      } catch (e) {
        const message =
          e instanceof Error ? e.message : "Failed to reset planning data";
        setError(message);
        toast.error("Failed to reset planning data", message);
        return null;
      }
    },
    [refresh, toast],
  );

  const executeGoal = useCallback(
    async (goalId: string) => {
      try {
        const goal = goals.find((item) => item.id === goalId);
        if (!goal) throw new Error("Goal is not loaded");
        if (goal.status === "ready" || goal.phases.some((phase) => phase.id === "planning" && phase.status === "completed")) {
          await api.goals.startExecution(goalId);
        } else {
          await api.goals.startPlanning(goalId);
        }
        setError(null);
        toast.success("Goal workflow started");
        await refresh({ force: true });
        await refreshAuditLogs(goalId);
      } catch (e) {
        const message =
          e instanceof Error ? e.message : "Failed to update goal phase";
        setError(message);
        toast.error("Failed to update goal phase", message);
      }
    },
    [goals, refresh, refreshAuditLogs, toast],
  );

  const pauseGoal = useCallback(
    async (goalId: string) => {
      try {
        await api.goals.pause(goalId);
        toast.success("Goal paused");
        await refresh({ force: true });
        await refreshAuditLogs(goalId);
      } catch (e) {
        const message = e instanceof Error ? e.message : "Failed to pause goal";
        setError(message);
        toast.error("Failed to pause goal", message);
      }
    },
    [refresh, refreshAuditLogs, toast],
  );

  const resumeGoal = useCallback(
    async (goalId: string) => {
      try {
        await api.goals.resume(goalId);
        toast.success("Goal resumed");
        await refresh({ force: true });
        await refreshAuditLogs(goalId);
      } catch (e) {
        const message = e instanceof Error ? e.message : "Failed to resume goal";
        setError(message);
        toast.error("Failed to resume goal", message);
      }
    },
    [refresh, refreshAuditLogs, toast],
  );

  const cancelGoal = useCallback(
    async (goalId: string) => {
      try {
        await api.goals.cancel(goalId);
        toast.success("Goal cancelled");
        await refresh({ force: true });
        await refreshAuditLogs(goalId);
      } catch (e) {
        const message = e instanceof Error ? e.message : "Failed to cancel goal";
        setError(message);
        toast.error("Failed to cancel goal", message);
      }
    },
    [refresh, refreshAuditLogs, toast],
  );

  const startRetrospective = useCallback(
    async (goalId: string, userPoints?: string) => {
      try {
        const goal = await api.goals.startRetrospective(goalId, userPoints);
        setGoals((previous) =>
          previous.map((item) =>
            item.id === goalId ? { ...item, ...goal } : item,
          ),
        );
        setError(null);
        toast.success("Retrospective started");
        await refresh({ force: true });
        await refreshAuditLogs(goalId);
        return goal;
      } catch (e) {
        const message =
          e instanceof Error ? e.message : "Failed to start retrospective";
        setError(message);
        toast.error("Failed to start retrospective", message);
        return null;
      }
    },
    [refresh, refreshAuditLogs, toast],
  );

  const completeRetrospective = useCallback(
    async (goalId: string) => {
      try {
        const goal = await api.goals.completeRetrospective(goalId);
        setGoals((previous) =>
          previous.map((item) =>
            item.id === goalId ? { ...item, ...goal } : item,
          ),
        );
        setError(null);
        toast.success("Retrospective completed");
        await refresh({ force: true });
        await refreshAuditLogs(goalId);
        return goal;
      } catch (e) {
        const message =
          e instanceof Error ? e.message : "Failed to complete retrospective";
        setError(message);
        toast.error("Failed to complete retrospective", message);
        return null;
      }
    },
    [refresh, refreshAuditLogs, toast],
  );

  const refreshDiscoveredAgents = useCallback(async () => {
    if (!selectedProjectIdRef.current) {
      setDiscoveredAgents(null);
      return null;
    }
    setDiscoveredAgentsLoading(true);
    try {
      const result = await api.projects.agents.discover(
        selectedProjectIdRef.current,
      );
      setDiscoveredAgents(result);
      setError(null);
      return result;
    } catch (e) {
      const message =
        e instanceof Error ? e.message : "Failed to discover subagents";
      setError(message);
      toast.error("Failed to discover subagents", message);
      setDiscoveredAgents(null);
      return null;
    } finally {
      setDiscoveredAgentsLoading(false);
    }
  }, [toast]);

  const updateDiscoveredAgentInstructions = useCallback(
    async (
      agentId: string,
      instructions: string,
    ): Promise<DiscoveredAgent | null> => {
      if (!selectedProjectIdRef.current) return null;
      try {
        const updated = await api.projects.agents.updateInstructions(
          selectedProjectIdRef.current,
          { agentId, instructions },
        );
        setDiscoveredAgents((previous) =>
          previous
            ? {
                ...previous,
                agents: previous.agents.map((agent) =>
                  agent.id === updated.id ? updated : agent,
                ),
              }
            : previous,
        );
        setError(null);
        toast.success("Subagent updated", updated.displayName);
        return updated;
      } catch (e) {
        const message =
          e instanceof Error ? e.message : "Failed to update subagent";
        setError(message);
        toast.error("Failed to update subagent", message);
        return null;
      }
    },
    [toast],
  );

  return {
    projects,
    goals,
    tickets,
    auditLogs,
    auditLogsLoading,
    boardSteps,
    discoveredAgents,
    discoveredAgentsLoading,
    loading,
    error,
    selectedProjectId,
    setSelectedProjectId,
    selectedGoalId,
    setSelectedGoalId,
    addProject,
    updateProject,
    addGoal,
    updateGoal,
    resetGoalPlanning,
    executeGoal,
    pauseGoal,
    resumeGoal,
    cancelGoal,
    startRetrospective,
    completeRetrospective,
    refreshDiscoveredAgents,
    updateDiscoveredAgentInstructions,
    refreshAuditLogs,
    refresh,
  };
}

function reconcileSelection(
  projects: Project[],
  goals: Goal[],
  selectedProjectId: string | null,
  selectedGoalId: string | null,
  setSelectedProjectId: (value: string | null) => void,
  setSelectedGoalId: (value: string | null) => void,
) {
  const selectedGoal = selectedGoalId
    ? goals.find((goal) => goal.id === selectedGoalId)
    : undefined;
  const projectId =
    selectedGoal?.projectId ||
    (selectedProjectId &&
    projects.some((project) => project.id === selectedProjectId)
      ? selectedProjectId
      : projects[0]?.id || null);
  const projectGoals = projectId
    ? goals.filter((goal) => goal.projectId === projectId)
    : [];
  const goalId =
    selectedGoal && selectedGoal.projectId === projectId
      ? selectedGoal.id
      : projectGoals[0]?.id || null;

  if (projectId !== selectedProjectId) setSelectedProjectId(projectId);
  if (goalId !== selectedGoalId) setSelectedGoalId(goalId);
}
