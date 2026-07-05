# Workflow: Software Development TDD

Use this workflow for software engineering teams that want test-first delivery, small reviewable changes, and strong verification evidence.

## Goblins Operating Protocol

Before creating Goblins objects, decide whether the goal is large enough to split into independent tickets.

1. If the goal is small, single-threaded, or faster to complete directly, tell the user that Goblins is unnecessary for this request and execute normally.
2. If the goal is large enough for parallel work, become the main orchestrator and use this workflow.
3. If the user explicitly asks to force Goblins for a small task, create the smallest useful goal and ticket set.

During planning:

1. Clarify the goal until scope, acceptance criteria, constraints, stakeholders, and unknowns are clear.
2. Identify or create the Goblins project for the current repository or workspace.
3. Discover project modules and available native subagents. First use subagents already available in the current project or global user configuration. If none are available, fall back to Goblins project-agent discovery.
4. Create a Goblins goal in `planning` or `draft`.
5. Break the goal into tickets that are independently executable and have clear expected outputs.
6. Assign each ticket to an appropriate module and native subagent. Set `assignedSubagentName`, `subagentStatus`, and `activityAuthorName` when creating or updating active tickets.
7. Mark planning complete only when there are no open planning questions.

During execution:

1. Start goal execution.
2. Dispatch tickets to native subagents using the harness available in the current environment.
3. Monitor ticket status, subagent status, activity metadata, recent comments, blockers, and the goal ticket snapshot. When checking on a subagent, fetch the ticket and inspect `status`, `subagentStatus`, and `activity`.
4. Resolve dependencies and blockers by updating tickets or asking the user only when required.
5. Verify completed work against the original goal and ticket acceptance criteria.
6. Complete the goal only after all required tickets are completed or explicitly cancelled with rationale.

## Discovery

1. Clarify the problem, target users, acceptance criteria, constraints, non-goals, and release expectations.
2. Read the relevant code, tests, docs, and configuration before creating tickets.
3. Identify risky contracts, migrations, external dependencies, observability needs, and rollback concerns.

## Planning

1. Decompose the goal into independently executable vertical slices.
2. Give every ticket clear acceptance criteria, expected files or modules, verification commands, and dependency notes.
3. Assign ownership to the best available native subagent and make dependencies explicit.

## Execution

1. Write or identify the failing test before implementation when the behavior can be tested.
2. Implement the smallest coherent change that makes the test pass.
3. Refactor after behavior is covered and keep unrelated cleanup out of scope.
4. Update ticket status, subagent status, relevant files, and comments as work progresses.

## Review

1. Run focused tests, then broader checks for shared behavior, build pipelines, or user-facing flows.
2. Review diffs for regressions, missing edge cases, security issues, and migration safety.
3. Record verification evidence and residual risks before marking work complete.

## Retrospective

1. Confirm the original goal and acceptance criteria were met.
2. Capture follow-up work as separate tickets.
3. Propose instruction updates for repeated friction or recurring mistakes.
