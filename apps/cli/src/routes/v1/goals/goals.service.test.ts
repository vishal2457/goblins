import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
  Goal,
  GoalRetrospective,
  InstructionImprovementProposal,
} from "../../../shared/db/schema/goals";
import type { Project } from "../../../shared/db/schema/projects";
import type { Ticket, TicketComment } from "../../../shared/db/schema/tickets";
import { ConflictError } from "../../../shared/utils/http-errors.util";
import type { AuditService } from "../audit/audit.service";
import type { WorkflowService } from "../workflow/workflow.service";
import type { TicketsRepository } from "../tickets/tickets.repo";
import type { GoalsRepository } from "./goals.repo";
import { GoalsService } from "./goals.service";

vi.mock("../projects/project-agents.discovery", () => ({
  discoverProjectAgents: vi.fn().mockResolvedValue({
    agents: [],
    providers: {},
    scannedAt: "2026-01-01T00:00:00.000Z",
  }),
  updateDiscoveredAgentInstructions: vi.fn(),
}));

const projectId = "21a759ff-944d-4336-a522-4e0b3c57172e";
const goalId = "d97660f9-3a71-413f-8751-f32bd27d2c4a";
const retrospectiveId = "86af3a45-c693-461d-9974-6fbfa28c252a";
const proposalId = "5e836635-cf94-44ed-a19c-16e84f8e7869";

const goal = {
  id: goalId,
  projectId,
  title: "Improve delivery",
  description: "Ship the planned changes.",
  status: "completed",
  phases: [],
  technicalInstructions: "Keep changes focused.",
  maxRetries: 3,
  lastError: null,
  startedAt: new Date("2026-01-01T00:00:00Z"),
  completedAt: new Date("2026-01-02T00:00:00Z"),
  createdAt: new Date("2026-01-01T00:00:00Z"),
  updatedAt: new Date("2026-01-02T00:00:00Z"),
} satisfies Goal;

const project = {
  id: projectId,
  name: "Goblins",
  location: "/tmp/goblins",
  description: null,
  createdAt: new Date("2026-01-01T00:00:00Z"),
  updatedAt: new Date("2026-01-01T00:00:00Z"),
} satisfies Project;

const baseTicket = {
  id: "a2a6b450-b647-45f4-bd39-6cb1aa809e62",
  goalId,
  moduleId: "1f33c48c-fdb1-4904-9b0d-97852f0d81f4",
  currentStepId: null,
  title: "Implement feature",
  shortDescription: "Implement the feature.",
  description: "",
  type: "implementation",
  status: "completed",
  priority: "medium",
  retryCount: 1,
  maximumRetries: 3,
  assignedSubagentName: "builder",
  subagentStatus: "done",
  subagentStatusUpdatedAt: new Date("2026-01-01T04:00:00Z"),
  lastActivityAt: new Date("2026-01-01T04:00:00Z"),
  lastActivityByAgentName: "builder",
  worktreePath: null,
  branchName: null,
  startedAt: new Date("2026-01-01T01:00:00Z"),
  completedAt: new Date("2026-01-01T04:00:00Z"),
  createdAt: new Date("2026-01-01T00:00:00Z"),
  updatedAt: new Date("2026-01-01T04:00:00Z"),
} satisfies Ticket;

const blockerComment = {
  id: "c148725e-bdad-41aa-91c7-41f97d9a72e3",
  ticketId: baseTicket.id,
  body: "Blocked waiting for a decision.",
  authorName: "builder",
  kind: "blocker",
  createdAt: new Date("2026-01-01T02:00:00Z"),
} satisfies TicketComment;

const retrospective = {
  id: retrospectiveId,
  goalId,
  userPoints: "Need stronger verification.",
  summary: "1 ticket analysed. 1 instruction-only proposals generated.",
  createdAt: new Date("2026-01-02T00:00:00Z"),
  updatedAt: new Date("2026-01-02T00:00:00Z"),
} satisfies GoalRetrospective;

const workflowProposal = {
  id: proposalId,
  goalId,
  retrospectiveId,
  targetType: "workflow_instruction",
  targetId: "/tmp/workflow.md",
  targetLabel: "Active workflow instructions",
  proposedInstructions:
    "# Workflow\n\n## Self-improvement additions\n\n- Verify.",
  rationale: "Verification gap.",
  evidence: [
    { type: "ticket", id: baseTicket.id, summary: "Missing evidence" },
  ],
  status: "approved",
  beforeSnapshot: "# Workflow\n",
  afterSnapshot: null,
  approvedAt: new Date("2026-01-02T00:00:00Z"),
  appliedAt: null,
  rejectedAt: null,
  createdAt: new Date("2026-01-02T00:00:00Z"),
  updatedAt: new Date("2026-01-02T00:00:00Z"),
} satisfies InstructionImprovementProposal;

