# 04-KNOWLEDGE-GRAPH / 03 — VERSION CONTROL: Open Questions

> **Purpose**: Unresolved questions about spec-level version tracking, commit
> strategy, diff generation, revert operations, branching, merging, conflict
> resolution, and delta detection. Answers may change tasks in the plan.

---

## 1. Commit Strategy

### 1.1 Commit Granularity

- **Q**: Should the system create a commit on every save (keypress-level
  autosave triggers frequent commits) or only on explicit user save actions?
  Frequent commits provide granular history but bloat git log.

**A:** Commit on explicit user save actions only. No autosave-to-commit. The frontend may autosave drafts to a local buffer or the server's in-memory state, but a git commit is only created when the user explicitly saves (clicks save, presses Ctrl+S, or confirms a dialog). This keeps git history meaningful — each commit represents an intentional checkpoint.

- **Q**: Should there be a commit debounce interval (e.g., batch changes within
  a 30-second window into one commit)?

**A:** No debounce for user-initiated saves — each save creates a commit immediately. For agent operations that modify multiple specs in rapid succession (e.g., crawl results), use a single batch commit at the end of the operation. The batching boundary is the logical operation, not a time window. If a user saves the same spec 5 times in 30 seconds, that's 5 commits — this is intentional and each represents a meaningful user action.

- **Q**: Should agent operations (which may modify many specs and edges) always
  use a single batch commit, or should critical operations (e.g., creating a
  new dependency edge) be committed individually for immediate visibility?

**A:** Single batch commit per agent operation. An agent crawl that creates 3 edges and updates 2 specs produces one commit with all 5 changes. This keeps git history clean (one commit = one logical agent action) and avoids partial-state visibility where some edges exist but their context changes haven't been committed yet. The commit message lists all affected entities via Conventional Commit trailers.

- **Q**: Should index-only changes (index rebuild without entity changes) be
  committed? They add noise to the git log but ensure indexes are always
  available after clone.

**A:** No. Indexes are ephemeral in-memory structures, not files on disk. There are no index files to commit. This question is resolved by the architecture decision to keep indexes out of git entirely.

### 1.2 Commit Messages

- **Q**: Should commit messages be human-readable or optimized for machine
  parsing? The plan proposes a hybrid — is the `kg(<scope>): <action>` format
  sufficient for both?

**A:** Hybrid format using Conventional Commits. The subject line is human-readable: `kg(spec): update authentication requirements`. The structured trailers are machine-parseable: `Specs-Modified: sp_abc123`, `Edges-Created: eg_def456`. This gives human readers a clear summary and machines a reliable parse target. The `kg` prefix distinguishes knowledge graph commits from application code commits.

- **Q**: Should the commit body include a detailed diff summary, or is the
  structured footer (Specs-Modified, etc.) sufficient?

**A:** Structured trailers are sufficient. The commit body may optionally include a 1–2 sentence human-readable explanation for agent operations (e.g., "Agent crawl found 3 new dependency relationships"). The detailed diff is in the git diff itself — repeating it in the commit body is redundant. Keep commit messages concise.

