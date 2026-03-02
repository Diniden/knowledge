import type { ReactNode } from 'react';
import { Badge } from '../../components/common/Badge';
import './SpecBoundary.scss';

export type SpecStatus = 'draft' | 'reviewed' | 'approved';

export interface SpecBoundaryProps {
  specId: string;
  title: string;
  status?: SpecStatus;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onSelect: (specId: string) => void;
  children: ReactNode;
}

const STATUS_BADGE_VARIANT: Record<SpecStatus, 'info' | 'success' | 'primary'> =
  {
    draft: 'info',
    reviewed: 'success',
    approved: 'primary',
  };

export function SpecBoundary({
  specId,
  title,
  status = 'draft',
  isCollapsed,
  onToggleCollapse,
  onSelect,
  children,
}: SpecBoundaryProps) {
  const classes = [
    'SpecBoundary',
    `SpecBoundary--${status}`,
    isCollapsed && 'SpecBoundary--collapsed',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <section className={classes} aria-label={`Spec: ${title}`}>
      <div
        className="SpecBoundary__header"
        onClick={onToggleCollapse}
        role="button"
        tabIndex={0}
        aria-expanded={!isCollapsed}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onToggleCollapse();
          }
        }}
      >
        <span
          className="SpecBoundary__title"
          onClick={(e) => {
            e.stopPropagation();
            onSelect(specId);
          }}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onSelect(specId);
            }
          }}
        >
          {title}
        </span>

        <Badge
          className="SpecBoundary__status"
          variant={STATUS_BADGE_VARIANT[status]}
          size="sm"
        >
          {status}
        </Badge>

        <span className="SpecBoundary__toggle" aria-hidden="true">
          ▾
        </span>
      </div>

      {isCollapsed && <div className="SpecBoundary__summary">{title}</div>}

      {!isCollapsed && <div className="SpecBoundary__content">{children}</div>}
    </section>
  );
}
