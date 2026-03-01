# 11 — DEPLOYMENT: Open Questions

> **Purpose**: Unresolved questions about deployment infrastructure including
> hosting choices, build strategy, Docker configuration, CI/CD pipeline, monitoring,
> backup strategy, and scaling approach. Answers may change tasks in the plan.

---

## 1. Hosting & Infrastructure

### 1.1 Hosting Platform
- **Q**: Should the application be hosted on a VPS (DigitalOcean, Hetzner,
  Linode), a cloud platform (AWS, GCP, Azure), or a PaaS (Railway, Render,
  Fly.io)? Each has different cost, complexity, and scaling characteristics.
  What is the expected budget for infrastructure?
- **A:** VPS (Hetzner or DigitalOcean). Per the PRD, the system is local-only through Phase 3 and targets a single-instance server for 20–50 users. A VPS provides the best cost-to-performance ratio (~$20–40/month for 4 vCPU, 8 GB RAM, 160 GB SSD). No cloud platform overhead. Budget target: under $50/month for infrastructure.

- **Q**: Should the application support self-hosted deployments (users run it
  on their own servers)? If so, the deployment must be simple enough for
  non-DevOps users (single Docker Compose, minimal configuration).
- **A:** Yes. Self-hosted deployment is a first-class use case. A single `docker compose up` command with a minimal `.env` file (database password, JWT secret, Anthropic API key) must be the primary deployment method. The Docker Compose file includes all services (app, PostgreSQL, reverse proxy). Documentation covers setup in under 10 minutes.

- **Q**: Should the system run on a single server or be designed for
  multi-server deployment from the start? Single server is simpler but
  creates a single point of failure.
- **A:** Single server at launch, per the PRD. The architecture should not preclude horizontal scaling (stateless server, external database), but multi-server deployment is not a launch requirement. Single-server is acceptable for 20–50 users.

- **Q**: What geographic region should the primary server be located in?
  Is multi-region deployment a future requirement?
- **A:** Region depends on the deployer's user base. For self-hosted, the user chooses. For any reference deployment, US East or EU West (where most cloud providers have cheapest capacity). Multi-region is not planned — the system is local-only.

### 1.2 Database Hosting
- **Q**: Should PostgreSQL be self-hosted (Docker container on the same server)
  or use a managed service (RDS, Cloud SQL, Supabase)? Managed services cost
  more but provide automated backups, failover, and scaling.
- **A:** Self-hosted PostgreSQL in a Docker container, per the PRD (Docker Compose for dev, Docker for production). The container uses a named volume for data persistence. Automated backups are handled by a cron job running `pg_dump`. Managed PostgreSQL is an optional upgrade for users who want hands-off operations.

- **Q**: What is the expected database size? Number of users, specs, and
  audit log volume affect storage and performance requirements.
- **A:** At 20–50 users with ~500 specs per project and a few projects: database size under 2 GB (excluding audit logs). Audit logs at ~1 KB/event, ~1,000 events/day = ~365 MB/year. Total expected database size: under 5 GB for the first year. A 40 GB volume is more than sufficient with room for growth.

- **Q**: Should the database support high availability (automatic failover
  to a standby)? This is important for production but adds cost and complexity.
- **A:** Not at launch. Single PostgreSQL instance. Downtime tolerance for a 20–50 user local deployment is measured in hours, not minutes. HA (streaming replication + automatic failover) is a Phase 4+ enhancement if uptime SLAs are needed.

- **Q**: Should there be a separate database for audit logs (to prevent
  log volume from affecting application performance)?
- **A:** No. Same database, separate schema/table with append-only permissions. At the expected volume (~365 MB/year), audit logs do not meaningfully impact performance. Partition the audit table by month for efficient archival and querying. Separate database is overkill for launch.

### 1.3 Git Repository Hosting
- **Q**: Should knowledge graph git repositories be hosted on the same server
  as the application, or on an external git hosting service (GitHub, GitLab)?
  Local hosting is simpler and has no API rate limits; external hosting
  provides built-in backup, web UI, and collaboration tools.
