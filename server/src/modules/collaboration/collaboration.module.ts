import { Module } from '@nestjs/common';
import { CollaborationController } from './collaboration.controller.js';
import { CollaborationService } from './collaboration.service.js';
import { PermissionsService } from './permissions.service.js';
import { AuditService } from './audit.service.js';
import { GitModule } from '../git/git.module.js';
import { WebsocketModule } from '../websocket/websocket.module.js';

@Module({
  imports: [GitModule, WebsocketModule],
  controllers: [CollaborationController],
  providers: [CollaborationService, PermissionsService, AuditService],
  exports: [CollaborationService, PermissionsService, AuditService],
})
export class CollaborationModule {}
