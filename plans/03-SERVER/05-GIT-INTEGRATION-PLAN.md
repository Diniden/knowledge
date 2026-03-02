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

#### Design Decisions

> **Q**: Should the project use `simple-git` (wraps CLI), `isomorphic-git` (pure JS), or direct shell commands via Bun?
> **A**: Use `simple-git`. It wraps the git CLI, provides a clean Promise-based API, handles output parsing, and supports all required operations (commit, branch, merge, diff, push, pull, log). It requires the `git` binary on the host, which is an acceptable dependency. `isomorphic-git` lacks merge support which is a dealbreaker. Direct shell commands require too much parsing boilerplate.

> **Q**: If using `simple-git`, does it work correctly under Bun's runtime?
> **A**: `simple-git` spawns child processes via Node.js `child_process.spawn()`, which Bun supports. It works under Bun. Add an integration test that runs the core operations under Bun to verify and catch regressions.

> **Q**: Is `isomorphic-git` sufficient for the required operations?
> **A**: No. The lack of merge support is a dealbreaker for the collaboration model. Its diff support is also limited compared to git's native diff. Use `simple-git` instead.

> **Q**: Should the project abstract the git library behind an interface to allow swapping implementations later?
> **A**: Yes. Define a `GitOperations` interface with methods like `commit()`, `branch()`, `merge()`, `diff()`, `push()`, `pull()`, `log()`, `status()`. The `SimpleGitAdapter` implements this interface. This enables testing (mock the interface), protects against library changes, and provides a clean API for the rest of the server.

> **Q**: How will git performance scale with large knowledge graphs (thousands of JSON files)?
> **A**: Git handles thousands of files well, but keep directories under ~1,000 files for filesystem performance. Structure: `specs/{first-2-chars-of-id}/{specId}.json` (hash-bucketed). This distributes files across ~256 directories. For a 2,000-spec project, each bucket has ~8 files.

> **Q**: Should git operations that touch the network run in a worker thread to avoid blocking the event loop?
> **A**: `simple-git` operations are already non-blocking — they spawn child processes and return Promises. The event loop is not blocked during git operations. No worker threads needed. Network operations (push, pull) run as async operations that resolve when the git process completes.

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

#### Design Decisions

> **Q**: Should each spec be a separate JSON file or should specs be grouped into fewer larger files?
> **A**: Each spec is a separate JSON file: `specs/{bucket}/{specId}.json` where `{bucket}` is the first 2 characters of the spec ID. Individual files give clean per-spec diffs, enable per-spec version history, and avoid merge conflicts when different users edit different specs.

> **Q**: Should edge definitions be stored as individual files, as an adjacency list, or as part of node files?
> **A**: Individual edge files: `graph/edges/{bucket}/{edgeId}.json`. Each edge file contains: `{ id, type, sourceId, targetId, metadata }`. Individual files prevent merge conflicts, enable per-edge version history, and align with the per-spec file approach.

> **Q**: How should media files (images, PDFs) be stored?
> **A**: External storage. Media files are stored on the server's filesystem under `/data/uploads/{projectId}/` (NOT in the git repo). Specs reference media by upload ID: `![diagram](upload:abc123)`. This keeps the git repo small and fast. Media is backed up separately.

> **Q**: Should the generated UI projects (`gen/`) be in the same git repo as the knowledge graph, or in a separate repo?
> **A**: Separate directory outside the git repo. Generated UI projects are build artifacts, not source data. Store them in `/data/gen/{projectId}/` on the server filesystem. They can be regenerated from the knowledge graph at any time.

> **Q**: Should spec files be named by UUID or by a slugified title?
> **A**: Named by nanoid (`{nanoid}.json`), e.g., `V1StGXR8_Z5jdHi.json`. Nanoids are shorter than UUIDs (21 chars vs 36), collision-resistant, and URL-safe. Readability in `git log` comes from the commit message, not the filename. Slugs invite collisions and rename churn when titles change.

> **Q**: Should there be a directory hierarchy within `specs/` or a flat structure?
> **A**: Hash-bucketed flat structure: `specs/{bucket}/{specId}.json`. Do NOT organize by document ID — moving a spec to a different document would require a file move, which creates noisy git history. The document-to-spec relationship is stored in the document's metadata file, not in the directory structure.

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

#### Design Decisions

> **Q**: Should every single spec edit create its own commit, or should edits be batched?
> **A**: Each user-initiated save creates one commit. Do NOT commit on every keystroke or auto-save. The user explicitly saves (or the agent completes an operation), and that save is one commit. This gives clean, meaningful commits without noise.

