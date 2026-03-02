import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { type CollaborationService } from './collaboration.service.js';
import type {
  SyncResult,
  PullResult,
  SyncStatus,
  TeamActivity,
} from './collaboration.service.js';

@ApiTags('Collaboration')
@Controller('collaboration')
export class CollaborationController {
  private readonly logger = new Logger(CollaborationController.name);

  constructor(private readonly collaborationService: CollaborationService) {}

  @Post('sync')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Sync changes with remote' })
  @ApiResponse({ status: 200, description: 'Sync completed' })
  async syncChanges(
    @Body() body: { projectPath: string; userId: string },
  ): Promise<SyncResult> {
    return this.collaborationService.syncChanges(body.projectPath, body.userId);
  }

  @Get('status')
  @ApiOperation({ summary: 'Get sync status' })
  @ApiResponse({ status: 200, description: 'Sync status retrieved' })
  async getSyncStatus(
    @Query('projectPath') projectPath: string,
  ): Promise<SyncStatus> {
    return this.collaborationService.getSyncStatus(projectPath);
  }

  @Post('push')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Push local changes to remote' })
  @ApiResponse({ status: 200, description: 'Push completed' })
  async pushChanges(
    @Body()
    body: {
      projectPath: string;
      message: string;
      author: { name: string; email: string };
    },
  ): Promise<{ commitHash: string }> {
    const commitHash = await this.collaborationService.pushChanges(
      body.projectPath,
      body.message,
      body.author,
    );
    return { commitHash };
  }

  @Post('pull')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Pull remote changes' })
  @ApiResponse({ status: 200, description: 'Pull completed' })
  async pullChanges(
    @Body() body: { projectPath: string },
  ): Promise<PullResult> {
    return this.collaborationService.pullChanges(body.projectPath);
  }

  @Post('resolve-conflict')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resolve a merge conflict' })
  @ApiResponse({ status: 200, description: 'Conflict resolved' })
  async resolveConflict(
    @Body()
    body: {
      projectPath: string;
      filePath: string;
      resolution: 'ours' | 'theirs' | 'manual';
      content?: string;
    },
  ): Promise<{ resolved: true }> {
    await this.collaborationService.resolveConflict(
      body.projectPath,
      body.filePath,
      body.resolution,
      body.content,
    );
    return { resolved: true };
  }

  @Get('activity')
  @ApiOperation({ summary: 'Get team activity feed' })
  @ApiResponse({ status: 200, description: 'Team activity retrieved' })
  async getTeamActivity(
    @Query('projectPath') projectPath: string,
    @Query('limit') limit?: string,
  ): Promise<TeamActivity[]> {
    const parsedLimit = limit ? parseInt(limit, 10) : undefined;
    return this.collaborationService.getTeamActivity(projectPath, parsedLimit);
  }

  @Post('fork-dialog/:sessionId')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Fork a dialog session' })
  @ApiResponse({ status: 201, description: 'Dialog forked' })
  async forkDialog(
    @Param('sessionId') sessionId: string,
    @Body() body: { userId: string },
  ): Promise<{ forkedSessionId: string }> {
    const forkedSessionId = await this.collaborationService.forkDialog(
      sessionId,
      body.userId,
    );
    return { forkedSessionId };
  }
}
