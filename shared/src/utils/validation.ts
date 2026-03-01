import { EdgeType } from '../types/edge.js';
import { PermissionLevel } from '../types/permissions.js';

export function isValidSpecId(id: unknown): id is string {
  return typeof id === 'string' && id.startsWith('spec_') && id.length > 5;
}

export function isValidEdgeId(id: unknown): id is string {
  return typeof id === 'string' && id.startsWith('edge_') && id.length > 5;
}

export function isValidDocumentId(id: unknown): id is string {
  return typeof id === 'string' && id.startsWith('doc_') && id.length > 4;
}

export function isValidUserId(id: unknown): id is string {
  return typeof id === 'string' && id.startsWith('user_') && id.length > 5;
}

export function isValidEdgeType(type: unknown): type is EdgeType {
  return typeof type === 'string' && Object.values(EdgeType).includes(type as EdgeType);
}

export function isValidPermissionLevel(level: unknown): level is PermissionLevel {
  return typeof level === 'string' && Object.values(PermissionLevel).includes(level as PermissionLevel);
}

export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

export function isValidEmail(email: unknown): email is string {
  if (typeof email !== 'string') return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function isValidUsername(username: unknown): username is string {
  if (typeof username !== 'string') return false;
  return /^[a-zA-Z0-9_-]{3,32}$/.test(username);
}
