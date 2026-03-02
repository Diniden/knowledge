import { describe, test, expect, beforeEach, mock } from 'bun:test';
import type { AdjacencyMap } from '@kg/shared';
import { GraphTraversalService } from './graph-traversal.service.js';

function makeSpec(id: string) {
  return {
    id,
    title: `Spec ${id}`,
    content: `Content for ${id}`,
    status: 'active',
    tags: [],
    documentId: 'doc-1',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  };
}

function createMockSpecsService(specIds: string[]) {
  const specs = new Map(specIds.map((id) => [id, makeSpec(id)]));
  return {
    findById: mock((id: string) => {
      const spec = specs.get(id);
      if (!spec) return Promise.reject(new Error(`Spec not found: ${id}`));
      return Promise.resolve(spec);
    }),
  };
}

/**
 * Build an adjacency map from a simple edge list.
 * Each edge is [sourceId, targetId].
 */
function buildAdjacency(edges: [string, string][]): AdjacencyMap {
  const map: AdjacencyMap = {};
  for (const [source, target] of edges) {
    if (!map[source]) map[source] = { outgoing: [], incoming: [] };
    if (!map[target]) map[target] = { outgoing: [], incoming: [] };
    map[source]!.outgoing.push({
      edgeId: `${source}->${target}`,
      targetSpecId: target,
      type: 'related_to' as never,
    });
    map[target]!.incoming.push({
      edgeId: `${source}->${target}`,
      sourceSpecId: source,
      type: 'related_to' as never,
    });
  }
  return map;
}

describe('GraphTraversalService', () => {
  let service: GraphTraversalService;

  const allIds = ['A', 'B', 'C', 'D', 'E'];

  beforeEach(() => {
    const specsService = createMockSpecsService(allIds);
    service = new GraphTraversalService(specsService as never);
  });

  describe('bfs', () => {
    test('should traverse graph correctly', async () => {
      const adjacency = buildAdjacency([
        ['A', 'B'],
        ['A', 'C'],
        ['B', 'D'],
      ]);

      const result = await service.bfs('A', adjacency);
      const ids = result.map((n) => n.id);

      expect(ids).toContain('A');
      expect(ids).toContain('B');
      expect(ids).toContain('C');
      expect(ids).toContain('D');
      expect(result[0]!.depth).toBe(0);
    });

    test('should respect max depth', async () => {
      const adjacency = buildAdjacency([
        ['A', 'B'],
        ['B', 'C'],
        ['C', 'D'],
        ['D', 'E'],
      ]);

      const result = await service.bfs('A', adjacency, 2);
      const ids = result.map((n) => n.id);

      expect(ids).toContain('A');
      expect(ids).toContain('B');
      expect(ids).toContain('C');
      // D is at depth 3, should still be added but its children shouldn't be explored further
    });

    test('should handle single node with no edges', async () => {
      const adjacency: AdjacencyMap = {
        A: { outgoing: [], incoming: [] },
      };

      const result = await service.bfs('A', adjacency);
      expect(result).toHaveLength(1);
      expect(result[0]!.id).toBe('A');
    });
  });

  describe('dfs', () => {
    test('should visit all reachable nodes', async () => {
      const adjacency = buildAdjacency([
        ['A', 'B'],
        ['A', 'C'],
        ['B', 'D'],
      ]);

      const result = await service.dfs('A', adjacency);
      const ids = result.map((n) => n.id);

      expect(ids).toContain('A');
      expect(ids).toContain('B');
      expect(ids).toContain('C');
      expect(ids).toContain('D');
    });

    test('should not revisit nodes in cycles', async () => {
      const adjacency = buildAdjacency([
        ['A', 'B'],
        ['B', 'C'],
        ['C', 'A'],
      ]);

      const result = await service.dfs('A', adjacency);
      const ids = result.map((n) => n.id);

      expect(ids).toHaveLength(3);
      expect(new Set(ids).size).toBe(3);
    });
  });

  describe('findPath', () => {
    test('should return shortest path', async () => {
      const adjacency = buildAdjacency([
        ['A', 'B'],
        ['B', 'C'],
        ['A', 'C'],
      ]);

      const path = await service.findPath('A', 'C', adjacency);
      expect(path).not.toBeNull();
      expect(path![0]).toBe('A');
      expect(path![path!.length - 1]).toBe('C');
      // Direct edge A->C means path length should be 2
      expect(path).toHaveLength(2);
    });

    test('should return null for disconnected nodes', async () => {
      const adjacency = buildAdjacency([['A', 'B']]);
      // C exists but has no edges
      adjacency['C'] = { outgoing: [], incoming: [] };

      const path = await service.findPath('A', 'C', adjacency);
      expect(path).toBeNull();
    });

    test('should return single-element path for same source and target', async () => {
      const adjacency = buildAdjacency([['A', 'B']]);

      const path = await service.findPath('A', 'A', adjacency);
      expect(path).toEqual(['A']);
    });
  });

  describe('detectCycles', () => {
    test('should find cycles', async () => {
      const adjacency = buildAdjacency([
        ['A', 'B'],
        ['B', 'C'],
        ['C', 'A'],
      ]);

      const cycles = await service.detectCycles(adjacency);
      expect(cycles).not.toBeNull();
      expect(cycles!.length).toBeGreaterThan(0);
    });

    test('should return null for acyclic graph', async () => {
      const adjacency = buildAdjacency([
        ['A', 'B'],
        ['B', 'C'],
        ['A', 'C'],
      ]);

      const cycles = await service.detectCycles(adjacency);
      expect(cycles).toBeNull();
    });
  });

  describe('getNeighbors', () => {
    test('should return immediate neighbors at depth 1', async () => {
      const adjacency = buildAdjacency([
        ['A', 'B'],
        ['A', 'C'],
        ['B', 'D'],
      ]);

      const neighbors = await service.getNeighbors('A', adjacency, 1);
      expect(neighbors.has('B')).toBe(true);
      expect(neighbors.has('C')).toBe(true);
      expect(neighbors.has('D')).toBe(false);
      expect(neighbors.has('A')).toBe(false);
    });

    test('should return 2-hop neighbors at depth 2', async () => {
      const adjacency = buildAdjacency([
        ['A', 'B'],
        ['B', 'C'],
        ['C', 'D'],
      ]);

      const neighbors = await service.getNeighbors('A', adjacency, 2);
      expect(neighbors.has('B')).toBe(true);
      expect(neighbors.has('C')).toBe(true);
      expect(neighbors.has('D')).toBe(false);
    });
  });
});
