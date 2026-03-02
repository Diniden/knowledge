# 02-FRONTEND / 05 — CHAT DIALOG: Open Questions

> **Purpose**: Unresolved questions about the chat dialog UI including panel
> behavior, message types, agent interaction, user input, and multi-user
> features. Answers may change tasks in the plan.

---

## 1. Panel Behavior

### 1.1 "Always Visible"

- **Q**: The PRD says the chat dialog "will always be visible." Does this mean
  the panel takes up screen space at all times, or can it be minimized to an
  icon? On a 1280px-wide screen, a 380px chat panel leaves only 900px for
  content — is that acceptable?
- **A:** The chat can be minimized to a slim 40px vertical tab on the right edge. "Always visible" means always accessible with zero navigation — the minimized tab is always present, and Cmd+K instantly expands it. On 1280px screens, the default state is minimized (showing the tab). On ≥1920px screens, the chat can default to expanded. This preserves content space while keeping chat one click/keystroke away.

- **Q**: Should the chat panel be detachable (pop out to a separate window)?
  This would give more screen real estate to the editor while keeping chat
  accessible.
- **A:** No. Pop-out windows break the single-app mental model, complicate state synchronization, and don't work on all platforms equally. The minimize-to-tab + Cmd+K pattern provides sufficient screen real estate management. Users with multi-monitor setups can open a second browser tab with the chat route if needed.

- **Q**: When the user is in fullscreen editor mode or fullscreen graph mode,
  should the chat panel still be visible?
- **A:** The minimized chat tab (40px) remains visible in all modes — including focus mode. This is the "always visible" contract. Cmd+K expands the chat as an overlay on top of the fullscreen content rather than shrinking the content. Pressing Escape or clicking outside the overlay returns to the minimized tab.

### 1.2 Docking Position

- **Q**: Should the chat panel always be on the right side, or should users
  be able to dock it on the left or bottom?
- **A:** Always on the right side. The left side is occupied by the document tree sidebar, and the bottom position doesn't work well for a chat interface (vertical message lists need height, not width). Fixed positioning simplifies the layout system and creates a consistent spatial model: sidebar left, content center, chat right.

- **Q**: Should the chat panel remember its collapsed/expanded state between
  page reloads?
- **A:** Yes. The expanded/minimized state and the panel width (if customized by dragging) are `@observable` properties in the MobX UILayoutStore, persisted to localStorage via `reaction()` (the store hydrates from localStorage in its constructor). On reload, the chat panel restores to its previous state. This prevents the annoying experience of re-expanding the chat every session.

- **Q**: Should there be a keyboard shortcut to cycle through chat panel
  states (expanded → collapsed → minimized → expanded)?
- **A:** Two shortcuts, not a cycle. Cmd+K: toggles between minimized ↔ expanded (and focuses the input when expanding). Cmd+Shift+K: collapses to minimized from any state. No cycling — two discrete shortcuts are more predictable than cycling through states where you lose track of which press does what.

---

## 2. Chat Sessions

### 2.1 Session Model

- **Q**: Should there be one active session at a time, or can the user have
  multiple concurrent sessions (tabbed)? The PRD seems to imply single
  session, but multiple might be useful.
- **A:** One active session at a time. Multiple sessions fragment the agent's context and create confusion about which conversation is "current." Past sessions are archived and accessible via a "History" button in the chat header. Starting a "New session" archives the current one. The active session persists across all navigation within the app.

- **Q**: When the user navigates to a different document, should the agent
  session context update automatically, or should a new session be started?
- **A:** Context updates automatically — no new session. The agent always knows what the user is currently viewing (document, spec, graph viewport) via context metadata sent with each message. Navigating to a different document is seamless: the agent can reference both the new and previous context. Sessions are long-lived across an entire work period.

- **Q**: Should sessions have explicit names/titles, or are they identified
  only by date and first message?
- **A:** Auto-generated title from the first message (truncated to 60 chars), plus the start date. Users can rename sessions from the history list. The agent can also suggest a title when the session reaches a natural conclusion. Session titles make history browsable: "Refactoring auth specs - Feb 28" is more useful than a timestamp alone.

### 2.2 Session Context

- **Q**: What context data should be sent with each message? Only the current
  view (document/spec/graph), or also recent navigation history?
- **A:** Current view context (active document ID, selected spec ID, visible graph viewport bounds) plus the last 5 navigation events (so the agent knows what the user just looked at). Also include: current branch name, any active inquiry queue items, and whether the user has unsaved editor changes. This gives the agent rich situational awareness without overwhelming the context window.

