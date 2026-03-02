# Getting Started

## Prerequisites

- **Bun** >= 1.1.0 — [bun.sh](https://bun.sh)
- **Docker** — for PostgreSQL
- **Git**

## Setup

```bash
# Clone the repository
git clone <repo-url>
cd knowledge-graph-agent-system

# Run first-time setup (installs deps, copies .env)
bun run setup

# Start PostgreSQL
docker compose up -d

# Start development
bun dev
```

- **Client**: http://localhost:3000
- **API**: http://localhost:4000

## Making Your First Change

1. Create a feature branch: `git checkout -b feature/your-feature`
2. Edit code in `client/ui/` or `server/src/`
3. Run `bun lint` and `bun test`
4. Commit with conventional format: `feat(scope): description`
