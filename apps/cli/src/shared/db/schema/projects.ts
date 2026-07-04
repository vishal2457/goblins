import {
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const projects = pgTable(
  "projects",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    location: text("location").notNull(),
    description: text("description"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("projects_name_idx").on(table.name),
    index("projects_created_at_idx").on(table.createdAt),
  ],
);

export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;

export const projectModules = pgTable(
  "project_modules",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    shortDescription: text("short_description").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("project_modules_project_id_idx").on(table.projectId),
    index("project_modules_project_name_idx").on(table.projectId, table.name),
  ],
);

export type ProjectModule = typeof projectModules.$inferSelect;
export type NewProjectModule = typeof projectModules.$inferInsert;

export const projectTechPreferences = pgTable(
  "project_tech_preferences",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    value: text("value").notNull(),
    position: integer("position").notNull(),
  },
  (table) => [
    uniqueIndex("project_tech_preferences_position_uidx").on(
      table.projectId,
      table.position,
    ),
    index("project_tech_preferences_project_id_idx").on(table.projectId),
  ],
);
