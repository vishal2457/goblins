import { Router } from "express";
import { validate } from "../../../../shared/middlewares/validation.middleware";
import { TicketCommentsController } from "./ticket-comments.controller";
import {
  createTicketCommentSchema,
  ticketCommentIdParamSchema,
  ticketCommentListQuerySchema,
  ticketCommentTicketParamSchema,
} from "./ticket-comments.validation";

const ticketCommentsRouter: Router = Router({ mergeParams: true });
const controller = new TicketCommentsController();

ticketCommentsRouter.get(
  "/",
  validate({ params: ticketCommentTicketParamSchema, query: ticketCommentListQuerySchema }),
  controller.findAll,
);
ticketCommentsRouter.post(
  "/",
  validate({ params: ticketCommentTicketParamSchema, body: createTicketCommentSchema }),
  controller.create,
);
ticketCommentsRouter.get(
  "/:commentId",
  validate({ params: ticketCommentIdParamSchema }),
  controller.findById,
);

export { ticketCommentsRouter };
