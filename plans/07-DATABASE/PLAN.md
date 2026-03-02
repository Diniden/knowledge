# 07 — DATABASE PLAN

> **Purpose**: Define the complete PostgreSQL database layer including schema
> design (every table, column, type, constraint, index), migration strategy,
> seed data, connection pooling, backup procedures, performance tuning, and
> monitoring. PostgreSQL stores centralized user management, project registry,
> permissions, agent sessions, sync coordination, audit logging, and
> communication features. The knowledge graph itself is stored as JSON files in
> git repos — NOT in PostgreSQL.
>
> **Phase**: 1 (Foundation) + 2 (Core Systems) + 5 (Polish)
> **Dependencies**: `01-PROJECT-STRUCTURE/PLAN.md`
> **Estimated tasks**: 200+

---

## Table of Contents

1. [ORM & Migration Library Selection](#1-orm--migration-library-selection)
2. [Database Connection & Configuration](#2-database-connection--configuration)
3. [Schema Design — Users](#3-schema-design--users)
4. [Schema Design — Projects](#4-schema-design--projects)
5. [Schema Design — Project Members](#5-schema-design--project-members)
6. [Schema Design — Spec Permissions](#6-schema-design--spec-permissions)
7. [Schema Design — Permission Shares](#7-schema-design--permission-shares)
8. [Schema Design — Agent Sessions](#8-schema-design--agent-sessions)
9. [Schema Design — Agent Messages](#9-schema-design--agent-messages)
10. [Schema Design — Sync State](#10-schema-design--sync-state)
11. [Schema Design — Generated UI Registry](#11-schema-design--generated-ui-registry)
12. [Schema Design — Plan Executions](#12-schema-design--plan-executions)
13. [Schema Design — Audit Log](#13-schema-design--audit-log)
14. [Schema Design — Notification Queue](#14-schema-design--notification-queue)
15. [Cross-Table Indexes & Composite Constraints](#15-cross-table-indexes--composite-constraints)
16. [Enums & Custom Types](#16-enums--custom-types)
17. [Migration Strategy](#17-migration-strategy)
18. [Seed Data](#18-seed-data)
19. [Connection Pooling](#19-connection-pooling)
20. [Backup & Recovery](#20-backup--recovery)
21. [Performance Tuning](#21-performance-tuning)
22. [Database Monitoring](#22-database-monitoring)
23. [Data Lifecycle & Retention](#23-data-lifecycle--retention)
24. [Security & Access Control](#24-security--access-control)

---

## 1. ORM & Migration Library Selection

### 1.1 Library Evaluation

- [ ] **DB-001**: Evaluate ORM/query-builder options for Bun + NestJS compatibility
  - Drizzle ORM: lightweight, SQL-like, excellent TypeScript inference, ESM-native
  - Prisma: schema-first, powerful migrations, heavier runtime
  - TypeORM: decorator-based (NestJS-native), mature, ESM support improving
  - MikroORM: identity map, unit-of-work, good NestJS integration
  - Document pros/cons of each for Bun runtime compatibility
- [ ] **DB-002**: Verify chosen ORM works with Bun runtime
  - Test basic CRUD operations under Bun
  - Test migration CLI under Bun
  - Test connection pooling behavior
  - Confirm no Node.js-specific APIs are required that Bun lacks
- [ ] **DB-003**: Verify chosen ORM works with NestJS module system
  - Test `@Module()` integration pattern
  - Test dependency injection of repositories/services
  - Test transaction support through NestJS providers
- [ ] **DB-004**: Select and document the final ORM choice with rationale
  - Record in decision log
  - Document migration path if the choice proves problematic

### 1.2 NestJS Integration Setup

- [ ] **DB-005**: Create `server/src/modules/database/` module directory
- [ ] **DB-006**: Create `database.module.ts` as a NestJS global module
  - Register the ORM module with async configuration
  - Import configuration from NestJS ConfigModule
  - Export the ORM module for use by all feature modules
- [ ] **DB-007**: Create `database.config.ts` for type-safe database configuration
  - Read host, port, database name, username, password from environment
  - Configure SSL settings for production
  - Configure connection pool size
  - Configure logging level (query logging in dev, error-only in prod)
- [ ] **DB-008**: Create `database.providers.ts` for custom repository providers
  - Define provider tokens for each repository
  - Register custom repositories if using repository pattern
- [ ] **DB-009**: Add database module to `app.module.ts` imports

#### Design Decisions

> **Q**: Should the project use Drizzle ORM or Prisma?
> **A**: Drizzle ORM, per the PRD. Drizzle's SQL-close approach gives full control over query generation, its TypeScript inference is best-in-class, and it has no binary runtime dependency (unlike Prisma's Rust query engine). Drizzle is ESM-native, works well under Bun, and produces smaller bundles. Its migration tooling (`drizzle-kit`) handles schema generation and migration management adequately.

> **Q**: Has the team verified that the chosen ORM works fully under Bun runtime?
> **A**: Drizzle ORM is verified compatible with Bun. Drizzle's core has no Node.js-specific dependencies — it uses standard SQL driver APIs. `drizzle-kit` (CLI tool for migrations) runs under Bun via `bunx drizzle-kit`. The PostgreSQL driver should be `postgres` (postgres.js), which is a pure JavaScript implementation that works under Bun without native bindings. Avoid `pg` (node-postgres) which has optional native bindings that may cause issues.

> **Q**: Should the ORM provide a repository pattern or a query-builder pattern?
> **A**: Query-builder pattern (Drizzle's native approach). Wrap Drizzle's query builder in NestJS service classes that act as repositories for DI purposes. Example: `SpecPermissionService` injects the Drizzle instance and exposes methods like `findBySpecId()`, `checkAccess()`. This gives NestJS DI integration while preserving Drizzle's explicit SQL control. The service layer IS the repository — no need for a separate repository abstraction.

> **Q**: Should performance-critical queries use raw SQL instead of ORM abstractions?
> **A**: Use Drizzle's query builder for all queries, including performance-critical ones. Drizzle generates efficient SQL and provides full TypeScript type safety. Drizzle's `sql` template tag allows raw SQL fragments within typed queries for cases where the builder is insufficient (e.g., CTEs, window functions, pgvector operators). This gives the best of both worlds: type safety by default, raw SQL escape hatch when needed.

> **Q**: Should database functions (stored procedures, triggers) be managed through the ORM's migration system, or maintained as separate SQL files?
> **A**: Through Drizzle's migration system. Custom SQL (functions, triggers, indexes) is written in migration files using `sql` blocks. This keeps all schema changes in one migration history. Separate SQL files create a parallel schema management system that can drift from the migration state. The migration file clearly documents when each function/trigger was created or modified.

---

## 2. Database Connection & Configuration

### 2.1 Environment Variables

- [ ] **DB-010**: Define database environment variables in `.env.example`
  - `DATABASE_HOST` (default: `localhost`)
  - `DATABASE_PORT` (default: `5432`)
  - `DATABASE_NAME` (default: `kg_dev`)
  - `DATABASE_USER` (default: `kg_user`)
  - `DATABASE_PASSWORD` (no default, required)
  - `DATABASE_SSL` (default: `false`)
  - `DATABASE_POOL_MIN` (default: `2`)
  - `DATABASE_POOL_MAX` (default: `10`)
  - `DATABASE_LOG_QUERIES` (default: `false`)
  - `DATABASE_URL` (optional composite connection string)
- [ ] **DB-011**: Create NestJS ConfigModule validation schema for DB vars
  - Use `joi` or `class-validator` to validate all database env vars on startup
  - Fail fast with descriptive error if required vars are missing
- [ ] **DB-012**: Create a typed configuration interface for database settings
  - `DatabaseConfig` interface in shared types or server types
  - All fields typed, no `string | undefined` — validated at load time

### 2.2 Docker PostgreSQL Setup

- [ ] **DB-013**: Define PostgreSQL service in `docker-compose.yml`
  - Image: `postgres:16-alpine` (or latest LTS)
  - Port mapping: `5432:5432`
  - Environment: `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`
  - Volume: named volume for data persistence
  - Health check: `pg_isready` command
- [ ] **DB-014**: Define PostgreSQL test service in `docker-compose.test.yml`
  - Separate database name: `kg_test`
  - Ephemeral: no volume mapping (data lost on container stop)
  - Same image and user credentials as dev
- [ ] **DB-015**: Create `scripts/reset-db.ts` script
  - Drop and recreate the development database
  - Run all migrations from scratch
  - Run seed data
  - Print summary of tables and row counts
- [ ] **DB-016**: Create `scripts/reset-test-db.ts` script
  - Drop and recreate the test database
  - Run all migrations
  - Do NOT run seed data (tests manage their own data)

### 2.3 Multiple Database Environments

- [ ] **DB-017**: Define environment-specific database names
  - Development: `kg_dev`
  - Test: `kg_test`
  - Staging: `kg_staging`
  - Production: `kg_prod`
- [ ] **DB-018**: Create database initialization SQL script
  - `CREATE DATABASE IF NOT EXISTS` for dev and test databases
  - `CREATE ROLE` for application user with limited privileges
  - Grant only necessary permissions (SELECT, INSERT, UPDATE, DELETE on tables)
  - Deny DDL permissions for application user in production
- [ ] **DB-019**: Add database readiness check to server bootstrap
  - Attempt connection on startup
  - Retry with exponential backoff (3 attempts, 1s/2s/4s)
  - Log clear error message if database is unreachable
  - Do not start HTTP listener until database is ready

---

## 3. Schema Design — Users

### 3.1 Table Definition

- [ ] **DB-020**: Create `users` table migration
  - `id` — `UUID` PRIMARY KEY, default `gen_random_uuid()`
  - `email` — `VARCHAR(255)` NOT NULL UNIQUE
  - `username` — `VARCHAR(50)` NOT NULL UNIQUE
  - `password_hash` — `VARCHAR(255)` NOT NULL
  - `display_name` — `VARCHAR(100)` NOT NULL
  - `avatar_url` — `TEXT` NULLABLE
  - `is_active` — `BOOLEAN` NOT NULL DEFAULT `true`
  - `email_verified` — `BOOLEAN` NOT NULL DEFAULT `false`
  - `created_at` — `TIMESTAMPTZ` NOT NULL DEFAULT `NOW()`
  - `updated_at` — `TIMESTAMPTZ` NOT NULL DEFAULT `NOW()`
  - `last_login` — `TIMESTAMPTZ` NULLABLE

### 3.2 Constraints & Validation

- [ ] **DB-021**: Add email format check constraint
  - `CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')`
- [ ] **DB-022**: Add username format check constraint
  - `CHECK (username ~* '^[a-zA-Z0-9_-]{3,50}$')`
  - Alphanumeric, underscores, hyphens; 3–50 characters
- [ ] **DB-023**: Add display_name length check constraint
  - `CHECK (char_length(display_name) >= 1)`
- [ ] **DB-024**: Add `updated_at` auto-update trigger
  - Create trigger function `set_updated_at()` that sets `updated_at = NOW()`
  - Attach to `users` table on `BEFORE UPDATE`

### 3.3 Indexes

- [ ] **DB-025**: Create unique index on `users.email` (implicit from UNIQUE constraint)
- [ ] **DB-026**: Create unique index on `users.username` (implicit from UNIQUE constraint)
- [ ] **DB-027**: Create index on `users.created_at` for chronological queries
- [ ] **DB-028**: Create index on `users.is_active` for filtering active users
- [ ] **DB-029**: Create composite index on `(is_active, created_at)` for active user listing

### 3.4 ORM Entity

- [ ] **DB-030**: Create `User` entity/model in `server/src/modules/users/entities/user.entity.ts`
  - Map all columns to typed properties
  - Define relations: `projects` (via project_members), `agentSessions`, `auditLogs`
  - Exclude `password_hash` from default select (use query-level exclusion)
- [ ] **DB-031**: Create `CreateUserDto` for user registration
- [ ] **DB-032**: Create `UpdateUserDto` for profile updates (Partial, omit id/email)
- [ ] **DB-033**: Create `UserResponseDto` that excludes password_hash

#### Design Decisions

> **Q**: Should primary keys be UUIDs or auto-incrementing integers?
> **A**: UUIDv7 for all PostgreSQL primary keys. UUIDv7 is time-sorted, which preserves B-tree index locality and avoids the random-write fragmentation of UUIDv4. The 128-bit size is larger than integers but the join performance difference is negligible at the target scale (<100K rows per table). UUIDs eliminate ID collision concerns for multi-user sync scenarios and are globally unique across tables.

> **Q**: If UUIDs, should the project use UUIDv4 (random) or UUIDv7 (time-sorted)?
> **A**: UUIDv7. Time-sorted UUIDs give natural insertion-order in indexes, better page utilization, and faster range scans. Generated via a `uuidv7()` helper function in the application layer (using the `uuidv7` npm package or a custom implementation). PostgreSQL stores UUIDs as 16-byte native type — efficient storage regardless of version.

> **Q**: The `spec_id` in `spec_permissions` references a spec stored in JSON files (not in PostgreSQL). Should there be a `specs` table in PostgreSQL as a lightweight registry?
> **A**: Yes, create a lightweight `spec_registry` table: `{ spec_id VARCHAR PRIMARY KEY, title TEXT, status VARCHAR, project_id UUID, created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ }`. This table mirrors key spec metadata from the JSON files and enables: efficient permission joins, fast spec listing/filtering without reading JSON files, and referential integrity for `spec_permissions.spec_id`. The registry is updated synchronously whenever a spec is created, updated, or deleted. It is NOT the source of truth (JSON files are) — it's a query accelerator.

> **Q**: Should all timestamps use `TIMESTAMPTZ` (timezone-aware) or `TIMESTAMP` (timezone-naive)?
> **A**: `TIMESTAMPTZ` for all timestamp columns, no exceptions. PostgreSQL converts all `TIMESTAMPTZ` values to UTC for storage and converts back on retrieval based on the session timezone. Set the application's database connection to `SET timezone = 'UTC'` to ensure consistent behavior. This handles multi-timezone users correctly without any application-level conversion logic.

> **Q**: Should `created_at` and `updated_at` use database-level defaults or be set by the application?
> **A**: Database-level defaults for `created_at`: `DEFAULT NOW()`. Application-set for `updated_at`: the NestJS service sets `updatedAt = new Date()` on every update. This ensures `created_at` is always set (even if the application forgets) while allowing `updated_at` to be controlled by the application for testing. For tests that need explicit `created_at`, insert with an explicit value (database defaults are only used when the column is omitted).

---

## 4. Schema Design — Projects

### 4.1 Table Definition

- [ ] **DB-034**: Create `projects` table migration
  - `id` — `UUID` PRIMARY KEY, default `gen_random_uuid()`
  - `name` — `VARCHAR(100)` NOT NULL
  - `description` — `TEXT` NULLABLE
  - `git_remote_url` — `TEXT` NULLABLE
  - `local_repo_path` — `TEXT` NOT NULL
  - `owner_id` — `UUID` NOT NULL REFERENCES `users(id)` ON DELETE RESTRICT
  - `is_archived` — `BOOLEAN` NOT NULL DEFAULT `false`
  - `settings_json` — `JSONB` NOT NULL DEFAULT `'{}'`
  - `created_at` — `TIMESTAMPTZ` NOT NULL DEFAULT `NOW()`
  - `updated_at` — `TIMESTAMPTZ` NOT NULL DEFAULT `NOW()`

### 4.2 Constraints

- [ ] **DB-035**: Add foreign key constraint `projects.owner_id → users.id`
  - ON DELETE RESTRICT (cannot delete a user who owns projects)
- [ ] **DB-036**: Add unique constraint on `(owner_id, name)` — a user cannot have two projects with the same name
- [ ] **DB-037**: Add check constraint on `name` — non-empty, alphanumeric plus hyphens/underscores/spaces
  - `CHECK (char_length(name) >= 1 AND name ~* '^[a-zA-Z0-9 _-]+$')`
- [ ] **DB-038**: Add `settings_json` JSON schema validation check
  - Ensure `settings_json` is valid JSONB (PostgreSQL validates this inherently)
  - Document expected keys: `defaultBranch`, `autoSync`, `notificationsEnabled`
- [ ] **DB-039**: Attach `set_updated_at()` trigger to `projects` table

### 4.3 Indexes

- [ ] **DB-040**: Create index on `projects.owner_id` for owner lookups
- [ ] **DB-041**: Create index on `projects.created_at` for chronological listing
- [ ] **DB-042**: Create index on `projects.is_archived` for active project filtering
- [ ] **DB-043**: Create GIN index on `projects.settings_json` for JSONB queries

### 4.4 ORM Entity

- [ ] **DB-044**: Create `Project` entity in `server/src/modules/projects/entities/project.entity.ts`
  - Map all columns
  - Define relations: `owner` (User), `members` (via project_members), `agentSessions`, `syncStates`
- [ ] **DB-045**: Create `CreateProjectDto`
- [ ] **DB-046**: Create `UpdateProjectDto`
- [ ] **DB-047**: Create `ProjectResponseDto` with computed `memberCount` field

---

## 5. Schema Design — Project Members

### 5.1 Table Definition

- [ ] **DB-048**: Create `project_members` table migration
  - `project_id` — `UUID` NOT NULL REFERENCES `projects(id)` ON DELETE CASCADE
  - `user_id` — `UUID` NOT NULL REFERENCES `users(id)` ON DELETE CASCADE
  - `role` — `VARCHAR(20)` NOT NULL DEFAULT `'viewer'`
  - `invited_at` — `TIMESTAMPTZ` NOT NULL DEFAULT `NOW()`
  - `accepted_at` — `TIMESTAMPTZ` NULLABLE
  - PRIMARY KEY `(project_id, user_id)`

### 5.2 Constraints

- [ ] **DB-049**: Add composite primary key `(project_id, user_id)`
- [ ] **DB-050**: Add foreign key `project_members.project_id → projects.id` ON DELETE CASCADE
- [ ] **DB-051**: Add foreign key `project_members.user_id → users.id` ON DELETE CASCADE
- [ ] **DB-052**: Add check constraint on `role`
  - `CHECK (role IN ('owner', 'admin', 'editor', 'viewer'))`
- [ ] **DB-053**: Add check constraint that `accepted_at` is NULL or >= `invited_at`

### 5.3 Indexes

- [ ] **DB-054**: Create index on `project_members.user_id` for "my projects" queries
- [ ] **DB-055**: Create index on `project_members.role` for role-based filtering
- [ ] **DB-056**: Create index on `project_members.accepted_at` for pending invitation queries (WHERE accepted_at IS NULL)

### 5.4 ORM Entity

- [ ] **DB-057**: Create `ProjectMember` entity in `server/src/modules/projects/entities/project-member.entity.ts`
  - Map composite primary key
  - Define relations: `project` (Project), `user` (User)
- [ ] **DB-058**: Create `AddMemberDto` (user_id, role)
- [ ] **DB-059**: Create `UpdateMemberRoleDto` (role)

---

## 6. Schema Design — Spec Permissions

### 6.1 Table Definition

- [ ] **DB-060**: Create `spec_permissions` table migration
  - `id` — `UUID` PRIMARY KEY, default `gen_random_uuid()`
  - `spec_id` — `VARCHAR(100)` NOT NULL (references the spec ID in the knowledge graph JSON)
  - `project_id` — `UUID` NOT NULL REFERENCES `projects(id)` ON DELETE CASCADE
  - `owner_user_id` — `UUID` NOT NULL REFERENCES `users(id)` ON DELETE CASCADE
  - `permission_level` — `VARCHAR(20)` NOT NULL DEFAULT `'full'`
  - `encryption_token` — `TEXT` NULLABLE
  - `summary_text` — `TEXT` NULLABLE
  - `created_at` — `TIMESTAMPTZ` NOT NULL DEFAULT `NOW()`
  - `updated_at` — `TIMESTAMPTZ` NOT NULL DEFAULT `NOW()`

### 6.2 Constraints

- [ ] **DB-061**: Add foreign key `spec_permissions.project_id → projects.id` ON DELETE CASCADE
- [ ] **DB-062**: Add foreign key `spec_permissions.owner_user_id → users.id` ON DELETE CASCADE
- [ ] **DB-063**: Add unique constraint on `(spec_id, project_id)` — one permission record per spec per project
- [ ] **DB-064**: Add check constraint on `permission_level`
  - `CHECK (permission_level IN ('full', 'summary', 'none'))`
- [ ] **DB-065**: Add check constraint: if `permission_level = 'summary'` then `summary_text` IS NOT NULL
- [ ] **DB-066**: Attach `set_updated_at()` trigger to `spec_permissions` table

### 6.3 Indexes

- [ ] **DB-067**: Create index on `spec_permissions.spec_id` for spec lookups
- [ ] **DB-068**: Create index on `spec_permissions.project_id` for project-scoped queries
- [ ] **DB-069**: Create index on `spec_permissions.owner_user_id` for user's permission listing
- [ ] **DB-070**: Create composite index on `(project_id, permission_level)` for filtered queries

### 6.4 ORM Entity

- [ ] **DB-071**: Create `SpecPermission` entity in `server/src/modules/specs/entities/spec-permission.entity.ts`
  - Map all columns
  - Define relations: `project` (Project), `owner` (User), `shares` (PermissionShare[])
- [ ] **DB-072**: Create `CreateSpecPermissionDto`
- [ ] **DB-073**: Create `UpdateSpecPermissionDto`

#### Design Decisions

> **Q**: The `spec_permissions` table has one row per spec per project. Should the default permission be implicit (no row means "owner has full access") with rows only for explicit overrides?
> **A**: Implicit defaults. No rows for the project owner — owner always has `full` access to all specs (enforced in application logic). No rows for the default permission level — all users without an explicit override get `summary` access (per PRD: "never no-access — always at least a summary"). Rows in `spec_permissions` only exist for explicit overrides: granting `full` access to a non-owner user, or (rarely) restricting a user below the default. This keeps the table lean: a 1,000-spec project might have only 50 rows (non-default permissions) instead of 1,000.

> **Q**: The PRD says there is "never no access — always at least a summary." Should the database enforce this at the constraint level?
> **A**: No `'none'` permission level in the schema. The `CHECK` constraint allows only `'full'` and `'summary'`. The "always at least summary" rule is enforced both at the database level (cannot insert `'none'`) and at the application level (default to `summary` when no explicit permission row exists). There is no permission transition state that requires `'none'` — transitions go directly from one level to another.

> **Q**: Should permission checks be done via a database view/function or in application code?
> **A**: Application code (NestJS service) as the primary check, backed by a database function for complex queries. The `PermissionService.checkAccess(userId, specId)` method implements the logic: (1) is user the project owner? → `full`. (2) explicit row in `spec_permissions`? → use that level. (3) default → `summary`. For bulk queries (list all specs with access level), a database function `get_accessible_specs(user_id, project_id)` returns `{ spec_id, access_level }` using a single efficient query with `LEFT JOIN` on `spec_permissions`. Both paths implement the same logic; the DB function is an optimization for list views.

---

## 7. Schema Design — Permission Shares

### 7.1 Table Definition

- [ ] **DB-074**: Create `permission_shares` table migration
  - `id` — `UUID` PRIMARY KEY, default `gen_random_uuid()`
  - `spec_permission_id` — `UUID` NOT NULL REFERENCES `spec_permissions(id)` ON DELETE CASCADE
  - `shared_with_user_id` — `UUID` NOT NULL REFERENCES `users(id)` ON DELETE CASCADE
  - `shared_by_user_id` — `UUID` NOT NULL REFERENCES `users(id)` ON DELETE CASCADE
  - `access_level` — `VARCHAR(20)` NOT NULL DEFAULT `'summary'`
  - `shared_at` — `TIMESTAMPTZ` NOT NULL DEFAULT `NOW()`
  - `revoked_at` — `TIMESTAMPTZ` NULLABLE

### 7.2 Constraints

- [ ] **DB-075**: Add foreign key `permission_shares.spec_permission_id → spec_permissions.id` ON DELETE CASCADE
- [ ] **DB-076**: Add foreign key `permission_shares.shared_with_user_id → users.id` ON DELETE CASCADE
- [ ] **DB-077**: Add foreign key `permission_shares.shared_by_user_id → users.id` ON DELETE CASCADE
- [ ] **DB-078**: Add unique constraint on `(spec_permission_id, shared_with_user_id)` WHERE `revoked_at IS NULL`
  - Partial unique index: only one active share per user per spec permission
- [ ] **DB-079**: Add check constraint on `access_level`
  - `CHECK (access_level IN ('full', 'summary'))`
- [ ] **DB-080**: Add check constraint: `shared_with_user_id != shared_by_user_id` (cannot share with self)
- [ ] **DB-081**: Add check constraint: `revoked_at IS NULL OR revoked_at >= shared_at`

### 7.3 Indexes

- [ ] **DB-082**: Create index on `permission_shares.shared_with_user_id` for "shared with me" queries
- [ ] **DB-083**: Create index on `permission_shares.shared_by_user_id` for "shared by me" queries
- [ ] **DB-084**: Create index on `permission_shares.spec_permission_id` for permission lookups
- [ ] **DB-085**: Create partial index on `permission_shares` WHERE `revoked_at IS NULL` for active shares

### 7.4 ORM Entity

- [ ] **DB-086**: Create `PermissionShare` entity in `server/src/modules/specs/entities/permission-share.entity.ts`
  - Map all columns
  - Define relations: `specPermission`, `sharedWithUser`, `sharedByUser`
- [ ] **DB-087**: Create `CreatePermissionShareDto`
- [ ] **DB-088**: Create `RevokePermissionShareDto` (sets revoked_at)

#### Design Decisions

> **Q**: `spec_permissions.encryption_token` is for encrypted spec content. Where is the encryption/decryption key stored?
> **A**: Per the PRD: "Server-managed tokens not in git." Encryption tokens are stored in the `spec_permissions` table, encrypted at rest with a master key. The master key is stored in an environment variable (`KG_ENCRYPTION_MASTER_KEY`). The application decrypts tokens on-the-fly using the master key when serving content. For production deployments, the master key should be sourced from a secrets manager (AWS Secrets Manager, HashiCorp Vault) — the environment variable is the interface, the backing store is deployment-dependent.

> **Q**: Should sharing tokens expire automatically? If so, should the `permission_shares` table have an `expires_at` column?
> **A**: Yes, sharing tokens should expire. Add `expires_at TIMESTAMPTZ` to the `permission_shares` table. Default expiration: 30 days from creation. The application checks `expires_at` on every token use and rejects expired tokens with a clear error message. Users can set custom expiration (1 day, 7 days, 30 days, 90 days, never) when creating a share. A scheduled job purges expired share records weekly.

> **Q**: Can a user re-share a spec that was shared with them? (Transitive sharing.)
> **A**: No transitive sharing. Only users with `full` access can create shares. A user who received `summary` access via a share token cannot re-share. A user who received `full` access via a share token CAN create new shares (they now have full access). The database does not track a share chain — shares are independent records. This prevents uncontrolled permission propagation.

---

## 8. Schema Design — Agent Sessions

### 8.1 Table Definition

- [ ] **DB-089**: Create `agent_sessions` table migration
  - `id` — `UUID` PRIMARY KEY, default `gen_random_uuid()`
  - `user_id` — `UUID` NOT NULL REFERENCES `users(id)` ON DELETE CASCADE
  - `project_id` — `UUID` NOT NULL REFERENCES `projects(id)` ON DELETE CASCADE
  - `session_type` — `VARCHAR(30)` NOT NULL
  - `status` — `VARCHAR(20)` NOT NULL DEFAULT `'active'`
  - `started_at` — `TIMESTAMPTZ` NOT NULL DEFAULT `NOW()`
  - `ended_at` — `TIMESTAMPTZ` NULLABLE
  - `context_json` — `JSONB` NOT NULL DEFAULT `'{}'`
  - `token_usage` — `INTEGER` NOT NULL DEFAULT `0`
  - `error_message` — `TEXT` NULLABLE
  - `parent_session_id` — `UUID` NULLABLE REFERENCES `agent_sessions(id)` ON DELETE SET NULL

### 8.2 Constraints

- [ ] **DB-090**: Add foreign key `agent_sessions.user_id → users.id` ON DELETE CASCADE
- [ ] **DB-091**: Add foreign key `agent_sessions.project_id → projects.id` ON DELETE CASCADE
- [ ] **DB-092**: Add self-referencing foreign key `agent_sessions.parent_session_id → agent_sessions.id` ON DELETE SET NULL
- [ ] **DB-093**: Add check constraint on `session_type`
  - `CHECK (session_type IN ('knowledge_authoring', 'plan_generation', 'code_generation', 'graph_exploration', 'rag_query', 'general_chat'))`
- [ ] **DB-094**: Add check constraint on `status`
  - `CHECK (status IN ('active', 'completed', 'failed', 'cancelled', 'timed_out'))`
- [ ] **DB-095**: Add check constraint: `ended_at IS NULL OR ended_at >= started_at`
- [ ] **DB-096**: Add check constraint: `token_usage >= 0`

### 8.3 Indexes

- [ ] **DB-097**: Create index on `agent_sessions.user_id` for user session history
- [ ] **DB-098**: Create index on `agent_sessions.project_id` for project session listing
- [ ] **DB-099**: Create index on `agent_sessions.status` for active session queries
- [ ] **DB-100**: Create index on `agent_sessions.started_at` for chronological listing
- [ ] **DB-101**: Create composite index on `(user_id, project_id, status)` for "my active sessions in project"
- [ ] **DB-102**: Create index on `agent_sessions.parent_session_id` for sub-session lookups

### 8.4 ORM Entity

- [ ] **DB-103**: Create `AgentSession` entity in `server/src/modules/agent/entities/agent-session.entity.ts`
  - Map all columns
  - Define relations: `user`, `project`, `messages` (AgentMessage[]), `parentSession`, `childSessions`
- [ ] **DB-104**: Create `CreateAgentSessionDto`
- [ ] **DB-105**: Create `UpdateAgentSessionDto` (for status transitions)
- [ ] **DB-106**: Create `AgentSessionResponseDto` with computed `duration` and `messageCount`

#### Design Decisions

> **Q**: Should agent sessions have a maximum duration (timeout)? What's the timeout threshold?
> **A**: Yes. Auto-close after 30 minutes of inactivity (no new messages). The session status moves to `'expired'`. A scheduled job runs every 5 minutes to check for stale sessions. The user can start a new session at any time. Active sessions with ongoing operations (e.g., a batch crawl in progress) are exempt from timeout until the operation completes.

> **Q**: Should the `token_usage` field be updated per-message or batch-updated at session end?
> **A**: Per-message update. Each time an `agent_messages` row is inserted, the service increments `agent_sessions.token_usage` with the message's token count. This is one additional `UPDATE` per message — negligible overhead. Real-time tracking enables the UI to show "1,200 / 10,000 tokens used" and the agent to respect token budgets mid-session.

> **Q**: Should there be a limit on concurrent active sessions per user? Per project?
> **A**: Maximum 3 concurrent active sessions per user across all projects. Maximum 10 concurrent active sessions per project across all users. These limits prevent runaway agent costs and ensure fair resource sharing. Attempting to start a new session beyond the limit returns: "Maximum concurrent sessions reached. Close an existing session to start a new one." Limits are configurable in `.kg-config.json`.

---

## 9. Schema Design — Agent Messages

### 9.1 Table Definition

- [ ] **DB-107**: Create `agent_messages` table migration
  - `id` — `UUID` PRIMARY KEY, default `gen_random_uuid()`
  - `session_id` — `UUID` NOT NULL REFERENCES `agent_sessions(id)` ON DELETE CASCADE
  - `role` — `VARCHAR(20)` NOT NULL
  - `content` — `TEXT` NOT NULL
  - `metadata_json` — `JSONB` NOT NULL DEFAULT `'{}'`
  - `token_count` — `INTEGER` NULLABLE
  - `created_at` — `TIMESTAMPTZ` NOT NULL DEFAULT `NOW()`

### 9.2 Constraints

- [ ] **DB-108**: Add foreign key `agent_messages.session_id → agent_sessions.id` ON DELETE CASCADE
- [ ] **DB-109**: Add check constraint on `role`
  - `CHECK (role IN ('user', 'assistant', 'system', 'tool_call', 'tool_result'))`
- [ ] **DB-110**: Add check constraint: `char_length(content) >= 1` (no empty messages)

### 9.3 Indexes

- [ ] **DB-111**: Create index on `agent_messages.session_id` for session message retrieval
- [ ] **DB-112**: Create index on `agent_messages.created_at` for chronological ordering
- [ ] **DB-113**: Create composite index on `(session_id, created_at)` for ordered session messages
- [ ] **DB-114**: Create index on `agent_messages.role` for filtering by role

### 9.4 ORM Entity

- [ ] **DB-115**: Create `AgentMessage` entity in `server/src/modules/agent/entities/agent-message.entity.ts`
  - Map all columns
  - Define relation: `session` (AgentSession)
- [ ] **DB-116**: Create `CreateAgentMessageDto`
- [ ] **DB-117**: Create `AgentMessageResponseDto`

#### Design Decisions

> **Q**: `agent_messages.content` is `TEXT` (unlimited). Should there be a max content size?
> **A**: Maximum 100KB per message content. This accommodates large agent responses (code generation, detailed analysis) while preventing unbounded storage from runaway agents. 100KB of text is ~25,000 words — more than sufficient for any reasonable agent response. Messages exceeding the limit are truncated with a `[truncated]` marker.

> **Q**: Should `agent_messages.metadata_json` store tool call details? If so, should tool calls be a separate table?
> **A**: Store tool call details in `metadata_json`. A separate `agent_tool_calls` table adds join overhead for every message retrieval with minimal benefit. Tool call metadata is typically 1–10KB per message — manageable as JSONB. Structure: `{ toolCalls: [{ name, arguments, result, durationMs }] }`. If a specific tool call result is very large (>50KB), store only a summary and a reference (e.g., `resultRef: 'file://...'`).

> **Q**: Should agent messages support streaming? If the response is streamed, should each chunk be stored, or only the final assembled response?
> **A**: Only the final assembled response is stored. Streaming is a frontend/API concern — the WebSocket delivers chunks to the client in real-time, but the database stores the complete message once streaming finishes. This avoids storing hundreds of partial rows per message. The `agent_messages` row is inserted with `status: 'streaming'` when streaming starts, then updated to `status: 'complete'` with the full content when done.

---

## 10. Schema Design — Sync State

### 10.1 Table Definition

- [ ] **DB-118**: Create `sync_state` table migration
  - `id` — `UUID` PRIMARY KEY, default `gen_random_uuid()`
  - `project_id` — `UUID` NOT NULL REFERENCES `projects(id)` ON DELETE CASCADE
  - `user_id` — `UUID` NOT NULL REFERENCES `users(id)` ON DELETE CASCADE
  - `branch_name` — `VARCHAR(255)` NOT NULL DEFAULT `'main'`
  - `last_pull_hash` — `VARCHAR(40)` NULLABLE
  - `last_push_hash` — `VARCHAR(40)` NULLABLE
  - `sync_status` — `VARCHAR(20)` NOT NULL DEFAULT `'synced'`
  - `conflict_details_json` — `JSONB` NULLABLE
  - `updated_at` — `TIMESTAMPTZ` NOT NULL DEFAULT `NOW()`

### 10.2 Constraints

- [ ] **DB-119**: Add foreign key `sync_state.project_id → projects.id` ON DELETE CASCADE
- [ ] **DB-120**: Add foreign key `sync_state.user_id → users.id` ON DELETE CASCADE
- [ ] **DB-121**: Add unique constraint on `(project_id, user_id, branch_name)` — one sync state per user per project per branch
- [ ] **DB-122**: Add check constraint on `sync_status`
  - `CHECK (sync_status IN ('synced', 'ahead', 'behind', 'diverged', 'conflict', 'syncing'))`
- [ ] **DB-123**: Add check constraint on `last_pull_hash` and `last_push_hash` — valid git hash format
  - `CHECK (last_pull_hash IS NULL OR last_pull_hash ~* '^[a-f0-9]{40}$')`
- [ ] **DB-124**: Attach `set_updated_at()` trigger to `sync_state` table

### 10.3 Indexes

- [ ] **DB-125**: Create index on `sync_state.project_id` for project sync overview
- [ ] **DB-126**: Create index on `sync_state.user_id` for user's sync status across projects
- [ ] **DB-127**: Create index on `sync_state.sync_status` for conflict detection queries
- [ ] **DB-128**: Create composite index on `(project_id, sync_status)` for project-level sync dashboard

### 10.4 ORM Entity

- [ ] **DB-129**: Create `SyncState` entity in `server/src/modules/git/entities/sync-state.entity.ts`
  - Map all columns
  - Define relations: `project`, `user`
- [ ] **DB-130**: Create `UpdateSyncStateDto`

#### Design Decisions

> **Q**: The `sync_state` table tracks per-user, per-project, per-branch sync status. Is this the right granularity, or should sync state only track the current branch?
> **A**: Track all branches. 5 rows per user per project is trivially small. Tracking only the current branch would lose sync state when the user switches branches and switches back — they'd need to re-sync. With per-branch tracking, the server knows the last-synced commit for each branch and can efficiently determine what's changed on switch-back.

> **Q**: Should the sync state store the full commit hash (40 chars) or a short hash (8 chars)?
> **A**: Full 40-character commit hash. Storage savings from short hashes are negligible (32 bytes vs. 40 bytes per row, with a handful of rows per user). Full hashes are unambiguous and can be used directly in `git` commands without risk of collision. `VARCHAR(40)` column.

> **Q**: Should sync state include a `last_sync_error` field for debugging sync failures?
> **A**: Yes. Add `last_sync_error TEXT` and `last_sync_error_at TIMESTAMPTZ` columns. When a sync operation fails (merge conflict, network error, etc.), the error message and timestamp are stored. This helps users and admins debug sync issues without digging through server logs. Cleared on the next successful sync.

> **Q**: `sync_state.conflict_details_json` stores conflict information. What is the expected structure?
> **A**: Structure: `{ conflictingSpecs: [{ specId, filePath, conflictType: 'content' | 'metadata' | 'both' }], conflictingEdges: [{ edgeFilePath, specIds: [sourceId, targetId] }], detectedAt: ISO8601, baseBranch, incomingBranch }`. This provides enough detail for the conflict resolution UI to show which specs need attention and what type of conflict exists. Validated by a TypeScript interface (`SyncConflictDetails`) at the application layer.

> **Q**: Should resolved conflicts be stored (for history) or cleared from `conflict_details_json` after resolution?
> **A**: Cleared from `conflict_details_json` after resolution. The resolution event is logged in the `audit_logs` table with the conflict details and the resolution outcome (which side was chosen, manual edit, etc.). The `sync_state` row reflects the current state only — no historical conflict data. Audit logs provide the history.

---

## 11. Schema Design — Generated UI Registry

### 11.1 Table Definition

- [ ] **DB-131**: Create `generated_ui_registry` table migration
  - `id` — `UUID` PRIMARY KEY, default `gen_random_uuid()`
  - `project_id` — `UUID` NOT NULL REFERENCES `projects(id)` ON DELETE CASCADE
  - `user_id` — `UUID` NOT NULL REFERENCES `users(id)` ON DELETE CASCADE
  - `spec_ids` — `TEXT[]` NOT NULL DEFAULT `'{}'`
  - `ui_path` — `TEXT` NOT NULL
  - `ui_type` — `VARCHAR(30)` NOT NULL
  - `display_name` — `VARCHAR(100)` NULLABLE
  - `parameters_json` — `JSONB` NOT NULL DEFAULT `'{}'`
  - `build_status` — `VARCHAR(20)` NOT NULL DEFAULT `'pending'`
  - `created_at` — `TIMESTAMPTZ` NOT NULL DEFAULT `NOW()`
  - `updated_at` — `TIMESTAMPTZ` NOT NULL DEFAULT `NOW()`

### 11.2 Constraints

- [ ] **DB-132**: Add foreign key `generated_ui_registry.project_id → projects.id` ON DELETE CASCADE
- [ ] **DB-133**: Add foreign key `generated_ui_registry.user_id → users.id` ON DELETE CASCADE
- [ ] **DB-134**: Add check constraint on `ui_type`
  - `CHECK (ui_type IN ('dashboard', 'form', 'visualization', 'report', 'custom'))`
- [ ] **DB-135**: Add check constraint on `build_status`
  - `CHECK (build_status IN ('pending', 'building', 'ready', 'failed', 'archived'))`
- [ ] **DB-136**: Add check constraint: `array_length(spec_ids, 1) >= 1` (at least one spec)
- [ ] **DB-137**: Attach `set_updated_at()` trigger to `generated_ui_registry` table

### 11.3 Indexes

- [ ] **DB-138**: Create index on `generated_ui_registry.project_id` for project UI listing
- [ ] **DB-139**: Create index on `generated_ui_registry.user_id` for user's generated UIs
- [ ] **DB-140**: Create GIN index on `generated_ui_registry.spec_ids` for "which UIs use this spec" queries
- [ ] **DB-141**: Create index on `generated_ui_registry.build_status` for status filtering

### 11.4 ORM Entity

- [ ] **DB-142**: Create `GeneratedUiEntry` entity in `server/src/modules/gen-ui/entities/generated-ui.entity.ts`
  - Map all columns including `spec_ids` as string array
  - Define relations: `project`, `user`
- [ ] **DB-143**: Create `CreateGeneratedUiDto`
- [ ] **DB-144**: Create `UpdateGeneratedUiDto`

---

## 12. Schema Design — Plan Executions

### 12.1 Table Definition

- [ ] **DB-145**: Create `plan_executions` table migration
  - `id` — `UUID` PRIMARY KEY, default `gen_random_uuid()`
  - `project_id` — `UUID` NOT NULL REFERENCES `projects(id)` ON DELETE CASCADE
  - `plan_path` — `TEXT` NOT NULL
  - `status` — `VARCHAR(20)` NOT NULL DEFAULT `'pending'`
  - `started_at` — `TIMESTAMPTZ` NULLABLE
  - `completed_at` — `TIMESTAMPTZ` NULLABLE
  - `result_json` — `JSONB` NULLABLE
  - `error_message` — `TEXT` NULLABLE
  - `triggered_by_user_id` — `UUID` NOT NULL REFERENCES `users(id)` ON DELETE CASCADE
  - `agent_session_id` — `UUID` NULLABLE REFERENCES `agent_sessions(id)` ON DELETE SET NULL
  - `created_at` — `TIMESTAMPTZ` NOT NULL DEFAULT `NOW()`

### 12.2 Constraints

- [ ] **DB-146**: Add foreign key `plan_executions.project_id → projects.id` ON DELETE CASCADE
- [ ] **DB-147**: Add foreign key `plan_executions.triggered_by_user_id → users.id` ON DELETE CASCADE
- [ ] **DB-148**: Add foreign key `plan_executions.agent_session_id → agent_sessions.id` ON DELETE SET NULL
- [ ] **DB-149**: Add check constraint on `status`
  - `CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled'))`
- [ ] **DB-150**: Add check constraint: if `status = 'completed'` then `result_json` IS NOT NULL
- [ ] **DB-151**: Add check constraint: `completed_at IS NULL OR completed_at >= started_at`

### 12.3 Indexes

- [ ] **DB-152**: Create index on `plan_executions.project_id` for project execution history
- [ ] **DB-153**: Create index on `plan_executions.status` for active execution queries
- [ ] **DB-154**: Create index on `plan_executions.triggered_by_user_id` for user's execution history
- [ ] **DB-155**: Create index on `plan_executions.created_at` for chronological listing
- [ ] **DB-156**: Create composite index on `(project_id, status)` for "active executions in project"

### 12.4 ORM Entity

- [ ] **DB-157**: Create `PlanExecution` entity in `server/src/modules/agent/entities/plan-execution.entity.ts`
  - Map all columns
  - Define relations: `project`, `triggeredByUser`, `agentSession`
- [ ] **DB-158**: Create `CreatePlanExecutionDto`
- [ ] **DB-159**: Create `UpdatePlanExecutionDto`
- [ ] **DB-160**: Create `PlanExecutionResponseDto` with computed `duration`

---

## 13. Schema Design — Audit Log

### 13.1 Table Definition

- [ ] **DB-161**: Create `audit_log` table migration
  - `id` — `UUID` PRIMARY KEY, default `gen_random_uuid()`
  - `user_id` — `UUID` NULLABLE REFERENCES `users(id)` ON DELETE SET NULL
  - `project_id` — `UUID` NULLABLE REFERENCES `projects(id)` ON DELETE SET NULL
  - `action` — `VARCHAR(50)` NOT NULL
  - `entity_type` — `VARCHAR(50)` NOT NULL
  - `entity_id` — `VARCHAR(100)` NULLABLE
  - `details_json` — `JSONB` NOT NULL DEFAULT `'{}'`
  - `ip_address` — `INET` NULLABLE
  - `user_agent` — `TEXT` NULLABLE
  - `created_at` — `TIMESTAMPTZ` NOT NULL DEFAULT `NOW()`

### 13.2 Constraints

- [ ] **DB-162**: Add foreign key `audit_log.user_id → users.id` ON DELETE SET NULL
  - SET NULL because audit logs must persist even if user is deleted
- [ ] **DB-163**: Add foreign key `audit_log.project_id → projects.id` ON DELETE SET NULL
  - SET NULL because audit logs must persist even if project is deleted
- [ ] **DB-164**: Add check constraint on `action`
  - `CHECK (action IN ('create', 'read', 'update', 'delete', 'login', 'logout', 'share', 'revoke', 'sync_push', 'sync_pull', 'agent_start', 'agent_end', 'plan_execute', 'permission_change'))`
- [ ] **DB-165**: Add check constraint on `entity_type`
  - `CHECK (entity_type IN ('user', 'project', 'spec', 'edge', 'document', 'agent_session', 'permission', 'share', 'sync', 'plan_execution', 'gen_ui'))`

### 13.3 Indexes

- [ ] **DB-166**: Create index on `audit_log.user_id` for user activity history
- [ ] **DB-167**: Create index on `audit_log.project_id` for project activity feed
- [ ] **DB-168**: Create index on `audit_log.action` for action type filtering
- [ ] **DB-169**: Create index on `audit_log.entity_type` for entity type filtering
- [ ] **DB-170**: Create index on `audit_log.created_at` for chronological queries (primary access pattern)
- [ ] **DB-171**: Create composite index on `(project_id, created_at)` for project activity timeline
- [ ] **DB-172**: Create composite index on `(user_id, created_at)` for user activity timeline
- [ ] **DB-173**: Create composite index on `(entity_type, entity_id)` for entity history lookups

### 13.4 Partitioning

- [ ] **DB-174**: Evaluate table partitioning for `audit_log` by `created_at` range
  - Monthly partitions recommended for high-volume audit data
  - Partition pruning benefits time-range queries
  - Document partition management (create ahead, drop old)
- [ ] **DB-175**: Create partition management script for `audit_log`
  - Auto-create partitions 3 months ahead
  - Archive partitions older than retention period

#### Design Decisions

> **Q**: The audit log will grow continuously. At what point should partitioning be introduced?
> **A**: From day one. Partition the `audit_logs` table by month using PostgreSQL range partitioning on `created_at`. This is a one-time setup in the initial migration and has zero ongoing maintenance cost. Monthly partitions make pruning trivial (`DROP TABLE audit_logs_2024_01`), improve query performance for time-range queries (partition pruning), and prevent the table from becoming a monolithic performance bottleneck. At moderate usage (~1,000 audit entries/day), each monthly partition is ~30K rows — tiny and fast.

> **Q**: Should audit log writes be synchronous (guaranteed before response) or asynchronous (queued, eventual)?
> **A**: Synchronous. Audit log writes are single `INSERT` statements — <1ms each. The latency impact is negligible. Asynchronous writing risks losing audit entries on crash, which undermines the audit trail's purpose. The `INSERT` is part of the same database transaction as the operation it's auditing, so they succeed or fail together.

> **Q**: Should the audit log be append-only (no UPDATE, no DELETE) enforced at the database level?
> **A**: Yes, append-only enforced by a database trigger. Create a trigger on `audit_logs` that raises an exception on `UPDATE` or `DELETE` operations. The scheduled pruning job uses a dedicated database role (`audit_admin`) that has the trigger disabled for its session. This ensures application code cannot tamper with audit entries while allowing controlled pruning.

> **Q**: Are there specific compliance requirements (SOC 2, GDPR, HIPAA) that dictate audit log retention periods?
> **A**: Design for GDPR compliance as the baseline (likely for any system with EU users). This means: (1) audit log retention is configurable (default 1 year), (2) user data in audit logs can be anonymized on request (right to erasure), (3) access to audit logs is restricted to admin roles. SOC 2 and HIPAA are not v1 requirements but the append-only, partitioned, retention-managed design is compatible with both.

> **Q**: Should the audit log store a hash of the previous entry (blockchain-style) to detect tampering?
> **A**: No. The append-only trigger is sufficient tamper protection for the target use case. Blockchain-style chaining adds significant complexity (hash computation, chain validation, handling of partitioned tables) for a threat model (insider database tampering) that is unlikely and better addressed by database access controls and backup verification.

> **Q**: Should PII in audit logs be anonymizable for GDPR right-to-erasure?
> **A**: Yes. Implement a `anonymize_user_audit_logs(user_id)` database function that replaces `user_id` with a hash and clears any PII fields (IP address, session details) in all audit log entries for that user. This function is called as part of the user account deletion flow. The anonymized entries retain the audit trail (what happened, when) without identifying who.

### 13.5 ORM Entity

- [ ] **DB-176**: Create `AuditLogEntry` entity in `server/src/modules/audit/entities/audit-log.entity.ts`
  - Map all columns
  - Relations are nullable (user and project may be deleted)
- [ ] **DB-177**: Create `CreateAuditLogDto` (used internally by audit service)
- [ ] **DB-178**: Create `AuditLogQueryDto` with filters for user, project, action, entity_type, date range

---

## 14. Schema Design — Notification Queue

### 14.1 Table Definition

- [ ] **DB-179**: Create `notification_queue` table migration
  - `id` — `UUID` PRIMARY KEY, default `gen_random_uuid()`
  - `user_id` — `UUID` NOT NULL REFERENCES `users(id)` ON DELETE CASCADE
  - `type` — `VARCHAR(50)` NOT NULL
  - `title` — `VARCHAR(200)` NOT NULL
  - `payload_json` — `JSONB` NOT NULL DEFAULT `'{}'`
  - `read` — `BOOLEAN` NOT NULL DEFAULT `false`
  - `dismissed` — `BOOLEAN` NOT NULL DEFAULT `false`
  - `source_user_id` — `UUID` NULLABLE REFERENCES `users(id)` ON DELETE SET NULL
  - `project_id` — `UUID` NULLABLE REFERENCES `projects(id)` ON DELETE CASCADE
  - `created_at` — `TIMESTAMPTZ` NOT NULL DEFAULT `NOW()`
  - `read_at` — `TIMESTAMPTZ` NULLABLE
  - `expires_at` — `TIMESTAMPTZ` NULLABLE

### 14.2 Constraints

- [ ] **DB-180**: Add foreign key `notification_queue.user_id → users.id` ON DELETE CASCADE
- [ ] **DB-181**: Add foreign key `notification_queue.source_user_id → users.id` ON DELETE SET NULL
- [ ] **DB-182**: Add foreign key `notification_queue.project_id → projects.id` ON DELETE CASCADE
- [ ] **DB-183**: Add check constraint on `type`
  - `CHECK (type IN ('share_received', 'share_revoked', 'project_invite', 'agent_complete', 'agent_failed', 'sync_conflict', 'plan_complete', 'plan_failed', 'mention', 'system'))`
- [ ] **DB-184**: Add check constraint: `read_at IS NULL OR read = true`
- [ ] **DB-185**: Add check constraint: `expires_at IS NULL OR expires_at > created_at`

### 14.3 Indexes

- [ ] **DB-186**: Create index on `notification_queue.user_id` for user notification listing
- [ ] **DB-187**: Create composite index on `(user_id, read)` for unread notification count
- [ ] **DB-188**: Create index on `notification_queue.created_at` for chronological ordering
- [ ] **DB-189**: Create index on `notification_queue.type` for type-based filtering
- [ ] **DB-190**: Create partial index WHERE `read = false AND dismissed = false` for active notifications
- [ ] **DB-191**: Create index on `notification_queue.expires_at` for expiration cleanup

### 14.4 ORM Entity

- [ ] **DB-192**: Create `Notification` entity in `server/src/modules/notifications/entities/notification.entity.ts`
  - Map all columns
  - Define relations: `user`, `sourceUser`, `project`
- [ ] **DB-193**: Create `CreateNotificationDto` (internal use)
- [ ] **DB-194**: Create `NotificationResponseDto`
- [ ] **DB-195**: Create `MarkNotificationReadDto`

#### Design Decisions

> **Q**: Are database-stored notifications the only notification channel, or will there also be email, push notifications, or webhooks?
> **A**: Database-stored notifications are the primary channel in v1. The `notification_queue` table is the single source for all channels. Future channels (email, webhooks) will be added as delivery adapters that consume from the same table. Each row has a `delivery_channels JSONB` field: `{ inApp: 'delivered', email: 'pending', webhook: 'skipped' }`. In v1, only `inApp` is implemented.

> **Q**: Should notifications support batching? If a user receives 50 notifications in a minute, should they be grouped?
> **A**: Yes. The notification service batches notifications of the same type within a 60-second window. If >5 notifications of the same type arrive within the window, they are collapsed into a single summary notification: "12 specs updated in Project X" with a "View details" link expanding to the individual items. Notifications are written individually to the queue but displayed as batches in the UI.

> **Q**: Should real-time notification delivery use WebSocket push or should the client poll the database?
> **A**: WebSocket push for real-time delivery, database for persistence. When a notification is inserted into `notification_queue`, the service broadcasts a WebSocket event to the target user's connected clients. The client renders the notification immediately. If the user is offline, the notification waits in the database and is delivered when the client reconnects and fetches unread notifications. No polling.

> **Q**: Should users be able to configure notification preferences? If so, should preferences be stored in `users.settings_json` or a separate table?
> **A**: Yes, users can configure preferences. Store in `users.settings_json` under a `notificationPreferences` key: `{ agentCompletion: true, specUpdated: true, inquiryCreated: true, syncConflict: true }`. All default to `true`. A separate table is overkill for a simple boolean-per-type structure. The notification service checks the user's preferences before inserting a notification.

---

## 15. Cross-Table Indexes & Composite Constraints

### 15.1 Cross-Table Query Optimization

- [ ] **DB-196**: Create materialized view `user_project_summary` for dashboard
  - User ID, project count, total specs, total sessions, last activity
  - Refresh strategy: on demand or periodic (every 5 minutes)
- [ ] **DB-197**: Create materialized view `project_activity_summary`
  - Project ID, member count, session count, last commit hash, last sync, open notifications
  - Refresh strategy: on demand or periodic
- [ ] **DB-198**: Create a database function `get_user_accessible_specs(user_id UUID, project_id UUID)`
  - Returns all spec IDs the user can access (full or summary)
  - Considers: ownership, direct shares, project membership role
  - Used by multiple endpoints for permission checking
- [ ] **DB-199**: Create a database function `get_unread_notification_count(user_id UUID)`
  - Returns count of unread, non-dismissed, non-expired notifications
  - Optimized for frequent polling

### 15.2 Referential Integrity Helpers

- [ ] **DB-200**: Create trigger to auto-create `project_members` entry with role `'owner'` when a project is created
- [ ] **DB-201**: Create trigger to set `agent_sessions.ended_at` when `status` transitions to a terminal state
- [ ] **DB-202**: Create trigger to increment `agent_sessions.token_usage` when an `agent_message` is inserted (if `token_count` is set)

#### Design Decisions

> **Q**: `settings_json`, `context_json`, `metadata_json`, `parameters_json`, `payload_json`, `details_json`, and `result_json` are all JSONB columns. Should any of these be normalized into proper columns?
> **A**: Keep JSONB for truly dynamic/variable structures. Normalize columns that are queried or filtered frequently. `users.settings_json`: Keep as JSONB (read-whole/write-whole, rarely queried by individual fields). `agent_sessions.context_json`: Keep as JSONB (complex and varies per session, read-whole by the agent). `notification_queue.payload_json`: Keep as JSONB with a discriminated `type` column alongside it. `audit_logs.details_json`: Keep as JSONB (varies by action type, queried by time range and action type via normalized columns). `agent_messages.metadata_json`: Keep as JSONB (tool call details are complex and variable). General rule: if the data is queried by its contents, normalize it. If it's stored and retrieved as a whole blob, keep it JSONB.

> **Q**: For `agent_sessions.context_json`, should this be a separate `agent_session_context` table with normalized columns?
> **A**: Keep as JSONB in `agent_sessions`. The context is read and written as a whole object by the agent service. It is never queried by individual fields (no "find all sessions where active_spec_id = X"). Normalizing it would add join overhead for every agent operation with no query benefit. The application layer validates the JSON structure via TypeScript types.

> **Q**: For `notification_queue.payload_json`, each notification type has different payload structure. Should there be a discriminated union type validated at the application layer, or should each type have its own table?
> **A**: Discriminated union validated at the application layer. The `notification_queue` table has a `type VARCHAR` column that determines the expected payload structure. TypeScript discriminated union types validate the payload on read/write. One table is simpler to query, index, and manage than N notification-type-specific tables.

---

## 16. Enums & Custom Types

### 16.1 PostgreSQL Enum Types

- [ ] **DB-203**: Create enum type `project_role` — `('owner', 'admin', 'editor', 'viewer')`
  - Evaluate enum vs check constraint tradeoff (enums are faster but harder to modify)
  - Decision: use VARCHAR + CHECK for flexibility, document enum-equivalent values
- [ ] **DB-204**: Create enum type `permission_level` — `('full', 'summary', 'none')`
- [ ] **DB-205**: Create enum type `session_status` — `('active', 'completed', 'failed', 'cancelled', 'timed_out')`
- [ ] **DB-206**: Create enum type `sync_status` — `('synced', 'ahead', 'behind', 'diverged', 'conflict', 'syncing')`
- [ ] **DB-207**: Document the decision on enum vs VARCHAR+CHECK and apply consistently
  - If enums: create migration to add new values safely (ALTER TYPE ADD VALUE)
  - If VARCHAR+CHECK: ensure all check constraints are consistent with shared types

### 16.2 Custom Domain Types

- [ ] **DB-208**: Create domain type `email_address` — `VARCHAR(255) CHECK (email regex)`
- [ ] **DB-209**: Create domain type `git_hash` — `VARCHAR(40) CHECK (hex regex)`
- [ ] **DB-210**: Create domain type `spec_identifier` — `VARCHAR(100) CHECK (non-empty)`

#### Design Decisions

> **Q**: Should status/type fields use PostgreSQL `CREATE TYPE ... AS ENUM` or `VARCHAR + CHECK` constraints?
> **A**: `VARCHAR` with `CHECK` constraints. Adding new status values only requires `ALTER TABLE ... DROP CONSTRAINT ... ADD CONSTRAINT ...`, which is a lightweight DDL operation. PostgreSQL enums require `ALTER TYPE ... ADD VALUE` (append-only, no removal, no reordering). Since the knowledge graph is evolving and status values may change, `VARCHAR + CHECK` provides the flexibility needed without meaningful performance difference at this scale.

> **Q**: Should the enum/check values be defined in a single source of truth (shared types package) that generates both TypeScript types and SQL constraints?
> **A**: Yes. Define enum values in a shared TypeScript file (`packages/shared/src/enums.ts`) that exports both TypeScript `const` arrays and type unions. The migration scripts import these arrays to generate `CHECK` constraints. Example: `export const SPEC_STATUSES = ['draft', 'review', 'active', 'deprecated', 'archived'] as const; export type SpecStatus = typeof SPEC_STATUSES[number];` The migration uses `CHECK (status IN ('draft', 'review', 'active', 'deprecated', 'archived'))` generated from the same source.

---

## 17. Migration Strategy

### 17.1 Migration Infrastructure

- [ ] **DB-211**: Configure migration directory at `server/src/database/migrations/`
- [ ] **DB-212**: Configure migration naming convention: `{timestamp}_{description}.ts`
  - Example: `20240101120000_create_users_table.ts`
  - Timestamp ensures ordering
  - Description is kebab-case
- [ ] **DB-213**: Create migration CLI commands
  - `bun run migrate:create <name>` — generate empty migration file
  - `bun run migrate:up` — run pending migrations
  - `bun run migrate:down` — rollback last migration
  - `bun run migrate:status` — show migration status
  - `bun run migrate:reset` — rollback all and re-run
- [ ] **DB-214**: Create initial migration that creates all Phase 1 tables
  - `users`, `projects`, `project_members`, `agent_sessions`, `agent_messages`
  - All constraints, indexes, triggers for these tables
- [ ] **DB-215**: Create second migration for Phase 2 tables
  - `spec_permissions`, `permission_shares`, `sync_state`, `audit_log`, `notification_queue`
  - `generated_ui_registry`, `plan_executions`
- [ ] **DB-216**: Create migration for `set_updated_at()` trigger function
  - Must run before any table migration that uses the trigger

### 17.2 Migration Best Practices

- [ ] **DB-217**: Document migration guidelines
  - Every migration must have both `up` and `down` methods
  - `down` method must be the exact reverse of `up`
  - Never modify a deployed migration — always create a new one
  - Test both `up` and `down` before committing
  - Keep migrations idempotent where possible
- [ ] **DB-218**: Add migration CI check
  - Run all migrations up from empty database
  - Run all migrations down
  - Run all migrations up again
  - Verify final schema matches expected schema
- [ ] **DB-219**: Create schema snapshot tool
  - Dump current schema to `server/src/database/schema.sql` for reference
  - Auto-update on each migration run
  - Include in version control for schema review in PRs

### 17.3 Zero-Downtime Migration Patterns

- [ ] **DB-220**: Document zero-downtime migration patterns
  - Adding columns: add nullable first, backfill, add NOT NULL later
  - Removing columns: stop reading first, deploy, then drop column
  - Renaming columns: add new, copy data, update code, drop old
  - Adding indexes: use `CREATE INDEX CONCURRENTLY`
- [ ] **DB-221**: Create migration helper functions
  - `addColumnSafely()` — adds nullable column with default
  - `createIndexConcurrently()` — wraps CONCURRENTLY for safety
  - `dropColumnSafely()` — checks for dependent views/functions first

#### Design Decisions

> **Q**: Should migrations run automatically on server start (risky in production) or require an explicit `bun run migrate:up` command?
> **A**: Automatic in development (`NODE_ENV=development`), explicit CLI in production. The server checks for pending migrations on startup. In development, it runs them automatically. In production, it logs a warning and refuses to start if migrations are pending: "Pending migrations detected. Run `bun run db:migrate` before starting the server." This prevents accidental schema changes in production while keeping the dev experience smooth.

> **Q**: Should there be a migration lock to prevent multiple server instances from running migrations simultaneously?
> **A**: Yes. Use PostgreSQL advisory locks. Before running migrations, the migration runner acquires `pg_advisory_lock(42)` (fixed lock ID). If another instance is already migrating, the lock acquisition blocks until the first instance finishes. After migration completes, the lock is released. This prevents race conditions in multi-instance deployments.

> **Q**: How should failed migrations be handled?
> **A**: Each migration runs inside a transaction. If any statement in the migration fails, the entire transaction is rolled back — the database returns to the pre-migration state. The migration runner reports the error with the failing statement and migration file name. No partial migration state is possible (assuming the migration doesn't contain DDL that triggers implicit commits, which PostgreSQL handles correctly within transactions).

> **Q**: If the schema changes significantly after launch (e.g., splitting a JSONB column into normalized columns), should data migration scripts be separate from schema migrations?
> **A**: Combined in a single migration file. The migration file: (1) adds new columns, (2) backfills data from JSONB to new columns using `UPDATE ... SET`, (3) drops the old JSONB column (or marks it for future removal). Keeping schema and data changes in one migration ensures they are applied atomically. If the data migration is very large (>1M rows), use batched updates within the migration to avoid long-running transactions.

> **Q**: Should there be a read-only mode that the server can enter during heavy migrations to prevent data corruption?
> **A**: Yes. The server supports a `MAINTENANCE_MODE=true` environment variable that makes all write endpoints return `503 Service Unavailable` with a `Retry-After` header. The admin enables maintenance mode before running heavy migrations and disables it after. Read endpoints continue working (viewing specs, searching) during maintenance.

---

## 18. Seed Data

### 18.1 Development Seed Data

- [ ] **DB-222**: Create seed runner at `server/src/database/seeds/`
- [ ] **DB-223**: Create `seed-users.ts` — development user accounts
  - Admin user: `admin@kg.dev` / `admin` / password: `devpassword123`
  - Regular user: `alice@kg.dev` / `alice` / password: `devpassword123`
  - Regular user: `bob@kg.dev` / `bob` / password: `devpassword123`
  - Viewer user: `charlie@kg.dev` / `charlie` / password: `devpassword123`
  - All with pre-hashed passwords (bcrypt)
- [ ] **DB-224**: Create `seed-projects.ts` — sample projects
  - "Sample Knowledge Base" owned by admin with all users as members
  - "Alice's Private Project" owned by alice
  - "Shared Research" owned by bob with alice as editor
- [ ] **DB-225**: Create `seed-permissions.ts` — sample spec permissions and shares
  - Full access examples
  - Summary-only access examples
  - Active and revoked share examples
- [ ] **DB-226**: Create `seed-agent-sessions.ts` — sample agent session data
  - One completed session with messages
  - One active session
  - One failed session with error message
- [ ] **DB-227**: Create `seed-notifications.ts` — sample notifications
  - Mix of read and unread
  - Different types (share, invite, agent complete)
- [ ] **DB-228**: Create `seed-audit-log.ts` — sample audit entries
  - Login events
  - CRUD events on specs
  - Permission changes
- [ ] **DB-229**: Create `bun run seed` command that runs all seed files in order

### 18.2 Test Fixtures

- [ ] **DB-230**: Create test fixture factory pattern
  - `createTestUser(overrides?)` — generates a user with random data
  - `createTestProject(overrides?)` — generates a project
  - `createTestAgentSession(overrides?)` — generates a session
  - All fixtures auto-clean after test
- [ ] **DB-231**: Create `server/src/database/test-utils.ts`
  - `setupTestDatabase()` — connect to test DB, run migrations
  - `teardownTestDatabase()` — drop all tables, close connection
  - `truncateAllTables()` — fast cleanup between tests (TRUNCATE CASCADE)
  - `getTestDataSource()` — returns configured test connection

#### Design Decisions

> **Q**: Should integration tests use a real PostgreSQL instance (Docker) or an in-memory substitute?
> **A**: Real PostgreSQL in Docker. Use `testcontainers` or a `docker-compose.test.yml` to spin up a PostgreSQL instance with pgvector extension for integration tests. SQLite substitutes are not viable — the schema uses JSONB, array columns, CHECK constraints, pgvector types, and advisory locks that have no SQLite equivalent. The Docker container starts in ~2 seconds and is reusable across test runs.

> **Q**: Should each test file get a fresh database (slow, isolated) or share a database with TRUNCATE between tests?
> **A**: Shared database with `TRUNCATE ... CASCADE` between test suites (not between individual tests). Each test file runs in a transaction that is rolled back after the test (`beforeEach: BEGIN`, `afterEach: ROLLBACK`). This gives per-test isolation without TRUNCATE overhead. TRUNCATE runs once between test files for a clean slate. This is the fastest approach while maintaining test independence.

> **Q**: Should test fixtures use the seed data scripts, or should each test create its own data?
> **A**: Each test creates its own data using factory functions. Provide a `TestFactory` utility: `TestFactory.createUser()`, `TestFactory.createProject()`, `TestFactory.createSpec()` that return fully formed entities with sensible defaults and overridable fields. No shared seed data for tests. Shared fixtures create brittle tests that break when fixture data changes. The seed scripts are for development and demo purposes only.

---

## 19. Connection Pooling

### 19.1 Pool Configuration

- [ ] **DB-232**: Configure connection pool settings
  - Min pool size: 2 (keep warm connections)
  - Max pool size: 10 (development), 25 (production)
  - Idle timeout: 10 seconds
  - Connection timeout: 5 seconds
  - Max lifetime: 30 minutes (prevent stale connections)
- [ ] **DB-233**: Configure pool per environment
  - Development: small pool (min 2, max 5)
  - Test: minimal pool (min 1, max 3) — tests are sequential
  - Production: larger pool (min 5, max 25)
- [ ] **DB-234**: Add connection pool health monitoring
  - Log pool utilization periodically (every 60 seconds)
  - Alert when pool reaches 80% capacity
  - Log slow connection acquisitions (> 1 second)

### 19.2 Connection Resilience

- [ ] **DB-235**: Implement connection retry logic
  - Retry on `ECONNREFUSED` with exponential backoff
  - Max 5 retries before throwing
  - Log each retry attempt
- [ ] **DB-236**: Implement connection validation
  - `SELECT 1` before returning connection from pool
  - Evict invalid connections
- [ ] **DB-237**: Handle database restart gracefully
  - Detect connection loss
  - Drain and recreate pool
  - Resume operations without server restart

#### Design Decisions

> **Q**: Should the application use the ORM's built-in connection pool, or an external pooler like PgBouncer?
> **A**: Drizzle's built-in connection pool (via `postgres.js` driver) for v1. `postgres.js` maintains a connection pool natively with configurable `max` connections. Default: `max: 20` connections. PgBouncer is unnecessary at the target scale (single server, moderate concurrency). If the system scales to multiple server instances sharing a database, PgBouncer can be introduced as a transparent proxy without application changes.

> **Q**: What is the expected peak concurrent connection count?
> **A**: Expected peak: 10–15 concurrent connections (5–10 HTTP request handlers + 2–3 background workers + 1 migration lock). Pool size of 20 provides comfortable headroom. Each connection consumes ~5MB of PostgreSQL memory — 20 connections = ~100MB, well within typical PostgreSQL configuration.

---

## 20. Backup & Recovery

### 20.1 Backup Strategy

- [ ] **DB-238**: Document backup strategy
  - Full backup: daily (pg_dump, compressed)
  - Incremental: WAL archiving for point-in-time recovery
  - Retention: 30 days for daily backups, 7 days for WAL
- [ ] **DB-239**: Create `scripts/backup-db.sh`
  - `pg_dump` with `--format=custom` for efficient storage
  - Compress with gzip
  - Name with timestamp: `kg_backup_YYYYMMDD_HHMMSS.dump.gz`
  - Upload to configured backup location (local directory or S3)
- [ ] **DB-240**: Create `scripts/restore-db.sh`
  - Accept backup file path as argument
  - Drop and recreate target database
  - Restore with `pg_restore`
  - Run any pending migrations after restore
  - Verify table counts match expected

### 20.2 Recovery Testing

- [ ] **DB-241**: Create backup verification script
  - Restore backup to temporary database
  - Run integrity checks
  - Compare table counts with production
  - Drop temporary database
- [ ] **DB-242**: Document recovery procedures
  - Full restore from backup
  - Point-in-time recovery using WAL
  - Recovery time objectives (RTO)
  - Recovery point objectives (RPO)

#### Design Decisions

> **Q**: What are the Recovery Point Objective (RPO) and Recovery Time Objective (RTO) for the database?
> **A**: RPO: 1 hour (maximum acceptable data loss). RTO: 30 minutes (maximum acceptable downtime). This is suitable for a knowledge management system — not a financial or real-time system. Implementation: continuous WAL archiving (for point-in-time recovery within RPO) + daily full `pg_dump` backup. WAL archiving provides RPO of minutes; the 1-hour target provides comfortable margin.

> **Q**: Should backups be stored locally, in cloud object storage (S3), or both?
> **A**: Both. Local backups on the database server for fast recovery (retained for 7 days). Cloud object storage (S3 or equivalent) for disaster recovery (retained for 90 days). WAL archives stream to cloud storage continuously. Daily `pg_dump` is uploaded to cloud storage after completion. Local + cloud provides defense in depth.

> **Q**: Should the backup strategy include logical backups (pg_dump) or physical backups (pg_basebackup) or both?
> **A**: Logical backups (`pg_dump`) as the primary strategy. The database is small at the target scale (<1GB) — `pg_dump` completes in seconds and produces portable, inspectable SQL. Physical backups (`pg_basebackup`) are unnecessary overhead for a small database and add complexity (binary compatibility requirements). If the database grows beyond 10GB, add physical backups as a supplement. WAL archiving (already included for PITR) provides the fast-recovery benefits of physical backups.

---

## 21. Performance Tuning

### 21.1 PostgreSQL Configuration

- [ ] **DB-243**: Configure `postgresql.conf` for application workload
  - `shared_buffers`: 25% of system RAM
  - `effective_cache_size`: 75% of system RAM
  - `work_mem`: 4MB (adjust for complex queries)
  - `maintenance_work_mem`: 256MB
  - `random_page_cost`: 1.1 (SSD) or 4.0 (HDD)
  - `wal_buffers`: 16MB
  - `checkpoint_completion_target`: 0.9
- [ ] **DB-244**: Configure statement logging for development
  - `log_min_duration_statement`: 100ms (log slow queries)
  - `log_statement`: 'none' in production, 'all' in development
  - `log_lock_waits`: on

### 21.2 Query Optimization

- [ ] **DB-245**: Identify and document the top 20 most frequent queries
  - User login / session validation
  - Project listing for user
  - Spec permission check
  - Agent session and message retrieval
  - Notification count and listing
  - Audit log queries
  - Sync state queries
- [ ] **DB-246**: Write EXPLAIN ANALYZE for each critical query
  - Verify indexes are being used
  - Identify sequential scans on large tables
  - Optimize join order
- [ ] **DB-247**: Create database views for complex repeated queries
  - `active_user_sessions` — joins sessions + users + projects for active sessions
  - `user_permissions_view` — flattens spec_permissions + permission_shares for a user
  - `project_dashboard_view` — aggregates project stats

### 21.3 JSONB Optimization

- [ ] **DB-248**: Add GIN indexes on all JSONB columns that are queried
  - `projects.settings_json`
  - `agent_sessions.context_json`
  - `agent_messages.metadata_json`
  - `audit_log.details_json`
  - `notification_queue.payload_json`
- [ ] **DB-249**: Document JSONB query patterns and ensure they use index-friendly operators
  - Use `@>` (contains) for GIN index utilization
  - Avoid `->` chains in WHERE clauses (use `@>` instead)
  - Use `jsonb_path_query` for complex JSON queries

### 21.4 Table Maintenance

- [ ] **DB-250**: Configure autovacuum for high-churn tables
  - `audit_log`: aggressive autovacuum (high insert rate)
  - `notification_queue`: aggressive autovacuum (frequent inserts and updates)
  - `agent_messages`: standard autovacuum
- [ ] **DB-251**: Create index maintenance schedule
  - `REINDEX CONCURRENTLY` on fragmented indexes
  - Monitor index bloat with `pgstattuple`
  - Document when to rebuild vs. create new index

#### Design Decisions

> **Q**: Should the architecture support read replicas from the start?
> **A**: Premature optimization. Single PostgreSQL instance for v1. The Drizzle setup should use a single connection pool. If read replicas are needed later, Drizzle supports multiple database instances — the migration path is: create a read replica, add a second connection pool with `readOnly: true`, route read-heavy queries to it. This is a 1-day task when needed, not worth architecting upfront.

> **Q**: Which queries would benefit from read replicas?
> **A**: Audit log queries and dashboard summaries are the primary read replica candidates. These are expensive aggregation queries that benefit from offloading to a replica. Notification listing is lightweight (index scan on user_id + read status). In v1, all queries hit the primary. The query structure is designed to be replica-compatible when the time comes.

> **Q**: Should frequently accessed data (user permissions, project membership) be cached in application memory, or should every request hit the database?
> **A**: Cache in application memory with TTL. User permissions (per project): cached for 60 seconds. Project membership lists: cached for 5 minutes. User profile data: cached for 5 minutes. These are read-heavy, rarely-changing data that benefit from caching. Use a simple LRU Map (`Map<cacheKey, { value, expiresAt }>`), not Redis — the application is single-instance in v1.

> **Q**: If caching, how is cache invalidation handled?
> **A**: TTL-based with write-through invalidation for critical paths. Permission changes immediately invalidate the permission cache entry for the affected user+project. Other caches (project membership, user profile) rely on TTL expiration. The write-through invalidation is limited to the same server process (in-memory cache, no distributed cache). If a permission changes and the user is on a different server instance (future multi-instance scenario), the TTL handles eventual consistency within 60 seconds.

---

## 22. Database Monitoring

### 22.1 Health Checks

- [ ] **DB-252**: Create database health check endpoint (`/api/v1/health/db`)
  - Connection pool status (available, active, idle connections)
  - Database reachability (SELECT 1)
  - Migration status (any pending migrations)
  - Disk space check
  - Response time measurement
- [ ] **DB-253**: Create NestJS health check module using `@nestjs/terminus`
  - Register database health indicator
  - Configure health check interval
  - Expose health endpoint for load balancer

### 22.2 Metrics

- [ ] **DB-254**: Instrument query execution time
  - Log all queries over 100ms threshold
  - Track average query time per endpoint
  - Track queries per second
- [ ] **DB-255**: Monitor connection pool metrics
  - Pool size, active, idle, waiting counts
  - Connection acquisition time
  - Connection creation time
- [ ] **DB-256**: Monitor table sizes and row counts
  - Periodic table size report (daily)
  - Alert on unexpected growth (audit_log, agent_messages)
  - Track index sizes

### 22.3 Alerting

- [ ] **DB-257**: Define alert thresholds
  - Connection pool > 80% utilized → warning
  - Connection pool > 95% utilized → critical
  - Query time > 1 second → warning
  - Query time > 5 seconds → critical
  - Disk usage > 80% → warning
  - Replication lag > 10 seconds → critical (if replication is used)
- [ ] **DB-258**: Create alerting integration
  - Log-based alerts (structured JSON logs for monitoring tools)
  - Optional webhook for critical alerts
  - Dashboard view for database metrics

---

## 23. Data Lifecycle & Retention

### 23.1 Retention Policies

- [ ] **DB-259**: Define data retention policies per table
  - `users`: indefinite (soft delete via is_active)
  - `projects`: indefinite (soft delete via is_archived)
  - `agent_sessions`: 1 year (archive to cold storage after)
  - `agent_messages`: 1 year (cascades with sessions)
  - `audit_log`: 2 years (compliance requirement)
  - `notification_queue`: 90 days (auto-delete expired/dismissed)
  - `sync_state`: indefinite (small table, current state only)
- [ ] **DB-260**: Create retention cleanup job
  - Scheduled daily via cron or NestJS task scheduler
  - Delete expired notifications
  - Archive old agent sessions (move to archive table or export)
  - Partition management for audit_log

### 23.2 Soft Delete Pattern

- [ ] **DB-261**: Implement soft delete pattern where applicable
  - Users: `is_active = false` instead of DELETE
  - Projects: `is_archived = true` instead of DELETE
  - Add `deleted_at TIMESTAMPTZ NULLABLE` column where needed
  - Create default scope that excludes soft-deleted rows
- [ ] **DB-262**: Create hard-delete utility for GDPR compliance
  - `anonymize_user(user_id)` — replaces PII with anonymized data
  - `purge_user_data(user_id)` — removes all associated data
  - Cascade through all foreign key relationships
  - Log the purge in audit_log before executing

---

## 24. Security & Access Control

### 24.1 Database User Roles

- [ ] **DB-263**: Create PostgreSQL roles
  - `kg_app` — application user (SELECT, INSERT, UPDATE, DELETE)
  - `kg_readonly` — read-only user for monitoring/reporting
  - `kg_admin` — migration user (ALL PRIVILEGES)
  - `kg_backup` — backup user (SELECT on all tables + pg_dump)
- [ ] **DB-264**: Create role assignment script
  - Grant `kg_app` only DML privileges on application tables
  - Grant `kg_readonly` SELECT-only on all tables
  - Grant `kg_admin` ALL on public schema
  - Revoke PUBLIC privileges on all tables

### 24.2 Row-Level Security (Future)

- [ ] **DB-265**: Evaluate PostgreSQL Row-Level Security (RLS) for multi-tenant isolation
  - RLS could enforce project-level data isolation at the database level
  - Document pros (defense-in-depth) and cons (complexity, debugging)
  - Decision: implement application-level filtering first, add RLS later if needed
- [ ] **DB-266**: Design RLS policies for critical tables
  - `projects`: users can only see projects they are members of
  - `spec_permissions`: users can only see their own permissions and shares
  - `notification_queue`: users can only see their own notifications

### 24.3 Sensitive Data Handling

- [ ] **DB-267**: Encrypt sensitive columns at rest
  - `users.password_hash` — already hashed, no additional encryption needed
  - `spec_permissions.encryption_token` — encrypt using application-level encryption (AES-256)
  - Document encryption key management strategy
- [ ] **DB-268**: Configure SSL for database connections
  - Require SSL in production (`sslmode=require` or `sslmode=verify-full`)
  - Generate and configure SSL certificates
  - Optional in development (configurable via env var)
- [ ] **DB-269**: Audit sensitive data access
  - Log all access to `users.password_hash`, `spec_permissions.encryption_token`
  - Use PostgreSQL `pgaudit` extension for query-level audit logging
  - Monitor for unusual access patterns

---

## Summary

### Task Count by Section

| Section                                | Tasks                      |
| -------------------------------------- | -------------------------- |
| 1. ORM & Migration Library Selection   | 9 (DB-001 through DB-009)  |
| 2. Database Connection & Configuration | 10 (DB-010 through DB-019) |
| 3. Schema — Users                      | 14 (DB-020 through DB-033) |
| 4. Schema — Projects                   | 14 (DB-034 through DB-047) |
| 5. Schema — Project Members            | 12 (DB-048 through DB-059) |
| 6. Schema — Spec Permissions           | 13 (DB-060 through DB-073) |
| 7. Schema — Permission Shares          | 15 (DB-074 through DB-088) |
| 8. Schema — Agent Sessions             | 18 (DB-089 through DB-106) |
| 9. Schema — Agent Messages             | 11 (DB-107 through DB-117) |
| 10. Schema — Sync State                | 13 (DB-118 through DB-130) |
| 11. Schema — Generated UI Registry     | 14 (DB-131 through DB-144) |
| 12. Schema — Plan Executions           | 16 (DB-145 through DB-160) |
| 13. Schema — Audit Log                 | 18 (DB-161 through DB-178) |
| 14. Schema — Notification Queue        | 17 (DB-179 through DB-195) |
| 15. Cross-Table Indexes & Constraints  | 7 (DB-196 through DB-202)  |
| 16. Enums & Custom Types               | 8 (DB-203 through DB-210)  |
| 17. Migration Strategy                 | 11 (DB-211 through DB-221) |
| 18. Seed Data                          | 10 (DB-222 through DB-231) |
| 19. Connection Pooling                 | 6 (DB-232 through DB-237)  |
| 20. Backup & Recovery                  | 5 (DB-238 through DB-242)  |
| 21. Performance Tuning                 | 9 (DB-243 through DB-251)  |
| 22. Database Monitoring                | 7 (DB-252 through DB-258)  |
| 23. Data Lifecycle & Retention         | 4 (DB-259 through DB-262)  |
| 24. Security & Access Control          | 7 (DB-263 through DB-269)  |
| **TOTAL**                              | **269**                    |

### Dependencies (What This Plan Enables)

Completion of this plan unblocks:

- `03-SERVER/02-API-PLAN.md` — needs database tables and entities for API endpoints
- `03-SERVER/03-AUTH-PLAN.md` — needs users table for authentication
- `05-RAG-LAYER/PLAN.md` — needs database for embedding metadata storage
- `08-TESTING/03-SERVER-TESTING-PLAN.md` — needs test database setup for integration tests
- `11-DEPLOYMENT/PLAN.md` — needs database configuration for production deployment

### Definition of Done

This plan is complete when:

- [ ] All 12+ tables are created with correct columns, types, and constraints
- [ ] All indexes are created and verified with EXPLAIN ANALYZE
- [ ] All foreign keys and check constraints are in place
- [ ] Migrations run cleanly up and down
- [ ] Seed data populates a usable development database
- [ ] Connection pooling is configured and monitored
- [ ] Backup and restore scripts work end-to-end
- [ ] Database health check endpoint returns correct status
- [ ] ORM entities map all tables with correct types and relations
- [ ] Test database setup/teardown works for integration tests
