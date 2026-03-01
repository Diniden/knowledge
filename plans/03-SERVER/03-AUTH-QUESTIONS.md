# 03-SERVER / 03 — AUTH: Open Questions

> **Purpose**: Unresolved questions about the authentication and authorization
> system including password hashing, JWT strategy, cookie configuration,
> permission enforcement, session management, and security trade-offs.
> Answers may change tasks in the plan.

---

## 1. Password Hashing

### 1.1 Library Choice
- **Q**: Should the project use `bcrypt` (native C++ bindings, faster) or
  `bcryptjs` (pure JavaScript, more portable)? Bun's compatibility with native
  Node.js addons may make `bcrypt` unreliable.

**A:** Use `bcryptjs`. It's pure JavaScript, works reliably under Bun without native addon compilation issues, and is the safer choice for Bun compatibility. The performance difference (~2-3x slower than native `bcrypt`) is irrelevant at login/registration frequency. The PRD specifies bcrypt hashing, and `bcryptjs` implements the same algorithm.

- **Q**: Should the project use Argon2 instead of bcrypt? Argon2 is the
  winner of the Password Hashing Competition and has better resistance to
  GPU attacks, but it has less NestJS ecosystem support.

**A:** Stick with bcrypt (via `bcryptjs`). The PRD explicitly specifies bcrypt. Argon2 is technically superior but requires native bindings (`argon2` npm package uses N-API), which may have Bun compatibility issues. Bcrypt is well-understood, widely deployed, and sufficient for this application's threat model. Switching to Argon2 can be done later by re-hashing on login.

- **Q**: Is 12 bcrypt rounds the right default? On modern hardware, 12 rounds
  takes ~300ms. Should this be tuned based on the expected server hardware?

**A:** 12 rounds is correct. ~300ms per hash is acceptable for login/registration (infrequent operations). This provides strong protection against brute-force attacks. Make the round count configurable via `BCRYPT_ROUNDS=12` environment variable so it can be tuned for the deployment hardware. Do not go below 10 rounds.

### 1.2 Password Policy
- **Q**: Should the password policy require special characters, or is
  length + mixed case + numbers sufficient? NIST guidelines recommend against
  requiring special characters and instead focus on minimum length.

