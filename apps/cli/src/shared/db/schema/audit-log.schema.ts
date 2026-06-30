import { index, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const auditLog = pgTable(
  "audit_log",
  {
    id: text("id").primaryKey(),
    module: text("module").notNull(),
    action: text("action").notNull(),
    entityId: text("entity_id"),
    entityName: text("entity_name").notNull(),
    data: jsonb("data").default({}),
    userId: text("user_id"),
    userName: text("user_name"),
    userEmail: text("user_email"),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    metadata: jsonb("metadata").default({}),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    moduleIdx: index("audit_log_module_idx").on(table.module),
    actionIdx: index("audit_log_action_idx").on(table.action),
    entityIdx: index("audit_log_entity_idx").on(table.entityName, table.entityId),
    userIdx: index("audit_log_user_idx").on(table.userId),
    createdAtIdx: index("audit_log_created_at_idx").on(table.createdAt),
  }),
);

export type AuditLogType = typeof auditLog.$inferSelect;
export type AuditLogInsertType = typeof auditLog.$inferInsert;
