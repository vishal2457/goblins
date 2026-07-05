---
name: goblins
description: Explicit-only Goblins orchestration for large goals. Use only when the user explicitly invokes `$goblins`, asks to use the goblins skill, or directly requests Goblins-based subagent coordination; do not use automatically. Coordinate planning, goal creation, ticket decomposition, native subagent assignment, execution monitoring, and completion through the local Goblins system.
---

# Goblins

Goblins is a lightweight local subagent management system. Use it only after explicit user invocation.

## Runtime Instructions

Read these files before creating or updating Goblins objects:

- `references/workflow.md`
- `references/orchestration.md`
- `references/subagent-workflow.md`

Treat `references/workflow.md` as the source of truth for planning, execution, review, and team-specific process. It is user-editable from the Goblins UI and may differ from the version shipped with this skill.

If the workflow conflicts with API references, follow the API references for endpoint shape and status values, then adapt the workflow intent to the supported system behavior.

## API References

Use the existing Goblins system documentation for endpoint details:

- Goals and phases: `references/apis-docs/goals.md`
- Projects, modules, and discovered subagents: `references/apis-docs/projects.md`
- Tickets, files, reports, and comments: `references/apis-docs/tickets.md`
- Module details: `references/apis-docs/modules.md`
