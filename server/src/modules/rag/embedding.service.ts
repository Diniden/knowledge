import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { type ConfigService } from '@nestjs/config';

/** Minimal type for Hugging Face feature-extraction pipeline. */
type FeatureExtractionPipeline = (
  text: string,
  opts: { pooling: string; normalize: boolean },
) => Promise<{ data: Float32Array }>;

@Injectable()
export class EmbeddingService implements OnModuleInit {
  private readonly logger = new Logger(EmbeddingService.name);
  private pipeline: FeatureExtractionPipeline | null = null;
  private modelReady = false;
  private readonly modelName: string;
  private readonly dimensions: number;

  constructor(private readonly configService: ConfigService) {
    this.modelName =
      this.configService.get<string>('EMBEDDING_MODEL_PATH') ||
      'Xenova/nomic-embed-text-v1';
    this.dimensions = parseInt(
      this.configService.get<string>('EMBEDDING_DIMENSIONS') || '768',
      10,
    );
  }

  async onModuleInit(): Promise<void> {
    await this.initialize();
  }

  async initialize(): Promise<void> {
    if (this.pipeline) return;

    try {
      this.logger.log(`Loading embedding model: ${this.modelName}...`);
      const { pipeline } = await import('@huggingface/transformers');
      this.pipeline = (await pipeline('feature-extraction', this.modelName, {
        dtype: 'fp32',
      })) as FeatureExtractionPipeline;
      this.modelReady = true;
      this.logger.log(
        `Embedding model loaded: ${this.modelName} (${this.dimensions}d)`,
      );
    } catch (error) {
      this.logger.warn(
        `Failed to load embedding model "${this.modelName}". ` +
          `RAG will use random embeddings for development. Error: ${error instanceof Error ? error.message : String(error)}`,
      );
      this.modelReady = false;
    }
  }

  isAvailable(): boolean {
    return this.modelReady;
  }

  async embed(texts: string[]): Promise<number[][]> {
    if (!this.modelReady || !this.pipeline) {
      return texts.map(() => this.generateRandomEmbedding());
    }

    const results: number[][] = [];
    for (const text of texts) {
      const output = await this.pipeline(text, {
        pooling: 'mean',
        normalize: true,
      });
      const embedding = Array.from(output.data as Float32Array).slice(
        0,
        this.dimensions,
      );
      results.push(this.normalizeVector(embedding));
    }
    return results;
  }

  async embedSingle(text: string): Promise<number[]> {
    const [result] = await this.embed([text]);
    return result!;
  }

  getModelInfo(): { name: string; dimensions: number } {
    return { name: this.modelName, dimensions: this.dimensions };
  }

  generateRandomEmbedding(): number[] {
    const vec = Array.from(
      { length: this.dimensions },
      () => Math.random() * 2 - 1,
    );
    return this.normalizeVector(vec);
  }

  private normalizeVector(vec: number[]): number[] {
    const magnitude = Math.sqrt(vec.reduce((sum, v) => sum + v * v, 0));
    if (magnitude === 0) return vec;
    return vec.map((v) => v / magnitude);
  }
}
