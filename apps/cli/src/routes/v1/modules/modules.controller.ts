import type { Request, Response } from "express";
import { success } from "../../../shared/api-response/response-handler";
import { asyncHandler } from "../../../shared/utils/async-handler.util";
import { ModulesService } from "./modules.service";

export class ModulesController {
  constructor(private readonly service = new ModulesService()) {}

  findByProject = asyncHandler(async (req: Request, res: Response) => {
    const modules = await this.service.findByProject(req.params.id!);
    success(res, modules, "Modules retrieved successfully");
  });

  findTickets = asyncHandler(async (req: Request, res: Response) => {
    const tickets = await this.service.findTickets(req.params.id!);
    success(res, tickets, "Module tickets retrieved successfully");
  });
}
