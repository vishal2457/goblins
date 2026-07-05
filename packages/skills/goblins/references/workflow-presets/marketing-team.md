# Workflow: Marketing Campaign

Use this workflow for marketing teams coordinating campaigns, launches, content production, and channel operations.

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

1. Clarify the campaign objective, target audience, offer, positioning, timeline, budget, and success metrics.
2. Identify channels, required assets, brand constraints, legal review needs, and stakeholder approvals.
3. Collect existing research, messaging, creative references, analytics, and previous campaign learnings.

## Planning

1. Break the campaign into strategy, copy, creative, channel setup, analytics, review, and launch tickets.
2. Define each ticket with owner, due date, required inputs, acceptance criteria, and approval path.
3. Sequence dependencies so creative, copy, tracking, and launch operations do not block each other late.

## Execution

1. Produce channel-ready assets with clear naming, audience, CTA, and placement notes.
2. Keep tickets updated with draft links, decisions, blockers, and review comments.
3. Escalate missing approvals or source material early.

## Launch Readiness

1. Verify copy, creative dimensions, links, UTM parameters, audience setup, budgets, and scheduling.
2. Confirm stakeholders have approved required assets.
3. Record the launch checklist and any known risks.

## Retrospective

1. Compare outcomes against success metrics.
2. Capture insights by channel, audience, message, creative, and operational process.
3. Create follow-up tickets for optimization or future campaigns.
