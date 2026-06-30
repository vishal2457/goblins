---
name: api-docs
description: Use when an agent needs to call or reason about the Goblins HTTP API for projects, modules, goals, phases, tickets, comments, steps, discovered subagents, or audit logs.
---

# Goblins API Docs

Use this skill when you need to interact with the Goblins API.

The API base path is `/api/v1`. Responses are wrapped in a standard envelope:

```json
{
  "result": {},
  "status": "OK",
  "statusCode": 200,
  "msg": "Operation completed"
}
```

For paginated list routes, `result` contains:

```json
{
  "data": [],
  "pagination": {
    "page": 1,
    "limit": 25,
    "total": 0,
    "totalPages": 0
  }
}
```

## Reference Files

- `references/overview.md`: API conventions and current scope.
- `references/projects.md`: Projects, modules, and file-based subagent discovery.
- `references/goals.md`: Goals and phase transitions.
- `references/tickets.md`: Tickets, files, reports, and comments.

## Current Scope

The current Goblins API supports projects, project modules, file-discovered subagents, goals, phases, tickets, ticket comments, board steps, and audit logs.

Do not assume DB-backed agents, harness execution, realtime streams, agent runs, retrospective actions, or cron scheduling APIs exist. Those surfaces were removed.
