import type {
  NewProjectModule,
  ProjectModule,
} from "../../../shared/db/schema/projects";
import { NotFoundError } from "../../../shared/utils/http-errors.util";
import { ProjectsRepository } from "../projects/projects.repo";
import {
  TicketsRepository,
  type TicketWithActivity,
} from "../tickets/tickets.repo";
import { ModulesRepository } from "./modules.repo";

export type CreateModuleRequest = Pick<
  NewProjectModule,
  "name" | "shortDescription"
>;

export class ModulesService {
  constructor(
    private readonly repository = new ModulesRepository(),
    private readonly projectsRepository = new ProjectsRepository(),
    private readonly ticketsRepository = new TicketsRepository(),
  ) {}

  async create(
    projectId: string,
    data: CreateModuleRequest,
  ): Promise<ProjectModule> {
    await this.ensureProject(projectId);
    return this.repository.create({
      projectId,
      name: data.name.trim(),
      shortDescription: data.shortDescription?.trim() ?? "",
    });
  }

  async findByProject(projectId: string): Promise<ProjectModule[]> {
    await this.ensureProject(projectId);
    return this.repository.findByProject(projectId);
  }

  async findTickets(moduleId: string): Promise<TicketWithActivity[]> {
    const module = await this.repository.findById(moduleId);
    if (!module)
      throw new NotFoundError(`Module with ID ${moduleId} not found`);
    return this.ticketsRepository.findByModule(moduleId);
  }

  private async ensureProject(projectId: string): Promise<void> {
    const project = await this.projectsRepository.findById(projectId);
    if (!project) {
      throw new NotFoundError(`Project with ID ${projectId} not found`);
    }
  }
}
