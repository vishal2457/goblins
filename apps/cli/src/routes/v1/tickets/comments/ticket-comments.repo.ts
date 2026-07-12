import type { NewTicketComment, TicketComment } from "../../../../shared/db/schema/tickets";
import { id, now } from "../../../../shared/file-store";
import { TicketsRepository } from "../tickets.repo";
export type TicketCommentList = { data: TicketComment[]; pagination: { page: number; limit: number; total: number; totalPages: number } };
export class TicketCommentsRepository {
  private readonly tickets = new TicketsRepository();
  async create(data: NewTicketComment): Promise<TicketComment> { const comment: TicketComment = { id: data.id ?? id(), ticketId: data.ticketId, body: data.body, authorName: data.authorName ?? null, kind: data.kind ?? "note", createdAt: data.createdAt ?? now() }; const comments = await this.tickets.comments(data.ticketId); await this.tickets.saveComments(data.ticketId, [...comments, comment]); return comment; }
  async findById(idValue: string): Promise<TicketComment | null> { for (const ticket of (await this.tickets.findAll(1, Number.MAX_SAFE_INTEGER)).data) { const found = (await this.tickets.comments(ticket.id)).find((comment) => comment.id === idValue); if (found) return found; } return null; }
  async findByTicket(ticketId: string, page: number, limit: number): Promise<TicketCommentList> { const all = (await this.tickets.comments(ticketId)).sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime()); return { data: all.slice((page - 1) * limit, page * limit), pagination: { page, limit, total: all.length, totalPages: Math.ceil(all.length / limit) } }; }
  async findLatestByTicket(ticketId: string, limit: number) { return (await this.tickets.comments(ticketId)).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, limit); }
  async countByTicket(ticketId: string) { return (await this.tickets.comments(ticketId)).length; }
}
