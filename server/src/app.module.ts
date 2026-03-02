import { Module } from '@nestjs/common';
import { ConfigModule } from './config/config.module.js';
import { DatabaseModule } from './modules/database/database.module.js';
import { CoreModule } from './core/core.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { UsersModule } from './modules/users/users.module.js';
import { SpecsModule } from './modules/specs/specs.module.js';
import { DocumentsModule } from './modules/documents/documents.module.js';
import { GraphModule } from './modules/graph/graph.module.js';
import { AgentModule } from './modules/agent/agent.module.js';
import { GitModule } from './modules/git/git.module.js';
import { WebsocketModule } from './modules/websocket/websocket.module.js';
import { HealthModule } from './modules/health/health.module.js';
import { GenUiModule } from './modules/gen-ui/gen-ui.module.js';
import { PlansModule } from './modules/plans/plans.module.js';
import { CollaborationModule } from './modules/collaboration/collaboration.module.js';
import { RagModule } from './modules/rag/rag.module.js';
import { CodeGenModule } from './modules/code-gen/code-gen.module.js';

@Module({
  imports: [
    ConfigModule,
    DatabaseModule,
    CoreModule,
    AuthModule,
    UsersModule,
    SpecsModule,
    DocumentsModule,
    GraphModule,
    AgentModule,
    GitModule,
    WebsocketModule,
    HealthModule,
    GenUiModule,
    PlansModule,
    CollaborationModule,
    RagModule,
    CodeGenModule,
  ],
})
export class AppModule {}
