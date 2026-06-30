import type { NewStep, Step } from "../../../shared/db/schema/steps";

export type StepList = {
  data: Step[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export class StepsRepository {
  async create(data: NewStep): Promise<Step> {
    void data;
    throw new Error("Board columns are static and cannot be created");
  }

  async findAll(page: number, limit: number): Promise<StepList> {
    const total = STATIC_STEPS.length;
    const data = STATIC_STEPS.slice((page - 1) * limit, page * limit);
    return {
      data,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findById(id: string): Promise<Step | null> {
    return STATIC_STEPS.find((step) => step.id === id) ?? null;
  }

  async countForProject(projectId: string): Promise<number> {
    void projectId;
    return STATIC_STEPS.length;
  }

  async findByProject(projectId: string): Promise<Step[]> {
    void projectId;
    return STATIC_STEPS;
  }

  async update(id: string, data: Partial<NewStep>): Promise<Step | null> {
    void id;
    void data;
    throw new Error("Board columns are static and cannot be updated");
  }

  async delete(id: string): Promise<Step | null> {
    void id;
    throw new Error("Board columns are static and cannot be deleted");
  }
}

const now = new Date(0);
const STATIC_STEPS = [
  {
    id: "todo",
    projectId: "00000000-0000-0000-0000-000000000000",
    name: "Todo",
    instructions: "Planned or blocked work that is not currently running.",
    position: 0,
    isTerminal: false,
    color: "slate",
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "inprogress",
    projectId: "00000000-0000-0000-0000-000000000000",
    name: "In Progress",
    instructions: "Work currently assigned to an agent.",
    position: 1,
    isTerminal: false,
    color: "blue",
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "done",
    projectId: "00000000-0000-0000-0000-000000000000",
    name: "Done",
    instructions: "Work completed with evidence and accepted by the orchestrator.",
    position: 2,
    isTerminal: true,
    color: "green",
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "failed",
    projectId: "00000000-0000-0000-0000-000000000000",
    name: "Failed",
    instructions: "Work that failed after retries or needs intervention.",
    position: 3,
    isTerminal: true,
    color: "red",
    createdAt: now,
    updatedAt: now,
  },
] as unknown as Step[];
