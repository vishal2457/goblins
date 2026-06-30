import { Request } from "express";
import { AuditRepository, type CreateAuditLogData, type AuditFilters, type AuditLog, type AuditListResult } from "./audit.repo";
import { BadRequestError, NotFoundError } from "../../../shared/utils/http-errors.util";
import { JwtPayload } from "../../../shared/jwt/jwt-auth.middleware";

export interface AuditEntryInput {
  module: string;
  action: string;
  entityId: string | number;
  entityName?: string;
  data?: unknown;
}

export class AuditService {
  private repo: AuditRepository;

  constructor() {
    this.repo = new AuditRepository();
  }

  async logChange(req: Request | undefined, entry: AuditEntryInput): Promise<void> {
    const user = req?.user as (JwtPayload & { name?: string; username?: string }) | undefined;

    const payload: CreateAuditLogData = {
      module: entry.module,
      action: entry.action,
      entityId: String(entry.entityId),
      entityName: entry.entityName ?? entry.module,
      data: entry.data as CreateAuditLogData["data"],
      userId: user?.id,
      userName: user?.name ?? user?.username,
      userEmail: user?.email,
      ipAddress: req?.ip ?? req?.socket?.remoteAddress ?? undefined,
      userAgent: req?.headers?.["user-agent"],
      metadata: req
        ? {
            method: req.method,
            url: req.originalUrl,
            timestamp: new Date().toISOString(),
          }
        : undefined,
    };

    try {
      await this.repo.create(payload);
    } catch (error) {
      console.error("[Audit] Failed to log change:", error);
    }
  }

  async getAuditById(id: string): Promise<AuditLog> {
    const entry = await this.repo.findById(id);
    if (!entry) {
      throw new NotFoundError(`Audit log entry with ID ${id} not found`);
    }
    return entry;
  }

  async getAllAudits(filters?: AuditFilters): Promise<AuditListResult> {
    try {
      return await this.repo.findAll(filters);
    } catch (error) {
      throw new BadRequestError("Failed to fetch audit logs", error);
    }
  }

  async getAuditsByEntity(entityName: string, entityId: string): Promise<AuditLog[]> {
    try {
      return await this.repo.findByEntity(entityName, entityId);
    } catch (error) {
      throw new BadRequestError("Failed to fetch audit logs for entity", error);
    }
  }

  async getModuleStats(): Promise<{ module: string; count: number }[]> {
    try {
      return await this.repo.getModuleStats();
    } catch (error) {
      throw new BadRequestError("Failed to fetch module stats", error);
    }
  }

  async getActionStats(module?: string): Promise<{ action: string; count: number }[]> {
    try {
      return await this.repo.getActionStats(module);
    } catch (error) {
      throw new BadRequestError("Failed to fetch action stats", error);
    }
  }

  async purgeOlderThan(days: number): Promise<{ deleted: number }> {
    const date = new Date();
    date.setDate(date.getDate() - days);
    const deleted = await this.repo.purgeOlderThan(date);
    return { deleted };
  }
}
