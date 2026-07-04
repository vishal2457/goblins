# Goblins Orchestration

Use this reference when acting as the main orchestrator for an explicitly invoked Goblins run.

## Responsibilities

The orchestrator owns the user goal end to end:

- clarify the goal before decomposition
- create or select the project
- create the goal
- discover modules and native subagents
- create tickets
- dispatch work to subagents
- monitor completion
- verify the final result

Do not use Goblins merely because subagents exist. Use it when decomposition and tracking produce real value.

## Planning Checklist

Before creating execution tickets, establish:

- user-facing objective
- acceptance criteria
- repository or project location
- files, modules, or product areas likely involved
- commands expected for verification
- constraints such as branch policy, test scope, deadlines, or forbidden changes
- unresolved questions

Ask the user only for missing information that affects correctness or scope. Infer ordinary implementation details from the repository.

## Project Setup

Use the project APIs from `apis-docs/projects.md`.

1. List existing projects and select one whose `location` matches the current repository.
2. Create a project if none exists.
3. Create missing modules for clear work areas. Keep modules broad enough to avoid one-ticket modules.
4. Check for subagents already available to the current run from project-local or global user configuration.
5. If no subagents are available locally, discover available subagents with `GET /api/v1/projects/{id}/agents`.

## Goal Setup

Use the goal APIs from `apis-docs/goals.md`.

Create one goal for the user objective. Keep:

- `title` short and outcome-oriented
- `description` focused on objective and acceptance criteria
- `technicalInstructions` for constraints, repo-specific commands, and orchestration notes
- `maxRetries` conservative unless the user requests otherwise

Start planning after creation. Complete planning only when tickets are created and there are no unresolved planning questions.

## Ticket Design

Use ticket APIs from `apis-docs/tickets.md`.

Good tickets are independently executable, testable, and scoped to one module. Each ticket should include:

- clear title
- short description
- full implementation context
- expected output
- verification command or evidence expected
- relevant files when known
- dependency notes when another ticket must finish first
- suggested native subagent when available
- `assignedSubagentName` set to the exact native subagent name when known

Avoid ticket sets that require every subagent to edit the same files at the same time. Sequence dependent work explicitly.

## Dispatching Native Subagents

Goblins tracks work; the current agent harness runs the native subagents. Prefer subagents that are already available in the current environment. Use endpoint-discovered subagents only as a fallback when no local or global subagents are available. When dispatching, include:

- ticket ID
- goal ID
- project path
- relevant files
- exact expected status/report behavior
- instruction to read `references/subagent-workflow.md`

Before or immediately after dispatch, update the ticket with `assignedSubagentName`, `activityAuthorName`, and move it to `in_progress` only when the subagent has actually started. Subagents must update their assigned tickets through Goblins instead of only reporting in chat.

## Wait Policy

Give subagents enough uninterrupted time to produce meaningful work:

- After dispatching implementation, refactor, integration, or verification tickets, wait at least 10 minutes before the first check-in unless the subagent reports earlier.
- After dispatching research, documentation, or test tickets, wait at least 5 minutes before the first check-in unless the subagent reports earlier.
- Between later check-ins on an active `in_progress` ticket, wait at least 5 minutes unless the ticket status or `subagentStatus` changed, a blocker/question appeared, recent activity is stale, or the user explicitly asks for immediate status.
- Do not take over a ticket that is still `in_progress` simply because there are no new comments. Take over only when the ticket is `blocked` or `failed`, the assigned subagent asks for handoff, the user explicitly redirects the work, or there has been no status/comment update after two consecutive long wait intervals.

## Monitoring Loop

During execution:

1. Fetch the goal ticket snapshot.
2. Check all tickets in `in_progress`, `blocked`, `review`, or `failed`.
3. Fetch each checked ticket directly and inspect its current `status`, `subagentStatus`, `assignedSubagentName`, `activity`, timestamps, and retry state.
4. Read `activity.recentComments` first, then fetch full ticket comments when blockers, questions, decisions, or missing context require it.
5. Apply the wait policy before interrupting, reassigning, or taking over active subagent work.
6. Start ready dependent tickets when prerequisites complete.
7. Ask the user only for questions that cannot be resolved from repo context.
8. Move the goal to verification when execution work is done.

Treat ticket comments as the durable log for decisions, blockers, and handoffs.

## Completion

Before completing the goal:

- all required tickets are `completed`
- cancelled tickets have comments explaining why they are no longer needed
- verification evidence is recorded on verification tickets or final comments
- user-visible summary matches actual completed work

If the goal cannot be completed, mark the goal `blocked` or `failed` and record the concrete reason.
