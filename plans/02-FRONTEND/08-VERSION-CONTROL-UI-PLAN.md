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

## Summary

### Task Count by Section

| Section | Tasks |
|---------|-------|
| 1. Diff View Implementation | 10 (FE-VC-001 through FE-VC-010) |
| 2. Version History Timeline | 8 (FE-VC-011 through FE-VC-018) |
| 3. Spec-Level Version Navigation | 6 (FE-VC-019 through FE-VC-024) |
| 4. Document-Level Version Navigation | 4 (FE-VC-025 through FE-VC-028) |
| 5. Branch Management UI | 6 (FE-VC-029 through FE-VC-034) |
| 6. Merge Interface | 5 (FE-VC-035 through FE-VC-039) |
| 7. Conflict Resolution UI | 9 (FE-VC-040 through FE-VC-048) |
| 8. Revert Flows | 6 (FE-VC-049 through FE-VC-054) |
| 9. Commit Hash Display & Navigation | 6 (FE-VC-055 through FE-VC-060) |
| 10. Version Control Integration Points | 6 (FE-VC-061 through FE-VC-066) |
| 11. Sync & Pull UI | 7 (FE-VC-067 through FE-VC-073) |
| 12. Accessibility | 4 (FE-VC-074 through FE-VC-077) |
| **TOTAL** | **77** |

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
