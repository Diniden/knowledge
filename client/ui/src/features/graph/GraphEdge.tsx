import { memo, useState, useCallback } from 'react';
import { EdgeType } from '@kg/shared';
import './GraphEdge.scss';

export interface GraphEdgeProps {
  sourcePos: { x: number; y: number };
  targetPos: { x: number; y: number };
  type: EdgeType;
  isHighlighted: boolean;
}

const EDGE_COLORS: Record<EdgeType, string> = {
  [EdgeType.DERIVED_FROM]: '#3B82F6',
  [EdgeType.DEPENDS_ON]: '#F59E0B',
  [EdgeType.RELATED_TO]: '#9CA3AF',
  [EdgeType.CONTRADICTS]: '#EF4444',
  [EdgeType.SUPERSEDES]: '#8B5CF6',
};

const EDGE_LABELS: Record<EdgeType, string> = {
  [EdgeType.DERIVED_FROM]: 'Derived From',
  [EdgeType.DEPENDS_ON]: 'Depends On',
  [EdgeType.RELATED_TO]: 'Related To',
  [EdgeType.CONTRADICTS]: 'Contradicts',
  [EdgeType.SUPERSEDES]: 'Supersedes',
};

const DASHED_TYPES = new Set<EdgeType>([EdgeType.RELATED_TO]);

const MODIFIER_MAP: Record<EdgeType, string> = {
  [EdgeType.DERIVED_FROM]: 'GraphEdge--derivedFrom',
  [EdgeType.DEPENDS_ON]: 'GraphEdge--dependsOn',
  [EdgeType.RELATED_TO]: 'GraphEdge--relatedTo',
  [EdgeType.CONTRADICTS]: 'GraphEdge--contradicts',
  [EdgeType.SUPERSEDES]: 'GraphEdge--supersedes',
};

function computeOrthogonalPath(
  sx: number,
  sy: number,
  tx: number,
  ty: number,
  cornerRadius = 8,
): string {
  if (sx === tx) {
    return `M ${sx} ${sy} L ${tx} ${ty}`;
  }

  const midY = (sy + ty) / 2;
  const dx = tx - sx;
  const signX = dx > 0 ? 1 : -1;
  const r = Math.min(
    cornerRadius,
    Math.abs(dx) / 2,
    Math.abs(midY - sy),
    Math.abs(ty - midY),
  );

  return [
    `M ${sx} ${sy}`,
    `L ${sx} ${midY - r}`,
    `Q ${sx} ${midY}, ${sx + signX * r} ${midY}`,
    `L ${tx - signX * r} ${midY}`,
    `Q ${tx} ${midY}, ${tx} ${midY + r}`,
    `L ${tx} ${ty}`,
  ].join(' ');
}

export const GraphEdge = memo(function GraphEdge({
  sourcePos,
  targetPos,
  type,
  isHighlighted,
}: GraphEdgeProps) {
  const [hovered, setHovered] = useState(false);

  const handleMouseEnter = useCallback(() => setHovered(true), []);
  const handleMouseLeave = useCallback(() => setHovered(false), []);

  const color = EDGE_COLORS[type];
  const isDashed = DASHED_TYPES.has(type);
  const modifier = MODIFIER_MAP[type] ?? '';
  const markerId = `arrowhead-${type}`;

  const classes = [
    'GraphEdge',
    modifier,
    isHighlighted && 'GraphEdge--highlighted',
  ]
    .filter(Boolean)
    .join(' ');

  const d = computeOrthogonalPath(
    sourcePos.x,
    sourcePos.y,
    targetPos.x,
    targetPos.y,
  );

  return (
    <g
      className={classes}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <defs>
        <marker
          id={markerId}
          viewBox="0 0 10 7"
          refX="10"
          refY="3.5"
          markerWidth="5"
          markerHeight="3.5"
          orient="auto-start-reverse"
        >
          <polygon points="0 0, 10 3.5, 0 7" fill={color} />
        </marker>
      </defs>
      <path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth={isHighlighted || hovered ? 2.5 : 1.5}
        strokeDasharray={isDashed ? '6 4' : undefined}
        markerEnd={`url(#${markerId})`}
        opacity={isHighlighted || hovered ? 1 : 0.6}
        className="GraphEdge__path"
      />
      {/* Wider invisible hit area for hover */}
      <path
        d={d}
        fill="none"
        stroke="transparent"
        strokeWidth={12}
        style={{ cursor: 'pointer' }}
      />
      {hovered && (
        <text
          x={(sourcePos.x + targetPos.x) / 2}
          y={(sourcePos.y + targetPos.y) / 2 - 8}
          textAnchor="middle"
          className="GraphEdge__label"
          fill={color}
          fontSize={11}
          fontWeight={500}
        >
          {EDGE_LABELS[type]}
        </text>
      )}
    </g>
  );
});
