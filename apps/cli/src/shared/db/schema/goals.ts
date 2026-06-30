import {
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { projects } from "./projects";

export const goalStatusEnum = pgEnum("goal_status", [
  "draft",
  "planning",
  "ready",
  "running",
  "paused",
  "blocked",
  "verifying",
  "retrospective",
  "completed",
  "failed",
  "cancelled",
]);

export const goals = pgTable(
  "goals",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    status: goalStatusEnum("status").notNull().default("draft"),
    phases: jsonb("phases")
      .$type<
        Array<{
          id: "planning" | "execution" | "retrospective";
          status:
            | "pending"
            | "in_progress"
            | "paused"
            | "completed"
            | "failed"
            | "cancelled";
          position: number;
          startedAt?: string;
          completedAt?: string;
        }>
      >()
      .notNull()
      .default([
        { id: "planning", status: "pending", position: 0 },
        { id: "execution", status: "pending", position: 1 },
        { id: "retrospective", status: "pending", position: 2 },
      ]),
    technicalInstructions: text("technical_instructions"),
    maxRetries: integer("max_retries").notNull().default(3),
    lastError: jsonb("last_error").$type<Record<string, unknown>>(),
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
    index("goals_project_id_idx").on(table.projectId),
    index("goals_project_status_idx").on(table.projectId, table.status),
    index("goals_created_at_idx").on(table.createdAt),
  ],
);

export type Goal = typeof goals.$inferSelect;
export type NewGoal = typeof goals.$inferInsert;

export const goalItemKindEnum = pgEnum("goal_item_kind", [
  "constraint",
  "acceptance_criterion",
  "relevant_file",
  "out_of_scope_item",
]);

export const goalItems = pgTable(
  "goal_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    goalId: uuid("goal_id")
      .notNull()
      .references(() => goals.id, { onDelete: "cascade" }),
    kind: goalItemKindEnum("kind").notNull(),
    value: text("value").notNull(),
    position: integer("position").notNull(),
  },
  (table) => [
    uniqueIndex("goal_items_kind_position_uidx").on(
      table.goalId,
      table.kind,
      table.position,
    ),
    index("goal_items_goal_id_idx").on(table.goalId),
    index("goal_items_goal_kind_idx").on(table.goalId, table.kind),
  ],
);
