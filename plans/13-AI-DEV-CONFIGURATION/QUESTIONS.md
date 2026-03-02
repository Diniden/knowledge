# 13-AI-DEV-CONFIGURATION: Open Questions

> **Purpose**: Unresolved questions about the AI development configuration
> system — CLAUDE.md, Cursor rules, Claude Code skills, Cursor skills,
> development agent types, self-updating config, master planner, and
> always-on strategy. This covers **development-time** AI tooling for
> building the project, NOT the application's runtime agent system (that is
> `06-AGENT-SYSTEM/`). Answers may change tasks in the plan.

---

## 1. Sandboxing & Boundaries

### 1.1 Session-Level Isolation

- **Q**: How do we prevent a developer's Claude Code session from
  accidentally modifying app agent configs (in
  `server/src/modules/agent/prompts/` or `server/src/modules/agent/skills/`)
  when working on dev configs (CLAUDE.md, `.cursor/rules/`, `.cursor/skills/`)?
- **A:** Three layers of defense. (1) The root CLAUDE.md includes a dedicated "Domain Boundary" section instructing the AI: "You are a DEVELOPMENT assistant. Never modify files under `server/src/modules/agent/prompts/` or `server/src/modules/agent/skills/` as part of dev-config work." (2) Each dev agent type's specification explicitly lists forbidden paths — the agent's system prompt includes a `limitations` block. (3) A CI lint script (`scripts/ai-dev/validate-sandbox.ts`) scans every PR for cross-boundary file changes and blocks merge on violation. The combination of prompt-level instruction, agent-type guardrails, and CI enforcement makes accidental cross-contamination extremely unlikely.

### 1.2 CI Boundary Enforcement

- **Q**: Should there be a CI lint that detects boundary violations between
  dev config and runtime config?
- **A:** Yes, mandatory. `scripts/ai-dev/validate-sandbox.ts` runs on every PR as part of the lint step (alongside ESLint and Prettier). It scans two directions: (1) dev config files (`.cursor/`, `.claude/`, root `CLAUDE.md`, `scripts/ai-dev/`) must not contain references to runtime prompt assembly, session management, or MCP server startup code. (2) Runtime config files (`server/src/modules/agent/`) must not reference `.cursor/`, `.claude/`, or the root `CLAUDE.md`. Any violation exits non-zero with a descriptive error message identifying the offending file and line. Merge is blocked until the violation is resolved.

### 1.3 Dual-Domain Work Sessions

- **Q**: How do we handle the case where a developer needs to work on BOTH
  the app agent system AND project code in the same session?
- **A:** Split into two sequential agent invocations, each with its own agent type. The Master Planner decomposes the task: sub-task A goes to the App Agent System Agent (context: `server/src/modules/agent/`, `server/src/modules/mcp-servers/`), sub-task B goes to the relevant domain agent (Frontend, Server, etc.). They never share context or touch each other's files. If a developer is working manually (not via an agent), the pre-commit hook emits an advisory warning when staged files span both domains — the developer must confirm intent. There is no "blended" session that mixes both domains.

### 1.4 Naming Convention for Separation

- **Q**: What naming convention clearly distinguishes dev vs app configs?
- **A:** Directory-based separation is the primary mechanism — dev configs live in root-level directories (`.cursor/`, `.claude/`, root `CLAUDE.md`, `scripts/ai-dev/`, `docs/ai-dev/`) and runtime configs live exclusively inside `server/src/modules/agent/`. No filename prefix is needed because the directory location is unambiguous. If a file must reference both domains (e.g., `BOUNDARY.md`, documentation), it includes a header comment `<!-- Domain: Cross-reference document — not a config file -->`. Runtime prompt template files in `server/src/modules/agent/prompts/` use the suffix `.prompt.md` to distinguish them from dev documentation `.md` files.

### 1.5 Boundary Reference Document

- **Q**: Should there be a single-page reference document listing every dev
  config path and every runtime config path side by side?
- **A:** Yes. `BOUNDARY.md` at the project root contains a two-column table mapping every dev config path against every runtime config path, concrete examples of what goes where, and a "When in doubt" decision tree. It is referenced from the root CLAUDE.md, from every always-on Cursor rule, and from the onboarding guide. The boundary validation script checks that `BOUNDARY.md` exists and is non-empty.

### 1.6 Pre-commit Hook Behavior

- **Q**: Should the boundary-check pre-commit hook be blocking or advisory?
  Blocking prevents all cross-boundary commits; advisory allows them with a
  warning.
- **A:** Advisory (warning, not blocking). The CI lint is the hard gate — it blocks merge. The pre-commit hook is a fast local check that alerts the developer early. Blocking at pre-commit is too aggressive: there are legitimate cases where a documentation PR touches both domains (e.g., updating `BOUNDARY.md` and also fixing a typo in a runtime config file). The warning says: "This commit touches both dev-config and runtime-config files. Verify this is intentional." The developer can proceed.

### 1.7 Runtime Config File Marker

- **Q**: Should runtime config files include a machine-readable marker so
  the sandbox validator can identify them without relying solely on path
  patterns?
- **A:** No. Path-based identification is sufficient and simpler. Runtime config files live under `server/src/modules/agent/` — the directory is the marker. Adding inline markers (e.g., `<!-- Domain: Runtime -->`) creates a maintenance burden (forgetting to add the marker to a new file) and a second source of truth that can drift from the directory structure. The sandbox validator uses directory path patterns exclusively.

### 1.8 Cross-Reference Safety

- **Q**: Can a Cursor rule file for developing the agent system
  (`agent-system-runtime.md`) safely reference runtime concepts like MCP
  tool schemas and session management without violating the sandbox?
