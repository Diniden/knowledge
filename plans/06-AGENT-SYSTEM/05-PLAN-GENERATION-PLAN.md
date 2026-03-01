# 06-AGENT-SYSTEM / 05 — PLAN GENERATION PLAN

> **Purpose**: Define the complete plan generation system including plan output
> format and directory structure, graph traversal for plan context, RAG
> supplementary retrieval, delta detection, full vs. delta build modes,
> plan-as-knowledge-graph integration, review and approval workflows, plan
> execution integration, versioning, rollback, execution tracking, and
> test verification.
>
> **Phase**: 4 (Advanced Features)
> **Dependencies**: `06-AGENT-SYSTEM/03-MCP-SERVERS-PLAN.md`, `04-KNOWLEDGE-GRAPH/02-OPERATIONS-PLAN.md`
> **Estimated tasks**: 135+
>
> **SANDBOXING NOTE**: This plan covers **APPLICATION-RUNTIME** plan generation —
> how the running application generates execution plans for end users.
> This is SEPARATE from DEVELOPMENT-TIME AI configuration
> (`13-AI-DEV-CONFIGURATION/PLAN.md`).

---

## Table of Contents

1. [Plan Output Format](#1-plan-output-format)
2. [Plan Directory Structure](#2-plan-directory-structure)
3. [Master Prompt Plan](#3-master-prompt-plan)
4. [Directory-Level Execution Plans](#4-directory-level-execution-plans)
5. [Plan File Content Structure](#5-plan-file-content-structure)
6. [Graph Traversal for Plan Generation](#6-graph-traversal-for-plan-generation)
7. [RAG Supplementary Context Retrieval](#7-rag-supplementary-context-retrieval)
8. [Delta Detection](#8-delta-detection)
9. [Full Build vs. Delta Build Modes](#9-full-build-vs-delta-build-modes)
10. [Plan-as-Knowledge-Graph](#10-plan-as-knowledge-graph)
11. [Plan Review & Approval Workflow](#11-plan-review--approval-workflow)
12. [Plan Execution Integration](#12-plan-execution-integration)
13. [Plan Versioning](#13-plan-versioning)
14. [Plan Rollback](#14-plan-rollback)
15. [Execution Tracking](#15-execution-tracking)
16. [Test Verification](#16-test-verification)

---

## 1. Plan Output Format

### 1.1 Plan Metadata Schema

- [ ] **AG-PG-001**: Define `plan-metadata.json` schema
  ```json
  {
    "type": "object",
    "properties": {
      "id": { "type": "string", "pattern": "^pl_[A-Za-z0-9_-]{21}$" },
      "title": { "type": "string" },
      "rootSpecId": { "type": "string", "pattern": "^sp_" },
      "mode": { "enum": ["full", "delta"] },
      "status": { "enum": ["generating", "draft", "approved", "executing", "completed", "failed", "rolled-back"] },
      "version": { "type": "integer", "minimum": 1 },
      "previousVersionId": { "type": "string" },
      "specIds": { "type": "array", "items": { "type": "string" } },
      "specCount": { "type": "integer" },
      "fileCount": { "type": "integer" },
      "directoryCount": { "type": "integer" },
      "generatedAt": { "type": "string", "format": "date-time" },
      "generatedBy": { "type": "string" },
      "approvedAt": { "type": "string", "format": "date-time" },
      "approvedBy": { "type": "string" },
      "executionStartedAt": { "type": "string", "format": "date-time" },
      "executionCompletedAt": { "type": "string", "format": "date-time" },
      "deltaBaseline": { "type": "string", "description": "Commit hash or timestamp of the baseline for delta mode" },
      "targetRepository": { "type": "string", "description": "Path or URL of the code repo this plan targets" },
      "tags": { "type": "array", "items": { "type": "string" } }
    },
    "required": ["id", "title", "rootSpecId", "mode", "status", "version", "specIds", "generatedAt", "generatedBy"]
  }
  ```
- [ ] **AG-PG-002**: Define plan status lifecycle
  - `generating` → plan is being built by the agent
  - `draft` → plan is complete, awaiting review
  - `approved` → plan is approved for execution
  - `executing` → plan is being executed against a code repo
  - `completed` → execution finished successfully
  - `failed` → execution failed (partial or complete)
  - `rolled-back` → plan execution was rolled back
  - Valid transitions: generating→draft, draft→approved, approved→executing, executing→completed/failed, completed/failed→rolled-back
- [ ] **AG-PG-003**: Define plan ID generation
  - Use prefix `pl_` with nanoid: `pl_V1StGXR8_Z5jdHi6B-myT`
  - IDs are globally unique across all plans
  - Never reused (even after deletion)
- [ ] **AG-PG-004**: Implement plan metadata creation
  - Generate plan ID
  - Set initial status to `generating`
  - Capture root spec ID, mode, and generating user
  - Write `plan-metadata.json` to plan directory
  - Return plan handle for subsequent operations

### 1.2 Plan File Format

- [ ] **AG-PG-005**: Define individual plan file format (Markdown)
  ```markdown
  ---
  planId: pl_xxx
  directory: 01-foundation
  sequence: 1
  title: Project Setup
  sourceSpecs:
    - sp_abc123
    - sp_def456
  dependencies:
    - 01-foundation/plan-00-prerequisites.md
  estimatedDuration: 30min
  parallelGroup: foundation
  ---

  # Project Setup

  ## Objective
  {What this plan step accomplishes}

  ## Context
  {Relevant knowledge from source specs}

  ## Steps
  1. {Step 1 with specific instructions}
  2. {Step 2 with specific instructions}
  ...

  ## Expected Outcome
  {What should exist after this step completes}

  ## Verification
  {How to verify this step was executed correctly}
  ```
- [ ] **AG-PG-006**: Define plan file frontmatter schema
  - `planId`: parent plan ID
  - `directory`: which directory this file belongs to
  - `sequence`: execution order within the directory (0-based)
  - `title`: human-readable step title
  - `sourceSpecs`: array of spec IDs this step is based on
  - `dependencies`: array of plan file paths that must complete first
  - `estimatedDuration`: estimated execution time
  - `parallelGroup`: name of the parallel execution group
- [ ] **AG-PG-007**: Define plan file body sections
  - Objective: 1-3 sentences stating the goal
  - Context: relevant knowledge extracted from source specs and RAG
  - Steps: numbered, specific, actionable instructions
  - Expected Outcome: concrete deliverables or state changes
  - Verification: test commands, file checks, or validation criteria
  - Optional: Notes, Warnings, Rollback Instructions

#### Design Decisions

> **Q**: Should plan files use Markdown or a structured format like YAML/JSON?
> **A**: Markdown with YAML frontmatter. Plan files are `.md` with a YAML frontmatter block for machine-parseable metadata and a Markdown body for human-readable step descriptions. The frontmatter is parsed by the execution engine, and the body is read by agents and reviewers.

> **Q**: Should plan frontmatter use YAML, JSON, or a custom format?
> **A**: YAML. YAML frontmatter is the de facto standard for Markdown files and familiar to developers and agents. JSON frontmatter would look unusual and require escaped strings; YAML is only used in plan file frontmatter.

> **Q**: How granular should individual plan files be — one per spec, per work unit, or per component?
> **A**: One file per logical work unit, which is a coherent implementation task referencing 1–3 source specs. This avoids fragmenting related work (one-per-spec) and unwieldy sizes (one-per-component). The plan generation agent determines work units by analyzing spec dependencies.

> **Q**: Should plan files include code snippets or pseudo-code for implementation guidance?
> **A**: Yes, include pseudo-code for complex steps only — database schemas, API signatures, component interfaces. Simple steps don't need pseudo-code. Hints are prefixed with `> Implementation hint:` to distinguish them from step descriptions.

---

## 2. Plan Directory Structure

### 2.1 Root Plan Directory

- [ ] **AG-PG-008**: Define plan root directory structure
  ```
  plans/{plan-id}/
  ├── plan-metadata.json              # Plan metadata
  ├── master-plan.md                  # Master prompt plan
  ├── spec-map.json                   # Spec ID → plan file mapping
  ├── execution-status.json           # Per-step execution status
  ├── 00-prerequisites/               # Serial: setup and prerequisites
  │   ├── plan-00-environment.md
  │   └── plan-01-dependencies.md
  ├── 01-foundation/                  # Parallel group: foundation
  │   ├── plan-00-project-setup.md
  │   ├── plan-01-config.md
  │   └── plan-02-base-types.md
  ├── 02-core/                        # Parallel group: core systems
  │   ├── plan-00-data-model.md
  │   ├── plan-01-api-layer.md
  │   └── plan-02-business-logic.md
  └── 03-integration/                 # Serial: integration and testing
      ├── plan-00-integration.md
      └── plan-01-testing.md
  ```
- [ ] **AG-PG-009**: Define directory naming convention
  - Directories are numbered: `{NN}-{descriptive-name}/`
  - Numbers determine execution order for serial directories
  - Directories at the same level with different numbers execute serially
  - Directories tagged as `parallelGroup` execute in parallel
- [ ] **AG-PG-010**: Define file naming convention within directories
  - Files are numbered: `plan-{NN}-{descriptive-name}.md`
  - Numbers determine execution order within the directory (serial)
  - Files within a single directory always execute serially
- [ ] **AG-PG-011**: Define parallel vs. serial execution rules
  - **Parallel**: Directories in the same parallel group execute concurrently
  - **Serial**: Files within a directory execute in sequence
  - **Cross-directory dependencies**: a file can depend on files in other directories
  - Execution engine resolves the dependency graph to determine actual order
- [ ] **AG-PG-012**: Create plan directory builder utility
  - Accept plan structure definition (directories, files, parallel groups)
  - Create directory tree
  - Validate: no circular dependencies, all referenced files exist
  - Return list of created paths

### 2.2 Supporting Files

- [ ] **AG-PG-013**: Define `spec-map.json` schema
  ```json
  {
    "type": "object",
    "properties": {
      "planId": { "type": "string" },
      "generatedAt": { "type": "string", "format": "date-time" },
      "mappings": {
        "type": "object",
        "additionalProperties": {
          "type": "array",
          "items": { "type": "string" }
        }
      }
    }
  }
  ```
  - Keys: spec IDs, values: array of plan file paths that reference this spec
  - Enables traceability: for any spec, find all plan steps that use it
  - Enables impact analysis: if a spec changes, which plan steps are affected
- [ ] **AG-PG-014**: Define `execution-status.json` schema
  ```json
  {
    "type": "object",
    "properties": {
      "planId": { "type": "string" },
      "overallStatus": { "type": "string" },
      "startedAt": { "type": "string" },
      "completedAt": { "type": "string" },
      "steps": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "filePath": { "type": "string" },
            "status": { "enum": ["pending", "queued", "executing", "completed", "failed", "skipped"] },
            "startedAt": { "type": "string" },
            "completedAt": { "type": "string" },
            "error": { "type": "string" },
            "output": { "type": "string" },
            "retryCount": { "type": "integer" }
          }
        }
      }
    }
  }
  ```

#### Design Decisions

> **Q**: How should the plan generation agent determine which directories are parallel vs. serial?
> **A**: Primarily graph analysis of spec `depends-on` edges to build a dependency DAG. Lightweight heuristics are tiebreakers: specs tagged with different layers default to parallel, specs with shared dependencies default to serial.

> **Q**: Should parallel group assignment be shown in directory names?
> **A**: No brackets in directory names. Parallel groups are indicated by the master prompt file, which lists execution order by phase. Directories are numbered sequentially for reading order; the master prompt defines execution semantics.

> **Q**: What is the maximum number of parallel directories?
> **A**: Cap at 4 parallel directories per phase. This maps to the execution engine constraint of not consuming all 10 process slots. If graph analysis suggests more than 4, the agent groups related tracks together.

> **Q**: Should there be checkpoints between parallel groups?
> **A**: Yes. The plan is organized in phases, and each phase is a checkpoint. Within a phase, directories are parallel; between phases, all parallel directories must complete before the next phase begins.

---

## 3. Master Prompt Plan

### 3.1 Master Plan Content

- [ ] **AG-PG-015**: Define master plan structure
  ```markdown
  # Master Plan: {Root Spec Title}

  ## Plan ID
  {planId}

  ## Generated
  {date} by {agent/user} in {mode} mode

  ## Overview
  {High-level description of what this plan achieves}

  ## Source Specs
  {List of all specs included in this plan with brief descriptions}

  ## Architecture
  {How the plan is organized: parallel groups, serial sequences}

  ## Execution Order
  1. {Directory/group name} — {description}
     - {file 1}: {step title}
     - {file 2}: {step title}
  2. ...

  ## Dependencies
  {External dependencies: tools, APIs, environments}

  ## Risks & Mitigations
  {Known risks and how to handle them}

  ## Rollback Strategy
  {How to undo this plan if execution fails}

  ## Delta Summary (if delta mode)
  {What changed since the previous plan version}
  ```
- [ ] **AG-PG-016**: Implement master plan generation
  - Receive traversed subgraph (specs + edges + RAG context)
  - Analyze spec relationships to determine plan structure
  - Group specs into logical work units (directories)
  - Determine execution order based on `depends-on` edges
  - Identify parallel opportunities (independent spec groups)
  - Write master plan file
- [ ] **AG-PG-017**: Implement dependency analysis for plan structure
  - Build directed acyclic graph (DAG) from spec dependencies
  - Topological sort to determine execution order
  - Group specs at the same topological level into parallel groups
  - Detect cycles (should not exist if graph is well-formed; flag as inquiry if found)
- [ ] **AG-PG-018**: Implement plan scope determination
  - From root spec, determine which specs to include
  - Include: all specs reachable via `depends-on` and `derived-from` edges
  - Optionally include: `related-to` edges (configurable depth)
  - Exclude: `contradicts` edges (flag for resolution)
  - Exclude: deprecated and archived specs

#### Design Decisions

> **Q**: Should plan composition — combining multiple smaller plans into a larger execution — be supported?
> **A**: Yes, via the master prompt. Multiple sub-plans are referenced in a parent plan's master prompt and executed as sequential phases. Sub-plans are linked via `depends-on` edges in the KG, enabling modular planning without complex orchestration.

---

## 4. Directory-Level Execution Plans

### 4.1 Directory Plan Generation

- [ ] **AG-PG-019**: Implement directory creation from spec grouping
  - Group specs by topic area (inferred from tags, edges, content similarity)
  - Each group becomes a directory in the plan
  - Name directories descriptively based on the group's theme
  - Assign parallel group labels based on dependency analysis
- [ ] **AG-PG-020**: Implement intra-directory file ordering
  - Within a directory, order files by dependency
  - Foundation/setup steps first, integration/testing steps last
  - Each file addresses one or a few closely related specs
  - File count per directory: target 3-10 files (split large groups)
- [ ] **AG-PG-021**: Implement directory-level metadata
  - Each directory gets a `_directory-info.json` with:
    - Directory name and description
    - Parallel group assignment
    - Prerequisites (other directories that must complete first)
    - Spec IDs covered in this directory
    - Estimated total duration

### 4.2 Parallel Execution Groups

- [ ] **AG-PG-022**: Define parallel group assignment algorithm
  - Two directories can run in parallel if:
    - No specs in directory A depend-on specs in directory B (or vice versa)
    - No plan files in A list dependencies on files in B (or vice versa)
  - Group independent directories into named parallel groups
  - Sequential groups: directories with cross-dependencies execute in order
- [ ] **AG-PG-023**: Implement parallel group validation
  - Verify no circular dependencies between parallel groups
  - Verify parallel directories don't write to the same files (conflict check)
  - Verify resource requirements don't exceed available capacity
  - Flag warnings for groups that are technically parallel but share common resources
- [ ] **AG-PG-024**: Implement execution ordering within parallel groups
  - Within a parallel group: all directories start simultaneously
  - Within each directory: files execute serially (by sequence number)
  - Cross-directory dependencies within a group: wait for prerequisite completion
  - Model as a DAG and use topological execution

#### Design Decisions

> **Q**: What is the optimal number of plan files per directory?
> **A**: 3–8 plan files per directory, targeting 5. Fewer than 3 suggests merging directories; more than 8 suggests splitting. Files are numbered for execution order within the directory.

> **Q**: Should plan files within a directory share context or be self-contained?
> **A**: Shared context via a directory `README.md` providing purpose, relevant spec summaries, and architectural context. Individual plan files reference this shared context, reducing repetition (~200 tokens saved per file) and ensuring consistency.

> **Q**: Should there be a mandatory cleanup file at the end of each directory?
> **A**: No mandatory per-directory cleanup. The last file in each directory includes cleanup in its steps if needed. The plan's final directory includes a project-level `01-cleanup.md` for linting, import verification, and documentation updates.

---

## 5. Plan File Content Structure

### 5.1 Content Generation

- [ ] **AG-PG-025**: Implement plan step generation from spec content
  - For each spec assigned to a plan file:
    1. Read full spec content
    2. Extract actionable requirements and specifications
    3. Transform requirements into execution steps
    4. Include implementation hints (from RAG context)
    5. Define expected outcomes and verification criteria
- [ ] **AG-PG-026**: Implement context enrichment from RAG
  - For each plan step: search RAG for relevant supplementary content
  - Include: code examples, design patterns, API documentation
  - RAG results supplement spec content (not replace it)
  - Attribute RAG content to source specs
- [ ] **AG-PG-027**: Implement cross-reference linking in plan files
  - Reference source specs: `[Spec: {title}](spec:{specId})`
  - Reference other plan files: `[See: {title}](plan:{filePath})`
  - Reference edge relationships: explain WHY specs are connected
  - Enable traceability from every plan step back to source knowledge

### 5.2 Step Granularity

- [ ] **AG-PG-028**: Define step granularity guidelines
  - Each step should take 5-30 minutes to execute manually
  - Each step should produce a verifiable artifact (file, test, config)
  - Steps should be atomic: either fully completed or not started
  - Avoid steps that require human judgment (those become review checkpoints)
- [ ] **AG-PG-029**: Implement step decomposition for complex specs
  - If a spec contains multiple requirements: split into multiple steps
  - If a spec requires coordination with other specs: create an integration step
  - If a spec has prerequisites: create setup steps
  - Target: 5-15 steps per plan file
- [ ] **AG-PG-030**: Implement verification step generation
  - For each implementation step: generate a verification step
  - Verification types:
    - File existence check: verify expected files were created
    - Compilation check: verify code compiles without errors
    - Test execution: run associated tests
    - Structural check: verify file structure matches expected layout
    - Content check: verify key content patterns are present

#### Design Decisions

> **Q**: How detailed should plan steps be?
> **A**: Medium detail: specific enough to be unambiguous, flexible enough for implementation decisions. Each step specifies what to create, where it goes, what it does, and key constraints — but not exact implementation code.

> **Q**: Should plans include estimated effort per step?
> **A**: Yes, estimated by the generating agent as `small | medium | large` (not hours). Small = single file; medium = 2–5 files; large = 5+ files or complex logic. Estimates help reviewers prioritize and the execution engine allocate time budgets.

> **Q**: Should plans include risk assessment per step?
> **A**: Yes, for high-risk steps only — database schema changes, deletions, auth modifications, shared infrastructure changes. These are flagged in frontmatter with a `risk_note`. Low-risk steps are not flagged to avoid clutter.

> **Q**: Should plans include alternative approaches for each step?
> **A**: No. The plan presents one opinionated approach. Design alternatives belong in specs. If the user disagrees, they provide feedback during review and the agent regenerates with that constraint.

---

## 6. Graph Traversal for Plan Generation

### 6.1 Traversal Strategy

- [ ] **AG-PG-031**: Implement plan-specific graph traversal
  - Start from root spec
  - Traverse `depends-on` edges (essential for build order)
  - Traverse `derived-from` edges (implementations of specifications)
  - Include `related-to` edges at reduced priority (supplementary context)
  - Skip `contradicts` edges (flag for resolution)
  - Skip `supersedes` edges to deprecated specs (use the newer version)
- [ ] **AG-PG-032**: Implement depth-limited traversal
  - Default depth: 5 hops from root spec
  - Configurable per plan generation request
  - Stop early if subgraph exceeds configured max specs (default: 100)
  - Prioritize depth over breadth for `depends-on` chains
  - Prioritize breadth over depth for `related-to` edges
- [ ] **AG-PG-033**: Implement traversal result structuring
  - Return traversal results as a typed subgraph
  - Include: full spec content for directly referenced specs
  - Include: summaries for transitively reached specs
  - Include: all edges between included specs
  - Include: traversal metadata (hop distance from root per spec)

### 6.2 Traversal Optimization

- [ ] **AG-PG-034**: Implement traversal caching
  - Cache subgraph results per (root spec, depth, filters) tuple
  - Cache TTL: 10 minutes (specs may change during a session)
  - Invalidate cache on spec/edge CRUD events
- [ ] **AG-PG-035**: Implement incremental traversal
  - For delta builds: traverse only from changed specs
  - Compare current subgraph against previous plan's subgraph
  - Identify: added specs, removed specs, changed specs
  - Generate incremental update instead of full re-traversal
- [ ] **AG-PG-036**: Implement traversal filtering
  - Filter by spec status: exclude deprecated/archived by default
  - Filter by edge confidence: minimum confidence threshold (default: 0.3)
  - Filter by edge strength: optionally exclude weak edges
  - Filter by tags: include only specs matching specific tags

#### Design Decisions

> **Q**: How should traversal handle large knowledge graphs (1000+ specs)?
> **A**: User curation as an option. The agent performs default traversal, presents a "Plan Scope" summary with spec counts by area, and the user can approve, narrow, or expand scope before generation proceeds.

> **Q**: Should traversal follow all edge types or only `depends-on` and `derived-from`?
> **A**: `depends-on` and `derived-from` only for the primary traversal. `related-to` edges are excluded from scope but surfaced in the plan README as informational references.

> **Q**: How should traversal handle densely connected spec clusters?
> **A**: Lightweight cluster detection. If traversal enters a cluster (>10 specs within 2 hops), include entry-point specs directly connected to the root path and summarize the rest. The user can expand coverage during scoping review.

> **Q**: Should plans be scoped to a single project layer or span multiple layers?
> **A**: Plans span all relevant layers. A feature naturally crosses layers (database → backend → frontend), organized into parallel directories by phase. Single-layer plans would force multiple plan generations for one feature.

> **Q**: Should graph traversal results be cached between plan generation sessions?
> **A**: Reused with a freshness check. The cached traversal is validated against spec modification timestamps. If specs changed, the traversal is re-run. Cache is per-plan and cleared on finalization or abandonment.

> **Q**: Should graph traversal be done server-side or by the agent via MCP?
> **A**: Agent-side via MCP tool calls. This gives the agent control over scope — it can adjust depth, filter paths, and make intelligent narrowing decisions. The ~1 second latency per call is acceptable for plan generation.

---

## 7. RAG Supplementary Context Retrieval

### 7.1 RAG Integration

- [ ] **AG-PG-037**: Implement RAG context retrieval for plan generation
  - For each spec in the plan: query RAG for related context
  - Query: spec title + spec summary as search terms
  - Top-K: 3 results per spec (configurable)
  - Deduplicate: if same chunk appears for multiple specs, include once
- [ ] **AG-PG-038**: Implement RAG result filtering for plan relevance
  - Minimum relevance score: 0.6 (higher threshold than dialog agent)
  - Prefer RAG results from specs already in the plan (reinforces connections)
  - Exclude RAG results from deprecated/archived specs
  - Weight results by how closely they match the plan's domain
- [ ] **AG-PG-039**: Implement RAG context injection into plan steps
  - Inject relevant RAG context into the "Context" section of plan files
  - Attribute content to source specs
  - Include only the most relevant chunks (not full spec content)
  - Mark RAG-sourced content distinctly from spec-sourced content
- [ ] **AG-PG-040**: Implement RAG batch retrieval for efficiency
  - Batch all spec queries into a single RAG request (if supported)
  - Or parallelize individual queries for performance
  - Cache RAG results per plan generation session
  - Track which RAG results were actually used in the plan

#### Design Decisions

> **Q**: How should RAG context be balanced against graph context?
> **A**: RAG supplements graph traversal with cross-cutting semantic context that may not be expressed as edges. Graph traversal defines plan scope; RAG enriches plans with patterns, conventions, and similar implementations discovered semantically.

> **Q**: Should RAG queries be generated from individual spec content or from the plan's overall theme?
> **A**: Both. One theme-level query at plan start surfaces cross-cutting concerns (security policies, API standards). Per-file queries during generation surface implementation-specific context. Theme results go in the README; per-file results inform individual plan content.

> **Q**: What is the token budget for RAG context per plan file?
> **A**: 1,500 tokens (3 results × 500 truncated tokens). RAG context informs the agent's reasoning during generation but is not embedded in the plan file itself. Plan files reference source specs by ID, not RAG chunks.

> **Q**: Should RAG results be pre-fetched or fetched on-demand per plan file?
> **A**: Pre-fetched. All RAG queries run before plan file generation begins, cached in the session context. This adds ~5 seconds upfront but saves ~20 seconds total compared to per-file queries, and results are stable across files.

---

## 8. Delta Detection

### 8.1 Change Detection

- [ ] **AG-PG-041**: Implement spec change detection since baseline
  - Accept baseline: commit hash, timestamp, or previous plan ID
  - Query knowledge graph for specs modified since baseline
  - Classify changes: created, updated (content), updated (metadata only), deleted
  - Include the specific fields that changed (title, content, tags, status)
- [ ] **AG-PG-042**: Implement edge change detection since baseline
  - Find edges created, modified, or deleted since baseline
  - Classify by change type and affected specs
  - New edges may require new plan sections; deleted edges may obsolete sections
- [ ] **AG-PG-043**: Implement cascading impact analysis
  - For each changed spec: identify plan files that reference it
  - For each changed edge: identify plan files affected by the relationship change
  - Determine transitive impact: if spec A changed and plan file P depends on A,
    and plan file Q depends on P, then Q may also be affected
  - Return impact graph: changed spec → affected plan files → cascade effects

### 8.2 Delta Report

- [ ] **AG-PG-044**: Define delta report format
  ```json
  {
    "planId": "pl_xxx",
    "baselineId": "pl_yyy",
    "baselineTimestamp": "2026-02-20T...",
    "changes": {
      "specsCreated": [{ "specId": "sp_...", "title": "..." }],
      "specsUpdated": [{ "specId": "sp_...", "title": "...", "changedFields": ["content", "tags"] }],
      "specsDeleted": [{ "specId": "sp_...", "title": "..." }],
      "edgesCreated": [{ "edgeId": "eg_...", "type": "...", "source": "...", "target": "..." }],
      "edgesDeleted": [{ "edgeId": "eg_...", "type": "..." }]
    },
    "impact": {
      "planFilesAffected": ["01-foundation/plan-02-config.md", ...],
      "planFilesObsoleted": [...],
      "newPlanFilesNeeded": [...]
    }
  }
  ```
- [ ] **AG-PG-045**: Implement delta report generation
  - Run change detection against baseline
  - Map changes to plan impact using spec-map.json
  - Classify impact: affected (needs update), obsoleted (should remove), new (needs creation)
  - Generate human-readable delta summary for review
- [ ] **AG-PG-046**: Implement delta significance scoring
  - Score each change by impact severity (0-10)
  - Content changes: high impact (spec meaning changed)
  - Metadata-only changes: low impact (may not affect plan)
  - Edge changes: medium impact (relationship structure changed)
  - Aggregate score determines if delta build is warranted

#### Design Decisions

> **Q**: What should the baseline for delta detection be?
> **A**: The previous plan version's generation timestamp, stored in plan metadata as `generated_at`. This captures all changes since the last plan generation, avoiding coupling to git commits or execution timestamps.

> **Q**: How should cascading changes be handled when a dependency's spec changes?
> **A**: Directly changed specs get full plan file regeneration. Indirectly affected specs (unchanged content but with a changed ancestor) get a review pass where the agent checks if the existing plan file is still valid.

> **Q**: Should metadata-only changes (tags, summary) trigger delta plan regeneration?
> **A**: No, only content changes trigger regeneration. Plan steps are derived from spec content (requirements, constraints, acceptance criteria), not metadata. Tag changes affecting scope should trigger a full rebuild instead.

> **Q**: Should edge changes (new/deleted edges) trigger plan regeneration?
> **A**: Yes. Edge changes that affect plan scope trigger delta regeneration — new `depends-on` edges re-evaluate execution order, deleted edges re-evaluate sequencing, and new edges bringing out-of-scope specs in are flagged for user review.

---

## 9. Full Build vs. Delta Build Modes

### 9.1 Full Build Mode

- [ ] **AG-PG-047**: Implement full build plan generation pipeline
  1. Traverse graph from root spec (full subgraph)
  2. Retrieve RAG context for all included specs
  3. Determine plan structure (directories, parallel groups)
  4. Generate master plan
  5. Generate directory-level plans
  6. Generate individual plan files
  7. Build spec map
  8. Validate plan structure
  9. Set status to `draft`
- [ ] **AG-PG-048**: Define when full build is required
  - First plan for a project (no previous plan exists)
  - Major structural changes (>30% of specs changed)
  - User explicitly requests full rebuild
  - Previous plan is incompatible (schema version mismatch)
  - Delta build fails or produces inconsistent results

### 9.2 Delta Build Mode

- [ ] **AG-PG-049**: Implement delta build plan generation pipeline
  1. Load previous plan metadata and spec map
  2. Run delta detection against previous plan's baseline
  3. Generate delta report
  4. Determine affected plan files
  5. Regenerate only affected plan files
  6. Update master plan with delta summary
  7. Update spec map with new/changed mappings
  8. Validate updated plan structure
  9. Set status to `draft`
- [ ] **AG-PG-050**: Implement delta plan file regeneration
  - For affected files: regenerate from current spec content
  - For obsoleted files: mark as removed (keep in plan for history)
  - For new specs: generate new plan files and assign to directories
  - Preserve unaffected plan files verbatim (no unnecessary changes)
- [ ] **AG-PG-051**: Implement delta plan structural adjustment
  - If new specs create a new topic area: add a new directory
  - If deleted specs empty a directory: mark directory as obsoleted
  - If dependency changes alter execution order: recompute parallel groups
  - Minimize structural changes to reduce review burden
- [ ] **AG-PG-052**: Define delta build heuristics
  - If < 10% of specs changed: delta build (targeted updates)
  - If 10-30% of specs changed: delta build with structural review
  - If > 30% of specs changed: recommend full build
  - User can override heuristic in either direction

#### Design Decisions

> **Q**: Should only affected plan files be regenerated in delta builds, or the entire plan?
> **A**: Targeted regeneration of affected files only. Unchanged plan files are preserved as-is, maintaining the user's review state. The master prompt and affected directory READMEs are updated. If inconsistencies arise, the agent flags them and recommends a full rebuild.

> **Q**: How should delta builds handle structural changes (new directories, reordering phases)?
> **A**: Structural changes require a full build. Delta builds handle content changes within existing plan files only. The system detects structural changes (new spec not fitting existing directories, reversed dependency order) and returns a recommendation to rebuild.

> **Q**: Should there be a delta preview mode before committing to generation?
> **A**: Yes. The `analyze_plan_delta` tool returns a preview: changed specs, affected plan files, structural change detection, and a delta-vs-full-build recommendation. This costs one MCP call (~500ms) and helps the user understand blast radius before committing.

---

## 10. Plan-as-Knowledge-Graph

### 10.1 Plan-Spec Linkage

- [ ] **AG-PG-053**: Implement bidirectional spec-plan linking
  - Plan files reference source spec IDs (in frontmatter `sourceSpecs`)
  - Spec metadata tracks which plans reference them (in `custom.planReferences`)
  - Enable: "show me all plans that use this spec" queries
  - Enable: "show me which specs drive this plan step" queries
- [ ] **AG-PG-054**: Implement plan change propagation notifications
  - When a spec changes: check spec-map for affected plans
  - Emit notification: "Spec X changed; plans [P1, P2] may need updating"
  - Display in UI: spec editor shows "used in plans" indicator
  - Display in UI: plan view shows "stale" indicator for affected steps
- [ ] **AG-PG-055**: Implement spec-plan coverage analysis
  - Identify specs included in at least one plan ("planned")
  - Identify specs not in any plan ("unplanned")
  - Report coverage: % of active specs included in plans
  - Flag unplanned specs that have `depends-on` connections to planned specs

### 10.2 Plan Graph Integration

- [ ] **AG-PG-056**: Create plan entities in the knowledge graph (optional)
  - Represent plans as special-type nodes in the graph
  - Create edges: plan → spec (type: `includes-in-plan`)
  - Enable graph visualization of plan coverage
  - Enable graph queries: "which specs are not in any plan?"
- [ ] **AG-PG-057**: Implement plan dependency graph
  - Model inter-plan dependencies (plan A must complete before plan B)
  - Based on spec dependencies that span multiple plans
  - Visualize plan dependency graph for project managers
- [ ] **AG-PG-058**: Implement plan-spec synchronization check
  - Periodic check: are all plans current with their source specs?
  - Report stale plans: plans where source specs changed after plan generation
  - Recommend delta builds for stale plans
  - Integrate with inquiry system: create inquiries for stale plans

#### Design Decisions

> **Q**: Should plans be represented as nodes in the knowledge graph?
> **A**: Yes. Each plan is a node of type `plan` with metadata (root spec, version, status, dates, summary). Plan files are not individual nodes. This enables coverage analysis, navigation, and dashboard queries across all plans.

> **Q**: Should plan-spec edges use a new edge type or reuse `related-to`?
> **A**: New edge type: `planned-by` (spec → plan). This is semantically distinct from `related-to` and `depends-on`, enabling precise queries like "find all specs with no `planned-by` edges" for unplanned spec identification.

> **Q**: Should spec coverage analysis be a plan system or knowledge graph feature?
> **A**: Knowledge graph system, using the `planned-by` edge type. The KG MCP server provides a `get_unplanned_specs` convenience tool. The plan UI surfaces this as a "Coverage" view — the data lives in the KG, the visualization lives in the plan UI.

> **Q**: Should the plan system auto-create specs for lessons learned after execution failures?
> **A**: No automatic spec creation. The agent suggests creating a spec from undocumented requirements discovered during execution, and the user decides. Automatic creation would generate noisy, low-quality specs.

---

## 11. Plan Review & Approval Workflow

### 11.1 Review Interface

- [ ] **AG-PG-059**: Implement plan review API endpoints
  - `GET /api/v1/plans/:planId` — get plan with all files
  - `GET /api/v1/plans/:planId/diff` — get diff from previous version
  - `POST /api/v1/plans/:planId/approve` — approve plan
  - `POST /api/v1/plans/:planId/reject` — reject with feedback
  - `POST /api/v1/plans/:planId/comment` — add review comment
- [ ] **AG-PG-060**: Implement plan diff visualization
  - For delta builds: show diff between previous and current plan files
  - Highlight: new files, modified files, removed files
  - For modified files: show inline diff of content changes
  - Include delta report summary at the top
- [ ] **AG-PG-061**: Implement plan review comments
  - Attach comments to specific plan files or specific lines
  - Comments visible to plan generator (agent or human)
  - Support comment resolution (mark as addressed)
  - Comments persisted as part of plan history

### 11.2 Approval Process

- [ ] **AG-PG-062**: Implement single-approver workflow
  - One authorized user reviews and approves the plan
  - Approval captures: user ID, timestamp, optional notes
  - Rejection captures: user ID, timestamp, feedback for regeneration
  - Only approved plans can be executed
- [ ] **AG-PG-063**: Implement plan revision cycle
  - If rejected: agent receives feedback and regenerates
  - Track revision count (draft v1, draft v2, etc.)
  - Maximum revision cycles: 5 (configurable; after that, escalate to human)
  - Each revision creates a new version, preserving history
- [ ] **AG-PG-064**: Implement approval notification
  - Notify plan author when plan is approved
  - Notify relevant users when plan is ready for review
  - Notify users subscribed to root spec changes
  - Include plan summary in notification

#### Design Decisions

> **Q**: Should plan review be mandatory before execution?
> **A**: Mandatory by default. Plans with ≤5 files and no high-risk flags can use "quick execute" to skip review. Plans with >5 files or any high-risk flags require explicit review and approval. Project admins can enforce review for all plans.

> **Q**: Should the review UI show raw plan files or a rendered view?
> **A**: Rendered view as primary — phase diagram, dependency graph, effort estimates, and plan files as cards with checklists and highlighted risk flags. Raw Markdown is accessible via an "Edit" button for power users.

> **Q**: Should multiple reviewers be required for large plans?
> **A**: No. Single reviewer (the requesting user) at launch. Multi-reviewer approval is a future enterprise feature requiring roles, workflows, and notifications. The confirm-before-mutation pattern during execution provides a second safety checkpoint.

> **Q**: Should the agent self-review its plans before presenting to the human?
> **A**: Yes. After generation, a self-review pass checks spec coverage, dependency ordering consistency, effort estimate reasonableness, and duplicate steps. Issues are auto-fixed when possible or flagged in the plan summary.

> **Q**: When a plan is rejected, should the agent regenerate from scratch or apply feedback incrementally?
> **A**: Incremental by default. The agent identifies which plan files are affected by the feedback and regenerates only those, saving 60–70% of time. Broad feedback ("completely restructure") triggers full regeneration as a fallback.

> **Q**: Should rejection feedback be structured or free-form?
> **A**: Free-form text with optional quick-tags ("Wrong approach," "Missing dependency," "Too complex," etc.) prepended to the text. Tags provide structured signal for categorization; full text provides understanding.

> **Q**: Should rejection reasons be tracked over time to improve plan quality?
> **A**: Yes, logged in the monitoring system. Rejection tags, feedback, and plan metadata are analyzed quarterly to identify common issues, prompt/skill improvements, and structural changes to the generation process.

---

## 12. Plan Execution Integration

### 12.1 Execution Triggering

- [ ] **AG-PG-065**: Implement plan execution trigger
  - Approved plans can be triggered for execution
  - Execution target: a code repository (local path or remote URL)
  - Create execution session (agent session for execution)
  - Spawn Claude Code with plan files as context
- [ ] **AG-PG-066**: Implement execution context assembly
  - Load all plan files into the execution agent's context
  - Include target repository structure (file listing)
  - Include relevant spec content (for implementation reference)
  - Configure Claude Code with File System MCP and Git MCP servers
- [ ] **AG-PG-067**: Implement step-by-step execution orchestration
  - Parse execution order from plan metadata and dependencies
  - Execute plan files in the determined order
  - For each step: spawn a Claude Code process with the step's context
  - Wait for step completion before proceeding to dependent steps
  - Execute parallel steps concurrently

### 12.2 Execution Engine

- [ ] **AG-PG-068**: Implement single-step executor
  - Load plan file content
  - Load source spec content for reference
  - Load target repository context (relevant files)
  - Construct execution prompt: "Execute this plan step against the repository"
  - Spawn Claude Code with file write + git commit tools
  - Capture execution output and artifacts
- [ ] **AG-PG-069**: Implement execution output capture
  - Capture all file changes made by Claude Code
  - Capture git commits created
  - Capture test results (if verification steps included)
  - Store output in execution-status.json for the step
- [ ] **AG-PG-070**: Implement execution progress reporting
  - Emit WebSocket events for each step status change
  - Report: step name, status, duration, output summary
  - Real-time progress bar: {completed}/{total} steps
  - Report parallel execution status (multiple steps running)

### 12.3 Execution Sandboxing

- [ ] **AG-PG-071**: Implement execution sandbox for target repository
  - Clone target repository into a sandboxed directory
  - All plan execution happens in the sandbox (not the original repo)
  - On successful completion: merge sandbox changes to original
  - On failure: sandbox is discarded (no damage to original)
- [ ] **AG-PG-072**: Implement execution branch management
  - Create a feature branch for plan execution: `plan/{planId}/execute`
  - All commits during execution go to this branch
  - On completion: present branch for merge to main
  - On failure: branch is preserved for debugging
- [ ] **AG-PG-073**: Implement execution resource limits
  - Timeout per step: 10 minutes (configurable)
  - Timeout per plan execution: 2 hours (configurable)
  - Maximum file changes per step: 50 files
  - Maximum total file changes per plan: 500 files

#### Design Decisions

> **Q**: Should plan execution be fully automated or semi-automated?
> **A**: Semi-automated with configurable granularity. Default: the agent runs all steps within a plan file, then pauses for confirmation before the next file. Users can toggle to fully automated or step-by-step mode.

> **Q**: Should the execution engine run server-side or on the user's machine?
> **A**: Server-side. Provides consistent environment, resource management, and audit logging. The code repo is accessed via Git MCP server, which can operate on local or remote repos.

> **Q**: Should execution create one commit per step, per directory, or per plan?
> **A**: One commit per plan file using convention `[bot:plan-exec] {plan-name} - {file-name}: {summary}`. This gives granular rollback per work unit without excessive commit noise.

> **Q**: How should plans handle non-greenfield projects with existing code?
> **A**: Plans account for existing code. The plan generation agent uses File System MCP to analyze existing structure. Plan steps reference existing files for modification rather than always creating new files.

> **Q**: Should there be a dry-run execution mode?
> **A**: Yes, dry run is the default first step. Code is generated into a sandbox without committing. The user previews rendered diffs, then approves for commit. Auto-commit can be enabled in settings.

> **Q**: Should the execution agent have guardrails?
> **A**: Yes. The agent can only touch files listed in the plan, cannot delete pre-existing files, is limited to whitelisted shell commands (`npm install`, `npm run build`, `npm test`), and cannot modify files outside the repo root. Enforced at the MCP server level.

> **Q**: How should external dependencies (npm packages, database migrations, API services) be handled?
> **A**: File generation plus whitelisted setup commands. The plan file lists `setup_commands` run after file generation. Database migrations are flagged for manual execution. External service provisioning is never automated.

> **Q**: Should plan execution be interruptible and resumable?
> **A**: Yes. Execution state is persisted in the database. On restart, completed files are skipped and the in-progress file is re-generated from scratch. The user is notified of the resume point.

> **Q**: What is the interface between plan generation and code generation (execution)?
> **A**: The plan file is the contract. Plan generation produces "what to do" — structured steps, sequencing, dependencies. Code generation reads the plan file, references source specs via MCP, and generates actual source code accordingly.

> **Q**: Should plans be reusable across different target repositories?
> **A**: Not directly. Plans reference repo-specific paths, frameworks, and conventions. Users regenerate plans from the same source specs with different project context (different CLAUDE.md, conventions) for a different repo.

> **Q**: Should different execution strategies be used per programming language?
> **A**: Claude Code for all languages at launch. It adapts to the project's language via CLAUDE.md and existing code context. Language-specific agents would be new agent types integrated through the existing orchestration layer if needed later.

---

## 13. Plan Versioning

### 13.1 Version Management

- [ ] **AG-PG-074**: Implement plan version numbering
  - Each plan generation creates a new version (integer, starting at 1)
  - Full builds: always version 1 (new plan lineage)
  - Delta builds: increment version from previous plan
  - Version number stored in `plan-metadata.json`
- [ ] **AG-PG-075**: Implement plan version history
  - Track all versions of a plan (same root spec, different versions)
  - Store previous plan metadata (don't overwrite)
  - Enable: "show me the history of plans for this spec"
  - Enable: diff between plan versions
- [ ] **AG-PG-076**: Implement plan version comparison
  - Compare two plan versions side-by-side
  - Highlight: added files, removed files, changed files
  - Show spec coverage changes (new specs included, specs removed)
  - Show structural changes (new directories, reordered steps)

### 13.2 Version Retention

- [ ] **AG-PG-077**: Define plan version retention policy
  - Keep last 10 versions per plan lineage
  - Keep all approved/executed versions indefinitely
  - Archive older draft versions after 30 days
  - Purge archived versions after 90 days
- [ ] **AG-PG-078**: Implement plan archival
  - Move old plan files to cold storage (archive directory)
  - Preserve metadata for history queries
  - Delete plan file content (only metadata retained)
  - Log archival events

#### Design Decisions

> **Q**: Should plan versions form a linear sequence or a tree (branching at rejected plans)?
> **A**: Linear sequence. Each generation increments the version number. Rejected plans are preserved but not branched. The user has one active plan per root spec. This matches git's linear model and avoids "which branch am I on?" confusion.

> **Q**: How long should plan history be retained?
> **A**: Last 10 versions per plan, each with spec summary snapshots (not full content) for comprehension. Executed plans (status: completed) are retained indefinitely. Versions beyond 10 are auto-purged.

> **Q**: Should plan versions be git-versioned or stored separately?
> **A**: Both. Plan files in the KG repo (under `plans/{plan-id}/v{N}/`) provide free diffs and history via git. Plan metadata in PostgreSQL provides fast querying and indexing. Dual storage leverages each system's strengths.

---

## 14. Plan Rollback

### 14.1 Execution Rollback

- [ ] **AG-PG-079**: Implement plan execution rollback trigger
  - Available when a plan execution has `completed` or `failed` status
  - Rollback targets the code repository changes
  - Two strategies: git revert (create reverting commits) or git reset (remove commits)
  - Default: git revert (preserves history)
- [ ] **AG-PG-080**: Implement git revert rollback
  - Identify all commits created during plan execution
  - Create revert commits in reverse order
  - Verify reverted state matches pre-execution state
  - Update plan status to `rolled-back`
- [ ] **AG-PG-081**: Implement selective rollback
  - Allow rolling back specific plan steps (not the entire plan)
  - Identify which commits correspond to which plan steps
  - Revert only the selected steps' commits
  - Warn if reverting a step that other steps depend on

### 14.2 Plan Regeneration After Rollback

- [ ] **AG-PG-082**: Implement post-rollback plan regeneration
  - After rollback: generate a corrective plan
  - Corrective plan addresses the issues that caused the original plan to fail
  - Include user feedback from the failure investigation
  - Track relationship between original plan and corrective plan
- [ ] **AG-PG-083**: Implement rollback reporting
  - Record: which steps were rolled back, why, by whom
  - Include in plan history for audit trail
  - Generate summary for team notification
  - Link rollback to inquiry if the issue is a knowledge graph problem

#### Design Decisions

> **Q**: Should rollback be automatic on execution failure or always require manual triggering?
> **A**: Manual triggering with a recommendation. On failure, the system stops, preserves committed work, and presents options: fix and retry, rollback all changes, or keep partial progress. No automatic rollback — the user decides.

> **Q**: If execution partially succeeded, should rollback revert all steps or only the failed step?
> **A**: User's choice, presented clearly. Options: full rollback (revert all plan commits), partial rollback (revert failed step only), or keep everything. The UI shows exactly which files each option affects.

> **Q**: Should rollback generate a reverse plan that undoes the original step-by-step?
> **A**: No. Code rollback uses `git revert` — simple, reliable, well-understood. Non-file changes (database migrations, external configs) generate a "Manual Rollback Checklist" presented alongside the git revert.

> **Q**: How should rollback interact with collaborative environments where others have made changes?
> **A**: Standard git conflict handling. `git revert` creates new commits (not destructive reset). Conflicts with other users' subsequent changes produce conflict markers that are surfaced for manual resolution.

---

## 15. Execution Tracking

### 15.1 Step-Level Tracking

- [ ] **AG-PG-084**: Implement per-step execution status tracking
  - Track status: pending → queued → executing → completed/failed/skipped
  - Track timing: queued time, start time, end time, duration
  - Track output: files created/modified, commits made, tests run
  - Track errors: error message, stack trace, recovery attempts
- [ ] **AG-PG-085**: Implement step retry logic
  - If a step fails: retry up to 2 times (configurable)
  - On retry: include the error from the previous attempt in context
  - If all retries fail: mark step as `failed`, pause execution
  - User can manually resume or skip the failed step
- [ ] **AG-PG-086**: Implement step skip logic
  - User can mark a failed step as `skipped`
  - Skipping a step: warn about dependent steps that may fail
  - Downstream steps receive "skipped step" context
  - Log skip decision in execution history

### 15.2 Plan-Level Tracking

- [ ] **AG-PG-087**: Implement overall plan execution progress
  - Track: total steps, completed, failed, skipped, pending
  - Calculate: completion percentage, estimated time remaining
  - Track: parallel execution utilization (how many steps running)
  - Report via WebSocket and API
- [ ] **AG-PG-088**: Implement execution timeline visualization data
  - Emit events for: step start, step complete, step fail
  - Include timing data for Gantt-chart visualization
  - Show parallel execution lanes
  - Show dependency wait times
- [ ] **AG-PG-089**: Implement execution cost tracking
  - Track token usage per step (Claude Code tokens)
  - Track total plan execution cost
  - Compare against estimated cost (from plan generation)
  - Alert if cost exceeds estimate by > 50%

### 15.3 Execution History

- [ ] **AG-PG-090**: Implement execution history persistence
  - Store complete execution records in database
  - Include: all step statuses, timings, outputs, errors
  - Include: total cost, total duration, completion rate
  - Enable querying: "show me all executions for this plan"
- [ ] **AG-PG-091**: Implement execution comparison
  - Compare two executions of the same plan (e.g., after retry)
  - Show: which steps succeeded/failed differently
  - Show: timing differences
  - Help identify flaky steps vs. consistent failures

#### Design Decisions

> **Q**: How long should plan generation take for a moderate plan?
> **A**: Target 3–5 minutes for 30 specs / 20 plan files. Breakdown: traversal (~5s) + RAG pre-fetch (~5s) + scope analysis (~30s) + file generation (~200s) + self-review (~20s). Progress is streamed with per-file status updates.

> **Q**: Should plan generation stream progress to the user?
> **A**: Yes. Status updates stream via WebSocket showing current phase and file count. Completed files are immediately visible in the review UI while later files are still generating, so the user can start reviewing early.

> **Q**: Should the system support generating multiple plans concurrently?
> **A**: Yes, up to 2 concurrent plan generations per user. Each occupies 1 Claude Code process slot. With the 10-process cap, this leaves capacity for other users. The UI shows both generations with their respective streaming updates.

> **Q**: How should very large plans (100+ plan files) be handled?
> **A**: Plan size cap of 30 files. If scope analysis projects more, the agent recommends splitting into linked sub-plans connected via `depends-on` edges. Each sub-plan is independently reviewable and executable within the 5-minute timeout.

---

## 16. Test Verification

### 16.1 Post-Execution Verification

- [ ] **AG-PG-092**: Implement automated test runner after plan execution
  - After each step: run verification criteria from the plan file
  - Verification types: file checks, compile checks, test execution
  - Report verification results per step
  - Failed verification: mark step as `failed` (even if code was generated)
- [ ] **AG-PG-093**: Implement file existence verification
  - Verify expected files were created/modified
  - Verify file sizes are reasonable (not empty, not suspiciously large)
  - Verify file types match expectations (TypeScript, JSON, etc.)
- [ ] **AG-PG-094**: Implement compilation verification
  - Run `tsc --noEmit` on generated TypeScript files
  - Run `bun build` on generated projects
  - Capture and report compilation errors
  - Distinguish: type errors, syntax errors, import errors
- [ ] **AG-PG-095**: Implement test suite execution
  - Run `bun test` on the generated code
  - Include plan-generated test files
  - Report: tests passed, tests failed, test coverage
  - Require minimum test pass rate for step completion (configurable)

### 16.2 Integration Verification

- [ ] **AG-PG-096**: Implement cross-step integration verification
  - After completing a parallel group: verify steps integrate correctly
  - Run integration tests across the parallel group's outputs
  - Verify no file conflicts between parallel steps
  - Verify imports and dependencies across steps are consistent
- [ ] **AG-PG-097**: Implement full-plan verification
  - After all steps complete: run full project test suite
  - Verify the complete generated codebase compiles
  - Run end-to-end tests if defined
  - Generate verification report for human review
- [ ] **AG-PG-098**: Implement regression verification
  - For delta builds: verify previous passing tests still pass
  - Identify regressions introduced by delta plan execution
  - Report regressions as critical failures
  - Auto-rollback delta changes if regressions detected (configurable)

### 16.3 Verification Reporting

- [ ] **AG-PG-099**: Define verification report format
  ```json
  {
    "planId": "pl_xxx",
    "executionId": "exec_xxx",
    "overallResult": "pass" | "fail" | "partial",
    "steps": [{
      "filePath": "01-foundation/plan-00-setup.md",
      "verifications": [{
        "type": "file-check",
        "target": "src/config.ts",
        "result": "pass",
        "details": "File exists, 45 lines, valid TypeScript"
      }]
    }],
    "integrationTests": { "passed": 12, "failed": 0, "skipped": 2 },
    "compilationResult": "success",
    "regressions": []
  }
  ```
- [ ] **AG-PG-100**: Implement verification report persistence
  - Store verification reports per execution
  - Enable querying: "show me all verification failures for this plan"
  - Track verification pass rates over time
  - Feed verification results back into plan quality scoring

#### Design Decisions

> **Q**: Should test generation be part of plan execution or a separate post-execution phase?
> **A**: Integrated. Each plan file includes test steps alongside implementation steps, committed together. This ensures tests are always written with fresh implementation context rather than being deferred.

> **Q**: Should generated tests use a standardized framework or match the project's existing framework?
> **A**: Match the project's existing test framework as specified in CLAUDE.md. The execution agent checks `package.json` for test configuration. Default to Vitest for TypeScript/JavaScript projects without existing tests.

> **Q**: Should there be a minimum code coverage requirement for execution to succeed?
> **A**: No hard coverage requirement at launch. Coverage is measured and reported in the execution summary but does not block execution. A configurable coverage threshold (default: off) is a future enhancement.

> **Q**: How should flaky tests in generated code be handled?
> **A**: Retry once. If the test passes on retry, the step is marked "passed with flaky test warning." Two consecutive failures mark the step as failed and pause execution. Flaky tests are flagged in the execution report.

> **Q**: Should verification include static analysis in addition to runtime tests?
> **A**: Yes. After each plan file's code generation: TypeScript type checking (`tsc --noEmit`), then linting (`eslint`), then test suite. Static analysis runs first (faster, catches obvious issues). This adds ~5–10 seconds per file but produces cleaner committed code.

---

## Summary

### Task Count by Section

| Section | Tasks |
|---------|-------|
| 1. Plan Output Format | 7 (AG-PG-001 through AG-PG-007) |
| 2. Plan Directory Structure | 7 (AG-PG-008 through AG-PG-014) |
| 3. Master Prompt Plan | 4 (AG-PG-015 through AG-PG-018) |
| 4. Directory-Level Execution Plans | 6 (AG-PG-019 through AG-PG-024) |
| 5. Plan File Content Structure | 6 (AG-PG-025 through AG-PG-030) |
| 6. Graph Traversal for Plan Generation | 6 (AG-PG-031 through AG-PG-036) |
| 7. RAG Supplementary Context Retrieval | 4 (AG-PG-037 through AG-PG-040) |
| 8. Delta Detection | 6 (AG-PG-041 through AG-PG-046) |
| 9. Full Build vs. Delta Build Modes | 6 (AG-PG-047 through AG-PG-052) |
| 10. Plan-as-Knowledge-Graph | 6 (AG-PG-053 through AG-PG-058) |
| 11. Plan Review & Approval Workflow | 6 (AG-PG-059 through AG-PG-064) |
| 12. Plan Execution Integration | 9 (AG-PG-065 through AG-PG-073) |
| 13. Plan Versioning | 5 (AG-PG-074 through AG-PG-078) |
| 14. Plan Rollback | 5 (AG-PG-079 through AG-PG-083) |
| 15. Execution Tracking | 8 (AG-PG-084 through AG-PG-091) |
| 16. Test Verification | 9 (AG-PG-092 through AG-PG-100) |
| **TOTAL** | **100** |

> **Note**: The 100 task IDs represent high-level implementation items.
> Several tasks (especially plan file generation, execution integration,
> and test verification) involve multiple sub-tasks. The effective task
> count including sub-tasks exceeds 130.

### Dependencies (What This Plan Enables)

Completion of this plan unblocks:
- `12-CODE-GENERATION/PLAN.md` — needs plan execution engine, verification framework
- `10-COLLABORATION/PLAN.md` — needs plan approval workflow for multi-user review
- `08-TESTING/04-AGENT-TESTING-PLAN.md` — needs plan output format for validation tests

### Definition of Done

This plan is complete when:
- [ ] Plan metadata schema is defined and validated
- [ ] Plan directory structure generation creates correct parallel/serial layouts
- [ ] Master plan is generated with complete overview and execution order
- [ ] Individual plan files contain actionable steps with verification criteria
- [ ] Graph traversal correctly identifies the relevant subgraph for plans
- [ ] RAG supplementary context enriches plan steps with relevant information
- [ ] Delta detection correctly identifies changed specs and affected plan files
- [ ] Full build and delta build modes both produce valid, complete plans
- [ ] Spec-plan bidirectional linking enables traceability queries
- [ ] Plan review and approval workflow gates execution on human approval
- [ ] Plan execution spawns Claude Code agents to execute steps against a code repo
- [ ] Plan versioning tracks history and enables version comparison
- [ ] Plan rollback reverts code repository changes safely
- [ ] Execution tracking provides real-time step-by-step progress
- [ ] Test verification validates execution output at step and integration levels
