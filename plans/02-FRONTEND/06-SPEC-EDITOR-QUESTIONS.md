# 02-FRONTEND / 06 — SPEC EDITOR: Open Questions

> **Purpose**: Unresolved questions about the spec document editor including
> library choice, editing behavior, spec boundaries, auto-save strategy,
> and agent integration. Answers may change tasks in the plan.

---

## 1. Editor Library

### 1.1 Library Choice
- **Q**: Should the editor use TipTap (recommended), ProseMirror (direct),
  or CodeMirror? TipTap provides the best developer experience but adds a
  dependency layer over ProseMirror. CodeMirror is better for code but less
  suited for rich documents.
- **A:** Use TipTap. It provides a significantly better developer experience over raw ProseMirror: declarative extension API, React integration via `@tiptap/react`, built-in support for common formatting, and an active ecosystem of extensions. The abstraction layer's cost is minimal (~15KB over ProseMirror core). CodeMirror is wrong for rich document editing — it's a code editor.

- **Q**: Should the editor support WYSIWYG mode only, or also a raw
  markdown mode (split pane: source + preview)? Some power users prefer
  editing raw markdown.
- **A:** WYSIWYG only for MVP. TipTap renders rich text that feels like markdown (headings, bold, lists render inline) without showing raw syntax. This matches the PRD's "markdown-like editing" description — it should feel like markdown but render visually. A raw markdown toggle can be added as a Phase 2 feature for power users. The underlying content is stored as markdown, so round-tripping is lossless.

- **Q**: Is real-time collaborative editing (multiple users editing the same
  spec simultaneously) a requirement, or is the async git-based approach
  sufficient? TipTap supports Yjs collaboration, but it adds significant
  complexity.
- **A:** Async git-based approach is sufficient. The PRD explicitly specifies "async git-based collaboration (no real-time co-editing)." Do not implement Yjs or CRDTs. Users work on their own branches and merge via the version control system. If two users edit the same spec, the second to save encounters a conflict handled by the merge flow.

### 1.2 Editor Customization
- **Q**: How heavily should the editor be customized? Minimal (use TipTap
  starter kit defaults) or extensive (custom node types for specs, metadata
  blocks, and agent suggestions)?
- **A:** Moderate customization. Use TipTap's StarterKit for standard formatting (headings, bold, italic, lists, code blocks, blockquotes). Add custom extensions for: spec boundary nodes (custom ProseMirror node type that renders the header bar + left border), inline spec references (custom marks that render as clickable chips), and agent suggestion highlights (custom decoration plugin). No custom nodes for metadata — metadata lives outside the editor content.

- **Q**: Should the editor support custom block types beyond standard
  markdown? For example: callout boxes, embedded diagrams, or interactive
  widgets?
- **A:** Callout boxes yes (as a TipTap extension — useful for notes, warnings, and important callouts in specs). Embedded diagrams deferred (add Mermaid rendering as a Phase 2 extension). No interactive widgets inside the editor — that's the gen UI system's role. Keep the editor focused on structured text with light formatting enhancements.

---

## 2. Spec Boundaries

### 2.1 Visual Design
- **Q**: How should spec boundaries be visually indicated? The plan suggests
  colored left borders and header bars. Other options:
  - Horizontal rules between specs (simple but less distinctive)
  - Card-like containers per spec (clear but heavy)
  - Alternating background colors (subtle but easy)
  - Collapsible accordion sections (compact but hides content)
  Which best matches the "structured markdown document" feel from the PRD?
- **A:** Colored left border (3px solid, neutral-300 default, colored by spec status) + spec header bar. The header bar contains the spec title, status badge, and a collapse/expand toggle. A subtle 1px horizontal divider sits between specs. This creates clear boundaries without the heaviness of cards or the loss of content from accordions. It feels like a structured markdown document with section headers.

- **Q**: Should spec boundaries be editable — can users merge two specs by
  deleting the boundary between them, or split a spec by inserting a boundary?
- **A:** Split: yes, via a "Split spec here" action (context menu or `/split` slash command) that creates a new spec boundary at the cursor position. Merge: via selecting two adjacent specs and choosing "Merge specs" from the context menu. No boundary drag-editing — it's too imprecise for a structural operation. Both split and merge create new version commits.

