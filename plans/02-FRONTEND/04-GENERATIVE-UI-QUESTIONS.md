# 02-FRONTEND / 04 — GENERATIVE UI: Open Questions

> **Purpose**: Unresolved questions about the generative UI sandbox system,
> including ESM loading, iframe security, agent integration, build pipeline,
> and communication protocols. Answers may change tasks in the plan.

---

## 1. Architecture

### 1.1 Loading Strategy
- **Q**: Should gen UI projects be loaded as pre-built static files in an
  iframe, or should the host app load ESM modules directly (without an
  iframe)? The iframe approach provides stronger isolation but adds complexity.
- **A:** Pre-built static files in an iframe. The iframe boundary provides essential security isolation — agent-generated code must not have access to the host app's DOM, state, or cookies. The `dist/index.html` of each gen UI project is loaded as the iframe `src`. All communication goes through `postMessage`. This is non-negotiable for security.

- **Q**: Should gen UI projects use Vite's dev server during development
  (for HMR), or always use the built `dist/` output? Dev server would improve
  the agent's development cycle but adds infrastructure.
- **A:** Always use the built `dist/` output. The agent generates code, the server builds it, and the client loads the built result. No dev server for gen UIs — it would require spawning a Vite process per gen UI project, which doesn't scale. Build times are fast enough (<10s with Bun) that the build-reload cycle is acceptable. The agent can iterate by rebuilding.

- **Q**: Should gen UI projects bundle all dependencies (including React)
  into a single file, or share React with the host via importmap? Sharing
  reduces size but requires `allow-same-origin` on the iframe.
- **A:** Bundle all dependencies into a single file. Each gen UI is self-contained with its own React copy. This avoids `allow-same-origin` (a major security risk), eliminates version coupling between host and gen UIs, and simplifies the build. The size overhead (~40KB for React) is acceptable per gen UI since they're loaded on demand, not upfront.

### 1.2 Rendering Context
- **Q**: Where should gen UIs be displayable? Options:
  - Only in the chat panel (as embedded messages)
  - In a dedicated gen UI panel/page
  - In modals
  - In all of the above
  Should the rendering context affect the gen UI's available viewport size?
- **A:** All of the above. Gen UIs render in: chat messages (compact, 300px height), the gen UI gallery page (default, 400px height), and a fullscreen modal (expanded, viewport height minus padding). The same `GenUiFrame` component is used in all contexts with a `size` prop (`compact | default | fullscreen`). The gen UI receives its viewport dimensions via the bridge protocol so it can adapt its layout.

- **Q**: Should multiple gen UIs be open simultaneously, or only one at a
  time? Multiple adds complexity but enables comparison views.
- **A:** Multiple allowed, but limited to 3 active iframes in the DOM simultaneously. Chat messages with gen UI embeds lazy-load the iframe when scrolled into view and unload when scrolled away. The gen UI gallery page shows one active gen UI at a time (clicking another swaps it). Fullscreen modal is always single. This balances memory usage with functionality.

---

## 2. Iframe Security

### 2.1 Sandbox Configuration
- **Q**: The plan omits `allow-same-origin` from the sandbox. This means the
  iframe cannot access any storage APIs. Is this acceptable, or do gen UIs
  need localStorage for state persistence? If needed, state could be
  persisted through the host bridge instead.
- **A:** Acceptable — omit `allow-same-origin`. Gen UIs that need state persistence use the host bridge protocol: `{ type: 'state:save', key: 'formData', value: {...} }` and `{ type: 'state:load', key: 'formData' }`. The host stores gen UI state in the `GenUIStore` (MobX domain store — this is backend-linked domain data, not simple UI state) with `@observable` state map and `@action` save/load methods, keyed by gen UI ID, provided via RootStore context. This is more secure than granting storage access and provides the host with visibility into gen UI state.

- **Q**: Should `allow-forms` be always included or only for input-type gen
  UIs? Removing `allow-forms` prevents `<form>` submissions, but forms could
  use `event.preventDefault()` + `postMessage` instead.
- **A:** Always include `allow-forms` in the sandbox. Many gen UIs will contain forms (the primary use case is structured data input). Requiring `event.preventDefault()` on every form is fragile — a missed handler causes a sandbox violation error. The `allow-forms` permission is low-risk since the iframe has no network access (`connect-src 'none'`), so form submissions go nowhere.

