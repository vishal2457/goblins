# Projects, Modules, And Discovered Subagents

## Projects

### List projects

`GET /api/v1/projects?page=1&limit=25`

### Create project

`POST /api/v1/projects`

```json
{
  "name": "Example",
  "location": "/absolute/path/to/repo",
  "description": "Optional description"
}
```

### Get project

`GET /api/v1/projects/{id}`

### Update project

`PATCH /api/v1/projects/{id}`

Use any subset of create-project fields.

### Delete project

`DELETE /api/v1/projects/{id}`

## Project Modules

### List modules for a project

`GET /api/v1/projects/{id}/modules`

### Create module for a project

`POST /api/v1/projects/{id}/modules`

```json
{
  "name": "Backend",
  "shortDescription": "Express API and database work"
}
```

### List tickets for a module

`GET /api/v1/modules/{id}/tickets`

## Discovered Subagents

Subagents are discovered from files. They are not stored in the database.

For Goblins orchestration, prefer subagents that are already available from project-local or global user configuration in the current environment. Use project-agent discovery only when that local/global set is empty.

### Discover project subagents

`GET /api/v1/projects/{id}/agents`

The scanner checks project and user-level config for Codex, Claude, Cursor, and OpenCode:

- `.codex/agents` and `~/.codex/agents`
- `.claude/agents` and `~/.claude/agents`
- `.cursor/agents`, `.cursor/rules`, `~/.cursor/agents`, and `~/.cursor/rules`
- `.opencode/agent`, `.opencode/agents`, `~/.config/opencode/agent`, and `~/.config/opencode/agents`
- OpenCode JSON config files
- non-empty root instruction files such as `AGENTS.md` and `CLAUDE.md`

Codex `.toml` agents map `developer_instructions` to the returned `instructions` field.

### Update discovered subagent instructions

`PUT /api/v1/projects/{id}/agents/instructions`

```json
{
  "agentId": "codex:project:/path/.codex/agents/code-reviewer.toml:code-reviewer",
  "instructions": "New instruction text"
}
```

This updates the backing file. For TOML Codex agents it updates the `developer_instructions` block.