- **A:** Same server, per the PRD (JSON+folders knowledge graph in git repos, local-only). Bare repositories stored on the server filesystem. No external git hosting dependency. The server manages all git operations directly. External mirroring (push to GitHub for backup) is an optional Phase 3+ feature.

- **Q**: If using external git hosting, should it be GitHub, GitLab, or a
  self-hosted alternative (Gitea)? Each has different API capabilities,
  pricing, and integration options.
- **A:** N/A at launch (local hosting). If external mirroring is added, GitHub is the default target (most common, best API, free private repos). Gitea is the self-hosted alternative for users who want full control.

- **Q**: Should the git server support SSH-based access, HTTPS-based access,
  or both? SSH is more secure for server-to-server; HTTPS is simpler for
  initial setup.
- **A:** Neither at launch for external access — the application server is the sole consumer of the git repositories via filesystem operations. If external mirroring is added, HTTPS is the default (simpler, no SSH key management). SSH is an option for advanced users.

---

## 2. Build & Runtime

### 2.1 Bun Runtime
- **Q**: Is Bun stable enough for production use, or should there be a Node.js
  fallback plan? Bun is newer and may have compatibility issues with some npm
  packages or NestJS features.
- **A:** Bun is the primary runtime per the PRD. It is stable enough for production with NestJS as of Bun 1.1+. A Node.js fallback is not maintained — if a Bun-specific issue arises, it should be reported and worked around. The performance benefits (faster startup, faster installs, native TypeScript) justify the choice.

- **Q**: Should the server use `bun run` for production execution, or compile
  to a standalone binary with `bun build --compile`? Standalone binaries are
  faster to start but harder to debug.
- **A:** `bun run` for production. Startup time with Bun is already sub-second. The standalone binary approach reduces debuggability and complicates the Docker image (no source maps). `bun run` with the transpiled output is the right balance.

- **Q**: Should generated UI builds also use Bun, or should they use the more
  established Node.js + Vite combination for maximum compatibility?
- **A:** Vite with Bun as the runtime, per the PRD (Bun runtime, Vite builds). `bun run vite build` uses Vite's build pipeline with Bun's speed. This is well-supported and provides maximum compatibility with Vite's plugin ecosystem.

### 2.2 Build Strategy
- **Q**: Should the build process produce a single monolithic Docker image
  (frontend + server) or separate images? Separate images allow independent
  scaling and deployment but add orchestration complexity.
- **A:** Single monolithic Docker image. The NestJS server serves the Vite-built frontend as static files. This simplifies deployment (one container for the app), reduces orchestration complexity, and is sufficient for a single-server deployment. The reverse proxy (Caddy) is a separate container for TLS termination.

- **Q**: Should build artifacts (Docker images) be pushed to a public registry
  (Docker Hub, GitHub Container Registry) or a private registry? Public is
  free but exposes the image; private requires registry hosting.
- **A:** GitHub Container Registry (GHCR), public. The application is not a commercial secret — public images simplify self-hosted deployments (`docker pull ghcr.io/org/botnet-knowledge:latest`). Tagged releases (semver) and a `latest` tag. Private registry is unnecessary.

- **Q**: How should generated UI projects be built in CI? Each project
  requires its own build — should all be built on every CI run, or only
  changed ones? Building all is thorough but slow.
- **A:** Only changed projects. Per the PRD, delta builds detect changed specs. CI uses the same change detection: compare the current commit to the last successful build, identify affected projects, build only those. A `--all` flag forces a full rebuild for release builds.

---

## 3. Docker

### 3.1 Container Architecture
- **Q**: Should Docker Compose be the production orchestration tool, or should
  we use Kubernetes, Docker Swarm, or a PaaS? Docker Compose is simplest
  but limited for multi-node scaling.
