import { Injectable } from '@nestjs/common';

import type { AgentSession, AgentMessage } from '@shared';
import { AgentType, AgentSessionStatus } from '@shared';
import { generateId, nowIso } from '@shared';

/**
 * Orchestrates agent sessions and message routing.
 * Claude Code wrapper integration is implemented in Phase 3.
 */
@Injectable()
export class AgentService {
  private readonly sessions = new Map<string, AgentSession>();
  private readonly messages = new Map<string, AgentMessage[]>();

  async createSession(userId: string, agentType: AgentType = AgentType.DIALOG): Promise<AgentSession> {
    const session: AgentSession = {
      sessionId: generateId(),
      userId,
      agentType,
      status: AgentSessionStatus.IDLE,
      createdAt: nowIso(),
      context: {},
    };
    this.sessions.set(session.sessionId, session);
    this.messages.set(session.sessionId, []);
    return session;
  }

  async findSession(sessionId: string): Promise<AgentSession | null> {
    return this.sessions.get(sessionId) ?? null;
  }

  async getMessages(sessionId: string): Promise<AgentMessage[]> {
    return this.messages.get(sessionId) ?? [];
  }

  async sendMessage(sessionId: string, content: string): Promise<AgentMessage> {
    const userMsg: AgentMessage = {
      id: generateId(),
      sessionId,
      role: 'user',
      content,
      timestamp: nowIso(),
    };

    const msgs = this.messages.get(sessionId) ?? [];
    msgs.push(userMsg);

    const agentMsg: AgentMessage = {
      id: generateId(),
      sessionId,
      role: 'agent',
      content: 'Agent integration is not yet connected. This is a placeholder response.',
      timestamp: nowIso(),
    };
    msgs.push(agentMsg);
    this.messages.set(sessionId, msgs);

    return agentMsg;
  }
}
