import {
  ClaudeCodeProcess,
  type ClaudeCodeOptions,
  type ClaudeCodeResponse,
} from './claude-code-process.js';

export class SessionManager {
  private sessions = new Map<string, ClaudeCodeProcess>();

  async createSession(
    sessionId: string,
    options: ClaudeCodeOptions,
  ): Promise<void> {
    if (this.sessions.has(sessionId)) {
      throw new Error(`Session "${sessionId}" already exists`);
    }

    const proc = new ClaudeCodeProcess(options);
    await proc.start();
    this.sessions.set(sessionId, proc);
  }

  getSession(sessionId: string): ClaudeCodeProcess | undefined {
    return this.sessions.get(sessionId);
  }

  async sendMessage(
    sessionId: string,
    message: string,
  ): Promise<ClaudeCodeResponse> {
    const session = this.sessions.get(sessionId);

    if (!session) {
      throw new Error(`Session "${sessionId}" not found`);
    }

    return session.sendMessage(message);
  }

  async sendMessageStream(
    sessionId: string,
    message: string,
    onChunk: (chunk: string) => void,
  ): Promise<ClaudeCodeResponse> {
    const session = this.sessions.get(sessionId);

    if (!session) {
      throw new Error(`Session "${sessionId}" not found`);
    }

    return session.sendMessageStream(message, onChunk);
  }

  async endSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);

    if (!session) return;

    await session.kill();
    this.sessions.delete(sessionId);
  }

  async killAll(): Promise<void> {
    const killPromises = Array.from(this.sessions.entries()).map(
      async ([id, session]) => {
        try {
          await session.kill();
        } catch {
          // Best-effort cleanup; swallowing per-session kill errors
        }
        this.sessions.delete(id);
      },
    );

    await Promise.all(killPromises);
  }

  getActiveSessions(): string[] {
    return Array.from(this.sessions.keys());
  }

  getSessionCount(): number {
    return this.sessions.size;
  }
}
