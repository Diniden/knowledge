# 07 — DATABASE: Open Questions

> **Purpose**: Unresolved questions about the PostgreSQL database layer including
> ORM selection, schema design decisions, migration strategy, performance
> optimization, and operational concerns. Answers may change tasks in the plan.

---

## 1. ORM & Query Layer

### 1.1 Library Selection
- **Q**: Should the project use Drizzle ORM (lightweight, SQL-close, excellent
  TypeScript inference) or Prisma (schema-first, powerful migrations, larger
  runtime)? Drizzle is more ESM-native and lighter; Prisma has a richer
  ecosystem and migration tooling. Which tradeoff matters more?

**A:** Drizzle ORM, per the PRD. Drizzle's SQL-close approach gives full control over query generation, its TypeScript inference is best-in-class, and it has no binary runtime dependency (unlike Prisma's Rust query engine). Drizzle is ESM-native, works well under Bun, and produces smaller bundles. Its migration tooling (`drizzle-kit`) handles schema generation and migration management adequately.

- **Q**: Has the team verified that the chosen ORM works fully under Bun
  runtime? Some ORMs rely on Node.js-specific APIs (`child_process` for
  migration CLI, `fs` internals) that may behave differently in Bun.

**A:** Drizzle ORM is verified compatible with Bun. Drizzle's core has no Node.js-specific dependencies — it uses standard SQL driver APIs. `drizzle-kit` (CLI tool for migrations) runs under Bun via `bunx drizzle-kit`. The PostgreSQL driver should be `postgres` (postgres.js), which is a pure JavaScript implementation that works under Bun without native bindings. Avoid `pg` (node-postgres) which has optional native bindings that may cause issues.

- **Q**: Should the ORM provide a repository pattern (like TypeORM) or a
  query-builder pattern (like Drizzle/Knex)? Repository pattern integrates
  naturally with NestJS DI; query-builder is more flexible and explicit.

