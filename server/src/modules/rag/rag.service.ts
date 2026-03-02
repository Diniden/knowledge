import { Injectable } from '@nestjs/common';

/**
 * RAG service stub.
 * Will implement embedding generation, vector indexing, and semantic
 * retrieval in Phase 2 (05-RAG-LAYER/PLAN.md).
 */
@Injectable()
export class RagService {
  async embed(_text: string): Promise<number[]> {
    return [];
  }

  async retrieve(_query: string, _topK = 5): Promise<{ specId: string; score: number }[]> {
    return [];
  }
}
