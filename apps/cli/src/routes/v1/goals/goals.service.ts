import crypto from "node:crypto";
import type { NewGoal, Goal } from "../../../shared/db/schema/goals";
import type {
  InstructionImprovementProposal,
  NewInstructionImprovementProposal,
  NewRetrospectiveObservation,
  RetrospectiveObservation,
} from "../../../shared/db/schema/goals";
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
} from "../../../shared/utils/http-errors.util";
import {
  TicketsRepository,
  type TicketDependencyEdge,
} from "../tickets/tickets.repo";
import { GoalsRepository, type GoalList } from "./goals.repo";
import type { Ticket } from "../../../shared/db/schema/tickets";
import { AuditAction, AuditModule } from "../audit/audit.constants";
import { AuditService } from "../audit/audit.service";
import { WorkflowService } from "../workflow/workflow.service";
import {
  discoverProjectAgents,
  updateDiscoveredAgentInstructions,
} from "../projects/project-agents.discovery";
import type { AuditLog } from "../audit/audit.repo";
import type { TicketComment } from "../../../shared/db/schema/tickets";
import type { DiscoveredAgent } from "goblins-shared-constants";

type GoalPhase = NonNullable<Goal["phases"]>[number];
export type StartRetrospectiveRequest = {
  userPoints?: string;
};

type EvidenceReference = {
  type: string;
  id?: string;
  summary: string;
};

export type GoalOverview = {
  goal: Goal;
  tickets: Array<
    Ticket & {
      commentCount: number;
      importantComments: TicketComment[];
      signals: string[];
    }
  >;
  ticketStatusCounts: Record<string, number>;
  ticketTypeCounts: Record<string, number>;
  subagentCounts: Record<string, number>;
  failurePoints: Array<{
    ticketId: string;
    title: string;
    status: Ticket["status"];
    retryCount: number;
    assignedSubagentName: string | null;
    signals: string[];
  }>;
  importantComments: TicketComment[];
  auditSummary: {
    total: number;
    actionCounts: Record<string, number>;
    recent: AuditLog[];
  };
  verification: {
    ticketsMissingEvidence: string[];
    evidenceCommentCount: number;
  };
};

export type ImprovementAnalysisResult = {
  retrospective: {
    id: string;
    goalId: string;
    summary: string;
    userPoints: string | null;
  };
  observations: RetrospectiveObservation[];
  proposals: InstructionImprovementProposal[];
};

export type ImprovementList = {
  retrospectives: Awaited<
    ReturnType<GoalsRepository["findRetrospectivesByGoal"]>
  >;
  observations: RetrospectiveObservation[];
  proposals: InstructionImprovementProposal[];
};

export type AnalyseRetrospectiveRequest = {
  userPoints?: string;
};

export type ApproveImprovementRequest = {
  proposedInstructions?: string;
};