**A:** Follow NIST SP 800-63B guidelines: minimum 12 characters, no special character requirement, no forced composition rules (mixed case, numbers). Check against a breach dictionary (top 100,000 common passwords via a static list). Long passwords are more secure than short complex passwords. Maximum length: 72 characters (bcrypt's limit).

- **Q**: Should there be a password history check (prevent reuse of last N
  passwords)? This adds complexity but prevents password cycling.

**A:** No. Password history checks are not recommended by NIST for most applications. They add database complexity (storing N previous hashes per user) and encourage users to make minimal incremental changes. The breach dictionary check is more effective at preventing weak passwords.

- **Q**: Should the maximum password length be 128 characters or shorter?
  bcrypt internally truncates at 72 bytes, so passwords longer than ~72
  characters provide no additional security.

**A:** Maximum 72 characters, matching bcrypt's internal limit. Accepting longer passwords without disclosing the truncation would be misleading. If a user submits a password longer than 72 characters, reject it with a clear validation error explaining the maximum length.

---

## 2. JWT Strategy

### 2.1 Token Configuration
- **Q**: Is 15 minutes the right TTL for access tokens? Shorter (5 min) is
  more secure but requires more frequent refreshes. Longer (1 hour) reduces
  network overhead but increases the window for stolen token abuse.

**A:** 15 minutes. This is the industry standard for access tokens. The client handles transparent refresh, so users never notice the short TTL. Configurable via `JWT_ACCESS_TTL=900` (seconds).

- **Q**: Is 7 days the right TTL for refresh tokens? This determines how long
  a user stays logged in without re-authenticating.

**A:** 7 days is correct for the default. This is a good balance between convenience and security. Users who want longer sessions can use "remember me" (extends to 30 days). Configurable via `JWT_REFRESH_TTL=604800` (seconds).

- **Q**: Should the JWT use HS256 (symmetric) or RS256 (asymmetric) signing?
  RS256 allows public key verification without exposing the signing key, which
  is useful if other services need to verify tokens.

**A:** HS256 (symmetric). There are no other services that need to verify tokens independently — this is a single-server deployment. HS256 is simpler (one secret vs. a key pair), faster to sign/verify, and produces smaller tokens. If microservices or third-party token verification is needed later, migrate to RS256. The `JWT_SECRET` must be at least 256 bits (32 bytes).

- **Q**: Should the JWT contain user roles, or should roles be fetched from
  the database on each request? Embedding roles makes the token self-contained
  but means role changes require token re-issuance.

**A:** Embed the system role (`admin` or `user`) in the JWT. Role changes are infrequent and take effect at the next token refresh (within 15 minutes). Do NOT embed project-level roles — those are checked against the database per request since they can change more frequently and are project-specific.

### 2.2 Token Content
- **Q**: What claims should the access token include beyond the minimum
  (sub, exp, iat)? Including email and username avoids DB lookups but increases
  token size and becomes stale if user updates profile.

**A:** Include: `sub` (user ID), `exp`, `iat`, `role` (system role), `jti` (unique token ID for revocation). Do not include email or username — these change and become stale. The `sub` claim is sufficient to identify the user; profile data is fetched from the database when needed (cached in-memory for the request lifecycle).

- **Q**: Should the token include the user's active project ID to avoid
  passing it in every request? This couples the token to a specific context.

**A:** No. The project ID is a routing concern, not an identity concern. It belongs in the URL path (`/projects/:projectId/...`) or request context, not the token. Coupling the token to a project would require re-issuing tokens when the user switches projects.

- **Q**: Should tokens include a `scope` claim to limit what operations a
  specific token can perform? This enables fine-grained token permissions but
  adds validation complexity.

**A:** Not for JWT access tokens. Scoped permissions are relevant for API keys (phase 2), where a user generates a key for a specific use case (read-only, specific project). Access tokens represent the full authenticated user. API keys will include a `scope` claim when implemented.

---

## 3. Cookie Configuration

### 3.1 Cookie Settings
- **Q**: Should `sameSite` be set to `'strict'` or `'lax'`? `strict` prevents
  the cookie from being sent on any cross-site request (even top-level
  navigations), which can break OAuth flows and external links. `lax` allows
  cookies on top-level navigations but blocks on cross-site POST.

**A:** `lax`. This allows the cookie to be sent on top-level navigations (user clicks a link to the app from another site) while blocking cross-site POST requests (CSRF mitigation). `strict` would break incoming links and future OAuth redirect flows. Combined with the double-submit CSRF pattern, `lax` provides sufficient protection.

- **Q**: Should the cookie `domain` be explicitly set or left unset (defaults
  to exact origin)? Setting domain allows subdomains to access the cookie.

**A:** Leave unset (exact origin). The application runs on a single domain. Setting a domain would expand the cookie scope to all subdomains, increasing the attack surface. If subdomain access is needed later (e.g., `api.example.com` and `app.example.com`), set the domain at that point.

- **Q**: Should the refresh token cookie path be restricted to
  `/api/v1/auth/refresh` or broader (`/api/v1/auth/`)? Restricting reduces
  the attack surface for cookie theft.

**A:** Restrict to `/api/v1/auth/refresh`. The refresh token cookie should only be sent to the refresh endpoint. This minimizes exposure — even if another endpoint is compromised, the refresh token cookie is not included in requests to it. The access token cookie has path `/` since it's needed for all API requests.

### 3.2 Dual Authentication
- **Q**: Should the API support both cookie-based and Bearer token
  authentication simultaneously? This allows browser clients to use cookies and
  programmatic clients (CLI, CI) to use Bearer tokens.

**A:** Yes. The auth guard checks for authentication in this order: (1) `Authorization: Bearer <token>` header, (2) `access_token` HTTP-only cookie. The first valid credential found is used. This supports browsers (automatic cookie), CLIs (`curl -H "Authorization: Bearer ..."`), and API clients. Both paths validate the same JWT format.

- **Q**: If both are supported, should there be a priority order (cookie first,
  then Bearer)? Or should they be mutually exclusive per request?

**A:** Bearer token takes priority. If both are present, the Bearer token is used and the cookie is ignored. This allows programmatic clients to override cookie auth when testing or debugging. If only the cookie is present, it's used. They are not mutually exclusive — having both present is valid; Bearer wins.

---

## 4. Role-Based Access Control

### 4.1 Role Design
- **Q**: Are two system roles (`admin`, `user`) sufficient, or should there be
  additional roles like `moderator` or `service-account`?

**A:** Two system roles are sufficient: `admin` and `user`. Add a `service-account` role in phase 2 when API keys are implemented. Moderators are handled via project-level roles (project `admin` vs `editor` vs `viewer`). Keep the system role model simple — granularity happens at the project level.

- **Q**: Should project roles be configurable per project, or fixed across all
  projects? Configurable roles add flexibility but complicate permission
  checking.

**A:** Fixed across all projects. Three project roles: `owner` (full control, can delete project, manage members), `editor` (create/edit/delete specs, edges, manage agent sessions), `viewer` (read-only access, can view specs they have permission for). Fixed roles keep permission checking simple and predictable. Custom roles are unnecessary for knowledge graph management.

- **Q**: Should there be a `super-admin` role that can access all projects and
  all specs regardless of permissions? This is useful for support/debugging
  but is a security concern.

**A:** Yes, the system `admin` role acts as super-admin. System admins can access all projects and all specs for support and debugging. This is necessary for a self-hosted system where the operator needs full access. Limit the number of system admins and log all admin access to the audit trail. The first registered user is automatically `admin`.

### 4.2 Permission Checking
- **Q**: Should role checks happen at the guard level (before the handler) or
  at the service level (within business logic)? Guard-level is cleaner but may
  not have access to all context needed for complex decisions.

**A:** Two-tier approach. Simple role checks (system admin, authenticated user) happen at the guard level via decorators: `@Roles('admin')`, `@Auth()`. Complex permission checks (project membership, spec-level access) happen at the service level where the full context (project ID, spec ID, user's relationship to the resource) is available. Guards handle "who you are"; services handle "what you can do with this resource."

- **Q**: Should the system support custom permissions beyond role-based access
  (e.g., "user X can edit specs but not delete them")? This adds granularity
  but significantly increases complexity.

**A:** No. The three project roles (`owner`, `editor`, `viewer`) combined with spec-level privacy (full access, summary access, no access) provide sufficient granularity. Custom per-action permissions create a combinatorial explosion that's hard to manage and harder to debug. If a user needs restricted access, they get the `viewer` role with specific spec access grants.

---

## 5. Spec-Level Permissions

### 5.1 Privacy Model
- **Q**: When a spec is first created, is it public by default (all project
  members have full access) or private by default? The PRD implies public by
  default with the ability to restrict.

**A:** Public by default. All project members with `editor` or higher role can view and edit newly created specs. The spec creator can restrict access afterward by setting the spec to private and granting specific access tokens. This aligns with the PRD's collaborative-by-default philosophy. The "public" means "visible to project members," not "visible to the world."

- **Q**: Should the spec owner/creator automatically retain `full` access even
  if the spec is made private, or can the owner's access be restricted too?

**A:** The creator automatically retains `full` access and it cannot be removed. The creator can transfer ownership to another user, at which point the new owner has irrevocable full access. This prevents a spec from becoming inaccessible. System admins can also always access any spec.

- **Q**: When a user with `summary` access views a document containing both
  public and private specs, how should the document appear? Options: (a) private
  specs replaced with summaries inline, (b) private specs hidden with a
  "[restricted]" placeholder, (c) separate "full" and "summary" document views.

**A:** Option (a): private specs are replaced with AI-generated summaries inline. The summary includes the spec title, a brief description (1-2 sentences), and the spec's edge connections (relationship types, not target content). This aligns with the PRD's "summary access" permission tier. The summary is pre-generated and stored alongside the spec, updated whenever the spec content changes.

### 5.2 Token Sharing
- **Q**: How is the spec access token shared between users? Via the server
  (user A requests the server to grant user B access) or via a shareable link
  (user A generates a link that user B clicks)?

**A:** Via the server. `POST /specs/:id/access { userId, level: "full"|"summary" }`. The spec owner (or project admin) explicitly grants access to specific users. No shareable links — links can be forwarded to unauthorized users and are harder to audit. The grant is recorded in PostgreSQL with an audit trail.

- **Q**: Should access tokens be revocable? The PRD says that once knowledge
  is shared, the sharing "can not be undone" at the content level, but should
  the token be revocable for future changes?

**A:** Yes, the access grant is revocable for future access. `DELETE /specs/:id/access/:userId` removes the user's access to future versions. The PRD correctly notes that knowledge already seen cannot be "unshared" — but revoking access prevents the user from seeing future updates. The revocation is logged in the audit trail.

- **Q**: Should there be an expiration on spec access grants, or are they
  indefinite until explicitly revoked?

**A:** Indefinite until explicitly revoked. Time-based expiration adds complexity (cron job to expire grants, notification system for expiring access) without clear benefit for a knowledge management system. The owner can revoke access at any time. Simplicity wins here.

### 5.3 Agent Permissions
- **Q**: When an agent operates on behalf of a user, does it inherit that
  user's spec permissions? Can the agent see private specs that its user can't?

**A:** The agent inherits the user's exact permissions. It cannot see specs the user cannot see. The agent operates with the user's identity for all permission checks. This is the principle of least privilege — the agent is an extension of the user, not a privileged actor. The Claude Code process is sandboxed to the project directory, and the MCP tools enforce permission checks using the session's user ID.

- **Q**: Should agents be able to create private specs, and if so, who gets
  initial access?

**A:** Agents can create specs (public by default, like any other spec). If the user explicitly asks the agent to create a private spec, the agent sets the privacy flag and grants full access to the requesting user. Only the requesting user has access initially. The agent itself does not need persistent access — it operates within the user's session and inherits their permissions.

---

## 6. Session Management

### 6.1 Session Strategy
- **Q**: Should sessions be tracked via refresh tokens (as proposed) or via a
  separate session table? Refresh tokens as sessions is simple but conflates
  two concepts.

**A:** Use refresh tokens as session identifiers. The `refresh_tokens` table serves as the session table: each row has `id`, `userId`, `token` (hashed), `userAgent`, `ipAddress`, `createdAt`, `expiresAt`, `revokedAt`. This avoids maintaining two separate tables for the same concept. The refresh token IS the session. Active sessions = non-expired, non-revoked refresh tokens.

- **Q**: What should happen when a user's role changes (e.g., demoted from
  admin)? Should existing sessions continue with old permissions until token
  refresh, or should all sessions be immediately invalidated?

**A:** Existing sessions continue with old permissions until the next access token refresh (within 15 minutes). The access token contains the role, and it's impractical to invalidate all access tokens immediately (they're stateless). The next time the user refreshes, the new access token contains the updated role. For critical demotions, an admin can force-revoke all of the user's refresh tokens, which invalidates all sessions.

