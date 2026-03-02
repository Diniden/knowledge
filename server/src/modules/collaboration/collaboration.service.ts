import { Injectable, Logger } from '@nestjs/common';
import { type ConfigService } from '@nestjs/config';
import { readFile, writeFile } from 'node:fs/promises';
import { type GitService } from '../git/git.service.js';
import { type WebsocketService } from '../websocket/websocket.service.js';
import { WS_EVENTS } from '@kg/shared';

export interface SyncResult {
  success: boolean;
  pushed: number;
  pulled: number;
  conflicts?: string[];
}

export interface PullResult {
  success: boolean;
  updatedFiles: string[];
  conflicts?: string[];
}

export interface SyncStatus {
  localAhead: number;
  remoteAhead: number;
  lastSyncAt?: string;
  currentBranch: string;
  hasUncommittedChanges: boolean;
}

export interface TeamActivity {
  userId: string;
  userName: string;
  action: string;
  details: string;
  timestamp: string;
}

interface ActiveUser {
  userId: string;
  username: string;
  documentId: string;
  cursorPosition?: { specId: string; offset: number };
  connectedAt: string;
}

@Injectable()
export class CollaborationService {
  private readonly logger = new Logger(CollaborationService.name);
  private activeUsers = new Map<string, ActiveUser>();
  private lastSyncTimestamps = new Map<string, string>();

  constructor(
    private readonly gitService: GitService,
    private readonly websocketService: WebsocketService,
    private readonly configService: ConfigService,
  ) {}

  // ── Active User Tracking ─────────────────────────────────────────────

  addUser(userId: string, username: string, documentId: string): void {
    this.activeUsers.set(userId, {
      userId,
      username,
      documentId,
      connectedAt: new Date().toISOString(),
    });
  }

  removeUser(userId: string): void {
    this.activeUsers.delete(userId);
  }

  getActiveUsers(documentId: string): ActiveUser[] {
    return Array.from(this.activeUsers.values()).filter(
      (u) => u.documentId === documentId,
    );
  }

  updateCursor(userId: string, specId: string, offset: number): void {
    const user = this.activeUsers.get(userId);
    if (user) {
      user.cursorPosition = { specId, offset };
    }
  }

  // ── Git-Based Sync ───────────────────────────────────────────────────

