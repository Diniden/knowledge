# 06-AGENT-SYSTEM / 05 — PLAN GENERATION: Open Questions

> **Purpose**: Unresolved questions about the plan generation system including
> plan format, execution model, delta detection, graph traversal, review
> workflow, execution integration, versioning, rollback, and verification.
> Answers may change tasks in the plan.

---

## 1. Plan Format

### 1.1 Plan Structure

- **Q**: Should plan files be Markdown (human-readable, agent-writable) or
  a structured format like YAML/JSON (machine-parseable, less readable)?
  Markdown is proposed, but it complicates automated parsing of step
  structures.

**A:** Markdown with YAML frontmatter. Plan files are `.md` files with a YAML frontmatter block containing machine-parseable metadata (source specs, dependencies, status, estimated effort) and a Markdown body containing human-readable step descriptions. This gives us both: the frontmatter is parsed by the execution engine for sequencing and tracking, and the body is read by the agent (or human reviewer) for implementation guidance. Parsing is straightforward — split at the `---` delimiter, parse YAML, treat the rest as Markdown.

- **Q**: Should plan frontmatter use YAML (standard Markdown frontmatter),
  JSON, or a custom format? YAML frontmatter is most common in Markdown
  files, but JSON is more consistent with the rest of the project.

**A:** YAML. YAML frontmatter is the de facto standard for Markdown files (Jekyll, Hugo, Astro, MDX all use it). Developers and agents are familiar with the pattern. JSON frontmatter would look unusual in a Markdown file and requires escaped strings. The server's plan parser uses a standard YAML library (e.g., `yaml` npm package) to parse the frontmatter. The rest of the project uses JSON for APIs and configs — that's fine, YAML is only used in plan file frontmatter.

- **Q**: How granular should individual plan files be? One file per spec?
  One file per logical work unit (potentially spanning multiple specs)?
  One file per implementation component?

**A:** One file per logical work unit. A work unit is a coherent implementation task that may reference 1–3 source specs. Examples: "Implement authentication middleware" (references auth spec + session spec), "Create database schema for users" (references user model spec). This is more natural than one-file-per-spec (which fragments related work) and more manageable than one-file-per-component (which may be too large). The plan generation agent determines work units by analyzing spec dependencies and grouping tightly-coupled specs.

- **Q**: Should plan files include code snippets or pseudo-code for
  implementation guidance? This helps the execution agent but makes plans
  larger and potentially stale if code patterns change.

**A:** Yes, include pseudo-code for complex steps. Plan files include pseudo-code (not full implementation) for steps that involve non-obvious logic: database schema definitions, API route signatures, component prop interfaces. Simple steps ("create a React component for the login form") don't need pseudo-code. Pseudo-code is prefixed with `> Implementation hint:` to distinguish it from the step description. This helps the execution agent produce consistent output without being so specific that it becomes stale.

### 1.2 Plan Content

- **Q**: How detailed should plan steps be? Very detailed steps ("create
  file X with content Y") are precise but rigid; high-level steps ("implement
  authentication") give the execution agent more freedom but may produce
  inconsistent results.

**A:** Medium detail: specific enough to be unambiguous, flexible enough for implementation decisions. Good: "Create an Express middleware function in `src/middleware/auth.ts` that validates JWT tokens from the Authorization header, extracts user ID, and attaches it to the request context. Return 401 for invalid/expired tokens." Bad (too vague): "Implement auth." Bad (too specific): "Create file auth.ts with the following exact content: [200 lines of code]." Each step specifies: what to create, where it goes, what it does, and key constraints — but not the exact implementation.

- **Q**: Should plans include estimated effort per step? If so, how should
  effort be estimated — by the generating agent, by historical data, or
  by the user during review?

**A:** Yes, estimated by the generating agent. Each plan file's frontmatter includes `estimated_effort: "small" | "medium" | "large"` (not hours — the agent can't estimate time accurately). Small = single file, simple logic. Medium = 2–5 files, moderate complexity. Large = 5+ files or complex logic. The estimate helps the reviewer prioritize review attention and helps the execution engine allocate time budgets (small: 2 min, medium: 3 min, large: 5 min within the 5-minute timeout). Historical calibration is a post-launch optimization.

