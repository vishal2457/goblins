import { NotFoundError } from "../../../../shared/utils/http-errors.util";
import { TicketsRepository } from "../tickets.repo";
import {
  TicketCommentsRepository,
  type TicketCommentList,
} from "./ticket-comments.repo";
import type { NewTicketComment, TicketComment } from "../../../../shared/db/schema/tickets";

export interface CreateTicketCommentRequest {
  body: string;
  authorName?: string | null;
  kind?: NewTicketComment["kind"];
}

export class TicketCommentsService {
  constructor(
    private readonly commentsRepository = new TicketCommentsRepository(),
    private readonly ticketsRepository = new TicketsRepository(),
  ) {}

  async create(
    ticketId: string,
    data: CreateTicketCommentRequest,
  ): Promise<TicketComment> {
    const ticket = await this.ticketsRepository.findById(ticketId);
    if (!ticket) {
      throw new NotFoundError(`Ticket with ID ${ticketId} not found`);
    }
    const authorName = data.authorName?.trim();
    const comment = await this.commentsRepository.create({
      ticketId,
      body: data.body.trim(),
      authorName: authorName ? authorName : null,
      kind: data.kind ?? "note",
    });
    await this.ticketsRepository.touchActivity(ticketId, {
      lastActivityAt: comment.createdAt,
      lastActivityByAgentName: comment.authorName,
    });
    return comment;
  }

  async findById(ticketId: string, id: string): Promise<TicketComment> {
    const comment = await this.commentsRepository.findById(id);
    if (!comment || comment.ticketId !== ticketId) {
      throw new NotFoundError(
        `Ticket comment with ID ${id} not found for ticket ${ticketId}`,
      );
    }
    return comment;
  }

  async findAllByTicket(
    ticketId: string,
    page: number,
    limit: number,
  ): Promise<TicketCommentList> {
    const ticket = await this.ticketsRepository.findById(ticketId);
    if (!ticket) {
      throw new NotFoundError(`Ticket with ID ${ticketId} not found`);
    }
    return this.commentsRepository.findByTicket(ticketId, page, limit);
  }
}
