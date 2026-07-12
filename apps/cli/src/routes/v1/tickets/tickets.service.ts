import type { NewTicket, Ticket } from "../../../shared/db/schema/tickets";
import {
  BadRequestError,
  NotFoundError,
} from "../../../shared/utils/http-errors.util";
import { GoalsRepository } from "../goals/goals.repo";
import { realtimeEvents } from "../events/events.bus";
import {
  TicketsRepository,
  type TicketList,
  type TicketWithActivity,
} from "./tickets.repo";
import { AuditAction, AuditModule } from "../audit/audit.constants";
import { AuditService } from "../audit/audit.service";

type TicketItemInput = {
  kind:
    | "acceptance_criterion"
    | "technical_note"
    | "relevant_file"
    | "test_plan_item"
    | "verification_command";
  value: string;
};

export type CreateTicketRequest = NewTicket & {
  activityAuthorName?: string | null;
  dependsOnTicketIds?: string[];
  items?: TicketItemInput[];
};

export interface TicketReportRequest {
  status: "completed" | "failed" | "blocked";
  summary?: string;
  evidence?: string[];
  activityAuthorName?: string | null;
}

export class TicketsService {
  constructor(
    private readonly repository = new TicketsRepository(),
    private readonly goalsRepository = new GoalsRepository(),
    private readonly auditService = new AuditService(),
  ) {}

  async create(data: CreateTicketRequest): Promise<TicketWithActivity> {
    const {
      activityAuthorName,
      dependsOnTicketIds = [],
      items = [],
      ...ticketData
    } = data;
    const goal = await this.repository.findGoal(ticketData.goalId);
    if (!goal)
      throw new NotFoundError(`Goal with ID ${ticketData.goalId} not found`);
    this.ensureModule(ticketData.moduleId);

    for (const dependencyId of dependsOnTicketIds) {
      const dependency = await this.repository.findById(dependencyId);
      if (!dependency)
        throw new NotFoundError(`Ticket with ID ${dependencyId} not found`);
      if (dependency.goalId !== ticketData.goalId) {
        throw new BadRequestError(
          "Ticket dependencies must belong to the same goal",
        );
      }
    }

    const hasIncompleteDeps = dependsOnTicketIds.length > 0;
    const now = new Date();
    const ticket = await this.repository.create({
      ...ticketData,
      currentStepId: null,
      lastActivityAt: ticketData.lastActivityAt ?? now,
      lastActivityByAgentName:
        activityAuthorName?.trim() ||
        ticketData.lastActivityByAgentName ||
        ticketData.assignedSubagentName ||
        null,
      status: ticketData.status ?? (hasIncompleteDeps ? "blocked" : "backlog"),
      maximumRetries: ticketData.maximumRetries ?? goal.maxRetries,
    });
    await this.repository.createItems(
      ticket.id,
      items.map((item, position) => ({ ...item, position })),
    );
    await this.repository.setDependencies(ticket.id, dependsOnTicketIds);
    await this.logTicketEvent(ticket, AuditAction.CREATE, "Ticket created", {
      ticket,
      dependsOnTicketIds,
      itemCount: items.length,
    });
    realtimeEvents.publish("ticket.created", { ticket });
    const created = await this.repository.findById(ticket.id);
    if (!created) throw new NotFoundError(`Ticket with ID ${ticket.id} not found`);
    return created;
  }

  findAll(page: number, limit: number): Promise<TicketList> {
    return this.repository.findAll(page, limit);
  }

  async findById(id: string): Promise<TicketWithActivity> {
    const ticket = await this.repository.findById(id);
    if (!ticket) throw new NotFoundError(`Ticket with ID ${id} not found`);
    return ticket;
  }

  async update(
    id: string,
    data: Partial<NewTicket> & { activityAuthorName?: string | null },
  ): Promise<TicketWithActivity> {
    const { activityAuthorName, ...ticketData } = data;
    const existing = await this.repository.findById(id);
    if (!existing) throw new NotFoundError(`Ticket with ID ${id} not found`);
    if (ticketData.goalId || ticketData.moduleId) {
      const goalId = ticketData.goalId ?? existing.goalId;
      const moduleId = ticketData.moduleId ?? existing.moduleId;
      const goal = await this.goalsRepository.findById(goalId);
      if (!goal) throw new NotFoundError(`Goal with ID ${goalId} not found`);
      this.ensureModule(moduleId);
    }
    const patch = this.withActivityPatch(
      existing,
      ticketData,
      activityAuthorName,
    );
    const ticket = await this.repository.update(id, patch);
    if (!ticket) throw new NotFoundError(`Ticket with ID ${id} not found`);
    await this.logTicketEvent(ticket, AuditAction.UPDATE, "Ticket updated", {
      patch,
      activityAuthorName,
      previousStatus: existing.status,
      nextStatus: ticket.status,
      previousSubagentStatus: existing.subagentStatus,
      nextSubagentStatus: ticket.subagentStatus,
    });
    realtimeEvents.publish("ticket.updated", {
      ticket,
      previousTicket: existing,
    });
    return this.findById(id);
  }

