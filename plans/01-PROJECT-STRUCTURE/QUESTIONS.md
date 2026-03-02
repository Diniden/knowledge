# 01 — PROJECT STRUCTURE: Open Questions

> **Purpose**: Unresolved questions about monorepo layout, workspace
> configuration, package boundaries, shared code strategy, tooling choices, and
> development workflow. Answers to these questions may change tasks in the plan.

---

## 1. Workspace & Package Naming

### 1.1 Package Scope

- **Q**: Should workspace packages use a scoped name like `@kg/client`, or an
  unscoped name like `kg-client`? Scoped names prevent npm collisions but add
  verbosity to imports.
- **A:** Use scoped names: `@kg/client`, `@kg/server`, `@kg/shared`, etc. Scoped names are the modern standard for monorepo packages, prevent collisions, and make workspace references unambiguous. The verbosity cost is negligible since these are internal workspace references, not manually typed imports — IDEs auto-complete them.

- **Q**: What should the scope prefix be? `@kg` (knowledge graph)? `@botnet`?
  Something else? This affects every import and package.json across the repo.
- **A:** Use `@kg` (knowledge graph). It's short, descriptive, and directly reflects the core domain. `@botnet` is the parent project name but less descriptive for package scoping. Keep it concise — every import benefits from brevity. If the project is later published, `@kg` is generic enough to claim or alias.

### 1.2 Package Granularity

- **Q**: Should the MCP servers be a single package (`@kg/mcp-servers`) or
  individual packages per server (`@kg/mcp-graph`, `@kg/mcp-rag`,
  `@kg/mcp-gen-ui`)? Individual packages enable independent deployment but add
  workspace complexity.
- **A:** Single package: `@kg/mcp-servers`. MCP servers share common utilities (connection handling, error formatting, tool registration patterns) and are deployed together. Individual packages add 3–5 workspace entries, separate tsconfigs, and coordination overhead for minimal benefit. Use internal directory structure (`src/graph/`, `src/rag/`, `src/gen-ui/`) with separate entry points per server.

- **Q**: Should the Claude Code wrapper be its own package, or part of the
  server? Separating it enables testing in isolation and potential reuse, but
  adds a package to maintain.
- **A:** Own package: `@kg/claude-code-wrapper`. The wrapper encapsulates process spawning, sandboxing, prompt construction, and output parsing — a clear boundary. Isolating it enables focused unit testing with mocked child processes, and it may be consumed by both the server and MCP servers. The maintenance cost of one extra package.json is trivial.

- **Q**: Should there be a separate `@kg/database` package for migrations,
  schemas, and query helpers, or should that live directly in the server?
- **A:** Keep it in the server (`server/src/database/`). The database is exclusively consumed by the NestJS server — no other package needs direct DB access. MCP servers and the Claude Code wrapper interact with the DB through the server's API. A separate package adds indirection with no consumer benefit. Migrations, seeds, and connection config stay server-internal.

### 1.3 Client Package Boundary

- **Q**: Is `client/` a single workspace package, or should `client/ui/` and
  `client/gen/` be separate packages? The gen UI projects have very different
  lifecycles from the main UI.
- **A:** `client/` is a single workspace package. The `client/ui/` directory is the main app source, and `client/gen/` is a directory of agent-generated projects. Gen UI projects have their own package.json files but are NOT workspace members — they're independent mini-projects. The workspace package is `@kg/client`, which only covers the main UI.

- **Q**: Should generative UI projects be workspace packages at all, or just
  unmanaged directories with their own `package.json` files that aren't part
  of the workspace?
- **A:** Unmanaged directories. Gen UI projects are agent-created, have their own dependencies, and have completely different build lifecycles. Making them workspace packages would mean every `bun install` at the root processes them, and every new agent-generated project modifies the workspace config. They're standalone Vite projects that happen to live inside the repo.

---

## 2. Shared Code Strategy

### 2.1 What Goes in Shared

- **Q**: Should `@kg/shared` contain only types and constants, or also runtime
  utilities (validation functions, date formatters, ID generators)?
- **A:** Types, constants, AND lightweight runtime utilities. Validation functions (`isValidSpecId`, `isValidEdgeType`), ID generators (nanoid/UUID wrappers), and date formatters are used identically on client and server. Keeping them in shared eliminates duplication and ensures consistency. The key constraint: shared must have zero heavy dependencies — only pure TypeScript utilities.

- **Q**: Should shared API route constants include full URL builders (e.g.,
  `getSpecUrl(id: string) => /api/v1/specs/${id}`), or just path templates?
