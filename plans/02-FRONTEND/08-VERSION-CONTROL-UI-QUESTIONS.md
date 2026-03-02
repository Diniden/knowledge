# 02-FRONTEND / 08 — VERSION CONTROL UI: Open Questions

> **Purpose**: Unresolved questions about the version control UI including
> diff visualization style, version navigation, branch management, merge
> experience, and sync behavior. Answers may change tasks in the plan.

---

## 1. Diff View Design

### 1.1 "Light Indications"

- **Q**: The PRD says diffs should use "light colored indications" and should
  "otherwise look EXACTLY how it was." Can we get mockups or more specific
  guidance? The plan proposes subtle background tints and margin indicators —
  is this the right interpretation.
- **A:** Correct interpretation. The diff renders each version as it looked originally (same typography, spacing, formatting). Changes are indicated by: a 3px colored margin bar on the left (green for additions, red for removals, blue for modifications) and a very subtle background tint (5% opacity fill matching the margin color). Text color and font remain unchanged. No heavy green/red backgrounds like GitHub. The content is primary; the diff indicators are secondary.

- **Q**: Should the diff view use inline additions/removals (removed text
  with strikethrough next to added text), or should removed text be hidden
  (only showing the new version with colored additions)?
- **A:** Inline additions/removals. Removed text appears with a light strikethrough and red-50 background tint. Added text appears with a green-50 background tint. Both are visible in the same document flow. This shows the complete change context without switching views. The user sees exactly what was there before and what replaced it, side by side in the text flow.

- **Q**: Should the diff show the "before" version, the "after" version, or
  a merged view? "Before and after should look EXACTLY how it was" suggests
  showing each version cleanly with minimal decoration.
- **A:** Default mode shows a unified merged view (inline additions/removals as described above). A toggle switches to side-by-side mode showing "before" on the left and "after" on the right, each rendered cleanly as the spec looked at that version — no inline change markers, only the subtle margin bars indicating which lines changed. This fulfills the PRD requirement: each side "looks exactly how it was."

- **Q**: For word-level changes within a line, should individual changed
  words be highlighted, or only the entire line?
- **A:** Word-level highlighting. Within a modified line, the specific changed words get a stronger background tint (10% opacity vs. 5% for the line-level tint). This is critical for long paragraphs where a single word change would otherwise require the user to visually scan the entire line. Use `diff-match-patch` for accurate word-level diff computation.

### 1.2 Diff Modes

- **Q**: Should the default diff view be unified (single column) or split
  (side-by-side)? The PRD seems to favor unified, but should split be
  available as an option?
- **A:** Unified (single column) as default. Split (side-by-side) available as a toggle in the diff toolbar. The unified view is better for small changes and saves horizontal space. The split view is better for large rewrites where inline additions/removals become confusing. User preference persists in localStorage.

- **Q**: Should there be a "no diff" mode — viewing a past version as-is
  (without any change indications), for reading it naturally?
- **A:** Yes. A "Clean view" toggle in the diff toolbar hides all change indicators and renders the selected version exactly as it looked — no margin bars, no tints, no strikethroughs. This lets users read a historical version without visual noise. Useful for understanding what a spec said at a specific point in time, not just what changed.

- **Q**: Should the diff be computed client-side or server-side? Client-side
  is faster for small changes; server-side is more accurate for complex
  history.
- **A:** Client-side. Both the before and after versions are fetched from the server as full content, and the diff is computed in the browser using `diff-match-patch` (fast, handles word-level diffs). Client-side avoids a server round-trip for diff computation and allows real-time diff mode toggling. The content payload for two spec versions is small (typically <50KB total).

### 1.3 Diff Scope

- **Q**: Should the diff show changes to metadata (tags, permissions, title)
  in addition to content changes? If so, how should metadata changes be
  displayed?
- **A:** Yes, show metadata changes in a collapsible "Metadata changes" section above the content diff. Display as a simple property table: "Title: 'Old Title' → 'New Title'", "Tags: +security, -draft", "Status: draft → reviewed". This section is collapsed by default if there are content changes (content is more important), expanded if only metadata changed.