- **A:** Docker Compose for both dev and production, per the PRD. A single `docker-compose.yml` for dev (with hot-reload, debug ports) and a `docker-compose.prod.yml` override for production (optimized images, restart policies, log drivers). Kubernetes is overkill for a single-server, 20–50 user deployment.

- **Q**: Should the reverse proxy (nginx/Caddy) run as a Docker container or
  be installed directly on the host? Containerized is more portable; host
  installation is simpler for single-server setups.
- **A:** Docker container (Caddy). Caddy is preferred over nginx for automatic HTTPS (Let's Encrypt integration with zero config). Running as a container keeps the deployment fully containerized and reproducible. The Caddy container handles TLS termination, static file caching, and reverse proxying to the app container.

- **Q**: Should Redis be required for production, or should it be optional
  (fall back to in-memory for single-server deployments)? Redis is needed
  for rate limiting and caching across multiple server instances.
- **A:** Optional at launch. The single-server deployment uses in-memory rate limiting and caching (Map-based, process-level). Redis is added to Docker Compose as an optional service, enabled via env var (`USE_REDIS=true`). When multi-server deployment is introduced, Redis becomes required.

- **Q**: Should the application containers use root or non-root users? Non-root
  is more secure but can cause file permission issues with mounted volumes.
- **A:** Non-root user (UID 1000). The Dockerfile creates a `botnet` user. Volume permissions are handled by setting the volume ownership in the Docker entrypoint script. This follows container security best practices without sacrificing usability.

### 3.2 Image Optimization
- **Q**: What base image should the server use? `oven/bun:1-slim` (smaller),
  `oven/bun:1` (full), or `oven/bun:1-alpine` (smallest but may have
  compatibility issues)?
- **A:** `oven/bun:1-slim` for the production image. Multi-stage build: `oven/bun:1` for the build stage (full toolchain for native dependencies), `oven/bun:1-slim` for the runtime stage (minimal footprint). Alpine is avoided due to musl compatibility issues with some npm packages.

- **Q**: Should we use multi-platform builds (amd64 + arm64) for the Docker
  images? ARM support is increasingly important for Apple Silicon and
  ARM-based cloud instances, but adds build time.
- **A:** Yes, amd64 + arm64. Built via `docker buildx` in GitHub Actions. ARM support is essential for developers on Apple Silicon Macs running the dev environment locally. Build time increase is ~2x but runs in CI (not blocking developer flow).

---

## 4. CI/CD Pipeline

### 4.1 CI Platform
- **Q**: Should the CI/CD platform be GitHub Actions, GitLab CI, or something
  else? If the repository is on GitHub, GitHub Actions is the natural choice.
  Are there reasons to prefer another platform?
- **A:** GitHub Actions, per the PRD. The repository is on GitHub; Actions provides native integration, good free-tier minutes (2,000 min/month), and the widest ecosystem of reusable actions. No reason to use another platform.

- **Q**: How long should the full CI pipeline take? What is an acceptable
  maximum? Long pipelines slow down development velocity. Target: < 10
  minutes? < 15 minutes?
- **A:** Target: under 10 minutes for the full pipeline (lint + typecheck + unit + integration + E2E). Achieved by parallelizing stages: lint+typecheck in one job (~1 min), unit+integration in another (~3 min), E2E in a third (~5 min). Total wall-clock: ~6 minutes. Hard maximum: 15 minutes.

- **Q**: Should CI run on self-hosted runners (for cost savings and
  performance) or hosted runners (simpler, no maintenance)?
- **A:** GitHub-hosted runners at launch (`ubuntu-latest`). Simpler, no maintenance, and the free tier is sufficient for a small team. Self-hosted runners are a cost optimization if CI minutes become expensive (Phase 3+).

### 4.2 Deployment Strategy
- **Q**: Should production deployment be triggered automatically on merge to
  `main`, or require manual approval? Automatic deployment enables continuous
  delivery; manual approval adds a safety gate.
- **A:** Automatic deployment on merge to `main` after all CI checks pass. A manual "deploy" button in GitHub Actions is available as an override for hotfixes or rollbacks. Continuous delivery is preferred for velocity; the CI pipeline (lint, typecheck, unit, integration, E2E) is the safety gate.

- **Q**: Should there be a separate staging environment that mirrors
  production? Staging is valuable for pre-production testing but doubles
  hosting costs.
- **A:** Not at launch. The local dev environment (Docker Compose) serves as the staging environment. A dedicated staging server is a Phase 3+ enhancement when the team grows or the deployment serves external users. Cost doubling is not justified for 20–50 users.

- **Q**: How should database migrations be handled during deployment? Run
  before application restart (may cause brief incompatibility) or use
  expand-then-contract pattern (safe but more complex)?
- **A:** Run before application restart. Drizzle ORM migrations execute as a pre-start step in the Docker entrypoint (`bun run drizzle-kit migrate` before `bun run start`). For a single-server deployment, the brief incompatibility window (seconds) is acceptable. Expand-then-contract is used only for migrations that drop columns or rename tables (applied manually with care).

- **Q**: Should we implement blue-green deployment, rolling update, or
  canary release for production? Each has different risk profiles and
  complexity.
- **A:** Simple restart (stop old, start new). With a single server and Docker Compose, blue-green/rolling/canary are unnecessary complexity. Downtime during deployment is measured in seconds (Bun startup is sub-second + migration time). If zero-downtime is required later, a blue-green approach with two container instances behind Caddy is the Phase 4+ path.

### 4.3 Testing in CI
- **Q**: Should E2E tests run on every PR, or only on merge to `main`? E2E
  tests are slow and flaky; running on every PR provides early feedback but
  slows the pipeline.
- **A:** E2E tests run on every PR, per the PRD (GitHub Actions CI: lint, typecheck, unit, integration, E2E). They run in parallel with other checks, so they don't block faster feedback (lint/typecheck results appear first). Flaky tests are quarantined and fixed promptly — flakiness is not tolerated.

- **Q**: Should the CI pipeline include performance/load tests? These are
  valuable but slow and resource-intensive.
- **A:** Not in the standard PR pipeline. Performance/load tests run as a separate scheduled workflow (weekly, or on-demand before releases). Results are tracked over time to detect regressions. The PR pipeline stays under 10 minutes.

- **Q**: Should there be a separate "nightly" CI run that performs more
  thorough testing (security scans, performance tests, full E2E suite)?
- **A:** Yes. A nightly workflow runs: full E2E suite (including slow/edge-case tests), dependency vulnerability scan (`bun audit` / Trivy for Docker images), and performance benchmarks. Results are posted to a Slack/Discord channel or stored as CI artifacts. Failures create GitHub issues automatically.

---

## 5. Monitoring & Logging

### 5.1 Monitoring Stack
- **Q**: Should we use a SaaS monitoring solution (Datadog, New Relic,
  Better Stack) or self-hosted (Prometheus + Grafana, Uptime Kuma)? SaaS is
  simpler but costs money; self-hosted is free but requires maintenance.
- **A:** Self-hosted minimal stack at launch, per the PRD (simple monitoring initially). Uptime Kuma for health checks (lightweight, single container). Sentry for error tracking (SaaS — free tier covers 5,000 events/month, sufficient for launch). Full Prometheus + Grafana is a Phase 3+ enhancement if metrics dashboards become necessary.

- **Q**: What level of observability is needed for launch? Basic health checks
  and error tracking, or full APM with distributed tracing and metrics
  dashboards?
- **A:** Basic: health check endpoint (`/health`), structured JSON logging (Pino), and Sentry error tracking, per the PRD. No APM or distributed tracing at launch. The single-server architecture makes distributed tracing unnecessary. Application metrics (request latency, active connections) are logged and can be queried from log files.

- **Q**: Should the monitoring system be accessible to all team members, or
  only to designated operators?
- **A:** Uptime Kuma and Sentry are accessible to all team members (developers need visibility for debugging). Log files on the server are accessible only to the instance admin (SSH access). No role-based monitoring access at launch.

### 5.2 Logging Strategy
- **Q**: Should logs be stored locally (on the server's disk) or sent to a
  centralized logging service? Centralized logging is better for debugging
  but adds infrastructure.
- **A:** Locally on disk at launch, per the PRD (structured JSON logging). Docker container logs are written to JSON files with rotation (max 10 MB per file, max 5 files per container). Logs can be queried with `jq` or `grep`. Centralized logging (Loki, Seq, or a SaaS like Better Stack) is a Phase 3+ enhancement.

- **Q**: How long should logs be retained? Longer retention helps with
  debugging historical issues but increases storage costs. 7 days? 30 days?
  90 days?
- **A:** 30 days on-server. Docker log rotation handles this automatically. Older logs are deleted. If longer retention is needed, the nightly backup job can archive compressed logs to a separate directory or off-site storage.

- **Q**: Should client-side errors and analytics be logged server-side, or
  only via Sentry/error tracking? Server-side logging provides more control
  but increases log volume.
- **A:** Sentry only for client-side errors. No server-side ingestion of client analytics. This keeps log volume manageable and Sentry provides better tools for client-side error analysis (stack traces, browser context, replay). Client-side analytics (usage metrics) are a Phase 4+ consideration.

- **Q**: Should log levels be configurable at runtime (without restart)?
  Useful for debugging production issues without redeployment.
- **A:** Yes. The server exposes an admin-only endpoint (`POST /admin/log-level`) that changes the Pino log level at runtime (e.g., from `info` to `debug`). The change persists until the next restart (reverts to the env var default). This is essential for diagnosing production issues.

### 5.3 Alerting
- **Q**: What alerting channels should be supported? Email, Slack, PagerDuty,
  Discord? What is the team's primary communication tool?
- **A:** Uptime Kuma supports all major channels. At launch: webhook to Slack or Discord (configured by the deployer). Email alerts as a fallback. PagerDuty is overkill for a 20–50 user deployment. The specific channel is deployment-dependent.

- **Q**: Who should receive alerts? All developers, only on-call person, or
  a dedicated operations team?
- **A:** All developers receive alerts at launch (small team, shared responsibility). There is no on-call rotation for a small team. As the team grows, alerts should route to a dedicated channel with an on-call person.

- **Q**: Should there be different severity levels for alerts (page vs. warn
  vs. info)? Who gets paged for critical alerts outside business hours?
- **A:** Two levels at launch: **Critical** (service down, database unreachable, persistent 5xx errors) — immediate notification to all developers. **Warning** (high error rate, disk space low, certificate expiring) — posted to the alerts channel, no page. No paging outside business hours for a local-only deployment.

---

## 6. Backup & Recovery

- **Q**: What is the acceptable Recovery Point Objective (RPO)? How much data
  loss is tolerable? 1 hour? 1 day? This determines backup frequency.
- **A:** RPO: 24 hours. Daily `pg_dump` backup at a low-traffic hour (e.g., 3 AM local). For the knowledge graph, the git repositories themselves provide point-in-time recovery (every push is a checkpoint). 24 hours of database data loss is tolerable for a knowledge management tool where the primary content (specs) is in git.

- **Q**: What is the acceptable Recovery Time Objective (RTO)? How long can
  the service be down? 1 hour? 4 hours? 24 hours? This determines recovery
  procedure complexity.
- **A:** RTO: 4 hours. Recovery procedure: provision a new server, restore from backup (Docker Compose + pg_restore + git repos), update DNS. This should be achievable by a single admin following a runbook. Sub-hour RTO is not justified for the initial user base.

- **Q**: Should backups be automated and tested regularly, or is manual backup
  sufficient for the initial launch?
- **A:** Automated daily backups (cron job running `pg_dump`, compressing, storing locally). Backup integrity is verified weekly (automated restore to a temporary database, check row counts). Manual backup is insufficient — automation is a launch requirement.

- **Q**: Should backups be stored off-site (different server/region)? This
  protects against physical disasters but adds complexity and cost.
- **A:** Yes. Daily backups are copied off-site to an object store (S3-compatible: Backblaze B2, ~$5/month) or a second VPS. Local-only backups do not protect against server failure. The off-site sync runs as part of the nightly backup job.

- **Q**: Should the knowledge graph git repositories be backed up separately
  from the database? They're already in git (distributed), but the server's
  bare repositories are the source of truth.
- **A:** Yes, backed up separately. The bare git repositories are tarball'd and included in the nightly off-site backup. While users' cloned working copies provide some redundancy, the server's bare repos are the canonical source and must be backed up. Git bundle format is preferred for efficient backup.

---

## 7. Scaling & Performance

- **Q**: What is the expected user count at launch? 10? 100? 1000? This
  determines the initial infrastructure sizing.
- **A:** 20–50 users, per the PRD. Initial infrastructure: 4 vCPU, 8 GB RAM, 160 GB SSD VPS. This comfortably handles the expected load with room for growth to ~100 users before hardware upgrades are needed.

- **Q**: What is the expected growth rate? Should the architecture support
  10x growth without re-architecture?
- **A:** Moderate growth expected. The architecture should support 10x (500 users) without re-architecture — achieved by: stateless server (horizontal scaling behind a load balancer), PostgreSQL with connection pooling, and git repo sharding by project. The current single-server deployment handles 50; vertical scaling (bigger VPS) handles 200; horizontal scaling handles 500+.

- **Q**: Should the system support multiple tenants (separate projects with
  isolation) or is it single-tenant per deployment?
- **A:** Multi-project within a single deployment (projects provide isolation). This is not multi-tenant in the SaaS sense — all projects share the same database and server instance. True multi-tenancy (separate databases per tenant) is a Phase 4+ feature if the system is offered as a hosted service.

- **Q**: Should there be rate limiting or usage quotas per user/project?
  How should these be enforced (hard limit vs. soft limit with warning)?
- **A:** Rate limiting per the security plan (120 req/min authenticated, 300 req/min agent sessions). No per-project storage quotas at launch — the 20–50 user base is self-regulating. Soft warnings at 80% of practical limits (1,000 specs, 500 MB repo). Hard limits are a Phase 3+ feature.

- **Q**: At what point should we introduce a caching layer (Redis)? From the
  start, or only when performance benchmarks show it's needed?
- **A:** Only when needed. In-memory caching (LRU Map) handles the initial load. Redis is introduced when: (a) multi-server deployment is needed, or (b) benchmarks show memory pressure from caching. Redis is pre-configured in Docker Compose (commented out) for easy enablement.

- **Q**: Should the frontend use a CDN for static assets? CDNs improve
  performance for geographically distributed users but add cost and
  configuration complexity.
- **A:** No CDN at launch. The system is local-only; users are geographically close to the server. Caddy serves static assets with appropriate cache headers (immutable for hashed assets, short TTL for index.html). CDN is a Phase 4+ optimization for geographically distributed deployments.

---

## 8. Security & Compliance

- **Q**: Should the deployment include intrusion detection/prevention systems
  (IDS/IPS)? Tools like fail2ban, OSSEC, or cloud-native equivalents.
- **A:** fail2ban on the host for SSH brute-force protection. No full IDS/IPS at launch — the application's own rate limiting and structured logging provide sufficient visibility for a 20–50 user deployment. OSSEC or CrowdSec is a Phase 3+ enhancement.

- **Q**: Should container images be scanned for vulnerabilities as part of
  the build pipeline? Tools: Trivy, Snyk Container, Docker Scout.
- **A:** Yes. Trivy runs in the nightly CI workflow (not on every PR — too slow). Critical/high vulnerabilities block the nightly build and create a GitHub issue. The Docker image is rebuilt with updated base images on a weekly schedule to pick up OS-level patches.

- **Q**: Should the server enforce HTTP Strict Transport Security (HSTS)
  preloading? This is a permanent commitment — once preloaded, the domain
  can never serve HTTP again.
- **A:** HSTS yes (Caddy enables it by default), but NOT preloading at launch. Preloading is permanent and premature for a self-hosted tool where the domain may change. Standard HSTS (`max-age=63072000; includeSubDomains`) is sufficient. Preloading can be opted into later if the domain is stable.

- **Q**: Should there be periodic penetration testing of the deployed
  application? How often and by whom?
- **A:** Not formalized at launch. The responsible disclosure policy covers external reports. Self-service security testing (OWASP ZAP scan) is run as part of the nightly CI. Formal third-party penetration testing is a Phase 4+ activity, annual, if the system serves external users.

---

## 9. Developer Experience

- **Q**: How should developers set up their local environment? A single
  `make setup` or `bun setup` command, or a manual step-by-step process?
  Automation is preferred but requires maintenance.
- **A:** Single command: `make setup` (or `bun run setup`). This command: installs dependencies (`bun install`), copies `.env.example` to `.env`, starts Docker Compose services (PostgreSQL), runs database migrations, and seeds test data. A `make dev` command starts the dev server with hot-reload. The Makefile is the source of truth for all development commands.

- **Q**: Should there be a shared development server that all developers
  can use, or should each developer run everything locally?
- **A:** Each developer runs everything locally via Docker Compose, per the PRD (Docker Compose for dev). No shared dev server. Local development ensures isolation, fast iteration, and no dependency on network connectivity. The Docker Compose dev config mirrors production closely.

- **Q**: Should the dev environment include seeded test data (users, projects,
  specs)? Realistic test data helps development but needs maintenance.
- **A:** Yes. A seed script (`bun run seed`) creates: 3 users (admin, editor, viewer), 2 projects, ~20 sample specs with edges, and sample dialog history. The seed data is maintained alongside the schema and updated when the data model changes. Seed data is deterministic (same output every run) for reproducible development.

- **Q**: Should there be a development mode for the agent system that uses
  mock responses instead of real Claude API calls? This saves API costs
  during development.
- **A:** Yes. An `AGENT_MOCK=true` env var enables mock agent responses. Mock responses are pre-recorded fixtures stored in `test/fixtures/agent/`. The mock mode returns realistic responses with simulated latency (500ms). Real API calls are used only for integration testing and production. This saves significant API costs during UI development.

---

## 10. Cost Management

- **Q**: What is the monthly budget for infrastructure? This constrains
  hosting, monitoring, and backup choices.
- **A:** Target: under $50/month total. Breakdown: VPS ~$20–40, off-site backup (B2) ~$5, domain ~$1, Sentry free tier $0. The Anthropic API cost (Claude) is separate and usage-dependent — budgeted at $50–200/month depending on agent usage intensity. Total operational budget: under $250/month.

- **Q**: Should the deployment plan include cost estimates for each component
  (hosting, database, monitoring, backups)?
- **A:** Yes. The deployment documentation includes a cost table with monthly estimates for each component, updated quarterly. This helps self-hosted deployers budget appropriately and identifies cost optimization opportunities.

- **Q**: Should there be cost alerts when spending exceeds thresholds?
  Especially important for agent API costs (Anthropic/Claude usage).
- **A:** Yes. The server tracks Anthropic API token usage per user and per project. A daily summary is logged. Configurable thresholds (`AGENT_COST_WARN` and `AGENT_COST_LIMIT` env vars) trigger: warning notification at 80% of budget, hard block at 100%. The admin can override the block per-user.

- **Q**: Should the system track per-user or per-project resource consumption
  for potential billing or usage limits?
- **A:** Per-user and per-project tracking for Anthropic API usage (tokens consumed, estimated cost). Stored in the database for reporting. No billing system at launch — tracking is for visibility and budget management only. The admin dashboard shows a usage breakdown by user and project.

---

## Decision Log

> Record decisions as questions are resolved.

| Date | Question | Decision | Rationale |
|------|----------|----------|-----------|
| — | — | — | — |