- **Q**: Should the agent see the full spec content of the current view, or
  just the ID (and fetch content via MCP tools)?
- **A:** Just the IDs in the context metadata. The agent fetches full content via server-side tools when needed. Sending full spec content with every message wastes tokens when the agent doesn't need the content (e.g., the user asks a general question). The agent can request specific spec content on demand, which is more efficient.

- **Q**: How much conversation history should the agent see per request?
  Last N messages, full session, or a summary of the session?
- **A:** Last 20 messages as full content, plus a system-generated summary of older messages in the session. The summary is created by the agent every 20 messages ("Conversation so far: discussed auth spec restructuring, created 3 new specs, resolved 1 contradiction..."). This balances context richness with token efficiency for long sessions.

---

## 3. Message Types

### 3.1 Message Complexity

- **Q**: What is the full enumeration of message types the system needs to
  support? The plan lists 8+ types. Are there others we haven't considered?
- **A:** Full message type list: `text` (markdown), `interactive` (buttons/forms from agent), `graph-link` (clickable spec/edge references), `code-block` (syntax-highlighted code), `gen-ui-embed` (iframe gen UI), `spec-proposal` (diff with accept/reject), `image` (attached/generated), `file` (downloadable attachment), `status` (system events: "Branch switched to feature-x"), `inquiry` (agent-flagged issue needing input), `gen-ui-output` (data received from gen UI interaction), and `error` (agent error with retry option).

- **Q**: Should messages support a combination of types? For example, a
  message that contains both text, a code block, AND interactive buttons?
  Or should each message be a single type?
- **A:** Messages support combined content blocks. A single message is an array of content blocks, each with its own type: `[{ type: 'text', content: '...' }, { type: 'code-block', language: 'ts', content: '...' }, { type: 'interactive', buttons: [...] }]`. This allows the agent to compose rich messages naturally. The chat renderer maps each block to its component.

- **Q**: Should agent messages support "streamed" delivery (text appearing
  word-by-word as the agent generates it), or should they arrive complete?
- **A:** Streamed delivery for text blocks. Agent text appears token-by-token as it's generated, via incremental WebSocket messages. Non-text blocks (interactive, spec-proposal, gen-ui-embed) arrive complete after the text stream finishes. The streaming creates a responsive feel and lets users start reading before the full response is generated. A "Stop generating" button appears during streaming.

### 3.2 Interactive Messages

- **Q**: When the user clicks an action button (e.g., "Accept spec proposal"),
  should the action happen immediately or show a confirmation first?
  Immediate is faster; confirmation is safer.
- **A:** Immediate for low-risk actions (accept suggestion, dismiss, "tell me more"). Confirmation dialog for high-risk actions (accept spec proposal that modifies existing content, delete, revert). The agent's message schema includes a `requiresConfirmation: boolean` flag per button. Confirmation shows a brief modal: "Apply this change to [Spec Name]? This will modify 3 paragraphs. [Cancel] [Apply]".

- **Q**: Should interactive messages have a default timeout? If the agent
  sends a proposal and the user doesn't respond for an hour, should the
  proposal expire?
- **A:** No time-based expiration. Proposals remain actionable until logically superseded by a newer proposal for the same spec, or until the underlying spec changes. Users may step away and return to review proposals — time-based expiry would force them to re-request proposals. Superseded proposals are marked as such with disabled buttons and a "Superseded by newer proposal" label.

- **Q**: Can the user interact with old messages, or only the most recent
  interactive message? For example, if the agent sent two proposals, can the
  user accept both?
- **A:** Users can interact with any non-expired interactive message. If the agent sent proposals for two different specs, both are independently actionable. If two proposals target the same spec, accepting one supersedes the other. The chat clearly shows the status of each proposal (active, accepted, rejected, superseded).

---

## 4. Agent Interaction

### 4.1 Agent Behavior

- **Q**: Should the agent proactively send messages (without user prompt)?
  For example: "I noticed you modified Spec A, which is related to Spec B.
  Would you like me to review the impact?" This is powerful but could be
  noisy.
- **A:** Yes, but with rate limiting and user control. Proactive messages are limited to: spec save events that affect graph edges, inquiry queue items, and build completion notifications. Maximum 1 proactive message per 5 minutes to avoid noise. Users can disable proactive messages entirely in settings. Proactive messages appear with a distinct "Agent suggestion" visual treatment (subtle background, different icon).