- **Q**: Should the system support user-provided commit messages (e.g., "Fixed
  typo in authentication spec") alongside the auto-generated message?

**A:** Yes. The save dialog offers an optional "Commit note" field. If provided, it becomes the commit body text beneath the auto-generated subject line. If left empty, only the auto-generated Conventional Commit message is used. Users are not required to write messages — the auto-generated format is always present.

### 1.3 Commit Authorship

- **Q**: For agent-initiated changes, should the git author be the agent or the
  human who triggered the session? The plan says human author + agent committer
  — does the team agree?

**A:** Human author + agent committer. `GIT_AUTHOR_NAME` / `GIT_AUTHOR_EMAIL` = the user who initiated the agent session. `GIT_COMMITTER_NAME` / `GIT_COMMITTER_EMAIL` = `knowledge-agent <agent@botnet.knowledge>`. This preserves attribution (the user is responsible for agent actions they trigger) while clearly marking commits as agent-produced. `git log --format='%an / %cn'` shows `Alice / knowledge-agent`.

- **Q**: Should the system support co-authorship (git `Co-authored-by` trailer)
  for collaborative edits?

**A:** Yes, for cases where multiple users contribute to a batch operation (e.g., a merge commit incorporating changes from two users). The `Co-authored-by: Name <email>` trailer is added automatically when the commit includes changes from multiple contributors. Single-author commits (the normal case) omit the trailer.

---

## 2. Version Tracking

### 2.1 Version Numbers

- **Q**: Should spec version numbers be monotonically increasing integers (v1,
  v2, v3) or semantic versions (1.0.0, 1.0.1, 1.1.0)? Semantic versions add
  meaning but complexity.

**A:** Monotonically increasing integers. v1, v2, v3, etc. Semantic versioning implies API compatibility guarantees that don't apply to knowledge specs. Each commit that modifies a spec increments its version by 1. Simple, unambiguous, and trivially computed from git log count for that spec's files.

- **Q**: Should the version number be stored in `spec.json` (denormalized but
  fast to read) or always computed from git log (single source of truth)?

**A:** Stored in `spec.json`. The `version` field is incremented by the application on every write. This avoids a `git log` call per spec for the common operation of displaying "v7" in the UI. Git log serves as the authoritative audit trail, but the denormalized version in JSON is the fast read path. If they ever disagree, the git log count wins.

- **Q**: Should version numbers reset if a spec is reverted? If spec is at v10
  and reverted to v7's content, is the new state v11 (preserving history) or
  v7.1 (indicating revert)?

**A:** v11. Revert creates a new version with the old content. The version counter never decreases. The commit message clearly marks it as a revert: `kg(spec): revert sp_abc123 to v7`. This preserves linear history — v11's content happens to match v7, but it's a distinct version with its own timestamp and commit.

### 2.2 Version Comparisons

- **Q**: Should users be able to compare any two versions of a spec (arbitrary
  pair), or only adjacent versions and current-vs-historical?

**A:** Any two versions (arbitrary pair). The UI provides a version picker for both the "from" and "to" sides. The most common comparison is current vs. previous, which is the default, but users should be able to diff v3 against v8 directly. This is implemented by `git diff <commit-hash-v3> <commit-hash-v8> -- specs/{bucket}/{id}.*`.

- **Q**: Should the system pre-compute diffs for the most recent N version pairs
  to speed up the UI?

**A:** No pre-computation. Diffs are computed on-demand using `simple-git`. For the recent 2–3 versions, git diff is fast (<50ms). Pre-computing diffs would require storage and invalidation logic for minimal latency gain. The LRU cache for traversal results (30-second TTL) applies to diffs too — a diff viewed twice in quick succession is served from cache.

- **Q**: Should version comparison include edge changes (edges added/removed
  between two versions of a spec)?

**A:** Yes. The diff view shows two sections: "Content Changes" (Markdown diff) and "Edge Changes" (edges added/removed between the two commit points). Edge changes are derived from diffing the spec's edge file at the two commits. This gives a complete picture of how a spec's context evolved between versions.

### 2.3 Version Metadata

- **Q**: Should each version store a snapshot of the spec's edges at that point
  in time, or should edges be versioned independently?

**A:** Edges are versioned independently via their own files in the `edges/` directory. Each commit captures the state of both spec files and edge files. Git's snapshot model means any historical commit already contains the full state of all edges at that point. No separate snapshot mechanism is needed — `git show <commit>:edges/{bucket}/{specId}.json` retrieves the exact edge state at any version.

- **Q**: Should the version history include "virtual" entries for events like
  "added to document X" or "new edge from spec Y created"?

**A:** No virtual entries. The version history is strictly derived from commits that modify the spec's own files. Document and edge changes are visible in the git log for those respective files. The spec detail view can show a "Related Activity" timeline that aggregates commits touching the spec's files, its edge file, and documents containing it — but these are not version increments on the spec itself.

---

## 3. Diff Generation

### 3.1 Diff Quality

- **Q**: For Markdown content, should diffs be line-level, word-level, or
  character-level? Word-level provides the best readability but is more
  expensive to compute.

**A:** Word-level for the UI display, line-level for the underlying git diff. Use `git diff --word-diff` output or a JavaScript diffing library (e.g., `diff` npm package with `diffWords`) to produce word-level diffs from the line-level git output. Word-level is significantly more readable for prose content (which is most spec content). Compute cost is negligible for typical spec sizes (<10KB).

- **Q**: Should the diff engine handle Markdown semantics (e.g., recognize that
  moving a paragraph is a move, not a delete+add)?

**A:** No. Move detection adds substantial complexity for marginal benefit. Standard diff algorithms (Myers) show delete+add, which is clear enough for users. If a paragraph moves, the diff shows it as removed from one location and added to another — users understand this. Markdown-aware diffing is a future enhancement if user feedback demands it.

- **Q**: Should diffs include Markdown rendering previews (show the rendered
  difference, not just source diff)?

**A:** Yes. The diff view offers two modes toggled by the user: "Source" (raw Markdown diff with word-level highlighting) and "Preview" (rendered Markdown with additions highlighted in green and deletions in red). Default is "Preview" for readability. Both modes are generated client-side from the same diff data.

### 3.2 Diff Scope

- **Q**: Should diffs include changes to the spec's edges (edges added or
  removed between the two versions), or only the spec's own files?

