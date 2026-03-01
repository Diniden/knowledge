# 02-FRONTEND / 01 — ARCHITECTURE: Open Questions

> **Purpose**: Unresolved questions about the frontend application architecture
> including state management, routing, module organization, performance
> strategies, and integration patterns. Answers may change tasks in the plan.

---

## 1. State Management

### 1.1 Library Choice

- **Q**: Should the project use MobX (class-based stores, explicit reactivity)
  or React Context + useReducer (no dependency, built-in)? MobX is recommended
  in the plan — is there a reason to prefer Context instead?
- **A:** Use MobX with class-based stores using `makeObservable` and explicit decorator annotations (`@observable`, `@action`, `@computed`, `@action.bound`). Enable strict mode via `configure({ enforceActions: 'always' })` to enforce Flux-style unidirectional data flow. MobX provides fine-grained reactivity (only re-renders components that read changed observables), clear separation of concerns via class-based stores, and works excellently with TypeScript. Context + useReducer causes unnecessary re-renders in deeply nested trees and is harder to use outside React components. Stores are organized into three categories: **Domain stores** (backend data, API actions), **Session stores** (auth, user profile, browser), and **UI stores** (`@computed` domain transformations for deriving UI-ready data, plus application-level state like theme and layout preferences). All stores are provided via a RootStore pattern + React Context. Primitive and compositional UI components are strictly props-driven — top-level `observer()` containers read from stores and pass data down as props. Simple UI state (open/closed, hover, form values) stays as local component state, never in a store.

- **Q**: Should TanStack Query (React Query) be used alongside MobX for
  server-state management? It adds caching, deduplication, and background
  refetching but introduces another library and mental model.
- **A:** Yes, use TanStack Query for all server-state fetching (specs, graph data, user lists, version history). TanStack Query results flow into MobX domain stores via `@action` methods, which then serve as the reactive source for components. MobX handles client-only state (UI preferences, panel sizes, selected items) and computed derivations. TanStack Query's deduplication, background refetching, and stale-while-revalidate patterns are essential for a real-time collaborative tool. The mental model split is clean: MobX domain stores = reactive data layer (hydrated by TanStack Query), MobX UI stores = client-only state, TanStack Query = server fetching and cache management.

- **Q**: Since MobX doesn't have built-in `persist` middleware, how should
  UI preferences be persisted to localStorage? What about server-state data?
- **A:** UI stores hydrate from localStorage in their constructor and persist via MobX `reaction()` — whenever an observed value changes, the reaction writes it to localStorage. Only persist UI preference stores (panel sizes, theme, collapsed states, last-visited document). Never persist spec or graph data — TanStack Query handles server-state caching with proper invalidation. Persisting server data to localStorage risks stale reads and sync conflicts on reload.

### 1.2 Cache Strategy

- **Q**: What should the cache TTL be for different data types? Specs (edited
  frequently), graph data (changes on agent operations), user list (changes
  rarely)?
- **A:** Specs: `staleTime: 30s`, refetch on window focus and WebSocket push. Graph data: `staleTime: 60s`, invalidated on WebSocket events for edge/node changes. User list: `staleTime: 5min`, refetch on explicit navigation to user-related views. All TTLs are TanStack Query `staleTime` values; `gcTime` (garbage collection) set to 10min across the board.

- **Q**: Should the client maintain a full local copy of the knowledge graph,
  or only fetch subgraphs on demand? A full local copy enables offline-like
  speed but could be large.
- **A:** Fetch the full graph structure (node IDs, titles, edge types) on project load — this is lightweight metadata. Fetch full spec content on demand when a node is selected or a document is opened. This gives instant graph navigation while keeping memory reasonable. For projects exceeding 5,000 nodes, switch to subgraph fetching with a 2-hop neighborhood around the viewport.

- **Q**: How should the client handle stale cache when a WebSocket notification
  arrives? Immediately refetch, or mark as stale and refetch on next access?
- **A:** Immediately refetch for data currently visible on screen (active spec in editor, visible graph nodes). Mark as stale for off-screen data and refetch on next access. This keeps the active view fresh without flooding the network with requests for data the user isn't looking at.

### 1.3 Optimistic Updates

- **Q**: Which operations should use optimistic updates? Spec editing (likely
  yes), edge creation (maybe), branch switching (probably not)?
