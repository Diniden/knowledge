import {
  useRef,
  useState,
  useMemo,
  useCallback,
  useEffect,
  type WheelEvent as ReactWheelEvent,
  type MouseEvent as ReactMouseEvent,
} from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { GraphNodeData, GraphEdgeData } from './types.js';
import { GraphNode } from './GraphNode.js';
import { GraphEdge } from './GraphEdge.js';
import './GraphCanvas.scss';

export interface GraphCanvasProps {
  nodes: GraphNodeData[];
  edges: GraphEdgeData[];
  selectedNodeId?: string;
  onNodeSelect: (nodeId: string) => void;
  onNodeExpand: (nodeId: string) => void;
  zoom: number;
  onZoomChange: (zoom: number) => void;
}

const NODE_WIDTH = 200;
const NODE_HEIGHT = 80;
const H_GAP = 24;
const V_GAP = 48;
const ROW_HEIGHT = NODE_HEIGHT + V_GAP;
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 1.5;

export function GraphCanvas({
  nodes,
  edges,
  selectedNodeId,
  onNodeSelect,
  onNodeExpand,
  zoom,
  onZoomChange,
}: GraphCanvasProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0, offsetX: 0, offsetY: 0 });

  const nodeMap = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);

  const depthLevels = useMemo(() => {
    const levels = new Map<number, GraphNodeData[]>();
    for (const node of nodes) {
      const existing = levels.get(node.depth) ?? [];
      existing.push(node);
      levels.set(node.depth, existing);
    }
    return Array.from(levels.entries())
      .sort(([a], [b]) => a - b)
      .map(([, nodesInLevel]) => nodesInLevel);
  }, [nodes]);

  // eslint-disable-next-line react-hooks/incompatible-library -- TanStack Virtual returns unstable refs; compiler skips memoization
  const rowVirtualizer = useVirtualizer({
    count: depthLevels.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 3,
  });

  const totalContentWidth = useMemo(() => {
    let max = 0;
    for (const level of depthLevels) {
      const w = level.length * (NODE_WIDTH + H_GAP) - H_GAP;
      if (w > max) max = w;
    }
    return max;
  }, [depthLevels]);

  const handleWheel = useCallback(
    (e: ReactWheelEvent<HTMLDivElement>) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.05 : 0.05;
        onZoomChange(Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom + delta)));
      }
    },
    [zoom, onZoomChange],
  );

  const handleMouseDown = useCallback(
    (e: ReactMouseEvent<HTMLDivElement>) => {
      if (
        e.target === e.currentTarget ||
        (e.target as HTMLElement).closest('.GraphCanvas__edges')
      ) {
        setIsPanning(true);
        panStartRef.current = {
          x: e.clientX,
          y: e.clientY,
          offsetX: panOffset.x,
          offsetY: panOffset.y,
        };
      }
    },
    [panOffset],
  );

  useEffect(() => {
    if (!isPanning) return;

    const handleMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - panStartRef.current.x;
      const dy = e.clientY - panStartRef.current.y;
      setPanOffset({
        x: panStartRef.current.offsetX + dx,
        y: panStartRef.current.offsetY + dy,
      });
    };

    const handleMouseUp = () => {
      setIsPanning(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isPanning]);

  const edgeLines = useMemo(() => {
    return edges
      .map((edge) => {
        const source = nodeMap.get(edge.sourceId);
        const target = nodeMap.get(edge.targetId);
        if (!source || !target) return null;

        return {
          edge,
          sourcePos: {
            x: source.x + NODE_WIDTH / 2,
            y: source.y + V_GAP / 2 + NODE_HEIGHT,
          },
          targetPos: {
            x: target.x + NODE_WIDTH / 2,
            y: target.y + V_GAP / 2,
          },
        };
      })
      .filter(Boolean) as Array<{
      edge: GraphEdgeData;
      sourcePos: { x: number; y: number };
      targetPos: { x: number; y: number };
    }>;
  }, [edges, nodeMap]);

  const totalHeight = depthLevels.length * ROW_HEIGHT;

  return (
    <div
      className={`GraphCanvas ${isPanning ? 'GraphCanvas--panning' : ''}`}
      ref={parentRef}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      role="tree"
      aria-label="Knowledge graph tree view"
      tabIndex={0}
    >
      <div
        className="GraphCanvas__viewport"
        style={{
          transform: `scale(${zoom}) translate(${panOffset.x / zoom}px, ${panOffset.y / zoom}px)`,
          transformOrigin: '0 0',
          width: totalContentWidth + 48,
          height: totalHeight,
          position: 'relative',
        }}
      >
        <svg
          className="GraphCanvas__edges"
          width={totalContentWidth + 48}
          height={totalHeight}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            pointerEvents: 'none',
          }}
        >
          <g style={{ pointerEvents: 'auto' }}>
            {edgeLines.map(({ edge, sourcePos, targetPos }) => (
              <GraphEdge
                key={edge.id}
                sourcePos={sourcePos}
                targetPos={targetPos}
                type={edge.type}
                isHighlighted={
                  edge.sourceId === selectedNodeId ||
                  edge.targetId === selectedNodeId
                }
              />
            ))}
          </g>
        </svg>
        <div className="GraphCanvas__nodes">
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const level = depthLevels[virtualRow.index];
            if (!level) return null;

            return (
              <div
                key={virtualRow.index}
                className="GraphCanvas__row"
                style={{
                  position: 'absolute',
                  top: virtualRow.start,
                  left: 0,
                  width: '100%',
                  height: ROW_HEIGHT,
                  display: 'flex',
                  justifyContent: 'center',
                  gap: H_GAP,
                  paddingTop: V_GAP / 2,
                }}
              >
                {level.map((node) => (
                  <div
                    key={node.id}
                    style={{
                      position: 'absolute',
                      left: node.x,
                      top: V_GAP / 2,
                    }}
                  >
                    <GraphNode
                      node={node}
                      isSelected={node.id === selectedNodeId}
                      isExpanded={false}
                      onClick={() => onNodeSelect(node.id)}
                      onDoubleClick={() => onNodeExpand(node.id)}
                    />
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