**A:** Yes, include edge changes. See 2.2 above — the diff view includes a "Content Changes" section and an "Edge Changes" section. This gives a holistic view of what changed between two versions of a spec.

- **Q**: For metadata diffs, should embedding vector changes be shown? They're
  large and machine-generated.

**A:** No. Embedding vectors are in pgvector, not in spec files. Metadata diffs show changes to tags, status, contributors, and custom fields — all human-meaningful data. The `contentHash` field change (indicating the content changed and will be re-embedded) is shown but the vector itself is never displayed.

- **Q**: Should there be a "changes since I last viewed" diff that tracks
  per-user last-viewed timestamps?

**A:** Yes. The server tracks `lastViewedVersion` per user per spec in PostgreSQL (a lightweight table: `user_id, spec_id, version, viewed_at`). When a user opens a spec, the UI can show a "3 changes since you last viewed" indicator with a one-click diff to their last-viewed version. This is an optional UI enhancement, not a core diff feature.

### 3.3 Diff Performance

- **Q**: What is the acceptable latency for generating a diff between two
  versions? <100ms? <500ms? <1s?

**A:** <200ms for the common case (adjacent versions, spec <10KB). <500ms for arbitrary version pairs or large specs. Word-level diffing of 10KB content takes <10ms in JavaScript. The bottleneck is `git show` to retrieve historical file content (~50–100ms per version). Caching historical spec content in the LRU cache eliminates this for recently viewed versions.

- **Q**: Should diffs be pre-computed and cached on commit, or computed on
  demand?

**A:** Computed on demand, cached with 60-second TTL. Pre-computation would require storing diffs for every version pair — storage grows quadratically. On-demand computation is fast enough (<200ms) and the cache handles repeated views.

- **Q**: For very long spec content (>50KB), should diffs be truncated or
  paginated?

**A:** Truncated with expand option. If a diff exceeds 500 changed lines, show the first 100 lines with "Show all 500 changed lines" expand button. This keeps the initial render fast and avoids overwhelming the user with massive diffs. Specs >50KB are unusual and likely indicate content that should be split into multiple specs (flagged via inquiry).

---

## 4. Revert Operations

### 4.1 Revert Semantics

- **Q**: Should revert create a new commit (preserving history) or use `git
revert` (which creates a revert commit)? New commit is simpler; git revert is
  more semantically correct.

**A:** Create a new forward commit that restores the old content. Do NOT use `git revert` (which operates on the commit level and may affect other files in the same commit). The application reads the spec's files at the target version via `git show`, writes them as the current version, and commits. This is a spec-level revert, not a commit-level revert. The commit message: `kg(spec): revert sp_abc123 to v7`.

- **Q**: Should the system support "undo last change" as a quick action (revert
  to the immediately previous version)?

**A:** Yes. The spec editor includes an "Undo last save" button that reverts to the immediately previous version (v(n-1)). This is a convenience shortcut for the general revert-to-version-N operation. It uses the same mechanism: read previous version from git, write as new version, commit.

- **Q**: Should revert be available only for content changes, or also for
  status changes, tag changes, and permission changes?

