CREATE TYPE "public"."step_color" AS ENUM('slate', 'blue', 'amber', 'green', 'red');--> statement-breakpoint
CREATE TYPE "public"."goal_item_kind" AS ENUM('constraint', 'acceptance_criterion', 'relevant_file', 'out_of_scope_item');--> statement-breakpoint
CREATE TYPE "public"."goal_status" AS ENUM('draft', 'planning', 'ready', 'running', 'paused', 'blocked', 'verifying', 'retrospective', 'completed', 'failed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."ticket_comment_kind" AS ENUM('note', 'question', 'decision', 'blocker');--> statement-breakpoint
CREATE TYPE "public"."ticket_item_kind" AS ENUM('acceptance_criterion', 'technical_note', 'relevant_file', 'test_plan_item', 'verification_command');--> statement-breakpoint
CREATE TYPE "public"."ticket_priority" AS ENUM('low', 'medium', 'high', 'critical');--> statement-breakpoint
CREATE TYPE "public"."ticket_subagent_status" AS ENUM('analysing', 'executing', 'verifying', 'done');--> statement-breakpoint
CREATE TYPE "public"."ticket_status" AS ENUM('backlog', 'ready', 'blocked', 'in_progress', 'review', 'failed', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."ticket_type" AS ENUM('research', 'test', 'implementation', 'refactor', 'integration', 'verification', 'documentation');--> statement-breakpoint
CREATE TABLE "project_modules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"name" text NOT NULL,
	"short_description" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_tech_preferences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"value" text NOT NULL,
	"position" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"location" text NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "steps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"name" text NOT NULL,
	"instructions" text NOT NULL,
	"position" integer NOT NULL,
	"is_terminal" boolean DEFAULT false NOT NULL,
	"color" "step_color" DEFAULT 'slate' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "goal_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"goal_id" uuid NOT NULL,
	"kind" "goal_item_kind" NOT NULL,
	"value" text NOT NULL,
	"position" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "goals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"status" "goal_status" DEFAULT 'draft' NOT NULL,
	"phases" jsonb DEFAULT '[{"id":"planning","status":"pending","position":0},{"id":"execution","status":"pending","position":1},{"id":"retrospective","status":"pending","position":2}]'::jsonb NOT NULL,
	"technical_instructions" text,
	"max_retries" integer DEFAULT 3 NOT NULL,
	"last_error" jsonb,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ticket_comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ticket_id" uuid NOT NULL,
	"body" text NOT NULL,
	"author_name" text,
	"kind" "ticket_comment_kind" DEFAULT 'note' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ticket_dependencies" (
	"ticket_id" uuid NOT NULL,
	"depends_on_ticket_id" uuid NOT NULL,
	CONSTRAINT "ticket_dependencies_ticket_id_depends_on_ticket_id_pk" PRIMARY KEY("ticket_id","depends_on_ticket_id"),
	CONSTRAINT "ticket_dependencies_not_self" CHECK ("ticket_dependencies"."ticket_id" <> "ticket_dependencies"."depends_on_ticket_id")
);
--> statement-breakpoint
CREATE TABLE "ticket_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ticket_id" uuid NOT NULL,
	"kind" "ticket_item_kind" NOT NULL,
	"value" text NOT NULL,
	"position" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tickets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"goal_id" uuid NOT NULL,
	"module_id" uuid NOT NULL,
	"current_step_id" uuid,
	"title" text NOT NULL,
	"short_description" text DEFAULT '' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"type" "ticket_type" DEFAULT 'implementation' NOT NULL,
	"status" "ticket_status" DEFAULT 'backlog' NOT NULL,
	"priority" "ticket_priority" DEFAULT 'medium' NOT NULL,
	"retry_count" integer DEFAULT 0 NOT NULL,
	"maximum_retries" integer DEFAULT 3 NOT NULL,
	"assigned_subagent_name" text,
	"subagent_status" "ticket_subagent_status",
	"subagent_status_updated_at" timestamp with time zone,
	"last_activity_at" timestamp with time zone,
	"last_activity_by_agent_name" text,
	"worktree_path" text,
	"branch_name" text,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" text PRIMARY KEY NOT NULL,
	"module" text NOT NULL,
	"action" text NOT NULL,
	"entity_id" text,
	"entity_name" text NOT NULL,
	"data" jsonb DEFAULT '{}'::jsonb,
	"user_id" text,
	"user_name" text,
	"user_email" text,
	"ip_address" text,
	"user_agent" text,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "project_modules" ADD CONSTRAINT "project_modules_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_tech_preferences" ADD CONSTRAINT "project_tech_preferences_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "steps" ADD CONSTRAINT "steps_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goal_items" ADD CONSTRAINT "goal_items_goal_id_goals_id_fk" FOREIGN KEY ("goal_id") REFERENCES "public"."goals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goals" ADD CONSTRAINT "goals_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_comments" ADD CONSTRAINT "ticket_comments_ticket_id_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_dependencies" ADD CONSTRAINT "ticket_dependencies_ticket_id_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_dependencies" ADD CONSTRAINT "ticket_dependencies_depends_on_ticket_id_tickets_id_fk" FOREIGN KEY ("depends_on_ticket_id") REFERENCES "public"."tickets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_items" ADD CONSTRAINT "ticket_items_ticket_id_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_goal_id_goals_id_fk" FOREIGN KEY ("goal_id") REFERENCES "public"."goals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_module_id_project_modules_id_fk" FOREIGN KEY ("module_id") REFERENCES "public"."project_modules"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_current_step_id_steps_id_fk" FOREIGN KEY ("current_step_id") REFERENCES "public"."steps"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "project_modules_project_id_idx" ON "project_modules" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "project_modules_project_name_idx" ON "project_modules" USING btree ("project_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX "project_tech_preferences_position_uidx" ON "project_tech_preferences" USING btree ("project_id","position");--> statement-breakpoint
CREATE INDEX "project_tech_preferences_project_id_idx" ON "project_tech_preferences" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "projects_name_idx" ON "projects" USING btree ("name");--> statement-breakpoint
CREATE INDEX "projects_created_at_idx" ON "projects" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "steps_project_position_uidx" ON "steps" USING btree ("project_id","position");--> statement-breakpoint
CREATE INDEX "steps_project_id_idx" ON "steps" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "steps_project_terminal_idx" ON "steps" USING btree ("project_id","is_terminal");--> statement-breakpoint
CREATE UNIQUE INDEX "goal_items_kind_position_uidx" ON "goal_items" USING btree ("goal_id","kind","position");--> statement-breakpoint
CREATE INDEX "goal_items_goal_id_idx" ON "goal_items" USING btree ("goal_id");--> statement-breakpoint
CREATE INDEX "goal_items_goal_kind_idx" ON "goal_items" USING btree ("goal_id","kind");--> statement-breakpoint
CREATE INDEX "goals_project_id_idx" ON "goals" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "goals_project_status_idx" ON "goals" USING btree ("project_id","status");--> statement-breakpoint
CREATE INDEX "goals_created_at_idx" ON "goals" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "ticket_comments_ticket_id_idx" ON "ticket_comments" USING btree ("ticket_id");--> statement-breakpoint
CREATE INDEX "ticket_comments_ticket_created_idx" ON "ticket_comments" USING btree ("ticket_id","created_at");--> statement-breakpoint
CREATE INDEX "ticket_dependencies_depends_on_idx" ON "ticket_dependencies" USING btree ("depends_on_ticket_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ticket_items_kind_position_uidx" ON "ticket_items" USING btree ("ticket_id","kind","position");--> statement-breakpoint
CREATE INDEX "ticket_items_ticket_id_idx" ON "ticket_items" USING btree ("ticket_id");--> statement-breakpoint
CREATE INDEX "ticket_items_ticket_kind_idx" ON "ticket_items" USING btree ("ticket_id","kind");--> statement-breakpoint
CREATE INDEX "tickets_goal_id_idx" ON "tickets" USING btree ("goal_id");--> statement-breakpoint
CREATE INDEX "tickets_module_id_idx" ON "tickets" USING btree ("module_id");--> statement-breakpoint
CREATE INDEX "tickets_goal_status_idx" ON "tickets" USING btree ("goal_id","status");--> statement-breakpoint
CREATE INDEX "tickets_current_step_id_idx" ON "tickets" USING btree ("current_step_id");--> statement-breakpoint
CREATE INDEX "tickets_priority_idx" ON "tickets" USING btree ("priority");--> statement-breakpoint
CREATE INDEX "audit_log_module_idx" ON "audit_log" USING btree ("module");--> statement-breakpoint
CREATE INDEX "audit_log_action_idx" ON "audit_log" USING btree ("action");--> statement-breakpoint
CREATE INDEX "audit_log_entity_idx" ON "audit_log" USING btree ("entity_name","entity_id");--> statement-breakpoint
CREATE INDEX "audit_log_user_idx" ON "audit_log" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "audit_log_created_at_idx" ON "audit_log" USING btree ("created_at");
