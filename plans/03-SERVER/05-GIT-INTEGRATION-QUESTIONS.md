# 03-SERVER / 05 — GIT INTEGRATION: Open Questions

> **Purpose**: Unresolved questions about the git integration layer including
> library choice, repository management, commit strategies, branching model,
> merge handling, diff generation, and synchronization patterns. Answers may
> change tasks in the plan.

---

## 1. Git Library Choice

### 1.1 Implementation Approach
- **Q**: Should the project use `simple-git` (wraps CLI), `isomorphic-git`
  (pure JS), or direct shell commands via Bun? `simple-git` is most mature but
  requires git binary. `isomorphic-git` is portable but has limitations (no
  merge, limited diff). Shell commands give full control but require manual
  output parsing.

**A:** Use `simple-git`. It wraps the git CLI, provides a clean Promise-based API, handles output parsing, and supports all required operations (commit, branch, merge, diff, push, pull, log). It requires the `git` binary on the host, which is an acceptable dependency for a system that fundamentally depends on git. `isomorphic-git` lacks merge support which is a dealbreaker. Direct shell commands require too much parsing boilerplate.

- **Q**: If using `simple-git`, does it work correctly under Bun's runtime?
  `simple-git` spawns child processes which should work, but has it been tested
  with Bun specifically?

**A:** `simple-git` spawns child processes via Node.js `child_process.spawn()`, which Bun supports. It works under Bun. Add an integration test that runs the core operations (init, add, commit, branch, merge, diff, log) under Bun to verify and catch regressions. If Bun-specific issues arise, `simple-git` can be configured to use a custom spawn function.

- **Q**: Is `isomorphic-git` sufficient for the required operations (commit,
  branch, merge, diff, push, pull)? Known limitations include lack of native
  merge support and limited remote operation support.

**A:** No, `isomorphic-git` is not sufficient. The lack of merge support is a dealbreaker for the collaboration model (users merge branches). Its diff support is also limited compared to git's native diff. Use `simple-git` instead.

- **Q**: Should the project abstract the git library behind an interface to
  allow swapping implementations later? This adds a layer but protects against
  library-specific issues.

**A:** Yes. Define a `GitOperations` interface with methods like `commit()`, `branch()`, `merge()`, `diff()`, `push()`, `pull()`, `log()`, `status()`. The `SimpleGitAdapter` implements this interface. This enables testing (mock the interface), protects against library changes, and provides a clean API for the rest of the server. The interface is thin — it mirrors the operations needed, not the full git API.

### 1.2 Performance
- **Q**: How will git performance scale with large knowledge graphs (thousands
  of JSON files)? Should the repository structure be designed to avoid
  performance degradation (e.g., limit files per directory to ~1000)?

