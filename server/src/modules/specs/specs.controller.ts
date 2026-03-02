import { Controller, Get, Param, UseGuards } from '@nestjs/common';

import type { ApiResponse } from '@shared';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { SpecsService } from './specs.service.js';

@UseGuards(JwtAuthGuard)
@Controller('documents')
export class SpecsController {
  constructor(private readonly specsService: SpecsService) {}

  @Get()
  async findAllDocuments() {
    const docs = await this.specsService.findAllDocuments();
    const response: ApiResponse<typeof docs> = { success: true, data: docs };
    return response;
  }

  @Get(':id')
  async findDocument(@Param('id') id: string) {
    const doc = await this.specsService.findDocumentById(id);
    const response: ApiResponse<typeof doc> = { success: true, data: doc };
    return response;
  }

  @Get(':id/specs')
  async findDocumentSpecs(@Param('id') id: string) {
    const specs = await this.specsService.findSpecsByDocument(id);
    const response: ApiResponse<typeof specs> = { success: true, data: specs };
    return response;
  }
}