- **A:** Yes. The rule file describes how to **write code** for the agent system — it naturally references runtime concepts (MCP tools, sessions, prompts). The sandbox boundary is about **file modifications**, not conceptual references. The rule file's header explicitly states: "This rule governs how developers WRITE CODE for the application's agent system. It does NOT configure agent behavior at runtime." The sandbox validator checks file modifications in PRs, not conceptual mentions in rule content.

---

## 2. CLAUDE.md Design

### 2.1 Token Budget

- **Q**: How long should the root CLAUDE.md be? What is the token budget vs
  comprehensiveness tradeoff?
- **A:** Target under 8,000 tokens (~6,000 words). This leaves room for domain-specific skills (~4,000 tokens), conversation context, and actual code in a 200K context window. The CLAUDE.md is measured by `scripts/ai-dev/lint-claude-md.ts` which flags overages. If it exceeds 8,000 tokens, extract detailed sections (full examples, lengthy templates) into referenced skill files. The core rules stay inline; details move to on-demand skills. A rough proxy: `wc -w CLAUDE.md` should stay under 6,000 words.

### 2.2 Reference vs Inline Strategy

- **Q**: Should CLAUDE.md reference skill files or inline everything?
- **A:** Hybrid. CLAUDE.md inlines the essential conventions that every session needs (project identity, tech stack, coding standards summaries, workflow commands, boundary warning, do-not rules). It references skill files for detailed step-by-step procedures: "For component creation, load `skill-create-component.md`." The skill reference index in CLAUDE.md is a compact list of one-liners with file paths. This keeps CLAUDE.md authoritative as a standalone reference while staying within the token budget.

### 2.3 Update Frequency

- **Q**: How often should CLAUDE.md be regenerated/updated?
- **A:** Event-driven, not scheduled. CLAUDE.md is updated when: a new technology is added to the stack, a coding convention changes, a new workflow command is added, a new skill file is created (update the index), or the directory structure changes. These triggers are documented in the plan (DEV-AI-038). A freshness check flags the file if it hasn't been reviewed in 60+ days, but there is no automatic regeneration — all updates are human-reviewed. The Documentation Agent can propose updates but never auto-applies them.

### 2.4 Per-Package CLAUDE.md Files

- **Q**: Should there be per-package CLAUDE.md files (e.g.,
  `client/CLAUDE.md`, `server/CLAUDE.md`) in addition to the root one?
- **A:** No. A single root CLAUDE.md is the authoritative source. Per-package CLAUDE.md files create maintenance overhead (keeping them in sync) and risk contradicting the root. Domain-specific context is handled by Cursor rule files (glob-matched to directories) and Claude Code skills (loaded on demand per agent type). When a Claude Code session works in `client/`, the Master Planner or developer loads the Frontend Agent type, which adds client-specific skills — this is equivalent to a per-package CLAUDE.md but without the duplication.

### 2.5 Sections and Structure

- **Q**: What sections must the root CLAUDE.md contain, and in what order?
- **A:** Required sections in order: (1) Project Identity & Overview — name, one-sentence description, architecture summary. (2) Domain Boundary Warning — dev vs runtime distinction, forbidden paths. (3) Tech Stack — every technology with version constraints. (4) Coding Standards — TypeScript, BEM SCSS, MobX, NestJS, imports, naming, testing conventions. (5) Project Structure Map — annotated directory tree with workspace markers. (6) Workflow Commands — dev, build, test, lint, db commands. (7) Agent Delegation Guidelines — when to use sub-agents, scope rules, handoff format. (8) Skill Reference Index — grouped list of all skills with file paths. (9) Do-Not Rules — explicit prohibitions. The `lint-claude-md.ts` script validates that all nine sections are present.

### 2.6 Code Examples in CLAUDE.md

- **Q**: Should CLAUDE.md include concrete code examples (e.g., a correct
  MobX store class) or just describe conventions in prose?
- **A:** Include 1-2 compact, canonical examples for the most critical patterns: one MobX store class (showing `makeObservable`, decorators, `enforceActions`), one BEM SCSS block (showing PascalCase and nesting), and one React component (showing props interface, named export, observer container). These examples are worth their token cost because they eliminate ambiguity far more effectively than prose. Limit each example to 15–20 lines. All other examples live in skill files.

### 2.7 CLAUDE.md Linting

- **Q**: Should there be an automated lint script that validates CLAUDE.md
  structure and content?
- **A:** Yes. `scripts/ai-dev/lint-claude-md.ts` runs in CI and checks: (1) all nine required sections are present (by heading match), (2) token count is within the 8,000-token budget, (3) no runtime config references have leaked in (no mentions of `server/src/modules/agent/prompts/` in imperative form), (4) the skill reference index lists only files that actually exist, (5) the directory tree matches the actual project structure (warning, not error, for minor drift). The script outputs a pass/fail report per check.

### 2.8 Third-Party Library Guidance

- **Q**: How detailed should the third-party library preferences section be?
  Should it list every approved package or just the key ones?
- **A:** List the key decision points — packages where there's a clear "use this, not that" choice. Examples: "Use `date-fns` not `moment.js` (tree-shakeable, smaller)", "Use `zod` for runtime validation", "Use `dnd-kit` not `react-beautiful-dnd` (actively maintained)". Don't enumerate every dependency in `package.json` — that's redundant with the lock file. Focus on choices where the AI might pick the wrong library. Target 10–15 explicit library preferences with one-line rationale each.

### 2.9 CLAUDE.md Discoverability

- **Q**: How does a developer know the root CLAUDE.md exists and what it
  does? What if they skip it?
- **A:** Claude Code automatically loads root CLAUDE.md when working in the project directory — no developer action required. For Cursor, the always-on rules reference CLAUDE.md conventions so the guidance is consistent. The onboarding guide (`docs/ai-dev/ONBOARDING.md`) explains the config system and lists CLAUDE.md as step 3. The `README.md` at the project root mentions: "This project uses AI development configuration. See `CLAUDE.md` and `docs/ai-dev/` for details." Developers who skip it still get guidance via Cursor rules.

