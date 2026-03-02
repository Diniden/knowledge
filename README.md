# Knowledge Graph Agent System

A collaborative knowledge management platform where humans author structured knowledge through AI-assisted dialog. Knowledge is organized into a graph of interconnected specs, fed into a RAG model and a node-edge graph model, enabling AI agents to consume knowledge and produce step-by-step execution plans to build products.

## Prerequisites

- **Bun** >= 1.1.0 — [Install Bun](https://bun.sh)
- **Docker** & Docker Compose — for PostgreSQL
- **Git** — version control

## Quick Start

```bash
# First-time setup
bun run setup

# Start development (client + server + database)
bun dev
```

The client runs at [http://localhost:3000](http://localhost:3000), the API at [http://localhost:4000](http://localhost:4000).

## Setup (Manual)

```bash
# Install dependencies
bun install

# Start PostgreSQL
docker compose up -d

# Copy environment template
cp .env.example .env
# Edit .env with your values (or use defaults for local dev)

# Run database migrations
bun run migrate

# Start development
bun dev
```

## Architecture

```
project-root/
├── client/          # Frontend (React + Vite)
│   ├── ui/         # Main platform UI
│   └── gen/        # Agent-generated UI projects
├── server/         # Backend (NestJS)
├── shared/         # Shared types, constants, utilities
├── knowledge-graph/# Knowledge graph data (JSON + folders, git-tracked)
├── packages/       # Internal packages (MCP servers, Claude wrapper)
├── plans/          # Plan documents and design specs
├── scripts/       # Build, dev, deploy scripts
└── config/         # Shared configuration
```

See [plans/](plans/) for detailed architecture and implementation plans.

## Tech Stack

| Layer | Technology |
|-------|-------------|
| Frontend | React, Vite, BEM CSS (SCSS) |
| Backend | NestJS, ESM |
| Runtime | Bun |
| Database | PostgreSQL |
| Auth | bcrypt, JWT (http-only cookies) |
| Testing | bun test |

## Scripts

| Command | Description |
|---------|-------------|
| `bun dev` | Start client + server (dev mode) |
| `bun build` | Build all packages for production |
| `bun test` | Run tests across workspaces |
| `bun lint` | Lint code |
| `bun format` | Format code |
| `bun clean` | Remove build artifacts |
| `bun run setup` | First-time project setup |

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development standards, branching strategy, and PR process.
