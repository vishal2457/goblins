import type { Request, Response } from "express";
import { success } from "../../../../shared/api-response/response-handler";
import { StatusCodes } from "../../../../shared/api-response/http-status-code";
import { asyncHandler } from "../../../../shared/utils/async-handler.util";
import {
  TicketCommentsService,
  type CreateTicketCommentRequest,
} from "./ticket-comments.service";

export class TicketCommentsController {
  constructor(private readonly service = new TicketCommentsService()) {}

  create = asyncHandler(async (req: Request, res: Response) => {
    const ticketId = req.params.id!;
    const comment = await this.service.create(
      ticketId,
      req.body as CreateTicketCommentRequest,
    );
    success(
      res,
      comment,
      "Ticket comment created successfully",
      StatusCodes.CREATED,
    );
  });

  findAll = asyncHandler(async (req: Request, res: Response) => {
    const { page, limit } = req.query as unknown as {
      page: number;
      limit: number;
    };
    const result = await this.service.findAllByTicket(req.params.id!, page, limit);
    success(res, result, "Ticket comments retrieved successfully");
  });

  findById = asyncHandler(async (req: Request, res: Response) => {
    const comment = await this.service.findById(
      req.params.id!,
      req.params.commentId!,
    );
    success(res, comment, "Ticket comment retrieved successfully");
  });
}
