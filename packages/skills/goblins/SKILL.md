---
name: goblins
description: Explicit-only Goblins orchestration for large goals. Use only when the user explicitly invokes `$goblins`, asks to use the goblins skill, or directly requests Goblins-based subagent coordination; do not use automatically. Coordinate planning, goal creation, ticket decomposition, native subagent assignment, execution monitoring, and completion through the local Goblins system.
---

# Goblins

Goblins is a lightweight local subagent management system. Use it only after explicit user invocation.

## Decision Gate

Before creating Goblins objects, decide whether the goal is large enough to split into independent tickets.

- If the goal is small, single-threaded, or faster to complete directly, tell the user that Goblins is unnecessary for this request and execute normally.
- If the goal is large enough for parallel work, become the main orchestrator and run the two-phase workflow below.
- If the user explicitly asks to force Goblins for a small task, create the smallest useful goal and ticket set.

## Phase 1: Plan

Read [orchestration.md](references/orchestration.md), then:

1. Clarify the goal with the user until scope, acceptance criteria, constraints, and unknowns are clear.
2. Identify or create the Goblins project for the current repository.
3. Discover project modules and available native subagents.
4. Create a Goblins goal in `planning` or `draft`.
5. Break the goal into tickets that are independently executable and have clear expected outputs.
6. Assign each ticket to an appropriate module and native subagent, using ticket descriptions and comments to carry context.
7. Mark planning complete only when there are no open planning questions.

## Phase 2: Execute

Read [subagent-workflow.md](references/subagent-workflow.md), then:

1. Start goal execution.
2. Dispatch tickets to native subagents using the harness available in the current environment.
3. Monitor ticket status, comments, blockers, and the goal ticket snapshot.
4. Resolve dependencies and blockers by updating tickets or asking the user only when required.
5. Verify completed work against the original goal and ticket acceptance criteria.
6. Complete the goal only after all required tickets are completed or explicitly cancelled with rationale.

## API References

Use the existing Goblins system documentation for endpoint details:

- Goals and phases: `references/apis-docs/goals.md`
- Projects, modules, and discovered subagents: `references/apis-docs/projects.md`
- Tickets, files, reports, and comments: `references/apis-docs/tickets.md`
- Module details: `references/apis-docs/modules.md`