- **A:** Full URL builder functions. They ensure client and server agree on route shapes and make refactoring safe (change the builder, all consumers update). Export both the template string (`SPEC_ROUTE = '/api/v1/specs/:id'`) and the builder function (`getSpecUrl(id) => \`/api/v1/specs/${id}\``). The template is useful for NestJS route decorators; the builder is useful for client fetch calls.

- **Q**: Should DTOs (Data Transfer Objects) live in shared (so the client can
  use them for request building), or only on the server?
- **A:** DTO interfaces (the shape) live in shared. DTO validation classes (with class-validator decorators) live on the server. The client imports the interface to build type-safe requests; the server imports both the interface and the decorated class for runtime validation. This gives type safety across the boundary without shipping server-side validation dependencies to the client.

### 2.2 Type Sharing Approach

- **Q**: Should shared types be compiled to JavaScript + declarations (requiring
  a build step), or should consuming packages import TypeScript source directly
  (no build needed but slower IDE)? Bun can import `.ts` directly, which
  simplifies things.
- **A:** Compile to JavaScript + declarations. Although Bun can import `.ts` directly, the client uses Vite (which has its own module resolution), and IDE performance degrades with direct `.ts` imports across packages. A build step (`tsc`) generates `.js` + `.d.ts` files, ensuring fast IDE resolution and compatibility with both Bun and Vite. The shared package runs `tsc --watch` during development.

- **Q**: If importing TypeScript source directly, should `shared/src/index.ts`
  be the entry point, or should consumers import specific files like
  `@kg/shared/types/spec`?
- **A:** Use `shared/src/index.ts` as the single barrel export entry point (compiled to `dist/index.js`). Consumers import from `@kg/shared` only. Sub-path imports like `@kg/shared/types/spec` add configuration complexity (package.json `exports` map) and break when internal structure changes. The barrel re-exports everything; tree-shaking in Vite's production build eliminates unused code.

### 2.3 Shared Code Growth

- **Q**: What is the policy when shared code grows large? Should sub-packages
  be split off (e.g., `@kg/shared-types`, `@kg/shared-utils`), or should
  shared remain a single package with good barrel exports?
- **A:** Single package with organized internal directories and barrel exports. Split only if the shared package exceeds ~100 files or introduces heavy dependencies that shouldn't ship to all consumers. In practice, shared types/constants/utils for this project will stay well under that threshold. Use sub-directory barrels (`types/index.ts`, `utils/index.ts`) for internal organization.

- **Q**: Should there be a review gate before adding new items to shared, to
  prevent it from becoming a dumping ground?
- **A:** Yes — a lightweight one. The rule: code goes in shared only if it's consumed by at least 2 packages (client + server, or server + mcp-servers). If it's only used by one consumer, it belongs in that consumer's codebase. This is enforced via PR review convention, not a technical gate. Document the rule in `CONTRIBUTING.md`.

---

## 3. Build & Tooling Decisions

### 3.1 Bun vs. Node.js Compatibility

- **Q**: Should the codebase be written to work with both Bun and Node.js, or
  commit fully to Bun-only? Bun-only simplifies things but creates a hard
  dependency on a less mature runtime.
- **A:** Write code using standard Node.js APIs, run on Bun. This gives Bun-primary execution with Node.js as a fallback. Avoid Bun-specific APIs in production code (shared, server, client). Use Bun-specific features only in scripts and the test runner (`bun test`). If Bun breaks NestJS, the server can switch to Node.js with zero code changes — only the run command changes.

- **Q**: NestJS has some Node.js-specific assumptions. Has Bun + NestJS been
  validated? If there are compatibility issues, is the fallback to use Node.js
  for the server and Bun for everything else?
- **A:** Bun + NestJS has been reported working in the community but is not officially supported by NestJS. Validate in the first 2 days of Phase 1 with a spike: scaffold a NestJS app, add decorators, guards, and a TypeORM/Drizzle connection, and run under Bun. If it works, proceed. If it fails, fall back to Node.js for the server only. This is the expected fallback — the rest of the monorepo stays on Bun.

- **Q**: Should CI run tests on both Bun and Node.js to catch compatibility
  issues early?
- **A:** No. Run CI on Bun only (the primary runtime). Dual-runtime testing doubles CI time for a theoretical benefit. If the Node.js fallback is triggered for the server, switch that CI job to Node.js. The codebase uses standard APIs, so compatibility issues are rare. Focus CI time on actual test coverage, not runtime matrix testing.

### 3.2 Build Tooling

- **Q**: Should Vite also be used for the server build, or should the server
  use `tsc` directly (or `bun build`)?
