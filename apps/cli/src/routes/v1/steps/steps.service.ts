import type { NewStep, Step } from "../../../shared/db/schema/steps";
import { ConflictError, NotFoundError } from "../../../shared/utils/http-errors.util";
import { StepsRepository, type StepList } from "./steps.repo";

export class StepsService {
  constructor(private readonly repository = new StepsRepository()) {}

  create(data: NewStep): Promise<Step> {
    void data;
    throw new ConflictError("Board columns are static and cannot be created");
  }

  findAll(page: number, limit: number): Promise<StepList> {
    return this.repository.findAll(page, limit);
  }

  async findById(id: string): Promise<Step> {
    const step = await this.repository.findById(id);
    if (!step) throw new NotFoundError(`Step with ID ${id} not found`);
    return step;
  }

  async update(id: string, data: Partial<NewStep>): Promise<Step> {
    void id;
    void data;
    throw new ConflictError("Board columns are static and cannot be updated");
  }

  async delete(id: string): Promise<Step> {
    void id;
    throw new ConflictError("Board columns are static and cannot be deleted");
  }
}
