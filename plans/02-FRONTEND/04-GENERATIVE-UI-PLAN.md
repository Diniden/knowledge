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
