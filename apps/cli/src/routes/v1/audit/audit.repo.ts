import crypto from "node:crypto";
import { and, asc, count, desc, eq, gte, lte, type SQL } from "drizzle-orm";
import { db } from "../../../shared/db/index";
import { auditLog, type AuditLogInsertType, type AuditLogType } from "../../../shared/db/schema/audit-log.schema";

export type AuditLog = AuditLogType;
export type CreateAuditLogData = Omit<AuditLogInsertType, "id" | "createdAt"> & { id?: string };
export type AuditSortField = "module" | "action" | "entityName" | "userName" | "createdAt";
export type AuditSortDirection = "asc" | "desc";
export type AuditFilters = {
  module?: string;
  action?: string;
  entityId?: string;
  entityName?: string;
  userId?: string;
  startDate?: string;
  endDate?: string;
  filters?: unknown;
  page?: number;
  limit?: number;
  sortBy?: AuditSortField;
  sortDirection?: AuditSortDirection;
};
export type AuditListResult = {
  data: AuditLog[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
};

const sortColumns = {
  module: auditLog.module,
  action: auditLog.action,
  entityName: auditLog.entityName,
  userName: auditLog.userName,
  createdAt: auditLog.createdAt,
};

export class AuditRepository {
  async create(data: CreateAuditLogData): Promise<AuditLog> {
    const [entry] = await db.insert(auditLog).values({ ...data, id: data.id ?? crypto.randomUUID() }).returning();
    if (!entry) throw new Error("Failed to create audit log entry");
    return entry;
  }

  async findById(id: string): Promise<AuditLog | null> {
    const [entry] = await db.select().from(auditLog).where(eq(auditLog.id, id)).limit(1);
    return entry ?? null;
  }

  async findAll(filters: AuditFilters = {}): Promise<AuditListResult> {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 25;
    const conditions: SQL[] = [];
    if (filters.module) conditions.push(eq(auditLog.module, filters.module));
    if (filters.action) conditions.push(eq(auditLog.action, filters.action));
    if (filters.entityId) conditions.push(eq(auditLog.entityId, filters.entityId));
    if (filters.entityName) conditions.push(eq(auditLog.entityName, filters.entityName));
    if (filters.userId) conditions.push(eq(auditLog.userId, filters.userId));
    if (filters.startDate) conditions.push(gte(auditLog.createdAt, new Date(filters.startDate)));
    if (filters.endDate) conditions.push(lte(auditLog.createdAt, new Date(filters.endDate)));
    const where = conditions.length ? and(...conditions) : undefined;
    const direction = filters.sortDirection === "asc" ? asc : desc;
    const column = sortColumns[filters.sortBy ?? "createdAt"];
    const [totalRow] = await db.select({ value: count() }).from(auditLog).where(where);
    const data = await db.select().from(auditLog).where(where).orderBy(direction(column)).limit(limit).offset((page - 1) * limit);
    const total = Number(totalRow?.value ?? 0);
    return { data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  findByEntity(entityName: string, entityId: string): Promise<AuditLog[]> {
    return db.select().from(auditLog).where(and(eq(auditLog.entityName, entityName), eq(auditLog.entityId, entityId))).orderBy(desc(auditLog.createdAt));
  }

  async getModuleStats(): Promise<{ module: string; count: number }[]> {
    const rows = await db.select({ module: auditLog.module, value: count() }).from(auditLog).groupBy(auditLog.module);
    return rows.map((row) => ({ module: row.module, count: Number(row.value) }));
  }

  async getActionStats(module?: string): Promise<{ action: string; count: number }[]> {
    const rows = await db.select({ action: auditLog.action, value: count() }).from(auditLog).where(module ? eq(auditLog.module, module) : undefined).groupBy(auditLog.action);
    return rows.map((row) => ({ action: row.action, count: Number(row.value) }));
  }

  async purgeOlderThan(date: Date): Promise<number> {
    return (await db.delete(auditLog).where(lte(auditLog.createdAt, date)).returning({ id: auditLog.id })).length;
  }
}
