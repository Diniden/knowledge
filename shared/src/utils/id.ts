/**
 * Generate a UUID v4 for spec IDs, edge IDs, etc.
 */
export function generateId(): string {
  return crypto.randomUUID();
}