> **Q**: Should edge changes always be committed independently, or bundled with the spec changes that triggered them?
> **A**: Bundle when they're part of the same logical operation. If the user creates a spec and immediately adds edges, that's one commit. If the user adds an edge to an existing spec later, that's its own commit. The rule: one user action = one commit.

> **Q**: Should the agent's graph operations be a single commit or individual commits?
> **A**: Batch commit per agent operation. When the agent creates 3 specs and 5 edges in response to a single user message, all changes are committed together. Individual MCP tool calls write files but do not commit; the commit happens after the agent's response is complete.

> **Q**: Should commits made by the agent be attributed to the agent or to the user who initiated the session?
> **A**: Attributed to the user with an agent co-author trailer. Git author: `Jane Doe <jane@example.com>`. Commit message footer: `Co-authored-by: Claude Agent <agent@botnet.system>`. This gives the user ownership while transparently marking agent involvement.

> **Q**: Should the commit message include structured metadata in a machine-parseable format?
> **A**: Conventional Commits format with structured trailers. Format: `<type>(<scope>): <description>\n\n[body]\n\n[trailers]`. Types: `feat`, `update`, `delete`, `merge`, `revert`. Trailers: `Spec-Id: <id>`, `Edge-Id: <id>`, `Document-Id: <id>`, `Session-Id: <id>`.

> **Q**: Should there be a way to "squash" multiple consecutive commits to the same spec into a single commit?
> **A**: No squashing. History rewriting (force push) is dangerous and conflicts with collaboration. The commit-on-save approach already produces clean history. The UI can filter the version history to show only "significant" changes if the timeline feels noisy.

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

#### Design Decisions

> **Q**: Should the project use a mainline branching model or a feature-branch model?
> **A**: Mainline with optional feature branches. Default workflow: users commit directly to `main`. When experimentation is desired, users create a branch, make changes, and merge back. No mandatory branching or PR workflows.

> **Q**: Should branches be per-user, per-feature, or per-experiment?
> **A**: Per-experiment (named by the user). Branch naming convention: `experiment/{user-slug}/{branch-name}`. Users can create as many branches as they want. The naming convention provides organization without enforcement.

> **Q**: In single-user mode, should the user work directly on `main` without branches?
> **A**: Yes, work directly on `main`. Branches are optional and only used when the user wants to experiment. The UI doesn't push branches — the branch UI is accessible but not the default workflow.

> **Q**: Should branches be automatically deleted after merge, or kept for reference?
> **A**: Auto-delete after merge. The merge commit preserves the branch's changes in `main`'s history. The merge commit message includes the branch name for reference. The branch can be recreated from the merge commit if needed.

> **Q**: Should there be a maximum number of branches per project?
> **A**: Soft limit of 20 branches per project. The UI shows a warning after 10 branches. The server enforces a hard limit of 20 branches — creating a 21st returns an error. This prevents branch sprawl while allowing reasonable experimentation.

> **Q**: Should the system support "protected branches"?
> **A**: Not for the initial release. Direct commits to `main` are allowed. If protected branches are needed later (for larger teams), add them as a project setting.

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

#### Design Decisions

