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
4. Discover available subagents with `GET /api/v1/projects/{id}/agents`.

Prefer existing project settings for `baseBranch`, `executionMode`, and verification commands.

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

Avoid ticket sets that require every subagent to edit the same files at the same time. Sequence dependent work explicitly.

## Dispatching Native Subagents

Goblins tracks work; the current agent harness runs the native subagents. When dispatching, include:

- ticket ID
- goal ID
- project path
- relevant files
- exact expected status/report behavior
- instruction to read `references/subagent-workflow.md`

Subagents must update their assigned tickets through Goblins instead of only reporting in chat.

## Monitoring Loop

During execution:

1. Fetch the goal ticket snapshot.
2. Check all tickets in `in_progress`, `blocked`, `review`, or `failed`.
3. Read recent ticket comments for blockers, questions, and decisions.
4. Start ready dependent tickets when prerequisites complete.
5. Ask the user only for questions that cannot be resolved from repo context.
6. Move the goal to verification when execution work is done.

Treat ticket comments as the durable log for decisions, blockers, and handoffs.

## Completion

Before completing the goal:

- all required tickets are `completed`
- cancelled tickets have comments explaining why they are no longer needed
- verification evidence is recorded on verification tickets or final comments
- user-visible summary matches actual completed work

If the goal cannot be completed, mark the goal `blocked` or `failed` and record the concrete reason.