export type RejectImprovementRequest = {
  reason?: string;
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
    private readonly workflowService = new WorkflowService(),
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

  async goalOverview(id: string): Promise<GoalOverview> {
    const goal = await this.findById(id);
    const tickets = await this.ticketsRepository.findByGoal(goal.id);
    const [comments, auditLogs] = await Promise.all([
      this.repository.findCommentsByTicketIds(
        tickets.map((ticket) => ticket.id),
      ),
      this.auditService.getAuditsByEntity("goal", goal.id),
    ]);
    const commentsByTicket = groupCommentsByTicket(comments);
    const ticketStatusCounts = countBy(tickets, (ticket) => ticket.status);
    const ticketTypeCounts = countBy(tickets, (ticket) => ticket.type);
    const subagentCounts = countBy(
      tickets,
      (ticket) => ticket.assignedSubagentName ?? "unassigned",
    );
    const overviewTickets = tickets.map((ticket) => {
      const ticketComments = commentsByTicket.get(ticket.id) ?? [];
      const signals = ticketSignals(ticket, ticketComments);
      return {
        ...ticket,
        commentCount: ticketComments.length,
        importantComments: selectImportantComments(ticketComments, 5),
        signals,
      };
    });
    const failurePoints = overviewTickets
      .filter(
        (ticket) =>
          ticket.status === "failed" ||
          ticket.status === "blocked" ||
          ticket.retryCount > 0 ||
          ticket.signals.length > 0,
      )
      .map((ticket) => ({
        ticketId: ticket.id,
        title: ticket.title,
        status: ticket.status,
        retryCount: ticket.retryCount,
        assignedSubagentName: ticket.assignedSubagentName,
        signals: ticket.signals,
      }));
    const allImportantComments = selectImportantComments(comments, 30);
    const evidenceCommentCount = comments.filter(isVerificationComment).length;
    return {
      goal,
      tickets: overviewTickets,
      ticketStatusCounts,
      ticketTypeCounts,
      subagentCounts,
      failurePoints,
      importantComments: allImportantComments,
      auditSummary: {
        total: auditLogs.length,
        actionCounts: countBy(auditLogs, (log) => log.action),
        recent: auditLogs.slice(0, 20),
      },
      verification: {
        ticketsMissingEvidence: overviewTickets
          .filter(
            (ticket) =>
              ticket.status === "completed" &&
              !(commentsByTicket.get(ticket.id) ?? []).some(
                isVerificationComment,
              ),
          )
          .map((ticket) => ticket.id),
        evidenceCommentCount,
      },
    };
  }

  async analyseRetrospective(
    id: string,
    request: AnalyseRetrospectiveRequest = {},
  ): Promise<ImprovementAnalysisResult> {
    const overview = await this.goalOverview(id);
    const project = await this.repository.findProjectByGoal(id);
    if (!project) throw new NotFoundError(`Project for goal ${id} not found`);

    const workflow = this.workflowService.getWorkflow();
    const agents = await discoverProjectAgents(project.location).catch(() => ({
      agents: [] as DiscoveredAgent[],
    }));
    const workflowEvidence = workflowEvidenceFromOverview(overview);
    const observations = buildObservations(overview, workflowEvidence);
    const proposals = buildInstructionProposals({
      overview,
      workflowContent: workflow.content,
      workflowPath: workflow.sourcePath,
      discoveredAgents: agents.agents,
      workflowEvidence,
    });
    const summary = buildRetrospectiveSummary(overview, proposals.length);
    const retrospective = await this.repository.createRetrospective({
      goalId: id,
      userPoints: request.userPoints?.trim() || null,
      summary,
    });
    const createdObservations =
      await this.repository.createRetrospectiveObservations(
        observations.map((observation, position) => ({
          ...observation,
          goalId: id,
          retrospectiveId: retrospective.id,
          position,
        })),
      );
    const createdProposals = await this.repository.createInstructionProposals(
      proposals.map((proposal) => ({
        ...proposal,
        goalId: id,
        retrospectiveId: retrospective.id,
      })),
    );
    await this.logGoalEvent(
      overview.goal,
      AuditAction.ANALYSE_RETROSPECTIVE,
      "Retrospective analysed",
      {
        retrospectiveId: retrospective.id,
        observationCount: createdObservations.length,
        proposalCount: createdProposals.length,
      },
    );
    return {
      retrospective: {
        id: retrospective.id,
        goalId: retrospective.goalId,
        summary: retrospective.summary,
        userPoints: retrospective.userPoints,
      },
      observations: createdObservations,
      proposals: createdProposals,
    };
  }

  async listImprovements(id: string): Promise<ImprovementList> {
    await this.findById(id);
    const [retrospectives, observations, proposals] = await Promise.all([
      this.repository.findRetrospectivesByGoal(id),
      this.repository.findObservationsByGoal(id),
      this.repository.findInstructionProposalsByGoal(id),
    ]);
    return { retrospectives, observations, proposals };
  }

  async approveImprovement(
    goalId: string,
    proposalId: string,
    request: ApproveImprovementRequest = {},
  ): Promise<InstructionImprovementProposal> {
    const goal = await this.findById(goalId);
    const proposal = await this.findGoalProposal(goalId, proposalId);
    if (proposal.status === "rejected" || proposal.status === "applied") {
      throw new ConflictError(
        `Cannot approve improvement from status ${proposal.status}`,
      );
    }
    const updated = await this.repository.updateInstructionProposal(
      proposalId,
      {
        proposedInstructions:
          request.proposedInstructions?.trim() || proposal.proposedInstructions,
        status: "approved",
        approvedAt: new Date(),
      },
    );
    if (!updated)
      throw new NotFoundError(`Improvement proposal ${proposalId} not found`);
    await this.logGoalEvent(
      goal,
      AuditAction.APPROVE_IMPROVEMENT,
      "Improvement approved",
      {
        proposalId,
        targetType: updated.targetType,
        targetId: updated.targetId,
      },
    );
    return updated;
  }

  async rejectImprovement(
    goalId: string,
    proposalId: string,
    request: RejectImprovementRequest = {},
  ): Promise<InstructionImprovementProposal> {
    const goal = await this.findById(goalId);
    const proposal = await this.findGoalProposal(goalId, proposalId);
    if (proposal.status === "applied") {
      throw new ConflictError("Applied improvements cannot be rejected");
    }
    const updated = await this.repository.updateInstructionProposal(
      proposalId,
      {
        status: "rejected",
        rejectedAt: new Date(),
      },
    );
    if (!updated)
      throw new NotFoundError(`Improvement proposal ${proposalId} not found`);
    await this.logGoalEvent(
      goal,
      AuditAction.REJECT_IMPROVEMENT,
      "Improvement rejected",
      {
        proposalId,
        targetType: updated.targetType,
        targetId: updated.targetId,
        reason: request.reason,
      },
    );
    return updated;
  }

  async applyImprovement(
    goalId: string,
    proposalId: string,
  ): Promise<InstructionImprovementProposal> {
    const goal = await this.findById(goalId);
    const proposal = await this.findGoalProposal(goalId, proposalId);
    if (proposal.status !== "approved") {
      throw new ConflictError(
        `Improvement must be approved before applying; current status is ${proposal.status}`,
      );
    }
    let beforeSnapshot: string | null = null;
    let afterSnapshot = proposal.proposedInstructions;

    if (proposal.targetType === "workflow_instruction") {
      const workflow = this.workflowService.getWorkflow();
      beforeSnapshot = workflow.content;
      afterSnapshot = this.workflowService.updateWorkflow(
        proposal.proposedInstructions,
      ).content;
    } else if (proposal.targetType === "subagent_instruction") {
      const project = await this.repository.findProjectByGoal(goalId);
      if (!project)
        throw new NotFoundError(`Project for goal ${goalId} not found`);
      const discovered = await discoverProjectAgents(project.location);
      const agent = discovered.agents.find(
        (candidate) => candidate.id === proposal.targetId,
      );
      if (!agent?.sourcePath) {
        throw new BadRequestError(
          "Subagent improvement target is not backed by an editable file",
        );
      }
      beforeSnapshot = agent.instructions ?? "";
      const updated = await updateDiscoveredAgentInstructions({
        projectDir: project.location,
        agentId: proposal.targetId,
        instructions: proposal.proposedInstructions,
      });
      afterSnapshot = updated.instructions || proposal.proposedInstructions;
    } else {
      throw new BadRequestError("Unsupported improvement target");
    }

    const updated = await this.repository.updateInstructionProposal(
      proposalId,
      {
        status: "applied",
        beforeSnapshot: proposal.beforeSnapshot ?? beforeSnapshot,
        afterSnapshot,
        appliedAt: new Date(),
      },
    );
    if (!updated)
      throw new NotFoundError(`Improvement proposal ${proposalId} not found`);
    await this.logGoalEvent(
      goal,
      AuditAction.APPLY_IMPROVEMENT,
      "Improvement applied",
      {
        proposalId,
        targetType: updated.targetType,
        targetId: updated.targetId,
        beforeHash: hashText(beforeSnapshot ?? ""),
        afterHash: hashText(afterSnapshot),
        evidence: updated.evidence,
      },
    );
    return updated;
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
    await this.logGoalEvent(
      updated,
      AuditAction.START_PLANNING,
      "Planning started",
      {
        previousStatus: goal.status,
        nextStatus: updated.status,
      },
    );
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
    await this.logGoalEvent(
      updated,
      AuditAction.COMPLETE_PLANNING,
      "Planning completed",
      {
        previousStatus: goal.status,
        nextStatus: updated.status,
        ticketCount,
      },
    );
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
    await this.logGoalEvent(
      updated,
      AuditAction.START_EXECUTION,
      "Execution started",
      {
        previousStatus: goal.status,
        nextStatus: updated.status,
      },
    );
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

  private async findGoalProposal(
    goalId: string,
    proposalId: string,
  ): Promise<InstructionImprovementProposal> {
    const proposal =
      await this.repository.findInstructionProposalById(proposalId);
    if (!proposal || proposal.goalId !== goalId) {
      throw new NotFoundError(
        `Improvement proposal ${proposalId} not found for goal ${goalId}`,
      );
    }
    return proposal;
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
      return (
        dependency?.status !== "completed" && !eligibleIds.has(dependencyId)
      );
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
      warnings.push(
        "Dependency graph contains a cycle or unresolved prerequisite",
      );
      break;
    }
    batch.sort((left, right) => {
      const leftTicket = ticketById.get(left);
      const rightTicket = ticketById.get(right);
      return (
        priorityRank(rightTicket?.priority) - priorityRank(leftTicket?.priority)
      );
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

function groupCommentsByTicket(
  comments: TicketComment[],
): Map<string, TicketComment[]> {
  const grouped = new Map<string, TicketComment[]>();
  for (const comment of comments) {
    const bucket = grouped.get(comment.ticketId) ?? [];
    bucket.push(comment);
    grouped.set(comment.ticketId, bucket);
  }
  return grouped;
}

function countBy<T>(
  values: T[],
  getKey: (value: T) => string,
): Record<string, number> {
  return values.reduce<Record<string, number>>((result, value) => {
    const key = getKey(value);
    result[key] = (result[key] ?? 0) + 1;
    return result;
  }, {});
}

function selectImportantComments(
  comments: TicketComment[],
  limit: number,
): TicketComment[] {
  return [...comments]
    .sort((left, right) => {
      const leftRank = commentRank(left);
      const rightRank = commentRank(right);
      if (leftRank !== rightRank) return rightRank - leftRank;
      return right.createdAt.getTime() - left.createdAt.getTime();
    })
    .slice(0, limit);
}

function commentRank(comment: TicketComment): number {
  if (comment.kind === "blocker") return 5;
  if (comment.kind === "question") return 4;
  if (comment.kind === "decision") return 3;
  if (isVerificationComment(comment)) return 2;
  return 1;
}

function isVerificationComment(comment: TicketComment): boolean {
  return /\b(test|verified|verification|check|command|build|lint|typecheck|evidence)\b/i.test(
    comment.body,
  );
}

function ticketSignals(ticket: Ticket, comments: TicketComment[]): string[] {
  const signals: string[] = [];
  if (ticket.status === "failed") signals.push("ticket_failed");
  if (ticket.status === "blocked") signals.push("ticket_blocked");
  if (ticket.retryCount > 0) signals.push("ticket_retried");
  if (!ticket.assignedSubagentName) signals.push("missing_subagent_assignment");
  if (!ticket.shortDescription && !ticket.description) {
    signals.push("missing_scope_description");
  }
  if (comments.length === 0) signals.push("missing_progress_comments");
  if (comments.some((comment) => comment.kind === "question")) {
    signals.push("contains_question");
  }
  if (comments.some((comment) => comment.kind === "blocker")) {
    signals.push("contains_blocker");
  }
  if (ticket.status === "completed" && !comments.some(isVerificationComment)) {
    signals.push("missing_verification_evidence");
  }
  return signals;
}

function workflowEvidenceFromOverview(
  overview: GoalOverview,
): EvidenceReference[] {
  const evidence: EvidenceReference[] = [];
  for (const point of overview.failurePoints.slice(0, 10)) {
    evidence.push({
      type: "ticket",
      id: point.ticketId,
      summary: `${point.title}: ${point.signals.join(", ") || point.status}`,
    });
  }
  for (const comment of overview.importantComments.slice(0, 8)) {
    evidence.push({
      type: "ticket_comment",
      id: comment.id,
      summary: `${comment.kind}: ${comment.body.slice(0, 180)}`,
    });
  }
  if (overview.verification.ticketsMissingEvidence.length > 0) {
    evidence.push({
      type: "goal",
      id: overview.goal.id,
      summary: `${overview.verification.ticketsMissingEvidence.length} completed tickets lacked explicit verification evidence.`,
    });
  }
  return evidence;
}

function buildObservations(
  overview: GoalOverview,
  evidence: EvidenceReference[],
): Array<
  Omit<NewRetrospectiveObservation, "goalId" | "retrospectiveId" | "position">
> {
  const observations: Array<
    Omit<NewRetrospectiveObservation, "goalId" | "retrospectiveId" | "position">
  > = [];
  const missingScope = overview.tickets.filter((ticket) =>
    ticket.signals.includes("missing_scope_description"),
  );
  if (missingScope.length > 0) {
    observations.push({
      kind: "planning_gap",
      summary: `${missingScope.length} tickets had weak scope descriptions.`,
      evidence: missingScope.map(ticketEvidence),
    });
  }
  const progressGaps = overview.tickets.filter((ticket) =>
    ticket.signals.includes("missing_progress_comments"),
  );
  if (progressGaps.length > 0) {
    observations.push({
      kind: "subagent_gap",
      summary: `${progressGaps.length} tickets lacked durable progress comments.`,
      evidence: progressGaps.map(ticketEvidence),
    });
  }
  if (overview.verification.ticketsMissingEvidence.length > 0) {
    observations.push({
      kind: "verification_gap",
      summary: `${overview.verification.ticketsMissingEvidence.length} completed tickets had no explicit verification evidence.`,
      evidence,
    });
  }
  const blockedOrQuestioned = overview.tickets.filter(
    (ticket) =>
      ticket.signals.includes("contains_blocker") ||
      ticket.signals.includes("contains_question"),
  );
  if (blockedOrQuestioned.length > 0) {
    observations.push({
      kind: "workflow_gap",
      summary: `${blockedOrQuestioned.length} tickets contained blockers or unresolved questions.`,
      evidence: blockedOrQuestioned.map(ticketEvidence),
    });
  }
  const failedOrRetried = overview.tickets.filter(
    (ticket) => ticket.status === "failed" || ticket.retryCount > 0,
  );
  if (failedOrRetried.length > 0) {
    observations.push({
      kind: "tooling_gap",
      summary: `${failedOrRetried.length} tickets failed or required retries. This is recorded as an observation, not an applyable system change.`,
      evidence: failedOrRetried.map(ticketEvidence),
    });
  }
  return observations;
}

function buildInstructionProposals(input: {
  overview: GoalOverview;
  workflowContent: string;
  workflowPath: string;
  discoveredAgents: DiscoveredAgent[];
  workflowEvidence: EvidenceReference[];
}): Array<
  Omit<NewInstructionImprovementProposal, "goalId" | "retrospectiveId">
> {
  const proposals: Array<
    Omit<NewInstructionImprovementProposal, "goalId" | "retrospectiveId">
  > = [];
  const workflowSignals = new Set(
    input.overview.failurePoints.flatMap((point) => point.signals),
  );
  if (
    workflowSignals.has("missing_scope_description") ||
    workflowSignals.has("contains_blocker") ||
    workflowSignals.has("contains_question") ||
    workflowSignals.has("missing_verification_evidence")
  ) {
    proposals.push({
      targetType: "workflow_instruction",
      targetId: input.workflowPath,
      targetLabel: "Active workflow instructions",
      proposedInstructions: appendInstructionSection(
        input.workflowContent,
        "Self-improvement additions",
        [
          "During planning, every ticket must include a concrete expected outcome, acceptance criteria, and verification evidence expected from the assigned subagent.",
          "During execution, blockers and user questions must be raised in ticket comments as soon as they are discovered, with the smallest decision needed to unblock work.",
          "Before completing a ticket, require a closing comment that names checks run, evidence collected, and residual risk.",
        ],
      ),
      rationale:
        "Goal analysis found planning, blocker, or verification signals that can be improved through workflow instructions.",
      evidence: input.workflowEvidence,
      beforeSnapshot: input.workflowContent,
    });
  }

  const ticketsBySubagent = new Map<string, GoalOverview["tickets"]>();
  for (const ticket of input.overview.tickets) {
    if (!ticket.assignedSubagentName) continue;
    const bucket = ticketsBySubagent.get(ticket.assignedSubagentName) ?? [];
    bucket.push(ticket);
    ticketsBySubagent.set(ticket.assignedSubagentName, bucket);
  }
  for (const [subagentName, tickets] of ticketsBySubagent) {
    const subagentSignals = tickets.flatMap((ticket) => ticket.signals);
    const shouldImprove =
      subagentSignals.includes("missing_progress_comments") ||
      subagentSignals.includes("missing_verification_evidence") ||
      subagentSignals.includes("ticket_failed") ||
      subagentSignals.includes("ticket_retried");
    if (!shouldImprove) continue;
    const agent = findEditableAgent(input.discoveredAgents, subagentName);
    if (!agent?.sourcePath || !agent.instructions) continue;
    proposals.push({
      targetType: "subagent_instruction",
      targetId: agent.id,
      targetLabel: agent.displayName || agent.name || subagentName,
      proposedInstructions: appendInstructionSection(
        agent.instructions,
        "Goblins ticket execution improvements",
        [
          "At ticket start, add or update a note comment with assumptions, intended approach, and any missing context.",
          "Move subagentStatus through analysing, executing, verifying, and done as work progresses.",
          "Before reporting completion, add a concise closing comment with changes made, verification commands or evidence, and residual risks.",
        ],
      ),
      rationale: `Tickets assigned to ${subagentName} showed progress reporting, retry, failure, or verification gaps.`,
      evidence: tickets.slice(0, 8).map(ticketEvidence),
      beforeSnapshot: agent.instructions,
    });
  }
  return proposals;
}

function findEditableAgent(
  agents: DiscoveredAgent[],
  subagentName: string,
): DiscoveredAgent | undefined {
  const normalized = normalizeName(subagentName);
  return agents.find((agent) => {
    const candidates = [
      agent.id,
      agent.name,
      agent.displayName,
      agent.description,
    ].filter(Boolean);
    return candidates.some((candidate) =>
      normalizeName(String(candidate)).includes(normalized),
    );
  });
}

function normalizeName(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function appendInstructionSection(
  content: string,
  heading: string,
  bullets: string[],
): string {
  const marker = `## ${heading}`;
  const section = `${marker}\n\n${bullets.map((bullet) => `- ${bullet}`).join("\n")}`;
  if (content.includes(marker)) return content;
  return `${content.trim()}\n\n${section}\n`;
}

function ticketEvidence(
  ticket: GoalOverview["tickets"][number],
): EvidenceReference {
  return {
    type: "ticket",
    id: ticket.id,
    summary: `${ticket.title}: ${ticket.signals.join(", ") || ticket.status}`,
  };
}

function buildRetrospectiveSummary(
  overview: GoalOverview,
  proposalCount: number,
): string {
  return [
    `${overview.tickets.length} tickets analysed for goal "${overview.goal.title}".`,
    `${overview.failurePoints.length} tickets produced improvement signals.`,
    `${proposalCount} instruction-only proposals generated.`,
  ].join(" ");
}

function hashText(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
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