- **Q**: Should the boundary show a preview of the spec's graph connections
  (e.g., "3 edges: 2 depends-on, 1 related-to")?
- **A:** Not in the boundary itself — that would clutter the header bar. Instead, show a small connection count badge (e.g., "5 connections") in the spec header. Clicking the badge opens a popover listing all edges with their types and target spec names. Hovering the badge highlights the spec's connections in the graph panel (if visible).

### 2.2 Spec Header
- **Q**: What information should the spec header show by default? Title only?
  Title + status? Title + tags + status? More detail might be useful but
  takes vertical space.
- **A:** Title + status badge + connection count badge. Three compact elements in a single 36px-height header bar. Tags, author, and dates are shown in a metadata popover on click of the "..." menu or on hover. This keeps vertical space minimal while showing the most important at-a-glance info (what it is, its state, how connected it is).

- **Q**: Should the spec header be sticky (fixed at top when scrolling within
  a long spec)?
- **A:** Yes. When scrolling within a long spec (content exceeds viewport height), the spec header sticks to the top of the editor viewport with a subtle shadow to indicate it's elevated. This ensures the user always knows which spec they're currently reading/editing. The sticky header unsticks when the user scrolls past the spec boundary into the next spec.

- **Q**: Should the spec ID be visible in the header, or only in the
  metadata popover?
- **A:** Only in the metadata popover. Spec IDs are internal identifiers (commit hashes or UUIDs) that are not meaningful to most users. Power users who need the ID can find it in the metadata popover or via the "Copy spec ID" action in the "..." menu. Showing IDs in the header wastes space and adds visual noise.

---

## 3. Content Editing

### 3.1 Formatting Support
- **Q**: What subset of markdown formatting should be supported? Full
  GitHub-Flavored Markdown (GFM), or a restricted subset? Tables, footnotes,
  and math equations each add complexity.
- **A:** Full GFM minus footnotes. Support: headings (h1-h4), bold, italic, strikethrough, inline code, code blocks with syntax highlighting, links, images, ordered/unordered lists, task lists (checkboxes), blockquotes, horizontal rules, and tables. Tables are essential for structured specs. Footnotes are rarely needed and add complexity. This covers 95% of technical documentation needs.

- **Q**: Should the editor support mathematical notation (LaTeX/KaTeX)? This
  is useful for technical specs but adds rendering complexity.
- **A:** Deferred to Phase 2. Math notation is useful for a subset of technical specs but adds a significant dependency (KaTeX is ~300KB) and custom TipTap extension work. For MVP, users can use inline code for simple formulas or embed images of equations. Add KaTeX rendering as an optional TipTap extension when demand justifies it.

- **Q**: Should the editor support diagrams (Mermaid, PlantUML)? This would
  allow inline flowcharts and sequence diagrams, which are valuable for
  technical specs.
- **A:** Deferred to Phase 2. Mermaid support requires a rendering step (server-side or client-side WASM) and a custom TipTap node type. For MVP, users can embed pre-rendered diagram images. Plan for Mermaid as a TipTap extension that renders diagram code blocks into inline SVGs. PlantUML is deprioritized (requires a Java server).

### 3.2 Media Handling
- **Q**: How should images be handled? Upload to server and store URL, or
  embed as base64? Server upload is better for performance but requires
  API support.
- **A:** Upload to server and store URL. Images are uploaded via a `/api/media/upload` endpoint, stored on the server filesystem (or S3 in production), and referenced by URL in the spec content. Base64 embedding bloats the document JSON and degrades editor performance. The upload happens automatically on paste or drag-drop, with a progress indicator inline.

- **Q**: Should the editor support video/audio embedding, or only images?
  The PRD mentions mixed media but says media is not a spec itself.
- **A:** Images inline in the editor, video/audio as linked attachments only. Inline video/audio would significantly complicate the editor and auto-save (large binary content). Users can attach video/audio files to a spec via a metadata panel (stored as media associations per the PRD), which appear as downloadable links below the spec content. The spec content itself supports only images.

- **Q**: What is the maximum file size for embedded media?
- **A:** 10MB per image. Images above 5MB trigger a suggestion to compress/resize. The server rejects uploads above 10MB with a clear error. For video/audio attachments (via spec metadata, not inline), the limit is 100MB. These limits are configurable server-side per deployment.

