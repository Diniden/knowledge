import { useState, useMemo, useCallback } from 'react';
import { AppLayout } from '../components/layout/AppLayout.js';
import {
  GraphCanvas,
  GraphToolbar,
  GraphLegend,
  ExpandedNodeView,
  computeTreeLayout,
  selectPrimaryNode,
} from '../features/graph/index.js';
import {
  MOCK_NODES,
  MOCK_EDGES,
  MOCK_CONTENT,
  EDGE_TYPE_CONFIGS,
} from '../features/graph/mock-data.js';
import './GraphPage.scss';

export function GraphPage() {
  const [selectedNodeId, setSelectedNodeId] = useState<string | undefined>();
  const [expandedNodeId, setExpandedNodeId] = useState<string | undefined>();
  const [zoom, setZoom] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [hiddenEdgeTypes, setHiddenEdgeTypes] = useState<Set<string>>(
    new Set(),
  );
  const [breadcrumbs, setBreadcrumbs] = useState<
    Array<{ id: string; title: string }>
  >([]);

  const primaryNodeId = useMemo(
    () => selectPrimaryNode(MOCK_NODES, MOCK_EDGES, selectedNodeId),
    [selectedNodeId],
  );

  const layout = useMemo(
    () =>
      primaryNodeId
        ? computeTreeLayout(MOCK_NODES, MOCK_EDGES, primaryNodeId)
        : { nodes: MOCK_NODES, width: 0, height: 0 },
    [primaryNodeId],
  );

  const filteredEdges = useMemo(
    () => MOCK_EDGES.filter((e) => !hiddenEdgeTypes.has(e.type)),
    [hiddenEdgeTypes],
  );

  const filteredNodes = useMemo(() => {
    if (!searchQuery.trim()) return layout.nodes;
    const q = searchQuery.toLowerCase();
    return layout.nodes.filter(
      (n) =>
        n.title.toLowerCase().includes(q) ||
        n.summary.toLowerCase().includes(q),
    );
  }, [layout.nodes, searchQuery]);

  const nodeMap = useMemo(
    () => new Map(layout.nodes.map((n) => [n.id, n])),
    [layout.nodes],
  );

  const expandedNode = expandedNodeId ? nodeMap.get(expandedNodeId) : undefined;

  const connectedNodes = useMemo(() => {
    if (!expandedNodeId) return [];
    const connectedIds = new Set<string>();
    for (const edge of MOCK_EDGES) {
      if (edge.sourceId === expandedNodeId) connectedIds.add(edge.targetId);
      if (edge.targetId === expandedNodeId) connectedIds.add(edge.sourceId);
    }
    return layout.nodes.filter((n) => connectedIds.has(n.id));
  }, [expandedNodeId, layout.nodes]);

  const handleNodeSelect = useCallback((nodeId: string) => {
    setSelectedNodeId(nodeId);
  }, []);

  const handleNodeExpand = useCallback(
    (nodeId: string) => {
      const node = nodeMap.get(nodeId);
      if (!node) return;

      if (expandedNodeId) {
        const currentNode = nodeMap.get(expandedNodeId);
        if (currentNode) {
          setBreadcrumbs((prev) => [
            ...prev,
            { id: currentNode.id, title: currentNode.title },
          ]);
        }
      }
      setExpandedNodeId(nodeId);
      setSelectedNodeId(nodeId);
    },
    [expandedNodeId, nodeMap],
  );

  const handleExpandedClose = useCallback(() => {
    setExpandedNodeId(undefined);
    setBreadcrumbs([]);
  }, []);

  const handleExpandedNavigate = useCallback(
    (nodeId: string) => {
      const currentNode = expandedNodeId
        ? nodeMap.get(expandedNodeId)
        : undefined;

      const crumbIndex = breadcrumbs.findIndex((b) => b.id === nodeId);
      if (crumbIndex >= 0) {
        setBreadcrumbs((prev) => prev.slice(0, crumbIndex));
      } else if (currentNode) {
        setBreadcrumbs((prev) => [
          ...prev,
          { id: currentNode.id, title: currentNode.title },
        ]);
      }

      setExpandedNodeId(nodeId);
      setSelectedNodeId(nodeId);
    },
    [expandedNodeId, nodeMap, breadcrumbs],
  );

  const handleZoomIn = useCallback(() => {
    setZoom((z) => Math.min(1.5, z + 0.1));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom((z) => Math.max(0.5, z - 0.1));
  }, []);

  const handleFitToView = useCallback(() => {
    setZoom(1);
  }, []);

  const handleToggleEdgeType = useCallback((type: string) => {
    setHiddenEdgeTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  }, []);

  return (
    <AppLayout>
      <div className="GraphPage">
        <GraphToolbar
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onFitToView={handleFitToView}
          onSearch={setSearchQuery}
          zoom={zoom}
        />
        <div className="GraphPage__canvasWrapper">
          <GraphCanvas
            nodes={searchQuery.trim() ? filteredNodes : layout.nodes}
            edges={filteredEdges}
            selectedNodeId={selectedNodeId}
            onNodeSelect={handleNodeSelect}
            onNodeExpand={handleNodeExpand}
            zoom={zoom}
            onZoomChange={setZoom}
          />
          <GraphLegend
            edgeTypes={EDGE_TYPE_CONFIGS}
            hiddenTypes={hiddenEdgeTypes}
            onToggle={handleToggleEdgeType}
          />
        </div>

        {expandedNode && (
          <ExpandedNodeView
            node={expandedNode}
            content={MOCK_CONTENT}
            connectedNodes={connectedNodes}
            breadcrumbs={breadcrumbs}
            onClose={handleExpandedClose}
            onNodeNavigate={handleExpandedNavigate}
          />
        )}
      </div>
    </AppLayout>
  );
}