- **A:** Optimistic updates for: spec content editing (must feel instant), spec metadata changes (title, tags), edge creation/deletion (immediate graph feedback). No optimistic updates for: branch switching (complex state swap), merge operations (needs server validation), revert operations (destructive, needs confirmation). Edge type changes are optimistic since they're low-risk.

- **Q**: How should optimistic update conflicts be handled? If the server
  rejects an optimistic update, should the UI snap back immediately or show a
  conflict resolution dialog?
- **A:** Snap back immediately with a toast notification explaining the rejection (e.g., "Edge creation failed: target spec was deleted"). For spec content conflicts (rare with auto-save), show a brief inline banner at the top of the editor with a "View conflict" link that opens the diff view. No modal dialogs for optimistic rollbacks — they break flow.

---

## 2. Routing

### 2.1 Router Library

- **Q**: Should the project use React Router v6 (widely adopted, mature) or
  TanStack Router (type-safe routes, newer)? TanStack Router has better
  TypeScript support but a smaller ecosystem.
- **A:** Use React Router v6. It's mature, widely understood, and pairs well with the existing TanStack Query choice (they integrate via loaders). TanStack Router's type-safe routes are appealing but the smaller ecosystem and faster release cadence introduce adoption risk. React Router v6's data APIs (loaders, actions) cover the project's needs.

- **Q**: Should file-based routing be considered (via Vite plugin), or is
  manual route definition preferred for explicit control?
- **A:** Use manual route definition. The app has a relatively small number of routes with complex nested layouts (panels, split views), and explicit route configuration makes the layout hierarchy clear. File-based routing adds magic that obscures the panel composition logic.

### 2.2 Route Design

- **Q**: Should the graph visualization be a full-page route (`/graph`) or
  always visible as a panel within the document editor? The PRD implies the
  graph is a complementary view.
- **A:** The graph should be a toggleable panel that can appear alongside the editor in a split view, AND available as a full-page route (`/graph`) for deep exploration. Default layout: editor takes primary space, graph panel is collapsible on the right or bottom. The full-page route provides an immersive mode for graph-heavy work. Both share the same graph component.

- **Q**: Should the URL encode full view state (selected spec, graph viewport,
  chat panel open/closed), or only the primary resource? Deep linking is
  valuable but complex URLs can be confusing.
- **A:** URL encodes only the primary resource: `/docs/:docId/specs/:specId`, `/graph?focus=:specId`, `/versions/:specId`. Panel states (chat open/closed, graph panel visible, panel sizes) are stored in MobX UILayoutStore with localStorage persistence via `reaction()` — they're user preferences, not shareable state. This keeps URLs clean and shareable while maintaining layout consistency per user.

- **Q**: Should there be a dedicated route for each feature (documents, graph,
  versions, settings), or should the main view be a configurable workspace
  with panels that can be shown/hidden?
- **A:** Use a hybrid approach. Top-level routes for major features: `/docs`, `/graph`, `/versions`, `/settings`. Within `/docs/:docId`, the workspace supports configurable panels (editor, graph sidebar, chat). This gives clear navigation landmarks while allowing flexible panel composition within the primary editing workspace.

### 2.3 Navigation UX

- **Q**: Should the app use breadcrumbs, a tab bar, or both for navigation
  context? Given the hierarchical nature (project → document → spec), what
  works best?
- **A:** Use a left sidebar with a document tree (collapsible) for project-level navigation, plus breadcrumbs in the editor header for context (`Project / Document Name / Spec Title`). No tab bar — tabs encourage too many open contexts. The sidebar tree is the primary nav; breadcrumbs show current location and allow quick jumps up the hierarchy.

- **Q**: Should route transitions be animated? If so, what type — fade, slide,
  crossfade? Or should transitions be instant for perceived speed?
- **A:** Instant transitions for all route changes. This is a professional productivity tool — animation on route changes feels slow. Panel open/close transitions use a quick 150ms ease-out for spatial continuity, but page-level navigation should be immediate.

---

## 3. Layout & Panels

### 3.1 Panel Architecture

- **Q**: Should panels (sidebar, chat, graph) be implemented as resizable
  split panes (drag to resize), or fixed-width with collapse/expand? Resizable
  panes are more flexible but more complex.
