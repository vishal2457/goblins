import { API_PATHS, STATIC_BOARD_STEPS } from "@goblins/shared-constants";
import type {
  BoardStep,
  DiscoveredAgent,
  DiscoveredAgentsResponse,
  Goal,
  Project,
  ProjectModule,
  Ticket,
  TicketComment,
} from "@goblins/shared-constants";

const API_BASE =
  import.meta.env.VITE_AGENT_SERVER_URL || "";
const LIST_LIMIT = 100;
const DASHBOARD_CACHE_TTL_MS = 1_000;

type ApiEnvelope<T> = {
  result: T;
  status: string;
  statusCode: number;
  msg: string;
};

type ApiList<T> = {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

type DbProject = Omit<Project, "techPreferences"> & {
  techPreferences?: string[];
};
type DbGoal = Omit<
  Goal,
  | "constraints"
  | "acceptanceCriteria"
  | "relevantFiles"
  | "outOfScopeItems"
  | "ticketIds"
>;
type DbTicket = Omit<
  Ticket,
  | "projectId"
  | "stepStatus"
  | "stepHistory"
  | "acceptanceCriteria"
  | "technicalNotes"
  | "relevantFiles"
  | "dependencyIds"
  | "testPlan"
  | "verificationCommands"
> & { currentStepId: string | null };

type ProjectUpdateInput = Partial<
  Pick<Project, "name" | "location" | "baseBranch" | "executionMode">
> & {
  description?: string | null;
  testCommand?: string | null;
  lintCommand?: string | null;
  typeCheckCommand?: string | null;
  buildCommand?: string | null;
};

type DashboardData = {
  projects: Project[];
  goals: Goal[];
  tickets: Ticket[];
  boardSteps: BoardStep[];
};

type DashboardLoadOptions = {
  force?: boolean;
};

let dashboardCache: { data: DashboardData; loadedAt: number } | null = null;
let dashboardRequest: Promise<DashboardData> | null = null;

function invalidateDashboardCache() {
  dashboardCache = null;
}

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    let message = text;
    try {
      const parsed = JSON.parse(text) as { message?: string; msg?: string };
      message = parsed.message || parsed.msg || text;
    } catch {
      message = text;
    }
    throw new Error(
      `${res.status} ${res.statusText}${message ? `: ${message}` : ""}`,
    );
  }
  return res.json();
}

async function fetchResult<T>(url: string, options?: RequestInit): Promise<T> {
  const envelope = await fetchJson<ApiEnvelope<T>>(url, options);
  return envelope.result;
}

function listUrl(path: string): string {
  return `${path}?page=1&limit=${LIST_LIMIT}`;
}

function mapProject(project: DbProject): Project {
  return { ...project, techPreferences: project.techPreferences || [] };
}

function mapGoal(goal: DbGoal, ticketIds: string[] = []): Goal {
  return {
    ...goal,
    constraints: [],
    acceptanceCriteria: [],
    relevantFiles: [],
    outOfScopeItems: [],
    ticketIds,
  };
}

function mapTicket(ticket: DbTicket, projectId = ""): Ticket {
  return {
    ...ticket,
    projectId,
    currentStepId: ticket.currentStepId || "",
    stepStatus: null,
    stepHistory: [],
    acceptanceCriteria: [],
    technicalNotes: [],
    relevantFiles: [],
    dependencyIds: [],
    testPlan: [],
    verificationCommands: [],
  };
}

async function listProjects(): Promise<Project[]> {
  const result = await fetchResult<ApiList<DbProject>>(
    listUrl(API_PATHS.projects),
  );
  return result.data.map(mapProject);
}

async function listProjectModules(projectId: string): Promise<ProjectModule[]> {
  return fetchResult<ProjectModule[]>(API_PATHS.projectModules(projectId));
}

async function fetchGoalAndTicketLists(): Promise<
  [ApiList<DbGoal>, ApiList<DbTicket>]
> {
  return Promise.all([
    fetchResult<ApiList<DbGoal>>(listUrl(API_PATHS.goals)),
    fetchResult<ApiList<DbTicket>>(listUrl(API_PATHS.tickets)),
  ]);
}

function mapGoalsWithTickets(
  goalList: ApiList<DbGoal>,
  ticketList: ApiList<DbTicket>,
  projectId?: string,
): Goal[] {
  const ticketIdsByGoal = new Map<string, string[]>();
  for (const ticket of ticketList.data) {
    const ids = ticketIdsByGoal.get(ticket.goalId) || [];
    ids.push(ticket.id);
    ticketIdsByGoal.set(ticket.goalId, ids);
  }
  return goalList.data
    .filter((goal) => !projectId || goal.projectId === projectId)
    .map((goal) => mapGoal(goal, ticketIdsByGoal.get(goal.id) || []));
}

