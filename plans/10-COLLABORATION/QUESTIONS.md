# 10 — COLLABORATION: Open Questions

> **Purpose**: Unresolved questions about multi-user collaboration including
> git synchronization model, conflict handling, dialog sharing, agent
> coordination, and communication features. Answers may change tasks in the plan.

---

## 1. Git Synchronization Model

### 1.1 Sync Strategy

- **Q**: Should the default sync model be manual (user clicks "sync"), periodic
  (every N minutes), or event-driven (push notification triggers pull)? Each
  has different UX trade-offs. Manual is simplest but can lead to stale data;
  periodic adds background load; event-driven requires WebSocket infrastructure.
- **A:** Hybrid per the PRD: manual pull/push triggered by the user, combined with a 60-second background fetch that checks for remote changes. The background fetch does NOT auto-merge — it updates a "changes available" indicator in the UI. The user explicitly clicks "Pull" to incorporate remote changes. Push is always manual.

- **Q**: Should "sync" be a single action (pull + push) or should pull and push
  be separate user actions? A single "sync" is simpler for most users, but
  separate actions give more control.
- **A:** Separate actions. "Pull" and "Push" are distinct buttons. A combined "Sync" button can be offered as a convenience shortcut (pull then push), but the separate actions must remain available. This gives users control and makes conflict resolution clearer (pull first, resolve, then push).

- **Q**: When auto-sync detects remote changes, should it automatically merge
  them into the user's working copy, or stage them for review? Auto-merge is
  seamless for non-conflicting changes but may surprise users.
- **A:** Stage for review. The 60-second background fetch only updates the remote tracking refs (`git fetch`). A badge/indicator shows "N changes available." The user chooses when to pull. This avoids surprise mutations to the working copy.

- **Q**: Should there be a "sync preview" that shows what will change before
  pulling? This adds a step but prevents surprises.
- **A:** Yes. Clicking the "changes available" indicator shows a preview panel listing changed specs (added/modified/deleted) with abbreviated diffs. The user can then confirm the pull or defer it.

### 1.2 Branching

- **Q**: Should the collaboration model use branches at all, or should all
  users work directly on `main`? Branches add complexity but enable parallel
  experimentation. For a knowledge management tool (not code), is branching
  natural for users?
- **A:** All users work on `main` at launch. Branching adds significant UX complexity for a knowledge management tool. The async pull/push model with advisory locks is sufficient for 20–50 users. Feature branches for the knowledge graph are a Phase 4+ consideration.

- **Q**: If branches are supported, should each user automatically get their
  own branch, or should branching be explicit and optional? Per-user branches
  reduce conflicts but complicate merging.
- **A:** N/A at launch (no branching). If branches are added later, they should be explicit and optional — created by the user for a specific purpose, not auto-generated.

- **Q**: How should the UI expose branches to non-technical users? Git branch
  concepts may be unfamiliar. Should we abstract branches as "workspaces" or
  "drafts"?
- **A:** N/A at launch. If branches are introduced, they should be abstracted as "Drafts" — a user-friendly concept that hides git terminology. The UI would show "Create a draft," "Merge draft into main," etc.

- **Q**: Should there be branch protection rules (e.g., require review before
  merging to main)? This is common in code workflows but may be heavy for
  knowledge management.
- **A:** N/A at launch. If branches are added, optional branch protection (require at least one approval before merge) can be a project-level setting, disabled by default.

### 1.3 Merge Strategy

- **Q**: Should we implement custom JSON merge drivers for spec files, or rely
  on standard text-based git merge? Custom drivers reduce false conflicts but
  are complex to implement and maintain.
- **A:** Custom JSON merge driver for `spec.json` metadata files. These have a well-defined schema and field-level merging is straightforward (e.g., two users changing different fields should not conflict). Markdown content files use standard text-based merge. This is a good investment because `spec.json` conflicts are the most common false positives.

- **Q**: How should merge conflicts in knowledge graph index files be handled?
  Index files are derived data — should they simply be regenerated after a
  merge rather than merged?
