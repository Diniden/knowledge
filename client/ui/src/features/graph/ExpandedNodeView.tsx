import { memo, useCallback, useEffect, useRef } from 'react';
import type { GraphNodeData } from './types.js';
import { GraphNode } from './GraphNode.js';
import './ExpandedNodeView.scss';

export interface ExpandedNodeViewProps {
  node: GraphNodeData;
  content: string;
  connectedNodes: GraphNodeData[];
  breadcrumbs: Array<{ id: string; title: string }>;
  onClose: () => void;
  onNodeNavigate: (nodeId: string) => void;
}

export const ExpandedNodeView = memo(function ExpandedNodeView({
  node,
  content,
  connectedNodes,
  breadcrumbs,
  onClose,
  onNodeNavigate,
}: ExpandedNodeViewProps) {
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Focus trap: auto-focus close button on mount
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    closeButtonRef.current?.focus();
  }, []);

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        onClose();
      }
    },
    [onClose],
  );

  const handleBackdropKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (e.target === e.currentTarget) onClose();
      }
    },
    [onClose],
  );

  return (
    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- dialog backdrop close on click
    <div
      className="ExpandedNodeView"
      onClick={handleBackdropClick}
      onKeyDown={handleBackdropKeyDown}
      role="dialog"
      aria-modal="true"
      aria-label={`Expanded view: ${node.title}`}
      tabIndex={-1}
    >
      <div className="ExpandedNodeView__container">
        {breadcrumbs.length > 0 && (
          <nav
            className="ExpandedNodeView__breadcrumbs"
            aria-label="Navigation breadcrumbs"
          >
            {breadcrumbs.map((crumb, i) => (
              <button
                key={crumb.id}
                className="ExpandedNodeView__breadcrumb"
                onClick={() => onNodeNavigate(crumb.id)}
                type="button"
              >
                {crumb.title}
                {i < breadcrumbs.length - 1 && (
                  <span
                    className="ExpandedNodeView__breadcrumbSep"
                    aria-hidden="true"
                  >
                    /
                  </span>
                )}
              </button>
            ))}
            <span className="ExpandedNodeView__breadcrumb ExpandedNodeView__breadcrumb--current">
              {node.title}
            </span>
          </nav>
        )}

        <button
          ref={closeButtonRef}
          className="ExpandedNodeView__close"
          onClick={onClose}
          type="button"
          aria-label="Close expanded view"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        <div className="ExpandedNodeView__header">
          <h2 className="ExpandedNodeView__title">{node.title}</h2>
          <p className="ExpandedNodeView__summary">{node.summary}</p>
        </div>

        <div
          className="ExpandedNodeView__content"
          ref={contentRef}
          dangerouslySetInnerHTML={{ __html: content }}
        />

        {connectedNodes.length > 0 && (
          <div className="ExpandedNodeView__connections">
            <h3 className="ExpandedNodeView__connectionsTitle">
              Connected Nodes
            </h3>
            <div className="ExpandedNodeView__connectionsList">
              {connectedNodes.map((cn) => (
                <div key={cn.id} className="ExpandedNodeView__connectionCard">
                  <GraphNode
                    node={cn}
                    isSelected={false}
                    isExpanded={false}
                    onClick={() => onNodeNavigate(cn.id)}
                    onDoubleClick={() => onNodeNavigate(cn.id)}
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
});
