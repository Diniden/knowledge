import { Injectable, Logger } from '@nestjs/common';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { access } from 'node:fs/promises';
import { GitError } from '@kg/shared';
import type {
  GitStatus,
  GitFileChange,
  GitBranch,
  GitCommit,
  GitCommitDetail,
  GitLogOptions,
  GitMergeResult,
  GitPullResult,
} from './git.types';

const execAsync = promisify(exec);

const PORCELAIN_STATUS_MAP: Record<string, GitFileChange['status']> = {
  A: 'added',
  M: 'modified',
  D: 'deleted',
  R: 'renamed',
  C: 'copied',
};

function mapStatusCode(code: string): GitFileChange['status'] {
  return PORCELAIN_STATUS_MAP[code] ?? 'modified';
}

@Injectable()
export class GitService {
  private readonly logger = new Logger(GitService.name);

  // ── Helper ──────────────────────────────────────────────────────────

  private async execGit(repoPath: string, args: string[]): Promise<string> {
    try {
      const { stdout } = await execAsync(`git ${args.join(' ')}`, {
        cwd: repoPath,
        maxBuffer: 10 * 1024 * 1024,
      });
      return stdout.trim();
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown git error';
      this.logger.error(`git ${args[0]} failed in ${repoPath}: ${msg}`);
      throw new GitError(`git ${args[0]} failed: ${msg}`);
    }
  }

  private async assertRepo(repoPath: string): Promise<void> {
    try {
      await access(repoPath);
    } catch {
      throw new GitError(`Path does not exist: ${repoPath}`);
    }

    const isGit = await this.isRepo(repoPath);
    if (!isGit) {
      throw new GitError(`Not a git repository: ${repoPath}`);
    }
  }

  // ── Repository Operations ───────────────────────────────────────────

  async init(repoPath: string): Promise<void> {
    try {
      await access(repoPath);
    } catch {
      throw new GitError(`Path does not exist: ${repoPath}`);
    }
    await this.execGit(repoPath, ['init']);
    this.logger.log(`Initialized git repo at ${repoPath}`);
  }

  async clone(url: string, targetPath: string): Promise<void> {
    try {
      await execAsync(`git clone ${url} ${targetPath}`, {
        maxBuffer: 10 * 1024 * 1024,
      });
      this.logger.log(`Cloned ${url} to ${targetPath}`);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown git error';
      throw new GitError(`git clone failed: ${msg}`);
    }
  }

  async isRepo(path: string): Promise<boolean> {
    try {
      await execAsync('git rev-parse --is-inside-work-tree', { cwd: path });
      return true;
    } catch {
      return false;
    }
  }

  // ── Staging & Committing ────────────────────────────────────────────

  async status(repoPath: string): Promise<GitStatus> {
    await this.assertRepo(repoPath);
    const raw = await this.execGit(repoPath, ['status', '--porcelain=v1']);
    return this.parseStatus(raw);
  }

  async add(repoPath: string, files: string[]): Promise<void> {
    await this.assertRepo(repoPath);
    await this.execGit(repoPath, ['add', '--', ...files]);
  }

  async addAll(repoPath: string): Promise<void> {
    await this.assertRepo(repoPath);
    await this.execGit(repoPath, ['add', '-A']);
  }

  async commit(
    repoPath: string,
    message: string,
    author?: { name: string; email: string },
  ): Promise<string> {
    await this.assertRepo(repoPath);

    const args = ['commit', '-m', message];
    if (author) {
      args.push('--author', `${author.name} <${author.email}>`);
    }

    const output = await this.execGit(repoPath, args);
    return this.extractCommitHash(output);
  }

  async commitAmend(repoPath: string, message?: string): Promise<string> {
    await this.assertRepo(repoPath);

    const args = ['commit', '--amend', '--no-edit'];
    if (message) {
      args.splice(2, 0, '-m', message);
      // remove --no-edit when a new message is provided
      const noEditIdx = args.indexOf('--no-edit');
      if (noEditIdx !== -1) args.splice(noEditIdx, 1);
    }

    const output = await this.execGit(repoPath, args);
    return this.extractCommitHash(output);
  }

  // ── Branch Operations ───────────────────────────────────────────────

  async getCurrentBranch(repoPath: string): Promise<string> {
    await this.assertRepo(repoPath);
    try {
      return await this.execGit(repoPath, ['branch', '--show-current']);
    } catch {
      // Detached HEAD — return the short hash instead
      return this.execGit(repoPath, ['rev-parse', '--short', 'HEAD']);
    }
  }

