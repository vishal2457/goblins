import type { NewGoal, Goal } from "../../../shared/db/schema/goals";
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
} from "../../../shared/utils/http-errors.util";
import { TicketsRepository, type TicketDependencyEdge } from "../tickets/tickets.repo";
import { GoalsRepository, type GoalList } from "./goals.repo";
import type { Ticket } from "../../../shared/db/schema/tickets";
import { AuditAction, AuditModule } from "../audit/audit.constants";
import { AuditService } from "../audit/audit.service";

type GoalPhase = NonNullable<Goal["phases"]>[number];
export type StartRetrospectiveRequest = {
  userPoints?: string;
};

export type GoalTicketsSnapshot = {
  goal: {
    id: string;
    projectId: string;
    status: Goal["status"];
    title: string;
  };
  tickets: Array<{
    id: string;
    title: string;
    shortDescription: string;
    status: Ticket["status"];
    type: Ticket["type"];
    priority: Ticket["priority"];
    dependsOn: string[];
    blockedBy: string[];
  }>;
  graph: {
    nodes: string[];
    edges: Array<{ from: string; to: string }>;
    readyTicketIds: string[];
    inProgressTicketIds: string[];
    blockedTicketIds: string[];
    parallelBatches: string[][];
  };
  warnings: string[];
};

export class GoalsService {
  constructor(
    private readonly repository = new GoalsRepository(),
    private readonly ticketsRepository = new TicketsRepository(),
    private readonly auditService = new AuditService(),
  ) {}

  async create(data: NewGoal): Promise<Goal> {
    const goal = await this.repository.create(data);
    await this.logGoalEvent(goal, AuditAction.CREATE, "Goal created", {
      goal,
    });
    return goal;
  }

  findAll(page: number, limit: number): Promise<GoalList> {
    return this.repository.findAll(page, limit);
  }

  async findById(id: string): Promise<Goal> {
    const goal = await this.repository.findById(id);
    if (!goal) throw new NotFoundError(`Goal with ID ${id} not found`);
    return goal;
  }

  async goalTicketsSnapshot(id: string): Promise<GoalTicketsSnapshot> {
    const goal = await this.findById(id);
    const [tickets, edges] = await Promise.all([
      this.ticketsRepository.findByGoal(goal.id),
      this.ticketsRepository.findDependencyEdgesByGoal(goal.id),
    ]);

    const ticketById = new Map(tickets.map((ticket) => [ticket.id, ticket]));
    const dependsOnByTicket = groupDependencies(edges);

    const blockedByByTicket = new Map<string, string[]>();
    for (const ticket of tickets) {
      const blockedBy = (dependsOnByTicket.get(ticket.id) ?? []).filter(
        (dependencyId) => ticketById.get(dependencyId)?.status !== "completed",
      );
      blockedByByTicket.set(ticket.id, blockedBy);
    }

    const readyTicketIds = tickets
      .filter(
        (ticket) =>
          (ticket.status === "ready" || ticket.status === "backlog") &&
          (blockedByByTicket.get(ticket.id)?.length ?? 0) === 0,
      )
      .map((ticket) => ticket.id);
    const inProgressTicketIds = tickets
      .filter((ticket) => ticket.status === "in_progress")
      .map((ticket) => ticket.id);
    const blockedTicketIds = tickets
      .filter(
        (ticket) =>
          ticket.status === "blocked" ||
          (blockedByByTicket.get(ticket.id)?.length ?? 0) > 0,
      )
      .map((ticket) => ticket.id);
    const { parallelBatches, warnings } = computeParallelBatches(
      tickets,
      edges,
      ticketById,
    );

    return {
      goal: {
        id: goal.id,
        projectId: goal.projectId,
        status: goal.status,
        title: goal.title,
      },
      tickets: tickets.map((ticket) => ({
        id: ticket.id,
        title: ticket.title,
        shortDescription: ticket.shortDescription,
        status: ticket.status,
        type: ticket.type,
        priority: ticket.priority,
        dependsOn: dependsOnByTicket.get(ticket.id) ?? [],
        blockedBy: blockedByByTicket.get(ticket.id) ?? [],
      })),
      graph: {
        nodes: tickets.map((ticket) => ticket.id),
        edges: edges.map((edge) => ({
          from: edge.dependsOnTicketId,
          to: edge.ticketId,
        })),
        readyTicketIds,
        inProgressTicketIds,
        blockedTicketIds,
        parallelBatches,
      },
      warnings,
    };
  }

  async update(id: string, data: Partial<NewGoal>): Promise<Goal> {
    const existing = await this.findById(id);
    let patch = data;
    if (data.status === "paused") {
      patch = {
        ...data,
        phases: updateActivePhase(existing, "paused"),
      };
    }
    if (data.status === "cancelled") {
      patch = {
        ...data,
        phases: updateActivePhase(existing, "cancelled"),
        completedAt: new Date(),
      };
    }
    if (data.status === "completed") {
      patch = {
        ...data,
        completedAt: data.completedAt ?? new Date(),
        phases: updatePhase(
          updatePhase(data.phases ?? existing.phases, "planning", "completed"),
          "execution",
          "completed",
        ),
      };
    }
    const goal = await this.repository.update(id, patch);
    if (!goal) throw new NotFoundError(`Goal with ID ${id} not found`);
    await this.logGoalEvent(goal, AuditAction.UPDATE, "Goal updated", {
      patch,
      previousStatus: existing.status,
      nextStatus: goal.status,
    });
    return goal;
  }

