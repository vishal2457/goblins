import * as dotenv from "dotenv";
import type { Config } from "drizzle-kit";

dotenv.config();

export default {
  schema: [
    "./src/shared/db/schema/projects.ts",
    "./src/shared/db/schema/steps.ts",
    "./src/shared/db/schema/goals.ts",
    "./src/shared/db/schema/tickets.ts",
    "./src/shared/db/schema/audit-log.schema.ts",
  ],
  out: "./src/shared/db/drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
} satisfies Config;
