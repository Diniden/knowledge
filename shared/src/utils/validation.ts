import { EdgeType } from '../types/edge.js';
import { PermissionLevel } from '../types/permissions.js';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isValidSpecId(id: string): boolean {
  return typeof id === 'string' && id.startsWith('spec_') && id.length > 5;
}

export function isValidEdgeType(type: string): type is EdgeType {
  return Object.values(EdgeType).includes(type as EdgeType);
}

export function isValidPermissionLevel(
  level: string,
): level is PermissionLevel {
  return Object.values(PermissionLevel).includes(level as PermissionLevel);
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function isValidUUID(value: string): boolean {
  return UUID_REGEX.test(value);
}

export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

export function isValidUsername(username: string): boolean {
  return /^[a-zA-Z0-9_-]{3,30}$/.test(username);
}
