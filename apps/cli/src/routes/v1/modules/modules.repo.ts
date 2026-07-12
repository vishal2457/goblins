import type { ProjectModule } from "../../../shared/db/schema/projects";
import { GoalsRepository } from "../goals/goals.repo";
import { TicketsRepository } from "../tickets/tickets.repo";

/** Modules are projections of the moduleId values stored on tickets. */
export class ModulesRepository {
  constructor(
    private readonly tickets = new TicketsRepository(),
    private readonly goals = new GoalsRepository(),
  ) {}

  async findByProject(projectId: string): Promise<ProjectModule[]> {
    const goals = (await this.goals.findAll(1, Number.MAX_SAFE_INTEGER)).data
      .filter((goal) => goal.projectId === projectId);
    const ticketGroups = await Promise.all(goals.map((goal) => this.tickets.findByGoal(goal.id)));
    const firstTicketByModule = new Map<string, (typeof ticketGroups)[number][number]>();
    for (const ticket of ticketGroups.flat()) {
      if (!firstTicketByModule.has(ticket.moduleId)) firstTicketByModule.set(ticket.moduleId, ticket);
    }
    return [...firstTicketByModule.entries()]
      .map(([moduleId, ticket]) => ({
        id: moduleId,
        projectId,
        name: moduleId,
        shortDescription: "",
        createdAt: ticket!.createdAt,
        updatedAt: ticket!.updatedAt,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  async findById(id: string): Promise<ProjectModule | null> {
    const ticket = (await this.tickets.findAll(1, Number.MAX_SAFE_INTEGER)).data
      .find((item) => item.moduleId === id);
    if (!ticket) return null;
    const goal = await this.goals.findById(ticket.goalId);
    if (!goal) return null;
    const tickets = await this.tickets.findByModule(id);
    return {
      id,
      projectId: goal.projectId,
      name: id,
      shortDescription: "",
      createdAt: tickets.reduce((earliest, item) => item.createdAt < earliest ? item.createdAt : earliest, ticket.createdAt),
      updatedAt: tickets.reduce((latest, item) => item.updatedAt > latest ? item.updatedAt : latest, ticket.updatedAt),
    };
  }
}
