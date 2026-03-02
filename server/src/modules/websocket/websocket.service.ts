import { Injectable, Logger } from '@nestjs/common';
import { type EventsGateway } from './events.gateway.js';
import type {
  AgentStatusUpdate,
  AgentMessageEvent,
  SpecChangeEvent,
} from '@kg/shared';
import { WS_EVENTS } from '@kg/shared';

@Injectable()
export class WebsocketService {
  private readonly logger = new Logger(WebsocketService.name);

  constructor(private readonly gateway: EventsGateway) {}

  emitToUser(userId: string, event: string, payload: unknown) {
    this.gateway.server?.to(`user:${userId}`).emit(event, {
      data: payload,
      meta: { timestamp: new Date().toISOString() },
    });
  }

  emitToProject(projectId: string, event: string, payload: unknown) {
    this.gateway.server?.to(`project:${projectId}`).emit(event, {
      data: payload,
      meta: { timestamp: new Date().toISOString() },
    });
  }

  emitToSession(sessionId: string, event: string, payload: unknown) {
    this.gateway.server?.to(`session:${sessionId}`).emit(event, {
      data: payload,
      meta: { timestamp: new Date().toISOString() },
    });
  }

  broadcast(event: string, payload: unknown) {
    this.gateway.server?.emit(event, {
      data: payload,
      meta: { timestamp: new Date().toISOString() },
    });
  }

  notifySpecChange(event: SpecChangeEvent) {
    this.logger.debug(`Spec change: ${event.changeType} ${event.specId}`);
    const wsEvent =
      event.changeType === 'created'
        ? WS_EVENTS.SPEC_CREATED
        : event.changeType === 'updated'
          ? WS_EVENTS.SPEC_UPDATED
          : WS_EVENTS.SPEC_DELETED;
    this.broadcast(wsEvent, event);
  }

  notifyAgentStatus(event: AgentStatusUpdate) {
    this.emitToSession(event.sessionId, WS_EVENTS.AGENT_STATUS, event);
  }

  notifyAgentMessage(event: AgentMessageEvent) {
    this.emitToSession(event.sessionId, WS_EVENTS.AGENT_MESSAGE, event);
  }

  async getConnectedUserIds(): Promise<string[]> {
    const sockets = await this.gateway.server?.fetchSockets();
    if (!sockets) return [];

    const userIds = new Set<string>();
    for (const socket of sockets) {
      const userId = (socket.data as { userId?: string }).userId;
      if (userId) userIds.add(userId);
    }
    return [...userIds];
  }
}
