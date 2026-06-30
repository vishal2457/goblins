import type { Request, Response } from "express";
import { success } from "../../../shared/api-response/response-handler";
import { StatusCodes } from "../../../shared/api-response/http-status-code";
import { asyncHandler } from "../../../shared/utils/async-handler.util";
import { ModulesService, type CreateModuleRequest } from "./modules.service";

export class ModulesController {
  constructor(private readonly service = new ModulesService()) {}

  createForProject = asyncHandler(async (req: Request, res: Response) => {
    const module = await this.service.create(
      req.params.id!,
      req.body as CreateModuleRequest,
    );
    success(res, module, "Module created successfully", StatusCodes.CREATED);
  });

  findByProject = asyncHandler(async (req: Request, res: Response) => {
    const modules = await this.service.findByProject(req.params.id!);
    success(res, modules, "Modules retrieved successfully");
  });

  findTickets = asyncHandler(async (req: Request, res: Response) => {
    const tickets = await this.service.findTickets(req.params.id!);
    success(res, tickets, "Module tickets retrieved successfully");
  });
}
