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

#### Design Decisions

> **Q**: Should the editor use TipTap (recommended), ProseMirror (direct), or CodeMirror? TipTap provides the best developer experience but adds a dependency layer over ProseMirror. CodeMirror is better for code but less suited for rich documents.
> **A**: Use TipTap. It provides a significantly better developer experience over raw ProseMirror: declarative extension API, React integration via `@tiptap/react`, built-in support for common formatting, and an active ecosystem of extensions. The abstraction layer's cost is minimal (~15KB over ProseMirror core). CodeMirror is wrong for rich document editing — it's a code editor.

> **Q**: Should the editor support WYSIWYG mode only, or also a raw markdown mode (split pane: source + preview)? Some power users prefer editing raw markdown.
> **A**: WYSIWYG only for MVP. TipTap renders rich text that feels like markdown (headings, bold, lists render inline) without showing raw syntax. This matches the PRD's "markdown-like editing" description — it should feel like markdown but render visually. A raw markdown toggle can be added as a Phase 2 feature for power users. The underlying content is stored as markdown, so round-tripping is lossless.

> **Q**: Is real-time collaborative editing (multiple users editing the same spec simultaneously) a requirement, or is the async git-based approach sufficient? TipTap supports Yjs collaboration, but it adds significant complexity.
> **A**: Async git-based approach is sufficient. The PRD explicitly specifies "async git-based collaboration (no real-time co-editing)." Do not implement Yjs or CRDTs. Users work on their own branches and merge via the version control system. If two users edit the same spec, the second to save encounters a conflict handled by the merge flow.

> **Q**: How heavily should the editor be customized? Minimal (use TipTap starter kit defaults) or extensive (custom node types for specs, metadata blocks, and agent suggestions)?
> **A**: Moderate customization. Use TipTap's StarterKit for standard formatting (headings, bold, italic, lists, code blocks, blockquotes). Add custom extensions for: spec boundary nodes (custom ProseMirror node type that renders the header bar + left border), inline spec references (custom marks that render as clickable chips), and agent suggestion highlights (custom decoration plugin). No custom nodes for metadata — metadata lives outside the editor content.

> **Q**: Should the editor support custom block types beyond standard markdown? For example: callout boxes, embedded diagrams, or interactive widgets?
> **A**: Callout boxes yes (as a TipTap extension — useful for notes, warnings, and important callouts in specs). Embedded diagrams deferred (add Mermaid rendering as a Phase 2 extension). No interactive widgets inside the editor — that's the gen UI system's role. Keep the editor focused on structured text with light formatting enhancements.

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

#### Design Decisions

> **Q**: Should the document have a table of contents (auto-generated from spec titles)?
> **A**: Yes. The document outline panel (collapsible, left margin of the editor area) auto-generates from spec titles. It shows spec titles with status badges and indentation based on heading level within specs. Clicking navigates to the spec. This doubles as the table of contents and is essential for documents with more than 5-6 specs.

> **Q**: Should the document support "comments" (annotations by users or agents that are separate from spec content)?
> **A**: Deferred to Phase 2. Comments add significant complexity (annotation positioning, comment threads, resolution workflow). For MVP, the chat serves as the discussion channel for spec feedback. The agent can reference specific specs in chat messages. Phase 2 can add inline comments using TipTap's `@tiptap/extension-collaboration` annotation features.

> **Q**: Should the document be exportable as a single markdown file? As PDF?
> **A**: Yes, export as Markdown. The document renders to a single `.md` file with spec boundaries marked by horizontal rules and spec titles as headings. Metadata is included as YAML front matter per spec. No PDF export for MVP — it requires a rendering pipeline (e.g., Puppeteer). Markdown export is sufficient for sharing and external tooling.

> **Q**: Should there be a "print view" for the document?
> **A**: Not for MVP. Users can use the browser's native print (Cmd+P) which will render the editor content adequately with a print CSS stylesheet (`@media print` that hides chrome and optimizes layout). A dedicated print view is low priority for a digital-first tool.

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

#### Design Decisions

> **Q**: How should spec boundaries be visually indicated? The plan suggests colored left borders and header bars. Other options: horizontal rules between specs (simple but less distinctive), card-like containers per spec (clear but heavy), alternating background colors (subtle but easy), collapsible accordion sections (compact but hides content). Which best matches the "structured markdown document" feel from the PRD?
> **A**: Colored left border (3px solid, neutral-300 default, colored by spec status) + spec header bar. The header bar contains the spec title, status badge, and a collapse/expand toggle. A subtle 1px horizontal divider sits between specs. This creates clear boundaries without the heaviness of cards or the loss of content from accordions. It feels like a structured markdown document with section headers.