### 3.3 Paste Behavior
- **Q**: When pasting content from external sources (Word, Google Docs, web
  pages), how aggressively should formatting be stripped? Keep basic
  formatting (bold, italic, lists) and strip everything else?
- **A:** Keep basic formatting: bold, italic, headings, links, ordered/unordered lists, and code blocks. Strip everything else: fonts, colors, custom spacing, tables from Word (they rarely paste cleanly), embedded objects, and inline styles. TipTap's `@tiptap/extension-paste-rules` handles this. A "Paste as plain text" option (Cmd+Shift+V) strips all formatting.

- **Q**: Should pasting HTML be supported at all, or should it always be
  converted to plain text / markdown?
- **A:** HTML paste is supported with the formatting filter described above. TipTap natively handles HTML → ProseMirror document conversion. The filtered paste preserves the user's intent (structured content) while removing visual styling that doesn't fit the design system. Users who want raw text use Cmd+Shift+V.

---

## 4. Auto-Save

### 4.1 Strategy
- **Q**: What should the auto-save debounce interval be? 1 second (fast,
  more network traffic), 2 seconds (recommended), 5 seconds (fewer saves,
  risk of more data loss)?
- **A:** 2-second debounce. This balances data safety with network efficiency. After the user stops typing for 2 seconds, the current spec content is sent to the server. A "Saving..." → "Saved" indicator in the editor header provides feedback. If the user is continuously typing, the auto-save triggers at a maximum interval of 10 seconds regardless of debounce.

- **Q**: Should auto-save happen per-spec (only save the spec that changed)
  or per-document (save all specs in the document)? Per-spec is more
  efficient but requires tracking changes at spec granularity.
- **A:** Per-spec. Only the spec whose content changed is sent to the server. TipTap's `onUpdate` callback fires on the specific editor instance (each spec has its own TipTap instance within the document). This minimizes payload size, reduces server processing, and aligns with the PRD's spec-level versioning model where each spec has its own commit history.

- **Q**: Should auto-save create git commits automatically, or should git
  commits only happen on explicit user save? The PRD says each spec change
  is a commit hash — does this mean every auto-save is a commit?
- **A:** Every auto-save creates a git commit. The PRD states each change is a commit hash, so the version history granularity matches the auto-save granularity. The version history UI groups rapid auto-save commits (within a 5-minute editing session) under a single "editing session" entry, expandable to see individual commits. This gives full history without overwhelming the timeline.

### 4.2 Conflict Resolution
- **Q**: If two users edit the same spec and auto-save creates a conflict,
  how should it be resolved? Real-time merge (like Google Docs), explicit
  merge dialog, or "last write wins"?
- **A:** Explicit merge dialog. Since there's no real-time co-editing, conflicts are detected on save: the server rejects the save if the spec's base version doesn't match the server's current version. The editor shows a conflict notification: "This spec was modified by User X. [View changes] [Merge] [Overwrite with mine]". The merge dialog shows a diff of both versions.

- **Q**: Should the editor lock a spec while a user is editing it to prevent
  conflicts? This would mean other users see a "locked by User X" indicator.