- **Q**: Should the CSP `connect-src` be `'none'` for all gen UIs, or should
  readout gen UIs be allowed to fetch data from a whitelisted API?
- **A:** `connect-src 'none'` for all gen UIs. If a gen UI needs server data, it requests it through the host bridge (`{ type: 'data:request', endpoint: '/api/specs/123' }`), and the host proxies the request with proper authentication. This prevents gen UIs from making unauthorized API calls and provides a single audit point for all data access.

### 2.2 Code Safety
- **Q**: How rigorously should agent-generated code be scanned for security
  issues? Static analysis only, or also dynamic analysis (run in a sandbox
  and monitor behavior)?
- **A:** Static analysis on build. Run ESLint with security-focused rules (`no-eval`, `no-implied-eval`, `no-new-Function`) and scan for dangerous patterns (inline event handlers with `javascript:`, `document.cookie` access, `XMLHttpRequest`/`fetch` usage). No dynamic analysis — the iframe sandbox already constrains runtime behavior. Static analysis catches intentional abuse; the sandbox prevents accidental damage.

- **Q**: Should there be a manual review step before a gen UI is made
  available to the user, or is automated validation sufficient?
- **A:** Automated validation is sufficient for the default flow. The agent generates code, the server builds it, static analysis runs, and if it passes, it's available immediately. A "Report issue" button on each gen UI lets users flag problems. For high-sensitivity deployments, an admin setting can enable mandatory review (gen UIs are marked "pending review" until approved).

- **Q**: What happens if a gen UI is found to contain malicious code after
  it has already been used? Should there be a "quarantine" mechanism?
- **A:** Yes. Admins can quarantine a gen UI, which immediately disables its iframe (replaces with a "This component has been disabled" message), preserves the source code for investigation, and notifies the gen UI's linked spec author. Quarantined gen UIs remain in the registry but cannot be loaded. The quarantine flag is stored in the gen UI metadata.

---

## 3. Agent Integration

### 3.1 Gen UI Generation
- **Q**: What prompting strategy should the agent use to generate gen UI
  code? Should there be detailed templates and examples in the agent's
  system prompt, or should the agent learn from existing gen UIs in the
  project?
- **A:** Detailed templates in the system prompt. Provide the agent with: a gen UI project scaffold (package.json, vite.config, main.tsx boilerplate), the bridge protocol API reference, 3-4 example gen UIs covering common patterns (form, data display, interactive wizard), and BEM SCSS conventions. The agent can also reference existing project gen UIs for style consistency, but the templates are the primary guide.

- **Q**: Should the agent be able to use external code libraries (fetched
  from npm) in gen UI projects, or only the allowlisted dependencies?
- **A:** Allowlisted dependencies only. The allowlist includes: React, React DOM, a small utility library (lodash-es subset or custom), and a charting library (recharts or lightweight alternative). Adding npm packages in gen UIs requires server-side `bun install`, which is a security surface. The allowlist is configurable by admins and can be expanded per project.

- **Q**: How should the agent handle gen UI failures? Should it automatically
  attempt to fix build errors, or report the error to the user and wait for
  guidance?
- **A:** Automatically attempt to fix, up to 3 retries. If the build fails, the agent receives the error output, attempts a fix, and rebuilds. After 3 failed attempts, the agent reports the error to the user in the chat with the error details and asks for guidance. This mirrors how a human developer would iterate on build errors before asking for help.

- **Q**: Should the agent test gen UIs by "using" them (simulating
  interaction) before presenting to the user?
- **A:** Yes, basic smoke testing. After a successful build, the server loads the gen UI in a headless browser, waits for the `ready` message via the bridge protocol, and verifies no console errors occur within 3 seconds. If the smoke test fails, the agent is notified and can attempt a fix. No full interaction simulation — that's too complex and slow.

