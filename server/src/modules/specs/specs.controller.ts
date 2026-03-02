import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { type SpecsService } from './specs.service.js';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { Spec } from '@kg/shared';

@ApiTags('Specs')
@Controller('specs')
@UseGuards(JwtAuthGuard)
export class SpecsController {
  constructor(private readonly specsService: SpecsService) {}

  @Get()
  @ApiOperation({ summary: 'List all specs, optionally filtered by document' })
  @ApiQuery({
    name: 'documentId',
    required: false,
    description: 'Filter by document ID',
  })
  @ApiResponse({ status: 200, description: 'List of specs' })
  async list(@Query('documentId') documentId?: string): Promise<Spec[]> {
    if (documentId) {
      return this.specsService.findByDocument(documentId);
    }
    return this.specsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a spec by ID' })
  @ApiResponse({ status: 200, description: 'Spec found' })
  @ApiResponse({ status: 404, description: 'Spec not found' })
  async findById(@Param('id') id: string): Promise<Spec> {
    return this.specsService.findById(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new spec' })
  @ApiResponse({ status: 201, description: 'Spec created' })
  async create(
    @CurrentUser() userId: string,
    @Body() data: Partial<Spec>,
  ): Promise<Spec> {
    return this.specsService.create(userId, data);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a spec' })
  @ApiResponse({ status: 200, description: 'Spec updated' })
  @ApiResponse({ status: 404, description: 'Spec not found' })
  async update(
    @Param('id') id: string,
    @CurrentUser() userId: string,
    @Body() data: Partial<Spec>,
  ): Promise<Spec> {
    return this.specsService.update(id, userId, data);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a spec' })
  @ApiResponse({ status: 204, description: 'Spec deleted' })
  @ApiResponse({ status: 404, description: 'Spec not found' })
  async remove(@Param('id') id: string): Promise<void> {
    return this.specsService.remove(id);
  }
}
