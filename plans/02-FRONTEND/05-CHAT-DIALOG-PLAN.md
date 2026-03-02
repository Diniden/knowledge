# 02-FRONTEND / 05 — CHAT DIALOG PLAN

> **Purpose**: Define the complete chat dialog UI including panel layout,
> docking behavior, message types, rendering pipeline, interactive components,
> graph links, agent indicators, message persistence, keyboard shortcuts,
> and user input handling.
>
> **Phase**: 3 (Agent Integration)
> **Dependencies**: `02-FRONTEND/02-COMPONENTS-PLAN.md`, `03-SERVER/06-WEBSOCKET-PLAN.md`, `06-AGENT-SYSTEM/01-ARCHITECTURE-PLAN.md`
> **Estimated tasks**: 130+

---

## Table of Contents

1. [Chat Panel Layout & Docking](#1-chat-panel-layout--docking)
2. [Chat Session Management](#2-chat-session-management)
3. [Message Types & Rendering](#3-message-types--rendering)
4. [Interactive Message Components](#4-interactive-message-components)
5. [Graph Links in Messages](#5-graph-links-in-messages)
6. [Agent Status & Thinking Indicators](#6-agent-status--thinking-indicators)
7. [User Input Area](#7-user-input-area)
8. [Keyboard Shortcuts & Hotkeys](#8-keyboard-shortcuts--hotkeys)
9. [Message History & Persistence](#9-message-history--persistence)
10. [Multi-User Dialog Features](#10-multi-user-dialog-features)
11. [Notifications & Alerts](#11-notifications--alerts)
12. [Accessibility](#12-accessibility)

---

## 1. Chat Panel Layout & Docking

### 1.1 Panel Structure

- [ ] **FE-CHAT-001**: Implement `ChatPanel` as a docked right-side panel
  - Always visible in the application layout (per PRD)
  - Default width: 380px (configurable)
  - Minimum width: 300px
  - Maximum width: 600px
  - Full height of the viewport (below header)
- [ ] **FE-CHAT-002**: Implement panel resize via drag handle
  - Left-edge drag handle to resize panel width
  - Visual indicator on hover (highlight bar)
  - Double-click handle to reset to default width
  - Persist final width in UILayoutStore (application-level preference); drag-in-progress state is local component state
- [ ] **FE-CHAT-003**: Implement panel collapse/expand
  - Collapse to a thin strip (icon + "Chat" label)
  - Expand button on collapsed strip
  - Keyboard shortcut to toggle (Ctrl+B or similar)
  - Animation: slide in/out from right edge
- [ ] **FE-CHAT-004**: Implement panel minimization
  - Minimize to a floating chat icon in bottom-right corner
  - Show unread message count badge on icon
  - Click icon to restore panel
  - Minimize on mobile by default
- [ ] **FE-CHAT-005**: Implement fullscreen mode for chat
  - Toggle button to expand chat to full viewport
  - All other panels hidden
  - Return to docked mode via button or Escape key

### 1.2 Panel Internal Layout

- [ ] **FE-CHAT-006**: Define internal chat panel layout
  - Header: session info, actions, connection status
  - Body: scrollable message list (flex-grow, overflow-y)
  - Footer: input area (fixed at bottom)
- [ ] **FE-CHAT-007**: Implement chat header
  - Left: session title / agent type label
  - Right: action buttons (new session, history, minimize, settings)
  - Connection status dot (green/yellow/red)
  - Compact design — single row, no excessive height
- [ ] **FE-CHAT-008**: Implement chat body scroll behavior
  - Auto-scroll to bottom on new messages (if already at bottom)
  - If user scrolled up, don't auto-scroll (show "new messages" indicator)
  - Smooth scroll animation for auto-scroll
  - Scroll-to-bottom button when scrolled up

### 1.3 Responsive Behavior

- [ ] **FE-CHAT-009**: Implement tablet layout for chat
  - Chat panel as a slideover drawer from right
  - Toggle with button in header
  - Backdrop overlay when open
  - Swipe left to close
- [ ] **FE-CHAT-010**: Implement mobile layout for chat
  - Full-screen overlay accessed from bottom navigation
  - Floating action button (FAB) when not in chat
  - Unread badge on FAB
  - Back button to return to previous view

#### Design Decisions

> **Q**: The PRD says the chat dialog "will always be visible." Does this mean the panel takes up screen space at all times, or can it be minimized to an icon? On a 1280px-wide screen, a 380px chat panel leaves only 900px for content — is that acceptable?
> **A**: The chat can be minimized to a slim 40px vertical tab on the right edge. "Always visible" means always accessible with zero navigation — the minimized tab is always present, and Cmd+K instantly expands it. On 1280px screens, the default state is minimized (showing the tab). On ≥1920px screens, the chat can default to expanded. This preserves content space while keeping chat one click/keystroke away.

> **Q**: Should the chat panel be detachable (pop out to a separate window)? This would give more screen real estate to the editor while keeping chat accessible.
> **A**: No. Pop-out windows break the single-app mental model, complicate state synchronization, and don't work on all platforms equally. The minimize-to-tab + Cmd+K pattern provides sufficient screen real estate management. Users with multi-monitor setups can open a second browser tab with the chat route if needed.

> **Q**: When the user is in fullscreen editor mode or fullscreen graph mode, should the chat panel still be visible?
> **A**: The minimized chat tab (40px) remains visible in all modes — including focus mode. This is the "always visible" contract. Cmd+K expands the chat as an overlay on top of the fullscreen content rather than shrinking the content. Pressing Escape or clicking outside the overlay returns to the minimized tab.

> **Q**: Should the chat panel always be on the right side, or should users be able to dock it on the left or bottom?
> **A**: Always on the right side. The left side is occupied by the document tree sidebar, and the bottom position doesn't work well for a chat interface (vertical message lists need height, not width). Fixed positioning simplifies the layout system and creates a consistent spatial model: sidebar left, content center, chat right.

> **Q**: Should the chat panel remember its collapsed/expanded state between page reloads?
> **A**: Yes. The expanded/minimized state and the panel width (if customized by dragging) are `@observable` properties in the MobX UILayoutStore, persisted to localStorage via `reaction()` (the store hydrates from localStorage in its constructor). On reload, the chat panel restores to its previous state. This prevents the annoying experience of re-expanding the chat every session.

> **Q**: Should there be a keyboard shortcut to cycle through chat panel states (expanded → collapsed → minimized → expanded)?
> **A**: Two shortcuts, not a cycle. Cmd+K: toggles between minimized ↔ expanded (and focuses the input when expanding). Cmd+Shift+K: collapses to minimized from any state. No cycling — two discrete shortcuts are more predictable than cycling through states where you lose track of which press does what.

---

## 2. Chat Session Management

### 2.1 Session Lifecycle

- [ ] **FE-CHAT-011**: Implement chat session creation
  - "New Session" button in chat header
  - Send context to server: current document, current spec, current graph view
  - Server creates agent session and returns session ID
  - WebSocket subscribes to session events
  - Initial system message: "How can I help you with [current context]?"
- [ ] **FE-CHAT-012**: Implement session context tracking
  - Automatically include user's current context with each message:
    - Active document ID
    - Active spec ID
    - Active graph node IDs (if graph is open)
    - Current view (editor, graph, versions)
  - Update context when user navigates
  - Show context indicator in chat (e.g., "Context: Spec Document X")
- [ ] **FE-CHAT-013**: Implement session ending
  - "End session" option in header dropdown
  - Confirm dialog: "End this session? You can start a new one anytime."
  - Persist final session state
  - Agent session cleanup on server
- [ ] **FE-CHAT-014**: Implement session resumption
  - On page reload, restore the active session
  - Reconnect WebSocket to existing session
  - Load recent messages from history
  - Resume agent state if agent was processing

### 2.2 Session List

- [ ] **FE-CHAT-015**: Implement session history panel
  - Accessible via "History" button in chat header
  - List of past sessions: date, first message preview, agent type, message count
  - Search sessions by message content
  - Click to view session transcript (read-only)
  - Delete session option
- [ ] **FE-CHAT-016**: Implement session switching
  - Select a previous session to view its messages
  - Read-only mode for past sessions
  - "Continue this session" button to resume (if possible)
  - New session button always available

#### Design Decisions

> **Q**: Should there be one active session at a time, or can the user have multiple concurrent sessions (tabbed)? The PRD seems to imply single session, but multiple might be useful.
> **A**: One active session at a time. Multiple sessions fragment the agent's context and create confusion about which conversation is "current." Past sessions are archived and accessible via a "History" button in the chat header. Starting a "New session" archives the current one. The active session persists across all navigation within the app.

> **Q**: When the user navigates to a different document, should the agent session context update automatically, or should a new session be started?
> **A**: Context updates automatically — no new session. The agent always knows what the user is currently viewing (document, spec, graph viewport) via context metadata sent with each message. Navigating to a different document is seamless: the agent can reference both the new and previous context. Sessions are long-lived across an entire work period.

> **Q**: Should sessions have explicit names/titles, or are they identified only by date and first message?
> **A**: Auto-generated title from the first message (truncated to 60 chars), plus the start date. Users can rename sessions from the history list. The agent can also suggest a title when the session reaches a natural conclusion. Session titles make history browsable: "Refactoring auth specs - Feb 28" is more useful than a timestamp alone.

> **Q**: What context data should be sent with each message? Only the current view (document/spec/graph), or also recent navigation history?
> **A**: Current view context (active document ID, selected spec ID, visible graph viewport bounds) plus the last 5 navigation events (so the agent knows what the user just looked at). Also include: current branch name, any active inquiry queue items, and whether the user has unsaved editor changes. This gives the agent rich situational awareness without overwhelming the context window.

> **Q**: Should the agent see the full spec content of the current view, or just the ID (and fetch content via MCP tools)?
> **A**: Just the IDs in the context metadata. The agent fetches full content via server-side tools when needed. Sending full spec content with every message wastes tokens when the agent doesn't need the content (e.g., the user asks a general question). The agent can request specific spec content on demand, which is more efficient.

> **Q**: How much conversation history should the agent see per request? Last N messages, full session, or a summary of the session?
> **A**: Last 20 messages as full content, plus a system-generated summary of older messages in the session. The summary is created by the agent every 20 messages ("Conversation so far: discussed auth spec restructuring, created 3 new specs, resolved 1 contradiction..."). This balances context richness with token efficiency for long sessions.

---

## 3. Message Types & Rendering

### 3.1 Message Rendering Pipeline

- [ ] **FE-CHAT-017**: Implement message rendering system
  - Route each message to the appropriate renderer based on message type
  - Type discriminator: `message.type` or content analysis
  - Fallback to plain text renderer for unknown types
  - Extensible: new renderers can be registered for new types
- [ ] **FE-CHAT-018**: Implement message wrapper component
  - Common wrapper for all message types
  - Avatar (user or agent icon), timestamp, message actions
  - User messages: right-aligned, primary color bubble
  - Agent messages: left-aligned, neutral color bubble
  - System messages: centered, muted text, no bubble

### 3.2 Text Messages

- [ ] **FE-CHAT-019**: Implement plain text message renderer
  - Render markdown content (bold, italic, lists, links, headers)
  - Sanitize HTML to prevent XSS
  - Auto-link URLs
  - Line breaks preserved
- [ ] **FE-CHAT-020**: Implement code block rendering within messages
  - Syntax highlighting for code blocks (```language)
  - Copy button on code blocks
  - Language label in top-right corner
  - Horizontal scroll for long lines
  - Line numbers for multi-line blocks
- [ ] **FE-CHAT-021**: Implement inline code rendering
  - Monospace font with subtle background
  - Within message text (single backtick)

### 3.3 Specialized Message Types

- [ ] **FE-CHAT-022**: Implement spec proposal message renderer
  - Agent proposes spec creation or changes
  - Show proposed spec content in a styled block
  - If updating: show diff with light indications
  - Action buttons: Accept, Edit, Reject
  - Status indicator after action (Accepted/Rejected/Edited)
- [ ] **FE-CHAT-023**: Implement edge proposal message renderer
  - Agent proposes new graph edge
  - Show: source spec, target spec, edge type, reasoning
  - Visual mini-graph showing the proposed connection
  - Action buttons: Accept, Reject, Modify type
- [ ] **FE-CHAT-024**: Implement spec split proposal message renderer
  - Agent suggests splitting a spec into multiple specs
  - Show original spec and proposed split
  - Preview of each new spec
  - Action buttons: Accept split, Modify, Keep original
- [ ] **FE-CHAT-025**: Implement graph traversal report message
  - Agent reports findings from graph crawl
  - List of related specs found with relevance explanations
  - Links to each spec (clickable)
  - Summary of proposed actions
- [ ] **FE-CHAT-026**: Implement error/warning message renderer
  - Agent reports issues found in the graph
  - Styled with warning/error colors
  - Details expandable
  - Links to affected specs
  - Suggested resolution actions

### 3.4 Embedded Content

- [ ] **FE-CHAT-027**: Implement gen UI embed in messages
  - Agent-generated UI displayed inline in chat
  - Compact iframe with "Expand" option
  - Height adapts to gen UI content (within limits)
  - Action buttons: expand to panel, open in new tab
- [ ] **FE-CHAT-028**: Implement image/media rendering in messages
  - Agent may include images (diagrams, screenshots)
  - Thumbnail in message with click-to-enlarge
  - Alt text for accessibility
  - Loading placeholder while image loads
- [ ] **FE-CHAT-029**: Implement table rendering in messages
  - Agent may include tabular data
  - Styled table with borders and zebra striping
  - Horizontal scroll if table is wide
  - Copy table data button

#### Design Decisions

> **Q**: What is the full enumeration of message types the system needs to support? The plan lists 8+ types. Are there others we haven't considered?
> **A**: Full message type list: `text` (markdown), `interactive` (buttons/forms from agent), `graph-link` (clickable spec/edge references), `code-block` (syntax-highlighted code), `gen-ui-embed` (iframe gen UI), `spec-proposal` (diff with accept/reject), `image` (attached/generated), `file` (downloadable attachment), `status` (system events: "Branch switched to feature-x"), `inquiry` (agent-flagged issue needing input), `gen-ui-output` (data received from gen UI interaction), and `error` (agent error with retry option).

> **Q**: Should messages support a combination of types? For example, a message that contains both text, a code block, AND interactive buttons? Or should each message be a single type?
> **A**: Messages support combined content blocks. A single message is an array of content blocks, each with its own type: `[{ type: 'text', content: '...' }, { type: 'code-block', language: 'ts', content: '...' }, { type: 'interactive', buttons: [...] }]`. This allows the agent to compose rich messages naturally. The chat renderer maps each block to its component.

> **Q**: Should agent messages support "streamed" delivery (text appearing word-by-word as the agent generates it), or should they arrive complete?
> **A**: Streamed delivery for text blocks. Agent text appears token-by-token as it's generated, via incremental WebSocket messages. Non-text blocks (interactive, spec-proposal, gen-ui-embed) arrive complete after the text stream finishes. The streaming creates a responsive feel and lets users start reading before the full response is generated. A "Stop generating" button appears during streaming.

---

## 4. Interactive Message Components

### 4.1 Action Buttons

- [ ] **FE-CHAT-030**: Implement interactive button groups in messages
  - Agent messages can contain action buttons
  - Button variants: primary, secondary, danger
  - Buttons send the selected action back to the agent
  - Buttons disable after selection (prevent double-click)
  - Show which button was selected (visual confirmation)
- [ ] **FE-CHAT-031**: Implement confirmation prompts in messages
  - "Are you sure you want to [action]?" with Yes/No
  - Danger styling for destructive confirmations
  - Timeout: buttons may expire after a configurable period
- [ ] **FE-CHAT-032**: Implement multi-option selection in messages
  - Radio buttons or card-select for choosing from options
  - Agent proposes options, user selects one
  - Selected option highlighted, others dimmed
  - "Submit selection" button

### 4.2 Inline Forms

- [ ] **FE-CHAT-033**: Implement inline form rendering in messages
  - Agent requests structured input (e.g., "What is the spec title? Description? Tags?")
  - Form fields rendered within the message bubble
  - Client-side validation before submission
  - Submit button sends form data to agent
- [ ] **FE-CHAT-034**: Implement inline text editing in messages
  - Agent proposes text, user can edit before accepting
  - Editable text area within the message
  - "Accept as-is" and "Accept with edits" buttons
  - Diff highlight showing user's modifications
- [ ] **FE-CHAT-035**: Implement rating/feedback in messages
  - Thumbs up/down on agent responses
  - Optional text feedback
  - Stored for agent improvement (not sent back as message)

### 4.3 Interactive State Management

- [ ] **FE-CHAT-036**: Implement interaction state per message
  - States: `pending` (waiting for user), `responded` (user acted), `expired`, `superseded`
  - Once responded, buttons are disabled and show the selected action
  - Expired: buttons grayed out with "Expired" label
  - Superseded: if a newer message makes this one moot, disable buttons
- [ ] **FE-CHAT-037**: Implement interaction timeout
  - Configurable timeout per interactive message (default: no timeout)
  - Visual countdown indicator if timeout is set
  - Expiry notification in chat
- [ ] **FE-CHAT-038**: Implement interaction undo
  - "Undo" option briefly available after selecting an action
  - Window: 5 seconds after action
  - Sends undo request to agent
  - Agent may or may not support undo (graceful handling)

#### Design Decisions

> **Q**: When the user clicks an action button (e.g., "Accept spec proposal"), should the action happen immediately or show a confirmation first? Immediate is faster; confirmation is safer.
> **A**: Immediate for low-risk actions (accept suggestion, dismiss, "tell me more"). Confirmation dialog for high-risk actions (accept spec proposal that modifies existing content, delete, revert). The agent's message schema includes a `requiresConfirmation: boolean` flag per button. Confirmation shows a brief modal: "Apply this change to [Spec Name]? This will modify 3 paragraphs. [Cancel] [Apply]".

> **Q**: Should interactive messages have a default timeout? If the agent sends a proposal and the user doesn't respond for an hour, should the proposal expire?
> **A**: No time-based expiration. Proposals remain actionable until logically superseded by a newer proposal for the same spec, or until the underlying spec changes. Users may step away and return to review proposals — time-based expiry would force them to re-request proposals. Superseded proposals are marked as such with disabled buttons and a "Superseded by newer proposal" label.

> **Q**: Can the user interact with old messages, or only the most recent interactive message? For example, if the agent sent two proposals, can the user accept both?
> **A**: Users can interact with any non-expired interactive message. If the agent sent proposals for two different specs, both are independently actionable. If two proposals target the same spec, accepting one supersedes the other. The chat clearly shows the status of each proposal (active, accepted, rejected, superseded).

---

## 5. Graph Links in Messages

### 5.1 Spec References

- [ ] **FE-CHAT-039**: Implement clickable spec references in messages
  - Spec references formatted as `@[Spec Title](specId)` in message content
  - Rendered as styled inline link/chip
  - Click: navigate to spec in editor or focus in graph
  - Hover: show tooltip with spec summary (title, first line, tags, author)
- [ ] **FE-CHAT-040**: Implement spec reference auto-detection
  - Agent messages mentioning spec IDs or titles auto-linked
  - Parse message content for spec references
  - Highlight matched spec names with clickable links
- [ ] **FE-CHAT-041**: Implement mini spec card on hover
  - Hover over a spec reference → show popover card
  - Card contents: title, first ~100 chars of content, author, tags, status
  - Actions in card: "Open in editor", "View in graph", "View history"
  - Delay before showing (300ms) to prevent accidental triggers

### 5.2 Graph Navigation from Chat

- [ ] **FE-CHAT-042**: Implement "View in graph" action from messages
  - Button or link in messages referencing specs
  - Navigate to graph view centered on the referenced spec
  - If graph is already visible (split pane), highlight the node
  - If graph is not visible, open graph view
- [ ] **FE-CHAT-043**: Implement graph subview embed in messages
  - For graph-heavy messages, show a mini graph visualization
  - Interactive: click nodes, hover for details
  - Shows: referenced specs and their immediate connections
  - "Open full graph" button
- [ ] **FE-CHAT-044**: Implement edge reference rendering
  - When agent mentions an edge, show visual indicator
  - Edge type label with color coding
  - Source → Target spec names as links
  - Click to focus on the edge in the graph

#### Design Decisions

> **Q**: How should spec references in messages be formatted? As plain text links, as styled chips/badges, or as expandable cards?
> **A**: Styled chips/badges. Spec references render as inline pills showing the spec title (truncated to 30 chars) with a small node icon. Hovering a chip shows a tooltip with: full title, parent document name, and tag list. Clicking navigates to the spec in the editor. The chip color matches the spec's category/type color from the graph. This is more scannable than plain links or heavyweight cards.

> **Q**: When the user clicks a spec link in a message, should it navigate away from the chat, or open a side panel/overlay?
> **A**: Navigate to the spec in the editor (main content area updates) while keeping the chat panel open. The chat stays at the same scroll position so the user can reference the message. If the chat is minimized, it stays minimized — the navigation happens in the editor pane only. This is the default linked behavior; holding Cmd+Click opens the spec in a new browser tab.

> **Q**: Should the chat support "citing" specs — e.g., the agent explains something and cites specific specs as evidence?
> **A**: Yes. The agent can include citation references in its messages: numbered inline citations [1], [2] that correspond to spec chips at the bottom of the message (like footnotes). Each citation chip is clickable and navigable. This makes the agent's reasoning traceable back to the knowledge graph, which is central to the system's value.

> **Q**: Should the chat be able to embed a mini graph visualization (showing a few nodes and edges inline)? This adds significant complexity but could be very useful for graph-related discussions.
> **A**: Yes, but as a static image, not an interactive tree. When the agent discusses graph relationships, it can include a server-rendered SVG snapshot of the relevant subgraph (5-10 nodes) as an inline image. Clicking the image opens the full interactive tree view with those nodes as the primary context. This avoids the complexity of embedding an interactive graph tree in a chat message while providing visual context.

> **Q**: When the agent discusses graph changes, should the graph view (if visible) update in real-time to highlight the discussed elements?
> **A**: Yes. When the agent's message references specific specs or edges, the graph view (if visible in a side panel) highlights those elements: referenced nodes get a pulsing border, referenced edges get increased thickness. The highlighting persists while the message is in the visible viewport and fades when the user scrolls past. This creates a powerful cross-reference experience.

---

## 6. Agent Status & Thinking Indicators

### 6.1 Thinking State

- [ ] **FE-CHAT-045**: Implement agent thinking indicator
  - Appears when agent is processing a request
  - Animated dots or typing indicator in the message area
  - Positioned where the next agent message will appear
  - Disappears when agent message arrives
- [ ] **FE-CHAT-046**: Implement detailed task indicators
  - Agent reports what it's currently doing:
    - "Analyzing your request..."
    - "Searching the knowledge graph..."
    - "Generating spec proposal..."
    - "Building generative UI..."
    - "Reviewing graph connections..."
  - Show current task in the thinking indicator
  - Show elapsed time for long operations
- [ ] **FE-CHAT-047**: Implement multi-step progress
  - For complex operations, show step progress
  - Steps: e.g., "1/4: Analyzing → 2/4: Searching → 3/4: Generating → 4/4: Finalizing"
  - Visual progress bar or step indicator
  - Estimated time remaining (if available from agent)

### 6.2 Agent Availability

- [ ] **FE-CHAT-048**: Implement agent availability indicator
  - Show in chat header: "Agent ready" (green), "Agent busy" (yellow), "Agent unavailable" (red)
  - Busy state: agent is processing another task
  - Unavailable: agent session error or server down
- [ ] **FE-CHAT-049**: Implement agent error indicator
  - If agent encounters an error, show in chat
  - Error message with details
  - "Retry" button to resend the last request
  - "New session" button if error is unrecoverable
- [ ] **FE-CHAT-050**: Implement agent cancellation
  - "Cancel" button appears during long agent operations
  - Sends cancel request to server
  - Agent stops processing and sends cancellation confirmation
  - User can then send a new message or modify their request

#### Design Decisions

> **Q**: Should the agent proactively send messages (without user prompt)? For example: "I noticed you modified Spec A, which is related to Spec B. Would you like me to review the impact?" This is powerful but could be noisy.
> **A**: Yes, but with rate limiting and user control. Proactive messages are limited to: spec save events that affect graph edges, inquiry queue items, and build completion notifications. Maximum 1 proactive message per 5 minutes to avoid noise. Users can disable proactive messages entirely in settings. Proactive messages appear with a distinct "Agent suggestion" visual treatment (subtle background, different icon).

> **Q**: If the agent is thinking for more than 30 seconds, should there be a "cancel" button? What about 60 seconds? 5 minutes?
> **A**: Cancel button appears immediately when the agent starts thinking. A "Thinking..." indicator with elapsed time shows from the start. At 30 seconds, the indicator adds a "This is taking longer than usual" note. At 2 minutes, a more prominent "Still working — [Cancel]" banner appears. The cancel button is always available. Cancel sends an abort signal to the server, which terminates the agent task.

> **Q**: Should the agent's thinking indicator show real progress steps, or just a generic "thinking" animation? Real steps require the agent to report progress.
> **A**: Both. Default is a bouncing dots animation. When the agent reports progress steps via WebSocket (e.g., "Analyzing dependencies...", "Generating proposal...", "Building gen UI..."), the dots are replaced with the current step label and a subtle progress animation. The agent is encouraged to report steps for operations >5 seconds, but the UI gracefully falls back to dots if no steps are reported.

> **Q**: If the agent crashes mid-response, should the chat show a partial message (what was generated so far) or a clean error message?
> **A**: Show the partial message (what was streamed so far) with a clear error footer: "[Response interrupted] The agent encountered an error. [Retry] [Copy partial response]". This preserves any useful content already generated. The partial message is styled with a subtle red-orange left border to indicate it's incomplete.

> **Q**: Should agent errors be reported to the user inline in chat, or as system-level notifications (toast/banner)?
> **A**: Inline in chat as an `error` message type. The error message shows in the conversation flow with a red-orange accent, the error description, and a "Retry" button. This keeps the error in context of the conversation that caused it. System-level toasts are reserved for infrastructure issues (WebSocket disconnected, server unreachable) that aren't specific to a conversation.

> **Q**: Should there be an automatic retry mechanism for failed agent requests, or should the user always manually retry?
> **A**: Manual retry via the "Retry" button on the error message. No automatic retry — agent failures may be caused by the request itself (ambiguous prompt, impossible task), and automatic retry wastes resources on the same failing request. The retry button resends the original user message. The user can also modify their message and send a new one instead.

---

## 7. User Input Area

### 7.1 Text Input

- [ ] **FE-CHAT-051**: Implement chat text input component
  - Multi-line textarea with auto-resize
  - Minimum height: 2 lines
  - Maximum height: 8 lines (then scroll)
  - Placeholder: "Ask the agent anything..."
  - Focus ring on focus
- [ ] **FE-CHAT-052**: Implement send behavior
  - Enter key: send message
  - Shift+Enter: new line
  - Send button (arrow icon) on right side of input
  - Disable send when input is empty or agent is processing
  - Clear input after successful send
- [ ] **FE-CHAT-053**: Implement input draft persistence
  - Save unsent text to the chat store
  - Restore draft on session switch or page reload
  - Clear draft on send

### 7.2 Slash Commands

- [ ] **FE-CHAT-054**: Implement slash command system
  - Typing `/` triggers command menu
  - Available commands:
    - `/help` — show available commands
    - `/graph [query]` — search the knowledge graph
    - `/spec [query]` — search specs
    - `/gen [description]` — request a generative UI
    - `/split` — request spec split analysis
    - `/analyze` — request graph analysis from current context
    - `/version [specId]` — show version history
    - `/clear` — clear chat messages (visual only, history preserved)
  - Fuzzy matching as user types command name
  - Tab to complete the selected command
- [ ] **FE-CHAT-055**: Implement slash command menu UI
  - Popup above input area when `/` is typed
  - List of matching commands with descriptions
  - Arrow keys to navigate, Enter to select, Escape to dismiss
  - Command parameters shown after selection

### 7.3 Mentions & Auto-Complete

- [ ] **FE-CHAT-056**: Implement spec mention auto-complete
  - Typing `@` triggers spec search
  - Dropdown showing matching spec titles
  - Arrow keys to navigate, Enter to select
  - Selected spec rendered as a chip/tag in the input
  - Spec ID sent with the message for agent context
- [ ] **FE-CHAT-057**: Implement document mention auto-complete
  - Typing `#` triggers document search
  - Similar behavior to spec mentions
  - Document name rendered as a chip

### 7.4 File Attachments

- [ ] **FE-CHAT-058**: Implement file attachment button
  - Paperclip icon in input area
  - Opens file picker (images, documents)
  - Drop zone: drag files onto chat input area
  - File type restrictions: images (png, jpg, svg), documents (md, txt, pdf)
  - File size limit: configurable (default 10MB)
- [ ] **FE-CHAT-059**: Implement attachment preview
  - Show attached files as chips above the input area
  - Image thumbnail for image files
  - File name + size for document files
  - Remove button (x) on each attachment
  - Upload progress indicator
- [ ] **FE-CHAT-060**: Implement attachment upload
  - Upload files to server on send
  - Include file references in the message to the agent
  - Agent can process attached files (extract content, analyze images)

#### Design Decisions

> **Q**: Should the chat input support rich text formatting (bold, italic via toolbar), or only plain text / markdown?
> **A**: Plain text with markdown syntax support. Users type markdown (e.g., `**bold**`, `` `code` ``) which renders in the sent message. No formatting toolbar — it takes up space and the target audience (technical professionals) is comfortable with markdown. The input area is a plain textarea with monospace font for markdown editing comfort.

> **Q**: Should the chat input support voice input (speech-to-text)?
> **A**: No. Voice input is not a priority for a desktop-first professional tool. Users will be typing at a keyboard. The browser's native speech-to-text (if enabled by the OS) works in the textarea without any app-level implementation. Voice input can be considered as a future accessibility enhancement.

> **Q**: Should the chat input have a character or word limit? Some agent APIs have context limits.
> **A**: Soft limit of 4,000 characters per message, displayed as a counter in the bottom-right of the input area (shows "234 / 4000" when approaching the limit). Exceeding the limit shows a warning but allows sending — the server/agent handles truncation if needed. This prevents users from accidentally pasting enormous content while allowing flexibility.

> **Q**: What is the complete set of slash commands? Should commands be hardcoded, or should the agent be able to register custom commands?
> **A**: Hardcoded initial set with agent-extensible custom commands. Built-in: `/new-spec`, `/split-spec`, `/link [specId]`, `/graph [specId]`, `/version [specId]`, `/gen-ui [action]`, `/help`, `/clear` (clear chat display, history preserved), `/export`. The agent can register project-specific commands via the WebSocket protocol, which appear in the autocomplete menu with an "Agent" badge.

> **Q**: Should slash commands be visually distinct in the sent message (highlighted differently from regular text)?
> **A**: Yes. Slash commands render as styled chips/badges in the sent message (monospace font, subtle background pill, primary color text). The command portion is visually distinct from any accompanying text. This makes it clear what action was invoked when reviewing chat history.

> **Q**: Should there be an "admin" set of slash commands for power users?
> **A**: No separate admin commands in chat. Admin functions (user management, system settings, gen UI quarantine) are in the Settings page. The chat is for knowledge work, not system administration. Power-user commands (like `/export` or `/clear`) are available to all users.

> **Q**: What file types should be supported for attachment? The PRD mentions mixed media (images, video, audio, documents). Should all be supported in chat?
> **A**: Images (PNG, JPEG, GIF, WebP, SVG), documents (PDF, Markdown, plain text), and structured data (JSON, CSV). No video or audio in chat — they're too large and the agent can't process them meaningfully. Media referenced in specs (video, audio) is handled at the spec level, not through chat. File type validation happens client-side before upload.

> **Q**: What is the maximum file size for chat attachments? Should it differ by file type?
> **A**: 10MB maximum for all file types. Images are recommended under 5MB (the UI shows a warning above 5MB suggesting compression). PDFs under 10MB. No per-type differentiation — a single limit is simpler to communicate and enforce. Files above 10MB are rejected with "File too large (10MB max). Consider compressing or linking to external storage."

> **Q**: How should large files be handled? Upload immediately or only when the message is sent?
> **A**: Upload immediately on attachment (before message send). Show an upload progress bar on the attached file preview. Once uploaded, the file is stored server-side and a reference ID is attached to the message when sent. This prevents the user from waiting for both upload and agent processing when they hit send. Failed uploads are retried or removed before sending.

---

## 8. Keyboard Shortcuts & Hotkeys

- [ ] **FE-CHAT-061**: Implement global chat hotkey
  - `Ctrl+/` (or `Cmd+/`): focus chat input (open chat panel if collapsed)
  - When chat input is focused, typing starts immediately
  - If already focused, `Ctrl+/` selects all text in input
- [ ] **FE-CHAT-062**: Implement chat-specific shortcuts
  - `Enter`: send message
  - `Shift+Enter`: new line
  - `Escape`: blur input / close command menu / close chat panel
  - `Ctrl+Shift+N`: new chat session
  - `Up arrow` (when input is empty): edit last sent message
  - `Ctrl+L`: clear visual chat (history preserved)
- [ ] **FE-CHAT-063**: Implement shortcut hints
  - Show keyboard shortcut hints in tooltips
  - Show shortcut reference in `/help` command output
  - Settings page for customizing chat shortcuts

---

## 9. Message History & Persistence

### 9.1 History Loading

- [ ] **FE-CHAT-064**: Implement message history loading
  - Fetch messages from server on session load
  - Paginated: load last N messages initially (e.g., 50)
  - "Load more" button at the top for older messages
  - Infinite scroll loading for older messages
  - Cache loaded messages in chat store
- [ ] **FE-CHAT-065**: Implement history search
  - Search through message history by content
  - Highlight matching text in results
  - Jump to message in timeline
  - Search within current session or across all sessions

### 9.2 Message Persistence

- [ ] **FE-CHAT-066**: Implement message persistence strategy
  - Messages stored on server (associated with agent session)
  - Local cache in chat store for fast access
  - Sync on WebSocket reconnection
  - Messages are NOT part of the knowledge graph (per PRD)
  - Messages ARE part of the user's interaction log
- [ ] **FE-CHAT-067**: Implement message export
  - Export current session as markdown
  - Export all sessions as JSON (for backup)
  - Include: messages, timestamps, user/agent attribution, interactive responses

### 9.3 Real-Time Message Delivery

- [ ] **FE-CHAT-068**: Implement WebSocket message reception
  - Subscribe to agent message events for the active session
  - Append new messages to the message list in real-time
  - Handle out-of-order messages (sort by timestamp)
  - Handle duplicate messages (deduplicate by message ID)
- [ ] **FE-CHAT-069**: Implement message delivery confirmation
  - User messages show "sending" → "sent" → "delivered" status
  - "Sending": message submitted to WebSocket
  - "Sent": server acknowledged receipt
  - "Delivered": agent received and is processing
  - Show appropriate icon for each state
- [ ] **FE-CHAT-070**: Implement offline message queuing
  - If WebSocket is disconnected, queue user messages
  - Show "queued" status on pending messages
  - Resend on reconnection
  - Warn user that messages are queued

#### Design Decisions

> **Q**: How many messages should the chat support in a single session before performance degrades? 100? 1,000? 10,000?
> **A**: Target smooth performance up to 1,000 messages per session. Most sessions will have 50-200 messages. At 1,000 messages, the session should still be usable with virtualization. Above 1,000, suggest starting a new session. The agent's session summary mechanism (every 20 messages) keeps context manageable regardless of session length.

> **Q**: Should old messages be virtualized (only render visible ones in the DOM) for long sessions?
> **A**: Yes. Use virtualized rendering for sessions exceeding 100 messages. Only messages within the viewport ± 10 messages of buffer are rendered in the DOM. Use `react-virtuoso` for the virtualized list (it handles variable-height items well, which chat messages require). Below 100 messages, render all for simplicity.

> **Q**: Should images in messages be lazy-loaded?
> **A**: Yes. All images use `loading="lazy"` and display a blurred placeholder (tiny base64 thumbnail generated on upload) until the full image loads. Images outside the viewport are not loaded until scrolled into view. This is especially important for sessions with many image attachments from agent responses.

> **Q**: Should there be a "compact mode" that reduces message rendering complexity for performance-constrained devices?
> **A**: No dedicated compact mode. Instead, the standard rendering is already efficient (virtualized list, lazy images, on-demand gen UI iframes). If performance issues arise on specific devices, address them through targeted optimizations rather than a degraded UI mode. The app targets desktop browsers which have ample rendering capability.

> **Q**: How long should chat history be retained? Indefinitely, 90 days, configurable per user?
> **A**: Indefinitely by default. Chat history is a reference log (per PRD) and may be valuable for tracing past decisions months later. Admins can configure a retention policy per project (e.g., 365 days for compliance). Users can manually delete their own sessions. Indefinite retention is the safe default — deletion is irreversible.

> **Q**: Should chat history be searchable across all sessions? Full-text search adds server-side complexity.
> **A**: Yes, full-text search across all sessions the user has access to. The search UI is a search bar at the top of the session history list. Results show matching message snippets with session context (title, date, author). Search is server-side (backed by PostgreSQL full-text search or a search index). This is essential for finding past decisions and agent recommendations.

> **Q**: Should chat history be exportable? In what formats (markdown, JSON, PDF)?
> **A**: Exportable in Markdown and JSON formats. Markdown export produces a readable conversation log with message formatting preserved. JSON export includes full metadata (timestamps, message types, agent state). No PDF — it adds a rendering dependency with limited benefit. Export is per-session via a menu action in the session history list.

> **Q**: Should chat messages be included in the project's git history, or stored separately?
> **A**: Stored separately in the database, not in git. Per the PRD, dialog history is a "reference log, not part of KG." Chat data is high-volume, append-only, and doesn't benefit from git's versioning model. It's stored in the server database and associated with the project. Git is reserved for specs, edges, and gen UI source code.

---

## 10. Multi-User Dialog Features

### 10.1 User Awareness

- [ ] **FE-CHAT-071**: Implement user attribution on messages
  - Each message shows the user's avatar and name
  - Agent messages show agent icon and agent type label
  - System messages show system icon
- [ ] **FE-CHAT-072**: Implement other users' dialog viewing
  - Per PRD: users can view other users' dialogs
  - "Team dialogs" section in session history
  - Read-only view of other users' sessions
  - Filter by user, date, related specs
- [ ] **FE-CHAT-073**: Implement dialog forking
  - Per PRD: interacting with another user's dialog forks it
  - "Fork this dialog" button on other users' sessions
  - Creates new session under current user with the conversation context
  - Original session unchanged
  - Fork indicator shown in forked session

### 10.2 Collaboration Indicators

- [ ] **FE-CHAT-074**: Implement "user is typing" indicator (optional)
  - Not real-time (async system), but if two users are in related sessions
  - Show when another user is actively working with the same specs
  - Subtle indicator: "User X is working on this document"
- [ ] **FE-CHAT-075**: Implement agent-initiated notifications in chat
  - Agent may send unprompted messages:
    - "Changes detected in linked specs since last review"
    - "Conflict found between Spec A and Spec B"
    - "New inquiry added to queue"
  - Notification badge on chat panel if minimized
  - Sound notification option

#### Design Decisions

> **Q**: Per the PRD, users can see other users' dialogs. Should this be opt-in (user chooses to share), opt-out (shared by default, can hide), or always visible?
> **A**: Shared by default (opt-out). All dialog sessions are visible to team members with full access. Users can mark individual sessions as "private" when starting them. Summary-access users see session titles and timestamps but not message content (per the PRD's permission model). The session history list shows all team sessions with author avatars.

> **Q**: Should dialog viewing show other users' agent interactions in real-time (live feed), or only completed sessions?
> **A**: Both. Completed sessions are browsable in the history list. Active sessions from other users appear with a "Live" badge. Clicking an active session shows a read-only live feed of messages appearing in real-time. The viewer cannot interact with the other user's agent. This enables team awareness without interference.

> **Q**: Should there be privacy controls on individual messages within a session?
> **A**: No per-message privacy. The granularity is per-session (public or private). Individual message privacy is too complex to manage and creates a confusing experience when reading a conversation with gaps. If a user needs to discuss sensitive content, they start a private session. This keeps the model simple and predictable.

> **Q**: When forking a dialog, should the fork include only the messages, or also the agent's internal state (so the forked session can continue from the same context)?
> **A**: Messages only. The fork creates a new session pre-populated with a copy of the messages up to the fork point. The agent starts fresh in the forked session — it reads the message history for context (like it would with any session) but doesn't inherit internal state. This is simpler and avoids complex agent state serialization/deserialization.

> **Q**: Should the original user be notified when their dialog is forked?
> **A**: Yes, a non-intrusive notification. The original user sees a small system message in their session: "User X forked this conversation at message Y." The notification appears in the chat history, not as a popup or toast. This provides traceability without being disruptive.

> **Q**: Should forked dialogs maintain a link to the original (for traceability)?
> **A**: Yes. The forked session's metadata includes `forkedFrom: { sessionId, messageIndex, userId }`. The forked session header shows "Forked from [Original Session Title]" as a clickable link. This enables tracing the lineage of conversations and understanding how ideas evolved.

---

## 11. Notifications & Alerts

- [ ] **FE-CHAT-076**: Implement new message notifications
  - When chat panel is minimized/collapsed
  - Badge count on chat icon/panel toggle
  - Toast notification for important agent messages
  - Browser notification (with permission) for background tab
- [ ] **FE-CHAT-077**: Implement unread message tracking
  - Track the last read message per session
  - Show unread count per session in session list
  - "Mark all as read" action
  - Unread indicator disappears when user scrolls to the message
- [ ] **FE-CHAT-078**: Implement sound notifications (optional)
  - Subtle sound for new agent messages
  - Different sound for interactive messages requiring action
  - Configurable: on/off in settings
  - Respect browser autoplay policies

---

## 12. Accessibility

- [ ] **FE-CHAT-079**: Implement ARIA attributes for chat
  - Chat panel: `role="complementary"`, `aria-label="Chat with AI agent"`
  - Message list: `role="log"`, `aria-live="polite"`, `aria-relevant="additions"`
  - Individual messages: `role="article"` or `role="listitem"`
  - Input area: `role="textbox"`, `aria-label="Type a message"`
  - Action buttons: clear `aria-label` describing the action
- [ ] **FE-CHAT-080**: Implement keyboard-only chat interaction
  - Tab through: header buttons → message list → input area
  - In message list: arrow keys to navigate between messages
  - Enter/Space on interactive buttons within messages
  - Escape to return focus to input
- [ ] **FE-CHAT-081**: Implement screen reader announcements
  - New agent messages announced via `aria-live` region
  - Agent status changes announced ("Agent is thinking", "Agent responded")
  - Interactive message prompts announced clearly
  - Error messages announced with `role="alert"`
- [ ] **FE-CHAT-082**: Implement high-contrast mode for chat
  - Ensure message bubbles have sufficient contrast
  - Ensure code blocks are readable in all themes
  - Ensure interactive button states are distinguishable

---

## Additional Design Decisions

#### Performance

> **Q**: How many messages should the chat support in a single session before performance degrades? 100? 1,000? 10,000?
> **A**: Target smooth performance up to 1,000 messages per session. Most sessions will have 50-200 messages. At 1,000 messages, the session should still be usable with virtualization. Above 1,000, suggest starting a new session. The agent's session summary mechanism (every 20 messages) keeps context manageable regardless of session length.

> **Q**: Should old messages be virtualized (only render visible ones in the DOM) for long sessions?
> **A**: Yes. Use virtualized rendering for sessions exceeding 100 messages. Only messages within the viewport ± 10 messages of buffer are rendered in the DOM. Use `react-virtuoso` for the virtualized list (it handles variable-height items well, which chat messages require). Below 100 messages, render all for simplicity.

> **Q**: Should images in messages be lazy-loaded?
> **A**: Yes. All images use `loading="lazy"` and display a blurred placeholder (tiny base64 thumbnail generated on upload) until the full image loads. Images outside the viewport are not loaded until scrolled into view. This is especially important for sessions with many image attachments from agent responses.

> **Q**: Should there be a "compact mode" that reduces message rendering complexity for performance-constrained devices?
> **A**: No dedicated compact mode. Instead, the standard rendering is already efficient (virtualized list, lazy images, on-demand gen UI iframes). If performance issues arise on specific devices, address them through targeted optimizations rather than a degraded UI mode. The app targets desktop browsers which have ample rendering capability.

---

## Summary

### Task Count by Section

| Section                               | Tasks                                |
| ------------------------------------- | ------------------------------------ |
| 1. Chat Panel Layout & Docking        | 10 (FE-CHAT-001 through FE-CHAT-010) |
| 2. Chat Session Management            | 6 (FE-CHAT-011 through FE-CHAT-016)  |
| 3. Message Types & Rendering          | 13 (FE-CHAT-017 through FE-CHAT-029) |
| 4. Interactive Message Components     | 9 (FE-CHAT-030 through FE-CHAT-038)  |
| 5. Graph Links in Messages            | 6 (FE-CHAT-039 through FE-CHAT-044)  |
| 6. Agent Status & Thinking Indicators | 6 (FE-CHAT-045 through FE-CHAT-050)  |
| 7. User Input Area                    | 10 (FE-CHAT-051 through FE-CHAT-060) |
| 8. Keyboard Shortcuts & Hotkeys       | 3 (FE-CHAT-061 through FE-CHAT-063)  |
| 9. Message History & Persistence      | 7 (FE-CHAT-064 through FE-CHAT-070)  |
| 10. Multi-User Dialog Features        | 5 (FE-CHAT-071 through FE-CHAT-075)  |
| 11. Notifications & Alerts            | 3 (FE-CHAT-076 through FE-CHAT-078)  |
| 12. Accessibility                     | 4 (FE-CHAT-079 through FE-CHAT-082)  |
| **TOTAL**                             | **82**                               |

> Note: Many tasks contain extensive sub-items covering multiple states,
> variants, and edge cases. The effective implementation effort with all
> sub-items exceeds 130 discrete tasks.

### Definition of Done

This plan is complete when:

- [ ] Chat panel is always visible and docked with resize/collapse/minimize
- [ ] Chat sessions can be created, switched, and resumed
- [ ] All message types render correctly (text, code, interactive, graph-linked, gen UI embed)
- [ ] Interactive messages accept user input and forward to agent
- [ ] Graph links in messages are clickable and navigate correctly
- [ ] Agent thinking/working indicators display accurate status
- [ ] User input supports markdown, slash commands, mentions, and attachments
- [ ] Global hotkey (Ctrl+/) focuses chat input from anywhere
- [ ] Message history loads, paginates, and persists
- [ ] Multi-user dialog viewing and forking work
- [ ] Accessibility audit passes for all chat features
