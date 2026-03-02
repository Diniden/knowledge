import { Injectable } from '@nestjs/common';
import { join } from 'path';
import { readdir, rename, mkdir, unlink } from 'fs/promises';
import type {
  Edge,
  GraphQuery,
  GraphResponse,
  GraphNode,
  AdjacencyMap,
} from '@kg/shared';
import { generateEdgeId, ValidationError } from '@kg/shared';
import { type SpecsService } from '../specs/specs.service.js';
import { type GraphTraversalService } from './graph-traversal.service.js';
import { type GraphIndexService } from './graph-index.service.js';

const KG_DIR = 'knowledge-graph';
const EDGES_DIR = 'edges';

function validatePathSegment(segment: string): void {
  if (
    segment.includes('..') ||
    segment.includes('/') ||
    segment.includes('\\')
  ) {
    throw new ValidationError(`Invalid path segment: ${segment}`);
  }
}

function edgesRoot(projectPath: string): string {
  return join(projectPath, KG_DIR, EDGES_DIR);
}

function edgeFilePath(projectPath: string, edgeId: string): string {
  validatePathSegment(edgeId);
  return join(edgesRoot(projectPath), `${edgeId}.json`);
}

@Injectable()
export class GraphService {
  private readonly projectPath = process.cwd();

  constructor(
    private readonly specsService: SpecsService,
    private readonly traversalService: GraphTraversalService,
    private readonly indexService: GraphIndexService,
  ) {}

  async readEdge(projectPath: string, edgeId: string): Promise<Edge> {
    const filePath = edgeFilePath(projectPath, edgeId);
    const text = await Bun.file(filePath).text();
    return JSON.parse(text) as Edge;
  }

  async writeEdge(
    projectPath: string,
    edgeId: string,
    edge: Edge,
  ): Promise<void> {
    const filePath = edgeFilePath(projectPath, edgeId);
    await mkdir(edgesRoot(projectPath), { recursive: true });

    const tmpPath = `${filePath}.tmp`;
    await Bun.write(tmpPath, JSON.stringify(edge, null, 2));
    await rename(tmpPath, filePath);
  }

  async deleteEdge(projectPath: string, edgeId: string): Promise<void> {
    const filePath = edgeFilePath(projectPath, edgeId);
    try {
      await unlink(filePath);
    } catch {
      // File may not exist
    }
  }

  async listEdges(projectPath: string): Promise<string[]> {
    const dir = edgesRoot(projectPath);
    try {
      const files = await readdir(dir);
      return files
        .filter((f) => f.endsWith('.json'))
        .map((f) => f.replace(/\.json$/, ''));
    } catch {
      return [];
    }
  }

  async findEdgesBySpec(projectPath: string, specId: string): Promise<Edge[]> {
    const adjacency = await this.indexService.getAdjacency(projectPath);
    const entry = adjacency[specId];
    if (!entry) return [];

    const edgeIds = new Set<string>();
    for (const ref of entry.outgoing) edgeIds.add(ref.edgeId);
    for (const ref of entry.incoming) edgeIds.add(ref.edgeId);

    const edges: Edge[] = [];
    for (const edgeId of edgeIds) {
      try {
        edges.push(await this.readEdge(projectPath, edgeId));
      } catch {
        // Skip missing edges
      }
    }
    return edges;
  }

  async getAllEdges(): Promise<Edge[]> {
    const ids = await this.listEdges(this.projectPath);
    const edges: Edge[] = [];
    for (const id of ids) {
      try {
        edges.push(await this.readEdge(this.projectPath, id));
      } catch {
        // Skip malformed files
      }
    }
    return edges;
  }

  async createEdge(edge: Omit<Edge, 'id'>): Promise<Edge> {
    const newEdge: Edge = { ...edge, id: generateEdgeId() };
    await this.writeEdge(this.projectPath, newEdge.id, newEdge);
    await this.indexService.updateAdjacency(this.projectPath);
    return newEdge;
  }

  async removeEdge(id: string): Promise<void> {
    await this.deleteEdge(this.projectPath, id);
    await this.indexService.updateAdjacency(this.projectPath);
  }

  async query(params: GraphQuery): Promise<GraphResponse> {
    const allSpecs = await this.specsService.findAll();
    const allEdges = await this.getAllEdges();

    const filteredEdges = params.edgeTypes
      ? allEdges.filter((e) => params.edgeTypes!.includes(e.type))
      : allEdges;

    const nodes: GraphNode[] = allSpecs
      .slice(0, params.limit ?? 50)
      .map((spec) => ({
        id: spec.id,
        spec,
        edges: filteredEdges.filter(
          (e) => e.sourceSpecId === spec.id || e.targetSpecId === spec.id,
        ),
        depth: 0,
      }));

    return {
      nodes,
      edges: filteredEdges,
      totalNodes: allSpecs.length,
      queryDepth: params.depth ?? 1,
    };
  }

