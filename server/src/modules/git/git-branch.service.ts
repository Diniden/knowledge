import { Injectable, Logger } from '@nestjs/common';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { GitError } from '@kg/shared';
import { type GitService } from './git.service';
import type { GitMergeResult, ConflictFile } from './git.types';

const execAsync = promisify(exec);

@Injectable()
export class GitBranchService {
  private readonly logger = new Logger(GitBranchService.name);

  constructor(private readonly git: GitService) {}

  // ── Higher-level Branch Operations ──────────────────────────────────

  async createFeatureBranch(repoPath: string, name: string): Promise<string> {
    const branchName = `feature/${name}`;
    await this.git.createBranch(repoPath, branchName);
    this.logger.log(`Created feature branch: ${branchName}`);
    return branchName;
  }

  async createSpecEditBranch(
    repoPath: string,
    specId: string,
  ): Promise<string> {
    const branchName = `spec/${specId}`;
    await this.git.createBranch(repoPath, branchName);
    this.logger.log(`Created spec-edit branch: ${branchName}`);
    return branchName;
  }

  async mergeToCurrent(
    repoPath: string,
    branchName: string,
  ): Promise<GitMergeResult> {
    return this.git.mergeBranch(repoPath, branchName);
  }

  async resolveConflict(
    repoPath: string,
    filePath: string,
    resolution: 'ours' | 'theirs' | 'manual',
    content?: string,
  ): Promise<void> {
    if (resolution === 'manual') {
      if (content === undefined) {
        throw new GitError(
          'Content is required for manual conflict resolution',
        );
      }
      const { writeFile } = await import('node:fs/promises');
      await writeFile(join(repoPath, filePath), content, 'utf-8');
      await this.git.add(repoPath, [filePath]);
      return;
    }

    await this.execInRepo(repoPath, [
      'checkout',
      `--${resolution}`,
      '--',
      filePath,
    ]);
    await this.git.add(repoPath, [filePath]);
  }

  async getConflictFiles(repoPath: string): Promise<ConflictFile[]> {
    const conflictPaths = await this.git.getConflictedFiles(repoPath);
    const results: ConflictFile[] = [];

    for (const filePath of conflictPaths) {
      const file = await this.buildConflictFile(repoPath, filePath);
      if (file) results.push(file);
    }

    return results;
  }

  async abortMerge(repoPath: string): Promise<void> {
    await this.execInRepo(repoPath, ['merge', '--abort']);
    this.logger.log(`Aborted merge in ${repoPath}`);
  }

  // ── Private Helpers ─────────────────────────────────────────────────

  private async execInRepo(repoPath: string, args: string[]): Promise<string> {
    try {
      const { stdout } = await execAsync(`git ${args.join(' ')}`, {
        cwd: repoPath,
        maxBuffer: 10 * 1024 * 1024,
      });
      return stdout.trim();
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown git error';
      throw new GitError(`git ${args[0]} failed: ${msg}`);
    }
  }

  private async buildConflictFile(
    repoPath: string,
    filePath: string,
  ): Promise<ConflictFile | null> {
    try {
      const [oursContent, theirsContent, baseContent] = await Promise.all([
        this.showRef(repoPath, `:2:${filePath}`),
        this.showRef(repoPath, `:3:${filePath}`),
        this.showRef(repoPath, `:1:${filePath}`),
      ]);

      return { path: filePath, oursContent, theirsContent, baseContent };
    } catch {
      // If any ref is unavailable, try reading the working-tree version
      try {
        const content = await readFile(join(repoPath, filePath), 'utf-8');
        return {
          path: filePath,
          oursContent: content,
          theirsContent: content,
          baseContent: '',
        };
      } catch {
        return null;
      }
    }
  }

  private async showRef(repoPath: string, ref: string): Promise<string> {
    const { stdout } = await execAsync(`git show ${ref}`, {
      cwd: repoPath,
      maxBuffer: 10 * 1024 * 1024,
    });
    return stdout;
  }
}
