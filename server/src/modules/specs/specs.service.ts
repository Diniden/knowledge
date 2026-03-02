import { Injectable } from '@nestjs/common';
import type { Spec } from '@kg/shared';
import { generateSpecId, NotFoundError, PermissionLevel } from '@kg/shared';
import { type SpecsFileService } from './specs-file.service';

@Injectable()
export class SpecsService {
  private readonly projectPath = process.cwd();

  constructor(private readonly fileService: SpecsFileService) {}

  async findAll(): Promise<Spec[]> {
    return this.fileService.readAllSpecs(this.projectPath);
  }

  async findById(id: string): Promise<Spec> {
    const all = await this.findAll();
    const spec = all.find((s) => s.id === id);
    if (!spec) throw new NotFoundError('Spec', id);
    return spec;
  }

  async findByDocument(documentId: string): Promise<Spec[]> {
    const specIds = await this.fileService.listSpecsInDocument(
      this.projectPath,
      documentId,
    );
    const specs: Spec[] = [];
    for (const specId of specIds) {
      try {
        const spec = await this.fileService.readSpec(
          this.projectPath,
          documentId,
          specId,
        );
        specs.push(spec);
      } catch {
        // Skip unreadable specs
      }
    }
    return specs;
  }

  async create(authorId: string, data: Partial<Spec>): Promise<Spec> {
    const now = new Date().toISOString();
    const spec: Spec = {
      id: generateSpecId(),
      title: data.title ?? 'Untitled',
      content: data.content ?? '',
      authorId,
      createdAt: now,
      updatedAt: now,
      version: 1,
      commitHash: '',
      tags: data.tags ?? [],
      permissionLevel: data.permissionLevel ?? PermissionLevel.FULL_ACCESS,
      summary: data.summary,
      documentId: data.documentId ?? '',
      mediaAssociations: data.mediaAssociations ?? [],
    };

    await this.fileService.writeSpec(
      this.projectPath,
      spec.documentId,
      spec.id,
      spec,
    );
    return spec;
  }

  async update(
    id: string,
    _authorId: string,
    data: Partial<Spec>,
  ): Promise<Spec> {
    const existing = await this.findById(id);
    const updated: Spec = {
      ...existing,
      ...data,
      id,
      updatedAt: new Date().toISOString(),
      version: existing.version + 1,
    };

    await this.fileService.writeSpec(
      this.projectPath,
      updated.documentId,
      updated.id,
      updated,
    );
    return updated;
  }

  async remove(id: string): Promise<void> {
    const spec = await this.findById(id);
    await this.fileService.deleteSpec(
      this.projectPath,
      spec.documentId,
      spec.id,
    );
  }
}
