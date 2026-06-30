---
name: about-us
description: Use when an agent needs concise context about what Goblins is, what product surfaces currently exist, and which legacy agent harness surfaces are intentionally removed.
---

# About Goblins

Goblins is a local project management and execution planning tool for software work.

It organizes work around:

- Projects
- Project modules
- Goals
- Goal phases
- Tickets
- Ticket comments
- Board steps
- Audit logs
- File-discovered subagents

The current product stores projects, modules, goals, tickets, ticket comments, board steps, and audit logs in the application database.

Subagents are discovered from project-level or user-level configuration files for supported harnesses such as Codex, Claude, Cursor, and OpenCode. Subagents are not stored in the database.

## Removed Surfaces

Goblins no longer exposes:

- DB-backed agents
- Agent harness status
- Agent execution APIs
- Agent run-event APIs
- Realtime execution streaming APIs
- Retrospective action APIs
- Scheduled cron job APIs

## Related Skills

Use `api-docs` when you need route-level details for the current Goblins HTTP API.
