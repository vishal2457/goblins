import { count, desc, eq } from "drizzle-orm";
import { db } from "../../../shared/db/index";
import {
  goals,
  type NewGoal,
  type Goal,
} from "../../../shared/db/schema/goals";
import { tickets, ticketDependencies } from "../../../shared/db/schema/tickets";

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
      .filter((ticket) => ticket.status === "backlog" || ticket.status === "blocked")
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
    const [goal] = await db
      .delete(goals)
      .where(eq(goals.id, id))
      .returning();
    return goal ?? null;
  }
}
