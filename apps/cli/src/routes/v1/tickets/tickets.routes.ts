import { Router } from "express";
import { validate } from "../../../shared/middlewares/validation.middleware";
import { TicketsController } from "./tickets.controller";
import { ticketCommentsRouter } from "./comments/ticket-comments.routes";
import {
  createTicketSchema,
  ticketIdParamSchema,
  ticketListQuerySchema,
  updateTicketSchema,
  appendTicketFileSchema,
  reportTicketSchema,
} from "./tickets.validation";

const ticketsRouter: Router = Router();
const controller = new TicketsController();

ticketsRouter.get(
  "/",
  validate({ query: ticketListQuerySchema }),
  controller.findAll,
);
ticketsRouter.get(
  "/:id",
  validate({ params: ticketIdParamSchema }),
  controller.findById,
);
ticketsRouter.post(
  "/",
  validate({ body: createTicketSchema }),
  controller.create,
);
ticketsRouter.put(
  "/:id",
  validate({ params: ticketIdParamSchema, body: updateTicketSchema }),
  controller.update,
);
ticketsRouter.patch(
  "/:id",
  validate({ params: ticketIdParamSchema, body: updateTicketSchema }),
  controller.update,
);
ticketsRouter.delete(
  "/:id",
  validate({ params: ticketIdParamSchema }),
  controller.delete,
);
ticketsRouter.post(
  "/:id/files",
  validate({ params: ticketIdParamSchema, body: appendTicketFileSchema }),
  controller.appendFile,
);
ticketsRouter.post(
  "/:id/report",
  validate({ params: ticketIdParamSchema, body: reportTicketSchema }),
  controller.report,
);
ticketsRouter.use("/:id/comments", ticketCommentsRouter);

export { ticketsRouter };
