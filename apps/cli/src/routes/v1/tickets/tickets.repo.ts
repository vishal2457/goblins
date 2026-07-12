import path from "node:path";
import type { Goal } from "../../../shared/db/schema/goals";
import type { ProjectModule } from "../../../shared/db/schema/projects";
import type { NewTicket, Ticket, TicketComment } from "../../../shared/db/schema/tickets";
import { goalDir, goalDirectories, goalFile, id, markdownFiles, now, readMarkdown, removePath, ticketFile, writeMarkdown } from "../../../shared/file-store";

const RECENT_TICKET_COMMENT_LIMIT = 5;
export type TicketItem = { id: string; ticketId: string; kind: "acceptance_criterion" | "technical_note" | "relevant_file" | "test_plan_item" | "verification_command"; value: string; position: number };
type TicketDocument = Ticket & { items?: TicketItem[]; dependsOn?: string[]; comments?: TicketComment[] };
export type TicketActivity = { lastActivityAt: Date | null; lastActivityAgeMs: number | null; lastActivityByAgentName: string | null; commentCount: number; recentComments: TicketComment[] };
export type TicketWithActivity = Ticket & { activity: TicketActivity };
export type TicketList = { data: TicketWithActivity[]; pagination: { page: number; limit: number; total: number; totalPages: number } };
export type TicketDependencyEdge = { ticketId: string; dependsOnTicketId: string };