function mapTicketsWithGoals(
  ticketList: ApiList<DbTicket>,
  goals: Goal[],
  goalId?: string,
): Ticket[] {
  const projectByGoal = new Map(goals.map((goal) => [goal.id, goal.projectId]));
  return ticketList.data
    .filter((ticket) => !goalId || ticket.goalId === goalId)
    .map((ticket) => mapTicket(ticket, projectByGoal.get(ticket.goalId) || ""));
}

async function listGoals(projectId?: string): Promise<Goal[]> {
  const [goalList, ticketList] = await fetchGoalAndTicketLists();
  return mapGoalsWithTickets(goalList, ticketList, projectId);
}

async function listTickets(goalId?: string): Promise<Ticket[]> {
  const [goalList, ticketList] = await fetchGoalAndTicketLists();
  return mapTicketsWithGoals(
    ticketList,
    mapGoalsWithTickets(goalList, ticketList),
    goalId,
  );
}

async function listTicketComments(
  ticketId: string,
  page = 1,
  limit = 100,
): Promise<TicketComment[]> {
  const result = await fetchResult<ApiList<TicketComment>>(
    `${API_PATHS.ticketComments(ticketId)}?page=${page}&limit=${limit}`,
  );
  return result.data;
}

async function fetchDashboardData(): Promise<DashboardData> {
  const [projects, goalList, ticketList] = await Promise.all([
    listProjects(),
    fetchResult<ApiList<DbGoal>>(listUrl(API_PATHS.goals)),
    fetchResult<ApiList<DbTicket>>(listUrl(API_PATHS.tickets)),
  ]);
  const goals = mapGoalsWithTickets(goalList, ticketList);
  return {
    projects,
    goals,
    tickets: mapTicketsWithGoals(ticketList, goals),
    boardSteps: STATIC_BOARD_STEPS,
  };
}

async function loadDashboardData(
  options: DashboardLoadOptions = {},
): Promise<DashboardData> {
  if (!options.force) {
    if (
      dashboardCache &&
      Date.now() - dashboardCache.loadedAt < DASHBOARD_CACHE_TTL_MS
    ) {
      return dashboardCache.data;
    }
    if (dashboardRequest) return dashboardRequest;
  }

  dashboardRequest = fetchDashboardData().then((data) => {
    dashboardCache = { data, loadedAt: Date.now() };
    return data;
  });

  try {
    return await dashboardRequest;
  } finally {
    dashboardRequest = null;
  }
}