**A:** Git handles thousands of files well, but keep directories under ~1,000 files for filesystem performance. Structure: `specs/{first-2-chars-of-id}/{specId}.json` (hash-bucketed, like git's own object storage). This distributes files across ~256 directories, keeping each directory manageable. Edges: `graph/edges/{first-2-chars-of-id}/{edgeId}.json`. For a 2,000-spec project, each bucket has ~8 files.

- **Q**: Should git operations that touch the network (push, pull, fetch) run
  in a worker thread to avoid blocking the event loop?

**A:** `simple-git` operations are already non-blocking — they spawn child processes and return Promises. The event loop is not blocked during git operations. No worker threads needed. The per-project write queue handles serialization. Network operations (push, pull) run as async operations that resolve when the git process completes.

---

## 2. Repository Structure

### 2.1 File Organization
- **Q**: Should each spec be a separate JSON file (e.g., `specs/{specId}.json`)
  or should specs be grouped into fewer larger files (e.g., per-document)?
  Individual files give clean per-spec diffs but create many files. Grouped
  files reduce file count but make diffs harder to read.

**A:** Each spec is a separate JSON file: `specs/{bucket}/{specId}.json` where `{bucket}` is the first 2 characters of the spec ID. Individual files give clean per-spec diffs, enable per-spec version history (git log for a single file), and avoid merge conflicts when different users edit different specs. The hash-bucketed directory structure keeps directories manageable.

- **Q**: Should edge definitions be stored as individual files
  (`graph/edges/{edgeId}.json`), as an adjacency list (`graph/adjacency.json`),
  or as part of node files? Individual files give clean edge diffs but many
  files. Adjacency list is compact but any edge change touches the same file.

**A:** Individual edge files: `graph/edges/{bucket}/{edgeId}.json`. Each edge file contains: `{ id, type, sourceId, targetId, metadata }`. Individual files prevent merge conflicts (two users adding different edges never touch the same file), enable per-edge version history, and align with the per-spec file approach. The bucket structure keeps directories small.

- **Q**: How should media files (images, PDFs) be stored? In the git repo
  (version controlled but bloats repo) or external storage with references in
  the knowledge graph? Git LFS is an option but adds complexity.

**A:** External storage. Media files are stored on the server's filesystem under `/data/uploads/{projectId}/` (NOT in the git repo). Specs reference media by upload ID: `![diagram](upload:abc123)`. The server resolves `upload:abc123` to the actual file on serving. This keeps the git repo small and fast. Media is backed up separately from the git repository.

- **Q**: Should the generated UI projects (`gen/`) be in the same git repo as
  the knowledge graph, or in a separate repo? Same repo keeps everything
  together but gen code is large and frequently rebuilt.

**A:** Separate directory outside the git repo. Generated UI projects are build artifacts, not source data. Store them in `/data/gen/{projectId}/` on the server filesystem. They can be regenerated from the knowledge graph at any time. Including them in the git repo would bloat the repository and create noisy commits on every regeneration.

### 2.2 Naming Conventions
- **Q**: Should spec files be named by UUID (`{uuid}.json`) or by a slugified
  title (`authentication-requirements.json`)? UUIDs avoid naming conflicts but
  are unreadable in git logs. Slugs are readable but may collide.

**A:** Named by nanoid (`{nanoid}.json`), e.g., `V1StGXR8_Z5jdHi.json`. Nanoids are shorter than UUIDs (21 chars vs 36), collision-resistant, and URL-safe. They're not human-readable, but git log messages include the spec title (see commit message conventions below), so readability in `git log` comes from the commit message, not the filename. Slugs invite collisions and rename churn when titles change.

- **Q**: Should there be a directory hierarchy within `specs/` (e.g.,
  `specs/{documentId}/{specId}.json`) or a flat structure? Hierarchy mirrors
  the document grouping but makes file moves on re-grouping.

**A:** Hash-bucketed flat structure: `specs/{bucket}/{specId}.json`. Do NOT organize by document ID — moving a spec to a different document would require a file move (rename), which creates noisy git history and complicates diffs. The document-to-spec relationship is stored in the document's metadata file (`documents/{documentId}.json` containing a `specIds` array), not in the directory structure.

---

## 3. Commit Strategy

### 3.1 Commit Granularity
- **Q**: Should every single spec edit create its own commit, or should edits
  be batched? The PRD says "each change to a spec is its own commit hash" but
  this could create very noisy commit histories during active editing sessions.

**A:** Each user-initiated save creates one commit. Do NOT commit on every keystroke or auto-save. The user explicitly saves (or the agent completes an operation), and that save is one commit. During active editing, the frontend collects changes and sends them on save. This gives clean, meaningful commits without noise. The PRD's intent is that each spec version is trackable — achieved by committing on save, not on every change.

- **Q**: Should edge changes always be committed independently, or bundled with
  the spec changes that triggered them? Bundling keeps related changes together
  but makes spec-level version tracking harder.

**A:** Bundle when they're part of the same logical operation. If the user creates a spec and immediately adds edges, that's one commit: "feat(spec): create 'Authentication Requirements' with 3 edges". If the user adds an edge to an existing spec later, that's its own commit. The rule: one user action = one commit. The commit includes all files modified by that action.

- **Q**: Should the agent's graph operations (creating multiple specs and edges
  during a conversation) be a single commit or individual commits? Single commit
  is atomic but loses granularity; individual commits preserve history but are
  noisy.

