#!/usr/bin/env node
import { spawn } from "node:child_process";
import { closeSync, mkdirSync, openSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";

type DaemonState = {
  pid: number;
  port: number;
  host: string;
  cwd: string;
  url: string;
  startedAt: string;
  logFile: string;
};

const APP_HOME = path.join(homedir(), ".goblins");
const STATE_FILE = path.join(APP_HOME, "daemon.json");
const DEFAULT_HOST = "127.0.0.1";
const DEFAULT_PORT = 3090;

function ensureAppHome(): void {
  mkdirSync(APP_HOME, { recursive: true });
}

function usage(): never {
  console.log(`Goblins CLI

Usage:
  goblins start [--port <port>] [--host <host>]
  goblins kill
  goblins stop
  goblins restart [--port <port>] [--host <host>]
  goblins status
  goblins help

Options:
  --port <port>  Server port. Defaults to ${DEFAULT_PORT}.
  --host <host>  Bind host. Defaults to ${DEFAULT_HOST}.
`);
  process.exit(0);
}

function parseOptions(argv: string[]): { command: string; port: number; host: string } {
  if (argv.length === 0) usage();

  const command = argv[0]!;
  const rest = argv.slice(1);
  if (command === "help" || command === "--help" || command === "-h") usage();
  if (command.startsWith("-")) usage();

  const options = { command, port: DEFAULT_PORT, host: DEFAULT_HOST };

  for (let i = 0; i < rest.length; i += 1) {
    const arg = rest[i];
    if (arg === "--help" || arg === "-h") usage();
    if (arg === "--port" || arg === "-p") {
      const value = rest[i + 1];
      if (!value) throw new Error("--port requires a value");
      const parsed = Number(value);
      if (!Number.isInteger(parsed) || parsed <= 0 || parsed > 65535) {
        throw new Error(`Invalid port: ${value}`);
      }
      options.port = parsed;
      i += 1;
      continue;
    }
    if (arg === "--host") {
      const value = rest[i + 1];
      if (!value) throw new Error("--host requires a value");
      options.host = value;
      i += 1;
      continue;
    }
    throw new Error(`Unknown option: ${arg}`);
  }

  return options;
}

function readState(): DaemonState | null {
  try {
    return JSON.parse(readFileSync(STATE_FILE, "utf8")) as DaemonState;
  } catch {
    return null;
  }
}

function writeState(state: DaemonState): void {
  ensureAppHome();
  writeFileSync(STATE_FILE, `${JSON.stringify(state, null, 2)}\n`);
}

function removeState(): void {
  rmSync(STATE_FILE, { force: true });
}

function isRunning(pid: number): boolean {
  if (!Number.isInteger(pid) || pid <= 0) return false;

  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function serverEntry(): string {
  return path.resolve(__dirname, "..", "main.js");
}

async function waitForHealth(url: string, timeoutMs = 15_000): Promise<void> {
  const started = Date.now();
  const healthUrl = `${url}/health`;
  let lastError = "";

  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(healthUrl);
      if (response.ok) return;
      lastError = `${response.status} ${response.statusText}`;
    } catch (error) {
      lastError = (error as Error).message;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  throw new Error(`Server did not become healthy at ${healthUrl}: ${lastError}`);
}

async function start(options: { port: number; host: string }): Promise<void> {
  const current = readState();
  if (current && isRunning(current.pid)) {
    console.log(`Goblins is already running at ${current.url} (pid ${current.pid})`);
    return;
  }

  if (current) removeState();
  ensureAppHome();

  const url = `http://${options.host}:${options.port}`;
  const logFile = path.join(APP_HOME, "daemon.log");
  const logFd = openSync(logFile, "a");
  const child = spawn(process.execPath, [serverEntry()], {
    cwd: process.cwd(),
    detached: true,
    env: {
      ...process.env,
      GOBLINS_CLI_DAEMON: "1",
      HOST: options.host,
      PORT: String(options.port),
      NODE_ENV: process.env.NODE_ENV || "development",
      EMBEDDED_DATABASE_DIR: process.env.EMBEDDED_DATABASE_DIR || ".goblins/pglite",
      ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS || url,
    },
    stdio: ["ignore", logFd, logFd],
  });

  child.unref();
  closeSync(logFd);

  const state: DaemonState = {
    pid: child.pid ?? 0,
    port: options.port,
    host: options.host,
    cwd: process.cwd(),
    url,
    startedAt: new Date().toISOString(),
    logFile,
  };
  writeState(state);

  try {
    await waitForHealth(url);
  } catch (error) {
    removeState();
    throw error;
  }

  console.log(`Goblins is running at ${url}`);
}

async function stop(): Promise<void> {
  const state = readState();
  if (!state) {
    console.log("Goblins is not running");
    return;
  }

  if (isRunning(state.pid)) {
    process.kill(state.pid, "SIGTERM");
    const started = Date.now();
    while (Date.now() - started < 10_000 && isRunning(state.pid)) {
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }

  removeState();
  console.log("Goblins stopped");
}

async function kill(): Promise<void> {
  const state = readState();
  if (!state) {
    console.log("Goblins is not running");
    return;
  }

  if (isRunning(state.pid)) {
    process.kill(state.pid, "SIGTERM");
    const started = Date.now();
    while (Date.now() - started < 3_000 && isRunning(state.pid)) {
      await new Promise((resolve) => setTimeout(resolve, 250));
    }

    if (isRunning(state.pid)) {
      process.kill(state.pid, "SIGKILL");
    }
  }

  removeState();
  console.log("Goblins killed");
}

function status(): void {
  const state = readState();
  if (!state || !isRunning(state.pid)) {
    if (state) removeState();
    console.log("Goblins is not running");
    return;
  }

  console.log(`Goblins is running at ${state.url} (pid ${state.pid})`);
}

async function main(): Promise<void> {
  const options = parseOptions(process.argv.slice(2));

  switch (options.command) {
    case "start":
      await start(options);
      return;
    case "kill":
      await kill();
      return;
    case "stop":
      await stop();
      return;
    case "restart":
      await stop();
      await start(options);
      return;
    case "status":
      status();
      return;
    default:
      throw new Error(`Unknown command: ${options.command}`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
