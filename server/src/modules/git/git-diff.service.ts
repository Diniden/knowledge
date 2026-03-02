import { Injectable } from '@nestjs/common';
import { type GitService } from './git.service';
import type {
  DiffOptions,
  DiffFile,
  DiffHunk,
  DiffLine,
  DiffStat,
} from './git.types';

@Injectable()
export class GitDiffService {
  constructor(private readonly git: GitService) {}

  // ── Public API ──────────────────────────────────────────────────────

  async diff(repoPath: string, options?: DiffOptions): Promise<string> {
    const args = this.buildDiffArgs(options);
    // Re-use the git service's execGit via a raw diff helper
    return this.execDiff(repoPath, args);
  }

  async diffFiles(
    repoPath: string,
    options?: DiffOptions,
  ): Promise<DiffFile[]> {
    const raw = await this.diff(repoPath, options);
    return this.parseDiffFiles(raw);
  }

  async diffStat(repoPath: string, options?: DiffOptions): Promise<DiffStat> {
    const args = ['diff', '--stat', '--stat-width=200'];
    this.appendDiffRange(args, options);
    if (options?.cached) args.push('--cached');
    if (options?.paths?.length) args.push('--', ...options.paths);

    const raw = await this.execDiff(repoPath, args);
    return this.parseStatOutput(raw);
  }

  async diffBranches(
    repoPath: string,
    base: string,
    compare: string,
  ): Promise<DiffFile[]> {
    const raw = await this.execDiff(repoPath, ['diff', `${base}...${compare}`]);
    return this.parseDiffFiles(raw);
  }

  async showFileDiff(
    repoPath: string,
    commitHash: string,
    filePath: string,
  ): Promise<string> {
    return this.execDiff(repoPath, ['show', commitHash, '--', filePath]);
  }

  // ── Private helpers ─────────────────────────────────────────────────

  /**
   * Thin wrapper that delegates to `git` via `GitService`'s exec helper
   * by going through the public `isRepo` check + raw exec.  We avoid
   * duplicating child_process logic by importing exec directly.
   */
  private async execDiff(repoPath: string, args: string[]): Promise<string> {
    const { exec } = await import('node:child_process');
    const { promisify } = await import('node:util');
    const execAsync = promisify(exec);

    try {
      const { stdout } = await execAsync(`git ${args.join(' ')}`, {
        cwd: repoPath,
        maxBuffer: 10 * 1024 * 1024,
      });
      return stdout;
    } catch (error: unknown) {
      // git diff exits 1 when there *are* differences; capture stdout
      if (
        error !== null &&
        typeof error === 'object' &&
        'stdout' in error &&
        typeof (error as Record<string, unknown>).stdout === 'string'
      ) {
        return (error as { stdout: string }).stdout;
      }
      return '';
    }
  }

  private buildDiffArgs(options?: DiffOptions): string[] {
    const args = ['diff'];

    if (options?.unified !== undefined) {
      args.push(`-U${options.unified}`);
    }
    if (options?.cached) args.push('--cached');
    this.appendDiffRange(args, options);
    if (options?.paths?.length) args.push('--', ...options.paths);

    return args;
  }

  private appendDiffRange(args: string[], options?: DiffOptions): void {
    if (options?.commitA && options?.commitB) {
      args.push(options.commitA, options.commitB);
    } else if (options?.commitA) {
      args.push(options.commitA);
    }
  }

  // ── Diff Parsing ────────────────────────────────────────────────────

  private parseDiffFiles(raw: string): DiffFile[] {
    if (!raw.trim()) return [];

    const files: DiffFile[] = [];
    // Split on "diff --git" boundaries
    const fileSections = raw.split(/^diff --git /m).filter(Boolean);

    for (const section of fileSections) {
      const file = this.parseFileSection(section);
      if (file) files.push(file);
    }

    return files;
  }

