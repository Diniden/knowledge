# 03-SERVER / 06 — WEBSOCKET: Open Questions

> **Purpose**: Unresolved questions about the WebSocket implementation including
> library choice, event design, room management, authentication, reconnection
> strategy, message queuing, and scaling considerations. Answers may change
> tasks in the plan.

---

## 1. Library & Transport

### 1.1 WebSocket Library
- **Q**: Should the project use Socket.IO (full-featured, fallback transports,
  rooms, acknowledgments) or plain WebSocket via `ws` (lightweight, standard
  protocol, no overhead)? Socket.IO adds ~20KB to the client bundle but
  provides reconnection, rooms, and binary support out of the box.

**A:** Use Socket.IO. The built-in features (rooms, acknowledgments, automatic reconnection, namespace support) would need to be reimplemented with raw `ws`. The ~20KB client bundle cost is negligible compared to the development time saved. Socket.IO's room abstraction maps directly to the project/document/session room hierarchy. NestJS has first-class Socket.IO support via `@nestjs/platform-socket.io`.

- **Q**: If using Socket.IO, should the transport be restricted to WebSocket
  only (no HTTP polling fallback), or should polling be allowed as a fallback?
  WebSocket-only is lighter but breaks on some corporate proxies.

**A:** WebSocket only, no polling fallback. Configure Socket.IO with `transports: ['websocket']`. HTTP long-polling adds server overhead (keep-alive connections, session affinity requirements) and is unnecessary for a modern application where users control their network environment. If a corporate proxy blocks WebSocket, the user should configure the proxy — not degrade the transport.

- **Q**: Does the chosen WebSocket library work correctly with Bun's HTTP
  server? Socket.IO's adapter for NestJS may expect Node.js-specific behavior.

**A:** Socket.IO works with Bun when using `@nestjs/platform-express` (Express under Bun). Socket.IO attaches to the HTTP server instance, which Express provides. Test the WebSocket handshake, message delivery, and room operations under Bun during setup. Known working combination: NestJS 10+ / Socket.IO 4.7+ / Bun 1.1+. Add a WebSocket integration test to CI.

### 1.2 Protocol
- **Q**: Should the WebSocket protocol use JSON for all events, or should
  there be a binary protocol for high-frequency events (agent streaming)?
  JSON is simpler and debuggable; binary (MessagePack, protobuf) is more
  compact.

