## CLI distribution

Build the distributable CLI package from the repository root:

```sh
pnpm build:cli
```

The package exposes a `goblins` binary. After install, start the local app
server with:

```sh
goblins start
```

`goblins start` starts a detached daemon on `http://127.0.0.1:3090`, serves the
built web UI from the same origin, and stores daemon state in `~/.goblins`.
Running `goblins` without a command prints help instead of starting the server.

Useful commands:

```sh
goblins start --port 3199
goblins status
goblins kill
goblins stop
goblins restart
goblins help
```

The CLI package includes the compiled API, Drizzle migrations, and the built web
assets under `dist/public`.

## Feature-based Project structure

- Routes to handle routing
- Controller handles http related stuff, parsing request etc.
- Service layer handles business logic
- Repository handle db interaction

express-backend/
├── src/ # Main source code
│ ├── main.ts # Server entry point
│ ├── express-app.ts # Express application configuration
│ ├── routes/ # API routes and controllers
│ │ └── v1/ # Version 1 of the API
│ ├── shared/ # Shared utilities and core logic
│ │ ├── ai-sdk/ # AI integration (e.g., Gemini, OpenAI)
│ │ ├── db-prisma/ # Prisma ORM configuration and client
│ │ ├── middlewares/ # Custom Express middlewares
│ │ └── utils/ # Common helper functions
├── src/shared/file-store.ts # Markdown/frontmatter persistence
├── Dockerfile # Containerization setup
└── package.json # Project dependencies and scripts
