import { Injectable, Logger } from '@nestjs/common';
import { type ConfigService } from '@nestjs/config';
import { AgentType, AgentSessionStatus } from '@kg/shared';
import type { AgentMessage, AgentSession } from '@kg/shared';
import { type AgentSessionService } from './agent-session.service.js';
import { AgentRouter } from './types/agent-router.js';

@Injectable()
export class AgentOrchestratorService {
  private readonly logger = new Logger(AgentOrchestratorService.name);

  constructor(
    private readonly sessionService: AgentSessionService,
    private readonly configService: ConfigService,
  ) {}

  async handleUserMessage(
    userId: string,
    sessionId: string,
    message: string,
  ): Promise<AgentMessage> {
    const session = await this.sessionService.findById(sessionId);

    if (session.userId !== userId) {
      throw new Error('Session does not belong to this user');
    }

    await this.sessionService.updateStatus(
      sessionId,
      AgentSessionStatus.THINKING,
    );

    await this.sessionService.addMessage(sessionId, 'user', message);

    const agentType = this.routeMessage(message, session);
    this.logger.debug(
      `Routed message to ${agentType} for session ${sessionId}`,
    );

    const responseContent = await this.generateResponse(
      agentType,
      message,
      session,
    );

    await this.sessionService.updateStatus(
      sessionId,
      AgentSessionStatus.ACTIVE,
    );

    const response = await this.sessionService.addMessage(
      sessionId,
      'agent',
      responseContent,
      { agentType },
    );

    return response;
  }

  async processMessage(
    sessionId: string,
    content: string,
  ): Promise<AgentMessage> {
    const session = await this.sessionService.findById(sessionId);
    return this.handleUserMessage(session.userId, sessionId, content);
  }

  private routeMessage(message: string, session: AgentSession): AgentType {
    if (
      session.agentType !== AgentType.CONVERSATIONALIST &&
      session.agentType !== AgentType.DIALOG
    ) {
      return session.agentType;
    }

    const routed = AgentRouter.route(message);

    const agentTypeValue = AgentType[routed as keyof typeof AgentType];
    return agentTypeValue ?? AgentType.CONVERSATIONALIST;
  }

  async createSession(
    userId: string,
    projectId: string,
    agentType?: AgentType,
  ): Promise<string> {
    const maxSessions = this.configService.get<number>(
      'AGENT_MAX_SESSIONS_PER_USER',
      3,
    );

    const activeCount = await this.sessionService.getActiveSessionCount(userId);

    if (activeCount >= maxSessions) {
      throw new Error(
        `Maximum concurrent sessions (${maxSessions}) reached for user`,
      );
    }

    const resolvedType = agentType ?? AgentType.CONVERSATIONALIST;
    const session = await this.sessionService.create(
      userId,
      projectId,
      resolvedType,
    );

    await this.sessionService.updateStatus(
      session.sessionId,
      AgentSessionStatus.ACTIVE,
    );

    this.logger.log(
      `Created session ${session.sessionId} [${resolvedType}] for user ${userId}`,
    );

    return session.sessionId;
  }

  async cancelOperation(sessionId: string): Promise<void> {
    const session = await this.sessionService.findById(sessionId);

    if (
      session.status !== AgentSessionStatus.THINKING &&
      session.status !== AgentSessionStatus.TOOL_USE &&
      session.status !== AgentSessionStatus.ACTIVE
    ) {
      throw new Error(`Cannot cancel session in status "${session.status}"`);
    }

    await this.sessionService.updateStatus(
      sessionId,
      AgentSessionStatus.CANCELLED,
    );

    this.logger.log(`Cancelled operation for session ${sessionId}`);
  }

  async getSessionStatus(sessionId: string): Promise<AgentSession> {
    return this.sessionService.findById(sessionId);
  }

  private async generateResponse(
    agentType: AgentType,
    content: string,
    _session: AgentSession,
  ): Promise<string> {
    switch (agentType) {
      case AgentType.KNOWLEDGE_WRITER:
      case AgentType.KNOWLEDGE_GRAPH:
        return `[Knowledge Agent] I would process your request about specs/edges. You said: "${content.slice(0, 100)}". Claude Code integration pending.`;

      case AgentType.GRAPH_CRAWLER:
        return `[Graph Crawler] I would analyze graph relationships based on: "${content.slice(0, 100)}". Claude Code integration pending.`;

      case AgentType.PLAN_GENERATOR:
        return `[Plan Generator] I would generate an execution plan for: "${content.slice(0, 100)}". Claude Code integration pending.`;

      case AgentType.GEN_UI_BUILDER:
      case AgentType.GENERATIVE_UI:
        return `[Gen UI] I would create a UI component for: "${content.slice(0, 100)}". Claude Code integration pending.`;

      case AgentType.CONVERSATIONALIST:
      case AgentType.DIALOG:
      default:
        return `[Conversationalist] I'd help you with: "${content.slice(0, 100)}". Claude Code integration pending.`;
    }
  }
}
