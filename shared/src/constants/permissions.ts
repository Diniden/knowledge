import { PermissionLevel } from '../types/permissions.js';

export const PERMISSION_LEVEL_LABELS: Record<PermissionLevel, string> = {
  [PermissionLevel.FULL_ACCESS]: 'Full Access',
  [PermissionLevel.SUMMARY_ACCESS]: 'Summary Access',
};

export const PERMISSION_LEVEL_DESCRIPTIONS: Record<PermissionLevel, string> = {
  [PermissionLevel.FULL_ACCESS]: 'Can read and edit the full spec content.',
  [PermissionLevel.SUMMARY_ACCESS]: 'Can only read the AI-generated summary of the spec.',
};

export const DEFAULT_PERMISSION_LEVEL = PermissionLevel.SUMMARY_ACCESS;
