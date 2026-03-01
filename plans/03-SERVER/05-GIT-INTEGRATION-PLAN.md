# 03-SERVER / 05 — GIT INTEGRATION PLAN

> **Purpose**: Define the complete git integration layer including the git
> service implementation, repository initialization and cloning, commit
> creation strategies, branch management, merge operations, pull/push sync,
> diff generation, commit hash tracking per spec, git hooks, repository health
> checks, garbage collection, and conflict resolution helpers.
>
> **Phase**: 2 (Core Systems)
> **Dependencies**: `03-SERVER/01-ARCHITECTURE-PLAN.md`, `04-KNOWLEDGE-GRAPH/01-ARCHITECTURE-PLAN.md`
> **Estimated tasks**: 140+

---

## Table of Contents

1. [Git Library Selection & Configuration](#1-git-library-selection--configuration)
2. [Repository Initialization & Cloning](#2-repository-initialization--cloning)
3. [Commit Operations](#3-commit-operations)
4. [Branch Management](#4-branch-management)
5. [Merge Operations](#5-merge-operations)
6. [Pull & Push Operations](#6-pull--push-operations)
7. [Diff Generation](#7-diff-generation)
8. [Commit Hash Tracking Per Spec](#8-commit-hash-tracking-per-spec)
9. [Git Hooks](#9-git-hooks)
10. [Repository Health & Maintenance](#10-repository-health--maintenance)
11. [Conflict Resolution Helpers](#11-conflict-resolution-helpers)
12. [Git Service Architecture](#12-git-service-architecture)

---

## 1. Git Library Selection & Configuration

### 1.1 Library Selection

- [ ] **SV-GIT-001**: Evaluate git implementation options for Bun runtime
  - Option A: `simple-git` — wraps git CLI, well-tested, requires git binary
  - Option B: `isomorphic-git` — pure JS, no git binary needed, some limitations
  - Option C: Direct shell commands via Bun's `spawn()` — full control, most effort
  - Recommend: `simple-git` for reliability, fall back to shell commands for unsupported ops
- [ ] **SV-GIT-002**: Install and configure chosen git library
  - Add to server `package.json`
  - Verify compatibility with Bun runtime
  - Run basic operations test: init, add, commit, log
  - Document any Bun-specific workarounds
- [ ] **SV-GIT-003**: Verify git binary availability
  - Check `git --version` on startup
  - Require minimum git version: 2.30+ (for modern features)
  - Log git version and path
  - Fail startup with clear error if git not available

### 1.2 Configuration

- [ ] **SV-GIT-004**: Configure git environment for server operations
  - Set `GIT_AUTHOR_NAME` and `GIT_AUTHOR_EMAIL` from config
  - Set `GIT_COMMITTER_NAME` and `GIT_COMMITTER_EMAIL` from config
  - Support per-user git identity (use authenticated user's info)
  - Disable interactive prompts: `GIT_TERMINAL_PROMPT=0`
  - Set `GIT_SSH_COMMAND` for SSH key authentication if needed
- [ ] **SV-GIT-005**: Configure git defaults per repository
  - Set `core.autocrlf` to `input` (normalize line endings)
  - Set `core.fileMode` to `false` (ignore file permission changes)
  - Set `merge.conflictstyle` to `diff3` (show base in conflicts)
  - Set `pull.rebase` to `false` (use merge, not rebase)
  - Disable git LFS for knowledge graph repos (JSON files are small)
- [ ] **SV-GIT-006**: Configure SSH/HTTPS authentication for remotes
  - Support HTTPS with token authentication (personal access tokens)
  - Support SSH key authentication (configurable key path)
  - Store credentials securely (not in git config, use env or secrets)
  - Log authentication method used (never log credentials)

---

## 2. Repository Initialization & Cloning

### 2.1 Repository Initialization

- [ ] **SV-GIT-007**: Implement `initRepository(projectPath: string): Promise<void>`
  - Create directory if it doesn't exist
  - Run `git init` in the directory
  - Set configured defaults (see SV-GIT-005)
  - Create initial `.gitignore` file
  - Create initial directory structure for knowledge graph
  - Create initial commit ("Initialize knowledge graph")
- [ ] **SV-GIT-008**: Define initial `.gitignore` for knowledge graph repos
  - Ignore: `node_modules/`, `.env`, `.DS_Store`, `*.tmp`, `*.lock`
  - Ignore: `.claude/` (Claude Code working files)
  - Ignore: `gen/*/dist/`, `gen/*/node_modules/` (generated UI build artifacts)
  - Allow: all `.json` files, all `.md` files
- [ ] **SV-GIT-009**: Create initial knowledge graph directory structure
  - `specs/` — individual spec JSON files
  - `documents/` — document metadata JSON files
  - `graph/` — edge definitions and graph metadata
  - `media/` — uploaded media files
  - `gen/` — generated UI projects (per user)
  - `config/` — project configuration files
  - Create placeholder `README.md` in root
- [ ] **SV-GIT-010**: Implement post-init validation
  - Verify `.git` directory exists
  - Verify `git status` returns clean state
  - Verify initial commit exists in log
  - Log successful initialization

### 2.2 Repository Cloning

- [ ] **SV-GIT-011**: Implement `cloneRepository(remoteUrl: string, localPath: string): Promise<void>`
  - Validate remote URL format (HTTPS or SSH)
  - Create parent directory if needed
  - Run `git clone` with configured authentication
  - Support shallow clone option (`--depth 1`) for faster initial clone
  - Support branch selection (`--branch <name>`)
  - Report progress via callback (for WebSocket updates)
- [ ] **SV-GIT-012**: Implement clone progress reporting
  - Parse git clone stderr for progress information
  - Extract: receiving objects %, resolving deltas %, total size
  - Forward progress to WebSocket for user notification
  - Estimated time remaining (based on progress rate)
- [ ] **SV-GIT-013**: Handle clone failures gracefully
  - Auth failure → clear error message (check credentials)
  - Network failure → retry with backoff (3 attempts)
  - Disk space → check available space before cloning
  - Invalid URL → validate URL format before attempting clone
  - Clean up partial clone directory on failure
- [ ] **SV-GIT-014**: Validate cloned repository structure
  - Verify expected directory structure exists (specs/, documents/, graph/)
  - Verify knowledge graph configuration is present
  - Create missing directories if partial structure
  - Log validation results

---

## 3. Commit Operations

### 3.1 Single-Spec Commits

- [ ] **SV-GIT-015**: Implement `commitSpec(specId: string, message: string, author: GitAuthor): Promise<CommitResult>`
  - Stage only the specific spec file (`specs/{specId}.json`)
  - Stage related graph changes if any (edge files referencing this spec)
  - Create commit with descriptive message
  - Author: use authenticated user's git identity
  - Return: commit hash, timestamp, files changed
- [ ] **SV-GIT-016**: Implement auto-generated commit messages for spec changes
  - Create: `spec: Create "{specTitle}" ({specId})`
  - Update: `spec: Update "{specTitle}" ({specId})`
  - Delete: `spec: Delete "{specTitle}" ({specId})`
  - Include change summary in commit body (e.g., "Updated content, added 2 tags")
  - Support custom commit messages (override auto-generated)
- [ ] **SV-GIT-017**: Implement spec file staging logic
  - Determine which files changed for a spec operation
  - Stage spec JSON file
  - Stage document metadata file if spec-to-document mapping changed
  - Stage graph node file if node metadata changed
  - Do NOT stage unrelated changes

### 3.2 Batch Commits

- [ ] **SV-GIT-018**: Implement `commitBatch(changes: FileChange[], message: string, author: GitAuthor): Promise<CommitResult>`
  - Stage all specified files
  - Create single commit for the batch
  - Use descriptive batch commit message
  - Return: commit hash, list of changed files
- [ ] **SV-GIT-019**: Implement batch commit message generation
  - Summarize batch: "batch: Update 5 specs, add 3 edges"
  - List individual changes in commit body
  - Include spec titles for readability
- [ ] **SV-GIT-020**: Implement atomic batch validation
  - Validate all files exist and are tracked before committing
  - If any file fails validation, reject entire batch
  - Return detailed error indicating which file(s) failed
  - Clean staging area on failure

### 3.3 Edge Commits

- [ ] **SV-GIT-021**: Implement `commitEdge(edgeId: string, message: string, author: GitAuthor): Promise<CommitResult>`
  - Stage edge definition file (`graph/edges/{edgeId}.json`)
  - Create commit for edge change
  - Message format: `edge: Create {type} edge {sourceSpec} → {targetSpec}`
- [ ] **SV-GIT-022**: Implement edge batch commit for graph operations
  - Stage multiple edge changes in single commit
  - Used when agent creates multiple edges during analysis
  - Message: `graph: Add {count} edges from analysis`

### 3.4 Commit Metadata

- [ ] **SV-GIT-023**: Define `CommitResult` interface
  - `hash`: string (full SHA-1 hash)
  - `shortHash`: string (7-char abbreviated hash)
  - `message`: string (commit message)
  - `author`: `{ name: string, email: string }`
  - `timestamp`: Date
  - `files`: `{ path: string, status: 'A' | 'M' | 'D' }[]`
- [ ] **SV-GIT-024**: Define `GitAuthor` interface
  - `name`: string (display name)
  - `email`: string (email address)
  - Populated from authenticated user's profile
  - Fallback: server identity for system-generated commits
- [ ] **SV-GIT-025**: Implement commit signing (optional, phase 5)
  - Support GPG signing for commits
  - Configure signing key per user or per server
  - Verify signatures on incoming commits

---

## 4. Branch Management

### 4.1 Branch CRUD

- [ ] **SV-GIT-026**: Implement `createBranch(name: string, fromRef?: string): Promise<BranchInfo>`
  - Create new branch from current HEAD or specified ref
  - Validate branch name format (no spaces, valid git ref)
  - Return branch info: name, head commit, creation point
  - Do NOT switch to new branch automatically
- [ ] **SV-GIT-027**: Implement `deleteBranch(name: string, force?: boolean): Promise<void>`
  - Delete local branch
  - Prevent deletion of current branch
  - Prevent deletion of main/master branch
  - `force: true` required to delete unmerged branches
  - Optionally delete remote tracking branch
- [ ] **SV-GIT-028**: Implement `listBranches(): Promise<BranchInfo[]>`
  - List all local branches
  - Include: name, head commit hash, last commit date, last commit message
  - Mark current (active) branch
  - Optionally include remote-only branches
  - Sort by last commit date (most recent first)
- [ ] **SV-GIT-029**: Implement `switchBranch(name: string): Promise<SwitchResult>`
  - Switch working directory to target branch
  - Check for uncommitted changes before switching
  - If uncommitted changes exist: reject with list of dirty files
  - Return: new branch name, head commit
  - Emit event for knowledge graph cache invalidation
- [ ] **SV-GIT-030**: Implement `getCurrentBranch(): Promise<string>`
  - Return name of current active branch
  - Handle detached HEAD state (return commit hash)

### 4.2 Branch Naming Conventions

- [ ] **SV-GIT-031**: Define and enforce branch naming conventions
  - Main branch: `main` (not `master`)
  - Feature branches: `feature/{description}`
  - User branches: `user/{username}/{description}`
  - Agent branches: `agent/{sessionId}/{description}`
  - Validate branch names on creation
  - Reject: spaces, special chars (except `/`, `-`, `_`), consecutive dots
- [ ] **SV-GIT-032**: Implement branch protection rules
  - `main` branch: require merge (no direct commits in multi-user mode)
  - Allow direct commits to `main` in single-user mode
  - Configurable per project

### 4.3 Branch Comparison

- [ ] **SV-GIT-033**: Implement `compareBranches(base: string, head: string): Promise<BranchComparison>`
  - Count commits ahead/behind between branches
  - List changed files between branches
  - Return: aheadCount, behindCount, changedFiles
- [ ] **SV-GIT-034**: Implement `getBranchHistory(branchName: string, limit?: number): Promise<CommitInfo[]>`
  - List commits on a branch (paginated)
  - Include: hash, message, author, timestamp, files changed
  - Support filtering by date range
  - Support filtering by file path

---

## 5. Merge Operations

### 5.1 Merge Strategies

- [ ] **SV-GIT-035**: Implement `mergeBranch(source: string, target?: string): Promise<MergeResult>`
  - Merge source branch into target (default: current branch)
  - Attempt fast-forward merge first
  - Fall back to three-way merge if needed
  - Detect and report conflicts
  - Return: MergeResult with status and details
- [ ] **SV-GIT-036**: Define `MergeResult` interface
  - `status`: 'fast-forward' | 'merged' | 'conflict' | 'already-up-to-date'
  - `commitHash`: string (null if conflict)
  - `mergedFiles`: string[] (files successfully merged)
  - `conflictFiles`: string[] (files with conflicts)
  - `conflictDetails`: ConflictDetail[] (per-file conflict info)
- [ ] **SV-GIT-037**: Implement fast-forward merge
  - Detect when fast-forward is possible (no divergent commits)
  - Perform fast-forward (just move branch pointer)
  - No merge commit created
  - Return status: 'fast-forward'
- [ ] **SV-GIT-038**: Implement three-way merge
  - Perform three-way merge with automatic resolution where possible
  - Use `merge.conflictstyle=diff3` for conflict markers
  - Create merge commit with descriptive message
  - Return status: 'merged' or 'conflict'

### 5.2 Conflict Detection

- [ ] **SV-GIT-039**: Implement merge conflict detection
  - Parse `git merge` output for conflict indicators
  - Identify conflicted files
  - Categorize conflict type: content conflict, add/add, modify/delete
  - Parse conflict markers in affected files
- [ ] **SV-GIT-040**: Implement `getConflicts(): Promise<ConflictDetail[]>`
  - List all currently conflicted files
  - For each conflict:
    - File path
    - Conflict type
    - "Ours" content (current branch version)
    - "Theirs" content (incoming branch version)
    - "Base" content (common ancestor version)
  - Parse JSON-aware conflict boundaries for knowledge graph files
- [ ] **SV-GIT-041**: Implement JSON-aware conflict parsing
  - Knowledge graph files are JSON
  - Parse conflict markers within JSON structure
  - Identify conflicting fields/properties
  - Present field-level conflicts (not raw text conflicts)
  - Handle malformed JSON in conflict regions

### 5.3 Merge Undo

- [ ] **SV-GIT-042**: Implement `abortMerge(): Promise<void>`
  - Abort an in-progress merge (with conflicts)
  - Restore working directory to pre-merge state
  - Clear all conflict markers
  - Return to previous branch state
- [ ] **SV-GIT-043**: Implement merge commit revert
  - Revert a completed merge commit
  - Create a new commit that undoes the merge
  - Preserve history (no rewriting)
  - Used for backing out problematic merges

---

## 6. Pull & Push Operations

### 6.1 Pull (Fetch + Merge)

- [ ] **SV-GIT-044**: Implement `pull(remote?: string, branch?: string): Promise<PullResult>`
  - Default remote: `origin`
  - Default branch: current branch
  - Fetch latest changes from remote
  - Merge fetched changes into local branch
  - Report conflicts if they arise
  - Return: PullResult with status, new commits, conflicts
- [ ] **SV-GIT-045**: Implement `fetch(remote?: string): Promise<FetchResult>`
  - Fetch all refs from remote without merging
  - Update remote tracking branches
  - Return: new commits available, branches updated
  - Useful for checking if updates are available before pulling
- [ ] **SV-GIT-046**: Define `PullResult` interface
  - `status`: 'up-to-date' | 'merged' | 'fast-forward' | 'conflict'
  - `newCommits`: CommitInfo[] (commits pulled)
  - `changedFiles`: FileChange[] (files changed by pull)
  - `conflicts`: ConflictDetail[] (if any)
- [ ] **SV-GIT-047**: Implement pull with uncommitted changes handling
  - If working directory has uncommitted changes:
    - Option A: reject pull, ask user to commit first
    - Option B: stash changes, pull, pop stash (risk conflicts)
  - Default: reject pull, return list of uncommitted files
  - Support `force: true` to stash-pull-pop

### 6.2 Push

- [ ] **SV-GIT-048**: Implement `push(remote?: string, branch?: string): Promise<PushResult>`
  - Default remote: `origin`
  - Default branch: current branch
  - Push local commits to remote
  - Report success or failure
  - Return: PushResult with status and details
- [ ] **SV-GIT-049**: Define `PushResult` interface
  - `status`: 'success' | 'rejected' | 'error'
  - `commitsPushed`: number
  - `rejection reason`: string (if rejected — usually needs pull first)
  - `remoteUrl`: string (where pushed to)
- [ ] **SV-GIT-050**: Handle push rejection
  - Detect "non-fast-forward" rejection
  - Return clear error: "Remote has new changes. Pull first."
  - Never force-push (unless explicitly requested by admin)
  - Log push rejection for monitoring

### 6.3 Remote Management

- [ ] **SV-GIT-051**: Implement `addRemote(name: string, url: string): Promise<void>`
  - Add a remote to the repository
  - Validate URL format
  - Test connectivity to remote (optional)
- [ ] **SV-GIT-052**: Implement `removeRemote(name: string): Promise<void>`
  - Remove a remote from the repository
  - Prevent removal of sole remote (warn)
- [ ] **SV-GIT-053**: Implement `listRemotes(): Promise<RemoteInfo[]>`
  - List all configured remotes
  - Include: name, fetch URL, push URL
- [ ] **SV-GIT-054**: Implement remote connectivity check
  - `checkRemote(name: string): Promise<boolean>`
  - Test if remote is reachable (git ls-remote)
  - Timeout: 10 seconds
  - Used in health checks and pre-push validation

---

## 7. Diff Generation

### 7.1 Working Directory Diff

- [ ] **SV-GIT-055**: Implement `getUncommittedDiff(): Promise<DiffResult>`
  - Show diff between working directory and HEAD
  - Include staged and unstaged changes
  - Return structured diff (not raw git diff text)
  - Parse into per-file change sets
- [ ] **SV-GIT-056**: Implement `getFileDiff(filePath: string): Promise<FileDiff>`
  - Show diff for a single file
  - Return: additions, deletions, context lines
  - Support for JSON-aware diff (structured field changes)

### 7.2 Commit-to-Commit Diff

- [ ] **SV-GIT-057**: Implement `getDiffBetweenCommits(fromHash: string, toHash: string): Promise<DiffResult>`
  - Generate diff between any two commits
  - Return structured diff
  - Used for version history comparison
- [ ] **SV-GIT-058**: Implement `getSpecDiffBetweenCommits(specId: string, fromHash: string, toHash: string): Promise<SpecDiff>`
  - Generate diff for a specific spec between two commits
  - Extract spec content at both commits
  - Compare and return structured diff
  - Highlight: content changes, metadata changes, tag changes

### 7.3 Diff Formatting

- [ ] **SV-GIT-059**: Define `DiffResult` interface
  - `files`: FileDiff[] — per-file changes
  - `stats`: { additions: number, deletions: number, filesChanged: number }
- [ ] **SV-GIT-060**: Define `FileDiff` interface
  - `path`: string
  - `status`: 'added' | 'modified' | 'deleted' | 'renamed'
  - `hunks`: DiffHunk[] — change sections
  - `oldPath`: string (if renamed)
  - `binary`: boolean
- [ ] **SV-GIT-061**: Define `DiffHunk` interface
  - `oldStart`: number (line number in old version)
  - `oldLines`: number (count of lines in old version)
  - `newStart`: number (line number in new version)
  - `newLines`: number (count of lines in new version)
  - `lines`: DiffLine[] — individual line changes
- [ ] **SV-GIT-062**: Define `DiffLine` interface
  - `type`: 'addition' | 'deletion' | 'context'
  - `content`: string (line content)
  - `oldLineNumber`: number | null
  - `newLineNumber`: number | null

### 7.4 JSON-Aware Diff

- [ ] **SV-GIT-063**: Implement JSON-aware diff for knowledge graph files
  - Parse both versions as JSON
  - Compare at the property level (not line level)
  - Identify: added fields, removed fields, changed values
  - Preserve meaningful structure (not just text diff)
  - Used for spec and edge diff display
- [ ] **SV-GIT-064**: Implement JSON diff formatting for frontend
  - Format JSON diff as structured change set
  - Each change: path (e.g., "content.sections[2].text"), oldValue, newValue
  - Support nested object/array changes
  - Frontend can render field-level changes instead of raw text diff
- [ ] **SV-GIT-065**: Handle JSON diff edge cases
  - Large content changes (entire content replaced)
  - Array reordering (move detection)
  - Null vs undefined vs missing field
  - Non-JSON files fallback to text diff

---

## 8. Commit Hash Tracking Per Spec

### 8.1 Spec-to-Commit Association

- [ ] **SV-GIT-066**: Implement spec version tracking via commit hashes
  - On each spec commit, record: specId, commitHash, timestamp
  - Store in spec metadata (JSON) and/or database
  - Allow querying: "which commits contain changes to spec X?"
  - Allow querying: "what was spec X at commit Y?"
- [ ] **SV-GIT-067**: Implement `getSpecHistory(specId: string): Promise<SpecVersion[]>`
  - Use `git log --follow -- specs/{specId}.json` to get spec-specific history
  - Return ordered list of commits that modified this spec
  - Include: commit hash, timestamp, author, change summary
  - Handle file renames (if spec file was moved)
- [ ] **SV-GIT-068**: Implement `getSpecAtCommit(specId: string, commitHash: string): Promise<SpecContent>`
  - Use `git show {commitHash}:specs/{specId}.json` to get content at specific commit
  - Parse JSON content
  - Return null if spec didn't exist at that commit
  - Validate returned content against spec schema
- [ ] **SV-GIT-069**: Implement `getSpecChangesInCommit(commitHash: string): Promise<SpecChange[]>`
  - Parse commit's file changes
  - Filter for spec files only
  - Return: specId, changeType (created, modified, deleted), diff summary

### 8.2 Document-to-Commit Association

- [ ] **SV-GIT-070**: Implement document version tracking
  - Track which specs were in a document at each commit
  - `getDocumentAtCommit(documentId: string, commitHash: string): Promise<DocumentSnapshot>`
  - Returns document metadata and list of spec IDs at that point in time
- [ ] **SV-GIT-071**: Implement document revert via commit hash
  - Given a commit hash, restore ALL specs in the document to their state at that commit
  - Find all specs in the document at the target commit
  - Extract each spec's content at the target commit
  - Write restored content as new files
  - Create revert commit: "revert: Restore document '{title}' to {shortHash}"
- [ ] **SV-GIT-072**: Implement spec revert to specific version
  - Given specId and commitHash, restore spec to that version
  - Extract spec content at target commit
  - Write restored content as current spec file
  - Create revert commit: "revert: Restore spec '{title}' to {shortHash}"
  - Preserve current edges (don't revert graph connections)

---

## 9. Git Hooks

### 9.1 Server-Side Hooks

- [ ] **SV-GIT-073**: Implement pre-commit validation hook
  - Validate JSON files are valid JSON
  - Validate spec files match spec schema
  - Validate edge files match edge schema
  - Reject commits with invalid data
  - Implemented as part of commit service (not actual git hook)
- [ ] **SV-GIT-074**: Implement post-commit event emission
  - After successful commit, emit `git.committed` event
  - Event payload: commit hash, changed files, author
  - Subscribers: WebSocket (notify users), graph cache (invalidate), RAG (re-index)
- [ ] **SV-GIT-075**: Implement post-merge event emission
  - After successful merge, emit `git.merged` event
  - Event payload: merge commit hash, source branch, merged files
  - Subscribers: WebSocket, graph cache, RAG index, conflict resolver

### 9.2 Validation Hooks

- [ ] **SV-GIT-076**: Implement spec schema validation on commit
  - Before creating commit, validate all staged spec files
  - Check required fields: id, title, content, createdAt
  - Check field types (string, array, etc.)
  - Reject commit if validation fails
  - Return specific validation errors
- [ ] **SV-GIT-077**: Implement edge schema validation on commit
  - Before creating commit, validate all staged edge files
  - Check required fields: id, sourceNodeId, targetNodeId, type
  - Validate edge type is in allowed set
  - Validate source and target nodes exist
  - Reject commit if validation fails
- [ ] **SV-GIT-078**: Implement graph consistency validation
  - After staging changes, check graph consistency
  - No orphaned edges (pointing to non-existent nodes)
  - No self-referencing edges
  - No duplicate edges (same source, target, type)
  - Warn on isolated nodes (no edges) but don't reject

---

## 10. Repository Health & Maintenance

### 10.1 Health Checks

- [ ] **SV-GIT-079**: Implement `checkRepositoryHealth(projectPath: string): Promise<RepoHealth>`
  - Verify `.git` directory exists and is valid
  - Check for corrupted objects (`git fsck`)
  - Check for lock files (stale locks from crashed operations)
  - Check disk usage of `.git` directory
  - Check remote connectivity
  - Return: health status, warnings, errors
- [ ] **SV-GIT-080**: Define `RepoHealth` interface
  - `status`: 'healthy' | 'degraded' | 'corrupted'
  - `checks`: HealthCheck[] (individual check results)
  - `diskUsage`: { git: number, working: number } (in bytes)
  - `remoteReachable`: boolean
  - `staleLocks`: string[] (lock file paths)
  - `lastCommit`: CommitInfo

### 10.2 Garbage Collection

- [ ] **SV-GIT-081**: Implement periodic git garbage collection
  - Run `git gc --auto` periodically (daily or on threshold)
  - Run after large operations (big merge, many deletes)
  - Schedule during low-activity periods
  - Log gc results (packs created, space freed)
- [ ] **SV-GIT-082**: Implement repository size monitoring
  - Track `.git` directory size
  - Track working directory size
  - Alert when repository exceeds size threshold (1GB default)
  - Recommend cleanup actions when large

### 10.3 Lock Cleanup

- [ ] **SV-GIT-083**: Implement stale lock detection and cleanup
  - Detect `.git/index.lock` and other lock files
  - Check if lock is stale (owning process no longer running)
  - Remove stale locks automatically
  - Log lock cleanup events
  - Run on server startup
- [ ] **SV-GIT-084**: Implement lock timeout prevention
  - Set maximum lock hold time (60 seconds for most operations)
  - Kill operations that hold locks too long
  - Release lock on operation timeout
  - Log timeout events for debugging

### 10.4 Repository Repair

- [ ] **SV-GIT-085**: Implement repository repair for common issues
  - Corrupted index: `git reset --mixed HEAD`
  - Missing objects: `git fsck --full` + `git reflog` recovery
  - Detached HEAD: `git checkout main`
  - Merge state cleanup: `git merge --abort` or `git reset`
  - Log all repair actions
- [ ] **SV-GIT-086**: Implement repository backup
  - Before risky operations (merge, revert), create backup
  - Use `git bundle` or clone to backup location
  - Retain last N backups (default: 3)
  - Auto-cleanup old backups

---

## 11. Conflict Resolution Helpers

### 11.1 Automatic Resolution

- [ ] **SV-GIT-087**: Implement auto-resolution for non-conflicting changes
  - If both branches change different fields of same JSON file
  - Auto-merge at field level (not line level)
  - Verify resulting JSON is valid
  - Mark as auto-resolved (log for audit)
- [ ] **SV-GIT-088**: Implement "ours" resolution strategy
  - Accept current branch version for all conflicts in a file
  - `git checkout --ours {path}` then `git add {path}`
  - Used for batch "keep mine" resolution
- [ ] **SV-GIT-089**: Implement "theirs" resolution strategy
  - Accept incoming branch version for all conflicts in a file
  - `git checkout --theirs {path}` then `git add {path}`
  - Used for batch "accept theirs" resolution

### 11.2 Manual Resolution Helpers

- [ ] **SV-GIT-090**: Implement `resolveConflict(filePath: string, resolution: string): Promise<void>`
  - Accept manually resolved content for a conflicted file
  - Validate resolved content is valid JSON (for knowledge graph files)
  - Write resolved content to file
  - Stage resolved file
  - Remove from conflict list
- [ ] **SV-GIT-091**: Implement `resolveAllConflicts(strategy: 'ours' | 'theirs'): Promise<ResolveResult>`
  - Apply same strategy to all conflicted files
  - Return: count resolved, any remaining issues
  - Create merge commit after all conflicts resolved
- [ ] **SV-GIT-092**: Implement conflict resolution validation
  - After resolution, validate resulting JSON files
  - Verify graph consistency (no broken edges after resolution)
  - Verify spec schema compliance
  - Reject resolution if validation fails

### 11.3 Conflict Prevention

- [ ] **SV-GIT-093**: Implement optimistic conflict detection
  - Before editing a spec, check if it was modified remotely since last sync
  - Warn user before they edit a potentially conflicting spec
  - Suggest pulling latest changes before editing
- [ ] **SV-GIT-094**: Implement per-spec locking (advisory)
  - When a user starts editing a spec, set advisory lock
  - Other users see "currently being edited by {username}"
  - Lock auto-releases after configurable timeout (10 minutes)
  - Does not prevent editing (advisory only)
  - Stored in database (not git)

---

## 12. Git Service Architecture

### 12.1 Service Organization

- [ ] **SV-GIT-095**: Create `GitService` — core git operations facade
  - Wraps all git operations with logging, error handling, locking
  - Accepts project path for all operations
  - Manages concurrent git operation serialization (per-repo lock)
  - Inject: ConfigService, LoggerService
- [ ] **SV-GIT-096**: Create `GitDiffService` — diff generation and parsing
  - All diff-related operations
  - JSON-aware diff generation
  - Diff formatting for API responses
  - Inject: GitService, FileSystemService
- [ ] **SV-GIT-097**: Create `GitBranchService` — branch management
  - Branch CRUD operations
  - Branch comparison
  - Branch protection enforcement
  - Inject: GitService
- [ ] **SV-GIT-098**: Create `GitMergeService` — merge operations
  - Merge execution
  - Conflict detection and parsing
  - Resolution helpers
  - Inject: GitService, GitDiffService
- [ ] **SV-GIT-099**: Create `GitSyncService` — remote sync operations
  - Pull, push, fetch
  - Remote management
  - Sync status reporting
  - Inject: GitService, ConfigService
- [ ] **SV-GIT-100**: Create `GitHistoryService` — commit history queries
  - Spec version tracking
  - Document version tracking
  - Commit history queries
  - Inject: GitService, FileSystemService

### 12.2 Concurrency Control

- [ ] **SV-GIT-101**: Implement per-repository operation locking
  - Only one git write operation per repository at a time
  - Allow concurrent read operations (diff, log, show)
  - Queue write operations (commit, merge, pull, push)
  - Lock implementation: in-memory mutex per project path
  - Lock timeout: 60 seconds (prevent deadlocks)
- [ ] **SV-GIT-102**: Implement operation queuing
  - Queue incoming git operations when lock is held
  - FIFO queue per repository
  - Max queue depth: 10 operations
  - Reject new operations when queue is full
  - Log queue wait times
- [ ] **SV-GIT-103**: Implement read-write lock pattern
  - Multiple concurrent reads allowed
  - Write requires exclusive access
  - Write waits for all reads to complete
  - Prevent write starvation (prioritize writes after N reads)

### 12.3 Error Handling

- [ ] **SV-GIT-104**: Define git-specific error types
  - `GitNotInitializedError` — no .git directory
  - `GitConflictError` — merge/pull conflict
  - `GitAuthError` — remote authentication failed
  - `GitNetworkError` — remote unreachable
  - `GitLockError` — repository is locked by another operation
  - `GitValidationError` — pre-commit validation failed
  - `GitNotFoundError` — commit/branch/file not found
- [ ] **SV-GIT-105**: Implement error recovery strategies
  - Lock error → wait and retry (up to lock timeout)
  - Network error → retry with backoff (3 attempts)
  - Auth error → fail immediately (no retry)
  - Conflict error → return conflicts for resolution (no retry)
  - Validation error → return validation details (no retry)
  - Not found → return 404 (no retry)

---

## Summary

| Section | Task Range | Count |
|---------|-----------|-------|
| 1. Git Library Selection & Configuration | SV-GIT-001 – 006 | 6 |
| 2. Repository Initialization & Cloning | SV-GIT-007 – 014 | 8 |
| 3. Commit Operations | SV-GIT-015 – 025 | 11 |
| 4. Branch Management | SV-GIT-026 – 034 | 9 |
| 5. Merge Operations | SV-GIT-035 – 043 | 9 |
| 6. Pull & Push Operations | SV-GIT-044 – 054 | 11 |
| 7. Diff Generation | SV-GIT-055 – 065 | 11 |
| 8. Commit Hash Tracking Per Spec | SV-GIT-066 – 072 | 7 |
| 9. Git Hooks | SV-GIT-073 – 078 | 6 |
| 10. Repository Health & Maintenance | SV-GIT-079 – 086 | 8 |
| 11. Conflict Resolution Helpers | SV-GIT-087 – 094 | 8 |
| 12. Git Service Architecture | SV-GIT-095 – 105 | 11 |
| **TOTAL** | | **105** |
