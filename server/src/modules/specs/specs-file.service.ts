import { Injectable } from '@nestjs/common';
import { join } from 'path';
import { readdir, rename, mkdir, unlink, rm } from 'fs/promises';
import type { Spec } from '@kg/shared';
import { ValidationError } from '@kg/shared';

const KG_DIR = 'knowledge-graph';
const SPECS_DIR = 'specs';

function validatePathSegment(segment: string): void {
  if (
    segment.includes('..') ||
    segment.includes('/') ||
    segment.includes('\\')
  ) {
    throw new ValidationError(`Invalid path segment: ${segment}`);
  }
}

function specsRoot(projectPath: string): string {
  return join(projectPath, KG_DIR, SPECS_DIR);
}

function specFilePath(
  projectPath: string,
  documentId: string,
  specId: string,
): string {
  validatePathSegment(documentId);
  validatePathSegment(specId);
  return join(specsRoot(projectPath), documentId, `${specId}.json`);
}

@Injectable()
export class SpecsFileService {
  async readSpec(
    projectPath: string,
    documentId: string,
    specId: string,
  ): Promise<Spec> {
    const filePath = specFilePath(projectPath, documentId, specId);
    const file = Bun.file(filePath);
    const text = await file.text();
    return JSON.parse(text) as Spec;
  }

  async writeSpec(
    projectPath: string,
    documentId: string,
    specId: string,
    spec: Spec,
  ): Promise<void> {
    const filePath = specFilePath(projectPath, documentId, specId);
    const dir = join(specsRoot(projectPath), documentId);
    await mkdir(dir, { recursive: true });

    const tmpPath = `${filePath}.tmp`;
    await Bun.write(tmpPath, JSON.stringify(spec, null, 2));
    await rename(tmpPath, filePath);
  }

  async deleteSpec(
    projectPath: string,
    documentId: string,
    specId: string,
  ): Promise<void> {
    const filePath = specFilePath(projectPath, documentId, specId);
    try {
      await unlink(filePath);
    } catch {
      // File may not exist
    }

    const dir = join(specsRoot(projectPath), documentId);
    try {
      const remaining = await readdir(dir);
      if (remaining.length === 0) {
        await rm(dir, { recursive: true });
      }
    } catch {
      // Directory may not exist
    }
  }

  async listSpecsInDocument(
    projectPath: string,
    documentId: string,
  ): Promise<string[]> {
    validatePathSegment(documentId);
    const dir = join(specsRoot(projectPath), documentId);
    try {
      const files = await readdir(dir);
      return files
        .filter((f) => f.endsWith('.json'))
        .map((f) => f.replace(/\.json$/, ''));
    } catch {
      return [];
    }
  }

  async specExists(
    projectPath: string,
    documentId: string,
    specId: string,
  ): Promise<boolean> {
    const filePath = specFilePath(projectPath, documentId, specId);
    const file = Bun.file(filePath);
    return file.exists();
  }

  async readAllSpecs(projectPath: string): Promise<Spec[]> {
    const specs: Spec[] = [];
    const root = specsRoot(projectPath);

    try {
      const docDirs = await readdir(root, { withFileTypes: true });
      for (const dir of docDirs) {
        if (!dir.isDirectory()) continue;
        const docPath = join(root, dir.name);
        const files = await readdir(docPath);
        for (const file of files) {
          if (!file.endsWith('.json')) continue;
          try {
            const text = await Bun.file(join(docPath, file)).text();
            specs.push(JSON.parse(text) as Spec);
          } catch {
            // Skip malformed files
          }
        }
      }
    } catch {
      // Directory may not exist yet
    }

    return specs;
  }
}