describe("GoalsService self-improvement", () => {
  const repository = {
    findById: vi.fn(),
    findCommentsByTicketIds: vi.fn(),
    findProjectByGoal: vi.fn(),
    createRetrospective: vi.fn(),
    createRetrospectiveObservations: vi.fn(),
    createInstructionProposals: vi.fn(),
    findInstructionProposalById: vi.fn(),
    updateInstructionProposal: vi.fn(),
  };
  const ticketsRepository = {
    findByGoal: vi.fn(),
  };
  const auditService = {
    getAuditsByEntity: vi.fn(),
    logChange: vi.fn(),
  };
  const workflowService = {
    getWorkflow: vi.fn(),
    updateWorkflow: vi.fn(),
  };

  const service = new GoalsService(
    repository as unknown as GoalsRepository,
    ticketsRepository as unknown as TicketsRepository,
    auditService as unknown as AuditService,
    workflowService as unknown as WorkflowService,
  );

  beforeEach(() => {
    vi.clearAllMocks();
    repository.findById.mockResolvedValue(goal);
    repository.findCommentsByTicketIds.mockResolvedValue([blockerComment]);
    repository.findProjectByGoal.mockResolvedValue(project);
    repository.createRetrospective.mockResolvedValue(retrospective);
    repository.createRetrospectiveObservations.mockImplementation((items) =>
      Promise.resolve(
        items.map((item: object, index: number) => ({
          id: `observation-${index}`,
          createdAt: new Date("2026-01-02T00:00:00Z"),
          ...item,
        })),
      ),
    );
    repository.createInstructionProposals.mockImplementation((items) =>
      Promise.resolve(
        items.map((item: object) => ({
          id: proposalId,
          status: "proposed",
          approvedAt: null,
          appliedAt: null,
          rejectedAt: null,
          afterSnapshot: null,
          createdAt: new Date("2026-01-02T00:00:00Z"),
          updatedAt: new Date("2026-01-02T00:00:00Z"),
          ...item,
        })),
      ),
    );
    ticketsRepository.findByGoal.mockResolvedValue([baseTicket]);
    auditService.getAuditsByEntity.mockResolvedValue([
      {
        id: "audit-1",
        module: "ticket",
        action: "REPORT",
        entityId: goalId,
        entityName: "goal",
        data: {},
        userId: null,
        userName: null,
        userEmail: null,
        ipAddress: null,
        userAgent: null,
        metadata: {},
        createdAt: new Date("2026-01-02T00:00:00Z"),
      },
    ]);
    auditService.logChange.mockResolvedValue(undefined);
    workflowService.getWorkflow.mockReturnValue({
      content: "# Workflow\n",
      sourcePath: "/tmp/workflow.md",
    });
    workflowService.updateWorkflow.mockReturnValue({
      content: workflowProposal.proposedInstructions,
      sourcePath: "/tmp/workflow.md",
    });
  });

  it("builds a compact goal overview with failure signals and important comments", async () => {
    const overview = await service.goalOverview(goalId);

    expect(overview.ticketStatusCounts.completed).toBe(1);
    expect(overview.failurePoints).toEqual([
      expect.objectContaining({
        ticketId: baseTicket.id,
        signals: expect.arrayContaining([
          "contains_blocker",
          "missing_verification_evidence",
        ]),
      }),
    ]);
    expect(overview.importantComments[0]?.kind).toBe("blocker");
    expect(overview.verification.ticketsMissingEvidence).toEqual([
      baseTicket.id,
    ]);
  });

  it("creates only instruction-targeted proposals and stores non-applyable observations separately", async () => {
    const result = await service.analyseRetrospective(goalId, {
      userPoints: "Need stronger verification.",
    });

    expect(result.proposals).toHaveLength(1);
    expect(result.proposals[0]?.targetType).toBe("workflow_instruction");
    expect(result.proposals[0]?.proposedInstructions).toContain(
      "Self-improvement additions",
    );
    expect(result.observations.map((item) => item.kind)).toContain(
      "tooling_gap",
    );
    expect(repository.createInstructionProposals).toHaveBeenCalledWith([
      expect.objectContaining({
        targetType: "workflow_instruction",
        targetId: "/tmp/workflow.md",
      }),
    ]);
  });

  it("applies approved workflow proposals through the workflow service", async () => {
    repository.findInstructionProposalById.mockResolvedValue(workflowProposal);
    repository.updateInstructionProposal.mockImplementation((_id, patch) =>
      Promise.resolve({ ...workflowProposal, ...patch }),
    );

    const result = await service.applyImprovement(goalId, proposalId);

    expect(result.status).toBe("applied");
    expect(workflowService.updateWorkflow).toHaveBeenCalledWith(
      workflowProposal.proposedInstructions,
    );
    expect(repository.updateInstructionProposal).toHaveBeenCalledWith(
      proposalId,
      expect.objectContaining({
        status: "applied",
        afterSnapshot: workflowProposal.proposedInstructions,
      }),
    );
  });

  it("does not mutate instructions for rejected proposals", async () => {
    repository.findInstructionProposalById.mockResolvedValue({
      ...workflowProposal,
      status: "rejected",
    });

    await expect(
      service.applyImprovement(goalId, proposalId),
    ).rejects.toBeInstanceOf(ConflictError);

    expect(workflowService.updateWorkflow).not.toHaveBeenCalled();
  });
});
