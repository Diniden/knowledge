import { Injectable } from '@nestjs/common';

import type { Edge, GraphResponse } from '@shared';

/**
 * Manages the knowledge graph edges and node queries.
 * Will be backed by the knowledge-graph/ directory JSON files in Phase 2.
 */
@Injectable()
export class GraphService {
  private readonly edges = new Map<string, Edge>();

  async query(_query: { rootSpecId?: string; depth?: number }): Promise<GraphResponse> {
    return {
      nodes: [],
      edges: Array.from(this.edges.values()),
      totalNodes: 0,
      totalEdges: this.edges.size,
    };
  }

  async findEdgeById(id: string): Promise<Edge | null> {
    return this.edges.get(id) ?? null;
  }

  async findEdges(): Promise<Edge[]> {
    return Array.from(this.edges.values());
  }
}
