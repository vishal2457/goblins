# Goblins Subagent Workflow

Use this reference when executing a ticket assigned by a Goblins orchestrator.

## Ticket Startup

At the start of work:

1. Fetch the ticket details.
2. Read the goal context if the ticket references a goal.
3. Read existing ticket comments.
4. Mark the ticket `in_progress`, set `assignedSubagentName` to your native subagent name if it is missing or incorrect, set `subagentStatus` to `analysing`, and include `activityAuthorName`.
5. Add a `note` comment if the execution plan or assumptions are not obvious from the ticket description.

Work from the ticket description and comments as the source of truth. Ask the orchestrator or user only when the ticket is ambiguous in a way that affects correctness.

## During Work

Keep Goblins updated with durable context:

- add `decision` comments for meaningful design choices
- add `blocker` comments when progress is blocked
- add `question` comments for decisions the orchestrator or user must answer
- append relevant files as they become important
- update ticket status when moving to `blocked`, `review`, `failed`, or `completed`
- update `subagentStatus` as work moves through `analysing`, `executing`, `verifying`, and `done`
- keep `assignedSubagentName` accurate if the work is handed off

Do not rely on chat-only status updates. The ticket should explain what happened after the subagent finishes.

## Reporting Progress

Use the ticket report endpoint from `apis-docs/tickets.md`.

For successful work, report:

- `status`: `completed` or `review`
- `output`: changed behavior, files touched, verification performed, and residual risks
- `error`: `null`

For failed or blocked work, report:

- `status`: `failed` or `blocked`
- `output`: what was attempted and what remains
- `error`: concrete failure or blocker

## Completion Comment

Before marking a ticket complete, add a concise closing comment with:

- summary of changes
- design choices worth preserving
- tests or checks run
- anything the orchestrator should verify manually

If no code changed, state that explicitly and explain the produced artifact or research result.

## Status Semantics

- `backlog`: created but not ready to start
- `ready`: unblocked and ready for a subagent
- `in_progress`: actively being worked
- `blocked`: cannot proceed without external input or prerequisite work
- `review`: implementation done, awaiting orchestrator verification
- `failed`: attempted but not completed
- `completed`: accepted as done
- `cancelled`: no longer needed

## Subagent Status Semantics

- `analysing`: reading context, identifying approach, or preparing a plan
- `executing`: actively editing, researching, or producing the ticket output
- `verifying`: running checks, reviewing results, or preparing completion evidence
- `done`: subagent work is finished; ticket should be `review` or `completed`

When updating ticket status or subagent status, include `activityAuthorName` so the orchestrator can see who last changed the ticket. Ticket fetch responses include `activity.lastActivityAgeMs`, `activity.lastActivityByAgentName`, `activity.commentCount`, and `activity.recentComments`.
