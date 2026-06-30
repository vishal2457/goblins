import { and, asc, count, desc, eq } from "drizzle-orm";
import { db } from "../../../../shared/db/index";
import {
  ticketComments,
  type NewTicketComment,
  type TicketComment,
} from "../../../../shared/db/schema/tickets";

export type TicketCommentList = {
  data: TicketComment[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export class TicketCommentsRepository {
  async create(data: NewTicketComment): Promise<TicketComment> {
    const [comment] = await db.insert(ticketComments).values(data).returning();
    if (!comment) throw new Error("Failed to create ticket comment");
    return comment;
  }

  async findById(id: string): Promise<TicketComment | null> {
    const [comment] = await db
      .select()
      .from(ticketComments)
      .where(eq(ticketComments.id, id))
      .limit(1);
    return comment ?? null;
  }

  async findByTicket(
    ticketId: string,
    page: number,
    limit: number,
  ): Promise<TicketCommentList> {
    const where = eq(ticketComments.ticketId, ticketId);
    const [totalRow, data] = await Promise.all([
      db.select({ value: count() }).from(ticketComments).where(where),
      db
        .select()
        .from(ticketComments)
        .where(where)
        .orderBy(asc(ticketComments.createdAt))
        .limit(limit)
        .offset((page - 1) * limit),
    ]);
    const total = Number(totalRow[0]?.value ?? 0);
    return {
      data,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findLatestByTicket(
    ticketId: string,
    limit: number,
  ): Promise<TicketComment[]> {
    return db
      .select()
      .from(ticketComments)
      .where(eq(ticketComments.ticketId, ticketId))
      .orderBy(desc(ticketComments.createdAt))
      .limit(limit);
  }

  async countByTicket(ticketId: string): Promise<number> {
    const [row] = await db
      .select({ value: count() })
      .from(ticketComments)
      .where(and(eq(ticketComments.ticketId, ticketId)));
    return Number(row?.value ?? 0);
  }
}