---

## 3. Cursor Rules

### 3.1 Rule File Count

- **Q**: How many rule files is too many? What is the context window impact
  of having 20+ rule files?
- **A:** The rule file count itself doesn't matter because Cursor only loads rules matching the active file's glob pattern (plus always-on rules). The real constraint is the combined token count of simultaneously active rules. Target: max 3 always-on rules (under 2,000 tokens total) plus max 3 domain rules triggered simultaneously (under 3,000 tokens total). The plan defines ~25 rule files, but at most 4-6 are active at any given time. The `measure-context-budget.ts` script validates per-file and per-combination token counts.

### 3.2 Auto-Generated vs Hand-Written Rules

- **Q**: Should rules be auto-generated from code analysis or hand-written?
- **A:** Hand-written with machine-assisted review. Rules encode intentional conventions — they reflect what the code SHOULD look like, not what it currently looks like. Auto-generating from code analysis would codify existing patterns including bad ones. The drift detection script (`detect-config-drift.ts`) helps identify when code and rules diverge, but a human decides whether to update the rule or fix the code. The only auto-generated artifact is the coverage report (which directories have matching rules).

### 3.3 Conflicting Rules

- **Q**: How do we handle conflicting rules between files? What if
  `frontend-components.md` and `frontend-state.md` give contradictory
  guidance for a file that matches both globs?
- **A:** Specificity wins. Glob-triggered rules override always-on rules. Among glob-triggered rules, the rule whose glob more specifically matches the current file wins. If two rules have equally specific globs and truly conflict, that's a bug — the `validate-cursor-rules.ts` script checks for overlapping globs and flags them for manual resolution. In practice, rules are designed for non-overlapping domains: `frontend-components.md` governs component structure, `frontend-state.md` governs store patterns. A component file matches the component rule; a store file matches the state rule. Both should never apply contradictory instructions to the same file.

### 3.4 Negative Examples (Anti-patterns)

- **Q**: Should rules include negative examples (anti-patterns)? These
  consume tokens but prevent common mistakes.
- **A:** Yes, but limited: max 3 anti-patterns per rule file. Anti-patterns are extremely effective at preventing recurring mistakes (e.g., nesting `&__Item` inside `&__Item` in BEM, using `any` instead of `unknown`, importing stores directly in leaf components). Each anti-pattern is a short code snippet (3-5 lines) with a one-line explanation of why it's wrong and the correct alternative. The token cost is ~100-150 tokens per anti-pattern — worth it for the error prevention. Rules for mature, well-understood domains can skip anti-patterns.

### 3.5 Glob Pattern Design

- **Q**: What glob patterns should each rule use for activation? Should they
  be broad (entire directories) or narrow (specific file types)?
- **A:** As narrow as practical to minimize false activation. Use file extension filters: `client/ui/src/components/**/*.{ts,tsx}` instead of `client/ui/src/components/**/*`. Use directory depth: `server/src/**/*.controller.ts` for API rules, not `server/**/*.ts`. The plan's rule definitions already specify appropriate globs per task. Cross-cutting rules (accessibility, security, performance) use broader globs (`client/ui/src/**/*.tsx`, `server/src/**/*.ts`) because they apply to the full domain. The `validate-cursor-rules.ts` script verifies all globs are syntactically valid.

### 3.6 Rule File Frontmatter

- **Q**: What is the exact frontmatter format and which fields are required?
- **A:** Every rule file uses YAML frontmatter with three fields: `description` (required, one-line string), `globs` (required unless `alwaysApply: true`, array of glob strings), and `alwaysApply` (required, boolean, default `false`). A rule file has either `globs` or `alwaysApply: true`, never both. The `validate-cursor-rules.ts` script checks: frontmatter is parseable YAML, required fields are present, `globs` patterns are valid, and no file has both `globs` and `alwaysApply: true`.

### 3.7 Rule File Size Limits

- **Q**: How large should individual rule files be? Is there a per-file
  token budget?
- **A:** Target under 800 tokens per rule file. Always-on rules should be under 600 tokens (they load on every file). Domain rules can be up to 1,000 tokens for complex domains (frontend-components, server-api). If a rule exceeds its budget, extract examples into a referenced skill file and link from the rule: "For full component creation steps, use the create-component skill." The `measure-context-budget.ts` script measures each file and flags overages.

### 3.8 Rule Evolution and Deprecation

- **Q**: How are rule files updated when conventions change? Is there a
  deprecation mechanism?
- **A:** When a convention changes: (1) update the rule file content, (2) add a changelog entry in `docs/ai-dev/CHANGELOG.md`, (3) increment the config version in the rule file's header comment. For deprecated conventions that are being phased out, add a comment `<!-- DEPRECATED: Use X instead. Remove after YYYY-MM-DD -->` inside the rule file. The drift detection script flags code still following the deprecated pattern. After all code is migrated, remove the deprecated section and update the changelog.

### 3.9 Rule Testing

- **Q**: Can we test that rule files actually produce the desired behavior
  when Cursor uses them?
- **A:** Indirectly. Direct behavioral testing of Cursor's AI responses is not feasible (non-deterministic). Instead: (1) validate that code examples in rule files compile (`test-config-examples.ts` extracts and compiles them), (2) validate that anti-patterns are caught by ESLint where applicable, (3) run periodic end-to-end config tests that invoke skills in a sandbox project and verify output matches conventions, (4) track developer feedback — if a rule consistently produces wrong code, it needs revision. The health check aggregates all these signals.

---

## 4. Skills Design

### 4.1 Skill Granularity

- **Q**: How detailed should each skill be? Step-by-step with exact
  file templates vs high-level guidance?