**A:** JSON for all events. Agent streaming generates ~500 chars/second (see streaming section below), which is well within WebSocket bandwidth capacity even on slow connections. Binary protocols add serialization complexity and make debugging harder (can't inspect events in browser devtools). JSON is human-readable, self-describing, and sufficient for the expected throughput.

- **Q**: Should events use a flat structure (`{ event, data }`) or a nested
  structure with metadata (`{ event, data, meta: { timestamp, version } }`)?
  Metadata is useful but increases payload size.

**A:** Nested structure with metadata. Every event includes: `{ data, meta: { timestamp, requestId } }`. The event name is the Socket.IO event name (separate from the payload). `timestamp` enables client-side ordering and latency calculation. `requestId` enables correlation with REST API requests. The metadata overhead is ~50 bytes per event — negligible.

---

## 2. Event Design

### 2.1 Event Granularity
- **Q**: Should spec change events include the full updated spec, or just a
  change notification that the client uses to fetch the latest via REST?
  Including full data reduces round trips but increases WebSocket bandwidth.
  Notification-only is lighter but requires a follow-up HTTP request.

**A:** Include the full updated spec for small changes (title, status, metadata). For large content changes (full markdown body rewrite), send a notification with `{ specId, changedFields: ["content"], summary: "Content updated (2.3KB)" }` and let the client fetch via REST if needed. The threshold: if the spec JSON is < 10KB, include it inline. If > 10KB, send notification only. This balances bandwidth and round trips.

- **Q**: Should agent streaming events send raw text chunks or structured
  JSON objects? Raw text is simpler for streaming display; structured JSON
  allows semantic rendering (code blocks, links, actions) as chunks arrive.

**A:** Structured JSON objects: `{ type: "text"|"tool_call"|"tool_result"|"thinking"|"error", content: "..." }`. Text chunks contain raw text that the client appends to the streaming display. Tool call events show progress indicators. Tool result events show outcomes. This gives the frontend enough information to render the agent's response progressively with appropriate formatting, without waiting for the complete response.

- **Q**: Should presence events (user online/offline/editing) be sent to all
  project members, or only to users who have opted into presence tracking?
  Sending to all is simpler but generates more traffic.

**A:** Send to all project members who are connected to the project room. Presence tracking is on by default (it's a core collaboration feature). Users who want privacy can set their status to "invisible" via `POST /users/me/presence { status: "invisible" }`, which suppresses their presence events. The traffic is minimal — presence events are throttled to 1 per 5 seconds per user.

### 2.2 Event Naming
- **Q**: Should event names use a hierarchical namespace (`agent:message:chunk`)
  or flat names (`agentMessageChunk`)? Hierarchical is more organized and
  allows wildcard subscriptions; flat is simpler.

**A:** Hierarchical with colon separators: `agent:message:chunk`, `spec:updated`, `graph:edge:created`, `session:ready`, `presence:update`. This is Socket.IO's conventional style, enables logical grouping, and makes the event catalog self-documenting. Socket.IO namespaces (the `/` prefix) are used for transport-level separation, not event categorization.

- **Q**: Should client-to-server and server-to-client events use the same
  names (bidirectional) or distinct names? Distinct names (prefix `client:`
  vs no prefix) prevent confusion about event direction.

**A:** Distinct names. Client-to-server events use verb prefixes: `subscribe:project`, `unsubscribe:project`, `send:message`, `context:navigate`. Server-to-client events use noun prefixes: `spec:updated`, `agent:message:chunk`, `session:ready`, `presence:update`. The naming convention makes event direction unambiguous in code and documentation.

### 2.3 Event Completeness
- **Q**: What events are absolutely essential for MVP vs nice-to-have?
  Essential: agent messages, spec changes. Nice-to-have: presence, capacity,
  analysis events. Should the plan distinguish between phases?

**A:** MVP events (phase 1): `agent:message:chunk` (streaming), `agent:message:complete`, `agent:message:error`, `session:ready`, `session:terminated`, `spec:created`, `spec:updated`, `spec:deleted`, `graph:edge:created`, `graph:edge:deleted`, `sync:changes-available`. Phase 2 events: `presence:update`, `presence:editing`, `graph:analysis:complete`, `agent:thinking`, `system:capacity`. The plan should tag events by phase.

- **Q**: Should there be a "catch-all" event subscription where clients can
  subscribe to all events for a project, or should subscriptions be granular
  per event type?

**A:** Room-based subscription covers this. Joining the `project:{projectId}` room subscribes the client to all project-level events. The client receives everything and filters client-side as needed. No per-event-type subscription mechanism — it adds complexity with little benefit. The event volume per project is low enough that receiving all events is not a performance concern.

---

## 3. Authentication

### 3.1 Auth Strategy
- **Q**: Should WebSocket authentication use the same JWT from the HTTP-only
  cookie, or should there be a separate WebSocket token? Cookies are
  automatically sent during WebSocket handshake, but some environments may
  not send cookies for WebSocket connections.

**A:** Use the JWT from the HTTP-only cookie, which is automatically sent during the WebSocket handshake. Socket.IO's handshake is an HTTP upgrade request, so cookies are included. For non-browser clients (CLI, API), support a `token` query parameter in the connection URL: `wss://host/socket.io/?token=<jwt>`. The auth middleware checks the cookie first, then the query parameter.

- **Q**: How should token expiration be handled for long-lived WebSocket
  connections? Options: (a) disconnect and require reconnection with new token,
  (b) in-band token refresh over WebSocket, (c) periodic re-authentication
  check.

**A:** Option (c): periodic re-authentication check. The server checks the JWT validity on a 5-minute interval for each connected socket. If the token has expired, the server emits a `auth:token-expired` event. The client refreshes its JWT via the REST `/auth/refresh` endpoint and sends a `auth:refresh { token }` event over WebSocket with the new token. If the client doesn't refresh within 30 seconds, the connection is terminated. This avoids disconnect/reconnect overhead.

- **Q**: Should the WebSocket connection be terminated immediately when the
  user's JWT is revoked (e.g., logout from another device), or should it
  continue until the next heartbeat check?

**A:** Terminate at the next periodic check (within 5 minutes). Immediate termination would require a real-time token revocation channel (Redis pub/sub or similar), which is unnecessary complexity for the initial single-instance deployment. The 5-minute window is acceptable — the user's access token also has a 15-minute TTL, so the WebSocket check is more frequent.

### 3.2 Authorization
- **Q**: Should authorization be checked on every incoming event, or only
  on room join? Per-event checking is more secure but adds overhead. Per-room
  checking is cheaper but allows access until the user is removed from the room.

**A:** Per-room checking on join, plus re-check on periodic auth interval. When a user joins a project room, their project membership is verified. The 5-minute auth check also verifies room membership (in case the user was removed from the project). Per-event checking is unnecessary overhead — if the user is in the room, they're authorized for that room's events.

- **Q**: If a user's project role changes (e.g., demoted from admin to viewer),
  should their WebSocket rooms be updated in real-time, or should changes take
  effect on the next connection?

**A:** Updated at the next periodic auth check (within 5 minutes). The auth check re-validates room membership and role. If the user's role changed, the server updates their room subscriptions (e.g., removing them from admin-only rooms). Real-time role enforcement would require a push notification from the role-change endpoint to the WebSocket layer, which is added complexity. The 5-minute delay is acceptable.

---

## 4. Room Management

### 4.1 Room Structure
- **Q**: Should there be a room per spec (for live editing indicators), or is
  document-level granularity sufficient? Per-spec rooms enable "user X is
  editing spec Y" indicators but create many rooms.

**A:** Document-level rooms for the initial release. Rooms: `project:{projectId}` (project-wide events), `document:{documentId}` (document and spec events), `session:{sessionId}` (agent session events). Per-spec rooms are deferred to phase 2 when presence/editing indicators are implemented. Document-level granularity is sufficient for spec change notifications and keeps the room count manageable.

- **Q**: Should rooms be created on demand (when first user joins) or
  pre-created for all projects? On-demand is simpler; pre-created ensures
  events aren't lost before someone joins.

**A:** On demand. Rooms are created when the first user joins. Events emitted to an empty room are discarded (no queuing). This is fine because: spec changes are persisted in git (not lost), agent messages are persisted in PostgreSQL (not lost), and presence is transient (no persistence needed). The client fetches the current state via REST on connect, so missed WebSocket events don't cause inconsistency.

- **Q**: Should there be nested rooms? (e.g., joining `project:123` also
  subscribes to all `document:*` rooms within that project, or are they
  independent subscriptions?)

**A:** Independent subscriptions, no nesting. The client explicitly joins each room it needs: `subscribe:project { projectId }` for project-wide events, `subscribe:document { documentId }` when viewing a document, `subscribe:session { sessionId }` when in an agent session. The server does NOT auto-join sub-rooms. This gives the client fine-grained control over which events it receives.

### 4.2 Room Scalability
- **Q**: What is the expected maximum number of concurrent rooms? If a project
  has 100 documents and 500 specs, that's potentially 601 rooms per project.
  Is this too many?

**A:** With document-level granularity (no per-spec rooms), a project has: 1 project room + N document rooms + M session rooms. For a project with 100 documents and 5 active sessions: 106 rooms. Across 10 active projects: ~1,060 rooms. Socket.IO handles thousands of rooms efficiently (rooms are just Set data structures). This is well within limits.

- **Q**: Should inactive rooms (no members for N minutes) be automatically
  cleaned up? Socket.IO handles this, but custom room metadata may need
  cleanup.

**A:** Socket.IO automatically removes empty rooms. For custom room metadata (e.g., cached room state), clean up when the last user leaves (listen for Socket.IO's `leave` event). No timer-based cleanup needed — the room lifecycle is tied to user connections. Keep it simple.

---

## 5. Reconnection & Reliability

### 5.1 Reconnection Strategy
- **Q**: Should the server maintain a message buffer for reconnecting clients,
  or should clients re-fetch state via REST after reconnection? Message buffer
  is smoother UX but requires server memory. REST re-fetch is simpler but
  may miss transient events.

**A:** REST re-fetch after reconnection. When the client reconnects, it re-joins rooms and fetches the current state via REST (latest specs, active sessions, graph stats). Transient events missed during disconnection (presence updates, typing indicators) are unimportant. Persistent changes (spec updates, agent messages) are fetched via REST. This is simpler, more reliable, and avoids server-side message buffering complexity.

- **Q**: What is the appropriate reconnection window? 2 minutes is proposed.
  Should this be shorter (30s — don't waste memory) or longer (10 min — handle
  brief network outages)?

**A:** Since we're using REST re-fetch (no message buffer), the reconnection window is about Socket.IO's reconnection attempts, not server-side state. Configure Socket.IO client: reconnection attempts every 2 seconds, exponential backoff up to 30 seconds, max 20 attempts (~5 minutes total). After 20 failed attempts, show a "Connection lost. Click to reconnect." banner. No server-side memory is used for disconnected clients.

- **Q**: Should the reconnection protocol use Socket.IO's built-in recovery
  feature (new in Socket.IO 4.6+) or a custom implementation? Built-in is
  simpler but may not cover all our use cases.

**A:** Skip Socket.IO's connection recovery. The REST re-fetch approach is simpler and more reliable. Socket.IO's recovery feature requires server-side message buffering and has edge cases around buffer overflow. Since all important state is available via REST, there's no need for WebSocket-level message recovery.

### 5.2 Message Ordering
- **Q**: Should the WebSocket guarantee ordered delivery of events? Socket.IO
  delivers in order over a single connection, but what about re-delivered events
  after reconnection?

**A:** Socket.IO guarantees in-order delivery over a single connection, which is sufficient. After reconnection, the client re-fetches state via REST (no re-delivery of missed events). No ordering concerns with re-delivery because there is no re-delivery. The `meta.timestamp` on events allows the client to detect and discard stale events if they arrive out of order due to network issues.

- **Q**: Should events include a sequence number for client-side ordering and
  gap detection? This enables the client to request re-delivery of missing
  events.

**A:** No sequence numbers. The REST re-fetch approach eliminates the need for gap detection and re-delivery. Events include `meta.timestamp` for ordering within the current connection session. Sequence numbers add complexity (per-room counters, gap detection logic) that's unnecessary with the simpler re-fetch model.

- **Q**: Should the client acknowledge receipt of critical events (agent
  proposals, conflict notifications)? Acknowledgment ensures delivery but
  adds round-trip overhead.

**A:** Yes, for two critical event types: `agent:proposal` (agent proposes changes for user confirmation) and `sync:conflict` (merge conflict detected). Use Socket.IO's built-in acknowledgment callback. If the server doesn't receive an ack within 10 seconds, retry the event (up to 3 times). These events require user action and should not be silently lost. All other events are fire-and-forget.

---

## 6. Message Queuing

### 6.1 Queue Strategy
- **Q**: Should disconnected user messages be queued in-memory only (fast, lost
  on server restart) or in a persistent store (database/Redis)? Persistent is
  more reliable but slower and more complex.

**A:** No queuing for disconnected users. When a user disconnects, their events are discarded. On reconnection, the client re-fetches state via REST. This eliminates the entire queuing subsystem (in-memory or persistent) and its associated complexity (retention, overflow, compaction). The REST API is the source of truth; WebSocket events are real-time notifications, not a durable message queue.

- **Q**: What should the queue retention period be? 30 minutes is proposed.
  Should this be configurable per event type? (e.g., agent messages queued
  longer than presence updates)

**A:** N/A — no queuing. See above.

- **Q**: Should the queue compact events (keep only latest version per resource)
  or deliver all events in full? Compaction saves bandwidth but the client may
  miss intermediate states.

**A:** N/A — no queuing. See above.

### 6.2 Queue Limits
- **Q**: What should the maximum queue depth per user be? 100 events is
  proposed. Should this be per-project or global per user?

**A:** N/A — no queuing. The REST re-fetch model eliminates the need for client-specific queues entirely.

- **Q**: When the queue overflows, should the oldest events be dropped, or
  should the queue reject new events? Dropping oldest preserves recency;
  rejecting new preserves completeness.

**A:** N/A — no queuing. See above.

---

## 7. Broadcasting

### 7.1 Broadcasting Efficiency
- **Q**: For events that go to all project members (spec created), should the
  server send one message to the room (Socket.IO handles fan-out) or individual
  messages per client? Room-level is more efficient but all clients get the
  same payload (can't customize per user's permission level).

**A:** Room-level broadcasting for most events. Socket.IO's room fan-out is efficient and the correct abstraction. For events that require per-user customization (e.g., spec updates where some users have summary-only access), the server does per-user filtering: iterate over room members, check permissions, send customized payloads. This hybrid approach is efficient for the common case and correct for the permission-sensitive case.

- **Q**: Should broadcast events be filtered based on spec permissions? If user
  A can only see summaries of spec X, should the `spec:updated` event for X
  contain the summary or the full update? This requires per-client payload
  customization.

**A:** Yes, filter based on permissions. When a private spec is updated: users with `full` access receive the full spec data. Users with `summary` access receive only the summary. Users with no access receive nothing (event is not sent to them). The server iterates over room members and sends per-client payloads for permission-sensitive events. For public specs, a single room broadcast suffices.

- **Q**: Should the `excludeUserId` pattern (don't echo events back to sender)
  be the default or opt-in? Default exclusion reduces noise but means the
  sender needs to optimistically update their UI.

**A:** Default exclusion (don't echo back to sender). The sender has already applied the change optimistically via the REST API response. Echoing the event back is redundant and can cause UI flickering (double-apply). Use Socket.IO's `socket.to(room).emit()` (excludes sender) as the default pattern. Opt-in echo via `io.to(room).emit()` for events that need it (rare).

### 7.2 Throttling
- **Q**: What are the right throttle rates for different event types? The plan
  proposes 1 event/5s for presence and 1/2s for thinking indicators. Are these
  appropriate?

**A:** Presence: 1 event per 5 seconds (correct — presence changes are slow). Agent thinking indicators: 1 per 2 seconds (correct — shows activity without flooding). Agent streaming chunks: no throttle (deliver as they arrive, ~10-20 events/second during active streaming). Spec change events: 1 per second (debounce rapid saves). Graph change events: no throttle (individual mutations are already debounced at the commit level).

- **Q**: Should throttling be server-side (buffer and drop), client-side
  (client ignores rapid events), or both? Server-side reduces bandwidth;
  client-side gives the client control.

**A:** Server-side throttling for presence and thinking indicators (these are high-frequency, low-value events). No throttling for agent streaming and spec changes (these are valuable events the client needs). The server implements throttling as a per-room debounce: rapid events of the same type are coalesced, with the latest data sent. Client-side throttling is not needed when the server controls emission rates.

---

## 8. Agent Streaming

### 8.1 Streaming Protocol
- **Q**: Should agent response streaming use WebSocket events (many small
  events) or Server-Sent Events (SSE, built-in streaming)? WebSocket events
  integrate with the existing system; SSE is purpose-built for server-to-client
  streaming but requires a separate connection.

**A:** WebSocket events. The WebSocket connection is already established for other events. Adding SSE would require a separate HTTP connection, separate authentication, and a second real-time transport to manage. Agent streaming events flow through the same Socket.IO connection as all other events: `agent:message:chunk`, `agent:message:complete`. This keeps the architecture simple and consistent.

- **Q**: How should agent streaming chunks be delimited? By token (every few
  tokens), by line, by sentence, or by a fixed time interval?

**A:** As they arrive from Claude Code's stdout stream. Claude Code's `stream-json` output emits events as they're generated. The server forwards each text chunk event from Claude Code to the WebSocket as an `agent:message:chunk` event. No artificial batching or delimitering — the natural streaming cadence from the LLM provides good UX (smooth character-by-character display). Each chunk is typically 5-20 characters (a few tokens).

- **Q**: Should the client receive raw text chunks or already-formatted chunks
  (with markdown rendering hints, code block boundaries, etc.)?

**A:** Raw text chunks for streaming content. The client accumulates text and renders markdown progressively (most markdown renderers handle partial input). Tool call events are structured JSON (type, tool name, arguments). The client handles formatting: text chunks go into a markdown renderer, tool calls render as progress indicators. The server does not pre-format — it streams Claude Code's output as-is.

### 8.2 Streaming Performance
- **Q**: What is the expected throughput of agent streaming events? If Claude
  generates ~100 tokens/second at ~5 chars/token, that's ~500 chars/second.
  Should chunks be larger (less overhead) or smaller (more responsive UI)?

**A:** ~500 chars/second is accurate. At ~10-20 events/second (each event carrying 25-50 chars), the WebSocket overhead is minimal (~2KB/second including JSON framing). Keep chunks small for responsive UI. The Socket.IO connection easily handles this throughput. No batching or buffering needed.

- **Q**: Should there be backpressure handling — if the client can't process
  events fast enough, should the server slow down? Or should the client just
  catch up?

**A:** The client catches up. WebSocket and Socket.IO buffer outgoing messages automatically at the TCP level. If the client is slow, messages queue in the kernel's TCP send buffer. At ~2KB/second, even a very slow client keeps up easily. No application-level backpressure needed. If a client is completely stuck (dead connection), Socket.IO's ping timeout will disconnect it after 20 seconds.

---

## 9. Scaling

### 9.1 Multi-Instance WebSocket
- **Q**: Is multi-instance WebSocket needed for the initial release, or will a
  single server instance handle expected load? If single instance supports
  ~1000 connections, how many concurrent users are expected?

**A:** Single instance for the initial release. Expected: 20-50 concurrent users, each with 1-2 WebSocket connections (project + session rooms) = 40-100 connections. A single Bun instance handles thousands of WebSocket connections. Multi-instance is not needed until concurrent users exceed ~500.

- **Q**: If scaling is needed, should the project use Socket.IO's Redis adapter
  from the start, or add it later? Starting with Redis adds complexity but
  avoids migration pain.

**A:** Add later. The Socket.IO Redis adapter is a drop-in addition (swap `io.adapter(createAdapter(redisClient))`) that requires no application code changes. Starting with Redis for <50 users is unnecessary complexity and an extra infrastructure dependency. The migration is well-documented and low-risk.

- **Q**: Should the architecture use sticky sessions (simpler) or stateless
  WebSocket with shared state in Redis (more resilient)? Sticky sessions are
  easier but create single points of failure.

**A:** Defer this decision until scaling is needed. For single-instance, it's moot. When scaling, use the Socket.IO Redis adapter (shared state) over sticky sessions. Sticky sessions complicate load balancer configuration and create availability issues when an instance goes down. The Redis adapter handles cross-instance message delivery transparently.

### 9.2 Performance Targets
- **Q**: What are the latency targets for WebSocket event delivery? < 50ms for
  agent streaming? < 200ms for spec change notifications?

**A:** Agent streaming: <50ms from Claude Code stdout to client WebSocket delivery (server processing adds ~5ms). Spec change notifications: <200ms from commit completion to client notification. Presence updates: <500ms (lower priority, throttled). These targets are easily achievable on a single instance with in-process event handling (no network hop for event routing).

- **Q**: What is the expected maximum number of concurrent WebSocket
  connections? This determines server resource requirements.

**A:** 200 concurrent connections for the initial deployment (50 users × 2-4 rooms each). Each Socket.IO connection uses ~10KB of memory. Total: ~2MB for connection state. Bun handles 10,000+ concurrent connections, so there's a 50x headroom. No special optimization needed.

- **Q**: Should the system support thousands of connections with minimal events,
  or fewer connections with high event throughput? This affects optimization
  strategy.

**A:** Fewer connections with moderate event throughput. The expected pattern: 50-200 connections, with burst throughput during agent streaming (~20 events/second per active agent session, 1-10 active sessions) and low baseline throughput (spec changes, presence — <1 event/second average). Optimize for streaming latency (forward Claude Code output immediately, no batching) rather than connection count.

---

## 10. Security

### 10.1 WebSocket Security
- **Q**: Should WebSocket connections be rate-limited per client? If so, what
  are reasonable limits? (10 events/second is proposed.)

**A:** Yes. Rate limit client-to-server events at 20 events/second per connection. This allows burst activity (rapid navigation, multiple subscriptions) while preventing abuse. Client-to-server events are primarily subscriptions and context updates — 20/second is generous. If a client exceeds the limit, events are dropped with a `rate:limit` warning event. Repeated violations (>5 in a minute) disconnect the client.

- **Q**: Should the server validate the `Origin` header on WebSocket handshake
  to prevent cross-site WebSocket hijacking?

**A:** Yes. Validate the `Origin` header against a whitelist of allowed origins (configurable via `ALLOWED_ORIGINS=http://localhost:3000,https://app.example.com`). Reject connections from unknown origins during the handshake. This prevents cross-site WebSocket hijacking where a malicious site opens a WebSocket to the server using the victim's cookies. Socket.IO supports origin validation in its server options.

- **Q**: Should there be payload size limits on client-to-server WebSocket
  messages? If so, what's the maximum? (1MB is proposed for server-to-client.)

**A:** Client-to-server: 64KB maximum. Client messages are subscriptions, context updates, and agent message text (capped at 32K chars ≈ 32KB). 64KB provides comfortable headroom. Server-to-client: 1MB maximum. Server messages can include full spec content and agent responses which may be larger. Configure via Socket.IO's `maxHttpBufferSize` option.

- **Q**: Should the system implement WebSocket-specific logging for security
  audit? (All connections, disconnections, room joins, and error events.)

**A:** Yes. Log at `info` level: connections (user ID, IP, user agent), disconnections (reason, duration), room joins/leaves (room name, user ID). Log at `warn` level: auth failures, rate limit violations, unauthorized room join attempts. Log at `error` level: unexpected disconnections, protocol errors. Use the same structured JSON logging as the REST API. The connection and room logs feed into the audit trail.

### 10.2 Data Privacy
- **Q**: Should WebSocket events be filtered based on the user's spec-level
  permissions, or should the client be trusted to handle permission filtering?
  Server-side filtering is more secure; client-side filtering is simpler.

**A:** Server-side filtering. Never trust the client for permission enforcement. When broadcasting spec events, the server checks each connected user's permission for that spec and sends the appropriate payload (full content, summary only, or nothing). This prevents data leakage through WebSocket events. The per-user broadcast logic runs only for private specs — public spec events use efficient room-level broadcasting.

- **Q**: Should WebSocket event payloads for private specs contain the spec ID
  (allowing the client to fetch via REST with auth) or be completely omitted?
  Omitting prevents even awareness of private spec changes.

**A:** Completely omitted for users with no access. If a user has no access to a private spec, they should not receive any event about it — not even the spec ID. This prevents enumeration attacks and information leakage. Users with `summary` access receive events with summary content. Users with `full` access receive full events. The event is simply not emitted to unauthorized users.
