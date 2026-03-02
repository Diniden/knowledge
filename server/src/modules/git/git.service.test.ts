import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { GitService } from './git.service.js';

const execAsync = promisify(exec);

async function getMainBranchName(repoPath: string): Promise<string> {
  const { stdout } = await execAsync('git branch --show-current', {
    cwd: repoPath,
  });
  return stdout.trim();
}

describe('GitService', () => {
  let service: GitService;
  let repoPath: string;
  let mainBranch: string;

  beforeAll(async () => {
    service = new GitService();
    repoPath = await mkdtemp(join(tmpdir(), 'kg-git-test-'));

    await service.init(repoPath);

    await execAsync('git config user.name "TestBot"', { cwd: repoPath });
    await execAsync('git config user.email "bot@test.com"', { cwd: repoPath });

    await writeFile(join(repoPath, '.gitkeep'), '');
    await execAsync('git add -A && git commit -m "init"', { cwd: repoPath });

    mainBranch = await getMainBranchName(repoPath);
  });

  afterAll(async () => {
    await rm(repoPath, { recursive: true, force: true });
  });

  test('should initialize a new repo', async () => {
    const isGit = await service.isRepo(repoPath);
    expect(isGit).toBe(true);
  });

  test('should add and commit files', async () => {
    await writeFile(join(repoPath, 'readme.md'), '# Test Project\n');
    await service.addAll(repoPath);
    const hash = await service.commit(repoPath, 'add-readme');

    expect(hash).toBeTruthy();
    expect(hash.length).toBeGreaterThanOrEqual(7);
  });

  test('should get commit log', async () => {
    const commits = await service.log(repoPath);
    expect(commits.length).toBeGreaterThanOrEqual(2);

    const messages = commits.map((c) => c.message);
    expect(messages).toContain('add-readme');
  });

  test('should create and switch branches', async () => {
    await service.createBranch(repoPath, 'feature-test');

    await service.switchBranch(repoPath, 'feature-test');
    const current = await service.getCurrentBranch(repoPath);
    expect(current).toBe('feature-test');

    await service.switchBranch(repoPath, mainBranch);
    const afterSwitch = await service.getCurrentBranch(repoPath);
    expect(afterSwitch).toBe(mainBranch);
  });

  test('should detect merge conflicts', async () => {
    await writeFile(join(repoPath, 'conflict.txt'), 'master-content\n');
    await service.addAll(repoPath);
    await service.commit(repoPath, 'conflict-main');

    await service.switchBranch(repoPath, 'feature-test');
    await writeFile(join(repoPath, 'conflict.txt'), 'branch-content\n');
    await service.addAll(repoPath);
    await service.commit(repoPath, 'conflict-branch');

    await service.switchBranch(repoPath, mainBranch);

    // The merge attempt should fail (GitError thrown because execGit
    // wraps the non-zero exit as an error).
    let mergeThrew = false;
    try {
      await service.mergeBranch(repoPath, 'feature-test');
    } catch {
      mergeThrew = true;
    }
    expect(mergeThrew).toBe(true);

    // After the failed merge, conflicted files should be detectable
    const conflicted = await service.getConflictedFiles(repoPath);
    expect(conflicted.length).toBeGreaterThan(0);
    expect(conflicted).toContain('conflict.txt');

    await execAsync('git merge --abort', { cwd: repoPath });
  });

  test('should show git status', async () => {
    await writeFile(join(repoPath, 'untracked.txt'), 'new file\n');
    const status = await service.status(repoPath);

    expect(status.untracked).toContain('untracked.txt');
  });

  test('should get file-specific log', async () => {
    const commits = await service.logFile(repoPath, 'readme.md');
    expect(commits.length).toBeGreaterThanOrEqual(1);
    expect(commits[0]!.message).toBe('add-readme');
  });
});