- **A:** Server uses `tsc` for production builds. In development, Bun runs TypeScript directly (no build step). Vite is a frontend tool optimized for browser bundles — it's the wrong tool for a NestJS server. `tsc` produces clean ESM output with declaration files, which is exactly what the server needs. `bun build` is an option but `tsc` is safer for NestJS's decorator metadata.

- **Q**: Should the shared package use `tsc` for compilation, or `bun build`?
  `tsc` produces better declaration files; `bun build` is faster.
- **A:** Use `tsc`. Declaration files (`.d.ts`) are essential for IDE support across workspace boundaries. `bun build` doesn't emit declarations. The shared package is small enough that `tsc` speed is irrelevant (< 1 second). In watch mode, `tsc --watch` provides instant rebuilds. Correctness of type exports is more important than build speed for this package.

- **Q**: Is a build orchestrator (Turborepo, Nx) needed, or is `bun run
--filter` sufficient? Turborepo adds caching and task graph optimization but
  adds complexity.
- **A:** `bun run --filter` is sufficient for now. The monorepo has ~5 packages with a simple dependency chain (shared → server, shared → client, shared → mcp-servers). Turborepo's caching benefits are marginal at this scale. If builds exceed 2 minutes or the package count grows past 10, reconsider. Use a simple `scripts/build.ts` for ordering instead of adding a build framework dependency.

### 3.3 Hot Reload

- **Q**: For the server, should we use `bun --watch` (built-in), `nodemon`, or
  NestJS's `@nestjs/cli start --watch`? Each has different file watching
  behavior and restart speeds.
- **A:** Use `bun --watch src/main.ts`. It's built-in, fast, and doesn't require additional dependencies. NestJS's `--watch` uses webpack under the hood (slow, unnecessary with Bun). Nodemon adds a dependency for something Bun provides natively. `bun --watch` restarts the process on any `.ts` file change in the watched directory.

- **Q**: Should the shared package rebuild trigger both client and server
  reloads automatically, or should developers manually restart?
- **A:** Automatic. The `scripts/dev.ts` orchestrator runs `tsc --watch` on shared, and both Vite (client) and `bun --watch` (server) pick up the changed output files. Vite's HMR handles client-side updates. Bun's `--watch` restarts the server when it detects changed files in the shared package's `dist/`. No manual restart needed — the dev experience should be seamless.

---

## 4. Knowledge Graph Directory

### 4.1 Data Structure

- **Q**: Should spec files be one JSON file per spec, or should specs be
  grouped by document (one JSON file per spec document containing all its
  specs)?
- **A:** One JSON file per spec. This minimizes git merge conflicts, enables per-spec `git log` history, and keeps files small and focused. A separate document index file (`documents/{doc-id}.json`) lists the ordered spec IDs belonging to that document. This separation means editing one spec doesn't touch other specs' files.

