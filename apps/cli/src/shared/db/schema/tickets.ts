import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { goals } from "./goals";
import { projectModules } from "./projects";
import { steps } from "./steps";

export const ticketTypeEnum = pgEnum("ticket_type", [
  "research",
  "test",
  "implementation",
  "refactor",
  "integration",
  "verification",
  "documentation",
]);
export const ticketStatusEnum = pgEnum("ticket_status", [
  "backlog",
  "ready",
  "blocked",
  "in_progress",
  "review",
  "failed",
  "completed",
  "cancelled",
]);
export const ticketPriorityEnum = pgEnum("ticket_priority", [
  "low",
  "medium",
  "high",
  "critical",
]);

export const tickets = pgTable(
  "tickets",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    goalId: uuid("goal_id")
      .notNull()
      .references(() => goals.id, { onDelete: "cascade" }),
    moduleId: uuid("module_id")
      .notNull()
      .references(() => projectModules.id, { onDelete: "restrict" }),
    currentStepId: uuid("current_step_id").references(() => steps.id),
    title: text("title").notNull(),
    shortDescription: text("short_description").notNull().default(""),
    description: text("description").notNull().default(""),
    type: ticketTypeEnum("type").notNull().default("implementation"),
    status: ticketStatusEnum("status").notNull().default("backlog"),
    priority: ticketPriorityEnum("priority").notNull().default("medium"),
    retryCount: integer("retry_count").notNull().default(0),
    maximumRetries: integer("maximum_retries").notNull().default(3),
    worktreePath: text("worktree_path"),
    branchName: text("branch_name"),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("tickets_goal_id_idx").on(table.goalId),
    index("tickets_module_id_idx").on(table.moduleId),
    index("tickets_goal_status_idx").on(table.goalId, table.status),
    index("tickets_current_step_id_idx").on(table.currentStepId),
    index("tickets_priority_idx").on(table.priority),
  ],
);

export type Ticket = typeof tickets.$inferSelect;
export type NewTicket = typeof tickets.$inferInsert;

export const ticketItemKindEnum = pgEnum("ticket_item_kind", [
  "acceptance_criterion",
  "technical_note",
  "relevant_file",
  "test_plan_item",
  "verification_command",
]);

export const ticketItems = pgTable(
  "ticket_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ticketId: uuid("ticket_id")
      .notNull()
      .references(() => tickets.id, { onDelete: "cascade" }),
    kind: ticketItemKindEnum("kind").notNull(),
    value: text("value").notNull(),
    position: integer("position").notNull(),
  },
  (table) => [
    uniqueIndex("ticket_items_kind_position_uidx").on(
      table.ticketId,
      table.kind,
      table.position,
    ),
    index("ticket_items_ticket_id_idx").on(table.ticketId),
    index("ticket_items_ticket_kind_idx").on(table.ticketId, table.kind),
  ],
);

export const ticketDependencies = pgTable(
  "ticket_dependencies",
  {
    ticketId: uuid("ticket_id")
      .notNull()
      .references(() => tickets.id, { onDelete: "cascade" }),
    dependsOnTicketId: uuid("depends_on_ticket_id")
      .notNull()
      .references(() => tickets.id, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({ columns: [table.ticketId, table.dependsOnTicketId] }),
    check(
      "ticket_dependencies_not_self",
      sql`${table.ticketId} <> ${table.dependsOnTicketId}`,
    ),
    index("ticket_dependencies_depends_on_idx").on(table.dependsOnTicketId),
  ],
);

export const ticketCommentKindEnum = pgEnum("ticket_comment_kind", [
  "note",
  "question",
  "decision",
  "blocker",
]);

export const ticketComments = pgTable(
  "ticket_comments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ticketId: uuid("ticket_id")
      .notNull()
      .references(() => tickets.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    authorName: text("author_name"),
    kind: ticketCommentKindEnum("kind").notNull().default("note"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("ticket_comments_ticket_id_idx").on(table.ticketId),
    index("ticket_comments_ticket_created_idx").on(
      table.ticketId,
      table.createdAt,
    ),
  ],
);

export type TicketComment = typeof ticketComments.$inferSelect;
export type NewTicketComment = typeof ticketComments.$inferInsert;
