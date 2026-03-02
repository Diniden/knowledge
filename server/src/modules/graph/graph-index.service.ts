import { Injectable } from '@nestjs/common';
import { join } from 'path';
import { readdir, rename, mkdir } from 'fs/promises';
import type { Edge, AdjacencyMap } from '@kg/shared';
import { type EdgeType } from '@kg/shared';

const KG_DIR = 'knowledge-graph';
const META_DIR = 'meta';
const SPECS_DIR = 'specs';
const EDGES_DIR = 'edges';
const DOCS_DIR = 'documents';

function metaRoot(projectPath: string): string {
  return join(projectPath, KG_DIR, META_DIR);
}

function indexPath(projectPath: string): string {
  return join(metaRoot(projectPath), 'index.json');
}

function adjacencyPath(projectPath: string): string {
  return join(metaRoot(projectPath), 'adjacency.json');
}

function documentsIndexPath(projectPath: string): string {
  return join(metaRoot(projectPath), 'documents.json');
}

async function atomicWrite(filePath: string, data: unknown): Promise<void> {
  const tmpPath = `${filePath}.tmp`;
  await Bun.write(tmpPath, JSON.stringify(data, null, 2));
  await rename(tmpPath, filePath);
}

@Injectable()
export class GraphIndexService {
  async getIndex(projectPath: string): Promise<Record<string, string>> {
    try {
      const text = await Bun.file(indexPath(projectPath)).text();
      return JSON.parse(text) as Record<string, string>;
    } catch {
      return {};
    }
  }

  async getAdjacency(projectPath: string): Promise<AdjacencyMap> {
    try {
      const text = await Bun.file(adjacencyPath(projectPath)).text();
      return JSON.parse(text) as AdjacencyMap;
    } catch {
      return {};
    }
  }

  async getDocumentsIndex(projectPath: string): Promise<string[]> {
    try {
      const text = await Bun.file(documentsIndexPath(projectPath)).text();
      return JSON.parse(text) as string[];
    } catch {
      return [];
    }
  }

  async updateSpecIndex(
    projectPath: string,
    specId: string,
    filePath: string,
  ): Promise<void> {
    const index = await this.getIndex(projectPath);
    index[specId] = filePath;
    await mkdir(metaRoot(projectPath), { recursive: true });
    await atomicWrite(indexPath(projectPath), index);
  }

  async removeSpecIndex(projectPath: string, specId: string): Promise<void> {
    const index = await this.getIndex(projectPath);
    delete index[specId];
    await mkdir(metaRoot(projectPath), { recursive: true });
    await atomicWrite(indexPath(projectPath), index);
  }

  async updateAdjacency(projectPath: string): Promise<void> {
    const edgesDir = join(projectPath, KG_DIR, EDGES_DIR);
    const adjacency: AdjacencyMap = {};

    try {
      const files = await readdir(edgesDir);
      for (const file of files) {
        if (!file.endsWith('.json')) continue;
        try {
          const text = await Bun.file(join(edgesDir, file)).text();
          const edge = JSON.parse(text) as Edge;
          this.addEdgeToAdjacency(adjacency, edge);
        } catch {
          // Skip malformed edge files
        }
      }
    } catch {
      // Edges directory may not exist
    }

    await mkdir(metaRoot(projectPath), { recursive: true });
    await atomicWrite(adjacencyPath(projectPath), adjacency);
  }

  async rebuildIndex(projectPath: string): Promise<void> {
    await Promise.all([
      this.rebuildSpecIndex(projectPath),
      this.updateAdjacency(projectPath),
      this.rebuildDocumentsIndex(projectPath),
    ]);
  }

  private async rebuildSpecIndex(projectPath: string): Promise<void> {
    const specsDir = join(projectPath, KG_DIR, SPECS_DIR);
    const index: Record<string, string> = {};

    try {
      const docDirs = await readdir(specsDir, { withFileTypes: true });
      for (const dir of docDirs) {
        if (!dir.isDirectory()) continue;
        const docPath = join(specsDir, dir.name);
        const files = await readdir(docPath);
        for (const file of files) {
          if (!file.endsWith('.json')) continue;
          const specId = file.replace(/\.json$/, '');
          index[specId] = `${SPECS_DIR}/${dir.name}/${file}`;
        }
      }
    } catch {
      // Specs directory may not exist
    }

    await mkdir(metaRoot(projectPath), { recursive: true });
    await atomicWrite(indexPath(projectPath), index);
  }

  private async rebuildDocumentsIndex(projectPath: string): Promise<void> {
    const docsDir = join(projectPath, KG_DIR, DOCS_DIR);
    const docIds: string[] = [];

    try {
      const files = await readdir(docsDir);
      for (const file of files) {
        if (!file.endsWith('.json')) continue;
        docIds.push(file.replace(/\.json$/, ''));
      }
    } catch {
      // Documents directory may not exist
    }

    await mkdir(metaRoot(projectPath), { recursive: true });
    await atomicWrite(documentsIndexPath(projectPath), docIds);
  }

  private addEdgeToAdjacency(adjacency: AdjacencyMap, edge: Edge): void {
    if (!adjacency[edge.sourceSpecId]) {
      adjacency[edge.sourceSpecId] = { outgoing: [], incoming: [] };
    }
    if (!adjacency[edge.targetSpecId]) {
      adjacency[edge.targetSpecId] = { outgoing: [], incoming: [] };
    }

    adjacency[edge.sourceSpecId]!.outgoing.push({
      edgeId: edge.id,
      targetSpecId: edge.targetSpecId,
      type: edge.type as EdgeType,
    });

    adjacency[edge.targetSpecId]!.incoming.push({
      edgeId: edge.id,
      sourceSpecId: edge.sourceSpecId,
      type: edge.type as EdgeType,
    });
  }
}
