import * as dotenv from "dotenv";
dotenv.config({ path: `${process.cwd()}/.env` });

import { db, closeDB } from "./shared/db/index";
import { projects } from "./shared/db/schema/index";

async function seed() {
  const [existing] = await db.select().from(projects).limit(1);
  if (!existing) {
    await db.insert(projects).values({
      name: "Goblins",
      location: process.cwd(),
      description: "Default Goblins project",
    });
    console.log("Created the default project");
  } else {
    console.log("A project already exists; nothing to seed");
  }
  await closeDB();
}

seed().catch(async (error) => {
  console.error("Seed failed:", error);
  await closeDB();
  process.exitCode = 1;
});
