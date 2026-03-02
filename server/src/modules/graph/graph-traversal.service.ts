import { Injectable } from '@nestjs/common';
import type { GraphNode, AdjacencyMap, AdjacencyEntry } from '@kg/shared';
import { type SpecsService } from '../specs/specs.service.js';

@Injectable()
export class GraphTraversalService {
  constructor(private readonly specsService: SpecsService) {}

  async bfs(
    startSpecId: string,
    adjacency: AdjacencyMap,
    maxDepth = 10,
  ): Promise<GraphNode[]> {
    const visited = new Set<string>();
    const queue: Array<{ specId: string; depth: number }> = [
      { specId: startSpecId, depth: 0 },
    ];
    visited.add(startSpecId);

    const result: GraphNode[] = [];

    while (queue.length > 0) {
      const item = queue.shift()!;
      const { specId, depth } = item;

      const spec = await this.specsService.findById(specId).catch(() => null);
      if (spec) {
        result.push({ id: spec.id, spec, edges: [], depth });
      }

      if (depth >= maxDepth) continue;

      const entry = adjacency[specId] as AdjacencyEntry | undefined;
      if (!entry) continue;

      for (const ref of entry.outgoing) {
        if (!visited.has(ref.targetSpecId)) {
          visited.add(ref.targetSpecId);
          queue.push({ specId: ref.targetSpecId, depth: depth + 1 });
        }
      }
      for (const ref of entry.incoming) {
        if (!visited.has(ref.sourceSpecId)) {
          visited.add(ref.sourceSpecId);
          queue.push({ specId: ref.sourceSpecId, depth: depth + 1 });
        }
      }
    }

    return result;
  }

  async dfs(
    startSpecId: string,
    adjacency: AdjacencyMap,
  ): Promise<GraphNode[]> {
    const visited = new Set<string>();
    const result: GraphNode[] = [];

    const visit = async (specId: string, depth: number): Promise<void> => {
      if (visited.has(specId)) return;
      visited.add(specId);

      const spec = await this.specsService.findById(specId).catch(() => null);
      if (spec) {
        result.push({ id: spec.id, spec, edges: [], depth });
      }

      const entry = adjacency[specId] as AdjacencyEntry | undefined;
      if (!entry) return;

      for (const ref of entry.outgoing) {
        await visit(ref.targetSpecId, depth + 1);
      }
      for (const ref of entry.incoming) {
        await visit(ref.sourceSpecId, depth + 1);
      }
    };

    await visit(startSpecId, 0);
    return result;
  }

  async findPath(
    fromSpecId: string,
    toSpecId: string,
    adjacency: AdjacencyMap,
  ): Promise<string[] | null> {
    if (fromSpecId === toSpecId) return [fromSpecId];

    const visited = new Set<string>();
    const parent = new Map<string, string>();
    const queue = [fromSpecId];
    visited.add(fromSpecId);

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (current === toSpecId) break;

      const entry = adjacency[current] as AdjacencyEntry | undefined;
      if (!entry) continue;

      const neighbors: string[] = [
        ...entry.outgoing.map((r) => r.targetSpecId),
        ...entry.incoming.map((r) => r.sourceSpecId),
      ];

      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          parent.set(neighbor, current);
          queue.push(neighbor);
        }
      }
    }

    if (!visited.has(toSpecId)) return null;

    const path: string[] = [];
    let current = toSpecId;
    while (current !== fromSpecId) {
      path.unshift(current);
      const prev = parent.get(current);
      if (!prev) return null;
      current = prev;
    }
    path.unshift(fromSpecId);

    return path;
  }

  async getNeighbors(
    specId: string,
    adjacency: AdjacencyMap,
    depth: number,
  ): Promise<Set<string>> {
    const visited = new Set<string>();
    const queue: Array<{ id: string; d: number }> = [{ id: specId, d: 0 }];
    visited.add(specId);

    while (queue.length > 0) {
      const item = queue.shift()!;
      if (item.d >= depth) continue;

      const entry = adjacency[item.id] as AdjacencyEntry | undefined;
      if (!entry) continue;

      for (const ref of entry.outgoing) {
        if (!visited.has(ref.targetSpecId)) {
          visited.add(ref.targetSpecId);
          queue.push({ id: ref.targetSpecId, d: item.d + 1 });
        }
      }
      for (const ref of entry.incoming) {
        if (!visited.has(ref.sourceSpecId)) {
          visited.add(ref.sourceSpecId);
          queue.push({ id: ref.sourceSpecId, d: item.d + 1 });
        }
      }
    }

    visited.delete(specId);
    return visited;
  }

  async detectCycles(adjacency: AdjacencyMap): Promise<string[][] | null> {
    const WHITE = 0;
    const GRAY = 1;
    const BLACK = 2;

    const color = new Map<string, number>();
    const parentMap = new Map<string, string | null>();
    const cycles: string[][] = [];

    for (const specId of Object.keys(adjacency)) {
      color.set(specId, WHITE);
    }

    const dfsVisit = (u: string): void => {
      color.set(u, GRAY);

      const entry = adjacency[u] as AdjacencyEntry | undefined;
      if (entry) {
        for (const ref of entry.outgoing) {
          const v = ref.targetSpecId;
          if (!color.has(v)) {
            color.set(v, WHITE);
          }

          if (color.get(v) === WHITE) {
            parentMap.set(v, u);
            dfsVisit(v);
          } else if (color.get(v) === GRAY) {
            const cycle: string[] = [];
            let node: string | null | undefined = u;
            while (node && node !== v) {
              cycle.unshift(node);
              node = parentMap.get(node);
            }
            cycle.unshift(v);
            cycle.push(v);
            cycles.push(cycle);
          }
        }
      }

      color.set(u, BLACK);
    };

    for (const specId of Object.keys(adjacency)) {
      if (color.get(specId) === WHITE) {
        parentMap.set(specId, null);
        dfsVisit(specId);
      }
    }

    return cycles.length > 0 ? cycles : null;
  }
}
