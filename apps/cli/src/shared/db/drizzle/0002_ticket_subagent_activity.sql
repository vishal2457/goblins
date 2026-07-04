DO $$ BEGIN
 CREATE TYPE "public"."ticket_subagent_status" AS ENUM('analysing', 'executing', 'verifying', 'done');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
ALTER TABLE "tickets" ADD COLUMN IF NOT EXISTS "subagent_status" "ticket_subagent_status";--> statement-breakpoint
ALTER TABLE "tickets" ADD COLUMN IF NOT EXISTS "subagent_status_updated_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "tickets" ADD COLUMN IF NOT EXISTS "last_activity_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "tickets" ADD COLUMN IF NOT EXISTS "last_activity_by_agent_name" text;--> statement-breakpoint
UPDATE "tickets" SET "last_activity_at" = "updated_at" WHERE "last_activity_at" IS NULL;
