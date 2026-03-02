import { Injectable } from '@nestjs/common';

export interface Chunk {
  text: string;
  index: number;
  metadata: {
    title?: string;
    section?: string;
    wordCount: number;
  };
}

const TOKEN_THRESHOLD = 500;
const MAX_CHUNK_TOKENS = 500;
const CHARS_PER_TOKEN = 4;

@Injectable()
export class ChunkingService {
  chunkSpec(spec: { id: string; title: string; content: string }): Chunk[] {
    const fullText = this.prepareChunkText(spec.title, spec.content);
    const tokenEstimate = this.estimateTokens(fullText);

    if (tokenEstimate <= TOKEN_THRESHOLD) {
      return [
        {
          text: fullText,
          index: 0,
          metadata: {
            title: spec.title,
            wordCount: fullText.split(/\s+/).length,
          },
        },
      ];
    }

    const paragraphs = this.splitByParagraphs(spec.content, MAX_CHUNK_TOKENS);
    return paragraphs.map((text, index) => {
      const chunkText =
        index === 0
          ? this.prepareChunkText(spec.title, text)
          : `Title: ${spec.title}\n\n${text}`;

      return {
        text: chunkText,
        index,
        metadata: {
          title: spec.title,
          section: this.extractSection(text),
          wordCount: chunkText.split(/\s+/).length,
        },
      };
    });
  }

  private estimateTokens(text: string): number {
    return Math.ceil(text.length / CHARS_PER_TOKEN);
  }

  private splitByParagraphs(text: string, maxTokens: number): string[] {
    const paragraphs = text.split(/\n\n+/);
    const chunks: string[] = [];
    let current = '';

    for (const paragraph of paragraphs) {
      const combined = current ? `${current}\n\n${paragraph}` : paragraph;

      if (this.estimateTokens(combined) > maxTokens && current) {
        chunks.push(current.trim());
        current = paragraph;
      } else {
        current = combined;
      }
    }

    if (current.trim()) {
      chunks.push(current.trim());
    }

    if (chunks.length === 0) {
      chunks.push(text);
    }

    return chunks;
  }

  private prepareChunkText(title: string, content: string): string {
    return `Title: ${title}\n\n${content}`;
  }

  private extractSection(text: string): string | undefined {
    const headingMatch = text.match(/^#{1,6}\s+(.+)$/m);
    return headingMatch?.[1];
  }
}
