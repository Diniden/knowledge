# 11 — DEPLOYMENT PLAN

> **Purpose**: Define the complete deployment infrastructure including development
> environment setup, build pipelines, Docker containerization, CI/CD workflows,
> hosting infrastructure, monitoring, logging, backup/recovery, and scaling
> strategy.
>
> **Phase**: 1 (Dev environment) + 5 (Production deployment)
> **Dependencies**: `01-PROJECT-STRUCTURE/PLAN.md`, `03-SERVER/01-ARCHITECTURE-PLAN.md`, `07-DATABASE/PLAN.md`
> **Estimated tasks**: 155+

---

## Table of Contents

1. [Development Environment Setup](#1-development-environment-setup)
2. [Build Pipeline](#2-build-pipeline)
3. [Docker Configuration](#3-docker-configuration)
4. [CI/CD Pipeline](#4-cicd-pipeline)
5. [Infrastructure](#5-infrastructure)
6. [Environment Management](#6-environment-management)
7. [Monitoring & Observability](#7-monitoring--observability)
8. [Logging](#8-logging)
9. [Backup & Recovery](#9-backup--recovery)
10. [Scaling Strategy](#10-scaling-strategy)
11. [Release Management](#11-release-management)
12. [Runbooks & Documentation](#12-runbooks--documentation)

---

## 1. Development Environment Setup

### 1.1 Bun Installation & Configuration

- [ ] **DEP-DE-001**: Document Bun installation requirements
  - Minimum Bun version: 1.x (specify exact minimum)
  - Installation method: `curl -fsSL https://bun.sh/install | bash`
  - Verify installation: `bun --version`
  - Document compatibility notes (macOS, Linux, WSL)
- [ ] **DEP-DE-002**: Create Bun configuration file
  - Create `bunfig.toml` at the repo root
  - Configure registry (default: npm registry)
  - Configure install settings: `--frozen-lockfile` for CI
  - Configure test runner settings
  - Document all configuration options
- [ ] **DEP-DE-003**: Implement `bun install` workspace setup
  - Running `bun install` at root installs all workspace dependencies
  - Verify workspace linking: `@kg/shared`, `@kg/client`, `@kg/server`
  - Ensure peer dependency resolution is correct
  - Document troubleshooting for common installation issues

### 1.2 PostgreSQL Local Setup

- [ ] **DEP-DE-004**: Document PostgreSQL local installation options
  - Option A: Docker Compose (recommended — see Docker section)
  - Option B: Native PostgreSQL installation
  - Option C: Managed local service (Postgres.app on macOS, pgAdmin on Windows)
  - Minimum PostgreSQL version: 15
- [ ] **DEP-DE-005**: Create database initialization script
  - Script: `scripts/db-init.sh`
  - Create development database: `kg_dev`
  - Create test database: `kg_test`
  - Create application user with appropriate privileges
  - Apply initial schema migration
  - Seed with development data
- [ ] **DEP-DE-006**: Create database reset script
  - Script: `scripts/db-reset.sh`
  - Drop and recreate databases
  - Re-apply migrations from scratch
  - Re-seed development data
  - Confirm before executing (destructive operation)

### 1.3 Environment Variable Templates

- [ ] **DEP-DE-007**: Create `.env.example` with all required variables
  - Database: `DATABASE_URL`, `DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_NAME`, `DATABASE_USER`, `DATABASE_PASSWORD`
  - Auth: `JWT_SECRET` (or key pair), `BCRYPT_ROUNDS`, `SESSION_SECRET`
  - Server: `PORT`, `HOST`, `NODE_ENV`, `LOG_LEVEL`
  - Frontend: `VITE_API_URL`, `VITE_WS_URL`
  - Encryption: `ENCRYPTION_MASTER_KEY`
  - External services: `REDIS_URL` (optional), `SENTRY_DSN` (optional)
  - Agent: `ANTHROPIC_API_KEY`, `AGENT_TIMEOUT_MS`, `AGENT_MAX_CONCURRENT`
- [ ] **DEP-DE-008**: Create `.env.test` template for test environment
  - Use separate database: `kg_test`
  - Lower bcrypt rounds: 4 (for fast tests)
  - Deterministic JWT secret (for reproducible tests)
  - Disable external services (Sentry, email)
- [ ] **DEP-DE-009**: Implement environment validation on startup
  - NestJS `ConfigModule` validates all required variables on bootstrap
  - Fail fast with descriptive error if any variable is missing
  - Log (without values) which variables were loaded
  - Warn about insecure values in production (e.g., default secrets)

### 1.4 Docker Compose for Local Development

- [ ] **DEP-DE-010**: Create `docker-compose.dev.yml`
  - Services: `postgres`, `redis` (optional), `server`, `client`
  - PostgreSQL: version 15, persistent volume, port 5432
  - Redis: version 7, port 6379 (if used for rate limiting/caching)
  - Server: build from Dockerfile.dev, port 3000, hot reload volume mounts
  - Client: build from Dockerfile.dev, port 5173, hot reload volume mounts
  - Network: shared network for inter-service communication
- [ ] **DEP-DE-011**: Create PostgreSQL Docker configuration
  - Base image: `postgres:15-alpine`
  - Environment: `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`
  - Volume: `pgdata:/var/lib/postgresql/data` for persistence
  - Healthcheck: `pg_isready -U ${POSTGRES_USER}`
  - Init script: mount `scripts/db-init.sql` for first-run setup
- [ ] **DEP-DE-012**: Create development Docker network
  - Network name: `kg-dev-network`
  - Driver: bridge
  - All services on the same network for DNS-based service discovery
  - Server connects to `postgres:5432` instead of `localhost:5432`

### 1.5 Hot Reload Configuration

- [ ] **DEP-DE-013**: Configure Vite hot module replacement (HMR) for frontend
  - Vite dev server with HMR enabled (default)
  - Configure HMR for Docker: set `server.host: '0.0.0.0'` and `server.hmr.clientPort`
  - React Fast Refresh for component-level HMR
  - SCSS hot reload without full page refresh
- [ ] **DEP-DE-014**: Configure server hot reload
  - Use `bun --watch` for NestJS server auto-restart on file changes
  - Watch directories: `server/src/`, `shared/src/`
  - Ignore directories: `node_modules/`, `dist/`, `data/`
  - Restart delay: 500ms debounce to batch rapid changes
- [ ] **DEP-DE-015**: Configure shared package watch mode
  - When `shared/src/` files change, rebuild the shared package
  - Client and server automatically pick up shared package changes
  - Use `bun --watch` or Vite's dependency optimization

### 1.6 Developer Tooling

- [ ] **DEP-DE-016**: Create `bun dev` root command
  - Starts all development services in parallel
  - Client dev server (Vite)
  - Server dev server (NestJS with watch)
  - Database (if using Docker Compose, start it first)
  - Show combined log output with service prefixes and color coding
- [ ] **DEP-DE-017**: Create `bun setup` first-run command
  - Install all dependencies
  - Copy `.env.example` to `.env` (if not exists)
  - Start Docker Compose services (database)
  - Run database migrations
  - Seed development data
  - Print success message with next steps

#### Design Decisions

> **Q**: How should developers set up their local environment? A single `make setup` or `bun setup` command, or a manual step-by-step process? Automation is preferred but requires maintenance.
> **A**: Single command: `make setup` (or `bun run setup`). This command: installs dependencies (`bun install`), copies `.env.example` to `.env`, starts Docker Compose services (PostgreSQL), runs database migrations, and seeds test data. A `make dev` command starts the dev server with hot-reload. The Makefile is the source of truth for all development commands.

> **Q**: Should there be a shared development server that all developers can use, or should each developer run everything locally?
> **A**: Each developer runs everything locally via Docker Compose, per the PRD (Docker Compose for dev). No shared dev server. Local development ensures isolation, fast iteration, and no dependency on network connectivity. The Docker Compose dev config mirrors production closely.

> **Q**: Should the dev environment include seeded test data (users, projects, specs)? Realistic test data helps development but needs maintenance.
> **A**: Yes. A seed script (`bun run seed`) creates: 3 users (admin, editor, viewer), 2 projects, ~20 sample specs with edges, and sample dialog history. The seed data is maintained alongside the schema and updated when the data model changes. Seed data is deterministic (same output every run) for reproducible development.

> **Q**: Should there be a development mode for the agent system that uses mock responses instead of real Claude API calls? This saves API costs during development.
> **A**: Yes. An `AGENT_MOCK=true` env var enables mock agent responses. Mock responses are pre-recorded fixtures stored in `test/fixtures/agent/`. The mock mode returns realistic responses with simulated latency (500ms). Real API calls are used only for integration testing and production. This saves significant API costs during UI development.

---

## 2. Build Pipeline

### 2.1 Frontend Build

- [ ] **DEP-BP-001**: Configure Vite production build
  - Entry point: `client/ui/index.html`
  - Output: `client/ui/dist/`
  - Minification: terser for JavaScript, cssnano for CSS
  - Source maps: generate but upload to error tracking, do not serve publicly
  - Asset hashing: content-based hashes for cache busting
- [ ] **DEP-BP-002**: Configure code splitting
  - Route-based code splitting with React.lazy
  - Vendor chunk: React, ReactDOM in separate chunk
  - Shared module chunk: frequently imported utilities
  - Maximum chunk size target: 250KB (gzipped)
- [ ] **DEP-BP-003**: Configure asset optimization
  - Image optimization: compress PNG/JPEG during build
  - SVG optimization: SVGO for SVG minification
  - Font subsetting: only include used characters (if custom fonts)
  - CSS purging: remove unused CSS classes (PostCSS PurgeCSS)
- [ ] **DEP-BP-004**: Configure build-time environment injection
  - Use `import.meta.env.VITE_*` for environment variables
  - Inject API URL, WebSocket URL, version number at build time
  - Generate a `build-info.json` with commit hash, build date, version
- [ ] **DEP-BP-005**: Implement build output analysis
  - Generate bundle size report with `rollup-plugin-visualizer`
  - Set budget alerts: warn if total bundle exceeds 500KB gzipped
  - Track bundle size over time in CI

### 2.2 Server Build

- [ ] **DEP-BP-006**: Configure NestJS build for Bun runtime
  - Use TypeScript compilation: `tsc` or `bun build`
  - Output: `server/dist/`
  - Target: ES2022 (Bun supports modern syntax natively)
  - Module format: ESM
  - Preserve decorators for NestJS metadata
- [ ] **DEP-BP-007**: Configure server build optimizations
  - Tree-shaking: remove unused code
  - Minification: optional for server code (aids debugging if disabled)
  - External dependencies: bundle or leave as external (prefer external for node_modules)
  - Generate declaration files for shared types
- [ ] **DEP-BP-008**: Implement server build validation
  - Type check with `tsc --noEmit` before building
  - Verify all NestJS modules can be resolved
  - Verify all environment variable references have corresponding types
  - Run a smoke test: import the built entry point and verify it loads

### 2.3 Shared Package Build

- [ ] **DEP-BP-009**: Configure shared package build
  - Build `shared/src/` to `shared/dist/`
  - Generate TypeScript declarations (`.d.ts`)
  - Build both ESM and CJS output (if needed for tooling compatibility)
  - Verify exports match `package.json` `exports` field
- [ ] **DEP-BP-010**: Implement shared package build order
  - Shared package must build before client and server
  - Use workspace-aware build command: `bun run --filter @kg/shared build`
  - Or: use project references in `tsconfig.json` for automatic ordering

### 2.4 Generated UI Build Pipeline

- [ ] **DEP-BP-011**: Configure generated UI build process
  - Each generated UI project in `client/gen/{user}/{project}/` builds independently
  - Build tool: Vite (each project has its own `vite.config.ts`)
  - Output: `client/gen/{user}/{project}/dist/`
  - Build is triggered after agent generates/updates the project
- [ ] **DEP-BP-012**: Implement generated UI build isolation
  - Each build runs in a sandboxed environment (separate working directory)
  - Dependencies are installed per-project (not shared with main app)
  - Build failures do not affect the main application build
  - Timeout: 5 minutes per generated UI build

### 2.5 Full Build Command

- [ ] **DEP-BP-013**: Create `bun run build` root command
  - Step 1: Build shared package
  - Step 2: Build server (in parallel with step 3)
  - Step 3: Build client
  - Step 4: Run type checks on all packages
  - Report total build time and output sizes
- [ ] **DEP-BP-014**: Create `bun run build:production` command
  - Same as build, with production environment variables
  - Additional optimizations: minification, compression, source map uploading
  - Generate Docker-ready artifacts

#### Design Decisions

> **Q**: Is Bun stable enough for production use, or should there be a Node.js fallback plan? Bun is newer and may have compatibility issues with some npm packages or NestJS features.
> **A**: Bun is the primary runtime per the PRD. It is stable enough for production with NestJS as of Bun 1.1+. A Node.js fallback is not maintained — if a Bun-specific issue arises, it should be reported and worked around. The performance benefits (faster startup, faster installs, native TypeScript) justify the choice.

> **Q**: Should the server use `bun run` for production execution, or compile to a standalone binary with `bun build --compile`? Standalone binaries are faster to start but harder to debug.
> **A**: `bun run` for production. Startup time with Bun is already sub-second. The standalone binary approach reduces debuggability and complicates the Docker image (no source maps). `bun run` with the transpiled output is the right balance.

> **Q**: Should generated UI builds also use Bun, or should they use the more established Node.js + Vite combination for maximum compatibility?
> **A**: Vite with Bun as the runtime, per the PRD (Bun runtime, Vite builds). `bun run vite build` uses Vite's build pipeline with Bun's speed. This is well-supported and provides maximum compatibility with Vite's plugin ecosystem.

> **Q**: Should the build process produce a single monolithic Docker image (frontend + server) or separate images? Separate images allow independent scaling and deployment but add orchestration complexity.
> **A**: Single monolithic Docker image. The NestJS server serves the Vite-built frontend as static files. This simplifies deployment (one container for the app), reduces orchestration complexity, and is sufficient for a single-server deployment. The reverse proxy (Caddy) is a separate container for TLS termination.

> **Q**: Should build artifacts (Docker images) be pushed to a public registry (Docker Hub, GitHub Container Registry) or a private registry? Public is free but exposes the image; private requires registry hosting.
> **A**: GitHub Container Registry (GHCR), public. The application is not a commercial secret — public images simplify self-hosted deployments (`docker pull ghcr.io/org/botnet-knowledge:latest`). Tagged releases (semver) and a `latest` tag. Private registry is unnecessary.

> **Q**: How should generated UI projects be built in CI? Each project requires its own build — should all be built on every CI run, or only changed ones? Building all is thorough but slow.
> **A**: Only changed projects. Per the PRD, delta builds detect changed specs. CI uses the same change detection: compare the current commit to the last successful build, identify affected projects, build only those. A `--all` flag forces a full rebuild for release builds.

---

## 3. Docker Configuration

### 3.1 Frontend Dockerfile

- [ ] **DEP-DK-001**: Create `client/Dockerfile` for production
  - Multi-stage build:
    - Stage 1 (build): `oven/bun:1` base, install deps, run Vite build
    - Stage 2 (serve): `nginx:alpine` base, copy built assets, configure nginx
  - Copy `client/ui/dist/` to nginx html directory
  - Final image size target: < 50MB
- [ ] **DEP-DK-002**: Create nginx configuration for frontend
  - File: `client/nginx.conf`
  - Serve static files from `/usr/share/nginx/html`
  - SPA routing: all routes fall back to `index.html`
  - Gzip compression enabled for text assets
  - Cache headers: 1 year for hashed assets, no-cache for `index.html`
  - Security headers (CSP, HSTS, etc.) — coordinate with Security plan
  - Proxy `/api/` requests to the backend service (optional: can use separate ingress)
- [ ] **DEP-DK-003**: Configure nginx health check
  - Health endpoint: `GET /health` returns 200
  - Used by Docker health check and load balancer
  - No authentication required

### 3.2 Server Dockerfile

- [ ] **DEP-DK-004**: Create `server/Dockerfile` for production
  - Multi-stage build:
    - Stage 1 (build): `oven/bun:1` base, install all deps, compile TypeScript
    - Stage 2 (production): `oven/bun:1-slim` base, copy compiled output, install prod deps only
  - Set `NODE_ENV=production`
  - Run as non-root user
  - Expose port 3000
  - Health check: `curl -f http://localhost:3000/api/health || exit 1`
  - Final image size target: < 200MB
- [ ] **DEP-DK-005**: Create server .dockerignore
  - Ignore: `node_modules/`, `dist/`, `.env`, `*.md`, `tests/`, `.git/`
  - Keep build-relevant files only
  - Reduce build context size for faster builds
- [ ] **DEP-DK-006**: Configure server container environment
  - Accept all configuration via environment variables
  - No environment files baked into the image
  - Secrets injected at runtime via Docker secrets or orchestration platform

### 3.3 PostgreSQL Container Configuration

- [ ] **DEP-DK-007**: Configure PostgreSQL container for production
  - Base image: `postgres:15-alpine`
  - Custom `postgresql.conf` for tuning:
    - `shared_buffers`: 25% of available memory
    - `effective_cache_size`: 75% of available memory
    - `work_mem`: 4MB
    - `maintenance_work_mem`: 256MB
    - `max_connections`: 100
  - Custom `pg_hba.conf` for authentication rules
  - Persistent volume for data directory
- [ ] **DEP-DK-008**: Create PostgreSQL initialization scripts
  - `docker-entrypoint-initdb.d/01-create-databases.sql` — create application databases
  - `docker-entrypoint-initdb.d/02-create-users.sql` — create application user with limited privileges
  - `docker-entrypoint-initdb.d/03-extensions.sql` — enable required extensions (uuid-ossp, pgcrypto)
  - Scripts run only on first container start (empty data volume)

### 3.4 Docker Compose for Production

- [ ] **DEP-DK-009**: Create `docker-compose.prod.yml`
  - Services: `frontend`, `server`, `postgres`, `redis` (if needed)
  - Use production Dockerfiles
  - Environment variables from `.env.production` or Docker secrets
  - Restart policy: `unless-stopped`
  - Resource limits: memory and CPU per service
  - Logging driver: json-file with rotation
- [ ] **DEP-DK-010**: Configure Docker networking for production
  - Internal network for service-to-service communication
  - Only frontend and server exposed to the external network
  - PostgreSQL and Redis not directly accessible from outside
- [ ] **DEP-DK-011**: Configure Docker volumes for production
  - `pgdata`: PostgreSQL data directory (persistent)
  - `repos`: Knowledge graph repositories (persistent)
  - `uploads`: User-uploaded files (persistent)
  - `logs`: Application logs (persistent, with rotation)
  - Volume driver: local (default) or cloud-backed (for managed deployments)

### 3.5 Multi-Stage Build Optimization

- [ ] **DEP-DK-012**: Optimize Docker layer caching
  - Copy `package.json` and `bun.lock` before source code
  - `bun install` layer is cached unless dependencies change
  - Source code changes only rebuild the compilation layer
  - Use `.dockerignore` to minimize build context
- [ ] **DEP-DK-013**: Implement Docker build CI caching
  - Use Docker BuildKit cache mounts for dependency installation
  - Cache Bun's global cache directory between builds
  - Use GitHub Actions cache or registry-based caching
  - Target: rebuild time < 2 minutes for source-only changes

#### Design Decisions

> **Q**: Should Docker Compose be the production orchestration tool, or should we use Kubernetes, Docker Swarm, or a PaaS? Docker Compose is simplest but limited for multi-node scaling.
> **A**: Docker Compose for both dev and production, per the PRD. A single `docker-compose.yml` for dev (with hot-reload, debug ports) and a `docker-compose.prod.yml` override for production (optimized images, restart policies, log drivers). Kubernetes is overkill for a single-server, 20–50 user deployment.

> **Q**: Should the reverse proxy (nginx/Caddy) run as a Docker container or be installed directly on the host? Containerized is more portable; host installation is simpler for single-server setups.
> **A**: Docker container (Caddy). Caddy is preferred over nginx for automatic HTTPS (Let's Encrypt integration with zero config). Running as a container keeps the deployment fully containerized and reproducible. The Caddy container handles TLS termination, static file caching, and reverse proxying to the app container.

> **Q**: Should Redis be required for production, or should it be optional (fall back to in-memory for single-server deployments)? Redis is needed for rate limiting and caching across multiple server instances.
> **A**: Optional at launch. The single-server deployment uses in-memory rate limiting and caching (Map-based, process-level). Redis is added to Docker Compose as an optional service, enabled via env var (`USE_REDIS=true`). When multi-server deployment is introduced, Redis becomes required.

> **Q**: Should the application containers use root or non-root users? Non-root is more secure but can cause file permission issues with mounted volumes.
> **A**: Non-root user (UID 1000). The Dockerfile creates a `botnet` user. Volume permissions are handled by setting the volume ownership in the Docker entrypoint script. This follows container security best practices without sacrificing usability.

> **Q**: What base image should the server use? `oven/bun:1-slim` (smaller), `oven/bun:1` (full), or `oven/bun:1-alpine` (smallest but may have compatibility issues)?
> **A**: `oven/bun:1-slim` for the production image. Multi-stage build: `oven/bun:1` for the build stage (full toolchain for native dependencies), `oven/bun:1-slim` for the runtime stage (minimal footprint). Alpine is avoided due to musl compatibility issues with some npm packages.

> **Q**: Should we use multi-platform builds (amd64 + arm64) for the Docker images? ARM support is increasingly important for Apple Silicon and ARM-based cloud instances, but adds build time.
> **A**: Yes, amd64 + arm64. Built via `docker buildx` in GitHub Actions. ARM support is essential for developers on Apple Silicon Macs running the dev environment locally. Build time increase is ~2x but runs in CI (not blocking developer flow).

---

## 4. CI/CD Pipeline

### 4.1 CI Workflow (GitHub Actions)

- [ ] **DEP-CI-001**: Create main CI workflow file
  - File: `.github/workflows/ci.yml`
  - Trigger: push to `main`, pull requests to `main`
  - Concurrency: cancel in-progress runs for the same branch
  - Timeout: 20 minutes per run
- [ ] **DEP-CI-002**: Configure CI environment
  - Runner: `ubuntu-latest`
  - Bun: install via `oven-sh/setup-bun@v1`
  - PostgreSQL: use service container
  - Node version: specify for tools that need Node (if any)
  - Cache: bun dependency cache (`~/.bun/install/cache`)

### 4.2 CI Steps

- [ ] **DEP-CI-003**: Implement dependency installation step
  - `bun install --frozen-lockfile`
  - Fail if lockfile is out of sync
  - Cache dependencies between runs
- [ ] **DEP-CI-004**: Implement lint step
  - `bun run lint` — runs ESLint across all workspaces
  - Fail on any lint error
  - Warn on lint warnings (do not fail)
  - Generate lint report as CI artifact
- [ ] **DEP-CI-005**: Implement type check step
  - `bun run typecheck` — runs `tsc --noEmit` across all workspaces
  - Check shared, server, and client packages
  - Fail on any type error
  - Run in parallel with lint step (no dependency)
- [ ] **DEP-CI-006**: Implement unit test step
  - `bun test` — runs all unit tests
  - Generate JUnit XML report for CI integration
  - Generate coverage report (lcov format)
  - Coverage thresholds: statements 80%, branches 70%, functions 80%, lines 80%
  - Fail if coverage drops below thresholds
- [ ] **DEP-CI-007**: Implement integration test step
  - Requires: PostgreSQL service container running
  - Run database migrations before tests
  - `bun test:integration` — runs integration tests
  - Isolated database per test suite (or transaction rollback)
  - Timeout: 10 minutes
- [ ] **DEP-CI-008**: Implement E2E test step
  - Requires: full application stack running (server + client + database)
  - Start services in CI
  - Run E2E tests (Playwright or similar)
  - Generate test report with screenshots on failure
  - Timeout: 15 minutes
- [ ] **DEP-CI-009**: Implement build step
  - `bun run build` — build all packages
  - Verify build output exists and is valid
  - Upload build artifacts for deployment step
  - Track build size metrics
- [ ] **DEP-CI-010**: Implement security audit step
  - `bun audit` — check for known vulnerabilities
  - Run `gitleaks` — scan for leaked secrets in code
  - Run ESLint security rules (`eslint-plugin-security`)
  - Fail on critical/high vulnerabilities
  - Run in parallel with tests

### 4.3 CI/CD Deployment Steps

- [ ] **DEP-CI-011**: Implement Docker image build step
  - Build frontend and server Docker images
  - Tag images: `latest`, git commit SHA, semantic version
  - Push to container registry (GitHub Container Registry, Docker Hub, or private)
- [ ] **DEP-CI-012**: Implement staging deployment step
  - Trigger: merge to `main` branch
  - Deploy to staging environment
  - Run smoke tests against staging
  - Notify team of staging deployment
- [ ] **DEP-CI-013**: Implement production deployment step
  - Trigger: manual approval after staging verification (or tag-based)
  - Deploy to production environment
  - Run health checks after deployment
  - Automatic rollback if health checks fail
  - Notify team of production deployment
- [ ] **DEP-CI-014**: Implement rollback deployment step
  - Quick rollback to previous version
  - Revert Docker image tags to previous version
  - Re-run health checks after rollback
  - Notify team of rollback

### 4.4 Environment-Specific Configurations

- [ ] **DEP-CI-015**: Create development CI configuration
  - Run full test suite
  - Build Docker images tagged as `dev`
  - Deploy to development environment (optional, for shared dev)
- [ ] **DEP-CI-016**: Create staging CI configuration
  - Run full test suite
  - Build Docker images tagged as `staging`
  - Deploy to staging environment
  - Run E2E tests against staging
- [ ] **DEP-CI-017**: Create production CI configuration
  - Require: all tests pass, staging verified
  - Build Docker images tagged with version and `latest`
  - Deploy to production with zero-downtime strategy
  - Run post-deployment smoke tests

#### Design Decisions

> **Q**: Should the CI/CD platform be GitHub Actions, GitLab CI, or something else? If the repository is on GitHub, GitHub Actions is the natural choice. Are there reasons to prefer another platform?
> **A**: GitHub Actions, per the PRD. The repository is on GitHub; Actions provides native integration, good free-tier minutes (2,000 min/month), and the widest ecosystem of reusable actions. No reason to use another platform.

> **Q**: How long should the full CI pipeline take? What is an acceptable maximum? Long pipelines slow down development velocity. Target: < 10 minutes? < 15 minutes?
> **A**: Target: under 10 minutes for the full pipeline (lint + typecheck + unit + integration + E2E). Achieved by parallelizing stages: lint+typecheck in one job (~1 min), unit+integration in another (~3 min), E2E in a third (~5 min). Total wall-clock: ~6 minutes. Hard maximum: 15 minutes.

> **Q**: Should CI run on self-hosted runners (for cost savings and performance) or hosted runners (simpler, no maintenance)?
> **A**: GitHub-hosted runners at launch (`ubuntu-latest`). Simpler, no maintenance, and the free tier is sufficient for a small team. Self-hosted runners are a cost optimization if CI minutes become expensive (Phase 3+).

> **Q**: Should production deployment be triggered automatically on merge to `main`, or require manual approval? Automatic deployment enables continuous delivery; manual approval adds a safety gate.
> **A**: Automatic deployment on merge to `main` after all CI checks pass. A manual "deploy" button in GitHub Actions is available as an override for hotfixes or rollbacks. Continuous delivery is preferred for velocity; the CI pipeline (lint, typecheck, unit, integration, E2E) is the safety gate.

> **Q**: Should there be a separate staging environment that mirrors production? Staging is valuable for pre-production testing but doubles hosting costs.
> **A**: Not at launch. The local dev environment (Docker Compose) serves as the staging environment. A dedicated staging server is a Phase 3+ enhancement when the team grows or the deployment serves external users. Cost doubling is not justified for 20–50 users.

> **Q**: How should database migrations be handled during deployment? Run before application restart (may cause brief incompatibility) or use expand-then-contract pattern (safe but more complex)?
> **A**: Run before application restart. Drizzle ORM migrations execute as a pre-start step in the Docker entrypoint (`bun run drizzle-kit migrate` before `bun run start`). For a single-server deployment, the brief incompatibility window (seconds) is acceptable. Expand-then-contract is used only for migrations that drop columns or rename tables (applied manually with care).

> **Q**: Should we implement blue-green deployment, rolling update, or canary release for production? Each has different risk profiles and complexity.
> **A**: Simple restart (stop old, start new). With a single server and Docker Compose, blue-green/rolling/canary are unnecessary complexity. Downtime during deployment is measured in seconds (Bun startup is sub-second + migration time). If zero-downtime is required later, a blue-green approach with two container instances behind Caddy is the Phase 4+ path.

> **Q**: Should E2E tests run on every PR, or only on merge to `main`? E2E tests are slow and flaky; running on every PR provides early feedback but slows the pipeline.
> **A**: E2E tests run on every PR, per the PRD (GitHub Actions CI: lint, typecheck, unit, integration, E2E). They run in parallel with other checks, so they don't block faster feedback (lint/typecheck results appear first). Flaky tests are quarantined and fixed promptly — flakiness is not tolerated.

> **Q**: Should the CI pipeline include performance/load tests? These are valuable but slow and resource-intensive.
> **A**: Not in the standard PR pipeline. Performance/load tests run as a separate scheduled workflow (weekly, or on-demand before releases). Results are tracked over time to detect regressions. The PR pipeline stays under 10 minutes.

> **Q**: Should there be a separate "nightly" CI run that performs more thorough testing (security scans, performance tests, full E2E suite)?
> **A**: Yes. A nightly workflow runs: full E2E suite (including slow/edge-case tests), dependency vulnerability scan (`bun audit` / Trivy for Docker images), and performance benchmarks. Results are posted to a Slack/Discord channel or stored as CI artifacts. Failures create GitHub issues automatically.

---

## 5. Infrastructure

### 5.1 Server Hosting

- [ ] **DEP-IN-001**: Define server hosting requirements
  - Minimum: 2 vCPU, 4GB RAM, 50GB SSD
  - Recommended: 4 vCPU, 8GB RAM, 100GB SSD
  - OS: Ubuntu 22.04 LTS (or latest LTS)
  - Docker and Docker Compose pre-installed
  - Hosting options: VPS (DigitalOcean, Hetzner, Linode), cloud (AWS EC2, GCP Compute), PaaS (Railway, Render)
- [ ] **DEP-IN-002**: Configure server firewall
  - Allow: 80 (HTTP), 443 (HTTPS), 22 (SSH — restricted to admin IPs)
  - Deny all other inbound traffic
  - Allow all outbound traffic
  - Use UFW or cloud security groups
- [ ] **DEP-IN-003**: Configure reverse proxy
  - Nginx or Caddy as reverse proxy in front of application containers
  - TLS termination at the reverse proxy
  - Forward `/api/*` to server container (port 3000)
  - Forward `/ws/*` to server container WebSocket (port 3000)
  - Serve frontend from static files or proxy to frontend container
  - Rate limiting at reverse proxy level (defense in depth)

### 5.2 Database Hosting

- [ ] **DEP-IN-004**: Define database hosting options
  - Option A: Self-hosted PostgreSQL in Docker (simplest, full control)
  - Option B: Managed PostgreSQL (AWS RDS, GCP Cloud SQL, DigitalOcean Managed DB)
  - Option C: PostgreSQL-compatible service (Supabase, Neon)
  - Recommendation: managed for production (automated backups, failover)
- [ ] **DEP-IN-005**: Configure database connection pooling
  - Use PgBouncer or built-in NestJS/TypeORM connection pooling
  - Pool size: 20 connections (adjustable based on load)
  - Connection timeout: 5 seconds
  - Idle timeout: 30 seconds
  - Statement timeout: 30 seconds (prevent runaway queries)
- [ ] **DEP-IN-006**: Configure database SSL
  - Require SSL for all database connections in production
  - Configure `sslmode=require` in connection string
  - Use CA certificate for managed database services

### 5.3 Git Server for Knowledge Repositories

- [ ] **DEP-IN-007**: Define git server hosting strategy
  - Option A: Bare git repositories on the application server (simplest)
  - Option B: Gitea/Forgejo self-hosted (web UI, API, webhooks)
  - Option C: GitHub/GitLab organization (external hosting)
  - Recommendation: bare repos on the app server for MVP; migrate to Gitea for multi-server
- [ ] **DEP-IN-008**: Configure git repository storage
  - Storage path: `/data/repos/` on persistent volume
  - Directory structure: `{project_id}/bare.git` (server) + `{user_id}/{project_id}/` (working copies)
  - Disk space monitoring: alert at 80% utilization
  - Implement repository size limits per project
- [ ] **DEP-IN-009**: Implement git repository garbage collection
  - Schedule `git gc` for repositories periodically
  - Run during off-peak hours (configurable CRON schedule)
  - Monitor repository size before and after GC
  - Prune old branches and unreachable objects

### 5.4 File Storage

- [ ] **DEP-IN-010**: Configure file storage for media attachments
  - Option A: Local filesystem with a persistent volume
  - Option B: S3-compatible object storage (AWS S3, MinIO, Backblaze B2)
  - Store uploaded images, documents, and other attachments
  - Organize by: `uploads/{project_id}/{spec_id}/{filename}`
  - Serve via signed URLs (if using object storage) or static file server
- [ ] **DEP-IN-011**: Implement file storage abstraction
  - `StorageService` interface with implementations for local and S3
  - `upload(path: string, file: Buffer): Promise<string>` — returns URL
  - `download(path: string): Promise<Buffer>`
  - `delete(path: string): Promise<void>`
  - Configured via environment variable: `STORAGE_DRIVER=local|s3`

### 5.5 SSL Certificate Management

- [ ] **DEP-IN-012**: Configure Let's Encrypt certificate automation
  - Use Certbot or Caddy (has built-in ACME) for automatic provisioning
  - Configure auto-renewal (cron job or Caddy automatic)
  - Monitor certificate expiration (alert 14 days before)
  - Support: main domain, gen-ui subdomain, API subdomain
- [ ] **DEP-IN-013**: Configure wildcard certificate (if needed)
  - If gen-ui uses per-project subdomains, a wildcard certificate is needed
  - Wildcard requires DNS-01 challenge (not HTTP-01)
  - Configure DNS provider plugin for Certbot

### 5.6 Domain Configuration

- [ ] **DEP-IN-014**: Define domain structure
  - `app.example.com` — main application UI
  - `api.example.com` — API server (or `app.example.com/api/`)
  - `gen-ui.example.com` — generated UI content (separate origin for security)
  - DNS records: A/AAAA records pointing to server IP
- [ ] **DEP-IN-015**: Configure DNS records
  - A record: `app.example.com` → server IP
  - A record: `api.example.com` → server IP (or CNAME to app)
  - A record: `gen-ui.example.com` → server IP
  - CAA record: restrict certificate issuance to Let's Encrypt

#### Design Decisions

> **Q**: Should the application be hosted on a VPS (DigitalOcean, Hetzner, Linode), a cloud platform (AWS, GCP, Azure), or a PaaS (Railway, Render, Fly.io)? Each has different cost, complexity, and scaling characteristics. What is the expected budget for infrastructure?
> **A**: VPS (Hetzner or DigitalOcean). Per the PRD, the system is local-only through Phase 3 and targets a single-instance server for 20–50 users. A VPS provides the best cost-to-performance ratio (~$20–40/month for 4 vCPU, 8 GB RAM, 160 GB SSD). No cloud platform overhead. Budget target: under $50/month for infrastructure.

> **Q**: Should the application support self-hosted deployments (users run it on their own servers)? If so, the deployment must be simple enough for non-DevOps users (single Docker Compose, minimal configuration).
> **A**: Yes. Self-hosted deployment is a first-class use case. A single `docker compose up` command with a minimal `.env` file (database password, JWT secret, Anthropic API key) must be the primary deployment method. The Docker Compose file includes all services (app, PostgreSQL, reverse proxy). Documentation covers setup in under 10 minutes.

> **Q**: Should the system run on a single server or be designed for multi-server deployment from the start? Single server is simpler but creates a single point of failure.
> **A**: Single server at launch, per the PRD. The architecture should not preclude horizontal scaling (stateless server, external database), but multi-server deployment is not a launch requirement. Single-server is acceptable for 20–50 users.

> **Q**: What geographic region should the primary server be located in? Is multi-region deployment a future requirement?
> **A**: Region depends on the deployer's user base. For self-hosted, the user chooses. For any reference deployment, US East or EU West (where most cloud providers have cheapest capacity). Multi-region is not planned — the system is local-only.

> **Q**: Should PostgreSQL be self-hosted (Docker container on the same server) or use a managed service (RDS, Cloud SQL, Supabase)? Managed services cost more but provide automated backups, failover, and scaling.
> **A**: Self-hosted PostgreSQL in a Docker container, per the PRD (Docker Compose for dev, Docker for production). The container uses a named volume for data persistence. Automated backups are handled by a cron job running `pg_dump`. Managed PostgreSQL is an optional upgrade for users who want hands-off operations.

> **Q**: What is the expected database size? Number of users, specs, and audit log volume affect storage and performance requirements.
> **A**: At 20–50 users with ~500 specs per project and a few projects: database size under 2 GB (excluding audit logs). Audit logs at ~1 KB/event, ~1,000 events/day = ~365 MB/year. Total expected database size: under 5 GB for the first year. A 40 GB volume is more than sufficient with room for growth.

> **Q**: Should the database support high availability (automatic failover to a standby)? This is important for production but adds cost and complexity.
> **A**: Not at launch. Single PostgreSQL instance. Downtime tolerance for a 20–50 user local deployment is measured in hours, not minutes. HA (streaming replication + automatic failover) is a Phase 4+ enhancement if uptime SLAs are needed.

> **Q**: Should there be a separate database for audit logs (to prevent log volume from affecting application performance)?
> **A**: No. Same database, separate schema/table with append-only permissions. At the expected volume (~365 MB/year), audit logs do not meaningfully impact performance. Partition the audit table by month for efficient archival and querying. Separate database is overkill for launch.

> **Q**: Should knowledge graph git repositories be hosted on the same server as the application, or on an external git hosting service (GitHub, GitLab)? Local hosting is simpler and has no API rate limits; external hosting provides built-in backup, web UI, and collaboration tools.
> **A**: Same server, per the PRD (JSON+folders knowledge graph in git repos, local-only). Bare repositories stored on the server filesystem. No external git hosting dependency. The server manages all git operations directly. External mirroring (push to GitHub for backup) is an optional Phase 3+ feature.

> **Q**: If using external git hosting, should it be GitHub, GitLab, or a self-hosted alternative (Gitea)? Each has different API capabilities, pricing, and integration options.
> **A**: N/A at launch (local hosting). If external mirroring is added, GitHub is the default target (most common, best API, free private repos). Gitea is the self-hosted alternative for users who want full control.

> **Q**: Should the git server support SSH-based access, HTTPS-based access, or both? SSH is more secure for server-to-server; HTTPS is simpler for initial setup.
> **A**: Neither at launch for external access — the application server is the sole consumer of the git repositories via filesystem operations. If external mirroring is added, HTTPS is the default (simpler, no SSH key management). SSH is an option for advanced users.

---

## 6. Environment Management

- [ ] **DEP-EM-001**: Define environment tiers
  - **Development**: local machine, Docker Compose, `.env` file
  - **Staging**: server-hosted, production-like configuration, test data
  - **Production**: server-hosted, real data, monitoring, backups
- [ ] **DEP-EM-002**: Create environment-specific configuration files
  - `.env.development` — local dev settings (committed but with placeholder secrets)
  - `.env.staging` — staging settings (not committed, managed via CI secrets)
  - `.env.production` — production settings (not committed, managed via CI secrets or vault)
- [ ] **DEP-EM-003**: Implement feature flags
  - Feature flag service for phased rollout
  - Flags: `ENABLE_AGENT_SYSTEM`, `ENABLE_GEN_UI`, `ENABLE_COLLABORATION`, `ENABLE_CODE_GENERATION`
  - Stored in environment variables or database (configurable)
  - Checked at route/feature level in both frontend and backend
- [ ] **DEP-EM-004**: Implement environment-aware configuration
  - NestJS ConfigModule loads different configs per environment
  - Frontend: Vite `.env.{mode}` files for per-environment variables
  - Docker Compose: different compose files per environment
  - All services use the same configuration keys with different values

---

## 7. Monitoring & Observability

### 7.1 Health Checks

- [ ] **DEP-MO-001**: Implement server health check endpoint
  - `GET /api/health` — returns server health status
  - Checks: server is running, database is connected, git is accessible
  - Response: `{ status: 'healthy' | 'degraded' | 'unhealthy', checks: { db: 'ok', git: 'ok' }, uptime: 12345 }`
  - No authentication required
  - Response time: < 500ms
- [ ] **DEP-MO-002**: Implement deep health check endpoint
  - `GET /api/health/deep` — thorough health check (for monitoring)
  - Checks: database query, Redis connection, disk space, git operations
  - Takes longer (up to 5 seconds) — not for load balancer use
  - Returns detailed status per component
  - Requires admin authentication
- [ ] **DEP-MO-003**: Implement frontend health check
  - Nginx returns 200 for `/health`
  - Verify `index.html` is servable
  - Used by Docker health check and load balancer

### 7.2 Application Performance Monitoring (APM)

- [ ] **DEP-MO-004**: Implement request duration tracking
  - Measure and log duration of every API request
  - Track: endpoint, method, status code, duration (ms)
  - Calculate percentiles: p50, p90, p95, p99
  - Alert if p95 exceeds thresholds (e.g., 2 seconds for API, 5 seconds for agent operations)
- [ ] **DEP-MO-005**: Implement database query monitoring
  - Log slow queries (> 500ms)
  - Track query count per request
  - Monitor connection pool utilization
  - Alert on connection pool exhaustion
- [ ] **DEP-MO-006**: Implement agent session monitoring
  - Track: sessions per user, duration, token usage, success/failure rate
  - Monitor concurrent agent sessions
  - Track cost per session (API token consumption)
  - Alert on unusual agent behavior (excessive tool calls, long duration)

### 7.3 Error Tracking

- [ ] **DEP-MO-007**: Implement Sentry integration (or equivalent)
  - Server: `@sentry/node` with NestJS integration
  - Client: `@sentry/react` with React error boundary integration
  - Configure: DSN, environment, release version, sample rate
  - Capture: unhandled exceptions, rejected promises, HTTP errors (5xx)
  - Source maps: upload during build for readable stack traces
- [ ] **DEP-MO-008**: Implement custom error context
  - Attach user ID, project ID, and request ID to Sentry events
  - Attach relevant state (active spec, dialog session) to frontend errors
  - Redact sensitive data (tokens, passwords) before sending to Sentry
- [ ] **DEP-MO-009**: Implement error alerting rules
  - Alert: new error type appears (first occurrence)
  - Alert: error rate exceeds threshold (e.g., > 10 errors/minute)
  - Alert: specific critical errors (database connection lost, auth failures)
  - Channels: email, Slack, PagerDuty (configurable)

### 7.4 Infrastructure Monitoring

- [ ] **DEP-MO-010**: Implement system resource monitoring
  - Track: CPU usage, memory usage, disk usage, network I/O
  - Per-container metrics (Docker stats)
  - Alert: CPU > 80%, Memory > 85%, Disk > 80%
  - Tools: Docker stats, node-os-utils, or external agent (Prometheus node_exporter)
- [ ] **DEP-MO-011**: Implement uptime monitoring
  - External uptime check: ping health endpoint every 1 minute
  - Alert if endpoint is unreachable for > 2 minutes
  - Track uptime percentage (target: 99.9%)
  - Tools: UptimeRobot, Pingdom, or self-hosted (Uptime Kuma)
- [ ] **DEP-MO-012**: Implement database monitoring
  - Track: active connections, query latency, table sizes, index usage
  - Monitor replication lag (if using replicas)
  - Alert: connections > 80% of max, replication lag > 10 seconds
  - Tools: pg_stat_statements, pganalyze, or custom queries

### 7.5 Metrics Collection

- [ ] **DEP-MO-013**: Implement Prometheus metrics endpoint (optional)
  - `GET /api/metrics` — Prometheus-format metrics
  - Application metrics: request count, duration histogram, error count
  - Business metrics: active users, specs created, agent sessions
  - Custom metrics: sync operations, conflict count
- [ ] **DEP-MO-014**: Create Grafana dashboards (optional)
  - Dashboard: Application Overview (request rate, error rate, latency)
  - Dashboard: Database Performance (query latency, connections, table sizes)
  - Dashboard: Agent System (sessions, duration, cost, failures)
  - Dashboard: Collaboration (sync frequency, conflicts, active users)

#### Design Decisions

> **Q**: Should we use a SaaS monitoring solution (Datadog, New Relic, Better Stack) or self-hosted (Prometheus + Grafana, Uptime Kuma)? SaaS is simpler but costs money; self-hosted is free but requires maintenance.
> **A**: Self-hosted minimal stack at launch, per the PRD (simple monitoring initially). Uptime Kuma for health checks (lightweight, single container). Sentry for error tracking (SaaS — free tier covers 5,000 events/month, sufficient for launch). Full Prometheus + Grafana is a Phase 3+ enhancement if metrics dashboards become necessary.

> **Q**: What level of observability is needed for launch? Basic health checks and error tracking, or full APM with distributed tracing and metrics dashboards?
> **A**: Basic: health check endpoint (`/health`), structured JSON logging (Pino), and Sentry error tracking, per the PRD. No APM or distributed tracing at launch. The single-server architecture makes distributed tracing unnecessary. Application metrics (request latency, active connections) are logged and can be queried from log files.

> **Q**: Should the monitoring system be accessible to all team members, or only to designated operators?
> **A**: Uptime Kuma and Sentry are accessible to all team members (developers need visibility for debugging). Log files on the server are accessible only to the instance admin (SSH access). No role-based monitoring access at launch.

> **Q**: What alerting channels should be supported? Email, Slack, PagerDuty, Discord? What is the team's primary communication tool?
> **A**: Uptime Kuma supports all major channels. At launch: webhook to Slack or Discord (configured by the deployer). Email alerts as a fallback. PagerDuty is overkill for a 20–50 user deployment. The specific channel is deployment-dependent.

> **Q**: Who should receive alerts? All developers, only on-call person, or a dedicated operations team?
> **A**: All developers receive alerts at launch (small team, shared responsibility). There is no on-call rotation for a small team. As the team grows, alerts should route to a dedicated channel with an on-call person.

> **Q**: Should there be different severity levels for alerts (page vs. warn vs. info)? Who gets paged for critical alerts outside business hours?
> **A**: Two levels at launch: **Critical** (service down, database unreachable, persistent 5xx errors) — immediate notification to all developers. **Warning** (high error rate, disk space low, certificate expiring) — posted to the alerts channel, no page. No paging outside business hours for a local-only deployment.

---

## 8. Logging

### 8.1 Structured Logging

- [ ] **DEP-LG-001**: Implement structured JSON logging on server
  - Use a structured logger: `pino` (recommended for Bun) or `winston`
  - Log format: JSON with fields: `timestamp`, `level`, `message`, `requestId`, `userId`, `module`, `data`
  - Log levels: `error`, `warn`, `info`, `debug`, `trace`
  - Production log level: `info`
  - Development log level: `debug`
- [ ] **DEP-LG-002**: Implement request ID tracing
  - Generate a unique `requestId` (UUID) for each incoming request
  - Attach to all log entries during that request's lifecycle
  - Return in `X-Request-ID` response header
  - Propagate to downstream services (if any)
- [ ] **DEP-LG-003**: Implement request/response logging
  - Log every API request: method, path, query params, user ID, duration, status code
  - Log request body for mutating endpoints (with sensitive field redaction)
  - Log response body for error responses
  - Do not log file upload bodies (too large)
- [ ] **DEP-LG-004**: Implement sensitive data redaction in logs
  - Redact: passwords, tokens, API keys, encryption keys
  - Redact: user email addresses (show only domain)
  - Redact: credit card numbers, social security numbers (if applicable)
  - Implement as a logger middleware/transform

### 8.2 Log Aggregation

- [ ] **DEP-LG-005**: Configure log output for Docker
  - Log to stdout/stderr (Docker captures container output)
  - Docker logging driver: `json-file` with rotation (max-size: 10MB, max-file: 5)
  - Or: `fluentd` driver for centralized collection
- [ ] **DEP-LG-006**: Implement centralized log aggregation (optional)
  - Option A: ELK stack (Elasticsearch + Logstash + Kibana)
  - Option B: Loki + Grafana
  - Option C: Cloud logging (CloudWatch, GCP Logging)
  - Option D: SaaS (Datadog, Logtail, Better Stack)
  - Collect logs from all containers into a single searchable index

### 8.3 Client-Side Logging

- [ ] **DEP-LG-007**: Implement client-side error logging
  - Capture JavaScript errors with Sentry (see Error Tracking)
  - Log API error responses to the browser console (development only)
  - Send critical client errors to the server logging endpoint
- [ ] **DEP-LG-008**: Implement client-side analytics (optional)
  - Track: page views, feature usage, user flows
  - Privacy-respecting: no PII, anonymized identifiers
  - Tools: self-hosted analytics (Plausible, Umami) or custom events
  - Only if user consents (cookie/privacy preference)

#### Design Decisions

> **Q**: Should logs be stored locally (on the server's disk) or sent to a centralized logging service? Centralized logging is better for debugging but adds infrastructure.
> **A**: Locally on disk at launch, per the PRD (structured JSON logging). Docker container logs are written to JSON files with rotation (max 10 MB per file, max 5 files per container). Logs can be queried with `jq` or `grep`. Centralized logging (Loki, Seq, or a SaaS like Better Stack) is a Phase 3+ enhancement.

> **Q**: How long should logs be retained? Longer retention helps with debugging historical issues but increases storage costs. 7 days? 30 days? 90 days?
> **A**: 30 days on-server. Docker log rotation handles this automatically. Older logs are deleted. If longer retention is needed, the nightly backup job can archive compressed logs to a separate directory or off-site storage.

> **Q**: Should client-side errors and analytics be logged server-side, or only via Sentry/error tracking? Server-side logging provides more control but increases log volume.
> **A**: Sentry only for client-side errors. No server-side ingestion of client analytics. This keeps log volume manageable and Sentry provides better tools for client-side error analysis (stack traces, browser context, replay). Client-side analytics (usage metrics) are a Phase 4+ consideration.

> **Q**: Should log levels be configurable at runtime (without restart)? Useful for debugging production issues without redeployment.
> **A**: Yes. The server exposes an admin-only endpoint (`POST /admin/log-level`) that changes the Pino log level at runtime (e.g., from `info` to `debug`). The change persists until the next restart (reverts to the env var default). This is essential for diagnosing production issues.

---

## 9. Backup & Recovery

### 9.1 Database Backups

- [ ] **DEP-BR-001**: Implement automated database backups
  - Schedule: daily full backup, hourly WAL archiving (point-in-time recovery)
  - Tool: `pg_dump` for logical backups, `pg_basebackup` for physical
  - Backup destination: separate storage volume or object storage (S3)
  - Retention: 30 daily backups, 12 monthly backups
  - Test: verify backup integrity weekly (automated restore to test DB)
- [ ] **DEP-BR-002**: Implement database backup encryption
  - Encrypt backup files with GPG or AES before storing
  - Store encryption key separately from backups
  - Document key recovery procedure
- [ ] **DEP-BR-003**: Implement database restore procedure
  - Document step-by-step restore from backup
  - Script: `scripts/db-restore.sh` — restore from a backup file
  - Test: perform a restore drill quarterly
  - Document expected downtime during restore
- [ ] **DEP-BR-004**: Implement point-in-time recovery (PITR)
  - Configure PostgreSQL WAL archiving
  - Store WAL files on separate storage
  - Restore to any point in time within the retention window
  - Document PITR procedure

### 9.2 Knowledge Repository Backups

- [ ] **DEP-BR-005**: Implement git repository backups
  - Schedule: daily backup of all bare repositories
  - Method: `git bundle create` for portable backup files
  - Or: `rsync` the bare repository directory
  - Storage: separate volume or object storage
  - Retention: 30 daily backups
- [ ] **DEP-BR-006**: Implement git repository integrity checks
  - Schedule: weekly `git fsck` on all repositories
  - Alert on corruption or missing objects
  - Log repository sizes and growth rate

### 9.3 Disaster Recovery

- [ ] **DEP-BR-007**: Create disaster recovery plan
  - Define RTO (Recovery Time Objective): target 4 hours
  - Define RPO (Recovery Point Objective): target 1 hour
  - Document recovery steps for each component (DB, repos, config, application)
  - Identify single points of failure and mitigation strategies
- [ ] **DEP-BR-008**: Implement automated recovery testing
  - Schedule: monthly disaster recovery drill
  - Spin up a clean environment
  - Restore from backups
  - Verify application functionality
  - Document results and improve procedures
- [ ] **DEP-BR-009**: Implement cross-region backup (optional)
  - Replicate backups to a different geographic region
  - Protects against regional outages
  - Use object storage cross-region replication or manual sync

#### Design Decisions

> **Q**: What is the acceptable Recovery Point Objective (RPO)? How much data loss is tolerable? 1 hour? 1 day? This determines backup frequency.
> **A**: RPO: 24 hours. Daily `pg_dump` backup at a low-traffic hour (e.g., 3 AM local). For the knowledge graph, the git repositories themselves provide point-in-time recovery (every push is a checkpoint). 24 hours of database data loss is tolerable for a knowledge management tool where the primary content (specs) is in git.

> **Q**: What is the acceptable Recovery Time Objective (RTO)? How long can the service be down? 1 hour? 4 hours? 24 hours? This determines recovery procedure complexity.
> **A**: RTO: 4 hours. Recovery procedure: provision a new server, restore from backup (Docker Compose + pg_restore + git repos), update DNS. This should be achievable by a single admin following a runbook. Sub-hour RTO is not justified for the initial user base.

> **Q**: Should backups be automated and tested regularly, or is manual backup sufficient for the initial launch?
> **A**: Automated daily backups (cron job running `pg_dump`, compressing, storing locally). Backup integrity is verified weekly (automated restore to a temporary database, check row counts). Manual backup is insufficient — automation is a launch requirement.

> **Q**: Should backups be stored off-site (different server/region)? This protects against physical disasters but adds complexity and cost.
> **A**: Yes. Daily backups are copied off-site to an object store (S3-compatible: Backblaze B2, ~$5/month) or a second VPS. Local-only backups do not protect against server failure. The off-site sync runs as part of the nightly backup job.

> **Q**: Should the knowledge graph git repositories be backed up separately from the database? They're already in git (distributed), but the server's bare repositories are the source of truth.
> **A**: Yes, backed up separately. The bare git repositories are tarball'd and included in the nightly off-site backup. While users' cloned working copies provide some redundancy, the server's bare repos are the canonical source and must be backed up. Git bundle format is preferred for efficient backup.

---

## 10. Scaling Strategy

### 10.1 Horizontal Scaling

- [ ] **DEP-SC-001**: Design stateless server architecture
  - Server containers should be stateless (no in-memory state)
  - Session data in database or Redis
  - Rate limiting state in Redis
  - WebSocket state: sticky sessions or Redis pub/sub
  - File storage: shared volume or object storage
- [ ] **DEP-SC-002**: Implement load balancing
  - Reverse proxy (nginx) distributes requests across server instances
  - Load balancing algorithm: round-robin or least-connections
  - Health check-based routing: remove unhealthy instances
  - WebSocket: sticky sessions (via cookie or IP hash)
- [ ] **DEP-SC-003**: Configure auto-scaling rules (optional)
  - Scale based on: CPU > 70%, memory > 80%, request latency > 2s
  - Minimum instances: 2 (high availability)
  - Maximum instances: 10 (cost control)
  - Cooldown period: 5 minutes between scaling events

### 10.2 Database Scaling

- [ ] **DEP-SC-004**: Implement connection pooling
  - PgBouncer as a connection pooler between application and database
  - Pool mode: transaction (recommended for web apps)
  - Max pool size: 100 (adjustable)
  - Per-application connection limit: 20
- [ ] **DEP-SC-005**: Implement read replicas (future scaling)
  - PostgreSQL streaming replication for read-heavy workloads
  - Route read queries to replicas, write queries to primary
  - Implement at the ORM level or via connection routing
  - Monitor replication lag

### 10.3 Caching

- [ ] **DEP-SC-006**: Implement Redis caching layer
  - Cache: frequently accessed specs (summary data)
  - Cache: user permissions (per-project)
  - Cache: graph index data (adjacency lists)
  - Cache TTL: 5 minutes (invalidate on update)
  - Cache invalidation: event-driven (update events purge related cache entries)
- [ ] **DEP-SC-007**: Implement HTTP caching
  - `Cache-Control` headers for static assets: `max-age=31536000, immutable`
  - `Cache-Control` for API responses: `private, no-cache` (or short max-age for public data)
  - ETag support for spec content (conditional requests)
  - CDN integration for static assets (optional)

### 10.4 Git Repository Scaling

- [ ] **DEP-SC-008**: Implement repository size management
  - Monitor repository sizes per project
  - Alert when a repository exceeds size thresholds (500MB, 1GB)
  - Implement `git gc --aggressive` for large repositories
  - Consider shallow clones for user working copies (reduces clone time)
- [ ] **DEP-SC-009**: Implement repository access optimization
  - Cache frequently accessed git objects in memory
  - Use git's built-in pack files for efficient storage
  - Implement git protocol v2 for efficient fetch/push

#### Design Decisions

> **Q**: What is the expected user count at launch? 10? 100? 1000? This determines the initial infrastructure sizing.
> **A**: 20–50 users, per the PRD. Initial infrastructure: 4 vCPU, 8 GB RAM, 160 GB SSD VPS. This comfortably handles the expected load with room for growth to ~100 users before hardware upgrades are needed.

> **Q**: What is the expected growth rate? Should the architecture support 10x growth without re-architecture?
> **A**: Moderate growth expected. The architecture should support 10x (500 users) without re-architecture — achieved by: stateless server (horizontal scaling behind a load balancer), PostgreSQL with connection pooling, and git repo sharding by project. The current single-server deployment handles 50; vertical scaling (bigger VPS) handles 200; horizontal scaling handles 500+.

> **Q**: Should the system support multiple tenants (separate projects with isolation) or is it single-tenant per deployment?
> **A**: Multi-project within a single deployment (projects provide isolation). This is not multi-tenant in the SaaS sense — all projects share the same database and server instance. True multi-tenancy (separate databases per tenant) is a Phase 4+ feature if the system is offered as a hosted service.

> **Q**: Should there be rate limiting or usage quotas per user/project? How should these be enforced (hard limit vs. soft limit with warning)?
> **A**: Rate limiting per the security plan (120 req/min authenticated, 300 req/min agent sessions). No per-project storage quotas at launch — the 20–50 user base is self-regulating. Soft warnings at 80% of practical limits (1,000 specs, 500 MB repo). Hard limits are a Phase 3+ feature.

> **Q**: At what point should we introduce a caching layer (Redis)? From the start, or only when performance benchmarks show it's needed?
> **A**: Only when needed. In-memory caching (LRU Map) handles the initial load. Redis is introduced when: (a) multi-server deployment is needed, or (b) benchmarks show memory pressure from caching. Redis is pre-configured in Docker Compose (commented out) for easy enablement.

> **Q**: Should the frontend use a CDN for static assets? CDNs improve performance for geographically distributed users but add cost and configuration complexity.
> **A**: No CDN at launch. The system is local-only; users are geographically close to the server. Caddy serves static assets with appropriate cache headers (immutable for hashed assets, short TTL for index.html). CDN is a Phase 4+ optimization for geographically distributed deployments.

---

## 11. Release Management

- [ ] **DEP-RM-001**: Define versioning strategy
  - Semantic versioning: `MAJOR.MINOR.PATCH`
  - MAJOR: breaking API changes
  - MINOR: new features, backward compatible
  - PATCH: bug fixes, backward compatible
  - Pre-release tags: `-alpha.1`, `-beta.1`, `-rc.1`
- [ ] **DEP-RM-002**: Implement version tagging in CI
  - Tag Docker images with: git tag, commit SHA, `latest`
  - Tag git repository with version on release
  - Generate changelog from commit messages (conventional commits)
- [ ] **DEP-RM-003**: Create release checklist
  - All tests pass on staging
  - Changelog reviewed and published
  - Database migration plan reviewed (if applicable)
  - Rollback plan documented
  - Stakeholders notified
  - Monitoring dashboards reviewed post-deployment
- [ ] **DEP-RM-004**: Implement zero-downtime deployment strategy
  - Rolling update: deploy new version alongside old, gradually shift traffic
  - Database migrations must be backward compatible (expand-then-contract)
  - Verify new version health before completing rollout
  - Automatic rollback if new version fails health checks
- [ ] **DEP-RM-005**: Implement database migration strategy for releases
  - Migrations run as a separate step before application deployment
  - Migrations must be idempotent (safe to run multiple times)
  - Backward-compatible migrations: old app version works with new schema
  - Separate "expand" (add) and "contract" (remove) migration phases

---

## 12. Runbooks & Documentation

- [ ] **DEP-RB-001**: Create deployment runbook
  - Step-by-step guide for deploying to each environment
  - Include: pre-deployment checks, deployment commands, post-deployment verification
  - Include: rollback procedure
- [ ] **DEP-RB-002**: Create infrastructure setup runbook
  - Guide for provisioning a new server from scratch
  - Include: OS setup, Docker installation, DNS configuration, SSL setup
  - Include: initial application deployment
- [ ] **DEP-RB-003**: Create database operations runbook
  - Guide for: backup, restore, migration, scaling, failover
  - Include: emergency procedures (data corruption, disk full, connection issues)
- [ ] **DEP-RB-004**: Create monitoring and alerting runbook
  - Guide for: setting up monitoring, configuring alerts, responding to alerts
  - Include: common alert scenarios and response procedures
- [ ] **DEP-RB-005**: Create troubleshooting guide
  - Common issues: application won't start, database connection failed, SSL errors
  - Log analysis: where to look, common patterns, error interpretation
  - Performance issues: identifying bottlenecks, common fixes

---

## Additional Design Decisions

> **Q**: Should the deployment include intrusion detection/prevention systems (IDS/IPS)? Tools like fail2ban, OSSEC, or cloud-native equivalents.
> **A**: fail2ban on the host for SSH brute-force protection. No full IDS/IPS at launch — the application's own rate limiting and structured logging provide sufficient visibility for a 20–50 user deployment. OSSEC or CrowdSec is a Phase 3+ enhancement.

> **Q**: Should container images be scanned for vulnerabilities as part of the build pipeline? Tools: Trivy, Snyk Container, Docker Scout.
> **A**: Yes. Trivy runs in the nightly CI workflow (not on every PR — too slow). Critical/high vulnerabilities block the nightly build and create a GitHub issue. The Docker image is rebuilt with updated base images on a weekly schedule to pick up OS-level patches.

> **Q**: Should the server enforce HTTP Strict Transport Security (HSTS) preloading? This is a permanent commitment — once preloaded, the domain can never serve HTTP again.
> **A**: HSTS yes (Caddy enables it by default), but NOT preloading at launch. Preloading is permanent and premature for a self-hosted tool where the domain may change. Standard HSTS (`max-age=63072000; includeSubDomains`) is sufficient. Preloading can be opted into later if the domain is stable.

> **Q**: Should there be periodic penetration testing of the deployed application? How often and by whom?
> **A**: Not formalized at launch. The responsible disclosure policy covers external reports. Self-service security testing (OWASP ZAP scan) is run as part of the nightly CI. Formal third-party penetration testing is a Phase 4+ activity, annual, if the system serves external users.

> **Q**: What is the monthly budget for infrastructure? This constrains hosting, monitoring, and backup choices.
> **A**: Target: under $50/month total. Breakdown: VPS ~$20–40, off-site backup (B2) ~$5, domain ~$1, Sentry free tier $0. The Anthropic API cost (Claude) is separate and usage-dependent — budgeted at $50–200/month depending on agent usage intensity. Total operational budget: under $250/month.

> **Q**: Should the deployment plan include cost estimates for each component (hosting, database, monitoring, backups)?
> **A**: Yes. The deployment documentation includes a cost table with monthly estimates for each component, updated quarterly. This helps self-hosted deployers budget appropriately and identifies cost optimization opportunities.

> **Q**: Should there be cost alerts when spending exceeds thresholds? Especially important for agent API costs (Anthropic/Claude usage).
> **A**: Yes. The server tracks Anthropic API token usage per user and per project. A daily summary is logged. Configurable thresholds (`AGENT_COST_WARN` and `AGENT_COST_LIMIT` env vars) trigger: warning notification at 80% of budget, hard block at 100%. The admin can override the block per-user.

> **Q**: Should the system track per-user or per-project resource consumption for potential billing or usage limits?
> **A**: Per-user and per-project tracking for Anthropic API usage (tokens consumed, estimated cost). Stored in the database for reporting. No billing system at launch — tracking is for visibility and budget management only. The admin dashboard shows a usage breakdown by user and project.