> **Q**: Should spec boundaries be editable — can users merge two specs by deleting the boundary between them, or split a spec by inserting a boundary?
> **A**: Split: yes, via a "Split spec here" action (context menu or `/split` slash command) that creates a new spec boundary at the cursor position. Merge: via selecting two adjacent specs and choosing "Merge specs" from the context menu. No boundary drag-editing — it's too imprecise for a structural operation. Both split and merge create new version commits.

> **Q**: Should the boundary show a preview of the spec's graph connections (e.g., "3 edges: 2 depends-on, 1 related-to")?
> **A**: Not in the boundary itself — that would clutter the header bar. Instead, show a small connection count badge (e.g., "5 connections") in the spec header. Clicking the badge opens a popover listing all edges with their types and target spec names. Hovering the badge highlights the spec's connections in the graph panel (if visible).

> **Q**: What information should the spec header show by default? Title only? Title + status? Title + tags + status? More detail might be useful but takes vertical space.
> **A**: Title + status badge + connection count badge. Three compact elements in a single 36px-height header bar. Tags, author, and dates are shown in a metadata popover on click of the "..." menu or on hover. This keeps vertical space minimal while showing the most important at-a-glance info (what it is, its state, how connected it is).

> **Q**: Should the spec header be sticky (fixed at top when scrolling within a long spec)?
> **A**: Yes. When scrolling within a long spec (content exceeds viewport height), the spec header sticks to the top of the editor viewport with a subtle shadow to indicate it's elevated. This ensures the user always knows which spec they're currently reading/editing. The sticky header unsticks when the user scrolls past the spec boundary into the next spec.

> **Q**: Should the spec ID be visible in the header, or only in the metadata popover?
> **A**: Only in the metadata popover. Spec IDs are internal identifiers (commit hashes or UUIDs) that are not meaningful to most users. Power users who need the ID can find it in the metadata popover or via the "Copy spec ID" action in the "..." menu. Showing IDs in the header wastes space and adds visual noise.

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
  - ```→ code block

    ```

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

#### Design Decisions

> **Q**: What subset of markdown formatting should be supported? Full GitHub-Flavored Markdown (GFM), or a restricted subset? Tables, footnotes, and math equations each add complexity.
> **A**: Full GFM minus footnotes. Support: headings (h1-h4), bold, italic, strikethrough, inline code, code blocks with syntax highlighting, links, images, ordered/unordered lists, task lists (checkboxes), blockquotes, horizontal rules, and tables. Tables are essential for structured specs. Footnotes are rarely needed and add complexity. This covers 95% of technical documentation needs.

> **Q**: Should the editor support mathematical notation (LaTeX/KaTeX)? This is useful for technical specs but adds rendering complexity.
> **A**: Deferred to Phase 2. Math notation is useful for a subset of technical specs but adds a significant dependency (KaTeX is ~300KB) and custom TipTap extension work. For MVP, users can use inline code for simple formulas or embed images of equations. Add KaTeX rendering as an optional TipTap extension when demand justifies it.

> **Q**: Should the editor support diagrams (Mermaid, PlantUML)? This would allow inline flowcharts and sequence diagrams, which are valuable for technical specs.
> **A**: Deferred to Phase 2. Mermaid support requires a rendering step (server-side or client-side WASM) and a custom TipTap node type. For MVP, users can embed pre-rendered diagram images. Plan for Mermaid as a TipTap extension that renders diagram code blocks into inline SVGs. PlantUML is deprioritized (requires a Java server).

> **Q**: How should images be handled? Upload to server and store URL, or embed as base64? Server upload is better for performance but requires API support.
> **A**: Upload to server and store URL. Images are uploaded via a `/api/media/upload` endpoint, stored on the server filesystem (or S3 in production), and referenced by URL in the spec content. Base64 embedding bloats the document JSON and degrades editor performance. The upload happens automatically on paste or drag-drop, with a progress indicator inline.