- **Q**: If the agent is thinking for more than 30 seconds, should there be
  a "cancel" button? What about 60 seconds? 5 minutes?
- **A:** Cancel button appears immediately when the agent starts thinking. A "Thinking..." indicator with elapsed time shows from the start. At 30 seconds, the indicator adds a "This is taking longer than usual" note. At 2 minutes, a more prominent "Still working — [Cancel]" banner appears. The cancel button is always available. Cancel sends an abort signal to the server, which terminates the agent task.

- **Q**: Should the agent's thinking indicator show real progress steps, or
  just a generic "thinking" animation? Real steps require the agent to report
  progress.
- **A:** Both. Default is a bouncing dots animation. When the agent reports progress steps via WebSocket (e.g., "Analyzing dependencies...", "Generating proposal...", "Building gen UI..."), the dots are replaced with the current step label and a subtle progress animation. The agent is encouraged to report steps for operations >5 seconds, but the UI gracefully falls back to dots if no steps are reported.

### 4.2 Error Handling

- **Q**: If the agent crashes mid-response, should the chat show a partial
  message (what was generated so far) or a clean error message?
- **A:** Show the partial message (what was streamed so far) with a clear error footer: "[Response interrupted] The agent encountered an error. [Retry] [Copy partial response]". This preserves any useful content already generated. The partial message is styled with a subtle red-orange left border to indicate it's incomplete.

- **Q**: Should agent errors be reported to the user inline in chat, or as
  system-level notifications (toast/banner)?
- **A:** Inline in chat as an `error` message type. The error message shows in the conversation flow with a red-orange accent, the error description, and a "Retry" button. This keeps the error in context of the conversation that caused it. System-level toasts are reserved for infrastructure issues (WebSocket disconnected, server unreachable) that aren't specific to a conversation.

- **Q**: Should there be an automatic retry mechanism for failed agent
  requests, or should the user always manually retry?
- **A:** Manual retry via the "Retry" button on the error message. No automatic retry — agent failures may be caused by the request itself (ambiguous prompt, impossible task), and automatic retry wastes resources on the same failing request. The retry button resends the original user message. The user can also modify their message and send a new one instead.

---

## 5. User Input

### 5.1 Input Capabilities

- **Q**: Should the chat input support rich text formatting (bold, italic
  via toolbar), or only plain text / markdown?
- **A:** Plain text with markdown syntax support. Users type markdown (e.g., `**bold**`, `` `code` ``) which renders in the sent message. No formatting toolbar — it takes up space and the target audience (technical professionals) is comfortable with markdown. The input area is a plain textarea with monospace font for markdown editing comfort.

- **Q**: Should the chat input support voice input (speech-to-text)?
- **A:** No. Voice input is not a priority for a desktop-first professional tool. Users will be typing at a keyboard. The browser's native speech-to-text (if enabled by the OS) works in the textarea without any app-level implementation. Voice input can be considered as a future accessibility enhancement.

- **Q**: Should the chat input have a character or word limit? Some agent
  APIs have context limits.
- **A:** Soft limit of 4,000 characters per message, displayed as a counter in the bottom-right of the input area (shows "234 / 4000" when approaching the limit). Exceeding the limit shows a warning but allows sending — the server/agent handles truncation if needed. This prevents users from accidentally pasting enormous content while allowing flexibility.

### 5.2 Slash Commands

- **Q**: What is the complete set of slash commands? Should commands be
  hardcoded, or should the agent be able to register custom commands?
- **A:** Hardcoded initial set with agent-extensible custom commands. Built-in: `/new-spec`, `/split-spec`, `/link [specId]`, `/graph [specId]`, `/version [specId]`, `/gen-ui [action]`, `/help`, `/clear` (clear chat display, history preserved), `/export`. The agent can register project-specific commands via the WebSocket protocol, which appear in the autocomplete menu with an "Agent" badge.

- **Q**: Should slash commands be visually distinct in the sent message
  (highlighted differently from regular text)?
- **A:** Yes. Slash commands render as styled chips/badges in the sent message (monospace font, subtle background pill, primary color text). The command portion is visually distinct from any accompanying text. This makes it clear what action was invoked when reviewing chat history.

- **Q**: Should there be an "admin" set of slash commands for power users?
- **A:** No separate admin commands in chat. Admin functions (user management, system settings, gen UI quarantine) are in the Settings page. The chat is for knowledge work, not system administration. Power-user commands (like `/export` or `/clear`) are available to all users.