- **A:** Resizable split panes with drag handles. Users need control over how much space the editor vs. graph vs. chat gets. Use a lightweight split pane implementation (CSS `resize` or a small library like `allotment`). Each pane has a minimum width; dragging below minimum collapses the pane entirely.

- **Q**: What should the minimum and maximum widths be for the chat panel?
  What about the sidebar?
- **A:** Chat panel: min 300px, max 600px, default 380px. Sidebar (document tree): min 200px, max 400px, default 260px. Editor: min 480px (never squeezed below readable width). Graph panel (when in split view): min 300px, no max. These values ensure readability at all configurations.

- **Q**: Should panel layout configurations be persisted per user (localStorage)
  or reset on each session?
- **A:** Persisted per user via MobX UILayoutStore with `reaction()` writing to localStorage. Panel widths, collapsed states, and which panels are visible are `@observable` properties that survive page reloads (the store hydrates from localStorage in its constructor). This avoids the frustrating experience of re-arranging your workspace every session.

### 3.2 Chat Panel Placement

- **Q**: The PRD says the chat dialog is "always visible" and "docked." Should
  it always take up screen real estate, or can the user minimize it to a small
  icon/tab that expands on click?
- **A:** The chat can be minimized to a slim vertical tab (40px wide) on the right edge showing an icon and unread badge. This satisfies "always visible" (it's always accessible and present) without permanently consuming 380px. Cmd+K focuses and expands the chat. The tab pulsates subtly when the agent sends a new message.

- **Q**: Should the chat panel be docked on the right side, or should the user
  be able to move it (right, bottom, floating)?
- **A:** Right side only. Allowing repositioning adds significant layout complexity with minimal benefit. The right side is conventional for chat/assistant panels (VS Code, Slack, etc.) and works well with the left sidebar + center editor layout.

- **Q**: On mobile, should the chat be a bottom sheet, a full-screen overlay,
  or a floating action button that expands?
- **A:** Floating action button (FAB) in the bottom-right corner that expands to a full-screen overlay. Mobile is not the primary use case, so a simple full-screen takeover for chat is appropriate. The FAB shows an unread badge when the agent sends messages.

### 3.3 Multi-Panel Views

- **Q**: Should the app support split views (e.g., editor + graph side by
  side)? If so, how many panels can be visible simultaneously?
- **A:** Yes, support split views. Maximum 3 visible panels simultaneously: sidebar + editor + one of (chat OR graph panel). On wide screens (≥1920px), all 4 can be visible: sidebar + editor + graph + chat. The layout is a single horizontal strip; no grid layouts or vertical splits to keep complexity manageable.

- **Q**: Should there be a "focus mode" that hides everything except the active
  feature (e.g., just the editor, or just the graph)?
- **A:** Yes. A focus mode toggled via `Cmd+Shift+F` hides the sidebar, chat, and graph panel, giving the editor (or graph, depending on active route) the full viewport. The chat minimized tab remains visible for Cmd+K access. Escape exits focus mode.

---

## 4. API & Data Fetching

### 4.1 Data Fetching Strategy

- **Q**: Should the app use a "fetch on render" pattern (useEffect), "fetch
  then render" (route loaders), or "render as you fetch" (Suspense +
  concurrent)? React Router v6 supports route loaders natively.
- **A:** Use route loaders for primary data (document content, spec list for a document) to start fetching before render. Use TanStack Query's `useQuery` with Suspense boundaries for secondary data (graph neighbors, version history, user list). This gives fast initial loads via loaders while keeping component-level data fetching simple with TanStack Query.

- **Q**: Should paginated endpoints use cursor-based or offset-based
  pagination? Cursor-based is better for real-time data but more complex.
- **A:** Cursor-based pagination for version history and chat messages (ordered by time, frequently appended). Offset-based for document lists and search results (stable ordering, user expects page numbers). TanStack Query's `useInfiniteQuery` supports both patterns cleanly.

- **Q**: Should the API client library be `fetch` (native, lighter) or `axios`
  (more features, interceptors)? The plan recommends `fetch` — any objections?
- **A:** Use native `fetch` wrapped in a thin custom client (`client/ui/src/api/client.ts`) that handles base URL, auth cookie inclusion, JSON parsing, and error normalization. No need for axios — interceptors can be replicated with a simple wrapper, and fetch is lighter with no dependency.

### 4.2 Real-Time Data