- **A:** Step-by-step with exact file templates. Skills are the most detailed layer of the config system — they are instruction manuals, not guidelines. Each step is a numbered, concrete action: "Create file at `{path}` with the following content: [template]." Templates include placeholders (e.g., `{ComponentName}`, `{StoreName}`) that the agent fills in. High-level guidance belongs in Cursor rules; skills are for execution. A developer or agent following a skill should produce correct, convention-compliant code without needing to consult any other resource.

### 4.2 Skill Idempotency

- **Q**: Should skills be idempotent (safe to run multiple times)?
- **A:** Yes, where possible. Skills should check preconditions before each step: "If `{ComponentName}.tsx` already exists, skip file creation" or "If the store is already registered in `RootStore`, skip registration." This prevents duplicate files, duplicate registrations, and duplicate test entries. Not all steps can be truly idempotent (e.g., creating a migration always creates a new file), but the skill should detect existing artifacts and warn rather than blindly overwrite. Idempotency makes skills safer for agents that may retry on failure.

### 4.3 Edge Case and Error Handling

- **Q**: How do skills handle edge cases and error recovery?
- **A:** Each skill includes a "Common Issues" section at the end listing 3-5 typical problems and their resolutions. Examples: "If `bun test` fails with a module resolution error, run `bun install` first." "If the component file already exists, check if this is a name collision and choose a different name." Skills do not attempt automatic error recovery — they report the error and suggest a fix. The agent (or developer) decides whether to apply the fix and retry. This keeps skills simple and predictable.

### 4.4 Output Validation

- **Q**: Should skills validate their output before completing?
- **A:** Yes. Every skill ends with a "Validation" section that lists checks to run after execution: "Run `bun test {file}` and verify it passes," "Run `bun lint {file}` and verify no errors," "Verify the component renders by checking the Storybook story or running the dev server." The agent executes these checks as the final steps of the skill. If validation fails, the agent reports the failure with the validation output — it does not loop and retry automatically (to prevent infinite retry loops).

### 4.5 Skill Testing

- **Q**: How do we test that skills produce correct code?
- **A:** Three levels. (1) Template validation: `validate-skills.ts` extracts file templates from skill files and verifies they are syntactically valid TypeScript/SCSS/JSON. (2) Structural validation: verify skills have all required sections (header, prerequisites, steps, validation, common issues). (3) End-to-end tests: weekly, the `scripts/ai-dev/test-config-examples.ts` script runs each skill in a minimal sandbox project and verifies the output compiles, lints, and passes the skill's own validation checks. End-to-end tests are expensive (they invoke actual compilation) so they run on a schedule, not per-PR.

### 4.6 Skill Token Budget

- **Q**: How large should individual skill files be? What is the per-skill
  token budget?
- **A:** Target under 4,000 tokens per skill. This leaves room in the context window for CLAUDE.md (~8,000 tokens), always-on rules (~2,000 tokens), domain rules (~1,500 tokens), and actual code. If a skill exceeds 4,000 tokens, split it into sub-skills that reference each other. Complex workflows (e.g., `skill-add-feature.md`) are orchestration skills that reference sub-skills by file path rather than inlining their content. The `measure-context-budget.ts` script tracks skill file sizes.

### 4.7 Claude Code vs Cursor Skill Differences

- **Q**: How should Claude Code skills differ from Cursor skills for the
  same task (e.g., "create component")?
- **A:** Same conventions and templates, different tool invocations. Claude Code skills reference `claude` CLI commands, file system operations, and sub-agent delegation. Cursor skills reference Cursor tools: `Write` for file creation, `Read` for inspection, `Shell` for running commands, `Glob` for finding files, `Grep` for searching. The convention-level content (BEM class format, store class structure, DTO validation pattern) is identical. Maintaining two versions per skill is overhead but necessary because the tools differ. The `validate-skills.ts` script checks that paired skills (Claude Code and Cursor) reference the same conventions.

### 4.8 Skill Cross-References

- **Q**: How should skills reference each other? Inline the other skill's
  content or link by file path?
- **A:** Link by file path, never inline. Example: the `skill-add-feature.md` orchestration skill says "Step 4: Create server endpoint — follow `skill-create-api-endpoint.md`." The agent loads the referenced skill on demand. Inlining would blow the token budget for composite skills. The `validate-skills.ts` script verifies all cross-references resolve to existing files. The skill index (`skills/INDEX.md`) provides a master lookup table so agents can find the right skill without following chains.

### 4.9 Skill Authoring Workflow

- **Q**: Who writes skills, and what is the review process?
- **A:** Any developer can write a skill. New skill files are submitted as PRs and require one review from another developer. The reviewer checks: (1) the skill follows the template structure, (2) file templates compile, (3) conventions match existing rules, (4) the skill index is updated, (5) the paired Cursor skill exists (if applicable). The `skill-create-skill.md` meta-skill provides the step-by-step process for creating a new skill. Skill PRs trigger the `validate-skills.ts` CI check.

---

## 5. Agent Types

### 5.1 Ideal Context Size

- **Q**: What's the ideal context size for a focused development agent? Too
  small means missing needed information; too large means noise and confusion.
- **A:** The total loaded context per agent type (CLAUDE.md + always-on rules + domain rules + skill) should stay under 50% of the model's context window — roughly 100K tokens for a 200K model. In practice, the pre-loaded config context targets ~15,000 tokens: CLAUDE.md (~8K) + always-on rules (~2K) + domain rules (~2K) + active skill (~3K). The remaining context window is for code files, conversation history, and output. The `measure-context-budget.ts` script validates each agent type's total config context.

### 5.2 Inter-Agent Delegation

- **Q**: Should agents be able to call other agents, or only the master
  planner delegates?
- **A:** Only the Master Planner delegates. Development agents (Frontend, Server, Database, etc.) execute their tasks and return results. They do not invoke other agents. If a task requires multiple domains, the Master Planner decomposes it and handles delegation. This keeps the delegation tree flat (depth 1: Master Planner → domain agent) and prevents runaway cost from recursive delegation. An individual agent that discovers it needs work in another domain reports that in its result, and the Master Planner handles it in the next delegation cycle.

