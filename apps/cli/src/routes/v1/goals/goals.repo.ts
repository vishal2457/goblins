import path from "node:path";
import type { Project } from "../../../shared/db/schema/projects";
import type { Ticket, TicketComment } from "../../../shared/db/schema/tickets";
import type { Goal, GoalRetrospective, InstructionImprovementProposal, NewGoal, NewGoalRetrospective, NewInstructionImprovementProposal, NewRetrospectiveObservation, RetrospectiveObservation } from "../../../shared/db/schema/goals";
import { goalDir, goalDirectories, goalFile, id, markdownFiles, now, projectFile, readMarkdown, registeredProjects, removePath, writeMarkdown } from "../../../shared/file-store";

type GoalDocument = Goal & { retrospectives?: GoalRetrospective[]; observations?: RetrospectiveObservation[]; proposals?: InstructionImprovementProposal[] };
type TicketDocument = Ticket & { comments?: TicketComment[]; dependsOn?: string[] };
export type GoalList = { data: Goal[]; pagination: { page: number; limit: number; total: number; totalPages: number } };

const phases: Goal["phases"] = [
  { id: "planning", status: "pending", position: 0 },
  { id: "execution", status: "pending", position: 1 },
  { id: "retrospective", status: "pending", position: 2 },
];

export class GoalsRepository {
  async create(data: NewGoal): Promise<Goal> {
    const project = await this.projectById(data.projectId);
    if (!project) throw new Error(`Project ${data.projectId} not found`);
    const timestamp = now();
    const goal: GoalDocument = { id: data.id ?? id(), projectId: data.projectId, title: data.title, description: data.description ?? "", status: data.status ?? "draft", phases: data.phases ?? phases, technicalInstructions: data.technicalInstructions ?? null, maxRetries: data.maxRetries ?? 3, lastError: data.lastError ?? null, startedAt: data.startedAt ?? null, completedAt: data.completedAt ?? null, createdAt: data.createdAt ?? timestamp, updatedAt: data.updatedAt ?? timestamp };
    await writeMarkdown(goalFile(goal.id, project.location), goal, goal.description);
    return goal;
  }
  async findAll(page: number, limit: number): Promise<GoalList> {
    const records = await Promise.all((await goalDirectories()).map((directory) => readMarkdown<GoalDocument>(path.join(directory, "goal.md"))));
    const all = records.flatMap((record) => record?.data ?? []).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return { data: all.slice((page - 1) * limit, page * limit), pagination: { page, limit, total: all.length, totalPages: Math.ceil(all.length / limit) } };
  }
  async findById(idValue: string): Promise<Goal | null> { return (await this.document(idValue)) ?? null; }
  async findProjectByGoal(goalId: string): Promise<Project | null> {
    const goal = await this.findById(goalId); return goal ? this.projectById(goal.projectId) : null;
  }
  async update(idValue: string, data: Partial<NewGoal>): Promise<Goal | null> {
    const goal = await this.document(idValue); if (!goal) return null;
    const updated = { ...goal, ...data, id: goal.id, updatedAt: now() } as GoalDocument;
    const file = await this.goalPath(idValue); if (!file) return null; await writeMarkdown(file, updated, updated.description); return updated;
  }
  async countTickets(goalId: string): Promise<number> { return (await this.ticketDocuments(goalId)).length; }
  async findCommentsByTicketIds(ticketIds: string[]): Promise<TicketComment[]> {
    const wanted = new Set(ticketIds); const output: TicketComment[] = [];
    for (const directory of await goalDirectories()) for (const ticket of await this.ticketDocuments(path.basename(directory))) if (wanted.has(ticket.id)) output.push(...(ticket.comments ?? []));
    return output.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }
  async createRetrospective(data: NewGoalRetrospective): Promise<GoalRetrospective> {
    const timestamp = now(); const value: GoalRetrospective = { id: data.id ?? id(), goalId: data.goalId, userPoints: data.userPoints ?? null, summary: data.summary ?? "", createdAt: data.createdAt ?? timestamp, updatedAt: data.updatedAt ?? timestamp };
    await this.mutate(data.goalId, (goal) => { goal.retrospectives = [...(goal.retrospectives ?? []), value]; }); return value;
  }
  async createRetrospectiveObservations(data: NewRetrospectiveObservation[]): Promise<RetrospectiveObservation[]> {
    const values = data.map((entry) => ({ ...entry, id: entry.id ?? id(), evidence: entry.evidence ?? [], createdAt: entry.createdAt ?? now() } as RetrospectiveObservation));
    if (values[0]) await this.mutate(values[0].goalId, (goal) => { goal.observations = [...(goal.observations ?? []), ...values]; }); return values;
  }
  async createInstructionProposals(data: NewInstructionImprovementProposal[]): Promise<InstructionImprovementProposal[]> {
    const values = data.map((entry) => ({ ...entry, id: entry.id ?? id(), evidence: entry.evidence ?? [], status: entry.status ?? "proposed", beforeSnapshot: entry.beforeSnapshot ?? null, afterSnapshot: entry.afterSnapshot ?? null, approvedAt: entry.approvedAt ?? null, appliedAt: entry.appliedAt ?? null, rejectedAt: entry.rejectedAt ?? null, createdAt: entry.createdAt ?? now(), updatedAt: entry.updatedAt ?? now() } as InstructionImprovementProposal));
    if (values[0]) await this.mutate(values[0].goalId, (goal) => { goal.proposals = [...(goal.proposals ?? []), ...values]; }); return values;
  }
  async findRetrospectivesByGoal(goalId: string) { return (await this.document(goalId))?.retrospectives?.slice().sort(byNewest) ?? []; }
  async findObservationsByGoal(goalId: string) { return (await this.document(goalId))?.observations?.slice().sort(byNewest) ?? []; }
  async findInstructionProposalsByGoal(goalId: string) { return (await this.document(goalId))?.proposals?.slice().sort(byNewest) ?? []; }
  async findInstructionProposalById(idValue: string): Promise<InstructionImprovementProposal | null> {
    for (const directory of await goalDirectories()) { const found = (await this.document(path.basename(directory)))?.proposals?.find((item) => item.id === idValue); if (found) return found; } return null;
  }
  async updateInstructionProposal(idValue: string, data: Partial<NewInstructionImprovementProposal>): Promise<InstructionImprovementProposal | null> {
    const existing = await this.findInstructionProposalById(idValue); if (!existing) return null; let result: InstructionImprovementProposal | null = null;
    await this.mutate(existing.goalId, (goal) => { goal.proposals = (goal.proposals ?? []).map((item) => item.id === idValue ? (result = { ...item, ...data, id: item.id, updatedAt: now() } as InstructionImprovementProposal) : item); }); return result;
  }
  async releaseReadyTickets(goalId: string): Promise<number> {
    const tickets = await this.ticketDocuments(goalId); const completed = new Set(tickets.filter((ticket) => ticket.status === "completed").map((ticket) => ticket.id)); let count = 0;
    for (const ticket of tickets) if (["backlog", "blocked"].includes(ticket.status) && (ticket.dependsOn ?? []).every((dep) => completed.has(dep))) { ticket.status = "ready"; ticket.updatedAt = now(); await this.writeTicket(goalId, ticket); count++; } return count;
  }
  async delete(idValue: string): Promise<Goal | null> { const goal = await this.findById(idValue); const directory = await this.goalDirectory(idValue); if (goal && directory) await removePath(directory); return goal; }
  private async document(goalId: string): Promise<GoalDocument | null> { const file = await this.goalPath(goalId); return file ? (await readMarkdown<GoalDocument>(file))?.data ?? null : null; }
  private async mutate(goalId: string, mutate: (goal: GoalDocument) => void) { const goal = await this.document(goalId); const file = await this.goalPath(goalId); if (!goal || !file) throw new Error(`Goal ${goalId} not found`); mutate(goal); goal.updatedAt = now(); await writeMarkdown(file, goal, goal.description); }
  private async ticketDocuments(goalId: string): Promise<TicketDocument[]> { const directory = await this.goalDirectory(goalId); if (!directory) return []; const files = (await markdownFiles(directory)).filter((file) => path.basename(file).startsWith("ticket-")); const records = await Promise.all(files.map((file) => readMarkdown<TicketDocument>(file))); return records.flatMap((record) => record?.data ?? []); }
  private async writeTicket(goalId: string, ticket: TicketDocument) { const directory = await this.goalDirectory(goalId); if (!directory) throw new Error(`Goal ${goalId} not found`); await writeMarkdown(path.join(directory, `ticket-${ticket.id}.md`), ticket, ticket.description); }
  private async goalDirectory(goalId: string): Promise<string | null> { return (await goalDirectories()).find((item) => path.basename(item) === goalId) ?? null; }
  private async goalPath(goalId: string): Promise<string | null> { const directory = (await goalDirectories()).find((item) => path.basename(item) === goalId); return directory ? path.join(directory, "goal.md") : null; }
  private async projectById(projectId: string): Promise<Project | null> { for (const entry of await registeredProjects()) { const project = (await readMarkdown<Project>(projectFile(entry.location)))?.data; if (project?.id === projectId) return project; } return null; }
}
function byNewest(a: { createdAt: Date }, b: { createdAt: Date }) { return b.createdAt.getTime() - a.createdAt.getTime(); }
