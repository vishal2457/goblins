import { chmodSync, cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const packageDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const repoRoot = path.resolve(packageDir, "..", "..");
const distDir = path.join(packageDir, "dist");

function copyRequired(source, destination, label) {
  if (!existsSync(source)) {
    throw new Error(`${label} not found at ${source}`);
  }
  rmSync(destination, { recursive: true, force: true });
  mkdirSync(path.dirname(destination), { recursive: true });
  cpSync(source, destination, { recursive: true });
}

copyRequired(
  path.join(packageDir, "src", "shared", "db", "drizzle"),
  path.join(distDir, "shared", "db", "drizzle"),
  "Drizzle migrations",
);

copyRequired(
  path.join(repoRoot, "apps", "web", "dist"),
  path.join(distDir, "public"),
  "Web UI build",
);

copyRequired(
  path.join(repoRoot, "packages", "skills", "goblins"),
  path.join(distDir, "skills", "goblins"),
  "Goblins skill assets",
);

chmodSync(path.join(distDir, "bin", "goblins.js"), 0o755);
