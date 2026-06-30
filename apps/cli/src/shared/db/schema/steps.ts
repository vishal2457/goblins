import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { projects } from "./projects";

export const stepColorEnum = pgEnum("step_color", [
  "slate",
  "blue",
  "amber",
  "green",
  "red",
]);

export const steps = pgTable(
  "steps",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    instructions: text("instructions").notNull(),
    position: integer("position").notNull(),
    isTerminal: boolean("is_terminal").notNull().default(false),
    color: stepColorEnum("color").notNull().default("slate"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("steps_project_position_uidx").on(
      table.projectId,
      table.position,
    ),
    index("steps_project_id_idx").on(table.projectId),
    index("steps_project_terminal_idx").on(table.projectId, table.isTerminal),
  ],
);

export type Step = typeof steps.$inferSelect;
export type NewStep = typeof steps.$inferInsert;
