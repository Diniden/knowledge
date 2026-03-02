import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { type AgentSessionService } from './agent-session.service.js';
import { type AgentOrchestratorService } from './agent-orchestrator.service.js';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { type AgentType, AgentSessionStatus } from '@kg/shared';
import type { AgentSession, AgentMessage } from '@kg/shared';

@ApiTags('Agent')
@Controller('agent')
@UseGuards(JwtAuthGuard)
export class AgentController {
  constructor(
    private readonly sessionService: AgentSessionService,
    private readonly orchestrator: AgentOrchestratorService,
  ) {}

  @Post('sessions')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new agent session' })
  @ApiResponse({ status: 201, description: 'Session created' })
  async createSession(
    @CurrentUser() userId: string,
    @Body() body: { agentType?: AgentType; projectId: string },
  ): Promise<{ sessionId: string }> {
    const sessionId = await this.orchestrator.createSession(
      userId,
      body.projectId,
      body.agentType,
    );
    return { sessionId };
  }

  @Get('sessions')
  @ApiOperation({ summary: 'List agent sessions for the current user' })
  @ApiResponse({ status: 200, description: 'List of sessions' })
  async listSessions(@CurrentUser() userId: string): Promise<AgentSession[]> {
    return this.sessionService.findByUser(userId);
  }

  @Get('sessions/:id')
  @ApiOperation({ summary: 'Get agent session details' })
  @ApiResponse({ status: 200, description: 'Session details' })
  @ApiResponse({ status: 404, description: 'Session not found' })
  async getSession(@Param('id') id: string): Promise<AgentSession> {
    return this.sessionService.findById(id);
  }

  @Post('sessions/:sessionId/messages')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Send a message to an agent session' })
  @ApiResponse({ status: 202, description: 'Message accepted for processing' })
  async sendMessage(
    @CurrentUser() userId: string,
    @Param('sessionId') sessionId: string,
    @Body() body: { content: string },
  ): Promise<AgentMessage> {
    return this.orchestrator.handleUserMessage(userId, sessionId, body.content);
  }

  @Post('sessions/:sessionId/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel an in-progress agent operation' })
  @ApiResponse({ status: 200, description: 'Operation cancelled' })
  async cancelOperation(
    @Param('sessionId') sessionId: string,
  ): Promise<{ cancelled: boolean }> {
    await this.orchestrator.cancelOperation(sessionId);
    return { cancelled: true };
  }

  @Delete('sessions/:sessionId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'End an agent session' })
  @ApiResponse({ status: 200, description: 'Session ended' })
  async endSession(
    @Param('sessionId') sessionId: string,
  ): Promise<{ ended: boolean }> {
    await this.sessionService.end(sessionId, AgentSessionStatus.COMPLETED);
    return { ended: true };
  }

  @Get('sessions/:sessionId/messages')
  @ApiOperation({ summary: 'Get message history for an agent session' })
  @ApiResponse({ status: 200, description: 'List of messages' })
  async getMessages(
    @Param('sessionId') sessionId: string,
  ): Promise<AgentMessage[]> {
    return this.sessionService.getMessages(sessionId);
  }
}
