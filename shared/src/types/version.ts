export interface SpecDiff {
  specId: string;
  fromVersion: number;
  toVersion: number;
  changes: Array<{ field: string; oldValue: unknown; newValue: unknown }>;
}

export interface VersionInfo {
  specId: string;
  version: number;
  commitHash: string;
  committedAt: string;
  authorId: string;
}
