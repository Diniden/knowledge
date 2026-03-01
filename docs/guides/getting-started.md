# Getting Started

## Prerequisites

Ensure you have the following installed:

| Tool | Version | Install |
|------|---------|---------|
| Bun | ≥ 1.0.0 | `curl -fsSL https://bun.sh/install \| bash` |
| Docker | ≥ 24.0 | [docker.com](https://docker.com) |
| Git | ≥ 2.40 | `brew install git` or OS package manager |

## Setup

```bash
# 1. Clone the repository
git clone <repo-url>
cd knowledge-graph-agent-system

# 2. Run the first-time setup script
bun run setup
```

The setup script will:
- Verify prerequisites
- Run `bun install`
- Copy `.env.example` → `.env`
- Start the PostgreSQL Docker container
- Wait for the database to be healthy

```bash
# 3. Review your .env file
# At minimum, add your CLAUDE_API_KEY if you want agent features
cat .env

# 4. Run database migrations
bun run migrate

# 5. Start the development environment
bun dev
```

## What's Running

After `bun dev`:

| Service | URL |
|---------|-----|
| Client UI | http://localhost:3000 |
| Server API | http://localhost:4000/api/v1 |
| API Docs | http://localhost:4000/api/v1/docs (Swagger) |
| PostgreSQL | localhost:5432 |

## Making Your First Change

1. Open `client/ui/src/App.tsx`
2. Change the text in the div — Vite HMR will update the browser instantly
3. Open `server/src/app.module.ts` to see the NestJS root module
4. Shared types live in `shared/src/types/` — changes rebuild automatically in watch mode

## Useful Commands

```bash
bun dev                          # Start all services
bun test                         # Run all tests
bun lint                         # Lint all workspaces
bun format                       # Format all files
bun run scripts/check-deps.ts    # Verify prerequisites
bun run scripts/validate-env.ts  # Check .env vs .env.example
docker compose up -d             # Start DB (if not running)
docker compose down              # Stop Docker services
```

## IDE Setup

This project includes VS Code / Cursor configuration in `.vscode/`. Install the recommended extensions:

```
Ctrl/Cmd + Shift + P → Extensions: Show Recommended Extensions
```

Key extensions: ESLint, Prettier, Stylelint, TypeScript (nightly), EditorConfig.
