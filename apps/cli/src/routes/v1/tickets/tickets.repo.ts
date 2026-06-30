import { and, asc, count, desc, eq, inArray } from "drizzle-orm";
import { db } from "../../../shared/db/index";
import { goals, type Goal } from "../../../shared/db/schema/goals";
import {
  projectModules,
  type ProjectModule,
} from "../../../shared/db/schema/projects";
import {
  ticketDependencies,
  ticketItems,
  tickets,
  type NewTicket,
  type Ticket,
} from "../../../shared/db/schema/tickets";

export type TicketList = {
  data: Ticket[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export type TicketItem = typeof ticketItems.$inferSelect;

export type TicketDependencyEdge = {
  ticketId: string;
  dependsOnTicketId: string;
};

export class TicketsRepository {
  async create(data: NewTicket): Promise<Ticket> {
    const [ticket] = await db.insert(tickets).values(data).returning();
    if (!ticket) throw new Error("Failed to create ticket");
    return ticket;
  }

  async findGoal(goalId: string): Promise<Goal | null> {
    const [goal] = await db
      .select()
      .from(goals)
      .where(eq(goals.id, goalId))
      .limit(1);
    return goal ?? null;
  }

  async findModule(moduleId: string): Promise<ProjectModule | null> {
    const [module] = await db
      .select()
      .from(projectModules)
      .where(eq(projectModules.id, moduleId))
      .limit(1);
    return module ?? null;
  }

  async createItems(
    ticketId: string,
    items: Array<{
      kind: (typeof ticketItems.$inferInsert)["kind"];
      value: string;
      position: number;
    }>,
  ): Promise<void> {
    if (!items.length) return;
    await db.insert(ticketItems).values(
      items.map((item) => ({
        ticketId,
        kind: item.kind,
        value: item.value,
        position: item.position,
      })),
    );
  }

  async appendRelevantFile(
    ticketId: string,
    path: string,
  ): Promise<TicketItem> {
    const existing = await db
      .select()
      .from(ticketItems)
      .where(
        and(
          eq(ticketItems.ticketId, ticketId),
          eq(ticketItems.kind, "relevant_file"),
        ),
      );
    const duplicate = existing.find((item) => item.value === path);
    if (duplicate) return duplicate;

    const nextPosition =
      Math.max(-1, ...existing.map((item) => item.position)) + 1;
    const [item] = await db
      .insert(ticketItems)
      .values({
        ticketId,
        kind: "relevant_file",
        value: path,
        position: nextPosition,
      })
      .returning();
    if (!item) throw new Error("Failed to append ticket file");
    return item;
  }

  async setDependencies(
    ticketId: string,
    dependsOnTicketIds: string[],
  ): Promise<void> {
    if (!dependsOnTicketIds.length) return;
    await db.insert(ticketDependencies).values(
      dependsOnTicketIds.map((dependsOnTicketId) => ({
        ticketId,
        dependsOnTicketId,
      })),
    );
  }

  async findDependencies(ticketId: string): Promise<Ticket[]> {
    const rows = await db
      .select({ ticket: tickets })
      .from(ticketDependencies)
      .innerJoin(tickets, eq(ticketDependencies.dependsOnTicketId, tickets.id))
      .where(eq(ticketDependencies.ticketId, ticketId));
    return rows.map((row) => row.ticket);
  }

  async findDependents(ticketId: string): Promise<Ticket[]> {
    const rows = await db
      .select({ ticket: tickets })
      .from(ticketDependencies)
      .innerJoin(tickets, eq(ticketDependencies.ticketId, tickets.id))
      .where(eq(ticketDependencies.dependsOnTicketId, ticketId));
    return rows.map((row) => row.ticket);
  }

  async findItemsByGoal(goalId: string): Promise<TicketItem[]> {
    const goalTickets = await this.findByGoal(goalId);
    const ticketIds = goalTickets.map((ticket) => ticket.id);
    if (!ticketIds.length) return [];
    return db
      .select()
      .from(ticketItems)
      .where(inArray(ticketItems.ticketId, ticketIds))
      .orderBy(asc(ticketItems.position));
  }

  async findDependencyEdgesByGoal(
    goalId: string,
  ): Promise<TicketDependencyEdge[]> {
    const goalTickets = await this.findByGoal(goalId);
    const ticketIds = goalTickets.map((ticket) => ticket.id);
    if (!ticketIds.length) return [];
    return db
      .select({
        ticketId: ticketDependencies.ticketId,
        dependsOnTicketId: ticketDependencies.dependsOnTicketId,
      })
      .from(ticketDependencies)
      .where(inArray(ticketDependencies.ticketId, ticketIds));
  }

  async findByGoal(goalId: string): Promise<Ticket[]> {
    return db
      .select()
      .from(tickets)
      .where(eq(tickets.goalId, goalId))
      .orderBy(desc(tickets.priority), asc(tickets.createdAt));
  }

  async findByModule(moduleId: string): Promise<Ticket[]> {
    return db
      .select()
      .from(tickets)
      .where(eq(tickets.moduleId, moduleId))
      .orderBy(desc(tickets.priority), asc(tickets.createdAt));
  }

  async countIncompleteDependencies(ticketId: string): Promise<number> {
    const deps = await this.findDependencies(ticketId);
    return deps.filter((dep) => dep.status !== "completed").length;
  }

  async releaseReadyDependents(ticketId: string): Promise<number> {
    const dependents = await this.findDependents(ticketId);
    let released = 0;
    for (const dependent of dependents) {
      if (dependent.status !== "blocked" && dependent.status !== "backlog")
        continue;
      if ((await this.countIncompleteDependencies(dependent.id)) > 0) continue;
      const [updated] = await db
        .update(tickets)
        .set({ status: "ready", updatedAt: new Date() })
        .where(eq(tickets.id, dependent.id))
        .returning({ id: tickets.id });
      if (updated) released++;
    }
    return released;
  }

  async findAll(page: number, limit: number): Promise<TicketList> {
    const [totalRow, data] = await Promise.all([
      db.select({ value: count() }).from(tickets),
      db
        .select()
        .from(tickets)
        .orderBy(desc(tickets.createdAt))
        .limit(limit)
        .offset((page - 1) * limit),
    ]);
    const total = Number(totalRow[0]?.value ?? 0);
    return {
      data,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findById(id: string): Promise<Ticket | null> {
    const [ticket] = await db
      .select()
      .from(tickets)
      .where(eq(tickets.id, id))
      .limit(1);
    return ticket ?? null;
  }

  async update(id: string, data: Partial<NewTicket>): Promise<Ticket | null> {
    const [ticket] = await db
      .update(tickets)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(tickets.id, id))
      .returning();
    return ticket ?? null;
  }

  async updateGoal(
    id: string,
    data: Partial<typeof goals.$inferInsert>,
  ): Promise<Goal | null> {
    const [goal] = await db
      .update(goals)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(goals.id, id))
      .returning();
    return goal ?? null;
  }

  async goalHasOpenTickets(goalId: string): Promise<boolean> {
    const [row] = await db
      .select({ value: count() })
      .from(tickets)
      .where(and(eq(tickets.goalId, goalId), eq(tickets.status, "completed")));
    const completed = Number(row?.value ?? 0);
    const [totalRow] = await db
      .select({ value: count() })
      .from(tickets)
      .where(eq(tickets.goalId, goalId));
    return completed < Number(totalRow?.value ?? 0);
  }

  async delete(id: string): Promise<Ticket | null> {
    const [ticket] = await db
      .delete(tickets)
      .where(eq(tickets.id, id))
      .returning();
    return ticket ?? null;
  }
}
