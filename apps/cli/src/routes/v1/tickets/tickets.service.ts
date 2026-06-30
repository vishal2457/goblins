import type { NewTicket, Ticket } from "../../../shared/db/schema/tickets";
import {
  BadRequestError,
  NotFoundError,
} from "../../../shared/utils/http-errors.util";
import { GoalsRepository } from "../goals/goals.repo";
import { realtimeEvents } from "../events/events.bus";
import { TicketsRepository, type TicketList } from "./tickets.repo";

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
  dependsOnTicketIds?: string[];
  items?: TicketItemInput[];
};

export interface TicketReportRequest {
  status: "completed" | "failed" | "blocked";
  summary?: string;
  evidence?: string[];
}

export class TicketsService {
  constructor(
    private readonly repository = new TicketsRepository(),
    private readonly goalsRepository = new GoalsRepository(),
  ) {}

  async create(data: CreateTicketRequest): Promise<Ticket> {
    const { dependsOnTicketIds = [], items = [], ...ticketData } = data;
    const goal = await this.repository.findGoal(ticketData.goalId);
    if (!goal)
      throw new NotFoundError(`Goal with ID ${ticketData.goalId} not found`);
    await this.ensureModuleBelongsToProject(
      ticketData.moduleId,
      goal.projectId,
    );

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
    const ticket = await this.repository.create({
      ...ticketData,
      currentStepId: null,
      status: ticketData.status ?? (hasIncompleteDeps ? "blocked" : "backlog"),
      maximumRetries: ticketData.maximumRetries ?? goal.maxRetries,
    });
    await this.repository.createItems(
      ticket.id,
      items.map((item, position) => ({ ...item, position })),
    );
    await this.repository.setDependencies(ticket.id, dependsOnTicketIds);
    realtimeEvents.publish("ticket.created", { ticket });
    return ticket;
  }

  findAll(page: number, limit: number): Promise<TicketList> {
    return this.repository.findAll(page, limit);
  }

  async findById(id: string): Promise<Ticket> {
    const ticket = await this.repository.findById(id);
    if (!ticket) throw new NotFoundError(`Ticket with ID ${id} not found`);
    return ticket;
  }

  async update(id: string, data: Partial<NewTicket>): Promise<Ticket> {
    const existing = await this.repository.findById(id);
    if (!existing) throw new NotFoundError(`Ticket with ID ${id} not found`);
    if (data.goalId || data.moduleId) {
      const goalId = data.goalId ?? existing.goalId;
      const moduleId = data.moduleId ?? existing.moduleId;
      const goal = await this.goalsRepository.findById(goalId);
      if (!goal) throw new NotFoundError(`Goal with ID ${goalId} not found`);
      await this.ensureModuleBelongsToProject(moduleId, goal.projectId);
    }
    const ticket = await this.repository.update(id, data);
    if (!ticket) throw new NotFoundError(`Ticket with ID ${id} not found`);
    realtimeEvents.publish("ticket.updated", {
      ticket,
      previousTicket: existing,
    });
    return ticket;
  }

  async delete(id: string): Promise<Ticket> {
    const ticket = await this.repository.delete(id);
    if (!ticket) throw new NotFoundError(`Ticket with ID ${id} not found`);
    realtimeEvents.publish("ticket.deleted", { ticket });
    return ticket;
  }

  async appendFile(id: string, path: string): Promise<{ path: string }> {
    const ticket = await this.findById(id);
    const item = await this.repository.appendRelevantFile(
      ticket.id,
      path.trim(),
    );
    return { path: item.value };
  }

  async report(id: string, data: TicketReportRequest): Promise<Ticket> {
    const ticket = await this.findById(id);
    const goal = await this.goalsRepository.findById(ticket.goalId);
    if (!goal)
      throw new NotFoundError(`Goal with ID ${ticket.goalId} not found`);

    let nextPatch: Partial<NewTicket>;
    if (data.status === "completed") {
      nextPatch = {
        status: "completed",
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

    const updated = await this.repository.update(id, nextPatch);
    if (!updated) throw new NotFoundError(`Ticket with ID ${id} not found`);
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
      }
    }

    return updated;
  }

  private async ensureModuleBelongsToProject(
    moduleId: string | undefined,
    projectId: string,
  ): Promise<void> {
    if (!moduleId) {
      throw new BadRequestError("Ticket moduleId is required");
    }
    const module = await this.repository.findModule(moduleId);
    if (!module)
      throw new NotFoundError(`Module with ID ${moduleId} not found`);
    if (module.projectId !== projectId) {
      throw new BadRequestError(
        "Ticket module must belong to the goal project",
      );
    }
  }
}
