# 02-FRONTEND / 02 — COMPONENTS: Open Questions

> **Purpose**: Unresolved questions about the component library, component
> hierarchy, shared component design, feature component behavior, and
> composition patterns. Answers may change tasks in the plan.

---

## 1. Component Library Approach

### 1.1 Build vs. Adopt

- **Q**: Should the project build all common components from scratch, or adopt
  an existing headless UI library (Radix UI, React Aria, Headless UI) and
  style them with BEM SCSS? Headless libraries handle accessibility and
  keyboard navigation but add dependency weight.
- **A:** Adopt Radix UI as the headless primitive layer and style with BEM SCSS. Building accessible dropdowns, dialogs, tooltips, and popovers from scratch is time-consuming and error-prone. Radix provides unstyled, accessible primitives that we wrap in BEM-classed components. Simple components (Button, Badge, Spinner) are built from scratch.

- **Q**: If using a headless library, which one? Radix UI (most complete,
  React-only), React Aria (Adobe, very accessible), or Headless UI (Tailwind
  team, smaller)?
- **A:** Radix UI. It has the best DX for React projects, composable primitive APIs, and handles complex accessibility patterns (focus trapping, arrow key navigation, dismissable overlays). React Aria is excellent but more verbose. Headless UI is too tightly coupled with Tailwind's mental model. Radix's component set covers all our needs: Dialog, Popover, Select, Dropdown Menu, Tooltip, Tabs, Accordion.

- **Q**: Should there be a Storybook or similar component gallery for
  developing and documenting shared components in isolation?
- **A:** Yes, use Storybook. It accelerates shared component development, provides living documentation, and enables visual regression testing. Set it up in Phase 1 alongside the component library. Each shared component gets a story file with variant demos and interactive controls. Storybook also serves as the style guide for onboarding.

### 1.2 Component Scope

- **Q**: How many common components should be built upfront in Phase 1 vs.
  built as needed? Building a full component library takes significant time
  but ensures consistency. Building on-demand is faster but risks
  inconsistency.
- **A:** Build a core set of ~12 components upfront in Phase 1: Button, IconButton, Input, TextArea, Select, Checkbox, Badge, Spinner, Toast, Dialog (Modal), Tooltip, and Dropdown Menu. All others (Tabs, Accordion, Table, Popover, etc.) are built on-demand as features require them. The core set covers 80% of use cases and establishes design patterns for the rest.

- **Q**: Should the component library be extractable as a separate package
  (`@kg/ui`) for potential reuse in generative UI projects, or should it
  remain in the client source?
- **A:** Keep it in `client/ui/src/components/shared/` for now. Extracting to a package adds build pipeline complexity (versioning, publishing, dependency management) with no immediate benefit. Gen UI projects run in isolated iframes with their own styles — they won't share the host component library. If reuse demand emerges later, extraction is a straightforward refactor.

---

## 2. Shared Component Design

### 2.1 Button

- **Q**: What are all the button variants needed? The plan lists primary,
  secondary, ghost, danger, link. Are there others (outline, subtle)?
- **A:** Six variants: `primary` (filled, brand color), `secondary` (outlined, neutral border), `ghost` (no background, hover reveals), `danger` (filled red for destructive actions), `link` (styled as text link, inline), and `outline` (like secondary but with a colored border matching the text). No `subtle` — it's too close to `ghost`. Each variant supports `sm`, `md`, `lg` sizes.

- **Q**: Should buttons support a loading state with built-in spinner, or
  should the parent handle loading display?
- **A:** Built-in loading state. Pass `isLoading={true}` to show a spinner replacing the icon/text, disable the button, and preserve the button's width (prevents layout shift). The spinner uses the button's text color. This avoids every parent reimplementing the same loading pattern and ensures consistent behavior.

### 2.2 Modals & Overlays

- **Q**: Should modals use a centralized modal manager (one modal at a time,
  managed by store) or allow multiple stacked modals?