**A:** Revert restores the entire `spec.json` and `content.md` to their state at the target version. This includes content, status, tags, and all metadata. Permission changes (stored in PostgreSQL, not in spec files) are NOT reverted — permissions are managed separately. The revert confirmation dialog lists what will change: "Content: restored, Status: active → draft, Tags: +2 removed, -1 added."

### 4.2 Revert Safety

- **Q**: Should the system prevent reverting to a version that would break
  existing edges (e.g., reverting a spec to before an edge was created)?

**A:** No. Revert only affects the spec's own files (JSON + Markdown), not its edges. Edges are stored in separate files and are not touched by a spec revert. If the reverted content makes an existing edge semantically invalid, the agent crawl will detect this and create an inquiry. The revert operation itself has no edge-breaking side effects.

- **Q**: Should there be a revert confirmation dialog showing all side effects?

**A:** Yes. The revert confirmation shows: current version number, target version number, a summary of what changes (content diff preview, status change, tag changes), and the resulting commit message. The user must click "Confirm Revert" to proceed.

- **Q**: Can a revert itself be reverted (revert-the-revert)?

**A:** Yes. Since revert creates a new forward version (e.g., v11 that matches v7's content), the user can revert from v11 back to v10 (or any other version). There is no special handling — revert-the-revert is just another revert operation. The version history clearly shows the sequence: v10 → v11 (revert to v7) → v12 (revert to v10).

- **Q**: Should there be a time limit on how far back a revert can go (e.g.,
  only the last 50 versions)?

**A:** No time limit, but a practical limit of the last 100 versions shown in the UI's version picker. Users can revert to any version in git history regardless, but the UI only displays the most recent 100 versions for usability. Reverting to very old versions (>100 versions back) requires using the API directly or expanding the version list.

---

## 5. Branch Management

### 5.1 Branch Usage

- **Q**: What are the expected use cases for knowledge graph branching?
  Experimentation? Parallel editing? Draft vs. published? The answer determines
  how branches are presented in the UI.

**A:** Primary use case: experimentation and what-if analysis. A user creates a branch to explore restructuring a section of the knowledge graph without affecting the main branch. Secondary use case: parallel editing by multiple users who want to work independently before merging. Branches are NOT used for draft-vs-published workflow (the spec `status` field handles that). The UI presents branches as "Experiments" to set user expectations correctly.

- **Q**: Should the main branch be protected (no direct commits, only merges
  from feature branches)?

**A:** No. Direct commits to main are the normal workflow for single-user and small-team usage. Branch protection is overkill for a knowledge graph (this isn't source code with CI/CD). Users commit directly to main for everyday spec editing. Branches are used only when a user explicitly wants to experiment in isolation.

- **Q**: Should there be a naming convention for branch purposes (e.g.,
  `kg/experiment/...`, `kg/draft/...`, `kg/user/...`)?

**A:** Yes. Convention: `kg/{username}/{description}`. Example: `kg/alice/restructure-auth-specs`. The `kg/` prefix distinguishes knowledge graph branches from any application code branches in a shared repo. The username provides attribution. The description is free-form but kebab-case. The system auto-suggests the branch name based on the user's name and a prompted description.

- **Q**: How many concurrent branches should the system support? Dozens?
  Hundreds?

**A:** Up to 20 active branches. This is a soft limit enforced by the UI (warn at 20, don't block creation). Git itself handles hundreds of branches, but 20+ active experiments suggest organizational problems. Stale branches (no commits in 30 days) are highlighted for cleanup.

### 5.2 Branch Lifecycle

- **Q**: Should branches have an expiration or auto-cleanup (delete branches
  inactive for >30 days)?

**A:** No auto-deletion. Branches inactive for 30+ days are flagged in the branch dashboard with a "Stale — consider deleting" label. The user must explicitly delete stale branches. Auto-deletion risks losing experimental work that a user intended to return to.

- **Q**: Should there be a "branch dashboard" showing all active branches and
  their status (ahead/behind, conflicts)?

**A:** Yes. The branch dashboard lists all branches with: name, author, last commit date, commits ahead/behind main, and conflict status (clean/conflicted). This is a lightweight view built from `git branch -v` and `git rev-list` data. It's accessible from the navigation sidebar.

- **Q**: Should users be able to compare two branches side by side without
  merging?

**A:** Yes. The branch dashboard offers a "Compare" action between any two branches. This shows: specs added/removed/modified on each branch, edge changes, and a per-spec diff view. Implemented via `git diff branch1...branch2`. This helps users understand what merging would entail.

- **Q**: Should branch creation automatically switch to the new branch, or
  require an explicit switch?

**A:** Automatically switch to the new branch after creation. This matches the user's intent — they created a branch to work on it. The UI shows a confirmation: "Switched to branch kg/alice/restructure-auth-specs." Switching back to main is a one-click action in the branch selector.

---

## 6. Merge Strategy

### 6.1 Merge Behavior

- **Q**: Should merges use `git merge --no-ff` (always create a merge commit)
  or allow fast-forward merges? No-ff preserves branch history; ff is cleaner
  for simple branches.

**A:** `git merge --no-ff` always. The merge commit clearly marks where an experimental branch was incorporated into main. This preserves the "this was an experiment" context in the git history. The small cost of an extra commit is worth the clarity.

- **Q**: For the auto-merge of metadata.json arrays (tags, contributors), is
  union always the right strategy? Could there be cases where a user
  intentionally removed a tag on one branch?

**A:** Union is the default for tags and contributors arrays. If a user intentionally removed a tag on one branch while the other branch still has it, the union preserves the tag — the removal is lost. This is acceptable because tag removal is a rare operation and the merge result can be manually corrected. The alternative (three-way merge per array element) adds substantial complexity for a rare edge case. Post-merge review handles corrections.

- **Q**: Should the merge strategy be configurable per user or per project?

**A:** Per project only, configured in `.kg-config.json`. The merge strategy is a project-level decision, not a personal preference. Settings: `mergeStrategy: 'no-ff'` (default), `arrayMerge: 'union'` (default). These are rarely changed from defaults.

- **Q**: Should there be a "squash merge" option that combines all branch
  commits into a single commit?

**A:** Yes, as an option in the merge dialog. Default is `--no-ff` (preserve all commits). Squash merge is useful when a branch has many small exploratory commits and the user wants a clean single-commit merge. The squash commit message auto-includes the count: "kg(merge): squash merge kg/alice/restructure-auth-specs (14 commits)".

### 6.2 Merge Triggers

- **Q**: Should the system periodically check for new changes on the remote and
  prompt users to merge?

**A:** Yes. The server checks for remote changes on a 30-second polling interval. If the user's current branch is behind the remote, the UI shows a non-blocking notification: "Main branch has 3 new commits. Pull changes?" The user can pull immediately or defer. No auto-merge — the user always initiates the merge.

- **Q**: Should merges from main into feature branches be automatic (rebase-
  like behavior) or manual?

**A:** Manual. The user decides when to incorporate main branch changes into their experiment branch. Auto-rebasing can introduce unexpected conflicts mid-work. The branch dashboard shows "5 commits behind main" as a visual reminder, and the user can pull from main when ready.

---

## 7. Conflict Resolution

### 7.1 Conflict UX

- **Q**: Should conflict resolution happen in a dedicated UI (merge conflict
  screen) or inline in the spec editor?

**A:** Dedicated merge conflict screen. The conflict view shows the spec's three versions side-by-side: "Yours" (current branch), "Theirs" (incoming branch), and "Base" (common ancestor). The user picks sections from either side or edits the result directly. This is a focused workflow — the user can't navigate away until all conflicts in the merge are resolved or the merge is aborted.

- **Q**: Should the system auto-resolve "trivial" conflicts (e.g., both sides
  only added new tags)?

**A:** Yes. Auto-resolve trivial conflicts: both sides added different tags (union), both sides added different contributors (union), one side changed content while the other only changed metadata (take both changes). Only present the conflict UI for true content conflicts (both sides modified the same content region). This reduces merge friction significantly.

- **Q**: Should the system suggest a resolution based on which change is more
  recent, which author has more authority, or which change is larger?

**A:** Suggest "more recent change" as the default resolution for content conflicts. The conflict UI pre-selects the more recently committed version's changes but allows the user to override. No authority-based resolution — all users' changes are treated equally. This is a suggestion, not an auto-resolution.

- **Q**: Should conflicts block all other operations on the affected spec until
  resolved?

**A:** Yes. A spec in conflict state is locked for editing until the conflict is resolved. Other specs unaffected by the merge remain editable. The conflict lock prevents compounding conflicts. The UI shows a clear "Resolve conflict to continue editing" message on locked specs.

### 7.2 Conflict Prevention

- **Q**: Should the system use advisory locking to prevent concurrent edits to
  the same spec on the same branch?

**A:** Yes. When a user opens a spec for editing, the server acquires a PostgreSQL advisory lock (keyed on `specId + branchName`). If another user tries to edit the same spec on the same branch, they see: "Alice is currently editing this spec. You can view it read-only or wait." The lock is released when the user saves, closes the editor, or after a 5-minute inactivity timeout.

- **Q**: Should the frontend show real-time editing presence (who is currently
  editing which spec) to reduce conflicts?

**A:** Yes. The spec list view shows a small avatar indicator next to specs currently being edited by another user. This is powered by WebSocket presence events. Lightweight — just a `{ specId, userId, timestamp }` broadcast on edit-start and edit-end. No full CRDT/collaborative editing — just presence awareness.

- **Q**: Should the system auto-commit before a user switches branches, or
  require manual commit/stash?

**A:** Require manual save before switching branches. If the user has unsaved changes, the branch switch button shows: "Save or discard changes before switching branches." There is no automatic stash — stashing is a git-power-user concept that would confuse non-technical users. The two options are "Save" (commit changes) or "Discard" (revert to last committed state).

---

## 8. Delta Detection & Agent Triggers

### 8.1 Delta Scope

- **Q**: Should delta detection be limited to knowledge graph files, or also
  track changes to project code that may be relevant to specs?

**A:** Limited to knowledge graph files only (`specs/`, `edges/`, `documents/`). The knowledge graph system does not monitor application source code. If source code changes are relevant to specs, the user or an external integration creates/updates specs manually. Tracking source code changes would require understanding arbitrary codebases — out of scope.

- **Q**: Should the delta detection system maintain a "change journal" in
  addition to git-derived deltas for real-time change tracking?

**A:** No separate change journal. The server maintains an in-memory event stream of recent operations (last 1000 events) for real-time WebSocket notifications. Git commits are the durable change record. A journal file would duplicate git history. The in-memory event stream handles the real-time use case; git handles the historical use case.

- **Q**: How should deltas handle rebased or amended commits (which rewrite
  history)?

**A:** The system does not support interactive rebase or commit amend through the UI. These are destructive git operations that conflict with the append-only nature of spec versioning. If a user performs these operations via git CLI directly, the server detects the divergence on next sync and treats it as a force-push: resync from the remote state, create inquiries for any discrepancies. The `version` field in `spec.json` may need reconciliation.

### 8.2 Agent Triggers

- **Q**: Should agent triggers be opt-in (user configures which triggers to
  enable) or opt-out (all triggers enabled by default)?

**A:** Opt-out. All triggers enabled by default: spec creation triggers edge suggestion crawl, spec update triggers implication analysis, spec deletion triggers orphan check. Users can disable specific triggers in project settings (`.kg-config.json`). Opt-out ensures new users get the full benefit of agent analysis without configuration. Power users can tune down the automation.

- **Q**: Should there be a "quiet mode" where agent triggers are suppressed
  (e.g., during large imports or migrations)?

**A:** Yes. `quietMode: true` in the batch operation request or the import request suppresses all agent triggers for the duration of that operation. After the operation completes, a single comprehensive agent crawl runs across all affected specs. This prevents trigger storms during bulk operations while ensuring analysis still happens.

- **Q**: How should the system handle trigger cascades (agent change triggers
  another agent, which triggers another)? Maximum depth? Cooldown period?

**A:** Maximum cascade depth: 2. An agent operation can trigger one follow-up agent operation (depth 1), which can trigger one more (depth 2). At depth 2, any further triggers are queued as inquiries instead of auto-executing. This prevents infinite cascades while allowing reasonable follow-on analysis. Cooldown: 5-second minimum between cascaded triggers for the same spec.

- **Q**: Should the user be able to review and approve agent-triggered actions
  before they execute?

**A:** Not by default — agent triggers execute automatically (this is the value of automation). However, users can enable "approval mode" per trigger type in project settings. In approval mode, the agent's proposed changes are staged as a preview in the inquiry queue, and the user approves or rejects. This is useful for cautious users or sensitive knowledge domains.

---

## 9. Audit Trail

- **Q**: Is git log alone sufficient as an audit trail, or should there be a
  separate database-backed audit log?

**A:** Both. Git log is the primary audit trail for knowledge graph content changes (who changed what, when). The PostgreSQL `audit_logs` table captures operations that don't produce git commits: permission changes, login events, agent session activity, sync operations, inquiry resolutions. Together, they provide a complete audit trail.

- **Q**: Should the audit trail include read operations (who viewed a spec), or
  only write operations?

**A:** Write operations only. Logging reads would generate massive volume (every page view = a log entry) with limited audit value. The `lastViewedVersion` per-user-per-spec table captures viewing activity for the "changes since last viewed" feature, but this is not an audit log — it's a UX feature. If compliance requires read logging, it can be enabled as an opt-in project setting.

- **Q**: Should audit log entries be immutable (append-only) or prunable after
  a retention period?

**A:** Append-only with pruning after 1 year. The `audit_logs` table uses a database trigger to reject `UPDATE` and `DELETE` operations. A scheduled job prunes entries older than 1 year (configurable via `AUDIT_RETENTION_DAYS` environment variable). Git log entries are permanent and unprunable — they serve as the long-term audit trail.

- **Q**: Should the audit trail be searchable in the UI, or only accessible via
  API?

**A:** Searchable in the UI via an "Activity Log" view. The UI provides filters: by user, by date range, by action type, by affected spec. This view queries the PostgreSQL `audit_logs` table with appropriate indexes. For git-level history, the spec detail view shows the version history (derived from git log).

- **Q**: For compliance purposes, should the audit trail include IP addresses
  and session information?

**A:** Yes. The `audit_logs` table includes `ip_address` and `session_id` columns. IP addresses are logged from the HTTP request. Session IDs link to the `agent_sessions` or user authentication sessions. This supports compliance investigation without being excessively invasive. IP addresses are subject to the same pruning/anonymization policy as other audit data.

---

## 10. Performance

- **Q**: At what repository size (number of commits) does git log performance
  become unacceptable? Should there be a `git log` result cache in PostgreSQL?

**A:** Git log performance degrades noticeably at ~100K commits for full-repo queries. For per-file queries (`git log -- path/to/file`), performance is acceptable up to ~500K commits. The system caches the most recent 50 version entries per spec in PostgreSQL (`spec_versions` table: `spec_id, version, commit_hash, timestamp, author`). This cache is populated on write and avoids `git log` calls for the common "show recent history" use case.

- **Q**: Should the system use `libgit2` bindings (like `nodegit` or `isomorphic-git`)
  instead of shelling out to `git` CLI for better performance?

**A:** Use `simple-git` (per PRD), which shells out to the git CLI. `simple-git` is the PRD-specified library. It provides a clean async API over git commands, works reliably under Bun, and avoids the native dependency compilation issues of `nodegit`. Git CLI performance is sufficient for the target scale. `isomorphic-git` lacks features needed for merging and complex operations.

- **Q**: For frequently accessed specs with long version histories, should the
  system pre-compute and cache version metadata?

**A:** Yes. The PostgreSQL `spec_versions` cache (described above) stores the last 50 version entries per spec. For specs with >50 versions, the UI paginates ("Load older versions") and those are fetched from git log on demand. This covers the 99% use case (recent history) without unbounded storage.

- **Q**: What is the acceptable latency for `git commit`? <100ms? <500ms? Does
  this include index updates?

**A:** Target: <300ms for a single-spec commit. This includes: file write (~20ms), `git add` (~30ms), `git commit` (~100–200ms), in-memory index update (~1ms). For batch commits (agent operations touching 10+ specs), target: <500ms total. Git commit latency depends on repo size and disk speed. At 50K specs with SSD, `git commit` is consistently <200ms.

---

## Decision Log

> Record decisions as questions are resolved.

| Date | Question | Decision | Rationale |
| ---- | -------- | -------- | --------- |
| —    | —        | —        | —         |
