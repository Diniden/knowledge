# 02-FRONTEND / 07 — KNOWLEDGE GRAPH UI: Open Questions

> **Purpose**: Unresolved questions about the knowledge graph visualization
> including the vertical tree layout algorithm, virtual scrolling, node card
> design, expand-to-fullscreen document navigation, connected-nodes bar,
> breadcrumb trail, tab system, and performance targets. Answers may change
> tasks in the plan.

---

## 1. Tree Layout & Algorithm

### 1.1 Primary Node Selection

- **Q**: The tree is built via BFS from a primary node. When no primary is
  specified, the algorithm selects a leaf node. What if multiple leaf nodes
  tie for centrality or the heuristic produces multiple equally valid
  candidates?
- **A:** Break ties deterministically by choosing the leaf with the most recent modification timestamp. If timestamps also tie, fall back to alphabetical sort on node title and pick the first. This guarantees a stable, repeatable tree for the same graph state without requiring user intervention. The selected primary is shown in the UI header so the user can override it.

### 1.2 Edge Directionality

- **Q**: Which edge types determine parent-child direction in the tree? Does
  `depends-on` mean the child depends on the parent (child is below), or the
  reverse?
- **A:** `depends-on` flows downward: if Spec A depends-on Spec B, then B is the parent and A is the child (deeper row). `derived-from` also flows downward: the derived spec is the child. `related-to` is bidirectional — the node discovered first by BFS becomes the parent. `supersedes` flows downward: the superseding spec is the child (newer, more specific). `contradicts` is bidirectional like `related-to`. This gives the tree a natural "foundations at the top, specifics below" reading order.

### 1.3 Cycle Handling

- **Q**: Knowledge graphs are not necessarily DAGs — cycles are possible.
  How should the BFS tree handle cycles?
- **A:** Standard BFS cycle handling: mark nodes as visited. When BFS encounters an already-visited node, skip it for tree placement (do not create a second parent-child edge). The skipped edge is still tracked as a "cross-link" and rendered as a subtle dashed connector between the two nodes in their respective rows. Cross-links are visible but visually distinct from tree edges — they don't affect row placement.

### 1.4 Edge Type Filtering in BFS

- **Q**: Should the BFS respect edge types or treat all edges equally? For
  example, should `contradicts` edges be traversed during tree construction,
  or only structural edges like `depends-on` and `derived-from`?
- **A:** BFS traverses all edge types equally for tree construction. Filtering by edge type would fragment the tree and leave nodes unreachable. However, cross-link rendering distinguishes structural edges (`depends-on`, `derived-from`, `supersedes`) from associative edges (`related-to`, `contradicts`). Users can toggle associative cross-links off to see a cleaner structural tree.

### 1.5 Multi-Path Nodes

- **Q**: A node reachable via multiple BFS paths will only appear once in the
  tree (first discovery wins). Should there be any visual indication that a
  node has additional parent connections?
- **A:** Yes. Nodes with multiple incoming edges (beyond their tree parent) show a small upward-pointing chevron badge with a count (e.g., "↑2" meaning 2 additional parents). Hovering the badge highlights the cross-link lines to the other parents. This signals that the node's position in the tree is somewhat arbitrary and it has richer connectivity than the tree alone shows.

### 1.6 Row Merge Rule

- **Q**: The row merge rule collapses rows when the tree has more than 2 rows
  below the primary. What happens when there is exactly 1 row (primary +
  single row of children) or 0 additional rows (primary is alone)?
- **A:** With 0 additional rows (isolated primary), show only the primary card centered with a message "No connected nodes." With exactly 1 row, show the primary at top and the single child row below — no merge rule applies. The merge rule activates only when depth ≥ 3 rows: rows at depth 3+ are merged into a single combined row, preserving BFS ordering within that merged row.

### 1.7 Max Depth

- **Q**: Should the tree cap at N depth levels, or render as deep as the
  graph goes? Very deep trees could cause performance and usability issues.
