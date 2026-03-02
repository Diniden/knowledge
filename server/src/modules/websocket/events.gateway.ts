import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  WsException,
} from '@nestjs/websockets';
import type {
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { type JwtService } from '@nestjs/jwt';
import type { Server, Socket } from 'socket.io';
import { WS_EVENTS } from '@kg/shared';
import type { JwtPayload } from '@kg/shared';

interface AuthenticatedSocket extends Socket {
  data: {
    user?: JwtPayload;
    userId?: string;
  };
}

@WebSocketGateway({
  namespace: '/ws',
  cors: {
    origin: process.env['CORS_ORIGIN'] ?? 'http://localhost:3000',
    credentials: true,
  },
  transports: ['websocket'],
  pingInterval: 25_000,
  pingTimeout: 10_000,
})
export class EventsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(EventsGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(private readonly jwtService: JwtService) {}

  afterInit(_server: Server) {
    this.logger.log('WebSocket Gateway initialized on /ws namespace');
  }

  async handleConnection(client: AuthenticatedSocket) {
    try {
      const token = this.extractToken(client);
      if (!token) {
        client.disconnect(true);
        return;
      }

      const payload = await this.jwtService.verifyAsync<JwtPayload>(token);
      client.data.user = payload;
      client.data.userId = payload.sub;

      await client.join(`user:${payload.sub}`);
      this.logger.log(
        `Client connected: ${client.id} (user: ${payload.username})`,
      );
    } catch {
      this.logger.warn(`Connection rejected: ${client.id} — invalid token`);
      client.emit('error:connection', {
        code: 'AUTH_INVALID',
        message: 'Invalid token',
      });
      client.disconnect(true);
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    const username = client.data.user?.username ?? 'unknown';
    this.logger.log(`Client disconnected: ${client.id} (user: ${username})`);
  }

  @SubscribeMessage('client:join:project')
  async handleJoinProject(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { projectId: string },
  ) {
    if (!client.data.userId) {
      throw new WsException('Not authenticated');
    }

    const room = `project:${data.projectId}`;
    await client.join(room);
    this.logger.debug(`User ${client.data.userId} joined ${room}`);

    return { event: 'client:join:project', data: { joined: room } };
  }

  @SubscribeMessage('client:leave:project')
  async handleLeaveProject(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { projectId: string },
  ) {
    const room = `project:${data.projectId}`;
    await client.leave(room);
    this.logger.debug(`User ${client.data.userId ?? 'unknown'} left ${room}`);

    return { event: 'client:leave:project', data: { left: room } };
  }

  @SubscribeMessage('client:join:session')
  async handleJoinSession(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { sessionId: string },
  ) {
    if (!client.data.userId) {
      throw new WsException('Not authenticated');
    }

    const room = `session:${data.sessionId}`;
    await client.join(room);

    return { event: 'client:join:session', data: { joined: room } };
  }

  @SubscribeMessage('client:leave:session')
  async handleLeaveSession(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { sessionId: string },
  ) {
    const room = `session:${data.sessionId}`;
    await client.leave(room);

    return { event: 'client:leave:session', data: { left: room } };
  }

  @SubscribeMessage(WS_EVENTS.SYNC_REQUEST)
  handleSyncRequest(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: unknown,
  ) {
    client.emit(WS_EVENTS.SYNC_RESPONSE, {
      type: 'full',
      timestamp: new Date().toISOString(),
      data,
    });
  }

  @SubscribeMessage('client:ping')
  handlePing() {
    return {
      event: 'client:pong',
      data: { timestamp: new Date().toISOString() },
    };
  }

  private extractToken(client: Socket): string | null {
    const cookieHeader = client.handshake.headers.cookie;
    if (cookieHeader) {
      const match = /access_token=([^;]+)/.exec(cookieHeader);
      if (match?.[1]) return match[1];
    }

    const authToken = (client.handshake.auth as { token?: string })?.token;
    if (authToken) return authToken;

    const queryToken = (client.handshake.query as { token?: string })?.token;
    if (queryToken) return queryToken;

    return null;
  }
}
