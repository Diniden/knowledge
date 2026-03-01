# 10 — COLLABORATION PLAN

> **Purpose**: Define the complete multi-user collaboration system including
> git-based synchronization, async conflict resolution, multi-user project
> management, spec collaboration workflows, dialog collaboration, agent
> coordination, communication features, and sharing mechanisms.
>
> **Phase**: 4 (Advanced Features)
> **Dependencies**: `03-SERVER/05-GIT-INTEGRATION-PLAN.md`, `04-KNOWLEDGE-GRAPH/03-VERSION-CONTROL-PLAN.md`, `09-SECURITY/PLAN.md`
> **Estimated tasks**: 125+

---

## Table of Contents

1. [Git-Based Synchronization Workflow](#1-git-based-synchronization-workflow)
2. [Async Collaboration Model](#2-async-collaboration-model)
3. [Multi-User Project Management](#3-multi-user-project-management)
4. [Spec Collaboration](#4-spec-collaboration)
5. [Dialog Collaboration](#5-dialog-collaboration)
6. [Agent Collaboration](#6-agent-collaboration)
7. [Communication Features](#7-communication-features)
8. [Sharing Features](#8-sharing-features)
9. [Presence & Awareness](#9-presence--awareness)
10. [Offline Support](#10-offline-support)

---

## 1. Git-Based Synchronization Workflow

### 1.1 Repository Initialization

- [ ] **COL-GS-001**: Implement project repository initialization
  - When a new project is created, initialize a bare git repository on the server
  - Set up the repository with initial commit (README, `.kg-config.json`, empty directories)
  - Configure the default branch name (`main`)
  - Store the repository path in the project database record
- [ ] **COL-GS-002**: Implement user clone on project join
  - When a user joins a project, clone the server repository to a user-specific working directory
  - Working directory path: `data/repos/{user_id}/{project_id}/`
  - Clone is a full clone (all history) for offline capability
  - Configure git user identity for the clone (user's display name and email)
- [ ] **COL-GS-003**: Implement repository path management service
  - `RepoPathService` in `server/src/modules/git/`
  - `getServerRepoPath(projectId: string): string` — path to the bare repo
  - `getUserRepoPath(userId: string, projectId: string): string` — path to user's working copy
  - `ensureRepoExists(path: string): Promise<void>` — create if missing
  - Handle disk space considerations and cleanup

### 1.2 Pull Workflow (Fetch + Merge)

- [ ] **COL-GS-004**: Implement pull service method
  - `GitSyncService.pull(userId: string, projectId: string): Promise<PullResult>`
  - Step 1: `git fetch origin` — download new commits from server repo
  - Step 2: `git merge origin/main` — merge remote changes into local branch
  - Return: `{ status: 'up-to-date' | 'merged' | 'conflict', changedFiles: string[], conflicts: ConflictInfo[] }`
- [ ] **COL-GS-005**: Implement fast-forward merge detection
  - If the user has no local commits ahead of remote, fast-forward merge
  - No merge commit created; pointer simply moves forward
  - Return `status: 'merged'` with list of changed files
- [ ] **COL-GS-006**: Implement three-way merge for diverged branches
  - If both user and remote have new commits, perform three-way merge
  - Use `git merge --no-edit` for automatic merge when possible
  - If auto-merge succeeds, create a merge commit
  - If conflicts occur, leave working directory in conflicted state
- [ ] **COL-GS-007**: Implement JSON-aware merge strategy
  - Register a custom merge driver for `.json` files in `.gitattributes`
  - JSON merge driver: parse both versions as JSON, merge at field level
  - For spec.json: merge non-conflicting field changes automatically
  - For edge files: if same edge modified, flag as conflict
  - Fall back to standard text merge if JSON parsing fails
- [ ] **COL-GS-008**: Implement Markdown merge strategy
  - For content.md: use standard text merge (line-based)
  - Spec-level granularity helps: each spec's content is a separate file
  - Conflicts in Markdown content are presented as text conflicts
  - User resolves in the spec editor or conflict resolution UI

### 1.3 Push Workflow

- [ ] **COL-GS-009**: Implement push service method
  - `GitSyncService.push(userId: string, projectId: string): Promise<PushResult>`
  - Step 1: Verify user has committed changes (no dirty working directory)
  - Step 2: `git push origin main` — push to server repository
  - Return: `{ status: 'pushed' | 'rejected', rejectionReason?: string }`
- [ ] **COL-GS-010**: Handle push rejection due to remote changes
  - If push is rejected (remote has new commits), return `status: 'rejected'`
  - Client should pull first, resolve any conflicts, then retry push
  - Implement automatic pull-before-push option (configurable)
- [ ] **COL-GS-011**: Implement push hooks for post-push actions
  - After successful push, trigger: RAG re-indexing for changed specs
  - After successful push, trigger: notification to other users in the project
  - After successful push, trigger: agent graph crawl if specs were modified
  - Hooks are async (do not block the push response)

### 1.4 Commit Strategy

- [ ] **COL-GS-012**: Implement auto-commit on spec save
  - When a user saves a spec, auto-commit the changed files
  - Commit message format: `Update spec: {spec_title} [{spec_id}]`
  - Include all related files: `spec.json`, `content.md`, `metadata.json`
  - Group changes to multiple specs in a single save into one commit
- [ ] **COL-GS-013**: Implement commit metadata
  - Git author: user's display name and email
  - Git committer: system service identity (for server-initiated commits)
  - Commit message includes: action type, affected spec IDs, user ID
  - Structured commit message for machine parsing: `[action:update] [spec:{id}] {description}`
- [ ] **COL-GS-014**: Implement batch commit for bulk operations
  - When multiple specs are modified in a single operation (agent batch, import)
  - Create a single commit with all changes
  - Commit message lists all affected specs

### 1.5 Branch Strategy

- [ ] **COL-GS-015**: Define default branch strategy
  - All users work on `main` branch by default (simplest model)
  - Branching available for experimental changes or feature work
  - Branch naming: `{username}/{branch-name}` (e.g., `alice/experiment-auth-redesign`)
- [ ] **COL-GS-016**: Implement branch creation
  - `GitSyncService.createBranch(userId, projectId, branchName): Promise<void>`
  - Create branch from current HEAD on the user's working copy
  - Push branch to server repository
  - Validate branch name (no spaces, no reserved names)
- [ ] **COL-GS-017**: Implement branch switching
  - `GitSyncService.switchBranch(userId, projectId, branchName): Promise<void>`
  - Verify working directory is clean (committed or stashed)
  - `git checkout {branchName}`
  - Update the user's active branch in the database
- [ ] **COL-GS-018**: Implement branch merging
  - `GitSyncService.mergeBranch(userId, projectId, sourceBranch, targetBranch): Promise<MergeResult>`
  - Checkout target branch, merge source branch
  - Handle conflicts the same as pull conflicts
  - After successful merge, push to server repository
- [ ] **COL-GS-019**: Implement branch deletion
  - `GitSyncService.deleteBranch(userId, projectId, branchName): Promise<void>`
  - Delete local and remote branch
  - Prevent deletion of `main` branch
  - Warn if branch has unmerged commits

#### Design Decisions

> **Q**: Should the default sync model be manual (user clicks "sync"), periodic (every N minutes), or event-driven (push notification triggers pull)?
> **A**: Hybrid per the PRD: manual pull/push triggered by the user, combined with a 60-second background fetch that checks for remote changes. The background fetch does NOT auto-merge — it updates a "changes available" indicator in the UI. The user explicitly clicks "Pull" to incorporate remote changes. Push is always manual.

> **Q**: Should "sync" be a single action (pull + push) or should pull and push be separate user actions?
> **A**: Separate actions. "Pull" and "Push" are distinct buttons. A combined "Sync" button can be offered as a convenience shortcut (pull then push), but the separate actions must remain available. This gives users control and makes conflict resolution clearer (pull first, resolve, then push).

> **Q**: When auto-sync detects remote changes, should it automatically merge them into the user's working copy, or stage them for review?
> **A**: Stage for review. The 60-second background fetch only updates the remote tracking refs (`git fetch`). A badge/indicator shows "N changes available." The user chooses when to pull. This avoids surprise mutations to the working copy.

> **Q**: Should there be a "sync preview" that shows what will change before pulling?
> **A**: Yes. Clicking the "changes available" indicator shows a preview panel listing changed specs (added/modified/deleted) with abbreviated diffs. The user can then confirm the pull or defer it.

> **Q**: Should the collaboration model use branches at all, or should all users work directly on `main`?
> **A**: All users work on `main` at launch. Branching adds significant UX complexity for a knowledge management tool. The async pull/push model with advisory locks is sufficient for 20–50 users. Feature branches for the knowledge graph are a Phase 4+ consideration.

> **Q**: If branches are supported, should each user automatically get their own branch, or should branching be explicit and optional?
> **A**: N/A at launch (no branching). If branches are added later, they should be explicit and optional — created by the user for a specific purpose, not auto-generated.

> **Q**: How should the UI expose branches to non-technical users?
> **A**: N/A at launch. If branches are introduced, they should be abstracted as "Drafts" — a user-friendly concept that hides git terminology. The UI would show "Create a draft," "Merge draft into main," etc.

> **Q**: Should there be branch protection rules (e.g., require review before merging to main)?
> **A**: N/A at launch. If branches are added, optional branch protection (require at least one approval before merge) can be a project-level setting, disabled by default.

> **Q**: Should we implement custom JSON merge drivers for spec files, or rely on standard text-based git merge?
> **A**: Custom JSON merge driver for `spec.json` metadata files. These have a well-defined schema and field-level merging is straightforward. Markdown content files use standard text-based merge. This is a good investment because `spec.json` conflicts are the most common false positives.

> **Q**: How should merge conflicts in knowledge graph index files be handled?
> **A**: Regenerated after merge. Index files (graph adjacency, search indices) are derived data and should be in `.gitignore` or rebuilt by the server on startup/pull. Never merge index files — always regenerate.

> **Q**: Should the system attempt to auto-resolve "trivial" conflicts (e.g., two users added different tags to the same spec)?
> **A**: Auto-resolve trivial conflicts in `spec.json` via the custom merge driver (e.g., union-merge for arrays like tags, last-writer-wins for scalar fields like status with a notification). Markdown content conflicts always require human resolution — content intent cannot be safely inferred.

---

## 2. Async Collaboration Model

### 2.1 Optimistic Local Changes

- [ ] **COL-AC-001**: Implement optimistic save strategy
  - User edits are saved to the local working copy immediately
  - Commits happen instantly (no server round-trip required for save)
  - Push to server is a separate explicit action (or periodic)
  - User can work offline; changes queue for push when connected
- [ ] **COL-AC-002**: Implement local change tracking
  - Track which specs have uncommitted changes (dirty state)
  - Track which committed changes have not been pushed
  - Display indicators in the UI: "3 unpushed changes"
  - Track change timestamps for chronological ordering
- [ ] **COL-AC-003**: Implement change queue for offline support
  - Store uncommitted changes in a queue (in-memory + persisted to disk)
  - When connection is restored, commit and push queued changes
  - Handle conflicts that arise from queued changes vs. remote changes

### 2.2 Sync Triggers

- [ ] **COL-AC-004**: Implement manual sync (pull/push buttons)
  - "Sync" button in the UI triggers: pull → resolve conflicts → push
  - Separate "Pull" and "Push" buttons for advanced users
  - Show sync progress (fetching, merging, pushing)
- [ ] **COL-AC-005**: Implement periodic auto-sync
  - Configurable interval: default 5 minutes (adjustable 1–60 minutes)
  - Auto-sync performs: pull in background
  - If conflicts detected, pause auto-sync and notify user
  - Auto-push after auto-pull if no conflicts (configurable: on/off)
- [ ] **COL-AC-006**: Implement WebSocket-triggered sync notification
  - Server broadcasts to project members when a push is received
  - WebSocket message: `{ type: 'sync-available', projectId, pushedBy, changedSpecs: [...] }`
  - Client shows a notification: "Alice pushed 3 changes. Pull now?"
  - User can click to pull, or wait for auto-sync

### 2.3 Conflict Notification

- [ ] **COL-AC-007**: Implement conflict detection notification
  - When a pull results in merge conflicts, notify the user immediately
  - Notification includes: list of conflicted files, who made the conflicting changes
  - Block push until all conflicts are resolved
  - Show conflict count in the UI header
- [ ] **COL-AC-008**: Implement conflict resolution tracking
  - Track which conflicts have been resolved and by whom
  - Store resolution decisions: "took mine", "took theirs", "manual merge"
  - Allow undo of conflict resolution before committing

---

## 3. Multi-User Project Management

### 3.1 User Invitation

- [ ] **COL-PM-001**: Implement project invitation endpoint
  - `POST /api/projects/:id/invite` — invite a user by email or username
  - Body: `{ identifier: string, role: ProjectRole }`
  - Create a `project_invitations` record: (project_id, invitee_email, role, invited_by, token, expires_at)
  - Send invitation email with accept link (containing token)
- [ ] **COL-PM-002**: Implement invitation acceptance endpoint
  - `POST /api/projects/accept-invite` — accept via token
  - Validate token, check expiration (7 days)
  - Create `project_members` record
  - Clone the project repository for the new user
  - Redirect user to the project view
- [ ] **COL-PM-003**: Implement invitation management
  - `GET /api/projects/:id/invitations` — list pending invitations
  - `DELETE /api/projects/:id/invitations/:invitationId` — cancel invitation
  - `POST /api/projects/:id/invitations/:invitationId/resend` — resend email
  - Only owners and editors can manage invitations

### 3.2 User Removal

- [ ] **COL-PM-004**: Implement user removal from project
  - `DELETE /api/projects/:id/members/:userId` — remove a member
  - Only owners can remove members
  - Owners cannot remove themselves (must transfer ownership first)
  - Revoke all spec-level permission grants for the removed user
  - Clean up the user's working copy of the repository
- [ ] **COL-PM-005**: Implement user self-removal (leave project)
  - `POST /api/projects/:id/leave` — user voluntarily leaves
  - Owners cannot leave without transferring ownership
  - Clean up working copy and permission grants
  - Notify project owner of departure
- [ ] **COL-PM-006**: Implement ownership transfer
  - `POST /api/projects/:id/transfer-ownership` — transfer to another member
  - Body: `{ newOwnerId: string }`
  - Current owner becomes editor, new owner becomes owner
  - Requires confirmation from both parties (or just current owner)

### 3.3 Role Management

- [ ] **COL-PM-007**: Implement role change endpoint
  - `PATCH /api/projects/:id/members/:userId` — change a member's role
  - Body: `{ role: ProjectRole }`
  - Only owners can change roles
  - Validate: cannot change own role (use transfer-ownership for that)
  - Log role changes in audit log
- [ ] **COL-PM-008**: Implement project member listing
  - `GET /api/projects/:id/members` — list all project members
  - Return: user info, role, join date, last active date
  - Include pending invitations (separate section)
  - Sortable by role, name, activity

### 3.4 Project Settings

- [ ] **COL-PM-009**: Implement project settings management
  - `GET /api/projects/:id/settings` — get project settings
  - `PATCH /api/projects/:id/settings` — update settings
  - Settings include: auto-sync interval, default permission level, branch strategy
  - Only owners can modify settings
- [ ] **COL-PM-010**: Implement project deletion
  - `DELETE /api/projects/:id` — delete a project
  - Only the owner can delete
  - Requires confirmation (type project name to confirm)
  - Soft delete: mark as deleted, retain data for 30 days
  - Hard delete: remove all data (repository, database records, working copies)
- [ ] **COL-PM-011**: Implement project archival
  - `POST /api/projects/:id/archive` — archive a project
  - Archived projects are read-only (no edits, no sync)
  - Can be unarchived by the owner
  - Archived projects do not count toward user's project limit (if any)

#### Design Decisions

> **Q**: Should a user be able to belong to multiple projects simultaneously? If so, is there a maximum number of projects per user?
> **A**: Yes, users can belong to multiple projects. No hard maximum at launch. A practical soft limit of 20 projects per user is enforced with a warning, not a block. This prevents UI clutter and performance issues.

> **Q**: Should projects support sub-teams or groups within a project?
> **A**: Not at launch. With 20–50 total users, per-user permissions are manageable. Groups/teams are a Phase 3+ enhancement if projects grow beyond ~15 members each.

> **Q**: Should project creation be open to all users, or restricted to admins?
> **A**: Open to all authenticated users at launch. Any user can create a project and becomes its Owner. The instance admin can disable this via a server config flag if they want to restrict project creation to admins only.

> **Q**: Are three project roles (Owner, Editor, Viewer) sufficient? Should there be a "Commenter" role or a "Manager" role?
> **A**: Three roles are sufficient at launch: Owner, Editor, Viewer. Commenting is allowed for all roles (Viewers can comment but not edit spec content). A "Manager" role is deferred — Owners handle user management for now.

> **Q**: Should role changes take effect immediately or require re-authentication?
> **A**: Immediate effect. The permission check happens on every API request against the database, not against the JWT claims. This means role changes are enforced on the next request without re-authentication. If a user is demoted mid-session, their next write attempt is rejected with a clear error message.

> **Q**: How should permission propagation work when a new user joins a project with existing private/encrypted specs?
> **A**: New members get SUMMARY access to encrypted specs by default (they see title, status, tags). FULL access to encrypted content requires explicit token sharing by the spec owner. This aligns with the PRD: no user has "no access" — always at least a summary. Tokens are server-managed and must be deliberately shared.

---

## 4. Spec Collaboration

### 4.1 Change Indicators

- [ ] **COL-SC-001**: Implement spec modification tracking
  - Track who last modified each spec and when
  - Store in `metadata.json`: `lastModifiedBy`, `lastModifiedAt`
  - Also stored in database for fast querying without git history
  - Update on every save/commit
- [ ] **COL-SC-002**: Implement spec modification indicator in UI
  - Show "Modified by Alice, 2 hours ago" under spec title
  - Show user avatar next to recently modified specs in the graph view
  - Color-code modifications by user (optional preference)
- [ ] **COL-SC-003**: Implement modification timeline per spec
  - Show a timeline of all modifications to a spec
  - Each entry: user, timestamp, summary of changes (lines added/removed)
  - Clickable to view the diff for that modification
  - Uses git log for the spec's files

### 4.2 Real-Time Update Notifications

- [ ] **COL-SC-004**: Implement spec change notification via WebSocket
  - When a user pushes changes, server identifies affected specs
  - Broadcast to users currently viewing those specs: `{ type: 'spec-changed', specId, changedBy, summary }`
  - Client shows an inline notification: "Alice updated this spec. Refresh to see changes."
  - User can click to pull and refresh, or dismiss
- [ ] **COL-SC-005**: Implement "currently viewing" indicator
  - Track which users are currently viewing each spec (via WebSocket heartbeat)
  - Show avatar badges on the spec in the graph view
  - Show "Alice is viewing this spec" in the spec editor header
  - Update in real-time as users navigate
- [ ] **COL-SC-006**: Implement "currently editing" indicator
  - Track which users have unsaved changes to a spec
  - Show "Alice is editing this spec" warning before editing
  - Does not lock the spec (async model allows concurrent edits)
  - Warns that a merge may be needed after both save

### 4.3 Diff Presentation for Incoming Changes

- [ ] **COL-SC-007**: Implement incoming change diff preview
  - When a "spec changed" notification arrives, user can preview the diff
  - Show the diff using the light indication style (from Version Control UI plan)
  - If the user has local unsaved changes, show a three-way diff
  - Actions: "Accept remote", "Keep mine", "Merge manually"
- [ ] **COL-SC-008**: Implement change acceptance flow
  - "Accept remote": discard local changes, load the remote version
  - "Keep mine": continue editing, mark remote changes as acknowledged
  - "Merge manually": open the conflict resolution UI with both versions
  - Track the user's decision for audit purposes

#### Design Decisions

> **Q**: Since the collaboration model is async (git-based), what happens when two users are editing the same spec at the same time?
> **A**: Proactive warning via advisory locks. When User A opens a spec for editing, User B sees "Alice is editing this spec" immediately. User B can still edit (advisory, not blocking), but they are warned that a conflict is likely. The conflict is resolved at pull/push time.

> **Q**: Should there be a "lock spec for editing" feature that temporarily prevents others from editing?
> **A**: Advisory locks only, per the PRD. No hard locks. Users are warned but never blocked from editing. Hard locks in an async system lead to stale locks and frustration. The advisory lock + conflict resolution flow is sufficient.

> **Q**: Should the system attempt operational transformation (OT) or CRDT-based real-time co-editing for specs?
> **A**: No. Per the PRD, no real-time co-editing. The system is git-based async with advisory locks. OT/CRDT would fundamentally change the architecture, add enormous complexity, and conflict with the git-as-source-of-truth model. Real-time co-editing is explicitly out of scope.

> **Q**: How should changes to a spec be communicated to other users?
> **A**: Only when pushed. Local commits are private to the user's machine until pushed. When a push occurs, the server broadcasts a notification via WebSocket to all online project members: "[User] updated [spec name]." Offline users see the notification on their next login.

> **Q**: Should notifications include the full diff, a summary, or just "Spec X was updated"?
> **A**: Summary notification: "[User] updated [spec name] — [commit message or first line of change]." Users can click the notification to see the full diff in the spec's history view. This balances signal-to-noise.

> **Q**: Should users be able to "subscribe" to specific specs for notifications, or are notifications automatic for all specs they've viewed?
> **A**: Subscription-based. Users explicitly "watch" specs they care about (star/bell icon). By default, users are auto-subscribed to specs they create or edit. Unwatching is always available. Project-wide activity is visible in an activity feed but doesn't generate individual notifications.

---

## 5. Dialog Collaboration

### 5.1 Per-User Dialog Persistence

- [ ] **COL-DC-001**: Implement per-user dialog storage
  - Each user has their own dialog history per project
  - Store in database: `dialog_messages` (id, user_id, project_id, session_id, role, content, timestamp, metadata)
  - Dialogs are NOT stored in the git repository (separate from knowledge content)
  - Retain dialog history for 90 days by default (configurable)
- [ ] **COL-DC-002**: Implement dialog session management
  - A dialog session groups related messages (one conversation thread)
  - Users can have multiple sessions (tabs, different topics)
  - Session: (id, user_id, project_id, title, created_at, last_message_at, status)
  - Status: `active`, `archived`, `deleted`
- [ ] **COL-DC-003**: Implement dialog history API
  - `GET /api/projects/:id/dialogs` — list user's dialog sessions
  - `GET /api/projects/:id/dialogs/:sessionId/messages` — get messages for a session
  - Pagination: cursor-based, newest first
  - Filter by: date range, search text
- [ ] **COL-DC-004**: Implement dialog archival
  - Users can archive old dialog sessions
  - Archived sessions are read-only but still searchable
  - Bulk archive: archive all sessions older than N days

### 5.2 Dialog Forking

- [ ] **COL-DC-005**: Implement dialog visibility settings
  - Dialog sessions have a visibility flag: `private` (default) or `shared`
  - Private: only the owning user can see it
  - Shared: all project members can view it (but only the owner can continue it)
- [ ] **COL-DC-006**: Implement dialog forking mechanism
  - "Fork dialog" action: creates a new dialog session for the forking user
  - The forked session copies all messages from the source session up to the fork point
  - The forking user can continue the conversation independently from the fork point
  - Source dialog is unaffected
  - Store fork metadata: `forked_from_session_id`, `forked_at_message_id`
- [ ] **COL-DC-007**: Implement dialog fork API
  - `POST /api/projects/:id/dialogs/:sessionId/fork`
  - Body: `{ forkAtMessageId?: string }` — fork from a specific message (default: latest)
  - Returns the new session ID
  - Only shared sessions can be forked by other users
- [ ] **COL-DC-008**: Implement dialog fork UI
  - "Fork this conversation" button on shared dialog sessions
  - Fork point selector: click on any message to fork from that point
  - Show fork lineage: "Forked from Alice's session at message #15"
  - Fork tree visualization (optional): show how dialogs have branched

### 5.3 Dialog Browsing

- [ ] **COL-DC-009**: Implement shared dialog browser
  - Panel showing all shared dialog sessions in the project
  - Sort by: recent activity, user, title
  - Preview: first and last few messages of each session
  - Click to view full dialog (read-only unless you're the owner)
- [ ] **COL-DC-010**: Implement dialog search
  - Full-text search across dialog messages
  - Search scope: user's own sessions, shared sessions, or both
  - Results show message snippet with highlighting
  - Click result to navigate to the message in context
- [ ] **COL-DC-011**: Implement dialog bookmarking
  - Users can bookmark specific messages in any session (own or shared)
  - Bookmarks are per-user, private
  - View bookmarks in a dedicated panel
  - Bookmarks include optional notes

#### Design Decisions

> **Q**: Should dialog sessions be private by default or shared by default?
> **A**: Private by default, per the PRD. Dialogs are per-user. A user can explicitly share a dialog session (read-only link to project members). Shared dialogs appear in a "Shared Dialogs" section of the project sidebar.

> **Q**: When a user forks another user's dialog, should the forked messages be copies (independent) or references?
> **A**: Independent copies. Per the PRD, dialogs are forkable. A fork creates a complete copy of the conversation up to the fork point. Changes to the original do not propagate to the fork, and vice versa. This is simple, predictable, and avoids confusion.

> **Q**: Should there be a concept of "team dialog sessions" where multiple users can contribute messages to the same session in real-time?
> **A**: No team dialog sessions. Collaboration is async via forking, per the PRD. One user per dialog session. If multiple users want to build on each other's work, they fork and continue independently. This keeps the agent context clean and avoids real-time co-editing complexity.

> **Q**: Should agents have access to other users' shared dialog sessions for context?
> **A**: No. Agent sessions are local to the machine, per the PRD. Agents only see dialogs from the user who initiated the session. Shared dialogs are for human consumption only.

> **Q**: How long should dialog history be retained?
> **A**: Forever (no automatic expiration). Dialog history is stored in PostgreSQL and is relatively compact (text). Users can manually delete their own dialogs. Storage impact is minimal for 20–50 users. Automatic archival/cleanup can be added if storage becomes a concern.

> **Q**: Should dialog sessions be exportable (as Markdown, PDF, or JSON)?
> **A**: Yes, exportable as Markdown and JSON. Markdown for human readability; JSON for machine processing and re-import. PDF export is deferred (requires a rendering pipeline). Export is available from the dialog session menu.

> **Q**: Should important dialog exchanges be convertible to spec content directly?
> **A**: Yes. A "Save as Spec" action on a dialog session (or a selected range of messages) creates a new spec draft pre-populated with the selected content, formatted as Markdown. The user can edit before saving. This bridges the gap between exploration (dialog) and documentation (spec).

---

## 6. Agent Collaboration

### 6.1 Agent Sessions Per User

- [ ] **COL-AG-001**: Implement per-user agent session isolation
  - Each user's agent sessions are independent
  - Agent sessions operate on the user's working copy of the repository
  - Agent changes are committed to the user's local branch
  - Changes are pushed when the user pushes
- [ ] **COL-AG-002**: Implement agent session awareness of user context
  - Agent session includes: current user ID, project ID, active branch
  - Agent's MCP tool calls are scoped to the user's permissions
  - Agent can read from the user's local working copy (may differ from server)
- [ ] **COL-AG-003**: Implement agent session listing per project
  - `GET /api/projects/:id/agent-sessions` — list all active agent sessions in the project
  - Show: user, session status, current task description
  - Visible to all project members (awareness feature)

### 6.2 Agent Awareness of Other Users' Changes

- [ ] **COL-AG-004**: Implement agent change awareness context
  - Before an agent starts a task, inject context about recent changes by other users
  - "Since your last session, Alice modified Spec X, Bob created Spec Y"
  - Use git log to determine changes since the user's last agent session
  - Include in the agent's system prompt or context assembly
- [ ] **COL-AG-005**: Implement agent notification of relevant changes
  - If an agent is working and a remote push arrives that affects related specs
  - Notify the agent's session: "Remote changes detected in related specs"
  - Agent can decide to pause, incorporate changes, or continue with existing context
  - Configurable behavior: pause-and-notify, auto-incorporate, ignore
- [ ] **COL-AG-006**: Implement agent change summary generation
  - Agent can be asked to summarize recent changes by other users
  - Uses git diff + RAG context to produce a natural language summary
  - "Alice has been working on authentication specs. She added 3 new specs about JWT tokens and updated the permissions model."

### 6.3 Agent Conflict Prevention

- [ ] **COL-AG-007**: Implement advisory spec locking during agent operations
  - When an agent starts modifying a spec, set an advisory lock
  - Lock stored in database: (spec_id, locked_by_user_id, locked_at, lock_type: 'agent')
  - Other users see: "Alice's agent is modifying this spec" — warning but not blocking
  - Lock auto-expires after agent session timeout (5 minutes)
- [ ] **COL-AG-008**: Implement concurrent agent detection
  - Before an agent modifies a spec, check for existing locks
  - If another agent is modifying the same spec, warn the user
  - Options: wait for the other agent, proceed anyway (risk conflict), cancel
- [ ] **COL-AG-009**: Implement agent operation journaling
  - Log every spec modification by an agent: spec_id, before_hash, after_hash, timestamp
  - If a conflict arises during push, the journal helps resolve it
  - Journal is per-session, stored in the database
- [ ] **COL-AG-010**: Implement agent rollback on conflict
  - If an agent's push is rejected due to conflicts
  - Option 1: revert agent changes, pull remote, re-execute agent task
  - Option 2: attempt automatic merge of agent changes with remote changes
  - User chooses the strategy before agent execution

#### Design Decisions

> **Q**: Should agents be aware of other active agent sessions in the project? If two users are running agents that modify related specs simultaneously, should the system prevent this?
> **A**: Agents are aware of advisory locks. When an agent session starts modifying a spec, it acquires an advisory lock (attributed to the user). Other agents (and users) see the lock. The system does not prevent concurrent agent operations but warns about potential conflicts. Conflict resolution follows the same flow as human conflicts.

> **Q**: Should there be a shared "agent workspace" where agent results are visible to all project members?
> **A**: Agent outputs are private to the requesting user until pushed, per the PRD (agent sessions local to machine). The user reviews agent-generated changes, commits, and pushes when satisfied. No shared agent workspace.

> **Q**: Should agents be able to delegate tasks to other agents?
> **A**: No inter-agent delegation. If User A's agent identifies a dependency on User B's specs, the agent reports this to User A, who communicates with User B through normal collaboration channels. Agent sessions are isolated per user per machine.

> **Q**: How should agent-generated changes be distinguished from human changes in the git history?
> **A**: Agent-generated commits use a distinct author identity: `"[username]-agent" <username+agent@botnet.local>`. This makes agent commits immediately identifiable in git log without special tooling. The commit message includes a `[agent]` prefix tag.

> **Q**: Should advisory locks during agent operations be visible to other users' agents, or only to human users?
> **A**: Visible to both humans and agents. When an agent encounters a lock held by another user/agent, it skips that spec and reports it as "skipped — locked by [user]" in its execution log. The agent continues with non-locked specs rather than waiting.

> **Q**: What is the maximum number of concurrent agent sessions per project?
> **A**: Maximum 3 concurrent agent sessions per project at launch. This prevents resource contention on a single server targeting 20–50 users. The limit is configurable via env var (`MAX_AGENT_SESSIONS_PER_PROJECT`). Per-user limit: 1 agent session at a time.

> **Q**: Should there be a concept of "agent priority" — e.g., a graph crawl initiated by the project owner takes priority over individual user agents?
> **A**: No priority system. First-come, first-served for advisory locks. All agents are equal regardless of the initiating user's role. If the concurrent session limit is reached, new agent sessions are queued with an estimated wait time shown to the user.

---

## 7. Communication Features

### 7.1 Comments on Specs

- [ ] **COL-CM-001**: Implement spec comment model
  - Table: `spec_comments` (id, spec_id, user_id, content, created_at, updated_at, parent_id)
  - Support threaded comments (parent_id for replies)
  - Comments are stored in the database (not in git)
  - Markdown support in comment content
- [ ] **COL-CM-002**: Implement spec comment API
  - `POST /api/specs/:id/comments` — create a comment
  - `GET /api/specs/:id/comments` — list comments (threaded)
  - `PATCH /api/specs/:id/comments/:commentId` — edit own comment
  - `DELETE /api/specs/:id/comments/:commentId` — delete own comment (or admin)
  - Pagination for top-level comments; load replies on demand
- [ ] **COL-CM-003**: Implement comment notifications
  - Notify spec watchers when a new comment is posted
  - Notify parent comment author when a reply is posted
  - Notification via WebSocket (real-time) and email (batch digest)
- [ ] **COL-CM-004**: Implement comment resolution
  - Comments can be "resolved" (like GitHub PR review comments)
  - Resolved comments are collapsed by default
  - Only comment author or spec owner can resolve
  - Resolved comments can be reopened

### 7.2 @Mentions

- [ ] **COL-CM-005**: Implement @mention parsing in dialog messages
  - Detect `@username` patterns in message text
  - Validate that the mentioned user is a project member
  - Store mention metadata: (message_id, mentioned_user_id)
  - Render mentions as clickable links in the UI
- [ ] **COL-CM-006**: Implement @mention in spec comments
  - Same parsing and validation as dialog mentions
  - Trigger notification to the mentioned user
  - Notification includes: who mentioned them, where, message snippet
- [ ] **COL-CM-007**: Implement @mention autocomplete
  - As user types `@`, show dropdown of project members
  - Filter by partial name match
  - Include user avatar and role
  - Keyboard navigable (arrow keys + Enter)

### 7.3 Activity Feed

- [ ] **COL-CM-008**: Implement project activity feed
  - Aggregated stream of all project events
  - Event types: spec created/updated/deleted, user joined/left, comment posted, agent session completed, sync event
  - Stored in `activity_events` table: (id, project_id, user_id, event_type, event_data, timestamp)
- [ ] **COL-CM-009**: Implement activity feed API
  - `GET /api/projects/:id/activity` — paginated activity feed
  - Filter by: event type, user, date range
  - Cursor-based pagination (newest first)
  - Real-time updates via WebSocket for new events
- [ ] **COL-CM-010**: Implement activity feed UI
  - Panel in the project dashboard
  - Rich rendering per event type (icon, description, link to affected resource)
  - Grouping: "Alice updated 5 specs" instead of 5 individual entries
  - Mark as read/unread per user
- [ ] **COL-CM-011**: Implement per-user notification preferences
  - Settings per project: which event types trigger notifications
  - Channels: in-app (WebSocket), email digest (daily/weekly), none
  - Per-spec watch/unwatch to control notifications for specific specs
  - Global mute option (vacation mode)

#### Design Decisions

> **Q**: Should comments be stored per spec or per spec version?
> **A**: Per spec (not per version). Comments are attached to the spec entity and persist across versions. A comment can optionally reference a specific version (git commit SHA) for context, but it remains visible regardless of spec updates. This avoids orphaned comments.

> **Q**: Should comments support rich text (Markdown, images, code blocks) or plain text only?
> **A**: Markdown comments (same renderer as spec content, with the same sanitization). Code blocks, bold, italic, lists, and inline links are supported. Image embedding in comments is deferred — users can reference spec images by path.

> **Q**: Should there be a distinction between "review comments" and "discussion comments"?
> **A**: No distinction at launch. All comments are discussion comments. Formal review workflows (approve/request changes) are a Phase 4+ feature, potentially tied to branch/merge workflows if those are introduced.

> **Q**: Should resolved comments be permanently hidden or just collapsed?
> **A**: Collapsed. Resolved comments are minimized to a single line ("[User] resolved a comment — click to expand"). They can be re-opened if the discussion needs to continue. A filter toggle shows/hides resolved comments.

> **Q**: How granular should the activity feed be?
> **A**: Batched. The activity feed groups events by user + spec + time window (1 hour). "Alice edited Spec X (5 changes)" with an expandable detail view. Push events, membership changes, and comments are shown individually (not batched). This keeps the feed readable.

> **Q**: Should the activity feed show agent actions alongside human actions?
> **A**: Agent actions are shown but collapsed by default. A single line: "[User]'s agent modified 8 specs" with an expandable list. A toggle filter lets users show/hide agent activity. Individual agent tool calls are not shown — only the resulting spec modifications.

> **Q**: Should users receive email notifications for activity, or only in-app?
> **A**: In-app only at launch. The system is local-only and email infrastructure is not required. Email/webhook notifications are a Phase 3+ enhancement, configurable per user (opt-in, with digest options: immediate, daily summary, weekly summary).

---

## 8. Sharing Features

### 8.1 Spec Sharing

- [ ] **COL-SH-001**: Implement spec sharing via permission token
  - Integration with encryption token system from Security plan
  - Share a private spec with a non-project-member via a revocable link
  - Link includes: spec ID + sharing token (signed, expirable)
  - Recipient can view the spec without joining the project
- [ ] **COL-SH-002**: Implement shareable spec link generation
  - `POST /api/specs/:id/share-link` — generate a shareable link
  - Options: expiration (1 hour, 1 day, 7 days, never), permission level (FULL, SUMMARY)
  - Return: URL with embedded token
  - Store in `share_links` table: (id, spec_id, token, permission, created_by, expires_at, access_count)
- [ ] **COL-SH-003**: Implement share link access endpoint
  - `GET /api/share/:token` — access a shared resource via token
  - Validate token, check expiration
  - Return spec data according to the share link's permission level
  - Increment access count
  - Optionally require authentication (or allow anonymous)
- [ ] **COL-SH-004**: Implement share link management
  - `GET /api/specs/:id/share-links` — list active share links
  - `DELETE /api/specs/:id/share-links/:linkId` — revoke a share link
  - Show access count and last accessed timestamp
  - Only spec owner or FULL access holders can manage

### 8.2 Generated UI Sharing

- [ ] **COL-SH-005**: Implement generated UI sharing
  - Share a generated UI view with others (project members or external)
  - Generate a standalone URL that serves the generated UI in read-only mode
  - Include CSP and sandbox protections for shared UI views
- [ ] **COL-SH-006**: Implement generated UI embed code
  - Provide an iframe embed code for generated UIs
  - Embed code includes sandbox attributes and CSP
  - Optional: password protection for embedded UIs

### 8.3 Plan Sharing

- [ ] **COL-SH-007**: Implement plan sharing
  - Share execution plans with team members or stakeholders
  - Generate a read-only view of the plan with progress indicators
  - Shareable link with same token-based access as spec sharing
- [ ] **COL-SH-008**: Implement plan export
  - Export plans as standalone Markdown documents
  - Export plans as PDF (via server-side rendering)
  - Include plan metadata, spec references, and execution status

#### Design Decisions

> **Q**: Should shared links allow anonymous (unauthenticated) access, or require the recipient to have an account?
> **A**: Authentication is always required. No anonymous access. To view a shared spec, the recipient must have an account and be a member of the project (at minimum Viewer role). External stakeholders must be invited to the project.

> **Q**: Should shared specs include a "fork to my project" action?
> **A**: Yes, as a Phase 2 feature. Project members with at least Viewer access can fork a spec to another project they own. The forked spec is an independent copy with no ongoing link to the original.

> **Q**: Should there be a public gallery of shared specs/UIs that any user can browse?
> **A**: No. The system is private and project-scoped. No public gallery. Cross-project discovery happens through user membership in multiple projects. A "templates" concept (curated starter specs) could be introduced later.

> **Q**: How should shared content handle updates? If the source spec is updated after sharing, does the shared view show the latest version or the version at the time of sharing?
> **A**: Shared content always shows the latest pushed version. There is no snapshot sharing at launch. If a user wants to share a specific version, they can reference a git commit SHA in the share link (Phase 3+ feature).

---

## 9. Presence & Awareness

### 9.1 Online Status

- [ ] **COL-PA-001**: Implement user online status tracking
  - Track user connection status via WebSocket connection state
  - States: `online`, `idle` (no activity for 5 minutes), `offline`
  - Broadcast status changes to project members
  - Store in-memory (Redis or local map), not in database
- [ ] **COL-PA-002**: Implement online status display
  - Show green/yellow/gray dot next to user avatars
  - Show in project member list, activity feed, spec viewer badges
  - Show "Last seen 2 hours ago" for offline users
- [ ] **COL-PA-003**: Implement user activity tracking
  - Track last active timestamp per user per project
  - Track current view (which spec/document is the user looking at)
  - Share current view with other project members via WebSocket
  - Privacy option: users can opt out of activity sharing

### 9.2 Collaborative Awareness

- [ ] **COL-PA-004**: Implement spec viewer badges
  - Show small avatars of users currently viewing a spec
  - Display in: graph node badges, spec list, spec editor header
  - Update in real-time via WebSocket
- [ ] **COL-PA-005**: Implement cursor position sharing (optional)
  - Share the user's cursor position within the spec editor
  - Show colored cursors with user names for other viewers
  - Only active if the spec is in "shared editing" mode
  - This is cosmetic awareness, not real-time collaboration (changes are still async)
- [ ] **COL-PA-006**: Implement navigation awareness
  - "Alice navigated to Spec X" events in the activity feed
  - Only shared if the user has activity sharing enabled
  - Useful for following another user's exploration path

---

## 10. Offline Support

- [ ] **COL-OF-001**: Implement offline detection
  - Detect when the client loses connection to the server
  - Show offline indicator in the UI header
  - Queue all sync operations until connection is restored
- [ ] **COL-OF-002**: Implement offline spec editing
  - Allow full spec editing while offline
  - Changes are committed to the local git working copy
  - Auto-push when connection is restored
- [ ] **COL-OF-003**: Implement offline change queue
  - Queue all API mutations (create, update, delete) while offline
  - Replay queue on reconnection
  - Handle conflicts between queued changes and remote changes
  - Show "N changes pending sync" indicator
- [ ] **COL-OF-004**: Implement offline dialog caching
  - Cache recent dialog sessions locally
  - Allow reading dialog history while offline
  - New dialog messages queued until connection is restored
  - Agent interactions unavailable offline (require server)
- [ ] **COL-OF-005**: Implement reconnection sync strategy
  - On reconnection: pull remote changes → resolve conflicts → push local changes → replay API queue
  - Show sync progress during reconnection
  - Handle partial failure gracefully (some pushes succeed, others conflict)

#### Design Decisions

> **Q**: How critical is offline support? Should it be a launch requirement or a future enhancement?
> **A**: Not a launch requirement. The system requires server connectivity for authentication, sync, and agent operations. However, because the knowledge graph is git-based and cloned locally, a user can read (but not edit via the UI) their local working copy offline using any text editor. In-app offline editing is a Phase 4+ enhancement.

> **Q**: Should the client use a local database (IndexedDB, SQLite) for offline spec caching, or rely entirely on the git working copy?
> **A**: Rely on the git working copy. No local database at launch. The client fetches spec data from the server API. The git working copy serves as the local data store for the server. Client-side caching is limited to standard HTTP caching (ETags, Cache-Control). IndexedDB caching is a Phase 4+ offline enhancement.

> **Q**: How should the app handle intermittent connectivity (frequent disconnects and reconnects)?
> **A**: 5-second debounce before showing the offline indicator. WebSocket reconnection uses exponential backoff (1s, 2s, 4s, 8s, max 30s). During brief disconnects, the UI queues user actions locally and replays them on reconnect. If disconnected for more than 60 seconds, the UI shows a persistent offline banner and disables write operations.

---

## 11. Conflict Resolution Workflows

### 11.1 Conflict Detection & Presentation

- [ ] **COL-CR-001**: Implement conflict detection service
  - Parse git merge conflict markers in files
  - Extract: ours/theirs content, conflict boundaries, file paths
  - Return structured `ConflictInfo` objects for UI rendering
  - Handle nested conflicts (multiple in one file)
- [ ] **COL-CR-002**: Implement conflict categorization
  - Content conflicts: two users edited the same lines
  - Structural conflicts: file renamed/moved by one, edited by another
  - Deletion conflicts: one user deleted, another modified
  - Edge conflicts: conflicting edge modifications between same specs
  - Tag/metadata conflicts: same metadata field changed differently
- [ ] **COL-CR-003**: Implement conflict summary generation
  - Aggregate conflicts by type and severity
  - "3 content conflicts, 1 deletion conflict across 2 specs"
  - Prioritize: deletion and structural conflicts first (harder to resolve)
  - Estimate resolution effort (trivial, moderate, complex)
- [ ] **COL-CR-004**: Implement conflict notification broadcast
  - Notify the user who caused the conflict (the puller) immediately
  - Notify the user whose changes caused the conflict (the other author) if online
  - Include: which specs are affected, nature of conflict, link to resolution UI

### 11.2 Conflict Resolution Strategies

- [ ] **COL-CR-005**: Implement "take mine" resolution
  - Accept the local user's version, discard remote changes
  - Apply per-file or per-conflict-region
  - Preserve full remote history (revert is possible)
- [ ] **COL-CR-006**: Implement "take theirs" resolution
  - Accept the remote version, discard local changes
  - Apply per-file or per-conflict-region
  - Local changes are preserved in reflog for recovery
- [ ] **COL-CR-007**: Implement manual merge resolution
  - Open both versions side-by-side for manual editing
  - User creates the final merged version by combining elements
  - Validate merged content before accepting
  - Syntax check for JSON files (ensure valid JSON after merge)
- [ ] **COL-CR-008**: Implement agent-assisted conflict resolution
  - Option to invoke the agent to propose a merged version
  - Agent receives: base version, ours, theirs, and spec context
  - Agent produces: proposed merged content with explanation
  - User reviews and accepts/modifies the agent's proposal
- [ ] **COL-CR-009**: Implement batch conflict resolution
  - "Take all mine" or "Take all theirs" for all conflicts at once
  - Useful when one user's changes are clearly superseding the other's
  - Confirm before applying batch resolution
- [ ] **COL-CR-010**: Implement conflict resolution commit
  - After all conflicts are resolved, create a merge commit
  - Commit message: `Merge remote changes, resolved N conflicts`
  - Include conflict resolution metadata: which strategy was used per conflict
  - Push the merge commit to sync with server

### 11.3 Conflict Prevention

- [ ] **COL-CR-011**: Implement pre-edit conflict warning
  - Before a user starts editing a spec, check if others have recent uncommitted changes
  - "Warning: Alice has unpushed changes to this spec"
  - User can: proceed (risk conflict), wait, or contact Alice
- [ ] **COL-CR-012**: Implement conflict likelihood indicator
  - For each spec, show a risk indicator based on recent multi-user activity
  - High risk: multiple users edited in the last hour
  - Medium risk: multiple users edited in the last day
  - Low risk: only one user has recent edits
  - Display as a subtle icon in the spec list and graph view

#### Design Decisions

> **Q**: Should conflict resolution happen in the spec editor (inline), in a dedicated conflict resolution view, or in a modal?
> **A**: Dedicated conflict resolution view. When a pull results in conflicts, a "Resolve Conflicts" panel appears listing all conflicted files. Clicking a file opens a side-by-side diff view (mine vs. theirs) with "Accept Mine," "Accept Theirs," and "Edit Manually" options. This is clearer than inline markers and doesn't pollute the normal editing experience.

> **Q**: Should the agent be available to help resolve conflicts?
> **A**: Yes, as an optional assist. The conflict resolution view includes a "Suggest Resolution" button that asks the agent to propose a merge. The suggestion is shown as a third option (alongside "mine" and "theirs") and must be explicitly accepted by the user. The user always has final say.

> **Q**: Should conflict resolution block all other operations (hard lock) or allow the user to continue editing other non-conflicted specs?
> **A**: Non-blocking. The user can continue editing non-conflicted specs. Conflicted specs are marked with a warning icon and are read-only until resolved. Push is blocked until all conflicts are resolved.

> **Q**: How should conflicts in graph edges be presented?
> **A**: Both edges are valid — edge creation is additive. If two users both add different edges from the same spec, both are preserved (union merge). If two users modify the same edge (e.g., change its label), that is a conflict and requires resolution. Edge deletion conflicting with edge modification is also a conflict.

> **Q**: Should there be advisory locking — when a user starts editing a spec, warn other users that it's being edited?
> **A**: Yes, per the PRD. Advisory locks are implemented. When a user opens a spec for editing, a lock is registered on the server (via WebSocket). Other users see a warning: "Alice is currently editing this spec." The lock is advisory — users can override it and edit anyway, accepting the conflict risk. Locks auto-expire after 30 minutes of inactivity or on WebSocket disconnect.

> **Q**: Should the system detect potential conflicts proactively?
> **A**: Yes. The 60-second background fetch combined with advisory lock awareness enables this. If the server detects that two users have uncommitted changes to the same spec, both receive a WebSocket notification: "Potential conflict: [other user] also has changes to [spec name]." This is informational only — no action is forced.

---

## 12. Sync Status & Indicators

- [ ] **COL-SS-001**: Implement sync status service
  - Track per-project sync state: `synced`, `ahead`, `behind`, `diverged`, `conflict`
  - `synced`: local matches remote
  - `ahead`: local has unpushed commits
  - `behind`: remote has commits not yet pulled
  - `diverged`: both local and remote have new commits
  - `conflict`: merge in progress with unresolved conflicts
- [ ] **COL-SS-002**: Implement sync status display in UI header
  - Show sync indicator in the project header
  - Icon: green check (synced), blue up arrow (ahead), orange down arrow (behind), yellow diverge icon, red conflict icon
  - Click to expand: details of unpushed/unpulled changes
- [ ] **COL-SS-003**: Implement per-spec sync indicator
  - Show sync status per spec in the spec list and editor
  - Modified locally: blue dot
  - Modified remotely (after pull): orange dot
  - Conflicted: red dot
  - Synced: no indicator
- [ ] **COL-SS-004**: Implement sync history panel
  - Show recent sync events: pushes, pulls, merges, conflicts
  - Per-event: who, when, what changed, result
  - Filterable by user, date range, event type
- [ ] **COL-SS-005**: Implement sync progress indicator
  - During sync operations (pull, push, merge), show progress
  - Stages: fetching, merging, pushing
  - Percentage or spinning indicator
  - Cancel button for long-running syncs
- [ ] **COL-SS-006**: Implement unpushed changes counter
  - Show count of local commits not yet pushed
  - "5 unpushed changes" in the sync status area
  - Tooltip: list of unpushed commit summaries
  - Encourage users to push regularly
- [ ] **COL-SS-007**: Implement remote changes notification badge
  - When server detects a push from another user
  - Show badge: "New changes available from Alice"
  - Badge clears after pull
  - Non-intrusive: badge only, no modal or blocking UI

---

## Additional Design Decisions

> **Q**: How many concurrent users per project should the system support?
> **A**: 20 concurrent users per project at launch. The system targets 20–50 total users across all projects. WebSocket connection limit: 100 concurrent connections server-wide. This is sufficient for the initial deployment.

> **Q**: Should the git repositories be hosted locally (same server) or on an external git hosting service (GitHub, GitLab)?
> **A**: Locally on the same server. Bare git repositories stored on the server's filesystem. This eliminates external dependencies, API rate limits, and latency. Backups are handled by the server backup strategy (database + git repos). External hosting (GitHub mirror) is a Phase 3+ enhancement for redundancy.

> **Q**: How large can a knowledge graph get before sync performance degrades? Should there be limits on project size?
> **A**: Practical limits: ~1,000 specs per project, ~500 MB total repo size. Beyond this, git operations (clone, fetch, diff) may become noticeably slow. The system should display warnings at 80% of these thresholds. Performance optimization (shallow clones, sparse checkouts) can be introduced if users approach these limits. No hard block.