### 5.3 File Attachments

- **Q**: What file types should be supported for attachment? The PRD mentions
  mixed media (images, video, audio, documents). Should all be supported in
  chat?
- **A:** Images (PNG, JPEG, GIF, WebP, SVG), documents (PDF, Markdown, plain text), and structured data (JSON, CSV). No video or audio in chat — they're too large and the agent can't process them meaningfully. Media referenced in specs (video, audio) is handled at the spec level, not through chat. File type validation happens client-side before upload.

- **Q**: What is the maximum file size for chat attachments? Should it differ
  by file type?
- **A:** 10MB maximum for all file types. Images are recommended under 5MB (the UI shows a warning above 5MB suggesting compression). PDFs under 10MB. No per-type differentiation — a single limit is simpler to communicate and enforce. Files above 10MB are rejected with "File too large (10MB max). Consider compressing or linking to external storage."

- **Q**: How should large files be handled? Upload immediately or only when
  the message is sent?
- **A:** Upload immediately on attachment (before message send). Show an upload progress bar on the attached file preview. Once uploaded, the file is stored server-side and a reference ID is attached to the message when sent. This prevents the user from waiting for both upload and agent processing when they hit send. Failed uploads are retried or removed before sending.

---

## 6. Graph Integration

### 6.1 Spec Links

- **Q**: How should spec references in messages be formatted? As plain text
  links, as styled chips/badges, or as expandable cards?
- **A:** Styled chips/badges. Spec references render as inline pills showing the spec title (truncated to 30 chars) with a small node icon. Hovering a chip shows a tooltip with: full title, parent document name, and tag list. Clicking navigates to the spec in the editor. The chip color matches the spec's category/type color from the graph. This is more scannable than plain links or heavyweight cards.

- **Q**: When the user clicks a spec link in a message, should it navigate
  away from the chat, or open a side panel/overlay?
- **A:** Navigate to the spec in the editor (main content area updates) while keeping the chat panel open. The chat stays at the same scroll position so the user can reference the message. If the chat is minimized, it stays minimized — the navigation happens in the editor pane only. This is the default linked behavior; holding Cmd+Click opens the spec in a new browser tab.

- **Q**: Should the chat support "citing" specs — e.g., the agent explains
  something and cites specific specs as evidence?
- **A:** Yes. The agent can include citation references in its messages: numbered inline citations [1], [2] that correspond to spec chips at the bottom of the message (like footnotes). Each citation chip is clickable and navigable. This makes the agent's reasoning traceable back to the knowledge graph, which is central to the system's value.

### 6.2 Graph Visualization

- **Q**: Should the chat be able to embed a mini graph visualization
  (showing a few nodes and edges inline)? This adds significant complexity
  but could be very useful for graph-related discussions.
- **A:** Yes, but as a static image, not an interactive tree. When the agent discusses graph relationships, it can include a server-rendered SVG snapshot of the relevant subgraph (5-10 nodes) as an inline image. Clicking the image opens the full interactive tree view with those nodes as the primary context. This avoids the complexity of embedding an interactive graph tree in a chat message while providing visual context.

- **Q**: When the agent discusses graph changes, should the graph view
  (if visible) update in real-time to highlight the discussed elements?
- **A:** Yes. When the agent's message references specific specs or edges, the graph view (if visible in a side panel) highlights those elements: referenced nodes get a pulsing border, referenced edges get increased thickness. The highlighting persists while the message is in the visible viewport and fades when the user scrolls past. This creates a powerful cross-reference experience.

---

## 7. Multi-User

### 7.1 Dialog Visibility

- **Q**: Per the PRD, users can see other users' dialogs. Should this be opt-in
  (user chooses to share), opt-out (shared by default, can hide), or always
  visible?
- **A:** Shared by default (opt-out). All dialog sessions are visible to team members with full access. Users can mark individual sessions as "private" when starting them. Summary-access users see session titles and timestamps but not message content (per the PRD's permission model). The session history list shows all team sessions with author avatars.

- **Q**: Should dialog viewing show other users' agent interactions in
  real-time (live feed), or only completed sessions?
- **A:** Both. Completed sessions are browsable in the history list. Active sessions from other users appear with a "Live" badge. Clicking an active session shows a read-only live feed of messages appearing in real-time. The viewer cannot interact with the other user's agent. This enables team awareness without interference.

- **Q**: Should there be privacy controls on individual messages within a
  session?
- **A:** No per-message privacy. The granularity is per-session (public or private). Individual message privacy is too complex to manage and creates a confusing experience when reading a conversation with gaps. If a user needs to discuss sensitive content, they start a private session. This keeps the model simple and predictable.

### 7.2 Dialog Forking

- **Q**: When forking a dialog, should the fork include only the messages, or
  also the agent's internal state (so the forked session can continue from
  the same context)?
