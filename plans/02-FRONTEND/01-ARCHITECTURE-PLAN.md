# 02-FRONTEND / 01 — ARCHITECTURE PLAN

> **Purpose**: Define the complete frontend application architecture including
> component tree structure, routing, state management, module organization, ESM
> dynamic imports, WebSocket integration, API client layer, error boundaries,
> performance optimizations, accessibility, and responsive design.
>
> **Phase**: 1 (Foundation) + ongoing
> **Dependencies**: `01-PROJECT-STRUCTURE/PLAN.md`
> **Estimated tasks**: 180+

---

## Table of Contents

1. [Application Shell & Entry Point](#1-application-shell--entry-point)
2. [Routing Architecture](#2-routing-architecture)
3. [State Management](#3-state-management)
4. [Module Organization](#4-module-organization)
5. [API Client Layer](#5-api-client-layer)
6. [WebSocket Integration](#6-websocket-integration)
7. [ESM Dynamic Import Strategy](#7-esm-dynamic-import-strategy)
8. [Error Boundary Strategy](#8-error-boundary-strategy)
9. [Performance Optimization](#9-performance-optimization)
10. [Accessibility](#10-accessibility)
11. [Responsive Design Strategy](#11-responsive-design-strategy)
12. [Dependency Injection & Service Layer](#12-dependency-injection--service-layer)
13. [Feature Flags & Configuration](#13-feature-flags--configuration)

---

## 1. Application Shell & Entry Point

### 1.1 HTML Entry Point

- [ ] **FE-ARCH-001**: Configure `client/ui/index.html` as the Vite HTML entry
  - Set `<html lang="en">` for accessibility
  - Add viewport meta tag for responsive design
  - Add `<meta charset="UTF-8">`
  - Add theme-color meta tag for mobile browsers
  - Add favicon link
  - Mount point `<div id="root"></div>`
  - Script tag pointing to `src/main.tsx` with `type="module"`
- [ ] **FE-ARCH-002**: Add CSP meta tag in `index.html` restricting inline scripts
  - Allow `'self'` for scripts
  - Allow blob: and data: URIs for generated content
  - Restrict frame-src to same-origin sandbox domains
- [ ] **FE-ARCH-003**: Add preload hints for critical fonts and stylesheets
  - Preload primary font files
  - Preload critical CSS chunks

### 1.2 React Entry Point (`main.tsx`)

- [ ] **FE-ARCH-004**: Create `client/ui/src/main.tsx` bootstrapping the React app
  - Import React 18+ `createRoot`
  - Import global styles (`styles/global.scss`)
  - Mount `<App />` into `#root`
  - Wrap with `<StrictMode>` in development
- [ ] **FE-ARCH-005**: Initialize global services in `main.tsx` before render
  - Initialize API client with base URL from env config
  - Initialize WebSocket connection manager
  - Initialize error reporting/logging service
  - Initialize feature flag provider
  - Call `configure({ enforceActions: 'always' })` from MobX for strict Flux enforcement
- [ ] **FE-ARCH-006**: Add service worker registration (for offline caching if needed)
  - Defer to later phases; add placeholder comment

### 1.3 Root Component (`App.tsx`)

- [ ] **FE-ARCH-007**: Create `client/ui/src/App.tsx` as the root component
  - Wrap entire app in `<ErrorBoundary>` (top-level crash handler)
  - Wrap in `<StoreProvider>` supplying the MobX `RootStore` via React Context
  - Wrap in `<RouterProvider>` for routing
  - Wrap in `<ThemeProvider>` for light/dark mode
  - Wrap in `<ToastProvider>` for notifications
  - Wrap in `<ModalProvider>` for global modal system
  - Wrap in `<WebSocketProvider>` for real-time updates
  - Wrap in `<AuthProvider>` for authentication state
- [ ] **FE-ARCH-008**: Define the provider composition order in `App.tsx`
  - ErrorBoundary → StoreProvider → AuthProvider → ThemeProvider → WebSocketProvider → RouterProvider → ToastProvider → ModalProvider → AppLayout
- [ ] **FE-ARCH-009**: Create `client/ui/src/providers/` directory for all provider components
- [ ] **FE-ARCH-010**: Create `client/ui/src/providers/AppProviders.tsx` composing all providers
  - Single component that nests all providers in correct order
  - Accepts `children` as the app content

### 1.4 Application Layout

- [ ] **FE-ARCH-011**: Create `AppLayout` component as the main visual shell
  - Render global header/navigation bar
  - Render main content area (route outlet)
  - Render always-visible chat dialog panel (docked)
  - Render toast notification container
  - Render modal portal container
- [ ] **FE-ARCH-012**: Define the top-level layout grid structure
  - Header: fixed top bar (navigation, user menu, global controls)
  - Sidebar: collapsible left panel (navigation, project tree)
  - Main: flexible center content (routed views)
  - Chat: docked right panel (always visible, resizable)
- [ ] **FE-ARCH-013**: Implement layout responsiveness
  - Desktop: all panels visible, sidebar collapsible
  - Tablet: sidebar overlay, chat panel collapsible
  - Mobile: full-screen views with bottom navigation, chat as overlay

#### Design Decisions

> **Q**: Should panels (sidebar, chat, graph) be implemented as resizable split panes (drag to resize), or fixed-width with collapse/expand? Resizable panes are more flexible but more complex.
> **A**: Resizable split panes with drag handles. Users need control over how much space the editor vs. graph vs. chat gets. Use a lightweight split pane implementation (CSS `resize` or a small library like `allotment`). Each pane has a minimum width; dragging below minimum collapses the pane entirely.

> **Q**: What should the minimum and maximum widths be for the chat panel? What about the sidebar?
> **A**: Chat panel: min 300px, max 600px, default 380px. Sidebar (document tree): min 200px, max 400px, default 260px. Editor: min 480px (never squeezed below readable width). Graph panel (when in split view): min 300px, no max. These values ensure readability at all configurations.

> **Q**: Should panel layout configurations be persisted per user (localStorage) or reset on each session?
> **A**: Persisted per user via MobX UILayoutStore with `reaction()` writing to localStorage. Panel widths, collapsed states, and which panels are visible are `@observable` properties that survive page reloads (the store hydrates from localStorage in its constructor). This avoids the frustrating experience of re-arranging your workspace every session.

> **Q**: The PRD says the chat dialog is "always visible" and "docked." Should it always take up screen real estate, or can the user minimize it to a small icon/tab that expands on click?
> **A**: The chat can be minimized to a slim vertical tab (40px wide) on the right edge showing an icon and unread badge. This satisfies "always visible" (it's always accessible and present) without permanently consuming 380px. Cmd+K focuses and expands the chat. The tab pulsates subtly when the agent sends a new message.

> **Q**: Should the chat panel be docked on the right side, or should the user be able to move it (right, bottom, floating)?
> **A**: Right side only. Allowing repositioning adds significant layout complexity with minimal benefit. The right side is conventional for chat/assistant panels (VS Code, Slack, etc.) and works well with the left sidebar + center editor layout.

> **Q**: On mobile, should the chat be a bottom sheet, a full-screen overlay, or a floating action button that expands?
> **A**: Floating action button (FAB) in the bottom-right corner that expands to a full-screen overlay. Mobile is not the primary use case, so a simple full-screen takeover for chat is appropriate. The FAB shows an unread badge when the agent sends messages.

> **Q**: Should the app support split views (e.g., editor + graph side by side)? If so, how many panels can be visible simultaneously?
> **A**: Yes, support split views. Maximum 3 visible panels simultaneously: sidebar + editor + one of (chat OR graph panel). On wide screens (≥1920px), all 4 can be visible: sidebar + editor + graph + chat. The layout is a single horizontal strip; no grid layouts or vertical splits to keep complexity manageable.

> **Q**: Should there be a "focus mode" that hides everything except the active feature (e.g., just the editor, or just the graph)?
> **A**: Yes. A focus mode toggled via `Cmd+Shift+F` hides the sidebar, chat, and graph panel, giving the editor (or graph, depending on active route) the full viewport. The chat minimized tab remains visible for Cmd+K access. Escape exits focus mode.

---

## 2. Routing Architecture

### 2.1 Router Setup

- [ ] **FE-ARCH-014**: Install and configure React Router v6+ (or TanStack Router)
  - Use `createBrowserRouter` for data-loading support
  - Configure `RouterProvider` in the app root
- [ ] **FE-ARCH-015**: Create `client/ui/src/routes/` directory for route definitions
- [ ] **FE-ARCH-016**: Create `client/ui/src/routes/index.tsx` defining the route tree
- [ ] **FE-ARCH-017**: Define route structure:
  - `/` — Dashboard / Home (project overview)
  - `/login` — Login page
  - `/register` — Registration page
  - `/documents` — Spec document list
  - `/documents/:documentId` — Spec document editor
  - `/documents/:documentId/specs/:specId` — Focused spec view
  - `/graph` — Knowledge graph full-screen visualization
  - `/graph/:specId` — Graph centered on a specific spec
  - `/versions` — Version control overview
  - `/versions/:specId` — Version history for a spec
  - `/settings` — User settings
  - `/admin` — Admin panel (if applicable)
  - `*` — 404 Not Found

### 2.2 Route Guards & Authentication

- [ ] **FE-ARCH-018**: Create `ProtectedRoute` wrapper component
  - Check authentication state
  - Redirect to `/login` if not authenticated
  - Show loading spinner while checking auth
- [ ] **FE-ARCH-019**: Create `PublicOnlyRoute` wrapper for login/register
  - Redirect to `/` if already authenticated
- [ ] **FE-ARCH-020**: Implement route-level permission checks
  - Check if user has access to the requested resource
  - Show permission denied page for unauthorized access
  - Show summary view for summary-access specs
- [ ] **FE-ARCH-021**: Create `PermissionGate` component for inline permission checks
  - Render children only if user has required permission
  - Render fallback (summary or nothing) otherwise

### 2.3 Code Splitting & Lazy Loading

- [ ] **FE-ARCH-022**: Implement `React.lazy()` for all top-level route components
  - Dashboard, DocumentList, DocumentEditor, GraphView, VersionControl, Settings
- [ ] **FE-ARCH-023**: Create `<Suspense>` boundaries at route level
  - Show route-specific loading skeletons (not generic spinners)
- [ ] **FE-ARCH-024**: Create a `LazyRoute` utility wrapper
  - Combine `React.lazy` + `Suspense` + error boundary per route
  - Accept a loading skeleton component as prop
- [ ] **FE-ARCH-025**: Configure Vite manual chunk splitting for routes
  - Each route becomes its own chunk
  - Shared vendor dependencies in a common chunk
- [ ] **FE-ARCH-026**: Implement route prefetching on hover/focus
  - Prefetch route chunks when user hovers over navigation links
  - Use `IntersectionObserver` for viewport-based prefetch

### 2.4 Navigation

- [ ] **FE-ARCH-027**: Create `useNavigationHistory` hook for breadcrumb tracking
  - Track visited routes for back/forward navigation context
- [ ] **FE-ARCH-028**: Implement deep linking support
  - Routes should encode enough state to restore the view
  - Graph view should encode selected node, zoom level, viewport position
- [ ] **FE-ARCH-029**: Implement route transition animations (optional)
  - Fade or slide transitions between route changes
  - Use `framer-motion` or CSS transitions
- [ ] **FE-ARCH-030**: Implement unsaved changes guard
  - Warn when navigating away from editor with unsaved changes
  - Use `beforeunload` event for browser close/refresh
  - Use route blocker for in-app navigation

#### Design Decisions

> **Q**: Should the project use React Router v6 (widely adopted, mature) or TanStack Router (type-safe routes, newer)? TanStack Router has better TypeScript support but a smaller ecosystem.
> **A**: Use React Router v6. It's mature, widely understood, and pairs well with the existing TanStack Query choice (they integrate via loaders). TanStack Router's type-safe routes are appealing but the smaller ecosystem and faster release cadence introduce adoption risk. React Router v6's data APIs (loaders, actions) cover the project's needs.

> **Q**: Should file-based routing be considered (via Vite plugin), or is manual route definition preferred for explicit control?
> **A**: Use manual route definition. The app has a relatively small number of routes with complex nested layouts (panels, split views), and explicit route configuration makes the layout hierarchy clear. File-based routing adds magic that obscures the panel composition logic.

> **Q**: Should the graph visualization be a full-page route (`/graph`) or always visible as a panel within the document editor? The PRD implies the graph is a complementary view.
> **A**: The graph should be a toggleable panel that can appear alongside the editor in a split view, AND available as a full-page route (`/graph`) for deep exploration. Default layout: editor takes primary space, graph panel is collapsible on the right or bottom. The full-page route provides an immersive mode for graph-heavy work. Both share the same graph component.

> **Q**: Should the URL encode full view state (selected spec, graph viewport, chat panel open/closed), or only the primary resource? Deep linking is valuable but complex URLs can be confusing.
> **A**: URL encodes only the primary resource: `/docs/:docId/specs/:specId`, `/graph?focus=:specId`, `/versions/:specId`. Panel states (chat open/closed, graph panel visible, panel sizes) are stored in MobX UILayoutStore with localStorage persistence via `reaction()` — they're user preferences, not shareable state. This keeps URLs clean and shareable while maintaining layout consistency per user.

> **Q**: Should there be a dedicated route for each feature (documents, graph, versions, settings), or should the main view be a configurable workspace with panels that can be shown/hidden?
> **A**: Use a hybrid approach. Top-level routes for major features: `/docs`, `/graph`, `/versions`, `/settings`. Within `/docs/:docId`, the workspace supports configurable panels (editor, graph sidebar, chat). This gives clear navigation landmarks while allowing flexible panel composition within the primary editing workspace.

> **Q**: Should the app use breadcrumbs, a tab bar, or both for navigation context? Given the hierarchical nature (project → document → spec), what works best?
> **A**: Use a left sidebar with a document tree (collapsible) for project-level navigation, plus breadcrumbs in the editor header for context (`Project / Document Name / Spec Title`). No tab bar — tabs encourage too many open contexts. The sidebar tree is the primary nav; breadcrumbs show current location and allow quick jumps up the hierarchy.

> **Q**: Should route transitions be animated? If so, what type — fade, slide, crossfade? Or should transitions be instant for perceived speed?
> **A**: Instant transitions for all route changes. This is a professional productivity tool — animation on route changes feels slow. Panel open/close transitions use a quick 150ms ease-out for spatial continuity, but page-level navigation should be immediate.

---

## 3. State Management

### 3.1 Store Architecture (MobX with Decorators)

- [ ] **FE-ARCH-031**: Install MobX and `mobx-react-lite` as the primary state management libraries
  - Class-based stores with explicit decorator annotations (`@observable`, `@action`, `@computed`, `@action.bound`)
  - All stores use `makeObservable(this, { ... })` in constructor — **never** `makeAutoObservable`
  - Call `configure({ enforceActions: 'always' })` at app startup for strict Flux-style action enforcement
  - React components made reactive via the `observer()` HOC from `mobx-react-lite`
- [ ] **FE-ARCH-032**: Create `client/ui/src/stores/` directory structure organized by store category
  ```
  stores/
  ├── domain/              # Model data from backend; actions = API calls
  │   ├── SpecStore.ts     # Spec & document state + CRUD API actions
  │   ├── GraphStore.ts    # Knowledge graph state + graph API actions
  │   ├── VersionStore.ts  # Version control state + version API actions
  │   ├── ChatStore.ts     # Chat sessions & messages + agent API actions
  │   └── GenUIStore.ts    # Generative UI state + gen UI API actions
  ├── session/             # Login state, user profile, browser info
  │   ├── AuthStore.ts     # Authentication, token refresh, login/logout
  │   └── UserSessionStore.ts # User profile, browser info, preferences
  ├── ui/                  # Application-level UI state and @computed domain transformations
  │   ├── UILayoutStore.ts # Application layout: sidebar, theme, panel sizes (persisted prefs)
  │   ├── AppNavigationStore.ts # Application-level navigation state, active views, breadcrumbs
  │   └── NotificationStore.ts  # Application-level notification queue (toasts, alerts)
  ├── RootStore.ts         # Holds all store instances; passed via React Context
  └── index.ts             # Barrel export + StoreProvider + useStore hooks
  ```

### 3.2 RootStore & React Integration

- [ ] **FE-ARCH-033**: Implement `RootStore` class holding all store instances
  - Instantiate each domain, session, and UI store, passing `this` (RootStore) so stores can cross-reference
  - Example: `this.specStore = new SpecStore(this)`
  - Export a `createRootStore()` factory for testability
- [ ] **FE-ARCH-034**: Create `StoreProvider` React Context and `useStore()` hook
  - `StoreProvider` accepts a `RootStore` instance and provides it via `React.createContext`
  - `useStore()` returns the full `RootStore`; individual stores accessed as `rootStore.specStore`, etc.
  - Components consuming stores must be wrapped with `observer()` from `mobx-react-lite`

### 3.3 Auth Store (Session)

- [ ] **FE-ARCH-035**: Implement `AuthStore` class in `stores/session/AuthStore.ts`
  - Decorators: `@observable user`, `@observable isAuthenticated`, `@observable isLoading`, `@observable token` (in-memory only)
  - Actions (`@action.bound`): `login()`, `logout()`, `refreshToken()`, `checkAuth()`
  - Constructor calls `makeObservable(this, { ... })` with explicit annotations
  - Constructor can optionally hydrate persisted user info from localStorage (no middleware — manual serialization)
  - Token stored in-memory only (http-only cookie preferred)
- [ ] **FE-ARCH-036**: Implement auto-refresh token logic as a MobX `reaction`
  - Watch token expiration and refresh before expiry
  - Handle refresh failure (redirect to login)
- [ ] **FE-ARCH-037**: Implement `@computed get currentUser()` on `AuthStore`
  - Returns current user or null
  - Automatically memoized by MobX

### 3.4 Specs Store (Domain)

- [ ] **FE-ARCH-038**: Implement `SpecStore` class in `stores/domain/SpecStore.ts`
  - Observables: `@observable documents`, `@observable activeDocumentId`, `@observable activeSpecId`, `@observable specCache`, `@observable isLoading`, `@observable errors`
  - Actions (`@action.bound`): `fetchDocuments()`, `fetchDocument(id)`, `createDocument()`, `updateDocument()`, `deleteDocument()`
  - Actions (`@action.bound`): `createSpec()`, `updateSpec()`, `deleteSpec()`, `moveSpec()`, `reorderSpecs()`
  - Computed: `@computed get activeDocument()`, `@computed get activeSpec()`, `@computed get documentSpecs()`
  - Constructor: `makeObservable(this, { ... })`
- [ ] **FE-ARCH-039**: Implement optimistic updates for spec editing
  - Apply local changes immediately via `@action`
  - Roll back on server error via a separate `@action`
  - Track pending changes for conflict detection
- [ ] **FE-ARCH-040**: Implement spec cache with staleness tracking
  - Cache fetched specs with timestamp
  - Re-fetch when cache is stale (configurable TTL)
  - Invalidate cache on WebSocket update notifications via `@action`

### 3.5 Graph Store (Domain)

- [ ] **FE-ARCH-041**: Implement `GraphStore` class in `stores/domain/GraphStore.ts`
  - Observables: `@observable nodes`, `@observable edges`, `@observable selectedNodeIds`, `@observable selectedEdgeIds`, `@observable viewport`, `@observable filters`, `@observable layout`
  - Actions (`@action.bound`): `fetchGraph()`, `fetchSubgraph(specId, depth)`, `selectNode()`, `selectEdge()`, `updateViewport()`, `applyFilter()`, `setLayout()`
  - Computed: `@computed get visibleNodes()`, `@computed get visibleEdges()`, `@computed get selectedNode()`, `@computed get neighborNodes()`
  - Constructor: `makeObservable(this, { ... })`
- [ ] **FE-ARCH-042**: Implement graph data normalization
  - Store nodes and edges as `Record<string, Node>` and `Record<string, Edge>`
  - Compute adjacency lists from edges for fast traversal via `@computed`
- [ ] **FE-ARCH-043**: Implement graph filter state
  - Filter by edge type (derived-from, depends-on, related-to, contradicts, supersedes)
  - Filter by author
  - Filter by tag
  - Filter by permission level
  - Search by spec title/content

### 3.6 Chat Store (Domain)

- [ ] **FE-ARCH-044**: Implement `ChatStore` class in `stores/domain/ChatStore.ts`
  - Observables: `@observable sessions`, `@observable activeSessionId`, `@observable messages`, `@observable isAgentThinking`, `@observable inputDraft`, `@observable attachments`
  - Actions (`@action.bound`): `createSession()`, `sendMessage()`, `loadHistory()`, `clearSession()`
  - Actions (`@action.bound`): `handleAgentMessage()`, `handleAgentStatus()`, `handleInteractiveAction()`
  - Computed: `@computed get activeSession()`, `@computed get activeMessages()`, `@computed get unreadCount()`
  - Constructor: `makeObservable(this, { ... })`
- [ ] **FE-ARCH-045**: Implement message queue for offline/slow connections
  - Queue messages when WebSocket is disconnected
  - Resend on reconnection
  - Show pending indicator for queued messages
- [ ] **FE-ARCH-046**: Implement conversation context tracking
  - Track what the user is currently viewing (document, spec, graph node)
  - Send context with each message to the agent

### 3.7 UI Stores

> **Design principle**: Primitive and compositional UI components must be **props-driven, not store-driven**. Simple UI state (open/closed, hover, focus, form field values, animation state) belongs as local component state or props — never in a MobX store. UI stores exist for two specific purposes:
>
> 1. **`@computed` domain transformations** — deriving UI-ready data from domain and session stores (e.g., a filtered/sorted list of specs for the current view, permission-resolved display flags, aggregated graph statistics).
> 2. **Application-level state** — state that is meaningful to the application as a whole and persists across component lifecycles (e.g., theme preference, panel layout, active navigation context, notification queue). This is distinct from component-level UI state.

- [ ] **FE-ARCH-047**: Implement `UILayoutStore` class in `stores/ui/UILayoutStore.ts`
  - Observables: `@observable theme`, `@observable sidebarOpen`, `@observable chatPanelWidth`
  - Computed: `@computed get isDarkMode()` (derived from theme), `@computed get mainContentWidth()` (derived from sidebar + chat widths)
  - Actions (`@action.bound`): `toggleTheme()`, `toggleSidebar()`, `setChatWidth()`
  - Constructor: `makeObservable(this, { ... })`
  - Hydrate persisted preferences (`theme`, `sidebarOpen`, `chatPanelWidth`) from localStorage in the constructor
  - Persist changes back to localStorage via a MobX `reaction` (no middleware — manual serialization)
  - Handle localStorage quota errors gracefully
  - NOTE: Individual panel open/closed, hover, resize-dragging states remain as local component state — only the persisted result (final width) flows into this store
- [ ] **FE-ARCH-048**: Implement `AppNavigationStore` class in `stores/ui/AppNavigationStore.ts`
  - Computed: `@computed get breadcrumbs()` (derived from domain stores — active document, spec, graph focus)
  - Computed: `@computed get activeViewContext()` (derived from current route + domain state — what the user is working on, sent as agent context)
  - Actions (`@action.bound`): `setActiveView()`, `navigateToSpec()`
  - Constructor: `makeObservable(this, { ... })`
- [ ] **FE-ARCH-049**: Implement `NotificationStore` class in `stores/ui/NotificationStore.ts`
  - Observables: `@observable notifications` (application-level toasts and alerts)
  - Actions (`@action.bound`): `addNotification()`, `dismissNotification()`
  - Constructor: `makeObservable(this, { ... })`
  - NOTE: Transient visual states (fade-out animation, hover-to-pause) are local component concerns, not store state

### 3.8 Version Control Store (Domain)

- [ ] **FE-ARCH-050**: Implement `VersionStore` class in `stores/domain/VersionStore.ts`
  - Observables: `@observable versionHistory`, `@observable activeDiff`, `@observable activeBranch`, `@observable branches`, `@observable mergeState`
  - Actions (`@action.bound`): `fetchHistory(specId)`, `fetchDiff(hash1, hash2)`, `revert(specId, hash)`, `createBranch()`, `switchBranch()`, `mergeBranch()`
  - Computed: `@computed get currentBranchName()`, `@computed get hasUncommittedChanges()`
  - Constructor: `makeObservable(this, { ... })`
- [ ] **FE-ARCH-051**: Implement diff computation caching
  - Cache computed diffs to avoid re-computation
  - Invalidate on new version via `@action`

### 3.9 Cross-Store Communication

- [ ] **FE-ARCH-052**: Define cross-store communication patterns via MobX `reaction` / `autorun`
  - ChatStore reacts to SpecStore changes for context updates (via `reaction` watching `specStore.activeSpecId`)
  - GraphStore reacts to SpecStore changes for node updates
  - VersionStore reacts to SpecStore changes for change tracking
  - All cross-store access goes through `this.rootStore.<otherStore>` references
- [ ] **FE-ARCH-053**: Implement `@computed` values that derive from multiple stores
  - UI stores are the primary home for `@computed` getters that transform domain/session data into UI-ready shapes via `rootStore`
  - Example: `@computed get visibleSpecs()` in a UI store reads from `specStore.documents` + `authStore.permissions` to produce the filtered list the component receives as props
  - Components using `observer()` automatically re-render only when accessed observables change — no manual shallow-equality checks needed
  - Components should receive computed results as props from parent `observer()` containers rather than accessing stores directly in leaf components

#### Design Decisions

> **Q**: Should the project use MobX (class-based stores, explicit reactivity) or React Context + useReducer (no dependency, built-in)? MobX is recommended in the plan — is there a reason to prefer Context instead?
> **A**: Use MobX with class-based stores using `makeObservable` and explicit decorator annotations (`@observable`, `@action`, `@computed`, `@action.bound`). Enable strict mode via `configure({ enforceActions: 'always' })` to enforce Flux-style unidirectional data flow. MobX provides fine-grained reactivity (only re-renders components that read changed observables), clear separation of concerns via class-based stores, and works excellently with TypeScript. Context + useReducer causes unnecessary re-renders in deeply nested trees and is harder to use outside React components. Stores are organized into three categories: **Domain stores** (backend data, API actions), **Session stores** (auth, user profile, browser), and **UI stores** (`@computed` domain transformations for deriving UI-ready data, plus application-level state like theme and layout preferences). All stores are provided via a RootStore pattern + React Context. Primitive and compositional UI components are strictly props-driven — top-level `observer()` containers read from stores and pass data down as props. Simple UI state (open/closed, hover, form values) stays as local component state, never in a store.

> **Q**: Should TanStack Query (React Query) be used alongside MobX for server-state management? It adds caching, deduplication, and background refetching but introduces another library and mental model.
> **A**: Yes, use TanStack Query for all server-state fetching (specs, graph data, user lists, version history). TanStack Query results flow into MobX domain stores via `@action` methods, which then serve as the reactive source for components. MobX handles client-only state (UI preferences, panel sizes, selected items) and computed derivations. TanStack Query's deduplication, background refetching, and stale-while-revalidate patterns are essential for a real-time collaborative tool. The mental model split is clean: MobX domain stores = reactive data layer (hydrated by TanStack Query), MobX UI stores = client-only state, TanStack Query = server fetching and cache management.

> **Q**: Since MobX doesn't have built-in `persist` middleware, how should UI preferences be persisted to localStorage? What about server-state data?
> **A**: UI stores hydrate from localStorage in their constructor and persist via MobX `reaction()` — whenever an observed value changes, the reaction writes it to localStorage. Only persist UI preference stores (panel sizes, theme, collapsed states, last-visited document). Never persist spec or graph data — TanStack Query handles server-state caching with proper invalidation. Persisting server data to localStorage risks stale reads and sync conflicts on reload.

> **Q**: What should the cache TTL be for different data types? Specs (edited frequently), graph data (changes on agent operations), user list (changes rarely)?
> **A**: Specs: `staleTime: 30s`, refetch on window focus and WebSocket push. Graph data: `staleTime: 60s`, invalidated on WebSocket events for edge/node changes. User list: `staleTime: 5min`, refetch on explicit navigation to user-related views. All TTLs are TanStack Query `staleTime` values; `gcTime` (garbage collection) set to 10min across the board.

> **Q**: Should the client maintain a full local copy of the knowledge graph, or only fetch subgraphs on demand? A full local copy enables offline-like speed but could be large.
> **A**: Fetch the full graph structure (node IDs, titles, edge types) on project load — this is lightweight metadata. Fetch full spec content on demand when a node is selected or a document is opened. This gives instant graph navigation while keeping memory reasonable. For projects exceeding 5,000 nodes, switch to subgraph fetching with a 2-hop neighborhood around the viewport.

> **Q**: How should the client handle stale cache when a WebSocket notification arrives? Immediately refetch, or mark as stale and refetch on next access?
> **A**: Immediately refetch for data currently visible on screen (active spec in editor, visible graph nodes). Mark as stale for off-screen data and refetch on next access. This keeps the active view fresh without flooding the network with requests for data the user isn't looking at.

> **Q**: Which operations should use optimistic updates? Spec editing (likely yes), edge creation (maybe), branch switching (probably not)?
> **A**: Optimistic updates for: spec content editing (must feel instant), spec metadata changes (title, tags), edge creation/deletion (immediate graph feedback). No optimistic updates for: branch switching (complex state swap), merge operations (needs server validation), revert operations (destructive, needs confirmation). Edge type changes are optimistic since they're low-risk.

> **Q**: How should optimistic update conflicts be handled? If the server rejects an optimistic update, should the UI snap back immediately or show a conflict resolution dialog?
> **A**: Snap back immediately with a toast notification explaining the rejection (e.g., "Edge creation failed: target spec was deleted"). For spec content conflicts (rare with auto-save), show a brief inline banner at the top of the editor with a "View conflict" link that opens the diff view. No modal dialogs for optimistic rollbacks — they break flow.

> **Q**: Since auth uses http-only cookies, does the frontend need to manage tokens at all? Or does the browser handle cookie attachment automatically?
> **A**: The browser handles cookie attachment automatically for same-origin requests. The frontend does not store or manage tokens directly. The API client includes `credentials: 'include'` on all fetch requests. The only auth-related client state is the current user profile (fetched from a `/me` endpoint on app load) stored in a MobX SessionStore (class-based with `@observable` user profile, `@action` for login/logout, provided via RootStore context).

> **Q**: How should the frontend detect session expiry? A 401 response from the API, a WebSocket disconnect, or both?
> **A**: Both. A 401 from any API response triggers a redirect to the login page. The WebSocket connection dropping is treated as a signal to verify the session by calling `/api/auth/me` — if that returns 401, redirect to login. This catches both REST and real-time session expiry.

> **Q**: Should there be a session timeout warning ("Your session will expire in 5 minutes") before automatic logout?
> **A**: No. The server should use sliding session expiration (activity extends the session). Since the app maintains an active WebSocket and makes regular API calls, active users will never time out. If the session does expire (user left tab open overnight), the next interaction triggers a clean redirect to login with a "Session expired" message.

> **Q**: Should the app support multiple browser tabs? If so, how should state be synchronized between tabs (localStorage events, BroadcastChannel)?
> **A**: Yes, support multiple tabs. Use `BroadcastChannel` API to synchronize critical events: logout, branch switch, and theme change. TanStack Query automatically shares cache across tabs via its built-in `broadcastQueryClient` plugin. Panel layout is per-tab (each tab can have its own arrangement). No need to sync editor state between tabs.

> **Q**: If the user logs out in one tab, should all tabs log out immediately?
> **A**: Yes. The logout action broadcasts via `BroadcastChannel`, and all tabs redirect to the login page immediately. This prevents a scenario where one tab continues making authenticated requests after the user intended to end their session.

---

## 4. Module Organization

### 4.1 Feature-Based Directory Structure

- [ ] **FE-ARCH-054**: Organize source code into feature-based modules
  ```
  src/
  ├── components/          # Shared/common components
  │   ├── common/          # Button, Input, Modal, etc.
  │   ├── layout/          # AppLayout, Sidebar, Header, etc.
  │   └── feedback/        # Toast, Spinner, ErrorDisplay, etc.
  ├── features/            # Feature modules
  │   ├── auth/            # Login, Register, AuthGuard
  │   ├── dashboard/       # Dashboard view
  │   ├── documents/       # Spec document list and editor
  │   ├── graph/           # Knowledge graph visualization
  │   ├── chat/            # Chat dialog panel
  │   ├── versions/        # Version control UI
  │   ├── genui/           # Generative UI host/sandbox
  │   └── settings/        # User settings
  ├── hooks/               # Shared custom hooks
  ├── services/            # API and WebSocket services
  ├── stores/              # MobX stores (domain/, session/, ui/, RootStore)
  ├── types/               # Frontend-only types
  ├── utils/               # Utility functions
  ├── styles/              # Global styles and theme
  ├── assets/              # Static assets
  ├── routes/              # Route definitions
  ├── providers/           # Context providers (StoreProvider, etc.)
  └── config/              # App configuration
  ```

### 4.2 Feature Module Convention

- [ ] **FE-ARCH-055**: Define the standard feature module structure
  ```
  features/{feature}/
  ├── components/          # Feature-specific components
  │   ├── FeatureView.tsx
  │   ├── FeatureView.scss
  │   └── SubComponent.tsx
  ├── hooks/               # Feature-specific hooks
  ├── types/               # Feature-specific types
  ├── utils/               # Feature-specific utilities
  └── index.ts             # Barrel export for the feature
  ```
- [ ] **FE-ARCH-056**: Enforce import boundaries between feature modules
  - Features import from `components/`, `hooks/`, `services/`, `stores/`, `utils/`
  - Features do NOT import directly from other features
  - Cross-feature communication happens through MobX stores or events
- [ ] **FE-ARCH-057**: Create ESLint rule or convention for import boundaries
  - Warn on direct cross-feature imports
  - Suggest using shared abstractions instead

### 4.3 Barrel Exports

- [ ] **FE-ARCH-058**: Create barrel exports for shared components
  - `components/common/index.ts`
  - `components/layout/index.ts`
  - `components/feedback/index.ts`
- [ ] **FE-ARCH-059**: Create barrel exports for each feature module
  - Export only the public API of each feature (main view component, hooks)
- [ ] **FE-ARCH-060**: Create barrel exports for hooks, services, and utils

---

## 5. API Client Layer

### 5.1 HTTP Client Setup

- [ ] **FE-ARCH-061**: Create `client/ui/src/services/api/` directory
- [ ] **FE-ARCH-062**: Create `api/client.ts` — base HTTP client
  - Use `fetch` API (native, no library dependency)
  - Configure base URL from environment config
  - Set default headers (`Content-Type: application/json`, `Accept: application/json`)
  - Include credentials (`credentials: 'include'` for http-only cookies)
- [ ] **FE-ARCH-063**: Implement request interceptor pattern
  - Attach auth token (if not using http-only cookies for all requests)
  - Add request ID header for tracing
  - Add timestamp header
- [ ] **FE-ARCH-064**: Implement response interceptor pattern
  - Parse JSON response body
  - Extract and normalize errors from `ApiResponse<T>` envelope
  - Handle 401 responses (trigger token refresh or logout)
  - Handle 403 responses (permission denied)
  - Handle 429 responses (rate limiting — show user feedback)
  - Handle 500+ responses (server error — show generic error)
- [ ] **FE-ARCH-065**: Implement retry logic for transient failures
  - Retry on network errors and 5xx responses
  - Exponential backoff with jitter
  - Maximum retry count (3 attempts)
  - Do not retry on 4xx (client errors)
- [ ] **FE-ARCH-066**: Implement request cancellation via `AbortController`
  - Cancel in-flight requests when component unmounts
  - Cancel duplicate requests for the same resource
  - Expose cancel function to calling code

### 5.2 API Service Modules

- [ ] **FE-ARCH-067**: Create `api/auth.api.ts` — authentication endpoints
  - `login(credentials)` → POST `/api/v1/auth/login`
  - `register(userData)` → POST `/api/v1/auth/register`
  - `logout()` → POST `/api/v1/auth/logout`
  - `refreshToken()` → POST `/api/v1/auth/refresh`
  - `getCurrentUser()` → GET `/api/v1/auth/me`
- [ ] **FE-ARCH-068**: Create `api/specs.api.ts` — spec CRUD endpoints
  - `getDocuments(params?)` → GET `/api/v1/documents`
  - `getDocument(id)` → GET `/api/v1/documents/:id`
  - `createDocument(data)` → POST `/api/v1/documents`
  - `updateDocument(id, data)` → PATCH `/api/v1/documents/:id`
  - `deleteDocument(id)` → DELETE `/api/v1/documents/:id`
  - `getSpec(id)` → GET `/api/v1/specs/:id`
  - `createSpec(data)` → POST `/api/v1/specs`
  - `updateSpec(id, data)` → PATCH `/api/v1/specs/:id`
  - `deleteSpec(id)` → DELETE `/api/v1/specs/:id`
  - `reorderSpecs(documentId, specIds)` → PUT `/api/v1/documents/:id/reorder`
- [ ] **FE-ARCH-069**: Create `api/graph.api.ts` — knowledge graph endpoints
  - `getGraph(params?)` → GET `/api/v1/graph`
  - `getSubgraph(specId, depth)` → GET `/api/v1/graph/subgraph/:specId`
  - `getEdges(specId)` → GET `/api/v1/graph/edges/:specId`
  - `createEdge(data)` → POST `/api/v1/graph/edges`
  - `deleteEdge(id)` → DELETE `/api/v1/graph/edges/:id`
  - `getInquiryQueue()` → GET `/api/v1/graph/inquiries`
  - `resolveInquiry(id, resolution)` → PATCH `/api/v1/graph/inquiries/:id`
- [ ] **FE-ARCH-070**: Create `api/agent.api.ts` — agent session endpoints
  - `createSession(context)` → POST `/api/v1/agent/sessions`
  - `sendMessage(sessionId, message)` → POST `/api/v1/agent/sessions/:id/messages`
  - `getSessionHistory(sessionId)` → GET `/api/v1/agent/sessions/:id/messages`
  - `cancelSession(sessionId)` → POST `/api/v1/agent/sessions/:id/cancel`
  - `listSessions()` → GET `/api/v1/agent/sessions`
- [ ] **FE-ARCH-071**: Create `api/versions.api.ts` — version control endpoints
  - `getVersionHistory(specId)` → GET `/api/v1/versions/specs/:specId`
  - `getDocumentHistory(documentId)` → GET `/api/v1/versions/documents/:documentId`
  - `getDiff(specId, fromHash, toHash)` → GET `/api/v1/versions/diff`
  - `revertSpec(specId, toHash)` → POST `/api/v1/versions/revert`
  - `getBranches()` → GET `/api/v1/versions/branches`
  - `createBranch(name, fromBranch?)` → POST `/api/v1/versions/branches`
  - `switchBranch(name)` → POST `/api/v1/versions/branches/:name/switch`
  - `mergeBranch(sourceBranch, targetBranch)` → POST `/api/v1/versions/merge`
- [ ] **FE-ARCH-072**: Create `api/users.api.ts` — user management endpoints
  - `getUsers()` → GET `/api/v1/users`
  - `getUser(id)` → GET `/api/v1/users/:id`
  - `updateProfile(data)` → PATCH `/api/v1/users/me`
- [ ] **FE-ARCH-073**: Create `api/permissions.api.ts` — permission endpoints
  - `getPermissions(specId)` → GET `/api/v1/permissions/specs/:specId`
  - `grantAccess(specId, userId, level)` → POST `/api/v1/permissions/grant`
  - `revokeAccess(specId, userId)` → POST `/api/v1/permissions/revoke`
  - `getAccessLog(specId)` → GET `/api/v1/permissions/specs/:specId/log`
- [ ] **FE-ARCH-074**: Create `api/genui.api.ts` — generative UI endpoints
  - `listGenUIs(userId?)` → GET `/api/v1/genui`
  - `getGenUI(id)` → GET `/api/v1/genui/:id`
  - `triggerBuild(id)` → POST `/api/v1/genui/:id/build`
  - `deleteGenUI(id)` → DELETE `/api/v1/genui/:id`

### 5.3 Data Fetching Hooks

- [ ] **FE-ARCH-075**: Create custom data fetching hooks pattern
  - `useQuery(key, fetchFn, options)` — generic query hook with caching
  - `useMutation(mutationFn, options)` — generic mutation hook with optimistic updates
  - Consider using TanStack Query (React Query) for server-state caching/fetching; results flow into MobX domain stores via `@action` methods
- [ ] **FE-ARCH-076**: Create `hooks/useApiQuery.ts` — wrapper for API GET requests
  - Manage loading, error, data states
  - Support refetch, polling, and cache invalidation
  - Integrate with MobX domain stores for cache-first fetching
- [ ] **FE-ARCH-077**: Create `hooks/useApiMutation.ts` — wrapper for API POST/PATCH/DELETE
  - Manage submitting, error, success states
  - Support optimistic updates with rollback
  - Show toast on success/error
- [ ] **FE-ARCH-078**: Create domain-specific hooks
  - `useDocument(id)` — fetch and cache a single document
  - `useDocuments()` — fetch and cache document list
  - `useSpec(id)` — fetch and cache a single spec
  - `useGraph(options)` — fetch graph data
  - `useVersionHistory(specId)` — fetch version history

### 5.4 Request Type Safety

- [ ] **FE-ARCH-079**: Import API types from `@kg/shared`
  - Use shared `ApiResponse<T>` wrapper for all responses
  - Use shared DTO types for request bodies
- [ ] **FE-ARCH-080**: Create typed API client methods
  - Each API function returns `Promise<ApiResponse<T>>` with proper generics
  - Request body types match server DTOs
- [ ] **FE-ARCH-081**: Implement response validation (optional)
  - Validate response shape matches expected type at runtime
  - Use Zod schemas derived from shared types
  - Log validation failures as warnings (don't break the app)

#### Design Decisions

> **Q**: Should the app use a "fetch on render" pattern (useEffect), "fetch then render" (route loaders), or "render as you fetch" (Suspense + concurrent)? React Router v6 supports route loaders natively.
> **A**: Use route loaders for primary data (document content, spec list for a document) to start fetching before render. Use TanStack Query's `useQuery` with Suspense boundaries for secondary data (graph neighbors, version history, user list). This gives fast initial loads via loaders while keeping component-level data fetching simple with TanStack Query.

> **Q**: Should paginated endpoints use cursor-based or offset-based pagination? Cursor-based is better for real-time data but more complex.
> **A**: Cursor-based pagination for version history and chat messages (ordered by time, frequently appended). Offset-based for document lists and search results (stable ordering, user expects page numbers). TanStack Query's `useInfiniteQuery` supports both patterns cleanly.

> **Q**: Should the API client library be `fetch` (native, lighter) or `axios` (more features, interceptors)? The plan recommends `fetch` — any objections?
> **A**: Use native `fetch` wrapped in a thin custom client (`client/ui/src/api/client.ts`) that handles base URL, auth cookie inclusion, JSON parsing, and error normalization. No need for axios — interceptors can be replicated with a simple wrapper, and fetch is lighter with no dependency.

> **Q**: Should the app work offline at all? If the server is unreachable, should the user be able to read cached specs, or should a "connection required" message be shown?
> **A**: Allow read-only access to TanStack Query's cached data when offline. The user can browse previously loaded specs and graph views but cannot edit, chat, or perform any write operations. A persistent top banner reads "You're offline — viewing cached data. Changes require a connection." No service worker or offline-first architecture.

> **Q**: Should spec edits made while offline be queued and synced when connection is restored?
> **A**: No. Offline editing is not supported. If the connection drops mid-edit, the editor shows a warning banner and disables auto-save. Unsaved changes remain in the editor's local state (TipTap holds content in memory) and are saved when connection restores. No offline queue — it introduces complex conflict resolution that isn't justified for a desktop-first professional tool.

---

## 6. WebSocket Integration

### 6.1 WebSocket Client Setup

- [ ] **FE-ARCH-082**: Create `client/ui/src/services/websocket/` directory
- [ ] **FE-ARCH-083**: Create `websocket/client.ts` — WebSocket connection manager
  - Connect to server WebSocket endpoint (`/ws`)
  - Handle connection lifecycle (open, close, error)
  - Implement automatic reconnection with exponential backoff
  - Maximum reconnection attempts before showing error UI
  - Send authentication token on connection (or via first message)
- [ ] **FE-ARCH-084**: Implement heartbeat/ping-pong mechanism
  - Send periodic pings to detect stale connections
  - Reconnect if pong not received within timeout
- [ ] **FE-ARCH-085**: Implement connection state management
  - Track connection status: connecting, connected, disconnected, reconnecting, failed
  - Expose connection state to UI (show indicator)

### 6.2 Event Handling

- [ ] **FE-ARCH-086**: Create typed event handler system
  - Define event types from `@kg/shared/types/websocket`
  - Type-safe event subscription: `ws.on('agent:status', handler)`
  - Type-safe event emission: `ws.send('agent:message', payload)`
- [ ] **FE-ARCH-087**: Implement event routing to MobX stores via `@action` methods
  - `agent:status` → call `chatStore.updateAgentStatus()` action
  - `agent:message` → call `chatStore.handleAgentMessage()` action
  - `spec:updated` → call `specStore.invalidateCache()` action
  - `spec:created` → call `specStore.addSpec()` action
  - `spec:deleted` → call `specStore.removeSpec()` action
  - `graph:edge-created` → call `graphStore.addEdge()` action
  - `graph:edge-deleted` → call `graphStore.removeEdge()` action
  - `sync:available` → call `versionStore.markSyncAvailable()` action
  - `user:activity` → update multi-user awareness indicators
- [ ] **FE-ARCH-088**: Implement message buffering during reconnection
  - Buffer incoming messages during reconnection
  - Replay buffered messages after successful reconnect
  - Request missed messages from server (gap detection)

### 6.3 WebSocket Provider

- [ ] **FE-ARCH-089**: Create `providers/WebSocketProvider.tsx`
  - Initialize WebSocket connection on mount
  - Cleanup on unmount
  - Provide WebSocket client via context
  - Re-establish connection on auth state changes
- [ ] **FE-ARCH-090**: Create `hooks/useWebSocket.ts` for consuming components
  - Access WebSocket client from context
  - Subscribe to specific events
  - Cleanup subscriptions on unmount
- [ ] **FE-ARCH-091**: Create `hooks/useConnectionStatus.ts`
  - Return current WebSocket connection status
  - Used by UI to show connection indicator

#### Design Decisions

> **Q**: For data that changes in real-time (agent messages, spec updates), should the client rely entirely on WebSocket pushes, or also poll at intervals as a fallback?
> **A**: Primary: WebSocket pushes for all real-time data. Fallback: poll every 30 seconds if the WebSocket connection drops, with exponential backoff on reconnection attempts. A connection status indicator in the header shows green (connected), yellow (reconnecting), or red (disconnected with polling fallback).

> **Q**: Should the WebSocket connection carry all real-time data, or should some data use Server-Sent Events (SSE) for simpler one-way streaming (e.g., agent thinking stream)?
> **A**: Use a single WebSocket connection for everything. SSE would require a second connection and add infrastructure complexity. The WebSocket protocol handles both bidirectional messages (chat) and unidirectional streams (agent thinking) via typed message frames. Agent token streaming is sent as incremental WebSocket messages with a `stream_id` for reassembly.

---

## 7. ESM Dynamic Import Strategy

### 7.1 Generative UI Loader

- [ ] **FE-ARCH-092**: Create `services/genui/loader.ts` — ESM dynamic import manager
  - Load generative UI modules from `client/gen/{user}/{project}/dist/`
  - Use dynamic `import()` for ESM module loading
  - Handle module resolution errors gracefully
  - Cache loaded modules to avoid re-fetching
- [ ] **FE-ARCH-093**: Define the generative UI module interface
  - Each gen UI module must export a `default` React component
  - Each gen UI module must export a `metadata` object (name, version, spec links)
  - Each gen UI module may export an `onMessage` handler for iframe communication
- [ ] **FE-ARCH-094**: Implement module validation on load
  - Verify module exports match expected interface
  - Sandbox validation: check for disallowed APIs
  - Show error UI if module fails validation

### 7.2 Iframe Sandbox Integration

- [ ] **FE-ARCH-095**: Create `features/genui/components/GenUIFrame.tsx`
  - Render `<iframe>` with `sandbox` attribute
  - Set sandbox flags: `allow-scripts allow-forms` (no `allow-same-origin`)
  - Set `src` to the gen UI project's built `index.html`
  - Apply CSP via iframe `csp` attribute (if supported)
- [ ] **FE-ARCH-096**: Implement iframe communication via `postMessage`
  - Define message protocol: `{ type: string, payload: unknown, requestId?: string }`
  - Host → iframe: send configuration, context data, commands
  - Iframe → host: send user input results, action requests
  - Validate origin on all received messages
- [ ] **FE-ARCH-097**: Implement iframe lifecycle management
  - Load, ready, error, unload states
  - Timeout for iframe loading (show error after threshold)
  - Reload capability for updated gen UI builds
- [ ] **FE-ARCH-098**: Create iframe resize handler
  - Allow gen UI to request height changes
  - Auto-resize iframe based on content (with maximum limit)

### 7.3 Module Registry

- [ ] **FE-ARCH-099**: Create `services/genui/registry.ts` — track available gen UI modules
  - List all available gen UI projects for the current user
  - Track module status: available, loading, loaded, error
  - Provide search/filter for available modules
- [ ] **FE-ARCH-100**: Implement gen UI module cleanup
  - Unload modules when no longer displayed
  - Free iframe resources
  - Clear module cache on logout or user switch

---

## 8. Error Boundary Strategy

### 8.1 Error Boundary Components

- [ ] **FE-ARCH-101**: Create `components/feedback/ErrorBoundary.tsx` — base error boundary
  - Catch React rendering errors
  - Display fallback UI with error message
  - Provide "retry" button to re-render
  - Log errors to error reporting service
- [ ] **FE-ARCH-102**: Create `components/feedback/AppErrorBoundary.tsx` — top-level boundary
  - Full-page error display for catastrophic failures
  - Show "reload application" button
  - Display error ID for support reference
- [ ] **FE-ARCH-103**: Create `components/feedback/RouteErrorBoundary.tsx` — route-level boundary
  - Show error within the main content area (header/sidebar remain functional)
  - Allow navigation to other routes
  - Provide "go back" and "retry" actions
- [ ] **FE-ARCH-104**: Create `components/feedback/FeatureErrorBoundary.tsx` — feature-level boundary
  - Show error within a specific panel or feature area
  - Other features continue working
  - Compact error display appropriate for panels
- [ ] **FE-ARCH-105**: Create `components/feedback/SilentErrorBoundary.tsx` — non-critical boundary
  - Hide the failed component without showing error UI
  - Log the error silently
  - Used for optional/supplementary features (e.g., resource panels)

### 8.2 Error Reporting

- [ ] **FE-ARCH-106**: Create `services/error-reporting.ts` — centralized error reporting
  - Log errors to console in development
  - Send errors to server endpoint in production (POST `/api/v1/errors`)
  - Include user context, route, browser info, stack trace
  - Rate-limit error reporting to prevent flooding
- [ ] **FE-ARCH-107**: Create `hooks/useErrorHandler.ts` — imperative error handling
  - Hook for handling errors in event handlers and async code
  - Not caught by error boundaries (non-rendering errors)
  - Show toast notification for user-facing errors
  - Log technical errors silently

### 8.3 Error Display Components

- [ ] **FE-ARCH-108**: Create `components/feedback/ErrorDisplay.tsx` — styled error message
  - Icon, title, message, optional details
  - Action buttons (retry, go back, contact support)
  - Variants: inline, card, full-page
- [ ] **FE-ARCH-109**: Create `components/feedback/NetworkError.tsx` — network-specific error
  - Show when API requests fail
  - Include retry button with countdown
  - Show offline indicator if no network

#### Design Decisions

> **Q**: What tone should error messages use? Technical ("404: Resource not found"), friendly ("We couldn't find that spec"), or both (friendly with technical details expandable)?
> **A**: Friendly with expandable technical details. Primary message is human-readable ("This spec couldn't be loaded"), with a "Show details" toggle revealing the error code and message for debugging. This serves both casual users and developers troubleshooting issues.

> **Q**: Should errors that affect a single feature (e.g., graph failed to load) block the entire view, or should other features remain usable?
> **A**: Other features remain usable. Each major panel (editor, graph, chat) has its own React error boundary. If the graph fails, the editor and chat continue working. The failed panel shows an inline error state with a retry button. Only authentication failures or complete API unavailability block the entire view.

> **Q**: Should the app show a global error banner at the top for persistent issues (e.g., WebSocket disconnected), or only inline errors?
> **A**: Both. Persistent infrastructure issues (WebSocket disconnected, server unreachable) show a slim global banner at the top of the viewport (yellow for degraded, red for offline). Feature-specific errors (graph load failed, spec save failed) show inline within their panel. The global banner auto-dismisses when the issue resolves.

> **Q**: Should all error states offer an automatic retry (with countdown), or only certain types of errors (network, timeout)?
> **A**: Automatic retry with exponential backoff for network errors and timeouts only (retry after 2s, 4s, 8s, max 3 attempts). Validation errors (400), auth errors (401/403), and not-found errors (404) show immediately with no retry. The retry countdown is visible: "Retrying in 3s... [Retry Now] [Cancel]".

> **Q**: How should the app handle server downtime? Show a maintenance page, or allow read-only access to cached data?
> **A**: Allow read-only access to cached data with a global banner: "Server is unreachable — viewing cached data." If no cached data exists (first visit during downtime), show a minimal maintenance page with the connection status and an auto-retry indicator. The app attempts reconnection every 15 seconds.

---

## 9. Performance Optimization

### 9.1 Rendering Optimization

- [ ] **FE-ARCH-110**: Wrap all React components that read MobX observables with `observer()` from `mobx-react-lite`
  - MobX's fine-grained reactivity means only components reading changed observables re-render
  - Prefer many small `observer()` components over few large ones for optimal granularity
  - Avoid reading observables in parent and passing as props — let children read directly from stores
- [ ] **FE-ARCH-111**: Use `@computed` for expensive derived values in MobX stores
  - Graph layout calculations
  - Filtered/sorted lists
  - Diff computations
  - MobX `@computed` values are automatically memoized and only recompute when dependencies change
- [ ] **FE-ARCH-112**: Implement `useCallback` for stable function references passed to non-observer components
  - Event handlers passed to third-party components not wrapped in `observer()`
  - Callbacks passed to context providers
- [ ] **FE-ARCH-113**: Implement React Compiler (React 19+) or manual optimization
  - If using React 19+, evaluate React Compiler for automatic memoization of non-MobX components
  - MobX `observer()` components already have fine-grained reactivity; React Compiler is supplementary

### 9.2 Virtualization

- [ ] **FE-ARCH-114**: Implement list virtualization for spec document lists
  - Use `react-window` or `@tanstack/react-virtual`
  - Virtualize document list (could be hundreds of documents)
  - Virtualize spec list within documents (could be dozens of specs)
- [ ] **FE-ARCH-115**: Implement virtualization for chat message history
  - Virtualize long conversation histories
  - Handle variable-height messages (measure before render)
  - Maintain scroll position anchoring
- [ ] **FE-ARCH-116**: Implement graph node virtualization
  - Only render nodes visible in the viewport
  - Use spatial indexing (quadtree) for viewport culling
  - Render placeholder dots for distant/small nodes
- [ ] **FE-ARCH-117**: Implement version history virtualization
  - Virtualize long version history lists
  - Load more on scroll (infinite scroll)

### 9.3 Code Splitting

- [ ] **FE-ARCH-118**: Configure route-based code splitting (see 2.3)
- [ ] **FE-ARCH-119**: Implement component-level code splitting for heavy features
  - Lazy load graph visualization library
  - Lazy load markdown editor
  - Lazy load diff computation library
  - Lazy load generative UI iframe wrapper
- [ ] **FE-ARCH-120**: Configure Vite chunk optimization
  - Split vendor chunks (react, react-dom separate from other vendors)
  - Split by feature module
  - Analyze chunks with `rollup-plugin-visualizer`
  - Target < 200KB per initial chunk

### 9.4 Network Optimization

- [ ] **FE-ARCH-121**: Implement request deduplication
  - Deduplicate identical in-flight requests
  - Return same promise for duplicate requests
- [ ] **FE-ARCH-122**: Implement request batching (where server supports it)
  - Batch multiple spec fetches into a single request
  - Batch graph queries within a time window
- [ ] **FE-ARCH-123**: Implement data prefetching
  - Prefetch linked specs when hovering over graph edges
  - Prefetch document content when hovering over document list items
  - Prefetch next page in paginated lists
- [ ] **FE-ARCH-124**: Implement image/asset lazy loading
  - Use `loading="lazy"` for images
  - Use `IntersectionObserver` for custom lazy loading

### 9.5 Memory Management

- [ ] **FE-ARCH-125**: Implement store cleanup on route changes
  - Clear non-essential data when navigating away from features via `@action` methods
  - Keep cached data within memory budget
  - Dispose MobX reactions/autoruns when no longer needed
- [ ] **FE-ARCH-126**: Implement WebSocket subscription cleanup
  - Unsubscribe from events when components unmount
  - Clean up event listeners to prevent memory leaks
- [ ] **FE-ARCH-127**: Implement `AbortController` cleanup in `useEffect`
  - Cancel pending API requests on component unmount
  - Prevent state updates on unmounted components

#### Design Decisions

> **Q**: What are the target performance budgets? Initial load: < 3 seconds on fast 3G, TTI: < 5 seconds, FCP: < 1.5 seconds, JS bundle: < 500KB gzipped, LCP: < 2.5 seconds — are these appropriate?
> **A**: Adjust for a desktop-first professional tool on good connections. Initial load: < 2s on broadband. TTI: < 3s. FCP: < 1s. JS bundle (initial route): < 300KB gzipped (heavy libraries like TipTap are lazy-loaded; the graph tree view uses lightweight @tanstack/virtual). LCP: < 2s. These are tighter but achievable with code splitting. Fast 3G targets are deprioritized since this is a desktop tool.

> **Q**: Should performance budgets be enforced in CI (fail build if exceeded)?
> **A**: Yes, enforce in CI using `bundlesize` or Vite's built-in `build.rollupOptions` with `maxAssetSize` warnings. Fail the build if the initial chunk exceeds 300KB gzipped. Log warnings (not failures) for lazy-loaded chunks exceeding 200KB gzipped. This prevents accidental bundle bloat from large dependency additions.

> **Q**: What is the expected maximum number of nodes and edges to render simultaneously? 100 nodes? 1,000? 10,000? This determines whether canvas rendering (WebGL) is needed vs. SVG/DOM.
> **A**: Target 500–1,000 nodes as the typical upper bound for a single project's knowledge graph. The vertical tree layout with `@tanstack/virtual` handles this scale natively — only visible rows are rendered in the DOM, so node count has minimal performance impact. The layout is DOM-based (no Canvas or SVG rendering needed), making it inherently styleable and interactive. WebGL is unnecessary for this approach.

> **Q**: Should the graph use progressive rendering (show important nodes first, add details as rendering budget allows)?
> **A**: Yes. On initial load, render nodes without labels first (fast), then add labels and edge decorations in a second animation frame. For graphs over 300 nodes, show only node dots during active pan/zoom and render full detail when interaction stops (debounce 150ms). This keeps interaction smooth.

> **Q**: For long spec documents with many specs, should the editor virtualize specs (only render visible ones), or render all? At what spec count does virtualization become necessary?
> **A**: Render all specs for documents with ≤30 specs (TipTap/ProseMirror handles this well). For documents exceeding 30 specs, virtualize by rendering only specs within the viewport ± 2 specs of buffer. Use an intersection observer to load/unload spec editor instances. This threshold balances simplicity with performance.

---

## 10. Accessibility

### 10.1 Keyboard Navigation

- [ ] **FE-ARCH-128**: Implement global keyboard shortcuts
  - `Ctrl/Cmd + /` — open chat dialog input (or focus it)
  - `Ctrl/Cmd + K` — command palette (search specs, actions)
  - `Ctrl/Cmd + S` — save current document
  - `Ctrl/Cmd + B` — toggle sidebar
  - `Escape` — close modals, deselect, blur inputs
  - Document all shortcuts in a help modal
- [ ] **FE-ARCH-129**: Create `hooks/useHotkey.ts` — register keyboard shortcuts
  - Register key combinations with handlers
  - Handle conflicts between contexts (editor vs. app shortcuts)
  - Support configurable keybindings
- [ ] **FE-ARCH-130**: Implement focus management
  - Focus trap in modals and dialogs
  - Return focus to trigger element when modal closes
  - Focus first interactive element when navigating to new route
  - Visible focus ring for keyboard navigation (not mouse)
- [ ] **FE-ARCH-131**: Implement skip navigation link
  - "Skip to main content" link visible on focus
  - Skip navigation links for each major region

### 10.2 ARIA & Semantic HTML

- [ ] **FE-ARCH-132**: Enforce semantic HTML throughout components
  - Use `<nav>`, `<main>`, `<aside>`, `<header>`, `<footer>`, `<article>`, `<section>`
  - Use heading hierarchy (`h1` through `h6`) correctly
  - Use `<button>` for actions, `<a>` for navigation
- [ ] **FE-ARCH-133**: Implement ARIA landmarks for major regions
  - `role="navigation"` for sidebar and header nav
  - `role="main"` for content area
  - `role="complementary"` for chat panel
  - `role="status"` for agent thinking indicators
  - `role="alert"` for error messages and toasts
- [ ] **FE-ARCH-134**: Implement ARIA live regions for dynamic content
  - Chat messages: `aria-live="polite"`
  - Agent status updates: `aria-live="polite"`
  - Error notifications: `aria-live="assertive"`
  - Toast messages: `aria-live="polite"` with `aria-atomic="true"`
- [ ] **FE-ARCH-135**: Create accessible interactive widgets
  - Dropdown menus with `role="menu"` and arrow key navigation
  - Tab panels with `role="tablist"`, `role="tab"`, `role="tabpanel"`
  - Tree views with `role="tree"`, `role="treeitem"`
  - Tooltips with `role="tooltip"` and `aria-describedby`

### 10.3 Visual Accessibility

- [ ] **FE-ARCH-136**: Ensure color contrast meets WCAG AA standards
  - Text contrast ratio ≥ 4.5:1 for normal text
  - Text contrast ratio ≥ 3:1 for large text
  - UI component contrast ratio ≥ 3:1
  - Validate in both light and dark themes
- [ ] **FE-ARCH-137**: Ensure information is not conveyed by color alone
  - Edge types distinguished by line style in addition to color
  - Graph node states use icons in addition to color
  - Diff indicators use symbols (+ / −) in addition to color
- [ ] **FE-ARCH-138**: Support `prefers-reduced-motion` media query
  - Disable or reduce animations and transitions
  - Use `@media (prefers-reduced-motion: reduce)` in SCSS
  - Check preference in JavaScript for programmatic animations
- [ ] **FE-ARCH-139**: Support `prefers-color-scheme` for automatic theme
  - Detect user's system preference
  - Default to system preference if no explicit selection
  - Allow manual override via settings

### 10.4 Screen Reader Support

- [ ] **FE-ARCH-140**: Test with screen readers (VoiceOver, NVDA)
  - Test navigation flow
  - Test form interactions
  - Test dynamic content updates (chat, graph)
  - Test error announcements
- [ ] **FE-ARCH-141**: Add `aria-label` to all icon-only buttons
  - Sidebar toggle, theme toggle, close buttons, action icons
- [ ] **FE-ARCH-142**: Implement accessible graph visualization
  - Provide text description of graph structure
  - Allow keyboard navigation between nodes
  - Announce node details on selection

#### Design Decisions

> **Q**: What WCAG level should the app target? AA (standard) or AAA (enhanced)? AA is recommended as the minimum.
> **A**: Target WCAG 2.1 AA compliance. AAA is aspirational but not practical for a complex interactive tool with graph visualization and rich text editing. AA covers the essential requirements: sufficient contrast, keyboard navigation, screen reader support, and focus management.

> **Q**: Are there specific accessibility requirements from the target user organization?
> **A**: No specific organizational requirements. Follow WCAG 2.1 AA as the baseline. Additionally, ensure all destructive actions (delete spec, revert, merge) are keyboard-accessible and require confirmation. The graph visualization must have a text-based alternative for screen reader users.

> **Q**: Should automated accessibility testing be part of CI (e.g., axe-core)?
> **A**: Yes. Run `axe-core` via `jest-axe` in component tests for all shared components. Run Playwright with `@axe-core/playwright` for E2E accessibility checks on critical flows (login, spec editing, chat). Fail the build on any critical or serious axe violations. Moderate/minor violations are logged as warnings.

> **Q**: How should the knowledge graph be accessible to screen reader users? A text-based alternative view? An accessible data table of nodes and edges?
> **A**: The vertical tree layout is inherently more accessible than a canvas-based graph — it renders as DOM elements with semantic HTML. Each spec card has proper ARIA attributes, and keyboard navigation between rows/cards is native. Additionally, provide an accessible data table listing all specs with their edge connections, sortable by title, type, and connection count. This table is toggled via an "Accessible view" button above the tree. The table rows are interactive — clicking a row selects the spec and shows its details. The tree view container has an `aria-label` summarizing the graph ("Knowledge graph with 47 specs and 82 connections").

> **Q**: How should the drag-and-drop spec reordering be accessible? Keyboard alternatives with arrow keys and confirmation?
> **A**: Yes. When a spec is focused, pressing `Space` enters "move mode," then `Arrow Up/Down` repositions the spec. Pressing `Space` again confirms; `Escape` cancels. An ARIA live region announces the current position: "Spec 'Authentication Flow' moved to position 3 of 8." This follows the established pattern from `dnd-kit`'s accessibility features.

> **Q**: Should the app support high-contrast mode beyond the standard light/dark themes?
> **A**: Not in MVP. Light and dark themes with WCAG AA contrast ratios are sufficient initially. The app should respect the OS `prefers-contrast: more` media query in a future phase by increasing border weights and reducing transparency. High-contrast mode is a Phase 2+ enhancement.

---

## 11. Responsive Design Strategy

### 11.1 Breakpoint System

- [ ] **FE-ARCH-143**: Define responsive breakpoints
  - `$breakpoint-mobile`: 0–767px
  - `$breakpoint-tablet`: 768–1023px
  - `$breakpoint-desktop`: 1024–1439px
  - `$breakpoint-wide`: 1440px+
- [ ] **FE-ARCH-144**: Create `hooks/useBreakpoint.ts` — current breakpoint detection
  - Use `matchMedia` API for breakpoint detection
  - Return current breakpoint name and boolean flags
  - Update on resize (debounced)
- [ ] **FE-ARCH-145**: Create `hooks/useMediaQuery.ts` — generic media query hook
  - Accept any media query string
  - Return boolean match state
  - Cleanup listener on unmount

### 11.2 Layout Adaptation

- [ ] **FE-ARCH-146**: Implement mobile layout
  - Bottom navigation bar replacing sidebar
  - Full-screen views (no split panels)
  - Chat as full-screen overlay accessed from bottom nav
  - Swipe gestures for navigation (optional)
- [ ] **FE-ARCH-147**: Implement tablet layout
  - Collapsible sidebar (overlay mode)
  - Chat panel as collapsible drawer (right side)
  - Graph view with touch support (pinch zoom, drag pan)
- [ ] **FE-ARCH-148**: Implement desktop layout
  - Persistent sidebar
  - Side-by-side panels (editor + graph, editor + chat)
  - Resizable panels with drag handles
- [ ] **FE-ARCH-149**: Implement wide-screen layout
  - Three-column layout option (sidebar + editor + chat)
  - Extended graph viewport
  - Dashboard with multi-column grid

### 11.3 Touch Support

- [ ] **FE-ARCH-150**: Implement touch-friendly hit targets
  - Minimum 44x44px touch targets for interactive elements
  - Adequate spacing between touch targets
- [ ] **FE-ARCH-151**: Implement touch gestures for graph
  - Pinch to zoom
  - Two-finger drag to pan
  - Long press for context menu
  - Double tap to center on node
- [ ] **FE-ARCH-152**: Implement swipe gestures (optional)
  - Swipe right to open sidebar
  - Swipe left to open chat
  - Swipe down to refresh

#### Design Decisions

> **Q**: Is mobile support essential for the MVP, or can it be deferred? The app's primary use case (knowledge authoring) seems desktop-focused.
> **A**: Defer mobile support beyond MVP. The app is a professional desktop knowledge authoring tool. MVP targets screens ≥1280px wide. Ensure the layout doesn't break on 1024px (tablets in landscape) but don't invest in mobile-specific layouts or touch interactions for Phase 1.

> **Q**: If mobile is supported, is it a mobile-optimized web app, or should a PWA (Progressive Web App) be considered for native-like features?
> **A**: Mobile-optimized web app in a future phase, not a PWA. The app requires constant server connectivity (WebSocket, agent communication), so PWA offline features add no value. A responsive web layout that works on tablet browsers is sufficient when mobile is eventually addressed.

> **Q**: Should tablet support be a priority? Tablets could be useful for reviewing specs and navigating the graph.
> **A**: Tablet landscape (≥1024px) should work acceptably in MVP by naturally adapting the desktop layout with narrower panels. No tablet-specific layouts or touch optimizations for MVP. Tablets in portrait mode (768px) are not supported in Phase 1.

> **Q**: Which features should be available on mobile, and which should be desktop-only? Candidates for desktop-only: generative UI, complex graph manipulation, split-panel views.
> **A**: Desktop-only (Phase 1): generative UI authoring, split-panel views, graph editing (adding/removing edges), version merge/conflict resolution. Available on tablet: spec reading, chat with agent, graph viewing (read-only pan/zoom), version history browsing. Full editing requires ≥1280px viewport width.

> **Q**: Should the graph visualization be available on mobile (with touch gestures), or should a simplified list/tree view be shown instead?
> **A**: The vertical tree layout is the primary (and only) graph view at all viewports. On viewports <1024px, the tree layout naturally adapts — rows stack vertically with horizontal scrolling for wide rows. The DOM-based tree view is inherently touch-friendly compared to canvas-based approaches. On very small viewports, collapse to a searchable list view showing specs grouped by document with connection counts as badges.

---

## 12. Dependency Injection & Service Layer

### 12.1 Service Pattern

- [ ] **FE-ARCH-153**: Define service layer architecture
  - Services are singleton classes/modules that encapsulate business logic
  - Services are instantiated in providers or at app startup
  - Components access services through hooks, not direct imports
  - MobX stores may depend on services (injected via constructor)
- [ ] **FE-ARCH-154**: Create `services/index.ts` barrel export
  - Export all service instances
- [ ] **FE-ARCH-155**: Create `services/logger.ts` — logging service
  - Log levels: debug, info, warn, error
  - Prefix logs with module/component name
  - Suppress debug logs in production
  - Send error logs to error reporting service

### 12.2 Service Composition

- [ ] **FE-ARCH-156**: Create `services/notification.ts` — notification service
  - Unified API for showing toasts, banners, and alerts
  - Queue notifications if too many are active
  - Support notification persistence (dismissible vs. auto-dismiss)
- [ ] **FE-ARCH-157**: Create `services/clipboard.ts` — clipboard service
  - Copy text to clipboard
  - Copy spec references (for pasting links)
  - Show success/failure toast
- [ ] **FE-ARCH-158**: Create `services/storage.ts` — local storage service
  - Type-safe localStorage wrapper
  - Handle serialization/deserialization
  - Handle quota errors
  - Namespace keys to avoid collisions
  - Used by MobX stores for hydrating/persisting state in constructors and reactions

---

## 13. Feature Flags & Configuration

### 13.1 Feature Flag System

- [ ] **FE-ARCH-159**: Create `services/feature-flags.ts` — feature flag manager
  - Load feature flags from server config or environment
  - Support boolean and variant flags
  - Default values for all flags
- [ ] **FE-ARCH-160**: Create `hooks/useFeatureFlag.ts`
  - Check if a feature is enabled
  - Support conditional rendering based on flags
- [ ] **FE-ARCH-161**: Define initial feature flags
  - `enableGenerativeUI` — toggle gen UI feature
  - `enableGraphVisualization` — toggle graph view
  - `enableCollaboration` — toggle multi-user features
  - `enableDarkMode` — toggle dark mode option
  - `enableVersionControl` — toggle version control UI

### 13.2 App Configuration

- [ ] **FE-ARCH-162**: Create `config/app.config.ts` — centralized app configuration
  - API base URL
  - WebSocket URL
  - Feature flags
  - Default UI settings
  - Polling intervals
  - Cache TTL values
- [ ] **FE-ARCH-163**: Create `config/constants.ts` — UI constants
  - Debounce delays (typing, search, resize)
  - Animation durations
  - Max file upload sizes
  - Pagination defaults
  - Toast auto-dismiss duration

#### Design Decisions

> **Q**: What is the maximum acceptable number of frontend dependencies? Should there be a policy on adding new dependencies (review process, size budget)?
> **A**: No hard cap on dependency count, but enforce a per-dependency size budget: no single dependency >50KB gzipped (exceptions: TipTap — it is core). New dependencies require a brief justification in the PR description covering: why it's needed, alternatives considered, and bundle size impact. Use `bundlephobia` to check before adding.

> **Q**: Should the project prefer smaller, focused libraries over large frameworks? For example, date-fns vs. moment, MobX vs. Redux?
> **A**: Yes, always prefer smaller focused libraries. This is already reflected in the stack choices (MobX over Redux, native fetch over axios). Prefer tree-shakeable ESM packages. If only one function from a utility library is needed, consider inlining it rather than adding the dependency.

> **Q**: Should all dependencies use ESM-only packages, or is CommonJS acceptable if Vite can handle the conversion?
> **A**: Prefer ESM packages but accept CommonJS if Vite handles the conversion without issues. Vite's `optimizeDeps` pre-bundles CJS dependencies effectively. Don't reject a well-maintained CJS package solely for module format — but if two equivalent packages exist and one is ESM, choose the ESM one.

> **Q**: Is there a preference for a specific icon library? Lucide, Heroicons, Phosphor, custom SVGs?
> **A**: Use Lucide React. It's tree-shakeable (only imports used icons), has a comprehensive icon set (1,000+), consistent 24px grid design, and is the successor to Feather Icons. It pairs well with the clean, professional aesthetic. Custom SVGs for any project-specific icons not in Lucide.

> **Q**: Should the project use a date library (date-fns, dayjs) or rely on native Intl APIs?
> **A**: Use native `Intl.DateTimeFormat` and `Intl.RelativeTimeFormat` for display formatting. Write a small utility module (`client/ui/src/utils/date.ts`) with helper functions for common patterns (relative time, short date). No date library needed — the app doesn't do complex date manipulation, only display formatting of server-provided ISO timestamps.

> **Q**: Should the project use a form library (React Hook Form, Formik) for complex forms, or manage form state manually?
> **A**: Use React Hook Form for settings pages and any multi-field forms (branch creation, user preferences, spec metadata editing). It's lightweight (~9KB), integrates well with MobX stores (form submission can call `@action` methods directly), and handles validation with Zod schemas. The chat input and single-field inputs can be managed manually. Skip Formik — it's heavier and less performant.

---

## Additional Design Decisions

#### Testing Strategy

> **Q**: Should component tests use React Testing Library (behavior-focused) or Enzyme-style testing (implementation-focused)? RTL is recommended.
> **A**: Use React Testing Library (RTL). It encourages testing user-visible behavior rather than implementation details, producing more resilient tests. Pair with `vitest` as the test runner (aligns with the Vite toolchain). Enzyme is effectively deprecated and doesn't support modern React features well.

> **Q**: Should there be visual regression tests for key UI states (Chromatic, Percy, or custom screenshots)?
> **A**: Yes, use Playwright's built-in screenshot comparison for visual regression on critical UI states: diff view, graph visualization, chat panel, editor with spec boundaries. No paid service (Chromatic/Percy) needed initially — Playwright screenshots stored in the repo are sufficient. Run visual tests in CI on PRs that touch component or style files.

> **Q**: Should E2E tests cover the full frontend, or only critical paths (login, spec creation, graph navigation)?
> **A**: Critical paths only for MVP: login/logout, create and edit a spec, navigate the graph, chat with agent (send message, receive response), view version history, and perform a revert. Expand E2E coverage as features stabilize. Use Playwright for E2E tests, running against a test server with seeded data.

---

## Summary

### Task Count by Section

| Section                                  | Tasks                                |
| ---------------------------------------- | ------------------------------------ |
| 1. Application Shell & Entry Point       | 13 (FE-ARCH-001 through FE-ARCH-013) |
| 2. Routing Architecture                  | 17 (FE-ARCH-014 through FE-ARCH-030) |
| 3. State Management                      | 21 (FE-ARCH-031 through FE-ARCH-053) |
| 4. Module Organization                   | 7 (FE-ARCH-054 through FE-ARCH-060)  |
| 5. API Client Layer                      | 21 (FE-ARCH-061 through FE-ARCH-081) |
| 6. WebSocket Integration                 | 10 (FE-ARCH-082 through FE-ARCH-091) |
| 7. ESM Dynamic Import Strategy           | 9 (FE-ARCH-092 through FE-ARCH-100)  |
| 8. Error Boundary Strategy               | 9 (FE-ARCH-101 through FE-ARCH-109)  |
| 9. Performance Optimization              | 18 (FE-ARCH-110 through FE-ARCH-127) |
| 10. Accessibility                        | 15 (FE-ARCH-128 through FE-ARCH-142) |
| 11. Responsive Design Strategy           | 10 (FE-ARCH-143 through FE-ARCH-152) |
| 12. Dependency Injection & Service Layer | 6 (FE-ARCH-153 through FE-ARCH-158)  |
| 13. Feature Flags & Configuration        | 5 (FE-ARCH-159 through FE-ARCH-163)  |
| **TOTAL**                                | **161**                              |

### Dependencies (What This Plan Enables)

Completion of this plan unblocks:

- `02-FRONTEND/02-COMPONENTS-PLAN.md` — needs component tree, layout system, provider architecture
- `02-FRONTEND/03-STYLING-PLAN.md` — needs module organization, BEM conventions
- `02-FRONTEND/04-GENERATIVE-UI-PLAN.md` — needs ESM loader, iframe sandbox, WebSocket integration
- `02-FRONTEND/05-CHAT-DIALOG-PLAN.md` — needs WebSocket integration, chat store, layout
- `02-FRONTEND/06-SPEC-EDITOR-PLAN.md` — needs API client, specs store, routing
- `02-FRONTEND/07-KNOWLEDGE-GRAPH-UI-PLAN.md` — needs graph store, API client, layout
- `02-FRONTEND/08-VERSION-CONTROL-UI-PLAN.md` — needs version store, API client, routing

### Definition of Done

This plan is complete when:

- [ ] React app boots with all providers configured (including MobX `StoreProvider` with `RootStore`)
- [ ] Routes are defined and lazy-loaded with code splitting
- [ ] MobX stores are implemented as class-based stores with `makeObservable`, decorators, and strict action enforcement
- [ ] API client layer handles auth, errors, retries, and cancellation
- [ ] WebSocket connection establishes and routes events to MobX stores via `@action` methods
- [ ] Error boundaries catch and display errors at all levels
- [ ] Keyboard shortcuts are registered and functional
- [ ] Responsive breakpoints are defined and layout adapts
- [ ] Performance baselines are met (initial load < 3s, TTI < 5s)
- [ ] Accessibility audit passes with no critical issues
