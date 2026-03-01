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