- **A:** Messages only. The fork creates a new session pre-populated with a copy of the messages up to the fork point. The agent starts fresh in the forked session — it reads the message history for context (like it would with any session) but doesn't inherit internal state. This is simpler and avoids complex agent state serialization/deserialization.

- **Q**: Should the original user be notified when their dialog is forked?
- **A:** Yes, a non-intrusive notification. The original user sees a small system message in their session: "User X forked this conversation at message Y." The notification appears in the chat history, not as a popup or toast. This provides traceability without being disruptive.

- **Q**: Should forked dialogs maintain a link to the original (for
  traceability)?
- **A:** Yes. The forked session's metadata includes `forkedFrom: { sessionId, messageIndex, userId }`. The forked session header shows "Forked from [Original Session Title]" as a clickable link. This enables tracing the lineage of conversations and understanding how ideas evolved.

---

## 8. Performance

- **Q**: How many messages should the chat support in a single session before
  performance degrades? 100? 1,000? 10,000?
- **A:** Target smooth performance up to 1,000 messages per session. Most sessions will have 50-200 messages. At 1,000 messages, the session should still be usable with virtualization. Above 1,000, suggest starting a new session. The agent's session summary mechanism (every 20 messages) keeps context manageable regardless of session length.

- **Q**: Should old messages be virtualized (only render visible ones in the
  DOM) for long sessions?
- **A:** Yes. Use virtualized rendering for sessions exceeding 100 messages. Only messages within the viewport ± 10 messages of buffer are rendered in the DOM. Use `react-virtuoso` for the virtualized list (it handles variable-height items well, which chat messages require). Below 100 messages, render all for simplicity.

- **Q**: Should images in messages be lazy-loaded?
- **A:** Yes. All images use `loading="lazy"` and display a blurred placeholder (tiny base64 thumbnail generated on upload) until the full image loads. Images outside the viewport are not loaded until scrolled into view. This is especially important for sessions with many image attachments from agent responses.

- **Q**: Should there be a "compact mode" that reduces message rendering
  complexity for performance-constrained devices?
- **A:** No dedicated compact mode. Instead, the standard rendering is already efficient (virtualized list, lazy images, on-demand gen UI iframes). If performance issues arise on specific devices, address them through targeted optimizations rather than a degraded UI mode. The app targets desktop browsers which have ample rendering capability.

---

## 9. Persistence & History

- **Q**: How long should chat history be retained? Indefinitely, 90 days,
  configurable per user?
- **A:** Indefinitely by default. Chat history is a reference log (per PRD) and may be valuable for tracing past decisions months later. Admins can configure a retention policy per project (e.g., 365 days for compliance). Users can manually delete their own sessions. Indefinite retention is the safe default — deletion is irreversible.

- **Q**: Should chat history be searchable across all sessions? Full-text
  search adds server-side complexity.
- **A:** Yes, full-text search across all sessions the user has access to. The search UI is a search bar at the top of the session history list. Results show matching message snippets with session context (title, date, author). Search is server-side (backed by PostgreSQL full-text search or a search index). This is essential for finding past decisions and agent recommendations.

- **Q**: Should chat history be exportable? In what formats (markdown, JSON,
  PDF)?
- **A:** Exportable in Markdown and JSON formats. Markdown export produces a readable conversation log with message formatting preserved. JSON export includes full metadata (timestamps, message types, agent state). No PDF — it adds a rendering dependency with limited benefit. Export is per-session via a menu action in the session history list.

- **Q**: Should chat messages be included in the project's git history, or
  stored separately?
- **A:** Stored separately in the database, not in git. Per the PRD, dialog history is a "reference log, not part of KG." Chat data is high-volume, append-only, and doesn't benefit from git's versioning model. It's stored in the server database and associated with the project. Git is reserved for specs, edges, and gen UI source code.

---

## Decision Log

> Record decisions as questions are resolved.

| Date | Question | Decision | Rationale |
| ---- | -------- | -------- | --------- |
| —    | —        | —        | —         |
