import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { type VersionService } from './version.service.js';
import type { VersionInfo, SpecDiff } from './version.service.js';

@ApiTags('Versions')
@Controller('versions')
export class VersionController {
  constructor(private readonly versionService: VersionService) {}

  private readonly repoPath = process.cwd();

  @Get('spec/:documentId/:specId')
  @ApiOperation({ summary: 'Get version history for a spec' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Version history' })
  async getSpecHistory(
    @Param('documentId') documentId: string,
    @Param('specId') specId: string,
    @Query('limit') limit?: string,
  ): Promise<VersionInfo[]> {
    const parsedLimit = limit ? parseInt(limit, 10) : undefined;
    return this.versionService.getSpecHistory(
      this.repoPath,
      specId,
      documentId,
      parsedLimit,
    );
  }

  @Get('spec/:documentId/:specId/diff')
  @ApiOperation({ summary: 'Get diff between two versions of a spec' })
  @ApiQuery({ name: 'commitA', required: true })
  @ApiQuery({ name: 'commitB', required: true })
  @ApiResponse({ status: 200, description: 'Diff between versions' })
  async getSpecDiff(
    @Param('documentId') documentId: string,
    @Param('specId') specId: string,
    @Query('commitA') commitA: string,
    @Query('commitB') commitB: string,
  ): Promise<SpecDiff> {
    return this.versionService.getSpecDiff(
      this.repoPath,
      commitA,
      commitB,
      specId,
      documentId,
    );
  }

  @Post('spec/:documentId/:specId/revert')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revert a spec to a specific version' })
  @ApiResponse({ status: 200, description: 'Spec reverted' })
  async revertSpec(
    @Param('documentId') documentId: string,
    @Param('specId') specId: string,
    @Body('commitHash') commitHash: string,
  ): Promise<{ commitHash: string }> {
    const newHash = await this.versionService.revertSpec(
      this.repoPath,
      commitHash,
      specId,
      documentId,
    );
    return { commitHash: newHash };
  }

  @Get('spec/:documentId/:specId/:commitHash')
  @ApiOperation({ summary: 'Get spec content at a specific version' })
  @ApiResponse({ status: 200, description: 'Spec content at version' })
  async getSpecAtVersion(
    @Param('documentId') documentId: string,
    @Param('specId') specId: string,
    @Param('commitHash') commitHash: string,
  ): Promise<{ content: string }> {
    const content = await this.versionService.getSpecAtVersion(
      this.repoPath,
      commitHash,
      specId,
      documentId,
    );
    return { content };
  }

  @Post('snapshots')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a snapshot' })
  @ApiResponse({ status: 201, description: 'Snapshot created' })
  async createSnapshot(@Body('name') name: string): Promise<{ name: string }> {
    const snapshotName = await this.versionService.createSnapshot(
      this.repoPath,
      name,
    );
    return { name: snapshotName };
  }

  @Get('snapshots')
  @ApiOperation({ summary: 'List all snapshots' })
  @ApiResponse({ status: 200, description: 'List of snapshots' })
  async listSnapshots(): Promise<
    Array<{ name: string; commitHash: string; date: string }>
  > {
    return this.versionService.listSnapshots(this.repoPath);
  }
}