- **Q**: For data that changes in real-time (agent messages, spec updates),
  should the client rely entirely on WebSocket pushes, or also poll at
  intervals as a fallback?
- **A:** Primary: WebSocket pushes for all real-time data. Fallback: poll every 30 seconds if the WebSocket connection drops, with exponential backoff on reconnection attempts. A connection status indicator in the header shows green (connected), yellow (reconnecting), or red (disconnected with polling fallback).

- **Q**: Should the WebSocket connection carry all real-time data, or should
  some data use Server-Sent Events (SSE) for simpler one-way streaming (e.g.,
  agent thinking stream)?
- **A:** Use a single WebSocket connection for everything. SSE would require a second connection and add infrastructure complexity. The WebSocket protocol handles both bidirectional messages (chat) and unidirectional streams (agent thinking) via typed message frames. Agent token streaming is sent as incremental WebSocket messages with a `stream_id` for reassembly.

### 4.3 Offline Behavior

- **Q**: Should the app work offline at all? If the server is unreachable,
  should the user be able to read cached specs, or should a "connection
  required" message be shown?
- **A:** Allow read-only access to TanStack Query's cached data when offline. The user can browse previously loaded specs and graph views but cannot edit, chat, or perform any write operations. A persistent top banner reads "You're offline — viewing cached data. Changes require a connection." No service worker or offline-first architecture.

- **Q**: Should spec edits made while offline be queued and synced when
  connection is restored?
- **A:** No. Offline editing is not supported. If the connection drops mid-edit, the editor shows a warning banner and disables auto-save. Unsaved changes remain in the editor's local state (TipTap holds content in memory) and are saved when connection restores. No offline queue — it introduces complex conflict resolution that isn't justified for a desktop-first professional tool.

---

## 5. Performance

### 5.1 Performance Budgets

- **Q**: What are the target performance budgets? Suggested:
  - Initial load: < 3 seconds on fast 3G
  - Time to Interactive: < 5 seconds
  - First Contentful Paint: < 1.5 seconds
  - JavaScript bundle size: < 500KB gzipped initial load
  - Largest Contentful Paint: < 2.5 seconds
    Are these appropriate, or should they be adjusted?
- **A:** Adjust for a desktop-first professional tool on good connections. Initial load: < 2s on broadband. TTI: < 3s. FCP: < 1s. JS bundle (initial route): < 300KB gzipped (heavy libraries like TipTap are lazy-loaded; the graph tree view uses lightweight @tanstack/virtual). LCP: < 2s. These are tighter but achievable with code splitting. Fast 3G targets are deprioritized since this is a desktop tool.

- **Q**: Should performance budgets be enforced in CI (fail build if exceeded)?
- **A:** Yes, enforce in CI using `bundlesize` or Vite's built-in `build.rollupOptions` with `maxAssetSize` warnings. Fail the build if the initial chunk exceeds 300KB gzipped. Log warnings (not failures) for lazy-loaded chunks exceeding 200KB gzipped. This prevents accidental bundle bloat from large dependency additions.

### 5.2 Graph Rendering Performance

- **Q**: What is the expected maximum number of nodes and edges to render
  simultaneously? 100 nodes? 1,000? 10,000? This determines whether canvas
  rendering (WebGL) is needed vs. SVG/DOM.
- **A:** Target 500–1,000 nodes as the typical upper bound for a single project's knowledge graph. The vertical tree layout with `@tanstack/virtual` handles this scale natively — only visible rows are rendered in the DOM, so node count has minimal performance impact. The layout is DOM-based (no Canvas or SVG rendering needed), making it inherently styleable and interactive. WebGL is unnecessary for this approach.

- **Q**: Should the graph use progressive rendering (show important nodes first,
  add details as rendering budget allows)?
- **A:** Yes. On initial load, render nodes without labels first (fast), then add labels and edge decorations in a second animation frame. For graphs over 300 nodes, show only node dots during active pan/zoom and render full detail when interaction stops (debounce 150ms). This keeps interaction smooth.

### 5.3 Editor Performance

- **Q**: For long spec documents with many specs, should the editor virtualize
  specs (only render visible ones), or render all? At what spec count does
  virtualization become necessary?
- **A:** Render all specs for documents with ≤30 specs (TipTap/ProseMirror handles this well). For documents exceeding 30 specs, virtualize by rendering only specs within the viewport ± 2 specs of buffer. Use an intersection observer to load/unload spec editor instances. This threshold balances simplicity with performance.

