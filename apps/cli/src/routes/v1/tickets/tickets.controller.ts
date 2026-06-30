import type { Request, Response } from "express";
import { success } from "../../../shared/api-response/response-handler";
import { StatusCodes } from "../../../shared/api-response/http-status-code";
import { asyncHandler } from "../../../shared/utils/async-handler.util";
import {
  TicketsService,
  type CreateTicketRequest,
  type TicketReportRequest,
} from "./tickets.service";

export class TicketsController {
  constructor(private readonly service = new TicketsService()) {}

  create = asyncHandler(async (req: Request, res: Response) => {
    const ticket = await this.service.create(req.body as CreateTicketRequest);
    success(res, ticket, "Ticket created successfully", StatusCodes.CREATED);
  });

  findAll = asyncHandler(async (req: Request, res: Response) => {
    const { page, limit } = req.query as unknown as {
      page: number;
      limit: number;
    };
    const result = await this.service.findAll(page, limit);
    success(res, result, "Tickets retrieved successfully");
  });

  findById = asyncHandler(async (req: Request, res: Response) => {
    const ticket = await this.service.findById(req.params.id!);
    success(res, ticket, "Ticket retrieved successfully");
  });

  update = asyncHandler(async (req: Request, res: Response) => {
    const ticket = await this.service.update(req.params.id!, req.body);
    success(res, ticket, "Ticket updated successfully");
  });

  delete = asyncHandler(async (req: Request, res: Response) => {
    const ticket = await this.service.delete(req.params.id!);
    success(res, ticket, "Ticket deleted successfully");
  });

  appendFile = asyncHandler(async (req: Request, res: Response) => {
    const file = await this.service.appendFile(
      req.params.id!,
      req.body.path as string,
    );
    success(res, file, "Ticket file appended", StatusCodes.CREATED);
  });

  report = asyncHandler(async (req: Request, res: Response) => {
    const ticket = await this.service.report(
      req.params.id!,
      req.body as TicketReportRequest,
    );
    success(res, ticket, "Ticket report accepted");
  });
}