### 5.3 Cross-Domain Tasks

- **Q**: How do we handle tasks that span multiple agent domains? For
  example, "add a new field to the spec model" touches database, server,
  shared types, and frontend.
- **A:** The Master Planner decomposes the task following the dependency chain: (1) shared types first (`packages/shared/` — handled by any agent, typically Server Agent), (2) database migration (Database Agent), (3) server endpoint updates (Server Agent), (4) frontend store and component updates (Frontend Agent), (5) tests across all layers (Testing Agent or delegated per-domain). Each sub-task has explicit inputs (what the previous agent produced) and outputs. The Master Planner tracks progress and handles handoffs.

### 5.4 General Purpose Agent

- **Q**: Should there be a "general purpose" agent for undefined tasks that
  don't fit any specialized type?
- **A:** No dedicated general-purpose agent type. The Master Planner itself serves as the catch-all — if a task doesn't map to a specialized agent, the Master Planner either handles it directly (for documentation, config, or planning tasks) or decomposes it further until sub-tasks map to existing agent types. Adding a general-purpose agent would undermine the specialization model. If a task category recurs and doesn't fit existing types, that's a signal to create a new agent type (per the evolution process in DEV-AI-137).

### 5.5 Agent Type Overlap

- **Q**: Some tasks naturally sit at the boundary between two agent types
  (e.g., a service file that involves both server architecture and database
  queries). How is the primary agent chosen?
- **A:** The agent type selection guide (`docs/ai-dev/agent-types/selection-guide.md`) provides a decision tree based on the primary artifact being created or modified. If the primary file is a `.service.ts` file, the Server Agent handles it — even if the service calls database queries. The Server Agent has access to the `database.md` rule via its rule set. Agent types are specialized by responsibility, not by file exclusivity. The Database Agent is reserved for schema changes, migrations, and seed data — not for every file that touches the database.

### 5.6 Agent Context Directories

- **Q**: Should agent types have read access to files outside their primary
  context directories for reference?
- **A:** Yes, read access is broader than write access. The Frontend Agent's write scope is `client/ui/` but its read scope includes `packages/shared/src/types/` and `packages/shared/src/dto/` (to understand the data contracts). The Server Agent reads `packages/shared/` for the same reason. Agent type specs define both `context_directories` (read) and `writable_directories` (write). The agent can read outside its context if explicitly needed (e.g., reading a plan file for reference), but the system prompt discourages modifications outside the writable scope.

### 5.7 Agent Type Testing

- **Q**: How do we verify that an agent type's context, skills, and rules
  are sufficient for its assigned tasks?
- **A:** Periodic integration tests (DEV-AI-136). For each agent type, a sample task is defined. The test invokes the agent with only its specified context (rules, skills, CLAUDE.md) and verifies: (1) the agent produces correct output, (2) the agent does not attempt to access files outside its context, (3) the output passes lint and tests. These are expensive (they invoke actual AI) so they run weekly, not per-PR. Results feed back into agent type spec refinements. The `validate-agent-types.ts` script handles the cheaper structural checks (directories exist, skills exist, no overlapping contexts) on every PR.

### 5.8 Agent Type Evolution

- **Q**: What is the process for adding a new agent type or splitting an
  existing one that has become too broad?
- **A:** Follow the template in `docs/ai-dev/templates/agent-type-template.md`. Steps: (1) identify the gap — what tasks are poorly served by existing types? (2) Define the new type's context directories, skills, rules, capabilities, and limitations. (3) Create the agent type spec file in `docs/ai-dev/agent-types/`. (4) Update the selection guide. (5) Update the Master Planner's knowledge of available agents. (6) Run `validate-agent-types.ts`. (7) Run the periodic integration test for the new type. For splitting an existing type, also update all Master Planner templates that reference the old type to reference the new subtypes.

---

## 6. Self-Updating / Back-feeding

### 6.1 Staleness Detection

- **Q**: How do we detect when configs are stale — i.e., the codebase has
  drifted from what the config describes?
- **A:** `scripts/ai-dev/detect-config-drift.ts` performs automated checks: (1) scan SCSS files for class names that don't follow the BEM PascalCase convention described in `frontend-styling.md`, (2) scan TSX files for default exports when `coding-standards.md` says named-only, (3) compare `package.json` dependencies against the tech stack section in CLAUDE.md, (4) compare the actual directory tree against the annotated tree in CLAUDE.md. Each check outputs a drift item with severity (info, warning, error). The weekly automated run produces a drift report. A config file not reviewed in 60+ days is flagged as potentially stale via the `last_reviewed` metadata.

### 6.2 Automatic vs Human-Reviewed Updates

- **Q**: Should config updates be automatic or require human review?
- **A:** Always human-reviewed. Automated tools can propose updates (stored in `docs/ai-dev/proposals/`), but no config file is auto-modified. The Documentation Agent can generate a proposal with a diff preview, but a human must review and merge the PR. This prevents config churn from false-positive drift detections and ensures conventions remain intentional. The only automated action is detection and proposal generation — application is always manual.

### 6.3 Update Triggers

- **Q**: What triggers a config review? New patterns, PR merges, manual
  request, or a schedule?
- **A:** Four triggers: (1) Event-driven: after a PR merges that changes files matching flagged patterns (new component pattern → flag `frontend-components.md`), implemented via `scripts/ai-dev/detect-config-drift.ts` post-merge hook. (2) Periodic: weekly automated drift check, monthly full health check. (3) Manual: developer runs `bun scripts/ai-dev/health-check.ts` when they suspect drift. (4) Milestone: at each project milestone, comprehensive audit of all config files. Each trigger creates a review item in `docs/ai-dev/proposals/` or a GitHub issue.

### 6.4 Preventing Config Churn

- **Q**: How do we prevent config churn — constant updates that add noise
  and distract from actual development?