  async delete(id: string): Promise<Ticket> {
    const ticket = await this.repository.delete(id);
    if (!ticket) throw new NotFoundError(`Ticket with ID ${id} not found`);
    await this.logTicketEvent(ticket, AuditAction.DELETE, "Ticket deleted", {
      ticket,
    });
    realtimeEvents.publish("ticket.deleted", { ticket });
    return ticket;
  }

  async appendFile(id: string, path: string): Promise<{ path: string }> {
    const ticket = await this.findById(id);
    const item = await this.repository.appendRelevantFile(
      ticket.id,
      path.trim(),
    );
    await this.logTicketEvent(ticket, AuditAction.APPEND_FILE, "Ticket file appended", {
      path: item.value,
    });
    return { path: item.value };
  }

  async report(
    id: string,
    data: TicketReportRequest,
  ): Promise<TicketWithActivity> {
    const ticket = await this.findById(id);
    const goal = await this.goalsRepository.findById(ticket.goalId);
    if (!goal)
      throw new NotFoundError(`Goal with ID ${ticket.goalId} not found`);

    let nextPatch: Partial<NewTicket>;
    if (data.status === "completed") {
      nextPatch = {
        status: "completed",
        subagentStatus: "done",
        completedAt: new Date(),
      };
    } else if (data.status === "failed") {
      const retryCount = ticket.retryCount + 1;
      nextPatch = {
        retryCount,
        status: retryCount <= ticket.maximumRetries ? "ready" : "failed",
      };
    } else {
      nextPatch = { status: "blocked" };
    }

    const updated = await this.repository.update(
      id,
      this.withActivityPatch(ticket, nextPatch, data.activityAuthorName),
    );
    if (!updated) throw new NotFoundError(`Ticket with ID ${id} not found`);
    await this.logTicketEvent(updated, AuditAction.REPORT, "Ticket report accepted", {
      reportStatus: data.status,
      summary: data.summary,
      evidence: data.evidence,
      activityAuthorName: data.activityAuthorName,
      previousStatus: ticket.status,
      nextStatus: updated.status,
      previousSubagentStatus: ticket.subagentStatus,
      nextSubagentStatus: updated.subagentStatus,
      retryCount: updated.retryCount,
      maximumRetries: updated.maximumRetries,
    });
    realtimeEvents.publish("ticket.updated", {
      ticket: updated,
      previousTicket: ticket,
    });

    if (updated.status === "completed") {
      await this.repository.releaseReadyDependents(updated.id);
      if (!(await this.repository.goalHasOpenTickets(updated.goalId))) {
        await this.repository.updateGoal(updated.goalId, {
          status: "completed",
          completedAt: new Date(),
          phases: goal.phases.map((phase) =>
            phase.id === "execution"
              ? {
                  ...phase,
                  status: "completed",
                  completedAt: phase.completedAt ?? new Date().toISOString(),
                }
              : phase,
            ),
        });
        await this.auditService.logChange(undefined, {
          module: AuditModule.GOAL,
          action: AuditAction.STATUS_CHANGE,
          entityName: "goal",
          entityId: updated.goalId,
          data: {
            description: "Goal completed after all tickets finished",
            goalId: updated.goalId,
            previousStatus: goal.status,
            nextStatus: "completed",
            completedByTicketId: updated.id,
          },
        });
      }
    }

    return this.findById(id);
  }

  private withActivityPatch(
    existing: Ticket,
    data: Partial<NewTicket>,
    activityAuthorName?: string | null,
  ): Partial<NewTicket> {
    const patch: Partial<NewTicket> = { ...data };
    const subagentStatusChanged =
      "subagentStatus" in data && data.subagentStatus !== existing.subagentStatus;
    const activityChanged = [
      "status",
      "subagentStatus",
      "assignedSubagentName",
      "worktreePath",
      "branchName",
      "startedAt",
      "completedAt",
    ].some((key) => key in data);

    if (subagentStatusChanged) {
      patch.subagentStatusUpdatedAt = new Date();
    }
    if (activityChanged) {
      patch.lastActivityAt = new Date();
      patch.lastActivityByAgentName =
        activityAuthorName?.trim() || existing.lastActivityByAgentName || null;
    }

    return patch;
  }

  private async logTicketEvent(
    ticket: Ticket,
    action: AuditAction,
    description: string,
    data: Record<string, unknown> = {},
  ): Promise<void> {
    await this.auditService.logChange(undefined, {
      module: AuditModule.TICKET,
      action,
      entityName: "goal",
      entityId: ticket.goalId,
      data: {
        description,
        goalId: ticket.goalId,
        ticketId: ticket.id,
        ticketTitle: ticket.title,
        status: ticket.status,
        ...data,
      },
    });
  }

  private ensureModule(moduleId: string | undefined): void {
    if (!moduleId) {
      throw new BadRequestError("Ticket moduleId is required");
    }
  }
}
