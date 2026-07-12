import { stat } from "node:fs/promises";
import path from "node:path";
import type { NewProject, Project } from "../../../shared/db/schema/projects";
import { ensureStore, id, now, projectFile, readMarkdown, registeredProjects, registerProject, unregisterProject, writeMarkdown } from "../../../shared/file-store";
import { BadRequestError, ConflictError } from "../../../shared/utils/http-errors.util";

export type ProjectList = { data: Project[]; pagination: { page: number; limit: number; total: number; totalPages: number } };

export class ProjectsRepository {
  async create(data: NewProject): Promise<Project> {
    const location = path.resolve(data.location);
    if (!path.isAbsolute(data.location)) throw new BadRequestError("Project location must be an absolute path");
    const info = await stat(location).catch(() => null);
    if (!info?.isDirectory()) throw new BadRequestError(`Project directory does not exist: ${location}`);
    const existing = await this.findByLocation(location);
    if (existing) throw new ConflictError(`Project at ${location} is already registered`);
    const timestamp = now();
    const project: Project = { id: data.id ?? id(), name: data.name, location, description: data.description ?? null, createdAt: data.createdAt ?? timestamp, updatedAt: data.updatedAt ?? timestamp };
    await ensureStore(location, false);
    await writeMarkdown(projectFile(location), project, project.description ?? "");
    await registerProject({ id: project.id, location });
    return project;
  }

  async findAll(page: number, limit: number): Promise<ProjectList> {
    const records = await Promise.all((await registeredProjects()).map((entry) => readMarkdown<Project>(projectFile(entry.location))));
    const all = records.flatMap((record) => record?.data ?? []).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return { data: all.slice((page - 1) * limit, page * limit), pagination: { page, limit, total: all.length, totalPages: Math.ceil(all.length / limit) } };
  }
  async findById(idValue: string): Promise<Project | null> { return (await this.all()).find((project) => project.id === idValue) ?? null; }
  async findByLocation(location: string): Promise<Project | null> { const normalized = path.resolve(location); return (await this.all()).find((project) => path.resolve(project.location) === normalized) ?? null; }
  async update(idValue: string, data: Partial<NewProject>): Promise<Project | null> { const project = await this.findById(idValue); if (!project) return null; const { location: _ignoredLocation, ...editable } = data; const updated = { ...project, ...editable, id: project.id, location: project.location, updatedAt: now() } as Project; await writeMarkdown(projectFile(project.location), updated, updated.description ?? ""); return updated; }
  async delete(idValue: string): Promise<Project | null> { const project = await this.findById(idValue); if (!project) return null; await unregisterProject(idValue); return project; }
  private async all(): Promise<Project[]> { return (await this.findAll(1, Number.MAX_SAFE_INTEGER)).data; }
}
