export interface VersionInfo {
  commitHash: string;
  commitMessage: string;
  author: string;
  authorEmail: string;
  timestamp: string;
  version: number;
}

export interface SpecDiff {
  specId: string;
  fromCommit: string;
  toCommit: string;
  changes: DiffHunk[];
  summary: string;
}

export interface DiffHunk {
  type: 'added' | 'removed' | 'unchanged';
  content: string;
  lineStart: number;
  lineEnd: number;
}

export interface VersionHistory {
  specId: string;
  versions: VersionInfo[];
}

export interface RevertSpecDto {
  specId: string;
  targetCommitHash: string;
  message?: string;
}