- **A:** Regenerated after merge. Index files (graph adjacency, search indices) are derived data and should be in `.gitignore` or rebuilt by the server on startup/pull. Never merge index files — always regenerate.

- **Q**: Should the system attempt to auto-resolve "trivial" conflicts (e.g.,
  two users added different tags to the same spec)? Or should all conflicts
  require human resolution?
- **A:** Auto-resolve trivial conflicts in `spec.json` via the custom merge driver (e.g., union-merge for arrays like tags, last-writer-wins for scalar fields like status with a notification). Markdown content conflicts always require human resolution — content intent cannot be safely inferred.

---

## 2. Conflict Resolution

### 2.1 Conflict UX

- **Q**: Should conflict resolution happen in the spec editor (inline), in a
  dedicated conflict resolution view, or in a modal? Inline keeps context but
  adds complexity to the editor. Dedicated view is clearer but requires
  navigating away.
- **A:** Dedicated conflict resolution view. When a pull results in conflicts, a "Resolve Conflicts" panel appears listing all conflicted files. Clicking a file opens a side-by-side diff view (mine vs. theirs) with "Accept Mine," "Accept Theirs," and "Edit Manually" options. This is clearer than inline markers and doesn't pollute the normal editing experience.

- **Q**: Should the agent be available to help resolve conflicts? For example,
  the agent could analyze both versions and propose a merged result. How much
  should users trust agent-generated resolutions?
- **A:** Yes, as an optional assist. The conflict resolution view includes a "Suggest Resolution" button that asks the agent to propose a merge. The suggestion is shown as a third option (alongside "mine" and "theirs") and must be explicitly accepted by the user. The user always has final say.

- **Q**: Should conflict resolution block all other operations (hard lock) or
  allow the user to continue editing other non-conflicted specs while
  resolving conflicts in some?
- **A:** Non-blocking. The user can continue editing non-conflicted specs. Conflicted specs are marked with a warning icon and are read-only until resolved. Push is blocked until all conflicts are resolved.

- **Q**: How should conflicts in graph edges be presented? If two users create
  different edges from the same spec, is that a conflict or are both valid?
- **A:** Both edges are valid — edge creation is additive. If two users both add different edges from the same spec, both are preserved (union merge). If two users modify the same edge (e.g., change its label), that is a conflict and requires resolution. Edge deletion conflicting with edge modification is also a conflict.

### 2.2 Conflict Prevention

- **Q**: Should there be advisory locking — when a user starts editing a spec,
  warn other users that it's being edited? This reduces conflicts but adds
  complexity and can be confusing in async workflows.
- **A:** Yes, per the PRD. Advisory locks are implemented. When a user opens a spec for editing, a lock is registered on the server (via WebSocket). Other users see a warning: "Alice is currently editing this spec." The lock is advisory — users can override it and edit anyway, accepting the conflict risk. Locks auto-expire after 30 minutes of inactivity or on WebSocket disconnect.

- **Q**: Should the system detect potential conflicts proactively? For example,
  "Alice is editing Spec X, and you have uncommitted changes to Spec X" —
  warning before a conflict actually occurs.
- **A:** Yes. The 60-second background fetch combined with advisory lock awareness enables this. If the server detects that two users have uncommitted changes to the same spec, both receive a WebSocket notification: "Potential conflict: [other user] also has changes to [spec name]." This is informational only — no action is forced.

---

## 3. Multi-User Project Management

### 3.1 Project Structure

- **Q**: Should a user be able to belong to multiple projects simultaneously?
  If so, is there a maximum number of projects per user?
- **A:** Yes, users can belong to multiple projects. No hard maximum at launch. A practical soft limit of 20 projects per user is enforced with a warning, not a block. This prevents UI clutter and performance issues.

- **Q**: Should projects support sub-teams or groups within a project? For
  large teams, it may be useful to grant permissions to groups rather than
  individuals.
- **A:** Not at launch. With 20–50 total users, per-user permissions are manageable. Groups/teams are a Phase 3+ enhancement if projects grow beyond ~15 members each.

