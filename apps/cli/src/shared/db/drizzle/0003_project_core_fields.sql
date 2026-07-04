ALTER TABLE "projects" DROP COLUMN IF EXISTS "base_branch";--> statement-breakpoint
ALTER TABLE "projects" DROP COLUMN IF EXISTS "execution_mode";--> statement-breakpoint
ALTER TABLE "projects" DROP COLUMN IF EXISTS "test_command";--> statement-breakpoint
ALTER TABLE "projects" DROP COLUMN IF EXISTS "lint_command";--> statement-breakpoint
ALTER TABLE "projects" DROP COLUMN IF EXISTS "type_check_command";--> statement-breakpoint
ALTER TABLE "projects" DROP COLUMN IF EXISTS "build_command";--> statement-breakpoint
DROP TYPE IF EXISTS "public"."execution_mode";
