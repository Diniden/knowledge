import { useCallback, useState } from 'react';
import { SpecBoundary } from './SpecBoundary';
import type { SpecStatus } from './SpecBoundary';
import { SpecEditor } from './SpecEditor';
import { Button } from '../../components/common/Button';
import './DocumentView.scss';

export interface DocumentViewSpec {
  id: string;
  title: string;
  content: string;
  status: string;
}

export interface DocumentViewProps {
  documentId: string;
  title: string;
  specs: DocumentViewSpec[];
  onSpecSelect: (specId: string) => void;
  onSpecUpdate: (specId: string, content: string) => void;
}

export function DocumentView({
  documentId,
  title,
  specs,
  onSpecSelect,
  onSpecUpdate,
}: DocumentViewProps) {
  const [collapsedSpecs, setCollapsedSpecs] = useState<Set<string>>(new Set());

  const toggleCollapse = useCallback((specId: string) => {
    setCollapsedSpecs((prev) => {
      const next = new Set(prev);
      if (next.has(specId)) {
        next.delete(specId);
      } else {
        next.add(specId);
      }
      return next;
    });
  }, []);

  const handleMoveUp = useCallback(
    (index: number) => {
      if (index <= 0) return;
      const spec = specs[index];
      if (spec) {
        onSpecSelect(spec.id);
      }
    },
    [specs, onSpecSelect],
  );

  const handleMoveDown = useCallback(
    (index: number) => {
      if (index >= specs.length - 1) return;
      const spec = specs[index];
      if (spec) {
        onSpecSelect(spec.id);
      }
    },
    [specs, onSpecSelect],
  );

  if (specs.length === 0) {
    return (
      <div className="DocumentView">
        <div className="DocumentView__header">
          <h1 className="DocumentView__title">{title}</h1>
        </div>
        <div className="DocumentView__empty">
          <span className="DocumentView__emptyTitle">No specs yet</span>
          <span className="DocumentView__emptyDescription">
            Create your first spec to start building this document.
          </span>
          <Button variant="primary" onClick={() => onSpecSelect('new')}>
            Add Spec
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="DocumentView">
      <div className="DocumentView__header">
        <h1 className="DocumentView__title">{title}</h1>
      </div>

      <div className="DocumentView__specs">
        {specs.map((spec, index) => (
          <div key={spec.id}>
            <div className="DocumentView__specActions">
              <button
                type="button"
                onClick={() => handleMoveUp(index)}
                disabled={index === 0}
                aria-label="Move spec up"
                title="Move up"
              >
                ↑
              </button>
              <button
                type="button"
                onClick={() => handleMoveDown(index)}
                disabled={index === specs.length - 1}
                aria-label="Move spec down"
                title="Move down"
              >
                ↓
              </button>
            </div>

            <SpecBoundary
              specId={spec.id}
              title={spec.title}
              status={spec.status as SpecStatus}
              isCollapsed={collapsedSpecs.has(spec.id)}
              onToggleCollapse={() => toggleCollapse(spec.id)}
              onSelect={onSpecSelect}
            >
              <SpecEditor
                documentId={documentId}
                specId={spec.id}
                initialContent={spec.content}
                onSave={(content) => onSpecUpdate(spec.id, content)}
              />
            </SpecBoundary>
          </div>
        ))}
      </div>

      <div className="DocumentView__addButton">
        <Button variant="secondary" onClick={() => onSpecSelect('new')}>
          + Add Spec
        </Button>
      </div>
    </div>
  );
}
