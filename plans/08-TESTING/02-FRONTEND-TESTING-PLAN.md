# 08-TESTING / 02 — FRONTEND TESTING PLAN

> **Purpose**: Define the complete frontend testing strategy including component
> unit tests, hook tests, state management tests, API client mocking, WebSocket
> mock testing, snapshot tests, interaction tests, form validation tests,
> routing tests, accessibility tests, generative UI sandbox tests, and visual
> regression testing. Every component from the frontend plan should have test
> specifications.
>
> **Phase**: 2 (Core Systems) + 3 (Agent Integration) + 4 (Advanced Features)
> **Dependencies**: `02-FRONTEND/01-ARCHITECTURE-PLAN.md`, `08-TESTING/01-STRATEGY-PLAN.md`
> **Estimated tasks**: 190+

---

## Table of Contents

1. [Frontend Test Infrastructure](#1-frontend-test-infrastructure)
2. [Component Unit Testing](#2-component-unit-testing)
3. [Hook Testing](#3-hook-testing)
4. [State Management Testing](#4-state-management-testing)
5. [API Client & Service Testing](#5-api-client--service-testing)
6. [WebSocket Mock Testing](#6-websocket-mock-testing)
7. [Snapshot Testing](#7-snapshot-testing)
8. [Interaction Testing](#8-interaction-testing)
9. [Form Validation Testing](#9-form-validation-testing)
10. [Routing Tests](#10-routing-tests)
11. [Accessibility Testing](#11-accessibility-testing)
12. [Generative UI Sandbox Testing](#12-generative-ui-sandbox-testing)
13. [Visual Regression Testing](#13-visual-regression-testing)
14. [Component-Specific Tests — Design System](#14-component-specific-tests--design-system)
15. [Component-Specific Tests — Spec Editor](#15-component-specific-tests--spec-editor)
16. [Component-Specific Tests — Knowledge Graph UI](#16-component-specific-tests--knowledge-graph-ui)
17. [Component-Specific Tests — Chat Dialog](#17-component-specific-tests--chat-dialog)
18. [Component-Specific Tests — Version Control UI](#18-component-specific-tests--version-control-ui)
19. [Frontend E2E Tests](#19-frontend-e2e-tests)

---

## 1. Frontend Test Infrastructure

### 1.1 Test Environment Setup

- [ ] **TS-FE-001**: Configure DOM environment for client workspace
  - Install happy-dom (or jsdom based on strategy decision)
  - Create `client/ui/src/test/setup.ts` preload file
  - Register DOM globals: `window`, `document`, `navigator`, `localStorage`
  - Configure `TextEncoder`/`TextDecoder` polyfills if needed
- [ ] **TS-FE-002**: Configure `@testing-library/react` for bun test
  - Install `@testing-library/react`, `@testing-library/user-event`
  - Install `@testing-library/jest-dom` (verify bun matcher compatibility)
  - Create custom render function with default providers (theme, router, store)
- [ ] **TS-FE-003**: Create `client/ui/src/test/test-utils.tsx` — custom render wrapper
  - Wrap component in all required providers (Router, Store, Theme)
  - Accept provider override options
  - Re-export all `@testing-library/react` utilities
  - Export `renderWithProviders(component, options?)` as default render
- [ ] **TS-FE-004**: Create `client/ui/src/test/mock-providers.tsx`
  - `MockRouter` — wraps component in MemoryRouter with configurable initial route
  - `MockStoreProvider` — wraps component with pre-configured store state
  - `MockThemeProvider` — wraps component with theme context
  - `MockWebSocketProvider` — wraps component with mock WS context
- [ ] **TS-FE-005**: Create `client/ui/src/test/mock-api.ts` — API mock utilities
  - Mock fetch globally for all API calls
  - `mockApiResponse(endpoint, response, status?)` — register mock response
  - `mockApiError(endpoint, status, message)` — register mock error
  - `resetApiMocks()` — clear all registered mocks
  - Track all API calls for assertions: `getApiCalls(endpoint)`

### 1.2 Test Helpers

- [ ] **TS-FE-006**: Create common assertion helpers for frontend tests
  - `expectVisible(element)` — not display:none, not visibility:hidden
  - `expectHidden(element)` — opposite of expectVisible
  - `expectDisabled(element)` — checks disabled attribute and aria-disabled
  - `expectLoading(container)` — checks for loading spinner/skeleton
  - `expectError(container, message)` — checks for error display
- [ ] **TS-FE-007**: Create timer/animation test helpers
  - `waitForAnimation()` — waits for CSS transitions to complete
  - `advanceTimers(ms)` — advance fake timers
  - `waitForDebounce()` — advance timers past debounce threshold
- [ ] **TS-FE-008**: Create navigation test helpers
  - `navigateTo(path)` — simulates route navigation
  - `expectRoute(path)` — asserts current route
  - `getRouteParams()` — returns current route parameters

---

## 2. Component Unit Testing

### 2.1 Component Rendering Tests

- [ ] **TS-FE-009**: Define component unit test template
  - Every component test file follows the same structure
  - Tests: renders without crashing, renders correct content, renders correct class names
  - Tests: responds to prop changes, handles missing/optional props
  - Tests: accessibility (role, aria-label, tab index)
- [ ] **TS-FE-010**: Create test generator script for components
  - Input: component name
  - Output: test file with boilerplate describe/it blocks
  - Pre-populated with render test, prop tests, accessibility checks
- [ ] **TS-FE-011**: Define component test categories
  - **Render tests**: component renders correct DOM structure
  - **Prop tests**: component responds to different prop combinations
  - **State tests**: component internal state changes correctly
  - **Event tests**: component fires correct callbacks on user interaction
  - **Error tests**: component handles error states gracefully

### 2.2 Component Isolation

- [ ] **TS-FE-012**: Define child component mocking strategy
  - Mock complex child components to isolate parent behavior
  - Use `mock.module()` for heavy child components (graph canvas, editor)
  - Keep lightweight children real (buttons, icons, labels)
- [ ] **TS-FE-013**: Create component mock registry
  - `MockGraphTreeView` — simplified tree view component for parent tests
  - `MockSpecEditor` — simplified editor for parent tests
  - `MockChatPanel` — simplified chat for layout tests
  - Each mock accepts same props as real component, renders minimal DOM

---

## 3. Hook Testing

### 3.1 Custom Hook Test Infrastructure

- [ ] **TS-FE-014**: Create hook testing utility using `renderHook`
  - Import or create `renderHook` compatible with bun test + happy-dom
  - Support hooks that require providers (router, store, WS)
  - Return `result.current` for accessing hook return value
  - Support `rerender` for testing hook updates
- [ ] **TS-FE-015**: Create hook test wrapper with all providers
  - `renderHookWithProviders(hook, options?)` — wraps hook in all providers
  - Supports initial store state
  - Supports initial route

### 3.2 Hook-Specific Tests

- [ ] **TS-FE-016**: Test `useAuth` hook
  - Returns current user when authenticated
  - Returns null when not authenticated
  - `login()` updates user state and stores JWT
  - `logout()` clears user state and JWT
  - Handles expired JWT gracefully
- [ ] **TS-FE-017**: Test `useApi` / `useFetch` hook
  - Returns loading state during request
  - Returns data on successful response
  - Returns error on failed response
  - Caches responses based on key
  - Revalidates on key change
  - Supports abort on unmount
- [ ] **TS-FE-018**: Test `useWebSocket` hook
  - Connects to WebSocket on mount
  - Disconnects on unmount
  - Receives and parses messages
  - Sends messages with correct format
  - Handles reconnection on disconnect
  - Queues messages during disconnection
- [ ] **TS-FE-019**: Test `useDebounce` hook
  - Returns initial value immediately
  - Returns debounced value after delay
  - Resets timer on value change before delay
  - Uses correct delay duration
- [ ] **TS-FE-020**: Test `useSpecEditor` hook (if exists)
  - Loads spec content on mount
  - Saves content on debounced change
  - Tracks dirty state (unsaved changes)
  - Handles concurrent edit conflicts
- [ ] **TS-FE-021**: Test `useGraphNavigation` hook (if exists)
  - Provides zoom controls (zoom in, out, reset)
  - Provides pan controls
  - Centers on specific node
  - Tracks viewport state
- [ ] **TS-FE-022**: Test `useNotifications` hook
  - Fetches notifications on mount
  - Polls for new notifications
  - Marks notification as read
  - Returns unread count
- [ ] **TS-FE-023**: Test `useKeyboardShortcuts` hook
  - Registers keyboard listeners on mount
  - Removes listeners on unmount
  - Fires correct callback for each shortcut
  - Handles modifier keys (Ctrl, Shift, Alt)
  - Does not fire when input is focused (unless explicitly allowed)
- [ ] **TS-FE-024**: Test `useVersionHistory` hook (if exists)
  - Fetches version history for spec
  - Supports pagination (load more)
  - Provides diff between versions
  - Handles revert action

---

## 4. State Management Testing

### 4.1 Store Tests

- [ ] **TS-FE-025**: Test auth store
  - Initial state is unauthenticated
  - `setUser(user)` updates user state
  - `clearUser()` resets to unauthenticated
  - `setToken(jwt)` stores token
  - `isAuthenticated` computed property works correctly
- [ ] **TS-FE-026**: Test project store
  - Initial state has empty projects list
  - `setProjects(list)` updates project list
  - `selectProject(id)` sets active project
  - `updateProject(id, data)` modifies specific project
  - `removeProject(id)` removes from list
- [ ] **TS-FE-027**: Test spec store
  - Initial state has no specs loaded
  - `loadSpecs(projectId)` populates spec list
  - `addSpec(spec)` adds to list
  - `updateSpec(id, changes)` modifies specific spec
  - `deleteSpec(id)` removes from list
  - `getSpecById(id)` returns correct spec
- [ ] **TS-FE-028**: Test graph store
  - Initial state has empty graph
  - `loadGraph(data)` populates nodes and edges
  - `addNode(node)` adds to graph
  - `addEdge(edge)` adds to graph
  - `removeNode(id)` removes node and associated edges
  - `getNeighbors(nodeId)` returns connected nodes
- [ ] **TS-FE-029**: Test UI preferences store
  - Persists theme preference to localStorage
  - Persists panel sizes to localStorage
  - Restores preferences on load
  - Falls back to defaults when localStorage is empty
- [ ] **TS-FE-030**: Test chat store
  - Manages message list
  - Adds user messages
  - Adds assistant messages (including streaming)
  - Tracks typing/loading state
  - Clears messages on session change

### 4.2 Store Integration

- [ ] **TS-FE-031**: Test store interactions (cross-store effects)
  - Logging out clears all stores (auth, project, spec, graph)
  - Selecting a project loads its specs and graph
  - Deleting a spec updates graph store (remove node)
- [ ] **TS-FE-032**: Test store persistence and hydration
  - Stores save to localStorage/sessionStorage correctly
  - Stores hydrate from storage on app init
  - Handles corrupted storage data gracefully

---

## 5. API Client & Service Testing

### 5.1 API Client Tests

- [ ] **TS-FE-033**: Test API client base configuration
  - Sets correct base URL from environment
  - Includes auth token in headers
  - Sets Content-Type to application/json
  - Handles response parsing (JSON)
  - Handles non-JSON responses (text, blob)
- [ ] **TS-FE-034**: Test API client error handling
  - 400 → validation error with field details
  - 401 → triggers auth refresh or redirect to login
  - 403 → permission denied error
  - 404 → not found error
  - 500 → server error with message
  - Network error → connection error
  - Timeout → timeout error
- [ ] **TS-FE-035**: Test API client retry logic
  - Retries on 5xx errors (configurable count)
  - Does not retry on 4xx errors
  - Exponential backoff between retries
  - Respects max retry limit
- [ ] **TS-FE-036**: Test API client request/response interceptors
  - Request interceptor adds JWT header
  - Response interceptor handles token refresh
  - Response interceptor extracts pagination headers

### 5.2 Service Layer Tests

- [ ] **TS-FE-037**: Test AuthService
  - `login(email, password)` sends POST, returns user + token
  - `register(data)` sends POST, returns user
  - `logout()` sends POST, clears local state
  - `refreshToken()` sends POST, updates stored token
  - `getCurrentUser()` sends GET, returns user profile
- [ ] **TS-FE-038**: Test ProjectService
  - `listProjects()` sends GET, returns paginated projects
  - `getProject(id)` sends GET, returns project with members
  - `createProject(data)` sends POST, returns new project
  - `updateProject(id, data)` sends PATCH, returns updated project
  - `deleteProject(id)` sends DELETE
  - `addMember(projectId, userId, role)` sends POST
- [ ] **TS-FE-039**: Test SpecService
  - `listSpecs(projectId)` sends GET, returns specs
  - `getSpec(projectId, specId)` sends GET, returns spec content
  - `createSpec(projectId, data)` sends POST
  - `updateSpec(projectId, specId, data)` sends PATCH
  - `deleteSpec(projectId, specId)` sends DELETE
- [ ] **TS-FE-040**: Test GraphService
  - `getGraph(projectId)` sends GET, returns nodes + edges
  - `getSubgraph(projectId, nodeId, depth)` sends GET
  - `createEdge(projectId, data)` sends POST
  - `deleteEdge(projectId, edgeId)` sends DELETE
  - `getNeighbors(projectId, nodeId)` sends GET
- [ ] **TS-FE-041**: Test AgentService
  - `startSession(projectId, type)` sends POST, returns session
  - `sendMessage(sessionId, content)` sends POST, returns response
  - `endSession(sessionId)` sends POST
  - `getSessionHistory(sessionId)` sends GET, returns messages
- [ ] **TS-FE-042**: Test VersionService
  - `getHistory(projectId, specId)` sends GET, returns versions
  - `getDiff(projectId, specId, fromHash, toHash)` sends GET
  - `revert(projectId, specId, toHash)` sends POST
  - `getBranches(projectId)` sends GET
  - `createBranch(projectId, name)` sends POST
  - `switchBranch(projectId, branchName)` sends POST
- [ ] **TS-FE-043**: Test NotificationService
  - `getNotifications()` sends GET, returns paginated list
  - `getUnreadCount()` sends GET, returns count
  - `markAsRead(id)` sends PATCH
  - `dismissAll()` sends POST

---

## 6. WebSocket Mock Testing

### 6.1 WebSocket Client Tests

- [ ] **TS-FE-044**: Test WebSocket connection lifecycle
  - Connects to correct URL with auth token
  - Handles connection open event
  - Handles connection close event
  - Handles connection error event
  - Reconnects with exponential backoff on disconnect
- [ ] **TS-FE-045**: Test WebSocket message handling
  - Parses incoming JSON messages
  - Dispatches messages to correct handlers based on type
  - Handles malformed messages gracefully (logs error, does not crash)
  - Handles unknown message types (ignores with warning)
- [ ] **TS-FE-046**: Test WebSocket agent status messages
  - `agent:thinking` → updates UI to show thinking state
  - `agent:streaming` → streams content to chat panel
  - `agent:complete` → finalizes response and updates session
  - `agent:error` → shows error in chat panel
  - `agent:tool_call` → shows tool execution indicator
- [ ] **TS-FE-047**: Test WebSocket sync notifications
  - `sync:remote_changes` → shows "new changes available" indicator
  - `sync:conflict` → shows conflict notification
  - `sync:resolved` → clears conflict indicator
- [ ] **TS-FE-048**: Test WebSocket notification delivery
  - `notification:new` → increments unread badge
  - `notification:read` → decrements unread badge
  - Handles notification payload rendering

### 6.2 WebSocket Reconnection

- [ ] **TS-FE-049**: Test reconnection behavior
  - Reconnects after unexpected disconnect
  - Exponential backoff: 1s, 2s, 4s, 8s, 16s, 30s (max)
  - Queues messages during disconnection
  - Sends queued messages after reconnection
  - Emits reconnection events for UI feedback
- [ ] **TS-FE-050**: Test connection state management
  - Exposes connection state: connecting, connected, disconnected, reconnecting
  - UI responds to connection state changes
  - Shows connection status indicator

---

## 7. Snapshot Testing

### 7.1 Component Snapshots

- [ ] **TS-FE-051**: Create snapshot tests for atomic/leaf components
  - Button variants (primary, secondary, danger, ghost)
  - Input variants (text, password, textarea, select)
  - Badge variants (status, count, label)
  - Icon component with different icons
  - Avatar component with image and fallback
  - Tooltip component
  - Modal component (open state)
- [ ] **TS-FE-052**: Create snapshot tests for layout components
  - Sidebar (expanded and collapsed)
  - Header (authenticated and unauthenticated)
  - Panel layout (with and without sidebar)
  - Responsive breakpoint layouts
- [ ] **TS-FE-053**: Create snapshot tests for data display components
  - Project card
  - Spec list item
  - Agent message bubble (user and assistant)
  - Notification item (read and unread)
  - Version timeline entry

### 7.2 Snapshot Management

- [ ] **TS-FE-054**: Configure snapshot serializer for cleaner diffs
  - Remove dynamic attributes (data-testid, random keys)
  - Normalize class name order
  - Pretty-print HTML for readable diffs
- [ ] **TS-FE-055**: Create snapshot update workflow
  - Developer updates snapshot: `bun test --update-snapshots`
  - PR shows snapshot diff for review
  - Reviewer verifies snapshot changes are intentional

---

## 8. Interaction Testing

### 8.1 Click Interactions

- [ ] **TS-FE-056**: Test button click handlers
  - Primary action buttons fire onClick
  - Disabled buttons do not fire onClick
  - Loading buttons do not fire onClick
  - Double-click prevention (if applicable)
- [ ] **TS-FE-057**: Test navigation link clicks
  - Internal links navigate via router (no page reload)
  - External links open in new tab
  - Links with confirmation prompt show dialog
- [ ] **TS-FE-058**: Test context menu interactions
  - Right-click shows context menu
  - Menu items fire correct actions
  - Click outside closes menu
  - Escape key closes menu

### 8.2 Keyboard Interactions

- [ ] **TS-FE-059**: Test keyboard shortcuts
  - `Ctrl+K` / `Cmd+K` opens command palette
  - `Ctrl+S` / `Cmd+S` saves current spec
  - `Escape` closes modals and panels
  - `Ctrl+/` opens chat panel (per PRD)
  - `Enter` submits chat message
  - Arrow keys navigate in lists
  - Tab key moves focus correctly
- [ ] **TS-FE-060**: Test keyboard navigation in lists
  - Arrow up/down moves selection
  - Enter activates selected item
  - Home/End moves to first/last item
  - Type-ahead filters list

### 8.3 Drag & Drop Interactions

- [ ] **TS-FE-061**: Test drag and drop operations
  - Drag spec to reorder within document
  - Drag node in graph to reposition
  - Drag panel resize handles
  - Visual feedback during drag (ghost element, drop targets)
  - Cancel drag with Escape key
- [ ] **TS-FE-062**: Test drag and drop accessibility
  - Keyboard alternative for all drag operations
  - Screen reader announcements for drag state

### 8.4 Scroll Interactions

- [ ] **TS-FE-063**: Test infinite scroll / pagination
  - Loads more items when scrolling to bottom
  - Shows loading indicator during fetch
  - Stops loading when all items are loaded
  - Maintains scroll position after content load
- [ ] **TS-FE-064**: Test scroll-to-element behavior
  - Clicking notification scrolls to relevant spec
  - Graph navigation scrolls to centered node
  - Version diff navigation scrolls to change

---

## 9. Form Validation Testing

### 9.1 Login Form

- [ ] **TS-FE-065**: Test login form validation
  - Email required — shows error when empty
  - Email format — shows error for invalid email
  - Password required — shows error when empty
  - Password minimum length — shows error for short password
  - Submit disabled when form is invalid
  - Submit enabled when form is valid
  - Server error displayed on 401 response
  - Loading state during submission

### 9.2 Registration Form

- [ ] **TS-FE-066**: Test registration form validation
  - All required fields (email, username, password, display name)
  - Email format validation
  - Username format validation (alphanumeric, 3-50 chars)
  - Password strength validation (min length, complexity)
  - Password confirmation match
  - Username availability check (async validation)
  - Email availability check (async validation)
  - Server error handling (duplicate email, duplicate username)

### 9.3 Project Form

- [ ] **TS-FE-067**: Test project creation form validation
  - Name required, 1-100 characters
  - Name format (alphanumeric + spaces + hyphens)
  - Description optional, max length
  - Git remote URL format validation (if provided)
  - Duplicate project name warning

### 9.4 Spec Editor Forms

- [ ] **TS-FE-068**: Test spec metadata form
  - Title required, non-empty
  - Tags validation (max count, format)
  - Permission level selection
  - Summary text required when permission is "summary"
- [ ] **TS-FE-069**: Test edge creation form
  - Source spec required
  - Target spec required
  - Edge type selection from allowed types
  - Duplicate edge prevention
  - Self-referencing edge prevention

### 9.5 Share Form

- [ ] **TS-FE-070**: Test permission share form
  - User search and selection
  - Access level selection (full, summary)
  - Cannot share with self
  - Cannot share with existing shareholder (unless revoked)
  - Confirmation before sharing

---

## 10. Routing Tests

### 10.1 Route Configuration

- [ ] **TS-FE-071**: Test route definitions
  - All expected routes are registered
  - Routes render correct components
  - Nested routes resolve correctly
  - Catch-all route renders 404 page
- [ ] **TS-FE-072**: Test route parameters
  - `/projects/:projectId` extracts projectId
  - `/projects/:projectId/specs/:specId` extracts both params
  - Invalid params show error or redirect

### 10.2 Route Guards

- [ ] **TS-FE-073**: Test authentication guards
  - Unauthenticated user redirected to login
  - Authenticated user can access protected routes
  - Login page redirects to dashboard if already authenticated
  - After login, redirect to original intended route
- [ ] **TS-FE-074**: Test authorization guards
  - User without project access redirected to project list
  - User with viewer role cannot access edit routes
  - Admin routes only accessible to admin users

### 10.3 Route Transitions

- [ ] **TS-FE-075**: Test route transition behavior
  - Navigation triggers data loading for new route
  - Loading indicator shows during route data fetch
  - Previous route data cleared on navigation
  - Browser back/forward works correctly
  - Route changes update document title

---

## 11. Accessibility Testing

### 11.1 Component-Level Accessibility

- [ ] **TS-FE-076**: Test ARIA attributes on all interactive components
  - Buttons have `aria-label` or visible text
  - Inputs have `aria-label` or `<label>` association
  - Modals have `aria-modal`, `role="dialog"`, and label
  - Alerts have `role="alert"`
  - Loading states have `aria-busy`
  - Error messages have `aria-invalid` and `aria-describedby`
- [ ] **TS-FE-077**: Test focus management
  - Modal traps focus (Tab cycles within modal)
  - Modal returns focus to trigger on close
  - Dropdown menu focuses first item on open
  - Dropdown returns focus to trigger on close
  - Page navigation moves focus to main content
- [ ] **TS-FE-078**: Test color contrast
  - All text meets WCAG AA contrast ratio (4.5:1)
  - All interactive elements meet contrast requirements
  - Dark mode maintains contrast ratios

### 11.2 Screen Reader Testing

- [ ] **TS-FE-079**: Test live regions for dynamic content
  - Agent streaming response uses `aria-live="polite"`
  - Error notifications use `aria-live="assertive"`
  - Notification badge updates announced to screen readers
  - Loading state transitions announced
- [ ] **TS-FE-080**: Test heading hierarchy
  - Page has exactly one h1
  - Headings are sequential (no skipped levels)
  - Each section has appropriate heading level

---

## 12. Generative UI Sandbox Testing

### 12.1 Sandbox Security Tests

- [ ] **TS-FE-081**: Test iframe sandbox attributes
  - `sandbox` attribute includes: `allow-scripts`
  - `sandbox` attribute does NOT include: `allow-same-origin`, `allow-top-navigation`
  - `sandbox` attribute does NOT include: `allow-forms` (unless explicitly needed)
  - CSP headers prevent external resource loading
- [ ] **TS-FE-082**: Test iframe communication
  - `postMessage` sends data to iframe with correct origin
  - Iframe responses are received and parsed
  - Messages from unexpected origins are rejected
  - Message schema validation (malformed messages ignored)
- [ ] **TS-FE-083**: Test iframe lifecycle
  - Iframe loads gen-UI bundle from correct path
  - Loading state shown while iframe loads
  - Error state shown when iframe fails to load
  - Iframe is destroyed when navigating away
  - Multiple iframes can coexist (different gen-UI projects)

### 12.2 Gen-UI Content Tests

- [ ] **TS-FE-084**: Test gen-UI registry display
  - Lists all generated UIs for current project
  - Shows build status (pending, building, ready, failed)
  - Shows associated specs for each gen-UI
  - Allows opening gen-UI in sandbox
- [ ] **TS-FE-085**: Test gen-UI parameter passing
  - Parameters from registry are passed to iframe
  - Iframe receives and applies parameters
  - Parameter changes trigger iframe reload

---

## 13. Visual Regression Testing

### 13.1 Visual Testing Infrastructure

- [ ] **TS-FE-086**: Evaluate visual regression testing approach
  - Screenshot comparison (Playwright screenshots, Percy, Chromatic)
  - CSS regression detection
  - Document chosen approach with rationale
- [ ] **TS-FE-087**: Configure visual regression testing tool
  - Install and configure chosen tool
  - Define viewport sizes for testing: mobile (375px), tablet (768px), desktop (1440px)
  - Configure acceptable diff threshold (e.g., 0.1% pixel difference)
  - Configure baseline screenshot storage

### 13.2 Visual Test Coverage

- [ ] **TS-FE-088**: Create visual regression tests for critical pages
  - Login page
  - Registration page
  - Dashboard / project list
  - Project detail / spec editor
  - Knowledge graph view
  - Chat dialog (with messages)
  - Version diff view
- [ ] **TS-FE-089**: Create visual regression tests for component states
  - Button states: default, hover, active, disabled, loading
  - Input states: default, focused, error, disabled
  - Modal: open with content, scrollable content
  - Toast notifications: success, error, warning, info
- [ ] **TS-FE-090**: Create visual regression tests for dark mode
  - All critical pages in dark mode
  - All component states in dark mode
  - Compare light mode vs dark mode for consistency

---

## 14. Component-Specific Tests — Design System

### 14.1 Atomic Components

- [ ] **TS-FE-091**: Test `Button` component
  - Renders with correct variant class (primary, secondary, danger, ghost)
  - Renders with correct size class (small, medium, large)
  - Shows loading spinner when `isLoading` is true
  - Disables when `disabled` prop is true
  - Fires `onClick` when clicked (and not disabled/loading)
  - Renders as `<a>` when `href` prop is provided
  - Renders icon when `icon` prop is provided
- [ ] **TS-FE-092**: Test `Input` component
  - Renders text input by default
  - Renders with label when provided
  - Shows error message when `error` prop is set
  - Shows helper text when `helperText` prop is set
  - Fires `onChange` on input
  - Supports `type` variants: text, password, email, number
  - Shows character count when `maxLength` is set
- [ ] **TS-FE-093**: Test `Select` component
  - Renders options from `options` prop
  - Shows placeholder when no value selected
  - Fires `onChange` when option selected
  - Supports disabled options
  - Supports grouped options
  - Keyboard navigation (arrow keys, Enter, Escape)
- [ ] **TS-FE-094**: Test `Modal` component
  - Opens when `isOpen` is true
  - Closes when backdrop clicked (if `closeOnBackdropClick`)
  - Closes when Escape pressed (if `closeOnEscape`)
  - Traps focus within modal
  - Returns focus to trigger on close
  - Renders title, body, and footer sections
  - Renders close button
- [ ] **TS-FE-095**: Test `Toast` / notification component
  - Renders with correct variant (success, error, warning, info)
  - Auto-dismisses after timeout (if configured)
  - Shows dismiss button
  - Supports stacking multiple toasts
  - Accessible: `role="alert"` for errors
- [ ] **TS-FE-096**: Test `Tooltip` component
  - Shows on hover (after delay)
  - Shows on focus
  - Hides on blur/mouse leave
  - Positions correctly (top, bottom, left, right)
  - Does not overflow viewport (repositions)
- [ ] **TS-FE-097**: Test `Badge` component
  - Renders with correct variant
  - Truncates long text with ellipsis
  - Shows count number
  - Supports removable (with X button)
- [ ] **TS-FE-098**: Test `Avatar` component
  - Renders image when `src` is provided
  - Shows initials fallback when image fails to load
  - Shows placeholder when no `src` or `name`
  - Supports size variants
- [ ] **TS-FE-099**: Test `Spinner` / `Skeleton` loading components
  - Spinner renders with correct size
  - Skeleton renders with correct shape and size
  - Both have `aria-busy="true"` and screen reader text
- [ ] **TS-FE-100**: Test `Tabs` component
  - Renders all tab labels
  - Shows active tab content
  - Switches tab on click
  - Keyboard: Arrow keys switch between tabs
  - Keyboard: Enter/Space activates tab
  - `aria-selected` on active tab
  - `role="tablist"`, `role="tab"`, `role="tabpanel"`

### 14.2 Layout Components

- [ ] **TS-FE-101**: Test `Sidebar` component
  - Renders navigation items
  - Highlights active item based on current route
  - Collapses/expands on toggle
  - Persists collapsed state to preferences
  - Shows icons and labels (labels hidden when collapsed)
- [ ] **TS-FE-102**: Test `Header` component
  - Shows project name and breadcrumbs
  - Shows user avatar and menu
  - Shows notification badge with unread count
  - Renders search bar
  - Responsive: collapses to hamburger on mobile
- [ ] **TS-FE-103**: Test `ResizablePanel` component
  - Renders with initial size
  - Resize handle responds to drag
  - Respects min and max size constraints
  - Fires `onResize` callback
  - Persists size to preferences
- [ ] **TS-FE-104**: Test `SplitPane` component
  - Renders two panes with divider
  - Divider is draggable for resizing
  - Supports horizontal and vertical split
  - One pane can be collapsed

---

## 15. Component-Specific Tests — Spec Editor

### 15.1 Editor Core

- [ ] **TS-FE-105**: Test `SpecEditor` main component
  - Renders markdown content
  - Enters edit mode on click/focus
  - Shows toolbar in edit mode
  - Saves content on Ctrl+S
  - Auto-saves after debounce period
  - Shows dirty indicator for unsaved changes
  - Shows word count / character count
- [ ] **TS-FE-106**: Test spec editor toolbar
  - Bold button wraps selection with `**`
  - Italic button wraps selection with `_`
  - Heading buttons insert heading prefix
  - Link button shows URL input dialog
  - Code button wraps with backticks
  - List buttons insert list markers
  - Undo/redo buttons work correctly
- [ ] **TS-FE-107**: Test spec boundary visualization
  - Shows spec boundaries within document
  - Spec header shows spec title
  - Spec can be expanded/collapsed
  - Clicking spec header selects the spec
  - Spec boundary styling distinguishes specs visually

### 15.2 Editor Features

- [ ] **TS-FE-108**: Test spec editor inline agent assistance
  - Selecting text shows "Ask agent" option
  - Agent suggestion appears inline
  - User can accept or reject suggestion
  - Agent suggestion does not modify content until accepted
- [ ] **TS-FE-109**: Test spec editor tag management
  - Displays spec tags below content
  - Add tag: shows autocomplete dropdown
  - Remove tag: click X on tag
  - Tag changes trigger save
- [ ] **TS-FE-110**: Test spec editor link/reference handling
  - Recognizes `[[spec-id]]` syntax
  - Renders linked spec name
  - Click navigates to linked spec
  - Hover shows preview tooltip
  - Broken links shown with warning style

---

## 16. Component-Specific Tests — Knowledge Graph UI

### 16.1 Graph Rendering

- [ ] **TS-FE-111**: Test `GraphTreeView` component
  - Renders NodeCard elements in BFS depth-level rows
  - Applies BFS layout algorithm from primary node on initial render
  - Handles empty graph (no nodes, no edges)
  - Handles large graph (100+ nodes) without crash (virtual scrolling)
  - Rows are virtualized via @tanstack/virtual
- [ ] **TS-FE-112**: Test `NodeCard` rendering
  - Cards display spec title and agent-generated summary
  - Card color/styling reflects spec type or status
  - Selected card has highlight ring
  - Hover shows card detail tooltip
  - Click expands card to full-screen ExpandedDocView
- [ ] **TS-FE-113**: Test `TreeRow` rendering
  - Rows contain correct NodeCards at each depth level
  - Connection lines link parent cards to child cards
  - Row merging works correctly for the custom layout algorithm
  - Rows are horizontally scrollable when they overflow

### 16.2 Graph Interactions

- [ ] **TS-FE-114**: Test tree scrolling and navigation
  - Two-finger vertical scroll navigates depth levels
  - Two-finger horizontal scroll navigates within rows
  - Virtual scrolling only renders visible rows
  - Scroll position persists across re-renders
- [ ] **TS-FE-115**: Test node card selection and expansion
  - Click card selects it and shows ResourcePanel
  - ResourcePanel shows spec content, tags, edges
  - Click card expands to ExpandedDocView with full content
  - ConnectedNodesBar shows connected specs as horizontal cards
  - BreadcrumbTrail tracks navigation path through expanded cards
- [ ] **TS-FE-116**: Test graph filtering
  - Filter by spec type
  - Filter by tag
  - Filter by edge type
  - Search filter by spec title/content
  - Filtered-out nodes are hidden or dimmed
- [ ] **TS-FE-117**: Test tree layout algorithm
  - BFS from primary node produces correct depth-level rows
  - Leaf-based primary selection chooses correct primary node
  - Row merging combines sparse levels correctly
  - Layout is deterministic (same input produces same output)

### 16.3 Graph Edge Operations

- [ ] **TS-FE-118**: Test edge creation from UI
  - Drag from node handle to another node creates edge
  - Edge type selector appears after drag
  - Cancel drag does not create edge
  - Cannot create duplicate edges
  - Cannot create self-referencing edges
- [ ] **TS-FE-119**: Test edge deletion from UI
  - Select edge, press Delete or use context menu
  - Confirmation dialog before deletion
  - Edge removed from graph after confirmation

---

## 17. Component-Specific Tests — Chat Dialog

### 17.1 Chat Panel

- [ ] **TS-FE-120**: Test `ChatPanel` component
  - Renders always-visible panel (per PRD)
  - Opens/closes with keyboard shortcut (Ctrl+/)
  - Toggleable with button click
  - Shows message history
  - Auto-scrolls to newest message
  - Shows typing indicator when agent is responding
- [ ] **TS-FE-121**: Test chat message rendering
  - User messages align right with user avatar
  - Assistant messages align left with agent avatar
  - Messages render markdown content
  - Messages render code blocks with syntax highlighting
  - Messages render spec links as clickable chips
  - Messages render graph references with preview
- [ ] **TS-FE-122**: Test chat message streaming
  - Streaming message shows incrementally
  - Cursor/blinking indicator during stream
  - Message finalizes when stream completes
  - Scroll follows streaming content

### 17.2 Chat Input

- [ ] **TS-FE-123**: Test chat input field
  - Multiline input (textarea, not single-line)
  - Enter sends message (Shift+Enter for newline)
  - Cannot send empty message
  - Input clears after send
  - Shows character count (if limited)
  - Supports paste (including code)
- [ ] **TS-FE-124**: Test chat context indicators
  - Shows current project context
  - Shows current spec context (if editing a spec)
  - Shows selected graph nodes context
  - Context chips are removable
- [ ] **TS-FE-125**: Test chat command support (if applicable)
  - `/help` shows command list
  - `/clear` clears chat history
  - `/context` shows current context
  - Unknown commands show error

### 17.3 Chat Session Management

- [ ] **TS-FE-126**: Test chat session lifecycle
  - New session starts when user sends first message
  - Session continues across navigation within project
  - Session ends when explicitly closed or project changes
  - Session history is loadable from history list
- [ ] **TS-FE-127**: Test chat session list
  - Shows recent sessions with preview
  - Click loads session history
  - Delete removes session
  - Active session highlighted

---

## 18. Component-Specific Tests — Version Control UI

### 18.1 Diff View

- [ ] **TS-FE-128**: Test `DiffView` component
  - Renders unified diff with light indications (per PRD)
  - Added text has subtle green background
  - Removed text has subtle red background with strikethrough
  - Unchanged text has no decoration
  - Word-level diff highlights individual changed words
- [ ] **TS-FE-129**: Test diff navigation
  - "Next change" / "Previous change" buttons work
  - Change counter shows "Change 3 of 12"
  - Keyboard shortcuts for change navigation
  - Scrolls to highlighted change
- [ ] **TS-FE-130**: Test diff mode switching
  - Light mode (default): subtle indications
  - Detailed mode: more prominent highlighting
  - Side-by-side mode: two-column view
  - Mode persists in preferences

### 18.2 Version Timeline

- [ ] **TS-FE-131**: Test `VersionTimeline` component
  - Renders version entries chronologically
  - Shows commit hash, author, timestamp, summary
  - Current version highlighted
  - Click version loads diff against current
  - Pagination/infinite scroll for long histories
- [ ] **TS-FE-132**: Test version comparison
  - Select two versions to compare
  - Diff shows between selected versions
  - Clear selection resets to current vs. previous
- [ ] **TS-FE-133**: Test revert flow
  - "Revert to this version" button on timeline entry
  - Confirmation dialog shows what will change
  - After revert, timeline shows new entry (revert commit)
  - Editor content updates to reverted version

### 18.3 Branch Management

- [ ] **TS-FE-134**: Test branch list display
  - Shows all branches with active branch highlighted
  - Shows branch creation date and last commit
  - Filter/search branches by name
- [ ] **TS-FE-135**: Test branch switching
  - Click branch switches to it
  - Confirmation if unsaved changes exist
  - Editor and graph update to branch content
  - URL updates to reflect branch
- [ ] **TS-FE-136**: Test branch creation
  - "New branch" shows name input
  - Branch name validation (no spaces, valid git branch name)
  - Creates branch from current HEAD
  - Switches to new branch after creation
- [ ] **TS-FE-137**: Test merge interface
  - Shows source and target branch
  - Shows diff between branches
  - Merge button triggers merge
  - Conflict indicator if merge has conflicts
  - After successful merge, redirects to target branch

---

## 19. Frontend E2E Tests

### 19.1 Authentication Flows

- [ ] **TS-FE-138**: E2E: User registration
  - Navigate to register page
  - Fill in registration form
  - Submit and verify redirect to dashboard
  - Verify welcome notification
- [ ] **TS-FE-139**: E2E: User login
  - Navigate to login page
  - Enter valid credentials
  - Submit and verify redirect to dashboard
  - Verify user name shown in header
- [ ] **TS-FE-140**: E2E: Invalid login
  - Enter wrong password
  - Verify error message displayed
  - Verify still on login page
- [ ] **TS-FE-141**: E2E: Logout
  - Click user menu → Logout
  - Verify redirect to login page
  - Verify cannot access protected routes

### 19.2 Project Management Flows

- [ ] **TS-FE-142**: E2E: Create project
  - Click "New Project" button
  - Fill in project name and description
  - Submit and verify project appears in list
  - Navigate to project and verify empty state
- [ ] **TS-FE-143**: E2E: Edit project settings
  - Navigate to project settings
  - Change project name
  - Save and verify name updated in header
- [ ] **TS-FE-144**: E2E: Add project member
  - Navigate to project settings → Members
  - Search for user and add as editor
  - Verify member appears in member list

### 19.3 Spec Editor Flows

- [ ] **TS-FE-145**: E2E: Create and edit spec
  - Open project
  - Create new spec document
  - Type content in editor
  - Verify auto-save triggers
  - Navigate away and return — content persisted
- [ ] **TS-FE-146**: E2E: Spec metadata editing
  - Open spec
  - Add tags
  - Change permission level
  - Verify changes saved
- [ ] **TS-FE-147**: E2E: Spec linking
  - Create two specs
  - Add link from one to another
  - Verify link appears in graph
  - Click link navigates to target spec

### 19.4 Knowledge Graph Flows

- [ ] **TS-FE-148**: E2E: Graph visualization
  - Navigate to graph view
  - Verify nodes appear for all specs
  - Verify edges appear for all relationships
  - Zoom in/out works
  - Pan works
- [ ] **TS-FE-149**: E2E: Graph node interaction
  - Click node → verify detail panel opens
  - Double-click node → verify navigation to spec editor
  - Right-click node → verify context menu
- [ ] **TS-FE-150**: E2E: Edge creation via graph
  - Drag from one node to another
  - Select edge type in dialog
  - Verify edge appears in graph

### 19.5 Chat & Agent Flows

- [ ] **TS-FE-151**: E2E: Open chat and send message
  - Open chat panel with Ctrl+/
  - Type message and press Enter
  - Verify message appears in chat
  - Verify agent response appears (mocked)
- [ ] **TS-FE-152**: E2E: Chat with spec context
  - Select a spec in editor
  - Open chat
  - Verify spec context shown in chat input
  - Send question about spec
  - Verify response references spec

### 19.6 Version Control Flows

- [ ] **TS-FE-153**: E2E: View version history
  - Edit a spec and save
  - Open version history
  - Verify new version appears
  - Click previous version → verify diff shown
- [ ] **TS-FE-154**: E2E: Revert spec
  - View version history
  - Click "Revert to this version"
  - Confirm revert
  - Verify content matches old version
  - Verify new revert commit in history

---

## Summary

### Task Count by Section

| Section | Tasks |
|---------|-------|
| 1. Frontend Test Infrastructure | 8 (TS-FE-001 through TS-FE-008) |
| 2. Component Unit Testing | 5 (TS-FE-009 through TS-FE-013) |
| 3. Hook Testing | 11 (TS-FE-014 through TS-FE-024) |
| 4. State Management Testing | 8 (TS-FE-025 through TS-FE-032) |
| 5. API Client & Service Testing | 11 (TS-FE-033 through TS-FE-043) |
| 6. WebSocket Mock Testing | 7 (TS-FE-044 through TS-FE-050) |
| 7. Snapshot Testing | 5 (TS-FE-051 through TS-FE-055) |
| 8. Interaction Testing | 9 (TS-FE-056 through TS-FE-064) |
| 9. Form Validation Testing | 6 (TS-FE-065 through TS-FE-070) |
| 10. Routing Tests | 5 (TS-FE-071 through TS-FE-075) |
| 11. Accessibility Testing | 5 (TS-FE-076 through TS-FE-080) |
| 12. Generative UI Sandbox Testing | 5 (TS-FE-081 through TS-FE-085) |
| 13. Visual Regression Testing | 5 (TS-FE-086 through TS-FE-090) |
| 14. Design System Component Tests | 14 (TS-FE-091 through TS-FE-104) |
| 15. Spec Editor Tests | 6 (TS-FE-105 through TS-FE-110) |
| 16. Knowledge Graph UI Tests | 9 (TS-FE-111 through TS-FE-119) |
| 17. Chat Dialog Tests | 8 (TS-FE-120 through TS-FE-127) |
| 18. Version Control UI Tests | 10 (TS-FE-128 through TS-FE-137) |
| 19. Frontend E2E Tests | 17 (TS-FE-138 through TS-FE-154) |
| **TOTAL** | **158** |

### Dependencies (What This Plan Enables)

Completion of this plan provides:
- Full test coverage for all frontend components and features
- Confidence in refactoring frontend code
- Regression detection for UI changes
- Accessibility compliance verification

### Definition of Done

This plan is complete when:
- [ ] Every React component has at least a render test and prop test
- [ ] Every custom hook has tests for all return values and state transitions
- [ ] Every store has tests for all actions and selectors
- [ ] Every API service has tests for all methods with mocked responses
- [ ] WebSocket message handling is tested for all message types
- [ ] All forms have validation tests covering all fields
- [ ] Critical user journeys have E2E tests
- [ ] Accessibility scan passes with zero violations
- [ ] Frontend test coverage meets targets (80%+ line coverage)
