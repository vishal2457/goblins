import { chmodSync, cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const packageDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
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

function copyOptional(source, destination) {
  if (!existsSync(source)) return false;
  rmSync(destination, { recursive: true, force: true });
  mkdirSync(path.dirname(destination), { recursive: true });
  cpSync(source, destination, { recursive: true });
  return true;
}

copyRequired(
  path.join(packageDir, "src", "shared", "db", "drizzle"),
  path.join(distDir, "shared", "db", "drizzle"),
  "Drizzle migrations",
);

const webCopied = copyOptional(
  path.join(repoRoot, "apps", "web", "dist"),
  path.join(distDir, "public"),
);

if (!webCopied) {
  console.warn("Web dist not found; run `pnpm --filter goblins-fe build` before packaging.");
}

chmodSync(path.join(distDir, "bin", "goblins.js"), 0o755);