- **A:** Centralized modal management via application-level state in a UI store (class-based with `@observable activeModal`, `@action` open/close methods, provided via RootStore context). The modal state is application-level (which modal is showing and what data it needs) — but the Modal component itself is purely props-driven: it receives `isOpen`, `onClose`, `title`, and `children` as props. One modal at a time — stacked modals are a UX antipattern. If a flow requires multiple steps, use a multi-step modal (wizard) rather than stacking. A top-level `observer()` container reads from the store and renders the appropriate modal with props.

- **Q**: Should modals trap focus when open? This is an accessibility best
  practice but can be surprising to users.
- **A:** Yes, always trap focus. This is a WCAG requirement for modal dialogs. Radix UI's Dialog primitive handles focus trapping automatically, cycling focus between focusable elements within the modal. Users expect this behavior in professional tools — it prevents interacting with background content that's visually obscured.

- **Q**: What animation should modals use? Fade-in, scale-up, slide-from-bottom?
- **A:** Fade-in + slight scale-up (from 95% to 100% scale over 150ms, ease-out). The overlay backdrop fades in simultaneously. This is subtle, fast, and feels polished without being distracting. Close animation is the reverse (fade-out + scale-down to 95%, 100ms). No slide animations — they imply spatial origin that doesn't exist for modals.

### 2.3 Form Components

- **Q**: Should form validation be handled at the component level (each input
  validates itself) or at the form level (form validates all inputs on submit)?
  Or both (real-time + submit)?
- **A:** Both. Individual inputs validate on blur (immediate feedback for obvious errors like empty required fields, invalid email format). The form validates all inputs on submit as a final gate. Use Zod schemas for validation logic shared between blur-level and submit-level validation. React Hook Form orchestrates both patterns natively.

- **Q**: Should the Select component use a native `<select>` on mobile for
  better UX, or always use the custom dropdown?
- **A:** Always use the custom dropdown (Radix Select). Mobile is not a primary target, and maintaining two rendering paths for one component adds complexity. The custom dropdown provides consistent behavior and styling across all viewports. If mobile becomes a priority later, this can be revisited.

- **Q**: Should form components support controlled mode only, or also
  uncontrolled mode? Controlled is more predictable but requires more
  boilerplate.
