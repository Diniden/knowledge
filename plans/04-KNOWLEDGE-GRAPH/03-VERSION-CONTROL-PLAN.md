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
