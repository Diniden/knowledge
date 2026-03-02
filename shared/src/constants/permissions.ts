import { PermissionLevel } from '../types/permissions.js';

export const PERMISSION_LEVELS = {
  [PermissionLevel.FULL_ACCESS]: {
    value: PermissionLevel.FULL_ACCESS,
    label: 'Full Access',
    description: 'Complete read/write access to the spec content',
    canRead: true,
    canWrite: true,
    canViewFull: true,
  },
  [PermissionLevel.SUMMARY_ACCESS]: {
    value: PermissionLevel.SUMMARY_ACCESS,
    label: 'Summary Only',
    description: 'Can only view the summary and metadata, not full content',
    canRead: true,
    canWrite: false,
    canViewFull: false,
  },
} as const;

export const DEFAULT_PERMISSION_LEVEL = PermissionLevel.FULL_ACCESS;
