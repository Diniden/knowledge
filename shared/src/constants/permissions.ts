import { PermissionLevel } from '../types/permissions.js';

export const PERMISSION_LEVELS = Object.values(PermissionLevel);

export const PERMISSION_LEVEL_LABELS: Record<PermissionLevel, string> = {
  [PermissionLevel.FULL_ACCESS]: 'Full Access',
  [PermissionLevel.SUMMARY_ACCESS]: 'Summary Only',
};