- **Q**: Should edges be stored in a separate directory (`edges/`), or
  alongside the specs they connect (e.g., in the source spec's directory)?
- **A:** Separate `edges/` directory with one JSON file per edge. Storing edges alongside specs creates ambiguity (which spec "owns" the edge?) and complicates queries for all edges of a given type. A dedicated `edges/` directory makes it easy to scan all edges, build adjacency lists, and manage edge lifecycle independently from specs.

- **Q**: Should the knowledge graph directory have a flat structure or a nested
  structure (e.g., `specs/{document-id}/{spec-id}.json`)?
- **A:** Nested structure: `specs/{document-id}/{spec-id}.json`. This groups related specs visually in the filesystem, makes directory listings meaningful, and keeps any single directory from growing to thousands of files. The document-level grouping also aligns with git diff views — changes to a document's specs appear together. Edge files stay flat: `edges/{edge-id}.json`.

- **Q**: What is the maximum file size concern? If a spec document grows very
  large, does the JSON file become unwieldy?
- **A:** Not a concern with one-file-per-spec. Individual spec JSON files will be 1–10KB (title, markdown content, metadata). Even large specs with extensive content won't exceed 50KB. The document index file is just an array of IDs — negligible size. Git handles this granularity efficiently. If a future spec type somehow exceeds 1MB, split its content into a separate markdown file referenced by the JSON.

### 4.2 Indexing

- **Q**: Should there be an index file (e.g., `meta/index.json`) that maps
  spec IDs to file paths for fast lookups, or should the system scan the
  directory?
- **A:** Yes, maintain `meta/index.json` mapping spec IDs to file paths. Directory scanning is O(n) and hits the filesystem on every lookup. The index is rebuilt on server start by scanning, then kept in sync as specs are created/updated. The index file is git-tracked (it's derived but useful for quick startup). Also maintain `meta/documents.json` listing all document IDs.

- **Q**: Should edge indexes be maintained (e.g., an adjacency list file), or
  computed on demand?
- **A:** Maintain `meta/adjacency.json` — a precomputed adjacency list mapping each spec ID to its outgoing and incoming edges. This is the primary data structure for graph traversal and visualization. Recomputed on server start from the `edges/` directory, updated incrementally on edge mutations. Git-tracked for fast startup on clone. Graph crawling performance depends on this index.

### 4.3 Git Integration

- **Q**: Should the knowledge graph directory be its own git repo (submodule),
  or part of the main project repo? A separate repo allows independent version
  history but adds git complexity.
- **A:** Part of the main project repo. Submodules add friction to every git operation (clone, pull, branch, merge) and create synchronization headaches. The knowledge graph directory is just a folder in the monorepo with its own directory structure. Per-spec version history is available via `git log -- knowledge-graph/specs/{doc}/{spec}.json`. No submodule needed.

- **Q**: When the PRD says "each user project is a git repo" — does that mean
  the entire monorepo is the project, or just the knowledge graph directory?
- **A:** The entire monorepo is the project. Each user/team that creates a "project" in the platform gets a full git repo containing the application code, knowledge graph data, and generated UI projects. The monorepo IS the project. When the platform creates a new project, it initializes a new git repo from a template that includes the full directory structure.

- **Q**: How should the `.gitignore` within the knowledge graph directory be
  configured? Should generated metadata (indexes, caches) be committed or
  ignored?
- **A:** Commit the indexes (`meta/index.json`, `meta/adjacency.json`, `meta/documents.json`). Although they're derived, committing them avoids a rebuild-on-clone step and makes the repo self-contained. Ignore caches and temporary files: `meta/cache/`, `meta/*.tmp`. The `.gitignore` in `knowledge-graph/` should only ignore transient artifacts, not the structural metadata.

---

## 5. Generative UI Projects

### 5.1 Project Structure

- **Q**: What is the minimal viable structure for a gen UI project? Is it:
  `package.json` + `vite.config.ts` + `index.html` + `src/main.tsx`? Or even
  simpler?
- **A:** Exactly that minimal set: `package.json`, `vite.config.ts`, `index.html`, `src/main.tsx`, and `src/App.tsx`. The Vite config is templated (minimal, ESM output, React plugin). The agent generates the React components in `src/`. This is the simplest structure that supports JSX, hot reload during development, and a production build for iframe loading.

- **Q**: Should gen UI projects use React (same as the main UI), or should they
  be framework-agnostic (vanilla JS/TS)?
- **A:** React. Using the same framework as the main UI means the agent has a consistent mental model, shared component patterns, and predictable output. Framework-agnostic adds complexity to the generation process without benefit. React is specified in the gen UI template's `package.json`. The agent generates React components and hooks.

- **Q**: Should gen UI projects have access to the shared types package, or
  should they be fully independent?
- **A:** Fully independent. Gen UI projects are sandboxed in iframes and must not depend on monorepo internals. If they need type information (e.g., spec shapes), the agent copies the relevant type definitions into the gen project. This ensures gen UIs are self-contained and portable — they work even if extracted from the monorepo.

### 5.2 Dependency Management

- **Q**: Should gen UI projects have their own `node_modules`, or share
  dependencies with the main client?
- **A:** Their own `node_modules`. Gen UI projects are isolated — they run in iframes and build independently. Sharing dependencies with the main client creates coupling and version conflicts. Each gen project's `bun install` creates a local `node_modules`. The `node_modules` directories of gen projects are `.gitignore`-d (only `package.json` + `bun.lock` are committed).

- **Q**: If gen UI projects are workspace packages, they add weight to every
  `bun install`. If not, how are their dependencies installed?
- **A:** Gen UI projects are NOT workspace packages. Their dependencies are installed on-demand: when the agent creates a gen UI project, it runs `bun install` in that project's directory as part of the scaffolding step. When a user clones the repo, a setup script (or the server on first load) runs `bun install` in any gen projects that exist. A `scripts/install-gen-uis.ts` handles batch installation.

- **Q**: Should there be a fixed set of allowed dependencies for gen UI
  projects (for security), or can the agent install anything?
- **A:** Fixed allowlist of approved dependencies. Gen UI projects run in iframes with CSP restrictions, but supply-chain attacks are still a concern. Maintain an allowlist in `config/gen-ui-allowed-deps.json` containing: React, ReactDOM, common UI libraries (e.g., recharts, framer-motion), and utility libraries (lodash, date-fns). The agent's MCP tool enforces the allowlist when adding dependencies.

### 5.3 Build & Load

- **Q**: Should gen UI projects be pre-built (agent builds, dist/ is committed),
  or built on-demand when the user loads them?
- **A:** Pre-built by the agent. When the agent generates a gen UI project, it also runs the build and commits the `dist/` output. This means the user sees the result instantly without waiting for a build. The `dist/` directory is git-tracked (it's the deliverable). If the user modifies the source, they can rebuild manually or via an agent command.

- **Q**: How is the gen UI project's `dist/` served to the iframe? Through the
  main server, or does each gen project run its own dev server?
- **A:** Through the main server. The NestJS server serves static files from `client/gen/{user}/{project}/dist/` via a dedicated route: `GET /gen/:user/:project/*`. The iframe's `src` points to this route. No per-project dev server — that doesn't scale. During development, the agent can run a Vite dev server for live preview, but the committed `dist/` is the production serving mechanism.

- **Q**: Should gen UI builds be validated (type-check passes, no build errors)
  before being made available to the user?
- **A:** Yes. The agent's build step should include `tsc --noEmit` (type check) and `vite build` (bundle). If either fails, the agent reports the error in the chat dialog and doesn't commit the `dist/`. The user sees the error and can ask the agent to fix it. This prevents broken gen UIs from being served. Build validation is part of the agent's MCP tool workflow, not a separate step.

---

## 6. Environment & Configuration

### 6.1 Environment Management

- **Q**: Should `.env` files be committed (with placeholder values) or always
  generated from `.env.example`? The PRD implies secrets are never committed.
- **A:** Never commit `.env` files. Commit `.env.example` with placeholder values and descriptions. Developers copy `.env.example` to `.env` on setup (the setup script automates this). `.env` is in `.gitignore`. This is the standard practice — secrets never enter git history. The `.env.example` serves as documentation for required variables.

- **Q**: Should there be separate `.env` files per workspace
  (`client/.env`, `server/.env`), or a single `.env` at the root?
- **A:** Single `.env` at the root. Most environment variables are server-side; the few client-side variables (prefixed `VITE_`) are read by Vite from the root or client directory. A single file avoids confusion about which `.env` holds which value. The NestJS ConfigModule and Vite both support reading from a root `.env`. Less files = less maintenance.

- **Q**: Should environment configuration support multiple profiles
  (development, staging, production, test) via separate files or a single
  file with overrides?
- **A:** Separate files: `.env.example` (template), `.env` (local development, gitignored), `.env.test` (test overrides, committed with safe values). Staging and production environments use their hosting platform's env var mechanism (CI secrets, cloud config), not committed files. The server loads `.env` by default and `.env.test` when `NODE_ENV=test`.

### 6.2 Configuration Validation

- **Q**: Should the server crash on startup if a required environment variable
  is missing, or should it log a warning and use a default?
- **A:** Crash on startup for required variables (DATABASE_URL, JWT_SECRET, CLAUDE_API_KEY). Log a warning and use defaults for optional variables (LOG_LEVEL defaults to "info", PORT defaults to 4000). Crashing fast is better than running in a broken state. The error message should clearly list which variables are missing and reference `.env.example`.

- **Q**: Should configuration be validated using Zod, class-validator (NestJS
  convention), or a simpler approach?
- **A:** Use Zod for env validation. It's simpler than class-validator for this use case (no decorators needed, better TypeScript inference), works identically in server and shared packages, and produces clear error messages. NestJS's ConfigModule supports custom validation functions — pass a Zod schema's `.parse()` as the validator. Keep class-validator for DTO validation in NestJS controllers.

---

## 7. Testing Infrastructure

### 7.1 Test Runner

- **Q**: The PRD specifies `bun test`. Does `bun test` support all needed
  features (mocking, coverage, watch mode, parallel execution)?
- **A:** Yes. `bun test` supports: built-in mocking (`mock()`), code coverage (`--coverage`), watch mode (`--watch`), snapshot testing, lifecycle hooks (beforeAll, afterEach), and parallel test file execution. It's Jest-compatible in API. The main gap is ecosystem maturity — some niche Jest plugins won't work. For this project's needs (unit tests, integration tests, mocks), `bun test` is sufficient.

- **Q**: Should tests be colocated with source files (`spec.test.ts` next to
  `spec.ts`), or in a separate `__tests__/` directory?
- **A:** Colocated. Place `spec.service.test.ts` next to `spec.service.ts`. Colocation makes it obvious which files have tests, simplifies imports (relative paths), and encourages writing tests alongside code. Integration tests that span multiple modules go in `server/test/` (or `client/test/`). This is the NestJS convention and works well with `bun test`'s file discovery.

- **Q**: Should there be separate test commands for unit tests, integration
  tests, and E2E tests, or one unified command with tags/patterns?
- **A:** Separate commands. `bun test` (unit tests, fast), `bun test:integration` (requires DB, slower), `bun test:e2e` (full stack, slowest). Use file naming patterns: `*.test.ts` for unit, `*.integration.test.ts` for integration, `*.e2e.test.ts` for E2E. Bun's `--grep` or file pattern flags separate them. CI runs all three as separate jobs for parallelism and clear failure identification.

### 7.2 Test Database

- **Q**: Should integration tests use the same Docker PostgreSQL instance
  (separate database), or spin up a fresh container per test suite?
- **A:** Same Docker instance, separate database. The `docker-compose.test.yml` runs one PostgreSQL container. Each test suite creates a fresh database (or truncates tables) before running. Spinning up a container per suite is slow (~5 seconds per container). A single container with database-per-suite isolation is fast and sufficient. Reset state with `TRUNCATE CASCADE` between suites.

- **Q**: Should there be a test data factory or builder pattern for generating
  test fixtures?
- **A:** Yes. Create a `test/factories/` directory with builder functions: `createSpec()`, `createEdge()`, `createUser()`, etc. Each factory returns a valid object with sensible defaults and accepts overrides. Use a builder pattern: `SpecFactory.create({ title: 'Custom' })`. This eliminates boilerplate in tests and ensures test data stays consistent with type definitions.

---

## 8. CI/CD Pipeline

### 8.1 CI Platform

- **Q**: Which CI platform will be used? GitHub Actions, GitLab CI, or
  something else? The plan assumes GitHub Actions but should be confirmed.
- **A:** GitHub Actions. It's free for public repos, has excellent Bun support (`oven-sh/setup-bun` action), native Docker service containers for PostgreSQL, and integrates directly with the GitHub-hosted git remote. The team is likely already using GitHub for code hosting. No reason to introduce an alternative CI platform.

- **Q**: Should CI run on every commit, or only on pull requests and merges to
  `main`/`develop`?
- **A:** On every pull request and on pushes to `main` and `develop`. Not on every commit to feature branches (that wastes CI minutes on WIP commits). Developers run `bun test` and `bun lint` locally via pre-commit hooks. CI is the safety net for PRs and protected branches. This balances cost with safety.

- **Q**: Should there be a separate CI job per workspace, or a single pipeline
  that runs everything?
- **A:** Separate jobs per concern (lint, type-check, test-server, test-client, build), not per workspace. Each job installs dependencies once and runs across relevant workspaces. This gives parallel execution (lint and test run simultaneously) with clear failure identification. A single monolithic pipeline is slower and harder to debug.

### 8.2 CI Performance

- **Q**: Should CI cache bun dependencies between runs? What is the cache key
  strategy (hash of bun.lock)?
- **A:** Yes, cache aggressively. Cache key: hash of `bun.lock`. Restore key: `bun-deps-`. Cache `~/.bun/install/cache` and `node_modules`. GitHub Actions' `actions/cache` handles this. This cuts install time from ~30s to ~5s on cache hit. Also cache TypeScript build info files (`.tsbuildinfo`) for incremental type checking.

- **Q**: Should CI use a Docker-in-Docker approach for the test database, or a
  CI service container?
- **A:** CI service container. GitHub Actions natively supports `services:` in workflow YAML, which starts a PostgreSQL container alongside the job. This is simpler and faster than Docker-in-Docker (no nested virtualization). Define `postgres:16` as a service with health checks, and pass the connection string via env vars.

- **Q**: What is the target CI execution time? Under 5 minutes? Under 10?
- **A:** Under 5 minutes for the full pipeline (all parallel jobs). Individual jobs should be under 3 minutes. Lint + type-check: ~1 minute. Tests: ~2–3 minutes. Build: ~2 minutes. If CI exceeds 5 minutes, investigate: usually it's dependency install (fix with caching) or slow integration tests (fix with parallelism or faster teardown).

---

## 9. Docker & Deployment

### 9.1 Development Docker

- **Q**: Should the development Docker Compose only include infrastructure
  (PostgreSQL, Redis), or should it also containerize the application services?
- **A:** Infrastructure only: PostgreSQL (and optionally Redis, pgAdmin). Application services (server, client) run natively on the host via `bun dev`. Containerizing application services in development adds rebuild latency, complicates debugging, and prevents hot reload. Docker is for stateful services that benefit from isolated persistence. Application code runs natively for the best DX.

- **Q**: Should there be a `docker-compose.override.yml` for local customizations?
- **A:** Yes. Create `docker-compose.override.yml.example` with common customizations (port changes, pgAdmin, Redis). Developers copy and modify it as `docker-compose.override.yml` (gitignored). Docker Compose auto-merges override files. This lets developers customize port mappings, add debugging tools, or enable optional services without modifying the committed compose file.

### 9.2 Production Docker

- **Q**: Should the production Docker image use `oven/bun` as the base image,
  or a more traditional Node.js image? Bun's Docker image is less battle-tested.
- **A:** Use `oven/bun:1-debian` (Debian-based, not Alpine — NestJS has native dependencies). Bun is the project's runtime, so the Docker image should match. Pin a specific Bun version tag for reproducibility. If Bun's Docker image causes issues in production, fall back to `node:20-slim` and run the `tsc`-compiled output. Test the production image in Phase 5 staging.

- **Q**: Should client and server be in the same Docker image, or separate
  images? Separate allows independent scaling but adds deployment complexity.
- **A:** Separate images. The client is a static asset bundle served by nginx; the server is a long-running NestJS process. They have completely different runtime characteristics, scaling needs, and update frequencies. Two images: `kg-client` (nginx + built assets) and `kg-server` (Bun + NestJS). A single docker-compose (or k8s config) ties them together in deployment.

- **Q**: Should the client be served by nginx, the NestJS server, or a
  dedicated static file server?
- **A:** Nginx in production, NestJS proxy in development. Nginx is purpose-built for serving static files with gzip, caching headers, and reverse proxy to the API server. In development, Vite's dev server handles the client with HMR, and the Vite proxy forwards API requests to NestJS. The production nginx config includes a `location /api/` block that proxies to the NestJS container.

---

## 10. Versioning & Releases

### 10.1 Package Versioning

- **Q**: Should workspace packages use independent versioning, or should all
  packages share a single version number?
- **A:** Single version number across all packages. Independent versioning adds complexity to a monorepo where all packages are deployed together. Bump the version in the root `package.json` and let workspace packages reference it (or use `workspace:*` for inter-package deps). Semantic versioning applies to the product as a whole, not individual packages.

- **Q**: Should there be an automated release process (e.g., semantic-release),
  or manual version bumps?
- **A:** Manual version bumps for now. Semantic-release adds infrastructure complexity before there's a release cadence. Use `npm version` (or a script) to bump the version, create a git tag, and update changelogs. Automate in Phase 5 if release frequency warrants it. The priority is building features, not release tooling.

### 10.2 API Versioning

- **Q**: Should the API be versioned from the start (`/api/v1/`), or is that
  premature? If versioned, what is the deprecation policy?
- **A:** Version from the start: all endpoints under `/api/v1/`. It costs nothing upfront and avoids a painful migration later. The `v1` prefix is already in the master plan's API routes. Deprecation policy: when `v2` is introduced, `v1` receives 6 months of maintenance (bug fixes only). For an internal tool, this is generous — in practice, migrate quickly and drop `v1`.

---

## 11. Code Style & Conventions

### 11.1 Import Conventions

- **Q**: Should imports use file extensions (`.js` for ESM compatibility), or
  rely on Bun/Vite resolution without extensions?
- **A:** No file extensions. Bun and Vite both resolve `.ts`/`.tsx` imports without extensions. Adding `.js` extensions to TypeScript imports is confusing and unnecessary when the runtime handles resolution. The `tsconfig.json` sets `moduleResolution: "bundler"`, which explicitly supports extensionless imports. If strict ESM compliance is ever needed, a codemod can add extensions.

- **Q**: Should barrel exports (`index.ts`) be used everywhere, or only at
  package boundaries? Barrel exports can cause circular dependency issues and
  larger bundle sizes.
- **A:** Only at package boundaries and major directories. `@kg/shared` gets a barrel export (`src/index.ts`). Major feature directories in the server (`modules/specs/index.ts`) get barrels. Individual component directories do NOT get barrels — import directly from the component file. This prevents circular dependency chains and keeps Vite's tree-shaking effective. Barrel depth: max 1 level.

### 11.2 File Naming

- **Q**: Should React component files use PascalCase (`SpecEditor.tsx`) and
  non-component files use camelCase (`apiClient.ts`)?
- **A:** Yes. React components: PascalCase (`SpecEditor.tsx`, `ChatDialog.tsx`). Non-component files: camelCase (`apiClient.ts`, `useSpecEditor.ts`, `graphUtils.ts`). SCSS files: match their component's PascalCase (`SpecEditor.scss`). This is the React community convention and makes it instantly clear which files export React components.

- **Q**: Should NestJS files follow the NestJS convention (`spec.controller.ts`,
  `spec.service.ts`, `spec.module.ts`)?
- **A:** Yes. Follow NestJS naming conventions exactly: `spec.controller.ts`, `spec.service.ts`, `spec.module.ts`, `spec.dto.ts`, `spec.guard.ts`. This is expected by NestJS CLI generators, documentation, and the community. It makes server code navigable by anyone familiar with NestJS. The kebab-case + suffix pattern is specific to the server package.

- **Q**: Should test files use `.test.ts` or `.spec.ts`? NestJS convention is
  `.spec.ts`, but bun test defaults to `.test.ts`.
- **A:** Use `.test.ts` everywhere. `bun test` discovers `.test.ts` files by default, and the project uses `bun test` as the runner. Consistency across client and server is more valuable than following NestJS convention on this one point. Configure NestJS generators (if used) to output `.test.ts` instead of `.spec.ts`. The term "spec" is also overloaded in this project (knowledge specs).

### 11.3 Directory Naming

- **Q**: Should directories use kebab-case (`knowledge-graph/`), camelCase
  (`knowledgeGraph/`), or match the PascalCase BEM convention?
- **A:** kebab-case for all directories: `knowledge-graph/`, `spec-editor/`, `chat-dialog/`. This is the filesystem convention across the JavaScript ecosystem, works on case-sensitive and case-insensitive filesystems, and matches the plan directory naming (`01-PROJECT-STRUCTURE/`). PascalCase BEM applies to CSS class names only, not filesystem paths.

- **Q**: Should the directory structure be feature-based (all auth files
  together) or layer-based (all controllers together, all services together)?
  NestJS convention is feature-based.
- **A:** Feature-based on the server (NestJS convention): `modules/auth/` contains `auth.controller.ts`, `auth.service.ts`, `auth.module.ts`, `auth.dto.ts`, `auth.guard.ts`. Feature-based on the client: `components/SpecEditor/` contains `SpecEditor.tsx`, `SpecEditor.scss`, `SpecEditor.test.tsx`. Layer-based creates cross-directory dependencies that are hard to navigate. Feature-based keeps related code together.

---

## 12. Security Considerations

### 12.1 Dependency Security

- **Q**: Should `bun audit` (or equivalent) be part of the CI pipeline?
- **A:** Yes. Run `bun audit` (or `npm audit` if Bun's audit is incomplete) as a CI step. Don't block merges on advisories below "high" severity — low/moderate advisories create noise without actionable risk. High and critical advisories should fail CI. This is a simple check that catches known vulnerabilities without manual effort.

- **Q**: Should there be a policy on dependency update frequency (e.g., weekly
  Dependabot PRs)?
- **A:** Enable GitHub Dependabot with weekly PRs for security updates and monthly PRs for version updates. Group minor/patch updates into a single PR to reduce noise. Major version updates require manual review. This keeps dependencies current without drowning the team in PRs. Review Dependabot PRs in batch during a weekly maintenance window.

- **Q**: Should there be a maximum dependency age before it's flagged for
  update?
- **A:** No hard maximum. Dependabot's weekly security PRs handle the critical case (known vulnerabilities). For non-security updates, flag dependencies that are 2+ major versions behind in a quarterly review. Chasing every minor update wastes time. The real concern is security — version freshness is secondary.

### 12.2 Secrets Management

- **Q**: Should secrets be managed via environment variables only, or should a
  secrets manager (e.g., AWS Secrets Manager, Vault) be supported?
- **A:** Environment variables only through Phase 4. For local dev and initial deployment, `.env` files and CI secrets are sufficient. A secrets manager is Phase 5 production infrastructure — add support when deploying to cloud. The architecture should be ready (config loaded from env vars), but don't integrate Vault or AWS Secrets Manager until there's a production environment to protect.

- **Q**: How should the JWT secret be rotated? Does the system need to support
  multiple active secrets for zero-downtime rotation?
- **A:** Support two active secrets for rotation. On rotation: add the new secret as primary, keep the old secret as a verification fallback for existing tokens. JWT verification tries the primary secret first, then the fallback. After the old tokens' max expiry (e.g., 7 days), remove the fallback. This enables zero-downtime rotation. Implement in Phase 3 (auth hardening).

---

## Decision Log

> Record decisions as questions are resolved.

| Date | Question | Decision | Rationale |
| ---- | -------- | -------- | --------- |
| —    | —        | —        | —         |
