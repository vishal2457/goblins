import { Request } from "express";
import { AuditService, type AuditEntryInput } from "./audit.service";
import type { AuditAction, AuditModule } from "./audit.constants";

export interface AuditEntry extends AuditEntryInput {
  module: AuditModule;
  action: AuditAction;
  entityId: string | number;
  entityName?: string;
  data?: unknown;
}

export class AuditLogger {
  private auditService: AuditService;

  constructor(auditService: AuditService) {
    this.auditService = auditService;
  }

  log(req: Request, entry: AuditEntry): void {
    void this.auditService.logChange(req, entry);
  }
}
