import { z } from "zod";
import { AUDIT_ACTION_VALUES, AUDIT_MODULE_VALUES } from "./audit.constants";

export const auditFiltersSchema = z.object({
  module: z.enum(AUDIT_MODULE_VALUES).optional(),
  action: z.enum(AUDIT_ACTION_VALUES).optional(),
  entityId: z.string().optional(),
  entityName: z.string().optional(),
  userId: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  filters: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  sortBy: z.enum(["module", "action", "entityName", "userName", "createdAt"]).default("createdAt"),
  sortDirection: z.enum(["asc", "desc"]).default("desc"),
});

export const auditIdParamSchema = z.object({
  id: z.string().min(1, "ID is required"),
});

export const auditPurgeQuerySchema = z.object({
  days: z.coerce
    .number()
    .int()
    .min(1, "Days must be at least 1")
    .max(3650, "Days cannot exceed 3650 (10 years)")
    .default(90),
});
