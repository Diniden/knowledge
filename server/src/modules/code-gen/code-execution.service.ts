import { Injectable, Logger } from '@nestjs/common';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import {
  readFile,
  writeFile,
  unlink,
  rename,
  copyFile,
} from 'node:fs/promises';

const execAsync = promisify(exec);

const EXEC_TIMEOUT_MS = 120_000;

@Injectable()
export class CodeExecutionService {
  private readonly logger = new Logger(CodeExecutionService.name);

  async runCommand(
    cwd: string,
    command: string,
    args: string[],
  ): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    const cmd = `${command} ${args.join(' ')}`;
    this.logger.debug(`Running: ${cmd} in ${cwd}`);

    try {
      const { stdout, stderr } = await execAsync(cmd, {
        cwd,
        maxBuffer: 10 * 1024 * 1024,
        timeout: EXEC_TIMEOUT_MS,
      });
      return { stdout: stdout.trim(), stderr: stderr.trim(), exitCode: 0 };
    } catch (error: unknown) {
      const err = error as { stdout?: string; stderr?: string; code?: number };
      return {
        stdout: (err.stdout ?? '').trim(),
        stderr: (err.stderr ?? '').trim(),
        exitCode: err.code ?? 1,
      };
    }
  }

  async typeCheck(
    projectPath: string,
  ): Promise<{ success: boolean; errors: string[] }> {
    const result = await this.runCommand(projectPath, 'npx', [
      'tsc',
      '--noEmit',
    ]);

    if (result.exitCode === 0) {
      return { success: true, errors: [] };
    }

    const errors = result.stdout
      .split('\n')
      .filter((line) => line.includes('error TS'))
      .map((line) => line.trim());

    return { success: false, errors };
  }

  async lint(
    projectPath: string,
  ): Promise<{ success: boolean; errors: string[] }> {
    const result = await this.runCommand(projectPath, 'npx', [
      'eslint',
      '.',
      '--format',
      'compact',
    ]);

    if (result.exitCode === 0) {
      return { success: true, errors: [] };
    }

    const errors = result.stdout
      .split('\n')
      .filter((line) => line.includes('Error') || line.includes('Warning'))
      .map((line) => line.trim());

    return { success: false, errors };
  }

  async runTests(
    projectPath: string,
    pattern?: string,
  ): Promise<{
    success: boolean;
    passed: number;
    failed: number;
    output: string;
  }> {
    const args = ['test'];
    if (pattern) args.push(pattern);

    const result = await this.runCommand(projectPath, 'bun', args);
    const output = `${result.stdout}\n${result.stderr}`.trim();

    const passMatch = /(\d+)\s+pass/.exec(output);
    const failMatch = /(\d+)\s+fail/.exec(output);
    const passed = passMatch ? parseInt(passMatch[1]!, 10) : 0;
    const failed = failMatch ? parseInt(failMatch[1]!, 10) : 0;

    return {
      success: result.exitCode === 0,
      passed,
      failed,
      output,
    };
  }

  async writeFileSafe(filePath: string, content: string): Promise<void> {
    try {
      await copyFile(filePath, `${filePath}.bak`);
    } catch {
      // Original file may not exist yet
    }
    const tmpPath = `${filePath}.tmp`;
    await writeFile(tmpPath, content, 'utf-8');
    await rename(tmpPath, filePath);
  }

  async readFile(filePath: string): Promise<string> {
    return readFile(filePath, 'utf-8');
  }

  async deleteFile(filePath: string): Promise<void> {
    try {
      await unlink(filePath);
    } catch {
      this.logger.warn(`Failed to delete file: ${filePath}`);
    }
  }
}
