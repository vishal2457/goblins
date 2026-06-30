import type { Request, Response } from "express";
import { success } from "../../../shared/api-response/response-handler";
import { StatusCodes } from "../../../shared/api-response/http-status-code";
import type { NewStep } from "../../../shared/db/schema/steps";
import { asyncHandler } from "../../../shared/utils/async-handler.util";
import { StepsService } from "./steps.service";

export class StepsController {
  constructor(private readonly service = new StepsService()) {}

  create = asyncHandler(async (req: Request, res: Response) => {
    const step = await this.service.create(req.body as NewStep);
    success(res, step, "Step created successfully", StatusCodes.CREATED);
  });

  findAll = asyncHandler(async (req: Request, res: Response) => {
    const { page, limit } = req.query as unknown as { page: number; limit: number };
    const result = await this.service.findAll(page, limit);
    success(res, result, "Steps retrieved successfully");
  });

  findById = asyncHandler(async (req: Request, res: Response) => {
    const step = await this.service.findById(req.params.id!);
    success(res, step, "Step retrieved successfully");
  });

  update = asyncHandler(async (req: Request, res: Response) => {
    const step = await this.service.update(req.params.id!, req.body);
    success(res, step, "Step updated successfully");
  });

  delete = asyncHandler(async (req: Request, res: Response) => {
    const step = await this.service.delete(req.params.id!);
    success(res, step, "Step deleted successfully");
  });
}
