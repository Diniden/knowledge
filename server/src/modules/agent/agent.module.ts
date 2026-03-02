import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AgentController } from './agent.controller.js';
import { AgentOrchestratorService } from './agent-orchestrator.service.js';
import { AgentSessionService } from './agent-session.service.js';
import { AgentSkillsService } from './skills.service.js';

@Module({
  imports: [ConfigModule],
  controllers: [AgentController],
  providers: [
    AgentOrchestratorService,
    AgentSessionService,
    AgentSkillsService,
  ],
  exports: [AgentOrchestratorService, AgentSessionService, AgentSkillsService],
})
export class AgentModule {}
