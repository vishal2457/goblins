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

export const retrospectiveObservationKindEnum = pgEnum(
  "retrospective_observation_kind",
  [
    "planning_gap",
    "workflow_gap",
    "subagent_gap",
    "verification_gap",
    "handoff_gap",
    "tooling_gap",
  ],
);

export const goalRetrospectives = pgTable(
  "goal_retrospectives",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    goalId: uuid("goal_id")
      .notNull()
      .references(() => goals.id, { onDelete: "cascade" }),
    userPoints: text("user_points"),
    summary: text("summary").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("goal_retrospectives_goal_id_idx").on(table.goalId),
    index("goal_retrospectives_created_at_idx").on(table.createdAt),
  ],
);

export type GoalRetrospective = typeof goalRetrospectives.$inferSelect;
export type NewGoalRetrospective = typeof goalRetrospectives.$inferInsert;

export const retrospectiveObservations = pgTable(
  "retrospective_observations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    retrospectiveId: uuid("retrospective_id")
      .notNull()
      .references(() => goalRetrospectives.id, { onDelete: "cascade" }),
    goalId: uuid("goal_id")
      .notNull()
      .references(() => goals.id, { onDelete: "cascade" }),
    kind: retrospectiveObservationKindEnum("kind").notNull(),
    summary: text("summary").notNull(),
    evidence: jsonb("evidence")
      .$type<Array<{ type: string; id?: string; summary: string }>>()
      .notNull()
      .default([]),
    position: integer("position").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("retrospective_observations_goal_id_idx").on(table.goalId),
    index("retrospective_observations_retrospective_id_idx").on(
      table.retrospectiveId,
    ),
    index("retrospective_observations_kind_idx").on(table.kind),
  ],
);

export type RetrospectiveObservation =
  typeof retrospectiveObservations.$inferSelect;
export type NewRetrospectiveObservation =
  typeof retrospectiveObservations.$inferInsert;

export const instructionProposalTargetEnum = pgEnum(
  "instruction_proposal_target",
  ["workflow_instruction", "subagent_instruction"],
);

export const instructionProposalStatusEnum = pgEnum(
  "instruction_proposal_status",
  ["proposed", "approved", "rejected", "applied"],
);

export const instructionImprovementProposals = pgTable(
  "instruction_improvement_proposals",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    goalId: uuid("goal_id")
      .notNull()
      .references(() => goals.id, { onDelete: "cascade" }),
    retrospectiveId: uuid("retrospective_id")
      .notNull()
      .references(() => goalRetrospectives.id, { onDelete: "cascade" }),
    targetType: instructionProposalTargetEnum("target_type").notNull(),
    targetId: text("target_id").notNull(),
    targetLabel: text("target_label").notNull(),
    proposedInstructions: text("proposed_instructions").notNull(),
    rationale: text("rationale").notNull(),
    evidence: jsonb("evidence")
      .$type<Array<{ type: string; id?: string; summary: string }>>()
      .notNull()
      .default([]),
    status: instructionProposalStatusEnum("status")
      .notNull()
      .default("proposed"),
    beforeSnapshot: text("before_snapshot"),
    afterSnapshot: text("after_snapshot"),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    appliedAt: timestamp("applied_at", { withTimezone: true }),
    rejectedAt: timestamp("rejected_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("instruction_improvement_goal_id_idx").on(table.goalId),
    index("instruction_improvement_retrospective_id_idx").on(
      table.retrospectiveId,
    ),
    index("instruction_improvement_status_idx").on(table.status),
    index("instruction_improvement_target_idx").on(
      table.targetType,
      table.targetId,
    ),
  ],
);

export type InstructionImprovementProposal =
  typeof instructionImprovementProposals.$inferSelect;
export type NewInstructionImprovementProposal =
  typeof instructionImprovementProposals.$inferInsert;

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
