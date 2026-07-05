# Workflow: Leadership Initiative

Use this workflow for leadership teams managing strategic initiatives, operating reviews, cross-functional decisions, and executive follow-through.

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

1. Clarify the strategic objective, decision owner, stakeholders, timeline, constraints, and desired business outcome.
2. Identify required data, open decisions, risks, dependencies, and communication needs.
3. Separate decision work from execution work so accountability stays clear.

## Planning

1. Create tickets for context gathering, option analysis, stakeholder review, decision capture, communication, and follow-through.
2. Define each ticket with decision criteria, expected artifact, accountable owner, and completion signal.
3. Make dependencies, escalation paths, and approval requirements explicit.

## Execution

1. Keep artifacts concise and decision-oriented.
2. Record key assumptions, tradeoffs, risks, and dissenting views as durable comments.
3. Escalate blocked decisions quickly with the minimum context required to resolve them.

## Decision Review

1. Confirm the recommendation or decision maps to the original objective.
2. Verify implementation owners, dates, communication plan, and success measures.
3. Capture unresolved risks and monitoring checkpoints.

## Retrospective

1. Review decision quality, execution follow-through, and stakeholder alignment.
2. Capture operating improvements and assign owners to any follow-up actions.
