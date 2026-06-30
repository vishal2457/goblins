import { API_PATHS, STATIC_BOARD_STEPS } from "@goblins/shared-constants";
import type {
  AuditLog,
  BoardStep,
  DiscoveredAgent,
  DiscoveredAgentsResponse,
  Goal,
  Project,
  ProjectModule,
  Ticket,
  TicketComment,
} from "@goblins/shared-constants";
import { apiClient } from "./client";

const LIST_LIMIT = 100;

type ApiEnvelope<T> = {
  result: T;
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

export type ProjectUpdateInput = Partial<
  Pick<Project, "name" | "location" | "baseBranch" | "executionMode">
> & {
  description?: string | null;
  testCommand?: string | null;
  lintCommand?: string | null;
  typeCheckCommand?: string | null;
  buildCommand?: string | null;
};

export type GoalUpdateInput = Partial<
  Pick<Goal, "title" | "description" | "technicalInstructions" | "maxRetries">
>;

export type DashboardData = {
  projects: Project[];
  goals: Goal[];
  tickets: Ticket[];
  boardSteps: BoardStep[];
};

async function getResult<T>(url: string): Promise<T> {
  const { data } = await apiClient.get<ApiEnvelope<T>>(url);
  return data.result;
}

async function postResult<T>(url: string, body?: unknown): Promise<T> {
  const { data } = await apiClient.post<ApiEnvelope<T>>(url, body);
  return data.result;
}

async function patchResult<T>(url: string, body?: unknown): Promise<T> {
  const { data } = await apiClient.patch<ApiEnvelope<T>>(url, body);
  return data.result;
}

async function deleteResult(url: string): Promise<void> {
  await apiClient.delete(url);
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

async function fetchGoalAndTicketLists(): Promise<
  [ApiList<DbGoal>, ApiList<DbTicket>]
> {
  return Promise.all([
    getResult<ApiList<DbGoal>>(listUrl(API_PATHS.goals)),
    getResult<ApiList<DbTicket>>(listUrl(API_PATHS.tickets)),
  ]);
}

export async function listProjects(): Promise<Project[]> {
  const result = await getResult<ApiList<DbProject>>(listUrl(API_PATHS.projects));
  return result.data.map(mapProject);
}

export async function getProject(id: string): Promise<Project> {
  return mapProject(await getResult<DbProject>(API_PATHS.projectById(id)));
}

export async function createProject(data: {
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
}): Promise<Project> {
  return mapProject(
    await postResult<DbProject>(API_PATHS.projects, {
      ...data,
      baseBranch: data.baseBranch || "main",
      executionMode: data.executionMode || "direct",
    }),
  );
}

export async function updateProject(
  id: string,
  data: ProjectUpdateInput,
): Promise<Project> {
  return mapProject(
    await patchResult<DbProject>(API_PATHS.projectById(id), data),
  );
}

export async function listProjectModules(
  projectId: string,
): Promise<ProjectModule[]> {
  return getResult<ProjectModule[]>(API_PATHS.projectModules(projectId));
}

export async function createProjectModule(
  projectId: string,
  data: { name: string; shortDescription?: string },
): Promise<ProjectModule> {
  return postResult<ProjectModule>(API_PATHS.projectModules(projectId), data);
}

export async function discoverProjectAgents(
  projectId: string,
): Promise<DiscoveredAgentsResponse> {
  return getResult<DiscoveredAgentsResponse>(API_PATHS.projectAgents(projectId));
}

export async function updateProjectAgentInstructions(
  projectId: string,
  data: { agentId: string; instructions: string },
): Promise<DiscoveredAgent> {
  const { data: response } = await apiClient.put<ApiEnvelope<DiscoveredAgent>>(
    API_PATHS.projectAgentInstructions(projectId),
    data,
  );

  return response.result;
}

export async function listGoals(projectId?: string): Promise<Goal[]> {
  const [goalList, ticketList] = await fetchGoalAndTicketLists();
  return mapGoalsWithTickets(goalList, ticketList, projectId);
}

export async function getGoal(id: string): Promise<Goal> {
  return mapGoal(await getResult<DbGoal>(API_PATHS.goalById(id)));
}

export async function createGoal(data: {
  projectId: string;
  title: string;
  description?: string;
  technicalInstructions?: string;
  maxRetries?: number;
}): Promise<Goal> {
  return mapGoal(
    await postResult<DbGoal>(API_PATHS.goals, {
      projectId: data.projectId,
      title: data.title,
      description: data.description || "",
      technicalInstructions: data.technicalInstructions,
      maxRetries: data.maxRetries ?? 3,
    }),
  );
}

export async function updateGoal(
  id: string,
  data: GoalUpdateInput,
): Promise<Goal> {
  return mapGoal(await patchResult<DbGoal>(API_PATHS.goalById(id), data));
}

export async function startPlanningGoal(id: string): Promise<Goal> {
  return mapGoal(await postResult<DbGoal>(API_PATHS.goalPlanningStart(id)));
}

export async function startExecutionGoal(id: string): Promise<Goal> {
  return mapGoal(await postResult<DbGoal>(API_PATHS.goalExecutionStart(id)));
}

export async function startRetrospectiveGoal(
  id: string,
  userPoints?: string,
): Promise<Goal> {
  return mapGoal(
    await postResult<DbGoal>(API_PATHS.goalRetrospectiveStart(id), {
      userPoints,
    }),
  );
}

export async function completeRetrospectiveGoal(id: string): Promise<Goal> {
  return mapGoal(
    await postResult<DbGoal>(API_PATHS.goalRetrospectiveComplete(id)),
  );
}

export async function pauseGoal(id: string): Promise<Goal> {
  return mapGoal(
    await patchResult<DbGoal>(API_PATHS.goalById(id), { status: "paused" }),
  );
}

export async function resumeGoal(id: string): Promise<Goal> {
  const goal = await getGoal(id);
  const planningPhase = goal.phases.find((phase) => phase.id === "planning");
  const executionPhase = goal.phases.find((phase) => phase.id === "execution");
  const retrospectivePhase = goal.phases.find(
    (phase) => phase.id === "retrospective",
  );

  if (
    retrospectivePhase?.status === "paused" ||
    retrospectivePhase?.status === "in_progress" ||
    goal.status === "retrospective"
  ) {
    return startRetrospectiveGoal(id);
  }

  if (
    executionPhase?.status === "paused" ||
    executionPhase?.status === "in_progress" ||
    planningPhase?.status === "completed"
  ) {
    return startExecutionGoal(id);
  }

  return startPlanningGoal(id);
}

export async function cancelGoal(id: string): Promise<Goal> {
  return mapGoal(
    await patchResult<DbGoal>(API_PATHS.goalById(id), {
      status: "cancelled",
    }),
  );
}

export async function resetGoal(id: string): Promise<Goal> {
  return mapGoal(
    await patchResult<DbGoal>(API_PATHS.goalById(id), {
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
  );
}

export async function listGoalTickets(goalId?: string): Promise<Ticket[]> {
  const [goalList, ticketList] = await fetchGoalAndTicketLists();

  return mapTicketsWithGoals(
    ticketList,
    mapGoalsWithTickets(goalList, ticketList),
    goalId,
  );
}

export async function listModuleTickets(moduleId: string): Promise<Ticket[]> {
  const tickets = await getResult<DbTicket[]>(API_PATHS.moduleTickets(moduleId));
  return tickets.map((ticket) => mapTicket(ticket));
}

export async function deleteTicket(id: string): Promise<void> {
  await deleteResult(API_PATHS.ticketById(id));
}

export async function listTicketComments(
  ticketId: string,
  page = 1,
  limit = 100,
): Promise<TicketComment[]> {
  const result = await getResult<ApiList<TicketComment>>(
    `${API_PATHS.ticketComments(ticketId)}?page=${page}&limit=${limit}`,
  );

  return result.data;
}

export async function listGoalAuditLogs(
  goalId: string,
  limit = 100,
): Promise<AuditLog[]> {
  return getResult<AuditLog[]>(
    `${API_PATHS.auditLogsByEntity("goal", goalId)}?limit=${limit}`,
  );
}

export async function listBoardSteps(_projectId?: string): Promise<BoardStep[]> {
  return STATIC_BOARD_STEPS;
}

export async function loadDashboardData(): Promise<DashboardData> {
  const [projects, goalList, ticketList] = await Promise.all([
    listProjects(),
    getResult<ApiList<DbGoal>>(listUrl(API_PATHS.goals)),
    getResult<ApiList<DbTicket>>(listUrl(API_PATHS.tickets)),
  ]);
  const goals = mapGoalsWithTickets(goalList, ticketList);

  return {
    projects,
    goals,
    tickets: mapTicketsWithGoals(ticketList, goals),
    boardSteps: STATIC_BOARD_STEPS,
  };
}
