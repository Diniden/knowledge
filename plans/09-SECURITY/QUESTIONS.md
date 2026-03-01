# 09 — SECURITY: Open Questions

> **Purpose**: Unresolved questions about the security architecture including
> authentication, authorization, encryption, sandboxing, and operational security.
> Answers may change tasks in the plan.

---

## 1. Authentication

### 1.1 Password Policy
- **Q**: Should the password complexity requirements be configurable per
  deployment, or fixed? Some organizations may have stricter requirements.
- **A:** Fixed at launch following NIST 800-63B: 12-character minimum, no composition rules, checked against a breached-password list (Have I Been Pwned top-100k). A future admin-settings panel can expose override knobs if self-hosted users request it, but the defaults are non-negotiable.

- **Q**: Should we implement password expiration (force users to change
  passwords every N days)? This is falling out of favor per NIST 800-63B
  but some enterprises still require it.
- **A:** No forced expiration. NIST 800-63B explicitly recommends against periodic rotation. Passwords are only required to change on evidence of compromise (breached-password list match or admin-initiated force-reset).

- **Q**: Should we support passwordless authentication (magic links, passkeys,
  WebAuthn) as an alternative or replacement for passwords?
- **A:** Not at launch. Passwords + bcryptjs (12 rounds) is the Phase 1 implementation. Passkey/WebAuthn support is a Phase 4+ enhancement. Magic links add email-delivery dependency that is unnecessary for a local-first deployment.

- **Q**: Should we integrate with external identity providers (OAuth2/OIDC
  with Google, GitHub, etc.) for SSO? If so, which providers should be
  supported at launch?
- **A:** Not at launch. SSO adds significant surface area and the system is local-only through Phase 3 targeting 20–50 users. OIDC integration (Google, GitHub) is a Phase 4+ enhancement when hosted/enterprise deployments are considered.

### 1.2 Account Security
- **Q**: Should account lockout be per-IP, per-username, or both? Per-IP
  prevents distributed brute force; per-username prevents targeted attacks.
- **A:** Both. Per-username: lock the account for 15 minutes after 5 consecutive failed attempts. Per-IP: block login attempts for 15 minutes after 20 failed attempts across any username. Rate limiting (sliding window) enforces this at the NestJS guard level.

- **Q**: Should we implement multi-factor authentication (MFA/2FA)? TOTP
  (Google Authenticator), SMS, or WebAuthn? This adds significant
  complexity but is a strong security control.
- **A:** Not at launch. For a local-only, 20–50 user deployment the risk does not justify the complexity. TOTP (Google Authenticator) is the Phase 4+ MFA target. SMS and WebAuthn are deferred further.

- **Q**: How should inactive accounts be handled? Should they be auto-disabled
  after N days of inactivity? Should data be preserved or deleted?
- **A:** No auto-disable at launch. Admins can manually deactivate accounts. Data is always preserved (soft-delete on the user record; specs and contributions remain intact). A future enhancement can add configurable inactivity thresholds (e.g., 180 days).

- **Q**: Should there be an admin ability to impersonate a user (for support
  purposes)? If so, this requires audit logging and strict access control.
- **A:** No impersonation. With 20–50 users the admin can communicate directly. Impersonation creates a high-risk audit surface. If ever added, it must generate a dedicated audit-log event with the impersonating admin's identity and require re-authentication.

---

## 2. JWT & Session Management

### 2.1 Token Configuration
- **Q**: Should we use RS256 (asymmetric) or HS256 (symmetric) for JWT
  signing? RS256 allows separate signing and verification keys (useful for
  microservices); HS256 is simpler for a single server.
- **A:** HS256. The system is a single NestJS server through Phase 3. HS256 is simpler, faster, and sufficient. If the architecture moves to microservices later, migrating to RS256 is straightforward (change the signing config and rotate keys).

- **Q**: Should the access token lifetime be 15 minutes, or shorter/longer?
  Shorter is more secure but causes more refresh requests. The plan
  proposes 15 minutes — is this acceptable?
- **A:** 15 minutes is confirmed. This is the standard balance for a knowledge management app. The refresh mechanism is transparent to the user.

