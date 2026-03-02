export enum PermissionLevel {
  FULL_ACCESS = 'FULL_ACCESS',
  SUMMARY_ACCESS = 'SUMMARY_ACCESS',
}

export interface PermissionGrant {
  specId: string;
  userId: string;
  level: PermissionLevel;
  grantedBy: string;
  grantedAt: string;
  token?: string;
}
