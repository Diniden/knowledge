import { Injectable } from '@nestjs/common';
import { join } from 'path';
import { readdir, rename, mkdir, unlink } from 'fs/promises';
import type { SpecDocument, Spec } from '@kg/shared';
import { generateDocumentId, NotFoundError, ValidationError } from '@kg/shared';
import { type SpecsService } from '../specs/specs.service';

const KG_DIR = 'knowledge-graph';
const DOCS_DIR = 'documents';

function validatePathSegment(segment: string): void {
  if (
    segment.includes('..') ||
    segment.includes('/') ||
    segment.includes('\\')
  ) {
    throw new ValidationError(`Invalid path segment: ${segment}`);
  }
}

function docsRoot(projectPath: string): string {
  return join(projectPath, KG_DIR, DOCS_DIR);
}

function docFilePath(projectPath: string, documentId: string): string {
  validatePathSegment(documentId);
  return join(docsRoot(projectPath), `${documentId}.json`);
}

@Injectable()
export class DocumentsService {
  private readonly projectPath = process.cwd();

  constructor(private readonly specsService: SpecsService) {}

  async readDocument(
    projectPath: string,
    documentId: string,
  ): Promise<SpecDocument> {
    const filePath = docFilePath(projectPath, documentId);
    const file = Bun.file(filePath);
    const text = await file.text();
    return JSON.parse(text) as SpecDocument;
  }

  async writeDocument(
    projectPath: string,
    documentId: string,
    doc: SpecDocument,
  ): Promise<void> {
    const filePath = docFilePath(projectPath, documentId);
    await mkdir(docsRoot(projectPath), { recursive: true });

    const tmpPath = `${filePath}.tmp`;
    await Bun.write(tmpPath, JSON.stringify(doc, null, 2));
    await rename(tmpPath, filePath);
  }

  async deleteDocument(projectPath: string, documentId: string): Promise<void> {
    const filePath = docFilePath(projectPath, documentId);
    try {
      await unlink(filePath);
    } catch {
      // File may not exist
    }
  }

  async listDocuments(projectPath: string): Promise<string[]> {
    const dir = docsRoot(projectPath);
    try {
      const files = await readdir(dir);
      return files
        .filter((f) => f.endsWith('.json'))
        .map((f) => f.replace(/\.json$/, ''));
    } catch {
      return [];
    }
  }

  async findAll(): Promise<SpecDocument[]> {
    const ids = await this.listDocuments(this.projectPath);
    const docs: SpecDocument[] = [];
    for (const id of ids) {
      try {
        docs.push(await this.readDocument(this.projectPath, id));
      } catch {
        // Skip unreadable documents
      }
    }
    return docs;
  }

  async findById(id: string): Promise<SpecDocument> {
    try {
      return await this.readDocument(this.projectPath, id);
    } catch {
      throw new NotFoundError('Document', id);
    }
  }

  async getSpecs(documentId: string): Promise<Spec[]> {
    return this.specsService.findByDocument(documentId);
  }

  async create(
    authorId: string,
    data: Partial<SpecDocument>,
  ): Promise<SpecDocument> {
    const now = new Date().toISOString();
    const doc: SpecDocument = {
      id: generateDocumentId(),
      title: data.title ?? 'Untitled Document',
      description: data.description ?? '',
      specIds: data.specIds ?? [],
      authorId,
      createdAt: now,
      updatedAt: now,
      commitHash: '',
    };

    await this.writeDocument(this.projectPath, doc.id, doc);
    return doc;
  }

  async update(id: string, data: Partial<SpecDocument>): Promise<SpecDocument> {
    const existing = await this.findById(id);
    const updated: SpecDocument = {
      ...existing,
      ...data,
      id,
      updatedAt: new Date().toISOString(),
    };

    await this.writeDocument(this.projectPath, id, updated);
    return updated;
  }

  async remove(id: string): Promise<void> {
    await this.deleteDocument(this.projectPath, id);
  }
}
