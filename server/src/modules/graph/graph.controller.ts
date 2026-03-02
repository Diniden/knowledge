import { Controller, Get, Query, UseGuards } from '@nestjs/common';

import type { ApiResponse } from '@shared';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { GraphService } from './graph.service.js';

@UseGuards(JwtAuthGuard)
@Controller('graph')
export class GraphController {
  constructor(private readonly graphService: GraphService) {}

  @Get('query')
  async query(
    @Query('rootSpecId') rootSpecId?: string,
    @Query('depth') depth?: string,
  ) {
    const result = await this.graphService.query({
      ...(rootSpecId !== undefined && { rootSpecId }),
      ...(depth !== undefined && { depth: Number(depth) }),
    });
    const response: ApiResponse<typeof result> = { success: true, data: result };
    return response;
  }

  @Get('edges')
  async getEdges() {
    const edges = await this.graphService.findEdges();
    const response: ApiResponse<typeof edges> = { success: true, data: edges };
    return response;
  }
}
