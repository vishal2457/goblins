import path from "node:path";
import { auditRoot, id, markdownFiles, now, readMarkdown, removePath, writeMarkdown } from "../../../shared/file-store";
export type AuditLog = { id: string; module: string; action: string; entityId: string | null; entityName: string; data: unknown; userId: string | null; userName: string | null; userEmail: string | null; ipAddress: string | null; userAgent: string | null; metadata: unknown; createdAt: Date };
export type CreateAuditLogData = Omit<AuditLog, "id" | "createdAt" | "entityId" | "userId" | "userName" | "userEmail" | "ipAddress" | "userAgent"> & {
  id?: string;
  entityId?: string | null;
  userId?: string | null;
  userName?: string | null;
  userEmail?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
};
export type AuditSortField = "module" | "action" | "entityName" | "userName" | "createdAt";
export type AuditSortDirection = "asc" | "desc";
export type AuditFilters = { module?: string; action?: string; entityId?: string; entityName?: string; userId?: string; startDate?: string; endDate?: string; filters?: unknown; page?: number; limit?: number; sortBy?: AuditSortField; sortDirection?: AuditSortDirection };
export type AuditListResult = { data: AuditLog[]; pagination: { page: number; limit: number; total: number; totalPages: number } };
export class AuditRepository {
  async create(data: CreateAuditLogData): Promise<AuditLog> { const entry: AuditLog = { ...data, id: data.id ?? id(), entityId: data.entityId ?? null, userId: data.userId ?? null, userName: data.userName ?? null, userEmail: data.userEmail ?? null, ipAddress: data.ipAddress ?? null, userAgent: data.userAgent ?? null, createdAt: now() }; await writeMarkdown(path.join(auditRoot(), `${entry.id}.md`), entry); return entry; }
  async findById(idValue: string) { return (await readMarkdown<AuditLog>(path.join(auditRoot(), `${idValue}.md`)))?.data ?? null; }
  async findAll(filters: AuditFilters = {}): Promise<AuditListResult> { const page = filters.page ?? 1, limit = filters.limit ?? 25; let all = await this.all(); all = all.filter((row) => (!filters.module || row.module === filters.module) && (!filters.action || row.action === filters.action) && (!filters.entityId || row.entityId === filters.entityId) && (!filters.entityName || row.entityName === filters.entityName) && (!filters.userId || row.userId === filters.userId) && (!filters.startDate || row.createdAt >= new Date(filters.startDate)) && (!filters.endDate || row.createdAt <= new Date(filters.endDate))); const field = filters.sortBy ?? "createdAt"; all.sort((a, b) => compare(a[field], b[field]) * (filters.sortDirection === "asc" ? 1 : -1)); return { data: all.slice((page - 1) * limit, page * limit), pagination: { page, limit, total: all.length, totalPages: Math.ceil(all.length / limit) } }; }
  async findByEntity(entityName: string, entityId: string) { return (await this.all()).filter((row) => row.entityName === entityName && row.entityId === entityId).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()); }
  async getModuleStats() { return counts(await this.all(), "module").map(([module, count]) => ({ module, count })); }
  async getActionStats(module?: string) { return counts((await this.all()).filter((row) => !module || row.module === module), "action").map(([action, count]) => ({ action, count })); }
  async purgeOlderThan(date: Date) { const old = (await this.all()).filter((row) => row.createdAt <= date); await Promise.all(old.map((row) => removePath(path.join(auditRoot(), `${row.id}.md`)))); return old.length; }
  private async all() { const records = await Promise.all((await markdownFiles(auditRoot())).map((file) => readMarkdown<AuditLog>(file))); return records.flatMap((record) => record?.data ?? []); }
}
function compare(a: unknown, b: unknown) { const left = a instanceof Date ? a.getTime() : String(a ?? ""); const right = b instanceof Date ? b.getTime() : String(b ?? ""); return left < right ? -1 : left > right ? 1 : 0; }
function counts(rows: AuditLog[], key: "module" | "action") { const map = new Map<string, number>(); for (const row of rows) map.set(row[key], (map.get(row[key]) ?? 0) + 1); return [...map.entries()]; }
