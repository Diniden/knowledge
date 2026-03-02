# 02-FRONTEND / 08 — VERSION CONTROL UI PLAN

> **Purpose**: Define the complete version control UI including diff view with
> light indications (per PRD), version history timeline, spec-level version
> navigation, branch management, merge interface, conflict resolution, revert
> flows, and commit hash display.
>
> **Phase**: 2 (Core Systems) + 4 (Conflict resolution)
> **Dependencies**: `02-FRONTEND/02-COMPONENTS-PLAN.md`, `04-KNOWLEDGE-GRAPH/03-VERSION-CONTROL-PLAN.md`, `03-SERVER/05-GIT-INTEGRATION-PLAN.md`
> **Estimated tasks**: 110+

---

## Table of Contents

1. [Diff View Implementation](#1-diff-view-implementation)
2. [Version History Timeline](#2-version-history-timeline)
3. [Spec-Level Version Navigation](#3-spec-level-version-navigation)
4. [Document-Level Version Navigation](#4-document-level-version-navigation)
5. [Branch Management UI](#5-branch-management-ui)
6. [Merge Interface](#6-merge-interface)
7. [Conflict Resolution UI](#7-conflict-resolution-ui)
8. [Revert Flows](#8-revert-flows)
9. [Commit Hash Display & Navigation](#9-commit-hash-display--navigation)
10. [Version Control Integration Points](#10-version-control-integration-points)
11. [Sync & Pull UI](#11-sync--pull-ui)
12. [Accessibility](#12-accessibility)

---

## 1. Diff View Implementation

### 1.1 Light Indication Style (Per PRD)

The PRD explicitly states: "This should NOT present in a heavily annotated UX
like diff views in github. It should highlight what has changed between the
two, but it should not use heavy handed before and after inlines. The before
and after should otherwise look EXACTLY how it was just with light colored
indications."

- [ ] **FE-VC-001**: Define the light diff indication visual language
  - Added text: very subtle green background tint (e.g., `rgba(16, 185, 129, 0.08)`)
  - Removed text: very subtle red background tint with light strikethrough (e.g., `rgba(239, 68, 68, 0.08)`)
  - Modified text: very subtle yellow/amber background tint (e.g., `rgba(245, 158, 11, 0.08)`)
  - No heavy gutters with +/− signs
  - No line-by-line before/after split (unless explicitly toggled)
  - Document reads naturally — a person unfamiliar with diffs should still read it comfortably
- [ ] **FE-VC-002**: Implement unified diff view (default mode)
  - Single column showing the current content
  - Changed regions have subtle background tints
  - Removed text shown inline with strikethrough and muted color
  - Added text shown inline with subtle green tint
  - Unchanged text has no decoration at all
  - Margin indicators: small colored dots or bars in the left margin
- [ ] **FE-VC-003**: Implement word-level diff highlighting
  - Within changed lines, highlight individual changed words
  - Granular change detection (not just line-level)
  - Unchanged words within a changed line have no highlight
  - Use a diff algorithm that produces word-level changes (e.g., diff-match-patch)
- [ ] **FE-VC-004**: Implement diff scrollbar indicators
  - Scrollbar track shows colored regions for changes
  - Green marks for additions
  - Red marks for deletions
  - Click on scrollbar marks to jump to that change
  - Condensed scrollbar overview of all changes

### 1.2 Diff Navigation

- [ ] **FE-VC-005**: Implement change-by-change navigation
  - "Previous change" / "Next change" buttons
  - Keyboard: `Ctrl+Up` / `Ctrl+Down` or `F7` / `Shift+F7`
  - Scroll to and highlight the next/previous change
  - Show change count: "Change 3 of 12"
- [ ] **FE-VC-006**: Implement change summary header
  - Above the diff view: "5 lines added, 3 lines removed, 2 lines modified"
  - Compact indicator bar showing proportion of changes
  - Click on summary to expand/collapse diff decorations
- [ ] **FE-VC-007**: Implement diff toggle modes
  - **Light mode** (default): subtle indications as described above
  - **Detailed mode**: more prominent highlighting for careful review
  - **Side-by-side mode**: optional traditional two-column view (for users who prefer it)
  - Toggle in diff toolbar

### 1.3 Diff Computation

- [ ] **FE-VC-008**: Implement client-side diff computation
  - Use a diff library: `diff-match-patch` (Google's library, word-level diffs)
  - Or: `jsdiff` (character, word, line, sentence level diffs)
  - Compute diff between two versions of spec content
  - Cache computed diffs to avoid recomputation
- [ ] **FE-VC-009**: Implement server-side diff API
  - Server computes diff between two commit hashes
  - Returns structured diff data (additions, deletions, modifications)
  - Client renders the diff data with appropriate styling
  - Server diff is the source of truth; client diff for preview
- [ ] **FE-VC-010**: Implement diff for different content types
  - Text content: word-level diff
  - Metadata changes: field-by-field comparison
  - Tag changes: added/removed tags highlighted
  - Permission changes: old → new level indicator

#### Design Decisions

> **Q**: The PRD says diffs should use "light colored indications" and should "otherwise look EXACTLY how it was." Can we get mockups or more specific guidance? The plan proposes subtle background tints and margin indicators — is this the right interpretation.
> **A**: Correct interpretation. The diff renders each version as it looked originally (same typography, spacing, formatting). Changes are indicated by: a 3px colored margin bar on the left (green for additions, red for removals, blue for modifications) and a very subtle background tint (5% opacity fill matching the margin color). Text color and font remain unchanged. No heavy green/red backgrounds like GitHub. The content is primary; the diff indicators are secondary.

> **Q**: Should the diff view use inline additions/removals (removed text with strikethrough next to added text), or should removed text be hidden (only showing the new version with colored additions)?
> **A**: Inline additions/removals. Removed text appears with a light strikethrough and red-50 background tint. Added text appears with a green-50 background tint. Both are visible in the same document flow. This shows the complete change context without switching views. The user sees exactly what was there before and what replaced it, side by side in the text flow.

> **Q**: Should the diff show the "before" version, the "after" version, or a merged view? "Before and after should look EXACTLY how it was" suggests showing each version cleanly with minimal decoration.
> **A**: Default mode shows a unified merged view (inline additions/removals as described above). A toggle switches to side-by-side mode showing "before" on the left and "after" on the right, each rendered cleanly as the spec looked at that version — no inline change markers, only the subtle margin bars indicating which lines changed. This fulfills the PRD requirement: each side "looks exactly how it was."

> **Q**: For word-level changes within a line, should individual changed words be highlighted, or only the entire line?
> **A**: Word-level highlighting. Within a modified line, the specific changed words get a stronger background tint (10% opacity vs. 5% for the line-level tint). This is critical for long paragraphs where a single word change would otherwise require the user to visually scan the entire line. Use `diff-match-patch` for accurate word-level diff computation.

> **Q**: Should the default diff view be unified (single column) or split (side-by-side)? The PRD seems to favor unified, but should split be available as an option?
> **A**: Unified (single column) as default. Split (side-by-side) available as a toggle in the diff toolbar. The unified view is better for small changes and saves horizontal space. The split view is better for large rewrites where inline additions/removals become confusing. User preference persists in localStorage.

> **Q**: Should there be a "no diff" mode — viewing a past version as-is (without any change indications), for reading it naturally?
> **A**: Yes. A "Clean view" toggle in the diff toolbar hides all change indicators and renders the selected version exactly as it looked — no margin bars, no tints, no strikethroughs. This lets users read a historical version without visual noise. Useful for understanding what a spec said at a specific point in time, not just what changed.

> **Q**: Should the diff be computed client-side or server-side? Client-side is faster for small changes; server-side is more accurate for complex history.
> **A**: Client-side. Both the before and after versions are fetched from the server as full content, and the diff is computed in the browser using `diff-match-patch` (fast, handles word-level diffs). Client-side avoids a server round-trip for diff computation and allows real-time diff mode toggling. The content payload for two spec versions is small (typically <50KB total).

> **Q**: Should the diff show changes to metadata (tags, permissions, title) in addition to content changes? If so, how should metadata changes be displayed?
> **A**: Yes, show metadata changes in a collapsible "Metadata changes" section above the content diff. Display as a simple property table: "Title: 'Old Title' → 'New Title'", "Tags: +security, -draft", "Status: draft → reviewed". This section is collapsed by default if there are content changes (content is more important), expanded if only metadata changed.

> **Q**: Should the diff show changes to graph edges associated with the spec? "Edge added: depends-on → Spec B"?
> **A**: Yes, in a collapsible "Connection changes" section below the metadata section. Show edge changes as: "+ depends-on → [Spec B]" (green), "- related-to → [Spec C]" (red), "~ derived-from → [Spec D] (type changed from related-to)" (blue). Spec names are clickable links. This gives complete visibility into what changed for a given version.

---

## 2. Version History Timeline

### 2.1 Timeline Component

- [ ] **FE-VC-011**: Implement `VersionTimeline` component
  - Vertical timeline of version entries
  - Newest version at the top
  - Each entry: commit hash, author, timestamp, summary
  - Scroll with loading more history (paginated or infinite scroll)
  - Current version highlighted with accent indicator
- [ ] **FE-VC-012**: Implement timeline entry rendering
  - **Commit hash**: short hash (first 8 chars), monospace font, clickable to copy full hash
  - **Author**: avatar + name
  - **Timestamp**: relative time ("2 hours ago") with absolute tooltip
  - **Summary**: auto-generated from the change (e.g., "Updated content", "Added tags: X, Y", "Changed title")
  - **Change scope**: indicator of change magnitude (small dot, medium dot, large dot)
- [ ] **FE-VC-013**: Implement timeline interactions
  - Click entry: select version, show diff from this version to current
  - Double-click entry: open full version view
  - Hover: show extended details (full commit message, affected specs)
  - Right-click: context menu (revert to this, compare with..., copy hash)

### 2.2 Timeline Filtering

- [ ] **FE-VC-014**: Implement timeline filter controls
  - Filter by author (dropdown)
  - Filter by date range (date picker)
  - Filter by change type (content, metadata, tags, permissions)
  - Search by commit message or hash
- [ ] **FE-VC-015**: Implement timeline grouping
  - Group by date (Today, Yesterday, This Week, Older)
  - Group by author
  - Collapsible groups
  - Show count per group

### 2.3 Version Comparison Selector

- [ ] **FE-VC-016**: Implement two-version comparison
  - Select "from" version and "to" version
  - Dropdowns or click-to-set on timeline entries
  - Visual indicator on timeline showing the comparison range
  - Diff view updates to show comparison between selected versions
- [ ] **FE-VC-017**: Implement "compare with current" shortcut
  - Default: compare selected version with the current (latest) version
  - One-click action on each timeline entry
- [ ] **FE-VC-018**: Implement "compare with previous" shortcut
  - Show diff between each version and its immediate predecessor
  - Useful for reviewing incremental changes

#### Design Decisions

> **Q**: The PRD says "each change to a spec is a commit hash." Does this mean the version history shows one entry per auto-save, or are auto-saves grouped into larger "versions"? One entry per auto-save could create a very long history.
> **A**: Auto-saves create individual commits (per PRD), but the UI groups consecutive auto-save commits within a 5-minute editing session into a single "editing session" entry. The session entry shows the time range ("10:15 – 10:23 AM") and a summary of total changes. Clicking expands to show individual auto-save commits within the session. Explicit saves and agent changes are always shown as individual entries.

> **Q**: Should the version history show all commits (including auto-save micro-commits), or only "significant" versions? If filtered, what determines significance?
> **A**: Show grouped sessions by default (as described above). A "Show all commits" toggle reveals every individual auto-save commit. Significant versions are: explicit user saves (Cmd+S), agent modifications, merge commits, and revert commits — these are always shown as individual top-level entries with an icon indicating the action type.

> **Q**: Should the version history show the exact diff for each entry, or only a summary until the user clicks to expand?
> **A**: Summary by default: entry shows timestamp, author avatar, action type icon, and a one-line change summary ("Modified 2 paragraphs, added 1 heading"). Clicking an entry opens the full diff view for that version. This keeps the timeline scannable — loading diffs for all entries would be slow and overwhelming.

> **Q**: Should the version history be a vertical timeline, a horizontal timeline, a simple list, or a table? Vertical timeline is most common, but a table might be more compact for power users.
> **A**: Vertical timeline. Each entry is a card in a vertical list with a timeline line on the left connecting entries. The line has dots at each entry (color-coded by action type: blue for user edit, purple for agent, green for merge, orange for revert). This is the most intuitive format for chronological history and scales well with many entries.

> **Q**: Should the version history show a git-graph-style visualization (branching lines) when there are branches, or only a linear list?
> **A**: Linear list for the per-spec history (specs live on one branch at a time). Git-graph visualization is shown on the project-level version control page where branch relationships matter. The per-spec timeline shows merge points as special entries ("Merged from branch 'feature-x'") but doesn't render branching lines — that level of detail is on the project page.

> **Q**: Where should the version history be displayed? A dedicated page, a sidebar panel, a modal, or integrated into the editor?
> **A**: A sidebar panel that slides in from the right (replacing the chat panel temporarily). Toggled via the spec header's "History" button or the version control route. This keeps the editor visible for context while browsing history. Selecting a version in the timeline shows the diff in the editor area (replacing the live editor content temporarily). "Exit history" returns to the live editor.

---

## 3. Spec-Level Version Navigation

### 3.1 Per-Spec History

- [ ] **FE-VC-019**: Implement spec version history view
  - Navigate to version history from spec context menu or metadata panel
  - Shows only commits that affected the specific spec
  - Filters the global commit timeline to spec-relevant commits
  - Per PRD: "working with a spec's version means working through the hashes related to the spec but the system will ONLY PULL that specs changes FROM the hash"
- [ ] **FE-VC-020**: Implement spec-level diff view
  - Shows changes to a specific spec between two versions
  - Isolates the spec's content from the broader commit
  - Even if a commit changed multiple specs, show only this spec's delta
- [ ] **FE-VC-021**: Implement spec version preview
  - View a spec as it existed at a specific version
  - Read-only rendered view
  - "This is how the spec looked at [date/hash]"
  - Navigation: previous version / next version arrows
- [ ] **FE-VC-022**: Implement spec version comparison
  - Select two versions of a spec to compare
  - Light-indication diff between the versions
  - Side-by-side option for detailed review

### 3.2 Spec Version Actions

- [ ] **FE-VC-023**: Implement spec-level revert
  - Revert a single spec to a previous version
  - Other specs in the document are unaffected
  - Creates a new commit with the reverted content
  - Confirmation dialog with diff preview
- [ ] **FE-VC-024**: Implement spec version restoration
  - Restore a deleted spec from history
  - Find the last version before deletion
  - Create new spec with the restored content
  - Re-link graph edges where possible

#### Design Decisions

> **Q**: Should the default version history view show per-spec history or per-document history? The PRD emphasizes spec-level versioning, but users may think in terms of documents.
> **A**: Per-spec history as the default when viewing from within the editor (clicking a spec's "History" button). Per-document history as the default on the version control page (`/versions/:docId`), showing all spec changes within the document in a unified timeline. Users can filter the document timeline by spec. This serves both mental models.

---

## 4. Document-Level Version Navigation

### 4.1 Document History

- [ ] **FE-VC-025**: Implement document version history view
  - Shows commits that affected any spec in the document
  - Grouped by commit: shows which specs changed per commit
  - Timeline of document-level changes
- [ ] **FE-VC-026**: Implement document-level version preview
  - View entire document as it existed at a specific commit
  - All specs shown at their state at that commit hash
  - Per PRD: "Going to a hash will rewind all the specs to the state of the specs at the time of the hash but ONLY when editing a SPEC DOCUMENT as a whole"
- [ ] **FE-VC-027**: Implement document-level diff
  - Shows changes across all specs in the document between two commits
  - Per-spec change indicators (which specs changed, added, or removed)
  - Expandable per-spec diffs

### 4.2 Document Version Actions

- [ ] **FE-VC-028**: Implement document-level revert
  - Revert all specs in the document to a specific commit state
  - Each spec rolled back to its state at that commit
  - Creates individual spec revert commits
  - Confirmation: "This will revert N specs to their state at [date/hash]"
  - Shows summary of all changes that will be undone

#### Design Decisions

> **Q**: When reverting a document to a previous state, should all specs be reverted to exactly that point, or should the user be able to selectively revert individual specs?
> **A**: Selective revert. When viewing document history and selecting a past state, the UI shows which specs have changed since that point. The user checks/unchecks specs to include in the revert. All specs are checked by default (full revert), but the user can uncheck specs they want to keep at the current version. This provides precision without sacrificing the common case.

> **Q**: If a spec was added to the document after the target revert point, should it be removed during document-level revert?
> **A**: The revert dialog shows added specs with a "Will be removed" warning and a checkbox to keep them. By default, newly added specs are marked for removal (true revert), but the user can uncheck to preserve them. This prevents accidental loss of new work while defaulting to the expected revert behavior.

---

## 5. Branch Management UI

### 5.1 Branch Selector

- [ ] **FE-VC-029**: Implement branch selector component
  - Dropdown in the header or version control toolbar
  - Shows current branch name
  - List of all branches with creation date
  - Search/filter branches
  - "Create new branch" option at the bottom
- [ ] **FE-VC-030**: Implement branch status display
  - Current branch: emphasized in dropdown
  - Show ahead/behind status relative to main branch
  - Show last commit date per branch
  - Indicators: "N commits ahead", "M commits behind"
- [ ] **FE-VC-031**: Implement branch switching
  - Select a branch from the dropdown to switch
  - Confirm if there are unsaved changes: "Switching branches will discard unsaved changes"
  - Show loading state during switch
  - Refresh all views (editor, graph) with new branch data
  - Update URL to include branch name

### 5.2 Branch Creation

- [ ] **FE-VC-032**: Implement branch creation dialog
  - Modal: branch name input, source branch selector
  - Branch name validation: alphanumeric + hyphens, no spaces
  - Default source: current branch
  - "Create and switch" checkbox (default: true)
  - Error handling: name already exists, server error
- [ ] **FE-VC-033**: Implement branch creation from version history
  - "Create branch from this version" action on timeline entries
  - Pre-fills the branch creation dialog with the selected commit as starting point
- [ ] **FE-VC-034**: Implement branch deletion
  - Delete button on branch dropdown entries (except current branch and main)
  - Confirmation: "Delete branch 'feature-x'? This cannot be undone."
  - Warning if branch has unmerged changes
  - Server handles branch deletion

#### Design Decisions

> **Q**: How prominently should the current branch be displayed? Always visible in the header, or only in version control views?
> **A**: Always visible in the app header. A branch chip (git branch icon + branch name) appears next to the project name. It uses subtle styling (muted text, no background) to avoid dominating the header. The "main" branch uses default styling; other branches show a colored dot matching the branch color from the branch graph. This constant visibility prevents "which branch am I on?" confusion.

> **Q**: Should the UI prevent creating branches with certain names (e.g., "main", "master"), or allow any name?
> **A**: Prevent reserved names: "main", "master", "HEAD". Validate branch names against git's naming rules (no spaces, no special characters except `-` and `_`). Show real-time validation in the create branch dialog: "Branch name is available" (green check) or "This name is reserved" (red error). Auto-suggest names based on the description ("auth-refactoring-feb28").

> **Q**: Should branches have descriptions (like GitHub branch descriptions)? This could help explain the purpose of experimental branches.
> **A**: Yes. An optional description field (up to 200 characters) when creating a branch. The description appears in the branch list and branch switcher dropdown as a subtitle. Example: "auth-refactoring" with description "Restructuring authentication specs per security review." This helps teams understand the purpose of branches without opening them.

> **Q**: Should there be a visual branch graph (showing branch/merge history like `git log --graph`)?
> **A**: Yes, on the project version control page (`/versions`). A simplified branch graph shows branch creation points, merge points, and the current HEAD of each branch. The graph uses horizontal lanes per branch with vertical connections for merges. It's not as detailed as `gitk` — it shows branch lifecycle, not individual commits. Individual commits are viewed per-spec or per-document.

> **Q**: Should switching branches be as simple as a dropdown selection, or should there be a confirmation step? Unsaved changes could be lost.
> **A**: Dropdown selection with a conditional confirmation. If there are no unsaved changes, the switch is instant. If there are unsaved changes, a confirmation dialog appears: "You have unsaved changes in [Spec Name]. [Save and switch] [Discard and switch] [Cancel]". This is fast for the common case (no unsaved changes) and safe for the edge case.

> **Q**: Should the UI support stashing changes before switching branches, or should the user be forced to commit or discard first?
> **A**: No stash UI. The "Save and switch" option in the confirmation dialog commits unsaved changes before switching — this is effectively an auto-stash-and-commit. Git stash is a developer-facing concept that doesn't map well to a knowledge authoring UI. The mental model is simple: save your work (commit) or discard it, then switch.

> **Q**: What happens to the chat history when switching branches? Are chat sessions branch-specific or global?
> **A**: Chat sessions are global (not branch-specific). Switching branches does not affect the active chat session. The agent's context automatically updates to reflect the new branch. A system message appears in the chat: "Switched to branch 'feature-x'". Past sessions remain accessible regardless of which branch they were created on.

---

## 6. Merge Interface

### 6.1 Merge Initiation

- [ ] **FE-VC-035**: Implement merge dialog
  - Triggered from branch dropdown: "Merge branch..."
  - Select source branch and target branch
  - Default target: main branch (or current branch)
  - Pre-merge check: detect conflicts before merging
  - Show merge preview: summary of changes to be merged
- [ ] **FE-VC-036**: Implement pre-merge conflict detection
  - Send merge preview request to server
  - Server returns: list of conflicting specs, clean merge results
  - Display: "N conflicts detected in M specs"
  - If no conflicts: "Clean merge — N specs will be updated"
  - If conflicts: must resolve before merge

### 6.2 Clean Merge

- [ ] **FE-VC-037**: Implement clean merge execution
  - When no conflicts, show "Merge" confirmation button
  - Summary: which specs changed, from which branch
  - Execute merge on server
  - Update all views with merged state
  - Success message: "Branch 'X' merged into 'Y'"
  - Offer to delete the source branch

### 6.3 Merge with Conflicts

- [ ] **FE-VC-038**: Implement conflict list view
  - List all specs with conflicts
  - Per spec: show conflict severity (minor text change vs. major restructure)
  - Status per spec: unresolved, resolved, skipped
  - Progress: "3 of 7 conflicts resolved"
  - "Resolve all" shortcuts (keep mine, keep theirs)
- [ ] **FE-VC-039**: Implement merge completion
  - All conflicts must be resolved before merge can complete
  - "Complete merge" button enabled only when all resolved
  - Creates merge commit with all resolutions
  - Post-merge: update all views, show success

#### Design Decisions

> **Q**: Should the merge UI use a three-way merge view (base, ours, theirs) or a two-way view (ours, theirs)? Three-way is more accurate but more complex.
> **A**: Two-way view (ours vs. theirs) as the default, with the option to show the base version. Most users don't need three-way context — they want to see "my version" vs. "their version" and choose. A "Show base" toggle reveals the common ancestor for complex conflicts. This keeps the default UI simple while providing advanced capability.

> **Q**: Should the system support "merge strategies" (e.g., always prefer ours, always prefer theirs, manual) for batch conflict resolution?
> **A**: Yes. The merge dialog offers three strategies: "Accept all mine" (keep current branch for all conflicts), "Accept all theirs" (take incoming branch for all conflicts), and "Resolve manually" (default, review each conflict). The batch strategies are buttons at the top of the merge view. For most merges, "Resolve manually" is appropriate, but batch strategies speed up straightforward merges.

> **Q**: Should the agent be involved in conflict resolution? For example, the agent could propose a merged version based on understanding both versions.
> **A**: Yes. A "Suggest resolution" button on each conflict sends both versions to the agent, which proposes a merged version that preserves the intent of both changes. The suggestion appears as a third option alongside "ours" and "theirs." The user can accept the agent's suggestion, edit it, or ignore it. This is optional — the merge UI works without agent involvement.

---

## 7. Conflict Resolution UI

### 7.1 Conflict Display

- [ ] **FE-VC-040**: Implement per-spec conflict view
  - Three-way view:
    - **Ours** (local/current branch version)
    - **Theirs** (remote/source branch version)
    - **Result** (merged output, editable)
  - Light-indication diffs between each version
  - Conflict markers highlighted with distinct color (orange/amber)
- [ ] **FE-VC-041**: Implement conflict highlighting
  - Conflicting regions in both versions highlighted
  - Non-conflicting changes shown as regular additions/removals
  - Conflicting sections: amber/orange background tint
  - Clear visual distinction between conflicts and clean changes
- [ ] **FE-VC-042**: Implement inline conflict resolution
  - Within the "Result" panel, show conflict markers
  - Click on a conflict: popup with "Keep ours", "Keep theirs", "Edit manually"
  - Manual edit: editable text area for the conflicting section
  - Preview of result after resolution

### 7.2 Resolution Actions

- [ ] **FE-VC-043**: Implement "Keep mine" resolution
  - Accept the local/current branch version for a conflict
  - Update result view with local content
  - Mark conflict as resolved
- [ ] **FE-VC-044**: Implement "Keep theirs" resolution
  - Accept the remote/source branch version for a conflict
  - Update result view with remote content
  - Mark conflict as resolved
- [ ] **FE-VC-045**: Implement "Manual merge" resolution
  - Open editable view of the conflicting section
  - User manually edits to combine both versions
  - Accept the manual edit as the resolution
  - Mark conflict as resolved
- [ ] **FE-VC-046**: Implement "Accept all ours" / "Accept all theirs" batch resolution
  - Resolve all remaining conflicts with one action
  - Confirmation dialog: "Resolve all N conflicts by keeping [yours/theirs]?"
  - Useful for simple merges where one side is clearly correct

### 7.3 Conflict State Management

- [ ] **FE-VC-047**: Implement conflict state tracking
  - Track resolution state per conflict (unresolved, resolved-ours, resolved-theirs, resolved-manual)
  - Persist conflict state during resolution session (page refresh resilient)
  - Show resolution progress
- [ ] **FE-VC-048**: Implement conflict resolution undo
  - Undo a resolution: revert to unresolved state
  - Change resolution: switch from "keep mine" to "keep theirs"
  - Undo all resolutions: start over

#### Design Decisions

> **Q**: How should conflicts within a single spec be presented? As one conflict per changed section, or as one conflict per spec?
> **A**: One conflict per changed section (paragraph, heading, list, or contiguous block of changes). This gives users fine-grained control: they can accept "ours" for one paragraph and "theirs" for another within the same spec. Each conflict section is visually bounded with a conflict header ("Conflict 1 of 3") and resolution buttons.

> **Q**: Should the conflict resolution UI prevent the user from completing the merge until ALL conflicts are resolved, or allow partial resolution?
> **A**: Prevent completion until all conflicts are resolved. The "Complete merge" button is disabled with a message ("3 conflicts remaining") until every conflict has a resolution. This prevents accidentally merging with unresolved conflicts, which would leave the spec in an inconsistent state. Users can save their progress and return to the merge later.

> **Q**: Should conflicts be resolvable within the spec editor (inline), or only in a dedicated conflict resolution view?
> **A**: Dedicated conflict resolution view. The merge UI is a specialized view that shows conflicts clearly with side-by-side comparison, resolution buttons, and progress tracking. Inline conflict markers in the editor (like git's `<<<<<<<` markers) would be confusing for non-technical users. The dedicated view is accessed from the version control page when a merge has conflicts.

---

## 8. Revert Flows

### 8.1 Spec Revert

- [ ] **FE-VC-049**: Implement spec revert confirmation dialog
  - "Revert Spec '[title]' to version from [date]?"
  - Show diff: what will change (current → reverted version)
  - Light indication style for the preview diff
  - Warning: "This creates a new version. The current version will still be in history."
  - Confirm / Cancel buttons
- [ ] **FE-VC-050**: Implement spec revert execution
  - Send revert request to server
  - Server creates a new commit with the reverted content
  - Update editor with reverted content
  - Show success toast: "Spec reverted to version from [date]"
  - Undo option in toast (reverts the revert, creates another commit)

### 8.2 Document Revert

- [ ] **FE-VC-051**: Implement document revert confirmation dialog
  - "Revert all specs in '[document]' to state at [date/hash]?"
  - Show per-spec summary of what will change
  - List each spec: "Spec A: 5 lines changed, Spec B: no change, Spec C: restored from deletion"
  - Warning about creating multiple new versions
  - Confirm / Cancel
- [ ] **FE-VC-052**: Implement document revert execution
  - Revert each spec individually
  - Show progress: "Reverting spec 3 of 7..."
  - Handle partial failures: if some specs fail, report which and allow retry
  - Success: "All specs reverted to [date/hash]"

### 8.3 Edge Revert

- [ ] **FE-VC-053**: Implement edge version history
  - Per PRD: "Edges are also version controlled the same as a node"
  - Show edge version history in the edge detail view
  - Changes: type changes, metadata changes, creation/deletion
- [ ] **FE-VC-054**: Implement edge revert
  - Revert an edge to a previous type or state
  - Restore a deleted edge
  - Confirmation with preview

#### Design Decisions

> **Q**: When reverting a spec, does the revert create a new version (git revert style, preserving history) or actually remove the intervening versions (destructive reset)? Git revert (new commit) is safer and recommended.
> **A**: Git revert style — creates a new commit that restores the spec to the target version's content. All intervening versions are preserved in history. The revert commit is labeled "Revert to v12" in the timeline. This is non-destructive and allows undoing the revert if needed. Destructive reset is never exposed in the UI.

> **Q**: Should revert be undoable? If the user reverts and then regrets it, should they be able to undo the revert (by reverting the revert)?
> **A**: Yes. Since revert creates a new commit, the user can revert the revert — the previous version (before the revert) is still in the history timeline. The UI also supports Cmd+Z in the editor immediately after a revert (before navigating away) as a quick undo. The timeline clearly shows "Revert to v12" followed by "Revert to v15" if the user undoes it.

> **Q**: Should the revert confirmation show the exact diff of what will change, or just a summary? Showing the full diff helps the user make an informed decision but takes more space.
> **A**: Show the full diff in the revert confirmation dialog. The dialog has two sections: a summary header ("Reverting to v12 from Feb 25 — will modify 3 paragraphs, remove 1 heading") and a scrollable diff view showing the exact changes that will be applied. The diff uses the same lightweight styling as the version control diff view. "Revert" and "Cancel" buttons are fixed at the bottom.

> **Q**: Should there be a "soft revert" option — view the old version in the editor with an option to save it as the new version, rather than immediately creating a revert commit?
> **A**: Yes. Clicking a version in the history timeline loads it into the editor as a "preview" mode (read-only, with a yellow banner: "Viewing version v12 from Feb 25. [Restore this version] [Back to current]"). "Restore this version" creates the revert commit. "Back to current" returns to the live version. This lets users browse history and read old versions without committing to a revert.

> **Q**: The PRD says "edges are also version controlled the same as a node." Should edge version history be viewable in the UI? If so, where — in the graph detail sidebar, in a dedicated edge history view?
> **A**: In the graph detail sidebar. When an edge is selected, the sidebar shows edge details (type, source, target, created date) plus a "History" section showing the edge's version timeline. Entries include: creation, type changes, and deletion/restoration. The timeline uses the same vertical timeline component as spec history, keeping the UI consistent.

> **Q**: Should edge changes be shown in the spec's version history (since edges are associated with specs)?
> **A**: Yes. Edge changes appear in the spec's version timeline as entries: "Edge added: depends-on → [Spec B]" or "Edge type changed: related-to → derived-from for [Spec C]". They're visually distinct from content changes (graph icon instead of edit icon). This gives users complete change visibility per-spec, including relationship changes.

> **Q**: Can edges be individually reverted to a previous type or state?
> **A**: Yes. From the edge's history in the graph sidebar, users can revert an edge to a previous state (e.g., change its type back from `derived-from` to `related-to`). Like spec reverts, this creates a new version commit. Edge deletion can also be reverted (restoring a deleted edge). The revert confirmation shows what will change.

---

## 9. Commit Hash Display & Navigation

### 9.1 Hash Display

- [ ] **FE-VC-055**: Implement commit hash display conventions
  - Short hash: first 8 characters (always)
  - Full hash: in tooltip or copy action
  - Monospace font for hashes
  - Copy button next to hash display
  - Color coding: hash chip with subtle background
- [ ] **FE-VC-056**: Implement hash display in spec metadata
  - Show current commit hash in spec metadata panel
  - Label: "Version: abc12345"
  - Click: navigate to that version in history
  - Tooltip: "Commit abc12345678... — [date] by [author]"
- [ ] **FE-VC-057**: Implement hash display in document header
  - Current document version indicator
  - "Last updated: abc12345 by [author] [time ago]"
  - Click to open version history

### 9.2 Hash Navigation

- [ ] **FE-VC-058**: Implement "Go to version" input
  - Text input accepting a commit hash (partial or full)
  - Auto-complete from known hashes
  - Navigate to that version's state
  - Error handling: "Hash not found"
- [ ] **FE-VC-059**: Implement hash linking
  - Hash references in chat messages are clickable
  - Click navigates to version history at that hash
  - Hover shows commit details tooltip
- [ ] **FE-VC-060**: Implement commit detail view
  - Full commit information page
  - Commit hash (full), author, timestamp, message
  - List of all specs changed in this commit
  - Per-spec diff (expandable)
  - Actions: revert to this, create branch from this

#### Design Decisions

> **Q**: How should versions be identified to users? Git commit hashes are opaque. Should there be version numbers (v1, v2, v3) or dates, or user-friendly labels?
> **A**: Dates as the primary identifier: "Feb 28, 2:15 PM" with relative time when recent ("3 hours ago"). Version numbers (v1, v2, v3) are auto-assigned sequentially per spec for easy reference. The git commit hash is shown as a truncated 7-character string in the metadata (for power users). The timeline entry format: "v12 · Feb 28, 2:15 PM · user@example.com".

> **Q**: Should users be able to add labels/tags to specific versions (e.g., "Reviewed", "Approved", "Before major rewrite")?
> **A**: Yes. Users can add a label to any version via the version's "..." menu ("Add label"). Labels appear as colored badges on the timeline entry. System labels: "Reviewed" (blue), "Approved" (green), "Milestone" (purple). Custom labels are any text string. Labeled versions are pinned in the timeline (always visible, not collapsed into editing sessions). This helps mark significant points in a spec's evolution.

---

## 10. Version Control Integration Points

### 10.1 Editor Integration

- [ ] **FE-VC-061**: Implement version indicator in spec editor
  - Small "version" badge or link in each spec's header
  - Shows: current hash, last modified time
  - Click: opens version history for this spec
  - Gutter indicator (margin) for lines changed since last commit (optional)
- [ ] **FE-VC-062**: Implement "View history" action in editor toolbar
  - Button in the editor toolbar
  - Opens version history panel (sidebar or overlay)
  - Context: current document or focused spec
- [ ] **FE-VC-063**: Implement editor-embedded diff view
  - Toggle to show diff of current edits vs. last saved version
  - Light indications within the editor itself
  - Useful for reviewing changes before saving/committing

### 10.2 Graph Integration

- [ ] **FE-VC-064**: Implement version information on graph nodes
  - Optional overlay: show last commit hash on nodes
  - Node styling: recently changed nodes have a subtle glow
  - Edge styling: recently changed edges distinguished
- [ ] **FE-VC-065**: Implement graph time-travel (optional, advanced)
  - Slider or date picker to view graph at a point in time
  - Show which nodes/edges existed at that time
  - Useful for understanding graph evolution
  - Computationally expensive — may need server-side support

### 10.3 Chat Integration

- [ ] **FE-VC-066**: Implement version references in chat
  - Agent messages may reference specific versions: "In version abc123, this spec said..."
  - Clickable version references
  - Agent may propose reverting to a specific version

#### Design Decisions

> **Q**: Per the PRD: "A spec revision should trigger the AI to crawl the graph from that node to discover implications." Should this happen automatically on every revert, or should the user choose to trigger it?
> **A**: Automatically on every revert, per the PRD. A revert is a spec revision — the spec content changed, so the agent should crawl the graph to discover implications. The agent processes the revert asynchronously and reports findings in the chat: "I noticed you reverted [Spec Name]. Here are potential implications: [list]." The crawl is identical to what happens after any spec edit.

> **Q**: Should the agent be notified of branch creation and merges? Could the agent help with merge conflict resolution?
> **A**: Yes to both. The agent is notified of branch creation (can offer guidance: "I see you created branch 'security-refactor'. Want me to identify all security-related specs?") and merges (crawls the graph after merge to find implications of combined changes). For merge conflicts, a "Suggest resolution" button per conflict invokes the agent to propose a merged version.

> **Q**: Should the version control UI show agent-triggered changes differently from user-triggered changes in the timeline?
> **A**: Yes. Timeline entries include an author indicator: user changes show the user's avatar, agent changes show the agent's icon (bot/AI avatar). Agent entries have a distinct label: "Agent: Updated related dependencies" vs. "User: Modified introduction paragraph." The timeline can be filtered by author type ("Show only my changes" / "Show only agent changes" / "Show all").

---

## 11. Sync & Pull UI

### 11.1 Sync Status

- [ ] **FE-VC-067**: Implement sync status indicator
  - Show in header or status bar
  - States: synced, syncing, changes available, conflicts detected, offline
  - Auto-sync: periodically check for remote changes
  - Manual sync: pull button to fetch latest
- [ ] **FE-VC-068**: Implement "changes available" notification
  - When remote has new commits not yet pulled
  - Indicator: badge count of new commits
  - Tooltip: "3 new commits from 2 users"
  - Click to view changes before pulling

### 11.2 Pull Flow

- [ ] **FE-VC-069**: Implement pull changes flow
  - Fetch remote changes
  - If clean merge: auto-apply and show summary
  - If conflicts: enter conflict resolution mode
  - Show progress during pull
  - Success message with change summary
- [ ] **FE-VC-070**: Implement pull preview
  - Before pulling, show what will change
  - List of changed specs with diff previews
  - User can choose to proceed or defer
- [ ] **FE-VC-071**: Implement auto-sync toggle
  - Settings option to enable/disable auto-sync
  - When enabled: check for changes every N minutes
  - Notify user of available changes (don't auto-apply without consent)

### 11.3 Push Flow

- [ ] **FE-VC-072**: Implement push/commit flow
  - After saving specs, changes are committed locally
  - "Push" action to send commits to remote
  - Push status: pushing, pushed, failed
  - Handle push failures (remote has new commits): prompt to pull first
- [ ] **FE-VC-073**: Implement commit message for manual saves
  - Auto-generated commit messages for auto-save commits
  - Optional manual commit message for explicit saves
  - Commit message template: "[User] updated Spec: [title]"

#### Design Decisions

> **Q**: How often should the client check for remote changes? On a timer (every 30 seconds? every 5 minutes?), on user action (pull button), or via WebSocket push notification?
> **A**: WebSocket push notification as the primary mechanism. The server broadcasts change events when commits are pushed. The client receives these and shows a notification: "Remote changes available. [Pull now]". No polling timer — WebSocket provides near-instant awareness. A manual "Check for updates" button serves as fallback if WebSocket is disconnected.

> **Q**: Should remote changes be automatically applied (live sync like Google Docs), or should the user explicitly pull changes? The PRD suggests async (git-based), not real-time.
> **A**: Explicit pull. The user clicks "Pull" to fetch and apply remote changes. This aligns with the PRD's async git-based model. The notification ("Remote changes available") is persistent until the user pulls or dismisses it. Auto-pull would cause disruptive content changes while the user is reading or thinking. The user controls when their view updates.

> **Q**: What should happen when the user pulls changes that affect a spec they're currently editing? Automatically merge, prompt for resolution, or hold the pull until they save?
> **A**: Prompt for resolution. If the pull includes changes to a spec with unsaved local edits, the pull completes for all other specs, and the conflicting spec shows a merge prompt: "This spec has both local changes and remote changes. [View diff] [Keep mine] [Accept theirs] [Merge]". The editor remains usable — only the affected spec needs resolution.

> **Q**: Should "push" be automatic after each commit, or manual? Automatic push simplifies the workflow but could cause more conflicts. Manual push lets users batch changes.
> **A**: Manual push. Users explicitly push their commits when ready via a "Push" button in the header (shows a badge with unpushed commit count: "Push (3)"). This lets users batch several spec edits into a single push, review their changes before sharing, and work on experimental changes without immediately affecting others. Mirrors the git mental model.

> **Q**: Should there be a "publish" concept — commits are local until explicitly published to the shared repository?
> **A**: The push mechanism is the "publish" concept. Local commits (auto-save) are private until the user pushes. The header branch chip shows "3 unpushed" to indicate local-only changes. There's no separate "publish" action — push IS publish. This keeps the model simple with one action (push) instead of two (push + publish).

> **Q**: How should push failures (server unreachable, conflicts) be communicated? Toast notification, modal, or inline error?
> **A**: Modal for conflicts (requires user action to resolve), toast for transient errors (server unreachable, timeout). Conflict modal: "Push failed: remote has diverged. [Pull and merge] [Force push] [Cancel]". Transient error toast: "Push failed: server unreachable. Will retry automatically." with auto-retry after 10 seconds. Force push requires a confirmation dialog with a warning.

---

## 12. Accessibility

- [ ] **FE-VC-074**: Implement accessible diff view
  - Screen reader: announce "Line added: [content]", "Line removed: [content]"
  - Keyboard navigation between changes (F7/Shift+F7)
  - `aria-label` on diff regions describing the change type
  - Non-visual diff summary: "This version has 5 additions and 3 removals"
- [ ] **FE-VC-075**: Implement accessible timeline
  - Timeline as a `role="list"` with `role="listitem"` entries
  - Keyboard navigable (arrow keys between entries)
  - Screen reader: announce entry details on focus
  - Focus management: maintain focus position during timeline updates
- [ ] **FE-VC-076**: Implement accessible branch management
  - Branch selector as an accessible `role="combobox"`
  - Branch creation dialog with proper form labels
  - Conflict resolution: clear instructions and keyboard-accessible actions
  - Merge status announced via `aria-live` region
- [ ] **FE-VC-077**: Implement accessible revert confirmation
  - Confirmation dialogs with clear, descriptive content
  - Focus trapped in dialog
  - Escape to cancel
  - Confirm/cancel button labels that describe the action

---

## Additional Design Decisions

> **Q**: How many versions should the timeline load initially? 20? 50? All? If a spec has 500 versions (many auto-saves), loading all at once would be slow.
> **A**: Load the 30 most recent entries initially (after grouping auto-saves into editing sessions). "Load more" button at the bottom fetches the next 30 (cursor-based pagination). Labeled/milestone versions are always loaded regardless of pagination (they're pinned). For a spec with 500 individual commits, this displays ~50-100 grouped entries with 2-3 pagination loads.

> **Q**: Should diff computation be done server-side (more accurate, slower) or client-side (faster, requires both versions transferred)?
> **A**: Client-side. Fetch both versions as full content (small payload for text specs) and compute the diff in the browser using `diff-match-patch`. This provides instant diff mode toggling (unified ↔ split ↔ clean view) without server round-trips. The word-level diff algorithm runs in <50ms for typical spec sizes.

> **Q**: Should the version history cache version data for previously viewed versions?
> **A**: Yes. TanStack Query caches fetched version content with a `staleTime` of 5 minutes. If the user navigates back to a previously viewed version, the diff renders instantly from cache. The cache is memory-only (not persisted to localStorage) and is invalidated when the spec is modified.

---

## Summary

### Task Count by Section

| Section                                | Tasks                            |
| -------------------------------------- | -------------------------------- |
| 1. Diff View Implementation            | 10 (FE-VC-001 through FE-VC-010) |
| 2. Version History Timeline            | 8 (FE-VC-011 through FE-VC-018)  |
| 3. Spec-Level Version Navigation       | 6 (FE-VC-019 through FE-VC-024)  |
| 4. Document-Level Version Navigation   | 4 (FE-VC-025 through FE-VC-028)  |
| 5. Branch Management UI                | 6 (FE-VC-029 through FE-VC-034)  |
| 6. Merge Interface                     | 5 (FE-VC-035 through FE-VC-039)  |
| 7. Conflict Resolution UI              | 9 (FE-VC-040 through FE-VC-048)  |
| 8. Revert Flows                        | 6 (FE-VC-049 through FE-VC-054)  |
| 9. Commit Hash Display & Navigation    | 6 (FE-VC-055 through FE-VC-060)  |
| 10. Version Control Integration Points | 6 (FE-VC-061 through FE-VC-066)  |
| 11. Sync & Pull UI                     | 7 (FE-VC-067 through FE-VC-073)  |
| 12. Accessibility                      | 4 (FE-VC-074 through FE-VC-077)  |
| **TOTAL**                              | **77**                           |

> Note: Many tasks contain detailed sub-items covering states, edge cases,
> and UI variants. The diff view alone has multiple modes, navigation features,
> and computation strategies. The effective implementation effort exceeds 110
> discrete tasks.

### Definition of Done

This plan is complete when:

- [ ] Diff view shows changes with light indications (not heavy GitHub-style)
- [ ] Version history timeline loads, paginates, and filters correctly
- [ ] Per-spec version navigation works (view, compare, revert)
- [ ] Per-document version navigation works (view, compare, revert)
- [ ] Branch selector shows all branches and enables switching
- [ ] Branch creation and deletion work
- [ ] Merge interface detects conflicts and enables clean merge
- [ ] Conflict resolution UI provides keep-mine, keep-theirs, manual-merge options
- [ ] Revert flows work at spec and document level with proper confirmation
- [ ] Commit hashes are displayed, copyable, and navigable throughout the app
- [ ] Sync/pull/push flows work with proper status indicators
- [ ] Accessibility audit passes for all version control features
