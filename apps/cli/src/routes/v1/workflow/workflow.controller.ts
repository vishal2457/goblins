import type { Request, Response } from "express";
import { success } from "../../../shared/api-response/response-handler";
import { asyncHandler } from "../../../shared/utils/async-handler.util";
import { WorkflowService } from "./workflow.service";

export class WorkflowController {
  constructor(private readonly service = new WorkflowService()) {}

  get = asyncHandler(async (_req: Request, res: Response) => {
    success(res, this.service.getWorkflow(), "Workflow retrieved successfully");
  });

  update = asyncHandler(async (req: Request, res: Response) => {
    success(
      res,
      this.service.updateWorkflow(req.body.content),
      "Workflow updated successfully",
    );
  });

  reset = asyncHandler(async (_req: Request, res: Response) => {
    success(res, this.service.resetWorkflow(), "Workflow reset successfully");
  });

  presets = asyncHandler(async (_req: Request, res: Response) => {
    success(
      res,
      this.service.listPresets(),
      "Workflow presets retrieved successfully",
    );
  });

  applyPreset = asyncHandler(async (req: Request, res: Response) => {
    success(
      res,
      this.service.applyPreset(req.params.id!),
      "Workflow preset applied successfully",
    );
  });
}
