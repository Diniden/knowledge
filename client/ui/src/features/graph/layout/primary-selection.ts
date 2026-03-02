import type { GraphNodeData, GraphEdgeData } from '../types.js';

/**
 * Selects the primary (root) node for tree layout.
 * If selectedNodeId is provided and valid, uses that.
 * Otherwise picks the node with the most incoming edges but fewest outgoing
 * (a "leaf" in the dependency sense), falling back to alphabetical.
 */
export function selectPrimaryNode(
  nodes: GraphNodeData[],
  edges: GraphEdgeData[],
  selectedNodeId?: string,
): string | undefined {
  if (nodes.length === 0) return undefined;

  if (selectedNodeId && nodes.some((n) => n.id === selectedNodeId)) {
    return selectedNodeId;
  }

  const incomingCount = new Map<string, number>();
  const outgoingCount = new Map<string, number>();

  for (const node of nodes) {
    incomingCount.set(node.id, 0);
    outgoingCount.set(node.id, 0);
  }

  for (const edge of edges) {
    incomingCount.set(
      edge.targetId,
      (incomingCount.get(edge.targetId) ?? 0) + 1,
    );
    outgoingCount.set(
      edge.sourceId,
      (outgoingCount.get(edge.sourceId) ?? 0) + 1,
    );
  }

  const sorted = [...nodes].sort((a, b) => {
    const aIncoming = incomingCount.get(a.id) ?? 0;
    const bIncoming = incomingCount.get(b.id) ?? 0;
    const aOutgoing = outgoingCount.get(a.id) ?? 0;
    const bOutgoing = outgoingCount.get(b.id) ?? 0;

    // Prefer: most incoming, fewest outgoing
    const aScore = aIncoming - aOutgoing;
    const bScore = bIncoming - bOutgoing;

    if (bScore !== aScore) return bScore - aScore;

    // Tie-break: more total connections
    const aDegree = aIncoming + aOutgoing;
    const bDegree = bIncoming + bOutgoing;
    if (bDegree !== aDegree) return bDegree - aDegree;

    return a.title.localeCompare(b.title);
  });

  return sorted[0]?.id;
}