- **Q**: Should there be a "remember me" option that extends the refresh token
  TTL (e.g., 30 days vs 7 days)?

**A:** Yes. Default refresh token TTL: 7 days. "Remember me" TTL: 30 days. The login endpoint accepts a `rememberMe: boolean` field. The frontend presents a "Remember me" checkbox on the login form. Both TTLs are configurable via environment variables.

### 6.2 Multi-Device
- **Q**: Is 10 concurrent sessions per user the right limit? Power users may
  have multiple browsers, mobile devices, and API clients.

**A:** 10 is sufficient. This covers: 2-3 browsers, 1-2 mobile devices, and several API clients. If a user hits the limit, they can view and revoke sessions via `GET /auth/sessions` and `DELETE /auth/sessions/:id`. The limit is configurable via `MAX_SESSIONS_PER_USER=10`.

- **Q**: When the session limit is reached, should the oldest session be
  automatically revoked, or should the new login be rejected until the user
  manually revokes a session?

**A:** Automatically revoke the oldest session. This is the least friction for the user — they likely don't remember or care about the oldest session. Log the automatic revocation. The user can view active sessions in their profile if they want more control. Rejecting login is a poor UX that punishes multi-device users.

---

## 7. CSRF Protection

### 7.1 Strategy
- **Q**: Is the double-submit cookie pattern sufficient, or should the server
  use the synchronizer token pattern (session-stored token)? The synchronizer
  pattern is more secure but requires server-side state.