- **A:** No hard cap. The virtual scrolling system handles arbitrary depth efficiently since only visible rows are rendered. However, the merge rule naturally compresses deep trees: rows beyond depth 2 merge into a single row. For the rare case of extremely wide merged rows (100+ nodes), the horizontal scroll per row handles it. A depth indicator in the row gutter shows which BFS depth each row represents.

---

## 2. Virtual Scrolling & Performance

### 2.1 Virtual List Library

- **Q**: Which virtual list library should be used for row rendering?
  Options: `react-window` (lightweight, proven), `react-virtuoso` (feature-
  rich, variable height), `@tanstack/virtual` (headless, framework-agnostic),
  or a custom implementation?
- **A:** `@tanstack/virtual`. It's headless (no opinionated DOM structure), supports variable row heights natively, works with both vertical and horizontal scrolling, and aligns with the project's preference for composable primitives over opinionated libraries. It also has active maintenance and strong TypeScript support. The headless approach lets us own the scroll container and styling completely.

### 2.2 Row Height

- **Q**: Are row heights fixed or variable? Rows may contain different numbers
  of node cards, and the primary row has a single card while deeper rows
  could have many.
- **A:** Fixed height per row. Each row is a horizontal strip of cards at the same height (card height + vertical padding = row height). The primary node row uses the same height as other rows for visual consistency. Since all cards have the same dimensions, row height is uniform and predictable, which simplifies virtual scrolling and avoids the layout recalculation cost of variable heights.

### 2.3 Horizontal Scroll Per Row

- **Q**: How wide can a single row get? Should there be a maximum width,
  or does horizontal scroll handle unlimited row width?
- **A:** No maximum width — horizontal scroll handles it. Each row is independently horizontally scrollable (trackpad two-finger horizontal swipe or shift+scroll wheel). A subtle horizontal scrollbar appears at the bottom of each row on hover. For very wide rows (20+ cards), a small count indicator at the row's right edge shows "N more →" to signal hidden cards. The visible viewport is sized to the tree container width.

### 2.4 Nodes Per Row Threshold

- **Q**: What is the target number of nodes per row before the experience
  becomes unwieldy? Should wide rows be split into sub-rows?
- **A:** No sub-row splitting — it would break the BFS depth semantics. For rows with more than ~8 visible cards (the typical viewport), horizontal scrolling is the primary navigation. The row header shows total card count ("12 nodes at depth 2"). If a row exceeds 50 nodes, it gets a search/filter input within the row header to help locate specific cards without scrolling through all of them.

### 2.5 Scroll Physics

- **Q**: Should two-finger trackpad scrolling have momentum/inertia behavior,
  or stop immediately when the user lifts their fingers?
- **A:** Defer to native browser scroll behavior. The virtual scroll container uses standard `overflow: auto` or `overflow: scroll`, which inherits the OS-level momentum scrolling on macOS (and smooth scrolling on Windows). No custom scroll physics — fighting native scroll behavior causes uncanny-valley jank and accessibility issues. The Mac trackpad's built-in inertia is already well-tuned.

### 2.6 Performance Targets

- **Q**: What are the rendering performance targets for the virtual tree?
- **A:** Initial render (data fetch + BFS computation + first paint): under 200ms for graphs up to 500 nodes. Scroll frame rate: 60fps during both vertical and horizontal scrolling. BFS tree computation: under 50ms for 1,000 nodes. Card expand animation: 60fps for the duration of the transition. Memory: the virtual list should keep at most 3 rows of DOM nodes (1 visible + 1 buffer above + 1 buffer below) regardless of total tree depth.

---

## 3. Node Card Design

### 3.1 Card Dimensions

- **Q**: Should node cards have fixed width and height, or adapt to content
  (e.g., longer summaries get taller cards)?
- **A:** Fixed dimensions: 240px wide × 120px tall. Fixed size creates a clean grid rhythm in each row, simplifies virtual scrolling (no per-card measurement), and prevents layout shift when summaries load asynchronously. The summary text truncates with ellipsis at a fixed line count (3 lines). Horizontal spacing between cards is 16px; vertical row padding is 12px top and bottom.