  async startPlanning(id: string): Promise<Goal> {
    const goal = await this.findById(id);
    if (!["draft", "paused", "planning"].includes(goal.status)) {
      throw new ConflictError(
        `Goal ${id} cannot start planning from status ${goal.status}`,
      );
    }
    if (goal.status === "paused") {
      // Resuming planning is represented by the phase state only.
    }
    const updated = await this.repository.update(id, {
      status: "planning",
      startedAt: goal.startedAt ?? new Date(),
      phases: updatePhase(goal.phases, "planning", "in_progress"),
    });
    if (!updated) throw new NotFoundError(`Goal with ID ${id} not found`);
    await this.logGoalEvent(updated, AuditAction.START_PLANNING, "Planning started", {
      previousStatus: goal.status,
      nextStatus: updated.status,
    });
    return updated;
  }

  async completePlanning(id: string): Promise<Goal> {
    const goal = await this.findById(id);
    const ticketCount = await this.repository.countTickets(id);
    if (ticketCount === 0) {
      throw new BadRequestError(
        "Planning cannot be completed until at least one ticket exists",
      );
    }
    const updated = await this.repository.update(id, {
      status: "ready",
      phases: updatePhase(goal.phases, "planning", "completed"),
    });
    if (!updated) throw new NotFoundError(`Goal with ID ${id} not found`);
    await this.logGoalEvent(updated, AuditAction.COMPLETE_PLANNING, "Planning completed", {
      previousStatus: goal.status,
      nextStatus: updated.status,
      ticketCount,
    });
    return updated;
  }

  async startExecution(id: string): Promise<Goal> {
    const goal = await this.findById(id);
    if (goal.status !== "ready" && goal.status !== "paused") {
      throw new ConflictError(
        `Goal ${id} cannot start execution from status ${goal.status}`,
      );
    }
    if (goal.status === "paused") {
      // Resuming execution is represented by the phase state only.
    }
    await this.repository.releaseReadyTickets(id);
    const updated = await this.repository.update(id, {
      status: "running",
      phases: updatePhase(
        updatePhase(goal.phases, "planning", "completed"),
        "execution",
        "in_progress",
      ),
    });
    if (!updated) throw new NotFoundError(`Goal with ID ${id} not found`);
    await this.logGoalEvent(updated, AuditAction.START_EXECUTION, "Execution started", {
      previousStatus: goal.status,
      nextStatus: updated.status,
    });
    return updated;
  }

  async startRetrospective(
    id: string,
    request: StartRetrospectiveRequest = {},
  ): Promise<Goal> {
    const goal = await this.findById(id);
    const executionPhase = goal.phases.find(
      (phase) => phase.id === "execution",
    );
    const retrospectivePhase = goal.phases.find(
      (phase) => phase.id === "retrospective",
    );
    const isPausedRetrospective =
      goal.status === "paused" && retrospectivePhase?.status === "paused";
    if (
      goal.status !== "completed" &&
      !(goal.status === "failed" && executionPhase?.status === "completed") &&
      !isPausedRetrospective
    ) {
      throw new ConflictError(
        `Goal ${id} cannot start retrospective from status ${goal.status}`,
      );
    }
    const updated = await this.repository.update(id, {
      status: "retrospective",
      completedAt: goal.completedAt ?? null,
      phases: updatePhase(
        updatePhase(goal.phases, "execution", "completed"),
        "retrospective",
        "in_progress",
      ),
    });
    if (!updated) throw new NotFoundError(`Goal with ID ${id} not found`);
    await this.logGoalEvent(
      updated,
      AuditAction.START_RETROSPECTIVE,
      "Retrospective started",
      {
        previousStatus: goal.status,
        nextStatus: updated.status,
        userPoints: request.userPoints,
      },
    );
    void isPausedRetrospective;
    return updated;
  }

  async completeRetrospective(id: string): Promise<Goal> {
    const goal = await this.findById(id);
    if (goal.status !== "retrospective") {
      throw new ConflictError(
        `Goal ${id} cannot complete retrospective from status ${goal.status}`,
      );
    }
    const updated = await this.repository.update(id, {
      status: "completed",
      completedAt: new Date(),
      phases: updatePhase(goal.phases, "retrospective", "completed"),
    });
    if (!updated) throw new NotFoundError(`Goal with ID ${id} not found`);
    await this.logGoalEvent(
      updated,
      AuditAction.COMPLETE_RETROSPECTIVE,
      "Retrospective completed",
      {
        previousStatus: goal.status,
        nextStatus: updated.status,
      },
    );
    return updated;
  }

