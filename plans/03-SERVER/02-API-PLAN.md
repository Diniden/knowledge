# 03-SERVER / 02 — API PLAN

> **Purpose**: Define the complete REST API specification including every
> endpoint, HTTP method, path, request/response schemas, DTOs, validation
> rules, pagination, filtering, sorting, API versioning, documentation,
> rate limiting, and error handling for all server domains.
>
> **Phase**: 1 (Foundation) + Phase 2 (Core) + Phase 3 (Agent)
> **Dependencies**: `03-SERVER/01-ARCHITECTURE-PLAN.md`, `07-DATABASE/PLAN.md`
> **Estimated tasks**: 220+

---

## Table of Contents

1. [API Conventions & Versioning](#1-api-conventions--versioning)
2. [Request & Response Standards](#2-request--response-standards)
3. [Pagination, Filtering & Sorting](#3-pagination-filtering--sorting)
4. [Auth Endpoints](#4-auth-endpoints)
5. [Users Endpoints](#5-users-endpoints)
6. [Projects Endpoints](#6-projects-endpoints)
7. [Spec Documents Endpoints](#7-spec-documents-endpoints)
8. [Specs Endpoints](#8-specs-endpoints)
9. [Knowledge Graph Endpoints](#9-knowledge-graph-endpoints)
10. [Agent Endpoints](#10-agent-endpoints)
11. [Generated UI Endpoints](#11-generated-ui-endpoints)
12. [Collaboration Endpoints](#12-collaboration-endpoints)
13. [Plans Endpoints](#13-plans-endpoints)
14. [File Upload Endpoints](#14-file-upload-endpoints)
15. [Health & Admin Endpoints](#15-health--admin-endpoints)
16. [API Documentation (Swagger)](#16-api-documentation-swagger)
17. [Rate Limiting Rules](#17-rate-limiting-rules)

---

## 1. API Conventions & Versioning

### 1.1 URL Structure

- [ ] **SV-API-001**: Establish URL naming conventions
  - All endpoints under `/api/v1/` prefix
  - Use kebab-case for URL segments (`/spec-documents/`, not `/specDocuments/`)
  - Use plural nouns for resource collections (`/users/`, `/specs/`)
  - Use nested resources for parent-child: `/projects/:projectId/specs/`
  - Use verbs only for actions that don't map to CRUD: `/agent/sessions/:id/terminate`
  - Query parameters use camelCase (`?pageSize=20&sortBy=createdAt`)

### 1.2 HTTP Method Conventions

- [ ] **SV-API-002**: Define HTTP method usage rules
  - `GET` — read resources (no body, query params for filtering)
  - `POST` — create resources or trigger actions
  - `PUT` — full resource replacement (rarely used)
  - `PATCH` — partial resource update
  - `DELETE` — remove resources
  - Return `201 Created` for successful POST that creates a resource
  - Return `200 OK` for successful GET, PATCH, PUT
  - Return `204 No Content` for successful DELETE
  - Return `202 Accepted` for async operations (agent tasks)

### 1.3 API Versioning

- [ ] **SV-API-003**: Implement URL-based API versioning
  - Version in URL path: `/api/v1/...`
  - All current endpoints under `v1`
  - Plan for `v2` when breaking changes are needed
  - Legacy version support window: 6 months after new version release
- [ ] **SV-API-004**: Create `ApiVersion` controller decorator
  - `@ApiVersion('v1')` sets the version prefix
  - Supports multiple versions on same controller for gradual migration

#### Design Decisions

> **Q**: Should nested resources use full paths (`/projects/:projectId/specs/:specId`) or flat paths with query params (`/specs/:specId?projectId=xxx`)?
> **A**: Nested paths for resource creation and listing (`/projects/:projectId/specs` for listing specs in a project). Flat paths for direct resource access (`GET /specs/:specId`, `PATCH /specs/:specId`) since spec IDs are globally unique. This keeps URLs shallow for single-resource operations while preserving the parent relationship for collection operations.

> **Q**: Should action endpoints use verbs (`/sessions/:id/terminate`) or treat state changes as PATCH operations?
> **A**: Use `POST` with verb-style endpoints for actions that have side effects beyond a simple field update: `POST /sessions/:id/terminate`, `POST /projects/:id/sync`, `POST /specs/:id/revert`. Use `PATCH` for simple field updates. The distinction is: if it triggers a workflow, it's a POST action. If it just changes data, it's a PATCH.

> **Q**: Should the API use singular or plural resource names?
> **A**: Plural resource names confirmed. `/specs/`, `/users/`, `/projects/`, `/sessions/`, `/documents/`, `/edges/`. This is the most common REST convention.

> **Q**: Is URL-based versioning the right choice, or should the API use header-based versioning?
> **A**: URL-based versioning: `/api/v1/`. It's simpler, visible in logs and browser devtools, easier to route at the infrastructure level, and the industry default for internal APIs.

> **Q**: Should the version be required in every request, or should unversioned requests default to the latest version?
> **A**: Version is required. Requests to `/api/specs` (no version) return 404. This prevents accidental breakage when a new API version is released.

---

## 2. Request & Response Standards

### 2.1 Request Format

- [ ] **SV-API-005**: Define request body standards
  - Content-Type: `application/json` for all non-file endpoints
  - Content-Type: `multipart/form-data` for file upload endpoints
  - All request bodies validated by DTOs with `class-validator`
  - Unknown fields rejected (`forbidNonWhitelisted: true`)
  - Empty request bodies allowed only for parameter-only endpoints
- [ ] **SV-API-006**: Define request header standards
  - `Authorization: Bearer <token>` (fallback for cookie auth)
  - `X-Request-ID: <uuid>` (optional, for request tracing)
  - `Content-Type` required for request bodies
  - `Accept: application/json` expected for all endpoints

### 2.2 Success Response Envelope

- [ ] **SV-API-007**: Define standard success response format
  ```typescript
  interface ApiResponse<T> {
    data: T;
    meta?: {
      requestId: string;
      timestamp: string;
      pagination?: PaginationMeta;
    };
  }

  interface PaginationMeta {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  }
  ```
- [ ] **SV-API-008**: Implement `TransformInterceptor` to wrap all responses
  - Wrap controller return values in `{ data: ... }` envelope
  - Attach `meta.requestId` from request context
  - Attach `meta.timestamp` as ISO string
  - Attach `meta.pagination` when present (set by controller)
  - Skip wrapping for streaming responses

### 2.3 Error Response Format

- [ ] **SV-API-009**: Define standard error response format
  ```typescript
  interface ApiErrorResponse {
    error: {
      code: string;
      message: string;
      statusCode: number;
      details?: ValidationError[];
      requestId: string;
      timestamp: string;
    };
  }

  interface ValidationError {
    field: string;
    message: string;
    constraint: string;
  }
  ```
- [ ] **SV-API-010**: Map HTTP status codes to error categories
  - `400` — validation errors, malformed requests
  - `401` — authentication required / invalid token
  - `403` — insufficient permissions
  - `404` — resource not found
  - `409` — conflict (duplicate, merge conflict)
  - `408` — request timeout
  - `413` — payload too large
  - `422` — unprocessable entity (valid JSON but semantic error)
  - `429` — rate limit exceeded
  - `500` — internal server error
  - `502` — upstream service error (Claude Code failure)
  - `503` — service unavailable (agent capacity exceeded)

### 2.4 DTO Base Classes

- [ ] **SV-API-011**: Create base DTO classes for reuse
  - `PaginationQueryDto` — page, limit, sort, order fields
  - `IdParamDto` — `id` as UUID validation
  - `ProjectScopedParamDto` — `projectId` as UUID
  - `DateRangeQueryDto` — `startDate`, `endDate` as ISO strings
  - `SearchQueryDto` — `query` as string, `fields` as optional array
- [ ] **SV-API-012**: Create response DTO base classes
  - `BaseResponseDto` — `id`, `createdAt`, `updatedAt` fields
  - `PaginatedResponseDto<T>` — wraps array with pagination meta
  - `TimestampedResponseDto` — adds `createdAt`, `updatedAt`

#### Design Decisions

> **Q**: Should all responses use the `{ data, meta }` envelope, or should simple endpoints return the resource directly?
> **A**: All responses use the envelope: `{ data, meta }`. Consistency outweighs the minor payload overhead. `meta` is always present (at minimum contains `requestId`). This makes client-side response handling uniform.

> **Q**: Should the `meta` object include server version information for debugging?
> **A**: No. Do not include server version in `meta`. It leaks deployment information. The `requestId` is sufficient for debugging — server logs correlate the request ID to the server version/instance.

> **Q**: Should list endpoints return `{ data: T[], meta: { pagination } }` or `{ data: { items: T[], pagination } }`?
> **A**: Use `{ data: T[], meta: { pagination, requestId } }`. The flat structure is simpler, and pagination metadata belongs in `meta` alongside other response metadata.

> **Q**: Should validation errors return the attempted value in the error details?
> **A**: Omit the attempted value. Reflecting user input in error responses can enable XSS in poorly-secured clients and leaks data in logs. Return the field name and the constraint that failed.

> **Q**: Should the API provide error documentation URLs?
> **A**: No. Not for the initial release. Error codes and messages should be self-descriptive. The Swagger documentation serves as the API reference.

> **Q**: Should error responses include a `traceId` separate from `requestId` for distributed tracing?
> **A**: `requestId` only. The system is single-instance for the initial release. Distributed tracing adds complexity for zero benefit. Introduce OpenTelemetry trace propagation when horizontal scaling is added.

---

## 3. Pagination, Filtering & Sorting

### 3.1 Pagination

- [ ] **SV-API-013**: Implement offset-based pagination
  - Query params: `page` (1-indexed, default: 1), `limit` (default: 20, max: 100)
  - Response includes `meta.pagination` with total count
  - Return empty array (not 404) for pages beyond total
  - Add `X-Total-Count` response header for convenience
- [ ] **SV-API-014**: Implement cursor-based pagination (for large datasets)
  - Query params: `cursor` (opaque string), `limit`
  - Response includes `meta.nextCursor` for next page
  - Use for: agent message history, audit logs, git commit history
  - Encode cursor as base64 of `{ id, createdAt }` for consistency
- [ ] **SV-API-015**: Create `PaginationQueryDto` with validation
  - `page`: integer, min 1, default 1
  - `limit`: integer, min 1, max 100, default 20
  - `cursor`: optional string (mutually exclusive with page)
- [ ] **SV-API-016**: Create `@Paginated()` decorator for controller methods
  - Automatically parses pagination params from query
  - Injects typed `PaginationParams` into handler
  - Sets pagination meta on response

### 3.2 Filtering

- [ ] **SV-API-017**: Define filtering conventions
  - Simple equality: `?status=active`
  - Multiple values: `?status=active,archived` (OR)
  - Date ranges: `?createdAfter=2025-01-01&createdBefore=2025-12-31`
  - Search: `?search=keyword` (searches relevant text fields)
  - Boolean: `?isPrivate=true`
- [ ] **SV-API-018**: Implement filter validation per endpoint
  - Define allowed filter fields per resource
  - Reject unknown filter parameters
  - Validate filter values match expected types
  - Sanitize string filters to prevent injection
- [ ] **SV-API-019**: Create `FilterQueryDto` base with common patterns
  - `search`: optional string (min 1 char, max 200)
  - `createdAfter`: optional ISO date string
  - `createdBefore`: optional ISO date string
  - `updatedAfter`: optional ISO date string
  - `updatedBefore`: optional ISO date string

### 3.3 Sorting

- [ ] **SV-API-020**: Define sorting conventions
  - Query param: `sortBy=fieldName` (default: `createdAt`)
  - Query param: `order=asc|desc` (default: `desc`)
  - Multi-sort: `sortBy=field1,-field2` (prefix `-` for descending)
- [ ] **SV-API-021**: Implement sort validation per endpoint
  - Define allowed sort fields per resource
  - Reject unknown sort fields
  - Map API field names to database column names
- [ ] **SV-API-022**: Create `SortQueryDto` with validation
  - `sortBy`: string, validated against allowed fields
  - `order`: enum `asc | desc`, default `desc`

#### Design Decisions

> **Q**: Should the API use offset-based or cursor-based pagination as the primary pattern?
> **A**: Cursor-based pagination as the primary pattern. Use `?cursor=xxx&limit=20` where the cursor is an opaque base64-encoded value. Cursor pagination handles concurrent inserts/deletes correctly and performs well on large datasets (no `OFFSET` scan).

> **Q**: Should the total count be included in every paginated response?
> **A**: Optional via `?count=true`. Total count is expensive for large tables and usually unnecessary for infinite-scroll UIs. When omitted, `totalCount` is absent. The UI uses `hasMore` (derived from whether `limit + 1` items were returned) for infinite scroll.

> **Q**: Should there be a maximum page depth?
> **A**: Not applicable with cursor-based pagination — there's no concept of "page depth." Every cursor lookup is an indexed seek, equally fast regardless of position.

> **Q**: What should the default page size be?
> **A**: Default 20, with per-endpoint overrides. Spec lists: default 50. Agent session messages: default 20. Agent session list: default 10. Edge lists: default 50. Maximum allowed limit: 100 for all endpoints.

> **Q**: Should pagination defaults be configurable per endpoint, or use a single global default?
> **A**: Per-endpoint defaults, defined as constants in each controller. A global default (20) serves as the fallback.

---

## 4. Auth Endpoints

### 4.1 Registration

- [ ] **SV-API-023**: Implement `POST /api/v1/auth/register`
  - Request DTO: `RegisterDto`
    - `email`: string, valid email format, required
    - `username`: string, 3-30 chars, alphanumeric + hyphens, required
    - `password`: string, min 8 chars, must contain upper, lower, number, required
    - `displayName`: string, 1-100 chars, optional
  - Response: `{ data: { user: UserResponseDto, message: string } }`
  - Status: `201 Created`
  - Validation: reject duplicate email, reject duplicate username
  - Hash password with bcrypt before storage
  - Do NOT auto-login — require separate login call
- [ ] **SV-API-024**: Create `RegisterDto` with all validations
  - `@IsEmail()` for email
  - `@IsString() @MinLength(3) @MaxLength(30) @Matches(/^[a-zA-Z0-9-]+$/)` for username
  - `@IsString() @MinLength(8) @Matches(/(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])/)` for password
  - `@IsOptional() @IsString() @MaxLength(100)` for displayName

### 4.2 Login

- [ ] **SV-API-025**: Implement `POST /api/v1/auth/login`
  - Request DTO: `LoginDto`
    - `email`: string, required
    - `password`: string, required
  - Response: `{ data: { user: UserResponseDto, accessToken: string } }`
  - Set `access_token` as http-only secure cookie
  - Set `refresh_token` as http-only secure cookie (separate path)
  - Status: `200 OK`
  - Return `401` for invalid credentials (generic message, no email/password hint)
- [ ] **SV-API-026**: Create `LoginDto` with validations
  - `@IsEmail()` for email
  - `@IsString() @IsNotEmpty()` for password

### 4.3 Token Refresh

- [ ] **SV-API-027**: Implement `POST /api/v1/auth/refresh`
  - No request body — reads `refresh_token` from http-only cookie
  - Response: `{ data: { accessToken: string } }`
  - Set new `access_token` cookie
  - Optionally rotate `refresh_token` cookie
  - Status: `200 OK`
  - Return `401` if refresh token is invalid or expired
- [ ] **SV-API-028**: Create refresh token rotation logic
  - On each refresh, issue new refresh token
  - Invalidate previous refresh token
  - Detect refresh token reuse (indicates token theft — invalidate all)

### 4.4 Logout

- [ ] **SV-API-029**: Implement `POST /api/v1/auth/logout`
  - No request body
  - Clear `access_token` cookie
  - Clear `refresh_token` cookie
  - Add refresh token to server-side blocklist
  - Status: `200 OK`
  - Response: `{ data: { message: 'Logged out successfully' } }`

### 4.5 Password Management

- [ ] **SV-API-030**: Implement `POST /api/v1/auth/forgot-password`
  - Request: `{ email: string }`
  - Always return 200 (don't reveal if email exists)
  - Generate password reset token, store hashed in DB
  - Send reset link via email (or log in dev mode)
  - Token expires in 1 hour
- [ ] **SV-API-031**: Implement `POST /api/v1/auth/reset-password`
  - Request: `{ token: string, password: string }`
  - Validate token exists and is not expired
  - Hash new password, update user record
  - Invalidate all existing refresh tokens for user
  - Status: `200 OK`
- [ ] **SV-API-032**: Implement `PATCH /api/v1/auth/change-password`
  - Requires authentication
  - Request: `{ currentPassword: string, newPassword: string }`
  - Verify current password before changing
  - Hash new password, update user record
  - Optionally invalidate all other sessions
  - Status: `200 OK`

### 4.6 Session Info

- [ ] **SV-API-033**: Implement `GET /api/v1/auth/me`
  - Requires authentication
  - Response: `{ data: UserResponseDto }` (current user info)
  - Include user roles, permissions summary
  - Status: `200 OK`

#### Design Decisions

> **Q**: Should the access token be returned in the response body AND set as a cookie, or cookie only?
> **A**: Both. The login endpoint sets the access token as an HTTP-only cookie AND returns it in the response body. Browser clients use the cookie automatically. CLI tools extract the token from the response body and send it as a `Bearer` token.

> **Q**: What should the access token TTL be?
> **A**: 15 minutes. This is the security-first default. The client implements transparent refresh — when a 401 is received, the client calls `/auth/refresh` to get a new access token and retries the original request.

> **Q**: Should the refresh token be rotated on every use or be long-lived?
> **A**: Rotate on every use. Each call to `/auth/refresh` issues a new refresh token and invalidates the old one. If a stolen refresh token is used after the legitimate user has already refreshed, the server detects the reuse and revokes all sessions for that user (token family).

> **Q**: Should the API support API keys for programmatic access?
> **A**: Yes, but deferred to phase 2. The initial release supports JWT cookie + Bearer token from login. API keys (long-lived, user-generated, scoped) are a phase 2 feature.

> **Q**: Should email verification be required before the user can log in?
> **A**: Account is immediately usable. Show a persistent "verify your email" banner in the UI. Require verification before the user can create projects or collaborate.

> **Q**: Should the registration endpoint support social auth providers?
> **A**: Deferred to phase 2. The initial release supports email/password only. The user schema should include a `providers` JSON column from day one so the schema doesn't need migration when social auth is added.

> **Q**: Should there be an invite-only registration mode?
> **A**: Yes, as a server configuration option (`REGISTRATION_MODE=open|invite`). Default to `open` for development. In production, the first registered user becomes admin and can toggle the mode.

---

## 5. Users Endpoints

### 5.1 User Profile

- [ ] **SV-API-034**: Implement `GET /api/v1/users/profile`
  - Requires authentication
  - Response: current user's full profile
  - Include: id, email, username, displayName, avatar, settings, createdAt
- [ ] **SV-API-035**: Implement `PATCH /api/v1/users/profile`
  - Requires authentication
  - Request DTO: `UpdateProfileDto`
    - `displayName`: optional string, max 100 chars
    - `avatar`: optional string (URL)
  - Response: updated profile
  - Status: `200 OK`
- [ ] **SV-API-036**: Create `UpdateProfileDto` with validations
  - `@IsOptional() @IsString() @MaxLength(100)` for displayName
  - `@IsOptional() @IsUrl()` for avatar

### 5.2 User Settings

- [ ] **SV-API-037**: Implement `GET /api/v1/users/settings`
  - Requires authentication
  - Response: user preferences (theme, notifications, editor config)
- [ ] **SV-API-038**: Implement `PATCH /api/v1/users/settings`
  - Requires authentication
  - Request DTO: `UpdateSettingsDto`
    - `theme`: optional enum ('light', 'dark', 'system')
    - `notifications`: optional object with notification preferences
    - `editorConfig`: optional object with editor preferences
  - Response: updated settings
  - Status: `200 OK`
- [ ] **SV-API-039**: Create `UpdateSettingsDto` with nested validation
  - Validate theme enum values
  - Validate notification sub-fields
  - Validate editor config sub-fields

### 5.3 User Listing

- [ ] **SV-API-040**: Implement `GET /api/v1/users`
  - Requires authentication
  - Query params: pagination, search (by username/displayName)
  - Response: paginated list of users (public profiles only)
  - Exclude sensitive fields (email visible only to self and admins)
- [ ] **SV-API-041**: Implement `GET /api/v1/users/:id`
  - Requires authentication
  - Response: public profile of specified user
  - Include: id, username, displayName, avatar
  - Return `404` if user not found
- [ ] **SV-API-042**: Create `UserResponseDto` with field exclusions
  - `@Exclude()` on passwordHash, refreshTokenHash
  - `@Expose()` on id, username, displayName, avatar, createdAt
  - Conditional email exposure (self or admin only)

---

## 6. Projects Endpoints

### 6.1 Project CRUD

- [ ] **SV-API-043**: Implement `POST /api/v1/projects`
  - Requires authentication
  - Request DTO: `CreateProjectDto`
    - `name`: string, 1-100 chars, required
    - `description`: string, max 500 chars, optional
    - `slug`: string, auto-generated from name if not provided
    - `gitRemoteUrl`: string, valid URL, optional
  - Response: created project with `201 Created`
  - Initialize git repository in knowledge graph directory
  - Add creator as project owner
- [ ] **SV-API-044**: Implement `GET /api/v1/projects`
  - Requires authentication
  - Response: paginated list of projects user is a member of
  - Query params: pagination, search, sortBy (name, createdAt, updatedAt)
  - Include member count and last activity timestamp per project
- [ ] **SV-API-045**: Implement `GET /api/v1/projects/:projectId`
  - Requires authentication + project membership
  - Response: full project details
  - Include: settings, member list, stats (spec count, edge count)
- [ ] **SV-API-046**: Implement `PATCH /api/v1/projects/:projectId`
  - Requires authentication + project owner role
  - Request DTO: `UpdateProjectDto`
    - `name`: optional string
    - `description`: optional string
    - `settings`: optional project settings object
  - Response: updated project
- [ ] **SV-API-047**: Implement `DELETE /api/v1/projects/:projectId`
  - Requires authentication + project owner role
  - Soft delete (mark as deleted, don't remove data)
  - Return `204 No Content`
  - Add confirmation mechanism (require project name in body)
- [ ] **SV-API-048**: Create `CreateProjectDto` with validations
  - `@IsString() @MinLength(1) @MaxLength(100)` for name
  - `@IsOptional() @IsString() @MaxLength(500)` for description
  - `@IsOptional() @IsString() @Matches(/^[a-z0-9-]+$/)` for slug
  - `@IsOptional() @IsUrl()` for gitRemoteUrl
- [ ] **SV-API-049**: Create `UpdateProjectDto` with partial validation
  - Extend `PartialType(CreateProjectDto)` for optional fields
  - Add `settings` as optional nested DTO

### 6.2 Project Members

- [ ] **SV-API-050**: Implement `GET /api/v1/projects/:projectId/members`
  - Requires authentication + project membership
  - Response: list of project members with roles
  - Include: userId, username, displayName, role, joinedAt
- [ ] **SV-API-051**: Implement `POST /api/v1/projects/:projectId/members`
  - Requires authentication + project owner/admin role
  - Request: `{ userId: string, role: 'admin' | 'member' | 'viewer' }`
  - Response: added member with `201 Created`
  - Return `409` if user is already a member
- [ ] **SV-API-052**: Implement `PATCH /api/v1/projects/:projectId/members/:userId`
  - Requires authentication + project owner role
  - Request: `{ role: 'admin' | 'member' | 'viewer' }`
  - Response: updated member
  - Cannot change own role (prevent self-demotion from owner)
- [ ] **SV-API-053**: Implement `DELETE /api/v1/projects/:projectId/members/:userId`
  - Requires authentication + project owner/admin role
  - Return `204 No Content`
  - Cannot remove the last owner

### 6.3 Project Cloning

- [ ] **SV-API-054**: Implement `POST /api/v1/projects/:projectId/clone`
  - Requires authentication + project membership
  - Request: `{ name: string, description?: string }`
  - Response: `202 Accepted` with new project ID
  - Clones git repository and knowledge graph data
  - Long-running operation — use WebSocket for progress updates
- [ ] **SV-API-055**: Create `CloneProjectDto` with validations
  - `@IsString() @MinLength(1) @MaxLength(100)` for name
  - `@IsOptional() @IsString() @MaxLength(500)` for description

#### Design Decisions

> **Q**: Should specs always belong to a document, or can specs exist independently?
> **A**: Specs must always belong to a document. Every project has a default "Inbox" document for specs that haven't been categorized yet. Agent-created specs go into the Inbox by default unless the agent explicitly assigns them to a document.

> **Q**: Should the spec creation endpoint automatically create a graph node, or should node creation be a separate step?
> **A**: Auto-create the graph node on spec creation. A spec without a graph node has no purpose in the knowledge graph. The spec creation endpoint writes the spec JSON file AND creates the corresponding node entry in a single commit.

> **Q**: When a document is deleted, what happens to its specs?
> **A**: Specs are moved to the "Inbox" document. Users must explicitly delete individual specs if they want to remove them. Document deletion is a reorganization operation, not a data destruction operation.

---

## 7. Spec Documents Endpoints

### 7.1 Document CRUD

- [ ] **SV-API-056**: Implement `POST /api/v1/projects/:projectId/documents`
  - Requires authentication + project membership
  - Request DTO: `CreateDocumentDto`
    - `title`: string, 1-200 chars, required
    - `description`: string, max 1000 chars, optional
    - `tags`: string array, optional
  - Response: created document with `201 Created`
  - Create document file in knowledge graph directory
  - Commit initial document to git
- [ ] **SV-API-057**: Implement `GET /api/v1/projects/:projectId/documents`
  - Requires authentication + project membership
  - Response: paginated list of documents
  - Query params: pagination, search (title/description), tags filter
  - Include spec count per document
- [ ] **SV-API-058**: Implement `GET /api/v1/projects/:projectId/documents/:documentId`
  - Requires authentication + project membership
  - Response: full document with nested specs
  - Include: title, description, specs (ordered), metadata, version info
  - Respect spec-level permissions (replace restricted specs with summaries)
- [ ] **SV-API-059**: Implement `PATCH /api/v1/projects/:projectId/documents/:documentId`
  - Requires authentication + project membership
  - Request DTO: `UpdateDocumentDto`
    - `title`: optional string
    - `description`: optional string
    - `tags`: optional string array
    - `specOrder`: optional array of spec IDs (for reordering)
  - Response: updated document
  - Commit changes to git
- [ ] **SV-API-060**: Implement `DELETE /api/v1/projects/:projectId/documents/:documentId`
  - Requires authentication + project membership
  - Does NOT delete contained specs (they become orphaned or move to another doc)
  - Return `204 No Content`
  - Commit deletion to git
- [ ] **SV-API-061**: Create `CreateDocumentDto` with validations
  - `@IsString() @MinLength(1) @MaxLength(200)` for title
  - `@IsOptional() @IsString() @MaxLength(1000)` for description
  - `@IsOptional() @IsArray() @IsString({ each: true })` for tags
- [ ] **SV-API-062**: Create `UpdateDocumentDto` with partial validation
  - Extend `PartialType(CreateDocumentDto)`
  - `@IsOptional() @IsArray() @IsUUID('4', { each: true })` for specOrder

### 7.2 Document Version History

- [ ] **SV-API-063**: Implement `GET /api/v1/projects/:projectId/documents/:documentId/history`
  - Requires authentication + project membership
  - Response: paginated list of document version entries
  - Each entry: commit hash, timestamp, author, changed specs summary
  - Query params: pagination
- [ ] **SV-API-064**: Implement `POST /api/v1/projects/:projectId/documents/:documentId/revert`
  - Requires authentication + project membership
  - Request: `{ commitHash: string }`
  - Reverts ALL specs in the document to their state at that commit
  - Creates a new commit representing the revert
  - Response: updated document state

---

## 8. Specs Endpoints

### 8.1 Spec CRUD

- [ ] **SV-API-065**: Implement `POST /api/v1/projects/:projectId/specs`
  - Requires authentication + project membership
  - Request DTO: `CreateSpecDto`
    - `title`: string, 1-200 chars, required
    - `content`: string (markdown), required
    - `documentId`: UUID, optional (which document to add to)
    - `tags`: string array, optional
    - `metadata`: object, optional (custom key-value pairs)
  - Response: created spec with `201 Created`
  - Create spec file in knowledge graph directory
  - Create corresponding graph node
  - Commit to git
  - Trigger embedding generation (async)
- [ ] **SV-API-066**: Implement `GET /api/v1/projects/:projectId/specs`
  - Requires authentication + project membership
  - Response: paginated list of specs
  - Query params: pagination, search, tags filter, documentId filter
  - Respect permissions (return summary for restricted specs)
  - Include: id, title, tags, documentId, createdAt, updatedAt
- [ ] **SV-API-067**: Implement `GET /api/v1/projects/:projectId/specs/:specId`
  - Requires authentication + project membership + spec permission
  - Response: full spec content
  - Include: content, metadata, version info, edges, document association
  - Return summary version for `summary` access level
- [ ] **SV-API-068**: Implement `PATCH /api/v1/projects/:projectId/specs/:specId`
  - Requires authentication + full spec access
  - Request DTO: `UpdateSpecDto`
    - `title`: optional string
    - `content`: optional string (markdown)
    - `tags`: optional string array
    - `metadata`: optional object
  - Response: updated spec
  - Commit change to git (individual spec commit)
  - Trigger re-embedding (async)
  - Emit event for graph crawl implications
- [ ] **SV-API-069**: Implement `DELETE /api/v1/projects/:projectId/specs/:specId`
  - Requires authentication + full spec access
  - Remove spec file from knowledge graph
  - Remove graph node and connected edges
  - Commit deletion to git
  - Return `204 No Content`
- [ ] **SV-API-070**: Create `CreateSpecDto` with validations
  - `@IsString() @MinLength(1) @MaxLength(200)` for title
  - `@IsString() @IsNotEmpty()` for content
  - `@IsOptional() @IsUUID('4')` for documentId
  - `@IsOptional() @IsArray() @IsString({ each: true })` for tags
  - `@IsOptional() @IsObject()` for metadata
- [ ] **SV-API-071**: Create `UpdateSpecDto` with partial validation
  - Extend `PartialType(CreateSpecDto)` excluding documentId
- [ ] **SV-API-072**: Create `SpecResponseDto` with access levels
  - Full access: all fields exposed
  - Summary access: only id, title (redacted), summary, tags
  - Use serialization groups for conditional field exposure

### 8.2 Spec Version History

- [ ] **SV-API-073**: Implement `GET /api/v1/projects/:projectId/specs/:specId/history`
  - Requires authentication + spec permission
  - Response: paginated list of spec versions
  - Each entry: commit hash, timestamp, author, change summary
  - Query params: pagination
- [ ] **SV-API-074**: Implement `GET /api/v1/projects/:projectId/specs/:specId/versions/:commitHash`
  - Requires authentication + spec permission
  - Response: spec content at the specified commit hash
  - Return `404` if commit doesn't contain this spec
- [ ] **SV-API-075**: Implement `GET /api/v1/projects/:projectId/specs/:specId/diff`
  - Requires authentication + spec permission
  - Query params: `from` (commit hash), `to` (commit hash, default: current)
  - Response: diff between two versions of the spec
  - Format: structured diff (additions, deletions, context lines)
- [ ] **SV-API-076**: Implement `POST /api/v1/projects/:projectId/specs/:specId/revert`
  - Requires authentication + full spec access
  - Request: `{ commitHash: string }`
  - Reverts spec to content at specified commit
  - Creates new commit for the revert (not git revert, but content replacement)
  - Response: updated spec content

### 8.3 Spec Permissions

- [ ] **SV-API-077**: Implement `GET /api/v1/projects/:projectId/specs/:specId/permissions`
  - Requires authentication + full spec access
  - Response: list of users with access levels
  - Include: userId, username, accessLevel (full/summary), grantedAt
- [ ] **SV-API-078**: Implement `POST /api/v1/projects/:projectId/specs/:specId/permissions`
  - Requires authentication + full spec access (only spec owner/creator)
  - Request: `{ userId: string, accessLevel: 'full' | 'summary' }`
  - Grant user access to spec
  - Generate and store access token
  - Return `201 Created`
- [ ] **SV-API-079**: Implement `DELETE /api/v1/projects/:projectId/specs/:specId/permissions/:userId`
  - Requires authentication + full spec access (only spec owner/creator)
  - Revoke user's access to spec
  - Access token becomes invalid for future changes only
  - Return `204 No Content`

### 8.4 Spec Summary

- [ ] **SV-API-080**: Implement `GET /api/v1/projects/:projectId/specs/:specId/summary`
  - Requires authentication + at least summary access
  - Response: AI-generated summary of the spec
  - Include: summary text, last generated timestamp
- [ ] **SV-API-081**: Implement `PATCH /api/v1/projects/:projectId/specs/:specId/summary`
  - Requires authentication + full spec access
  - Request: `{ summary: string }`
  - Override AI-generated summary with user-provided summary
  - Response: updated summary
- [ ] **SV-API-082**: Implement `POST /api/v1/projects/:projectId/specs/:specId/summary/regenerate`
  - Requires authentication + full spec access
  - Triggers AI to regenerate summary from current spec content
  - Response: `202 Accepted` (async operation)

### 8.5 Batch Operations

- [ ] **SV-API-083**: Implement `POST /api/v1/projects/:projectId/specs/batch`
  - Requires authentication + project membership
  - Request: `{ specs: CreateSpecDto[] }` (max 50 specs per batch)
  - Creates multiple specs in a single git commit
  - Response: array of created specs with `201 Created`
- [ ] **SV-API-084**: Implement `PATCH /api/v1/projects/:projectId/specs/batch`
  - Requires authentication + full access on all target specs
  - Request: `{ updates: { id: string, ...UpdateSpecDto }[] }`
  - Updates multiple specs in a single git commit
  - Response: array of updated specs
- [ ] **SV-API-085**: Implement `POST /api/v1/projects/:projectId/specs/move`
  - Requires authentication + project membership
  - Request: `{ specIds: string[], targetDocumentId: string }`
  - Move specs from one document to another
  - Response: updated spec assignments

---

## 9. Knowledge Graph Endpoints

### 9.1 Node Operations

- [ ] **SV-API-086**: Implement `GET /api/v1/projects/:projectId/graph/nodes`
  - Requires authentication + project membership
  - Response: paginated list of graph nodes
  - Query params: pagination, search, type filter, tags filter
  - Each node: id, specId, label, type, metadata, edge count
  - Respect spec permissions (summary nodes for restricted specs)
- [ ] **SV-API-087**: Implement `GET /api/v1/projects/:projectId/graph/nodes/:nodeId`
  - Requires authentication + project membership
  - Response: node with connected edges and neighbor nodes
  - Include: spec reference, metadata, all edges (in/out)
  - Respect permissions on connected nodes
- [ ] **SV-API-088**: Implement `PATCH /api/v1/projects/:projectId/graph/nodes/:nodeId`
  - Requires authentication + full spec access
  - Request: `{ metadata: object }` (update node metadata only)
  - Spec content updated via specs endpoint, not graph endpoint
  - Response: updated node

### 9.2 Edge Operations

- [ ] **SV-API-089**: Implement `POST /api/v1/projects/:projectId/graph/edges`
  - Requires authentication + project membership
  - Request DTO: `CreateEdgeDto`
    - `sourceNodeId`: UUID, required
    - `targetNodeId`: UUID, required
    - `type`: enum (derived-from, depends-on, related-to, contradicts, supersedes), required
    - `metadata`: object, optional (agent analysis, description)
  - Response: created edge with `201 Created`
  - Validate: no self-loops, no duplicate edges of same type
  - Commit edge to git
- [ ] **SV-API-090**: Implement `GET /api/v1/projects/:projectId/graph/edges`
  - Requires authentication + project membership
  - Response: paginated list of edges
  - Query params: type filter, sourceNodeId, targetNodeId
  - Include: source and target node summaries
- [ ] **SV-API-091**: Implement `GET /api/v1/projects/:projectId/graph/edges/:edgeId`
  - Requires authentication + project membership
  - Response: edge with full source and target node details
- [ ] **SV-API-092**: Implement `PATCH /api/v1/projects/:projectId/graph/edges/:edgeId`
  - Requires authentication + project membership
  - Request: `{ type?: EdgeType, metadata?: object }`
  - Commit change to git
  - Response: updated edge
- [ ] **SV-API-093**: Implement `DELETE /api/v1/projects/:projectId/graph/edges/:edgeId`
  - Requires authentication + project membership
  - Commit deletion to git
  - Return `204 No Content`
- [ ] **SV-API-094**: Create `CreateEdgeDto` with validations
  - `@IsUUID('4')` for sourceNodeId and targetNodeId
  - `@IsEnum(EdgeType)` for type
  - `@IsOptional() @IsObject()` for metadata
  - Custom validator: sourceNodeId !== targetNodeId

#### Design Decisions

> **Q**: Should the graph API expose raw file paths or only abstract IDs?
> **A**: Abstract IDs only. Never expose file paths in the API. The mapping from spec ID to file path is an internal implementation detail. The API returns spec IDs, document IDs, and edge IDs — all globally unique nanoids.

> **Q**: Should graph traversal be a GET request or POST request?
> **A**: GET for simple traversals with query parameters: `GET /graph/nodes/:id/neighbors?depth=2&edgeType=depends-on&direction=outbound`. POST for complex queries that exceed what query params can express: `POST /graph/query { ... }`. The GET endpoint covers 90% of use cases and benefits from HTTP caching.

> **Q**: Should edge creation validate that both source and target nodes exist, or allow "dangling" edges?
> **A**: Strict validation: both source and target nodes must exist before an edge can be created. For batch operations, the batch endpoint processes nodes first, then edges. The batch endpoint should accept an ordered array of operations and execute them sequentially within a single commit.

> **Q**: Should the graph stats endpoint be cached aggressively or computed on every request?
> **A**: Cache aggressively. Maintain a stats object in the in-memory graph index that updates on every mutation. The `GET /graph/stats` endpoint returns the cached stats instantly.

### 9.3 Graph Traversal & Search

- [ ] **SV-API-095**: Implement `POST /api/v1/projects/:projectId/graph/traverse`
  - Requires authentication + project membership
  - Request DTO: `TraversalQueryDto`
    - `startNodeId`: UUID, required
    - `direction`: enum ('outgoing', 'incoming', 'both'), default: 'both'
    - `edgeTypes`: EdgeType array, optional (filter by edge type)
    - `maxDepth`: integer, 1-10, default: 3
    - `maxNodes`: integer, 1-500, default: 100
  - Response: subgraph (nodes + edges within traversal)
  - Respect permissions on traversed nodes
- [ ] **SV-API-096**: Implement `POST /api/v1/projects/:projectId/graph/search`
  - Requires authentication + project membership
  - Request: `{ query: string, limit?: number, types?: EdgeType[] }`
  - Search across node labels, spec titles, spec content
  - Response: ranked list of matching nodes with relevance score
  - Integrate with RAG for semantic search
- [ ] **SV-API-097**: Implement `GET /api/v1/projects/:projectId/graph/stats`
  - Requires authentication + project membership
  - Response: graph statistics
  - Include: total nodes, total edges, edges by type, orphan nodes count,
    connected components count, average degree
- [ ] **SV-API-098**: Implement `GET /api/v1/projects/:projectId/graph/orphans`
  - Requires authentication + project membership
  - Response: list of nodes with no edges (orphan specs)
  - Useful for identifying unlinked knowledge

### 9.4 Inquiry Queue

- [ ] **SV-API-099**: Implement `GET /api/v1/projects/:projectId/graph/inquiries`
  - Requires authentication + project membership
  - Response: paginated list of inquiry items (issues flagged by agents)
  - Each item: id, nodeId, edgeId, type, message, status, createdAt
- [ ] **SV-API-100**: Implement `PATCH /api/v1/projects/:projectId/graph/inquiries/:inquiryId`
  - Requires authentication + project membership
  - Request: `{ status: 'resolved' | 'dismissed', resolution?: string }`
  - Response: updated inquiry

---

## 10. Agent Endpoints

### 10.1 Agent Sessions

- [ ] **SV-API-101**: Implement `POST /api/v1/projects/:projectId/agent/sessions`
  - Requires authentication + project membership
  - Request DTO: `StartSessionDto`
    - `context`: object describing what the user is working on
      - `documentId`: optional UUID (active document)
      - `specId`: optional UUID (active spec)
      - `graphViewport`: optional object (visible graph area)
    - `message`: string, initial user message, required
  - Response: `{ data: { sessionId: string, status: 'starting' } }`
  - Status: `202 Accepted` (session starts asynchronously)
  - Spawns Claude Code process with project context
  - Sends first message to agent
  - WebSocket delivers agent responses
- [ ] **SV-API-102**: Implement `GET /api/v1/projects/:projectId/agent/sessions`
  - Requires authentication
  - Response: list of user's agent sessions for this project
  - Include: sessionId, status, createdAt, lastMessageAt, messageCount
  - Filter: `?status=active` to show only active sessions
- [ ] **SV-API-103**: Implement `GET /api/v1/projects/:projectId/agent/sessions/:sessionId`
  - Requires authentication + session ownership
  - Response: session details with recent message history
  - Include: full session state, context, message count
- [ ] **SV-API-104**: Implement `POST /api/v1/projects/:projectId/agent/sessions/:sessionId/messages`
  - Requires authentication + session ownership
  - Request: `{ message: string, attachments?: string[] }`
  - Response: `202 Accepted` (agent processes asynchronously)
  - Queue message for agent processing
  - WebSocket delivers agent response when ready
- [ ] **SV-API-105**: Implement `GET /api/v1/projects/:projectId/agent/sessions/:sessionId/messages`
  - Requires authentication + session ownership
  - Response: paginated message history (cursor-based)
  - Each message: role (user/agent), content, timestamp, actions taken
  - Include: agent actions (spec created, edge added, etc.) as structured data
- [ ] **SV-API-106**: Implement `POST /api/v1/projects/:projectId/agent/sessions/:sessionId/terminate`
  - Requires authentication + session ownership
  - Gracefully terminates agent session
  - Kills Claude Code process if running
  - Response: `{ data: { status: 'terminated' } }`

### 10.2 Agent Status

- [ ] **SV-API-107**: Implement `GET /api/v1/projects/:projectId/agent/sessions/:sessionId/status`
  - Requires authentication + session ownership
  - Response: current agent status
  - Include: status (idle, thinking, acting, error), current action description,
    progress percentage (if available), estimated completion time
- [ ] **SV-API-108**: Implement `GET /api/v1/projects/:projectId/agent/status`
  - Requires authentication
  - Response: summary of all user's active agent sessions
  - Include: count active, count queued, server capacity info

### 10.3 Agent Actions

- [ ] **SV-API-109**: Implement `POST /api/v1/projects/:projectId/agent/sessions/:sessionId/approve`
  - Requires authentication + session ownership
  - Request: `{ actionId: string, approved: boolean, feedback?: string }`
  - Approve or reject a pending agent action (spec creation, edge change, etc.)
  - Response: action status update
- [ ] **SV-API-110**: Implement `GET /api/v1/projects/:projectId/agent/sessions/:sessionId/actions`
  - Requires authentication + session ownership
  - Response: list of actions taken by agent in this session
  - Include: actionId, type, status, target resource, timestamp, details

### 10.4 DTOs

- [ ] **SV-API-111**: Create `StartSessionDto` with validations
  - `@IsObject()` for context
  - `@IsString() @IsNotEmpty() @MaxLength(10000)` for message
  - Nested validation for context fields
- [ ] **SV-API-112**: Create `SendMessageDto` with validations
  - `@IsString() @IsNotEmpty() @MaxLength(10000)` for message
  - `@IsOptional() @IsArray() @IsString({ each: true })` for attachments
- [ ] **SV-API-113**: Create `AgentSessionResponseDto`
  - Session details, status, timestamps
- [ ] **SV-API-114**: Create `AgentMessageResponseDto`
  - Role, content, timestamp, structured actions

#### Design Decisions

> **Q**: Should agent sessions be scoped to a project, or can a session span multiple projects?
> **A**: Scoped to a single project. Each session has one `projectId`. Cross-project operations are not supported — they would require complex permission checking and complicate sandboxing.

> **Q**: Should agent message history be stored server-side permanently, or should there be a retention policy?
> **A**: Permanent storage with optional cleanup. Dialog history is stored in PostgreSQL indefinitely by default. Add a configurable retention policy (`DIALOG_RETENTION_DAYS=90`) that runs as a daily cron job. Default is 90 days; set to 0 for indefinite retention.

> **Q**: Should the agent session creation endpoint be synchronous or asynchronous?
> **A**: Asynchronous. `POST /sessions` immediately returns `{ data: { sessionId, status: "starting" } }` with 202 Accepted. The client subscribes to the WebSocket room `session:{sessionId}` and receives a `session:ready` event when initialized.

> **Q**: Should there be a limit on message length sent to the agent?
> **A**: Yes. Maximum 32,000 characters per user message (approximately 8,000 tokens). Messages exceeding the limit are rejected with a 400 error. Configurable via `MAX_AGENT_MESSAGE_LENGTH=32000`.

---

## 11. Generated UI Endpoints

### 11.1 Generated UI Management

- [ ] **SV-API-115**: Implement `GET /api/v1/projects/:projectId/gen-ui`
  - Requires authentication + project membership
  - Response: paginated list of generated UI projects
  - Include: id, name, type (readout/input/example), linkedSpecIds, status, createdAt
  - Filter by: user, type, linked spec
- [ ] **SV-API-116**: Implement `GET /api/v1/projects/:projectId/gen-ui/:genUiId`
  - Requires authentication + project membership
  - Response: full generated UI details
  - Include: source code path, build status, linked specs, parameters, preview URL
- [ ] **SV-API-117**: Implement `POST /api/v1/projects/:projectId/gen-ui/trigger`
  - Requires authentication + project membership
  - Request DTO: `TriggerGenUiDto`
    - `type`: enum ('readout', 'input', 'example'), required
    - `description`: string, what to generate, required
    - `linkedSpecIds`: UUID array, optional
    - `parameters`: object, optional
  - Response: `202 Accepted` with genUiId
  - Triggers agent to generate UI project
  - WebSocket delivers progress and completion
- [ ] **SV-API-118**: Implement `DELETE /api/v1/projects/:projectId/gen-ui/:genUiId`
  - Requires authentication + project membership
  - Removes generated UI files
  - Unlinks from associated specs
  - Return `204 No Content`
- [ ] **SV-API-119**: Implement `GET /api/v1/projects/:projectId/gen-ui/:genUiId/output`
  - Requires authentication + project membership
  - Response: the generated UI's built output URL (for iframe loading)
  - Include: entry point path, assets manifest
- [ ] **SV-API-120**: Create `TriggerGenUiDto` with validations
  - `@IsEnum(GenUiType)` for type
  - `@IsString() @IsNotEmpty() @MaxLength(2000)` for description
  - `@IsOptional() @IsArray() @IsUUID('4', { each: true })` for linkedSpecIds

---

## 12. Collaboration Endpoints

### 12.1 Sync Operations

- [ ] **SV-API-121**: Implement `GET /api/v1/projects/:projectId/collaboration/status`
  - Requires authentication + project membership
  - Response: sync status for the project
  - Include: local branch, remote branch, ahead/behind counts,
    last sync timestamp, pending changes count, conflict status
- [ ] **SV-API-122**: Implement `POST /api/v1/projects/:projectId/collaboration/pull`
  - Requires authentication + project membership
  - Pull latest changes from remote
  - Response: pull result with changed files summary
  - If conflicts: return conflict details for resolution
  - WebSocket notifies other users of new changes
- [ ] **SV-API-123**: Implement `POST /api/v1/projects/:projectId/collaboration/push`
  - Requires authentication + project membership
  - Push local commits to remote
  - Response: push result (success or failure details)
  - Return `409` if push is rejected (needs pull first)
- [ ] **SV-API-124**: Implement `GET /api/v1/projects/:projectId/collaboration/changes`
  - Requires authentication + project membership
  - Response: list of uncommitted local changes
  - Include: file path, change type (added, modified, deleted), spec affected
- [ ] **SV-API-125**: Implement `POST /api/v1/projects/:projectId/collaboration/commit`
  - Requires authentication + project membership
  - Request: `{ message: string, files?: string[] }` (specific files or all)
  - Creates a git commit of specified or all pending changes
  - Response: commit hash and summary

### 12.2 Conflict Resolution

- [ ] **SV-API-126**: Implement `GET /api/v1/projects/:projectId/collaboration/conflicts`
  - Requires authentication + project membership
  - Response: list of current merge conflicts
  - Each conflict: file path, spec affected, ours content, theirs content, base content
- [ ] **SV-API-127**: Implement `POST /api/v1/projects/:projectId/collaboration/conflicts/:conflictId/resolve`
  - Requires authentication + project membership
  - Request: `{ resolution: 'ours' | 'theirs' | 'custom', content?: string }`
  - Resolves a single conflict
  - Response: resolved file content
- [ ] **SV-API-128**: Implement `POST /api/v1/projects/:projectId/collaboration/conflicts/resolve-all`
  - Requires authentication + project membership
  - Request: `{ strategy: 'ours' | 'theirs' }`
  - Batch resolve all conflicts with same strategy
  - Response: resolution summary

### 12.3 Branch Operations

- [ ] **SV-API-129**: Implement `GET /api/v1/projects/:projectId/collaboration/branches`
  - Requires authentication + project membership
  - Response: list of branches with metadata
  - Include: name, isActive, lastCommit, ahead/behind main
- [ ] **SV-API-130**: Implement `POST /api/v1/projects/:projectId/collaboration/branches`
  - Requires authentication + project membership
  - Request: `{ name: string, fromBranch?: string }`
  - Create new branch from current or specified branch
  - Response: created branch details with `201 Created`
- [ ] **SV-API-131**: Implement `POST /api/v1/projects/:projectId/collaboration/branches/:branchName/switch`
  - Requires authentication + project membership
  - Switch to specified branch
  - Response: new branch state
  - Return `409` if there are uncommitted changes
- [ ] **SV-API-132**: Implement `POST /api/v1/projects/:projectId/collaboration/branches/:branchName/merge`
  - Requires authentication + project membership
  - Request: `{ targetBranch?: string }` (default: current branch)
  - Merge specified branch into target
  - Response: merge result (success, fast-forward, conflicts)
- [ ] **SV-API-133**: Implement `DELETE /api/v1/projects/:projectId/collaboration/branches/:branchName`
  - Requires authentication + project membership
  - Cannot delete the main/active branch
  - Return `204 No Content`

#### Design Decisions

> **Q**: Should collaboration endpoints be project-scoped or support file-level granularity?
> **A**: Project-scoped. `POST /projects/:id/sync/pull` and `POST /projects/:id/sync/push` operate on the entire project repository. Git operates at the repository level.

> **Q**: Should the pull endpoint automatically merge, or pull without merging?
> **A**: Auto-merge by default (`git pull --ff-only` first, then `git pull --no-edit` if fast-forward fails). The pull endpoint returns the merge result: `{ status: "fast-forward" | "merged" | "conflict", changes: [...] }`.

> **Q**: Should conflict resolution be handled entirely through the API?
> **A**: Via the API. The server detects conflicts and returns a structured conflict object: `{ file, ours, theirs, base }`. The client renders a diff/merge UI. The user sends the resolution back: `POST /projects/:id/sync/resolve { file, resolution }`.

> **Q**: Should branches be a first-class API concept?
> **A**: Yes. `GET /projects/:id/branches`, `POST /projects/:id/branches`, `DELETE /projects/:id/branches/:name`, `POST /projects/:id/branches/:name/merge`. Branches are essential for the PRD's experimentation model.

> **Q**: Should the API support pull request-like review workflows for branches?
> **A**: Direct merge for the initial release. The merge endpoint provides a diff preview (`POST /projects/:id/branches/:name/merge?dryRun=true`) so users can review changes before merging.

> **Q**: Should branch deletion be hard or soft?
> **A**: Hard delete. `DELETE /projects/:id/branches/:name` removes the branch ref immediately. Commits are still in the git reflog for 90 days. The branch can only be deleted if merged or if `?force=true` is passed.

---

## 13. Plans Endpoints

### 13.1 Plan Generation

- [ ] **SV-API-134**: Implement `POST /api/v1/projects/:projectId/plans/generate`
  - Requires authentication + project membership
  - Request DTO: `GeneratePlanDto`
    - `scope`: enum ('full', 'delta'), required
    - `specIds`: UUID array, optional (specific specs to include)
    - `description`: string, optional (additional instructions)
  - Response: `202 Accepted` with planId
  - Triggers agent to traverse graph and generate plan
  - WebSocket delivers progress updates
- [ ] **SV-API-135**: Implement `GET /api/v1/projects/:projectId/plans`
  - Requires authentication + project membership
  - Response: paginated list of generated plans
  - Include: id, scope, status, specCount, createdAt, approvedAt
- [ ] **SV-API-136**: Implement `GET /api/v1/projects/:projectId/plans/:planId`
  - Requires authentication + project membership
  - Response: full plan details
  - Include: plan directory structure, steps, linked specs, status
- [ ] **SV-API-137**: Implement `POST /api/v1/projects/:projectId/plans/:planId/approve`
  - Requires authentication + project membership (owner/admin)
  - Request: `{ approved: boolean, feedback?: string }`
  - Approve or reject the plan
  - Response: updated plan status
- [ ] **SV-API-138**: Implement `POST /api/v1/projects/:projectId/plans/:planId/execute`
  - Requires authentication + project membership (owner/admin)
  - Plan must be approved before execution
  - Response: `202 Accepted` with execution ID
  - Triggers agent to execute the plan (code generation)
  - WebSocket delivers execution progress
- [ ] **SV-API-139**: Implement `GET /api/v1/projects/:projectId/plans/:planId/execution`
  - Requires authentication + project membership
  - Response: execution status and results
  - Include: steps completed, files generated, test results, errors
- [ ] **SV-API-140**: Create `GeneratePlanDto` with validations
  - `@IsEnum(PlanScope)` for scope
  - `@IsOptional() @IsArray() @IsUUID('4', { each: true })` for specIds
  - `@IsOptional() @IsString() @MaxLength(2000)` for description

---

## 14. File Upload Endpoints

### 14.1 Media Uploads

- [ ] **SV-API-141**: Implement `POST /api/v1/projects/:projectId/uploads`
  - Requires authentication + project membership
  - Content-Type: `multipart/form-data`
  - Accept: images (png, jpg, gif, svg), documents (pdf, md, txt)
  - Max file size: 10MB per file
  - Max files per request: 5
  - Response: array of uploaded file metadata (id, url, filename, mimeType, size)
  - Store files in project directory under `media/`
- [ ] **SV-API-142**: Implement `GET /api/v1/projects/:projectId/uploads`
  - Requires authentication + project membership
  - Response: paginated list of uploaded files
  - Include: id, filename, mimeType, size, uploadedBy, createdAt
- [ ] **SV-API-143**: Implement `GET /api/v1/projects/:projectId/uploads/:fileId`
  - Requires authentication + project membership
  - Response: file content with appropriate Content-Type header
  - Support range requests for large files
- [ ] **SV-API-144**: Implement `DELETE /api/v1/projects/:projectId/uploads/:fileId`
  - Requires authentication + project membership
  - Check if file is linked to any spec before deleting
  - Warn if file is in use (require `?force=true` to delete linked files)
  - Return `204 No Content`

### 14.2 Upload Validation

- [ ] **SV-API-145**: Implement file type validation
  - Check MIME type against whitelist
  - Verify file extension matches MIME type
  - Scan for malicious content (basic magic bytes check)
- [ ] **SV-API-146**: Implement file size enforcement
  - Reject files exceeding 10MB
  - Return `413 Payload Too Large` with clear message
  - Include max allowed size in error response

#### Design Decisions

> **Q**: Should uploaded files be stored in the git repository or in a separate storage location?
> **A**: Separate storage. Store uploaded files on the server's local file system under a project-specific directory (`/data/uploads/{projectId}/`). Reference files in specs by their upload ID. This keeps the git repository lightweight. Uploads are backed up separately.

> **Q**: Should the upload endpoint return a URL that can be embedded in spec content?
> **A**: Return a URL. `POST /projects/:id/uploads` returns `{ data: { id, url: "/api/v1/uploads/{uploadId}", mimeType, size } }`. The user embeds the URL in spec markdown content.

> **Q**: What media types should be supported?
> **A**: Images (JPEG, PNG, GIF, WebP, SVG), PDFs, and plain text/markdown attachments. No video, audio, or office documents for the initial release. Total per-project storage quota: 1GB (configurable).

> **Q**: Should there be an image processing step on upload?
> **A**: Serve originals for the initial release. Add thumbnail generation as a phase 2 optimization. Keep the upload pipeline simple: validate MIME type, check file size (max 50MB), store to disk, return URL.

---

## 15. Health & Admin Endpoints

### 15.1 Health Checks

- [ ] **SV-API-147**: Implement `GET /api/v1/health` — liveness
  - Public (no auth)
  - Response: `{ status: 'ok', timestamp: string }`
- [ ] **SV-API-148**: Implement `GET /api/v1/health/ready` — readiness
  - Public (no auth)
  - Response: `{ status: 'ok' | 'degraded', checks: [...] }`
  - Checks: database, git, file system
- [ ] **SV-API-149**: Implement `GET /api/v1/health/detailed` — detailed (auth required)
  - Requires authentication + admin role
  - Response: comprehensive system health (see Architecture Plan)

### 15.2 Admin Endpoints

- [ ] **SV-API-150**: Implement `GET /api/v1/admin/users`
  - Requires authentication + admin role
  - Response: paginated list of all users with admin details
  - Include: login history, session count, last active
- [ ] **SV-API-151**: Implement `PATCH /api/v1/admin/users/:userId`
  - Requires authentication + admin role
  - Request: `{ role?: string, active?: boolean }`
  - Enable/disable accounts, change roles
- [ ] **SV-API-152**: Implement `GET /api/v1/admin/sessions`
  - Requires authentication + admin role
  - Response: all active agent sessions across all users
  - Include: resource usage, duration, user info
- [ ] **SV-API-153**: Implement `POST /api/v1/admin/sessions/:sessionId/terminate`
  - Requires authentication + admin role
  - Force-terminate an agent session
  - Response: termination confirmation
- [ ] **SV-API-154**: Implement `GET /api/v1/admin/audit-log`
  - Requires authentication + admin role
  - Response: paginated audit log entries
  - Query params: userId, action, dateRange, resource

---

## 16. API Documentation (Swagger)

### 16.1 Swagger Configuration

- [ ] **SV-API-155**: Configure SwaggerModule with complete API metadata
  - Title: "Knowledge Graph Agent System API"
  - Description: comprehensive API overview
  - Version: "1.0.0"
  - License and contact information
  - Server URLs for different environments
- [ ] **SV-API-156**: Configure Swagger authentication schemes
  - Cookie authentication scheme (http-only JWT)
  - Bearer token scheme (Authorization header fallback)
  - Document which endpoints require authentication
- [ ] **SV-API-157**: Add `@ApiTags()` to all controllers for grouping
  - Auth, Users, Projects, Documents, Specs, Graph, Agent, GenUI, Collaboration, Plans, Uploads, Health, Admin

### 16.2 DTO Documentation

- [ ] **SV-API-158**: Add `@ApiProperty()` decorators to all DTO fields
  - Include description, example value, required flag
  - Include type information for complex fields
  - Include enum values for enum fields
- [ ] **SV-API-159**: Add `@ApiResponse()` decorators to all controller methods
  - Document all possible response status codes
  - Include response DTO type for each status
  - Document error response shapes
- [ ] **SV-API-160**: Add `@ApiOperation()` to all controller methods
  - Summary: one-line description
  - Description: detailed explanation with examples
  - OperationId: unique identifier for code generation
- [ ] **SV-API-161**: Add `@ApiQuery()` for query parameter documentation
  - Document all query params with types and defaults
  - Include example values
  - Mark required vs optional

### 16.3 Documentation Export

- [ ] **SV-API-162**: Generate OpenAPI JSON spec on build
  - Export to `docs/openapi.json` for external tools
  - Validate spec completeness (all endpoints documented)
  - Version the spec file alongside code
- [ ] **SV-API-163**: Set up API documentation testing
  - Verify all endpoints have Swagger decorators
  - Verify all DTOs have `@ApiProperty()` on fields
  - Fail CI if documentation coverage drops below threshold

---

## 17. Rate Limiting Rules

### 17.1 Rate Limit Configuration

- [ ] **SV-API-164**: Configure global rate limiting
  - Default: 100 requests per 60 seconds per IP
  - Use `@nestjs/throttler` with global guard
  - Store counters in memory (upgrade path to Redis)
- [ ] **SV-API-165**: Configure per-endpoint rate limits
  - Auth endpoints (login, register): 10 per 60s (brute force prevention)
  - Password reset: 3 per 60s
  - Agent session start: 5 per 60s per user
  - Agent message send: 30 per 60s per user
  - File upload: 10 per 60s per user
  - Graph traversal: 20 per 60s per user
  - All other: inherit global limit
- [ ] **SV-API-166**: Implement rate limit response headers
  - `X-RateLimit-Limit` — max requests in window
  - `X-RateLimit-Remaining` — remaining requests in window
  - `X-RateLimit-Reset` — UTC epoch when window resets
  - `Retry-After` — seconds until next request allowed (on 429)
- [ ] **SV-API-167**: Create `@Throttle()` overrides per endpoint
  - Use NestJS `@Throttle()` decorator for per-route config
  - Use `@SkipThrottle()` for health check endpoints
- [ ] **SV-API-168**: Implement user-based rate limiting
  - After authentication, rate limit by userId (not just IP)
  - Higher limits for authenticated users vs anonymous
  - Admin users exempt from rate limiting

#### Design Decisions

> **Q**: Should rate limits be per-IP, per-user, or both?
> **A**: Both. Per-IP (100 req/min for unauthenticated, 300 req/min for authenticated) enforced at the middleware level. Per-user (300 req/min global, with stricter limits for expensive endpoints like agent sessions at 20 req/min) enforced at the guard level after authentication.

> **Q**: Should rate limit violations be logged as security events?
> **A**: Yes. Log every rate limit violation at `warn` level with: IP address, user ID (if authenticated), endpoint, current rate, limit. Repeated violations (>5 in a minute) log at `error` level.

> **Q**: Should certain endpoints have no rate limit?
> **A**: Health check endpoints (`/health/live`, `/health/ready`) and Prometheus metrics (`/metrics`) are exempt. Swagger docs are rate-limited at a generous 60 req/min per IP.

> **Q**: Should the rate limit store use in-memory storage only, or Redis?
> **A**: In-memory for the initial release. Rate limits resetting on server restart is acceptable. When horizontal scaling is added, swap to the Redis-backed throttler storage (drop-in replacement).

> **Q**: Should the API support field selection to reduce response size?
> **A**: No. Field selection adds serialization complexity. If a lighter representation is needed, create a dedicated list endpoint that returns a summary DTO. The `?expand=` parameter is the preferred way to control response size.

> **Q**: Should the API support conditional requests (`If-None-Match` / `ETag`)?
> **A**: Yes, for key read-heavy endpoints: `GET /graph/stats`, `GET /specs/:id`, `GET /projects/:id`. Use weak ETags based on the resource's `updatedAt` timestamp or content hash.

> **Q**: Should list endpoints support `?expand=relations` to eagerly load related data?
> **A**: Yes. `GET /specs/:id?expand=edges` returns the spec with its edges inline. Allowed expand values are documented per endpoint in Swagger. Default is no expansion.

> **Q**: What is the maximum batch size for bulk spec operations?
> **A**: 50 specs per batch. At 50 specs, the server can validate, write files, and commit within a reasonable HTTP timeout. Requests exceeding 50 items are rejected with a 400 error.

> **Q**: Should batch operations be all-or-nothing or best-effort?
> **A**: All-or-nothing within a single git commit. The batch validates all items first, then writes all files and commits. If any write fails, no commit is made and all changes are rolled back.

> **Q**: Should the text search endpoint use full-text search or simple `LIKE` matching?
> **A**: PostgreSQL full-text search with `tsvector` for database-backed resources. For knowledge graph content (specs stored as JSON files), use the in-memory index with simple text matching on spec titles and tags.

> **Q**: Should graph search integrate with the RAG layer for semantic search, or keep keyword search and semantic search as separate endpoints?
> **A**: Separate endpoints. `GET /graph/search?q=authentication` for keyword search. `POST /graph/semantic-search` for RAG-powered semantic search. Semantic search is a phase 2 feature; keyword search is MVP.

> **Q**: Should filters support negation?
> **A**: No negation in query parameters. Use explicit filter values instead: `?status=draft,active`. This keeps URL parsing simple.

> **Q**: Should the API support complex graph queries or keep queries simple?
> **A**: Keep the REST API simple. Complex graph traversals are the agent's job. The REST API provides building blocks: neighbors, shortest path, filter by edge type. The agent composes these into complex queries.

> **Q**: Should there be a GraphQL endpoint alongside REST?
> **A**: No GraphQL. The PRD specifies REST + WebSocket. GraphQL adds a second API paradigm and additional complexity. The REST API with `?expand=` and cursor-based pagination covers the client's needs.

---

## Summary

| Section | Task Range | Count |
|---------|-----------|-------|
| 1. API Conventions & Versioning | SV-API-001 – 004 | 4 |
| 2. Request & Response Standards | SV-API-005 – 012 | 8 |
| 3. Pagination, Filtering & Sorting | SV-API-013 – 022 | 10 |
| 4. Auth Endpoints | SV-API-023 – 033 | 11 |
| 5. Users Endpoints | SV-API-034 – 042 | 9 |
| 6. Projects Endpoints | SV-API-043 – 055 | 13 |
| 7. Spec Documents Endpoints | SV-API-056 – 064 | 9 |
| 8. Specs Endpoints | SV-API-065 – 085 | 21 |
| 9. Knowledge Graph Endpoints | SV-API-086 – 100 | 15 |
| 10. Agent Endpoints | SV-API-101 – 114 | 14 |
| 11. Generated UI Endpoints | SV-API-115 – 120 | 6 |
| 12. Collaboration Endpoints | SV-API-121 – 133 | 13 |
| 13. Plans Endpoints | SV-API-134 – 140 | 7 |
| 14. File Upload Endpoints | SV-API-141 – 146 | 6 |
| 15. Health & Admin Endpoints | SV-API-147 – 154 | 8 |
| 16. API Documentation (Swagger) | SV-API-155 – 163 | 9 |
| 17. Rate Limiting Rules | SV-API-164 – 168 | 5 |
| **TOTAL** | | **168** |