**A:** Double-submit cookie is sufficient. It's stateless (no server-side storage), works well with JWT cookie auth, and provides adequate CSRF protection. The synchronizer token pattern's added security (protection against cookie injection attacks) is not necessary given that the cookies use `Secure`, `SameSite=lax`, and the CSRF token is tied to the session.

- **Q**: Should CSRF protection apply to all state-changing requests, or only
  to requests authenticated via cookies? Bearer token requests are not
  vulnerable to CSRF.

**A:** Only cookie-authenticated requests. If the request includes a `Bearer` token in the `Authorization` header, skip CSRF validation — Bearer tokens are not automatically attached by the browser and are immune to CSRF. This keeps CLI and API client usage simple while protecting browser-based sessions.

- **Q**: Should the CSRF token be rotated on every request, on every session
  refresh, or have a fixed TTL?

**A:** Rotate on every session refresh (when the access token is refreshed). This provides a reasonable rotation frequency (every 15 minutes) without the overhead of per-request rotation. The CSRF token is re-set as a cookie alongside the new access token during the refresh flow.

### 7.2 Implementation
- **Q**: Should CSRF protection be implemented as NestJS middleware (runs for
  all requests) or as a guard (per-route control)? Middleware is simpler but
  guards offer per-route configuration.

**A:** Middleware. CSRF validation should run for all state-changing requests (POST, PUT, PATCH, DELETE) that use cookie authentication. Middleware is the right layer because it runs before guards and controllers, catching CSRF early. The middleware skips requests with Bearer auth and safe HTTP methods (GET, HEAD, OPTIONS).

