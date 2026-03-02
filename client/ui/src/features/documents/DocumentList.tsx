import { useState, useMemo } from 'react';
import { Input } from '../../components/common/Input';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import './DocumentList.scss';

export interface DocumentListItem {
  id: string;
  title: string;
  specCount: number;
  updatedAt: string;
}

export interface DocumentListProps {
  documents: DocumentListItem[];
  selectedId?: string;
  onSelect: (id: string) => void;
  onCreate: () => void;
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = Date.now();
  const diffMs = now - date.getTime();
  const diffMins = Math.floor(diffMs / 60_000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `${diffDays}d ago`;

  return date.toLocaleDateString();
}

export function DocumentList({
  documents,
  selectedId,
  onSelect,
  onCreate,
}: DocumentListProps) {
  const [filter, setFilter] = useState('');

  const filtered = useMemo(() => {
    if (!filter.trim()) return documents;
    const lower = filter.toLowerCase();
    return documents.filter((d) => d.title.toLowerCase().includes(lower));
  }, [documents, filter]);

  return (
    <div className="DocumentList">
      <div className="DocumentList__header">
        <Input
          className="DocumentList__search"
          placeholder="Search documents…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          aria-label="Filter documents"
        />
      </div>

      <div
        className="DocumentList__items"
        role="listbox"
        aria-label="Documents"
      >
        {filtered.map((doc) => {
          const classes = [
            'DocumentList__item',
            selectedId === doc.id && 'DocumentList__item--active',
          ]
            .filter(Boolean)
            .join(' ');

          return (
            <div
              key={doc.id}
              className={classes}
              role="option"
              aria-selected={selectedId === doc.id}
              tabIndex={0}
              onClick={() => onSelect(doc.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelect(doc.id);
                }
              }}
            >
              <span className="DocumentList__itemTitle">{doc.title}</span>
              <span className="DocumentList__itemMeta">
                <Badge size="sm">{doc.specCount} specs</Badge>
                <span>{formatRelativeTime(doc.updatedAt)}</span>
              </span>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="DocumentList__item" style={{ cursor: 'default' }}>
            <span
              className="DocumentList__itemTitle"
              style={{ color: 'var(--color-text-tertiary)' }}
            >
              No documents found
            </span>
          </div>
        )}
      </div>

      <div className="DocumentList__create">
        <Button variant="primary" fullWidth onClick={onCreate}>
          New Document
        </Button>
      </div>
    </div>
  );
}
