#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const rootDirectory = resolve(import.meta.dirname, "..");
const cliDirectory = join(rootDirectory, "apps", "cli");
const cliPackage = JSON.parse(
  readFileSync(join(cliDirectory, "package.json"), "utf8"),
);
const dryRun = process.argv.includes("--dry-run");

const leakedWorkspaceDependency = Object.entries(
  cliPackage.dependencies ?? {},
).find(([, version]) => String(version).startsWith("workspace:"));

if (leakedWorkspaceDependency) {
  const [name, version] = leakedWorkspaceDependency;
  console.error(
    `Refusing to publish: runtime dependency ${name} uses unsupported version ${version}.`,
  );
  process.exit(1);
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: rootDirectory,
    encoding: "utf8",
    shell: process.platform === "win32",
    ...options,
  });

  if (result.status !== 0) {
    if (result.stdout) process.stdout.write(result.stdout);
    if (result.stderr) process.stderr.write(result.stderr);
    process.exit(result.status ?? 1);
  }

  return result.stdout;
}

console.log(`Building ${cliPackage.name}@${cliPackage.version}...`);
run("pnpm", ["run", "build:cli"], { stdio: "inherit" });

const packDirectory = mkdtempSync(join(tmpdir(), "goblins-cli-"));

try {
  const packOutput = run("npm", [
    "pack",
    cliDirectory,
    "--pack-destination",
    packDirectory,
    "--json",
  ]);
  const [{ filename }] = JSON.parse(packOutput);
  const tarball = join(packDirectory, filename);

  console.log(`${dryRun ? "Checking" : "Publishing"} ${filename}...`);
  run(
    "npm",
    ["publish", tarball, "--access", "public", ...(dryRun ? ["--dry-run"] : [])],
    { stdio: "inherit" },
  );
} finally {
  rmSync(packDirectory, { recursive: true, force: true });
}