- **Q**: Should project creation be open to all users, or restricted to admins?
  In a self-hosted deployment, anyone might create projects. In a hosted
  service, there may be plan-based limits.
- **A:** Open to all authenticated users at launch. Any user can create a project and becomes its Owner. The instance admin can disable this via a server config flag if they want to restrict project creation to admins only.

### 3.2 Roles & Permissions

- **Q**: Are three project roles (Owner, Editor, Viewer) sufficient? Should
  there be a "Commenter" role (can view and comment but not edit)? Or a
  "Manager" role (can manage users but not edit specs)?
- **A:** Three roles are sufficient at launch: Owner, Editor, Viewer. Commenting is allowed for all roles (Viewers can comment but not edit spec content). A "Manager" role is deferred — Owners handle user management for now.

- **Q**: Should role changes take effect immediately or require
  re-authentication? Immediate effect is simpler but could be disruptive if
  someone's role is accidentally changed during an active session.
- **A:** Immediate effect. The permission check happens on every API request against the database, not against the JWT claims. This means role changes are enforced on the next request without re-authentication. If a user is demoted mid-session, their next write attempt is rejected with a clear error message.

- **Q**: How should permission propagation work when a new user joins a project
  with existing private/encrypted specs? Should they get SUMMARY access to
  everything by default, or should existing encryption tokens need to be
  explicitly shared?
- **A:** New members get SUMMARY access to encrypted specs by default (they see title, status, tags). FULL access to encrypted content requires explicit token sharing by the spec owner. This aligns with the PRD: no user has "no access" — always at least a summary. Tokens are server-managed and must be deliberately shared.

---

## 4. Spec Collaboration

### 4.1 Concurrent Editing

- **Q**: Since the collaboration model is async (git-based), what happens when
  two users are editing the same spec at the same time? Should the UI warn
  them proactively, or only detect the conflict at push time?
- **A:** Proactive warning via advisory locks (see 2.2). When User A opens a spec for editing, User B sees "Alice is editing this spec" immediately. User B can still edit (advisory, not blocking), but they are warned that a conflict is likely. The conflict is resolved at pull/push time.

- **Q**: Should there be a "lock spec for editing" feature that temporarily
  prevents others from editing? This prevents conflicts but reduces
  concurrency. Should locking be optional (user chooses)?
- **A:** Advisory locks only, per the PRD. No hard locks. Users are warned but never blocked from editing. Hard locks in an async system lead to stale locks and frustration. The advisory lock + conflict resolution flow is sufficient.

- **Q**: Should the system attempt operational transformation (OT) or CRDT-based
  real-time co-editing for specs? This would be a significant architectural
  change from git-based async. Is it worth the complexity?
- **A:** No. Per the PRD, no real-time co-editing. The system is git-based async with advisory locks. OT/CRDT would fundamentally change the architecture, add enormous complexity, and conflict with the git-as-source-of-truth model. Real-time co-editing is explicitly out of scope.

### 4.2 Change Notifications

- **Q**: How should changes to a spec be communicated to other users? Only when
  pushed (visible to all), or also when committed locally (visible only if
  another user pulls)?
- **A:** Only when pushed. Local commits are private to the user's machine until pushed. When a push occurs, the server broadcasts a notification via WebSocket to all online project members: "[User] updated [spec name]." Offline users see the notification on their next login.

- **Q**: Should notifications include the full diff, a summary, or just "Spec X
  was updated"? Full diffs can be noisy; summaries are more digestible but
  may miss important details.
- **A:** Summary notification: "[User] updated [spec name] — [commit message or first line of change]." Users can click the notification to see the full diff in the spec's history view. This balances signal-to-noise.

- **Q**: Should users be able to "subscribe" to specific specs for
  notifications, or are notifications automatic for all specs they've viewed?
- **A:** Subscription-based. Users explicitly "watch" specs they care about (star/bell icon). By default, users are auto-subscribed to specs they create or edit. Unwatching is always available. Project-wide activity is visible in an activity feed but doesn't generate individual notifications.

---

## 5. Dialog Collaboration