### 3.2 Summary Text

- **Q**: What is the max length for the agent-generated summary on each card?
  How is it generated? Can users edit the summary inline?
- **A:** Max 140 characters (roughly 3 lines at the card's font size). The summary is generated by the agent when a spec is created or significantly modified — it's stored as a field on the spec node. Users cannot edit inline on the card; editing the summary requires opening the expanded document view or the spec editor. This keeps the card interaction model simple (click to expand, not click to edit).

### 3.3 Compressed Card Content

- **Q**: What information is shown on the compressed card besides the summary?
- **A:** Four elements: (1) spec title in bold at the top (truncated at 1 line, ~30 chars), (2) agent-generated summary below the title (3 lines max), (3) a row of small resource indicators at the bottom-left (icons for linked graphics, UIs, data — count badges if >1), (4) a status dot at the top-right corner (color-coded: green=approved, yellow=draft, red=needs-review). No author, no dates — that detail lives in the expanded view.

### 3.4 Color Coding

- **Q**: What is the color coding strategy for cards? By document? By status?
  By spec type?
- **A:** Color by parent document. Each document is assigned a hue from a 12-color palette (consistent across the app). The card's left border (3px) uses the document color at full saturation. The card background is white (light mode) or neutral-900 (dark mode) — no colored backgrounds that would hurt readability. The status dot in the corner provides a secondary color signal. This groups cards visually by document across rows.

### 3.5 Card Hover Preview

- **Q**: What additional info shows when hovering over a compressed card?
- **A:** A tooltip appearing after 300ms delay shows: full (un-truncated) title, full summary, parent document name, author, last modified date, tag list, and edge count breakdown ("3 depends-on, 1 related-to"). The tooltip is a floating card (320px wide, max 200px tall) positioned above the hovered card. No hover preview on touch devices — tap goes directly to expand.

---

## 4. Expanded Document View

### 4.1 Animation

- **Q**: What animation timing and easing should be used for the expand and
  collapse transitions?
- **A:** Expand: 300ms with `ease-out` (fast start, gentle settle). The card scales and translates from its grid position to the expanded position. Collapse: 250ms with `ease-in` (gentle start, fast finish back to grid). Use CSS `transform` and `opacity` only (GPU-composited properties) to guarantee 60fps. The tree fades to 15% opacity over the same 300ms duration, synchronized with the card expansion.

### 4.2 Expanded Size

- **Q**: How much of the screen does the expanded document fill? Full screen
  with margins? A percentage?
- **A:** The expanded view fills the viewport with 32px margins on all sides (so `calc(100vw - 64px)` × `calc(100vh - 64px)`). This leaves a thin strip of the faded tree visible at the edges, reminding the user they're still in the graph context. On viewports smaller than 1024px, margins shrink to 16px. The expanded content area has a max-width of 800px centered within the expanded container for readable line lengths.

### 4.3 Tree Visibility During Expansion

- **Q**: Should the tree be completely hidden when a document is expanded, or
  remain visible as a faded backdrop?
- **A:** Faded backdrop at 15% opacity. The tree remains rendered but non-interactive (pointer-events: none). This provides visual continuity — the user sees they're still in the graph and can orient themselves spatially. Clicking the faded backdrop or pressing `Escape` collapses the expanded view. The fade effect uses a semi-transparent overlay rather than actually changing the tree's opacity, avoiding a re-render of all tree cards.

### 4.4 Tree Interaction While Expanded

- **Q**: Can the user scroll or interact with the tree while a document is
  expanded?
- **A:** No. The tree is non-interactive while any document is expanded. The faded tree has `pointer-events: none` and scroll is captured by the expanded document's own scroll container. This prevents confusing states where the tree scrolls beneath the expanded view. The user must close the expanded view (click backdrop, press Escape, or click the close button) before interacting with the tree.

### 4.5 Overlay vs. Route

- **Q**: Should the expanded view be a modal-like overlay (stays in the graph
  route) or a route change (URL updates to a doc/spec route)?
- **A:** Modal-like overlay. The URL does not change — the graph route is preserved with an optional query parameter (`?expanded=specId`) for deep linking. This keeps the browser history clean (no back-button confusion) and preserves the tree's scroll position and state. When the user shares the URL with `?expanded=specId`, the graph loads and immediately opens that spec's expanded view.

---

## 5. Connected Nodes Bar

### 5.1 Visible Card Count

- **Q**: How many connected node cards are visible at once in the bottom bar?
- **A:** As many as fit in the viewport width. Cards in the connected bar are smaller than tree cards (180px wide × 80px tall) to fit more. On a 1440px-wide viewport, roughly 7 cards are visible. The bar is horizontally scrollable for overflow. A pill counter at the right edge ("+ N more") appears when cards overflow. No pagination — continuous horizontal scroll.

### 5.2 Peek Height

- **Q**: How much of each connected-node card is visible in the peek-up
  position before interaction?
- **A:** 32px peek from the bottom edge (roughly the top border + title line of the card). The card's title is visible in the peeked state. On hover, the card slides up to reveal its full 80px height with summary text. The peek bar itself has a subtle top border and background (neutral-100) to separate it from the expanded document content above.

### 5.3 High-Connectivity Nodes

- **Q**: What happens when a connected node has 50+ connections itself? The
  connected bar could become overwhelming.
- **A:** The connected bar only shows direct connections to the currently expanded node, not connections-of-connections. If the expanded node itself has 50+ direct connections, the bar displays them all via horizontal scroll with the pill counter. A sort control in the bar header lets the user sort by: edge type, alphabetical, or most recently modified. A filter dropdown can narrow to specific edge types.

### 5.4 Connecting Lines

- **Q**: Should connecting lines from the expanded document to the peeked
  cards be straight lines or curves? What is the visual treatment?
- **A:** Straight lines from the bottom edge of the expanded document to the top edge of each peeked card. Lines use a 1px neutral-400 stroke with the edge-type color as a 4px dot at the document end (acting as a type indicator). Lines are drawn on a transparent SVG overlay positioned between the document and the connected bar. On hover over a connected card, its line thickens to 2px and uses full edge-type color.

### 5.5 Interactive Lines

- **Q**: Should connecting lines be interactive — e.g., show the edge type
  label on hover?
- **A:** Yes. Hovering a connecting line (12px hit area) shows a small tooltip with the edge type name and direction ("depends-on → [Node Title]"). The line highlights to full edge-type color on hover. Clicking a line does nothing (the interaction target is the connected card, not the line). This provides edge-type context without cluttering the default view with labels.

---

## 6. Breadcrumb Navigation

### 6.1 Max Depth

- **Q**: What if the user clicks through 20+ nodes in sequence? Should the
  breadcrumb trail truncate?
- **A:** Yes, truncate. Show the first breadcrumb (initial node), an ellipsis pill ("..."), and the last 3 breadcrumbs. The ellipsis is clickable and expands to reveal all intermediate breadcrumbs in a dropdown. This prevents the breadcrumb bar from consuming excessive vertical space. The breadcrumb bar is fixed to the top of the viewport (above the expanded document) so it's always accessible.

### 6.2 Breadcrumb Card Size

- **Q**: Should breadcrumb cards be smaller than node cards? What dimensions?
- **A:** Yes, significantly smaller. Breadcrumb cards are 160px wide × 36px tall, showing only the spec title (truncated) and the document color indicator (3px left border). They peek down from the top of the viewport by 24px, with the remaining 12px revealed on hover. This keeps them unobtrusive while maintaining navigability.

### 6.3 Breadcrumb Content

- **Q**: Should breadcrumbs show the spec summary or just the title?
- **A:** Title only in the peeked state. On hover, a tooltip shows the summary. The breadcrumb's purpose is navigation, not content preview — keeping them minimal prevents the top of the screen from competing with the main content. The document color border provides enough context to identify which document the breadcrumb belongs to.

### 6.4 Back Navigation Model

- **Q**: How does "back" work: strict stack (pop the last breadcrumb) or
  click any breadcrumb to jump directly?
- **A:** Click any breadcrumb to jump directly. Clicking a breadcrumb collapses the current expanded view, removes all breadcrumbs after the clicked one (standard breadcrumb behavior), and expands the clicked node's document. Pressing `Escape` or the close button on the expanded view pops the last breadcrumb (returns to the previous node). This provides both direct access and sequential back-navigation.

---

## 7. Spec Document Internal View

### 7.1 Editor Mode

- **Q**: Is the expanded document view read-only, or can the user edit the
  spec content directly in the expanded view?
- **A:** Read-only by default with an "Edit" button that switches to edit mode. The read-only view renders clean markdown with optimal typography. Edit mode activates the same editor component used in the dedicated spec editor (06-SPEC-EDITOR) but within the expanded overlay. Edits auto-save. This keeps the default experience focused on navigation and reading while allowing quick edits without leaving the graph.

### 7.2 Relationship to Spec Editor

- **Q**: How does the expanded view relate to the separate spec editor
  (06-SPEC-EDITOR)? Is it the same component or a simplified version?
- **A:** The expanded view in read-only mode is a simplified renderer (markdown-to-HTML with styling). In edit mode, it embeds the same editor component from 06-SPEC-EDITOR (shared code). A "Open in editor" link in the expanded view navigates to the full spec editor route (`/docs/:docId/specs/:specId`) for users who want the complete editing experience with all toolbars and panels.

### 7.3 Resource Badges

- **Q**: How should resource indicators (linked graphics, UIs, data files) be
  designed? Icon only, count only, or icon + count?
- **A:** Icon + count. Each resource type gets a small icon (16px): image icon for graphics, window icon for gen UIs, database icon for data resources. If count > 1, a superscript number appears next to the icon. On the compressed card, these appear as a row at the bottom-left. In the expanded view, they appear in a resource section below the content with clickable links to each resource.

### 7.4 Side Panel

- **Q**: The expanded view can show a side panel for linked UIs and graphics.
  Should this panel be fixed width or resizable?
- **A:** Fixed width at 320px, collapsible. The side panel appears on the right side of the expanded view when the user clicks a resource badge or a "Show resources" button. It does not appear by default (maximizing content area). The panel shows thumbnails of linked gen UIs and graphics with click-to-preview. Closing the panel restores the full content width. No resize — the fixed width keeps the interaction simple.

---

## 8. Tab System

### 8.1 Tab Limits

- **Q**: Is there a maximum number of tabs? What happens when the user opens
  many isolated tree networks?
- **A:** Max 12 tabs. When the limit is reached, opening a new network replaces the least-recently-used tab (with a toast notification: "Tab [name] was replaced"). Tabs show a horizontal scrollable strip if they exceed the container width. Each tab shows the primary node's title (truncated at 20 chars) and the document color dot.

### 8.2 Tab Operations

- **Q**: Can tabs be reordered, closed, or pinned?
- **A:** Closeable and reorderable via drag-and-drop. No pinning — it adds complexity with marginal benefit for a max of 12 tabs. Middle-click closes a tab (browser convention). A "Close others" option appears in the tab's context menu (right-click). Closing all tabs shows an empty state with a prompt to select a starting node or load a graph.

### 8.3 Tab Persistence

- **Q**: Should tabs persist across browser sessions (page reload, close and
  reopen)?
- **A:** Yes. Tab state (primary node ID, scroll position, expanded node if any, breadcrumb stack) is serialized to localStorage keyed by project ID. On reload, tabs are restored to their previous state. The graph data itself is fetched fresh from the server, but the navigation state is local. A "Restore previous session" prompt appears if tab data is found on load.

---

## 9. Filtering & Search

### 9.1 Filter Behavior in Tree Context

- **Q**: How does filtering work in a tree layout? Should filtered-out nodes
  be hidden (collapsing gaps in rows), dimmed, or something else?
- **A:** Dimmed to 20% opacity. Hiding nodes would leave gaps in rows and break the spatial layout the user has built mental models around. Dimmed nodes remain in their positions, preserving the tree structure, but fade into the background. Edges to dimmed nodes also dim. A toggle in the filter panel switches to "Hide" mode (removes from DOM entirely and recomputes row layout) for users who prefer a clean filtered view.

### 9.2 Search in Tree

- **Q**: Does search highlight nodes in the tree, navigate to them, or both?
- **A:** Both. Typing in the search bar immediately highlights matching nodes (yellow border glow) across all rows, including rows not currently in the viewport (the view auto-scrolls vertically to the first match). Arrow keys cycle through matches. Pressing Enter on a match scrolls the tree to center that node's row and horizontally scrolls to position the node in view. The search bar is in the tree toolbar, activated with `Cmd+F`.

### 9.3 Smart Filters

- **Q**: Should there be pre-built "smart filters" for common graph queries?
- **A:** Yes. Pre-built filters in a dropdown: "Has contradictions" (nodes with ≥1 contradicts edge), "Orphan nodes" (0 edges), "Recently modified" (last 7 days), "Needs review" (status = needs-review), "High connectivity" (≥5 edges), "Cross-document links" (has edges to nodes in other documents). Smart filters combine with text search. Each smart filter shows a count badge of matching nodes.

---

## 10. Future Considerations

### 10.1 Pinch-to-Zoom

- **Q**: When pinch-to-zoom is added, what does "zooming" mean in a virtual
  tree? Does it change card sizes, row spacing, both?
- **A:** Zooming scales card size and row spacing proportionally, as if applying a CSS `transform: scale()` to the tree container. Zooming out makes cards smaller and shows more of the tree at once (useful for orientation). Zooming in makes cards larger and more readable (useful for dense rows). The virtual scroll recalculates visible row ranges based on the zoom level. Zoom range: 50% to 150%, with 100% as default.

### 10.2 Traditional Graph View Toggle

- **Q**: Should there be a toggle to switch between the tree view and a
  traditional force-directed graph view?
- **A:** Not for MVP. The tree view is the primary paradigm — maintaining a parallel force-directed view doubles the rendering code, interaction handling, and testing surface. If user feedback strongly requests a freeform graph view, it can be added as an alternative layout in a future phase. For now, the tree view with cross-link rendering covers the same information with better structure.

### 10.3 Export

- **Q**: How do you export a tree view? Screenshot? Structured data? Both?
- **A:** Both options in an export menu. "Export as image" captures the visible viewport as a PNG (using `html2canvas` or the Canvas API). "Export as SVG" renders the full tree (all rows, not just visible) as a vector graphic. "Export as data" exports the graph as JSON (nodes + edges + BFS tree structure). For large trees, the SVG/PNG export warns if the output exceeds 10,000px in either dimension.

### 10.4 Collaborative Presence

- **Q**: Should the tree view show which nodes other users are currently
  viewing or editing?
- **A:** Yes, in a lightweight way. A user's avatar (16px circle) appears on the top-left corner of the card they're currently viewing (expanded). Max 3 avatars per card; overflow shows "+N". When multiple users have the same node expanded, each sees the others' avatars. No cursor tracking or live selection sharing — just presence indicators. Presence data comes from the existing WebSocket connection.

### 10.5 Accessibility

- **Q**: How does the tree view work with screen readers and keyboard-only
  navigation?
- **A:** The tree uses ARIA `role="tree"` with `role="treeitem"` for each card. Arrow keys navigate: Up/Down moves between rows, Left/Right moves between cards within a row. Enter expands the focused card. Escape collapses. Tab moves focus to the breadcrumb bar, then the connected-nodes bar, then back to the tree. Each card announces its title, summary, and position ("Node 3 of 8 at depth 2"). This must be tested with VoiceOver and NVDA.

---

## Decision Log

> Record decisions as questions are resolved.

| Date | Question | Decision | Rationale |
| ---- | -------- | -------- | --------- |
| —    | —        | —        | —         |