**A:** Batch commit per agent operation. When the agent creates 3 specs and 5 edges in response to a single user message, all changes are committed together: "feat(agent): create specs for authentication module (3 specs, 5 edges)". This is atomic (all changes from one agent action are together) and clean (one commit per user-agent interaction turn). Individual MCP tool calls write files but do not commit; the commit happens after the agent's response is complete.

### 3.2 Commit Authoring
- **Q**: Should commits made by the agent be attributed to the agent (e.g.,
  "Claude Agent <agent@system>") or to the user who initiated the agent session?
  Agent attribution is transparent but the user "owns" the changes.

**A:** Attributed to the user with an agent co-author trailer. Git author: `Jane Doe <jane@example.com>`. Commit message footer: `Co-authored-by: Claude Agent <agent@botnet.system>`. This gives the user ownership (their name in `git log`) while transparently marking agent involvement. The `git log --grep="Co-authored-by: Claude Agent"` command can filter agent-assisted commits.

- **Q**: Should the commit message include structured metadata (e.g., spec ID,
  action type) in a machine-parseable format (like Conventional Commits), or
  free-form descriptions?

**A:** Conventional Commits format with structured trailers. Format: `<type>(<scope>): <description>\n\n[body]\n\n[trailers]`. Types: `feat` (new spec/edge), `update` (edit spec), `delete` (remove spec/edge), `merge` (branch merge), `revert` (revert operation). Trailers: `Spec-Id: <id>`, `Edge-Id: <id>`, `Document-Id: <id>`, `Session-Id: <id>`. Example: `feat(spec): create 'Auth Requirements'\n\nSpec-Id: V1StGXR8_Z5jdHi\nDocument-Id: abc123\nSession-Id: sess_456`.

- **Q**: Should there be a way to "squash" multiple consecutive commits to the
  same spec into a single commit? This would clean up history during active
  editing sessions but requires history rewriting.

**A:** No squashing. History rewriting (force push) is dangerous and conflicts with collaboration (other users may have pulled the commits). The commit-on-save approach already produces clean history. If a user saves 5 times, those are 5 meaningful points in history. The UI can filter the version history to show only "significant" changes (e.g., changes that modified more than N characters) if the timeline feels noisy.

---

## 4. Branching Model

### 4.1 Branching Strategy
- **Q**: Should the project use a mainline branching model (everyone commits to
  main, merge later) or a feature-branch model (changes on branches, merge to
  main)? The PRD mentions branching for experimentation but doesn't specify
  the default workflow.

**A:** Mainline with optional feature branches. Default workflow: users commit directly to `main`. When experimentation is desired, users create a branch, make changes, and merge back. This matches the PRD's async collaboration model — simple by default, branches when needed. No mandatory branching or PR workflows.

- **Q**: Should branches be per-user, per-feature, or per-experiment? Per-user
  branches are simple but don't support parallel experiments. Per-feature
  branches align with git best practices.

**A:** Per-experiment (named by the user). Branch naming convention: `experiment/{user-slug}/{branch-name}`, e.g., `experiment/jane/alternative-auth-flow`. Users can create as many branches as they want for different experiments. The naming convention provides organization without enforcement. The UI suggests the convention but allows arbitrary names.

- **Q**: In single-user mode (no collaboration), should the user work directly
  on `main` without branches? Branches add overhead when there's no
  collaboration.

**A:** Yes, work directly on `main`. Branches are optional and only used when the user wants to experiment. The UI doesn't push branches — the branch UI is accessible but not the default workflow. Single-user projects have a simple commit-to-main flow.

### 4.2 Branch Lifecycle
- **Q**: Should branches be automatically deleted after merge, or kept for
  reference? Auto-deletion keeps the repo clean but loses branch history.

**A:** Auto-delete after merge. The merge commit preserves the branch's changes in `main`'s history. Keeping stale branches clutters the branch list and confuses users. The merge commit message includes the branch name for reference: `merge(branch): merge 'experiment/jane/alt-auth' into main`. The branch can be recreated from the merge commit if needed.

- **Q**: Should there be a maximum number of branches per project? Too many
  branches can cause confusion and performance issues.