### 3.2 Data Flow
- **Q**: When a gen UI sends output data (user's form submission), how
  should the agent process it? Automatically create specs, or present the
  output to the user in the chat for review?
- **A:** Present the output to the user in the chat for review first. The agent formats the gen UI output as a spec proposal message in the chat: "Based on your input in [Gen UI Name], I'd like to create the following spec: [preview]. Accept or modify?" The user reviews and accepts/modifies before any spec creation. No automatic spec creation from gen UI output — human-in-the-loop is a core principle.

- **Q**: Should gen UI output data be stored permanently (for audit/replay),
  or only kept for the duration of the agent session?
- **A:** Stored permanently as part of the chat session history. Each gen UI output event is logged as a chat message of type `gen-ui-output` with the full data payload. Since chat history is persisted as a reference log (per PRD), gen UI outputs are naturally preserved. This provides audit trail and allows revisiting past interactions.

- **Q**: How should the agent handle gen UI outputs that conflict with
  existing specs? Propose a merge, overwrite, or flag for review?
- **A:** Flag for review in the chat. The agent detects the conflict, presents both versions (existing spec content vs. gen UI output) as a side-by-side comparison in the chat, and asks the user to choose: merge, overwrite existing, or discard the new output. The agent may suggest a merged version, but the user makes the final decision.

---

## 4. Build Pipeline

### 4.1 Build Process
- **Q**: Should gen UI builds happen on the server (in a controlled
  environment) or on the client (in the browser)? Server builds are more
  secure and consistent; client builds are faster for the user.
- **A:** Server-side builds exclusively. The server runs `bun build` in an isolated directory for each gen UI project. Server builds ensure consistent output, enable static analysis, and prevent the client from executing arbitrary build scripts. The client receives only the built `dist/` output served as static files.

- **Q**: What is the maximum acceptable build time for a gen UI project?
  Under 10 seconds? Under 30 seconds?
- **A:** Under 10 seconds target, 30 seconds hard timeout. Most gen UI projects are small (1-3 files, <500 lines) and build in 2-5 seconds with Bun. A progress indicator shows build status in the chat. If the build exceeds 30 seconds, it's killed and the agent is notified of the timeout. Builds are queued and processed sequentially to avoid resource contention.

- **Q**: Should gen UI projects use the same version of React as the host
  app, or can they use any version? Version mismatch could cause issues if
  we ever share modules.
- **A:** Same major version of React as the host app (React 18.x initially). The gen UI scaffold template pins the React version. Since gen UIs bundle their own React (no module sharing), minor version differences are acceptable. Locking the major version ensures the agent's code generation templates produce compatible code.

- **Q**: Should build artifacts (dist/) be committed to git, or built on
  demand? Committing ensures reproducibility but increases repo size.
- **A:** Built on demand, not committed to git. The gen UI source code is committed; `dist/` is in `.gitignore`. The server rebuilds gen UIs when needed (on first access after a branch switch, or when source changes). Built artifacts are cached on the server filesystem. This keeps the git repo lean — gen UIs are potentially numerous and their dist/ output is redundant with source.

### 4.2 Build Environment
- **Q**: Should the build environment be isolated (Docker container, VM) for
  security, or is running in the server process acceptable?
- **A:** Isolated subprocess with restricted permissions. Run `bun build` in a subprocess with: a temp directory for output, a timeout (30s), no network access during build (dependencies are pre-installed), and restricted file system access (only the gen UI project directory). Full Docker isolation is overkill for MVP — the subprocess restrictions plus iframe sandboxing provide defense in depth.

- **Q**: Should there be a build queue to prevent multiple simultaneous
  builds from overwhelming the server?
- **A:** Yes. A FIFO build queue with a concurrency limit of 2 simultaneous builds. Additional build requests are queued with their position shown in the chat ("Build queued, position 3"). This prevents CPU spikes from parallel builds while allowing reasonable throughput. The queue is in-memory (no persistence needed — queued builds are retried on server restart).

---

## 5. Communication Protocol

### 5.1 Message Design
- **Q**: Should the host-iframe communication protocol support streaming
  (for large data transfers), or is single-message sufficient?
- **A:** Single-message is sufficient. Gen UI data payloads are small (form data, UI state) — typically under 10KB. If a gen UI needs to send large content (e.g., a long text input), the bridge protocol accepts messages up to 1MB. No streaming needed. For truly large data (images), use a file upload through the host bridge rather than postMessage.

- **Q**: Should the protocol include versioning (to handle gen UIs built
  against different protocol versions)?
- **A:** Yes. Every bridge message includes a `protocolVersion: 1` field. The host checks the version and adapts behavior if needed. Gen UI projects include the protocol version in their scaffold boilerplate. When the protocol evolves, old gen UIs continue to work via backward-compatible handling. Breaking changes increment the major version and trigger a rebuild prompt.

- **Q**: Should there be a maximum message size? If so, what limit (1MB,
  5MB)? Large payloads might be needed for rich spec content.
- **A:** 1MB maximum per message. This covers all practical use cases (form data, rich text content, JSON payloads). Messages exceeding 1MB are rejected with an error sent back to the gen UI. If larger transfers are ever needed, implement chunked transfer in a future protocol version. 1MB is well within `postMessage` performance limits.

- **Q**: Should the protocol support binary data (for images/files), or only
  JSON-serializable data?
- **A:** JSON-serializable data only. Images/files from gen UIs are sent as base64-encoded strings within JSON messages (up to the 1MB limit). For larger files, the gen UI sends a request through the bridge, and the host handles the upload via a standard API call. This keeps the protocol simple and debuggable. Binary `Transferable` objects add complexity with minimal benefit.

### 5.2 Error Handling
- **Q**: How should the host handle messages from a gen UI that it doesn't
  recognize? Silently ignore, log a warning, or show an error?
- **A:** Log a warning to the console in development mode (`import.meta.env.DEV`), silently ignore in production. Unrecognized messages are not shown to users — they're likely from a protocol version mismatch or a bug in the gen UI code. The warning in dev mode helps the agent debug issues during gen UI development.

- **Q**: Should there be a "debug mode" for gen UI communication that logs
  all messages for developer inspection?
- **A:** Yes. A `debugBridge: true` flag in the gen UI iframe component enables verbose logging of all postMessage traffic to the browser console (both directions: host→iframe and iframe→host). Toggled via a developer setting or URL parameter (`?debugGenUi=true`). The log includes timestamps, message types, and payload previews (truncated to 500 chars). Disabled by default in production.

---

## 6. User Experience

### 6.1 Gen UI Discovery
- **Q**: How should users discover available gen UIs? A browsable gallery,
  search, agent recommendation, or all of the above?
- **A:** All of the above. The gen UI gallery page (`/gen-ui`) provides browsable discovery with search and filtering by linked spec/document. In chat, the agent can recommend existing gen UIs when relevant ("I have a form for this — want to use it?"). Gen UIs linked to a spec are shown in the spec's metadata panel. The gallery is the primary browsing interface; chat is the contextual discovery path.

- **Q**: Should gen UIs have thumbnails/previews? If so, how are they
  generated — screenshot on build, or placeholder based on type?
- **A:** Screenshot on build. After a successful build and smoke test, the server captures a 400x300 screenshot of the gen UI in a headless browser and stores it alongside the build artifacts. This provides accurate visual previews in the gallery. If the screenshot fails, use a generic placeholder icon based on the gen UI's declared type (form, display, interactive).

- **Q**: Should there be "featured" or "template" gen UIs that are available
  to all projects?
- **A:** Yes. A set of 5-8 system-provided template gen UIs ships with the platform: "Survey Form," "Requirements Checklist," "Priority Matrix," "Comparison Table," "Decision Tree," "Data Entry Form." These appear in the gen UI gallery under a "Templates" section. The agent can instantiate them with project-specific content. Templates are read-only; using one creates a copy.

### 6.2 Gen UI Interaction
- **Q**: Should gen UIs support undo/redo for user inputs?
- **A:** This is the gen UI's responsibility, not the host's. The bridge protocol does not provide undo/redo. If a gen UI needs undo (e.g., a complex form builder), the agent should implement it within the gen UI code. Simple forms don't need undo — the browser's native input undo (Cmd+Z) works within the iframe.

- **Q**: Should gen UIs be resizable by the user (drag to resize the iframe),
  or fixed-size?
- **A:** Resizable vertically via a drag handle at the bottom of the iframe container. Horizontal width is always 100% of the parent container. Min height: 200px, max height: 800px, default: 400px. The user's preferred height per gen UI is stored in localStorage. A fullscreen button provides maximum space when needed.

- **Q**: Should there be a "fullscreen" mode for gen UIs that need more space
  (e.g., complex form builders)?
- **A:** Yes. A fullscreen button in the gen UI container header opens the gen UI in a modal overlay that fills the viewport with 32px padding. The modal includes the gen UI title, a close button, and the iframe at full available size. This is essential for complex gen UIs (multi-step wizards, large forms, data tables) that don't fit in a 400px panel.

### 6.3 Gen UI Lifecycle
- **Q**: When should gen UIs be deleted? Never (manual only), after linked
  specs are deleted, after a period of inactivity, or when storage quota is
  reached?
- **A:** Manual deletion only. Gen UIs are persistent artifacts (per PRD: "NOT ephemeral"). When a linked spec is deleted, the gen UI is unlinked but preserved — it may still be valuable for reference or re-linking. Admins can bulk-delete gen UIs older than a configurable age via a maintenance tool. No automatic deletion based on inactivity.

- **Q**: Should gen UIs be exportable (download the project as a zip)?
- **A:** Yes. An "Export" button on each gen UI downloads a zip containing the full source code, `package.json`, and build configuration. This lets users port the gen UI to external projects or inspect the agent's generated code. The export excludes `node_modules/` and `dist/` — only source files.

- **Q**: Should gen UIs be clonable (copy and modify for a different purpose)?
- **A:** Yes. A "Clone" action creates a copy of the gen UI source under a new ID, linked to no spec initially. The user (or agent) can then modify the clone. This enables iterative development: clone an existing form, tweak it for a new use case. Cloned gen UIs appear in the gallery with a "Cloned from [Original Name]" badge.

---

## 7. Performance

- **Q**: What is the expected number of gen UI projects per user? 5? 50? 500?
  This affects registry design and storage planning.
- **A:** Plan for 50-100 gen UIs per project (not per user). Most projects will have 10-30 gen UIs. The registry is a simple database table indexed by project ID, gen UI ID, and linked spec ID. Storage planning: ~5MB average per gen UI (source + dist + thumbnail), so 100 gen UIs ≈ 500MB per project. Set a default quota of 200 gen UIs per project, configurable by admins.

- **Q**: How quickly should a gen UI load once the user clicks to open it?
  Under 2 seconds? Under 5 seconds?
- **A:** Under 2 seconds from click to interactive. The `dist/` output is pre-built static files served directly by the server (no build step on load). Most gen UIs will load in under 1 second. The iframe shows a loading spinner while the gen UI initializes. If the gen UI hasn't sent a `ready` message within 5 seconds, show a "Taking longer than expected" warning with a reload button.

- **Q**: Should gen UI iframes be pre-created (hidden, ready to display) for
  frequently used gen UIs, or always created on demand?
- **A:** Always created on demand. Pre-creating iframes wastes memory and the 2-second load target is achievable without pre-creation. The only optimization: when a chat message with a gen UI embed scrolls into view, start loading the iframe immediately (intersection observer with 200px rootMargin for look-ahead). Destroy iframes when scrolled out of view.

- **Q**: Should there be a limit on how many gen UI iframes can be active
  (rendered in DOM) simultaneously? Each iframe has memory overhead.
- **A:** Maximum 3 active iframes simultaneously. When a 4th iframe needs to load, the least recently interacted iframe is destroyed (its state is preserved via the bridge state:save protocol if needed). In the chat panel, only the most recently scrolled-into-view gen UI iframe is active; others show their static thumbnail. This keeps memory usage predictable.

---

## 8. Storage & Versioning

- **Q**: Should gen UI source code be version-controlled alongside the
  knowledge graph, or in a separate tracking mechanism?
- **A:** Version-controlled alongside the knowledge graph in the same git repository. Gen UI source lives in `client/gen/{user}/{generated-ui}/` as specified by the PRD. Changes to gen UI source are committed when the agent generates or updates them. This means gen UIs participate in branching and merging just like specs.

- **Q**: Should gen UI `dist/` output be committed to git, or regenerated
  from source on demand?
- **A:** Regenerated from source on demand. `dist/` directories are in `.gitignore`. The server rebuilds from source when needed (first access, after source change, after branch switch). Built output is cached on the server filesystem until invalidated. This keeps the git history clean and avoids large binary diffs.

- **Q**: When a linked spec is reverted to a previous version, should the
  gen UI also revert (if it was updated when the spec changed)?
- **A:** No automatic gen UI revert. Spec reversion and gen UI versioning are independent — a spec may have been updated for reasons unrelated to the gen UI. If the user wants to revert the gen UI too, they do so explicitly from the gen UI's version history. The agent can suggest reverting the gen UI if it detects the versions were linked.

- **Q**: How should gen UI projects be handled during branch switching?
  Should they follow the branch, or exist globally?
- **A:** Follow the branch. Gen UI source code is in git, so switching branches switches to that branch's version of the gen UI source. The server-cached `dist/` output is invalidated on branch switch and rebuilt on next access. This is consistent with how specs behave — everything in the knowledge set follows the branch.

---

## Decision Log

> Record decisions as questions are resolved.

| Date | Question | Decision | Rationale |
|------|----------|----------|-----------|
| — | — | — | — |
