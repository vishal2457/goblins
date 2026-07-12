import type { Request, Response } from "express";
import { success } from "../../../shared/api-response/response-handler";
import { StatusCodes } from "../../../shared/api-response/http-status-code";
import type { NewProject } from "../../../shared/db/schema/projects";
import { asyncHandler } from "../../../shared/utils/async-handler.util";
import {
  discoverProjectAgents,
  updateDiscoveredAgentInstructions,
} from "./project-agents.discovery";
import { ProjectsService } from "./projects.service";

export class ProjectsController {
  constructor(private readonly service = new ProjectsService()) {}

  create = asyncHandler(async (req: Request, res: Response) => {
    const project = await this.service.create(req.body as NewProject);
    success(res, project, "Project registered successfully", StatusCodes.CREATED);
  });

  findAll = asyncHandler(async (req: Request, res: Response) => {
    const { page, limit } = req.query as unknown as {
      page: number;
      limit: number;
    };
    const result = await this.service.findAll(page, limit);
    success(res, result, "Projects retrieved successfully");
  });

  findById = asyncHandler(async (req: Request, res: Response) => {
    const project = await this.service.findById(req.params.id!);
    success(res, project, "Project retrieved successfully");
  });

  discoverAgents = asyncHandler(async (req: Request, res: Response) => {
    const project = await this.service.findById(req.params.id!);
    const agents = await discoverProjectAgents(project.location);
    success(res, agents, "Project agents discovered successfully");
  });

  updateDiscoveredAgentInstructions = asyncHandler(
    async (req: Request, res: Response) => {
      const project = await this.service.findById(req.params.id!);
      const agent = await updateDiscoveredAgentInstructions({
        projectDir: project.location,
        agentId: req.body.agentId,
        instructions: req.body.instructions,
      });
      success(res, agent, "Discovered agent instructions updated successfully");
    },
  );

  update = asyncHandler(async (req: Request, res: Response) => {
    const project = await this.service.update(req.params.id!, req.body);
    success(res, project, "Project updated successfully");
  });

  delete = asyncHandler(async (req: Request, res: Response) => {
    const project = await this.service.delete(req.params.id!);
    success(res, project, "Project unregistered successfully");
  });

}