> **Q**: Should the editor support video/audio embedding, or only images? The PRD mentions mixed media but says media is not a spec itself.
> **A**: Images inline in the editor, video/audio as linked attachments only. Inline video/audio would significantly complicate the editor and auto-save (large binary content). Users can attach video/audio files to a spec via a metadata panel (stored as media associations per the PRD), which appear as downloadable links below the spec content. The spec content itself supports only images.

> **Q**: What is the maximum file size for embedded media?
> **A**: 10MB per image. Images above 5MB trigger a suggestion to compress/resize. The server rejects uploads above 10MB with a clear error. For video/audio attachments (via spec metadata, not inline), the limit is 100MB. These limits are configurable server-side per deployment.

> **Q**: When pasting content from external sources (Word, Google Docs, web pages), how aggressively should formatting be stripped? Keep basic formatting (bold, italic, lists) and strip everything else?
> **A**: Keep basic formatting: bold, italic, headings, links, ordered/unordered lists, and code blocks. Strip everything else: fonts, colors, custom spacing, tables from Word (they rarely paste cleanly), embedded objects, and inline styles. TipTap's `@tiptap/extension-paste-rules` handles this. A "Paste as plain text" option (Cmd+Shift+V) strips all formatting.

> **Q**: Should pasting HTML be supported at all, or should it always be converted to plain text / markdown?
> **A**: HTML paste is supported with the formatting filter described above. TipTap natively handles HTML → ProseMirror document conversion. The filtered paste preserves the user's intent (structured content) while removing visual styling that doesn't fit the design system. Users who want raw text use Cmd+Shift+V.

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

#### Design Decisions