**A:** Query-builder pattern (Drizzle's native approach). Wrap Drizzle's query builder in NestJS service classes that act as repositories for DI purposes. Example: `SpecPermissionService` injects the Drizzle instance and exposes methods like `findBySpecId()`, `checkAccess()`. This gives NestJS DI integration while preserving Drizzle's explicit SQL control. The service layer IS the repository — no need for a separate repository abstraction.

- **Q**: If using Prisma, is the Prisma Client binary compatible with Bun?
  Prisma uses a Rust-based query engine binary — does it work in the Bun
  context?

**A:** N/A — using Drizzle, not Prisma.

### 1.2 Raw SQL vs ORM
- **Q**: Should performance-critical queries (e.g., permission checks, audit
  log queries, notification counts) use raw SQL instead of ORM abstractions?
  Raw SQL gives full control over query plans but loses type safety.

**A:** Use Drizzle's query builder for all queries, including performance-critical ones. Drizzle generates efficient SQL and provides full TypeScript type safety. Drizzle's `sql` template tag allows raw SQL fragments within typed queries for cases where the builder is insufficient (e.g., CTEs, window functions, pgvector operators). This gives the best of both worlds: type safety by default, raw SQL escape hatch when needed.

- **Q**: Should database functions (stored procedures, triggers) be managed
  through the ORM's migration system, or maintained as separate SQL files?

**A:** Through Drizzle's migration system. Custom SQL (functions, triggers, indexes) is written in migration files using `sql` blocks. This keeps all schema changes in one migration history. Separate SQL files create a parallel schema management system that can drift from the migration state. The migration file clearly documents when each function/trigger was created or modified.

---

## 2. Schema Design

### 2.1 ID Strategy
- **Q**: Should primary keys be UUIDs (globally unique, no conflicts in
  distributed scenarios) or auto-incrementing integers (smaller, faster joins,
  natural ordering)? UUIDs are recommended for a system that may sync between
  users, but they have performance implications for B-tree indexes.

**A:** UUIDv7 for all PostgreSQL primary keys. UUIDv7 is time-sorted, which preserves B-tree index locality and avoids the random-write fragmentation of UUIDv4. The 128-bit size is larger than integers but the join performance difference is negligible at the target scale (<100K rows per table). UUIDs eliminate ID collision concerns for multi-user sync scenarios and are globally unique across tables.

- **Q**: If UUIDs, should the project use UUIDv4 (random) or UUIDv7
  (time-sorted)? UUIDv7 preserves insertion order in B-tree indexes, reducing
  index fragmentation and improving range scan performance.

**A:** UUIDv7. Time-sorted UUIDs give natural insertion-order in indexes, better page utilization, and faster range scans. Generated via a `uuidv7()` helper function in the application layer (using the `uuidv7` npm package or a custom implementation). PostgreSQL stores UUIDs as 16-byte native type — efficient storage regardless of version.

- **Q**: The `spec_id` in `spec_permissions` references a spec stored in JSON
  files (not in PostgreSQL). Should there be a `specs` table in PostgreSQL as
  a lightweight registry, or is the VARCHAR reference to the JSON spec ID
  sufficient?

**A:** Yes, create a lightweight `spec_registry` table: `{ spec_id VARCHAR PRIMARY KEY, title TEXT, status VARCHAR, project_id UUID, created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ }`. This table mirrors key spec metadata from the JSON files and enables: efficient permission joins, fast spec listing/filtering without reading JSON files, and referential integrity for `spec_permissions.spec_id`. The registry is updated synchronously whenever a spec is created, updated, or deleted. It is NOT the source of truth (JSON files are) — it's a query accelerator.

### 2.2 JSONB vs Normalized Columns
- **Q**: `settings_json`, `context_json`, `metadata_json`, `parameters_json`,
  `payload_json`, `details_json`, and `result_json` are all JSONB columns.
  Should any of these be normalized into proper columns? JSONB is flexible but
  loses schema enforcement and makes migrations of JSON structure harder.

**A:** Keep JSONB for truly dynamic/variable structures. Normalize columns that are queried or filtered frequently:

- `users.settings_json`: Keep as JSONB. User settings are read-whole/write-whole, rarely queried by individual fields.
- `agent_sessions.context_json`: Keep as JSONB. Agent context is complex and varies per session. Read-whole by the agent.
- `notification_queue.payload_json`: Keep as JSONB with a discriminated `type` column alongside it. Each notification type has different payload structure; JSONB is appropriate.
- `audit_logs.details_json`: Keep as JSONB. Audit details vary by action type. Queried by time range and action type (normalized columns), not by detail content.
- `agent_messages.metadata_json`: Keep as JSONB. Tool call details are complex and variable.

General rule: if the data is queried by its contents, normalize it. If it's stored and retrieved as a whole blob, keep it JSONB.

- **Q**: For `agent_sessions.context_json`, the structure may become complex
  (active spec IDs, graph context, conversation history pointers). Should this
  be a separate `agent_session_context` table with normalized columns?

**A:** Keep as JSONB in `agent_sessions`. The context is read and written as a whole object by the agent service. It is never queried by individual fields (no "find all sessions where active_spec_id = X"). Normalizing it would add join overhead for every agent operation with no query benefit. The application layer validates the JSON structure via TypeScript types.

- **Q**: For `notification_queue.payload_json`, each notification type has
  different payload structure. Should there be a discriminated union type
  validated at the application layer, or should each type have its own table?

**A:** Discriminated union validated at the application layer. The `notification_queue` table has a `type VARCHAR` column that determines the expected payload structure. TypeScript discriminated union types (`type SpecUpdatedPayload = { specId: string, changes: ... }`, etc.) validate the payload on read/write. One table is simpler to query, index, and manage than N notification-type-specific tables.

### 2.3 Enum Strategy
- **Q**: Should status/type fields use PostgreSQL `CREATE TYPE ... AS ENUM` or
  `VARCHAR + CHECK` constraints? Enums are type-safe and faster but painful to
  modify (adding values requires `ALTER TYPE`; removing values is impossible
  without recreating the type). VARCHAR + CHECK is more flexible.

**A:** `VARCHAR` with `CHECK` constraints. Adding new status values only requires `ALTER TABLE ... DROP CONSTRAINT ... ADD CONSTRAINT ...`, which is a lightweight DDL operation. PostgreSQL enums require `ALTER TYPE ... ADD VALUE` (append-only, no removal, no reordering). Since the knowledge graph is evolving and status values may change, `VARCHAR + CHECK` provides the flexibility needed without meaningful performance difference at this scale.

- **Q**: Should the enum/check values be defined in a single source of truth
  (shared types package) that generates both TypeScript types and SQL
  constraints?

**A:** Yes. Define enum values in a shared TypeScript file (`packages/shared/src/enums.ts`) that exports both TypeScript `const` arrays and type unions. The migration scripts import these arrays to generate `CHECK` constraints. Example: `export const SPEC_STATUSES = ['draft', 'review', 'active', 'deprecated', 'archived'] as const; export type SpecStatus = typeof SPEC_STATUSES[number];` The migration uses `CHECK (status IN ('draft', 'review', 'active', 'deprecated', 'archived'))` generated from the same source.

### 2.4 Timestamp Handling
- **Q**: Should all timestamps use `TIMESTAMPTZ` (timezone-aware) or
  `TIMESTAMP` (timezone-naive)? `TIMESTAMPTZ` is strongly recommended for
  multi-timezone users, but all timestamps must be stored in UTC.

**A:** `TIMESTAMPTZ` for all timestamp columns, no exceptions. PostgreSQL converts all `TIMESTAMPTZ` values to UTC for storage and converts back on retrieval based on the session timezone. Set the application's database connection to `SET timezone = 'UTC'` to ensure consistent behavior. This handles multi-timezone users correctly without any application-level conversion logic.

- **Q**: Should `created_at` and `updated_at` use database-level defaults
  (`DEFAULT NOW()`) or be set by the application? Database defaults ensure
  consistency but make testing harder (can't set explicit timestamps).

**A:** Database-level defaults for `created_at`: `DEFAULT NOW()`. Application-set for `updated_at`: the NestJS service sets `updatedAt = new Date()` on every update. This ensures `created_at` is always set (even if the application forgets) while allowing `updated_at` to be controlled by the application for testing. For tests that need explicit `created_at`, insert with an explicit value (database defaults are only used when the column is omitted).

---

## 3. Permission Model

### 3.1 Spec Permission Architecture
- **Q**: The `spec_permissions` table has one row per spec per project. If a
  project has 1,000 specs, that's 1,000 rows just for the owner. Should the
  default permission be implicit (no row means "owner has full access") with
  rows only for explicit overrides?

**A:** Implicit defaults. No rows for the project owner — owner always has `full` access to all specs (enforced in application logic). No rows for the default permission level — all users without an explicit override get `summary` access (per PRD: "never no-access — always at least a summary"). Rows in `spec_permissions` only exist for explicit overrides: granting `full` access to a non-owner user, or (rarely) restricting a user below the default. This keeps the table lean: a 1,000-spec project might have only 50 rows (non-default permissions) instead of 1,000.

- **Q**: The PRD says there is "never no access — always at least a summary."
  Should the database enforce this at the constraint level (no `'none'`
  permission level), or should `'none'` exist for internal use (e.g., during
  permission transition)?

**A:** No `'none'` permission level in the schema. The `CHECK` constraint allows only `'full'` and `'summary'`. The "always at least summary" rule is enforced both at the database level (cannot insert `'none'`) and at the application level (default to `summary` when no explicit permission row exists). There is no permission transition state that requires `'none'` — transitions go directly from one level to another.

- **Q**: Should permission checks be done via a database view/function
  (centralized, always consistent) or in application code (faster iteration,
  more flexible)? A database function like
  `get_user_accessible_specs(user_id, project_id)` could be the single source
  of truth.

**A:** Application code (NestJS service) as the primary check, backed by a database function for complex queries. The `PermissionService.checkAccess(userId, specId)` method implements the logic: (1) is user the project owner? → `full`. (2) explicit row in `spec_permissions`? → use that level. (3) default → `summary`. For bulk queries (list all specs with access level), a database function `get_accessible_specs(user_id, project_id)` returns `{ spec_id, access_level }` using a single efficient query with `LEFT JOIN` on `spec_permissions`. Both paths implement the same logic; the DB function is an optimization for list views.

### 3.2 Share Token Management
- **Q**: `spec_permissions.encryption_token` is for encrypted spec content.
  Where is the encryption/decryption key stored? In the database (encrypted
  with a master key)? In environment variables? In a key management service?

**A:** Per the PRD: "Server-managed tokens not in git." Encryption tokens are stored in the `spec_permissions` table, encrypted at rest with a master key. The master key is stored in an environment variable (`KG_ENCRYPTION_MASTER_KEY`). The application decrypts tokens on-the-fly using the master key when serving content. For production deployments, the master key should be sourced from a secrets manager (AWS Secrets Manager, HashiCorp Vault) — the environment variable is the interface, the backing store is deployment-dependent.

- **Q**: Should sharing tokens expire automatically? If so, should the
  `permission_shares` table have an `expires_at` column?

**A:** Yes, sharing tokens should expire. Add `expires_at TIMESTAMPTZ` to the `permission_shares` table. Default expiration: 30 days from creation. The application checks `expires_at` on every token use and rejects expired tokens with a clear error message. Users can set custom expiration (1 day, 7 days, 30 days, 90 days, never) when creating a share. A scheduled job purges expired share records weekly.

- **Q**: Can a user re-share a spec that was shared with them? (Transitive
  sharing.) If yes, should the database track the share chain?

**A:** No transitive sharing. Only users with `full` access can create shares. A user who received `summary` access via a share token cannot re-share. A user who received `full` access via a share token CAN create new shares (they now have full access). The database does not track a share chain — shares are independent records. This prevents uncontrolled permission propagation.

---

## 4. Agent Session Design

### 4.1 Session Lifecycle
- **Q**: Should agent sessions have a maximum duration (timeout)? If a session
  has been `'active'` for 30 minutes with no new messages, should it be
  auto-closed? What's the timeout threshold?

**A:** Yes. Auto-close after 30 minutes of inactivity (no new messages). The session status moves to `'expired'`. A scheduled job runs every 5 minutes to check for stale sessions. The user can start a new session at any time. Active sessions with ongoing operations (e.g., a batch crawl in progress) are exempt from timeout until the operation completes.

- **Q**: Should the `token_usage` field be updated per-message (via trigger on
  `agent_messages`) or batch-updated at session end? Per-message gives
  real-time tracking but more writes.

**A:** Per-message update. Each time an `agent_messages` row is inserted, the service increments `agent_sessions.token_usage` with the message's token count. This is one additional `UPDATE` per message — negligible overhead. Real-time tracking enables the UI to show "1,200 / 10,000 tokens used" and the agent to respect token budgets mid-session.

- **Q**: Should there be a limit on concurrent active sessions per user?
  Per project? This prevents runaway agent usage.

**A:** Maximum 3 concurrent active sessions per user across all projects. Maximum 10 concurrent active sessions per project across all users. These limits prevent runaway agent costs and ensure fair resource sharing. Attempting to start a new session beyond the limit returns: "Maximum concurrent sessions reached. Close an existing session to start a new one." Limits are configurable in `.kg-config.json`.

### 4.2 Message Storage
- **Q**: `agent_messages.content` is `TEXT` (unlimited). Should there be a
  max content size? Agent responses can be very large (code generation output).
  What's a reasonable limit?

**A:** Maximum 100KB per message content. This accommodates large agent responses (code generation, detailed analysis) while preventing unbounded storage from runaway agents. 100KB of text is ~25,000 words — more than sufficient for any reasonable agent response. Messages exceeding the limit are truncated with a `[truncated]` marker.

- **Q**: Should `agent_messages.metadata_json` store tool call details (tool
  name, arguments, results)? If so, this could grow very large for complex
  tool interactions. Should tool calls be a separate table?

**A:** Store tool call details in `metadata_json`. A separate `agent_tool_calls` table adds join overhead for every message retrieval with minimal benefit. Tool call metadata is typically 1–10KB per message — manageable as JSONB. Structure: `{ toolCalls: [{ name, arguments, result, durationMs }] }`. If a specific tool call result is very large (>50KB), store only a summary and a reference (e.g., `resultRef: 'file://...'`).

- **Q**: Should agent messages support streaming? If the response is streamed,
  should each chunk be stored, or only the final assembled response?

**A:** Only the final assembled response is stored. Streaming is a frontend/API concern — the WebSocket delivers chunks to the client in real-time, but the database stores the complete message once streaming finishes. This avoids storing hundreds of partial rows per message. The `agent_messages` row is inserted with `status: 'streaming'` when streaming starts, then updated to `status: 'complete'` with the full content when done.

---

## 5. Sync State Design

### 5.1 Multi-Branch Support
- **Q**: The `sync_state` table tracks per-user, per-project, per-branch sync
  status. If a user works on 5 branches, that's 5 rows per user per project.
  Is this the right granularity, or should sync state only track the current
  branch?

**A:** Track all branches. 5 rows per user per project is trivially small. Tracking only the current branch would lose sync state when the user switches branches and switches back — they'd need to re-sync. With per-branch tracking, the server knows the last-synced commit for each branch and can efficiently determine what's changed on switch-back.

- **Q**: Should the sync state store the full commit hash (40 chars) or a
  short hash (8 chars)? Full hash is unambiguous; short hash saves space but
  could theoretically collide.

**A:** Full 40-character commit hash. Storage savings from short hashes are negligible (32 bytes vs. 40 bytes per row, with a handful of rows per user). Full hashes are unambiguous and can be used directly in `git` commands without risk of collision. `VARCHAR(40)` column.

- **Q**: Should sync state include a `last_sync_error` field for debugging
  sync failures?

**A:** Yes. Add `last_sync_error TEXT` and `last_sync_error_at TIMESTAMPTZ` columns. When a sync operation fails (merge conflict, network error, etc.), the error message and timestamp are stored. This helps users and admins debug sync issues without digging through server logs. Cleared on the next successful sync.

### 5.2 Conflict Tracking
- **Q**: `sync_state.conflict_details_json` stores conflict information. What
  is the expected structure? List of conflicting file paths? Per-spec conflict
  details? This should be documented and validated.

**A:** Structure: `{ conflictingSpecs: [{ specId, filePath, conflictType: 'content' | 'metadata' | 'both' }], conflictingEdges: [{ edgeFilePath, specIds: [sourceId, targetId] }], detectedAt: ISO8601, baseBranch, incomingBranch }`. This provides enough detail for the conflict resolution UI to show which specs need attention and what type of conflict exists. Validated by a TypeScript interface (`SyncConflictDetails`) at the application layer.

- **Q**: Should resolved conflicts be stored (for history) or cleared from
  `conflict_details_json` after resolution?

**A:** Cleared from `conflict_details_json` after resolution. The resolution event is logged in the `audit_logs` table with the conflict details and the resolution outcome (which side was chosen, manual edit, etc.). The `sync_state` row reflects the current state only — no historical conflict data. Audit logs provide the history.

---

## 6. Audit Log Design

### 6.1 Volume & Performance
- **Q**: The audit log will grow continuously. At what point should
  partitioning be introduced? From day one (simpler to start with), or only
  after hitting a size threshold (e.g., 10 million rows)?

**A:** From day one. Partition the `audit_logs` table by month using PostgreSQL range partitioning on `created_at`. This is a one-time setup in the initial migration and has zero ongoing maintenance cost. Monthly partitions make pruning trivial (`DROP TABLE audit_logs_2024_01`), improve query performance for time-range queries (partition pruning), and prevent the table from becoming a monolithic performance bottleneck. At moderate usage (~1,000 audit entries/day), each monthly partition is ~30K rows — tiny and fast.

- **Q**: Should audit log writes be synchronous (guaranteed before response)
  or asynchronous (queued, eventual)? Synchronous adds latency to every
  operation; asynchronous risks losing entries on crash.

**A:** Synchronous. Audit log writes are single `INSERT` statements — <1ms each. The latency impact is negligible. Asynchronous writing risks losing audit entries on crash, which undermines the audit trail's purpose. The `INSERT` is part of the same database transaction as the operation it's auditing, so they succeed or fail together.

- **Q**: Should the audit log be append-only (no UPDATE, no DELETE) enforced
  at the database level? This could be done with a trigger that rejects
  UPDATE/DELETE, or with a separate read-only role for the audit table.

**A:** Yes, append-only enforced by a database trigger. Create a trigger on `audit_logs` that raises an exception on `UPDATE` or `DELETE` operations. The scheduled pruning job uses a dedicated database role (`audit_admin`) that has the trigger disabled for its session (`ALTER TABLE ... DISABLE TRIGGER ...` within a transaction). This ensures application code cannot tamper with audit entries while allowing controlled pruning.

### 6.2 Compliance
- **Q**: Are there specific compliance requirements (SOC 2, GDPR, HIPAA) that
  dictate audit log retention periods, immutability, or access controls?

**A:** Design for GDPR compliance as the baseline (likely for any system with EU users). This means: (1) audit log retention is configurable (default 1 year), (2) user data in audit logs can be anonymized on request (right to erasure), (3) access to audit logs is restricted to admin roles. SOC 2 and HIPAA are not v1 requirements but the append-only, partitioned, retention-managed design is compatible with both.

- **Q**: Should the audit log store a hash of the previous entry (blockchain-
  style) to detect tampering? This adds integrity but complexity.

**A:** No. The append-only trigger is sufficient tamper protection for the target use case. Blockchain-style chaining adds significant complexity (hash computation, chain validation, handling of partitioned tables) for a threat model (insider database tampering) that is unlikely and better addressed by database access controls and backup verification.

- **Q**: Should PII in audit logs be anonymizable? For GDPR right-to-erasure,
  the `user_id` in audit logs may need to be replaced with an anonymous token.

**A:** Yes. Implement a `anonymize_user_audit_logs(user_id)` database function that replaces `user_id` with a hash and clears any PII fields (IP address, session details) in all audit log entries for that user. This function is called as part of the user account deletion flow. The anonymized entries retain the audit trail (what happened, when) without identifying who.

---

## 7. Notification Design

### 7.1 Delivery Model
- **Q**: Are database-stored notifications the only notification channel, or
  will there also be email, push notifications, or webhooks? If so, should
  the `notification_queue` be the source for all channels?

**A:** Database-stored notifications are the primary channel in v1. The `notification_queue` table is the single source for all channels. Future channels (email, webhooks) will be added as delivery adapters that consume from the same table. Each row has a `delivery_channels JSONB` field: `{ inApp: 'delivered', email: 'pending', webhook: 'skipped' }`. In v1, only `inApp` is implemented.

- **Q**: Should notifications support batching? If a user receives 50
  notifications in a minute (e.g., during a large sync), should they be
  grouped into a single notification like "50 specs updated in Project X"?

**A:** Yes. The notification service batches notifications of the same type within a 60-second window. If >5 notifications of the same type arrive within the window, they are collapsed into a single summary notification: "12 specs updated in Project X" with a "View details" link expanding to the individual items. Notifications are written individually to the queue but displayed as batches in the UI.

- **Q**: Should real-time notification delivery use WebSocket push (from
  WebSocket plan) with the database as persistence, or should the client
  poll the database?

**A:** WebSocket push for real-time delivery, database for persistence. When a notification is inserted into `notification_queue`, the service broadcasts a WebSocket event to the target user's connected clients. The client renders the notification immediately. If the user is offline, the notification waits in the database and is delivered when the client reconnects and fetches unread notifications. No polling.

### 7.2 Notification Preferences
- **Q**: Should users be able to configure notification preferences (e.g.,
  "don't notify me about agent completions")? If so, should preferences be
  stored in `users.settings_json` or a separate `notification_preferences`
  table?

**A:** Yes, users can configure preferences. Store in `users.settings_json` under a `notificationPreferences` key: `{ agentCompletion: true, specUpdated: true, inquiryCreated: true, syncConflict: true }`. All default to `true`. A separate table is overkill for a simple boolean-per-type structure. The notification service checks the user's preferences before inserting a notification.

---

## 8. Migration & Operations

### 8.1 Migration Workflow
- **Q**: Should migrations run automatically on server start (risky in
  production) or require an explicit `bun run migrate:up` command? Auto-run
  is convenient for development but dangerous in production.

**A:** Automatic in development (`NODE_ENV=development`), explicit CLI in production. The server checks for pending migrations on startup. In development, it runs them automatically. In production, it logs a warning and refuses to start if migrations are pending: "Pending migrations detected. Run `bun run db:migrate` before starting the server." This prevents accidental schema changes in production while keeping the dev experience smooth.

- **Q**: Should there be a migration lock to prevent multiple server instances
  from running migrations simultaneously?

**A:** Yes. Use PostgreSQL advisory locks. Before running migrations, the migration runner acquires `pg_advisory_lock(42)` (fixed lock ID). If another instance is already migrating, the lock acquisition blocks until the first instance finishes. After migration completes, the lock is released. This prevents race conditions in multi-instance deployments.

- **Q**: How should failed migrations be handled? Automatic rollback of the
  failed migration, or leave the database in a partially migrated state for
  manual intervention?

**A:** Each migration runs inside a transaction. If any statement in the migration fails, the entire transaction is rolled back — the database returns to the pre-migration state. The migration runner reports the error with the failing statement and migration file name. No partial migration state is possible (assuming the migration doesn't contain DDL that triggers implicit commits, which PostgreSQL handles correctly within transactions).

### 8.2 Data Migration
- **Q**: If the schema changes significantly after launch (e.g., splitting a
  JSONB column into normalized columns), should data migration scripts be
  separate from schema migrations?

**A:** Combined in a single migration file. The migration file: (1) adds new columns, (2) backfills data from JSONB to new columns using `UPDATE ... SET`, (3) drops the old JSONB column (or marks it for future removal). Keeping schema and data changes in one migration ensures they are applied atomically. If the data migration is very large (>1M rows), use batched updates within the migration to avoid long-running transactions.

- **Q**: Should there be a read-only mode that the server can enter during
  heavy migrations to prevent data corruption?

**A:** Yes. The server supports a `MAINTENANCE_MODE=true` environment variable that makes all write endpoints return `503 Service Unavailable` with a `Retry-After` header. The admin enables maintenance mode before running heavy migrations and disables it after. Read endpoints continue working (viewing specs, searching) during maintenance.

---

## 9. Performance & Scaling

### 9.1 Connection Pooling
- **Q**: Should the application use the ORM's built-in connection pool, or an
  external pooler like PgBouncer? PgBouncer is more efficient for many
  short-lived connections but adds operational complexity.

**A:** Drizzle's built-in connection pool (via `postgres.js` driver) for v1. `postgres.js` maintains a connection pool natively with configurable `max` connections. Default: `max: 20` connections. PgBouncer is unnecessary at the target scale (single server, moderate concurrency). If the system scales to multiple server instances sharing a database, PgBouncer can be introduced as a transparent proxy without application changes.

- **Q**: What is the expected peak concurrent connection count? This
  determines pool sizing and whether PgBouncer is necessary.

**A:** Expected peak: 10–15 concurrent connections (5–10 HTTP request handlers + 2–3 background workers + 1 migration lock). Pool size of 20 provides comfortable headroom. Each connection consumes ~5MB of PostgreSQL memory — 20 connections = ~100MB, well within typical PostgreSQL configuration.

### 9.2 Read Replicas
- **Q**: Should the architecture support read replicas from the start (dual
  connection strings, read/write splitting), or is that premature optimization?

**A:** Premature optimization. Single PostgreSQL instance for v1. The Drizzle setup should use a single connection pool. If read replicas are needed later, Drizzle supports multiple database instances — the migration path is: create a read replica, add a second connection pool with `readOnly: true`, route read-heavy queries to it. This is a 1-day task when needed, not worth architecting upfront.

- **Q**: Which queries would benefit from read replicas? Audit log queries,
  notification listing, and dashboard summaries are read-heavy.

**A:** Audit log queries and dashboard summaries are the primary read replica candidates. These are expensive aggregation queries that benefit from offloading to a replica. Notification listing is lightweight (index scan on user_id + read status). In v1, all queries hit the primary. The query structure is designed to be replica-compatible when the time comes.

### 9.3 Caching
- **Q**: Should frequently accessed data (user permissions, project membership)
  be cached in application memory (e.g., with a TTL cache), or should every
  request hit the database?

**A:** Cache in application memory with TTL. User permissions (per project): cached for 60 seconds. Project membership lists: cached for 5 minutes. User profile data: cached for 5 minutes. These are read-heavy, rarely-changing data that benefit from caching. Use a simple LRU Map (`Map<cacheKey, { value, expiresAt }>`), not Redis — the application is single-instance in v1.

- **Q**: If caching, how is cache invalidation handled? On write (immediate,
  consistent but complex), on TTL (eventual, simpler), or event-driven
  (WebSocket notification triggers cache clear)?

**A:** TTL-based with write-through invalidation for critical paths. Permission changes immediately invalidate the permission cache entry for the affected user+project. Other caches (project membership, user profile) rely on TTL expiration. The write-through invalidation is limited to the same server process (in-memory cache, no distributed cache). If a permission changes and the user is on a different server instance (future multi-instance scenario), the TTL handles eventual consistency within 60 seconds.

---

## 10. Testing

### 10.1 Test Database
- **Q**: Should integration tests use a real PostgreSQL instance (Docker) or
  an in-memory substitute? Real PostgreSQL is most accurate; in-memory
  (like SQLite) may have compatibility issues with PostgreSQL-specific features
  (JSONB, GIN indexes, array types, check constraints).

**A:** Real PostgreSQL in Docker. Use `testcontainers` or a `docker-compose.test.yml` to spin up a PostgreSQL instance with pgvector extension for integration tests. SQLite substitutes are not viable — the schema uses JSONB, array columns, CHECK constraints, pgvector types, and advisory locks that have no SQLite equivalent. The Docker container starts in ~2 seconds and is reusable across test runs.

- **Q**: Should each test file get a fresh database (slow, isolated) or share
  a database with TRUNCATE between tests (fast, risk of leaks)?

**A:** Shared database with `TRUNCATE ... CASCADE` between test suites (not between individual tests). Each test file runs in a transaction that is rolled back after the test (`beforeEach: BEGIN`, `afterEach: ROLLBACK`). This gives per-test isolation without TRUNCATE overhead. TRUNCATE runs once between test files for a clean slate. This is the fastest approach while maintaining test independence.

- **Q**: Should test fixtures use the seed data scripts, or should each test
  create its own data? Shared fixtures are convenient but create hidden
  dependencies between tests.

**A:** Each test creates its own data using factory functions. Provide a `TestFactory` utility: `TestFactory.createUser()`, `TestFactory.createProject()`, `TestFactory.createSpec()` that return fully formed entities with sensible defaults and overridable fields. No shared seed data for tests. Shared fixtures create brittle tests that break when fixture data changes. The seed scripts are for development and demo purposes only.

---

## 11. Backup & Recovery

- **Q**: What are the Recovery Point Objective (RPO) and Recovery Time
  Objective (RTO) for the database? This determines backup frequency and
  the need for WAL archiving.

**A:** RPO: 1 hour (maximum acceptable data loss). RTO: 30 minutes (maximum acceptable downtime). This is suitable for a knowledge management system — not a financial or real-time system. Implementation: continuous WAL archiving (for point-in-time recovery within RPO) + daily full `pg_dump` backup. WAL archiving provides RPO of minutes; the 1-hour target provides comfortable margin.

- **Q**: Should backups be stored locally, in cloud object storage (S3), or
  both? Cloud storage is more durable; local is faster to restore.

**A:** Both. Local backups on the database server for fast recovery (retained for 7 days). Cloud object storage (S3 or equivalent) for disaster recovery (retained for 90 days). WAL archives stream to cloud storage continuously. Daily `pg_dump` is uploaded to cloud storage after completion. Local + cloud provides defense in depth.

- **Q**: Should the backup strategy include logical backups (pg_dump) or
  physical backups (pg_basebackup) or both? Logical backups are portable;
  physical backups are faster for large databases.

**A:** Logical backups (`pg_dump`) as the primary strategy. The database is small at the target scale (<1GB) — `pg_dump` completes in seconds and produces portable, inspectable SQL. Physical backups (`pg_basebackup`) are unnecessary overhead for a small database and add complexity (binary compatibility requirements). If the database grows beyond 10GB, add physical backups as a supplement. WAL archiving (already included for PITR) provides the fast-recovery benefits of physical backups.

---

## Decision Log

> Record decisions as questions are resolved.

| Date | Question | Decision | Rationale |
|------|----------|----------|-----------|
| — | — | — | — |
