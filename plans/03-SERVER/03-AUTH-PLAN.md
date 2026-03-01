# 03-SERVER / 03 — AUTH PLAN

> **Purpose**: Define the complete authentication and authorization system
> including bcrypt password hashing, JWT token management, HTTP-only cookie
> configuration, NestJS guards, role-based access control, spec-level
> permission enforcement, session management, password reset flow,
> registration, and CSRF protection.
>
> **Phase**: 1 (Foundation)
> **Dependencies**: `03-SERVER/01-ARCHITECTURE-PLAN.md`, `07-DATABASE/PLAN.md`
> **Estimated tasks**: 130+

---

## Table of Contents

1. [Password Hashing (bcrypt)](#1-password-hashing-bcrypt)
2. [JWT Token Management](#2-jwt-token-management)
3. [HTTP-Only Cookie Configuration](#3-http-only-cookie-configuration)
4. [Authentication Guards](#4-authentication-guards)
5. [Passport Strategies](#5-passport-strategies)
6. [Role-Based Access Control](#6-role-based-access-control)
7. [Spec-Level Permission Enforcement](#7-spec-level-permission-enforcement)
8. [Registration Flow](#8-registration-flow)
9. [Login Flow](#9-login-flow)
10. [Token Refresh Flow](#10-token-refresh-flow)
11. [Logout & Token Revocation](#11-logout--token-revocation)
12. [Password Reset Flow](#12-password-reset-flow)
13. [Session Management](#13-session-management)
14. [CSRF Protection](#14-csrf-protection)
15. [Security Hardening](#15-security-hardening)

---

## 1. Password Hashing (bcrypt)

### 1.1 Hashing Configuration

- [ ] **SV-AUTH-001**: Install and configure bcrypt for password hashing
  - Use `bcrypt` npm package (or `bcryptjs` for pure JS if native fails under Bun)
  - Verify bcrypt native bindings work with Bun runtime
  - Fallback to `bcryptjs` if native build fails
- [ ] **SV-AUTH-002**: Configure bcrypt salt rounds
  - Default: 12 rounds (configurable via `BCRYPT_ROUNDS` env var)
  - Minimum: 10 rounds (enforce in config validation)
  - Maximum: 15 rounds (prevent excessive CPU usage)
  - Log chosen round count on startup for verification
- [ ] **SV-AUTH-003**: Implement `hashPassword(plain: string): Promise<string>`
  - Generate salt using configured rounds
  - Hash password with generated salt
  - Return hashed string (includes salt + hash)
  - Measure and log hashing duration (should be 100-300ms for 12 rounds)
- [ ] **SV-AUTH-004**: Implement `verifyPassword(plain: string, hash: string): Promise<boolean>`
  - Compare plain text password against stored hash
  - Return boolean (no timing side-channel information)
  - Handle invalid hash format gracefully (return false, log warning)
- [ ] **SV-AUTH-005**: Create `PasswordService` as injectable NestJS service
  - Encapsulate hash and verify methods
  - Inject `ConfigService` for round count configuration
  - Log operations at debug level (never log password values)

### 1.2 Password Validation

- [ ] **SV-AUTH-006**: Define password strength requirements
  - Minimum length: 8 characters
  - Must contain at least one uppercase letter
  - Must contain at least one lowercase letter
  - Must contain at least one digit
  - Optional: at least one special character (configurable)
  - Maximum length: 128 characters (prevent bcrypt truncation at 72 bytes)
- [ ] **SV-AUTH-007**: Implement `@IsStrongPassword()` custom validation decorator
  - Combine all password requirements into single decorator
  - Return specific error message indicating which requirement failed
  - Use on registration and password change DTOs
- [ ] **SV-AUTH-008**: Implement password breach checking (optional, phase 5)
  - Check against Have I Been Pwned API (k-anonymity model)
  - Warn user if password has appeared in known breaches
  - Do not block registration, only warn

#### Design Decisions

> **Q**: Should the project use `bcrypt` (native C++ bindings) or `bcryptjs` (pure JavaScript)?
> **A**: Use `bcryptjs`. It's pure JavaScript, works reliably under Bun without native addon compilation issues, and is the safer choice for Bun compatibility. The performance difference (~2-3x slower than native `bcrypt`) is irrelevant at login/registration frequency.

> **Q**: Should the project use Argon2 instead of bcrypt?
> **A**: Stick with bcrypt (via `bcryptjs`). The PRD explicitly specifies bcrypt. Argon2 requires native bindings which may have Bun compatibility issues. Bcrypt is well-understood and sufficient. Switching to Argon2 can be done later by re-hashing on login.

> **Q**: Is 12 bcrypt rounds the right default?
> **A**: 12 rounds is correct. ~300ms per hash is acceptable for login/registration. Make the round count configurable via `BCRYPT_ROUNDS=12`. Do not go below 10 rounds.

> **Q**: Should the password policy require special characters?
> **A**: Follow NIST SP 800-63B guidelines: minimum 12 characters, no special character requirement, no forced composition rules. Check against a breach dictionary (top 100,000 common passwords). Maximum length: 72 characters (bcrypt's limit).

> **Q**: Should there be a password history check?
> **A**: No. Password history checks are not recommended by NIST for most applications. They encourage minimal incremental changes. The breach dictionary check is more effective.

> **Q**: Should the maximum password length be 128 characters or shorter?
> **A**: Maximum 72 characters, matching bcrypt's internal limit. Accepting longer passwords without disclosing the truncation would be misleading. Reject passwords longer than 72 characters with a clear validation error.

---

## 2. JWT Token Management

### 2.1 Token Generation

- [ ] **SV-AUTH-009**: Configure `@nestjs/jwt` module
  - Register with `JwtModule.registerAsync()` using config factory
  - Load `JWT_SECRET` from environment via `ConfigService`
  - Validate secret length (minimum 32 characters) on startup
  - Set default sign options: algorithm HS256
- [ ] **SV-AUTH-010**: Implement access token generation
  - Payload: `{ sub: userId, email, username, roles: string[] }`
  - Expiration: configurable via `JWT_ACCESS_EXPIRATION` (default: 15m)
  - Issued at: automatically set
  - Token ID (jti): UUID v4 for token tracking
  - Sign with HS256 algorithm
- [ ] **SV-AUTH-011**: Implement refresh token generation
  - Payload: `{ sub: userId, jti: tokenId, type: 'refresh' }`
  - Expiration: configurable via `JWT_REFRESH_EXPIRATION` (default: 7d)
  - Longer-lived than access token
  - Token ID (jti): UUID v4 for revocation tracking
  - Sign with HS256 algorithm
- [ ] **SV-AUTH-012**: Create `TokenService` for token operations
  - `generateAccessToken(user: User): Promise<string>`
  - `generateRefreshToken(user: User): Promise<{ token: string, jti: string }>`
  - `generateTokenPair(user: User): Promise<{ accessToken, refreshToken, refreshJti }>`
  - `verifyToken(token: string): Promise<TokenPayload>`
  - `decodeToken(token: string): TokenPayload | null` (no verification)

### 2.2 Token Validation

- [ ] **SV-AUTH-013**: Implement token signature verification
  - Verify HS256 signature against `JWT_SECRET`
  - Reject tokens with invalid signatures (401)
  - Reject tokens with unsupported algorithms (prevent algorithm confusion)
- [ ] **SV-AUTH-014**: Implement token expiration checking
  - Check `exp` claim against current time
  - Allow configurable clock skew tolerance (default: 30 seconds)
  - Return specific error for expired tokens vs invalid tokens
- [ ] **SV-AUTH-015**: Implement token type checking
  - Access tokens must not contain `type: 'refresh'`
  - Refresh tokens must contain `type: 'refresh'`
  - Reject mismatched token types with clear error message
- [ ] **SV-AUTH-016**: Implement token blocklist checking
  - Check token `jti` against blocklist (for revoked tokens)
  - Blocklist stored in database or in-memory cache
  - Clean expired entries from blocklist periodically

### 2.3 Token Payload Types

- [ ] **SV-AUTH-017**: Define `AccessTokenPayload` interface
  - `sub`: string (user ID)
  - `email`: string
  - `username`: string
  - `roles`: string[]
  - `iat`: number (issued at)
  - `exp`: number (expiration)
  - `jti`: string (token ID)
- [ ] **SV-AUTH-018**: Define `RefreshTokenPayload` interface
  - `sub`: string (user ID)
  - `type`: 'refresh'
  - `iat`: number
  - `exp`: number
  - `jti`: string (token ID for revocation)

#### Design Decisions

> **Q**: Is 15 minutes the right TTL for access tokens?
> **A**: 15 minutes. This is the industry standard for access tokens. The client handles transparent refresh. Configurable via `JWT_ACCESS_TTL=900` (seconds).

> **Q**: Is 7 days the right TTL for refresh tokens?
> **A**: 7 days is correct for the default. "Remember me" extends to 30 days. Configurable via `JWT_REFRESH_TTL=604800` (seconds).

> **Q**: Should the JWT use HS256 (symmetric) or RS256 (asymmetric) signing?
> **A**: HS256 (symmetric). No other services need to verify tokens independently. HS256 is simpler, faster, and produces smaller tokens. The `JWT_SECRET` must be at least 256 bits (32 bytes).

> **Q**: Should the JWT contain user roles, or should roles be fetched from the database on each request?
> **A**: Embed the system role (`admin` or `user`) in the JWT. Role changes take effect at the next token refresh (within 15 minutes). Do NOT embed project-level roles — those are checked against the database per request.

> **Q**: What claims should the access token include beyond the minimum?
> **A**: Include: `sub` (user ID), `exp`, `iat`, `role` (system role), `jti` (unique token ID for revocation). Do not include email or username — these change and become stale.

> **Q**: Should the token include the user's active project ID?
> **A**: No. The project ID is a routing concern, not an identity concern. It belongs in the URL path, not the token.

> **Q**: Should tokens include a `scope` claim?
> **A**: Not for JWT access tokens. Scoped permissions are relevant for API keys (phase 2). Access tokens represent the full authenticated user.

---

## 3. HTTP-Only Cookie Configuration

### 3.1 Access Token Cookie

- [ ] **SV-AUTH-019**: Configure access token cookie settings
  - Name: `access_token`
  - `httpOnly: true` — prevent JavaScript access
  - `secure: true` in production (HTTPS only)
  - `secure: false` in development (allow HTTP)
  - `sameSite: 'strict'` — prevent cross-site request inclusion
  - `path: '/api'` — only sent to API routes
  - `maxAge`: match JWT access token expiration
  - `domain`: configurable (default: current domain)
- [ ] **SV-AUTH-020**: Implement `setAccessTokenCookie(res: Response, token: string)`
  - Set cookie with all configured options
  - Log cookie set event at debug level (never log token value)
- [ ] **SV-AUTH-021**: Implement `clearAccessTokenCookie(res: Response)`
  - Clear cookie by setting empty value and `maxAge: 0`
  - Use same path and domain as set operation

### 3.2 Refresh Token Cookie

- [ ] **SV-AUTH-022**: Configure refresh token cookie settings
  - Name: `refresh_token`
  - `httpOnly: true`
  - `secure: true` in production
  - `sameSite: 'strict'`
  - `path: '/api/v1/auth/refresh'` — only sent to refresh endpoint
  - `maxAge`: match JWT refresh token expiration
  - Separate path from access token (principle of least privilege)
- [ ] **SV-AUTH-023**: Implement `setRefreshTokenCookie(res: Response, token: string)`
  - Set cookie with all configured options
  - Restrict path to `/api/v1/auth/refresh` only
- [ ] **SV-AUTH-024**: Implement `clearRefreshTokenCookie(res: Response)`
  - Clear cookie with matching path

### 3.3 Cookie Utility Service

- [ ] **SV-AUTH-025**: Create `CookieService` to centralize cookie operations
  - `setTokenCookies(res, accessToken, refreshToken)` — set both cookies
  - `clearTokenCookies(res)` — clear both cookies
  - Read cookie configuration from `ConfigService`
  - Environment-aware (different settings for dev/prod)
- [ ] **SV-AUTH-026**: Implement cookie extraction in JWT strategy
  - Extract `access_token` from `req.cookies`
  - Fallback: extract from `Authorization: Bearer <token>` header
  - Priority: cookie first, then header
  - Log extraction source at debug level

#### Design Decisions

> **Q**: Should `sameSite` be set to `'strict'` or `'lax'`?
> **A**: `lax`. This allows the cookie to be sent on top-level navigations while blocking cross-site POST requests. `strict` would break incoming links and future OAuth redirect flows. Combined with the double-submit CSRF pattern, `lax` provides sufficient protection.

> **Q**: Should the cookie `domain` be explicitly set or left unset?
> **A**: Leave unset (exact origin). The application runs on a single domain. Setting a domain would expand the cookie scope to all subdomains, increasing the attack surface.

> **Q**: Should the refresh token cookie path be restricted to `/api/v1/auth/refresh` or broader?
> **A**: Restrict to `/api/v1/auth/refresh`. The refresh token cookie should only be sent to the refresh endpoint. The access token cookie has path `/` since it's needed for all API requests.

> **Q**: Should the API support both cookie-based and Bearer token authentication simultaneously?
> **A**: Yes. The auth guard checks: (1) `Authorization: Bearer <token>` header, (2) `access_token` HTTP-only cookie. The first valid credential found is used.

> **Q**: If both are supported, should there be a priority order?
> **A**: Bearer token takes priority. If both are present, the Bearer token is used and the cookie is ignored. This allows programmatic clients to override cookie auth when testing or debugging.

---

## 4. Authentication Guards

### 4.1 JWT Authentication Guard

- [ ] **SV-AUTH-027**: Implement `JwtAuthGuard` extending `AuthGuard('jwt')`
  - Override `canActivate()` to add custom logic
  - Check for `@Public()` decorator — skip auth if present
  - Call parent `canActivate()` for JWT validation
  - Handle `UnauthorizedException` with custom error message
  - Attach user to request for downstream access
- [ ] **SV-AUTH-028**: Implement `handleRequest()` override in JwtAuthGuard
  - If user is null and route is not public, throw `UnauthorizedException`
  - If token is expired, throw with `AUTH_EXPIRED_TOKEN` error code
  - If token is invalid, throw with `AUTH_INVALID_TOKEN` error code
  - If token is missing, throw with `AUTH_MISSING_TOKEN` error code
- [ ] **SV-AUTH-029**: Register `JwtAuthGuard` as global guard
  - Apply to all routes by default
  - Routes opt out via `@Public()` decorator
  - Ensure guard runs before all other guards

### 4.2 Optional Authentication Guard

- [ ] **SV-AUTH-030**: Implement `OptionalJwtAuthGuard`
  - Attempt JWT validation
  - If valid: attach user to request
  - If invalid or missing: set `request.user = null` (do NOT throw)
  - Used for endpoints that behave differently for authenticated users
- [ ] **SV-AUTH-031**: Create `@OptionalAuth()` decorator
  - Metadata key to trigger `OptionalJwtAuthGuard`
  - Applied to endpoints like public project listings

### 4.3 Local Authentication Guard

- [ ] **SV-AUTH-032**: Implement `LocalAuthGuard` extending `AuthGuard('local')`
  - Used exclusively on login endpoint
  - Validates email + password via `LocalStrategy`
  - Attaches authenticated user to request
  - Returns generic `AUTH_INVALID_CREDENTIALS` on failure (no hints)

---

## 5. Passport Strategies

### 5.1 JWT Strategy

- [ ] **SV-AUTH-033**: Implement `JwtStrategy` extending `PassportStrategy(Strategy, 'jwt')`
  - Configure token extraction: from cookie, fallback to bearer header
  - Set `secretOrKey` from config
  - Set `ignoreExpiration: false`
  - Implement `validate(payload: AccessTokenPayload)` method
- [ ] **SV-AUTH-034**: Implement JWT strategy `validate()` method
  - Receive decoded token payload
  - Look up user in database by `payload.sub` (user ID)
  - Return null if user not found (triggers 401)
  - Return null if user is deactivated
  - Check token jti against blocklist
  - Return user entity for attachment to request
- [ ] **SV-AUTH-035**: Implement custom cookie extractor for JWT strategy
  - Create `cookieExtractor(req: Request): string | null`
  - Read `access_token` from `req.cookies`
  - If not in cookies, read from `Authorization` header
  - Return null if neither source has a token

### 5.2 Local Strategy

- [ ] **SV-AUTH-036**: Implement `LocalStrategy` extending `PassportStrategy(Strategy, 'local')`
  - Configure `usernameField: 'email'` (login by email)
  - Implement `validate(email: string, password: string)` method
- [ ] **SV-AUTH-037**: Implement Local strategy `validate()` method
  - Look up user by email (case-insensitive)
  - Return null if user not found (generic error — no email hint)
  - Return null if user is deactivated
  - Verify password with bcrypt
  - Return null if password doesn't match
  - Return user entity on success
  - Log authentication attempts (success/failure) for audit

---

## 6. Role-Based Access Control

### 6.1 Role Definitions

- [ ] **SV-AUTH-038**: Define system-level roles
  - `admin` — full system access, user management
  - `user` — standard authenticated user
  - Future: additional roles as needed
- [ ] **SV-AUTH-039**: Define project-level roles
  - `owner` — created the project, full control
  - `admin` — can manage members and settings
  - `member` — can read and write content
  - `viewer` — read-only access to project
- [ ] **SV-AUTH-040**: Store roles in database
  - User entity: `systemRole` column (admin, user)
  - ProjectMember entity: `projectRole` column (owner, admin, member, viewer)
  - Index on `(projectId, userId)` for fast lookup

### 6.2 Roles Guard

- [ ] **SV-AUTH-041**: Implement `RolesGuard` as NestJS guard
  - Read required roles from `@Roles()` decorator metadata
  - If no roles metadata, allow access (no role restriction)
  - Get user from `request.user`
  - Check user's system role against required roles
  - Return true if user has any of the required roles
  - Return false (403) if user lacks all required roles
- [ ] **SV-AUTH-042**: Create `@Roles()` parameter decorator
  - Accept one or more role strings: `@Roles('admin')`, `@Roles('admin', 'owner')`
  - Store as route metadata using `SetMetadata()`
  - Apply at method or controller level
- [ ] **SV-AUTH-043**: Implement role hierarchy checking
  - `admin` inherits all `user` permissions
  - Project `owner` inherits `admin` → `member` → `viewer` permissions
  - Role checking respects hierarchy: requiring `viewer` grants access to `member`, `admin`, `owner`

### 6.3 Project Role Guard

- [ ] **SV-AUTH-044**: Implement `ProjectRoleGuard`
  - Extract `projectId` from route params
  - Look up user's role in the project
  - Read required project role from `@ProjectRoles()` decorator
  - Check user's project role meets minimum requirement
  - Return 403 if user is not a project member or lacks required role
- [ ] **SV-AUTH-045**: Create `@ProjectRoles()` decorator
  - Accept project role: `@ProjectRoles('member')`, `@ProjectRoles('admin')`
  - Use role hierarchy: `owner > admin > member > viewer`
- [ ] **SV-AUTH-046**: Implement project role caching
  - Cache user's project role for the duration of the request
  - Avoid repeated database lookups within the same request
  - Invalidate cache when project membership changes

#### Design Decisions

> **Q**: Are two system roles (`admin`, `user`) sufficient?
> **A**: Two system roles are sufficient: `admin` and `user`. Add `service-account` in phase 2 when API keys are implemented. Moderators are handled via project-level roles. Keep the system role model simple.

> **Q**: Should project roles be configurable per project, or fixed across all projects?
> **A**: Fixed across all projects. Three project roles: `owner` (full control), `editor` (create/edit/delete specs, edges), `viewer` (read-only access). Fixed roles keep permission checking simple.

> **Q**: Should there be a `super-admin` role that can access all projects and all specs?
> **A**: Yes, the system `admin` role acts as super-admin. System admins can access all projects and all specs. Limit the number of system admins and log all admin access to the audit trail. The first registered user is automatically `admin`.

> **Q**: Should role checks happen at the guard level or at the service level?
> **A**: Two-tier approach. Simple role checks (system admin, authenticated user) happen at the guard level via decorators. Complex permission checks (project membership, spec-level access) happen at the service level where the full context is available. Guards handle "who you are"; services handle "what you can do."

> **Q**: Should the system support custom permissions beyond role-based access?
> **A**: No. The three project roles combined with spec-level privacy provide sufficient granularity. Custom per-action permissions create a combinatorial explosion that's hard to manage.

---

## 7. Spec-Level Permission Enforcement

### 7.1 Permission Model

- [ ] **SV-AUTH-047**: Define spec access levels
  - `full` — read and write the spec content
  - `summary` — can only see AI-generated summary
  - No "no access" level (per PRD — always at least summary)
- [ ] **SV-AUTH-048**: Define spec permission storage
  - Database table: `spec_permissions`
  - Columns: `specId`, `userId`, `accessLevel` (full/summary), `grantedBy`, `grantedAt`
  - Default: all project members get `full` access unless restricted
  - Only need to store explicit restrictions (non-default access levels)
- [ ] **SV-AUTH-049**: Implement spec permission token system
  - When a spec is made private, generate an access token
  - Token is NOT stored in git history (separate from content versioning)
  - Tokens stored in database only
  - Token sharing tracked: who was given access, when, by whom

### 7.2 Permission Guard

- [ ] **SV-AUTH-050**: Implement `SpecPermissionGuard`
  - Extract `specId` from route params
  - Extract `projectId` from route params
  - Look up spec's privacy status
  - If spec is public: allow access
  - If spec is private: check user's permission level
  - Read required access level from `@SpecAccess()` decorator
  - Block write operations for `summary` access users
  - Return 403 with appropriate message
- [ ] **SV-AUTH-051**: Create `@SpecAccess()` decorator
  - `@SpecAccess('full')` — requires full access
  - `@SpecAccess('summary')` — requires at least summary access
  - Default: `full` for write operations, `summary` for read operations
- [ ] **SV-AUTH-052**: Implement spec content filtering based on access level
  - Full access: return complete spec content
  - Summary access: return only the summary field
  - Apply at the serialization layer (interceptor or DTO)
  - Ensure no information leakage in filtered response

### 7.3 Permission Management

- [ ] **SV-AUTH-053**: Implement `SpecPermissionService`
  - `grantAccess(specId, userId, accessLevel, grantedBy)`: grant access to spec
  - `revokeAccess(specId, userId, revokedBy)`: remove access (future changes only)
  - `getAccessLevel(specId, userId)`: get user's access level for spec
  - `listPermissions(specId)`: list all permissions for a spec
  - `isPrivate(specId)`: check if spec has any restrictions
- [ ] **SV-AUTH-054**: Implement access tracking for audit
  - Log all access grants and revocations
  - Store in audit table: who, when, what spec, what access level
  - Track who was given access (cannot be undone — per PRD)
  - Expose audit trail via admin endpoint
- [ ] **SV-AUTH-055**: Handle permission implications for graph operations
  - When traversing graph, apply permission filtering per node
  - Edge endpoints respect the permissions of connected nodes
  - Restricted nodes appear as summary nodes in traversal results
  - Agent operations respect permissions of the requesting user

#### Design Decisions

> **Q**: When a spec is first created, is it public by default or private by default?
> **A**: Public by default. All project members with `editor` or higher role can view and edit newly created specs. The spec creator can restrict access afterward. "Public" means "visible to project members," not "visible to the world."

> **Q**: Should the spec owner/creator automatically retain `full` access even if the spec is made private?
> **A**: The creator automatically retains `full` access and it cannot be removed. The creator can transfer ownership to another user. System admins can also always access any spec.

> **Q**: When a user with `summary` access views a document containing private specs, how should the document appear?
> **A**: Private specs are replaced with AI-generated summaries inline. The summary includes the spec title, a brief description, and the spec's edge connections. The summary is pre-generated and stored alongside the spec.

> **Q**: How is the spec access token shared between users?
> **A**: Via the server. `POST /specs/:id/access { userId, level: "full"|"summary" }`. No shareable links. The grant is recorded in PostgreSQL with an audit trail.

> **Q**: Should access tokens be revocable?
> **A**: Yes, the access grant is revocable for future access. `DELETE /specs/:id/access/:userId` removes future access. Knowledge already seen cannot be "unshared," but revoking prevents future updates.

> **Q**: Should there be an expiration on spec access grants?
> **A**: Indefinite until explicitly revoked. Time-based expiration adds complexity without clear benefit.

> **Q**: When an agent operates on behalf of a user, does it inherit that user's spec permissions?
> **A**: The agent inherits the user's exact permissions. It cannot see specs the user cannot see. The agent operates with the user's identity for all permission checks.

> **Q**: Should agents be able to create private specs?
> **A**: Agents can create specs (public by default). If the user explicitly asks the agent to create a private spec, the agent sets the privacy flag and grants full access to the requesting user.

---

## 8. Registration Flow

### 8.1 User Registration

- [ ] **SV-AUTH-056**: Implement `register()` in `AuthService`
  - Validate input against `RegisterDto`
  - Check email uniqueness (case-insensitive)
  - Check username uniqueness (case-insensitive)
  - Hash password using `PasswordService`
  - Create user record in database
  - Set default system role: `user`
  - Return created user (exclude password hash)
- [ ] **SV-AUTH-057**: Implement duplicate detection
  - Normalize email to lowercase before checking
  - Normalize username to lowercase before checking
  - Handle race condition: unique constraint violation → friendly error
  - Return specific error: `VALIDATION_EMAIL_EXISTS` or `VALIDATION_USERNAME_EXISTS`
- [ ] **SV-AUTH-058**: Create user entity in database on registration
  - `id`: UUID v4 (generated by server)
  - `email`: unique, indexed
  - `username`: unique, indexed
  - `passwordHash`: bcrypt hash
  - `displayName`: optional
  - `systemRole`: default 'user'
  - `isActive`: default true
  - `createdAt`: auto-set
  - `updatedAt`: auto-set

### 8.2 Email Verification (Phase 2+)

- [ ] **SV-AUTH-059**: Generate email verification token on registration
  - Create random token (32 bytes, hex encoded)
  - Store hashed token in database with expiration (24 hours)
  - Associate with user ID
- [ ] **SV-AUTH-060**: Implement `POST /api/v1/auth/verify-email`
  - Accept: `{ token: string }`
  - Validate token against stored hash
  - Check token not expired
  - Set `emailVerified: true` on user
  - Delete used token
  - Return success message
- [ ] **SV-AUTH-061**: Implement `POST /api/v1/auth/resend-verification`
  - Rate limit: max 3 per hour per email
  - Generate new token (invalidate previous)
  - Send verification email (or log in dev mode)

---

## 9. Login Flow

### 9.1 Authentication

- [ ] **SV-AUTH-062**: Implement `login()` in `AuthService`
  - Receive authenticated user from `LocalStrategy` (via guard)
  - Generate access token
  - Generate refresh token
  - Store refresh token metadata in database (jti, userId, expiresAt, issuedAt)
  - Set access token cookie
  - Set refresh token cookie
  - Return user profile and access token in response body
- [ ] **SV-AUTH-063**: Implement login rate limiting
  - Max 10 login attempts per email per 15 minutes
  - Max 50 login attempts per IP per 15 minutes
  - Track failed attempts in memory or database
  - Return `429 Too Many Requests` when limit exceeded
  - Include `Retry-After` header
- [ ] **SV-AUTH-064**: Implement account lockout (optional, configurable)
  - Lock account after 10 consecutive failed login attempts
  - Lockout duration: 30 minutes (configurable)
  - Notify user via email when account is locked
  - Admin can manually unlock

### 9.2 Login Audit

- [ ] **SV-AUTH-065**: Log successful login events
  - Record: userId, IP address, user agent, timestamp
  - Store in audit log table
  - Track geographic information if available (IP geolocation)
- [ ] **SV-AUTH-066**: Log failed login events
  - Record: attempted email, IP address, user agent, failure reason, timestamp
  - Do NOT record attempted password
  - Use for rate limiting and security monitoring
- [ ] **SV-AUTH-067**: Implement suspicious login detection (phase 5)
  - Detect login from new IP/location
  - Detect login from new device/browser
  - Optionally notify user of new login activity

---

## 10. Token Refresh Flow

### 10.1 Refresh Implementation

- [ ] **SV-AUTH-068**: Implement `refresh()` in `AuthService`
  - Extract refresh token from http-only cookie
  - Verify refresh token signature and expiration
  - Check token type is 'refresh'
  - Look up token jti in database (verify it's active)
  - Look up user from token sub claim
  - Verify user is still active
  - Generate new access token
  - Optionally rotate refresh token (generate new, invalidate old)
  - Set new access token cookie
  - Set new refresh token cookie (if rotated)
  - Return new access token in response body
- [ ] **SV-AUTH-069**: Implement refresh token rotation
  - On each refresh, generate new refresh token
  - Invalidate (delete or mark used) the old refresh token
  - Store new refresh token metadata in database
  - If old refresh token is reused after rotation → token theft detected
- [ ] **SV-AUTH-070**: Implement refresh token reuse detection
  - When a previously-used refresh token is presented:
  - This indicates the token was compromised (attacker and legitimate user both have it)
  - Invalidate ALL refresh tokens for the user (nuclear option)
  - Log security event with full context
  - User must re-authenticate
  - Optionally notify user of potential compromise

### 10.2 Token Family Tracking

- [ ] **SV-AUTH-071**: Implement token family concept
  - Each login creates a "token family" (UUID)
  - All refresh tokens from that login share the family ID
  - Rotating a refresh token stays in the same family
  - Revoking one token can revoke the entire family
- [ ] **SV-AUTH-072**: Store refresh token metadata in database
  - Table: `refresh_tokens`
  - Columns: `id`, `jti`, `userId`, `familyId`, `isUsed`, `expiresAt`, `createdAt`
  - Index on `jti` for fast lookup
  - Index on `userId` for listing user's tokens
  - Clean up expired tokens periodically

---

## 11. Logout & Token Revocation

### 11.1 Logout Flow

- [ ] **SV-AUTH-073**: Implement `logout()` in `AuthService`
  - Clear access token cookie
  - Clear refresh token cookie
  - Extract refresh token from cookie before clearing
  - Add refresh token to blocklist (by jti)
  - Mark refresh token as used in database
  - Return success response
- [ ] **SV-AUTH-074**: Implement "logout all devices" (optional)
  - Invalidate all refresh tokens for the user
  - Delete all token family records for the user
  - User must re-login on all devices
  - Triggered by: password change, security concern, user request

### 11.2 Token Blocklist

- [ ] **SV-AUTH-075**: Implement access token blocklist
  - Store revoked access token JTIs
  - Check blocklist during JWT validation
  - Auto-remove entries when token's original expiration passes
  - Storage: in-memory Map with TTL (or Redis for persistence)
- [ ] **SV-AUTH-076**: Implement blocklist cleanup
  - Periodic cleanup of expired blocklist entries (every 15 minutes)
  - Remove entries where token expiration has passed
  - Log cleanup results (entries removed count)
- [ ] **SV-AUTH-077**: Implement blocklist persistence (optional)
  - For server restarts: persist blocklist to database
  - Load active blocklist entries on startup
  - Required for graceful restart without invalidating all sessions

---

## 12. Password Reset Flow

### 12.1 Forgot Password

- [ ] **SV-AUTH-078**: Implement `forgotPassword()` in `AuthService`
  - Accept email address
  - Always return 200 OK (don't reveal if email exists)
  - If email exists: generate reset token
  - Generate cryptographically random token (32 bytes, hex)
  - Hash token before storing (bcrypt or SHA-256)
  - Store in database: hashedToken, userId, expiresAt (1 hour)
  - Send reset email with token link (or log in dev mode)
- [ ] **SV-AUTH-079**: Implement reset token security
  - Tokens are single-use (delete after successful reset)
  - Tokens expire after 1 hour
  - Only one active reset token per user (new request invalidates previous)
  - Rate limit: max 3 reset requests per email per hour

### 12.2 Reset Password

- [ ] **SV-AUTH-080**: Implement `resetPassword()` in `AuthService`
  - Accept: token (from email link) and new password
  - Look up reset record by comparing token hash
  - Verify token not expired
  - Validate new password meets strength requirements
  - Hash new password with bcrypt
  - Update user's password in database
  - Delete reset token record
  - Invalidate all existing refresh tokens (force re-login)
  - Return success message
- [ ] **SV-AUTH-081**: Implement password change (authenticated)
  - Require current password verification
  - Validate new password meets strength requirements
  - Verify new password differs from current password
  - Hash and update password
  - Optionally invalidate other sessions (configurable)

---

## 13. Session Management

### 13.1 Session Tracking

- [ ] **SV-AUTH-082**: Implement session tracking via refresh tokens
  - Each refresh token represents an active session
  - Track: device info (user agent), IP, last activity, created at
  - Store in `sessions` or `refresh_tokens` table
- [ ] **SV-AUTH-083**: Implement `GET /api/v1/auth/sessions` endpoint
  - List user's active sessions
  - Include: session ID, device info, IP, last active, current (boolean)
  - Highlight current session
- [ ] **SV-AUTH-084**: Implement `DELETE /api/v1/auth/sessions/:sessionId` endpoint
  - Revoke a specific session
  - Invalidate the refresh token for that session
  - Cannot revoke current session (use logout instead)
- [ ] **SV-AUTH-085**: Implement `DELETE /api/v1/auth/sessions` endpoint
  - Revoke all sessions except current
  - Invalidate all refresh tokens except current
  - Return count of revoked sessions

### 13.2 Session Limits

- [ ] **SV-AUTH-086**: Enforce maximum concurrent sessions per user
  - Default: 10 concurrent sessions
  - On new login when at limit: revoke oldest session
  - Configurable via environment variable
- [ ] **SV-AUTH-087**: Implement session inactivity timeout
  - If no token refresh within configurable period (default: 30 days)
  - Mark session as expired
  - Clean up in periodic maintenance job
- [ ] **SV-AUTH-088**: Track last activity timestamp per session
  - Update on every token refresh
  - Update on every authenticated API request (debounced, not every request)
  - Use for session listing and inactivity detection

#### Design Decisions

> **Q**: Should sessions be tracked via refresh tokens or via a separate session table?
> **A**: Use refresh tokens as session identifiers. The `refresh_tokens` table serves as the session table. Active sessions = non-expired, non-revoked refresh tokens.

> **Q**: What should happen when a user's role changes?
> **A**: Existing sessions continue with old permissions until the next access token refresh (within 15 minutes). For critical demotions, an admin can force-revoke all of the user's refresh tokens.

> **Q**: Should there be a "remember me" option?
> **A**: Yes. Default refresh token TTL: 7 days. "Remember me" TTL: 30 days. The login endpoint accepts a `rememberMe: boolean` field.

> **Q**: Is 10 concurrent sessions per user the right limit?
> **A**: 10 is sufficient. Covers 2-3 browsers, 1-2 mobile devices, and several API clients. Configurable via `MAX_SESSIONS_PER_USER=10`.

> **Q**: When the session limit is reached, should the oldest session be automatically revoked?
> **A**: Automatically revoke the oldest session. This is the least friction for the user. Log the automatic revocation. Rejecting login is a poor UX that punishes multi-device users.

---

## 14. CSRF Protection

### 14.1 Double-Submit Cookie Pattern

- [ ] **SV-AUTH-089**: Implement CSRF token generation
  - Generate random CSRF token on login
  - Set as a regular (not http-only) cookie: `csrf_token`
  - Client reads cookie and includes in request header
  - Cookie settings: `sameSite: 'strict'`, `secure: true` in production
- [ ] **SV-AUTH-090**: Implement CSRF validation middleware
  - For state-changing requests (POST, PUT, PATCH, DELETE):
  - Read CSRF token from `X-CSRF-Token` request header
  - Compare against `csrf_token` cookie value
  - Reject request if tokens don't match (403)
  - Skip CSRF check for requests with `Authorization: Bearer` header (API key usage)
- [ ] **SV-AUTH-091**: Implement `GET /api/v1/auth/csrf-token` endpoint
  - Return current CSRF token
  - Refresh the token (rotate periodically)
  - Client calls this to get initial token after login

### 14.2 CSRF Guard

- [ ] **SV-AUTH-092**: Create `CsrfGuard` as NestJS guard
  - Apply to all state-changing routes
  - Skip for routes decorated with `@SkipCsrf()` (login, register)
  - Skip for Bearer token authentication (non-browser clients)
  - Log CSRF validation failures as security events
- [ ] **SV-AUTH-093**: Create `@SkipCsrf()` decorator
  - Metadata flag to bypass CSRF validation
  - Apply to: login, register, token refresh, health checks
  - Document reasoning for each skip

#### Design Decisions

> **Q**: Is the double-submit cookie pattern sufficient, or should the server use the synchronizer token pattern?
> **A**: Double-submit cookie is sufficient. It's stateless, works well with JWT cookie auth, and provides adequate CSRF protection.

> **Q**: Should CSRF protection apply to all state-changing requests, or only to cookie-authenticated requests?
> **A**: Only cookie-authenticated requests. Bearer token requests are immune to CSRF. This keeps CLI and API client usage simple.

> **Q**: Should the CSRF token be rotated on every request, on every session refresh, or have a fixed TTL?
> **A**: Rotate on every session refresh (when the access token is refreshed). This provides a reasonable rotation frequency (every 15 minutes).

> **Q**: Should CSRF protection be implemented as NestJS middleware or as a guard?
> **A**: Middleware. CSRF validation should run for all state-changing requests that use cookie authentication. Middleware runs before guards and controllers.

> **Q**: What should the CSRF token cookie name be?
> **A**: `XSRF-TOKEN`. This is the convention used by Angular and Axios (both automatically read this cookie and send it as a header). Zero CSRF configuration needed in the frontend HTTP client.

---

## 15. Security Hardening

### 15.1 Timing Attack Prevention

- [ ] **SV-AUTH-094**: Implement constant-time comparison for tokens
  - Use `crypto.timingSafeEqual()` for token comparison
  - Apply to: CSRF token validation, reset token validation
  - bcrypt already handles timing-safe comparison internally
- [ ] **SV-AUTH-095**: Ensure login response time is constant
  - Always hash a dummy password when user not found (prevent user enumeration)
  - Login response time should not vary between valid and invalid emails
  - Measure and verify timing consistency

### 15.2 Brute Force Prevention

- [ ] **SV-AUTH-096**: Implement progressive delays on failed login
  - 1st-3rd failure: immediate response
  - 4th-6th failure: 1 second delay
  - 7th-9th failure: 3 second delay
  - 10th+ failure: account lockout
  - Delays are per-email, tracked server-side
- [ ] **SV-AUTH-097**: Implement IP-based rate limiting for auth endpoints
  - Track failed auth attempts per IP
  - Temporary block after threshold (100 failures per hour from same IP)
  - Log blocked IPs for security monitoring

### 15.3 Token Security

- [ ] **SV-AUTH-098**: Implement JWT secret rotation support (phase 5)
  - Support multiple signing keys (current + previous)
  - Verify tokens against both keys during rotation period
  - Rotation period: configurable (default: 24 hours)
  - After rotation period: drop old key
- [ ] **SV-AUTH-099**: Implement token binding (optional)
  - Bind access token to client fingerprint (IP + user agent hash)
  - Reject token if fingerprint doesn't match
  - Configurable: strict (reject) or loose (warn only)
  - May cause issues with mobile networks (changing IPs)

### 15.4 Input Sanitization

- [ ] **SV-AUTH-100**: Sanitize all auth-related inputs
  - Trim whitespace from email and username
  - Normalize email to lowercase
  - Reject control characters in all fields
  - Limit maximum input lengths
- [ ] **SV-AUTH-101**: Prevent credential stuffing
  - Track unique email+password combinations per IP
  - Detect automated patterns (many different emails from same IP)
  - Implement CAPTCHA trigger after threshold (optional, phase 5)

### 15.5 Secure Defaults

- [ ] **SV-AUTH-102**: Verify all security defaults on startup
  - JWT secret is sufficiently random (not 'secret' or 'changeme')
  - Bcrypt rounds are within acceptable range
  - Cookie security flags are appropriate for environment
  - CORS origins are explicitly configured (not wildcard)
  - Log security configuration summary at startup (info level)
- [ ] **SV-AUTH-103**: Create security configuration checklist endpoint (dev only)
  - `GET /api/v1/admin/security-check` (admin role, dev environment only)
  - Returns: each security setting with pass/warn/fail status
  - Checks: JWT secret strength, bcrypt rounds, cookie flags, CORS, rate limits

### 15.6 Auth Event Logging

- [ ] **SV-AUTH-104**: Define auth-specific audit events
  - `auth.register` — new user registration
  - `auth.login.success` — successful login
  - `auth.login.failure` — failed login attempt
  - `auth.logout` — user logout
  - `auth.token.refresh` — token refreshed
  - `auth.token.revoked` — token manually revoked
  - `auth.password.changed` — password changed
  - `auth.password.reset.requested` — reset requested
  - `auth.password.reset.completed` — reset completed
  - `auth.session.revoked` — session revoked
  - `auth.csrf.failure` — CSRF validation failed
  - `auth.rate_limit.exceeded` — rate limit hit
  - `auth.lockout` — account locked
- [ ] **SV-AUTH-105**: Implement auth event emission
  - Emit events via `EventEmitter2`
  - Each event includes: userId (if known), IP, userAgent, timestamp
  - Auth events stored in audit log table
  - Critical events (lockout, token theft) trigger alerts

#### Design Decisions

> **Q**: How many layers of brute force protection are needed?
> **A**: Three layers for initial release: (1) per-IP rate limiting on login endpoint (10 attempts/minute), (2) progressive delay (add 1 second per failed attempt per account, reset on success), (3) account lockout after 10 consecutive failures (15-minute lockout). Skip IP blocking for initial release.

> **Q**: Should the server implement device fingerprinting for suspicious login detection?
> **A**: IP + user agent is sufficient. Device fingerprinting adds privacy concerns and is unreliable. Log IP + user agent on login for audit purposes.

> **Q**: Should there be mandatory 2FA support in the initial release?
> **A**: No 2FA in the initial release. Defer to phase 2. Design the user schema with `twoFactorEnabled` boolean and `twoFactorSecret` column from day one.

> **Q**: Is refresh token rotation with reuse detection worth the implementation complexity?
> **A**: Yes. Each refresh token has a `familyId`. On rotation, issue a new token with the same `familyId` and invalidate the old one. If an invalidated token is reused, revoke ALL tokens in the family. The complexity is modest (~50 lines of logic).

> **Q**: Should the access token be bound to the client's IP address?
> **A**: No. IP binding breaks for mobile users, VPN users, and users behind load-balanced corporate proxies. The 15-minute access token TTL already limits the theft window.

> **Q**: Should the system track and display "last login" information?
> **A**: Yes. Store `lastLoginAt`, `lastLoginIp`, and `lastLoginUserAgent` on the user record. Display on the dashboard and expose `GET /auth/sessions` for all active sessions.

> **Q**: Should the architecture be designed to support OAuth 2.0 / OIDC integration in a future phase?
> **A**: Yes, design for it now. The user table should include `passwordHash` (nullable) and a related `user_auth_providers` table. A user can have multiple auth providers linked. Schema created from day one.

> **Q**: Should the API be designed as an OAuth 2.0 authorization server itself?
> **A**: Resource server only. Building an OAuth 2.0 authorization server is unnecessary. The API keys feature (phase 2) covers programmatic access.

> **Q**: Should the system support API keys for programmatic access?
> **A**: Yes, in phase 2. API keys are generated by users, stored hashed in an `api_keys` table, and sent as `Bearer` tokens.

> **Q**: Should API keys have scoped permissions?
> **A**: Yes. Scopes: `read`, `write`, `project:{projectId}`. Scopes stored as a JSON array on the key record.

> **Q**: Should the server implement email sending for registration verification and password reset?
> **A**: Yes, implement email for the initial release. Registration verification and password reset are baseline auth features.

> **Q**: Which email provider should be used?
> **A**: Abstract with a provider interface (`EmailService` with `sendEmail(to, subject, html)` method). Default implementation: SMTP via `nodemailer`. Configuration: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM`.

> **Q**: In development mode, should emails be logged to console, written to files, or sent to a local mail server?
> **A**: Logged to console with the full HTML body. Also support `SMTP_HOST=localhost:1025` for MailHog. The console approach requires zero setup.

---

## Summary

| Section | Task Range | Count |
|---------|-----------|-------|
| 1. Password Hashing (bcrypt) | SV-AUTH-001 – 008 | 8 |
| 2. JWT Token Management | SV-AUTH-009 – 018 | 10 |
| 3. HTTP-Only Cookie Configuration | SV-AUTH-019 – 026 | 8 |
| 4. Authentication Guards | SV-AUTH-027 – 032 | 6 |
| 5. Passport Strategies | SV-AUTH-033 – 037 | 5 |
| 6. Role-Based Access Control | SV-AUTH-038 – 046 | 9 |
| 7. Spec-Level Permission Enforcement | SV-AUTH-047 – 055 | 9 |
| 8. Registration Flow | SV-AUTH-056 – 061 | 6 |
| 9. Login Flow | SV-AUTH-062 – 067 | 6 |
| 10. Token Refresh Flow | SV-AUTH-068 – 072 | 5 |
| 11. Logout & Token Revocation | SV-AUTH-073 – 077 | 5 |
| 12. Password Reset Flow | SV-AUTH-078 – 081 | 4 |
| 13. Session Management | SV-AUTH-082 – 088 | 7 |
| 14. CSRF Protection | SV-AUTH-089 – 093 | 5 |
| 15. Security Hardening | SV-AUTH-094 – 105 | 12 |
| **TOTAL** | | **105** |