---

## 6. Error Handling

### 6.1 Error UX

- **Q**: What tone should error messages use? Technical ("404: Resource not
  found"), friendly ("We couldn't find that spec"), or both (friendly with
  technical details expandable)?
- **A:** Friendly with expandable technical details. Primary message is human-readable ("This spec couldn't be loaded"), with a "Show details" toggle revealing the error code and message for debugging. This serves both casual users and developers troubleshooting issues.

- **Q**: Should errors that affect a single feature (e.g., graph failed to
  load) block the entire view, or should other features remain usable?
- **A:** Other features remain usable. Each major panel (editor, graph, chat) has its own React error boundary. If the graph fails, the editor and chat continue working. The failed panel shows an inline error state with a retry button. Only authentication failures or complete API unavailability block the entire view.

- **Q**: Should the app show a global error banner at the top for persistent
  issues (e.g., WebSocket disconnected), or only inline errors?
- **A:** Both. Persistent infrastructure issues (WebSocket disconnected, server unreachable) show a slim global banner at the top of the viewport (yellow for degraded, red for offline). Feature-specific errors (graph load failed, spec save failed) show inline within their panel. The global banner auto-dismisses when the issue resolves.

### 6.2 Error Recovery

- **Q**: Should all error states offer an automatic retry (with countdown), or
  only certain types of errors (network, timeout)?
- **A:** Automatic retry with exponential backoff for network errors and timeouts only (retry after 2s, 4s, 8s, max 3 attempts). Validation errors (400), auth errors (401/403), and not-found errors (404) show immediately with no retry. The retry countdown is visible: "Retrying in 3s... [Retry Now] [Cancel]".

- **Q**: How should the app handle server downtime? Show a maintenance page,
  or allow read-only access to cached data?
- **A:** Allow read-only access to cached data with a global banner: "Server is unreachable — viewing cached data." If no cached data exists (first visit during downtime), show a minimal maintenance page with the connection status and an auto-retry indicator. The app attempts reconnection every 15 seconds.

---

## 7. Authentication & Session

### 7.1 Token Management

- **Q**: Since auth uses http-only cookies, does the frontend need to manage
  tokens at all? Or does the browser handle cookie attachment automatically?
- **A:** The browser handles cookie attachment automatically for same-origin requests. The frontend does not store or manage tokens directly. The API client includes `credentials: 'include'` on all fetch requests. The only auth-related client state is the current user profile (fetched from a `/me` endpoint on app load) stored in a MobX SessionStore (class-based with `@observable` user profile, `@action` for login/logout, provided via RootStore context).

- **Q**: How should the frontend detect session expiry? A 401 response from
  the API, a WebSocket disconnect, or both?
- **A:** Both. A 401 from any API response triggers a redirect to the login page. The WebSocket connection dropping is treated as a signal to verify the session by calling `/api/auth/me` — if that returns 401, redirect to login. This catches both REST and real-time session expiry.

