import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { type RagService } from './rag.service.js';
import { type SpecsService } from '../specs/specs.service.js';

@ApiTags('RAG')
@Controller('rag')
export class RagController {
  private readonly logger = new Logger(RagController.name);

  constructor(
    private readonly ragService: RagService,
    private readonly specsService: SpecsService,
  ) {}

  @Post('search')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Semantic search across specs' })
  @ApiResponse({ status: 200, description: 'Search results' })
  async search(
    @Body()
    body: {
      query: string;
      limit?: number;
      threshold?: number;
      documentId?: string;
    },
  ) {
    return this.ragService.search(body.query, {
      limit: body.limit,
      threshold: body.threshold,
      documentId: body.documentId,
    });
  }

  @Post('index/:specId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Index or re-index a specific spec' })
  @ApiResponse({ status: 200, description: 'Spec indexed' })
  async indexSpec(@Param('specId') specId: string) {
    const spec = await this.specsService.findById(specId);
    await this.ragService.reindexSpec({
      id: spec.id,
      title: spec.title,
      content: spec.content,
      documentId: spec.documentId,
    });
    return { success: true, specId };
  }

  @Delete('index/:specId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a spec from the index' })
  @ApiResponse({ status: 204, description: 'Spec removed from index' })
  async removeSpec(@Param('specId') specId: string) {
    await this.ragService.removeSpec(specId);
  }

  @Post('rebuild')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rebuild the entire RAG index' })
  @ApiResponse({ status: 200, description: 'Rebuild results' })
  async rebuildIndex() {
    this.logger.log('Full RAG index rebuild requested');
    return this.ragService.rebuildIndex();
  }

  @Get('status')
  @ApiOperation({ summary: 'Get RAG indexing status' })
  @ApiResponse({ status: 200, description: 'Index status' })
  async getStatus() {
    return this.ragService.getStatus();
  }

  @Get('related/:specId')
  @ApiOperation({ summary: 'Find specs related to a given spec' })
  @ApiResponse({ status: 200, description: 'Related specs' })
  async findRelated(
    @Param('specId') specId: string,
    @Query('limit') limit?: string,
  ) {
    return this.ragService.findRelated(specId, {
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }
}