  async syncChanges(projectPath: string, userId: string): Promise<SyncResult> {
    this.logger.log(`Syncing changes for user ${userId} at ${projectPath}`);

    const pullResult = await this.pullChanges(projectPath);

    if (!pullResult.success) {
      return {
        success: false,
        pushed: 0,
        pulled: 0,
        conflicts: pullResult.conflicts,
      };
    }

    const status = await this.gitService.status(projectPath);
    let pushed = 0;

    if (status.staged.length > 0 || status.unstaged.length > 0) {
      try {
        await this.gitService.push(projectPath);
        pushed = status.staged.length + status.unstaged.length;
      } catch (error: unknown) {
        this.logger.warn(
          `Push failed during sync: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      }
    }

    this.lastSyncTimestamps.set(projectPath, new Date().toISOString());

    await this.notifyChanges(projectPath, pullResult.updatedFiles);

    return {
      success: true,
      pushed,
      pulled: pullResult.updatedFiles.length,
      conflicts: pullResult.conflicts,
    };
  }

  async pushChanges(
    projectPath: string,
    message: string,
    author: { name: string; email: string },
  ): Promise<string> {
    this.logger.log(`Pushing changes at ${projectPath} by ${author.name}`);

    const status = await this.gitService.status(projectPath);

    if (
      status.staged.length === 0 &&
      status.unstaged.length === 0 &&
      status.untracked.length === 0
    ) {
      return '';
    }

    await this.gitService.addAll(projectPath);
    const commitHash = await this.gitService.commit(
      projectPath,
      message,
      author,
    );
    await this.gitService.push(projectPath);

    this.lastSyncTimestamps.set(projectPath, new Date().toISOString());

    const changedFiles = [
      ...status.staged.map((f) => f.path),
      ...status.unstaged.map((f) => f.path),
      ...status.untracked,
    ];
    await this.notifyChanges(projectPath, changedFiles);

    return commitHash;
  }

  async pullChanges(projectPath: string): Promise<PullResult> {
    this.logger.log(`Pulling changes at ${projectPath}`);

    try {
      const result = await this.gitService.pull(projectPath);
      this.lastSyncTimestamps.set(projectPath, new Date().toISOString());

      return {
        success: result.success,
        updatedFiles: result.updatedFiles,
        conflicts: result.conflicts,
      };
    } catch (error: unknown) {
      this.logger.error(
        `Pull failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      return {
        success: false,
        updatedFiles: [],
        conflicts: [],
      };
    }
  }

  async checkForUpdates(projectPath: string): Promise<boolean> {
    try {
      await this.gitService.fetch(projectPath);

      const commits = await this.gitService.log(projectPath, { limit: 1 });
      if (commits.length === 0) return false;

      const lastSync = this.lastSyncTimestamps.get(projectPath);
      if (!lastSync) return true;

      const latestCommitDate = commits[0]?.date;
      if (!latestCommitDate) return false;

      return new Date(latestCommitDate) > new Date(lastSync);
    } catch {
      return false;
    }
  }

  async resolveConflict(
    projectPath: string,
    filePath: string,
    resolution: 'ours' | 'theirs' | 'manual',
    content?: string,
  ): Promise<void> {
    this.logger.log(
      `Resolving conflict for ${filePath} with strategy: ${resolution}`,
    );

    if (resolution === 'manual' && content !== undefined) {
      const fullPath = `${projectPath}/${filePath}`;
      await writeFile(fullPath, content, 'utf-8');
      await this.gitService.add(projectPath, [filePath]);
      return;
    }

    if (resolution === 'ours') {
      const oursContent = await this.getFileVersion(
        projectPath,
        filePath,
        'HEAD',
      );
      const fullPath = `${projectPath}/${filePath}`;
      await writeFile(fullPath, oursContent, 'utf-8');
      await this.gitService.add(projectPath, [filePath]);
      return;
    }

    if (resolution === 'theirs') {
      const theirsContent = await this.getFileVersion(
        projectPath,
        filePath,
        'MERGE_HEAD',
      );
      const fullPath = `${projectPath}/${filePath}`;
      await writeFile(fullPath, theirsContent, 'utf-8');
      await this.gitService.add(projectPath, [filePath]);
      return;
    }
  }

  async getSyncStatus(projectPath: string): Promise<SyncStatus> {
    const currentBranch = await this.gitService.getCurrentBranch(projectPath);
    const status = await this.gitService.status(projectPath);

    const hasUncommittedChanges =
      status.staged.length > 0 ||
      status.unstaged.length > 0 ||
      status.untracked.length > 0;

    let localAhead = 0;
    let remoteAhead = 0;

    try {
      const localCommits = await this.gitService.log(projectPath, {
        limit: 100,
      });
      const _remote = `origin/${currentBranch}`;

      await this.gitService.fetch(projectPath).catch(() => {
        /* offline is ok */
      });

      const remoteCommits = await this.gitService.log(projectPath, {
        limit: 100,
      });

      localAhead = Math.max(0, localCommits.length - remoteCommits.length);
      remoteAhead = Math.max(0, remoteCommits.length - localCommits.length);
    } catch {
      // If remote tracking fails, report zero divergence
    }

    return {
      localAhead,
      remoteAhead,
      lastSyncAt: this.lastSyncTimestamps.get(projectPath),
      currentBranch,
      hasUncommittedChanges,
    };
  }

  async forkDialog(sessionId: string, userId: string): Promise<string> {
    const forkedSessionId = `${sessionId}-fork-${userId}-${Date.now()}`;
    this.logger.log(
      `Forked dialog ${sessionId} for user ${userId} → ${forkedSessionId}`,
    );
    return forkedSessionId;
  }

  async getTeamActivity(
    projectPath: string,
    limit = 20,
  ): Promise<TeamActivity[]> {
    try {
      const commits = await this.gitService.log(projectPath, { limit });

      return commits.map((commit) => ({
        userId: commit.author.email,
        userName: commit.author.name,
        action: 'commit',
        details: commit.message,
        timestamp: commit.date,
      }));
    } catch {
      return [];
    }
  }

  // ── Private Helpers ──────────────────────────────────────────────────

  private async notifyChanges(
    projectId: string,
    changes: string[],
  ): Promise<void> {
    if (changes.length === 0) return;

    this.websocketService.emitToProject(projectId, WS_EVENTS.SYNC_RESPONSE, {
      type: 'sync-update',
      changedFiles: changes,
      timestamp: new Date().toISOString(),
    });
  }

  private async getFileVersion(
    repoPath: string,
    filePath: string,
    ref: string,
  ): Promise<string> {
    try {
      const { exec } = await import('node:child_process');
      const { promisify } = await import('node:util');
      const execAsync = promisify(exec);

      const { stdout } = await execAsync(`git show ${ref}:${filePath}`, {
        cwd: repoPath,
        maxBuffer: 10 * 1024 * 1024,
      });
      return stdout;
    } catch {
      return readFile(`${repoPath}/${filePath}`, 'utf-8');
    }
  }
}