  private parseFileSection(section: string): DiffFile | null {
    const lines = section.split('\n');
    const headerLine = lines[0] ?? '';

    // Extract paths from "a/path b/path"
    const pathMatch = /^a\/(.+?) b\/(.+?)$/.exec(headerLine);
    if (!pathMatch) return null;

    const oldPath = pathMatch[1] ?? '';
    const newPath = pathMatch[2] ?? '';

    let status: DiffFile['status'] = 'modified';
    if (section.includes('new file mode')) status = 'added';
    else if (section.includes('deleted file mode')) status = 'deleted';
    else if (section.includes('rename from')) status = 'renamed';

    const hunks = this.parseHunks(section);

    let additions = 0;
    let deletions = 0;
    for (const hunk of hunks) {
      for (const line of hunk.lines) {
        if (line.type === 'addition') additions++;
        else if (line.type === 'deletion') deletions++;
      }
    }

    return {
      path: newPath,
      ...(status === 'renamed' ? { oldPath } : {}),
      status,
      hunks,
      additions,
      deletions,
    };
  }

  private parseHunks(section: string): DiffHunk[] {
    const hunks: DiffHunk[] = [];
    const hunkRegex = /^@@\s+-(\d+)(?:,(\d+))?\s+\+(\d+)(?:,(\d+))?\s+@@(.*)$/;

    const lines = section.split('\n');
    let currentHunk: DiffHunk | null = null;
    let oldLine = 0;
    let newLine = 0;

    for (const line of lines) {
      const hunkMatch = hunkRegex.exec(line);
      if (hunkMatch) {
        if (currentHunk) hunks.push(currentHunk);

        oldLine = parseInt(hunkMatch[1] ?? '0', 10);
        const oldCount = parseInt(hunkMatch[2] ?? '1', 10);
        newLine = parseInt(hunkMatch[3] ?? '0', 10);
        const newCount = parseInt(hunkMatch[4] ?? '1', 10);

        currentHunk = {
          oldStart: oldLine,
          oldLines: oldCount,
          newStart: newLine,
          newLines: newCount,
          header: line,
          lines: [],
        };
        continue;
      }

      if (!currentHunk) continue;

      if (line.startsWith('+') && !line.startsWith('+++')) {
        const diffLine: DiffLine = {
          type: 'addition',
          content: line.slice(1),
          newLineNumber: newLine,
        };
        currentHunk.lines.push(diffLine);
        newLine++;
      } else if (line.startsWith('-') && !line.startsWith('---')) {
        const diffLine: DiffLine = {
          type: 'deletion',
          content: line.slice(1),
          oldLineNumber: oldLine,
        };
        currentHunk.lines.push(diffLine);
        oldLine++;
      } else if (!line.startsWith('\\')) {
        const diffLine: DiffLine = {
          type: 'context',
          content: line.startsWith(' ') ? line.slice(1) : line,
          oldLineNumber: oldLine,
          newLineNumber: newLine,
        };
        currentHunk.lines.push(diffLine);
        oldLine++;
        newLine++;
      }
    }

    if (currentHunk) hunks.push(currentHunk);
    return hunks;
  }

  private parseStatOutput(raw: string): DiffStat {
    const result: DiffStat = {
      filesChanged: 0,
      insertions: 0,
      deletions: 0,
    };

    // Summary line: " 3 files changed, 10 insertions(+), 5 deletions(-)"
    const summaryMatch =
      /(\d+)\s+files?\s+changed(?:,\s+(\d+)\s+insertions?\(\+\))?(?:,\s+(\d+)\s+deletions?\(-\))?/.exec(
        raw,
      );

    if (summaryMatch) {
      result.filesChanged = parseInt(summaryMatch[1] ?? '0', 10);
      result.insertions = parseInt(summaryMatch[2] ?? '0', 10);
      result.deletions = parseInt(summaryMatch[3] ?? '0', 10);
    }

    return result;
  }
}