- **A:** Three guardrails. (1) Threshold-based proposals: the drift detector only creates a proposal when drift items exceed a threshold (3+ items of the same type). A single non-conforming file doesn't trigger a review. (2) Cooldown period: a config file updated in the last 14 days is exempt from automated review proposals. (3) Batching: weekly drift checks accumulate items and produce a single summary, not individual proposals per item. Config PRs are expected at most weekly, not daily. Major config changes are batched into a single PR.

### 6.5 New Convention Detection

- **Q**: How does the system detect when a new coding pattern has emerged
  organically and should be formalized into a rule?
- **A:** `scripts/ai-dev/detect-config-drift.ts` includes a pattern frequency scan: when a code pattern appears in 3+ files but isn't documented in any rule file, it's flagged as a "potential convention." Examples: a new error handling pattern, a new React hook pattern, a new DTO structure. These are flagged as info-level items in the weekly drift report. A human reviews whether the pattern should be formalized (add to a rule), discouraged (add as an anti-pattern), or left as-is (one-off pattern that doesn't warrant a rule).

### 6.6 Changelog and Audit Trail

- **Q**: How are config changes tracked for auditability?
- **A:** `docs/ai-dev/CHANGELOG.md` tracks every config change with date, file modified, description, and reason. Format: `## YYYY-MM-DD` followed by `- [file] Description (reason)`. The changelog is updated as part of every config PR — it's a required file in config PRs (the CI check verifies the changelog was updated if config files changed). Git history provides the fine-grained diff; the changelog provides the human-readable narrative. Git tags (`ai-config-v{N}`) mark major restructurings.

---

## 7. Master Planner

### 7.1 Sub-Agent Selection

- **Q**: How does the master planner decide which sub-agent to use for each
  sub-task?
- **A:** The Master Planner uses the agent type selection guide (`docs/ai-dev/agent-types/selection-guide.md`) which maps task keywords and primary artifacts to agent types. The planner's system prompt includes the full agent type list with capabilities and limitations. For each sub-task, the planner identifies: (1) the primary artifact (component, endpoint, migration, test), (2) the primary directory (client, server, db), and (3) the required skills. These three signals deterministically map to an agent type. If the mapping is ambiguous, the planner uses the "closest fit" agent and notes the ambiguity in the task breakdown.

### 7.2 Task Decomposition Errors

- **Q**: What happens when the master planner's task decomposition is wrong?
  For example, it assigns a database task to the Frontend Agent.
- **A:** Two mitigation layers. (1) Prevention: the `validate-agent-types.ts` script checks that agent type capabilities are consistent with their context directories — the Frontend Agent's spec says it cannot create migrations, so the planner should never assign one. The planner's system prompt includes these constraints. (2) Detection: if a sub-agent encounters a task outside its scope (e.g., told to modify a file in a directory it doesn't have write access to), it reports the error in its result: "Task requires modifying `server/src/db/` which is outside my writable scope." The Master Planner then reassigns the sub-task to the correct agent.

### 7.3 Master Planner Context Scope

- **Q**: Should the master planner have access to all code or just the plan
  files?
- **A:** Plan files plus structural context, not all code. The Master Planner's context includes: `plans/` (all plan files), `CLAUDE.md`, `docs/` (documentation), `package.json` files across all workspaces (for dependency awareness), and the agent type specs. It does NOT load application source code — that's the domain agents' job. The Master Planner reasons about task structure and delegation, not about code implementation. Keeping its context focused on planning artifacts ensures it stays within its token budget and doesn't attempt to write code directly.

### 7.4 Sub-Task Dependency Management

- **Q**: How does the master planner handle dependencies between sub-tasks?
  For example, the frontend store depends on shared types that the server
  agent creates.
- **A:** Explicit dependency chains. The Master Planner's task breakdown includes a `depends_on` field for each sub-task: `{id: "FE-1", depends_on: ["SRV-1"], ...}`. Sub-tasks are executed in topological order — a sub-task only starts after all its dependencies are marked done. If a dependency fails, dependent sub-tasks are marked "blocked" and the planner reports which tasks are affected. The standard dependency chain for full-stack features is: shared types → database → server → frontend → tests.

### 7.5 Planner Escalation

- **Q**: When should the master planner escalate to the human developer
  instead of making a decision autonomously?
- **A:** Three escalation triggers: (1) the task requires a decision not covered by plan files (e.g., "should this be a new module or part of an existing module?"), (2) the task contradicts existing plan files (e.g., "the plan says JWT auth but the task asks for session-based auth"), (3) a sub-agent fails twice on the same task after adjusted instructions. Escalation format: describe the decision needed, list the options considered, state a recommendation with reasoning, and ask the developer to choose. The planner pauses until the developer responds.

### 7.6 Planner Post-Mortem

- **Q**: Should the master planner produce a post-mortem after completing a
  multi-agent task?
- **A:** Yes. After every multi-agent task (3+ sub-tasks), the Master Planner produces a post-mortem stored in `docs/ai-dev/post-mortems/{date}-{task-summary}.md`. Contents: planned vs actual breakdown, which sub-tasks succeeded/failed, total time and token usage, lessons learned, and suggestions for improving agent types or skills. Post-mortems are reviewed monthly to identify recurring issues and improve the config system. Single-agent tasks don't need post-mortems.

---

## 8. Always-On Strategy

### 8.1 Token Budget

- **Q**: What's the token budget for always-on rules?
- **A:** 2,000 tokens total across all always-on rule files. The three always-on rules (`project-structure.md`, `coding-standards.md`, `git-workflow.md`) share this budget — roughly 650 tokens each. This is a hard constraint because always-on rules load on every file in every session. The CLAUDE.md base content (project identity, tech stack summary, workflow commands) adds another ~3,000 tokens. Total always-on context: 5,000 tokens. The `measure-context-budget.ts` script enforces this budget and flags any rule that pushes the total over.

### 8.2 Measuring Effectiveness

- **Q**: How do we measure whether always-on rules are effective? What if
  they're consuming tokens but not improving code quality?
- **A:** Three proxy metrics: (1) Convention compliance rate: run `detect-config-drift.ts` and measure the percentage of files conforming to always-on rule conventions (target >95%). If compliance is already high without the rules, they may be unnecessary. (2) Developer feedback: quarterly survey asking "Do the AI coding conventions match your expectations?" (3) Error rate: track how often developers need to correct AI-generated code that violates conventions. If a specific convention in an always-on rule is never violated (compliance is 100% organically), consider moving it to a domain rule to save tokens.

### 8.3 Temporary Rule Disabling

- **Q**: Should there be a mechanism to temporarily disable always-on rules
  for specific tasks?
- **A:** No explicit disable mechanism. If a task genuinely conflicts with an always-on rule (rare — always-on rules are foundational), the developer should note the exception in the prompt: "For this task, ignore the import ordering convention because we're generating a compatibility shim." The AI respects in-context instructions over rule files. Adding a formal disable mechanism risks rules being permanently disabled by accident. If a rule is frequently disabled, it should be moved to a conditional (glob-triggered) rule instead.

### 8.4 Always-On Rule Content

- **Q**: What content is essential in always-on rules vs what should be
  deferred to domain rules?
- **A:** Always-on rules contain only universal conventions that apply to every file type: (1) `project-structure.md`: monorepo layout, workspace boundaries, import paths, directory creation rules, dev/runtime boundary note. (2) `coding-standards.md`: TypeScript strict mode, no `any`, `interface` over `type`, import ordering, file naming, error handling patterns, logging (NestJS Logger, no `console.log`). (3) `git-workflow.md`: branch naming, commit message format, PR conventions, keep PRs small. Everything else (BEM SCSS, MobX patterns, NestJS module patterns, Drizzle conventions, test patterns) goes in domain rules triggered by glob patterns.

### 8.5 Layered Context Priority

- **Q**: When always-on rules and domain rules provide different guidance on
  the same topic, which takes priority?
- **A:** The more specific rule wins. Domain rules (glob-triggered) are more specific than always-on rules. If `coding-standards.md` (always-on) says "use `interface` over `type`" but `frontend-state.md` (domain rule for stores) says "use `type` for store action parameter unions," the domain rule applies for store files. This mirrors CSS specificity: global rules provide defaults, domain rules provide overrides. Rules are written to minimize conflicts — always-on rules state universals, domain rules state domain-specific refinements.

### 8.6 Context Budget Monitoring

- **Q**: How is the context budget monitored over time as rules grow?
- **A:** `scripts/ai-dev/measure-context-budget.ts` produces a token count table: each config file's token count, always-on total, per-domain totals, and per-agent-type totals (CLAUDE.md + rules + skill combined). This runs as part of the health check. Thresholds: always-on total > 2,000 tokens = error, domain total per combination > 3,000 tokens = warning, any single rule file > 1,000 tokens = warning, agent type total config > 15,000 tokens = error. The health check dashboard displays these metrics visually.

---

## 9. Cross-Tool Compatibility

### 9.1 Config Sync Between Tools

- **Q**: How do we keep Claude Code and Cursor configs in sync? Both tools
  need the same conventions but use different config formats.
- **A:** Shared source of truth at the convention level, separate delivery mechanisms. Conventions are defined once in the plan files and CLAUDE.md. Cursor rules and Claude Code skills are both derived from these conventions. The `validate-skills.ts` script checks that paired skills (Claude Code `skill-create-component.md` and Cursor `.cursor/skills/create-component/SKILL.md`) reference the same conventions: same file templates, same naming patterns, same validation checks. If one is updated, the paired file is flagged for update. There is no automated generation of one from the other — they are maintained in parallel with cross-validation.

### 9.2 Tool Capability Differences

- **Q**: What capabilities differ between Claude Code and Cursor that affect
  config design?
- **A:** Key differences: (1) Claude Code supports sub-agent delegation natively (`--resume`, process spawning); Cursor does not — the Master Planner pattern only works in Claude Code. (2) Cursor has glob-triggered rule activation; Claude Code relies on CLAUDE.md and explicitly loaded skills. (3) Cursor has built-in tools (Read, Write, Shell, Grep, Glob); Claude Code uses MCP tools and file system access. (4) Cursor shows rule frontmatter (`alwaysApply`, `globs`); Claude Code ignores frontmatter. These differences mean: Cursor rules focus on convention guidance (what to do); Claude Code skills focus on execution steps (how to do it). The Master Planner is Claude Code-only.

### 9.3 Single Source of Truth

- **Q**: Should there be a single source of truth that generates both Claude
  Code and Cursor configs?
- **A:** No. The two config formats are different enough that auto-generation would produce suboptimal results. Claude Code skills are step-by-step procedures with CLI commands; Cursor skills reference Cursor-specific tools (Write, Read, Shell). A generator would need to translate between tool paradigms, which is fragile. Instead, conventions are the shared source of truth (defined in CLAUDE.md, plan files, and rule files). Each tool's config is hand-written to be idiomatic for that tool. Cross-validation scripts catch drift between the two.

### 9.4 Developer Tool Choice

- **Q**: Should the config system assume developers use both tools, or
  should it work fully with either tool independently?
- **A:** Either tool independently. A developer using only Cursor gets full guidance via always-on rules + domain rules + Cursor skills. A developer using only Claude Code gets full guidance via CLAUDE.md + Claude Code skills + agent types. The Master Planner orchestration feature is Claude Code-only, but individual task execution works in both. The onboarding guide (`docs/ai-dev/ONBOARDING.md`) has separate setup sections for Cursor-only, Claude Code-only, and both.

### 9.5 Config Parity Testing

- **Q**: How do we verify that Cursor and Claude Code configs produce
  equivalent code for the same task?
- **A:** The end-to-end config tests (DEV-AI-188) include parity checks: for each major skill (create-component, create-store, create-api-endpoint), run the skill via both Cursor (`.cursor/skills/`) and Claude Code (`skill-*.md`) in separate sandbox projects. Compare the output: file structure should match, naming should match, patterns should match. Minor formatting differences are acceptable; structural differences are bugs. These parity tests run monthly alongside the other end-to-end config tests.

### 9.6 Cursor MCP Integration

- **Q**: If Cursor has MCP servers configured, should Cursor skills
  reference MCP tools or stick to built-in Cursor tools?
- **A:** Cursor skills should reference Cursor's built-in tools (Read, Write, Shell, Glob, Grep) by default. MCP tools are optional and depend on the developer's MCP server configuration. A skill may include an optional section: "If MCP tools are available, you can use `{tool}` for `{purpose}`." But the skill must be fully functional without MCP. This ensures skills work for all developers regardless of their MCP setup. Claude Code skills, by contrast, can freely reference MCP tools since Claude Code's MCP integration is standardized.

---

## 10. Maintenance & Evolution

### 10.1 Config Ownership

- **Q**: Who owns the AI configs? One person, or distributed ownership?
- **A:** Distributed ownership with a designated config steward. Any developer can propose config changes via PR. Each domain's rules and skills are owned by the developers most active in that domain (e.g., frontend developers own `frontend-*.md` rules). One developer is designated as the config steward — they review all config PRs, run the monthly health check, and ensure cross-domain consistency. The steward role rotates quarterly to spread knowledge. The steward is not a bottleneck — they review, not gate.

### 10.2 Developer Onboarding

- **Q**: How do we onboard new developers to the AI config system?
- **A:** `docs/ai-dev/ONBOARDING.md` provides a step-by-step guide: (1) install Cursor and/or Claude Code, (2) clone the repo — configs auto-load, (3) read the 5-minute overview of the config system, (4) set up your preferred tool (Cursor rules auto-load; Claude Code loads CLAUDE.md automatically), (5) try a simple task: create a component using the skill, (6) try a multi-step task: add a feature using the Master Planner. The guide includes screenshots and example terminal output. A new developer should be productive with the AI config system within 30 minutes.

### 10.3 Convention Changes

- **Q**: What happens when a convention changes? How are old rules
  deprecated?
- **A:** Follow the convention migration process (DEV-AI-182): (1) document the old and new convention, (2) update all config files (rules, skills, CLAUDE.md), (3) add a migration note to `docs/ai-dev/CHANGELOG.md`, (4) run drift detection to find code following the old convention, (5) create tasks to update existing code (can be gradual), (6) mark the old convention as deprecated in the rule file with `<!-- DEPRECATED: Use X instead. Remove after YYYY-MM-DD -->`, (7) after all code is migrated, remove the deprecated marker. Convention changes are batched into a single PR to keep the change atomic.

### 10.4 Config Quality Score

- **Q**: Should there be a config quality score or health metric?
- **A:** Yes. The health check script (`scripts/ai-dev/health-check.ts`) produces a summary score: number of checks passed / total checks. Individual check categories: sandbox integrity (critical — must be 100%), structural validity (critical — must be 100%), drift items (warning at 3, error at 5), freshness (warning at 60 days, error at 90 days), token budget compliance (error if over budget). The health check dashboard (`docs/ai-dev/health-report.html`) visualizes the score with green/yellow/red indicators. The SLA is: all critical checks green, warnings under 3.

### 10.5 Config Scalability

- **Q**: What happens when the project grows and the config system becomes
  unwieldy? (30+ rule files, 20+ skills, 12+ agent types)
- **A:** Defined scalability plan (DEV-AI-201): (1) if CLAUDE.md exceeds token budget, extract more content into referenced skills — CLAUDE.md becomes a compact index. (2) If rule file count exceeds 30, evaluate whether Cursor supports subdirectories in `.cursor/rules/` and organize by domain. (3) If agent types exceed 12, consolidate related types (e.g., merge Styling Agent into Frontend Agent) or create agent type categories. (4) If skill count is unwieldy, the skill index provides navigation. The system is designed to scale incrementally. Review scalability at each project milestone.

### 10.6 Config Rollback

- **Q**: What is the procedure for rolling back a bad config change?
- **A:** Git revert the config PR. Config changes are committed as focused PRs (one concern per PR), making surgical rollbacks straightforward. Steps: (1) identify the problematic change via `docs/ai-dev/CHANGELOG.md` or `git log -- .cursor/ .claude/ CLAUDE.md scripts/ai-dev/`, (2) `git revert {commit}`, (3) run `scripts/ai-dev/health-check.ts` to verify the revert is clean, (4) investigate the root cause before re-applying. Major restructurings have git tags (`ai-config-v{N}`) for easier rollback to known-good states.

### 10.7 Bootstrapping Priority

- **Q**: When bootstrapping the config system from scratch, what is the
  minimum viable config (MVC) to start productive development?
- **A:** The MVC for Phase 1 is: (1) root CLAUDE.md with project identity, tech stack, base conventions, and workflow commands, (2) 3 always-on Cursor rules (`project-structure.md`, `coding-standards.md`, `git-workflow.md`), (3) 3 essential skills (`skill-create-component.md`, `skill-create-store.md`, `skill-create-api-endpoint.md`), (4) `BOUNDARY.md`. No agent types, no self-updating, no Master Planner, no health checks. These are added incrementally in later phases. The bootstrap script (`scripts/ai-dev/bootstrap.ts`) creates all directories and placeholder files for the MVC.

---

## Decision Log

> Record decisions as questions are resolved.

| Date | Question | Decision | Rationale |
| ---- | -------- | -------- | --------- |
| —    | —        | —        | —         |
