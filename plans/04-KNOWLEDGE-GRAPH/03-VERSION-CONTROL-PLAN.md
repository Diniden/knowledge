# 04-KNOWLEDGE-GRAPH / 03 — VERSION CONTROL PLAN

> **Purpose**: Define spec-level version tracking using git as the underlying
> engine, including commit strategy, version metadata, history retrieval, diff
> generation, revert operations, branch management, merge strategy, conflict
> detection and resolution, delta detection for agent triggers, and audit trail.
>
> **Phase**: 2 (Core Systems) + Phase 4 (Collaboration)
> **Dependencies**: `04-KNOWLEDGE-GRAPH/01-ARCHITECTURE-PLAN.md`, `03-SERVER/05-GIT-INTEGRATION-PLAN.md`
> **Estimated tasks**: 130+

---

## Table of Contents

1. [Git Repository Setup](#1-git-repository-setup)
2. [Commit Strategy](#2-commit-strategy)
3. [Spec-Level Version Tracking](#3-spec-level-version-tracking)
4. [History Retrieval](#4-history-retrieval)
5. [Diff Generation](#5-diff-generation)
6. [Revert Operations](#6-revert-operations)
7. [Branch Management](#7-branch-management)
8. [Merge Strategy](#8-merge-strategy)
9. [Conflict Detection & Resolution](#9-conflict-detection--resolution)
10. [Delta Detection](#10-delta-detection)
11. [Change Tracking & Agent Triggers](#11-change-tracking--agent-triggers)
12. [Audit Trail](#12-audit-trail)
13. [Performance & Optimization](#13-performance--optimization)

---

## 1. Git Repository Setup

### 1.1 Repository Configuration

- [ ] **KG-VC-001**: Configure the `knowledge-graph/` directory as a git-tracked subtree
  - The knowledge graph lives within the main monorepo
  - All git operations target the monorepo's repository
  - Paths are prefixed with `knowledge-graph/` in all git commands
- [ ] **KG-VC-002**: Create `.gitattributes` for knowledge graph files
  - `knowledge-graph/**/*.json diff=json` — pretty-print JSON diffs
  - `knowledge-graph/**/*.md diff=markdown` — markdown-aware diffs
  - `knowledge-graph/indexes/** merge=ours` — on conflict, keep local indexes (they rebuild)
  - `knowledge-graph/**/*.json merge=json-merge` — custom merge driver for JSON (if configured)
- [ ] **KG-VC-003**: Create `.gitignore` entries for ephemeral files
  - `knowledge-graph/indexes/.lock` — lock files for index rebuilds
  - `knowledge-graph/**/*.tmp` — temporary files during atomic writes
  - Evaluate: `knowledge-graph/indexes/` — consider ignoring all indexes if rebuild is cheap
- [ ] **KG-VC-004**: Configure git for the knowledge graph
  - Set `core.autocrlf` to `input` for consistent line endings
  - Set `core.quotePath` to `false` for Unicode filename support
  - Configure custom JSON merge driver (if available)

### 1.2 Git Hooks Integration

- [ ] **KG-VC-005**: Implement pre-commit hook for knowledge graph validation
  - Run schema validation on staged spec.json, edge.json, document.json files
  - Reject commits with invalid schemas
  - Run basic integrity checks (e.g., edge references exist)
- [ ] **KG-VC-006**: Implement post-commit hook for index updates
  - After a successful commit, trigger index rebuild for affected indexes
  - Only rebuild indexes affected by the committed changes
- [ ] **KG-VC-007**: Implement post-merge hook for integrity reconciliation
  - After a merge, run integrity checks
  - Auto-repair bidirectional reference inconsistencies
  - Rebuild indexes that may be stale after merge

---

## 2. Commit Strategy

### 2.1 Commit Granularity

- [ ] **KG-VC-008**: Define single-spec commit mode
  - One commit per spec change (create, update content, update metadata, delete)
  - Enables precise per-spec version history
  - Commit includes only the changed spec's files plus index updates
  - Used for interactive editing (user edits in the spec editor)
- [ ] **KG-VC-009**: Define batch commit mode
  - Multiple spec changes in a single commit
  - Used for agent operations (agent creates multiple specs and edges)
  - Used for import operations
  - Commit message lists all affected specs
- [ ] **KG-VC-010**: Define commit mode selection logic
  - Interactive user edits → single-spec commit (immediate)
  - Agent operations → batch commit (after agent session completes)
  - Import operations → single batch commit
  - Configurable via `.kg-config.json`

### 2.2 Commit Message Conventions

- [ ] **KG-VC-011**: Define commit message format
  ```
  kg(<scope>): <action> <entity-type> <entity-id>

  <optional body with details>

  Specs-Modified: <comma-separated spec IDs>
  Edges-Modified: <comma-separated edge IDs>
  Documents-Modified: <comma-separated document IDs>
  Author: <user-id>
  Agent-Session: <session-id if agent-initiated>
  ```
- [ ] **KG-VC-012**: Define commit scopes
  - `spec` — spec create/update/delete
  - `edge` — edge create/update/delete
  - `document` — document create/update/delete
  - `graph` — multi-entity operation (batch, import)
  - `index` — index rebuild
  - `migration` — schema migration
  - `inquiry` — inquiry create/resolve
- [ ] **KG-VC-013**: Define commit actions
  - `create` — new entity
  - `update` — modify existing entity
  - `delete` — remove entity
  - `revert` — restore to previous version
  - `merge` — merge from another branch
  - `migrate` — schema migration
  - `rebuild` — index rebuild
- [ ] **KG-VC-014**: Implement commit message generator
  - Given operation type, entity type, entity IDs, and user context
  - Generate conventional commit message
  - Include structured footer for machine parsing
- [ ] **KG-VC-015**: Implement commit message parser
  - Extract scope, action, entity type, entity IDs from commit message
  - Extract footer metadata (Specs-Modified, Author, etc.)
  - Used for spec-level history reconstruction

### 2.3 Commit Authorship

- [ ] **KG-VC-016**: Map application users to git authors
  - Git author format: `User Display Name <user-id@knowledge-graph.local>`
  - Use a deterministic email format based on user ID
  - Configured via git environment variables at commit time
- [ ] **KG-VC-017**: Handle agent-initiated commits
  - Git author: the human user who initiated the agent session
  - Git committer: the system/agent service account
  - Commit message footer includes `Agent-Session: <session-id>` for tracing
- [ ] **KG-VC-018**: Handle system-initiated commits
  - Index rebuilds, migrations, integrity repairs
  - Git author: system service account
  - Commit message clearly identifies as automated

#### Design Decisions

> **Q**: Should the system create a commit on every save (keypress-level autosave triggers frequent commits) or only on explicit user save actions?
> **A**: Commit on explicit user save actions only. No autosave-to-commit. The frontend may autosave drafts to a local buffer or the server's in-memory state, but a git commit is only created when the user explicitly saves (clicks save, presses Ctrl+S, or confirms a dialog). This keeps git history meaningful — each commit represents an intentional checkpoint.

> **Q**: Should there be a commit debounce interval (e.g., batch changes within a 30-second window into one commit)?
> **A**: No debounce for user-initiated saves — each save creates a commit immediately. For agent operations that modify multiple specs in rapid succession (e.g., crawl results), use a single batch commit at the end of the operation. The batching boundary is the logical operation, not a time window. If a user saves the same spec 5 times in 30 seconds, that's 5 commits — this is intentional and each represents a meaningful user action.

> **Q**: Should agent operations (which may modify many specs and edges) always use a single batch commit, or should critical operations (e.g., creating a new dependency edge) be committed individually for immediate visibility?
> **A**: Single batch commit per agent operation. An agent crawl that creates 3 edges and updates 2 specs produces one commit with all 5 changes. This keeps git history clean (one commit = one logical agent action) and avoids partial-state visibility where some edges exist but their context changes haven't been committed yet. The commit message lists all affected entities via Conventional Commit trailers.

> **Q**: Should index-only changes (index rebuild without entity changes) be committed? They add noise to the git log but ensure indexes are always available after clone.
> **A**: No. Indexes are ephemeral in-memory structures, not files on disk. There are no index files to commit. This question is resolved by the architecture decision to keep indexes out of git entirely.

> **Q**: Should commit messages be human-readable or optimized for machine parsing?
> **A**: Hybrid format using Conventional Commits. The subject line is human-readable: `kg(spec): update authentication requirements`. The structured trailers are machine-parseable: `Specs-Modified: sp_abc123`, `Edges-Created: eg_def456`. This gives human readers a clear summary and machines a reliable parse target. The `kg` prefix distinguishes knowledge graph commits from application code commits.

> **Q**: Should the commit body include a detailed diff summary, or is the structured footer (Specs-Modified, etc.) sufficient?
> **A**: Structured trailers are sufficient. The commit body may optionally include a 1–2 sentence human-readable explanation for agent operations (e.g., "Agent crawl found 3 new dependency relationships"). The detailed diff is in the git diff itself — repeating it in the commit body is redundant. Keep commit messages concise.

> **Q**: Should the system support user-provided commit messages (e.g., "Fixed typo in authentication spec") alongside the auto-generated message?
> **A**: Yes. The save dialog offers an optional "Commit note" field. If provided, it becomes the commit body text beneath the auto-generated subject line. If left empty, only the auto-generated Conventional Commit message is used. Users are not required to write messages — the auto-generated format is always present.

> **Q**: For agent-initiated changes, should the git author be the agent or the human who triggered the session?
> **A**: Human author + agent committer. `GIT_AUTHOR_NAME` / `GIT_AUTHOR_EMAIL` = the user who initiated the agent session. `GIT_COMMITTER_NAME` / `GIT_COMMITTER_EMAIL` = `knowledge-agent <agent@botnet.knowledge>`. This preserves attribution (the user is responsible for agent actions they trigger) while clearly marking commits as agent-produced. `git log --format='%an / %cn'` shows `Alice / knowledge-agent`.

> **Q**: Should the system support co-authorship (git `Co-authored-by` trailer) for collaborative edits?
> **A**: Yes, for cases where multiple users contribute to a batch operation (e.g., a merge commit incorporating changes from two users). The `Co-authored-by: Name <email>` trailer is added automatically when the commit includes changes from multiple contributors. Single-author commits (the normal case) omit the trailer.

---

## 3. Spec-Level Version Tracking

### 3.1 Version Derivation from Git

- [ ] **KG-VC-019**: Implement spec version history from git log
  - Use `git log --follow -- knowledge-graph/specs/{spec-id}/` to get all commits touching the spec
  - Extract commit hash, author, date, message for each commit
  - Present as an ordered list of versions (most recent first)
- [ ] **KG-VC-020**: Implement spec content version history
  - `git log --follow -- knowledge-graph/specs/{spec-id}/content.md`
  - Content changes are the most meaningful version events for users
  - Track content changes separately from metadata changes
- [ ] **KG-VC-021**: Implement spec metadata version history
  - `git log -- knowledge-graph/specs/{spec-id}/metadata.json`
  - Track metadata changes (tags, permissions, embedding updates)
  - Lower priority for user display (metadata changes often automated)
- [ ] **KG-VC-022**: Implement version numbering derived from commit count
  - Version number = count of commits touching the spec
  - Displayed as "v1", "v2", "v3" etc.
  - Not stored in files (derived from git history)
  - Monotonically increasing per spec

### 3.2 Version Metadata

- [ ] **KG-VC-023**: Define `SpecVersion` type
  ```typescript
  interface SpecVersion {
    specId: string;
    versionNumber: number;
    commitHash: string;
    shortHash: string;
    author: string;
    date: string;
    message: string;
    filesChanged: string[];
    changeType: 'create' | 'content' | 'metadata' | 'status' | 'delete';
  }
  ```
- [ ] **KG-VC-024**: Implement version metadata extraction
  - Parse commit message for structured metadata
  - Determine `changeType` from file paths changed and commit message
  - Extract author from git author or commit message footer
- [ ] **KG-VC-025**: Implement version caching
  - Cache computed version history per spec to avoid repeated git log calls
  - Invalidate cache when a new commit touches the spec
  - Store cache in memory (not persisted — rebuild is fast)

### 3.3 Version Retrieval

- [ ] **KG-VC-026**: Implement `getSpecAtVersion(specId, commitHash)` operation
  - Use `git show {commitHash}:knowledge-graph/specs/{spec-id}/spec.json`
  - Retrieve the spec state at a specific point in time
  - Return full spec data (spec.json + content.md + metadata.json) at that commit
- [ ] **KG-VC-027**: Implement `getSpecContentAtVersion(specId, commitHash)` operation
  - Use `git show {commitHash}:knowledge-graph/specs/{spec-id}/content.md`
  - Return content as it existed at that commit
  - Used for diff display and revert preview
- [ ] **KG-VC-028**: Implement `getSpecAtDate(specId, date)` operation
  - Find the commit closest to (but not after) the specified date
  - Use `git log --before={date} -1 -- knowledge-graph/specs/{spec-id}/`
  - Return spec state at that point in time

#### Design Decisions

> **Q**: Should spec version numbers be monotonically increasing integers (v1, v2, v3) or semantic versions (1.0.0, 1.0.1, 1.1.0)?
> **A**: Monotonically increasing integers. v1, v2, v3, etc. Semantic versioning implies API compatibility guarantees that don't apply to knowledge specs. Each commit that modifies a spec increments its version by 1. Simple, unambiguous, and trivially computed from git log count for that spec's files.

> **Q**: Should the version number be stored in `spec.json` (denormalized but fast to read) or always computed from git log (single source of truth)?
> **A**: Stored in `spec.json`. The `version` field is incremented by the application on every write. This avoids a `git log` call per spec for the common operation of displaying "v7" in the UI. Git log serves as the authoritative audit trail, but the denormalized version in JSON is the fast read path. If they ever disagree, the git log count wins.

> **Q**: Should version numbers reset if a spec is reverted? If spec is at v10 and reverted to v7's content, is the new state v11 (preserving history) or v7.1 (indicating revert)?
> **A**: v11. Revert creates a new version with the old content. The version counter never decreases. The commit message clearly marks it as a revert: `kg(spec): revert sp_abc123 to v7`. This preserves linear history — v11's content happens to match v7, but it's a distinct version with its own timestamp and commit.

> **Q**: Should users be able to compare any two versions of a spec (arbitrary pair), or only adjacent versions and current-vs-historical?
> **A**: Any two versions (arbitrary pair). The UI provides a version picker for both the "from" and "to" sides. The most common comparison is current vs. previous, which is the default, but users should be able to diff v3 against v8 directly. This is implemented by `git diff <commit-hash-v3> <commit-hash-v8> -- specs/{bucket}/{id}.*`.

> **Q**: Should the system pre-compute diffs for the most recent N version pairs to speed up the UI?
> **A**: No pre-computation. Diffs are computed on-demand using `simple-git`. For the recent 2–3 versions, git diff is fast (<50ms). Pre-computing diffs would require storage and invalidation logic for minimal latency gain. The LRU cache for traversal results (30-second TTL) applies to diffs too — a diff viewed twice in quick succession is served from cache.

> **Q**: Should version comparison include edge changes (edges added/removed between two versions of a spec)?
> **A**: Yes. The diff view shows two sections: "Content Changes" (Markdown diff) and "Edge Changes" (edges added/removed between the two commit points). Edge changes are derived from diffing the spec's edge file at the two commits. This gives a complete picture of how a spec's context evolved between versions.

> **Q**: Should each version store a snapshot of the spec's edges at that point in time, or should edges be versioned independently?
> **A**: Edges are versioned independently via their own files in the `edges/` directory. Each commit captures the state of both spec files and edge files. Git's snapshot model means any historical commit already contains the full state of all edges at that point. No separate snapshot mechanism is needed — `git show <commit>:edges/{bucket}/{specId}.json` retrieves the exact edge state at any version.

> **Q**: Should the version history include "virtual" entries for events like "added to document X" or "new edge from spec Y created"?
> **A**: No virtual entries. The version history is strictly derived from commits that modify the spec's own files. Document and edge changes are visible in the git log for those respective files. The spec detail view can show a "Related Activity" timeline that aggregates commits touching the spec's files, its edge file, and documents containing it — but these are not version increments on the spec itself.

---

## 4. History Retrieval

### 4.1 Spec History

- [ ] **KG-VC-029**: Implement `getSpecHistory(specId, options)` operation
  - Options: `{ limit?: number, offset?: number, since?: string, until?: string, changeTypes?: string[] }`
  - Return paginated list of `SpecVersion` objects
  - Support date range filtering
  - Support filtering by change type (only content changes, only metadata changes)
- [ ] **KG-VC-030**: Implement `getSpecHistoryCount(specId)` operation
  - Return total number of versions for a spec
  - Used for pagination and version display
- [ ] **KG-VC-031**: Implement `getLatestSpecVersion(specId)` operation
  - Return the most recent version metadata
  - Quick check for "what was the last change"

### 4.2 Document History

- [ ] **KG-VC-032**: Implement `getDocumentHistory(documentId, options)` operation
  - Track changes to `documents/{doc-id}/document.json`
  - Also aggregate changes to all specs within the document
  - Return unified timeline of document-level and spec-level changes
- [ ] **KG-VC-033**: Implement document change aggregation
  - For each commit, identify which document specs were modified
  - Annotate timeline entries with affected spec titles
  - Merge nearby commits (within a time window) for cleaner display

### 4.3 Graph-Wide History

- [ ] **KG-VC-034**: Implement `getRecentChanges(options)` operation
  - Options: `{ limit: number, since?: string, specIds?: string[], author?: string }`
  - Return recent changes across the entire knowledge graph
  - Used for activity feed / recent changes dashboard
- [ ] **KG-VC-035**: Implement `getChangesByAuthor(userId, options)` operation
  - Filter git log by author
  - Return spec-grouped changes by a specific user
- [ ] **KG-VC-036**: Implement `getChangesBetweenCommits(fromHash, toHash)` operation
  - List all knowledge graph changes between two commits
  - Used for delta detection and sync reconciliation
  - Return: created specs, modified specs, deleted specs, edge changes

---

## 5. Diff Generation

### 5.1 Content Diff

- [ ] **KG-VC-037**: Implement `getContentDiff(specId, fromHash, toHash)` operation
  - Generate diff between two versions of `content.md`
  - Return unified diff format
  - Parse into structured format: added lines, removed lines, unchanged context
- [ ] **KG-VC-038**: Define diff result type
  ```typescript
  interface ContentDiff {
    specId: string;
    fromHash: string;
    toHash: string;
    fromDate: string;
    toDate: string;
    hunks: DiffHunk[];
    stats: { additions: number, deletions: number, changes: number };
  }
  interface DiffHunk {
    fromStart: number;
    fromCount: number;
    toStart: number;
    toCount: number;
    lines: DiffLine[];
  }
  interface DiffLine {
    type: 'add' | 'remove' | 'context';
    content: string;
    fromLineNumber?: number;
    toLineNumber?: number;
  }
  ```
- [ ] **KG-VC-039**: Implement word-level diff for Markdown content
  - Beyond line-level diff, compute word-level changes within modified lines
  - Highlight specific words/phrases that changed
  - Useful for subtle edits within long paragraphs
- [ ] **KG-VC-040**: Implement semantic diff for Markdown
  - Detect moved sections (not just added/removed)
  - Detect reformatted content (same words, different formatting)
  - Mark as "moved" or "reformatted" rather than "deleted + added"

### 5.2 Metadata Diff

- [ ] **KG-VC-041**: Implement `getMetadataDiff(specId, fromHash, toHash)` operation
  - Generate diff between two versions of `metadata.json`
  - Structured diff: which fields changed and how
  - Show old value → new value for changed fields
- [ ] **KG-VC-042**: Define metadata diff result type
  ```typescript
  interface MetadataDiff {
    specId: string;
    fromHash: string;
    toHash: string;
    changes: MetadataChange[];
  }
  interface MetadataChange {
    field: string;
    type: 'added' | 'removed' | 'modified';
    oldValue?: unknown;
    newValue?: unknown;
  }
  ```
- [ ] **KG-VC-043**: Implement smart metadata diff
  - For array fields (tags, contributors): show items added and removed
  - For nested objects (permissions): show specific sub-field changes
  - Ignore embedding vector changes in user-facing diff (too noisy)

### 5.3 Spec JSON Diff

- [ ] **KG-VC-044**: Implement `getSpecDiff(specId, fromHash, toHash)` operation
  - Diff `spec.json` between versions
  - Show title changes, status changes
  - Minimal since spec.json has few fields
- [ ] **KG-VC-045**: Implement combined full diff
  - Combine content diff + metadata diff + spec.json diff
  - Present as a unified view of all changes between two versions
  - Annotate each change with the file it came from

### 5.4 Diff Between Current and Previous

- [ ] **KG-VC-046**: Implement `getLatestDiff(specId)` operation
  - Shortcut: diff between current version and the one before it
  - Most commonly requested diff (what just changed?)
- [ ] **KG-VC-047**: Implement `getDiffSinceBranch(specId, branchPoint)` operation
  - Diff between current version and the branch point
  - Used for merge preparation: see all changes on this branch

#### Design Decisions

> **Q**: For Markdown content, should diffs be line-level, word-level, or character-level?
> **A**: Word-level for the UI display, line-level for the underlying git diff. Use `git diff --word-diff` output or a JavaScript diffing library (e.g., `diff` npm package with `diffWords`) to produce word-level diffs from the line-level git output. Word-level is significantly more readable for prose content (which is most spec content). Compute cost is negligible for typical spec sizes (<10KB).

> **Q**: Should the diff engine handle Markdown semantics (e.g., recognize that moving a paragraph is a move, not a delete+add)?
> **A**: No. Move detection adds substantial complexity for marginal benefit. Standard diff algorithms (Myers) show delete+add, which is clear enough for users. If a paragraph moves, the diff shows it as removed from one location and added to another — users understand this. Markdown-aware diffing is a future enhancement if user feedback demands it.

> **Q**: Should diffs include Markdown rendering previews (show the rendered difference, not just source diff)?
> **A**: Yes. The diff view offers two modes toggled by the user: "Source" (raw Markdown diff with word-level highlighting) and "Preview" (rendered Markdown with additions highlighted in green and deletions in red). Default is "Preview" for readability. Both modes are generated client-side from the same diff data.

> **Q**: Should diffs include changes to the spec's edges (edges added or removed between the two versions), or only the spec's own files?
> **A**: Yes, include edge changes. The diff view includes a "Content Changes" section and an "Edge Changes" section. This gives a holistic view of what changed between two versions of a spec.

> **Q**: For metadata diffs, should embedding vector changes be shown? They're large and machine-generated.
> **A**: No. Embedding vectors are in pgvector, not in spec files. Metadata diffs show changes to tags, status, contributors, and custom fields — all human-meaningful data. The `contentHash` field change (indicating the content changed and will be re-embedded) is shown but the vector itself is never displayed.

> **Q**: Should there be a "changes since I last viewed" diff that tracks per-user last-viewed timestamps?
> **A**: Yes. The server tracks `lastViewedVersion` per user per spec in PostgreSQL (a lightweight table: `user_id, spec_id, version, viewed_at`). When a user opens a spec, the UI can show a "3 changes since you last viewed" indicator with a one-click diff to their last-viewed version. This is an optional UI enhancement, not a core diff feature.

> **Q**: What is the acceptable latency for generating a diff between two versions? <100ms? <500ms? <1s?
> **A**: <200ms for the common case (adjacent versions, spec <10KB). <500ms for arbitrary version pairs or large specs. Word-level diffing of 10KB content takes <10ms in JavaScript. The bottleneck is `git show` to retrieve historical file content (~50–100ms per version). Caching historical spec content in the LRU cache eliminates this for recently viewed versions.

> **Q**: Should diffs be pre-computed and cached on commit, or computed on demand?
> **A**: Computed on demand, cached with 60-second TTL. Pre-computation would require storing diffs for every version pair — storage grows quadratically. On-demand computation is fast enough (<200ms) and the cache handles repeated views.

> **Q**: For very long spec content (>50KB), should diffs be truncated or paginated?
> **A**: Truncated with expand option. If a diff exceeds 500 changed lines, show the first 100 lines with "Show all 500 changed lines" expand button. This keeps the initial render fast and avoids overwhelming the user with massive diffs. Specs >50KB are unusual and likely indicate content that should be split into multiple specs (flagged via inquiry).

---

## 6. Revert Operations

### 6.1 Spec-Level Revert

- [ ] **KG-VC-048**: Implement `revertSpec(specId, toCommitHash)` operation
  - Restore spec files (spec.json, content.md, metadata.json) to their state at `toCommitHash`
  - Use `git show {hash}:path` to retrieve historical content
  - Write retrieved content to current working directory
  - Create a new commit with message `kg(spec): revert sp_xxxx to {shortHash}`
- [ ] **KG-VC-049**: Implement revert preview
  - Before executing revert, show what would change
  - Generate diff between current state and target state
  - Warn if reverting would break edge references (target spec restored but edges were added since)
  - Return preview without making changes; user confirms to proceed
- [ ] **KG-VC-050**: Implement partial revert (content only)
  - Revert only `content.md` to a previous version
  - Keep current metadata and spec.json
  - Useful when content was accidentally overwritten but metadata is correct
- [ ] **KG-VC-051**: Implement partial revert (metadata only)
  - Revert only `metadata.json` to a previous version
  - Keep current content and spec.json
  - Useful for undoing accidental permission or tag changes
- [ ] **KG-VC-052**: Validate reverted state
  - After revert, run integrity checks on the affected spec
  - Check that edges still reference valid specs
  - Check document membership is still consistent
  - Create inquiries for any issues found

### 6.2 Document-Level Revert

- [ ] **KG-VC-053**: Implement `revertDocument(documentId, toCommitHash)` operation
  - Restore `document.json` to its state at the target commit
  - This changes the spec list and ordering
  - Does NOT revert the specs themselves (only the document structure)
- [ ] **KG-VC-054**: Implement `revertDocumentWithSpecs(documentId, toCommitHash)` operation
  - Revert the document AND all its member specs to the target commit state
  - Atomic operation: all reverts succeed or none do
  - Used for "roll back this entire document to last week"
- [ ] **KG-VC-055**: Handle specs that didn't exist at the target commit
  - If a spec in the current document didn't exist at the target commit: skip it
  - If a spec existed at the target commit but was since deleted: optionally recreate it
  - Return a report of what was reverted and what was skipped

### 6.3 Edge Revert

- [ ] **KG-VC-056**: Implement `revertEdge(edgeId, toCommitHash)` operation
  - Restore edge file to its state at the target commit
  - Validate that source and target specs still exist
  - Create new commit for the revert
- [ ] **KG-VC-057**: Handle edge revert when referenced specs have changed
  - If source or target spec no longer exists, reject the revert
  - If spec content has changed significantly, warn that the edge rationale may be outdated

#### Design Decisions

> **Q**: Should revert create a new commit (preserving history) or use `git revert` (which creates a revert commit)?
> **A**: Create a new forward commit that restores the old content. Do NOT use `git revert` (which operates on the commit level and may affect other files in the same commit). The application reads the spec's files at the target version via `git show`, writes them as the current version, and commits. This is a spec-level revert, not a commit-level revert. The commit message: `kg(spec): revert sp_abc123 to v7`.

> **Q**: Should the system support "undo last change" as a quick action (revert to the immediately previous version)?
> **A**: Yes. The spec editor includes an "Undo last save" button that reverts to the immediately previous version (v(n-1)). This is a convenience shortcut for the general revert-to-version-N operation. It uses the same mechanism: read previous version from git, write as new version, commit.

> **Q**: Should revert be available only for content changes, or also for status changes, tag changes, and permission changes?
> **A**: Revert restores the entire `spec.json` and `content.md` to their state at the target version. This includes content, status, tags, and all metadata. Permission changes (stored in PostgreSQL, not in spec files) are NOT reverted — permissions are managed separately. The revert confirmation dialog lists what will change: "Content: restored, Status: active → draft, Tags: +2 removed, -1 added."

> **Q**: Should the system prevent reverting to a version that would break existing edges (e.g., reverting a spec to before an edge was created)?
> **A**: No. Revert only affects the spec's own files (JSON + Markdown), not its edges. Edges are stored in separate files and are not touched by a spec revert. If the reverted content makes an existing edge semantically invalid, the agent crawl will detect this and create an inquiry. The revert operation itself has no edge-breaking side effects.

> **Q**: Should there be a revert confirmation dialog showing all side effects?
> **A**: Yes. The revert confirmation shows: current version number, target version number, a summary of what changes (content diff preview, status change, tag changes), and the resulting commit message. The user must click "Confirm Revert" to proceed.

> **Q**: Can a revert itself be reverted (revert-the-revert)?
> **A**: Yes. Since revert creates a new forward version (e.g., v11 that matches v7's content), the user can revert from v11 back to v10 (or any other version). There is no special handling — revert-the-revert is just another revert operation. The version history clearly shows the sequence: v10 → v11 (revert to v7) → v12 (revert to v10).

> **Q**: Should there be a time limit on how far back a revert can go (e.g., only the last 50 versions)?
> **A**: No time limit, but a practical limit of the last 100 versions shown in the UI's version picker. Users can revert to any version in git history regardless, but the UI only displays the most recent 100 versions for usability. Reverting to very old versions (>100 versions back) requires using the API directly or expanding the version list.

---

## 7. Branch Management

### 7.1 Branch Operations

- [ ] **KG-VC-058**: Implement `createBranch(name, fromBranch?)` operation
  - Create a new git branch from the specified base (default: current branch)
  - Branch name convention: `kg/{user-id}/{branch-name}`
  - Validate branch name (alphanumeric, hyphens, no spaces)
  - Return branch metadata
- [ ] **KG-VC-059**: Implement `listBranches()` operation
  - List all knowledge graph branches
  - Filter by prefix `kg/` to show only knowledge graph branches
  - Include: branch name, last commit hash, last commit date, author
  - Mark the currently active branch
- [ ] **KG-VC-060**: Implement `switchBranch(branchName)` operation
  - Switch the knowledge graph to a different branch
  - Use `git checkout {branch}` or `git switch {branch}`
  - Rebuild indexes after switch (different branch may have different state)
  - Reject if there are uncommitted changes (require commit or stash first)
- [ ] **KG-VC-061**: Implement `deleteBranch(branchName)` operation
  - Delete a knowledge graph branch
  - Prevent deletion of the main branch
  - Require the branch to be merged or force flag to delete unmerged
  - Clean up remote tracking branch if applicable

### 7.2 Branch Information

- [ ] **KG-VC-062**: Implement `getBranchInfo(branchName)` operation
  - Return: branch name, base branch, creation date, last commit, ahead/behind counts
  - `ahead` — commits on this branch not on main
  - `behind` — commits on main not on this branch
- [ ] **KG-VC-063**: Implement `getBranchDiff(branchName, baseBranch)` operation
  - List all specs modified on the branch (compared to base)
  - Categorize as: created, modified, deleted
  - Return summary for merge preparation
- [ ] **KG-VC-064**: Implement `getCurrentBranch()` operation
  - Return the currently active branch name
  - Detect detached HEAD state

### 7.3 Stash Operations

- [ ] **KG-VC-065**: Implement `stashChanges(message?)` operation
  - Stash uncommitted changes in the knowledge graph
  - Allows branch switching without losing work
  - Return stash reference
- [ ] **KG-VC-066**: Implement `applyStash(stashRef?)` operation
  - Apply stashed changes back to the working directory
  - Default: apply most recent stash
  - Handle conflicts from stash application
- [ ] **KG-VC-067**: Implement `listStashes()` operation
  - List all stashed change sets
  - Include stash message, date, and changed file count

#### Design Decisions

> **Q**: What are the expected use cases for knowledge graph branching? Experimentation? Parallel editing? Draft vs. published?
> **A**: Primary use case: experimentation and what-if analysis. A user creates a branch to explore restructuring a section of the knowledge graph without affecting the main branch. Secondary use case: parallel editing by multiple users who want to work independently before merging. Branches are NOT used for draft-vs-published workflow (the spec `status` field handles that). The UI presents branches as "Experiments" to set user expectations correctly.

> **Q**: Should the main branch be protected (no direct commits, only merges from feature branches)?
> **A**: No. Direct commits to main are the normal workflow for single-user and small-team usage. Branch protection is overkill for a knowledge graph (this isn't source code with CI/CD). Users commit directly to main for everyday spec editing. Branches are used only when a user explicitly wants to experiment in isolation.

> **Q**: Should there be a naming convention for branch purposes (e.g., `kg/experiment/...`, `kg/draft/...`, `kg/user/...`)?
> **A**: Yes. Convention: `kg/{username}/{description}`. Example: `kg/alice/restructure-auth-specs`. The `kg/` prefix distinguishes knowledge graph branches from any application code branches in a shared repo. The username provides attribution. The description is free-form but kebab-case. The system auto-suggests the branch name based on the user's name and a prompted description.

> **Q**: How many concurrent branches should the system support? Dozens? Hundreds?
> **A**: Up to 20 active branches. This is a soft limit enforced by the UI (warn at 20, don't block creation). Git itself handles hundreds of branches, but 20+ active experiments suggest organizational problems. Stale branches (no commits in 30 days) are highlighted for cleanup.

> **Q**: Should branches have an expiration or auto-cleanup (delete branches inactive for >30 days)?
> **A**: No auto-deletion. Branches inactive for 30+ days are flagged in the branch dashboard with a "Stale — consider deleting" label. The user must explicitly delete stale branches. Auto-deletion risks losing experimental work that a user intended to return to.

> **Q**: Should there be a "branch dashboard" showing all active branches and their status (ahead/behind, conflicts)?
> **A**: Yes. The branch dashboard lists all branches with: name, author, last commit date, commits ahead/behind main, and conflict status (clean/conflicted). This is a lightweight view built from `git branch -v` and `git rev-list` data. It's accessible from the navigation sidebar.

> **Q**: Should users be able to compare two branches side by side without merging?
> **A**: Yes. The branch dashboard offers a "Compare" action between any two branches. This shows: specs added/removed/modified on each branch, edge changes, and a per-spec diff view. Implemented via `git diff branch1...branch2`. This helps users understand what merging would entail.

> **Q**: Should branch creation automatically switch to the new branch, or require an explicit switch?
> **A**: Automatically switch to the new branch after creation. This matches the user's intent — they created a branch to work on it. The UI shows a confirmation: "Switched to branch kg/alice/restructure-auth-specs." Switching back to main is a one-click action in the branch selector.

---

## 8. Merge Strategy

### 8.1 Merge Operations

- [ ] **KG-VC-068**: Implement `mergeBranch(sourceBranch, targetBranch, options)` operation
  - Options: `{ strategy: 'auto' | 'manual', dryRun: boolean }`
  - Perform git merge of source into target
  - Handle clean merges automatically
  - Return merge result: success, conflicts, or failure
- [ ] **KG-VC-069**: Define merge result type
  ```typescript
  interface MergeResult {
    success: boolean;
    mergeCommitHash?: string;
    conflicts: MergeConflict[];
    stats: {
      specsCreated: number;
      specsModified: number;
      specsDeleted: number;
      edgesCreated: number;
      edgesModified: number;
      edgesDeleted: number;
      autoResolved: number;
    };
  }
  ```
- [ ] **KG-VC-070**: Implement dry-run merge
  - Preview merge without applying
  - Show which files would conflict
  - Show which files would auto-merge
  - Return preview of merged state

### 8.2 Auto-Merge Strategies

- [ ] **KG-VC-071**: Implement JSON auto-merge for spec.json
  - If both sides changed different fields: merge both changes
  - If both sides changed the same field: conflict
  - `updatedAt`: take the more recent value
  - `status`: conflict if different (status changes are significant)
- [ ] **KG-VC-072**: Implement Markdown auto-merge for content.md
  - Use git's built-in text merge (line-by-line)
  - If edits are in different sections: auto-merge succeeds
  - If edits overlap: conflict (requires manual resolution)
- [ ] **KG-VC-073**: Implement JSON auto-merge for metadata.json
  - `tags`: union of both sides' tags
  - `contributors`: union of both sides' contributors
  - `permissions`: conflict if both sides changed (security-sensitive)
  - `embedding`: take the more recently generated one (by `generatedAt`)
  - `custom`: deep merge with conflict on same-key changes
- [ ] **KG-VC-074**: Implement edge file auto-merge
  - If only one side modified the edge: take that side's changes
  - If both sides modified: conflict
  - New edges created on different branches: both accepted (no conflict)
- [ ] **KG-VC-075**: Implement index auto-merge
  - On merge conflict in index files: discard both, rebuild from merged state
  - Indexes are derived data — always rebuildable

### 8.3 Post-Merge Operations

- [ ] **KG-VC-076**: Implement post-merge index rebuild
  - After a successful merge, rebuild all indexes
  - Validate index consistency after rebuild
- [ ] **KG-VC-077**: Implement post-merge integrity check
  - Run full graph integrity validation after merge
  - Check for broken edges (spec deleted on one branch, edge added on another)
  - Check for document-spec consistency
  - Auto-create inquiries for detected issues
- [ ] **KG-VC-078**: Implement post-merge notification
  - Notify affected users about merged changes
  - Highlight specs that were modified by the merge
  - Report any auto-resolved conflicts

#### Design Decisions

> **Q**: Should merges use `git merge --no-ff` (always create a merge commit) or allow fast-forward merges? No-ff preserves branch history; ff is cleaner for simple branches.
> **A**: `git merge --no-ff` always. The merge commit clearly marks where an experimental branch was incorporated into main. This preserves the "this was an experiment" context in the git history. The small cost of an extra commit is worth the clarity.

> **Q**: For the auto-merge of metadata.json arrays (tags, contributors), is union always the right strategy? Could there be cases where a user intentionally removed a tag on one branch?
> **A**: Union is the default for tags and contributors arrays. If a user intentionally removed a tag on one branch while the other branch still has it, the union preserves the tag — the removal is lost. This is acceptable because tag removal is a rare operation and the merge result can be manually corrected. The alternative (three-way merge per array element) adds substantial complexity for a rare edge case. Post-merge review handles corrections.

> **Q**: Should the merge strategy be configurable per user or per project?
> **A**: Per project only, configured in `.kg-config.json`. The merge strategy is a project-level decision, not a personal preference. Settings: `mergeStrategy: 'no-ff'` (default), `arrayMerge: 'union'` (default). These are rarely changed from defaults.

> **Q**: Should there be a "squash merge" option that combines all branch commits into a single commit?
> **A**: Yes, as an option in the merge dialog. Default is `--no-ff` (preserve all commits). Squash merge is useful when a branch has many small exploratory commits and the user wants a clean single-commit merge. The squash commit message auto-includes the count: "kg(merge): squash merge kg/alice/restructure-auth-specs (14 commits)".

> **Q**: Should the system periodically check for new changes on the remote and prompt users to merge?
> **A**: Yes. The server checks for remote changes on a 30-second polling interval. If the user's current branch is behind the remote, the UI shows a non-blocking notification: "Main branch has 3 new commits. Pull changes?" The user can pull immediately or defer. No auto-merge — the user always initiates the merge.

> **Q**: Should merges from main into feature branches be automatic (rebase-like behavior) or manual?
> **A**: Manual. The user decides when to incorporate main branch changes into their experiment branch. Auto-rebasing can introduce unexpected conflicts mid-work. The branch dashboard shows "5 commits behind main" as a visual reminder, and the user can pull from main when ready.

---

## 9. Conflict Detection & Resolution

### 9.1 Conflict Detection

- [ ] **KG-VC-079**: Implement spec-level conflict detection
  - Parse git merge conflicts into structured format
  - For each conflicting file, identify the spec it belongs to
  - Group conflicts by spec for user-friendly presentation
- [ ] **KG-VC-080**: Define conflict types
  ```typescript
  interface MergeConflict {
    specId: string;
    file: 'spec.json' | 'content.md' | 'metadata.json';
    type: 'content-conflict' | 'metadata-conflict' | 'status-conflict' | 'delete-modify' | 'both-created';
    ours: string;
    theirs: string;
    base?: string;
    resolved: boolean;
    resolution?: string;
  }
  ```
- [ ] **KG-VC-081**: Implement `delete-modify` conflict detection
  - Spec deleted on one branch, modified on another
  - Present as a special conflict: "keep modified version" or "accept deletion"
- [ ] **KG-VC-082**: Implement `both-created` conflict detection
  - Same spec ID created on both branches (extremely rare with random IDs)
  - Or different specs created that both reference the same document slot
- [ ] **KG-VC-083**: Implement edge conflict detection
  - Edge modified on both branches
  - Edge deleted on one branch, modified on another
  - New edges created on both branches referencing the same specs (check for duplicate edge constraint)

### 9.2 Conflict Resolution

- [ ] **KG-VC-084**: Implement `resolveConflict(specId, file, resolution)` operation
  - Resolution options: `'ours' | 'theirs' | 'manual'`
  - `ours`: accept the current branch's version
  - `theirs`: accept the incoming branch's version
  - `manual`: accept a user-provided merged version
- [ ] **KG-VC-085**: Implement content conflict resolution UI data
  - Return three-way diff (base, ours, theirs) for content conflicts
  - Provide merge suggestions based on change analysis
  - Return line-by-line conflict markers for manual resolution
- [ ] **KG-VC-086**: Implement metadata conflict resolution
  - For array fields (tags, contributors): suggest union
  - For scalar fields (status, author): present both options
  - For permissions: default to more restrictive option
- [ ] **KG-VC-087**: Implement batch conflict resolution
  - Resolve all conflicts for a spec at once
  - Resolve all conflicts for a merge at once (with a strategy: ours, theirs)
  - Used when user wants to quickly accept all incoming or keep all current
- [ ] **KG-VC-088**: Implement conflict resolution commit
  - After all conflicts resolved, create merge commit
  - Commit message includes conflict resolution details
  - Run post-merge integrity check

### 9.3 Conflict Prevention

- [ ] **KG-VC-089**: Implement pre-merge conflict check
  - Before attempting merge, identify files that would conflict
  - Return conflict preview without modifying working directory
  - Allow users to prepare (e.g., commit pending changes, review conflicts)
- [ ] **KG-VC-090**: Implement spec-level locking hints
  - Soft lock: announce that a user is editing a spec
  - Other users warned but not blocked
  - Lock stored in database (not in git) — ephemeral advisory lock
  - Prevents most concurrent edit conflicts

#### Design Decisions

> **Q**: Should conflict resolution happen in a dedicated UI (merge conflict screen) or inline in the spec editor?
> **A**: Dedicated merge conflict screen. The conflict view shows the spec's three versions side-by-side: "Yours" (current branch), "Theirs" (incoming branch), and "Base" (common ancestor). The user picks sections from either side or edits the result directly. This is a focused workflow — the user can't navigate away until all conflicts in the merge are resolved or the merge is aborted.

> **Q**: Should the system auto-resolve "trivial" conflicts (e.g., both sides only added new tags)?
> **A**: Yes. Auto-resolve trivial conflicts: both sides added different tags (union), both sides added different contributors (union), one side changed content while the other only changed metadata (take both changes). Only present the conflict UI for true content conflicts (both sides modified the same content region). This reduces merge friction significantly.

> **Q**: Should the system suggest a resolution based on which change is more recent, which author has more authority, or which change is larger?
> **A**: Suggest "more recent change" as the default resolution for content conflicts. The conflict UI pre-selects the more recently committed version's changes but allows the user to override. No authority-based resolution — all users' changes are treated equally. This is a suggestion, not an auto-resolution.

> **Q**: Should conflicts block all other operations on the affected spec until resolved?
> **A**: Yes. A spec in conflict state is locked for editing until the conflict is resolved. Other specs unaffected by the merge remain editable. The conflict lock prevents compounding conflicts. The UI shows a clear "Resolve conflict to continue editing" message on locked specs.

> **Q**: Should the system use advisory locking to prevent concurrent edits to the same spec on the same branch?
> **A**: Yes. When a user opens a spec for editing, the server acquires a PostgreSQL advisory lock (keyed on `specId + branchName`). If another user tries to edit the same spec on the same branch, they see: "Alice is currently editing this spec. You can view it read-only or wait." The lock is released when the user saves, closes the editor, or after a 5-minute inactivity timeout.

> **Q**: Should the frontend show real-time editing presence (who is currently editing which spec) to reduce conflicts?
> **A**: Yes. The spec list view shows a small avatar indicator next to specs currently being edited by another user. This is powered by WebSocket presence events. Lightweight — just a `{ specId, userId, timestamp }` broadcast on edit-start and edit-end. No full CRDT/collaborative editing — just presence awareness.

> **Q**: Should the system auto-commit before a user switches branches, or require manual commit/stash?
> **A**: Require manual save before switching branches. If the user has unsaved changes, the branch switch button shows: "Save or discard changes before switching branches." There is no automatic stash — stashing is a git-power-user concept that would confuse non-technical users. The two options are "Save" (commit changes) or "Discard" (revert to last committed state).

---

## 10. Delta Detection

### 10.1 Change Detection

- [ ] **KG-VC-091**: Implement `detectDeltas(sinceCommit, untilCommit?)` operation
  - Find all knowledge graph changes between two commits
  - Default `untilCommit`: current HEAD
  - Return structured change list
- [ ] **KG-VC-092**: Define delta result type
  ```typescript
  interface DeltaResult {
    fromCommit: string;
    toCommit: string;
    specs: {
      created: string[];
      modified: string[];
      deleted: string[];
    };
    edges: {
      created: string[];
      modified: string[];
      deleted: string[];
    };
    documents: {
      created: string[];
      modified: string[];
      deleted: string[];
    };
    commitCount: number;
    authors: string[];
    dateRange: { from: string, to: string };
  }
  ```
- [ ] **KG-VC-093**: Implement file-path-to-entity-ID mapping for deltas
  - Given `git diff --name-status` output, map file paths to entity IDs
  - `knowledge-graph/specs/sp_xxxx/content.md` → spec `sp_xxxx` modified
  - `knowledge-graph/edges/eg_xxxx.json` → edge `eg_xxxx` created/modified/deleted
  - Group by entity for deduplication (multiple files in one spec = one modification)

### 10.2 Delta Since Last Plan

- [ ] **KG-VC-094**: Implement `detectDeltasSinceLastPlan(planId?)` operation
  - Find the commit associated with the last plan generation
  - Compute deltas from that commit to HEAD
  - Used by plan generation engine to produce incremental plans
- [ ] **KG-VC-095**: Implement plan generation bookmark
  - After a plan is generated, record the commit hash as a "plan point"
  - Store in a special file: `knowledge-graph/.plan-checkpoints.json`
  - Each entry: `{ planId, commitHash, generatedAt, author }`
- [ ] **KG-VC-096**: Implement delta impact analysis
  - For each modified spec in the delta, determine impact scope
  - Impact = specs directly connected via edges + dependent specs
  - Help plan generation engine focus on what matters

### 10.3 Delta Notification

- [ ] **KG-VC-097**: Implement delta event emission
  - After each commit, compute delta from previous HEAD
  - Emit WebSocket events for changed entities
  - Used by frontend for real-time update indicators
- [ ] **KG-VC-098**: Implement delta summary for users
  - Human-readable summary of changes since last visit
  - "3 specs modified, 1 new edge, 2 inquiries created since you last logged in"
  - Stored per-user: last-seen commit hash

#### Design Decisions

> **Q**: Should delta detection be limited to knowledge graph files, or also track changes to project code that may be relevant to specs?
> **A**: Limited to knowledge graph files only (`specs/`, `edges/`, `documents/`). The knowledge graph system does not monitor application source code. If source code changes are relevant to specs, the user or an external integration creates/updates specs manually. Tracking source code changes would require understanding arbitrary codebases — out of scope.

> **Q**: Should the delta detection system maintain a "change journal" in addition to git-derived deltas for real-time change tracking?
> **A**: No separate change journal. The server maintains an in-memory event stream of recent operations (last 1000 events) for real-time WebSocket notifications. Git commits are the durable change record. A journal file would duplicate git history. The in-memory event stream handles the real-time use case; git handles the historical use case.

> **Q**: How should deltas handle rebased or amended commits (which rewrite history)?
> **A**: The system does not support interactive rebase or commit amend through the UI. These are destructive git operations that conflict with the append-only nature of spec versioning. If a user performs these operations via git CLI directly, the server detects the divergence on next sync and treats it as a force-push: resync from the remote state, create inquiries for any discrepancies. The `version` field in `spec.json` may need reconciliation.

---

## 11. Change Tracking & Agent Triggers

### 11.1 Change Classification

- [ ] **KG-VC-099**: Implement change significance classification
  - `major` — structural change (new spec, deleted spec, status change, new dependency edge)
  - `minor` — content update, tag change, metadata update
  - `trivial` — embedding update, index rebuild, formatting change
  - Classification used to determine if agent re-analysis is needed
- [ ] **KG-VC-100**: Implement change scope analysis
  - For each change, compute the "blast radius"
  - How many specs are affected by this change (direct + transitive)
  - Higher blast radius = higher priority for agent review
- [ ] **KG-VC-101**: Implement change grouping
  - Group related changes (same commit, same author, same time window)
  - Present grouped changes as a single "change event"
  - Prevents notification spam for batch operations

### 11.2 Agent Trigger Conditions

- [ ] **KG-VC-102**: Define agent trigger conditions
  - New spec created → agent analyzes for edge suggestions
  - Spec content significantly changed → agent re-evaluates related edges
  - Spec deprecated → agent checks impact on dependent specs
  - New edge created → agent verifies consistency
  - Orphan detected → agent suggests positioning
  - Contradiction detected → agent creates inquiry
- [ ] **KG-VC-103**: Implement trigger evaluation engine
  - After each commit, evaluate trigger conditions
  - Queue triggered agent tasks
  - Deduplicate: don't trigger the same analysis twice
- [ ] **KG-VC-104**: Implement trigger configuration
  - Enable/disable specific triggers
  - Configure trigger sensitivity (e.g., minimum content change size for re-analysis)
  - Per-project or per-user trigger settings
- [ ] **KG-VC-105**: Implement trigger rate limiting
  - Maximum agent tasks per time window
  - Prevent cascade of agent tasks from large batch operations
  - Queue overflow: drop or defer low-priority triggers

#### Design Decisions

> **Q**: Should agent triggers be opt-in (user configures which triggers to enable) or opt-out (all triggers enabled by default)?
> **A**: Opt-out. All triggers enabled by default: spec creation triggers edge suggestion crawl, spec update triggers implication analysis, spec deletion triggers orphan check. Users can disable specific triggers in project settings (`.kg-config.json`). Opt-out ensures new users get the full benefit of agent analysis without configuration. Power users can tune down the automation.

> **Q**: Should there be a "quiet mode" where agent triggers are suppressed (e.g., during large imports or migrations)?
> **A**: Yes. `quietMode: true` in the batch operation request or the import request suppresses all agent triggers for the duration of that operation. After the operation completes, a single comprehensive agent crawl runs across all affected specs. This prevents trigger storms during bulk operations while ensuring analysis still happens.

> **Q**: How should the system handle trigger cascades (agent change triggers another agent, which triggers another)? Maximum depth? Cooldown period?
> **A**: Maximum cascade depth: 2. An agent operation can trigger one follow-up agent operation (depth 1), which can trigger one more (depth 2). At depth 2, any further triggers are queued as inquiries instead of auto-executing. This prevents infinite cascades while allowing reasonable follow-on analysis. Cooldown: 5-second minimum between cascaded triggers for the same spec.

> **Q**: Should the user be able to review and approve agent-triggered actions before they execute?
> **A**: Not by default — agent triggers execute automatically (this is the value of automation). However, users can enable "approval mode" per trigger type in project settings. In approval mode, the agent's proposed changes are staged as a preview in the inquiry queue, and the user approves or rejects. This is useful for cautious users or sensitive knowledge domains.

---

## 12. Audit Trail

### 12.1 Audit Log Generation

- [ ] **KG-VC-106**: Implement audit trail from git log
  - Git history IS the audit trail for the knowledge graph
  - Every change is recorded in a commit with structured metadata
  - Audit queries are git log queries with filters
- [ ] **KG-VC-107**: Implement `getAuditLog(options)` operation
  - Options: `{ specId?, author?, action?, since?, until?, limit?, offset? }`
  - Return paginated audit entries
  - Each entry: who, what, when, which spec(s), commit hash
- [ ] **KG-VC-108**: Define audit entry type
  ```typescript
  interface AuditEntry {
    commitHash: string;
    author: string;
    date: string;
    action: string;
    scope: string;
    entityIds: string[];
    message: string;
    isAgentAction: boolean;
    agentSessionId?: string;
  }
  ```

### 12.2 Audit Queries

- [ ] **KG-VC-109**: Implement `getSpecAuditTrail(specId)` operation
  - Full history of all actions on a specific spec
  - Include: creation, content updates, metadata changes, status changes, reverts
  - Include: edge additions/removals involving this spec
  - Include: document membership changes
- [ ] **KG-VC-110**: Implement `getUserAuditTrail(userId)` operation
  - All actions by a specific user
  - Used for activity tracking and attribution
- [ ] **KG-VC-111**: Implement `getAgentAuditTrail(sessionId)` operation
  - All changes made during a specific agent session
  - Used for reviewing agent actions after the session
  - Essential for trust-building: users can see exactly what the agent did
- [ ] **KG-VC-112**: Implement audit statistics
  - Changes per day/week/month
  - Most active authors
  - Most frequently modified specs
  - Agent vs. human action ratio

#### Design Decisions

> **Q**: Is git log alone sufficient as an audit trail, or should there be a separate database-backed audit log?
> **A**: Both. Git log is the primary audit trail for knowledge graph content changes (who changed what, when). The PostgreSQL `audit_logs` table captures operations that don't produce git commits: permission changes, login events, agent session activity, sync operations, inquiry resolutions. Together, they provide a complete audit trail.

> **Q**: Should the audit trail include read operations (who viewed a spec), or only write operations?
> **A**: Write operations only. Logging reads would generate massive volume (every page view = a log entry) with limited audit value. The `lastViewedVersion` per-user-per-spec table captures viewing activity for the "changes since last viewed" feature, but this is not an audit log — it's a UX feature. If compliance requires read logging, it can be enabled as an opt-in project setting.

> **Q**: Should audit log entries be immutable (append-only) or prunable after a retention period?
> **A**: Append-only with pruning after 1 year. The `audit_logs` table uses a database trigger to reject `UPDATE` and `DELETE` operations. A scheduled job prunes entries older than 1 year (configurable via `AUDIT_RETENTION_DAYS` environment variable). Git log entries are permanent and unprunable — they serve as the long-term audit trail.

> **Q**: Should the audit trail be searchable in the UI, or only accessible via API?
> **A**: Searchable in the UI via an "Activity Log" view. The UI provides filters: by user, by date range, by action type, by affected spec. This view queries the PostgreSQL `audit_logs` table with appropriate indexes. For git-level history, the spec detail view shows the version history (derived from git log).

> **Q**: For compliance purposes, should the audit trail include IP addresses and session information?
> **A**: Yes. The `audit_logs` table includes `ip_address` and `session_id` columns. IP addresses are logged from the HTTP request. Session IDs link to the `agent_sessions` or user authentication sessions. This supports compliance investigation without being excessively invasive. IP addresses are subject to the same pruning/anonymization policy as other audit data.

---

## 13. Performance & Optimization

### 13.1 Git Operation Optimization

- [ ] **KG-VC-113**: Implement git log caching
  - Cache recent git log results per spec
  - Invalidate on new commits
  - Reduces repetitive git process spawning
- [ ] **KG-VC-114**: Implement batch git operations
  - For operations touching multiple specs, use a single `git add` and `git commit`
  - Avoid committing per-file for batch operations
  - Reduces git overhead significantly for bulk operations
- [ ] **KG-VC-115**: Implement `git log` result pagination
  - Use `--skip` and `--max-count` for paginated history retrieval
  - Avoid loading full history into memory for specs with many versions
- [ ] **KG-VC-116**: Implement shallow git operations where possible
  - For history display, load only the needed depth
  - Full history only when specifically requested (e.g., full audit trail)

### 13.2 Diff Caching

- [ ] **KG-VC-117**: Implement diff result caching
  - Cache computed diffs between commit pairs
  - Diffs are immutable (commit contents don't change)
  - Cache can grow indefinitely — implement LRU eviction
- [ ] **KG-VC-118**: Implement incremental diff computation
  - For adjacent versions: compute diff from git directly
  - For distant versions: compose intermediate diffs or compute directly
  - Direct computation is simpler; composition is faster for large files with many versions

### 13.3 Background Processing

- [ ] **KG-VC-119**: Implement background index rebuild after commits
  - Don't block the commit operation waiting for index updates
  - Queue index rebuild as background task
  - Serve stale index until rebuild completes
- [ ] **KG-VC-120**: Implement background integrity check after merges
  - Don't block the merge operation waiting for integrity validation
  - Queue integrity check as background task
  - Create inquiries asynchronously if issues found
- [ ] **KG-VC-121**: Implement background delta computation
  - After each commit, compute delta in background
  - Emit WebSocket events when delta computation completes
  - Evaluate agent triggers in background

### 13.4 Git Repository Maintenance

- [ ] **KG-VC-122**: Implement periodic `git gc` (garbage collection)
  - Schedule git garbage collection to compress history
  - Run during low-activity periods
  - Reduces repository size and improves performance
- [ ] **KG-VC-123**: Implement `git repack` for large repositories
  - Repack loose objects into packfiles
  - Run less frequently than gc
  - Significant performance improvement for repositories with many objects
- [ ] **KG-VC-124**: Monitor repository size and performance
  - Track repository size over time
  - Track git operation latency
  - Alert when performance degrades below thresholds
  - Recommend maintenance actions

#### Design Decisions

> **Q**: At what repository size (number of commits) does git log performance become unacceptable? Should there be a `git log` result cache in PostgreSQL?
> **A**: Git log performance degrades noticeably at ~100K commits for full-repo queries. For per-file queries (`git log -- path/to/file`), performance is acceptable up to ~500K commits. The system caches the most recent 50 version entries per spec in PostgreSQL (`spec_versions` table: `spec_id, version, commit_hash, timestamp, author`). This cache is populated on write and avoids `git log` calls for the common "show recent history" use case.

> **Q**: Should the system use `libgit2` bindings (like `nodegit` or `isomorphic-git`) instead of shelling out to `git` CLI for better performance?
> **A**: Use `simple-git` (per PRD), which shells out to the git CLI. `simple-git` is the PRD-specified library. It provides a clean async API over git commands, works reliably under Bun, and avoids the native dependency compilation issues of `nodegit`. Git CLI performance is sufficient for the target scale. `isomorphic-git` lacks features needed for merging and complex operations.

> **Q**: For frequently accessed specs with long version histories, should the system pre-compute and cache version metadata?
> **A**: Yes. The PostgreSQL `spec_versions` cache (described above) stores the last 50 version entries per spec. For specs with >50 versions, the UI paginates ("Load older versions") and those are fetched from git log on demand. This covers the 99% use case (recent history) without unbounded storage.

> **Q**: What is the acceptable latency for `git commit`? <100ms? <500ms? Does this include index updates?
> **A**: Target: <300ms for a single-spec commit. This includes: file write (~20ms), `git add` (~30ms), `git commit` (~100–200ms), in-memory index update (~1ms). For batch commits (agent operations touching 10+ specs), target: <500ms total. Git commit latency depends on repo size and disk speed. At 50K specs with SSD, `git commit` is consistently <200ms.

---

## Summary

### Task Count by Section

| Section | Tasks |
|---------|-------|
| 1. Git Repository Setup | 7 (KG-VC-001 through KG-VC-007) |
| 2. Commit Strategy | 11 (KG-VC-008 through KG-VC-018) |
| 3. Spec-Level Version Tracking | 10 (KG-VC-019 through KG-VC-028) |
| 4. History Retrieval | 8 (KG-VC-029 through KG-VC-036) |
| 5. Diff Generation | 11 (KG-VC-037 through KG-VC-047) |
| 6. Revert Operations | 10 (KG-VC-048 through KG-VC-057) |
| 7. Branch Management | 10 (KG-VC-058 through KG-VC-067) |
| 8. Merge Strategy | 11 (KG-VC-068 through KG-VC-078) |
| 9. Conflict Detection & Resolution | 12 (KG-VC-079 through KG-VC-090) |
| 10. Delta Detection | 8 (KG-VC-091 through KG-VC-098) |
| 11. Change Tracking & Agent Triggers | 7 (KG-VC-099 through KG-VC-105) |
| 12. Audit Trail | 7 (KG-VC-106 through KG-VC-112) |
| 13. Performance & Optimization | 12 (KG-VC-113 through KG-VC-124) |
| **TOTAL** | **124** |

### Dependencies (What This Plan Enables)

Completion of this plan unblocks:
- `02-FRONTEND/08-VERSION-CONTROL-UI-PLAN.md` — needs diff, history, revert, branch, merge APIs
- `06-AGENT-SYSTEM/05-PLAN-GENERATION-PLAN.md` — needs delta detection for incremental plans
- `10-COLLABORATION/PLAN.md` — needs branch, merge, conflict resolution for multi-user sync
- `03-SERVER/05-GIT-INTEGRATION-PLAN.md` — provides the high-level operations that the git service implements

### Definition of Done

This plan is complete when:
- [ ] Commits are created with conventional messages and structured metadata
- [ ] Per-spec version history is derivable from git log
- [ ] Diffs are generated at content, metadata, and spec.json levels
- [ ] Revert operations restore specs to any historical version
- [ ] Branch create/list/switch/delete operations work
- [ ] Merge operations handle clean merges automatically
- [ ] Conflicts are detected, categorized, and resolvable through the API
- [ ] Delta detection identifies changes since any reference point
- [ ] Agent triggers fire on significant changes
- [ ] Audit trail is queryable per-spec, per-user, and per-agent-session
- [ ] Git operations are performant up to 10,000 specs
- [ ] Background processing handles index rebuilds and integrity checks without blocking
