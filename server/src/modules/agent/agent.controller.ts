import { Controller, Get, Post, Body, Param, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';

import type { ApiResponse } from '@shared';
import { AgentType } from '@shared';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { AgentService } from './agent.service.js';

@UseGuards(JwtAuthGuard)
@Controller('agent')
export class AgentController {
  constructor(private readonly agentService: AgentService) {}

  @Post('sessions')
  async createSession(
    @Req() req: Request & { user: { userId: string } },
    @Body() body: { agentType?: AgentType },
  ) {
    const session = await this.agentService.createSession(
      req.user.userId,
      body.agentType,
    );
    const response: ApiResponse<typeof session> = { success: true, data: session };
    return response;
  }

  @Get('sessions/:id')
  async getSession(@Param('id') id: string) {
    const session = await this.agentService.findSession(id);
    const response: ApiResponse<typeof session> = { success: true, data: session };
    return response;
  }

  @Get('sessions/:id/messages')
  async getMessages(@Param('id') id: string) {
    const messages = await this.agentService.getMessages(id);
    const response: ApiResponse<typeof messages> = { success: true, data: messages };
    return response;
  }

  @Post('sessions/:id/send')
  async sendMessage(@Param('id') id: string, @Body() body: { content: string }) {
    const reply = await this.agentService.sendMessage(id, body.content);
    const response: ApiResponse<typeof reply> = { success: true, data: reply };
    return response;
  }
}