> **Q**: Should the default merge strategy be merge commits or fast-forward when possible?
> **A**: Fast-forward when possible, merge commit when not. Use `git merge --ff` (git's default). If the branch can be fast-forwarded, the history is linear and clean. If main has diverged, a merge commit is created automatically.

> **Q**: Should the system support rebasing as an alternative to merging?
> **A**: No rebasing. Rebase rewrites commit history, which is dangerous in a collaborative environment. The system uses merge-only. This is safer and simpler.

> **Q**: How should the system handle merge conflicts in JSON files?
> **A**: Custom conflict presentation, not custom merge drivers. Let git detect conflicts normally. The server parses the conflicted file to extract `<<<<<<`, `======`, `>>>>>>` sections. The API presents the conflict as structured data: `{ base, ours, theirs }`. The UI renders a side-by-side comparison. The user resolves in the UI.

> **Q**: Should conflicts be presented as raw git conflicts or as structured, field-level differences?
> **A**: Structured, field-level differences. Since all knowledge graph files are JSON with known schemas, the server can diff them semantically: "Field 'title' changed from 'A' to 'B' in your version and from 'A' to 'C' in theirs." Raw git conflict markers are never exposed to the user.

> **Q**: Should the agent be able to help resolve conflicts?
> **A**: Yes. The user can open an agent session during conflict resolution. The agent receives the conflict context (both versions, the base version) and can suggest a merged resolution. The agent uses a dedicated MCP tool: `resolve_conflict { file, suggestedResolution }`.

> **Q**: Should the system automatically resolve "trivial" conflicts?
> **A**: Yes, auto-resolve trivial conflicts. If both versions modify different fields of the same JSON file, merge them automatically. Notify the user that an auto-resolution occurred. Conflicts where both sides modify the same field are NOT auto-resolved.

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

#### Design Decisions

> **Q**: Should synchronization be automatic or manual?
> **A**: Manual sync. The user explicitly triggers pull and push via UI buttons or API calls. Automatic sync during active editing would cause unexpected file changes and potential conflicts mid-edit. The UI shows a "changes available" indicator (via periodic lightweight `git fetch` + compare) but doesn't auto-pull.

> **Q**: What should the sync polling interval be?
> **A**: Background `git fetch` every 60 seconds (lightweight — only fetches ref updates, not file content). This updates the "changes available" indicator in the UI without pulling changes. The actual pull is manual. Configurable via `GIT_FETCH_INTERVAL_MS=60000`.

> **Q**: Should the system support webhooks from the git remote to trigger pull on push?
> **A**: Support as optional configuration but don't require it. If the git remote supports webhooks, configure a webhook to `POST /webhooks/git/push` which triggers a `git fetch` and updates the "changes available" indicator. Fall back to polling when webhooks aren't available.

> **Q**: Should the system handle scenarios where the git remote is unreachable?
> **A**: Yes. All operations work locally when the remote is unreachable. The server's git repository is a full clone — commits, branches, and history are all local. Push/pull operations fail gracefully with a clear error. The UI shows "offline" status for the sync indicator.

> **Q**: If the remote is unreachable during push, should the system queue the push and retry automatically?
> **A**: Notify the user, no automatic retry. The user may want to make additional changes before pushing. The UI shows "Push failed — remote unreachable. Your changes are saved locally." with a "Retry Push" button. Local commits are safe and persistent.

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

#### Design Decisions

> **Q**: Should diffs be generated as standard unified diffs or as structured JSON diffs?
> **A**: Structured JSON diffs for knowledge graph files. The server computes diffs using a JSON diff algorithm (deep comparison of JSON objects), producing output like: `{ field: "description", type: "modified", old: "...", new: "..." }`. For non-JSON files, fall back to standard unified diffs. Use the `deep-diff` npm package for JSON comparison.

> **Q**: Should the diff endpoint return raw diff text or pre-parsed structured data?
> **A**: Pre-parsed structured data. The server does the parsing work so the frontend can render directly without parsing logic. The diff endpoint returns: `{ changes: [{ file, type, fields: [{ path, oldValue, newValue }] }] }`.

> **Q**: For spec content diffs, should the diff be at the markdown level or semantic level?
> **A**: Line-level diff on the markdown content. Semantic-level diffing is complex and error-prone. Line-level diffs are simple, well-understood, and sufficient. The frontend renders added/removed/changed lines with green/red/yellow highlighting.

> **Q**: Should diffs be computed on demand or pre-computed and cached?
> **A**: On-demand with response caching. Compute diffs on request but cache the result keyed by `{commitA}:{commitB}:{filePath}`. Since commits are immutable, the cache never needs invalidation. Use an in-memory LRU cache with a 1,000-entry limit.

> **Q**: Should the system support word-level diffs within changed lines?
> **A**: Word-level diffs for changed lines. After identifying changed lines (line-level diff), run a word-level diff on each changed line pair. The performance cost is minimal since word-level diffing only runs on changed lines.

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

#### Design Decisions

> **Q**: Should the spec version history show every commit that touched the spec, or only "meaningful" changes?
> **A**: Show every commit by default with filtering options. The UI shows the full history for a spec. Filter options: "Hide agent commits", "Hide merge commits", "Show only content changes". The conventional commit format makes filtering easy.

> **Q**: Should the system support "time travel" — viewing the entire project state at any historical commit?
> **A**: Yes, but read-only. `GET /projects/:id/at/:commitHash/specs` returns specs as they existed at that commit. The server does `git show <commit>:<file>` to retrieve historical file contents without checking out the commit. Implement in phase 2.

> **Q**: Should there be a "compare" feature for any two versions of a spec?
> **A**: Yes. `GET /specs/:id/diff?from=<commitA>&to=<commitB>` returns the diff between any two versions. Essential for comparing a spec before and after a branch merge, or comparing to an arbitrary historical point.

> **Q**: When reverting a spec, should the revert also revert connected edges?
> **A**: Preserve current edges but flag potentially invalid ones. When a spec is reverted, check if the reverted content invalidates edges. If potentially invalid edges are detected, add an entry to the inquiry queue for review. Edges are not automatically reverted or deleted.

> **Q**: Should document-level revert be all-or-nothing?
> **A**: User selects which specs to revert. The UI presents a list of specs with version histories, and the user checks which ones to revert and to which version. Each reverted spec creates its own commit (or one batch commit if multiple specs are reverted simultaneously).

> **Q**: Should reverts create a new commit or rewrite history?
> **A**: New commit (forward history). Reverting creates a new commit: `revert(spec): revert 'Auth Requirements' to version <shortHash>`. History is never rewritten. This is safe, auditable, and compatible with collaboration.

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

#### Design Decisions

> **Q**: Should the server use project-level git credentials or per-user git credentials?
> **A**: Project-level git credentials. Each project has a single set of credentials for communicating with the remote repository. Per-user attribution is handled via commit authoring. This is simpler and sufficient — the audit trail is in the commit history, not the transport credentials.

> **Q**: Should the server strip sensitive data before committing to git?
> **A**: Yes. Implement a pre-commit validation step that scans staged files for sensitive patterns: API keys, tokens, passwords, `.env` file content. If sensitive data is detected, reject the commit. Spec access tokens are stored in PostgreSQL (not in JSON files).

> **Q**: Should there be a pre-commit check that prevents accidentally committing secrets?
> **A**: Yes. The `GitService` enforces a file whitelist for commits: only files under `specs/`, `graph/`, `documents/`, and `.botnet/` directories can be committed. Any attempt to stage a file outside these directories is rejected. This is enforced at the application level.

> **Q**: Should the system enforce signed commits?
> **A**: No signed commits for the initial release. GPG key management adds significant complexity for a self-hosted system where the server is the only committer. Signed commits can be added later for high-security deployments.

> **Q**: Should the system detect and prevent force pushes that rewrite history?
> **A**: Yes. The `GitService` never executes `git push --force`. The `push()` method does not accept a `force` parameter. If a push is rejected by the remote, the user is prompted to pull and merge first. No code path allows force push.

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

#### Design Decisions

> **Q**: What is the expected repository size after 1 year of active use?
> **A**: Estimated per project: ~1,000 specs (average 5KB each = ~5MB), ~3,000 edges (~1KB each = ~3MB), ~5,000 commits. Total repository size including git history: ~50-100MB. Git handles this easily — no performance concerns for the expected scale.

> **Q**: Should the system implement git shallow clones?
> **A**: No shallow clones. Full history is needed for version history, diffs, and time-travel features. At the expected repository size (~100MB), full clones complete in seconds. Shallow clones would break spec history features.

> **Q**: Should large files use Git LFS?
> **A**: No. Media files are stored outside the git repository. No Git LFS needed. This keeps the git repo lightweight and cloning fast.

> **Q**: Which git operations are expected to be slow?
> **A**: Network operations (clone, push, pull, fetch) are slow and already run asynchronously. Clone is the slowest (first-time setup) — run it as a background task with WebSocket progress events. Merge and log-with-diff are fast for expected repo sizes (<1 second).

> **Q**: Should the server maintain an in-memory index of the knowledge graph?
> **A**: Yes. Load on project open, update on mutations (write-through), rebuild on git pull/merge. The index contains: node IDs, edge IDs, edge relationships, spec titles, spec statuses, document-to-spec mappings, and graph stats. This enables sub-millisecond graph traversal queries. The index consumes ~10-20MB per active project.

> **Q**: Should git operations be serialized per-repository or allow concurrent reads with exclusive writes?
> **A**: Concurrent reads with exclusive writes. Use a read-write lock per project: multiple readers can run concurrently, but writes are exclusive. Implemented via an async ReadWriteLock class.

---

## Summary

| Section                                  | Task Range       | Count   |
| ---------------------------------------- | ---------------- | ------- |
| 1. Git Library Selection & Configuration | SV-GIT-001 – 006 | 6       |
| 2. Repository Initialization & Cloning   | SV-GIT-007 – 014 | 8       |
| 3. Commit Operations                     | SV-GIT-015 – 025 | 11      |
| 4. Branch Management                     | SV-GIT-026 – 034 | 9       |
| 5. Merge Operations                      | SV-GIT-035 – 043 | 9       |
| 6. Pull & Push Operations                | SV-GIT-044 – 054 | 11      |
| 7. Diff Generation                       | SV-GIT-055 – 065 | 11      |
| 8. Commit Hash Tracking Per Spec         | SV-GIT-066 – 072 | 7       |
| 9. Git Hooks                             | SV-GIT-073 – 078 | 6       |
| 10. Repository Health & Maintenance      | SV-GIT-079 – 086 | 8       |
| 11. Conflict Resolution Helpers          | SV-GIT-087 – 094 | 8       |
| 12. Git Service Architecture             | SV-GIT-095 – 105 | 11      |
| **TOTAL**                                |                  | **105** |
