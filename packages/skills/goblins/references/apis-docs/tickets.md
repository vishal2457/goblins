# Tickets, Files, Reports, And Comments

## Ticket Fields

Important ticket fields:

- `id`
- `goalId`
- `moduleId`
- `currentStepId`
- `title`
- `shortDescription`
- `description`
- `type`
- `status`
- `priority`
- `retryCount`
- `maximumRetries`
- `assignedSubagentName`
- `subagentStatus`
- `subagentStatusUpdatedAt`
- `lastActivityAt`
- `lastActivityByAgentName`
- `activity`
- `worktreePath`
- `branchName`
- `startedAt`
- `completedAt`

Ticket types:

- `research`
- `test`
- `implementation`
- `refactor`
- `integration`
- `verification`
- `documentation`

Ticket statuses:

- `backlog`
- `ready`
- `blocked`
- `in_progress`
- `review`
- `failed`
- `completed`
- `cancelled`

Ticket priorities:

- `low`
- `medium`
- `high`
- `critical`

Subagent statuses:

- `analysing`
- `executing`
- `verifying`
- `done`

Ticket responses include an `activity` object with `lastActivityAt`, `lastActivityAgeMs`, `lastActivityByAgentName`, `commentCount`, and `recentComments`.

## Ticket Routes

### List tickets

`GET /api/v1/tickets?page=1&limit=25`

### Create ticket

`POST /api/v1/tickets`

```json
{
  "goalId": "uuid",
  "moduleId": "uuid",
  "title": "Implement API validation",
  "shortDescription": "Add request validation",
  "description": "Full ticket context",
  "type": "implementation",
  "status": "backlog",
  "priority": "medium",
  "assignedSubagentName": "codex-implementation-agent",
  "subagentStatus": "analysing",
  "activityAuthorName": "codex-implementation-agent",
  "maximumRetries": 3
}
```

### Get ticket

`GET /api/v1/tickets/{id}`

### Update ticket

`PATCH /api/v1/tickets/{id}`

Use any subset of create-ticket fields.

When a logical agent or user is making the update, include `activityAuthorName` so ticket responses show who last changed the work state.

### Delete ticket

`DELETE /api/v1/tickets/{id}`

## Relevant Files

### Append relevant file

`POST /api/v1/tickets/{id}/files`

```json
{
  "path": "apps/api/src/example.ts"
}
```

## Ticket Reports

### Report ticket progress

`POST /api/v1/tickets/{id}/report`

```json
{
  "status": "completed",
  "summary": "What changed",
  "evidence": ["Verification performed"],
  "activityAuthorName": "codex-implementation-agent"
}
```

## Ticket Comments

Ticket comments are kept. They are immutable comment records attached to tickets.

Comment kinds:

- `note`
- `question`
- `decision`
- `blocker`

### List comments

`GET /api/v1/tickets/{id}/comments?page=1&limit=100`

### Create comment

`POST /api/v1/tickets/{id}/comments`

```json
{
  "body": "Needs a product decision before implementation.",
  "authorName": "Planner",
  "kind": "question"
}
```

### Get comment

`GET /api/v1/tickets/{id}/comments/{commentId}`
