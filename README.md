# Goblins

**Run and control local AI agents from anywhere.**

Goblins is a multi-platform system for orchestrating AI coding agents on your local machine. It pairs a fast local API/runtime with a browser-based workbench, so you can spin up projects, dispatch goals, and steer agents from the same surface — with realtime updates as work happens.

> Early prototype — expect rough edges. Contributions welcome.

---

## Highlights

- **Projects, Goals, Tickets** — organize agent work into a kanban-style pipeline you can move forward from anywhere.
- **Discovered subagents** — pick from local coding agents (Codex, Claude Code, opencode, Cursor) and bind them per project.
- **Realtime dashboard** — Socket.IO-powered event stream keeps the UI in sync with the runtime.
- **Git-friendly file storage** — goals and tickets are Markdown files with YAML frontmatter under the project's `.goblins` directory.
- **MCP server** — exposes Goblins APIs as Model Context Protocol tools for external agents.
- **Daemon CLI** — `goblins start | kill | stop | status | restart | help` manages the local server on port `3090`.

---

## Repository layout

This is a pnpm + Turborepo monorepo.

```
.
├── apps/
│   ├── cli/        # goblins-cli — Express API, Markdown storage, daemon binary
│   └── web/        # goblins-fe — Vite + React + Tailwind UI (Agent Workbench)
└── packages/
    ├── shared-constants/  # goblins-shared-constants — types, API paths, board step config
    ├── mcp-server/        # @goblins/mcp-server — Model Context Protocol tool server
    ├── skills/            # @goblins/skills — system skills shipped with Goblins
    ├── eslint-config/     # shared ESLint preset
    └── typescript-config/ # shared tsconfig preset
```

---

## Getting started

### Prerequisites

- Node.js `>=20`
- pnpm `>=9`

### Install

```sh
pnpm install
```

### Build

Build the daemon CLI and bundle the web UI into it:

```sh
pnpm build:cli
```

This runs, in order:

1. `goblins-shared-constants` build
2. `goblins-fe` (web) build
3. `goblins-cli` build, with web assets copied into `dist/public`

### Run the daemon

```sh
goblins start
```

Starts one detached server on `http://127.0.0.1:3090` and serves the Agent Workbench from the same origin. The daemon-wide project registry lives at `~/.goblins/projects.json`; each registered project's goals and tickets live in `<project>/.goblins`.
Projects can be registered from the Workbench with an absolute directory path or by an agent through the MCP `projects_add` tool. Starting Goblins from a project directory also registers that directory automatically.
Running `goblins` without a command prints help instead of starting the server.

| Command | Description |
| --- | --- |
| `goblins start [--port <p>] [--host <h>]` | Start the daemon (idempotent) |
| `goblins kill` | Kill the daemon |
| `goblins stop` | Stop the daemon gracefully |
| `goblins restart` | Restart the daemon |
| `goblins status` | Print daemon state |
| `goblins help` | Print CLI help |

### Run from source (dev)

In one terminal, run the API:

```sh
pnpm --filter goblins-cli dev
```

In another, run the web UI against it:

```sh
pnpm --filter goblins-fe dev
```

The web app expects the API at `VITE_AGENT_SERVER_URL` (defaults to the same origin in production builds).

---

## Apps

### `apps/cli` — `goblins-cli`

Express service with Markdown/frontmatter persistence and the `goblins` CLI. Routes are organized by feature under `src/routes/v1/`:

- `projects/` — project metadata, derived module views, and agent discovery
- `goals/` — goals, phases, and execution
- `tickets/` — tickets, comments, and step execution
- `events/` — realtime event bus over Socket.IO
- `steps/`, `modules/`, `audit/` — supporting surfaces

The daemon is a detached child process whose state is persisted in `~/.goblins/daemon.json`.
Modules are labels stored in ticket frontmatter; the modules API derives its results from tickets and does not create a modules directory.

### `apps/web` — `goblins-fe`

Vite + React 19 + Tailwind. Routes:

- `/dashboard` — kanban board with live ticket state
- `/setup` — onboarding flow for first-run configuration
- `/settings` — projects, agents, and runtime settings

UI primitives live under `src/components/ui/` (shadcn-style).

### `packages/mcp-server` — `@goblins/mcp-server`

A Model Context Protocol server that wraps the Goblins REST API as MCP tools. Useful for letting external agents read or mutate tickets, goals, and projects.

```sh
GOBLINS_API_BASE_URL=http://localhost:3090 \
  pnpm --filter @goblins/mcp-server dev
```

### `packages/shared-constants` — `goblins-shared-constants`

Single source of truth for shared TypeScript types, API path constants, board step definitions, and ticket/goal enums. Both the CLI and web app consume it as a workspace package.

### `packages/skills` — `@goblins/skills`

System skills shipped with Goblins (`about-us`, `api-docs`) used to teach agents how to interact with the platform.

---

## Environment

The CLI reads from the local `.env` and process environment. Useful variables:

| Variable | Purpose |
| --- | --- |
| `HOST` / `PORT` | Bind address for the daemon (default `127.0.0.1:3090`) |
| `ALLOWED_ORIGINS` | Comma-separated CORS allowlist |
| `GOBLINS_CLI_DAEMON` | Set by the CLI to `1` when spawning the detached server |
| `VITE_AGENT_SERVER_URL` | Web UI → API base URL (web app only) |
| `GOBLINS_API_BASE_URL` / `GOBLINS_API_TOKEN` / `GOBLINS_API_KEY` | Consumed by the MCP server |

For orchestrators and planner agents running outside the host, advertise multiple candidates and let the agent pick the first one reachable from its sandbox:

```sh
GOBLINS_AGENT_API_BASE_URLS=http://127.0.0.1:3090,http://host.docker.internal:3090,http://192.168.0.10:3090
```

`127.0.0.1` is correct for same-host agents, `host.docker.internal` for containerized ones, and the LAN IP only as a last resort. Remote or cloud sandboxes need an authenticated tunnel placed first.

---

## Tasks

```sh
pnpm build        # build everything via Turborepo
pnpm dev          # run all dev tasks
pnpm lint         # typecheck + lint across workspaces
pnpm check-types  # tsc --noEmit across workspaces
pnpm format       # prettier write
```

---

## License

TBD.
