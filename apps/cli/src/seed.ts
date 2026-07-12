import path from "node:path";
import { ProjectsRepository } from "./routes/v1/projects/projects.repo";

async function seed() {
  const repository = new ProjectsRepository();
  const existing = await repository.findAll(1, 1);
  if (existing.data.length) return console.log("A project already exists; nothing to seed");
  await repository.create({ name: path.basename(process.cwd()), location: process.cwd(), description: "Default Goblins project" });
  console.log("Created .goblins/project.md");
}
seed().catch((error) => { console.error("Seed failed:", error); process.exitCode = 1; });
