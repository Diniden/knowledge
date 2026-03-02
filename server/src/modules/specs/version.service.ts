import { Injectable, Logger } from '@nestjs/common';
import { type GitService } from '../git/git.service.js';
import { type GitDiffService } from '../git/git-diff.service.js';
import { GitError, NotFoundError } from '@kg/shared';
import type { DiffFile } from '../git/git.types.js';

export interface VersionInfo {
  commitHash: string;
  shortHash: string;
  message: string;
  author: { name: string; email: string };
  date: string;
}

export interface SpecDiff {
  files: DiffFile[];
  rawDiff: string;
}

@Injectable()
export class VersionService {
  private readonly logger = new Logger(VersionService.name);

  constructor(
    private readonly gitService: GitService,
    private readonly gitDiffService: GitDiffService,
  ) {}

  /**
   * Commit a spec change with a descriptive message following the
   * `kg(<scope>): <action>` convention.
   */
  async commitSpecChange(
    repoPath: string,
    specId: string,
    message: string,
    author?: { name: string; email: string },
  ): Promise<string> {
    await this.gitService.addAll(repoPath);
    const commitHash = await this.gitService.commit(
      repoPath,
      `kg(spec): ${message}\n\nSpecs-Modified: ${specId}`,
      author,
    );
    this.logger.log(`Committed spec change for ${specId}: ${commitHash}`);
    return commitHash;
  }

  /**
   * Get version history for a specific spec file within a document.
   * Uses `git log --follow` on the spec's JSON file.
   */
  async getSpecHistory(
    repoPath: string,
    specId: string,
    documentId: string,
    limit?: number,
  ): Promise<VersionInfo[]> {
    const specPath = `knowledge-graph/specs/${documentId}/${specId}.json`;
    const commits = await this.gitService.logFile(repoPath, specPath, limit);
    return commits.map((c) => ({
      commitHash: c.hash,
      shortHash: c.shortHash,
      message: c.message,
      author: c.author,
      date: c.date,
    }));
  }

  /**
   * Get the diff between two versions of a spec file.
   */
  async getSpecDiff(
    repoPath: string,
    commitA: string,
    commitB: string,
    specId: string,
    documentId: string,
  ): Promise<SpecDiff> {
    const specPath = `knowledge-graph/specs/${documentId}/${specId}.json`;
    const rawDiff = await this.gitDiffService.diff(repoPath, {
      commitA,
      commitB,
      paths: [specPath],
    });
    const files = await this.gitDiffService.diffFiles(repoPath, {
      commitA,
      commitB,
      paths: [specPath],
    });
    return { files, rawDiff };
  }

  /**
   * Revert a spec to the state it was in at a given commit. This reads
   * the file content at the target commit and writes it as the current
   * content, then commits the result.
   */
  async revertSpec(
    repoPath: string,
    commitHash: string,
    specId: string,
    documentId: string,
  ): Promise<string> {
    const content = await this.getSpecAtVersion(
      repoPath,
      commitHash,
      specId,
      documentId,
    );

    const specPath = `knowledge-graph/specs/${documentId}/${specId}.json`;
    const { join } = await import('node:path');
    const { writeFile, mkdir } = await import('node:fs/promises');
    const fullPath = join(repoPath, specPath);
    const dir = join(repoPath, 'knowledge-graph', 'specs', documentId);
    await mkdir(dir, { recursive: true });
    await writeFile(fullPath, content, 'utf-8');

    const shortHash = commitHash.slice(0, 7);
    return this.commitSpecChange(
      repoPath,
      specId,
      `revert ${specId} to ${shortHash}`,
    );
  }

  /**
   * Retrieve the raw file content of a spec at a specific commit.
   */
  async getSpecAtVersion(
    repoPath: string,
    commitHash: string,
    specId: string,
    documentId: string,
  ): Promise<string> {
    const specPath = `knowledge-graph/specs/${documentId}/${specId}.json`;
    try {
      const { exec } = await import('node:child_process');
      const { promisify } = await import('node:util');
      const execAsync = promisify(exec);
      const { stdout } = await execAsync(`git show ${commitHash}:${specPath}`, {
        cwd: repoPath,
        maxBuffer: 10 * 1024 * 1024,
      });
      return stdout;
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      if (msg.includes('does not exist') || msg.includes('bad revision')) {
        throw new NotFoundError('Spec version', `${specId}@${commitHash}`);
      }
      throw new GitError(`Failed to read spec at version: ${msg}`);
    }
  }

  /**
   * Create a snapshot (tag or lightweight branch) at the current HEAD.
   */
  async createSnapshot(repoPath: string, name: string): Promise<string> {
    const snapshotBranch = `snapshot/${name}`;
    await this.gitService.createBranch(repoPath, snapshotBranch);
    this.logger.log(`Created snapshot: ${snapshotBranch}`);
    return snapshotBranch;
  }

  /**
   * List all snapshot branches (branches prefixed with `snapshot/`).
   */
  async listSnapshots(
    repoPath: string,
  ): Promise<Array<{ name: string; commitHash: string; date: string }>> {
    const branches = await this.gitService.listBranches(repoPath);
    const snapshotBranches = branches.filter((b) =>
      b.name.startsWith('snapshot/'),
    );

    const results: Array<{
      name: string;
      commitHash: string;
      date: string;
    }> = [];

    for (const branch of snapshotBranches) {
      const commits = await this.gitService.log(repoPath, {
        limit: 1,
      });
      const latestDate = commits[0]?.date ?? '';
      results.push({
        name: branch.name.replace(/^snapshot\//, ''),
        commitHash: branch.commitHash,
        date: latestDate,
      });
    }

    return results;
  }
}
