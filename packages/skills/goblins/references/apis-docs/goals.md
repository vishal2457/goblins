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