  async listBranches(repoPath: string): Promise<GitBranch[]> {
    await this.assertRepo(repoPath);

    const raw = await this.execGit(repoPath, [
      'branch',
      '-v',
      '--no-abbrev',
      '--format=%(HEAD)|%(refname:short)|%(objectname)|%(upstream:short)',
    ]);

    if (!raw) return [];

    return raw
      .split('\n')
      .filter(Boolean)
      .map((line) => {
        const [head, name, commitHash, remote] = line.split('|');
        return {
          name: name ?? '',
          current: head === '*',
          commitHash: commitHash ?? '',
          remote: remote || undefined,
        };
      });
  }

  async createBranch(
    repoPath: string,
    name: string,
    startPoint?: string,
  ): Promise<void> {
    await this.assertRepo(repoPath);
    const args = ['branch', name];
    if (startPoint) args.push(startPoint);
    await this.execGit(repoPath, args);
  }

  async switchBranch(repoPath: string, name: string): Promise<void> {
    await this.assertRepo(repoPath);
    await this.execGit(repoPath, ['checkout', name]);
  }

  async deleteBranch(
    repoPath: string,
    name: string,
    force = false,
  ): Promise<void> {
    await this.assertRepo(repoPath);
    const flag = force ? '-D' : '-d';
    await this.execGit(repoPath, ['branch', flag, name]);
  }

  async mergeBranch(repoPath: string, source: string): Promise<GitMergeResult> {
    await this.assertRepo(repoPath);

    try {
      const output = await this.execGit(repoPath, ['merge', source]);
      const hashMatch = /([a-f0-9]{7,40})/.exec(output);
      return {
        success: true,
        commitHash: hashMatch?.[1],
      };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : '';

      if (msg.includes('CONFLICT') || msg.includes('Merge conflict')) {
        const conflicts = await this.getConflictedFiles(repoPath);
        return { success: false, conflicts };
      }

      throw error instanceof GitError
        ? error
        : new GitError(`Merge failed: ${msg}`);
    }
  }

  // ── Remote Operations ───────────────────────────────────────────────

  async addRemote(repoPath: string, name: string, url: string): Promise<void> {
    await this.assertRepo(repoPath);
    await this.execGit(repoPath, ['remote', 'add', name, url]);
  }

  async push(
    repoPath: string,
    remote = 'origin',
    branch?: string,
  ): Promise<void> {
    await this.assertRepo(repoPath);
    const args = ['push', remote];
    if (branch) args.push(branch);
    await this.execGit(repoPath, args);
  }

  async pull(
    repoPath: string,
    remote = 'origin',
    branch?: string,
  ): Promise<GitPullResult> {
    await this.assertRepo(repoPath);

    try {
      const args = ['pull', remote];
      if (branch) args.push(branch);
      const output = await this.execGit(repoPath, args);

      const updatedFiles = this.parsePullUpdatedFiles(output);
      return { success: true, updatedFiles };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : '';

      if (msg.includes('CONFLICT') || msg.includes('Merge conflict')) {
        const conflicts = await this.getConflictedFiles(repoPath);
        return { success: false, updatedFiles: [], conflicts };
      }

      throw error instanceof GitError
        ? error
        : new GitError(`Pull failed: ${msg}`);
    }
  }

  async fetch(repoPath: string, remote = 'origin'): Promise<void> {
    await this.assertRepo(repoPath);
    await this.execGit(repoPath, ['fetch', remote]);
  }

  // ── History ─────────────────────────────────────────────────────────

  async log(repoPath: string, options?: GitLogOptions): Promise<GitCommit[]> {
    await this.assertRepo(repoPath);

    const SEP = '@@SEP@@';
    const format = ['%H', '%h', '%an', '%ae', '%aI', '%s'].join(SEP);

    const args = ['log', `--format=${format}`];

    if (options?.limit) args.push(`-n`, String(options.limit));
    if (options?.since) args.push(`--since=${options.since}`);
    if (options?.until) args.push(`--until=${options.until}`);
    if (options?.author) args.push(`--author=${options.author}`);
    if (options?.path) args.push('--', options.path);

    try {
      const raw = await this.execGit(repoPath, args);
      if (!raw) return [];

      return raw
        .split('\n')
        .filter(Boolean)
        .map((line) => {
          const parts = line.split(SEP);
          return {
            hash: parts[0] ?? '',
            shortHash: parts[1] ?? '',
            author: { name: parts[2] ?? '', email: parts[3] ?? '' },
            date: parts[4] ?? '',
            message: parts[5] ?? '',
          };
        });
    } catch {
      return [];
    }
  }