export const legacyApi = {
  projects: {
    list: listProjects,
    get: async (id: string) =>
      mapProject(await fetchResult<DbProject>(API_PATHS.projectById(id))),
    create: async (data: {
      name: string;
      location: string;
      description?: string;
      techPreferences?: string[];
      baseBranch?: string;
      executionMode?: "direct" | "worktree";
      testCommand?: string;
      lintCommand?: string;
      typeCheckCommand?: string;
      buildCommand?: string;
    }) => {
      const project = mapProject(
        await fetchResult<DbProject>(API_PATHS.projects, {
          method: "POST",
          body: JSON.stringify({
            ...data,
            baseBranch: data.baseBranch || "main",
            executionMode: data.executionMode || "direct",
          }),
        }),
      );
      invalidateDashboardCache();
      return project;
    },
    update: async (id: string, data: ProjectUpdateInput) => {
      const project = mapProject(
        await fetchResult<DbProject>(API_PATHS.projectById(id), {
          method: "PATCH",
          body: JSON.stringify(data),
        }),
      );
      invalidateDashboardCache();
      return project;
    },
    modules: {
      list: listProjectModules,
      create: async (
        projectId: string,
        data: { name: string; shortDescription?: string },
      ) => {
        const projectModule = await fetchResult<ProjectModule>(
          API_PATHS.projectModules(projectId),
          {
            method: "POST",
            body: JSON.stringify(data),
          },
        );
        invalidateDashboardCache();
        return projectModule;
      },
    },
    agents: {
      discover: (projectId: string) =>
        fetchResult<DiscoveredAgentsResponse>(API_PATHS.projectAgents(projectId)),
      updateInstructions: (
        projectId: string,
        data: { agentId: string; instructions: string },
      ) =>
        fetchResult<DiscoveredAgent>(
          API_PATHS.projectAgentInstructions(projectId),
          {
            method: "PUT",
            body: JSON.stringify(data),
          },
        ),
    },
  },

  goals: {
    list: listGoals,
    get: async (id: string) =>
      mapGoal(await fetchResult<DbGoal>(API_PATHS.goalById(id))),
    create: async (data: {
      projectId: string;
      title: string;
      description?: string;
      technicalInstructions?: string;
      maxRetries?: number;
    }) => {
      const goal = mapGoal(
        await fetchResult<DbGoal>(API_PATHS.goals, {
          method: "POST",
          body: JSON.stringify({
            projectId: data.projectId,
            title: data.title,
            description: data.description || "",
            technicalInstructions: data.technicalInstructions,
            maxRetries: data.maxRetries ?? 3,
          }),
        }),
      );
      invalidateDashboardCache();
      return goal;
    },
    update: async (
      id: string,
      data: Partial<
        Pick<
          Goal,
          "title" | "description" | "technicalInstructions" | "maxRetries"
        >
      >,
    ) => {
      const goal = mapGoal(
        await fetchResult<DbGoal>(API_PATHS.goalById(id), {
          method: "PATCH",
          body: JSON.stringify(data),
        }),
      );
      invalidateDashboardCache();
      return goal;
    },
    startPlanning: async (id: string) => {
      const goal = mapGoal(
        await fetchResult<DbGoal>(API_PATHS.goalPlanningStart(id), {
          method: "POST",
        }),
      );
      invalidateDashboardCache();
      return goal;
    },
    startExecution: async (id: string) => {
      const goal = mapGoal(
        await fetchResult<DbGoal>(API_PATHS.goalExecutionStart(id), {
          method: "POST",
        }),
      );
      invalidateDashboardCache();
      return goal;
    },
    startRetrospective: async (id: string, userPoints?: string) => {
      const goal = mapGoal(
        await fetchResult<DbGoal>(API_PATHS.goalRetrospectiveStart(id), {
          method: "POST",
          body: JSON.stringify({ userPoints }),
        }),
      );
      invalidateDashboardCache();
      return goal;
    },
    completeRetrospective: async (id: string) => {
      const goal = mapGoal(
        await fetchResult<DbGoal>(API_PATHS.goalRetrospectiveComplete(id), {
          method: "POST",
        }),
      );
      invalidateDashboardCache();
      return goal;
    },
    pause: async (id: string) => {
      const goal = await fetchResult<DbGoal>(API_PATHS.goalById(id), {
        method: "PATCH",
        body: JSON.stringify({ status: "paused" }),
      }).then((goal) => mapGoal(goal));
      invalidateDashboardCache();
      return goal;
    },
    resume: async (id: string) => {
      const goal = mapGoal(await fetchResult<DbGoal>(API_PATHS.goalById(id)));
      const planningPhase = goal.phases.find(
        (phase) => phase.id === "planning",
      );
      const executionPhase = goal.phases.find(
        (phase) => phase.id === "execution",
      );
      const retrospectivePhase = goal.phases.find(
        (phase) => phase.id === "retrospective",
      );
      if (
        retrospectivePhase?.status === "paused" ||
        retrospectivePhase?.status === "in_progress" ||
        goal.status === "retrospective"
      ) {
        return legacyApi.goals.startRetrospective(id);
      }
      if (
        executionPhase?.status === "paused" ||
        executionPhase?.status === "in_progress" ||
        planningPhase?.status === "completed"
      ) {
        return legacyApi.goals.startExecution(id);
      }
      return legacyApi.goals.startPlanning(id);
    },
    cancel: async (id: string) => {
      const goal = await fetchResult<DbGoal>(API_PATHS.goalById(id), {
        method: "PATCH",
        body: JSON.stringify({ status: "cancelled" }),
      }).then(mapGoal);
      invalidateDashboardCache();
      return goal;
    },
    reset: async (id: string) => {
      const goal = await fetchResult<DbGoal>(API_PATHS.goalById(id), {
        method: "PATCH",
        body: JSON.stringify({
          status: "draft",
          phases: [
            { id: "planning", status: "pending", position: 0 },
            { id: "execution", status: "pending", position: 1 },
            { id: "retrospective", status: "pending", position: 2 },
          ],
          startedAt: null,
          completedAt: null,
          lastError: null,
        }),
      }).then(mapGoal);
      invalidateDashboardCache();
      return goal;
    },
    tickets: { list: listTickets },
  },

  dashboard: {
    load: loadDashboardData,
    invalidate: invalidateDashboardCache,
  },

  tickets: {
    listByModule: async (moduleId: string) =>
      (await fetchResult<DbTicket[]>(API_PATHS.moduleTickets(moduleId))).map(
        (ticket) => mapTicket(ticket),
      ),
    remove: async (id: string) => {
      const response = await fetch(`${API_BASE}${API_PATHS.ticketById(id)}`, {
        method: "DELETE",
      });
      if (response.ok) invalidateDashboardCache();
      return response;
    },
    comments: {
      list: listTicketComments,
    },
  },

  boardSteps: {
    list: async (projectId?: string) => {
      void projectId;
      return STATIC_BOARD_STEPS;
    },
  },
};
