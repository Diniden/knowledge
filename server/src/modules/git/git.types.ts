export interface GitFileChange {
  path: string;
  status: 'added' | 'modified' | 'deleted' | 'renamed' | 'copied';
  oldPath?: string;
}

export interface GitStatus {
  staged: GitFileChange[];
  unstaged: GitFileChange[];
  untracked: string[];
  conflicted: string[];
}

export interface GitBranch {
  name: string;
  current: boolean;
  commitHash: string;
  remote?: string;
}

export interface GitCommit {
  hash: string;
  shortHash: string;
  author: { name: string; email: string };
  date: string;
  message: string;
}

export interface GitCommitDetail extends GitCommit {
  files: GitFileChange[];
  diff: string;
}

export interface GitLogOptions {
  limit?: number;
  since?: string;
  until?: string;
  author?: string;
  path?: string;
}

export interface GitMergeResult {
  success: boolean;
  conflicts?: string[];
  commitHash?: string;
}

export interface GitPullResult {
  success: boolean;
  updatedFiles: string[];
  conflicts?: string[];
}

export interface DiffOptions {
  cached?: boolean;
  commitA?: string;
  commitB?: string;
  paths?: string[];
  unified?: number;
}

export interface DiffFile {
  path: string;
  oldPath?: string;
  status: 'added' | 'modified' | 'deleted' | 'renamed';
  hunks: DiffHunk[];
  additions: number;
  deletions: number;
}

export interface DiffHunk {
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  header: string;
  lines: DiffLine[];
}

export interface DiffLine {
  type: 'context' | 'addition' | 'deletion';
  content: string;
  oldLineNumber?: number;
  newLineNumber?: number;
}

export interface DiffStat {
  filesChanged: number;
  insertions: number;
  deletions: number;
}

export interface ConflictFile {
  path: string;
  oursContent: string;
  theirsContent: string;
  baseContent: string;
}