### 5.1 Dialog Sharing

- **Q**: Should dialog sessions be private by default or shared by default?
  Private protects exploration and half-formed ideas; shared promotes
  transparency and knowledge sharing.
- **A:** Private by default, per the PRD. Dialogs are per-user. A user can explicitly share a dialog session (read-only link to project members). Shared dialogs appear in a "Shared Dialogs" section of the project sidebar.

- **Q**: When a user forks another user's dialog, should the forked messages be
  copies (independent) or references (if the original is edited, does the
  fork update)? Independent copies are simpler and prevent confusion.
- **A:** Independent copies. Per the PRD, dialogs are forkable. A fork creates a complete copy of the conversation up to the fork point. Changes to the original do not propagate to the fork, and vice versa. This is simple, predictable, and avoids confusion.

- **Q**: Should there be a concept of "team dialog sessions" where multiple
  users can contribute messages to the same session in real-time? Or should
  collaboration always be async via forking?
- **A:** No team dialog sessions. Collaboration is async via forking, per the PRD. One user per dialog session. If multiple users want to build on each other's work, they fork and continue independently. This keeps the agent context clean and avoids real-time co-editing complexity.

- **Q**: Should agents have access to other users' shared dialog sessions for
  context? This could improve agent responses but raises privacy concerns.
- **A:** No. Agent sessions are local to the machine, per the PRD. Agents only see dialogs from the user who initiated the session. Shared dialogs are for human consumption only. If a user wants the agent to consider information from another dialog, they copy the relevant content into their own session.

### 5.2 Dialog Persistence

- **Q**: How long should dialog history be retained? 30 days? 90 days? Forever?
  Longer retention increases storage costs but provides better context for
  future work.
- **A:** Forever (no automatic expiration). Dialog history is stored in PostgreSQL and is relatively compact (text). Users can manually delete their own dialogs. Storage impact is minimal for 20–50 users. Automatic archival/cleanup can be added if storage becomes a concern.

- **Q**: Should dialog sessions be exportable (as Markdown, PDF, or JSON)?
  This is useful for documentation and record-keeping.
- **A:** Yes, exportable as Markdown and JSON. Markdown for human readability; JSON for machine processing and re-import. PDF export is deferred (requires a rendering pipeline). Export is available from the dialog session menu.

- **Q**: Should important dialog exchanges be convertible to spec content
  directly? For example, "this conversation resolved the design for feature X
  — save it as a spec."
- **A:** Yes. A "Save as Spec" action on a dialog session (or a selected range of messages) creates a new spec draft pre-populated with the selected content, formatted as Markdown. The user can edit before saving. This bridges the gap between exploration (dialog) and documentation (spec).

---

## 6. Agent Collaboration

### 6.1 Agent Coordination

- **Q**: Should agents be aware of other active agent sessions in the project?
  If two users are running agents that modify related specs simultaneously,
  conflicts are likely. Should the system prevent this?
- **A:** Agents are aware of advisory locks. When an agent session starts modifying a spec, it acquires an advisory lock (attributed to the user). Other agents (and users) see the lock. The system does not prevent concurrent agent operations but warns about potential conflicts. Conflict resolution follows the same flow as human conflicts.

- **Q**: Should there be a shared "agent workspace" where agent results are
  visible to all project members, or should agent outputs be private to
  the requesting user until pushed?
- **A:** Agent outputs are private to the requesting user until pushed, per the PRD (agent sessions local to machine). The user reviews agent-generated changes, commits, and pushes when satisfied. No shared agent workspace.

- **Q**: Should agents be able to delegate tasks to other agents? For example,
  user A's agent identifies a dependency on specs owned by user B — should
  it be able to notify user B's agent?
- **A:** No inter-agent delegation. If User A's agent identifies a dependency on User B's specs, the agent reports this to User A, who communicates with User B through normal collaboration channels (comments, notifications). Agent sessions are isolated per user per machine.

- **Q**: How should agent-generated changes be distinguished from human changes
  in the git history? Should there be a flag or special author identity?
