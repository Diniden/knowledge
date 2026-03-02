import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { type DocumentsService } from './documents.service.js';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { SpecDocument, Spec } from '@kg/shared';

@ApiTags('Documents')
@Controller('documents')
@UseGuards(JwtAuthGuard)
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Get()
  @ApiOperation({ summary: 'List all spec documents' })
  @ApiResponse({ status: 200, description: 'List of documents' })
  async list(): Promise<SpecDocument[]> {
    return this.documentsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a document by ID' })
  @ApiResponse({ status: 200, description: 'Document found' })
  @ApiResponse({ status: 404, description: 'Document not found' })
  async findById(@Param('id') id: string): Promise<SpecDocument> {
    return this.documentsService.findById(id);
  }

  @Get(':id/specs')
  @ApiOperation({ summary: 'Get all specs within a document' })
  @ApiResponse({ status: 200, description: 'List of specs in document' })
  async getSpecs(@Param('id') id: string): Promise<Spec[]> {
    return this.documentsService.getSpecs(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new document' })
  @ApiResponse({ status: 201, description: 'Document created' })
  async create(
    @CurrentUser() userId: string,
    @Body() data: Partial<SpecDocument>,
  ): Promise<SpecDocument> {
    return this.documentsService.create(userId, data);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a document' })
  @ApiResponse({ status: 200, description: 'Document updated' })
  @ApiResponse({ status: 404, description: 'Document not found' })
  async update(
    @Param('id') id: string,
    @Body() data: Partial<SpecDocument>,
  ): Promise<SpecDocument> {
    return this.documentsService.update(id, data);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a document' })
  @ApiResponse({ status: 204, description: 'Document deleted' })
  async remove(@Param('id') id: string): Promise<void> {
    return this.documentsService.remove(id);
  }
}
