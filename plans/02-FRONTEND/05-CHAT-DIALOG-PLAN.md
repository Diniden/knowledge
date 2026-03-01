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

## Summary

### Task Count by Section

| Section | Tasks |
|---------|-------|
| 1. Chat Panel Layout & Docking | 10 (FE-CHAT-001 through FE-CHAT-010) |
| 2. Chat Session Management | 6 (FE-CHAT-011 through FE-CHAT-016) |
| 3. Message Types & Rendering | 13 (FE-CHAT-017 through FE-CHAT-029) |
| 4. Interactive Message Components | 9 (FE-CHAT-030 through FE-CHAT-038) |
| 5. Graph Links in Messages | 6 (FE-CHAT-039 through FE-CHAT-044) |
| 6. Agent Status & Thinking Indicators | 6 (FE-CHAT-045 through FE-CHAT-050) |
| 7. User Input Area | 10 (FE-CHAT-051 through FE-CHAT-060) |
| 8. Keyboard Shortcuts & Hotkeys | 3 (FE-CHAT-061 through FE-CHAT-063) |
| 9. Message History & Persistence | 7 (FE-CHAT-064 through FE-CHAT-070) |
| 10. Multi-User Dialog Features | 5 (FE-CHAT-071 through FE-CHAT-075) |
| 11. Notifications & Alerts | 3 (FE-CHAT-076 through FE-CHAT-078) |
| 12. Accessibility | 4 (FE-CHAT-079 through FE-CHAT-082) |
| **TOTAL** | **82** |

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
