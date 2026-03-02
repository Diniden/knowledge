import { memo, useCallback } from 'react';
import type { GraphNodeData } from './types.js';
import './GraphNode.scss';

export interface GraphNodeProps {
  node: GraphNodeData;
  isSelected: boolean;
  isExpanded: boolean;
  onClick: () => void;
  onDoubleClick: () => void;
}

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  reviewed: 'Reviewed',
  approved: 'Approved',
};

export const GraphNode = memo(function GraphNode({
  node,
  isSelected,
  isExpanded,
  onClick,
  onDoubleClick,
}: GraphNodeProps) {
  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onDoubleClick();
    },
    [onDoubleClick],
  );

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onClick();
    },
    [onClick],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onClick();
      }
    },
    [onClick],
  );

  const statusModifier = node.status ? `GraphNode__status--${node.status}` : '';

  const classes = [
    'GraphNode',
    isSelected && 'GraphNode--selected',
    isExpanded && 'GraphNode--expanded',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={classes}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onDoubleClick={handleDoubleClick}
      role="treeitem"
      aria-selected={isSelected}
      tabIndex={0}
    >
      <div className="GraphNode__header">
        <span className="GraphNode__title">{node.title}</span>
        <span
          className={`GraphNode__status ${statusModifier}`}
          title={STATUS_LABELS[node.status] ?? node.status}
        />
      </div>
      <p className="GraphNode__summary">{node.summary}</p>
    </div>
  );
});
