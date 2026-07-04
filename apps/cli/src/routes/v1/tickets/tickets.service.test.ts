import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Goal } from "../../../shared/db/schema/goals";
import type { ProjectModule } from "../../../shared/db/schema/projects";
import type { Ticket } from "../../../shared/db/schema/tickets";
import {
  BadRequestError,
  NotFoundError,
} from "../../../shared/utils/http-errors.util";
import { GoalsRepository } from "../goals/goals.repo";
import { TicketsRepository } from "./tickets.repo";
import { TicketsService } from "./tickets.service";

const projectId = "21a759ff-944d-4336-a522-4e0b3c57172e";
const otherProjectId = "9dc0f0e8-f306-4787-95ed-db8f1f11eb9f";
const goalId = "d97660f9-3a71-413f-8751-f32bd27d2c4a";
const moduleId = "1f33c48c-fdb1-4904-9b0d-97852f0d81f4";
const otherModuleId = "2cc6d648-9540-4c10-a693-9f356a9b88de";

const goal = {
  id: goalId,
  projectId,
  title: "Ship modules",
  description: "",
  status: "draft",
  phases: [],
  technicalInstructions: null,
  maxRetries: 3,
  lastError: null,
  startedAt: null,
  completedAt: null,
  createdAt: new Date("2026-01-01T00:00:00Z"),
  updatedAt: new Date("2026-01-01T00:00:00Z"),
} satisfies Goal;

const module = {
  id: moduleId,
  projectId,
  name: "Planning",
  shortDescription: "Goal planning and ticket generation.",
  createdAt: new Date("2026-01-01T00:00:00Z"),
  updatedAt: new Date("2026-01-01T00:00:00Z"),
} satisfies ProjectModule;

const ticket = {
  id: "a2a6b450-b647-45f4-bd39-6cb1aa809e62",
  goalId,
  moduleId,
  currentStepId: null,
  title: "Implement lifecycle",
  shortDescription: "Implement lifecycle changes.",
  description: "",
  type: "implementation",
  status: "backlog",
  priority: "medium",
  retryCount: 0,
  maximumRetries: 3,
  assignedSubagentName: null,
  subagentStatus: null,
  subagentStatusUpdatedAt: null,
  lastActivityAt: null,
  lastActivityByAgentName: null,
  worktreePath: null,
  branchName: null,
  startedAt: null,
  completedAt: null,
  createdAt: new Date("2026-01-01T00:00:00Z"),
  updatedAt: new Date("2026-01-01T00:00:00Z"),
} satisfies Ticket;

