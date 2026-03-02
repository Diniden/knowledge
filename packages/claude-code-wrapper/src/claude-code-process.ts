import { type ResultPromise, execa } from 'execa';
import { OutputParser } from './output-parser.js';

export interface ClaudeCodeOptions {
  workingDirectory: string;
  systemPrompt?: string;
  tools?: string[];
  maxTokens?: number;
  timeout?: number;
  env?: Record<string, string>;
  resumeSessionId?: string;
}

export interface ClaudeCodeMessage {
  role: 'user' | 'assistant' | 'tool_result';
  content: string;
  toolUse?: {
    name: string;
    input: Record<string, unknown>;
  };
}

export interface ClaudeCodeResponse {
  content: string;
  toolCalls?: Array<{
    name: string;
    input: Record<string, unknown>;
    result?: string;
  }>;
  tokensUsed?: number;
  duration?: number;
}

const DEFAULT_TIMEOUT = 120_000;
const GRACEFUL_KILL_TIMEOUT = 5_000;

export class ClaudeCodeProcess {
  private process: ResultPromise | null = null;
  private isRunning = false;
  private startTime = 0;
  private messagesProcessed = 0;
  private currentPid: number | undefined;

  constructor(private readonly options: ClaudeCodeOptions) {}

  async start(): Promise<void> {
    if (this.isRunning) {
      throw new Error('ClaudeCodeProcess is already running');
    }

    this.startTime = Date.now();
    this.isRunning = true;
  }

  async sendMessage(message: string): Promise<ClaudeCodeResponse> {
    const startTime = Date.now();

    const args = this.buildArgs();
    const timeout = this.options.timeout ?? DEFAULT_TIMEOUT;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const childProcess = execa('claude', args, {
        cwd: this.options.workingDirectory,
        input: message,
        env: {
          ...process.env,
          ...this.options.env,
        },
        timeout,
        signal: controller.signal,
      });

      this.process = childProcess;
      this.currentPid = childProcess.pid;

      const result = await childProcess;

      this.messagesProcessed++;

      const parsed = OutputParser.parse(result.stdout);
      parsed.duration = Date.now() - startTime;

      return parsed;
    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Claude Code process timed out after ${timeout}ms`);
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
      this.process = null;
    }
  }

  async sendMessageStream(
    message: string,
    onChunk: (chunk: string) => void,
  ): Promise<ClaudeCodeResponse> {
    const startTime = Date.now();

    const args = this.buildArgs({ streaming: true });
    const timeout = this.options.timeout ?? DEFAULT_TIMEOUT;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const childProcess = execa('claude', args, {
        cwd: this.options.workingDirectory,
        input: message,
        env: {
          ...process.env,
          ...this.options.env,
        },
        timeout,
        signal: controller.signal,
      });

      this.process = childProcess;
      this.currentPid = childProcess.pid;

      let fullOutput = '';

      if (childProcess.stdout) {
        childProcess.stdout.on('data', (data: Buffer) => {
          const chunk = data.toString();
          fullOutput += chunk;
          onChunk(chunk);
        });
      }

      await childProcess;

      this.messagesProcessed++;

      const parsed = OutputParser.parse(fullOutput);
      parsed.duration = Date.now() - startTime;

      return parsed;
    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Claude Code process timed out after ${timeout}ms`);
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
      this.process = null;
    }
  }

  async kill(): Promise<void> {
    if (!this.process) return;

    const proc = this.process;

    proc.kill('SIGTERM');

    const killed = await Promise.race([
      proc.catch(() => true),
      new Promise<false>((resolve) =>
        setTimeout(() => resolve(false), GRACEFUL_KILL_TIMEOUT),
      ),
    ]);

    if (!killed && !proc.killed) {
      proc.kill('SIGKILL');
    }

    this.process = null;
    this.isRunning = false;
  }

  isAlive(): boolean {
    return this.isRunning;
  }

  getStats(): { pid?: number; uptime: number; messagesProcessed: number } {
    return {
      pid: this.currentPid,
      uptime: this.startTime > 0 ? Date.now() - this.startTime : 0,
      messagesProcessed: this.messagesProcessed,
    };
  }

  private buildArgs(opts?: { streaming?: boolean }): string[] {
    const args: string[] = ['--print', '--output-format'];

    if (opts?.streaming) {
      args.push('stream-json');
    } else {
      args.push('json');
    }

    if (this.options.systemPrompt) {
      args.push('--system-prompt', this.options.systemPrompt);
    }

    if (this.options.maxTokens) {
      args.push('--max-tokens', String(this.options.maxTokens));
    }

    if (this.options.resumeSessionId) {
      args.push('--resume', this.options.resumeSessionId);
    }

    if (this.options.tools && this.options.tools.length > 0) {
      args.push('--allowedTools', this.options.tools.join(','));
    }

    return args;
  }
}