**A:** Soft limit of 20 branches per project. The UI shows a warning after 10 branches ("Consider merging or deleting unused branches"). The server enforces a hard limit of 20 branches — creating a 21st returns an error asking the user to clean up. This prevents branch sprawl while allowing reasonable experimentation.

- **Q**: Should the system support "protected branches" where direct commits
  are prevented? This is standard in teams but adds complexity.

**A:** Not for the initial release. The mainline model with optional branching is simple enough without protected branches. Direct commits to `main` are allowed. If protected branches are needed later (for larger teams), add them as a project setting. For now, the collaboration model trusts users.

---

## 5. Merge & Conflict Resolution

### 5.1 Merge Strategy
- **Q**: Should the default merge strategy be merge commits or fast-forward
  when possible? Merge commits preserve branch history but create noise;
  fast-forward keeps linear history but loses branch context.

**A:** Fast-forward when possible, merge commit when not. Use `git merge --ff` (git's default). If the branch can be fast-forwarded (no divergent commits on main), the history is linear and clean. If main has diverged, a merge commit is created automatically. This gives the best of both: clean history when possible, explicit merge points when necessary.

- **Q**: Should the system support rebasing as an alternative to merging?
  Rebasing creates cleaner history but rewrites commits, which can be dangerous.

**A:** No rebasing. Rebase rewrites commit history, which is dangerous in a collaborative environment (other users may have pulled the original commits). The system uses merge-only. This is safer and simpler. If a user wants a clean linear history, they can work on `main` directly without branches.

- **Q**: How should the system handle merge conflicts in JSON files? Standard
  git merge produces text-level conflict markers that are invalid JSON. Should
  there be custom merge drivers for JSON files?

**A:** Custom conflict presentation, not custom merge drivers. Let git detect conflicts normally (text-level markers). The server parses the conflicted file to extract `<<<<<<`, `======`, `>>>>>>` sections. The API presents the conflict as structured data: `{ base, ours, theirs }` for each conflicted file. The UI renders a side-by-side comparison. The user resolves in the UI, and the server writes the resolved JSON. No custom git merge driver needed — handling happens at the API/UI layer.

### 5.2 Conflict UX
- **Q**: Should conflicts be presented to the user as raw git conflicts or as
  structured, field-level differences? Structured is more user-friendly for
  JSON knowledge graph files but requires custom parsing.

**A:** Structured, field-level differences. Since all knowledge graph files are JSON with known schemas, the server can diff them semantically: "Field 'title' changed from 'A' to 'B' in your version and from 'A' to 'C' in theirs." The API returns field-level diffs for each conflicted JSON file. Raw git conflict markers are never exposed to the user. This is significantly more user-friendly.

- **Q**: Should the agent be able to help resolve conflicts? (e.g., "These two
  versions of the spec have different descriptions — would you like me to merge
  them?")

**A:** Yes. The user can open an agent session during conflict resolution. The agent receives the conflict context (both versions, the base version) and can suggest a merged resolution. The user confirms or edits the suggestion. This is an optional workflow — the user can also resolve manually via the UI. The agent uses a dedicated MCP tool: `resolve_conflict { file, suggestedResolution }`.

- **Q**: Should the system automatically resolve "trivial" conflicts (e.g.,
  both branches change different fields of the same spec)? Auto-resolution is
  convenient but may hide important changes.

**A:** Yes, auto-resolve trivial conflicts. If both versions modify different fields of the same JSON file, merge them automatically (both changes are applied). Notify the user that an auto-resolution occurred and show them the result. They can revert if needed. Conflicts where both sides modify the same field are NOT auto-resolved — those require user decision. This reduces friction while preserving safety for real conflicts.

---

## 6. Diff Generation

### 6.1 Diff Format
- **Q**: Should diffs be generated as standard unified diffs or as structured
  JSON diffs (for knowledge graph files)? The PRD calls for "light colored
  indications" in the diff view, suggesting a custom format.

**A:** Structured JSON diffs for knowledge graph files. The server computes diffs using a JSON diff algorithm (deep comparison of JSON objects), producing output like: `{ field: "description", type: "modified", old: "...", new: "..." }`. This enables the frontend to render precise, field-level highlighting. For non-JSON files, fall back to standard unified diffs. Use the `deep-diff` npm package for JSON comparison.

- **Q**: Should the diff endpoint return raw diff text or pre-parsed structured
  data? Pre-parsed is easier for the frontend but more work on the server.

**A:** Pre-parsed structured data. The server does the parsing work so the frontend can render directly without parsing logic. The diff endpoint returns: `{ changes: [{ file, type: "added"|"modified"|"deleted", fields: [{ path, oldValue, newValue }] }] }`. This is more work on the server but produces a much better frontend experience.

- **Q**: For spec content diffs, should the diff be at the markdown level (line
  changes) or semantic level (section changes, paragraph changes)?

**A:** Line-level diff on the markdown content. Semantic-level diffing (understanding markdown structure) is complex and error-prone. Line-level diffs are simple, well-understood, and sufficient for the "light colored indications" the PRD describes. The frontend renders added/removed/changed lines with green/red/yellow highlighting. Use a standard diff algorithm (Myers or patience diff).

### 6.2 Diff Performance
- **Q**: For large spec documents with many changes, should diffs be computed
  on demand or pre-computed and cached? On-demand is simpler but may be slow
  for complex histories. Caching requires invalidation logic.

**A:** On-demand with response caching. Compute diffs on request but cache the result keyed by `{commitA}:{commitB}:{filePath}`. Since commits are immutable, the cache never needs invalidation — the diff between two specific commits never changes. Use an in-memory LRU cache with a 1,000-entry limit. This gives fast repeated access (viewing the same diff multiple times) without cache management complexity.

- **Q**: Should the system support word-level diffs within changed lines, or
  only line-level diffs? Word-level is more precise but more expensive to
  compute.

**A:** Word-level diffs for changed lines. After identifying changed lines (line-level diff), run a word-level diff on each changed line pair to highlight exactly which words changed. This gives the "light colored indications" described in the PRD. The performance cost is minimal since word-level diffing only runs on changed lines, not the entire document. Use a standard word-diff algorithm.

---

## 7. Synchronization

### 7.1 Sync Model
- **Q**: Should synchronization be automatic (poll for changes periodically) or
  manual (user explicitly pulls/pushes)? Automatic is more real-time but may
  cause unexpected changes during active editing. The PRD mentions asynchronous
  collaboration suggesting manual sync.

**A:** Manual sync. The user explicitly triggers pull and push via UI buttons or API calls. The PRD specifies git-based async collaboration (clone, pull, push), which implies manual sync — not real-time. Automatic sync during active editing would cause unexpected file changes and potential conflicts mid-edit. The UI shows a "changes available" indicator (via periodic lightweight `git fetch` + compare) but doesn't auto-pull.

- **Q**: What should the sync polling interval be if automatic? Too frequent
  wastes resources; too infrequent delays updates. 30 seconds? 5 minutes?

**A:** Background `git fetch` every 60 seconds (lightweight — only fetches ref updates, not file content). This updates the "changes available" indicator in the UI without pulling changes. The actual pull is manual. The 60-second interval is a reasonable balance between freshness and resource usage. Configurable via `GIT_FETCH_INTERVAL_MS=60000`.

- **Q**: Should the system support webhooks from the git remote to trigger
  pull on push? This enables near-real-time sync without polling but requires
  the remote to support webhooks.

**A:** Support as optional configuration but don't require it. If the git remote supports webhooks (GitHub, GitLab), configure a webhook to `POST /webhooks/git/push` which triggers a `git fetch` and updates the "changes available" indicator for all connected users in that project. Fall back to polling when webhooks aren't available. This gives near-instant notification when configured.

### 7.2 Offline Support
- **Q**: Should the system handle scenarios where the git remote is unreachable?
  Allow local-only work and sync when remote becomes available?

**A:** Yes. All operations work locally when the remote is unreachable. The server's git repository is a full clone — commits, branches, and history are all local. Push/pull operations fail gracefully with a clear error: "Remote repository is unreachable. Your changes are saved locally and will be pushed when the connection is restored." The UI shows "offline" status for the sync indicator.

- **Q**: If the remote is unreachable during push, should the system queue the
  push and retry automatically, or notify the user to retry manually?

**A:** Notify the user, no automatic retry. The user may want to make additional changes before pushing, and automatic retry could push an intermediate state. The UI shows "Push failed — remote unreachable. Your changes are saved locally." with a "Retry Push" button. Local commits are safe and persistent. This gives the user full control over when their changes are pushed.

---

## 8. Version Control UX

### 8.1 History Navigation
- **Q**: Should the spec version history show every commit that touched the
  spec, or only "meaningful" changes (e.g., filter out automated/system
  commits)?

**A:** Show every commit by default with filtering options. The UI shows the full history for a spec (all commits that modified its file). Filter options: "Hide agent commits", "Hide merge commits", "Show only content changes" (skip metadata-only changes). The conventional commit format makes filtering easy — the commit type and trailers provide the metadata needed.

- **Q**: Should the system support "time travel" — viewing the entire project
  state at any historical commit? This is powerful but complex to implement.

**A:** Yes, but read-only. `GET /projects/:id/at/:commitHash/specs` returns specs as they existed at that commit. The server does `git show <commit>:<file>` to retrieve historical file contents without checking out the commit (no working tree modification). This is a read-only view — no editing of historical states. Powerful for understanding how the knowledge graph evolved. Implement in phase 2; the API design is straightforward since `simple-git` supports `show`.

- **Q**: Should there be a "compare" feature that shows the diff between any
  two versions of a spec (not just sequential versions)?

**A:** Yes. `GET /specs/:id/diff?from=<commitA>&to=<commitB>` returns the diff between any two versions. This uses `git diff <commitA> <commitB> -- <filepath>`. The endpoint parses the diff into the structured JSON format described above. Essential for comparing a spec before and after a branch merge, or comparing the current version to an arbitrary historical point.

### 8.2 Revert Behavior
- **Q**: When reverting a spec to a previous version, should the revert
  also revert connected edges, or keep current edges? The plan says "preserve
  current edges" but some edges may no longer be valid after revert.

**A:** Preserve current edges but flag potentially invalid ones. When a spec is reverted, check if the reverted content is semantically different enough to invalidate edges (e.g., if the spec's topic changed entirely). If potentially invalid edges are detected, add an entry to the inquiry queue for the user or agent to review: "Spec 'X' was reverted to version Y. The following edges may need review: [list]." The edges themselves are not automatically reverted or deleted.

- **Q**: Should document-level revert be all-or-nothing, or should the user
  be able to select which specs to revert within the document?

**A:** User selects which specs to revert. Document-level revert is not atomic — the user picks individual specs and target versions. The UI presents a list of specs in the document with their version histories, and the user checks which ones to revert and to which version. Each reverted spec creates its own commit (or one batch commit if multiple specs are reverted simultaneously).

- **Q**: Should reverts create a new commit (forward history) or actually
  rewrite history? The plan proposes new commits (git revert style) which is
  safer.

**A:** New commit (forward history). Reverting a spec creates a new commit: `revert(spec): revert 'Auth Requirements' to version <shortHash>\n\nSpec-Id: V1StGXR8_Z5jdHi`. History is never rewritten. This is safe, auditable, and compatible with collaboration (no force pushes needed). The full history (including the reverted changes) is preserved.

---

## 9. Performance & Scalability

### 9.1 Repository Size
- **Q**: What is the expected repository size after 1 year of active use?
  Estimate: number of specs, number of commits, total JSON file size. This
  determines if git performance will degrade.

**A:** Estimated after 1 year of active use per project: ~1,000 specs (average 5KB each = ~5MB of spec files), ~3,000 edges (~1KB each = ~3MB), ~5,000 commits. Total repository size including git history: ~50-100MB. Git handles this easily — performance issues only emerge at 100K+ files or 10GB+ repos. No performance concerns for the expected scale.

- **Q**: Should the system implement git shallow clones for better clone
  performance, trading off full history access?

**A:** No shallow clones. Full history is needed for version history, diffs, and time-travel features. At the expected repository size (~100MB), full clones complete in seconds even on moderate networks. Shallow clones would break `git log` for spec history and complicate the diff/compare features. Use full clones only.

- **Q**: Should large files (media attachments) use Git LFS, or be stored
  outside the git repository entirely?

**A:** Stored outside the git repository (see Repository Structure answer above). Media files live in `/data/uploads/{projectId}/` on the server filesystem. No Git LFS needed. This keeps the git repo lightweight and cloning fast. Media is backed up and managed separately.

### 9.2 Operation Performance
- **Q**: Which git operations are expected to be slow, and should they run
  asynchronously? Candidates: clone (network), push/pull (network), merge
  (complex), log with full diff (CPU).

**A:** Network operations (clone, push, pull, fetch) are slow and already run asynchronously (simple-git returns Promises, Bun's event loop is not blocked). Clone is the slowest (first-time setup) — run it as a background task with WebSocket progress events. Merge and log-with-diff are CPU-bound but fast for expected repo sizes (<1 second). No special async handling needed beyond the natural Promise-based API.

- **Q**: Should the server maintain an in-memory index of the knowledge graph
  (separate from git) for fast queries, or always read from git?

**A:** Maintain an in-memory index. Load on project open, update on mutations (write-through), rebuild on git pull/merge. The index contains: node IDs, edge IDs, edge relationships, spec titles, spec statuses, document-to-spec mappings, and graph stats. This enables sub-millisecond graph traversal queries. Full spec content is read from disk on demand (not in the index). The index consumes ~10-20MB per active project.

- **Q**: Should git operations be serialized per-repository (safe but slow) or
  allow concurrent reads with exclusive writes (faster but complex)?

**A:** Concurrent reads with exclusive writes. Use a read-write lock per project: multiple readers (git log, git show, git diff) can run concurrently, but writes (commit, merge, pull, push) are exclusive. This is safe because git's own internal locking handles concurrent reads, and the write lock prevents conflicting mutations. Implemented via an async ReadWriteLock class.

---

## 10. Security

### 10.1 Access Control
- **Q**: Should the server use project-level git credentials (single identity
  per project) or per-user git credentials (each user's own SSH key/token)?
  Per-user is more auditable but more complex to manage.

**A:** Project-level git credentials. Each project has a single set of git credentials (SSH key or HTTPS token) for communicating with the remote repository. The server manages these credentials. Per-user attribution is handled via commit authoring (each commit is authored by the user, not the server). This is simpler to manage and sufficient — the audit trail is in the commit history, not the transport credentials.

- **Q**: Should the server strip sensitive data before committing to git? For
  example, spec access tokens should not be in the git history.

**A:** Yes. Implement a pre-commit validation step in the `GitService` that scans staged files for sensitive patterns: API keys, tokens, passwords, `.env` file content. If sensitive data is detected, reject the commit with an error. Spec access tokens are stored in PostgreSQL (not in JSON files), so they should never appear in the git repo. The validation is a safety net.

- **Q**: Should there be a pre-commit check that prevents accidentally
  committing `.env` files, API keys, or other secrets?

**A:** Yes. The `GitService` enforces a file whitelist for commits: only files under `specs/`, `graph/`, `documents/`, and `.botnet/` directories can be committed. Any attempt to stage a file outside these directories (including `.env`, `node_modules`, etc.) is rejected. This is enforced at the application level, not via git hooks (since the server controls all git operations).

### 10.2 History Integrity
- **Q**: Should the system enforce signed commits to prevent tampering? This
  adds trust but requires GPG key management.

**A:** No signed commits for the initial release. GPG key management adds significant complexity (key generation, distribution, verification) for a self-hosted system where the server is the only committer. The server's internal controls (only the server writes to the repo, authentication on all API endpoints) provide sufficient integrity. Signed commits can be added later for high-security deployments.

- **Q**: Should the system detect and prevent force pushes that rewrite
  history? Force push could destroy spec version history.

**A:** Yes. The `GitService` never executes `git push --force`. The `push()` method in the `GitOperations` interface does not accept a `force` parameter. If a push is rejected by the remote (non-fast-forward), the user is prompted to pull and merge first. No code path in the application allows force push. This is enforced at the application level. Additionally, configure the remote repository (GitHub/GitLab) to protect the `main` branch against force pushes.
