# 02-FRONTEND / 04 — GENERATIVE UI PLAN

> **Purpose**: Define the complete architecture for ESM-based dynamically loaded
> generative UI projects, including iframe sandboxing, host-iframe communication,
> build pipeline, security constraints, agent integration, and file storage.
>
> **Phase**: 4 (Advanced Features)
> **Dependencies**: `02-FRONTEND/01-ARCHITECTURE-PLAN.md`, `03-SERVER/04-AGENT-ORCHESTRATION-PLAN.md`, `06-AGENT-SYSTEM/03-MCP-SERVERS-PLAN.md`
> **Estimated tasks**: 130+

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Gen UI Project Template](#2-gen-ui-project-template)
3. [Build Pipeline](#3-build-pipeline)
4. [ESM Dynamic Loading](#4-esm-dynamic-loading)
5. [Iframe Sandbox Implementation](#5-iframe-sandbox-implementation)
6. [Host-Iframe Communication Protocol](#6-host-iframe-communication-protocol)
7. [Security Constraints](#7-security-constraints)
8. [Agent Integration](#8-agent-integration)
9. [Gen UI Registry & Management](#9-gen-ui-registry--management)
10. [File Storage & Structure](#10-file-storage--structure)
11. [Gen UI Types & Use Cases](#11-gen-ui-types--use-cases)
12. [Error Handling & Recovery](#12-error-handling--recovery)

---

## 1. Architecture Overview

### 1.1 System Design

- [ ] **FE-GEN-001**: Document the generative UI architecture
  - Agent generates a small React project in `client/gen/{user}/{project}/`
  - Project is built with Vite to produce a `dist/` folder
  - Host app loads the built `dist/index.html` in a sandboxed `<iframe>`
  - Host and iframe communicate via `postMessage` protocol
  - Gen UI can send data back to the agent via the host app's WebSocket
- [ ] **FE-GEN-002**: Define the gen UI lifecycle
  1. Agent determines a gen UI is needed (or user requests one)
  2. Agent generates project files in `client/gen/{user}/{project}/`
  3. Build system compiles the project to `dist/`
  4. Host app is notified the gen UI is ready
  5. User opens the gen UI (in chat, panel, or dedicated view)
  6. Iframe loads `dist/index.html`
  7. Host sends context data to iframe via `postMessage`
  8. User interacts with the gen UI
  9. Gen UI sends interaction results back to host
  10. Host forwards results to agent
  11. Agent processes results and updates specs/graph
- [ ] **FE-GEN-003**: Define gen UI categories
  - **Static readout**: Display-only UI showing knowledge graph data (e.g., visualization of spec relationships)
  - **Example prototype**: Static example of a proposed UI (e.g., "show me what the login page would look like")
  - **Input form**: Interactive UI for capturing structured input to generate specs (e.g., "help me describe an animation")
  - **Custom tool**: Agent-built tool for specific workflow assistance

#### Design Decisions

> **Q**: Should gen UI projects be loaded as pre-built static files in an iframe, or should the host app load ESM modules directly (without an iframe)? The iframe approach provides stronger isolation but adds complexity.
> **A**: Pre-built static files in an iframe. The iframe boundary provides essential security isolation — agent-generated code must not have access to the host app's DOM, state, or cookies. The `dist/index.html` of each gen UI project is loaded as the iframe `src`. All communication goes through `postMessage`. This is non-negotiable for security.

> **Q**: Should gen UI projects use Vite's dev server during development (for HMR), or always use the built `dist/` output? Dev server would improve the agent's development cycle but adds infrastructure.
> **A**: Always use the built `dist/` output. The agent generates code, the server builds it, and the client loads the built result. No dev server for gen UIs — it would require spawning a Vite process per gen UI project, which doesn't scale. Build times are fast enough (<10s with Bun) that the build-reload cycle is acceptable. The agent can iterate by rebuilding.

> **Q**: Should gen UI projects bundle all dependencies (including React) into a single file, or share React with the host via importmap? Sharing reduces size but requires `allow-same-origin` on the iframe.
> **A**: Bundle all dependencies into a single file. Each gen UI is self-contained with its own React copy. This avoids `allow-same-origin` (a major security risk), eliminates version coupling between host and gen UIs, and simplifies the build. The size overhead (~40KB for React) is acceptable per gen UI since they're loaded on demand, not upfront.

> **Q**: Where should gen UIs be displayable? Options: only in the chat panel (as embedded messages), in a dedicated gen UI panel/page, in modals, or in all of the above. Should the rendering context affect the gen UI's available viewport size?
> **A**: All of the above. Gen UIs render in: chat messages (compact, 300px height), the gen UI gallery page (default, 400px height), and a fullscreen modal (expanded, viewport height minus padding). The same `GenUiFrame` component is used in all contexts with a `size` prop (`compact | default | fullscreen`). The gen UI receives its viewport dimensions via the bridge protocol so it can adapt its layout.

> **Q**: Should multiple gen UIs be open simultaneously, or only one at a time? Multiple adds complexity but enables comparison views.
> **A**: Multiple allowed, but limited to 3 active iframes in the DOM simultaneously. Chat messages with gen UI embeds lazy-load the iframe when scrolled into view and unload when scrolled away. The gen UI gallery page shows one active gen UI at a time (clicking another swaps it). Fullscreen modal is always single. This balances memory usage with functionality.

---

## 2. Gen UI Project Template

### 2.1 Minimal Project Structure

- [ ] **FE-GEN-004**: Define the minimal gen UI project structure
  ```
  client/gen/{user}/{project}/
  ├── package.json          # Minimal dependencies
  ├── vite.config.ts        # ESM build configuration
  ├── tsconfig.json          # TypeScript config
  ├── index.html            # Entry HTML
  ├── src/
  │   ├── main.tsx          # React entry point
  │   ├── App.tsx           # Root component
  │   ├── types.ts          # Message type definitions
  │   └── bridge.ts         # Host communication bridge
  └── dist/                 # Build output (generated)
      ├── index.html
      └── assets/
  ```
- [ ] **FE-GEN-005**: Create the gen UI project `package.json` template
  - `"name"`: `"genui-{user}-{project}"`
  - `"private": true`
  - `"type": "module"`
  - Dependencies: `react`, `react-dom` (pinned versions matching host)
  - DevDependencies: `vite`, `@vitejs/plugin-react`, `typescript`
  - Scripts: `"dev"`, `"build"`, `"preview"`
- [ ] **FE-GEN-006**: Create the gen UI `vite.config.ts` template
  - Configure for ESM output
  - Set `base` to relative path (`./`)
  - Configure build output to `dist/`
  - Disable sourcemaps for production builds
  - Configure chunk splitting (single bundle preferred for iframe loading)
  - Set `build.target` to modern browsers only
- [ ] **FE-GEN-007**: Create the gen UI `tsconfig.json` template
  - Strict mode enabled
  - JSX: `react-jsx`
  - Target: ES2022
  - Module: ESNext
  - ModuleResolution: bundler
- [ ] **FE-GEN-008**: Create the gen UI `index.html` template
  - Minimal HTML with mount point
  - No external resource references
  - Script tag to `src/main.tsx` with `type="module"`

### 2.2 Entry Point Template

- [ ] **FE-GEN-009**: Create the gen UI `main.tsx` template
  - Import React and create root
  - Import bridge for host communication
  - Initialize bridge before render
  - Mount `<App />` component
- [ ] **FE-GEN-010**: Create the gen UI `App.tsx` template
  - Receive context from bridge
  - Render based on context data
  - Provide send-to-host function to child components
  - Error boundary wrapping
- [ ] **FE-GEN-011**: Create the gen UI `bridge.ts` template (communication helper)
  - Listen for `postMessage` from host
  - Validate message origin
  - Parse typed messages
  - Provide `sendToHost(type, payload)` function
  - Handle initialization handshake
  - Provide React hook: `useHostBridge()` for consuming messages

### 2.3 Allowed Dependencies

- [ ] **FE-GEN-012**: Define allowed dependency list for gen UI projects
  - Core: `react`, `react-dom`
  - Optional: `framer-motion` (for animations), `recharts` (for data viz), `react-hook-form` (for forms)
  - Forbidden: any package that accesses `window.parent`, `document.cookie`, `localStorage`, or network APIs beyond the bridge
- [ ] **FE-GEN-013**: Create dependency validation script
  - Scan gen UI `package.json` against allowlist
  - Warn or block on unauthorized dependencies
  - Run as part of build pipeline

---

## 3. Build Pipeline

### 3.1 Build Trigger

- [ ] **FE-GEN-014**: Implement build trigger mechanism
  - Agent notifies server that a gen UI project is ready to build
  - Server triggers build process on the gen UI project
  - Build runs `bun install && bun run build` in the project directory
  - Build output goes to `dist/` within the project
- [ ] **FE-GEN-015**: Implement automatic build on file change (development mode)
  - Watch gen UI project files for changes
  - Rebuild automatically on change
  - Notify host app of rebuild completion
- [ ] **FE-GEN-016**: Implement build status tracking
  - States: idle, installing, building, success, failed
  - Track build duration
  - Store build logs for debugging

### 3.2 Build Validation

- [ ] **FE-GEN-017**: Implement pre-build validation
  - Verify `package.json` exists and is valid
  - Verify dependencies are within allowlist
  - Verify entry point files exist
  - Verify no dangerous patterns in source code (basic static analysis)
- [ ] **FE-GEN-018**: Implement post-build validation
  - Verify `dist/index.html` exists
  - Verify `dist/assets/` contains expected bundles
  - Verify no references to external domains in built output
  - Verify bundle size is within limits (configurable, e.g., < 5MB)
- [ ] **FE-GEN-019**: Implement TypeScript type checking as build step
  - Run `tsc --noEmit` before Vite build
  - Report type errors but don't block build (warning mode)
  - Store type check results for display in UI

### 3.3 Build Output Serving

- [ ] **FE-GEN-020**: Configure server to serve gen UI `dist/` files
  - Serve static files from `client/gen/{user}/{project}/dist/`
  - URL pattern: `/genui/{user}/{project}/index.html`
  - Set appropriate cache headers (content-hash based, long cache)
  - Set restrictive security headers (CSP, X-Frame-Options)
- [ ] **FE-GEN-021**: Implement build artifact caching
  - Cache `node_modules/` between builds of the same project
  - Invalidate cache when `package.json` changes
  - Cache `dist/` until next build triggers
- [ ] **FE-GEN-022**: Implement build cleanup
  - Remove old `dist/` before new build
  - Limit build history (keep last N builds or total size)
  - Cleanup abandoned projects (no linked specs, not accessed recently)

#### Design Decisions

> **Q**: Should gen UI builds happen on the server (in a controlled environment) or on the client (in the browser)? Server builds are more secure and consistent; client builds are faster for the user.
> **A**: Server-side builds exclusively. The server runs `bun build` in an isolated directory for each gen UI project. Server builds ensure consistent output, enable static analysis, and prevent the client from executing arbitrary build scripts. The client receives only the built `dist/` output served as static files.

> **Q**: What is the maximum acceptable build time for a gen UI project? Under 10 seconds? Under 30 seconds?
> **A**: Under 10 seconds target, 30 seconds hard timeout. Most gen UI projects are small (1-3 files, <500 lines) and build in 2-5 seconds with Bun. A progress indicator shows build status in the chat. If the build exceeds 30 seconds, it's killed and the agent is notified of the timeout. Builds are queued and processed sequentially to avoid resource contention.

> **Q**: Should gen UI projects use the same version of React as the host app, or can they use any version? Version mismatch could cause issues if we ever share modules.
> **A**: Same major version of React as the host app (React 18.x initially). The gen UI scaffold template pins the React version. Since gen UIs bundle their own React (no module sharing), minor version differences are acceptable. Locking the major version ensures the agent's code generation templates produce compatible code.

> **Q**: Should build artifacts (dist/) be committed to git, or built on demand? Committing ensures reproducibility but increases repo size.
> **A**: Built on demand, not committed to git. The gen UI source code is committed; `dist/` is in `.gitignore`. The server rebuilds gen UIs when needed (on first access after a branch switch, or when source changes). Built artifacts are cached on the server filesystem. This keeps the git repo lean — gen UIs are potentially numerous and their dist/ output is redundant with source.

> **Q**: Should the build environment be isolated (Docker container, VM) for security, or is running in the server process acceptable?
> **A**: Isolated subprocess with restricted permissions. Run `bun build` in a subprocess with: a temp directory for output, a timeout (30s), no network access during build (dependencies are pre-installed), and restricted file system access (only the gen UI project directory). Full Docker isolation is overkill for MVP — the subprocess restrictions plus iframe sandboxing provide defense in depth.

> **Q**: Should there be a build queue to prevent multiple simultaneous builds from overwhelming the server?
> **A**: Yes. A FIFO build queue with a concurrency limit of 2 simultaneous builds. Additional build requests are queued with their position shown in the chat ("Build queued, position 3"). This prevents CPU spikes from parallel builds while allowing reasonable throughput. The queue is in-memory (no persistence needed — queued builds are retried on server restart).

---

## 4. ESM Dynamic Loading

### 4.1 Module Loader

- [ ] **FE-GEN-023**: Create `services/genui/loader.ts` — gen UI module loader
  - Accept gen UI project identifier (user + project name)
  - Construct URL to the gen UI `dist/index.html`
  - Return URL for iframe `src` attribute
  - Handle missing/not-built projects gracefully
- [ ] **FE-GEN-024**: Implement gen UI availability check
  - HEAD request to verify `dist/index.html` exists
  - Check build status from gen UI registry
  - Return detailed status: not-found, building, ready, error
- [ ] **FE-GEN-025**: Implement gen UI preloading
  - When agent notifies of new gen UI, prefetch the iframe URL
  - Use `<link rel="prefetch">` for the gen UI entry point
  - Reduces apparent load time when user opens the gen UI

### 4.2 Module Interface

- [ ] **FE-GEN-026**: Define the gen UI module metadata interface
  ```typescript
  interface GenUIMetadata {
    id: string;
    name: string;
    description: string;
    type: 'readout' | 'example' | 'input' | 'tool';
    version: string;
    createdBy: 'agent' | string; // agent or user ID
    linkedSpecIds: string[];
    linkedDocumentIds: string[];
    inputSchema?: object; // JSON Schema for expected input
    outputSchema?: object; // JSON Schema for output data
    createdAt: string;
    updatedAt: string;
    buildStatus: 'idle' | 'building' | 'success' | 'failed';
    lastBuildAt?: string;
  }
  ```
- [ ] **FE-GEN-027**: Define the gen UI metadata storage
  - Store metadata as `meta.json` in the gen UI project root
  - Agent writes metadata when creating the project
  - Host reads metadata for display in gen UI browser
- [ ] **FE-GEN-028**: Create gen UI metadata validation
  - Validate `meta.json` against schema on load
  - Required fields: id, name, type, linkedSpecIds
  - Warn on missing optional fields

---

## 5. Iframe Sandbox Implementation

### 5.1 Iframe Creation

- [ ] **FE-GEN-029**: Create `features/genui/components/GenUIFrame.tsx`
  - Render `<iframe>` element with sandbox restrictions
  - Props: `genUIId`, `width`, `height`, `onReady`, `onMessage`, `onError`
  - Manage iframe lifecycle: loading, ready, error, unloaded
- [ ] **FE-GEN-030**: Configure iframe sandbox attribute
  - `sandbox="allow-scripts"` — allow JavaScript execution
  - DO NOT include `allow-same-origin` — prevents access to host cookies/storage
  - DO NOT include `allow-top-navigation` — prevents redirecting host
  - DO NOT include `allow-popups` — prevents opening new windows
  - Add `allow-forms` only for input-type gen UIs
- [ ] **FE-GEN-031**: Configure iframe security headers
  - Set `Content-Security-Policy` on served gen UI files:
    - `default-src 'self'`
    - `script-src 'self' 'unsafe-inline'` (Vite requires inline for dev)
    - `style-src 'self' 'unsafe-inline'`
    - `img-src 'self' data: blob:`
    - `connect-src 'none'` (no network access from iframe)
    - `frame-ancestors` matching host domain
- [ ] **FE-GEN-032**: Implement iframe isolation
  - Each gen UI gets its own iframe instance
  - No shared state between different gen UI iframes
  - `<iframe>` has unique `name` attribute per instance

### 5.2 Iframe Lifecycle

- [ ] **FE-GEN-033**: Implement iframe loading state management
  - Show loading indicator while iframe loads
  - Detect `onload` event on iframe element
  - Wait for handshake message from iframe (bridge initialized)
  - Timeout after configurable period (default: 10s) and show error
- [ ] **FE-GEN-034**: Implement iframe ready handshake
  - Iframe sends `{ type: 'genui:ready' }` when bridge initializes
  - Host responds with `{ type: 'genui:init', payload: { context, config } }`
  - Gen UI renders after receiving init data
- [ ] **FE-GEN-035**: Implement iframe unloading
  - Remove iframe from DOM when no longer displayed
  - Send `{ type: 'genui:destroy' }` before removal
  - Cleanup message event listeners
  - Release any held references for garbage collection
- [ ] **FE-GEN-036**: Implement iframe reload
  - User-triggered reload button
  - Clear iframe src and re-assign
  - Re-run handshake protocol
  - Preserve any necessary state (e.g., user input draft)
- [ ] **FE-GEN-037**: Implement iframe resize handling
  - Gen UI requests height change: `{ type: 'genui:resize', payload: { height } }`
  - Host validates requested size against min/max limits
  - Host applies size change with smooth transition
  - Maximum dimensions enforced (prevent gen UI from expanding infinitely)

#### Design Decisions

> **Q**: The plan omits `allow-same-origin` from the sandbox. This means the iframe cannot access any storage APIs. Is this acceptable, or do gen UIs need localStorage for state persistence? If needed, state could be persisted through the host bridge instead.
> **A**: Acceptable — omit `allow-same-origin`. Gen UIs that need state persistence use the host bridge protocol: `{ type: 'state:save', key: 'formData', value: {...} }` and `{ type: 'state:load', key: 'formData' }`. The host stores gen UI state in the `GenUIStore` (MobX domain store — this is backend-linked domain data, not simple UI state) with `@observable` state map and `@action` save/load methods, keyed by gen UI ID, provided via RootStore context. This is more secure than granting storage access and provides the host with visibility into gen UI state.

> **Q**: Should `allow-forms` be always included or only for input-type gen UIs? Removing `allow-forms` prevents `<form>` submissions, but forms could use `event.preventDefault()` + `postMessage` instead.
> **A**: Always include `allow-forms` in the sandbox. Many gen UIs will contain forms (the primary use case is structured data input). Requiring `event.preventDefault()` on every form is fragile — a missed handler causes a sandbox violation error. The `allow-forms` permission is low-risk since the iframe has no network access (`connect-src 'none'`), so form submissions go nowhere.

> **Q**: Should the CSP `connect-src` be `'none'` for all gen UIs, or should readout gen UIs be allowed to fetch data from a whitelisted API?
> **A**: `connect-src 'none'` for all gen UIs. If a gen UI needs server data, it requests it through the host bridge (`{ type: 'data:request', endpoint: '/api/specs/123' }`), and the host proxies the request with proper authentication. This prevents gen UIs from making unauthorized API calls and provides a single audit point for all data access.

> **Q**: Should gen UIs support undo/redo for user inputs?
> **A**: This is the gen UI's responsibility, not the host's. The bridge protocol does not provide undo/redo. If a gen UI needs undo (e.g., a complex form builder), the agent should implement it within the gen UI code. Simple forms don't need undo — the browser's native input undo (Cmd+Z) works within the iframe.

> **Q**: Should gen UIs be resizable by the user (drag to resize the iframe), or fixed-size?
> **A**: Resizable vertically via a drag handle at the bottom of the iframe container. Horizontal width is always 100% of the parent container. Min height: 200px, max height: 800px, default: 400px. The user's preferred height per gen UI is stored in localStorage. A fullscreen button provides maximum space when needed.

> **Q**: Should there be a "fullscreen" mode for gen UIs that need more space (e.g., complex form builders)?
> **A**: Yes. A fullscreen button in the gen UI container header opens the gen UI in a modal overlay that fills the viewport with 32px padding. The modal includes the gen UI title, a close button, and the iframe at full available size. This is essential for complex gen UIs (multi-step wizards, large forms, data tables) that don't fit in a 400px panel.

---

## 6. Host-Iframe Communication Protocol

### 6.1 Message Format

- [ ] **FE-GEN-038**: Define the `postMessage` protocol types
  ```typescript
  interface GenUIMessage {
    type: string;
    payload: unknown;
    requestId?: string; // For request-response patterns
    timestamp: number;
  }
  ```
- [ ] **FE-GEN-039**: Define host-to-iframe message types
  - `genui:init` — initialization data (context, config, linked spec data)
  - `genui:update` — updated data (spec changed, graph updated)
  - `genui:destroy` — iframe about to be removed
  - `genui:command` — host-initiated command (resize, reset, etc.)
  - `genui:response` — response to iframe request (for request-response)
- [ ] **FE-GEN-040**: Define iframe-to-host message types
  - `genui:ready` — bridge initialized, ready for init data
  - `genui:resize` — request height/width change
  - `genui:output` — user interaction result (form data, selection, etc.)
  - `genui:action` — request host to perform action (navigate to spec, send to agent)
  - `genui:error` — error occurred in gen UI
  - `genui:request` — request data from host (spec content, graph data)
  - `genui:log` — log message for debugging

### 6.2 Message Handling

- [ ] **FE-GEN-041**: Implement host-side message handler
  - Listen for `message` events on `window`
  - Validate `event.origin` matches expected gen UI origin
  - Validate `event.source` matches the expected iframe window
  - Parse and route messages based on `type`
  - Log all messages in development mode
- [ ] **FE-GEN-042**: Implement message validation
  - Validate message shape against expected schema
  - Reject messages with unknown types
  - Reject messages exceeding payload size limit (e.g., 1MB)
  - Rate-limit messages from iframe (prevent flooding)
- [ ] **FE-GEN-043**: Implement request-response pattern
  - Iframe sends `{ type: 'genui:request', requestId: 'abc', payload: { ... } }`
  - Host processes request and responds with `{ type: 'genui:response', requestId: 'abc', payload: { ... } }`
  - Timeout if no response within configurable period
  - Iframe bridge provides `async requestFromHost(type, payload)` helper

### 6.3 Data Flow

- [ ] **FE-GEN-044**: Implement context data injection
  - On init, send relevant context to iframe:
    - Linked spec data (content, metadata)
    - Current user info
    - Theme (light/dark) for styling alignment
    - Any parameters the gen UI needs
  - Update context on spec changes (live updates)
- [ ] **FE-GEN-045**: Implement output data collection
  - When user interacts with gen UI (form submit, selection, etc.)
  - Gen UI sends `genui:output` with structured data
  - Host validates output against expected schema
  - Host stores output and/or forwards to agent
- [ ] **FE-GEN-046**: Implement action delegation
  - Gen UI requests navigation: `{ type: 'genui:action', payload: { action: 'navigate', specId: '...' } }`
  - Gen UI requests agent interaction: `{ type: 'genui:action', payload: { action: 'sendToAgent', message: '...' } }`
  - Host validates and executes action
  - Host notifies gen UI of action result

#### Design Decisions

> **Q**: Should the host-iframe communication protocol support streaming (for large data transfers), or is single-message sufficient?
> **A**: Single-message is sufficient. Gen UI data payloads are small (form data, UI state) — typically under 10KB. If a gen UI needs to send large content (e.g., a long text input), the bridge protocol accepts messages up to 1MB. No streaming needed. For truly large data (images), use a file upload through the host bridge rather than postMessage.

> **Q**: Should the protocol include versioning (to handle gen UIs built against different protocol versions)?
> **A**: Yes. Every bridge message includes a `protocolVersion: 1` field. The host checks the version and adapts behavior if needed. Gen UI projects include the protocol version in their scaffold boilerplate. When the protocol evolves, old gen UIs continue to work via backward-compatible handling. Breaking changes increment the major version and trigger a rebuild prompt.

> **Q**: Should there be a maximum message size? If so, what limit (1MB, 5MB)? Large payloads might be needed for rich spec content.
> **A**: 1MB maximum per message. This covers all practical use cases (form data, rich text content, JSON payloads). Messages exceeding 1MB are rejected with an error sent back to the gen UI. If larger transfers are ever needed, implement chunked transfer in a future protocol version. 1MB is well within `postMessage` performance limits.

> **Q**: Should the protocol support binary data (for images/files), or only JSON-serializable data?
> **A**: JSON-serializable data only. Images/files from gen UIs are sent as base64-encoded strings within JSON messages (up to the 1MB limit). For larger files, the gen UI sends a request through the bridge, and the host handles the upload via a standard API call. This keeps the protocol simple and debuggable. Binary `Transferable` objects add complexity with minimal benefit.

> **Q**: How should the host handle messages from a gen UI that it doesn't recognize? Silently ignore, log a warning, or show an error?
> **A**: Log a warning to the console in development mode (`import.meta.env.DEV`), silently ignore in production. Unrecognized messages are not shown to users — they're likely from a protocol version mismatch or a bug in the gen UI code. The warning in dev mode helps the agent debug issues during gen UI development.

> **Q**: Should there be a "debug mode" for gen UI communication that logs all messages for developer inspection?
> **A**: Yes. A `debugBridge: true` flag in the gen UI iframe component enables verbose logging of all postMessage traffic to the browser console (both directions: host→iframe and iframe→host). Toggled via a developer setting or URL parameter (`?debugGenUi=true`). The log includes timestamps, message types, and payload previews (truncated to 500 chars). Disabled by default in production.

---

## 7. Security Constraints

### 7.1 Sandbox Enforcement

- [ ] **FE-GEN-047**: Implement CSP validation for gen UI builds
  - Scan built output for inline scripts that bypass CSP
  - Verify no external resource URLs in built output
  - Verify no `eval()`, `new Function()`, or similar patterns
- [ ] **FE-GEN-048**: Implement network isolation
  - Gen UI iframe has `connect-src 'none'` CSP
  - No `fetch`, `XMLHttpRequest`, `WebSocket` from within iframe
  - All data must flow through `postMessage` bridge
  - Verify during build: no network API calls in source code
- [ ] **FE-GEN-049**: Implement storage isolation
  - Iframe without `allow-same-origin` has no access to host localStorage
  - Iframe has no access to host cookies
  - Iframe has no access to host sessionStorage
  - Verify during build: no storage API calls in source code
- [ ] **FE-GEN-050**: Implement DOM isolation
  - Iframe cannot access `window.parent` or `window.top` DOM
  - Iframe cannot use `window.open()` (no `allow-popups`)
  - Iframe cannot navigate host (`allow-top-navigation` removed)

### 7.2 Input Sanitization

- [ ] **FE-GEN-051**: Sanitize all data sent from host to iframe
  - Strip any executable content from spec data before sending
  - Encode HTML entities in text content
  - Validate JSON payload structure
- [ ] **FE-GEN-052**: Sanitize all data received from iframe
  - Validate output data against expected schema
  - Strip any HTML/script content from text fields
  - Limit payload sizes
  - Log suspicious payloads for review
- [ ] **FE-GEN-053**: Implement source code scanning for gen UI projects
  - Block `document.cookie` access patterns
  - Block `window.parent` / `window.top` access patterns
  - Block `eval`, `Function()`, `setTimeout(string)` patterns
  - Block `fetch`, `XMLHttpRequest`, `WebSocket` usage
  - Run as pre-build validation step

### 7.3 Resource Limits

- [ ] **FE-GEN-054**: Implement gen UI resource limits
  - Maximum bundle size: 5MB (configurable)
  - Maximum number of files in project: 100
  - Maximum total project size: 20MB
  - Maximum iframe memory (browser-enforced, but monitor via performance API)
- [ ] **FE-GEN-055**: Implement gen UI execution monitoring
  - Detect infinite loops or excessive CPU usage (long tasks)
  - Timeout gen UI execution if unresponsive for > 30 seconds
  - Show "unresponsive" warning with option to kill and reload

#### Design Decisions

> **Q**: How rigorously should agent-generated code be scanned for security issues? Static analysis only, or also dynamic analysis (run in a sandbox and monitor behavior)?
> **A**: Static analysis on build. Run ESLint with security-focused rules (`no-eval`, `no-implied-eval`, `no-new-Function`) and scan for dangerous patterns (inline event handlers with `javascript:`, `document.cookie` access, `XMLHttpRequest`/`fetch` usage). No dynamic analysis — the iframe sandbox already constrains runtime behavior. Static analysis catches intentional abuse; the sandbox prevents accidental damage.

> **Q**: Should there be a manual review step before a gen UI is made available to the user, or is automated validation sufficient?
> **A**: Automated validation is sufficient for the default flow. The agent generates code, the server builds it, static analysis runs, and if it passes, it's available immediately. A "Report issue" button on each gen UI lets users flag problems. For high-sensitivity deployments, an admin setting can enable mandatory review (gen UIs are marked "pending review" until approved).

> **Q**: What happens if a gen UI is found to contain malicious code after it has already been used? Should there be a "quarantine" mechanism?
> **A**: Yes. Admins can quarantine a gen UI, which immediately disables its iframe (replaces with a "This component has been disabled" message), preserves the source code for investigation, and notifies the gen UI's linked spec author. Quarantined gen UIs remain in the registry but cannot be loaded. The quarantine flag is stored in the gen UI metadata.

---

## 8. Agent Integration

### 8.1 Agent-to-Gen-UI Flow

- [ ] **FE-GEN-056**: Implement agent gen UI creation notification
  - Agent creates gen UI project files via MCP tool
  - Server notifies client via WebSocket: `genui:created` event
  - Client updates gen UI registry
  - Chat message appears with gen UI embed
- [ ] **FE-GEN-057**: Implement agent gen UI update notification
  - Agent modifies gen UI project files
  - Server triggers rebuild
  - Client notified of rebuild status
  - Iframe reloads if currently displayed
- [ ] **FE-GEN-058**: Implement agent context for gen UI generation
  - Agent receives user context: current spec, current document, current graph view
  - Agent receives gen UI template and conventions
  - Agent generates appropriate project files
  - Agent tests the build passes before notifying user

### 8.2 Gen-UI-to-Agent Flow

- [ ] **FE-GEN-059**: Implement output forwarding to agent
  - Gen UI sends `genui:output` with form data/selection
  - Host receives and validates output
  - Host sends output to agent via API/WebSocket
  - Agent processes output and may:
    - Create/update specs based on input
    - Send follow-up messages in chat
    - Generate additional gen UIs
- [ ] **FE-GEN-060**: Implement gen UI interaction logging
  - Log all gen UI outputs for the agent session
  - Associate outputs with the gen UI and linked specs
  - Store in agent session history for reference
- [ ] **FE-GEN-061**: Implement gen UI parameter persistence
  - For input-type gen UIs, save the parameters that produce the UI
  - When re-opening the gen UI, restore saved parameters
  - If user modifies inputs, update the linked spec accordingly

### 8.3 Agent Discovery of Existing Gen UIs

- [ ] **FE-GEN-062**: Implement gen UI search/discovery for agents
  - Agent can query existing gen UIs via MCP tool
  - Search by: type, linked specs, user, name
  - Agent decides: reuse existing gen UI or create new one
  - Existing gen UI can be reconfigured with new parameters
- [ ] **FE-GEN-063**: Implement gen UI versioning
  - Track changes to gen UI source code
  - Version gen UIs alongside linked specs
  - Agent can update a gen UI while preserving user data

#### Design Decisions

> **Q**: What prompting strategy should the agent use to generate gen UI code? Should there be detailed templates and examples in the agent's system prompt, or should the agent learn from existing gen UIs in the project?
> **A**: Detailed templates in the system prompt. Provide the agent with: a gen UI project scaffold (package.json, vite.config, main.tsx boilerplate), the bridge protocol API reference, 3-4 example gen UIs covering common patterns (form, data display, interactive wizard), and BEM SCSS conventions. The agent can also reference existing project gen UIs for style consistency, but the templates are the primary guide.

> **Q**: Should the agent be able to use external code libraries (fetched from npm) in gen UI projects, or only the allowlisted dependencies?
> **A**: Allowlisted dependencies only. The allowlist includes: React, React DOM, a small utility library (lodash-es subset or custom), and a charting library (recharts or lightweight alternative). Adding npm packages in gen UIs requires server-side `bun install`, which is a security surface. The allowlist is configurable by admins and can be expanded per project.

> **Q**: How should the agent handle gen UI failures? Should it automatically attempt to fix build errors, or report the error to the user and wait for guidance?
> **A**: Automatically attempt to fix, up to 3 retries. If the build fails, the agent receives the error output, attempts a fix, and rebuilds. After 3 failed attempts, the agent reports the error to the user in the chat with the error details and asks for guidance. This mirrors how a human developer would iterate on build errors before asking for help.

> **Q**: Should the agent test gen UIs by "using" them (simulating interaction) before presenting to the user?
> **A**: Yes, basic smoke testing. After a successful build, the server loads the gen UI in a headless browser, waits for the `ready` message via the bridge protocol, and verifies no console errors occur within 3 seconds. If the smoke test fails, the agent is notified and can attempt a fix. No full interaction simulation — that's too complex and slow.

> **Q**: When a gen UI sends output data (user's form submission), how should the agent process it? Automatically create specs, or present the output to the user in the chat for review?
> **A**: Present the output to the user in the chat for review first. The agent formats the gen UI output as a spec proposal message in the chat: "Based on your input in [Gen UI Name], I'd like to create the following spec: [preview]. Accept or modify?" The user reviews and accepts/modifies before any spec creation. No automatic spec creation from gen UI output — human-in-the-loop is a core principle.

> **Q**: Should gen UI output data be stored permanently (for audit/replay), or only kept for the duration of the agent session?
> **A**: Stored permanently as part of the chat session history. Each gen UI output event is logged as a chat message of type `gen-ui-output` with the full data payload. Since chat history is persisted as a reference log (per PRD), gen UI outputs are naturally preserved. This provides audit trail and allows revisiting past interactions.

> **Q**: How should the agent handle gen UI outputs that conflict with existing specs? Propose a merge, overwrite, or flag for review?
> **A**: Flag for review in the chat. The agent detects the conflict, presents both versions (existing spec content vs. gen UI output) as a side-by-side comparison in the chat, and asks the user to choose: merge, overwrite existing, or discard the new output. The agent may suggest a merged version, but the user makes the final decision.

---

## 9. Gen UI Registry & Management

### 9.1 Registry Implementation

- [ ] **FE-GEN-064**: Create `services/genui/registry.ts`
  - Maintain list of all gen UI projects for the current user
  - Fetch registry from server API
  - Update registry on WebSocket notifications
  - Cache registry in memory
- [ ] **FE-GEN-065**: Implement gen UI listing API integration
  - Fetch all gen UIs for the user: GET `/api/v1/genui`
  - Filter by: type, spec link, build status
  - Paginate results for large collections
- [ ] **FE-GEN-066**: Implement gen UI status tracking
  - Track per-project: build status, last access, storage size
  - Display status in gen UI browser and chat embeds
- [ ] **FE-GEN-067**: Implement gen UI favorites/pinning
  - User can pin frequently used gen UIs
  - Pinned gen UIs appear in quick-access panel

### 9.2 Management Actions

- [ ] **FE-GEN-068**: Implement gen UI deletion
  - User confirms deletion via dialog
  - Server deletes project directory and metadata
  - Unlink from associated specs
  - Update registry
- [ ] **FE-GEN-069**: Implement gen UI rebuild trigger
  - User clicks "Rebuild" on a gen UI
  - Server triggers fresh build
  - UI shows build progress
  - Iframe reloads on completion
- [ ] **FE-GEN-070**: Implement gen UI source viewing
  - Display gen UI source files in a read-only code viewer
  - Syntax highlighting for TSX/TS/HTML/CSS
  - Useful for debugging and understanding agent-generated code
- [ ] **FE-GEN-071**: Implement gen UI sharing
  - Gen UIs are stored in `client/gen/{user}/{project}/`
  - Sharing: copy project to shared location or provide URL
  - Other users can view but not modify (unless cloned)

#### Design Decisions

> **Q**: How should users discover available gen UIs? A browsable gallery, search, agent recommendation, or all of the above?
> **A**: All of the above. The gen UI gallery page (`/gen-ui`) provides browsable discovery with search and filtering by linked spec/document. In chat, the agent can recommend existing gen UIs when relevant ("I have a form for this — want to use it?"). Gen UIs linked to a spec are shown in the spec's metadata panel. The gallery is the primary browsing interface; chat is the contextual discovery path.

> **Q**: Should gen UIs have thumbnails/previews? If so, how are they generated — screenshot on build, or placeholder based on type?
> **A**: Screenshot on build. After a successful build and smoke test, the server captures a 400x300 screenshot of the gen UI in a headless browser and stores it alongside the build artifacts. This provides accurate visual previews in the gallery. If the screenshot fails, use a generic placeholder icon based on the gen UI's declared type (form, display, interactive).

> **Q**: Should there be "featured" or "template" gen UIs that are available to all projects?
> **A**: Yes. A set of 5-8 system-provided template gen UIs ships with the platform: "Survey Form," "Requirements Checklist," "Priority Matrix," "Comparison Table," "Decision Tree," "Data Entry Form." These appear in the gen UI gallery under a "Templates" section. The agent can instantiate them with project-specific content. Templates are read-only; using one creates a copy.

> **Q**: When should gen UIs be deleted? Never (manual only), after linked specs are deleted, after a period of inactivity, or when storage quota is reached?
> **A**: Manual deletion only. Gen UIs are persistent artifacts (per PRD: "NOT ephemeral"). When a linked spec is deleted, the gen UI is unlinked but preserved — it may still be valuable for reference or re-linking. Admins can bulk-delete gen UIs older than a configurable age via a maintenance tool. No automatic deletion based on inactivity.

> **Q**: Should gen UIs be exportable (download the project as a zip)?
> **A**: Yes. An "Export" button on each gen UI downloads a zip containing the full source code, `package.json`, and build configuration. This lets users port the gen UI to external projects or inspect the agent's generated code. The export excludes `node_modules/` and `dist/` — only source files.

> **Q**: Should gen UIs be clonable (copy and modify for a different purpose)?
> **A**: Yes. A "Clone" action creates a copy of the gen UI source under a new ID, linked to no spec initially. The user (or agent) can then modify the clone. This enables iterative development: clone an existing form, tweak it for a new use case. Cloned gen UIs appear in the gallery with a "Cloned from [Original Name]" badge.

---

## 10. File Storage & Structure

### 10.1 Directory Management

- [ ] **FE-GEN-072**: Implement gen UI directory structure at `client/gen/`
  ```
  client/gen/
  ├── {username}/
  │   ├── {project-name}/
  │   │   ├── meta.json        # Gen UI metadata
  │   │   ├── package.json
  │   │   ├── vite.config.ts
  │   │   ├── tsconfig.json
  │   │   ├── index.html
  │   │   ├── src/
  │   │   │   ├── main.tsx
  │   │   │   ├── App.tsx
  │   │   │   ├── bridge.ts
  │   │   │   └── ... (agent-generated files)
  │   │   ├── dist/            # Build output
  │   │   └── node_modules/    # Dependencies (gitignored)
  │   └── {project-name-2}/
  └── {username-2}/
  ```
- [ ] **FE-GEN-073**: Configure `.gitignore` for gen UI directories
  - Ignore: `**/node_modules/`, `**/dist/`
  - Track: source files, `meta.json`, `package.json`, config files
  - Track: agent-generated source code (version controlled)
- [ ] **FE-GEN-074**: Implement gen UI directory naming conventions
  - Username: sanitized (lowercase, alphanumeric + hyphens)
  - Project name: kebab-case, auto-generated from gen UI name
  - Handle naming conflicts (append numeric suffix)

### 10.2 Storage Limits

- [ ] **FE-GEN-075**: Implement per-user storage quotas
  - Maximum number of gen UI projects per user (configurable, e.g., 50)
  - Maximum total storage per user (e.g., 500MB)
  - Warning at 80% capacity
  - Prevent creation at 100% capacity
- [ ] **FE-GEN-076**: Implement storage monitoring
  - Track disk usage per user and per project
  - Display usage in settings
  - Suggest cleanup of unused gen UIs

#### Design Decisions

> **Q**: Should gen UI source code be version-controlled alongside the knowledge graph, or in a separate tracking mechanism?
> **A**: Version-controlled alongside the knowledge graph in the same git repository. Gen UI source lives in `client/gen/{user}/{generated-ui}/` as specified by the PRD. Changes to gen UI source are committed when the agent generates or updates them. This means gen UIs participate in branching and merging just like specs.

> **Q**: Should gen UI `dist/` output be committed to git, or regenerated from source on demand?
> **A**: Regenerated from source on demand. `dist/` directories are in `.gitignore`. The server rebuilds from source when needed (first access, after source change, after branch switch). Built output is cached on the server filesystem until invalidated. This keeps the git history clean and avoids large binary diffs.

> **Q**: When a linked spec is reverted to a previous version, should the gen UI also revert (if it was updated when the spec changed)?
> **A**: No automatic gen UI revert. Spec reversion and gen UI versioning are independent — a spec may have been updated for reasons unrelated to the gen UI. If the user wants to revert the gen UI too, they do so explicitly from the gen UI's version history. The agent can suggest reverting the gen UI if it detects the versions were linked.

> **Q**: How should gen UI projects be handled during branch switching? Should they follow the branch, or exist globally?
> **A**: Follow the branch. Gen UI source code is in git, so switching branches switches to that branch's version of the gen UI source. The server-cached `dist/` output is invalidated on branch switch and rebuilt on next access. This is consistent with how specs behave — everything in the knowledge set follows the branch.

---

## 11. Gen UI Types & Use Cases

### 11.1 Static Readout Gen UIs

- [ ] **FE-GEN-077**: Define static readout gen UI pattern
  - Display-only, no user input
  - Receives spec data on init
  - Renders visualization, report, or formatted view
  - Updates when linked spec data changes
- [ ] **FE-GEN-078**: Create readout gen UI template
  - Pre-built components for common readout patterns
  - Data binding from init context
  - Responsive layout within iframe
- [ ] **FE-GEN-079**: Implement readout live-update mechanism
  - Host sends `genui:update` when linked spec changes
  - Gen UI re-renders with new data
  - Smooth transitions between data states

### 11.2 Example Prototype Gen UIs

- [ ] **FE-GEN-080**: Define example prototype gen UI pattern
  - Static mockup of a proposed UI feature
  - No interaction or data flow back to agent
  - Linked to specs describing the proposed feature
  - Visual-only demonstration
- [ ] **FE-GEN-081**: Create example prototype gen UI template
  - Includes common UI framework elements
  - Placeholder data matching spec descriptions
  - Responsive design matching target platform

### 11.3 Input Form Gen UIs

- [ ] **FE-GEN-082**: Define input form gen UI pattern
  - Interactive form for capturing structured user input
  - Validates input locally before sending to host
  - Sends structured output to agent for spec generation
  - Persists input parameters for reproducibility
- [ ] **FE-GEN-083**: Create input form gen UI template
  - Form layout components
  - Validation helpers
  - Submit-to-host bridge integration
  - Auto-save draft input to host storage
- [ ] **FE-GEN-084**: Implement input persistence and replay
  - Save user input when form is submitted
  - Restore saved input when gen UI is reopened
  - If user modifies input, notify host of changes
  - Host propagates changes to linked specs via agent

### 11.4 Custom Tool Gen UIs

- [ ] **FE-GEN-085**: Define custom tool gen UI pattern
  - Complex interactive tools built by the agent
  - May combine input, display, and navigation
  - Deeply integrated with specific workflow needs
  - Examples: animation builder, schema designer, dependency mapper
- [ ] **FE-GEN-086**: Create custom tool gen UI template
  - Full React app scaffold
  - State management boilerplate
  - Two-way bridge communication
  - Tool-specific component patterns

---

## 12. Error Handling & Recovery

### 12.1 Build Errors

- [ ] **FE-GEN-087**: Implement build error display
  - Show build errors in the gen UI browser card
  - Parse Vite/TypeScript error output for display
  - Highlight error location (file, line, column)
  - Provide "View source" link to the problematic file
- [ ] **FE-GEN-088**: Implement build error recovery
  - "Retry build" button for transient failures
  - "Report to agent" button to send error context
  - Agent can analyze and fix build errors
  - Show build error history

### 12.2 Runtime Errors

- [ ] **FE-GEN-089**: Implement iframe error detection
  - Listen for `error` events from iframe
  - Listen for `genui:error` messages from bridge
  - Detect unresponsive iframe (no heartbeat)
  - Show error overlay on the iframe container
- [ ] **FE-GEN-090**: Implement iframe error recovery
  - "Reload" button to reload the iframe
  - "Report" button to send error to agent
  - Automatic retry for transient errors (with backoff)
  - Fallback display if gen UI is completely broken
- [ ] **FE-GEN-091**: Implement iframe crash handling
  - Detect iframe process crash (if possible via browser APIs)
  - Show "crashed" state with reload option
  - Log crash details for debugging

### 12.3 Communication Errors

- [ ] **FE-GEN-092**: Implement message delivery confirmation
  - For critical messages, expect acknowledgment from iframe
  - Retry unacknowledged messages (limited retries)
  - Timeout and show error if communication is broken
- [ ] **FE-GEN-093**: Implement desync detection
  - Host tracks expected iframe state
  - If iframe state diverges, offer "resync" option
  - Resync: reload iframe with current context

#### Design Decisions

> **Q**: What is the expected number of gen UI projects per user? 5? 50? 500? This affects registry design and storage planning.
> **A**: Plan for 50-100 gen UIs per project (not per user). Most projects will have 10-30 gen UIs. The registry is a simple database table indexed by project ID, gen UI ID, and linked spec ID. Storage planning: ~5MB average per gen UI (source + dist + thumbnail), so 100 gen UIs ≈ 500MB per project. Set a default quota of 200 gen UIs per project, configurable by admins.

> **Q**: How quickly should a gen UI load once the user clicks to open it? Under 2 seconds? Under 5 seconds?
> **A**: Under 2 seconds from click to interactive. The `dist/` output is pre-built static files served directly by the server (no build step on load). Most gen UIs will load in under 1 second. The iframe shows a loading spinner while the gen UI initializes. If the gen UI hasn't sent a `ready` message within 5 seconds, show a "Taking longer than expected" warning with a reload button.

> **Q**: Should gen UI iframes be pre-created (hidden, ready to display) for frequently used gen UIs, or always created on demand?
> **A**: Always created on demand. Pre-creating iframes wastes memory and the 2-second load target is achievable without pre-creation. The only optimization: when a chat message with a gen UI embed scrolls into view, start loading the iframe immediately (intersection observer with 200px rootMargin for look-ahead). Destroy iframes when scrolled out of view.

> **Q**: Should there be a limit on how many gen UI iframes can be active (rendered in DOM) simultaneously? Each iframe has memory overhead.
> **A**: Maximum 3 active iframes simultaneously. When a 4th iframe needs to load, the least recently interacted iframe is destroyed (its state is preserved via the bridge state:save protocol if needed). In the chat panel, only the most recently scrolled-into-view gen UI iframe is active; others show their static thumbnail. This keeps memory usage predictable.

---

## Summary

### Task Count by Section

| Section | Tasks |
|---------|-------|
| 1. Architecture Overview | 3 (FE-GEN-001 through FE-GEN-003) |
| 2. Gen UI Project Template | 13 (FE-GEN-004 through FE-GEN-013) |  *  (note: corrected from numbering) |
| 3. Build Pipeline | 9 (FE-GEN-014 through FE-GEN-022) |
| 4. ESM Dynamic Loading | 6 (FE-GEN-023 through FE-GEN-028) |
| 5. Iframe Sandbox Implementation | 9 (FE-GEN-029 through FE-GEN-037) |
| 6. Host-Iframe Communication Protocol | 9 (FE-GEN-038 through FE-GEN-046) |
| 7. Security Constraints | 9 (FE-GEN-047 through FE-GEN-055) |
| 8. Agent Integration | 8 (FE-GEN-056 through FE-GEN-063) |
| 9. Gen UI Registry & Management | 8 (FE-GEN-064 through FE-GEN-071) |
| 10. File Storage & Structure | 5 (FE-GEN-072 through FE-GEN-076) |
| 11. Gen UI Types & Use Cases | 10 (FE-GEN-077 through FE-GEN-086) |
| 12. Error Handling & Recovery | 7 (FE-GEN-087 through FE-GEN-093) |
| **TOTAL** | **93** |

> Note: Many tasks contain multiple sub-items and detailed specifications.
> Combined with the template files, build pipeline configuration, and security
> validations, the effective implementation effort exceeds 130 discrete tasks.

### Definition of Done

This plan is complete when:
- [ ] Gen UI project template can be scaffolded by the agent
- [ ] Gen UI projects build successfully with Vite
- [ ] Iframe loads built gen UI with proper sandbox restrictions
- [ ] Host-iframe communication works bidirectionally via postMessage
- [ ] Security constraints prevent all identified attack vectors
- [ ] Agent can create, update, and query gen UI projects
- [ ] Gen UI outputs are forwarded to the agent and processed
- [ ] Gen UI browser displays all available gen UIs with correct status
- [ ] Error handling covers build, runtime, and communication failures