- **A:** Agent-generated commits use a distinct author identity: `"[username]-agent" <username+agent@botnet.local>`. This makes agent commits immediately identifiable in git log without special tooling. The commit message includes a `[agent]` prefix tag.

### 6.2 Agent Locking

- **Q**: Should advisory locks during agent operations be visible to other
  users' agents, or only to human users? If visible to agents, they could
  automatically wait or avoid conflicting modifications.
- **A:** Visible to both humans and agents. When an agent encounters a lock held by another user/agent, it skips that spec and reports it as "skipped — locked by [user]" in its execution log. The agent continues with non-locked specs rather than waiting.

- **Q**: What is the maximum number of concurrent agent sessions per project?
  Should this be configurable based on project size or plan tier?
- **A:** Maximum 3 concurrent agent sessions per project at launch. This prevents resource contention on a single server targeting 20–50 users. The limit is configurable via env var (`MAX_AGENT_SESSIONS_PER_PROJECT`). Per-user limit: 1 agent session at a time.

- **Q**: Should there be a concept of "agent priority" — e.g., a graph crawl
  initiated by the project owner takes priority over individual user agents?
- **A:** No priority system. First-come, first-served for advisory locks. All agents are equal regardless of the initiating user's role. If the concurrent session limit is reached, new agent sessions are queued with an estimated wait time shown to the user.

---

## 7. Communication Features

### 7.1 Comments

- **Q**: Should comments be stored per spec (attached to the spec) or per spec
  version (attached to a specific version of the spec)? Per-version is more
  precise but comments may become orphaned after updates.
- **A:** Per spec (not per version). Comments are attached to the spec entity and persist across versions. A comment can optionally reference a specific version (git commit SHA) for context, but it remains visible regardless of spec updates. This avoids orphaned comments.

- **Q**: Should comments support rich text (Markdown, images, code blocks) or
  plain text only? Rich text is more useful but adds complexity.
- **A:** Markdown comments (same renderer as spec content, with the same sanitization). Code blocks, bold, italic, lists, and inline links are supported. Image embedding in comments is deferred — users can reference spec images by path.

- **Q**: Should there be a distinction between "review comments" (part of a
  formal review process) and "discussion comments" (informal)? Some workflows
  may benefit from structured reviews.
- **A:** No distinction at launch. All comments are discussion comments. Formal review workflows (approve/request changes) are a Phase 4+ feature, potentially tied to branch/merge workflows if those are introduced.

- **Q**: Should resolved comments be permanently hidden or just collapsed?
  Permanently hidden loses context; collapsed preserves it without cluttering.
- **A:** Collapsed. Resolved comments are minimized to a single line ("[User] resolved a comment — click to expand"). They can be re-opened if the discussion needs to continue. A filter toggle shows/hides resolved comments.

### 7.2 Activity Feed

- **Q**: How granular should the activity feed be? Every auto-save creates a
  commit — should each be an event, or should events be batched (e.g.,
  "Alice made 12 edits to Spec X today")?
- **A:** Batched. The activity feed groups events by user + spec + time window (1 hour). "Alice edited Spec X (5 changes)" with an expandable detail view. Push events, membership changes, and comments are shown individually (not batched). This keeps the feed readable.

- **Q**: Should the activity feed show agent actions (tool calls, spec
  modifications) alongside human actions? This could be noisy if agents
  are very active.
- **A:** Agent actions are shown but collapsed by default. A single line: "[User]'s agent modified 8 specs" with an expandable list. A toggle filter lets users show/hide agent activity. Individual agent tool calls are not shown — only the resulting spec modifications.

- **Q**: Should users receive email notifications for activity, or only in-app?
  Email is useful for users who aren't constantly in the app but can be
  overwhelming.
- **A:** In-app only at launch. The system is local-only and email infrastructure is not required. Email/webhook notifications are a Phase 3+ enhancement, configurable per user (opt-in, with digest options: immediate, daily summary, weekly summary).

---

## 8. Sharing & External Access

