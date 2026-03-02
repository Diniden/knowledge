import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { type GraphService } from './graph.service.js';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type {
  Edge,
  GraphQuery,
  GraphResponse,
  GraphNode,
  InquiryQueueItem,
  CreateEdgeRequest,
} from '@kg/shared';

@Controller('graph')
@UseGuards(JwtAuthGuard)
export class GraphController {
  constructor(private readonly graphService: GraphService) {}

  @Get()
  async queryGraph(@Query() params: GraphQuery): Promise<GraphResponse> {
    return this.graphService.query(params);
  }

  @Get('subgraph/:specId')
  async getSubgraph(
    @Param('specId') specId: string,
    @Query('depth') depth?: string,
  ): Promise<GraphResponse> {
    return this.graphService.getSubgraph(
      specId,
      depth ? parseInt(depth, 10) : 2,
    );
  }

  @Get('edges/:specId')
  async getEdgesForSpec(@Param('specId') specId: string): Promise<Edge[]> {
    return this.graphService.getEdgesForSpec(specId);
  }

  @Post('edges')
  async createEdge(
    @CurrentUser() userId: string,
    @Body() body: CreateEdgeRequest,
  ): Promise<Edge> {
    const now = new Date().toISOString();
    return this.graphService.createEdge({
      sourceSpecId: body.sourceSpecId,
      targetSpecId: body.targetSpecId,
      type: body.type,
      metadata: body.metadata ?? {},
      createdAt: now,
      createdBy: userId,
      commitHash: '',
    });
  }

  @Delete('edges/:id')
  async deleteEdge(@Param('id') id: string): Promise<void> {
    return this.graphService.removeEdge(id);
  }

  @Get('path/:fromId/:toId')
  async findPath(
    @Param('fromId') fromId: string,
    @Param('toId') toId: string,
  ): Promise<{ path: string[] | null }> {
    const path = await this.graphService.findPath(fromId, toId);
    return { path };
  }

  @Get('inquiries')
  async getInquiries(): Promise<InquiryQueueItem[]> {
    return [];
  }

  @Get('search')
  async search(@Query('q') term: string): Promise<GraphNode[]> {
    return this.graphService.search(term);
  }

  @Post('query')
  async queryPost(@Body() params: GraphQuery): Promise<GraphResponse> {
    return this.graphService.query(params);
  }
}
