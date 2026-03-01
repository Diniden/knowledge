# 02-FRONTEND / 07 — KNOWLEDGE GRAPH UI PLAN

> **Purpose**: Define the complete knowledge graph visualization UI as a vertical
> tree view with virtual scrolling, expand-to-fullscreen document navigation,
> connected-nodes bar, breadcrumb trail, resource side panel, and tree tab
> system for isolated subgraphs.
>
> **Phase**: 2 (Core Systems)
> **Dependencies**: `02-FRONTEND/02-COMPONENTS-PLAN.md`, `04-KNOWLEDGE-GRAPH/01-ARCHITECTURE-PLAN.md`
> **Estimated tasks**: 137

---

## Table of Contents

1. [Tree Layout Engine](#1-tree-layout-engine)
2. [Virtual Row Rendering](#2-virtual-row-rendering)
3. [Node Card Design](#3-node-card-design)
4. [Connecting Lines](#4-connecting-lines)
5. [Tree Tab System](#5-tree-tab-system)
6. [Expanded Document View](#6-expanded-document-view)
7. [Spec Block Rendering](#7-spec-block-rendering)
8. [Resource Side Panel](#8-resource-side-panel)
9. [Connected Nodes Bar](#9-connected-nodes-bar)
10. [Breadcrumb Navigation](#10-breadcrumb-navigation)
11. [Tree Data Management](#11-tree-data-management)
12. [Graph Filtering & Search](#12-graph-filtering--search)
13. [Interaction & Keyboard](#13-interaction--keyboard)
14. [Performance](#14-performance)
15. [Accessibility](#15-accessibility)

---

## Design Overview

The knowledge graph is presented as a **vertical tree** — not a force-directed
canvas. Nodes are organized into horizontal rows by depth, rendered with virtual
scrolling. Clicking a node expands it to a near-fullscreen document view with
connected nodes peeking from the bottom and previously visited nodes as
breadcrumb cards peeking from the top.

### Core Concepts

| Concept | Description |
|---------|-------------|
| **Tree view** | Primary visualization. Rows = depth levels. Each row contains nodes at that BFS depth from the root. Virtual-scrolled vertically, horizontally scrollable within rows. |
| **Isolated trees** | When the selected node set contains disconnected subgraphs, each gets its own tab/page. |
| **Primary node** | Root of a tree. Explicitly provided, or auto-detected via leaf-BFS algorithm. |
| **Row merge rule** | If >2 rows, merge the solo primary-node row into the second row. If ≤2 rows, primary stays solo in row 1. |
| **Expanded document** | Clicking a card expands it to fill most of the screen with its specs rendered as markdown blocks. Tree fades behind. |
| **Connected nodes bar** | Below the expanded document, horizontally scrolling cards of linked nodes peek up from the bottom edge. |
| **Breadcrumb trail** | Previously visited nodes peek down from the top as cards. Clicking one navigates back. |
| **Resource side panel** | When a spec with associated resources is clicked inside the expanded document, a side panel shows linked UIs, images, and attachments. |
| **Scroll model** | Mac trackpad two-finger scroll for vertical and horizontal movement. No pinch-to-zoom (future). |

---

## 1. Tree Layout Engine

### 1.1 Isolated Subgraph Detection

- [ ] **FE-GRAPH-001**: Implement graph isolation detection algorithm
  - Accept a set of node IDs and an edge list
  - Run connected-component analysis (union-find or BFS flood)
  - Return an array of node-ID sets, one per disconnected subgraph
  - Handle degenerate cases: empty set, single node, all nodes connected
- [ ] **FE-GRAPH-002**: Assign isolated subgraphs to tabs
  - Map each connected component to a tab descriptor (`{ id, rootNodeId, nodeIds }`)
  - Maintain stable tab ordering when the node set changes

### 1.2 Primary Node Selection

- [ ] **FE-GRAPH-003**: Implement explicit primary-node override
  - If a primary node ID is provided (e.g. from URL param or user action), use it as tree root
  - Validate the provided ID exists in the subgraph; fall back to auto-detect if not
- [ ] **FE-GRAPH-004**: Implement leaf-BFS primary-node auto-detection
  - Find all leaf nodes in the subgraph (degree 1)
  - From each leaf, run BFS treating all edges as undirected
  - Track the last node(s) reached by each BFS spread
  - The node reached last across all leaf-BFS spreads is the primary node
  - Tie-breaking: pick the node with the highest degree; then alphabetically by ID
- [ ] **FE-GRAPH-005**: Handle edge cases for primary-node selection
  - Single-node graph: that node is primary
  - Two-node graph: pick the node with more external connections (or first alphabetically)
  - Cycle-only graph (no leaves): fall back to highest-degree node

### 1.3 BFS Row Generation

- [ ] **FE-GRAPH-006**: Implement BFS row generation from primary node
  - Starting from the primary node, BFS outward treating all edges as undirected
  - Each BFS depth level becomes one row in the tree
  - Store rows as `Array<Array<NodeId>>` indexed by depth
- [ ] **FE-GRAPH-007**: Implement row merging rule
  - If total row count > 2: merge row 0 (the solo primary node) into row 1 so the primary appears alongside its immediate neighbors in the first visible row
  - If total row count ≤ 2: keep row 0 as the primary node alone (focal point)
- [ ] **FE-GRAPH-008**: Implement sibling ordering within rows
  - Within each row, order nodes to minimize edge crossings with the parent row
  - Group siblings that share the same parent node together
  - Secondary sort: alphabetical by node title for stability

### 1.4 Layout Positioning

- [ ] **FE-GRAPH-009**: Implement horizontal position assignment
  - Calculate x-offset for each node in a row based on card width + gap
  - Center rows horizontally relative to the widest row or the viewport
  - Support variable card widths if summary text overflows
- [ ] **FE-GRAPH-010**: Create `TreeLayoutEngine` module
  - Pure function: `computeTreeLayout(nodes, edges, primaryNodeId?) → TreeLayout`
  - `TreeLayout` type: `{ rows: Row[], tabs: TabDescriptor[], mergedRoot: boolean }`
  - `Row` type: `{ depth: number, nodes: PositionedNode[] }`
  - `PositionedNode` type: `{ nodeId, x, y, width, height, parentIds }`
- [ ] **FE-GRAPH-011**: Implement layout recalculation triggers
  - Recompute on: node set change, edge set change, container resize, tab switch
  - Debounce recalculations (100ms) to batch rapid updates
- [ ] **FE-GRAPH-012**: Write unit tests for tree layout algorithm
  - Test isolation detection with 1, 2, N components
  - Test primary-node auto-detection with known graph topologies
  - Test BFS row generation depth correctness
  - Test row merging rule for >2 rows and ≤2 rows
  - Test edge-case graphs: single node, star, chain, cycle, complete graph

---

## 2. Virtual Row Rendering

### 2.1 Virtual List Setup

- [ ] **FE-GRAPH-013**: Implement virtual list container for tree rows
  - Use a virtualized list library (e.g. `react-window`, `@tanstack/react-virtual`, or custom)
  - Each list item = one tree row (one depth level)
  - Only render rows visible in the viewport plus overscan buffer
  - Container fills available space and responds to resize
- [ ] **FE-GRAPH-014**: Implement row height measurement
  - Calculate row height from card height + row padding/gap
  - Support variable row heights if card content differs
  - Provide estimated item size for initial layout before measurement
- [ ] **FE-GRAPH-015**: Configure overscan (buffer rows above/below viewport)
  - Default overscan: 3 rows above and below the viewport
  - Configurable via performance settings
  - Prevents blank flash during fast scrolling

### 2.2 Tree Row Component

- [ ] **FE-GRAPH-016**: Create `TreeRow` component
  - Accept: `row` (array of positioned nodes), `depth`, event handlers
  - Render node cards in a horizontal flex/grid layout at computed positions
  - Row-level container with its own horizontal scroll region
- [ ] **FE-GRAPH-017**: Implement horizontal overflow handling per row
  - If node cards in a row exceed the viewport width, allow horizontal scrolling within that row
  - Fade indicators at left/right edges when scroll is available
  - Persist horizontal scroll position when row is recycled by the virtual list

### 2.3 Scroll Behavior

- [ ] **FE-GRAPH-018**: Implement vertical two-finger scroll (Mac trackpad)
  - Bind to native wheel events for vertical axis
  - Smooth scroll behavior (no scroll snapping unless explicitly enabled)
  - Ensure scroll works with both trackpad and mouse wheel
- [ ] **FE-GRAPH-019**: Implement horizontal two-finger scroll within rows
  - Bind horizontal wheel delta to the active row's horizontal scroll
  - Detect dominant scroll direction to avoid conflicting vertical+horizontal input
  - Support shift+scroll as alternative horizontal scroll on non-trackpad devices
- [ ] **FE-GRAPH-020**: Implement programmatic scroll-to-row
  - `scrollToRow(depth: number, alignment?: 'start' | 'center' | 'end')` API
  - Used when navigating to a specific node — scroll its row into view
  - Smooth animated scroll with configurable duration
- [ ] **FE-GRAPH-021**: Handle container resize and viewport recalculation
  - Listen for container resize via `ResizeObserver`
  - Recalculate visible row range and re-render
  - Maintain current scroll position relative to content (not pixel offset)

---

## 3. Node Card Design

### 3.1 Card Visual Specification

- [ ] **FE-GRAPH-022**: Define node card visual specification
  - Shape: rounded rectangle card (spec document box)
  - Default size: 200px wide × 80px tall (configurable)
  - Content: summary text (1–3 lines), status icon, spec count badge
  - Border: subtle, colored on selection/hover
  - Background: themed surface color (light/dark mode)
  - Shadow: subtle elevation for depth; increased on hover
  - Border-radius: 8–12px for polished look

### 3.2 Card Component

- [ ] **FE-GRAPH-023**: Create `SpecDocumentCard` component
  - Accept: `node` data (document ID, title, summary, status, spec count, tags)
  - Render: summary text (truncated), status indicator, spec count badge
  - Handle: click (expand to fullscreen), hover, right-click (context menu)
  - Performance: `React.memo` to prevent re-render when only viewport scrolls
- [ ] **FE-GRAPH-024**: Implement summary text display
  - Show the agent-generated summarizing statement for the spec document
  - Truncate to 3 lines with ellipsis overflow
  - User-editable: inline edit on double-click or via context menu
  - Save edits via API (debounced auto-save)
- [ ] **FE-GRAPH-025**: Implement node card status indicators
  - Synced: small green dot (top-right corner)
  - Modified: yellow dot
  - Conflicted: red dot with warning icon
  - New: "NEW" badge in corner
  - Consistent placement across all cards

### 3.3 Card States

- [ ] **FE-GRAPH-026**: Implement node card hover state
  - Elevated shadow, slight scale-up (1.02×)
  - Full summary text shown in tooltip if truncated
  - Subtle border color change
- [ ] **FE-GRAPH-027**: Implement node card selected state
  - Highlighted border (primary color)
  - Persistent elevation
  - Visual distinction from hover (border weight or color saturation)
- [ ] **FE-GRAPH-028**: Implement node card focused state (keyboard navigation)
  - Visible focus ring (high-contrast outline)
  - Distinct from hover and selected states
  - Follows OS focus-visible conventions

### 3.4 Card Metadata

- [ ] **FE-GRAPH-029**: Implement spec count badge on node cards
  - Small badge showing number of specs contained in the document
  - Position: bottom-right of card
  - Styled as a pill badge
- [ ] **FE-GRAPH-030**: Implement tag chips on node cards
  - Show 1–2 tags below summary text (if space permits)
  - "+N more" badge for additional tags
  - Tag colors match tag category colors
- [ ] **FE-GRAPH-031**: Implement dark mode card styling
  - Dark surface background, light text
  - Adjusted shadow and border colors for dark backgrounds
  - Status indicator colors remain vivid on dark surfaces

---

## 4. Connecting Lines

### 4.1 Tree View Lines

- [ ] **FE-GRAPH-032**: Implement parent-to-child vertical connecting lines
  - Render lines from the bottom edge of parent cards to the top edge of child cards
  - Lines run vertically between rows, with horizontal segments to reach offset children
  - Use "elbow" or "step" style routing (vertical → horizontal → vertical)
- [ ] **FE-GRAPH-033**: Implement multi-child branch routing
  - When a parent has multiple children, route lines to avoid overlap
  - Shared vertical trunk from parent splits into horizontal rail to each child
  - Rounded corners at turning points for clean visual
- [ ] **FE-GRAPH-034**: Define line styling (color, thickness, rounded corners)
  - Default: 1.5px width, muted theme color (gray/slate)
  - Edge-type coloring (optional enhancement): color lines by the edge type connecting parent and child
  - Rounded corners at bends (border-radius on path segments)
  - Consistent with overall theme (dark/light mode)
- [ ] **FE-GRAPH-035**: Implement line rendering with SVG overlay layer
  - SVG element overlaid on the tree view, positioned absolutely
  - Lines rendered as `<path>` elements for smooth curves and elbows
  - SVG layer does not capture pointer events (pass-through to cards)
- [ ] **FE-GRAPH-036**: Implement line clipping for virtualized rows
  - Only render line segments whose endpoints are within or near the visible viewport
  - Extend visible range by overscan buffer to prevent pop-in
  - Recalculate visible lines on scroll events (throttled)

### 4.2 Expanded View Lines

- [ ] **FE-GRAPH-037**: Implement expanded-document-to-connected-nodes lines
  - Render lines from the bottom of the expanded document to the tops of connected node cards
  - Lines animate in when connected nodes bar appears
  - Curved bezier paths for organic feel
- [ ] **FE-GRAPH-038**: Implement breadcrumb-to-document connecting line
  - Single line from the bottom of the breadcrumb card to the top of the expanded document
  - Subtle dashed or dotted style to distinguish from tree structure lines
  - Updates when breadcrumb trail changes

### 4.3 Line Interaction

- [ ] **FE-GRAPH-039**: Implement line highlighting on hover/selection
  - When hovering a node card, highlight lines connecting to its parent and children
  - Increase line width and opacity on highlight
  - Animate highlight transition (fade in/out)
- [ ] **FE-GRAPH-040**: Implement line animation for navigation transitions
  - When a connected node becomes the expanded document, animate the connecting line
  - Line "pulls" the card up into the expanded position
  - Use CSS transitions or requestAnimationFrame-based animation

---

## 5. Tree Tab System

### 5.1 Tab Rendering

- [ ] **FE-GRAPH-041**: Create `TreeTabBar` component
  - Horizontal tab strip above the tree view
  - One tab per isolated subgraph detected by the layout engine
  - Hidden when only one isolated tree exists (no tabs needed)
- [ ] **FE-GRAPH-042**: Generate tab labels
  - Use the primary node's document title as the tab label
  - Truncate long labels with ellipsis
  - Show node count as a subtle badge: "(12 nodes)"
- [ ] **FE-GRAPH-043**: Implement active tab visual indicator
  - Active tab: bold text, underline or bottom border accent
  - Inactive tabs: muted text, no underline
  - Smooth indicator transition when switching tabs

### 5.2 Tab Behavior

- [ ] **FE-GRAPH-044**: Implement tab switching with view state preservation
  - Clicking a tab switches the tree view to that isolated subgraph
  - Preserve scroll position, expanded document state, and breadcrumb trail per tab
  - Restore state when switching back to a previously viewed tab
- [ ] **FE-GRAPH-045**: Implement tab overflow handling
  - When tabs exceed the available width, show left/right scroll arrows
  - Alternative: collapse overflow tabs into a "more" dropdown menu
  - Active tab always scrolled into view
- [ ] **FE-GRAPH-046**: Implement tab reordering via drag-and-drop
  - Drag a tab to reorder within the tab bar
  - Persist custom tab order in session state
  - Visual feedback during drag (placeholder gap, shadow on dragged tab)
- [ ] **FE-GRAPH-047**: Implement tab close/hide for focusing
  - Optional close button on tabs to hide an isolated tree
  - "Show all tabs" action to restore hidden tabs
  - Useful when focusing on a specific subgraph
- [ ] **FE-GRAPH-048**: Implement active tab persistence across sessions
  - Save last-active tab ID in local storage or URL param
  - Restore active tab on page reload
  - Fall back to first tab if saved tab no longer exists

---

## 6. Expanded Document View

### 6.1 Expansion Behavior

- [ ] **FE-GRAPH-049**: Implement click-to-expand on node cards
  - Single click on a `SpecDocumentCard` triggers expansion
  - Card animates from its position in the tree to fill most of the screen
  - Expansion target area: ~85% of viewport width, ~70% of viewport height (leaving room for breadcrumbs above and connected nodes below)
- [ ] **FE-GRAPH-050**: Implement expansion animation
  - Animate card position, size, and border-radius from tree to expanded state
  - Use CSS `transform` and `clip-path` for GPU-accelerated animation
  - Duration: 300–400ms with ease-out curve
  - Card content cross-fades from summary to full document during animation
- [ ] **FE-GRAPH-051**: Implement tree view fade-out
  - While expanded document is shown, tree view behind fades to low opacity (10–20%)
  - Apply a blur filter to the tree background for depth effect
  - Tree remains in the DOM but is non-interactive while a document is expanded
  - Fade animation synchronized with expansion animation

### 6.2 Document Container

- [ ] **FE-GRAPH-052**: Create `ExpandedDocumentView` container component
  - Accept: document ID, spec list, connected node IDs, onClose callback
  - Render: document header, spec block list, close button
  - Manage internal scroll for long documents
  - Position: centered in viewport, above faded tree
- [ ] **FE-GRAPH-053**: Implement document header in expanded view
  - Document title (large, prominent)
  - Document metadata: author, last modified, spec count
  - Close button (top-right corner, × icon)
  - Subtle bottom border separating header from spec content
- [ ] **FE-GRAPH-054**: Implement spec block list within expanded document
  - Render each spec in the document as a `SpecBlock` component (see Section 7)
  - Vertical list with visual separators between blocks
  - Scrollable if content exceeds the expanded view height
- [ ] **FE-GRAPH-055**: Implement expanded document vertical scrolling
  - Native scroll within the expanded document container
  - Scroll shadows at top/bottom when content overflows
  - Scroll position resets when opening a different document

### 6.3 Collapse Behavior

- [ ] **FE-GRAPH-056**: Implement close/collapse animation
  - Clicking close button or pressing Escape reverses the expansion
  - Expanded view animates back to the card's position in the tree
  - Tree view fades back to full opacity
  - Duration matches expansion animation
- [ ] **FE-GRAPH-057**: Implement Escape key to close expanded view
  - Keyboard shortcut: `Escape` closes the expanded document
  - If resource side panel is open, first Escape closes the panel; second Escape closes the document
  - Focus returns to the node card in the tree view
- [ ] **FE-GRAPH-058**: Handle expanded view data updates via WebSocket
  - If the currently expanded document receives a live update, reflect changes
  - Show a subtle "updated" indicator rather than disruptive re-render
  - Option to refresh content manually

---

## 7. Spec Block Rendering

### 7.1 Individual Spec Display

- [ ] **FE-GRAPH-059**: Create `SpecBlock` component
  - Accept: spec data (ID, title, content, author, tags, hasResources)
  - Render spec content as clean markdown-like blocks
  - Visually distinct boundary between each spec
  - Clickable for spec-level actions
- [ ] **FE-GRAPH-060**: Implement markdown-style content rendering
  - Render spec content as formatted text (headings, bold, italic, lists, links, code)
  - Use sanitized HTML rendering or a React markdown library
  - Syntax highlighting for code blocks within specs
  - Custom rendering for spec-to-spec links (clickable references)
- [ ] **FE-GRAPH-061**: Implement spec block visual boundaries
  - Subtle separator between adjacent spec blocks (horizontal rule or spacing)
  - Left border accent: colored vertical bar on the left edge of each block
  - Optional light background tint per block for alternating visual rhythm
  - Boundary style configurable (border, tint, spacing, or combination)

### 7.2 Resource Indicators

- [ ] **FE-GRAPH-062**: Implement resource indicator badge on spec blocks
  - Specs with associated UIs/graphics/resources show a small icon/badge
  - Icon: paperclip, link, or resource-specific icon (image, code, file)
  - Position: right side of spec block header or inline with title
  - Badge count if multiple resources: "3 resources"
- [ ] **FE-GRAPH-063**: Implement spec block click for resource panel
  - Clicking a spec block with resources opens the `ResourceSidePanel`
  - Clicking a spec block without resources selects it (highlight, no panel)
  - Visual feedback on click (brief highlight animation)

### 7.3 Spec Block Details

- [ ] **FE-GRAPH-064**: Implement spec block hover and highlight states
  - Hover: subtle background highlight, cursor change
  - Selected: persistent background highlight, resource panel linked
  - Non-selected specs slightly dimmed when one is selected
- [ ] **FE-GRAPH-065**: Implement spec metadata display within block
  - Compact metadata line: spec ID, author, last modified timestamp
  - Positioned below spec content or in a collapsible header
  - Tags shown as small color chips inline
- [ ] **FE-GRAPH-066**: Implement spec block collapse/expand for long content
  - If spec content exceeds a threshold (e.g. 20 lines), show truncated with "Show more"
  - Expand inline to show full content
  - Collapse back to truncated on "Show less"
- [ ] **FE-GRAPH-067**: Implement spec block loading skeleton
  - Skeleton placeholder matching spec block layout
  - Show while spec content is loading or lazy-loaded
  - Smooth transition from skeleton to real content

---

## 8. Resource Side Panel

### 8.1 Panel Layout

- [ ] **FE-GRAPH-068**: Create `ResourceSidePanel` component
  - Slide-in panel from the right edge of the expanded document view
  - Width: 300–400px (configurable via drag handle)
  - Header: resource type tabs or list title, close button
  - Body: scrollable list of resources
  - Does not overlay the expanded document — the document narrows to make room
- [ ] **FE-GRAPH-069**: Implement slide-in panel animation
  - Panel slides in from the right with a smooth transition (200–300ms)
  - Expanded document width animates narrower to accommodate
  - Panel slides out on close with reverse animation
- [ ] **FE-GRAPH-070**: Implement panel resize handle
  - Draggable left edge to adjust panel width
  - Minimum width: 250px, maximum width: 50% of viewport
  - Double-click handle to reset to default width
- [ ] **FE-GRAPH-071**: Implement panel close behavior
  - Close button in panel header
  - Close when clicking a spec block that has no resources
  - Close when Escape is pressed (if panel is focused)

### 8.2 Resource Types

- [ ] **FE-GRAPH-072**: Implement generated UI iframe embedding
  - Render linked generative UIs in a sandboxed iframe within the panel
  - Iframe sizing: fill panel width, configurable height
  - Loading indicator while iframe loads
  - Error state if iframe fails to load
- [ ] **FE-GRAPH-073**: Implement image resource display
  - Show linked images in a scrollable gallery
  - Click to enlarge (lightbox overlay)
  - Image captions from resource metadata
- [ ] **FE-GRAPH-074**: Implement file attachment listing
  - List linked file attachments with icon, name, size
  - Click to download or preview (for supported types)
  - File type icons (PDF, code, text, etc.)
- [ ] **FE-GRAPH-075**: Implement related spec preview cards
  - Show cards for specs referenced by the current spec
  - Click to navigate to that spec's document (triggers navigation through the tree)

### 8.3 Panel States

- [ ] **FE-GRAPH-076**: Implement panel loading and empty states
  - Loading: skeleton placeholders matching resource layout
  - Empty: message "No resources linked to this spec" with icon
  - Error: retry button if resource fetch fails

---

## 9. Connected Nodes Bar

### 9.1 Bar Layout

- [ ] **FE-GRAPH-077**: Create `ConnectedNodesBar` component
  - Horizontal bar at the bottom of the screen when a document is expanded
  - Contains cards for all nodes directly connected to the expanded document
  - Cards "peek up" from the bottom edge of the viewport
  - Bar height: ~120px (card peek height)
- [ ] **FE-GRAPH-078**: Implement connected-node card layout
  - Cards arranged horizontally in a single row
  - Card design: compact version of `SpecDocumentCard` (smaller, summary only)
  - Cards show ~60% of their height, the rest hidden below the viewport edge
  - Gap between cards: 12–16px
- [ ] **FE-GRAPH-079**: Implement card peek animation
  - Cards animate up from below the viewport when the expanded document finishes opening
  - Staggered animation: cards appear left-to-right with slight delay
  - Animation duration: 200ms per card, 50ms stagger
  - Cards animate back down when the document closes

### 9.2 Bar Scrolling

- [ ] **FE-GRAPH-080**: Implement horizontal scroll with trackpad/mouse wheel
  - Two-finger horizontal scroll or shift+scroll to move through cards
  - Mouse wheel horizontal scroll on the bar area
  - Smooth scroll behavior, no snapping
- [ ] **FE-GRAPH-081**: Implement scroll position indicators
  - Fade gradient on left/right edges when more cards are scrollable
  - Optional left/right arrow buttons for non-trackpad users
  - Hide indicators when all cards fit without scrolling

### 9.3 Bar Interaction

- [ ] **FE-GRAPH-082**: Implement connecting lines from document to connected-node cards
  - SVG lines from the bottom of the expanded document to the top of each card
  - Lines use curved bezier paths
  - Lines render in sync with card peek animation
- [ ] **FE-GRAPH-083**: Implement click-on-connected-card navigation
  - Clicking a connected-node card navigates to that node's document
  - Animation: clicked card expands upward to become the new fullscreen document
  - Previous document moves to the breadcrumb trail
  - Connected nodes bar refreshes with the new document's connections
- [ ] **FE-GRAPH-084**: Implement connected-node card content
  - Summary text (1–2 lines), document title
  - Status indicator dot
  - Edge type label showing the relationship to the parent document
- [ ] **FE-GRAPH-085**: Implement empty state for connected nodes bar
  - If the expanded document has no connections, show subtle message: "No connected documents"
  - Position at bottom of screen in the same bar area
  - Do not show the bar at all (no peek-up) if no connections exist

---

## 10. Breadcrumb Navigation

### 10.1 Breadcrumb Rendering

- [ ] **FE-GRAPH-086**: Create `BreadcrumbTrail` component
  - Horizontal strip at the top of the viewport when navigating through documents
  - Contains cards of previously visited documents peeking down from the top edge
  - Only visible when at least one navigation has occurred (trail length ≥ 1)
  - Trail height: ~80px (card peek height)
- [ ] **FE-GRAPH-087**: Implement breadcrumb card rendering
  - Compact card showing document title and a connecting line indicator
  - Cards show ~50% of their height, rest hidden above the viewport edge
  - Most recent breadcrumb closest to the expanded document (rightmost or centered)
  - Older breadcrumbs trail to the left
- [ ] **FE-GRAPH-088**: Implement connecting line from breadcrumb to current document
  - Single line from the bottom of the most recent breadcrumb card to the top of the expanded document
  - Line style: dashed or lighter weight to distinguish from structural tree lines
  - Line updates position when breadcrumb trail changes

### 10.2 Breadcrumb Behavior

- [ ] **FE-GRAPH-089**: Implement click-on-breadcrumb back-navigation
  - Clicking a breadcrumb card navigates back to that document
  - Current document animates down (or fades), breadcrumb card expands to become the document
  - All breadcrumbs after the clicked one are removed from the trail
  - Connected nodes bar updates for the navigated-to document
- [ ] **FE-GRAPH-090**: Implement breadcrumb trail state management
  - Maintain an ordered stack of visited document IDs
  - Push current document to trail when navigating to a connected node
  - Pop entries when navigating back via breadcrumb click
  - Clear trail when returning to tree view or switching tabs
- [ ] **FE-GRAPH-091**: Implement breadcrumb animation on forward/back navigation
  - Forward: current breadcrumb slides up into the trail, new document expands from bottom
  - Back: breadcrumb slides down to become the document, subsequent breadcrumbs fade out
  - Animation duration: 250–350ms
- [ ] **FE-GRAPH-092**: Implement breadcrumb overflow for long trails
  - If trail length exceeds available width, collapse older breadcrumbs
  - Show a "..." or "+N more" indicator for collapsed breadcrumbs
  - Click the indicator to see a dropdown of all collapsed breadcrumbs
- [ ] **FE-GRAPH-093**: Implement breadcrumb card content
  - Document title (truncated to 1 line)
  - Small document icon or status indicator
  - Tooltip on hover showing full title and navigation depth
- [ ] **FE-GRAPH-094**: Implement clear trail action
  - Button or keyboard shortcut to clear the entire breadcrumb trail
  - Returns to the tree view with no document expanded
  - Keyboard shortcut: `Ctrl+Backspace` or similar

---

## 11. Tree Data Management

### 11.1 Data Loading

- [ ] **FE-GRAPH-095**: Implement graph data fetching for tree view
  - Fetch node and edge data from the knowledge graph API
  - Accept parameters: project ID, optional filter criteria
  - Loading state: show skeleton tree (placeholder rows and cards)
  - Error state: show error message with retry button
- [ ] **FE-GRAPH-096**: Implement data transformation from graph API to tree structure
  - Transform raw API response (nodes + edges) into `TreeLayout` via the layout engine
  - Map API node data to `SpecDocumentCard` props
  - Map API edge data to connection metadata for lines and connected-nodes bar
- [ ] **FE-GRAPH-097**: Implement incremental loading for deep trees
  - For trees with many depth levels, initially load first N rows (e.g. 10)
  - "Load more" indicator at the bottom of the tree
  - Fetch additional depth levels on scroll or explicit request
  - Merge incrementally loaded nodes into existing tree layout

### 11.2 Caching

- [ ] **FE-GRAPH-098**: Implement tree data caching in MobX store
  - Cache nodes, edges, and computed tree layout in a `GraphTreeStore`
  - Cache key: project ID + active filter combination
  - Partial updates: update individual nodes/edges without full re-fetch
- [ ] **FE-GRAPH-099**: Implement cache invalidation strategy
  - Invalidate on: WebSocket event, explicit refresh action, filter change
  - Time-based staleness: mark cache stale after configurable TTL
  - Stale-while-revalidate: show cached data immediately, refresh in background

### 11.3 Real-Time Updates

- [ ] **FE-GRAPH-100**: Implement WebSocket live updates for nodes
  - `spec:created` → add new node card with fade-in animation
  - `spec:updated` → update node card data, flash subtle indicator
  - `spec:deleted` → remove node card with fade-out animation
  - Re-run layout engine after node additions/removals
- [ ] **FE-GRAPH-101**: Implement WebSocket live updates for edges
  - `edge:created` → add connecting line, update connected-nodes bar if applicable
  - `edge:deleted` → remove connecting line, update connected-nodes bar
  - Re-run isolation detection (edge changes can merge or split subgraphs)
- [ ] **FE-GRAPH-102**: Implement update notification banner
  - When significant changes occur (new subgraph, major restructure): show banner
  - "Tree updated — 3 new nodes added" with optional "Re-center" action
  - Subtle notification for minor changes (single node update)
- [ ] **FE-GRAPH-103**: Implement data refresh and manual reload
  - Refresh button in the tree toolbar to force re-fetch
  - Pull-to-refresh gesture (optional, mobile consideration)
  - Keyboard shortcut: `Ctrl+R` within tree view (prevent page reload)

---

## 12. Graph Filtering & Search

### 12.1 Filter Panel

- [ ] **FE-GRAPH-104**: Implement filter panel UI for tree view
  - Toggleable panel (popover or collapsible sidebar)
  - Filter categories: edge type, author, tags, status
  - Active filters shown as chips below the tree toolbar
  - "Clear all filters" button
  - Filter count badge on the filter toggle button
- [ ] **FE-GRAPH-105**: Implement edge type filtering
  - Checkboxes for each edge type (derived-from, depends-on, related-to, contradicts, supersedes)
  - Filtering by edge type determines which connections are shown and which nodes appear in the tree
  - Toggle all on/off shortcut
  - Hidden edges dim but do not remove associated nodes (configurable: dim vs. hide)
- [ ] **FE-GRAPH-106**: Implement author filtering
  - Multi-select: show documents by specific authors
  - Avatar + name for each author
  - "Show all" / "Show mine only" shortcuts
- [ ] **FE-GRAPH-107**: Implement tag filtering
  - Multi-select tag filter with autocomplete
  - Mode toggle: match ANY selected tag (OR) vs. ALL selected tags (AND)
  - Tag list auto-populated from documents in the current view
- [ ] **FE-GRAPH-108**: Implement status filtering
  - Filter by: synced, modified, conflicted
  - Quick action: "Show conflicts only" for reviewing issues

### 12.2 Filter Behavior

- [ ] **FE-GRAPH-109**: Implement filter application to tree view
  - Filtered-out nodes: either dimmed (low opacity) or completely hidden (configurable)
  - When nodes are hidden, the tree layout recalculates to close gaps
  - Smooth animated transition when filters change
  - Isolation detection re-runs (filtering can split a connected graph into multiple trees)
- [ ] **FE-GRAPH-110**: Implement filter chip display and clear
  - Active filters shown as removable chips in the toolbar area
  - Click × on a chip to remove that filter
  - "Clear all" button when any filter is active
- [ ] **FE-GRAPH-111**: Implement filter/search state persistence in URL
  - Encode active filters in URL query params for sharing and bookmarking
  - Restore filters from URL on page load
  - Update URL without full page navigation (history.pushState)

### 12.3 Search

- [ ] **FE-GRAPH-112**: Implement search input in tree toolbar
  - Search field with magnifying glass icon
  - Search-as-you-type with 300ms debounce
  - Search across: document titles, summary text, spec content, tags, author names
  - Result count display: "5 of 42 documents match"
- [ ] **FE-GRAPH-113**: Implement search result highlighting
  - Matching node cards highlighted (colored border or glow)
  - Non-matching cards dimmed
  - "Next" / "Previous" buttons to cycle through matches
  - Viewport scrolls to center on the current match
  - Keyboard: `Enter` for next, `Shift+Enter` for previous

---

## 13. Interaction & Keyboard

### 13.1 Mouse/Trackpad Interactions

- [ ] **FE-GRAPH-114**: Implement node card single-click (expand to fullscreen)
  - Single click on a card in tree view triggers the expand-to-fullscreen flow
  - Click on an already-expanded document's card in tree view does nothing (already open)
- [ ] **FE-GRAPH-115**: Implement right-click context menu on node cards
  - Context menu items: "Open in editor", "View version history", "Copy link", "View in graph table", separator, "Edit summary"
  - Context menu positioned at cursor
  - Keyboard: `Shift+F10` or context menu key opens the menu for the focused card
- [ ] **FE-GRAPH-116**: Implement double-click on node card for inline summary edit
  - Double-click opens an inline text editor on the card's summary text
  - Save on Enter or blur; cancel on Escape
  - Prevent conflict with single-click expand (use click delay or modifier key)

### 13.2 Keyboard Navigation

- [ ] **FE-GRAPH-117**: Implement arrow key navigation in tree view
  - `Up` / `Down`: move focus between rows (parent/child direction)
  - `Left` / `Right`: move focus between sibling nodes within a row
  - Focus visually indicated with focus ring
  - Scroll viewport to keep focused card visible
- [ ] **FE-GRAPH-118**: Implement keyboard navigation in expanded document view
  - `Up` / `Down`: move focus between spec blocks
  - `Enter` on a spec block with resources: open resource side panel
  - `Tab` / `Shift+Tab`: cycle between document, connected nodes bar, breadcrumb trail
- [ ] **FE-GRAPH-119**: Implement Enter to expand focused node card
  - Pressing `Enter` when a card is focused in tree view triggers expand-to-fullscreen
  - Same behavior as single-click
- [ ] **FE-GRAPH-120**: Implement Escape for progressive dismiss
  - Level 1: Close resource side panel (if open)
  - Level 2: Close expanded document view (return to tree)
  - Level 3: Clear search/filter (if active)
  - Each Escape press handles the innermost dismissible layer
- [ ] **FE-GRAPH-121**: Implement keyboard shortcuts
  - `Ctrl+F` or `/`: focus search input
  - `Ctrl+Backspace`: clear breadcrumb trail and return to tree
  - `F`: fit tree to viewport (scroll to show root row centered)
  - `?`: show keyboard shortcuts help overlay
- [ ] **FE-GRAPH-122**: Implement keyboard shortcuts help overlay
  - Modal or floating panel listing all keyboard shortcuts
  - Grouped by context: tree view, expanded document, navigation
  - Toggle with `?` key
  - Closable with Escape

---

## 14. Performance

### 14.1 Virtual List Optimization

- [ ] **FE-GRAPH-123**: Tune virtual list overscan and buffer sizes
  - Profile scrolling performance with 100+ rows
  - Adjust overscan count to balance memory usage vs. scroll smoothness
  - Target: no visible blank rows during normal scroll speed
- [ ] **FE-GRAPH-124**: Implement React.memo and useMemo for node cards
  - Memoize `SpecDocumentCard` — re-render only when card data changes
  - Memoize `TreeRow` — re-render only when row content changes
  - Memoize connecting line calculations per row pair
- [ ] **FE-GRAPH-125**: Implement debounced and throttled scroll handlers
  - Throttle scroll event handlers (16ms for 60fps)
  - Debounce layout recalculations triggered by scroll (50ms)
  - Use `requestAnimationFrame` for scroll-linked rendering

### 14.2 Animation & Rendering

- [ ] **FE-GRAPH-126**: Implement GPU-accelerated CSS animations
  - Use `transform` and `opacity` for all animations (composited properties)
  - Avoid animating `width`, `height`, `top`, `left` (layout-triggering properties)
  - Use `will-change` hint on elements about to animate
  - Prefer CSS transitions over JavaScript animation where possible
- [ ] **FE-GRAPH-127**: Implement lazy loading for spec content in expanded view
  - Load only spec titles/summaries initially when document expands
  - Lazy-load full spec content as user scrolls within the document
  - Skeleton placeholder for not-yet-loaded spec blocks
- [ ] **FE-GRAPH-128**: Implement SVG line rendering optimization
  - Batch SVG path updates using `requestAnimationFrame`
  - Minimize DOM mutations: update `d` attributes in place rather than recreating elements
  - Use CSS `contain: strict` on the SVG overlay for isolation

### 14.3 Computation

- [ ] **FE-GRAPH-129**: Profile and optimize tree layout engine
  - Benchmark layout computation with graphs of 50, 200, 500, 1000 nodes
  - Target: layout computation < 50ms for 500-node graph
  - Optimize BFS and isolation detection with adjacency list representation
- [ ] **FE-GRAPH-130**: Implement Web Worker for tree layout calculation
  - Offload `computeTreeLayout` to a Web Worker for large graphs
  - Post node/edge data to worker, receive `TreeLayout` result
  - Show loading indicator while worker computes
  - Fallback to main thread for small graphs (< 100 nodes)

---

## 15. Accessibility

### 15.1 Tree View Accessibility

- [ ] **FE-GRAPH-131**: Implement ARIA tree role structure
  - Tree container: `role="tree"` with `aria-label="Knowledge graph tree view"`
  - Each row: `role="group"` with `aria-label="Depth level N"`
  - Each card: `role="treeitem"` with `aria-expanded` state
  - `aria-level` set per row depth
  - `aria-setsize` and `aria-posinset` for sibling position
- [ ] **FE-GRAPH-132**: Implement screen reader announcements
  - On tree load: "Knowledge graph tree with N documents across M depth levels"
  - On focus change: "Document: [title], depth level N, [spec count] specs, [connection count] connections"
  - On expand: "Expanded document [title], showing [spec count] specs"
  - On navigate: "Navigated to [title] via [edge type] connection"
- [ ] **FE-GRAPH-133**: Implement focus management for expanded document view
  - When document expands, move focus to the document header
  - When document collapses, return focus to the originating card in the tree
  - Focus trap within expanded view (Tab cycles through document elements, not tree behind)

### 15.2 Visual Accessibility

- [ ] **FE-GRAPH-134**: Implement high-contrast mode for connecting lines
  - In high-contrast mode, increase line width and use solid black/white lines
  - Ensure lines are distinguishable from card borders
  - Support `forced-colors` media query for Windows High Contrast
- [ ] **FE-GRAPH-135**: Implement reduced-motion alternative
  - Respect `prefers-reduced-motion` OS setting
  - Replace animations with instant transitions (no sliding, no fading)
  - Card expand: instant swap instead of animated transition
  - Connected nodes bar: appear instantly instead of staggered peek

### 15.3 Alternative Views

- [ ] **FE-GRAPH-136**: Implement alternative table view
  - Accessible alternative to the visual tree
  - Table columns: document title, depth level, parent document, connection count, status, tags
  - Sortable and filterable
  - Keyboard navigable (standard table navigation)
  - Toggle between tree view and table view via toolbar button
- [ ] **FE-GRAPH-137**: Implement accessible labels for all interactive elements
  - All buttons, links, and interactive elements have `aria-label` or visible text
  - All images and icons have `alt` text or `aria-hidden="true"` if decorative
  - All form inputs in filter panel have associated labels
  - Context menus have `role="menu"` with `role="menuitem"` children

---

## Summary

### Task Count by Section

| Section | Tasks |
|---------|-------|
| 1. Tree Layout Engine | 12 (FE-GRAPH-001 through FE-GRAPH-012) |
| 2. Virtual Row Rendering | 9 (FE-GRAPH-013 through FE-GRAPH-021) |
| 3. Node Card Design | 10 (FE-GRAPH-022 through FE-GRAPH-031) |
| 4. Connecting Lines | 9 (FE-GRAPH-032 through FE-GRAPH-040) |
| 5. Tree Tab System | 8 (FE-GRAPH-041 through FE-GRAPH-048) |
| 6. Expanded Document View | 10 (FE-GRAPH-049 through FE-GRAPH-058) |
| 7. Spec Block Rendering | 9 (FE-GRAPH-059 through FE-GRAPH-067) |
| 8. Resource Side Panel | 9 (FE-GRAPH-068 through FE-GRAPH-076) |
| 9. Connected Nodes Bar | 9 (FE-GRAPH-077 through FE-GRAPH-085) |
| 10. Breadcrumb Navigation | 9 (FE-GRAPH-086 through FE-GRAPH-094) |
| 11. Tree Data Management | 9 (FE-GRAPH-095 through FE-GRAPH-103) |
| 12. Graph Filtering & Search | 10 (FE-GRAPH-104 through FE-GRAPH-113) |
| 13. Interaction & Keyboard | 9 (FE-GRAPH-114 through FE-GRAPH-122) |
| 14. Performance | 8 (FE-GRAPH-123 through FE-GRAPH-130) |
| 15. Accessibility | 7 (FE-GRAPH-131 through FE-GRAPH-137) |
| **TOTAL** | **137** |

> Note: Many tasks contain detailed sub-items covering animation specs, edge
> cases, keyboard interactions, and state management. The effective
> implementation effort per task often spans 2–4 discrete units of work,
> pushing the true effort well above 200 discrete implementation steps.

### Definition of Done

This plan is complete when:
- [ ] Tree layout engine correctly isolates subgraphs, selects primary nodes, and generates BFS rows
- [ ] Row merging rule applies correctly (merge root into row 2 when >2 rows)
- [ ] Virtual row rendering handles 200+ depth levels without performance degradation
- [ ] Node cards display summary text, status, and tags with polished visual design
- [ ] Connecting lines render cleanly between parent and child nodes across rows
- [ ] Tab system separates isolated trees and preserves view state per tab
- [ ] Clicking a node card expands it to a near-fullscreen document view with fade-out tree
- [ ] Spec blocks render as visually distinct markdown-like blocks with resource indicators
- [ ] Resource side panel shows linked UIs (iframe), images, and attachments
- [ ] Connected nodes bar shows horizontally scrolling cards peeking from the bottom
- [ ] Breadcrumb trail tracks navigation path with cards peeking from the top
- [ ] Clicking connected-node and breadcrumb cards navigates with smooth animation
- [ ] Filtering by edge type, author, tags, and status works in the tree view
- [ ] Search highlights matching nodes and navigates between results
- [ ] Full keyboard navigation works for tree view, expanded document, and all overlays
- [ ] Screen reader support and ARIA roles are implemented for all interactive elements
- [ ] Alternative table view provides an accessible substitute for the visual tree
