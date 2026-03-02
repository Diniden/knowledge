import type {
  GraphNodeData,
  GraphEdgeData,
  LayoutOptions,
  LayoutResult,
} from '../types.js';

const DEFAULT_OPTIONS: LayoutOptions = {
  nodeWidth: 200,
  nodeHeight: 80,
  horizontalGap: 24,
  verticalGap: 48,
};

/**
 * BFS tree layout: assigns depth levels from a root node,
 * then distributes nodes horizontally per level row.
 */
export function computeTreeLayout(
  nodes: GraphNodeData[],
  edges: GraphEdgeData[],
  primaryNodeId: string,
  options: Partial<LayoutOptions> = {},
): LayoutResult {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const nodeMap = new Map(nodes.map((n) => [n.id, { ...n }]));

  if (nodes.length === 0) {
    return { nodes: [], width: 0, height: 0 };
  }

  const adjacency = buildAdjacencyList(edges);
  const depthLevels = bfsLevels(primaryNodeId, adjacency, nodeMap);

  const positioned = assignPositions(depthLevels, nodeMap, opts);
  const width = computeTotalWidth(depthLevels, opts);
  const height =
    depthLevels.length * (opts.nodeHeight + opts.verticalGap) -
    opts.verticalGap;

  return { nodes: positioned, width, height };
}

function buildAdjacencyList(edges: GraphEdgeData[]): Map<string, Set<string>> {
  const adj = new Map<string, Set<string>>();
  for (const edge of edges) {
    if (!adj.has(edge.sourceId)) adj.set(edge.sourceId, new Set());
    if (!adj.has(edge.targetId)) adj.set(edge.targetId, new Set());
    adj.get(edge.sourceId)!.add(edge.targetId);
    adj.get(edge.targetId)!.add(edge.sourceId);
  }
  return adj;
}

function bfsLevels(
  startId: string,
  adjacency: Map<string, Set<string>>,
  nodeMap: Map<string, GraphNodeData>,
): string[][] {
  const visited = new Set<string>();
  const levels: string[][] = [];
  const queue: Array<{ id: string; depth: number }> = [];

  if (!nodeMap.has(startId)) {
    return levels;
  }

  visited.add(startId);
  queue.push({ id: startId, depth: 0 });

  while (queue.length > 0) {
    const current = queue.shift()!;

    while (levels.length <= current.depth) {
      levels.push([]);
    }
    levels[current.depth]!.push(current.id);

    const neighbors = adjacency.get(current.id);
    if (neighbors) {
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor) && nodeMap.has(neighbor)) {
          visited.add(neighbor);
          queue.push({ id: neighbor, depth: current.depth + 1 });
        }
      }
    }
  }

  // Include disconnected nodes at the end
  for (const [id] of nodeMap) {
    if (!visited.has(id)) {
      const lastDepth = levels.length;
      if (levels.length <= lastDepth) levels.push([]);
      levels[lastDepth]!.push(id);
    }
  }

  return levels;
}

function assignPositions(
  depthLevels: string[][],
  nodeMap: Map<string, GraphNodeData>,
  opts: LayoutOptions,
): GraphNodeData[] {
  const maxRowWidth = depthLevels.reduce(
    (max, level) =>
      Math.max(
        max,
        level.length * (opts.nodeWidth + opts.horizontalGap) -
          opts.horizontalGap,
      ),
    0,
  );

  const result: GraphNodeData[] = [];

  for (let depth = 0; depth < depthLevels.length; depth++) {
    const level = depthLevels[depth]!;
    const rowWidth =
      level.length * (opts.nodeWidth + opts.horizontalGap) - opts.horizontalGap;
    const offsetX = (maxRowWidth - rowWidth) / 2;

    for (let i = 0; i < level.length; i++) {
      const nodeId = level[i]!;
      const node = nodeMap.get(nodeId);
      if (!node) continue;

      result.push({
        ...node,
        depth,
        x: offsetX + i * (opts.nodeWidth + opts.horizontalGap),
        y: depth * (opts.nodeHeight + opts.verticalGap),
      });
    }
  }

  return result;
}

function computeTotalWidth(
  depthLevels: string[][],
  opts: LayoutOptions,
): number {
  let max = 0;
  for (const level of depthLevels) {
    const w =
      level.length * (opts.nodeWidth + opts.horizontalGap) - opts.horizontalGap;
    if (w > max) max = w;
  }
  return Math.max(max, 0);
}