- **Q**: Should the refresh token lifetime be 7 days or longer? For a
  knowledge management platform, users may not visit daily. Should there
  be a "remember me" option that extends refresh token lifetime to 30 days?
- **A:** 7-day refresh token by default. Add a "remember me" checkbox on login that extends the refresh token to 30 days. The refresh token is stored in an http-only, Secure, SameSite=Lax cookie. Refresh tokens are single-use (rotation on each refresh).

- **Q**: Should we implement token revocation via deny list (Redis/memory)
  for access tokens, or is the short lifetime (15 min) sufficient for
  security after logout?
- **A:** The 15-minute lifetime is sufficient for most cases. On explicit logout, the refresh token is revoked server-side (deleted from the database). An in-memory deny list for access tokens is overkill at 20–50 users and is deferred until Redis is introduced.

### 2.2 Session Model
- **Q**: Should we support concurrent sessions (logged in on multiple
  devices)? If so, should there be a maximum concurrent session count?
- **A:** Yes, concurrent sessions are allowed. Maximum 5 active refresh tokens per user. When a 6th session is created, the oldest refresh token is revoked. This is enforced at the database level.

- **Q**: Should users be able to view and revoke individual sessions
  (like "logged in on Chrome, Safari, mobile")? This requires tracking
  sessions in the database with device/browser metadata.
- **A:** Yes, but as a Phase 2 enhancement. At launch, users can "log out all other sessions" (revoke all refresh tokens except the current one). Per-session management (device name, last-used timestamp, individual revoke) comes later.

- **Q**: How should WebSocket sessions relate to JWT expiration? If the
  access token expires mid-WebSocket-session, should the WebSocket
  disconnect, or should WebSocket auth be handled separately?
- **A:** WebSocket connections are authenticated at connection time with the access token. When the access token expires, the server sends a `token_expired` message over the WebSocket. The client must obtain a new access token (via refresh) and send it over the existing WebSocket within 30 seconds; otherwise the connection is closed. This avoids disruptive reconnects.

---

## 3. Authorization & Permissions

### 3.1 Permission Model
- **Q**: The PRD says there is never "no access" — always at least a summary.
  Does this apply to ALL authenticated users, or only users within the same
  project? Can a user in Project A see summaries of specs in Project B?
- **A:** Only within the same project. A user must be a member of a project to see anything in it. Within a project, every member sees at least a summary of every spec (title, status, tags). Cross-project visibility requires explicit project membership.

- **Q**: Should the permission model support custom permission levels beyond
  FULL and SUMMARY (e.g., "can view content but not edit")?
- **A:** Not at launch. Two levels — FULL access (read + write) and SUMMARY access (title/status/tags only) — are sufficient. A "read-only full content" level can be introduced later if demand warrants it, but it adds complexity to the token-based privacy model.