  async getNeighbors(specId: string, depth = 1): Promise<GraphNode[]> {
    const adjacency = await this.indexService.getAdjacency(this.projectPath);
    const neighborIds = await this.traversalService.getNeighbors(
      specId,
      adjacency,
      depth,
    );

    const allEdges = await this.getAllEdges();
    const nodes: GraphNode[] = [];

    for (const nid of neighborIds) {
      try {
        const spec = await this.specsService.findById(nid);
        nodes.push({
          id: spec.id,
          spec,
          edges: allEdges.filter(
            (e) => e.sourceSpecId === nid || e.targetSpecId === nid,
          ),
          depth: 1,
        });
      } catch {
        // Skip missing specs
      }
    }

    return nodes;
  }

  async getSubgraph(specId: string, depth = 2): Promise<GraphResponse> {
    const adjacency = await this.indexService.getAdjacency(this.projectPath);
    const neighborIds = this.collectNeighborIds(specId, adjacency, depth);
    neighborIds.add(specId);

    const allEdges = await this.getAllEdges();
    const subEdges = allEdges.filter(
      (e) => neighborIds.has(e.sourceSpecId) && neighborIds.has(e.targetSpecId),
    );

    const nodes: GraphNode[] = [];
    for (const nid of neighborIds) {
      try {
        const spec = await this.specsService.findById(nid);
        nodes.push({
          id: spec.id,
          spec,
          edges: subEdges.filter(
            (e) => e.sourceSpecId === nid || e.targetSpecId === nid,
          ),
          depth: 0,
        });
      } catch {
        // Skip missing specs
      }
    }

    return {
      nodes,
      edges: subEdges,
      rootNodeId: specId,
      totalNodes: nodes.length,
      queryDepth: depth,
    };
  }

  async findPath(fromId: string, toId: string): Promise<string[] | null> {
    const adjacency = await this.indexService.getAdjacency(this.projectPath);
    return this.findPathBfs(fromId, toId, adjacency);
  }

  async getEdgesForSpec(specId: string): Promise<Edge[]> {
    return this.findEdgesBySpec(this.projectPath, specId);
  }

  async search(term: string): Promise<GraphNode[]> {
    const allSpecs = await this.specsService.findAll();
    const allEdges = await this.getAllEdges();
    const lowerTerm = term.toLowerCase();

    return allSpecs
      .filter(
        (s) =>
          s.title.toLowerCase().includes(lowerTerm) ||
          s.content.toLowerCase().includes(lowerTerm) ||
          s.tags.some((t) => t.toLowerCase().includes(lowerTerm)),
      )
      .map((spec) => ({
        id: spec.id,
        spec,
        edges: allEdges.filter(
          (e) => e.sourceSpecId === spec.id || e.targetSpecId === spec.id,
        ),
        depth: 0,
      }));
  }

  private collectNeighborIds(
    startId: string,
    adjacency: AdjacencyMap,
    maxDepth: number,
  ): Set<string> {
    const visited = new Set<string>();
    const queue: { id: string; depth: number }[] = [{ id: startId, depth: 0 }];

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (visited.has(current.id) || current.depth > maxDepth) continue;
      visited.add(current.id);

      const entry = adjacency[current.id];
      if (!entry) continue;

      for (const ref of entry.outgoing) {
        if (ref.targetSpecId && !visited.has(ref.targetSpecId)) {
          queue.push({ id: ref.targetSpecId, depth: current.depth + 1 });
        }
      }
      for (const ref of entry.incoming) {
        if (ref.sourceSpecId && !visited.has(ref.sourceSpecId)) {
          queue.push({ id: ref.sourceSpecId, depth: current.depth + 1 });
        }
      }
    }

    return visited;
  }

  private findPathBfs(
    fromId: string,
    toId: string,
    adjacency: AdjacencyMap,
  ): string[] | null {
    const visited = new Set<string>();
    const parent = new Map<string, string>();
    const queue = [fromId];
    visited.add(fromId);

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (current === toId) break;

      const entry = adjacency[current];
      if (!entry) continue;

      const neighbors: string[] = [];
      for (const ref of entry.outgoing) {
        if (ref.targetSpecId) neighbors.push(ref.targetSpecId);
      }
      for (const ref of entry.incoming) {
        if (ref.sourceSpecId) neighbors.push(ref.sourceSpecId);
      }

      for (const nid of neighbors) {
        if (!visited.has(nid)) {
          visited.add(nid);
          parent.set(nid, current);
          queue.push(nid);
        }
      }
    }

    if (!visited.has(toId)) return null;

    const path: string[] = [];
    let current = toId;
    while (current !== fromId) {
      path.unshift(current);
      const prev = parent.get(current);
      if (!prev) break;
      current = prev;
    }
    path.unshift(fromId);
    return path;
  }
}
