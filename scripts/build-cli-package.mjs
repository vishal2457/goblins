#!/usr/bin/env node
import { spawnSync } from "node:child_process";

const pnpmCommand = process.env.npm_execpath
  ? { command: process.execPath, args: [process.env.npm_execpath] }
  : { command: "corepack", args: ["pnpm"] };

const steps = [
  ["--filter", "goblins-shared-constants", "build"],
  ["--filter", "goblins-fe", "build"],
  ["--filter", "goblins-cli", "build"],
];

for (const args of steps) {
  const result = spawnSync(pnpmCommand.command, [...pnpmCommand.args, ...args], {
    stdio: "inherit",
    shell: process.platform === "win32",
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
