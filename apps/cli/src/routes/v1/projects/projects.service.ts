import type { NewProject, Project } from "../../../shared/db/schema/projects";
import { NotFoundError } from "../../../shared/utils/http-errors.util";
import { ProjectsRepository, type ProjectList } from "./projects.repo";

export class ProjectsService {
  constructor(private readonly repository = new ProjectsRepository()) {}

  async create(data: NewProject): Promise<Project> {
    return this.repository.create(data);
  }

  findAll(page: number, limit: number): Promise<ProjectList> {
    return this.repository.findAll(page, limit);
  }

  async findById(id: string): Promise<Project> {
    const project = await this.repository.findById(id);
    if (!project) throw new NotFoundError(`Project with ID ${id} not found`);
    return project;
  }

  async update(id: string, data: Partial<NewProject>): Promise<Project> {
    const project = await this.repository.update(id, data);
    if (!project) throw new NotFoundError(`Project with ID ${id} not found`);
    return project;
  }

  async delete(id: string): Promise<Project> {
    const project = await this.repository.delete(id);
    if (!project) throw new NotFoundError(`Project with ID ${id} not found`);
    return project;
  }
}