describe("TicketsService module assignment", () => {
  const repository = {
    create: vi.fn(),
    createItems: vi.fn(),
    setDependencies: vi.fn(),
    findGoal: vi.fn(),
    findModule: vi.fn(),
    findById: vi.fn(),
    update: vi.fn(),
    releaseReadyDependents: vi.fn(),
    goalHasOpenTickets: vi.fn(),
    updateGoal: vi.fn(),
  };
  const goalsRepository = { findById: vi.fn() };
  const service = new TicketsService(
    repository as unknown as TicketsRepository,
    goalsRepository as unknown as GoalsRepository,
  );

  beforeEach(() => {
    vi.clearAllMocks();
    repository.createItems.mockResolvedValue(undefined);
    repository.setDependencies.mockResolvedValue(undefined);
    repository.releaseReadyDependents.mockResolvedValue(0);
    repository.goalHasOpenTickets.mockResolvedValue(true);
  });

  it("creates a ticket when its module belongs to the goal project", async () => {
    repository.findGoal.mockResolvedValue(goal);
    repository.findModule.mockResolvedValue(module);
    repository.create.mockImplementation((data) =>
      Promise.resolve({ ...ticket, ...data }),
    );
    repository.findById.mockImplementation((id) =>
      Promise.resolve({ ...ticket, id }),
    );

    const result = await service.create({
      goalId,
      moduleId,
      title: "Implement lifecycle",
    });

    expect(result.moduleId).toBe(moduleId);
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({ goalId, moduleId }),
    );
  });

  it("rejects creating a ticket without a module", async () => {
    repository.findGoal.mockResolvedValue(goal);

    await expect(
      service.create({
        goalId,
        title: "Implement lifecycle",
      } as Parameters<TicketsService["create"]>[0]),
    ).rejects.toBeInstanceOf(BadRequestError);
  });

  it("rejects creating a ticket for a module in another project", async () => {
    repository.findGoal.mockResolvedValue(goal);
    repository.findModule.mockResolvedValue({
      ...module,
      id: otherModuleId,
      projectId: otherProjectId,
    });

    await expect(
      service.create({
        goalId,
        moduleId: otherModuleId,
        title: "Implement lifecycle",
      }),
    ).rejects.toBeInstanceOf(BadRequestError);
  });

  it("rejects updating a ticket to a module in another project", async () => {
    repository.findById.mockResolvedValue(ticket);
    goalsRepository.findById.mockResolvedValue(goal);
    repository.findModule.mockResolvedValue({
      ...module,
      id: otherModuleId,
      projectId: otherProjectId,
    });

    await expect(
      service.update(ticket.id, { moduleId: otherModuleId }),
    ).rejects.toBeInstanceOf(BadRequestError);
  });

  it("updates a ticket to a module in the same project", async () => {
    repository.findById.mockResolvedValue(ticket);
    goalsRepository.findById.mockResolvedValue(goal);
    repository.findModule.mockResolvedValue(module);
    repository.update.mockResolvedValue({ ...ticket, moduleId });

    const result = await service.update(ticket.id, { moduleId });

    expect(result.moduleId).toBe(moduleId);
    expect(repository.update).toHaveBeenCalledWith(ticket.id, { moduleId });
  });

  it("tracks activity author and subagent status timestamps on update", async () => {
    const updatedTicket = {
      ...ticket,
      status: "in_progress" as const,
      subagentStatus: "analysing" as const,
      lastActivityByAgentName: "agent-1",
    };
    repository.findById
      .mockResolvedValueOnce(ticket)
      .mockResolvedValueOnce(updatedTicket);
    repository.update.mockResolvedValue(updatedTicket);

    const result = await service.update(ticket.id, {
      status: "in_progress",
      subagentStatus: "analysing",
      activityAuthorName: "agent-1",
    });

    expect(result.subagentStatus).toBe("analysing");
    expect(repository.update).toHaveBeenCalledWith(
      ticket.id,
      expect.objectContaining({
        status: "in_progress",
        subagentStatus: "analysing",
        lastActivityByAgentName: "agent-1",
        lastActivityAt: expect.any(Date),
        subagentStatusUpdatedAt: expect.any(Date),
      }),
    );
    expect(repository.update.mock.calls[0]?.[1]).not.toHaveProperty(
      "activityAuthorName",
    );
  });

  it("marks subagent progress done when a ticket is reported completed", async () => {
    const inProgressTicket = {
      ...ticket,
      status: "in_progress" as const,
      subagentStatus: "verifying" as const,
    };
    const completedTicket = {
      ...inProgressTicket,
      status: "completed" as const,
      subagentStatus: "done" as const,
      completedAt: new Date("2026-01-02T00:00:00Z"),
    };
    repository.findById
      .mockResolvedValueOnce(inProgressTicket)
      .mockResolvedValueOnce(completedTicket);
    goalsRepository.findById.mockResolvedValue(goal);
    repository.update.mockResolvedValue(completedTicket);

    const result = await service.report(ticket.id, {
      status: "completed",
      activityAuthorName: "agent-1",
    });

    expect(result.subagentStatus).toBe("done");
    expect(repository.update).toHaveBeenCalledWith(
      ticket.id,
      expect.objectContaining({
        status: "completed",
        subagentStatus: "done",
        lastActivityByAgentName: "agent-1",
        lastActivityAt: expect.any(Date),
        subagentStatusUpdatedAt: expect.any(Date),
      }),
    );
  });
});
