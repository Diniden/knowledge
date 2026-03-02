import { Module } from '@nestjs/common';

import { RagService } from './rag.service.js';

/**
 * RAG (Retrieval-Augmented Generation) layer.
 * Embedding pipeline, vector store, and retrieval API.
 * Full implementation in Phase 2 (05-RAG-LAYER/PLAN.md).
 */
@Module({
  providers: [RagService],
  exports: [RagService],
})
export class RagModule {}