- **A:** Support both via `React.forwardRef` and optional `value`/`onChange` props. If `value` is provided, the component is controlled; otherwise, it manages its own state internally. This follows the React convention used by Radix and React Hook Form. Most usage will be controlled (via React Hook Form's `register`), but uncontrolled is useful for simple one-off forms.

---

## 3. Layout & Panel Design

### 3.1 Split Pane

- **Q**: Should the SplitPane component support more than 2 panes? For
  example, a 3-pane layout (sidebar + editor + chat)?
- **A:** Yes, the SplitPane component supports N panes with N-1 drag handles. The main workspace uses a 3- or 4-pane layout (sidebar | editor | graph/chat). Implement as a single `SplitPane` component that accepts an array of pane configurations (`{ minWidth, defaultWidth, collapsible }`) rather than nesting multiple 2-pane splits.

- **Q**: What should the minimum panel width be before it collapses/hides?
  Should this be configurable per usage?
- **A:** Configurable per pane via the `minWidth` prop. Defaults: sidebar 200px, editor 480px, chat 300px, graph panel 300px. When dragged below `minWidth`, the pane collapses to 0px with a re-expand button on the edge. The editor pane cannot be collapsed — it always stays at minimum width.

- **Q**: Should panel sizes persist in localStorage so the layout is restored
  on reload?
- **A:** Yes. Panel sizes are stored in the MobX UILayoutStore (UI store category, `@observable` properties keyed by route so `/docs` layout is separate from `/graph` layout). The store hydrates from localStorage in its constructor and persists via `reaction()` whenever layout values change. On reload, the stored sizes are restored. A "Reset layout" button in the View menu calls an `@action` to restore defaults.

### 3.2 Responsive Behavior

- **Q**: On mobile, should the sidebar become a bottom navigation bar or a
  hamburger menu? Bottom nav is more thumb-friendly; hamburger is more
  traditional.
- **A:** Hamburger menu. The sidebar contains a document tree which is hierarchical and doesn't map to bottom nav tabs. On viewports <1024px, the sidebar collapses to a hamburger icon in the top-left that opens a slide-over drawer with the full document tree. Mobile is not an MVP priority, so keep the implementation simple.

- **Q**: Should the chat panel be accessible via a floating action button
  (FAB) on mobile?
- **A:** Yes. On viewports <1024px, the chat panel is hidden and replaced with a FAB (56px, bottom-right corner, brand-colored) that opens the chat as a full-screen overlay. The FAB shows an unread message badge (red dot with count). Cmd+K still works to focus chat.

- **Q**: Should the graph view be available on mobile, or replaced with a
  simplified list/tree view?
- **A:** The vertical tree layout is the primary (and only) graph view at all viewports. On viewports <1024px, the tree naturally adapts — its DOM-based rows stack vertically with horizontal scrolling for wide depth levels. The tree view is inherently more touch-friendly than a canvas-based approach. On very small viewports (<768px), collapse to a simplified list showing specs grouped by document with connection counts and edge type icons. Tapping a spec opens its detail view.

---

## 4. Document & Spec Components

### 4.1 Spec Boundaries

- **Q**: How should spec boundaries be visually indicated within the document
  editor? Options:
  - Colored left border per spec (like Notion block types)
  - Horizontal divider with spec header bar
  - Collapsible sections with spec title headers
  - Subtle background color bands alternating between specs
    Which approach best communicates "these are separate specs" without being
    heavy-handed?
- **A:** Colored left border (3px, using a muted color per spec type or a consistent neutral-300) combined with a spec header bar showing the title. This creates a clear visual boundary without heavy card containers. The left border runs the full height of the spec content. A subtle 1px horizontal divider separates specs, doubling as the drag handle for reordering.

- **Q**: Should spec boundaries be editable (user can merge/split specs by
  dragging the boundary)?
- **A:** Splitting yes; merging no via drag. Users can split a spec by placing the cursor and using a "Split spec here" command (context menu or `/split` command). Merging is done by selecting two adjacent specs and choosing "Merge specs" from the context menu. Boundary dragging is too imprecise and risks accidental structural changes.

- **Q**: Should the spec metadata (author, date, tags) be visible by default,
  or only on hover/expand?
- **A:** Only on hover/expand. The spec header shows just the title and status badge by default. Hovering the header reveals a metadata row (author avatar, last edited date, tag pills). Clicking the header's "..." menu opens a full metadata popover with all fields. This keeps the editor clean while making metadata accessible.

### 4.2 Document Editor

- **Q**: Should the document editor show all specs expanded by default, or
  should long specs be collapsed to show only title + first few lines?
- **A:** All specs expanded by default. Collapsing hides content and makes the document harder to scan. For long documents (>15 specs), an outline panel on the left (within the editor area) lists all spec titles for quick jump navigation. Individual specs can be manually collapsed via a toggle on their header, but default is expanded.

- **Q**: Should there be a minimap/outline view showing all spec titles in
  the current document for quick navigation?
- **A:** Yes, an outline view (not a minimap). Show a collapsible outline panel within the editor's left margin listing all spec titles with their status indicators. Clicking a title smooth-scrolls to that spec. The outline highlights the currently visible spec. This is essential for documents with more than 5-6 specs.

- **Q**: Should the document editor support full-screen "focus mode" that
  hides all chrome (sidebar, chat, header)?
- **A:** Yes. Focus mode (`Cmd+Shift+F`) hides the sidebar, chat panel, and app header. The editor occupies the full viewport with a centered content column (max-width 800px). A minimal floating toolbar appears at the top on hover with document title and an "Exit focus mode" button. The chat minimized tab remains visible for Cmd+K access.

### 4.3 Drag and Drop

- **Q**: Should specs be reorderable via drag-and-drop within the document?
  If so, should they be draggable between documents as well?
- **A:** Yes, specs are reorderable via drag-and-drop within a document. Cross-document drag is not supported — use a "Move to document" menu action instead. Cross-document drag requires complex state management across different editor instances and is error-prone. The move action provides the same functionality with more precision.

- **Q**: What library should be used for drag-and-drop? dnd-kit (modern,
  accessible), react-beautiful-dnd (Atlassian, mature), or native HTML DnD?
- **A:** Use `dnd-kit`. It's actively maintained, has excellent accessibility (keyboard reordering with announcements), small bundle size, and works well with React's rendering model. `react-beautiful-dnd` is in maintenance mode (Atlassian moved to Pragmatic drag and drop). Native HTML DnD lacks the accessibility features and smooth animations needed.

---

## 5. Chat Components

### 5.1 Message Types

- **Q**: What is the full list of message types the chat must support?
  The plan lists: text, interactive, graph-linked, code block, gen-UI embed,
  spec proposal. Are there others (image, file, table, chart)?
- **A:** Full message type list: `text` (plain/markdown), `interactive` (buttons/forms), `graph-link` (clickable spec references), `code-block` (syntax-highlighted), `gen-ui-embed` (iframe reference), `spec-proposal` (diff preview with accept/reject), `image` (attached/generated images), `file` (downloadable attachment), `status` (system messages like "Agent completed task"), and `inquiry` (agent-flagged issue requiring user input). No tables or charts as standalone types — they appear within text messages as markdown.

- **Q**: Should messages support threading/replies, or is it always a flat
  chronological list?
- **A:** Flat chronological list. Threading adds significant UI complexity and the chat is a human-agent dialog, not a team conversation. The agent's context model handles conversational continuity without explicit threads. Users can reference previous messages by quoting (select text + reply), but the messages appear in the flat list.

- **Q**: Should messages be editable after sending? Should they be deletable?
- **A:** Not editable after sending — chat history is a reference log per the PRD. Messages are deletable by the sender (soft delete: replaced with "Message deleted" placeholder) to clean up mistakes. Agent messages are never deletable by users. Deletion does not affect the agent's conversation context.

### 5.2 Interactive Messages

- **Q**: When the agent proposes a spec change and the user accepts, should
  the message update in-place to show "Accepted" status, or should a new
  message appear confirming the action?
- **A:** Both. The original interactive message updates in-place: buttons are replaced with a status badge ("Accepted" in green or "Rejected" in gray) with a timestamp. A new system message also appears in the chat confirming the action with a link to the affected spec. This provides clear status on the proposal and chronological confirmation.

- **Q**: Should interactive message buttons have expiration? (e.g., "Accept"
  button becomes disabled after a new agent message supersedes it)
- **A:** Yes. Interactive buttons expire when a newer agent message supersedes the proposal (e.g., agent proposes a revised version). Expired buttons show as disabled with a "Superseded" label. Time-based expiration is not needed — only logical supersession. Users can still view the expired proposal's diff for reference.

- **Q**: How should forms within interactive messages handle validation? Client-
  side validation before sending to agent, or send everything and let the agent
  respond with errors?
- **A:** Client-side validation first for basic constraints (required fields, format checks) defined in the form schema the agent provides. Invalid submissions are blocked with inline error messages. The agent still validates server-side for semantic correctness and can respond with errors for issues the client can't check. This provides instant feedback for obvious mistakes.

### 5.3 Chat Panel

- **Q**: Should the chat panel support multiple simultaneous conversations
  (tabs), or only one active conversation at a time?
- **A:** One active conversation at a time. Multiple tabs fragment the agent's context and confuse the interaction model. Past sessions are accessible via a "History" button that opens a session list. Starting a "New conversation" archives the current session and begins fresh. The active session persists across page navigation.

- **Q**: Should there be a way to "pin" important messages in the chat
  for quick reference?
- **A:** Yes. Users can pin messages via a pin icon on hover. Pinned messages appear in a collapsible "Pinned" section at the top of the chat panel. Maximum 10 pinned messages per session. Pins are stored per-session and persist with the session history. This is useful for keeping agent proposals or key decisions visible.

- **Q**: Should the chat support markdown formatting in user messages?
- **A:** Yes. User messages support a subset of markdown: bold, italic, inline code, code blocks, and links. No need for a rich text toolbar — users type markdown syntax directly. The input renders a live preview (markdown is rendered in the sent message). This serves technical users who naturally write in markdown.

---

## 6. Graph Components

### 6.1 Node Rendering

- **Q**: What shape should graph nodes be? Circles, rounded rectangles, custom
  shapes based on type? Should they contain text (spec title) or be
  icon-only with labels below?
- **A:** Rounded rectangles (8px radius) containing the spec title text. Rectangles accommodate varying title lengths better than circles. Node width adapts to title length (min 80px, max 200px, with ellipsis truncation). A small colored dot (6px) in the top-right corner indicates status. No icons — text labels inside the node are more readable.

- **Q**: What is the maximum character count for node labels before truncation?
- **A:** 40 characters. Titles longer than 40 chars are truncated with ellipsis inside the node. The full title appears in a tooltip on hover. This keeps nodes compact while showing enough of the title to be identifiable.

- **Q**: Should nodes show a preview of spec content on hover (tooltip), or
  require clicking to see details in the sidebar?
- **A:** Hover shows a tooltip with: full title, first 100 characters of content, tag pills, and edge count summary. Click selects the node and shows full details in a sidebar panel (or navigates to the editor, depending on user preference set in settings). Hover preview provides quick scanning without committing to navigation.

### 6.2 Edge Rendering

- **Q**: Should edges show labels by default, or only on hover? Labels can
  clutter the graph with many edges.
- **A:** Labels hidden by default, shown on hover over the edge. When a node is selected, all its edges show labels. A toggle in the graph toolbar ("Show edge labels") reveals all labels for users who want the full picture. This keeps the default view clean while making labels accessible.

- **Q**: Should animated edges be used (e.g., flowing dots to indicate
  direction), or is static styling sufficient?
- **A:** Static styling with arrowheads for direction. Animated edges are visually distracting in a productivity tool and add rendering cost. The arrow size and position clearly indicate direction. Reserve animation for transient states only (e.g., briefly animate a newly created edge to draw attention).

- **Q**: For the "contradicts" edge type, should there be a special visual
  treatment (red line, warning icon) to make conflicts immediately visible?
- **A:** Yes. `contradicts` edges use a red-orange dashed line (2px) with a small warning triangle icon at the midpoint. This is the only edge type with special treatment — all others use solid lines with type-specific colors. Contradictions are problems that need resolution, so they should visually stand out from the normal graph topology.

### 6.3 Graph Interaction

- **Q**: Should the graph support multi-selection (click + drag to select
  area, Ctrl+click for individual)? If so, what actions apply to multi-
  selection (delete, move, group)?
- **A:** Yes. Ctrl+Click for individual multi-select, Click+Drag on empty canvas for rectangle selection. Multi-selection actions: batch delete, batch move (drag the group), and "Create edge between" (for exactly 2 selected nodes). No grouping operation in MVP. Selection is indicated by a blue highlight border on selected nodes.

- **Q**: Should double-click on a node open the spec editor, or navigate
  to the graph subview centered on that node?
- **A:** Double-click opens the spec in the editor (navigates to `/docs/:docId/specs/:specId`). Single-click selects the node and shows details in the sidebar. This follows the convention of "click to select, double-click to open." If the graph is in a split pane with the editor, double-click scrolls the editor to that spec instead of navigating.

- **Q**: Should there be a "graph history" to undo/redo graph navigation
  (like browser back/forward)?
- **A:** Yes. Maintain a navigation stack of graph viewport states (center position, zoom level, selected node). Back/Forward buttons in the graph toolbar (and `Alt+Left/Right` keyboard shortcuts) traverse this stack. The stack stores the last 20 viewport states. This is essential for exploratory graph navigation where users drill into neighborhoods and want to return.

---

## 7. Version Control Components

### 7.1 Diff View

- **Q**: The PRD specifies "light colored indications" for diffs. What
  exactly does this mean? Possible interpretations:
  - Very subtle background tint (almost white-on-white)
  - Colored underlines/strikethroughs instead of background
  - Margin indicators (colored dots/bars on the side)
    Can mockups or more specific guidance be provided?
- **A:** Combination: a 3px colored margin bar on the left side (green for additions, red for removals, blue for modifications) plus a very subtle background tint (green-50/red-50 at ~5% opacity). The text itself is NOT colored — it remains the standard text color. Removed text uses a light strikethrough. This keeps the content readable (looks "exactly how it was") while subtly indicating changes.

- **Q**: Should the diff view support side-by-side mode (before | after), or
  only unified inline mode? The PRD suggests the display "should otherwise
  look EXACTLY how it was."
- **A:** Both modes available, with unified inline as the default. Side-by-side is toggled via a button in the diff toolbar. In side-by-side mode, the left pane shows the "before" version and the right shows "after," each rendered cleanly as the spec looked at that point, with only the subtle margin bars and tints indicating what changed. This fulfills the PRD's "look exactly how it was" requirement.

- **Q**: Should the diff view support word-level highlighting (changes within
  a line) or only line-level?
- **A:** Word-level highlighting. When a line is modified (not added/removed entirely), individual changed words within the line get a slightly stronger background tint (10% opacity vs. 5% for the line). This helps users spot precise changes within long paragraphs without scanning the entire line. Use a word-diff algorithm (e.g., `diff-match-patch`) for accurate results.

### 7.2 Branch UI

- **Q**: How prominently should branch information be displayed? A persistent
  indicator in the header, or only visible when accessing version control
  features?
- **A:** Persistent indicator in the app header — a small branch icon + branch name chip next to the project name. Clicking the chip opens a branch switcher dropdown. The indicator is always visible because the current branch affects all content the user sees. It uses a subtle style (muted text, no background) so it doesn't dominate the header.

- **Q**: Should branch creation/switching be accessible from a global dropdown,
  or only from the version control page?
- **A:** Accessible from both. The header branch chip opens a dropdown for quick switching between existing branches and creating new ones. The version control page provides the full branch management UI (list, delete, compare, merge). The header dropdown is the primary interaction point for day-to-day branch switching.

- **Q**: Should the UI show a visual branch graph (like `gitk` or GitHub's
  network graph)?
- **A:** Yes, but simplified. Show a vertical branch graph on the version control page with branch lines, merge points, and commit dots. It uses the project's color palette to distinguish branches. Keep it simple — no commit messages on the graph itself (those appear in the adjacent timeline list on click). This provides spatial understanding of branch relationships.

---

## 8. Generative UI Components

### 8.1 Iframe Display

- **Q**: What default size should the gen UI iframe be? Full panel width with
  a set height, or responsive to content?
- **A:** Full panel width with a default height of 400px. The iframe is resizable vertically via a drag handle at the bottom (min 200px, max 800px). Content-responsive sizing is not possible securely across iframe boundaries without `allow-same-origin`. A "Fullscreen" button expands the gen UI to a modal overlay for complex UIs.

- **Q**: Should gen UIs be displayable in multiple contexts (chat message,
  dedicated panel, modal, full-page)?
- **A:** Three contexts: embedded in a chat message (compact, 300px height), in a dedicated gen UI panel/page (full width, 400px default height), and as a fullscreen modal (for complex interactions). All three use the same iframe component with different size presets. No full-page route for gen UIs — the modal fullscreen is sufficient.

- **Q**: How should gen UI errors (JavaScript errors inside the iframe) be
  communicated to the user?
- **A:** The gen UI bridge protocol includes an `error` message type. If the gen UI sends an error (or fails to send a `ready` message within 5 seconds), the host replaces the iframe with an error state showing "This component encountered an error" with a "Reload" button and a "Report to agent" button that sends the error details to the agent for diagnosis.

### 8.2 Gen UI Browser

- **Q**: Should there be a dedicated page for browsing gen UIs, or should they
  only be accessible via the chat and spec editor?
- **A:** Yes, a dedicated gen UI gallery page at `/gen-ui`. It shows all gen UIs in a grid layout with thumbnails, titles, linked spec names, and creation dates. Users can filter by linked document/spec and search by title. This provides discoverability beyond the chat timeline where gen UIs are easily lost.

- **Q**: Should gen UI thumbnails be auto-generated (screenshot), manually
  uploaded, or generated from the first frame of the UI?
- **A:** Auto-generated via server-side screenshot on build completion. The build pipeline renders the gen UI in a headless browser, captures a 400x300 screenshot, and stores it as the thumbnail. This requires no manual effort and always represents the current state of the gen UI.

---

## 9. Accessibility in Components

- **Q**: Should every common component have a documented accessibility
  specification (ARIA roles, keyboard behavior, screen reader text)?
- **A:** Yes. Each shared component's Storybook story includes an "Accessibility" section documenting: ARIA roles and attributes, keyboard interaction pattern, and screen reader behavior. Radix UI primitives handle most ARIA concerns automatically, but the documentation ensures wrapper components don't break accessibility. This also serves as a reference for feature developers.

- **Q**: Should components fail lint/build if required accessibility props
  (like `aria-label` on IconButton) are missing?
- **A:** Yes. Use `eslint-plugin-jsx-a11y` with strict rules. `IconButton` and `Icon` components require an `aria-label` prop (enforced via TypeScript — the prop is required in the type definition). The ESLint rule `jsx-a11y/aria-props` and `jsx-a11y/role-has-required-aria-props` run in CI and fail the build on violations.

- **Q**: Should there be automated accessibility tests for each component?
  (e.g., axe-core integration in component tests)
- **A:** Yes. Every shared component's test file includes a `jest-axe` accessibility check that renders all variants and asserts no violations. This runs as part of the standard `vitest` test suite. Storybook also integrates the `@storybook/addon-a11y` addon for real-time accessibility feedback during development.

---

## 10. Component Documentation

- **Q**: Should the project use Storybook for component development and
  documentation? Storybook adds dev time but greatly helps consistency and
  onboarding.
- **A:** Yes, use Storybook. The benefits outweigh the dev time cost: isolated component development, living documentation, visual regression baseline, and accessibility testing. Configure Storybook with Vite builder for fast startup. Only shared components require stories — feature-specific components do not.

- **Q**: If not Storybook, should there be a component gallery page within
  the app (dev-only route)?
- **A:** N/A — Storybook is the chosen approach. No in-app gallery needed. Storybook runs as a separate dev server (`bun run storybook`) and can be deployed as a static site for team reference.

- **Q**: Should components have prop documentation (JSDoc comments on props
  interfaces), or rely on TypeScript types as documentation?
- **A:** TypeScript types are the primary documentation. Add JSDoc comments only for non-obvious props (e.g., explaining what `variant="ghost"` looks like, or documenting side effects of `onOpenChange`). Don't add JSDoc for self-explanatory props like `disabled`, `className`, or `children`. Storybook's auto-generated prop tables from TypeScript types provide the searchable reference.

---

## Decision Log

> Record decisions as questions are resolved.

| Date | Question | Decision | Rationale |
| ---- | -------- | -------- | --------- |
| —    | —        | —        | —         |
