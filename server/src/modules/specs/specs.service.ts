import { Injectable } from '@nestjs/common';

import type { Spec, SpecDocument } from '@shared';

/**
 * Manages spec and spec document CRUD operations.
 * Backed by the knowledge-graph/ directory (JSON files) via the GitModule.
 * Stubbed with in-memory store for Phase 1; will integrate git-backed
 * persistence in Phase 2.
 */
@Injectable()
export class SpecsService {
  private readonly specs = new Map<string, Spec>();
  private readonly documents = new Map<string, SpecDocument>();

  async findAllDocuments(): Promise<SpecDocument[]> {
    return Array.from(this.documents.values());
  }

  async findDocumentById(id: string): Promise<SpecDocument | null> {
    return this.documents.get(id) ?? null;
  }

  async findSpecById(id: string): Promise<Spec | null> {
    return this.specs.get(id) ?? null;
  }

  async findSpecsByDocument(documentId: string): Promise<Spec[]> {
    return Array.from(this.specs.values()).filter(
      (s) => s.documentId === documentId,
    );
  }
}
