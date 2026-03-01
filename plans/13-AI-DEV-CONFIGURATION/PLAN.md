# 13 — AI DEVELOPMENT CONFIGURATION PLAN

> **Purpose**: Define the complete AI development configuration system — the
> rules, skills, agent types, and CLAUDE.md files that help **human developers**
> use Claude Code and Cursor to **build** the Knowledge Graph Agent System. This
> covers sandboxing strategy, master CLAUDE.md, Cursor rules, Claude Code skills,
> Cursor skills, development agent types, self-updating configuration, master
> planner configuration, "always on" strategy, and evolution strategy.
>
> **CRITICAL DISTINCTION**: This plan covers **development-time** AI
> configuration — how developers use AI tools to write code for this project.
> It is **completely separate** from the **application-runtime** AI
> configuration defined in `06-AGENT-SYSTEM/` — which governs how the built
> application uses Claude Code agents to serve end users. These two domains
> MUST remain strictly sandboxed at the directory level, naming level, and
> conceptual level.
>
> **Phase**: 1 (Foundation — should be established before heavy development)
> **Dependencies**: `01-PROJECT-STRUCTURE/PLAN.md`
> **Estimated tasks**: 230+

---

## Table of Contents

1. [Sandboxing & Directory Strategy](#1-sandboxing--directory-strategy)
2. [Master Development CLAUDE.md](#2-master-development-claudemd)
3. [Cursor Rules Configuration](#3-cursor-rules-configuration)
4. [Claude Code Skills for Development](#4-claude-code-skills-for-development)
5. [Cursor Skills for Development](#5-cursor-skills-for-development)
6. [Development Agent Types](#6-development-agent-types)
7. [Self-Updating Configuration (Back-feeding)](#7-self-updating-configuration-back-feeding)
8. [Master Planner Configuration](#8-master-planner-configuration)
9. ["Always On" Configuration Strategy](#9-always-on-configuration-strategy)
10. [Configuration for Evolving Project](#10-configuration-for-evolving-project)

---

## 1. Sandboxing & Directory Strategy

Establish a clear, enforceable boundary between development-time AI configuration
(files that help humans build the project) and application-runtime AI
configuration (files that the deployed application uses to drive its agent
system). Confusion between these two domains is the single highest-risk failure
mode for this configuration system.

### 1.1 Directory Layout

- [ ] **DEV-AI-001**: Define the canonical directory layout for development AI config
  - Root-level `CLAUDE.md` — master context for Claude Code dev sessions
  - `.claude/` — Claude Code specific config (settings, commands)
  - `.cursor/rules/` — Cursor rule files (`.md` or `.mdc` per Cursor convention)
  - `.cursor/skills/` — Cursor skill files (`SKILL.md` format)
  - `scripts/ai-dev/` — Helper scripts for AI config management (validation, health checks)
  - `docs/ai-dev/` — Human-readable documentation of the AI dev config system
  - None of these directories overlap with `server/agents/`, `server/mcp-servers/`, or any runtime config path
- [ ] **DEV-AI-002**: Define the canonical directory layout for application-runtime AI config
  - `server/src/modules/agent/` — NestJS agent module (runtime orchestrator, session manager)
  - `server/src/modules/agent/prompts/` — Runtime CLAUDE.md templates (assembled per-session)
  - `server/src/modules/agent/skills/` — Runtime skills files (deployed with the app)
  - `server/src/modules/mcp-servers/` — Application MCP servers (knowledge graph, RAG, etc.)
  - `knowledge-graph/` — The data the runtime agents operate on
  - These directories are never touched by development config tooling
- [ ] **DEV-AI-003**: Create `.claude/` directory with a `README.md` explaining its purpose
  - Document that this is for **development** Claude Code config only
  - List what belongs here: settings, commands, custom instructions
  - Explicitly state: "Nothing in this directory is deployed or used at runtime"
- [ ] **DEV-AI-004**: Create `.cursor/rules/` directory with an `_README.md` explaining its purpose
  - Prefix with underscore so it sorts to the top
  - Document the rule file naming convention, glob patterns, and activation modes
  - Explicitly state: "These rules guide developers, they do not affect the running application"
- [ ] **DEV-AI-005**: Create `.cursor/skills/` directory with an `_README.md` explaining its purpose
  - Document the SKILL.md format, registration, and usage
  - Explicitly state: "These skills help developers perform project tasks, they are not runtime agent skills"

### 1.2 Naming Conventions

- [ ] **DEV-AI-006**: Establish naming prefix convention for development vs runtime config
  - Development config files: no prefix needed (they live in dev-only directories)
  - Runtime prompt templates: prefixed or suffixed with `runtime-` or live inside `server/` only
  - If a file must reference both domains, include a clear header comment stating which domain it belongs to
- [ ] **DEV-AI-007**: Establish naming convention for Cursor rule files
  - Pattern: `{domain}.md` — e.g., `frontend-components.md`, `server-architecture.md`
  - Always lowercase, hyphen-separated
  - No numeric prefixes (Cursor applies rules by glob match, not ordering)
- [ ] **DEV-AI-008**: Establish naming convention for Claude Code skill files
  - Pattern: `skill-{action}-{target}.md` — e.g., `skill-create-component.md`, `skill-create-store.md`
  - Always lowercase, hyphen-separated
  - Action verbs: `create`, `update`, `debug`, `refactor`, `test`, `add`
- [ ] **DEV-AI-009**: Establish naming convention for Cursor skill files
  - Pattern: `SKILL.md` inside a descriptively named directory — e.g., `.cursor/skills/create-component/SKILL.md`
  - Directory name describes the skill; file is always `SKILL.md`

### 1.3 Boundary Enforcement

- [ ] **DEV-AI-010**: Create `scripts/ai-dev/validate-sandbox.ts` CI validation script
  - Scan `server/src/modules/agent/` — verify no references to `.cursor/`, `.claude/`, or root `CLAUDE.md`
  - Scan `.cursor/rules/`, `.claude/`, root `CLAUDE.md` — verify no references to runtime prompt assembly, session management, or MCP server startup
  - Verify no dev config files exist inside `server/` or `knowledge-graph/`
  - Verify no runtime config files exist in root-level AI config directories
  - Exit non-zero with descriptive error if any boundary violation found
- [ ] **DEV-AI-011**: Add sandbox validation to CI pipeline
  - Run `scripts/ai-dev/validate-sandbox.ts` on every PR
  - Block merge if any sandbox violations are found
  - Include in the "lint" step alongside ESLint and Prettier checks
- [ ] **DEV-AI-012**: Add a `BOUNDARY.md` reference document
  - Single-page reference that lists every dev config path and every runtime config path
  - Two-column table: "Development Config" vs "Application Runtime Config"
  - Include examples of what goes where
  - Include a "When in doubt" decision tree
- [ ] **DEV-AI-013**: Add boundary awareness to the root `CLAUDE.md`
  - Include a dedicated section titled "Development vs Runtime Configuration Boundary"
  - List the directories for each domain
  - Instruct any Claude Code session: "You are operating as a DEVELOPMENT tool. Never modify files in `server/src/modules/agent/prompts/` or `server/src/modules/agent/skills/` as part of dev config tasks. Those are runtime application files."
- [ ] **DEV-AI-014**: Add boundary awareness to all Cursor rule files
  - Every rule file includes a header comment: `<!-- Domain: Development Configuration -->`
  - Any rule file about the agent system includes an explicit note: "These rules apply to DEVELOPING the agent system, not configuring it at runtime"
- [ ] **DEV-AI-015**: Create a boundary-check pre-commit hook
  - Lightweight check that runs on staged files
  - If a commit touches both dev config files and runtime config files, emit a warning
  - Warning is advisory (not blocking) but alerts the developer to verify intent

#### Design Decisions

> **Q**: How do we prevent a developer's Claude Code session from accidentally modifying app agent configs (in `server/src/modules/agent/prompts/` or `server/src/modules/agent/skills/`) when working on dev configs (CLAUDE.md, `.cursor/rules/`, `.cursor/skills/`)?
> **A**: Three layers of defense. (1) The root CLAUDE.md includes a dedicated "Domain Boundary" section instructing the AI: "You are a DEVELOPMENT assistant. Never modify files under `server/src/modules/agent/prompts/` or `server/src/modules/agent/skills/` as part of dev-config work." (2) Each dev agent type's specification explicitly lists forbidden paths — the agent's system prompt includes a `limitations` block. (3) A CI lint script (`scripts/ai-dev/validate-sandbox.ts`) scans every PR for cross-boundary file changes and blocks merge on violation. The combination of prompt-level instruction, agent-type guardrails, and CI enforcement makes accidental cross-contamination extremely unlikely.

> **Q**: Should there be a CI lint that detects boundary violations between dev config and runtime config?
> **A**: Yes, mandatory. `scripts/ai-dev/validate-sandbox.ts` runs on every PR as part of the lint step (alongside ESLint and Prettier). It scans two directions: (1) dev config files (`.cursor/`, `.claude/`, root `CLAUDE.md`, `scripts/ai-dev/`) must not contain references to runtime prompt assembly, session management, or MCP server startup code. (2) Runtime config files (`server/src/modules/agent/`) must not reference `.cursor/`, `.claude/`, or the root `CLAUDE.md`. Any violation exits non-zero with a descriptive error message identifying the offending file and line. Merge is blocked until the violation is resolved.

> **Q**: How do we handle the case where a developer needs to work on BOTH the app agent system AND project code in the same session?
> **A**: Split into two sequential agent invocations, each with its own agent type. The Master Planner decomposes the task: sub-task A goes to the App Agent System Agent (context: `server/src/modules/agent/`, `server/src/modules/mcp-servers/`), sub-task B goes to the relevant domain agent (Frontend, Server, etc.). They never share context or touch each other's files. If a developer is working manually (not via an agent), the pre-commit hook emits an advisory warning when staged files span both domains — the developer must confirm intent. There is no "blended" session that mixes both domains.

> **Q**: What naming convention clearly distinguishes dev vs app configs?
> **A**: Directory-based separation is the primary mechanism — dev configs live in root-level directories (`.cursor/`, `.claude/`, root `CLAUDE.md`, `scripts/ai-dev/`, `docs/ai-dev/`) and runtime configs live exclusively inside `server/src/modules/agent/`. No filename prefix is needed because the directory location is unambiguous. If a file must reference both domains (e.g., `BOUNDARY.md`, documentation), it includes a header comment `<!-- Domain: Cross-reference document — not a config file -->`. Runtime prompt template files in `server/src/modules/agent/prompts/` use the suffix `.prompt.md` to distinguish them from dev documentation `.md` files.

> **Q**: Should there be a single-page reference document listing every dev config path and every runtime config path side by side?
> **A**: Yes. `BOUNDARY.md` at the project root contains a two-column table mapping every dev config path against every runtime config path, concrete examples of what goes where, and a "When in doubt" decision tree. It is referenced from the root CLAUDE.md, from every always-on Cursor rule, and from the onboarding guide. The boundary validation script checks that `BOUNDARY.md` exists and is non-empty.

> **Q**: Should the boundary-check pre-commit hook be blocking or advisory? Blocking prevents all cross-boundary commits; advisory allows them with a warning.
> **A**: Advisory (warning, not blocking). The CI lint is the hard gate — it blocks merge. The pre-commit hook is a fast local check that alerts the developer early. Blocking at pre-commit is too aggressive: there are legitimate cases where a documentation PR touches both domains (e.g., updating `BOUNDARY.md` and also fixing a typo in a runtime config file). The warning says: "This commit touches both dev-config and runtime-config files. Verify this is intentional." The developer can proceed.

> **Q**: Should runtime config files include a machine-readable marker so the sandbox validator can identify them without relying solely on path patterns?
> **A**: No. Path-based identification is sufficient and simpler. Runtime config files live under `server/src/modules/agent/` — the directory is the marker. Adding inline markers (e.g., `<!-- Domain: Runtime -->`) creates a maintenance burden (forgetting to add the marker to a new file) and a second source of truth that can drift from the directory structure. The sandbox validator uses directory path patterns exclusively.

> **Q**: Can a Cursor rule file for developing the agent system (`agent-system-runtime.md`) safely reference runtime concepts like MCP tool schemas and session management without violating the sandbox?
> **A**: Yes. The rule file describes how to **write code** for the agent system — it naturally references runtime concepts (MCP tools, sessions, prompts). The sandbox boundary is about **file modifications**, not conceptual references. The rule file's header explicitly states: "This rule governs how developers WRITE CODE for the application's agent system. It does NOT configure agent behavior at runtime." The sandbox validator checks file modifications in PRs, not conceptual mentions in rule content.

---

## 2. Master Development CLAUDE.md

The root `CLAUDE.md` is the single most important file in the development AI
config system. Every Claude Code session loads it automatically when working in
the project root. It must be comprehensive yet concise enough to fit in the
context window alongside actual code.

### 2.1 Project Identity & Overview

- [ ] **DEV-AI-016**: Write the project identity header
  - Project name, one-sentence description
  - "This is a Knowledge Graph Agent System — a collaborative knowledge management platform where humans author structured knowledge through AI-assisted dialog."
  - Architecture diagram reference (link to `docs/architecture.md`)
- [ ] **DEV-AI-017**: Write the architecture overview section
  - Monorepo structure: `client/ui/`, `server/`, `packages/shared/`, `knowledge-graph/`
  - Frontend: React + Vite + MobX + BEM SCSS
  - Backend: NestJS + Drizzle ORM + PostgreSQL
  - Runtime: Bun (package manager, test runner, script executor)
  - Agent system: Claude Code wrapper + MCP servers (runtime, in `server/`)
  - Knowledge store: JSON files + folders, git-backed
  - Auth: bcrypt + JWT http-only cookies
- [ ] **DEV-AI-018**: Write the domain boundary warning section
  - Clearly state: "You are a DEVELOPMENT assistant. You help humans write code for this project."
  - List the dev config directories vs runtime config directories
  - Instruct: "Never confuse dev-time AI config with runtime agent config. See BOUNDARY.md for the full reference."

### 2.2 Tech Stack Declaration

- [ ] **DEV-AI-019**: Write the tech stack section with every technology and version constraint
  - React (latest stable), Vite (latest stable), TypeScript (strict mode)
  - MobX with `makeObservable`, decorators, `enforceActions: 'always'`
  - BEM SCSS with PascalCase convention
  - NestJS with ESM, Drizzle ORM, PostgreSQL
  - Bun as runtime and package manager
  - TipTap for rich text editing
  - `@tanstack/virtual` for virtualized lists
  - `bcrypt` for password hashing, JWT for auth tokens
  - `bun test` for unit/integration testing, `@testing-library/react` for component tests, Playwright for E2E
- [ ] **DEV-AI-020**: Document third-party library preferences
  - State which libraries are approved and which to avoid
  - Example: "Use `date-fns` not `moment.js`", "Use `zod` for validation"
  - Include reasoning for each choice (bundle size, ESM support, maintenance status)

### 2.3 Coding Standards

- [ ] **DEV-AI-021**: Write BEM SCSS coding standards
  - Convention: `.PascalCase { &__Item { } &--prop { } }`
  - Single-level nesting only (no `&__Item &__SubItem`)
  - File naming: `ComponentName.module.scss` colocated with the component
  - Variables and mixins in `client/ui/src/styles/`
  - No inline styles; all styling through BEM classes
  - Include 2–3 concrete examples of correct and incorrect usage
- [ ] **DEV-AI-022**: Write MobX coding standards
  - Class stores with `makeObservable` in constructor
  - Use decorators: `@observable`, `@computed`, `@action`, `@action.bound`
  - `enforceActions: 'always'` — all state mutations in actions
  - Store categories: `domain/` (business entities), `session/` (user session, auth), `ui/` (transient UI state)
  - `RootStore` pattern: single root that instantiates and holds all stores
  - Components receive data via props, not by importing stores directly
  - `observer()` wrapper on container components that read from stores
  - Include a concrete store example (class, constructor, decorators, actions)
- [ ] **DEV-AI-023**: Write React component coding standards
  - Props-driven design: leaf components are pure functions of props
  - Container pattern: `observer()` containers read from stores, pass props to leaves
  - File structure: `ComponentName/index.ts`, `ComponentName.tsx`, `ComponentName.module.scss`, `ComponentName.test.tsx`
  - Named exports only (no default exports)
  - Props interface named `{ComponentName}Props`, exported
  - Hooks in `hooks/` directory, named `use{HookName}`
  - No business logic in components — delegate to stores or utility functions
- [ ] **DEV-AI-024**: Write NestJS module coding standards
  - One module per domain area (e.g., `AuthModule`, `SpecModule`, `AgentModule`)
  - Module file layout: `{module-name}/`, `{module-name}.module.ts`, `{module-name}.controller.ts`, `{module-name}.service.ts`, `dto/`, `guards/`, `interceptors/`
  - Controllers handle HTTP concerns only (parsing, validation, response formatting)
  - Services contain all business logic
  - DTOs validated with class-validator decorators
  - Guards for authorization checks
  - All endpoints documented with Swagger decorators
- [ ] **DEV-AI-025**: Write TypeScript strictness rules
  - `strict: true` in all `tsconfig.json`
  - No `any` — use `unknown` and type guards instead
  - No non-null assertions (`!`) unless accompanied by a comment explaining why
  - Prefer `interface` over `type` for object shapes
  - Use discriminated unions for variant types
  - Exhaustive `switch` statements with `never` default
- [ ] **DEV-AI-026**: Write import ordering conventions
  - Order: (1) Node built-ins, (2) third-party packages, (3) `@kg/shared`, (4) project-relative imports, (5) sibling/local imports
  - Each group separated by a blank line
  - Alphabetized within each group
  - No circular imports — enforce with ESLint rule
- [ ] **DEV-AI-027**: Write file naming conventions
  - Directories: `kebab-case` (e.g., `knowledge-graph/`, `auth-module/`)
  - React components: `PascalCase.tsx` (e.g., `SpecEditor.tsx`)
  - Stores: `PascalCase.store.ts` (e.g., `SpecEditor.store.ts`)
  - Services: `kebab-case.service.ts` (e.g., `spec-editor.service.ts`)
  - DTOs: `kebab-case.dto.ts` (e.g., `create-spec.dto.ts`)
  - Types: `kebab-case.types.ts` (e.g., `knowledge-graph.types.ts`)
  - Tests: `{source-file}.test.ts` or `{source-file}.test.tsx`, colocated with source
  - SCSS: `ComponentName.module.scss`, colocated with component
- [ ] **DEV-AI-028**: Write test file conventions
  - Colocated: test file sits next to the source file it tests
  - Naming: `{SourceFile}.test.ts` or `{SourceFile}.test.tsx`
  - Use `describe` blocks named after the module/function under test
  - Use `it` blocks with descriptive names starting with a verb
  - Test factories in `__fixtures__/` directories for shared test data
  - No mocking libraries — prefer dependency injection for testability
  - Use `bun test` runner, not Jest or Vitest

### 2.4 Project Structure Map

- [ ] **DEV-AI-029**: Write the annotated directory tree
  - Full directory tree with one-line purpose annotation for every directory
  - Mark which directories are workspaces (`client/ui/`, `server/`, `packages/shared/`)
  - Mark which directories are git-tracked data (`knowledge-graph/`)
  - Mark AI config directories with "(DEV CONFIG)" annotation
  - Mark runtime agent directories with "(RUNTIME CONFIG)" annotation
- [ ] **DEV-AI-030**: Write the package dependency map
  - Which workspace packages depend on which
  - `@kg/client` → `@kg/shared`
  - `@kg/server` → `@kg/shared`
  - No circular workspace dependencies

### 2.5 Workflow Instructions

- [ ] **DEV-AI-031**: Write development workflow commands
  - `bun install` — install all dependencies
  - `bun dev` — start client, server, and database for development
  - `bun build` — produce production builds
  - `bun test` — run all tests
  - `bun test:client` — run client tests only
  - `bun test:server` — run server tests only
  - `bun lint` — run ESLint and Prettier checks
  - `bun lint:fix` — auto-fix linting issues
  - `bun db:migrate` — run database migrations
  - `bun db:seed` — seed development database
- [ ] **DEV-AI-032**: Write the "before you start coding" checklist
  - Ensure `bun install` is current
  - Ensure database is running (`docker compose up -d postgres`)
  - Ensure tests pass (`bun test`)
  - Check for open plan tasks related to the work area
  - Read relevant Cursor rules for the domain you're working in
- [ ] **DEV-AI-033**: Write the "after you finish coding" checklist
  - Run `bun test` and ensure all tests pass
  - Run `bun lint` and ensure no lint errors
  - Run `bun build` to verify no build errors
  - Update or add tests for changed code
  - Update documentation if public API changed

### 2.6 Agent Delegation Instructions

- [ ] **DEV-AI-034**: Write sub-agent delegation guidelines
  - When to use sub-agents: tasks spanning multiple workspaces, large refactors, multi-step operations
  - When NOT to use sub-agents: single-file edits, simple bug fixes, small additions
  - Sub-agent scope rules: each sub-agent should work within a single workspace or domain
  - Handoff format: describe what the sub-agent should do, what files it should touch, and what the expected output is
- [ ] **DEV-AI-035**: Write skill reference index
  - List every available skill file with a one-line description
  - Group by domain: frontend, server, database, knowledge-graph, testing, config
  - Include file paths so agents can load skills on demand
- [ ] **DEV-AI-036**: Write the "do not" rules
  - Do not modify files in `server/src/modules/agent/prompts/` when doing dev config work
  - Do not install packages without checking if an existing package covers the use case
  - Do not create new directories without checking the project structure plan
  - Do not skip tests — every code change should include or update tests
  - Do not use `console.log` for debugging — use the NestJS logger on the server, remove debug logs before committing
- [ ] **DEV-AI-037**: Write error handling conventions
  - Frontend: React error boundaries for component trees, toast notifications for user-facing errors
  - Server: NestJS exception filters, typed exception classes, structured error responses
  - Knowledge graph: validation errors logged as inquiry items, never silent failures
  - All errors must include enough context for debugging (what was attempted, what failed, relevant IDs)

### 2.7 CLAUDE.md Maintenance

- [ ] **DEV-AI-038**: Define CLAUDE.md update triggers
  - New technology added to the stack → update tech stack section
  - New coding convention established → update coding standards section
  - New workflow command added → update workflow section
  - New skill file created → update skill reference index
  - Directory structure changed → update project structure map
- [ ] **DEV-AI-039**: Define CLAUDE.md size budget
  - Target: under 8,000 tokens (leaves room for skills and code context)
  - If CLAUDE.md exceeds budget, extract detailed sections into referenced skill files
  - Core rules stay in CLAUDE.md; detailed examples and templates move to skills
  - Measure with `wc -w CLAUDE.md` as a rough proxy (target under 6,000 words)
- [ ] **DEV-AI-040**: Create a CLAUDE.md linting script
  - `scripts/ai-dev/lint-claude-md.ts`
  - Verify required sections are present (project identity, tech stack, coding standards, workflow, boundaries)
  - Verify no runtime config references have leaked in
  - Verify token count is within budget
  - Run as part of CI

#### Design Decisions

> **Q**: How long should the root CLAUDE.md be? What is the token budget vs comprehensiveness tradeoff?
> **A**: Target under 8,000 tokens (~6,000 words). This leaves room for domain-specific skills (~4,000 tokens), conversation context, and actual code in a 200K context window. The CLAUDE.md is measured by `scripts/ai-dev/lint-claude-md.ts` which flags overages. If it exceeds 8,000 tokens, extract detailed sections (full examples, lengthy templates) into referenced skill files. The core rules stay inline; details move to on-demand skills. A rough proxy: `wc -w CLAUDE.md` should stay under 6,000 words.

> **Q**: Should CLAUDE.md reference skill files or inline everything?
> **A**: Hybrid. CLAUDE.md inlines the essential conventions that every session needs (project identity, tech stack, coding standards summaries, workflow commands, boundary warning, do-not rules). It references skill files for detailed step-by-step procedures: "For component creation, load `skill-create-component.md`." The skill reference index in CLAUDE.md is a compact list of one-liners with file paths. This keeps CLAUDE.md authoritative as a standalone reference while staying within the token budget.

> **Q**: How often should CLAUDE.md be regenerated/updated?
> **A**: Event-driven, not scheduled. CLAUDE.md is updated when: a new technology is added to the stack, a coding convention changes, a new workflow command is added, a new skill file is created (update the index), or the directory structure changes. These triggers are documented in the plan (DEV-AI-038). A freshness check flags the file if it hasn't been reviewed in 60+ days, but there is no automatic regeneration — all updates are human-reviewed. The Documentation Agent can propose updates but never auto-applies them.

> **Q**: Should there be per-package CLAUDE.md files (e.g., `client/CLAUDE.md`, `server/CLAUDE.md`) in addition to the root one?
> **A**: No. A single root CLAUDE.md is the authoritative source. Per-package CLAUDE.md files create maintenance overhead (keeping them in sync) and risk contradicting the root. Domain-specific context is handled by Cursor rule files (glob-matched to directories) and Claude Code skills (loaded on demand per agent type). When a Claude Code session works in `client/`, the Master Planner or developer loads the Frontend Agent type, which adds client-specific skills — this is equivalent to a per-package CLAUDE.md but without the duplication.

> **Q**: What sections must the root CLAUDE.md contain, and in what order?
> **A**: Required sections in order: (1) Project Identity & Overview — name, one-sentence description, architecture summary. (2) Domain Boundary Warning — dev vs runtime distinction, forbidden paths. (3) Tech Stack — every technology with version constraints. (4) Coding Standards — TypeScript, BEM SCSS, MobX, NestJS, imports, naming, testing conventions. (5) Project Structure Map — annotated directory tree with workspace markers. (6) Workflow Commands — dev, build, test, lint, db commands. (7) Agent Delegation Guidelines — when to use sub-agents, scope rules, handoff format. (8) Skill Reference Index — grouped list of all skills with file paths. (9) Do-Not Rules — explicit prohibitions. The `lint-claude-md.ts` script validates that all nine sections are present.

> **Q**: Should CLAUDE.md include concrete code examples (e.g., a correct MobX store class) or just describe conventions in prose?
> **A**: Include 1-2 compact, canonical examples for the most critical patterns: one MobX store class (showing `makeObservable`, decorators, `enforceActions`), one BEM SCSS block (showing PascalCase and nesting), and one React component (showing props interface, named export, observer container). These examples are worth their token cost because they eliminate ambiguity far more effectively than prose. Limit each example to 15–20 lines. All other examples live in skill files.

> **Q**: Should there be an automated lint script that validates CLAUDE.md structure and content?
> **A**: Yes. `scripts/ai-dev/lint-claude-md.ts` runs in CI and checks: (1) all nine required sections are present (by heading match), (2) token count is within the 8,000-token budget, (3) no runtime config references have leaked in (no mentions of `server/src/modules/agent/prompts/` in imperative form), (4) the skill reference index lists only files that actually exist, (5) the directory tree matches the actual project structure (warning, not error, for minor drift). The script outputs a pass/fail report per check.

> **Q**: How detailed should the third-party library preferences section be? Should it list every approved package or just the key ones?
> **A**: List the key decision points — packages where there's a clear "use this, not that" choice. Examples: "Use `date-fns` not `moment.js` (tree-shakeable, smaller)", "Use `zod` for runtime validation", "Use `dnd-kit` not `react-beautiful-dnd` (actively maintained)". Don't enumerate every dependency in `package.json` — that's redundant with the lock file. Focus on choices where the AI might pick the wrong library. Target 10–15 explicit library preferences with one-line rationale each.

> **Q**: How does a developer know the root CLAUDE.md exists and what it does? What if they skip it?
> **A**: Claude Code automatically loads root CLAUDE.md when working in the project directory — no developer action required. For Cursor, the always-on rules reference CLAUDE.md conventions so the guidance is consistent. The onboarding guide (`docs/ai-dev/ONBOARDING.md`) explains the config system and lists CLAUDE.md as step 3. The `README.md` at the project root mentions: "This project uses AI development configuration. See `CLAUDE.md` and `docs/ai-dev/` for details." Developers who skip it still get guidance via Cursor rules.

---

## 3. Cursor Rules Configuration

Cursor rule files (`.cursor/rules/*.md`) provide context-aware guidance to
Cursor's AI features. Each rule file targets a specific domain and activates
based on glob patterns matching the files being edited.

### 3.1 Rule File Infrastructure

- [ ] **DEV-AI-041**: Create `.cursor/rules/` directory structure
  - Flat directory (no subdirectories) — Cursor scans `.cursor/rules/` for `.md` files
  - Each file covers one domain or concern
  - `_README.md` file explaining the system (prefixed with underscore to sort first)
- [ ] **DEV-AI-042**: Define rule file template structure
  - Every rule file follows this structure:
    ```
    ---
    description: One-line description of what this rule covers
    globs: ["glob/pattern/**/*.ext"]
    alwaysApply: false
    ---
    # Rule Title
    ## Context (what this rule covers and when it activates)
    ## Conventions (the rules to follow)
    ## Examples (correct patterns)
    ## Anti-patterns (incorrect patterns to avoid)
    ```
  - `alwaysApply: true` for rules that should be active on every file
  - `globs` for rules that activate only on matching file paths
- [ ] **DEV-AI-043**: Document rule file precedence and layering
  - Always-on rules provide the base layer (project-wide conventions)
  - Glob-triggered rules add domain-specific conventions on top
  - If rules conflict, the more specific rule wins (glob-triggered over always-on)
  - Document this in `_README.md`

### 3.2 Always-On Rules

- [ ] **DEV-AI-044**: Create `project-structure.md` rule (always on)
  - `alwaysApply: true`
  - Monorepo layout, workspace boundaries, where things go
  - Package naming: `@kg/client`, `@kg/server`, `@kg/shared`
  - Import rules: how to import across workspaces (`@kg/shared/...`)
  - Directory creation rules: check project structure plan before creating new directories
  - **Sandboxing note**: "Development AI config lives at root level. Application runtime config lives in `server/src/modules/agent/`."
- [ ] **DEV-AI-045**: Create `coding-standards.md` rule (always on)
  - `alwaysApply: true`
  - TypeScript strict mode, no `any`, prefer `interface`
  - Import ordering convention
  - File naming conventions
  - Error handling patterns
  - Logging conventions
  - Comment style: only non-obvious intent, no narration
- [ ] **DEV-AI-046**: Create `git-workflow.md` rule (always on)
  - `alwaysApply: true`
  - Branch naming: `feature/{ticket-id}-{short-description}`, `fix/{ticket-id}-{short-description}`, `chore/{description}`
  - Commit message format: `type(scope): description` (conventional commits)
  - Types: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `style`, `perf`
  - PR title matches commit message format
  - Keep PRs small and focused — one feature/fix per PR
  - Always include tests in PRs that change behavior

### 3.3 Frontend Domain Rules

- [ ] **DEV-AI-047**: Create `frontend-components.md` rule
  - Glob: `client/ui/src/components/**/*.{ts,tsx}`
  - Props-driven component design
  - Named exports, no default exports
  - Props interface: `{ComponentName}Props`, exported
  - File structure: directory per component with `index.ts`, `.tsx`, `.module.scss`, `.test.tsx`
  - No direct store access in leaf components — receive data via props
  - `observer()` only on container components
  - Include concrete example of a correct component file
- [ ] **DEV-AI-048**: Create `frontend-styling.md` rule
  - Glob: `client/ui/src/**/*.scss`
  - BEM convention: `.PascalCase { &__Item { } &--prop { } }`
  - Single-level nesting only — never nest `&__Item` inside `&__Item`
  - Use CSS custom properties for theming (not SCSS variables for runtime values)
  - SCSS variables only for compile-time constants (breakpoints, z-indices)
  - No `!important` unless overriding third-party styles (with comment)
  - Include correct and incorrect nesting examples
- [ ] **DEV-AI-049**: Create `frontend-state.md` rule
  - Glob: `client/ui/src/store/**/*.ts`
  - MobX class stores with `makeObservable` in constructor
  - Decorator usage: `@observable`, `@computed`, `@action`, `@action.bound`
  - `enforceActions: 'always'` — never mutate state outside actions
  - Store categories: `domain/` (entities, business logic), `session/` (auth, user preferences), `ui/` (transient UI state like modals, selections)
  - `RootStore` pattern with `createRootStore()` factory
  - Stores hold no React references — they are pure TypeScript classes
  - Include concrete store class example with constructor, observables, computeds, actions
- [ ] **DEV-AI-050**: Create `frontend-hooks.md` rule
  - Glob: `client/ui/src/hooks/**/*.ts`
  - Naming: `use{HookName}` — always camelCase with `use` prefix
  - Each hook in its own file: `use{HookName}.ts`
  - Hooks should be composable and reusable
  - No business logic in hooks — delegate to stores or utility functions
  - Include test file: `use{HookName}.test.ts`
- [ ] **DEV-AI-051**: Create `frontend-services.md` rule
  - Glob: `client/ui/src/services/**/*.ts`
  - API service modules: one per backend module (e.g., `auth.service.ts`, `spec.service.ts`)
  - Use a shared `httpClient` instance (configured with base URL, auth interceptors)
  - Return typed responses matching `@kg/shared` DTOs
  - Error handling: throw typed errors that components/stores can catch
  - No direct `fetch()` calls outside service modules
- [ ] **DEV-AI-052**: Create `frontend-tiptap.md` rule
  - Glob: `client/ui/src/components/**/editor/**/*.{ts,tsx}`, `client/ui/src/components/**/*Editor*.{ts,tsx}`
  - TipTap editor configuration patterns
  - Custom extension creation conventions
  - Editor state management (separate from MobX stores)
  - Toolbar command patterns
  - Content serialization/deserialization (to/from knowledge graph spec format)
- [ ] **DEV-AI-053**: Create `frontend-virtual-list.md` rule
  - Glob: `client/ui/src/components/**/*List*.{ts,tsx}`, `client/ui/src/components/**/*Virtual*.{ts,tsx}`
  - `@tanstack/virtual` usage patterns
  - Row height estimation, dynamic sizing
  - Scroll restoration patterns
  - Keyboard navigation within virtualized lists

### 3.4 Server Domain Rules

- [ ] **DEV-AI-054**: Create `server-architecture.md` rule
  - Glob: `server/src/**/*.ts`
  - NestJS module pattern: module → controller → service → repository
  - Dependency injection via constructor (no property injection)
  - Module registration in `AppModule`
  - ESM import/export (no CommonJS `require`)
  - Error handling: throw `HttpException` subclasses from controllers, throw domain errors from services
  - Logging: use NestJS `Logger` service, never `console.log`
- [ ] **DEV-AI-055**: Create `server-api.md` rule
  - Glob: `server/src/**/*.controller.ts`, `server/src/**/dto/**/*.ts`
  - REST endpoint conventions: resource-oriented URLs, proper HTTP methods
  - DTO pattern: `Create{Resource}Dto`, `Update{Resource}Dto`, `{Resource}ResponseDto`
  - Validation: `class-validator` decorators on all DTO fields
  - Swagger: `@ApiTags`, `@ApiOperation`, `@ApiResponse` on every endpoint
  - Response format: consistent envelope with `data`, `meta`, and `error` fields
  - Pagination: `?page=1&limit=20` with `PaginatedResponseDto`
- [ ] **DEV-AI-056**: Create `server-auth.md` rule
  - Glob: `server/src/modules/auth/**/*.ts`, `server/src/**/*.guard.ts`
  - JWT http-only cookies for authentication
  - `@UseGuards(AuthGuard)` on protected endpoints
  - Role-based access: `@Roles('admin', 'editor')` decorator
  - Password hashing: bcrypt with configurable salt rounds
  - Token refresh pattern
  - No secrets in code — all from environment variables
- [ ] **DEV-AI-057**: Create `server-websocket.md` rule
  - Glob: `server/src/**/*.gateway.ts`, `server/src/**/ws/**/*.ts`
  - WebSocket gateway patterns using NestJS `@WebSocketGateway`
  - Event naming: `{domain}:{action}` (e.g., `spec:updated`, `graph:changed`)
  - Room/namespace conventions for project isolation
  - Authentication on WebSocket connections
  - Reconnection handling and state recovery

### 3.5 Database Domain Rules

- [ ] **DEV-AI-058**: Create `database.md` rule
  - Glob: `server/src/**/*schema*.ts`, `server/src/**/*migration*.ts`, `server/src/db/**/*.ts`
  - Drizzle ORM schema definitions in `server/src/db/schema/`
  - One schema file per domain entity
  - Use Drizzle's type-safe query builder, not raw SQL (except for complex queries)
  - Migration files: timestamped, descriptive, reversible
  - Index strategy: index all foreign keys, frequently queried columns, and unique constraints
  - Naming: snake_case for database tables and columns, camelCase in TypeScript
  - Seed data in `server/src/db/seeds/` for development environment

### 3.6 Knowledge Graph Domain Rules

- [ ] **DEV-AI-059**: Create `knowledge-graph.md` rule
  - Glob: `knowledge-graph/**/*.{ts,json}`, `server/src/modules/knowledge-graph/**/*.ts`
  - JSON file structure for specs: `{ id, title, content, metadata, edges }`
  - Directory structure: `knowledge-graph/{project-id}/specs/`, `knowledge-graph/{project-id}/edges/`
  - Git commit conventions for knowledge graph changes: `kg(project): action — description`
  - File naming: spec files named by ID (`{spec-id}.json`), human-readable directory names
  - Validation: all specs must conform to the spec schema, all edges must reference valid specs
  - **Sandboxing note**: "This rule is for DEVELOPING the knowledge graph module. The knowledge graph data in `knowledge-graph/` is runtime data operated on by the APPLICATION's agents."

### 3.7 Testing Domain Rules

- [ ] **DEV-AI-060**: Create `testing.md` rule
  - Glob: `**/*.test.{ts,tsx}`, `**/__fixtures__/**/*.ts`
  - `bun test` as the runner — do not use Jest or Vitest APIs
  - `@testing-library/react` for component tests (render, screen, userEvent)
  - Test structure: `describe` → `it` with descriptive verb-starting names
  - Arrange-Act-Assert pattern
  - Test factories in `__fixtures__/` for reusable test data
  - No mocking of internal modules — use dependency injection
  - Mock only external boundaries (HTTP, database, file system)
  - Playwright for E2E tests in `e2e/` directory
  - E2E naming: `{feature}.e2e.test.ts`

### 3.8 Agent System Development Rules

- [ ] **DEV-AI-061**: Create `agent-system-runtime.md` rule
  - Glob: `server/src/modules/agent/**/*.ts`, `server/src/modules/mcp-servers/**/*.ts`
  - **Explicit note**: "This rule governs how developers WRITE CODE for the application's agent system. It does NOT configure agent behavior at runtime — that is the domain of `06-AGENT-SYSTEM/04-SKILLS-CONFIG-PLAN.md`."
  - Claude Code wrapper patterns: spawning, IPC, lifecycle management
  - MCP server implementation: tool registration, parameter validation, response formatting
  - Agent session management: creation, context assembly, termination
  - CLAUDE.md template assembly: building runtime CLAUDE.md from templates + project context
  - Security constraints: sandboxing, resource limits, permission checks
  - Testing: agent integration tests use mocked Claude Code responses, not real API calls

### 3.9 Cross-Cutting Rules

- [ ] **DEV-AI-062**: Create `generative-ui.md` rule
  - Glob: `client/gen/**/*.{ts,tsx}`, `server/src/modules/generative-ui/**/*.ts`
  - Generated UI project structure: `client/gen/{user}/{project}/`
  - Iframe sandbox rules: `sandbox="allow-scripts"`, no `allow-same-origin`
  - ESM module loading for generated projects
  - Approved package whitelist enforcement
  - Template scaffolding patterns
- [ ] **DEV-AI-063**: Create `accessibility.md` rule
  - Glob: `client/ui/src/**/*.tsx`
  - ARIA attributes on interactive elements
  - Keyboard navigation: all interactions reachable via keyboard
  - Focus management: logical tab order, focus trapping in modals
  - Screen reader support: meaningful labels, live regions for dynamic content
  - Color contrast: WCAG AA minimum (4.5:1 for text, 3:1 for large text)
  - No reliance on color alone to convey information
- [ ] **DEV-AI-064**: Create `security.md` rule
  - Glob: `server/src/**/*.ts`, `client/ui/src/**/*.ts`
  - Input validation: validate all user input on the server side
  - SQL injection prevention: always use parameterized queries (Drizzle handles this)
  - XSS prevention: React handles escaping; be careful with `dangerouslySetInnerHTML`
  - CSRF protection: http-only JWT cookies + CSRF token
  - Rate limiting on authentication endpoints
  - No secrets in client-side code or git history
  - Dependency audit: `bun audit` in CI
- [ ] **DEV-AI-065**: Create `performance.md` rule
  - Glob: `client/ui/src/**/*.{ts,tsx}`
  - React.memo for expensive pure components
  - useMemo/useCallback only when there's a measured need (not by default)
  - Virtualize lists with 50+ items using `@tanstack/virtual`
  - Lazy load routes and heavy components
  - Image optimization: WebP format, responsive sizes
  - Bundle size awareness: check import cost before adding dependencies

### 3.10 Rule Validation & Maintenance

- [ ] **DEV-AI-066**: Create `scripts/ai-dev/validate-cursor-rules.ts`
  - Verify every rule file has the required frontmatter (`description`, `globs` or `alwaysApply`)
  - Verify glob patterns are syntactically valid
  - Verify no two rule files have identical globs (potential conflict)
  - Verify all rule files follow the template structure
  - Report warnings for rule files that haven't been updated in 90+ days
- [ ] **DEV-AI-067**: Create a Cursor rules coverage report
  - Map all project file paths to matching rules
  - Identify directories/file types with NO matching rules (coverage gaps)
  - Generate a table: directory → rules that apply
  - Run as an on-demand script: `bun scripts/ai-dev/cursor-rules-coverage.ts`
- [ ] **DEV-AI-068**: Document the rule creation process
  - Step-by-step guide in `_README.md`: how to create a new rule file
  - Checklist: choose domain, define globs, write conventions, add examples, add anti-patterns
  - Review process: new rule files require a review from one other developer
- [ ] **DEV-AI-069**: Create rule file integration tests
  - For each rule file, validate that the examples in the rule are syntactically valid code
  - Validate that anti-patterns are actually caught by ESLint rules where applicable
  - Run as part of the AI config CI step

#### Design Decisions

> **Q**: How many rule files is too many? What is the context window impact of having 20+ rule files?
> **A**: The rule file count itself doesn't matter because Cursor only loads rules matching the active file's glob pattern (plus always-on rules). The real constraint is the combined token count of simultaneously active rules. Target: max 3 always-on rules (under 2,000 tokens total) plus max 3 domain rules triggered simultaneously (under 3,000 tokens total). The plan defines ~25 rule files, but at most 4-6 are active at any given time. The `measure-context-budget.ts` script validates per-file and per-combination token counts.

> **Q**: Should rules be auto-generated from code analysis or hand-written?
> **A**: Hand-written with machine-assisted review. Rules encode intentional conventions — they reflect what the code SHOULD look like, not what it currently looks like. Auto-generating from code analysis would codify existing patterns including bad ones. The drift detection script (`detect-config-drift.ts`) helps identify when code and rules diverge, but a human decides whether to update the rule or fix the code. The only auto-generated artifact is the coverage report (which directories have matching rules).

> **Q**: How do we handle conflicting rules between files? What if `frontend-components.md` and `frontend-state.md` give contradictory guidance for a file that matches both globs?
> **A**: Specificity wins. Glob-triggered rules override always-on rules. Among glob-triggered rules, the rule whose glob more specifically matches the current file wins. If two rules have equally specific globs and truly conflict, that's a bug — the `validate-cursor-rules.ts` script checks for overlapping globs and flags them for manual resolution. In practice, rules are designed for non-overlapping domains: `frontend-components.md` governs component structure, `frontend-state.md` governs store patterns. A component file matches the component rule; a store file matches the state rule. Both should never apply contradictory instructions to the same file.

> **Q**: Should rules include negative examples (anti-patterns)? These consume tokens but prevent common mistakes.
> **A**: Yes, but limited: max 3 anti-patterns per rule file. Anti-patterns are extremely effective at preventing recurring mistakes (e.g., nesting `&__Item` inside `&__Item` in BEM, using `any` instead of `unknown`, importing stores directly in leaf components). Each anti-pattern is a short code snippet (3-5 lines) with a one-line explanation of why it's wrong and the correct alternative. The token cost is ~100-150 tokens per anti-pattern — worth it for the error prevention. Rules for mature, well-understood domains can skip anti-patterns.

> **Q**: What glob patterns should each rule use for activation? Should they be broad (entire directories) or narrow (specific file types)?
> **A**: As narrow as practical to minimize false activation. Use file extension filters: `client/ui/src/components/**/*.{ts,tsx}` instead of `client/ui/src/components/**/*`. Use directory depth: `server/src/**/*.controller.ts` for API rules, not `server/**/*.ts`. The plan's rule definitions already specify appropriate globs per task. Cross-cutting rules (accessibility, security, performance) use broader globs (`client/ui/src/**/*.tsx`, `server/src/**/*.ts`) because they apply to the full domain. The `validate-cursor-rules.ts` script verifies all globs are syntactically valid.

> **Q**: What is the exact frontmatter format and which fields are required?
> **A**: Every rule file uses YAML frontmatter with three fields: `description` (required, one-line string), `globs` (required unless `alwaysApply: true`, array of glob strings), and `alwaysApply` (required, boolean, default `false`). A rule file has either `globs` or `alwaysApply: true`, never both. The `validate-cursor-rules.ts` script checks: frontmatter is parseable YAML, required fields are present, `globs` patterns are valid, and no file has both `globs` and `alwaysApply: true`.

> **Q**: How large should individual rule files be? Is there a per-file token budget?
> **A**: Target under 800 tokens per rule file. Always-on rules should be under 600 tokens (they load on every file). Domain rules can be up to 1,000 tokens for complex domains (frontend-components, server-api). If a rule exceeds its budget, extract examples into a referenced skill file and link from the rule: "For full component creation steps, use the create-component skill." The `measure-context-budget.ts` script measures each file and flags overages.

> **Q**: How are rule files updated when conventions change? Is there a deprecation mechanism?
> **A**: When a convention changes: (1) update the rule file content, (2) add a changelog entry in `docs/ai-dev/CHANGELOG.md`, (3) increment the config version in the rule file's header comment. For deprecated conventions that are being phased out, add a comment `<!-- DEPRECATED: Use X instead. Remove after YYYY-MM-DD -->` inside the rule file. The drift detection script flags code still following the deprecated pattern. After all code is migrated, remove the deprecated section and update the changelog.

> **Q**: Can we test that rule files actually produce the desired behavior when Cursor uses them?
> **A**: Indirectly. Direct behavioral testing of Cursor's AI responses is not feasible (non-deterministic). Instead: (1) validate that code examples in rule files compile (`test-config-examples.ts` extracts and compiles them), (2) validate that anti-patterns are caught by ESLint where applicable, (3) run periodic end-to-end config tests that invoke skills in a sandbox project and verify output matches conventions, (4) track developer feedback — if a rule consistently produces wrong code, it needs revision. The health check aggregates all these signals.

---

## 4. Claude Code Skills for Development

Skills files provide step-by-step instructions for Claude Code to perform
specific development tasks. Each skill is a focused, self-contained guide
that Claude Code can follow autonomously.

### 4.1 Skill File Infrastructure

- [ ] **DEV-AI-070**: Define the canonical skill file template
  - Header: skill name, description, when to use
  - Prerequisites: what must be true before running the skill
  - Steps: numbered, concrete, actionable
  - File templates: exact file contents to create/modify (with placeholders)
  - Validation: how to verify the skill was executed correctly
  - References: links to relevant plan tasks, rule files, and documentation
- [ ] **DEV-AI-071**: Create a skill index file (`skills/INDEX.md`)
  - List all available skills with one-line descriptions
  - Group by domain: frontend, server, database, knowledge-graph, testing, meta
  - Include file paths for each skill
  - This file is referenced from the root `CLAUDE.md`
- [ ] **DEV-AI-072**: Define skill file size guidelines
  - Target: under 4,000 tokens per skill (leaves room in context window)
  - If a skill exceeds this, split into sub-skills that reference each other
  - Complex workflows (like full-stack feature addition) are orchestration skills that reference sub-skills

### 4.2 Component Creation Skill

- [ ] **DEV-AI-073**: Create `skill-create-component.md`
  - Input: component name, component type (leaf/container), domain area
  - Steps:
    1. Create directory `client/ui/src/components/{domain}/{ComponentName}/`
    2. Create `index.ts` with named re-export
    3. Create `{ComponentName}.tsx` with props interface, function body, BEM class usage
    4. Create `{ComponentName}.module.scss` with BEM structure
    5. Create `{ComponentName}.test.tsx` with render test, props test
    6. If container: add `observer()` wrapper, import store from `RootStore`
    7. Export from parent `index.ts` barrel
  - Include file templates for each file type
  - Validation: component renders, test passes, lint passes
- [ ] **DEV-AI-074**: Add variant templates to component creation skill
  - Template for form component (with `onChange`, validation, error display)
  - Template for list component (with virtualization hook-up)
  - Template for modal component (with portal, focus trap, escape handling)
  - Template for layout component (with responsive breakpoints)

### 4.3 Store Creation Skill

- [ ] **DEV-AI-075**: Create `skill-create-store.md`
  - Input: store name, store category (domain/session/ui), related entities
  - Steps:
    1. Create `client/ui/src/store/{category}/{StoreName}.store.ts`
    2. Define class with `@observable` properties, `@computed` getters, `@action` methods
    3. Add `makeObservable(this)` call in constructor
    4. Register in `RootStore`: add property, instantiate in constructor
    5. Create `{StoreName}.store.test.ts` with action tests, computed tests
    6. Export types from store (for component props typing)
  - Include store class template with all decorator patterns
  - Validation: store instantiates, actions modify state, computeds derive correctly

### 4.4 API Endpoint Creation Skill

- [ ] **DEV-AI-076**: Create `skill-create-api-endpoint.md`
  - Input: resource name, HTTP method, URL path, request/response shape
  - Steps:
    1. Create or update `server/src/modules/{module}/{module}.controller.ts`
    2. Add method with `@Get`/`@Post`/`@Put`/`@Delete`/`@Patch` decorator
    3. Create request DTO in `dto/` with `class-validator` decorators
    4. Create response DTO in `dto/`
    5. Add service method in `{module}.service.ts`
    6. Add Swagger decorators: `@ApiOperation`, `@ApiResponse`, `@ApiTags`
    7. Add guard if endpoint requires auth: `@UseGuards(AuthGuard)`
    8. Create controller test and service test
    9. Update shared types in `packages/shared/` if types cross the frontend/server boundary
  - Include DTO template, controller method template, service method template
  - Validation: endpoint responds, DTO validation works, Swagger docs render

### 4.5 Migration Creation Skill

- [ ] **DEV-AI-077**: Create `skill-create-migration.md`
  - Input: migration description, schema changes
  - Steps:
    1. Update Drizzle schema file in `server/src/db/schema/`
    2. Run `bun drizzle-kit generate` to create migration SQL
    3. Review generated SQL for correctness
    4. Add rollback logic if the migration is non-trivial
    5. Create seed data update if new tables/columns need development data
    6. Run `bun db:migrate` to apply
    7. Run `bun test` to verify no regressions
  - Include schema definition examples (columns, indices, foreign keys, enums)
  - Validation: migration applies cleanly, rollback works, tests pass

### 4.6 MCP Tool Creation Skill

- [ ] **DEV-AI-078**: Create `skill-create-mcp-tool.md`
  - **Explicit note**: "This skill helps developers CREATE MCP tools for the application's agent system. The resulting tool is part of the runtime application, not a development tool."
  - Input: tool name, tool description, parameters, return type
  - Steps:
    1. Identify the target MCP server in `server/src/modules/mcp-servers/`
    2. Add tool definition with name, description, input schema (JSON Schema)
    3. Implement tool handler with parameter validation
    4. Add permission checks (does the agent session have access?)
    5. Add error handling and structured error responses
    6. Create integration test with mocked dependencies
    7. Update the MCP server's tool manifest
    8. Update runtime CLAUDE.md templates to document the new tool
  - Include tool definition template, handler template, test template
  - Validation: tool registers, parameters validate, handler executes, test passes

### 4.7 Test Creation Skill

- [ ] **DEV-AI-079**: Create `skill-create-test.md`
  - Input: target file to test, test type (unit/integration/e2e)
  - Steps for unit tests:
    1. Create `{TargetFile}.test.ts` colocated with source
    2. Import the module under test
    3. Write `describe` block named after the module
    4. Write `it` blocks for each behavior (happy path, edge cases, error cases)
    5. Use test factories from `__fixtures__/` for data
    6. Run `bun test {file}` to verify
  - Steps for integration tests:
    1. Create test in `server/test/integration/`
    2. Set up test database and fixtures
    3. Test the full request/response cycle
    4. Clean up test data
  - Steps for E2E tests:
    1. Create `e2e/{feature}.e2e.test.ts`
    2. Use Playwright to navigate, interact, and assert
    3. Set up test user and test data
    4. Clean up after test
  - Include templates for each test type
  - Validation: test passes, covers the intended behavior

### 4.8 Knowledge Graph Operations Skill

- [ ] **DEV-AI-080**: Create `skill-kg-operations.md`
  - **Explicit note**: "This skill helps developers work on the knowledge graph MODULE CODE. It does not operate on knowledge graph data directly — that is done by the application's runtime agents."
  - Covers: spec CRUD service implementation, edge management, graph traversal algorithms
  - Steps for adding a new KG operation:
    1. Define the operation interface in `packages/shared/`
    2. Implement in `server/src/modules/knowledge-graph/`
    3. Add file I/O logic (read/write JSON, git commit)
    4. Add validation (schema conformance, referential integrity)
    5. Expose via REST endpoint and/or MCP tool
    6. Add tests: unit test for logic, integration test for file I/O
  - Include JSON schema examples for specs and edges

### 4.9 Full-Stack Feature Addition Skill

- [ ] **DEV-AI-081**: Create `skill-add-feature.md`
  - Orchestration skill that references sub-skills in sequence
  - Input: feature name, feature description, affected domains
  - Steps:
    1. Plan: identify all files to create/modify, dependencies, test coverage
    2. Shared types: define DTOs and interfaces in `packages/shared/`
    3. Database: schema changes + migration (→ `skill-create-migration.md`)
    4. Server: API endpoints + services (→ `skill-create-api-endpoint.md`)
    5. Store: MobX store for the feature (→ `skill-create-store.md`)
    6. Components: UI components (→ `skill-create-component.md`)
    7. Integration: wire store to API service, wire components to store
    8. Tests: unit, integration, and E2E (→ `skill-create-test.md`)
    9. Documentation: update relevant plan task checkboxes
  - Validation: full vertical slice works end-to-end
- [ ] **DEV-AI-082**: Create feature addition dependency checklist
  - Pre-flight checks: are shared types defined? Is the database schema in place?
  - Intermediate checks: does the API endpoint respond? Does the store populate?
  - Final checks: does the UI render? Do tests pass? Does lint pass?

### 4.10 Debug Skill

- [ ] **DEV-AI-083**: Create `skill-debug.md`
  - Input: error description, affected file(s), reproduction steps
  - Steps:
    1. Read the error message and stack trace carefully
    2. Identify the failing module (frontend, server, database, knowledge-graph)
    3. Check recent changes (`git log --oneline -10`, `git diff`)
    4. Add targeted logging (NestJS Logger on server, console.error on client)
    5. Reproduce the issue with a minimal test case
    6. Fix the root cause (not just the symptom)
    7. Add a regression test
    8. Remove debug logging
  - Common error patterns and resolutions:
    - MobX strict mode violation → wrap mutation in `action`
    - NestJS dependency injection error → check module `providers` and `imports`
    - Drizzle query type error → check schema definition matches query
    - Knowledge graph file not found → check directory structure and file naming

### 4.11 Refactor Skill

- [ ] **DEV-AI-084**: Create `skill-refactor.md`
  - Input: what to refactor, why, scope boundaries
  - Steps:
    1. Ensure all existing tests pass (baseline)
    2. Identify all consumers of the code being refactored (grep for imports/usage)
    3. Make the change incrementally (one file at a time when possible)
    4. Run tests after each incremental change
    5. Update imports and references in all consumers
    6. Update any affected type definitions in `packages/shared/`
    7. Run full test suite
    8. Update documentation and AI config if conventions changed
  - Safe refactoring patterns: rename, extract function, extract component, move file, change interface (with adapter)
  - Validation: all tests pass, no lint errors, no runtime regressions

### 4.12 Config Update Skill

- [ ] **DEV-AI-085**: Create `skill-update-config.md`
  - Self-referential: this skill describes how to update the AI development configuration itself
  - Input: what changed in the project that requires a config update
  - Steps:
    1. Identify which config files are affected (CLAUDE.md, Cursor rules, skills)
    2. Read the current config file
    3. Make the minimum necessary change
    4. Verify the change doesn't violate the sandbox boundary
    5. Run `scripts/ai-dev/validate-sandbox.ts`
    6. Run `scripts/ai-dev/validate-cursor-rules.ts`
    7. Run `scripts/ai-dev/lint-claude-md.ts`
    8. Update the config changelog
  - Validation: all validation scripts pass, config is consistent with codebase

### 4.13 Skill Validation

- [ ] **DEV-AI-086**: Create `scripts/ai-dev/validate-skills.ts`
  - Verify every skill file has required sections: header, prerequisites, steps, validation
  - Verify file templates in skills are syntactically valid
  - Verify cross-references between skills resolve to existing files
  - Verify skill index file is up to date
- [ ] **DEV-AI-087**: Add skill validation to CI pipeline
  - Run skill validation on every PR that modifies files in the skills directory
  - Report broken cross-references, missing sections, outdated index

#### Design Decisions

> **Q**: How detailed should each skill be? Step-by-step with exact file templates vs high-level guidance?
> **A**: Step-by-step with exact file templates. Skills are the most detailed layer of the config system — they are instruction manuals, not guidelines. Each step is a numbered, concrete action: "Create file at `{path}` with the following content: [template]." Templates include placeholders (e.g., `{ComponentName}`, `{StoreName}`) that the agent fills in. High-level guidance belongs in Cursor rules; skills are for execution. A developer or agent following a skill should produce correct, convention-compliant code without needing to consult any other resource.

> **Q**: Should skills be idempotent (safe to run multiple times)?
> **A**: Yes, where possible. Skills should check preconditions before each step: "If `{ComponentName}.tsx` already exists, skip file creation" or "If the store is already registered in `RootStore`, skip registration." This prevents duplicate files, duplicate registrations, and duplicate test entries. Not all steps can be truly idempotent (e.g., creating a migration always creates a new file), but the skill should detect existing artifacts and warn rather than blindly overwrite. Idempotency makes skills safer for agents that may retry on failure.

> **Q**: How do skills handle edge cases and error recovery?
> **A**: Each skill includes a "Common Issues" section at the end listing 3-5 typical problems and their resolutions. Examples: "If `bun test` fails with a module resolution error, run `bun install` first." "If the component file already exists, check if this is a name collision and choose a different name." Skills do not attempt automatic error recovery — they report the error and suggest a fix. The agent (or developer) decides whether to apply the fix and retry. This keeps skills simple and predictable.

> **Q**: Should skills validate their output before completing?
> **A**: Yes. Every skill ends with a "Validation" section that lists checks to run after execution: "Run `bun test {file}` and verify it passes," "Run `bun lint {file}` and verify no errors," "Verify the component renders by checking the Storybook story or running the dev server." The agent executes these checks as the final steps of the skill. If validation fails, the agent reports the failure with the validation output — it does not loop and retry automatically (to prevent infinite retry loops).

> **Q**: How do we test that skills produce correct code?
> **A**: Three levels. (1) Template validation: `validate-skills.ts` extracts file templates from skill files and verifies they are syntactically valid TypeScript/SCSS/JSON. (2) Structural validation: verify skills have all required sections (header, prerequisites, steps, validation, common issues). (3) End-to-end tests: weekly, the `scripts/ai-dev/test-config-examples.ts` script runs each skill in a minimal sandbox project and verifies the output compiles, lints, and passes the skill's own validation checks. End-to-end tests are expensive (they invoke actual compilation) so they run on a schedule, not per-PR.

> **Q**: How large should individual skill files be? What is the per-skill token budget?
> **A**: Target under 4,000 tokens per skill. This leaves room in the context window for CLAUDE.md (~8,000 tokens), always-on rules (~2,000 tokens), domain rules (~1,500 tokens), and actual code. If a skill exceeds 4,000 tokens, split it into sub-skills that reference each other. Complex workflows (e.g., `skill-add-feature.md`) are orchestration skills that reference sub-skills by file path rather than inlining their content. The `measure-context-budget.ts` script tracks skill file sizes.

> **Q**: How should Claude Code skills differ from Cursor skills for the same task (e.g., "create component")?
> **A**: Same conventions and templates, different tool invocations. Claude Code skills reference `claude` CLI commands, file system operations, and sub-agent delegation. Cursor skills reference Cursor tools: `Write` for file creation, `Read` for inspection, `Shell` for running commands, `Glob` for finding files, `Grep` for searching. The convention-level content (BEM class format, store class structure, DTO validation pattern) is identical. Maintaining two versions per skill is overhead but necessary because the tools differ. The `validate-skills.ts` script checks that paired skills (Claude Code and Cursor) reference the same conventions.

> **Q**: How should skills reference each other? Inline the other skill's content or link by file path?
> **A**: Link by file path, never inline. Example: the `skill-add-feature.md` orchestration skill says "Step 4: Create server endpoint — follow `skill-create-api-endpoint.md`." The agent loads the referenced skill on demand. Inlining would blow the token budget for composite skills. The `validate-skills.ts` script verifies all cross-references resolve to existing files. The skill index (`skills/INDEX.md`) provides a master lookup table so agents can find the right skill without following chains.

> **Q**: Who writes skills, and what is the review process?
> **A**: Any developer can write a skill. New skill files are submitted as PRs and require one review from another developer. The reviewer checks: (1) the skill follows the template structure, (2) file templates compile, (3) conventions match existing rules, (4) the skill index is updated, (5) the paired Cursor skill exists (if applicable). The `skill-create-skill.md` meta-skill provides the step-by-step process for creating a new skill. Skill PRs trigger the `validate-skills.ts` CI check.

---

## 5. Cursor Skills for Development

Cursor skills use the `SKILL.md` format — a file inside a descriptively named
directory under `.cursor/skills/`. These mirror the Claude Code skills but are
adapted for Cursor's agent system and tool interface.

### 5.1 Cursor Skill Infrastructure

- [ ] **DEV-AI-088**: Define the Cursor SKILL.md template
  - Directory structure: `.cursor/skills/{skill-name}/SKILL.md`
  - Header: skill name, description, activation hint
  - Tool usage instructions: which Cursor tools to use (Read, Write, Shell, Grep, etc.)
  - Steps: numbered, tool-specific
  - File templates: same as Claude Code skills but with Cursor tool invocation format
  - Validation: same as Claude Code skills
- [ ] **DEV-AI-089**: Create `.cursor/skills/` directory structure
  - One subdirectory per skill, each containing a single `SKILL.md`
  - `_README.md` in the root explaining the system
- [ ] **DEV-AI-090**: Document differences from Claude Code skills
  - Cursor skills reference Cursor-specific tools (Read, Write, Shell, Glob, Grep, etc.)
  - Cursor skills can reference rule files (skills and rules work together)
  - Cursor skills may reference MCP tools if MCP servers are configured
  - Claude Code skills reference `claude` CLI commands and sub-agent delegation

### 5.2 Frontend Cursor Skills

- [ ] **DEV-AI-091**: Create `.cursor/skills/create-component/SKILL.md`
  - Mirror of `skill-create-component.md` adapted for Cursor
  - Use `Write` tool for file creation, `Glob` for finding related files
  - Reference `frontend-components.md` and `frontend-styling.md` rules
- [ ] **DEV-AI-092**: Create `.cursor/skills/create-store/SKILL.md`
  - Mirror of `skill-create-store.md` adapted for Cursor
  - Use `Read` tool to inspect existing stores for pattern consistency
  - Reference `frontend-state.md` rule
- [ ] **DEV-AI-093**: Create `.cursor/skills/create-hook/SKILL.md`
  - How to create a custom React hook following project conventions
  - Steps: create file, define hook, add types, add test
  - Reference `frontend-hooks.md` rule

### 5.3 Server Cursor Skills

- [ ] **DEV-AI-094**: Create `.cursor/skills/create-api-endpoint/SKILL.md`
  - Mirror of `skill-create-api-endpoint.md` adapted for Cursor
  - Use `Shell` tool to run generators if available
  - Reference `server-api.md` and `server-architecture.md` rules
- [ ] **DEV-AI-095**: Create `.cursor/skills/create-migration/SKILL.md`
  - Mirror of `skill-create-migration.md` adapted for Cursor
  - Use `Shell` tool to run `bun drizzle-kit generate`
  - Reference `database.md` rule
- [ ] **DEV-AI-096**: Create `.cursor/skills/create-module/SKILL.md`
  - How to create a new NestJS module from scratch
  - Steps: create directory, module file, controller, service, DTO directory, register in AppModule
  - Reference `server-architecture.md` rule

### 5.4 Knowledge Graph Cursor Skills

- [ ] **DEV-AI-097**: Create `.cursor/skills/kg-operations/SKILL.md`
  - Mirror of `skill-kg-operations.md` adapted for Cursor
  - **Explicit note**: "This is for developing the KG module, not for operating on KG data"
  - Reference `knowledge-graph.md` rule

### 5.5 Testing Cursor Skills

- [ ] **DEV-AI-098**: Create `.cursor/skills/create-test/SKILL.md`
  - Mirror of `skill-create-test.md` adapted for Cursor
  - Use `Shell` tool to run `bun test` for verification
  - Reference `testing.md` rule
- [ ] **DEV-AI-099**: Create `.cursor/skills/create-e2e-test/SKILL.md`
  - How to create a Playwright E2E test
  - Steps: create file, define test, add page objects, run with `bun test:e2e`
  - Include Playwright-specific patterns (selectors, waits, assertions)

### 5.6 Full-Stack Cursor Skills

- [ ] **DEV-AI-100**: Create `.cursor/skills/add-feature/SKILL.md`
  - Mirror of `skill-add-feature.md` adapted for Cursor
  - Reference sub-skills for each step
  - Use `TodoWrite` tool to track multi-step progress
- [ ] **DEV-AI-101**: Create `.cursor/skills/debug/SKILL.md`
  - Mirror of `skill-debug.md` adapted for Cursor
  - Use `Shell` tool for git operations and test runs
  - Use `Grep` tool for finding error sources
- [ ] **DEV-AI-102**: Create `.cursor/skills/refactor/SKILL.md`
  - Mirror of `skill-refactor.md` adapted for Cursor
  - Use `Grep` for finding all references before refactoring
  - Use `Shell` to run tests after each step

### 5.7 Meta Cursor Skills

- [ ] **DEV-AI-103**: Create `.cursor/skills/update-ai-config/SKILL.md`
  - Mirror of `skill-update-config.md` adapted for Cursor
  - How to update Cursor rules, skills, and CLAUDE.md
  - Use `Shell` to run validation scripts
- [ ] **DEV-AI-104**: Create `.cursor/skills/create-cursor-rule/SKILL.md`
  - How to create a new Cursor rule file
  - Steps: choose domain, define globs, write conventions, add examples, validate
  - Reference `_README.md` in `.cursor/rules/`
- [ ] **DEV-AI-105**: Create `.cursor/skills/create-skill/SKILL.md`
  - Self-referential: how to create a new Cursor skill
  - Steps: create directory, write SKILL.md, register in index, validate

### 5.8 Cursor Skill Validation

- [ ] **DEV-AI-106**: Create `scripts/ai-dev/validate-cursor-skills.ts`
  - Verify every skill directory contains a `SKILL.md` file
  - Verify SKILL.md files have required sections
  - Verify cross-references between skills and rules resolve
  - Verify the skills index is up to date
- [ ] **DEV-AI-107**: Add Cursor skill validation to CI pipeline
  - Run on every PR that modifies `.cursor/skills/`
  - Report missing skills, broken references, outdated index

---

## 6. Development Agent Types

Define focused, small-context agent types that developers invoke for specific
tasks. Each agent type carries only the context relevant to its domain,
minimizing context window usage and maximizing accuracy.

### 6.1 Agent Type Infrastructure

- [ ] **DEV-AI-108**: Define the agent type specification format
  - Each agent type is defined as a YAML or JSON config specifying:
    - `name`: human-readable agent name
    - `description`: what this agent specializes in
    - `context_directories`: which directories the agent should see
    - `context_files`: specific files always loaded (CLAUDE.md sections, rules)
    - `skills`: which skill files to load
    - `rules`: which Cursor rule files to activate
    - `system_prompt_additions`: extra instructions beyond the base CLAUDE.md
    - `capabilities`: what this agent can do
    - `limitations`: what this agent should NOT do
    - `delegation_targets`: which other agent types it can delegate to
- [ ] **DEV-AI-109**: Create `docs/ai-dev/agent-types/` directory for agent type specs
  - One file per agent type
  - Index file listing all agent types with descriptions
- [ ] **DEV-AI-110**: Document how to invoke each agent type
  - Claude Code: `claude --context {dirs} --skills {files} --system-prompt {additions}`
  - Cursor: configure workspace settings to load specific rules/skills per task
  - Both: reference the agent type spec for the correct configuration

### 6.2 Master Planner Agent

- [ ] **DEV-AI-111**: Define Master Planner Agent specification
  - Context: `plans/`, `CLAUDE.md`, `docs/`, `package.json` files across all workspaces
  - Skills: `skill-add-feature.md`, `skill-update-config.md`
  - System prompt additions: "You are the Master Planner. You decompose complex tasks into sub-agent assignments. You track progress and ensure all sub-tasks are completed."
  - Capabilities: read all plan files, create TODO lists, delegate to sub-agents, track progress
  - Limitations: does not write application code directly — delegates to domain agents
- [ ] **DEV-AI-112**: Write Master Planner task decomposition rules
  - Break task into smallest independent units
  - Identify dependencies between units
  - Assign each unit to the most specialized agent type
  - Define acceptance criteria for each unit
  - Define the integration verification step (after all units complete)
- [ ] **DEV-AI-113**: Write Master Planner progress tracking format
  - TODO list with task ID, assigned agent, status (pending/in-progress/done/failed), notes
  - Each task includes expected files to create/modify
  - Each task includes expected test coverage
  - Final integration checklist

### 6.3 Frontend Agent

- [ ] **DEV-AI-114**: Define Frontend Agent specification
  - Context: `client/ui/`, `packages/shared/src/types/`, `packages/shared/src/dto/`
  - Skills: `skill-create-component.md`, `skill-create-store.md`
  - Rules: `frontend-components.md`, `frontend-styling.md`, `frontend-state.md`, `frontend-hooks.md`, `frontend-services.md`, `accessibility.md`
  - System prompt additions: "You are the Frontend Agent. You write React components, MobX stores, BEM SCSS, and client-side tests. You NEVER modify server code."
  - Capabilities: create/modify components, stores, hooks, services, styles, client-side tests
  - Limitations: cannot modify `server/`, cannot modify `knowledge-graph/`, cannot create database migrations
- [ ] **DEV-AI-115**: Write Frontend Agent coding checklist
  - Every component has a props interface
  - Every container component uses `observer()`
  - Every SCSS file uses BEM with PascalCase
  - Every component has at least a render test
  - No direct store imports in leaf components
- [ ] **DEV-AI-116**: Define Frontend Agent handoff format
  - When delegating TO Frontend Agent: provide component name, props shape, data source (store or API), visual requirements
  - When Frontend Agent completes: list created/modified files, test results, screenshots if applicable

### 6.4 Server Agent

- [ ] **DEV-AI-117**: Define Server Agent specification
  - Context: `server/`, `packages/shared/`
  - Skills: `skill-create-api-endpoint.md`, `skill-create-migration.md`
  - Rules: `server-architecture.md`, `server-api.md`, `server-auth.md`, `server-websocket.md`, `database.md`
  - System prompt additions: "You are the Server Agent. You write NestJS modules, services, controllers, DTOs, Drizzle schemas, and server-side tests. You NEVER modify client code."
  - Capabilities: create/modify modules, services, controllers, DTOs, guards, migrations, server tests
  - Limitations: cannot modify `client/`, cannot modify `knowledge-graph/` data files directly
- [ ] **DEV-AI-118**: Write Server Agent coding checklist
  - Every endpoint has DTOs with validation decorators
  - Every endpoint has Swagger documentation
  - Every service method is tested
  - Every controller method has a guard if it requires auth
  - All errors throw typed exceptions
- [ ] **DEV-AI-119**: Define Server Agent handoff format
  - When delegating TO Server Agent: provide endpoint spec (method, URL, request/response shapes), business rules, auth requirements
  - When Server Agent completes: list created/modified files, test results, Swagger endpoint URL

### 6.5 Knowledge Graph Agent (Dev)

- [ ] **DEV-AI-120**: Define Knowledge Graph Agent (Dev) specification
  - **Explicit note**: "This is the DEVELOPMENT agent for working on the knowledge graph MODULE CODE. It is NOT the runtime Knowledge Graph Agent that operates on user data."
  - Context: `knowledge-graph/`, `server/src/modules/knowledge-graph/`, `packages/shared/src/types/kg/`
  - Skills: `skill-kg-operations.md`
  - Rules: `knowledge-graph.md`
  - System prompt additions: "You are the Knowledge Graph Development Agent. You write code for the KG module — spec CRUD, edge management, graph algorithms, file I/O, git integration. You do NOT operate on user knowledge data."
  - Capabilities: create/modify KG module code, schemas, validation, git integration logic, KG-related tests
  - Limitations: does not modify actual knowledge graph data, does not modify runtime agent config
- [ ] **DEV-AI-121**: Write KG Dev Agent operational boundaries
  - Can modify: `server/src/modules/knowledge-graph/**/*.ts`, `packages/shared/src/types/kg/**/*.ts`
  - Can read (for reference): `knowledge-graph/` sample data structures
  - Cannot modify: `knowledge-graph/**/*.json` (runtime data), `server/src/modules/agent/` (runtime agent config)

### 6.6 Testing Agent

- [ ] **DEV-AI-122**: Define Testing Agent specification
  - Context: `**/*.test.{ts,tsx}`, `e2e/`, `__fixtures__/`, test configuration files
  - Skills: `skill-create-test.md`
  - Rules: `testing.md`
  - System prompt additions: "You are the Testing Agent. You write and fix tests across all packages. You ensure test coverage for new and existing code."
  - Capabilities: create/modify test files, fixtures, E2E tests, analyze coverage
  - Limitations: does not modify application code (only test code), suggests fixes but delegates implementation
- [ ] **DEV-AI-123**: Write Testing Agent coverage standards
  - Unit test coverage target: 80%+ for business logic, 60%+ for UI components
  - Integration test coverage: every API endpoint, every database query
  - E2E test coverage: every critical user flow (auth, CRUD, search, agent interaction)
  - All new features must include tests — no exceptions

### 6.7 Database Agent

- [ ] **DEV-AI-124**: Define Database Agent specification
  - Context: `server/src/db/`, `server/src/modules/**/schema/`, migration files
  - Skills: `skill-create-migration.md`
  - Rules: `database.md`
  - System prompt additions: "You are the Database Agent. You manage Drizzle ORM schemas, migrations, seed data, and database-related tests."
  - Capabilities: create/modify schemas, migrations, seeds, database tests, index optimization
  - Limitations: does not modify application logic, does not modify API endpoints (only the database layer)
- [ ] **DEV-AI-125**: Write Database Agent schema review checklist
  - All tables have a primary key
  - All foreign keys have corresponding indices
  - All columns have appropriate types and constraints (nullable, default, unique)
  - All enum types are defined as Drizzle enums or TypeScript union types
  - Migration is reversible (has a down migration)
  - Seed data is consistent with constraints

### 6.8 App Agent System Agent

- [ ] **DEV-AI-126**: Define App Agent System Agent specification
  - **Explicit note**: "This agent helps developers WRITE CODE for the application's agent system. It works on the Claude Code wrapper, MCP servers, runtime skills, and runtime CLAUDE.md templates. It does NOT run or configure agents at runtime."
  - Context: `server/src/modules/agent/`, `server/src/modules/mcp-servers/`, `packages/shared/src/types/agent/`
  - Skills: `skill-create-mcp-tool.md`
  - Rules: `agent-system-runtime.md`
  - System prompt additions: "You are the App Agent System Agent. You write code for the application's Claude Code wrapper, MCP servers, agent session management, and runtime configuration. You are a DEVELOPER tool, not a runtime agent."
  - Capabilities: create/modify agent module code, MCP server implementations, runtime prompt templates, agent integration tests
  - Limitations: does not modify dev-time AI config (CLAUDE.md, Cursor rules, dev skills), does not invoke Claude Code API directly
- [ ] **DEV-AI-127**: Write App Agent System Agent boundary enforcement
  - Allowed paths: `server/src/modules/agent/**`, `server/src/modules/mcp-servers/**`
  - Forbidden paths: `.claude/`, `.cursor/rules/`, root `CLAUDE.md`, `.cursor/skills/`
  - If a task requires both dev config and runtime agent config, it MUST be split between this agent and the Documentation Agent or Config Update skill

### 6.9 Styling Agent

- [ ] **DEV-AI-128**: Define Styling Agent specification
  - Context: `client/ui/src/**/*.scss`, `client/ui/src/styles/`, design token files
  - Skills: (minimal — styling work is guided by rules)
  - Rules: `frontend-styling.md`, `accessibility.md`
  - System prompt additions: "You are the Styling Agent. You write BEM SCSS, manage design tokens, ensure accessibility compliance, and create responsive layouts."
  - Capabilities: create/modify SCSS files, design tokens, CSS custom properties, responsive breakpoints
  - Limitations: does not modify component logic (only styles), does not modify server code
- [ ] **DEV-AI-129**: Write Styling Agent BEM enforcement checklist
  - Every class follows `.PascalCase { &__Item { } &--prop { } }`
  - No nesting beyond one level of `&__` or `&--`
  - No orphaned styles (every class is referenced by a component)
  - All colors use CSS custom properties (not hardcoded hex values)
  - All spacing uses the spacing scale (not arbitrary pixel values)

### 6.10 DevOps Agent

- [ ] **DEV-AI-130**: Define DevOps Agent specification
  - Context: `docker-compose.yml`, `Dockerfile`, `.github/workflows/`, `scripts/`, `config/`
  - Skills: (deployment-specific skills)
  - Rules: `git-workflow.md`
  - System prompt additions: "You are the DevOps Agent. You manage Docker configurations, CI/CD pipelines, deployment scripts, and infrastructure."
  - Capabilities: create/modify Docker files, CI/CD workflows, deployment scripts, environment configs
  - Limitations: does not modify application code, does not modify AI config (except CI validation steps)
- [ ] **DEV-AI-131**: Write DevOps Agent CI/CD standards
  - Every PR triggers: lint, test, build, sandbox validation
  - Docker images are multi-stage (build stage + production stage)
  - Environment variables are documented in `.env.example`
  - No secrets in CI config — use GitHub Secrets or equivalent

### 6.11 Documentation Agent

- [ ] **DEV-AI-132**: Define Documentation Agent specification
  - Context: `docs/`, `plans/`, `README.md`, `CLAUDE.md`, `.cursor/rules/_README.md`, `CONTRIBUTING.md`
  - Skills: `skill-update-config.md`
  - Rules: `coding-standards.md` (for comment/doc conventions)
  - System prompt additions: "You are the Documentation Agent. You keep README files, plan documents, AI config files, and JSDoc comments up to date."
  - Capabilities: create/modify documentation, update plan task checkboxes, update AI config files, audit config consistency
  - Limitations: does not modify application code, does not modify tests
- [ ] **DEV-AI-133**: Write Documentation Agent audit checklist
  - README is up to date with current setup instructions
  - Plan files reflect current project state
  - AI config files match actual codebase patterns
  - JSDoc comments exist for all public APIs
  - BOUNDARY.md is current

### 6.12 Agent Type Validation

- [ ] **DEV-AI-134**: Create `scripts/ai-dev/validate-agent-types.ts`
  - Verify every agent type spec has required fields
  - Verify context directories exist in the project
  - Verify referenced skills and rules exist
  - Verify no two agent types have identical context (they should be specialized)
  - Verify boundary constraints are consistent (no agent type can access forbidden paths)
- [ ] **DEV-AI-135**: Create agent type selection guide
  - Decision tree: given a task description, which agent type should handle it
  - Input: task keywords → Output: recommended agent type
  - Include examples: "Create a new component" → Frontend Agent, "Add database column" → Database Agent
  - Include multi-agent examples: "Add a full-stack feature" → Master Planner → delegates to Server + Frontend + Testing
- [ ] **DEV-AI-136**: Create agent type integration test suite
  - For each agent type, create a sample task and verify the agent can complete it
  - Test with minimal context (only the directories/files specified in the agent type)
  - Verify the agent does NOT try to access files outside its context
  - Run periodically (not on every PR — these are expensive)
- [ ] **DEV-AI-137**: Document agent type evolution process
  - How to add a new agent type
  - How to modify an existing agent type's context/skills/rules
  - How to deprecate an agent type
  - How to split an agent type that has become too broad

#### Design Decisions

> **Q**: What's the ideal context size for a focused development agent? Too small means missing needed information; too large means noise and confusion.
> **A**: The total loaded context per agent type (CLAUDE.md + always-on rules + domain rules + skill) should stay under 50% of the model's context window — roughly 100K tokens for a 200K model. In practice, the pre-loaded config context targets ~15,000 tokens: CLAUDE.md (~8K) + always-on rules (~2K) + domain rules (~2K) + active skill (~3K). The remaining context window is for code files, conversation history, and output. The `measure-context-budget.ts` script validates each agent type's total config context.

> **Q**: Should agents be able to call other agents, or only the master planner delegates?
> **A**: Only the Master Planner delegates. Development agents (Frontend, Server, Database, etc.) execute their tasks and return results. They do not invoke other agents. If a task requires multiple domains, the Master Planner decomposes it and handles delegation. This keeps the delegation tree flat (depth 1: Master Planner → domain agent) and prevents runaway cost from recursive delegation. An individual agent that discovers it needs work in another domain reports that in its result, and the Master Planner handles it in the next delegation cycle.

> **Q**: How do we handle tasks that span multiple agent domains? For example, "add a new field to the spec model" touches database, server, shared types, and frontend.
> **A**: The Master Planner decomposes the task following the dependency chain: (1) shared types first (`packages/shared/` — handled by any agent, typically Server Agent), (2) database migration (Database Agent), (3) server endpoint updates (Server Agent), (4) frontend store and component updates (Frontend Agent), (5) tests across all layers (Testing Agent or delegated per-domain). Each sub-task has explicit inputs (what the previous agent produced) and outputs. The Master Planner tracks progress and handles handoffs.

> **Q**: Should there be a "general purpose" agent for undefined tasks that don't fit any specialized type?
> **A**: No dedicated general-purpose agent type. The Master Planner itself serves as the catch-all — if a task doesn't map to a specialized agent, the Master Planner either handles it directly (for documentation, config, or planning tasks) or decomposes it further until sub-tasks map to existing agent types. Adding a general-purpose agent would undermine the specialization model. If a task category recurs and doesn't fit existing types, that's a signal to create a new agent type (per the evolution process in DEV-AI-137).

> **Q**: Some tasks naturally sit at the boundary between two agent types (e.g., a service file that involves both server architecture and database queries). How is the primary agent chosen?
> **A**: The agent type selection guide (`docs/ai-dev/agent-types/selection-guide.md`) provides a decision tree based on the primary artifact being created or modified. If the primary file is a `.service.ts` file, the Server Agent handles it — even if the service calls database queries. The Server Agent has access to the `database.md` rule via its rule set. Agent types are specialized by responsibility, not by file exclusivity. The Database Agent is reserved for schema changes, migrations, and seed data — not for every file that touches the database.

> **Q**: Should agent types have read access to files outside their primary context directories for reference?
> **A**: Yes, read access is broader than write access. The Frontend Agent's write scope is `client/ui/` but its read scope includes `packages/shared/src/types/` and `packages/shared/src/dto/` (to understand the data contracts). The Server Agent reads `packages/shared/` for the same reason. Agent type specs define both `context_directories` (read) and `writable_directories` (write). The agent can read outside its context if explicitly needed (e.g., reading a plan file for reference), but the system prompt discourages modifications outside the writable scope.

> **Q**: How do we verify that an agent type's context, skills, and rules are sufficient for its assigned tasks?
> **A**: Periodic integration tests (DEV-AI-136). For each agent type, a sample task is defined. The test invokes the agent with only its specified context (rules, skills, CLAUDE.md) and verifies: (1) the agent produces correct output, (2) the agent does not attempt to access files outside its context, (3) the output passes lint and tests. These are expensive (they invoke actual AI) so they run weekly, not per-PR. Results feed back into agent type spec refinements. The `validate-agent-types.ts` script handles the cheaper structural checks (directories exist, skills exist, no overlapping contexts) on every PR.

> **Q**: What is the process for adding a new agent type or splitting an existing one that has become too broad?
> **A**: Follow the template in `docs/ai-dev/templates/agent-type-template.md`. Steps: (1) identify the gap — what tasks are poorly served by existing types? (2) Define the new type's context directories, skills, rules, capabilities, and limitations. (3) Create the agent type spec file in `docs/ai-dev/agent-types/`. (4) Update the selection guide. (5) Update the Master Planner's knowledge of available agents. (6) Run `validate-agent-types.ts`. (7) Run the periodic integration test for the new type. For splitting an existing type, also update all Master Planner templates that reference the old type to reference the new subtypes.

---

## 7. Self-Updating Configuration (Back-feeding)

Mechanisms for detecting when AI development configuration is out of date
and triggering updates. Configuration drift — where the config describes
patterns the code no longer follows — is the second highest-risk failure
mode after sandbox violations.

### 7.1 Change Detection

- [ ] **DEV-AI-138**: Create `scripts/ai-dev/detect-config-drift.ts`
  - Compare Cursor rule file conventions against actual code patterns
  - Example: rule says "BEM with PascalCase" → scan SCSS files for non-conforming class names
  - Example: rule says "no default exports" → scan TSX files for default exports
  - Output: list of drift items with severity (info, warning, error)
- [ ] **DEV-AI-139**: Create a post-PR config review trigger
  - After a PR is merged, check if the PR changed files matching specific patterns:
    - New component pattern → flag `frontend-components.md` rule for review
    - New store pattern → flag `frontend-state.md` rule for review
    - New API pattern → flag `server-api.md` rule for review
    - New directory → flag `project-structure.md` rule for review
  - Create a GitHub issue or TODO item for the config review
- [ ] **DEV-AI-140**: Create pattern detection for new conventions
  - When a new coding pattern appears in 3+ files, flag it as a potential convention
  - Example: if 3+ components use a new error boundary pattern, suggest adding it to rules
  - Run as a periodic scan (weekly or monthly), not on every commit
- [ ] **DEV-AI-141**: Create config freshness tracking
  - Each config file has a metadata header with `last_reviewed: YYYY-MM-DD`
  - Script flags files not reviewed in 60+ days
  - Freshness report included in the periodic health check

### 7.2 Automated Update Proposals

- [ ] **DEV-AI-142**: Create a config update proposal system
  - When drift is detected, generate a proposed config change
  - Proposals are stored in `docs/ai-dev/proposals/` as markdown files
  - Each proposal includes: what changed in the code, what the config currently says, what the config should say, diff preview
  - Proposals require human review before being applied
- [ ] **DEV-AI-143**: Create Documentation Agent skill for config auditing
  - The Documentation Agent can run `detect-config-drift.ts` and generate proposals
  - Skill: `skill-audit-config.md` — steps for reviewing and updating config files
  - Agent reads drift report → generates proposals → updates config files (with human approval)
- [ ] **DEV-AI-144**: Create self-updating test for CLAUDE.md tech stack section
  - Read `package.json` files across all workspaces
  - Compare declared dependencies against the tech stack section in CLAUDE.md
  - Flag any dependencies in `package.json` not mentioned in CLAUDE.md
  - Flag any technologies in CLAUDE.md not present in `package.json`
- [ ] **DEV-AI-145**: Create self-updating test for project structure section
  - Read actual directory tree
  - Compare against the annotated directory tree in CLAUDE.md
  - Flag new directories not in the tree
  - Flag removed directories still in the tree

### 7.3 Version Tracking & Changelog

- [ ] **DEV-AI-146**: Create `docs/ai-dev/CHANGELOG.md`
  - Track every change to AI config files with date, description, and reason
  - Format: `## YYYY-MM-DD\n- [file] Description of change (reason)\n`
  - Updated manually or by the Documentation Agent when config changes are merged
- [ ] **DEV-AI-147**: Add git tagging for config milestones
  - When a major config reorganization happens, create a git tag: `ai-config-v{N}`
  - Useful for rollback if a config change causes problems
  - Tags are lightweight (no release notes — the changelog is sufficient)
- [ ] **DEV-AI-148**: Create config version header in each config file
  - Each config file includes a comment: `<!-- Config version: 1.0 | Last updated: YYYY-MM-DD -->`
  - Incremented when the file is meaningfully changed
  - Scripts can compare version numbers across files to detect inconsistencies

### 7.4 Config Health Check

- [ ] **DEV-AI-149**: Create `scripts/ai-dev/health-check.ts` — master health check script
  - Runs all validation scripts in sequence:
    1. `validate-sandbox.ts` — boundary check
    2. `validate-cursor-rules.ts` — rule file structure
    3. `validate-cursor-skills.ts` — skill file structure
    4. `validate-skills.ts` — Claude Code skills structure
    5. `validate-agent-types.ts` — agent type specs
    6. `lint-claude-md.ts` — CLAUDE.md structure and size
    7. `detect-config-drift.ts` — config vs code consistency
  - Outputs a summary report with pass/fail for each check
  - Exit code reflects whether any critical checks failed
- [ ] **DEV-AI-150**: Add health check to CI as a nightly job
  - Run the full health check nightly (not on every PR — too expensive)
  - Send a notification (Slack, email, GitHub issue) if any checks fail
  - PRs that modify config files run the health check as part of the PR checks
- [ ] **DEV-AI-151**: Create a health check dashboard
  - Simple HTML page generated by the health check script
  - Shows: last run date, pass/fail status for each check, drift items, freshness warnings
  - Served from `docs/ai-dev/health-report.html` (checked into repo, regenerated nightly)
- [ ] **DEV-AI-152**: Define config health SLA
  - All sandbox checks must pass at all times (critical)
  - All structural checks must pass at all times (critical)
  - Drift items under 5 (warning at 3, error at 5)
  - Freshness: no config file older than 90 days without review (warning at 60)

#### Design Decisions

> **Q**: How do we detect when configs are stale — i.e., the codebase has drifted from what the config describes?
> **A**: `scripts/ai-dev/detect-config-drift.ts` performs automated checks: (1) scan SCSS files for class names that don't follow the BEM PascalCase convention described in `frontend-styling.md`, (2) scan TSX files for default exports when `coding-standards.md` says named-only, (3) compare `package.json` dependencies against the tech stack section in CLAUDE.md, (4) compare the actual directory tree against the annotated tree in CLAUDE.md. Each check outputs a drift item with severity (info, warning, error). The weekly automated run produces a drift report. A config file not reviewed in 60+ days is flagged as potentially stale via the `last_reviewed` metadata.

> **Q**: Should config updates be automatic or require human review?
> **A**: Always human-reviewed. Automated tools can propose updates (stored in `docs/ai-dev/proposals/`), but no config file is auto-modified. The Documentation Agent can generate a proposal with a diff preview, but a human must review and merge the PR. This prevents config churn from false-positive drift detections and ensures conventions remain intentional. The only automated action is detection and proposal generation — application is always manual.

> **Q**: What triggers a config review? New patterns, PR merges, manual request, or a schedule?
> **A**: Four triggers: (1) Event-driven: after a PR merges that changes files matching flagged patterns (new component pattern → flag `frontend-components.md`), implemented via `scripts/ai-dev/detect-config-drift.ts` post-merge hook. (2) Periodic: weekly automated drift check, monthly full health check. (3) Manual: developer runs `bun scripts/ai-dev/health-check.ts` when they suspect drift. (4) Milestone: at each project milestone, comprehensive audit of all config files. Each trigger creates a review item in `docs/ai-dev/proposals/` or a GitHub issue.

> **Q**: How do we prevent config churn — constant updates that add noise and distract from actual development?
> **A**: Three guardrails. (1) Threshold-based proposals: the drift detector only creates a proposal when drift items exceed a threshold (3+ items of the same type). A single non-conforming file doesn't trigger a review. (2) Cooldown period: a config file updated in the last 14 days is exempt from automated review proposals. (3) Batching: weekly drift checks accumulate items and produce a single summary, not individual proposals per item. Config PRs are expected at most weekly, not daily. Major config changes are batched into a single PR.

> **Q**: How does the system detect when a new coding pattern has emerged organically and should be formalized into a rule?
> **A**: `scripts/ai-dev/detect-config-drift.ts` includes a pattern frequency scan: when a code pattern appears in 3+ files but isn't documented in any rule file, it's flagged as a "potential convention." Examples: a new error handling pattern, a new React hook pattern, a new DTO structure. These are flagged as info-level items in the weekly drift report. A human reviews whether the pattern should be formalized (add to a rule), discouraged (add as an anti-pattern), or left as-is (one-off pattern that doesn't warrant a rule).

> **Q**: How are config changes tracked for auditability?
> **A**: `docs/ai-dev/CHANGELOG.md` tracks every config change with date, file modified, description, and reason. Format: `## YYYY-MM-DD` followed by `- [file] Description (reason)`. The changelog is updated as part of every config PR — it's a required file in config PRs (the CI check verifies the changelog was updated if config files changed). Git history provides the fine-grained diff; the changelog provides the human-readable narrative. Git tags (`ai-config-v{N}`) mark major restructurings.

---

## 8. Master Planner Configuration

The Master Planner is the orchestration layer that coordinates complex,
multi-step development tasks by decomposing them and delegating to
specialized development agents.

### 8.1 Planner System Prompt

- [ ] **DEV-AI-153**: Write the Master Planner system prompt section in CLAUDE.md
  - Identity: "You are the Master Planner for the Knowledge Graph Agent System development."
  - Capability: "You decompose complex development tasks into sub-tasks and delegate to specialized agents."
  - Process: (1) understand the full task, (2) identify affected domains, (3) decompose into smallest independent units, (4) assign to agent types, (5) define acceptance criteria, (6) track and aggregate results
  - Constraints: "You do not write application code directly. You orchestrate."
- [ ] **DEV-AI-154**: Write the Master Planner skill file
  - `skill-master-planner.md` — detailed orchestration steps
  - Input: high-level task description
  - Output: task breakdown document with agent assignments, dependencies, acceptance criteria
  - Include a template for the output format

### 8.2 Task Decomposition

- [ ] **DEV-AI-155**: Define task decomposition rules
  - Every sub-task must be completable by a single agent type
  - Every sub-task must have clear input (what the agent starts with) and output (what the agent produces)
  - Sub-tasks should be 1–4 hours of human-equivalent work (right-sized for an agent)
  - Dependencies between sub-tasks must be explicit (not implicit)
  - Circular dependencies are forbidden — must be resolved by restructuring
- [ ] **DEV-AI-156**: Define task decomposition templates
  - Template for "Add Feature": shared types → database → server → frontend → tests → docs
  - Template for "Fix Bug": reproduce → diagnose → fix → test → verify
  - Template for "Refactor": baseline tests → incremental changes → verify → update docs
  - Template for "Add Config": draft → validate → review → merge → update index
- [ ] **DEV-AI-157**: Define task sizing guidelines
  - Small (1 agent, 1 step): single file edit, bug fix, add test
  - Medium (1 agent, 3–5 steps): add component, add endpoint, add migration
  - Large (2–3 agents, 5–10 steps): full-stack feature, module refactor
  - Extra-large (Master Planner + 3+ agents, 10+ steps): new domain area, architectural change

### 8.3 Sub-Agent Result Aggregation

- [ ] **DEV-AI-158**: Define result aggregation format
  - Each sub-agent returns: list of files created/modified, test results (pass/fail counts), warnings/issues encountered, open questions
  - Master Planner collects all results and produces: summary of all changes, combined test results, integration verification plan, remaining work items
- [ ] **DEV-AI-159**: Define error handling for sub-agent failures
  - If a sub-agent fails: capture the error, determine if it's recoverable
  - Recoverable: retry with adjusted instructions (add more context, simplify the task)
  - Non-recoverable: mark the sub-task as failed, determine impact on dependent tasks, report to developer
  - Never silently ignore sub-agent failures
- [ ] **DEV-AI-160**: Define integration verification steps
  - After all sub-agents complete: run full test suite
  - Verify: no type errors across workspaces (`bun build`)
  - Verify: no lint errors (`bun lint`)
  - Verify: no runtime errors (start dev server, run smoke tests)
  - If verification fails: identify the failing sub-task and re-delegate

### 8.4 Progress Reporting

- [ ] **DEV-AI-161**: Define progress reporting format
  - Real-time: as each sub-task starts/completes, update a progress document
  - Format: task table with columns: ID, description, agent, status, files touched, notes
  - Status values: pending → in-progress → done / failed / blocked
  - Include ETA estimates based on sub-task completion rate
- [ ] **DEV-AI-162**: Define progress reporting integration
  - Progress document stored in a temporary file during execution
  - After completion, archived in `docs/ai-dev/execution-logs/`
  - Developer can check progress at any time by reading the document
  - Future: integrate with a dashboard or notification system
- [ ] **DEV-AI-163**: Define the Master Planner post-mortem format
  - After a multi-agent task completes, the Master Planner produces a post-mortem
  - Contents: what was planned, what was executed, what succeeded, what failed, lessons learned
  - Used to improve future task decomposition and agent type definitions
  - Stored in `docs/ai-dev/post-mortems/`

### 8.5 Plan File Integration

- [ ] **DEV-AI-164**: Define how the Master Planner references plan files
  - The Master Planner reads `plans/` to understand the project's planned architecture
  - When decomposing a task, the planner checks if relevant plan tasks exist
  - Sub-task descriptions reference plan task IDs where applicable
  - After sub-tasks complete, the planner suggests updating plan task checkboxes
- [ ] **DEV-AI-165**: Define Master Planner escalation rules
  - If a task requires a decision not covered by plan files → escalate to developer
  - If a task contradicts existing plan files → escalate to developer
  - If a sub-agent produces output inconsistent with plan files → flag and escalate
  - Escalation format: describe the decision needed, the options, and the recommendation

#### Design Decisions

> **Q**: How does the master planner decide which sub-agent to use for each sub-task?
> **A**: The Master Planner uses the agent type selection guide (`docs/ai-dev/agent-types/selection-guide.md`) which maps task keywords and primary artifacts to agent types. The planner's system prompt includes the full agent type list with capabilities and limitations. For each sub-task, the planner identifies: (1) the primary artifact (component, endpoint, migration, test), (2) the primary directory (client, server, db), and (3) the required skills. These three signals deterministically map to an agent type. If the mapping is ambiguous, the planner uses the "closest fit" agent and notes the ambiguity in the task breakdown.

> **Q**: What happens when the master planner's task decomposition is wrong? For example, it assigns a database task to the Frontend Agent.
> **A**: Two mitigation layers. (1) Prevention: the `validate-agent-types.ts` script checks that agent type capabilities are consistent with their context directories — the Frontend Agent's spec says it cannot create migrations, so the planner should never assign one. The planner's system prompt includes these constraints. (2) Detection: if a sub-agent encounters a task outside its scope (e.g., told to modify a file in a directory it doesn't have write access to), it reports the error in its result: "Task requires modifying `server/src/db/` which is outside my writable scope." The Master Planner then reassigns the sub-task to the correct agent.

> **Q**: Should the master planner have access to all code or just the plan files?
> **A**: Plan files plus structural context, not all code. The Master Planner's context includes: `plans/` (all plan files), `CLAUDE.md`, `docs/` (documentation), `package.json` files across all workspaces (for dependency awareness), and the agent type specs. It does NOT load application source code — that's the domain agents' job. The Master Planner reasons about task structure and delegation, not about code implementation. Keeping its context focused on planning artifacts ensures it stays within its token budget and doesn't attempt to write code directly.

> **Q**: How does the master planner handle dependencies between sub-tasks? For example, the frontend store depends on shared types that the server agent creates.
> **A**: Explicit dependency chains. The Master Planner's task breakdown includes a `depends_on` field for each sub-task: `{id: "FE-1", depends_on: ["SRV-1"], ...}`. Sub-tasks are executed in topological order — a sub-task only starts after all its dependencies are marked done. If a dependency fails, dependent sub-tasks are marked "blocked" and the planner reports which tasks are affected. The standard dependency chain for full-stack features is: shared types → database → server → frontend → tests.

> **Q**: When should the master planner escalate to the human developer instead of making a decision autonomously?
> **A**: Three escalation triggers: (1) the task requires a decision not covered by plan files (e.g., "should this be a new module or part of an existing module?"), (2) the task contradicts existing plan files (e.g., "the plan says JWT auth but the task asks for session-based auth"), (3) a sub-agent fails twice on the same task after adjusted instructions. Escalation format: describe the decision needed, list the options considered, state a recommendation with reasoning, and ask the developer to choose. The planner pauses until the developer responds.

> **Q**: Should the master planner produce a post-mortem after completing a multi-agent task?
> **A**: Yes. After every multi-agent task (3+ sub-tasks), the Master Planner produces a post-mortem stored in `docs/ai-dev/post-mortems/{date}-{task-summary}.md`. Contents: planned vs actual breakdown, which sub-tasks succeeded/failed, total time and token usage, lessons learned, and suggestions for improving agent types or skills. Post-mortems are reviewed monthly to identify recurring issues and improve the config system. Single-agent tasks don't need post-mortems.

---

## 9. "Always On" Configuration Strategy

Define which configuration is always active (regardless of context) and
which is conditionally activated. The goal is to keep critical rules always
available while minimizing unnecessary context window consumption.

### 9.1 Always-On Layers

- [ ] **DEV-AI-166**: Define the "always on" rule set
  - Rules that MUST be active for every file, every session:
    - `project-structure.md` — where things go, workspace boundaries
    - `coding-standards.md` — TypeScript strictness, import order, naming
    - `git-workflow.md` — branching, commit messages, PR conventions
  - These use `alwaysApply: true` in Cursor
  - In CLAUDE.md, these are inline (not referenced via skills)
- [ ] **DEV-AI-167**: Define the always-on context budget
  - Always-on rules: target under 2,000 tokens total
  - CLAUDE.md base content (project identity, tech stack summary, workflow commands): under 3,000 tokens
  - Total always-on context: under 5,000 tokens
  - This leaves 3,000+ tokens for domain-specific rules and skills
  - Periodically measure with a token counter script
- [ ] **DEV-AI-168**: Create `scripts/ai-dev/measure-context-budget.ts`
  - Measure token count of: CLAUDE.md, each always-on rule file, each conditional rule file
  - Output: table showing each file's token count, always-on total, and per-domain totals
  - Flag files exceeding their budget
  - Use tiktoken or a similar tokenizer

### 9.2 Conditional Layers

- [ ] **DEV-AI-169**: Define domain-triggered rules
  - Activated by glob patterns when editing files in specific directories:
    - `client/ui/src/components/` → `frontend-components.md`
    - `client/ui/src/**/*.scss` → `frontend-styling.md`
    - `client/ui/src/store/` → `frontend-state.md`
    - `server/src/` → `server-architecture.md`
    - `server/src/**/*.controller.ts` → `server-api.md`
    - `server/src/db/` → `database.md`
    - `**/*.test.*` → `testing.md`
    - `server/src/modules/agent/` → `agent-system-runtime.md`
- [ ] **DEV-AI-170**: Define skill-triggered context loading
  - Skills are loaded on demand when a specific task is being performed
  - Claude Code: developer explicitly requests a skill or the Master Planner assigns one
  - Cursor: skills are loaded when the developer invokes them
  - Skills never auto-load — they are opt-in to preserve context window
- [ ] **DEV-AI-171**: Define the layered context assembly for Claude Code
  - Layer 1 (always): root CLAUDE.md content (project identity, tech stack, base conventions)
  - Layer 2 (domain): additional context based on the working directory / task domain
  - Layer 3 (skill): specific skill file loaded for the current task
  - Each layer adds to the context; layers never contradict each other
  - If layers conflict, the more specific layer wins (skill > domain > base)
- [ ] **DEV-AI-172**: Define the layered context assembly for Cursor
  - Layer 1 (always): `alwaysApply: true` rule files
  - Layer 2 (domain): glob-matched rule files based on the active file
  - Layer 3 (skill): skill loaded by the developer on demand
  - Same precedence: more specific wins

### 9.3 Context Window Optimization

- [ ] **DEV-AI-173**: Define rule file conciseness guidelines
  - Rules should state conventions directly — no lengthy explanations of WHY
  - Use bullet points, not prose
  - Include 1–2 examples (not 5–10)
  - Anti-patterns: max 3 per rule file
  - If a rule needs extensive explanation, link to a documentation page
- [ ] **DEV-AI-174**: Create rule file compression script
  - `scripts/ai-dev/compress-rules.ts`
  - Identify verbose rules (high word count relative to convention count)
  - Suggest edits to reduce token count while preserving all conventions
  - Output: per-file report with current tokens, target tokens, suggestions
- [ ] **DEV-AI-175**: Define CLAUDE.md reference strategy
  - CLAUDE.md includes brief summaries of each domain's conventions
  - Detailed conventions are in skill files, loaded on demand
  - CLAUDE.md links to skills: "For detailed component creation steps, load `skill-create-component.md`"
  - This keeps CLAUDE.md within its token budget while still being useful as a standalone reference
- [ ] **DEV-AI-176**: Create context window usage tests
  - For each agent type, calculate the total context: CLAUDE.md + always-on rules + domain rules + skill
  - Verify total is under 50% of the model's context window (leaving room for code)
  - Flag agent types that exceed the budget
  - Run as part of the health check

#### Design Decisions

> **Q**: What's the token budget for always-on rules?
> **A**: 2,000 tokens total across all always-on rule files. The three always-on rules (`project-structure.md`, `coding-standards.md`, `git-workflow.md`) share this budget — roughly 650 tokens each. This is a hard constraint because always-on rules load on every file in every session. The CLAUDE.md base content (project identity, tech stack summary, workflow commands) adds another ~3,000 tokens. Total always-on context: 5,000 tokens. The `measure-context-budget.ts` script enforces this budget and flags any rule that pushes the total over.

> **Q**: How do we measure whether always-on rules are effective? What if they're consuming tokens but not improving code quality?
> **A**: Three proxy metrics: (1) Convention compliance rate: run `detect-config-drift.ts` and measure the percentage of files conforming to always-on rule conventions (target >95%). If compliance is already high without the rules, they may be unnecessary. (2) Developer feedback: quarterly survey asking "Do the AI coding conventions match your expectations?" (3) Error rate: track how often developers need to correct AI-generated code that violates conventions. If a specific convention in an always-on rule is never violated (compliance is 100% organically), consider moving it to a domain rule to save tokens.

> **Q**: Should there be a mechanism to temporarily disable always-on rules for specific tasks?
> **A**: No explicit disable mechanism. If a task genuinely conflicts with an always-on rule (rare — always-on rules are foundational), the developer should note the exception in the prompt: "For this task, ignore the import ordering convention because we're generating a compatibility shim." The AI respects in-context instructions over rule files. Adding a formal disable mechanism risks rules being permanently disabled by accident. If a rule is frequently disabled, it should be moved to a conditional (glob-triggered) rule instead.

> **Q**: What content is essential in always-on rules vs what should be deferred to domain rules?
> **A**: Always-on rules contain only universal conventions that apply to every file type: (1) `project-structure.md`: monorepo layout, workspace boundaries, import paths, directory creation rules, dev/runtime boundary note. (2) `coding-standards.md`: TypeScript strict mode, no `any`, `interface` over `type`, import ordering, file naming, error handling patterns, logging (NestJS Logger, no `console.log`). (3) `git-workflow.md`: branch naming, commit message format, PR conventions, keep PRs small. Everything else (BEM SCSS, MobX patterns, NestJS module patterns, Drizzle conventions, test patterns) goes in domain rules triggered by glob patterns.

> **Q**: When always-on rules and domain rules provide different guidance on the same topic, which takes priority?
> **A**: The more specific rule wins. Domain rules (glob-triggered) are more specific than always-on rules. If `coding-standards.md` (always-on) says "use `interface` over `type`" but `frontend-state.md` (domain rule for stores) says "use `type` for store action parameter unions," the domain rule applies for store files. This mirrors CSS specificity: global rules provide defaults, domain rules provide overrides. Rules are written to minimize conflicts — always-on rules state universals, domain rules state domain-specific refinements.

> **Q**: How is the context budget monitored over time as rules grow?
> **A**: `scripts/ai-dev/measure-context-budget.ts` produces a token count table: each config file's token count, always-on total, per-domain totals, and per-agent-type totals (CLAUDE.md + rules + skill combined). This runs as part of the health check. Thresholds: always-on total > 2,000 tokens = error, domain total per combination > 3,000 tokens = warning, any single rule file > 1,000 tokens = warning, agent type total config > 15,000 tokens = error. The health check dashboard displays these metrics visually.

---

## 10. Configuration for Evolving Project

Define how the AI development configuration system adapts as the project
grows, new features are added, conventions change, and new domains emerge.

### 10.1 Adding New Domains

- [ ] **DEV-AI-177**: Create a template for adding a new Cursor rule file
  - Checklist: choose file name, define description, define globs, write conventions, add examples, add anti-patterns, set alwaysApply, validate, update coverage report
  - Template file in `docs/ai-dev/templates/rule-template.md`
- [ ] **DEV-AI-178**: Create a template for adding a new Claude Code skill
  - Checklist: choose file name, write header, define prerequisites, write steps, add templates, add validation, update index
  - Template file in `docs/ai-dev/templates/skill-template.md`
- [ ] **DEV-AI-179**: Create a template for adding a new Cursor skill
  - Same as Claude Code but with Cursor tool references
  - Template file in `docs/ai-dev/templates/cursor-skill-template.md`
- [ ] **DEV-AI-180**: Create a template for adding a new agent type
  - Checklist: choose name, define context directories, assign skills, assign rules, write system prompt additions, define capabilities, define limitations, validate, update index
  - Template file in `docs/ai-dev/templates/agent-type-template.md`
- [ ] **DEV-AI-181**: Document the "new domain" workflow
  - When a new area of the project emerges (e.g., new frontend feature, new server module):
    1. Create a Cursor rule file for the new domain
    2. Create skill files if the domain has repeatable tasks
    3. Consider whether a new agent type is needed
    4. Update the CLAUDE.md project structure section
    5. Update the agent type selection guide
    6. Run the health check

### 10.2 Convention Migration

- [ ] **DEV-AI-182**: Define the convention migration process
  - When a convention changes (e.g., switch from PascalCase to camelCase for a specific file type):
    1. Document the old and new convention
    2. Update all config files that reference the old convention
    3. Add a migration note in the config changelog
    4. Run the drift detection to identify code that follows the old convention
    5. Create tasks to update existing code (optional, can be gradual)
    6. Remove the old convention from config after all code is migrated
- [ ] **DEV-AI-183**: Define the convention deprecation process
  - When an old convention is phased out:
    1. Mark the convention as deprecated in the rule file with a note: `<!-- DEPRECATED: Use X instead. Remove after YYYY-MM-DD -->`
    2. Add a lint rule or script to detect the deprecated pattern
    3. After all code is migrated, remove the deprecated convention
    4. Update the config changelog
- [ ] **DEV-AI-184**: Create a convention migration tracker
  - `docs/ai-dev/migrations/` directory
  - One file per convention migration: `YYYY-MM-DD-{description}.md`
  - Contents: what changed, why, what config files were updated, migration status (in-progress/complete)

### 10.3 Config Testing

- [ ] **DEV-AI-185**: Define config testing strategy
  - Each Cursor rule file includes examples — validate that examples compile
  - Each skill file includes file templates — validate that templates produce valid code
  - Agent type specs reference real directories — validate they exist
  - CLAUDE.md references real files — validate they exist
- [ ] **DEV-AI-186**: Create `scripts/ai-dev/test-config-examples.ts`
  - Extract code examples from rule files
  - Compile each example with TypeScript (or validate SCSS with stylelint)
  - Report examples that don't compile
  - Run as part of the CI health check
- [ ] **DEV-AI-187**: Create config snapshot tests
  - Snapshot the structure (not content) of each config file
  - If the structure changes (sections added/removed), the snapshot test fails
  - This catches accidental structural changes
  - Snapshots stored in `scripts/ai-dev/__snapshots__/`
- [ ] **DEV-AI-188**: Create end-to-end config tests
  - For each skill file, run the skill in a sandbox environment with a test project
  - Verify the skill produces the expected files with the expected content
  - These are expensive — run weekly, not on every PR
  - Use a minimal test project that mimics the real monorepo structure

### 10.4 Config Documentation

- [ ] **DEV-AI-189**: Create `docs/ai-dev/README.md` — master documentation for the config system
  - Overview: what the AI dev config system is and why it exists
  - Architecture: directory layout, file types, relationships between configs
  - Quick start: how to use the configs as a developer
  - Rule files: what they are, how they work, how to create one
  - Skill files: what they are, how to use them, how to create one
  - Agent types: what they are, how to invoke them, how to create one
  - Self-updating: how configs stay in sync with the codebase
  - Troubleshooting: common issues and resolutions
- [ ] **DEV-AI-190**: Create onboarding guide for new developers
  - `docs/ai-dev/ONBOARDING.md`
  - Step-by-step guide for a developer joining the project:
    1. Install Cursor and/or Claude Code
    2. Clone the repo
    3. Understand the config system (read this document)
    4. Set up Cursor: rules auto-load, skills manual-load
    5. Set up Claude Code: CLAUDE.md auto-loads, skills referenced from CLAUDE.md
    6. Try a simple task: create a component using the skill
    7. Try a multi-step task: add a feature using the Master Planner
  - Include screenshots and example terminal output
- [ ] **DEV-AI-191**: Create a config system FAQ
  - `docs/ai-dev/FAQ.md`
  - Q: "Which config file do I edit for X?" → Decision tree
  - Q: "How do I add a new convention?" → Link to convention migration process
  - Q: "The AI is ignoring my rule file" → Troubleshooting checklist (globs, alwaysApply, token budget)
  - Q: "How do I know if my config change is working?" → Run health check, check coverage report
  - Q: "What's the difference between dev config and runtime config?" → Link to BOUNDARY.md
- [ ] **DEV-AI-192**: Create a config system architecture diagram
  - Visual diagram showing: CLAUDE.md → skill files, Cursor rules → rule activation, agent types → context assembly
  - Show the layered context assembly (always-on → domain → skill)
  - Show the relationship between Cursor rules and Claude Code skills
  - Include in `docs/ai-dev/README.md`

### 10.5 Integration with Plan Files

- [ ] **DEV-AI-193**: Define how completed plan tasks trigger config updates
  - When a plan task introduces a new pattern, the task completion should include a config review
  - Add a note in plan task descriptions: "Config impact: may require updating {rule file}"
  - The Documentation Agent can scan recently completed plan tasks and propose config updates
- [ ] **DEV-AI-194**: Create a plan-to-config traceability map
  - Map each plan section to the config files it affects
  - Example: `02-FRONTEND/02-COMPONENTS-PLAN.md` → `frontend-components.md`, `skill-create-component.md`
  - Example: `03-SERVER/02-API-PLAN.md` → `server-api.md`, `skill-create-api-endpoint.md`
  - Stored in `docs/ai-dev/traceability.md`
  - Updated when new plan files or config files are added
- [ ] **DEV-AI-195**: Define periodic config review cadence
  - Weekly: quick drift check (automated)
  - Monthly: full health check (automated) + human review of proposals
  - Per-milestone: comprehensive audit of all config files against current codebase state
  - Document cadence in `docs/ai-dev/README.md`

### 10.6 Bootstrapping the Config System

- [ ] **DEV-AI-196**: Define the bootstrapping order for initial config creation
  - Phase 1: Create directory structure and BOUNDARY.md (DEV-AI-001 through DEV-AI-015)
  - Phase 2: Create root CLAUDE.md with base content (DEV-AI-016 through DEV-AI-040)
  - Phase 3: Create always-on Cursor rules (DEV-AI-044 through DEV-AI-046)
  - Phase 4: Create domain-specific Cursor rules (DEV-AI-047 through DEV-AI-065)
  - Phase 5: Create Claude Code skills (DEV-AI-070 through DEV-AI-087)
  - Phase 6: Create Cursor skills (DEV-AI-088 through DEV-AI-107)
  - Phase 7: Define agent types (DEV-AI-108 through DEV-AI-137)
  - Phase 8: Set up self-updating (DEV-AI-138 through DEV-AI-152)
  - Phase 9: Set up Master Planner (DEV-AI-153 through DEV-AI-165)
  - Phase 10: Set up monitoring and maintenance (DEV-AI-166 through DEV-AI-195)
- [ ] **DEV-AI-197**: Define the minimum viable config (MVC) for Phase 1 development
  - Just enough config to start building the project:
    - Root CLAUDE.md with project identity, tech stack, base conventions
    - 3 always-on Cursor rules (project structure, coding standards, git workflow)
    - 3 essential skills (create component, create store, create API endpoint)
    - No agent types, no self-updating, no Master Planner
  - Expand incrementally as the project grows
- [ ] **DEV-AI-198**: Create a config bootstrap script
  - `scripts/ai-dev/bootstrap.ts`
  - Creates all directories, template files, and placeholder content
  - Developer fills in the actual conventions
  - Validates the bootstrap was successful
  - Run once when setting up the project

### 10.7 Long-Term Evolution

- [ ] **DEV-AI-199**: Define config versioning strategy
  - Config files evolve with the project — no formal versioning scheme beyond git history
  - Major restructurings get git tags (`ai-config-v{N}`)
  - CHANGELOG.md tracks all changes
  - If a convention changes, all affected config files are updated in a single PR
- [ ] **DEV-AI-200**: Define config rollback procedure
  - If a config change causes agent confusion or incorrect code generation:
    1. Identify the problematic config change via CHANGELOG.md or git log
    2. Revert the change (git revert the config PR)
    3. Run the health check to verify revert is clean
    4. Investigate the root cause before re-applying
  - Keep config PRs small and focused so rollbacks are surgical
- [ ] **DEV-AI-201**: Define config scalability plan
  - Current: monolithic CLAUDE.md + flat rule directory + flat skill directory
  - If config file count exceeds 30: consider subdirectories in `.cursor/rules/` (if Cursor supports it)
  - If CLAUDE.md exceeds token budget: extract more content into referenced skills
  - If agent types exceed 12: consider consolidating related types or creating agent type categories
  - Review scalability annually or at each project milestone
- [ ] **DEV-AI-202**: Define config deprecation and cleanup schedule
  - Quarterly: review all config files for relevance
  - Remove configs for features that have been removed from the project
  - Archive (don't delete) deprecated configs in `docs/ai-dev/archive/`
  - Update all cross-references when archiving a config file

#### Design Decisions

> **Q**: Who owns the AI configs? One person, or distributed ownership?
> **A**: Distributed ownership with a designated config steward. Any developer can propose config changes via PR. Each domain's rules and skills are owned by the developers most active in that domain (e.g., frontend developers own `frontend-*.md` rules). One developer is designated as the config steward — they review all config PRs, run the monthly health check, and ensure cross-domain consistency. The steward role rotates quarterly to spread knowledge. The steward is not a bottleneck — they review, not gate.

> **Q**: How do we onboard new developers to the AI config system?
> **A**: `docs/ai-dev/ONBOARDING.md` provides a step-by-step guide: (1) install Cursor and/or Claude Code, (2) clone the repo — configs auto-load, (3) read the 5-minute overview of the config system, (4) set up your preferred tool (Cursor rules auto-load; Claude Code loads CLAUDE.md automatically), (5) try a simple task: create a component using the skill, (6) try a multi-step task: add a feature using the Master Planner. The guide includes screenshots and example terminal output. A new developer should be productive with the AI config system within 30 minutes.

> **Q**: What happens when a convention changes? How are old rules deprecated?
> **A**: Follow the convention migration process (DEV-AI-182): (1) document the old and new convention, (2) update all config files (rules, skills, CLAUDE.md), (3) add a migration note to `docs/ai-dev/CHANGELOG.md`, (4) run drift detection to find code following the old convention, (5) create tasks to update existing code (can be gradual), (6) mark the old convention as deprecated in the rule file with `<!-- DEPRECATED: Use X instead. Remove after YYYY-MM-DD -->`, (7) after all code is migrated, remove the deprecated marker. Convention changes are batched into a single PR to keep the change atomic.

> **Q**: Should there be a config quality score or health metric?
> **A**: Yes. The health check script (`scripts/ai-dev/health-check.ts`) produces a summary score: number of checks passed / total checks. Individual check categories: sandbox integrity (critical — must be 100%), structural validity (critical — must be 100%), drift items (warning at 3, error at 5), freshness (warning at 60 days, error at 90 days), token budget compliance (error if over budget). The health check dashboard (`docs/ai-dev/health-report.html`) visualizes the score with green/yellow/red indicators. The SLA is: all critical checks green, warnings under 3.

> **Q**: What happens when the project grows and the config system becomes unwieldy? (30+ rule files, 20+ skills, 12+ agent types)
> **A**: Defined scalability plan (DEV-AI-201): (1) if CLAUDE.md exceeds token budget, extract more content into referenced skills — CLAUDE.md becomes a compact index. (2) If rule file count exceeds 30, evaluate whether Cursor supports subdirectories in `.cursor/rules/` and organize by domain. (3) If agent types exceed 12, consolidate related types (e.g., merge Styling Agent into Frontend Agent) or create agent type categories. (4) If skill count is unwieldy, the skill index provides navigation. The system is designed to scale incrementally. Review scalability at each project milestone.

> **Q**: What is the procedure for rolling back a bad config change?
> **A**: Git revert the config PR. Config changes are committed as focused PRs (one concern per PR), making surgical rollbacks straightforward. Steps: (1) identify the problematic change via `docs/ai-dev/CHANGELOG.md` or `git log -- .cursor/ .claude/ CLAUDE.md scripts/ai-dev/`, (2) `git revert {commit}`, (3) run `scripts/ai-dev/health-check.ts` to verify the revert is clean, (4) investigate the root cause before re-applying. Major restructurings have git tags (`ai-config-v{N}`) for easier rollback to known-good states.

> **Q**: When bootstrapping the config system from scratch, what is the minimum viable config (MVC) to start productive development?
> **A**: The MVC for Phase 1 is: (1) root CLAUDE.md with project identity, tech stack, base conventions, and workflow commands, (2) 3 always-on Cursor rules (`project-structure.md`, `coding-standards.md`, `git-workflow.md`), (3) 3 essential skills (`skill-create-component.md`, `skill-create-store.md`, `skill-create-api-endpoint.md`), (4) `BOUNDARY.md`. No agent types, no self-updating, no Master Planner, no health checks. These are added incrementally in later phases. The bootstrap script (`scripts/ai-dev/bootstrap.ts`) creates all directories and placeholder files for the MVC.

---

## Additional Design Decisions

> **Q**: How do we keep Claude Code and Cursor configs in sync? Both tools need the same conventions but use different config formats.
> **A**: Shared source of truth at the convention level, separate delivery mechanisms. Conventions are defined once in the plan files and CLAUDE.md. Cursor rules and Claude Code skills are both derived from these conventions. The `validate-skills.ts` script checks that paired skills (Claude Code `skill-create-component.md` and Cursor `.cursor/skills/create-component/SKILL.md`) reference the same conventions: same file templates, same naming patterns, same validation checks. If one is updated, the paired file is flagged for update. There is no automated generation of one from the other — they are maintained in parallel with cross-validation.

> **Q**: What capabilities differ between Claude Code and Cursor that affect config design?
> **A**: Key differences: (1) Claude Code supports sub-agent delegation natively (`--resume`, process spawning); Cursor does not — the Master Planner pattern only works in Claude Code. (2) Cursor has glob-triggered rule activation; Claude Code relies on CLAUDE.md and explicitly loaded skills. (3) Cursor has built-in tools (Read, Write, Shell, Grep, Glob); Claude Code uses MCP tools and file system access. (4) Cursor shows rule frontmatter (`alwaysApply`, `globs`); Claude Code ignores frontmatter. These differences mean: Cursor rules focus on convention guidance (what to do); Claude Code skills focus on execution steps (how to do it). The Master Planner is Claude Code-only.

> **Q**: Should there be a single source of truth that generates both Claude Code and Cursor configs?
> **A**: No. The two config formats are different enough that auto-generation would produce suboptimal results. Claude Code skills are step-by-step procedures with CLI commands; Cursor skills reference Cursor-specific tools (Write, Read, Shell). A generator would need to translate between tool paradigms, which is fragile. Instead, conventions are the shared source of truth (defined in CLAUDE.md, plan files, and rule files). Each tool's config is hand-written to be idiomatic for that tool. Cross-validation scripts catch drift between the two.

> **Q**: Should the config system assume developers use both tools, or should it work fully with either tool independently?
> **A**: Either tool independently. A developer using only Cursor gets full guidance via always-on rules + domain rules + Cursor skills. A developer using only Claude Code gets full guidance via CLAUDE.md + Claude Code skills + agent types. The Master Planner orchestration feature is Claude Code-only, but individual task execution works in both. The onboarding guide (`docs/ai-dev/ONBOARDING.md`) has separate setup sections for Cursor-only, Claude Code-only, and both.

> **Q**: How do we verify that Cursor and Claude Code configs produce equivalent code for the same task?
> **A**: The end-to-end config tests (DEV-AI-188) include parity checks: for each major skill (create-component, create-store, create-api-endpoint), run the skill via both Cursor (`.cursor/skills/`) and Claude Code (`skill-*.md`) in separate sandbox projects. Compare the output: file structure should match, naming should match, patterns should match. Minor formatting differences are acceptable; structural differences are bugs. These parity tests run monthly alongside the other end-to-end config tests.

> **Q**: If Cursor has MCP servers configured, should Cursor skills reference MCP tools or stick to built-in Cursor tools?
> **A**: Cursor skills should reference Cursor's built-in tools (Read, Write, Shell, Glob, Grep) by default. MCP tools are optional and depend on the developer's MCP server configuration. A skill may include an optional section: "If MCP tools are available, you can use `{tool}` for `{purpose}`." But the skill must be fully functional without MCP. This ensures skills work for all developers regardless of their MCP setup. Claude Code skills, by contrast, can freely reference MCP tools since Claude Code's MCP integration is standardized.

---

## Summary

### Task Count by Section

| Section | Tasks |
|---------|-------|
| 1. Sandboxing & Directory Strategy | 15 (DEV-AI-001 through DEV-AI-015) |
| 2. Master Development CLAUDE.md | 25 (DEV-AI-016 through DEV-AI-040) |
| 3. Cursor Rules Configuration | 29 (DEV-AI-041 through DEV-AI-069) |
| 4. Claude Code Skills for Development | 18 (DEV-AI-070 through DEV-AI-087) |
| 5. Cursor Skills for Development | 20 (DEV-AI-088 through DEV-AI-107) |
| 6. Development Agent Types | 30 (DEV-AI-108 through DEV-AI-137) |
| 7. Self-Updating Configuration (Back-feeding) | 15 (DEV-AI-138 through DEV-AI-152) |
| 8. Master Planner Configuration | 13 (DEV-AI-153 through DEV-AI-165) |
| 9. "Always On" Configuration Strategy | 11 (DEV-AI-166 through DEV-AI-176) |
| 10. Configuration for Evolving Project | 26 (DEV-AI-177 through DEV-AI-202) |
| **TOTAL** | **202** |

### Dependencies (What This Plan Enables)

Completion of this plan unblocks or enhances:
- **All other plans** — every plan benefits from consistent AI-assisted development
- `01-PROJECT-STRUCTURE/PLAN.md` — needs AI config directories in the monorepo layout
- `06-AGENT-SYSTEM/04-SKILLS-CONFIG-PLAN.md` — clear boundary between dev skills and runtime skills
- `08-TESTING/01-STRATEGY-PLAN.md` — testing conventions codified in rules and skills
- `12-CODE-GENERATION/PLAN.md` — development agent types inform how code generation is built

### Dependencies (What This Plan Requires)

- `01-PROJECT-STRUCTURE/PLAN.md` — monorepo structure must be defined before AI configs reference it

### Definition of Done

This plan is complete when:
- [ ] Root `CLAUDE.md` exists, is within token budget, and covers all required sections
- [ ] `.cursor/rules/` contains all defined rule files, each with valid frontmatter and glob patterns
- [ ] `.cursor/skills/` contains all defined skill directories with valid `SKILL.md` files
- [ ] `.claude/` directory exists with README
- [ ] Claude Code skill files exist in the skills directory with all required sections
- [ ] All 10+ development agent types are defined with specs, context, skills, and boundaries
- [ ] `BOUNDARY.md` exists and clearly separates dev config from runtime config
- [ ] `scripts/ai-dev/validate-sandbox.ts` runs in CI and passes
- [ ] `scripts/ai-dev/health-check.ts` runs all sub-checks and passes
- [ ] Self-updating mechanisms detect drift between config and code
- [ ] Master Planner can decompose a multi-step task and delegate to specialized agents
- [ ] "Always on" rules stay under 2,000 tokens total
- [ ] Full context for any agent type stays under 50% of the model's context window
- [ ] Onboarding documentation guides a new developer through setup in under 30 minutes
- [ ] No sandbox violations: dev config and runtime config are fully separated
- [ ] Config health check shows all green (no drift, no stale files, no broken references)