- **Q**: What should the CSRF token cookie name be? Common choices: `csrf_token`,
  `XSRF-TOKEN` (Angular convention), `_csrf`.

**A:** `XSRF-TOKEN`. This is the convention used by Angular and Axios (both automatically read this cookie and send it as a header). Axios sends it as `X-XSRF-TOKEN` header by default. Using this convention means the frontend HTTP client requires zero CSRF configuration — it works out of the box.

---

## 8. Email Integration

### 8.1 Email Service
- **Q**: Should the server implement email sending for registration verification
  and password reset, or should these features be deferred? Email requires an
  SMTP service or provider integration.

**A:** Implement email for the initial release. Registration verification and password reset are baseline auth features that users expect. Without email, there's no way to recover a forgotten password. Keep the implementation minimal: verification email on registration, password reset email on request.

- **Q**: If email is implemented, which provider should be used? Options:
  SendGrid, AWS SES, Mailgun, local SMTP. Or should it be abstracted with a
  provider interface?

**A:** Abstract with a provider interface (`EmailService` with `sendEmail(to, subject, html)` method). Default implementation: SMTP via `nodemailer` (works with any SMTP server, including self-hosted). This avoids vendor lock-in and works for self-hosted deployments. Configuration: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM`. SES or SendGrid can be added as alternative implementations later.

- **Q**: In development mode, should emails be logged to console, written to
  files, or sent to a local mail server (like MailHog)?

**A:** Logged to console with the full HTML body. In development, the `EmailService` uses a console transport that prints the email subject, recipient, and a preview URL (if using a local mail server) or the full HTML. Also support `SMTP_HOST=localhost:1025` for MailHog if the developer has it running. The console approach requires zero setup.

---

## 9. Security Trade-offs

### 9.1 Defense Depth
- **Q**: How many layers of brute force protection are needed? The plan
  includes: rate limiting, progressive delays, account lockout, and IP blocking.
  Is this overkill for an initial release?

**A:** Three layers for initial release: (1) per-IP rate limiting on login endpoint (10 attempts/minute), (2) progressive delay (add 1 second per failed attempt per account, reset on success), (3) account lockout after 10 consecutive failures (15-minute lockout, admin can unlock). Skip IP blocking for initial release — it requires a persistent blocklist and can lock out shared IPs (corporate NATs, VPNs).

- **Q**: Should the server implement device fingerprinting for suspicious login
  detection, or is IP + user agent sufficient?

**A:** IP + user agent is sufficient. Device fingerprinting requires client-side JavaScript libraries, adds privacy concerns, and is unreliable (fingerprints change with browser updates). Log IP + user agent on login for audit purposes. Users can review their active sessions and spot unfamiliar ones.

- **Q**: Should there be mandatory 2FA support, optional 2FA, or no 2FA in the
  initial release? 2FA significantly improves security but adds UX complexity.

**A:** No 2FA in the initial release. Defer to phase 2. 2FA requires TOTP library integration, QR code generation, backup codes, and recovery flows. The initial release focuses on solid baseline auth (bcrypt, JWT, refresh rotation, rate limiting). Design the user schema with a `twoFactorEnabled` boolean and `twoFactorSecret` column from day one so the migration is clean.

### 9.2 Token Theft Mitigation
- **Q**: Refresh token rotation with reuse detection is proposed. Is this worth
  the implementation complexity, or is a simpler approach (long-lived refresh
  tokens without rotation) acceptable for the initial release?

**A:** Implement rotation with reuse detection. The implementation is straightforward: each refresh token has a `familyId`. On rotation, issue a new token with the same `familyId` and invalidate the old one. If an invalidated token is reused, revoke ALL tokens in the family (all sessions for that user from that login). This detects stolen tokens and is a standard pattern. The complexity is modest (~50 lines of logic).

- **Q**: Should the access token be bound to the client's IP address? This
  prevents token theft but breaks for users on mobile networks where IPs
  change frequently.

**A:** No. IP binding breaks for mobile users, VPN users, and users behind load-balanced corporate proxies. The 15-minute access token TTL already limits the theft window. Refresh token rotation handles the long-term case. Do not bind tokens to IP.

- **Q**: Should the system track and display "last login" information so users
  can detect unauthorized access themselves?

**A:** Yes. Store `lastLoginAt`, `lastLoginIp`, and `lastLoginUserAgent` on the user record, updated on each successful login. Display "Last login: [date] from [IP]" on the dashboard. Also expose `GET /auth/sessions` which lists all active sessions with IP, user agent, and creation time. This empowers users to self-detect compromised accounts.

---

## 10. Future Considerations

### 10.1 OAuth & SSO
- **Q**: Should the architecture be designed to support OAuth 2.0 / OIDC
  integration (Google, GitHub login) in a future phase? This affects the
  user schema (multiple auth providers per user).

**A:** Yes, design for it now. The user table should include: `passwordHash` (nullable — OAuth users may not have passwords), and a related `user_auth_providers` table with `userId`, `provider` (e.g., "github", "google"), `providerId`, `providerEmail`, `accessToken`, `refreshToken`. A user can have multiple auth providers linked. This schema is created from day one even though OAuth login is phase 2.

- **Q**: Should the API be designed as an OAuth 2.0 authorization server
  itself (for third-party integrations), or only as a resource server?

**A:** Resource server only. Building an OAuth 2.0 authorization server (token issuance, client registration, consent flows) is a massive undertaking and unnecessary for this application. The API keys feature (phase 2) covers programmatic access. If third-party integration is needed in the future, use a dedicated OAuth provider (Keycloak, Auth0) in front of the API.

### 10.2 API Keys
- **Q**: Should the system support API keys for programmatic access (CI/CD,
  scripts, external tools)? API keys are long-lived and don't require the
  cookie/refresh flow.

**A:** Yes, in phase 2. API keys are generated by users via `POST /auth/api-keys { name, scopes, expiresAt }`. Keys are stored hashed in an `api_keys` table. They're sent as `Bearer` tokens and validated by the same auth guard. Each key has a name (for identification), optional expiration, and scoped permissions.

- **Q**: If API keys are supported, should they have scoped permissions
  (read-only, specific project, etc.)?

**A:** Yes. Scopes: `read` (all GET operations), `write` (GET + POST/PATCH/DELETE), `project:{projectId}` (restrict to specific project). Scopes are stored as a JSON array on the key record and checked by the auth guard. A key with `["read", "project:abc123"]` can only read resources in project `abc123`.