- **Q**: How should permissions work for graph edges? If a user has SUMMARY
  access to Spec A and FULL access to Spec B, and there's an edge between
  them, can the user see the edge? Can they see what the edge connects to
  (Spec A's title)?
- **A:** Edges are always visible to project members. The user can see that an edge exists and see the target spec's title (which is part of the summary). They cannot traverse into the full content of Spec A — clicking the edge shows the summary view. This preserves graph navigability without leaking private content.

- **Q**: Should there be a "public" permission level that makes a spec
  accessible to unauthenticated users? Or is authentication always required?
- **A:** Authentication is always required. No public/anonymous access. The system is local-only through Phase 3. Public sharing can be reconsidered for a hosted offering in Phase 4+.

- **Q**: Who can delete a spec? Only the creator? Anyone with FULL access?
  Only project owners? This has significant implications for data safety.
- **A:** Only project Owners and the spec creator can delete a spec. Users with FULL access can edit but not delete. Deletion is soft-delete (marked deleted, recoverable by owner for 30 days). Once a spec has been shared, the system tracks that exposure permanently regardless of deletion.

### 3.2 Project Roles
- **Q**: Should a project support multiple owners, or exactly one? If the
  owner leaves, how is ownership transferred?
- **A:** Multiple owners (minimum 1). Any owner can promote an Editor to Owner. If the last owner tries to leave, the system blocks the action and requires ownership transfer first. An instance admin can reassign ownership if the sole owner is unreachable.

- **Q**: Should project roles be more granular than Owner/Editor/Viewer?
  For example: "can manage users but not edit specs" or "can edit specs
  but not manage permissions."
- **A:** Three roles at launch: Owner (full control + user management), Editor (read/write specs), Viewer (read-only, sees full content for specs they have access to, summaries for the rest). More granular roles are deferred to Phase 4+.

- **Q**: Should there be organization-level roles that span multiple
  projects (e.g., organization admin who manages all projects)?
- **A:** Not at launch. The system targets 20–50 users and a handful of projects. An instance admin (the person who deployed the server) has superuser access to all projects via a server-level flag. Organization abstractions are deferred.

---

## 4. Encryption Token System

### 4.1 Architecture
- **Q**: Is client-side encryption (encrypt before sending to server)
  preferable to server-side encryption? Client-side is more secure (server
  never sees plaintext) but prevents server-side search/indexing of encrypted
  content. The plan proposes server-side — is this acceptable?
- **A:** Server-side encryption is confirmed. The server encrypts content with AES-256-GCM before writing to git. This allows server-side RAG indexing of plaintext before encryption and keeps the client implementation simple. Full client-side E2E encryption is a Phase 4+ option for high-security deployments.

- **Q**: Should encrypted specs still be searchable via RAG? If the content
  is encrypted in git, it cannot be embedded. Should the RAG index store
  encrypted embeddings, or should encrypted specs be excluded from RAG?
- **A:** The RAG index stores embeddings of the plaintext (computed server-side before encrypting for git storage). The embeddings themselves do not contain reconstructable plaintext. Only users with the appropriate token can retrieve and decrypt the actual content from search results. Users without the token see the spec in search results as a summary only.

- **Q**: Should the summary of an encrypted spec be customizable? The plan
  assumes `spec.json` (title, status) is unencrypted — should the user be
  able to control what appears in the summary?
- **A:** The summary always includes title, status, and tags (from `spec.json`, unencrypted). Users cannot customize which summary fields appear — this keeps the system predictable. If a user wants to hide even the title, they can use an opaque title. The body content in Markdown files is what gets encrypted.

- **Q**: What happens to encrypted specs during graph traversal by agents?
  Can agents access encrypted content if the user who started the session
  has access? Or should agents never see encrypted content?
- **A:** Agents inherit the token set of the user who initiated the session. If the user has the decryption token, the agent can read the decrypted content during that session. The agent's MCP access to the KG is scoped to exactly what the initiating user can see. Agents never persist decrypted content outside the session.

### 4.2 Token Management
- **Q**: Should encryption tokens be per-spec or per-group (e.g., one token
  for all private specs in a document)? Per-spec is more granular but
  creates more tokens to manage.
- **A:** Per-spec tokens by default. Users can optionally create a "token group" that applies a single token to multiple specs, but the underlying model is one token per spec. This provides maximum granularity while allowing convenience grouping when desired.

- **Q**: How should token loss be handled? If the user loses the token and
  it's not in the database, the content is permanently unrecoverable. Should
  there be an admin recovery mechanism?
- **A:** The server stores the encryption token encrypted with a server master key (AES-256-GCM). This means the server can always resolve tokens for authorized users. Token loss by the user is not catastrophic — the server can re-grant access. If the server master key is lost, content is unrecoverable. The master key must be backed up securely by the instance admin.

- **Q**: Should the server store the raw encryption token (encrypted with
  the master key) so that server-side token resolution always works? Or
  should the server only store a hash (so the raw token is needed for
  decryption, and the user must provide it)?
- **A:** The server stores the raw token encrypted with the master key. This enables server-side token resolution, which is required for the RAG indexing workflow and agent access. The trade-off (server can decrypt if master key is compromised) is acceptable for a local-first, admin-controlled deployment.

- **Q**: Should token sharing create a permanent grant, or should grants
  be time-limited (e.g., expires in 30 days)? Time-limited grants are
  more secure but add operational overhead.
- **A:** Permanent grant by default. Per the PRD, once a spec is shared, exposure cannot be undone — the system tracks who had access. Time-limited grants contradict the "exposure is permanent" principle. If revocation is needed, the owner can rotate the token (re-encrypt the spec), which invalidates all existing grants.

### 4.3 User Experience
- **Q**: How should the "mark as private" flow work in the UI? Is it a
  toggle on the spec editor, a right-click option, or a dedicated privacy
  settings panel?
- **A:** A toggle in the spec editor toolbar (lock icon). Clicking it opens a small inline panel showing: privacy status, who has access, and a "share token" action. This keeps the flow contextual without navigating away.

- **Q**: When a user receives a shared token, should they have to enter it
  every time they view the spec, or once (and the server remembers)?
  The plan proposes server-side grants after first entry — is this acceptable?
- **A:** Confirmed: one-time entry. The user enters the token once, the server verifies it, creates a permanent grant in the database, and the user never needs the token again. The server resolves access transparently on subsequent requests.

- **Q**: Should encrypted spec content be visible in git diffs? Currently the
  plan says git diffs of encrypted content are opaque. Should there be a way
  to diff encrypted versions (decrypt locally, diff, show result)?
- **A:** Git diffs of encrypted content remain opaque in the raw git layer. The application UI provides a "diff view" that decrypts both versions server-side (for users with access) and renders a readable diff. This keeps git clean while providing a usable UX.

---

## 5. Input Validation & XSS

- **Q**: Should raw HTML be allowed in spec Markdown content? Some users may
  want to embed custom HTML. If allowed, what tags are safe? If not,
  should HTML tags be stripped or escaped?
- **A:** Raw HTML is stripped during rendering. Spec content is Markdown-only, rendered with a strict allowlist of Markdown features. Any HTML tags in the source are escaped to their entity equivalents on display. This eliminates stored-XSS risk entirely.

- **Q**: Should the application support file uploads (images, attachments
  for specs)? If so, what file types are allowed, and how are they scanned
  for malware?
- **A:** Image uploads only at launch (PNG, JPEG, GIF, WebP, SVG). SVGs are sanitized (stripped of `<script>`, event handlers, `<foreignObject>`). Max file size: 5 MB. Images are stored in the git repo alongside the spec. No malware scanning at launch — file type validation and size limits are the first line of defense. General attachments are deferred.

- **Q**: For the Markdown rendering, should we allow custom components
  (e.g., Mermaid diagrams, LaTeX math, embedded videos)? Each adds XSS
  surface area that must be considered.
- **A:** Mermaid diagrams and LaTeX math (KaTeX) are supported — both are rendered to static SVG/HTML with no script execution. Embedded videos are not supported (no iframes in spec content). All custom rendering is sandboxed through the Markdown renderer's plugin system with output sanitization.

- **Q**: Should user profile fields (display name, bio) be sanitized
  differently from spec content? Profile data appears in many contexts
  (comments, activity feeds, @mentions).
- **A:** Yes. Profile fields are plain text only — no Markdown, no HTML. Display names are limited to 64 characters, alphanumeric + spaces + hyphens. Bios are limited to 256 characters, plain text. All profile data is HTML-escaped on output in every rendering context.

---

## 6. CSRF & Rate Limiting

### 6.1 CSRF
- **Q**: Is the SameSite=Strict cookie approach sufficient for CSRF
  protection, or should we also implement the double-submit cookie pattern
  as defense-in-depth? SameSite=Strict can break legitimate cross-site
  navigation (e.g., clicking a link to the app from an email).
- **A:** Use SameSite=Lax (not Strict) combined with the double-submit cookie pattern per the PRD. Lax allows top-level GET navigations (email links work), while the double-submit cookie protects state-changing requests (POST/PUT/DELETE). This is defense-in-depth.

- **Q**: Should we use SameSite=Lax instead of Strict? Lax allows top-level
  navigations (GET requests) but blocks cross-site POST. This is more
  user-friendly but slightly less secure.
- **A:** Yes, SameSite=Lax is confirmed (see above). Combined with double-submit cookie CSRF tokens, this provides equivalent protection to Strict without breaking inbound link navigation.

### 6.2 Rate Limiting
- **Q**: Should authenticated users have higher rate limits than
  unauthenticated users? The plan treats them equally per IP — should
  per-user limits be separate?
- **A:** Yes. Unauthenticated endpoints (login, register): 20 requests/minute per IP. Authenticated API endpoints: 120 requests/minute per user. This prevents a single user from monopolizing the server while giving authenticated users reasonable throughput.

- **Q**: Should rate limits be configurable per deployment (self-hosted users
  may want different limits)?
- **A:** Yes, via environment variables. Defaults are baked in; self-hosted admins can override via `RATE_LIMIT_AUTH`, `RATE_LIMIT_UNAUTH`, and `RATE_LIMIT_AGENT` env vars.

- **Q**: How should rate limiting interact with agent sessions? Agents make
  many rapid API calls. Should MCP tool calls from agents be exempt from
  standard rate limits, with separate agent-specific limits?
- **A:** Agent MCP tool calls have a separate, higher rate limit: 300 requests/minute per agent session. This is tracked per session ID, not per user. The limit prevents runaway agents without throttling normal interactive use.

- **Q**: Should rate limiting use a sliding window, fixed window, or token
  bucket algorithm? Each has different burst behavior characteristics.
- **A:** Sliding window. It provides smoother enforcement than fixed window (no burst-at-boundary problem) and is simpler to reason about than token bucket. Implemented in-memory at launch; migrated to Redis when Redis is introduced.

---

## 7. Iframe & Agent Sandboxing

### 7.1 Iframe Security
- **Q**: Should generated UI iframes have network access at all? The plan
  allows `connect-src` to the API, but should generated UIs be completely
  offline (static rendering only)?
- **A:** Generated UI iframes are completely offline — no network access. CSP: `default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob:;`. The iframe sandbox attributes include `allow-forms` but NOT `allow-same-origin`, per the PRD. All data the UI needs is injected at render time via `postMessage`.

- **Q**: Should generated UIs be allowed to use Web Workers, Service
  Workers, or WebAssembly? Each introduces additional security surface area.
- **A:** No Service Workers (blocked by sandbox without `allow-same-origin`). Web Workers are allowed for computation-heavy UIs. WebAssembly is blocked at launch via CSP (`script-src` does not include `'wasm-unsafe-eval'`). This can be revisited if a compelling use case arises.

- **Q**: Should the gen-ui origin be a separate subdomain or a completely
  separate domain? Separate domains provide stronger isolation but add
  DNS/certificate management complexity.
- **A:** Sandboxed iframes with `sandbox="allow-scripts allow-forms"` (no `allow-same-origin`) effectively create a null origin, providing complete isolation without needing a separate domain. No additional DNS or certificate management required. This is sufficient for a local-first deployment.

- **Q**: Should generated UI content be pre-scanned (static analysis) before
  serving, or is the CSP + sandbox combination sufficient?
- **A:** CSP + sandbox is sufficient for launch. The null-origin sandbox prevents any meaningful attack against the parent frame. Static analysis of generated code is a nice-to-have for Phase 4+ (e.g., detecting obviously malicious patterns), but the security boundary is enforced by the browser, not by scanning.

### 7.2 Agent Sandboxing
- **Q**: Should agents run in Docker containers for stronger isolation, or
  are OS-level process restrictions sufficient? Docker adds overhead but
  provides better isolation (filesystem, network, PID namespace).
- **A:** Claude Code runs as an OS-level process sandboxed to the project directory, per the PRD. No Docker isolation for agents at launch — it adds startup latency and complexity. Filesystem access is restricted to the project directory; KG access is MCP-only. Docker-based agent isolation is a Phase 4+ enhancement for hosted/multi-tenant deployments.

- **Q**: Should agents have internet access for tasks like fetching
  documentation or checking package registries? The plan restricts network
  access to localhost only — this may limit agent capability.
- **A:** Agents have internet access for package registry lookups (npm, crates.io, etc.) and documentation fetching. Network is NOT restricted to localhost — that would cripple code generation. However, agents cannot make arbitrary outbound requests to user-specified URLs. The allowed domains are configurable via an allowlist in the server config.

- **Q**: How should agent resource limits (memory, CPU, time) be determined?
  Should they be configurable per project or per user tier?
- **A:** Fixed limits at launch: 4 GB memory, 60-minute wall-clock timeout per execution step, no explicit CPU limit (OS scheduling is sufficient for 20–50 users). These are configurable via environment variables for self-hosted deployments. Per-project/per-tier limits are deferred.

- **Q**: Should there be a concept of "trusted agents" that have broader
  permissions (e.g., admin-configured agents that can access all specs)?
- **A:** No. Agents always inherit the permissions of the user who initiated the session. There is no "superuser agent" concept. If an admin needs an agent with broad access, they initiate the session as an admin (whose token set grants access to everything they own/manage).

---

## 8. Operational Security

### 8.1 Secret Management
- **Q**: Should we require a vault (HashiCorp Vault, AWS Secrets Manager)
  for production, or are environment variables sufficient? Vaults add
  complexity but provide rotation, auditing, and access control for secrets.
- **A:** Environment variables are sufficient for launch. The system is local-only, single-server, targeting 20–50 users. Secrets include: JWT signing key, database password, server master key (for token encryption), and Anthropic API key. These are loaded from a `.env` file not committed to git. Vault integration is a Phase 4+ enhancement for hosted deployments.

- **Q**: How should secrets be managed in CI/CD environments? GitHub Secrets,
  dedicated CI vault, or environment-specific `.env` files?
- **A:** GitHub Actions Secrets (encrypted, scoped to repository). CI needs: database test credentials, Sentry DSN, and Docker registry credentials. No production secrets in CI — CI deploys via SSH and the production `.env` is managed on the server directly.

- **Q**: Should the application support runtime secret rotation without
  restart? This is important for zero-downtime key rotation but adds
  implementation complexity.
- **A:** Not at launch. A server restart is acceptable for secret rotation at 20–50 users. The restart is brief (Bun startup is sub-second). Runtime rotation is a Phase 4+ enhancement.

### 8.2 Audit & Monitoring
- **Q**: How long should audit logs be retained? 90 days? 1 year? Forever?
  Longer retention uses more storage but provides better forensic capability.
  Regulatory requirements may dictate minimums.
- **A:** 1 year retention. Audit logs older than 1 year are archived (compressed, moved to cold storage on disk) rather than deleted. This provides adequate forensic coverage without unbounded database growth. The archive can be queried if needed.

- **Q**: Should audit logs be stored in the same database as application data,
  or in a separate database/service? Separate storage prevents an attacker
  who compromises the app database from also deleting audit trails.
- **A:** Same PostgreSQL database at launch, in a dedicated `audit_logs` table/schema. Separate storage is overkill for a single-server, local-only deployment. The table uses append-only permissions (the application database user has INSERT but not DELETE/UPDATE on the audit table). Separate storage is a Phase 4+ enhancement.

- **Q**: Should the system implement real-time security alerting (e.g.,
  alert on multiple failed logins, unusual geographic access, sudden spike
  in 403 errors)? What alerting channels (email, Slack, PagerDuty)?
- **A:** Not at launch. Per the PRD, simple monitoring initially. Structured JSON logs (via Pino) capture all security events. Sentry captures errors. The admin can grep logs for patterns. Automated alerting (failed login spikes, 403 bursts) is a Phase 3+ enhancement; the channel will be email or Slack webhook, configurable via env var.

- **Q**: Should audit logs be tamper-proof (append-only, hash-chained)?
  This prevents a compromised admin from silently deleting evidence.
- **A:** Append-only at the database permission level (see above). Hash-chaining is deferred — it adds complexity and the threat model for a local-only deployment is lower. If regulatory compliance requires it, hash-chaining can be added to the audit log pipeline.

### 8.3 Incident Response
- **Q**: What is the expected team size for incident response? A single
  developer or a dedicated security team? This affects the complexity of
  procedures.
- **A:** Single developer (the instance admin) for launch. Incident response procedures should be a simple runbook: check Sentry, check structured logs, identify affected users, rotate compromised credentials, restart services. No formal SIRT.

- **Q**: Should the system have a "maintenance mode" that restricts all
  access except for admins? Useful during active incidents.
- **A:** Yes. A simple maintenance mode flag (env var or database setting) that returns HTTP 503 to all non-admin requests. Admin access is determined by a server-level flag on the user record. This is low-effort to implement and valuable during incidents or migrations.

- **Q**: Should there be automated incident detection (anomaly detection on
  audit logs) or only manual detection through monitoring dashboards?
- **A:** Manual detection only at launch (Sentry alerts + log review). Automated anomaly detection is a Phase 4+ enhancement. The structured JSON logging format makes it easy to pipe logs into an anomaly detection tool later.

---

## 9. Compliance & Privacy

- **Q**: Are there specific regulatory requirements to comply with (GDPR,
  SOC2, HIPAA)? These significantly affect data handling, audit logging,
  and user rights.
- **A:** No specific regulatory requirements at launch. The system is local-only and self-hosted. However, the architecture should not preclude future GDPR compliance — design data models with deletion/export in mind. SOC2 and HIPAA are out of scope.

- **Q**: Should the system support "right to be forgotten" (GDPR Article 17)?
  This requires being able to delete all user data including spec
  contributions, audit logs, and agent session history.
- **A:** Best-effort support at launch. User account deletion removes: profile data, dialog sessions, agent sessions, and personal preferences. Spec contributions are attributed to "deleted user" (anonymized, not removed — other users depend on the content). Audit log entries are retained but anonymized (user ID replaced with a hash). Full GDPR-compliant erasure is a Phase 4+ task.

- **Q**: Should there be a privacy policy and terms of service that users
  must accept? Where are these hosted, and how is acceptance tracked?
- **A:** Not required for a self-hosted, local-only deployment. If the system is ever offered as a hosted service, a privacy policy and ToS will be required, served from the application itself, with acceptance tracked via a `tos_accepted_at` timestamp on the user record.

- **Q**: Should user data be exportable (GDPR data portability)? In what
  format?
- **A:** Yes, as a Phase 2 feature. Users can export their data as a JSON archive containing: profile, specs they created, dialog history, and agent session summaries. The knowledge graph content is already in git (inherently exportable). The export endpoint is admin-triggered or self-service.

---

## 10. Future Security Considerations

- **Q**: Should we plan for end-to-end encryption of all spec content (not
  just private specs)? This would mean the server never sees plaintext,
  but it fundamentally changes the architecture (no server-side search,
  no agent content access).
- **A:** No. E2E encryption of all content is incompatible with server-side RAG, agent access, and the current architecture. The per-spec token-based encryption system provides privacy for sensitive content while keeping the majority of the knowledge graph searchable and agent-accessible.

- **Q**: Should we implement a bug bounty or responsible disclosure program
  from launch?
- **A:** A responsible disclosure policy (security.txt in the repo, email contact) should be present from launch. A formal bug bounty program with monetary rewards is deferred until the system has a broader user base and dedicated security budget.

- **Q**: Should the system support hardware security keys (FIDO2/WebAuthn)
  for authentication? This is the strongest form of 2FA.
- **A:** Deferred to Phase 4+, alongside TOTP. WebAuthn is the preferred long-term MFA mechanism, but it requires frontend WebAuthn API integration, server-side credential storage, and is not justified for a 20–50 user local deployment.

- **Q**: Should we implement certificate pinning for mobile clients (if a
  mobile app is ever planned)?
- **A:** No mobile app is planned. Certificate pinning is not applicable. If a mobile app is ever built, certificate pinning should be evaluated at that time, but note that it is increasingly discouraged due to operational complexity and limited security benefit over proper CA validation.

---

## Decision Log

> Record decisions as questions are resolved.

| Date | Question | Decision | Rationale |
|------|----------|----------|-----------|
| — | — | — | — |
