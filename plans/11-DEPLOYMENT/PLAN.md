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