  async logFile(
    repoPath: string,
    filePath: string,
    limit?: number,
  ): Promise<GitCommit[]> {
    return this.log(repoPath, { path: filePath, limit });
  }

  async show(repoPath: string, commitHash: string): Promise<GitCommitDetail> {
    await this.assertRepo(repoPath);

    const SEP = '@@SEP@@';
    const format = ['%H', '%h', '%an', '%ae', '%aI', '%s'].join(SEP);

    const header = await this.execGit(repoPath, [
      'show',
      '--format=' + format,
      '--stat',
      '--no-patch',
      commitHash,
    ]);

    const parts = header.split('\n')[0]?.split(SEP) ?? [];

    const diffRaw = await this.execGit(repoPath, [
      'show',
      '--format=',
      '--patch',
      commitHash,
    ]);

    const nameStatusRaw = await this.execGit(repoPath, [
      'diff-tree',
      '--no-commit-id',
      '-r',
      '--name-status',
      commitHash,
    ]);

    const files: GitFileChange[] = nameStatusRaw
      .split('\n')
      .filter(Boolean)
      .map((line) => {
        const [statusCode, ...pathParts] = line.split('\t');
        const filePath = pathParts[0] ?? '';
        const status = mapStatusCode(statusCode?.charAt(0) ?? 'M');
        const oldPath =
          status === 'renamed' || status === 'copied' ? filePath : undefined;
        const newPath = pathParts[1] ?? filePath;
        return {
          path: newPath,
          status,
          ...(oldPath ? { oldPath } : {}),
        };
      });

    return {
      hash: parts[0] ?? '',
      shortHash: parts[1] ?? '',
      author: { name: parts[2] ?? '', email: parts[3] ?? '' },
      date: parts[4] ?? '',
      message: parts[5] ?? '',
      files,
      diff: diffRaw,
    };
  }

  // ── Private Helpers ─────────────────────────────────────────────────

  private parseStatus(raw: string): GitStatus {
    const staged: GitFileChange[] = [];
    const unstaged: GitFileChange[] = [];
    const untracked: string[] = [];
    const conflicted: string[] = [];

    if (!raw) return { staged, unstaged, untracked, conflicted };

    for (const line of raw.split('\n').filter(Boolean)) {
      const x = line[0] ?? ' ';
      const y = line[1] ?? ' ';
      const rest = line.slice(3);

      // Unmerged / conflicted states
      if (
        x === 'U' ||
        y === 'U' ||
        (x === 'A' && y === 'A') ||
        (x === 'D' && y === 'D')
      ) {
        conflicted.push(rest);
        continue;
      }

      // Untracked
      if (x === '?' && y === '?') {
        untracked.push(rest);
        continue;
      }

      // Staged changes (index column)
      if (x !== ' ' && x !== '?') {
        const parts = rest.split(' -> ');
        const filePath = parts.length > 1 ? (parts[1] ?? rest) : rest;
        staged.push({
          path: filePath,
          status: mapStatusCode(x),
          ...(parts.length > 1 ? { oldPath: parts[0] } : {}),
        });
      }

      // Unstaged changes (working-tree column)
      if (y !== ' ' && y !== '?') {
        unstaged.push({
          path: rest.split(' -> ').pop() ?? rest,
          status: mapStatusCode(y),
        });
      }
    }

    return { staged, unstaged, untracked, conflicted };
  }

  private extractCommitHash(output: string): string {
    const match = /\[[\w./\-]+ ([a-f0-9]+)\]/.exec(output);
    return match?.[1] ?? '';
  }

  private parsePullUpdatedFiles(output: string): string[] {
    const files: string[] = [];
    for (const line of output.split('\n')) {
      // Lines like " path/to/file.txt | 3 +++" or " path/to/file.txt | 2 +-"
      const match = /^\s+(\S+)\s+\|/.exec(line);
      if (match?.[1]) files.push(match[1]);
    }
    return files;
  }

  /**
   * Returns file paths currently in a conflicted state (for use after
   * failed merges / pulls).
   */
  async getConflictedFiles(repoPath: string): Promise<string[]> {
    try {
      const raw = await this.execGit(repoPath, [
        'diff',
        '--name-only',
        '--diff-filter=U',
      ]);
      return raw.split('\n').filter(Boolean);
    } catch {
      return [];
    }
  }
}