- **Q**: Should there be a session timeout warning ("Your session will expire
  in 5 minutes") before automatic logout?
- **A:** No. The server should use sliding session expiration (activity extends the session). Since the app maintains an active WebSocket and makes regular API calls, active users will never time out. If the session does expire (user left tab open overnight), the next interaction triggers a clean redirect to login with a "Session expired" message.

### 7.2 Multi-Tab Behavior

- **Q**: Should the app support multiple browser tabs? If so, how should state
  be synchronized between tabs (localStorage events, BroadcastChannel)?
- **A:** Yes, support multiple tabs. Use `BroadcastChannel` API to synchronize critical events: logout, branch switch, and theme change. TanStack Query automatically shares cache across tabs via its built-in `broadcastQueryClient` plugin. Panel layout is per-tab (each tab can have its own arrangement). No need to sync editor state between tabs.

- **Q**: If the user logs out in one tab, should all tabs log out immediately?
- **A:** Yes. The logout action broadcasts via `BroadcastChannel`, and all tabs redirect to the login page immediately. This prevents a scenario where one tab continues making authenticated requests after the user intended to end their session.

---

## 8. Accessibility

### 8.1 Standards & Compliance

- **Q**: What WCAG level should the app target? AA (standard) or AAA
  (enhanced)? AA is recommended as the minimum.
- **A:** Target WCAG 2.1 AA compliance. AAA is aspirational but not practical for a complex interactive tool with graph visualization and rich text editing. AA covers the essential requirements: sufficient contrast, keyboard navigation, screen reader support, and focus management.

- **Q**: Are there specific accessibility requirements from the target user
  organization?
- **A:** No specific organizational requirements. Follow WCAG 2.1 AA as the baseline. Additionally, ensure all destructive actions (delete spec, revert, merge) are keyboard-accessible and require confirmation. The graph visualization must have a text-based alternative for screen reader users.

- **Q**: Should automated accessibility testing be part of CI (e.g., axe-core)?
- **A:** Yes. Run `axe-core` via `jest-axe` in component tests for all shared components. Run Playwright with `@axe-core/playwright` for E2E accessibility checks on critical flows (login, spec editing, chat). Fail the build on any critical or serious axe violations. Moderate/minor violations are logged as warnings.

### 8.2 Complex Components

- **Q**: How should the knowledge graph be accessible to screen reader users?
  A text-based alternative view? An accessible data table of nodes and edges?
- **A:** The vertical tree layout is inherently more accessible than a canvas-based graph — it renders as DOM elements with semantic HTML. Each spec card has proper ARIA attributes, and keyboard navigation between rows/cards is native. Additionally, provide an accessible data table listing all specs with their edge connections, sortable by title, type, and connection count. This table is toggled via an "Accessible view" button above the tree. The table rows are interactive — clicking a row selects the spec and shows its details. The tree view container has an `aria-label` summarizing the graph ("Knowledge graph with 47 specs and 82 connections").

- **Q**: How should the drag-and-drop spec reordering be accessible? Keyboard
  alternatives with arrow keys and confirmation?
- **A:** Yes. When a spec is focused, pressing `Space` enters "move mode," then `Arrow Up/Down` repositions the spec. Pressing `Space` again confirms; `Escape` cancels. An ARIA live region announces the current position: "Spec 'Authentication Flow' moved to position 3 of 8." This follows the established pattern from `dnd-kit`'s accessibility features.

- **Q**: Should the app support high-contrast mode beyond the standard
  light/dark themes?
- **A:** Not in MVP. Light and dark themes with WCAG AA contrast ratios are sufficient initially. The app should respect the OS `prefers-contrast: more` media query in a future phase by increasing border weights and reducing transparency. High-contrast mode is a Phase 2+ enhancement.

---

## 9. Responsive Design

### 9.1 Mobile Priority

- **Q**: Is mobile support essential for the MVP, or can it be deferred? The
  app's primary use case (knowledge authoring) seems desktop-focused.
- **A:** Defer mobile support beyond MVP. The app is a professional desktop knowledge authoring tool. MVP targets screens ≥1280px wide. Ensure the layout doesn't break on 1024px (tablets in landscape) but don't invest in mobile-specific layouts or touch interactions for Phase 1.

- **Q**: If mobile is supported, is it a mobile-optimized web app, or should a
  PWA (Progressive Web App) be considered for native-like features?
- **A:** Mobile-optimized web app in a future phase, not a PWA. The app requires constant server connectivity (WebSocket, agent communication), so PWA offline features add no value. A responsive web layout that works on tablet browsers is sufficient when mobile is eventually addressed.

- **Q**: Should tablet support be a priority? Tablets could be useful for
  reviewing specs and navigating the graph.
- **A:** Tablet landscape (≥1024px) should work acceptably in MVP by naturally adapting the desktop layout with narrower panels. No tablet-specific layouts or touch optimizations for MVP. Tablets in portrait mode (768px) are not supported in Phase 1.

### 9.2 Responsive Features

- **Q**: Which features should be available on mobile, and which should be
  desktop-only? Candidates for desktop-only: generative UI, complex graph
  manipulation, split-panel views.
- **A:** Desktop-only (Phase 1): generative UI authoring, split-panel views, graph editing (adding/removing edges), version merge/conflict resolution. Available on tablet: spec reading, chat with agent, graph viewing (read-only pan/zoom), version history browsing. Full editing requires ≥1280px viewport width.

- **Q**: Should the graph visualization be available on mobile (with touch
  gestures), or should a simplified list/tree view be shown instead?
- **A:** The vertical tree layout is the primary (and only) graph view at all viewports. On viewports <1024px, the tree layout naturally adapts — rows stack vertically with horizontal scrolling for wide rows. The DOM-based tree view is inherently touch-friendly compared to canvas-based approaches. On very small viewports, collapse to a searchable list view showing specs grouped by document with connection counts as badges.

---

## 10. Third-Party Dependencies

### 10.1 Library Selection

- **Q**: What is the maximum acceptable number of frontend dependencies? Should
  there be a policy on adding new dependencies (review process, size budget)?
- **A:** No hard cap on dependency count, but enforce a per-dependency size budget: no single dependency >50KB gzipped (exceptions: TipTap — it is core). New dependencies require a brief justification in the PR description covering: why it's needed, alternatives considered, and bundle size impact. Use `bundlephobia` to check before adding.

- **Q**: Should the project prefer smaller, focused libraries over large
  frameworks? For example, date-fns vs. moment, MobX vs. Redux?
- **A:** Yes, always prefer smaller focused libraries. This is already reflected in the stack choices (MobX over Redux, native fetch over axios). Prefer tree-shakeable ESM packages. If only one function from a utility library is needed, consider inlining it rather than adding the dependency.

- **Q**: Should all dependencies use ESM-only packages, or is CommonJS
  acceptable if Vite can handle the conversion?
- **A:** Prefer ESM packages but accept CommonJS if Vite handles the conversion without issues. Vite's `optimizeDeps` pre-bundles CJS dependencies effectively. Don't reject a well-maintained CJS package solely for module format — but if two equivalent packages exist and one is ESM, choose the ESM one.

### 10.2 Specific Libraries

- **Q**: Is there a preference for a specific icon library? Lucide, Heroicons,
  Phosphor, custom SVGs?
- **A:** Use Lucide React. It's tree-shakeable (only imports used icons), has a comprehensive icon set (1,000+), consistent 24px grid design, and is the successor to Feather Icons. It pairs well with the clean, professional aesthetic. Custom SVGs for any project-specific icons not in Lucide.

- **Q**: Should the project use a date library (date-fns, dayjs) or rely on
  native Intl APIs?
- **A:** Use native `Intl.DateTimeFormat` and `Intl.RelativeTimeFormat` for display formatting. Write a small utility module (`client/ui/src/utils/date.ts`) with helper functions for common patterns (relative time, short date). No date library needed — the app doesn't do complex date manipulation, only display formatting of server-provided ISO timestamps.

- **Q**: Should the project use a form library (React Hook Form, Formik) for
  complex forms, or manage form state manually?
- **A:** Use React Hook Form for settings pages and any multi-field forms (branch creation, user preferences, spec metadata editing). It's lightweight (~9KB), integrates well with MobX stores (form submission can call `@action` methods directly), and handles validation with Zod schemas. The chat input and single-field inputs can be managed manually. Skip Formik — it's heavier and less performant.

---

## 11. Testing Strategy

- **Q**: Should component tests use React Testing Library (behavior-focused) or
  Enzyme-style testing (implementation-focused)? RTL is recommended.
- **A:** Use React Testing Library (RTL). It encourages testing user-visible behavior rather than implementation details, producing more resilient tests. Pair with `vitest` as the test runner (aligns with the Vite toolchain). Enzyme is effectively deprecated and doesn't support modern React features well.

- **Q**: Should there be visual regression tests for key UI states (Chromatic,
  Percy, or custom screenshots)?
- **A:** Yes, use Playwright's built-in screenshot comparison for visual regression on critical UI states: diff view, graph visualization, chat panel, editor with spec boundaries. No paid service (Chromatic/Percy) needed initially — Playwright screenshots stored in the repo are sufficient. Run visual tests in CI on PRs that touch component or style files.

- **Q**: Should E2E tests cover the full frontend, or only critical paths
  (login, spec creation, graph navigation)?
- **A:** Critical paths only for MVP: login/logout, create and edit a spec, navigate the graph, chat with agent (send message, receive response), view version history, and perform a revert. Expand E2E coverage as features stabilize. Use Playwright for E2E tests, running against a test server with seeded data.

---

## Decision Log

> Record decisions as questions are resolved.

| Date | Question | Decision | Rationale |
| ---- | -------- | -------- | --------- |
| —    | —        | —        | —         |
