import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ProjectModule } from "../../../shared/db/schema/projects";
import type { ProjectsRepository } from "../projects/projects.repo";
import type { TicketsRepository } from "../tickets/tickets.repo";
import type { ModulesRepository } from "./modules.repo";
import { ModulesService } from "./modules.service";

const projectId = "21a759ff-944d-4336-a522-4e0b3c57172e";
const moduleId = "1f33c48c-fdb1-4904-9b0d-97852f0d81f4";

const module = {
  id: moduleId,
  projectId,
  name: "Planning",
  shortDescription: "Goal planning and ticket generation.",
  createdAt: new Date("2026-01-01T00:00:00Z"),
  updatedAt: new Date("2026-01-01T00:00:00Z"),
} satisfies ProjectModule;

describe("ModulesService", () => {
  const repository = {
    findByProject: vi.fn(),
    findById: vi.fn(),
  };
  const projectsRepository = { findById: vi.fn() };
  const ticketsRepository = { findByModule: vi.fn() };
  const service = new ModulesService(
    repository as unknown as ModulesRepository,
    projectsRepository as unknown as ProjectsRepository,
    ticketsRepository as unknown as TicketsRepository,
  );

  beforeEach(() => vi.clearAllMocks());

  it("lists modules for an existing project", async () => {
    projectsRepository.findById.mockResolvedValue({ id: projectId });
    repository.findByProject.mockResolvedValue([module]);

    const result = await service.findByProject(projectId);

    expect(result).toEqual([module]);
    expect(repository.findByProject).toHaveBeenCalledWith(projectId);
  });

  it("lists tickets for a module", async () => {
    repository.findById.mockResolvedValue(module);
    ticketsRepository.findByModule.mockResolvedValue([{ id: "ticket-1" }]);

    const result = await service.findTickets(moduleId);

    expect(result).toEqual([{ id: "ticket-1" }]);
    expect(ticketsRepository.findByModule).toHaveBeenCalledWith(moduleId);
  });
});