export class TicketsRepository {
  async create(data: NewTicket): Promise<Ticket> {
    const timestamp = now();
    const ticket: TicketDocument = { id: data.id ?? id(), goalId: data.goalId, moduleId: data.moduleId, currentStepId: data.currentStepId ?? null, title: data.title, shortDescription: data.shortDescription ?? "", description: data.description ?? "", type: data.type ?? "implementation", status: data.status ?? "backlog", priority: data.priority ?? "medium", retryCount: data.retryCount ?? 0, maximumRetries: data.maximumRetries ?? 3, assignedSubagentName: data.assignedSubagentName ?? null, subagentStatus: data.subagentStatus ?? null, subagentStatusUpdatedAt: data.subagentStatusUpdatedAt ?? null, lastActivityAt: data.lastActivityAt ?? null, lastActivityByAgentName: data.lastActivityByAgentName ?? null, worktreePath: data.worktreePath ?? null, branchName: data.branchName ?? null, startedAt: data.startedAt ?? null, completedAt: data.completedAt ?? null, createdAt: data.createdAt ?? timestamp, updatedAt: data.updatedAt ?? timestamp, items: [], dependsOn: [], comments: [] };
    await this.write(ticket); return ticket;
  }
  async findGoal(goalId: string): Promise<Goal | null> { const directory = await this.goalDirectory(goalId); return directory ? (await readMarkdown<Goal>(path.join(directory, "goal.md")))?.data ?? null : null; }
  async findModule(moduleId: string): Promise<ProjectModule | null> {
    const ticket = (await this.allDocuments()).find((item) => item.moduleId === moduleId);
    if (!ticket) return null;
    const goal = await this.findGoal(ticket.goalId);
    return goal ? { id: moduleId, projectId: goal.projectId, name: moduleId, shortDescription: "", createdAt: ticket.createdAt, updatedAt: ticket.updatedAt } : null;
  }
  async createItems(ticketId: string, items: Array<{ kind: TicketItem["kind"]; value: string; position: number }>): Promise<void> { const ticket = await this.document(ticketId); if (!ticket) return; ticket.items = [...(ticket.items ?? []), ...items.map((item) => ({ ...item, id: id(), ticketId }))]; await this.write(ticket); }
  async appendRelevantFile(ticketId: string, value: string): Promise<TicketItem> { const ticket = await this.required(ticketId); const existing = (ticket.items ?? []).find((item) => item.kind === "relevant_file" && item.value === value); if (existing) return existing; const relevant = (ticket.items ?? []).filter((item) => item.kind === "relevant_file"); const item: TicketItem = { id: id(), ticketId, kind: "relevant_file", value, position: Math.max(-1, ...relevant.map((entry) => entry.position)) + 1 }; ticket.items = [...(ticket.items ?? []), item]; await this.write(ticket); return item; }
  async setDependencies(ticketId: string, dependsOnTicketIds: string[]): Promise<void> { const ticket = await this.required(ticketId); ticket.dependsOn = [...new Set(dependsOnTicketIds)]; await this.write(ticket); }
  async findDependencies(ticketId: string): Promise<Ticket[]> { const ticket = await this.document(ticketId); return Promise.all((ticket?.dependsOn ?? []).map((dep) => this.document(dep))).then((items) => items.filter(Boolean) as Ticket[]); }
  async findDependents(ticketId: string): Promise<Ticket[]> { return (await this.allDocuments()).filter((ticket) => (ticket.dependsOn ?? []).includes(ticketId)); }
  async findItemsByGoal(goalId: string): Promise<TicketItem[]> { return (await this.documentsForGoal(goalId)).flatMap((ticket) => ticket.items ?? []).sort((a, b) => a.position - b.position); }
  async findDependencyEdgesByGoal(goalId: string): Promise<TicketDependencyEdge[]> { return (await this.documentsForGoal(goalId)).flatMap((ticket) => (ticket.dependsOn ?? []).map((dependsOnTicketId) => ({ ticketId: ticket.id, dependsOnTicketId }))); }
  async findByGoal(goalId: string): Promise<Ticket[]> { return (await this.documentsForGoal(goalId)).sort(compareTickets); }
  async findByModule(moduleId: string): Promise<TicketWithActivity[]> { return this.withActivity((await this.allDocuments()).filter((ticket) => ticket.moduleId === moduleId).sort(compareTickets)); }
  async countIncompleteDependencies(ticketId: string): Promise<number> { return (await this.findDependencies(ticketId)).filter((ticket) => ticket.status !== "completed").length; }
  async releaseReadyDependents(ticketId: string): Promise<number> { let count = 0; for (const ticket of await this.findDependents(ticketId)) if (["blocked", "backlog"].includes(ticket.status) && await this.countIncompleteDependencies(ticket.id) === 0) { ticket.status = "ready"; ticket.updatedAt = now(); await this.write(ticket as TicketDocument); count++; } return count; }
  async findAll(page: number, limit: number): Promise<TicketList> { const all = (await this.allDocuments()).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()); const data = await this.withActivity(all.slice((page - 1) * limit, page * limit)); return { data, pagination: { page, limit, total: all.length, totalPages: Math.ceil(all.length / limit) } }; }
  async findById(idValue: string): Promise<TicketWithActivity | null> { const ticket = await this.document(idValue); return ticket ? (await this.withActivity([ticket]))[0] ?? null : null; }
  async update(idValue: string, data: Partial<NewTicket>): Promise<Ticket | null> { const ticket = await this.document(idValue); if (!ticket) return null; Object.assign(ticket, data, { id: ticket.id, updatedAt: now() }); await this.write(ticket); return ticket; }
  async touchActivity(idValue: string, data: { lastActivityAt?: Date; lastActivityByAgentName?: string | null }): Promise<Ticket | null> { return this.update(idValue, { lastActivityAt: data.lastActivityAt ?? now(), lastActivityByAgentName: data.lastActivityByAgentName ?? null }); }
  async updateGoal(idValue: string, data: Partial<Goal>): Promise<Goal | null> { const directory = await this.goalDirectory(idValue); if (!directory) return null; const file = path.join(directory, "goal.md"); const record = await readMarkdown<Goal>(file); if (!record) return null; const goal = { ...record.data, ...data, id: record.data.id, updatedAt: now() }; await writeMarkdown(file, goal, goal.description); return goal; }
  async goalHasOpenTickets(goalId: string): Promise<boolean> { return (await this.documentsForGoal(goalId)).some((ticket) => ticket.status !== "completed"); }
  async delete(idValue: string): Promise<Ticket | null> { const ticket = await this.document(idValue); const directory = ticket ? await this.goalDirectory(ticket.goalId) : null; if (ticket && directory) await removePath(path.join(directory, `ticket-${ticket.id}.md`)); return ticket; }
  async comments(ticketId: string): Promise<TicketComment[]> { return (await this.document(ticketId))?.comments ?? []; }
  async saveComments(ticketId: string, comments: TicketComment[]): Promise<void> { const ticket = await this.required(ticketId); ticket.comments = comments; await this.write(ticket); }
  private async required(ticketId: string) { const ticket = await this.document(ticketId); if (!ticket) throw new Error(`Ticket ${ticketId} not found`); return ticket; }
  private async documentsForGoal(goalId: string): Promise<TicketDocument[]> { const directory = await this.goalDirectory(goalId); if (!directory) return []; const files = (await markdownFiles(directory)).filter((file) => path.basename(file).startsWith("ticket-")); const records = await Promise.all(files.map((file) => readMarkdown<TicketDocument>(file))); return records.flatMap((record) => record?.data ?? []); }
  private async allDocuments(): Promise<TicketDocument[]> { const groups = await Promise.all((await goalDirectories()).map((dir) => this.documentsForGoal(path.basename(dir)))); return groups.flat(); }
  private async document(ticketId: string): Promise<TicketDocument | null> { return (await this.allDocuments()).find((ticket) => ticket.id === ticketId) ?? null; }
  private async write(ticket: TicketDocument): Promise<void> { const directory = await this.goalDirectory(ticket.goalId); if (!directory) throw new Error(`Goal ${ticket.goalId} not found`); await writeMarkdown(path.join(directory, `ticket-${ticket.id}.md`), ticket, ticket.description); }
  private async goalDirectory(goalId: string): Promise<string | null> { return (await goalDirectories()).find((item) => path.basename(item) === goalId) ?? null; }
  private async withActivity(data: TicketDocument[]): Promise<TicketWithActivity[]> { const current = Date.now(); return data.map((ticket) => { const comments = (ticket.comments ?? []).slice().sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()); const lastActivityAt = ticket.lastActivityAt ?? ticket.updatedAt ?? null; return { ...ticket, activity: { lastActivityAt, lastActivityAgeMs: lastActivityAt ? Math.max(0, current - lastActivityAt.getTime()) : null, lastActivityByAgentName: ticket.lastActivityByAgentName, commentCount: comments.length, recentComments: comments.slice(0, RECENT_TICKET_COMMENT_LIMIT) } }; }); }
}
const priority = { low: 0, medium: 1, high: 2, critical: 3 };
function compareTickets(a: Ticket, b: Ticket) { return priority[b.priority] - priority[a.priority] || a.createdAt.getTime() - b.createdAt.getTime(); }
