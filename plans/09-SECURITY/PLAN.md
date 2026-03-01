# 09 — SECURITY PLAN

> **Purpose**: Define the complete security architecture for the Knowledge Graph
> Agent System including authentication hardening, authorization enforcement,
> encryption token system for private specs, input sanitization, XSS/CSRF
> prevention, iframe sandbox security, agent sandboxing, rate limiting, secret
> management, audit logging, and incident response procedures.
>
> **Phase**: 1 (Foundation baseline) + 2 (Permissions) + 4 (Token sharing) + 5 (Audit & hardening)
> **Dependencies**: `03-SERVER/03-AUTH-PLAN.md`, `04-KNOWLEDGE-GRAPH/01-ARCHITECTURE-PLAN.md`
> **Estimated tasks**: 135+

---

## Table of Contents

1. [Authentication Hardening](#1-authentication-hardening)
2. [JWT Token Management](#2-jwt-token-management)
3. [Authorization & Permissions](#3-authorization--permissions)
4. [Encryption Token System for Private Specs](#4-encryption-token-system-for-private-specs)
5. [Input Validation & Sanitization](#5-input-validation--sanitization)
6. [XSS Prevention](#6-xss-prevention)
7. [CSRF Protection](#7-csrf-protection)
8. [Rate Limiting](#8-rate-limiting)
9. [Iframe Sandbox Security](#9-iframe-sandbox-security)
10. [Agent Sandboxing](#10-agent-sandboxing)
11. [SQL Injection Prevention](#11-sql-injection-prevention)
12. [CORS Configuration](#12-cors-configuration)
13. [HTTPS & Transport Security](#13-https--transport-security)
14. [Security Headers](#14-security-headers)
15. [Secret Management](#15-secret-management)
16. [Dependency Security](#16-dependency-security)
17. [Audit Logging](#17-audit-logging)
18. [Security Testing](#18-security-testing)
19. [Incident Response](#19-incident-response)

---

## 1. Authentication Hardening

### 1.1 Password Hashing with bcrypt

- [ ] **SEC-AH-001**: Configure bcrypt cost factor (rounds)
  - Set minimum rounds to 12 for production (adaptive to hardware)
  - Set rounds to 4 for test environments (fast test execution)
  - Store round count in server configuration, not hardcoded
  - Document the rationale for chosen cost factor
- [ ] **SEC-AH-002**: Implement password hashing service
  - Create `PasswordService` in `server/src/common/services/`
  - `hash(plaintext: string): Promise<string>` — returns bcrypt hash
  - `verify(plaintext: string, hash: string): Promise<boolean>` — constant-time comparison
  - Never log or expose plaintext passwords at any level
- [ ] **SEC-AH-003**: Implement password complexity policy
  - Minimum 8 characters
  - Require at least one uppercase, one lowercase, one digit
  - Optional: recommend (but not require) special characters
  - Validate on both client and server side
  - Return specific validation errors (too short, missing uppercase, etc.)
- [ ] **SEC-AH-004**: Implement password breach detection (optional enhancement)
  - Check passwords against known breach lists (HaveIBeenPwned k-anonymity API)
  - Warn users if their password appears in breaches
  - Do not block registration, only warn
- [ ] **SEC-AH-005**: Prevent user enumeration on login
  - Return identical error messages for "user not found" and "wrong password"
  - Use constant-time comparison even when user does not exist (hash a dummy)
  - Login response: `{ error: "Invalid credentials" }` — no distinction
- [ ] **SEC-AH-006**: Prevent user enumeration on registration
  - If email/username already exists, do not reveal this in the response
  - Return generic "registration failed" or silently send a "already registered" email
  - Consider rate limiting registration attempts per IP
- [ ] **SEC-AH-007**: Implement account lockout after failed attempts
  - Lock account after 5 consecutive failed login attempts
  - Lockout duration: 15 minutes (configurable)
  - Track failed attempts in database (user_id, attempt_count, locked_until)
  - Reset counter on successful login
  - Notify user via response that account is temporarily locked

### 1.2 Password Management

- [ ] **SEC-AH-008**: Implement password change endpoint
  - Require current password verification before accepting new password
  - Invalidate all existing sessions/tokens after password change
  - Apply same complexity rules to new password
  - Prevent reuse of the last 3 passwords (store hashed history)
- [ ] **SEC-AH-009**: Implement password reset flow
  - Generate cryptographically random reset token (32 bytes, hex-encoded)
  - Store hashed reset token in database with expiration (1 hour)
  - Send reset link via email (token in URL)
  - Reset endpoint validates token, accepts new password, invalidates token
  - Rate limit reset requests per email (1 per 5 minutes)
- [ ] **SEC-AH-010**: Implement session invalidation on password change
  - When password changes, increment a `tokenVersion` column on the user record
  - All existing JWTs with older `tokenVersion` become invalid on refresh
  - Force re-login on all devices

---

## 2. JWT Token Management

### 2.1 Token Issuance

- [ ] **SEC-JWT-001**: Configure JWT signing algorithm
  - Use RS256 (RSA + SHA-256) for production (asymmetric, allows public verification)
  - Generate RSA key pair (2048-bit minimum, 4096-bit recommended)
  - Store private key securely (environment variable or vault)
  - Alternative: HS256 for simpler deployments (symmetric, shared secret)
  - Document the chosen algorithm and rationale
- [ ] **SEC-JWT-002**: Define access token payload
  - `sub`: user ID (UUID)
  - `iat`: issued-at timestamp
  - `exp`: expiration timestamp (15 minutes)
  - `tokenVersion`: matches user's current token version
  - `role`: user's system role (admin, user)
  - Do NOT include sensitive data (email, password hash, etc.)
- [ ] **SEC-JWT-003**: Define refresh token strategy
  - Refresh token: opaque random string (64 bytes, hex-encoded)
  - Store hashed refresh token in database with user_id and expiration
  - Refresh token lifetime: 7 days (configurable)
  - Each refresh rotates the token (old token invalidated, new token issued)
  - Store refresh token family for detecting token reuse attacks
- [ ] **SEC-JWT-004**: Implement access token issuance
  - Sign JWT with private key / secret
  - Set `exp` claim to 15 minutes from now
  - Return in HTTP-only cookie (not in response body)
- [ ] **SEC-JWT-005**: Implement refresh token issuance
  - Generate cryptographically random token
  - Hash before storing in database
  - Set as HTTP-only cookie with longer expiration path

### 2.2 Token Storage (HTTP-Only Cookies)

- [ ] **SEC-JWT-006**: Configure access token cookie
  - `httpOnly: true` — prevents JavaScript access
  - `secure: true` — HTTPS only (skip in development)
  - `sameSite: 'strict'` — prevents CSRF via cross-origin requests
  - `path: '/api'` — only sent to API routes
  - Name: `__Host-access_token` (with `__Host-` prefix for extra security)
  - Max-Age: 900 (15 minutes)
- [ ] **SEC-JWT-007**: Configure refresh token cookie
  - `httpOnly: true`
  - `secure: true`
  - `sameSite: 'strict'`
  - `path: '/api/auth/refresh'` — only sent to refresh endpoint
  - Name: `__Host-refresh_token`
  - Max-Age: 604800 (7 days)
- [ ] **SEC-JWT-008**: Implement token extraction middleware
  - Extract access token from `__Host-access_token` cookie
  - If absent, return 401 Unauthorized
  - If present, verify signature, expiration, and token version
  - Attach decoded payload to request object

### 2.3 Token Rotation & Revocation

- [ ] **SEC-JWT-009**: Implement token refresh endpoint (`POST /api/auth/refresh`)
  - Accept refresh token from cookie
  - Validate: exists in database, not expired, hash matches
  - Issue new access token and new refresh token
  - Invalidate old refresh token in database
  - Detect reuse: if an already-invalidated refresh token is presented, revoke entire family
- [ ] **SEC-JWT-010**: Implement token revocation on logout (`POST /api/auth/logout`)
  - Delete refresh token from database
  - Clear both cookies (set Max-Age to 0)
  - Optionally add access token `jti` to a short-lived deny list (Redis/memory)
- [ ] **SEC-JWT-011**: Implement "logout all devices" functionality
  - Increment user's `tokenVersion` in database
  - Delete all refresh tokens for the user
  - All access tokens become invalid on next verification
- [ ] **SEC-JWT-012**: Implement JWT secret rotation procedure
  - Support multiple signing keys (identified by `kid` header)
  - New tokens signed with new key; old tokens verified against old key
  - Grace period: old key valid for the access token lifetime after rotation
  - Document the rotation procedure as a runbook

---

## 3. Authorization & Permissions

### 3.1 Spec-Level Permission Model

The PRD specifies three permission levels: **full access**, **summary access**, and there is never "no access" (anti-siloing principle).

- [ ] **SEC-AZ-001**: Define the permission enum in shared types
  - `SpecPermission.FULL` — read full content, edit, manage permissions
  - `SpecPermission.SUMMARY` — read title, summary, tags, and graph edges only
  - No `NONE` level — every authenticated user has at least `SUMMARY`
  - Export from `@kg/shared`
- [ ] **SEC-AZ-002**: Define the permission storage schema
  - Table: `spec_permissions` (spec_id, user_id, permission_level, granted_by, granted_at)
  - Default permission for all users: `SUMMARY`
  - Explicit `FULL` grants stored per spec per user
  - Creator of a spec automatically gets `FULL`
  - Project owner automatically gets `FULL` on all specs in the project
- [ ] **SEC-AZ-003**: Implement permission checking guard (`SpecPermissionGuard`)
  - NestJS guard that reads spec_id from route params
  - Looks up the requesting user's permission level for that spec
  - For `FULL` access endpoints (edit, delete, manage): require `FULL`
  - For `SUMMARY` access endpoints (read summary, graph view): allow `SUMMARY`
  - For read full content: require `FULL`
  - Return 403 Forbidden with message "Insufficient permission" if denied
- [ ] **SEC-AZ-004**: Implement permission-aware spec serialization
  - When returning spec data, check user's permission level
  - `FULL`: return entire spec (content, metadata, everything)
  - `SUMMARY`: return only title, summary field, tags, status, graph edges
  - Implement as a NestJS interceptor or serializer
  - Ensure content.md is never leaked to SUMMARY users
- [ ] **SEC-AZ-005**: Implement permission management endpoints
  - `POST /api/specs/:id/permissions` — grant permission to a user
  - `DELETE /api/specs/:id/permissions/:userId` — revoke a user's elevated permission
  - `GET /api/specs/:id/permissions` — list all permission grants for a spec
  - Only `FULL` access holders can manage permissions
  - Cannot revoke the creator's FULL access

### 3.2 Project-Level Roles

- [ ] **SEC-AZ-006**: Define project role enum
  - `ProjectRole.OWNER` — full control over project, all specs, all users
  - `ProjectRole.EDITOR` — create/edit specs, manage own spec permissions
  - `ProjectRole.VIEWER` — summary access to all specs, full access only if explicitly granted
- [ ] **SEC-AZ-007**: Implement project role assignment
  - Table: `project_members` (project_id, user_id, role, joined_at)
  - Owner is set at project creation
  - Owners can assign/change roles of other members
  - Editors can invite viewers
- [ ] **SEC-AZ-008**: Implement project role guard (`ProjectRoleGuard`)
  - NestJS guard checking the user's role in the project
  - Configurable: `@RequireRole(ProjectRole.EDITOR)` decorator
  - Return 403 if role insufficient
- [ ] **SEC-AZ-009**: Implement permission inheritance from project roles
  - `OWNER` → automatic `FULL` on all specs
  - `EDITOR` → automatic `FULL` on specs they created, `SUMMARY` on others (unless explicitly granted)
  - `VIEWER` → `SUMMARY` on all specs (unless explicitly granted `FULL`)
  - Spec-level grants override project-level defaults

### 3.3 System-Level Roles

- [ ] **SEC-AZ-010**: Define system role enum
  - `SystemRole.ADMIN` — can manage all users, view all projects
  - `SystemRole.USER` — standard user
- [ ] **SEC-AZ-011**: Implement system admin guard
  - `@RequireSystemRole(SystemRole.ADMIN)` decorator
  - Only admins can access user management endpoints
  - Only admins can view system-wide audit logs
- [ ] **SEC-AZ-012**: Implement first-user-is-admin seeding
  - If no users exist, first registered user becomes admin
  - Subsequent users are standard users
  - Admin can promote other users to admin

---

## 4. Encryption Token System for Private Specs

### 4.1 Encryption Architecture

- [ ] **SEC-ET-001**: Define encryption token concept
  - An encryption token is a symmetric key (AES-256) used to encrypt a spec's content
  - Token is generated server-side when a spec is marked as "private"
  - Token is stored in the database (NOT in the git repository)
  - Spec content in git is stored encrypted (ciphertext)
  - Users with the token can decrypt; others see only the summary
- [ ] **SEC-ET-002**: Choose encryption algorithm
  - AES-256-GCM (authenticated encryption with associated data)
  - GCM provides both confidentiality and integrity
  - Initialization vector (IV): 12 bytes, randomly generated per encryption operation
  - Authentication tag: 16 bytes
  - Encrypted format: `{iv}:{authTag}:{ciphertext}` (base64-encoded)
- [ ] **SEC-ET-003**: Implement encryption service
  - Create `EncryptionService` in `server/src/common/services/`
  - `generateToken(): string` — generate 256-bit random key (hex-encoded)
  - `encrypt(plaintext: string, token: string): string` — AES-256-GCM encrypt
  - `decrypt(ciphertext: string, token: string): string` — AES-256-GCM decrypt
  - Use Node.js `crypto` module (available in Bun)
  - All operations are synchronous (crypto is CPU-bound, not I/O)

### 4.2 Token Storage

- [ ] **SEC-ET-004**: Define encryption token database schema
  - Table: `encryption_tokens`
  - Columns: `id`, `spec_id`, `token_hash` (bcrypt hash of the token), `token_encrypted` (server master key encrypted), `created_by`, `created_at`, `revoked_at`, `last_used_at`
  - The actual token is encrypted with a server master key before storage
  - The master key is in an environment variable (or vault)
- [ ] **SEC-ET-005**: Implement token generation flow
  - User marks a spec as "private" → server generates AES-256 key
  - Server encrypts the spec's `content.md` with the key
  - Server stores the encrypted content back into the knowledge graph (git)
  - Server stores the token (encrypted with master key) in the database
  - Server returns the raw token to the user (one-time display)
  - User is responsible for saving/sharing the token
- [ ] **SEC-ET-006**: Implement master key for token-at-rest protection
  - Server master key: 256-bit key from environment variable `ENCRYPTION_MASTER_KEY`
  - Used to encrypt/decrypt individual spec tokens in the database
  - If master key is rotated, all stored tokens must be re-encrypted
  - Document master key rotation procedure

### 4.3 Token Sharing Workflow

- [ ] **SEC-ET-007**: Implement token sharing endpoint
  - `POST /api/specs/:id/share-token` — share the encryption token with another user
  - Body: `{ userId: string }`
  - Creates a `token_grants` record: (token_id, user_id, granted_by, granted_at)
  - The granted user can now decrypt the spec content via their session
- [ ] **SEC-ET-008**: Implement server-side token resolution for granted users
  - When a granted user requests a private spec, the server:
    1. Checks `token_grants` for the user + spec combination
    2. Retrieves the encrypted token from `encryption_tokens`
    3. Decrypts the token with the master key
    4. Decrypts the spec content with the token
    5. Returns the plaintext content to the user
  - The granted user never sees the raw encryption token
- [ ] **SEC-ET-009**: Implement manual token entry flow
  - Alternative sharing: user A gives user B the raw token string
  - User B enters the token via `POST /api/specs/:id/decrypt` with `{ token: string }`
  - Server verifies the token by attempting decryption
  - If successful, optionally create a `token_grants` record for future access
- [ ] **SEC-ET-010**: Implement token display/copy UI endpoint
  - `GET /api/specs/:id/encryption-token` — returns the raw token (only to spec creator/owner)
  - Rate limited: max 3 requests per hour
  - Requires re-authentication (password confirmation)

### 4.4 Token Revocation

- [ ] **SEC-ET-011**: Implement token revocation
  - `POST /api/specs/:id/revoke-token` — revokes the current encryption token
  - Sets `revoked_at` on the token record
  - Generates a new token and re-encrypts the spec content
  - All existing `token_grants` for the old token are invalidated
  - Users who had access must be re-granted with the new token
- [ ] **SEC-ET-012**: Implement selective grant revocation
  - `DELETE /api/specs/:id/token-grants/:userId` — revoke a specific user's access
  - Removes the `token_grants` record
  - User can no longer decrypt via server-side resolution
  - Does not affect other granted users
- [ ] **SEC-ET-013**: Implement token rotation without content re-encryption
  - Optimization: re-encrypt the content with new token, update database
  - Transparent to users who access via server-side grants
  - Users with the raw old token must obtain the new one

### 4.5 Encrypted Content at Rest

- [ ] **SEC-ET-014**: Implement spec encryption on write
  - When saving a private spec's content to git, encrypt `content.md`
  - The encrypted file is committed to git (binary-safe base64 encoding)
  - `spec.json` and `metadata.json` remain unencrypted (contain summary data)
  - Git diffs of encrypted content will be opaque (expected)
- [ ] **SEC-ET-015**: Implement spec decryption on read
  - When loading a private spec, detect encrypted content (prefix marker: `ENC:`)
  - If user has access (grant or raw token), decrypt before returning
  - If user does not have access, return summary only
  - Cache decrypted content in memory for the duration of the request only
- [ ] **SEC-ET-016**: Implement encryption indicator in spec metadata
  - Add `encrypted: boolean` field to `spec.json`
  - Add `encryptionVersion: number` for future algorithm upgrades
  - These fields are readable by all users (tells them the spec is private)

### 4.6 Access Tracking

- [ ] **SEC-ET-017**: Implement encryption access audit log
  - Log every decryption event: user_id, spec_id, timestamp, method (grant/manual-token)
  - Log every token share, revocation, and rotation event
  - Store in `audit_logs` table with `action_type = 'encryption'`
  - Queryable by spec owners and system admins

---

## 5. Input Validation & Sanitization

### 5.1 API Input Validation

- [ ] **SEC-IV-001**: Implement global validation pipe
  - Use NestJS `ValidationPipe` with `class-validator` and `class-transformer`
  - Enable `whitelist: true` — strip properties not in DTO
  - Enable `forbidNonWhitelisted: true` — reject requests with unknown properties
  - Enable `transform: true` — auto-transform payloads to DTO instances
  - Apply globally in `main.ts`
- [ ] **SEC-IV-002**: Define validation decorators for all DTOs
  - Every DTO field must have at least one validation decorator
  - String fields: `@IsString()`, `@MaxLength()`, `@MinLength()`
  - Number fields: `@IsNumber()`, `@Min()`, `@Max()`
  - UUID fields: `@IsUUID('4')`
  - Email fields: `@IsEmail()`
  - Enum fields: `@IsEnum()`
  - Nested objects: `@ValidateNested()` + `@Type()`
- [ ] **SEC-IV-003**: Implement max payload size limits
  - Express/Fastify body parser limit: 1MB for JSON, 5MB for multipart
  - Spec content: max 500KB per spec
  - Document metadata: max 50KB
  - Configure in NestJS bootstrap
- [ ] **SEC-IV-004**: Validate all route parameters
  - Spec IDs: must be valid UUIDs
  - Document IDs: must be valid UUIDs
  - Edge IDs: must be valid UUIDs
  - User IDs: must be valid UUIDs
  - Pagination params: `page` >= 1, `limit` between 1 and 100
- [ ] **SEC-IV-005**: Validate all query parameters
  - Search queries: max 200 characters, no control characters
  - Filter values: must match allowed enum values
  - Sort fields: must be in an allowed list (prevent arbitrary column names)
  - Date ranges: must be valid ISO 8601 dates

### 5.2 Content Sanitization

- [ ] **SEC-IV-006**: Implement HTML sanitization for spec content
  - Use `DOMPurify` (server-side via `jsdom`) or `sanitize-html`
  - Allow safe Markdown-generated HTML tags: `p`, `h1`-`h6`, `ul`, `ol`, `li`, `code`, `pre`, `blockquote`, `a`, `em`, `strong`, `img`
  - Strip all `on*` event handlers
  - Strip `<script>`, `<style>`, `<iframe>`, `<object>`, `<embed>` tags
  - Strip `javascript:` URLs from `href` and `src` attributes
- [ ] **SEC-IV-007**: Implement Markdown sanitization
  - Sanitize raw Markdown before rendering to HTML
  - Strip HTML tags embedded in Markdown (or allow a safe subset)
  - Prevent Markdown-based XSS (e.g., `[click](javascript:alert(1))`)
  - Use a Markdown renderer with built-in sanitization
- [ ] **SEC-IV-008**: Sanitize spec titles and tag names
  - Strip HTML from titles
  - Limit title length to 200 characters
  - Tags: alphanumeric + hyphens only, max 50 characters per tag
  - Max 20 tags per spec
- [ ] **SEC-IV-009**: Sanitize user-provided file names
  - Spec content file names: alphanumeric, hyphens, underscores only
  - No path traversal characters (`..`, `/`, `\`)
  - Max 100 characters
  - Reject null bytes and control characters

---

## 6. XSS Prevention

### 6.1 Output Encoding

- [ ] **SEC-XSS-001**: Implement context-aware output encoding
  - HTML context: encode `<`, `>`, `&`, `"`, `'`
  - JavaScript context: JSON.stringify for data embedded in scripts
  - URL context: `encodeURIComponent` for user data in URLs
  - CSS context: escape backslash and special characters
- [ ] **SEC-XSS-002**: Configure React's built-in XSS protection
  - React auto-escapes JSX expressions — ensure no `dangerouslySetInnerHTML` usage without sanitization
  - Audit all uses of `dangerouslySetInnerHTML` in the codebase
  - Every `dangerouslySetInnerHTML` must pass through DOMPurify first
  - Create a wrapper component: `<SanitizedHTML content={...} />`
- [ ] **SEC-XSS-003**: Implement safe Markdown rendering component
  - Use a Markdown library with built-in XSS protection (e.g., `marked` + `DOMPurify`, or `react-markdown`)
  - Configure to disable raw HTML in Markdown
  - Test with XSS payloads in Markdown content

### 6.2 Generated UI XSS Prevention

- [ ] **SEC-XSS-004**: Sanitize agent-generated HTML before rendering
  - All generative UI content passes through server-side sanitization before storage
  - Even though it's in an iframe, sanitize to prevent abuse within the sandbox
  - Strip script injections, event handlers, and dangerous attributes
- [ ] **SEC-XSS-005**: Implement Content Security Policy for generated UI iframes
  - Separate CSP for iframe content (see Section 9)
  - No `unsafe-inline` for scripts
  - No `unsafe-eval`
  - Restrict `connect-src` to only the parent app's API

### 6.3 Stored XSS Prevention

- [ ] **SEC-XSS-006**: Sanitize all user input before database storage
  - Spec content, titles, descriptions, comments, dialog messages
  - Apply sanitization on write (defense in depth — also sanitize on read/render)
- [ ] **SEC-XSS-007**: Sanitize search results and autocomplete suggestions
  - User-provided search terms reflected in results must be escaped
  - Autocomplete suggestions derived from spec titles must be escaped
- [ ] **SEC-XSS-008**: Implement CSP nonce for inline scripts
  - Generate a random nonce per request
  - Include nonce in CSP header
  - All allowed inline scripts must include the nonce

---

## 7. CSRF Protection

- [ ] **SEC-CSRF-001**: Implement SameSite cookie strategy (primary defense)
  - All authentication cookies: `SameSite=Strict`
  - This prevents cookies from being sent on cross-origin requests
  - Sufficient for modern browsers (Chrome, Firefox, Edge, Safari)
- [ ] **SEC-CSRF-002**: Implement CSRF token as defense-in-depth
  - Generate CSRF token on login, store in a separate non-HttpOnly cookie
  - Client reads the CSRF token from the cookie and sends it in `X-CSRF-Token` header
  - Server validates that the header matches the cookie value
  - Double-submit cookie pattern (no server-side state needed)
- [ ] **SEC-CSRF-003**: Apply CSRF protection to state-changing endpoints
  - All `POST`, `PUT`, `PATCH`, `DELETE` endpoints require CSRF token
  - `GET`, `HEAD`, `OPTIONS` endpoints are exempt (must be idempotent)
  - Implement as NestJS middleware or guard
- [ ] **SEC-CSRF-004**: Implement CSRF token rotation
  - Rotate CSRF token on every state-changing request (or on session refresh)
  - Invalidate old tokens after rotation
  - Handle race conditions: accept the current and previous token
- [ ] **SEC-CSRF-005**: Handle CSRF for WebSocket connections
  - Validate JWT cookie during WebSocket handshake
  - WebSocket messages do not need CSRF tokens (same-origin verified at connection time)
  - Verify `Origin` header during WebSocket upgrade

---

## 8. Rate Limiting

### 8.1 Global Rate Limiting

- [ ] **SEC-RL-001**: Implement global API rate limiter
  - Use `@nestjs/throttler` package
  - Default: 100 requests per minute per IP
  - Return 429 Too Many Requests with `Retry-After` header
  - Apply globally via NestJS module
- [ ] **SEC-RL-002**: Configure rate limit storage
  - Use in-memory store for single-server deployments
  - Use Redis store for multi-server deployments
  - Store: IP address → request count + window timestamp
- [ ] **SEC-RL-003**: Implement rate limit headers in responses
  - `X-RateLimit-Limit`: max requests per window
  - `X-RateLimit-Remaining`: requests remaining in current window
  - `X-RateLimit-Reset`: timestamp when the window resets

### 8.2 Endpoint-Specific Rate Limits

- [ ] **SEC-RL-004**: Rate limit authentication endpoints
  - `POST /api/auth/login`: 5 attempts per 15 minutes per IP
  - `POST /api/auth/register`: 3 attempts per hour per IP
  - `POST /api/auth/reset-password`: 3 attempts per hour per email
  - `POST /api/auth/refresh`: 10 per minute per user
- [ ] **SEC-RL-005**: Rate limit agent session endpoints
  - Agent creation: 5 per hour per user
  - Agent message send: 30 per minute per session
  - Agent long-running operations: 2 concurrent per user
- [ ] **SEC-RL-006**: Rate limit spec operations
  - Spec creation: 20 per hour per user
  - Spec updates: 60 per hour per spec per user
  - Search: 30 per minute per user
- [ ] **SEC-RL-007**: Rate limit encryption token endpoints
  - Token display: 3 per hour per user
  - Token sharing: 10 per hour per user
  - Token revocation: 5 per hour per user

### 8.3 Abuse Prevention

- [ ] **SEC-RL-008**: Implement progressive rate limiting
  - First violation: 429 with 1-minute cooldown
  - Repeated violations (5+ in an hour): 15-minute cooldown
  - Persistent abuse (20+ violations in a day): 1-hour cooldown + alert
- [ ] **SEC-RL-009**: Implement request size rate limiting
  - Track cumulative request body size per IP per window
  - Limit: 50MB per 10 minutes per IP
  - Prevents large payload flooding

---

## 9. Iframe Sandbox Security

### 9.1 Sandbox Attributes

- [ ] **SEC-IF-001**: Configure sandbox attribute for generated UI iframes
  - `sandbox="allow-scripts"` — allow JavaScript execution within the iframe
  - Do NOT include `allow-same-origin` — prevents access to parent's cookies/storage
  - Do NOT include `allow-top-navigation` — prevents redirect attacks
  - Do NOT include `allow-forms` unless explicitly needed (evaluate per use case)
  - Do NOT include `allow-popups` unless explicitly needed
- [ ] **SEC-IF-002**: Serve generated UI from a separate origin
  - Use a different subdomain: `gen-ui.example.com` vs `app.example.com`
  - Or use a completely separate domain for generated content
  - This provides origin-level isolation in addition to sandbox attributes
  - Configure CORS on the API to allow requests from the gen-ui origin
- [ ] **SEC-IF-003**: Implement iframe `allow` attribute for feature policy
  - Deny microphone, camera, geolocation, payment by default
  - `allow="accelerometer 'none'; camera 'none'; geolocation 'none'; microphone 'none'; payment 'none'"`
  - Only grant features explicitly needed by generated UIs

### 9.2 Content Security Policy for Iframes

- [ ] **SEC-IF-004**: Define CSP for generated UI content
  - `default-src 'self'` — restrict all sources to same origin
  - `script-src 'self'` — only allow scripts from the gen-ui origin (no inline)
  - `style-src 'self' 'unsafe-inline'` — allow inline styles for generated UI
  - `connect-src https://api.example.com` — only allow API calls to the main server
  - `img-src 'self' data: https:` — allow images from self, data URIs, and HTTPS
  - `frame-ancestors 'self' https://app.example.com` — only allow embedding by the main app
- [ ] **SEC-IF-005**: Deliver CSP via HTTP header on gen-ui responses
  - The server that serves generated UI files must set the CSP header
  - Not via `<meta>` tag (can be overridden by injected content)
  - CSP report-uri for violation monitoring

### 9.3 PostMessage Communication

- [ ] **SEC-IF-006**: Implement postMessage validation in parent app
  - Validate `event.origin` matches the expected gen-ui origin
  - Validate `event.data` against a strict message schema
  - Reject messages with unknown types
  - Never `eval()` or `innerHTML` message content
- [ ] **SEC-IF-007**: Define postMessage protocol schema
  - Message types: `resize`, `navigate`, `data-request`, `data-response`, `error`
  - Each type has a defined payload schema
  - Include a `messageId` for request-response correlation
  - Include a `version` field for protocol versioning
- [ ] **SEC-IF-008**: Implement postMessage validation in generated UI
  - Generated UI code validates `event.origin` matches the parent app
  - Only process messages from the parent origin
  - Sanitize any data received from the parent before using in DOM
- [ ] **SEC-IF-009**: Implement postMessage rate limiting
  - Parent limits: max 100 messages per second per iframe
  - Discard excess messages and log a warning
  - Prevents denial-of-service via message flooding

---

## 10. Agent Sandboxing

### 10.1 Process Isolation

- [ ] **SEC-AG-001**: Run Claude Code in a separate OS process
  - Use `child_process.spawn` (or Bun equivalent) for process isolation
  - Each agent session spawns a new process
  - Process inherits minimal environment variables (only what's needed)
  - Set process resource limits (memory, CPU time)
- [ ] **SEC-AG-002**: Implement file system restrictions for agent processes
  - Agents can only read/write within the project's knowledge-graph directory
  - Agents can only read/write within the generated UI directory for the user/project
  - No access to server source code, config files, or other users' data
  - Implement via file system permissions or a chroot-like environment
- [ ] **SEC-AG-003**: Implement network restrictions for agent processes
  - Agents should only be able to reach the local MCP server (localhost)
  - No outbound internet access from agent processes
  - Use iptables/firewall rules or network namespaces if running in Docker
  - MCP servers act as controlled gateways for agent actions
- [ ] **SEC-AG-004**: Implement agent process timeout
  - Maximum execution time per agent invocation: 5 minutes (configurable)
  - Kill the process if it exceeds the timeout
  - Return a timeout error to the user
  - Log the timeout event for monitoring

### 10.2 Agent Permission Boundaries

- [ ] **SEC-AG-005**: Implement MCP tool permission scoping
  - Each MCP tool call is validated against the invoking user's permissions
  - Agent cannot read specs the user doesn't have `FULL` access to
  - Agent cannot write to specs the user doesn't have `FULL` access to
  - Agent cannot modify other users' data
- [ ] **SEC-AG-006**: Implement agent action audit trail
  - Log every MCP tool call: user_id, session_id, tool_name, parameters, result_status, timestamp
  - Log every file read/write by the agent process
  - Store in `audit_logs` with `action_type = 'agent'`
- [ ] **SEC-AG-007**: Implement agent output sanitization
  - Sanitize all text output from agent before displaying to user
  - Prevent agent from injecting HTML/script into the chat UI
  - Validate structured output (JSON) against expected schemas
- [ ] **SEC-AG-008**: Implement agent resource consumption tracking
  - Track per-session: CPU time, memory peak, API tokens consumed
  - Set per-user quotas for agent usage (configurable)
  - Alert when a session exceeds expected resource consumption

### 10.3 Generated Code Security

- [ ] **SEC-AG-009**: Scan agent-generated code for security issues
  - Run a static analysis pass on generated code before committing
  - Check for: hardcoded secrets, unsafe eval, SQL injection patterns, path traversal
  - Flag findings for human review
  - Configurable: block or warn on findings
- [ ] **SEC-AG-010**: Restrict generated code dependencies
  - Agent-generated `package.json` dependencies must be from an allowed list or reviewed
  - Prevent installation of arbitrary npm packages without user approval
  - Run `npm audit` on generated dependency lists
- [ ] **SEC-AG-011**: Validate generated code build output
  - Generated code must pass linting and type checking before acceptance
  - Test suite must pass before code is committed
  - Failed validation triggers agent re-attempt or human review

---

## 11. SQL Injection Prevention

- [ ] **SEC-SQL-001**: Enforce parameterized queries throughout the codebase
  - All database queries must use parameterized statements
  - No string concatenation or template literals for SQL construction
  - Use TypeORM/Prisma query builders which parameterize automatically
  - Create a linting rule to detect raw SQL string concatenation
- [ ] **SEC-SQL-002**: Implement query builder validation
  - If raw queries are ever needed, wrap them in a `SafeQuery` utility
  - `SafeQuery` enforces parameterized placeholders
  - Reject queries that appear to contain unsanitized user input
- [ ] **SEC-SQL-003**: Validate dynamic column/table names
  - If queries allow dynamic column selection (sorting, filtering), validate against allowlist
  - Never pass user input directly as column or table identifiers
  - Use an enum or constant map: `{ 'title': 'specs.title', 'created': 'specs.created_at' }`
- [ ] **SEC-SQL-004**: Implement database user privilege separation
  - Application database user should have minimal privileges
  - Only `SELECT`, `INSERT`, `UPDATE`, `DELETE` on application tables
  - No `CREATE`, `DROP`, `ALTER` privileges for the application user
  - Migration user (separate credentials) has schema modification privileges

---

## 12. CORS Configuration

- [ ] **SEC-CORS-001**: Implement strict CORS configuration
  - Allow only the specific frontend origin: `https://app.example.com`
  - Allow gen-ui origin: `https://gen-ui.example.com`
  - In development: allow `http://localhost:5173` (Vite dev server)
  - Use NestJS `@nestjs/cors` or Express CORS middleware
- [ ] **SEC-CORS-002**: Configure CORS methods and headers
  - Allowed methods: `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `OPTIONS`
  - Allowed headers: `Content-Type`, `Authorization`, `X-CSRF-Token`, `X-Request-ID`
  - Exposed headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`
  - Max age: 3600 (cache preflight for 1 hour)
- [ ] **SEC-CORS-003**: Block CORS for non-whitelisted origins
  - Return no CORS headers for requests from unlisted origins
  - Log rejected CORS requests for monitoring
- [ ] **SEC-CORS-004**: Implement origin validation for WebSocket connections
  - Check `Origin` header during WebSocket upgrade handshake
  - Reject connections from non-whitelisted origins
  - Log rejected WebSocket connection attempts

---

## 13. HTTPS & Transport Security

- [ ] **SEC-TLS-001**: Enforce HTTPS in production
  - Redirect all HTTP requests to HTTPS (301 redirect)
  - Configure at reverse proxy level (nginx, Caddy) or application level
  - Set `Strict-Transport-Security` header (see Security Headers section)
- [ ] **SEC-TLS-002**: Configure TLS version requirements
  - Minimum TLS version: 1.2
  - Prefer TLS 1.3 when available
  - Disable SSLv3, TLS 1.0, TLS 1.1
  - Configure strong cipher suites (AEAD ciphers preferred)
- [ ] **SEC-TLS-003**: Implement certificate management
  - Use Let's Encrypt for automated certificate provisioning
  - Configure auto-renewal (certs expire every 90 days)
  - Monitor certificate expiration (alert 14 days before expiry)
  - Store certificate files outside of the application directory
- [ ] **SEC-TLS-004**: Enable HTTPS in development (optional)
  - Generate self-signed certificate for local development
  - Configure Vite dev server to use HTTPS
  - Or: use HTTP in development with clear documentation about the difference

---

## 14. Security Headers

- [ ] **SEC-SH-001**: Implement Helmet.js middleware
  - Install `helmet` package
  - Apply as NestJS middleware in `main.ts`
  - Helmet sets sensible defaults for many security headers
- [ ] **SEC-SH-002**: Configure Content-Security-Policy (CSP) header
  - `default-src 'self'`
  - `script-src 'self' 'nonce-{random}'` — only self and nonced scripts
  - `style-src 'self' 'unsafe-inline'` — SCSS generates inline styles
  - `img-src 'self' data: https:` — self, data URIs, HTTPS images
  - `connect-src 'self' wss:` — self and WebSocket connections
  - `font-src 'self'` — self-hosted fonts only
  - `frame-src https://gen-ui.example.com` — only gen-ui origin in frames
  - `frame-ancestors 'self'` — prevent embedding in other sites (clickjacking)
  - `base-uri 'self'` — prevent base tag injection
  - `form-action 'self'` — restrict form submissions
- [ ] **SEC-SH-003**: Configure Strict-Transport-Security (HSTS)
  - `max-age=31536000` (1 year)
  - `includeSubDomains` — apply to all subdomains
  - `preload` — submit to browser preload lists (once stable)
- [ ] **SEC-SH-004**: Configure X-Content-Type-Options
  - `X-Content-Type-Options: nosniff`
  - Prevents MIME-sniffing attacks
  - Set by Helmet automatically
- [ ] **SEC-SH-005**: Configure X-Frame-Options
  - `X-Frame-Options: DENY` for the main app (redundant with CSP frame-ancestors but defense-in-depth)
  - Not set on gen-ui responses (they need to be embedded)
- [ ] **SEC-SH-006**: Configure Referrer-Policy
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - Prevents leaking internal paths in referrer headers to external sites
- [ ] **SEC-SH-007**: Configure Permissions-Policy
  - `Permissions-Policy: accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()`
  - Disable all hardware APIs not used by the application
- [ ] **SEC-SH-008**: Remove server identity headers
  - Remove `X-Powered-By` header (Express sets this by default)
  - Remove or obscure `Server` header from reverse proxy
  - Helmet removes `X-Powered-By` automatically

---

## 15. Secret Management

### 15.1 Environment Variables

- [ ] **SEC-SM-001**: Define all required environment variables
  - `DATABASE_URL` — PostgreSQL connection string
  - `JWT_PRIVATE_KEY` — RSA private key (PEM format, base64-encoded)
  - `JWT_PUBLIC_KEY` — RSA public key (PEM format, base64-encoded)
  - `ENCRYPTION_MASTER_KEY` — 256-bit hex key for encrypting spec tokens
  - `BCRYPT_ROUNDS` — bcrypt cost factor (default: 12)
  - `CORS_ORIGIN` — allowed CORS origins (comma-separated)
  - `SESSION_SECRET` — for CSRF token generation
  - `REDIS_URL` — if Redis is used for rate limiting/caching
  - `SENTRY_DSN` — error tracking (if used)
  - `NODE_ENV` — environment (development, staging, production)
- [ ] **SEC-SM-002**: Create `.env.example` template
  - List all environment variables with placeholder values
  - Include comments explaining each variable
  - Never include actual secrets in the template
  - Commit `.env.example` to git; `.env` is in `.gitignore`
- [ ] **SEC-SM-003**: Implement type-safe configuration loading
  - Use NestJS `ConfigModule` with `@nestjs/config`
  - Define a `ConfigService` with typed getters for each variable
  - Validate all required variables on startup (fail fast if missing)
  - Use `Joi` or `class-validator` for environment validation schema

### 15.2 Key Management

- [ ] **SEC-SM-004**: Implement JWT key pair generation script
  - Script: `scripts/generate-jwt-keys.sh`
  - Generate RSA 4096-bit key pair using `openssl`
  - Output private key and public key in PEM format
  - Instructions for base64-encoding for environment variable storage
- [ ] **SEC-SM-005**: Implement encryption master key generation script
  - Script: `scripts/generate-master-key.sh`
  - Generate 256-bit random key using `openssl rand -hex 32`
  - Document storage procedure (environment variable, vault)
- [ ] **SEC-SM-006**: Document key rotation procedures
  - JWT key rotation: add new key, update signing, keep old for verification, remove after grace period
  - Encryption master key rotation: re-encrypt all stored tokens with new key
  - Include step-by-step runbooks in `docs/security/`

### 15.3 Vault Integration (Optional Enhancement)

- [ ] **SEC-SM-007**: Design vault integration architecture
  - Support HashiCorp Vault, AWS Secrets Manager, or similar
  - Application fetches secrets from vault on startup
  - Secrets are cached in memory for the process lifetime
  - Vault integration is optional; environment variables are the default
- [ ] **SEC-SM-008**: Implement vault client wrapper
  - Create `VaultService` in `server/src/common/services/`
  - `getSecret(key: string): Promise<string>`
  - Falls back to environment variables if vault is not configured
  - Logs (without values) which secrets were loaded and from where

---

## 16. Dependency Security

- [ ] **SEC-DS-001**: Implement dependency audit in CI
  - Run `bun audit` (or `npm audit`) as a CI step
  - Fail the build on critical or high severity vulnerabilities
  - Warn on medium severity vulnerabilities
  - Generate audit report as CI artifact
- [ ] **SEC-DS-002**: Implement automated dependency updates
  - Configure Dependabot or Renovate for the repository
  - Auto-create PRs for security patches (patch versions)
  - Require manual review for minor/major version updates
  - Pin exact versions in `bun.lock`
- [ ] **SEC-DS-003**: Maintain a dependency allow-list
  - Document approved packages and their purposes
  - New dependencies require security review before addition
  - Prefer well-maintained packages with active security response
- [ ] **SEC-DS-004**: Implement lockfile integrity verification
  - Verify `bun.lock` integrity in CI
  - Detect if lockfile was manually edited or tampered with
  - Fail build if lockfile is out of sync with `package.json`
- [ ] **SEC-DS-005**: Monitor for supply chain attacks
  - Subscribe to security advisories for key dependencies
  - Monitor npm registry for suspicious package updates
  - Consider using a private registry or proxy (Verdaccio, Artifactory) for production

---

## 17. Audit Logging

### 17.1 Audit Log Schema

- [ ] **SEC-AL-001**: Define audit log database schema
  - Table: `audit_logs`
  - Columns: `id` (UUID), `timestamp` (ISO 8601), `user_id` (nullable for system events), `action_type` (enum), `action` (string), `resource_type` (string), `resource_id` (string), `details` (JSONB), `ip_address`, `user_agent`, `success` (boolean)
  - Index on: `timestamp`, `user_id`, `action_type`, `resource_type`
  - Partitioned by month for performance
- [ ] **SEC-AL-002**: Define audit action types
  - `auth`: login, logout, register, password_change, password_reset, token_refresh
  - `spec`: create, update, delete, permission_change, encrypt, decrypt
  - `agent`: session_create, tool_call, session_end
  - `admin`: user_role_change, system_config_change
  - `encryption`: token_generate, token_share, token_revoke, token_rotate
  - `collaboration`: project_invite, project_remove, sync_push, sync_pull
  - `security`: rate_limit_hit, csrf_violation, cors_violation, auth_failure

### 17.2 Audit Log Implementation

- [ ] **SEC-AL-003**: Implement audit logging service
  - Create `AuditLogService` in `server/src/common/services/`
  - `log(entry: AuditLogEntry): Promise<void>` — async, non-blocking
  - Buffer entries and batch insert every 5 seconds (or immediately for security events)
  - Never log passwords, tokens, or encryption keys in details
- [ ] **SEC-AL-004**: Implement audit logging interceptor
  - NestJS interceptor that automatically logs API requests and responses
  - Captures: endpoint, method, user, parameters, status code, duration
  - Applied to all routes (can be opted out via decorator)
  - Strips sensitive fields from logged request/response bodies
- [ ] **SEC-AL-005**: Implement security event logging
  - Failed login attempts: user (if found), IP, timestamp
  - Rate limit violations: IP, endpoint, timestamp
  - Permission denied: user, resource, required permission, timestamp
  - CSRF violations: IP, endpoint, timestamp
  - Suspicious activity: multiple failed attempts, unusual access patterns
- [ ] **SEC-AL-006**: Implement audit log query API
  - `GET /api/admin/audit-logs` — query with filters
  - Filters: date range, user_id, action_type, resource_type, success
  - Pagination: cursor-based for time-series data
  - Only accessible by system admins
- [ ] **SEC-AL-007**: Implement audit log retention policy
  - Retain security logs for 1 year (configurable)
  - Retain standard logs for 90 days (configurable)
  - Automated cleanup via database job (CRON or pg_cron)
  - Archive old logs to cold storage before deletion (optional)

---

## 18. Security Testing

### 18.1 Automated Security Tests

- [ ] **SEC-ST-001**: Write unit tests for password hashing service
  - Test: hashing produces different outputs for same input (salt randomness)
  - Test: verification succeeds with correct password
  - Test: verification fails with incorrect password
  - Test: verification takes constant time regardless of user existence
- [ ] **SEC-ST-002**: Write unit tests for JWT token management
  - Test: token contains expected claims
  - Test: expired tokens are rejected
  - Test: tokens with invalid signature are rejected
  - Test: token version mismatch causes rejection
  - Test: refresh token rotation invalidates old token
  - Test: reuse detection triggers family revocation
- [ ] **SEC-ST-003**: Write unit tests for encryption service
  - Test: encrypt → decrypt roundtrip preserves content
  - Test: decryption with wrong key fails
  - Test: encrypted output is different for same plaintext (IV randomness)
  - Test: tampered ciphertext fails authentication (GCM tag verification)
- [ ] **SEC-ST-004**: Write integration tests for permission guards
  - Test: user with FULL access can read full content
  - Test: user with SUMMARY access sees only summary
  - Test: unauthorized user gets 403
  - Test: project owner has FULL on all specs
  - Test: permission grants and revocations work correctly
- [ ] **SEC-ST-005**: Write integration tests for rate limiting
  - Test: requests within limit succeed
  - Test: requests exceeding limit receive 429
  - Test: rate limit resets after the window
  - Test: endpoint-specific limits are enforced independently
- [ ] **SEC-ST-006**: Write integration tests for CSRF protection
  - Test: requests without CSRF token are rejected
  - Test: requests with valid CSRF token succeed
  - Test: requests with expired/invalid CSRF token are rejected
  - Test: GET requests do not require CSRF tokens
- [ ] **SEC-ST-007**: Write integration tests for input validation
  - Test: invalid UUIDs are rejected
  - Test: oversized payloads are rejected
  - Test: missing required fields are rejected
  - Test: extra fields are stripped (whitelist mode)
  - Test: XSS payloads in spec content are sanitized

### 18.2 Security Audit Checklist

- [ ] **SEC-ST-008**: Create OWASP Top 10 security checklist
  - A01: Broken Access Control — verify permission enforcement on all endpoints
  - A02: Cryptographic Failures — verify encryption, hashing, TLS configuration
  - A03: Injection — verify parameterized queries, input sanitization
  - A04: Insecure Design — review threat model coverage
  - A05: Security Misconfiguration — verify headers, CORS, default credentials removed
  - A06: Vulnerable Components — verify dependency audit results
  - A07: Authentication Failures — verify lockout, password policy, token management
  - A08: Software and Data Integrity — verify CI/CD pipeline security
  - A09: Logging and Monitoring — verify audit log coverage
  - A10: Server-Side Request Forgery — verify agent network restrictions
- [ ] **SEC-ST-009**: Implement automated security scanning in CI
  - Run SAST (static analysis security testing) — e.g., `semgrep`, `eslint-plugin-security`
  - Run dependency audit (`bun audit`)
  - Run secret detection (`trufflehog`, `gitleaks`)
  - Fail pipeline on critical findings
- [ ] **SEC-ST-010**: Create penetration testing plan
  - Define scope: all API endpoints, authentication flows, agent interactions, generated UI
  - Schedule: before each major release and annually
  - Tools: OWASP ZAP, Burp Suite, custom scripts
  - Document findings and remediation in `docs/security/pen-test-reports/`

---

## 19. Incident Response

- [ ] **SEC-IR-001**: Define security incident severity levels
  - **Critical**: data breach, authentication bypass, remote code execution
  - **High**: privilege escalation, mass data exposure, encryption failure
  - **Medium**: XSS, CSRF, information disclosure, DoS
  - **Low**: security misconfiguration, minor information leak
- [ ] **SEC-IR-002**: Define incident response procedures
  - Step 1: Detect and confirm (monitoring alerts, user reports, audit log review)
  - Step 2: Contain (disable affected feature, block IPs, revoke tokens)
  - Step 3: Investigate (audit log analysis, reproduce, determine scope)
  - Step 4: Remediate (patch vulnerability, rotate secrets, update configuration)
  - Step 5: Recover (restore service, verify fix, monitor for recurrence)
  - Step 6: Post-mortem (document timeline, root cause, lessons learned, action items)
- [ ] **SEC-IR-003**: Implement emergency security controls
  - Kill switch: disable all agent sessions immediately
  - Kill switch: invalidate all JWTs (rotate signing key)
  - Kill switch: disable registration
  - Kill switch: enable maintenance mode (read-only)
  - Each control accessible via admin API and environment variable
- [ ] **SEC-IR-004**: Document notification procedures
  - Internal: alert team leads within 1 hour of critical/high incidents
  - Users: notify affected users within 24 hours of confirmed data breach
  - Legal: consult legal requirements for data breach notification (GDPR, etc.)
- [ ] **SEC-IR-005**: Create incident response runbooks
  - Runbook: compromised user account
  - Runbook: compromised JWT signing key
  - Runbook: compromised encryption master key
  - Runbook: malicious agent behavior
  - Runbook: database breach
  - Store in `docs/security/runbooks/`