- **Q**: Should the diff show changes to graph edges associated with the
  spec? "Edge added: depends-on → Spec B"?
- **A:** Yes, in a collapsible "Connection changes" section below the metadata section. Show edge changes as: "+ depends-on → [Spec B]" (green), "- related-to → [Spec C]" (red), "~ derived-from → [Spec D] (type changed from related-to)" (blue). Spec names are clickable links. This gives complete visibility into what changed for a given version.

---

## 2. Version History

### 2.1 History Granularity

- **Q**: The PRD says "each change to a spec is a commit hash." Does this
  mean the version history shows one entry per auto-save, or are auto-saves
  grouped into larger "versions"? One entry per auto-save could create a
  very long history.
- **A:** Auto-saves create individual commits (per PRD), but the UI groups consecutive auto-save commits within a 5-minute editing session into a single "editing session" entry. The session entry shows the time range ("10:15 – 10:23 AM") and a summary of total changes. Clicking expands to show individual auto-save commits within the session. Explicit saves and agent changes are always shown as individual entries.

- **Q**: Should the version history show all commits (including auto-save
  micro-commits), or only "significant" versions? If filtered, what
  determines significance?
- **A:** Show grouped sessions by default (as described above). A "Show all commits" toggle reveals every individual auto-save commit. Significant versions are: explicit user saves (Cmd+S), agent modifications, merge commits, and revert commits — these are always shown as individual top-level entries with an icon indicating the action type.

- **Q**: Should the version history show the exact diff for each entry, or
  only a summary until the user clicks to expand?
- **A:** Summary by default: entry shows timestamp, author avatar, action type icon, and a one-line change summary ("Modified 2 paragraphs, added 1 heading"). Clicking an entry opens the full diff view for that version. This keeps the timeline scannable — loading diffs for all entries would be slow and overwhelming.

### 2.2 History Display

- **Q**: Should the version history be a vertical timeline, a horizontal
  timeline, a simple list, or a table? Vertical timeline is most common,
  but a table might be more compact for power users.
- **A:** Vertical timeline. Each entry is a card in a vertical list with a timeline line on the left connecting entries. The line has dots at each entry (color-coded by action type: blue for user edit, purple for agent, green for merge, orange for revert). This is the most intuitive format for chronological history and scales well with many entries.

- **Q**: Should the version history show a git-graph-style visualization
  (branching lines) when there are branches, or only a linear list?
- **A:** Linear list for the per-spec history (specs live on one branch at a time). Git-graph visualization is shown on the project-level version control page where branch relationships matter. The per-spec timeline shows merge points as special entries ("Merged from branch 'feature-x'") but doesn't render branching lines — that level of detail is on the project page.

- **Q**: Where should the version history be displayed? A dedicated page,
  a sidebar panel, a modal, or integrated into the editor?
- **A:** A sidebar panel that slides in from the right (replacing the chat panel temporarily). Toggled via the spec header's "History" button or the version control route. This keeps the editor visible for context while browsing history. Selecting a version in the timeline shows the diff in the editor area (replacing the live editor content temporarily). "Exit history" returns to the live editor.

---

## 3. Spec vs. Document Versioning

### 3.1 Interaction Model

- **Q**: Should the default version history view show per-spec history or
  per-document history? The PRD emphasizes spec-level versioning, but users
  may think in terms of documents.