- **A:** Soft lock. When a user starts editing a spec, a WebSocket event notifies other users. They see a "Being edited by User X" indicator on the spec header (with the user's avatar). The lock is advisory — other users can still open and edit the spec, but they're warned that conflicts may arise. The lock expires after 5 minutes of inactivity (no edits).

- **Q**: How frequently should the editor check for remote changes? On every
  save, on a polling interval, or only via WebSocket push?
- **A:** WebSocket push. The server broadcasts spec change events to all connected clients. When a spec the user is viewing is modified by someone else, the editor shows a subtle banner: "This spec was updated by User X. [Refresh to see changes]". No polling — WebSocket provides near-instant notification. The save response also includes conflict detection (if another user saved between the user's load and save).

---

## 5. Agent Integration

### 5.1 Agent Actions
- **Q**: Should agent suggestions appear inline in the editor (like GitHub
  Copilot suggestions) or only in the chat panel? Inline is more immediate
  but potentially distracting.
- **A:** Only in the chat panel for MVP. Inline suggestions add significant editor complexity (ghost text rendering, accept/reject UI, conflict with user typing). The chat-based proposal flow (agent sends spec-proposal message, user reviews and accepts) is clear and predictable. Phase 2 can explore inline suggestions using TipTap's decoration API if users request it.

- **Q**: When the agent proposes spec changes, should the diff be shown
  within the editor (inline) or in a separate diff view?
- **A:** In the chat panel as a spec-proposal message with an embedded diff view (using the lightweight diff component with subtle colored indications per PRD). Accepting the proposal applies the changes to the editor. The editor itself doesn't show diffs — it always shows the current content. The diff view in the chat uses the same styling as the version control diff view for consistency.

- **Q**: Should the "Split spec" feature analyze content semantically (via
  agent) or use simple heuristics (split at heading boundaries)?
- **A:** Both options available. Default split is heuristic (at cursor position or at the nearest heading boundary). An "AI-assisted split" option in the context menu asks the agent to analyze the content and suggest optimal split points based on semantic coherence. The agent returns 1-3 suggested split points with explanations. This gives fast results for obvious cases and intelligent results for complex ones.

### 5.2 Agent Triggers
- **Q**: Should the agent proactively suggest improvements as the user types
  (like a spell checker), or only when explicitly requested?
- **A:** Only when explicitly requested. Proactive typing suggestions would be distracting and expensive (every keystroke would trigger agent inference). The user requests improvements via: the chat (`/review [specId]`), the spec header's "..." menu ("Ask agent to review"), or by selecting text and choosing "Ask agent about selection." The agent can proactively notify about graph implications after a save, but not during typing.

- **Q**: After a spec is edited and saved, should the agent automatically
  start crawling the graph for implications (as described in the PRD), or
  only when the user triggers it?
- **A:** Automatically, per the PRD. After a spec auto-save commit, the server triggers the agent to crawl the graph from that spec node to discover implications. This happens asynchronously — the user continues working. If the agent finds implications (contradictions, outdated related specs), it sends a proactive message to the chat. The crawl is rate-limited to once per spec per 5-minute window to avoid excessive processing.

- **Q**: Should there be a "quick ask" feature — select text in the editor
  and ask the agent about it without opening the full chat?
- **A:** Yes. Selecting text in the editor reveals a floating toolbar with an "Ask Agent" button (in addition to formatting buttons). Clicking it opens a small inline popover with a text input for the question. The question + selected text are sent as a chat message, and the chat panel expands to show the response. This is a shortcut to the chat — the response always appears in the chat for history tracking.

---

## 6. Spec Operations

### 6.1 Cross-Document Operations
- **Q**: Should specs be movable between documents via drag-and-drop (drag
  from editor to document tree), or only through a menu action?
- **A:** Menu action only. Drag-and-drop from the editor to the sidebar document tree is error-prone (long drag distance, easy to drop on the wrong document). The "Move to..." menu action (in the spec header's "..." menu) opens a document picker dialog where the user selects the target document and position. This is more precise and harder to trigger accidentally.

- **Q**: Should the editor support cross-document spec references (linking
  to a spec in another document)?
- **A:** Yes. Specs can reference specs in any document — this is fundamental to the knowledge graph. References are created by: typing `@` to open a spec search popover (searches all specs across documents), or by the agent inserting references in proposals. Cross-document references render as clickable chips showing `[Document Name / Spec Title]`. Clicking navigates to that spec.

- **Q**: When a spec is moved to another document, should its graph edges
  be preserved, modified, or reviewed?
- **A:** Preserved. Graph edges connect specs, not documents. Moving a spec to a different document is a structural change to the document, not a semantic change to the knowledge graph. All edges remain intact. The agent is notified of the move and may proactively suggest reviewing edges if the new document context changes the spec's meaning.

### 6.2 Spec Templates
- **Q**: Should there be spec templates (e.g., "Requirement", "Design
  Decision", "Constraint") that pre-populate the spec with a structure?
- **A:** Yes. System-provided templates: "Requirement" (title, description, acceptance criteria, priority), "Design Decision" (context, decision, consequences, alternatives), "Constraint" (description, rationale, impact), "User Story" (as a, I want, so that, acceptance criteria), and "Technical Note" (overview, details, references). Users select a template when creating a new spec.

- **Q**: If templates exist, should they be system-provided, user-created,
  or both?
- **A:** Both. System-provided templates ship by default (5-6 templates covering common patterns). Users can create custom templates from any existing spec via "Save as template" in the spec's "..." menu. Custom templates are stored per-project and appear alongside system templates in the "New spec" dialog. This enables teams to standardize their spec formats.

---

## 7. Document-Level Features

- **Q**: Should the document have a table of contents (auto-generated from
  spec titles)?
- **A:** Yes. The document outline panel (collapsible, left margin of the editor area) auto-generates from spec titles. It shows spec titles with status badges and indentation based on heading level within specs. Clicking navigates to the spec. This doubles as the table of contents and is essential for documents with more than 5-6 specs.

- **Q**: Should the document support "comments" (annotations by users or
  agents that are separate from spec content)?
- **A:** Deferred to Phase 2. Comments add significant complexity (annotation positioning, comment threads, resolution workflow). For MVP, the chat serves as the discussion channel for spec feedback. The agent can reference specific specs in chat messages. Phase 2 can add inline comments using TipTap's `@tiptap/extension-collaboration` annotation features.

- **Q**: Should the document be exportable as a single markdown file? As PDF?
- **A:** Yes, export as Markdown. The document renders to a single `.md` file with spec boundaries marked by horizontal rules and spec titles as headings. Metadata is included as YAML front matter per spec. No PDF export for MVP — it requires a rendering pipeline (e.g., Puppeteer). Markdown export is sufficient for sharing and external tooling.

- **Q**: Should there be a "print view" for the document?
- **A:** Not for MVP. Users can use the browser's native print (Cmd+P) which will render the editor content adequately with a print CSS stylesheet (`@media print` that hides chrome and optimizes layout). A dedicated print view is low priority for a digital-first tool.

---

## 8. Performance

- **Q**: What is the maximum number of specs expected in a single document?
  10? 50? 100? This determines whether virtualization is needed from day one.
- **A:** Expect 5-30 specs per document as the typical range, with up to 50 as the upper bound. Documents with >50 specs should probably be split into multiple documents. No virtualization needed from day one — TipTap handles 30 editor instances well. Add virtualization (intersection observer to mount/unmount editors) as a performance enhancement if documents regularly exceed 30 specs.

- **Q**: Should the editor load all specs at once, or lazily load spec
  content as the user scrolls?
- **A:** Load all spec content on document open (single API call returns the full document with all specs). Lazy loading per-spec would create visible loading states as users scroll, which feels sluggish. For documents with <50 specs, the total content is small (typically <500KB of text). The TipTap editor instances are created eagerly but only those in the viewport render fully (React rendering optimization).

- **Q**: Is there a maximum spec content size that should be enforced?
  A spec with 10,000 words would be very long — should there be a warning?
- **A:** Soft warning at 3,000 words: "This spec is quite long. Consider splitting it into smaller specs for better organization and graph connectivity." Hard limit at 10,000 words where the editor shows a notice and the agent suggests splitting. The warning appears as a subtle banner at the top of the spec. Specs are meant to be atomic units of knowledge — excessively long specs defeat the graph structure's purpose.

---

## 9. Accessibility

- **Q**: Should the editor support voice input (speech-to-text) for spec
  content?
- **A:** No dedicated implementation. The browser's native speech-to-text (OS-level dictation) works within TipTap's content editable area without any app-level code. This is sufficient for users who rely on voice input. A dedicated speech-to-text integration adds complexity and dependency with minimal benefit over the OS capability.

- **Q**: How should spec boundaries be communicated to screen reader users?
  ARIA landmarks, heading levels, or region roles?
- **A:** ARIA region roles. Each spec is wrapped in a `<section role="region" aria-label="Spec: [Title]">` element. The spec header uses the appropriate heading level (`<h2>` for spec titles). Navigation between specs uses heading-level navigation (standard screen reader behavior). The document outline panel is also accessible, providing an alternative navigation method.

- **Q**: Should there be an "outline view" (list of spec titles) for quick
  navigation, similar to a document outline in Word?
- **A:** Yes (already decided above). The outline panel lists spec titles with status badges, accessible via `Cmd+Shift+O`. The outline panel is navigable with arrow keys and Enter to jump to a spec. Screen readers announce it as a navigation landmark. This mirrors the outline/heading navigation in Word and VS Code.

---

## Decision Log

> Record decisions as questions are resolved.

| Date | Question | Decision | Rationale |
|------|----------|----------|-----------|
| — | — | — | — |
