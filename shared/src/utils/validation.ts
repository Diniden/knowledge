import { EdgeType } from '../types/edge.js';
import { PermissionLevel } from '../types/permissions.js';

const SPEC_ID_REGEX = /^[a-z0-9-]{8,64}$/;
const EDGE_TYPES = new Set(Object.values(EdgeType));
const PERMISSION_LEVELS = new Set(Object.values(PermissionLevel));

export function isValidSpecId(id: string): boolean {
  return typeof id === 'string' && SPEC_ID_REGEX.test(id);
}

export function isValidEdgeType(value: string): value is EdgeType {
  return EDGE_TYPES.has(value as EdgeType);
}

export function isValidPermissionLevel(
  value: string,
): value is PermissionLevel {
  return PERMISSION_LEVELS.has(value as PermissionLevel);
}
