import { asc, eq } from "drizzle-orm";
import { db } from "../../../shared/db/index";
import {
  projectModules,
  type NewProjectModule,
  type ProjectModule,
} from "../../../shared/db/schema/projects";

export class ModulesRepository {
  async create(data: NewProjectModule): Promise<ProjectModule> {
    const [module] = await db.insert(projectModules).values(data).returning();
    if (!module) throw new Error("Failed to create module");
    return module;
  }

  async findByProject(projectId: string): Promise<ProjectModule[]> {
    return db
      .select()
      .from(projectModules)
      .where(eq(projectModules.projectId, projectId))
      .orderBy(asc(projectModules.name));
  }

  async findById(id: string): Promise<ProjectModule | null> {
    const [module] = await db
      .select()
      .from(projectModules)
      .where(eq(projectModules.id, id))
      .limit(1);
    return module ?? null;
  }
}
