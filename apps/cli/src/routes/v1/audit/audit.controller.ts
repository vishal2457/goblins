import { Request, Response } from "express";
import { AuditService } from "./audit.service";
import { success } from "../../../shared/api-response/response-handler";
import { asyncHandler } from "../../../shared/utils/async-handler.util";
import { type AuditFilters, type AuditSortField, type AuditSortDirection } from "./audit.repo";

const AUDIT_SORT_FIELDS: ReadonlySet<AuditSortField> = new Set<AuditSortField>([
  "module",
  "action",
  "entityName",
  "userName",
  "createdAt",
]);

export class AuditController {
  private auditService: AuditService;

  constructor() {
    this.auditService = new AuditService();
  }

  getAllAudits = asyncHandler(async (req: Request, res: Response) => {
    const { module, action, entityId, entityName, userId, startDate, endDate, filters: rawFilters, page, limit, sortBy, sortDirection } = req.query;

    const normalizedSortBy =
      typeof sortBy === "string" && AUDIT_SORT_FIELDS.has(sortBy as AuditSortField)
        ? (sortBy as AuditSortField)
        : undefined;
    const normalizedSortDirection: AuditSortDirection | undefined =
      sortDirection === "asc" || sortDirection === "desc" ? sortDirection : undefined;

    const filters: AuditFilters = {
      module: module as string | undefined,
      action: action as string | undefined,
      entityId: entityId as string | undefined,
      entityName: entityName as string | undefined,
      userId: userId as string | undefined,
      startDate: startDate as string | undefined,
      endDate: endDate as string | undefined,
      filters: rawFilters,
      page: page ? parseInt(page as string, 10) : undefined,
      limit: limit ? parseInt(limit as string, 10) : undefined,
      sortBy: normalizedSortBy,
      sortDirection: normalizedSortDirection,
    };

    const result = await this.auditService.getAllAudits(filters);
    success(res, result, "Audit logs retrieved successfully");
  });

  getAuditById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const entry = await this.auditService.getAuditById(id!);
    success(res, entry, "Audit log entry retrieved successfully");
  });

  getAuditsByEntity = asyncHandler(async (req: Request, res: Response) => {
    const { entityName, entityId } = req.params;
    const entries = await this.auditService.getAuditsByEntity(entityName!, entityId!);
    success(res, entries, "Entity audit logs retrieved successfully");
  });

  getModuleStats = asyncHandler(async (_req: Request, res: Response) => {
    const stats = await this.auditService.getModuleStats();
    success(res, stats, "Module stats retrieved successfully");
  });

  getActionStats = asyncHandler(async (req: Request, res: Response) => {
    const { module } = req.query;
    const stats = await this.auditService.getActionStats(module as string | undefined);
    success(res, stats, "Action stats retrieved successfully");
  });

  purgeAuditLogs = asyncHandler(async (req: Request, res: Response) => {
    const { days } = req.query as { days?: number };
    const result = await this.auditService.purgeOlderThan(days ?? 90);
    success(res, result, "Audit logs purged successfully");
  });
}
