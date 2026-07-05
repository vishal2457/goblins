import { asc, count, desc, eq, inArray } from "drizzle-orm";
import { db } from "../../../shared/db/index";
import {
  goalRetrospectives,
  goals,
  instructionImprovementProposals,
  retrospectiveObservations,
  type NewGoal,
  type NewGoalRetrospective,
  type NewInstructionImprovementProposal,
  type NewRetrospectiveObservation,
  type Goal,
  type GoalRetrospective,
  type InstructionImprovementProposal,
  type RetrospectiveObservation,
} from "../../../shared/db/schema/goals";
import {
  ticketComments,
  tickets,
  ticketDependencies,
  type TicketComment,
} from "../../../shared/db/schema/tickets";
import { projects, type Project } from "../../../shared/db/schema/projects";

export type GoalList = {
  data: Goal[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export class GoalsRepository {
  async create(data: NewGoal): Promise<Goal> {
    const [goal] = await db.insert(goals).values(data).returning();
    if (!goal) throw new Error("Failed to create goal");
    return goal;
  }

  async findAll(page: number, limit: number): Promise<GoalList> {
    const [totalRow, data] = await Promise.all([
      db.select({ value: count() }).from(goals),
      db
        .select()
        .from(goals)
        .orderBy(desc(goals.createdAt))
        .limit(limit)
        .offset((page - 1) * limit),
    ]);
    const total = Number(totalRow[0]?.value ?? 0);
    return {
      data,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findById(id: string): Promise<Goal | null> {
    const [goal] = await db
      .select()
      .from(goals)
      .where(eq(goals.id, id))
      .limit(1);
    return goal ?? null;
  }

  async findProjectByGoal(goalId: string): Promise<Project | null> {
    const [row] = await db
      .select({ project: projects })
      .from(goals)
      .innerJoin(projects, eq(goals.projectId, projects.id))
      .where(eq(goals.id, goalId))
      .limit(1);
    return row?.project ?? null;
  }

  async update(id: string, data: Partial<NewGoal>): Promise<Goal | null> {
    const [goal] = await db
      .update(goals)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(goals.id, id))
      .returning();
    return goal ?? null;
  }

  async countTickets(goalId: string): Promise<number> {
    const [row] = await db
      .select({ value: count() })
      .from(tickets)
      .where(eq(tickets.goalId, goalId));
    return Number(row?.value ?? 0);
  }

  async findCommentsByTicketIds(ticketIds: string[]): Promise<TicketComment[]> {
    if (!ticketIds.length) return [];
    return db
      .select()
      .from(ticketComments)
      .where(inArray(ticketComments.ticketId, ticketIds))
      .orderBy(asc(ticketComments.createdAt));
  }

  async createRetrospective(
    data: NewGoalRetrospective,
  ): Promise<GoalRetrospective> {
    const [retrospective] = await db
      .insert(goalRetrospectives)
      .values(data)
      .returning();
    if (!retrospective) throw new Error("Failed to create retrospective");
    return retrospective;
  }

  async createRetrospectiveObservations(
    data: NewRetrospectiveObservation[],
  ): Promise<RetrospectiveObservation[]> {
    if (!data.length) return [];
    return db.insert(retrospectiveObservations).values(data).returning();
  }

  async createInstructionProposals(
    data: NewInstructionImprovementProposal[],
  ): Promise<InstructionImprovementProposal[]> {
    if (!data.length) return [];
    return db.insert(instructionImprovementProposals).values(data).returning();
  }

  async findRetrospectivesByGoal(goalId: string): Promise<GoalRetrospective[]> {
    return db
      .select()
      .from(goalRetrospectives)
      .where(eq(goalRetrospectives.goalId, goalId))
      .orderBy(desc(goalRetrospectives.createdAt));
  }

  async findObservationsByGoal(
    goalId: string,
  ): Promise<RetrospectiveObservation[]> {
    return db
      .select()
      .from(retrospectiveObservations)
      .where(eq(retrospectiveObservations.goalId, goalId))
      .orderBy(desc(retrospectiveObservations.createdAt));
  }

  async findInstructionProposalsByGoal(
    goalId: string,
  ): Promise<InstructionImprovementProposal[]> {
    return db
      .select()
      .from(instructionImprovementProposals)
      .where(eq(instructionImprovementProposals.goalId, goalId))
      .orderBy(desc(instructionImprovementProposals.createdAt));
  }

  async findInstructionProposalById(
    id: string,
  ): Promise<InstructionImprovementProposal | null> {
    const [proposal] = await db
      .select()
      .from(instructionImprovementProposals)
      .where(eq(instructionImprovementProposals.id, id))
      .limit(1);
    return proposal ?? null;
  }

  async updateInstructionProposal(
    id: string,
    data: Partial<NewInstructionImprovementProposal>,
  ): Promise<InstructionImprovementProposal | null> {
    const [proposal] = await db
      .update(instructionImprovementProposals)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(instructionImprovementProposals.id, id))
      .returning();
    return proposal ?? null;
  }

  async releaseReadyTickets(goalId: string): Promise<number> {
    const goalTickets = await db
      .select({ id: tickets.id, status: tickets.status })
      .from(tickets)
      .where(eq(tickets.goalId, goalId));
    const completedIds = new Set(
      goalTickets
        .filter((ticket) => ticket.status === "completed")
        .map((ticket) => ticket.id),
    );
    const candidateIds = goalTickets
      .filter(
        (ticket) => ticket.status === "backlog" || ticket.status === "blocked",
      )
      .map((ticket) => ticket.id);

    let released = 0;
    for (const ticket of goalTickets) {
      if (!candidateIds.includes(ticket.id)) continue;
      const deps = await db
        .select({ dependsOnTicketId: ticketDependencies.dependsOnTicketId })
        .from(ticketDependencies)
        .where(eq(ticketDependencies.ticketId, ticket.id));
      if (deps.every((dep) => completedIds.has(dep.dependsOnTicketId))) {
        const [updated] = await db
          .update(tickets)
          .set({ status: "ready", updatedAt: new Date() })
          .where(eq(tickets.id, ticket.id))
          .returning({ id: tickets.id });
        if (updated) released++;
      }
    }
    return released;
  }

  async delete(id: string): Promise<Goal | null> {
    const [goal] = await db.delete(goals).where(eq(goals.id, id)).returning();
    return goal ?? null;
  }
}
