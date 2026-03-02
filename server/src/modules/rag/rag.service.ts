import { Injectable, Inject, Logger } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { DRIZZLE } from '../database/database.module.js';
import { type EmbeddingService } from './embedding.service.js';
import { type ChunkingService } from './chunking.service.js';
import { type SpecsService } from '../specs/specs.service.js';
import { embeddings } from '../database/schema/embeddings.js';
import { eq } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import type * as schema from '../database/schema/index.js';

export interface SearchResult {
  specId: string;
  documentId: string;
  chunkText: string;
  score: number;
  metadata: Record<string, unknown> | null;
}

@Injectable()
export class RagService {
  private readonly logger = new Logger(RagService.name);

  constructor(
    private readonly embeddingService: EmbeddingService,
    private readonly chunkingService: ChunkingService,
    private readonly specsService: SpecsService,
    @Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  async indexSpec(spec: {
    id: string;
    title: string;
    content: string;
    documentId: string;
    status?: string;
  }): Promise<void> {
    const chunks = this.chunkingService.chunkSpec(spec);
    const texts = chunks.map((c) => c.text);
    const vectors = await this.embeddingService.embed(texts);
    const modelInfo = this.embeddingService.getModelInfo();

    await this.removeSpec(spec.id);

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i]!;
      const vector = vectors[i]!;
      const vectorLiteral = `[${vector.join(',')}]`;
      const id = `${spec.id}_chunk_${chunk.index}`;

      try {
        await this.db.execute(sql`
          INSERT INTO embeddings (id, spec_id, document_id, chunk_index, chunk_text, embedding, metadata, model_name, dimensions)
          VALUES (
            ${id},
            ${spec.id},
            ${spec.documentId},
            ${chunk.index},
            ${chunk.text},
            ${sql.raw(`'${vectorLiteral}'::vector`)},
            ${JSON.stringify(chunk.metadata)}::jsonb,
            ${modelInfo.name},
            ${modelInfo.dimensions}
          )
        `);
      } catch (error) {
        this.logger.error(
          `Failed to index chunk ${i} of spec ${spec.id}: ${error instanceof Error ? error.message : String(error)}`,
        );
        throw error;
      }
    }

    this.logger.debug(`Indexed spec ${spec.id}: ${chunks.length} chunk(s)`);
  }

  async removeSpec(specId: string): Promise<void> {
    try {
      await this.db.delete(embeddings).where(eq(embeddings.specId, specId));
    } catch (error) {
      this.logger.warn(
        `Failed to remove spec ${specId} from index (table may not exist yet): ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async reindexSpec(spec: {
    id: string;
    title: string;
    content: string;
    documentId: string;
    status?: string;
  }): Promise<void> {
    await this.removeSpec(spec.id);
    await this.indexSpec(spec);
  }

  async search(
    query: string,
    options?: {
      limit?: number;
      threshold?: number;
      documentId?: string;
      excludeSpecIds?: string[];
    },
  ): Promise<SearchResult[]> {
    const limit = options?.limit ?? 10;
    const threshold = options?.threshold ?? 0.3;

    const queryVector = await this.embeddingService.embedSingle(query);
    const vectorLiteral = `[${queryVector.join(',')}]`;

    try {
      let queryStr = `
        SELECT id, spec_id, document_id, chunk_text, metadata,
          1 - (embedding <=> '${vectorLiteral}'::vector) as score
        FROM embeddings
        WHERE 1 - (embedding <=> '${vectorLiteral}'::vector) > ${threshold}
      `;

      if (options?.documentId) {
        queryStr += ` AND document_id = '${options.documentId}'`;
      }

      if (options?.excludeSpecIds && options.excludeSpecIds.length > 0) {
        const excluded = options.excludeSpecIds
          .map((id) => `'${id}'`)
          .join(',');
        queryStr += ` AND spec_id NOT IN (${excluded})`;
      }

      queryStr += ` ORDER BY embedding <=> '${vectorLiteral}'::vector LIMIT ${limit}`;

      const results = await this.db.execute(sql.raw(queryStr));

      return (
        results as unknown as Array<{
          spec_id: string;
          document_id: string;
          chunk_text: string;
          score: number;
          metadata: Record<string, unknown> | null;
        }>
      ).map((row) => ({
        specId: row.spec_id,
        documentId: row.document_id,
        chunkText: row.chunk_text,
        score: Number(row.score),
        metadata: row.metadata,
      }));
    } catch (error) {
      this.logger.error(
        `Search failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      return [];
    }
  }

  async findRelated(
    specId: string,
    options?: {
      limit?: number;
      threshold?: number;
    },
  ): Promise<SearchResult[]> {
    try {
      const spec = await this.specsService.findById(specId);
      return this.search(spec.content, {
        limit: options?.limit ?? 5,
        threshold: options?.threshold ?? 0.5,
        excludeSpecIds: [specId],
      });
    } catch (error) {
      this.logger.error(
        `findRelated failed for ${specId}: ${error instanceof Error ? error.message : String(error)}`,
      );
      return [];
    }
  }

  async rebuildIndex(): Promise<{ indexed: number; errors: number }> {
    let indexed = 0;
    let errors = 0;

    try {
      const allSpecs = await this.specsService.findAll();
      this.logger.log(`Rebuilding index for ${allSpecs.length} specs...`);

      for (const spec of allSpecs) {
        try {
          await this.indexSpec({
            id: spec.id,
            title: spec.title,
            content: spec.content,
            documentId: spec.documentId,
            status: undefined,
          });
          indexed++;
        } catch {
          errors++;
        }
      }

      this.logger.log(
        `Index rebuild complete: ${indexed} indexed, ${errors} errors`,
      );
    } catch (error) {
      this.logger.error(
        `rebuildIndex failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    return { indexed, errors };
  }

  async getStatus(): Promise<{
    totalSpecs: number;
    indexedSpecs: number;
    modelInfo: { name: string; dimensions: number };
  }> {
    let totalSpecs = 0;
    let indexedSpecs = 0;

    try {
      const allSpecs = await this.specsService.findAll();
      totalSpecs = allSpecs.length;
    } catch {
      // Specs service unavailable
    }

    try {
      const result = await this.db.execute(sql`
        SELECT COUNT(DISTINCT spec_id) as count FROM embeddings
      `);
      const row = (result as unknown as Array<{ count: string }>)[0];
      indexedSpecs = row ? parseInt(row.count, 10) : 0;
    } catch {
      // Table may not exist yet
    }

    return {
      totalSpecs,
      indexedSpecs,
      modelInfo: this.embeddingService.getModelInfo(),
    };
  }
}
