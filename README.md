# Knowledge Graph Agent System

A collaborative knowledge management platform where humans author structured knowledge through AI-assisted dialog. Knowledge is organized into a graph of interconnected specs, powered by RAG retrieval and AI agents that consume the graph to produce step-by-step execution plans.

## Prerequisites

| Tool                                       | Version                       |
| ------------------------------------------ | ----------------------------- |
| [Bun](https://bun.sh)                      | >= 1.1                        |
| [PostgreSQL](https://postgresql.org)       | >= 16 with pgvector extension |
| [mprocs](https://github.com/pvolok/mprocs) | latest                        |
| [git](https://git-scm.com)                 | >= 2.30                       |

## Quick Start

```bash
# Clone the repository
git clone <repo-url> && cd knowledge

# Install dependencies
bun install

# Copy environment file and configure
cp .env.example .env

# Run setup (database migrations, etc.)
bun run setup

# Start all services (client + server)
bun run dev
```

The `dev` command uses [mprocs](https://github.com/pvolok/mprocs) to launch both the client dev server and the NestJS backend simultaneously.

## Development Workflow

```bash
# Run all tests
bun test

# Run linting
bun run lint

# Format code
bun run format

# Check formatting (CI)
bun run format:check

# Build all packages
bun run build

# Database migrations
bun run migrate

# Seed database
bun run seed
```

## Project Structure

```
knowledge/
├── client/            # Frontend (React + Vite)
│   └── ui/            # Main platform UI
├── server/            # Backend (NestJS)
│   └── src/modules/   # NestJS feature modules
├── shared/            # Shared types, utils, constants
├── packages/          # Internal packages
├── knowledge-graph/   # Knowledge data (JSON + folders, git-tracked)
├── plans/             # Architecture & design plans
├── scripts/           # Build, dev, deploy scripts
├── config/            # Shared configuration
├── docs/              # Documentation
└── e2e/               # End-to-end tests (future)
```

## Tech Stack

| Layer           | Technology                       |
| --------------- | -------------------------------- |
| Frontend        | React, Vite, MobX, BEM SCSS      |
| Backend         | NestJS (ESM)                     |
| Runtime         | Bun                              |
| Database        | PostgreSQL + pgvector            |
| ORM             | Drizzle ORM                      |
| Knowledge Store | JSON + folders (git-backed)      |
| Auth            | bcrypt + JWT (http-only cookies) |
| Agent Runtime   | Claude Code CLI                  |
| Embeddings      | Local model (nomic-embed-text)   |
| Testing         | bun test                         |
| CI/CD           | GitHub Actions                   |

## Available Scripts

| Script                 | Description                      |
| ---------------------- | -------------------------------- |
| `bun run dev`          | Start client + server via mprocs |
| `bun test`             | Run all tests                    |
| `bun run lint`         | Run ESLint                       |
| `bun run format`       | Format with Prettier             |
| `bun run format:check` | Check formatting                 |
| `bun run build`        | Build all packages               |
| `bun run clean`        | Clean build artifacts            |
| `bun run setup`        | Initial project setup            |
| `bun run migrate`      | Run database migrations          |
| `bun run seed`         | Seed database                    |

## AI Development Configuration

This project uses AI development configuration to maintain coding standards and accelerate development with Claude Code and Cursor.

| Config            | Purpose                                               |
| ----------------- | ----------------------------------------------------- |
| `CLAUDE.md`       | Master context for Claude Code sessions (auto-loaded) |
| `.cursor/rules/`  | Cursor AI rules, glob-matched to file types           |
| `.cursor/skills/` | Cursor skill files for common development tasks       |
| `.claude/`        | Claude Code-specific settings                         |
| `skill-*.md`      | Claude Code skill files for development tasks         |
| `docs/ai-dev/`    | AI dev config documentation and onboarding            |
| `scripts/ai-dev/` | Validation scripts for AI config health               |
| `BOUNDARY.md`     | Reference for dev vs runtime config boundary          |

See `docs/ai-dev/ONBOARDING.md` for setup instructions and `CLAUDE.md` for the full development context.

## License

Private - All rights reserved.
