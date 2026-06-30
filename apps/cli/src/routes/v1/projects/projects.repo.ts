import { count, desc, eq } from "drizzle-orm";
import { db } from "../../../shared/db/index";
import {
  projects,
  type NewProject,
  type Project,
} from "../../../shared/db/schema/projects";

export type ProjectList = {
  data: Project[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export class ProjectsRepository {
  async create(data: NewProject): Promise<Project> {
    const [project] = await db.insert(projects).values(data).returning();
    if (!project) throw new Error("Failed to create project");
    return project;
  }

  async findAll(page: number, limit: number): Promise<ProjectList> {
    const [totalRow, data] = await Promise.all([
      db.select({ value: count() }).from(projects),
      db
        .select()
        .from(projects)
        .orderBy(desc(projects.createdAt))
        .limit(limit)
        .offset((page - 1) * limit),
    ]);
    const total = Number(totalRow[0]?.value ?? 0);
    return {
      data,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findById(id: string): Promise<Project | null> {
    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, id))
      .limit(1);
    return project ?? null;
  }

  async update(id: string, data: Partial<NewProject>): Promise<Project | null> {
    const [project] = await db
      .update(projects)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(projects.id, id))
      .returning();
    return project ?? null;
  }

  async delete(id: string): Promise<Project | null> {
    const [project] = await db
      .delete(projects)
      .where(eq(projects.id, id))
      .returning();
    return project ?? null;
  }
}
