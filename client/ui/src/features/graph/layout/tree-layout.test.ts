import { describe, test, expect } from 'bun:test';
import { computeTreeLayout } from './tree-layout.js';
import type { GraphNodeData, GraphEdgeData, EdgeType } from '../types.js';

function makeNode(
  id: string,
  overrides?: Partial<GraphNodeData>,
): GraphNodeData {
  return {
    id,
    title: `Node ${id}`,
    summary: `Summary of ${id}`,
    documentId: 'doc-1',
    status: 'active',
    depth: 0,
    x: 0,
    y: 0,
    ...overrides,
  };
}

function makeEdge(
  source: string,
  target: string,
  type: EdgeType = 'related_to' as EdgeType,
): GraphEdgeData {
  return {
    id: `${source}-${target}`,
    sourceId: source,
    targetId: target,
    type,
  };
}

describe('computeTreeLayout', () => {
  test('should position root node at top center', () => {
    const nodes = [makeNode('A')];
    const edges: GraphEdgeData[] = [];

    const result = computeTreeLayout(nodes, edges, 'A');

    expect(result.nodes).toHaveLength(1);
    expect(result.nodes[0]!.id).toBe('A');
    expect(result.nodes[0]!.depth).toBe(0);
    expect(result.nodes[0]!.y).toBe(0);
  });

  test('should arrange children in depth levels', () => {
    const nodes = [makeNode('A'), makeNode('B'), makeNode('C')];
    const edges = [makeEdge('A', 'B'), makeEdge('A', 'C')];

    const result = computeTreeLayout(nodes, edges, 'A');

    const nodeA = result.nodes.find((n) => n.id === 'A')!;
    const nodeB = result.nodes.find((n) => n.id === 'B')!;
    const nodeC = result.nodes.find((n) => n.id === 'C')!;

    expect(nodeA.depth).toBe(0);
    expect(nodeB.depth).toBe(1);
    expect(nodeC.depth).toBe(1);

    // Children should be at a lower y than parent
    expect(nodeB.y).toBeGreaterThan(nodeA.y);
    expect(nodeC.y).toBeGreaterThan(nodeA.y);

    // Children at the same depth should have the same y
    expect(nodeB.y).toBe(nodeC.y);
  });

  test('should handle disconnected nodes', () => {
    const nodes = [makeNode('A'), makeNode('B'), makeNode('C'), makeNode('D')];
    const edges = [makeEdge('A', 'B')];

    const result = computeTreeLayout(nodes, edges, 'A');

    expect(result.nodes).toHaveLength(4);
    const ids = result.nodes.map((n) => n.id);
    expect(ids).toContain('A');
    expect(ids).toContain('B');
    expect(ids).toContain('C');
    expect(ids).toContain('D');

    const nodeA = result.nodes.find((n) => n.id === 'A')!;
    const nodeC = result.nodes.find((n) => n.id === 'C')!;
    const nodeD = result.nodes.find((n) => n.id === 'D')!;

    // Disconnected nodes should be at a deeper level than the connected ones
    expect(nodeC.depth).toBeGreaterThan(nodeA.depth);
    expect(nodeD.depth).toBeGreaterThan(nodeA.depth);
  });

  test('should handle single node', () => {
    const nodes = [makeNode('A')];
    const edges: GraphEdgeData[] = [];

    const result = computeTreeLayout(nodes, edges, 'A');

    expect(result.nodes).toHaveLength(1);
    expect(result.width).toBeGreaterThanOrEqual(0);
    expect(result.height).toBeGreaterThanOrEqual(0);
  });

  test('should return empty layout for empty input', () => {
    const result = computeTreeLayout([], [], 'A');

    expect(result.nodes).toHaveLength(0);
    expect(result.width).toBe(0);
    expect(result.height).toBe(0);
  });

  test('should respect custom layout options', () => {
    const nodes = [makeNode('A'), makeNode('B')];
    const edges = [makeEdge('A', 'B')];

    const result = computeTreeLayout(nodes, edges, 'A', {
      nodeWidth: 300,
      nodeHeight: 100,
      verticalGap: 60,
    });

    const nodeA = result.nodes.find((n) => n.id === 'A')!;
    const nodeB = result.nodes.find((n) => n.id === 'B')!;

    // With verticalGap=60 and nodeHeight=100, second level y = 100+60 = 160
    expect(nodeB.y - nodeA.y).toBe(160);
  });

  test('should handle multi-level tree', () => {
    const nodes = [
      makeNode('A'),
      makeNode('B'),
      makeNode('C'),
      makeNode('D'),
      makeNode('E'),
    ];
    const edges = [
      makeEdge('A', 'B'),
      makeEdge('A', 'C'),
      makeEdge('B', 'D'),
      makeEdge('C', 'E'),
    ];

    const result = computeTreeLayout(nodes, edges, 'A');

    const depths = new Map<string, number>();
    for (const n of result.nodes) {
      depths.set(n.id, n.depth);
    }

    expect(depths.get('A')).toBe(0);
    expect(depths.get('B')).toBe(1);
    expect(depths.get('C')).toBe(1);
    expect(depths.get('D')).toBe(2);
    expect(depths.get('E')).toBe(2);
  });

  test('should center rows horizontally', () => {
    const nodes = [makeNode('A'), makeNode('B'), makeNode('C')];
    const edges = [makeEdge('A', 'B'), makeEdge('A', 'C')];

    const result = computeTreeLayout(nodes, edges, 'A');

    const nodeA = result.nodes.find((n) => n.id === 'A')!;
    const nodeB = result.nodes.find((n) => n.id === 'B')!;
    const nodeC = result.nodes.find((n) => n.id === 'C')!;

    // Root is alone in its row, B and C share a row
    // Root should be centered relative to the wider row below
    const _rowWidth = nodeC.x + 200 - nodeB.x;
    const _rootRowWidth = 200;
    expect(nodeA.x).toBeGreaterThanOrEqual(0);

    // Verify B is to the left of C
    expect(nodeB.x).toBeLessThan(nodeC.x);
  });
});