- **Q**: Should shared links allow anonymous (unauthenticated) access, or
  require the recipient to have an account? Anonymous access simplifies
  sharing with stakeholders but has security implications.
- **A:** Authentication is always required. No anonymous access. To view a shared spec, the recipient must have an account and be a member of the project (at minimum Viewer role). External stakeholders must be invited to the project.

- **Q**: Should shared specs include a "fork to my project" action that lets
  the recipient copy the spec into their own project?
- **A:** Yes, as a Phase 2 feature. Project members with at least Viewer access can fork a spec to another project they own. The forked spec is an independent copy with no ongoing link to the original.

- **Q**: Should there be a public gallery of shared specs/UIs that any user
  can browse? This could be a discovery mechanism but requires moderation.
- **A:** No. The system is private and project-scoped. No public gallery. Cross-project discovery happens through user membership in multiple projects. A "templates" concept (curated starter specs) could be introduced later.

- **Q**: How should shared content handle updates? If the source spec is
  updated after sharing, does the shared view show the latest version or
  the version at the time of sharing?
- **A:** Shared content always shows the latest pushed version. There is no snapshot sharing at launch. If a user wants to share a specific version, they can reference a git commit SHA in the share link (Phase 3+ feature).

---

## 9. Offline & Connectivity

- **Q**: How critical is offline support? Should it be a launch requirement or
  a future enhancement? Full offline support significantly increases
  complexity (conflict resolution, queue management, cache invalidation).
- **A:** Not a launch requirement. The system requires server connectivity for authentication, sync, and agent operations. However, because the knowledge graph is git-based and cloned locally, a user can read (but not edit via the UI) their local working copy offline using any text editor. In-app offline editing is a Phase 4+ enhancement.

- **Q**: Should the client use a local database (IndexedDB, SQLite) for offline
  spec caching, or rely entirely on the git working copy? A local database
  enables richer querying but duplicates data.
- **A:** Rely on the git working copy. No local database at launch. The client fetches spec data from the server API. The git working copy serves as the local data store for the server. Client-side caching is limited to standard HTTP caching (ETags, Cache-Control). IndexedDB caching is a Phase 4+ offline enhancement.

- **Q**: How should the app handle intermittent connectivity (frequent
  disconnects and reconnects)? Should there be a debounce period before
  showing the offline indicator?
- **A:** 5-second debounce before showing the offline indicator. WebSocket reconnection uses exponential backoff (1s, 2s, 4s, 8s, max 30s). During brief disconnects, the UI queues user actions locally and replays them on reconnect. If disconnected for more than 60 seconds, the UI shows a persistent offline banner and disables write operations.

---

## 10. Scalability

- **Q**: How many concurrent users per project should the system support? 5?
  20? 100? This affects the sync architecture, WebSocket connection limits,
  and notification volume.
- **A:** 20 concurrent users per project at launch. The system targets 20–50 total users across all projects. WebSocket connection limit: 100 concurrent connections server-wide. This is sufficient for the initial deployment.

- **Q**: Should the git repositories be hosted locally (same server) or on an
  external git hosting service (GitHub, GitLab)? External hosting simplifies
  some things (hosting, backup) but adds latency and API rate limits.
- **A:** Locally on the same server. Bare git repositories stored on the server's filesystem. This eliminates external dependencies, API rate limits, and latency. Backups are handled by the server backup strategy (database + git repos). External hosting (GitHub mirror) is a Phase 3+ enhancement for redundancy.

- **Q**: How large can a knowledge graph get before sync performance degrades?
  Should there be limits on project size (number of specs, total content
  size)? At what point should the sync strategy change?
- **A:** Practical limits: ~1,000 specs per project, ~500 MB total repo size. Beyond this, git operations (clone, fetch, diff) may become noticeably slow. The system should display warnings at 80% of these thresholds. Performance optimization (shallow clones, sparse checkouts) can be introduced if users approach these limits. No hard block.

---

## Decision Log

> Record decisions as questions are resolved.

| Date | Question | Decision | Rationale |
| ---- | -------- | -------- | --------- |
| —    | —        | —        | —         |
