# 02-FRONTEND / 06 — SPEC EDITOR PLAN

> **Purpose**: Define the complete spec document editor including markdown
> editing, spec boundary visualization, inline metadata, CRUD flows, auto-save,
> collaboration indicators, toolbar, and agent-assisted editing.
>
> **Phase**: 2 (Core Systems)
> **Dependencies**: `02-FRONTEND/02-COMPONENTS-PLAN.md`, `04-KNOWLEDGE-GRAPH/01-ARCHITECTURE-PLAN.md`
> **Estimated tasks**: 140+

---

## Table of Contents

1. [Editor Library & Architecture](#1-editor-library--architecture)
2. [Spec Document Structure](#2-spec-document-structure)
3. [Spec Boundary Visualization](#3-spec-boundary-visualization)
4. [Rich Text Editing](#4-rich-text-editing)
5. [Toolbar & Formatting Controls](#5-toolbar--formatting-controls)
6. [Spec CRUD Operations](#6-spec-crud-operations)
7. [Auto-Save & Manual Save](#7-auto-save--manual-save)
8. [Inline Spec Metadata](#8-inline-spec-metadata)
9. [Collaboration Indicators](#9-collaboration-indicators)
10. [Agent-Assisted Editing](#10-agent-assisted-editing)
11. [Spec Status & Sync Indicators](#11-spec-status--sync-indicators)
12. [Keyboard Shortcuts](#12-keyboard-shortcuts)
13. [Performance & Virtualization](#13-performance--virtualization)
14. [Accessibility](#14-accessibility)

---

## 1. Editor Library & Architecture

### 1.1 Library Selection

- [ ] **FE-EDIT-001**: Evaluate and select a rich text editor library
  - **Option A: TipTap** (built on ProseMirror)
    - Pros: Headless, highly extensible, excellent React support, active community
    - Cons: ProseMirror learning curve, extension development complexity
  - **Option B: ProseMirror** (directly)
    - Pros: Maximum control, battle-tested, used by major editors
    - Cons: Low-level, significant boilerplate, steep learning curve
  - **Option C: CodeMirror 6**
    - Pros: Excellent for code editing, great performance
    - Cons: Less suited for rich document editing, more code-oriented
  - Recommendation: **TipTap** — best balance of extensibility and developer experience for a spec document editor
- [ ] **FE-EDIT-002**: Install TipTap and required extensions
  - `@tiptap/react` — React integration
  - `@tiptap/starter-kit` — basic text editing (bold, italic, headings, lists, etc.)
  - `@tiptap/extension-placeholder` — placeholder text
  - `@tiptap/extension-collaboration` — real-time collaboration (optional, for future)
  - `@tiptap/extension-table` — table support
  - `@tiptap/extension-link` — link handling
  - `@tiptap/extension-code-block-lowlight` — syntax-highlighted code blocks
  - `@tiptap/extension-task-list` — task list checkboxes
  - `@tiptap/extension-image` — image embedding
- [ ] **FE-EDIT-003**: Create `features/documents/editor/` directory structure
  ```
  features/documents/editor/
  ├── SpecDocumentEditor.tsx       # Main editor component
  ├── SpecDocumentEditor.scss      # Editor styles
  ├── extensions/                  # Custom TipTap extensions
  │   ├── SpecBoundary.ts          # Spec boundary node extension
  │   ├── SpecLink.ts              # Graph link inline extension
  │   ├── MetadataBlock.ts         # Metadata display extension
  │   └── AgentSuggestion.ts       # Agent suggestion marks
  ├── components/                  # Editor-specific components
  │   ├── EditorToolbar.tsx
  │   ├── SpecHeader.tsx
  │   ├── FloatingMenu.tsx
  │   └── BubbleMenu.tsx
  └── hooks/                       # Editor hooks
      ├── useEditorConfig.ts
      ├── useSpecBoundaries.ts
      └── useAutoSave.ts
  ```

### 1.2 Editor Configuration

- [ ] **FE-EDIT-004**: Create `useEditorConfig` hook
  - Configure TipTap editor with all required extensions
  - Set editor content from spec document data
  - Configure autofocus behavior
  - Set up change tracking callbacks
  - Return editor instance for component use
- [ ] **FE-EDIT-005**: Create document content serialization
  - Convert TipTap JSON to spec-compatible storage format
  - Convert spec storage format to TipTap JSON
  - Handle spec boundaries as custom nodes in the document tree
  - Preserve metadata through serialization roundtrips
- [ ] **FE-EDIT-006**: Create custom schema for spec documents
  - Define document structure: sequence of spec blocks
  - Each spec block: metadata header + rich text content
  - Spec blocks are top-level nodes (cannot be nested)
  - Non-spec content (document intro, notes) as regular blocks

---

## 2. Spec Document Structure

### 2.1 Document Layout

- [ ] **FE-EDIT-007**: Implement document editor page layout
  - Document header area (title, description, actions)
  - Scrollable editor body
  - Floating toolbar (follows cursor or fixed at top)
  - Status bar at bottom (save status, word count, position)
- [ ] **FE-EDIT-008**: Implement document header editing
  - Inline editable document title (click to edit, contentEditable)
  - Document description below title (optional, editable)
  - Breadcrumb: Documents > Document Name
  - Action buttons: Save, History, Settings, Export, Share
- [ ] **FE-EDIT-009**: Implement document body as spec sequence
  - Render document as a continuous scroll of specs
  - Each spec visually separated by boundaries
  - Specs rendered in document order
  - Reorderable via drag handles or keyboard shortcuts

### 2.2 Content Model

- [ ] **FE-EDIT-010**: Define the editor content model
  ```
  Document
  ├── DocumentHeader (title, description)
  ├── SpecBlock (spec 1)
  │   ├── SpecHeader (title, metadata toggle)
  │   └── SpecContent (rich text)
  ├── SpecBlock (spec 2)
  │   ├── SpecHeader
  │   └── SpecContent
  └── AddSpecAction (insert point at end)
  ```
- [ ] **FE-EDIT-011**: Define SpecBlock as a custom TipTap node
  - Node type: `specBlock`
  - Attributes: `specId`, `title`, `status`, `collapsed`
  - Content: `specHeader specContent`
  - Behavior: cannot be deleted with backspace (requires explicit action)
  - Draggable: yes (for reordering)
- [ ] **FE-EDIT-012**: Define SpecContent as a custom TipTap node
  - Contains standard rich text (paragraphs, headings, lists, code, etc.)
  - Content is the spec's knowledge content
  - Changes to content trigger spec-level save

---

## 3. Spec Boundary Visualization

### 3.1 Boundary Rendering

- [ ] **FE-EDIT-013**: Implement spec boundary visual style
  - Colored left border (accent color per spec or document theme)
  - Compact header bar at the top of each spec
  - Subtle background tint for the entire spec block (alternating shades optional)
  - Hover highlight to show which spec is being edited
- [ ] **FE-EDIT-014**: Implement spec header bar within boundaries
  - Spec title (editable inline)
  - Collapse/expand toggle icon
  - Drag handle for reordering
  - Status indicator (modified, synced, conflicted)
  - Quick action menu (three-dot icon)
- [ ] **FE-EDIT-015**: Implement spec boundary hover state
  - When cursor enters a spec block, highlight the boundary
  - Show the spec header actions more prominently
  - Show "Add spec below" insertion point between specs
- [ ] **FE-EDIT-016**: Implement spec block collapse/expand
  - Collapsed: show header only with word count and preview
  - Expanded: show full content
  - Animated transition (height animation)
  - Persist collapse state per session (not per spec)
  - "Collapse all" / "Expand all" actions in document toolbar

### 3.2 Spec Insertion Points

- [ ] **FE-EDIT-017**: Implement "Add spec" insertion points
  - Visible between specs on hover
  - Subtle "+" button or dashed line
  - Click to insert new empty spec at that position
  - Dropdown: "New empty spec", "Generate with agent", "Import"
- [ ] **FE-EDIT-018**: Implement spec insertion at document end
  - Always-visible "Add spec" button at the bottom of the document
  - More prominent than inter-spec insertion points
  - Same options as inter-spec insertion
- [ ] **FE-EDIT-019**: Implement spec insertion via keyboard
  - `Ctrl+Shift+Enter` at the end of a spec: insert new spec below
  - New spec starts with cursor in title field
  - Undo reverts the insertion

### 3.3 Spec Reordering

- [ ] **FE-EDIT-020**: Implement drag-and-drop spec reordering
  - Drag handle on spec header
  - Visual feedback: dragged spec ghost, drop target indicator
  - Reorder within same document only
  - Update document spec order on server
  - Undo support for reordering
- [ ] **FE-EDIT-021**: Implement keyboard-based spec reordering
  - `Alt+Up/Down` to move current spec up/down in the document
  - Visual feedback during move
  - Announce move to screen readers

---

## 4. Rich Text Editing

### 4.1 Block-Level Formatting

- [ ] **FE-EDIT-022**: Implement heading levels (H1-H4 within spec content)
  - H1-H4 available (H1-H2 for major sections, H3-H4 for subsections)
  - Keyboard shortcuts: Ctrl+1 through Ctrl+4
  - Heading ID generation for in-spec linking
- [ ] **FE-EDIT-023**: Implement paragraph formatting
  - Default text block
  - Support for alignment (left, center, right) — optional
  - Support for indentation levels
- [ ] **FE-EDIT-024**: Implement list types
  - Unordered lists (bullet)
  - Ordered lists (numbered)
  - Task lists (checkboxes)
  - Nested lists (indentation with Tab/Shift+Tab)
- [ ] **FE-EDIT-025**: Implement code blocks
  - Fenced code blocks with language selection
  - Syntax highlighting (lowlight/highlight.js integration)
  - Language selector dropdown
  - Copy button
  - Line numbers (optional toggle)
- [ ] **FE-EDIT-026**: Implement blockquotes
  - Styled quote blocks with left border
  - Keyboard shortcut or toolbar button
- [ ] **FE-EDIT-027**: Implement horizontal rules
  - Visual divider within spec content
  - NOT confused with spec boundaries
- [ ] **FE-EDIT-028**: Implement tables
  - Create/edit tables within spec content
  - Add/remove rows and columns
  - Merge cells (optional)
  - Header row styling
  - Responsive: horizontal scroll for wide tables

### 4.2 Inline Formatting

- [ ] **FE-EDIT-029**: Implement inline text formatting
  - Bold: `Ctrl+B`
  - Italic: `Ctrl+I`
  - Underline: `Ctrl+U` (optional — not standard in markdown)
  - Strikethrough: toolbar button or `~~text~~`
  - Inline code: `Ctrl+E` or backtick
  - Highlight/mark: toolbar button (background color)
- [ ] **FE-EDIT-030**: Implement link editing
  - Detect URLs and auto-link
  - Manual link: select text → Ctrl+K → enter URL
  - Link popover on click: URL, edit, open, remove link
  - External links open in new tab
- [ ] **FE-EDIT-031**: Implement image embedding
  - Insert from toolbar or paste
  - Upload to server and embed URL
  - Inline display with configurable size
  - Alt text field (accessibility)
  - Alignment options (inline, center, full-width)
  - Click to view full size
- [ ] **FE-EDIT-032**: Implement spec reference links (custom inline mark)
  - Reference other specs within content
  - Syntax: `[[Spec Title]]` or via autocomplete
  - Rendered as styled link/chip
  - Click to navigate to referenced spec
  - Tooltip showing spec preview on hover
  - Validated: warn if referenced spec doesn't exist

### 4.3 Markdown Shortcuts

- [ ] **FE-EDIT-033**: Implement markdown input shortcuts
  - `# ` → heading 1
  - `## ` → heading 2
  - `- ` or `* ` → unordered list
  - `1. ` → ordered list
  - `> ` → blockquote
  - ``` → code block
  - `---` → horizontal rule
  - `[ ] ` → task list item
  - `**text**` → bold
  - `*text*` → italic
  - `` `text` `` → inline code
- [ ] **FE-EDIT-034**: Implement paste handling
  - Paste plain text: preserve as-is
  - Paste rich text (from Word, etc.): convert to editor format, strip excessive formatting
  - Paste images: upload and embed
  - Paste URLs: auto-create links
  - Paste markdown: convert to rich text

---

## 5. Toolbar & Formatting Controls

### 5.1 Main Toolbar

- [ ] **FE-EDIT-035**: Implement fixed editor toolbar
  - Position: fixed at top of editor area (below document header)
  - Scroll with document or stay fixed (configurable)
  - Responsive: collapse to dropdown on narrow widths
- [ ] **FE-EDIT-036**: Implement toolbar sections
  - **Text formatting**: Bold, Italic, Strikethrough, Code
  - **Block types**: Heading dropdown (H1-H4), Paragraph
  - **Lists**: Bullet, Numbered, Task list
  - **Insert**: Link, Image, Code block, Table, Horizontal rule, Spec reference
  - **Agent**: Ask agent, Improve, Split spec
  - **Utilities**: Undo, Redo
- [ ] **FE-EDIT-037**: Implement toolbar state reflecting cursor context
  - Bold button active when cursor is in bold text
  - Heading dropdown shows current heading level
  - List buttons active when cursor is in a list
  - Toolbar updates on cursor movement (debounced)

### 5.2 Floating Menu

- [ ] **FE-EDIT-038**: Implement floating menu (appears on empty line)
  - Shows when cursor is on an empty line/paragraph
  - "+" button or minimal menu
  - Quick actions: heading, list, code block, image, table, spec reference
  - Dismiss on text input or Escape
- [ ] **FE-EDIT-039**: Implement bubble menu (appears on text selection)
  - Shows when text is selected
  - Formatting options: bold, italic, strikethrough, code, link
  - Position: above or below the selection
  - Dismiss on deselect

---

## 6. Spec CRUD Operations

### 6.1 Create Spec

- [ ] **FE-EDIT-040**: Implement new spec creation
  - Create empty spec in the document at specified position
  - Generate unique spec ID
  - Set current user as author
  - Focus cursor in spec title field
  - Optimistic UI: show spec immediately, sync to server
- [ ] **FE-EDIT-041**: Implement spec creation via agent
  - Agent generates spec content and proposes in chat
  - User accepts → spec created in document
  - User edits → modified content saved
  - Positioned at the agent's suggested location
- [ ] **FE-EDIT-042**: Implement spec creation from text selection
  - Select text in one spec → "Extract to new spec" action
  - Selected content becomes the new spec's content
  - Original spec has the text replaced with a spec reference link
  - New spec positioned below the original

### 6.2 Edit Spec

- [ ] **FE-EDIT-043**: Implement inline spec content editing
  - Direct editing within the document view
  - Each keystroke updates the local spec state
  - Changes tracked per spec (not per document)
  - Change detection: compare current content to last saved version
- [ ] **FE-EDIT-044**: Implement spec title editing
  - Inline editable title in spec header
  - Click to focus, Enter to confirm, Escape to cancel
  - Title change updates the spec and graph node
- [ ] **FE-EDIT-045**: Implement spec tag editing within editor
  - Tag chips below spec header
  - Click "+" to add new tag
  - Click tag "x" to remove
  - Auto-suggest existing tags

### 6.3 Delete Spec

- [ ] **FE-EDIT-046**: Implement spec deletion
  - Via spec header context menu: "Delete spec"
  - Confirmation dialog: "Delete this spec? This will also remove its graph node and edges."
  - Show affected edges and linked specs in confirmation
  - Soft delete: spec removed from document, git records the deletion
  - Undo available (toast with "Undo" action, 10-second window)
- [ ] **FE-EDIT-047**: Implement spec deletion edge cases
  - Spec with linked gen UIs: warn about orphaned gen UIs
  - Spec with permission grants: warn about access changes
  - Last spec in document: warn that document will be empty

### 6.4 Move/Duplicate Spec

- [ ] **FE-EDIT-048**: Implement spec move between documents
  - Context menu: "Move to..." → document selector
  - Spec removed from current document, added to target
  - Graph node preserved, edges preserved
  - Undo available
- [ ] **FE-EDIT-049**: Implement spec duplication
  - Context menu: "Duplicate"
  - New spec with same content, new ID
  - Positioned below the original
  - Duplicate has "derived-from" edge to original (optional, confirm with user)

---

## 7. Auto-Save & Manual Save

### 7.1 Auto-Save

- [ ] **FE-EDIT-050**: Implement auto-save mechanism
  - Debounced save: trigger after 2 seconds of inactivity
  - Save only the changed specs (not entire document)
  - Show "Saving..." indicator in status bar
  - Show "Saved" with timestamp on success
  - Show "Error saving" with retry on failure
- [ ] **FE-EDIT-051**: Implement auto-save conflict detection
  - Before saving, check if spec has been modified on server since last fetch
  - If conflict detected: pause auto-save, show conflict indicator
  - User must resolve conflict before saves continue
- [ ] **FE-EDIT-052**: Implement auto-save optimistic strategy
  - Save spec content to server via PATCH
  - On success: update last-saved timestamp
  - On conflict (409): show conflict resolution UI
  - On error (5xx): retry with exponential backoff (max 3 attempts)
  - On network error: queue for retry, show offline indicator

### 7.2 Manual Save

- [ ] **FE-EDIT-053**: Implement manual save action
  - `Ctrl+S` shortcut
  - Save button in document header
  - Save all changed specs in the document
  - Confirm save with toast or status bar update
  - Disable save button when no unsaved changes
- [ ] **FE-EDIT-054**: Implement "Save all" behavior
  - Saves all specs with pending changes
  - Batched request to server
  - Reports per-spec save results
  - Handles partial failures (some specs save, others fail)

### 7.3 Undo/Redo

- [ ] **FE-EDIT-055**: Implement undo/redo within spec content
  - TipTap provides built-in undo/redo for editor content
  - `Ctrl+Z` / `Ctrl+Shift+Z`
  - Undo stack per spec (editing one spec doesn't affect another)
- [ ] **FE-EDIT-056**: Implement undo for spec operations
  - Undo spec creation (remove the spec)
  - Undo spec deletion (restore the spec)
  - Undo spec reordering (restore previous order)
  - Toast-based undo for destructive operations (10-second window)

---

## 8. Inline Spec Metadata

### 8.1 Metadata Display

- [ ] **FE-EDIT-057**: Implement spec metadata in header bar
  - Compact display: spec title, status dot, tags
  - Hover: show more details (author, dates, ID)
  - Click on metadata: expand to full metadata panel
- [ ] **FE-EDIT-058**: Implement spec metadata popover
  - Click on spec header → popover with full metadata
  - Fields: ID (copyable), Author, Created date, Modified date, Version, Commit hash, Permission level
  - Edit: tags, title, permission level
  - Actions: View in graph, View history, Share
- [ ] **FE-EDIT-059**: Implement spec ID display
  - Short ID shown in header (first 8 chars)
  - Click to copy full ID
  - Tooltip showing full ID
  - Monospace font for IDs

### 8.2 Tag Display

- [ ] **FE-EDIT-060**: Implement inline tag display
  - Tag chips in spec header bar
  - Color-coded by tag category (if categories defined)
  - Click tag to filter document to specs with that tag
  - Add tag: "+" button opens tag input
  - Remove tag: "x" on tag chip (with confirmation)
- [ ] **FE-EDIT-061**: Implement tag auto-complete
  - Suggest existing project tags as user types
  - Create new tag if no match
  - Recently used tags shown first

### 8.3 Permission Display

- [ ] **FE-EDIT-062**: Implement permission indicator per spec
  - Icon or badge showing permission level (full, summary)
  - Private specs: lock icon with tooltip "Restricted access"
  - Click: open permission management popover
  - Shows who has access (avatar list)
- [ ] **FE-EDIT-063**: Implement summary-only view for restricted specs
  - If user has summary access, show only the generated summary
  - Summary displayed in a distinct style (muted, italic, "Summary view" label)
  - "Request access" button
  - Cannot edit summary-only specs

---

## 9. Collaboration Indicators

- [ ] **FE-EDIT-064**: Implement "last modified by" indicator per spec
  - Show avatar and name of the last user to modify each spec
  - Timestamp: "Modified by X, 2 hours ago"
  - Visible in spec header (compact) or metadata panel (detailed)
- [ ] **FE-EDIT-065**: Implement "remote changes available" indicator
  - When another user has pushed changes to a spec
  - Indicator on the spec header (sync icon + badge)
  - Click to view remote changes (diff)
  - Option to merge remote changes
- [ ] **FE-EDIT-066**: Implement contributor list per document
  - Show all users who have contributed to the current document
  - Avatar stack in document header
  - Click to see contribution details per user
- [ ] **FE-EDIT-067**: Implement change notification
  - When a spec the user is viewing receives a remote change
  - Subtle banner or toast: "Spec X has been updated by User Y"
  - Action: "View changes" → diff view
  - Action: "Accept changes" → merge

---

## 10. Agent-Assisted Editing

### 10.1 Agent Actions in Editor

- [ ] **FE-EDIT-068**: Implement "Ask agent about this spec" action
  - Button in spec header or toolbar
  - Opens chat with context set to the current spec
  - Prefilled message: "Tell me about this spec"
  - Agent analyzes and responds in chat
- [ ] **FE-EDIT-069**: Implement "Improve this spec" action
  - Agent rewrites or enhances spec content
  - Proposed changes shown as a diff within the spec
  - Accept / Reject / Edit options
  - Changes applied on accept
- [ ] **FE-EDIT-070**: Implement "Split this spec" action
  - Agent analyzes spec content and suggests split points
  - Preview: show proposed new specs with boundaries
  - Accept: original spec replaced with multiple new specs
  - Edges created between new specs and existing graph

### 10.2 Agent Suggestions

- [ ] **FE-EDIT-071**: Implement inline agent suggestions
  - Agent may suggest edits to spec content
  - Shown as highlighted text with "suggestion" mark
  - Accept/reject per suggestion
  - Accept all / Reject all actions
  - Suggestions appear subtly (not disruptive)
- [ ] **FE-EDIT-072**: Implement agent-proposed tags
  - Agent suggests tags for a spec based on content analysis
  - Shown as suggested tags below existing tags
  - One-click add or dismiss
- [ ] **FE-EDIT-073**: Implement agent-proposed edges
  - Agent discovers related specs and proposes edges
  - Notification in spec header: "3 suggested connections"
  - Click to view suggested edges with explanations
  - Accept/reject per edge

---

## 11. Spec Status & Sync Indicators

- [ ] **FE-EDIT-074**: Implement spec-level status indicators
  - **Synced** (green dot): spec content matches server, no pending changes
  - **Modified** (yellow dot): spec has unsaved local changes
  - **Saving** (blue spinner): save in progress
  - **Conflicted** (red dot): local and remote changes diverge
  - **Error** (red exclamation): save failed
- [ ] **FE-EDIT-075**: Implement document-level status bar
  - Bottom of editor area
  - Show: total specs, unsaved count, word count, cursor position
  - Save status: "All changes saved" / "2 specs with unsaved changes"
  - Last sync time
- [ ] **FE-EDIT-076**: Implement conflict resolution flow
  - Conflict detected: spec header shows conflict indicator
  - Click: opens conflict resolution panel
  - Show: local version, remote version, diff between them
  - Options: keep mine, keep theirs, merge manually
  - After resolution: save merged version

---

## 12. Keyboard Shortcuts

- [ ] **FE-EDIT-077**: Implement editor keyboard shortcuts
  - Text formatting: `Ctrl+B` (bold), `Ctrl+I` (italic), `Ctrl+E` (code), `Ctrl+K` (link)
  - Block types: `Ctrl+1-4` (headings), `Ctrl+Shift+8` (bullet list), `Ctrl+Shift+9` (ordered list)
  - Actions: `Ctrl+S` (save), `Ctrl+Z` (undo), `Ctrl+Shift+Z` (redo)
  - Navigation: `Ctrl+Home` (top of doc), `Ctrl+End` (bottom of doc)
  - Spec operations: `Ctrl+Shift+Enter` (new spec), `Alt+Up/Down` (reorder spec)
  - Search: `Ctrl+F` (find in document), `Ctrl+H` (find and replace)
- [ ] **FE-EDIT-078**: Implement slash commands within editor
  - Type `/` at the start of an empty line
  - Show command menu: heading, list, code, image, table, spec link, divider
  - Filter by typing
  - Select with Enter or click
- [ ] **FE-EDIT-079**: Implement find and replace
  - `Ctrl+F` opens search bar at top of editor
  - Highlight all matches
  - Navigate: next/previous match
  - Replace: single or all
  - Regex support (optional)
  - Scope: current spec or entire document

---

## 13. Performance & Virtualization

- [ ] **FE-EDIT-080**: Implement spec-level lazy rendering
  - For documents with many specs (20+), only render visible specs
  - Use intersection observer to detect visibility
  - Collapsed specs render as lightweight placeholders
  - Expanded specs render full editor on scroll into view
- [ ] **FE-EDIT-081**: Implement content change debouncing
  - Debounce content change events (100ms)
  - Prevent excessive re-renders during fast typing
  - Batch state updates
- [ ] **FE-EDIT-082**: Implement editor memory management
  - Destroy TipTap editor instances for non-visible specs
  - Recreate on scroll back into view with preserved content
  - Cache content in store to avoid re-fetching
- [ ] **FE-EDIT-083**: Implement large document performance
  - Test with 50+ specs in a single document
  - Profile rendering performance
  - Implement workarounds if performance degrades (pagination, virtual scrolling)

---

## 14. Accessibility

- [ ] **FE-EDIT-084**: Implement accessible editor structure
  - Editor area: `role="textbox"`, `aria-multiline="true"`, `aria-label="Spec content editor"`
  - Spec blocks: `role="region"`, `aria-label="Spec: [title]"`
  - Toolbar: `role="toolbar"`, keyboard navigable with arrow keys
  - Buttons: all have `aria-label` or visible text
- [ ] **FE-EDIT-085**: Implement keyboard-only editing
  - All formatting via keyboard shortcuts
  - All spec operations via keyboard (create, delete, reorder)
  - Tab navigation between spec blocks
  - Focus management when specs are added/removed/reordered
- [ ] **FE-EDIT-086**: Implement screen reader support
  - Announce spec boundary transitions
  - Announce formatting changes
  - Announce save status changes
  - Announce spec operations (created, deleted, reordered)
- [ ] **FE-EDIT-087**: Implement focus management
  - Focus moves to new spec when created
  - Focus returns to previous spec when one is deleted
  - Focus preserved during spec reordering
  - Skip navigation: jump between spec headers

---

## Summary

### Task Count by Section

| Section | Tasks |
|---------|-------|
| 1. Editor Library & Architecture | 6 (FE-EDIT-001 through FE-EDIT-006) |
| 2. Spec Document Structure | 6 (FE-EDIT-007 through FE-EDIT-012) |
| 3. Spec Boundary Visualization | 9 (FE-EDIT-013 through FE-EDIT-021) |
| 4. Rich Text Editing | 13 (FE-EDIT-022 through FE-EDIT-034) |
| 5. Toolbar & Formatting Controls | 5 (FE-EDIT-035 through FE-EDIT-039) |
| 6. Spec CRUD Operations | 10 (FE-EDIT-040 through FE-EDIT-049) |
| 7. Auto-Save & Manual Save | 7 (FE-EDIT-050 through FE-EDIT-056) |
| 8. Inline Spec Metadata | 7 (FE-EDIT-057 through FE-EDIT-063) |
| 9. Collaboration Indicators | 4 (FE-EDIT-064 through FE-EDIT-067) |
| 10. Agent-Assisted Editing | 6 (FE-EDIT-068 through FE-EDIT-073) |
| 11. Spec Status & Sync Indicators | 3 (FE-EDIT-074 through FE-EDIT-076) |
| 12. Keyboard Shortcuts | 3 (FE-EDIT-077 through FE-EDIT-079) |
| 13. Performance & Virtualization | 4 (FE-EDIT-080 through FE-EDIT-083) |
| 14. Accessibility | 4 (FE-EDIT-084 through FE-EDIT-087) |
| **TOTAL** | **87** |

> Note: Many tasks contain numerous sub-items covering formatting options,
> edge cases, and keyboard behaviors. The effective implementation effort
> exceeds 140 discrete tasks.

### Definition of Done

This plan is complete when:
- [ ] TipTap editor renders spec documents with clear spec boundaries
- [ ] All rich text formatting works (headings, lists, code, tables, links, images)
- [ ] Spec CRUD operations work within the editor
- [ ] Auto-save triggers reliably with conflict detection
- [ ] Spec metadata is viewable and editable inline
- [ ] Collaboration indicators show remote changes
- [ ] Agent-assisted features are accessible from the editor
- [ ] Keyboard shortcuts cover all editor operations
- [ ] Editor performs well with 50+ specs in a document
- [ ] Screen reader users can navigate and edit specs
