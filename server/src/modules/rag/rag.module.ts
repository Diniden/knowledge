import { Module } from '@nestjs/common';
import { SpecsModule } from '../specs/specs.module.js';
import { RagController } from './rag.controller.js';
import { RagService } from './rag.service.js';
import { EmbeddingService } from './embedding.service.js';
import { ChunkingService } from './chunking.service.js';

@Module({
  imports: [SpecsModule],
  controllers: [RagController],
  providers: [RagService, EmbeddingService, ChunkingService],
  exports: [RagService],
})
export class RagModule {}
