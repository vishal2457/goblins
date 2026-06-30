import type { Request, Response } from "express";
import { success } from "../../../shared/api-response/response-handler";
import { StatusCodes } from "../../../shared/api-response/http-status-code";
import type { NewGoal } from "../../../shared/db/schema/goals";
import { asyncHandler } from "../../../shared/utils/async-handler.util";
import { GoalsService } from "./goals.service";

export class GoalsController {
  constructor(private readonly service = new GoalsService()) {}

  create = asyncHandler(async (req: Request, res: Response) => {
    const goal = await this.service.create(req.body as NewGoal);
    success(res, goal, "Goal created successfully", StatusCodes.CREATED);
  });

  findAll = asyncHandler(async (req: Request, res: Response) => {
    const { page, limit } = req.query as unknown as { page: number; limit: number };
    const result = await this.service.findAll(page, limit);
    success(res, result, "Goals retrieved successfully");
  });

  findById = asyncHandler(async (req: Request, res: Response) => {
    const goal = await this.service.findById(req.params.id!);
    success(res, goal, "Goal retrieved successfully");
  });

  goalTicketsSnapshot = asyncHandler(async (req: Request, res: Response) => {
    const snapshot = await this.service.goalTicketsSnapshot(req.params.id!);
    success(res, snapshot, "Goal tickets snapshot retrieved successfully");
  });

  update = asyncHandler(async (req: Request, res: Response) => {
    const goal = await this.service.update(req.params.id!, req.body);
    success(res, goal, "Goal updated successfully");
  });

  startPlanning = asyncHandler(async (req: Request, res: Response) => {
    const goal = await this.service.startPlanning(req.params.id!);
    success(res, goal, "Goal planning started");
  });

  completePlanning = asyncHandler(async (req: Request, res: Response) => {
    const goal = await this.service.completePlanning(req.params.id!);
    success(res, goal, "Goal planning completed");
  });

  startExecution = asyncHandler(async (req: Request, res: Response) => {
    const goal = await this.service.startExecution(req.params.id!);
    success(res, goal, "Goal execution started");
  });

  startRetrospective = asyncHandler(async (req: Request, res: Response) => {
    const goal = await this.service.startRetrospective(req.params.id!, {
      userPoints: req.body.userPoints,
    });
    success(res, goal, "Goal retrospective started");
  });

  completeRetrospective = asyncHandler(async (req: Request, res: Response) => {
    const goal = await this.service.completeRetrospective(req.params.id!);
    success(res, goal, "Goal retrospective completed");
  });

  delete = asyncHandler(async (req: Request, res: Response) => {
    const goal = await this.service.delete(req.params.id!);
    success(res, goal, "Goal deleted successfully");
  });
}
