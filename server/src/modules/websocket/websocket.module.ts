import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { EventsGateway } from './events.gateway.js';
import { WebsocketService } from './websocket.service.js';

@Module({
  imports: [AuthModule],
  providers: [EventsGateway, WebsocketService],
  exports: [WebsocketService],
})
export class WebsocketModule {}