  async delete(id: string): Promise<Goal> {
    const goal = await this.repository.delete(id);
    if (!goal) throw new NotFoundError(`Goal with ID ${id} not found`);
    await this.logGoalEvent(goal, AuditAction.DELETE, "Goal deleted", { goal });
    return goal;
  }

  private async logGoalEvent(
    goal: Goal,
    action: AuditAction,
    description: string,
    data: Record<string, unknown> = {},
  ): Promise<void> {
    await this.auditService.logChange(undefined, {
      module: AuditModule.GOAL,
      action,
      entityName: "goal",
      entityId: goal.id,
      data: {
        description,
        goalId: goal.id,
        goalTitle: goal.title,
        projectId: goal.projectId,
        status: goal.status,
        ...data,
      },
    });
  }
}

function groupDependencies(
  edges: TicketDependencyEdge[],
): Map<string, string[]> {
  const result = new Map<string, string[]>();
  for (const edge of edges) {
    const dependencies = result.get(edge.ticketId) ?? [];
    dependencies.push(edge.dependsOnTicketId);
    result.set(edge.ticketId, dependencies);
  }
  return result;
}

function computeParallelBatches(
  tickets: Ticket[],
  edges: TicketDependencyEdge[],
  ticketById: Map<string, Ticket>,
): { parallelBatches: string[][]; warnings: string[] } {
  const warnings: string[] = [];
  const dependencyIdsByTicket = groupDependencies(edges);
  const eligibleIds = new Set(
    tickets
      .filter((ticket) => {
        if (
          ticket.status === "completed" ||
          ticket.status === "cancelled" ||
          ticket.status === "failed" ||
          ticket.status === "in_progress"
        ) {
          return false;
        }
        return (
          ticket.status === "ready" ||
          ticket.status === "backlog" ||
          (ticket.status === "blocked" &&
            (dependencyIdsByTicket.get(ticket.id)?.length ?? 0) > 0)
        );
      })
      .map((ticket) => ticket.id),
  );

  for (const ticketId of [...eligibleIds]) {
    const dependencies = dependencyIdsByTicket.get(ticketId) ?? [];
    const hasNonSchedulableBlocker = dependencies.some((dependencyId) => {
      const dependency = ticketById.get(dependencyId);
      return dependency?.status !== "completed" && !eligibleIds.has(dependencyId);
    });
    if (hasNonSchedulableBlocker) eligibleIds.delete(ticketId);
  }

  const remaining = new Set(eligibleIds);
  const batches: string[][] = [];
  const completedOrScheduled = new Set(
    tickets
      .filter((ticket) => ticket.status === "completed")
      .map((ticket) => ticket.id),
  );

  while (remaining.size > 0) {
    const batch = [...remaining].filter((ticketId) =>
      (dependencyIdsByTicket.get(ticketId) ?? []).every((dependencyId) =>
        completedOrScheduled.has(dependencyId),
      ),
    );
    if (batch.length === 0) {
      warnings.push("Dependency graph contains a cycle or unresolved prerequisite");
      break;
    }
    batch.sort((left, right) => {
      const leftTicket = ticketById.get(left);
      const rightTicket = ticketById.get(right);
      return priorityRank(rightTicket?.priority) - priorityRank(leftTicket?.priority);
    });
    batches.push(batch);
    for (const ticketId of batch) {
      remaining.delete(ticketId);
      completedOrScheduled.add(ticketId);
    }
  }

  return { parallelBatches: batches, warnings };
}

function priorityRank(priority: Ticket["priority"] | undefined): number {
  if (priority === "critical") return 4;
  if (priority === "high") return 3;
  if (priority === "medium") return 2;
  if (priority === "low") return 1;
  return 0;
}

function updateActivePhase(
  goal: Goal,
  status: GoalPhase["status"],
): Goal["phases"] {
  const activePhase =
    goal.phases.find((phase) => phase.status === "in_progress") ??
    goal.phases.find((phase) => phase.status === "paused") ??
    goal.phases.find((phase) => phase.id === phaseIdForGoalStatus(goal.status));
  if (!activePhase) return goal.phases;
  const now = new Date().toISOString();
  return goal.phases.map((phase) => {
    if (phase.id !== activePhase.id) return phase;
    return {
      ...phase,
      status,
      completedAt:
        status === "completed" || status === "cancelled"
          ? (phase.completedAt ?? now)
          : phase.completedAt,
    };
  });
}

function phaseIdForGoalStatus(status: Goal["status"]): GoalPhase["id"] | null {
  if (status === "planning") return "planning";
  if (status === "running" || status === "verifying") return "execution";
  if (status === "retrospective") return "retrospective";
  return null;
}

function updatePhase(
  phases: Goal["phases"],
  id: GoalPhase["id"],
  status: GoalPhase["status"],
): Goal["phases"] {
  const now = new Date().toISOString();
  return phases.map((phase) => {
    if (phase.id !== id) return phase;
    return {
      ...phase,
      status,
      startedAt:
        status === "in_progress" ? (phase.startedAt ?? now) : phase.startedAt,
      completedAt:
        status === "completed" ? (phase.completedAt ?? now) : phase.completedAt,
    };
  });
}
