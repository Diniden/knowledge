export interface DiffChange {
  type: 'add' | 'delete' | 'modify';
  lineStart: number;
  lineEnd: number;
  content: string;
  newContent?: string;
}

export interface SpecDiff {
  specId: string;
  fromHash: string;
  toHash: string;
  additions: number;
  deletions: number;
  changes: DiffChange[];
}

export interface VersionInfo {
  hash: string;
  message: string;
  author: string;
  timestamp: string;
  specId: string;
}
