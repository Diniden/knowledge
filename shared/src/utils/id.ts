/**
 * Generates a UUID v4 using the Web Crypto API (available in both browsers and Bun/Node).
 */
export function generateId(): string {
  return crypto.randomUUID();
}

/**
 * Generates a short (8-char) ID suitable for human-readable references.
 * NOT cryptographically unique — use generateId() for entity IDs.
 */
export function generateShortId(): string {
  return Math.random().toString(36).slice(2, 10);
}

/**
 * Generates a spec ID with a human-readable prefix.
 */
export function generateSpecId(): string {
  return `spec_${generateId()}`;
}

/**
 * Generates an edge ID with a human-readable prefix.
 */
export function generateEdgeId(): string {
  return `edge_${generateId()}`;
}

/**
 * Generates a document ID with a human-readable prefix.
 */
export function generateDocumentId(): string {
  return `doc_${generateId()}`;
}

/**
 * Generates a user ID with a human-readable prefix.
 */
export function generateUserId(): string {
  return `user_${generateId()}`;
}

/**
 * Generates a session ID with a human-readable prefix.
 */
export function generateSessionId(): string {
  return `session_${generateId()}`;
}