- **Q**: Should plans include risk assessment per step? ("This step involves
  database migration and carries risk of data loss.") This is valuable
  for reviewers but adds generation complexity.

**A:** Yes, for high-risk steps only. The plan generation agent flags steps that involve: database schema changes, deletion of existing resources, changes to authentication/authorization, modifications to shared infrastructure. These are flagged in the frontmatter: `risk: "high"` with a `risk_note: "Modifies shared database schema — requires migration strategy."` Low-risk steps (creating new files, adding new features) are not flagged. This draws reviewer attention to the steps that need it most without cluttering every step.

- **Q**: Should plans include alternative approaches for each step? ("Option
  A: JWT tokens. Option B: Session cookies.") This supports decision-making
  during review but increases plan size.

**A:** No. The plan generation agent makes a decision and presents one approach. The plan is an opinionated implementation plan, not a design document — design decisions belong in specs. If the user disagrees with the chosen approach, they provide feedback during review ("use session cookies instead of JWT"), and the agent regenerates with that constraint. Including alternatives in every step would double plan size and create decision fatigue for reviewers. The spec itself may document alternatives; the plan picks one.

---

## 2. Directory Structure

### 2.1 Parallel vs. Serial

- **Q**: How should the plan generation agent determine which directories
  are parallel vs. serial? Based purely on spec dependencies (graph analysis),
  or should there be heuristics (e.g., "frontend and backend are always
  parallel")?

**A:** Primarily graph analysis, with lightweight heuristics as tiebreakers. The agent analyzes spec `depends-on` edges to build a dependency DAG. Specs with no dependencies between them can be parallelized. Heuristics are applied only when graph analysis is ambiguous: (1) specs tagged with different layers (frontend, backend, database) default to parallel, (2) specs with shared dependencies default to serial (run after the shared dependency). The agent explains its parallelization reasoning in the plan's root `README.md`.

- **Q**: Should the parallel group assignment be shown in the directory
  name? For example, `[parallel-A]-01-foundation/` vs. `01-foundation/`.
  Explicit naming helps humans understand the structure.

**A:** No brackets in directory names. Parallel groups are indicated by the master prompt file at the plan root (`master-prompt.md`), which lists the execution order: "Phase 1 (parallel): 01-database/, 02-api-routes/. Phase 2 (serial): 03-integration/." Directories are numbered sequentially within their phase: `01-database/`, `02-api-routes/`, `03-integration/`. The numbering reflects reading order for humans, and the master prompt defines execution order for the engine. This keeps directory names clean while being explicit about execution semantics.

- **Q**: What's the maximum number of parallel directories? Too many
  parallel tracks may overwhelm the execution engine and the reviewer.
  Should there be a cap (e.g., max 5 parallel groups)?

**A:** Cap at 4 parallel directories per phase. This maps to the PRD's constraint: the execution engine runs Claude Code processes, and we don't want a single plan consuming all 10 process slots. 4 parallel directories × 1 Claude Code process each = 4 slots, leaving 6 for other users. If the graph analysis suggests more than 4 parallel tracks, the agent groups related tracks together (e.g., "API routes" and "API middleware" become one directory) to stay within the cap.

- **Q**: Should there be "checkpoints" between parallel groups — points
  where all parallel work must complete before the next phase starts?
  Checkpoints simplify reasoning but reduce parallelism.

**A:** Yes. The plan structure is organized in phases, and each phase is a checkpoint. Within a phase, directories are parallel. Between phases, all parallel directories must complete before the next phase begins. Example: Phase 1 (parallel: database + API) → checkpoint → Phase 2 (serial: integration tests). This is the "Plans = directories (parallel) with plan files (serial)" model from the PRD. Phases are explicit in the master prompt. This simplifies execution and review without significantly reducing parallelism.

### 2.2 File Organization

- **Q**: What's the optimal number of plan files per directory? Too few
  (1-2) means the directory structure is unnecessarily deep; too many
  (20+) makes individual directories hard to navigate.

**A:** 3–8 plan files per directory. Each file is a logical work unit executed serially within the directory. Fewer than 3 suggests the directory should be merged with another. More than 8 suggests the directory should be split into sub-directories. The plan generation agent targets 5 files per directory as the sweet spot. Files are numbered for execution order: `01-schema.md`, `02-models.md`, `03-services.md`, `04-routes.md`, `05-tests.md`.

- **Q**: Should plan files within a directory share any context, or should
  each file be self-contained? Shared context (a directory README) reduces
  repetition; self-contained files are easier to execute independently.

**A:** Shared context via a directory `README.md`. Each directory includes a `README.md` that provides: the directory's purpose, relevant specs (summaries + IDs), shared architectural context (e.g., "all files in this directory are Express route handlers"), and execution prerequisites. Individual plan files reference this shared context and focus on their specific work unit. The execution agent reads the `README.md` first, then processes plan files in order. This reduces repetition (~200 tokens saved per file) and ensures consistency within a directory.

- **Q**: Should there be a `_cleanup.md` plan file at the end of each
  directory for post-implementation cleanup tasks?

**A:** No mandatory cleanup file. The last plan file in each directory should include cleanup as part of its steps if needed (e.g., "Remove unused imports, run linter"). A dedicated cleanup file for every directory is over-structured. However, the plan's final directory (e.g., `99-finalization/`) should include a `01-cleanup.md` for project-wide cleanup: run linter, verify all imports, remove dead code, update documentation. This single project-level cleanup is more effective than per-directory cleanup files.

---

## 3. Graph Traversal

### 3.1 Traversal Scope

- **Q**: How should the traversal handle large knowledge graphs (1000+
  specs)? The default 5-hop, 100-spec limit may include too many specs
  for a focused plan. Should the user be able to manually curate the
  spec set for a plan?

**A:** Yes, user curation as an option. The workflow is: (1) Agent performs default traversal from the root spec (5 hops, max 100 specs). (2) The result is presented to the user as a "Plan Scope" summary: "This plan will cover 47 specs. Key areas: authentication (12 specs), user management (8 specs), API routes (15 specs), database (12 specs)." (3) The user can approve, narrow ("focus only on authentication"), or expand ("also include the session management specs"). (4) The agent adjusts the scope and regenerates. For graphs under 100 specs, the default traversal usually captures everything relevant.

- **Q**: Should traversal follow ALL edge types or only `depends-on` and
  `derived-from`? Including `related-to` edges risks including specs that
  are loosely connected and not relevant to the plan.

**A:** `depends-on` and `derived-from` only for the primary traversal. `related-to` edges are excluded from the plan scope traversal because they represent loose associations that don't imply implementation dependency. However, `related-to` edges are surfaced in the plan's README as "Related specs (not in scope): [list]" — informing the reviewer that adjacent specs exist without bloating the plan. The agent can include a `related-to` spec in scope if the user explicitly requests it.

- **Q**: How should the traversal handle spec clusters (densely connected
  groups)? A single `depends-on` edge into a cluster could pull in dozens
  of specs. Should there be a "cluster detection" mechanism that summarizes
  clusters instead of including every spec?

**A:** Yes, lightweight cluster detection. If the traversal enters a cluster (>10 specs within 2 hops), the agent: (1) identifies the cluster boundary, (2) includes the cluster's "entry point" specs (the ones directly connected to the root traversal path), (3) summarizes the rest of the cluster in the plan README: "This plan touches the User Management cluster (23 specs). Included: user-auth, user-profile. Not included: user-preferences, user-notifications (15 others)." The user can expand coverage during the scoping review. This prevents a single dependency edge from pulling in 50 specs.

- **Q**: Should the plan include specs from different "layers" of the
  project (frontend, backend, database)? Or should plans be scoped to a
  single layer, with cross-layer dependencies noted but not planned?

**A:** Plans span all relevant layers. A feature like "user authentication" naturally crosses layers (database schema → backend API → frontend login form). The plan organizes layers into parallel directories (Phase 1: parallel database + backend API, Phase 2: serial frontend integration). Cross-layer dependencies are explicit in the plan's dependency graph. Single-layer plans would be artificial and force the user to generate multiple plans for a single feature — that's worse UX than a multi-layer plan.

### 3.2 Traversal Optimization

- **Q**: Should the traversal result be cached between plan generation
  sessions? If the user generates a plan, reviews it, rejects it, and
  asks for regeneration, should the traversal be re-run or reused?

**A:** Reused with a freshness check. The traversal result is cached with a timestamp. On regeneration, the system checks if any specs in the traversal result have been modified since the cache was created. If no changes: reuse the cached traversal (saves ~1–2 seconds). If changes exist: re-run the traversal to capture the updates. The cache is per-plan (identified by root spec + scope parameters) and cleared when the plan is finalized or abandoned.

- **Q**: Should the graph traversal be done by the server (pre-computed
  before agent invocation) or by the agent itself (via MCP tool calls
  during generation)? Server-side is faster; agent-side allows the agent
  to make intelligent traversal decisions.

**A:** Agent-side via MCP tool calls. The plan generation agent calls `traverse_graph` with the root spec ID, reviews the results, and may call it again with different parameters (adjusting depth, filtering edge types, following specific paths). This gives the agent control over scope — it can make intelligent decisions like "this cluster is too large, let me narrow the traversal" or "this path leads to irrelevant specs, let me exclude it." Server-side pre-computation would be a black box to the agent. The latency cost (~1 second per traversal call) is acceptable for plan generation (which is already a multi-minute process).

---

## 4. RAG Context

- **Q**: How should RAG context be balanced against graph context? If the
  graph traversal provides comprehensive spec content, is additional RAG
  context even necessary? Or does RAG provide cross-cutting context that
  graph traversal misses?

**A:** RAG supplements graph traversal with cross-cutting context. Graph traversal follows explicit edges and captures the spec dependency tree. RAG captures semantic relationships that may not be expressed as edges: "this error handling spec is similar to the one in the payments module" or "the API design patterns spec is relevant even though it's not connected." The agent uses graph traversal for the primary plan scope and RAG for supplementary context: "Are there any existing patterns or conventions relevant to this implementation?" RAG results are secondary — used to enrich the plan, not to define its scope.

- **Q**: Should RAG queries be generated from individual spec content or
  from the plan's overall theme? Spec-level queries find per-step context;
  theme-level queries find cross-cutting concerns.

**A:** Both. The agent runs: (1) One theme-level RAG query at plan start: "Find specs relevant to [plan theme: user authentication system]" — this surfaces cross-cutting concerns (security policies, error handling conventions, API standards). (2) Per-file RAG queries during plan file generation: "Find specs relevant to [this specific work unit: JWT token validation middleware]" — this surfaces implementation-specific context. Theme-level results go in the plan README; per-file results inform individual plan file content.

- **Q**: What's the token budget for RAG context within a plan file? If
  each plan file has 3 RAG results averaging 500 tokens each, that's 1500
  tokens of RAG context per file. Is this the right balance?

**A:** 1,500 tokens of RAG context per plan file is the target. 3 results × 500 tokens (truncated chunk) = 1,500 tokens. This leaves the majority of the context budget for the actual spec content (from graph traversal) and the plan file's output generation. The agent includes RAG results in its context when generating each plan file, but doesn't embed them in the plan file itself — RAG context informs the agent's reasoning, not the plan's content. The plan file references source specs by ID, not RAG chunks.

- **Q**: Should the RAG results be pre-fetched for all specs at once
  (efficient, cached) or fetched on-demand per plan file generation
  (relevant, but slower)?

**A:** Pre-fetched. Before generating plan files, the agent runs RAG queries for the plan theme and for each work unit's key specs. The results are cached in the session context. During plan file generation, the agent pulls from the cached results. This is more efficient than per-file RAG queries (which would add ~2 seconds per file × 10 files = 20 seconds) and the results are stable across files (same spec references yield same RAG results). Pre-fetching adds ~5 seconds upfront but saves more in total generation time.

---

## 5. Delta Detection

### 5.1 Change Tracking

- **Q**: What should the baseline for delta detection be? The previous
  plan's generation timestamp? The previous plan's execution timestamp?
  A specific git commit? Each choice has different implications for what
  counts as "changed."

**A:** The previous plan version's generation timestamp. Delta detection compares the current state of specs against their state when the previous plan version was generated. This captures all changes since the last plan, whether or not the plan was executed. Using the execution timestamp would miss changes made between generation and execution. Using a git commit ties delta detection to the KG repo's commit history, which is an unnecessary coupling. The generation timestamp is stored in the plan's metadata: `generated_at: "2025-01-15T10:30:00Z"`.

- **Q**: How should "cascading changes" be handled? If spec A changed and
  spec B depends on A, should B be considered "indirectly changed" even
  if its content hasn't been modified?

**A:** Yes, B is marked as "indirectly affected." Delta detection identifies: (1) **Directly changed** specs: content modified since baseline. (2) **Indirectly affected** specs: unchanged content but a `depends-on` or `derived-from` ancestor was directly changed. The plan regeneration treats these differently: directly changed specs get full plan file regeneration; indirectly affected specs get a "review pass" where the agent checks if the existing plan file is still valid given the upstream change. This balances thoroughness (catching cascading impacts) with efficiency (not regenerating everything).

- **Q**: Should metadata-only changes (tags, summary) trigger delta plan
  regeneration, or only content changes? Metadata changes rarely affect
  plan steps, but they might affect traversal results.

**A:** Content changes only. Metadata changes (tags, summary, timestamps) do not trigger delta regeneration. Plan steps are derived from spec content (requirements, constraints, acceptance criteria), not metadata. If a tag change would alter the traversal scope (a spec newly tagged "out-of-scope"), the user should trigger a full rebuild rather than relying on delta detection. This prevents unnecessary regeneration for routine metadata updates (like updating summaries or adding tags).

- **Q**: Should edge changes (new edges, deleted edges) trigger plan
  regeneration? A new `depends-on` edge could change execution order even
  if no spec content changed.

**A:** Yes. Edge changes that affect the plan scope trigger delta regeneration. Specifically: (1) New `depends-on` edge between two specs in the plan scope → re-evaluate execution order. (2) Deleted edge → re-evaluate if the plan files are still correctly sequenced. (3) New edge that brings a previously out-of-scope spec into scope → flag for user review ("Spec X is now connected to the plan scope. Should it be included?"). Edge changes are structural — they can fundamentally alter the plan's dependency graph and thus its execution order.

### 5.2 Delta Scope

- **Q**: For delta builds, should ONLY the affected plan files be
  regenerated, or should the entire plan be regenerated with affected
  files receiving extra attention? Targeted regeneration is faster;
  full regeneration ensures consistency.

**A:** Targeted regeneration. Only plan files whose source specs were directly changed or indirectly affected are regenerated. Unchanged plan files are preserved as-is. The plan's master prompt is regenerated (it may need updated sequencing), and each affected directory's README is updated. This is significantly faster than full regeneration (regenerating 3 files vs. 20) and preserves the user's review state (they've already approved the unchanged files). If targeted regeneration produces an inconsistency (e.g., a dependency conflict), the agent flags it and recommends a full rebuild.

- **Q**: How should delta builds handle structural changes? If a new spec
  introduces a new dependency layer, the plan may need a new directory.
  Should delta builds be limited to content-only changes, with structural
  changes requiring a full build?

**A:** Delta builds handle content changes within existing plan files. Structural changes (new directories, reordering phases, splitting/merging directories) require a full build. The delta detection system identifies structural changes: (1) new spec added to scope that doesn't fit existing directories → structural. (2) Edge change that reverses dependency order between directories → structural. (3) Spec removed from scope → structural. When a structural change is detected, the system returns: "Structural changes detected. A full plan rebuild is recommended." The user can accept a full rebuild or force a delta build (at the risk of inconsistency).

- **Q**: Should there be a "delta preview" mode — showing the user what
  would change in a delta build without actually generating the files?
  This helps the user decide between delta and full build.

**A:** Yes. The `analyze_plan_delta` tool returns a preview: "Changed specs: [A, B]. Affected plan files: [02-api-routes/03-auth-middleware.md, 03-integration/01-auth-flow.md]. Structural changes: none. Recommendation: delta build." The user reviews this and decides: "proceed with delta" or "do a full rebuild." The preview costs one MCP tool call (~500ms) and saves the user from committing to a multi-minute generation that may not be what they want. The preview also helps the user understand the blast radius of their spec changes.

---

## 6. Plan-as-Knowledge-Graph

- **Q**: Should plans themselves be represented as nodes in the knowledge
  graph? This enables rich querying ("find all plans that reference spec X")
  but blurs the line between knowledge and execution artifacts.

**A:** Yes, plans are represented as nodes. Each plan has a node of type `plan` in the KG with metadata: root spec, version, status (draft/approved/executing/completed), creation date, and a summary. Plan files are not individual nodes — only the plan as a whole. This enables: "which specs have plans?" (coverage analysis), "what's the latest plan for spec X?" (navigation), and "show all plans in progress" (dashboard). Plans are a distinct node type, clearly separated from spec nodes.

- **Q**: If plans are graph nodes, should plan-spec edges be a new edge
  type (`includes-in-plan`) or should they use the existing `related-to`
  type? A new type is more precise; reusing existing types is simpler.

**A:** New edge type: `planned-by`. Edges go from spec → plan: "Spec X is planned-by Plan Y." This is semantically distinct from `related-to` (which implies a content relationship) and `depends-on` (which implies a build dependency). The `planned-by` edge type enables precise queries: "find all specs with no `planned-by` edges" = unplanned specs. Using `related-to` would conflate content relationships with execution relationships, making it impossible to distinguish "related for informational purposes" from "included in a plan."

- **Q**: Should spec coverage analysis ("which specs don't have plans yet")
  be a feature of the plan system or the knowledge graph system? It
  naturally belongs to both.

**A:** Knowledge graph system, using the `planned-by` edge type. The query "find all specs without `planned-by` edges" is a standard graph query. The KG MCP server provides a `get_unplanned_specs` convenience tool that returns specs with no plan coverage. The plan generation UI surfaces this as a "Coverage" view: a visual map of planned vs. unplanned specs. This is a KG query (where the data lives), surfaced through the plan UI (where the user needs it).

- **Q**: Should the plan generation system create specs for "lessons
  learned" after plan execution? For example, if a plan step failed because
  of an undocumented requirement, should that requirement be captured as a
  new spec?

**A:** No automatic spec creation. Plan execution failures are logged with context, and the agent can suggest creating a new spec: "Step 3 failed because the API requires rate limiting, which isn't documented. Would you like me to create a spec for rate limiting requirements?" The user decides whether to create the spec. Automatic spec creation from execution failures would generate noisy, low-quality specs. The agent's suggestion + user approval ensures only meaningful specs are added.

---

## 7. Review & Approval

### 7.1 Review Process

- **Q**: Should plan review be mandatory before execution, or should users
  be able to execute plans immediately (at their own risk)? Mandatory
  review is safer; skip-review enables faster iteration in development.

**A:** Mandatory review by default, with a "quick execute" option for small plans. Plans with ≤5 files and no high-risk flags can be executed with a single "Execute" button (review is optional). Plans with >5 files or any high-risk flags require explicit review: the user must open the plan view, see the summary, and click "Approve & Execute." This balances safety (large/risky plans are always reviewed) with velocity (small, safe plans can be fast-tracked). The project admin can make review mandatory for all plans regardless of size.

- **Q**: Should the review UI show the raw plan files, a rendered view,
  or both? Raw files show exactly what the agent will see; rendered view
  is easier for humans to read.

**A:** Rendered view as the primary, with raw file access. The review UI shows: (1) A plan overview (phase diagram, dependency graph, effort estimates). (2) Each plan file rendered as a card: title, source specs (linked), steps as a checklist, risk flags highlighted. (3) An "Edit" button that opens the raw Markdown for manual adjustments. The rendered view is what 90% of reviewers need; the raw view is for power users who want to tweak the plan. Edits in raw view are persisted and reflected in the rendered view.

- **Q**: Should multiple reviewers be required for large plans? For example,
  plans with > 20 steps require 2 approvals. This adds safety but slows
  the workflow.

**A:** No. Single reviewer (the user who requested the plan). Multi-reviewer approval is an enterprise feature for later — it requires role-based access, approval workflows, and notification systems. At launch, the user who generates the plan is the reviewer. They can share the plan view URL with collaborators for informal review, but formal multi-reviewer approval is not enforced. The confirm-before-mutation pattern during execution provides a second safety checkpoint.

- **Q**: Should the agent be able to review its own plans (self-review)
  before presenting to the human? A "review pass" could catch obvious
  issues before human attention is needed.

**A:** Yes. After generating all plan files, the plan generation agent runs a self-review pass: (1) Check all source specs are covered (no orphan specs in scope). (2) Check dependency ordering is consistent (no circular dependencies between plan files). (3) Check estimated effort is reasonable (no single file marked "large" that should be split). (4) Check for duplicate steps across files. The self-review is a final step in the `finalize_plan` tool call. Issues found are auto-fixed when possible (reorder files, split large files) or flagged in the plan summary for the reviewer.

### 7.2 Feedback Loop

- **Q**: When a plan is rejected with feedback, should the agent regenerate
  from scratch or attempt to apply the feedback incrementally? Incremental
  is faster; full regeneration is more reliable.

**A:** Incremental by default, with full regeneration as a fallback. The feedback is passed to the plan generation agent as context: "User rejected this plan with feedback: 'Use session cookies instead of JWT.'" The agent identifies which plan files are affected by the feedback and regenerates only those files. If the feedback is broad ("completely restructure the approach"), the agent performs a full regeneration. The agent decides whether feedback is targeted (incremental) or broad (full regen) based on its assessment. This typically saves 60–70% of regeneration time for targeted feedback.

- **Q**: Should rejection feedback be structured (checkboxes for common
  issues) or free-form text? Structured feedback is easier for the agent
  to parse; free-form is more flexible.

**A:** Free-form text with optional tags. The review UI provides a text area for feedback plus optional quick-tags: "Wrong approach," "Missing dependency," "Too complex," "Not detailed enough," "Security concern." The tags are prepended to the free-form text: "[Wrong approach] Use session cookies instead of JWT tokens for auth." The agent parses the tags for categorization and uses the full text for understanding. This gives structured signal without constraining the user to predefined checkboxes.

- **Q**: Should the system track "rejection reasons" over time to improve
  plan generation quality? If certain types of plans are frequently
  rejected, the system could proactively adjust.

**A:** Yes, tracked in the monitoring system. Rejection tags, feedback text, and plan metadata (root spec type, plan size, agent type) are logged. A quarterly review of rejection patterns identifies: common issues (e.g., "plans for frontend specs are frequently rejected for wrong component structure"), prompt/skill improvements (e.g., add a skill for frontend component planning), and structural improvements (e.g., "plans with >15 files are rejected 3x more often — lower the complexity cap"). This is a human-analyzed feedback loop, not automatic adjustment.

---

## 8. Execution

### 8.1 Execution Model

- **Q**: Should plan execution be fully automated (agent executes all steps
  without human intervention) or semi-automated (human confirms each step)?
  Full automation is efficient; semi-automation catches errors early.

**A:** Semi-automated with configurable granularity. Default: the execution agent runs all steps within a plan file without interruption, then pauses for user confirmation before moving to the next plan file. The user sees: "Completed 01-schema.md (created 3 files, 0 errors). Proceed to 02-models.md?" This is step-per-file granularity — frequent enough to catch issues, infrequent enough to not be tedious. Users can toggle to: "fully automated" (no pauses, execute the entire plan) or "step-by-step" (pause after each individual step). The default balances safety with usability.

- **Q**: Should the execution engine run on the server (centralized, controlled)
  or on the user's machine (local access to code repo, faster file I/O)?
  Server-side is easier to manage; local execution avoids transferring
  code.

**A:** Server-side. The execution engine runs Claude Code on the server, generating code files in a server-side sandbox. Generated code is committed to a git branch in the code repository (which may be local or remote). The user reviews the branch (via PR or local checkout). Server-side execution provides: consistent environment (no "works on my machine"), resource management (process caps, timeouts), and audit logging. The code repo is accessed via the Git MCP server, which can operate on local or remote repos.

- **Q**: Should plan execution create one commit per step, one commit per
  directory, or one commit for the entire plan? Per-step is granular
  (easy rollback); per-plan is cleaner (one atomic change).

**A:** One commit per plan file. Each plan file is a logical work unit, and its commit captures a coherent change. Commit messages follow the convention: `[bot:plan-exec] {plan-name} - {file-name}: {summary}`. Example: `[bot:plan-exec] auth-system v2 - 02-api-routes/03-middleware.md: Implement JWT validation middleware`. This gives granular rollback (revert one work unit) without excessive commit noise (50 individual step commits for a 50-step plan would be unreadable). The plan's metadata links all commits to the plan version.

- **Q**: What happens when the target code repository is not a greenfield
  project (already has code)? Should the plan account for existing code
  structures, or does it always generate from scratch?

**A:** Plans account for existing code. The plan generation agent uses the File System MCP server's `search_in_files` and `read_file` tools to understand existing code structure before generating plan files. Plan steps reference existing files where appropriate: "Modify `src/routes/index.ts` to add the auth route" instead of "Create `src/routes/auth.ts`." The execution agent reads existing files before making changes. For greenfield projects, the plan creates all files from scratch. The plan generation skill includes guidance on how to analyze and integrate with existing codebases.

### 8.2 Execution Safety

- **Q**: Should there be a "dry run" execution mode that generates code
  but doesn't commit it? This enables human review of generated code
  before it becomes permanent.

**A:** Yes. Dry run is the default first step. The execution engine generates code into the sandbox directory but does not commit to the git repo. The user can preview generated files in the review UI (rendered diffs). Once the user approves, the code is committed. If the user rejects, the sandbox is cleaned up. This is a two-phase execution: generate → review → commit. The user can skip the review phase by enabling "auto-commit" in their settings, but the default requires review.

- **Q**: Should the execution engine have "guardrails" — limits on what
  the executing agent can do? For example, should it be prevented from
  deleting files that weren't created by the plan?

**A:** Yes. Guardrails for the execution agent: (1) Can only create/modify/delete files listed in the plan file (the plan specifies which files are touched). (2) Cannot delete files that existed before plan execution started (only files created by earlier plan steps can be deleted). (3) Cannot run shell commands outside a whitelist (build commands: `npm install`, `npm run build`, `npm test`; no arbitrary shell execution). (4) Cannot modify files outside the code repo's root directory. These guardrails are enforced at the File System MCP server level.

- **Q**: How should the execution engine handle external dependencies
  (npm packages, database migrations, API services)? Should it only
  handle file generation, or also run setup commands?

**A:** File generation + whitelisted setup commands. The execution engine can: (1) generate `package.json` changes and run `npm install`, (2) generate migration files (but NOT run them — migrations are flagged for manual execution), (3) generate config files for external services (but NOT provision them). The plan file explicitly lists setup commands: `setup_commands: ["npm install", "npm run build"]`. The execution agent runs these after file generation. Commands not in the whitelist are logged and skipped with a message: "Manual step required: run database migration."

- **Q**: Should plan execution be interruptible and resumable? If the
  server restarts during execution, can it pick up where it left off?

**A:** Yes. Execution state is persisted in the database: which plan files have been completed, which commits have been made, which file is currently in progress. If the server restarts, execution resumes from the last uncommitted plan file. Completed plan files (committed successfully) are not re-executed. The in-progress file is re-generated from scratch (since its partial output may be incomplete). The user is notified: "Plan execution was interrupted. Resuming from 03-integration/01-auth-flow.md." The `--resume` flag handles Claude Code session recovery.

---

## 9. Versioning & Rollback

### 9.1 Version Management

- **Q**: Should plan versions form a linear sequence or a tree (branching
  at rejected plans)? Linear is simpler; tree preserves the full revision
  history including rejected alternatives.

**A:** Linear sequence. Each generation produces a new version: v1, v2, v3. Rejected plans are preserved (not deleted) but the version number increments linearly. There's no branching — the user can only have one "active" plan per root spec at a time. Old versions are accessible for reference ("show me what v1 looked like") but not for execution. Linear versioning is simple, matches git's linear commit model (no branches for plan versions), and avoids the confusion of "which branch of the plan tree am I on?"

- **Q**: How long should plan history be retained? Plans reference specs
  that may change or be deleted over time, making old plans incomprehensible.
  Should old plans be "snapshotted" with their spec content?

**A:** Retain the last 10 versions per plan. Each version includes a snapshot of the spec summaries (not full content) that were in scope at generation time. This makes old plans comprehensible even if specs have changed: "This plan was based on: Auth spec v3 (summary: ...), Session spec v5 (summary: ...)." Full spec content snapshots are too storage-heavy. Summaries provide enough context for comparison. Versions older than 10 are auto-purged. Executed plans (status: completed) are retained indefinitely regardless of the 10-version cap.

- **Q**: Should plan versions be git-versioned (in the knowledge graph
  repo) or stored separately (database or separate directory)? Git
  provides diff/merge for free; separate storage is easier to query.

**A:** Both. Plan files are stored as files in the KG repo (under `plans/{plan-id}/v{N}/`) and committed via the Git MCP server. Plan metadata (version, status, timestamps, source specs) is stored in PostgreSQL for fast querying. The git history provides diffs between versions ("what changed between v1 and v2?") for free. The database provides fast queries ("show all plans in status 'approved'") without parsing files. This dual storage leverages git's strengths (diffing, history) and the database's strengths (querying, indexing).

### 9.2 Rollback

- **Q**: Should rollback be automatic on execution failure, or always
  require manual triggering? Automatic rollback is safer but may
  destroy useful partial progress.

**A:** Manual triggering with a recommendation. On execution failure, the system: (1) stops execution at the failed step, (2) preserves all committed work (previous plan files' commits are kept), (3) presents the user with options: "Step 3 failed. Options: (a) Fix the issue and retry step 3, (b) Rollback all changes from this plan, (c) Keep the partial progress and stop execution." No automatic rollback — the user decides. The system recommends option (a) for recoverable errors and option (b) for fundamental failures.

- **Q**: If a plan execution partially succeeded (steps 1-5 worked, step 6
  failed), should rollback revert ALL steps or only the failed step?
  Full rollback is cleaner; partial rollback preserves progress.

**A:** User's choice, presented clearly. Option A: "Rollback all — revert commits from steps 1–6" (git revert of all plan commits). Option B: "Rollback failed step only — keep steps 1–5, revert step 6" (git revert of the last commit only). Option C: "Keep everything — no rollback" (manual cleanup). The UI shows exactly which files would be affected by each option. Full rollback is recommended when the failure indicates a fundamental approach issue; partial rollback is recommended when the failure is isolated.

- **Q**: Should the rollback create a "rollback plan" — a plan that
  undoes the original plan step-by-step? This is more structured than
  a git revert and can handle non-file changes (database migrations).

**A:** No. Rollback uses `git revert` for code file changes — simple, reliable, well-understood. For non-file changes (database migrations, external service configurations), the rollback generates a "Manual Rollback Checklist" — a list of manual steps the user needs to take: "Revert migration 003_add_users_table: run `npm run migrate:down 003`." The checklist is presented in the UI alongside the git revert. A full rollback plan (generating reverse code) is over-engineered — git revert handles it, and the manual checklist covers the gaps.

- **Q**: How should rollback interact with collaborative environments?
  If other users have made changes to the code repo since plan execution,
  rolling back could conflict with their work.

**A:** Standard git conflict handling. Rollback is a `git revert` which creates a new commit (not a destructive reset). If the revert conflicts with subsequent commits by other users, git produces conflict markers. The execution agent presents the conflicts to the user: "Rollback conflicts with changes by [user] in [files]. Please resolve conflicts manually." The agent can suggest resolutions, but manual conflict resolution is the safe path. This is standard git workflow — no special handling needed beyond surfacing the conflicts clearly.

---

## 10. Test Verification

- **Q**: Should test generation be part of plan execution (agent writes
  tests as it writes code) or a separate post-execution phase? Integrated
  testing catches issues sooner; separate phases are cleaner.

**A:** Integrated. Each plan file can include test steps alongside implementation steps: "Step 3: Create auth middleware. Step 4: Write tests for auth middleware." The execution agent writes tests in the same pass as the implementation code, committed together. This ensures tests are always written (not skipped due to "we'll add tests later") and that the agent tests against its own implementation while the context is fresh. A separate post-execution test phase risks the agent losing context about implementation details.

- **Q**: What testing framework should be used for generated code? Should
  it match the project's existing test framework, or use a standardized
  approach? Matching is more natural; standardized is more predictable.

**A:** Match the project's existing test framework. The CLAUDE.md includes the project's test framework configuration: "Tests use Vitest with Testing Library for React components." The execution agent follows this convention. If the project has no existing tests, the default is Vitest (for TypeScript/JavaScript projects). The plan generation skill includes guidance: "Check the project's test configuration in package.json before generating tests. Use the project's existing test framework, test directory structure, and naming conventions."

- **Q**: Should there be a minimum code coverage requirement for plan
  execution to be considered successful? If so, what threshold (50%? 70%?
  90%)?

**A:** No hard coverage requirement at launch. The plan file specifies which functions/components should have tests (explicit in the plan steps), and the execution agent writes those tests. Coverage measurement is run if the project has a coverage tool configured, and the result is reported in the execution summary: "Coverage: 73% for new code." But execution is not blocked by coverage thresholds — low coverage is a warning, not a failure. A configurable coverage threshold (default: off, project admin can set 50–90%) is a future enhancement.

- **Q**: How should the system handle flaky tests in generated code? If a
  test fails intermittently, should the step be considered failed or should
  there be a "flaky test" tolerance?

**A:** Retry once. If a test fails, the execution engine re-runs the test suite once. If it passes on retry, the step is marked as "passed with flaky test warning." If it fails again, the step is marked as failed and execution pauses for user decision. The execution summary includes: "Test suite: 15 passed, 1 flaky (passed on retry), 0 failed." Flaky tests are flagged in the plan's execution report so the user knows to investigate. There is no tolerance for repeated failures — two consecutive failures means the test genuinely fails.

- **Q**: Should verification include static analysis (linting, type checking)
  in addition to runtime tests? Static analysis catches additional issues
  but adds execution time.

**A:** Yes. After generating code for each plan file, the execution engine runs: (1) TypeScript type checking (`tsc --noEmit`) — catches type errors. (2) Linting (`eslint` if configured) — catches style and potential issues. (3) Test suite — catches logic errors. Static analysis runs first (faster, catches obvious issues); tests run second. If static analysis fails, the execution agent attempts to fix the issues (type errors, lint violations) before running tests. This catches errors early and produces cleaner committed code. Static analysis adds ~5–10 seconds per plan file — acceptable.

---

## 11. Performance & Scalability

- **Q**: How long should plan generation take? For a moderate plan (30 specs,
  20 plan files), is 5 minutes acceptable? 10 minutes? The user experience
  degrades significantly beyond a few minutes.

**A:** Target: 3–5 minutes for a moderate plan (30 specs, 20 plan files). Breakdown: graph traversal (~5s) + RAG pre-fetch (~5s) + scope analysis (~30s) + plan file generation (20 files × ~10s each = ~200s) + self-review (~20s) = ~4.5 minutes. This is within the 5-minute operation timeout. Progress is streamed to the client: "Generating plan... Analyzing scope (1/4)... Generating 01-schema.md (3/20)... Self-review (4/4)..." The streaming progress makes the wait tolerable. For large plans (50+ specs), the user is warned: "This plan may take up to 5 minutes to generate."

- **Q**: Should plan generation stream progress to the user (showing which
  plan file is being generated in real time) or only show a final result?
  Streaming provides better UX for long generation times.

**A:** Stream progress. The plan generation agent emits status updates via the `stream-json` output, which the wrapper forwards to the WebSocket: (1) "Analyzing plan scope..." (2) "Scope: 30 specs, estimated 20 plan files." (3) "Generating 01-foundation/01-schema.md (1/20)..." (4) "Generating 01-foundation/02-models.md (2/20)..." (5) "Self-review pass..." (6) "Plan generation complete. Ready for review." Each completed file is immediately visible in the plan review UI, so the user can start reviewing early files while later ones are still generating.

- **Q**: Should the system support generating multiple plans concurrently
  (for different root specs)? This is useful for parallel planning but
  increases resource usage.

**A:** Yes, up to 2 concurrent plan generations per user. Each plan generation occupies 1 Claude Code process slot. With the 10-process cap and other users' needs, allowing more than 2 concurrent plan generations per user would be greedy. The UI shows both generations in progress with their respective streaming updates. Concurrent generation is useful when planning multiple independent features simultaneously (e.g., auth system + notification system).

- **Q**: How should the system handle very large plans (100+ plan files)?
  Should there be a plan size limit, or should large plans be
  automatically split into sub-plans?

**A:** Plan size limit of 30 plan files. If the scope analysis determines that the plan would require more than 30 files, the agent recommends splitting: "This plan would require 45 files. I recommend splitting into 2 sub-plans: (1) Auth backend (18 files), (2) Auth frontend + integration (15 files)." The user approves the split, and the agent generates each sub-plan separately. The sub-plans are linked in the KG (via `depends-on` edges between plan nodes). This keeps each plan reviewable and executable within the 5-minute timeout.

---

## 12. Integration with Code Generation

- **Q**: How does plan generation relate to `12-CODE-GENERATION/PLAN.md`?
  Is plan generation the "what to do" and code generation the "doing it"?
  If so, what's the interface between them?

**A:** Exactly. Plan generation produces "what to do" — structured plan files describing implementation steps, sequencing, and dependencies. Code generation (plan execution) is "doing it" — Claude Code reads plan files and generates/modifies actual source code. The interface between them is the plan file itself: the execution agent reads the plan file's steps, references source specs via MCP tools for detailed requirements, and generates code accordingly. The plan file is the contract between the planning agent and the execution agent.

- **Q**: Should plans be reusable across different target repositories?
  A plan generated from the knowledge graph describes "what" to build.
  Could the same plan be executed against different tech stacks?

**A:** Not directly reusable. Plans reference specific file paths, frameworks, and conventions that are repository-specific. However, since plans are derived from specs (which are technology-agnostic requirements), a user could regenerate a plan for a different repo using the same source specs but different project context (different CLAUDE.md, different conventions). The plan generation agent adapts the plan to the target project's tech stack based on CLAUDE.md and existing code analysis. Same specs, different plans, different repos.

- **Q**: Should the plan system support "plan composition" — combining
  multiple smaller plans into a larger execution? This enables modular
  planning but adds orchestration complexity.

**A:** Yes, via the master prompt. Multiple sub-plans can be referenced in a parent plan's master prompt: "Execute sub-plan 'auth-backend' (Phase 1), then sub-plan 'auth-frontend' (Phase 2)." The execution engine treats each sub-plan as a phase and runs them in sequence. Sub-plans are linked via `depends-on` edges in the KG. This enables modular planning (each sub-plan is independently reviewable and versionable) without complex orchestration — the parent plan's master prompt is the composition mechanism.

- **Q**: Should the execution engine support different execution strategies
  (e.g., Claude Code for TypeScript projects, a different agent for Python
  projects)?

**A:** Claude Code for all projects at launch. Claude Code handles TypeScript, Python, Rust, Go, and other languages through its underlying model capabilities. The execution agent adapts to the project's language based on the CLAUDE.md and existing code context — no separate execution strategies per language. If a language-specific execution agent is needed in the future (e.g., a specialized Rust agent), it would be a new agent type with its own MCP tool configuration, integrated through the existing orchestration layer.

---

## Decision Log

> Record decisions as questions are resolved.

| Date | Question | Decision | Rationale |
| ---- | -------- | -------- | --------- |
| —    | —        | —        | —         |
