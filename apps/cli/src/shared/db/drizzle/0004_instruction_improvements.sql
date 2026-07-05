DO $$ BEGIN
 CREATE TYPE "public"."retrospective_observation_kind" AS ENUM('planning_gap', 'workflow_gap', 'subagent_gap', 'verification_gap', 'handoff_gap', 'tooling_gap');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."instruction_proposal_target" AS ENUM('workflow_instruction', 'subagent_instruction');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."instruction_proposal_status" AS ENUM('proposed', 'approved', 'rejected', 'applied');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "goal_retrospectives" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "goal_id" uuid NOT NULL,
  "user_points" text,
  "summary" text DEFAULT '' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "retrospective_observations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "retrospective_id" uuid NOT NULL,
  "goal_id" uuid NOT NULL,
  "kind" "retrospective_observation_kind" NOT NULL,
  "summary" text NOT NULL,
  "evidence" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "position" integer NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "instruction_improvement_proposals" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "goal_id" uuid NOT NULL,
  "retrospective_id" uuid NOT NULL,
  "target_type" "instruction_proposal_target" NOT NULL,
  "target_id" text NOT NULL,
  "target_label" text NOT NULL,
  "proposed_instructions" text NOT NULL,
  "rationale" text NOT NULL,
  "evidence" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "status" "instruction_proposal_status" DEFAULT 'proposed' NOT NULL,
  "before_snapshot" text,
  "after_snapshot" text,
  "approved_at" timestamp with time zone,
  "applied_at" timestamp with time zone,
  "rejected_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "goal_retrospectives" ADD CONSTRAINT "goal_retrospectives_goal_id_goals_id_fk" FOREIGN KEY ("goal_id") REFERENCES "public"."goals"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "retrospective_observations" ADD CONSTRAINT "retrospective_observations_retrospective_id_goal_retrospectives_id_fk" FOREIGN KEY ("retrospective_id") REFERENCES "public"."goal_retrospectives"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "retrospective_observations" ADD CONSTRAINT "retrospective_observations_goal_id_goals_id_fk" FOREIGN KEY ("goal_id") REFERENCES "public"."goals"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "instruction_improvement_proposals" ADD CONSTRAINT "instruction_improvement_proposals_goal_id_goals_id_fk" FOREIGN KEY ("goal_id") REFERENCES "public"."goals"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "instruction_improvement_proposals" ADD CONSTRAINT "instruction_improvement_proposals_retrospective_id_goal_retrospectives_id_fk" FOREIGN KEY ("retrospective_id") REFERENCES "public"."goal_retrospectives"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "goal_retrospectives_goal_id_idx" ON "goal_retrospectives" USING btree ("goal_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "goal_retrospectives_created_at_idx" ON "goal_retrospectives" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "retrospective_observations_goal_id_idx" ON "retrospective_observations" USING btree ("goal_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "retrospective_observations_retrospective_id_idx" ON "retrospective_observations" USING btree ("retrospective_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "retrospective_observations_kind_idx" ON "retrospective_observations" USING btree ("kind");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "instruction_improvement_goal_id_idx" ON "instruction_improvement_proposals" USING btree ("goal_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "instruction_improvement_retrospective_id_idx" ON "instruction_improvement_proposals" USING btree ("retrospective_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "instruction_improvement_status_idx" ON "instruction_improvement_proposals" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "instruction_improvement_target_idx" ON "instruction_improvement_proposals" USING btree ("target_type","target_id");
