import { Injectable, Logger } from '@nestjs/common';
import {
  type AgentType,
  AgentSessionStatus,
  generateSessionId,
  generateId,
  NotFoundError,
} from '@kg/shared';
import type { AgentSession, AgentMessage, AgentContext } from '@kg/shared';

export interface SessionRecord {
  sessionId: string;
  userId: string;
  projectId: string;
  agentType: AgentType;
  status: AgentSessionStatus;
  startedAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  messages: AgentMessage[];
  context: AgentContext;
  metadata: Record<string, unknown>;
}

@Injectable()
export class AgentSessionService {
  private readonly logger = new Logger(AgentSessionService.name);

  private activeSessions = new Map<string, SessionRecord>();

  async create(
    userId: string,
    projectId: string,
    agentType: AgentType,
  ): Promise<AgentSession> {
    const sessionId = generateSessionId();
    const now = new Date();

    const record: SessionRecord = {
      sessionId,
      userId,
      projectId,
      agentType,
      status: AgentSessionStatus.PENDING,
      startedAt: now,
      updatedAt: now,
      messages: [],
      context: { projectId },
      metadata: {},
    };

    this.activeSessions.set(sessionId, record);
    this.logger.log(
      `Session created: ${sessionId} [${agentType}] for user ${userId}`,
    );

    return this.toAgentSession(record);
  }

  async findById(id: string): Promise<AgentSession> {
    const record = this.activeSessions.get(id);
    if (!record) throw new NotFoundError('AgentSession', id);
    return this.toAgentSession(record);
  }

  async findByUser(userId: string): Promise<AgentSession[]> {
    return Array.from(this.activeSessions.values())
      .filter((s) => s.userId === userId)
      .map((s) => this.toAgentSession(s));
  }

  async updateStatus(
    sessionId: string,
    status: AgentSessionStatus,
  ): Promise<void> {
    const record = this.activeSessions.get(sessionId);
    if (!record) throw new NotFoundError('AgentSession', sessionId);

    record.status = status;
    record.updatedAt = new Date();

    if (
      status === AgentSessionStatus.COMPLETED ||
      status === AgentSessionStatus.FAILED ||
      status === AgentSessionStatus.CANCELLED
    ) {
      record.completedAt = new Date();
    }

    this.logger.debug(`Session ${sessionId} status → ${status}`);
  }

  async addMessage(
    sessionId: string,
    role: AgentMessage['role'],
    content: string,
    extra?: Partial<
      Pick<AgentMessage, 'agentType' | 'toolCalls' | 'graphLinks'>
    >,
  ): Promise<AgentMessage> {
    const record = this.activeSessions.get(sessionId);
    if (!record) throw new NotFoundError('AgentSession', sessionId);

    const message: AgentMessage = {
      id: `msg_${generateId(16)}`,
      sessionId,
      role,
      content,
      timestamp: new Date().toISOString(),
      ...extra,
    };

    record.messages.push(message);
    record.updatedAt = new Date();

    return message;
  }

  async getMessages(sessionId: string): Promise<AgentMessage[]> {
    const record = this.activeSessions.get(sessionId);
    if (!record) throw new NotFoundError('AgentSession', sessionId);
    return record.messages;
  }

  async end(
    sessionId: string,
    status: AgentSessionStatus = AgentSessionStatus.COMPLETED,
  ): Promise<void> {
    const record = this.activeSessions.get(sessionId);
    if (!record) return;

    record.status = status;
    record.completedAt = new Date();
    record.updatedAt = new Date();

    this.logger.log(`Session ended: ${sessionId} [${status}]`);
  }

  async getUserActiveSessions(userId: string): Promise<AgentSession[]> {
    return Array.from(this.activeSessions.values())
      .filter(
        (s) =>
          s.userId === userId &&
          (s.status === AgentSessionStatus.ACTIVE ||
            s.status === AgentSessionStatus.PENDING ||
            s.status === AgentSessionStatus.THINKING ||
            s.status === AgentSessionStatus.TOOL_USE),
      )
      .map((s) => this.toAgentSession(s));
  }

  async getActiveSessionCount(userId: string): Promise<number> {
    const sessions = await this.getUserActiveSessions(userId);
    return sessions.length;
  }

  private toAgentSession(record: SessionRecord): AgentSession {
    return {
      sessionId: record.sessionId,
      userId: record.userId,
      projectId: record.projectId,
      agentType: record.agentType,
      status: record.status,
      createdAt: record.startedAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
      completedAt: record.completedAt?.toISOString(),
      context: record.context,
      messages: record.messages,
      metadata: record.metadata,
    };
  }
}
