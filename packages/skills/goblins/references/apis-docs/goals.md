# Goals And Phases

## Goal Fields

Important goal fields:

- `id`
- `projectId`
- `title`
- `description`
- `status`
- `phases`
- `technicalInstructions`
- `maxRetries`
- `startedAt`
- `completedAt`
- `lastError`

Goal statuses:

- `draft`
- `planning`
- `ready`
- `running`
- `paused`
- `blocked`
- `verifying`
- `retrospective`
- `completed`
- `failed`
- `cancelled`

Phase IDs:

- `planning`
- `execution`
- `retrospective`

Phase statuses:

- `pending`
- `in_progress`
- `paused`
- `completed`
- `failed`
- `cancelled`

## Routes

### List goals

`GET /api/v1/goals?page=1&limit=25`

### Create goal

`POST /api/v1/goals`

```json
{
  "projectId": "uuid",
  "title": "Implement billing settings",
  "description": "Goal details",
  "technicalInstructions": "Optional implementation guidance",
  "maxRetries": 3
}
```

### Get goal

`GET /api/v1/goals/{id}`

### Update goal

`PATCH /api/v1/goals/{id}`

Use any subset of create-goal fields plus `status`, `phases`, `startedAt`, `completedAt`, or `lastError`.

### Delete goal

`DELETE /api/v1/goals/{id}`

## Phase Transitions

### Start planning

`POST /api/v1/goals/{id}/planning/start`

### Complete planning

`POST /api/v1/goals/{id}/planning/complete`

### Start execution

`POST /api/v1/goals/{id}/execution/start`

### Start retrospective

`POST /api/v1/goals/{id}/retrospective/start`

```json
{
  "userPoints": "Optional user notes for the retrospective"
}
```

### Complete retrospective

`POST /api/v1/goals/{id}/retrospective/complete`

## Goal Ticket Snapshot

`GET /api/v1/goals/{id}/goal-tickets-snapshot`

Returns compact ticket and dependency graph data for planning or execution decisions.

## Goal Overview

`GET /api/v1/goals/{id}/overview`

Returns compact retrospective context:

- goal summary, phases, timing, and technical instructions
- ticket status/type/subagent counts
- failed, blocked, retried, stale, or weakly documented ticket signals
- important comments, prioritizing blockers, questions, decisions, and verification evidence
- audit action summary and recent audit entries
- verification evidence counts and completed tickets missing explicit evidence

Use this before fetching full ticket comments or audit logs. Fetch full details only for tickets with failure, blocker, retry, stale activity, or missing verification signals.

## Retrospective Analysis

`POST /api/v1/goals/{id}/retrospective/analyse`

```json
{
  "userPoints": "Optional user notes for the analysis"
}
```

Creates a retrospective record, non-applyable observations, and instruction-only improvement proposals.

Applyable proposal targets are strictly limited to:

- `workflow_instruction`
- `subagent_instruction`

Do not convert product, schema, API, database, or system behavior gaps into applyable proposals. Store those as observations only.

## Goal Improvements

### List improvements

`GET /api/v1/goals/{id}/improvements`

Returns retrospectives, observations, and instruction improvement proposals.

### Approve improvement

`POST /api/v1/goals/{id}/improvements/{proposalId}/approve`

```json
{
  "proposedInstructions": "Optional replacement instruction text before approval"
}
```

### Reject improvement

`POST /api/v1/goals/{id}/improvements/{proposalId}/reject`

```json
{
  "reason": "Optional rejection note"
}
```

### Apply improvement

`POST /api/v1/goals/{id}/improvements/{proposalId}/apply`

Applies an approved proposal through the existing workflow editor or discovered subagent instruction editor. Rejected proposals cannot be applied.
