# Knowledge Graph Agent System

A collaborative knowledge management platform where humans author structured knowledge through AI-assisted dialog. Knowledge is organized into a graph of interconnected specs, fed into a RAG model and a node-edge graph model, enabling AI agents to consume the knowledge and produce step-by-step execution plans to build products.

## Prerequisites

| Tool | Minimum Version | Install |
|------|----------------|---------|
| [Bun](https://bun.sh) | 1.0.0 | `curl -fsSL https://bun.sh/install \| bash` |
| [Docker](https://docker.com) | 24.0 | Platform installer |
| [Git](https://git-scm.com) | 2.40 | Package manager |

## Quick Start

```bash
# Clone the repository
git clone <repo-url>
cd knowledge-graph-agent-system

# Run first-time setup (installs deps, starts DB, copies .env)
bun run setup

# Edit .env with your configuration (especially CLAUDE_API_KEY)
# $EDITOR .env

# Start the full development environment
bun dev
```

**URLs when running:**
- Client UI: [http://localhost:3000](http://localhost:3000)
- Server API: [http://localhost:4000/api/v1](http://localhost:4000/api/v1)
- Database: `localhost:5432`

## Architecture Overview

```
project-root/
├── client/         # React + Vite frontend (@kg/client)
│   ├── ui/         # Main platform UI
│   └── gen/        # Agent-generated UI projects
├── server/         # NestJS backend (@kg/server)
│   ├── src/        # Source files
│   └── test/       # Integration tests
├── shared/         # Shared types + utilities (@kg/shared)
├── packages/       # Internal packages
│   ├── mcp-servers/          # MCP tool servers
│   └── claude-code-wrapper/  # Claude Code integration
├── knowledge-graph/ # JSON knowledge graph data (git-tracked)
├── scripts/        # Development and build scripts
├── plans/          # Design and planning documents
└── docs/           # Developer documentation
```

See [`plans/00-MASTER-PLAN.md`](plans/00-MASTER-PLAN.md) for the full project roadmap.

## Development Commands

```bash
bun dev           # Start all services (client + server + shared watch)
bun build         # Production build
bun test          # Run all tests
bun lint          # Lint all workspaces
bun format        # Format all files
bun run clean     # Remove build artifacts
bun run setup     # First-time setup
bun run migrate   # Run database migrations
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, BEM CSS (SCSS) |
| Backend | NestJS, ESM |
| Runtime | Bun |
| Database | PostgreSQL 16 |
| Knowledge Store | JSON + folders (git-backed) |
| Auth | bcrypt, JWT (http-only cookies) |
| Agent Runtime | Claude Code (wrapper) |
| Agent Tools | MCP servers |
| Testing | bun test |

## Contributing

See [`CONTRIBUTING.md`](CONTRIBUTING.md) for development standards, branching strategy, and code style guidelines.