- **A:** Per-spec history as the default when viewing from within the editor (clicking a spec's "History" button). Per-document history as the default on the version control page (`/versions/:docId`), showing all spec changes within the document in a unified timeline. Users can filter the document timeline by spec. This serves both mental models.

- **Q**: When reverting a document to a previous state, should all specs be
  reverted to exactly that point, or should the user be able to selectively
  revert individual specs?
- **A:** Selective revert. When viewing document history and selecting a past state, the UI shows which specs have changed since that point. The user checks/unchecks specs to include in the revert. All specs are checked by default (full revert), but the user can uncheck specs they want to keep at the current version. This provides precision without sacrificing the common case.

- **Q**: If a spec was added to the document after the target revert point,
  should it be removed during document-level revert?
- **A:** The revert dialog shows added specs with a "Will be removed" warning and a checkbox to keep them. By default, newly added specs are marked for removal (true revert), but the user can uncheck to preserve them. This prevents accidental loss of new work while defaulting to the expected revert behavior.

### 3.2 Version Identification

- **Q**: How should versions be identified to users? Git commit hashes are
  opaque. Should there be version numbers (v1, v2, v3) or dates, or
  user-friendly labels?
- **A:** Dates as the primary identifier: "Feb 28, 2:15 PM" with relative time when recent ("3 hours ago"). Version numbers (v1, v2, v3) are auto-assigned sequentially per spec for easy reference. The git commit hash is shown as a truncated 7-character string in the metadata (for power users). The timeline entry format: "v12 · Feb 28, 2:15 PM · user@example.com".

- **Q**: Should users be able to add labels/tags to specific versions
  (e.g., "Reviewed", "Approved", "Before major rewrite")?
- **A:** Yes. Users can add a label to any version via the version's "..." menu ("Add label"). Labels appear as colored badges on the timeline entry. System labels: "Reviewed" (blue), "Approved" (green), "Milestone" (purple). Custom labels are any text string. Labeled versions are pinned in the timeline (always visible, not collapsed into editing sessions). This helps mark significant points in a spec's evolution.

---

## 4. Branch Management

### 4.1 Branch UX

- **Q**: How prominently should the current branch be displayed? Always
  visible in the header, or only in version control views?
- **A:** Always visible in the app header. A branch chip (git branch icon + branch name) appears next to the project name. It uses subtle styling (muted text, no background) to avoid dominating the header. The "main" branch uses default styling; other branches show a colored dot matching the branch color from the branch graph. This constant visibility prevents "which branch am I on?" confusion.

- **Q**: Should the UI prevent creating branches with certain names
  (e.g., "main", "master"), or allow any name?
- **A:** Prevent reserved names: "main", "master", "HEAD". Validate branch names against git's naming rules (no spaces, no special characters except `-` and `_`). Show real-time validation in the create branch dialog: "Branch name is available" (green check) or "This name is reserved" (red error). Auto-suggest names based on the description ("auth-refactoring-feb28").

- **Q**: Should branches have descriptions (like GitHub branch descriptions)?
  This could help explain the purpose of experimental branches.
- **A:** Yes. An optional description field (up to 200 characters) when creating a branch. The description appears in the branch list and branch switcher dropdown as a subtitle. Example: "auth-refactoring" with description "Restructuring authentication specs per security review." This helps teams understand the purpose of branches without opening them.

- **Q**: Should there be a visual branch graph (showing branch/merge history
  like `git log --graph`)?
- **A:** Yes, on the project version control page (`/versions`). A simplified branch graph shows branch creation points, merge points, and the current HEAD of each branch. The graph uses horizontal lanes per branch with vertical connections for merges. It's not as detailed as `gitk` — it shows branch lifecycle, not individual commits. Individual commits are viewed per-spec or per-document.

### 4.2 Branch Workflow

- **Q**: Should switching branches be as simple as a dropdown selection, or
  should there be a confirmation step? Unsaved changes could be lost.
- **A:** Dropdown selection with a conditional confirmation. If there are no unsaved changes, the switch is instant. If there are unsaved changes, a confirmation dialog appears: "You have unsaved changes in [Spec Name]. [Save and switch] [Discard and switch] [Cancel]". This is fast for the common case (no unsaved changes) and safe for the edge case.

- **Q**: Should the UI support stashing changes before switching branches, or
  should the user be forced to commit or discard first?
- **A:** No stash UI. The "Save and switch" option in the confirmation dialog commits unsaved changes before switching — this is effectively an auto-stash-and-commit. Git stash is a developer-facing concept that doesn't map well to a knowledge authoring UI. The mental model is simple: save your work (commit) or discard it, then switch.

- **Q**: What happens to the chat history when switching branches? Are chat
  sessions branch-specific or global?
- **A:** Chat sessions are global (not branch-specific). Switching branches does not affect the active chat session. The agent's context automatically updates to reflect the new branch. A system message appears in the chat: "Switched to branch 'feature-x'". Past sessions remain accessible regardless of which branch they were created on.

---

## 5. Merge & Conflict Resolution

### 5.1 Merge UX

- **Q**: Should the merge UI use a three-way merge view (base, ours, theirs)
  or a two-way view (ours, theirs)? Three-way is more accurate but more
  complex.
- **A:** Two-way view (ours vs. theirs) as the default, with the option to show the base version. Most users don't need three-way context — they want to see "my version" vs. "their version" and choose. A "Show base" toggle reveals the common ancestor for complex conflicts. This keeps the default UI simple while providing advanced capability.

- **Q**: Should the system support "merge strategies" (e.g., always prefer
  ours, always prefer theirs, manual) for batch conflict resolution?
- **A:** Yes. The merge dialog offers three strategies: "Accept all mine" (keep current branch for all conflicts), "Accept all theirs" (take incoming branch for all conflicts), and "Resolve manually" (default, review each conflict). The batch strategies are buttons at the top of the merge view. For most merges, "Resolve manually" is appropriate, but batch strategies speed up straightforward merges.

- **Q**: Should the agent be involved in conflict resolution? For example,
  the agent could propose a merged version based on understanding both
  versions.
- **A:** Yes. A "Suggest resolution" button on each conflict sends both versions to the agent, which proposes a merged version that preserves the intent of both changes. The suggestion appears as a third option alongside "ours" and "theirs." The user can accept the agent's suggestion, edit it, or ignore it. This is optional — the merge UI works without agent involvement.

### 5.2 Conflict UX

- **Q**: How should conflicts within a single spec be presented? As one
  conflict per changed section, or as one conflict per spec?
- **A:** One conflict per changed section (paragraph, heading, list, or contiguous block of changes). This gives users fine-grained control: they can accept "ours" for one paragraph and "theirs" for another within the same spec. Each conflict section is visually bounded with a conflict header ("Conflict 1 of 3") and resolution buttons.

- **Q**: Should the conflict resolution UI prevent the user from completing
  the merge until ALL conflicts are resolved, or allow partial resolution?
- **A:** Prevent completion until all conflicts are resolved. The "Complete merge" button is disabled with a message ("3 conflicts remaining") until every conflict has a resolution. This prevents accidentally merging with unresolved conflicts, which would leave the spec in an inconsistent state. Users can save their progress and return to the merge later.

- **Q**: Should conflicts be resolvable within the spec editor (inline), or
  only in a dedicated conflict resolution view?
- **A:** Dedicated conflict resolution view. The merge UI is a specialized view that shows conflicts clearly with side-by-side comparison, resolution buttons, and progress tracking. Inline conflict markers in the editor (like git's `<<<<<<<` markers) would be confusing for non-technical users. The dedicated view is accessed from the version control page when a merge has conflicts.

---

## 6. Sync & Collaboration

### 6.1 Sync Model

- **Q**: How often should the client check for remote changes? On a timer
  (every 30 seconds? every 5 minutes?), on user action (pull button), or
  via WebSocket push notification?
- **A:** WebSocket push notification as the primary mechanism. The server broadcasts change events when commits are pushed. The client receives these and shows a notification: "Remote changes available. [Pull now]". No polling timer — WebSocket provides near-instant awareness. A manual "Check for updates" button serves as fallback if WebSocket is disconnected.

- **Q**: Should remote changes be automatically applied (live sync like
  Google Docs), or should the user explicitly pull changes? The PRD suggests
  async (git-based), not real-time.
- **A:** Explicit pull. The user clicks "Pull" to fetch and apply remote changes. This aligns with the PRD's async git-based model. The notification ("Remote changes available") is persistent until the user pulls or dismisses it. Auto-pull would cause disruptive content changes while the user is reading or thinking. The user controls when their view updates.

- **Q**: What should happen when the user pulls changes that affect a spec
  they're currently editing? Automatically merge, prompt for resolution, or
  hold the pull until they save?
- **A:** Prompt for resolution. If the pull includes changes to a spec with unsaved local edits, the pull completes for all other specs, and the conflicting spec shows a merge prompt: "This spec has both local changes and remote changes. [View diff] [Keep mine] [Accept theirs] [Merge]". The editor remains usable — only the affected spec needs resolution.

### 6.2 Push Model

- **Q**: Should "push" be automatic after each commit, or manual? Automatic
  push simplifies the workflow but could cause more conflicts. Manual push
  lets users batch changes.
- **A:** Manual push. Users explicitly push their commits when ready via a "Push" button in the header (shows a badge with unpushed commit count: "Push (3)"). This lets users batch several spec edits into a single push, review their changes before sharing, and work on experimental changes without immediately affecting others. Mirrors the git mental model.

- **Q**: Should there be a "publish" concept — commits are local until
  explicitly published to the shared repository?
- **A:** The push mechanism is the "publish" concept. Local commits (auto-save) are private until the user pushes. The header branch chip shows "3 unpushed" to indicate local-only changes. There's no separate "publish" action — push IS publish. This keeps the model simple with one action (push) instead of two (push + publish).

- **Q**: How should push failures (server unreachable, conflicts) be
  communicated? Toast notification, modal, or inline error?
- **A:** Modal for conflicts (requires user action to resolve), toast for transient errors (server unreachable, timeout). Conflict modal: "Push failed: remote has diverged. [Pull and merge] [Force push] [Cancel]". Transient error toast: "Push failed: server unreachable. Will retry automatically." with auto-retry after 10 seconds. Force push requires a confirmation dialog with a warning.

---

## 7. Revert Behavior

- **Q**: When reverting a spec, does the revert create a new version (git
  revert style, preserving history) or actually remove the intervening
  versions (destructive reset)? Git revert (new commit) is safer and
  recommended.
- **A:** Git revert style — creates a new commit that restores the spec to the target version's content. All intervening versions are preserved in history. The revert commit is labeled "Revert to v12" in the timeline. This is non-destructive and allows undoing the revert if needed. Destructive reset is never exposed in the UI.

- **Q**: Should revert be undoable? If the user reverts and then regrets it,
  should they be able to undo the revert (by reverting the revert)?
- **A:** Yes. Since revert creates a new commit, the user can revert the revert — the previous version (before the revert) is still in the history timeline. The UI also supports Cmd+Z in the editor immediately after a revert (before navigating away) as a quick undo. The timeline clearly shows "Revert to v12" followed by "Revert to v15" if the user undoes it.

- **Q**: Should the revert confirmation show the exact diff of what will
  change, or just a summary? Showing the full diff helps the user make an
  informed decision but takes more space.
- **A:** Show the full diff in the revert confirmation dialog. The dialog has two sections: a summary header ("Reverting to v12 from Feb 25 — will modify 3 paragraphs, remove 1 heading") and a scrollable diff view showing the exact changes that will be applied. The diff uses the same lightweight styling as the version control diff view. "Revert" and "Cancel" buttons are fixed at the bottom.

- **Q**: Should there be a "soft revert" option — view the old version in
  the editor with an option to save it as the new version, rather than
  immediately creating a revert commit?
- **A:** Yes. Clicking a version in the history timeline loads it into the editor as a "preview" mode (read-only, with a yellow banner: "Viewing version v12 from Feb 25. [Restore this version] [Back to current]"). "Restore this version" creates the revert commit. "Back to current" returns to the live version. This lets users browse history and read old versions without committing to a revert.

---

## 8. Edge Versioning

- **Q**: The PRD says "edges are also version controlled the same as a node."
  Should edge version history be viewable in the UI? If so, where — in the
  graph detail sidebar, in a dedicated edge history view?
- **A:** In the graph detail sidebar. When an edge is selected, the sidebar shows edge details (type, source, target, created date) plus a "History" section showing the edge's version timeline. Entries include: creation, type changes, and deletion/restoration. The timeline uses the same vertical timeline component as spec history, keeping the UI consistent.

- **Q**: Should edge changes be shown in the spec's version history (since
  edges are associated with specs)?
- **A:** Yes. Edge changes appear in the spec's version timeline as entries: "Edge added: depends-on → [Spec B]" or "Edge type changed: related-to → derived-from for [Spec C]". They're visually distinct from content changes (graph icon instead of edit icon). This gives users complete change visibility per-spec, including relationship changes.

- **Q**: Can edges be individually reverted to a previous type or state?
- **A:** Yes. From the edge's history in the graph sidebar, users can revert an edge to a previous state (e.g., change its type back from `derived-from` to `related-to`). Like spec reverts, this creates a new version commit. Edge deletion can also be reverted (restoring a deleted edge). The revert confirmation shows what will change.

---

## 9. Performance

- **Q**: How many versions should the timeline load initially? 20? 50? All?
  If a spec has 500 versions (many auto-saves), loading all at once would
  be slow.
- **A:** Load the 30 most recent entries initially (after grouping auto-saves into editing sessions). "Load more" button at the bottom fetches the next 30 (cursor-based pagination). Labeled/milestone versions are always loaded regardless of pagination (they're pinned). For a spec with 500 individual commits, this displays ~50-100 grouped entries with 2-3 pagination loads.

- **Q**: Should diff computation be done server-side (more accurate, slower)
  or client-side (faster, requires both versions transferred)?
- **A:** Client-side. Fetch both versions as full content (small payload for text specs) and compute the diff in the browser using `diff-match-patch`. This provides instant diff mode toggling (unified ↔ split ↔ clean view) without server round-trips. The word-level diff algorithm runs in <50ms for typical spec sizes.

- **Q**: Should the version history cache version data for previously viewed
  versions?
- **A:** Yes. TanStack Query caches fetched version content with a `staleTime` of 5 minutes. If the user navigates back to a previously viewed version, the diff renders instantly from cache. The cache is memory-only (not persisted to localStorage) and is invalidated when the spec is modified.

---

## 10. Agent Integration

- **Q**: Per the PRD: "A spec revision should trigger the AI to crawl the
  graph from that node to discover implications." Should this happen
  automatically on every revert, or should the user choose to trigger it?
- **A:** Automatically on every revert, per the PRD. A revert is a spec revision — the spec content changed, so the agent should crawl the graph to discover implications. The agent processes the revert asynchronously and reports findings in the chat: "I noticed you reverted [Spec Name]. Here are potential implications: [list]." The crawl is identical to what happens after any spec edit.

- **Q**: Should the agent be notified of branch creation and merges? Could
  the agent help with merge conflict resolution?
- **A:** Yes to both. The agent is notified of branch creation (can offer guidance: "I see you created branch 'security-refactor'. Want me to identify all security-related specs?") and merges (crawls the graph after merge to find implications of combined changes). For merge conflicts, a "Suggest resolution" button per conflict invokes the agent to propose a merged version.

- **Q**: Should the version control UI show agent-triggered changes
  differently from user-triggered changes in the timeline?
- **A:** Yes. Timeline entries include an author indicator: user changes show the user's avatar, agent changes show the agent's icon (bot/AI avatar). Agent entries have a distinct label: "Agent: Updated related dependencies" vs. "User: Modified introduction paragraph." The timeline can be filtered by author type ("Show only my changes" / "Show only agent changes" / "Show all").

---

## Decision Log

> Record decisions as questions are resolved.

| Date | Question | Decision | Rationale |
| ---- | -------- | -------- | --------- |
| —    | —        | —        | —         |
