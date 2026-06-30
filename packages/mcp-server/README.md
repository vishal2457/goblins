# Goblins MCP Server

MCP server exposing Goblins projects, goals, and tickets REST APIs as feature-scoped tools.

## Run

```sh
GOBLINS_API_BASE_URL=http://localhost:3090 pnpm --filter @goblins/mcp-server dev
```

For a built stdio server:

```sh
pnpm --filter @goblins/mcp-server build
GOBLINS_API_BASE_URL=http://localhost:3090 pnpm --filter @goblins/mcp-server exec goblins-mcp
```

## Environment

- `GOBLINS_API_BASE_URL`: Goblins API base URL. Defaults to `http://localhost:3090`.
- `GOBLINS_API_TOKEN`: optional bearer token.
- `GOBLINS_API_KEY`: optional `x-api-key` value.