> **Q**: Should specs be movable between documents via drag-and-drop (drag from editor to document tree), or only through a menu action?
> **A**: Menu action only. Drag-and-drop from the editor to the sidebar document tree is error-prone (long drag distance, easy to drop on the wrong document). The "Move to..." menu action (in the spec header's "..." menu) opens a document picker dialog where the user selects the target document and position. This is more precise and harder to trigger accidentally.

> **Q**: Should the editor support cross-document spec references (linking to a spec in another document)?
> **A**: Yes. Specs can reference specs in any document — this is fundamental to the knowledge graph. References are created by: typing `@` to open a spec search popover (searches all specs across documents), or by the agent inserting references in proposals. Cross-document references render as clickable chips showing `[Document Name / Spec Title]`. Clicking navigates to that spec.

> **Q**: When a spec is moved to another document, should its graph edges be preserved, modified, or reviewed?
> **A**: Preserved. Graph edges connect specs, not documents. Moving a spec to a different document is a structural change to the document, not a semantic change to the knowledge graph. All edges remain intact. The agent is notified of the move and may proactively suggest reviewing edges if the new document context changes the spec's meaning.

> **Q**: Should there be spec templates (e.g., "Requirement", "Design Decision", "Constraint") that pre-populate the spec with a structure?
> **A**: Yes. System-provided templates: "Requirement" (title, description, acceptance criteria, priority), "Design Decision" (context, decision, consequences, alternatives), "Constraint" (description, rationale, impact), "User Story" (as a, I want, so that, acceptance criteria), and "Technical Note" (overview, details, references). Users select a template when creating a new spec.

> **Q**: If templates exist, should they be system-provided, user-created, or both?
> **A**: Both. System-provided templates ship by default (5-6 templates covering common patterns). Users can create custom templates from any existing spec via "Save as template" in the spec's "..." menu. Custom templates are stored per-project and appear alongside system templates in the "New spec" dialog. This enables teams to standardize their spec formats.

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

#### Design Decisions

> **Q**: What should the auto-save debounce interval be? 1 second (fast, more network traffic), 2 seconds (recommended), 5 seconds (fewer saves, risk of more data loss)?
> **A**: 2-second debounce. This balances data safety with network efficiency. After the user stops typing for 2 seconds, the current spec content is sent to the server. A "Saving..." → "Saved" indicator in the editor header provides feedback. If the user is continuously typing, the auto-save triggers at a maximum interval of 10 seconds regardless of debounce.

> **Q**: Should auto-save happen per-spec (only save the spec that changed) or per-document (save all specs in the document)? Per-spec is more efficient but requires tracking changes at spec granularity.
> **A**: Per-spec. Only the spec whose content changed is sent to the server. TipTap's `onUpdate` callback fires on the specific editor instance (each spec has its own TipTap instance within the document). This minimizes payload size, reduces server processing, and aligns with the PRD's spec-level versioning model where each spec has its own commit history.

> **Q**: Should auto-save create git commits automatically, or should git commits only happen on explicit user save? The PRD says each spec change is a commit hash — does this mean every auto-save is a commit?
> **A**: Every auto-save creates a git commit. The PRD states each change is a commit hash, so the version history granularity matches the auto-save granularity. The version history UI groups rapid auto-save commits (within a 5-minute editing session) under a single "editing session" entry, expandable to see individual commits. This gives full history without overwhelming the timeline.

> **Q**: If two users edit the same spec and auto-save creates a conflict, how should it be resolved? Real-time merge (like Google Docs), explicit merge dialog, or "last write wins"?
> **A**: Explicit merge dialog. Since there's no real-time co-editing, conflicts are detected on save: the server rejects the save if the spec's base version doesn't match the server's current version. The editor shows a conflict notification: "This spec was modified by User X. [View changes] [Merge] [Overwrite with mine]". The merge dialog shows a diff of both versions.

> **Q**: Should the editor lock a spec while a user is editing it to prevent conflicts? This would mean other users see a "locked by User X" indicator.
> **A**: Soft lock. When a user starts editing a spec, a WebSocket event notifies other users. They see a "Being edited by User X" indicator on the spec header (with the user's avatar). The lock is advisory — other users can still open and edit the spec, but they're warned that conflicts may arise. The lock expires after 5 minutes of inactivity (no edits).

> **Q**: How frequently should the editor check for remote changes? On every save, on a polling interval, or only via WebSocket push?
> **A**: WebSocket push. The server broadcasts spec change events to all connected clients. When a spec the user is viewing is modified by someone else, the editor shows a subtle banner: "This spec was updated by User X. [Refresh to see changes]". No polling — WebSocket provides near-instant notification. The save response also includes conflict detection (if another user saved between the user's load and save).

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

#### Design Decisions

> **Q**: Should agent suggestions appear inline in the editor (like GitHub Copilot suggestions) or only in the chat panel? Inline is more immediate but potentially distracting.
> **A**: Only in the chat panel for MVP. Inline suggestions add significant editor complexity (ghost text rendering, accept/reject UI, conflict with user typing). The chat-based proposal flow (agent sends spec-proposal message, user reviews and accepts) is clear and predictable. Phase 2 can explore inline suggestions using TipTap's decoration API if users request it.

> **Q**: When the agent proposes spec changes, should the diff be shown within the editor (inline) or in a separate diff view?
> **A**: In the chat panel as a spec-proposal message with an embedded diff view (using the lightweight diff component with subtle colored indications per PRD). Accepting the proposal applies the changes to the editor. The editor itself doesn't show diffs — it always shows the current content. The diff view in the chat uses the same styling as the version control diff view for consistency.

> **Q**: Should the "Split spec" feature analyze content semantically (via agent) or use simple heuristics (split at heading boundaries)?
> **A**: Both options available. Default split is heuristic (at cursor position or at the nearest heading boundary). An "AI-assisted split" option in the context menu asks the agent to analyze the content and suggest optimal split points based on semantic coherence. The agent returns 1-3 suggested split points with explanations. This gives fast results for obvious cases and intelligent results for complex ones.

> **Q**: Should the agent proactively suggest improvements as the user types (like a spell checker), or only when explicitly requested?
> **A**: Only when explicitly requested. Proactive typing suggestions would be distracting and expensive (every keystroke would trigger agent inference). The user requests improvements via: the chat (`/review [specId]`), the spec header's "..." menu ("Ask agent to review"), or by selecting text and choosing "Ask agent about selection." The agent can proactively notify about graph implications after a save, but not during typing.

> **Q**: After a spec is edited and saved, should the agent automatically start crawling the graph for implications (as described in the PRD), or only when the user triggers it?
> **A**: Automatically, per the PRD. After a spec auto-save commit, the server triggers the agent to crawl the graph from that spec node to discover implications. This happens asynchronously — the user continues working. If the agent finds implications (contradictions, outdated related specs), it sends a proactive message to the chat. The crawl is rate-limited to once per spec per 5-minute window to avoid excessive processing.

> **Q**: Should there be a "quick ask" feature — select text in the editor and ask the agent about it without opening the full chat?
> **A**: Yes. Selecting text in the editor reveals a floating toolbar with an "Ask Agent" button (in addition to formatting buttons). Clicking it opens a small inline popover with a text input for the question. The question + selected text are sent as a chat message, and the chat panel expands to show the response. This is a shortcut to the chat — the response always appears in the chat for history tracking.

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

#### Design Decisions

> **Q**: What is the maximum number of specs expected in a single document? 10? 50? 100? This determines whether virtualization is needed from day one.
> **A**: Expect 5-30 specs per document as the typical range, with up to 50 as the upper bound. Documents with >50 specs should probably be split into multiple documents. No virtualization needed from day one — TipTap handles 30 editor instances well. Add virtualization (intersection observer to mount/unmount editors) as a performance enhancement if documents regularly exceed 30 specs.

> **Q**: Should the editor load all specs at once, or lazily load spec content as the user scrolls?
> **A**: Load all spec content on document open (single API call returns the full document with all specs). Lazy loading per-spec would create visible loading states as users scroll, which feels sluggish. For documents with <50 specs, the total content is small (typically <500KB of text). The TipTap editor instances are created eagerly but only those in the viewport render fully (React rendering optimization).

> **Q**: Is there a maximum spec content size that should be enforced? A spec with 10,000 words would be very long — should there be a warning?
> **A**: Soft warning at 3,000 words: "This spec is quite long. Consider splitting it into smaller specs for better organization and graph connectivity." Hard limit at 10,000 words where the editor shows a notice and the agent suggests splitting. The warning appears as a subtle banner at the top of the spec. Specs are meant to be atomic units of knowledge — excessively long specs defeat the graph structure's purpose.

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

#### Design Decisions

> **Q**: Should the editor support voice input (speech-to-text) for spec content?
> **A**: No dedicated implementation. The browser's native speech-to-text (OS-level dictation) works within TipTap's content editable area without any app-level code. This is sufficient for users who rely on voice input. A dedicated speech-to-text integration adds complexity and dependency with minimal benefit over the OS capability.

> **Q**: How should spec boundaries be communicated to screen reader users? ARIA landmarks, heading levels, or region roles?
> **A**: ARIA region roles. Each spec is wrapped in a `<section role="region" aria-label="Spec: [Title]">` element. The spec header uses the appropriate heading level (`<h2>` for spec titles). Navigation between specs uses heading-level navigation (standard screen reader behavior). The document outline panel is also accessible, providing an alternative navigation method.

> **Q**: Should there be an "outline view" (list of spec titles) for quick navigation, similar to a document outline in Word?
> **A**: Yes (already decided above). The outline panel lists spec titles with status badges, accessible via `Cmd+Shift+O`. The outline panel is navigable with arrow keys and Enter to jump to a spec. Screen readers announce it as a navigation landmark. This mirrors the outline/heading navigation in Word and VS Code.

---

## Summary

### Task Count by Section

| Section                           | Tasks                                |
| --------------------------------- | ------------------------------------ |
| 1. Editor Library & Architecture  | 6 (FE-EDIT-001 through FE-EDIT-006)  |
| 2. Spec Document Structure        | 6 (FE-EDIT-007 through FE-EDIT-012)  |
| 3. Spec Boundary Visualization    | 9 (FE-EDIT-013 through FE-EDIT-021)  |
| 4. Rich Text Editing              | 13 (FE-EDIT-022 through FE-EDIT-034) |
| 5. Toolbar & Formatting Controls  | 5 (FE-EDIT-035 through FE-EDIT-039)  |
| 6. Spec CRUD Operations           | 10 (FE-EDIT-040 through FE-EDIT-049) |
| 7. Auto-Save & Manual Save        | 7 (FE-EDIT-050 through FE-EDIT-056)  |
| 8. Inline Spec Metadata           | 7 (FE-EDIT-057 through FE-EDIT-063)  |
| 9. Collaboration Indicators       | 4 (FE-EDIT-064 through FE-EDIT-067)  |
| 10. Agent-Assisted Editing        | 6 (FE-EDIT-068 through FE-EDIT-073)  |
| 11. Spec Status & Sync Indicators | 3 (FE-EDIT-074 through FE-EDIT-076)  |
| 12. Keyboard Shortcuts            | 3 (FE-EDIT-077 through FE-EDIT-079)  |
| 13. Performance & Virtualization  | 4 (FE-EDIT-080 through FE-EDIT-083)  |
| 14. Accessibility                 | 4 (FE-EDIT-084 through FE-EDIT-087)  |
| **TOTAL**                         | **87**                               |

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
