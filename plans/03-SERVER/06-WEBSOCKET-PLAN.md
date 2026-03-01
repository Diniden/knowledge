# 03-SERVER / 06 — WEBSOCKET PLAN

> **Purpose**: Define the complete WebSocket implementation including the
> NestJS gateway, event type definitions and schemas, room/channel management,
> connection authentication, connection lifecycle, heartbeat and reconnection,
> message queuing for offline clients, broadcasting patterns, and binary data
> handling.
>
> **Phase**: 1 (Foundation) + Phase 3 (Agent)
> **Dependencies**: `03-SERVER/01-ARCHITECTURE-PLAN.md`
> **Estimated tasks**: 120+

---

## Table of Contents

1. [WebSocket Gateway Setup](#1-websocket-gateway-setup)
2. [Event Types & Schemas](#2-event-types--schemas)
3. [Room & Channel Management](#3-room--channel-management)
4. [Connection Authentication](#4-connection-authentication)
5. [Connection Lifecycle](#5-connection-lifecycle)
6. [Heartbeat & Reconnection](#6-heartbeat--reconnection)
7. [Message Queuing](#7-message-queuing)
8. [Broadcasting Patterns](#8-broadcasting-patterns)
9. [Binary Data Handling](#9-binary-data-handling)
10. [Error Handling & Recovery](#10-error-handling--recovery)
11. [Monitoring & Debugging](#11-monitoring--debugging)
12. [Performance & Scaling](#12-performance--scaling)

---

## 1. WebSocket Gateway Setup

### 1.1 Gateway Configuration

- [ ] **SV-WS-001**: Install WebSocket dependencies
  - `@nestjs/websockets` — NestJS WebSocket module
  - `@nestjs/platform-socket.io` — Socket.IO adapter for NestJS
  - `socket.io` — WebSocket library with fallback transports
  - Verify all packages work with Bun runtime
- [ ] **SV-WS-002**: Create `EventsGateway` using `@WebSocketGateway()` decorator
  - Configure gateway port (default: same as HTTP server)
  - Configure namespace: `/ws` (separate from REST API)
  - Configure CORS to match HTTP CORS settings
  - Configure transport: `['websocket']` (prefer WebSocket, no polling fallback)
  - Configure ping interval: 25 seconds
  - Configure ping timeout: 10 seconds
- [ ] **SV-WS-003**: Configure Socket.IO adapter in NestJS bootstrap
  - Use `IoAdapter` from `@nestjs/platform-socket.io`
  - Configure max HTTP buffer size (1MB for message payload)
  - Configure connection state recovery
  - Enable compression for large messages
- [ ] **SV-WS-004**: Implement gateway lifecycle hooks
  - `afterInit(server: Server)` — log server initialization
  - `handleConnection(client: Socket)` — handle new connections
  - `handleDisconnect(client: Socket)` — handle disconnections
  - Log connection and disconnection events with client metadata

### 1.2 Namespace Configuration

- [ ] **SV-WS-005**: Define WebSocket namespaces
  - `/ws` — main namespace for all client communication
  - Future consideration: `/ws/admin` for admin-only events
  - Future consideration: `/ws/agent` for agent-specific high-throughput events
- [ ] **SV-WS-006**: Configure namespace middleware
  - Authentication middleware on `/ws` namespace
  - Rate limiting middleware on `/ws` namespace
  - Logging middleware for all namespaces

---

## 2. Event Types & Schemas

### 2.1 Agent Events

- [ ] **SV-WS-007**: Define agent status events
  - `agent:session:started` — new agent session initialized
    - Payload: `{ sessionId, projectId, status, timestamp }`
  - `agent:session:ended` — agent session terminated
    - Payload: `{ sessionId, reason, duration, timestamp }`
  - `agent:status:changed` — agent status transition
    - Payload: `{ sessionId, previousStatus, currentStatus, timestamp }`
  - `agent:thinking` — agent is processing (thinking indicator)
    - Payload: `{ sessionId, description, timestamp }`
- [ ] **SV-WS-008**: Define agent message events
  - `agent:message:chunk` — streaming agent response chunk
    - Payload: `{ sessionId, messageId, chunk, index, timestamp }`
  - `agent:message:complete` — full agent response ready
    - Payload: `{ sessionId, messageId, content, actions, graphLinks, timestamp }`
  - `agent:message:error` — agent message failed
    - Payload: `{ sessionId, messageId, error, recoverable, timestamp }`
- [ ] **SV-WS-009**: Define agent action events
  - `agent:action:proposed` — agent proposes an action for approval
    - Payload: `{ sessionId, actionId, type, description, details, timestamp }`
  - `agent:action:executed` — agent completed an approved action
    - Payload: `{ sessionId, actionId, result, timestamp }`
  - `agent:action:failed` — agent action execution failed
    - Payload: `{ sessionId, actionId, error, timestamp }`

### 2.2 Spec & Document Events

- [ ] **SV-WS-010**: Define spec change events
  - `spec:created` — new spec created
    - Payload: `{ projectId, specId, title, documentId, createdBy, timestamp }`
  - `spec:updated` — spec content or metadata changed
    - Payload: `{ projectId, specId, title, updatedBy, changes, commitHash, timestamp }`
  - `spec:deleted` — spec removed
    - Payload: `{ projectId, specId, title, deletedBy, timestamp }`
  - `spec:reverted` — spec reverted to previous version
    - Payload: `{ projectId, specId, toCommitHash, revertedBy, timestamp }`
- [ ] **SV-WS-011**: Define document change events
  - `document:created` — new document created
    - Payload: `{ projectId, documentId, title, createdBy, timestamp }`
  - `document:updated` — document metadata or spec order changed
    - Payload: `{ projectId, documentId, title, updatedBy, timestamp }`
  - `document:deleted` — document removed
    - Payload: `{ projectId, documentId, title, deletedBy, timestamp }`

### 2.3 Graph Events

- [ ] **SV-WS-012**: Define knowledge graph change events
  - `graph:edge:created` — new edge added
    - Payload: `{ projectId, edgeId, sourceNodeId, targetNodeId, type, createdBy, timestamp }`
  - `graph:edge:updated` — edge metadata changed
    - Payload: `{ projectId, edgeId, changes, updatedBy, timestamp }`
  - `graph:edge:deleted` — edge removed
    - Payload: `{ projectId, edgeId, deletedBy, timestamp }`
  - `graph:node:updated` — graph node metadata changed
    - Payload: `{ projectId, nodeId, changes, timestamp }`
- [ ] **SV-WS-013**: Define graph analysis events
  - `graph:inquiry:created` — agent flagged a graph issue
    - Payload: `{ projectId, inquiryId, nodeId, type, message, timestamp }`
  - `graph:analysis:complete` — agent finished graph analysis
    - Payload: `{ projectId, sessionId, findings, timestamp }`

### 2.4 Collaboration Events

- [ ] **SV-WS-014**: Define sync events
  - `sync:available` — remote has new changes available
    - Payload: `{ projectId, commitsBehind, lastRemoteCommit, timestamp }`
  - `sync:pull:started` — pull operation started
    - Payload: `{ projectId, userId, timestamp }`
  - `sync:pull:completed` — pull operation completed
    - Payload: `{ projectId, newCommits, changedFiles, conflicts, timestamp }`
  - `sync:push:completed` — push operation completed
    - Payload: `{ projectId, userId, commitsPushed, timestamp }`
  - `sync:conflict:detected` — merge conflict detected
    - Payload: `{ projectId, conflictFiles, userId, timestamp }`
- [ ] **SV-WS-015**: Define presence events
  - `presence:user:online` — user connected to project
    - Payload: `{ projectId, userId, username, timestamp }`
  - `presence:user:offline` — user disconnected from project
    - Payload: `{ projectId, userId, timestamp }`
  - `presence:user:editing` — user is editing a spec
    - Payload: `{ projectId, userId, specId, timestamp }`
  - `presence:user:idle` — user stopped editing
    - Payload: `{ projectId, userId, timestamp }`

### 2.5 System Events

- [ ] **SV-WS-016**: Define system-level events
  - `system:notification` — generic system notification
    - Payload: `{ type, title, message, severity, timestamp }`
  - `system:maintenance` — server maintenance notification
    - Payload: `{ action, scheduledAt, duration, message, timestamp }`
  - `system:capacity` — server capacity status update
    - Payload: `{ agentSessionsAvailable, queueDepth, timestamp }`
- [ ] **SV-WS-017**: Define error events
  - `error:connection` — connection-level error
    - Payload: `{ code, message, timestamp }`
  - `error:subscription` — failed to subscribe to room/event
    - Payload: `{ room, reason, timestamp }`
  - `error:authorization` — unauthorized event access
    - Payload: `{ event, reason, timestamp }`

### 2.6 Client-to-Server Events

- [ ] **SV-WS-018**: Define client-initiated events
  - `client:join:project` — join a project room
    - Payload: `{ projectId }`
  - `client:leave:project` — leave a project room
    - Payload: `{ projectId }`
  - `client:join:session` — subscribe to agent session updates
    - Payload: `{ sessionId }`
  - `client:leave:session` — unsubscribe from agent session updates
    - Payload: `{ sessionId }`
  - `client:presence:update` — update user presence/activity
    - Payload: `{ projectId, activity, specId? }`
  - `client:ping` — client heartbeat
    - Payload: `{ timestamp }`

### 2.7 Event Schema Validation

- [ ] **SV-WS-019**: Create event payload DTOs for all events
  - Use `class-validator` decorators for payload validation
  - Validate incoming client events before processing
  - Document all event schemas for frontend team
- [ ] **SV-WS-020**: Create event type registry
  - Central registry of all event types and their payload schemas
  - Type-safe event emission: `emit<T extends EventType>(type: T, payload: EventPayload<T>)`
  - Export event type constants for client and server shared package
- [ ] **SV-WS-021**: Define event versioning strategy
  - Include `version` field in event payloads (default: 1)
  - Support handling multiple event versions during migration
  - Document breaking changes in event schemas

---

## 3. Room & Channel Management

### 3.1 Room Structure

- [ ] **SV-WS-022**: Define room naming convention
  - User room: `user:{userId}` — events specific to a user
  - Project room: `project:{projectId}` — all project events
  - Session room: `session:{sessionId}` — agent session events
  - Document room: `document:{documentId}` — document edit events
  - Admin room: `admin` — admin-only system events
- [ ] **SV-WS-023**: Implement automatic room assignment on connection
  - On connection: join user's personal room (`user:{userId}`)
  - On `client:join:project`: join project room (with permission check)
  - On `client:join:session`: join session room (with ownership check)
  - Log room joins and leaves
- [ ] **SV-WS-024**: Implement room permission enforcement
  - Verify user is a project member before joining project room
  - Verify user owns session before joining session room
  - Admin room requires admin role
  - Reject unauthorized join attempts with error event

### 3.2 Room Lifecycle

- [ ] **SV-WS-025**: Implement room cleanup on disconnect
  - Remove client from all rooms on disconnect
  - Broadcast presence update to project rooms user was in
  - Clean up empty rooms (optional, Socket.IO handles automatically)
- [ ] **SV-WS-026**: Implement room membership tracking
  - Track active members per room
  - Expose room membership for presence features
  - `getRoomMembers(room: string): Promise<string[]>` — list connected users
  - `getUserRooms(userId: string): Promise<string[]>` — list user's rooms
- [ ] **SV-WS-027**: Implement room-based event routing
  - Project events → project room
  - Agent events → session room + user room (owner)
  - Spec events → project room (all members)
  - Sync events → project room (all members)
  - System events → broadcast to all connected clients

---

## 4. Connection Authentication

### 4.1 Token Authentication

- [ ] **SV-WS-028**: Implement WebSocket authentication middleware
  - Extract JWT from connection handshake
  - Options: auth header in handshake, cookie in handshake, query param
  - Prefer: cookie-based (consistent with HTTP auth)
  - Fallback: `auth.token` in Socket.IO handshake options
- [ ] **SV-WS-029**: Implement JWT validation for WebSocket connections
  - Verify token signature and expiration
  - Extract user identity from token payload
  - Attach user to `client.data.user`
  - Reject connection if token is invalid (send error, disconnect)
- [ ] **SV-WS-030**: Handle token expiration during active connection
  - When access token expires, client sends refresh event
  - Server validates refresh token
  - If valid: issue new access token, update client.data
  - If invalid: disconnect with `AUTH_EXPIRED` reason
  - Client re-authenticates and reconnects
- [ ] **SV-WS-031**: Implement connection rejection for invalid auth
  - Invalid token → disconnect with error: `{ code: 'AUTH_INVALID', message: 'Invalid token' }`
  - Expired token → disconnect with error: `{ code: 'AUTH_EXPIRED', message: 'Token expired' }`
  - Missing token → disconnect with error: `{ code: 'AUTH_MISSING', message: 'Authentication required' }`
  - Log rejection events with client IP

### 4.2 Authorization per Event

- [ ] **SV-WS-032**: Implement event-level authorization
  - Before processing client events, check user has permission
  - Project events: user must be project member
  - Session events: user must own the session
  - Admin events: user must have admin role
  - Use guard pattern similar to HTTP guards
- [ ] **SV-WS-033**: Create `WsAuthGuard` for WebSocket event handlers
  - Extract user from `client.data`
  - Validate user is authenticated
  - Apply to all `@SubscribeMessage()` handlers
- [ ] **SV-WS-034**: Create `WsProjectGuard` for project-scoped events
  - Extract projectId from event payload
  - Verify user is a member of the project
  - Return error event if unauthorized

---

## 5. Connection Lifecycle

### 5.1 Connection Establishment

- [ ] **SV-WS-035**: Handle new WebSocket connection
  - Authenticate client (see section 4)
  - Assign unique connection ID
  - Join user's personal room
  - Record connection metadata: userId, IP, userAgent, connectedAt
  - Send `system:welcome` event with server state
  - Broadcast `presence:user:online` to relevant rooms
- [ ] **SV-WS-036**: Define `system:welcome` event payload
  - Server time (for clock synchronization)
  - Protocol version
  - Available event types
  - User's active sessions summary
  - Reconnection token (for seamless reconnect)
- [ ] **SV-WS-037**: Implement connection metadata tracking
  - Store per-connection: userId, connectionId, IP, userAgent, rooms, connectedAt, lastActivity
  - Update lastActivity on each event
  - Expose via admin endpoint and health check

### 5.2 Connection Termination

- [ ] **SV-WS-038**: Handle WebSocket disconnection
  - Identify disconnection reason: client close, network error, server kick, auth expired
  - Remove client from all rooms
  - Broadcast `presence:user:offline` to relevant rooms
  - Clean up connection metadata
  - Log disconnection with reason and duration
- [ ] **SV-WS-039**: Implement graceful connection close
  - Send `system:closing` event before server-initiated disconnect
  - Include: reason, reconnect instructions
  - Wait 1 second for client acknowledgment
  - Close connection
- [ ] **SV-WS-040**: Implement forced disconnection
  - `disconnectUser(userId: string, reason: string)` — kick all connections for a user
  - `disconnectClient(connectionId: string, reason: string)` — kick specific connection
  - Used for: token revocation, account deactivation, admin action
  - Send error event before disconnecting

### 5.3 Connection State Recovery

- [ ] **SV-WS-041**: Implement Socket.IO connection state recovery
  - Enable `connectionStateRecovery` in Socket.IO config
  - Set recovery timeout: 2 minutes
  - On reconnect within window: restore room memberships
  - On reconnect within window: deliver missed events
  - Beyond recovery window: full re-authentication and re-join
- [ ] **SV-WS-042**: Implement client connection ID persistence
  - Assign stable connection ID per user (not per socket)
  - Maintain ID across reconnections
  - Use for: message delivery tracking, deduplication

---

## 6. Heartbeat & Reconnection

### 6.1 Server-Side Heartbeat

- [ ] **SV-WS-043**: Configure Socket.IO ping/pong mechanism
  - Ping interval: 25 seconds (server sends ping)
  - Ping timeout: 10 seconds (client must respond)
  - If client doesn't respond: disconnect as unresponsive
  - Log: client ping latency for monitoring
- [ ] **SV-WS-044**: Implement application-level heartbeat (optional)
  - Beyond Socket.IO ping/pong, send `system:heartbeat` every 60 seconds
  - Include: server time, connection duration, pending messages count
  - Client responds with `client:heartbeat:ack`
  - Track heartbeat round-trip time

### 6.2 Client Reconnection Support

- [ ] **SV-WS-045**: Define reconnection protocol
  - Client reconnects with same auth token
  - Include last received event ID/timestamp for catch-up
  - Server sends missed events since last received
  - Restore room memberships
  - Send `system:reconnected` event with recovery summary
- [ ] **SV-WS-046**: Implement event catch-up on reconnection
  - Maintain per-user event buffer (last 5 minutes of events)
  - On reconnection: identify missed events by timestamp/sequence
  - Deliver missed events in order
  - Mark events as delivered
  - Clear buffer entries older than 5 minutes
- [ ] **SV-WS-047**: Implement reconnection window
  - Allow reconnection within 2-minute window without re-auth
  - Beyond 2 minutes: require full re-authentication
  - Beyond 30 minutes: treat as new connection (no event catch-up)
  - Log reconnection timing for reliability metrics

---

## 7. Message Queuing

### 7.1 Offline Message Queue

- [ ] **SV-WS-048**: Implement per-user message queue for disconnected clients
  - When user is disconnected, queue important events
  - Queue: agent messages, spec changes, sync notifications
  - Skip: presence updates, heartbeats, system capacity (ephemeral)
  - Max queue size: 100 events per user
  - Max queue age: 30 minutes
- [ ] **SV-WS-049**: Implement queue delivery on reconnection
  - On reconnect: check queue for pending messages
  - Deliver queued messages in chronological order
  - Mark as delivered
  - Send `system:queued:delivered` summary event
  - Clear delivered messages from queue
- [ ] **SV-WS-050**: Implement queue overflow handling
  - When queue exceeds 100 events: drop oldest non-critical events
  - Never drop: agent action proposals, sync conflict notifications
  - Compact: replace multiple spec:updated events with latest only
  - Compact: replace multiple presence events with latest state

### 7.2 Event Priority

- [ ] **SV-WS-051**: Define event priority levels
  - `critical` — must be delivered (agent proposals needing approval, conflicts)
  - `high` — important (agent messages, spec changes, sync results)
  - `normal` — standard (presence updates, status changes)
  - `low` — ephemeral (thinking indicators, typing indicators)
- [ ] **SV-WS-052**: Implement priority-based queue management
  - Critical events always queued (never dropped)
  - High events queued up to limit
  - Normal events queued if space available
  - Low events never queued (drop on disconnect)
- [ ] **SV-WS-053**: Implement event deduplication in queue
  - If same event type for same resource is queued multiple times
  - Keep only the latest version
  - Example: multiple `spec:updated` for same specId → keep last
  - Apply deduplication rules per event type

---

## 8. Broadcasting Patterns

### 8.1 Targeted Broadcasting

- [ ] **SV-WS-054**: Implement `WebSocketService` for server-side event emission
  - `emitToUser(userId: string, event: string, payload: any)` — send to specific user
  - `emitToProject(projectId: string, event: string, payload: any)` — send to all project members
  - `emitToSession(sessionId: string, event: string, payload: any)` — send to session subscriber
  - `emitToRoom(room: string, event: string, payload: any)` — send to room
  - `broadcast(event: string, payload: any)` — send to all connected clients
- [ ] **SV-WS-055**: Implement `emitToUser()` — user-targeted emission
  - Look up all connections for the user
  - Send event to each connection
  - Queue if user has no active connections
  - Return: delivered (boolean), queued (boolean)
- [ ] **SV-WS-056**: Implement `emitToProject()` — project-targeted emission
  - Send to `project:{projectId}` room
  - Exclude the sender (optional parameter)
  - Filter by permission level (some events only for full-access users)
  - Log: event type, project, recipient count
- [ ] **SV-WS-057**: Implement `emitToSession()` — session-targeted emission
  - Send to `session:{sessionId}` room
  - Used for: agent streaming output, status changes
  - High-frequency: optimize for minimal overhead

### 8.2 Event Emission from Services

- [ ] **SV-WS-058**: Integrate WebSocket emission with domain services
  - `SpecsService` emits `spec:created/updated/deleted` after mutations
  - `GraphService` emits `graph:edge:created/updated/deleted` after changes
  - `AgentSessionService` emits `agent:*` events during session lifecycle
  - `GitSyncService` emits `sync:*` events during sync operations
  - Use `EventEmitter2` as intermediary (service → event → WebSocket)
- [ ] **SV-WS-059**: Implement event-to-WebSocket bridge
  - Subscribe to internal `EventEmitter2` events
  - Transform internal events to WebSocket events
  - Route to appropriate rooms based on event context
  - Decouple domain services from WebSocket implementation
- [ ] **SV-WS-060**: Implement sender exclusion
  - When a user creates a spec, don't echo the `spec:created` event back to them
  - The user already knows about their own action
  - Pass `excludeUserId` to emission methods
  - Handle: user with multiple connections (exclude all)

### 8.3 Throttling & Batching

- [ ] **SV-WS-061**: Implement event throttling for high-frequency events
  - Presence updates: throttle to 1 event per 5 seconds per user
  - Graph analysis events: throttle to 1 per second
  - Agent thinking indicators: throttle to 1 per 2 seconds
  - Configure throttle windows per event type
- [ ] **SV-WS-062**: Implement event batching for burst scenarios
  - When multiple spec changes happen rapidly (batch commit)
  - Collect events within 200ms window
  - Send as single batch event: `batch:updates`
  - Payload: array of individual events
  - Client can process batch atomically or individually
- [ ] **SV-WS-063**: Implement rate limiting for client events
  - Max 10 client events per second per connection
  - Max 100 client events per minute per connection
  - Reject excess events with `error:rate_limited`
  - Prevent abuse from malicious or buggy clients

---

## 9. Binary Data Handling

### 9.1 Binary Support

- [ ] **SV-WS-064**: Evaluate binary data needs
  - Determine if any events require binary payload (images, files)
  - Current assessment: unlikely for knowledge graph (all JSON/text)
  - Potential use: streaming agent output with embedded media
  - Decision: support binary via Socket.IO's native binary handling if needed
- [ ] **SV-WS-065**: Implement binary event support (if needed)
  - Socket.IO natively handles binary data in events
  - Define binary event types: `media:upload:chunk`, `media:download:chunk`
  - Set max binary message size: 5MB
  - Implement chunking for large binary transfers

### 9.2 Large Message Handling

- [ ] **SV-WS-066**: Handle large text messages
  - Max event payload size: 1MB (configurable)
  - For agent responses exceeding limit: chunk into multiple events
  - Implement message reassembly protocol
  - Client: buffer chunks, assemble on complete event
- [ ] **SV-WS-067**: Implement message compression
  - Enable Socket.IO per-message deflate compression
  - Effective for large JSON payloads (spec content, graph data)
  - Monitor compression ratio for effectiveness
  - Disable for small messages (< 1KB, compression overhead exceeds benefit)

---

## 10. Error Handling & Recovery

### 10.1 Gateway Error Handling

- [ ] **SV-WS-068**: Implement WebSocket exception filter
  - Catch errors in `@SubscribeMessage()` handlers
  - Format error as WebSocket error event (not crash)
  - Send error event to the specific client that caused it
  - Log error with client context (userId, connectionId, event type)
- [ ] **SV-WS-069**: Handle serialization errors
  - If event payload fails to serialize (circular reference, invalid type)
  - Log serialization error with event details
  - Send generic error event to client
  - Do not crash the gateway
- [ ] **SV-WS-070**: Handle room operation errors
  - If room join fails (room doesn't exist, permission denied)
  - Send error event to client: `error:subscription`
  - Log with context
  - Do not affect other room operations

### 10.2 Recovery from Server Events

- [ ] **SV-WS-071**: Handle EventEmitter2 listener errors
  - If a WebSocket emission fails from an internal event
  - Log error but don't propagate to the event emitter
  - Retry emission once
  - If retry fails: queue event for later delivery
- [ ] **SV-WS-072**: Handle Socket.IO adapter errors
  - If the underlying transport fails (write error, buffer full)
  - Log error with connection context
  - Attempt graceful disconnection of affected client
  - Clean up client state

### 10.3 Client Error Handling

- [ ] **SV-WS-073**: Handle malformed client events
  - Validate event name against known event types
  - Validate payload against DTO schema
  - Reject unknown events with `error:unknown_event`
  - Reject invalid payloads with `error:invalid_payload`
  - Log for security monitoring (potential abuse)
- [ ] **SV-WS-074**: Handle client event floods
  - Detect rapid event sending from single client
  - Rate limit exceeded → send `error:rate_limited`
  - Persistent flooding → disconnect client
  - Log flooding events for security review

---

## 11. Monitoring & Debugging

### 11.1 Connection Metrics

- [ ] **SV-WS-075**: Track connection metrics
  - Total active connections gauge
  - Connections per user gauge
  - Connection duration histogram
  - Connection establishment rate (per minute)
  - Disconnection rate and reasons
  - Room membership counts
- [ ] **SV-WS-076**: Track message metrics
  - Total events sent (per event type)
  - Total events received (per event type)
  - Event payload size histogram
  - Event delivery latency (server → client acknowledgment)
  - Queue depth (pending messages for disconnected users)
- [ ] **SV-WS-077**: Expose WebSocket metrics via health endpoint
  - `GET /api/v1/health/websocket`
  - Response: activeConnections, totalRooms, queueDepth, eventRate

### 11.2 Debugging Tools

- [ ] **SV-WS-078**: Implement admin WebSocket inspection endpoint
  - `GET /api/v1/admin/websocket/connections` — list all connections
  - Include: userId, connectionId, rooms, connectedAt, lastActivity, IP
  - Support filtering by userId, room, IP
- [ ] **SV-WS-079**: Implement admin event replay
  - `POST /api/v1/admin/websocket/replay`
  - Replay a specific event to a specific user (for debugging)
  - Useful for testing frontend event handlers
  - Admin-only, audit-logged
- [ ] **SV-WS-080**: Implement connection event logging
  - Log all connection lifecycle events at debug level
  - Log event routing decisions at debug level
  - Log room joins/leaves at debug level
  - Configurable: enable/disable per event type

### 11.3 Client Debugging Support

- [ ] **SV-WS-081**: Implement `debug` event for client development
  - When client sends `client:debug:echo`, server echoes back
  - Useful for testing connection and latency
  - Only available in development mode
- [ ] **SV-WS-082**: Implement event tracing
  - Optional `traceId` in event payloads
  - Server includes same `traceId` in response events
  - Client can correlate sent events with received responses
  - Useful for debugging async event flows

---

## 12. Performance & Scaling

### 12.1 Connection Limits

- [ ] **SV-WS-083**: Configure maximum concurrent connections
  - Default: 1000 connections (configurable)
  - Per-user: max 5 connections (multiple tabs/devices)
  - Reject new connections when at capacity
  - Send `error:capacity` event before rejection
  - Log connection rejections
- [ ] **SV-WS-084**: Implement connection cleanup for stale connections
  - Detect connections with no activity for 10 minutes
  - Send ping to verify connection is alive
  - If no pong within 10 seconds: disconnect as stale
  - Run cleanup every 60 seconds
- [ ] **SV-WS-085**: Implement graceful connection shedding under load
  - Monitor: event processing latency, CPU usage, memory
  - If system is overloaded: disconnect lowest-priority connections
  - Priority: admin > active sessions > idle connections
  - Log shedding decisions

### 12.2 Event Performance

- [ ] **SV-WS-086**: Optimize event serialization
  - Use efficient JSON serialization (avoid deep nesting)
  - Pre-serialize events that go to multiple clients
  - Cache serialized events for broadcast (don't re-serialize per client)
- [ ] **SV-WS-087**: Optimize room-based broadcasting
  - Socket.IO handles room broadcasting efficiently
  - Monitor: time to broadcast to all room members
  - For large rooms (> 100 members): consider pagination or chunking
  - Benchmark: broadcast latency with 10, 100, 1000 room members
- [ ] **SV-WS-088**: Implement event pipeline optimization
  - Profile the event emission pipeline
  - Identify bottlenecks: serialization, room lookup, write
  - Target: < 5ms from emission to write for single-client events
  - Target: < 50ms from emission to all-delivered for room broadcasts

### 12.3 Horizontal Scaling Preparation

- [ ] **SV-WS-089**: Prepare for Socket.IO Redis adapter
  - Design room and event system to work with Redis pub/sub adapter
  - Avoid in-memory-only state that doesn't transfer across instances
  - Store connection metadata in shared store (Redis) not just in-memory
  - Document migration path to multi-instance WebSocket
- [ ] **SV-WS-090**: Implement sticky session support (if needed)
  - Socket.IO requires sticky sessions with multiple instances
  - Configure load balancer for WebSocket sticky sessions
  - Use client IP or Socket.IO session ID for affinity
  - Document load balancer configuration requirements
- [ ] **SV-WS-091**: Implement cross-instance event broadcasting
  - Use Socket.IO Redis adapter for cross-instance events
  - Events published on one instance delivered to clients on another
  - Room memberships synchronized across instances
  - Fall back to single-instance if Redis unavailable

---

## Summary

| Section | Task Range | Count |
|---------|-----------|-------|
| 1. WebSocket Gateway Setup | SV-WS-001 – 006 | 6 |
| 2. Event Types & Schemas | SV-WS-007 – 021 | 15 |
| 3. Room & Channel Management | SV-WS-022 – 027 | 6 |
| 4. Connection Authentication | SV-WS-028 – 034 | 7 |
| 5. Connection Lifecycle | SV-WS-035 – 042 | 8 |
| 6. Heartbeat & Reconnection | SV-WS-043 – 047 | 5 |
| 7. Message Queuing | SV-WS-048 – 053 | 6 |
| 8. Broadcasting Patterns | SV-WS-054 – 063 | 10 |
| 9. Binary Data Handling | SV-WS-064 – 067 | 4 |
| 10. Error Handling & Recovery | SV-WS-068 – 074 | 7 |
| 11. Monitoring & Debugging | SV-WS-075 – 082 | 8 |
| 12. Performance & Scaling | SV-WS-083 – 091 | 9 |
| **TOTAL** | | **91** |
